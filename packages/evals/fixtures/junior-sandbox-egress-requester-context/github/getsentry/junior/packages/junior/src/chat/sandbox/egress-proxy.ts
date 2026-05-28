import { issueProviderCredentialLease } from "@/chat/capabilities/factory";
import { CredentialUnavailableError } from "@/chat/credentials/broker";
import { logInfo, logWarn } from "@/chat/logging";
import {
  matchesSandboxEgressDomain,
  resolveSandboxEgressProviderForHost,
} from "@/chat/sandbox/egress-policy";
import { verifyVercelSandboxOidcToken } from "@/chat/sandbox/egress-oidc";
import {
  clearSandboxEgressCredentialLease,
  getSandboxEgressCredentialLease,
  getSandboxEgressSession,
  setSandboxEgressCredentialLease,
  type SandboxEgressCredentialLease,
  type SandboxEgressSession,
} from "@/chat/sandbox/egress-session";
import type { JWTPayload } from "jose";

const OIDC_TOKEN_HEADER = "vercel-sandbox-oidc-token";
const FORWARDED_HOST_HEADER = "vercel-forwarded-host";
const FORWARDED_SCHEME_HEADER = "vercel-forwarded-scheme";
const FORWARDED_PORT_HEADER = "vercel-forwarded-port";
const FORWARDED_PATH_HEADER = "vercel-forwarded-path";
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);
const PROXY_ONLY_HEADERS = new Set([
  OIDC_TOKEN_HEADER,
  FORWARDED_HOST_HEADER,
  FORWARDED_SCHEME_HEADER,
  FORWARDED_PORT_HEADER,
  FORWARDED_PATH_HEADER,
]);
const DECODED_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
]);
const AUTH_REJECTION_STATUS = new Set([401, 403]);
interface ProxyDeps {
  fetch?: typeof fetch;
  verifyOidc?: (token: string) => Promise<JWTPayload>;
}

type UpstreamUrlResult = { ok: true; url: URL } | { ok: false; error: string };
type UpstreamPathResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

function shouldLogSandboxEgressInfo(): boolean {
  const environment = (
    process.env.SENTRY_ENVIRONMENT ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV ??
    ""
  )
    .trim()
    .toLowerCase();
  return environment !== "production";
}

function egressAttributes(input: {
  egressId?: string;
  host?: string;
  method?: string;
  path?: string;
  provider?: string;
  status?: number;
}): Record<string, unknown> {
  return {
    ...(input.egressId ? { "app.sandbox.egress_id": input.egressId } : {}),
    ...(input.provider ? { "app.credential.provider": input.provider } : {}),
    ...(input.host ? { "server.address": input.host } : {}),
    ...(input.method ? { "http.request.method": input.method } : {}),
    ...(input.path ? { "url.path": input.path } : {}),
    ...(input.status ? { "http.response.status_code": input.status } : {}),
  };
}

function routingAttributes(
  request: Request,
  upstreamUrl?: URL,
): Record<string, unknown> {
  const proxyUrl = new URL(request.url);
  const attributes: Record<string, unknown> = {
    "app.sandbox.egress.proxy_path": proxyUrl.pathname,
  };
  if (upstreamUrl) {
    attributes["app.sandbox.egress.upstream_path"] = upstreamUrl.pathname;
  }
  return attributes;
}

function logSandboxEgressUpstreamRequest(input: {
  egressId: string;
  provider: string;
  request: Request;
  upstream: Response;
  upstreamUrl: URL;
}): void {
  if (!shouldLogSandboxEgressInfo()) {
    return;
  }

  logInfo(
    "sandbox_egress_upstream_request",
    {},
    {
      ...egressAttributes({
        egressId: input.egressId,
        host: input.upstreamUrl.hostname,
        method: input.request.method,
        path: input.upstreamUrl.pathname,
        provider: input.provider,
        status: input.upstream.status,
      }),
      ...routingAttributes(input.request, input.upstreamUrl),
      "app.sandbox.egress.upstream_ok": input.upstream.ok,
    },
    `Sandbox egress ${input.request.method} ${input.upstreamUrl.hostname}${input.upstreamUrl.pathname} -> ${input.upstream.status}`,
  );
}

