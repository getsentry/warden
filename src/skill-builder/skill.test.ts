import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Runtime, SkillRunRequest, SkillRunResponse } from '../sdk/runtimes/index.js';
import { buildGeneratedSkill } from './skill.js';
import {
  GeneratedSkillAuthoringPlanSchema,
  GeneratedSkillReviewResultSchema,
  GeneratedSkillWriterResultSchema,
} from './skill-contract.js';
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

function writeGeneratedFiles(rootDir: string, files: { path: string; content: string }[]): void {
  for (const file of files) {
    const target = join(rootDir, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content, 'utf-8');
  }
}

function diskWriterRunSkill(rootDir: string, runSkill: Runtime['runSkill']): Runtime['runSkill'] {
  return async (request) => {
    const response = await runSkill(request);
    if (
      !request.skillName.endsWith(':authoring-implementation') &&
      !request.skillName.endsWith(':authoring-revision')
    ) {
      return response;
    }

    const result = response.result;
    if (!result || result.status !== 'success') {
      return response;
    }

    const parsed = JSON.parse(result.text) as {
      files?: { path: string; content: string }[];
      summary?: string;
      validationNotes?: string[];
      missingInputs?: string[];
      externalSources?: { title: string; url: string; reason: string }[];
    };
    if (parsed.files) {
      writeGeneratedFiles(rootDir, parsed.files);
    }
    return {
      ...response,
      result: {
        ...result,
        text: JSON.stringify({
          version: 1,
          summary: parsed.summary ?? 'Writer updated skill artifacts.',
          validationNotes: parsed.validationNotes ?? [],
          missingInputs: parsed.missingInputs ?? [],
          externalSources: parsed.externalSources ?? [],
        }),
      },
    };
  };
}

