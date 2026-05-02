import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Runtime, SkillRunRequest, SkillRunResponse } from '../sdk/runtimes/index.js';
import { buildGeneratedSkill } from './skill.js';
import {
  getBuildStatePath,
  readSkillBuildState,
  SKILL_BUILD_STATE_KIND,
  SKILL_BUILD_STATE_SCHEMA_VERSION,
  writeSkillBuildState,
} from './outline-state.js';
import type { SkillBuildOutline, SkillBuildSource } from './outline-contract.js';

function usage() {
  return { inputTokens: 1, outputTokens: 1, costUSD: 0 };
}

function outline(skill = 'wrdn-security'): SkillBuildOutline {
  return {
    version: 1,
    skill,
    sourceHash: 'source-hash',
    buildVersion: '1',
    scopeProfile: {
      kind: 'domain',
      subject: 'Security review',
      localContextUsed: false,
      observedContext: ['Prompt asks for security review'],
      unresolvedContext: [],
    },
    build: {
      phases: [{ id: 'collect-inputs', status: 'generated' }],
      externalSources: [],
    },
    tracks: [{
      id: 'security',
      title: 'Security review',
      goal: 'Find exploitable security issues.',
      rationale: 'The prompt asks for high-accuracy security review.',
      sourceSignals: ['security prompt'],
      owns: ['security issues'],
      excludes: ['style'],
      relevanceSignals: ['security-sensitive changes'],
      evidenceFocus: ['changed-line evidence'],
      checks: ['trace data flow'],
      safeCounterpatterns: ['validated input'],
      falsePositiveTraps: ['pattern-only claims'],
      researchHints: [],
    }],
  };
}

function source(): SkillBuildSource {
  return {
    hash: 'source-hash',
    files: [{
      path: 'warden.yaml',
      content: `version: 1
kind: generated-skill
name: wrdn-security
prompt: Find exploitable security issues.
`,
    }],
  };
}

function writeInitialState(rootDir: string, buildOutline: SkillBuildOutline): void {
  writeSkillBuildState(getBuildStatePath(rootDir), {
    version: SKILL_BUILD_STATE_SCHEMA_VERSION,
    kind: SKILL_BUILD_STATE_KIND,
    identity: {},
    outline: buildOutline,
    updatedAt: '2026-05-01T00:00:00.000Z',
  });
}

function createAuthoringSkillRoot(tempDir: string): string {
  const root = join(tempDir, 'skill-writer');
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, 'SKILL.md'), `---
name: skill-writer
description: Writes skills.
---

# Skill Writer

Use this authoring skill to create skill artifacts.
`, 'utf-8');
  return root;
}

function skillMd(name = 'wrdn-security'): string {
  return `---
name: ${name}
description: Use when asked to review code for exploitable security issues.
allowed-tools: Read Grep Glob Bash
---

Review changed hunks for exploitable security issues.

## References

| When | Read |
|------|------|
| The hunk touches authentication or user-controlled input | \`references/security.md\` |

## What to Report

- Concrete exploitable security findings anchored to changed lines.
`;
}

