import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { UsageStatsSchema } from '../types/index.js';
import { BUILD_STATE_FILE } from './definition.js';
import { SkillBuilderReferenceRoleSchema } from './skill-contract.js';
import {
  SkillBuildOutlineSchema,
} from './outline-contract.js';

export const SKILL_BUILD_STATE_SCHEMA_VERSION = 1;
export const SKILL_BUILD_STATE_KIND = 'skill-build-state';

export const GeneratedSkillArtifactStateSchema = z.object({
  version: z.literal(3),
  sourceHash: z.string().min(1),
  outlineHash: z.string().min(1),
  buildVersion: z.string().min(1),
  name: z.string().min(1),
  trackIds: z.array(z.string().min(1)).min(1),
  referenceManifest: z.array(z.object({
    trackId: z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/),
    path: z.string().min(1),
    role: SkillBuilderReferenceRoleSchema,
    openWhen: z.string().min(1),
  }).strict()),
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
    return undefined;
  }
  return validation.data;
}

export function writeSkillBuildState(path: string, state: SkillBuildState): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
}
