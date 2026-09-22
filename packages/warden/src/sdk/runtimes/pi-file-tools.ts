import { realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createFindToolDefinition,
  createGrepToolDefinition,
  createLsToolDefinition,
  createReadToolDefinition,
  defineTool,
  type ToolDefinition,
} from '@earendil-works/pi-coding-agent';
import type { TSchema } from '@earendil-works/pi-ai';
import { SKILL_RESOURCE_DIRECTORIES } from '../../skills/resources.js';

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

async function resolveAllowedPath(checkoutPath: string, requestedPath: string, skillRoot?: string): Promise<string> {
  const checkout = resolve(checkoutPath);
  const target = resolve(checkout, requestedPath);

  const resourceRoot = skillRoot ? SKILL_RESOURCE_DIRECTORIES
    .map((dir) => resolve(skillRoot, dir))
    .find((root) => isWithinPath(root, target)) : undefined;
  const withinCheckout = isWithinPath(checkout, target);
  if (!withinCheckout && !resourceRoot) {
    throw checkoutPathError(requestedPath, checkout);
  }

  const [canonicalRoot, canonicalTarget] = await Promise.all([
    resolveThroughExistingAncestor(resourceRoot && skillRoot ? skillRoot : checkout),
    resolveThroughExistingAncestor(target),
  ]);
  // Anchor resources to the skill itself: a symlinked resource directory must
  // not grant access to unrelated files outside the resolved skill.
  const allowedRoot = resourceRoot && skillRoot
    ? resolve(canonicalRoot, relative(resolve(skillRoot), resourceRoot))
    : canonicalRoot;
  if (!isWithinPath(allowedRoot, canonicalTarget)) {
    throw checkoutPathError(requestedPath, checkout);
  }

  return canonicalTarget;
}

function confineTool<TParams extends TSchema, TDetails, TState>(
  tool: ToolDefinition<TParams, TDetails, TState>,
  checkoutPath: string,
  skillRoot?: string,
): ToolDefinition {
  const guidance = skillRoot
    ? `${CHECKOUT_GUIDANCE} Read may also access scripts/, references/, and assets/ under the resolved skill at ${skillRoot}.`
    : CHECKOUT_GUIDANCE;
  return defineTool({
    ...tool,
    description: `${tool.description} ${guidance}`,
    promptGuidelines: [
      ...(tool.promptGuidelines ?? []),
      guidance,
    ],
    async execute(toolCallId, params, signal, onUpdate, context) {
      const input = params as FileToolInput;
      const requestedPath = typeof input.path === 'string' ? input.path : '.';
      const confinedPath = await resolveAllowedPath(checkoutPath, requestedPath, skillRoot);
      const confinedParams = {
        ...params,
        path: pathToFileURL(confinedPath).href,
      } as typeof params;
      return tool.execute(toolCallId, confinedParams, signal, onUpdate, context);
    },
  });
}

/** Confine Pi tools to the checkout, with read-only access to resolved skill resources. */
export function createCheckoutFileTools(
  checkoutPath: string,
  toolNames: readonly string[],
  skillRoot?: string,
): ToolDefinition[] {
  const requestedTools = new Set(toolNames);
  const tools: ToolDefinition[] = [];

  if (requestedTools.has('read')) {
    tools.push(confineTool(createReadToolDefinition(checkoutPath), checkoutPath, skillRoot));
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
