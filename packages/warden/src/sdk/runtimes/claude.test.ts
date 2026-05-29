import { describe, it, expect, vi, beforeEach } from 'vitest';
import { query, type SDKMessage, type SDKResultError, type SDKResultSuccess } from '@anthropic-ai/claude-agent-sdk';
import { claudeRuntime } from './claude.js';

vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}));

const mockQuery = vi.mocked(query);

function successResult(overrides: Partial<SDKResultSuccess> = {}): SDKResultSuccess {
  return {
    type: 'result',
    subtype: 'success',
    duration_ms: 100,
    duration_api_ms: 80,
    is_error: false,
    num_turns: 1,
    result: '{"findings":[]}',
    stop_reason: null,
    total_cost_usd: 0.01,
    usage: {
      input_tokens: 10,
      output_tokens: 5,
      cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 3 },
      cache_creation_input_tokens: 3,
      cache_read_input_tokens: 2,
      inference_geo: 'us',
      iterations: [],
      server_tool_use: { web_fetch_requests: 0, web_search_requests: 0 },
      service_tier: 'standard',
      speed: 'standard',
    },
    modelUsage: {
      'claude-test': {
        inputTokens: 15,
        outputTokens: 5,
        cacheReadInputTokens: 2,
        cacheCreationInputTokens: 3,
        webSearchRequests: 0,
        costUSD: 0.01,
        contextWindow: 200000,
        maxOutputTokens: 8192,
      },
    },
    permission_denials: [],
    uuid: '00000000-0000-4000-8000-000000000001',
    session_id: 'session-1',
    ...overrides,
  };
}

function errorResult(overrides: Partial<SDKResultError> = {}): SDKResultError {
  return {
    type: 'result',
    subtype: 'error_max_turns',
    duration_ms: 100,
    duration_api_ms: 80,
    is_error: true,
    num_turns: 3,
    stop_reason: null,
    total_cost_usd: 0.01,
    usage: {
      input_tokens: 10,
      output_tokens: 5,
      cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 3 },
      cache_creation_input_tokens: 3,
      cache_read_input_tokens: 2,
      inference_geo: 'us',
      iterations: [],
      server_tool_use: { web_fetch_requests: 0, web_search_requests: 0 },
      service_tier: 'standard',
      speed: 'standard',
    },
    modelUsage: {
      'claude-test': {
        inputTokens: 15,
        outputTokens: 5,
        cacheReadInputTokens: 2,
        cacheCreationInputTokens: 3,
        webSearchRequests: 0,
        costUSD: 0.01,
        contextWindow: 200000,
        maxOutputTokens: 8192,
      },
    },
    permission_denials: [],
    errors: [],
    uuid: '00000000-0000-4000-8000-000000000003',
    session_id: 'session-1',
    ...overrides,
  };
}

function mockStream(messages: SDKMessage[]): ReturnType<typeof query> {
  const stream = (async function* () {
    for (const message of messages) {
      yield message;
    }
  })();

  return stream as unknown as ReturnType<typeof query>;
}

function failingStream(error: unknown): ReturnType<typeof query> {
  const stream = (async function* () {
    yield successResult();
    throw error;
  })();

  return stream as unknown as ReturnType<typeof query>;
}

