import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, renameSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import {
  parseSource as libParseSource,
  ensureCached,
  validateGitNameSafety,
  GitError,
  GitNameSafetyError,
  ParseSourceError,
  type GitErrorDetails,
} from '@sentry/dotagents-lib';
import { loadSkillFromMarkdown, SkillLoaderError, AGENT_MARKER_FILE } from './loader.js';
import type { SkillDefinition } from '../config/schema.js';

/** Default TTL for unpinned remote skills: 24 hours */
const DEFAULT_TTL_SECONDS = 86400;

/** Schema for a single remote entry in state.json */
const RemoteEntrySchema = z.object({
  sha: z.string(),
  fetchedAt: z.string().datetime(),
  cloneUrl: z.string().optional(),
});

/** Schema for the entire state.json file */
const RemoteStateSchema = z.object({
  remotes: z.record(z.string(), RemoteEntrySchema),
});

export type RemoteEntry = z.infer<typeof RemoteEntrySchema>;
export type RemoteState = z.infer<typeof RemoteStateSchema>;

/** Schema for a plugin in marketplace.json */
const MarketplacePluginSchema = z.object({
  name: z.string(),
  source: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
});

/** Schema for .claude-plugin/marketplace.json */
const MarketplaceConfigSchema = z.object({
  $schema: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  plugins: z.array(MarketplacePluginSchema),
});

type MarketplaceConfig = z.infer<typeof MarketplaceConfigSchema>;

/** Parsed remote reference */
export interface ParsedRemoteRef {
  owner: string;
  repo: string;
  sha?: string;
  /** Original clone URL when a full URL was provided (SSH or HTTPS). Undefined for owner/repo shorthand. */
  cloneUrl?: string;
}

/**
 * Parse a remote reference string into its components. Delegates the grammar
 * to `@sentry/dotagents-lib`'s `parseSource` and the safety gate to
 * `validateGitNameSafety`. Lib errors are translated to `SkillLoaderError`
 * with warden-formatted messages so the public contract stays stable.
 *
 * Accepted shapes: `owner/repo[@sha]` (GitHub), `https://github.com/...`,
 * `git@github.com:...`, GitLab equivalents (incl. nested groups), and HTTP
 * forms which are upgraded to HTTPS.
 */
export function parseRemoteRef(ref: string): ParsedRemoteRef {
  if (ref.startsWith('path:')) {
    throw new SkillLoaderError(
      `Invalid remote ref: ${ref} (use --path for local sources; --remote is for network-fetched sources)`,
    );
  }

  let parsed;
  try {
    parsed = libParseSource(ref);
  } catch (err) {
    if (err instanceof ParseSourceError) {
      const detail = err.kind === 'empty-sha' ? 'empty SHA after @' : 'repo name cannot contain /';
      throw new SkillLoaderError(`Invalid remote ref: ${ref} (${detail})`);
    }
    throw err;
  }

  if (parsed.type === 'local') {
    throw new SkillLoaderError(`Invalid remote ref: ${ref} (local sources are not supported here)`);
  }
  if (parsed.type === 'well-known') {
    throw new SkillLoaderError(
      `Invalid remote ref: ${ref} (well-known HTTPS sources are not supported by warden)`,
    );
  }

  const owner = parsed.owner ?? '';
  const repo = parsed.repo ?? '';
  const sha = parsed.ref;

  // Bare-shorthand inputs without a slash (`noslash`) reach here with empty
  // repo since lib populates owner only.
  if (!owner || !repo) {
    throw new SkillLoaderError(`Invalid remote ref: ${ref} (expected owner/repo format)`);
  }

  try {
    validateGitNameSafety({ owner, repo, ref: sha });
  } catch (err) {
    if (err instanceof GitNameSafetyError) {
      const fieldLabel = err.field === 'ref' ? 'SHA' : err.field;
      const detail = err.reason === 'leading-dash'
        ? `${fieldLabel} cannot start with -`
        : `${fieldLabel} contains invalid characters`;
      throw new SkillLoaderError(`Invalid remote ref: ${ref} (${detail})`);
    }
    throw err;
  }

  return { owner, repo, sha, cloneUrl: parsed.cloneUrl };
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

  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }

  const tempPath = `${statePath}.tmp`;
  writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8');
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

  const entry = state.remotes[formatRemoteRef(parsed)];
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

export { GitError };
export type { GitErrorDetails };

