import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, renameSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { z } from 'zod';
import { loadSkillFromMarkdown, SkillLoaderError } from './loader.js';
import type { SkillDefinition } from '../config/schema.js';

/** Default TTL for unpinned remote skills: 24 hours */
const DEFAULT_TTL_SECONDS = 86400;

/** Schema for a single remote entry in state.json */
const RemoteEntrySchema = z.object({
  sha: z.string(),
  fetchedAt: z.string().datetime(),
});

/** Schema for the entire state.json file */
const RemoteStateSchema = z.object({
  remotes: z.record(z.string(), RemoteEntrySchema),
});

export type RemoteEntry = z.infer<typeof RemoteEntrySchema>;
export type RemoteState = z.infer<typeof RemoteStateSchema>;

/** Parsed remote reference */
export interface ParsedRemoteRef {
  owner: string;
  repo: string;
  sha?: string;
}

/**
 * Parse a remote reference string into its components.
 * Supports formats: "owner/repo" or "owner/repo@sha"
 */
export function parseRemoteRef(ref: string): ParsedRemoteRef {
  const atIndex = ref.indexOf('@');
  let repoPath: string;
  let sha: string | undefined;

  if (atIndex !== -1) {
    repoPath = ref.slice(0, atIndex);
    sha = ref.slice(atIndex + 1);
    if (!sha) {
      throw new SkillLoaderError(`Invalid remote ref: ${ref} (empty SHA after @)`);
    }
  } else {
    repoPath = ref;
  }

  const slashIndex = repoPath.indexOf('/');
  if (slashIndex === -1) {
    throw new SkillLoaderError(`Invalid remote ref: ${ref} (expected owner/repo format)`);
  }

  const owner = repoPath.slice(0, slashIndex);
  const repo = repoPath.slice(slashIndex + 1);

  if (!owner || !repo) {
    throw new SkillLoaderError(`Invalid remote ref: ${ref} (empty owner or repo)`);
  }

  // Ensure repo doesn't contain additional slashes
  if (repo.includes('/')) {
    throw new SkillLoaderError(`Invalid remote ref: ${ref} (repo name cannot contain /)`);
  }

  return { owner, repo, sha };
}

/**
 * Format a parsed remote ref back to string format.
 */
export function formatRemoteRef(parsed: ParsedRemoteRef): string {
  const base = `${parsed.owner}/${parsed.repo}`;
  return parsed.sha ? `${base}@${parsed.sha}` : base;
}

/**
 * Get the base directory for caching remote skills.
 * Respects WARDEN_STATE_DIR environment variable.
 * Default: ~/.local/warden/skills/
 */
export function getSkillsCacheDir(): string {
  const stateDir = process.env['WARDEN_STATE_DIR'];
  if (stateDir) {
    return join(stateDir, 'skills');
  }
  return join(homedir(), '.local', 'warden', 'skills');
}

/**
 * Get the cache path for a specific remote ref.
 * - Unpinned: ~/.local/warden/skills/owner/repo/
 * - Pinned: ~/.local/warden/skills/owner/repo@sha/
 */
export function getRemotePath(ref: string): string {
  const parsed = parseRemoteRef(ref);
  const cacheDir = getSkillsCacheDir();

  if (parsed.sha) {
    return join(cacheDir, parsed.owner, `${parsed.repo}@${parsed.sha}`);
  }
  return join(cacheDir, parsed.owner, parsed.repo);
}

/**
 * Get the path to the state.json file.
 */
export function getStatePath(): string {
  return join(getSkillsCacheDir(), 'state.json');
}

/**
 * Load the remote state from state.json.
 * Returns an empty state if the file doesn't exist.
 */
