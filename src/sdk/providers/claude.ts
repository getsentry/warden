import type Anthropic from '@anthropic-ai/sdk';
import { callHaiku, callHaikuWithTools } from '../haiku.js';
import { claudeAgentRuntime } from '../runtimes/claude.js';
import { emptyUsage } from '../usage.js';
import type {
  FastModelGenerateObjectRequest,
  FastModelGenerateObjectWithToolsRequest,
  FastModelResult,
  FastModelRuntime,
  FastModelTool,
} from '../runtimes/index.js';
import type { RuntimeProvider } from './types.js';

function missingApiKeyResult<T>(): FastModelResult<T> {
  return {
    success: false,
    error: 'Anthropic API key required for Claude fast-model runtime',
    usage: emptyUsage(),
  };
}

function toAnthropicTool(tool: FastModelTool): Anthropic.Tool {
  return {
    name: tool.name,
    description: tool.description ?? '',
    input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
  };
}

export const claudeFastModelRuntime: FastModelRuntime = {
  name: 'claude-fast-model',

  async generateObject<T>(request: FastModelGenerateObjectRequest<T>) {
    if (!request.apiKey) {
      return missingApiKeyResult();
    }
    return callHaiku({
      apiKey: request.apiKey,
      prompt: request.prompt,
      schema: request.schema,
      model: request.model,
      maxTokens: request.maxTokens,
      timeout: request.timeout,
      maxRetries: request.maxRetries,
    });
  },

  async generateObjectWithTools<T>(request: FastModelGenerateObjectWithToolsRequest<T>) {
    if (!request.apiKey) {
      return missingApiKeyResult();
    }
    return callHaikuWithTools({
      apiKey: request.apiKey,
      prompt: request.prompt,
      schema: request.schema,
      tools: request.tools.map(toAnthropicTool),
      executeTool: request.executeTool,
      model: request.model,
      maxTokens: request.maxTokens,
      maxIterations: request.maxIterations,
      timeout: request.timeout,
      maxRetries: request.maxRetries,
    });
  },
};

export const claudeProvider: RuntimeProvider = {
  name: 'claude',
  agent: claudeAgentRuntime,
  fastModel: claudeFastModelRuntime,
};