/** Encode the pin into the lib `cacheKey` so pinned and unpinned land in separate dirs. */
function cacheKeyFor(parsed: ParsedRemoteRef): string {
  if (parsed.sha) {
    return `${parsed.owner}/${parsed.repo}@${parsed.sha}`;
  }
  return `${parsed.owner}/${parsed.repo}`;
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

  // Normalize state key so different URL forms (SSH, HTTPS, shorthand) share one entry
  const stateKey = formatRemoteRef(parsed);

  const isPinned = !!parsed.sha;
  const isCached = existsSync(remotePath);
  const needsRefresh = shouldRefresh(ref, state);

  // Check if we have a valid cache (directory exists AND state entry exists)
  const stateEntry = state.remotes[stateKey];
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

  // Use the original clone URL if provided, fall back to stored URL from state, then HTTPS
  const cloneUrl = parsed.cloneUrl ?? stateEntry?.cloneUrl ?? `https://github.com/${parsed.owner}/${parsed.repo}.git`;

  onProgress?.(isCached ? `Updating ${ref}...` : `Cloning ${ref}...`);

  const cached = await ensureCached({
    stateDir: getSkillsCacheDir(),
    url: cloneUrl,
    cacheKey: cacheKeyFor(parsed),
    ref: parsed.sha,
  });

  // Update state with normalized key — preserve cloneUrl for future re-clones
  const persistedCloneUrl = parsed.cloneUrl ?? stateEntry?.cloneUrl;
  state.remotes[stateKey] = {
    sha: cached.commit,
    fetchedAt: new Date().toISOString(),
    ...(persistedCloneUrl ? { cloneUrl: persistedCloneUrl } : {}),
  };
  saveState(state);

  return cached.commit;
}

export interface DiscoveredRemoteSkill {
  name: string;
  description: string;
  path: string;
  /** Plugin name for marketplace format skills */
  pluginName?: string;
}

/**
 * Parse marketplace.json from a remote repository if it exists.
 * Returns null if the file doesn't exist or is invalid.
 */
function parseMarketplaceConfig(remotePath: string): MarketplaceConfig | null {
  const marketplacePath = join(remotePath, '.claude-plugin', 'marketplace.json');

  if (!existsSync(marketplacePath)) {
    return null;
  }

  try {
    const content = readFileSync(marketplacePath, 'utf-8');
    const data = JSON.parse(content);
    return MarketplaceConfigSchema.parse(data);
  } catch {
    // Invalid or malformed marketplace.json - fall back to traditional discovery
    return null;
  }
}

/** Directories to search for skills in remote repositories */
const REMOTE_SKILL_DIRECTORIES = [
  '',               // root level
  'skills',         // skills/ subdirectory
  '.agents/skills', // General agent skills (primary)
  '.claude/skills', // Claude Code skills
  '.warden/skills', // Repo-local generated skills
];

/** Directories to search for agents in remote repositories */
const REMOTE_AGENT_DIRECTORIES = [
  '',               // root level
  'agents',         // agents/ subdirectory
  '.agents/agents', // Primary
  '.claude/agents', // Claude Code agents
  '.warden/agents', // Legacy
];

/**
 * Discover entries (skills or agents) using traditional directory layout.
 * Searches the given subdirectories for directories containing the marker file.
 * First occurrence of a name wins (earlier directories have higher precedence).
 */
async function discoverTraditional(
  remotePath: string,
  directories: string[],
  markerFile: string,
): Promise<DiscoveredRemoteSkill[]> {
  const results: DiscoveredRemoteSkill[] = [];
  const seenNames = new Set<string>();

  for (const subdir of directories) {
    const searchPath = subdir ? join(remotePath, subdir) : remotePath;
    if (!existsSync(searchPath)) continue;

    const entries = readdirSync(searchPath);

    for (const entry of entries) {
      if (entry.startsWith('.')) continue;

      const entryPath = join(searchPath, entry);
      const stat = statSync(entryPath);

      if (stat.isDirectory()) {
        const markerPath = join(entryPath, markerFile);
        if (existsSync(markerPath)) {
          try {
            const loaded = await loadSkillFromMarkdown(markerPath);
            if (!seenNames.has(loaded.name)) {
              seenNames.add(loaded.name);
              results.push({
                name: loaded.name,
                description: loaded.description,
                path: entryPath,
              });
            }
          } catch {
            // Skip invalid entries
          }
        }
      }
    }
  }

  return results;
}

/**
 * Discover skills using marketplace format.
 * Searches plugins/{plugin}/skills/ for each plugin defined in marketplace.json.
 */
