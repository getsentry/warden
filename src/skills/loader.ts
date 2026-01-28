import { readFile, readdir } from 'node:fs/promises';
import { basename, dirname, join, extname } from 'node:path';
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

/** Conventional skill directories, checked in order */
export const SKILL_DIRECTORIES = [
  '.warden/skills',
  '.claude/skills',
  '.agents/skills',
] as const;

/**
 * Check if a string looks like a path (contains path separators or starts with .)
 */
function isSkillPath(nameOrPath: string): boolean {
  return nameOrPath.includes('/') || nameOrPath.includes('\\') || nameOrPath.startsWith('.');
}

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
    rootDir: dirname(filePath),
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

  return {
    ...validated.data,
    rootDir: dirname(filePath),
  };
}

/**
 * Load a skill from a file (supports both SKILL.md and .toml).
 */
export async function loadSkillFromFile(filePath: string): Promise<SkillDefinition> {
  const ext = extname(filePath).toLowerCase();
  const filename = basename(filePath);

  if (filename === 'SKILL.md') {
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
 * A discovered skill with source metadata.
 */
export interface DiscoveredSkill {
  skill: SkillDefinition;
  /** Relative directory path where the skill was found (e.g., "./.agents/skills") */
  directory: string;
  /** Full path to the skill */
  path: string;
}

/**
 * Discover all available skills from conventional directories.
 *
 * @param repoRoot - Repository root path for finding skills
 * @returns Map of skill name to discovered skill info
 */
export async function discoverAllSkills(repoRoot?: string): Promise<Map<string, DiscoveredSkill>> {
  const result = new Map<string, DiscoveredSkill>();

  if (!repoRoot) {
    return result;
  }

  // Scan conventional directories for skills
  for (const dir of SKILL_DIRECTORIES) {
    const dirPath = join(repoRoot, dir);
    if (!existsSync(dirPath)) continue;

    const skills = await loadSkillsFromDirectory(dirPath);
    for (const [name, skill] of skills) {
      result.set(name, {
        skill,
        directory: `./${dir}`,
        path: join(dirPath, name),
      });
    }
  }

  return result;
}

/**
 * Resolve a skill by name or path.
 *
 * Resolution order:
 * 1. Inline skills from config
 * 2. Direct path (if nameOrPath contains / or \ or starts with .)
 *    - Directory: load SKILL.md from it
 *    - File: load the file directly
 * 3. Conventional directories (if repoRoot provided)
 *    - .warden/skills/{name}/SKILL.md or .warden/skills/{name}.toml
 *    - .claude/skills/{name}/SKILL.md or .claude/skills/{name}.toml
 *    - .agents/skills/{name}/SKILL.md or .agents/skills/{name}.toml
 * 4. Built-in skills
 */
export async function resolveSkillAsync(
  nameOrPath: string,
  repoRoot?: string,
  inlineSkills?: SkillDefinition[]
): Promise<SkillDefinition> {
  // 1. Check inline skills from config first
  if (inlineSkills) {
    const inline = inlineSkills.find(s => s.name === nameOrPath);
    if (inline) return inline;
  }

  // 2. Direct path resolution
  if (isSkillPath(nameOrPath)) {
    // Resolve relative to repoRoot if provided, otherwise use as-is
    const resolvedPath = repoRoot ? join(repoRoot, nameOrPath) : nameOrPath;

    // Check if it's a directory with SKILL.md
    const skillMdPath = join(resolvedPath, 'SKILL.md');
    if (existsSync(skillMdPath)) {
      return loadSkillFromMarkdown(skillMdPath);
    }

    // Check if it's a file directly
    if (existsSync(resolvedPath)) {
      return loadSkillFromFile(resolvedPath);
    }

    throw new SkillLoaderError(`Skill not found at path: ${nameOrPath}`);
  }

  // 3. Check conventional skill directories
  if (repoRoot) {
    for (const dir of SKILL_DIRECTORIES) {
      const dirPath = join(repoRoot, dir);

      // Check for skill-name/SKILL.md
      const skillMdPath = join(dirPath, nameOrPath, 'SKILL.md');
      if (existsSync(skillMdPath)) {
        return loadSkillFromMarkdown(skillMdPath);
      }

      // Check for skill-name.toml
      const tomlPath = join(dirPath, `${nameOrPath}.toml`);
      if (existsSync(tomlPath)) {
        return loadSkillFromToml(tomlPath);
      }
    }
  }

  // 4. Check built-in skills
  const builtin = await getBuiltinSkill(nameOrPath);
  if (builtin) return builtin;

  throw new SkillLoaderError(`Skill not found: ${nameOrPath}`);
}
