export const id = 600;
export const ids = [600];
export const modules = {

/***/ 69138:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Allow = exports.MalformedJSON = exports.PartialJSON = exports.parseJSON = exports.parse = void 0;
const options_1 = __webpack_require__(99708);
Object.defineProperty(exports, "Allow", ({ enumerable: true, get: function () { return options_1.Allow; } }));
__exportStar(__webpack_require__(99708), exports);
class PartialJSON extends Error {
}
exports.PartialJSON = PartialJSON;
class MalformedJSON extends Error {
}
exports.MalformedJSON = MalformedJSON;
/**
 * Parse incomplete JSON
 * @param {string} jsonString Partial JSON to be parsed
 * @param {number} allowPartial Specify what types are allowed to be partial, see {@link Allow} for details
 * @returns The parsed JSON
 * @throws {PartialJSON} If the JSON is incomplete (related to the `allow` parameter)
 * @throws {MalformedJSON} If the JSON is malformed
 */
function parseJSON(jsonString, allowPartial = options_1.Allow.ALL) {
    if (typeof jsonString !== "string") {
        throw new TypeError(`expecting str, got ${typeof jsonString}`);
    }
    if (!jsonString.trim()) {
        throw new Error(`${jsonString} is empty`);
    }
    return _parseJSON(jsonString.trim(), allowPartial);
}
exports.parseJSON = parseJSON;
;
const _parseJSON = (jsonString, allow) => {
    const length = jsonString.length;
    let index = 0;
    const markPartialJSON = (msg) => {
        throw new PartialJSON(`${msg} at position ${index}`);
    };
    const throwMalformedError = (msg) => {
        throw new MalformedJSON(`${msg} at position ${index}`);
    };
    const parseAny = () => {
        skipBlank();
        if (index >= length)
            markPartialJSON("Unexpected end of input");
        if (jsonString[index] === '"')
            return parseStr();
        if (jsonString[index] === "{")
            return parseObj();
        if (jsonString[index] === "[")
            return parseArr();
        if (jsonString.substring(index, index + 4) === "null" || (options_1.Allow.NULL & allow && length - index < 4 && "null".startsWith(jsonString.substring(index)))) {
            index += 4;
            return null;
        }
        if (jsonString.substring(index, index + 4) === "true" || (options_1.Allow.BOOL & allow && length - index < 4 && "true".startsWith(jsonString.substring(index)))) {
            index += 4;
            return true;
        }
        if (jsonString.substring(index, index + 5) === "false" || (options_1.Allow.BOOL & allow && length - index < 5 && "false".startsWith(jsonString.substring(index)))) {
            index += 5;
            return false;
        }
        if (jsonString.substring(index, index + 8) === "Infinity" || (options_1.Allow.INFINITY & allow && length - index < 8 && "Infinity".startsWith(jsonString.substring(index)))) {
            index += 8;
            return Infinity;
        }
        if (jsonString.substring(index, index + 9) === "-Infinity" || (options_1.Allow._INFINITY & allow && 1 < length - index && length - index < 9 && "-Infinity".startsWith(jsonString.substring(index)))) {
            index += 9;
            return -Infinity;
        }
        if (jsonString.substring(index, index + 3) === "NaN" || (options_1.Allow.NAN & allow && length - index < 3 && "NaN".startsWith(jsonString.substring(index)))) {
            index += 3;
            return NaN;
        }
        return parseNum();
    };
    const parseStr = () => {
        const start = index;
        let escape = false;
        index++; // skip initial quote
        while (index < length && (jsonString[index] !== '"' || (escape && jsonString[index - 1] === "\\"))) {
            escape = jsonString[index] === "\\" ? !escape : false;
            index++;
        }
        if (jsonString.charAt(index) == '"') {
            try {
                return JSON.parse(jsonString.substring(start, ++index - Number(escape)));
            }
            catch (e) {
                throwMalformedError(String(e));
            }
        }
        else if (options_1.Allow.STR & allow) {
            try {
                return JSON.parse(jsonString.substring(start, index - Number(escape)) + '"');
            }
            catch (e) {
                // SyntaxError: Invalid escape sequence
                return JSON.parse(jsonString.substring(start, jsonString.lastIndexOf("\\")) + '"');
            }
        }
        markPartialJSON("Unterminated string literal");
    };
    const parseObj = () => {
        index++; // skip initial brace
        skipBlank();
        const obj = {};
        try {
            while (jsonString[index] !== "}") {
                skipBlank();
                if (index >= length && options_1.Allow.OBJ & allow)
                    return obj;
                const key = parseStr();
                skipBlank();
                index++; // skip colon
                try {
                    const value = parseAny();
                    obj[key] = value;
                }
                catch (e) {
                    if (options_1.Allow.OBJ & allow)
                        return obj;
                    else
                        throw e;
                }
                skipBlank();
                if (jsonString[index] === ",")
                    index++; // skip comma
            }
        }
        catch (e) {
            if (options_1.Allow.OBJ & allow)
                return obj;
            else
                markPartialJSON("Expected '}' at end of object");
        }
        index++; // skip final brace
        return obj;
    };
    const parseArr = () => {
        index++; // skip initial bracket
        const arr = [];
        try {
            while (jsonString[index] !== "]") {
                arr.push(parseAny());
                skipBlank();
                if (jsonString[index] === ",") {
                    index++; // skip comma
                }
            }
        }
        catch (e) {
            if (options_1.Allow.ARR & allow) {
                return arr;
            }
            markPartialJSON("Expected ']' at end of array");
        }
        index++; // skip final bracket
        return arr;
    };
    const parseNum = () => {
        if (index === 0) {
            if (jsonString === "-")
                throwMalformedError("Not sure what '-' is");
            try {
                return JSON.parse(jsonString);
            }
            catch (e) {
                if (options_1.Allow.NUM & allow)
                    try {
                        return JSON.parse(jsonString.substring(0, jsonString.lastIndexOf("e")));
                    }
                    catch (e) { }
                throwMalformedError(String(e));
            }
        }
        const start = index;
        if (jsonString[index] === "-")
            index++;
        while (jsonString[index] && ",]}".indexOf(jsonString[index]) === -1)
            index++;
        if (index == length && !(options_1.Allow.NUM & allow))
            markPartialJSON("Unterminated number literal");
        try {
            return JSON.parse(jsonString.substring(start, index));
        }
        catch (e) {
            if (jsonString.substring(start, index) === "-")
                markPartialJSON("Not sure what '-' is");
            try {
                return JSON.parse(jsonString.substring(start, jsonString.lastIndexOf("e")));
            }
            catch (e) {
                throwMalformedError(String(e));
            }
        }
    };
    const skipBlank = () => {
        while (index < length && " \n\r\t".includes(jsonString[index])) {
            index++;
        }
    };
    return parseAny();
};
const parse = parseJSON;
exports.parse = parse;


/***/ }),

