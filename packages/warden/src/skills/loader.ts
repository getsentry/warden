import { readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadSkillMd, SkillLoadError } from '@sentry/dotagents-lib';
import type { SkillDefinition } from '../config/schema.js';
import { isPathLike, resolvePathTarget } from '../utils/path.js';

export class SkillLoaderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SkillLoaderError';
  }
}

/**
 * A loaded skill with its source entry path.
 */
export interface LoadedSkill {
  skill: SkillDefinition;
  /** The entry name (file or directory) where the skill was found */
  entry: string;
}

/** Cache for loaded skills directories to avoid repeated disk reads */
const skillsCache = new Map<string, Map<string, LoadedSkill>>();

/**
 * Conventional skill directories, checked in priority order.
 *
 * Skills are discovered from these directories in order:
 * 1. .warden/skills - Repo-local generated skills
 * 2. .agents/skills - Primary authored skills
 * 3. .claude/skills - Backup (matches Claude Code convention)
 *
 * Skills follow the agentskills.io specification:
 * - skill-name/SKILL.md (directory with SKILL.md inside - preferred)
 * - skill-name.md (flat markdown with SKILL.md frontmatter format)
 *
 * When a skill name exists in multiple directories, the first one found wins.
 */
export const SKILL_DIRECTORIES = [
  '.warden/skills',
  '.agents/skills',
  '.claude/skills',
] as const;

/**
 * Package-native Warden skills, resolved by name without installation.
 *
 * Repo-local conventional skills take precedence over these defaults so teams
 * can override built-ins with their own policy.
 */
export const BUILTIN_SKILL_DIRECTORIES = [
  'src/builtin-skills',
] as const;

export const BUILTIN_SKILL_NAMES = [
  'code-review',
  'security-review',
] as const;

const BUILTIN_SKILL_NAME_SET = new Set<string>(BUILTIN_SKILL_NAMES);

/**
 * Conventional agent directories, checked in priority order.
 *
 * Agents are discovered from these directories in order:
 * 1. .agents/agents - Primary (recommended)
 * 2. .claude/agents - Backup (matches Claude Code convention)
 * 3. .warden/agents - Legacy
 *
 * Agents use the same format as skills but with AGENT.md marker files.
 */
export const AGENT_DIRECTORIES = [
  '.agents/agents',
  '.claude/agents',
  '.warden/agents',
] as const;

/** Marker filename for agent definitions */
export const AGENT_MARKER_FILE = 'AGENT.md';

/**
 * Resolve a skill path, handling absolute paths, tilde expansion, and relative paths.
 */
export function resolveSkillPath(nameOrPath: string, repoRoot?: string): string {
  return resolvePathTarget(nameOrPath, repoRoot);
}

/**
 * Resolve likely package roots from source, compiled package, or ncc action bundle locations.
 */
export function resolvePackageRootCandidates(): string[] {
  const __filename = fileURLToPath(import.meta.url);
  const moduleRoot = join(dirname(__filename), '..', '..');
  const candidates = [
    moduleRoot,
    join(moduleRoot, 'packages', 'warden'),
    process.env['GITHUB_ACTION_PATH'] ? join(process.env['GITHUB_ACTION_PATH'], 'packages', 'warden') : undefined,
    join(process.cwd(), 'packages', 'warden'),
  ].filter((candidate): candidate is string => candidate !== undefined);

  return [...new Set(candidates)];
}

function builtinSkillPath(root: string, name: string, dir: string, markerFile = 'SKILL.md'): string | undefined {
  const dirPath = join(root, dir);

  const markerPath = join(dirPath, name, markerFile);
  if (existsSync(markerPath)) {
    return markerPath;
  }

  const mdPath = join(dirPath, `${name}.md`);
  if (existsSync(mdPath)) {
    return mdPath;
  }

  return undefined;
}

/**
 * Return true when a skill name resolves to a package-native built-in skill.
 */
