import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { installInferenceAudit } from './inference-audit.js';

const directories: string[] = [];
afterEach(() => { vi.unstubAllGlobals(); for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true }); });

it('preserves fragmented response bytes and records each call cost once', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'inference-audit-')); directories.push(directory);
  const raw = 'data: {"id":"gen-123","choices":[{"delta":{"content":"hello"}}]}\n\ndata: {"id":"gen-123","usage":{"cost":0.123,"prompt_tokens":50}}\n\ndata: [DONE]\n\n';
  const transport = vi.fn(async () => new Response(new ReadableStream({ start(controller) {
    for (const text of [raw.slice(0, 8), raw.slice(8, 49), raw.slice(49)]) controller.enqueue(new TextEncoder().encode(text));
    controller.close();
  } }), { headers: { 'content-type': 'text/event-stream' } }));
  vi.stubGlobal('fetch', transport);
  const audit = installInferenceAudit(directory);
  const body = '{"model":"x-ai/grok-4.5","messages":[]}';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', body, headers: { authorization: 'Bearer secret' } });
  expect(await response.text()).toBe(raw);
  expect(readFileSync(join(directory, '00001.response.raw'), 'utf8')).toBe(raw);
  expect(readFileSync(join(directory, '00001.request.json'), 'utf8')).toBe(body);
  expect(transport.mock.calls).toHaveLength(1);
  expect(audit.calls).toMatchObject([{ status: 'settled', responseId: 'gen-123', costUSD: 0.123 }]);
  expect(readFileSync(join(directory, 'calls.json'), 'utf8')).not.toContain('secret');
  audit.restore();
});

it('keeps missing billing unresolved instead of treating failure as free', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'inference-audit-')); directories.push(directory);
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'upstream failed' }, { status: 502 })));
  const audit = installInferenceAudit(directory);
  await (await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', body: '{}' })).text();
  expect(audit.calls).toMatchObject([{ status: 'unknown', httpStatus: 502 }]);
  expect(audit.calls[0]?.costUSD).toBeUndefined();
  audit.restore();
});