/***/ 99708:
/***/ ((__unused_webpack_module, exports) => {


/**
 * Sometimes you don't allow every type to be partially parsed.
 * For example, you may not want a partial number because it may increase its size gradually before it's complete.
 * In this case, you can use the `Allow` object to control what types you allow to be partially parsed.
 * @module
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Allow = exports.ALL = exports.COLLECTION = exports.ATOM = exports.SPECIAL = exports.INF = exports._INFINITY = exports.INFINITY = exports.NAN = exports.BOOL = exports.NULL = exports.OBJ = exports.ARR = exports.NUM = exports.STR = void 0;
/**
 * allow partial strings like `"hello \u12` to be parsed as `"hello "`
 */
exports.STR = 0b000000001;
/**
 * allow partial numbers like `123.` to be parsed as `123`
 */
exports.NUM = 0b000000010;
/**
 * allow partial arrays like `[1, 2,` to be parsed as `[1, 2]`
 */
exports.ARR = 0b000000100;
/**
 * allow partial objects like `{"a": 1, "b":` to be parsed as `{"a": 1}`
 */
exports.OBJ = 0b000001000;
/**
 * allow `nu` to be parsed as `null`
 */
exports.NULL = 0b000010000;
/**
 * allow `tr` to be parsed as `true`, and `fa` to be parsed as `false`
 */
exports.BOOL = 0b000100000;
/**
 * allow `Na` to be parsed as `NaN`
 */
exports.NAN = 0b001000000;
/**
 * allow `Inf` to be parsed as `Infinity`
 */
exports.INFINITY = 0b010000000;
/**
 * allow `-Inf` to be parsed as `-Infinity`
 */
exports._INFINITY = 0b100000000;
exports.INF = exports.INFINITY | exports._INFINITY;
exports.SPECIAL = exports.NULL | exports.BOOL | exports.INF | exports.NAN;
exports.ATOM = exports.STR | exports.NUM | exports.SPECIAL;
exports.COLLECTION = exports.ARR | exports.OBJ;
exports.ALL = exports.ATOM | exports.COLLECTION;
/**
 * Control what types you allow to be partially parsed.
 * The default is to allow all types to be partially parsed, which in most casees is the best option.
 * @example
 * If you don't want to allow partial objects, you can use the following code:
 * ```ts
 * import { Allow, parse } from "partial-json";
 * parse(`[{"a": 1, "b": 2}, {"a": 3,`, Allow.ARR); // [ { a: 1, b: 2 } ]
 * ```
 * Or you can use `~` to disallow a type:
 * ```ts
 * parse(`[{"a": 1, "b": 2}, {"a": 3,`, ~Allow.OBJ); // [ { a: 1, b: 2 } ]
 * ```
 * @example
 * If you don't want to allow partial strings, you can use the following code:
 * ```ts
 * import { Allow, parse } from "partial-json";
 * parse(`["complete string", "incompl`, ~Allow.STR); // [ 'complete string' ]
 * ```
 */
exports.Allow = { STR: exports.STR, NUM: exports.NUM, ARR: exports.ARR, OBJ: exports.OBJ, NULL: exports.NULL, BOOL: exports.BOOL, NAN: exports.NAN, INFINITY: exports.INFINITY, _INFINITY: exports._INFINITY, INF: exports.INF, SPECIAL: exports.SPECIAL, ATOM: exports.ATOM, COLLECTION: exports.COLLECTION, ALL: exports.ALL };
exports["default"] = exports.Allow;


/***/ }),

/***/ 55787:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   w: () => (/* binding */ defaultProviderAuthContext)
/* harmony export */ });
var __rewriteRelativeImportExtension = (undefined && undefined.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
// Variable specifier so browser bundlers do not try to resolve node builtins.
const importNodeModule = (specifier) => __webpack_require__(25092)(__rewriteRelativeImportExtension(specifier));
function getProcessEnv() {
    const proc = globalThis.process;
    return proc?.env;
}
/**
 * Default auth context: env vars from `process.env` (undefined in browsers),
 * file existence via node:fs (always false in browsers).
 */
function defaultProviderAuthContext() {
    return {
        async env(name) {
            const value = getProcessEnv()?.[name];
            return typeof value === "string" && value.trim().length > 0 ? value : undefined;
        },
        async fileExists(path) {
            try {
                const fs = (await importNodeModule("node:fs/promises"));
                let resolved = path;
                if (resolved.startsWith("~")) {
                    const os = (await importNodeModule("node:os"));
                    resolved = os.homedir() + resolved.slice(1);
                }
                await fs.access(resolved);
                return true;
            }
            catch {
                return false;
            }
        },
    };
}
//# sourceMappingURL=context.js.map

/***/ }),

/***/ 48031:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   f: () => (/* binding */ InMemoryCredentialStore)
/* harmony export */ });
/* harmony import */ var _utils_abort_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(16245);

/**
 * Default in-memory credential store. Apps inject persistent stores.
 * Keyed by `Provider.id`, one credential per provider; see `CredentialStore`.
 * Writes are serialized per provider through a promise chain.
 */
class InMemoryCredentialStore {
    credentials = new Map();
    chains = new Map();
    /** Serialize tasks per provider id without releasing the chain before active work settles. */
    enqueue(providerId, task, options) {
        const signal = (0,_utils_abort_js__WEBPACK_IMPORTED_MODULE_0__/* .operationSignal */ .O)(options?.signal);
        const previous = this.chains.get(providerId) ?? Promise.resolve();
        const queued = (async () => {
            await previous.catch(() => { });
            signal.throwIfAborted();
            return task();
        })();
        const tail = queued.catch(() => { });
        this.chains.set(providerId, tail);
        void tail.then(() => {
            if (this.chains.get(providerId) === tail)
                this.chains.delete(providerId);
        });
        return (0,_utils_abort_js__WEBPACK_IMPORTED_MODULE_0__/* .raceWithAbortSignal */ .g)(queued, signal);
    }
    async read(providerId, options) {
        options?.signal?.throwIfAborted();
        return this.credentials.get(providerId);
    }
    async list(options) {
        options?.signal?.throwIfAborted();
        return [...this.credentials].map(([providerId, credential]) => ({ providerId, type: credential.type }));
    }
    modify(providerId, fn, options) {
        return this.enqueue(providerId, async () => {
            const current = this.credentials.get(providerId);
            const next = await fn(current);
            options?.signal?.throwIfAborted();
            if (next !== undefined)
                this.credentials.set(providerId, next);
            return next ?? current;
        }, options);
    }
    delete(providerId, options) {
        return this.enqueue(providerId, async () => {
            this.credentials.delete(providerId);
        }, options);
    }
}
//# sourceMappingURL=credential-store.js.map

