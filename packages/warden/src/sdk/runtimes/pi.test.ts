import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { z } from 'zod';
import {
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
  SettingsManager,
  createAgentSession,
} from '@earendil-works/pi-coding-agent';
import { piRuntime } from './pi.js';
import {
  configureWardenOffline,
  resetWardenOfflineForTests,
} from '../offline.js';
import { Sentry } from '../../sentry.js';
import { startTraceRecorder, withTraceRecorder } from '../../sentry-trace.js';
import type { TraceSpan } from '../../types/index.js';

const piMocks = vi.hoisted(() => {
  const model: {
    id: string;
    provider: string;
    model: string;
    baseUrl?: string;
    headers?: Record<string, string>;
  } = {
    id: 'gpt-test',
    provider: 'openai',
    model: 'gpt-test',
  };
  const modelRuntime = {
    setRuntimeApiKey: vi.fn(),
    refresh: vi.fn(async (_options?: {
      providers?: string[];
      allowNetwork?: boolean;
      signal?: AbortSignal;
    }) => ({ aborted: false, errors: new Map() })),
    getModel: vi.fn((_provider: string, _modelId: string) => model),
    getModels: vi.fn(() => [model]),
  };
  const session = {
    sessionId: 'pi-session-1',
    subscribe: vi.fn((listener: (event: unknown) => void) => {
      piMocks.listeners.push(listener);
      return vi.fn();
    }),
    prompt: vi.fn(),
    abort: vi.fn(async () => undefined),
    dispose: vi.fn(),
  };
  const resourceLoader = {
    reload: vi.fn(async () => undefined),
  };
  const sessionManager = { kind: 'session-manager' };
  const settingsManager = { kind: 'settings-manager' };

  return {
    model,
    modelRuntime,
    session,
    resourceLoader,
    sessionManager,
    settingsManager,
    listeners: [] as ((event: unknown) => void)[],
    resourceLoaderOptions: [] as unknown[],
    customTools: [] as unknown[],
  };
});

vi.mock('@earendil-works/pi-ai', () => ({
  Type: {
    Unsafe: vi.fn((schema: unknown) => schema),
  },
}));

vi.mock('@earendil-works/pi-coding-agent', () => ({
  DefaultResourceLoader: vi.fn(function (options: unknown) {
    piMocks.resourceLoaderOptions.push(options);
    return piMocks.resourceLoader;
  }),
  ModelRuntime: {
    create: vi.fn(async () => piMocks.modelRuntime),
  },
  SessionManager: {
    inMemory: vi.fn(() => piMocks.sessionManager),
  },
  SettingsManager: {
    inMemory: vi.fn(() => piMocks.settingsManager),
  },
  createAgentSession: vi.fn(async (options: { customTools?: unknown[] }) => {
    piMocks.customTools = options.customTools ?? [];
    return {
      session: piMocks.session,
      extensionsResult: { extensions: [], diagnostics: [] },
    };
  }),
  defineTool: vi.fn((tool: unknown) => tool),
  getAgentDir: vi.fn(() => '/pi-agent'),
}));

beforeAll(() => {
  Sentry.init({
    dsn: 'https://public@example.com/1',
    tracesSampleRate: 1,
    transport: () => ({
      send: vi.fn(async () => ({})),
      flush: vi.fn(async () => true),
    }),
  });
});

afterAll(async () => {
  await Sentry.close(0);
});

function assistantMessage(overrides: Record<string, unknown> = {}) {
  return {
    role: 'assistant',
    content: [{ type: 'text', text: '{"findings":[]}' }],
    api: 'openai-responses',
    provider: 'openai',
    model: 'gpt-test',
    responseModel: 'gpt-test-2026',
    responseId: 'resp-1',
    usage: {
      input: 10,
      output: 5,
      cacheRead: 2,
      cacheWrite: 1,
      totalTokens: 18,
      cost: {
        input: 0.01,
        output: 0.02,
        cacheRead: 0.001,
        cacheWrite: 0.002,
        total: 0.033,
      },
    },
    stopReason: 'stop',
    timestamp: 1,
    ...overrides,
  };
}

function emitSuccessfulRun(message = assistantMessage()): void {
  const listener = piMocks.listeners[0];
  if (!listener) {
    throw new Error('Pi session listener was not registered');
  }
  listener({ type: 'turn_end', message, toolResults: [] });
  listener({ type: 'message_end', message });
  listener({ type: 'agent_end', messages: [message] });
}