export function loadState(): RemoteState {
  const statePath = getStatePath();

  if (!existsSync(statePath)) {
    return { remotes: {} };
  }

  try {
    const content = readFileSync(statePath, 'utf-8');
    const data = JSON.parse(content);
    return RemoteStateSchema.parse(data);
  } catch (error) {
    // If state is corrupted, start fresh
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Failed to load state.json, starting fresh: ${message}`);
    return { remotes: {} };
  }
}

/**
 * Save the remote state to state.json.
 * Uses atomic write (write to temp, then rename).
 */
export function saveState(state: RemoteState): void {
  const statePath = getStatePath();
  const stateDir = dirname(statePath);

  // Ensure directory exists
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }

  // Write atomically
  const tempPath = `${statePath}.tmp`;
  writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8');

  // Rename is atomic on most filesystems
  renameSync(tempPath, statePath);
}

/**
 * Get the TTL for remote skill cache in seconds.
 * Respects WARDEN_SKILL_CACHE_TTL environment variable.
 */
export function getCacheTtlSeconds(): number {
  const envTtl = process.env['WARDEN_SKILL_CACHE_TTL'];
  if (envTtl) {
    const parsed = parseInt(envTtl, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_TTL_SECONDS;
}

/**
 * Check if an unpinned remote ref needs to be refreshed.
 * Pinned refs (with @sha) never need refresh.
 */
export function shouldRefresh(ref: string, state: RemoteState): boolean {
  const parsed = parseRemoteRef(ref);

  // Pinned refs are immutable - never refresh
  if (parsed.sha) {
    return false;
  }

  const entry = state.remotes[ref];
  if (!entry) {
    return true; // Not cached, needs fetch
  }

  const fetchedAt = new Date(entry.fetchedAt).getTime();
  const now = Date.now();
  const ttl = getCacheTtlSeconds() * 1000;

  return now - fetchedAt > ttl;
}

export interface FetchRemoteOptions {
  /** Force refresh even if cache is valid */
  force?: boolean;
  /** Skip network operations - only use cache */
  offline?: boolean;
  /** Callback for progress messages */
  onProgress?: (message: string) => void;
}

/**
 * Execute a git command and return stdout.
 * Uses execFileSync to avoid shell injection vulnerabilities.
 * Throws SkillLoaderError on failure.
 */
function execGit(args: string[], options?: { cwd?: string }): string {
  try {
    return execFileSync('git', args, {
      encoding: 'utf-8',
      cwd: options?.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new SkillLoaderError(`Git command failed: git ${args.join(' ')}: ${message}`);
  }
}

/**
 * Clone or update a remote repository to the cache.
 * Returns the SHA of the fetched commit.
 */
export async function fetchRemote(ref: string, options: FetchRemoteOptions = {}): Promise<string> {
  const { force = false, offline = false, onProgress } = options;
  const parsed = parseRemoteRef(ref);
  const remotePath = getRemotePath(ref);
  const state = loadState();

  const isPinned = !!parsed.sha;
  const isCached = existsSync(remotePath);
  const needsRefresh = shouldRefresh(ref, state);

  // Handle offline mode
  if (offline) {
    if (isCached) {
      const entry = state.remotes[ref];
      return entry?.sha ?? 'unknown';
    }
    throw new SkillLoaderError(`Remote skill not cached and offline mode enabled: ${ref}`);
  }

  // Pinned + cached = use cache (SHA is immutable)
  if (isPinned && isCached && !force && parsed.sha) {
    return parsed.sha;
  }

  // Unpinned + cached + fresh = use cache
  if (!isPinned && isCached && !needsRefresh && !force) {
    const entry = state.remotes[ref];
    return entry?.sha ?? 'unknown';
  }

  const repoUrl = `https://github.com/${parsed.owner}/${parsed.repo}.git`;

  // Clone or update
  if (!isCached) {
    onProgress?.(`Cloning ${ref}...`);

    // Ensure parent directory exists
    const parentDir = dirname(remotePath);
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }

    // Clone with minimal depth for unpinned refs
    if (isPinned && parsed.sha) {
      // For pinned refs, we need full history to checkout the specific SHA
      // Use a shallow clone then deepen if needed
      execGit(['clone', '--depth=1', repoUrl, remotePath]);

      try {
        // Try to checkout the pinned SHA
        execGit(['fetch', '--depth=1', 'origin', parsed.sha], { cwd: remotePath });
        execGit(['checkout', parsed.sha], { cwd: remotePath });
      } catch {
        // If SHA not found, do a full fetch and retry
        execGit(['fetch', '--unshallow'], { cwd: remotePath });
        execGit(['checkout', parsed.sha], { cwd: remotePath });
      }
    } else if (!isPinned) {
      // For unpinned refs, shallow clone of default branch
      execGit(['clone', '--depth=1', repoUrl, remotePath]);
    }
  } else {
    // Update existing cache
    onProgress?.(`Updating ${ref}...`);

    if (!isPinned) {
      // For unpinned refs, pull latest
      execGit(['fetch', '--depth=1', 'origin'], { cwd: remotePath });
      execGit(['reset', '--hard', 'origin/HEAD'], { cwd: remotePath });
    }
    // Pinned refs don't need updates - SHA is immutable
  }

  // Get the current HEAD SHA
  const sha = execGit(['rev-parse', 'HEAD'], { cwd: remotePath });

  // Update state
  state.remotes[ref] = {
    sha,
    fetchedAt: new Date().toISOString(),
  };
  saveState(state);

  return sha;
}

