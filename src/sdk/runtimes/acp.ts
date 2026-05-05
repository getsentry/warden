import { ClientSideConnection, PROTOCOL_VERSION, type Client } from '@agentclientprotocol/sdk';
import type {
  ReadTextFileRequest,
  ReadTextFileResponse,
  PermissionOption,
  RequestPermissionRequest,
  RequestPermissionResponse,
  SessionNotification,
  Usage,
  UsageUpdate,
} from '@agentclientprotocol/sdk/dist/schema/index.js';
import type { UsageStats } from '../../types/index.js';
import { ndJsonStream } from '@agentclientprotocol/sdk/dist/stream.js';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { Sentry } from '../../sentry.js';
import { extractJson } from '../haiku.js';
import { emptyUsage } from '../usage.js';
import type {
  AuxiliaryRunRequest,
  AuxiliaryRunResult,
  Runtime,
  SkillRunRequest,
  SkillRunResponse,
  SynthesisRunRequest,
} from './types.js';

const DEFAULT_REGISTRY_URL = 'https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json';

interface AcpProviderOptions {
  command?: string;
  args?: string[];
  registryId?: string;
  registryUrl?: string;
  env?: Record<string, string>;
}

interface CommandSpec {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface AcpUsageSnapshot {
  usages: Usage[];
  usageUpdate?: UsageUpdate;
}

function firstCommandPart(parts: string[], message: string): string {
  const command = parts[0];
  if (!command) throw new Error(message);
  return command;
}

function parseCommand(command: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote: '"' | "'" | undefined;
  let escaping = false;

  for (const char of command) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === '\\' && quote !== "'") {
      escaping = true;
      continue;
    }
    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote ? undefined : char;
      continue;
    }
    if (/\s/.test(char) && !quote) {
      if (current) {
        parts.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }

  if (escaping) current += '\\';
  if (quote) throw new Error(`Unclosed quote in ACP command: ${command}`);
  if (current) parts.push(current);
  return parts;
}

function getAcpProviderOptions(providerOptions: unknown): AcpProviderOptions {
  if (!providerOptions || typeof providerOptions !== 'object') return {};
  const options = providerOptions as Record<string, unknown>;
  return {
    command: typeof options['command'] === 'string' ? options['command'] : undefined,
    args: Array.isArray(options['args']) && options['args'].every((arg) => typeof arg === 'string')
      ? options['args'] as string[]
      : undefined,
    registryId: typeof options['registryId'] === 'string' ? options['registryId'] : undefined,
    registryUrl: typeof options['registryUrl'] === 'string' ? options['registryUrl'] : undefined,
    env: options['env'] && typeof options['env'] === 'object' && !Array.isArray(options['env'])
      ? Object.fromEntries(
        Object.entries(options['env'] as Record<string, unknown>)
          .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      )
      : undefined,
  };
}

