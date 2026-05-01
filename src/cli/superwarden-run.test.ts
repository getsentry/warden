import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLIOptionsSchema } from './args.js';
import { createSkillTasks, inferExplicitSkillExecutionMode, type RunSkillSpec } from './main.js';
import { runWithLiveStatus, runWithLiveStatusList } from './output/live-status.js';
import { Reporter } from './output/reporter.js';
import { detectOutputMode } from './output/tty.js';
import { Verbosity } from './output/verbosity.js';
import { collectCoordinatorSource, COORDINATOR_PLAN_CACHE_KIND, COORDINATOR_PLAN_CACHE_SCHEMA_VERSION, COORDINATOR_VERSION, getCoordinatorPlanCachePath, type CoordinatorPlan } from '../coordinator/plan.js';
import { getCoordinatorChildSkillsRoot } from '../coordinator/child-skills.js';
import { getSuperwardenCacheDir } from '../coordinator/superwarden.js';
import * as coordinatorPlanModule from '../coordinator/plan.js';
import * as childSkillsModule from '../coordinator/child-skills.js';
import { resolveSkillAsync } from '../skills/loader.js';
import type { EventContext } from '../types/index.js';

vi.mock('./output/live-status.js', () => ({
  runWithLiveStatus: vi.fn(async <T>(args: { task: () => Promise<T> }) => args.task()),
  runWithLiveStatusList: vi.fn(async <TItem, TResult>(args: {
    items: TItem[];
    task: (item: TItem, index: number) => Promise<TResult>;
  }) => Promise.all(args.items.map((item, index) => args.task(item, index)))),
}));

const mockRunWithLiveStatus = vi.mocked(runWithLiveStatus);
const mockRunWithLiveStatusList = vi.mocked(runWithLiveStatusList);

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function byteLength(...contents: string[]): number {
  return contents.reduce((sum, content) => sum + Buffer.byteLength(content, 'utf-8'), 0);
}

function childTaskHash(plan: CoordinatorPlan, task: CoordinatorPlan['tasks'][number]): string {
  return sha256(JSON.stringify({
    parentSkill: plan.skill,
    sourceHash: plan.sourceHash,
    coordinatorVersion: plan.coordinatorVersion,
    task,
  }));
}

async function writeCachedSuperwardenFixture(tempDir: string): Promise<RunSkillSpec> {
  const parentRoot = join(tempDir, '.warden', 'superwarden', 'security-review');
  mkdirSync(parentRoot, { recursive: true });
  writeFileSync(
    join(parentRoot, 'SKILL.md'),
    `---
name: security-review
description: Security review.
---

Review security issues.
`,
    'utf-8',
  );

  const parentSkill = await resolveSkillAsync('security-review', tempDir);
  const source = collectCoordinatorSource(parentSkill);
  const task = {
    id: 'authz',
    title: 'Authorization',
    scope: 'Find authorization boundary issues.',
    prompt: 'Review authorization boundaries.',
    evidenceRequirements: ['Trace the permission boundary.'],
    outOfScope: [],
  };
  const plan: CoordinatorPlan = {
    version: 1,
    skill: 'security-review',
    sourceHash: source.hash,
    coordinatorVersion: COORDINATOR_VERSION,
    synthesis: {
      phases: [{ id: 'collect-inputs', status: 'cached' }],
      externalSources: [],
    },
    tasks: [task],
  };
  const cachePath = getCoordinatorPlanCachePath({
    skillName: parentSkill.name,
    sourceHash: source.hash,
    cacheDir: getSuperwardenCacheDir(tempDir, parentSkill.name),
  });
  const childRoot = getCoordinatorChildSkillsRoot(cachePath);
  const childDir = join(childRoot, task.id);
  mkdirSync(childDir, { recursive: true });
  const skillContent = `---
name: authz
description: Authorization task.
allowed-tools: Read Grep Glob
---

Review authorization issues.
`;
  const specContent = '# Spec\n';
  const sourcesContent = '# Sources\n';
  writeFileSync(join(childDir, 'SKILL.md'), skillContent, 'utf-8');
  writeFileSync(join(childDir, 'SPEC.md'), specContent, 'utf-8');
  writeFileSync(join(childDir, 'SOURCES.md'), sourcesContent, 'utf-8');

  mkdirSync(join(cachePath, '..'), { recursive: true });
  writeFileSync(
    cachePath,
    `${JSON.stringify({
      version: COORDINATOR_PLAN_CACHE_SCHEMA_VERSION,
      kind: COORDINATOR_PLAN_CACHE_KIND,
      plan,
      childSkills: {
        [task.id]: {
          version: 2,
          parentSkill: plan.skill,
          taskId: task.id,
          taskHash: childTaskHash(plan, task),
          sourceHash: plan.sourceHash,
          coordinatorVersion: plan.coordinatorVersion,
          name: 'authz',
          bytes: byteLength(skillContent, specContent, sourcesContent),
          durationMs: 1000,
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
            costUSD: 0,
          },
          externalSources: [],
          missingInputs: [],
          generatedAt: new Date().toISOString(),
        },
      },
    }, null, 2)}\n`,
    'utf-8',
  );

  return {
    name: 'security-review',
    skill: 'security-review',
    mode: 'coordinator',
    context: {
      repoPath: tempDir,
      repository: { fullName: 'getsentry/warden' },
      pullRequest: { files: [] },
    } as unknown as EventContext,
    runnerOptions: {},
  };
}

