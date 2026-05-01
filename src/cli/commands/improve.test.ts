import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CLIOptions } from '../args.js';
import { Reporter } from '../output/reporter.js';
import { detectOutputMode } from '../output/tty.js';
import { Verbosity } from '../output/verbosity.js';
import { runImprove } from './improve.js';
import { prepareSuperwardenArtifacts } from '../superwarden.js';
import { promptLine } from '../input.js';
import {
  appendCoordinatorFeedbackRecords,
  getCoordinatorFeedbackRecordsPath,
  getCoordinatorPlanLessonsPath,
  getCoordinatorTaskLessonsPath,
  writeCoordinatorFeedbackLessons,
  type CoordinatorFeedbackRecord,
} from '../../coordinator/feedback.js';
import {
  COORDINATOR_PLAN_SCHEMA_VERSION,
  COORDINATOR_VERSION,
  type CoordinatorPlan,
} from '../../coordinator/plan.js';
import { getSuperwardenSkillRoot } from '../../coordinator/superwarden.js';

vi.mock('../superwarden.js', async () => {
  const actual = await vi.importActual('../superwarden.js') as Record<string, unknown>;
  return {
    ...actual,
    prepareSuperwardenArtifacts: vi.fn(),
  };
});

vi.mock('../input.js', () => ({
  promptLine: vi.fn(),
}));

const mockPrepareSuperwardenArtifacts = vi.mocked(prepareSuperwardenArtifacts);
const mockPromptLine = vi.mocked(promptLine);

function createOptions(overrides: Partial<CLIOptions> = {}): CLIOptions {
  return {
    json: false,
    help: false,
    quiet: false,
    verbose: 0,
    debug: false,
    log: false,
    fix: false,
    force: false,
    list: false,
    git: false,
    staged: false,
    offline: false,
    failFast: false,
    showPlan: false,
    regenerate: false,
    ...overrides,
  };
}

function createPlan(): CoordinatorPlan {
  return {
    version: COORDINATOR_PLAN_SCHEMA_VERSION,
    skill: 'security',
    sourceHash: 'hash',
    coordinatorVersion: COORDINATOR_VERSION,
    scopeProfile: {
      kind: 'repository',
      subject: 'Security review for runtime and workflow boundaries',
      localContextUsed: true,
      observedContext: ['Node.js and TypeScript runtime', 'Workflow permission boundaries'],
      unresolvedContext: [],
    },
    synthesis: {
      phases: [{ id: 'collect-inputs', status: 'cached' }],
    },
    tasks: [
      {
        id: 'authz',
        title: 'Authorization',
        goal: 'Find missing authorization checks.',
        rationale: 'This repo gates privileged actions and workflow execution.',
        sourceSignals: ['Workflow permission boundaries', 'Privileged runtime operations'],
        owns: ['Authorization boundary failures'],
        excludes: [],
        evidenceFocus: ['Trace the permission boundary.'],
        childResearchHints: ['Framework authorization guidance'],
      },
      {
        id: 'injection',
        title: 'Injection',
        goal: 'Find unsafe command execution.',
        rationale: 'This repo shells out and brokers external tool execution.',
        sourceSignals: ['Subprocess execution surfaces', 'Tool invocation boundaries'],
        owns: ['Command execution and shell injection'],
        excludes: [],
        evidenceFocus: ['Trace untrusted input into command execution.'],
        childResearchHints: ['Node subprocess security guidance'],
      },
    ],
  };
}

function writeLocalSuperwardenSkill(root: string, name: string): void {
  const skillRoot = getSuperwardenSkillRoot(root, name);
  mkdirSync(skillRoot, { recursive: true });
  writeFileSync(
    join(skillRoot, 'SKILL.md'),
    `---
name: ${name}
description: Review security issues.
---

Review security issues.
`,
    'utf-8',
  );
}

function writeJsonlLog(root: string): string {
  const logPath = join(root, 'run.jsonl');
  writeFileSync(
    logPath,
    `${JSON.stringify({
      run: {
        timestamp: '2026-04-30T18:00:00.000Z',
        durationMs: 1_000,
        cwd: root,
        runId: 'run-123',
      },
      skill: 'authz',
      summary: 'Found 1 issue',
      findings: [{
        id: 'AUTH-1',
        severity: 'high',
        title: 'Missing authorization check',
        description: 'A write path lacks an authorization guard.',
        location: {
          path: 'src/auth.ts',
          startLine: 12,
          endLine: 16,
        },
      }],
      durationMs: 800,
    })}\n`,
    'utf-8',
  );
  return logPath;
}

