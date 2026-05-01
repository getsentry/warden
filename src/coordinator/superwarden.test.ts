import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSuperwardenSkill } from './superwarden.js';

describe('createSuperwardenSkill', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-superwarden-skill-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes a concise one-line description without trigger boilerplate', () => {
    const skill = createSuperwardenSkill({
      repoRoot: tempDir,
      name: 'notmythos',
      initialPrompt: 'Identify critical vulnerabilities in the codebase, focusing on the technology stack and runtime that we use.',
    });

    expect(skill.description).toBe('Identify critical vulnerabilities in the codebase.');
    expect(skill.description).not.toContain('Use when asked');
    expect(readFileSync(join(skill.rootDir!, 'SKILL.md'), 'utf-8')).toContain(
      'description: "Identify critical vulnerabilities in the codebase."',
    );
  });
});
