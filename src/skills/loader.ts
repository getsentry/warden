import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { existsSync } from 'node:fs';
import { parse as parseToml } from 'smol-toml';
import { SkillDefinitionSchema, ToolNameSchema, type SkillDefinition, type ToolName } from '../config/schema.js';

export class SkillLoaderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SkillLoaderError';
  }
}

/** Cache for loaded skills directories to avoid repeated disk reads */
const skillsCache = new Map<string, Map<string, SkillDefinition>>();

/**
 * Clear the skills cache. Useful for testing or when skills may have changed.
 */
export function clearSkillsCache(): void {
  skillsCache.clear();
}

/**
 * Parse YAML frontmatter from a markdown file.
 * Returns the frontmatter object and the body content.
 */
function parseMarkdownFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new SkillLoaderError('Invalid SKILL.md: missing YAML frontmatter');
  }

  const [, yamlContent, body] = match;

  // Simple YAML parser for frontmatter (handles basic key: value pairs)
  const frontmatter: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let inMetadata = false;
  const metadata: Record<string, string> = {};

  for (const line of (yamlContent ?? '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (line.startsWith('  ') && inMetadata) {
      // Nested metadata value
      const metaMatch = trimmed.match(/^(\w+):\s*(.*)$/);
      if (metaMatch && metaMatch[1]) {
        metadata[metaMatch[1]] = metaMatch[2]?.replace(/^["']|["']$/g, '') ?? '';
      }
      continue;
    }

    inMetadata = false;
    const keyMatch = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (keyMatch && keyMatch[1]) {
      currentKey = keyMatch[1];
      const value = (keyMatch[2] ?? '').trim();

      if (currentKey === 'metadata' && !value) {
        inMetadata = true;
        frontmatter[currentKey] = metadata;
      } else if (value) {
        frontmatter[currentKey] = value.replace(/^["']|["']$/g, '');
      }
    }
  }

  return { frontmatter, body: body ?? '' };
}

/**
 * Parse allowed-tools from agentskills.io format to our format.
 * agentskills.io uses space-delimited: "Read Grep Glob"
 * We use array: ["Read", "Grep", "Glob"]
 */
function parseAllowedTools(allowedTools: unknown): ToolName[] | undefined {
  if (typeof allowedTools === 'string') {
    const tools = allowedTools.split(/\s+/).filter(Boolean);
    // Validate each tool name
    const validTools: ToolName[] = [];
    for (const tool of tools) {
      const result = ToolNameSchema.safeParse(tool);
      if (result.success) {
        validTools.push(result.data);
      }
    }
    return validTools.length > 0 ? validTools : undefined;
  }
  return undefined;
}

/**
 * Load a skill from a SKILL.md file (agentskills.io format).
 */
export async function loadSkillFromMarkdown(filePath: string): Promise<SkillDefinition> {
  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch (error) {
    throw new SkillLoaderError(`Failed to read skill file: ${filePath}`, { cause: error });
  }

  const { frontmatter, body } = parseMarkdownFrontmatter(content);

  if (!frontmatter['name'] || typeof frontmatter['name'] !== 'string') {
    throw new SkillLoaderError(`Invalid SKILL.md: missing 'name' in frontmatter`);
  }
  if (!frontmatter['description'] || typeof frontmatter['description'] !== 'string') {
    throw new SkillLoaderError(`Invalid SKILL.md: missing 'description' in frontmatter`);
  }

  const allowedTools = parseAllowedTools(frontmatter['allowed-tools']);

  return {
    name: frontmatter['name'],
    description: frontmatter['description'],
    prompt: body.trim(),
    tools: allowedTools ? { allowed: allowedTools } : undefined,
  };
}

/**
 * Load a skill from a TOML file.
 */
export async function loadSkillFromToml(filePath: string): Promise<SkillDefinition> {
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
 * Load a skill from a file (supports both SKILL.md and .toml).
 */
export async function loadSkillFromFile(filePath: string): Promise<SkillDefinition> {
  const ext = extname(filePath).toLowerCase();
  const basename = filePath.split('/').pop();

  if (basename === 'SKILL.md') {
    return loadSkillFromMarkdown(filePath);
  } else if (ext === '.toml') {
    return loadSkillFromToml(filePath);
  } else {
    throw new SkillLoaderError(`Unsupported skill file: ${filePath}. Use SKILL.md or .toml files.`);
  }
}

/**
 * Load all skills from a directory.
 * Supports both agentskills.io format (skill-name/SKILL.md) and flat .toml files.
 * Results are cached to avoid repeated disk reads.
 */
export async function loadSkillsFromDirectory(dirPath: string): Promise<Map<string, SkillDefinition>> {
  // Check cache first
  const cached = skillsCache.get(dirPath);
  if (cached) {
    return cached;
  }

  const skills = new Map<string, SkillDefinition>();

  let entries: string[];
  try {
    entries = await readdir(dirPath);
  } catch {
    skillsCache.set(dirPath, skills);
    return skills;
  }

  for (const entry of entries) {
    const entryPath = join(dirPath, entry);

    // Check for agentskills.io format: skill-name/SKILL.md
    const skillMdPath = join(entryPath, 'SKILL.md');
    if (existsSync(skillMdPath)) {
      try {
        const skill = await loadSkillFromMarkdown(skillMdPath);
        skills.set(skill.name, skill);
      } catch (error) {
        console.warn(`Warning: Failed to load skill from ${skillMdPath}:`, error);
      }
      continue;
    }

    // Check for .toml files
    if (entry.endsWith('.toml')) {
      try {
        const skill = await loadSkillFromToml(entryPath);
        skills.set(skill.name, skill);
      } catch (error) {
        console.warn(`Warning: Failed to load skill from ${entry}:`, error);
      }
    }
  }

  skillsCache.set(dirPath, skills);
  return skills;
}

/**
 * Get the path to the built-in skills directory.
 */
function getBuiltinSkillsDir(): string {
  // Skills are in the repo root's skills/ directory
  // This file is at src/skills/loader.ts, so we go up to repo root
  // import.meta.dirname = src/skills, so we need ../.. to get to root
  return join(import.meta.dirname, '..', '..', 'skills');
}

/**
 * Get a built-in skill by name.
 */
export async function getBuiltinSkill(name: string): Promise<SkillDefinition | undefined> {
  const skillsDir = getBuiltinSkillsDir();
  const skillMdPath = join(skillsDir, name, 'SKILL.md');

  if (existsSync(skillMdPath)) {
    try {
      return await loadSkillFromMarkdown(skillMdPath);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/**
 * Get all built-in skill names.
 */
export async function getBuiltinSkillNames(): Promise<string[]> {
  const skillsDir = getBuiltinSkillsDir();
  const skills = await loadSkillsFromDirectory(skillsDir);
  return Array.from(skills.keys());
}

/**
 * Resolve a skill by name, checking inline skills, custom directory, then built-ins.
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
  const builtin = await getBuiltinSkill(name);
  if (builtin) return builtin;

  throw new SkillLoaderError(`Skill not found: ${name}`);
}