/***/ }),

/***/ 22128:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   O: () => (/* binding */ resolveProviderAuth),
/* harmony export */   t: () => (/* binding */ ModelsError)
/* harmony export */ });
/* harmony import */ var _utils_abort_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(16245);
/* harmony import */ var _utils_diagnostics_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(53475);


class ModelsError extends Error {
    code;
    constructor(code, message, options) {
        super(withCauseDetail(message, options?.cause), options);
        this.name = "ModelsError";
        this.code = code;
    }
}
/** Callers surface `error.message` only, so keep the underlying reason in it. */
function withCauseDetail(message, cause) {
    if (cause === undefined || cause === null)
        return message;
    const detail = (0,_utils_diagnostics_js__WEBPACK_IMPORTED_MODULE_0__/* .formatThrownValue */ .Fu)(cause).trim();
    if (!detail || message.includes(detail))
        return message;
    return `${message}: ${detail}`;
}
/**
 * Auth resolution shared by the `Models` and `ImagesModels` collections.
 * A stored credential owns the provider: ambient/env is consulted only when
 * nothing is stored. No silent env fallback after a failed refresh or for a
 * credential type without a matching handler.
 */
function resolveProviderAuth(provider, credentials, authContext, overrides) {
    const signal = (0,_utils_abort_js__WEBPACK_IMPORTED_MODULE_1__/* .operationSignal */ .O)(overrides?.signal);
    return (0,_utils_abort_js__WEBPACK_IMPORTED_MODULE_1__/* .raceWithAbortSignal */ .g)(resolveProviderAuthWithSignal(provider, credentials, authContext, overrides, signal), signal);
}
async function resolveProviderAuthWithSignal(provider, credentials, authContext, overrides, signal) {
    signal.throwIfAborted();
    const requestAuthContext = overrides?.env ? overlayEnvAuthContext(authContext, overrides.env) : authContext;
    if (overrides?.apiKey !== undefined && provider.auth.apiKey) {
        return resolveApiKey(requestAuthContext, provider.auth.apiKey, provider.id, {
            type: "api_key",
            key: overrides.apiKey,
            env: overrides.env,
        }, signal);
    }
    const stored = await readCredential(credentials, provider.id, signal);
    if (stored) {
        if (stored.type === "oauth" && provider.auth.oauth) {
            return resolveStoredOAuth(credentials, provider.id, provider.auth.oauth, stored, signal, overrides?.minOAuthValidityMs);
        }
        if (stored.type === "api_key" && provider.auth.apiKey) {
            const credential = overrides?.env ? { ...stored, env: { ...stored.env, ...overrides.env } } : stored;
            return resolveApiKey(requestAuthContext, provider.auth.apiKey, provider.id, credential, signal);
        }
        return undefined;
    }
    // Ambient (env vars, AWS profiles, ADC files).
    return provider.auth.apiKey
        ? resolveApiKey(requestAuthContext, provider.auth.apiKey, provider.id, undefined, signal)
        : undefined;
}
function overlayEnvAuthContext(base, env) {
    return {
        env: async (name) => env[name] || (await base.env(name)),
        fileExists: (path) => base.fileExists(path),
    };
}
const DEFAULT_OAUTH_MINIMUM_VALIDITY_MS = 5 * 60 * 1000;
const DEFAULT_OAUTH_REFRESH_TIMEOUT_MS = 15_000;
/**
 * OAuth resolution with double-checked locking: tokens with less than five
 * minutes remaining lock, re-check expiry under the lock, refresh once
 * globally, and persist the rotated credential before release.
 */
async function resolveStoredOAuth(credentials, providerId, oauth, stored, signal, minOAuthValidityMs) {
    const minimumValidityMs = Math.max(DEFAULT_OAUTH_MINIMUM_VALIDITY_MS, minOAuthValidityMs ?? 0);
    const expiresSoon = (credential) => Date.now() + minimumValidityMs >= credential.expires;
    let credential = stored;
    if (expiresSoon(credential)) {
        // Optimistic check said expired; the authoritative check runs under the lock.
        let post;
        try {
            post = await credentials.modify(providerId, async (current) => {
                if (current?.type !== "oauth")
                    return undefined; // logged out meanwhile
                if (!expiresSoon(current))
                    return undefined; // another process/request refreshed
                try {
                    const refreshSignal = AbortSignal.any([
                        signal,
                        AbortSignal.timeout(DEFAULT_OAUTH_REFRESH_TIMEOUT_MS),
                    ]);
                    return await oauth.refresh(current, refreshSignal);
                }
                catch (error) {
                    throw new ModelsError("oauth", `OAuth refresh failed for ${providerId}`, { cause: error });
                }
            }, { signal });
        }
        catch (error) {
            if (error instanceof ModelsError)
                throw error;
            throw new ModelsError("auth", `Credential store modify failed for ${providerId}`, { cause: error });
        }
        if (post?.type !== "oauth")
            return undefined; // logged out meanwhile
        credential = post;
        // The normal five-minute window triggers a refresh but does not impose a
        // provider contract. Explicit callers (such as bearer-token export) do
        // require the requested minimum after the refresh.
        if (minOAuthValidityMs !== undefined && expiresSoon(credential)) {
            throw new ModelsError("oauth", `OAuth refresh returned a token that expires too soon for ${providerId}`);
        }
    }
    try {
        return { auth: await oauth.toAuth(credential), source: "OAuth" };
    }
    catch (error) {
        throw new ModelsError("oauth", `OAuth auth derivation failed for ${providerId}`, { cause: error });
    }
}
async function resolveApiKey(authContext, apiKey, providerId, credential, signal) {
    try {
        return await apiKey.resolve({ ctx: authContext, credential, signal });
    }
    catch (error) {
        throw new ModelsError("auth", `API key auth failed for provider ${providerId}`, { cause: error });
    }
}
async function readCredential(credentials, providerId, signal) {
    try {
        return await credentials.read(providerId, { signal });
    }
    catch (error) {
        throw new ModelsError("auth", `Credential store read failed for ${providerId}`, { cause: error });
    }
}
//# sourceMappingURL=resolve.js.map

/***/ }),

