import { EventEmitter } from 'node:events';
import { writeFileSync } from 'node:fs';
import { PassThrough } from 'node:stream';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { codexRuntime } from './codex.js';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'node:child_process';

const mockSpawn = vi.mocked(spawn);

function mockCodexProcess(onSpawn: (args: string[]) => void): ReturnType<typeof spawn> {
  const child = new EventEmitter() as ReturnType<typeof spawn>;
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  Object.assign(child, {
    stdin,
    stdout,
    stderr,
    kill: vi.fn(),
  });
  mockSpawn.mockImplementation((_file, args) => {
    const cliArgs = args as string[];
    queueMicrotask(() => {
      onSpawn(cliArgs);
      child.emit('close', 0, null);
    });
    return child;
  });
  return child;
}

describe('codexRuntime.runSkill', () => {
  beforeEach(() => {
    mockSpawn.mockReset();
  });

  it('runs codex exec in read-only mode and normalizes the final message', async () => {
    mockCodexProcess((args) => {
      const outputPath = args[args.indexOf('--output-last-message') + 1];
      writeFileSync(outputPath!, '{"findings":[]}');
    });

    const result = await codexRuntime.runSkill({
      systemPrompt: 'system',
      userPrompt: 'user',
      repoPath: '/repo',
      skillName: 'test-skill',
      options: { model: 'gpt-5.3-codex' },
      providerOptions: { pathToCodexExecutable: '/bin/codex' },
    });

    expect(mockSpawn).toHaveBeenCalledWith('/bin/codex', expect.arrayContaining([
      'exec',
      '--cd',
      '/repo',
      '--sandbox',
      'read-only',
      '--ephemeral',
      '--model',
      'gpt-5.3-codex',
      '-',
    ]), expect.objectContaining({
      cwd: '/repo',
    }));
    expect(result.result).toMatchObject({
      status: 'success',
      text: '{"findings":[]}',
      responseModel: 'gpt-5.3-codex',
    });
  });
});
