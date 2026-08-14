import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import {
  prepareVercelRequest,
  requestWithForwardedProtocol,
  withForwardedProtocol,
} from './vercel-request.js';

function request(body: unknown, contentType = 'application/json') {
  return {
    body,
    headers: { 'content-type': contentType },
  } as unknown as IncomingMessage & { body?: unknown; rawBody?: Buffer };
}

describe('prepareVercelRequest', () => {
  it('makes Vercel-parsed JSON available to the Hono adapter', () => {
    const parsed = request({ protocolVersion: 1, skills: [] });

    prepareVercelRequest(parsed);

    expect(parsed.rawBody?.toString('utf8')).toBe('{"protocolVersion":1,"skills":[]}');
  });

  it('preserves parsed form fields and repeated values', () => {
    const parsed = request({ code: 'oauth-code', scope: ['openid', 'email'] }, 'application/x-www-form-urlencoded');

    prepareVercelRequest(parsed);

    expect(parsed.rawBody?.toString('utf8')).toBe('code=oauth-code&scope=openid&scope=email');
  });
});

describe('requestWithForwardedProtocol', () => {
  it('rewrites the internal http URL to the public https origin Vercel terminates', () => {
    const incoming = new Request('http://warden-prod.sentry.dev/api/v1/personal-tokens', {
      method: 'POST',
      headers: {
        origin: 'https://warden-prod.sentry.dev',
        'x-forwarded-proto': 'https',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'Codex' }),
    });

    const rewritten = requestWithForwardedProtocol(incoming);

    expect(rewritten.url).toBe('https://warden-prod.sentry.dev/api/v1/personal-tokens');
    expect(rewritten.headers.get('origin')).toBe('https://warden-prod.sentry.dev');
  });

  it('leaves requests alone when the forwarded protocol already matches', async () => {
    const incoming = new Request('https://warden.example/api/v1/auth/context', {
      headers: { 'x-forwarded-proto': 'https' },
    });

    expect(requestWithForwardedProtocol(incoming)).toBe(incoming);

    let seen: string | undefined;
    const wrapped = withForwardedProtocol(async (request) => {
      seen = request.url;
      return new Response('ok');
    });
    await wrapped(incoming);
    expect(seen).toBe(incoming.url);
  });
});
