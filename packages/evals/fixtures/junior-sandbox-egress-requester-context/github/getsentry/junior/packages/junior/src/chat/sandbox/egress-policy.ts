import type { NetworkPolicy, NetworkPolicyRule } from "@vercel/sandbox";
import { resolveBaseUrl } from "@/chat/oauth-flow";
import { resolveAuthTokenPlaceholder } from "@/chat/plugins/auth/auth-token-placeholder";
import { resolvePluginCommandEnv } from "@/chat/plugins/command-env";
import { getPluginProviders } from "@/chat/plugins/registry";
import type { PluginManifest } from "@/chat/plugins/types";

/** Return whether an outbound host is covered by a sandbox egress domain rule. */
export function matchesSandboxEgressDomain(
  host: string,
  domain: string,
): boolean {
  return host.toLowerCase() === domain.toLowerCase();
}

function manifestDomains(manifest: PluginManifest): string[] {
  const domains = new Set([
    ...(manifest.credentials?.domains ?? []),
    ...(manifest.domains ?? []),
  ]);
  return [...domains].sort((left, right) => left.localeCompare(right));
}

function providerEntries(): Array<{ provider: string; domains: string[] }> {
  return getPluginProviders()
    .map((plugin) => ({
      provider: plugin.manifest.name,
      domains: manifestDomains(plugin.manifest),
    }))
    .filter((entry) => entry.domains.length > 0)
    .sort((left, right) => left.provider.localeCompare(right.provider));
}

/** Resolve the plugin provider responsible for an outbound sandbox host. */
export function resolveSandboxEgressProviderForHost(
  host: string,
): string | undefined {
  return providerEntries().find((entry) =>
    entry.domains.some((domain) => matchesSandboxEgressDomain(host, domain)),
  )?.provider;
}

function sandboxProxyUrl(): string {
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) {
    throw new Error(
      "Cannot determine base URL for sandbox credential egress (set JUNIOR_BASE_URL or deploy to Vercel)",
    );
  }
  return new URL("/", baseUrl).toString();
}

/** Build the policy that forwards provider requests back to Junior for credentials. */
export function buildSandboxEgressNetworkPolicy(): NetworkPolicy {
  const allow: Record<string, NetworkPolicyRule[]> = {
    "*": [],
  };
  const entries = providerEntries();
  if (entries.length === 0) {
    return { allow };
  }

  const forwardURL = sandboxProxyUrl();
  for (const entry of entries) {
    for (const domain of entry.domains) {
      allow[domain] = [{ forwardURL }];
    }
  }

  return { allow };
}

/** Resolve non-secret command environment values for registered sandbox providers. */
export async function resolveSandboxCommandEnvironment(): Promise<
  Record<string, string>
> {
  const env: Record<string, string> = {};
  for (const plugin of getPluginProviders().sort((left, right) =>
    left.manifest.name.localeCompare(right.manifest.name),
  )) {
    Object.assign(env, resolvePluginCommandEnv(plugin.manifest));
    const credentials = plugin.manifest.credentials;
    if (credentials) {
      env[credentials.authTokenEnv] = resolveAuthTokenPlaceholder(credentials);
    }
  }
  return env;
}
