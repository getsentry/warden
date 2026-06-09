import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { UsageStats } from '../types/index.js';

export const SKILL_BUILD_VERSION = '1';
export const SKILL_BUILD_OUTLINE_SCHEMA_VERSION = 1;

const OutlinePhaseStatusSchema = z.enum(['cached', 'generated', 'validated']);

export const SkillBuildExternalSourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().min(1),
  reason: z.string().min(1),
}).strict();

export const SkillBuildPhaseSchema = z.object({
  id: z.string().min(1),
  status: OutlinePhaseStatusSchema,
}).strict();

export const SkillBuildScopeProfileSchema = z.object({
  kind: z.enum(['domain', 'ecosystem', 'repository', 'product']),
  subject: z.string().min(1),
  localContextUsed: z.boolean(),
  observedContext: z.array(z.string().min(1)).min(1),
  unresolvedContext: z.array(z.string().min(1)).default([]),
}).strict().superRefine((value, ctx) => {
  if (value.kind === 'repository' && !value.localContextUsed) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'repository scope requires localContextUsed to be true',
      path: ['localContextUsed'],
    });
  }
  if (value.localContextUsed && value.observedContext.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'observedContext is required when localContextUsed is true',
      path: ['observedContext'],
    });
  }
});

export const SkillBuildTrackSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(1),
  goal: z.string().min(1),
  rationale: z.string().min(1),
  sourceSignals: z.array(z.string().min(1)).min(1),
  owns: z.array(z.string().min(1)).min(1),
  excludes: z.array(z.string().min(1)).default([]),
  relevanceSignals: z.array(z.string().min(1)).min(1),
  evidenceFocus: z.array(z.string().min(1)).min(1),
  checks: z.array(z.string().min(1)).min(1),
  safeCounterpatterns: z.array(z.string().min(1)).min(1),
  falsePositiveTraps: z.array(z.string().min(1)).min(1),
  researchHints: z.array(z.string().min(1)).default([]),
}).strict();

export const SkillBuildOutlineSchema = z.object({
  version: z.literal(SKILL_BUILD_OUTLINE_SCHEMA_VERSION),
  skill: z.string().min(1),
  sourceHash: z.string().min(1),
  buildVersion: z.string().min(1),
  scopeProfile: SkillBuildScopeProfileSchema,
  build: z.object({
    phases: z.array(SkillBuildPhaseSchema).min(1),
    externalSources: z.array(SkillBuildExternalSourceSchema).optional(),
  }).strict(),
  tracks: z.array(SkillBuildTrackSchema).min(1),
}).strict();

export type SkillBuildOutline = z.infer<typeof SkillBuildOutlineSchema>;

export interface SkillBuildSourceFile {
  path: string;
  content: string;
}

export interface SkillBuildSource {
  hash: string;
  files: SkillBuildSourceFile[];
}

export type SkillBuildOutlineSource = 'cache' | 'generated';

export interface SkillBuildOutlineResult {
  outline: SkillBuildOutline;
  source: SkillBuildOutlineSource;
  statePath: string;
  usage?: UsageStats;
  durationMs?: number;
  responseModel?: string;
  numTurns?: number;
}

export function outlineHash(outline: SkillBuildOutline): string {
  return createHash('sha256').update(JSON.stringify({
    skill: outline.skill,
    sourceHash: outline.sourceHash,
    buildVersion: outline.buildVersion,
    tracks: outline.tracks,
    scopeProfile: outline.scopeProfile,
  })).digest('hex');
}