function baseSkillRequest() {
  return {
    systemPrompt: 'system',
    userPrompt: 'user',
    repoPath: '/repo',
    skillName: 'test-skill',
    options: {
      model: 'openai/gpt-test',
      maxTurns: 3,
    },
  };
}

describe('piRuntime.runSkill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetWardenOfflineForTests();
    delete process.env['WARDEN_OFFLINE'];
    piMocks.listeners = [];
    piMocks.resourceLoaderOptions = [];
    piMocks.customTools = [];
    piMocks.session.prompt.mockImplementation(async () => emitSuccessfulRun());
    piMocks.modelRuntime.getModel.mockReturnValue(piMocks.model);
    piMocks.modelRuntime.getModels.mockReturnValue([piMocks.model]);
  });

  it('leaves the model untouched when no base URL override is set', async () => {
    await piRuntime.runSkill(baseSkillRequest());

    expect(createAgentSession).toHaveBeenCalledWith(
      expect.objectContaining({ model: piMocks.model })
    );
  });

  it('applies WARDEN_<PROVIDER>_BASE_URL to the resolved model', async () => {
    process.env['WARDEN_OPENAI_BASE_URL'] = 'https://gateway.internal/v1';
    try {
      await piRuntime.runSkill(baseSkillRequest());

      expect(createAgentSession).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.objectContaining({ baseUrl: 'https://gateway.internal/v1' }),
        })
      );
    } finally {
      delete process.env['WARDEN_OPENAI_BASE_URL'];
    }
  });

  it('uses the provider-specific base URL override', async () => {
    process.env['WARDEN_ANTHROPIC_BASE_URL'] = 'https://gateway.internal';
    try {
      await piRuntime.runSkill({
        ...baseSkillRequest(),
        options: {
          ...baseSkillRequest().options,
          model: 'anthropic/claude-test',
        },
      });

      expect(createAgentSession).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.objectContaining({ baseUrl: 'https://gateway.internal' }),
        })
      );
    } finally {
      delete process.env['WARDEN_ANTHROPIC_BASE_URL'];
    }
  });

  it('ignores an empty WARDEN_<PROVIDER>_BASE_URL', async () => {
    process.env['WARDEN_OPENAI_BASE_URL'] = '';
    try {
      await piRuntime.runSkill(baseSkillRequest());

      expect(createAgentSession).toHaveBeenCalledWith(
        expect.objectContaining({ model: piMocks.model })
      );
    } finally {
      delete process.env['WARDEN_OPENAI_BASE_URL'];
    }
  });

  it('merges WARDEN_<PROVIDER>_HEADERS into the resolved model', async () => {
    process.env['WARDEN_OPENAI_HEADERS'] = JSON.stringify({
      'x-existing': 'overridden',
      'x-litellm-tags': 'repo:acme/api,component:review',
    });
    piMocks.modelRuntime.getModel.mockReturnValue({
      ...piMocks.model,
      headers: { 'x-existing': 'original' },
    });
    try {
      await piRuntime.runSkill(baseSkillRequest());

      expect(createAgentSession).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.objectContaining({
            headers: {
              'x-existing': 'overridden',
              'x-litellm-tags': 'repo:acme/api,component:review',
            },
          }),
        })
      );
    } finally {
      delete process.env['WARDEN_OPENAI_HEADERS'];
    }
  });

  it('rejects invalid WARDEN_<PROVIDER>_HEADERS', async () => {
    process.env['WARDEN_OPENAI_HEADERS'] = '{"x-litellm-tags":42}';
    try {
      await expect(piRuntime.runSkill(baseSkillRequest())).rejects.toThrow(
        'WARDEN_OPENAI_HEADERS must be a JSON object with string values'
      );
    } finally {
      delete process.env['WARDEN_OPENAI_HEADERS'];
    }
  });

  it('passes read-only Pi tools and normalizes the result', async () => {
    const result = await piRuntime.runSkill(baseSkillRequest());

    expect(ModelRuntime.create).toHaveBeenCalled();
    expect(piMocks.modelRuntime.refresh).toHaveBeenCalledWith({
      providers: ['openai'],
      allowNetwork: true,
      signal: expect.any(AbortSignal),
    });
    expect(piMocks.modelRuntime.refresh).toHaveBeenCalledWith({
      providers: ['openai'],
      allowNetwork: false,
      signal: expect.any(AbortSignal),
    });
    expect(piMocks.modelRuntime.getModel).toHaveBeenCalledWith('openai', 'gpt-test');
    expect(DefaultResourceLoader).toHaveBeenCalledWith(expect.objectContaining({
      cwd: '/repo',
      agentDir: '/pi-agent',
      noExtensions: true,
      noSkills: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
      systemPrompt: 'system',
    }));
    expect(piMocks.resourceLoader.reload).toHaveBeenCalled();
    expect(SessionManager.inMemory).toHaveBeenCalledWith('/repo');
    expect(SettingsManager.inMemory).toHaveBeenCalledWith(expect.objectContaining({
      compaction: { enabled: false },
      retry: expect.objectContaining({
        enabled: true,
        provider: expect.objectContaining({ maxRetries: 0 }),
      }),
    }));
    expect(createAgentSession).toHaveBeenCalledWith(expect.objectContaining({
      cwd: '/repo',
      agentDir: '/pi-agent',
      modelRuntime: piMocks.modelRuntime,
      model: piMocks.model,
      tools: ['read', 'grep', 'find', 'ls'],
      customTools: undefined,
      resourceLoader: piMocks.resourceLoader,
      sessionManager: piMocks.sessionManager,
      settingsManager: piMocks.settingsManager,
    }));
    expect(piMocks.session.prompt).toHaveBeenCalledWith('user', { expandPromptTemplates: false });
    expect(piMocks.session.dispose).toHaveBeenCalled();
    expect(result.result).toMatchObject({
      status: 'success',
      text: '{"findings":[]}',
      responseProvider: 'openai',
      responseId: 'resp-1',
      responseModel: 'gpt-test-2026',
      sessionId: 'pi-session-1',
      numTurns: 1,
      usage: {
        inputTokens: 13,
        outputTokens: 5,
        cacheReadInputTokens: 2,
        cacheCreationInputTokens: 1,
        cacheCreation5mInputTokens: 1,
        cacheCreation1hInputTokens: 0,
        webSearchRequests: 0,
        costUSD: 0.033,
      },
    });
  });

  it('records Pi tool execution spans when trace capture is active', async () => {
    const toolResult = {
      role: 'toolResult',
      toolCallId: 'tool-1',
      toolName: 'read',
      content: [{ type: 'text', text: 'file contents' }],
      details: { path: 'README.md' },
      isError: false,
      timestamp: 2,
    };
    piMocks.session.prompt.mockImplementation(async () => {
      const listener = piMocks.listeners[0];
      if (!listener) {
        throw new Error('Pi session listener was not registered');
      }
      listener({
        type: 'tool_execution_start',
        toolCallId: 'tool-1',
        toolName: 'read',
        args: { path: 'README.md' },
      });
      listener({
        type: 'tool_execution_end',
        toolCallId: 'tool-1',
        toolName: 'read',
        result: toolResult,
        isError: false,
      });
      emitSuccessfulRun();
    });

    let spans: TraceSpan[] | undefined;
    await Sentry.startSpan({ op: 'test', name: 'parent' }, async (span) => {
      const recorder = startTraceRecorder(span);
      await withTraceRecorder(recorder, () => piRuntime.runSkill(baseSkillRequest()));
      spans = recorder?.snapshot();
    });

    expect(spans).toEqual(expect.arrayContaining([
      expect.objectContaining({
        op: 'gen_ai.execute_tool',
        name: 'execute_tool read',
        attributes: expect.objectContaining({
          'gen_ai.operation.name': 'execute_tool',
          'gen_ai.agent.name': 'test-skill',
          'gen_ai.tool.name': 'read',
          'gen_ai.tool.call.id': 'tool-1',
          'gen_ai.tool.type': 'function',
          'gen_ai.tool.call.arguments': JSON.stringify({ path: 'README.md' }),
          'gen_ai.tool.call.result': JSON.stringify(toolResult),
        }),
      }),
    ]));
  });

  it('does not treat a final answer on the max turn as a turn-limit failure', async () => {
    const result = await piRuntime.runSkill({
      ...baseSkillRequest(),
      options: {
        model: 'openai/gpt-test',
        maxTurns: 1,
      },
    });

    expect(piMocks.session.abort).not.toHaveBeenCalled();
    expect(result.result?.status).toBe('success');
  });

  it('preserves the tool-use turn when the max turn limit is reached', async () => {
    const toolUseMessage = assistantMessage({
      stopReason: 'toolUse',
      content: [{ type: 'toolCall', id: 'tool-1', name: 'read', arguments: { path: 'README.md' } }],
    });
    const abortedMessage = assistantMessage({
      stopReason: 'aborted',
      content: [{ type: 'text', text: '' }],
      errorMessage: 'Request was aborted',
    });
    piMocks.session.prompt.mockImplementation(async () => {
      const listener = piMocks.listeners[0];
      if (!listener) {
        throw new Error('Pi session listener was not registered');
      }
      listener({ type: 'message_end', message: toolUseMessage });
      listener({ type: 'turn_end', message: toolUseMessage, toolResults: [] });
      listener({ type: 'message_end', message: abortedMessage });
      listener({ type: 'agent_end', messages: [toolUseMessage, abortedMessage] });
    });

    const result = await piRuntime.runSkill({
      ...baseSkillRequest(),
      options: {
        model: 'openai/gpt-test',
        maxTurns: 1,
      },
    });

    expect(piMocks.session.abort).toHaveBeenCalled();
    expect(result.result).toMatchObject({
      status: 'turn_limit',
      responseId: 'resp-1',
      responseModel: 'gpt-test-2026',
    });
  });

  it('passes effort as Pi thinking level', async () => {
    await piRuntime.runSkill({
      ...baseSkillRequest(),
      options: {
        ...baseSkillRequest().options,
        effort: 'max',
      },
    });

    expect(createAgentSession).toHaveBeenCalledWith(expect.objectContaining({
      thinkingLevel: 'max',
    }));
  });

  it('warns when requested tools cannot be mapped safely to Pi', async () => {
    const result = await piRuntime.runSkill({
      ...baseSkillRequest(),
      tools: { allowed: ['Read', 'Glob', 'WebFetch', 'Bash'], denied: ['Glob'] },
    });

    expect(createAgentSession).toHaveBeenCalledWith(expect.objectContaining({
      tools: ['read'],
    }));
    expect(result.stderr).toContain('Pi runtime ignored unsupported tool: WebFetch');
    expect(result.stderr).toContain('Pi runtime ignored mutating tool without allowMutatingTools: Bash');
  });

  it('allows requested mutating tools for trusted writer runs', async () => {
    await piRuntime.runSkill({
      ...baseSkillRequest(),
      tools: { allowed: ['Read', 'Write', 'Edit', 'Bash'] },
      allowMutatingTools: true,
    });

    expect(createAgentSession).toHaveBeenCalledWith(expect.objectContaining({
      tools: ['read', 'write', 'edit', 'bash'],
    }));
  });

  it('passes the legacy Anthropic API key to Anthropic Pi skill models', async () => {
    await piRuntime.runSkill({
      ...baseSkillRequest(),
      apiKey: 'sk-ant-test',
      options: {
        model: 'anthropic/claude-test',
      },
    });

    expect(piMocks.modelRuntime.setRuntimeApiKey).toHaveBeenCalledWith(
      'anthropic',
      'sk-ant-test',
    );
  });

  it('does not pass the legacy Anthropic API key to non-Anthropic Pi models', async () => {
    await piRuntime.runAuxiliary({
      task: 'extraction',
      agentName: 'test-skill',
      apiKey: 'sk-ant-test',
      prompt: 'Return {"ok": true}',
      schema: z.object({ ok: z.boolean() }),
      model: 'openai/gpt-test',
    });

    expect(piMocks.modelRuntime.setRuntimeApiKey).not.toHaveBeenCalled();
  });

  it('refreshes only the selected provider before resolving its model', async () => {
    await piRuntime.runSkill({
      ...baseSkillRequest(),
      options: {
        model: 'openrouter/x-ai/grok-4.6',
      },
    });

    expect(piMocks.modelRuntime.refresh).toHaveBeenCalledWith({
      providers: ['openrouter'],
      allowNetwork: true,
      signal: expect.any(AbortSignal),
    });
    expect(piMocks.modelRuntime.refresh).toHaveBeenCalledWith({
      providers: ['openrouter'],
      allowNetwork: false,
      signal: expect.any(AbortSignal),
    });
    expect(piMocks.modelRuntime.getModel).toHaveBeenCalledWith(
      'openrouter',
      'x-ai/grok-4.6'
    );
  });

  it('honors caller abort during selected provider catalog refresh', async () => {
    const abortController = new AbortController();
    abortController.abort();

    await expect(piRuntime.runSkill({
      ...baseSkillRequest(),
      options: {
        model: 'openai/gpt-test',
        abortController,
      },
    })).rejects.toMatchObject({ name: 'AbortError' });

    expect(piMocks.modelRuntime.refresh).not.toHaveBeenCalled();
  });

  it('honors caller abort without AbortSignal.any on older Node 20', async () => {
    const originalAny = AbortSignal.any;
    // Simulate Node 20.0-20.2 where AbortSignal.any is missing.
    // @ts-expect-error intentional runtime deletion for compatibility coverage
    delete AbortSignal.any;

    try {
      const abortController = new AbortController();
      let releaseNetwork!: () => void;
      const networkGate = new Promise<void>((resolve) => {
        releaseNetwork = resolve;
      });
      piMocks.modelRuntime.refresh.mockImplementation(async (options?: {
        allowNetwork?: boolean;
        signal?: AbortSignal;
      }) => {
        if (options?.allowNetwork === false) {
          return { aborted: false, errors: new Map() };
        }
        await networkGate;
        if (options?.signal?.aborted) {
          throw options.signal.reason ?? new DOMException('This operation was aborted', 'AbortError');
        }
        return { aborted: false, errors: new Map() };
      });

      const waiting = piRuntime.runSkill({
        ...baseSkillRequest(),
        options: {
          model: 'openai/gpt-test',
          abortController,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));
      abortController.abort();
      releaseNetwork();

      await expect(waiting).rejects.toMatchObject({ name: 'AbortError' });
    } finally {
      AbortSignal.any = originalAny;
    }
  });

  it('skips shared network catalog refresh when offline policy is configured', async () => {
    configureWardenOffline(true);

    await piRuntime.runSkill(baseSkillRequest());

    expect(piMocks.modelRuntime.refresh).toHaveBeenCalledTimes(1);
    expect(piMocks.modelRuntime.refresh).toHaveBeenCalledWith({
      providers: ['openai'],
      allowNetwork: false,
      signal: expect.any(AbortSignal),
    });
  });

  it('skips shared network catalog refresh when WARDEN_OFFLINE is set', async () => {
    process.env['WARDEN_OFFLINE'] = '1';

    await piRuntime.runSkill(baseSkillRequest());

    expect(piMocks.modelRuntime.refresh).toHaveBeenCalledTimes(1);
    expect(piMocks.modelRuntime.refresh).toHaveBeenCalledWith({
      providers: ['openai'],
      allowNetwork: false,
      signal: expect.any(AbortSignal),
    });
  });

  it('builds catalog refresh deadlines without AbortSignal.timeout on older Node 20', async () => {
    const originalTimeout = AbortSignal.timeout;
    // Simulate Node 20.0-20.2 where AbortSignal.timeout is missing.
    // @ts-expect-error intentional runtime deletion for compatibility coverage
    delete AbortSignal.timeout;

    try {
      await piRuntime.runSkill(baseSkillRequest());

      expect(piMocks.modelRuntime.refresh).toHaveBeenCalledWith({
        providers: ['openai'],
        allowNetwork: true,
        signal: expect.any(AbortSignal),
      });
      expect(piMocks.modelRuntime.refresh).toHaveBeenCalledWith({
        providers: ['openai'],
        allowNetwork: false,
        signal: expect.any(AbortSignal),
      });
    } finally {
      AbortSignal.timeout = originalTimeout;
    }
  });

  it('shares one in-flight provider catalog refresh across concurrent prompts', async () => {
    let networkActive = 0;
    let maxNetworkActive = 0;
    let networkCalls = 0;
    let restoreCalls = 0;
    piMocks.modelRuntime.refresh.mockImplementation(async (options?: {
      allowNetwork?: boolean;
    }) => {
      if (options?.allowNetwork === false) {
        restoreCalls += 1;
        return { aborted: false, errors: new Map() };
      }
      networkCalls += 1;
      networkActive += 1;
      maxNetworkActive = Math.max(maxNetworkActive, networkActive);
      await new Promise((resolve) => setTimeout(resolve, 40));
      networkActive -= 1;
      return { aborted: false, errors: new Map() };
    });

    await Promise.all([
      piRuntime.runSkill(baseSkillRequest()),
      piRuntime.runSkill(baseSkillRequest()),
    ]);

    expect(maxNetworkActive).toBe(1);
    expect(networkCalls).toBe(1);
    expect(restoreCalls).toBe(2);
  });

  it('does not stampede pi.dev when a shared catalog refresh fails', async () => {
    let networkCalls = 0;
    let restoreCalls = 0;
    piMocks.modelRuntime.refresh.mockImplementation(async (options?: {
      allowNetwork?: boolean;
    }) => {
      if (options?.allowNetwork === false) {
        restoreCalls += 1;
        return { aborted: false, errors: new Map() };
      }
      networkCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      throw new Error('catalog unavailable');
    });

    await Promise.all([
      piRuntime.runSkill(baseSkillRequest()),
      piRuntime.runSkill(baseSkillRequest()),
      piRuntime.runSkill(baseSkillRequest()),
    ]);

    expect(networkCalls).toBe(1);
    expect(restoreCalls).toBe(3);
  });

  it('keeps the shared refresh entry until waiters finish local restore', async () => {
    let networkCalls = 0;
    let restoreCalls = 0;
    let releaseRestore!: () => void;
    const restoreGate = new Promise<void>((resolve) => {
      releaseRestore = resolve;
    });
    let firstRestoreStarted = false;
    piMocks.modelRuntime.refresh.mockImplementation(async (options?: {
      allowNetwork?: boolean;
    }) => {
      if (options?.allowNetwork === false) {
        restoreCalls += 1;
        if (!firstRestoreStarted) {
          firstRestoreStarted = true;
          await restoreGate;
        }
        return { aborted: false, errors: new Map() };
      }
      networkCalls += 1;
      return { aborted: false, errors: new Map() };
    });

    const first = piRuntime.runSkill(baseSkillRequest());
    // Let the shared network settle and the first waiter enter local restore.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(firstRestoreStarted).toBe(true);
    expect(networkCalls).toBe(1);

    // A late joiner during local restore must not start another network refresh.
    const second = piRuntime.runSkill(baseSkillRequest());
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(networkCalls).toBe(1);

    releaseRestore();
    await Promise.all([first, second]);
    expect(networkCalls).toBe(1);
    expect(restoreCalls).toBe(2);
  });

  it('lets a waiter abort without cancelling a shared peer catalog refresh', async () => {
    let networkSettled = false;
    let releaseNetwork!: () => void;
    const networkGate = new Promise<void>((resolve) => {
      releaseNetwork = resolve;
    });
    piMocks.modelRuntime.refresh.mockImplementation(async (options?: {
      allowNetwork?: boolean;
      signal?: AbortSignal;
    }) => {
      if (options?.allowNetwork === false) {
        return { aborted: false, errors: new Map() };
      }
      await networkGate;
      networkSettled = true;
      return { aborted: false, errors: new Map() };
    });

    const abortController = new AbortController();
    const waiting = piRuntime.runSkill({
      ...baseSkillRequest(),
      options: {
        model: 'openai/gpt-test',
        abortController,
      },
    });
    const peer = piRuntime.runSkill(baseSkillRequest());

    // Let both join the shared refresh, then abort only the waiter.
    await new Promise((resolve) => setTimeout(resolve, 10));
    abortController.abort();

    await expect(waiting).rejects.toMatchObject({ name: 'AbortError' });
    expect(networkSettled).toBe(false);

    releaseNetwork();
    await peer;
    expect(networkSettled).toBe(true);
  });

  it('resolves provider-specific Pi model IDs that contain slashes', async () => {
    await piRuntime.runSkill({
      ...baseSkillRequest(),
      options: {
        model: 'fireworks/accounts/fireworks/models/kimi-k2p6',
      },
    });

    expect(piMocks.modelRuntime.getModel).toHaveBeenCalledWith(
      'fireworks',
      'accounts/fireworks/models/kimi-k2p6'
    );
  });

  it('requires configured Pi models to use provider/model selectors', async () => {
    await expect(piRuntime.runSkill({
      ...baseSkillRequest(),
      options: {
        model: 'gpt-test',
      },
    })).rejects.toThrow('Pi runtime model must use provider/model format');

    expect(piMocks.modelRuntime.getModel).not.toHaveBeenCalled();
  });
});

