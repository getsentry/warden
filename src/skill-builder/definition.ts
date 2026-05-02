import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import type { SkillDefinition } from '../config/schema.js';

export const GENERATED_SKILLS_DIR = '.warden/skills';
export const SYNTHESIS_DEFINITION_FILE = 'warden.yaml';
const DESCRIPTION_MAX_LENGTH = 88;

export const GeneratedSkillDefinitionSchema = z.object({
  version: z.literal(1),
  kind: z.literal('generated-skill'),
  name: z.string().min(1),
  prompt: z.string().min(1),
  instructions: z.array(z.string().min(1)).optional(),
  coverage: z.array(z.string().min(1)).optional(),
}).passthrough();

export type GeneratedSkillDefinition = z.infer<typeof GeneratedSkillDefinitionSchema>;

const ParsedGeneratedSkillDefinitionSchema = z.object({
  version: z.literal(1),
  kind: z.enum(['generated-skill', 'synthesized-skill']).optional(),
  name: z.string().min(1),
  prompt: z.string().min(1),
  instructions: z.array(z.string().min(1)).optional(),
  coverage: z.array(z.string().min(1)).optional(),
}).passthrough();

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

export function generatedSkillDefinitionExists(repoRoot: string, skillName: string): boolean {
  return existsSync(join(getGeneratedSkillRoot(repoRoot, skillName), SYNTHESIS_DEFINITION_FILE));
}

export function loadGeneratedSkillDefinition(rootDir: string): {
  content: string;
  data: GeneratedSkillDefinition;
} {
  const definitionPath = join(rootDir, SYNTHESIS_DEFINITION_FILE);
  const content = readFileSync(definitionPath, 'utf-8');

  let parsed: unknown;
  try {
    parsed = parseYaml(content);
  } catch (error) {
    throw new Error(`Generated skill definition is not valid YAML: ${definitionPath}`, { cause: error });
  }

  const validation = GeneratedSkillDefinitionSchema.safeParse(parsed);
  if (validation.success) {
    return { content, data: validation.data };
  }

  const legacyValidation = ParsedGeneratedSkillDefinitionSchema.safeParse(parsed);
  if (!legacyValidation.success) {
    throw new Error(`Generated skill definition is invalid: ${validation.error.message}`, {
      cause: validation.error,
    });
  }

  return {
    content,
    data: {
      ...legacyValidation.data,
      kind: 'generated-skill',
    },
  };
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
}): SkillDefinition {
  const rootDir = getGeneratedSkillRoot(args.repoRoot, args.name);
  mkdirSync(rootDir, { recursive: true });

  writeFileSync(join(rootDir, SYNTHESIS_DEFINITION_FILE), `version: 1
kind: generated-skill
name: ${args.name}
prompt: |-
${yamlBlock(args.prompt.trim())}
`, 'utf-8');

  return buildGeneratedSkillDefinition(rootDir);
}

export function clearGeneratedSkillArtifacts(rootDir: string): void {
  for (const name of ['SKILL.md', 'SPEC.md', 'SOURCES.md', 'synthesis.json']) {
    rmSync(join(rootDir, name), { force: true });
  }
  rmSync(join(rootDir, 'references'), { recursive: true, force: true });
}