function normalizeHost(value: string): string | undefined {
  const trimmed = value.trim().toLowerCase();
  if (
    !trimmed ||
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    trimmed.includes(":")
  ) {
    return undefined;
  }
  return trimmed.replace(/\.$/, "");
}

function normalizeScheme(value: string): "https" | undefined {
  return value.trim().toLowerCase() === "https" ? "https" : undefined;
}

function normalizePort(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!/^\d{1,5}$/.test(trimmed)) {
    return undefined;
  }
  const port = Number.parseInt(trimmed, 10);
  return port >= 1 && port <= 65_535 ? trimmed : undefined;
}

function sandboxIdFromPayload(payload: JWTPayload): string | undefined {
  return typeof payload.sandbox_id === "string"
    ? payload.sandbox_id
    : undefined;
}

function upstreamPath(request: Request): UpstreamPathResult {
  const forwardedPath = request.headers.get(FORWARDED_PATH_HEADER);
  if (forwardedPath?.trim()) {
    // Vercel may normalize request.url; this header carries the original target.
    const path = forwardedPath.trim();
    if (
      !path.startsWith("/") ||
      path.startsWith("//") ||
      path.includes("#") ||
      /[\r\n]/.test(path)
    ) {
      return { ok: false, error: "Invalid forwarded path" };
    }
    try {
      const url = new URL(path, "https://sandbox-forwarded.local");
      return { ok: true, path: `${url.pathname}${url.search}` };
    } catch {
      return { ok: false, error: "Invalid forwarded path" };
    }
  }

  const url = new URL(request.url);
  return { ok: true, path: `${url.pathname}${url.search}` };
}

function buildUpstreamUrl(request: Request): UpstreamUrlResult {
  const forwardedHost = request.headers.get(FORWARDED_HOST_HEADER);
  if (!forwardedHost?.trim()) {
    return { ok: false, error: "Missing forwarded host" };
  }
  const host = normalizeHost(forwardedHost);
  if (!host) {
    return { ok: false, error: "Invalid forwarded host" };
  }
  const forwardedScheme = request.headers.get(FORWARDED_SCHEME_HEADER);
  if (!forwardedScheme?.trim()) {
    return { ok: false, error: "Missing forwarded scheme" };
  }
  const scheme = normalizeScheme(forwardedScheme);
  if (!scheme) {
    return { ok: false, error: "Forwarded scheme must be https" };
  }
  const forwardedPort = request.headers.get(FORWARDED_PORT_HEADER);
  const port = normalizePort(forwardedPort);
  if (forwardedPort && !port) {
    return { ok: false, error: "Invalid forwarded port" };
  }
  const path = upstreamPath(request);
  if (!path.ok) {
    return { ok: false, error: path.error };
  }
  try {
    const url = new URL(
      `${scheme}://${host}${port ? `:${port}` : ""}${path.path}`,
    );
    return { ok: true, url };
  } catch {
    return { ok: false, error: "Invalid forwarded URL" };
  }
}

async function requestBodyBytes(
  request: Request,
): Promise<ArrayBuffer | undefined> {
  if (
    request.method === "GET" ||
    request.method === "HEAD" ||
    request.body === null
  ) {
    return undefined;
  }
  return await request.arrayBuffer();
}

function requestHeaders(
  request: Request,
  lease: SandboxEgressCredentialLease,
  upstreamHost: string,
): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (
      HOP_BY_HOP_HEADERS.has(normalized) ||
      PROXY_ONLY_HEADERS.has(normalized)
    ) {
      return;
    }
    headers.append(key, value);
  });

  for (const transform of lease.headerTransforms) {
    if (!matchesSandboxEgressDomain(upstreamHost, transform.domain)) {
      continue;
    }
    for (const [key, value] of Object.entries(transform.headers)) {
      headers.set(key, value);
    }
  }
  return headers;
}

function responseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (
      !HOP_BY_HOP_HEADERS.has(normalized) &&
      !DECODED_RESPONSE_HEADERS.has(normalized)
    ) {
      headers.append(key, value);
    }
  });
  return headers;
}

async function credentialLease(
  egressId: string,
  provider: string,
  session: SandboxEgressSession,
): Promise<SandboxEgressCredentialLease> {
  const cached = await getSandboxEgressCredentialLease(
    egressId,
    provider,
    session,
  );
  if (cached) {
    return cached;
  }

  const lease = await issueProviderCredentialLease({
    provider,
    requesterId: session.requesterId,
    reason: `sandbox-egress:${provider}`,
  });
  const headerTransforms = lease.headerTransforms ?? [];
  if (headerTransforms.length === 0) {
    throw new Error(
      `Credential lease for ${provider} did not include header transforms`,
    );
  }

  const cachedLease: SandboxEgressCredentialLease = {
    provider,
    expiresAt: lease.expiresAt,
    headerTransforms,
  };
  await setSandboxEgressCredentialLease(egressId, session, cachedLease);
  return cachedLease;
}

function hasTransformForHost(
  lease: SandboxEgressCredentialLease,
  host: string,
): boolean {
  return lease.headerTransforms.some((transform) =>
    matchesSandboxEgressDomain(host, transform.domain),
  );
}

/** Return whether a request appears to be from the Vercel Sandbox egress proxy. */
export function isSandboxEgressForwardedRequest(request: Request): boolean {
  return Boolean(
    request.headers.get(OIDC_TOKEN_HEADER)?.trim() &&
    request.headers.get(FORWARDED_HOST_HEADER)?.trim() &&
    request.headers.get(FORWARDED_SCHEME_HEADER)?.trim(),
  );
}

