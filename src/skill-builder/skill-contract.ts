import { z } from 'zod';
import {
  SKILL_BUILDER_GENERIC_REFERENCE_BASENAMES,
  SKILL_BUILDER_REFERENCE_ROLES,
  SKILL_BUILDER_REQUIRED_EXAMPLES_HEADINGS,
  SKILL_BUILDER_REQUIRED_PROCEDURE_HEADINGS,
  type SkillBuilderReferenceRole,
} from './skill-writer-guidance.js';
import type { UsageStats } from '../types/index.js';

const MAX_TRACK_REFERENCE_FILES = 6;

export interface SkillBuildExternalSource {
  title: string;
  url: string;
  reason: string;
}

const REQUIRED_CHECKLIST_INDEX_HEADINGS = [
  '## How To Use This Checklist',
  '## Track Index',
] as const;

export const SkillBuilderReferenceRoleSchema = z.enum(SKILL_BUILDER_REFERENCE_ROLES);

const REFERENCE_ROLE_ORDER: Record<SkillBuilderReferenceRole, number> = {
  procedure: 0,
  'decision-guide': 1,
  'reference-table': 2,
  troubleshooting: 3,
  examples: 4,
};

function hasMarkdownHeading(markdown: string, heading: string): boolean {
  return markdown.includes(`${heading}\n`) || markdown.endsWith(heading);
}

function hasLevelTwoHeading(markdown: string): boolean {
  return /^##\s+\S.+$/m.test(markdown);
}

export function isValidChecklistIndexMarkdown(markdown: string): boolean {
  const trimmed = markdown.trim();
  if (!trimmed.startsWith('# ') || !trimmed.includes(' Checklist')) {
    return false;
  }
  return REQUIRED_CHECKLIST_INDEX_HEADINGS.every((heading) => hasMarkdownHeading(trimmed, heading));
}

function isValidReferencePath(path: string): boolean {
  if (!/^references\/[a-z0-9][a-z0-9._/-]*\.md$/.test(path)) {
    return false;
  }
  if (path.includes('..') || path.includes('//')) {
    return false;
  }
  const basename = path.split('/').at(-1)?.toLowerCase();
  if (!basename) {
    return false;
  }
  return !SKILL_BUILDER_GENERIC_REFERENCE_BASENAMES.has(basename);
}

function validateProcedureReference(markdown: string): boolean {
  const trimmed = markdown.trim();
  if (!trimmed.startsWith('# ')) {
    return false;
  }
  return SKILL_BUILDER_REQUIRED_PROCEDURE_HEADINGS.every((heading) => hasMarkdownHeading(trimmed, heading));
}

function validateExamplesReference(markdown: string): boolean {
  const trimmed = markdown.trim();
  if (!trimmed.startsWith('# ')) {
    return false;
  }
  return SKILL_BUILDER_REQUIRED_EXAMPLES_HEADINGS.every((heading) => hasMarkdownHeading(trimmed, heading));
}

function minimumReferenceLength(role: SkillBuilderReferenceRole): number {
  switch (role) {
    case 'procedure':
      return 180;
    case 'examples':
      return 140;
    default:
      return 100;
  }
}

export function isValidReferenceMarkdown(markdown: string, role: SkillBuilderReferenceRole): boolean {
  const trimmed = markdown.trim();
  if (!trimmed.startsWith('# ') || !trimmed.includes('\n')) {
    return false;
  }
  if (trimmed.startsWith('references/')) {
    return false;
  }

  switch (role) {
    case 'procedure':
      return validateProcedureReference(trimmed);
    case 'examples':
      return validateExamplesReference(trimmed);
    default:
      return hasLevelTwoHeading(trimmed);
  }
}

function invalidReferenceMarkdownMessage(role: SkillBuilderReferenceRole): string {
  if (role === 'procedure') {
    return (
      'Procedure references must contain the required sections: ' +
      `${SKILL_BUILDER_REQUIRED_PROCEDURE_HEADINGS.join(', ')}`
    );
  }
  if (role === 'examples') {
    return (
      'Examples references must contain the required sections: ' +
      `${SKILL_BUILDER_REQUIRED_EXAMPLES_HEADINGS.join(', ')}`
    );
  }
  return 'Reference markdown must answer one focused lookup need with a real heading structure.';
}

export function referenceSort(
  a: { role: SkillBuilderReferenceRole; path: string },
  b: { role: SkillBuilderReferenceRole; path: string },
): number {
  const roleOrder = REFERENCE_ROLE_ORDER[a.role] - REFERENCE_ROLE_ORDER[b.role];
  if (roleOrder !== 0) {
    return roleOrder;
  }
  return a.path.localeCompare(b.path);
}

