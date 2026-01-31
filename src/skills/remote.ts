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
 * Normalize a GitHub URL to owner/repo format.
 * Returns null if the input is not a recognized GitHub URL.
 *
 * Supports:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - git@github.com:owner/repo.git
 */
function normalizeGitHubUrl(input: string): string | null {
  // HTTPS URL: https://github.com/owner/repo or https://github.com/owner/repo.git
  const httpsMatch = input.match(/^https?:\/\/github\.com\/([^/]+)\/([^/@]+?)(?:\.git)?$/);
  if (httpsMatch) {
    return `${httpsMatch[1]}/${httpsMatch[2]}`;
  }

  // SSH URL: git@github.com:owner/repo.git
  const sshMatch = input.match(/^git@github\.com:([^/]+)\/([^/@]+?)(?:\.git)?$/);
  if (sshMatch) {
    return `${sshMatch[1]}/${sshMatch[2]}`;
  }

  return null;
}

/**
 * Parse a remote reference string into its components.
 * Supports formats:
 * - "owner/repo" or "owner/repo@sha"
 * - "https://github.com/owner/repo" or "https://github.com/owner/repo@sha"
 * - "https://github.com/owner/repo.git" or "https://github.com/owner/repo.git@sha"
 * - "git@github.com:owner/repo.git" or "git@github.com:owner/repo.git@sha"
 */