/** Proxy one Vercel Sandbox firewall egress request through Junior credential activation. */
export async function proxySandboxEgressRequest(
  request: Request,
  deps: ProxyDeps = {},
): Promise<Response> {
  const oidcToken = request.headers.get(OIDC_TOKEN_HEADER)?.trim();
  if (!oidcToken) {
    return jsonError("Missing Vercel Sandbox OIDC token", 401);
  }

  let oidcPayload: JWTPayload;
  try {
    oidcPayload = await (deps.verifyOidc ?? verifyVercelSandboxOidcToken)(
      oidcToken,
    );
  } catch (error) {
    logWarn(
      "sandbox_egress_oidc_verification_failed",
      {},
      {
        "app.sandbox.oidc_error":
          error instanceof Error ? error.message : String(error),
      },
      "Sandbox egress OIDC verification failed",
    );
    return jsonError("Invalid Vercel Sandbox OIDC token", 401);
  }

  const activeEgressId = sandboxIdFromPayload(oidcPayload);
  if (!activeEgressId) {
    logWarn(
      "sandbox_egress_oidc_session_missing",
      {},
      {
        "http.request.method": request.method,
        "url.path": new URL(request.url).pathname,
      },
      "Sandbox egress OIDC payload did not include a VM session id",
    );
    return jsonError(
      "Vercel Sandbox OIDC token did not include sandbox_id",
      401,
    );
  }

  const upstreamResult = buildUpstreamUrl(request);
  if (!upstreamResult.ok) {
    logWarn(
      "sandbox_egress_upstream_url_invalid",
      {},
      {
        ...egressAttributes({
          egressId: activeEgressId,
          method: request.method,
          path: new URL(request.url).pathname,
          status: 400,
        }),
        ...routingAttributes(request),
      },
      "Sandbox egress forwarded request had invalid upstream routing headers",
    );
    return jsonError(upstreamResult.error, 400);
  }
  const upstreamUrl = upstreamResult.url;

  const provider = resolveSandboxEgressProviderForHost(upstreamUrl.hostname);
  if (!provider) {
    logWarn(
      "sandbox_egress_provider_unresolved",
      {},
      {
        ...egressAttributes({
          egressId: activeEgressId,
          host: upstreamUrl.hostname,
          method: request.method,
          path: upstreamUrl.pathname,
          status: 403,
        }),
        ...routingAttributes(request, upstreamUrl),
      },
      "Sandbox egress forwarded host is not owned by any credential provider",
    );
    return jsonError("No provider owns forwarded host", 403);
  }

  // Vercel OIDC authenticates the forwarded VM session; Junior's egress
  // session authorizes credential activation for the current requester.
  const session = await getSandboxEgressSession(activeEgressId);
  if (!session) {
    logWarn(
      "sandbox_egress_session_unauthorized",
      {},
      {
        ...egressAttributes({
          egressId: activeEgressId,
          host: upstreamUrl.hostname,
          method: request.method,
          path: upstreamUrl.pathname,
          provider,
          status: 403,
        }),
        ...routingAttributes(request, upstreamUrl),
      },
      "Sandbox egress VM session is not authorized for requester credentials",
    );
    return jsonError("Sandbox egress session is not authorized", 403);
  }

  let lease: SandboxEgressCredentialLease;
  try {
    lease = await credentialLease(activeEgressId, provider, session);
  } catch (error) {
    if (error instanceof CredentialUnavailableError) {
      logWarn(
        "sandbox_egress_credential_unavailable",
        {},
        {
          ...egressAttributes({
            egressId: activeEgressId,
            host: upstreamUrl.hostname,
            method: request.method,
            path: upstreamUrl.pathname,
            provider,
            status: 401,
          }),
          ...routingAttributes(request, upstreamUrl),
        },
        "Sandbox egress provider credential is unavailable",
      );
      return new Response(
        `junior-auth-required provider=${error.provider} 401 unauthorized\n${error.message}`,
        {
          status: 401,
          headers: { "content-type": "text/plain; charset=utf-8" },
        },
      );
    }
    throw error;
  }

  if (!hasTransformForHost(lease, upstreamUrl.hostname)) {
    logWarn(
      "sandbox_egress_transform_missing",
      {},
      {
        ...egressAttributes({
          egressId: activeEgressId,
          host: upstreamUrl.hostname,
          method: request.method,
          path: upstreamUrl.pathname,
          provider,
          status: 403,
        }),
        "app.sandbox.egress.transform_domains": lease.headerTransforms.map(
          (transform) => transform.domain,
        ),
        ...routingAttributes(request, upstreamUrl),
      },
      "Sandbox egress credential lease does not cover forwarded host",
    );
    return jsonError("Credential lease does not cover forwarded host", 403);
  }

  const body = await requestBodyBytes(request);
  const fetchImpl = deps.fetch ?? fetch;
  const headers = requestHeaders(request, lease, upstreamUrl.hostname);
  const upstream = await fetchImpl(upstreamUrl, {
    method: request.method,
    headers,
    ...(body !== undefined ? { body } : {}),
    redirect: "manual",
  });
  logSandboxEgressUpstreamRequest({
    egressId: activeEgressId,
    provider,
    request,
    upstream,
    upstreamUrl,
  });
  if (upstream.status >= 400) {
    logWarn(
      "sandbox_egress_upstream_error_response",
      {},
      {
        ...egressAttributes({
          egressId: activeEgressId,
          host: upstreamUrl.hostname,
          method: request.method,
          path: upstreamUrl.pathname,
          provider,
          status: upstream.status,
        }),
        ...routingAttributes(request, upstreamUrl),
        "error.type": `http_${upstream.status}`,
      },
      `Sandbox egress upstream returned HTTP ${upstream.status}`,
    );
  }
  if (AUTH_REJECTION_STATUS.has(upstream.status)) {
    logWarn(
      "sandbox_egress_upstream_auth_rejected",
      {},
      {
        ...egressAttributes({
          egressId: activeEgressId,
          host: upstreamUrl.hostname,
          method: request.method,
          path: upstreamUrl.pathname,
          provider,
          status: upstream.status,
        }),
        ...routingAttributes(request, upstreamUrl),
      },
      "Sandbox egress upstream auth rejected",
    );
    await clearSandboxEgressCredentialLease(activeEgressId, provider, session);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders(upstream),
  });
}
