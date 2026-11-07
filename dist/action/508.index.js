export const id = 508;
export const ids = [508,117];
export const modules = {

/***/ 82117:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

var node_child_process__WEBPACK_IMPORTED_MODULE_0___namespace_cache;
var node_crypto__WEBPACK_IMPORTED_MODULE_1___namespace_cache;
var node_fs__WEBPACK_IMPORTED_MODULE_2___namespace_cache;
var node_path__WEBPACK_IMPORTED_MODULE_4___namespace_cache;
var node_stream__WEBPACK_IMPORTED_MODULE_5___namespace_cache;
var node_util__WEBPACK_IMPORTED_MODULE_6___namespace_cache;
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Et: () => (/* reexport fake namespace object from non-harmony */ node_crypto__WEBPACK_IMPORTED_MODULE_1___namespace_cache || (node_crypto__WEBPACK_IMPORTED_MODULE_1___namespace_cache = __webpack_require__.t(node_crypto__WEBPACK_IMPORTED_MODULE_1__, 2))),
/* harmony export */   Td: () => (/* reexport fake namespace object from non-harmony */ node_stream__WEBPACK_IMPORTED_MODULE_5___namespace_cache || (node_stream__WEBPACK_IMPORTED_MODULE_5___namespace_cache = __webpack_require__.t(node_stream__WEBPACK_IMPORTED_MODULE_5__, 2))),
/* harmony export */   ZS: () => (/* reexport fake namespace object from non-harmony */ node_util__WEBPACK_IMPORTED_MODULE_6___namespace_cache || (node_util__WEBPACK_IMPORTED_MODULE_6___namespace_cache = __webpack_require__.t(node_util__WEBPACK_IMPORTED_MODULE_6__, 2))),
/* harmony export */   fs: () => (/* reexport fake namespace object from non-harmony */ node_fs__WEBPACK_IMPORTED_MODULE_2___namespace_cache || (node_fs__WEBPACK_IMPORTED_MODULE_2___namespace_cache = __webpack_require__.t(node_fs__WEBPACK_IMPORTED_MODULE_2__, 2))),
/* harmony export */   hV: () => (/* reexport fake namespace object from non-harmony */ node_child_process__WEBPACK_IMPORTED_MODULE_0___namespace_cache || (node_child_process__WEBPACK_IMPORTED_MODULE_0___namespace_cache = __webpack_require__.t(node_child_process__WEBPACK_IMPORTED_MODULE_0__, 2))),
/* harmony export */   path: () => (/* reexport fake namespace object from non-harmony */ node_path__WEBPACK_IMPORTED_MODULE_4___namespace_cache || (node_path__WEBPACK_IMPORTED_MODULE_4___namespace_cache = __webpack_require__.t(node_path__WEBPACK_IMPORTED_MODULE_4__, 2)))
/* harmony export */ });
/* harmony import */ var node_child_process__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(31421);
/* harmony import */ var node_crypto__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(77598);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(73024);
/* harmony import */ var node_os__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(48161);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(76760);
/* harmony import */ var node_stream__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(57075);
/* harmony import */ var node_util__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(57975);
/**
 * The one module under `src/` that may import Node built-ins (eslint enforces this).
 * The package.json `browser` field swaps it for `./node.browser`, so only touch its
 * exports on code paths that run on Node-compatible runtimes.
 */








//# sourceMappingURL=node.mjs.map

/***/ }),

/***/ 77508:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  BashSession: () => (/* binding */ BashSession),
  BashTimeoutError: () => (/* binding */ BashTimeoutError),
  DEFAULT_MEMORY_SYNC_INTERVAL_MS: () => (/* reexport */ sync_interval/* DEFAULT_MEMORY_SYNC_INTERVAL_MS */.hL),
  MARKER_PATH: () => (/* reexport */ MARKER_PATH),
  MEMORY_FLUSH_TIMEOUT_MS: () => (/* reexport */ MEMORY_FLUSH_TIMEOUT_MS),
  MIN_MEMORY_SYNC_INTERVAL_MS: () => (/* reexport */ sync_interval/* MIN_MEMORY_SYNC_INTERVAL_MS */._3),
  SessionMemoryError: () => (/* reexport */ SessionMemoryError),
  SessionMemoryStores: () => (/* reexport */ SessionMemoryStores),
  betaAgentToolset20260401: () => (/* binding */ betaAgentToolset20260401),
  betaBashTool: () => (/* binding */ betaBashTool),
  betaEditTool: () => (/* binding */ betaEditTool),
  betaGlobTool: () => (/* binding */ betaGlobTool),
  betaGrepTool: () => (/* binding */ betaGrepTool),
  betaReadTool: () => (/* binding */ betaReadTool),
  betaWriteTool: () => (/* binding */ betaWriteTool),
  extractSkillArchive: () => (/* reexport */ extractSkillArchive),
  resolvePath: () => (/* binding */ resolvePath),
  setupSkills: () => (/* reexport */ setupSkills)
});

// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/tslib.mjs
var tslib = __webpack_require__(30431);
// EXTERNAL MODULE: external "node:fs/promises"
var promises_ = __webpack_require__(51455);
// EXTERNAL MODULE: external "node:fs"
var external_node_fs_ = __webpack_require__(73024);
// EXTERNAL MODULE: external "node:path"
var external_node_path_ = __webpack_require__(76760);
// EXTERNAL MODULE: external "node:child_process"
var external_node_child_process_ = __webpack_require__(31421);
// EXTERNAL MODULE: external "node:crypto"
var external_node_crypto_ = __webpack_require__(77598);
// EXTERNAL MODULE: external "node:readline"
var external_node_readline_ = __webpack_require__(80481);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/core/error.mjs
var error = __webpack_require__(79491);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/tools/ToolError.mjs
var ToolError = __webpack_require__(87455);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/index.mjs + 102 modules
var sdk = __webpack_require__(7071);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils.mjs
var utils = __webpack_require__(83280);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/transform-json-schema.mjs

// Supported string formats
const SUPPORTED_STRING_FORMATS = new Set([
    'date-time',
    'time',
    'date',
    'duration',
    'email',
    'hostname',
    'uri',
    'ipv4',
    'ipv6',
    'uuid',
]);
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
function transform_json_schema_transformJSONSchema(jsonSchema) {
    const workingCopy = deepClone(jsonSchema);
    return _transformJSONSchema(workingCopy);
}
function _transformJSONSchema(jsonSchema) {
    const strictSchema = {};
    const ref = pop(jsonSchema, '$ref');
    if (ref !== undefined) {
        strictSchema['$ref'] = ref;
        return strictSchema;
    }
    const defs = pop(jsonSchema, '$defs');
    if (defs !== undefined) {
        const strictDefs = {};
        strictSchema['$defs'] = strictDefs;
        for (const [name, defSchema] of Object.entries(defs)) {
            strictDefs[name] = _transformJSONSchema(defSchema);
        }
    }
    const type = pop(jsonSchema, 'type');
    const anyOf = pop(jsonSchema, 'anyOf');
    const oneOf = pop(jsonSchema, 'oneOf');
    const allOf = pop(jsonSchema, 'allOf');
    if (Array.isArray(anyOf)) {
        strictSchema['anyOf'] = anyOf.map((variant) => _transformJSONSchema(variant));
    }
    else if (Array.isArray(oneOf)) {
        strictSchema['anyOf'] = oneOf.map((variant) => _transformJSONSchema(variant));
    }
    else if (Array.isArray(allOf)) {
        strictSchema['allOf'] = allOf.map((entry) => _transformJSONSchema(entry));
    }
    else {
        if (type === undefined) {
            throw new Error('JSON schema must have a type defined if anyOf/oneOf/allOf are not used');
        }
        strictSchema['type'] = type;
    }
    const description = pop(jsonSchema, 'description');
    if (description !== undefined) {
        strictSchema['description'] = description;
    }
    const title = pop(jsonSchema, 'title');
    if (title !== undefined) {
        strictSchema['title'] = title;
    }
    if (type === 'object') {
        const properties = pop(jsonSchema, 'properties') || {};
        strictSchema['properties'] = Object.fromEntries(Object.entries(properties).map(([key, propSchema]) => [
            key,
            _transformJSONSchema(propSchema),
        ]));
        pop(jsonSchema, 'additionalProperties');
        strictSchema['additionalProperties'] = false;
        const required = pop(jsonSchema, 'required');
        if (required !== undefined) {
            strictSchema['required'] = required;
        }
    }
    else if (type === 'string') {
        const format = pop(jsonSchema, 'format');
        if (format !== undefined && SUPPORTED_STRING_FORMATS.has(format)) {
            strictSchema['format'] = format;
        }
        else if (format !== undefined) {
            jsonSchema['format'] = format;
        }
    }
    else if (type === 'array') {
        const items = pop(jsonSchema, 'items');
        if (items !== undefined) {
            strictSchema['items'] = _transformJSONSchema(items);
        }
        const minItems = pop(jsonSchema, 'minItems');
        if (minItems !== undefined && (minItems === 0 || minItems === 1)) {
            strictSchema['minItems'] = minItems;
        }
        else if (minItems !== undefined) {
            jsonSchema['minItems'] = minItems;
        }
    }
    if (Object.keys(jsonSchema).length > 0) {
        const existingDescription = strictSchema['description'];
        strictSchema['description'] =
            (existingDescription ? existingDescription + '\n\n' : '') +
                '{' +
                Object.entries(jsonSchema)
                    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                    .join(', ') +
                '}';
    }
    return strictSchema;
}
//# sourceMappingURL=transform-json-schema.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/helpers/beta/json-schema.mjs


/**
 * Creates a Tool with a provided JSON schema that can be passed
 * to the `.toolRunner()` method. The schema is used to automatically validate
 * the input arguments for the tool.
 */
function betaTool(options) {
    if (options.inputSchema.type !== 'object') {
        throw new Error(`JSON schema for tool "${options.name}" must be an object, but got ${options.inputSchema.type}`);
    }
    return {
        type: 'custom',
        name: options.name,
        input_schema: options.inputSchema,
        description: options.description,
        run: options.run,
        parse: (content) => content,
        ...(options.close ? { close: options.close } : {}),
    };
}
/**
 * Creates a JSON schema output format object from the given JSON schema.
 * If this is passed to the `.parse()` method then the response message will contain a
 * `.parsed_output` property that is the result of parsing the content with the given JSON schema.
 *
 */
function betaJSONSchemaOutputFormat(jsonSchema, options) {
    if (jsonSchema.type !== 'object') {
        throw new Error(`JSON schema for tool must be an object, but got ${jsonSchema.type}`);
    }
    const transform = options?.transform ?? true;
    if (transform) {
        // todo: doing this is arguably necessary, but it does change the schema the user passed in
        // so I'm not sure how we should handle that
        jsonSchema = transformJSONSchema(jsonSchema);
    }
    return {
        type: 'json_schema',
        schema: {
            ...jsonSchema,
        },
        parse: (content) => {
            try {
                return JSON.parse(content);
            }
            catch (error) {
                throw new AnthropicError(`Failed to parse structured output: ${error}`);
            }
        },
    };
}
//# sourceMappingURL=json-schema.mjs.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/promise.mjs
var promise = __webpack_require__(45946);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/node.mjs
var node = __webpack_require__(82117);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/tools/agent-toolset/fs-util.mjs
/**
 * Shared, Node-only filesystem helpers for the agent toolset's file tools:
 * path confinement (symlink-aware), an atomic write, and language-independent
 * error messages. Kept out of `node.ts` so the tool implementations stay focused
 * and these helpers can be reused by every file tool.
 */


const fs = node.fs.promises;
/** Mode for directories the file tools create: owner-only under any umask, like the memory tool. */
const DIR_CREATE_MODE = 0o700;
/**
 * Mode for files the file tools create: owner-only, so other local users can't
 * read what an agent wrote. A file that already exists keeps its own mode.
 */
const FILE_CREATE_MODE = 0o600;
/** True when `p` is `root` itself or lexically contained within it. */
function isWithin(root, p) {
    const rel = node.path.relative(root, p);
    return rel === '' || (!rel.startsWith('..' + node.path.sep) && rel !== '..' && !node.path.isAbsolute(rel));
}
/**
 * The first entry of `roots` whose canonical form contains the
 * already-canonical `target`, returned as configured; `undefined` when none
 * does. Each root goes through {@link canonicalize} at check time, exactly like
 * the workdir in {@link confineToRoot}, so granting access (`allowedRoots`)
 * and refusing writes (`readOnlyRoots`) can never resolve the same entry two
 * different ways.
 */
async function containingRoot(roots, target) {
    for (const root of roots) {
        if (isWithin(await canonicalize(node.path.resolve(root)), target))
            return root;
    }
    return undefined;
}
/** Matches Linux MAXSYMLINKS, the threshold at which `realpath` itself reports ELOOP. */
const MAX_SYMLINK_HOPS = 40;
/** The `code` of a Node system error, or `undefined` for anything else. */
function errnoCode(err) {
    const code = err?.code;
    return typeof code === 'string' ? code : undefined;
}
/**
 * Fully resolve `abs`: `realpath` the longest existing ancestor and re-append
 * the rest, but never re-append a component that is itself a symlink — read the
 * link and continue from its target instead. This handles paths being created
 * (write/edit) without letting a symlink leaf (e.g. a dangling one pointing
 * outside a confinement root) slip through unresolved.
 *
 * Returns a symlink-free path or throws an errno-carrying error (`ELOOP` for a
 * cycle or more than {@link MAX_SYMLINK_HOPS} links, the `lstat`/`realpath`
 * error for an unreadable component); it never returns `abs` unresolved. Only
 * symlink hops count against the cap, so any depth of not-yet-existing
 * directories still resolves.
 */
async function canonicalize(abs) {
    const tail = [];
    let prefix = abs;
    let hops = 0;
    for (;;) {
        let real;
        try {
            real = await fs.realpath(prefix);
        }
        catch (realpathErr) {
            let isLink;
            try {
                isLink = (await fs.lstat(prefix)).isSymbolicLink();
            }
            catch (lstatErr) {
                const code = errnoCode(lstatErr);
                if (code !== 'ENOENT' && code !== 'ENOTDIR')
                    throw lstatErr;
                const parent = node.path.dirname(prefix);
                if (parent === prefix)
                    throw lstatErr;
                tail.push(node.path.basename(prefix));
                prefix = parent;
                continue;
            }
            if (!isLink)
                throw realpathErr;
            if (++hops > MAX_SYMLINK_HOPS) {
                throw Object.assign(new Error('too many levels of symbolic links'), { code: 'ELOOP' });
            }
            prefix = node.path.resolve(node.path.dirname(prefix), await fs.readlink(prefix));
            continue;
        }
        return tail.length ? node.path.join(real, ...tail.reverse()) : real;
    }
}
/**
 * Resolve `p` against `root` and confine it to `root` or one of `allowedRoots`
 * (absolute paths, resolved at check time exactly like `root`).
 *
 * Absolute and relative inputs go through the same canonicalise-then-contain
 * check — an absolute path that lands inside a permitted root is accepted,
 * only paths that resolve *outside* all of them are rejected. Every symlink in
 * `p` (including the leaf, even a dangling one) is resolved before the
 * confinement check, and the resolved path is what the caller then operates
 * on, so a symlink inside `root` that points outside it can neither pass the
 * check nor be followed afterwards. `..` is collapsed lexically before any
 * symlink is followed. A path that cannot be resolved (symlink loop, unreadable
 * component) is rejected with a `ToolError` naming `p`, never the host's
 * absolute path.
 *
 * Residual TOCTOU: a component could still be swapped for a symlink between this
 * call and the eventual `fs` operation. Closing that fully needs per-component
 * `O_NOFOLLOW`/`openat`, which Node does not expose ergonomically; this is why a
 * sandbox is still recommended for the toolset as a whole.
 */
