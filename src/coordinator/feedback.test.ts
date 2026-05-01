import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Finding } from '../types/index.js';
import type { CoordinatorPlan, CoordinatorSource } from './plan.js';
import {
  buildCoordinatorTaskSource,
  getCoordinatorPlanLessonsPath,
  getCoordinatorTaskLessonsPath,
  writeCoordinatorFeedbackLessons,
  type CoordinatorFeedbackRecord,
} from './feedback.js';

function createPlan(): CoordinatorPlan {
  return {
    version: 1,
    skill: 'security-review',
    sourceHash: 'parent-hash',
    coordinatorVersion: '2',
    synthesis: {
      phases: [{ id: 'collect-inputs', status: 'generated' }],
    },
    tasks: [
      {
        id: 'authz',
        title: 'Authorization',
        scope: 'Find missing authorization checks.',
        prompt: 'Review authorization boundaries.',
        evidenceRequirements: ['Trace the permission boundary.'],
        outOfScope: [],
      },
      {
        id: 'injection',
        title: 'Injection',
        scope: 'Find unsafe command execution.',
        prompt: 'Review command execution paths.',
        evidenceRequirements: ['Trace untrusted input into shell or exec calls.'],
        outOfScope: [],
      },
    ],
  };
}

function createFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'finding-1',
    severity: 'high',
    title: 'Authorization bypass',
    description: 'Missing authorization check on a write path.',
    location: {
      path: 'src/auth.ts',
      startLine: 12,
      endLine: 18,
    },
    ...overrides,
  };
}

describe('Superwarden feedback lessons', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-feedback-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes changed plan and task lessons, then becomes stable on a second pass', () => {
    const plan = createPlan();
    const records: CoordinatorFeedbackRecord[] = [
      {
        version: 1,
        fingerprint: 'plan-record',
        createdAt: '2026-04-30T12:00:00.000Z',
        skill: 'security-review',
        taskId: 'authz',
        verdict: 'wrong_task',
        target: { scope: 'plan' },
        note: 'Ownership between authz and injection needs clearer parent boundaries.',
        finding: createFinding(),
        source: {
          logPath: '.warden/logs/run-a.jsonl',
          reportedBySkill: 'authz',
        },
      },
      {
        version: 1,
        fingerprint: 'task-record',
        createdAt: '2026-04-30T12:05:00.000Z',
        skill: 'security-review',
        taskId: 'authz',
        verdict: 'false_positive',
        target: { scope: 'task', taskId: 'authz' },
        note: 'Do not report missing auth when the path is explicitly public.',
        finding: createFinding({
          id: 'finding-2',
          title: 'False auth finding',
        }),
        source: {
          logPath: '.warden/logs/run-b.jsonl',
          reportedBySkill: 'authz',
        },
      },
    ];

    const first = writeCoordinatorFeedbackLessons({
      skillRoot: tempDir,
      skillName: 'security-review',
      plan,
      records,
    });

    expect(first.planChanged).toBe(true);
    expect(first.changedTaskIds).toEqual(['authz']);
    expect(readFileSync(getCoordinatorPlanLessonsPath(tempDir), 'utf-8')).toContain('Ownership between authz and injection');
    expect(readFileSync(getCoordinatorTaskLessonsPath(tempDir, 'authz'), 'utf-8')).toContain('explicitly public');

    const second = writeCoordinatorFeedbackLessons({
      skillRoot: tempDir,
      skillName: 'security-review',
      plan,
      records,
    });

    expect(second.planChanged).toBe(false);
    expect(second.changedTaskIds).toEqual([]);
  });

  it('extends child synthesis source with only the selected task lessons', () => {
    const plan = createPlan();
    writeCoordinatorFeedbackLessons({
      skillRoot: tempDir,
      skillName: 'security-review',
      plan,
      records: [{
        version: 1,
        fingerprint: 'task-record',
        createdAt: '2026-04-30T12:05:00.000Z',
        skill: 'security-review',
        taskId: 'authz',
        verdict: 'false_positive',
        target: { scope: 'task', taskId: 'authz' },
        note: 'Do not report missing auth when the path is explicitly public.',
        finding: createFinding(),
        source: {
          logPath: '.warden/logs/run-b.jsonl',
          reportedBySkill: 'authz',
        },
      }],
    });

    const source: CoordinatorSource = {
      hash: 'parent-hash',
      files: [{ path: 'SKILL.md', content: 'Review security issues.' }],
    };

    const authzSource = buildCoordinatorTaskSource(source, tempDir, 'authz');
    const injectionSource = buildCoordinatorTaskSource(source, tempDir, 'injection');

    expect(authzSource.hash).not.toBe(source.hash);
    expect(authzSource.files.map((file) => file.path)).toContain('feedback/tasks/authz/lessons.md');
    expect(injectionSource).toEqual(source);
  });
});
