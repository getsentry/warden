import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { afterEach, describe, expect, it } from 'vitest';
import { acpRuntime } from './acp.js';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'warden-acp-runtime-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function writeFakeAcpAgent(dir: string, responseText: string, promptUsage?: object, usageUpdate?: object): string {
  const scriptPath = join(dir, 'fake-acp-agent.mjs');
  const usageNotification = usageUpdate
    ? `send({ jsonrpc: '2.0', method: 'session/update', params: {
        sessionId: 'session-123',
        update: ${JSON.stringify(usageUpdate)}
      }});`
    : '';
  writeFileSync(scriptPath, `
import readline from 'node:readline';
const rl = readline.createInterface({ input: process.stdin });
function send(message) { process.stdout.write(JSON.stringify(message) + '\\n'); }
rl.on('line', (line) => {
  const message = JSON.parse(line);
  if (message.method === 'initialize') {
    send({ jsonrpc: '2.0', id: message.id, result: {
      protocolVersion: 1,
      agentCapabilities: {},
      agentInfo: { name: 'fake-acp-agent', version: '1.0.0' },
      authMethods: []
    }});
    return;
  }
  if (message.method === 'session/new') {
    send({ jsonrpc: '2.0', id: message.id, result: { sessionId: 'session-123' } });
    return;
  }
  if (message.method === 'session/prompt') {
    send({ jsonrpc: '2.0', method: 'session/update', params: {
      sessionId: 'session-123',
      update: {
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: ${JSON.stringify(responseText)} }
      }
    }});
    ${usageNotification}
    send({ jsonrpc: '2.0', id: message.id, result: {
      stopReason: 'end_turn',
      usage: ${promptUsage ? JSON.stringify(promptUsage) : 'undefined'}
    } });
  }
});
`);
  return scriptPath;
}

function writeAbortAwareAgent(dir: string, logPath: string, mode: 'before-session' | 'during-prompt'): string {
  const scriptPath = join(dir, `abort-aware-${mode}.mjs`);
  writeFileSync(scriptPath, `
import { appendFileSync } from 'node:fs';
import readline from 'node:readline';
const rl = readline.createInterface({ input: process.stdin });
function log(value) { appendFileSync(${JSON.stringify(logPath)}, JSON.stringify(value) + '\\n'); }
function send(message) { process.stdout.write(JSON.stringify(message) + '\\n'); }
rl.on('line', (line) => {
  const message = JSON.parse(line);
  log(message);
  if (message.method === 'initialize') {
    send({ jsonrpc: '2.0', id: message.id, result: { protocolVersion: 1, agentCapabilities: {}, agentInfo: { name: 'abort-aware' } } });
    ${mode === 'before-session' ? 'setTimeout(() => {}, 10000);' : ''}
    return;
  }
  if (message.method === 'session/new') {
    ${mode === 'before-session' ? 'setTimeout(() => {}, 10000); return;' : ''}
    send({ jsonrpc: '2.0', id: message.id, result: { sessionId: 'session-actual' } });
    return;
  }
  if (message.method === 'session/prompt') {
    setTimeout(() => {}, 10000);
  }
});
`);
  return scriptPath;
}

function readJsonLines(filePath: string): { method?: string; params?: { sessionId?: string } }[] {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, 'utf8').trim();
  if (!content) return [];
  return content.split('\n').filter(Boolean).map((line) => JSON.parse(line) as { method?: string; params?: { sessionId?: string } });
}

async function waitForMessage(filePath: string, method: string): Promise<void> {
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    if (readJsonLines(filePath).some((message) => message.method === method)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 10));
  }
  throw new Error(`Timed out waiting for ${method}`);
}

