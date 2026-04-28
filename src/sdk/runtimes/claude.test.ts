import { describe, it, expect, vi, beforeEach } from 'vitest';
import { query, type SDKMessage, type SDKResultSuccess } from '@anthropic-ai/claude-agent-sdk';
import { claudeAgentRuntime } from './claude.js';

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
    total_cost_usd: 0.01,
    usage: {
      input_tokens: 10,
      output_tokens: 5,
      cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 3 },
      cache_creation_input_tokens: 3,
      cache_read_input_tokens: 2,
      server_tool_use: { web_fetch_requests: 0, web_search_requests: 0 },
      service_tier: 'standard',
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

function mockStream(messages: SDKMessage[]): ReturnType<typeof query> {
  const stream = (async function* () {
    for (const message of messages) {
      yield message;
    }
  })();

  return stream as unknown as ReturnType<typeof query>;
}

describe('claudeAgentRuntime', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('passes read-only Claude tools and normalizes the result', async () => {
    mockQuery.mockReturnValue(mockStream([successResult()]));

    const result = await claudeAgentRuntime.execute({
      systemPrompt: 'system',
      userPrompt: 'user',
      repoPath: '/repo',
      skillName: 'test-skill',
      options: {
        model: 'claude-test',
        maxTurns: 3,
        pathToClaudeCodeExecutable: '/bin/claude',
      },
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
      subtype: 'success',
      isError: false,
      result: '{"findings":[]}',
      responseId: '00000000-0000-4000-8000-000000000001',
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

    const result = await claudeAgentRuntime.execute({
      systemPrompt: 'system',
      userPrompt: 'user',
      repoPath: '/repo',
      skillName: 'test-skill',
      options: {},
    });

    expect(result.authError).toBe('login required');
    expect(result.result).toBeUndefined();
  });
});