async function confineToRoot(root, p, opts) {
    const allowedRoots = opts?.allowedRoots ?? [];
    const realRoot = await canonicalize(node.path.resolve(root));
    let real;
    try {
        real = await canonicalize(node.path.resolve(realRoot, p));
    }
    catch (err) {
        throw new ToolError/* ToolError */.v(fsErrorMessage(err, `path ${JSON.stringify(p)}`));
    }
    if (isWithin(realRoot, real) || (await containingRoot(allowedRoots, real)) !== undefined) {
        return real;
    }
    const permitted = allowedRoots.length ?
        "the session's working directory and its other permitted directories"
        : "the session's working directory";
    throw new ToolError/* ToolError */.v(`path ${JSON.stringify(p)} is outside ${permitted}`);
}
/**
 * Atomically write `content` to `targetPath`: write a sibling temp file, fsync
 * it, then rename over the target. The rename is atomic on most filesystems, so
 * a crash mid-write never leaves the target half-written.
 *
 * A new file is created {@link FILE_CREATE_MODE}; an existing one keeps its
 * permission bits (the rename replaces the inode, so they are copied onto the
 * temp file first) — an edit must not strip `+x` or sharing the owner chose.
 */
async function atomicWriteFile(targetPath, content) {
    const dir = node.path.dirname(targetPath);
    const tempPath = node.path.join(dir, `.tmp-${process.pid}-${node/* crypto.randomUUID */.Et.randomUUID()}`);
    const existingMode = await fs.stat(targetPath).then((st) => st.mode & 0o777, () => undefined);
    let handle;
    try {
        handle = await fs.open(tempPath, 'wx', FILE_CREATE_MODE);
        if (existingMode !== undefined)
            await handle.chmod(existingMode);
        await handle.writeFile(content, 'utf-8');
        await handle.sync();
        await handle.close();
        handle = undefined;
        await fs.rename(tempPath, targetPath);
    }
    catch (err) {
        if (handle)
            await handle.close().catch(() => { });
        await fs.unlink(tempPath).catch(() => { });
        throw err;
    }
}
/**
 * Map a thrown filesystem error to a consistent, language-independent message,
 * so the model sees the same wording regardless of the runtime (Node's raw
 * `ENOENT: no such file...` text would otherwise leak through). Codes we don't
 * special-case render as the bare code, never Node's message, which embeds the
 * host's absolute path.
 */
function fsErrorMessage(err, file) {
    const code = errnoCode(err);
    switch (code) {
        case 'ENOENT':
            return `${file}: no such file or directory`;
        case 'EACCES':
        case 'EPERM':
            return `${file}: permission denied`;
        case 'ENOTDIR':
            return `${file}: not a directory`;
        case 'EISDIR':
            return `${file}: is a directory`;
        case 'ELOOP':
            return `${file}: too many levels of symbolic links`;
        case 'ENAMETOOLONG':
            return `${file}: file name too long`;
        case 'ENOSPC':
            return `${file}: no space left on device`;
        case 'EMFILE':
        case 'ENFILE':
            return `${file}: too many open files`;
        default:
            return `${file}: ${code !== undefined ? `i/o error (${code})` : 'i/o error'}`;
    }
}
//# sourceMappingURL=fs-util.mjs.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/log.mjs
var utils_log = __webpack_require__(62323);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/tools/agent-toolset/skills.mjs
/**
 * Node-only skill plumbing for the agent toolset: downloading a session
 * agent's skills into the workdir and extracting the archives. Kept in its own
 * file because it is a distinct concern from the tool implementations in
 * `node.ts` — distinct enough, and large enough, to review on its own.
 */




const skills_fs = node.fs.promises;
const execFileAsync = node/* util.promisify */.ZS.promisify(node/* child_process.execFile */.hV.execFile);
/**
 * Download the session agent's skills into `{ctx.workdir}/skills/<name>/`.
 *
 * No-op (returns a no-op cleanup) unless `ctx.client` is set together with
 * `ctx.session` (or the deprecated `ctx.sessionId`). Reads the resolved agent
 * off the session and, for each skill, fetches its files via
 * `client.beta.skills.versions.download` and extracts the archive (a zip or
 * tar.* archive) into a directory named after the skill. A failure on one skill
 * is logged and does not block the others. Call this before starting the
 * session tool runner (e.g. right after the bash session / workdir is ready).
 *
 * Pass `ctx.session`. A session's resources cannot change while it runs, so the
 * caller fetches it once and shares that snapshot with the memory-store
 * download — the two can then never disagree about the attached resources.
 *
 * `ctx.sessionId` is deprecated: it costs an extra `sessions.retrieve` round
 * trip on every call, and a caller that uses it for both this and the
 * memory-store download fetches the session twice. It remains supported for
 * callers written before `session` existed.
 *
 * Returns a cleanup function that removes the skill directories this call
 * created — call it once the work item is done so downloaded skills do not
 * accumulate in the workdir across sessions.
 */
async function setupSkills(ctx) {
    const { client, sessionId } = ctx;
    if (!client)
        return async () => { };
    const log = (0,utils_log/* loggerFor */.WG)(client);
    let session = ctx.session;
    if (!session) {
        if (sessionId === undefined)
            return async () => { };
        log.warn('AgentToolContext.sessionId is deprecated and costs an extra session fetch; ' +
            'fetch the session once and set `session` instead', { component: 'agent-tool-context' });
        // The sessions/skills resources inject their anthropic-beta headers
        // (managed-agents / skills) themselves — no need to pass `betas` here.
        session = await client.beta.sessions.retrieve(sessionId);
    }
    const skillsRoot = node.path.resolve(ctx.workdir, 'skills');
    const created = [];
    for (const skill of session.agent.skills) {
        try {
            const version = await client.beta.skills.versions.retrieve(skill.version, { skill_id: skill.skill_id });
            // The directory is the skill's name, reduced to a single safe path
            // component so a hostile name can't escape `skillsRoot`.
            let dirname = node.path.basename(version.name.trim());
            if (dirname === '' || dirname === '.' || dirname === '..')
                dirname = skill.skill_id;
            const dest = node.path.resolve(skillsRoot, dirname);
            if (dest !== skillsRoot && !dest.startsWith(skillsRoot + node.path.sep)) {
                log.warn('skill name escapes the skills dir; skipping', {
                    component: 'agent-tool-context',
                    name: version.name,
                });
                continue;
            }
            // `skill.version` may be the alias `"latest"`, which only the retrieve
            // endpoint resolves; download by the concrete id it returned.
            const resp = await client.beta.skills.versions.download(version.id, { skill_id: skill.skill_id });
            await skills_fs.rm(dest, { recursive: true, force: true });
            await skills_fs.mkdir(dest, { recursive: true, mode: DIR_CREATE_MODE });
            created.push(dest);
            await extractSkillArchive(resp, dest);
            log.info('downloaded skill', {
                component: 'agent-tool-context',
                skill_id: skill.skill_id,
                version: version.id,
                dest,
            });
        }
        catch (e) {
            log.warn('failed to download skill', {
                component: 'agent-tool-context',
                skill_id: skill.skill_id,
                error: String(e),
            });
        }
    }
    return async () => {
        for (const dest of created) {
            await skills_fs.rm(dest, { recursive: true, force: true }).catch((e) => {
                log.warn('failed to clean up skill', { component: 'agent-tool-context', dest, error: String(e) });
            });
        }
    };
}
/** Reject archive members that are absolute or contain a `..` component. */
function assertSafeMemberNames(names) {
    for (const raw of names) {
        const entry = raw.trim();
        if (!entry)
            continue;
        if (node.path.isAbsolute(entry) || entry.split(/[\\/]/).includes('..')) {
            throw new error/* AnthropicError */.pJ(`refusing to extract unsafe archive member: ${entry}`);
        }
    }
}
const INCONSISTENT_LISTING = 'skill archive listing is inconsistent; refusing to extract';
/**
 * Type chars (first byte of each `ls`-style line from `unzip -Z` / `tar -tvf`)
 * that denote a regular file or directory. `zipinfo` prints `?` for entries
 * with no Unix type bits, which `unzip` extracts as regular files; GNU tar
 * prints `C` for contiguous files. Everything else — `l` symlink, `h`
 * hardlink, `b`/`c` device, `p` fifo, `s` socket, unknown tar types — is a
 * special member.
 */
const PLAIN_TYPE_CHARS = { unzip: new Set(['-', 'd', '?']), tar: new Set(['-', 'd', 'C']) };
function listingLines(listing) {
    const lines = listing.split('\n');
    if (lines[lines.length - 1] === '')
        lines.pop();
    return lines;
}
/**
 * A special member is excluded by handing its listed name back to the CLI as
 * a pattern, so the name must be byte-identical to what is stored. `tar`,
 * `bsdtar` and `unzip` print bytes they cannot show literally as `\ooo`, `^X`
 * or `#U` escapes, or as raw non-ASCII; any such name cannot be excluded
 * reliably. A leading `-` would let `unzip` parse the pattern as an option.
 */
