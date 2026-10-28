import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  clearGeneratedSkillArtifacts,
  createGeneratedSkillDefinition,
  getGeneratedSkillRoot,
  loadGeneratedSkillDefinition,
  readGeneratedSkillArtifactFiles,
  resolveGeneratedSkillRoot,
  resolveGeneratedSkillTarget,
} from './definition.js';

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

  it('resolves existing generated skill roots in conventional order', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'warden-skill-definition-'));
    tempDirs.push(repoRoot);
    const generatedRoot = join(repoRoot, '.warden', 'skills', 'security');
    const agentsRoot = join(repoRoot, '.agents', 'skills', 'security');
    mkdirSync(generatedRoot, { recursive: true });
    mkdirSync(agentsRoot, { recursive: true });
    writeFileSync(join(generatedRoot, 'warden.yaml'), `version: 1
kind: generated-skill
name: security
prompt: |-
  Find security issues.
`, 'utf-8');
    writeFileSync(join(agentsRoot, 'warden.yaml'), `version: 1
kind: generated-skill
name: security
prompt: |-
  Agents copy.
`, 'utf-8');

    expect(resolveGeneratedSkillRoot(repoRoot, 'security')).toBe(generatedRoot);
  });

  it('does not resolve bare names from non-conventional skill roots', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'warden-skill-definition-'));
    tempDirs.push(repoRoot);
    const rootDir = join(repoRoot, 'skills', 'security');
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), `version: 1
kind: generated-skill
name: security
prompt: |-
  Find security issues.
`, 'utf-8');

    expect(resolveGeneratedSkillRoot(repoRoot, 'security')).toBe(getGeneratedSkillRoot(repoRoot, 'security'));
  });

  it('falls back to the default .warden root for new generated skills', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'warden-skill-definition-'));
    tempDirs.push(repoRoot);

    expect(resolveGeneratedSkillRoot(repoRoot, 'security')).toBe(getGeneratedSkillRoot(repoRoot, 'security'));
  });

  it('resolves explicit generated skill path targets without conventional lookup', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'warden-skill-definition-'));
    tempDirs.push(repoRoot);

    expect(resolveGeneratedSkillTarget(repoRoot, './skills/security')).toEqual({
      displayName: './skills/security',
      isPath: true,
      rootDir: join(repoRoot, 'skills', 'security'),
    });
  });

  it('clears generated artifacts without deleting definition or build state', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'warden-skill-definition-'));
    tempDirs.push(rootDir);
    mkdirSync(join(rootDir, 'references'), { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), 'version: 1\nkind: generated-skill\nname: security\nprompt: test\n', 'utf-8');
    writeFileSync(join(rootDir, 'build-state.json'), '{"version":1}\n', 'utf-8');
    writeFileSync(join(rootDir, 'SKILL.md'), 'draft\n', 'utf-8');
    writeFileSync(join(rootDir, 'references', 'security.md'), 'draft\n', 'utf-8');

    clearGeneratedSkillArtifacts(rootDir);

    expect(existsSync(join(rootDir, 'warden.yaml'))).toBe(true);
    expect(existsSync(join(rootDir, 'build-state.json'))).toBe(true);
    expect(existsSync(join(rootDir, 'SKILL.md'))).toBe(false);
    expect(existsSync(join(rootDir, 'references'))).toBe(false);
  });

  it('reads nested artifact files that share metadata filenames', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'warden-skill-definition-'));
    tempDirs.push(rootDir);
    mkdirSync(join(rootDir, 'references'), { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), 'version: 1\nkind: generated-skill\nname: security\nprompt: test\n', 'utf-8');
    writeFileSync(join(rootDir, 'build-state.json'), '{"version":1}\n', 'utf-8');
    writeFileSync(join(rootDir, 'references', 'warden.yaml'), 'nested definition fixture\n', 'utf-8');
    writeFileSync(join(rootDir, 'references', 'build-state.json'), '{"nested":true}\n', 'utf-8');

    expect(readGeneratedSkillArtifactFiles(rootDir).map((file) => file.path)).toEqual([
      'references/build-state.json',
      'references/warden.yaml',
    ]);
  });
});
