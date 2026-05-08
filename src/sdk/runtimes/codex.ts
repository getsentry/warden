/**
 * Codex runtime adapter.
 *
 * This adapter targets local subscription auth by shelling out to `codex exec`.
 * It keeps Warden's normal hunk preparation, parsing, verification, and
 * reporting pipeline intact while letting Codex own repo-aware tool use.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { z } from 'zod';
import { Sentry } from '../../sentry.js';
import { isAuthenticationErrorMessage } from '../errors.js';
import { extractJson } from '../haiku.js';
import { buildJsonOutputSection, joinPromptSections } from '../prompt-sections.js';
import { emptyUsage } from '../usage.js';
import type {
  AuxiliaryRunRequest,
  AuxiliaryRunResult,
  Runtime,
  SkillRunRequest,
  SkillRunResponse,
  SkillRunResult,
  SynthesisRunRequest,
} from './types.js';

interface CodexExecResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

interface CodexProviderOptions {
  pathToCodexExecutable?: string;
}

const DEFAULT_CODEX_EXECUTABLE = 'codex';

function getCodexProviderOptions(providerOptions: unknown): CodexProviderOptions {
  if (!providerOptions || typeof providerOptions !== 'object') {
    return {};
  }

  const { pathToCodexExecutable } = providerOptions as { pathToCodexExecutable?: unknown };
  return {
    pathToCodexExecutable: typeof pathToCodexExecutable === 'string'
      ? pathToCodexExecutable
      : undefined,
  };
}

function buildCodexPrompt(systemPrompt: string, userPrompt: string): string {
  return joinPromptSections([
    `<system>
${systemPrompt}
</system>`,
    `<runtime_constraints>
Run as a read-only Warden analysis task. Inspect the repository as needed, but do not modify files.
Return the response requested by Warden's prompt.
</runtime_constraints>`,
    `<user>
${userPrompt}
</user>`,
  ]);
}

function buildStructuredPrompt(prompt: string, schema: z.ZodType): string {
  return joinPromptSections([
    prompt,
    buildJsonOutputSection(`Return only JSON that validates against this JSON Schema:
${JSON.stringify(z.toJSONSchema(schema), null, 2)}`),
  ]);
}

function runCodexExec(args: string[], input: string, options: {
  executable: string;
  cwd: string;
  abortController?: AbortController;
}): Promise<CodexExecResult> {
  return new Promise((resolve, reject) => {
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn(options.executable, args, {
        cwd: options.cwd,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error) {
      reject(error);
      return;
    }

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    const abort = (): void => {
      child.kill('SIGTERM');
    };

    if (options.abortController?.signal.aborted) {
      abort();
    }
    options.abortController?.signal.addEventListener('abort', abort, { once: true });

    child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));
    child.on('error', (error) => {
      options.abortController?.signal.removeEventListener('abort', abort);
      reject(error);
    });
    child.on('close', (exitCode, signal) => {
      options.abortController?.signal.removeEventListener('abort', abort);
      resolve({
        exitCode,
        signal,
        stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
        stderr: Buffer.concat(stderrChunks).toString('utf-8'),
      });
    });

    child.stdin.end(input);
  });
}

function parseCodexUsage(stdout: string) {
  const usage = emptyUsage();
  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as {
        usage?: {
          input_tokens?: number;
          output_tokens?: number;
          cached_input_tokens?: number;
          reasoning_output_tokens?: number;
          total_cost_usd?: number;
        };
      };
      if (!event.usage) continue;
      usage.inputTokens += event.usage.input_tokens ?? 0;
      usage.outputTokens += event.usage.output_tokens ?? 0;
      usage.cacheReadInputTokens = (usage.cacheReadInputTokens ?? 0) + (event.usage.cached_input_tokens ?? 0);
      usage.costUSD += event.usage.total_cost_usd ?? 0;
    } catch {
      // Codex JSONL event shapes may evolve; usage is best-effort only.
    }
  }
  return usage;
}

function resultFromCodex(args: {
  text: string;
  stdout: string;
  model?: string;
  durationMs: number;
}): SkillRunResult {
  return {
    status: 'success',
    text: args.text,
    errors: [],
    usage: parseCodexUsage(args.stdout),
    responseModel: args.model,
    durationMs: args.durationMs,
  };
}

function failureFromCodex(args: {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stderr: string;
  stdout: string;
  model?: string;
  aborted: boolean;
  durationMs: number;
}): SkillRunResult {
  const diagnostic = [args.stderr.trim(), args.stdout.trim()].filter(Boolean).join('\n').trim();
  const status = args.aborted
    ? 'aborted'
    : isAuthenticationErrorMessage(diagnostic)
      ? 'auth_error'
      : 'provider_error';
  return {
    status,
    text: '',
    errors: [diagnostic || `Codex exited with code ${args.exitCode ?? 'null'}${args.signal ? ` (${args.signal})` : ''}`],
    usage: parseCodexUsage(args.stdout),
    responseModel: args.model,
    durationMs: args.durationMs,
  };
}

async function runCodexPrompt(args: {
  prompt: string;
  repoPath: string;
  model?: string;
  maxTurns?: number;
  abortController?: AbortController;
  executable: string;
}): Promise<SkillRunResponse> {
  const tempDir = await mkdtemp(join(tmpdir(), 'warden-codex-'));
  const outputPath = join(tempDir, 'last-message.txt');
  const cliArgs = [
    'exec',
    '--cd',
    args.repoPath,
    '--sandbox',
    'read-only',
    '--skip-git-repo-check',
    '--ephemeral',
    '--output-last-message',
    outputPath,
    '--color',
    'never',
    '--json',
  ];
  if (args.model) {
    cliArgs.push('--model', args.model);
  }
  cliArgs.push('-');

  const startedAt = Date.now();
  try {
    const result = await runCodexExec(cliArgs, args.prompt, {
      executable: args.executable,
      cwd: args.repoPath,
      abortController: args.abortController,
    });
    const durationMs = Date.now() - startedAt;
    if (result.exitCode !== 0 || result.signal) {
      return {
        result: failureFromCodex({
          exitCode: result.exitCode,
          signal: result.signal,
          stderr: result.stderr,
          stdout: result.stdout,
          model: args.model,
          aborted: args.abortController?.signal.aborted ?? false,
          durationMs,
        }),
        authError: isAuthenticationErrorMessage(result.stderr) ? result.stderr.trim() : undefined,
        stderr: result.stderr.trim() || undefined,
      };
    }

    const text = await readFile(outputPath, 'utf-8');
    return {
      result: resultFromCodex({
        text,
        stdout: result.stdout,
        model: args.model,
        durationMs,
      }),
      stderr: result.stderr.trim() || undefined,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function runStructured<T>(
  request: {
    kind: 'auxiliary' | 'synthesis';
    prompt: string;
    schema: z.ZodType<T>;
    model?: string;
    maxTokens?: number;
    tools?: unknown[];
    executable?: string;
  }
): Promise<AuxiliaryRunResult<T>> {
  if (request.tools) {
    return {
      success: false,
      error: 'Codex auxiliary tool calls are not supported',
      usage: emptyUsage(),
    };
  }

  const response = await runCodexPrompt({
    prompt: buildStructuredPrompt(request.prompt, request.schema),
    repoPath: process.cwd(),
    model: request.model,
    maxTurns: 1,
    executable: request.executable ?? DEFAULT_CODEX_EXECUTABLE,
  });
  const usage = response.result?.usage ?? emptyUsage();
  if (!response.result || response.result.status !== 'success') {
    return {
      success: false,
      error: response.authError ?? response.result?.errors.join('; ') ?? 'Codex returned no result',
      usage,
    };
  }

  const json = extractJson(response.result.text);
  if (!json) {
    return { success: false, error: 'No JSON found in response', usage };
  }

  try {
    const parsed = JSON.parse(json);
    const validated = request.schema.safeParse(parsed);
    if (!validated.success) {
      return { success: false, error: `Validation failed: ${validated.error.message}`, usage };
    }
    return { success: true, data: validated.data, usage };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message, usage };
  }
}

export const codexRuntime: Runtime = {
  name: 'codex',

  async runSkill(request: SkillRunRequest): Promise<SkillRunResponse> {
    const { pathToCodexExecutable } = getCodexProviderOptions(request.providerOptions);
    const { maxTurns = 50, model, abortController } = request.options;
    return Sentry.startSpan(
      {
        op: 'gen_ai.invoke_agent',
        name: `invoke_agent ${request.skillName}`,
        attributes: {
          'gen_ai.operation.name': 'invoke_agent',
          'gen_ai.provider.name': 'openai',
          'gen_ai.agent.name': request.skillName,
          'gen_ai.request.model': model ?? 'codex-default',
          'warden.request.max_turns': maxTurns,
        },
      },
      async (span) => {
        const prompt = buildCodexPrompt(request.systemPrompt, request.userPrompt);
        span.setAttribute('gen_ai.request.messages', JSON.stringify([
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ]));
        const response = await runCodexPrompt({
          prompt,
          repoPath: request.repoPath,
          model,
          maxTurns,
          abortController,
          executable: pathToCodexExecutable ?? DEFAULT_CODEX_EXECUTABLE,
        });
        if (response.result?.text) {
          span.setAttribute('gen_ai.response.text', JSON.stringify([response.result.text]));
        }
        return response;
      },
    );
  },

  async runAuxiliary<T>(request: AuxiliaryRunRequest<T>): Promise<AuxiliaryRunResult<T>> {
    return runStructured({ kind: 'auxiliary', ...request });
  },

  async runSynthesis<T>(request: SynthesisRunRequest<T>): Promise<AuxiliaryRunResult<T>> {
    return runStructured({ kind: 'synthesis', ...request });
  },
};