export const GeneratedSkillChecklistIndexMarkdownSchema = z.string()
  .min(200, 'Checklist index markdown must contain the full checklist index, not a placeholder or path')
  .refine(
    (value) => isValidChecklistIndexMarkdown(value),
    'Checklist index markdown must contain ## How To Use This Checklist and ## Track Index',
  );

export const GeneratedSkillReferenceFileSchema = z.object({
  path: z.string()
    .min(1)
    .refine(
      (value) => isValidReferencePath(value),
      'Reference paths must live under references/, end in .md, and avoid vague names like notes.md or context.md',
    ),
  title: z.string().min(1),
  role: SkillBuilderReferenceRoleSchema,
  openWhen: z.string().min(1),
  markdown: z.string().min(1),
}).strict().superRefine((value, ctx) => {
  if (value.markdown.trim().length < minimumReferenceLength(value.role)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['markdown'],
      message: `${value.role} references must contain the full file contents, not a placeholder or path`,
    });
  }
  if (!isValidReferenceMarkdown(value.markdown, value.role)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['markdown'],
      message: invalidReferenceMarkdownMessage(value.role),
    });
  }
});

export const GeneratedSkillScaffoldSchema = z.object({
  version: z.literal(1),
  skill: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  skillBody: z.string().min(1),
  specMd: z.string().min(1),
  sourcesMd: z.string().min(1),
  externalSources: z.array(z.object({
    title: z.string().min(1),
    url: z.string().min(1),
    reason: z.string().min(1),
  }).strict()).default([]),
  missingInputs: z.array(z.string().min(1)).default([]),
}).strict();

export type GeneratedSkillScaffold = z.infer<typeof GeneratedSkillScaffoldSchema>;

export const SkillBuildTrackReferenceSchema = z.object({
  version: z.literal(1),
  skill: z.string().min(1),
  trackId: z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(1),
  references: z.array(GeneratedSkillReferenceFileSchema).min(1).max(MAX_TRACK_REFERENCE_FILES),
  externalSources: z.array(z.object({
    title: z.string().min(1),
    url: z.string().min(1),
    reason: z.string().min(1),
  }).strict()).default([]),
  missingInputs: z.array(z.string().min(1)).default([]),
}).strict().superRefine((value, ctx) => {
  const paths = new Set<string>();
  for (const [index, reference] of value.references.entries()) {
    if (paths.has(reference.path)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['references', index, 'path'],
        message: `Duplicate reference path within track bundle: ${reference.path}`,
      });
    }
    paths.add(reference.path);
  }

  const hasProcedure = value.references.some((reference) => reference.role === 'procedure');
  if (!hasProcedure) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['references'],
      message: 'Each track bundle must include at least one procedure reference',
    });
  }

  const hasExamples = value.references.some((reference) => reference.role === 'examples');
  if (!hasExamples) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['references'],
      message: 'Each track bundle must include at least one examples reference',
    });
  }
});

export type SkillBuildTrackReferenceBundle = z.infer<typeof SkillBuildTrackReferenceSchema>;

export interface GeneratedSkillReferenceFile {
  path: string;
  title: string;
  role: SkillBuilderReferenceRole;
  openWhen: string;
  markdown: string;
}

export interface SkillBuildTrackBundle {
  id: string;
  title: string;
  references: GeneratedSkillReferenceFile[];
}

export interface GeneratedSkillOutput {
  version: 1;
  skill: string;
  name: string;
  description: string;
  skillBody: string;
  specMd: string;
  sourcesMd: string;
  checklistMd: string;
  trackBundles: SkillBuildTrackBundle[];
  externalSources: SkillBuildExternalSource[];
  missingInputs: string[];
}

export interface GeneratedSkillArtifact {
  kind: 'generated-skill';
  source: 'cache' | 'generated';
  name: string;
  path: string;
  bytes: number;
  durationMs: number;
  usage: UsageStats;
  externalSources: SkillBuildExternalSource[];
  missingInputs: string[];
  responseModel?: string;
  numTurns?: number;
}

export class GeneratedSkillBuildError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'GeneratedSkillBuildError';
  }
}

export function frontmatterValue(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

export function byteLength(...contents: string[]): number {
  return contents.reduce((sum, content) => sum + Buffer.byteLength(content, 'utf-8'), 0);
}
