import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { FindingSchema, SeveritySchema, type Finding } from '../types/index.js';
import type { CoordinatorPlan, CoordinatorSource, CoordinatorSourceFile } from './plan.js';

export const COORDINATOR_FEEDBACK_DIR = 'feedback';
export const COORDINATOR_FEEDBACK_RECORDS_FILE = 'records.jsonl';
export const COORDINATOR_PLAN_LESSONS_FILE = 'plan-lessons.md';
const COORDINATOR_TASK_LESSONS_FILE = 'lessons.md';

export const CoordinatorFeedbackVerdictSchema = z.enum([
  'confirmed_finding',
  'false_positive',
  'severity_wrong',
  'duplicate',
  'wrong_task',
  'missed_issue',
]);
export type CoordinatorFeedbackVerdict = z.infer<typeof CoordinatorFeedbackVerdictSchema>;

const CoordinatorFeedbackTargetSchema = z.object({
  scope: z.enum(['plan', 'task']),
  taskId: z.string().min(1).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.scope === 'task' && !value.taskId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'taskId is required when target.scope is "task"',
      path: ['taskId'],
    });
  }
  if (value.scope === 'plan' && value.taskId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'taskId is not allowed when target.scope is "plan"',
      path: ['taskId'],
    });
  }
});

const CoordinatorFeedbackSourceSchema = z.object({
  logPath: z.string().min(1),
  runId: z.string().min(1).optional(),
  reportedBySkill: z.string().min(1),
  model: z.string().min(1).optional(),
  headSha: z.string().min(1).optional(),
}).strict();

export const CoordinatorFeedbackRecordSchema = z.object({
  version: z.literal(1),
  fingerprint: z.string().min(1),
  createdAt: z.string().datetime(),
  skill: z.string().min(1),
  taskId: z.string().min(1).optional(),
  verdict: CoordinatorFeedbackVerdictSchema,
  target: CoordinatorFeedbackTargetSchema,
  note: z.string().min(1),
  expectedSeverity: SeveritySchema.optional(),
  finding: FindingSchema,
  source: CoordinatorFeedbackSourceSchema,
}).strict();
export type CoordinatorFeedbackRecord = z.infer<typeof CoordinatorFeedbackRecordSchema>;

interface VerdictGroup {
  label: string;
  records: CoordinatorFeedbackRecord[];
}