describe('improve command', () => {
  const originalCwd = process.cwd();
  const originalIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  const originalError = console.error;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-improve-test-'));
    process.chdir(tempDir);
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    writeLocalSuperwardenSkill(tempDir, 'security');
    Object.defineProperty(process.stdin, 'isTTY', {
      configurable: true,
      value: true,
    });
    console.error = vi.fn();
    mockPrepareSuperwardenArtifacts.mockReset();
    mockPromptLine.mockReset();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    console.error = originalError;
    if (originalIsTTY) {
      Object.defineProperty(process.stdin, 'isTTY', originalIsTTY);
    }
    rmSync(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('records task-local feedback and regenerates only affected child tasks', async () => {
    const plan = createPlan();
    const logPath = writeJsonlLog(tempDir);
    const skillRoot = getSuperwardenSkillRoot(tempDir, 'security');

    mockPrepareSuperwardenArtifacts.mockImplementation(async (args) => {
      if (args.showPlanOnly) {
        return {
          skill: { name: 'security', description: 'Review security issues.', prompt: 'Review security issues.', rootDir: skillRoot },
          source: { hash: 'hash', files: [] },
          artifactRoot: skillRoot,
          planCachePath: join(skillRoot, 'plan.json'),
          planCacheHit: true,
          planResult: {
            plan,
            source: 'cache',
            cachePath: join(skillRoot, 'plan.json'),
          },
          planDurationMs: 10,
          childArtifacts: [],
        };
      }

      expect(args.taskIds).toEqual(['authz']);
      expect(args.regenerateChildTasks).toBe(true);
      expect(args.regenerate).toBeUndefined();
      return {
        skill: { name: 'security', description: 'Review security issues.', prompt: 'Review security issues.', rootDir: skillRoot },
        source: { hash: 'hash', files: [] },
        artifactRoot: skillRoot,
        planCachePath: join(skillRoot, 'plan.json'),
        planCacheHit: true,
        planResult: {
          plan,
          source: 'cache',
          cachePath: join(skillRoot, 'plan.json'),
        },
        planDurationMs: 10,
        childArtifacts: [{
          source: 'generated',
          taskId: 'authz',
          name: 'authz',
          path: join(skillRoot, 'tasks', 'authz'),
          bytes: 1_024,
          durationMs: 2_500,
          usage: {
            inputTokens: 100,
            outputTokens: 50,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
            costUSD: 0.01,
          },
          externalSources: [],
          missingInputs: [],
        }],
      };
    });

    mockPromptLine
      .mockResolvedValueOnce('f')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('Avoid reporting explicitly public routes.');

    const exitCode = await runImprove(
      createOptions({
        skill: 'security',
        from: [logPath],
      }),
      new Reporter(detectOutputMode(false), Verbosity.Normal),
    );

    expect(exitCode).toBe(0);
    expect(mockPrepareSuperwardenArtifacts).toHaveBeenCalledTimes(2);
    const records = readFileSync(getCoordinatorFeedbackRecordsPath(skillRoot), 'utf-8');
    expect(records).toContain('"verdict":"false_positive"');
    expect(records).toContain('"reportedBySkill":"authz"');
    expect(readFileSync(getCoordinatorTaskLessonsPath(skillRoot, 'authz'), 'utf-8')).toContain('explicitly public routes');
    expect(existsSync(getCoordinatorPlanLessonsPath(skillRoot))).toBe(false);
  });

  it('records plan-level feedback and regenerates the full plan', async () => {
    const plan = createPlan();
    const logPath = writeJsonlLog(tempDir);
    const skillRoot = getSuperwardenSkillRoot(tempDir, 'security');

    mockPrepareSuperwardenArtifacts.mockImplementation(async (args) => {
      if (args.showPlanOnly) {
        return {
          skill: { name: 'security', description: 'Review security issues.', prompt: 'Review security issues.', rootDir: skillRoot },
          source: { hash: 'hash', files: [] },
          artifactRoot: skillRoot,
          planCachePath: join(skillRoot, 'plan.json'),
          planCacheHit: true,
          planResult: {
            plan,
            source: 'cache',
            cachePath: join(skillRoot, 'plan.json'),
          },
          planDurationMs: 10,
          childArtifacts: [],
        };
      }

      expect(args.regenerate).toBe(true);
      expect(args.taskIds).toBeUndefined();
      expect(args.previousPlan?.tasks.map((task) => task.id)).toEqual(['authz', 'injection']);
      return {
        skill: { name: 'security', description: 'Review security issues.', prompt: 'Review security issues.', rootDir: skillRoot },
        source: { hash: 'hash', files: [] },
        artifactRoot: skillRoot,
        planCachePath: join(skillRoot, 'plan.json'),
        planCacheHit: false,
        planResult: {
          plan,
          source: 'generated',
          cachePath: join(skillRoot, 'plan.json'),
          durationMs: 4_200,
        },
        planDurationMs: 4_200,
        childArtifacts: [{
          source: 'generated',
          taskId: 'authz',
          name: 'authz',
          path: join(skillRoot, 'tasks', 'authz'),
          bytes: 1_024,
          durationMs: 2_500,
          usage: {
            inputTokens: 100,
            outputTokens: 50,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
            costUSD: 0.01,
          },
          externalSources: [],
          missingInputs: [],
        }],
      };
    });

    mockPromptLine
      .mockResolvedValueOnce('d')
      .mockResolvedValueOnce('plan')
      .mockResolvedValueOnce('Tighten parent ownership boundaries between authz and injection.');

    const exitCode = await runImprove(
      createOptions({
        skill: 'security',
        from: [logPath],
      }),
      new Reporter(detectOutputMode(false), Verbosity.Normal),
    );

    expect(exitCode).toBe(0);
    expect(mockPrepareSuperwardenArtifacts).toHaveBeenCalledTimes(2);
    expect(readFileSync(getCoordinatorPlanLessonsPath(skillRoot), 'utf-8')).toContain('ownership boundaries');
  });

  it('reconciles task lessons against regenerated plan tasks after plan-level feedback', async () => {
    const plan = createPlan();
    const regeneratedPlan: CoordinatorPlan = {
      ...plan,
      tasks: [
        {
          ...plan.tasks[0]!,
          id: 'authorization',
          title: 'Authorization Checks',
        },
      ],
    };
    const logPath = writeJsonlLog(tempDir);
    const skillRoot = getSuperwardenSkillRoot(tempDir, 'security');
    const existingTaskRecord: CoordinatorFeedbackRecord = {
      version: 1,
      fingerprint: 'existing-authz-record',
      createdAt: '2026-04-30T17:00:00.000Z',
      skill: 'security',
      taskId: 'authz',
      verdict: 'false_positive',
      target: { scope: 'task', taskId: 'authz' },
      note: 'Do not report explicitly public routes.',
      finding: {
        id: 'AUTH-EXISTING',
        severity: 'high',
        title: 'Existing authorization false positive',
        description: 'An existing task-local lesson.',
        location: {
          path: 'src/auth.ts',
          startLine: 20,
          endLine: 24,
        },
      },
      source: {
        logPath: '.warden/logs/existing.jsonl',
        reportedBySkill: 'authz',
      },
    };
    appendCoordinatorFeedbackRecords(skillRoot, [existingTaskRecord]);
    writeCoordinatorFeedbackLessons({
      skillRoot,
      skillName: 'security',
      plan,
      records: [existingTaskRecord],
    });

    mockPrepareSuperwardenArtifacts.mockImplementation(async (args) => {
      if (args.showPlanOnly) {
        return {
          skill: { name: 'security', description: 'Review security issues.', prompt: 'Review security issues.', rootDir: skillRoot },
          source: { hash: 'hash', files: [] },
          artifactRoot: skillRoot,
          planCachePath: join(skillRoot, 'plan.json'),
          planCacheHit: true,
          planResult: {
            plan,
            source: 'cache',
            cachePath: join(skillRoot, 'plan.json'),
          },
          planDurationMs: 10,
          childArtifacts: [],
        };
      }

      expect(args.regenerate).toBe(true);
      expect(args.previousPlan?.tasks.map((task) => task.id)).toEqual(['authz', 'injection']);
      return {
        skill: { name: 'security', description: 'Review security issues.', prompt: 'Review security issues.', rootDir: skillRoot },
        source: { hash: 'hash', files: [] },
        artifactRoot: skillRoot,
        planCachePath: join(skillRoot, 'plan.json'),
        planCacheHit: false,
        planResult: {
          plan: regeneratedPlan,
          source: 'generated',
          cachePath: join(skillRoot, 'plan.json'),
          durationMs: 4_200,
        },
        planDurationMs: 4_200,
        childArtifacts: [{
          source: 'generated',
          taskId: 'authorization',
          name: 'authorization',
          path: join(skillRoot, 'tasks', 'authorization'),
          bytes: 1_024,
          durationMs: 2_500,
          usage: {
            inputTokens: 100,
            outputTokens: 50,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
            costUSD: 0.01,
          },
          externalSources: [],
          missingInputs: [],
        }],
      };
    });

    mockPromptLine
      .mockResolvedValueOnce('d')
      .mockResolvedValueOnce('plan')
      .mockResolvedValueOnce('Tighten parent ownership boundaries between tasks.');

    const exitCode = await runImprove(
      createOptions({
        skill: 'security',
        from: [logPath],
      }),
      new Reporter(detectOutputMode(false), Verbosity.Normal),
    );

    expect(exitCode).toBe(0);
    expect(mockPrepareSuperwardenArtifacts).toHaveBeenCalledTimes(2);
    expect(existsSync(getCoordinatorTaskLessonsPath(skillRoot, 'authz'))).toBe(false);
    expect(readFileSync(getCoordinatorFeedbackRecordsPath(skillRoot), 'utf-8')).toContain('"existing-authz-record"');
    expect(readFileSync(getCoordinatorPlanLessonsPath(skillRoot), 'utf-8')).toContain('parent ownership boundaries');
  });
});