describe('buildGeneratedSkill', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('lets the writer persist artifacts without hardcoded template files', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-skill-build-'));
    tempDirs.push(tempDir);
    const rootDir = join(tempDir, '.warden', 'skills', 'wrdn-security');
    const authoringSkillRoot = createAuthoringSkillRoot(tempDir);
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), source().files[0]!.content, 'utf-8');
    const buildOutline = outline();
    buildOutline.build.externalSources = [{
      title: 'OWASP Testing Guide',
      url: 'https://owasp.org/www-project-web-security-testing-guide/',
      reason: 'Security source carried from outline synthesis into artifact metadata.',
    }];
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
        runSkill: diskWriterRunSkill(rootDir, runSkill),
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

    expect(runSkill.mock.calls[1]![0].repoPath).toBe(rootDir);
    expect(runSkill.mock.calls[1]![0].allowMutatingTools).toBe(true);
    expect(runSkill.mock.calls[1]![0].tools?.allowed).toEqual(expect.arrayContaining(['Write', 'Edit', 'Bash']));
    expect(runSkill.mock.calls[0]![0].options.maxTurns).toBe(80);
    expect(runSkill.mock.calls[1]![0].options.maxTurns).toBe(80);
    expect(runSkill.mock.calls[2]![0].options.maxTurns).toBe(8);

    const state = readSkillBuildState(getBuildStatePath(rootDir));
    expect(state?.artifact?.version).toBe(5);
    expect(state?.artifact?.authoringProvider.rootDir).toBe(authoringSkillRoot);
    expect(state?.artifact?.fileManifest.map((file) => file.path).sort()).toEqual([
      'SKILL.md',
      'references/security.md',
    ].sort());
    expect(artifact.externalSources).toEqual([{
      title: 'OWASP Testing Guide',
      url: 'https://owasp.org/www-project-web-security-testing-guide/',
      reason: 'Security source carried from outline synthesis into artifact metadata.',
    }]);
  });

  it('improves existing artifacts without clearing the target before reviewer revisions', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-skill-build-'));
    tempDirs.push(tempDir);
    const rootDir = join(tempDir, '.warden', 'skills', 'wrdn-security');
    const authoringSkillRoot = createAuthoringSkillRoot(tempDir);
    mkdirSync(join(rootDir, 'references'), { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), source().files[0]!.content, 'utf-8');
    writeFileSync(join(rootDir, 'SKILL.md'), skillMd(), 'utf-8');
    writeFileSync(
      join(rootDir, 'references', 'security.md'),
      '# Security Reference\n\nExisting guidance that should survive a focused improvement.\n',
      'utf-8',
    );
    const buildOutline = outline();
    writeInitialState(rootDir, buildOutline);

    let validationCalls = 0;
    const runSkill = vi.fn<Runtime['runSkill']>(async (request: SkillRunRequest): Promise<SkillRunResponse> => {
      if (request.skillName.endsWith(':authoring-plan')) {
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              summary: 'Plan a focused improvement.',
              workflow: ['Read the current skill', 'Improve only the requested behavior'],
              researchPlan: ['Use current artifacts and improvement brief'],
              artifactPlan: ['Keep existing routed references unless the writer changes them'],
              validationPlan: ['Reviewer verifies the improvement'],
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
              files: [{ path: 'SKILL.md', content: skillMdWithDescription('Initial improved trigger language.') }],
              summary: 'Improved the trigger language.',
              validationNotes: ['Needs reviewer check'],
              missingInputs: [],
              externalSources: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      if (request.skillName.endsWith(':authoring-validation')) {
        validationCalls += 1;
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              valid: validationCalls > 1,
              summary: validationCalls > 1 ? 'Improvement is complete.' : 'Needs one revision.',
              issues: validationCalls > 1
                ? []
                : [{
                  severity: 'error',
                  path: 'SKILL.md',
                  message: 'Trigger language is still too vague.',
                  suggestedFix: 'Make the runtime trigger concrete.',
                }],
              missingInputs: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      if (request.skillName.endsWith(':authoring-revision')) {
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              files: [{ path: 'SKILL.md', content: skillMdWithDescription('Use when changed code touches exploitable security boundaries.') }],
              summary: 'Applied reviewer feedback.',
              validationNotes: ['Reviewer feedback addressed'],
              missingInputs: [],
              externalSources: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      throw new Error(`Unexpected skill run: ${request.skillName}`);
    });

    const artifact = await buildGeneratedSkill({
      outline: buildOutline,
      source: source(),
      rootDir,
      runtime: {
        name: 'claude',
        runSkill: diskWriterRunSkill(rootDir, runSkill),
        runAuxiliary: async () => ({ success: false, error: 'unused', usage: usage() }),
        runSynthesis: async () => ({ success: false, error: 'unused', usage: usage() }),
      },
      repoPath: tempDir,
      authoringSkillRoot,
      regenerate: true,
      mode: 'improve',
      improvementPrompt: 'Tighten trigger language without replacing the existing reference.',
    });

    expect(artifact.name).toBe('wrdn-security');
    expect(readFileSync(join(rootDir, 'SKILL.md'), 'utf-8')).toContain(
      'Use when changed code touches exploitable security boundaries.',
    );
    expect(readFileSync(join(rootDir, 'references', 'security.md'), 'utf-8')).toContain(
      'Existing guidance that should survive',
    );
    expect(runSkill.mock.calls.filter((call) => call[0].skillName.endsWith(':authoring-validation'))).toHaveLength(2);
    expect(runSkill.mock.calls.some((call) => call[0].skillName.endsWith(':authoring-revision'))).toBe(true);
  });

  it('uses outline tracks as single-writer coverage input without automatic track passes', async () => {
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
              summary: 'Plan ordered work lanes.',
              workflow: ['Read the authoring skill', 'Create one complete skill draft'],
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
              files: [
                {
                  path: 'SKILL.md',
                  content: `${inlineSkillMd()}
## References

Read \`references/security.md\` for general exploitability checks.
Read \`references/authentication.md\` for login and session changes.
`,
                },
                {
                  path: 'references/security.md',
                  content: '# Security Review\n\nTrace attacker-controlled input before reporting.\n',
                },
                {
                  path: 'references/authentication.md',
                  content: '# Authentication Review\n\nTrace identity checks and session state before reporting.\n',
                },
              ],
              summary: 'Created a complete skill draft from the outline tracks.',
              validationNotes: [],
              missingInputs: [],
              externalSources: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      if (request.skillName.endsWith(':authoring-validation')) {
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              valid: true,
              summary: 'Validated all outline track coverage.',
              issues: [],
              missingInputs: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      throw new Error(`Unexpected skill builder request: ${request.skillName}`);
    });

    await buildGeneratedSkill({
      outline: buildOutline,
      source: source(),
      rootDir,
      runtime: {
        name: 'claude',
        runSkill: diskWriterRunSkill(rootDir, runSkill),
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
      'wrdn-security:authoring-validation',
    ]);
    expect(runSkill.mock.calls.some((call) => call[0].skillName.includes(':authoring-track-')))
      .toBe(false);
    expect(existsSync(join(rootDir, 'references', 'security.md'))).toBe(true);
    expect(existsSync(join(rootDir, 'references', 'authentication.md'))).toBe(true);
    const writtenSkill = readFileSync(join(rootDir, 'SKILL.md'), 'utf-8');
    expect(writtenSkill).toContain('references/security.md');
    expect(writtenSkill).toContain('references/authentication.md');

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
        runSkill: diskWriterRunSkill(rootDir, runSkill),
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

  it('rejects review output that tries to rewrite files', () => {
    const result = GeneratedSkillReviewResultSchema.safeParse({
      version: 1,
      valid: true,
      summary: 'Review passed.',
      issues: [],
      files: [{ path: 'SKILL.md', content: skillMd() }],
      missingInputs: [],
    });

    expect(result.success).toBe(false);
  });

  it('accepts writer metadata even when provider includes legacy file-map fields', () => {
    const result = GeneratedSkillWriterResultSchema.safeParse({
      version: 1,
      name: 'wrdn-security',
      files: [{ path: 'SKILL.md', content: '' }],
      summary: 'Writer updated files on disk.',
      validationNotes: [],
      missingInputs: [],
      externalSources: [],
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('expected writer metadata to parse');
    }
    expect(result.data).not.toHaveProperty('files');
  });

  it('accepts source-depth details in authoring plans', () => {
    const result = GeneratedSkillAuthoringPlanSchema.safeParse({
      version: 1,
      summary: 'Plan a source-backed skill.',
      workflow: ['Read the authoring skill', 'Collect source depth', 'Write focused references'],
      researchPlan: ['Inspect official docs and safe counterexamples'],
      sourceDecisions: [{
        source: 'OWASP command injection guidance',
        decision: 'Require attacker-controlled input reaching a shell boundary.',
        implication: 'Command references need exploit-path evidence and safe argv examples.',
      }],
      lookupQuestions: [{
        question: 'How do I prove command injection in changed code?',
        openWhen: 'The hunk builds process commands from external input.',
        requiredEvidence: ['source-to-shell dataflow', 'safe argv counterexample'],
      }],
      qualityBar: ['Reject catalog-only references without exploit and fix examples.'],
      artifactPlan: ['Use a compact SKILL.md router plus focused references'],
      validationPlan: ['Reviewer checks source depth and lookup-question coverage'],
      risks: [],
      missingInputs: [],
      externalSources: [{
        title: 'OWASP Command Injection',
        url: 'https://owasp.org/www-community/attacks/Command_Injection',
        reason: 'Used to calibrate exploit evidence.',
      }],
    });

    expect(result.success).toBe(true);
  });

  it('feeds standards feedback to a revision writer', async () => {
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
    let reviewCalls = 0;
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
      if (request.skillName.endsWith(':authoring-revision')) {
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              name: 'wrdn-security',
              files: [
                { path: 'SKILL.md', content: revisedSkill },
                {
                  path: 'references/security.md',
                  content: '# Security Reference\n\nUse this when the hunk touches authentication or user-controlled input.\n',
                },
              ],
              summary: 'Revised the runtime instruction.',
              validationNotes: [],
              missingInputs: [],
              externalSources: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      reviewCalls += 1;
      return {
        result: {
          status: 'success',
          text: JSON.stringify(reviewCalls === 1
            ? {
              version: 1,
              valid: false,
              summary: 'Runtime instruction should be more explicit.',
              issues: [{
                severity: 'warning',
                path: 'SKILL.md',
                message: 'Runtime instruction should be more explicit.',
                suggestedFix: 'Add trace guidance.',
              }],
              missingInputs: [],
            }
            : {
              version: 1,
              valid: true,
              summary: 'Revised skill passes standards.',
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
        runSkill: diskWriterRunSkill(rootDir, runSkill),
        runAuxiliary: async () => ({ success: false, error: 'unused', usage: usage() }),
        runSynthesis: async () => ({ success: false, error: 'unused', usage: usage() }),
      },
      repoPath: tempDir,
      authoringSkillRoot,
      regenerate: true,
    });

    expect(readFileSync(join(rootDir, 'SKILL.md'), 'utf-8')).toContain('Trace before reporting.');
    expect(runSkill.mock.calls.map((call) => call[0].skillName)).toEqual([
      'wrdn-security:authoring-plan',
      'wrdn-security:authoring-implementation',
      'wrdn-security:authoring-validation',
      'wrdn-security:authoring-revision',
      'wrdn-security:authoring-validation',
    ]);
  });

  it('applies revision writer output after review feedback', async () => {
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
    let reviewCalls = 0;
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
      if (request.skillName.endsWith(':authoring-revision')) {
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              name: 'wrdn-security',
              files: [
                { path: 'SKILL.md', content: revisedSkill },
                {
                  path: 'references/security.md',
                  content: '# Security Reference\n\nUse this when the hunk touches authentication or user-controlled input.\n',
                },
              ],
              summary: 'Applied review feedback.',
              validationNotes: [],
              missingInputs: [],
              externalSources: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      reviewCalls += 1;
      return {
        result: {
          status: 'success',
          text: JSON.stringify(reviewCalls === 1
            ? {
              version: 1,
              valid: false,
              summary: 'Needs a more explicit runtime instruction.',
              issues: [{
                severity: 'warning',
                path: 'SKILL.md',
                message: 'Runtime instruction should be more explicit.',
              }],
              missingInputs: [],
            }
            : {
              version: 1,
              valid: true,
              summary: 'Revised skill passes standards.',
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
        runSkill: diskWriterRunSkill(rootDir, runSkill),
        runAuxiliary: async () => ({ success: false, error: 'unused', usage: usage() }),
        runSynthesis: async () => ({ success: false, error: 'unused', usage: usage() }),
      },
      repoPath: tempDir,
      authoringSkillRoot,
      regenerate: true,
    });

    expect(readFileSync(join(rootDir, 'SKILL.md'), 'utf-8')).toContain('Trace before reporting.');
  });

  it('fails and preserves the revision draft when routed references are still missing', async () => {
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
    let reviewCalls = 0;
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
      if (request.skillName.endsWith(':authoring-revision')) {
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              name: 'wrdn-security',
              files: [
                { path: 'SKILL.md', content: incompleteSkill },
                {
                  path: 'references/security.md',
                  content: '# Security Reference\n\nUse this when the hunk touches authentication or user-controlled input.\n',
                },
              ],
              summary: 'Added missing route guidance.',
              validationNotes: [],
              missingInputs: [],
              externalSources: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      reviewCalls += 1;
      return {
        result: {
          status: 'success',
          text: JSON.stringify(reviewCalls === 1
            ? {
              version: 1,
              valid: false,
              summary: 'A route should be added for the missing reference.',
              issues: [{
                severity: 'warning',
                path: 'SKILL.md',
                message: 'Add the missing route.',
              }],
              missingInputs: [],
            }
            : {
              version: 1,
              valid: true,
              summary: 'Revised skill passes standards.',
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
        runSkill: diskWriterRunSkill(rootDir, runSkill),
        runAuxiliary: async () => ({ success: false, error: 'unused', usage: usage() }),
        runSynthesis: async () => ({ success: false, error: 'unused', usage: usage() }),
      },
      repoPath: tempDir,
      authoringSkillRoot,
      regenerate: true,
    })).rejects.toThrow(
      /Generated skill failed mechanical validation for wrdn-security:[\s\S]*references\/missing\.md/,
    );

    expect(readFileSync(join(rootDir, 'SKILL.md'), 'utf-8')).toBe(incompleteSkill);
    expect(existsSync(join(rootDir, 'references', 'missing.md'))).toBe(false);
    expect(existsSync(join(rootDir, 'references', 'security.md'))).toBe(true);
    const state = readSkillBuildState(getBuildStatePath(rootDir));
    expect(state?.artifact).toBeUndefined();
  });

  it('fails mechanical review when the writer leaves SKILL.md malformed and preserves the draft', async () => {
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

    await expect(buildGeneratedSkill({
      outline: buildOutline,
      source: source(),
      rootDir,
      runtime: {
        name: 'claude',
        runSkill: diskWriterRunSkill(rootDir, runSkill),
        runAuxiliary: async () => ({ success: false, error: 'unused', usage: usage() }),
        runSynthesis: async () => ({ success: false, error: 'unused', usage: usage() }),
      },
      repoPath: tempDir,
      authoringSkillRoot,
      regenerate: true,
    })).rejects.toThrow(
      /Generated skill failed mechanical validation for wrdn-security:[\s\S]*SKILL\.md must start with YAML frontmatter/,
    );

    expect(readFileSync(join(rootDir, 'SKILL.md'), 'utf-8')).toBe(skillMdWithoutFrontmatter());
    expect(existsSync(join(rootDir, 'references', 'security.md'))).toBe(true);
    const state = readSkillBuildState(getBuildStatePath(rootDir));
    expect(state?.artifact).toBeUndefined();
  });

  it('feeds authoring-metadata descriptions to reviewer and revision writer', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-skill-build-'));
    tempDirs.push(tempDir);
    const rootDir = join(tempDir, '.warden', 'skills', 'wrdn-security');
    const authoringSkillRoot = createAuthoringSkillRoot(tempDir);
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), source().files[0]!.content, 'utf-8');
    const buildOutline = outline();
    writeInitialState(rootDir, buildOutline);

    const revisedSkill = `---
name: wrdn-security
description: Use when reviewing code changes for security concerns.
allowed-tools: Read Grep Glob Bash
---

Review changed hunks for exploitable security issues.
`;
    let reviewCalls = 0;
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
      if (request.skillName.endsWith(':authoring-revision')) {
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              name: 'wrdn-security',
              files: [{ path: 'SKILL.md', content: revisedSkill }],
              summary: 'Revised the trigger description.',
              validationNotes: [],
              missingInputs: [],
              externalSources: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      reviewCalls += 1;
      return {
        result: {
          status: 'success',
          text: JSON.stringify(reviewCalls === 1
            ? {
              version: 1,
              valid: false,
              summary: 'Description contains authoring metadata.',
              issues: [{
                severity: 'error',
                path: 'SKILL.md',
                message: 'Description should be runtime trigger language, not build metadata.',
              }],
              missingInputs: [],
            }
            : {
              version: 1,
              valid: true,
              summary: 'Description is runtime-facing.',
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
        runSkill: diskWriterRunSkill(rootDir, runSkill),
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

  it('uses revision writer to remove metadata artifacts and output contract sections', async () => {
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
    let reviewCalls = 0;
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
      if (request.skillName.endsWith(':authoring-revision')) {
        rmSync(join(rootDir, 'SOURCES.md'), { force: true });
        rmSync(join(rootDir, 'SPEC.md'), { force: true });
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              name: 'wrdn-security',
              files: [{ path: 'SKILL.md', content: inlineSkillMd() }],
              summary: 'Removed output contract and build metadata.',
              validationNotes: [],
              missingInputs: [],
              externalSources: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      reviewCalls += 1;
      return {
        result: {
          status: 'success',
          text: JSON.stringify(reviewCalls === 1
            ? {
              version: 1,
              valid: false,
              summary: 'Runtime artifacts contain output-contract and build metadata.',
              issues: [{
                severity: 'error',
                path: 'SKILL.md',
                message: 'Remove custom output contract sections from runtime guidance.',
              }, {
                severity: 'error',
                path: 'SOURCES.md',
                message: 'Remove build metadata unless it documents real external sources.',
              }],
              missingInputs: [],
            }
            : {
              version: 1,
              valid: true,
              summary: 'Metadata artifacts were removed.',
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
        runSkill: diskWriterRunSkill(rootDir, runSkill),
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

  it('keeps sources files that document real external sources', async () => {
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
                { path: 'SKILL.md', content: inlineSkillMd() },
                {
                  path: 'SOURCES.md',
                  content: '# Sources\n\n- [OWASP CI/CD Security](https://owasp.org/www-project-top-10-ci-cd-security-risks/): build pipeline threat model.\n',
                },
              ],
              summary: 'Generated.',
              validationNotes: [],
              missingInputs: [],
              externalSources: [{
                title: 'OWASP CI/CD Security',
                url: 'https://owasp.org/www-project-top-10-ci-cd-security-risks/',
                reason: 'Used to scope build pipeline security guidance.',
              }],
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
        runSkill: diskWriterRunSkill(rootDir, runSkill),
        runAuxiliary: async () => ({ success: false, error: 'unused', usage: usage() }),
        runSynthesis: async () => ({ success: false, error: 'unused', usage: usage() }),
      },
      repoPath: tempDir,
      authoringSkillRoot,
      regenerate: true,
    });

    expect(readFileSync(join(rootDir, 'SOURCES.md'), 'utf-8')).toContain(
      'https://owasp.org/www-project-top-10-ci-cd-security-risks/',
    );
  });

  it('uses revision writer to remove output-contract routes instead of synthesizing references', async () => {
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
    let reviewCalls = 0;
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
      if (request.skillName.endsWith(':authoring-revision')) {
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              name: 'wrdn-security',
              files: [{ path: 'SKILL.md', content: inlineSkillMd() }],
              summary: 'Removed output-format route.',
              validationNotes: [],
              missingInputs: [],
              externalSources: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      reviewCalls += 1;
      return {
        result: {
          status: 'success',
          text: JSON.stringify(reviewCalls === 1
            ? {
              version: 1,
              valid: false,
              summary: 'Output-format route should be removed.',
              issues: [{
                severity: 'error',
                path: 'SKILL.md',
                message: 'Remove custom output-format runtime guidance.',
              }],
              missingInputs: [],
            }
            : {
              version: 1,
              valid: true,
              summary: 'Output-format route was removed.',
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
        runSkill: diskWriterRunSkill(rootDir, runSkill),
        runAuxiliary: async () => ({ success: false, error: 'unused', usage: usage() }),
        runSynthesis: async () => ({ success: false, error: 'unused', usage: usage() }),
      },
      repoPath: tempDir,
      authoringSkillRoot,
      regenerate: true,
    });

    expect(readFileSync(join(rootDir, 'SKILL.md'), 'utf-8')).not.toContain('Output Format');
    expect(existsSync(join(rootDir, 'references', 'output-format.md'))).toBe(false);
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
        runSkill: diskWriterRunSkill(rootDir, runSkill),
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

  it('feeds missing routed references to the reviewer and revision writer', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-skill-build-'));
    tempDirs.push(tempDir);
    const rootDir = join(tempDir, '.warden', 'skills', 'wrdn-security');
    const authoringSkillRoot = createAuthoringSkillRoot(tempDir);
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), source().files[0]!.content, 'utf-8');
    const buildOutline = outline();
    writeInitialState(rootDir, buildOutline);

    let reviewCalls = 0;
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
      if (request.skillName.endsWith(':authoring-revision')) {
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
                  content: '# Security Reference\n\nTrace data flow from changed lines before reporting.\n',
                },
              ],
              summary: 'Added the routed reference explicitly.',
              validationNotes: [],
              missingInputs: [],
              externalSources: [],
            }),
            errors: [],
            usage: usage(),
          },
        };
      }
      reviewCalls += 1;
      return {
        result: {
          status: 'success',
          text: JSON.stringify(reviewCalls === 1
            ? {
              version: 1,
              valid: false,
              summary: 'Provider saw the original draft as incomplete.',
              issues: [{
                severity: 'error',
                path: 'SKILL.md',
                message: 'SKILL.md routes reference files that are not included on disk.',
              }, {
                severity: 'error',
                path: 'references/',
                message: 'Missing all reference files that SKILL.md routes to.',
              }],
              missingInputs: [],
            }
            : {
              version: 1,
              valid: true,
              summary: 'Revised skill passes standards.',
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
        runSkill: diskWriterRunSkill(rootDir, runSkill),
        runAuxiliary: async () => ({ success: false, error: 'unused', usage: usage() }),
        runSynthesis: async () => ({ success: false, error: 'unused', usage: usage() }),
      },
      repoPath: tempDir,
      authoringSkillRoot,
      regenerate: true,
    });

    const reference = readFileSync(join(rootDir, 'references', 'security.md'), 'utf-8');
    expect(reference).toContain('# Security Reference');
    expect(reference).toContain('Trace data flow');
    const state = readSkillBuildState(getBuildStatePath(rootDir));
    expect(state?.artifact?.fileManifest.some((file) => file.path === 'references/security.md'))
      .toBe(true);
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
        runSkill: diskWriterRunSkill(rootDir, runSkill),
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

  it('fails and preserves the draft when a generated reference index routes missing files', async () => {
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
        runSkill: diskWriterRunSkill(rootDir, runSkill),
        runAuxiliary: async () => ({ success: false, error: 'unused', usage: usage() }),
        runSynthesis: async () => ({ success: false, error: 'unused', usage: usage() }),
      },
      repoPath: tempDir,
      authoringSkillRoot,
      regenerate: true,
    })).rejects.toThrow(
      /Generated skill failed mechanical validation for wrdn-security:[\s\S]*references\/security\.md/,
    );

    expect(existsSync(join(rootDir, 'references', 'checklist.md'))).toBe(true);
    expect(existsSync(join(rootDir, 'references', 'security.md'))).toBe(false);
    const state = readSkillBuildState(getBuildStatePath(rootDir));
    expect(state?.artifact).toBeUndefined();
  });

  it('regenerates cached artifacts with missing routed reference files', async () => {
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
        version: 5,
        sourceHash: source().hash,
        outlineHash: outlineHash(buildOutline),
        buildVersion: buildOutline.buildVersion,
        authoringProvider: resolveAuthoringProvider({ authoringSkillRoot }),
        name: 'wrdn-security',
        fileManifest: [{ path: 'SKILL.md', bytes: cachedBytes }],
        deterministicWarnings: [],
        bytes: cachedBytes,
        durationMs: 10,
        usage: usage(),
        externalSources: [],
        missingInputs: [],
        authoringWarnings: [],
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
        runSkill: diskWriterRunSkill(rootDir, runSkill),
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

  it('warns and preserves the draft when provider review still reports issues after the loop cap', async () => {
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
      if (request.skillName.endsWith(':authoring-revision')) {
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
              summary: 'Kept the current layout after review.',
              validationNotes: ['Navigation warning remains advisory.'],
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
        runSkill: diskWriterRunSkill(rootDir, runSkill),
        runAuxiliary: async () => ({ success: false, error: 'unused', usage: usage() }),
        runSynthesis: async () => ({ success: false, error: 'unused', usage: usage() }),
      },
      repoPath: tempDir,
      authoringSkillRoot,
      regenerate: true,
    });

    expect(existsSync(join(rootDir, 'references', 'security.md'))).toBe(true);
    expect(artifact.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('Authoring reviewer still requested changes after 3 revision passes'),
      expect.stringContaining('Reference is 140 lines'),
    ]));
    expect(runSkill.mock.calls.filter((call) =>
      call[0].skillName.endsWith(':authoring-revision')
    )).toHaveLength(3);
    const state = readSkillBuildState(getBuildStatePath(rootDir));
    expect(state?.artifact?.authoringWarnings).toEqual(artifact.warnings);
  });

  it('records warnings and keeps the writer draft when final provider review remains invalid', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-skill-build-'));
    tempDirs.push(tempDir);
    const rootDir = join(tempDir, '.warden', 'skills', 'wrdn-security');
    const authoringSkillRoot = createAuthoringSkillRoot(tempDir);
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), source().files[0]!.content, 'utf-8');
    writeFileSync(join(rootDir, 'SKILL.md'), 'previous artifact\n', 'utf-8');
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
      if (request.skillName.endsWith(':authoring-revision')) {
        return {
          result: {
            status: 'success',
            text: JSON.stringify({
              version: 1,
              name: 'wrdn-security',
              files: [{ path: 'SKILL.md', content: inlineSkillMd() }],
              summary: 'Kept the current runtime guidance after review.',
              validationNotes: ['Reviewer still considers the skill shallow.'],
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
        runSkill: diskWriterRunSkill(rootDir, runSkill),
        runAuxiliary: async () => ({ success: false, error: 'unused', usage: usage() }),
        runSynthesis: async () => ({ success: false, error: 'unused', usage: usage() }),
      },
      repoPath: tempDir,
      authoringSkillRoot,
      regenerate: true,
    });

    expect(readFileSync(join(rootDir, 'SKILL.md'), 'utf-8')).toBe(inlineSkillMd());
    expect(artifact.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('Authoring reviewer still requested changes after 3 revision passes'),
      expect.stringContaining('Runtime instructions are too shallow'),
    ]));
    expect(runSkill.mock.calls.filter((call) =>
      call[0].skillName.endsWith(':authoring-revision')
    )).toHaveLength(3);
    const state = readSkillBuildState(getBuildStatePath(rootDir));
    expect(state?.artifact?.authoringWarnings).toEqual(artifact.warnings);
  });
});
