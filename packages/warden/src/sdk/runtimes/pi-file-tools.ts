import { createHash } from 'node:crypto';
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

  const [canonicalCheckout, canonicalTarget] = await Promise.all([
    resolveThroughExistingAncestor(checkout),
    resolveThroughExistingAncestor(target),
  ]);
  if (withinCheckout && isWithinPath(canonicalCheckout, canonicalTarget)) {
    return canonicalTarget;
  }

  if (resourceRoot && skillRoot) {
    // Anchor the extra access to the skill itself, so resource symlinks cannot
    // grant access to unrelated files outside the checkout.
    const canonicalSkillRoot = await resolveThroughExistingAncestor(skillRoot);
    const allowedRoot = resolve(canonicalSkillRoot, relative(resolve(skillRoot), resourceRoot));
    if (isWithinPath(allowedRoot, canonicalTarget)) {
      return canonicalTarget;
    }
  }

  throw checkoutPathError(requestedPath, checkout);
}

/** One checkout tool call, as the agent sent it, and a hash of what it returned. */
export interface ToolEvidence {
  tool: string;
  params: Record<string, unknown>;
  outputHash: string;
  isError: boolean;
}

/** Hash a tool result. Search and listing output order is not stable, so its lines are sorted first. */
export function hashToolOutput(toolName: string, result: unknown): string {
  const content = (result as { content?: { type?: string; text?: string }[] } | undefined)?.content ?? [];
  const text = content.map((part) => (part.type === 'text' ? part.text ?? '' : `[${part.type}]`)).join('\n');
  const canonical = toolName === 'read' ? text : text.split('\n').sort().join('\n');
  return createHash('sha256').update(canonical).digest('hex');
}

function hashToolError(error: unknown): string {
  return createHash('sha256').update(error instanceof Error ? error.message : String(error)).digest('hex');
}

function confineTool<TParams extends TSchema, TDetails, TState>(
  tool: ToolDefinition<TParams, TDetails, TState>,
  checkoutPath: string,
  skillRoot?: string,
  onEvidence?: (evidence: ToolEvidence) => void,
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
      const record = (outputHash: string, isError: boolean): void => {
        onEvidence?.({ tool: tool.name, params: { ...(params as Record<string, unknown>) }, outputHash, isError });
      };
      try {
        const confinedPath = await resolveAllowedPath(checkoutPath, requestedPath, skillRoot);
        const confinedParams = {
          ...params,
          path: pathToFileURL(confinedPath).href,
        } as typeof params;
        const result = await tool.execute(toolCallId, confinedParams, signal, onUpdate, context);
        record(hashToolOutput(tool.name, result), false);
        return result;
      } catch (error) {
        record(hashToolError(error), true);
        throw error;
      }
    },
  });
}

/** Confine Pi tools to the checkout, with read-only access to resolved skill resources. */
export function createCheckoutFileTools(
  checkoutPath: string,
  toolNames: readonly string[],
  skillRoot?: string,
  onEvidence?: (evidence: ToolEvidence) => void,
): ToolDefinition[] {
  const requestedTools = new Set(toolNames);
  const tools: ToolDefinition[] = [];

  if (requestedTools.has('read')) {
    tools.push(confineTool(createReadToolDefinition(checkoutPath), checkoutPath, skillRoot, onEvidence));
  }
  if (requestedTools.has('grep')) {
    tools.push(confineTool(createGrepToolDefinition(checkoutPath), checkoutPath, undefined, onEvidence));
  }
  if (requestedTools.has('find')) {
    tools.push(confineTool(createFindToolDefinition(checkoutPath), checkoutPath, undefined, onEvidence));
  }
  if (requestedTools.has('ls')) {
    tools.push(confineTool(createLsToolDefinition(checkoutPath), checkoutPath, undefined, onEvidence));
  }

  return tools;
}

/**
 * Re-run recorded tool calls against a checkout and return the calls whose output changed.
 * An empty result means the agent would see the same evidence it saw when the calls were recorded.
 */
export async function changedToolEvidence(
  checkoutPath: string,
  evidence: readonly ToolEvidence[],
  skillRoot?: string,
): Promise<ToolEvidence[]> {
  const tools = new Map(
    createCheckoutFileTools(checkoutPath, [...new Set(evidence.map((entry) => entry.tool))], skillRoot)
      .map((tool) => [tool.name, tool]),
  );
  const changed: ToolEvidence[] = [];
  for (const entry of evidence) {
    const tool = tools.get(entry.tool);
    if (!tool) {
      changed.push(entry);
      continue;
    }
    let outputHash: string;
    let isError = false;
    try {
      const result = await tool.execute('replay', entry.params, undefined, undefined, undefined as never);
      outputHash = hashToolOutput(entry.tool, result);
    } catch (error) {
      isError = true;
      outputHash = hashToolError(error);
    }
    if (outputHash !== entry.outputHash || isError !== entry.isError) {
      changed.push(entry);
    }
  }
  return changed;
}
