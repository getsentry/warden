import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import { createCheckoutFileTools } from './pi-file-tools.js';
import { resolveSkillAsync } from '../../skills/loader.js';
import { buildHunkSystemPrompt } from '../prompt.js';

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

  it('reads the built-in references advertised when analyzing a separate checkout', async () => {
    const skill = await resolveSkillAsync('security-review', checkoutPath);
    const reference = join(skill.rootDir!, 'references', 'python.md');
    expect(buildHunkSystemPrompt(skill)).toContain(skill.rootDir);
    const [read] = createCheckoutFileTools(checkoutPath, ['read'], skill.rootDir);

    const result = await read!.execute('reference', { path: reference }, undefined, undefined, undefined as never);

    expect(result.content).toEqual([
      expect.objectContaining({ type: 'text', text: expect.stringContaining('Python') }),
    ]);
  });

  it('allows external skill resources without granting access to sibling files or searches', async () => {
    const skillRoot = join(testRoot, 'external-skill');
    await mkdir(join(skillRoot, 'references'), { recursive: true });
    await writeFile(join(skillRoot, 'references', 'guide.md'), 'Trace the effective authorization guard.');
    await writeFile(join(skillRoot, 'private.txt'), 'not a skill resource');
    const tools = createCheckoutFileTools(checkoutPath, ['read', 'grep'], skillRoot);
    const read = tools.find((tool) => tool.name === 'read')!;
    const grep = tools.find((tool) => tool.name === 'grep')!;

    await expect(read.execute('read', { path: join(skillRoot, 'references', 'guide.md') }, undefined, undefined, undefined as never)).resolves.toBeDefined();
    await expect(read.execute('private', { path: join(skillRoot, 'private.txt') }, undefined, undefined, undefined as never)).rejects.toThrow('outside');
    await expect(grep.execute('search', { path: skillRoot, pattern: 'guard' }, undefined, undefined, undefined as never)).rejects.toThrow('outside');

    const linkedSkill = join(checkoutPath, 'linked-skill');
    await symlink(skillRoot, linkedSkill);
    const [linkedRead] = createCheckoutFileTools(checkoutPath, ['read'], linkedSkill);
    await expect(linkedRead!.execute('linked-resource', { path: join(linkedSkill, 'references', 'guide.md') }, undefined, undefined, undefined as never)).resolves.toBeDefined();
  });

  it('keeps checkout reads available through local skill reference symlinks', async () => {
    const skillRoot = join(checkoutPath, '.agents', 'skills', 'local-review');
    const reference = join(skillRoot, 'references', 'example.ts');
    await mkdir(join(skillRoot, 'references'), { recursive: true });
    await symlink(join(checkoutPath, 'src', 'index.ts'), reference);
    const [read] = createCheckoutFileTools(checkoutPath, ['read'], skillRoot);

    const result = await read!.execute('reference', { path: reference }, undefined, undefined, undefined as never);

    expect(result.content).toEqual([
      expect.objectContaining({ type: 'text', text: expect.stringContaining('export const answer = 42;') }),
    ]);
  });

  it('rejects resource files and resource directories that symlink outside the skill', async () => {
    const skillRoot = join(testRoot, 'external-skill');
    const outside = join(testRoot, 'outside');
    await mkdir(join(skillRoot, 'references'), { recursive: true });
    await mkdir(outside);
    await writeFile(join(outside, 'private.txt'), 'outside');
    await symlink(join(outside, 'private.txt'), join(skillRoot, 'references', 'linked.md'));
    await symlink(outside, join(skillRoot, 'assets'));
    const [read] = createCheckoutFileTools(checkoutPath, ['read'], skillRoot);

    for (const path of [join(skillRoot, 'references', 'linked.md'), join(skillRoot, 'assets', 'private.txt')]) {
      await expect(read!.execute('escape', { path }, undefined, undefined, undefined as never)).rejects.toThrow('outside');
    }
  });

  it('rejects searches from the filesystem root with checkout guidance', async () => {
    await expect(executeTool('grep', {
      pattern: 'BillingService',
      path: '/',
    })).rejects.toThrow(
      `Path "/" is outside the checkout at "${checkoutPath}". Stay inside the current checkout. Use repository-relative paths.`,
    );
  });

  it.each(['@/', '~/', 'file:///'])(
    'prevents Pi from reinterpreting %s outside the checkout',
    async (path) => {
      await expect(executeTool('ls', { path }))
        .rejects.toThrow(checkoutPath);
    },
  );

  it('rejects symlinks that resolve outside the checkout', async () => {
    const outsidePath = join(testRoot, 'outside.ts');
    await writeFile(outsidePath, 'export const secret = true;\n');
    await symlink(outsidePath, join(checkoutPath, 'linked.ts'));

    await expect(executeTool('read', { path: 'linked.ts' }))
      .rejects.toThrow('is outside the checkout');
  });
});
