import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  AuthStorage,
  DefaultResourceLoader,
  ModelRegistry,
  SessionManager,
  SettingsManager,
  createAgentSession,
} from '@earendil-works/pi-coding-agent';
import { piRuntime } from './pi.js';

const piMocks = vi.hoisted(() => {
  const model = {
    id: 'gpt-test',
    provider: 'openai',
    model: 'gpt-test',
  };
  const authStorage = {
    setRuntimeApiKey: vi.fn(),
  };
  const registry = {
    find: vi.fn((_provider: string, _modelId: string) => model),
    getAll: vi.fn(() => [model]),
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
    authStorage,
    registry,
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
  AuthStorage: {
    create: vi.fn(() => piMocks.authStorage),
  },
  DefaultResourceLoader: vi.fn(function (options: unknown) {
    piMocks.resourceLoaderOptions.push(options);
    return piMocks.resourceLoader;
  }),
  ModelRegistry: {
    create: vi.fn(() => piMocks.registry),
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
    piMocks.listeners = [];
    piMocks.resourceLoaderOptions = [];
    piMocks.customTools = [];
    piMocks.session.prompt.mockImplementation(async () => emitSuccessfulRun());
    piMocks.registry.find.mockReturnValue(piMocks.model);
    piMocks.registry.getAll.mockReturnValue([piMocks.model]);
  });

  it('passes read-only Pi tools and normalizes the result', async () => {
    const result = await piRuntime.runSkill(baseSkillRequest());

    expect(AuthStorage.create).toHaveBeenCalled();
    expect(ModelRegistry.create).toHaveBeenCalledWith(piMocks.authStorage);
    expect(piMocks.registry.find).toHaveBeenCalledWith('openai', 'gpt-test');
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
      retry: expect.objectContaining({ enabled: false }),
    }));
    expect(createAgentSession).toHaveBeenCalledWith(expect.objectContaining({
      cwd: '/repo',
      agentDir: '/pi-agent',
      authStorage: piMocks.authStorage,
      modelRegistry: piMocks.registry,
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

  it('passes reasoning effort as Pi thinking level', async () => {
    await piRuntime.runSkill({
      ...baseSkillRequest(),
      options: {
        ...baseSkillRequest().options,
        reasoningEffort: 'medium',
      },
    });

    expect(createAgentSession).toHaveBeenCalledWith(expect.objectContaining({
      thinkingLevel: 'medium',
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

    expect(piMocks.authStorage.setRuntimeApiKey).toHaveBeenCalledWith('anthropic', 'sk-ant-test');
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

    expect(piMocks.authStorage.setRuntimeApiKey).not.toHaveBeenCalled();
  });

  it('resolves provider-specific Pi model IDs that contain slashes', async () => {
    await piRuntime.runSkill({
      ...baseSkillRequest(),
      options: {
        model: 'fireworks/accounts/fireworks/models/kimi-k2p6',
      },
    });

    expect(piMocks.registry.find).toHaveBeenCalledWith(
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

    expect(piMocks.registry.find).not.toHaveBeenCalled();
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
    piMocks.registry.find.mockReturnValue(piMocks.model);
    piMocks.registry.getAll.mockReturnValue([piMocks.model]);
  });

  it('parses and validates auxiliary JSON output', async () => {
    const result = await piRuntime.runAuxiliary({
      task: 'extraction',
      agentName: 'test-skill',
      apiKey: 'sk-ant-test',
      prompt: 'Return {"ok": true}',
      schema: z.object({ ok: z.boolean() }),
      model: 'anthropic/claude-sonnet-test',
    });

    expect(piMocks.authStorage.setRuntimeApiKey).toHaveBeenCalledWith('anthropic', 'sk-ant-test');
    expect(createAgentSession).toHaveBeenCalledWith(expect.objectContaining({
      cwd: process.cwd(),
      tools: [],
      noTools: 'all',
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
