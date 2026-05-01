import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import type { SkillDefinition } from '../config/schema.js';

export const SYNTHESIZED_SKILLS_DIR = '.warden/skills';
export const SYNTHESIS_DEFINITION_FILE = 'warden.yaml';
const DESCRIPTION_MAX_LENGTH = 88;

export const SynthesizedSkillDefinitionSchema = z.object({
  version: z.literal(1),
  kind: z.literal('synthesized-skill'),
  name: z.string().min(1),
  prompt: z.string().min(1),
  instructions: z.array(z.string().min(1)).optional(),
  coverage: z.array(z.string().min(1)).optional(),
}).passthrough();

export type SynthesizedSkillDefinition = z.infer<typeof SynthesizedSkillDefinitionSchema>;

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

export function inferSynthesizedSkillDescription(name: string, prompt: string): string {
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

export function getSynthesizedSkillsRoot(repoRoot: string): string {
  return join(repoRoot, SYNTHESIZED_SKILLS_DIR);
}

export function getSynthesizedSkillRoot(repoRoot: string, skillName: string): string {
  return join(getSynthesizedSkillsRoot(repoRoot), safePathSegment(skillName));
}

export function getLegacySynthesizedSkillRoot(repoRoot: string, skillName: string): string {
  return join(repoRoot, '.warden', 'superwarden', safePathSegment(skillName));
}

export function synthesizedSkillDefinitionExists(repoRoot: string, skillName: string): boolean {
  return existsSync(join(getSynthesizedSkillRoot(repoRoot, skillName), SYNTHESIS_DEFINITION_FILE));
}

export function loadSynthesizedSkillDefinition(rootDir: string): {
  content: string;
  data: SynthesizedSkillDefinition;
} {
  const definitionPath = join(rootDir, SYNTHESIS_DEFINITION_FILE);
  const content = readFileSync(definitionPath, 'utf-8');

  let parsed: unknown;
  try {
    parsed = parseYaml(content);
  } catch (error) {
    throw new Error(`Synthesized skill definition is not valid YAML: ${definitionPath}`, { cause: error });
  }

  const validation = SynthesizedSkillDefinitionSchema.safeParse(parsed);
  if (!validation.success) {
    throw new Error(`Synthesized skill definition is invalid: ${validation.error.message}`, {
      cause: validation.error,
    });
  }

  return { content, data: validation.data };
}

export function readSynthesizedSkillDefinition(rootDir: string): SynthesizedSkillDefinition {
  return loadSynthesizedSkillDefinition(rootDir).data;
}

export function buildSynthesizedSkillDefinition(rootDir: string): SkillDefinition {
  const { data } = loadSynthesizedSkillDefinition(rootDir);
  return {
    name: data.name,
    description: inferSynthesizedSkillDescription(data.name, data.prompt),
    prompt: data.prompt,
    rootDir,
  };
}

export function createSynthesizedSkillDefinition(args: {
  repoRoot: string;
  name: string;
  prompt: string;
}): SkillDefinition {
  const rootDir = getSynthesizedSkillRoot(args.repoRoot, args.name);
  mkdirSync(rootDir, { recursive: true });

  writeFileSync(join(rootDir, SYNTHESIS_DEFINITION_FILE), `version: 1
kind: synthesized-skill
name: ${args.name}
prompt: |-
${yamlBlock(args.prompt.trim())}
`, 'utf-8');

  return buildSynthesizedSkillDefinition(rootDir);
}

export function clearSynthesizedSkillArtifacts(rootDir: string): void {
  for (const name of ['SKILL.md', 'SPEC.md', 'SOURCES.md', 'synthesis.json']) {
    rmSync(join(rootDir, name), { force: true });
  }
  rmSync(join(rootDir, 'references'), { recursive: true, force: true });
}

export function removeLegacySynthesizedSkillArtifacts(repoRoot: string, skillName: string): void {
  rmSync(getLegacySynthesizedSkillRoot(repoRoot, skillName), { recursive: true, force: true });
}
