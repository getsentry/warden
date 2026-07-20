export const id = 114;
export const ids = [114];
export const modules = {

/***/ 80114:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   resolveRemoteAgent: () => (/* binding */ resolveRemoteAgent),
/* harmony export */   resolveRemoteSkill: () => (/* binding */ resolveRemoteSkill)
/* harmony export */ });
/* unused harmony exports parseRemoteRef, formatRemoteRef, getSkillsCacheDir, getRemotePath, getStatePath, loadState, saveState, getCacheTtlSeconds, shouldRefresh, fetchRemote, discoverRemoteSkills, removeRemote, listCachedRemotes, discoverRemoteAgents */
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(73024);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_os__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(48161);
/* harmony import */ var node_os__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(node_os__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(76760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(node_path__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(53391);
/* harmony import */ var _sentry_dotagents_lib__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(9263);
/* harmony import */ var _loader_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(34691);






/** Default TTL for unpinned remote skills: 24 hours */
const DEFAULT_TTL_SECONDS = 86400;
/** Schema for a single remote entry in state.json */
const RemoteEntrySchema = zod__WEBPACK_IMPORTED_MODULE_5__/* .object */ .Ik({
    sha: zod__WEBPACK_IMPORTED_MODULE_5__/* .string */ .Yj(),
    fetchedAt: zod__WEBPACK_IMPORTED_MODULE_5__/* .string */ .Yj().datetime(),
    cloneUrl: zod__WEBPACK_IMPORTED_MODULE_5__/* .string */ .Yj().optional(),
});
/** Schema for the entire state.json file */
const RemoteStateSchema = zod__WEBPACK_IMPORTED_MODULE_5__/* .object */ .Ik({
    remotes: zod__WEBPACK_IMPORTED_MODULE_5__/* .record */ .g1(zod__WEBPACK_IMPORTED_MODULE_5__/* .string */ .Yj(), RemoteEntrySchema),
});
/** Schema for a plugin in marketplace.json */
const MarketplacePluginSchema = zod__WEBPACK_IMPORTED_MODULE_5__/* .object */ .Ik({
    name: zod__WEBPACK_IMPORTED_MODULE_5__/* .string */ .Yj(),
    source: zod__WEBPACK_IMPORTED_MODULE_5__/* .string */ .Yj(),
    description: zod__WEBPACK_IMPORTED_MODULE_5__/* .string */ .Yj().optional(),
    category: zod__WEBPACK_IMPORTED_MODULE_5__/* .string */ .Yj().optional(),
});
/** Schema for .claude-plugin/marketplace.json */
const MarketplaceConfigSchema = zod__WEBPACK_IMPORTED_MODULE_5__/* .object */ .Ik({
    $schema: zod__WEBPACK_IMPORTED_MODULE_5__/* .string */ .Yj().optional(),
    name: zod__WEBPACK_IMPORTED_MODULE_5__/* .string */ .Yj(),
    description: zod__WEBPACK_IMPORTED_MODULE_5__/* .string */ .Yj().optional(),
    plugins: zod__WEBPACK_IMPORTED_MODULE_5__/* .array */ .YO(MarketplacePluginSchema),
});
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
function parseRemoteRef(ref) {
    if (ref.startsWith('path:')) {
        throw new _loader_js__WEBPACK_IMPORTED_MODULE_4__/* .SkillLoaderError */ .vN(`Invalid remote ref: ${ref} (use --path for local sources; --remote is for network-fetched sources)`);
    }
    let parsed;
    try {
        parsed = (0,_sentry_dotagents_lib__WEBPACK_IMPORTED_MODULE_3__/* .parseSource */ .PJ)(ref);
    }
    catch (err) {
        if (err instanceof _sentry_dotagents_lib__WEBPACK_IMPORTED_MODULE_3__/* .ParseSourceError */ .lY) {
            const detail = err.kind === 'empty-sha' ? 'empty SHA after @' : 'repo name cannot contain /';
            throw new _loader_js__WEBPACK_IMPORTED_MODULE_4__/* .SkillLoaderError */ .vN(`Invalid remote ref: ${ref} (${detail})`);
        }
        throw err;
    }
    if (parsed.type === 'local') {
        throw new _loader_js__WEBPACK_IMPORTED_MODULE_4__/* .SkillLoaderError */ .vN(`Invalid remote ref: ${ref} (local sources are not supported here)`);
    }
    if (parsed.type === 'well-known') {
        throw new _loader_js__WEBPACK_IMPORTED_MODULE_4__/* .SkillLoaderError */ .vN(`Invalid remote ref: ${ref} (well-known HTTPS sources are not supported by warden)`);
    }
    const owner = parsed.owner ?? '';
    const repo = parsed.repo ?? '';
    const sha = parsed.ref;
    // Bare-shorthand inputs without a slash (`noslash`) reach here with empty
    // repo since lib populates owner only.
    if (!owner || !repo) {
        throw new _loader_js__WEBPACK_IMPORTED_MODULE_4__/* .SkillLoaderError */ .vN(`Invalid remote ref: ${ref} (expected owner/repo format)`);
    }
    try {
        (0,_sentry_dotagents_lib__WEBPACK_IMPORTED_MODULE_3__/* .validateGitNameSafety */ .Av)({ owner, repo, ref: sha });
    }
    catch (err) {
        if (err instanceof _sentry_dotagents_lib__WEBPACK_IMPORTED_MODULE_3__/* .GitNameSafetyError */ .S2) {
            const fieldLabel = err.field === 'ref' ? 'SHA' : err.field;
            const detail = err.reason === 'leading-dash'
                ? `${fieldLabel} cannot start with -`
                : `${fieldLabel} contains invalid characters`;
            throw new _loader_js__WEBPACK_IMPORTED_MODULE_4__/* .SkillLoaderError */ .vN(`Invalid remote ref: ${ref} (${detail})`);
        }
        throw err;
    }
    return { owner, repo, sha, cloneUrl: parsed.cloneUrl };
}
/**
 * Format a parsed remote ref back to string format.
 */
function formatRemoteRef(parsed) {
    const base = `${parsed.owner}/${parsed.repo}`;
    return parsed.sha ? `${base}@${parsed.sha}` : base;
}
/**
 * Get the base directory for caching remote skills.
 * Respects WARDEN_STATE_DIR environment variable.
 * Default: ~/.local/warden/skills/
 */
function getSkillsCacheDir() {
    const stateDir = process.env['WARDEN_STATE_DIR'];
    if (stateDir) {
        return (0,node_path__WEBPACK_IMPORTED_MODULE_2__.join)(stateDir, 'skills');
    }
    return (0,node_path__WEBPACK_IMPORTED_MODULE_2__.join)((0,node_os__WEBPACK_IMPORTED_MODULE_1__.homedir)(), '.local', 'warden', 'skills');
}
/**
 * Get the cache path for a specific remote ref.
 * - Unpinned: ~/.local/warden/skills/owner/repo/
 * - Pinned: ~/.local/warden/skills/owner/repo@sha/
 */
function getRemotePath(ref) {
    const parsed = parseRemoteRef(ref);
    const cacheDir = getSkillsCacheDir();
    if (parsed.sha) {
        return (0,node_path__WEBPACK_IMPORTED_MODULE_2__.join)(cacheDir, parsed.owner, `${parsed.repo}@${parsed.sha}`);
    }
    return (0,node_path__WEBPACK_IMPORTED_MODULE_2__.join)(cacheDir, parsed.owner, parsed.repo);
}
/**
 * Get the path to the state.json file.
 */
function getStatePath() {
    return (0,node_path__WEBPACK_IMPORTED_MODULE_2__.join)(getSkillsCacheDir(), 'state.json');
}
/**
 * Load the remote state from state.json.
 * Returns an empty state if the file doesn't exist.
 */
function loadState() {
    const statePath = getStatePath();
    if (!(0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)(statePath)) {
        return { remotes: {} };
    }
    try {
        const content = (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.readFileSync)(statePath, 'utf-8');
        const data = JSON.parse(content);
        return RemoteStateSchema.parse(data);
    }
    catch (error) {
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
function saveState(state) {
    const statePath = getStatePath();
    const stateDir = (0,node_path__WEBPACK_IMPORTED_MODULE_2__.dirname)(statePath);
    if (!(0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)(stateDir)) {
        (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.mkdirSync)(stateDir, { recursive: true });
    }
    const tempPath = `${statePath}.tmp`;
    (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.writeFileSync)(tempPath, JSON.stringify(state, null, 2), 'utf-8');
    (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.renameSync)(tempPath, statePath);
}
/**
 * Get the TTL for remote skill cache in seconds.
 * Respects WARDEN_SKILL_CACHE_TTL environment variable.
 */
function getCacheTtlSeconds() {
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
function shouldRefresh(ref, state) {
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

/** Encode the pin into the lib `cacheKey` so pinned and unpinned land in separate dirs. */
function cacheKeyFor(parsed) {
    if (parsed.sha) {
        return `${parsed.owner}/${parsed.repo}@${parsed.sha}`;
    }
    return `${parsed.owner}/${parsed.repo}`;
}
/**
 * Clone or update a remote repository to the cache.
 * Returns the SHA of the fetched commit.
 */
async function fetchRemote(ref, options = {}) {
    const { force = false, offline = false, onProgress } = options;
    const parsed = parseRemoteRef(ref);
    const remotePath = getRemotePath(ref);
    const state = loadState();
    // Normalize state key so different URL forms (SSH, HTTPS, shorthand) share one entry
    const stateKey = formatRemoteRef(parsed);
    const isPinned = !!parsed.sha;
    const isCached = (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)(remotePath);
    const needsRefresh = shouldRefresh(ref, state);
    // Check if we have a valid cache (directory exists AND state entry exists)
    const stateEntry = state.remotes[stateKey];
    const hasValidCache = isCached && !!stateEntry;
    // Handle offline mode
    if (offline) {
        if (hasValidCache) {
            return stateEntry.sha;
        }
        throw new _loader_js__WEBPACK_IMPORTED_MODULE_4__/* .SkillLoaderError */ .vN(`Remote skill not cached and offline mode enabled: ${ref}`);
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
    const cached = await (0,_sentry_dotagents_lib__WEBPACK_IMPORTED_MODULE_3__/* .ensureCached */ .vJ)({
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
/**
 * Parse marketplace.json from a remote repository if it exists.
 * Returns null if the file doesn't exist or is invalid.
 */
function parseMarketplaceConfig(remotePath) {
    const marketplacePath = (0,node_path__WEBPACK_IMPORTED_MODULE_2__.join)(remotePath, '.claude-plugin', 'marketplace.json');
    if (!(0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)(marketplacePath)) {
        return null;
    }
    try {
        const content = (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.readFileSync)(marketplacePath, 'utf-8');
        const data = JSON.parse(content);
        return MarketplaceConfigSchema.parse(data);
    }
    catch {
        // Invalid or malformed marketplace.json - fall back to traditional discovery
        return null;
    }
}
/** Directories to search for skills in remote repositories */
const REMOTE_SKILL_DIRECTORIES = [
    '', // root level
    'skills', // skills/ subdirectory
    '.agents/skills', // General agent skills (primary)
    '.claude/skills', // Claude Code skills
    '.warden/skills', // Repo-local generated skills
];
/** Directories to search for agents in remote repositories */
const REMOTE_AGENT_DIRECTORIES = [
    '', // root level
    'agents', // agents/ subdirectory
    '.agents/agents', // Primary
    '.claude/agents', // Claude Code agents
    '.warden/agents', // Legacy
];
/**
 * Discover entries (skills or agents) using traditional directory layout.
 * Searches the given subdirectories for directories containing the marker file.
 * First occurrence of a name wins (earlier directories have higher precedence).
 */
async function discoverTraditional(remotePath, directories, markerFile) {
    const results = [];
    const seenNames = new Set();
    for (const subdir of directories) {
        const searchPath = subdir ? (0,node_path__WEBPACK_IMPORTED_MODULE_2__.join)(remotePath, subdir) : remotePath;
        if (!(0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)(searchPath))
            continue;
        const entries = (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.readdirSync)(searchPath);
        for (const entry of entries) {
            if (entry.startsWith('.'))
                continue;
            const entryPath = (0,node_path__WEBPACK_IMPORTED_MODULE_2__.join)(searchPath, entry);
            const stat = (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.statSync)(entryPath);
            if (stat.isDirectory()) {
                const markerPath = (0,node_path__WEBPACK_IMPORTED_MODULE_2__.join)(entryPath, markerFile);
                if ((0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)(markerPath)) {
                    try {
                        const loaded = await (0,_loader_js__WEBPACK_IMPORTED_MODULE_4__/* .loadSkillFromMarkdown */ .hl)(markerPath);
                        if (!seenNames.has(loaded.name)) {
                            seenNames.add(loaded.name);
                            results.push({
                                name: loaded.name,
                                description: loaded.description,
                                path: entryPath,
                            });
                        }
                    }
                    catch {
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
async function discoverMarketplaceSkills(remotePath, config) {
    const skills = [];
    const seenNames = new Set();
    for (const plugin of config.plugins) {
        // Resolve plugin source path (e.g., "./plugins/sentry-skills" -> "plugins/sentry-skills")
        const pluginSource = plugin.source.replace(/^\.\//, '');
        const skillsPath = (0,node_path__WEBPACK_IMPORTED_MODULE_2__.join)(remotePath, pluginSource, 'skills');
        // Security: Ensure plugin source doesn't escape the repo directory via path traversal
        const resolvedSkillsPath = (0,node_path__WEBPACK_IMPORTED_MODULE_2__.resolve)(skillsPath);
        const resolvedRemotePath = (0,node_path__WEBPACK_IMPORTED_MODULE_2__.resolve)(remotePath);
        if (!resolvedSkillsPath.startsWith(resolvedRemotePath + '/')) {
            continue; // Silently skip — attacker-controlled marketplace.json, don't leak info
        }
        if (!(0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)(skillsPath))
            continue;
        const entries = (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.readdirSync)(skillsPath);
        for (const entry of entries) {
            if (entry.startsWith('.'))
                continue;
            const entryPath = (0,node_path__WEBPACK_IMPORTED_MODULE_2__.join)(skillsPath, entry);
            const stat = (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.statSync)(entryPath);
            if (stat.isDirectory()) {
                const skillMdPath = (0,node_path__WEBPACK_IMPORTED_MODULE_2__.join)(entryPath, 'SKILL.md');
                if ((0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)(skillMdPath)) {
                    try {
                        const skill = await (0,_loader_js__WEBPACK_IMPORTED_MODULE_4__/* .loadSkillFromMarkdown */ .hl)(skillMdPath);
                        if (!seenNames.has(skill.name)) {
                            seenNames.add(skill.name);
                            skills.push({
                                name: skill.name,
                                description: skill.description,
                                path: entryPath,
                                pluginName: plugin.name,
                            });
                        }
                    }
                    catch {
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
async function discoverRemoteSkills(ref) {
    const remotePath = getRemotePath(ref);
    if (!(0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)(remotePath)) {
        throw new _loader_js__WEBPACK_IMPORTED_MODULE_4__/* .SkillLoaderError */ .vN(`Remote not cached: ${ref}. Run fetch first.`);
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
async function resolveRemoteEntry(ref, name, markerFile, discoverFn, label, options = {}) {
    await fetchRemote(ref, options);
    const available = await discoverFn(ref);
    const match = available.find((entry) => entry.name === name);
    if (match) {
        return (0,_loader_js__WEBPACK_IMPORTED_MODULE_4__/* .loadSkillFromMarkdown */ .hl)((0,node_path__WEBPACK_IMPORTED_MODULE_2__.join)(match.path, markerFile));
    }
    const labelLower = label.toLowerCase();
    if (available.length === 0) {
        throw new _loader_js__WEBPACK_IMPORTED_MODULE_4__/* .SkillLoaderError */ .vN(`No ${labelLower}s found in remote: ${ref}`);
    }
    throw new _loader_js__WEBPACK_IMPORTED_MODULE_4__/* .SkillLoaderError */ .vN(`${label} '${name}' not found in remote: ${ref}. Available ${labelLower}s: ${available.map((e) => e.name).join(', ')}`);
}
/**
 * Resolve a skill from a remote repository.
 * Ensures the remote is fetched/cached, then loads the skill.
 * Matches by skill name (from SKILL.md), not directory name.
 */
async function resolveRemoteSkill(ref, skillName, options = {}) {
    return resolveRemoteEntry(ref, skillName, 'SKILL.md', discoverRemoteSkills, 'Skill', options);
}
/**
 * Remove a remote from the cache.
 */
function removeRemote(ref) {
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
function listCachedRemotes() {
    const state = loadState();
    return Object.entries(state.remotes).map(([ref, entry]) => ({ ref, entry }));
}
/**
 * Discover all agents in a cached remote repository.
 * Uses traditional discovery only (no marketplace format for agents).
 */
async function discoverRemoteAgents(ref) {
    const remotePath = getRemotePath(ref);
    if (!(0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)(remotePath)) {
        throw new _loader_js__WEBPACK_IMPORTED_MODULE_4__/* .SkillLoaderError */ .vN(`Remote not cached: ${ref}. Run fetch first.`);
    }
    return discoverTraditional(remotePath, REMOTE_AGENT_DIRECTORIES, _loader_js__WEBPACK_IMPORTED_MODULE_4__/* .AGENT_MARKER_FILE */ .qA);
}
/**
 * Resolve an agent from a remote repository.
 * Ensures the remote is fetched/cached, then loads the agent.
 * Matches by agent name (from AGENT.md), not directory name.
 */
async function resolveRemoteAgent(ref, agentName, options = {}) {
    return resolveRemoteEntry(ref, agentName, _loader_js__WEBPACK_IMPORTED_MODULE_4__/* .AGENT_MARKER_FILE */ .qA, discoverRemoteAgents, 'Agent', options);
}


/***/ })

};
