import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import { createCheckoutFileTools } from './pi-file-tools.js';

describe('createCheckoutFileTools', () => {
  let testRoot: string;
  let checkoutPath: string;

  beforeEach(async () => {
    testRoot = await mkdtemp(join(tmpdir(), 'warden-pi-file-tools-'));
    checkoutPath = join(testRoot, 'checkout');
    await mkdir(join(checkoutPath, 'src'), { recursive: true });
    await writeFile(join(checkoutPath, 'src', 'index.ts'), 'export const answer = 42;\n');
  });

  afterEach(async () => {
    await rm(testRoot, { recursive: true, force: true });
  });

  function getTool(name: string): ToolDefinition {
    const tool = createCheckoutFileTools(checkoutPath, ['read', 'grep', 'find', 'ls'])
      .find((candidate) => candidate.name === name);
    if (!tool) {
      throw new Error(`Missing ${name} tool`);
    }
    return tool;
  }

  function executeTool(name: string, params: Record<string, unknown>) {
    return getTool(name).execute('tool-1', params, undefined, undefined, undefined as never);
  }

  it('allows repository-relative file access', async () => {
    const read = getTool('read');
    const result = await executeTool('read', { path: 'src/index.ts' });

    expect(result.content).toEqual([
      expect.objectContaining({ type: 'text', text: expect.stringContaining('export const answer = 42;') }),
    ]);
    expect(read.promptGuidelines).toContain(
      'Stay inside the current checkout. Use repository-relative paths.',
    );
  });

  it('rejects searches from the filesystem root with checkout guidance', async () => {
    await expect(executeTool('grep', {
      pattern: 'BillingService',
      path: '/',
    })).rejects.toThrow(
      `Path "/" is outside the checkout at "${checkoutPath}". Stay inside the current checkout. Use repository-relative paths.`,
    );
  });

  it('rejects symlinks that resolve outside the checkout', async () => {
    const outsidePath = join(testRoot, 'outside.ts');
    await writeFile(outsidePath, 'export const secret = true;\n');
    await symlink(outsidePath, join(checkoutPath, 'linked.ts'));

    await expect(executeTool('read', { path: 'linked.ts' }))
      .rejects.toThrow('is outside the checkout');
  });
});
