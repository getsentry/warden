import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import type { SkillDefinition } from '../config/schema.js';
import { isPathLike, resolvePathTarget } from '../utils/path.js';

export const GENERATED_SKILLS_DIR = '.warden/skills';
export const GENERATED_SKILL_DEFINITION_FILE = 'warden.yaml';
export const BUILD_STATE_FILE = 'build-state.json';
const DESCRIPTION_MAX_LENGTH = 88;
const EXISTING_GENERATED_SKILL_DIRS = [
  GENERATED_SKILLS_DIR,
  '.agents/skills',
  '.claude/skills',
] as const;

export const GeneratedSkillDefinitionSchema = z.object({
  version: z.literal(1),
  kind: z.literal('generated-skill'),
  name: z.string().min(1),
  prompt: z.string().min(1),
  instructions: z.array(z.string().min(1)).optional(),
  coverage: z.array(z.string().min(1)).optional(),
}).passthrough();

export type GeneratedSkillDefinition = z.infer<typeof GeneratedSkillDefinitionSchema>;

/** A generated skill target resolved from a CLI name or filesystem path. */
export interface GeneratedSkillTarget {
  displayName: string;
  isPath: boolean;
  rootDir: string;
}

export interface GeneratedSkillArtifactFile {
  path: string;
  content: string;
  bytes: number;
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function firstSentence(value: string): string {
  return value.trim().split(/(?<=[.!?])\s+/)[0] ?? value.trim();
}

function normalizeOneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function ensureSentenceEnding(value: string): string {
  const trimmed = value.trim().replace(/[,;:]+$/, '');
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function firstClause(value: string): string {
  return value.split(/[,;:]\s+/)[0] ?? value;
}

export function inferGeneratedSkillDescription(name: string, prompt: string): string {
  const fallback = `${name}.`;
  const sentence = normalizeOneLine(firstSentence(prompt));
  if (!sentence) {
    return fallback;
  }

  let description = sentence;
  if (description.length > DESCRIPTION_MAX_LENGTH && /[,;:]\s+/.test(description)) {
    description = firstClause(description);
  }
  description = ensureSentenceEnding(description);
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    description = `${description.slice(0, DESCRIPTION_MAX_LENGTH - 3).trimEnd()}...`;
  }
  return description;
}

function yamlBlock(value: string, indent = '  '): string {
  return value.split('\n').map((line) => `${indent}${line}`).join('\n');
}

function getGeneratedSkillsRoot(repoRoot: string): string {
  return join(repoRoot, GENERATED_SKILLS_DIR);
}

export function getGeneratedSkillRoot(repoRoot: string, skillName: string): string {
  return join(getGeneratedSkillsRoot(repoRoot), safePathSegment(skillName));
}

export function generatedSkillDefinitionRootExists(rootDir: string): boolean {
  return existsSync(join(rootDir, GENERATED_SKILL_DEFINITION_FILE));
}

/** Resolve a generated skill CLI target using the shared name and path semantics. */
export function resolveGeneratedSkillTarget(repoRoot: string, target: string): GeneratedSkillTarget {
  if (isPathLike(target)) {
    return {
      displayName: target,
      isPath: true,
      rootDir: resolvePathTarget(target, repoRoot),
    };
  }

  return {
    displayName: target,
    isPath: false,
    rootDir: resolveGeneratedSkillRoot(repoRoot, target),
  };
}

export function resolveGeneratedSkillRoot(repoRoot: string, skillName: string): string {
  const safeName = safePathSegment(skillName);
  for (const dir of EXISTING_GENERATED_SKILL_DIRS) {
    const rootDir = join(repoRoot, dir, safeName);
    if (generatedSkillDefinitionRootExists(rootDir)) {
      return rootDir;
    }
  }
  return getGeneratedSkillRoot(repoRoot, skillName);
}

export function loadGeneratedSkillDefinition(rootDir: string): {
  content: string;
  data: GeneratedSkillDefinition;
} {
  const definitionPath = join(rootDir, GENERATED_SKILL_DEFINITION_FILE);
  const content = readFileSync(definitionPath, 'utf-8');

  let parsed: unknown;
  try {
    parsed = parseYaml(content);
  } catch (error) {
    throw new Error(`Generated skill definition is not valid YAML: ${definitionPath}`, { cause: error });
  }

  const validation = GeneratedSkillDefinitionSchema.safeParse(parsed);
  if (!validation.success) {
    throw new Error(`Generated skill definition is invalid: ${validation.error.message}`, {
      cause: validation.error,
    });
  }
  return { content, data: validation.data };
}

export function buildGeneratedSkillDefinition(rootDir: string): SkillDefinition {
  const { data } = loadGeneratedSkillDefinition(rootDir);
  return {
    name: data.name,
    description: inferGeneratedSkillDescription(data.name, data.prompt),
    prompt: data.prompt,
    rootDir,
  };
}

export function createGeneratedSkillDefinition(args: {
  repoRoot: string;
  name: string;
  prompt: string;
  rootDir?: string;
}): SkillDefinition {
  const rootDir = args.rootDir ?? getGeneratedSkillRoot(args.repoRoot, args.name);
  mkdirSync(rootDir, { recursive: true });

  writeFileSync(join(rootDir, GENERATED_SKILL_DEFINITION_FILE), `version: 1
kind: generated-skill
name: ${args.name}
prompt: |-
${yamlBlock(args.prompt.trim())}
`, 'utf-8');

  return buildGeneratedSkillDefinition(rootDir);
}

export function clearGeneratedSkillArtifacts(rootDir: string): void {
  if (!existsSync(rootDir)) {
    return;
  }
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    if (entry.name === GENERATED_SKILL_DEFINITION_FILE || entry.name === BUILD_STATE_FILE) {
      continue;
    }
    rmSync(join(rootDir, entry.name), { recursive: true, force: true });
  }
}

/** Read generated runtime artifacts while excluding Warden-owned metadata files. */
export function readGeneratedSkillArtifactFiles(rootDir: string): GeneratedSkillArtifactFile[] {
  if (!existsSync(rootDir)) {
    return [];
  }

  const files: GeneratedSkillArtifactFile[] = [];

  function visit(relativeDir: string): void {
    for (const entry of readdirSync(join(rootDir, relativeDir), { withFileTypes: true })) {
      const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      if (!relativeDir && (entry.name === GENERATED_SKILL_DEFINITION_FILE || entry.name === BUILD_STATE_FILE)) {
        continue;
      }
      if (entry.isDirectory()) {
        visit(relativePath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const content = readFileSync(join(rootDir, relativePath), 'utf-8');
      files.push({
        path: relativePath,
        content,
        bytes: Buffer.byteLength(content, 'utf-8'),
      });
    }
  }

  visit('');
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