function canExcludeVerbatim(cmd, name) {
    return /^[\x20-\x7E]+$/.test(name) && !/[\\^#]/.test(name) && !(cmd === 'unzip' && name.startsWith('-'));
}
/**
 * Pair an archive's name listing (`unzip -Z1` / `tar -tf`) with its typed
 * listing (`unzip -Z --h --t` / `tar -tvf`) and split the members into plain
 * (regular file or directory) and special (everything else). Special members
 * are excluded from extraction rather than rejected; the archive is refused
 * only when the two listings disagree in length or a special member's name
 * cannot be passed back to the CLI verbatim (see {@link canExcludeVerbatim}).
 */
function classifyArchiveListing(cmd, names, typed) {
    const nameLines = listingLines(names);
    const typedLines = listingLines(typed);
    if (nameLines.length !== typedLines.length)
        throw new error/* AnthropicError */.pJ(INCONSISTENT_LISTING);
    const plain = [];
    const special = [];
    nameLines.forEach((name, i) => {
        if (PLAIN_TYPE_CHARS[cmd].has(typedLines[i].charAt(0))) {
            plain.push(name);
            return;
        }
        if (!canExcludeVerbatim(cmd, name)) {
            throw new error/* AnthropicError */.pJ(`refusing to extract archive: cannot safely exclude member ${JSON.stringify(name)}`);
        }
        special.push(name);
    });
    return { plain, special };
}
/**
 * Walk `dir` with `lstat` semantics and reject anything that is not a regular
 * file or directory. Never follows a link and never descends into anything
 * but a real directory.
 */
async function assertOnlyPlainEntries(dir) {
    for (const entry of await skills_fs.readdir(dir, { withFileTypes: true })) {
        if (entry.isDirectory())
            await assertOnlyPlainEntries(node.path.join(dir, entry.name));
        else if (!entry.isFile())
            throw new error/* AnthropicError */.pJ(INCONSISTENT_LISTING);
    }
}
/**
 * Run an archive CLI (`unzip` for zip archives, `tar` for everything else),
 * returning its stdout. Both binaries must be on `PATH`; a missing one would
 * otherwise surface as an opaque `ENOENT` spawn failure, so it is turned into a
 * clear, specific error naming the missing command.
 */
async function runArchiveTool(cmd, args) {
    try {
        const { stdout } = await execFileAsync(cmd, args);
        return stdout;
    }
    catch (e) {
        if (errnoCode(e) === 'ENOENT') {
            throw new error/* AnthropicError */.pJ(`skill extraction requires the \`${cmd}\` command, but it was not found on PATH`);
        }
        throw e;
    }
}
/**
 * The single top-level directory shared by every entry in an archive listing,
 * or `''` if entries don't all live under one common directory. Skill bundles
 * are packaged wrapped in one directory named after the skill (e.g.
 * `pdf/SKILL.md`, `pdf/scripts/...`); the extractor strips it so contents land
 * directly in the skill's dir instead of a redundant nested `<skill>/<skill>/`
 * level. A flat or multi-root archive yields `''`.
 */
function archiveTopDir(names) {
    let top;
    let nested = false;
    for (const raw of names) {
        // Drop `.` / empty segments so a `./pdf/...`-style listing (e.g. from
        // `tar -C dir .`) is treated the same as `pdf/...`.
        const parts = raw
            .trim()
            .split('/')
            .filter((p) => p !== '' && p !== '.');
        if (parts.length === 0)
            continue;
        const first = parts[0];
        if (top === undefined)
            top = first;
        else if (first !== top)
            return '';
        if (parts.length > 1)
            nested = true;
    }
    return top !== undefined && nested ? top : '';
}
/**
 * Extract a skill download (a zip or tar.* archive) into `dest`. Streams the
 * response body straight to a temp file beside `dest` (so the whole archive is
 * never buffered in memory — skills can contain large binaries), then shells out
 * to `unzip`/`tar` — consistent with the rest of the toolset, which already
 * invokes `bash` and `rg`. Both `unzip` and `tar` must be available on `PATH`; a
 * missing binary surfaces as a clear error (see {@link runArchiveTool}). Refuses
 * any member that would escape `dest` (zip-slip / tar-slip): skill archives
 * come from the API, but skills can be third-party. Members that are not a
 * regular file or directory (symlink, hardlink, device, fifo) are excluded
 * from extraction rather than rejected; an archive whose special members
 * cannot be excluded reliably is refused (see {@link classifyArchiveListing}).
 * `tar` matches exclusions unanchored, so a plain member sharing a special
 * member's name may be dropped too. The staging tree is verified to hold only
 * regular files and directories before anything is promoted into `dest`.
 *
 * The skill bundle's single wrapper directory is stripped: the archive is
 * extracted into a staging dir and the wrapper's contents are promoted into
 * `dest`, so files land at `dest/SKILL.md` rather than a doubled
 * `dest/<skill>/SKILL.md` (`unzip` has no `--strip-components`, so this is
 * done uniformly by staging + promote rather than per-tool flags).
 */
async function extractSkillArchive(resp, dest) {
    const tmp = node.path.join(dest, `.skill-archive-${process.pid}-${Date.now()}`);
    if (!resp.body) {
        throw new error/* AnthropicError */.pJ('skill download response had no body');
    }
    await node/* stream.promises */.Td.promises.pipeline(node/* stream.Readable */.Td.Readable.fromWeb(resp.body), node.fs.createWriteStream(tmp));
    const stage = node.path.join(node.path.dirname(dest), `.skill-stage-${process.pid}-${Date.now()}`);
    const excludeFile = node.path.join(node.path.dirname(dest), `.skill-exclude-${process.pid}-${Date.now()}`);
    try {
        // Sniff the first bytes: zip archives start with "PK\x03\x04"; treat
        // anything else as a tar.* archive (`tar -xf` autodetects gzip/bzip2/xz).
        const head = await readHead(tmp, 4);
        const isZip = head.length >= 4 && head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
        const archiveCmd = isZip ? 'unzip' : 'tar';
        // List first, validate, then extract — `tar`/`unzip` will happily write a
        // `../` member (or follow a symlink member) outside `-C`/`-d` otherwise.
        const names = await runArchiveTool(archiveCmd, isZip ? ['-Z1', tmp] : ['-tf', tmp]);
        const typed = await runArchiveTool(archiveCmd, isZip ? ['-Z', '--h', '--t', tmp] : ['-tvf', tmp]);
        const { plain, special } = classifyArchiveListing(archiveCmd, names, typed);
        assertSafeMemberNames([...plain, ...special]);
        const top = archiveTopDir(plain);
        await skills_fs.mkdir(stage, { recursive: true, mode: DIR_CREATE_MODE });
        // `unzip` exits non-zero when every member is excluded, so only run the
        // extractor when there is something to extract.
        if (plain.length > 0) {
            await runArchiveTool(archiveCmd, await extractArgs(archiveCmd, tmp, stage, special, excludeFile));
        }
        await assertOnlyPlainEntries(stage);
        // Promote the wrapper's contents (or the staged tree itself, if the
        // archive wasn't wrapped) into the already-created empty `dest`. `stage`
        // is a sibling of `dest`, so each rename stays on one filesystem.
        const srcRoot = top ? node.path.join(stage, top) : stage;
        const entries = await skills_fs.readdir(srcRoot).catch((e) => {
            throw errnoCode(e) === 'ENOENT' ? new error/* AnthropicError */.pJ(INCONSISTENT_LISTING) : e;
        });
        for (const entry of entries) {
            await skills_fs.rename(node.path.join(srcRoot, entry), node.path.join(dest, entry));
        }
    }
    finally {
        await skills_fs.rm(tmp, { force: true });
        await skills_fs.rm(excludeFile, { force: true });
        await skills_fs.rm(stage, { recursive: true, force: true });
    }
}
/**
 * Arguments that extract `archive` into `stage` while excluding every member
 * in `special`. Names are glob-escaped because both CLIs treat exclusions as
 * patterns; `tar` reads them from `excludeFile`, `unzip` takes them after
 * `-x`, which must follow `-d` so no pattern is parsed as an option.
 */
async function extractArgs(cmd, archive, stage, special, excludeFile) {
    const patterns = special.map((name) => name.replace(/[*?[\\]/g, '\\$&'));
    if (cmd === 'unzip') {
        return ['-oq', archive, '-d', stage, ...(patterns.length > 0 ? ['-x', ...patterns] : [])];
    }
    if (patterns.length === 0)
        return ['-xf', archive, '-C', stage];
    await skills_fs.writeFile(excludeFile, patterns.join('\n') + '\n', { flag: 'wx', mode: 0o600 });
    return ['-xf', archive, '-C', stage, '-X', excludeFile];
}
/** Read the first `n` bytes of `file`. */
async function readHead(file, n) {
    const handle = await skills_fs.open(file, 'r');
    try {
        const buf = Buffer.alloc(n);
        const { bytesRead } = await handle.read(buf, 0, n, 0);
        return buf.subarray(0, bytesRead);
    }
    finally {
        await handle.close();
    }
}
//# sourceMappingURL=skills.mjs.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/bytes.mjs
var bytes = __webpack_require__(57424);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/backoff.mjs
var backoff = __webpack_require__(42657);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/file-store.mjs
/**
 * `FileStore` — one confined folder; a relative path cannot escape it.
 *
 * Beta scope: symlinks are refused or skipped wherever the store meets them,
 * but there is no hardening against a process racing the store's own
 * syscalls; fsync durability, non-POSIX hosts, and read-size caps are out of
 * scope.
 */


const fsp = node.fs.promises;
const C = node.fs.constants;
// Owner-only regardless of umask: the store holds downloaded user/model content.
const OWNER_ONLY_DIR_MODE = 0o700;
const OWNER_ONLY_FILE_MODE = 0o600;
const OWNER_ONLY_EXEC_MODE = 0o700;
// 0 where the platform lacks them; `open` refuses such platforms.
const O_NOFOLLOW = C.O_NOFOLLOW ?? 0;
const O_NONBLOCK = C.O_NONBLOCK ?? 0;
/** A refused operation — input the store will not act on. OS errors propagate with their `.code`. */
class FileStoreError extends Error {
    constructor(reason, relPath) {
        super(`path ${JSON.stringify(relPath)} ${reason}`);
        this.name = 'FileStoreError';
        this.reason = reason;
        this.relPath = relPath;
    }
}
FileStoreError.ESCAPES_ROOT = 'escapes the store root';
FileStoreError.IS_A_SYMLINK = 'is a symlink';
FileStoreError.NOT_A_FILE = 'is not a regular file';
FileStoreError.NOT_A_DIRECTORY = 'is not a directory';
FileStoreError.NOT_UTF8 = 'is not valid utf-8';
FileStoreError.MOVE_DESTINATION_EXISTS = 'already exists';
/** Resolve `root`; creates nothing — only {@link FileStore.createRoot} makes the folder. */
async function openFileStore(root, opts) {
    return FileStore.open(root, opts);
}
/**
 * True for a path usable verbatim as a store location: absolute, with no `..`
 * components. Paths are judged in POSIX terms — they are wire values naming
 * locations inside a POSIX container, not host-native paths.
 */
function isPathLegal(p) {
    return p.startsWith('/') && !p.split('/').includes('..');
}
/**
 * One confined folder of regular files.
 *
 * Every `relPath` is relative to the root (a leading `/` also means the root)
 * and refused with {@link FileStoreError} when it escapes. The store holds
 * regular files only: symlinks are refused on read and skipped by listings —
 * {@link findSymlinks} reports them. A `relPath` resolving to the root itself
 * is banned by this interface: `put` and `get` refuse it, `move` and `remove`
 * do nothing. A store opened with `utf8: true` refuses binary content the
 * same way — on `put` of such bytes and on `get` of such a file. Only
 * {@link createRoot} makes the root: writes create directories below it,
 * never the root itself, so a root removed while the store is open stays
 * removed and the write fails with `ENOENT`.
 */
class FileStore {
    /** @internal — use {@link FileStore.open} / {@link openFileStore}. */
    constructor(root, removedOnDispose, utf8Only = false) {
        /** `hashtree`'s advisory cache; every hit re-validates against a fresh stat. */
        this.hashes = new Map();
        this.rootPath = root;
        this.removedOnDispose = removedOnDispose;
        this.decoder = utf8Only ? new TextDecoder('utf-8', { fatal: true }) : undefined;
    }
    /** Resolve `root`; creates nothing — only {@link createRoot} makes the folder. */
    static async open(root, opts) {
        // A deployment condition, not refused caller input — hence not FileStoreError.
        if (!platformSupported()) {
            throw new Error('FileStore requires O_NOFOLLOW support on this platform');
        }
        let removedOnDispose = false;
        try {
            // lstat, not a follow-and-swallow existence check: following symlinks or
            // swallowing permission errors would mark a real directory ours to
            // delete on dispose.
            await fsp.lstat(root);
        }
        catch (e) {
            if (e.code !== 'ENOENT')
                throw e;
            removedOnDispose = true;
        }
        return new FileStore(node.path.resolve(root), removedOnDispose, opts?.utf8 ?? false);
    }
    /** Create the root directory and any missing ancestors; already existing is fine. */
    async createRoot() {
        await makeDirAndAncestors(this.rootPath);
    }
    /** The resolved root, and what {@link dispose} will do to it. */
    root() {
        return { path: this.rootPath, removedOnDispose: this.removedOnDispose };
    }
    /**
     * Remove the root iff `open` created it; pre-existing roots are kept.
     *
     * Wired to `Symbol.asyncDispose` at runtime when the host provides it, so
     * `await using` works on engines with explicit resource management.
     */
    async dispose() {
        if (!this.removedOnDispose)
            return;
        await fsp.rm(this.rootPath, { recursive: true, force: true });
    }
    /**
     * Write `data` (`string` UTF-8 or bytes) atomically to the file at `relPath`.
     *
     * Missing directories below the root are created; a missing root is not —
     * the write fails with `ENOENT`.
     */
    async put(relPath, data, opts) {
        // "dir/." names a directory just like a trailing "/".
        const tail = relPath.replace(/\\/g, '/');
        if (tail.endsWith('/') || tail.endsWith('/.') || tail === '' || tail === '.') {
            throw new FileStoreError(FileStoreError.NOT_A_FILE, relPath);
        }
        const dest = this.resolveUnderRoot(relPath);
        const payload = typeof data === 'string' ? (0,bytes/* encodeUTF8 */.YH)(data) : data;
        this.requireUtf8(relPath, payload);
        await makeDirsBelowRoot(this.rootPath, node.path.dirname(dest));
        await replaceViaTemp(dest, payload, opts?.executable ?? false);
    }
    /** The file's bytes; `null` when absent. */
    async get(relPath) {
        const dest = this.resolveUnderRoot(relPath);
        let handle;
        try {
            handle = await openRegularFile(relPath, dest);
        }
        catch (e) {
            if (e.code === 'ENOENT')
                return null;
            throw e;
        }
        let data;
        try {
            const buf = await handle.readFile();
            data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        }
        finally {
            await handle.close();
        }
        this.requireUtf8(relPath, data);
        return data;
    }
    /** The relative path of every file under the directory `under`. */
    async ls(under = '/') {
        const base = this.resolveUnderRoot(under);
        return new Set((await filenamesInDir(this.rootPath, under, base)).map(([rel]) => rel));
    }
    /**
     * Every symlink under `under` — listings skip them and reads refuse them,
     * so a caller that must know they exist asks here.
     */
    async findSymlinks(under = '/') {
        const base = this.resolveUnderRoot(under);
        return symlinksInDir(this.rootPath, under, base);
    }
    /**
     * `{relPath: sha256Hex}` of every file under the directory `under`.
     *
     * Unchanged files — same size, mtime, and ctime since the last call —
     * reuse their recorded hash instead of being re-read.
     */
    async hashtree(under = '/') {
        const base = this.resolveUnderRoot(under);
        const walkStartNs = _internals.nowNs();
        // Null prototype so a file named `__proto__` (or `constructor`) is an
        // ordinary own key instead of a silent prototype write / inherited read.
        const out = Object.create(null);
        for (const [rel, full] of await filenamesInDir(this.rootPath, under, base)) {
            const sha = await this.hashViaCache(rel, full, walkStartNs);
            if (sha !== null)
                out[rel] = sha;
        }
        return out;
    }
    /** One file's sha256; `null` when absent. Shares {@link hashtree}'s cache. */
    async hashFile(relPath) {
        const dest = this.resolveUnderRoot(relPath);
        let st;
        try {
            st = await fsp.lstat(dest, { bigint: true });
        }
        catch (e) {
            if (e.code === 'ENOENT')
                return null;
            throw e;
        }
        if (st.isSymbolicLink())
            throw new FileStoreError(FileStoreError.IS_A_SYMLINK, relPath);
        if (!st.isFile())
            throw new FileStoreError(FileStoreError.NOT_A_FILE, relPath);
        const rel = node.path.relative(this.rootPath, dest).split(node.path.sep).join('/');
        return this.hashViaCache(rel, dest, _internals.nowNs());
    }
    /**
     * Rename `src` to `dst`; an existing `dst` is refused. The banned store
     * root as either end does nothing.
     */
    async move(src, dst) {
        const s = this.resolveUnderRoot(src);
        const d = this.resolveUnderRoot(dst);
        if (s === this.rootPath || d === this.rootPath)
            return;
        // stat, not lstat: a dangling symlink at dst reads as absent and is
        // atomically replaced by the rename, like any other rename target.
        const dstExists = await fsp.stat(d).then(() => true, () => false);
        if (dstExists)
            throw new FileStoreError(FileStoreError.MOVE_DESTINATION_EXISTS, dst);
        await makeDirsBelowRoot(this.rootPath, node.path.dirname(d));
        await fsp.rename(s, d);
    }
    /** Delete a file or subtree; absent — and the banned store root — do nothing. */
    async remove(relPath) {
        const dest = this.resolveUnderRoot(relPath);
        if (dest === this.rootPath)
            return;
        let st;
        try {
            // lstat: a dangling symlink must still be unlinked.
            st = await fsp.lstat(dest, { bigint: true });
        }
        catch (e) {
            if (e.code === 'ENOENT')
                return;
            throw e;
        }
        if (st.isDirectory()) {
            await fsp.rm(dest, { recursive: true, force: true });
        }
        else {
            try {
                await fsp.unlink(dest);
            }
            catch (e) {
                if (e.code !== 'ENOENT')
                    throw e;
            }
        }
    }
    resolveUnderRoot(relPath) {
        const norm = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
        const parts = norm.split('/').filter((p) => p !== '' && p !== '.');
        if (node.path.posix.isAbsolute(norm) || parts.includes('..')) {
            throw new FileStoreError(FileStoreError.ESCAPES_ROOT, relPath);
        }
        return parts.length === 0 ? this.rootPath : node.path.join(this.rootPath, ...parts);
    }
    requireUtf8(relPath, data) {
        if (!this.decoder)
            return;
        try {
            this.decoder.decode(data);
        }
        catch {
            throw new FileStoreError(FileStoreError.NOT_UTF8, relPath);
        }
    }
    async hashViaCache(rel, full, walkStartNs) {
        let st;
        try {
            st = await fsp.lstat(full, { bigint: true });
        }
        catch (e) {
            if (e.code === 'ENOENT')
                return null; // vanished since the walk: not in this snapshot
            throw e;
        }
        if (!st.isFile())
            return null;
        const cached = this.hashes.get(rel);
        let sha;
        if (cached !== undefined && unchangedSinceHashed(cached, st)) {
            sha = cached.sha;
        }
        else {
            try {
                sha = await _internals.hashFile(full);
            }
            catch (e) {
                const code = e.code;
                if (code === 'ENOENT' || e instanceof FileStoreError)
                    return null;
                // FreeBSD reports EMLINK rather than ELOOP for O_NOFOLLOW.
                if (code === 'ELOOP' || code === 'EMLINK')
                    return null;
                throw e;
            }
        }
        if (oldEnoughToCache(st, walkStartNs)) {
            this.hashes.set(rel, { mtimeNs: st.mtimeNs, ctimeNs: st.ctimeNs, size: st.size, sha });
        }
        return sha;
    }
}
FileStore.isPathLegal = isPathLegal;
function platformSupported() {
    return O_NOFOLLOW !== 0;
}
async function makeDirAndAncestors(dir) {
    const missing = [];
    let current = dir;
    for (;;) {
        try {
            await fsp.stat(current);
            break;
        }
        catch (e) {
            const code = e.code;
            if (code !== 'ENOENT' && code !== 'ENOTDIR' && code !== 'ELOOP')
                throw e;
        }
        missing.push(current);
        const parent = node.path.dirname(current);
        if (parent === current)
            break;
        current = parent;
    }
    for (const directory of missing.reverse()) {
        try {
            await fsp.mkdir(directory, { mode: OWNER_ONLY_DIR_MODE });
        }
        catch (e) {
            if (e.code !== 'EEXIST')
                throw e;
        }
    }
}
async function makeDirsBelowRoot(root, dir) {
    // Never the root itself: only createRoot() makes it, so a write racing an
    // rm -rf of the folder fails with ENOENT instead of re-creating it.
    const below = node.path.relative(root, dir);
    if (below === '')
        return;
    let current = root;
    for (const part of below.split(node.path.sep)) {
        current = node.path.join(current, part);
        try {
            await fsp.mkdir(current, { mode: OWNER_ONLY_DIR_MODE });
        }
        catch (e) {
            if (e.code !== 'EEXIST')
                throw e;
        }
    }
}
async function replaceViaTemp(dest, data, isExecutable) {
    const mode = isExecutable ? OWNER_ONLY_EXEC_MODE : OWNER_ONLY_FILE_MODE;
    const tmp = node.path.join(node.path.dirname(dest), `.fs-${node/* crypto.randomBytes */.Et.randomBytes(8).toString('hex')}.tmp`);
    let handle;
    try {
        handle = await fsp.open(tmp, C.O_WRONLY | C.O_CREAT | C.O_EXCL | O_NOFOLLOW, mode);
        await handle.writeFile(data);
        await handle.close();
        handle = undefined;
        await fsp.rename(tmp, dest);
    }
    catch (err) {
        // Best-effort temp cleanup; never mask the original error.
        if (handle)
            await handle.close().catch(() => { });
        await fsp.unlink(tmp).catch(() => { });
        throw err;
    }
}
async function openRegularFile(relPath, dest) {
    // O_NONBLOCK: a FIFO fails the fstat check below instead of blocking the open.
    let handle;
    try {
        handle = await fsp.open(dest, C.O_RDONLY | O_NOFOLLOW | O_NONBLOCK);
    }
    catch (e) {
        // FreeBSD reports EMLINK rather than ELOOP for O_NOFOLLOW.
        const code = e.code;
        if (code === 'ELOOP' || code === 'EMLINK') {
            throw new FileStoreError(FileStoreError.IS_A_SYMLINK, relPath);
        }
        throw e;
    }
    try {
        const st = await handle.stat();
        if (!st.isFile())
            throw new FileStoreError(FileStoreError.NOT_A_FILE, relPath);
    }
    catch (e) {
        await handle.close().catch(() => { });
        throw e;
    }
    return handle;
}
/** sha256 of a file's contents, streamed — constant memory on any file size. */
async function hashFile(full) {
    const digest = node/* crypto.createHash */.Et.createHash('sha256');
    const handle = await openRegularFile(node.path.basename(full), full);
    const buf = new Uint8Array(1024 * 1024);
    try {
        for (;;) {
            const { bytesRead } = await handle.read(buf, 0, buf.length);
            if (bytesRead === 0)
                break;
            digest.update(buf.subarray(0, bytesRead));
        }
    }
    finally {
        await handle.close();
    }
    return digest.digest('hex');
}
/**
 * `[rel, path]` for every regular file under the directory `base`; an absent
 * `base` is empty, a present non-directory is refused. The walk never
 * descends symlinked directories.
 */
async function filenamesInDir(root, under, base) {
    if (!(await requireDir(under, base)))
        return [];
    const out = [];
    await walk(base, (full, entry) => {
        if (entry.isFile())
            out.push([node.path.relative(root, full).split(node.path.sep).join('/'), full]);
    });
    out.sort();
    return out;
}
async function symlinksInDir(root, under, base) {
    const relOf = (full) => node.path.relative(root, full).split(node.path.sep).join('/');
    let st;
    try {
        st = await fsp.lstat(base, { bigint: true });
    }
    catch (e) {
        const code = e.code;
        if (code === 'ENOENT' || code === 'ENOTDIR')
            return new Set();
        throw e;
    }
    if (st.isSymbolicLink())
        return new Set([relOf(base)]);
    if (!st.isDirectory())
        throw new FileStoreError(FileStoreError.NOT_A_DIRECTORY, under);
    const out = new Set();
    // Symlinks to directories are reported, never descended, like the rest.
    await walk(base, (full, entry) => {
        if (entry.isSymbolicLink())
            out.add(relOf(full));
    });
    return out;
}
/** `false` when `base` is absent, refused when present but not a directory. */
async function requireDir(under, base) {
    let st;
    try {
        st = await fsp.lstat(base, { bigint: true });
    }
    catch (e) {
        // Absent — including "under a file" (ENOTDIR) — is an empty listing.
        const code = e.code;
        if (code === 'ENOENT' || code === 'ENOTDIR')
            return false;
        throw e;
    }
    if (!st.isDirectory())
        throw new FileStoreError(FileStoreError.NOT_A_DIRECTORY, under);
    return true;
}
/** Visit every entry under `base` without descending symlinked directories. */
async function walk(base, visit) {
    const stack = [base];
    while (stack.length) {
        const dir = stack.pop();
        let entries;
        try {
            entries = await fsp.readdir(dir, { withFileTypes: true });
        }
        catch (e) {
            if (e.code === 'ENOENT')
                continue; // a listing is a snapshot, not a lock
            throw e;
        }
        for (const entry of entries) {
            const full = node.path.join(dir, entry.name);
            visit(full, entry);
            if (entry.isDirectory() && !entry.isSymbolicLink())
                stack.push(full);
        }
    }
}
function unchangedSinceHashed(cached, st) {
    return st.mtimeNs === cached.mtimeNs && st.ctimeNs === cached.ctimeNs && st.size === cached.size;
}
function oldEnoughToCache(st, walkStartNs) {
    const newestNs = st.mtimeNs > st.ctimeNs ? st.mtimeNs : st.ctimeNs;
    return newestNs < walkStartNs - _internals.timestampTrustMarginNs;
}
// Filesystems stamp times with coarse clocks, so a rewrite shortly after a
// hashed write can reuse the exact stamps. Files younger than the margin are
// simply re-hashed next walk.
const TIMESTAMP_TRUST_MARGIN_NS = 2000000000n;
/** Test seam — the hasher, the trust margin, and the walk clock. @internal */
const _internals = {
    hashFile,
    timestampTrustMarginNs: TIMESTAMP_TRUST_MARGIN_NS,
    nowNs: () => BigInt(Date.now()) * 1000000n,
};
const LocalFileStore = FileStore;
// Wire `Symbol.asyncDispose` at runtime when the host provides it — the
// repo's tsconfig targets ES2020 so the type-level `AsyncDisposable` lib is
// not available, but `await using` callers on newer engines still work.
const asyncDispose = Symbol.asyncDispose;
if (asyncDispose) {
    Object.defineProperty(FileStore.prototype, asyncDispose, {
        value: FileStore.prototype.dispose,
        configurable: true,
        writable: true,
    });
}
//# sourceMappingURL=file-store.mjs.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/tools/agent-toolset/sync-interval.mjs
var sync_interval = __webpack_require__(50033);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/tools/agent-toolset/memories.mjs
/**
 * Session-level memory-store download and sync.
 *
 * A session may have several memory stores attached. This module resolves
 * where each store's folder goes on disk, opens a {@link LocalFileStore}
 * there, and reconciles each folder with its remote store — the merge rules
 * live on {@link SessionMemoryStores}.
 *
 * Node-only (it sits on the filesystem-backed FileStore); like `skills.ts`,
 * it is reachable through the shimmed `node.ts` entry point.
 */
var _SessionMemoryStores_instances, _SessionMemoryStores_client, _SessionMemoryStores_workdir, _SessionMemoryStores_syncIntervalMs, _SessionMemoryStores_syncDeletions, _SessionMemoryStores_log, _SessionMemoryStores_lastSyncAt, _SessionMemoryStores_finished, _SessionMemoryStores_stores, _SessionMemoryStores_storeRoot, _SessionMemoryStores_scanMarker, _SessionMemoryStores_syncStore, _SessionMemoryStores_flushStore, _SessionMemoryStores_recover, _SessionMemoryStores_stampAndPull, _SessionMemoryStores_syncPath, _SessionMemoryStores_removeLocal, _SessionMemoryStores_write, _SessionMemoryStores_pullAll, _SessionMemoryStores_uploadAll, _SessionMemoryStores_listMemories, _SessionMemoryStores_upload, _SessionMemoryStores_corroboratedDelete, _SessionMemoryStores_deleteRemote;









/**
 * Time bound the worker puts on each teardown pass — the final
 * {@link SessionMemoryStores.finish}, then {@link SessionMemoryStores.flushWrites} —
 * so a slow server cannot stall teardown.
 */
const MEMORY_FLUSH_TIMEOUT_MS = 30000;
/**
 * Marker file stamped into every store folder; a sync trusts the folder only
 * when it matches. Never itself syncs.
 */
const MARKER_PATH = '.anthropic-memory-store';
const MARKER_VERSION = 1;
function markerSha(memoryStoreId) {
    return node/* crypto.createHash */.Et.createHash('sha256')
        .update(`version ${MARKER_VERSION}\n${memoryStoreId}`, 'utf-8')
        .digest('hex');
}
/** How long a file must stay missing locally before its server delete goes out. */
const DELETE_CORROBORATION_MS = 30000;
/**
 * Page sizes for memory listings — the API's maximum per view: `basic` pages
 * carry up to 100 items, `full` pages are capped by the server.
 */
const LIST_PAGE_SIZE = 100;
const FULL_LIST_PAGE_SIZE = 20;
/**
 * How many single-memory content fetches may be in flight at once during one
 * store's pull pass. A sync rarely pulls more than a handful of memories, so
 * a higher cap buys nothing in the common case.
 */
const FETCH_CONCURRENCY = 16;
/**
 * How many uploads one store's flush keeps in flight. At ~0.3s per upload,
 * 32 clears the server's 2000-memories-per-store cap inside
 * {@link MEMORY_FLUSH_TIMEOUT_MS}.
 */
const UPLOAD_CONCURRENCY = 32;
/**
 * Per-sync remote-delete cap bounds. The floor lets a small store's
 * deletes clear in one pass; the ceiling caps damage on large ones.
 */
const DELETE_CAP_FLOOR = 8;
const DELETE_CAP_CEILING = 50;
/**
 * A session's memory stores could not be mounted.
 *
 * Thrown by {@link SessionMemoryStores.download} when a store cannot be
 * materialised on disk, and by the environment worker when a work item for a
 * session that has memory stores carried no sessions token to reach them with.
 */
class SessionMemoryError extends error/* AnthropicError */.pJ {
    constructor(message, cause) {
        super(message);
        this.name = 'SessionMemoryError';
        // in some environments the 'cause' property is already declared
        // @ts-ignore
        if (cause !== undefined)
            this.cause = cause;
    }
}
/** One sync's remote-delete gate and counters. */
class DeletePass {
    constructor(mode, cap, 
    /** Skip the delete wait — set on the session's last sync. */
    waiveWindow) {
        this.mode = mode;
        this.cap = cap;
        this.waiveWindow = waiveWindow;
        this.attempted = 0;
        this.capped = 0;
        this.suppressed = 0;
    }
    takeSlot() {
        if (this.attempted >= this.cap) {
            this.capped++;
            return false;
        }
        this.attempted++;
        return true;
    }
}
/**
 * The memory stores attached to one session, materialised on disk.
 *
 * {@link SessionMemoryStores.download} opens a {@link LocalFileStore} at each
 * attached store's directory (its `mount_path`, or a workdir fallback — see
 * {@link SessionMemoryStores.download}), pulls its memories, and records each
 * one's `content_sha256` as the sync baseline. Each sync
 * ({@link SessionMemoryStores.syncIfDue} on the worker's cadence,
 * {@link SessionMemoryStores.finish} once at the end) reconciles disk against
 * server, per store and per path:
 *
 * - a memory changed only remotely is written to disk;
 * - a file changed only locally is uploaded — an update with a
 *   `content_sha256` precondition, or a create for a new file;
 * - a file changed on both sides logs a warning and takes the server version;
 * - a file the server refuses (too large, invalid content) is skipped —
 *   warned once and retried only after the file changes; other files keep
 *   syncing;
 * - a file deleted locally is deleted on the server after a delay and a
 *   re-check — never on the first sync that notices, and only up to a
 *   per-sync cap. `syncDeletions` gates it;
 * - a memory deleted on the server is deleted on disk — unless the local
 *   file holds un-pushed edits: a writable store re-creates the memory
 *   from the file, a read-only one keeps the file unsynced;
 * - a store attached read-only pulls but never pushes.
 *
 * A download pulls the whole store, so it lists with content included. The
 * recurring syncs instead run two phases: a content-free listing (paths and
 * shas) drives the merge decisions, then only the memories actually being
 * written to disk are fetched, a bounded number at a time. A sync that finds
 * nothing changed moves no content at all.
 *
 * A file whose write to disk failed is never in the baseline, so its absence
 * reads as a failed download — it is pulled again, never deleted. A write
 * never re-creates a store folder that vanished mid-sync: it fails, and the
 * next sync's scan finds whatever is at the path by then — nothing
 * (re-downloaded) or someone else's files (left alone) — under the rules
 * below.
 *
 * A store folder that loses its {@link MARKER_PATH} marker, is emptied,
 * or vanishes is re-downloaded rather than treated as a mass local
 * delete; a folder whose marker names another store is left as found —
 * nothing pushed, nothing deleted.
 *
 * Two things about the store's directory make
 * {@link SessionMemoryStores.download} refuse the session outright, with
 * {@link SessionMemoryError}: a `mount_path` that is not a clean absolute
 * path, and a directory already sitting at that path.
 *
 * {@link SessionMemoryStores.download} throws on the first store it cannot
 * materialise. The syncs never throw: mid-session, one bad store or one bad
 * file is logged and the rest continue. Instances are not safe for concurrent
 * use. The worker builds one on its token-scoped sub-client (the memory
 * endpoints reject the environment key): `syncIfDue` after each tool call,
 * `finish` once at a clean end, a bounded {@link SessionMemoryStores.flushWrites}
 * in every teardown, `dispose` last.
 */
class SessionMemoryStores {
    constructor(client, opts) {
        _SessionMemoryStores_instances.add(this);
        _SessionMemoryStores_client.set(this, void 0);
        _SessionMemoryStores_workdir.set(this, void 0);
        _SessionMemoryStores_syncIntervalMs.set(this, void 0);
        _SessionMemoryStores_syncDeletions.set(this, void 0);
        _SessionMemoryStores_log.set(this, void 0);
        _SessionMemoryStores_lastSyncAt.set(this, void 0);
        _SessionMemoryStores_finished.set(this, false);
        _SessionMemoryStores_stores.set(this, []);
        (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionMemoryStores_client, client, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionMemoryStores_workdir, opts.workdir, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionMemoryStores_syncIntervalMs, opts.syncIntervalMs ?? sync_interval/* DEFAULT_MEMORY_SYNC_INTERVAL_MS */.hL, "f");
        (0,sync_interval/* checkMemorySyncInterval */.iT)((0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_syncIntervalMs, "f"), 'syncIntervalMs');
        (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionMemoryStores_syncDeletions, opts.syncDeletions ?? 'enabled', "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionMemoryStores_log, (0,utils_log/* loggerFor */.WG)(client), "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionMemoryStores_lastSyncAt, Date.now(), "f");
    }
    /**
     * Every attached store's root directory.
     *
     * The worker lists these as the file tools' allowed roots so a store
     * mounted outside the workdir stays reachable.
     */
    get roots() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_stores, "f").map((s) => s.files.root().path);
    }
    /**
     * Root directories of stores attached read-only.
     *
     * The file tools consult this to refuse writes into read-only stores.
     */
    get readOnlyRoots() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_stores, "f").filter((s) => s.readOnly).map((s) => s.files.root().path);
    }
    /**
     * Download every attached store's memories to disk.
     *
     * `session` arrives already fetched — one snapshot shared with the skills
     * download, so the two cannot disagree about the resources.
     */
    async download(session) {
        for (const resource of session.resources) {
            if (resource.type !== 'memory_store')
                continue;
            const root = (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_storeRoot).call(this, resource);
            let store;
            try {
                store = {
                    memoryStoreId: resource.memory_store_id,
                    // utf8: a binary file is refused at put/get, not mid-sync.
                    files: await LocalFileStore.open(root, { utf8: true }),
                    readOnly: resource.access === 'read_only',
                    baseline: new Map(),
                    refusedShas: new Map(),
                    pendingDeletes: new Map(),
                };
                // A root `open` did not create is a dead run's leftovers; the first
                // sync would upload them into the customer's store.
                if (!store.files.root().removedOnDispose) {
                    // The configured path, not root().path — that one is resolved and
                    // would name a symlinked mount's target.
                    throw new SessionMemoryError(`something already exists at the memory store's path: ${root} ` +
                        `(memory_store_id=${resource.memory_store_id}); ` +
                        'it must not exist when the session starts');
                }
                try {
                    await store.files.createRoot();
                }
                catch (e) {
                    if (!isErrno(e))
                        throw e;
                    // An unmountable root fails the item, not just one file.
                    throw new SessionMemoryError(`cannot create the memory store's folder: ${root} ` +
                        `(memory_store_id=${resource.memory_store_id}): ${e}; ` +
                        'the worker host must make this mount path writable', e);
                }
                await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_stampAndPull).call(this, store);
                (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").info('downloaded memories', {
                    count: store.baseline.size,
                    memory_store_id: store.memoryStoreId,
                    dest: store.files.root().path,
                });
                (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_stores, "f").push(store);
            }
            catch (e) {
                // A half-downloaded folder self-destructs; `dispose` leaves a refused
                // pre-existing directory exactly as found.
                if (store)
                    await store.files.dispose().catch(() => { });
                // Every store must land: a session missing a folder its system prompt
                // names runs with amnesia and syncs nothing back.
                if (e instanceof SessionMemoryError)
                    throw e;
                throw new SessionMemoryError(`failed to download memory store memory_store_id=${resource.memory_store_id}: ${e}`, e);
            }
        }
        (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionMemoryStores_lastSyncAt, Date.now(), "f");
    }
    /**
     * The session's last sync — skips the delete wait, so calling it twice
     * would undo the protection; it throws instead.
     */
    async finish() {
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_finished, "f")) {
            throw new error/* AnthropicError */.pJ("finish() was already called: it is the session's last sync and runs once");
        }
        (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionMemoryStores_finished, true, "f");
        await this.syncAll(true);
    }
    /** @internal — reconcile every store once; the tests' deterministic driver */
    async syncAll(final) {
        await Promise.all((0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_stores, "f").map((store) => (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_syncStore).call(this, store, final)));
        (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionMemoryStores_lastSyncAt, Date.now(), "f");
    }
    /** Sync when `syncIntervalMs` has elapsed since the last one. Never throws. */
    async syncIfDue() {
        if (Date.now() - (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_lastSyncAt, "f") < (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_syncIntervalMs, "f"))
            return;
        await this.syncAll(false);
    }
    /**
     * Upload new and changed files; send no deletes and pull nothing.
     *
     * The push-only rescue pass for a session ending on an error or
     * cancel — best-effort, bounded by the caller: once `signal` aborts no
     * further upload starts, each store cut off part-way logs how many
     * changed files it had not finished uploading, and this resolves without
     * waiting for requests already in flight. Each store uploads up to
     * {@link UPLOAD_CONCURRENCY} files at a time. Skips read-only stores,
     * refused files, files the server already holds, and folders that fail
     * the marker check. Never throws.
     */
    async flushWrites(signal) {
        await Promise.all((0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_stores, "f").map((store) => (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_flushStore).call(this, store, signal)));
    }
    /**
     * Remove every store directory that {@link SessionMemoryStores.download}
     * created. Pre-existing directories are left alone — that is
     * {@link FileStore.dispose}'s own rule. A folder that fails the marker
     * check is kept too — sync left it as found, so must dispose.
     */
    async dispose() {
        for (const store of (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_stores, "f")) {
            const root = store.files.root();
            try {
                const scan = await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_scanMarker).call(this, store);
                if (!scan.markerOk && Object.keys(scan.files).length > 0) {
                    (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn(`${scan.distrustReason}; leaving the memory store folder on disk`, {
                        root: root.path,
                        memory_store_id: store.memoryStoreId,
                    });
                    continue;
                }
                await store.files.dispose();
            }
            catch (e) {
                if (!(e instanceof FileStoreError) && !isErrno(e))
                    throw e;
                (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn('failed to remove the memory store folder', {
                    root: store.files.root().path,
                    memory_store_id: store.memoryStoreId,
                    error: String(e),
                });
                continue;
            }
            if (root.removedOnDispose) {
                (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").info('removed memory store dir', {
                    dest: root.path,
                    memory_store_id: store.memoryStoreId,
                });
            }
        }
    }
}
_SessionMemoryStores_client = new WeakMap(), _SessionMemoryStores_workdir = new WeakMap(), _SessionMemoryStores_syncIntervalMs = new WeakMap(), _SessionMemoryStores_syncDeletions = new WeakMap(), _SessionMemoryStores_log = new WeakMap(), _SessionMemoryStores_lastSyncAt = new WeakMap(), _SessionMemoryStores_finished = new WeakMap(), _SessionMemoryStores_stores = new WeakMap(), _SessionMemoryStores_instances = new WeakSet(), _SessionMemoryStores_storeRoot = function _SessionMemoryStores_storeRoot(resource) {
    if (resource.mount_path) {
        if (!isPathLegal(resource.mount_path)) {
            throw new SessionMemoryError(`memory store mount_path is not a clean absolute path: ${JSON.stringify(resource.mount_path)} ` +
                `(memory_store_id=${resource.memory_store_id})`);
        }
        return resource.mount_path;
    }
    // No mount_path at all: nothing points the agent anywhere, so the workdir
    // is as good a home as any.
    return node.path.join((0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_workdir, "f"), 'memory', resource.name || resource.memory_store_id);
}, _SessionMemoryStores_scanMarker = async function _SessionMemoryStores_scanMarker(store) {
    const local = await store.files.hashtree();
    const marker = local[MARKER_PATH];
    delete local[MARKER_PATH];
    if (marker === markerSha(store.memoryStoreId)) {
        return { files: local, markerOk: true, distrustReason: null };
    }
    return {
        files: local,
        markerOk: false,
        distrustReason: marker !== undefined ? 'the marker file does not match this store' : 'the marker file is gone',
    };
}, _SessionMemoryStores_syncStore = async function _SessionMemoryStores_syncStore(store, final) {
    try {
        const scan = await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_scanMarker).call(this, store);
        const local = scan.files;
        if (!scan.markerOk) {
            if (Object.keys(local).length > 0) {
                (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn(`${scan.distrustReason}; leaving the memory store folder as found and not syncing`, {
                    root: store.files.root().path,
                    memory_store_id: store.memoryStoreId,
                });
                return;
            }
            await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_recover).call(this, store, 'the folder or its marker is gone');
            return;
        }
        // A lone file vanishing is an ordinary deletion; two or more at
        // once with nothing left is a wiped folder.
        if (Object.keys(local).length === 0 && store.baseline.size > 1) {
            await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_recover).call(this, store, 'every memory file is gone at once');
            return;
        }
        const remote = new Map();
        for await (const [rel, item] of (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_listMemories).call(this, store.memoryStoreId)) {
            remote.set(rel, item);
        }
        const deletes = new DeletePass((0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_syncDeletions, "f"), Math.max(DELETE_CAP_FLOOR, Math.min(DELETE_CAP_CEILING, Math.floor(store.baseline.size / 4))), final);
        const pulls = [];
        const baseline = new Map();
        const paths = [...new Set([...remote.keys(), ...Object.keys(local), ...store.baseline.keys()])].sort();
        for (const rel of paths) {
            const remoteItem = remote.get(rel);
            const localSha = local[rel];
            const baseSha = store.baseline.get(rel);
            let sha;
            if (localSha === undefined &&
                baseSha !== undefined &&
                remoteItem !== undefined &&
                remoteItem.content_sha256 === baseSha &&
                !store.readOnly) {
                sha = await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_corroboratedDelete).call(this, store, rel, remoteItem, baseSha, deletes);
            }
            else {
                sha = await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_syncPath).call(this, store, rel, remoteItem, localSha, pulls);
            }
            if (sha !== undefined)
                baseline.set(rel, sha);
        }
        store.baseline = baseline;
        // The content pass: everything above moved only shas.
        await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_pullAll).call(this, store, pulls);
        if (deletes.suppressed > 0) {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").debug('remote deletes are disabled; locally deleted memories stay on the server', {
                count: deletes.suppressed,
                memory_store_id: store.memoryStoreId,
            });
        }
        if (deletes.capped > 0) {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn(`delete cap reached: ${deletes.mode === 'log_only' ? 'would send' : 'sent'} ` +
                `${deletes.attempted} deletes, held ${deletes.capped} for later syncs`, { memory_store_id: store.memoryStoreId });
        }
    }
    catch (e) {
        (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn('memory sync failed', { memory_store_id: store.memoryStoreId, error: String(e) });
    }
}, _SessionMemoryStores_flushStore = async function _SessionMemoryStores_flushStore(store, signal) {
    const dirty = new Map();
    const unsent = new Set();
    const push = async () => {
        if (store.readOnly)
            return;
        const scan = await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_scanMarker).call(this, store);
        if (!scan.markerOk) {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn(`${scan.distrustReason}; not uploading anything from the memory store folder`, {
                root: store.files.root().path,
                memory_store_id: store.memoryStoreId,
            });
            return;
        }
        for (const [rel, sha] of Object.entries(scan.files)) {
            if (sha !== store.baseline.get(rel) && store.refusedShas.get(rel) !== sha) {
                dirty.set(rel, sha);
                unsent.add(rel);
            }
        }
        if (dirty.size === 0 || signal?.aborted)
            return;
        const remote = new Map();
        for await (const [rel, item] of (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_listMemories).call(this, store.memoryStoreId)) {
            if (signal?.aborted)
                return;
            remote.set(rel, item);
        }
        const uploads = [];
        for (const rel of [...dirty.keys()].sort()) {
            const localSha = dirty.get(rel);
            const baseSha = store.baseline.get(rel);
            const existing = remote.get(rel);
            if (existing !== undefined && existing.content_sha256 === localSha) {
                store.baseline.set(rel, existing.content_sha256);
                unsent.delete(rel);
                continue;
            }
            if (existing !== undefined && existing.content_sha256 !== baseSha) {
                (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn('memory changed both locally and remotely; the flush leaves the remote version', {
                    path: rel,
                    memory_store_id: store.memoryStoreId,
                });
                unsent.delete(rel);
                continue;
            }
            uploads.push([rel, localSha, existing]);
        }
        await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_uploadAll).call(this, store, uploads, unsent, signal);
    };
    try {
        await settledOrAborted(push(), signal);
        if (signal?.aborted && unsent.size > 0) {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn(`memory flush cut off part-way; ${unsent.size} of ${dirty.size} changed files had not finished uploading`, { memory_store_id: store.memoryStoreId });
        }
    }
    catch (e) {
        (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn('memory flush failed', { memory_store_id: store.memoryStoreId, error: String(e) });
    }
}, _SessionMemoryStores_recover = 
/** Rebuild a destroyed folder from the server; sends no deletes, no uploads. */
async function _SessionMemoryStores_recover(store, reason) {
    (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn(`${reason}; re-downloading the memory store folder instead of syncing`, {
        root: store.files.root().path,
        memory_store_id: store.memoryStoreId,
    });
    await store.files.createRoot();
    await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_stampAndPull).call(this, store);
}, _SessionMemoryStores_stampAndPull = 
/**
 * Write the marker, then pull every remote memory. Baseline is cleared
 * first so a failed write never leaves an entry whose file is not on disk.
 * Every memory is needed here, so the listing carries the content — pages
 * cost far fewer round-trips than a request per memory.
 */
