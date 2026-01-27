import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import { SkillDefinitionSchema, type SkillDefinition } from '../config/schema.js';
import { securityReviewSkill } from './security-review.js';

export class SkillLoaderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SkillLoaderError';
  }
}

// Built-in skills registry
const builtinSkills = new Map<string, SkillDefinition>([
  ['security-review', securityReviewSkill],
]);

/**
 * Get a built-in skill by name
 */
export function getBuiltinSkill(name: string): SkillDefinition | undefined {
  return builtinSkills.get(name);
}

/**
 * Get all built-in skill names
 */
export function getBuiltinSkillNames(): string[] {
  return Array.from(builtinSkills.keys());
}

/**
 * Load a skill from a TOML file
 */
export async function loadSkillFromFile(filePath: string): Promise<SkillDefinition> {
  const ext = extname(filePath).toLowerCase();
  if (ext !== '.toml') {
    throw new SkillLoaderError(`Unsupported skill file extension: ${ext}. Use .toml files.`);
  }

  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch (error) {
    throw new SkillLoaderError(`Failed to read skill file: ${filePath}`, { cause: error });
  }

  let parsed: unknown;
  try {
    parsed = parseToml(content);
  } catch (error) {
    throw new SkillLoaderError(`Failed to parse skill TOML: ${filePath}`, { cause: error });
  }

  const validated = SkillDefinitionSchema.safeParse(parsed);
  if (!validated.success) {
    throw new SkillLoaderError(
      `Invalid skill definition in ${filePath}: ${validated.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`
    );
  }

  return validated.data;
}

/**
 * Load all custom skills from a directory (e.g., .warden/skills/)
 */
export async function loadSkillsFromDirectory(dirPath: string): Promise<Map<string, SkillDefinition>> {
  const skills = new Map<string, SkillDefinition>();

  let files: string[];
  try {
    files = await readdir(dirPath);
  } catch {
    // Directory doesn't exist - that's fine
    return skills;
  }

  for (const file of files) {
    if (!file.endsWith('.toml')) continue;

    try {
      const skill = await loadSkillFromFile(join(dirPath, file));
      skills.set(skill.name, skill);
    } catch (error) {
      // Log but continue loading other skills
      console.warn(`Warning: Failed to load skill from ${file}:`, error);
    }
  }

  return skills;
}

/**
 * Resolve a skill by name, checking inline skills, custom directory, then built-ins
 */
export async function resolveSkillAsync(
  name: string,
  customSkillsDir?: string,
  inlineSkills?: SkillDefinition[]
): Promise<SkillDefinition> {
  // Check inline skills from config first
  if (inlineSkills) {
    const inline = inlineSkills.find(s => s.name === name);
    if (inline) return inline;
  }

  // Check custom skills directory
  if (customSkillsDir) {
    const customSkills = await loadSkillsFromDirectory(customSkillsDir);
    const custom = customSkills.get(name);
    if (custom) return custom;
  }

  // Check built-in skills
  const builtin = getBuiltinSkill(name);
  if (builtin) return builtin;

  throw new SkillLoaderError(`Skill not found: ${name}`);
}