async function resolveRegistryCommand(registryId: string, registryUrl = DEFAULT_REGISTRY_URL): Promise<CommandSpec> {
  const response = await fetch(registryUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch ACP registry ${registryUrl}: ${response.status} ${response.statusText}`);
  }

  const registry = await response.json() as { agents?: unknown[] };
  const agent = registry.agents?.find((entry): entry is Record<string, unknown> => (
    Boolean(entry) && typeof entry === 'object' && (entry as Record<string, unknown>)['id'] === registryId
  ));
  if (!agent) {
    throw new Error(`ACP registry agent not found: ${registryId}`);
  }

  const distribution = agent['distribution'];
  if (!distribution || typeof distribution !== 'object') {
    throw new Error(`ACP registry agent ${registryId} has no distribution metadata`);
  }

  const npx = (distribution as Record<string, unknown>)['npx'];
  if (npx && typeof npx === 'object') {
    const npxConfig = npx as Record<string, unknown>;
    const packageName = npxConfig['package'];
    const args = npxConfig['args'];
    if (typeof packageName !== 'string') {
      throw new Error(`ACP registry agent ${registryId} has invalid npx package metadata`);
    }
    return {
      command: 'npx',
      args: ['-y', packageName, ...(Array.isArray(args) && args.every((arg) => typeof arg === 'string') ? args : [])],
    };
  }

  const binary = (distribution as Record<string, unknown>)['binary'];
  if (binary && typeof binary === 'object') {
    const binaryConfig = binary as Record<string, unknown>;
    const command = binaryConfig['command'];
    const args = binaryConfig['args'];
    if (typeof command === 'string') {
      return {
        command,
        args: Array.isArray(args) && args.every((arg) => typeof arg === 'string') ? args : [],
      };
    }
  }

  const command = (distribution as Record<string, unknown>)['command'];
  if (typeof command === 'string') {
    const parsed = parseCommand(command);
    return {
      command: firstCommandPart(parsed, `ACP registry agent ${registryId} has an empty command`),
      args: parsed.slice(1),
    };
  }

  throw new Error(`ACP registry agent ${registryId} does not expose a supported distribution`);
}

async function resolveCommand(options: AcpProviderOptions): Promise<CommandSpec> {
  if (options.command) {
    const parsed = parseCommand(options.command);
    return {
      command: firstCommandPart(parsed, 'ACP command must not be empty'),
      args: [...parsed.slice(1), ...(options.args ?? [])],
      env: options.env,
    };
  }

  if (options.registryId) {
    const command = await resolveRegistryCommand(options.registryId, options.registryUrl);
    return { ...command, env: options.env };
  }

  const envCommand = process.env['WARDEN_ACP_COMMAND'];
  if (envCommand) {
    const parsed = parseCommand(envCommand);
    return {
      command: firstCommandPart(parsed, 'WARDEN_ACP_COMMAND must not be empty'),
      args: parsed.slice(1),
      env: options.env,
    };
  }

  throw new Error('ACP runtime requires defaults.agent.acp.command, defaults.agent.acp.registryId, or WARDEN_ACP_COMMAND');
}

function acpUsageToStats(snapshot: AcpUsageSnapshot | undefined): UsageStats {
  const usages = snapshot?.usages ?? [];
  const inputTokens = usages.reduce((total, usage) => total + usage.inputTokens, 0);
  const outputTokens = usages.reduce((total, usage) => total + usage.outputTokens, 0);
  const cacheReadInputTokens = usages.reduce((total, usage) => total + (usage.cachedReadTokens ?? 0), 0);
  const cacheCreationInputTokens = usages.reduce((total, usage) => total + (usage.cachedWriteTokens ?? 0), 0);
  const update = snapshot?.usageUpdate;
  return {
    inputTokens,
    outputTokens,
    cacheReadInputTokens,
    cacheCreationInputTokens,
    cacheCreation5mInputTokens: cacheCreationInputTokens,
    cacheCreation1hInputTokens: 0,
    webSearchRequests: 0,
    costUSD: update?.cost?.currency === 'USD' ? update.cost.amount : 0,
  };
}

class WardenAcpClient implements Client {
  constructor(
    private readonly repoPath: string,
    private readonly textChunks: string[],
    private readonly usageSnapshot: AcpUsageSnapshot,
  ) {}

  async requestPermission(params: RequestPermissionRequest): Promise<RequestPermissionResponse> {
    const allow = params.options.find((option: PermissionOption) => option.kind === 'allow_once' || option.kind === 'allow_always') ?? params.options[0];
    if (!allow) return { outcome: { outcome: 'cancelled' } };
    return {
      outcome: {
        outcome: 'selected',
        optionId: allow.optionId,
      },
    };
  }

  async sessionUpdate(params: SessionNotification): Promise<void> {
    const update = params.update;
    if (update.sessionUpdate === 'agent_message_chunk' && update.content.type === 'text') {
      this.textChunks.push(update.content.text);
      return;
    }
    if (update.sessionUpdate === 'usage_update') {
      this.usageSnapshot.usageUpdate = update;
    }
  }

  async readTextFile(params: ReadTextFileRequest): Promise<ReadTextFileResponse> {
    const resolvedPath = resolve(this.repoPath, params.path);
    const relativePath = relative(this.repoPath, resolvedPath);
    if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      throw new Error('ACP file reads are restricted to the repository');
    }
    return { content: await readFile(resolvedPath, 'utf8') };
  }
}

function parseStructuredAcpOutput<T>(text: string, schema: AuxiliaryRunRequest<T>['schema']): AuxiliaryRunResult<T> {
  const json = extractJson(text);
  if (!json) {
    return { success: false, error: 'No JSON found in ACP response', usage: emptyUsage() };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    return {
      success: false,
      error: `Invalid JSON from ACP response: ${error instanceof Error ? error.message : String(error)}`,
      usage: emptyUsage(),
    };
  }

  const validated = schema.safeParse(parsed);
  if (!validated.success) {
    return { success: false, error: `Validation failed: ${validated.error.message}`, usage: emptyUsage() };
  }

  return { success: true, data: validated.data, usage: emptyUsage() };
}

function structuredPrompt(task: AuxiliaryRunRequest<unknown>['task'] | SynthesisRunRequest<unknown>['task'], prompt: string): string {
  return [
    `You are running Warden helper task: ${task}.`,
    'Return only valid JSON accepted by the requested schema. Do not wrap it in markdown.',
    'Do not include prose before or after the JSON.',
    '',
    prompt,
  ].join('\n');
}

export const acpRuntime: Runtime = {
  name: 'acp',

  async runSkill(request: SkillRunRequest): Promise<SkillRunResponse> {
    const { repoPath, skillName, systemPrompt, userPrompt, options, providerOptions } = request;
    const acpOptions = getAcpProviderOptions(providerOptions);
    const command = await resolveCommand(acpOptions);
    const startedAt = Date.now();
    const textChunks: string[] = [];
    const usageSnapshot: AcpUsageSnapshot = { usages: [] };

    return Sentry.startSpan(
      {
        op: 'gen_ai.invoke_agent',
        name: `invoke_acp_agent ${skillName}`,
        attributes: {
          'gen_ai.operation.name': 'invoke_agent',
          'gen_ai.provider.name': 'acp',
          'gen_ai.agent.name': skillName,
          'gen_ai.request.model': options.model ?? 'default',
          'warden.request.max_turns': options.maxTurns ?? 0,
          'acp.command': [command.command, ...command.args].join(' '),
        },
      },
      async (span) => {
        const child = spawn(command.command, command.args, {
          cwd: repoPath,
          env: { ...process.env, ...command.env },
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        const childError = new Promise<never>((_resolve, reject) => {
          child.once('error', reject);
        });
        void childError.catch(() => undefined);
        const withChildError = async <T>(operation: Promise<T>): Promise<T> => await Promise.race([operation, childError]);
        const stderrChunks: string[] = [];
        let abort: (() => void) | undefined;
        let abortCleanup: Promise<void> | undefined;
        let sessionId: string | undefined;

        try {
          child.stderr.setEncoding('utf8');
          child.stderr.on('data', (chunk: string) => stderrChunks.push(chunk));

          const stream = ndJsonStream(
            Writable.toWeb(child.stdin),
            Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>,
          );
          const connection = new ClientSideConnection(
            () => new WardenAcpClient(repoPath, textChunks, usageSnapshot),
            stream,
          );
          abort = (): void => {
            const killChild = (): void => {
              if (!child.killed) child.kill('SIGTERM');
            };
            if (sessionId) {
              try {
                const fallback = setTimeout(killChild, 250);
                fallback.unref?.();
                abortCleanup = connection.cancel({ sessionId })
                  .catch(() => undefined)
                  .finally(async () => {
                    clearTimeout(fallback);
                    await new Promise((resolveGrace) => setTimeout(resolveGrace, 50));
                    killChild();
                  });
                return;
              } catch {
                // Abort must never throw from the event listener; process kill is the fallback.
              }
            }
            killChild();
          };
          options.abortController?.signal.addEventListener('abort', abort, { once: true });

          await withChildError(connection.initialize({
            protocolVersion: PROTOCOL_VERSION,
            clientCapabilities: {
              fs: { readTextFile: true, writeTextFile: false },
              terminal: false,
            },
            clientInfo: { name: 'warden', title: 'Warden', version: '1.0.0' },
          }));

          const session = await withChildError(connection.newSession({
            cwd: repoPath,
            mcpServers: [],
          }));
          sessionId = session.sessionId;

          const promptResult = await withChildError(connection.prompt({
            sessionId,
            prompt: [{
              type: 'text',
              text: `${systemPrompt}\n\n${userPrompt}`,
            }],
          }));
          if (promptResult.usage) {
            usageSnapshot.usages.push(promptResult.usage);
          }

          const text = textChunks.join('');
          span.setAttribute('gen_ai.response.text', JSON.stringify([text]));
          return {
            result: {
              status: 'success',
              text,
              errors: [],
              usage: acpUsageToStats(usageSnapshot),
              responseModel: options.model,
              sessionId,
              durationMs: Date.now() - startedAt,
            },
            stderr: stderrChunks.join('').trim() || undefined,
          };
        } catch (error) {
          if (options.abortController?.signal.aborted) {
            await abortCleanup;
            return {
              result: {
                status: 'aborted',
                text: textChunks.join(''),
                errors: ['ACP run aborted'],
                usage: acpUsageToStats(usageSnapshot),
                durationMs: Date.now() - startedAt,
              },
              stderr: stderrChunks.join('').trim() || undefined,
            };
          }
          throw error;
        } finally {
          if (abort) {
            options.abortController?.signal.removeEventListener('abort', abort);
          }
          if (abortCleanup) {
            await abortCleanup;
          } else {
            child.kill('SIGTERM');
          }
        }
      }
    );
  },

  async runAuxiliary<T>(request: AuxiliaryRunRequest<T>): Promise<AuxiliaryRunResult<T>> {
    const response = await acpRuntime.runSkill({
      systemPrompt: 'You are Warden\'s structured helper runtime.',
      userPrompt: structuredPrompt(request.task, request.prompt),
      repoPath: request.repoPath ?? process.cwd(),
      skillName: `auxiliary:${request.task}`,
      options: {
        model: request.model,
        abortController: request.abortController,
      },
      providerOptions: request.providerOptions,
    });
    if (!response.result) {
      return { success: false, error: response.stderr ?? 'ACP helper returned no result', usage: emptyUsage() };
    }
    const parsed = parseStructuredAcpOutput(response.result.text, request.schema);
    return { ...parsed, usage: response.result.usage };
  },

  async runSynthesis<T>(request: SynthesisRunRequest<T>): Promise<AuxiliaryRunResult<T>> {
    const response = await acpRuntime.runSkill({
      systemPrompt: 'You are Warden\'s structured synthesis runtime.',
      userPrompt: structuredPrompt(request.task, request.prompt),
      repoPath: request.repoPath ?? process.cwd(),
      skillName: `synthesis:${request.task}`,
      options: {
        model: request.model,
        abortController: request.abortController,
      },
      providerOptions: request.providerOptions,
    });
    if (!response.result) {
      return { success: false, error: response.stderr ?? 'ACP synthesis returned no result', usage: emptyUsage() };
    }
    const parsed = parseStructuredAcpOutput(response.result.text, request.schema);
    return { ...parsed, usage: response.result.usage };
  },
};
