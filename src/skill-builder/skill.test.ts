import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Runtime, SkillRunRequest, SkillRunResponse } from '../sdk/runtimes/index.js';
import { buildGeneratedSkill } from './skill.js';
import { resolveAuthoringProvider } from './authoring-provider.js';
import {
  getBuildStatePath,
  readSkillBuildState,
  SKILL_BUILD_STATE_KIND,
  SKILL_BUILD_STATE_SCHEMA_VERSION,
  writeSkillBuildState,
} from './outline-state.js';
import { outlineHash, type SkillBuildOutline, type SkillBuildSource } from './outline-contract.js';

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

function inlineSkillMd(name = 'wrdn-security'): string {
  return `---
name: ${name}
description: Use when asked to review code for exploitable security issues.
allowed-tools: Read Grep Glob Bash
---

Review changed hunks for exploitable security issues.
`;
}

function skillMdWithoutFrontmatter(): string {
  return `# Security Review

Review changed hunks for exploitable security issues.
`;
}

function skillMdWithAuthoringDescription(name = 'wrdn-security'): string {
  return `---
name: ${name}
description: "Generated wrdn-security skill with reference-backed-expert architecture: SKILL.md router and focused references."
allowed-tools: Read Grep Glob Bash
---

Review changed hunks for exploitable security issues.
`;
}

function skillMdWithDescription(description: string, name = 'wrdn-security'): string {
  return `---
name: ${name}
description: ${JSON.stringify(description)}
allowed-tools: Read Grep Glob Bash
---

Review changed hunks for exploitable security issues.
`;
}