describe('buildGeneratedSkill', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('writes provider-driven file maps without hardcoded template artifacts', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-skill-build-'));
    tempDirs.push(tempDir);
    const rootDir = join(tempDir, '.warden', 'skills', 'wrdn-security');
    const authoringSkillRoot = createAuthoringSkillRoot(tempDir);
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), source().files[0]!.content, 'utf-8');
    const buildOutline = outline();
    writeInitialState(rootDir, buildOutline);

    const runSkill = vi.fn<Runtime['runSkill']>(async (request: SkillRunRequest): Promise<SkillRunResponse> => {
      if (request.skillName.endsWith(':authoring-plan')) {
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              summary: 'Use skill-writer to plan a Warden security skill.',
              workflow: ['Read the authoring skill', 'Choose layout'],
              researchPlan: ['Use prompt and source material'],
              artifactPlan: ['Create SKILL.md and one routed reference'],
              validationPlan: ['Check Warden constraints'],
              risks: [],
              missingInputs: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      if (request.skillName.endsWith(':authoring-implementation')) {
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              name: 'wrdn-security',
              files: [
                { path: 'SKILL.md', content: skillMd() },
                {
                  path: 'references/security.md',
                  content: '# Security Reference\n\nUse this when the hunk touches authentication or user-controlled input.\n',
                },
                {
                  path: 'SOURCES.md',
                  content: '# Sources\n\n- Generated from the prompt and authoring provider.\n',
                },
              ],
              summary: 'Generated a reference-backed skill.',
              validationNotes: ['Self-check passed'],
              missingInputs: [],
              externalSources: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      return {
        result: {
          status: 'success',
          text: JSON.stringify({
            version: 1,
            valid: true,
            summary: 'The generated skill follows the authoring plan.',
            issues: [],
            missingInputs: [],
          }),
          errors: [],
          usage: usage(),
        },
      };
    });

    const artifact = await buildGeneratedSkill({
      outline: buildOutline,
      source: source(),
      rootDir,
      runtime: {
        name: 'claude',
        runSkill,
        runAuxiliary: async () => ({ success: false, error: 'unused', usage: usage() }),
        runSynthesis: async () => ({ success: false, error: 'unused', usage: usage() }),
      },
      repoPath: tempDir,
      authoringSkillRoot,
      regenerate: true,
    });

    expect(artifact.name).toBe('wrdn-security');
    expect(existsSync(join(rootDir, 'SKILL.md'))).toBe(true);
    expect(existsSync(join(rootDir, 'references', 'security.md'))).toBe(true);
    expect(readFileSync(join(rootDir, 'SKILL.md'), 'utf-8')).toContain('references/security.md');

    const planPrompt = runSkill.mock.calls[0]![0].userPrompt;
    expect(planPrompt).toContain(`Use the full authoring skill at \`${authoringSkillRoot}\``);
    expect(planPrompt).toContain('clear review tasks, routing cues, evidence requirements');

    const state = readSkillBuildState(getBuildStatePath(rootDir));
    expect(state?.artifact?.version).toBe(4);
    expect(state?.artifact?.authoringProvider.rootDir).toBe(authoringSkillRoot);
    expect(state?.artifact?.fileManifest.map((file) => file.path).sort()).toEqual([
      'SKILL.md',
      'SOURCES.md',
      'references/security.md',
    ].sort());
  });

  it('lets the validation pass return revised files', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-skill-build-'));
    tempDirs.push(tempDir);
    const rootDir = join(tempDir, '.warden', 'skills', 'wrdn-security');
    const authoringSkillRoot = createAuthoringSkillRoot(tempDir);
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), source().files[0]!.content, 'utf-8');
    const buildOutline = outline();
    writeInitialState(rootDir, buildOutline);

    const revisedSkill = skillMd().replace(
      'Review changed hunks for exploitable security issues.',
      'Review changed hunks for exploitable security issues. Trace before reporting.',
    );
    const runSkill = vi.fn<Runtime['runSkill']>(async (request: SkillRunRequest): Promise<SkillRunResponse> => {
      if (request.skillName.endsWith(':authoring-plan')) {
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              summary: 'Plan.',
              workflow: ['Read the authoring skill'],
              researchPlan: [],
              artifactPlan: ['Create SKILL.md'],
              validationPlan: ['Validate output'],
              risks: [],
              missingInputs: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      if (request.skillName.endsWith(':authoring-implementation')) {
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              name: 'wrdn-security',
              files: [
                { path: 'SKILL.md', content: skillMd() },
                {
                  path: 'references/security.md',
                  content: '# Security Reference\n\nUse this when the hunk touches authentication or user-controlled input.\n',
                },
              ],
              summary: 'Generated.',
              validationNotes: [],
              missingInputs: [],
              externalSources: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      return {
        result: {
          status: 'success',
          text: JSON.stringify({
            version: 1,
            valid: true,
            summary: 'Revised the runtime instruction.',
            issues: [{
              severity: 'warning',
              path: 'SKILL.md',
              message: 'Runtime instruction should be more explicit.',
              suggestedFix: 'Add trace guidance.',
            }],
            files: [
              { path: 'SKILL.md', content: revisedSkill },
              {
                path: 'references/security.md',
                content: '# Security Reference\n\nUse this when the hunk touches authentication or user-controlled input.\n',
              },
            ],
            missingInputs: [],
          }),
          errors: [],
          usage: usage(),
        },
      };
    });

    await buildGeneratedSkill({
      outline: buildOutline,
      source: source(),
      rootDir,
      runtime: {
        name: 'claude',
        runSkill,
        runAuxiliary: async () => ({ success: false, error: 'unused', usage: usage() }),
        runSynthesis: async () => ({ success: false, error: 'unused', usage: usage() }),
      },
      repoPath: tempDir,
      authoringSkillRoot,
      regenerate: true,
    });

    expect(readFileSync(join(rootDir, 'SKILL.md'), 'utf-8')).toContain('Trace before reporting.');
    const state = readSkillBuildState(getBuildStatePath(rootDir));
    expect(state?.artifact?.validationIssues).toEqual([{
      severity: 'warning',
      path: 'SKILL.md',
      message: 'Runtime instruction should be more explicit.',
      suggestedFix: 'Add trace guidance.',
    }]);
  });

  it('fails when provider validation reports unresolved errors', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-skill-build-'));
    tempDirs.push(tempDir);
    const rootDir = join(tempDir, '.warden', 'skills', 'wrdn-security');
    const authoringSkillRoot = createAuthoringSkillRoot(tempDir);
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), source().files[0]!.content, 'utf-8');
    const buildOutline = outline();
    writeInitialState(rootDir, buildOutline);

    const runSkill = vi.fn<Runtime['runSkill']>(async (request: SkillRunRequest): Promise<SkillRunResponse> => {
      if (request.skillName.endsWith(':authoring-plan')) {
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              summary: 'Plan.',
              workflow: ['Read the authoring skill'],
              researchPlan: [],
              artifactPlan: ['Create SKILL.md'],
              validationPlan: ['Validate output'],
              risks: [],
              missingInputs: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      if (request.skillName.endsWith(':authoring-implementation')) {
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              name: 'wrdn-security',
              files: [{ path: 'SKILL.md', content: skillMd() }],
              summary: 'Generated.',
              validationNotes: [],
              missingInputs: [],
              externalSources: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      return {
        result: {
          status: 'success',
          text: JSON.stringify({
            version: 1,
            valid: false,
            summary: 'The skill still has unresolved authoring issues.',
            issues: [{
              severity: 'error',
              path: 'SKILL.md',
              message: 'Runtime instructions are too shallow.',
            }],
            missingInputs: [],
          }),
          errors: [],
          usage: usage(),
        },
      };
    });

    await expect(buildGeneratedSkill({
      outline: buildOutline,
      source: source(),
      rootDir,
      runtime: {
        name: 'claude',
        runSkill,
        runAuxiliary: async () => ({ success: false, error: 'unused', usage: usage() }),
        runSynthesis: async () => ({ success: false, error: 'unused', usage: usage() }),
      },
      repoPath: tempDir,
      authoringSkillRoot,
      regenerate: true,
    })).rejects.toThrow('failed provider validation');

    expect(existsSync(join(rootDir, 'SKILL.md'))).toBe(false);
  });
});