describe('piRuntime structured calls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    piMocks.listeners = [];
    piMocks.resourceLoaderOptions = [];
    piMocks.customTools = [];
    piMocks.session.prompt.mockImplementation(async () => emitSuccessfulRun(
      assistantMessage({ content: [{ type: 'text', text: '{"ok":true}' }] })
    ));
    piMocks.modelRuntime.getModel.mockReturnValue(piMocks.model);
    piMocks.modelRuntime.getModels.mockReturnValue([piMocks.model]);
  });

  it('parses and validates auxiliary JSON output', async () => {
    const result = await piRuntime.runAuxiliary({
      task: 'extraction',
      agentName: 'test-skill',
      apiKey: 'sk-ant-test',
      prompt: 'Return {"ok": true}',
      schema: z.object({ ok: z.boolean() }),
      model: 'anthropic/claude-sonnet-test',
      effort: 'high',
    });

    expect(piMocks.modelRuntime.setRuntimeApiKey).toHaveBeenCalledWith(
      'anthropic',
      'sk-ant-test',
    );
    expect(createAgentSession).toHaveBeenCalledWith(expect.objectContaining({
      cwd: process.cwd(),
      tools: [],
      noTools: 'all',
      thinkingLevel: 'high',
    }));
    expect(piMocks.resourceLoaderOptions[0]).toEqual(expect.objectContaining({
      systemPrompt: expect.stringContaining('Return only valid JSON'),
    }));
    expect(result).toMatchObject({
      success: true,
      data: { ok: true },
      usage: {
        inputTokens: 13,
        outputTokens: 5,
        costUSD: 0.033,
      },
    });
  });

  it('registers auxiliary tools as Pi custom tools', async () => {
    const executeTool = vi.fn(async () => 'file contents');

    await piRuntime.runAuxiliary({
      task: 'fix_evaluation',
      prompt: 'Return {"ok": true}',
      schema: z.object({ ok: z.boolean() }),
      model: 'openai/gpt-test',
      tools: [{
        name: 'fetch_file',
        description: 'Fetch a file',
        inputSchema: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
        },
      }],
      executeTool,
      maxIterations: 5,
    });

    expect(createAgentSession).toHaveBeenCalledWith(expect.objectContaining({
      tools: ['fetch_file'],
      customTools: [expect.objectContaining({
        name: 'fetch_file',
        description: 'Fetch a file',
      })],
    }));

    const [tool] = piMocks.customTools as {
      execute: (toolCallId: string, params: Record<string, unknown>) => Promise<{
        content: { type: string; text: string }[];
      }>;
    }[];
    expect(tool).toBeDefined();
    const result = await tool!.execute('tool-1', { path: 'src/index.ts' });

    expect(executeTool).toHaveBeenCalledWith('fetch_file', { path: 'src/index.ts' });
    expect(result.content).toEqual([{ type: 'text', text: 'file contents' }]);
  });

  it('passes structured maxRetries into Pi provider retry settings', async () => {
    await piRuntime.runAuxiliary({
      task: 'extraction',
      prompt: 'Return {"ok": true}',
      schema: z.object({ ok: z.boolean() }),
      model: 'openai/gpt-test',
      maxRetries: 4,
    });

    expect(SettingsManager.inMemory).toHaveBeenCalledWith(expect.objectContaining({
      retry: expect.objectContaining({
        enabled: true,
        provider: expect.objectContaining({ maxRetries: 4 }),
      }),
    }));
  });

  it('returns validation failures clearly', async () => {
    piMocks.session.prompt.mockImplementation(async () => emitSuccessfulRun(
      assistantMessage({ content: [{ type: 'text', text: '{"ok":"nope"}' }] })
    ));

    const result = await piRuntime.runSynthesis({
      task: 'consolidation',
      prompt: 'Return {"ok": true}',
      schema: z.object({ ok: z.boolean() }),
      model: 'openai/gpt-test',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Validation failed');
    }
  });
});
