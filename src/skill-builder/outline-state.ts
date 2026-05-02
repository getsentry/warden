import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { UsageStatsSchema } from '../types/index.js';
import { BUILD_STATE_FILE } from './definition.js';
import {
  SkillBuildOutlineSchema,
} from './outline-contract.js';

export const SKILL_BUILD_STATE_SCHEMA_VERSION = 1;
export const SKILL_BUILD_STATE_KIND = 'skill-build-state';

export const GeneratedSkillArtifactStateSchema = z.object({
  version: z.literal(4),
  sourceHash: z.string().min(1),
  outlineHash: z.string().min(1),
  buildVersion: z.string().min(1),
  authoringProvider: z.object({
    name: z.string().min(1),
    rootDir: z.string().min(1),
    contentHash: z.string().min(1),
  }).strict(),
  name: z.string().min(1),
  fileManifest: z.array(z.object({
    path: z.string().min(1),
    bytes: z.number().int().nonnegative(),
  }).strict()).min(1),
  deterministicWarnings: z.array(z.string().min(1)).default([]),
  validationIssues: z.array(z.object({
    severity: z.enum(['error', 'warning']),
    path: z.string().optional(),
    message: z.string().min(1),
    suggestedFix: z.string().optional(),
  }).strict()).default([]),
  bytes: z.number().int().nonnegative(),
  durationMs: z.number().nonnegative(),
  usage: UsageStatsSchema,
  externalSources: z.array(z.object({
    title: z.string().min(1),
    url: z.string().min(1),
    reason: z.string().min(1),
  }).strict()),
  missingInputs: z.array(z.string().min(1)),
  responseModel: z.string().optional(),
  numTurns: z.number().int().nonnegative().optional(),
  generatedAt: z.string().min(1),
}).strict();

export type GeneratedSkillArtifactState = z.infer<typeof GeneratedSkillArtifactStateSchema>;

export const SkillBuildStateSchema = z.object({
  version: z.literal(SKILL_BUILD_STATE_SCHEMA_VERSION),
  kind: z.literal(SKILL_BUILD_STATE_KIND),
  identity: z.object({
    requestedModel: z.string().min(1).optional(),
  }).strict().optional(),
  outline: SkillBuildOutlineSchema,
  outlineRun: z.object({
    durationMs: z.number().nonnegative().optional(),
    usage: UsageStatsSchema.optional(),
    responseModel: z.string().optional(),
    numTurns: z.number().int().nonnegative().optional(),
  }).strict().optional(),
  artifact: GeneratedSkillArtifactStateSchema.optional(),
  updatedAt: z.string().optional(),
}).strict();

export type SkillBuildState = z.infer<typeof SkillBuildStateSchema>;

export function getBuildStatePath(rootDir: string): string {
  return join(rootDir, BUILD_STATE_FILE);
}

export function readSkillBuildState(path: string): SkillBuildState | undefined {
  if (!existsSync(path)) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return undefined;
  }

  const validation = SkillBuildStateSchema.safeParse(parsed);
  if (!validation.success) {
    if (parsed && typeof parsed === 'object' && 'artifact' in parsed) {
      const withoutArtifact = { ...parsed };
      delete (withoutArtifact as { artifact?: unknown }).artifact;
      const outlineOnlyValidation = SkillBuildStateSchema.safeParse(withoutArtifact);
      if (outlineOnlyValidation.success) {
        return outlineOnlyValidation.data;
      }
    }
    return undefined;
  }
  return validation.data;
}

export function writeSkillBuildState(path: string, state: SkillBuildState): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
}
