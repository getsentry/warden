import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SkillDefinition } from '../config/schema.js';
import type { Runtime } from '../sdk/runtimes/index.js';
import { getVersion } from '../utils/index.js';
import {
  COORDINATOR_PLAN_SCHEMA_VERSION,
  COORDINATOR_METADATA_FILE,
  COORDINATOR_VERSION,
  SUPERWARDEN_SYNTHESIS_MAX_TOKENS,
  SUPERWARDEN_SYNTHESIS_TIMEOUT_MS,
  collectCoordinatorSource,
  getCoordinatorPlanPath,
  synthesizeCoordinatorPlan,
  type CoordinatorPlan,
} from './plan.js';

function emptyUsage() {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    costUSD: 0,
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function createPlan(skill: SkillDefinition, sourceHash: string): CoordinatorPlan {
  return {
    version: 1,
    skill: skill.name,
    sourceHash,
    coordinatorVersion: COORDINATOR_VERSION,
    synthesis: {
      phases: [
        { id: 'collect-inputs', status: 'generated' },
        { id: 'synthesize-tasks', status: 'generated' },
        { id: 'validate-coverage', status: 'validated' },
      ],
    },
    tasks: [
      {
        id: 'authz',
        title: 'Authorization',
        scope: 'Find missing authorization checks.',
        prompt: 'Review changed code for authorization boundary failures.',
        evidenceRequirements: ['Trace the caller identity and permission boundary.'],
        outOfScope: ['Style issues'],
      },
    ],
  };
}

function createRuntime(plan: CoordinatorPlan): Runtime {
  return {
    name: 'claude',
    runSkill: vi.fn(async () => ({
      result: {
        status: 'success' as const,
        text: JSON.stringify(plan),
        errors: [],
        usage: emptyUsage(),
        durationMs: 12_000,
        responseModel: 'agent-model',
        numTurns: 6,
      },
    })),
    runSynthesis: vi.fn(async <T>() => ({
      success: true as const,
      data: plan as T,
      usage: emptyUsage(),
    })) as unknown as Runtime['runSynthesis'],
    runAuxiliary: vi.fn(async <T>() => ({
      success: true as const,
      data: plan as T,
      usage: emptyUsage(),
    })) as unknown as Runtime['runAuxiliary'],
  };
}

describe('Superwarden plan synthesis', () => {
  let tempDir: string;
  let originalStateDir: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-superwarden-test-'));
    originalStateDir = process.env['WARDEN_STATE_DIR'];
    process.env['WARDEN_STATE_DIR'] = join(tempDir, 'state');
  });

  afterEach(() => {
    if (originalStateDir === undefined) {
      delete process.env['WARDEN_STATE_DIR'];
    } else {
      process.env['WARDEN_STATE_DIR'] = originalStateDir;
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  function createSkill(): SkillDefinition {
    const rootDir = join(tempDir, 'security-review');
    mkdirSync(join(rootDir, 'references'), { recursive: true });
    writeFileSync(join(rootDir, COORDINATOR_METADATA_FILE), `version: 1
kind: superwarden-skill
name: security-review
mode: coordinator
initialPrompt: Create the security-review Superwarden skill.
outputFiles:
  - SKILL.md
  - SPEC.md
coverage:
  - authorization
`);
    writeFileSync(join(rootDir, 'SPEC.md'), '# Spec\n\nCover authz and data exposure.\n');
    writeFileSync(join(rootDir, 'SOURCES.md'), '# Sources\n');
    writeFileSync(join(rootDir, 'references', 'concerns.md'), '# Concerns\n');
    return {
      name: 'security-review',
      description: 'Review security concerns.',
      prompt: 'Review changed code for security issues.',
      rootDir,
    };
  }

  it('synthesizes and caches a validated plan', async () => {
    const skill = createSkill();
    const source = collectCoordinatorSource(skill);
    const plan = createPlan(skill, source.hash);
    const runtime = createRuntime(plan);

    const result = await synthesizeCoordinatorPlan({ skill, runtime, apiKey: 'test-key' });

    expect(result.source).toBe('generated');
    expect(result.plan.tasks[0]?.id).toBe('authz');
    expect(existsSync(result.cachePath)).toBe(true);
    expect(result.cachePath).toBe(join(tempDir, 'state', 'superwarden-plans', 'security-review', 'plan.json'));
    expect(runtime.runSynthesis).toHaveBeenCalledTimes(1);
    expect(runtime.runSynthesis).toHaveBeenCalledWith(expect.objectContaining({
      task: 'superwarden_synthesis',
      maxTokens: SUPERWARDEN_SYNTHESIS_MAX_TOKENS,
      timeout: SUPERWARDEN_SYNTHESIS_TIMEOUT_MS,
      prompt: expect.stringContaining('agent-quality planning pass'),
    }));
    expect(runtime.runSynthesis).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining('online prior art'),
    }));
    expect(runtime.runSynthesis).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining('every item must map clearly'),
    }));
    expect(runtime.runSynthesis).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining('The parent plan is a lean decomposition artifact'),
    }));
    expect(runtime.runSynthesis).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining('explicitly excludes sibling task concerns'),
    }));
    expect(runtime.runSynthesis).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining('Treat each task more like a concise spec stub'),
    }));
    expect(runtime.runSynthesis).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining('Do not put trigger-language, user-request phrasing'),
    }));
    expect(runtime.runSynthesis).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining('assign one primary owning task for the reportable issue'),
    }));
    expect(JSON.parse(readFileSync(result.cachePath, 'utf-8')).plan.tasks[0].id).toBe('authz');
  });

  it('uses an agentic Superwarden synthesis run when repo context is available', async () => {
    const skill = createSkill();
    const source = collectCoordinatorSource(skill);
    const plan = createPlan(skill, source.hash);
    const runtime = createRuntime(plan);

    const result = await synthesizeCoordinatorPlan({
      skill,
      runtime,
      repoPath: tempDir,
      model: 'agent-model',
    });

    expect(result.source).toBe('generated');
    expect(result.durationMs).toBe(12_000);
    expect(result.responseModel).toBe('agent-model');
    expect(result.numTurns).toBe(6);
    expect(runtime.runAuxiliary).not.toHaveBeenCalled();
    expect(runtime.runSynthesis).not.toHaveBeenCalled();
    expect(runtime.runSkill).toHaveBeenCalledWith(expect.objectContaining({
      repoPath: tempDir,
      skillName: 'security-review:superwarden-plan',
      tools: { allowed: ['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch'] },
      options: expect.objectContaining({
        model: 'agent-model',
      }),
    }));
  });

  it('includes Superwarden metadata in source identity', () => {
    const skill = createSkill();
    const firstSource = collectCoordinatorSource(skill);
    const metadataFile = firstSource.files.find((file) => file.path === COORDINATOR_METADATA_FILE);
    expect(metadataFile?.content).toContain('Create the security-review Superwarden skill.');

    writeFileSync(join(skill.rootDir!, COORDINATOR_METADATA_FILE), `version: 1
kind: superwarden-skill
name: security-review
mode: coordinator
initialPrompt: Create a narrower security Superwarden skill.
`);

    const updatedSource = collectCoordinatorSource(skill);
    expect(updatedSource.hash).not.toBe(firstSource.hash);
  });

  it('rejects Superwarden metadata for a different skill', () => {
    const skill = createSkill();
    writeFileSync(join(skill.rootDir!, COORDINATOR_METADATA_FILE), `version: 1
kind: superwarden-skill
name: other-skill
mode: coordinator
initialPrompt: Create the security-review Superwarden skill.
`);

    expect(() => collectCoordinatorSource(skill)).toThrow('Superwarden metadata skill mismatch');
  });

  it('uses a valid cached plan without calling the model', async () => {
    const skill = createSkill();
    const source = collectCoordinatorSource(skill);
    const plan = createPlan(skill, source.hash);
    const cachePath = getCoordinatorPlanPath({ skillName: skill.name });
    mkdirSync(join(cachePath, '..'), { recursive: true });
    writeFileSync(cachePath, JSON.stringify(plan), 'utf-8');
    const runtime = createRuntime(plan);

    const result = await synthesizeCoordinatorPlan({ skill, runtime });

    expect(result.source).toBe('cache');
    expect(result.plan.tasks[0]?.id).toBe('authz');
    expect(runtime.runAuxiliary).not.toHaveBeenCalled();
    expect(runtime.runSynthesis).not.toHaveBeenCalled();
  });

  it('regenerates when the cached plan is invalid', async () => {
    const skill = createSkill();
    const source = collectCoordinatorSource(skill);
    const cachePath = getCoordinatorPlanPath({ skillName: skill.name });
    mkdirSync(join(cachePath, '..'), { recursive: true });
    writeFileSync(cachePath, '{"version":1}', 'utf-8');
    const regenerated = createPlan(skill, source.hash);
    regenerated.tasks = [{ ...regenerated.tasks[0]!, id: 'data-exposure', title: 'Data exposure' }];
    const runtime = createRuntime(regenerated);

    const result = await synthesizeCoordinatorPlan({ skill, runtime });

    expect(result.source).toBe('generated');
    expect(result.plan.tasks[0]?.id).toBe('data-exposure');
    expect(runtime.runSynthesis).toHaveBeenCalledTimes(1);
  });

  it('migrates legacy hash-based repo cache paths into stable plan and task paths', async () => {
    const skill = createSkill();
    const source = collectCoordinatorSource(skill);
    const plan = createPlan(skill, source.hash);
    const artifactRoot = join(tempDir, 'repo-artifacts');
    const legacyKey = sha256(JSON.stringify({
      skillName: skill.name,
      sourceHash: source.hash,
      coordinatorVersion: COORDINATOR_VERSION,
      schemaVersion: COORDINATOR_PLAN_SCHEMA_VERSION,
      wardenVersion: getVersion(),
      model: 'default',
    }));
    const legacyCachePath = join(artifactRoot, 'cache', `${legacyKey}.json`);
    const legacySkillPath = join(artifactRoot, 'cache', legacyKey, 'skills', 'authz', 'SKILL.md');
    mkdirSync(join(legacySkillPath, '..'), { recursive: true });
    writeFileSync(legacyCachePath, `${JSON.stringify(plan)}\n`, 'utf-8');
    writeFileSync(legacySkillPath, '# Skill\n', 'utf-8');

    const runtime = createRuntime(plan);
    const result = await synthesizeCoordinatorPlan({ skill, runtime, artifactRoot });

    expect(result.source).toBe('cache');
    expect(result.cachePath).toBe(join(artifactRoot, 'plan.json'));
    expect(existsSync(result.cachePath)).toBe(true);
    expect(existsSync(join(artifactRoot, 'tasks', 'authz', 'SKILL.md'))).toBe(true);
    expect(existsSync(legacyCachePath)).toBe(false);
    expect(existsSync(join(artifactRoot, 'cache'))).toBe(false);
    expect(runtime.runSynthesis).not.toHaveBeenCalled();
  });

  it('migrates repo-local cache layout into plan and task artifacts', async () => {
    const skill = createSkill();
    const source = collectCoordinatorSource(skill);
    const plan = createPlan(skill, source.hash);
    const artifactRoot = join(tempDir, 'repo-artifacts');
    const legacyPlanPath = join(artifactRoot, 'cache', 'plan.json');
    const legacySkillPath = join(artifactRoot, 'cache', 'skills', 'authz', 'SKILL.md');
    mkdirSync(join(legacySkillPath, '..'), { recursive: true });
    writeFileSync(legacyPlanPath, `${JSON.stringify(plan)}\n`, 'utf-8');
    writeFileSync(legacySkillPath, '# Skill\n', 'utf-8');

    const runtime = createRuntime(plan);
    const result = await synthesizeCoordinatorPlan({ skill, runtime, artifactRoot });

    expect(result.source).toBe('cache');
    expect(result.cachePath).toBe(join(artifactRoot, 'plan.json'));
    expect(existsSync(join(artifactRoot, 'plan.json'))).toBe(true);
    expect(existsSync(join(artifactRoot, 'tasks', 'authz', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(artifactRoot, 'cache'))).toBe(false);
    expect(runtime.runSynthesis).not.toHaveBeenCalled();
  });

  it('regenerates when requested', async () => {
    const skill = createSkill();
    const source = collectCoordinatorSource(skill);
    const plan = createPlan(skill, source.hash);
    const cachePath = getCoordinatorPlanPath({ skillName: skill.name });
    mkdirSync(join(cachePath, '..'), { recursive: true });
    writeFileSync(cachePath, JSON.stringify(plan), 'utf-8');
    const regenerated = {
      ...plan,
      tasks: [{ ...plan.tasks[0]!, id: 'data-exposure', title: 'Data exposure' }],
    };
    const runtime = createRuntime(regenerated);

    const result = await synthesizeCoordinatorPlan({ skill, runtime, regenerate: true });

    expect(result.source).toBe('generated');
    expect(result.plan.tasks[0]?.id).toBe('data-exposure');
    expect(JSON.parse(readFileSync(cachePath, 'utf-8')).plan.tasks[0].id).toBe('data-exposure');
    expect(runtime.runSynthesis).toHaveBeenCalledTimes(1);
  });

  it('regenerates when the stable cache was synthesized with a different model', async () => {
    const skill = createSkill();
    const source = collectCoordinatorSource(skill);
    const cachedPlan = createPlan(skill, source.hash);
    const cachePath = getCoordinatorPlanPath({
      skillName: skill.name,
    });
    mkdirSync(join(cachePath, '..'), { recursive: true });
    writeFileSync(cachePath, `${JSON.stringify({
      version: 1,
      kind: 'superwarden-plan-cache',
      identity: { requestedModel: 'claude-opus-4-5' },
      plan: cachedPlan,
      childSkills: {},
    }, null, 2)}\n`, 'utf-8');

    const regenerated = {
      ...cachedPlan,
      tasks: [{ ...cachedPlan.tasks[0]!, id: 'secrets', title: 'Secrets' }],
    };
    const runtime = createRuntime(regenerated);

    const result = await synthesizeCoordinatorPlan({
      skill,
      runtime,
      model: 'claude-sonnet-4-5',
    });

    expect(result.source).toBe('generated');
    expect(result.plan.tasks[0]?.id).toBe('secrets');
    expect(runtime.runSynthesis).toHaveBeenCalledTimes(1);
  });
});