export interface DiscoveredRemoteSkill {
  name: string;
  description: string;
  path: string;
}

/**
 * Discover all skills in a cached remote repository.
 */
export async function discoverRemoteSkills(ref: string): Promise<DiscoveredRemoteSkill[]> {
  const remotePath = getRemotePath(ref);

  if (!existsSync(remotePath)) {
    throw new SkillLoaderError(`Remote not cached: ${ref}. Run fetch first.`);
  }

  const skills: DiscoveredRemoteSkill[] = [];

  // Look for skill directories (each with SKILL.md)
  const entries = readdirSync(remotePath);

  for (const entry of entries) {
    if (entry.startsWith('.')) continue;

    const entryPath = join(remotePath, entry);
    const stat = statSync(entryPath);

    if (stat.isDirectory()) {
      const skillMdPath = join(entryPath, 'SKILL.md');
      if (existsSync(skillMdPath)) {
        try {
          const skill = await loadSkillFromMarkdown(skillMdPath);
          skills.push({
            name: skill.name,
            description: skill.description,
            path: entryPath,
          });
        } catch {
          // Skip invalid skill directories
        }
      }
    }
  }

  return skills;
}

/**
 * Resolve a skill from a remote repository.
 * Ensures the remote is fetched/cached, then loads the skill.
 */
export async function resolveRemoteSkill(
  ref: string,
  skillName: string,
  options: FetchRemoteOptions = {}
): Promise<SkillDefinition> {
  // Ensure remote is fetched
  await fetchRemote(ref, options);

  const remotePath = getRemotePath(ref);
  const skillPath = join(remotePath, skillName, 'SKILL.md');

  if (!existsSync(skillPath)) {
    // List available skills for helpful error
    const availableSkills = await discoverRemoteSkills(ref);
    const skillNames = availableSkills.map((s) => s.name);

    if (skillNames.length === 0) {
      throw new SkillLoaderError(`No skills found in remote: ${ref}`);
    }

    throw new SkillLoaderError(
      `Skill '${skillName}' not found in remote: ${ref}. Available skills: ${skillNames.join(', ')}`
    );
  }

  return loadSkillFromMarkdown(skillPath);
}

/**
 * Remove a remote from the cache.
 */
export function removeRemote(ref: string): void {
  const remotePath = getRemotePath(ref);

  if (existsSync(remotePath)) {
    rmSync(remotePath, { recursive: true, force: true });
  }

  const state = loadState();
  const { [ref]: _removed, ...remainingRemotes } = state.remotes;
  state.remotes = remainingRemotes;
  saveState(state);
}

/**
 * List all cached remotes with their metadata.
 */
export function listCachedRemotes(): { ref: string; entry: RemoteEntry }[] {
  const state = loadState();
  return Object.entries(state.remotes).map(([ref, entry]) => ({ ref, entry }));
}