describe('Superwarden run task expansion', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-superwarden-run-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('expands a cached Superwarden skill into runnable task skills', async () => {
    const spec = await writeCachedSuperwardenFixture(tempDir);

    const tasks = await createSkillTasks({
      specs: [spec],
      repoPath: tempDir,
      options: CLIOptionsSchema.parse({ quiet: true }),
      parallel: 4,
      reporter: new Reporter(detectOutputMode(false), Verbosity.Quiet),
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.name).toBe('security-review/authz');
    expect(tasks[0]!.displayName).toBe('security-review/authz');
    const childSkill = await tasks[0]!.resolveSkill();
    expect(childSkill.name).toBe('authz');
    expect(readFileSync(join(childSkill.rootDir!, 'SPEC.md'), 'utf-8')).toBe('# Spec\n');
  });

  it('shows live progress while preparing Superwarden tasks in TTY mode', async () => {
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const spec = await writeCachedSuperwardenFixture(tempDir);

    try {
      await createSkillTasks({
        specs: [spec],
        repoPath: tempDir,
        options: CLIOptionsSchema.parse({}),
        parallel: 4,
        reporter: new Reporter({ isTTY: true, supportsColor: false, columns: 80 }, Verbosity.Normal),
      });
    } finally {
      stderrSpy.mockRestore();
    }

    expect(mockRunWithLiveStatus).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Security review.',
      detail: expect.stringContaining('Validating cached Superwarden plan...'),
    }));
    expect(mockRunWithLiveStatus).toHaveBeenCalledWith(expect.objectContaining({
      message: 'authz',
    }));
  });

  it('renders the active child tasks through the list live-status helper when synthesis runs in parallel', async () => {
    const spec = await writeCachedSuperwardenFixture(tempDir);
    const parentSkill = await resolveSkillAsync('security-review', tempDir);
    const source = collectCoordinatorSource(parentSkill);
    const cachePath = getCoordinatorPlanCachePath({
      skillName: parentSkill.name,
      sourceHash: source.hash,
      cacheDir: getSuperwardenCacheDir(tempDir, parentSkill.name),
    });
    const planSpy = vi.spyOn(coordinatorPlanModule, 'synthesizeCoordinatorPlan').mockResolvedValue({
      source: 'generated',
      cachePath,
      plan: {
        version: 1,
        skill: 'security-review',
        sourceHash: source.hash,
        coordinatorVersion: COORDINATOR_VERSION,
        synthesis: {
          phases: [{ id: 'collect-inputs', status: 'generated' }],
          externalSources: [],
        },
        tasks: [
          {
            id: 'authz',
            title: 'Authorization',
            scope: 'Find authorization boundary issues.',
            prompt: 'Review authorization boundaries.',
            evidenceRequirements: ['Trace the permission boundary.'],
            outOfScope: [],
          },
          {
            id: 'injection',
            title: 'Injection',
            scope: 'Find injection issues.',
            prompt: 'Review injection issues.',
            evidenceRequirements: ['Trace the data flow.'],
            outOfScope: [],
          },
        ],
      },
    });
    let active = 0;
    let maxActive = 0;
    const childSpy = vi.spyOn(childSkillsModule, 'synthesizeCoordinatorChildSkill').mockImplementation(async (args) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active--;
      return {
        source: 'generated',
        taskId: args.task.id,
        name: args.task.id,
        path: join(tempDir, 'generated', args.task.id),
        bytes: 1024,
        durationMs: 10,
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
          costUSD: 0.001,
        },
        externalSources: [],
        missingInputs: [],
      };
    });

    await createSkillTasks({
      specs: [spec],
      repoPath: tempDir,
      options: CLIOptionsSchema.parse({ parallel: 2 }),
      parallel: 2,
      reporter: new Reporter({ isTTY: true, supportsColor: false, columns: 80 }, Verbosity.Normal),
    });

    expect(mockRunWithLiveStatusList).toHaveBeenCalledWith(expect.objectContaining({
      concurrency: 2,
      items: expect.arrayContaining([
        expect.objectContaining({ childMessage: 'authz' }),
        expect.objectContaining({ childMessage: 'injection' }),
      ]),
    }));
    const parallelCall = mockRunWithLiveStatusList.mock.calls.at(-1)?.[0];
    expect(parallelCall?.getDoneDetail?.({
      source: 'cache',
    } as never, parallelCall.items[0], 0)).toBe('[cached]');
    expect(parallelCall?.showDoneDuration?.({
      source: 'cache',
    } as never, parallelCall.items[0], 0)).toBe(false);
    expect(parallelCall?.getDoneDetail?.({
      source: 'generated',
    } as never, parallelCall.items[1], 1)).toBe('[generated]');
    expect(parallelCall?.showDoneDuration?.({
      source: 'generated',
    } as never, parallelCall.items[1], 1)).toBe(true);
    expect(maxActive).toBe(2);
    childSpy.mockRestore();
    planSpy.mockRestore();
  });

  it('shows the task count in the task section header', async () => {
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const spec = await writeCachedSuperwardenFixture(tempDir);

    try {
      await createSkillTasks({
        specs: [spec],
        repoPath: tempDir,
        options: CLIOptionsSchema.parse({}),
        parallel: 4,
        reporter: new Reporter(detectOutputMode(false), Verbosity.Normal),
      });
      const output = stderrSpy.mock.calls.map(([line]) => String(line)).join('\n');
      expect(output).toContain('TASKS  1 task');
    } finally {
      stderrSpy.mockRestore();
    }
  });

  it('uses synthesisModel for Superwarden plan and child synthesis', async () => {
    const spec = await writeCachedSuperwardenFixture(tempDir);
    spec.runnerOptions = {
      model: 'claude-sonnet-4-5',
      synthesisModel: 'claude-opus-4-5',
      auxiliaryModel: 'claude-haiku-4-5',
      auxiliaryMaxRetries: 7,
    };

    const parentSkill = await resolveSkillAsync('security-review', tempDir);
    const source = collectCoordinatorSource(parentSkill);
    const fixtureCachePath = getCoordinatorPlanCachePath({
      skillName: parentSkill.name,
      sourceHash: source.hash,
      cacheDir: getSuperwardenCacheDir(tempDir, parentSkill.name),
    });
    const cachePath = getCoordinatorPlanCachePath({
      skillName: parentSkill.name,
      sourceHash: source.hash,
      model: 'claude-opus-4-5',
      cacheDir: getSuperwardenCacheDir(tempDir, parentSkill.name),
    });
    const cached = JSON.parse(readFileSync(fixtureCachePath, 'utf-8')) as { plan: CoordinatorPlan };
    const planSpy = vi.spyOn(coordinatorPlanModule, 'synthesizeCoordinatorPlan').mockResolvedValue({
      source: 'generated',
      cachePath,
      plan: cached.plan,
    });
    const childSpy = vi.spyOn(childSkillsModule, 'synthesizeCoordinatorChildSkill').mockResolvedValue({
      source: 'generated',
      taskId: 'authz',
      name: 'authz',
      path: join(tempDir, 'generated', 'authz'),
      bytes: 1024,
      durationMs: 2500,
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        costUSD: 0.001,
      },
      externalSources: [],
      missingInputs: [],
    });

    await createSkillTasks({
      specs: [spec],
      repoPath: tempDir,
      options: CLIOptionsSchema.parse({ quiet: true }),
      parallel: 4,
      reporter: new Reporter(detectOutputMode(false), Verbosity.Quiet),
    });

    expect(planSpy).toHaveBeenCalledWith(expect.objectContaining({
      model: 'claude-opus-4-5',
      repairModel: 'claude-haiku-4-5',
      repairMaxRetries: 7,
    }));
    expect(childSpy).toHaveBeenCalledWith(expect.objectContaining({
      model: 'claude-opus-4-5',
      repairModel: 'claude-haiku-4-5',
      repairMaxRetries: 7,
    }));
    planSpy.mockRestore();
    childSpy.mockRestore();
  });

  it('infers coordinator mode for explicit repo-local Superwarden skills', () => {
    const root = join(tempDir, '.warden', 'superwarden', 'security-review');
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'SKILL.md'), '---\nname: security-review\ndescription: Security review.\n---\n\nReview.\n');

    expect(inferExplicitSkillExecutionMode({
      repoPath: tempDir,
      skillName: 'security-review',
    })).toBe('coordinator');
    expect(inferExplicitSkillExecutionMode({
      configuredMode: 'direct',
      repoPath: tempDir,
      skillName: 'security-review',
    })).toBe('direct');
  });
});
