import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface AuditedCall {
  id: string;
  model?: string;
  responseId?: string;
  status: 'pending' | 'settled' | 'unknown';
  costUSD?: number;
  usage?: Record<string, unknown>;
  startedAt: string;
  endedAt?: string;
  httpStatus?: number;
}

/** Record inference bytes and provider billing without modifying requests or imposing a spending limit. */
export function installInferenceAudit(directory: string): { calls: AuditedCall[]; restore: () => void } {
  mkdirSync(directory, { recursive: true });
  const original = globalThis.fetch;
  const calls: AuditedCall[] = [];
  function save() { writeFileSync(join(directory, 'calls.json'), JSON.stringify(calls, null, 2)); }
  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    if (url.hostname !== 'openrouter.ai' || !/\/(chat\/completions|responses)$/.test(url.pathname)) return original(input, init);
    const body = input instanceof Request ? await new Request(input, init).clone().text() : await request.clone().text();
    const id = String(calls.length + 1).padStart(5, '0');
    const call: AuditedCall = { id, status: 'pending', startedAt: new Date().toISOString() };
    try { call.model = JSON.parse(body).model; } catch { /* Preserve malformed request evidence too. */ }
    calls.push(call);
    writeFileSync(join(directory, `${id}.request.json`), body);
    save();
    const decoder = new TextDecoder();
    let buffer = '';
    let nonStreaming = '';
    function packet(text: string) {
      try {
        const parsed = JSON.parse(text);
        const response = parsed.response ?? parsed;
        if (typeof response.id === 'string') call.responseId = response.id;
        if (response.usage) {
          call.usage = response.usage;
          if (typeof response.usage.cost === 'number' && response.usage.cost >= 0) call.costUSD = response.usage.cost;
        }
      } catch { /* SSE control lines and partial packets carry no billing. */ }
    }
    function finish() {
      call.status = call.costUSD === undefined ? 'unknown' : 'settled';
      call.endedAt = new Date().toISOString();
      save();
    }
    try {
      const response = await original(input, init);
      call.httpStatus = response.status;
      save();
      if (!response.body) { finish(); return response; }
      const streaming = response.headers.get('content-type')?.includes('text/event-stream');
      const reader = response.body.getReader();
      const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const { done, value } = await reader.read();
            if (done) {
              buffer += decoder.decode();
              if (streaming && buffer.startsWith('data:')) packet(buffer.slice(5).trim());
              if (!streaming) packet(nonStreaming + buffer);
              finish(); controller.close(); return;
            }
            appendFileSync(join(directory, `${id}.response.raw`), value);
            const text = decoder.decode(value, { stream: true });
            if (!streaming) nonStreaming += text;
            else {
              buffer += text;
              let newline: number;
              while ((newline = buffer.indexOf('\n')) >= 0) {
                const line = buffer.slice(0, newline).trim();
                buffer = buffer.slice(newline + 1);
                if (line.startsWith('data:')) packet(line.slice(5).trim());
              }
            }
            controller.enqueue(value);
          } catch (error) { finish(); controller.error(error); }
        },
        async cancel(reason) { try { await reader.cancel(reason); } finally { finish(); } },
      });
      return new Response(stream, { status: response.status, statusText: response.statusText, headers: response.headers });
    } catch (error) { finish(); throw error; }
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}