/***/ 42843:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   E: () => (/* binding */ InMemoryModelsStore)
/* harmony export */ });
class InMemoryModelsStore {
    entries = new Map();
    async read(providerId, options) {
        options?.signal?.throwIfAborted();
        const entry = this.entries.get(providerId);
        return entry ? structuredClone(entry) : undefined;
    }
    async write(providerId, entry, options) {
        options?.signal?.throwIfAborted();
        this.entries.set(providerId, structuredClone(entry));
    }
    async delete(providerId, options) {
        options?.signal?.throwIfAborted();
        this.entries.delete(providerId);
    }
}
//# sourceMappingURL=models-store.js.map

/***/ }),

/***/ 15403:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Kt: () => (/* binding */ clampThinkingLevel),
/* harmony export */   Qd: () => (/* binding */ createProvider),
/* harmony export */   V2: () => (/* binding */ hasApi),
/* harmony export */   W8: () => (/* binding */ getSupportedThinkingLevels),
/* harmony export */   XC: () => (/* binding */ createModels),
/* harmony export */   lq: () => (/* binding */ modelsAreEqual),
/* harmony export */   tz: () => (/* reexport safe */ _auth_resolve_js__WEBPACK_IMPORTED_MODULE_0__.t),
/* harmony export */   yN: () => (/* binding */ calculateCost)
/* harmony export */ });
/* harmony import */ var _api_lazy_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(81826);
/* harmony import */ var _auth_context_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(55787);
/* harmony import */ var _auth_credential_store_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(48031);
/* harmony import */ var _auth_resolve_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(22128);
/* harmony import */ var _models_store_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(42843);
/* harmony import */ var _utils_abort_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(16245);