export interface WriteCoordinatorFeedbackLessonsResult {
  planLessonsPath?: string;
  taskLessonPaths: string[];
  planChanged: boolean;
  changedTaskIds: string[];
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function writeTextFileIfChanged(path: string, content: string): boolean {
  const existing = existsSync(path) ? readFileSync(path, 'utf-8') : undefined;
  if (existing === content) {
    return false;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf-8');
  return true;
}

function bulletLines(value: string, indent: string): string[] {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return [];
  }

  const width = 100 - indent.length;
  const lines: string[] = [];
  let remaining = normalized;
  while (remaining.length > width) {
    let breakAt = remaining.lastIndexOf(' ', width);
    if (breakAt < Math.floor(width / 2)) {
      breakAt = width;
    }
    lines.push(`${lines.length === 0 ? indent : `${indent}  `}${remaining.slice(0, breakAt).trimEnd()}`);
    remaining = remaining.slice(breakAt).trimStart();
  }
  lines.push(`${lines.length === 0 ? indent : `${indent}  `}${remaining}`);
  return lines;
}

function findingLocationText(finding: Finding): string | undefined {
  if (!finding.location) {
    return undefined;
  }
  const end = finding.location.endLine ? `-${finding.location.endLine}` : '';
  return `${finding.location.path}:${finding.location.startLine}${end}`;
}

function verdictHeading(verdict: CoordinatorFeedbackVerdict): string {
  switch (verdict) {
    case 'confirmed_finding':
      return 'Confirmed Findings';
    case 'false_positive':
      return 'False Positives To Avoid';
    case 'severity_wrong':
      return 'Severity Calibration';
    case 'duplicate':
      return 'Duplicate Or Overlap Reports';
    case 'wrong_task':
      return 'Ownership Corrections';
    case 'missed_issue':
      return 'Missed Issues';
  }
}

function verdictSummaryText(verdict: CoordinatorFeedbackVerdict): string {
  switch (verdict) {
    case 'confirmed_finding':
      return 'validated signals worth reinforcing';
    case 'false_positive':
      return 'cases the skill should avoid reporting again';
    case 'severity_wrong':
      return 'findings where the severity or confidence needs calibration';
    case 'duplicate':
      return 'cases where task overlap created redundant reports';
    case 'wrong_task':
      return 'cases where ownership belonged to a different task or the parent plan';
    case 'missed_issue':
      return 'known misses that should become new detection behavior';
  }
}

function sortRecords(records: CoordinatorFeedbackRecord[]): CoordinatorFeedbackRecord[] {
  return [...records].sort((a, b) => {
    const time = a.createdAt.localeCompare(b.createdAt);
    if (time !== 0) {
      return time;
    }
    return a.fingerprint.localeCompare(b.fingerprint);
  });
}

function renderFeedbackGroups(records: CoordinatorFeedbackRecord[]): string {
  const orderedVerdicts: CoordinatorFeedbackVerdict[] = [
    'confirmed_finding',
    'false_positive',
    'severity_wrong',
    'duplicate',
    'wrong_task',
    'missed_issue',
  ];
  const groups: VerdictGroup[] = orderedVerdicts
    .map((verdict) => ({
      label: verdictHeading(verdict),
      records: sortRecords(records.filter((record) => record.verdict === verdict)),
    }))
    .filter((group) => group.records.length > 0);

  if (groups.length === 0) {
    return '## Summary\n\n- No stored feedback yet.\n';
  }

  const lines: string[] = ['## Summary', ''];
  for (const verdict of orderedVerdicts) {
    const groupRecords = records.filter((record) => record.verdict === verdict);
    if (groupRecords.length === 0) {
      continue;
    }
    lines.push(`- ${groupRecords.length} ${verdictSummaryText(verdict)}.`);
  }

  for (const group of groups) {
    lines.push('');
    lines.push(`## ${group.label}`);
    lines.push('');
    for (const record of group.records) {
      const location = findingLocationText(record.finding);
      const detailBits = [
        record.finding.severity,
        record.expectedSeverity ? `expected ${record.expectedSeverity}` : undefined,
        location,
        record.source.reportedBySkill !== record.taskId ? `reported by ${record.source.reportedBySkill}` : undefined,
      ].filter((bit): bit is string => Boolean(bit));
      lines.push(`- ${record.finding.title}${detailBits.length > 0 ? ` (${detailBits.join(' · ')})` : ''}`);
      lines.push(...bulletLines(record.note, '  '));
    }
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}

function renderPlanLessons(skillName: string, records: CoordinatorFeedbackRecord[]): string {
  return `# ${skillName} Plan Lessons

Generated from \`${COORDINATOR_FEEDBACK_DIR}/${COORDINATOR_FEEDBACK_RECORDS_FILE}\`.
Do not edit by hand. Update feedback records and regenerate instead.

Use this file to improve parent-task decomposition, boundaries, overlap, and
ownership. Prefer plan-level constraints here; task-local implementation detail
belongs in per-task lesson files.

${renderFeedbackGroups(records)}`;
}

function renderTaskLessons(skillName: string, taskId: string, records: CoordinatorFeedbackRecord[]): string {
  return `# ${taskId} Feedback Lessons

Parent Superwarden skill: \`${skillName}\`

Generated from \`${COORDINATOR_FEEDBACK_DIR}/${COORDINATOR_FEEDBACK_RECORDS_FILE}\`.
Do not edit by hand. Update feedback records and regenerate instead.

Use this file to improve task-local precision, examples, exclusions, severity
calibration, and evidence expectations for \`${taskId}\`.

${renderFeedbackGroups(records)}`;
}

/** Return the feedback root for a Superwarden skill. */
export function getCoordinatorFeedbackRoot(skillRoot: string): string {
  return join(skillRoot, COORDINATOR_FEEDBACK_DIR);
}

/** Return the append-only records path for Superwarden improvement feedback. */
export function getCoordinatorFeedbackRecordsPath(skillRoot: string): string {
  return join(getCoordinatorFeedbackRoot(skillRoot), COORDINATOR_FEEDBACK_RECORDS_FILE);
}

/** Return the distilled parent-plan lesson path for a Superwarden skill. */
export function getCoordinatorPlanLessonsPath(skillRoot: string): string {
  return join(getCoordinatorFeedbackRoot(skillRoot), COORDINATOR_PLAN_LESSONS_FILE);
}

/** Return the distilled lesson path for one Superwarden task. */
export function getCoordinatorTaskLessonsPath(skillRoot: string, taskId: string): string {
  return join(getCoordinatorFeedbackRoot(skillRoot), 'tasks', taskId, COORDINATOR_TASK_LESSONS_FILE);
}

/** Build a stable fingerprint for one imported feedback record. */
export function buildCoordinatorFeedbackFingerprint(args: {
  skill: string;
  finding: Finding;
  reportedBySkill: string;
  runId?: string;
  verdict: CoordinatorFeedbackVerdict;
  target?: {
    scope: 'plan' | 'task';
    taskId?: string;
  };
}): string {
  return sha256(JSON.stringify({
    skill: args.skill,
    runId: args.runId,
    reportedBySkill: args.reportedBySkill,
    verdict: args.verdict,
    target: args.target,
    finding: {
      id: args.finding.id,
      title: args.finding.title,
      severity: args.finding.severity,
      location: args.finding.location,
      additionalLocations: args.finding.additionalLocations,
    },
  }));
}

/** Load all stored feedback records for one Superwarden skill. */
export function loadCoordinatorFeedbackRecords(skillRoot: string): CoordinatorFeedbackRecord[] {
  const path = getCoordinatorFeedbackRecordsPath(skillRoot);
  if (!existsSync(path)) {
    return [];
  }

  const lines = readFileSync(path, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const records: CoordinatorFeedbackRecord[] = [];
  for (const line of lines) {
    const parsed = JSON.parse(line);
    records.push(CoordinatorFeedbackRecordSchema.parse(parsed));
  }
  return records;
}

/** Append new feedback records to the durable append-only JSONL store. */
export function appendCoordinatorFeedbackRecords(skillRoot: string, records: CoordinatorFeedbackRecord[]): void {
  if (records.length === 0) {
    return;
  }
  const path = getCoordinatorFeedbackRecordsPath(skillRoot);
  mkdirSync(dirname(path), { recursive: true });
  const existing = existsSync(path) ? readFileSync(path, 'utf-8') : '';
  const prefix = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
  const content = records.map((record) => `${JSON.stringify(record)}\n`).join('');
  writeFileSync(path, `${existing}${prefix}${content}`, 'utf-8');
}

/** Distill append-only feedback records into synthesis-ready markdown lessons. */
export function writeCoordinatorFeedbackLessons(args: {
  skillRoot: string;
  skillName: string;
  plan: CoordinatorPlan;
  records: CoordinatorFeedbackRecord[];
}): WriteCoordinatorFeedbackLessonsResult {
  const { skillRoot, skillName, plan, records } = args;
  const feedbackRoot = getCoordinatorFeedbackRoot(skillRoot);
  mkdirSync(feedbackRoot, { recursive: true });

  const planRecords = sortRecords(records.filter((record) => record.target.scope === 'plan'));
  const planLessonsPath = getCoordinatorPlanLessonsPath(skillRoot);
  let planChanged = false;
  if (planRecords.length > 0) {
    planChanged = writeTextFileIfChanged(planLessonsPath, renderPlanLessons(skillName, planRecords));
  } else if (existsSync(planLessonsPath)) {
    rmSync(planLessonsPath, { force: true });
    planChanged = true;
  }

  const expectedTaskIds = new Set(plan.tasks.map((task) => task.id));
  const taskLessonsRoot = join(feedbackRoot, 'tasks');
  const taskLessonPaths: string[] = [];
  const activeTaskLessonDirs = new Set<string>();
  const changedTaskIds = new Set<string>();

  for (const taskId of expectedTaskIds) {
    const taskRecords = sortRecords(records.filter((record) => record.target.scope === 'task' && record.target.taskId === taskId));
    const taskLessonsPath = getCoordinatorTaskLessonsPath(skillRoot, taskId);
    if (taskRecords.length === 0) {
      if (existsSync(taskLessonsPath)) {
        rmSync(dirname(taskLessonsPath), { recursive: true, force: true });
        changedTaskIds.add(taskId);
      }
      continue;
    }

    if (writeTextFileIfChanged(taskLessonsPath, renderTaskLessons(skillName, taskId, taskRecords))) {
      changedTaskIds.add(taskId);
    }
    taskLessonPaths.push(taskLessonsPath);
    activeTaskLessonDirs.add(dirname(taskLessonsPath));
  }

  if (existsSync(taskLessonsRoot)) {
    for (const entry of readdirSync(taskLessonsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const entryPath = join(taskLessonsRoot, entry.name);
      if (!activeTaskLessonDirs.has(entryPath) && !expectedTaskIds.has(entry.name)) {
        rmSync(entryPath, { recursive: true, force: true });
      }
    }
  }

  return {
    planLessonsPath: planRecords.length > 0 ? planLessonsPath : undefined,
    taskLessonPaths,
    planChanged,
    changedTaskIds: [...changedTaskIds].sort(),
  };
}

/** Collect plan-level lesson markdown for parent Superwarden synthesis. */
export function collectCoordinatorPlanFeedbackFiles(skillRoot: string): CoordinatorSourceFile[] {
  const files: CoordinatorSourceFile[] = [];
  const planLessonsPath = getCoordinatorPlanLessonsPath(skillRoot);
  if (existsSync(planLessonsPath)) {
    files.push({
      path: `${COORDINATOR_FEEDBACK_DIR}/${COORDINATOR_PLAN_LESSONS_FILE}`,
      content: readFileSync(planLessonsPath, 'utf-8'),
    });
  }
  return files;
}

/** Collect one task's lesson markdown for child Superwarden synthesis. */
export function collectCoordinatorTaskFeedbackFiles(skillRoot: string, taskId: string): CoordinatorSourceFile[] {
  const taskLessonsPath = getCoordinatorTaskLessonsPath(skillRoot, taskId);
  if (!existsSync(taskLessonsPath)) {
    return [];
  }

  return [{
    path: `${COORDINATOR_FEEDBACK_DIR}/tasks/${taskId}/${COORDINATOR_TASK_LESSONS_FILE}`,
    content: readFileSync(taskLessonsPath, 'utf-8'),
  }];
}

/** Extend a parent Superwarden source bundle with task-local feedback files. */
export function buildCoordinatorTaskSource(
  source: CoordinatorSource,
  skillRoot: string | undefined,
  taskId: string,
): CoordinatorSource {
  if (!skillRoot) {
    return source;
  }

  const taskFiles = collectCoordinatorTaskFeedbackFiles(skillRoot, taskId);
  if (taskFiles.length === 0) {
    return source;
  }

  return {
    hash: sha256(JSON.stringify({
      parentHash: source.hash,
      taskId,
      files: taskFiles,
    })),
    files: [...source.files, ...taskFiles],
  };
}
