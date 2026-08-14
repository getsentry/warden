import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { prepareVercelRequest } from './vercel-request.js';

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