function mergeHeaders(base, override) {
    if (!base && !override)
        return undefined;
    const merged = { ...base };
    for (const [name, value] of Object.entries(override ?? {})) {
        const lowerName = name.toLowerCase();
        for (const existingName of Object.keys(merged)) {
            if (existingName.toLowerCase() === lowerName)
                delete merged[existingName];
        }
        merged[name] = value;
    }
    return merged;
}
class ModelsImpl {
    providers = new Map();
    credentials;
    modelsStore;
    authContext;
    refreshGenerations = new Map();
    refreshControllers = new Map();
    publicationChains = new Map();
    constructor(options) {
        this.credentials = options?.credentials ?? new _auth_credential_store_js__WEBPACK_IMPORTED_MODULE_1__/* .InMemoryCredentialStore */ .f();
        this.modelsStore = options?.modelsStore ?? new _models_store_js__WEBPACK_IMPORTED_MODULE_2__/* .InMemoryModelsStore */ .E();
        this.authContext = options?.authContext ?? (0,_auth_context_js__WEBPACK_IMPORTED_MODULE_3__/* .defaultProviderAuthContext */ .w)();
    }
    setProvider(provider) {
        this.supersedeProviderRefresh(provider.id);
        this.providers.set(provider.id, provider);
    }
    deleteProvider(id) {
        this.supersedeProviderRefresh(id);
        this.providers.delete(id);
    }
    clearProviders() {
        for (const id of new Set([...this.providers.keys(), ...this.refreshControllers.keys()])) {
            this.supersedeProviderRefresh(id);
        }
        this.providers.clear();
    }
    getProviders() {
        return Array.from(this.providers.values());
    }
    getProvider(id) {
        return this.providers.get(id);
    }
    getModels(provider) {
        if (provider !== undefined) {
            const entry = this.providers.get(provider);
            if (!entry)
                return [];
            try {
                return entry.getModels();
            }
            catch {
                return [];
            }
        }
        const models = [];
        for (const entry of this.providers.values()) {
            try {
                models.push(...entry.getModels());
            }
            catch {
                // Best-effort: ill-behaved providers yield no models.
            }
        }
        return models;
    }
    getModel(provider, id) {
        return this.getModels(provider).find((model) => model.id === id);
    }
    supersedeProviderRefresh(providerId) {
        const generation = (this.refreshGenerations.get(providerId) ?? 0) + 1;
        this.refreshGenerations.set(providerId, generation);
        const previous = this.refreshControllers.get(providerId);
        if (previous) {
            this.refreshControllers.delete(providerId);
            previous.abort();
        }
        return generation;
    }
    beginProviderRefresh(providerId) {
        const generation = this.supersedeProviderRefresh(providerId);
        const controller = new AbortController();
        this.refreshControllers.set(providerId, controller);
        return { generation, controller };
    }
    publishProviderModels(providerId, generation, signal, publication) {
        const previous = this.publicationChains.get(providerId) ?? Promise.resolve();
        const queued = (async () => {
            await previous.catch(() => { });
            if (signal.aborted || this.refreshGenerations.get(providerId) !== generation)
                return false;
            if (publication.persist === null) {
                await this.modelsStore.delete(providerId, { signal });
            }
            else if (publication.persist !== undefined) {
                await this.modelsStore.write(providerId, structuredClone(publication.persist), { signal });
            }
            if (signal.aborted || this.refreshGenerations.get(providerId) !== generation)
                return false;
            publication.update?.();
            return true;
        })();
        const tail = queued.catch(() => { });
        this.publicationChains.set(providerId, tail);
        void tail.then(() => {
            if (this.publicationChains.get(providerId) === tail)
                this.publicationChains.delete(providerId);
        });
        return (0,_utils_abort_js__WEBPACK_IMPORTED_MODULE_4__/* .raceWithAbortSignal */ .g)(queued, signal);
    }
    async runProviderRefreshPhase(provider, credential, allowNetwork, force, generation, signal) {
        const stored = await this.modelsStore.read(provider.id, { signal });
        await provider.refreshModels({
            credential,
            stored: stored ? structuredClone(stored) : undefined,
            publish: (publication) => this.publishProviderModels(provider.id, generation, signal, publication),
            allowNetwork,
            force: allowNetwork ? force : undefined,
            signal,
        });
    }
    async refresh(options = {}) {
        const allowNetwork = options.allowNetwork ?? true;
        const callerSignal = (0,_utils_abort_js__WEBPACK_IMPORTED_MODULE_4__/* .operationSignal */ .O)(options.signal);
        const errors = new Map();
        if (callerSignal.aborted)
            return { aborted: true, errors };
        const selected = options.providers ? new Set(options.providers) : undefined;
        const refreshable = Array.from(this.providers.values()).filter((provider) => provider.refreshModels !== undefined && (!selected || selected.has(provider.id)));
        const refresh = Promise.all(refreshable.map(async (provider) => {
            const { generation, controller } = this.beginProviderRefresh(provider.id);
            const signal = AbortSignal.any([callerSignal, controller.signal]);
            const operation = (async () => {
                let storedCredential;
                let credentialError;
                try {
                    storedCredential = await this.readCredential(provider.id, signal);
                }
                catch (error) {
                    credentialError = error;
                }
                // Restore cached provider state before auth resolution or network access.
                await this.runProviderRefreshPhase(provider, storedCredential, false, undefined, generation, signal);
                if (credentialError !== undefined)
                    throw credentialError;
                if (!allowNetwork || signal.aborted)
                    return;
                const credential = await this.resolveRefreshCredential(provider, storedCredential, signal);
                if (!credential)
                    return;
                await this.runProviderRefreshPhase(provider, credential, true, options.force, generation, signal);
            })();
            try {
                await (0,_utils_abort_js__WEBPACK_IMPORTED_MODULE_4__/* .raceWithAbortSignal */ .g)(operation, signal);
            }
            catch (error) {
                if (!signal.aborted) {
                    errors.set(provider.id, error instanceof Error
                        ? error
                        : new _auth_resolve_js__WEBPACK_IMPORTED_MODULE_0__/* .ModelsError */ .t("model_source", `Model refresh failed for ${provider.id}`, { cause: error }));
                }
            }
            finally {
                if (this.refreshControllers.get(provider.id) === controller) {
                    this.refreshControllers.delete(provider.id);
                }
            }
        }));
        try {
            await (0,_utils_abort_js__WEBPACK_IMPORTED_MODULE_4__/* .raceWithAbortSignal */ .g)(refresh, callerSignal);
        }
        catch (error) {
            if (!callerSignal.aborted)
                throw error;
        }
        return { aborted: callerSignal.aborted, errors: new Map(errors) };
    }
    async resolveRefreshCredential(provider, stored, signal) {
        if (stored?.type === "oauth") {
            const oauth = provider.auth.oauth;
            if (!oauth)
                return undefined;
            if (Date.now() < stored.expires)
                return stored;
            if (signal.aborted)
                return undefined;
            const post = await this.credentials.modify(provider.id, async (current) => {
                if (current?.type !== "oauth" || Date.now() < current.expires)
                    return undefined;
                return oauth.refresh(current, signal);
            }, { signal });
            return post?.type === "oauth" ? post : undefined;
        }
        const apiKey = provider.auth.apiKey;
        if (!apiKey)
            return undefined;
        const credential = stored?.type === "api_key" ? stored : undefined;
        const result = await apiKey.resolve({ ctx: this.authContext, credential, signal });
        if (!result)
            return undefined;
        return { type: "api_key", key: result.auth.apiKey, env: result.env };
    }
    async readCredential(providerId, signal) {
        try {
            return await this.credentials.read(providerId, { signal });
        }
        catch (error) {
            throw new _auth_resolve_js__WEBPACK_IMPORTED_MODULE_0__/* .ModelsError */ .t("auth", `Credential store read failed for ${providerId}`, { cause: error });
        }
    }
    async checkProviderAuth(provider, credential, signal) {
        if (credential?.type === "oauth") {
            return provider.auth.oauth ? { source: "OAuth", type: "oauth" } : undefined;
        }
        const apiKey = provider.auth.apiKey;
        if (!apiKey)
            return undefined;
        if (apiKey.check) {
            try {
                return await apiKey.check({
                    ctx: this.authContext,
                    credential: credential?.type === "api_key" ? credential : undefined,
                    signal,
                });
            }
            catch (error) {
                throw new _auth_resolve_js__WEBPACK_IMPORTED_MODULE_0__/* .ModelsError */ .t("auth", `API key auth check failed for provider ${provider.id}`, { cause: error });
            }
        }
        const resolution = await (0,_auth_resolve_js__WEBPACK_IMPORTED_MODULE_0__/* .resolveProviderAuth */ .O)(provider, this.credentials, this.authContext, { signal });
        return resolution ? { source: resolution.source, type: "api_key" } : undefined;
    }
    checkAuth(providerId, options) {
        const signal = (0,_utils_abort_js__WEBPACK_IMPORTED_MODULE_4__/* .operationSignal */ .O)(options?.signal);
        const check = (async () => {
            signal.throwIfAborted();
            const provider = this.providers.get(providerId);
            if (!provider)
                return undefined;
            return this.checkProviderAuth(provider, await this.readCredential(providerId, signal), signal);
        })();
        return (0,_utils_abort_js__WEBPACK_IMPORTED_MODULE_4__/* .raceWithAbortSignal */ .g)(check, signal);
    }
    getAvailable(providerId, options) {
        const signal = (0,_utils_abort_js__WEBPACK_IMPORTED_MODULE_4__/* .operationSignal */ .O)(options?.signal);
        const available = (async () => {
            signal.throwIfAborted();
            const providers = providerId
                ? [this.providers.get(providerId)].filter((entry) => entry !== undefined)
                : this.getProviders();
            const checks = await Promise.all(providers.map(async (provider) => {
                const credential = await this.readCredential(provider.id, signal);
                return { provider, credential, auth: await this.checkProviderAuth(provider, credential, signal) };
            }));
            return checks.flatMap(({ provider, credential, auth }) => {
                if (!auth)
                    return [];
                const models = provider.getModels();
                return provider.filterModels?.(models, credential) ?? models;
            });
        })();
        return (0,_utils_abort_js__WEBPACK_IMPORTED_MODULE_4__/* .raceWithAbortSignal */ .g)(available, signal);
    }
    async getAuth(providerOrModel, overrides) {
        const signal = (0,_utils_abort_js__WEBPACK_IMPORTED_MODULE_4__/* .operationSignal */ .O)(overrides?.signal);
        const providerId = typeof providerOrModel === "string" ? providerOrModel : providerOrModel.provider;
        const provider = this.providers.get(providerId);
        if (!provider)
            return undefined;
        const result = await (0,_auth_resolve_js__WEBPACK_IMPORTED_MODULE_0__/* .resolveProviderAuth */ .O)(provider, this.credentials, this.authContext, { ...overrides, signal });
        if (!result || typeof providerOrModel === "string" || !providerOrModel.headers)
            return result;
        return {
            ...result,
            auth: {
                ...result.auth,
                headers: mergeHeaders(result.auth.headers, providerOrModel.headers),
            },
        };
    }
    async login(providerId, type, interaction) {
        const signal = (0,_utils_abort_js__WEBPACK_IMPORTED_MODULE_4__/* .operationSignal */ .O)(interaction.signal);
        signal.throwIfAborted();
        const provider = this.providers.get(providerId);
        if (!provider)
            throw new _auth_resolve_js__WEBPACK_IMPORTED_MODULE_0__/* .ModelsError */ .t("provider", `Unknown provider: ${providerId}`);
        const method = type === "oauth" ? provider.auth.oauth : provider.auth.apiKey;
        if (!method?.login) {
            throw new _auth_resolve_js__WEBPACK_IMPORTED_MODULE_0__/* .ModelsError */ .t("auth", `${provider.name} does not support ${type} login`);
        }
        const loginOperation = method.login({ ...interaction, signal });
        const credential = await (0,_utils_abort_js__WEBPACK_IMPORTED_MODULE_4__/* .raceWithAbortSignal */ .g)(loginOperation, signal);
        let mutationStarted = false;
        let markMutationStarted;
        const started = new Promise((resolve) => {
            markMutationStarted = resolve;
        });
        const mutation = this.credentials.modify(providerId, async () => {
            mutationStarted = true;
            markMutationStarted?.();
            return credential;
        }, { signal });
        void mutation.catch(() => { });
        try {
            await new Promise((resolve, reject) => {
                const onAbort = () => {
                    if (!mutationStarted)
                        reject(signal.reason);
                };
                signal.addEventListener("abort", onAbort, { once: true });
                void Promise.race([started, mutation]).then(() => {
                    signal.removeEventListener("abort", onAbort);
                    resolve();
                }, (error) => {
                    signal.removeEventListener("abort", onAbort);
                    reject(error);
                });
                if (signal.aborted)
                    onAbort();
            });
            await mutation;
        }
        catch (error) {
            signal.throwIfAborted();
            throw new _auth_resolve_js__WEBPACK_IMPORTED_MODULE_0__/* .ModelsError */ .t("auth", `Credential store modify failed for ${providerId}`, { cause: error });
        }
        return credential;
    }
    async logout(providerId, options) {
        const signal = (0,_utils_abort_js__WEBPACK_IMPORTED_MODULE_4__/* .operationSignal */ .O)(options?.signal);
        signal.throwIfAborted();
        try {
            await this.credentials.delete(providerId, { signal });
        }
        catch (error) {
            signal.throwIfAborted();
            throw new _auth_resolve_js__WEBPACK_IMPORTED_MODULE_0__/* .ModelsError */ .t("auth", `Credential store delete failed for ${providerId}`, { cause: error });
        }
    }
    requireProvider(model) {
        const provider = this.providers.get(model.provider);
        if (!provider) {
            throw new _auth_resolve_js__WEBPACK_IMPORTED_MODULE_0__/* .ModelsError */ .t("provider", `Unknown provider: ${model.provider}`);
        }
        return provider;
    }
    async applyAuth(model, options) {
        this.requireProvider(model);
        const resolution = await this.getAuth(model, {
            apiKey: options?.apiKey,
            env: options?.env,
            signal: options?.signal,
        });
        if (!resolution) {
            throw new _auth_resolve_js__WEBPACK_IMPORTED_MODULE_0__/* .ModelsError */ .t("auth", `Provider is not configured: ${model.provider}`);
        }
        const auth = resolution.auth;
        // Explicit request options win per-field; the Models-only transform runs last.
        const apiKey = options?.apiKey ?? auth.apiKey;
        let headers = mergeHeaders(auth.headers, options?.headers);
        if (options?.transformHeaders)
            headers = await options.transformHeaders(headers ?? {});
        const env = resolution.env || options?.env ? { ...(resolution.env ?? {}), ...(options?.env ?? {}) } : undefined;
        const requestModel = auth.baseUrl ? { ...model, baseUrl: auth.baseUrl } : model;
        const { transformHeaders: _transformHeaders, ...providerOptions } = options ?? {};
        const requestOptions = { ...providerOptions, apiKey, headers, env };
        return { requestModel, requestOptions };
    }
    stream(model, context, options) {
        return (0,_api_lazy_js__WEBPACK_IMPORTED_MODULE_5__/* .lazyStream */ .n)(model, async () => {
            const provider = this.requireProvider(model);
            const { requestModel, requestOptions } = await this.applyAuth(model, options);
            return provider.stream(requestModel, context, requestOptions);
        });
    }
    async complete(model, context, options) {
        return this.stream(model, context, options).result();
    }
    streamSimple(model, context, options) {
        return (0,_api_lazy_js__WEBPACK_IMPORTED_MODULE_5__/* .lazyStream */ .n)(model, async () => {
            const provider = this.requireProvider(model);
            const { requestModel, requestOptions } = await this.applyAuth(model, options);
            return provider.streamSimple(requestModel, context, requestOptions);
        });
    }
    async completeSimple(model, context, options) {
        return this.streamSimple(model, context, options).result();
    }
    async fetchDeferred(model, handle, options) {
        return (0,_api_lazy_js__WEBPACK_IMPORTED_MODULE_5__/* .lazyStream */ .n)(model, async () => {
            const provider = this.requireProvider(model);
            if (!provider.fetchDeferred) {
                throw new _auth_resolve_js__WEBPACK_IMPORTED_MODULE_0__/* .ModelsError */ .t("provider", `Provider ${model.provider} does not support deferred responses`);
            }
            const { requestModel, requestOptions } = await this.applyAuth(model, options);
            return provider.fetchDeferred(requestModel, handle, requestOptions);
        }).result();
    }
    async cancelDeferred(model, handle, options) {
        const provider = this.requireProvider(model);
        if (!provider.cancelDeferred) {
            throw new _auth_resolve_js__WEBPACK_IMPORTED_MODULE_0__/* .ModelsError */ .t("provider", `Provider ${model.provider} does not support deferred responses`);
        }
        const { requestModel, requestOptions } = await this.applyAuth(model, options);
        await provider.cancelDeferred(requestModel, handle, requestOptions);
    }
}
function createModels(options) {
    return new ModelsImpl(options);
}
/**
 * Builds a provider from parts. Built-in provider factories and models.json
 * custom providers both go through this. A single `api` streams all models;
 * an `api` map dispatches on `model.api`, and a model whose api has no entry
 * produces a stream error.
 */