export function isBuiltinSkillName(name: string): boolean {
  if (isPathLike(name) || !BUILTIN_SKILL_NAME_SET.has(name)) {
    return false;
  }

  for (const root of resolvePackageRootCandidates()) {
    for (const dir of BUILTIN_SKILL_DIRECTORIES) {
      if (builtinSkillPath(root, name, dir)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Clear the skills cache. Useful for testing or when skills may have changed.
 */
export function clearSkillsCache(): void {
  skillsCache.clear();
}

/**
 * Options for loading a skill from markdown.
 */
export interface LoadSkillFromMarkdownOptions {
  /** Callback for reporting warnings (e.g., invalid tool names) */
  onWarning?: (message: string) => void;
}

/**
 * Extract the markdown body that follows the SKILL.md YAML frontmatter.
 * Returns the empty string if the file lacks a frontmatter block.
 */
function extractBody(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  return match?.[1] ?? '';
}

/**
 * Load a skill from a SKILL.md file (agentskills.io format).
 *
 * Frontmatter parsing and `allowed-tools` interpretation are delegated to
 * `@sentry/dotagents-lib`; this wrapper attaches warden-specific fields
 * (`prompt` body, `rootDir`, `tools.allowed`) and translates lib errors to
 * `SkillLoaderError` for callers that catch on warden's error type.
 */
export async function loadSkillFromMarkdown(
  filePath: string,
  options?: LoadSkillFromMarkdownOptions
): Promise<SkillDefinition> {
  let meta;
  try {
    meta = await loadSkillMd(filePath, { onWarning: options?.onWarning });
  } catch (err) {
    if (err instanceof SkillLoadError) {
      throw new SkillLoaderError(err.message, { cause: err });
    }
    throw err;
  }

  // Lib doesn't return the body; re-read for the markdown content. Cheap —
  // the OS file cache catches the second read.
  const content = await readFile(filePath, 'utf-8');
  const body = extractBody(content);

  return {
    name: meta.name,
    description: meta.description,
    prompt: body.trim(),
    tools: meta.allowedTools !== undefined ? { allowed: meta.allowedTools } : undefined,
    rootDir: dirname(filePath),
  };
}

/**
 * Load a skill from a file (agentskills.io format .md files).
 */
export async function loadSkillFromFile(
  filePath: string,
  options?: LoadSkillFromMarkdownOptions
): Promise<SkillDefinition> {
  const ext = extname(filePath).toLowerCase();

  if (ext === '.md') {
    return loadSkillFromMarkdown(filePath, options);
  }

  throw new SkillLoaderError(`Unsupported skill file: ${filePath}. Skills must be .md files following the agentskills.io format.`);
}

/**
 * Options for loading skills from a directory.
 */
export interface LoadSkillsOptions {
  /** Callback for reporting warnings (e.g., failed skill loading) */
  onWarning?: (message: string) => void;
  /** Marker filename for directory-format entries. Default: 'SKILL.md' */
  markerFile?: string;
}

/**
 * Load all skills from a directory.
 *
 * Supports the agentskills.io specification:
 * - skill-name/SKILL.md (directory with SKILL.md inside - preferred)
 * - skill-name.md (flat markdown with SKILL.md frontmatter format)
 *
 * Results are cached to avoid repeated disk reads.
 *
 * @returns Map of skill name to LoadedSkill (includes entry path for tracking)
 */
export async function loadSkillsFromDirectory(
  dirPath: string,
  options?: LoadSkillsOptions
): Promise<Map<string, LoadedSkill>> {
  const markerFile = options?.markerFile ?? 'SKILL.md';
  const cacheKey = `${dirPath}:${markerFile}`;

  // Check cache first
  const cached = skillsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const skills = new Map<string, LoadedSkill>();

  let entries: string[];
  try {
    entries = await readdir(dirPath);
  } catch {
    skillsCache.set(cacheKey, skills);
    return skills;
  }

  // Process entries following agentskills.io format priority:
  // 1. Directories with marker file (preferred)
  // 2. Flat .md files with valid frontmatter
  for (const entry of entries) {
    const entryPath = join(dirPath, entry);

    // Check for agentskills.io format: entry-name/{markerFile} (preferred)
    const markerPath = join(entryPath, markerFile);
    if (existsSync(markerPath)) {
      try {
        const skill = await loadSkillFromMarkdown(markerPath, { onWarning: options?.onWarning });
        skills.set(skill.name, { skill, entry });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        options?.onWarning?.(`Failed to load skill from ${markerPath}: ${message}`);
      }
      continue;
    }

    // Check for flat .md files (with frontmatter format)
    if (entry.endsWith('.md')) {
      try {
        const skill = await loadSkillFromMarkdown(entryPath, { onWarning: options?.onWarning });
        skills.set(skill.name, { skill, entry });
      } catch (error) {
        // Skip files without YAML frontmatter (e.g., README.md, documentation)
        // but warn about files that have frontmatter but are malformed.
        // Lib's loadSkillMd throws "No YAML frontmatter in <path>" for the
        // no-frontmatter case; everything else (missing required field,
        // unparseable YAML) is a real malformation worth reporting.
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('No YAML frontmatter')) {
          options?.onWarning?.(`Failed to load skill from ${entry}: ${message}`);
        }
      }
    }
  }

  skillsCache.set(cacheKey, skills);
  return skills;
}

/**
 * A discovered skill with source metadata.
 */
export interface DiscoveredSkill {
  skill: SkillDefinition;
  /** Source label where the skill was found (e.g., "./.agents/skills" or "built-in") */
  directory: string;
  /** Full path to the skill */
  path: string;
}

/**
 * Discover all entries (skills or agents) from conventional directories.
 * Scans directories in order; first occurrence of a name wins.
 */
async function discoverFromDirectories(
  rootDir: string,
  directories: readonly string[],
  options?: LoadSkillsOptions,
  sourceLabel?: (dir: string) => string,
): Promise<Map<string, DiscoveredSkill>> {
  const result = new Map<string, DiscoveredSkill>();

  for (const dir of directories) {
    const dirPath = join(rootDir, dir);
    if (!existsSync(dirPath)) continue;

    const loaded = await loadSkillsFromDirectory(dirPath, options);
    for (const [name, entry] of loaded) {
      if (!result.has(name)) {
        result.set(name, {
          skill: entry.skill,
          directory: sourceLabel ? sourceLabel(dir) : `./${dir}`,
          path: join(dirPath, entry.entry),
        });
      }
    }
  }

  return result;
}

async function discoverBuiltinSkills(options?: LoadSkillsOptions): Promise<Map<string, DiscoveredSkill>> {
  const result = new Map<string, DiscoveredSkill>();

  for (const root of resolvePackageRootCandidates()) {
    for (const dir of BUILTIN_SKILL_DIRECTORIES) {
      for (const name of BUILTIN_SKILL_NAMES) {
        if (result.has(name)) {
          continue;
        }

        const path = builtinSkillPath(root, name, dir);
        if (path) {
          result.set(name, {
            skill: await loadSkillFromFile(path, options),
            directory: 'built-in',
            path,
          });
        }
      }
    }
  }

  return result;
}

/**
 * Discover all available skills from conventional directories.
 *
 * @param repoRoot - Repository root path for finding skills
 * @param options - Options for skill loading (e.g., warning callback)
 * @returns Map of skill name to discovered skill info
 */
export async function discoverAllSkills(
  repoRoot?: string,
  options?: LoadSkillsOptions
): Promise<Map<string, DiscoveredSkill>> {
  const discovered = repoRoot
    ? await discoverFromDirectories(repoRoot, SKILL_DIRECTORIES, options)
    : new Map<string, DiscoveredSkill>();

  const builtin = await discoverBuiltinSkills(options);
  for (const [name, entry] of builtin) {
    if (!discovered.has(name)) {
      discovered.set(name, entry);
    }
  }

  return discovered;
}

export interface ResolveSkillOptions {
  /** Remote repository reference (e.g., "owner/repo" or "owner/repo@sha") */
  remote?: string;
  /** Skip network operations - only use cache for remote skills */
  offline?: boolean;
}

/** Configuration for the shared resolve logic */
interface ResolveConfig {
  markerFile: string;
  directories: readonly string[];
  builtinDirectories?: readonly string[];
  label: string;
  kind: 'skill' | 'agent';
}

/**
 * Resolve a skill or agent by name or path.
 *
 * Resolution order:
 * 1. Remote repository (if remote option is set)
 * 2. Direct path (if nameOrPath contains / or \ or starts with .)
 *    - Directory: load marker file from it
 *    - File: load the .md file directly
 * 3. Conventional directories (if repoRoot provided)
 * 4. Package-native built-in directories (skills only)
 */
async function resolveEntry(
  nameOrPath: string,
  repoRoot: string | undefined,
  options: ResolveSkillOptions | undefined,
  config: ResolveConfig,
): Promise<SkillDefinition> {
  const { remote, offline } = options ?? {};

  // 1. Remote repository resolution takes priority when specified
  if (remote) {
    // Dynamic import to avoid circular dependencies
    const { resolveRemoteSkill, resolveRemoteAgent } = await import('./remote.js');
    const resolver = config.kind === 'skill' ? resolveRemoteSkill : resolveRemoteAgent;
    return resolver(remote, nameOrPath, { offline });
  }

  // 2. Direct path resolution
  if (isPathLike(nameOrPath)) {
    const resolvedPath = resolveSkillPath(nameOrPath, repoRoot);

    const markerPath = join(resolvedPath, config.markerFile);
    if (existsSync(markerPath)) {
      return loadSkillFromMarkdown(markerPath);
    }

    if (existsSync(resolvedPath)) {
      return loadSkillFromFile(resolvedPath);
    }

    throw new SkillLoaderError(`${config.label} not found at path: ${nameOrPath}`);
  }

  // 3. Check conventional directories
  if (repoRoot) {
    for (const dir of config.directories) {
      const dirPath = join(repoRoot, dir);

      const markerPath = join(dirPath, nameOrPath, config.markerFile);
      if (existsSync(markerPath)) {
        return loadSkillFromMarkdown(markerPath);
      }

      const mdPath = join(dirPath, `${nameOrPath}.md`);
      if (existsSync(mdPath)) {
        return loadSkillFromMarkdown(mdPath);
      }
    }
  }

  if (config.builtinDirectories) {
    if (!BUILTIN_SKILL_NAME_SET.has(nameOrPath)) {
      throw new SkillLoaderError(`${config.label} not found: ${nameOrPath}`);
    }

    for (const root of resolvePackageRootCandidates()) {
      for (const dir of config.builtinDirectories) {
        const skillPath = builtinSkillPath(root, nameOrPath, dir, config.markerFile);
        if (skillPath) {
          return loadSkillFromMarkdown(skillPath);
        }
      }
    }
  }

  throw new SkillLoaderError(`${config.label} not found: ${nameOrPath}`);
}

const SKILL_RESOLVE_CONFIG: ResolveConfig = {
  markerFile: 'SKILL.md',
  directories: SKILL_DIRECTORIES,
  builtinDirectories: BUILTIN_SKILL_DIRECTORIES,
  label: 'Skill',
  kind: 'skill',
};

const AGENT_RESOLVE_CONFIG: ResolveConfig = {
  markerFile: AGENT_MARKER_FILE,
  directories: AGENT_DIRECTORIES,
  label: 'Agent',
  kind: 'agent',
};

/**
 * Resolve a skill by name or path.
 *
 * Resolution order:
 * 1. Remote repository (if remote option is set)
 * 2. Direct path (if nameOrPath contains / or \ or starts with .)
 *    - Directory: load SKILL.md from it
 *    - File: load the .md file directly
 * 3. Conventional directories (if repoRoot provided)
 *    - .warden/skills/{name}/SKILL.md or .warden/skills/{name}.md
 *    - .agents/skills/{name}/SKILL.md or .agents/skills/{name}.md
 *    - .claude/skills/{name}/SKILL.md or .claude/skills/{name}.md
 * 4. Package-native built-in skills
 *    - src/builtin-skills/{name}/SKILL.md or src/builtin-skills/{name}.md
 */
export async function resolveSkillAsync(
  nameOrPath: string,
  repoRoot?: string,
  options?: ResolveSkillOptions
): Promise<SkillDefinition> {
  return resolveEntry(nameOrPath, repoRoot, options, SKILL_RESOLVE_CONFIG);
}

// =============================================================================
// Agent Discovery (parallel to skills, using AGENT.md marker files)
// =============================================================================

/** An agent definition uses the same shape as a skill definition */
export type AgentDefinition = SkillDefinition;

/** A loaded agent with its source entry path */
export type LoadedAgent = LoadedSkill;

/** A discovered agent with source metadata */
export type DiscoveredAgent = DiscoveredSkill;

/**
 * Discover all available agents from conventional directories.
 *
 * @param repoRoot - Repository root path for finding agents
 * @param options - Options for loading (e.g., warning callback)
 * @returns Map of agent name to discovered agent info
 */
export async function discoverAllAgents(
  repoRoot?: string,
  options?: LoadSkillsOptions
): Promise<Map<string, DiscoveredAgent>> {
  if (!repoRoot) {
    return new Map();
  }
  return discoverFromDirectories(repoRoot, AGENT_DIRECTORIES, {
    ...options,
    markerFile: AGENT_MARKER_FILE,
  });
}

/**
 * Resolve an agent by name or path.
 *
 * Resolution order:
 * 1. Remote repository (if remote option is set)
 * 2. Direct path (if nameOrPath contains / or \ or starts with .)
 *    - Directory: load AGENT.md from it
 *    - File: load the .md file directly
 * 3. Conventional directories (if repoRoot provided)
 *    - .agents/agents/{name}/AGENT.md or .agents/agents/{name}.md
 *    - .claude/agents/{name}/AGENT.md or .claude/agents/{name}.md
 *    - .warden/agents/{name}/AGENT.md or .warden/agents/{name}.md
 */
export async function resolveAgentAsync(
  nameOrPath: string,
  repoRoot?: string,
  options?: ResolveSkillOptions
): Promise<AgentDefinition> {
  return resolveEntry(nameOrPath, repoRoot, options, AGENT_RESOLVE_CONFIG);
}