export function parseRemoteRef(ref: string): ParsedRemoteRef {
  let inputRef = ref;
  let sha: string | undefined;

  // Extract SHA suffix from the input before URL normalization.
  // The SHA is always at the end, after a @ that follows the repo name.
  // For git@github.com URLs, we need to find the @ after the colon.
  if (ref.startsWith('git@')) {
    const colonIndex = ref.indexOf(':');
    if (colonIndex !== -1) {
      const afterColon = ref.slice(colonIndex + 1);
      const shaAtIndex = afterColon.lastIndexOf('@');
      if (shaAtIndex !== -1) {
        sha = afterColon.slice(shaAtIndex + 1);
        inputRef = ref.slice(0, colonIndex + 1 + shaAtIndex);
      }
    }
  } else {
    const lastAtIndex = ref.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const potentialSha = ref.slice(lastAtIndex + 1);
      // SHA should not contain : or / (those would indicate URL structure)
      if (!potentialSha.includes(':') && !potentialSha.includes('/')) {
        if (!potentialSha) {
          throw new SkillLoaderError(`Invalid remote ref: ${ref} (empty SHA after @)`);
        }
        sha = potentialSha;
        inputRef = ref.slice(0, lastAtIndex);
      }
    }
  }

  // Normalize GitHub URLs to owner/repo format
  const repoPath = normalizeGitHubUrl(inputRef) ?? inputRef;

  const slashIndex = repoPath.indexOf('/');
  if (slashIndex === -1) {
    throw new SkillLoaderError(`Invalid remote ref: ${ref} (expected owner/repo format)`);
  }

  const owner = repoPath.slice(0, slashIndex);
  const repo = repoPath.slice(slashIndex + 1);

  if (!owner || !repo) {
    throw new SkillLoaderError(`Invalid remote ref: ${ref} (empty owner or repo)`);
  }

  if (repo.includes('/')) {
    throw new SkillLoaderError(`Invalid remote ref: ${ref} (repo name cannot contain /)`);
  }

  // Security: Prevent git flag injection by rejecting values starting with '-'
  if (owner.startsWith('-')) {
    throw new SkillLoaderError(`Invalid remote ref: ${ref} (owner cannot start with -)`);
  }
  if (repo.startsWith('-')) {
    throw new SkillLoaderError(`Invalid remote ref: ${ref} (repo cannot start with -)`);
  }
  if (sha?.startsWith('-')) {
    throw new SkillLoaderError(`Invalid remote ref: ${ref} (SHA cannot start with -)`);
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

  // Check if we have a valid cache (directory exists AND state entry exists)
  const stateEntry = state.remotes[ref];
  const hasValidCache = isCached && !!stateEntry;

  // Handle offline mode
  if (offline) {
    if (hasValidCache) {
      return stateEntry.sha;
    }
    throw new SkillLoaderError(`Remote skill not cached and offline mode enabled: ${ref}`);
  }

  // Pinned + valid cache = use cache (SHA is immutable)
  if (isPinned && hasValidCache && !force && parsed.sha) {
    return parsed.sha;
  }

  // Unpinned + valid cache + fresh = use cache
  if (!isPinned && hasValidCache && !needsRefresh && !force) {
    return stateEntry.sha;
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
    // Note: '--' separates flags from positional args to prevent flag injection
    if (isPinned && parsed.sha) {
      // For pinned refs, we need full history to checkout the specific SHA
      // Use a shallow clone then deepen if needed
      execGit(['clone', '--depth=1', '--', repoUrl, remotePath]);

      try {
        // Try to checkout the pinned SHA
        // Note: 'checkout' without '--' treats arg as ref; with '--' it's a file path
        execGit(['fetch', '--depth=1', 'origin', '--', parsed.sha], { cwd: remotePath });
        execGit(['checkout', parsed.sha], { cwd: remotePath });
      } catch {
        // If SHA not found, do a full fetch and retry
        execGit(['fetch', '--unshallow'], { cwd: remotePath });
        execGit(['checkout', parsed.sha], { cwd: remotePath });
      }
    } else if (!isPinned) {
      // For unpinned refs, shallow clone of default branch
      execGit(['clone', '--depth=1', '--', repoUrl, remotePath]);
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

/** Directories to search for skills in remote repositories */
const REMOTE_SKILL_DIRECTORIES = ['', 'skills'];

/**
 * Discover all skills in a cached remote repository.
 * Searches both root level and skills/ subdirectory.
 */
export async function discoverRemoteSkills(ref: string): Promise<DiscoveredRemoteSkill[]> {
  const remotePath = getRemotePath(ref);

  if (!existsSync(remotePath)) {
    throw new SkillLoaderError(`Remote not cached: ${ref}. Run fetch first.`);
  }

  const skills: DiscoveredRemoteSkill[] = [];
  const seenNames = new Set<string>();

  // Search in root and skills/ subdirectory
  for (const subdir of REMOTE_SKILL_DIRECTORIES) {
    const searchPath = subdir ? join(remotePath, subdir) : remotePath;
    if (!existsSync(searchPath)) continue;

    const entries = readdirSync(searchPath);

    for (const entry of entries) {
      if (entry.startsWith('.')) continue;

      const entryPath = join(searchPath, entry);
      const stat = statSync(entryPath);

      if (stat.isDirectory()) {
        const skillMdPath = join(entryPath, 'SKILL.md');
        if (existsSync(skillMdPath)) {
          try {
            const skill = await loadSkillFromMarkdown(skillMdPath);
            // First occurrence wins (root takes precedence over skills/)
            if (!seenNames.has(skill.name)) {
              seenNames.add(skill.name);
              skills.push({
                name: skill.name,
                description: skill.description,
                path: entryPath,
              });
            }
          } catch {
            // Skip invalid skill directories
          }
        }
      }
    }
  }

  return skills;
}

/**
 * Resolve a skill from a remote repository.
 * Ensures the remote is fetched/cached, then loads the skill.
 * Matches by skill name (from SKILL.md), not directory name.
 */
export async function resolveRemoteSkill(
  ref: string,
  skillName: string,
  options: FetchRemoteOptions = {}
): Promise<SkillDefinition> {
  await fetchRemote(ref, options);

  const availableSkills = await discoverRemoteSkills(ref);
  const match = availableSkills.find((s) => s.name === skillName);

  if (match) {
    return loadSkillFromMarkdown(join(match.path, 'SKILL.md'));
  }

  if (availableSkills.length === 0) {
    throw new SkillLoaderError(`No skills found in remote: ${ref}`);
  }

  throw new SkillLoaderError(
    `Skill '${skillName}' not found in remote: ${ref}. Available skills: ${availableSkills.map((s) => s.name).join(', ')}`
  );
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
