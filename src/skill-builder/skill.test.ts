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
    expect(planPrompt).toContain('Broad or multi-track skills usually need SKILL.md as a compact router plus focused routed references');
    expect(planPrompt).toContain('Do not create a custom plaintext output format');
    expect(planPrompt).toContain('Decide the minimum workflow path and simplest adequate artifact layout');

    const implementationPrompt = runSkill.mock.calls[1]![0].userPrompt;
    expect(implementationPrompt).toContain('Add SPEC.md, SOURCES.md, EVAL.md, references/, scripts/, or assets/ only when they add runtime, provenance, maintenance, validation, or reusable-example value');
    expect(implementationPrompt).toContain('Keep SKILL.md compact; put optional depth in routed references');

    const validationPrompt = runSkill.mock.calls[2]![0].userPrompt;
    expect(validationPrompt).toContain('Check for over-broad topic-bucket references, stale gap/provenance language, missing routes, and custom output formats');

    const state = readSkillBuildState(getBuildStatePath(rootDir));
    expect(state?.artifact?.version).toBe(4);
    expect(state?.artifact?.authoringProvider.rootDir).toBe(authoringSkillRoot);
    expect(state?.artifact?.fileManifest.map((file) => file.path).sort()).toEqual([
      'SKILL.md',
      'SOURCES.md',
      'references/security.md',
    ].sort());
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

  it('ignores incomplete replacement file maps returned by validation', async () => {
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
    expect(writtenSkill).toContain('references/security.md');
    expect(writtenSkill).not.toContain('references/missing.md');
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

    expect(readFileSync(join(rootDir, 'SKILL.md'), 'utf-8')).toMatch(/^---\nname: "wrdn-security"\n/);
    expect(existsSync(join(rootDir, 'references', 'security.md'))).toBe(true);
    const state = readSkillBuildState(getBuildStatePath(rootDir));
    expect(state?.artifact?.deterministicWarnings).toContain(
      'SKILL.md does not route runtime reference references/security.md',
    );
  });

  it('fails when SKILL.md routes reference files missing from the file map', async () => {
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
    })).rejects.toThrow('SKILL.md routes references/security.md but the generated file map does not include it');

    expect(existsSync(join(rootDir, 'SKILL.md'))).toBe(false);
  });

  it('fails when a routed index references missing files', async () => {
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
    })).rejects.toThrow('SKILL.md routes references/security.md but the generated file map does not include it');

    expect(existsSync(join(rootDir, 'SKILL.md'))).toBe(false);
  });

  it('does not reuse cached artifacts with missing routed reference files', async () => {
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

    expect(artifact.source).toBe('generated');
    expect(runSkill).toHaveBeenCalled();
    expect(existsSync(join(rootDir, 'references', 'security.md'))).toBe(true);
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
