export const id = 185;
export const ids = [185];
export const modules = {

/***/ 13185:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  BashSession: () => (/* binding */ BashSession),
  betaAgentToolset20260401: () => (/* binding */ betaAgentToolset20260401),
  betaBashTool: () => (/* binding */ betaBashTool),
  betaEditTool: () => (/* binding */ betaEditTool),
  betaGlobTool: () => (/* binding */ betaGlobTool),
  betaGrepTool: () => (/* binding */ betaGrepTool),
  betaReadTool: () => (/* binding */ betaReadTool),
  betaWriteTool: () => (/* binding */ betaWriteTool),
  extractSkillArchive: () => (/* reexport */ extractSkillArchive),
  resolvePath: () => (/* binding */ resolvePath),
  resolveSkillVersion: () => (/* reexport */ resolveSkillVersion),
  setupSkills: () => (/* reexport */ setupSkills)
});

// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.98.0_zod@4.4.3/node_modules/@anthropic-ai/sdk/internal/tslib.mjs
var tslib = __webpack_require__(95869);
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
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.98.0_zod@4.4.3/node_modules/@anthropic-ai/sdk/core/error.mjs
var error = __webpack_require__(72097);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.98.0_zod@4.4.3/node_modules/@anthropic-ai/sdk/lib/tools/ToolError.mjs
var ToolError = __webpack_require__(77041);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.98.0_zod@4.4.3/node_modules/@anthropic-ai/sdk/index.mjs + 75 modules
var sdk = __webpack_require__(36965);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.98.0_zod@4.4.3/node_modules/@anthropic-ai/sdk/internal/utils.mjs + 1 modules
var utils = __webpack_require__(6750);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.98.0_zod@4.4.3/node_modules/@anthropic-ai/sdk/lib/transform-json-schema.mjs

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
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.98.0_zod@4.4.3/node_modules/@anthropic-ai/sdk/helpers/beta/json-schema.mjs


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
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.98.0_zod@4.4.3/node_modules/@anthropic-ai/sdk/internal/utils/promise.mjs
var promise = __webpack_require__(79444);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.98.0_zod@4.4.3/node_modules/@anthropic-ai/sdk/tools/agent-toolset/fs-util.mjs
/**
 * Shared, Node-only filesystem helpers for the agent toolset's file tools:
 * path confinement (symlink-aware), an atomic write, and language-independent
 * error messages. Kept out of `node.ts` so the tool implementations stay focused
 * and these helpers can be reused by every file tool.
 */




/** Mode for directories the file tools create — not world-writable under a 0 umask. */
const DIR_CREATE_MODE = 0o755;
/** Mode for files the file tools create. */
const FILE_CREATE_MODE = 0o644;
/** `realpath` `p`, or return `p` unchanged when it cannot be resolved. */
async function realpathOrSelf(p) {
    try {
        return await promises_.realpath(p);
    }
    catch {
        return p;
    }
}
/**
 * Fully resolve `abs`: `realpath` the longest existing ancestor and re-append
 * the rest, but never re-append a component that is itself a symlink — read the
 * link and continue from its target instead. This handles paths being created
 * (write/edit) without letting a symlink leaf (e.g. a dangling one pointing
 * outside a confinement root) slip through unresolved.
 */