function createProvider(input) {
    const baselineModels = input.models;
    let dynamicModels = [];
    const fetchModels = input.fetchModels;
    const currentModels = () => {
        const merged = [...baselineModels];
        for (const model of dynamicModels) {
            const index = merged.findIndex((entry) => entry.id === model.id);
            if (index >= 0)
                merged[index] = model;
            else
                merged.push(model);
        }
        return merged;
    };
    const single = typeof input.api.stream === "function" ? input.api : undefined;
    const byApi = single ? undefined : input.api;
    const apiFor = (model) => single ?? byApi?.[model.api];
    const dispatch = (model, run) => {
        const streams = apiFor(model);
        if (!streams) {
            return (0,_api_lazy_js__WEBPACK_IMPORTED_MODULE_5__/* .lazyStream */ .n)(model, async () => {
                throw new _auth_resolve_js__WEBPACK_IMPORTED_MODULE_0__/* .ModelsError */ .t("stream", `Provider ${input.id} has no API implementation for "${model.api}"`);
            });
        }
        return run(streams);
    };
    const provider = {
        id: input.id,
        name: input.name ?? input.id,
        baseUrl: input.baseUrl,
        headers: input.headers,
        auth: input.auth,
        getModels: currentModels,
        refreshModels: fetchModels
            ? async (context) => {
                if (context.stored) {
                    const restored = context.stored.models
                        .filter((model) => model.provider === input.id)
                        .map((model) => model);
                    if (!(await context.publish({
                        update: () => {
                            dynamicModels = restored;
                        },
                    }))) {
                        return;
                    }
                }
                if (!context.allowNetwork || context.signal.aborted)
                    return;
                const refreshed = await fetchModels(context);
                if (context.signal.aborted)
                    return;
                await context.publish({
                    persist: { models: refreshed, checkedAt: Date.now() },
                    update: () => {
                        dynamicModels = refreshed;
                    },
                });
            }
            : undefined,
        filterModels: input.filterModels,
        stream: (model, context, options) => dispatch(model, (streams) => streams.stream(model, context, options)),
        streamSimple: (model, context, options) => dispatch(model, (streams) => streams.streamSimple(model, context, options)),
    };
    const streams = single ? [single] : Object.values(byApi ?? {}).filter((entry) => entry !== undefined);
    if (streams.some((entry) => entry.fetchDeferred !== undefined)) {
        provider.fetchDeferred = (model, handle, options) => (0,_api_lazy_js__WEBPACK_IMPORTED_MODULE_5__/* .lazyStream */ .n)(model, async () => {
            const implementation = apiFor(model);
            if (!implementation?.fetchDeferred) {
                throw new _auth_resolve_js__WEBPACK_IMPORTED_MODULE_0__/* .ModelsError */ .t("provider", `Provider ${input.id} does not support deferred responses for "${model.api}"`);
            }
            return implementation.fetchDeferred(model, handle, options);
        });
    }
    if (streams.some((entry) => entry.cancelDeferred !== undefined)) {
        provider.cancelDeferred = async (model, handle, options) => {
            const implementation = apiFor(model);
            if (!implementation?.cancelDeferred) {
                throw new _auth_resolve_js__WEBPACK_IMPORTED_MODULE_0__/* .ModelsError */ .t("provider", `Provider ${input.id} cannot cancel deferred responses for "${model.api}"`);
            }
            await implementation.cancelDeferred(model, handle, options);
        };
    }
    return provider;
}
/**
 * Runtime-checked narrowing for dynamically looked-up models:
 *
 * ```ts
 * const model = models.getModel("anthropic", "claude-opus-4-7");
 * if (model && hasApi(model, "anthropic-messages")) {
 *   // model: Model<"anthropic-messages">, stream options fully typed
 * }
 * ```
 */
