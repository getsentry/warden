import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveAuthoringProvider } from './authoring-provider.js';

const AUTHORING_PROVIDER_ENV = 'WARDEN_SKILL_AUTHORING_ROOT';

describe('resolveAuthoringProvider', () => {
  const tempDirs: string[] = [];
  const originalAuthoringRoot = process.env[AUTHORING_PROVIDER_ENV];

  afterEach(() => {
    if (originalAuthoringRoot === undefined) {
      Reflect.deleteProperty(process.env, AUTHORING_PROVIDER_ENV);
    } else {
      process.env[AUTHORING_PROVIDER_ENV] = originalAuthoringRoot;
    }

    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('uses the vendored skill-writer by default', () => {
    const provider = resolveAuthoringProvider();

    expect(provider.name).toBe('skill-writer');
    expect(provider.rootDir).toContain('src/internal-skills/skill-writer');
    expect(provider.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('supports an explicit internal provider override', () => {
    const providerRoot = mkdtempSync(join(tmpdir(), 'warden-authoring-provider-override-'));
    tempDirs.push(providerRoot);

    mkdirSync(join(providerRoot, 'references'));
    writeFileSync(join(providerRoot, 'SKILL.md'), [
      '---',
      'name: custom-authoring-provider',
      'description: Writes generated skills for tests.',
      '---',
      '',
      '# Custom Authoring Provider',
    ].join('\n'));
    writeFileSync(join(providerRoot, 'references', 'guide.md'), '# Guide\n');
    process.env[AUTHORING_PROVIDER_ENV] = providerRoot;

    const provider = resolveAuthoringProvider();

    expect(provider.name).toBe('custom-authoring-provider');
    expect(provider.rootDir).toBe(providerRoot);
    expect(provider.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('supports a caller-provided internal provider override', () => {
    const providerRoot = mkdtempSync(join(tmpdir(), 'warden-authoring-provider-arg-'));
    tempDirs.push(providerRoot);

    writeFileSync(join(providerRoot, 'SKILL.md'), [
      '---',
      'name: arg-authoring-provider',
      'description: Writes generated skills for tests.',
      '---',
      '',
      '# Argument Authoring Provider',
    ].join('\n'));

    const provider = resolveAuthoringProvider({ authoringSkillRoot: providerRoot });

    expect(provider.name).toBe('arg-authoring-provider');
    expect(provider.rootDir).toBe(providerRoot);
  });
});