async function _SessionMemoryStores_stampAndPull(store) {
    store.baseline = new Map();
    store.pendingDeletes.clear();
    await store.files.put(MARKER_PATH, `version ${MARKER_VERSION}\n${store.memoryStoreId}`);
    for await (const [rel, item] of (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_listMemories).call(this, store.memoryStoreId, 'full')) {
        if (await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_write).call(this, store, rel, item.content ?? '')) {
            store.baseline.set(rel, item.content_sha256);
        }
    }
}, _SessionMemoryStores_syncPath = 
/**
 * Reconcile one path. Returns the sha to record in the baseline, or
 * `undefined` to drop the path from it.
 *
 * `pulls` is an output: when the remote version should be written to disk,
 * this appends `[rel, remote]` to it instead of writing — `rel` is the
 * file to write, `remote` the listed memory whose content `#pullAll` will
 * fetch and write there.
 */
async function _SessionMemoryStores_syncPath(store, rel, remote, localSha, pulls) {
    const baseSha = store.baseline.get(rel);
    if (localSha !== undefined) {
        store.pendingDeletes.delete(rel);
    }
    if (!remote) {
        if (localSha === undefined) {
            store.pendingDeletes.delete(rel);
            return undefined;
        }
        if (baseSha !== undefined) {
            if (localSha === baseSha) {
                const fresh = await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_removeLocal).call(this, store, rel, baseSha);
                if (fresh === undefined)
                    return undefined;
                if (fresh === baseSha)
                    return baseSha;
                localSha = fresh;
            }
            // The file holds an un-pushed edit — the only copy; falling
            // through re-creates or keeps it.
            if (store.readOnly) {
                (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn('memory deleted remotely but edited locally; keeping the file, ' +
                    'which a read-only store cannot push', { path: rel, memory_store_id: store.memoryStoreId });
            }
            else if (store.refusedShas.get(rel) !== localSha) {
                (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").info('memory deleted remotely but edited locally; re-creating it from the file', {
                    path: rel,
                    memory_store_id: store.memoryStoreId,
                });
            }
        }
        if (store.readOnly)
            return undefined;
        if (store.refusedShas.get(rel) === localSha)
            return undefined;
        return await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_upload).call(this, store, rel, localSha, undefined);
    }
    const remoteSha = remote.content_sha256;
    const remoteChanged = remoteSha !== baseSha;
    const locallyEdited = localSha !== undefined && localSha !== baseSha && localSha !== remoteSha;
    // Read-only stores never push, so their local edits don't count.
    const localChanged = !store.readOnly && locallyEdited;
    if (localSha === undefined && baseSha !== undefined) {
        // Only successful writes enter the baseline, so this file was verifiably
        // on disk and is now gone: a real local deletion. The unchanged-remote
        // case went to #corroboratedDelete.
        if (remoteChanged) {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn('memory deleted locally but changed remotely; restoring the remote version', {
                path: rel,
                memory_store_id: store.memoryStoreId,
            });
            store.pendingDeletes.delete(rel);
            pulls.push([rel, remote]);
        }
        return baseSha;
    }
    if (remoteChanged) {
        // The file already holds the remote bytes — adopt without a fetch.
        if (localSha === remoteSha)
            return remoteSha;
        // locallyEdited, not localChanged: warn on read-only overwrites too.
        if (locallyEdited) {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn('memory changed both locally and remotely; keeping the remote version', {
                path: rel,
                memory_store_id: store.memoryStoreId,
            });
        }
        pulls.push([rel, remote]);
        return baseSha;
    }
    if (localChanged) {
        if (store.refusedShas.get(rel) === localSha)
            return remoteSha;
        return (await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_upload).call(this, store, rel, localSha, remote)) ?? remoteSha;
    }
    return remoteSha;
}, _SessionMemoryStores_removeLocal = 
/**
 * Remove the file for a memory the server no longer has, if it still holds
 * `expectSha`. Returns `undefined` when the file is gone from disk,
 * `expectSha` when it must stay in the baseline (I/O error), or the file's
 * fresh sha when it was edited since the scan.
 */