function indexedSkillMd(name = 'wrdn-security'): string {
  return `---
name: ${name}
description: Use when asked to review code for exploitable security issues.
allowed-tools: Read Grep Glob Bash
---

Review changed hunks for exploitable security issues.

## References

Read \`references/checklist.md\` first. It routes to the detailed reference files.
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
    expect(planPrompt).toContain('Choose the simplest adequate layout using the authoring skill\'s rules');
    expect(planPrompt).toContain('Tracks/tasks are planning work lanes, not filesystem taxonomy');
    expect(planPrompt).toContain('Do not create `references/tracks/`');
    expect(planPrompt).toContain('Do not include Output Format, Output Contract, Response Format, or custom reporting schema sections');
    expect(planPrompt).toContain('Decide the minimum workflow path and simplest adequate artifact layout');

    const implementationPrompt = runSkill.mock.calls[1]![0].userPrompt;
    expect(implementationPrompt).toContain('Add references/ only for routed runtime lookup leaves');
    expect(implementationPrompt).toContain('Keep SKILL.md compact; put optional depth in routed references');
    expect(implementationPrompt).toContain('Prefer no SOURCES.md over a SOURCES.md that says the skill came from the internal outline');

    const validationPrompt = runSkill.mock.calls[2]![0].userPrompt;
    expect(validationPrompt).toContain('Check for over-broad topic-bucket references, stale gap/provenance language, generated-skill metadata, missing routes');
    expect(validationPrompt).toContain('Treat rough validation issues as advisory signals');

    const state = readSkillBuildState(getBuildStatePath(rootDir));
    expect(state?.artifact?.version).toBe(4);
    expect(state?.artifact?.authoringProvider.rootDir).toBe(authoringSkillRoot);
    expect(state?.artifact?.fileManifest.map((file) => file.path).sort()).toEqual([
      'SKILL.md',
      'references/security.md',
    ].sort());
  });

  it('runs sequential track contributions without turning tracks into directories', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-skill-build-'));
    tempDirs.push(tempDir);
    const rootDir = join(tempDir, '.warden', 'skills', 'wrdn-security');
    const authoringSkillRoot = createAuthoringSkillRoot(tempDir);
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), source().files[0]!.content, 'utf-8');
    const buildOutline = outline();
    buildOutline.tracks = [
      buildOutline.tracks[0]!,
      {
        id: 'authentication',
        title: 'Authentication review',
        goal: 'Find authentication bypass issues.',
        rationale: 'Authentication-sensitive changes need a separate work lane.',
        sourceSignals: ['login and session prompts'],
        owns: ['authentication bypass'],
        excludes: ['generic injection'],
        relevanceSignals: ['login or session changes'],
        evidenceFocus: ['changed-line authentication decision'],
        checks: ['trace identity checks'],
        safeCounterpatterns: ['centralized auth middleware still enforced'],
        falsePositiveTraps: ['confusing authorization with authentication'],
        researchHints: [],
      },
    ];
    writeInitialState(rootDir, buildOutline);

    const runSkill = vi.fn<Runtime['runSkill']>(async (request: SkillRunRequest): Promise<SkillRunResponse> => {
      if (request.skillName.endsWith(':authoring-plan')) {
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              summary: 'Plan sequential work lanes.',
              workflow: ['Read the authoring skill', 'Create a baseline router', 'Add each work lane'],
              researchPlan: ['Use prompt and track boundaries'],
              artifactPlan: ['Use focused references only where needed'],
              validationPlan: ['Run rough validation'],
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
              files: [{ path: 'SKILL.md', content: inlineSkillMd() }],
              summary: 'Created baseline skill.',
              validationNotes: [],
              missingInputs: [],
              externalSources: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      if (request.skillName.endsWith(':authoring-track-security')) {
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              files: [{
                path: 'references/tracks/security.md',
                content: '# Security Review\n\nTrace attacker-controlled input before reporting.\n',
              }],
              summary: 'Added security checks.',
              validationNotes: [],
              missingInputs: [],
              externalSources: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      if (request.skillName.endsWith(':authoring-track-authentication')) {
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              files: [
                {
                  path: 'SKILL.md',
                  content: `${inlineSkillMd()}
## References

Read \`references/tracks/security.md\` for general exploitability checks.
Read \`references/tracks/authentication.md\` for login and session changes.
`,
                },
                {
                  path: 'references/tracks/authentication.md',
                  content: '# Authentication Review\n\nTrace identity checks and session state before reporting.\n',
                },
              ],
              summary: 'Added authentication guidance.',
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
            summary: 'Validated.',
            issues: [],
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

    expect(runSkill.mock.calls.map((call) => call[0].skillName)).toEqual([
      'wrdn-security:authoring-plan',
      'wrdn-security:authoring-implementation',
      'wrdn-security:authoring-track-security',
      'wrdn-security:authoring-track-authentication',
      'wrdn-security:authoring-validation',
    ]);
    expect(existsSync(join(rootDir, 'references', 'tracks'))).toBe(false);
    expect(existsSync(join(rootDir, 'references', 'security.md'))).toBe(true);
    expect(existsSync(join(rootDir, 'references', 'authentication.md'))).toBe(true);
    const writtenSkill = readFileSync(join(rootDir, 'SKILL.md'), 'utf-8');
    expect(writtenSkill).toContain('references/security.md');
    expect(writtenSkill).toContain('references/authentication.md');
    expect(writtenSkill).not.toContain('references/tracks/');

    const trackPrompt = runSkill.mock.calls[2]![0].userPrompt;
    expect(trackPrompt).toContain('Treat the assigned track as a work lane');
    expect(trackPrompt).toContain('It may map to one reference, multiple references, a shared reference, or no new file');
  });

  it('reuses valid existing artifacts when artifact metadata is missing or legacy', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-skill-build-'));
    tempDirs.push(tempDir);
    const rootDir = join(tempDir, 'skills', 'wrdn-security');
    const authoringSkillRoot = createAuthoringSkillRoot(tempDir);
    mkdirSync(join(rootDir, 'references'), { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), source().files[0]!.content, 'utf-8');
    writeFileSync(join(rootDir, 'SKILL.md'), indexedSkillMd(), 'utf-8');
    writeFileSync(
      join(rootDir, 'references', 'checklist.md'),
      '# Checklist\n\n| When | Read |\n|------|------|\n| Security-sensitive hunk | `references/security.md` |\n',
      'utf-8',
    );
    writeFileSync(
      join(rootDir, 'references', 'security.md'),
      '# Security Reference\n\nUse this when the hunk touches authentication or user-controlled input.\n',
      'utf-8',
    );
    const buildOutline = outline();
    writeInitialState(rootDir, buildOutline);
    const runSkill = vi.fn<Runtime['runSkill']>();

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
    });

    expect(artifact.source).toBe('cache');
    expect(artifact.name).toBe('wrdn-security');
    expect(artifact.bytes).toBeGreaterThan(0);
    expect(runSkill).not.toHaveBeenCalled();
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

  it('ignores empty placeholder files returned by validation', async () => {
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
            summary: 'The generated skill is valid; no revised files are needed.',
            issues: [],
            files: [
              { path: 'SKILL.md', content: '' },
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

    expect(readFileSync(join(rootDir, 'SKILL.md'), 'utf-8')).toContain(
      'Review changed hunks for exploitable security issues.',
    );
    expect(readFileSync(join(rootDir, 'SKILL.md'), 'utf-8').trim()).not.toBe('');
  });

  it('applies validation revisions while ignoring empty placeholder files', async () => {
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
            issues: [],
            files: [
              { path: 'SKILL.md', content: revisedSkill },
              { path: 'references/placeholder.md', content: '' },
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
    expect(existsSync(join(rootDir, 'references', 'placeholder.md'))).toBe(false);
  });

  it('merges and backfills partial replacement file maps returned by validation', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-skill-build-'));
    tempDirs.push(tempDir);
    const rootDir = join(tempDir, '.warden', 'skills', 'wrdn-security');
    const authoringSkillRoot = createAuthoringSkillRoot(tempDir);
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), source().files[0]!.content, 'utf-8');
    const buildOutline = outline();
    writeInitialState(rootDir, buildOutline);

    const incompleteSkill = `---
name: wrdn-security
description: Use when asked to review code for exploitable security issues.
---

Read \`references/missing.md\` before reporting.
`;
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
            summary: 'The generated skill is valid; revised files are included.',
            issues: [],
            files: [{ path: 'SKILL.md', content: incompleteSkill }],
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

    const writtenSkill = readFileSync(join(rootDir, 'SKILL.md'), 'utf-8');
    expect(writtenSkill).toContain('references/missing.md');
    expect(existsSync(join(rootDir, 'references', 'security.md'))).toBe(true);
    expect(existsSync(join(rootDir, 'references', 'missing.md'))).toBe(true);
  });

  it('writes generated artifacts when frontmatter is missing and references are not routed', async () => {
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
              artifactPlan: ['Create SKILL.md and references'],
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
                { path: 'SKILL.md', content: skillMdWithoutFrontmatter() },
                {
                  path: 'references/security.md',
                  content: '# Security Reference\n\nUse this when the hunk touches authentication or user-controlled input.\n',
                },
              ],
              summary: 'Review code for exploitable security issues.',
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
            summary: 'Validated.',
            issues: [],
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

    expect(readFileSync(join(rootDir, 'SKILL.md'), 'utf-8')).toMatch(/^---\nname: wrdn-security\n/);
    expect(existsSync(join(rootDir, 'references', 'security.md'))).toBe(true);
    const state = readSkillBuildState(getBuildStatePath(rootDir));
    expect(state?.artifact?.deterministicWarnings).toContain(
      'warning: SKILL.md does not route runtime reference references/security.md',
    );
  });

  it('repairs generated frontmatter descriptions that contain authoring metadata', async () => {
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
              files: [{ path: 'SKILL.md', content: skillMdWithAuthoringDescription() }],
              summary: 'Generated wrdn-security skill with reference-backed-expert architecture.',
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
            summary: 'Validated.',
            issues: [],
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

    const writtenSkill = readFileSync(join(rootDir, 'SKILL.md'), 'utf-8');
    expect(writtenSkill).toMatch(
      /^---\nname: wrdn-security\ndescription: Use when reviewing code changes for security concerns\.\nallowed-tools: Read Grep Glob Bash\n---/,
    );
  });

  it('omits generated metadata artifacts and strips output contract sections', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-skill-build-'));
    tempDirs.push(tempDir);
    const rootDir = join(tempDir, '.warden', 'skills', 'wrdn-security');
    const authoringSkillRoot = createAuthoringSkillRoot(tempDir);
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), source().files[0]!.content, 'utf-8');
    const buildOutline = outline();
    writeInitialState(rootDir, buildOutline);

    const skillWithOutputContract = `${inlineSkillMd()}
## Output Format

Use Warden's JSON finding schema.

See \`SPEC.md\` for maintenance details.
`;
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
                { path: 'SKILL.md', content: skillWithOutputContract },
                {
                  path: 'SOURCES.md',
                  content: '# Sources\n\n## Authoring Decisions\n\nGenerated from the internal outline and build pipeline.\n',
                },
                {
                  path: 'SPEC.md',
                  content: '# Spec\n\n## Output Contract\n\nUse Warden report fields.\n',
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
            summary: 'Validated.',
            issues: [],
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

    const writtenSkill = readFileSync(join(rootDir, 'SKILL.md'), 'utf-8');
    expect(writtenSkill).not.toContain('Output Format');
    expect(writtenSkill).not.toContain('JSON finding schema');
    expect(writtenSkill).not.toContain('SPEC.md');
    expect(existsSync(join(rootDir, 'SOURCES.md'))).toBe(false);
    expect(existsSync(join(rootDir, 'SPEC.md'))).toBe(false);
  });

  it('backfills routed references before stripping output contract sections', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-skill-build-'));
    tempDirs.push(tempDir);
    const rootDir = join(tempDir, '.warden', 'skills', 'wrdn-security');
    const authoringSkillRoot = createAuthoringSkillRoot(tempDir);
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), source().files[0]!.content, 'utf-8');
    const buildOutline = outline();
    writeInitialState(rootDir, buildOutline);

    const skillWithStrippedRoute = `${inlineSkillMd()}
## Output Format

Read \`references/output-format.md\` before changing output behavior.
`;
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
              files: [{ path: 'SKILL.md', content: skillWithStrippedRoute }],
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
            summary: 'Validated.',
            issues: [],
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

    expect(readFileSync(join(rootDir, 'SKILL.md'), 'utf-8')).not.toContain('Output Format');
    expect(existsSync(join(rootDir, 'references', 'output-format.md'))).toBe(true);
  });

  it('preserves legitimate runtime descriptions that mention generated code', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-skill-build-'));
    tempDirs.push(tempDir);
    const rootDir = join(tempDir, '.warden', 'skills', 'wrdn-security');
    const authoringSkillRoot = createAuthoringSkillRoot(tempDir);
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), source().files[0]!.content, 'utf-8');
    const buildOutline = outline();
    writeInitialState(rootDir, buildOutline);
    const description = 'Use when reviewing generated configuration files for security issues.';

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
              files: [{ path: 'SKILL.md', content: skillMdWithDescription(description) }],
              summary: 'Generated configuration review.',
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
            summary: 'Validated.',
            issues: [],
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

    expect(readFileSync(join(rootDir, 'SKILL.md'), 'utf-8')).toContain(
      `description: ${JSON.stringify(description)}`,
    );
  });

  it('backfills routed reference files missing from the generated file map', async () => {
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
              artifactPlan: ['Create SKILL.md and one routed reference'],
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
            summary: 'Provider saw the original file map as incomplete.',
            issues: [{
              severity: 'error',
              path: 'generated_file_map',
              message: 'Files array only contains SKILL.md but SKILL.md routes reference files that are not included.',
            }, {
              severity: 'error',
              path: 'references/',
              message: 'Missing all reference files that SKILL.md routes to.',
            }],
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

    const reference = readFileSync(join(rootDir, 'references', 'security.md'), 'utf-8');
    expect(reference).toContain('# Security review');
    expect(reference).toContain('trace data flow');
    expect(reference).toContain('changed-line evidence');
    const state = readSkillBuildState(getBuildStatePath(rootDir));
    expect(state?.artifact?.fileManifest.some((file) => file.path === 'references/security.md'))
      .toBe(true);
    expect(state?.artifact?.validationIssues).toEqual([{
      severity: 'warning',
      path: 'generated_file_map',
      message: 'Files array only contains SKILL.md but SKILL.md routes reference files that are not included.',
    }, {
      severity: 'warning',
      path: 'references/',
      message: 'Missing all reference files that SKILL.md routes to.',
    }]);
  });

  it('does not rewrite routed reference content based on filename heuristics', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-skill-build-'));
    tempDirs.push(tempDir);
    const rootDir = join(tempDir, '.warden', 'skills', 'wrdn-security');
    const authoringSkillRoot = createAuthoringSkillRoot(tempDir);
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), source().files[0]!.content, 'utf-8');
    const buildOutline = outline();
    writeInitialState(rootDir, buildOutline);

    const skill = `---
name: wrdn-security
description: Use when asked to review code for exploitable security issues.
---

Read \`references/authentication.md\` when reviewing login, session, or JWT changes.
`;
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
              artifactPlan: ['Create SKILL.md and one routed reference'],
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
                { path: 'SKILL.md', content: skill },
                {
                  path: 'references/authentication.md',
                  content: '# SQL Injection\n\nTrace database query construction and shell command execution.\n',
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
            summary: 'Validated.',
            issues: [],
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

    const reference = readFileSync(join(rootDir, 'references', 'authentication.md'), 'utf-8');
    expect(reference).toContain('# SQL Injection');
    const state = readSkillBuildState(getBuildStatePath(rootDir));
    expect(state?.artifact?.deterministicWarnings).toEqual([]);
  });

  it('backfills files routed by a generated reference index', async () => {
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
              artifactPlan: ['Create SKILL.md and a routed checklist'],
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
                { path: 'SKILL.md', content: indexedSkillMd() },
                {
                  path: 'references/checklist.md',
                  content: '# Checklist\n\n| When | Read |\n|------|------|\n| Security-sensitive hunk | `references/security.md` |\n',
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
            summary: 'Validated.',
            issues: [],
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

    expect(existsSync(join(rootDir, 'references', 'checklist.md'))).toBe(true);
    const nestedReference = readFileSync(join(rootDir, 'references', 'security.md'), 'utf-8');
    expect(nestedReference).toContain('# Security review');
    expect(nestedReference).toContain('pattern-only claims');
  });

  it('backfills cached artifacts with missing routed reference files', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-skill-build-'));
    tempDirs.push(tempDir);
    const rootDir = join(tempDir, '.warden', 'skills', 'wrdn-security');
    const authoringSkillRoot = createAuthoringSkillRoot(tempDir);
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), source().files[0]!.content, 'utf-8');
    const cachedSkill = skillMd();
    writeFileSync(join(rootDir, 'SKILL.md'), cachedSkill, 'utf-8');
    const buildOutline = outline();
    const cachedBytes = Buffer.byteLength(cachedSkill, 'utf-8');
    writeSkillBuildState(getBuildStatePath(rootDir), {
      version: SKILL_BUILD_STATE_SCHEMA_VERSION,
      kind: SKILL_BUILD_STATE_KIND,
      identity: {},
      outline: buildOutline,
      artifact: {
        version: 4,
        sourceHash: source().hash,
        outlineHash: outlineHash(buildOutline),
        buildVersion: buildOutline.buildVersion,
        authoringProvider: resolveAuthoringProvider({ authoringSkillRoot }),
        name: 'wrdn-security',
        fileManifest: [{ path: 'SKILL.md', bytes: cachedBytes }],
        deterministicWarnings: [],
        validationIssues: [],
        bytes: cachedBytes,
        durationMs: 10,
        usage: usage(),
        externalSources: [],
        missingInputs: [],
        generatedAt: '2026-05-01T00:00:00.000Z',
      },
      updatedAt: '2026-05-01T00:00:00.000Z',
    });

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
              artifactPlan: ['Create SKILL.md and one routed reference'],
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
            summary: 'Validated.',
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
    });

    expect(artifact.source).toBe('cache');
    expect(runSkill).not.toHaveBeenCalled();
    expect(existsSync(join(rootDir, 'references', 'security.md'))).toBe(true);
  });

  it('writes generated artifacts when provider validation reports reference navigation errors', async () => {
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
              artifactPlan: ['Create SKILL.md and one routed reference'],
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
            valid: false,
            summary: 'The generated skill has non-blocking warnings.',
            issues: [{
              severity: 'error',
              path: 'references/security.md',
              message: 'Reference is 140 lines without ## Contents section for navigation.',
            }],
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

    expect(artifact.source).toBe('generated');
    expect(existsSync(join(rootDir, 'references', 'security.md'))).toBe(true);
    const state = readSkillBuildState(getBuildStatePath(rootDir));
    expect(state?.artifact?.validationIssues).toEqual([{
      severity: 'warning',
      path: 'references/security.md',
      message: 'Reference is 140 lines without ## Contents section for navigation.',
    }]);
  });

  it('records provider validation errors without blocking valid generated artifacts', async () => {
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
              files: [{ path: 'SKILL.md', content: inlineSkillMd() }],
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

    expect(artifact.source).toBe('generated');
    expect(existsSync(join(rootDir, 'SKILL.md'))).toBe(true);
    const state = readSkillBuildState(getBuildStatePath(rootDir));
    expect(state?.artifact?.validationIssues).toEqual([{
      severity: 'warning',
      path: 'SKILL.md',
      message: 'Runtime instructions are too shallow.',
    }]);
  });
});