async function discoverMarketplaceSkills(
  remotePath: string,
  config: MarketplaceConfig
): Promise<DiscoveredRemoteSkill[]> {
  const skills: DiscoveredRemoteSkill[] = [];
  const seenNames = new Set<string>();

  for (const plugin of config.plugins) {
    // Resolve plugin source path (e.g., "./plugins/sentry-skills" -> "plugins/sentry-skills")
    const pluginSource = plugin.source.replace(/^\.\//, '');
    const skillsPath = join(remotePath, pluginSource, 'skills');

    // Security: Ensure plugin source doesn't escape the repo directory via path traversal
    const resolvedSkillsPath = resolve(skillsPath);
    const resolvedRemotePath = resolve(remotePath);
    if (!resolvedSkillsPath.startsWith(resolvedRemotePath + '/')) {
      continue; // Silently skip — attacker-controlled marketplace.json, don't leak info
    }

    if (!existsSync(skillsPath)) continue;

    const entries = readdirSync(skillsPath);

    for (const entry of entries) {
      if (entry.startsWith('.')) continue;

      const entryPath = join(skillsPath, entry);
      const stat = statSync(entryPath);

      if (stat.isDirectory()) {
        const skillMdPath = join(entryPath, 'SKILL.md');
        if (existsSync(skillMdPath)) {
          try {
            const skill = await loadSkillFromMarkdown(skillMdPath);
            if (!seenNames.has(skill.name)) {
              seenNames.add(skill.name);
              skills.push({
                name: skill.name,
                description: skill.description,
                path: entryPath,
                pluginName: plugin.name,
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
 * Discover all skills in a cached remote repository.
 * Detects format and delegates to appropriate discovery function:
 * - If .claude-plugin/marketplace.json exists, uses marketplace discovery
 * - Otherwise, uses traditional discovery (root, skills/, .warden/skills, etc.)
 */
export async function discoverRemoteSkills(ref: string): Promise<DiscoveredRemoteSkill[]> {
  const remotePath = getRemotePath(ref);

  if (!existsSync(remotePath)) {
    throw new SkillLoaderError(`Remote not cached: ${ref}. Run fetch first.`);
  }

  // Check for marketplace format
  const marketplaceConfig = parseMarketplaceConfig(remotePath);
  if (marketplaceConfig) {
    return discoverMarketplaceSkills(remotePath, marketplaceConfig);
  }

  // Fall back to traditional discovery
  return discoverTraditional(remotePath, REMOTE_SKILL_DIRECTORIES, 'SKILL.md');
}

/**
 * Resolve a remote entry (skill or agent) by name.
 * Fetches the remote, discovers available entries, and loads the matching one.
 */
async function resolveRemoteEntry(
  ref: string,
  name: string,
  markerFile: string,
  discoverFn: (ref: string) => Promise<DiscoveredRemoteSkill[]>,
  label: string,
  options: FetchRemoteOptions = {},
): Promise<SkillDefinition> {
  await fetchRemote(ref, options);

  const available = await discoverFn(ref);
  const match = available.find((entry) => entry.name === name);

  if (match) {
    return loadSkillFromMarkdown(join(match.path, markerFile));
  }

  const labelLower = label.toLowerCase();

  if (available.length === 0) {
    throw new SkillLoaderError(`No ${labelLower}s found in remote: ${ref}`);
  }

  throw new SkillLoaderError(
    `${label} '${name}' not found in remote: ${ref}. Available ${labelLower}s: ${available.map((e) => e.name).join(', ')}`
  );
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
  return resolveRemoteEntry(ref, skillName, 'SKILL.md', discoverRemoteSkills, 'Skill', options);
}

/**
 * Remove a remote from the cache.
 */
export function removeRemote(ref: string): void {
  const remotePath = getRemotePath(ref);

  if (existsSync(remotePath)) {
    rmSync(remotePath, { recursive: true, force: true });
  }

  const stateKey = formatRemoteRef(parseRemoteRef(ref));
  const state = loadState();
  const { [stateKey]: _removed, ...remainingRemotes } = state.remotes;
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

// =============================================================================
// Agent Discovery (parallel to skills, using AGENT.md marker files)
// =============================================================================

export type DiscoveredRemoteAgent = DiscoveredRemoteSkill;

/**
 * Discover all agents in a cached remote repository.
 * Uses traditional discovery only (no marketplace format for agents).
 */
export async function discoverRemoteAgents(ref: string): Promise<DiscoveredRemoteAgent[]> {
  const remotePath = getRemotePath(ref);

  if (!existsSync(remotePath)) {
    throw new SkillLoaderError(`Remote not cached: ${ref}. Run fetch first.`);
  }

  return discoverTraditional(remotePath, REMOTE_AGENT_DIRECTORIES, AGENT_MARKER_FILE);
}

/**
 * Resolve an agent from a remote repository.
 * Ensures the remote is fetched/cached, then loads the agent.
 * Matches by agent name (from AGENT.md), not directory name.
 */
export async function resolveRemoteAgent(
  ref: string,
  agentName: string,
  options: FetchRemoteOptions = {}
): Promise<SkillDefinition> {
  return resolveRemoteEntry(ref, agentName, AGENT_MARKER_FILE, discoverRemoteAgents, 'Agent', options);
}
