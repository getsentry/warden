import { realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import {
  createFindToolDefinition,
  createGrepToolDefinition,
  createLsToolDefinition,
  createReadToolDefinition,
  defineTool,
  type ToolDefinition,
} from '@earendil-works/pi-coding-agent';
import type { TSchema } from '@earendil-works/pi-ai';

const CHECKOUT_GUIDANCE = 'Stay inside the current checkout. Use repository-relative paths.';

interface FileToolInput {
  path?: unknown;
}

function isMissingPathError(error: unknown): boolean {
  return error instanceof Error
    && 'code' in error
    && (error.code === 'ENOENT' || error.code === 'ENOTDIR');
}

function isWithinPath(root: string, target: string): boolean {
  const relativePath = relative(root, target);
  return relativePath === ''
    || (relativePath !== '..'
      && !relativePath.startsWith(`..${sep}`)
      && !isAbsolute(relativePath));
}

async function resolveThroughExistingAncestor(target: string): Promise<string> {
  let candidate = target;
  const missingSegments: string[] = [];

  while (true) {
    try {
      const existingPath = await realpath(candidate);
      return resolve(existingPath, ...missingSegments.reverse());
    } catch (error) {
      if (!isMissingPathError(error)) {
        throw error;
      }

      const parent = dirname(candidate);
      if (parent === candidate) {
        throw error;
      }
      missingSegments.push(basename(candidate));
      candidate = parent;
    }
  }
}

function checkoutPathError(requestedPath: string, checkoutPath: string): Error {
  return new Error(
    `Path "${requestedPath}" is outside the checkout at "${checkoutPath}". ${CHECKOUT_GUIDANCE}`,
  );
}

async function assertPathWithinCheckout(checkoutPath: string, requestedPath: string): Promise<void> {
  const checkout = resolve(checkoutPath);
  const target = resolve(checkout, requestedPath);

  if (!isWithinPath(checkout, target)) {
    throw checkoutPathError(requestedPath, checkout);
  }

  const [canonicalCheckout, canonicalTarget] = await Promise.all([
    resolveThroughExistingAncestor(checkout),
    resolveThroughExistingAncestor(target),
  ]);
  if (!isWithinPath(canonicalCheckout, canonicalTarget)) {
    throw checkoutPathError(requestedPath, checkout);
  }
}

function confineTool<TParams extends TSchema, TDetails, TState>(
  tool: ToolDefinition<TParams, TDetails, TState>,
  checkoutPath: string,
): ToolDefinition {
  return defineTool({
    ...tool,
    description: `${tool.description} Paths must stay within the current checkout.`,
    promptGuidelines: [
      ...(tool.promptGuidelines ?? []),
      CHECKOUT_GUIDANCE,
    ],
    async execute(toolCallId, params, signal, onUpdate, context) {
      const input = params as FileToolInput;
      const requestedPath = typeof input.path === 'string' ? input.path : '.';
      await assertPathWithinCheckout(checkoutPath, requestedPath);
      return tool.execute(toolCallId, params, signal, onUpdate, context);
    },
  });
}

/** Create Pi file tools that reject reads and searches outside the current checkout. */
export function createCheckoutFileTools(
  checkoutPath: string,
  toolNames: readonly string[],
): ToolDefinition[] {
  const requestedTools = new Set(toolNames);
  const tools: ToolDefinition[] = [];

  if (requestedTools.has('read')) {
    tools.push(confineTool(createReadToolDefinition(checkoutPath), checkoutPath));
  }
  if (requestedTools.has('grep')) {
    tools.push(confineTool(createGrepToolDefinition(checkoutPath), checkoutPath));
  }
  if (requestedTools.has('find')) {
    tools.push(confineTool(createFindToolDefinition(checkoutPath), checkoutPath));
  }
  if (requestedTools.has('ls')) {
    tools.push(confineTool(createLsToolDefinition(checkoutPath), checkoutPath));
  }

  return tools;
}
