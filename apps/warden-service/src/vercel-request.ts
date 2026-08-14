import type { IncomingMessage } from 'node:http';

export type VercelIncomingMessage = IncomingMessage & {
  body?: unknown;
  rawBody?: Buffer;
};

export type FetchCallback = (request: Request, ...args: unknown[]) => Response | Promise<Response>;

function formBody(body: Record<string, unknown>): string {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (Array.isArray(value)) {
      for (const item of value) form.append(key, String(item));
    } else if (value !== undefined && value !== null) {
      form.append(key, String(value));
    }
  }
  return form.toString();
}

function forwardedProtocol(header: string | null): 'http' | 'https' | null {
  const value = header?.split(',')[0]?.trim().toLowerCase();
  return value === 'http' || value === 'https' ? value : null;
}

/** Rebuild the request URL with the public protocol Vercel terminates at the edge. */
export function requestWithForwardedProtocol(request: Request): Request {
  const protocol = forwardedProtocol(request.headers.get('x-forwarded-proto'));
  if (!protocol) return request;
  const url = new URL(request.url);
  if (url.protocol === `${protocol}:`) return request;
  url.protocol = `${protocol}:`;
  return new Request(url, request);
}

/**
 * Make Hono see the browser-facing origin behind Vercel's TLS terminator.
 * Without this, session CSRF checks compare `https://` Origin to an `http://` request URL.
 */
export function withForwardedProtocol(fetch: FetchCallback): FetchCallback {
  return (request, ...args) => fetch(requestWithForwardedProtocol(request), ...args);
}

/** Preserve Vercel's parsed request body for Hono's Node adapter. */
export function prepareVercelRequest(request: VercelIncomingMessage): void {
  if (request.rawBody || request.body === undefined || request.body === null) return;
  if (Buffer.isBuffer(request.body)) {
    request.rawBody = request.body;
    return;
  }
  if (request.body instanceof Uint8Array) {
    request.rawBody = Buffer.from(request.body);
    return;
  }
  if (typeof request.body === 'string') {
    request.rawBody = Buffer.from(request.body);
    return;
  }

  const contentType = request.headers['content-type'] ?? '';
  const serialized = contentType.startsWith('application/x-www-form-urlencoded')
    && typeof request.body === 'object'
    && !Array.isArray(request.body)
    ? formBody(request.body as Record<string, unknown>)
    : JSON.stringify(request.body);
  request.rawBody = Buffer.from(serialized);
}
