import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createGeneratedSkillDefinition, loadGeneratedSkillDefinition } from './definition.js';

describe('loadGeneratedSkillDefinition', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('loads generated skill definitions', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'warden-skill-definition-'));
    tempDirs.push(rootDir);
    writeFileSync(join(rootDir, 'warden.yaml'), `version: 1
kind: generated-skill
name: security
prompt: |-
  Find security issues.
`, 'utf-8');

    const definition = loadGeneratedSkillDefinition(rootDir);

    expect(definition.data.kind).toBe('generated-skill');
    expect(definition.data.name).toBe('security');
    expect(definition.data.prompt).toBe('Find security issues.');
  });

  it('creates generated skill definitions at an explicit root path', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'warden-skill-definition-'));
    tempDirs.push(repoRoot);
    const rootDir = join(repoRoot, 'skills', 'security');

    const skill = createGeneratedSkillDefinition({
      repoRoot,
      name: 'security',
      prompt: 'Find security issues.',
      rootDir,
    });

    expect(skill.rootDir).toBe(rootDir);
    const definition = loadGeneratedSkillDefinition(rootDir);
    expect(definition.data.name).toBe('security');
    expect(definition.data.prompt).toBe('Find security issues.');
  });
});