function hasApi(model, api) {
    return model.api === api;
}
function calculateCost(model, usage) {
    const inputTokens = usage.input + usage.cacheRead + usage.cacheWrite;
    let rates = model.cost;
    let matchedThreshold = -1;
    for (const tier of model.cost.tiers ?? []) {
        if (inputTokens > tier.inputTokensAbove && tier.inputTokensAbove > matchedThreshold) {
            rates = tier;
            matchedThreshold = tier.inputTokensAbove;
        }
    }
    // Anthropic charges 2x base input for 1h cache writes.
    const longWrite = usage.cacheWrite1h ?? 0;
    const shortWrite = usage.cacheWrite - longWrite;
    usage.cost.input = (rates.input / 1000000) * usage.input;
    usage.cost.output = (rates.output / 1000000) * usage.output;
    usage.cost.cacheRead = (rates.cacheRead / 1000000) * usage.cacheRead;
    usage.cost.cacheWrite = (rates.cacheWrite * shortWrite + rates.input * 2 * longWrite) / 1000000;
    usage.cost.total = usage.cost.input + usage.cost.output + usage.cost.cacheRead + usage.cost.cacheWrite;
    return usage.cost;
}
const EXTENDED_THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
function getSupportedThinkingLevels(model) {
    if (!model.reasoning)
        return ["off"];
    return EXTENDED_THINKING_LEVELS.filter((level) => {
        const mapped = model.thinkingLevelMap?.[level];
        if (mapped === null)
            return false;
        if (level === "xhigh" || level === "max")
            return mapped !== undefined;
        return true;
    });
}
function clampThinkingLevel(model, level) {
    const availableLevels = getSupportedThinkingLevels(model);
    if (availableLevels.includes(level))
        return level;
    const requestedIndex = EXTENDED_THINKING_LEVELS.indexOf(level);
    if (requestedIndex === -1)
        return availableLevels[0] ?? "off";
    for (let i = requestedIndex; i < EXTENDED_THINKING_LEVELS.length; i++) {
        const candidate = EXTENDED_THINKING_LEVELS[i];
        if (availableLevels.includes(candidate))
            return candidate;
    }
    for (let i = requestedIndex - 1; i >= 0; i--) {
        const candidate = EXTENDED_THINKING_LEVELS[i];
        if (availableLevels.includes(candidate))
            return candidate;
    }
    return availableLevels[0] ?? "off";
}
/**
 * Check if two models are equal by comparing both their id and provider.
 * Returns false if either model is null or undefined.
 */
function modelsAreEqual(a, b) {
    if (!a || !b)
        return false;
    return a.id === b.id && a.provider === b.provider;
}
//# sourceMappingURL=models.js.map

/***/ }),

/***/ 16245:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   O: () => (/* binding */ operationSignal),
/* harmony export */   g: () => (/* binding */ raceWithAbortSignal)
/* harmony export */ });
function abortReason(signal) {
    if (signal.reason !== undefined)
        return signal.reason;
    const error = new Error("The operation was aborted");
    error.name = "AbortError";
    return error;
}
/** Create an operation-local signal for public APIs whose signal is optional. */
function operationSignal(signal) {
    return signal ?? new AbortController().signal;
}
/**
 * Stop waiting for an operation when its signal aborts while continuing to
 * observe the abandoned promise so a later rejection is always handled.
 */
function raceWithAbortSignal(operation, signal) {
    if (signal.aborted) {
        void operation.catch(() => { });
        return Promise.reject(abortReason(signal));
    }
    return new Promise((resolve, reject) => {
        let settled = false;
        const cleanup = () => signal.removeEventListener("abort", onAbort);
        const onAbort = () => {
            if (settled)
                return;
            settled = true;
            cleanup();
            reject(abortReason(signal));
        };
        signal.addEventListener("abort", onAbort, { once: true });
        void operation.then((value) => {
            if (settled)
                return;
            settled = true;
            cleanup();
            resolve(value);
        }, (error) => {
            if (settled)
                return;
            settled = true;
            cleanup();
            reject(error);
        });
        if (signal.aborted)
            onAbort();
    });
}
//# sourceMappingURL=abort.js.map