async function _SessionMemoryStores_removeLocal(store, rel, expectSha) {
    // Re-read: an edit since the scan makes this file the only copy.
    let freshSha;
    try {
        freshSha = await store.files.hashFile(rel);
    }
    catch (e) {
        if (!(e instanceof FileStoreError) && !isErrno(e))
            throw e;
        return expectSha;
    }
    if (freshSha === null)
        return undefined;
    if (freshSha !== expectSha)
        return freshSha;
    try {
        await store.files.remove(rel);
    }
    catch (e) {
        if (!(e instanceof FileStoreError) && !isErrno(e))
            throw e;
        (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn('failed to remove memory deleted remotely', {
            path: rel,
            memory_store_id: store.memoryStoreId,
            error: String(e),
        });
        return expectSha;
    }
    return undefined;
}, _SessionMemoryStores_write = 
/**
 * Write a memory's content to disk; `false` (and a warning) on failure.
 *
 * A `..` component in the wire path reaches here as {@link FileStoreError} —
 * that is the escape guard.
 */
async function _SessionMemoryStores_write(store, rel, content) {
    try {
        await store.files.put(rel, content);
    }
    catch (e) {
        if (!(e instanceof FileStoreError) && !isErrno(e))
            throw e;
        (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn('failed to write memory', {
            path: rel,
            memory_store_id: store.memoryStoreId,
            error: String(e),
        });
        return false;
    }
    return true;
}, _SessionMemoryStores_pullAll = 
/**
 * Fetch and write the given memories, {@link FETCH_CONCURRENCY} at a time.
 *
 * The sync's content pass: the listing carried no content, so each memory
 * is fetched individually and written as it arrives. On success the path's
 * baseline advances; on a failed fetch or write the old entry stays and the
 * next sync retries. A 404 means the memory was deleted after the listing —
 * the next sync reconciles it.
 */
async function _SessionMemoryStores_pullAll(store, pulls) {
    if (pulls.length === 0)
        return;
    const pullOne = async (rel, listed) => {
        let item;
        try {
            item = await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_client, "f").beta.memoryStores.memories.retrieve(listed.id, {
                memory_store_id: store.memoryStoreId,
                view: 'full',
            });
        }
        catch (e) {
            if ((0,backoff/* isStatus */.zM)(e, 404))
                return;
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn('failed to fetch memory content', {
                path: rel,
                memory_store_id: store.memoryStoreId,
                error: String(e),
            });
            return;
        }
        if (await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_write).call(this, store, rel, item.content ?? '')) {
            store.baseline.set(rel, item.content_sha256);
        }
    };
    // A fixed pool of workers drains the queue; the write stays inside the
    // worker so a slow disk cannot let fetched bodies pile up beyond the bound.
    const queue = pulls[Symbol.iterator]();
    const worker = async () => {
        for (const [rel, listed] of queue)
            await pullOne(rel, listed);
    };
    await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, pulls.length) }, worker));
}, _SessionMemoryStores_uploadAll = 
/**
 * Upload the given files, {@link UPLOAD_CONCURRENCY} at a time, taking each
 * path off `unsent` as its upload returns. No upload starts once `signal`
 * aborts; the ones already in flight run to completion.
 */