async function canonicalize(abs) {
    const tail = [];
    let prefix = abs;
    for (;;) {
        let real;
        try {
            real = await promises_.realpath(prefix);
        }
        catch {
            let isLink = false;
            try {
                isLink = (await promises_.lstat(prefix)).isSymbolicLink();
            }
            catch {
                /* prefix truly doesn't exist (ENOENT) — fall through and walk up */
            }
            if (isLink) {
                // Resolve the symlink ourselves and retry; `tail` (the part below it)
                // still applies to the link's target.
                prefix = external_node_path_.resolve(external_node_path_.dirname(prefix), await promises_.readlink(prefix));
                continue;
            }
            const parent = external_node_path_.dirname(prefix);
            if (parent === prefix)
                return abs; // walked past the FS root without a hit
            tail.push(external_node_path_.basename(prefix));
            prefix = parent;
            continue;
        }
        return tail.length ? external_node_path_.join(real, ...tail.reverse()) : real;
    }
}
/**
 * Resolve `p` and confine it to `root`.
 *
 * Unless `allowOutside` is set, absolute inputs are rejected and the
 * **canonical** path is returned — every symlink in `p` (including the leaf,
 * even a dangling one) is resolved before the confinement check, and the
 * resolved path is what the caller then operates on, so a symlink inside `root`
 * that points outside it can neither pass the check nor be followed afterwards.
 *
 * Residual TOCTOU: a component could still be swapped for a symlink between this
 * call and the eventual `fs` operation. Closing that fully needs per-component
 * `O_NOFOLLOW`/`openat`, which Node does not expose ergonomically; this is why a
 * sandbox is still recommended for the toolset as a whole.
 */
async function confineToRoot(root, p, opts) {
    const allowOutside = opts?.allowOutside ?? false;
    if (external_node_path_.isAbsolute(p)) {
        if (!allowOutside) {
            throw new ToolError/* ToolError */.v(`absolute path ${JSON.stringify(p)} not permitted`);
        }
        return external_node_path_.resolve(p);
    }
    const realRoot = await realpathOrSelf(external_node_path_.resolve(root));
    const abs = external_node_path_.resolve(realRoot, p);
    if (allowOutside)
        return abs;
    const real = await canonicalize(abs);
    const rootSep = realRoot.endsWith(external_node_path_.sep) ? realRoot : realRoot + external_node_path_.sep;
    if (real !== realRoot && !real.startsWith(rootSep)) {
        throw new ToolError/* ToolError */.v(`path ${JSON.stringify(p)} escapes workdir`);
    }
    return real;
}
/**
 * Atomically write `content` to `targetPath`: write a sibling temp file, fsync
 * it, then rename over the target. The rename is atomic on most filesystems, so
 * a crash mid-write never leaves the target half-written.
 */
async function atomicWriteFile(targetPath, content) {
    const dir = external_node_path_.dirname(targetPath);
    const tempPath = external_node_path_.join(dir, `.tmp-${process.pid}-${(0,external_node_crypto_.randomUUID)()}`);
    let handle;
    try {
        handle = await promises_.open(tempPath, 'wx', FILE_CREATE_MODE);
        await handle.writeFile(content, 'utf-8');
        await handle.sync();
        await handle.close();
        handle = undefined;
        await promises_.rename(tempPath, targetPath);
    }
    catch (err) {
        if (handle)
            await handle.close().catch(() => { });
        await promises_.unlink(tempPath).catch(() => { });
        throw err;
    }
}
/**
 * Map a thrown filesystem error to a consistent, language-independent message,
 * so the model sees the same wording regardless of the runtime (Node's raw
 * `ENOENT: no such file...` text would otherwise leak through). Falls back to
 * the raw error message for codes we don't special-case.
 */
function fsErrorMessage(err, file) {
    const code = err?.code;
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
            return `${file}: ${err instanceof Error ? err.message : String(err)}`;
    }
}
//# sourceMappingURL=fs-util.mjs.map
// EXTERNAL MODULE: external "node:util"
var external_node_util_ = __webpack_require__(57975);
// EXTERNAL MODULE: external "node:stream"
var external_node_stream_ = __webpack_require__(57075);
// EXTERNAL MODULE: external "node:stream/promises"
var external_node_stream_promises_ = __webpack_require__(46466);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.98.0_zod@4.4.3/node_modules/@anthropic-ai/sdk/internal/utils/log.mjs
var utils_log = __webpack_require__(32889);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.98.0_zod@4.4.3/node_modules/@anthropic-ai/sdk/tools/agent-toolset/skills.mjs
/**
 * Node-only skill plumbing for the agent toolset: downloading a session
 * agent's skills into the workdir and extracting the archives. Kept in its own
 * file because it is a distinct concern from the tool implementations in
 * `node.ts` — distinct enough, and large enough, to review on its own.
 */