/***/ }),

/***/ 53475:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Fu: () => (/* binding */ formatThrownValue),
/* harmony export */   hY: () => (/* binding */ createAssistantMessageDiagnostic),
/* harmony export */   vF: () => (/* binding */ appendAssistantMessageDiagnostic),
/* harmony export */   xe: () => (/* binding */ extractDiagnosticError)
/* harmony export */ });
function formatThrownValue(value) {
    if (value instanceof Error)
        return value.message || value.name;
    if (typeof value === "string")
        return value;
    return String(value);
}
function extractDiagnosticError(error) {
    if (!(error instanceof Error))
        return { name: "ThrownValue", message: formatThrownValue(error) };
    const code = error.code;
    return {
        name: error.name || undefined,
        message: error.message || error.name,
        stack: error.stack,
        code: typeof code === "string" || typeof code === "number" ? code : undefined,
    };
}
function createAssistantMessageDiagnostic(type, error, details) {
    return { type, timestamp: Date.now(), error: extractDiagnosticError(error), details };
}
function appendAssistantMessageDiagnostic(message, diagnostic) {
    message.diagnostics = [...(message.diagnostics ?? []), diagnostic];
}
//# sourceMappingURL=diagnostics.js.map

/***/ }),

/***/ 43235:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   I: () => (/* binding */ repairJson),
/* harmony export */   jA: () => (/* binding */ parseJsonWithRepair),
/* harmony export */   o2: () => (/* binding */ parseStreamingJson)
/* harmony export */ });
/* harmony import */ var partial_json__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(69138);

const VALID_JSON_ESCAPES = new Set(['"', "\\", "/", "b", "f", "n", "r", "t", "u"]);
function isControlCharacter(char) {
    const codePoint = char.codePointAt(0);
    return codePoint !== undefined && codePoint >= 0x00 && codePoint <= 0x1f;
}
function escapeControlCharacter(char) {
    switch (char) {
        case "\b":
            return "\\b";
        case "\f":
            return "\\f";
        case "\n":
            return "\\n";
        case "\r":
            return "\\r";
        case "\t":
            return "\\t";
        default:
            return `\\u${char.codePointAt(0)?.toString(16).padStart(4, "0") ?? "0000"}`;
    }
}
/**
 * Repairs malformed JSON string literals by:
 * - escaping raw control characters inside strings
 * - doubling backslashes before invalid escape characters
 */
function repairJson(json) {
    let repaired = "";
    let inString = false;
    for (let index = 0; index < json.length; index++) {
        const char = json[index];
        if (!inString) {
            repaired += char;
            if (char === '"') {
                inString = true;
            }
            continue;
        }
        if (char === '"') {
            repaired += char;
            inString = false;
            continue;
        }
        if (char === "\\") {
            const nextChar = json[index + 1];
            if (nextChar === undefined) {
                repaired += "\\\\";
                continue;
            }
            if (nextChar === "u") {
                const unicodeDigits = json.slice(index + 2, index + 6);
                if (/^[0-9a-fA-F]{4}$/.test(unicodeDigits)) {
                    repaired += `\\u${unicodeDigits}`;
                    index += 5;
                    continue;
                }
            }
            if (VALID_JSON_ESCAPES.has(nextChar)) {
                repaired += `\\${nextChar}`;
                index += 1;
                continue;
            }
            repaired += "\\\\";
            continue;
        }
        repaired += isControlCharacter(char) ? escapeControlCharacter(char) : char;
    }
    return repaired;
}
function parseJsonWithRepair(json) {
    try {
        return JSON.parse(json);
    }
    catch (error) {
        const repairedJson = repairJson(json);
        if (repairedJson !== json) {
            return JSON.parse(repairedJson);
        }
        throw error;
    }
}
/**
 * Attempts to parse potentially incomplete JSON during streaming.
 * Always returns a valid object, even if the JSON is incomplete.
 *
 * @param partialJson The partial JSON string from streaming
 * @returns Parsed object or empty object if parsing fails
 */
function parseStreamingJson(partialJson) {
    if (!partialJson || partialJson.trim() === "") {
        return {};
    }
    try {
        return parseJsonWithRepair(partialJson);
    }
    catch {
        try {
            const result = (0,partial_json__WEBPACK_IMPORTED_MODULE_0__.parse)(partialJson);
            return (result ?? {});
        }
        catch {
            try {
                const result = (0,partial_json__WEBPACK_IMPORTED_MODULE_0__.parse)(repairJson(partialJson));
                return (result ?? {});
            }
            catch {
                return {};
            }
        }
    }
}
//# sourceMappingURL=json-parse.js.map

/***/ }),

/***/ 81844:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Y: () => (/* binding */ getProviderEnvValue)
/* harmony export */ });
let procEnvCache = null;
/**
 * Fallback for https://github.com/oven-sh/bun/issues/27802.
 * Bun compiled binaries can expose an empty process.env inside Linux sandboxes
 * even though /proc/self/environ contains the environment.
 *
 * This intentionally duplicates restoreSandboxEnv() in
 * packages/coding-agent/src/bun/restore-sandbox-env.ts. The ai package can be
 * used directly, without going through that entrypoint, so provider env lookup
 * must not depend on process.env having been patched.
 */
function getBunSandboxEnvValue(name) {
    if (typeof process === "undefined" || !process.versions?.bun || Object.keys(process.env).length > 0) {
        return undefined;
    }
    if (procEnvCache === null) {
        procEnvCache = new Map();
        try {
            const { readFileSync } = require("node:fs");
            const data = readFileSync("/proc/self/environ", "utf-8");
            for (const entry of data.split("\0")) {
                const idx = entry.indexOf("=");
                if (idx > 0) {
                    procEnvCache.set(entry.slice(0, idx), entry.slice(idx + 1));
                }
            }
        }
        catch {
            // /proc/self/environ may not exist or may not be readable.
        }
    }
    return procEnvCache.get(name);
}
/**
 * Resolve a provider env value from scoped overrides, normal process.env, then
 * the duplicated Bun sandbox fallback for direct pi-ai consumers.
 */
function getProviderEnvValue(name, env) {
    return (env?.[name] ||
        (typeof process !== "undefined" ? process.env[name] : undefined) ||
        getBunSandboxEnvValue(name) ||
        undefined);
}
//# sourceMappingURL=provider-env.js.map

/***/ })

};