async function _SessionMemoryStores_uploadAll(store, uploads, unsent, signal) {
    const queue = uploads[Symbol.iterator]();
    const worker = async () => {
        for (const [rel, localSha, existing] of queue) {
            if (signal?.aborted)
                return;
            const sha = await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_upload).call(this, store, rel, localSha, existing);
            unsent.delete(rel);
            if (sha !== undefined)
                store.baseline.set(rel, sha);
        }
    };
    await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, uploads.length) }, worker));
}, _SessionMemoryStores_listMemories = 
/**
 * The store's memories keyed by relative path (the wire path's leading `/`
 * stripped — `#upload` re-prefixes it) — `basic` view (shas, no content) at
 * {@link LIST_PAGE_SIZE} per page unless the caller needs `full` pages.
 * `memory_prefix` rollups and the reserved marker path are skipped.
 */
async function* _SessionMemoryStores_listMemories(memoryStoreId, view = 'basic') {
    const limit = view === 'basic' ? LIST_PAGE_SIZE : FULL_LIST_PAGE_SIZE;
    for await (const item of (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_client, "f").beta.memoryStores.memories.list(memoryStoreId, { view, limit })) {
        if (item.type !== 'memory')
            continue;
        const rel = item.path.replace(/^\/+/, '');
        if (rel === MARKER_PATH) {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn('the server listed the reserved marker path; skipping', {
                path: item.path,
                memory_store_id: memoryStoreId,
            });
            continue;
        }
        yield [rel, item];
    }
}, _SessionMemoryStores_upload = 
/**
 * Push one local file; `undefined` keeps the old baseline so the next pass retries.
 *
 * A refusal the server would repeat (400/413, the utf-8 gate) enters
 * `refusedShas`: warned once, retried only after the file changes.
 */
async function _SessionMemoryStores_upload(store, rel, localSha, existing) {
    try {
        const data = await store.files.get(rel);
        if (data === null)
            return undefined;
        const content = (0,bytes/* decodeUTF8 */.CE)(data);
        const item = existing ?
            await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_client, "f").beta.memoryStores.memories.update(existing.id, {
                memory_store_id: store.memoryStoreId,
                content,
                precondition: { type: 'content_sha256', content_sha256: existing.content_sha256 },
            })
            : await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_client, "f").beta.memoryStores.memories.create(store.memoryStoreId, {
                path: '/' + rel,
                content,
            });
        store.refusedShas.delete(rel);
        return item.content_sha256;
    }
    catch (e) {
        if (existing && (0,backoff/* isStatus */.zM)(e, 404)) {
            // Deleted remotely since the listing, so this file is now the only copy.
            return await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_upload).call(this, store, rel, localSha, undefined);
        }
        const permanent = e instanceof FileStoreError || (0,backoff/* isStatus */.zM)(e, 400) || (0,backoff/* isStatus */.zM)(e, 413);
        if (existing && (0,backoff/* isStatus */.zM)(e, 409)) {
            // The precondition lost a race: the remote moved under us, so the push
            // is dropped. The local file is now stale — the next sync sees
            // remoteChanged and pulls the winner over it.
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn('memory changed both locally and remotely; the upload was refused and the local edit loses', {
                path: rel,
                memory_store_id: store.memoryStoreId,
            });
        }
        else if (permanent && localSha !== undefined) {
            store.refusedShas.set(rel, localSha);
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn('the server rejected this memory file, so it stays un-synced until its content changes', { path: rel, memory_store_id: store.memoryStoreId, rejection: String(e) });
        }
        else {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn('failed to upload memory', {
                path: rel,
                memory_store_id: store.memoryStoreId,
                error: String(e),
            });
        }
        return undefined;
    }
}, _SessionMemoryStores_corroboratedDelete = 
/** Send the server delete only after the wait, the cap, and a fresh re-check all clear. */
async function _SessionMemoryStores_corroboratedDelete(store, rel, remote, baseSha, deletes) {
    if (deletes.mode === 'disabled') {
        deletes.suppressed++;
        return baseSha;
    }
    let firstAbsent = store.pendingDeletes.get(rel);
    if (firstAbsent === undefined) {
        firstAbsent = Date.now();
        store.pendingDeletes.set(rel, firstAbsent);
    }
    if (!deletes.waiveWindow && Date.now() - firstAbsent < DELETE_CORROBORATION_MS) {
        return baseSha;
    }
    let markerOk;
    let stillAbsent;
    try {
        // Re-check: the folder may have been wiped mid-sync.
        markerOk = (await store.files.hashFile(MARKER_PATH)) === markerSha(store.memoryStoreId);
        stillAbsent = (await store.files.hashFile(rel)) === null;
    }
    catch (e) {
        if (!(e instanceof FileStoreError) && !isErrno(e))
            throw e;
        markerOk = stillAbsent = false;
    }
    if (!markerOk)
        return baseSha;
    if (!stillAbsent) {
        store.pendingDeletes.delete(rel);
        return baseSha;
    }
    if (!deletes.takeSlot())
        return baseSha;
    if (deletes.mode === 'log_only') {
        // Repeats each sync — the log is the dry run.
        (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").info('log-only: sync would delete this memory on the server', {
            path: rel,
            memory_store_id: store.memoryStoreId,
        });
        return baseSha;
    }
    const sha = await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_instances, "m", _SessionMemoryStores_deleteRemote).call(this, store, rel, remote, baseSha);
    if (sha === undefined) {
        store.pendingDeletes.delete(rel);
    }
    return sha;
}, _SessionMemoryStores_deleteRemote = async function _SessionMemoryStores_deleteRemote(store, rel, remote, baseSha) {
    try {
        await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_client, "f").beta.memoryStores.memories.delete(remote.id, {
            memory_store_id: store.memoryStoreId,
            expected_content_sha256: baseSha,
        });
    }
    catch (e) {
        if ((0,backoff/* isStatus */.zM)(e, 404))
            return undefined; // already gone remotely too
        if ((0,backoff/* isStatus */.zM)(e, 409) || (0,backoff/* isStatus */.zM)(e, 412)) {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn('memory deleted locally but changed remotely; keeping the remote version', {
                path: rel,
                memory_store_id: store.memoryStoreId,
            });
        }
        else {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").warn('failed to delete memory', {
                path: rel,
                memory_store_id: store.memoryStoreId,
                error: String(e),
            });
        }
        return baseSha;
    }
    (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionMemoryStores_log, "f").info('propagated local deletion', { path: rel, memory_store_id: store.memoryStoreId });
    return undefined;
};
/**
 * True for a thrown value shaped like a Node filesystem error. Shape-checked,
 * not `instanceof Error` — fs errors can come from another realm.
 */
function isErrno(e) {
    return typeof e === 'object' && e !== null && typeof e.code === 'string';
}
/**
 * Resolve when `p` settles, or as soon as `signal` aborts. A rejection from
 * `p` before the abort propagates; one after it is dropped.
 */
async function settledOrAborted(p, signal) {
    if (!signal) {
        await p;
        return;
    }
    let onAbort;
    const aborted = new Promise((resolve) => {
        onAbort = resolve;
        if (signal.aborted)
            resolve();
    });
    signal.addEventListener('abort', onAbort, { once: true });
    try {
        await Promise.race([p, aborted]);
    }
    finally {
        signal.removeEventListener('abort', onAbort);
    }
}
//# sourceMappingURL=memories.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/tools/agent-toolset/node.mjs
/**
 * Node implementation of the `agent_toolset_20260401` tools — `bash`, `read`,
 * `write`, `edit`, `glob`, `grep` — plus the workdir/skills
 * {@link AgentToolContext}.
 *
 * This mirrors `@anthropic-ai/sdk/tools/memory/node`: it is the explicit,
 * Node-only entry point for these implementations. Importing it pulls in
 * `node:child_process`, `node:fs`, etc., so it is kept separate from the rest of
 * the SDK — depending on it is an opt-in.
 *
 * **Node 22+ is required** for this module: the `glob` tool uses the native
 * `fs.glob`, added in Node 22. The rest of the SDK still supports Node 18+; only
 * the agent toolset has this requirement.
 *
 * The result of {@link betaAgentToolset20260401} is a plain `BetaRunnableTool[]`;
 * hand it to any tool runner — `client.beta.messages.toolRunner({ …, tools })`
 * for the Messages API, or `client.beta.sessions.events.toolRunner({ …, tools })`
 * for a managed-agents session:
 *
 * ```ts
 * import { betaAgentToolset20260401 } from '@anthropic-ai/sdk/tools/agent-toolset/node';
 *
 * const tools = betaAgentToolset20260401({ workdir: '/work' });
 * const tools2 = betaAgentToolset20260401({ workdir: '/work' }).filter((t) => t.name !== 'bash');
 * ```
 *
 * Trust model: the file tools confine to `workdir` plus any `allowedRoots`
 * (symlink-aware) and are safe without a sandbox; `bash` is unrestricted and
 * should run inside one. See {@link AgentToolContext}.
 */
var _BashSession_instances, _BashSession_proc, _BashSession_buf, _BashSession_truncated, _BashSession_closed, _BashSession_waiting, _BashSession_append, _LineRangeCollector_instances, _LineRangeCollector_filePath, _LineRangeCollector_startLine, _LineRangeCollector_endLine, _LineRangeCollector_start, _LineRangeCollector_end, _LineRangeCollector_limit, _LineRangeCollector_line, _LineRangeCollector_collected, _LineRangeCollector_collectedBytes, _LineRangeCollector_collect, _LineRangeCollector_overLimitError;














const BASH_OUTPUT_LIMIT = 100 * 1024;
const BASH_DEFAULT_TIMEOUT_MS = 120000;
// Default size cap for the read/edit tools (both load the whole file into
// memory) when AgentToolContext.maxFileBytes is unset. The reject-vs-truncate
// behaviour remains a separate question pending CMA validation.
const DEFAULT_MAX_FILE_BYTES = 256 * 1024;
const READ_STREAM_CHUNK_BYTES = 64 * 1024;
const NEWLINE = Buffer.from('\n');
const GREP_OUTPUT_LIMIT = 100 * 1024;
const GREP_MAX_LINE_LENGTH = 2000;
const GLOB_RESULT_LIMIT = 200;
/**
 * A bash command exceeded its `timeoutMs`. Carries the timeout so a caller can
 * tell it apart from an abort without matching on the message text.
 */
class BashTimeoutError extends error/* AnthropicError */.pJ {
    constructor(timeoutMs) {
        super(`bash command timed out after ${timeoutMs}ms`);
        this.name = 'BashTimeoutError';
        this.timeoutMs = timeoutMs;
    }
}
const ANSI_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
const fsGlob = promises_.glob;
function resolveMaxBytes(configured) {
    return configured === undefined ? DEFAULT_MAX_FILE_BYTES : configured;
}
/**
 * Throw when the deprecated {@link AgentToolContext.unrestrictedPaths} was
 * passed at all. Nothing else reads that property.
 */
function rejectUnrestrictedPaths(value) {
    if (value === undefined)
        return;
    throw new error/* AnthropicError */.pJ('The `unrestrictedPaths` option you passed to the agent toolset (AgentToolContext) is no longer ' +
        "supported. The toolset's file tools (read, write, edit, glob, grep) are now always confined to " +
        'the working directory plus the directories listed in `allowedRoots`. Remove `unrestrictedPaths` ' +
        'from your context; to let the file tools reach any other directory, add it to `allowedRoots`.');
}
/**
 * Returns the `agent_toolset_20260401` implementations bound to `ctx`. The
 * result is a plain array of `BetaRunnableTool`; filter or extend it before
 * handing it to a tool runner:
 *
 * ```ts
 * const tools = [...betaAgentToolset20260401(ctx), myCustomTool];
 * const tools = betaAgentToolset20260401(ctx).filter((t) => t.name !== 'grep');
 * ```
 *
 * Concurrency note: `client.beta.sessions.events.toolRunner` dispatches a
 * session's tool calls serially (the sessions API delivers one `agent.tool_use`
 * at a time). `client.beta.messages.toolRunner` runs a turn's `tool.run` calls
 * via `Promise.all`. The toolset below is safe under either model —
 * {@link betaBashTool} serializes its persistent shell internally and the FS
 * tools are independent per call — but {@link betaEditTool}/{@link betaWriteTool}
 * cannot synchronize concurrent writes to the *same* file across processes, so a
 * multi-edit turn touching one path is still subject to inherent FS lost-update
 * races. Custom tools that close over mutable state should do their own queueing.
 */
function betaAgentToolset20260401(ctx) {
    return [
        betaBashTool(ctx),
        betaReadTool(ctx),
        betaWriteTool(ctx),
        betaEditTool(ctx),
        betaGlobTool(ctx),
        betaGrepTool(ctx),
    ];
}
/**
 * Resolve `p` against `ctx.workdir`; reject results outside `ctx.workdir` and
 * `ctx.allowedRoots`. Absolute and relative inputs go through the same
 * canonicalise-then-contain check — an absolute path that lands inside a
 * permitted root is accepted, only paths that resolve *outside* all of them
 * are rejected. Every symlink in `p` (including the leaf, even a dangling one)
 * is resolved before the check, and the resolved path is what the tool then
 * operates on, so a symlink inside the workdir that points outside it can
 * neither pass the check nor be followed afterwards. See the trust model on
 * {@link AgentToolContext}.
 *
 * Residual TOCTOU: a component could still be swapped for a symlink between this
 * call and the eventual `fs` operation. Closing that fully needs per-component
 * `O_NOFOLLOW`/`openat`, which Node does not expose ergonomically; the same
 * residual exposure exists in `tools/memory/node` and is why a sandbox is still
 * recommended for the toolset as a whole.
 */