describe('claudeRuntime.runSkill', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('passes read-only Claude tools and normalizes the result', async () => {
    mockQuery.mockReturnValue(mockStream([successResult()]));
    const options = {
      model: 'claude-test',
      maxTurns: 3,
    };

    const result = await claudeRuntime.runSkill({
      systemPrompt: 'system',
      userPrompt: 'user',
      repoPath: '/repo',
      skillName: 'test-skill',
      options,
      providerOptions: { pathToClaudeCodeExecutable: '/bin/claude' },
    });

    expect(mockQuery).toHaveBeenCalledWith({
      prompt: 'user',
      options: expect.objectContaining({
        allowedTools: ['Read', 'Grep', 'Glob'],
        disallowedTools: ['Write', 'Edit', 'Bash', 'WebFetch', 'WebSearch', 'Task', 'TodoWrite'],
        cwd: '/repo',
        maxTurns: 3,
        model: 'claude-test',
        pathToClaudeCodeExecutable: '/bin/claude',
        permissionMode: 'bypassPermissions',
        persistSession: false,
        systemPrompt: 'system',
      }),
    });
    expect(result.result).toMatchObject({
      status: 'success',
      text: '{"findings":[]}',
      responseId: '00000000-0000-4000-8000-000000000001',
      responseModel: 'claude-test',
      sessionId: 'session-1',
      usage: {
        inputTokens: 15,
        outputTokens: 5,
        cacheReadInputTokens: 2,
        cacheCreationInputTokens: 3,
        costUSD: 0.01,
      },
    });
  });

  it('passes reasoning effort to Claude adaptive thinking', async () => {
    mockQuery.mockReturnValue(mockStream([successResult()]));

    await claudeRuntime.runSkill({
      systemPrompt: 'system',
      userPrompt: 'user',
      repoPath: '/repo',
      skillName: 'test-skill',
      options: {
        model: 'claude-test',
        reasoningEffort: 'medium',
      },
    });

    expect(mockQuery).toHaveBeenCalledWith({
      prompt: 'user',
      options: expect.objectContaining({
        effort: 'medium',
        thinking: { type: 'adaptive' },
      }),
    });
  });

  it('can disable Claude thinking', async () => {
    mockQuery.mockReturnValue(mockStream([successResult()]));

    await claudeRuntime.runSkill({
      systemPrompt: 'system',
      userPrompt: 'user',
      repoPath: '/repo',
      skillName: 'test-skill',
      options: {
        model: 'claude-test',
        reasoningEffort: 'off',
      },
    });

    expect(mockQuery).toHaveBeenCalledWith({
      prompt: 'user',
      options: expect.objectContaining({
        thinking: { type: 'disabled' },
      }),
    });
    expect(mockQuery.mock.calls[0]?.[0].options).not.toHaveProperty('effort');
  });

  it('computes run cost from streamed assistant turns instead of cumulative SDK cost', async () => {
    mockQuery.mockReturnValue(mockStream([
      {
        type: 'assistant',
        message: {
          id: 'msg_1',
          type: 'message',
          role: 'assistant',
          model: 'claude-haiku-4-5-20251001',
          content: [{ type: 'text', text: '{"findings":[]}' }],
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: 1000,
            output_tokens: 500,
            cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 100 },
            cache_creation_input_tokens: 100,
            cache_read_input_tokens: 200,
            server_tool_use: { web_fetch_requests: 0, web_search_requests: 2 },
            service_tier: 'standard',
          },
        },
        parent_tool_use_id: null,
        uuid: '00000000-0000-4000-8000-000000000011',
        session_id: 'session-1',
      } as unknown as SDKMessage,
      successResult({ total_cost_usd: 99 }),
    ]));

    const result = await claudeRuntime.runSkill({
      systemPrompt: 'system',
      userPrompt: 'user',
      repoPath: '/repo',
      skillName: 'test-skill',
      options: {},
    });

    expect(result.result?.responseModel).toBe('claude-haiku-4-5-20251001');
    expect(result.result?.usage).toMatchObject({
      inputTokens: 1300,
      outputTokens: 500,
      cacheReadInputTokens: 200,
      cacheCreationInputTokens: 100,
    });
    expect(result.result?.usage.costUSD).toBeCloseTo(0.023645, 6);
  });

  it('allows read-only web tools when a skill explicitly opts in', async () => {
    mockQuery.mockReturnValue(mockStream([successResult()]));

    await claudeRuntime.runSkill({
      systemPrompt: 'system',
      userPrompt: 'user',
      repoPath: '/repo',
      skillName: 'generated-skill-track',
      tools: { allowed: ['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch'] },
      options: {},
    });

    expect(mockQuery).toHaveBeenCalledWith({
      prompt: 'user',
      options: expect.objectContaining({
        allowedTools: ['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch'],
        disallowedTools: ['Write', 'Edit', 'Bash', 'Task', 'TodoWrite'],
      }),
    });
  });

  it('allows requested mutating tools only for trusted writer runs', async () => {
    mockQuery.mockReturnValue(mockStream([successResult()]));

    await claudeRuntime.runSkill({
      systemPrompt: 'system',
      userPrompt: 'user',
      repoPath: '/repo/skill-root',
      skillName: 'generated-skill-writer',
      tools: { allowed: ['Read', 'Write', 'Edit', 'Bash'] },
      allowMutatingTools: true,
      options: {},
    });

    expect(mockQuery).toHaveBeenCalledWith({
      prompt: 'user',
      options: expect.objectContaining({
        allowedTools: ['Read', 'Write', 'Edit', 'Bash'],
        disallowedTools: ['Grep', 'Glob', 'WebFetch', 'WebSearch', 'Task', 'TodoWrite'],
      }),
    });
  });

  it('surfaces auth status errors', async () => {
    mockQuery.mockReturnValue(mockStream([
      {
        type: 'auth_status',
        isAuthenticating: false,
        output: [],
        error: 'login required',
        uuid: '00000000-0000-4000-8000-000000000002',
        session_id: 'session-1',
      },
    ]));

    const result = await claudeRuntime.runSkill({
      systemPrompt: 'system',
      userPrompt: 'user',
      repoPath: '/repo',
      skillName: 'test-skill',
      options: {},
    });

    expect(result.authError).toBe('login required');
    expect(result.result).toBeUndefined();
  });

  it('normalizes SDK error results without trusting is_error or usage presence', async () => {
    const message = errorResult({ is_error: false, errors: ['too many turns'] });
    const partialMessage = message as Partial<SDKResultError>;
    delete partialMessage.usage;
    delete partialMessage.total_cost_usd;
    delete partialMessage.modelUsage;

    mockQuery.mockReturnValue(mockStream([message as SDKMessage]));

    const result = await claudeRuntime.runSkill({
      systemPrompt: 'system',
      userPrompt: 'user',
      repoPath: '/repo',
      skillName: 'test-skill',
      options: {},
    });

    expect(result.result).toMatchObject({
      status: 'turn_limit',
      text: '',
      errors: ['too many turns'],
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        costUSD: 0,
      },
    });
  });

  it.each([
    ['error_during_execution', 'provider_error'],
    ['error_max_turns', 'turn_limit'],
    ['error_max_budget_usd', 'budget_limit'],
    ['error_max_structured_output_retries', 'structured_output_error'],
  ] as const)('maps Claude subtype %s to Warden status %s', async (subtype, status) => {
    mockQuery.mockReturnValue(mockStream([errorResult({ subtype })]));

    const result = await claudeRuntime.runSkill({
      systemPrompt: 'system',
      userPrompt: 'user',
      repoPath: '/repo',
      skillName: 'test-skill',
      options: {},
    });

    expect(result.result?.status).toBe(status);
  });

  it('preserves SDK error instances when appending stderr diagnostics', async () => {
    class SdkTransientError extends Error {}
    const thrown = new SdkTransientError('socket failed');

    mockQuery.mockImplementation((request: Parameters<typeof query>[0]) => {
      request.options?.stderr?.('stderr details');
      return failingStream(thrown);
    });

    let caught: unknown;
    try {
      await claudeRuntime.runSkill({
        systemPrompt: 'system',
        userPrompt: 'user',
        repoPath: '/repo',
        skillName: 'test-skill',
        options: {},
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBe(thrown);
    expect(caught).toBeInstanceOf(SdkTransientError);
    expect((caught as Error).message).toContain('socket failed');
    expect((caught as Error).message).toContain('Claude Code stderr: stderr details');
  });
});
