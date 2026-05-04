import { z } from 'zod';
import type { UsageStats } from '../types/index.js';

export interface SkillBuildExternalSource {
  title: string;
  url: string;
  reason: string;
}

export interface SkillBuildAuthoringProvider {
  name: string;
  rootDir: string;
  contentHash: string;
}

function isValidGeneratedArtifactPath(path: string): boolean {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(path)) {
    return false;
  }
  if (path.startsWith('/') || path.includes('..') || path.includes('//')) {
    return false;
  }
  return path !== 'warden.yaml' && path !== 'build-state.json';
}

// The authoring plan is meant to describe semantic coverage, source depth,
// ordered work, and review criteria. It must not become an artifact-layout
// plan; the authoring skill owns artifact placement and routing choices.
export const GeneratedSkillAuthoringPlanSchema = z.object({
  version: z.literal(1),
  summary: z.string().min(1),
  workflow: z.array(z.string().min(1)).min(1),
  researchPlan: z.array(z.string().min(1)).default([]),
  sourceDecisions: z.array(z.object({
    source: z.string().min(1),
    decision: z.string().min(1),
    implication: z.string().min(1),
  }).strict()).default([]),
  lookupQuestions: z.array(z.object({
    question: z.string().min(1),
    openWhen: z.string().min(1),
    requiredEvidence: z.array(z.string().min(1)).min(1),
  }).strict()).default([]),
  qualityBar: z.array(z.string().min(1)).default([]),
  artifactPlan: z.array(z.string().min(1)).min(1),
  validationPlan: z.array(z.string().min(1)).min(1),
  risks: z.array(z.string().min(1)).default([]),
  missingInputs: z.array(z.string().min(1)).default([]),
  externalSources: z.array(z.object({
    title: z.string().min(1),
    url: z.string().min(1),
    reason: z.string().min(1),
  }).strict()).default([]),
}).strict();

export type GeneratedSkillAuthoringPlan = z.infer<typeof GeneratedSkillAuthoringPlanSchema>;

export const GeneratedSkillArtifactFileSchema = z.object({
  path: z.string()
    .min(1)
    .refine(
      (value) => isValidGeneratedArtifactPath(value),
      'Generated artifact paths must be relative, stay inside the skill root, and must not overwrite warden.yaml or build-state.json',
    ),
  content: z.string().min(1),
}).strict();

export const GeneratedSkillFileMapSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1),
  files: z.array(GeneratedSkillArtifactFileSchema).min(1),
  summary: z.string().min(1),
  validationNotes: z.array(z.string().min(1)).default([]),
  missingInputs: z.array(z.string().min(1)).default([]),
  externalSources: z.array(z.object({
    title: z.string().min(1),
    url: z.string().min(1),
    reason: z.string().min(1),
  }).strict()).default([]),
}).strict().superRefine((value, ctx) => {
  const paths = new Set<string>();
  for (const [index, file] of value.files.entries()) {
    if (paths.has(file.path)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['files', index, 'path'],
        message: `Duplicate generated artifact path: ${file.path}`,
      });
    }
    paths.add(file.path);
  }
  if (!paths.has('SKILL.md')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['files'],
      message: 'Generated artifact file map must include SKILL.md',
    });
  }
});

export type GeneratedSkillFileMap = z.infer<typeof GeneratedSkillFileMapSchema>;

export const GeneratedSkillReviewIssueSchema = z.object({
  severity: z.enum(['error', 'warning']),
  path: z.string().optional(),
  message: z.string().min(1),
  suggestedFix: z.string().optional(),
}).strict();

export const GeneratedSkillReviewResultSchema = z.object({
  version: z.literal(1),
  valid: z.boolean(),
  summary: z.string().min(1),
  issues: z.array(GeneratedSkillReviewIssueSchema).default([]),
  missingInputs: z.array(z.string().min(1)).default([]),
}).strict();

export type GeneratedSkillReviewResult = z.infer<typeof GeneratedSkillReviewResultSchema>;

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