async function resolvePath(ctx, p) {
    rejectUnrestrictedPaths(ctx.unrestrictedPaths);
    return confineToRoot(ctx.workdir, p, { allowedRoots: ctx.allowedRoots ?? [] });
}
/**
 * The read-only root `target` falls under, or `undefined`. `target` arrives
 * fully canonicalized (from {@link resolvePath}), so each root is
 * canonicalized too — a root recorded through a symlinked workdir must still
 * match the resolved write target.
 */
function readOnlyRootFor(ctx, target) {
    return containingRoot(ctx.readOnlyRoots ?? [], target);
}
// ---- bash ----------------------------------------------------------------
/**
 * Build the environment for the spawned bash shell. The runner process holds
 * Anthropic credentials in `ANTHROPIC_*` env vars — the API key, the auth token,
 * and the per-work session token among them. `bash` runs an unrestricted shell,
 * so any command the agent runs could read those straight out of `process.env`;
 * strip the whole `ANTHROPIC_*` namespace from the child's environment.
 * Everything else (PATH, HOME, locale, …) is passed through unchanged.
 *
 * Passing an explicit `env` to {@link AgentToolContext} does NOT add to this
 * default — it FULLY REPLACES it. The provided mapping becomes the entire bash
 * environment verbatim; nothing here is merged in, so callers who want the
 * scrubbed process environment plus extras must build that mapping themselves.
 */
function scrubbedShellEnv() {
    const env = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith('ANTHROPIC_'))
            continue;
        env[key] = value;
    }
    return env;
}
/**
 * A persistent /bin/bash process. State (cwd, env, background jobs) survives
 * across exec() calls. Uses pipes rather than a PTY so input is never echoed.
 */
class BashSession {
    constructor(dir, env = scrubbedShellEnv()) {
        _BashSession_instances.add(this);
        _BashSession_proc.set(this, void 0);
        _BashSession_buf.set(this, '');
        _BashSession_truncated.set(this, false);
        _BashSession_closed.set(this, false);
        // While a command is in flight, the resolver to fire once its sentinel lands
        // in `#buf` (or once the shell dies). Event-driven: no polling loop.
        _BashSession_waiting.set(this, null);
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BashSession_proc, external_node_child_process_.spawn('/bin/bash', ['--noprofile', '--norc'], {
            cwd: dir,
            // `env` is the full base environment (the scrubbed process env by
            // default, or the verbatim replacement from `AgentToolContext.env`).
            // PS1/PS2/TERM are shell-control settings BashSession always applies so
            // the pipe-based sentinel exec parsing works — not part of the
            // user-facing environment.
            env: { ...env, PS1: '', PS2: '', TERM: 'dumb' },
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: true,
        }), "f");
        (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_proc, "f").stdout.setEncoding('utf8');
        (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_proc, "f").stderr.setEncoding('utf8');
        (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_proc, "f").stdout.on('data', (d) => (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_instances, "m", _BashSession_append).call(this, d));
        (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_proc, "f").stderr.on('data', (d) => (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_instances, "m", _BashSession_append).call(this, d));
        (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_proc, "f").once('close', () => {
            (0,tslib/* __classPrivateFieldSet */.G)(this, _BashSession_closed, true, "f");
            // Wake any in-flight exec so it fails fast instead of waiting for its deadline.
            const w = (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_waiting, "f");
            (0,tslib/* __classPrivateFieldSet */.G)(this, _BashSession_waiting, null, "f");
            w?.resolve();
        });
    }
    /** Whether the underlying shell process has exited. */
    get closed() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_closed, "f");
    }
    async exec(command, opts = {}) {
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_closed, "f")) {
            throw new error/* AnthropicError */.pJ('bash session terminated');
        }
        const timeoutMs = opts.timeoutMs ?? BASH_DEFAULT_TIMEOUT_MS;
        const signal = opts.signal;
        // Reject with the signal's own reason, so a caller telling a user cancel
        // apart from an `AbortSignal.timeout()` sees the platform's name intact.
        signal?.throwIfAborted();
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BashSession_buf, '', "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BashSession_truncated, false, "f");
        // Per-call nonce so a command that prints a fixed marker can't spoof the
        // exit-code framing. The `''` split keeps the literal out of what we write
        // to stdin — only the shell's printf reassembles it.
        const sentinel = `__ANT_CMD_${external_node_crypto_.randomUUID()}_DONE__`;
        const sentinelSplit = `${sentinel.slice(0, 8)}''${sentinel.slice(8)}`;
        // </dev/null: a stdin-reading command (`cat`, `read`) gets EOF instead of
        // blocking on the shared pipe until the timeout.
        const wrapped = `{ ${command}\n} </dev/null 2>&1; printf '\\n${sentinelSplit}%d\\n' $?\n`;
        (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_proc, "f").stdin.write(wrapped);
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_buf, "f").indexOf(sentinel) < 0) {
            // Park until the sentinel lands, the deadline passes, the caller aborts,
            // or the shell dies — whichever comes first. `#append` (and the `close`
            // handler) resolve `sentinelSeen`; the deadline / abort reject.
            const { promise: sentinelSeen, resolve } = (0,promise/* promiseWithResolvers */.n)();
            (0,tslib/* __classPrivateFieldSet */.G)(this, _BashSession_waiting, { sentinel, resolve }, "f");
            let timer;
            let onAbort;
            try {
                await Promise.race([
                    sentinelSeen,
                    new Promise((_, reject) => {
                        timer = setTimeout(() => reject(new BashTimeoutError(timeoutMs)), timeoutMs);
                    }),
                    new Promise((_, reject) => {
                        if (!signal)
                            return;
                        onAbort = () => reject(signal.reason);
                        signal.addEventListener('abort', onAbort, { once: true });
                    }),
                ]);
            }
            finally {
                if (timer)
                    clearTimeout(timer);
                if (onAbort && signal)
                    signal.removeEventListener('abort', onAbort);
                (0,tslib/* __classPrivateFieldSet */.G)(this, _BashSession_waiting, null, "f");
            }
        }
        const idx = (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_buf, "f").indexOf(sentinel);
        if (idx < 0) {
            // The shell closed (or was killed) before emitting the sentinel.
            throw new error/* AnthropicError */.pJ('bash session terminated');
        }
        const tail = (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_buf, "f").slice(idx + sentinel.length);
        const m = tail.match(/^(-?\d+)/);
        const exitCode = m ? parseInt(m[1], 10) : -1;
        let out = (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_buf, "f").slice(0, idx).replace(ANSI_RE, '').replace(/\n+$/, '');
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_truncated, "f")) {
            out = `[output truncated]\n${out}`;
        }
        return { output: out, exitCode };
    }
    close() {
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_closed, "f"))
            return;
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BashSession_closed, true, "f");
        const w = (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_waiting, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BashSession_waiting, null, "f");
        w?.resolve();
        (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_proc, "f").stdout.destroy();
        (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_proc, "f").stderr.destroy();
        (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_proc, "f").stdin.destroy();
        try {
            // Negative PID targets the process group so foreground jobs (e.g. a
            // hung sleep) die with the shell.
            process.kill(-(0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_proc, "f").pid, 'SIGKILL');
        }
        catch {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_proc, "f").kill('SIGKILL');
        }
        (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_proc, "f").unref();
    }
}
_BashSession_proc = new WeakMap(), _BashSession_buf = new WeakMap(), _BashSession_truncated = new WeakMap(), _BashSession_closed = new WeakMap(), _BashSession_waiting = new WeakMap(), _BashSession_instances = new WeakSet(), _BashSession_append = function _BashSession_append(d) {
    (0,tslib/* __classPrivateFieldSet */.G)(this, _BashSession_buf, (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_buf, "f") + d, "f");
    if ((0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_buf, "f").length > BASH_OUTPUT_LIMIT) {
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BashSession_buf, (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_buf, "f").slice((0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_buf, "f").length - BASH_OUTPUT_LIMIT), "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BashSession_truncated, true, "f");
    }
    if ((0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_waiting, "f") && (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_buf, "f").indexOf((0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_waiting, "f").sentinel) >= 0) {
        const w = (0,tslib/* __classPrivateFieldGet */.g)(this, _BashSession_waiting, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BashSession_waiting, null, "f");
        w.resolve();
    }
};
function betaBashTool(ctx) {
    rejectUnrestrictedPaths(ctx.unrestrictedPaths);
    let session;
    // Concurrent run() callers chain onto this promise so writes to the shared
    // shell's stdin can't interleave (which would corrupt the sentinel-match
    // exit-code parsing in BashSession.exec). Each call replaces `tail` with a
    // promise that resolves only after its own exec settles.
    let tail = Promise.resolve();
    return betaTool({
        name: 'bash',
        description: 'Run a bash command in a persistent shell. State (cwd, env vars) persists across calls.',
        inputSchema: {
            type: 'object',
            properties: {
                command: { type: 'string', description: 'The command to run' },
                restart: { type: 'boolean', description: 'Restart the persistent shell before running' },
                timeout_ms: { type: 'integer', description: 'Per-call timeout in milliseconds' },
            },
        },
        run: async ({ command, restart, timeout_ms }, context) => {
            const prev = tail;
            const gate = (0,promise/* promiseWithResolvers */.n)();
            tail = gate.promise;
            // Swallow prior rejections — earlier callers got their own error path;
            // we just need to wait for the shell to be free.
            try {
                await prev;
            }
            catch {
                // ignore
            }
            try {
                if (restart) {
                    session?.close();
                    session = undefined;
                }
                if (!command) {
                    if (restart)
                        return 'bash session restarted';
                    throw new ToolError/* ToolError */.v('bash: command is required');
                }
                session ?? (session = new BashSession(ctx.workdir, ctx.env));
                try {
                    const { output, exitCode } = await session.exec(command, {
                        timeoutMs: timeout_ms ?? BASH_DEFAULT_TIMEOUT_MS,
                        signal: context?.signal,
                    });
                    if (exitCode !== 0)
                        throw new ToolError/* ToolError */.v(output || `exit ${exitCode}`);
                    return output;
                }
                catch (e) {
                    if (e instanceof ToolError/* ToolError */.v)
                        throw e;
                    // Timeout, abort, or terminated: the still-running command will emit
                    // a stale sentinel, so discard this session and let the next call
                    // start fresh.
                    session.close();
                    session = undefined;
                    throw new ToolError/* ToolError */.v(`bash: ${e instanceof Error ? e.message : String(e)}`);
                }
            }
            finally {
                gate.resolve();
            }
        },
        close: () => {
            session?.close();
            session = undefined;
        },
    });
}
// ---- fs ------------------------------------------------------------------
function betaReadTool(ctx) {
    rejectUnrestrictedPaths(ctx.unrestrictedPaths);
    return betaTool({
        name: 'read',
        description: 'Read a UTF-8 text file relative to the workdir.',
        inputSchema: {
            type: 'object',
            properties: {
                file_path: { type: 'string' },
                view_range: {
                    type: 'array',
                    items: { type: 'integer' },
                    description: '[start_line, end_line] 1-indexed inclusive',
                },
            },
            required: ['file_path'],
        },
        run: async ({ file_path, view_range }) => {
            if (!file_path)
                throw new ToolError/* ToolError */.v('read: file_path is required');
            const abs = await resolvePath(ctx, file_path);
            if (view_range?.length && view_range.length !== 2) {
                throw new ToolError/* ToolError */.v('read: view_range must be [start_line, end_line]');
            }
            let data;
            try {
                // stat() before any open(): the size cap stops a multi-GB file from
                // OOM'ing the runner, and isFile() rejects FIFOs/devices/dirs without
                // opening them (open() on an unconnected FIFO blocks indefinitely).
                const st = await promises_.stat(abs);
                if (!st.isFile()) {
                    throw new ToolError/* ToolError */.v(`read: ${file_path} is not a regular file`);
                }
                const limit = resolveMaxBytes(ctx.maxFileBytes);
                if (limit !== null && st.size > limit) {
                    if (!view_range?.length) {
                        throw new ToolError/* ToolError */.v(`read: ${file_path} is ${st.size} bytes, exceeds ${limit}-byte limit. ` +
                            'Use the view_range parameter to read specific line ranges, e.g. view_range: [1, 500].');
                    }
                    const [startLine, endLine] = view_range;
                    return await readRangeStreaming(abs, file_path, startLine, endLine, limit);
                }
                data = await promises_.readFile(abs, 'utf8');
            }
            catch (e) {
                if (e instanceof ToolError/* ToolError */.v)
                    throw e;
                throw new ToolError/* ToolError */.v(`read: ${fsErrorMessage(e, file_path)}`);
            }
            if (!view_range?.length)
                return data;
            const [startLine, endLine] = view_range;
            const lines = data.split('\n');
            const start = Math.max(0, startLine - 1);
            const end = endLine > 0 ? endLine : lines.length;
            return lines.slice(start, end).join('\n');
        },
    });
}
/** Returns lines `[startLine, endLine]` of the file at `abs`, capping the selected bytes at `limit`. */
async function readRangeStreaming(abs, filePath, startLine, endLine, limit) {
    const lines = new LineRangeCollector(filePath, startLine, endLine, limit);
    if (lines.rangeIsEmpty())
        return '';
    // Byte chunks rather than readline: a single huge line must never be buffered
    // whole, so memory stays bounded by `limit` plus one chunk.
    const stream = external_node_fs_.createReadStream(abs, { highWaterMark: READ_STREAM_CHUNK_BYTES });
    try {
        for await (const chunk of stream) {
            lines.collectFrom(chunk);
            if (lines.rangeIsCollected())
                break;
        }
    }
    finally {
        stream.destroy();
    }
    return lines.text();
}
/** Collects the bytes of lines `[startLine, endLine]` from consecutive file chunks, capped at `limit`. */
class LineRangeCollector {
    constructor(filePath, startLine, endLine, limit) {
        _LineRangeCollector_instances.add(this);
        _LineRangeCollector_filePath.set(this, void 0);
        _LineRangeCollector_startLine.set(this, void 0);
        _LineRangeCollector_endLine.set(this, void 0);
        _LineRangeCollector_start.set(this, void 0);
        _LineRangeCollector_end.set(this, void 0);
        _LineRangeCollector_limit.set(this, void 0);
        _LineRangeCollector_line.set(this, 0);
        _LineRangeCollector_collected.set(this, []);
        _LineRangeCollector_collectedBytes.set(this, 0);
        (0,tslib/* __classPrivateFieldSet */.G)(this, _LineRangeCollector_filePath, filePath, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _LineRangeCollector_startLine, startLine, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _LineRangeCollector_endLine, endLine, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _LineRangeCollector_start, Math.max(0, startLine - 1), "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _LineRangeCollector_end, endLine > 0 ? endLine : Infinity, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _LineRangeCollector_limit, limit, "f");
    }
    rangeIsEmpty() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_end, "f") <= (0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_start, "f");
    }
    rangeIsCollected() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_line, "f") >= (0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_end, "f");
    }
    collectFrom(chunk) {
        var _a;
        let lineStart = 0;
        while (lineStart < chunk.length && !this.rangeIsCollected()) {
            const newline = chunk.indexOf(0x0a, lineStart);
            const lineEnd = newline < 0 ? chunk.length : newline;
            if ((0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_line, "f") >= (0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_start, "f")) {
                (0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_instances, "m", _LineRangeCollector_collect).call(this, chunk.subarray(lineStart, lineEnd), newline >= 0);
            }
            if (newline < 0)
                break;
            (0,tslib/* __classPrivateFieldSet */.G)(this, _LineRangeCollector_line, (_a = (0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_line, "f"), _a++, _a), "f");
            lineStart = newline + 1;
        }
    }
    text() {
        return Buffer.concat((0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_collected, "f"), (0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_collectedBytes, "f")).toString('utf8');
    }
}
_LineRangeCollector_filePath = new WeakMap(), _LineRangeCollector_startLine = new WeakMap(), _LineRangeCollector_endLine = new WeakMap(), _LineRangeCollector_start = new WeakMap(), _LineRangeCollector_end = new WeakMap(), _LineRangeCollector_limit = new WeakMap(), _LineRangeCollector_line = new WeakMap(), _LineRangeCollector_collected = new WeakMap(), _LineRangeCollector_collectedBytes = new WeakMap(), _LineRangeCollector_instances = new WeakSet(), _LineRangeCollector_collect = function _LineRangeCollector_collect(lineBytes, newlineTerminated) {
    (0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_collected, "f").push(lineBytes);
    (0,tslib/* __classPrivateFieldSet */.G)(this, _LineRangeCollector_collectedBytes, (0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_collectedBytes, "f") + lineBytes.length, "f");
    if (newlineTerminated && (0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_line, "f") + 1 < (0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_end, "f")) {
        (0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_collected, "f").push(NEWLINE);
        (0,tslib/* __classPrivateFieldSet */.G)(this, _LineRangeCollector_collectedBytes, (0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_collectedBytes, "f") + NEWLINE.length, "f");
    }
    if ((0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_collectedBytes, "f") > (0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_limit, "f"))
        throw (0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_instances, "m", _LineRangeCollector_overLimitError).call(this);
}, _LineRangeCollector_overLimitError = function _LineRangeCollector_overLimitError() {
    if ((0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_end, "f") - (0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_start, "f") === 1) {
        return new ToolError/* ToolError */.v(`read: line ${(0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_start, "f") + 1} of ${(0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_filePath, "f")} alone exceeds ${(0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_limit, "f")}-byte limit. ` +
            'The read tool cannot return part of a line, so view_range cannot narrow this further.');
    }
    return new ToolError/* ToolError */.v(`read: view_range [${(0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_startLine, "f")}, ${(0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_endLine, "f")}] of ${(0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_filePath, "f")} exceeds ${(0,tslib/* __classPrivateFieldGet */.g)(this, _LineRangeCollector_limit, "f")}-byte limit. ` +
        'Narrow the view_range to read a smaller portion.');
};
function betaWriteTool(ctx) {
    rejectUnrestrictedPaths(ctx.unrestrictedPaths);
    return betaTool({
        name: 'write',
        description: 'Write a UTF-8 text file relative to the workdir, creating parent directories as needed.',
        inputSchema: {
            type: 'object',
            properties: { file_path: { type: 'string' }, content: { type: 'string' } },
            required: ['file_path', 'content'],
        },
        run: async ({ file_path, content }) => {
            if (!file_path)
                throw new ToolError/* ToolError */.v('write: file_path is required');
            const abs = await resolvePath(ctx, file_path);
            const ro = await readOnlyRootFor(ctx, abs);
            if (ro !== undefined) {
                throw new ToolError/* ToolError */.v(`write: ${file_path} is inside read-only directory ${ro}`);
            }
            try {
                await promises_.mkdir(external_node_path_.dirname(abs), { recursive: true, mode: DIR_CREATE_MODE });
                await atomicWriteFile(abs, content ?? '');
            }
            catch (e) {
                throw new ToolError/* ToolError */.v(`write: ${fsErrorMessage(e, file_path)}`);
            }
            return `wrote ${Buffer.byteLength(content ?? '')} bytes to ${file_path}`;
        },
    });
}
function betaEditTool(ctx) {
    rejectUnrestrictedPaths(ctx.unrestrictedPaths);
    return betaTool({
        name: 'edit',
        description: 'Replace old_string with new_string in a file. old_string must be unique unless replace_all.',
        inputSchema: {
            type: 'object',
            properties: {
                file_path: { type: 'string' },
                old_string: { type: 'string' },
                new_string: { type: 'string' },
                replace_all: { type: 'boolean' },
            },
            required: ['file_path', 'old_string', 'new_string'],
        },
        run: async ({ file_path, old_string, new_string, replace_all }) => {
            if (!file_path)
                throw new ToolError/* ToolError */.v('edit: file_path is required');
            if (!old_string)
                throw new ToolError/* ToolError */.v('edit: old_string is required');
            const abs = await resolvePath(ctx, file_path);
            const ro = await readOnlyRootFor(ctx, abs);
            if (ro !== undefined) {
                throw new ToolError/* ToolError */.v(`edit: ${file_path} is inside read-only directory ${ro}`);
            }
            let data;
            try {
                // stat() before any open() — same guard as `read`: the size cap stops a
                // multi-GB file from OOM'ing the runner, and isFile() rejects
                // FIFOs/devices/dirs without opening them (open() on an unconnected FIFO
                // blocks indefinitely). The edit path is model-controlled, so it needs
                // the same bound `read` already has.
                const st = await promises_.stat(abs);
                if (!st.isFile()) {
                    throw new ToolError/* ToolError */.v(`edit: ${file_path} is not a regular file`);
                }
                const limit = resolveMaxBytes(ctx.maxFileBytes);
                if (limit !== null && st.size > limit) {
                    throw new ToolError/* ToolError */.v(`edit: ${file_path} is ${st.size} bytes, exceeds ${limit}-byte limit. ` +
                        'The edit tool loads the whole file and cannot modify a file this large.');
                }
                data = await promises_.readFile(abs, 'utf8');
            }
            catch (e) {
                if (e instanceof ToolError/* ToolError */.v)
                    throw e;
                throw new ToolError/* ToolError */.v(`edit: ${fsErrorMessage(e, file_path)}`);
            }
            const count = data.split(old_string).length - 1;
            if (count === 0)
                throw new ToolError/* ToolError */.v(`edit: old_string not found in ${file_path}`);
            let updated;
            if (replace_all) {
                updated = data.split(old_string).join(new_string);
            }
            else {
                if (count > 1)
                    throw new ToolError/* ToolError */.v(`edit: old_string appears ${count} times in ${file_path} (must be unique)`);
                // Callback form so `$&`/`$1`/`` $` `` in new_string are inserted
                // literally instead of expanded as replacement patterns.
                updated = data.replace(old_string, () => new_string);
            }
            try {
                await atomicWriteFile(abs, updated);
            }
            catch (e) {
                throw new ToolError/* ToolError */.v(`edit: write: ${fsErrorMessage(e, file_path)}`);
            }
            return `edited ${file_path} (${replace_all ? count : 1} replacement(s))`;
        },
    });
}
// ---- search --------------------------------------------------------------
/**
 * Best-effort: stops `fs.glob` from walking out of the root via a literal or
 * brace-expanded `..`. The realpath post-filter in {@link betaGlobTool} is the
 * boundary; this only avoids the walk.
 */