const execFileAsync = (0,external_node_util_.promisify)(external_node_child_process_.execFile);
/**
 * Download the session agent's skills into `{ctx.workdir}/skills/<name>/`.
 *
 * No-op (returns a no-op cleanup) unless both `ctx.client` and `ctx.sessionId`
 * are set. Looks up the session's resolved agent and, for each skill, fetches
 * its files via `client.beta.skills.versions.download` and extracts the archive
 * (a zip or tar.* archive) into a directory named after the skill. A failure on
 * one skill is logged and does not block the others. Call this before starting
 * the session tool runner (e.g. right after the bash session / workdir is
 * ready).
 *
 * Returns a cleanup function that removes the skill directories this call
 * created — call it once the work item is done so downloaded skills do not
 * accumulate in the workdir across sessions.
 */
async function setupSkills(ctx) {
    const { client, sessionId } = ctx;
    if (!client || !sessionId)
        return async () => { };
    const log = (0,utils_log/* loggerFor */.WG)(client);
    const session = await client.beta.sessions.retrieve(sessionId);
    const skillsRoot = external_node_path_.resolve(ctx.workdir, 'skills');
    const created = [];
    for (const skill of session.agent.skills) {
        try {
            const versionId = await resolveSkillVersion(client, skill.skill_id, skill.version);
            const version = await client.beta.skills.versions.retrieve(versionId, { skill_id: skill.skill_id });
            // The directory is the skill's name, reduced to a single safe path
            // component so a hostile name can't escape `skillsRoot`.
            let dirname = external_node_path_.basename(version.name.trim());
            if (dirname === '' || dirname === '.' || dirname === '..')
                dirname = skill.skill_id;
            const dest = external_node_path_.resolve(skillsRoot, dirname);
            if (dest !== skillsRoot && !dest.startsWith(skillsRoot + external_node_path_.sep)) {
                log.warn('skill name escapes the skills dir; skipping', {
                    component: 'agent-tool-context',
                    name: version.name,
                });
                continue;
            }
            const resp = await client.beta.skills.versions.download(versionId, { skill_id: skill.skill_id });
            await promises_.rm(dest, { recursive: true, force: true });
            await promises_.mkdir(dest, { recursive: true, mode: DIR_CREATE_MODE });
            created.push(dest);
            await extractSkillArchive(resp, dest);
            log.info('downloaded skill', {
                component: 'agent-tool-context',
                skill_id: skill.skill_id,
                version: versionId,
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
            await promises_.rm(dest, { recursive: true, force: true }).catch((e) => {
                log.warn('failed to clean up skill', { component: 'agent-tool-context', dest, error: String(e) });
            });
        }
    };
}
/**
 * Resolve `version` to the concrete numeric timestamp the
 * `/v1/skills/{id}/versions/{version}` endpoints require — `session.agent.skills[].version`
 * can be an alias such as `"latest"`, which those endpoints reject. Numeric
 * versions pass through unchanged.
 */
async function resolveSkillVersion(client, skillId, version) {
    if (/^\d+$/.test(version))
        return version;
    let newest;
    for await (const v of client.beta.skills.versions.list(skillId)) {
        if (/^\d+$/.test(v.version) && (newest === undefined || BigInt(v.version) > BigInt(newest))) {
            newest = v.version;
        }
    }
    if (newest === undefined) {
        throw new error/* AnthropicError */.pJ(`skill ${JSON.stringify(skillId)} has no concrete version to resolve ${JSON.stringify(version)} against`);
    }
    return newest;
}
/** Reject archive members that are absolute or contain a `..` component. */
function assertSafeMemberNames(names) {
    for (const raw of names.split('\n')) {
        const entry = raw.trim();
        if (!entry)
            continue;
        if (external_node_path_.isAbsolute(entry) || entry.split(/[\\/]/).includes('..')) {
            throw new error/* AnthropicError */.pJ(`refusing to extract unsafe archive member: ${entry}`);
        }
    }
}
/**
 * Reject archives that contain anything other than regular files and
 * directories. The type char is the first byte of each `ls`-style line emitted
 * by `tar -tvf` / `unzip -Z`: `-` file, `d` dir, `l` symlink, `h` hardlink,
 * `b`/`c` device, `p` fifo, `s` socket. A symlink/hardlink member is how an
 * archive escapes its extraction dir even when no name contains `..`.
 */
function assertNoSpecialMembers(verboseListing) {
    for (const line of verboseListing.split('\n')) {
        const type = line.trimStart()[0];
        if (type === 'l' || type === 'h' || type === 'b' || type === 'c' || type === 'p' || type === 's') {
            throw new error/* AnthropicError */.pJ('refusing to extract archive with symlink/hardlink/device member');
        }
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
        if (e != null && typeof e === 'object' && e.code === 'ENOENT') {
            throw new error/* AnthropicError */.pJ(`skill extraction requires the \`${cmd}\` command, but it was not found on PATH`);
        }
        throw e;
    }
}
/**
 * The single top-level directory shared by every entry in a newline-separated
 * archive listing, or `''` if entries don't all live under one common
 * directory. Skill bundles are packaged wrapped in one directory named after
 * the skill (e.g. `pdf/SKILL.md`, `pdf/scripts/...`); the extractor strips it
 * so contents land directly in the skill's dir instead of a redundant nested
 * `<skill>/<skill>/` level. A flat or multi-root archive yields `''`.
 */
function archiveTopDir(listing) {
    let top;
    let nested = false;
    for (const raw of listing.split('\n')) {
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
 * any member that would escape `dest` (zip-slip / tar-slip), including
 * symlink/hardlink members: skill archives come from the API, but skills can be
 * third-party.
 *
 * The skill bundle's single wrapper directory is stripped: the archive is
 * extracted into a staging dir and the wrapper's contents are promoted into
 * `dest`, so files land at `dest/SKILL.md` rather than a doubled
 * `dest/<skill>/SKILL.md` (`unzip` has no `--strip-components`, so this is
 * done uniformly by staging + promote rather than per-tool flags).
 */
async function extractSkillArchive(resp, dest) {
    const tmp = external_node_path_.join(dest, `.skill-archive-${process.pid}-${Date.now()}`);
    if (!resp.body) {
        throw new error/* AnthropicError */.pJ('skill download response had no body');
    }
    await (0,external_node_stream_promises_.pipeline)(external_node_stream_.Readable.fromWeb(resp.body), external_node_fs_.createWriteStream(tmp));
    const stage = external_node_path_.join(external_node_path_.dirname(dest), `.skill-stage-${process.pid}-${Date.now()}`);
    try {
        // Sniff the first bytes: zip archives start with "PK\x03\x04"; treat
        // anything else as a tar.* archive (`tar -xf` autodetects gzip/bzip2/xz).
        const head = await readHead(tmp, 4);
        const isZip = head.length >= 4 && head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
        const archiveCmd = isZip ? 'unzip' : 'tar';
        // List first, validate, then extract — `tar`/`unzip` will happily write a
        // `../` member (or follow a symlink member) outside `-C`/`-d` otherwise.
        const listing = await runArchiveTool(archiveCmd, isZip ? ['-Z1', tmp] : ['-tf', tmp]);
        assertSafeMemberNames(listing);
        assertNoSpecialMembers(await runArchiveTool(archiveCmd, isZip ? ['-Z', tmp] : ['-tvf', tmp]));
        const top = archiveTopDir(listing);
        await promises_.mkdir(stage, { recursive: true, mode: DIR_CREATE_MODE });
        await runArchiveTool(archiveCmd, isZip ? ['-oq', tmp, '-d', stage] : ['-xf', tmp, '-C', stage]);
        // Promote the wrapper's contents (or the staged tree itself, if the
        // archive wasn't wrapped) into the already-created empty `dest`. `stage`
        // is a sibling of `dest`, so each rename stays on one filesystem.
        const srcRoot = top ? external_node_path_.join(stage, top) : stage;
        for (const entry of await promises_.readdir(srcRoot)) {
            await promises_.rename(external_node_path_.join(srcRoot, entry), external_node_path_.join(dest, entry));
        }
    }
    finally {
        await promises_.rm(tmp, { force: true });
        await promises_.rm(stage, { recursive: true, force: true });
    }
}
/** Read the first `n` bytes of `file`. */
async function readHead(file, n) {
    const handle = await promises_.open(file, 'r');
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
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.98.0_zod@4.4.3/node_modules/@anthropic-ai/sdk/tools/agent-toolset/node.mjs
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
 * Trust model: the file tools confine to `workdir` (symlink-aware) and are safe
 * without a sandbox; `bash` is unrestricted and should run inside one. See
 * {@link AgentToolContext}.
 */
var _BashSession_instances, _BashSession_proc, _BashSession_buf, _BashSession_truncated, _BashSession_closed, _BashSession_waiting, _BashSession_append;













const BASH_OUTPUT_LIMIT = 100 * 1024;
const BASH_DEFAULT_TIMEOUT_MS = 120000;
const READ_MAX_BYTES = 256 * 1024;
// `edit` reads the whole file before rewriting it, so it carries the same
// OOM/FIFO exposure as `read`. Kept as a symmetric alias for now; the cap value
// (and reject-vs-truncate behaviour) is intentionally a separate knob pending
// validation with the CMA team.
const EDIT_MAX_BYTES = READ_MAX_BYTES;
const GREP_OUTPUT_LIMIT = 100 * 1024;
const GREP_MAX_LINE_LENGTH = 2000;
const GLOB_RESULT_LIMIT = 200;
const ANSI_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
const fsGlob = promises_.glob;
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
 * Resolve `p` relative to `ctx.workdir`. Unless `unrestrictedPaths` is set,
 * absolute inputs are rejected and the **canonical** path is returned — every
 * symlink in `p` (including the leaf, even a dangling one) is resolved before
 * the workdir check, and the resolved path is what the tool then operates on, so
 * a symlink inside the workdir that points outside it can neither pass the check
 * nor be followed afterwards. See the trust model on {@link AgentToolContext}.
 *
 * Residual TOCTOU: a component could still be swapped for a symlink between this
 * call and the eventual `fs` operation. Closing that fully needs per-component
 * `O_NOFOLLOW`/`openat`, which Node does not expose ergonomically; the same
 * residual exposure exists in `tools/memory/node` and is why a sandbox is still
 * recommended for the toolset as a whole.
 */
function resolvePath(ctx, p) {
    return confineToRoot(ctx.workdir, p, { allowOutside: ctx.unrestrictedPaths ?? false });
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
        if (signal?.aborted) {
            throw new error/* AnthropicError */.pJ('bash command aborted');
        }
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
                        timer = setTimeout(() => reject(new error/* AnthropicError */.pJ(`bash command timed out after ${timeoutMs}ms`)), timeoutMs);
                    }),
                    new Promise((_, reject) => {
                        if (!signal)
                            return;
                        onAbort = () => reject(new error/* AnthropicError */.pJ('bash command aborted'));
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
            let data;
            try {
                // stat() before any open(): the size cap stops a multi-GB file from
                // OOM'ing the runner, and isFile() rejects FIFOs/devices/dirs without
                // opening them (open() on an unconnected FIFO blocks indefinitely).
                const st = await promises_.stat(abs);
                if (!st.isFile()) {
                    throw new ToolError/* ToolError */.v(`read: ${file_path} is not a regular file`);
                }
                if (st.size > READ_MAX_BYTES) {
                    throw new ToolError/* ToolError */.v(`read: ${file_path} is ${st.size} bytes, exceeds ${READ_MAX_BYTES}-byte limit. ` +
                        'Use bash (head/tail/sed) to read a slice.');
                }
                data = await promises_.readFile(abs, 'utf8');
            }
            catch (e) {
                if (e instanceof ToolError/* ToolError */.v)
                    throw e;
                throw new ToolError/* ToolError */.v(`read: ${fsErrorMessage(e, file_path)}`);
            }
            if (!view_range)
                return data;
            if (view_range.length !== 2)
                throw new ToolError/* ToolError */.v('read: view_range must be [start_line, end_line]');
            const [startLine, endLine] = view_range;
            const lines = data.split('\n');
            const start = Math.max(0, startLine - 1);
            const end = endLine > 0 ? endLine : lines.length;
            return lines.slice(start, end).join('\n');
        },
    });
}
function betaWriteTool(ctx) {
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
                if (st.size > EDIT_MAX_BYTES) {
                    throw new ToolError/* ToolError */.v(`edit: ${file_path} is ${st.size} bytes, exceeds ${EDIT_MAX_BYTES}-byte limit. ` +
                        'Use bash (sed/awk) to edit a large file.');
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
function betaGlobTool(ctx) {
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
            let root = external_node_path_.resolve(ctx.workdir);
            let pat = pattern;
            if (external_node_path_.isAbsolute(pattern)) {
                if (!ctx.unrestrictedPaths)
                    throw new ToolError/* ToolError */.v('glob: absolute pattern not permitted');
                root = external_node_path_.parse(pattern).root;
                pat = external_node_path_.relative(root, pattern);
            }
            else if (searchPath) {
                root = await resolvePath(ctx, searchPath);
            }
            // A `..` in the *pattern itself* (e.g. `../../*`) walks `fs.glob` out of
            // the search root — this is separate from the `searchPath` confinement
            // above, which only covers the path argument. Reject it outright when the
            // toolset is confined.
            if (!ctx.unrestrictedPaths && pat.split(/[\\/]/).includes('..')) {
                throw new ToolError/* ToolError */.v('glob: ".." is not permitted in the pattern');
            }
            const matches = [];
            try {
                // Native `fs.glob` (Node 22+). `exclude` prunes the noisy dirs the
                // legacy walker skipped; only regular files are collected.
                for await (const entry of fsGlob(pat, {
                    cwd: root,
                    withFileTypes: true,
                    exclude: (d) => d.name === '.git' || d.name === 'node_modules',
                })) {
                    if (!entry.isFile())
                        continue;
                    const full = external_node_path_.join(entry.parentPath, entry.name);
                    // Defense in depth: drop any match that resolved outside the search
                    // root (e.g. via a symlinked directory in the tree) when confined.
                    if (!ctx.unrestrictedPaths && !isWithin(root, full))
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
        await walk(root, '', (rel) => grepFile(external_node_path_.join(root, rel), re, push), signal);
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
/** True when `p` is `root` itself or lexically contained within it. */
function isWithin(root, p) {
    const rel = external_node_path_.relative(root, p);
    return rel === '' || (!rel.startsWith('..' + external_node_path_.sep) && rel !== '..' && !external_node_path_.isAbsolute(rel));
}
const WALK_MAX_DEPTH = 40;
const WALK_MAX_ENTRIES = 50000;
/**
 * Bounded recursive walk. `fn` may return `false` to abort. Only real
 * directories are descended into and only real files are handed to `fn` —
 * symlinks (and devices/fifos/sockets) are skipped entirely so a symlink inside
 * the root cannot be followed out of it.
 */
async function walk(root, rel, fn, signal) {
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