describe('acpRuntime', () => {
  it('runs a skill through an ACP stdio agent and collects streamed text and usage', async () => {
    const dir = makeTempDir();
    const scriptPath = writeFakeAcpAgent(dir, '{"findings":[]}', {
      inputTokens: 120,
      outputTokens: 34,
      cachedReadTokens: 56,
      cachedWriteTokens: 78,
      totalTokens: 288,
    }, {
      sessionUpdate: 'usage_update',
      size: 200000,
      used: 1500,
      cost: { amount: 0.0123, currency: 'USD' },
    });

    const response = await acpRuntime.runSkill({
      systemPrompt: 'system prompt',
      userPrompt: 'user prompt',
      repoPath: dir,
      skillName: 'test-skill',
      options: {},
      providerOptions: {
        command: process.execPath,
        args: [scriptPath],
      },
    });

    expect(response.result).toMatchObject({
      status: 'success',
      text: '{"findings":[]}',
      sessionId: 'session-123',
      usage: {
        inputTokens: 120,
        outputTokens: 34,
        cacheReadInputTokens: 56,
        cacheCreationInputTokens: 78,
        cacheCreation5mInputTokens: 78,
        cacheCreation1hInputTokens: 0,
        webSearchRequests: 0,
        costUSD: 0.0123,
      },
    });
  });

  it('cancels the active ACP session id when aborted after session creation', async () => {
    const dir = makeTempDir();
    const logPath = join(dir, 'messages.jsonl');
    const scriptPath = writeAbortAwareAgent(dir, logPath, 'during-prompt');
    const abortController = new AbortController();

    const run = acpRuntime.runSkill({
      systemPrompt: 'system prompt',
      userPrompt: 'user prompt',
      repoPath: dir,
      skillName: 'test-skill',
      options: { abortController },
      providerOptions: {
        command: process.execPath,
        args: [scriptPath],
      },
    });
    await waitForMessage(logPath, 'session/prompt');
    abortController.abort();
    const response = await run;

    const cancel = readJsonLines(logPath).find((message) => message.method === 'session/cancel');
    expect(response.result?.status).toBe('aborted');
    expect(cancel?.params?.sessionId).toBe('session-actual');
  });

  it('does not send an empty ACP cancel when aborted before session creation', async () => {
    const dir = makeTempDir();
    const logPath = join(dir, 'messages.jsonl');
    const scriptPath = writeAbortAwareAgent(dir, logPath, 'before-session');
    const abortController = new AbortController();

    const run = acpRuntime.runSkill({
      systemPrompt: 'system prompt',
      userPrompt: 'user prompt',
      repoPath: dir,
      skillName: 'test-skill',
      options: { abortController },
      providerOptions: {
        command: process.execPath,
        args: [scriptPath],
      },
    });
    await waitForMessage(logPath, 'session/new');
    abortController.abort();
    const response = await run;

    const cancel = readJsonLines(logPath).find((message) => message.method === 'session/cancel');
    expect(response.result?.status).toBe('aborted');
    expect(cancel).toBeUndefined();
  });

  it('rejects cleanly when the ACP command cannot be spawned', async () => {
    const dir = makeTempDir();

    await expect(acpRuntime.runSkill({
      systemPrompt: 'system prompt',
      userPrompt: 'user prompt',
      repoPath: dir,
      skillName: 'test-skill',
      options: {},
      providerOptions: {
        command: 'tmp-rovodev-missing-acp-command',
      },
    })).rejects.toThrow(/tmp-rovodev-missing-acp-command|ENOENT|spawn/);
  });

  it('runs auxiliary structured calls through ACP', async () => {
    const dir = makeTempDir();
    const scriptPath = writeFakeAcpAgent(dir, '{"findings":[{"title":"ok"}]}');

    const result = await acpRuntime.runAuxiliary({
      task: 'extraction',
      prompt: 'Extract findings',
      schema: z.object({ findings: z.array(z.object({ title: z.string() })) }),
      repoPath: dir,
      providerOptions: {
        command: process.execPath,
        args: [scriptPath],
      },
    });

    expect(result).toMatchObject({
      success: true,
      data: { findings: [{ title: 'ok' }] },
    });
  });

  it('runs synthesis structured calls through ACP', async () => {
    const dir = makeTempDir();
    const scriptPath = writeFakeAcpAgent(dir, '[[1,2]]');

    const result = await acpRuntime.runSynthesis({
      task: 'consolidation',
      prompt: 'Group duplicate findings',
      schema: z.array(z.array(z.number())),
      repoPath: dir,
      providerOptions: {
        command: process.execPath,
        args: [scriptPath],
      },
    });

    expect(result).toMatchObject({
      success: true,
      data: [[1, 2]],
    });
  });
});