function patternCanAscend(pattern) {
    return pattern.split(/[\\/{},]/).includes('..');
}
function betaGlobTool(ctx) {
    rejectUnrestrictedPaths(ctx.unrestrictedPaths);
    return betaTool({
        name: 'glob',
        description: 'Match files under the workdir against a glob pattern. Results are mtime-sorted, newest first.',
        inputSchema: {
            type: 'object',
            properties: {
                pattern: { type: 'string' },
                path: { type: 'string', description: 'Directory to search in. Defaults to the workdir.' },
            },
            required: ['pattern'],
        },
        run: async ({ pattern, path: searchPath }) => {
            if (!pattern)
                throw new ToolError/* ToolError */.v('glob: pattern is required');
            if (external_node_path_.isAbsolute(pattern)) {
                throw new ToolError/* ToolError */.v('glob: absolute pattern not permitted; pass a relative pattern (and optionally path)');
            }
            if (patternCanAscend(pattern)) {
                throw new ToolError/* ToolError */.v('glob: ".." is not permitted in the pattern');
            }
            const root = searchPath ? await resolvePath(ctx, searchPath) : external_node_path_.resolve(ctx.workdir);
            // Compare canonical against canonical: a workdir that is itself a
            // symlink would otherwise falsely reject every realpath'd match below.
            const realRoot = searchPath ? root : await canonicalize(root);
            const matches = [];
            // Bounds the walk for patterns that match, or brace-expand into,
            // enormous trees.
            let remaining = WALK_MAX_ENTRIES;
            try {
                // Native `fs.glob` (Node 22+). `exclude` prunes the noisy dirs the
                // legacy walker skipped; only regular files are collected.
                for await (const entry of fsGlob(pattern, {
                    cwd: root,
                    withFileTypes: true,
                    exclude: (d) => d.name === '.git' || d.name === 'node_modules',
                })) {
                    if (remaining-- <= 0)
                        break;
                    if (!entry.isFile())
                        continue;
                    const full = external_node_path_.join(entry.parentPath, entry.name);
                    // Drop any match that resolves outside the search root. A pattern
                    // that *names* a symlinked directory (the model controls the
                    // pattern, and the bash tool in the same session can plant the
                    // link) makes `fs.glob` descend through it and report entries with
                    // the raw parent path, so a lexical check on `full` alone would
                    // pass `root/link_out/secret` even though it lives outside the
                    // jail. Resolve-failure (ELOOP, EACCES, a racing unlink) is a deny.
                    let real;
                    try {
                        real = await promises_.realpath(full);
                    }
                    catch {
                        continue;
                    }
                    if (!isWithin(realRoot, real))
                        continue;
                    let mtime = 0;
                    try {
                        mtime = (await promises_.stat(full)).mtimeMs;
                    }
                    catch {
                        // unreadable — keep it in the list with mtime 0
                    }
                    matches.push({ path: full, mtime });
                }
            }
            catch (e) {
                throw new ToolError/* ToolError */.v(`glob: ${e instanceof Error ? e.message : String(e)}`);
            }
            if (matches.length === 0)
                return 'no matches';
            matches.sort((a, b) => b.mtime - a.mtime);
            return matches
                .slice(0, GLOB_RESULT_LIMIT)
                .map((m) => m.path)
                .join('\n');
        },
    });
}
function betaGrepTool(ctx) {
    rejectUnrestrictedPaths(ctx.unrestrictedPaths);
    return betaTool({
        name: 'grep',
        description: 'Search file contents for a regex. Uses ripgrep if available, otherwise a built-in walker.',
        inputSchema: {
            type: 'object',
            properties: { pattern: { type: 'string' }, path: { type: 'string' } },
            required: ['pattern'],
        },
        run: async ({ pattern, path: p }, context) => {
            if (!pattern)
                throw new ToolError/* ToolError */.v('grep: pattern is required');
            let searchPath = external_node_path_.resolve(ctx.workdir);
            if (p)
                searchPath = await resolvePath(ctx, p);
            const rg = await findRg();
            return rg ?
                runRipgrep(rg, pattern, searchPath, context?.signal)
                : runWalkGrep(pattern, searchPath, context?.signal);
        },
    });
}
function runRipgrep(rg, pattern, searchPath, signal) {
    return new Promise((resolve, reject) => {
        const proc = external_node_child_process_.spawn(rg, ['-n', '--no-heading', '-e', pattern, '--', searchPath], {
            ...(signal ? { signal } : {}),
        });
        let out = '';
        let errOut = '';
        let truncated = false;
        proc.stdout.on('data', (d) => {
            if (truncated)
                return;
            out += d;
            if (out.length > GREP_OUTPUT_LIMIT) {
                truncated = true;
                out = out.slice(0, GREP_OUTPUT_LIMIT);
                proc.kill('SIGKILL');
            }
        });
        proc.stderr.on('data', (d) => (errOut += d));
        proc.on('close', (code) => {
            if (signal?.aborted)
                return reject(new ToolError/* ToolError */.v('grep: aborted'));
            if (truncated)
                return resolve(out + `\n[output truncated at ${GREP_OUTPUT_LIMIT} bytes]`);
            if (code === 0)
                return resolve(out);
            if (code === 1)
                return resolve('no matches');
            reject(new ToolError/* ToolError */.v(`grep: rg failed: ${errOut || `exit ${code}`}`));
        });
        proc.on('error', (e) => {
            if (signal?.aborted)
                return reject(new ToolError/* ToolError */.v('grep: aborted'));
            reject(new ToolError/* ToolError */.v(`grep: rg failed: ${e.message}`));
        });
    });
}
async function runWalkGrep(pattern, root, signal) {
    let re;
    try {
        re = new RegExp(pattern);
    }
    catch (e) {
        throw new ToolError/* ToolError */.v(`grep: invalid regex: ${e instanceof Error ? e.message : String(e)}`);
    }
    const hits = [];
    let budget = GREP_OUTPUT_LIMIT;
    const push = (line) => {
        budget -= line.length + 1;
        if (budget < 0) {
            hits.push(`[output truncated at ${GREP_OUTPUT_LIMIT} bytes]`);
            return false;
        }
        hits.push(line);
        return true;
    };
    const stat = await promises_.stat(root).catch(() => null);
    if (stat?.isFile()) {
        await grepFile(root, re, push);
    }
    else {
        await node_walk(root, '', (rel) => grepFile(external_node_path_.join(root, rel), re, push), signal);
    }
    if (signal?.aborted)
        throw new ToolError/* ToolError */.v('grep: aborted');
    if (hits.length === 0)
        return 'no matches';
    return hits.join('\n');
}
async function grepFile(file, re, push) {
    const stream = external_node_fs_.createReadStream(file, { encoding: 'utf8' });
    const rl = external_node_readline_.createInterface({ input: stream, crlfDelay: Infinity });
    let i = 0;
    try {
        for await (const line of rl) {
            i++;
            // Cap line length: `pattern` is model-supplied and JS regexes backtrack,
            // so a pathological pattern against a very long line is a ReDoS.
            if (line.length > GREP_MAX_LINE_LENGTH)
                continue;
            if (re.test(line) && !push(`${file}:${i}:${line}`))
                return false;
        }
    }
    catch {
        // unreadable / binary
    }
    finally {
        stream.destroy();
    }
    return true;
}
// ---- utils ---------------------------------------------------------------
const WALK_MAX_DEPTH = 40;
const WALK_MAX_ENTRIES = 50000;
/**
 * Bounded recursive walk. `fn` may return `false` to abort. Only real
 * directories are descended into and only real files are handed to `fn` —
 * symlinks (and devices/fifos/sockets) are skipped entirely so a symlink inside
 * the root cannot be followed out of it.
 */
async function node_walk(root, rel, fn, signal) {
    let remaining = WALK_MAX_ENTRIES;
    async function inner(rel, depth) {
        if (depth > WALK_MAX_DEPTH)
            return true;
        if (signal?.aborted)
            return false;
        let entries;
        try {
            entries = await promises_.readdir(external_node_path_.join(root, rel), { withFileTypes: true });
        }
        catch {
            return true;
        }
        for (const e of entries) {
            if (e.name === '.git' || e.name === 'node_modules')
                continue;
            if (remaining-- <= 0)
                return false;
            if (signal?.aborted)
                return false;
            const childRel = rel ? external_node_path_.join(rel, e.name) : e.name;
            if (e.isDirectory()) {
                if (!(await inner(childRel, depth + 1)))
                    return false;
            }
            else if (e.isFile()) {
                if ((await fn(childRel)) === false)
                    return false;
            }
            // Symlinks, devices, fifos and sockets are intentionally skipped.
        }
        return true;
    }
    await inner(rel, 0);
}
async function findRg() {
    const dirs = (process.env['PATH'] ?? '').split(external_node_path_.delimiter);
    for (const d of dirs) {
        const candidate = external_node_path_.join(d, 'rg');
        try {
            await promises_.access(candidate, external_node_fs_.constants.X_OK);
            return candidate;
        }
        catch {
            // not here
        }
    }
    return null;
}
//# sourceMappingURL=node.mjs.map

/***/ })

};
