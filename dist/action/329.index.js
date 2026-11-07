export const id = 329;
export const ids = [329];
export const modules = {

/***/ 79491:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Is: () => (/* binding */ UnprocessableEntityError),
/* harmony export */   LG: () => (/* binding */ APIError),
/* harmony export */   Ll: () => (/* binding */ PermissionDeniedError),
/* harmony export */   OE: () => (/* binding */ RateLimitError),
/* harmony export */   PO: () => (/* binding */ InternalServerError),
/* harmony export */   cH: () => (/* binding */ APIUserAbortError),
/* harmony export */   dw: () => (/* binding */ RetryableError),
/* harmony export */   fK: () => (/* binding */ ConflictError),
/* harmony export */   m_: () => (/* binding */ NotFoundError),
/* harmony export */   pJ: () => (/* binding */ AnthropicError),
/* harmony export */   qA: () => (/* binding */ APIConnectionTimeoutError),
/* harmony export */   v3: () => (/* binding */ AuthenticationError),
/* harmony export */   v7: () => (/* binding */ BadRequestError),
/* harmony export */   xX: () => (/* binding */ APIConnectionError)
/* harmony export */ });
/* harmony import */ var _internal_errors_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(79355);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

class AnthropicError extends Error {
}
class APIError extends AnthropicError {
    constructor(status, error, message, headers, type) {
        super(`${APIError.makeMessage(status, error, message)}`);
        this.status = status;
        this.headers = headers;
        this.requestID = headers?.get('request-id');
        this.workspaceID = headers?.get('anthropic-workspace-id');
        this.error = error;
        this.type = type ?? null;
    }
    static makeMessage(status, error, message) {
        const msg = error?.message ?
            typeof error.message === 'string' ?
                error.message
                : JSON.stringify(error.message)
            : error ? JSON.stringify(error)
                : message;
        if (status && msg) {
            return `${status} ${msg}`;
        }
        if (status) {
            return `${status} status code (no body)`;
        }
        if (msg) {
            return msg;
        }
        return '(no status code or body)';
    }
    static generate(status, errorResponse, message, headers) {
        if (!status || !headers) {
            return new APIConnectionError({ message, cause: (0,_internal_errors_mjs__WEBPACK_IMPORTED_MODULE_0__/* .castToError */ .r)(errorResponse) });
        }
        const error = errorResponse;
        const type = error?.['error']?.['type'];
        if (status === 400) {
            return new BadRequestError(status, error, message, headers, type);
        }
        if (status === 401) {
            return new AuthenticationError(status, error, message, headers, type);
        }
        if (status === 403) {
            return new PermissionDeniedError(status, error, message, headers, type);
        }
        if (status === 404) {
            return new NotFoundError(status, error, message, headers, type);
        }
        if (status === 409) {
            return new ConflictError(status, error, message, headers, type);
        }
        if (status === 422) {
            return new UnprocessableEntityError(status, error, message, headers, type);
        }
        if (status === 429) {
            return new RateLimitError(status, error, message, headers, type);
        }
        if (status >= 500) {
            return new InternalServerError(status, error, message, headers, type);
        }
        return new APIError(status, error, message, headers, type);
    }
}
class APIUserAbortError extends APIError {
    constructor({ message } = {}) {
        super(undefined, undefined, message || 'Request was aborted.', undefined);
    }
}
class APIConnectionError extends APIError {
    constructor({ message, cause }) {
        super(undefined, undefined, message || 'Connection error.', undefined);
        // in some environments the 'cause' property is already declared
        // @ts-ignore
        if (cause)
            this.cause = cause;
    }
}
class APIConnectionTimeoutError extends APIConnectionError {
    constructor({ message } = {}) {
        super({ message: message ?? 'Request timed out.' });
    }
}
/**
 * An error that opts into the SDK's retry policy: throw it (e.g. from
 * middleware) to have the attempt retried.
 *
 * Note that the request will only be retried when `maxRetries` has not been exhausted.
 */
class RetryableError extends AnthropicError {
    constructor(message, { cause } = {}) {
        super(message ?? 'Retryable error.');
        // in some environments the 'cause' property is already declared
        // @ts-ignore
        if (cause !== undefined)
            this.cause = cause;
    }
}
class BadRequestError extends APIError {
}
class AuthenticationError extends APIError {
}
class PermissionDeniedError extends APIError {
}
class NotFoundError extends APIError {
}
class ConflictError extends APIError {
}
class UnprocessableEntityError extends APIError {
}
class RateLimitError extends APIError {
}
class InternalServerError extends APIError {
}
//# sourceMappingURL=error.mjs.map

/***/ }),

/***/ 7071:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  Ay: () => (/* reexport */ Anthropic)
});

// UNUSED EXPORTS: AI_PROMPT, APIConnectionError, APIConnectionTimeoutError, APIError, APIPromise, APIUserAbortError, Anthropic, AnthropicError, AuthenticationError, BadRequestError, BaseAnthropic, BetaFallbackState, ConflictError, HUMAN_PROMPT, InternalServerError, NotFoundError, PagePromise, PermissionDeniedError, RateLimitError, RetryableError, UnprocessableEntityError, betaRefusalFallbackMiddleware, toFile

// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/tslib.mjs
var tslib = __webpack_require__(30431);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/uuid.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
/**
 * https://stackoverflow.com/a/2117523
 */
let uuid4 = function () {
    const { crypto } = globalThis;
    if (crypto?.randomUUID) {
        uuid4 = crypto.randomUUID.bind(crypto);
        return crypto.randomUUID();
    }
    const u8 = new Uint8Array(1);
    const randomByte = crypto ? () => crypto.getRandomValues(u8)[0] : () => (Math.random() * 0xff) & 0xff;
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (+c ^ (randomByte() & (15 >> (+c / 4)))).toString(16));
};
//# sourceMappingURL=uuid.mjs.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/values.mjs
var utils_values = __webpack_require__(89865);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/sleep.mjs
/**
 * Resolve after `ms`, or immediately when `signal` aborts.
 *
 * When a `signal` is passed the abort listener is always removed so repeated
 * calls do not accumulate listeners on a long-lived signal. Resolves (rather
 * than rejects) on abort — callers treat abort as "wake up early," not as a
 * failure; callers that want to unwind should check the signal themselves.
 */
const sleep = (ms, signal) => new Promise((resolve) => {
    if (signal?.aborted)
        return resolve();
    const onAbort = () => {
        clearTimeout(timer);
        resolve();
    };
    const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
    }, ms);
    // `{ once: true }` auto-removes the listener if abort fires first,
    // so we only need an explicit remove on the timer-wins path above.
    signal?.addEventListener('abort', onAbort, { once: true });
});
//# sourceMappingURL=sleep.mjs.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/errors.mjs
var errors = __webpack_require__(79355);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/version.mjs
const VERSION = '0.124.0'; // x-release-please-version
//# sourceMappingURL=version.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/detect-platform.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

const isRunningInBrowser = () => {
    return (
    // @ts-ignore
    typeof window !== 'undefined' &&
        // @ts-ignore
        typeof window.document !== 'undefined' &&
        // @ts-ignore
        typeof navigator !== 'undefined');
};
/**
 * Note this does not detect 'browser'; for that, use getBrowserInfo().
 */
function getDetectedPlatform() {
    if (typeof Deno !== 'undefined' && Deno.build != null) {
        return 'deno';
    }
    if (typeof EdgeRuntime !== 'undefined') {
        return 'edge';
    }
    if (Object.prototype.toString.call(typeof globalThis.process !== 'undefined' ? globalThis.process : 0) === '[object process]') {
        return 'node';
    }
    return 'unknown';
}
const getPlatformProperties = () => {
    const detectedPlatform = getDetectedPlatform();
    if (detectedPlatform === 'deno') {
        return {
            'X-Stainless-Lang': 'js',
            'X-Stainless-Package-Version': VERSION,
            'X-Stainless-OS': normalizePlatform(Deno.build.os),
            'X-Stainless-Arch': normalizeArch(Deno.build.arch),
            'X-Stainless-Runtime': 'deno',
            'X-Stainless-Runtime-Version': typeof Deno.version === 'string' ? Deno.version : Deno.version?.deno ?? 'unknown',
        };
    }
    if (typeof EdgeRuntime !== 'undefined') {
        return {
            'X-Stainless-Lang': 'js',
            'X-Stainless-Package-Version': VERSION,
            'X-Stainless-OS': 'Unknown',
            'X-Stainless-Arch': `other:${EdgeRuntime}`,
            'X-Stainless-Runtime': 'edge',
            'X-Stainless-Runtime-Version': globalThis.process?.version ?? 'unknown',
        };
    }
    // Check if Node.js
    if (detectedPlatform === 'node') {
        return {
            'X-Stainless-Lang': 'js',
            'X-Stainless-Package-Version': VERSION,
            'X-Stainless-OS': normalizePlatform(globalThis.process.platform ?? 'unknown'),
            'X-Stainless-Arch': normalizeArch(globalThis.process.arch ?? 'unknown'),
            'X-Stainless-Runtime': 'node',
            'X-Stainless-Runtime-Version': globalThis.process.version ?? 'unknown',
        };
    }
    const browserInfo = getBrowserInfo();
    if (browserInfo) {
        return {
            'X-Stainless-Lang': 'js',
            'X-Stainless-Package-Version': VERSION,
            'X-Stainless-OS': 'Unknown',
            'X-Stainless-Arch': 'unknown',
            'X-Stainless-Runtime': `browser:${browserInfo.browser}`,
            'X-Stainless-Runtime-Version': browserInfo.version,
        };
    }
    // TODO add support for Cloudflare workers, etc.
    return {
        'X-Stainless-Lang': 'js',
        'X-Stainless-Package-Version': VERSION,
        'X-Stainless-OS': 'Unknown',
        'X-Stainless-Arch': 'unknown',
        'X-Stainless-Runtime': 'unknown',
        'X-Stainless-Runtime-Version': 'unknown',
    };
};
// Note: modified from https://github.com/JS-DevTools/host-environment/blob/b1ab79ecde37db5d6e163c050e54fe7d287d7c92/src/isomorphic.browser.ts
function getBrowserInfo() {
    if (typeof navigator === 'undefined' || !navigator) {
        return null;
    }
    // NOTE: The order matters here!
    const browserPatterns = [
        { key: 'edge', pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
        { key: 'ie', pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
        { key: 'ie', pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ },
        { key: 'chrome', pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
        { key: 'firefox', pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
        { key: 'safari', pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ },
    ];
    // Find the FIRST matching browser
    for (const { key, pattern } of browserPatterns) {
        const match = pattern.exec(navigator.userAgent);
        if (match) {
            const major = match[1] || 0;
            const minor = match[2] || 0;
            const patch = match[3] || 0;
            return { browser: key, version: `${major}.${minor}.${patch}` };
        }
    }
    return null;
}
const normalizeArch = (arch) => {
    // Node docs:
    // - https://nodejs.org/api/process.html#processarch
    // Deno docs:
    // - https://doc.deno.land/deno/stable/~/Deno.build
    if (arch === 'x32')
        return 'x32';
    if (arch === 'x86_64' || arch === 'x64')
        return 'x64';
    if (arch === 'arm')
        return 'arm';
    if (arch === 'aarch64' || arch === 'arm64')
        return 'arm64';
    if (arch)
        return `other:${arch}`;
    return 'unknown';
};
const normalizePlatform = (platform) => {
    // Node platforms:
    // - https://nodejs.org/api/process.html#processplatform
    // Deno platforms:
    // - https://doc.deno.land/deno/stable/~/Deno.build
    // - https://github.com/denoland/deno/issues/14799
    platform = platform.toLowerCase();
    // NOTE: this iOS check is untested and may not work
    // Node does not work natively on IOS, there is a fork at
    // https://github.com/nodejs-mobile/nodejs-mobile
    // however it is unknown at the time of writing how to detect if it is running
    if (platform.includes('ios'))
        return 'iOS';
    if (platform === 'android')
        return 'Android';
    if (platform === 'darwin')
        return 'MacOS';
    if (platform === 'win32')
        return 'Windows';
    if (platform === 'freebsd')
        return 'FreeBSD';
    if (platform === 'openbsd')
        return 'OpenBSD';
    if (platform === 'linux')
        return 'Linux';
    if (platform)
        return `Other:${platform}`;
    return 'Unknown';
};
let _platformHeaders;
const getPlatformHeaders = () => {
    return (_platformHeaders ?? (_platformHeaders = getPlatformProperties()));
};
//# sourceMappingURL=detect-platform.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/request-signal.mjs
/**
 * Tracks the removal of the per-request abort listener that
 * `fetchWithTimeout` attaches to a caller-provided signal, so the listener's
 * lifetime matches the request instead of the signal.
 *
 * Without removal, a long-lived signal (e.g. one AbortController reused for
 * a whole session) accumulates one `{ once: true }` listener plus its bound
 * AbortController per HTTP attempt until the signal fires or is collected,
 * and Node warns at the 11th listener. The listener must survive until the
 * response body is settled - removing it when fetch resolves (headers) would
 * break aborting an in-flight body read - so the code that finishes the body
 * (response parsing, stream teardown, retry/error handling) calls
 * `releaseRequestSignal` with the request's controller.
 */
const cleanups = new WeakMap();
const registry = typeof globalThis.FinalizationRegistry === 'function' ?
    new globalThis.FinalizationRegistry((controller) => releaseRequestSignal(controller))
    : null;
// Module-scope factory so the cleanup closure captures exactly the signal and
// the listener - built at the `fetchWithTimeout` call site it would share that
// scope's context and retain the request body for as long as the cleanup is
// held (same reason `_makeAbort` exists in client.ts).
function makeCleanup(signal, listener) {
    return () => signal.removeEventListener('abort', listener);
}
function registerRequestSignalCleanup(controller, signal, listener) {
    cleanups.set(controller, makeCleanup(signal, listener));
}
// The registered target is the response BODY, not the Response: a caller can
// keep a reader on the body and drop the Response wrapper (`.asResponse()`),
// and the listener must survive for as long as anything can still read - the
// body is what a live read keeps alive.
function armAbandonmentBackstop(body, controller) {
    if (cleanups.has(controller))
        registry?.register(body, controller, controller);
}
function releaseRequestSignal(controller) {
    const cleanup = cleanups.get(controller);
    if (cleanup) {
        cleanups.delete(controller);
        registry?.unregister(controller);
        cleanup();
    }
}
//# sourceMappingURL=request-signal.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/shims.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
function getDefaultFetch() {
    if (typeof fetch !== 'undefined') {
        return fetch;
    }
    throw new Error('`fetch` is not defined as a global; Either pass `fetch` to the client, `new Anthropic({ fetch })` or polyfill the global, `globalThis.fetch = fetch`');
}
function makeReadableStream(...args) {
    const ReadableStream = globalThis.ReadableStream;
    if (typeof ReadableStream === 'undefined') {
        // Note: All of the platforms / runtimes we officially support already define
        // `ReadableStream` as a global, so this should only ever be hit on unsupported runtimes.
        throw new Error('`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`');
    }
    return new ReadableStream(...args);
}
function ReadableStreamFrom(iterable) {
    let iter = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
    return makeReadableStream({
        start() { },
        async pull(controller) {
            const { done, value } = await iter.next();
            if (done) {
                controller.close();
            }
            else {
                controller.enqueue(value);
            }
        },
        async cancel() {
            await iter.return?.();
        },
    });
}
/**
 * Most browsers don't yet have async iterable support for ReadableStream,
 * and Node has a very different way of reading bytes from its "ReadableStream".
 *
 * This polyfill was pulled from https://github.com/MattiasBuelens/web-streams-polyfill/pull/122#issuecomment-1627354490
 */
function ReadableStreamToAsyncIterable(stream) {
    if (stream[Symbol.asyncIterator])
        return stream;
    const reader = stream.getReader();
    return {
        async next() {
            try {
                const result = await reader.read();
                if (result?.done)
                    reader.releaseLock(); // release lock when stream becomes closed
                return result;
            }
            catch (e) {
                reader.releaseLock(); // release lock when stream becomes errored
                throw e;
            }
        },
        async return() {
            const cancelPromise = reader.cancel();
            reader.releaseLock();
            await cancelPromise;
            return { done: true, value: undefined };
        },
        [Symbol.asyncIterator]() {
            return this;
        },
    };
}
/**
 * Cancels a ReadableStream we don't need to consume.
 * See https://undici.nodejs.org/#/?id=garbage-collection
 */
async function CancelReadableStream(stream) {
    if (stream === null || typeof stream !== 'object')
        return;
    if (stream[Symbol.asyncIterator]) {
        await stream[Symbol.asyncIterator]().return?.();
        return;
    }
    const reader = stream.getReader();
    const cancelPromise = reader.cancel();
    reader.releaseLock();
    await cancelPromise;
}
//# sourceMappingURL=shims.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/request-options.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
/**
 * Tracks which fallback a sequence of requests is pinned to.
 *
 * Create one (`new BetaFallbackState()`) and pass it via the `fallbackState`
 * request option on every request that should share the pin — the turns of one
 * conversation, or any wider scope the stickiness should apply to;
 * `betaRefusalFallbackMiddleware` mutates it in place when a model refuses.
 */
class BetaFallbackState {
}
const FallbackEncoder = ({ headers, body }) => {
    return {
        bodyHeaders: {
            'content-type': 'application/json',
        },
        body: JSON.stringify(body),
    };
};
//# sourceMappingURL=request-options.mjs.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/query.mjs + 3 modules
var utils_query = __webpack_require__(96706);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/core/error.mjs
var core_error = __webpack_require__(79491);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/credentials/types.mjs

const GRANT_TYPE_JWT_BEARER = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
const GRANT_TYPE_REFRESH_TOKEN = 'refresh_token';
const TOKEN_ENDPOINT = '/v1/oauth/token';
/**
 * `anthropic-beta` value required on authenticated API requests using an
 * OAuth bearer token, and on `refresh_token` grants against the token endpoint.
 */
const OAUTH_API_BETA_HEADER = 'oauth-2025-04-20';
/**
 * `anthropic-beta` value required on jwt-bearer exchanges against the token
 * endpoint. It routes the request to the federation service; it must NOT be
 * sent on `refresh_token` grants, which are handled by a different backend.
 */
const FEDERATION_BETA_HEADER = 'oidc-federation-2026-04-01';
const ADVISORY_REFRESH_THRESHOLD_IN_SECONDS = 120;
const MANDATORY_REFRESH_THRESHOLD_IN_SECONDS = 30;
const ADVISORY_REFRESH_BACKOFF_IN_SECONDS = 5;
const MAX_TOKEN_RESPONSE_BYTES = 1 << 20;
/**
 * Rejects base URLs that would cause a JWT assertion or refresh token to be
 * sent over cleartext HTTP. Loopback hosts are allowed for local development.
 */
function requireSecureTokenEndpoint(baseURL) {
    if (!baseURL)
        return;
    let u;
    try {
        u = new URL(baseURL);
    }
    catch (err) {
        throw new WorkloadIdentityError(`Invalid token endpoint base URL "${baseURL}": ${err}`);
    }
    if (u.protocol === 'https:')
        return;
    // WHATWG URL.hostname returns bracketed IPv6 ("[::1]"); Go's net/url strips them.
    const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (u.protocol === 'http:' && (host === 'localhost' || host === '127.0.0.1' || host === '::1')) {
        return;
    }
    throw new WorkloadIdentityError(`Refusing to send credential over non-https token endpoint "${baseURL}"`);
}
/**
 * Reads the response body as text, parses it as a token-endpoint JSON
 * response, validates `access_token` is present, and rejects a non-Bearer
 * `token_type` when one is provided. Reads at most
 * {@link MAX_TOKEN_RESPONSE_BYTES} from the body stream.
 */
async function parseTokenResponse(resp, requestId) {
    const text = await readLimitedText(resp);
    let data;
    try {
        data = JSON.parse(text);
    }
    catch {
        throw new WorkloadIdentityError(`Token endpoint returned non-JSON response (status ${resp.status})`, resp.status, redactSensitive(text), requestId);
    }
    if (!data.access_token) {
        throw new WorkloadIdentityError(`Token endpoint response missing access_token: ${JSON.stringify(redactSensitive(data))}`, resp.status, redactSensitive(data), requestId);
    }
    if (data.token_type && data.token_type.toLowerCase() !== 'bearer') {
        throw new WorkloadIdentityError(`Token endpoint response: unsupported token_type "${data.token_type}" (want Bearer)`, resp.status, redactSensitive(data), requestId);
    }
    return data;
}
const MAX_ERROR_BODY_CHARS = 2000;
// RFC 6749 §5.2 standard error-response fields. Anything else in a token
// endpoint error body is potentially echoed input (assertion, refresh_token,
// access_token, …) and is dropped rather than allowlisted-with-exceptions.
const SAFE_ERROR_KEYS = new Set(['error', 'error_description', 'error_uri']);
/**
 * Returns a redacted copy of a token-endpoint error body for safe inclusion
 * in an exception. Strings are truncated; objects keep only the RFC 6749
 * §5.2 error fields.
 */
function redactSensitive(body) {
    if (body == null)
        return body;
    if (typeof body === 'string') {
        let parsed;
        try {
            parsed = JSON.parse(body);
        }
        catch {
            if (body.length <= MAX_ERROR_BODY_CHARS)
                return body;
            return body.slice(0, MAX_ERROR_BODY_CHARS) + `... <${body.length - MAX_ERROR_BODY_CHARS} more chars>`;
        }
        return JSON.stringify(redactSensitive(parsed));
    }
    if (typeof body === 'object' && !Array.isArray(body)) {
        const out = {};
        for (const [k, v] of Object.entries(body)) {
            if (SAFE_ERROR_KEYS.has(k))
                out[k] = v;
        }
        return out;
    }
    return null;
}
/**
 * Best-effort safety check on a credentials file before reading it.
 *
 * On POSIX: resolves symlinks (so containerized deployments that mount the
 * credential as a symlink to a tmpfs-backed file keep working), then rejects
 * the resolved target if it is group- or world- readable or writable. A uid
 * mismatch on the resolved target is surfaced via `onWarn` since
 * root-written/app-read is common in init-container setups. No-op on Windows.
 */
async function checkCredentialsFileSafety(path, onWarn = (m) => console.warn(`anthropic-sdk: ${m}`)) {
    if (typeof process === 'undefined' || process.platform === 'win32')
        return;
    const { fs } = await __webpack_require__.e(/* import() */ 117).then(__webpack_require__.bind(__webpack_require__, 82117));
    let resolved = path;
    let st;
    try {
        resolved = await fs.promises.realpath(path);
        st = await fs.promises.stat(resolved);
    }
    catch {
        return; // ENOENT etc — let the subsequent read surface a precise error
    }
    const mode = st.mode & 0o777;
    // 0o022 = group/world write; 0o044 = group/world read.
    if (mode & 0o022) {
        throw new WorkloadIdentityError(`Credentials file at ${resolved} is group/world-writable (mode 0o${mode.toString(8)}); ` +
            `this allows other local users to plant tokens. Run \`chmod 600 ${resolved}\`.`);
    }
    if (mode & 0o044) {
        throw new WorkloadIdentityError(`Credentials file at ${resolved} is group/world-readable (mode 0o${mode.toString(8)}); ` +
            `run \`chmod 600 ${resolved}\` before retrying.`);
    }
    if (typeof process.getuid === 'function' && st.uid !== process.getuid()) {
        onWarn(`credentials file at ${resolved} is owned by uid ${st.uid} (current process uid ${process.getuid()}); ` + `verify this is intentional.`);
    }
}
/**
 * Atomically writes JSON to `targetPath` via a `.tmp` sibling + rename,
 * with fsync on the file and (best-effort) on the parent directory.
 * Creates the parent directory with mode 0700 and the file with mode 0600.
 */
async function writeCredentialsFileAtomic(targetPath, data) {
    const { fs, path } = await __webpack_require__.e(/* import() */ 117).then(__webpack_require__.bind(__webpack_require__, 82117));
    const dir = path.dirname(targetPath);
    await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
    // Unique temp name avoids two concurrent writers (different processes or
    // SDK instances) racing on the same '.tmp' sibling and corrupting each
    // other's bytes mid-write before the rename.
    const tmpPath = `${targetPath}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
    try {
        const fh = await fs.promises.open(tmpPath, 'w', 0o600);
        try {
            await fh.writeFile(JSON.stringify(data, null, 2));
            await fh.sync();
        }
        finally {
            await fh.close();
        }
        await fs.promises.rename(tmpPath, targetPath);
    }
    catch (err) {
        // Don't leak the temp file if anything between create and rename failed.
        await fs.promises.unlink(tmpPath).catch(() => { });
        throw err;
    }
    // fsync the parent directory so the rename survives a crash.
    try {
        const dirFh = await fs.promises.open(dir, 'r');
        try {
            await dirFh.sync();
        }
        finally {
            await dirFh.close();
        }
    }
    catch {
        // Directory fsync is best-effort (unsupported on some platforms, e.g. Windows).
    }
}
async function readLimitedText(resp) {
    if (!resp.body) {
        return '';
    }
    const reader = resp.body.getReader();
    const chunks = [];
    let received = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done)
            break;
        if (received + value.length > MAX_TOKEN_RESPONSE_BYTES) {
            const remaining = MAX_TOKEN_RESPONSE_BYTES - received;
            if (remaining > 0)
                chunks.push(value.subarray(0, remaining));
            await reader.cancel();
            break;
        }
        chunks.push(value);
        received += value.length;
    }
    let merged;
    if (chunks.length === 1) {
        merged = chunks[0];
    }
    else {
        merged = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
        let offset = 0;
        for (const c of chunks) {
            merged.set(c, offset);
            offset += c.length;
        }
    }
    return new TextDecoder('utf-8').decode(merged);
}
class WorkloadIdentityError extends core_error/* AnthropicError */.pJ {
    constructor(message, statusCode = null, body = null, requestId = null) {
        super(message);
        this.statusCode = statusCode;
        this.body = body;
        this.requestId = requestId;
    }
}
//# sourceMappingURL=types.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/time.mjs
/** Current time as unix epoch seconds. */
function nowAsSeconds() {
    return Math.floor(Date.now() / 1000);
}
//# sourceMappingURL=time.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/credentials/token-cache.mjs


/**
 * Wraps an {@link AccessTokenProvider} with two-tier proactive refresh
 * and concurrent deduplication.
 *
 * Refresh policy on each {@link getToken} call:
 *
 * - No cached token → call provider (blocking), cache, return.
 * - Cached with `expiresAt == null` → return cached forever.
 * - More than 120s remaining → return cached.
 * - 30–120s remaining (advisory window) → return stale token immediately,
 *   kick off background refresh. On failure, log and keep stale.
 * - Less than 30s remaining or expired (mandatory) → block and refresh.
 *   On failure, throw.
 *
 * Concurrent mandatory callers coalesce into a single provider call.
 */
class TokenCache {
    constructor(provider, onAdvisoryRefreshError) {
        this.cached = null;
        this.pendingRefresh = null;
        this.nextForce = false;
        this.lastAdvisoryError = 0;
        this.provider = provider;
        this.onAdvisoryRefreshError = onAdvisoryRefreshError;
    }
    async getToken() {
        const force = this.nextForce;
        this.nextForce = false;
        const cached = this.cached;
        if (force || cached == null) {
            const token = await this.refresh(force);
            return token.token;
        }
        if (cached.expiresAt == null) {
            return cached.token;
        }
        const remaining = cached.expiresAt - nowAsSeconds();
        if (remaining > ADVISORY_REFRESH_THRESHOLD_IN_SECONDS) {
            return cached.token;
        }
        if (remaining > MANDATORY_REFRESH_THRESHOLD_IN_SECONDS) {
            this.backgroundRefresh();
            return cached.token;
        }
        const token = await this.refresh();
        return token.token;
    }
    /**
     * Clears the cached token and marks the next {@link getToken} as a forced
     * refresh, so the underlying provider bypasses any on-disk freshness check.
     * Called after a 401 — the server has just told us the token is bad even
     * if its `expires_at` still looks fresh.
     */
    invalidate() {
        this.cached = null;
        this.nextForce = true;
    }
    /**
     * Mandatory refresh. Joins any in-flight refresh unless forced — a forced
     * refresh must not coalesce into a non-forced one that may re-serve the
     * same stale disk token.
     */
    refresh(force = false) {
        if (this.pendingRefresh && !force) {
            return this.pendingRefresh;
        }
        return this.doRefresh(force);
    }
    /**
     * Advisory background refresh. Shares the same in-flight promise as
     * mandatory refreshes for deduplication, but swallows errors so the
     * stale cached token keeps being served. Backs off for
     * {@link ADVISORY_REFRESH_BACKOFF_IN_SECONDS} after a failure so an
     * outage during the advisory window doesn't hammer the token endpoint.
     */
    backgroundRefresh() {
        if (this.pendingRefresh) {
            return;
        }
        if (nowAsSeconds() - this.lastAdvisoryError < ADVISORY_REFRESH_BACKOFF_IN_SECONDS) {
            return;
        }
        this.doRefresh().catch((err) => {
            this.lastAdvisoryError = nowAsSeconds();
            // Advisory failure: keep serving the stale cached token, but surface
            // the error to the caller-provided hook so it can be logged.
            this.onAdvisoryRefreshError?.(err);
        });
    }
    /**
     * Core refresh. Sets {@link pendingRefresh} so concurrent callers
     * (both advisory and mandatory) coalesce into a single provider call.
     */
    doRefresh(force = false) {
        this.pendingRefresh = this.provider(force ? { forceRefresh: true } : undefined).then((token) => {
            this.cached = token;
            this.pendingRefresh = null;
            return token;
        }, (err) => {
            this.pendingRefresh = null;
            throw err;
        });
        return this.pendingRefresh;
    }
}
//# sourceMappingURL=token-cache.mjs.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/env.mjs
var env = __webpack_require__(44424);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils.mjs
var utils = __webpack_require__(83280);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/core/credentials.mjs


/** Current schema version written to `configs/<profile>.json`. Absent on read ⇒ "1.0". */
const CONFIG_FILE_VERSION = '1.0';
/** Current schema version written to `credentials/<profile>.json`. Absent on read ⇒ "1.0". */
const CREDENTIALS_FILE_VERSION = '1.0';
const PROFILE_NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;
function validateProfileName(name) {
    if (!name) {
        throw new Error('profile name is empty');
    }
    if (name === '.' || name === '..') {
        throw new Error(`profile name "${name}" is not allowed`);
    }
    if (name.includes('/') || name.includes('\\')) {
        throw new Error(`profile name "${name}" must not contain path separators`);
    }
    if (!PROFILE_NAME_PATTERN.test(name)) {
        throw new Error(`profile name "${name}" contains disallowed characters (allowed: letters, digits, '_', '.', '-')`);
    }
}
/**
 * Loads the Anthropic configuration for the given (or active) profile.
 *
 * Returns `null` when running in a browser or no configuration can be resolved.
 * Otherwise, returns the configuration based on the config file and environment variables.
 *
 * **Profile resolution** (first match wins):
 *   1. Explicit `profile` argument
 *   2. `ANTHROPIC_PROFILE` environment variable
 *   3. Contents of `<config_dir>/active_config` file
 *   4. `"default"`
 *
 * **Config resolution:**
 *   - If `<config_dir>/configs/<profile>.json` exists, it is loaded and
 *     missing fields are filled from environment variables. Values present
 *     in the file take precedence — env vars only fill gaps:
 *       - `ANTHROPIC_BASE_URL` → `base_url`
 *       - `ANTHROPIC_ORGANIZATION_ID` → `organization_id`
 *       - `ANTHROPIC_WORKSPACE_ID` → `workspace_id`
 *       - `ANTHROPIC_SCOPE` → `authentication.scope`
 *       - `ANTHROPIC_FEDERATION_RULE_ID` → `authentication.federation_rule_id` (oidc_federation)
 *       - `ANTHROPIC_IDENTITY_TOKEN_FILE` → `authentication.identity_token` (oidc_federation)
 *       - `ANTHROPIC_SERVICE_ACCOUNT_ID` → `authentication.service_account_id` (oidc_federation)
 *   - If no config file exists, an `oidc_federation` config is synthesized
 *     entirely from environment variables when both `ANTHROPIC_FEDERATION_RULE_ID`
 *     and `ANTHROPIC_ORGANIZATION_ID` are set.
 */
const loadConfig = async (profile) => {
    return (await loadConfigWithSource(profile))?.config ?? null;
};
/**
 * Same as {@link loadConfig}, but also reports whether the config was loaded
 * from a profile file on disk (`fromFile: true`) or synthesized entirely from
 * environment variables (`fromFile: false`).
 */
const loadConfigWithSource = async (profile) => {
    var _a, _b;
    const rootConfigPath = await getRootConfigPath();
    if (rootConfigPath === null) {
        return null;
    }
    const profileName = profile ?? (await getActiveProfileName());
    if (profileName === null) {
        return null;
    }
    validateProfileName(profileName);
    const { fs, path } = await __webpack_require__.e(/* import() */ 117).then(__webpack_require__.bind(__webpack_require__, 82117));
    const configPath = path.join(rootConfigPath, 'configs', `${profileName}.json`);
    let configRaw;
    try {
        configRaw = await fs.promises.readFile(configPath, 'utf-8');
    }
    catch (err) {
        if (err?.code !== 'ENOENT') {
            throw new Error(`failed to read config file ${configPath}: ${err}`);
        }
        configRaw = null;
    }
    if (configRaw === null) {
        const organizationId = (0,utils/* readEnv */.sx)('ANTHROPIC_ORGANIZATION_ID');
        const identityTokenFile = (0,utils/* readEnv */.sx)('ANTHROPIC_IDENTITY_TOKEN_FILE');
        const federationRuleId = (0,utils/* readEnv */.sx)('ANTHROPIC_FEDERATION_RULE_ID');
        if (federationRuleId && organizationId) {
            return {
                fromFile: false,
                config: {
                    organization_id: organizationId,
                    // A defaulted-but-empty CI variable (`ANTHROPIC_WORKSPACE_ID=""`) is
                    // treated as unset — readEnv coerces empty to undefined, and the body
                    // builder's truthy check skips it — so `"workspace_id": ""` never goes
                    // on the wire.
                    workspace_id: (0,utils/* readEnv */.sx)('ANTHROPIC_WORKSPACE_ID'),
                    base_url: (0,utils/* readEnv */.sx)('ANTHROPIC_BASE_URL'),
                    authentication: {
                        type: 'oidc_federation',
                        federation_rule_id: federationRuleId,
                        service_account_id: (0,utils/* readEnv */.sx)('ANTHROPIC_SERVICE_ACCOUNT_ID'),
                        identity_token: identityTokenFile ? { source: 'file', path: identityTokenFile } : undefined,
                        scope: (0,utils/* readEnv */.sx)('ANTHROPIC_SCOPE'),
                    },
                },
            };
        }
        return null;
    }
    let config;
    try {
        config = JSON.parse(configRaw);
    }
    catch (err) {
        throw new Error(`failed to parse config file ${configPath}: ${err}`);
    }
    if (!config.authentication) {
        throw new Error(`config file ${configPath} is missing "authentication"`);
    }
    const authType = config.authentication.type;
    if (authType !== 'oidc_federation' && authType !== 'user_oauth') {
        throw new Error(`authentication.type "${authType}" is not a known authentication type`);
    }
    // File values are authoritative; env vars only fill fields the file left unset.
    config.organization_id ?? (config.organization_id = (0,utils/* readEnv */.sx)('ANTHROPIC_ORGANIZATION_ID'));
    config.workspace_id ?? (config.workspace_id = (0,utils/* readEnv */.sx)('ANTHROPIC_WORKSPACE_ID'));
    config.base_url ?? (config.base_url = (0,utils/* readEnv */.sx)('ANTHROPIC_BASE_URL'));
    (_a = config.authentication).scope ?? (_a.scope = (0,utils/* readEnv */.sx)('ANTHROPIC_SCOPE'));
    if (config.authentication.type === 'oidc_federation') {
        if (!config.authentication.identity_token) {
            const identityTokenFile = (0,utils/* readEnv */.sx)('ANTHROPIC_IDENTITY_TOKEN_FILE');
            if (identityTokenFile) {
                config.authentication.identity_token = {
                    source: 'file',
                    path: identityTokenFile,
                };
            }
        }
        // Unlike siblings using `??= readEnv()` (which leaves `undefined`), coerce
        // to '' so the type stays `string` (always set). The downstream required
        // check in credential-chain rejects empty, so semantics match but types are
        // cleaner.
        if (!config.authentication.federation_rule_id) {
            config.authentication.federation_rule_id = (0,utils/* readEnv */.sx)('ANTHROPIC_FEDERATION_RULE_ID') ?? '';
        }
        (_b = config.authentication).service_account_id ?? (_b.service_account_id = (0,utils/* readEnv */.sx)('ANTHROPIC_SERVICE_ACCOUNT_ID'));
    }
    return { config, fromFile: true };
};
/**
 * Loads the credential material for the active profile.
 *
 * Returns the parsed credentials or `null` when running in a browser or
 * no credentials file can be found.
 *
 * **Profile resolution** (first match wins):
 *   1. `ANTHROPIC_PROFILE` environment variable
 *   2. Contents of `<config_dir>/active_config` file
 *   3. `"default"`
 *
 * **Credentials path resolution** (first match wins):
 *   1. `authentication.credentials_path` from the active profile's config (via {@link loadConfig})
 *   2. `<config_dir>/credentials/<profile>.json`
 */
const loadCredentials = async () => {
    const config = await loadConfig();
    const credentialsPath = await getCredentialsPath(config);
    if (!credentialsPath) {
        return null;
    }
    const { fs } = await __webpack_require__.e(/* import() */ 117).then(__webpack_require__.bind(__webpack_require__, 82117));
    let raw;
    try {
        raw = await fs.promises.readFile(credentialsPath, 'utf-8');
    }
    catch (err) {
        if (err?.code !== 'ENOENT') {
            throw new Error(`failed to read credentials file ${credentialsPath}: ${err}`);
        }
        return null;
    }
    let creds;
    try {
        creds = JSON.parse(raw);
    }
    catch (err) {
        throw new Error(`failed to parse credentials file ${credentialsPath}: ${err}`);
    }
    if (creds.type && creds.type !== 'oauth_token') {
        throw new Error(`credentials file ${credentialsPath} has unsupported type "${creds.type}" (want "oauth_token")`);
    }
    return creds;
};
/**
 * Resolves the credentials file path for the given config.
 *
 * Uses `authentication.credentials_path` from the config if set, otherwise
 * falls back to `<config_dir>/credentials/<profile>.json`.
 *
 * Returns `null` when running in a browser or the path cannot be resolved.
 */
const getCredentialsPath = async (config, profile) => {
    if (config?.authentication.credentials_path) {
        return config.authentication.credentials_path;
    }
    const rootConfigPath = await getRootConfigPath();
    if (!rootConfigPath) {
        return null;
    }
    const profileName = profile ?? (await getActiveProfileName());
    if (!profileName) {
        return null;
    }
    validateProfileName(profileName);
    const { path } = await __webpack_require__.e(/* import() */ 117).then(__webpack_require__.bind(__webpack_require__, 82117));
    return path.join(rootConfigPath, 'credentials', `${profileName}.json`);
};
const getRootConfigPath = async () => {
    if (!supportsLocalConfigFiles()) {
        return null;
    }
    const { path } = await __webpack_require__.e(/* import() */ 117).then(__webpack_require__.bind(__webpack_require__, 82117));
    // ANTHROPIC_CONFIG_DIR is treated as a trusted path: it is set by the
    // process operator, not by remote input, so it is not validated.
    const configDir = (0,utils/* readEnv */.sx)('ANTHROPIC_CONFIG_DIR');
    if (configDir) {
        return configDir;
    }
    const os = getPlatformHeaders()['X-Stainless-OS'];
    if (os === 'Windows') {
        const appData = (0,utils/* readEnv */.sx)('APPDATA');
        if (appData) {
            return path.join(appData, 'Anthropic');
        }
        const userProfile = (0,utils/* readEnv */.sx)('USERPROFILE');
        if (userProfile) {
            return path.join(userProfile, 'AppData', 'Roaming', 'Anthropic');
        }
        // No usable Windows config root — return null so callers fall through to
        // "no config available" rather than silently writing under C:\.
        return null;
    }
    const xdgConfigHome = (0,utils/* readEnv */.sx)('XDG_CONFIG_HOME');
    if (xdgConfigHome) {
        return path.join(xdgConfigHome, 'anthropic');
    }
    const home = (0,utils/* readEnv */.sx)('HOME');
    if (home) {
        return path.join(home, '.config', 'anthropic');
    }
    return null;
};
const supportsLocalConfigFiles = () => {
    const runtime = getPlatformHeaders()['X-Stainless-Runtime'];
    return runtime === 'node' || runtime === 'deno';
};
const getActiveProfileName = async () => {
    const rootConfigPath = await getRootConfigPath();
    if (!rootConfigPath) {
        return null;
    }
    const profileName = (0,utils/* readEnv */.sx)('ANTHROPIC_PROFILE');
    if (profileName) {
        return profileName;
    }
    const { fs, path } = await __webpack_require__.e(/* import() */ 117).then(__webpack_require__.bind(__webpack_require__, 82117));
    const filePath = path.join(rootConfigPath, 'active_config');
    try {
        return (await fs.promises.readFile(filePath, 'utf-8')).trim() || 'default';
    }
    catch (err) {
        if (err?.code !== 'ENOENT') {
            throw new Error(`failed to read ${filePath}: ${err}`);
        }
        return 'default';
    }
};
//# sourceMappingURL=credentials.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/credentials/identity-token.mjs

/**
 * Reads a JWT from a file on every call. Supports automatic rotation
 * (e.g. Kubernetes projected service-account tokens).
 */
function identityTokenFromFile(path) {
    if (!path) {
        throw new core_error/* AnthropicError */.pJ('Identity token file path is empty');
    }
    return async () => {
        const { fs } = await __webpack_require__.e(/* import() */ 117).then(__webpack_require__.bind(__webpack_require__, 82117));
        let content;
        try {
            content = await fs.promises.readFile(path, 'utf-8');
        }
        catch (err) {
            throw new core_error/* AnthropicError */.pJ(`Failed to read identity token file at ${path}: ${err}`);
        }
        const token = content.trim();
        if (!token) {
            throw new core_error/* AnthropicError */.pJ(`Identity token file at ${path} is empty`);
        }
        return token;
    };
}
/**
 * Wraps a static JWT string as an {@link IdentityTokenProvider}.
 */
function identityTokenFromValue(token) {
    if (!token) {
        throw new core_error/* AnthropicError */.pJ('Identity token value is empty');
    }
    return () => token;
}
//# sourceMappingURL=identity-token.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/credentials/oidc-federation.mjs



/**
 * Exchanges an external OIDC JWT for an Anthropic access token via the
 * RFC 7523 jwt-bearer grant.
 *
 * Each invocation performs a fresh token exchange. Wrap in a
 * {@link TokenCache} to avoid exchanging on every request.
 *
 * Federation grants do not return a refresh token — callers re-exchange
 * their assertion on expiry.
 */
function oidcFederationProvider(config) {
    return async () => {
        requireSecureTokenEndpoint(config.baseURL);
        const jwt = await config.identityTokenProvider();
        // The token endpoint enforces a 16 KiB assertion limit; surface a clear
        // client-side error so misconfigured projected-token sources are
        // diagnosable without a server round-trip.
        if (jwt.length > 16 * 1024) {
            throw new WorkloadIdentityError(`Identity token is ${Math.ceil(jwt.length / 1024)} KiB, exceeds the 16 KiB assertion limit`);
        }
        const body = {
            grant_type: GRANT_TYPE_JWT_BEARER,
            assertion: jwt,
            federation_rule_id: config.federationRuleId,
            organization_id: config.organizationId,
        };
        if (config.serviceAccountId) {
            body['service_account_id'] = config.serviceAccountId;
        }
        if (config.workspaceId) {
            body['workspace_id'] = config.workspaceId;
        }
        const url = `${config.baseURL}${TOKEN_ENDPOINT}`;
        let resp;
        try {
            resp = await config.fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'anthropic-beta': `${OAUTH_API_BETA_HEADER},${FEDERATION_BETA_HEADER}`,
                    'User-Agent': config.userAgent || `anthropic-sdk-typescript/${VERSION} oidcFederationProvider`,
                },
                body: JSON.stringify(body),
            });
        }
        catch (err) {
            throw new WorkloadIdentityError(`Failed to reach token endpoint ${url}: ${err}`);
        }
        const requestId = resp.headers.get('Request-Id');
        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            const redacted = redactSensitive(text);
            // A 401 is hard to debug from the status code alone, so surface
            // guidance: check the federation rule, optionally set a workspace ID
            // (the most common fix when no workspaceId is configured), and point at
            // the Workload identity page in Claude Console for the server-side
            // authentication event log. Other statuses (5xx, 400, ...) get no hint.
            let hint = '';
            if (resp.status === 401) {
                const hintMiddle = config.workspaceId ? '' : ("If your federation rule is scoped to multiple workspaces, set the ANTHROPIC_WORKSPACE_ID environment variable, the 'workspace_id' config key, or the `workspaceId` option. ");
                hint = ` Ensure your federation rule matches your identity token. ${hintMiddle}View your authentication events in the Workload identity page of Claude Console for more details.`;
            }
            throw new WorkloadIdentityError(`Token exchange failed with status ${resp.status}${requestId ? ` (request-id ${requestId})` : ''}: ${redacted}${hint}`, resp.status, redacted, requestId);
        }
        const data = await parseTokenResponse(resp, requestId);
        const expiresIn = Number(data.expires_in);
        if (!Number.isFinite(expiresIn)) {
            throw new WorkloadIdentityError(`Token endpoint response missing required fields: ${JSON.stringify(redactSensitive(data))}`, resp.status, redactSensitive(data), requestId);
        }
        return {
            token: data.access_token,
            expiresAt: nowAsSeconds() + expiresIn,
        };
    };
}
//# sourceMappingURL=oidc-federation.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/credentials/user-oauth.mjs




/**
 * Reads a user-oauth credential file. Returns the cached access token while
 * fresh; on expiry performs a `refresh_token` grant and writes the new
 * tokens back to the credentials file (atomic replace, fsync'd).
 *
 * If `clientId` is empty, the access token is treated as static — the
 * credentials file is read on every call but no refresh is attempted, and
 * an expired token without a `refresh_token` raises.
 */
function userOAuthProvider(config) {
    return async (opts) => {
        const { fs } = await __webpack_require__.e(/* import() */ 117).then(__webpack_require__.bind(__webpack_require__, 82117));
        await checkCredentialsFileSafety(config.credentialsPath, config.onSafetyWarning);
        let raw;
        try {
            raw = await fs.promises.readFile(config.credentialsPath, 'utf-8');
        }
        catch (err) {
            throw new WorkloadIdentityError(`Credentials file not found at ${config.credentialsPath}: ${err}`);
        }
        let creds;
        try {
            creds = JSON.parse(raw);
        }
        catch (err) {
            throw new WorkloadIdentityError(`Credentials file at ${config.credentialsPath} is not valid JSON: ${err}`);
        }
        const accessToken = creds.access_token;
        if (!accessToken) {
            throw new WorkloadIdentityError(`Credentials file at ${config.credentialsPath} must include 'access_token'`);
        }
        // Return cached token if still fresh (or no expiry info), unless the
        // caller is forcing a refresh after a 401 — then go straight to refresh
        // even if the file's expires_at still looks valid.
        const expiresAt = creds.expires_at;
        if (!opts?.forceRefresh &&
            (expiresAt == null || nowAsSeconds() < expiresAt - MANDATORY_REFRESH_THRESHOLD_IN_SECONDS)) {
            return { token: accessToken, expiresAt: expiresAt ?? null };
        }
        const refreshToken = creds.refresh_token;
        if (!config.clientId || !refreshToken) {
            throw new WorkloadIdentityError(`Access token at ${config.credentialsPath} has expired and no refresh is available ` +
                `(client_id ${config.clientId ? 'set' : 'empty'}, refresh_token ${refreshToken ? 'set' : 'empty'})`);
        }
        requireSecureTokenEndpoint(config.baseURL);
        const body = {
            grant_type: GRANT_TYPE_REFRESH_TOKEN,
            refresh_token: refreshToken,
            client_id: config.clientId,
        };
        const url = `${config.baseURL}${TOKEN_ENDPOINT}`;
        let resp;
        try {
            resp = await config.fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'anthropic-beta': OAUTH_API_BETA_HEADER,
                    'User-Agent': config.userAgent || `anthropic-sdk-typescript/${VERSION} userOAuthProvider`,
                },
                body: JSON.stringify(body),
            });
        }
        catch (err) {
            throw new WorkloadIdentityError(`User OAuth refresh failed to reach token endpoint: ${err}`);
        }
        const requestId = resp.headers.get('Request-Id');
        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            throw new WorkloadIdentityError(`User OAuth refresh failed (HTTP ${resp.status}): ${redactSensitive(text)}`, resp.status, redactSensitive(text), requestId);
        }
        const data = await parseTokenResponse(resp, requestId);
        const expiresIn = Number(data.expires_in);
        if (!Number.isFinite(expiresIn)) {
            throw new WorkloadIdentityError(`User OAuth refresh response missing or invalid expires_in: ${JSON.stringify(redactSensitive(data))}`, resp.status, redactSensitive(data), requestId);
        }
        const newExpiresAt = nowAsSeconds() + expiresIn;
        const newRefreshToken = data.refresh_token || refreshToken;
        await writeCredentialsFileAtomic(config.credentialsPath, {
            ...creds,
            version: CREDENTIALS_FILE_VERSION,
            type: 'oauth_token',
            access_token: data.access_token,
            expires_at: newExpiresAt,
            refresh_token: newRefreshToken,
        });
        return { token: data.access_token, expiresAt: newExpiresAt };
    };
}
//# sourceMappingURL=user-oauth.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/credentials/credential-chain.mjs







function resolveCredentialsFromConfig(config, options) {
    const credentialsPath = config.authentication.credentials_path ?? null;
    const effectiveBaseURL = (config.base_url || options.baseURL).replace(/\/+$/, '');
    const provider = buildProvider(config, credentialsPath, effectiveBaseURL, options);
    const extraHeaders = {};
    // For federation profiles workspace_id is sent in the jwt-bearer exchange
    // body, not as a request header (the minted token is already
    // workspace-scoped, so the header would be ignored).
    if (config.workspace_id && config.authentication.type === 'user_oauth') {
        extraHeaders['anthropic-workspace-id'] = config.workspace_id;
    }
    // Surface the profile's own base_url (not the options.baseURL fallback) so
    // the client can adopt it for outbound API requests when the caller didn't
    // pin one explicitly. Echoing options.baseURL back would defeat precedence.
    return { provider, extraHeaders, baseURL: config.base_url || undefined };
}
/**
 * Resolves a {@link CredentialResult} from the environment. Returns `null`
 * when no credentials can be resolved.
 *
 * Resolution order:
 *
 *   1. Config file for the active profile (or the explicit `profile` argument)
 *      → dispatch on `authentication.type` (`oidc_federation`, `user_oauth`)
 *   2. Environment variables `ANTHROPIC_FEDERATION_RULE_ID` +
 *      `ANTHROPIC_ORGANIZATION_ID` (+ identity token) → OIDC federation
 *   3. Nothing matches → `null`
 *
 * Passing `profile` selects `<config_dir>/configs/<profile>.json` directly,
 * skipping `ANTHROPIC_PROFILE` / `active_config` resolution.
 */
async function defaultCredentials(options, profile) {
    const loaded = await loadConfigWithSource(profile);
    if (!loaded) {
        return null;
    }
    const { config, fromFile } = loaded;
    // For file-loaded configs, default credentials_path to the per-profile
    // location so user_oauth and federation caching work. Shallow-clone first
    // so callers that retain a reference to the loaded config don't observe the
    // patched-in default.
    //
    // Env-only credentials (no profile file on disk) skip the disk cache —
    // matching the other SDKs. A disk cache keyed by profile path would
    // re-serve a stale token after a change to ANTHROPIC_WORKSPACE_ID (or
    // ANTHROPIC_ORGANIZATION_ID / ANTHROPIC_FEDERATION_RULE_ID) until the
    // cached token expired, so the env-only chain stays in-memory only.
    const withPath = config.authentication.credentials_path || !fromFile ?
        config
        : {
            ...config,
            authentication: {
                ...config.authentication,
                credentials_path: (await getCredentialsPath(config, profile)) ?? undefined,
            },
        };
    return resolveCredentialsFromConfig(withPath, options);
}
function buildProvider(config, credentialsPath, baseURL, options) {
    switch (config.authentication.type) {
        case 'oidc_federation': {
            const auth = config.authentication;
            const identityProvider = resolveIdentityTokenProvider(auth);
            if (!identityProvider) {
                throw new WorkloadIdentityError('oidc_federation config requires an identity token (set authentication.identity_token, ' +
                    'ANTHROPIC_IDENTITY_TOKEN_FILE, or ANTHROPIC_IDENTITY_TOKEN)');
            }
            if (!auth.federation_rule_id) {
                throw new WorkloadIdentityError("oidc_federation config requires 'federation_rule_id'. Set it in authentication.federation_rule_id in your profile, or via ANTHROPIC_FEDERATION_RULE_ID (profile takes precedence).");
            }
            if (!config.organization_id) {
                throw new WorkloadIdentityError('oidc_federation config requires organization_id (set ANTHROPIC_ORGANIZATION_ID or config.organization_id)');
            }
            const exchange = oidcFederationProvider({
                identityTokenProvider: identityProvider,
                federationRuleId: auth.federation_rule_id,
                organizationId: config.organization_id,
                serviceAccountId: auth.service_account_id,
                workspaceId: config.workspace_id,
                baseURL,
                fetch: options.fetch,
                userAgent: options.userAgent,
            });
            // If there's a credentials file path, wrap the exchange with file caching
            // (check file for fresh token before exchanging, write back after).
            if (credentialsPath) {
                return cachedExchangeProvider(exchange, credentialsPath, options.onCacheWriteError, options.onSafetyWarning);
            }
            return exchange;
        }
        case 'user_oauth': {
            if (!credentialsPath) {
                throw new WorkloadIdentityError('user_oauth config requires authentication.credentials_path ' +
                    '(or load via a profile so it defaults to <config_dir>/credentials/<profile>.json)');
            }
            return userOAuthProvider({
                credentialsPath,
                clientId: config.authentication.client_id,
                baseURL,
                fetch: options.fetch,
                userAgent: options.userAgent,
                onSafetyWarning: options.onSafetyWarning,
            });
        }
        default: {
            const t = config.authentication.type;
            throw new WorkloadIdentityError(`authentication.type "${t}" is not a known authentication type`);
        }
    }
}
/**
 * Resolves the identity token provider from config fields or environment variables.
 *
 * Resolution order:
 *   1. `identity_token.path` from the config (source: "file")
 *   2. `ANTHROPIC_IDENTITY_TOKEN_FILE` env var
 *   3. `ANTHROPIC_IDENTITY_TOKEN` env var (static value)
 */
function resolveIdentityTokenProvider(auth) {
    if (auth.identity_token) {
        // Cast needed to stringify an unknown source value for the error message:
        // the on-disk JSON may contain a source this SDK version doesn't know about.
        const source = auth.identity_token.source;
        if (source !== 'file') {
            throw new WorkloadIdentityError(`identity_token.source "${source}" is not supported by this SDK version (only "file")`);
        }
        if (!auth.identity_token.path) {
            throw new WorkloadIdentityError(`identity_token.source "file" requires a non-empty path`);
        }
        return identityTokenFromFile(auth.identity_token.path);
    }
    const tokenFile = (0,env/* readEnv */.s)('ANTHROPIC_IDENTITY_TOKEN_FILE');
    if (tokenFile) {
        return identityTokenFromFile(tokenFile);
    }
    const tokenValue = (0,env/* readEnv */.s)('ANTHROPIC_IDENTITY_TOKEN');
    if (tokenValue) {
        return identityTokenFromValue(tokenValue);
    }
    return null;
}
/**
 * Wraps a federation exchange provider with credential file caching.
 * Checks the file for a fresh token before exchanging, and writes the
 * result back after a successful exchange (best-effort, atomic replace).
 *
 * Note: this is not cross-process serialized — two SDK instances that
 * miss the cache simultaneously will both perform a full exchange and
 * the last writer wins. That is acceptable: federation exchanges are
 * idempotent and the cache is an optimization, not a correctness gate.
 */
function cachedExchangeProvider(exchange, credentialsPath, onCacheWriteError, onSafetyWarning) {
    return async (opts) => {
        const { fs } = await __webpack_require__.e(/* import() */ 117).then(__webpack_require__.bind(__webpack_require__, 82117));
        await checkCredentialsFileSafety(credentialsPath, onSafetyWarning);
        // Try cached credentials file
        let existing;
        try {
            const raw = await fs.promises.readFile(credentialsPath, 'utf-8');
            existing = JSON.parse(raw);
            const token = existing?.['access_token'];
            if (token && !opts?.forceRefresh) {
                const expiresAt = existing?.['expires_at'];
                if (expiresAt == null || nowAsSeconds() < expiresAt - MANDATORY_REFRESH_THRESHOLD_IN_SECONDS) {
                    return { token, expiresAt: expiresAt ?? null };
                }
            }
        }
        catch (err) {
            // ENOENT or invalid-JSON → no usable cache, exchange fresh. Other
            // errors (EACCES, EISDIR, …) indicate a broken cache path; surface to
            // the optional hook so they're at least debuggable, then proceed.
            const code = err?.code;
            if (code !== 'ENOENT' && !(err instanceof SyntaxError)) {
                onCacheWriteError?.(err);
            }
        }
        // Exchange for a new token
        const result = await exchange(opts);
        // Write cache back (best-effort). Preserve any unknown keys from the
        // existing file (notably refresh_token, in the unlikely case this path
        // is shared with a user_oauth profile) so the federation cache writer
        // doesn't clobber material it didn't own.
        try {
            await writeCredentialsFileAtomic(credentialsPath, {
                ...(existing ?? {}),
                version: CREDENTIALS_FILE_VERSION,
                type: 'oauth_token',
                access_token: result.token,
                expires_at: result.expiresAt,
            });
        }
        catch (err) {
            // Best-effort caching: surface to the optional hook but never fail
            // the exchange itself.
            onCacheWriteError?.(err);
        }
        return result;
    };
}
//# sourceMappingURL=credential-chain.mjs.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/bytes.mjs
var utils_bytes = __webpack_require__(57424);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/decoders/line.mjs
var _LineDecoder_buffer, _LineDecoder_carriageReturnIndex;


/**
 * A re-implementation of httpx's `LineDecoder` in Python that handles incrementally
 * reading lines from text.
 *
 * https://github.com/encode/httpx/blob/920333ea98118e9cf617f246905d7b202510941c/httpx/_decoders.py#L258
 */
class LineDecoder {
    constructor() {
        _LineDecoder_buffer.set(this, void 0);
        _LineDecoder_carriageReturnIndex.set(this, void 0);
        (0,tslib/* __classPrivateFieldSet */.G)(this, _LineDecoder_buffer, new Uint8Array(), "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _LineDecoder_carriageReturnIndex, null, "f");
    }
    decode(chunk) {
        if (chunk == null) {
            return [];
        }
        const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk)
            : typeof chunk === 'string' ? (0,utils_bytes/* encodeUTF8 */.YH)(chunk)
                : chunk;
        (0,tslib/* __classPrivateFieldSet */.G)(this, _LineDecoder_buffer, (0,utils_bytes/* concatBytes */.Id)([(0,tslib/* __classPrivateFieldGet */.g)(this, _LineDecoder_buffer, "f"), binaryChunk]), "f");
        const lines = [];
        let patternIndex;
        while ((patternIndex = findNewlineIndex((0,tslib/* __classPrivateFieldGet */.g)(this, _LineDecoder_buffer, "f"), (0,tslib/* __classPrivateFieldGet */.g)(this, _LineDecoder_carriageReturnIndex, "f"))) != null) {
            if (patternIndex.carriage && (0,tslib/* __classPrivateFieldGet */.g)(this, _LineDecoder_carriageReturnIndex, "f") == null) {
                // skip until we either get a corresponding `\n`, a new `\r` or nothing
                (0,tslib/* __classPrivateFieldSet */.G)(this, _LineDecoder_carriageReturnIndex, patternIndex.index, "f");
                continue;
            }
            // we got double \r or \rtext\n
            if ((0,tslib/* __classPrivateFieldGet */.g)(this, _LineDecoder_carriageReturnIndex, "f") != null &&
                (patternIndex.index !== (0,tslib/* __classPrivateFieldGet */.g)(this, _LineDecoder_carriageReturnIndex, "f") + 1 || patternIndex.carriage)) {
                lines.push((0,utils_bytes/* decodeUTF8 */.CE)((0,tslib/* __classPrivateFieldGet */.g)(this, _LineDecoder_buffer, "f").subarray(0, (0,tslib/* __classPrivateFieldGet */.g)(this, _LineDecoder_carriageReturnIndex, "f") - 1)));
                (0,tslib/* __classPrivateFieldSet */.G)(this, _LineDecoder_buffer, (0,tslib/* __classPrivateFieldGet */.g)(this, _LineDecoder_buffer, "f").subarray((0,tslib/* __classPrivateFieldGet */.g)(this, _LineDecoder_carriageReturnIndex, "f")), "f");
                (0,tslib/* __classPrivateFieldSet */.G)(this, _LineDecoder_carriageReturnIndex, null, "f");
                continue;
            }
            const endIndex = (0,tslib/* __classPrivateFieldGet */.g)(this, _LineDecoder_carriageReturnIndex, "f") !== null ? patternIndex.preceding - 1 : patternIndex.preceding;
            const line = (0,utils_bytes/* decodeUTF8 */.CE)((0,tslib/* __classPrivateFieldGet */.g)(this, _LineDecoder_buffer, "f").subarray(0, endIndex));
            lines.push(line);
            (0,tslib/* __classPrivateFieldSet */.G)(this, _LineDecoder_buffer, (0,tslib/* __classPrivateFieldGet */.g)(this, _LineDecoder_buffer, "f").subarray(patternIndex.index), "f");
            (0,tslib/* __classPrivateFieldSet */.G)(this, _LineDecoder_carriageReturnIndex, null, "f");
        }
        return lines;
    }
    flush() {
        if (!(0,tslib/* __classPrivateFieldGet */.g)(this, _LineDecoder_buffer, "f").length) {
            return [];
        }
        return this.decode('\n');
    }
}
_LineDecoder_buffer = new WeakMap(), _LineDecoder_carriageReturnIndex = new WeakMap();
// prettier-ignore
LineDecoder.NEWLINE_CHARS = new Set(['\n', '\r']);
LineDecoder.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
/**
 * This function searches the buffer for the end patterns, (\r or \n)
 * and returns an object with the index preceding the matched newline and the
 * index after the newline char. `null` is returned if no new line is found.
 *
 * ```ts
 * findNewLineIndex('abc\ndef') -> { preceding: 2, index: 3 }
 * ```
 */
function findNewlineIndex(buffer, startIndex) {
    const newline = 0x0a; // \n
    const carriage = 0x0d; // \r
    for (let i = startIndex ?? 0; i < buffer.length; i++) {
        if (buffer[i] === newline) {
            return { preceding: i, index: i + 1, carriage: false };
        }
        if (buffer[i] === carriage) {
            return { preceding: i, index: i + 1, carriage: true };
        }
    }
    return null;
}
function findDoubleNewlineIndex(buffer) {
    // This function searches the buffer for the end patterns (\r\r, \n\n, \r\n\r\n)
    // and returns the index right after the first occurrence of any pattern,
    // or -1 if none of the patterns are found.
    const newline = 0x0a; // \n
    const carriage = 0x0d; // \r
    for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i] === newline && buffer[i + 1] === newline) {
            // \n\n
            return i + 2;
        }
        if (buffer[i] === carriage && buffer[i + 1] === carriage) {
            // \r\r
            return i + 2;
        }
        if (buffer[i] === carriage &&
            buffer[i + 1] === newline &&
            i + 3 < buffer.length &&
            buffer[i + 2] === carriage &&
            buffer[i + 3] === newline) {
            // \r\n\r\n
            return i + 4;
        }
    }
    return -1;
}
//# sourceMappingURL=line.mjs.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/log.mjs
var utils_log = __webpack_require__(62323);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/core/streaming.mjs
var _Stream_client;











class streaming_Stream {
    constructor(iterator, controller, client) {
        this.iterator = iterator;
        _Stream_client.set(this, void 0);
        this.controller = controller;
        (0,tslib/* __classPrivateFieldSet */.G)(this, _Stream_client, client, "f");
    }
    /**
     * Iterate the raw Server-Sent Events from `response` — `{event, data, raw}`
     * objects, before any JSON parsing or event-name filtering.
     *
     * This reads `response.body` directly (not a clone), so the response is
     * consumed. Use this in middleware that fully replaces the stream body; for
     * read-only observation of parsed events, use `ctx.parse()` instead.
     */
    static rawEvents(response, controller = new AbortController()) {
        return _iterSSEMessages(response, controller);
    }
    static fromSSEResponse(response, controller, client) {
        let consumed = false;
        const logger = client ? (0,utils_log/* loggerFor */.WG)(client) : console;
        async function* iterator() {
            if (consumed) {
                throw new core_error/* AnthropicError */.pJ('Cannot iterate over a consumed stream, use `.tee()` to split the stream.');
            }
            consumed = true;
            let done = false;
            try {
                for await (const sse of _iterSSEMessages(response, controller)) {
                    if (sse.event === 'completion') {
                        try {
                            yield JSON.parse(sse.data);
                        }
                        catch (e) {
                            logger.error(`Could not parse message into JSON:`, sse.data);
                            logger.error(`From chunk:`, sse.raw);
                            throw e;
                        }
                    }
                    if (sse.event === 'message_start' ||
                        sse.event === 'message_delta' ||
                        sse.event === 'message_stop' ||
                        sse.event === 'content_block_start' ||
                        sse.event === 'content_block_delta' ||
                        sse.event === 'content_block_stop' ||
                        sse.event === 'message' ||
                        sse.event === 'user.message' ||
                        sse.event === 'user.interrupt' ||
                        sse.event === 'user.tool_confirmation' ||
                        sse.event === 'user.custom_tool_result' ||
                        sse.event === 'user.tool_result' ||
                        sse.event === 'agent.message' ||
                        sse.event === 'agent.thinking' ||
                        sse.event === 'agent.tool_use' ||
                        sse.event === 'agent.tool_result' ||
                        sse.event === 'agent.mcp_tool_use' ||
                        sse.event === 'agent.mcp_tool_result' ||
                        sse.event === 'agent.custom_tool_use' ||
                        sse.event === 'agent.thread_context_compacted' ||
                        sse.event === 'session.status_running' ||
                        sse.event === 'session.status_idle' ||
                        sse.event === 'session.status_rescheduled' ||
                        sse.event === 'session.status_terminated' ||
                        sse.event === 'session.error' ||
                        sse.event === 'session.deleted' ||
                        sse.event === 'session.updated' ||
                        sse.event === 'span.model_request_start' ||
                        sse.event === 'span.model_request_end' ||
                        sse.event === 'span.outcome_evaluation_start' ||
                        sse.event === 'span.outcome_evaluation_ongoing' ||
                        sse.event === 'span.outcome_evaluation_end' ||
                        sse.event === 'user.define_outcome' ||
                        sse.event === 'agent.thread_message_received' ||
                        sse.event === 'agent.thread_message_sent' ||
                        sse.event === 'agent.session_thread_message_received' ||
                        sse.event === 'agent.session_thread_message_sent' ||
                        sse.event === 'session.thread_created' ||
                        sse.event === 'session.thread_status_created' ||
                        sse.event === 'session.thread_status_running' ||
                        sse.event === 'session.thread_status_idle' ||
                        sse.event === 'session.thread_status_rescheduled' ||
                        sse.event === 'session.thread_status_terminated' ||
                        sse.event === 'event_start' ||
                        sse.event === 'event_delta' ||
                        sse.event === 'system.message') {
                        try {
                            yield JSON.parse(sse.data);
                        }
                        catch (e) {
                            logger.error(`Could not parse message into JSON:`, sse.data);
                            logger.error(`From chunk:`, sse.raw);
                            throw e;
                        }
                    }
                    if (sse.event === 'ping') {
                        continue;
                    }
                    if (sse.event === 'error') {
                        const body = (0,utils_values/* safeJSON */.ml)(sse.data) ?? sse.data;
                        const type = body?.error?.type;
                        throw new core_error/* APIError */.LG(undefined, body, undefined, response.headers, type);
                    }
                }
                done = true;
            }
            catch (e) {
                // If the user calls `stream.controller.abort()`, we should exit without throwing.
                if ((0,errors/* isAbortError */.z)(e))
                    return;
                throw e;
            }
            finally {
                // If the user `break`s, abort the ongoing request.
                if (!done)
                    controller.abort();
                releaseRequestSignal(controller);
            }
        }
        return new streaming_Stream(iterator, controller, client);
    }
    /**
     * Generates a Stream from a newline-separated ReadableStream
     * where each item is a JSON value.
     */
    static fromReadableStream(readableStream, controller, client) {
        let consumed = false;
        async function* iterLines() {
            const lineDecoder = new LineDecoder();
            const iter = ReadableStreamToAsyncIterable(readableStream);
            for await (const chunk of iter) {
                for (const line of lineDecoder.decode(chunk)) {
                    yield line;
                }
            }
            for (const line of lineDecoder.flush()) {
                yield line;
            }
        }
        async function* iterator() {
            if (consumed) {
                throw new core_error/* AnthropicError */.pJ('Cannot iterate over a consumed stream, use `.tee()` to split the stream.');
            }
            consumed = true;
            let done = false;
            try {
                for await (const line of iterLines()) {
                    if (done)
                        continue;
                    if (line)
                        yield JSON.parse(line);
                }
                done = true;
            }
            catch (e) {
                // If the user calls `stream.controller.abort()`, we should exit without throwing.
                if ((0,errors/* isAbortError */.z)(e))
                    return;
                throw e;
            }
            finally {
                // If the user `break`s, abort the ongoing request.
                if (!done)
                    controller.abort();
                releaseRequestSignal(controller);
            }
        }
        return new streaming_Stream(iterator, controller, client);
    }
    [(_Stream_client = new WeakMap(), Symbol.asyncIterator)]() {
        return this.iterator();
    }
    /**
     * Splits the stream into two streams which can be
     * independently read from at different speeds.
     */
    tee() {
        const left = [];
        const right = [];
        const iterator = this.iterator();
        const teeIterator = (queue) => {
            return {
                next: () => {
                    if (queue.length === 0) {
                        const result = iterator.next();
                        left.push(result);
                        right.push(result);
                    }
                    return queue.shift();
                },
            };
        };
        return [
            new streaming_Stream(() => teeIterator(left), this.controller, (0,tslib/* __classPrivateFieldGet */.g)(this, _Stream_client, "f")),
            new streaming_Stream(() => teeIterator(right), this.controller, (0,tslib/* __classPrivateFieldGet */.g)(this, _Stream_client, "f")),
        ];
    }
    /**
     * Converts this stream to a newline-separated ReadableStream of
     * JSON stringified values in the stream
     * which can be turned back into a Stream with `Stream.fromReadableStream()`.
     */
    toReadableStream() {
        const self = this;
        let iter;
        return makeReadableStream({
            async start() {
                iter = self[Symbol.asyncIterator]();
            },
            async pull(ctrl) {
                try {
                    const { value, done } = await iter.next();
                    if (done)
                        return ctrl.close();
                    const bytes = (0,utils_bytes/* encodeUTF8 */.YH)(JSON.stringify(value) + '\n');
                    ctrl.enqueue(bytes);
                }
                catch (err) {
                    ctrl.error(err);
                }
            },
            async cancel() {
                await iter.return?.();
            },
        });
    }
}
async function* _iterSSEMessages(response, controller) {
    if (!response.body) {
        controller.abort();
        if (typeof globalThis.navigator !== 'undefined' &&
            globalThis.navigator.product === 'ReactNative') {
            throw new core_error/* AnthropicError */.pJ(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
        }
        throw new core_error/* AnthropicError */.pJ(`Attempted to iterate over a response with no body`);
    }
    const sseDecoder = new SSEDecoder();
    const lineDecoder = new LineDecoder();
    const iter = ReadableStreamToAsyncIterable(response.body);
    for await (const sseChunk of iterSSEChunks(iter)) {
        for (const line of lineDecoder.decode(sseChunk)) {
            const sse = sseDecoder.decode(line);
            if (sse)
                yield sse;
        }
    }
    for (const line of lineDecoder.flush()) {
        const sse = sseDecoder.decode(line);
        if (sse)
            yield sse;
    }
}
/**
 * Given an async iterable iterator, iterates over it and yields full
 * SSE chunks, i.e. yields when a double new-line is encountered.
 */
async function* iterSSEChunks(iterator) {
    let data = new Uint8Array();
    for await (const chunk of iterator) {
        if (chunk == null) {
            continue;
        }
        const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk)
            : typeof chunk === 'string' ? (0,utils_bytes/* encodeUTF8 */.YH)(chunk)
                : chunk;
        let newData = new Uint8Array(data.length + binaryChunk.length);
        newData.set(data);
        newData.set(binaryChunk, data.length);
        data = newData;
        // Yield views, not copies, so a chunk holding many events is not re-copied
        // once per event. This relies on newData never being written again.
        let patternIndex;
        while ((patternIndex = findDoubleNewlineIndex(data)) !== -1) {
            yield data.subarray(0, patternIndex);
            data = data.subarray(patternIndex);
        }
    }
    if (data.length > 0) {
        yield data;
    }
}
class SSEDecoder {
    constructor() {
        this.event = null;
        this.data = [];
        this.chunks = [];
    }
    decode(line) {
        if (line.endsWith('\r')) {
            line = line.substring(0, line.length - 1);
        }
        if (!line) {
            // empty line and we didn't previously encounter any messages
            if (!this.event && !this.data.length)
                return null;
            const sse = {
                event: this.event,
                data: this.data.join('\n'),
                raw: this.chunks,
            };
            this.event = null;
            this.data = [];
            this.chunks = [];
            return sse;
        }
        this.chunks.push(line);
        if (line.startsWith(':')) {
            return null;
        }
        let [fieldname, _, value] = partition(line, ':');
        if (value.startsWith(' ')) {
            value = value.substring(1);
        }
        if (fieldname === 'event') {
            this.event = value;
        }
        else if (fieldname === 'data') {
            this.data.push(value);
        }
        return null;
    }
}
function partition(str, delimiter) {
    const index = str.indexOf(delimiter);
    if (index !== -1) {
        return [str.substring(0, index), delimiter, str.substring(index + delimiter.length)];
    }
    return [str, '', ''];
}
//# sourceMappingURL=streaming.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/parse.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.



async function defaultParseResponse(client, props) {
    const { response, requestLogID, retryOfRequestLogID, startTime } = props;
    const body = await (async () => {
        if (props.options.stream) {
            (0,utils_log/* loggerFor */.WG)(client).debug('response', response.status, response.url, response.headers, response.body);
            // Note: there is an invariant here that isn't represented in the type system
            // that if you set `stream: true` the response type must also be `Stream<T>`
            return streaming_Stream.fromSSEResponse(response, props.controller, client);
        }
        // fetch refuses to read the body when the status code is 204.
        if (response.status === 204) {
            return null;
        }
        if (props.options.__binaryResponse) {
            return response;
        }
        const contentType = response.headers.get('content-type');
        const mediaType = contentType?.split(';')[0]?.trim();
        const isJSON = mediaType?.includes('application/json') || mediaType?.endsWith('+json');
        if (isJSON) {
            const contentLength = response.headers.get('content-length');
            if (contentLength === '0') {
                // if there is no content we can't do anything
                return undefined;
            }
            const json = await response.json();
            return addResponseIDs(json, response);
        }
        const text = await response.text();
        return text;
    })().finally(() => {
        // The body is settled (or parsing threw), so the caller-signal abort
        // listener has nothing left to cancel. Streams release in their own
        // teardown; a raw Response (`__binaryResponse`) keeps the listener so
        // aborting an in-flight download still works.
        if (!props.options.stream && !props.options.__binaryResponse) {
            releaseRequestSignal(props.controller);
        }
    });
    (0,utils_log/* loggerFor */.WG)(client).debug(`[${requestLogID}] response parsed`, (0,utils_log/* formatRequestDetails */.xL)({
        retryOfRequestLogID,
        url: response.url,
        status: response.status,
        body,
        durationMs: Date.now() - startTime,
    }));
    return body;
}
function addResponseIDs(value, response) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return value;
    }
    return Object.defineProperties(value, {
        _request_id: { value: response.headers.get('request-id'), enumerable: false },
        _workspace_id: { value: response.headers.get('anthropic-workspace-id'), enumerable: false },
    });
}
//# sourceMappingURL=parse.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/core/middleware.mjs





/**
 * Errors thrown by the underlying `fetch`, as opposed to by a middleware.
 *
 * Tracked so the client can apply its connection-error retry policy to
 * transport failures while letting errors thrown by middleware propagate to
 * the caller untouched.
 */
const fetchOriginErrors = new WeakSet();
/** Whether `err` was thrown by the underlying `fetch` rather than by a middleware. */
function isFetchOriginError(err) {
    return typeof err === 'object' && err !== null && fetchOriginErrors.has(err);
}
/**
 * Whether an error thrown by middleware should stay on the SDK's
 * connection-error retry policy: fetch-origin, abort, `APIConnectionError`, or
 * `RetryableError` — checked through the error's `cause` chain.
 */
function isRetryableError(err) {
    const seen = new Set(); // guard against `cause` cycles
    while (typeof err === 'object' && err !== null && !seen.has(err)) {
        seen.add(err);
        if (isFetchOriginError(err) ||
            (0,errors/* isAbortError */.z)(err) ||
            err instanceof core_error/* APIConnectionError */.xX ||
            err instanceof core_error/* RetryableError */.dw) {
            return true;
        }
        err = err.cause;
    }
    return false;
}
/**
 * Wraps `fetchFn` so each call runs through `middleware`, keeping the same
 * call signature as `fetch` itself.
 *
 * With no middleware, calls are passed straight through to `fetchFn`.
 * Otherwise the arguments are normalized into an {@link APIRequest} (headers
 * coerced to a `Headers` instance, URL stringified) before entering the
 * chain. The chain is composed per call, so mutations of a `middleware`
 * array are picked up by later requests.
 *
 * `options` — the SDK request options behind this call, when there are any —
 * is surfaced to middleware as `ctx.options` and drives `ctx.parse`.
 *
 * `client` supplies `ctx.logger` (the client's level-filtered logger);
 * without it, `ctx.logger` falls back to the client defaults: `console`,
 * filtered to `ANTHROPIC_LOG` or `'warn'`.
 */
function wrapFetchWithMiddleware(fetchFn, middleware, options, client) {
    return async (url, init = {}) => {
        if (middleware.length === 0) {
            // use undefined this binding; fetch errors if bound to something else in browser/cloudflare
            return fetchFn.call(undefined, url, init);
        }
        const headers = init.headers instanceof Headers ? init.headers : new Headers(init.headers);
        const response = await applyMiddleware(fetchFn, middleware, options, client)({
            ...init,
            headers,
            url: typeof url === 'string' ? url
                : url instanceof URL ? url.href
                    : url.url,
        });
        // Catch a footgun before the client tries to read the body itself and
        // fails with a confusing low-level stream error.
        if (response.bodyUsed || response.body?.locked) {
            throw new core_error/* AnthropicError */.pJ('middleware consumed the response body; use response.clone() to inspect it, ' +
                'or return new Response(body, response) to consume and replace it');
        }
        return response;
    };
}
/**
 * Creates the {@link MiddlewareContext} shared by every middleware in one chain.
 */
function createMiddlewareContext(options, client) {
    // Keyed on the Response so each `next()` call's response (e.g. with custom
    // retries, or a middleware swapping in a replacement) parses independently,
    // while several middleware parsing the same response share a single read.
    const cache = new WeakMap();
    return {
        options,
        // Resolved per chain, so changes to the client's `logLevel`/`logger`
        // apply to subsequent requests.
        logger: client ? (0,utils_log/* loggerFor */.WG)(client) : (0,utils_log/* defaultLogger */.Um)(),
        parse(response) {
            // Streams are single-consumer, so caching one would hand later callers
            // an already-consumed stream; every call gets a fresh clone-backed one.
            if (options?.stream && response.ok) {
                return parseMiddlewareResponse(response, options, client);
            }
            let parsed = cache.get(response);
            if (!parsed) {
                parsed = parseMiddlewareResponse(response, options, client);
                cache.set(response, parsed);
            }
            return parsed;
        },
    };
}
/**
 * Mirrors the client's own response parsing (`defaultParseResponse` in
 * `internal/parse.ts`), reading through a clone so the body stays available
 * to the rest of the chain and the client itself.
 */
async function parseMiddlewareResponse(response, options, client) {
    if (response.bodyUsed || response.body?.locked) {
        throw new core_error/* AnthropicError */.pJ('cannot ctx.parse() a response whose body was already consumed; ' +
            'call ctx.parse() instead of reading the body, or read via response.clone()');
    }
    // Error responses parse as JSON/text below — the SDK only stream-parses
    // successful responses, and middleware typically wants the error body.
    if (options?.stream && response.ok) {
        // A fresh controller rather than the request's own: aborting (or
        // `break`ing out of) the middleware's stream must not cancel the
        // in-flight request the client is still reading.
        return streaming_Stream.fromSSEResponse(response.clone(), new AbortController(), client);
    }
    // fetch refuses to read the body when the status code is 204.
    if (response.status === 204) {
        return null;
    }
    if (options?.__binaryResponse) {
        return response;
    }
    const contentType = response.headers.get('content-type');
    const mediaType = contentType?.split(';')[0]?.trim();
    const isJSON = mediaType?.includes('application/json') || mediaType?.endsWith('+json');
    if (isJSON) {
        if (response.headers.get('content-length') === '0') {
            // if there is no content we can't do anything
            return undefined;
        }
        return addResponseIDs(await response.clone().json(), response);
    }
    return await response.clone().text();
}
/**
 * Composes `middleware` around `fetchFn` and returns the entry point of the chain.
 */
function applyMiddleware(fetchFn, middleware, options, client) {
    // use undefined this binding; fetch errors if bound to something else in browser/cloudflare
    let next = async ({ url, ...init }) => {
        try {
            return await fetchFn.call(undefined, url, init);
        }
        catch (err) {
            // Brand the error as fetch-origin, normalizing with `castToError` first since a
            // WeakSet can't hold primitives and the brand must be on the same object the
            // client's own `castToError` will later pass through.
            const error = (0,errors/* castToError */.r)(err);
            fetchOriginErrors.add(error);
            throw error;
        }
    };
    const ctx = createMiddlewareContext(options, client);
    for (let i = middleware.length - 1; i >= 0; i--) {
        const mw = middleware[i];
        const nextInner = next;
        next = async (request) => mw(request, nextInner, ctx);
    }
    return next;
}
//# sourceMappingURL=middleware.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/core/api-promise.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var _APIPromise_client;


/**
 * A subclass of `Promise` providing additional helper methods
 * for interacting with the SDK.
 */
class APIPromise extends Promise {
    constructor(client, responsePromise, parseResponse = defaultParseResponse) {
        super((resolve) => {
            // this is maybe a bit weird but this has to be a no-op to not implicitly
            // parse the response body; instead .then, .catch, .finally are overridden
            // to parse the response
            resolve(null);
        });
        this.responsePromise = responsePromise;
        this.parseResponse = parseResponse;
        _APIPromise_client.set(this, void 0);
        (0,tslib/* __classPrivateFieldSet */.G)(this, _APIPromise_client, client, "f");
    }
    _thenUnwrap(transform) {
        return new APIPromise((0,tslib/* __classPrivateFieldGet */.g)(this, _APIPromise_client, "f"), this.responsePromise, async (client, props) => addResponseIDs(transform(await this.parseResponse(client, props), props), props.response));
    }
    /**
     * Gets the raw `Response` instance instead of parsing the response
     * data.
     *
     * If you want to parse the response body but still get the `Response`
     * instance, you can use {@link withResponse()}.
     *
     * 👋 Getting the wrong TypeScript type for `Response`?
     * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
     * to your `tsconfig.json`.
     */
    asResponse() {
        return this.responsePromise.then((p) => p.response);
    }
    /**
     * Gets the parsed response data, the raw `Response` instance and the ID of the request,
     * returned via the `request-id` header which is useful for debugging requests and resporting
     * issues to Anthropic.
     *
     * If you just want to get the raw `Response` instance without parsing it,
     * you can use {@link asResponse()}.
     *
     * 👋 Getting the wrong TypeScript type for `Response`?
     * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
     * to your `tsconfig.json`.
     */
    async withResponse() {
        const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
        return {
            data,
            response,
            request_id: response.headers.get('request-id'),
            workspace_id: response.headers.get('anthropic-workspace-id'),
        };
    }
    parse() {
        if (!this.parsedPromise) {
            this.parsedPromise = this.responsePromise.then((data) => this.parseResponse((0,tslib/* __classPrivateFieldGet */.g)(this, _APIPromise_client, "f"), data));
        }
        return this.parsedPromise;
    }
    then(onfulfilled, onrejected) {
        return this.parse().then(onfulfilled, onrejected);
    }
    catch(onrejected) {
        return this.parse().catch(onrejected);
    }
    finally(onfinally) {
        return this.parse().finally(onfinally);
    }
}
_APIPromise_client = new WeakMap();
//# sourceMappingURL=api-promise.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/core/pagination.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var _AbstractPage_client;





class AbstractPage {
    constructor(client, response, body, options) {
        _AbstractPage_client.set(this, void 0);
        (0,tslib/* __classPrivateFieldSet */.G)(this, _AbstractPage_client, client, "f");
        this.options = options;
        this.response = response;
        this.body = body;
    }
    hasNextPage() {
        const items = this.getPaginatedItems();
        if (!items.length)
            return false;
        return this.nextPageRequestOptions() != null;
    }
    async getNextPage() {
        const nextOptions = this.nextPageRequestOptions();
        if (!nextOptions) {
            throw new core_error/* AnthropicError */.pJ('No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.');
        }
        return await (0,tslib/* __classPrivateFieldGet */.g)(this, _AbstractPage_client, "f").requestAPIList(this.constructor, nextOptions);
    }
    async *iterPages() {
        let page = this;
        yield page;
        while (page.hasNextPage()) {
            page = await page.getNextPage();
            yield page;
        }
    }
    async *[(_AbstractPage_client = new WeakMap(), Symbol.asyncIterator)]() {
        for await (const page of this.iterPages()) {
            for (const item of page.getPaginatedItems()) {
                yield item;
            }
        }
    }
}
/**
 * This subclass of Promise will resolve to an instantiated Page once the request completes.
 *
 * It also implements AsyncIterable to allow auto-paginating iteration on an unawaited list call, eg:
 *
 *    for await (const item of client.items.list()) {
 *      console.log(item)
 *    }
 */
class PagePromise extends APIPromise {
    constructor(client, request, Page) {
        super(client, request, async (client, props) => new Page(client, props.response, await defaultParseResponse(client, props), props.options));
    }
    /**
     * Allow auto-paginating iteration on an unawaited list call, eg:
     *
     *    for await (const item of client.items.list()) {
     *      console.log(item)
     *    }
     */
    async *[Symbol.asyncIterator]() {
        const page = await this;
        for await (const item of page) {
            yield item;
        }
    }
}
class Page extends AbstractPage {
    constructor(client, response, body, options) {
        super(client, response, body, options);
        this.data = body.data || [];
        this.has_more = body.has_more || false;
        this.first_id = body.first_id || null;
        this.last_id = body.last_id || null;
    }
    getPaginatedItems() {
        return this.data ?? [];
    }
    hasNextPage() {
        if (this.has_more === false) {
            return false;
        }
        return super.hasNextPage();
    }
    nextPageRequestOptions() {
        if (this.options.query?.['before_id']) {
            // in reverse
            const first_id = this.first_id;
            if (!first_id) {
                return null;
            }
            return {
                ...this.options,
                query: {
                    ...(0,utils_values/* maybeObj */.i8)(this.options.query),
                    before_id: first_id,
                },
            };
        }
        const cursor = this.last_id;
        if (!cursor) {
            return null;
        }
        return {
            ...this.options,
            query: {
                ...(0,utils_values/* maybeObj */.i8)(this.options.query),
                after_id: cursor,
            },
        };
    }
}
class TokenPage extends AbstractPage {
    constructor(client, response, body, options) {
        super(client, response, body, options);
        this.data = body.data || [];
        this.has_more = body.has_more || false;
        this.next_page = body.next_page || null;
    }
    getPaginatedItems() {
        return this.data ?? [];
    }
    hasNextPage() {
        if (this.has_more === false) {
            return false;
        }
        return super.hasNextPage();
    }
    nextPageRequestOptions() {
        const cursor = this.next_page;
        if (!cursor) {
            return null;
        }
        return {
            ...this.options,
            query: {
                ...(0,utils_values/* maybeObj */.i8)(this.options.query),
                page_token: cursor,
            },
        };
    }
}
class PageCursor extends AbstractPage {
    constructor(client, response, body, options) {
        super(client, response, body, options);
        this.data = body.data || [];
        this.next_page = body.next_page || null;
    }
    getPaginatedItems() {
        return this.data ?? [];
    }
    nextPageRequestOptions() {
        const cursor = this.next_page;
        if (!cursor) {
            return null;
        }
        return {
            ...this.options,
            query: {
                ...(0,utils_values/* maybeObj */.i8)(this.options.query),
                page: cursor,
            },
        };
    }
}
class BidirectionalPageCursor extends AbstractPage {
    constructor(client, response, body, options) {
        super(client, response, body, options);
        this.data = body.data || [];
        this.next_page = body.next_page || null;
        this.prev_page = body.prev_page || null;
    }
    getPaginatedItems() {
        return this.data ?? [];
    }
    nextPageRequestOptions() {
        const cursor = this.next_page;
        if (!cursor) {
            return null;
        }
        return {
            ...this.options,
            query: {
                ...(0,utils_values/* maybeObj */.i8)(this.options.query),
                page: cursor,
            },
        };
    }
}
//# sourceMappingURL=pagination.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/uploads.mjs

const checkFileSupport = () => {
    if (typeof File === 'undefined') {
        const { process } = globalThis;
        const isOldNode = typeof process?.versions?.node === 'string' && parseInt(process.versions.node.split('.')) < 20;
        throw new Error('`File` is not defined as a global, which is required for file uploads.' +
            (isOldNode ?
                " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`."
                : ''));
    }
};
/**
 * Construct a `File` instance. This is used to ensure a helpful error is thrown
 * for environments that don't define a global `File` yet.
 */
function makeFile(fileBits, fileName, options) {
    checkFileSupport();
    return new File(fileBits, fileName ?? 'unknown_file', options);
}
function getName(value, stripPath) {
    const val = (typeof value === 'object' &&
        value !== null &&
        (('name' in value && value.name && String(value.name)) ||
            ('url' in value && value.url && String(value.url)) ||
            ('filename' in value && value.filename && String(value.filename)) ||
            ('path' in value && value.path && String(value.path)))) ||
        '';
    return stripPath ? val.split(/[\\/]/).pop() || undefined : val;
}
const isAsyncIterable = (value) => value != null && typeof value === 'object' && typeof value[Symbol.asyncIterator] === 'function';
/**
 * Returns a multipart/form-data request if any part of the given request body contains a File / Blob value.
 * Otherwise returns the request as is.
 */
const maybeMultipartFormRequestOptions = async (opts, fetch) => {
    if (!hasUploadableValue(opts.body))
        return opts;
    return { ...opts, body: await createForm(opts.body, fetch) };
};
const multipartFormRequestOptions = async (opts, fetch, stripFilenames = true) => {
    return { ...opts, body: await createForm(opts.body, fetch, stripFilenames) };
};
const supportsFormDataMap = /* @__PURE__ */ new WeakMap();
/**
 * node-fetch doesn't support the global FormData object in recent node versions. Instead of sending
 * properly-encoded form data, it just stringifies the object, resulting in a request body of "[object FormData]".
 * This function detects if the fetch function provided supports the global FormData object to avoid
 * confusing error messages later on.
 */
function supportsFormData(fetchObject) {
    const fetch = typeof fetchObject === 'function' ? fetchObject : fetchObject.fetch;
    const cached = supportsFormDataMap.get(fetch);
    if (cached)
        return cached;
    const promise = (async () => {
        try {
            const FetchResponse = ('Response' in fetch ?
                fetch.Response
                : (await fetch('data:,')).constructor);
            const data = new FormData();
            if (data.toString() === (await new FetchResponse(data).text())) {
                return false;
            }
            return true;
        }
        catch {
            // avoid false negatives
            return true;
        }
    })();
    supportsFormDataMap.set(fetch, promise);
    return promise;
}
const createForm = async (body, fetch, stripFilenames = true) => {
    if (!(await supportsFormData(fetch))) {
        throw new TypeError('The provided fetch function does not support file uploads with the current global FormData class.');
    }
    const form = new FormData();
    await Promise.all(Object.entries(body || {}).map(([key, value]) => addFormValue(form, key, value, stripFilenames)));
    return form;
};
// Blob, not File: bare Blobs and Bun.file() results don't inherit from File.
const isUploadable = (value) => typeof value === 'object' &&
    value !== null &&
    (value instanceof Response || isAsyncIterable(value) || value instanceof Blob);
const hasUploadableValue = (value) => {
    if (isUploadable(value))
        return true;
    if (Array.isArray(value))
        return value.some(hasUploadableValue);
    if (value && typeof value === 'object') {
        for (const k in value) {
            if (hasUploadableValue(value[k]))
                return true;
        }
    }
    return false;
};
const addFormValue = async (form, key, value, stripFilenames) => {
    if (value === undefined)
        return;
    if (value == null) {
        throw new TypeError(`Received null for "${key}"; to pass null in FormData, you must use the string 'null'`);
    }
    // TODO: make nested formats configurable
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        form.append(key, String(value));
    }
    else if (value instanceof Response) {
        let options = {};
        const contentType = value.headers.get('Content-Type');
        if (contentType) {
            options = { type: contentType };
        }
        form.append(key, makeFile([await value.blob()], getName(value, stripFilenames), options));
    }
    else if (isAsyncIterable(value)) {
        form.append(key, makeFile([await new Response(ReadableStreamFrom(value)).blob()], getName(value, stripFilenames)));
    }
    else if (value instanceof Blob) {
        form.append(key, makeFile([value], getName(value, stripFilenames) || undefined, { type: value.type }));
    }
    else if (Array.isArray(value)) {
        await Promise.all(value.map((entry) => addFormValue(form, key + '[]', entry, stripFilenames)));
    }
    else if (typeof value.then === 'function') {
        throw new TypeError(`Received a Promise for "${key}"; await it first, e.g. \`await toFile(...)\``);
    }
    else if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
        throw new TypeError(`Received ${value.constructor.name} for "${key}"; to upload raw bytes, wrap them with \`await toFile(bytes, 'filename')\``);
    }
    else if (typeof value === 'object') {
        await Promise.all(Object.entries(value).map(([name, prop]) => addFormValue(form, `${key}[${name}]`, prop, stripFilenames)));
    }
    else {
        throw new TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`);
    }
};
//# sourceMappingURL=uploads.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/to-file.mjs


/**
 * This check adds the arrayBuffer() method type because it is available and used at runtime
 */
const isBlobLike = (value) => value != null &&
    typeof value === 'object' &&
    typeof value.size === 'number' &&
    typeof value.type === 'string' &&
    typeof value.text === 'function' &&
    typeof value.slice === 'function' &&
    typeof value.arrayBuffer === 'function';
/**
 * This check adds the arrayBuffer() method type because it is available and used at runtime
 */
const isFileLike = (value) => value != null &&
    typeof value === 'object' &&
    typeof value.name === 'string' &&
    typeof value.lastModified === 'number' &&
    isBlobLike(value);
const isResponseLike = (value) => value != null &&
    typeof value === 'object' &&
    typeof value.url === 'string' &&
    typeof value.blob === 'function';
/**
 * Helper for creating a {@link File} to pass to an SDK upload method from a variety of different data formats
 * @param value the raw content of the file. Can be an {@link Uploadable}, BlobLikePart, or AsyncIterable of BlobLikeParts
 * @param {string=} name the name of the file. If omitted, toFile will try to determine a file name from bits if possible
 * @param {Object=} options additional properties
 * @param {string=} options.type the MIME type of the content
 * @param {number=} options.lastModified the last modified timestamp
 * @returns a {@link File} with the given properties
 */
async function toFile(value, name, options) {
    checkFileSupport();
    // If it's a promise, resolve it.
    value = await value;
    name || (name = getName(value, true));
    // If we've been given a `File` we don't need to do anything if the name / options
    // have not been customised.
    if (isFileLike(value)) {
        if (value instanceof File && name == null && options == null) {
            return value;
        }
        return makeFile([await value.arrayBuffer()], name ?? value.name, {
            type: value.type,
            lastModified: value.lastModified,
            ...options,
        });
    }
    if (isResponseLike(value)) {
        const blob = await value.blob();
        name || (name = new URL(value.url).pathname.split(/[\\/]/).pop());
        return makeFile(await getBytes(blob), name, options);
    }
    const parts = await getBytes(value);
    if (!options?.type) {
        const type = parts.find((part) => typeof part === 'object' && 'type' in part && part.type);
        if (typeof type === 'string') {
            options = { ...options, type };
        }
    }
    return makeFile(parts, name, options);
}
async function getBytes(value) {
    let parts = [];
    if (typeof value === 'string' ||
        ArrayBuffer.isView(value) || // includes Uint8Array, Buffer, etc.
        value instanceof ArrayBuffer) {
        parts.push(value);
    }
    else if (isBlobLike(value)) {
        parts.push(value instanceof Blob ? value : await value.arrayBuffer());
    }
    else if (isAsyncIterable(value) // includes Readable, ReadableStream, etc.
    ) {
        for await (const chunk of value) {
            parts.push(...(await getBytes(chunk))); // TODO, consider validating?
        }
    }
    else {
        const constructor = value?.constructor?.name;
        throw new Error(`Unexpected data type: ${typeof value}${constructor ? `; constructor: ${constructor}` : ''}${propsForError(value)}`);
    }
    return parts;
}
function propsForError(value) {
    if (typeof value !== 'object' || value === null)
        return '';
    const props = Object.getOwnPropertyNames(value);
    return `; props: [${props.map((p) => `"${p}"`).join(', ')}]`;
}
//# sourceMappingURL=to-file.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/core/uploads.mjs

//# sourceMappingURL=uploads.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/core/resource.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
class APIResource {
    constructor(client) {
        this._client = client;
    }
}
//# sourceMappingURL=resource.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/headers.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

const brand_privateNullableHeaders = Symbol.for('brand.privateNullableHeaders');
function* iterateHeaders(headers) {
    if (!headers)
        return;
    if (brand_privateNullableHeaders in headers) {
        const { values, nulls } = headers;
        yield* values.entries();
        for (const name of nulls) {
            yield [name, null];
        }
        return;
    }
    let shouldClear = false;
    let iter;
    if (headers instanceof Headers) {
        iter = headers.entries();
    }
    else if ((0,utils_values/* isReadonlyArray */.MH)(headers)) {
        iter = headers;
    }
    else {
        shouldClear = true;
        iter = Object.entries(headers ?? {});
    }
    for (let row of iter) {
        const name = row[0];
        if (typeof name !== 'string')
            throw new TypeError('expected header name to be a string');
        const values = (0,utils_values/* isReadonlyArray */.MH)(row[1]) ? row[1] : [row[1]];
        let didClear = false;
        for (const value of values) {
            if (value === undefined)
                continue;
            // Objects keys always overwrite older headers, they never append.
            // Yield the clear sentinel before adding the new values, so the
            // consumer can tell this synthetic "clear-before-set" apart from a
            // user's explicit `null` (= remove).
            if (shouldClear && !didClear) {
                didClear = true;
                yield [name, clearSentinel];
            }
            yield [name, value];
        }
    }
}
/** Distinguishes iterateHeaders' synthetic clear-before-set from a user `null`. */
const clearSentinel = Symbol('clear');
/**
 * Headers whose values accumulate across {@link buildHeaders} sources instead
 * of the later source's value replacing the earlier one. Values are
 * comma-appended (deduplicated, order-preserving) into a single header line.
 */
const APPEND_HEADERS = new Set(['x-stainless-helper']);
const headers_appendHeaderValue = (existing, addition) => {
    const tokens = existing ?
        existing
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
    for (const tok of addition.split(',').map((t) => t.trim())) {
        if (tok && !tokens.includes(tok))
            tokens.push(tok);
    }
    return tokens.join(', ');
};
const buildHeaders = (newHeaders) => {
    const targetHeaders = new Headers();
    const nullHeaders = new Set();
    for (const headers of newHeaders) {
        const seenHeaders = new Set();
        for (const [name, value] of iterateHeaders(headers)) {
            const lowerName = name.toLowerCase();
            if (APPEND_HEADERS.has(lowerName)) {
                // Accumulating headers ignore the synthetic clear-before-set; an
                // explicit `null` (any source shape) is honored as removal.
                if (value === clearSentinel)
                    continue;
                if (value === null) {
                    targetHeaders.delete(name);
                    nullHeaders.add(lowerName);
                }
                else {
                    targetHeaders.set(name, headers_appendHeaderValue(targetHeaders.get(name), value));
                    nullHeaders.delete(lowerName);
                }
                continue;
            }
            if (value === clearSentinel || !seenHeaders.has(lowerName)) {
                targetHeaders.delete(name);
                seenHeaders.add(lowerName);
                if (value === clearSentinel)
                    continue;
            }
            if (value === null) {
                targetHeaders.delete(name);
                nullHeaders.add(lowerName);
            }
            else {
                targetHeaders.append(name, value);
                nullHeaders.delete(lowerName);
            }
        }
    }
    return { [brand_privateNullableHeaders]: true, values: targetHeaders, nulls: nullHeaders };
};
const isEmptyHeaders = (headers) => {
    for (const _ of iterateHeaders(headers))
        return false;
    return true;
};
//# sourceMappingURL=headers.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/path.mjs

/**
 * Percent-encode everything that isn't safe to have in a path without encoding safe chars.
 *
 * Taken from https://datatracker.ietf.org/doc/html/rfc3986#section-3.3:
 * > unreserved  = ALPHA / DIGIT / "-" / "." / "_" / "~"
 * > sub-delims  = "!" / "$" / "&" / "'" / "(" / ")" / "*" / "+" / "," / ";" / "="
 * > pchar       = unreserved / pct-encoded / sub-delims / ":" / "@"
 */
function encodeURIPath(str) {
    return str.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
const EMPTY = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.create(null));
const createPathTagFunction = (pathEncoder = encodeURIPath) => function path(statics, ...params) {
    // If there are no params, no processing is needed.
    if (statics.length === 1)
        return statics[0];
    let postPath = false;
    const invalidSegments = [];
    const path = statics.reduce((previousValue, currentValue, index) => {
        if (/[?#]/.test(currentValue)) {
            postPath = true;
        }
        const value = params[index];
        let encoded = (postPath ? encodeURIComponent : pathEncoder)('' + value);
        if (index !== params.length &&
            (value == null ||
                (typeof value === 'object' &&
                    // handle values from other realms
                    value.toString ===
                        Object.getPrototypeOf(Object.getPrototypeOf(value.hasOwnProperty ?? EMPTY) ?? EMPTY)
                            ?.toString))) {
            encoded = value + '';
            invalidSegments.push({
                start: previousValue.length + currentValue.length,
                length: encoded.length,
                error: `Value of type ${Object.prototype.toString
                    .call(value)
                    .slice(8, -1)} is not a valid path parameter`,
            });
        }
        return previousValue + currentValue + (index === params.length ? '' : encoded);
    }, '');
    const pathOnly = path.split(/[?#]/, 1)[0];
    const invalidSegmentPattern = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi;
    let match;
    // Find all invalid segments
    while ((match = invalidSegmentPattern.exec(pathOnly)) !== null) {
        invalidSegments.push({
            start: match.index,
            length: match[0].length,
            error: `Value "${match[0]}" can\'t be safely passed as a path parameter`,
        });
    }
    invalidSegments.sort((a, b) => a.start - b.start);
    if (invalidSegments.length > 0) {
        let lastEnd = 0;
        const underline = invalidSegments.reduce((acc, segment) => {
            const spaces = ' '.repeat(segment.start - lastEnd);
            const arrows = '^'.repeat(segment.length);
            lastEnd = segment.start + segment.length;
            return acc + spaces + arrows;
        }, '');
        throw new core_error/* AnthropicError */.pJ(`Path parameters result in path with invalid segments:\n${invalidSegments
            .map((e) => e.error)
            .join('\n')}\n${path}\n${underline}`);
    }
    return path;
};
/**
 * URI-encodes path params and ensures no unsafe /./ or /../ path segments are introduced.
 */
const path = /* @__PURE__ */ createPathTagFunction(encodeURIPath);
//# sourceMappingURL=path.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/deployment-runs.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.




class DeploymentRuns extends APIResource {
    /**
     * Get Deployment Run
     *
     * @example
     * ```ts
     * const betaManagedAgentsDeploymentRun =
     *   await client.beta.deploymentRuns.retrieve(
     *     'deployment_run_id',
     *   );
     * ```
     */
    retrieve(deploymentRunID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.get(path `/v1/deployment_runs/${deploymentRunID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * List Deployment Runs
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaManagedAgentsDeploymentRun of client.beta.deploymentRuns.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList('/v1/deployment_runs?beta=true', (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
//# sourceMappingURL=deployment-runs.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/deployments.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.




class Deployments extends APIResource {
    /**
     * Create Deployment
     *
     * @example
     * ```ts
     * const betaManagedAgentsDeployment =
     *   await client.beta.deployments.create({
     *     agent: 'string',
     *     environment_id: 'x',
     *     initial_events: [
     *       {
     *         content: [
     *           {
     *             text: 'Where is my order #1234?',
     *             type: 'text',
     *           },
     *         ],
     *         type: 'user.message',
     *       },
     *     ],
     *     name: 'x',
     *   });
     * ```
     */
    create(params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post('/v1/deployments?beta=true', {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Get Deployment
     *
     * @example
     * ```ts
     * const betaManagedAgentsDeployment =
     *   await client.beta.deployments.retrieve(
     *     'depl_011CZkZcDH3vPqd7xnEfwTai',
     *   );
     * ```
     */
    retrieve(deploymentID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.get(path `/v1/deployments/${deploymentID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Update Deployment
     *
     * @example
     * ```ts
     * const betaManagedAgentsDeployment =
     *   await client.beta.deployments.update(
     *     'depl_011CZkZcDH3vPqd7xnEfwTai',
     *   );
     * ```
     */
    update(deploymentID, params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post(path `/v1/deployments/${deploymentID}?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * List Deployments
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaManagedAgentsDeployment of client.beta.deployments.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList('/v1/deployments?beta=true', (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Archive Deployment
     *
     * @example
     * ```ts
     * const betaManagedAgentsDeployment =
     *   await client.beta.deployments.archive(
     *     'depl_011CZkZcDH3vPqd7xnEfwTai',
     *   );
     * ```
     */
    archive(deploymentID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.post(path `/v1/deployments/${deploymentID}/archive?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Pause Deployment
     *
     * @example
     * ```ts
     * const betaManagedAgentsDeployment =
     *   await client.beta.deployments.pause(
     *     'depl_011CZkZcDH3vPqd7xnEfwTai',
     *   );
     * ```
     */
    pause(deploymentID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.post(path `/v1/deployments/${deploymentID}/pause?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Run Deployment Now
     *
     * @example
     * ```ts
     * const betaManagedAgentsDeploymentRun =
     *   await client.beta.deployments.run(
     *     'depl_011CZkZcDH3vPqd7xnEfwTai',
     *   );
     * ```
     */
    run(deploymentID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.post(path `/v1/deployments/${deploymentID}/run?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Unpause Deployment
     *
     * @example
     * ```ts
     * const betaManagedAgentsDeployment =
     *   await client.beta.deployments.unpause(
     *     'depl_011CZkZcDH3vPqd7xnEfwTai',
     *   );
     * ```
     */
    unpause(deploymentID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.post(path `/v1/deployments/${deploymentID}/unpause?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
//# sourceMappingURL=deployments.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/dreams.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.




class Dreams extends APIResource {
    /**
     * Create a Dream
     *
     * @example
     * ```ts
     * const betaDream = await client.beta.dreams.create({
     *   inputs: [{ memory_store_id: 'x', type: 'memory_store' }],
     *   model: 'string',
     * });
     * ```
     */
    create(params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post('/v1/dreams?beta=true', {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'dreaming-2026-04-21'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Get a Dream
     *
     * @example
     * ```ts
     * const betaDream = await client.beta.dreams.retrieve(
     *   'dream_id',
     * );
     * ```
     */
    retrieve(dreamID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.get(path `/v1/dreams/${dreamID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'dreaming-2026-04-21'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * List Dreams
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaDream of client.beta.dreams.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList('/v1/dreams?beta=true', (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'dreaming-2026-04-21'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Archive a Dream
     *
     * @example
     * ```ts
     * const betaDream = await client.beta.dreams.archive(
     *   'dream_id',
     * );
     * ```
     */
    archive(dreamID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.post(path `/v1/dreams/${dreamID}/archive?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'dreaming-2026-04-21'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Cancel a Dream
     *
     * @example
     * ```ts
     * const betaDream = await client.beta.dreams.cancel(
     *   'dream_id',
     * );
     * ```
     */
    cancel(dreamID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.post(path `/v1/dreams/${dreamID}/cancel?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'dreaming-2026-04-21'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
//# sourceMappingURL=dreams.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/stainless-helper-header.mjs
/**
 * Single source of truth for the `x-stainless-helper` telemetry header — the
 * key, the closed value vocabulary, and per-object helper tagging. The
 * append-don't-clobber merge for the header itself lives in
 * {@link import('../internal/headers').buildHeaders} via `APPEND_HEADERS`.
 */
/**
 * Telemetry header naming the SDK helper(s) a request came from. Always this
 * lowercase form; `buildHeaders` matches it case-insensitively for its append
 * semantics, but a single canonical casing keeps every call site greppable.
 */
const stainless_helper_header_STAINLESS_HELPER_HEADER = 'x-stainless-helper';
/** Telemetry header naming the SDK method (e.g. `stream`) in use. */
const STAINLESS_HELPER_METHOD_HEADER = 'x-stainless-helper-method';
/**
 * The `{ 'x-stainless-helper': value }` header dict, for passing into
 * `buildHeaders` (which comma-appends `x-stainless-helper` across sources)
 * or as `defaultHeaders`/per-request `headers`.
 */
function helperHeader(value) {
    return { [stainless_helper_header_STAINLESS_HELPER_HEADER]: value };
}
/**
 * Symbol used to mark objects created by SDK helpers for tracking.
 * The value is the helper name (e.g., 'mcpTool', 'betaZodTool').
 */
const SDK_HELPER_SYMBOL = Symbol('anthropic.sdk.stainlessHelper');
function wasCreatedByStainlessHelper(value) {
    return typeof value === 'object' && value !== null && SDK_HELPER_SYMBOL in value;
}
/**
 * Collects helper names from tools and messages arrays.
 * Returns a deduplicated array of helper names found.
 */
function collectStainlessHelpers(tools, messages) {
    const helpers = new Set();
    // Collect from tools
    if (tools) {
        for (const tool of tools) {
            if (wasCreatedByStainlessHelper(tool)) {
                helpers.add(tool[SDK_HELPER_SYMBOL]);
            }
        }
    }
    // Collect from messages and their content blocks
    if (messages) {
        for (const message of messages) {
            if (wasCreatedByStainlessHelper(message)) {
                helpers.add(message[SDK_HELPER_SYMBOL]);
            }
            const content = message.content;
            if (Array.isArray(content)) {
                for (const block of content) {
                    if (wasCreatedByStainlessHelper(block)) {
                        helpers.add(block[SDK_HELPER_SYMBOL]);
                    }
                }
            }
        }
    }
    return Array.from(helpers);
}
/**
 * Builds x-stainless-helper header value from tools and messages.
 * Returns an empty object if no helpers are found.
 */
function stainlessHelperHeader(tools, messages) {
    const helpers = collectStainlessHelpers(tools, messages);
    if (helpers.length === 0)
        return {};
    return { [stainless_helper_header_STAINLESS_HELPER_HEADER]: helpers.join(', ') };
}
/**
 * Builds x-stainless-helper header value from a file object.
 * Returns an empty object if the file is not marked with a helper.
 */
function stainlessHelperHeaderFromFile(file) {
    if (wasCreatedByStainlessHelper(file)) {
        return { [stainless_helper_header_STAINLESS_HELPER_HEADER]: file[SDK_HELPER_SYMBOL] };
    }
    return {};
}
//# sourceMappingURL=stainless-helper-header.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/files.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.






class Files extends APIResource {
    /**
     * List Files
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaFileMetadata of client.beta.files.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList('/v1/files?beta=true', (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Delete File
     *
     * @example
     * ```ts
     * const betaDeletedFile = await client.beta.files.delete(
     *   'file_id',
     * );
     * ```
     */
    delete(fileID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.delete(path `/v1/files/${fileID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Download File
     *
     * @example
     * ```ts
     * const response = await client.beta.files.download(
     *   'file_id',
     * );
     *
     * const content = await response.blob();
     * console.log(content);
     * ```
     */
    download(fileID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.get(path `/v1/files/${fileID}/content?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    Accept: 'application/binary',
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
            __binaryResponse: true,
        });
    }
    /**
     * Get File Metadata
     *
     * @example
     * ```ts
     * const betaFileMetadata =
     *   await client.beta.files.retrieveMetadata('file_id');
     * ```
     */
    retrieveMetadata(fileID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.get(path `/v1/files/${fileID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Upload File
     *
     * @example
     * ```ts
     * const betaFileMetadata = await client.beta.files.upload({
     *   file: fs.createReadStream('path/to/file'),
     * });
     * ```
     */
    upload(params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post('/v1/files?beta=true', multipartFormRequestOptions({
            body,
            ...options,
            headers: buildHeaders([
                {
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                stainlessHelperHeaderFromFile(body.file),
                options?.headers,
            ]),
        }, this._client));
    }
}
//# sourceMappingURL=files.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/models.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.




class Models extends APIResource {
    /**
     * Get a specific model.
     *
     * The Models API response can be used to determine information about a specific
     * model or resolve a model alias to a model ID.
     *
     * @example
     * ```ts
     * const betaModelInfo = await client.beta.models.retrieve(
     *   'model_id',
     * );
     * ```
     */
    retrieve(modelID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.get(path `/v1/models/${modelID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * List available models.
     *
     * The Models API response can be used to determine which models are available for
     * use in the API. More recently released models are listed first.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaModelInfo of client.beta.models.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList('/v1/models?beta=true', (Page), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
//# sourceMappingURL=models.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/user-profiles.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.




class UserProfiles extends APIResource {
    /**
     * Create User Profile
     *
     * @example
     * ```ts
     * const betaUserProfile =
     *   await client.beta.userProfiles.create();
     * ```
     */
    create(params, options) {
        const { betas, ...body } = params;
        return this._client.post('/v1/user_profiles?beta=true', {
            body,
            ...options,
            headers: buildHeaders([
                { 'anthropic-beta': [...(betas ?? []), 'user-profiles-2026-08-18'].toString() },
                options?.headers,
            ]),
        });
    }
    /**
     * Get User Profile
     *
     * @example
     * ```ts
     * const betaUserProfile =
     *   await client.beta.userProfiles.retrieve(
     *     'uprof_011CZkZCu8hGbp5mYRQgUmz9',
     *   );
     * ```
     */
    retrieve(userProfileID, params = {}, options) {
        const { betas } = params ?? {};
        return this._client.get(path `/v1/user_profiles/${userProfileID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                { 'anthropic-beta': [...(betas ?? []), 'user-profiles-2026-08-18'].toString() },
                options?.headers,
            ]),
        });
    }
    /**
     * Update User Profile
     *
     * @example
     * ```ts
     * const betaUserProfile =
     *   await client.beta.userProfiles.update(
     *     'uprof_011CZkZCu8hGbp5mYRQgUmz9',
     *   );
     * ```
     */
    update(userProfileID, params, options) {
        const { betas, ...body } = params;
        return this._client.post(path `/v1/user_profiles/${userProfileID}?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                { 'anthropic-beta': [...(betas ?? []), 'user-profiles-2026-08-18'].toString() },
                options?.headers,
            ]),
        });
    }
    /**
     * List User Profiles
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaUserProfile of client.beta.userProfiles.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, ...query } = params ?? {};
        return this._client.getAPIList('/v1/user_profiles?beta=true', (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                { 'anthropic-beta': [...(betas ?? []), 'user-profiles-2026-08-18'].toString() },
                options?.headers,
            ]),
        });
    }
    /**
     * Create Enrollment URL
     *
     * @example
     * ```ts
     * const betaUserProfileEnrollmentURL =
     *   await client.beta.userProfiles.createEnrollmentURL(
     *     'uprof_011CZkZCu8hGbp5mYRQgUmz9',
     *   );
     * ```
     */
    createEnrollmentURL(userProfileID, params = {}, options) {
        const { betas } = params ?? {};
        return this._client.post(path `/v1/user_profiles/${userProfileID}/enrollment_url?beta=true`, {
            ...options,
            headers: buildHeaders([
                { 'anthropic-beta': [...(betas ?? []), 'user-profiles-2026-08-18'].toString() },
                options?.headers,
            ]),
        });
    }
}
//# sourceMappingURL=user-profiles.mjs.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/standardwebhooks@1.0.0/node_modules/standardwebhooks/dist/index.js
var dist = __webpack_require__(59062);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/webhooks.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.


class Webhooks extends APIResource {
    /**
     * Parses a webhook payload into an event without verifying its signature. Prefer
     * `unwrap()` unless you have already verified the signature yourself.
     */
    parseUnverified(body) {
        return JSON.parse(body);
    }
    /**
     * Verifies the webhook signature from the `webhook-id`, `webhook-timestamp` and
     * `webhook-signature` headers using your webhook signing key, then parses the
     * payload into an event. Fails if the signature is missing or invalid.
     */
    unwrap(body, options) {
        const headers = options?.headers;
        if (headers == null)
            throw new Error('Webhook headers are required in order to verify the signature');
        const keyStr = options.key === undefined ? this._client.webhookKey : options.key;
        if (!keyStr)
            throw new Error('Webhook key must not be null or empty in order to unwrap');
        const wh = new dist/* Webhook */.KD(keyStr);
        wh.verify(body, headers);
        return JSON.parse(body);
    }
}
//# sourceMappingURL=webhooks.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/agents/versions.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.




class Versions extends APIResource {
    /**
     * List Agent Versions
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaManagedAgentsAgent of client.beta.agents.versions.list(
     *   'agent_011CZkYpogX7uDKUyvBTophP',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(agentID, params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList(path `/v1/agents/${agentID}/versions?beta=true`, (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
//# sourceMappingURL=versions.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/agents/agents.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.






class Agents extends APIResource {
    constructor() {
        super(...arguments);
        this.versions = new Versions(this._client);
    }
    /**
     * Create Agent
     *
     * @example
     * ```ts
     * const betaManagedAgentsAgent =
     *   await client.beta.agents.create({
     *     model: 'claude-opus-5',
     *     name: 'My First Agent',
     *   });
     * ```
     */
    create(params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post('/v1/agents?beta=true', {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Get Agent
     *
     * @example
     * ```ts
     * const betaManagedAgentsAgent =
     *   await client.beta.agents.retrieve(
     *     'agent_011CZkYpogX7uDKUyvBTophP',
     *   );
     * ```
     */
    retrieve(agentID, params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.get(path `/v1/agents/${agentID}?beta=true`, {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Update Agent
     *
     * @example
     * ```ts
     * const betaManagedAgentsAgent =
     *   await client.beta.agents.update(
     *     'agent_011CZkYpogX7uDKUyvBTophP',
     *     { description: 'updated' },
     *   );
     * ```
     */
    update(agentID, params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post(path `/v1/agents/${agentID}?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * List Agents
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaManagedAgentsAgent of client.beta.agents.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList('/v1/agents?beta=true', (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Archive Agent
     *
     * @example
     * ```ts
     * const betaManagedAgentsAgent =
     *   await client.beta.agents.archive(
     *     'agent_011CZkYpogX7uDKUyvBTophP',
     *   );
     * ```
     */
    archive(agentID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.post(path `/v1/agents/${agentID}/archive?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
Agents.Versions = Versions;
//# sourceMappingURL=agents.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/abort.mjs
/**
 * Chain an external {@link AbortSignal} into a local {@link AbortController}:
 * the controller aborts whenever `external` aborts (synchronously if it is
 * already aborted).
 *
 * Returns a cleanup function that detaches the listener. Callers MUST invoke it
 * on their normal teardown path — `{ once: true }` only removes the listener if
 * abort actually fires, so a long-lived `external` signal (e.g. a daemon-wide
 * signal reused across many short-lived controllers) would otherwise leak one
 * listener per controller.
 */
function linkAbort(external, controller) {
    if (!external)
        return () => { };
    if (external.aborted) {
        controller.abort();
        return () => { };
    }
    const onAbort = () => controller.abort();
    external.addEventListener('abort', onAbort);
    return () => external.removeEventListener('abort', onAbort);
}
//# sourceMappingURL=abort.mjs.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/backoff.mjs
var utils_backoff = __webpack_require__(42657);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/helper-client.mjs



/**
 * Return a `withOptions()` clone of `client` set up for use *by* one of the
 * runner helpers: authenticated with `authToken` as Bearer credentials, with
 * the parent's `X-Api-Key` cleared, and tagged with the helper's
 * `x-stainless-helper` value on every outgoing request.
 *
 * The returned sub-client inherits the parent's full configuration
 * (`baseURL`, `timeout`, `maxRetries`, `fetch`, `fetchOptions`, custom
 * `defaultHeaders`, `defaultQuery`). Overrides applied:
 *
 * - `authToken: authToken` — the new credential.
 * - `apiKey: null` — the parent's `X-Api-Key` is cleared. `withOptions`
 *   inherits the parent's `apiKey` by default; without this, both
 *   `X-Api-Key` *and* `Authorization: Bearer …` would land on the wire.
 *   `client.ts` only triggers the env-var fallback when `apiKey === undefined`,
 *   so explicit `null` is honored.
 * - `credentials: undefined` — opts the clone out of any inherited
 *   credentials/config/profile so the explicit bearer is the unambiguous auth.
 * - `baseURL: client.baseURL` — pins the parent's resolved host (auth override otherwise resets it).
 * - `defaultHeaders` is rebuilt as `parent._authState.extraHeaders ⊕ parent.defaultHeaders ⊕
 *   {'x-stainless-helper': helper}`. `withOptions` *replaces* (does not
 *   merge) `defaultHeaders`, so we merge here so any custom headers the
 *   caller set on the parent client survive on the sub-client.
 */
function copyClientForHelper(client, { authToken, helper }) {
    if (!authToken) {
        throw new core_error/* AnthropicError */.pJ(`copyClientForHelper: expected a non-empty authToken but received ${JSON.stringify(authToken)}`);
    }
    const internal = client;
    const parentDefaults = internal._options.defaultHeaders;
    // Carry the parent's credential/profile headers; strip the auth ones (we re-auth below).
    const parentAuthExtraHeaders = internal._authState?.extraHeaders;
    const inheritedAuthExtraHeaders = parentAuthExtraHeaders ?
        Object.fromEntries(Object.entries(parentAuthExtraHeaders).filter(([name]) => {
            const lower = name.toLowerCase();
            return lower !== 'authorization' && lower !== 'x-api-key';
        }))
        : undefined;
    const defaultHeaders = buildHeaders([
        inheritedAuthExtraHeaders,
        parentDefaults,
        { [stainless_helper_header_STAINLESS_HELPER_HEADER]: helper },
    ]);
    return client.withOptions({
        apiKey: null,
        authToken,
        baseURL: client.baseURL,
        credentials: undefined,
        defaultHeaders,
    });
}
//# sourceMappingURL=helper-client.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/environments/poller.mjs
var _WorkPoller_runnerClient, _WorkPoller_consumed, _WorkPoller_controller, _WorkPoller_detachExternal, _WorkPoller_autoStop, _WorkPoller_drain, _WorkPoller_blockMs, _WorkPoller_reclaimOlderThanMs, _WorkPoller_requestOpts, _IdleLog_log, _IdleLog_environmentId, _IdleLog_idleSince, _IdleLog_lastReport;










// API caps block_ms at 999; rely on client-side jitter between empty polls.
const POLL_BLOCK_MS = 999;
const POLL_BACKOFF_BASE_MS = 1000;
const POLL_BACKOFF_CAP_MS = 60000;
const IDLE_REPORT_INTERVAL_MS = 300000;
/**
 * Async-iterable that long-polls a self-hosted environment for work, ack's
 * each item, yields the {@link BetaSelfHostedWork} item, and posts `stop` after
 * the consumer's loop body returns (or when the consumer `break`s).
 *
 * A yielded item may carry a per-item `secret` payload (populated only by the
 * poll response); the poller passes it through untouched — consumers such as
 * {@link EnvironmentWorker} extract the sessions token it carries and prefer
 * that over the environment key for the item's downstream calls. Treat it as
 * opaque and never log it.
 *
 * @example
 * ```ts
 * for await (const work of client.beta.environments.work.poller({
 *   environmentId,
 *   environmentKey,
 * })) {
 *   // ...service the work...
 * }
 * ```
 */
class WorkPoller {
    constructor(opts) {
        // Sub-client scoped to the environment key. Every poll / ack / stop call
        // is routed through this so the parent's `X-Api-Key` never lands on the
        // wire alongside the bearer credential. The helper-telemetry header is
        // attached as a default on this client; per-call plumbing is unnecessary.
        _WorkPoller_runnerClient.set(this, void 0);
        _WorkPoller_consumed.set(this, false);
        _WorkPoller_controller.set(this, void 0);
        _WorkPoller_detachExternal.set(this, void 0);
        _WorkPoller_autoStop.set(this, void 0);
        _WorkPoller_drain.set(this, void 0);
        _WorkPoller_blockMs.set(this, void 0);
        _WorkPoller_reclaimOlderThanMs.set(this, void 0);
        _WorkPoller_requestOpts.set(this, void 0);
        this.client = opts.client;
        this.environmentId = opts.environmentId;
        this.environmentKey = opts.environmentKey;
        this.workerId = opts.workerId ?? defaultWorkerId();
        (0,tslib/* __classPrivateFieldSet */.G)(this, _WorkPoller_runnerClient, copyClientForHelper(opts.client, {
            authToken: opts.environmentKey,
            helper: 'environments-work-poller',
        }), "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _WorkPoller_autoStop, opts.autoStop ?? true, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _WorkPoller_drain, opts.drain ?? false, "f");
        // `undefined` => default to the API cap; an explicit `null` => omit
        // `block_ms` for a non-blocking poll.
        (0,tslib/* __classPrivateFieldSet */.G)(this, _WorkPoller_blockMs, opts.blockMs === undefined ? POLL_BLOCK_MS : opts.blockMs, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _WorkPoller_reclaimOlderThanMs, opts.reclaimOlderThanMs ?? null, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _WorkPoller_requestOpts, opts.requestOptions, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _WorkPoller_controller, new AbortController(), "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _WorkPoller_detachExternal, linkAbort(opts.signal, (0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_controller, "f")), "f");
    }
    /** Read-only view of this iterator's abort signal. */
    get signal() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_controller, "f").signal;
    }
    /** Abort the iterator. The current `for await` will exit cleanly. */
    abort() {
        (0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_controller, "f").abort();
    }
    async *[(_WorkPoller_runnerClient = new WeakMap(), _WorkPoller_consumed = new WeakMap(), _WorkPoller_controller = new WeakMap(), _WorkPoller_detachExternal = new WeakMap(), _WorkPoller_autoStop = new WeakMap(), _WorkPoller_drain = new WeakMap(), _WorkPoller_blockMs = new WeakMap(), _WorkPoller_reclaimOlderThanMs = new WeakMap(), _WorkPoller_requestOpts = new WeakMap(), Symbol.asyncIterator)]() {
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_consumed, "f")) {
            throw new core_error/* AnthropicError */.pJ('Cannot iterate over a consumed WorkPoller');
        }
        (0,tslib/* __classPrivateFieldSet */.G)(this, _WorkPoller_consumed, true, "f");
        const log = (0,utils_log/* loggerFor */.WG)(this.client);
        log.info('poller starting', {
            component: 'work-poller',
            environment_id: this.environmentId,
        });
        const idle = new IdleLog(log, this.environmentId);
        try {
            let attempt = 0;
            while (!(0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_controller, "f").signal.aborted) {
                let work;
                try {
                    work = await (0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_runnerClient, "f").beta.environments.work.poll(this.environmentId, {
                        'Anthropic-Worker-ID': this.workerId,
                        ...((0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_blockMs, "f") !== null ? { block_ms: (0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_blockMs, "f") } : {}),
                        ...((0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_reclaimOlderThanMs, "f") !== null ?
                            { reclaim_older_than_ms: (0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_reclaimOlderThanMs, "f") }
                            : {}),
                    }, { headers: buildHeaders([(0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_requestOpts, "f")?.headers]), signal: (0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_controller, "f").signal });
                }
                catch (e) {
                    if ((0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_controller, "f").signal.aborted)
                        return;
                    // A bad environment key / missing environment never recovers — surface
                    // it instead of spinning forever at the backoff cap.
                    if ((0,utils_backoff/* isFatal4xx */.bs)(e)) {
                        log.error('poll failed permanently, stopping poller', { error: String(e) });
                        throw e;
                    }
                    // Jittered exponential backoff so a fleet of pollers doesn't retry in
                    // lockstep after a shared outage.
                    const wait = (0,utils_backoff/* applyJitter */.LX)(backoff(attempt));
                    log.warn('poll failed, backing off', { error: String(e), backoff_ms: wait });
                    attempt++;
                    await sleep(wait, (0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_controller, "f").signal);
                    continue;
                }
                attempt = 0;
                if (work == null) {
                    // Queue empty: either return now (drain) or wait and poll again.
                    if ((0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_drain, "f"))
                        return;
                    idle.onEmptyPoll();
                    await sleep((0,utils_backoff/* jitter */.p$)(1000, 3000), (0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_controller, "f").signal);
                    continue;
                }
                idle.onClaim();
                log.info('claimed work', {
                    component: 'work-poller',
                    environment_id: this.environmentId,
                    work_id: work.id,
                    work_type: work.data.type,
                });
                try {
                    await (0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_runnerClient, "f").beta.environments.work.ack(work.id, { environment_id: work.environment_id }, { headers: buildHeaders([(0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_requestOpts, "f")?.headers]), signal: (0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_controller, "f").signal });
                }
                catch (e) {
                    log.error('ack failed', { work_id: work.id, error: String(e) });
                    continue;
                }
                try {
                    yield work;
                }
                finally {
                    // Post-handler stop. Runs whether the consumer body returned
                    // normally, threw, or `break`d out of the loop — unless the consumer
                    // owns the stop itself (`autoStop: false`).
                    if ((0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_autoStop, "f")) {
                        try {
                            await (0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_runnerClient, "f").beta.environments.work.stop(work.id, { environment_id: work.environment_id }, { headers: buildHeaders([(0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_requestOpts, "f")?.headers]) });
                        }
                        catch (e) {
                            if (!(0,utils_backoff/* isStatus */.zM)(e, 409))
                                log.warn('stop failed', { work_id: work.id, error: String(e) });
                        }
                    }
                }
            }
        }
        finally {
            // Detach from the external signal so the consumer can drop their
            // signal reference without leaking this iterator instance.
            (0,tslib/* __classPrivateFieldGet */.g)(this, _WorkPoller_detachExternal, "f").call(this);
        }
    }
}
/** Exponential poll backoff: 1s, 2s, 4s … clamped to a 60s cap. */
function backoff(attempt) {
    return (0,utils_backoff/* backoff */.JN)(attempt, POLL_BACKOFF_BASE_MS, POLL_BACKOFF_CAP_MS);
}
/**
 * Keeps an idle poll loop visible in the logs without an INFO line per poll:
 * the first empty poll after start-up or after a claim logs at INFO and later
 * ones at DEBUG, with an INFO reminder every `IDLE_REPORT_INTERVAL_MS` while
 * the loop stays idle.
 */
class IdleLog {
    constructor(log, environmentId) {
        _IdleLog_log.set(this, void 0);
        _IdleLog_environmentId.set(this, void 0);
        _IdleLog_idleSince.set(this, void 0);
        _IdleLog_lastReport.set(this, 0);
        (0,tslib/* __classPrivateFieldSet */.G)(this, _IdleLog_log, log, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _IdleLog_environmentId, environmentId, "f");
    }
    onEmptyPoll() {
        const now = Date.now();
        const fields = { component: 'work-poller', environment_id: (0,tslib/* __classPrivateFieldGet */.g)(this, _IdleLog_environmentId, "f") };
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _IdleLog_idleSince, "f") === undefined) {
            (0,tslib/* __classPrivateFieldSet */.G)(this, _IdleLog_idleSince, (0,tslib/* __classPrivateFieldSet */.G)(this, _IdleLog_lastReport, now, "f"), "f");
            (0,tslib/* __classPrivateFieldGet */.g)(this, _IdleLog_log, "f").info('idle; polling for work', fields);
        }
        else if (now - (0,tslib/* __classPrivateFieldGet */.g)(this, _IdleLog_lastReport, "f") >= IDLE_REPORT_INTERVAL_MS) {
            (0,tslib/* __classPrivateFieldSet */.G)(this, _IdleLog_lastReport, now, "f");
            (0,tslib/* __classPrivateFieldGet */.g)(this, _IdleLog_log, "f").info(`still polling; idle for ${Math.round((now - (0,tslib/* __classPrivateFieldGet */.g)(this, _IdleLog_idleSince, "f")) / 1000)}s`, fields);
        }
        else {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _IdleLog_log, "f").debug('poll returned no work', fields);
        }
    }
    onClaim() {
        (0,tslib/* __classPrivateFieldSet */.G)(this, _IdleLog_idleSince, undefined, "f");
    }
}
_IdleLog_log = new WeakMap(), _IdleLog_environmentId = new WeakMap(), _IdleLog_idleSince = new WeakMap(), _IdleLog_lastReport = new WeakMap();
function defaultWorkerId() {
    // The API documents the worker id as a *unique* identifier for Redis consumer
    // groups, so the fallback must be unique even when several pollers share a
    // host. Prefix with the hostname when one is exposed for readability, but rely
    // on the uuid for uniqueness.
    const env = globalThis.process?.env;
    const host = env?.['HOSTNAME'];
    return host ? `${host}-${uuid4()}` : uuid4();
}
//# sourceMappingURL=poller.mjs.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/base64.mjs
var base64 = __webpack_require__(14718);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/async-queue.mjs
var _AsyncQueue_items, _AsyncQueue_waiters, _AsyncQueue_closed;

/**
 * Single-consumer async queue that bridges background producers to an
 * `AsyncIterator`-style reader. Producers `push()` items; the consumer awaits
 * `next()`. `close()` is idempotent and wakes any pending `next()` with
 * `done: true`. `tryShift()` synchronously drains remaining items after
 * iteration has been signalled to stop.
 */
class AsyncQueue {
    constructor() {
        _AsyncQueue_items.set(this, []);
        _AsyncQueue_waiters.set(this, []);
        _AsyncQueue_closed.set(this, false);
    }
    /** Enqueue an item, or hand it directly to a waiting reader. Returns `false` once closed. */
    push(item) {
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _AsyncQueue_closed, "f"))
            return false;
        const w = (0,tslib/* __classPrivateFieldGet */.g)(this, _AsyncQueue_waiters, "f").shift();
        if (w)
            w({ done: false, value: item });
        else
            (0,tslib/* __classPrivateFieldGet */.g)(this, _AsyncQueue_items, "f").push(item);
        return true;
    }
    /** Mark the queue done. Idempotent; wakes every pending reader with `done: true`. */
    close() {
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _AsyncQueue_closed, "f"))
            return;
        (0,tslib/* __classPrivateFieldSet */.G)(this, _AsyncQueue_closed, true, "f");
        while ((0,tslib/* __classPrivateFieldGet */.g)(this, _AsyncQueue_waiters, "f").length > 0) {
            const w = (0,tslib/* __classPrivateFieldGet */.g)(this, _AsyncQueue_waiters, "f").shift();
            w({ done: true, value: undefined });
        }
    }
    /**
     * Resolve with the next item, or `done: true` once the queue is closed and
     * drained. When `signal` is supplied, aborting it resolves a pending read
     * with `done: true` (cancellation is pushed down here rather than handled by
     * an outer `Promise.race`).
     */
    next(signal) {
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _AsyncQueue_items, "f").length > 0) {
            return Promise.resolve({ done: false, value: (0,tslib/* __classPrivateFieldGet */.g)(this, _AsyncQueue_items, "f").shift() });
        }
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _AsyncQueue_closed, "f") || signal?.aborted) {
            return Promise.resolve({ done: true, value: undefined });
        }
        return new Promise((resolve) => {
            const waiter = (r) => {
                signal?.removeEventListener('abort', onAbort);
                resolve(r);
            };
            const onAbort = () => {
                const idx = (0,tslib/* __classPrivateFieldGet */.g)(this, _AsyncQueue_waiters, "f").indexOf(waiter);
                if (idx >= 0)
                    (0,tslib/* __classPrivateFieldGet */.g)(this, _AsyncQueue_waiters, "f").splice(idx, 1);
                resolve({ done: true, value: undefined });
            };
            (0,tslib/* __classPrivateFieldGet */.g)(this, _AsyncQueue_waiters, "f").push(waiter);
            signal?.addEventListener('abort', onAbort, { once: true });
        });
    }
    /** Synchronously remove and return the next buffered item, or `undefined` if empty. */
    tryShift() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _AsyncQueue_items, "f").shift();
    }
}
_AsyncQueue_items = new WeakMap(), _AsyncQueue_waiters = new WeakMap(), _AsyncQueue_closed = new WeakMap();
//# sourceMappingURL=async-queue.mjs.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/tools/ToolError.mjs
var ToolError = __webpack_require__(87455);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/tools/BetaRunnableTool.mjs

/**
 * The name the model calls a tool by: `mcp_server_name` for MCP toolsets, `type` for nameless server
 * toolsets (browser/computer), `name` for everything else.
 */
function toolName(tool) {
    return ('name' in tool ? tool.name
        : 'mcp_server_name' in tool ? tool.mcp_server_name
            : tool.type);
}
/** Tool-result content for a thrown value: a {@link ToolError}'s own content, otherwise `Error: <message>`. */
function toolErrorContent(e) {
    return e instanceof ToolError/* ToolError */.v ? e.content : `Error: ${e instanceof Error ? e.message : String(e)}`;
}
/** Parse the input, run the tool, and turn anything thrown into an error result. */
async function runRunnableTool(tool, rawInput, context) {
    try {
        const input = tool.parse ? tool.parse(rawInput) : rawInput;
        const content = await tool.run(input, context);
        return { content, isError: false };
    }
    catch (e) {
        return { content: toolErrorContent(e), isError: true };
    }
}
//# sourceMappingURL=BetaRunnableTool.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/tools/SessionToolRunner.mjs
var _IdleClock_maxIdleMs, _IdleClock_onExpire, _IdleClock_blockers, _IdleClock_armPending, _IdleClock_timer, _SessionToolRunner_instances, _SessionToolRunner_consumed, _SessionToolRunner_controller, _SessionToolRunner_detachExternal, _SessionToolRunner_requestOpts, _SessionToolRunner_toolByName, _SessionToolRunner_logger, _SessionToolRunner_seen, _SessionToolRunner_answered, _SessionToolRunner_confirmationVerdicts, _SessionToolRunner_awaitingConfirmation, _SessionToolRunner_results, _SessionToolRunner_inFlightCount, _SessionToolRunner_sendRetryWindowMs, _SessionToolRunner_onIdle, _SessionToolRunner_idleClock, _SessionToolRunner_requestOptions, _SessionToolRunner_streamLoop, _SessionToolRunner_reconcile, _SessionToolRunner_ingestHistory, _SessionToolRunner_handleStreamEvent, _SessionToolRunner_routeToolEvent, _SessionToolRunner_noteConfirmation, _SessionToolRunner_applyVerdict, _SessionToolRunner_surfaceCall, _SessionToolRunner_execute, _SessionToolRunner_sendResult, _SessionToolRunner_drain;










/** Beta header for the managed-agents API. */
const MANAGED_AGENTS_BETA = 'managed-agents-2026-04-01';
const STREAM_BACKOFF_START_MS = 500;
const STREAM_BACKOFF_CAP_MS = 10000;
const TOOL_TIMEOUT_MS = 120000;
const DRAIN_TIMEOUT_MS = 30000;
const SEND_BACKOFF_START_MS = 1000;
const SEND_BACKOFF_CAP_MS = 30000;
/**
 * How long a transiently failing tool-result send keeps retrying when the
 * runner is used on its own: the server's default work-item lease TTL.
 * `EnvironmentWorker` overrides it with the live TTL from each lease heartbeat
 * (`_setSendRetryWindow`), so a send is only abandoned once the lease can no
 * longer be ours.
 */
const SEND_RETRY_WINDOW_MS = 5 * 60000;
/** Default {@link SessionToolRunnerOptions.maxIdleMs}: 60 seconds. */
const DEFAULT_MAX_IDLE_MS = 60000;
/** Returns true if `ev` is a `session.status_idle` with `stop_reason` `end_turn`. */
function isEndTurnIdle(ev) {
    return ev.type === 'session.status_idle' && ev.stop_reason?.type === 'end_turn';
}
/**
 * The `maxIdleMs` stop-countdown, including its deferral. {@link noteEvent}
 * arms on `session.status_idle` with `stop_reason: end_turn` and disarms on
 * anything else. Gated tool work registered via {@link block} — a call held for
 * user confirmation, or a user-approved call still dispatching — keeps
 * {@link arm} pending until {@link unblock} retires the last blocker, at which
 * point the countdown starts. Event-driven — there is no polling watchdog.
 */
class IdleClock {
    constructor(maxIdleMs, onExpire) {
        _IdleClock_maxIdleMs.set(this, void 0);
        _IdleClock_onExpire.set(this, void 0);
        _IdleClock_blockers.set(this, new Set());
        // Set when arm() found blockers outstanding; the unblock that retires the
        // last blocker applies it. Cleared by any disarm.
        _IdleClock_armPending.set(this, false);
        _IdleClock_timer.set(this, void 0);
        (0,tslib/* __classPrivateFieldSet */.G)(this, _IdleClock_maxIdleMs, maxIdleMs, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _IdleClock_onExpire, onExpire, "f");
    }
    /**
     * Arm on `status_idle{end_turn}`; disarm otherwise. `user.tool_confirmation`
     * is neutral: it signals neither agent activity nor an idle, and its effect
     * on the clock flows through {@link block} / {@link unblock} instead —
     * disarming here would discard the pending arm the verdict is about to
     * settle.
     */
    noteEvent(ev) {
        if (ev.type === 'user.tool_confirmation')
            return;
        if (isEndTurnIdle(ev))
            this.arm();
        else
            this.disarm();
    }
    /** Register gated work that must resolve before an idle countdown starts. */
    block(toolUseId) {
        (0,tslib/* __classPrivateFieldGet */.g)(this, _IdleClock_blockers, "f").add(toolUseId);
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _IdleClock_timer, "f") !== undefined) {
            // Defensive: every caller disarms first (any event that routes a tool
            // call is itself a disarming event), but a countdown running when gated
            // work appears is stale evidence — the session is not idly waiting to
            // stop. Convert it into a pending arm rather than let it fire over the
            // gated call.
            (0,tslib/* __classPrivateFieldSet */.G)(this, _IdleClock_armPending, true, "f");
            clearTimeout((0,tslib/* __classPrivateFieldGet */.g)(this, _IdleClock_timer, "f"));
            (0,tslib/* __classPrivateFieldSet */.G)(this, _IdleClock_timer, undefined, "f");
        }
    }
    /**
     * Retire gated work (a no-op for ids never blocked); applies a pending arm —
     * with a fresh full `maxIdleMs` window — once the last blocker retires.
     */
    unblock(toolUseId) {
        (0,tslib/* __classPrivateFieldGet */.g)(this, _IdleClock_blockers, "f").delete(toolUseId);
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _IdleClock_blockers, "f").size === 0 && (0,tslib/* __classPrivateFieldGet */.g)(this, _IdleClock_armPending, "f"))
            this.arm();
    }
    /**
     * (Re)start the idle countdown — or, while blockers are outstanding, hold
     * the arm pending instead. Stopping then would drop a held call when its
     * verdict later arrives, or cut the runner off before a released call's
     * result can drive the next turn.
     */
    arm() {
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _IdleClock_maxIdleMs, "f") <= 0)
            return;
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _IdleClock_blockers, "f").size > 0) {
            (0,tslib/* __classPrivateFieldSet */.G)(this, _IdleClock_armPending, true, "f");
            return;
        }
        (0,tslib/* __classPrivateFieldSet */.G)(this, _IdleClock_armPending, false, "f");
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _IdleClock_timer, "f") !== undefined)
            clearTimeout((0,tslib/* __classPrivateFieldGet */.g)(this, _IdleClock_timer, "f"));
        (0,tslib/* __classPrivateFieldSet */.G)(this, _IdleClock_timer, setTimeout((0,tslib/* __classPrivateFieldGet */.g)(this, _IdleClock_onExpire, "f"), (0,tslib/* __classPrivateFieldGet */.g)(this, _IdleClock_maxIdleMs, "f")), "f");
    }
    /**
     * Cancel the idle countdown and any pending arm. Blockers persist — they
     * track real outstanding work, retired only by {@link unblock}.
     */
    disarm() {
        (0,tslib/* __classPrivateFieldSet */.G)(this, _IdleClock_armPending, false, "f");
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _IdleClock_timer, "f") !== undefined) {
            clearTimeout((0,tslib/* __classPrivateFieldGet */.g)(this, _IdleClock_timer, "f"));
            (0,tslib/* __classPrivateFieldSet */.G)(this, _IdleClock_timer, undefined, "f");
        }
    }
}
_IdleClock_maxIdleMs = new WeakMap(), _IdleClock_onExpire = new WeakMap(), _IdleClock_blockers = new WeakMap(), _IdleClock_armPending = new WeakMap(), _IdleClock_timer = new WeakMap();
/**
 * The sessions-side counterpart to `client.beta.messages.toolRunner`: an
 * async-iterable that attaches to a managed-agents session, executes every
 * incoming `agent.tool_use` and `agent.custom_tool_use` event against a local
 * tool registry, posts the matching result back (`user.tool_result` for the
 * former, `user.custom_tool_result` for the latter), and yields one
 * {@link DispatchedToolCall} per completed call. Server-side `agent.mcp_tool_use`
 * calls are not dispatched. Internally drives event-stream reconnect and result
 * posting.
 *
 * A call the server gated with `evaluated_permission: "ask"` (the `always_ask`
 * policy — or any value this SDK doesn't recognize, which fails closed) is held
 * until its `user.tool_confirmation` arrives: only an explicit `allow` runs it;
 * `deny` — or any verdict this SDK doesn't recognize, failing closed — is never
 * executed and posts nothing (the denial resolves the call server-side), but is
 * still yielded (`confirmation="deny"`, `posted=false`, `result=undefined`) so
 * the consumer can observe it. A held call — and a user-approved one still
 * dispatching — defers the `maxIdleMs` countdown, so an `end_turn` idle
 * observed in the meantime cannot stop the runner: it waits until the verdict
 * arrives, the session terminates, or the abort signal fires — pass
 * `AbortSignal.timeout(...)` for a wall-clock bound.
 *
 * Iteration ends when the session terminates (`session.status_terminated` /
 * `session.deleted`), when the consumer `break`s out of the loop or aborts the
 * supplied signal, or — once the session has gone idle with
 * `stop_reason.type === "end_turn"` — when `maxIdleMs` elapses with no new
 * event (any new event resets that countdown; it re-arms on the next `end_turn`
 * idle; `maxIdleMs <= 0` disables it). The `finally` branch drains any in-flight
 * tool calls and runs each tool's `close()` cleanup hook. It does *not* touch
 * the work-item lease — wrap it in an `EnvironmentWorker` if you need
 * heartbeating / force-stop.
 *
 * @example
 * ```ts
 * import { betaAgentToolset20260401 } from '@anthropic-ai/sdk/tools/agent-toolset/node';
 *
 * for await (const call of client.beta.sessions.events.toolRunner(work.data.id, {
 *   tools: [...betaAgentToolset20260401({ workdir }), myTool],
 * })) {
 *   console.log(`${call.name} -> ${call.isError ? 'error' : 'ok'}`);
 * }
 * ```
 */
class SessionToolRunner {
    constructor(sessionId, opts) {
        _SessionToolRunner_instances.add(this);
        _SessionToolRunner_consumed.set(this, false);
        _SessionToolRunner_controller.set(this, void 0);
        _SessionToolRunner_detachExternal.set(this, void 0);
        _SessionToolRunner_requestOpts.set(this, void 0);
        _SessionToolRunner_toolByName.set(this, void 0);
        _SessionToolRunner_logger.set(this, void 0);
        _SessionToolRunner_seen.set(this, new Set());
        _SessionToolRunner_answered.set(this, new Set());
        // Confirmation gating (`always_ask` tools): `#confirmationVerdicts` records
        // every `user.tool_confirmation` verdict by `tool_use_id`;
        // `#awaitingConfirmation` holds the tool-call events whose
        // `evaluated_permission` is `ask` and whose verdict has not arrived —
        // released (or resolved as denied) by `#noteConfirmation` / the next
        // reconcile pass. Like `#seen` and `#answered`, `#confirmationVerdicts` is
        // per-session O(tool calls): recorded verdicts persist for the life of the run.
        _SessionToolRunner_confirmationVerdicts.set(this, new Map());
        _SessionToolRunner_awaitingConfirmation.set(this, new Map());
        _SessionToolRunner_results.set(this, new AsyncQueue());
        _SessionToolRunner_inFlightCount.set(this, 0);
        _SessionToolRunner_sendRetryWindowMs.set(this, SEND_RETRY_WINDOW_MS);
        _SessionToolRunner_onIdle.set(this, null);
        _SessionToolRunner_idleClock.set(this, void 0);
        this.client = opts.client;
        this.sessionId = sessionId;
        this.tools = opts.tools;
        this.maxIdleMs = opts.maxIdleMs ?? DEFAULT_MAX_IDLE_MS;
        (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionToolRunner_logger, (0,utils_log/* loggerFor */.WG)(opts.client), "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionToolRunner_toolByName, new Map(opts.tools.map((t) => [toolName(t), t])), "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionToolRunner_controller, new AbortController(), "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionToolRunner_detachExternal, linkAbort(opts.signal, (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_controller, "f")), "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionToolRunner_requestOpts, opts.requestOptions, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionToolRunner_idleClock, new IdleClock(this.maxIdleMs, () => {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_logger, "f").info('session idle after end_turn; stopping', {
                component: 'session-tool-runner',
                session_id: this.sessionId,
                max_idle_ms: this.maxIdleMs,
            });
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_controller, "f").abort();
        }), "f");
    }
    /** Read-only view of this runner's abort signal. */
    get signal() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_controller, "f").signal;
    }
    /** Abort the runner. Background tasks will wind down and `for await` will exit cleanly. */
    abort() {
        (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_controller, "f").abort();
    }
    /**
     * @internal
     * `EnvironmentWorker` keeps this equal to the lease TTL each heartbeat
     * reports; applies to a send already retrying.
     */
    _setSendRetryWindow(ms) {
        (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionToolRunner_sendRetryWindowMs, ms, "f");
    }
    async *[(_SessionToolRunner_consumed = new WeakMap(), _SessionToolRunner_controller = new WeakMap(), _SessionToolRunner_detachExternal = new WeakMap(), _SessionToolRunner_requestOpts = new WeakMap(), _SessionToolRunner_toolByName = new WeakMap(), _SessionToolRunner_logger = new WeakMap(), _SessionToolRunner_seen = new WeakMap(), _SessionToolRunner_answered = new WeakMap(), _SessionToolRunner_confirmationVerdicts = new WeakMap(), _SessionToolRunner_awaitingConfirmation = new WeakMap(), _SessionToolRunner_results = new WeakMap(), _SessionToolRunner_inFlightCount = new WeakMap(), _SessionToolRunner_sendRetryWindowMs = new WeakMap(), _SessionToolRunner_onIdle = new WeakMap(), _SessionToolRunner_idleClock = new WeakMap(), _SessionToolRunner_instances = new WeakSet(), Symbol.asyncIterator)]() {
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_consumed, "f")) {
            throw new core_error/* AnthropicError */.pJ('Cannot iterate over a consumed SessionToolRunner');
        }
        (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionToolRunner_consumed, true, "f");
        (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_logger, "f").info('session tool runner starting', {
            component: 'session-tool-runner',
            session_id: this.sessionId,
        });
        // The one background promise: drives the event stream and dispatches tools.
        // Its `.catch` aborts the controller so the main loop unwinds.
        const streamPromise = (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_streamLoop).call(this).catch((e) => {
            if (!(0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_controller, "f").signal.aborted) {
                (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_logger, "f").error('stream loop failed', { error: String(e) });
            }
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_controller, "f").abort();
        });
        try {
            // Phase 1: yield results as they arrive. `next(signal)` resolves
            // `done: true` when the controller aborts — cancellation is handled in
            // the queue read, no outer `Promise.race` needed.
            while (true) {
                const next = await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_results, "f").next((0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_controller, "f").signal);
                if (next.done)
                    break;
                yield next.value;
            }
            // Phase 2: let the stream loop settle (and push any final results), then
            // drain whatever is still queued before closing.
            await streamPromise;
            let pending;
            while ((pending = (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_results, "f").tryShift()) !== undefined) {
                yield pending;
            }
        }
        finally {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_controller, "f").abort();
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_idleClock, "f").disarm();
            // Re-await defensively in case the consumer broke out of phase 1 before
            // phase 2 ran — a no-op if it already settled.
            await streamPromise;
            try {
                await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_drain).call(this);
            }
            catch (e) {
                (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_logger, "f").warn('drain failed', { error: String(e) });
            }
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_results, "f").close();
            for (const t of this.tools) {
                try {
                    // `close` is typed `() => Promisable<void>`, so a single `await`
                    // covers both the sync and async return.
                    await t.close?.();
                }
                catch (e) {
                    (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_logger, "f").warn('tool.close failed', { tool: toolName(t), error: String(e) });
                }
            }
            // Detach from the external signal so the consumer can drop their signal
            // reference without leaking this iterator instance.
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_detachExternal, "f").call(this);
        }
    }
}
_SessionToolRunner_requestOptions = function _SessionToolRunner_requestOptions() {
    return {
        ...(0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_requestOpts, "f"),
        headers: buildHeaders([helperHeader('session-tool-runner'), (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_requestOpts, "f")?.headers]),
        signal: (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_controller, "f").signal,
    };
}, _SessionToolRunner_streamLoop = 
// ===== event stream =====
async function _SessionToolRunner_streamLoop() {
    const ctrl = (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_controller, "f");
    let backoff = STREAM_BACKOFF_START_MS;
    while (!ctrl.signal.aborted) {
        try {
            // Establish the event stream *before* reconciling history, so an event
            // emitted in the gap between listing and attaching is buffered on the
            // stream rather than lost. `seen`/`answered` dedup any event that shows
            // up both in the reconcile pass and on the live stream.
            const stream = await this.client.beta.sessions.events.stream(this.sessionId, {}, (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_requestOptions).call(this));
            await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_reconcile).call(this);
            for await (const ev of stream) {
                backoff = STREAM_BACKOFF_START_MS;
                if (await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_handleStreamEvent).call(this, ev))
                    return;
            }
        }
        catch (e) {
            // An abort throws to unwind the caller (the iterator's `streamPromise`
            // `.catch`) rather than returning early and letting it carry on.
            ctrl.signal.throwIfAborted();
            if ((0,utils_backoff/* isFatal4xx */.bs)(e)) {
                (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_logger, "f").error('permanent stream failure, shutting down', { error: String(e) });
                ctrl.abort();
                throw e;
            }
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_logger, "f").warn('stream disconnected, reconnecting', {
                error: String(e),
                backoff_ms: backoff,
            });
        }
        ctrl.signal.throwIfAborted();
        await sleep(backoff, ctrl.signal);
        backoff = Math.min(backoff * 2, STREAM_BACKOFF_CAP_MS);
    }
}, _SessionToolRunner_reconcile = 
/**
 * Read full history before dispatching so a `tool_use` whose result appears
 * later in the same history is not re-executed. Runs after the live stream is
 * already attached (see {@link SessionToolRunner.#streamLoop}).
 */
async function _SessionToolRunner_reconcile() {
    const ctrl = (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_controller, "f");
    const pending = [];
    let lastWasEndTurn = false;
    try {
        for await (const ev of this.client.beta.sessions.events.list(this.sessionId, { limit: 1000 }, (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_requestOptions).call(this))) {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_ingestHistory).call(this, ev, pending);
            lastWasEndTurn = isEndTurnIdle(ev);
        }
    }
    catch (e) {
        // An abort throws to unwind the caller; a real list failure is
        // non-fatal — undo the speculative `seen` entries and let `#streamLoop`
        // carry on with the live stream.
        ctrl.signal.throwIfAborted();
        (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_logger, "f").warn('reconcile list failed', { error: String(e) });
        // If list itself failed, undo the speculative `seen` entries so the next
        // reconcile pass (or the live stream) can pick them up. Leave the idle
        // timer untouched — the history we read may be incomplete.
        for (const ev of pending)
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_seen, "f").delete(ev.id);
        return;
    }
    const unanswered = pending.filter((ev) => !(0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_answered, "f").has(ev.id));
    // Disarm before routing: `#execute` runs inline here, so a timer left armed
    // from before the reconnect could fire over an in-flight tool.
    (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_idleClock, "f").disarm();
    for (const ev of unanswered)
        await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_routeToolEvent).call(this, ev);
    // A held call's verdict is normally applied by the routing pass above; if
    // its tool_use fell outside the listed window the pass never saw it, so
    // apply the verdict to the held copy here.
    for (const held of [...(0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_awaitingConfirmation, "f").values()]) {
        const verdict = (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_confirmationVerdicts, "f").get(held.id);
        if (verdict !== undefined)
            await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_applyVerdict).call(this, held, verdict);
    }
    // Routing resolves denied calls in place (marking them answered) and holds
    // ask-gated calls for their `user.tool_confirmation`. If the most recent
    // event in history is an `end_turn` idle and no tool work is outstanding,
    // the session is done — arm the idle clock so the runner stops even if that
    // `end_turn` arrived during a disconnect. A held call is not outstanding
    // here: it blocks the clock, so this arm stays pending until the verdict
    // (and, for an allow, the dispatch it releases) resolves it.
    const outstanding = unanswered.filter((ev) => !(0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_answered, "f").has(ev.id) && !(0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_awaitingConfirmation, "f").has(ev.id));
    if (lastWasEndTurn && outstanding.length === 0)
        (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_idleClock, "f").arm();
    else
        (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_idleClock, "f").disarm();
}, _SessionToolRunner_ingestHistory = function _SessionToolRunner_ingestHistory(ev, pending) {
    if (ev.type === 'agent.tool_use' || ev.type === 'agent.custom_tool_use') {
        // Mark the event seen so a replay on the live stream is not dispatched
        // twice, but decide whether it still needs executing from `answered`, not
        // `seen`: a call whose result post failed is seen-but-unanswered, and must
        // be retried on the next reconcile pass rather than silently dropped.
        (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_seen, "f").add(ev.id);
        if (!(0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_answered, "f").has(ev.id))
            pending.push(ev);
    }
    else if (ev.type === 'user.tool_result') {
        (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_answered, "f").add(ev.tool_use_id);
    }
    else if (ev.type === 'user.custom_tool_result') {
        (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_answered, "f").add(ev.custom_tool_use_id);
    }
    else if (ev.type === 'user.tool_confirmation') {
        // Record the verdict only, before the pending pass, so a call whose
        // confirmation appears later in the same history routes with its verdict
        // already known. Releasing a held call here as well would dispatch it a
        // second time when the routing pass reaches its tool_use event.
        if (!(0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_answered, "f").has(ev.tool_use_id))
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_confirmationVerdicts, "f").set(ev.tool_use_id, ev.result);
    }
}, _SessionToolRunner_handleStreamEvent = 
/** Returns true when the runner should exit. */
async function _SessionToolRunner_handleStreamEvent(ev) {
    (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_idleClock, "f").noteEvent(ev);
    switch (ev.type) {
        case 'agent.tool_use':
        case 'agent.custom_tool_use':
            if (!(0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_seen, "f").has(ev.id)) {
                (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_seen, "f").add(ev.id);
                await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_routeToolEvent).call(this, ev);
            }
            return false;
        case 'user.tool_confirmation':
            await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_noteConfirmation).call(this, ev);
            return false;
        case 'user.tool_result':
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_answered, "f").add(ev.tool_use_id);
            return false;
        case 'user.custom_tool_result':
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_answered, "f").add(ev.custom_tool_use_id);
            return false;
        case 'session.status_terminated':
        case 'session.deleted':
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_logger, "f").info('session terminated', {
                component: 'session-tool-runner',
                session_id: this.sessionId,
            });
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_controller, "f").abort();
            return true;
        default:
            return false;
    }
}, _SessionToolRunner_routeToolEvent = 
// ===== confirmation gating (always_ask tools) =====
/**
 * Dispatch `ev`, honoring its evaluated permission. A call the server gated
 * (`evaluated_permission == "ask"`) is held until its `user.tool_confirmation`
 * arrives. Fails closed: only an explicit `allow` verdict releases a gated
 * call; a server-side `deny` overrides any recorded verdict; an unrecognized
 * permission is held like `ask` and an unrecognized verdict is denied.
 */
async function _SessionToolRunner_routeToolEvent(ev) {
    // `getattr`-style read: today only `agent.tool_use` carries
    // `evaluated_permission`, but if it ever lands on `agent.custom_tool_use`
    // the gate must keep failing closed rather than dispatch by event type.
    const permission = ev.evaluated_permission;
    // A server-side `deny` overrides any (stray) recorded verdict.
    const verdict = permission === 'deny' ? 'deny' : (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_confirmationVerdicts, "f").get(ev.id);
    if (verdict === undefined) {
        if (permission === undefined || permission === 'allow') {
            await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_execute).call(this, ev, undefined);
        }
        else if (!(0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_awaitingConfirmation, "f").has(ev.id)) {
            // "ask" — or a permission this SDK does not recognize, which must not
            // dispatch unconfirmed — waits for the user's verdict. (Already-held: a
            // reconcile after reconnect re-routes the call; keep the existing hold.)
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_logger, "f").info('tool call awaiting confirmation; holding', {
                component: 'session-tool-runner',
                session_id: this.sessionId,
                tool: ev.name,
                tool_use_id: ev.id,
            });
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_awaitingConfirmation, "f").set(ev.id, ev);
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_idleClock, "f").block(ev.id);
        }
        return;
    }
    await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_applyVerdict).call(this, ev, verdict);
}, _SessionToolRunner_noteConfirmation = 
/** Record an allow/deny verdict and release the held call it gates, if any. */
async function _SessionToolRunner_noteConfirmation(ev) {
    (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_confirmationVerdicts, "f").set(ev.tool_use_id, ev.result);
    const held = (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_awaitingConfirmation, "f").get(ev.tool_use_id);
    // Nothing held: the verdict gates a call this runner has not seen yet (or
    // one it never gates, e.g. an `agent.mcp_tool_use`). Keeping it in
    // `#confirmationVerdicts` lets a later route of that call resolve instantly.
    if (held === undefined)
        return;
    await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_applyVerdict).call(this, held, ev.result);
}, _SessionToolRunner_applyVerdict = 
/**
 * Dispatch or resolve a gated call according to its verdict.
 *
 * The idle-clock blocker accounting lives here: a denial retires the held
 * call's blocker, while an allow keeps one on the call — taking it now if the
 * verdict was already known when the call was routed, so it was never held —
 * until `#execute` has finished with it. The countdown must not run over
 * gated work that is still in flight.
 */
async function _SessionToolRunner_applyVerdict(ev, verdict) {
    const wasHeld = (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_awaitingConfirmation, "f").delete(ev.id);
    if (verdict === 'allow') {
        (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_logger, "f").info('tool call confirmed', {
            component: 'session-tool-runner',
            session_id: this.sessionId,
            tool: ev.name,
            tool_use_id: ev.id,
        });
        if (!wasHeld)
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_idleClock, "f").block(ev.id);
        try {
            await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_execute).call(this, ev, 'allow');
        }
        finally {
            // The approved call is fully disposed of (executed, or moot because it
            // was answered elsewhere) — the sole place an allow's blocker retires.
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_idleClock, "f").unblock(ev.id);
        }
        return;
    }
    // "deny" — or any value other than an explicit "allow" (fail closed). The
    // denial resolves the call server-side, so mark it answered and yield it
    // (nothing ran, nothing posted).
    if (wasHeld)
        (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_idleClock, "f").unblock(ev.id);
    (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_answered, "f").add(ev.id);
    (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_logger, "f").info('tool call denied; not executing', {
        component: 'session-tool-runner',
        session_id: this.sessionId,
        tool: ev.name,
        tool_use_id: ev.id,
    });
    (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_surfaceCall).call(this, {
        event: ev,
        toolUseId: ev.id,
        name: ev.name,
        isError: false,
        posted: false,
        confirmation: 'deny',
    });
}, _SessionToolRunner_surfaceCall = function _SessionToolRunner_surfaceCall(call) {
    (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_results, "f").push(call);
}, _SessionToolRunner_execute = 
// ===== tool execution =====
async function _SessionToolRunner_execute(ev, confirmation) {
    var _a, _b;
    if ((0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_answered, "f").has(ev.id))
        return;
    (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_logger, "f").info('executing tool', {
        component: 'session-tool-runner',
        session_id: this.sessionId,
        tool: ev.name,
        tool_use_id: ev.id,
    });
    (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionToolRunner_inFlightCount, (_a = (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_inFlightCount, "f"), _a++, _a), "f");
    try {
        const tool = (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_toolByName, "f").get(ev.name);
        if (!tool) {
            // Skip (split-client partial fulfilment): a name this runner
            // is not registered for belongs to the other client servicing this
            // session (typically the customer's app backend handling custom tools).
            // Post NO result, do not mark it answered, and leave the tool_use_id
            // pending for its owner — claiming it would corrupt the conversation.
            // Still yield the call so the consumer can observe the unowned
            // dispatch; nothing was sent, so `posted`/`isError` stay false and no
            // `result` event is populated. The id stays unanswered, so reconcile
            // keeps it out of the idle/end-turn accounting and re-surfaces it after
            // a reconnect until its owner answers it.
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_logger, "f").info('tool not owned by this runner; leaving the tool_use_id pending for its owner', {
                component: 'session-tool-runner',
                session_id: this.sessionId,
                tool: ev.name,
                tool_use_id: ev.id,
            });
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_surfaceCall).call(this, {
                event: ev,
                toolUseId: ev.id,
                name: ev.name,
                isError: false,
                posted: false,
                confirmation,
            });
            return;
        }
        let content;
        let isError;
        // Per-tool controller: aborts on the runner's own signal *or* the
        // per-tool timeout, so an in-flight tool stops promptly when the runner
        // is aborted instead of running until the timeout.
        const toolCtrl = new AbortController();
        const detachTool = linkAbort((0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_controller, "f").signal, toolCtrl);
        const timer = setTimeout(() => toolCtrl.abort(), TOOL_TIMEOUT_MS);
        try {
            // Pass the source `agent.tool_use` / `agent.custom_tool_use` event
            // straight through as the run context's `toolUse` — it is a union
            // member of `BetaToolUse`, no Messages-block adapter needed.
            const outcome = await runRunnableTool(tool, ev.input, {
                toolUse: ev,
                toolUseBlock: ev,
                signal: toolCtrl.signal,
            });
            content = outcome.content;
            isError = outcome.isError;
        }
        finally {
            clearTimeout(timer);
            detachTool();
        }
        // Answer with the result event that matches the call kind: a
        // `user.tool_result` for an `agent.tool_use`, a `user.custom_tool_result`
        // for an `agent.custom_tool_use`. Posting the wrong one leaves the call
        // unanswered and the session stuck.
        const result = buildResultEvent(ev, isError, toSessionContent(content));
        const posted = await (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_sendResult).call(this, result, ev.id);
        (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_surfaceCall).call(this, {
            event: ev,
            result,
            toolUseId: ev.id,
            name: ev.name,
            isError,
            posted,
            confirmation,
        });
    }
    finally {
        (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionToolRunner_inFlightCount, (_b = (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_inFlightCount, "f"), _b--, _b), "f");
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_inFlightCount, "f") === 0)
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_onIdle, "f")?.call(this);
    }
}, _SessionToolRunner_sendResult = async function _SessionToolRunner_sendResult(result, toolUseId) {
    const ctrl = (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_controller, "f");
    const start = Date.now();
    let lastErr;
    let attempt = 0;
    while (true) {
        attempt++;
        // An abort throws to unwind the caller rather than returning a
        // `posted: false` result the iterator would carry on past.
        ctrl.signal.throwIfAborted();
        try {
            await this.client.beta.sessions.events.send(this.sessionId, { events: [result] }, (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_instances, "m", _SessionToolRunner_requestOptions).call(this));
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_answered, "f").add(toolUseId);
            return true;
        }
        catch (e) {
            lastErr = e;
            // Only short-circuit on a permanent 4xx; 408/409/429 deserve the
            // remaining retries (aligned with the core client's retry policy).
            if ((0,utils_backoff/* isFatal4xx */.bs)(e))
                break;
            const remainingMs = (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_sendRetryWindowMs, "f") - (Date.now() - start);
            if (remainingMs <= 0)
                break;
            const waitMs = Math.min((0,utils_backoff/* applyJitter */.LX)((0,utils_backoff/* backoff */.JN)(attempt - 1, SEND_BACKOFF_START_MS, SEND_BACKOFF_CAP_MS)), remainingMs);
            (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_logger, "f").warn('tool result send failed; retrying', {
                tool_use_id: toolUseId,
                attempt,
                backoff_ms: waitMs,
                error: String(e),
            });
            await sleep(waitMs, ctrl.signal);
        }
    }
    (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_logger, "f").error('failed to send tool result', {
        tool_use_id: toolUseId,
        attempts: attempt,
        error: String(lastErr),
    });
    return false;
}, _SessionToolRunner_drain = 
/** Wait (bounded) for in-flight tool executions to finish during teardown. */
async function _SessionToolRunner_drain() {
    if ((0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_inFlightCount, "f") === 0)
        return;
    await Promise.race([new Promise((r) => ((0,tslib/* __classPrivateFieldSet */.G)(this, _SessionToolRunner_onIdle, r, "f"))), sleep(DRAIN_TIMEOUT_MS)]);
    (0,tslib/* __classPrivateFieldSet */.G)(this, _SessionToolRunner_onIdle, null, "f");
    if ((0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_inFlightCount, "f") > 0) {
        (0,tslib/* __classPrivateFieldGet */.g)(this, _SessionToolRunner_logger, "f").warn('drain timeout exceeded');
    }
};
/**
 * Build the result event that answers `ev`: a `user.tool_result` for a builtin
 * `agent.tool_use`, a `user.custom_tool_result` for a custom
 * `agent.custom_tool_use`. The two `(use, result)` pairs are distinct API event
 * types and must be matched exactly — a `user.tool_result` does not answer a
 * custom tool call.
 */
function buildResultEvent(ev, isError, content) {
    if (ev.type === 'agent.custom_tool_use') {
        return { type: 'user.custom_tool_result', custom_tool_use_id: ev.id, is_error: isError, content };
    }
    return { type: 'user.tool_result', tool_use_id: ev.id, is_error: isError, content };
}
// The Messages-API tool-result block union is wider than the Sessions-API
// tool_result content union; pass through text/image/document and stringify
// anything else so a BetaRunnableTool authored for toolRunner still works here.
function toSessionContent(content) {
    if (typeof content === 'string')
        return [{ type: 'text', text: content || '(no output)' }];
    const out = content.map((b) => {
        if (b.type === 'text')
            return { type: 'text', text: b.text || '(no output)' };
        if (b.type === 'image' || b.type === 'document')
            return b;
        if (b.type === 'search_result') {
            // The Messages `search_result` block param maps field-for-field onto the
            // Sessions `BetaManagedAgentsSearchResultBlock`; map it explicitly rather
            // than letting it fall through to the JSON.stringify branch (which would
            // bury a structured result inside a text block). `citations` is required
            // on the Sessions side and optional on the Messages side — default the
            // flag to `false` when the producer left it unset.
            return {
                type: 'search_result',
                source: b.source,
                title: b.title,
                content: b.content.map((c) => ({ type: 'text', text: c.text })),
                citations: { enabled: b.citations?.enabled ?? false },
            };
        }
        return { type: 'text', text: JSON.stringify(b) };
    });
    return out.length > 0 ? out : [{ type: 'text', text: '(no output)' }];
}
//# sourceMappingURL=SessionToolRunner.mjs.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/tools/agent-toolset/sync-interval.mjs
var sync_interval = __webpack_require__(50033);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/environments/worker.mjs
var _EnvironmentWorker_instances, _EnvironmentWorker_signal, _EnvironmentWorker_handleItem, _Lease_ctrl, _Lease_endReason;















const HEARTBEAT_DEFAULT_MS = 30000;
const HEARTBEAT_TTL_DEFAULT_MS = 90000;
const NO_HEARTBEAT_SENTINEL = 'NO_HEARTBEAT';
/** True when the session has at least one memory store attached. */
function hasMemoryStore(session) {
    return session.resources.some((r) => r.type === 'memory_store');
}
/**
 * Extract the per-item sessions token from a work item's `secret` payload.
 *
 * The `secret` the poll response populates is not itself a credential: it is a
 * URL-safe base64 JSON payload matching {@link BetaWorkSecret} — the
 * `sessions_token` (the bearer for this item's work lifecycle and
 * session-level calls) plus fields this worker does not consume. Returns the
 * sessions token, or `null` (meaning: fall back to the environment key) when
 * the payload is missing, doesn't decode, or carries no token. Never log the
 * payload or anything extracted from it.
 */
function sessionsTokenFromSecret(secret) {
    if (!secret)
        return null;
    let parsed;
    try {
        // The payload may arrive URL-safe and without base64 padding; normalize
        // both before decoding.
        const normalized = secret.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        parsed = JSON.parse((0,utils_bytes/* decodeUTF8 */.CE)((0,base64/* fromBase64 */.E)(padded)));
    }
    catch {
        return null;
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
        return null;
    // The payload is untrusted input, so the token is still checked at runtime
    // rather than trusted to match the schema.
    const token = parsed.sessions_token;
    return typeof token === 'string' && token !== '' ? token : null;
}
/**
 * The self-hosted environment runner, composed from the control-plane
 * {@link WorkPoller} and the per-session {@link SessionToolRunner}.
 *
 * For each claimed `session` work item it: builds the per-session
 * {@link AgentToolContext}, downloads the session agent's skills
 * (`setupSkills`), then runs a {@link SessionToolRunner} for the session
 * while heartbeating the work-item lease on the same event loop; on exit it
 * force-stops the work item (unless the lease was lost, in which case the item
 * is left to whoever holds it now), cleans up the downloaded skills, and loops
 * to the next one. The lease heartbeat reports `state === "stopping"` / a lost
 * lease back into the run by aborting the session runner.
 *
 * The `environmentKey` is the worker's standing credential. When a claimed
 * work item carries a per-item `secret` (a short-lived payload the poll
 * response may populate), the sessions token extracted from it is preferred
 * over the environment key for that item's heartbeat / force-stop /
 * skill-download / session calls; polling itself always uses the environment
 * key, and items without a usable secret fall back to it entirely.
 *
 * Use {@link EnvironmentWorker.handleItem} if you already hold a claimed work
 * item (e.g. a `worker poll --on-work` script handed one to a fresh process) and
 * just want the per-item flow without the poll loop — with no arguments it reads
 * the `ANTHROPIC_*` env vars that command sets.
 *
 * Construct it via `client.beta.environments.work.worker({ ... })` (or
 * `new EnvironmentWorker({ client, ... })` directly).
 *
 * @example
 * ```ts
 * // Long-running daemon: poll for work, serve each session, loop.
 * await client.beta.environments.work
 *   .worker({ environmentId, environmentKey, workdir: '/workspace' })
 *   .run(AbortSignal.timeout(60 * 60_000));
 *
 * // Already-claimed item (e.g. inside `ant worker poll --on-work ...`):
 * await client.beta.environments.work.worker({ workdir: '/workspace' }).handleItem();
 * ```
 */
class EnvironmentWorker {
    constructor(opts) {
        _EnvironmentWorker_instances.add(this);
        _EnvironmentWorker_signal.set(this, void 0);
        if (opts.unrestrictedPaths !== undefined) {
            throw new core_error/* AnthropicError */.pJ('The `unrestrictedPaths` option you passed to EnvironmentWorker (or ' +
                'client.beta.environments.work.worker()) is no longer supported. ' +
                "The worker's file tools (read, write, edit, glob, grep) are now always confined to `workdir` " +
                "plus the session's memory folders. Remove `unrestrictedPaths` from your options; to let the " +
                'file tools reach any other directory, add it to `AgentToolContext.allowedRoots` from a ' +
                '`tools` factory.');
        }
        this.client = opts.client;
        this.environmentId = opts.environmentId;
        this.environmentKey = opts.environmentKey;
        this.tools = opts.tools;
        this.workdir = opts.workdir ?? process.cwd();
        this.maxFileBytes = opts.maxFileBytes;
        this.maxIdleMs = opts.maxIdleMs;
        if (opts.memorySyncIntervalMs != null) {
            (0,sync_interval/* checkMemorySyncInterval */.iT)(opts.memorySyncIntervalMs, 'memorySyncIntervalMs');
        }
        this.memorySyncIntervalMs = opts.memorySyncIntervalMs;
        this.memorySyncDeletions = opts.memorySyncDeletions ?? 'enabled';
        this.workerId = opts.workerId;
        this.requestOptions = opts.requestOptions;
        (0,tslib/* __classPrivateFieldSet */.G)(this, _EnvironmentWorker_signal, opts.signal, "f");
    }
    /**
     * Poll the environment and service each claimed session until the supplied
     * signal (or the one passed to the constructor) aborts. Throws if
     * `environmentId` / `environmentKey` were not provided to the constructor.
     */
    async run(signal) {
        const { environmentId, environmentKey } = this;
        if (environmentId === undefined || environmentKey === undefined) {
            throw new core_error/* AnthropicError */.pJ('EnvironmentWorker.run: environmentId and environmentKey are required to poll for work');
        }
        const externalSignal = signal ?? (0,tslib/* __classPrivateFieldGet */.g)(this, _EnvironmentWorker_signal, "f");
        const poller = new WorkPoller({
            client: this.client,
            environmentId,
            environmentKey,
            ...(this.workerId !== undefined ? { workerId: this.workerId } : {}),
            ...(externalSignal ? { signal: externalSignal } : {}),
            ...(this.requestOptions !== undefined ? { requestOptions: this.requestOptions } : {}),
            // The per-item handler stops or releases every work item on exit; let it
            // be the single owner of `work.stop` rather than double-posting from the
            // poller.
            autoStop: false,
        });
        for await (const work of poller) {
            try {
                await (0,tslib/* __classPrivateFieldGet */.g)(this, _EnvironmentWorker_instances, "m", _EnvironmentWorker_handleItem).call(this, work, environmentKey, poller.signal);
            }
            catch (e) {
                // One bad item fails that item, not the worker: the handler's teardown
                // already stopped or released it, so the next poll claims the next
                // item. A store directory left behind by a killed worker would
                // otherwise crashloop this process forever.
                if (poller.signal?.aborted)
                    throw e;
                (0,utils_log/* loggerFor */.WG)(this.client).error('work item failed', { work_id: work.id, error: String(e) });
            }
        }
    }
    /**
     * Service a single, already-claimed work item without the poll loop: build the
     * per-session {@link AgentToolContext} (workdir from this worker's options),
     * download the session agent's skills (`setupSkills`), run a
     * {@link SessionToolRunner} for the session while heartbeating the work-item
     * lease, and force-stop the work item on exit (whether the runner finishes
     * normally, throws, or the control plane signals shutdown). The one
     * exception is a lost lease: the item then belongs to the queue or another
     * worker and is left alone.
     *
     * Use this when something else does the claiming — e.g. a `worker poll
     * --on-work` script that hands an already-claimed item to a fresh process. The
     * work id / environment id / session id each fall back to `ANTHROPIC_WORK_ID` /
     * `ANTHROPIC_ENVIRONMENT_ID` / `ANTHROPIC_SESSION_ID` (the env vars that
     * command sets) when not passed; the environment key resolves from this
     * option, then the worker's own `environmentKey`, then
     * `ANTHROPIC_ENVIRONMENT_KEY`. With no arguments inside that command it just
     * works. Throws a clear error naming the first of the four required values
     * still missing after resolution. Throws `SessionMemoryError` when the
     * session has memory stores attached but they cannot be mounted — the work
     * item carried no sessions token (unless `memorySyncIntervalMs` turned
     * memory off), or a store failed to download.
     *
     * `workSecret` is the work item's per-item `secret` payload from the poll
     * response, falling back to `ANTHROPIC_WORK_SECRET`; unlike the others it is
     * optional — when present, the sessions token extracted from it is preferred
     * as the Bearer credential for this item's heartbeat / force-stop / session
     * calls; when absent (or undecodable) those calls use the environment key.
     */
    async handleItem(opts) {
        const workId = opts?.workId ?? (0,env/* readEnv */.s)('ANTHROPIC_WORK_ID');
        const environmentId = opts?.environmentId ?? (0,env/* readEnv */.s)('ANTHROPIC_ENVIRONMENT_ID');
        const sessionId = opts?.sessionId ?? (0,env/* readEnv */.s)('ANTHROPIC_SESSION_ID');
        const environmentKey = opts?.environmentKey ?? this.environmentKey ?? (0,env/* readEnv */.s)('ANTHROPIC_ENVIRONMENT_KEY');
        // `||` rather than `??` so an empty option still falls through to the env
        // var and then to null (matching how `readEnv` treats empty values).
        const workSecret = opts?.workSecret || (0,env/* readEnv */.s)('ANTHROPIC_WORK_SECRET') || null;
        if (!workId) {
            throw new core_error/* AnthropicError */.pJ('handleItem: workId is required — pass it or set ANTHROPIC_WORK_ID');
        }
        if (!environmentId) {
            throw new core_error/* AnthropicError */.pJ('handleItem: environmentId is required — pass it or set ANTHROPIC_ENVIRONMENT_ID');
        }
        if (!sessionId) {
            throw new core_error/* AnthropicError */.pJ('handleItem: sessionId is required — pass it or set ANTHROPIC_SESSION_ID');
        }
        if (!environmentKey) {
            throw new core_error/* AnthropicError */.pJ('handleItem: environmentKey is required — pass it, construct the worker with it, or set ANTHROPIC_ENVIRONMENT_KEY');
        }
        const work = {
            id: workId,
            environment_id: environmentId,
            secret: workSecret,
            data: { type: 'session', id: sessionId },
        };
        await (0,tslib/* __classPrivateFieldGet */.g)(this, _EnvironmentWorker_instances, "m", _EnvironmentWorker_handleItem).call(this, work, environmentKey, opts?.signal ?? (0,tslib/* __classPrivateFieldGet */.g)(this, _EnvironmentWorker_signal, "f"));
    }
}
_EnvironmentWorker_signal = new WeakMap(), _EnvironmentWorker_instances = new WeakSet(), _EnvironmentWorker_handleItem = 
/**
 * The per-item body shared by {@link EnvironmentWorker.run}'s poll loop and
 * {@link EnvironmentWorker.handleItem}: run a {@link SessionToolRunner} for the
 * work item's session while heartbeating its lease, force-stopping on exit
 * unless the lease was lost. Non-session work items are ignored.
 *
 * When the poll response carried a per-item `secret` (a short-lived payload
 * scoped to this work item), the sessions token extracted from it is
 * preferred over `environmentKey` as the Bearer credential for those
 * per-item calls; a missing/undecodable secret falls back to
 * `environmentKey` unchanged.
 */
async function _EnvironmentWorker_handleItem(work, environmentKey, externalSignal) {
    const log = (0,utils_log/* loggerFor */.WG)(this.client);
    // The per-item credential: the sessions token carried inside the work
    // item's secret payload when the server issued one, otherwise the
    // environment key. Never log this value.
    const sessionsToken = sessionsTokenFromSecret(work.secret);
    if (work.secret && sessionsToken === null) {
        log.warn('work item carried a secret payload but no sessions token could be extracted; ' +
            'falling back to the environment key', { work_id: work.id });
    }
    const itemCredential = sessionsToken ?? environmentKey;
    // Every per-session call — the SessionToolRunner event stream/list/send, the
    // lease heartbeat, the skill download, and the work force-stop —
    // authenticates with the per-item credential. Scope a client to it once and
    // thread that through. `copyClientForHelper` also clears the parent's
    // `apiKey`, so the sub-client emits *only* the bearer credential on the
    // wire (a plain `withOptions({authToken})` would leave `X-Api-Key` set as
    // well).
    const sessionClient = copyClientForHelper(this.client, {
        authToken: itemCredential,
        helper: 'environments-worker',
    });
    // The poller runs with `autoStop: false`, so the per-item handler is the
    // single owner of `work.stop` for every claimed item.
    const sessionId = work.data.id;
    // A per-session controller: aborts when the supplied signal aborts, when the
    // session runner finishes, or when the lease heartbeat says to stop.
    const ctrl = new AbortController();
    const detachExternal = linkAbort(externalSignal, ctrl);
    const lease = new Lease(ctrl);
    // Lazily load the Node-only toolset module — see the import note at the top.
    const agentToolset = await __webpack_require__.e(/* import() */ 508).then(__webpack_require__.bind(__webpack_require__, 77508));
    // Start the lease heartbeat BEFORE the session fetch and the skill /
    // memory downloads: those can take longer than the lease TTL, and an
    // unheartbeated lease lapsing mid-download would let another worker
    // reclaim the item and serve the same session (split-brain).
    //
    // Each heartbeat reports the lease TTL the server is enforcing; it becomes
    // the runner's tool-result send retry window so a send keeps retrying
    // exactly as long as the lease could still be live. The runner is only
    // built after the downloads, so hold the latest TTL until then.
    let leaseTtlMs;
    let runner;
    const heartbeatPromise = heartbeatLoop(sessionClient, work, lease, log, this.requestOptions, (ttlMs) => {
        leaseTtlMs = ttlMs;
        runner?._setSendRetryWindow(ttlMs);
    }).catch((e) => {
        if (!ctrl.signal.aborted)
            log.error('heartbeat loop failed', { work_id: work.id, error: String(e) });
        ctrl.abort();
    });
    let cleanupSkills = async () => { };
    let stores;
    let cleanEnd = false;
    try {
        if (work.data.type !== 'session') {
            log.debug('skipping non-session work item', { work_id: work.id, type: work.data.type });
            return;
        }
        // One session fetch, shared by the skills download and the memory-store
        // download — two fetches could disagree about the attached resources.
        // A failed fetch fails the work item (the teardown below still stops
        // or releases it).
        const session = await sessionClient.beta.sessions.retrieve(sessionId);
        // Only with the session in hand can we tell one that simply has no
        // memory from one whose memory we cannot mount. Turning memory off
        // with the interval knob is a deliberate opt-out and stays quiet.
        if (sessionsToken === null && this.memorySyncIntervalMs !== null && hasMemoryStore(session)) {
            throw new agentToolset.SessionMemoryError(`cannot mount the session's memories: the work item carried no sessions token ` +
                `(work_id=${work.id}, session_id=${sessionId}); ` +
                'the memory endpoints reject the environment key, so the poller must issue a per-item ' +
                '`secret` carrying `sessions_token`, or set `memorySyncIntervalMs: null` to run without memory');
        }
        const ctx = {
            workdir: this.workdir,
            // The scoped sub-client, not the parent: the skill download
            // `setupSkills` performs for this session rides the same per-item
            // credential as every other per-item call.
            client: sessionClient,
            session,
            ...(this.maxFileBytes !== undefined ? { maxFileBytes: this.maxFileBytes } : {}),
        };
        try {
            cleanupSkills = await agentToolset.setupSkills(ctx);
        }
        catch (e) {
            log.warn('skill setup failed', { session_id: sessionId, work_id: work.id, error: String(e) });
        }
        // Memory stores: the memory_stores endpoints accept the per-item sessions
        // token but reject the environment key, so download and sync only run when
        // the item carried a usable secret (and the interval is set).
        // `sessionClient` is already scoped to that token then, so the memory
        // calls ride the same sub-client. A store that cannot be materialised
        // throws `SessionMemoryError` out of `download` and fails the item.
        if (sessionsToken !== null && this.memorySyncIntervalMs !== null) {
            stores = new agentToolset.SessionMemoryStores(sessionClient, {
                workdir: this.workdir,
                ...(this.memorySyncIntervalMs !== undefined ? { syncIntervalMs: this.memorySyncIntervalMs } : {}),
                syncDeletions: this.memorySyncDeletions,
            });
            await stores.download(session);
            // A store mounted outside the workdir must stay reachable by the file
            // tools; read-only stores still refuse writes.
            ctx.allowedRoots = stores.roots;
            ctx.readOnlyRoots = stores.readOnlyRoots;
        }
        else {
            log.debug('memory stores disabled for this item', { work_id: work.id });
        }
        const tools = typeof this.tools === 'function' ?
            this.tools(ctx)
            : this.tools ?? agentToolset.betaAgentToolset20260401(ctx);
        runner = new SessionToolRunner(sessionId, {
            client: sessionClient,
            tools,
            ...(this.maxIdleMs !== undefined ? { maxIdleMs: this.maxIdleMs } : {}),
            ...(this.requestOptions !== undefined ? { requestOptions: this.requestOptions } : {}),
            signal: ctrl.signal,
        });
        if (leaseTtlMs !== undefined)
            runner._setSendRetryWindow(leaseTtlMs);
        for await (const _ of runner) {
            // Drive the runner to completion; per-call observability is not part
            // of this composition's surface — use `SessionToolRunner` directly
            // (via `client.beta.sessions.events.toolRunner`) if you want it.
            if (stores)
                await stores.syncIfDue();
        }
        // Only a clean stream end earns the last full sync; it runs in the
        // teardown below.
        cleanEnd = !ctrl.signal.aborted;
    }
    finally {
        // The heartbeat keeps the lease alive until this teardown is done.
        try {
            // cleanupSkills first, so its failure cannot skip the memory flush.
            await cleanupSkills().catch((e) => {
                log.warn('skill cleanup failed', { session_id: sessionId, work_id: work.id, error: String(e) });
            });
        }
        finally {
            if (stores) {
                const boundMs = agentToolset.MEMORY_FLUSH_TIMEOUT_MS;
                if (cleanEnd) {
                    const finishCutOff = await withTimeout(stores.finish(), boundMs);
                    if (finishCutOff) {
                        log.warn(`final memory sync cut off after ${boundMs}ms; the flush that follows still uploads changed files`, { session_id: sessionId, work_id: work.id });
                    }
                }
                // Also after finish(): it swallows its own failures, and a
                // clean flush is a no-op.
                const flushBound = new AbortController();
                const flushCutOff = await withTimeout(stores.flushWrites(flushBound.signal), boundMs);
                if (flushCutOff) {
                    flushBound.abort();
                    log.warn(`memory flush cut off after ${boundMs}ms; changed files it had not uploaded yet are not saved`, { session_id: sessionId, work_id: work.id });
                }
                await stores.dispose().catch((e) => {
                    log.warn('memory store cleanup failed', {
                        session_id: sessionId,
                        work_id: work.id,
                        error: String(e),
                    });
                });
            }
        }
        lease.finish('runner_done');
        detachExternal();
        await heartbeatPromise;
        // Stop only an item this worker still holds — after a lost lease it
        // belongs to the queue or another worker.
        if (lease.lost) {
            log.info('lease lost; released without stopping it', { session_id: sessionId, work_id: work.id });
        }
        else {
            await forceStop(sessionClient, work, log, this.requestOptions);
        }
    }
};
/**
 * Resolve when `p` settles or `ms` elapses — `true` when `ms` elapsed
 * first. A timed-out `p` keeps running — JS cannot cancel a promise.
 */
async function withTimeout(p, ms) {
    let timer;
    try {
        return await Promise.race([
            p.then(() => false, () => false),
            new Promise((resolve) => {
                timer = setTimeout(() => resolve(true), ms);
            }),
        ]);
    }
    finally {
        if (timer !== undefined)
            clearTimeout(timer);
    }
}
/** Force-stop a claimed work item, swallowing the 409 that means it's already stopped. */
async function forceStop(client, work, log, requestOptions) {
    try {
        await client.beta.environments.work.stop(work.id, { environment_id: work.environment_id, force: true }, 
        // Caller's headers pass through; the helper-tag header is on the scoped
        // sub-client's default_headers via copyClientForHelper, so no per-call
        // re-stamping needed.
        { ...requestOptions, headers: buildHeaders([requestOptions?.headers]) });
    }
    catch (e) {
        if (!(0,utils_backoff/* isStatus */.zM)(e, 409)) {
            log.error('force-stop on exit failed', { work_id: work.id, error: String(e) });
        }
    }
}
/**
 * This worker's view of one work-item lease: the per-item abort signal plus
 * why heartbeating ended. The first recorded reason wins, so a run aborted
 * *because* the lease was lost still reads as lost afterwards; an abort with
 * no recorded reason (the external signal) is not lost.
 */
class Lease {
    constructor(ctrl) {
        _Lease_ctrl.set(this, void 0);
        _Lease_endReason.set(this, void 0);
        (0,tslib/* __classPrivateFieldSet */.G)(this, _Lease_ctrl, ctrl, "f");
    }
    get signal() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _Lease_ctrl, "f").signal;
    }
    finish(reason) {
        (0,tslib/* __classPrivateFieldSet */.G)(this, _Lease_endReason, (0,tslib/* __classPrivateFieldGet */.g)(this, _Lease_endReason, "f") ?? reason, "f");
        (0,tslib/* __classPrivateFieldGet */.g)(this, _Lease_ctrl, "f").abort();
    }
    /** True once the item belongs to the queue or another worker. */
    get lost() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _Lease_endReason, "f") === 'lease_lost' || (0,tslib/* __classPrivateFieldGet */.g)(this, _Lease_endReason, "f") === 'assumed_lost';
    }
}
_Lease_ctrl = new WeakMap(), _Lease_endReason = new WeakMap();
/** The server's view of the lease carried by a 412 heartbeat response, or empty if absent. */
function serverLeaseState(e) {
    let node = e instanceof core_error/* APIError */.LG ? e.error : undefined;
    for (const key of ['error', 'details', 'current_state']) {
        if (!(0,utils_values/* isObj */.sA)(node))
            return {};
        node = node[key];
    }
    return (0,utils_values/* isObj */.sA)(node) ? node : {};
}
/**
 * Keep the work-item lease alive while a session is being served. Runs until
 * `lease` ends, and ends it itself when the control plane reports the work is
 * `stopping`/`stopped` or no longer extends the lease, when a heartbeat is
 * rejected (a 412 means the lease already belongs to someone else), or when no
 * heartbeat has succeeded for longer than the lease ttl (the lease is assumed
 * lost, so two runners don't end up serving the same work). Each heartbeat
 * call is cut off after the current beat interval so a hung request cannot
 * outlive the lease it is meant to renew.
 */
async function heartbeatLoop(client, work, lease, logger, requestOptions, 
/** Called with the server-reported lease TTL after every successful beat. */
onLeaseTtl) {
    let intervalMs = HEARTBEAT_DEFAULT_MS;
    let ttlMs = HEARTBEAT_TTL_DEFAULT_MS;
    let lastSuccessMs = Date.now();
    let last = NO_HEARTBEAT_SENTINEL;
    const beat = async () => {
        // Not the request `timeout` option: the core client retries timeouts, so
        // it would not bound the call as a whole.
        const beatCtrl = new AbortController();
        const detach = linkAbort(lease.signal, beatCtrl);
        const cutoff = setTimeout(() => beatCtrl.abort(), intervalMs);
        try {
            const resp = await client.beta.environments.work.heartbeat(work.id, { environment_id: work.environment_id, expected_last_heartbeat: last }, { ...requestOptions, headers: buildHeaders([requestOptions?.headers]), signal: beatCtrl.signal });
            lastSuccessMs = Date.now();
            last = resp.last_heartbeat;
            if (resp.ttl_seconds > 0) {
                ttlMs = resp.ttl_seconds * 1000;
                intervalMs = Math.max(1000, Math.min(ttlMs / 2, HEARTBEAT_DEFAULT_MS));
                onLeaseTtl?.(ttlMs);
            }
            if (resp.state === 'stopping' || resp.state === 'stopped') {
                logger.info('heartbeat signals shutdown', { work_id: work.id, state: resp.state });
                lease.finish('control_plane_stop');
            }
            if (!resp.lease_extended) {
                logger.warn('lease not extended, shutting down', { work_id: work.id });
                lease.finish('control_plane_stop');
            }
        }
        catch (e) {
            // An abort throws to unwind the caller (the `heartbeatLoop(...).catch`
            // in `#handleItem`) rather than returning early.
            lease.signal.throwIfAborted();
            if ((0,utils_backoff/* isStatus */.zM)(e, 412)) {
                const server = serverLeaseState(e);
                logger.error('lease lost: heartbeat precondition failed', {
                    work_id: work.id,
                    server_state: server['state'],
                    server_ttl_seconds: server['ttl_seconds'],
                    server_last_heartbeat: server['last_heartbeat'],
                });
                lease.finish('lease_lost');
                return;
            }
            if ((0,utils_backoff/* isFatal4xx */.bs)(e)) {
                logger.error('permanent heartbeat failure', { work_id: work.id, error: String(e) });
                lease.finish('heartbeat_rejected');
                throw e;
            }
            if (Date.now() - lastSuccessMs > ttlMs) {
                logger.error('lease assumed lost: no successful heartbeat in ttl', {
                    work_id: work.id,
                    ttl_ms: ttlMs,
                    error: String(e),
                });
                lease.finish('assumed_lost');
                return;
            }
            logger.warn('transient heartbeat failure', { work_id: work.id, error: String(e) });
        }
        finally {
            clearTimeout(cutoff);
            detach();
        }
    };
    await beat();
    while (!lease.signal.aborted) {
        await sleep(intervalMs, lease.signal);
        lease.signal.throwIfAborted();
        await beat();
    }
}
//# sourceMappingURL=worker.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/environments/work.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.






class Work extends APIResource {
    /**
     * Note: these endpoints are called automatically by the pre-built environment
     * worker provided in the SDKs and CLI, for orchestrating sessions with self-hosted
     * sandbox environments. They are included here as a reference; you do not need to
     * invoke them directly.
     *
     * Retrieve detailed information about a specific work item.
     *
     * @example
     * ```ts
     * const betaSelfHostedWork =
     *   await client.beta.environments.work.retrieve('work_id', {
     *     environment_id: 'env_011CZkZ9X2dpNyB7HsEFoRfW',
     *   });
     * ```
     */
    retrieve(workID, params, options) {
        const { environment_id, betas, workspace_id } = params;
        return this._client.get(path `/v1/environments/${environment_id}/work/${workID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Note: these endpoints are called automatically by the pre-built environment
     * worker provided in the SDKs and CLI, for orchestrating sessions with self-hosted
     * sandbox environments. They are included here as a reference; you do not need to
     * invoke them directly.
     *
     * Update work item metadata with merge semantics.
     *
     * @example
     * ```ts
     * const betaSelfHostedWork =
     *   await client.beta.environments.work.update('work_id', {
     *     environment_id: 'env_011CZkZ9X2dpNyB7HsEFoRfW',
     *     metadata: { foo: 'string' },
     *   });
     * ```
     */
    update(workID, params, options) {
        const { environment_id, betas, workspace_id, ...body } = params;
        return this._client.post(path `/v1/environments/${environment_id}/work/${workID}?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Note: these endpoints are called automatically by the pre-built environment
     * worker provided in the SDKs and CLI, for orchestrating sessions with self-hosted
     * sandbox environments. They are included here as a reference; you do not need to
     * invoke them directly.
     *
     * List work items in an environment.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaSelfHostedWork of client.beta.environments.work.list(
     *   'env_011CZkZ9X2dpNyB7HsEFoRfW',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(environmentID, params = {}, options) {
        const { betas, ...query } = params ?? {};
        return this._client.getAPIList(path `/v1/environments/${environmentID}/work?beta=true`, (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                { 'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString() },
                options?.headers,
            ]),
        });
    }
    /**
     * Note: these endpoints are called automatically by the pre-built environment
     * worker provided in the SDKs and CLI, for orchestrating sessions with self-hosted
     * sandbox environments. They are included here as a reference; you do not need to
     * invoke them directly.
     *
     * Acknowledge receipt of a work item, transitioning it from 'queued' to 'starting'
     * and removing it from the queue.
     *
     * @example
     * ```ts
     * const betaSelfHostedWork =
     *   await client.beta.environments.work.ack('work_id', {
     *     environment_id: 'env_011CZkZ9X2dpNyB7HsEFoRfW',
     *   });
     * ```
     */
    ack(workID, params, options) {
        const { environment_id, betas } = params;
        return this._client.post(path `/v1/environments/${environment_id}/work/${workID}/ack?beta=true`, {
            ...options,
            headers: buildHeaders([
                { 'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString() },
                options?.headers,
            ]),
        });
    }
    /**
     * Note: these endpoints are called automatically by the pre-built environment
     * worker provided in the SDKs and CLI, for orchestrating sessions with self-hosted
     * sandbox environments. They are included here as a reference; you do not need to
     * invoke them directly.
     *
     * Record a heartbeat for a work item to maintain the lease.
     *
     * @example
     * ```ts
     * const betaSelfHostedWorkHeartbeatResponse =
     *   await client.beta.environments.work.heartbeat('work_id', {
     *     environment_id: 'env_011CZkZ9X2dpNyB7HsEFoRfW',
     *   });
     * ```
     */
    heartbeat(workID, params, options) {
        const { environment_id, desired_ttl_seconds, expected_last_heartbeat, betas } = params;
        return this._client.post(path `/v1/environments/${environment_id}/work/${workID}/heartbeat?beta=true`, {
            query: { desired_ttl_seconds, expected_last_heartbeat },
            ...options,
            headers: buildHeaders([
                { 'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString() },
                options?.headers,
            ]),
        });
    }
    /**
     * Note: these endpoints are called automatically by the pre-built environment
     * worker provided in the SDKs and CLI, for orchestrating sessions with self-hosted
     * sandbox environments. They are included here as a reference; you do not need to
     * invoke them directly.
     *
     * Long poll for work items in the queue.
     *
     * @example
     * ```ts
     * const betaSelfHostedWork =
     *   await client.beta.environments.work.poll(
     *     'env_011CZkZ9X2dpNyB7HsEFoRfW',
     *   );
     * ```
     */
    poll(environmentID, params = {}, options) {
        const { betas, 'Anthropic-Worker-ID': anthropicWorkerID, ...query } = params ?? {};
        return this._client.get(path `/v1/environments/${environmentID}/work/poll?beta=true`, {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(anthropicWorkerID != null ? { 'Anthropic-Worker-ID': anthropicWorkerID } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Get statistics about the work queue for an environment.
     *
     * @example
     * ```ts
     * const betaSelfHostedWorkQueueStats =
     *   await client.beta.environments.work.stats(
     *     'env_011CZkZ9X2dpNyB7HsEFoRfW',
     *   );
     * ```
     */
    stats(environmentID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.get(path `/v1/environments/${environmentID}/work/stats?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Note: these endpoints are called automatically by the pre-built environment
     * worker provided in the SDKs and CLI, for orchestrating sessions with self-hosted
     * sandbox environments. They are included here as a reference; you do not need to
     * invoke them directly.
     *
     * Stop a work item, initiating graceful or forced shutdown.
     *
     * @example
     * ```ts
     * const betaSelfHostedWork =
     *   await client.beta.environments.work.stop('work_id', {
     *     environment_id: 'env_011CZkZ9X2dpNyB7HsEFoRfW',
     *   });
     * ```
     */
    stop(workID, params, options) {
        const { environment_id, betas, workspace_id, ...body } = params;
        return this._client.post(path `/v1/environments/${environment_id}/work/${workID}/stop?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Continuously claim work from a self-hosted environment, ack each item,
     * and yield it. Posts `stop` automatically when the consumer's loop body
     * returns or when iteration ends.
     *
     * @example
     * ```ts
     * for await (const work of client.beta.environments.work.poller({
     *   environmentId,
     *   environmentKey,
     * })) {
     *   if (work.data.type !== 'session') continue;
     *   // ...service the work...
     * }
     * ```
     */
    poller(opts) {
        return new WorkPoller({ ...opts, client: this._client });
    }
    worker(opts) {
        return new EnvironmentWorker({ ...opts, client: this._client });
    }
}


Work.WorkPoller = WorkPoller;
Work.EnvironmentWorker = EnvironmentWorker;
//# sourceMappingURL=work.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/environments/environments.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.






class Environments extends APIResource {
    constructor() {
        super(...arguments);
        this.work = new Work(this._client);
    }
    /**
     * Create a new environment with the specified configuration.
     *
     * @example
     * ```ts
     * const betaEnvironment =
     *   await client.beta.environments.create({
     *     name: 'python-data-analysis',
     *   });
     * ```
     */
    create(params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post('/v1/environments?beta=true', {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Retrieve a specific environment by ID.
     *
     * @example
     * ```ts
     * const betaEnvironment =
     *   await client.beta.environments.retrieve(
     *     'env_011CZkZ9X2dpNyB7HsEFoRfW',
     *   );
     * ```
     */
    retrieve(environmentID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.get(path `/v1/environments/${environmentID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Update an existing environment's configuration.
     *
     * @example
     * ```ts
     * const betaEnvironment =
     *   await client.beta.environments.update(
     *     'env_011CZkZ9X2dpNyB7HsEFoRfW',
     *   );
     * ```
     */
    update(environmentID, params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post(path `/v1/environments/${environmentID}?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * List environments with pagination support.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaEnvironment of client.beta.environments.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList('/v1/environments?beta=true', (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Delete an environment by ID. Returns a confirmation of the deletion.
     *
     * @example
     * ```ts
     * const betaEnvironmentDeleteResponse =
     *   await client.beta.environments.delete(
     *     'env_011CZkZ9X2dpNyB7HsEFoRfW',
     *   );
     * ```
     */
    delete(environmentID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.delete(path `/v1/environments/${environmentID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Archive an environment by ID. Archived environments cannot be used to create new
     * sessions.
     *
     * @example
     * ```ts
     * const betaEnvironment =
     *   await client.beta.environments.archive(
     *     'env_011CZkZ9X2dpNyB7HsEFoRfW',
     *   );
     * ```
     */
    archive(environmentID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.post(path `/v1/environments/${environmentID}/archive?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
Environments.Work = Work;
//# sourceMappingURL=environments.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/memory-stores/memories.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.




class Memories extends APIResource {
    /**
     * Create a memory
     *
     * @example
     * ```ts
     * const betaManagedAgentsMemory =
     *   await client.beta.memoryStores.memories.create(
     *     'memory_store_id',
     *     { content: 'content', path: 'xx' },
     *   );
     * ```
     */
    create(memoryStoreID, params, options) {
        const { view, betas, workspace_id, ...body } = params;
        return this._client.post(path `/v1/memory_stores/${memoryStoreID}/memories?beta=true`, {
            query: { view },
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'agent-memory-2026-07-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Retrieve a memory
     *
     * @example
     * ```ts
     * const betaManagedAgentsMemory =
     *   await client.beta.memoryStores.memories.retrieve(
     *     'memory_id',
     *     { memory_store_id: 'memory_store_id' },
     *   );
     * ```
     */
    retrieve(memoryID, params, options) {
        const { memory_store_id, betas, workspace_id, ...query } = params;
        return this._client.get(path `/v1/memory_stores/${memory_store_id}/memories/${memoryID}?beta=true`, {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'agent-memory-2026-07-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Update a memory
     *
     * @example
     * ```ts
     * const betaManagedAgentsMemory =
     *   await client.beta.memoryStores.memories.update(
     *     'memory_id',
     *     { memory_store_id: 'memory_store_id' },
     *   );
     * ```
     */
    update(memoryID, params, options) {
        const { memory_store_id, view, betas, workspace_id, ...body } = params;
        return this._client.post(path `/v1/memory_stores/${memory_store_id}/memories/${memoryID}?beta=true`, {
            query: { view },
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'agent-memory-2026-07-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * List memories
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaManagedAgentsMemoryListItem of client.beta.memoryStores.memories.list(
     *   'memory_store_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(memoryStoreID, params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList(path `/v1/memory_stores/${memoryStoreID}/memories?beta=true`, (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'agent-memory-2026-07-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Delete a memory
     *
     * @example
     * ```ts
     * const betaManagedAgentsDeletedMemory =
     *   await client.beta.memoryStores.memories.delete(
     *     'memory_id',
     *     { memory_store_id: 'memory_store_id' },
     *   );
     * ```
     */
    delete(memoryID, params, options) {
        const { memory_store_id, expected_content_sha256, betas, workspace_id } = params;
        return this._client.delete(path `/v1/memory_stores/${memory_store_id}/memories/${memoryID}?beta=true`, {
            query: { expected_content_sha256 },
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'agent-memory-2026-07-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
//# sourceMappingURL=memories.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/memory-stores/memory-versions.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.




class MemoryVersions extends APIResource {
    /**
     * Retrieve a memory version
     *
     * @example
     * ```ts
     * const betaManagedAgentsMemoryVersion =
     *   await client.beta.memoryStores.memoryVersions.retrieve(
     *     'memory_version_id',
     *     { memory_store_id: 'memory_store_id' },
     *   );
     * ```
     */
    retrieve(memoryVersionID, params, options) {
        const { memory_store_id, betas, workspace_id, ...query } = params;
        return this._client.get(path `/v1/memory_stores/${memory_store_id}/memory_versions/${memoryVersionID}?beta=true`, {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'agent-memory-2026-07-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * List memory versions
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaManagedAgentsMemoryVersion of client.beta.memoryStores.memoryVersions.list(
     *   'memory_store_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(memoryStoreID, params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList(path `/v1/memory_stores/${memoryStoreID}/memory_versions?beta=true`, (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'agent-memory-2026-07-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Redact a memory version
     *
     * @example
     * ```ts
     * const betaManagedAgentsMemoryVersion =
     *   await client.beta.memoryStores.memoryVersions.redact(
     *     'memory_version_id',
     *     { memory_store_id: 'memory_store_id' },
     *   );
     * ```
     */
    redact(memoryVersionID, params, options) {
        const { memory_store_id, betas, workspace_id } = params;
        return this._client.post(path `/v1/memory_stores/${memory_store_id}/memory_versions/${memoryVersionID}/redact?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'agent-memory-2026-07-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
//# sourceMappingURL=memory-versions.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/memory-stores/memory-stores.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.








class MemoryStores extends APIResource {
    constructor() {
        super(...arguments);
        this.memories = new Memories(this._client);
        this.memoryVersions = new MemoryVersions(this._client);
    }
    /**
     * Create a memory store
     *
     * @example
     * ```ts
     * const betaManagedAgentsMemoryStore =
     *   await client.beta.memoryStores.create({ name: 'x' });
     * ```
     */
    create(params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post('/v1/memory_stores?beta=true', {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'agent-memory-2026-07-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Retrieve a memory store
     *
     * @example
     * ```ts
     * const betaManagedAgentsMemoryStore =
     *   await client.beta.memoryStores.retrieve(
     *     'memory_store_id',
     *   );
     * ```
     */
    retrieve(memoryStoreID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.get(path `/v1/memory_stores/${memoryStoreID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'agent-memory-2026-07-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Update a memory store
     *
     * @example
     * ```ts
     * const betaManagedAgentsMemoryStore =
     *   await client.beta.memoryStores.update('memory_store_id');
     * ```
     */
    update(memoryStoreID, params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post(path `/v1/memory_stores/${memoryStoreID}?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'agent-memory-2026-07-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * List memory stores
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaManagedAgentsMemoryStore of client.beta.memoryStores.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList('/v1/memory_stores?beta=true', (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'agent-memory-2026-07-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Delete a memory store
     *
     * @example
     * ```ts
     * const betaManagedAgentsDeletedMemoryStore =
     *   await client.beta.memoryStores.delete('memory_store_id');
     * ```
     */
    delete(memoryStoreID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.delete(path `/v1/memory_stores/${memoryStoreID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'agent-memory-2026-07-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Archive a memory store
     *
     * @example
     * ```ts
     * const betaManagedAgentsMemoryStore =
     *   await client.beta.memoryStores.archive('memory_store_id');
     * ```
     */
    archive(memoryStoreID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.post(path `/v1/memory_stores/${memoryStoreID}/archive?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'agent-memory-2026-07-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
MemoryStores.Memories = Memories;
MemoryStores.MemoryVersions = MemoryVersions;
//# sourceMappingURL=memory-stores.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/error.mjs
/** @deprecated Import from ./core/error instead */

//# sourceMappingURL=error.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/decoders/jsonl.mjs



class JSONLDecoder {
    constructor(iterator, controller) {
        this.iterator = iterator;
        this.controller = controller;
    }
    async *decoder() {
        const lineDecoder = new LineDecoder();
        for await (const chunk of this.iterator) {
            for (const line of lineDecoder.decode(chunk)) {
                yield JSON.parse(line);
            }
        }
        for (const line of lineDecoder.flush()) {
            yield JSON.parse(line);
        }
    }
    [Symbol.asyncIterator]() {
        return this.decoder();
    }
    static fromResponse(response, controller) {
        if (!response.body) {
            controller.abort();
            if (typeof globalThis.navigator !== 'undefined' &&
                globalThis.navigator.product === 'ReactNative') {
                throw new core_error/* AnthropicError */.pJ(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
            }
            throw new core_error/* AnthropicError */.pJ(`Attempted to iterate over a response with no body`);
        }
        return new JSONLDecoder(ReadableStreamToAsyncIterable(response.body), controller);
    }
}
//# sourceMappingURL=jsonl.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/messages/batches.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.






class Batches extends APIResource {
    /**
     * Send a batch of Message creation requests.
     *
     * The Message Batches API can be used to process multiple Messages API requests at
     * once. Once a Message Batch is created, it begins processing immediately. Batches
     * can take up to 24 hours to complete.
     *
     * Learn more about the Message Batches API in our
     * [user guide](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
     *
     * @example
     * ```ts
     * const betaMessageBatch =
     *   await client.beta.messages.batches.create({
     *     requests: [
     *       {
     *         custom_id: 'my-custom-id-1',
     *         params: {
     *           max_tokens: 1024,
     *           messages: [
     *             { content: 'Hello, world', role: 'user' },
     *           ],
     *           model: 'claude-opus-5',
     *         },
     *       },
     *     ],
     *   });
     * ```
     */
    create(params, options) {
        const { betas, user_profile_id, workspace_id, ...body } = params;
        return this._client.post('/v1/messages/batches?beta=true', {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'message-batches-2024-09-24'].toString(),
                    ...(user_profile_id != null ? { 'anthropic-user-profile-id': user_profile_id } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * This endpoint is idempotent and can be used to poll for Message Batch
     * completion. To access the results of a Message Batch, make a request to the
     * `results_url` field in the response.
     *
     * Learn more about the Message Batches API in our
     * [user guide](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
     *
     * @example
     * ```ts
     * const betaMessageBatch =
     *   await client.beta.messages.batches.retrieve(
     *     'message_batch_id',
     *   );
     * ```
     */
    retrieve(messageBatchID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.get(path `/v1/messages/batches/${messageBatchID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'message-batches-2024-09-24'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * List all Message Batches within a Workspace. Most recently created batches are
     * returned first.
     *
     * Learn more about the Message Batches API in our
     * [user guide](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaMessageBatch of client.beta.messages.batches.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList('/v1/messages/batches?beta=true', (Page), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'message-batches-2024-09-24'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Delete a Message Batch.
     *
     * Message Batches can only be deleted once they've finished processing. If you'd
     * like to delete an in-progress batch, you must first cancel it.
     *
     * Learn more about the Message Batches API in our
     * [user guide](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
     *
     * @example
     * ```ts
     * const betaDeletedMessageBatch =
     *   await client.beta.messages.batches.delete(
     *     'message_batch_id',
     *   );
     * ```
     */
    delete(messageBatchID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.delete(path `/v1/messages/batches/${messageBatchID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'message-batches-2024-09-24'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Batches may be canceled any time before processing ends. Once cancellation is
     * initiated, the batch enters a `canceling` state, at which time the system may
     * complete any in-progress, non-interruptible requests before finalizing
     * cancellation.
     *
     * The number of canceled requests is specified in `request_counts`. To determine
     * which requests were canceled, check the individual results within the batch.
     * Note that cancellation may not result in any canceled requests if they were
     * non-interruptible.
     *
     * Learn more about the Message Batches API in our
     * [user guide](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
     *
     * @example
     * ```ts
     * const betaMessageBatch =
     *   await client.beta.messages.batches.cancel(
     *     'message_batch_id',
     *   );
     * ```
     */
    cancel(messageBatchID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.post(path `/v1/messages/batches/${messageBatchID}/cancel?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'message-batches-2024-09-24'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Streams the results of a Message Batch as a `.jsonl` file.
     *
     * Each line in the file is a JSON object containing the result of a single request
     * in the Message Batch. Results are not guaranteed to be in the same order as
     * requests. Use the `custom_id` field to match results to requests.
     *
     * Learn more about the Message Batches API in our
     * [user guide](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
     *
     * @example
     * ```ts
     * const betaMessageBatchIndividualResponse =
     *   await client.beta.messages.batches.results(
     *     'message_batch_id',
     *   );
     * ```
     */
    async results(messageBatchID, params = {}, options) {
        const batch = await this.retrieve(messageBatchID, params, options);
        if (!batch.results_url) {
            throw new core_error/* AnthropicError */.pJ(`No batch \`results_url\`; Has it finished processing? ${batch.processing_status} - ${batch.id}`);
        }
        const { betas, workspace_id } = params ?? {};
        return this._client
            .get(batch.results_url, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'message-batches-2024-09-24'].toString(),
                    Accept: 'application/binary',
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
            stream: true,
            __binaryResponse: true,
        })
            ._thenUnwrap((_, props) => JSONLDecoder.fromResponse(props.response, props.controller));
    }
}
//# sourceMappingURL=batches.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/constants.mjs
// File containing shared constants
/**
 * Model-specific timeout constraints for non-streaming requests
 */
const MODEL_NONSTREAMING_TOKENS = {
    'claude-opus-4@20250514': 8192,
    'anthropic.claude-opus-4-1-20250805-v1:0': 8192,
    'claude-opus-4-1@20250805': 8192,
};
//# sourceMappingURL=constants.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/beta-parser.mjs

function getOutputFormat(params) {
    // Prefer output_format (deprecated) over output_config.format for backward compatibility
    return params?.output_format ?? params?.output_config?.format;
}
function maybeParseBetaMessage(message, params, opts) {
    const outputFormat = getOutputFormat(params);
    if (!params || !('parse' in (outputFormat ?? {}))) {
        return {
            ...message,
            content: message.content.map((block) => {
                if (block.type === 'text') {
                    const parsedBlock = Object.defineProperty({ ...block }, 'parsed_output', {
                        value: null,
                        enumerable: false,
                    });
                    return Object.defineProperty(parsedBlock, 'parsed', {
                        get() {
                            opts.logger.warn('The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead.');
                            return null;
                        },
                        enumerable: false,
                    });
                }
                return block;
            }),
            parsed_output: null,
        };
    }
    return parseBetaMessage(message, params, opts);
}
function parseBetaMessage(message, params, opts) {
    let firstParsedOutput = null;
    const content = message.content.map((block) => {
        if (block.type === 'text') {
            const parsedOutput = parseBetaOutputFormat(params, block.text);
            if (firstParsedOutput === null) {
                firstParsedOutput = parsedOutput;
            }
            const parsedBlock = Object.defineProperty({ ...block }, 'parsed_output', {
                value: parsedOutput,
                enumerable: false,
            });
            return Object.defineProperty(parsedBlock, 'parsed', {
                get() {
                    opts.logger.warn('The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead.');
                    return parsedOutput;
                },
                enumerable: false,
            });
        }
        return block;
    });
    return {
        ...message,
        content,
        parsed_output: firstParsedOutput,
    };
}
function parseBetaOutputFormat(params, content) {
    const outputFormat = getOutputFormat(params);
    if (outputFormat?.type !== 'json_schema') {
        return null;
    }
    try {
        if ('parse' in outputFormat) {
            return outputFormat.parse(content);
        }
        return JSON.parse(content);
    }
    catch (error) {
        throw new core_error/* AnthropicError */.pJ(`Failed to parse structured output: ${error}`);
    }
}
//# sourceMappingURL=beta-parser.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/streaming.mjs
/** @deprecated Import from ./core/streaming instead */

//# sourceMappingURL=streaming.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/_vendor/partial-json-parser/parser.mjs
const tokenize = (input) => {
    let current = 0;
    let tokens = [];
    while (current < input.length) {
        let char = input[current];
        if (char === '\\') {
            current++;
            continue;
        }
        if (char === '{') {
            tokens.push({
                type: 'brace',
                value: '{',
            });
            current++;
            continue;
        }
        if (char === '}') {
            tokens.push({
                type: 'brace',
                value: '}',
            });
            current++;
            continue;
        }
        if (char === '[') {
            tokens.push({
                type: 'paren',
                value: '[',
            });
            current++;
            continue;
        }
        if (char === ']') {
            tokens.push({
                type: 'paren',
                value: ']',
            });
            current++;
            continue;
        }
        if (char === ':') {
            tokens.push({
                type: 'separator',
                value: ':',
            });
            current++;
            continue;
        }
        if (char === ',') {
            tokens.push({
                type: 'delimiter',
                value: ',',
            });
            current++;
            continue;
        }
        if (char === '"') {
            let value = '';
            let danglingQuote = false;
            char = input[++current];
            while (char !== '"') {
                if (current === input.length) {
                    danglingQuote = true;
                    break;
                }
                if (char === '\\') {
                    current++;
                    if (current === input.length) {
                        danglingQuote = true;
                        break;
                    }
                    value += char + input[current];
                    char = input[++current];
                }
                else {
                    value += char;
                    char = input[++current];
                }
            }
            char = input[++current];
            if (!danglingQuote) {
                tokens.push({
                    type: 'string',
                    value,
                });
            }
            continue;
        }
        let WHITESPACE = /\s/;
        if (char && WHITESPACE.test(char)) {
            current++;
            continue;
        }
        let NUMBERS = /[0-9]/;
        if ((char && NUMBERS.test(char)) || char === '-' || char === '.') {
            let value = '';
            if (char === '-') {
                value += char;
                char = input[++current];
            }
            while (char &&
                (NUMBERS.test(char) ||
                    char === '.' ||
                    // exponent marker, e.g. `1e10` or `1.5E-9`
                    char === 'e' ||
                    char === 'E' ||
                    // exponent sign, only valid immediately after the exponent marker
                    ((char === '-' || char === '+') &&
                        (value[value.length - 1] === 'e' || value[value.length - 1] === 'E')))) {
                value += char;
                char = input[++current];
            }
            tokens.push({
                type: 'number',
                value,
            });
            continue;
        }
        let LETTERS = /[a-z]/i;
        if (char && LETTERS.test(char)) {
            let value = '';
            while (char && LETTERS.test(char)) {
                if (current === input.length) {
                    break;
                }
                value += char;
                char = input[++current];
            }
            if (value == 'true' || value == 'false' || value === 'null') {
                tokens.push({
                    type: 'name',
                    value,
                });
            }
            else {
                // unknown token, e.g. `nul` which isn't quite `null`
                current++;
                continue;
            }
            continue;
        }
        current++;
    }
    return tokens;
}, strip = (tokens) => {
    if (tokens.length === 0) {
        return tokens;
    }
    let lastToken = tokens[tokens.length - 1];
    switch (lastToken.type) {
        case 'separator':
            tokens = tokens.slice(0, tokens.length - 1);
            return strip(tokens);
            break;
        case 'number':
            let lastCharacterOfLastToken = lastToken.value[lastToken.value.length - 1];
            if (lastCharacterOfLastToken === '.' ||
                lastCharacterOfLastToken === '-' ||
                lastCharacterOfLastToken === '+' ||
                lastCharacterOfLastToken === 'e' ||
                lastCharacterOfLastToken === 'E') {
                tokens = tokens.slice(0, tokens.length - 1);
                return strip(tokens);
            }
        case 'string':
            let tokenBeforeTheLastToken = tokens[tokens.length - 2];
            if (tokenBeforeTheLastToken?.type === 'delimiter') {
                tokens = tokens.slice(0, tokens.length - 1);
                return strip(tokens);
            }
            else if (tokenBeforeTheLastToken?.type === 'brace' && tokenBeforeTheLastToken.value === '{') {
                tokens = tokens.slice(0, tokens.length - 1);
                return strip(tokens);
            }
            break;
        case 'delimiter':
            tokens = tokens.slice(0, tokens.length - 1);
            return strip(tokens);
            break;
    }
    return tokens;
}, unstrip = (tokens) => {
    let tail = [];
    tokens.map((token) => {
        if (token.type === 'brace') {
            if (token.value === '{') {
                tail.push('}');
            }
            else {
                tail.splice(tail.lastIndexOf('}'), 1);
            }
        }
        if (token.type === 'paren') {
            if (token.value === '[') {
                tail.push(']');
            }
            else {
                tail.splice(tail.lastIndexOf(']'), 1);
            }
        }
    });
    if (tail.length > 0) {
        tail.reverse().map((item) => {
            if (item === '}') {
                tokens.push({
                    type: 'brace',
                    value: '}',
                });
            }
            else if (item === ']') {
                tokens.push({
                    type: 'paren',
                    value: ']',
                });
            }
        });
    }
    return tokens;
}, generate = (tokens) => {
    let output = '';
    tokens.map((token) => {
        switch (token.type) {
            case 'string':
                output += '"' + token.value + '"';
                break;
            default:
                output += token.value;
                break;
        }
    });
    return output;
}, partialParse = (input) => JSON.parse(generate(unstrip(strip(tokenize(input)))));

//# sourceMappingURL=parser.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/message-stream-utils.mjs

const JSON_BUF_PROPERTY = '__json_buf';
/**
 * Copies a tool-use block with an updated `__json_buf`, installing `.input` as
 * a memoized getter so the partial-JSON parse happens on first read instead of
 * on every delta.
 */
function withLazyInput(prev, jsonBuf) {
    const next = {};
    for (const key of Object.keys(prev)) {
        if (key !== 'input')
            next[key] = prev[key];
    }
    Object.defineProperty(next, JSON_BUF_PROPERTY, { value: jsonBuf, enumerable: false, writable: true });
    let input;
    let parsed = false;
    Object.defineProperty(next, 'input', {
        enumerable: true,
        configurable: true,
        get() {
            if (!parsed) {
                input = jsonBuf ? partialParse(jsonBuf) : {};
                parsed = true;
            }
            return input;
        },
    });
    return next;
}
//# sourceMappingURL=message-stream-utils.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/BetaMessageStream.mjs
var _BetaMessageStream_instances, _BetaMessageStream_currentMessageSnapshot, _BetaMessageStream_params, _BetaMessageStream_connectedPromise, _BetaMessageStream_resolveConnectedPromise, _BetaMessageStream_rejectConnectedPromise, _BetaMessageStream_endPromise, _BetaMessageStream_resolveEndPromise, _BetaMessageStream_rejectEndPromise, _BetaMessageStream_listeners, _BetaMessageStream_ended, _BetaMessageStream_errored, _BetaMessageStream_aborted, _BetaMessageStream_catchingPromiseCreated, _BetaMessageStream_response, _BetaMessageStream_request_id, _BetaMessageStream_workspace_id, _BetaMessageStream_logger, _BetaMessageStream_getFinalMessage, _BetaMessageStream_getFinalText, _BetaMessageStream_handleError, _BetaMessageStream_beginRequest, _BetaMessageStream_addStreamEvent, _BetaMessageStream_endRequest, _BetaMessageStream_accumulateMessage, _BetaMessageStream_toolInputParseError;








function tracksToolInput(content) {
    return content.type === 'tool_use' || content.type === 'server_tool_use' || content.type === 'mcp_tool_use';
}
class BetaMessageStream {
    constructor(params, opts) {
        _BetaMessageStream_instances.add(this);
        this.messages = [];
        this.receivedMessages = [];
        _BetaMessageStream_currentMessageSnapshot.set(this, void 0);
        _BetaMessageStream_params.set(this, null);
        this.controller = new AbortController();
        _BetaMessageStream_connectedPromise.set(this, void 0);
        _BetaMessageStream_resolveConnectedPromise.set(this, () => { });
        _BetaMessageStream_rejectConnectedPromise.set(this, () => { });
        _BetaMessageStream_endPromise.set(this, void 0);
        _BetaMessageStream_resolveEndPromise.set(this, () => { });
        _BetaMessageStream_rejectEndPromise.set(this, () => { });
        _BetaMessageStream_listeners.set(this, {});
        _BetaMessageStream_ended.set(this, false);
        _BetaMessageStream_errored.set(this, false);
        _BetaMessageStream_aborted.set(this, false);
        _BetaMessageStream_catchingPromiseCreated.set(this, false);
        _BetaMessageStream_response.set(this, void 0);
        _BetaMessageStream_request_id.set(this, void 0);
        _BetaMessageStream_workspace_id.set(this, void 0);
        _BetaMessageStream_logger.set(this, void 0);
        _BetaMessageStream_handleError.set(this, (error) => {
            (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_errored, true, "f");
            if ((0,errors/* isAbortError */.z)(error)) {
                error = new core_error/* APIUserAbortError */.cH();
            }
            if (error instanceof core_error/* APIUserAbortError */.cH) {
                (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_aborted, true, "f");
                return this._emit('abort', error);
            }
            if (error instanceof core_error/* AnthropicError */.pJ) {
                return this._emit('error', error);
            }
            if (error instanceof Error) {
                const anthropicError = new core_error/* AnthropicError */.pJ(error.message);
                // @ts-ignore
                anthropicError.cause = error;
                return this._emit('error', anthropicError);
            }
            return this._emit('error', new core_error/* AnthropicError */.pJ(String(error)));
        });
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_connectedPromise, new Promise((resolve, reject) => {
            (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_resolveConnectedPromise, resolve, "f");
            (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_rejectConnectedPromise, reject, "f");
        }), "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_endPromise, new Promise((resolve, reject) => {
            (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_resolveEndPromise, resolve, "f");
            (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_rejectEndPromise, reject, "f");
        }), "f");
        // Don't let these promises cause unhandled rejection errors.
        // we will manually cause an unhandled rejection error later
        // if the user hasn't registered any error listener or called
        // any promise-returning method.
        (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_connectedPromise, "f").catch(() => { });
        (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_endPromise, "f").catch(() => { });
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_params, params, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_logger, opts?.logger ?? console, "f");
    }
    get response() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_response, "f");
    }
    get request_id() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_request_id, "f");
    }
    get workspace_id() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_workspace_id, "f");
    }
    /**
     * Returns the `MessageStream` data, the raw `Response` instance and the ID of the request,
     * returned vie the `request-id` header which is useful for debugging requests and resporting
     * issues to Anthropic.
     *
     * This is the same as the `APIPromise.withResponse()` method.
     *
     * This method will raise an error if you created the stream using `MessageStream.fromReadableStream`
     * as no `Response` is available.
     */
    async withResponse() {
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
        const response = await (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_connectedPromise, "f");
        if (!response) {
            throw new Error('Could not resolve a `Response` object');
        }
        return {
            data: this,
            response,
            request_id: response.headers.get('request-id'),
            workspace_id: response.headers.get('anthropic-workspace-id'),
        };
    }
    /**
     * Intended for use on the frontend, consuming a stream produced with
     * `.toReadableStream()` on the backend.
     *
     * Note that messages sent to the model do not appear in `.on('message')`
     * in this context.
     */
    static fromReadableStream(stream) {
        const runner = new BetaMessageStream(null);
        runner._run(() => runner._fromReadableStream(stream));
        return runner;
    }
    static createMessage(messages, params, options, { logger } = {}) {
        const runner = new BetaMessageStream(params, { logger });
        for (const message of params.messages) {
            runner._addMessageParam(message);
        }
        (0,tslib/* __classPrivateFieldSet */.G)(runner, _BetaMessageStream_params, { ...params, stream: true }, "f");
        runner._run(() => runner._createMessage(messages, { ...params, stream: true }, { ...options, headers: { ...options?.headers, [STAINLESS_HELPER_METHOD_HEADER]: 'stream' } }));
        return runner;
    }
    _run(executor) {
        executor().then(() => {
            this._emitFinal();
            this._emit('end');
        }, (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_handleError, "f"));
    }
    _addMessageParam(message) {
        this.messages.push(message);
    }
    _addMessage(message, emit = true) {
        this.receivedMessages.push(message);
        if (emit) {
            this._emit('message', message);
        }
    }
    async _createMessage(messages, params, options) {
        const signal = options?.signal;
        let abortHandler;
        if (signal) {
            if (signal.aborted)
                this.controller.abort();
            abortHandler = this.controller.abort.bind(this.controller);
            signal.addEventListener('abort', abortHandler);
        }
        try {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_instances, "m", _BetaMessageStream_beginRequest).call(this);
            const { response, data: stream } = await messages
                .create({ ...params, stream: true }, { ...options, signal: this.controller.signal })
                .withResponse();
            this._connected(response);
            for await (const event of stream) {
                (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_instances, "m", _BetaMessageStream_addStreamEvent).call(this, event);
            }
            if (stream.controller.signal?.aborted) {
                throw new core_error/* APIUserAbortError */.cH();
            }
            (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_instances, "m", _BetaMessageStream_endRequest).call(this);
        }
        finally {
            if (signal && abortHandler) {
                signal.removeEventListener('abort', abortHandler);
            }
        }
    }
    _connected(response) {
        if (this.ended)
            return;
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_response, response, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_request_id, response?.headers.get('request-id'), "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_workspace_id, response?.headers.get('anthropic-workspace-id'), "f");
        (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_resolveConnectedPromise, "f").call(this, response);
        this._emit('connect');
    }
    get ended() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_ended, "f");
    }
    get errored() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_errored, "f");
    }
    get aborted() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_aborted, "f");
    }
    abort() {
        this.controller.abort();
    }
    /**
     * Adds the listener function to the end of the listeners array for the event.
     * No checks are made to see if the listener has already been added. Multiple calls passing
     * the same combination of event and listener will result in the listener being added, and
     * called, multiple times.
     * @returns this MessageStream, so that calls can be chained
     */
    on(event, listener) {
        const listeners = (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_listeners, "f")[event] || ((0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_listeners, "f")[event] = []);
        listeners.push({ listener });
        return this;
    }
    /**
     * Removes the specified listener from the listener array for the event.
     * off() will remove, at most, one instance of a listener from the listener array. If any single
     * listener has been added multiple times to the listener array for the specified event, then
     * off() must be called multiple times to remove each instance.
     * @returns this MessageStream, so that calls can be chained
     */
    off(event, listener) {
        const listeners = (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_listeners, "f")[event];
        if (!listeners)
            return this;
        const index = listeners.findIndex((l) => l.listener === listener);
        if (index >= 0)
            listeners.splice(index, 1);
        return this;
    }
    /**
     * Adds a one-time listener function for the event. The next time the event is triggered,
     * this listener is removed and then invoked.
     * @returns this MessageStream, so that calls can be chained
     */
    once(event, listener) {
        const listeners = (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_listeners, "f")[event] || ((0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_listeners, "f")[event] = []);
        listeners.push({ listener, once: true });
        return this;
    }
    /**
     * This is similar to `.once()`, but returns a Promise that resolves the next time
     * the event is triggered, instead of calling a listener callback.
     * @returns a Promise that resolves the next time given event is triggered,
     * or rejects if an error is emitted.  (If you request the 'error' event,
     * returns a promise that resolves with the error).
     *
     * Example:
     *
     *   const message = await stream.emitted('message') // rejects if the stream errors
     */
    emitted(event) {
        return new Promise((resolve, reject) => {
            (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
            if (event !== 'error')
                this.once('error', reject);
            this.once(event, resolve);
        });
    }
    async done() {
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
        await (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_endPromise, "f");
    }
    get currentMessage() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_currentMessageSnapshot, "f");
    }
    /**
     * @returns a promise that resolves with the the final assistant Message response,
     * or rejects if an error occurred or the stream ended prematurely without producing a Message.
     * If structured outputs were used, this will be a ParsedMessage with a `parsed` field.
     */
    async finalMessage() {
        await this.done();
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalMessage).call(this);
    }
    /**
     * @returns a promise that resolves with the the final assistant Message's text response, concatenated
     * together if there are more than one text blocks.
     * Rejects if an error occurred or the stream ended prematurely without producing a Message.
     */
    async finalText() {
        await this.done();
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalText).call(this);
    }
    _emit(event, ...args) {
        // make sure we don't emit any MessageStreamEvents after end
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_ended, "f"))
            return;
        if (event === 'end') {
            (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_ended, true, "f");
            (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_resolveEndPromise, "f").call(this);
        }
        const listeners = (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_listeners, "f")[event];
        if (listeners) {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
            listeners.forEach(({ listener }) => listener(...args));
        }
        if (event === 'abort') {
            const error = args[0];
            if (!(0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
                Promise.reject(error);
            }
            (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_rejectConnectedPromise, "f").call(this, error);
            (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_rejectEndPromise, "f").call(this, error);
            this._emit('end');
            return;
        }
        if (event === 'error') {
            // NOTE: _emit('error', error) should only be called from #handleError().
            const error = args[0];
            if (!(0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
                // Trigger an unhandled rejection if the user hasn't registered any error handlers.
                // If you are seeing stack traces here, make sure to handle errors via either:
                // - runner.on('error', () => ...)
                // - await runner.done()
                // - await runner.final...()
                // - etc.
                Promise.reject(error);
            }
            (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_rejectConnectedPromise, "f").call(this, error);
            (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_rejectEndPromise, "f").call(this, error);
            this._emit('end');
        }
    }
    _emitFinal() {
        const finalMessage = this.receivedMessages.at(-1);
        if (finalMessage) {
            this._emit('finalMessage', (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalMessage).call(this));
        }
    }
    async _fromReadableStream(readableStream, options) {
        const signal = options?.signal;
        let abortHandler;
        if (signal) {
            if (signal.aborted)
                this.controller.abort();
            abortHandler = this.controller.abort.bind(this.controller);
            signal.addEventListener('abort', abortHandler);
        }
        try {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_instances, "m", _BetaMessageStream_beginRequest).call(this);
            this._connected(null);
            const stream = streaming_Stream.fromReadableStream(readableStream, this.controller);
            for await (const event of stream) {
                (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_instances, "m", _BetaMessageStream_addStreamEvent).call(this, event);
            }
            if (stream.controller.signal?.aborted) {
                throw new core_error/* APIUserAbortError */.cH();
            }
            (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_instances, "m", _BetaMessageStream_endRequest).call(this);
        }
        finally {
            if (signal && abortHandler) {
                signal.removeEventListener('abort', abortHandler);
            }
        }
    }
    [(_BetaMessageStream_currentMessageSnapshot = new WeakMap(), _BetaMessageStream_params = new WeakMap(), _BetaMessageStream_connectedPromise = new WeakMap(), _BetaMessageStream_resolveConnectedPromise = new WeakMap(), _BetaMessageStream_rejectConnectedPromise = new WeakMap(), _BetaMessageStream_endPromise = new WeakMap(), _BetaMessageStream_resolveEndPromise = new WeakMap(), _BetaMessageStream_rejectEndPromise = new WeakMap(), _BetaMessageStream_listeners = new WeakMap(), _BetaMessageStream_ended = new WeakMap(), _BetaMessageStream_errored = new WeakMap(), _BetaMessageStream_aborted = new WeakMap(), _BetaMessageStream_catchingPromiseCreated = new WeakMap(), _BetaMessageStream_response = new WeakMap(), _BetaMessageStream_request_id = new WeakMap(), _BetaMessageStream_workspace_id = new WeakMap(), _BetaMessageStream_logger = new WeakMap(), _BetaMessageStream_handleError = new WeakMap(), _BetaMessageStream_instances = new WeakSet(), _BetaMessageStream_getFinalMessage = function _BetaMessageStream_getFinalMessage() {
        if (this.receivedMessages.length === 0) {
            throw new core_error/* AnthropicError */.pJ('stream ended without producing a Message with role=assistant');
        }
        return this.receivedMessages.at(-1);
    }, _BetaMessageStream_getFinalText = function _BetaMessageStream_getFinalText() {
        if (this.receivedMessages.length === 0) {
            throw new core_error/* AnthropicError */.pJ('stream ended without producing a Message with role=assistant');
        }
        const textBlocks = this.receivedMessages
            .at(-1)
            .content.filter((block) => block.type === 'text')
            .map((block) => block.text);
        if (textBlocks.length === 0) {
            throw new core_error/* AnthropicError */.pJ('stream ended without producing a content block with type=text');
        }
        return textBlocks.join(' ');
    }, _BetaMessageStream_beginRequest = function _BetaMessageStream_beginRequest() {
        if (this.ended)
            return;
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_currentMessageSnapshot, undefined, "f");
    }, _BetaMessageStream_addStreamEvent = function _BetaMessageStream_addStreamEvent(event) {
        if (this.ended)
            return;
        const messageSnapshot = (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_instances, "m", _BetaMessageStream_accumulateMessage).call(this, event);
        this._emit('streamEvent', event, messageSnapshot);
        switch (event.type) {
            case 'content_block_delta': {
                const content = messageSnapshot.content.at(-1);
                switch (event.delta.type) {
                    case 'text_delta': {
                        if (content.type === 'text') {
                            this._emit('text', event.delta.text, content.text || '');
                        }
                        break;
                    }
                    case 'citations_delta': {
                        if (content.type === 'text') {
                            this._emit('citation', event.delta.citation, content.citations ?? []);
                        }
                        break;
                    }
                    case 'input_json_delta': {
                        if (tracksToolInput(content) && (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_listeners, "f").inputJson?.length) {
                            let jsonSnapshot;
                            try {
                                jsonSnapshot = content.input;
                            }
                            catch (err) {
                                (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_handleError, "f").call(this, (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_instances, "m", _BetaMessageStream_toolInputParseError).call(this, content, err));
                                break;
                            }
                            this._emit('inputJson', event.delta.partial_json, jsonSnapshot);
                        }
                        break;
                    }
                    case 'thinking_delta': {
                        if (content.type === 'thinking') {
                            this._emit('thinking', event.delta.thinking, content.thinking);
                        }
                        break;
                    }
                    case 'signature_delta': {
                        if (content.type === 'thinking') {
                            this._emit('signature', content.signature);
                        }
                        break;
                    }
                    case 'compaction_delta': {
                        if (content.type === 'compaction' && content.content) {
                            this._emit('compaction', content.content);
                        }
                        break;
                    }
                    default:
                        (0,utils_values/* checkNever */.f2)(event.delta);
                }
                break;
            }
            case 'message_stop': {
                this._addMessageParam(messageSnapshot);
                this._addMessage(maybeParseBetaMessage(messageSnapshot, (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_params, "f"), { logger: (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_logger, "f") }), true);
                break;
            }
            case 'content_block_stop': {
                this._emit('contentBlock', messageSnapshot.content.at(-1));
                break;
            }
            case 'message_start': {
                (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_currentMessageSnapshot, messageSnapshot, "f");
                break;
            }
            case 'content_block_start':
            case 'message_delta':
                break;
        }
    }, _BetaMessageStream_endRequest = function _BetaMessageStream_endRequest() {
        if (this.ended) {
            throw new core_error/* AnthropicError */.pJ(`stream has ended, this shouldn't happen`);
        }
        const snapshot = (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_currentMessageSnapshot, "f");
        if (!snapshot) {
            throw new core_error/* AnthropicError */.pJ(`request ended without sending any chunks`);
        }
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaMessageStream_currentMessageSnapshot, undefined, "f");
        return maybeParseBetaMessage(snapshot, (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_params, "f"), { logger: (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_logger, "f") });
    }, _BetaMessageStream_accumulateMessage = function _BetaMessageStream_accumulateMessage(event) {
        let snapshot = (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_currentMessageSnapshot, "f");
        if (event.type === 'message_start') {
            if (snapshot) {
                throw new core_error/* AnthropicError */.pJ(`Unexpected event order, got ${event.type} before receiving "message_stop"`);
            }
            return event.message;
        }
        if (!snapshot) {
            throw new core_error/* AnthropicError */.pJ(`Unexpected event order, got ${event.type} before "message_start"`);
        }
        switch (event.type) {
            case 'message_stop':
                return snapshot;
            case 'message_delta':
                snapshot.stop_reason = event.delta.stop_reason;
                snapshot.stop_sequence = event.delta.stop_sequence;
                snapshot.stop_details = event.delta.stop_details;
                snapshot.usage.output_tokens = event.usage.output_tokens;
                if (event.delta.container != null) {
                    snapshot.container = event.delta.container;
                }
                if (event.context_management != null) {
                    snapshot.context_management = event.context_management;
                }
                if (event.input_transformations != null) {
                    snapshot.input_transformations = event.input_transformations;
                }
                // The remaining usage counters are cumulative whole-message totals that are
                // omitted when they don't apply, so overwrite when present and never add.
                if (event.usage.input_tokens != null) {
                    snapshot.usage.input_tokens = event.usage.input_tokens;
                }
                if (event.usage.cache_creation_input_tokens != null) {
                    snapshot.usage.cache_creation_input_tokens = event.usage.cache_creation_input_tokens;
                }
                if (event.usage.cache_read_input_tokens != null) {
                    snapshot.usage.cache_read_input_tokens = event.usage.cache_read_input_tokens;
                }
                if (event.usage.server_tool_use != null) {
                    snapshot.usage.server_tool_use = event.usage.server_tool_use;
                }
                if (event.usage.iterations != null) {
                    snapshot.usage.iterations = event.usage.iterations;
                }
                if (event.usage.fallback_credit != null) {
                    snapshot.usage.fallback_credit = event.usage.fallback_credit;
                }
                if (event.usage.output_tokens_details != null) {
                    snapshot.usage.output_tokens_details = event.usage.output_tokens_details;
                }
                return snapshot;
            case 'content_block_start':
                snapshot.content.push(event.content_block);
                if (event.content_block.type === 'fallback') {
                    // the final hop's fallback block names the model that served the response —
                    // keeps the snapshot consistent with the relabeled non-streaming message
                    snapshot.model = event.content_block.to.model;
                }
                return snapshot;
            case 'content_block_delta': {
                const snapshotContent = snapshot.content.at(event.index);
                switch (event.delta.type) {
                    case 'text_delta': {
                        if (snapshotContent?.type === 'text') {
                            snapshot.content[event.index] = {
                                ...snapshotContent,
                                text: (snapshotContent.text || '') + event.delta.text,
                            };
                        }
                        break;
                    }
                    case 'citations_delta': {
                        if (snapshotContent?.type === 'text') {
                            snapshot.content[event.index] = {
                                ...snapshotContent,
                                citations: [...(snapshotContent.citations ?? []), event.delta.citation],
                            };
                        }
                        break;
                    }
                    case 'input_json_delta': {
                        if (snapshotContent && tracksToolInput(snapshotContent)) {
                            const jsonBuf = (snapshotContent[JSON_BUF_PROPERTY] || '') + event.delta.partial_json;
                            snapshot.content[event.index] = withLazyInput(snapshotContent, jsonBuf);
                        }
                        break;
                    }
                    case 'thinking_delta': {
                        if (snapshotContent?.type === 'thinking') {
                            snapshot.content[event.index] = {
                                ...snapshotContent,
                                thinking: snapshotContent.thinking + event.delta.thinking,
                            };
                        }
                        break;
                    }
                    case 'signature_delta': {
                        if (snapshotContent?.type === 'thinking') {
                            snapshot.content[event.index] = {
                                ...snapshotContent,
                                signature: event.delta.signature,
                            };
                        }
                        break;
                    }
                    case 'compaction_delta': {
                        if (snapshotContent?.type === 'compaction') {
                            snapshot.content[event.index] = {
                                ...snapshotContent,
                                content: (snapshotContent.content || '') + event.delta.content,
                                encrypted_content: event.delta.encrypted_content,
                            };
                        }
                        break;
                    }
                    default:
                        (0,utils_values/* checkNever */.f2)(event.delta);
                }
                return snapshot;
            }
            case 'content_block_stop': {
                const snapshotContent = snapshot.content.at(event.index);
                if (snapshotContent && tracksToolInput(snapshotContent) && JSON_BUF_PROPERTY in snapshotContent) {
                    let input;
                    try {
                        input = snapshotContent.input;
                    }
                    catch (err) {
                        input = {};
                        (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_handleError, "f").call(this, (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaMessageStream_instances, "m", _BetaMessageStream_toolInputParseError).call(this, snapshotContent, err));
                    }
                    Object.defineProperty(snapshotContent, 'input', {
                        value: input,
                        enumerable: true,
                        configurable: true,
                        writable: true,
                    });
                }
                return snapshot;
            }
        }
    }, _BetaMessageStream_toolInputParseError = function _BetaMessageStream_toolInputParseError(block, err) {
        const jsonBuf = block[JSON_BUF_PROPERTY];
        return new core_error/* AnthropicError */.pJ(`Unable to parse tool parameter JSON from model. Please retry your request or adjust your prompt. Error: ${err}. JSON: ${jsonBuf}`);
    }, Symbol.asyncIterator)]() {
        const pushQueue = [];
        const readQueue = [];
        let done = false;
        this.on('streamEvent', (event) => {
            const reader = readQueue.shift();
            if (reader) {
                reader.resolve(event);
            }
            else {
                pushQueue.push(event);
            }
        });
        this.on('end', () => {
            done = true;
            for (const reader of readQueue) {
                reader.resolve(undefined);
            }
            readQueue.length = 0;
        });
        this.on('abort', (err) => {
            done = true;
            for (const reader of readQueue) {
                reader.reject(err);
            }
            readQueue.length = 0;
        });
        this.on('error', (err) => {
            done = true;
            for (const reader of readQueue) {
                reader.reject(err);
            }
            readQueue.length = 0;
        });
        return {
            next: async () => {
                if (!pushQueue.length) {
                    if (done) {
                        return { value: undefined, done: true };
                    }
                    return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk) => (chunk ? { value: chunk, done: false } : { value: undefined, done: true }));
                }
                const chunk = pushQueue.shift();
                return { value: chunk, done: false };
            },
            return: async () => {
                this.abort();
                return { value: undefined, done: true };
            },
        };
    }
    toReadableStream() {
        const stream = new streaming_Stream(this[Symbol.asyncIterator].bind(this), this.controller);
        return stream.toReadableStream();
    }
}
//# sourceMappingURL=BetaMessageStream.mjs.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/promise.mjs
var promise = __webpack_require__(45946);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/tools/CompactionControl.mjs
const DEFAULT_TOKEN_THRESHOLD = 100000;
const DEFAULT_SUMMARY_PROMPT = `You have been working on the task described above but have not yet completed it. Write a continuation summary that will allow you (or another instance of yourself) to resume work efficiently in a future context window where the conversation history will be replaced with this summary. Your summary should be structured, concise, and actionable. Include:
1. Task Overview
The user's core request and success criteria
Any clarifications or constraints they specified
2. Current State
What has been completed so far
Files created, modified, or analyzed (with paths if relevant)
Key outputs or artifacts produced
3. Important Discoveries
Technical constraints or requirements uncovered
Decisions made and their rationale
Errors encountered and how they were resolved
What approaches were tried that didn't work (and why)
4. Next Steps
Specific actions needed to complete the task
Any blockers or open questions to resolve
Priority order if multiple steps remain
5. Context to Preserve
User preferences or style requirements
Domain-specific details that aren't obvious
Any promises made to the user
Be concise but complete—err on the side of including information that would prevent duplicate work or repeated mistakes. Write in a way that enables immediate resumption of the task.
Wrap your summary in <summary></summary> tags.`;
//# sourceMappingURL=CompactionControl.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/tools/BetaToolRunner.mjs
var _BetaToolRunner_instances, _BetaToolRunner_consumed, _BetaToolRunner_mutated, _BetaToolRunner_state, _BetaToolRunner_options, _BetaToolRunner_message, _BetaToolRunner_toolResponse, _BetaToolRunner_completion, _BetaToolRunner_iterationCount, _BetaToolRunner_checkAndCompact, _BetaToolRunner_generateToolResponse;








/**
 * A ToolRunner handles the automatic conversation loop between the assistant and tools.
 *
 * A ToolRunner is an async iterable that yields either BetaMessage or BetaMessageStream objects
 * depending on the streaming configuration.
 */
class BetaToolRunner {
    constructor(client, params, options) {
        _BetaToolRunner_instances.add(this);
        this.client = client;
        /** Whether the async iterator has been consumed */
        _BetaToolRunner_consumed.set(this, false);
        /** Whether parameters have been mutated since the last API call */
        _BetaToolRunner_mutated.set(this, false);
        /** Current state containing the request parameters */
        _BetaToolRunner_state.set(this, void 0);
        _BetaToolRunner_options.set(this, void 0);
        /** Promise for the last message received from the assistant */
        _BetaToolRunner_message.set(this, void 0);
        /** Cached tool response to avoid redundant executions */
        _BetaToolRunner_toolResponse.set(this, void 0);
        /** Promise resolvers for waiting on completion */
        _BetaToolRunner_completion.set(this, void 0);
        /** Number of iterations (API requests) made so far */
        _BetaToolRunner_iterationCount.set(this, 0);
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_state, {
            params: {
                // You can't clone the entire params since there are functions as handlers.
                // You also don't really need to clone params.messages, but it probably will prevent a foot gun
                // somewhere.
                ...params,
                messages: structuredClone(params.messages),
            },
        }, "f");
        // structuredClone drops symbol-keyed properties, so collect helper marks
        // from the original params here — the create()-side collector won't see
        // them on the cloned messages.
        const collected = collectStainlessHelpers(params.tools, params.messages);
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_options, {
            ...options,
            headers: buildHeaders([
                helperHeader('BetaToolRunner'),
                collected.length ? { [stainless_helper_header_STAINLESS_HELPER_HEADER]: collected.join(', ') } : undefined,
                options?.headers,
            ]),
        }, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_completion, (0,promise/* promiseWithResolvers */.n)(), "f");
        if (params.compactionControl?.enabled) {
            console.warn('Anthropic: The `compactionControl` parameter is deprecated and will be removed in a future version. ' +
                'Use server-side compaction instead by passing `edits: [{ type: "compact_20260112" }]` in the params passed to `toolRunner()`. ' +
                'See https://platform.claude.com/docs/en/build-with-claude/compaction');
        }
    }
    async *[(_BetaToolRunner_consumed = new WeakMap(), _BetaToolRunner_mutated = new WeakMap(), _BetaToolRunner_state = new WeakMap(), _BetaToolRunner_options = new WeakMap(), _BetaToolRunner_message = new WeakMap(), _BetaToolRunner_toolResponse = new WeakMap(), _BetaToolRunner_completion = new WeakMap(), _BetaToolRunner_iterationCount = new WeakMap(), _BetaToolRunner_instances = new WeakSet(), _BetaToolRunner_checkAndCompact = async function _BetaToolRunner_checkAndCompact() {
        const compactionControl = (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params.compactionControl;
        if (!compactionControl || !compactionControl.enabled) {
            return false;
        }
        let tokensUsed = 0;
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_message, "f") !== undefined) {
            try {
                const message = await (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_message, "f");
                const totalInputTokens = message.usage.input_tokens +
                    (message.usage.cache_creation_input_tokens ?? 0) +
                    (message.usage.cache_read_input_tokens ?? 0);
                tokensUsed = totalInputTokens + message.usage.output_tokens;
            }
            catch {
                // If we can't get the message, skip compaction
                return false;
            }
        }
        const threshold = compactionControl.contextTokenThreshold ?? DEFAULT_TOKEN_THRESHOLD;
        if (tokensUsed < threshold) {
            return false;
        }
        const model = compactionControl.model ?? (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params.model;
        const summaryPrompt = compactionControl.summaryPrompt ?? DEFAULT_SUMMARY_PROMPT;
        const messages = (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params.messages;
        if (messages[messages.length - 1].role === 'assistant') {
            // Remove tool_use blocks from the last message to avoid 400 error
            // (tool_use requires tool_result, which we don't have yet)
            const lastMessage = messages[messages.length - 1];
            if (Array.isArray(lastMessage.content)) {
                const nonToolBlocks = lastMessage.content.filter((block) => block.type !== 'tool_use');
                if (nonToolBlocks.length === 0) {
                    // If all blocks were tool_use, just remove the message entirely
                    messages.pop();
                }
                else {
                    lastMessage.content = nonToolBlocks;
                }
            }
        }
        const response = await this.client.beta.messages.create({
            model,
            messages: [
                ...messages,
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: summaryPrompt,
                        },
                    ],
                },
            ],
            max_tokens: (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params.max_tokens,
        }, {
            signal: (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_options, "f").signal,
            headers: buildHeaders([(0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_options, "f").headers, helperHeader('compaction')]),
        });
        if (response.content[0]?.type !== 'text') {
            throw new core_error/* AnthropicError */.pJ('Expected text response for compaction');
        }
        (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params.messages = [
            {
                role: 'user',
                content: response.content,
            },
        ];
        return true;
    }, Symbol.asyncIterator)]() {
        var _a;
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_consumed, "f")) {
            throw new core_error/* AnthropicError */.pJ('Cannot iterate over a consumed stream');
        }
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_consumed, true, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_mutated, true, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_toolResponse, undefined, "f");
        try {
            while (true) {
                let stream;
                try {
                    if ((0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params.max_iterations &&
                        (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_iterationCount, "f") >= (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params.max_iterations) {
                        break;
                    }
                    (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_mutated, false, "f");
                    (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_toolResponse, undefined, "f");
                    (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_iterationCount, (_a = (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_iterationCount, "f"), _a++, _a), "f");
                    (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_message, undefined, "f");
                    const { max_iterations, compactionControl, ...params } = (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params;
                    if (params.stream) {
                        stream = this.client.beta.messages.stream({ ...params }, (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_options, "f"));
                        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_message, stream.finalMessage(), "f");
                        // Make sure that this promise doesn't throw before we get the option to do something about it.
                        // Error will be caught when we call await this.#message ultimately
                        (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_message, "f").catch(() => { });
                        yield stream;
                    }
                    else {
                        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_message, this.client.beta.messages.create({ ...params, stream: false }, (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_options, "f")), "f");
                        yield (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_message, "f");
                    }
                    const isCompacted = await (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_instances, "m", _BetaToolRunner_checkAndCompact).call(this);
                    if (!isCompacted) {
                        if (!(0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_mutated, "f")) {
                            const message = await (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_message, "f");
                            const nextStep = determineNextStepFromStopReason(message.stop_reason);
                            (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params.messages.push({ role: message.role, content: message.content });
                            // Container-bound server tools reject a follow-up request that omits the container the
                            // previous turn ran in, so carry its id forward unless the caller pinned one themselves.
                            const { container } = (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params;
                            if (message.container) {
                                if (container == null) {
                                    (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params.container = message.container.id;
                                }
                                else if (typeof container === 'object' && container.id == null) {
                                    (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params.container = { ...container, id: message.container.id };
                                }
                            }
                            if (nextStep === 'stop') {
                                break;
                            }
                            if (nextStep === 'resume') {
                                continue;
                            }
                        }
                        const toolMessage = await (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_instances, "m", _BetaToolRunner_generateToolResponse).call(this, (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params.messages.at(-1));
                        if (toolMessage) {
                            (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params.messages.push(toolMessage);
                        }
                        else if (!(0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_mutated, "f")) {
                            break;
                        }
                    }
                }
                finally {
                    if (stream) {
                        stream.abort();
                    }
                }
            }
            if (!(0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_message, "f")) {
                throw new core_error/* AnthropicError */.pJ('ToolRunner concluded without a message from the server');
            }
            (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_completion, "f").resolve(await (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_message, "f"));
        }
        catch (error) {
            (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_consumed, false, "f");
            // Silence unhandled promise errors
            (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_completion, "f").promise.catch(() => { });
            (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_completion, "f").reject(error);
            (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_completion, (0,promise/* promiseWithResolvers */.n)(), "f");
            throw error;
        }
    }
    setMessagesParams(paramsOrMutator) {
        if (typeof paramsOrMutator === 'function') {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params = paramsOrMutator((0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params);
        }
        else {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params = paramsOrMutator;
        }
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_mutated, true, "f");
        // Invalidate cached tool response since parameters changed
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_toolResponse, undefined, "f");
    }
    setRequestOptions(optionsOrMutator) {
        if (typeof optionsOrMutator === 'function') {
            (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_options, optionsOrMutator((0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_options, "f")), "f");
        }
        else {
            (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_options, { ...(0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_options, "f"), ...optionsOrMutator }, "f");
        }
    }
    /**
     * Get the tool response for the last message from the assistant.
     * Avoids redundant tool executions by caching results.
     *
     * @returns A promise that resolves to a BetaMessageParam containing tool results, or null if no tools need to be executed
     *
     * @example
     * const toolResponse = await runner.generateToolResponse();
     * if (toolResponse) {
     *   console.log('Tool results:', toolResponse.content);
     * }
     */
    async generateToolResponse(signal = (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_options, "f").signal) {
        const message = (await (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_message, "f")) ?? this.params.messages.at(-1);
        if (!message) {
            return null;
        }
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_instances, "m", _BetaToolRunner_generateToolResponse).call(this, message, signal);
    }
    /**
     * Wait for the async iterator to complete. This works even if the async iterator hasn't yet started, and
     * will wait for an instance to start and go to completion.
     *
     * @returns A promise that resolves to the final BetaMessage when the iterator completes
     *
     * @example
     * // Start consuming the iterator
     * for await (const message of runner) {
     *   console.log('Message:', message.content);
     * }
     *
     * // Meanwhile, wait for completion from another part of the code
     * const finalMessage = await runner.done();
     * console.log('Final response:', finalMessage.content);
     */
    done() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_completion, "f").promise;
    }
    /**
     * Returns a promise indicating that the stream is done. Unlike .done(), this will eagerly read the stream:
     * * If the iterator has not been consumed, consume the entire iterator and return the final message from the
     * assistant.
     * * If the iterator has been consumed, waits for it to complete and returns the final message.
     *
     * @returns A promise that resolves to the final BetaMessage from the conversation
     * @throws {AnthropicError} If no messages were processed during the conversation
     *
     * @example
     * const finalMessage = await runner.runUntilDone();
     * console.log('Final response:', finalMessage.content);
     */
    async runUntilDone() {
        // If not yet consumed, start consuming and wait for completion
        if (!(0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_consumed, "f")) {
            for await (const _ of this) {
                // Iterator naturally populates this.#message
            }
        }
        // If consumed but not completed, wait for completion
        return this.done();
    }
    /**
     * Get the current parameters being used by the ToolRunner.
     *
     * @returns A readonly view of the current ToolRunnerParams
     *
     * @example
     * const currentParams = runner.params;
     * console.log('Current model:', currentParams.model);
     * console.log('Message count:', currentParams.messages.length);
     */
    get params() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params;
    }
    /**
     * Add one or more messages to the conversation history.
     *
     * @param messages - One or more BetaMessageParam objects to add to the conversation
     *
     * @example
     * runner.pushMessages(
     *   { role: 'user', content: 'Also, what about the weather in NYC?' }
     * );
     *
     * @example
     * // Adding multiple messages
     * runner.pushMessages(
     *   { role: 'user', content: 'What about NYC?' },
     *   { role: 'user', content: 'And Boston?' }
     * );
     */
    pushMessages(...messages) {
        this.setMessagesParams((params) => ({
            ...params,
            messages: [...params.messages, ...messages],
        }));
    }
    /**
     * Makes the ToolRunner directly awaitable, equivalent to calling .runUntilDone()
     * This allows using `await runner` instead of `await runner.runUntilDone()`
     */
    then(onfulfilled, onrejected) {
        return this.runUntilDone().then(onfulfilled, onrejected);
    }
}
_BetaToolRunner_generateToolResponse = async function _BetaToolRunner_generateToolResponse(lastMessage, signal = (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_options, "f").signal) {
    if ((0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_toolResponse, "f") !== undefined) {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_toolResponse, "f");
    }
    (0,tslib/* __classPrivateFieldSet */.G)(this, _BetaToolRunner_toolResponse, generateToolResponse((0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_state, "f").params, lastMessage, {
        ...(0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_options, "f"),
        signal,
    }), "f");
    return (0,tslib/* __classPrivateFieldGet */.g)(this, _BetaToolRunner_toolResponse, "f");
};
async function generateToolResponse(params, lastMessage = params.messages.at(-1), requestOptions) {
    // Only process if the last message is from the assistant and has tool use blocks
    if (!lastMessage ||
        lastMessage.role !== 'assistant' ||
        !lastMessage.content ||
        typeof lastMessage.content === 'string') {
        return null;
    }
    const toolUseBlocks = lastMessage.content.filter((content) => content.type === 'tool_use');
    if (toolUseBlocks.length === 0) {
        return null;
    }
    const available = availableToolNames(params);
    const toolResults = await Promise.all(toolUseBlocks.map(async (toolUse) => {
        const tool = params.tools.find((t) => ('name' in t ? t.name
            : 'mcp_server_name' in t ? t.mcp_server_name
                : t.type) === toolUse.name);
        // A `tool_removal` is only a hint to the model, which may still emit a tool_use for a
        // withdrawn tool — treat those exactly like a tool that was never defined.
        if (!tool || !('run' in tool) || !available.has(toolUse.name)) {
            return toolNotFoundResult(toolUse);
        }
        try {
            let input = toolUse.input;
            if ('parse' in tool && tool.parse) {
                input = tool.parse(input);
            }
            const result = await tool.run(input, {
                toolUse: toolUse,
                toolUseBlock: toolUse,
                signal: requestOptions?.signal,
            });
            return {
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: result,
            };
        }
        catch (error) {
            return {
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: error instanceof ToolError/* ToolError */.v ?
                    error.content
                    : `Error: ${error instanceof Error ? error.message : String(error)}`,
                is_error: true,
            };
        }
    }));
    return {
        role: 'user',
        content: toolResults,
    };
}
function toolNotFoundResult(toolUse) {
    return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: `Error: Tool '${toolUse.name}' not found`,
        is_error: true,
    };
}
/**
 * Computes the names of locally runnable tools that are still available for the assistant
 * turn being answered, by folding `tool_removal` / `tool_addition` blocks from the
 * `role: "system"` messages over the runnable tools. The assistant turn being answered is
 * terminal-or-absent and only `system` messages are inspected, so folding the whole current
 * history is exactly folding the messages preceding that turn — call this before appending
 * anything after it. MCP references are ignored — those tools are executed server-side and
 * never dispatched by this runner.
 */
function availableToolNames(params) {
    const available = new Set();
    for (const tool of params.tools) {
        if ('run' in tool) {
            available.add(tool.name);
        }
    }
    for (const message of params.messages) {
        if (message.role !== 'system' || typeof message.content === 'string') {
            continue;
        }
        for (const block of message.content) {
            applyToolChange(block, available);
        }
    }
    return available;
}
function applyToolChange(block, available) {
    switch (block.type) {
        case 'tool_removal':
        case 'tool_addition':
            applyToolReference(block, available);
            break;
    }
}
function applyToolReference(block, available) {
    const name = referencedToolName(block.tool);
    if (name === undefined)
        return;
    if (block.type === 'tool_removal') {
        available.delete(name);
    }
    else {
        available.add(name);
    }
}
function referencedToolName(ref) {
    switch (ref.type) {
        case 'tool_reference':
            return ref.name;
        default:
            // mcp_tool_reference / mcp_toolset_reference run server-side; unknown reference
            // types are ignored rather than rejected.
            return undefined;
    }
}
/**
 * Sorts every stop reason into one of three buckets: `run_tools` turns run their client tool
 * calls and continue the loop; `resume` turns are sent back unchanged so the server continues
 * them; `stop` turns end the loop without running any tool calls.
 */
function determineNextStepFromStopReason(stopReason) {
    if (stopReason === null)
        return 'stop';
    switch (stopReason) {
        case 'tool_use':
            return 'run_tools';
        case 'pause_turn':
        // pause_after_compaction hands the turn back before the model answers; sending it back
        // unchanged continues it.
        case 'compaction':
            return 'resume';
        case 'end_turn':
        case 'stop_sequence':
        case 'max_tokens':
        case 'model_context_window_exceeded':
        case 'refusal':
            return 'stop';
        default:
            // The union is forward-compatible, so a stop reason this SDK doesn't know yet ends the
            // loop rather than throwing; the `never` check makes tsc reject an unclassified member.
            (0,utils_values/* checkNever */.f2)(stopReason);
            return 'stop';
    }
}
//# sourceMappingURL=BetaToolRunner.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/messages/messages.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.











const DEPRECATED_MODELS = {};
const MODELS_TO_WARN_WITH_THINKING_ENABLED = ['claude-mythos-preview', 'claude-opus-4-6'];
class Messages extends APIResource {
    constructor() {
        super(...arguments);
        this.batches = new Batches(this._client);
    }
    create(params, options) {
        // Transform deprecated output_format to output_config.format
        const modifiedParams = transformOutputFormat(params);
        const { betas, user_profile_id, workspace_id, ...body } = modifiedParams;
        if (body.model in DEPRECATED_MODELS) {
            console.warn(`The model '${body.model}' is deprecated and will reach end-of-life on ${DEPRECATED_MODELS[body.model]}\nPlease migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
        }
        if (MODELS_TO_WARN_WITH_THINKING_ENABLED.includes(body.model) &&
            body.thinking &&
            body.thinking.type === 'enabled') {
            console.warn(`Using Claude with ${body.model} and 'thinking.type=enabled' is deprecated. Use 'thinking.type=adaptive' instead which results in better model performance in our testing: https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking`);
        }
        let timeout = options?.timeout ?? this._client._options.timeout;
        if (!body.stream && timeout == null) {
            const maxNonstreamingTokens = MODEL_NONSTREAMING_TOKENS[body.model] ?? undefined;
            timeout = this._client.calculateNonstreamingTimeout(body.max_tokens, maxNonstreamingTokens);
        }
        // Collect helper info from tools and messages
        const helperHeader = stainlessHelperHeader(body.tools, body.messages);
        return this._client.post('/v1/messages?beta=true', {
            body,
            timeout: timeout ?? 600000,
            ...options,
            headers: buildHeaders([
                {
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(user_profile_id != null ? { 'anthropic-user-profile-id': user_profile_id } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                helperHeader,
                options?.headers,
            ]),
            stream: modifiedParams.stream ?? false,
        });
    }
    /**
     * Send a structured list of input messages with text and/or image content, along with an expected `output_format` and
     * the response will be automatically parsed and available in the `parsed_output` property of the message.
     *
     * @example
     * ```ts
     * const message = await client.beta.messages.parse({
     *   model: 'claude-3-5-sonnet-20241022',
     *   max_tokens: 1024,
     *   messages: [{ role: 'user', content: 'What is 2+2?' }],
     *   output_format: zodOutputFormat(z.object({ answer: z.number() }), 'math'),
     * });
     *
     * console.log(message.parsed_output?.answer); // 4
     * ```
     */
    parse(params, options) {
        options = {
            ...options,
            headers: buildHeaders([
                { 'anthropic-beta': [...(params.betas ?? []), 'structured-outputs-2025-12-15'].toString() },
                options?.headers,
            ]),
        };
        return this.create(params, options).then((message) => parseBetaMessage(message, params, { logger: this._client.logger ?? console }));
    }
    /**
     * Create a Message stream
     */
    stream(body, options) {
        return BetaMessageStream.createMessage(this, body, options);
    }
    /**
     * Count the number of tokens in a Message.
     *
     * The Token Count API can be used to count the number of tokens in a Message,
     * including tools, images, and documents, without creating it.
     *
     * Learn more about token counting in our
     * [user guide](https://platform.claude.com/docs/en/build-with-claude/token-counting)
     *
     * @example
     * ```ts
     * const betaMessageTokensCount =
     *   await client.beta.messages.countTokens({
     *     messages: [{ content: 'Hello, world', role: 'user' }],
     *     model: 'claude-opus-5',
     *   });
     * ```
     */
    countTokens(params, options) {
        // Transform deprecated output_format to output_config.format
        const modifiedParams = transformOutputFormat(params);
        const { betas, user_profile_id, workspace_id, ...body } = modifiedParams;
        return this._client.post('/v1/messages/count_tokens?beta=true', {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'token-counting-2024-11-01'].toString(),
                    ...(user_profile_id != null ? { 'anthropic-user-profile-id': user_profile_id } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    toolRunner(body, options) {
        return new BetaToolRunner(this._client, body, options);
    }
}
/**
 * Transform deprecated output_format to output_config.format
 * Returns a modified copy of the params without mutating the original
 */
function transformOutputFormat(params) {
    if (!params.output_format) {
        return params;
    }
    if (params.output_config?.format) {
        throw new core_error/* AnthropicError */.pJ('Both output_format and output_config.format were provided. ' +
            'Please use only output_config.format (output_format is deprecated).');
    }
    const { output_format, ...rest } = params;
    return {
        ...rest,
        output_config: {
            ...params.output_config,
            format: output_format,
        },
    };
}


Messages.Batches = Batches;
Messages.BetaToolRunner = BetaToolRunner;
Messages.ToolError = ToolError/* ToolError */.v;
//# sourceMappingURL=messages.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/organization/api-keys.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.



class APIKeys extends APIResource {
    /**
     * Get API Key
     *
     * @example
     * ```ts
     * const betaAPIKey =
     *   await client.beta.organization.apiKeys.retrieve(
     *     'api_key_id',
     *   );
     * ```
     */
    retrieve(apiKeyID, options) {
        return this._client.get(path `/v1/organizations/api_keys/${apiKeyID}?beta=true`, options);
    }
    /**
     * Update API Key
     *
     * @example
     * ```ts
     * const betaAPIKey =
     *   await client.beta.organization.apiKeys.update(
     *     'api_key_id',
     *   );
     * ```
     */
    update(apiKeyID, body, options) {
        return this._client.post(path `/v1/organizations/api_keys/${apiKeyID}?beta=true`, { body, ...options });
    }
    /**
     * List API Keys
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaAPIKey of client.beta.organization.apiKeys.list()) {
     *   // ...
     * }
     * ```
     */
    list(query = {}, options) {
        return this._client.getAPIList('/v1/organizations/api_keys?beta=true', (Page), {
            query,
            ...options,
        });
    }
}
//# sourceMappingURL=api-keys.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/organization/compliance-settings.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

class ComplianceSettings extends APIResource {
    /**
     * Retrieve your organization's Compliance Settings.
     *
     * Compliance Settings is a singleton resource: there is exactly one per
     * organization, addressed without an identifier. The `state` field reflects
     * whether the Compliance API is enabled. An organization with a parent
     * organization reads the state inherited from the parent's configuration.
     *
     * @example
     * ```ts
     * const betaComplianceSettings =
     *   await client.beta.organization.complianceSettings.retrieve();
     * ```
     */
    retrieve(options) {
        return this._client.get('/v1/organizations/compliance_settings?beta=true', options);
    }
    /**
     * Update your organization's Compliance Settings.
     *
     * Setting `state` to `enabled` turns on the Compliance API and begins capturing
     * organization activity events. Setting it to `disabled` turns both off. `state`
     * reflects whether the Compliance API is enabled.
     *
     * A request that sets `state` to its current value succeeds and leaves the
     * resource unchanged. A `disabled` request stays in effect until a later `enabled`
     * request or the organization's next provisioning action that enables Access
     * Transparency: enabling Access Transparency also enables the Compliance API,
     * which serves its activity events, so such provisioning (including re-runs)
     * re-enables the Compliance API even after a `disabled` request. Automated
     * provisioning never disables compliance settings.
     *
     * @example
     * ```ts
     * const betaComplianceSettings =
     *   await client.beta.organization.complianceSettings.update({
     *     state: { type: 'enabled' },
     *   });
     * ```
     */
    update(body, options) {
        return this._client.post('/v1/organizations/compliance_settings?beta=true', { body, ...options });
    }
}
//# sourceMappingURL=compliance-settings.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/organization/external-keys.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.



class ExternalKeys extends APIResource {
    /**
     * Create an external key config owned by the caller's organization.
     *
     * @example
     * ```ts
     * const betaExternalKey =
     *   await client.beta.organization.externalKeys.create({
     *     provider_config: {
     *       kms_arn:
     *         'arn:aws:kms:us-east-1:111122223333:key/abcd1234-5678-90ab-cdef-000011112222',
     *       type: 'aws',
     *     },
     *   });
     * ```
     */
    create(body, options) {
        return this._client.post('/v1/organizations/external_keys?beta=true', { body, ...options });
    }
    /**
     * Retrieve a single external key config in the caller's organization by ID.
     *
     * @example
     * ```ts
     * const betaExternalKey =
     *   await client.beta.organization.externalKeys.retrieve(
     *     'external_key_id',
     *   );
     * ```
     */
    retrieve(externalKeyID, options) {
        return this._client.get(path `/v1/organizations/external_keys/${externalKeyID}?beta=true`, options);
    }
    /**
     * Partially update an external key config. Omitted fields are left unchanged.
     *
     * `display_name` is always editable. `geo` and `provider_config` cannot be changed
     * once any workspace references this config, because previously encrypted data
     * requires the original key identity to decrypt.
     *
     * @example
     * ```ts
     * const betaExternalKey =
     *   await client.beta.organization.externalKeys.update(
     *     'external_key_id',
     *   );
     * ```
     */
    update(externalKeyID, body, options) {
        return this._client.post(path `/v1/organizations/external_keys/${externalKeyID}?beta=true`, {
            body,
            ...options,
        });
    }
    /**
     * List external key configs in the caller's organization.
     *
     * Results are ordered by creation time (newest first). Use the `next_page` cursor
     * from the response to fetch subsequent pages.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaExternalKey of client.beta.organization.externalKeys.list()) {
     *   // ...
     * }
     * ```
     */
    list(query = {}, options) {
        return this._client.getAPIList('/v1/organizations/external_keys?beta=true', (PageCursor), {
            query,
            ...options,
        });
    }
    /**
     * Delete an external key config.
     *
     * The request is rejected if any workspace still references this config.
     *
     * @example
     * ```ts
     * const externalKey =
     *   await client.beta.organization.externalKeys.delete(
     *     'external_key_id',
     *   );
     * ```
     */
    delete(externalKeyID, options) {
        return this._client.delete(path `/v1/organizations/external_keys/${externalKeyID}?beta=true`, options);
    }
    /**
     * Validate an external key config against the customer's KMS.
     *
     * Anthropic performs an encrypt/decrypt roundtrip against the configured KMS key
     * and waits up to 30 seconds for the result. The response status is `success` if
     * the roundtrip succeeded, or `failure` with an error message if it failed or
     * timed out.
     *
     * @example
     * ```ts
     * const response =
     *   await client.beta.organization.externalKeys.validate(
     *     'external_key_id',
     *   );
     * ```
     */
    validate(externalKeyID, options) {
        return this._client.post(path `/v1/organizations/external_keys/${externalKeyID}/validate?beta=true`, options);
    }
}
//# sourceMappingURL=external-keys.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/organization/invites.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.



class Invites extends APIResource {
    /**
     * Invite a user to join the organization by email.
     *
     * On plans that draw members from a finite pool of purchased seats, the invite
     * automatically consumes a seat from the lowest tier with availability; there is
     * no seat-tier parameter. When no seat is free the request fails with a 400 error
     * rather than purchasing a seat.
     *
     * @example
     * ```ts
     * const betaOrganizationInvite =
     *   await client.beta.organization.invites.create({
     *     email: 'user@emaildomain.com',
     *     role: 'user',
     *   });
     * ```
     */
    create(body, options) {
        return this._client.post('/v1/organizations/invites?beta=true', { body, ...options });
    }
    /**
     * Retrieve an invite by ID.
     *
     * @example
     * ```ts
     * const betaOrganizationInvite =
     *   await client.beta.organization.invites.retrieve(
     *     'invite_id',
     *   );
     * ```
     */
    retrieve(inviteID, options) {
        return this._client.get(path `/v1/organizations/invites/${inviteID}?beta=true`, options);
    }
    /**
     * List the organization's invites.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaOrganizationInvite of client.beta.organization.invites.list()) {
     *   // ...
     * }
     * ```
     */
    list(query = {}, options) {
        return this._client.getAPIList('/v1/organizations/invites?beta=true', (Page), {
            query,
            ...options,
        });
    }
    /**
     * Delete a pending invite.
     *
     * @example
     * ```ts
     * const invite =
     *   await client.beta.organization.invites.delete(
     *     'invite_id',
     *   );
     * ```
     */
    delete(inviteID, options) {
        return this._client.delete(path `/v1/organizations/invites/${inviteID}?beta=true`, options);
    }
}
//# sourceMappingURL=invites.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/organization/rate-limits.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.


class RateLimits extends APIResource {
    /**
     * List Messages API rate limits for your organization.
     *
     * Each entry corresponds to one rate-limit group (either a model family or an
     * API-surface category such as the Files API or Message Batches) and contains the
     * set of limiter values that apply to it.
     *
     * When `limit` is omitted, every matching entry is returned in a single page; when
     * `limit` truncates the result, follow `next_page` to fetch the remaining entries.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaOrganizationRateLimit of client.beta.organization.rateLimits.list()) {
     *   // ...
     * }
     * ```
     */
    list(query = {}, options) {
        return this._client.getAPIList('/v1/organizations/rate_limits?beta=true', (PageCursor), { query, ...options });
    }
}
//# sourceMappingURL=rate-limits.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/organization/users.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.



class Users extends APIResource {
    /**
     * Retrieve a member of the organization by user ID.
     *
     * @example
     * ```ts
     * const betaOrganizationUser =
     *   await client.beta.organization.users.retrieve('user_id');
     * ```
     */
    retrieve(userID, options) {
        return this._client.get(path `/v1/organizations/users/${userID}?beta=true`, options);
    }
    /**
     * Update a member's organization role.
     *
     * @example
     * ```ts
     * const betaOrganizationUser =
     *   await client.beta.organization.users.update('user_id', {
     *     role: 'user',
     *   });
     * ```
     */
    update(userID, body, options) {
        return this._client.post(path `/v1/organizations/users/${userID}?beta=true`, { body, ...options });
    }
    /**
     * List the organization's members.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaOrganizationUser of client.beta.organization.users.list()) {
     *   // ...
     * }
     * ```
     */
    list(query = {}, options) {
        return this._client.getAPIList('/v1/organizations/users?beta=true', (Page), {
            query,
            ...options,
        });
    }
    /**
     * Remove a member from the organization.
     *
     * @example
     * ```ts
     * const user = await client.beta.organization.users.remove(
     *   'user_id',
     * );
     * ```
     */
    remove(userID, options) {
        return this._client.delete(path `/v1/organizations/users/${userID}?beta=true`, options);
    }
}
//# sourceMappingURL=users.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/organization/federation/issuers.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.




class Issuers extends APIResource {
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Register an OIDC issuer that Anthropic will trust for workload identity
     * federation in your organization.
     *
     * The `jwks` field controls how the issuer's signing keys are obtained and takes
     * one of three shapes selected by `type`: `discovery` (resolve keys through OIDC
     * discovery), `explicit_url` (fetch keys from a fixed JWKS URL), or `inline`
     * (provide a static key set). When `jwks.type` is `discovery` and no
     * `discovery_base` is set, the issuer URL must be publicly reachable over HTTPS so
     * Anthropic can fetch the discovery document; for `explicit_url` and `inline`
     * modes the issuer URL is only matched as the JWT's `iss` claim and is not
     * fetched.
     *
     * @example
     * ```ts
     * const betaFederationIssuer =
     *   await client.beta.organization.federation.issuers.create({
     *     issuer_url: 'x',
     *     name: 'x',
     *   });
     * ```
     */
    create(params, options) {
        const { betas, ...body } = params;
        return this._client.post('/v1/organizations/federation_issuers?beta=true', {
            body,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Retrieve a federation issuer by its ID (`fdis_...`).
     *
     * @example
     * ```ts
     * const betaFederationIssuer =
     *   await client.beta.organization.federation.issuers.retrieve(
     *     'federation_issuer_id',
     *   );
     * ```
     */
    retrieve(federationIssuerID, params = {}, options) {
        const { betas } = params ?? {};
        return this._client.get(path `/v1/organizations/federation_issuers/${federationIssuerID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Partially update a federation issuer.
     *
     * Setting `jwks` replaces the full JWKS shape at once. Archived issuers cannot be
     * updated; this returns 400. Create a new issuer instead.
     *
     * Updating an issuer that backs a rule with a scope outside `workspace:developer`
     * or `workspace:inference` requires a Console session.
     *
     * @example
     * ```ts
     * const betaFederationIssuer =
     *   await client.beta.organization.federation.issuers.update(
     *     'federation_issuer_id',
     *   );
     * ```
     */
    update(federationIssuerID, params, options) {
        const { betas, ...body } = params;
        return this._client.post(path `/v1/organizations/federation_issuers/${federationIssuerID}?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * List federation issuers in your organization.
     *
     * Archived issuers are excluded unless `include_archived=true`.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaFederationIssuer of client.beta.organization.federation.issuers.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, ...query } = params ?? {};
        return this._client.getAPIList('/v1/organizations/federation_issuers?beta=true', (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Archive a federation issuer.
     *
     * Idempotent; re-archiving returns the issuer with its original `archived_at`.
     * Rejected with 400 if any live (non-archived) federation rule still references
     * the issuer; archive those rules first (a rule's issuer cannot be changed), or
     * recreate them against another issuer.
     *
     * @example
     * ```ts
     * const betaFederationIssuer =
     *   await client.beta.organization.federation.issuers.archive(
     *     'federation_issuer_id',
     *   );
     * ```
     */
    archive(federationIssuerID, params = {}, options) {
        const { betas } = params ?? {};
        return this._client.post(path `/v1/organizations/federation_issuers/${federationIssuerID}/archive?beta=true`, {
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
}
//# sourceMappingURL=issuers.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/organization/federation/rules/workspaces.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.




class Workspaces extends APIResource {
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * List workspaces where this federation rule is enabled.
     *
     * Returns all workspace enablements in a single response; the `limit` and `page`
     * parameters are accepted but have no effect, and `next_page` is always `null`.
     * Returns explicit per-workspace enablements only; for rules with
     * `applies_to_all_workspaces` or a legacy single `workspace_id`, check those
     * fields on the rule itself.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaFederationRuleWorkspace of client.beta.organization.federation.rules.workspaces.list(
     *   'federation_rule_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(federationRuleID, params = {}, options) {
        const { betas, ...query } = params ?? {};
        return this._client.getAPIList(path `/v1/organizations/federation_rules/${federationRuleID}/workspaces?beta=true`, (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Enable a federation rule for a workspace.
     *
     * Idempotent; re-enabling returns the existing enablement. The rule and workspace
     * must both belong to your organization. Membership of the rule's target service
     * account in this workspace is not checked at enablement: token exchange into this
     * workspace is rejected unless the target is a member (it is implicitly a member
     * of the default workspace). Archived rules are rejected with 400. OAuth callers
     * may only manage rules whose `oauth_scope` is `workspace:developer` or
     * `workspace:inference`; other scopes require a Console session.
     *
     * @example
     * ```ts
     * const betaFederationRuleWorkspace =
     *   await client.beta.organization.federation.rules.workspaces.add(
     *     'federation_rule_id',
     *     { workspace_id: 'workspace_id' },
     *   );
     * ```
     */
    add(federationRuleID, params, options) {
        const { betas, ...body } = params;
        return this._client.post(path `/v1/organizations/federation_rules/${federationRuleID}/workspaces?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Disable a federation rule for a workspace.
     *
     * Idempotent; succeeds even if the enablement was already removed. OAuth callers
     * may only manage rules whose `oauth_scope` is `workspace:developer` or
     * `workspace:inference`; other scopes require a Console session.
     *
     * @example
     * ```ts
     * const workspace =
     *   await client.beta.organization.federation.rules.workspaces.remove(
     *     'workspace_id',
     *     { federation_rule_id: 'federation_rule_id' },
     *   );
     * ```
     */
    remove(workspaceID, params, options) {
        const { federation_rule_id, betas } = params;
        return this._client.delete(path `/v1/organizations/federation_rules/${federation_rule_id}/workspaces/${workspaceID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
}
//# sourceMappingURL=workspaces.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/organization/federation/rules/rules.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.






class Rules extends APIResource {
    constructor() {
        super(...arguments);
        this.workspaces = new Workspaces(this._client);
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Create a federation rule owned by your organization.
     *
     * The referenced issuer and the target service account must already exist in the
     * same organization; invalid references are rejected with a 400 error. The
     * workspace reference is validated. Membership is not checked at rule creation:
     * token exchange resolves a single enabled workspace per call and is rejected
     * unless the target service account is a member of that workspace (it is
     * implicitly a member of the default workspace). Rules on well-known shared
     * issuers (GitHub Actions, GitLab, Buildkite, Terraform Cloud, Google) must
     * constrain tenant identity via an identity-bearing claim, a tenant-pinning
     * subject prefix (such as `repo:YOUR_ORG/...`), or a CEL condition referencing one
     * of those identity claims (e.g. `claims.repository_owner`). OAuth callers may
     * only manage rules whose `oauth_scope` is `workspace:developer` or
     * `workspace:inference`; other scopes require a Console session.
     *
     * @example
     * ```ts
     * const betaFederationRule =
     *   await client.beta.organization.federation.rules.create({
     *     issuer_id: 'issuer_id',
     *     match: {},
     *     name: 'x',
     *     oauth_scope: 'x',
     *     target: {
     *       service_account_id: 'svac_01SDCCSbTxrXDpWc1phhtcfK',
     *       type: 'service_account',
     *     },
     *   });
     * ```
     */
    create(params, options) {
        const { betas, ...body } = params;
        return this._client.post('/v1/organizations/federation_rules?beta=true', {
            body,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Retrieve a federation rule by its ID (`fdrl_...`).
     *
     * @example
     * ```ts
     * const betaFederationRule =
     *   await client.beta.organization.federation.rules.retrieve(
     *     'federation_rule_id',
     *   );
     * ```
     */
    retrieve(federationRuleID, params = {}, options) {
        const { betas } = params ?? {};
        return this._client.get(path `/v1/organizations/federation_rules/${federationRuleID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Partially update a federation rule.
     *
     * `issuer_id` is immutable. `match` and `target` are replaced as whole objects
     * when set. Referenced service accounts and workspaces must exist in your
     * organization; invalid references are rejected with a 400 error. Archived rules
     * cannot be updated; this returns 400. Create a new rule instead. Rules on
     * well-known shared issuers (GitHub Actions, GitLab, Buildkite, Terraform Cloud,
     * Google) must constrain tenant identity via an identity-bearing claim, a
     * tenant-pinning subject prefix (such as `repo:YOUR_ORG/...`), or a CEL condition
     * referencing one of those identity claims (e.g. `claims.repository_owner`). On
     * these issuers the requirement is re-checked on every update; if an existing
     * rule's stored match does not yet constrain tenant identity, any update (even a
     * rename or description change) must also supply a conforming `match` in the same
     * request. OAuth callers may only manage rules whose `oauth_scope` is
     * `workspace:developer` or `workspace:inference`; other scopes require a Console
     * session.
     *
     * @example
     * ```ts
     * const betaFederationRule =
     *   await client.beta.organization.federation.rules.update(
     *     'federation_rule_id',
     *   );
     * ```
     */
    update(federationRuleID, params, options) {
        const { betas, ...body } = params;
        return this._client.post(path `/v1/organizations/federation_rules/${federationRuleID}?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * List federation rules in your organization.
     *
     * Optionally filter by issuer with `issuer_id`. Archived rules are excluded unless
     * `include_archived=true`.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaFederationRule of client.beta.organization.federation.rules.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, ...query } = params ?? {};
        return this._client.getAPIList('/v1/organizations/federation_rules?beta=true', (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Archive a federation rule.
     *
     * Token exchange through this rule stops immediately. Idempotent; re-archiving
     * returns the rule with its original `archived_at`. Archiving clears the rule's
     * workspace targeting (`workspace_id` and `workspace_ids` are emptied). Tokens
     * already minted before archive remain valid until they expire. OAuth callers may
     * only manage rules whose `oauth_scope` is `workspace:developer` or
     * `workspace:inference`; other scopes require a Console session.
     *
     * @example
     * ```ts
     * const betaFederationRule =
     *   await client.beta.organization.federation.rules.archive(
     *     'federation_rule_id',
     *   );
     * ```
     */
    archive(federationRuleID, params = {}, options) {
        const { betas } = params ?? {};
        return this._client.post(path `/v1/organizations/federation_rules/${federationRuleID}/archive?beta=true`, {
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
}
Rules.Workspaces = Workspaces;
//# sourceMappingURL=rules.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/organization/federation/federation.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.





class Federation extends APIResource {
    constructor() {
        super(...arguments);
        this.issuers = new Issuers(this._client);
        this.rules = new Rules(this._client);
    }
}
Federation.Issuers = Issuers;
Federation.Rules = Rules;
//# sourceMappingURL=federation.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/organization/service-accounts/workspaces.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.




class workspaces_Workspaces extends APIResource {
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * List the workspaces a service account is a member of.
     *
     * Each entry includes the service account's `workspace_role` in that workspace.
     * Use `limit` and the `next_page` cursor to paginate. When the service account has
     * no explicit default-workspace membership, the implicit (`implicit: true`)
     * membership is returned as the first entry on the first page; with `limit=1` the
     * first page may return up to 2 entries (the implicit entry plus one explicit
     * membership) so a pagination cursor can be derived. Memberships are returned only
     * while the service account is active. Without a `page` cursor, an archived
     * service account returns an empty list. A `page` cursor that does not match an
     * active membership returns a 400 invalid-request error. A cursor stops matching
     * when the membership is removed, the workspace is deleted, or the service account
     * is archived. Restart pagination from the first page to recover.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaServiceAccountWorkspaceMember of client.beta.organization.serviceAccounts.workspaces.list(
     *   'service_account_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(serviceAccountID, params = {}, options) {
        const { betas, ...query } = params ?? {};
        return this._client.getAPIList(path `/v1/organizations/service_accounts/${serviceAccountID}/workspaces?beta=true`, (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Add a service account to a workspace with the given `workspace_role`.
     *
     * Mirror of `POST /workspaces/{workspace_id}/service_accounts`, addressed from the
     * service-account side; both create the same membership. If the service account is
     * already an explicit member of the workspace, its `workspace_role` is replaced
     * with the value supplied here. Archived workspaces return 400. Archived service
     * accounts cannot be added and are rejected.
     *
     * @example
     * ```ts
     * const betaServiceAccountWorkspaceMember =
     *   await client.beta.organization.serviceAccounts.workspaces.add(
     *     'service_account_id',
     *     {
     *       workspace_id: 'workspace_id',
     *       workspace_role: 'workspace_admin',
     *     },
     *   );
     * ```
     */
    add(serviceAccountID, params, options) {
        const { betas, ...body } = params;
        return this._client.post(path `/v1/organizations/service_accounts/${serviceAccountID}/workspaces?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Remove a service account from a workspace.
     *
     * Mirror of
     * `DELETE /workspaces/{workspace_id}/service_accounts/{service_account_id}`,
     * addressed from the service-account side. Removal is idempotent (returns 200 even
     * if the membership was already removed). A DELETE against the implicit
     * default-workspace membership returns 200 but is a no-op and the membership
     * persists; deleting an explicit default-workspace row reverts to the implicit
     * `workspace_user` membership. Archived workspaces return 400.
     *
     * @example
     * ```ts
     * const workspace =
     *   await client.beta.organization.serviceAccounts.workspaces.remove(
     *     'workspace_id',
     *     { service_account_id: 'service_account_id' },
     *   );
     * ```
     */
    remove(workspaceID, params, options) {
        const { service_account_id, betas } = params;
        return this._client.delete(path `/v1/organizations/service_accounts/${service_account_id}/workspaces/${workspaceID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
}
//# sourceMappingURL=workspaces.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/organization/service-accounts/service-accounts.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.






class ServiceAccounts extends APIResource {
    constructor() {
        super(...arguments);
        this.workspaces = new workspaces_Workspaces(this._client);
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Create a service account.
     *
     * A service account is a named workload identity that federation rules target.
     * `organization_role` is `developer` (default) or `admin`; a rule may only be
     * created or retargeted to grant `org:admin` scope when the target's
     * `organization_role` is `admin`. Creating an `admin`-role service account
     * requires an interactive credential (a user OAuth token or a Console session) — a
     * workload may only create `developer`-role service accounts.
     *
     * @example
     * ```ts
     * const betaServiceAccount =
     *   await client.beta.organization.serviceAccounts.create({
     *     name: 'ci-deploy-bot',
     *   });
     * ```
     */
    create(params, options) {
        const { betas, ...body } = params;
        return this._client.post('/v1/organizations/service_accounts?beta=true', {
            body,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Retrieve a service account by its ID (`svac_...`).
     *
     * @example
     * ```ts
     * const betaServiceAccount =
     *   await client.beta.organization.serviceAccounts.retrieve(
     *     'service_account_id',
     *   );
     * ```
     */
    retrieve(serviceAccountID, params = {}, options) {
        const { betas } = params ?? {};
        return this._client.get(path `/v1/organizations/service_accounts/${serviceAccountID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Update a service account.
     *
     * Only `description` and `organization_role` are mutable; `name` cannot be
     * changed. Archived service accounts cannot be updated; this returns 400. Setting
     * `organization_role` to `admin` (even when unchanged) requires an interactive
     * credential (a user OAuth token or a Console session).
     *
     * @example
     * ```ts
     * const betaServiceAccount =
     *   await client.beta.organization.serviceAccounts.update(
     *     'service_account_id',
     *   );
     * ```
     */
    update(serviceAccountID, params, options) {
        const { betas, ...body } = params;
        return this._client.post(path `/v1/organizations/service_accounts/${serviceAccountID}?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * List service accounts in the caller's organization.
     *
     * Results are ordered by creation time, newest first. Use `limit` and the
     * `next_page` cursor to paginate; set `include_archived=true` to include archived
     * service accounts.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaServiceAccount of client.beta.organization.serviceAccounts.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, ...query } = params ?? {};
        return this._client.getAPIList('/v1/organizations/service_accounts?beta=true', (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Archive a service account.
     *
     * Idempotent; re-archiving returns the service account with its original
     * `archived_at`. Rejected with 400 if any live (non-archived) federation rule
     * still targets this service account, same as issuer archival; archive those rules
     * first or change their target to another service account.
     *
     * @example
     * ```ts
     * const betaServiceAccount =
     *   await client.beta.organization.serviceAccounts.archive(
     *     'service_account_id',
     *   );
     * ```
     */
    archive(serviceAccountID, params = {}, options) {
        const { betas } = params ?? {};
        return this._client.post(path `/v1/organizations/service_accounts/${serviceAccountID}/archive?beta=true`, {
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
}
ServiceAccounts.Workspaces = workspaces_Workspaces;
//# sourceMappingURL=service-accounts.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/organization/workspaces/members.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.



class Members extends APIResource {
    /**
     * Get Workspace Member
     *
     * @example
     * ```ts
     * const betaWorkspaceMember =
     *   await client.beta.organization.workspaces.members.retrieve(
     *     'user_id',
     *     { workspace_id: 'workspace_id' },
     *   );
     * ```
     */
    retrieve(userID, params, options) {
        const { workspace_id } = params;
        return this._client.get(path `/v1/organizations/workspaces/${workspace_id}/members/${userID}?beta=true`, options);
    }
    /**
     * Update Workspace Member
     *
     * @example
     * ```ts
     * const betaWorkspaceMember =
     *   await client.beta.organization.workspaces.members.update(
     *     'user_id',
     *     {
     *       workspace_id: 'workspace_id',
     *       workspace_role: 'workspace_admin',
     *     },
     *   );
     * ```
     */
    update(userID, params, options) {
        const { workspace_id, ...body } = params;
        return this._client.post(path `/v1/organizations/workspaces/${workspace_id}/members/${userID}?beta=true`, {
            body,
            ...options,
        });
    }
    /**
     * List Workspace Members
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaWorkspaceMember of client.beta.organization.workspaces.members.list(
     *   'workspace_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(workspaceID, query = {}, options) {
        return this._client.getAPIList(path `/v1/organizations/workspaces/${workspaceID}/members?beta=true`, (Page), { query, ...options });
    }
    /**
     * Create Workspace Member
     *
     * @example
     * ```ts
     * const betaWorkspaceMember =
     *   await client.beta.organization.workspaces.members.add(
     *     'workspace_id',
     *     {
     *       user_id: 'user_01WCz1FkmYMm4gnmykNKUu3Q',
     *       workspace_role: 'workspace_admin',
     *     },
     *   );
     * ```
     */
    add(workspaceID, body, options) {
        return this._client.post(path `/v1/organizations/workspaces/${workspaceID}/members?beta=true`, {
            body,
            ...options,
        });
    }
    /**
     * Delete Workspace Member
     *
     * @example
     * ```ts
     * const member =
     *   await client.beta.organization.workspaces.members.remove(
     *     'user_id',
     *     { workspace_id: 'workspace_id' },
     *   );
     * ```
     */
    remove(userID, params, options) {
        const { workspace_id } = params;
        return this._client.delete(path `/v1/organizations/workspaces/${workspace_id}/members/${userID}?beta=true`, options);
    }
}
//# sourceMappingURL=members.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/organization/workspaces/rate-limits.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.



class rate_limits_RateLimits extends APIResource {
    /**
     * List rate-limit overrides configured for a workspace.
     *
     * Returns only the groups and limiter types that have a workspace-level override.
     * Groups without overrides inherit the organization limits and are not listed; use
     * `GET /v1/organizations/rate_limits` to see those.
     *
     * When `limit` is omitted, every matching entry is returned in a single page; when
     * `limit` truncates the result, follow `next_page` to fetch the remaining entries.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaWorkspaceRateLimit of client.beta.organization.workspaces.rateLimits.list(
     *   'workspace_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(workspaceID, query = {}, options) {
        return this._client.getAPIList(path `/v1/organizations/workspaces/${workspaceID}/rate_limits?beta=true`, (PageCursor), { query, ...options });
    }
}
//# sourceMappingURL=rate-limits.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/organization/workspaces/service-accounts.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.




class service_accounts_ServiceAccounts extends APIResource {
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Retrieve a service account's membership in a workspace.
     *
     * Returns the membership record, including the service account's `workspace_role`
     * in this workspace. Archived workspaces return 400. For the default workspace,
     * returns the implicit (`implicit: true`) membership when no explicit membership
     * exists; an explicitly added membership is returned with its assigned role. An
     * archived service account returns 404.
     *
     * @example
     * ```ts
     * const betaServiceAccountWorkspaceMember =
     *   await client.beta.organization.workspaces.serviceAccounts.retrieve(
     *     'service_account_id',
     *     { workspace_id: 'workspace_id' },
     *   );
     * ```
     */
    retrieve(serviceAccountID, params, options) {
        const { workspace_id, betas } = params;
        return this._client.get(path `/v1/organizations/workspaces/${workspace_id}/service_accounts/${serviceAccountID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Change a service account's role in a workspace.
     *
     * The new `workspace_role` replaces the current one. Only explicit memberships can
     * be updated; to set a role on the implicit default-workspace membership, add the
     * service account explicitly with
     * `POST /workspaces/{workspace_id}/service_accounts`. Archived workspaces
     * return 400. Archived service accounts cannot be updated and are rejected.
     *
     * @example
     * ```ts
     * const betaServiceAccountWorkspaceMember =
     *   await client.beta.organization.workspaces.serviceAccounts.update(
     *     'service_account_id',
     *     {
     *       workspace_id: 'workspace_id',
     *       workspace_role: 'workspace_admin',
     *     },
     *   );
     * ```
     */
    update(serviceAccountID, params, options) {
        const { workspace_id, betas, ...body } = params;
        return this._client.post(path `/v1/organizations/workspaces/${workspace_id}/service_accounts/${serviceAccountID}?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * List the service accounts that are members of a workspace.
     *
     * Each entry includes the service account's `workspace_role`. Use `limit` and the
     * `next_page` cursor to paginate. Archived workspaces return 400; use
     * `GET /service_accounts/{id}/workspaces` to audit memberships of an archived
     * workspace. The implicit default-workspace membership is not included in this
     * list. Memberships of archived service accounts are omitted from the results.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaServiceAccountWorkspaceMember of client.beta.organization.workspaces.serviceAccounts.list(
     *   'workspace_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(workspaceID, params = {}, options) {
        const { betas, ...query } = params ?? {};
        return this._client.getAPIList(path `/v1/organizations/workspaces/${workspaceID}/service_accounts?beta=true`, (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Add a service account to a workspace with the given `workspace_role`.
     *
     * The role determines what the service account can do in the workspace and which
     * workspace-scoped permissions it can be granted when authenticating through
     * federation. Every service account is already an implicit `workspace_user` member
     * of the default workspace; adding it explicitly assigns a chosen role. If the
     * service account is already an explicit member of the workspace, its
     * `workspace_role` is replaced with the value supplied here. Archived workspaces
     * return 400. Archived service accounts cannot be added and are rejected.
     *
     * @example
     * ```ts
     * const betaServiceAccountWorkspaceMember =
     *   await client.beta.organization.workspaces.serviceAccounts.add(
     *     'workspace_id',
     *     {
     *       service_account_id: 'service_account_id',
     *       workspace_role: 'workspace_admin',
     *     },
     *   );
     * ```
     */
    add(workspaceID, params, options) {
        const { betas, ...body } = params;
        return this._client.post(path `/v1/organizations/workspaces/${workspaceID}/service_accounts?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * **Requires an OAuth access token with the `org:admin` scope**, from
     * `ant auth login --scope org:admin` or a workload identity federation rule; Admin
     * API keys are not accepted. See
     * [Manage WIF with the Admin API](/docs/en/manage-claude/wif-admin-api).
     *
     * Remove a service account from a workspace.
     *
     * Removal is idempotent (returns 200 even if the membership was already removed).
     * A DELETE against the implicit default-workspace membership returns 200 but is a
     * no-op and the membership persists; deleting an explicit default-workspace row
     * reverts to the implicit `workspace_user` membership. Archived workspaces
     * return 400.
     *
     * @example
     * ```ts
     * const serviceAccount =
     *   await client.beta.organization.workspaces.serviceAccounts.remove(
     *     'service_account_id',
     *     { workspace_id: 'workspace_id' },
     *   );
     * ```
     */
    remove(serviceAccountID, params, options) {
        const { workspace_id, betas } = params;
        return this._client.delete(path `/v1/organizations/workspaces/${workspace_id}/service_accounts/${serviceAccountID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
}
//# sourceMappingURL=service-accounts.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/organization/workspaces/workspaces.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.










class workspaces_workspaces_Workspaces extends APIResource {
    constructor() {
        super(...arguments);
        this.rateLimits = new rate_limits_RateLimits(this._client);
        this.members = new Members(this._client);
        this.serviceAccounts = new service_accounts_ServiceAccounts(this._client);
    }
    /**
     * Create Workspace
     *
     * @example
     * ```ts
     * const betaWorkspace =
     *   await client.beta.organization.workspaces.create({
     *     name: 'x',
     *   });
     * ```
     */
    create(params, options) {
        const { betas, ...body } = params;
        return this._client.post('/v1/organizations/workspaces?beta=true', {
            body,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * Get Workspace
     *
     * @example
     * ```ts
     * const betaWorkspace =
     *   await client.beta.organization.workspaces.retrieve(
     *     'workspace_id',
     *   );
     * ```
     */
    retrieve(workspaceID, options) {
        return this._client.get(path `/v1/organizations/workspaces/${workspaceID}?beta=true`, options);
    }
    /**
     * Update Workspace
     *
     * @example
     * ```ts
     * const betaWorkspace =
     *   await client.beta.organization.workspaces.update(
     *     'workspace_id',
     *   );
     * ```
     */
    update(workspaceID, body, options) {
        return this._client.post(path `/v1/organizations/workspaces/${workspaceID}?beta=true`, {
            body,
            ...options,
        });
    }
    /**
     * List Workspaces
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaWorkspace of client.beta.organization.workspaces.list()) {
     *   // ...
     * }
     * ```
     */
    list(query = {}, options) {
        return this._client.getAPIList('/v1/organizations/workspaces?beta=true', (Page), {
            query,
            ...options,
        });
    }
    /**
     * Archive Workspace
     *
     * @example
     * ```ts
     * const betaWorkspace =
     *   await client.beta.organization.workspaces.archive(
     *     'workspace_id',
     *   );
     * ```
     */
    archive(workspaceID, options) {
        return this._client.post(path `/v1/organizations/workspaces/${workspaceID}/archive?beta=true`, options);
    }
}
workspaces_workspaces_Workspaces.RateLimits = rate_limits_RateLimits;
workspaces_workspaces_Workspaces.Members = Members;
workspaces_workspaces_Workspaces.ServiceAccounts = service_accounts_ServiceAccounts;
//# sourceMappingURL=workspaces.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/organization/organization.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.



















class Organization extends APIResource {
    constructor() {
        super(...arguments);
        this.apiKeys = new APIKeys(this._client);
        this.externalKeys = new ExternalKeys(this._client);
        this.federation = new Federation(this._client);
        this.invites = new Invites(this._client);
        this.serviceAccounts = new ServiceAccounts(this._client);
        this.users = new Users(this._client);
        this.workspaces = new workspaces_workspaces_Workspaces(this._client);
        this.rateLimits = new RateLimits(this._client);
        this.complianceSettings = new ComplianceSettings(this._client);
    }
    /**
     * Retrieve information about the organization associated with the authenticated
     * API key.
     *
     * @example
     * ```ts
     * const betaOrganization =
     *   await client.beta.organization.retrieve();
     * ```
     */
    retrieve(options) {
        return this._client.get('/v1/organizations/me?beta=true', options);
    }
}
Organization.APIKeys = APIKeys;
Organization.ExternalKeys = ExternalKeys;
Organization.Federation = Federation;
Organization.Invites = Invites;
Organization.ServiceAccounts = ServiceAccounts;
Organization.Users = Users;
Organization.Workspaces = workspaces_workspaces_Workspaces;
Organization.RateLimits = RateLimits;
Organization.ComplianceSettings = ComplianceSettings;
//# sourceMappingURL=organization.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/sessions/events.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.





class Events extends APIResource {
    /**
     * List Events
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaManagedAgentsSessionEvent of client.beta.sessions.events.list(
     *   'sesn_011CZkZAtmR3yMPDzynEDxu7',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(sessionID, params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList(path `/v1/sessions/${sessionID}/events?beta=true`, (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Send Events
     *
     * @example
     * ```ts
     * const betaManagedAgentsSendSessionEvents =
     *   await client.beta.sessions.events.send(
     *     'sesn_011CZkZAtmR3yMPDzynEDxu7',
     *     {
     *       events: [
     *         {
     *           content: [
     *             {
     *               text: 'Where is my order #1234?',
     *               type: 'text',
     *             },
     *           ],
     *           type: 'user.message',
     *         },
     *       ],
     *     },
     *   );
     * ```
     */
    send(sessionID, params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post(path `/v1/sessions/${sessionID}/events?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Stream Events
     *
     * @example
     * ```ts
     * const betaManagedAgentsStreamSessionEvents =
     *   await client.beta.sessions.events.stream(
     *     'sesn_011CZkZAtmR3yMPDzynEDxu7',
     *   );
     * ```
     */
    stream(sessionID, params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.get(path `/v1/sessions/${sessionID}/events/stream?beta=true`, {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
            stream: true,
        });
    }
    /**
     * Attach to a session and dispatch every incoming `agent.tool_use` and
     * `agent.custom_tool_use` event to a local tool registry, sending the matching
     * result back (`user.tool_result` / `user.custom_tool_result`). The
     * sessions-side counterpart to `client.beta.messages.toolRunner`: yields one
     * entry per completed tool call so callers can observe each dispatch (and
     * `break` to abort cleanly).
     *
     * @example
     * ```ts
     * import { betaAgentToolset20260401 } from '@anthropic-ai/sdk/tools/agent-toolset/node';
     *
     * for await (const call of client.beta.sessions.events.toolRunner(work.data.id, {
     *   tools: [...betaAgentToolset20260401({ workdir }), myTool],
     * })) {
     *   console.log(`${call.name} -> ${call.isError ? 'error' : 'ok'}`);
     * }
     * ```
     */
    toolRunner(sessionID, opts) {
        return new SessionToolRunner(sessionID, { ...opts, client: this._client });
    }
}

Events.SessionToolRunner = SessionToolRunner;
//# sourceMappingURL=events.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/sessions/resources.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.




class Resources extends APIResource {
    /**
     * Get Session Resource
     *
     * @example
     * ```ts
     * const resource =
     *   await client.beta.sessions.resources.retrieve(
     *     'sesrsc_011CZkZBJq5dWxk9fVLNcPht',
     *     { session_id: 'sesn_011CZkZAtmR3yMPDzynEDxu7' },
     *   );
     * ```
     */
    retrieve(resourceID, params, options) {
        const { session_id, betas, workspace_id } = params;
        return this._client.get(path `/v1/sessions/${session_id}/resources/${resourceID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Update Session Resource
     *
     * @example
     * ```ts
     * const resource =
     *   await client.beta.sessions.resources.update(
     *     'sesrsc_011CZkZBJq5dWxk9fVLNcPht',
     *     {
     *       session_id: 'sesn_011CZkZAtmR3yMPDzynEDxu7',
     *       authorization_token: 'ghp_exampletoken',
     *     },
     *   );
     * ```
     */
    update(resourceID, params, options) {
        const { session_id, betas, workspace_id, ...body } = params;
        return this._client.post(path `/v1/sessions/${session_id}/resources/${resourceID}?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * List Session Resources
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaManagedAgentsSessionResource of client.beta.sessions.resources.list(
     *   'sesn_011CZkZAtmR3yMPDzynEDxu7',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(sessionID, params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList(path `/v1/sessions/${sessionID}/resources?beta=true`, (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Delete Session Resource
     *
     * @example
     * ```ts
     * const betaManagedAgentsDeleteSessionResource =
     *   await client.beta.sessions.resources.delete(
     *     'sesrsc_011CZkZBJq5dWxk9fVLNcPht',
     *     { session_id: 'sesn_011CZkZAtmR3yMPDzynEDxu7' },
     *   );
     * ```
     */
    delete(resourceID, params, options) {
        const { session_id, betas, workspace_id } = params;
        return this._client.delete(path `/v1/sessions/${session_id}/resources/${resourceID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Add Session Resource
     *
     * @example
     * ```ts
     * const betaManagedAgentsFileResource =
     *   await client.beta.sessions.resources.add(
     *     'sesn_011CZkZAtmR3yMPDzynEDxu7',
     *     {
     *       file_id: 'file_011CNha8iCJcU1wXNR6q4V8w',
     *       type: 'file',
     *     },
     *   );
     * ```
     */
    add(sessionID, params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post(path `/v1/sessions/${sessionID}/resources?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
//# sourceMappingURL=resources.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/sessions/threads/events.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.




class events_Events extends APIResource {
    /**
     * List Session Thread Events
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaManagedAgentsSessionEvent of client.beta.sessions.threads.events.list(
     *   'sthr_011CZkZVWa6oIjw0rgXZpnBt',
     *   { session_id: 'sesn_011CZkZAtmR3yMPDzynEDxu7' },
     * )) {
     *   // ...
     * }
     * ```
     */
    list(threadID, params, options) {
        const { session_id, betas, workspace_id, ...query } = params;
        return this._client.getAPIList(path `/v1/sessions/${session_id}/threads/${threadID}/events?beta=true`, (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Stream Session Thread Events
     *
     * @example
     * ```ts
     * const betaManagedAgentsStreamSessionThreadEvents =
     *   await client.beta.sessions.threads.events.stream(
     *     'sthr_011CZkZVWa6oIjw0rgXZpnBt',
     *     { session_id: 'sesn_011CZkZAtmR3yMPDzynEDxu7' },
     *   );
     * ```
     */
    stream(threadID, params, options) {
        const { session_id, betas, workspace_id, ...query } = params;
        return this._client.get(path `/v1/sessions/${session_id}/threads/${threadID}/stream?beta=true`, {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
            stream: true,
        });
    }
}
//# sourceMappingURL=events.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/sessions/threads/threads.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.






class Threads extends APIResource {
    constructor() {
        super(...arguments);
        this.events = new events_Events(this._client);
    }
    /**
     * Get Session Thread
     *
     * @example
     * ```ts
     * const betaManagedAgentsSessionThread =
     *   await client.beta.sessions.threads.retrieve(
     *     'sthr_011CZkZVWa6oIjw0rgXZpnBt',
     *     { session_id: 'sesn_011CZkZAtmR3yMPDzynEDxu7' },
     *   );
     * ```
     */
    retrieve(threadID, params, options) {
        const { session_id, betas, workspace_id } = params;
        return this._client.get(path `/v1/sessions/${session_id}/threads/${threadID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * List Session Threads
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaManagedAgentsSessionThread of client.beta.sessions.threads.list(
     *   'sesn_011CZkZAtmR3yMPDzynEDxu7',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(sessionID, params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList(path `/v1/sessions/${sessionID}/threads?beta=true`, (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Archive Session Thread
     *
     * @example
     * ```ts
     * const betaManagedAgentsSessionThread =
     *   await client.beta.sessions.threads.archive(
     *     'sthr_011CZkZVWa6oIjw0rgXZpnBt',
     *     { session_id: 'sesn_011CZkZAtmR3yMPDzynEDxu7' },
     *   );
     * ```
     */
    archive(threadID, params, options) {
        const { session_id, betas, workspace_id } = params;
        return this._client.post(path `/v1/sessions/${session_id}/threads/${threadID}/archive?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
Threads.Events = events_Events;
//# sourceMappingURL=threads.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/sessions/sessions.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.










class Sessions extends APIResource {
    constructor() {
        super(...arguments);
        this.events = new Events(this._client);
        this.resources = new Resources(this._client);
        this.threads = new Threads(this._client);
    }
    /**
     * Create Session
     *
     * @example
     * ```ts
     * const betaManagedAgentsSession =
     *   await client.beta.sessions.create({
     *     agent: 'agent_011CZkYpogX7uDKUyvBTophP',
     *     environment_id: 'env_011CZkZ9X2dpNyB7HsEFoRfW',
     *   });
     * ```
     */
    create(params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post('/v1/sessions?beta=true', {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Get Session
     *
     * @example
     * ```ts
     * const betaManagedAgentsSession =
     *   await client.beta.sessions.retrieve(
     *     'sesn_011CZkZAtmR3yMPDzynEDxu7',
     *   );
     * ```
     */
    retrieve(sessionID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.get(path `/v1/sessions/${sessionID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Update Session
     *
     * @example
     * ```ts
     * const betaManagedAgentsSession =
     *   await client.beta.sessions.update(
     *     'sesn_011CZkZAtmR3yMPDzynEDxu7',
     *   );
     * ```
     */
    update(sessionID, params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post(path `/v1/sessions/${sessionID}?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * List Sessions
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaManagedAgentsSession of client.beta.sessions.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList('/v1/sessions?beta=true', (BidirectionalPageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Delete Session
     *
     * @example
     * ```ts
     * const betaManagedAgentsDeletedSession =
     *   await client.beta.sessions.delete(
     *     'sesn_011CZkZAtmR3yMPDzynEDxu7',
     *   );
     * ```
     */
    delete(sessionID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.delete(path `/v1/sessions/${sessionID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Archive Session
     *
     * @example
     * ```ts
     * const betaManagedAgentsSession =
     *   await client.beta.sessions.archive(
     *     'sesn_011CZkZAtmR3yMPDzynEDxu7',
     *   );
     * ```
     */
    archive(sessionID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.post(path `/v1/sessions/${sessionID}/archive?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
Sessions.Events = Events;
Sessions.Resources = Resources;
Sessions.Threads = Threads;
//# sourceMappingURL=sessions.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/skills/versions.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.





class versions_Versions extends APIResource {
    /**
     * Create Skill Version
     *
     * @example
     * ```ts
     * const betaSkillVersion =
     *   await client.beta.skills.versions.create('skill_id', {
     *     files: [fs.createReadStream('path/to/file')],
     *   });
     * ```
     */
    create(skillID, params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post(path `/v1/skills/${skillID}/versions?beta=true`, multipartFormRequestOptions({
            body,
            ...options,
            headers: buildHeaders([
                {
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        }, this._client, false));
    }
    /**
     * Get Skill Version
     *
     * @example
     * ```ts
     * const betaSkillVersion =
     *   await client.beta.skills.versions.retrieve('version', {
     *     skill_id: 'skill_id',
     *   });
     * ```
     */
    retrieve(version, params, options) {
        const { skill_id, betas, workspace_id } = params;
        return this._client.get(path `/v1/skills/${skill_id}/versions/${version}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * List Skill Versions
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaSkillVersion of client.beta.skills.versions.list(
     *   'skill_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(skillID, params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList(path `/v1/skills/${skillID}/versions?beta=true`, (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Delete Skill Version
     *
     * @example
     * ```ts
     * const betaDeletedSkillVersion =
     *   await client.beta.skills.versions.delete('version', {
     *     skill_id: 'skill_id',
     *   });
     * ```
     */
    delete(version, params, options) {
        const { skill_id, betas, workspace_id } = params;
        return this._client.delete(path `/v1/skills/${skill_id}/versions/${version}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Download a skill version's content as a zip archive.
     *
     * @example
     * ```ts
     * const response = await client.beta.skills.versions.download(
     *   'version',
     *   { skill_id: 'skill_id' },
     * );
     *
     * const content = await response.blob();
     * console.log(content);
     * ```
     */
    download(version, params, options) {
        const { skill_id, betas, workspace_id } = params;
        return this._client.get(path `/v1/skills/${skill_id}/versions/${version}/content?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    Accept: 'application/binary',
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
            __binaryResponse: true,
        });
    }
}
//# sourceMappingURL=versions.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/skills/skills.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.







class Skills extends APIResource {
    constructor() {
        super(...arguments);
        this.versions = new versions_Versions(this._client);
    }
    /**
     * Create Skill
     *
     * @example
     * ```ts
     * const betaSkill = await client.beta.skills.create({
     *   files: [fs.createReadStream('path/to/file')],
     * });
     * ```
     */
    create(params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post('/v1/skills?beta=true', multipartFormRequestOptions({
            body,
            ...options,
            headers: buildHeaders([
                {
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        }, this._client, false));
    }
    /**
     * Get Skill
     *
     * @example
     * ```ts
     * const betaSkill = await client.beta.skills.retrieve(
     *   'skill_id',
     * );
     * ```
     */
    retrieve(skillID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.get(path `/v1/skills/${skillID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * List Skills
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaSkill of client.beta.skills.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList('/v1/skills?beta=true', (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Delete Skill
     *
     * @example
     * ```ts
     * const betaDeletedSkill = await client.beta.skills.delete(
     *   'skill_id',
     * );
     * ```
     */
    delete(skillID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.delete(path `/v1/skills/${skillID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
Skills.Versions = versions_Versions;
//# sourceMappingURL=skills.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/tunnels/certificates.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.




class Certificates extends APIResource {
    /**
     * The Tunnels API is in research preview. It requires the
     * `anthropic-beta: mcp-tunnels-2026-06-22` header and may change without a
     * deprecation period. It supersedes the Admin API endpoints at
     * `/v1/organizations/tunnels`, which remain available during a migration window.
     *
     * Registers a public CA certificate on a tunnel. Anthropic verifies the gateway's
     * server certificate against this CA when it terminates the inner TLS session. A
     * tunnel holds at most two non-archived certificates.
     *
     * @example
     * ```ts
     * const betaTunnelCertificate =
     *   await client.beta.tunnels.certificates.create(
     *     'tunnel_id',
     *     { ca_certificate_pem: 'ca_certificate_pem' },
     *   );
     * ```
     */
    create(tunnelID, params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post(path `/v1/tunnels/${tunnelID}/certificates?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'mcp-tunnels-2026-06-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * The Tunnels API is in research preview. It requires the
     * `anthropic-beta: mcp-tunnels-2026-06-22` header and may change without a
     * deprecation period. It supersedes the Admin API endpoints at
     * `/v1/organizations/tunnels`, which remain available during a migration window.
     *
     * Fetches a tunnel certificate by ID.
     *
     * @example
     * ```ts
     * const betaTunnelCertificate =
     *   await client.beta.tunnels.certificates.retrieve(
     *     'certificate_id',
     *     { tunnel_id: 'tunnel_id' },
     *   );
     * ```
     */
    retrieve(certificateID, params, options) {
        const { tunnel_id, betas, workspace_id } = params;
        return this._client.get(path `/v1/tunnels/${tunnel_id}/certificates/${certificateID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'mcp-tunnels-2026-06-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * The Tunnels API is in research preview. It requires the
     * `anthropic-beta: mcp-tunnels-2026-06-22` header and may change without a
     * deprecation period. It supersedes the Admin API endpoints at
     * `/v1/organizations/tunnels`, which remain available during a migration window.
     *
     * Lists the certificates registered on a tunnel. Archived certificates are
     * excluded unless include_archived is set.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaTunnelCertificate of client.beta.tunnels.certificates.list(
     *   'tunnel_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(tunnelID, params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList(path `/v1/tunnels/${tunnelID}/certificates?beta=true`, (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'mcp-tunnels-2026-06-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * The Tunnels API is in research preview. It requires the
     * `anthropic-beta: mcp-tunnels-2026-06-22` header and may change without a
     * deprecation period. It supersedes the Admin API endpoints at
     * `/v1/organizations/tunnels`, which remain available during a migration window.
     *
     * Archives a tunnel certificate, removing it from the set Anthropic trusts for the
     * tunnel. The certificate record is retained. Archiving the last non-archived
     * certificate is permitted; the tunnel rejects MCP traffic until a new certificate
     * is added.
     *
     * @example
     * ```ts
     * const betaTunnelCertificate =
     *   await client.beta.tunnels.certificates.archive(
     *     'certificate_id',
     *     { tunnel_id: 'tunnel_id' },
     *   );
     * ```
     */
    archive(certificateID, params, options) {
        const { tunnel_id, betas, workspace_id } = params;
        return this._client.post(path `/v1/tunnels/${tunnel_id}/certificates/${certificateID}/archive?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'mcp-tunnels-2026-06-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
//# sourceMappingURL=certificates.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/tunnels/tunnels.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.






class Tunnels extends APIResource {
    constructor() {
        super(...arguments);
        this.certificates = new Certificates(this._client);
    }
    /**
     * The Tunnels API is in research preview. It requires the
     * `anthropic-beta: mcp-tunnels-2026-06-22` header and may change without a
     * deprecation period. It supersedes the Admin API endpoints at
     * `/v1/organizations/tunnels`, which remain available during a migration window.
     *
     * Creates a tunnel. Creation allocates a fresh hostname and provisions the tunnel;
     * it is not idempotent. The new tunnel rejects MCP traffic until at least one CA
     * certificate is added.
     *
     * @example
     * ```ts
     * const betaTunnel = await client.beta.tunnels.create();
     * ```
     */
    create(params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post('/v1/tunnels?beta=true', {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'mcp-tunnels-2026-06-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * The Tunnels API is in research preview. It requires the
     * `anthropic-beta: mcp-tunnels-2026-06-22` header and may change without a
     * deprecation period. It supersedes the Admin API endpoints at
     * `/v1/organizations/tunnels`, which remain available during a migration window.
     *
     * Fetches a tunnel by ID.
     *
     * @example
     * ```ts
     * const betaTunnel = await client.beta.tunnels.retrieve(
     *   'tunnel_id',
     * );
     * ```
     */
    retrieve(tunnelID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.get(path `/v1/tunnels/${tunnelID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'mcp-tunnels-2026-06-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * The Tunnels API is in research preview. It requires the
     * `anthropic-beta: mcp-tunnels-2026-06-22` header and may change without a
     * deprecation period. It supersedes the Admin API endpoints at
     * `/v1/organizations/tunnels`, which remain available during a migration window.
     *
     * Lists tunnels. Results are ordered by creation time, newest first; archived
     * tunnels are excluded unless include_archived is set.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaTunnel of client.beta.tunnels.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList('/v1/tunnels?beta=true', (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'mcp-tunnels-2026-06-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * The Tunnels API is in research preview. It requires the
     * `anthropic-beta: mcp-tunnels-2026-06-22` header and may change without a
     * deprecation period. It supersedes the Admin API endpoints at
     * `/v1/organizations/tunnels`, which remain available during a migration window.
     *
     * Archives a tunnel. Archival is irreversible: every non-archived certificate on
     * the tunnel is archived in the same operation, the hostname is retired and never
     * re-allocated, and the tunnel token is invalidated. Retrying against an
     * already-archived tunnel returns the existing record unchanged.
     *
     * @example
     * ```ts
     * const betaTunnel = await client.beta.tunnels.archive(
     *   'tunnel_id',
     * );
     * ```
     */
    archive(tunnelID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.post(path `/v1/tunnels/${tunnelID}/archive?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'mcp-tunnels-2026-06-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * The Tunnels API is in research preview. It requires the
     * `anthropic-beta: mcp-tunnels-2026-06-22` header and may change without a
     * deprecation period. It supersedes the Admin API endpoints at
     * `/v1/organizations/tunnels`, which remain available during a migration window.
     *
     * Reveals a tunnel's connector token. The value is fetched live on each call;
     * Anthropic does not store it. Repeated calls return the same value until the
     * token is rotated. Exposed as POST so the token does not appear in intermediary
     * access logs.
     *
     * @example
     * ```ts
     * const betaTunnelToken =
     *   await client.beta.tunnels.revealToken('tunnel_id');
     * ```
     */
    revealToken(tunnelID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.post(path `/v1/tunnels/${tunnelID}/reveal_token?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'mcp-tunnels-2026-06-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * The Tunnels API is in research preview. It requires the
     * `anthropic-beta: mcp-tunnels-2026-06-22` header and may change without a
     * deprecation period. It supersedes the Admin API endpoints at
     * `/v1/organizations/tunnels`, which remain available during a migration window.
     *
     * Rotates a tunnel's connector token. Rotation invalidates the current token for
     * new connections and returns a fresh value; established connections are not
     * severed. A connector restarted after rotation must use the new value.
     *
     * @example
     * ```ts
     * const betaTunnelToken =
     *   await client.beta.tunnels.rotateToken('tunnel_id');
     * ```
     */
    rotateToken(tunnelID, params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post(path `/v1/tunnels/${tunnelID}/rotate_token?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'mcp-tunnels-2026-06-22'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
Tunnels.Certificates = Certificates;
//# sourceMappingURL=tunnels.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/vaults/credentials.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.




class Credentials extends APIResource {
    /**
     * Create Credential
     *
     * @example
     * ```ts
     * const betaManagedAgentsCredential =
     *   await client.beta.vaults.credentials.create(
     *     'vlt_011CZkZDLs7fYzm1hXNPeRjv',
     *     {
     *       auth: {
     *         token: 'bearer_exampletoken',
     *         mcp_server_url:
     *           'https://example-server.modelcontextprotocol.io/sse',
     *         type: 'static_bearer',
     *       },
     *     },
     *   );
     * ```
     */
    create(vaultID, params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post(path `/v1/vaults/${vaultID}/credentials?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Get Credential
     *
     * @example
     * ```ts
     * const betaManagedAgentsCredential =
     *   await client.beta.vaults.credentials.retrieve(
     *     'vcrd_011CZkZEMt8gZan2iYOQfSkw',
     *     { vault_id: 'vlt_011CZkZDLs7fYzm1hXNPeRjv' },
     *   );
     * ```
     */
    retrieve(credentialID, params, options) {
        const { vault_id, betas, workspace_id } = params;
        return this._client.get(path `/v1/vaults/${vault_id}/credentials/${credentialID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Update Credential
     *
     * @example
     * ```ts
     * const betaManagedAgentsCredential =
     *   await client.beta.vaults.credentials.update(
     *     'vcrd_011CZkZEMt8gZan2iYOQfSkw',
     *     { vault_id: 'vlt_011CZkZDLs7fYzm1hXNPeRjv' },
     *   );
     * ```
     */
    update(credentialID, params, options) {
        const { vault_id, betas, workspace_id, ...body } = params;
        return this._client.post(path `/v1/vaults/${vault_id}/credentials/${credentialID}?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * List Credentials
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaManagedAgentsCredential of client.beta.vaults.credentials.list(
     *   'vlt_011CZkZDLs7fYzm1hXNPeRjv',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(vaultID, params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList(path `/v1/vaults/${vaultID}/credentials?beta=true`, (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Delete Credential
     *
     * @example
     * ```ts
     * const betaManagedAgentsDeletedCredential =
     *   await client.beta.vaults.credentials.delete(
     *     'vcrd_011CZkZEMt8gZan2iYOQfSkw',
     *     { vault_id: 'vlt_011CZkZDLs7fYzm1hXNPeRjv' },
     *   );
     * ```
     */
    delete(credentialID, params, options) {
        const { vault_id, betas, workspace_id } = params;
        return this._client.delete(path `/v1/vaults/${vault_id}/credentials/${credentialID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Archive Credential
     *
     * @example
     * ```ts
     * const betaManagedAgentsCredential =
     *   await client.beta.vaults.credentials.archive(
     *     'vcrd_011CZkZEMt8gZan2iYOQfSkw',
     *     { vault_id: 'vlt_011CZkZDLs7fYzm1hXNPeRjv' },
     *   );
     * ```
     */
    archive(credentialID, params, options) {
        const { vault_id, betas, workspace_id } = params;
        return this._client.post(path `/v1/vaults/${vault_id}/credentials/${credentialID}/archive?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Validate Credential
     *
     * @example
     * ```ts
     * const betaManagedAgentsCredentialValidation =
     *   await client.beta.vaults.credentials.mcpOAuthValidate(
     *     'vcrd_011CZkZEMt8gZan2iYOQfSkw',
     *     { vault_id: 'vlt_011CZkZDLs7fYzm1hXNPeRjv' },
     *   );
     * ```
     */
    mcpOAuthValidate(credentialID, params, options) {
        const { vault_id, betas, workspace_id } = params;
        return this._client.post(path `/v1/vaults/${vault_id}/credentials/${credentialID}/mcp_oauth_validate?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
//# sourceMappingURL=credentials.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/vaults/vaults.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.






class Vaults extends APIResource {
    constructor() {
        super(...arguments);
        this.credentials = new Credentials(this._client);
    }
    /**
     * Create Vault
     *
     * @example
     * ```ts
     * const betaManagedAgentsVault =
     *   await client.beta.vaults.create({
     *     display_name: 'Example vault',
     *   });
     * ```
     */
    create(params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post('/v1/vaults?beta=true', {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Get Vault
     *
     * @example
     * ```ts
     * const betaManagedAgentsVault =
     *   await client.beta.vaults.retrieve(
     *     'vlt_011CZkZDLs7fYzm1hXNPeRjv',
     *   );
     * ```
     */
    retrieve(vaultID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.get(path `/v1/vaults/${vaultID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Update Vault
     *
     * @example
     * ```ts
     * const betaManagedAgentsVault =
     *   await client.beta.vaults.update(
     *     'vlt_011CZkZDLs7fYzm1hXNPeRjv',
     *   );
     * ```
     */
    update(vaultID, params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post(path `/v1/vaults/${vaultID}?beta=true`, {
            body,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * List Vaults
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaManagedAgentsVault of client.beta.vaults.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList('/v1/vaults?beta=true', (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Delete Vault
     *
     * @example
     * ```ts
     * const betaManagedAgentsDeletedVault =
     *   await client.beta.vaults.delete(
     *     'vlt_011CZkZDLs7fYzm1hXNPeRjv',
     *   );
     * ```
     */
    delete(vaultID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.delete(path `/v1/vaults/${vaultID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * Archive Vault
     *
     * @example
     * ```ts
     * const betaManagedAgentsVault =
     *   await client.beta.vaults.archive(
     *     'vlt_011CZkZDLs7fYzm1hXNPeRjv',
     *   );
     * ```
     */
    archive(vaultID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.post(path `/v1/vaults/${vaultID}/archive?beta=true`, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'managed-agents-2026-04-01'].toString(),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
Vaults.Credentials = Credentials;
//# sourceMappingURL=vaults.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/beta/beta.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

































class Beta extends APIResource {
    constructor() {
        super(...arguments);
        this.models = new Models(this._client);
        this.messages = new Messages(this._client);
        this.agents = new Agents(this._client);
        this.environments = new Environments(this._client);
        this.sessions = new Sessions(this._client);
        this.deployments = new Deployments(this._client);
        this.deploymentRuns = new DeploymentRuns(this._client);
        this.vaults = new Vaults(this._client);
        this.memoryStores = new MemoryStores(this._client);
        this.files = new Files(this._client);
        this.skills = new Skills(this._client);
        this.webhooks = new Webhooks(this._client);
        this.userProfiles = new UserProfiles(this._client);
        this.dreams = new Dreams(this._client);
        this.tunnels = new Tunnels(this._client);
        this.organization = new Organization(this._client);
    }
}
Beta.Models = Models;
Beta.Messages = Messages;
Beta.Agents = Agents;
Beta.Environments = Environments;
Beta.Sessions = Sessions;
Beta.Deployments = Deployments;
Beta.DeploymentRuns = DeploymentRuns;
Beta.Vaults = Vaults;
Beta.MemoryStores = MemoryStores;
Beta.Files = Files;
Beta.Skills = Skills;
Beta.Webhooks = Webhooks;
Beta.UserProfiles = UserProfiles;
Beta.Dreams = Dreams;
Beta.Tunnels = Tunnels;
Beta.Organization = Organization;
//# sourceMappingURL=beta.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/completions.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.


class Completions extends APIResource {
    create(params, options) {
        const { betas, workspace_id, ...body } = params;
        return this._client.post('/v1/complete', {
            body,
            timeout: this._client._options.timeout ?? 600000,
            ...options,
            headers: buildHeaders([
                {
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
            stream: params.stream ?? false,
        });
    }
}
//# sourceMappingURL=completions.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/files.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.






class files_Files extends APIResource {
    /**
     * List Files
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const fileMetadata of client.files.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { workspace_id, ...query } = params ?? {};
        return this._client.getAPIList('/v1/files', (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                { ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * Delete File
     *
     * @example
     * ```ts
     * const deletedFile = await client.files.delete('file_id');
     * ```
     */
    delete(fileID, params = {}, options) {
        const { workspace_id } = params ?? {};
        return this._client.delete(path `/v1/files/${fileID}`, {
            ...options,
            headers: buildHeaders([
                { ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * Download File
     *
     * @example
     * ```ts
     * const response = await client.files.download('file_id');
     *
     * const content = await response.blob();
     * console.log(content);
     * ```
     */
    download(fileID, params = {}, options) {
        const { workspace_id } = params ?? {};
        return this._client.get(path `/v1/files/${fileID}/content`, {
            ...options,
            headers: buildHeaders([
                {
                    Accept: 'application/binary',
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
            __binaryResponse: true,
        });
    }
    /**
     * Get File Metadata
     *
     * @example
     * ```ts
     * const fileMetadata = await client.files.retrieveMetadata(
     *   'file_id',
     * );
     * ```
     */
    retrieveMetadata(fileID, params = {}, options) {
        const { workspace_id } = params ?? {};
        return this._client.get(path `/v1/files/${fileID}`, {
            ...options,
            headers: buildHeaders([
                { ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * Upload File
     *
     * @example
     * ```ts
     * const fileMetadata = await client.files.upload({
     *   file: fs.createReadStream('path/to/file'),
     * });
     * ```
     */
    upload(params, options) {
        const { workspace_id, ...body } = params;
        return this._client.post('/v1/files', multipartFormRequestOptions({
            body,
            ...options,
            headers: buildHeaders([
                { ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined) },
                stainlessHelperHeaderFromFile(body.file),
                options?.headers,
            ]),
        }, this._client));
    }
}
//# sourceMappingURL=files.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/parser.mjs

function parser_getOutputFormat(params) {
    return params?.output_config?.format;
}
function maybeParseMessage(message, params, opts) {
    const outputFormat = parser_getOutputFormat(params);
    if (!params || !('parse' in (outputFormat ?? {}))) {
        return {
            ...message,
            content: message.content.map((block) => {
                if (block.type === 'text') {
                    const parsedBlock = Object.defineProperty({ ...block }, 'parsed_output', {
                        value: null,
                        enumerable: false,
                    });
                    return parsedBlock;
                }
                return block;
            }),
            parsed_output: null,
        };
    }
    return parseMessage(message, params, opts);
}
function parseMessage(message, params, opts) {
    let firstParsedOutput = null;
    const content = message.content.map((block) => {
        if (block.type === 'text') {
            const parsedOutput = parseOutputFormat(params, block.text);
            if (firstParsedOutput === null) {
                firstParsedOutput = parsedOutput;
            }
            const parsedBlock = Object.defineProperty({ ...block }, 'parsed_output', {
                value: parsedOutput,
                enumerable: false,
            });
            return parsedBlock;
        }
        return block;
    });
    return {
        ...message,
        content,
        parsed_output: firstParsedOutput,
    };
}
function parseOutputFormat(params, content) {
    const outputFormat = parser_getOutputFormat(params);
    if (outputFormat?.type !== 'json_schema') {
        return null;
    }
    try {
        if ('parse' in outputFormat) {
            return outputFormat.parse(content);
        }
        return JSON.parse(content);
    }
    catch (error) {
        throw new core_error/* AnthropicError */.pJ(`Failed to parse structured output: ${error}`);
    }
}
//# sourceMappingURL=parser.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/MessageStream.mjs
var _MessageStream_instances, _MessageStream_currentMessageSnapshot, _MessageStream_params, _MessageStream_connectedPromise, _MessageStream_resolveConnectedPromise, _MessageStream_rejectConnectedPromise, _MessageStream_endPromise, _MessageStream_resolveEndPromise, _MessageStream_rejectEndPromise, _MessageStream_listeners, _MessageStream_ended, _MessageStream_errored, _MessageStream_aborted, _MessageStream_catchingPromiseCreated, _MessageStream_response, _MessageStream_request_id, _MessageStream_workspace_id, _MessageStream_logger, _MessageStream_getFinalMessage, _MessageStream_getFinalText, _MessageStream_handleError, _MessageStream_beginRequest, _MessageStream_addStreamEvent, _MessageStream_endRequest, _MessageStream_accumulateMessage;








function MessageStream_tracksToolInput(content) {
    return content.type === 'tool_use' || content.type === 'server_tool_use';
}
class MessageStream {
    constructor(params, opts) {
        _MessageStream_instances.add(this);
        this.messages = [];
        this.receivedMessages = [];
        _MessageStream_currentMessageSnapshot.set(this, void 0);
        _MessageStream_params.set(this, null);
        this.controller = new AbortController();
        _MessageStream_connectedPromise.set(this, void 0);
        _MessageStream_resolveConnectedPromise.set(this, () => { });
        _MessageStream_rejectConnectedPromise.set(this, () => { });
        _MessageStream_endPromise.set(this, void 0);
        _MessageStream_resolveEndPromise.set(this, () => { });
        _MessageStream_rejectEndPromise.set(this, () => { });
        _MessageStream_listeners.set(this, {});
        _MessageStream_ended.set(this, false);
        _MessageStream_errored.set(this, false);
        _MessageStream_aborted.set(this, false);
        _MessageStream_catchingPromiseCreated.set(this, false);
        _MessageStream_response.set(this, void 0);
        _MessageStream_request_id.set(this, void 0);
        _MessageStream_workspace_id.set(this, void 0);
        _MessageStream_logger.set(this, void 0);
        _MessageStream_handleError.set(this, (error) => {
            (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_errored, true, "f");
            if ((0,errors/* isAbortError */.z)(error)) {
                error = new core_error/* APIUserAbortError */.cH();
            }
            if (error instanceof core_error/* APIUserAbortError */.cH) {
                (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_aborted, true, "f");
                return this._emit('abort', error);
            }
            if (error instanceof core_error/* AnthropicError */.pJ) {
                return this._emit('error', error);
            }
            if (error instanceof Error) {
                const anthropicError = new core_error/* AnthropicError */.pJ(error.message);
                // @ts-ignore
                anthropicError.cause = error;
                return this._emit('error', anthropicError);
            }
            return this._emit('error', new core_error/* AnthropicError */.pJ(String(error)));
        });
        (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_connectedPromise, new Promise((resolve, reject) => {
            (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_resolveConnectedPromise, resolve, "f");
            (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_rejectConnectedPromise, reject, "f");
        }), "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_endPromise, new Promise((resolve, reject) => {
            (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_resolveEndPromise, resolve, "f");
            (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_rejectEndPromise, reject, "f");
        }), "f");
        // Don't let these promises cause unhandled rejection errors.
        // we will manually cause an unhandled rejection error later
        // if the user hasn't registered any error listener or called
        // any promise-returning method.
        (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_connectedPromise, "f").catch(() => { });
        (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_endPromise, "f").catch(() => { });
        (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_params, params, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_logger, opts?.logger ?? console, "f");
    }
    get response() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_response, "f");
    }
    get request_id() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_request_id, "f");
    }
    get workspace_id() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_workspace_id, "f");
    }
    /**
     * Returns the `MessageStream` data, the raw `Response` instance and the ID of the request,
     * returned vie the `request-id` header which is useful for debugging requests and resporting
     * issues to Anthropic.
     *
     * This is the same as the `APIPromise.withResponse()` method.
     *
     * This method will raise an error if you created the stream using `MessageStream.fromReadableStream`
     * as no `Response` is available.
     */
    async withResponse() {
        (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_catchingPromiseCreated, true, "f");
        const response = await (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_connectedPromise, "f");
        if (!response) {
            throw new Error('Could not resolve a `Response` object');
        }
        return {
            data: this,
            response,
            request_id: response.headers.get('request-id'),
            workspace_id: response.headers.get('anthropic-workspace-id'),
        };
    }
    /**
     * Intended for use on the frontend, consuming a stream produced with
     * `.toReadableStream()` on the backend.
     *
     * Note that messages sent to the model do not appear in `.on('message')`
     * in this context.
     */
    static fromReadableStream(stream) {
        const runner = new MessageStream(null);
        runner._run(() => runner._fromReadableStream(stream));
        return runner;
    }
    static createMessage(messages, params, options, { logger } = {}) {
        const runner = new MessageStream(params, { logger });
        for (const message of params.messages) {
            runner._addMessageParam(message);
        }
        (0,tslib/* __classPrivateFieldSet */.G)(runner, _MessageStream_params, { ...params, stream: true }, "f");
        runner._run(() => runner._createMessage(messages, { ...params, stream: true }, { ...options, headers: { ...options?.headers, [STAINLESS_HELPER_METHOD_HEADER]: 'stream' } }));
        return runner;
    }
    _run(executor) {
        executor().then(() => {
            this._emitFinal();
            this._emit('end');
        }, (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_handleError, "f"));
    }
    _addMessageParam(message) {
        this.messages.push(message);
    }
    _addMessage(message, emit = true) {
        this.receivedMessages.push(message);
        if (emit) {
            this._emit('message', message);
        }
    }
    async _createMessage(messages, params, options) {
        const signal = options?.signal;
        let abortHandler;
        if (signal) {
            if (signal.aborted)
                this.controller.abort();
            abortHandler = this.controller.abort.bind(this.controller);
            signal.addEventListener('abort', abortHandler);
        }
        try {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_instances, "m", _MessageStream_beginRequest).call(this);
            const { response, data: stream } = await messages
                .create({ ...params, stream: true }, { ...options, signal: this.controller.signal })
                .withResponse();
            this._connected(response);
            for await (const event of stream) {
                (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_instances, "m", _MessageStream_addStreamEvent).call(this, event);
            }
            if (stream.controller.signal?.aborted) {
                throw new core_error/* APIUserAbortError */.cH();
            }
            (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_instances, "m", _MessageStream_endRequest).call(this);
        }
        finally {
            if (signal && abortHandler) {
                signal.removeEventListener('abort', abortHandler);
            }
        }
    }
    _connected(response) {
        if (this.ended)
            return;
        (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_response, response, "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_request_id, response?.headers.get('request-id'), "f");
        (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_workspace_id, response?.headers.get('anthropic-workspace-id'), "f");
        (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_resolveConnectedPromise, "f").call(this, response);
        this._emit('connect');
    }
    get ended() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_ended, "f");
    }
    get errored() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_errored, "f");
    }
    get aborted() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_aborted, "f");
    }
    abort() {
        this.controller.abort();
    }
    /**
     * Adds the listener function to the end of the listeners array for the event.
     * No checks are made to see if the listener has already been added. Multiple calls passing
     * the same combination of event and listener will result in the listener being added, and
     * called, multiple times.
     * @returns this MessageStream, so that calls can be chained
     */
    on(event, listener) {
        const listeners = (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_listeners, "f")[event] || ((0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_listeners, "f")[event] = []);
        listeners.push({ listener });
        return this;
    }
    /**
     * Removes the specified listener from the listener array for the event.
     * off() will remove, at most, one instance of a listener from the listener array. If any single
     * listener has been added multiple times to the listener array for the specified event, then
     * off() must be called multiple times to remove each instance.
     * @returns this MessageStream, so that calls can be chained
     */
    off(event, listener) {
        const listeners = (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_listeners, "f")[event];
        if (!listeners)
            return this;
        const index = listeners.findIndex((l) => l.listener === listener);
        if (index >= 0)
            listeners.splice(index, 1);
        return this;
    }
    /**
     * Adds a one-time listener function for the event. The next time the event is triggered,
     * this listener is removed and then invoked.
     * @returns this MessageStream, so that calls can be chained
     */
    once(event, listener) {
        const listeners = (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_listeners, "f")[event] || ((0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_listeners, "f")[event] = []);
        listeners.push({ listener, once: true });
        return this;
    }
    /**
     * This is similar to `.once()`, but returns a Promise that resolves the next time
     * the event is triggered, instead of calling a listener callback.
     * @returns a Promise that resolves the next time given event is triggered,
     * or rejects if an error is emitted.  (If you request the 'error' event,
     * returns a promise that resolves with the error).
     *
     * Example:
     *
     *   const message = await stream.emitted('message') // rejects if the stream errors
     */
    emitted(event) {
        return new Promise((resolve, reject) => {
            (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_catchingPromiseCreated, true, "f");
            if (event !== 'error')
                this.once('error', reject);
            this.once(event, resolve);
        });
    }
    async done() {
        (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_catchingPromiseCreated, true, "f");
        await (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_endPromise, "f");
    }
    get currentMessage() {
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_currentMessageSnapshot, "f");
    }
    /**
     * @returns a promise that resolves with the the final assistant Message response,
     * or rejects if an error occurred or the stream ended prematurely without producing a Message.
     * If structured outputs were used, this will be a ParsedMessage with a `parsed_output` field.
     */
    async finalMessage() {
        await this.done();
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_instances, "m", _MessageStream_getFinalMessage).call(this);
    }
    /**
     * @returns a promise that resolves with the the final assistant Message's text response, concatenated
     * together if there are more than one text blocks.
     * Rejects if an error occurred or the stream ended prematurely without producing a Message.
     */
    async finalText() {
        await this.done();
        return (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_instances, "m", _MessageStream_getFinalText).call(this);
    }
    _emit(event, ...args) {
        // make sure we don't emit any MessageStreamEvents after end
        if ((0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_ended, "f"))
            return;
        if (event === 'end') {
            (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_ended, true, "f");
            (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_resolveEndPromise, "f").call(this);
        }
        const listeners = (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_listeners, "f")[event];
        if (listeners) {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
            listeners.forEach(({ listener }) => listener(...args));
        }
        if (event === 'abort') {
            const error = args[0];
            if (!(0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
                Promise.reject(error);
            }
            (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_rejectConnectedPromise, "f").call(this, error);
            (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_rejectEndPromise, "f").call(this, error);
            this._emit('end');
            return;
        }
        if (event === 'error') {
            // NOTE: _emit('error', error) should only be called from #handleError().
            const error = args[0];
            if (!(0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
                // Trigger an unhandled rejection if the user hasn't registered any error handlers.
                // If you are seeing stack traces here, make sure to handle errors via either:
                // - runner.on('error', () => ...)
                // - await runner.done()
                // - await runner.final...()
                // - etc.
                Promise.reject(error);
            }
            (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_rejectConnectedPromise, "f").call(this, error);
            (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_rejectEndPromise, "f").call(this, error);
            this._emit('end');
        }
    }
    _emitFinal() {
        const finalMessage = this.receivedMessages.at(-1);
        if (finalMessage) {
            this._emit('finalMessage', (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_instances, "m", _MessageStream_getFinalMessage).call(this));
        }
    }
    async _fromReadableStream(readableStream, options) {
        const signal = options?.signal;
        let abortHandler;
        if (signal) {
            if (signal.aborted)
                this.controller.abort();
            abortHandler = this.controller.abort.bind(this.controller);
            signal.addEventListener('abort', abortHandler);
        }
        try {
            (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_instances, "m", _MessageStream_beginRequest).call(this);
            this._connected(null);
            const stream = streaming_Stream.fromReadableStream(readableStream, this.controller);
            for await (const event of stream) {
                (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_instances, "m", _MessageStream_addStreamEvent).call(this, event);
            }
            if (stream.controller.signal?.aborted) {
                throw new core_error/* APIUserAbortError */.cH();
            }
            (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_instances, "m", _MessageStream_endRequest).call(this);
        }
        finally {
            if (signal && abortHandler) {
                signal.removeEventListener('abort', abortHandler);
            }
        }
    }
    [(_MessageStream_currentMessageSnapshot = new WeakMap(), _MessageStream_params = new WeakMap(), _MessageStream_connectedPromise = new WeakMap(), _MessageStream_resolveConnectedPromise = new WeakMap(), _MessageStream_rejectConnectedPromise = new WeakMap(), _MessageStream_endPromise = new WeakMap(), _MessageStream_resolveEndPromise = new WeakMap(), _MessageStream_rejectEndPromise = new WeakMap(), _MessageStream_listeners = new WeakMap(), _MessageStream_ended = new WeakMap(), _MessageStream_errored = new WeakMap(), _MessageStream_aborted = new WeakMap(), _MessageStream_catchingPromiseCreated = new WeakMap(), _MessageStream_response = new WeakMap(), _MessageStream_request_id = new WeakMap(), _MessageStream_workspace_id = new WeakMap(), _MessageStream_logger = new WeakMap(), _MessageStream_handleError = new WeakMap(), _MessageStream_instances = new WeakSet(), _MessageStream_getFinalMessage = function _MessageStream_getFinalMessage() {
        if (this.receivedMessages.length === 0) {
            throw new core_error/* AnthropicError */.pJ('stream ended without producing a Message with role=assistant');
        }
        return this.receivedMessages.at(-1);
    }, _MessageStream_getFinalText = function _MessageStream_getFinalText() {
        if (this.receivedMessages.length === 0) {
            throw new core_error/* AnthropicError */.pJ('stream ended without producing a Message with role=assistant');
        }
        const textBlocks = this.receivedMessages
            .at(-1)
            .content.filter((block) => block.type === 'text')
            .map((block) => block.text);
        if (textBlocks.length === 0) {
            throw new core_error/* AnthropicError */.pJ('stream ended without producing a content block with type=text');
        }
        return textBlocks.join(' ');
    }, _MessageStream_beginRequest = function _MessageStream_beginRequest() {
        if (this.ended)
            return;
        (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_currentMessageSnapshot, undefined, "f");
    }, _MessageStream_addStreamEvent = function _MessageStream_addStreamEvent(event) {
        if (this.ended)
            return;
        const messageSnapshot = (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_instances, "m", _MessageStream_accumulateMessage).call(this, event);
        this._emit('streamEvent', event, messageSnapshot);
        switch (event.type) {
            case 'content_block_delta': {
                const content = messageSnapshot.content.at(-1);
                switch (event.delta.type) {
                    case 'text_delta': {
                        if (content.type === 'text') {
                            this._emit('text', event.delta.text, content.text || '');
                        }
                        break;
                    }
                    case 'citations_delta': {
                        if (content.type === 'text') {
                            this._emit('citation', event.delta.citation, content.citations ?? []);
                        }
                        break;
                    }
                    case 'input_json_delta': {
                        if (MessageStream_tracksToolInput(content) && (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_listeners, "f").inputJson?.length) {
                            this._emit('inputJson', event.delta.partial_json, content.input);
                        }
                        break;
                    }
                    case 'thinking_delta': {
                        if (content.type === 'thinking') {
                            this._emit('thinking', event.delta.thinking, content.thinking);
                        }
                        break;
                    }
                    case 'signature_delta': {
                        if (content.type === 'thinking') {
                            this._emit('signature', content.signature);
                        }
                        break;
                    }
                    default:
                        (0,utils_values/* checkNever */.f2)(event.delta);
                }
                break;
            }
            case 'message_stop': {
                this._addMessageParam(messageSnapshot);
                this._addMessage(maybeParseMessage(messageSnapshot, (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_params, "f"), { logger: (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_logger, "f") }), true);
                break;
            }
            case 'content_block_stop': {
                this._emit('contentBlock', messageSnapshot.content.at(-1));
                break;
            }
            case 'message_start': {
                (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_currentMessageSnapshot, messageSnapshot, "f");
                break;
            }
            case 'content_block_start':
            case 'message_delta':
                break;
        }
    }, _MessageStream_endRequest = function _MessageStream_endRequest() {
        if (this.ended) {
            throw new core_error/* AnthropicError */.pJ(`stream has ended, this shouldn't happen`);
        }
        const snapshot = (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_currentMessageSnapshot, "f");
        if (!snapshot) {
            throw new core_error/* AnthropicError */.pJ(`request ended without sending any chunks`);
        }
        (0,tslib/* __classPrivateFieldSet */.G)(this, _MessageStream_currentMessageSnapshot, undefined, "f");
        return maybeParseMessage(snapshot, (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_params, "f"), { logger: (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_logger, "f") });
    }, _MessageStream_accumulateMessage = function _MessageStream_accumulateMessage(event) {
        let snapshot = (0,tslib/* __classPrivateFieldGet */.g)(this, _MessageStream_currentMessageSnapshot, "f");
        if (event.type === 'message_start') {
            if (snapshot) {
                throw new core_error/* AnthropicError */.pJ(`Unexpected event order, got ${event.type} before receiving "message_stop"`);
            }
            return event.message;
        }
        if (!snapshot) {
            throw new core_error/* AnthropicError */.pJ(`Unexpected event order, got ${event.type} before "message_start"`);
        }
        switch (event.type) {
            case 'message_stop':
                return snapshot;
            case 'message_delta':
                snapshot.stop_reason = event.delta.stop_reason;
                snapshot.stop_sequence = event.delta.stop_sequence;
                snapshot.stop_details = event.delta.stop_details;
                snapshot.usage.output_tokens = event.usage.output_tokens;
                if (event.delta.container != null) {
                    snapshot.container = event.delta.container;
                }
                // The remaining usage counters are cumulative whole-message totals that are
                // omitted when they don't apply, so overwrite when present and never add.
                if (event.usage.input_tokens != null) {
                    snapshot.usage.input_tokens = event.usage.input_tokens;
                }
                if (event.usage.cache_creation_input_tokens != null) {
                    snapshot.usage.cache_creation_input_tokens = event.usage.cache_creation_input_tokens;
                }
                if (event.usage.cache_read_input_tokens != null) {
                    snapshot.usage.cache_read_input_tokens = event.usage.cache_read_input_tokens;
                }
                if (event.usage.server_tool_use != null) {
                    snapshot.usage.server_tool_use = event.usage.server_tool_use;
                }
                if (event.usage.output_tokens_details != null) {
                    snapshot.usage.output_tokens_details = event.usage.output_tokens_details;
                }
                return snapshot;
            case 'content_block_start':
                snapshot.content.push({ ...event.content_block });
                return snapshot;
            case 'content_block_delta': {
                const snapshotContent = snapshot.content.at(event.index);
                switch (event.delta.type) {
                    case 'text_delta': {
                        if (snapshotContent?.type === 'text') {
                            snapshot.content[event.index] = {
                                ...snapshotContent,
                                text: (snapshotContent.text || '') + event.delta.text,
                            };
                        }
                        break;
                    }
                    case 'citations_delta': {
                        if (snapshotContent?.type === 'text') {
                            snapshot.content[event.index] = {
                                ...snapshotContent,
                                citations: [...(snapshotContent.citations ?? []), event.delta.citation],
                            };
                        }
                        break;
                    }
                    case 'input_json_delta': {
                        if (snapshotContent && MessageStream_tracksToolInput(snapshotContent)) {
                            const jsonBuf = (snapshotContent[JSON_BUF_PROPERTY] || '') + event.delta.partial_json;
                            snapshot.content[event.index] = withLazyInput(snapshotContent, jsonBuf);
                        }
                        break;
                    }
                    case 'thinking_delta': {
                        if (snapshotContent?.type === 'thinking') {
                            snapshot.content[event.index] = {
                                ...snapshotContent,
                                thinking: snapshotContent.thinking + event.delta.thinking,
                            };
                        }
                        break;
                    }
                    case 'signature_delta': {
                        if (snapshotContent?.type === 'thinking') {
                            snapshot.content[event.index] = {
                                ...snapshotContent,
                                signature: event.delta.signature,
                            };
                        }
                        break;
                    }
                    default:
                        (0,utils_values/* checkNever */.f2)(event.delta);
                }
                return snapshot;
            }
            case 'content_block_stop': {
                const snapshotContent = snapshot.content.at(event.index);
                if (snapshotContent && MessageStream_tracksToolInput(snapshotContent) && JSON_BUF_PROPERTY in snapshotContent) {
                    Object.defineProperty(snapshotContent, 'input', {
                        value: snapshotContent.input,
                        enumerable: true,
                        configurable: true,
                        writable: true,
                    });
                }
                return snapshot;
            }
        }
    }, Symbol.asyncIterator)]() {
        const pushQueue = [];
        const readQueue = [];
        let done = false;
        this.on('streamEvent', (event) => {
            const reader = readQueue.shift();
            if (reader) {
                reader.resolve(event);
            }
            else {
                pushQueue.push(event);
            }
        });
        this.on('end', () => {
            done = true;
            for (const reader of readQueue) {
                reader.resolve(undefined);
            }
            readQueue.length = 0;
        });
        this.on('abort', (err) => {
            done = true;
            for (const reader of readQueue) {
                reader.reject(err);
            }
            readQueue.length = 0;
        });
        this.on('error', (err) => {
            done = true;
            for (const reader of readQueue) {
                reader.reject(err);
            }
            readQueue.length = 0;
        });
        return {
            next: async () => {
                if (!pushQueue.length) {
                    if (done) {
                        return { value: undefined, done: true };
                    }
                    return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk) => (chunk ? { value: chunk, done: false } : { value: undefined, done: true }));
                }
                const chunk = pushQueue.shift();
                return { value: chunk, done: false };
            },
            return: async () => {
                this.abort();
                return { value: undefined, done: true };
            },
        };
    }
    toReadableStream() {
        const stream = new streaming_Stream(this[Symbol.asyncIterator].bind(this), this.controller);
        return stream.toReadableStream();
    }
}
//# sourceMappingURL=MessageStream.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/messages/batches.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.






class batches_Batches extends APIResource {
    /**
     * Send a batch of Message creation requests.
     *
     * The Message Batches API can be used to process multiple Messages API requests at
     * once. Once a Message Batch is created, it begins processing immediately. Batches
     * can take up to 24 hours to complete.
     *
     * Learn more about the Message Batches API in our
     * [user guide](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
     *
     * @example
     * ```ts
     * const messageBatch = await client.messages.batches.create({
     *   requests: [
     *     {
     *       custom_id: 'my-custom-id-1',
     *       params: {
     *         max_tokens: 1024,
     *         messages: [
     *           { content: 'Hello, world', role: 'user' },
     *         ],
     *         model: 'claude-opus-5',
     *       },
     *     },
     *   ],
     * });
     * ```
     */
    create(params, options) {
        const { user_profile_id, workspace_id, ...body } = params;
        return this._client.post('/v1/messages/batches', {
            body,
            ...options,
            headers: buildHeaders([
                {
                    ...(user_profile_id != null ? { 'anthropic-user-profile-id': user_profile_id } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * This endpoint is idempotent and can be used to poll for Message Batch
     * completion. To access the results of a Message Batch, make a request to the
     * `results_url` field in the response.
     *
     * Learn more about the Message Batches API in our
     * [user guide](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
     *
     * @example
     * ```ts
     * const messageBatch = await client.messages.batches.retrieve(
     *   'message_batch_id',
     * );
     * ```
     */
    retrieve(messageBatchID, params = {}, options) {
        const { workspace_id } = params ?? {};
        return this._client.get(path `/v1/messages/batches/${messageBatchID}`, {
            ...options,
            headers: buildHeaders([
                { ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * List all Message Batches within a Workspace. Most recently created batches are
     * returned first.
     *
     * Learn more about the Message Batches API in our
     * [user guide](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const messageBatch of client.messages.batches.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { workspace_id, ...query } = params ?? {};
        return this._client.getAPIList('/v1/messages/batches', (Page), {
            query,
            ...options,
            headers: buildHeaders([
                { ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * Delete a Message Batch.
     *
     * Message Batches can only be deleted once they've finished processing. If you'd
     * like to delete an in-progress batch, you must first cancel it.
     *
     * Learn more about the Message Batches API in our
     * [user guide](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
     *
     * @example
     * ```ts
     * const deletedMessageBatch =
     *   await client.messages.batches.delete('message_batch_id');
     * ```
     */
    delete(messageBatchID, params = {}, options) {
        const { workspace_id } = params ?? {};
        return this._client.delete(path `/v1/messages/batches/${messageBatchID}`, {
            ...options,
            headers: buildHeaders([
                { ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * Batches may be canceled any time before processing ends. Once cancellation is
     * initiated, the batch enters a `canceling` state, at which time the system may
     * complete any in-progress, non-interruptible requests before finalizing
     * cancellation.
     *
     * The number of canceled requests is specified in `request_counts`. To determine
     * which requests were canceled, check the individual results within the batch.
     * Note that cancellation may not result in any canceled requests if they were
     * non-interruptible.
     *
     * Learn more about the Message Batches API in our
     * [user guide](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
     *
     * @example
     * ```ts
     * const messageBatch = await client.messages.batches.cancel(
     *   'message_batch_id',
     * );
     * ```
     */
    cancel(messageBatchID, params = {}, options) {
        const { workspace_id } = params ?? {};
        return this._client.post(path `/v1/messages/batches/${messageBatchID}/cancel`, {
            ...options,
            headers: buildHeaders([
                { ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * Streams the results of a Message Batch as a `.jsonl` file.
     *
     * Each line in the file is a JSON object containing the result of a single request
     * in the Message Batch. Results are not guaranteed to be in the same order as
     * requests. Use the `custom_id` field to match results to requests.
     *
     * Learn more about the Message Batches API in our
     * [user guide](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
     *
     * @example
     * ```ts
     * const messageBatchIndividualResponse =
     *   await client.messages.batches.results('message_batch_id');
     * ```
     */
    async results(messageBatchID, params = {}, options) {
        const batch = await this.retrieve(messageBatchID, params, options);
        if (!batch.results_url) {
            throw new core_error/* AnthropicError */.pJ(`No batch \`results_url\`; Has it finished processing? ${batch.processing_status} - ${batch.id}`);
        }
        const { workspace_id } = params ?? {};
        return this._client
            .get(batch.results_url, {
            ...options,
            headers: buildHeaders([
                {
                    Accept: 'application/binary',
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
            stream: true,
            __binaryResponse: true,
        })
            ._thenUnwrap((_, props) => JSONLDecoder.fromResponse(props.response, props.controller));
    }
}
//# sourceMappingURL=batches.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/messages/messages.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.








class messages_Messages extends APIResource {
    constructor() {
        super(...arguments);
        this.batches = new batches_Batches(this._client);
    }
    create(params, options) {
        const { user_profile_id, workspace_id, ...body } = params;
        if (body.model in messages_DEPRECATED_MODELS) {
            console.warn(`The model '${body.model}' is deprecated and will reach end-of-life on ${messages_DEPRECATED_MODELS[body.model]}\nPlease migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
        }
        if (messages_MODELS_TO_WARN_WITH_THINKING_ENABLED.includes(body.model) &&
            body.thinking &&
            body.thinking.type === 'enabled') {
            console.warn(`Using Claude with ${body.model} and 'thinking.type=enabled' is deprecated. Use 'thinking.type=adaptive' instead which results in better model performance in our testing: https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking`);
        }
        let timeout = options?.timeout ?? this._client._options.timeout;
        if (!body.stream && timeout == null) {
            const maxNonstreamingTokens = MODEL_NONSTREAMING_TOKENS[body.model] ?? undefined;
            timeout = this._client.calculateNonstreamingTimeout(body.max_tokens, maxNonstreamingTokens);
        }
        // Collect helper info from tools and messages
        const helperHeader = stainlessHelperHeader(body.tools, body.messages);
        return this._client.post('/v1/messages', {
            body,
            timeout: timeout ?? 600000,
            ...options,
            headers: buildHeaders([
                {
                    ...(user_profile_id != null ? { 'anthropic-user-profile-id': user_profile_id } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                helperHeader,
                options?.headers,
            ]),
            stream: params.stream ?? false,
        });
    }
    /**
     * Send a structured list of input messages with text and/or image content, along with an expected `output_config.format` and
     * the response will be automatically parsed and available in the `parsed_output` property of the message.
     *
     * @example
     * ```ts
     * const message = await client.messages.parse({
     *   model: 'claude-sonnet-4-5-20250929',
     *   max_tokens: 1024,
     *   messages: [{ role: 'user', content: 'What is 2+2?' }],
     *   output_config: {
     *     format: zodOutputFormat(z.object({ answer: z.number() })),
     *   },
     * });
     *
     * console.log(message.parsed_output?.answer); // 4
     * ```
     */
    parse(params, options) {
        return this.create(params, options).then((message) => parseMessage(message, params, { logger: this._client.logger ?? console }));
    }
    /**
     * Create a Message stream.
     *
     * If `output_config.format` is provided with a parseable format (like `zodOutputFormat()`),
     * the final message will include a `parsed_output` property with the parsed content.
     *
     * @example
     * ```ts
     * const stream = client.messages.stream({
     *   model: 'claude-sonnet-4-5-20250929',
     *   max_tokens: 1024,
     *   messages: [{ role: 'user', content: 'What is 2+2?' }],
     *   output_config: {
     *     format: zodOutputFormat(z.object({ answer: z.number() })),
     *   },
     * });
     *
     * const message = await stream.finalMessage();
     * console.log(message.parsed_output?.answer); // 4
     * ```
     */
    stream(body, options) {
        return MessageStream.createMessage(this, body, options, { logger: this._client.logger ?? console });
    }
    /**
     * Count the number of tokens in a Message.
     *
     * The Token Count API can be used to count the number of tokens in a Message,
     * including tools, images, and documents, without creating it.
     *
     * Learn more about token counting in our
     * [user guide](https://platform.claude.com/docs/en/build-with-claude/token-counting)
     *
     * @example
     * ```ts
     * const messageTokensCount =
     *   await client.messages.countTokens({
     *     messages: [{ content: 'Hello, world', role: 'user' }],
     *     model: 'claude-opus-5',
     *   });
     * ```
     */
    countTokens(params, options) {
        const { user_profile_id, workspace_id, ...body } = params;
        return this._client.post('/v1/messages/count_tokens', {
            body,
            ...options,
            headers: buildHeaders([
                {
                    ...(user_profile_id != null ? { 'anthropic-user-profile-id': user_profile_id } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
const messages_DEPRECATED_MODELS = {};
const messages_MODELS_TO_WARN_WITH_THINKING_ENABLED = ['claude-mythos-preview', 'claude-opus-4-6'];
messages_Messages.Batches = batches_Batches;
//# sourceMappingURL=messages.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/models.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.




class models_Models extends APIResource {
    /**
     * Get a specific model.
     *
     * The Models API response can be used to determine information about a specific
     * model or resolve a model alias to a model ID.
     *
     * @example
     * ```ts
     * const modelInfo = await client.models.retrieve('model_id');
     * ```
     */
    retrieve(modelID, params = {}, options) {
        const { betas, workspace_id } = params ?? {};
        return this._client.get(path `/v1/models/${modelID}`, {
            ...options,
            headers: buildHeaders([
                {
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
    /**
     * List available models.
     *
     * The Models API response can be used to determine which models are available for
     * use in the API. More recently released models are listed first.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const modelInfo of client.models.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, workspace_id, ...query } = params ?? {};
        return this._client.getAPIList('/v1/models', (Page), {
            query,
            ...options,
            headers: buildHeaders([
                {
                    ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined),
                    ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined),
                },
                options?.headers,
            ]),
        });
    }
}
//# sourceMappingURL=models.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/skills/versions.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.





class skills_versions_Versions extends APIResource {
    /**
     * Create Skill Version
     *
     * @example
     * ```ts
     * const skillVersion = await client.skills.versions.create(
     *   'skill_id',
     *   { files: [fs.createReadStream('path/to/file')] },
     * );
     * ```
     */
    create(skillID, params, options) {
        const { workspace_id, ...body } = params;
        return this._client.post(path `/v1/skills/${skillID}/versions`, multipartFormRequestOptions({
            body,
            ...options,
            headers: buildHeaders([
                { ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined) },
                options?.headers,
            ]),
        }, this._client, false));
    }
    /**
     * Get Skill Version
     *
     * @example
     * ```ts
     * const skillVersion = await client.skills.versions.retrieve(
     *   'version',
     *   { skill_id: 'skill_id' },
     * );
     * ```
     */
    retrieve(version, params, options) {
        const { skill_id, workspace_id } = params;
        return this._client.get(path `/v1/skills/${skill_id}/versions/${version}`, {
            ...options,
            headers: buildHeaders([
                { ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * List Skill Versions
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const skillVersion of client.skills.versions.list(
     *   'skill_id',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(skillID, params = {}, options) {
        const { workspace_id, ...query } = params ?? {};
        return this._client.getAPIList(path `/v1/skills/${skillID}/versions`, (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                { ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * Delete Skill Version
     *
     * @example
     * ```ts
     * const deletedSkillVersion =
     *   await client.skills.versions.delete('version', {
     *     skill_id: 'skill_id',
     *   });
     * ```
     */
    delete(version, params, options) {
        const { skill_id, workspace_id } = params;
        return this._client.delete(path `/v1/skills/${skill_id}/versions/${version}`, {
            ...options,
            headers: buildHeaders([
                { ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined) },
                options?.headers,
            ]),
        });
    }
}
//# sourceMappingURL=versions.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/skills/skills.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.







class skills_Skills extends APIResource {
    constructor() {
        super(...arguments);
        this.versions = new skills_versions_Versions(this._client);
    }
    /**
     * Create Skill
     *
     * @example
     * ```ts
     * const skill = await client.skills.create({
     *   files: [fs.createReadStream('path/to/file')],
     * });
     * ```
     */
    create(params, options) {
        const { workspace_id, ...body } = params;
        return this._client.post('/v1/skills', multipartFormRequestOptions({
            body,
            ...options,
            headers: buildHeaders([
                { ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined) },
                options?.headers,
            ]),
        }, this._client, false));
    }
    /**
     * Get Skill
     *
     * @example
     * ```ts
     * const skill = await client.skills.retrieve('skill_id');
     * ```
     */
    retrieve(skillID, params = {}, options) {
        const { workspace_id } = params ?? {};
        return this._client.get(path `/v1/skills/${skillID}`, {
            ...options,
            headers: buildHeaders([
                { ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * List Skills
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const skill of client.skills.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { workspace_id, ...query } = params ?? {};
        return this._client.getAPIList('/v1/skills', (PageCursor), {
            query,
            ...options,
            headers: buildHeaders([
                { ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined) },
                options?.headers,
            ]),
        });
    }
    /**
     * Delete Skill
     *
     * @example
     * ```ts
     * const deletedSkill = await client.skills.delete('skill_id');
     * ```
     */
    delete(skillID, params = {}, options) {
        const { workspace_id } = params ?? {};
        return this._client.delete(path `/v1/skills/${skillID}`, {
            ...options,
            headers: buildHeaders([
                { ...(workspace_id != null ? { 'anthropic-workspace-id': workspace_id } : undefined) },
                options?.headers,
            ]),
        });
    }
}
skills_Skills.Versions = skills_versions_Versions;
//# sourceMappingURL=skills.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/resources/index.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.







//# sourceMappingURL=index.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/client.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var _BaseAnthropic_instances, _a, _BaseAnthropic_encoder, _BaseAnthropic_baseURLOverridden;































const HUMAN_PROMPT = '\\n\\nHuman:';
const AI_PROMPT = '\\n\\nAssistant:';
/**
 * Base class for Anthropic API clients.
 */
class BaseAnthropic {
    /**
     * The active credential provider. Default credential resolution runs once
     * at construction time. If it fails, the error is surfaced on every
     * request and the client must be reconstructed — there is no retry path.
     *
     * Clones returned by {@link withOptions} share the parent's auth state
     * (provider, token cache, pending resolution, and any resolution error)
     * unless the caller passes an explicit `apiKey`, `authToken`,
     * `credentials`, `config`, or `profile` override.
     */
    get credentials() {
        return this._authState.provider;
    }
    /**
     * API Client for interfacing with the Anthropic API.
     *
     * @param {string | null | undefined} [opts.apiKey=process.env['ANTHROPIC_API_KEY'] ?? null]
     * @param {string | null | undefined} [opts.authToken=process.env['ANTHROPIC_AUTH_TOKEN'] ?? null]
     * @param {string | null | undefined} [opts.webhookKey=process.env['ANTHROPIC_WEBHOOK_SIGNING_KEY'] ?? null]
     * @param {string} [opts.baseURL=process.env['ANTHROPIC_BASE_URL'] ?? https://api.anthropic.com] - Override the default base URL for the API.
     * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
     * @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
     * @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
     * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
     * @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
     * @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
     * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
     */
    constructor({ baseURL = (0,env/* readEnv */.s)('ANTHROPIC_BASE_URL'), apiKey, authToken, webhookKey = (0,env/* readEnv */.s)('ANTHROPIC_WEBHOOK_SIGNING_KEY') ?? null, ...opts } = {}) {
        _BaseAnthropic_instances.add(this);
        this._requestAuthFlags = new WeakMap();
        _BaseAnthropic_encoder.set(this, void 0);
        // An explicit `profile` is a constructor-level credential choice; when set,
        // do not let env ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN shadow it.
        if (apiKey === undefined) {
            apiKey = opts.profile != null ? null : (0,env/* readEnv */.s)('ANTHROPIC_API_KEY') ?? null;
        }
        if (authToken === undefined) {
            authToken = opts.profile != null ? null : (0,env/* readEnv */.s)('ANTHROPIC_AUTH_TOKEN') ?? null;
        }
        if (opts.profile != null && (opts.credentials != null || opts.config != null)) {
            throw new TypeError('Pass at most one of `profile`, `credentials`, or `config`.');
        }
        const options = {
            apiKey,
            authToken,
            webhookKey,
            ...opts,
            baseURL: baseURL || `https://api.anthropic.com`,
        };
        if (!options.dangerouslyAllowBrowser && isRunningInBrowser()) {
            throw new core_error/* AnthropicError */.pJ("It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew Anthropic({ apiKey, dangerouslyAllowBrowser: true });\n");
        }
        this.baseURL = options.baseURL;
        // After destructuring, `baseURL` is the constructor arg or
        // ANTHROPIC_BASE_URL — both count as an explicit choice that a profile
        // base_url must not override. A falsy value means we fell through to the
        // hardcoded default above and a profile may supply the host. withOptions()
        // propagates the parent's flag via __baseURLIsExplicit so a non-overriding
        // clone doesn't mistake the inherited baseURL for a caller-supplied one.
        this._baseURLIsExplicit = opts.__baseURLIsExplicit ?? !!baseURL;
        this.timeout = options.timeout ?? _a.DEFAULT_TIMEOUT /* 10 minutes */;
        this.logger = options.logger ?? console;
        // Set default logLevel early so that we can log a warning in parseLogLevel.
        this.logLevel = utils_log/* defaultLogLevel */.Ic;
        this.logLevel =
            (0,utils_log/* parseLogLevel */.ML)(options.logLevel, 'ClientOptions.logLevel', (0,utils_log/* loggerFor */.WG)(this)) ??
                (0,utils_log/* parseLogLevel */.ML)((0,env/* readEnv */.s)('ANTHROPIC_LOG'), "process.env['ANTHROPIC_LOG']", (0,utils_log/* loggerFor */.WG)(this)) ??
                utils_log/* defaultLogLevel */.Ic;
        this.fetchOptions = options.fetchOptions;
        this.maxRetries = options.maxRetries ?? 2;
        this.fetch = options.fetch ?? getDefaultFetch();
        (0,tslib/* __classPrivateFieldSet */.G)(this, _BaseAnthropic_encoder, FallbackEncoder, "f");
        this.middleware = [...(options.middleware ?? [])];
        const customHeadersEnv = (0,env/* readEnv */.s)('ANTHROPIC_CUSTOM_HEADERS');
        if (customHeadersEnv) {
            const parsed = {};
            for (const line of customHeadersEnv.split('\n')) {
                const colon = line.indexOf(':');
                if (colon >= 0) {
                    parsed[line.substring(0, colon).trim()] = line.substring(colon + 1).trim();
                }
            }
            options.defaultHeaders = { ...parsed, ...options.defaultHeaders };
        }
        const inherited = opts.__auth;
        // Never persist the internal __auth handle on _options — it's a
        // one-shot constructor signal, and leaking it through _options would
        // cause withOptions() to spread a stale value into clones.
        delete options.__auth;
        delete options.__baseURLIsExplicit;
        this._options = options;
        this.apiKey = typeof apiKey === 'string' ? apiKey : null;
        this.authToken = authToken;
        this.webhookKey = webhookKey;
        if (inherited) {
            this._authState = inherited;
            if (!this._baseURLIsExplicit && inherited.baseURL) {
                this.baseURL = inherited.baseURL;
            }
        }
        else {
            this._authState = { provider: null, tokenCache: null, resolution: null, error: null, extraHeaders: {} };
            // apiKey/authToken win over credentials/config/profile; don't build a
            // token cache or resolve a config that the request path will then ignore.
            if (this.apiKey == null && this.authToken == null) {
                const credentials = options.credentials ?? null;
                if (credentials) {
                    this._authState.provider = credentials;
                    this._authState.tokenCache = this._makeTokenCache(credentials);
                }
                else if (options.config != null) {
                    const result = resolveCredentialsFromConfig(options.config, this._credentialResolverOptions());
                    this._authState.provider = result.provider;
                    this._authState.tokenCache = this._makeTokenCache(result.provider);
                    this._authState.extraHeaders = result.extraHeaders;
                    this._applyCredentialBaseURL(result.baseURL);
                }
                else if (options.profile != null) {
                    this._authState.resolution = this._resolveDefaultCredentials(options.profile);
                }
                else if (this._shouldResolveDefaultCredentials()) {
                    // No explicit auth provided — lazily resolve from the credential
                    // chain on first request. Errors are captured into _auth.error and
                    // surfaced on first use rather than as an unhandled rejection.
                    this._authState.resolution = this._resolveDefaultCredentials();
                }
            }
        }
    }
    /**
     * Whether to lazily resolve auth from the default credential chain when no
     * explicit auth is configured. Called once from the constructor, so
     * overrides must not depend on subclass instance state. Subclasses that
     * bring their own auth scheme return false so unrelated local credentials
     * are never resolved or allowed to supply a base URL.
     */
    _shouldResolveDefaultCredentials() {
        return true;
    }
    /**
     * Stores a profile/config-supplied base URL on the shared auth state and, if
     * the caller did not pin `baseURL` via constructor option or env, adopts it
     * as this client's outbound API host. Precedence: ctor opt > env > profile >
     * hardcoded default.
     */
    _applyCredentialBaseURL(baseURL) {
        if (!baseURL)
            return;
        const normalized = baseURL.replace(/\/+$/, '');
        this._authState.baseURL = normalized;
        if (!this._baseURLIsExplicit) {
            this.baseURL = normalized;
        }
    }
    /**
     * Options bag passed into the credential chain. `baseURL` here is only the
     * fallback host for the token-exchange POST when the config itself omits
     * `base_url`; the chain returns the config's own `base_url` (if any) on
     * {@link CredentialResult.baseURL}, which {@link _applyCredentialBaseURL}
     * then adopts for outbound API requests. The two are deliberately decoupled
     * so this fallback never round-trips into precedence.
     */
    _credentialResolverOptions() {
        return {
            baseURL: this.baseURL,
            fetch: this._credentialsFetch(),
            userAgent: this.getUserAgent(),
            onCacheWriteError: (err) => {
                (0,utils_log/* loggerFor */.WG)(this).debug('credential cache write failed (best-effort)', err);
            },
            onSafetyWarning: (msg) => {
                (0,utils_log/* loggerFor */.WG)(this).warn(msg);
            },
        };
    }
    /**
     * A `Fetch` for first-party credential token-exchange requests (OIDC
     * federation jwt-bearer grants, user-OAuth refresh grants) that routes
     * through this client's middleware chain, so middleware observes token
     * traffic like any other request. Only client-level middleware applies:
     * a minted token is shared across requests, so attributing the exchange
     * to any one request's per-request middleware would be arbitrary. For the
     * same reason, `ctx.options` is undefined for these requests.
     */
    _credentialsFetch() {
        return wrapFetchWithMiddleware(this.fetch, this.middleware, undefined, this);
    }
    _makeTokenCache(provider) {
        return new TokenCache(provider, (err) => {
            (0,utils_log/* loggerFor */.WG)(this).debug('advisory token refresh failed; serving cached token', err);
        });
    }
    /**
     * Create a new client instance re-using the same options given to the
     * current client with optional overriding.
     */
    withOptions(options) {
        // Share the auth state object unless the caller passes any auth-related
        // key. The `in` check is intentional: even `apiKey: undefined` opts the
        // clone out of sharing (it gets its own _auth and TokenCache, though it
        // may still wrap the parent's provider via the credentials spread below).
        const overridesStructuredAuth = 'credentials' in options || 'config' in options || 'profile' in options;
        const overridesAuth = 'apiKey' in options || 'authToken' in options || overridesStructuredAuth;
        const internal = {
            ...this._options,
            // Only forward baseURL when the caller (or env) explicitly chose it.
            // For a non-explicit parent, this.baseURL may have been mutated to the
            // profile-resolved host; pinning that as the clone's options.baseURL
            // would make _options on the clone misreport caller intent and would
            // leave the clone stuck on the parent's host across an auth override.
            // The clone instead receives the construction-time value via
            // ...this._options above and re-adopts the profile host through the
            // shared _authState.baseURL + __baseURLIsExplicit=false path.
            ...(this._baseURLIsExplicit ? { baseURL: this.baseURL } : {}),
            maxRetries: this.maxRetries,
            timeout: this.timeout,
            logger: this.logger,
            logLevel: this.logLevel,
            fetch: this.fetch,
            fetchOptions: this.fetchOptions,
            middleware: this.middleware,
            apiKey: this.apiKey,
            authToken: this.authToken,
            webhookKey: this.webhookKey,
            // credentials: this.credentials is a no-op when __auth is shared (the
            // ctor takes the inherited path and ignores options.credentials); when
            // overridesAuth is true via apiKey/authToken only, it lets the clone
            // build a fresh TokenCache around the parent's provider.
            credentials: this.credentials,
            // When the caller passes a structured-credential override, drop inherited
            // structured-credential options so only `...options` supplies them —
            // otherwise an inherited `credentials`/`config`/`profile` would trip the
            // mutual-exclusion check or precedence over the override.
            ...(overridesStructuredAuth ? { credentials: undefined, config: undefined, profile: undefined } : {}),
            ...options,
            // Always set __auth so any stale value from ...this._options is
            // overwritten. undefined means "build fresh auth from these options".
            __auth: overridesAuth ? undefined : this._authState,
            __baseURLIsExplicit: 'baseURL' in options ? true : this._baseURLIsExplicit,
        };
        return new this.constructor(internal);
    }
    /**
     * Lazily resolves credentials from config files or environment variables.
     * Called once from the constructor when no explicit auth is provided, or
     * when an explicit `profile` was passed (in which case a missing/unresolved
     * profile is surfaced as an error instead of falling through to "no auth").
     * The returned promise is stored and awaited on the first request.
     */
    async _resolveDefaultCredentials(profile) {
        try {
            const result = await defaultCredentials(this._credentialResolverOptions(), profile);
            if (result) {
                this._authState.provider = result.provider;
                this._authState.tokenCache = this._makeTokenCache(result.provider);
                this._authState.extraHeaders = result.extraHeaders;
                this._applyCredentialBaseURL(result.baseURL);
            }
            else if (profile != null) {
                throw new core_error/* AnthropicError */.pJ(`Profile "${profile}" could not be resolved (no <config_dir>/configs/${profile}.json found).`);
            }
        }
        catch (err) {
            this._authState.error = err;
        }
        finally {
            this._authState.resolution = null;
        }
    }
    defaultQuery() {
        return this._options.defaultQuery;
    }
    validateHeaders({ values, nulls }) {
        if (values.get('x-api-key') || values.get('authorization')) {
            return;
        }
        if (this._authState.error) {
            throw this._authState.error;
        }
        if (this._authState.tokenCache || this._authState.resolution) {
            return; // auth will be injected per-request via authHeaders
        }
        if (this.apiKey && values.get('x-api-key')) {
            return;
        }
        if (nulls.has('x-api-key')) {
            return;
        }
        if (this.authToken && values.get('authorization')) {
            return;
        }
        if (nulls.has('authorization')) {
            return;
        }
        throw new Error('Could not resolve authentication method. Expected one of apiKey, authToken, credentials, config, or profile to be set. Or for one of the "X-Api-Key" or "Authorization" headers to be explicitly omitted');
    }
    _authFlags(opts) {
        let flags = this._requestAuthFlags.get(opts);
        if (!flags) {
            flags = { usedTokenCache: false, didRefreshFor401: false };
            this._requestAuthFlags.set(opts, flags);
        }
        return flags;
    }
    async authHeaders(opts) {
        // Wait for lazy credential resolution if it's in progress. If it failed,
        // return no auth headers — validateHeaders surfaces the stored error
        // after the explicit-header escape hatch has had a chance to apply.
        if (this._authState.resolution) {
            await this._authState.resolution;
        }
        if (this._authState.error) {
            return undefined;
        }
        // If we have a token cache and no API key is set, use token auth
        if (this._authState.tokenCache && this.apiKey == null) {
            const token = await this._authState.tokenCache.getToken();
            this._authFlags(opts).usedTokenCache = true;
            return buildHeaders([{ Authorization: `Bearer ${token}` }]);
        }
        return buildHeaders([await this.apiKeyAuth(opts), await this.bearerAuth(opts)]);
    }
    async apiKeyAuth(opts) {
        if (this.apiKey == null) {
            return undefined;
        }
        return buildHeaders([{ 'X-Api-Key': this.apiKey }]);
    }
    async bearerAuth(opts) {
        if (this.authToken == null) {
            return undefined;
        }
        return buildHeaders([{ Authorization: `Bearer ${this.authToken}` }]);
    }
    stringifyQuery(query) {
        return (0,utils_query/* stringifyQuery */._)(query);
    }
    getUserAgent() {
        return `Anthropic/JS ${VERSION}`;
    }
    defaultIdempotencyKey() {
        return `stainless-node-retry-${uuid4()}`;
    }
    makeStatusError(status, error, message, headers) {
        return core_error/* APIError */.LG.generate(status, error, message, headers);
    }
    buildURL(path, query, defaultBaseURL) {
        const baseURL = (!(0,tslib/* __classPrivateFieldGet */.g)(this, _BaseAnthropic_instances, "m", _BaseAnthropic_baseURLOverridden).call(this) && defaultBaseURL) || this.baseURL;
        const url = (0,utils_values/* isAbsoluteURL */.nt)(path) ?
            new URL(path)
            : new URL(baseURL + (baseURL.endsWith('/') && path.startsWith('/') ? path.slice(1) : path));
        const defaultQuery = this.defaultQuery();
        const pathQuery = Object.fromEntries(url.searchParams);
        if (!(0,utils_values/* isEmptyObj */.ze)(defaultQuery) || !(0,utils_values/* isEmptyObj */.ze)(pathQuery)) {
            query = { ...pathQuery, ...defaultQuery, ...query };
        }
        if (typeof query === 'object' && query && !Array.isArray(query)) {
            url.search = this.stringifyQuery(query);
        }
        return url.toString();
    }
    _calculateNonstreamingTimeout(maxTokens) {
        const defaultTimeout = 10 * 60;
        const expectedTimeout = (60 * 60 * maxTokens) / 128000;
        if (expectedTimeout > defaultTimeout) {
            throw new core_error/* AnthropicError */.pJ('Streaming is required for operations that may take longer than 10 minutes. ' +
                'See https://github.com/anthropics/anthropic-sdk-typescript#streaming-responses for more details');
        }
        return defaultTimeout * 1000;
    }
    /**
     * Used as a callback for mutating the given `FinalRequestOptions` object.
     */
    async prepareOptions(options) { }
    /**
     * Used as a callback for mutating the given `RequestInit` object.
     *
     * This is useful for cases where you want to add certain headers based off of
     * the request properties, e.g. `method` or `url`.
     *
     * Runs after all middleware (including {@link backendMiddleware}),
     * immediately before each underlying fetch call, so it sees exactly what
     * goes over the wire. Middleware may replay a request by calling `next()`
     * more than once, so this hook can run multiple times per attempt:
     * overrides must be idempotent and overwrite headers from a previous
     * invocation rather than append to them.
     */
    async prepareRequest(request, { url, options }) {
        // Append auth-derived headers when using token auth. Done here (after all
        // header merging) rather than in authHeaders() so we append to any existing
        // anthropic-beta values instead of being overwritten by later header sources.
        if (this._authState.tokenCache && this.apiKey == null) {
            // Normalize to a Headers instance — custom fetch impls or polyfills can
            // hand back arrays / plain objects, and silently dropping the beta
            // header in that case would surface as a confusing server-side 4xx.
            const headers = request.headers instanceof Headers ? request.headers : new Headers(request.headers);
            for (const [k, v] of Object.entries(this._authState.extraHeaders)) {
                if (!headers.has(k))
                    headers.set(k, v);
            }
            const existing = headers
                .get('anthropic-beta')
                ?.split(',')
                .map((s) => s.trim());
            if (!existing?.includes(OAUTH_API_BETA_HEADER)) {
                headers.append('anthropic-beta', OAUTH_API_BETA_HEADER);
            }
            request.headers = headers;
        }
    }
    /**
     * Internal {@link Middleware} composed innermost in the chain — inside both
     * client-level and per-request middleware, immediately around the underlying
     * `fetch`. Subclasses for third-party backends override this to adapt the
     * canonical Anthropic-shaped request to the backend's wire shape (URL/body
     * rewriting, request signing) and to normalize the wire response back to the
     * canonical shape (e.g. AWS EventStream to SSE).
     *
     * Running inside the user's middleware means user middleware always observes
     * canonical Anthropic-shaped traffic, and the adaptation re-runs (e.g.
     * re-signs) on every `next()` invocation, covering whatever the middleware
     * mutated.
     *
     * Errors thrown here follow the middleware error policy: they propagate to
     * the caller as-is — no retries, no `APIConnectionError` wrapping — unless
     * retryable (see {@link Middleware}); throw a `RetryableError` to opt into
     * the retry path.
     */
    backendMiddleware() {
        return [];
    }
    get(path, opts) {
        return this.methodRequest('get', path, opts);
    }
    post(path, opts) {
        return this.methodRequest('post', path, opts);
    }
    patch(path, opts) {
        return this.methodRequest('patch', path, opts);
    }
    put(path, opts) {
        return this.methodRequest('put', path, opts);
    }
    delete(path, opts) {
        return this.methodRequest('delete', path, opts);
    }
    methodRequest(method, path, opts) {
        return this.request(Promise.resolve(opts).then((opts) => {
            return { method, path, ...opts };
        }));
    }
    request(options, remainingRetries = null) {
        return new APIPromise(this, this.makeRequest(options, remainingRetries, undefined));
    }
    async makeRequest(optionsInput, retriesRemaining, retryOfRequestLogID) {
        const options = await optionsInput;
        const maxRetries = options.maxRetries ?? this.maxRetries;
        if (retriesRemaining == null) {
            retriesRemaining = maxRetries;
            // Top-level call: reset per-request auth flags so a reused options object
            // (via client.request(opts)) doesn't carry stale 401-refresh state.
            this._requestAuthFlags.delete(options);
        }
        await this.prepareOptions(options);
        const { req, url, timeout } = await this.buildRequest(options, {
            retryCount: maxRetries - retriesRemaining,
        });
        /** Not an API request ID, just for correlating local log entries. */
        const requestLogID = 'log_' + ((Math.random() * (1 << 24)) | 0).toString(16).padStart(6, '0');
        const retryLogStr = retryOfRequestLogID === undefined ? '' : `, retryOf: ${retryOfRequestLogID}`;
        const startTime = Date.now();
        if (options.signal?.aborted) {
            throw new core_error/* APIUserAbortError */.cH();
        }
        const controller = new AbortController();
        const response = await this.fetchWithTimeout(url, req, timeout, controller, options, {
            requestLogID,
            retryOfRequestLogID,
        }).catch(errors/* castToError */.r);
        const headersTime = Date.now();
        if (response instanceof globalThis.Error) {
            releaseRequestSignal(controller);
            const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
            if (options.signal?.aborted) {
                throw new core_error/* APIUserAbortError */.cH();
            }
            // detect native connection timeout errors
            // deno throws "TypeError: error sending request for url (https://example/): client error (Connect): tcp connect error: Operation timed out (os error 60): Operation timed out (os error 60)"
            // undici throws "TypeError: fetch failed" with cause "ConnectTimeoutError: Connect Timeout Error (attempted address: example:443, timeout: 1ms)"
            // others do not provide enough information to distinguish timeouts from other connection errors
            const isTimeout = (0,errors/* isAbortError */.z)(response) ||
                /timed? ?out/i.test(String(response) + ('cause' in response ? String(response.cause) : ''));
            // Errors thrown by middleware (user middleware and the backend adaptation
            // alike) propagate to the caller as-is — no retries, no APIConnectionError
            // wrapping — except retryable errors (timeouts/aborts, APIConnectionErrors,
            // and RetryableErrors, directly or in the `cause` chain), which stay on the
            // retry path.
            const hasMiddleware = this.middleware.length > 0 || !!options.middleware?.length || this.backendMiddleware().length > 0;
            if (hasMiddleware && !isTimeout && !isRetryableError(response)) {
                (0,utils_log/* loggerFor */.WG)(this).info(`[${requestLogID}] middleware error (not retryable)`);
                (0,utils_log/* loggerFor */.WG)(this).debug(`[${requestLogID}] middleware error (not retryable)`, (0,utils_log/* formatRequestDetails */.xL)({
                    retryOfRequestLogID,
                    url,
                    durationMs: headersTime - startTime,
                    message: response.message,
                }));
                throw response;
            }
            if (retriesRemaining) {
                (0,utils_log/* loggerFor */.WG)(this).info(`[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} - ${retryMessage}`);
                (0,utils_log/* loggerFor */.WG)(this).debug(`[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} (${retryMessage})`, (0,utils_log/* formatRequestDetails */.xL)({
                    retryOfRequestLogID,
                    url,
                    durationMs: headersTime - startTime,
                    message: response.message,
                }));
                return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID);
            }
            (0,utils_log/* loggerFor */.WG)(this).info(`[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} - error; no more retries left`);
            (0,utils_log/* loggerFor */.WG)(this).debug(`[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} (error; no more retries left)`, (0,utils_log/* formatRequestDetails */.xL)({
                retryOfRequestLogID,
                url,
                durationMs: headersTime - startTime,
                message: response.message,
            }));
            if (isTimeout) {
                throw new core_error/* APIConnectionTimeoutError */.qA();
            }
            // a retryable middleware-origin error is still the caller's error: once retries are
            // exhausted it propagates as-is rather than wrapped in APIConnectionError
            if (hasMiddleware && !isFetchOriginError(response)) {
                throw response;
            }
            throw new core_error/* APIConnectionError */.xX({ cause: response });
        }
        const specialHeaders = [...response.headers.entries()]
            .filter(([name]) => name === 'request-id' || name === 'anthropic-workspace-id')
            .map(([name, value]) => ', ' + name + ': ' + JSON.stringify(value))
            .join('');
        const responseInfo = `[${requestLogID}${retryLogStr}${specialHeaders}] ${req.method} ${url} ${response.ok ? 'succeeded' : 'failed'} with status ${response.status} in ${headersTime - startTime}ms`;
        if (!response.ok) {
            const shouldRetry = await this.shouldRetry(response, options);
            if (retriesRemaining && shouldRetry) {
                const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
                // We don't need the body of this response.
                await CancelReadableStream(response.body);
                releaseRequestSignal(controller);
                (0,utils_log/* loggerFor */.WG)(this).info(`${responseInfo} - ${retryMessage}`);
                (0,utils_log/* loggerFor */.WG)(this).debug(`[${requestLogID}] response error (${retryMessage})`, (0,utils_log/* formatRequestDetails */.xL)({
                    retryOfRequestLogID,
                    url: response.url,
                    status: response.status,
                    headers: response.headers,
                    durationMs: headersTime - startTime,
                }));
                return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID, response.headers);
            }
            const retryMessage = shouldRetry ? `error; no more retries left` : `error; not retryable`;
            (0,utils_log/* loggerFor */.WG)(this).info(`${responseInfo} - ${retryMessage}`);
            const errText = await response.text().catch((err) => (0,errors/* castToError */.r)(err).message);
            const errJSON = (0,utils_values/* safeJSON */.ml)(errText);
            const errMessage = errJSON ? undefined : errText;
            (0,utils_log/* loggerFor */.WG)(this).debug(`[${requestLogID}] response error (${retryMessage})`, (0,utils_log/* formatRequestDetails */.xL)({
                retryOfRequestLogID,
                url: response.url,
                status: response.status,
                headers: response.headers,
                message: errMessage,
                durationMs: Date.now() - startTime,
            }));
            releaseRequestSignal(controller);
            const err = this.makeStatusError(response.status, errJSON, errMessage, response.headers);
            throw err;
        }
        (0,utils_log/* loggerFor */.WG)(this).info(responseInfo);
        (0,utils_log/* loggerFor */.WG)(this).debug(`[${requestLogID}] response start`, (0,utils_log/* formatRequestDetails */.xL)({
            retryOfRequestLogID,
            url: response.url,
            status: response.status,
            headers: response.headers,
            durationMs: headersTime - startTime,
        }));
        armAbandonmentBackstop(response.body ?? response, controller);
        return { response, options, controller, requestLogID, retryOfRequestLogID, startTime };
    }
    getAPIList(path, Page, opts) {
        return this.requestAPIList(Page, opts && 'then' in opts ?
            opts.then((opts) => ({ method: 'get', path, ...opts }))
            : { method: 'get', path, ...opts });
    }
    requestAPIList(Page, options) {
        const request = this.makeRequest(options, null, undefined);
        return new PagePromise(this, request, Page);
    }
    async fetchWithTimeout(url, init, ms, controller, requestOptions, logCtx) {
        const { signal, method, ...options } = init || {};
        // Avoid creating a closure over `this`, `init`, or `options` to prevent memory leaks.
        // An arrow function like `() => controller.abort()` captures the surrounding scope,
        // which includes the request body and other large objects. When the user passes a
        // long-lived AbortSignal, the listener prevents those objects from being GC'd for
        // the lifetime of the signal. Using `.bind()` only retains a reference to the
        // controller itself.
        const abort = this._makeAbort(controller);
        if (signal) {
            signal.addEventListener('abort', abort, { once: true });
            registerRequestSignalCleanup(controller, signal, abort);
        }
        const isReadableBody = (globalThis.ReadableStream && options.body instanceof globalThis.ReadableStream) ||
            (typeof options.body === 'object' && options.body !== null && Symbol.asyncIterator in options.body);
        const fetchOptions = {
            signal: controller.signal,
            ...(isReadableBody ? { duplex: 'half' } : {}),
            method: 'GET',
            ...options,
        };
        if (method) {
            // Custom methods like 'patch' need to be uppercased
            // See https://github.com/nodejs/undici/issues/2294
            fetchOptions.method = method.toUpperCase();
        }
        // Arm the timeout around the underlying fetch only, not the middleware
        // chain — middleware can take arbitrarily long (or call `next` more than
        // once), and each inner-fetch invocation gets its own `ms` timer.
        const baseFetch = this.fetch;
        const timedFetch = async (innerUrl, innerInit) => {
            const timeout = setTimeout(abort, ms);
            try {
                return await baseFetch.call(undefined, innerUrl, innerInit);
            }
            finally {
                clearTimeout(timeout);
            }
        };
        // Prepare the request (auth signing and other `prepareRequest` hooks) as
        // the innermost step, after any middleware — including the backend
        // middleware, so it sees exactly what goes over the wire. Runs per
        // inner-fetch invocation, so a request middleware rewrote — or replayed
        // via a second `next()` call — is prepared fresh each time. Preparation is
        // outside the timeout timer, matching its pre-middleware behavior.
        const innerFetch = requestOptions === undefined ? timedFetch : (async (innerUrl, innerInit = {}) => {
            const innerUrlStr = typeof innerUrl === 'string' ? innerUrl
                : innerUrl instanceof URL ? innerUrl.href
                    : innerUrl.url;
            innerInit.headers =
                innerInit.headers instanceof Headers ? innerInit.headers : new Headers(innerInit.headers);
            await this.prepareRequest(innerInit, { url: innerUrlStr, options: requestOptions });
            if (logCtx) {
                (0,utils_log/* loggerFor */.WG)(this).debug(`[${logCtx.requestLogID}] sending request`, (0,utils_log/* formatRequestDetails */.xL)({
                    retryOfRequestLogID: logCtx.retryOfRequestLogID,
                    method: innerInit.method,
                    url: innerUrlStr,
                    options: requestOptions,
                    headers: innerInit.headers,
                }));
            }
            return timedFetch(innerUrl, innerInit);
        });
        const requestMiddleware = requestOptions?.middleware;
        const backendMiddleware = this.backendMiddleware();
        const allMiddleware = requestMiddleware?.length || backendMiddleware.length ?
            [...this.middleware, ...(requestMiddleware ?? []), ...backendMiddleware]
            : this.middleware;
        return await wrapFetchWithMiddleware(innerFetch, allMiddleware, requestOptions, this)(url, fetchOptions);
    }
    async shouldRetry(response, options) {
        // Reactive refresh: on a 401 from a request that used the token cache,
        // invalidate and retry once. Only fires when this specific request was
        // bearer-authenticated (not when an apiKey was used) and only once per
        // request — a second 401 after refresh falls through to the normal
        // retry policy below (which treats 4xx as non-retryable).
        const flags = this._authFlags(options);
        if (response.status === 401 &&
            this._authState.tokenCache &&
            flags.usedTokenCache &&
            !flags.didRefreshFor401) {
            flags.didRefreshFor401 = true;
            this._authState.tokenCache.invalidate();
            return true;
        }
        // Note this is not a standard header.
        const shouldRetryHeader = response.headers.get('x-should-retry');
        // If the server explicitly says whether or not to retry, obey.
        if (shouldRetryHeader === 'true')
            return true;
        if (shouldRetryHeader === 'false')
            return false;
        // Retry on request timeouts.
        if (response.status === 408)
            return true;
        // Retry on lock timeouts.
        if (response.status === 409)
            return true;
        // Retry on rate limits.
        if (response.status === 429)
            return true;
        // Retry internal errors.
        if (response.status >= 500)
            return true;
        return false;
    }
    async retryRequest(options, retriesRemaining, requestLogID, responseHeaders) {
        let timeoutMillis;
        // Note the `retry-after-ms` header may not be standard, but is a good idea and we'd like proactive support for it.
        const retryAfterMillisHeader = responseHeaders?.get('retry-after-ms');
        if (retryAfterMillisHeader) {
            const timeoutMs = parseFloat(retryAfterMillisHeader);
            if (!Number.isNaN(timeoutMs)) {
                timeoutMillis = timeoutMs;
            }
        }
        // About the Retry-After header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After
        const retryAfterHeader = responseHeaders?.get('retry-after');
        if (retryAfterHeader && !timeoutMillis) {
            const timeoutSeconds = parseFloat(retryAfterHeader);
            if (!Number.isNaN(timeoutSeconds)) {
                timeoutMillis = timeoutSeconds * 1000;
            }
            else {
                timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
            }
        }
        // If the API asks us to wait a certain amount of time, just do what it
        // says, but otherwise calculate a default
        if (timeoutMillis === undefined) {
            const maxRetries = options.maxRetries ?? this.maxRetries;
            timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
        }
        await sleep(timeoutMillis);
        return this.makeRequest(options, retriesRemaining - 1, requestLogID);
    }
    calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
        const initialRetryDelay = 0.5;
        const maxRetryDelay = 8.0;
        const numRetries = maxRetries - retriesRemaining;
        // Apply exponential backoff, but not more than the max.
        const sleepSeconds = Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay);
        // Apply some jitter, take up to at most 25 percent of the retry time.
        const jitter = 1 - Math.random() * 0.25;
        return sleepSeconds * jitter * 1000;
    }
    calculateNonstreamingTimeout(maxTokens, maxNonstreamingTokens) {
        const maxTime = 60 * 60 * 1000; // 60 minutes
        const defaultTime = 60 * 10 * 1000; // 10 minutes
        const expectedTime = (maxTime * maxTokens) / 128000;
        if (expectedTime > defaultTime || (maxNonstreamingTokens != null && maxTokens > maxNonstreamingTokens)) {
            throw new core_error/* AnthropicError */.pJ('Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#long-requests for more details');
        }
        return defaultTime;
    }
    async buildRequest(inputOptions, { retryCount = 0 } = {}) {
        const options = { ...inputOptions };
        const { method, path, query, defaultBaseURL } = options;
        // Lazy credential resolution may carry a profile-supplied baseURL. Await
        // it before building the request URL so the very first request — and
        // requests on withOptions() clones created before resolution settled —
        // hit the profile's host rather than the hardcoded default.
        if (this._authState.resolution) {
            await this._authState.resolution;
        }
        if (!this._baseURLIsExplicit && this._authState.baseURL && this.baseURL !== this._authState.baseURL) {
            this.baseURL = this._authState.baseURL;
        }
        const url = this.buildURL(path, query, defaultBaseURL);
        if ('timeout' in options)
            (0,utils_values/* validatePositiveInteger */.wQ)('timeout', options.timeout);
        options.timeout = options.timeout ?? this.timeout;
        const { bodyHeaders, body } = this.buildBody({ options });
        const reqHeaders = await this.buildHeaders({ options: inputOptions, method, bodyHeaders, retryCount });
        const req = {
            method,
            headers: reqHeaders,
            ...(options.signal && { signal: options.signal }),
            ...(globalThis.ReadableStream &&
                body instanceof globalThis.ReadableStream && { duplex: 'half' }),
            ...(body && { body }),
            ...(this.fetchOptions ?? {}),
            ...(options.fetchOptions ?? {}),
        };
        return { req, url, timeout: options.timeout };
    }
    async buildHeaders({ options, method, bodyHeaders, retryCount, }) {
        let idempotencyHeaders = {};
        if (this.idempotencyHeader && method !== 'get') {
            if (!options.idempotencyKey)
                options.idempotencyKey = this.defaultIdempotencyKey();
            idempotencyHeaders[this.idempotencyHeader] = options.idempotencyKey;
        }
        const headers = buildHeaders([
            idempotencyHeaders,
            {
                Accept: 'application/json',
                'User-Agent': this.getUserAgent(),
                'X-Stainless-Retry-Count': String(retryCount),
                ...(options.timeout ? { 'X-Stainless-Timeout': String(Math.trunc(options.timeout / 1000)) } : {}),
                ...getPlatformHeaders(),
                ...(this._options.dangerouslyAllowBrowser ?
                    { 'anthropic-dangerous-direct-browser-access': 'true' }
                    : undefined),
                'anthropic-version': '2023-06-01',
            },
            await this.authHeaders(options),
            this._options.defaultHeaders,
            bodyHeaders,
            options.headers,
        ]);
        this.validateHeaders(headers);
        return headers.values;
    }
    _makeAbort(controller) {
        // note: we can't just inline this method inside `fetchWithTimeout()` because then the closure
        //       would capture all request options, and cause a memory leak.
        return () => controller.abort();
    }
    buildBody({ options: { body, headers: rawHeaders } }) {
        if (!body) {
            return { bodyHeaders: undefined, body: undefined };
        }
        const headers = buildHeaders([rawHeaders]);
        if (
        // Pass raw type verbatim
        ArrayBuffer.isView(body) ||
            body instanceof ArrayBuffer ||
            body instanceof DataView ||
            (typeof body === 'string' &&
                // Preserve legacy string encoding behavior for now
                headers.values.has('content-type')) ||
            // `Blob` is superset of `File`
            (globalThis.Blob && body instanceof globalThis.Blob) ||
            // `FormData` -> `multipart/form-data`
            body instanceof FormData ||
            // `URLSearchParams` -> `application/x-www-form-urlencoded`
            body instanceof URLSearchParams ||
            // Send chunked stream (each chunk has own `length`)
            (globalThis.ReadableStream && body instanceof globalThis.ReadableStream)) {
            return { bodyHeaders: undefined, body: body };
        }
        else if (typeof body === 'object' &&
            (Symbol.asyncIterator in body ||
                (Symbol.iterator in body && 'next' in body && typeof body.next === 'function'))) {
            return { bodyHeaders: undefined, body: ReadableStreamFrom(body) };
        }
        else if (typeof body === 'object' &&
            headers.values.get('content-type') === 'application/x-www-form-urlencoded') {
            return {
                bodyHeaders: { 'content-type': 'application/x-www-form-urlencoded' },
                body: this.stringifyQuery(body),
            };
        }
        else {
            return (0,tslib/* __classPrivateFieldGet */.g)(this, _BaseAnthropic_encoder, "f").call(this, { body, headers });
        }
    }
}
_a = BaseAnthropic, _BaseAnthropic_encoder = new WeakMap(), _BaseAnthropic_instances = new WeakSet(), _BaseAnthropic_baseURLOverridden = function _BaseAnthropic_baseURLOverridden() {
    return this.baseURL !== 'https://api.anthropic.com';
};
BaseAnthropic.Anthropic = _a;
BaseAnthropic.HUMAN_PROMPT = HUMAN_PROMPT;
BaseAnthropic.AI_PROMPT = AI_PROMPT;
BaseAnthropic.DEFAULT_TIMEOUT = 600000; // 10 minutes
BaseAnthropic.AnthropicError = core_error/* AnthropicError */.pJ;
BaseAnthropic.APIError = core_error/* APIError */.LG;
BaseAnthropic.APIConnectionError = core_error/* APIConnectionError */.xX;
BaseAnthropic.APIConnectionTimeoutError = core_error/* APIConnectionTimeoutError */.qA;
BaseAnthropic.APIUserAbortError = core_error/* APIUserAbortError */.cH;
BaseAnthropic.NotFoundError = core_error/* NotFoundError */.m_;
BaseAnthropic.ConflictError = core_error/* ConflictError */.fK;
BaseAnthropic.RateLimitError = core_error/* RateLimitError */.OE;
BaseAnthropic.BadRequestError = core_error/* BadRequestError */.v7;
BaseAnthropic.AuthenticationError = core_error/* AuthenticationError */.v3;
BaseAnthropic.InternalServerError = core_error/* InternalServerError */.PO;
BaseAnthropic.PermissionDeniedError = core_error/* PermissionDeniedError */.Ll;
BaseAnthropic.UnprocessableEntityError = core_error/* UnprocessableEntityError */.Is;
BaseAnthropic.toFile = toFile;
/**
 * API Client for interfacing with the Anthropic API.
 */
class Anthropic extends BaseAnthropic {
    constructor() {
        super(...arguments);
        this.completions = new Completions(this);
        this.messages = new messages_Messages(this);
        this.models = new models_Models(this);
        this.files = new files_Files(this);
        this.skills = new skills_Skills(this);
        this.beta = new Beta(this);
    }
}
Anthropic.Completions = Completions;
Anthropic.Messages = messages_Messages;
Anthropic.Models = models_Models;
Anthropic.Files = files_Files;
Anthropic.Skills = skills_Skills;
Anthropic.Beta = Beta;
//# sourceMappingURL=client.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/lib/middleware.mjs







const encoder = new TextEncoder();
/** Betas sent by default; override with {@link BetaRefusalFallbackOptions.betas}. */
const DEFAULT_BETAS = (/* unused pure expression or super */ null && (['fallback-credit-2026-07-01']));
/**
 * Remove `fallback` blocks replayed in history. They only parse under the
 * server-side fallback beta, which belongs to the caller-owned server-side
 * `fallbacks` feature — this middleware never sends it, so a request
 * replaying them would 400. A turn the strip leaves empty is dropped whole;
 * a turn that was already empty is kept — it may carry other payload (e.g. a
 * directive-only system message's `output_config`).
 */
function stripFallbackBlocks(body) {
    const messages = body.messages.flatMap((message) => {
        if (!Array.isArray(message.content))
            return [message];
        const content = message.content.filter((block) => block.type !== 'fallback');
        if (content.length === message.content.length)
            return [message];
        return content.length > 0 ? [{ ...message, content }] : [];
    });
    return { ...body, messages };
}
/**
 * Apply one chain entry to the original request params as a patch: a field
 * set to a value overrides the original, a field explicitly `null` removes
 * the field from the retried request, and an absent (or `undefined`) field
 * keeps the original value. `output_config` patches one level deep — its
 * subfields follow the same set/`null`/absent rules against the original
 * `output_config` (created if the entry sets any subfield). Every hop patches
 * the original params — never a previous hop's patched body — and `body` is
 * never mutated.
 */
function applyFallbackPatch(body, entry) {
    const patched = { ...body };
    for (const [key, value] of Object.entries(entry)) {
        if (key === 'output_config' && value != null) {
            const merged = { ...(patched[key] ?? {}) };
            for (const [subKey, subValue] of Object.entries(value)) {
                patchField(merged, subKey, subValue);
            }
            patchField(patched, key, Object.keys(merged).length ? merged : null);
        }
        else {
            patchField(patched, key, value);
        }
    }
    return patched;
}
/** Set/`null`-unset/absent-keep one field on `target` (mutated). */
function patchField(target, key, value) {
    if (value === undefined)
        return;
    if (value === null) {
        delete target[key];
    }
    else {
        target[key] = value;
    }
}
/**
 * Middleware that retries refused `/v1/messages` requests down a fallback chain.
 *
 * Non-streaming: when a response comes back with `stop_reason: 'refusal'`, the
 * request is retried with each entry of `fallbacks` applied as a patch to the
 * original params (a set field overrides, an explicit `null` unsets, an absent
 * field keeps the original value; entries never patch each other's requests)
 * — passing along the refusal's `fallback_credit_token` — until a model
 * accepts or the chain is exhausted. A message served by a fallback carries a
 * `fallback` content block prepended at each model boundary — the same seam
 * block shape the server-side `fallbacks` param places in `content`, though
 * the rest of the envelope is the serving hop's as returned (see the
 * known-divergences note below); an exhausted chain surfaces the final
 * refusal verbatim.
 *
 * Streaming: when the stream ends in `stop_reason: 'refusal'`, a second
 * request is issued to the fallback model — carrying the refused model's
 * partial output as a trailing assistant prefill when the refusal grants one
 * (`fallback_has_prefill_claim`), plus the refusal's `fallback_credit_token`
 * — and the fallback's events are spliced onto the
 * still-open stream, so the client sees one continuous message in the
 * server-side `fallbacks` wire shape: a `fallback` content block at each model
 * boundary, monotonic block indices, and per-hop `usage.iterations` on the
 * final `message_delta`. Only `model` is honored from each entry on this path:
 * the credit token is redeemable only against the refused request's body, so
 * the other per-entry overrides (`max_tokens`, `thinking`, ...) would be
 * rejected.
 *
 * The fallback-credit beta the credit tokens require is sent by default on
 * every request the middleware handles; the `betas` option controls this.
 *
 * In both modes a fallback that itself refuses with a fresh credit token
 * continues down the chain. A streaming fallback whose prefill the server
 * rejects (HTTP 400) is retried once without it; a fallback whose request
 * fails outright is skipped — its token was never redeemed, so it carries to
 * the next entry.
 *
 * To keep later requests on the model that accepted, pass a
 * {@link BetaFallbackState} via the `fallbackState` request option; requests
 * sharing that state start directly at the pinned fallback. Reuse one state
 * across whatever scope the pin should apply to — typically a conversation.
 *
 * @example
 * ```ts
 * const client = new Anthropic({
 *   middleware: [betaRefusalFallbackMiddleware([{ model: 'claude-opus-4-8' }])],
 * });
 *
 * const fallbackState = new BetaFallbackState();
 * const message = await client.beta.messages.create(params, { fallbackState });
 * ```
 */
function betaRefusalFallbackMiddleware(fallbacks, options = {}) {
    let warnedMissingState = false;
    return async (request, next, ctx) => {
        // This middleware only applies to the beta messages API
        // (`client.beta.messages`, which posts to `/v1/messages?beta=true`).
        // An empty chain also disables this middleware.
        const [path, query] = (ctx.options?.path ?? '').split('?');
        if (fallbacks.length === 0 ||
            ctx.options?.method !== 'post' ||
            path !== '/v1/messages' ||
            new URLSearchParams(query).get('beta') !== 'true' ||
            typeof ctx.options.body !== 'object' ||
            ctx.options.body == null) {
            return next(request);
        }
        if (ctx.options.body.fallbacks != null) {
            throw new AnthropicError('Sending the `fallbacks:` request param is not supported when using the `betaRefusalFallbackMiddleware`. ' +
                'You should either remove the middleware and send `fallbacks:` with the `server-side-fallback-2026-07-01` beta header to let the API handle refusal fallbacks, ' +
                "or omit the `fallbacks:` param if you'd like `betaRefusalFallbackMiddleware` to handle fallbacks on the client side.");
        }
        const onError = options.onError ??
            ((error) => ctx.logger.error(`anthropic-sdk: betaRefusalFallbackMiddleware: ${error.message}`));
        // Send the configured betas on this and every hop request derived from it,
        // and tag this and every hop with the middleware's helper telemetry.
        request = withMiddlewareHeaders(request, options.betas ?? DEFAULT_BETAS);
        const body = stripFallbackBlocks(ctx.options.body);
        const state = ctx.options.fallbackState;
        // start from the pinned fallback (-1 = the original params)
        const startIndex = state?.index ?? -1;
        if (!Number.isInteger(startIndex) || startIndex < -1 || startIndex >= fallbacks.length) {
            throw new AnthropicError(`fallbackState.index ${startIndex} is out of bounds for a chain of ${fallbacks.length} fallback(s); was the state shared with a different middleware?`);
        }
        // pin requests sharing the state to the entry being tried
        const pin = (index) => {
            if (state) {
                state.index = index;
            }
            else if (!warnedMissingState) {
                warnedMissingState = true;
                ctx.logger.warn('anthropic-sdk: betaRefusalFallbackMiddleware fell back without a `fallbackState` request option; follow-up requests will retry models that already refused. Pass a shared `{ fallbackState: new BetaFallbackState() }` to pin them to the accepted model.');
            }
        };
        const initialBody = startIndex === -1 ? body : applyFallbackPatch(body, fallbacks[startIndex]);
        // a non-string body can't be respliced or redeemed against — leave the
        // request untouched (the streaming path stands down on it below too)
        const initialRequest = typeof request.body !== 'string' ? request : { ...request, body: JSON.stringify(initialBody) };
        const response = await next(initialRequest);
        if (!response.ok) {
            return response;
        }
        if (ctx.options.stream === true) {
            const firstHop = startIndex + 1;
            // Splicing needs at least one entry left to hop to and the JSON request
            // body the credit token is redeemable against (an earlier middleware
            // may have rewritten it to another BodyInit); otherwise the stream
            // passes through untouched.
            if (firstHop >= fallbacks.length || typeof initialRequest.body !== 'string') {
                return response;
            }
            return spliceFallbackStream({
                request: initialRequest,
                response,
                next,
                ctx,
                fallbacks,
                firstHop,
                onError,
                pin,
            });
        }
        let index = startIndex;
        let res = response;
        // The model the current hop was requested as — the caller's spelling, not
        // the server's `message.model` echo; the seam block's `from` carries it.
        let requestedModel = initialBody.model;
        const fallbackBlocks = [];
        while (index < fallbacks.length - 1) {
            const message = await ctx.parse(res);
            if (message?.type !== 'message' || message.stop_reason !== 'refusal') {
                break;
            }
            index += 1;
            pin(index);
            const entry = fallbacks[index];
            // One `fallback` seam block per model boundary, prepended to the serving
            // hop's content below — the same block shape the server places in
            // `content`, not a claim of full envelope parity.
            fallbackBlocks.push({
                type: 'fallback',
                // `requestedModel` is always set for a typed body; the `??` defends
                // against an untyped body that carried no `model` field.
                from: { model: requestedModel ?? message.model },
                to: { model: entry.model },
                trigger: { type: 'refusal', category: message.stop_details?.category ?? null },
            });
            requestedModel = entry.model;
            res = await next({
                ...request,
                body: JSON.stringify({
                    ...applyFallbackPatch(body, entry),
                    ...(message.stop_details?.fallback_credit_token ?
                        { fallback_credit_token: creditTokenParam(message.stop_details.fallback_credit_token) }
                        : undefined),
                }),
            });
        }
        if (fallbackBlocks.length === 0) {
            return res;
        }
        const served = await ctx.parse(res);
        // Chain exhausted on a refusal (or an error/malformed body): surface it
        // verbatim. The array guard keeps a message-shaped body with non-array
        // `content` from throwing at the spread below.
        if (served?.type !== 'message' || served.stop_reason === 'refusal' || !Array.isArray(served.content)) {
            return res;
        }
        // A fallback hop served (or exhausted the chain with output): prepend the
        // seam blocks so the app-visible `content` opens with one `fallback` block
        // per model boundary. Response init is preserved (same `_request_id`);
        // `content-length` is dropped since the body grew.
        const headers = new Headers(res.headers);
        headers.delete('content-length');
        return new Response(JSON.stringify({ ...served, content: [...fallbackBlocks, ...served.content] }), {
            status: res.status,
            statusText: res.statusText,
            headers,
        });
    };
}
/**
 * Wrap stream A in a response whose body passes events through until a
 * retryable refusal, then splices the fallback chain's events on (see
 * {@link splicedEvents}). Cancelling the returned body tears down whichever
 * stream is being read and aborts any in-flight fallback request or retry
 * backoff: hop requests run under `controller`'s signal, which fires on
 * cancel and mirrors the original request's signal — a user abort has no
 * other way to reach a hop, since this synthetic body isn't fetch-backed.
 */
function spliceFallbackStream(args) {
    const controller = new AbortController();
    const signal = args.request.signal;
    if (signal?.aborted) {
        controller.abort(signal.reason);
    }
    else {
        signal?.addEventListener('abort', makeAbort(controller, signal), { once: true });
    }
    const iter = splicedEvents(args, controller);
    const body = new ReadableStream({
        async pull(ctrl) {
            try {
                const { value, done } = await iter.next();
                if (done)
                    return ctrl.close();
                ctrl.enqueue(value);
            }
            catch (err) {
                ctrl.error(err);
            }
        },
        async cancel() {
            controller.abort();
            await iter.return?.(undefined);
        },
    });
    return new Response(body, args.response);
}
async function* splicedEvents({ request, response, next, ctx, fallbacks, firstHop, onError, pin }, controller) {
    // --- stream A: pass through until a chainable refusal ---
    const a = yield* consumeHop({
        response,
        controller,
        indexBase: 0,
        hasNext: true, // the caller guarantees firstHop < fallbacks.length
        onError,
        splice: null,
    });
    if (!a.refused)
        return; // non-refusal or not-retryable: pure pass-through.
    // --- fallback chain: try each entry in order ---
    // `base` is the assistant-turn content the current token's request already
    // carried — the token is redeemable only with it resent verbatim. `partial`
    // is the newest refused hop's output, included only when its refusal
    // granted a prefill claim (any other change to the body is a 400).
    let nextIndex = a.nextIndex; // monotonic block index across all spliced streams
    let token = a.refused.token;
    let base = [];
    let partial = a.refused.hasPrefillClaim ? toPrefillBlocks(a.blocks) : [];
    let fromModel = a.model ?? '';
    let lastUsage = a.refused.usage;
    // The refusal whose token is currently in flight — surfaced verbatim (with a
    // recommended_model added) if every fallback request fails and we degrade.
    let refusalDetails = a.refused.stopDetails;
    // That refused hop's suppressed message_start `input_transformations`, which
    // ride on the surfaced refusal delta (none for A: its start reached the client).
    let refusalInputTransformations = a.refused.inputTransformations;
    // One `message` entry per refused hop, in order — A first. Failed hops are
    // skipped (no usage came back); the serving hop is appended as
    // `fallback_message` when its message_delta arrives.
    const iterations = [
        toIterationUsage('message', a.model ?? '', a.refused.usage),
    ];
    for (let hop = firstHop; hop < fallbacks.length; hop++) {
        const model = fallbacks[hop].model;
        const hasNext = hop + 1 < fallbacks.length;
        pin(hop);
        // --- boundary: a `fallback` content block at the next monotonic index ---
        // Emitted before the request, so a hop that fails leaves its boundary in
        // place and the next attempt emits its own (still `from: fromModel` — the
        // last model that contributed output).
        const fbIndex = nextIndex++;
        yield emit('content_block_start', {
            type: 'content_block_start',
            index: fbIndex,
            content_block: {
                type: 'fallback',
                from: { model: fromModel },
                to: { model },
                trigger: { type: 'refusal', category: refusalDetails?.category ?? null },
            },
        });
        yield emit('content_block_stop', {
            type: 'content_block_stop',
            index: fbIndex,
        });
        // --- build the request: appended-assistant continuation ---
        // First attempt carries the newest partial appended (when its refusal
        // granted a prefill claim); a 400 on that form means the server rejected
        // the prefill, so the hop is retried once without it — the same-body
        // form the token always supports.
        let continuation = [...base, ...partial];
        let resB = null;
        let failure = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            const reqB = buildFallbackRequest(request, { model, creditToken: token, continuation });
            // controller mirrors the original signal and additionally fires when the
            // spliced body is cancelled — either must abort an in-flight hop request.
            reqB.signal = controller.signal;
            try {
                resB = await next(reqB);
            }
            catch (err) {
                // the consumer cancelled (or the original request was aborted): unwind
                if (isAbortError(err))
                    throw err;
                failure = {
                    kind: 'request_failed',
                    message: `fallback request failed: ${err}`,
                    model,
                    status: null,
                    detail: err,
                };
                break;
            }
            if (resB.ok)
                break;
            // ctx.parse reads through an internal clone, so it works even though
            // the client will also read this body; resB.text() would conflict.
            const errBody = await ctx.parse(resB).catch(() => null);
            if (attempt === 0 && resB.status === 400 && partial.length) {
                ctx.logger.warn(`anthropic-sdk: betaRefusalFallbackMiddleware: fallback request with the partial output appended was rejected (HTTP 400: ${JSON.stringify(errBody)}); retrying without it`);
                continuation = base;
                resB = null;
                continue;
            }
            failure = {
                kind: 'request_failed',
                message: `fallback request failed: HTTP ${resB.status}: ${JSON.stringify(errBody)}`,
                model,
                status: resB.status,
                detail: errBody,
            };
            break;
        }
        if (failure) {
            onError(failure);
            // The token was never redeemed — retry it against the next entry.
            if (hasNext)
                continue;
            // Surface the held refusal verbatim — its category/explanation and the
            // still-unredeemed credit token — and point recommended_model at the hop
            // we last tried.
            const stopDetails = {
                ...refusalDetails,
                recommended_model: model,
            };
            yield emit('message_delta', {
                type: 'message_delta',
                context_management: null,
                delta: {
                    stop_reason: 'refusal',
                    stop_sequence: null,
                    container: null,
                    stop_details: stopDetails,
                },
                usage: (lastUsage ?? {}),
                ...(refusalInputTransformations !== undefined && {
                    input_transformations: refusalInputTransformations,
                }),
            });
            yield emit('message_stop', { type: 'message_stop' });
            return;
        }
        // --- splice: monotonic indices, suppressed message_start, usage.iterations ---
        const b = yield* consumeHop({
            response: resB,
            controller,
            indexBase: nextIndex,
            hasNext,
            onError,
            splice: { iterations, model },
        });
        if (!b.refused)
            return;
        // This hop refused too, with a fresh token: its emitted partial stays in
        // the client's message, becomes the next partial segment, and the chain
        // continues.
        token = b.refused.token;
        refusalDetails = b.refused.stopDetails;
        refusalInputTransformations = b.refused.inputTransformations;
        base = continuation;
        partial = b.refused.hasPrefillClaim ? toPrefillBlocks(b.blocks) : [];
        iterations.push(toIterationUsage('message', model, b.refused.usage));
        lastUsage = b.refused.usage;
        fromModel = model;
        nextIndex = b.nextIndex;
    }
}
/**
 * Consume one hop's SSE events, forwarding them to the client while
 * accumulating its content blocks (returned in the outcome).
 *
 * Stream A (`splice: null`) is forwarded in its original wire bytes; a
 * spliced hop (`splice` set) has its message_start suppressed (the client
 * already saw A's), its block indices shifted by `indexBase`, and its
 * terminal message_delta's usage rewritten to the `usage.iterations`
 * chain shape, with the suppressed message_start's `input_transformations`
 * forwarded onto it.
 *
 * A refusal that can be chained — it carries a `fallback_credit_token` and a
 * fallback entry remains — ends the hop early: open blocks are closed, the
 * terminal message_delta + message_stop are suppressed, and the token+usage
 * are returned so the caller can issue the next hop. Any other refusal is
 * reported through `onError` and passes through to the client.
 */
async function* consumeHop(args) {
    const { response, controller, indexBase, hasNext, onError, splice } = args;
    const tracker = new BlockTracker(indexBase);
    let model;
    let startUsage = null;
    // A spliced hop's message_start is suppressed, so its `input_transformations`
    // must ride on the re-emitted terminal message_delta — the way a server-side
    // fallback reports the serving model's list.
    let startInputTransformations;
    for await (const sse of Stream.rawEvents(response, controller)) {
        const p = safeJSON(sse.data);
        switch (p?.type) {
            case 'message_start': {
                model = p.message.model;
                startUsage = p.message.usage;
                if ('input_transformations' in p.message)
                    startInputTransformations = p.message.input_transformations;
                if (splice)
                    continue;
                break;
            }
            case 'content_block_start': {
                tracker.start(p);
                if (splice) {
                    yield emit(p.type, p);
                    continue;
                }
                break;
            }
            case 'content_block_delta': {
                tracker.delta(p);
                if (splice) {
                    yield emit(p.type, p);
                    continue;
                }
                break;
            }
            case 'content_block_stop': {
                tracker.stop(p);
                if (splice) {
                    yield emit(p.type, p);
                    continue;
                }
                break;
            }
            case 'message_delta': {
                if (p.delta.stop_reason === 'refusal') {
                    // `fallback_credit_token` is null when the refusal isn't eligible
                    // for a fallback credit; without one we don't retry.
                    const details = p.delta.stop_details?.type === 'refusal' ? p.delta.stop_details : null;
                    if (details?.fallback_credit_token && hasNext) {
                        const usage = backfill(p.usage, startUsage);
                        yield* tracker.closeOpenBlocks();
                        // suppress this hop's message_delta + message_stop
                        return {
                            refused: {
                                token: details.fallback_credit_token,
                                hasPrefillClaim: details.fallback_has_prefill_claim === true,
                                usage,
                                stopDetails: details,
                                inputTransformations: splice ? startInputTransformations : undefined,
                            },
                            model,
                            blocks: tracker.contentBlocks(),
                            nextIndex: tracker.nextIndex,
                        };
                    }
                    if (!details?.fallback_credit_token) {
                        onError({
                            kind: 'no_credit_token',
                            message: 'refusal stop_details has no fallback_credit_token',
                            event: p,
                        });
                    }
                    else {
                        onError({
                            kind: 'chain_exhausted',
                            message: 'refusal but no fallback entries remain',
                            event: p,
                        });
                    }
                }
                if (splice) {
                    // Terminal hop. Replace iterations, don't append: this hop's own
                    // message_delta self-reports a single `{type:"message",
                    // model:undefined}` iteration (a fresh non-fallback request counts
                    // itself as one message hop). Server-side `fallbacks` relabels the
                    // whole chain instead — refused hops as `message`, the serving hop
                    // as `fallback_message` — so spreading the self-report would
                    // prepend a spurious `message:undefined` entry.
                    const usage = backfill(p.usage, startUsage);
                    usage.iterations = [
                        ...splice.iterations,
                        toIterationUsage('fallback_message', splice.model, usage),
                    ];
                    p.usage = usage;
                    if (!('input_transformations' in p) && startInputTransformations !== undefined) {
                        p.input_transformations = startInputTransformations;
                    }
                    yield emit('message_delta', p);
                    continue;
                }
                break;
            }
        }
        // message_stop, ping, error, unrecognised — and for stream A every
        // event — pass through in their original wire bytes.
        yield passthroughSSE(sse);
    }
    return { refused: null, model, blocks: tracker.contentBlocks(), nextIndex: tracker.nextIndex };
}
/**
 * Block bookkeeping for one stream of the splice: accumulates each content
 * block from its deltas (for the continuation prefill), shifts wire indices
 * by `indexBase` so they stay monotonic across hops, and tracks which blocks
 * are still open so a refusal that cuts mid-block can close them.
 */
class BlockTracker {
    constructor(indexBase = 0) {
        this.indexBase = indexBase;
        /** The stream's accumulated blocks keyed by their original wire index. */
        this.blocks = [];
        /** Shifted indices of blocks started but not yet stopped. */
        this.open = [];
        this.nextIndex = indexBase;
    }
    /** The accumulated content blocks, in start order. */
    contentBlocks() {
        return this.blocks.map((b) => b.block);
    }
    /** Track a content_block_start, shifting `event.index`. */
    start(event) {
        this.blocks.push({ index: event.index, block: { ...event.content_block } });
        event.index += this.indexBase;
        this.open.push(event.index);
        this.nextIndex = Math.max(this.nextIndex, event.index + 1);
    }
    /** Apply a content_block_delta to its accumulating block, shifting `event.index`. */
    delta(event) {
        applyDelta(this.blocks, event.index, event.delta);
        event.index += this.indexBase;
    }
    /** Track a content_block_stop, shifting `event.index`. */
    stop(event) {
        event.index += this.indexBase;
        const i = this.open.indexOf(event.index);
        if (i !== -1)
            this.open.splice(i, 1);
        this.nextIndex = Math.max(this.nextIndex, event.index + 1);
    }
    /** content_block_stop events for any blocks still open. */
    *closeOpenBlocks() {
        for (const index of this.open) {
            yield emit('content_block_stop', {
                type: 'content_block_stop',
                index,
            });
        }
        this.open.length = 0;
    }
}
// --- fallback request construction (appended-assistant continuation) -------
/**
 * Object form of the redeemed credit token. `best_effort` keeps the retry
 * served if the token layer rejects it — the retry then proceeds at normal
 * price and the outcome lands on `usage.fallback_credit` — where the
 * bare-string (`strict`) form would 400 the whole request.
 */
function creditTokenParam(token) {
    return { token, mode: 'best_effort' };
}
function buildFallbackRequest(orig, { model, creditToken, continuation, }) {
    // the caller guarantees a JSON string body (checked before stream A is read)
    const body = JSON.parse(orig.body);
    body.model = model;
    body.fallback_credit_token = creditTokenParam(creditToken);
    // Append the continuation (decided by the chain loop) as a trailing
    // assistant turn; everything else must stay identical to the refused
    // request. When the refusal granted no prefill claim, omit the turn
    // entirely and send the same-body form.
    if (continuation.length) {
        body.messages = [...body.messages, { role: 'assistant', content: continuation }];
    }
    // Do NOT touch max_tokens (or any other render-shaping field): the token is
    // only redeemable against the same request body as the refused request —
    // model, fallback_credit_token, and the one appended assistant turn are the
    // only permitted deltas; anything else is a 400 ("request body ... does not
    // match the original refused request"). This is also why the per-entry
    // BetaFallbackParam overrides are ignored on the streaming path.
    return { ...orig, headers: new Headers(orig.headers), body: JSON.stringify(body) };
}
// --- block accumulation & prefill conversion -------------------------------
/** Apply a content_block_delta to the accumulating block at `index`. */
function applyDelta(blocks, index, delta) {
    const block = blocks.find((x) => x.index === index)?.block;
    if (!block)
        return;
    switch (delta.type) {
        case 'text_delta': {
            block.text = (block.text ?? '') + delta.text;
            break;
        }
        case 'input_json_delta': {
            block._partial_json = (block._partial_json ?? '') + delta.partial_json;
            break;
        }
        case 'citations_delta':
            (block.citations ?? (block.citations = [])).push(delta.citation);
            break;
        case 'thinking_delta': {
            block.thinking = (block.thinking ?? '') + delta.thinking;
            break;
        }
        case 'signature_delta': {
            block.signature = delta.signature;
            break;
        }
        case 'compaction_delta': {
            break;
        }
        default:
            ((_) => { })(delta);
    }
}
/**
 * Convert a hop's accumulated response blocks to the appended assistant turn,
 * as-is: a `fallback_has_prefill_claim` refusal guarantees the partial output
 * is resendable verbatim, so no client-side filtering is applied. The only
 * rewrite is reassembling tool inputs from their accumulated
 * `input_json_delta` JSON (content_block_start carries `input: {}`).
 */
function toPrefillBlocks(responseBlocks) {
    return responseBlocks.map((b) => {
        if (typeof b?._partial_json !== 'string')
            return b;
        const { _partial_json, ...block } = b;
        return { ...block, input: safeJSON(_partial_json) ?? block.input };
    });
}
// --- helpers --------------------------------------------------------------
/**
 * A copy of `request` with `betas` appended to its `anthropic-beta` header,
 * skipping values already present (set by the caller or another middleware).
 */
function withMiddlewareHeaders(request, betas) {
    const headers = new Headers(request.headers);
    const existing = new Set(headers
        .get('anthropic-beta')
        ?.split(',')
        .map((s) => s.trim()));
    for (const beta of betas) {
        if (!existing.has(beta)) {
            headers.append('anthropic-beta', beta);
            existing.add(beta);
        }
    }
    headers.set(STAINLESS_HELPER_HEADER, appendHeaderValue(headers.get(STAINLESS_HELPER_HEADER), 'fallback-refusal-middleware'));
    return { ...request, headers };
}
function emit(event, payload) {
    const sse = { event, data: JSON.stringify(payload), raw: [] };
    return encoder.encode(serializeSSE(sse));
}
/**
 * Forward a decoded event in its original wire bytes, preserving SSE fields
 * the decoder doesn't model (`id:`, `retry:`, comment lines). Falls back to
 * re-serializing for events with no raw lines.
 */
function passthroughSSE(sse) {
    return encoder.encode(sse.raw.length ? sse.raw.join('\n') + '\n\n' : serializeSSE(sse));
}
function toIterationUsage(type, model, u) {
    return {
        type,
        model,
        input_tokens: u?.input_tokens ?? 0,
        output_tokens: u?.output_tokens ?? 0,
        cache_read_input_tokens: u?.cache_read_input_tokens ?? 0,
        cache_creation_input_tokens: u?.cache_creation_input_tokens ?? 0,
        cache_creation: u?.cache_creation ?? null,
    };
}
/** Fill null/undefined fields on `primary` from `fallback`. */
function backfill(primary, fallback) {
    const out = { ...(fallback ?? {}), ...(primary ?? {}) };
    for (const k of Object.keys(out)) {
        if (out[k] == null && fallback?.[k] != null)
            out[k] = fallback[k];
    }
    return out;
}
/**
 * Serialize a {@link ServerSentEvent} back to its SSE wire form
 * (`event: ...\ndata: ...\n\n`). Multi-line `data` is emitted as one
 * `data:` line per line, matching the spec. The inverse of the decoder
 * behind {@link Stream.rawEvents}.
 */
function serializeSSE(sse) {
    let out = '';
    if (sse.event !== null)
        out += `event: ${sse.event}\n`;
    for (const line of sse.data.split('\n'))
        out += `data: ${line}\n`;
    return out + '\n';
}
function makeAbort(controller, signal) {
    return () => controller.abort(signal.reason);
}
//# sourceMappingURL=middleware.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/index.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.







//# sourceMappingURL=index.mjs.map

/***/ }),

/***/ 79355:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   r: () => (/* binding */ castToError),
/* harmony export */   z: () => (/* binding */ isAbortError)
/* harmony export */ });
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
function isAbortError(err) {
    return (typeof err === 'object' &&
        err !== null &&
        // Spec-compliant fetch implementations
        (('name' in err && err.name === 'AbortError') ||
            // Expo fetch
            ('message' in err && String(err.message).includes('FetchRequestCanceledException'))));
}
const castToError = (err) => {
    if (err instanceof Error)
        return err;
    if (typeof err === 'object' && err !== null) {
        try {
            const tag = Object.prototype.toString.call(err);
            // cross-realm errors (e.g. undici's abort `DOMException` under jest) fail `instanceof Error`
            if (tag === '[object Error]' || tag === '[object DOMException]') {
                // @ts-ignore - not all envs have native support for cause yet
                const error = new Error(err.message, err.cause ? { cause: err.cause } : {});
                if (err.stack)
                    error.stack = err.stack;
                // @ts-ignore - not all envs have native support for cause yet
                if (err.cause && !error.cause)
                    error.cause = err.cause;
                if (err.name)
                    error.name = err.name;
                return error;
            }
        }
        catch { }
        try {
            return new Error(JSON.stringify(err));
        }
        catch { }
    }
    return new Error(err);
};
//# sourceMappingURL=errors.mjs.map

/***/ }),

/***/ 30431:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   G: () => (/* binding */ __classPrivateFieldSet),
/* harmony export */   g: () => (/* binding */ __classPrivateFieldGet)
/* harmony export */ });
function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m")
        throw new TypeError("Private method is not writable");
    if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return kind === "a" ? f.call(receiver, value) : f ? (f.value = value) : state.set(receiver, value), value;
}
function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}



/***/ }),

/***/ 83280:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   sx: () => (/* reexport safe */ _utils_env_mjs__WEBPACK_IMPORTED_MODULE_2__.s)
/* harmony export */ });
/* harmony import */ var _utils_values_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(89865);
/* harmony import */ var _utils_base64_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(14718);
/* harmony import */ var _utils_env_mjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(44424);
/* harmony import */ var _utils_log_mjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(62323);
/* harmony import */ var _utils_query_mjs__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(96706);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.







//# sourceMappingURL=utils.mjs.map

/***/ }),

/***/ 42657:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   JN: () => (/* binding */ backoff),
/* harmony export */   LX: () => (/* binding */ applyJitter),
/* harmony export */   bs: () => (/* binding */ isFatal4xx),
/* harmony export */   p$: () => (/* binding */ jitter),
/* harmony export */   zM: () => (/* binding */ isStatus)
/* harmony export */ });
/* unused harmony export is4xx */
/* harmony import */ var _core_error_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(79491);

/** True when `e` is an {@link APIError} whose HTTP status equals `code`. */
function isStatus(e, code) {
    return e instanceof _core_error_mjs__WEBPACK_IMPORTED_MODULE_0__/* .APIError */ .LG && e.status === code;
}
/** True when `e` is an {@link APIError} with a 4xx status. */
function is4xx(e) {
    return e instanceof _core_error_mjs__WEBPACK_IMPORTED_MODULE_0__/* .APIError */ .LG && typeof e.status === 'number' && e.status >= 400 && e.status < 500;
}
/**
 * True for a 4xx that the core client's retry policy would *not* retry, i.e. a
 * permanent client error. 408 (request timeout), 409 (lock timeout) and 429
 * (rate limit) are retryable for the base client (`Anthropic.shouldRetry`), so
 * they are not treated as fatal here — keeping helper retry behaviour aligned
 * with the rest of the SDK.
 */
function isFatal4xx(e) {
    return is4xx(e) && !isStatus(e, 408) && !isStatus(e, 409) && !isStatus(e, 429);
}
/** Exponential backoff: `baseMs * 2 ** attempt`, clamped to `capMs`. */
function backoff(attempt, baseMs, capMs) {
    return Math.min(baseMs * 2 ** attempt, capMs);
}
/** Uniform random delay in the half-open interval `[lowMs, highMs)`. */
function jitter(lowMs, highMs) {
    return lowMs + Math.random() * (highMs - lowMs);
}
/**
 * Trim up to 25% off `ms` at random so a fleet of clients backing off after a
 * shared outage does not retry in lockstep — mirrors the jitter the core client
 * applies to its own retry timeout.
 */
function applyJitter(ms) {
    return ms * (1 - Math.random() * 0.25);
}
//# sourceMappingURL=backoff.mjs.map

/***/ }),

/***/ 14718:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   E: () => (/* binding */ fromBase64)
/* harmony export */ });
/* unused harmony export toBase64 */
/* harmony import */ var _core_error_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(79491);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.


const toBase64 = (data) => {
    if (!data)
        return '';
    if (typeof globalThis.Buffer !== 'undefined') {
        return globalThis.Buffer.from(data).toString('base64');
    }
    if (typeof data === 'string') {
        data = encodeUTF8(data);
    }
    if (typeof btoa !== 'undefined') {
        return btoa(String.fromCharCode.apply(null, data));
    }
    throw new AnthropicError('Cannot generate base64 string; Expected `Buffer` or `btoa` to be defined');
};
const fromBase64 = (str) => {
    if (typeof globalThis.Buffer !== 'undefined') {
        const buf = globalThis.Buffer.from(str, 'base64');
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    if (typeof atob !== 'undefined') {
        const bstr = atob(str);
        const buf = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) {
            buf[i] = bstr.charCodeAt(i);
        }
        return buf;
    }
    throw new _core_error_mjs__WEBPACK_IMPORTED_MODULE_0__/* .AnthropicError */ .pJ('Cannot decode base64 string; Expected `Buffer` or `atob` to be defined');
};
//# sourceMappingURL=base64.mjs.map

/***/ }),

/***/ 57424:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CE: () => (/* binding */ decodeUTF8),
/* harmony export */   Id: () => (/* binding */ concatBytes),
/* harmony export */   YH: () => (/* binding */ encodeUTF8)
/* harmony export */ });
function concatBytes(buffers) {
    let length = 0;
    for (const buffer of buffers) {
        length += buffer.length;
    }
    const output = new Uint8Array(length);
    let index = 0;
    for (const buffer of buffers) {
        output.set(buffer, index);
        index += buffer.length;
    }
    return output;
}
let encodeUTF8_;
function encodeUTF8(str) {
    let encoder;
    return (encodeUTF8_ ??
        ((encoder = new globalThis.TextEncoder()), (encodeUTF8_ = encoder.encode.bind(encoder))))(str);
}
let decodeUTF8_;
function decodeUTF8(bytes) {
    let decoder;
    return (decodeUTF8_ ??
        ((decoder = new globalThis.TextDecoder()), (decodeUTF8_ = decoder.decode.bind(decoder))))(bytes);
}
//# sourceMappingURL=bytes.mjs.map

/***/ }),

/***/ 44424:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   s: () => (/* binding */ readEnv)
/* harmony export */ });
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
/**
 * Read an environment variable.
 *
 * Trims beginning and trailing whitespace.
 *
 * Will return undefined if the environment variable doesn't exist or cannot be accessed.
 */
const readEnv = (env) => {
    if (typeof globalThis.process !== 'undefined') {
        return globalThis.process.env?.[env]?.trim() || undefined;
    }
    if (typeof globalThis.Deno !== 'undefined') {
        return globalThis.Deno.env?.get?.(env)?.trim() || undefined;
    }
    return undefined;
};
//# sourceMappingURL=env.mjs.map

/***/ }),

/***/ 62323:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Ic: () => (/* binding */ defaultLogLevel),
/* harmony export */   ML: () => (/* binding */ parseLogLevel),
/* harmony export */   Um: () => (/* binding */ defaultLogger),
/* harmony export */   WG: () => (/* binding */ loggerFor),
/* harmony export */   xL: () => (/* binding */ formatRequestDetails)
/* harmony export */ });
/* harmony import */ var _values_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(89865);
/* harmony import */ var _env_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(44424);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.


const defaultLogLevel = 'warn';
const levelNumbers = {
    off: 0,
    error: 200,
    warn: 300,
    info: 400,
    debug: 500,
};
const parseLogLevel = (maybeLevel, sourceName, logger) => {
    if (!maybeLevel) {
        return undefined;
    }
    if ((0,_values_mjs__WEBPACK_IMPORTED_MODULE_0__/* .hasOwn */ .$3)(levelNumbers, maybeLevel)) {
        return maybeLevel;
    }
    logger.warn(`${sourceName} was set to ${JSON.stringify(maybeLevel)}, expected one of ${JSON.stringify(Object.keys(levelNumbers))}`);
    return undefined;
};
function noop() { }
function makeLogFn(fnLevel, logger, logLevel) {
    if (!logger || levelNumbers[fnLevel] > levelNumbers[logLevel]) {
        return noop;
    }
    else {
        // Don't wrap logger functions, we want the stacktrace intact!
        return logger[fnLevel].bind(logger);
    }
}
const noopLogger = {
    error: noop,
    warn: noop,
    info: noop,
    debug: noop,
};
let cachedLoggers = /* @__PURE__ */ new WeakMap();
function filterLogger(logger, logLevel) {
    const cachedLogger = cachedLoggers.get(logger);
    if (cachedLogger && cachedLogger[0] === logLevel) {
        return cachedLogger[1];
    }
    const levelLogger = {
        error: makeLogFn('error', logger, logLevel),
        warn: makeLogFn('warn', logger, logLevel),
        info: makeLogFn('info', logger, logLevel),
        debug: makeLogFn('debug', logger, logLevel),
    };
    cachedLoggers.set(logger, [logLevel, levelLogger]);
    return levelLogger;
}
function loggerFor(client) {
    const logger = client.logger;
    const logLevel = client.logLevel ?? 'off';
    if (!logger) {
        return noopLogger;
    }
    return filterLogger(logger, logLevel);
}
let lastEnvLevel;
let cachedDefaultLogger;
/**
 * A logger matching the client defaults — `console`, filtered to
 * `ANTHROPIC_LOG` or {@link defaultLogLevel} — for contexts with no client to
 * read the configured `logger`/`logLevel` from.
 *
 * Cached per `ANTHROPIC_LOG` value so an invalid value warns once, like a
 * client construction does, rather than on every request.
 */
function defaultLogger() {
    const envLevel = (0,_env_mjs__WEBPACK_IMPORTED_MODULE_1__/* .readEnv */ .s)('ANTHROPIC_LOG');
    if (!cachedDefaultLogger || envLevel !== lastEnvLevel) {
        lastEnvLevel = envLevel;
        cachedDefaultLogger = filterLogger(console, parseLogLevel(envLevel, "process.env['ANTHROPIC_LOG']", filterLogger(console, defaultLogLevel)) ??
            defaultLogLevel);
    }
    return cachedDefaultLogger;
}
const formatRequestDetails = (details) => {
    if (details.options) {
        details.options = { ...details.options };
        delete details.options['headers']; // redundant + leaks internals
    }
    if (details.headers) {
        details.headers = Object.fromEntries((details.headers instanceof Headers ? [...details.headers] : Object.entries(details.headers)).map(([name, value]) => [
            name,
            (name.toLowerCase() === 'authorization' ||
                name.toLowerCase() === 'api-key' ||
                name.toLowerCase() === 'x-api-key' ||
                name.toLowerCase() === 'cookie' ||
                name.toLowerCase() === 'set-cookie') ?
                '***'
                : value,
        ]));
    }
    if ('retryOfRequestLogID' in details) {
        if (details.retryOfRequestLogID) {
            details.retryOf = details.retryOfRequestLogID;
        }
        delete details.retryOfRequestLogID;
    }
    return details;
};
//# sourceMappingURL=log.mjs.map

/***/ }),

/***/ 45946:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   n: () => (/* binding */ promiseWithResolvers)
/* harmony export */ });
/**
 * A deferred: a `Promise` together with its `resolve` / `reject` functions.
 * This is `Promise.withResolvers()`, which is not available in all supported
 * runtimes.
 */
function promiseWithResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}
//# sourceMappingURL=promise.mjs.map

/***/ }),

/***/ 96706:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  _: () => (/* binding */ stringifyQuery)
});

;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/qs/formats.mjs
const default_format = 'RFC3986';
const default_formatter = (v) => String(v);
const formatters = {
    RFC1738: (v) => String(v).replace(/%20/g, '+'),
    RFC3986: default_formatter,
};
const RFC1738 = 'RFC1738';
const RFC3986 = 'RFC3986';
//# sourceMappingURL=formats.mjs.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/values.mjs
var utils_values = __webpack_require__(89865);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/qs/utils.mjs


let has = (obj, key) => ((has = Object.hasOwn ?? Function.prototype.call.bind(Object.prototype.hasOwnProperty)),
    has(obj, key));
const hex_table = /* @__PURE__ */ (() => {
    const array = [];
    for (let i = 0; i < 256; ++i) {
        array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
    }
    return array;
})();
function compact_queue(queue) {
    while (queue.length > 1) {
        const item = queue.pop();
        if (!item)
            continue;
        const obj = item.obj[item.prop];
        if (isArray(obj)) {
            const compacted = [];
            for (let j = 0; j < obj.length; ++j) {
                if (typeof obj[j] !== 'undefined') {
                    compacted.push(obj[j]);
                }
            }
            // @ts-ignore
            item.obj[item.prop] = compacted;
        }
    }
}
function array_to_object(source, options) {
    const obj = options && options.plainObjects ? Object.create(null) : {};
    for (let i = 0; i < source.length; ++i) {
        if (typeof source[i] !== 'undefined') {
            obj[i] = source[i];
        }
    }
    return obj;
}
function merge(target, source, options = {}) {
    if (!source) {
        return target;
    }
    if (typeof source !== 'object') {
        if (isArray(target)) {
            target.push(source);
        }
        else if (target && typeof target === 'object') {
            if ((options && (options.plainObjects || options.allowPrototypes)) || !has(Object.prototype, source)) {
                target[source] = true;
            }
        }
        else {
            return [target, source];
        }
        return target;
    }
    if (!target || typeof target !== 'object') {
        return [target].concat(source);
    }
    let mergeTarget = target;
    if (isArray(target) && !isArray(source)) {
        // @ts-ignore
        mergeTarget = array_to_object(target, options);
    }
    if (isArray(target) && isArray(source)) {
        source.forEach(function (item, i) {
            if (has(target, i)) {
                const targetItem = target[i];
                if (targetItem && typeof targetItem === 'object' && item && typeof item === 'object') {
                    target[i] = merge(targetItem, item, options);
                }
                else {
                    target.push(item);
                }
            }
            else {
                target[i] = item;
            }
        });
        return target;
    }
    return Object.keys(source).reduce(function (acc, key) {
        const value = source[key];
        if (has(acc, key)) {
            acc[key] = merge(acc[key], value, options);
        }
        else {
            acc[key] = value;
        }
        return acc;
    }, mergeTarget);
}
function assign_single_source(target, source) {
    return Object.keys(source).reduce(function (acc, key) {
        acc[key] = source[key];
        return acc;
    }, target);
}
function decode(str, _, charset) {
    const strWithoutPlus = str.replace(/\+/g, ' ');
    if (charset === 'iso-8859-1') {
        // unescape never throws, no try...catch needed:
        return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
    }
    // utf-8
    try {
        return decodeURIComponent(strWithoutPlus);
    }
    catch (e) {
        return strWithoutPlus;
    }
}
const limit = 1024;
const encode = (str, _defaultEncoder, charset, _kind, format) => {
    // This code was originally written by Brian White for the io.js core querystring library.
    // It has been adapted here for stricter adherence to RFC 3986
    if (str.length === 0) {
        return str;
    }
    let string = str;
    if (typeof str === 'symbol') {
        string = Symbol.prototype.toString.call(str);
    }
    else if (typeof str !== 'string') {
        string = String(str);
    }
    if (charset === 'iso-8859-1') {
        return escape(string).replace(/%u[0-9a-f]{4}/gi, function ($0) {
            return '%26%23' + parseInt($0.slice(2), 16) + '%3B';
        });
    }
    let out = '';
    for (let j = 0; j < string.length; j += limit) {
        const segment = string.length >= limit ? string.slice(j, j + limit) : string;
        const arr = [];
        for (let i = 0; i < segment.length; ++i) {
            let c = segment.charCodeAt(i);
            if (c === 0x2d || // -
                c === 0x2e || // .
                c === 0x5f || // _
                c === 0x7e || // ~
                (c >= 0x30 && c <= 0x39) || // 0-9
                (c >= 0x41 && c <= 0x5a) || // a-z
                (c >= 0x61 && c <= 0x7a) || // A-Z
                (format === RFC1738 && (c === 0x28 || c === 0x29)) // ( )
            ) {
                arr[arr.length] = segment.charAt(i);
                continue;
            }
            if (c < 0x80) {
                arr[arr.length] = hex_table[c];
                continue;
            }
            if (c < 0x800) {
                arr[arr.length] = hex_table[0xc0 | (c >> 6)] + hex_table[0x80 | (c & 0x3f)];
                continue;
            }
            if (c < 0xd800 || c >= 0xe000) {
                arr[arr.length] =
                    hex_table[0xe0 | (c >> 12)] + hex_table[0x80 | ((c >> 6) & 0x3f)] + hex_table[0x80 | (c & 0x3f)];
                continue;
            }
            i += 1;
            c = 0x10000 + (((c & 0x3ff) << 10) | (segment.charCodeAt(i) & 0x3ff));
            arr[arr.length] =
                hex_table[0xf0 | (c >> 18)] +
                    hex_table[0x80 | ((c >> 12) & 0x3f)] +
                    hex_table[0x80 | ((c >> 6) & 0x3f)] +
                    hex_table[0x80 | (c & 0x3f)];
        }
        out += arr.join('');
    }
    return out;
};
function compact(value) {
    const queue = [{ obj: { o: value }, prop: 'o' }];
    const refs = [];
    for (let i = 0; i < queue.length; ++i) {
        const item = queue[i];
        // @ts-ignore
        const obj = item.obj[item.prop];
        const keys = Object.keys(obj);
        for (let j = 0; j < keys.length; ++j) {
            const key = keys[j];
            const val = obj[key];
            if (typeof val === 'object' && val !== null && refs.indexOf(val) === -1) {
                queue.push({ obj: obj, prop: key });
                refs.push(val);
            }
        }
    }
    compact_queue(queue);
    return value;
}
function is_regexp(obj) {
    return Object.prototype.toString.call(obj) === '[object RegExp]';
}
function is_buffer(obj) {
    if (!obj || typeof obj !== 'object') {
        return false;
    }
    return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
}
function combine(a, b) {
    return [].concat(a, b);
}
function maybe_map(val, fn) {
    if ((0,utils_values/* isArray */.cy)(val)) {
        const mapped = [];
        for (let i = 0; i < val.length; i += 1) {
            mapped.push(fn(val[i]));
        }
        return mapped;
    }
    return fn(val);
}
//# sourceMappingURL=utils.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/qs/stringify.mjs



const array_prefix_generators = {
    brackets(prefix) {
        return String(prefix) + '[]';
    },
    comma: 'comma',
    indices(prefix, key) {
        return String(prefix) + '[' + key + ']';
    },
    repeat(prefix) {
        return String(prefix);
    },
};
const push_to_array = function (arr, value_or_array) {
    Array.prototype.push.apply(arr, (0,utils_values/* isArray */.cy)(value_or_array) ? value_or_array : [value_or_array]);
};
let toISOString;
const defaults = {
    addQueryPrefix: false,
    allowDots: false,
    allowEmptyArrays: false,
    arrayFormat: 'indices',
    charset: 'utf-8',
    charsetSentinel: false,
    delimiter: '&',
    encode: true,
    encodeDotInKeys: false,
    encoder: encode,
    encodeValuesOnly: false,
    format: default_format,
    formatter: default_formatter,
    /** @deprecated */
    indices: false,
    serializeDate(date) {
        return (toISOString ?? (toISOString = Function.prototype.call.bind(Date.prototype.toISOString)))(date);
    },
    skipNulls: false,
    strictNullHandling: false,
};
function is_non_nullish_primitive(v) {
    return (typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean' ||
        typeof v === 'symbol' ||
        typeof v === 'bigint');
}
const sentinel = {};
function inner_stringify(object, prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, sideChannel) {
    let obj = object;
    let tmp_sc = sideChannel;
    let step = 0;
    let find_flag = false;
    while ((tmp_sc = tmp_sc.get(sentinel)) !== void undefined && !find_flag) {
        // Where object last appeared in the ref tree
        const pos = tmp_sc.get(object);
        step += 1;
        if (typeof pos !== 'undefined') {
            if (pos === step) {
                throw new RangeError('Cyclic object value');
            }
            else {
                find_flag = true; // Break while
            }
        }
        if (typeof tmp_sc.get(sentinel) === 'undefined') {
            step = 0;
        }
    }
    if (typeof filter === 'function') {
        obj = filter(prefix, obj);
    }
    else if (obj instanceof Date) {
        obj = serializeDate?.(obj);
    }
    else if (generateArrayPrefix === 'comma' && (0,utils_values/* isArray */.cy)(obj)) {
        obj = maybe_map(obj, function (value) {
            if (value instanceof Date) {
                return serializeDate?.(value);
            }
            return value;
        });
    }
    if (obj === null) {
        if (strictNullHandling) {
            return encoder && !encodeValuesOnly ?
                // @ts-expect-error
                encoder(prefix, defaults.encoder, charset, 'key', format)
                : prefix;
        }
        obj = '';
    }
    if (is_non_nullish_primitive(obj) || is_buffer(obj)) {
        if (encoder) {
            const key_value = encodeValuesOnly ? prefix
                // @ts-expect-error
                : encoder(prefix, defaults.encoder, charset, 'key', format);
            return [
                formatter?.(key_value) +
                    '=' +
                    // @ts-expect-error
                    formatter?.(encoder(obj, defaults.encoder, charset, 'value', format)),
            ];
        }
        return [formatter?.(prefix) + '=' + formatter?.(String(obj))];
    }
    const values = [];
    if (typeof obj === 'undefined') {
        return values;
    }
    let obj_keys;
    if (generateArrayPrefix === 'comma' && (0,utils_values/* isArray */.cy)(obj)) {
        // we need to join elements in
        if (encodeValuesOnly && encoder) {
            // @ts-expect-error values only
            obj = maybe_map(obj, encoder);
        }
        obj_keys = [{ value: obj.length > 0 ? obj.join(',') || null : void undefined }];
    }
    else if ((0,utils_values/* isArray */.cy)(filter)) {
        obj_keys = filter;
    }
    else {
        const keys = Object.keys(obj);
        obj_keys = sort ? keys.sort(sort) : keys;
    }
    const encoded_prefix = encodeDotInKeys ? String(prefix).replace(/\./g, '%2E') : String(prefix);
    const adjusted_prefix = commaRoundTrip && (0,utils_values/* isArray */.cy)(obj) && obj.length === 1 ? encoded_prefix + '[]' : encoded_prefix;
    if (allowEmptyArrays && (0,utils_values/* isArray */.cy)(obj) && obj.length === 0) {
        return adjusted_prefix + '[]';
    }
    for (let j = 0; j < obj_keys.length; ++j) {
        const key = obj_keys[j];
        const value = 
        // @ts-ignore
        typeof key === 'object' && typeof key.value !== 'undefined' ? key.value : obj[key];
        if (skipNulls && value === null) {
            continue;
        }
        // @ts-ignore
        const encoded_key = allowDots && encodeDotInKeys ? key.replace(/\./g, '%2E') : key;
        const key_prefix = (0,utils_values/* isArray */.cy)(obj) ?
            typeof generateArrayPrefix === 'function' ?
                generateArrayPrefix(adjusted_prefix, encoded_key)
                : adjusted_prefix
            : adjusted_prefix + (allowDots ? '.' + encoded_key : '[' + encoded_key + ']');
        sideChannel.set(object, step);
        const valueSideChannel = new WeakMap();
        valueSideChannel.set(sentinel, sideChannel);
        push_to_array(values, inner_stringify(value, key_prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, 
        // @ts-ignore
        generateArrayPrefix === 'comma' && encodeValuesOnly && (0,utils_values/* isArray */.cy)(obj) ? null : encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, valueSideChannel));
    }
    return values;
}
function normalize_stringify_options(opts = defaults) {
    if (typeof opts.allowEmptyArrays !== 'undefined' && typeof opts.allowEmptyArrays !== 'boolean') {
        throw new TypeError('`allowEmptyArrays` option can only be `true` or `false`, when provided');
    }
    if (typeof opts.encodeDotInKeys !== 'undefined' && typeof opts.encodeDotInKeys !== 'boolean') {
        throw new TypeError('`encodeDotInKeys` option can only be `true` or `false`, when provided');
    }
    if (opts.encoder !== null && typeof opts.encoder !== 'undefined' && typeof opts.encoder !== 'function') {
        throw new TypeError('Encoder has to be a function.');
    }
    const charset = opts.charset || defaults.charset;
    if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
        throw new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined');
    }
    let format = default_format;
    if (typeof opts.format !== 'undefined') {
        if (!has(formatters, opts.format)) {
            throw new TypeError('Unknown format option provided.');
        }
        format = opts.format;
    }
    const formatter = formatters[format];
    let filter = defaults.filter;
    if (typeof opts.filter === 'function' || (0,utils_values/* isArray */.cy)(opts.filter)) {
        filter = opts.filter;
    }
    let arrayFormat;
    if (opts.arrayFormat && opts.arrayFormat in array_prefix_generators) {
        arrayFormat = opts.arrayFormat;
    }
    else if ('indices' in opts) {
        arrayFormat = opts.indices ? 'indices' : 'repeat';
    }
    else {
        arrayFormat = defaults.arrayFormat;
    }
    if ('commaRoundTrip' in opts && typeof opts.commaRoundTrip !== 'boolean') {
        throw new TypeError('`commaRoundTrip` must be a boolean, or absent');
    }
    const allowDots = typeof opts.allowDots === 'undefined' ?
        !!opts.encodeDotInKeys === true ?
            true
            : defaults.allowDots
        : !!opts.allowDots;
    return {
        addQueryPrefix: typeof opts.addQueryPrefix === 'boolean' ? opts.addQueryPrefix : defaults.addQueryPrefix,
        // @ts-ignore
        allowDots: allowDots,
        allowEmptyArrays: typeof opts.allowEmptyArrays === 'boolean' ? !!opts.allowEmptyArrays : defaults.allowEmptyArrays,
        arrayFormat: arrayFormat,
        charset: charset,
        charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults.charsetSentinel,
        commaRoundTrip: !!opts.commaRoundTrip,
        delimiter: typeof opts.delimiter === 'undefined' ? defaults.delimiter : opts.delimiter,
        encode: typeof opts.encode === 'boolean' ? opts.encode : defaults.encode,
        encodeDotInKeys: typeof opts.encodeDotInKeys === 'boolean' ? opts.encodeDotInKeys : defaults.encodeDotInKeys,
        encoder: typeof opts.encoder === 'function' ? opts.encoder : defaults.encoder,
        encodeValuesOnly: typeof opts.encodeValuesOnly === 'boolean' ? opts.encodeValuesOnly : defaults.encodeValuesOnly,
        filter: filter,
        format: format,
        formatter: formatter,
        serializeDate: typeof opts.serializeDate === 'function' ? opts.serializeDate : defaults.serializeDate,
        skipNulls: typeof opts.skipNulls === 'boolean' ? opts.skipNulls : defaults.skipNulls,
        // @ts-ignore
        sort: typeof opts.sort === 'function' ? opts.sort : null,
        strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults.strictNullHandling,
    };
}
function stringify(object, opts = {}) {
    let obj = object;
    const options = normalize_stringify_options(opts);
    let obj_keys;
    let filter;
    if (typeof options.filter === 'function') {
        filter = options.filter;
        obj = filter('', obj);
    }
    else if ((0,utils_values/* isArray */.cy)(options.filter)) {
        filter = options.filter;
        obj_keys = filter;
    }
    const keys = [];
    if (typeof obj !== 'object' || obj === null) {
        return '';
    }
    const generateArrayPrefix = array_prefix_generators[options.arrayFormat];
    const commaRoundTrip = generateArrayPrefix === 'comma' && options.commaRoundTrip;
    if (!obj_keys) {
        obj_keys = Object.keys(obj);
    }
    if (options.sort) {
        obj_keys.sort(options.sort);
    }
    const sideChannel = new WeakMap();
    for (let i = 0; i < obj_keys.length; ++i) {
        const key = obj_keys[i];
        if (options.skipNulls && obj[key] === null) {
            continue;
        }
        push_to_array(keys, inner_stringify(obj[key], key, 
        // @ts-expect-error
        generateArrayPrefix, commaRoundTrip, options.allowEmptyArrays, options.strictNullHandling, options.skipNulls, options.encodeDotInKeys, options.encode ? options.encoder : null, options.filter, options.sort, options.allowDots, options.serializeDate, options.format, options.formatter, options.encodeValuesOnly, options.charset, sideChannel));
    }
    const joined = keys.join(options.delimiter);
    let prefix = options.addQueryPrefix === true ? '?' : '';
    if (options.charsetSentinel) {
        if (options.charset === 'iso-8859-1') {
            // encodeURIComponent('&#10003;'), the "numeric entity" representation of a checkmark
            prefix += 'utf8=%26%2310003%3B&';
        }
        else {
            // encodeURIComponent('✓')
            prefix += 'utf8=%E2%9C%93&';
        }
    }
    return joined.length > 0 ? prefix + joined : '';
}
//# sourceMappingURL=stringify.mjs.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.6.7/node_modules/@anthropic-ai/sdk/internal/utils/query.mjs
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

function stringifyQuery(query) {
    return stringify(query, { arrayFormat: 'brackets' });
}
//# sourceMappingURL=query.mjs.map

/***/ }),

/***/ 89865:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   $3: () => (/* binding */ hasOwn),
/* harmony export */   MH: () => (/* binding */ isReadonlyArray),
/* harmony export */   cy: () => (/* binding */ isArray),
/* harmony export */   f2: () => (/* binding */ checkNever),
/* harmony export */   i8: () => (/* binding */ maybeObj),
/* harmony export */   ml: () => (/* binding */ safeJSON),
/* harmony export */   nt: () => (/* binding */ isAbsoluteURL),
/* harmony export */   sA: () => (/* binding */ isObj),
/* harmony export */   wQ: () => (/* binding */ validatePositiveInteger),
/* harmony export */   ze: () => (/* binding */ isEmptyObj)
/* harmony export */ });
/* unused harmony exports ensurePresent, coerceInteger, coerceFloat, coerceBoolean, maybeCoerceInteger, maybeCoerceFloat, maybeCoerceBoolean, pop */
/* harmony import */ var _core_error_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(79491);
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

// https://url.spec.whatwg.org/#url-scheme-string
const startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
const isAbsoluteURL = (url) => {
    return startsWithSchemeRegexp.test(url);
};
let isArray = (val) => ((isArray = Array.isArray), isArray(val));
let isReadonlyArray = isArray;
/** Returns an object if the given value isn't an object, otherwise returns as-is */
function maybeObj(x) {
    if (typeof x !== 'object') {
        return {};
    }
    return x ?? {};
}
// https://stackoverflow.com/a/34491287
function isEmptyObj(obj) {
    if (!obj)
        return true;
    for (const _k in obj)
        return false;
    return true;
}
// https://eslint.org/docs/latest/rules/no-prototype-builtins
function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
function isObj(obj) {
    return obj != null && typeof obj === 'object' && !Array.isArray(obj);
}
const ensurePresent = (value) => {
    if (value == null) {
        throw new AnthropicError(`Expected a value to be given but received ${value} instead.`);
    }
    return value;
};
const validatePositiveInteger = (name, n) => {
    if (typeof n !== 'number' || !Number.isInteger(n)) {
        throw new _core_error_mjs__WEBPACK_IMPORTED_MODULE_0__/* .AnthropicError */ .pJ(`${name} must be an integer`);
    }
    if (n < 0) {
        throw new _core_error_mjs__WEBPACK_IMPORTED_MODULE_0__/* .AnthropicError */ .pJ(`${name} must be a positive integer`);
    }
    return n;
};
const coerceInteger = (value) => {
    if (typeof value === 'number')
        return Math.round(value);
    if (typeof value === 'string')
        return parseInt(value, 10);
    throw new AnthropicError(`Could not coerce ${value} (type: ${typeof value}) into a number`);
};
const coerceFloat = (value) => {
    if (typeof value === 'number')
        return value;
    if (typeof value === 'string')
        return parseFloat(value);
    throw new AnthropicError(`Could not coerce ${value} (type: ${typeof value}) into a number`);
};
const coerceBoolean = (value) => {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'string')
        return value === 'true';
    return Boolean(value);
};
const maybeCoerceInteger = (value) => {
    if (value == null) {
        return undefined;
    }
    return coerceInteger(value);
};
const maybeCoerceFloat = (value) => {
    if (value == null) {
        return undefined;
    }
    return coerceFloat(value);
};
const maybeCoerceBoolean = (value) => {
    if (value == null) {
        return undefined;
    }
    return coerceBoolean(value);
};
const safeJSON = (text) => {
    try {
        return JSON.parse(text);
    }
    catch (err) {
        return undefined;
    }
};
// Gets a value from an object, deletes the key, and returns the value (or undefined if not found)
const pop = (obj, key) => {
    const value = obj[key];
    delete obj[key];
    return value;
};
/**
 * Compile-time exhaustiveness check: passing a value here only type-checks once every
 * member of its union has been handled. Does nothing at runtime, so unknown values from a
 * newer API version fall through instead of throwing.
 */
function checkNever(_value) { }
//# sourceMappingURL=values.mjs.map

/***/ }),

/***/ 87455:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   v: () => (/* binding */ ToolError)
/* harmony export */ });
/**
 * An error that can be thrown from a tool's `run` method to return structured
 * content blocks as the error result, rather than just a string message.
 *
 * When the ToolRunner catches this error, it will use the `content` property
 * as the tool result with `is_error: true`.
 *
 * @example
 * ```ts
 * const tool = {
 *   name: 'my_tool',
 *   run: async (input) => {
 *     if (somethingWentWrong) {
 *       throw new ToolError([
 *         { type: 'text', text: 'Error details here' },
 *         { type: 'image', source: { type: 'base64', data: '...', media_type: 'image/png' } },
 *       ]);
 *     }
 *     return 'success';
 *   },
 * };
 * ```
 */
class ToolError extends Error {
    constructor(content) {
        const message = typeof content === 'string' ? content : (content
            .map((block) => {
            if (block.type === 'text')
                return block.text;
            return `[${block.type}]`;
        })
            .join(' '));
        super(message);
        this.name = 'ToolError';
        this.content = content;
    }
}
//# sourceMappingURL=ToolError.mjs.map

/***/ }),

/***/ 50033:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   _3: () => (/* binding */ MIN_MEMORY_SYNC_INTERVAL_MS),
/* harmony export */   hL: () => (/* binding */ DEFAULT_MEMORY_SYNC_INTERVAL_MS),
/* harmony export */   iT: () => (/* binding */ checkMemorySyncInterval)
/* harmony export */ });
/* harmony import */ var _core_error_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(79491);
/**
 * The memory sync cadence, split out of `memories.ts` so runtime-agnostic
 * callers (the environment worker) can validate an interval up front without
 * reaching into the Node-only toolset module.
 */

/**
 * How often (milliseconds) the worker syncs the session's memory stores back
 * while the session runs. Checked after each dispatched tool call.
 */
const DEFAULT_MEMORY_SYNC_INTERVAL_MS = 15000;
/**
 * The shortest sync interval accepted. Each sync lists every attached store,
 * so anything tighter mostly spends requests rediscovering that nothing
 * changed.
 */
const MIN_MEMORY_SYNC_INTERVAL_MS = 5000;
/** Throw unless `ms` is a usable sync interval. `option` names it in the message. */
function checkMemorySyncInterval(ms, option) {
    if (!(ms >= MIN_MEMORY_SYNC_INTERVAL_MS)) {
        throw new _core_error_mjs__WEBPACK_IMPORTED_MODULE_0__/* .AnthropicError */ .pJ(`${option} must be at least ${MIN_MEMORY_SYNC_INTERVAL_MS}ms (got ${ms}); ` +
            'to run without memory sync, pass `memorySyncIntervalMs: null` to the worker instead');
    }
}
//# sourceMappingURL=sync-interval.mjs.map

/***/ }),

/***/ 5329:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   stream: () => (/* binding */ stream),
/* harmony export */   streamSimple: () => (/* binding */ streamSimple)
/* harmony export */ });
/* harmony import */ var _anthropic_ai_sdk__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(7071);
/* harmony import */ var _models_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(25941);
/* harmony import */ var _utils_diagnostics_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(64921);
/* harmony import */ var _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(45174);
/* harmony import */ var _utils_headers_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(82003);
/* harmony import */ var _utils_json_parse_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(84781);
/* harmony import */ var _utils_pi_user_agent_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(55278);
/* harmony import */ var _utils_provider_env_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(67982);
/* harmony import */ var _utils_provider_retry_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(46863);
/* harmony import */ var _utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(43780);
/* harmony import */ var _utils_text_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(65678);
/* harmony import */ var _utils_transcript_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(19883);
/* harmony import */ var _constrained_sampling_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(37776);
/* harmony import */ var _github_copilot_headers_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(26103);
/* harmony import */ var _simple_options_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(18296);
/* harmony import */ var _transform_messages_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(48809);
















/**
 * Resolve cache retention preference.
 * Defaults to "short" and uses PI_CACHE_RETENTION for backward compatibility.
 */
function resolveCacheRetention(cacheRetention, env) {
    if (cacheRetention) {
        return cacheRetention;
    }
    if ((0,_utils_provider_env_js__WEBPACK_IMPORTED_MODULE_1__/* .getProviderEnvValue */ .Y)("PI_CACHE_RETENTION", env) === "long") {
        return "long";
    }
    return "short";
}
function getCacheControl(model, cacheRetention, env) {
    const retention = resolveCacheRetention(cacheRetention, env);
    if (retention === "none") {
        return { retention };
    }
    const ttl = retention === "long" && getAnthropicCompat(model).supportsLongCacheRetention ? "1h" : undefined;
    return {
        retention,
        cacheControl: { type: "ephemeral", ...(ttl && { ttl }) },
    };
}
// Stealth mode: Mimic Claude Code's tool naming exactly
const claudeCodeVersion = "2.1.251";
// Claude Code 2.x tool names (canonical casing)
// Source: https://cchistory.mariozechner.at/data/prompts-2.1.11.md
// To update: https://github.com/badlogic/cchistory
const claudeCodeTools = [
    "Read",
    "Write",
    "Edit",
    "Bash",
    "Grep",
    "Glob",
    "AskUserQuestion",
    "EnterPlanMode",
    "ExitPlanMode",
    "KillShell",
    "NotebookEdit",
    "Skill",
    "Task",
    "TaskOutput",
    "TodoWrite",
    "WebFetch",
    "WebSearch",
];
const ccToolLookup = new Map(claudeCodeTools.map((t) => [t.toLowerCase(), t]));
// Convert tool name to CC canonical casing if it matches (case-insensitive)
const toClaudeCodeName = (name) => ccToolLookup.get(name.toLowerCase()) ?? name;
const fromClaudeCodeName = (name, tools) => {
    if (tools && tools.length > 0) {
        const lowerName = name.toLowerCase();
        const matchedTool = tools.find((tool) => tool.name.toLowerCase() === lowerName);
        if (matchedTool)
            return matchedTool.name;
    }
    return name;
};
/**
 * Convert content blocks to Anthropic API format
 */
function convertContentBlocks(content) {
    // If only text blocks, return as concatenated string for simplicity
    const hasImages = content.some((c) => c.type === "image");
    if (!hasImages) {
        return (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeSurrogates */ .J)(content.map((c) => c.text).join("\n"));
    }
    // If we have images, convert to content block array
    const blocks = content.map((block) => {
        if (block.type === "text") {
            return {
                type: "text",
                text: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeSurrogates */ .J)(block.text),
            };
        }
        return {
            type: "image",
            source: {
                type: "base64",
                media_type: block.mimeType,
                data: block.data,
            },
        };
    });
    // If only images (no text), add placeholder text block
    const hasText = blocks.some((b) => b.type === "text");
    if (!hasText) {
        blocks.unshift({
            type: "text",
            text: "(see attached image)",
        });
    }
    return blocks;
}
const FINE_GRAINED_TOOL_STREAMING_BETA = "fine-grained-tool-streaming-2025-05-14";
const INTERLEAVED_THINKING_BETA = "interleaved-thinking-2025-05-14";
const SERVER_SIDE_FALLBACK_BETA = "server-side-fallback-2026-07-01";
const MID_CONVERSATION_OUTPUT_CONFIG_BETA = "mid-conversation-output-config-2026-07-01";
const THINKING_BINDING_CONTROLS_BETA = "thinking-binding-controls-2026-08-01";
const MID_CONVERSATION_TOOL_CHANGES_BETA = "mid-conversation-tool-changes-2026-07-01";
/**
 * Stable deferred tool declared whenever native tool changes are in use. Anthropic adds
 * hidden prompt scaffolding as soon as any tool has `defer_loading`; declaring this
 * placeholder from the first request keeps that scaffolding in the cached prefix, so the
 * first real late tool does not invalidate the cache (measured: full miss without it).
 * It is never activated and the model cannot see it.
 */
const DEFERRED_TOOL_PLACEHOLDER = {
    name: "__pi_deferred_placeholder__",
    description: "Reserved placeholder. Never available. Never call this.",
    input_schema: { type: "object", properties: {}, required: [] },
    defer_loading: true,
};
function shouldUseServerSideFallbackBeta(model) {
    return (model.compat?.allowedFallbackModels?.length ?? 0) > 0;
}
function getAnthropicCompat(model) {
    const isOpenRouter = model.provider === "openrouter" || model.baseUrl.includes("openrouter.ai");
    return {
        supportsEagerToolInputStreaming: model.compat?.supportsEagerToolInputStreaming ?? true,
        supportsLongCacheRetention: model.compat?.supportsLongCacheRetention ?? true,
        sendSessionAffinityHeaders: model.compat?.sendSessionAffinityHeaders ?? isOpenRouter,
        sessionAffinityFormat: model.compat?.sessionAffinityFormat ?? (isOpenRouter ? "openrouter" : undefined),
        supportsCacheControlOnTools: model.compat?.supportsCacheControlOnTools ?? true,
        supportsTemperature: model.compat?.supportsTemperature ?? true,
        allowEmptySignature: model.compat?.allowEmptySignature ?? false,
        supportsStrictTools: model.compat?.supportsStrictTools ?? false,
        supportsMidConvoSystemMessages: model.compat?.supportsMidConvoSystemMessages ?? false,
        supportsMidConvoToolChanges: model.compat?.supportsMidConvoToolChanges ?? false,
    };
}
function mergeHeaders(...headerSources) {
    const merged = {};
    for (const headers of headerSources) {
        if (headers) {
            Object.assign(merged, headers);
        }
    }
    return merged;
}
function mergeClientHeaders(...headerSources) {
    return mergeHeaders({ "User-Agent": (0,_utils_pi_user_agent_js__WEBPACK_IMPORTED_MODULE_3__/* .getPiUserAgent */ .w)() }, ...headerSources);
}
function hasHeader(headers, name) {
    if (!headers)
        return false;
    const expected = name.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === expected && value !== null && value.trim().length > 0)
            return true;
    }
    return false;
}
function assertRequestAuth(provider, apiKey, headers) {
    if (apiKey)
        return;
    if (hasHeader(headers, "authorization") ||
        hasHeader(headers, "x-api-key") ||
        hasHeader(headers, "cf-aig-authorization")) {
        return;
    }
    throw new Error(`No API key for provider: ${provider}`);
}
const ANTHROPIC_MESSAGE_EVENTS = new Set([
    "message_start",
    "message_delta",
    "message_stop",
    "content_block_start",
    "content_block_delta",
    "content_block_stop",
]);
function flushSseEvent(state) {
    if (!state.event && state.data.length === 0) {
        return null;
    }
    const event = {
        event: state.event,
        data: state.data.join("\n"),
        raw: [...state.raw],
    };
    state.event = null;
    state.data = [];
    state.raw = [];
    return event;
}
function decodeSseLine(line, state) {
    if (line === "") {
        return flushSseEvent(state);
    }
    state.raw.push(line);
    if (line.startsWith(":")) {
        return null;
    }
    const delimiterIndex = line.indexOf(":");
    const fieldName = delimiterIndex === -1 ? line : line.slice(0, delimiterIndex);
    let value = delimiterIndex === -1 ? "" : line.slice(delimiterIndex + 1);
    if (value.startsWith(" ")) {
        value = value.slice(1);
    }
    if (fieldName === "event") {
        state.event = value;
    }
    else if (fieldName === "data") {
        state.data.push(value);
    }
    return null;
}
function nextLineBreakIndex(text) {
    const carriageReturnIndex = text.indexOf("\r");
    const newlineIndex = text.indexOf("\n");
    if (carriageReturnIndex === -1) {
        return newlineIndex;
    }
    if (newlineIndex === -1) {
        return carriageReturnIndex;
    }
    return Math.min(carriageReturnIndex, newlineIndex);
}
function consumeLine(text) {
    const lineBreakIndex = nextLineBreakIndex(text);
    if (lineBreakIndex === -1) {
        return null;
    }
    let nextIndex = lineBreakIndex + 1;
    if (text[lineBreakIndex] === "\r" && text[nextIndex] === "\n") {
        nextIndex += 1;
    }
    return {
        line: text.slice(0, lineBreakIndex),
        rest: text.slice(nextIndex),
    };
}
async function* iterateSseMessages(body, signal) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    const state = { event: null, data: [], raw: [] };
    let buffer = "";
    try {
        while (true) {
            if (signal?.aborted) {
                throw new Error("Request was aborted");
            }
            const { value, done } = await reader.read();
            if (done) {
                break;
            }
            buffer += decoder.decode(value, { stream: true });
            let consumed = consumeLine(buffer);
            while (consumed) {
                buffer = consumed.rest;
                const event = decodeSseLine(consumed.line, state);
                if (event) {
                    yield event;
                }
                consumed = consumeLine(buffer);
            }
        }
        buffer += decoder.decode();
        let consumed = consumeLine(buffer);
        while (consumed) {
            buffer = consumed.rest;
            const event = decodeSseLine(consumed.line, state);
            if (event) {
                yield event;
            }
            consumed = consumeLine(buffer);
        }
        if (buffer.length > 0) {
            const event = decodeSseLine(buffer, state);
            if (event) {
                yield event;
            }
        }
        const trailingEvent = flushSseEvent(state);
        if (trailingEvent) {
            yield trailingEvent;
        }
    }
    finally {
        reader.releaseLock();
    }
}
async function* iterateAnthropicEvents(response, signal) {
    if (!response.body) {
        throw new Error("Attempted to iterate over an Anthropic response with no body");
    }
    let sawMessageStart = false;
    let sawMessageEnd = false;
    for await (const sse of iterateSseMessages(response.body, signal)) {
        if (sse.event === "error") {
            throw new Error(sse.data);
        }
        if (!ANTHROPIC_MESSAGE_EVENTS.has(sse.event ?? "")) {
            continue;
        }
        try {
            const event = (0,_utils_json_parse_js__WEBPACK_IMPORTED_MODULE_4__/* .parseJsonWithRepair */ .jA)(sse.data);
            if (event.type === "message_start") {
                sawMessageStart = true;
            }
            else if (event.type === "message_stop") {
                sawMessageEnd = true;
            }
            yield event;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Could not parse Anthropic SSE event ${sse.event}: ${message}; data=${sse.data}; raw=${sse.raw.join("\\n")}`);
        }
    }
    if (sawMessageStart && !sawMessageEnd) {
        throw new Error("Anthropic stream ended before message_stop");
    }
}
const stream = (model, context, options) => {
    const stream = new _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_5__/* .AssistantMessageEventStream */ .Q2();
    const normalizedContext = (0,_utils_transcript_js__WEBPACK_IMPORTED_MODULE_6__/* .resolveTranscript */ .lw)(context, getAnthropicCompat(model).supportsMidConvoSystemMessages);
    const currentTools = (0,_utils_transcript_js__WEBPACK_IMPORTED_MODULE_6__/* .getCurrentTools */ .Fh)(normalizedContext.messages);
    (async () => {
        const providerThinkingLevel = model.compat?.supportsMidConvoEffort ? (options?.effort ?? "high") : undefined;
        const output = {
            role: "assistant",
            content: [],
            api: model.api,
            provider: model.provider,
            model: model.id,
            ...(providerThinkingLevel === undefined ? {} : { providerThinkingLevel }),
            usage: {
                input: 0,
                output: 0,
                cacheRead: 0,
                cacheWrite: 0,
                totalTokens: 0,
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
            },
            stopReason: "pending",
            timestamp: Date.now(),
        };
        try {
            let client;
            let isOAuth;
            let usageModel = model;
            let inputTransformations;
            if (options?.client) {
                client = options.client;
                isOAuth = false;
            }
            else {
                const apiKey = options?.apiKey;
                assertRequestAuth(model.provider, apiKey, options?.headers);
                let copilotDynamicHeaders;
                if (model.provider === "github-copilot") {
                    const hasImages = (0,_github_copilot_headers_js__WEBPACK_IMPORTED_MODULE_7__/* .hasCopilotVisionInput */ .d1)(normalizedContext.messages);
                    copilotDynamicHeaders = (0,_github_copilot_headers_js__WEBPACK_IMPORTED_MODULE_7__/* .buildCopilotDynamicHeaders */ .G0)({
                        messages: normalizedContext.messages,
                        hasImages,
                    });
                }
                const cacheRetention = resolveCacheRetention(options?.cacheRetention, options?.env);
                const cacheSessionId = cacheRetention === "none" ? undefined : options?.sessionId;
                const created = createClient(model, apiKey, options?.headers, options?.fetch, copilotDynamicHeaders, cacheSessionId);
                client = created.client;
                isOAuth = created.isOAuthToken;
            }
            let params = buildParams(model, normalizedContext, isOAuth, options);
            const nextParams = await options?.onPayload?.(params, model);
            if (nextParams !== undefined) {
                params = { ...nextParams, stream: true };
            }
            const requestOptions = {
                ...(options?.signal ? { signal: options.signal } : {}),
                ...(options?.timeoutMs !== undefined ? { timeout: options.timeoutMs } : {}),
                maxRetries: 0,
            };
            const response = await (0,_utils_provider_retry_js__WEBPACK_IMPORTED_MODULE_8__/* .retryProviderRequest */ .T)(() => client.beta.messages.create(params, requestOptions).asResponse(), {
                maxRetries: options?.maxRetries,
                maxRetryDelayMs: options?.maxRetryDelayMs,
                signal: options?.signal,
            });
            await options?.onResponse?.({ status: response.status, headers: (0,_utils_headers_js__WEBPACK_IMPORTED_MODULE_9__/* .headersToRecord */ .j)(response.headers) }, model);
            stream.push({ type: "start", partial: output });
            const blocks = output.content;
            for await (const event of iterateAnthropicEvents(response, options?.signal)) {
                if (event.type === "message_start") {
                    output.responseId = event.message.id;
                    const transformations = event.message.input_transformations;
                    if (Array.isArray(transformations))
                        inputTransformations = transformations;
                    const responseModel = event.message.model;
                    if (responseModel !== model.id)
                        output.responseModel = responseModel;
                    const fallbackCost = responseModel === model.id
                        ? undefined
                        : model.compat?.allowedFallbackModels?.find((fallback) => fallback.provider === model.provider && fallback.model === responseModel)?.cost;
                    usageModel = fallbackCost ? { ...model, id: responseModel, cost: fallbackCost } : model;
                    // Capture initial token usage from message_start event
                    // This ensures we have input token counts even if the stream is aborted early
                    output.usage.input = event.message.usage.input_tokens || 0;
                    output.usage.output = event.message.usage.output_tokens || 0;
                    output.usage.cacheRead = event.message.usage.cache_read_input_tokens || 0;
                    output.usage.cacheWrite = event.message.usage.cache_creation_input_tokens || 0;
                    output.usage.cacheWrite1h = event.message.usage.cache_creation?.ephemeral_1h_input_tokens || 0;
                    // Anthropic doesn't provide total_tokens, compute from components
                    output.usage.totalTokens =
                        output.usage.input + output.usage.output + output.usage.cacheRead + output.usage.cacheWrite;
                    (0,_models_js__WEBPACK_IMPORTED_MODULE_10__/* .calculateCost */ .yN)(usageModel, output.usage);
                }
                else if (event.type === "content_block_start") {
                    if (event.content_block.type === "fallback") {
                        if (output.content.length > 0) {
                            throw new Error("Anthropic performed an unsupported mid-output model fallback");
                        }
                        continue;
                    }
                    if (event.content_block.type === "text") {
                        const block = {
                            type: "text",
                            text: event.content_block.text ?? "",
                            index: event.index,
                        };
                        output.content.push(block);
                        stream.push({ type: "text_start", contentIndex: output.content.length - 1, partial: output });
                    }
                    else if (event.content_block.type === "thinking") {
                        const block = {
                            type: "thinking",
                            thinking: event.content_block.thinking ?? "",
                            thinkingSignature: event.content_block.signature ?? "",
                            index: event.index,
                        };
                        output.content.push(block);
                        stream.push({ type: "thinking_start", contentIndex: output.content.length - 1, partial: output });
                    }
                    else if (event.content_block.type === "redacted_thinking") {
                        const block = {
                            type: "thinking",
                            thinking: "[Reasoning redacted]",
                            thinkingSignature: event.content_block.data,
                            redacted: true,
                            index: event.index,
                        };
                        output.content.push(block);
                        stream.push({ type: "thinking_start", contentIndex: output.content.length - 1, partial: output });
                    }
                    else if (event.content_block.type === "tool_use") {
                        const block = {
                            type: "toolCall",
                            id: event.content_block.id,
                            name: isOAuth
                                ? fromClaudeCodeName(event.content_block.name, currentTools)
                                : event.content_block.name,
                            arguments: event.content_block.input ?? {},
                            partialJson: "",
                            index: event.index,
                        };
                        output.content.push(block);
                        stream.push({ type: "toolcall_start", contentIndex: output.content.length - 1, partial: output });
                    }
                }
                else if (event.type === "content_block_delta") {
                    if (event.delta.type === "text_delta") {
                        const index = blocks.findIndex((b) => b.index === event.index);
                        const block = blocks[index];
                        if (block && block.type === "text") {
                            block.text += event.delta.text;
                            stream.push({
                                type: "text_delta",
                                contentIndex: index,
                                delta: event.delta.text,
                                partial: output,
                            });
                        }
                    }
                    else if (event.delta.type === "thinking_delta") {
                        const index = blocks.findIndex((b) => b.index === event.index);
                        const block = blocks[index];
                        if (block && block.type === "thinking") {
                            block.thinking += event.delta.thinking;
                            stream.push({
                                type: "thinking_delta",
                                contentIndex: index,
                                delta: event.delta.thinking,
                                partial: output,
                            });
                        }
                    }
                    else if (event.delta.type === "input_json_delta") {
                        const index = blocks.findIndex((b) => b.index === event.index);
                        const block = blocks[index];
                        if (block && block.type === "toolCall") {
                            block.partialJson += event.delta.partial_json;
                            block.arguments = (0,_utils_json_parse_js__WEBPACK_IMPORTED_MODULE_4__/* .parseStreamingJson */ .o2)(block.partialJson);
                            stream.push({
                                type: "toolcall_delta",
                                contentIndex: index,
                                delta: event.delta.partial_json,
                                partial: output,
                            });
                        }
                    }
                    else if (event.delta.type === "signature_delta") {
                        const index = blocks.findIndex((b) => b.index === event.index);
                        const block = blocks[index];
                        if (block && block.type === "thinking") {
                            block.thinkingSignature = block.thinkingSignature || "";
                            block.thinkingSignature += event.delta.signature;
                        }
                    }
                }
                else if (event.type === "content_block_stop") {
                    const index = blocks.findIndex((b) => b.index === event.index);
                    const block = blocks[index];
                    if (block) {
                        delete block.index;
                        if (block.type === "text") {
                            stream.push({
                                type: "text_end",
                                contentIndex: index,
                                content: block.text,
                                partial: output,
                            });
                        }
                        else if (block.type === "thinking") {
                            stream.push({
                                type: "thinking_end",
                                contentIndex: index,
                                content: block.thinking,
                                partial: output,
                            });
                        }
                        else if (block.type === "toolCall") {
                            block.arguments = (0,_utils_json_parse_js__WEBPACK_IMPORTED_MODULE_4__/* .parseStreamingJson */ .o2)(block.partialJson);
                            // Finalize in-place and strip the scratch buffer so replay only
                            // carries parsed arguments.
                            delete block.partialJson;
                            stream.push({
                                type: "toolcall_end",
                                contentIndex: index,
                                toolCall: block,
                                partial: output,
                            });
                        }
                    }
                }
                else if (event.type === "message_delta") {
                    const transformations = event.input_transformations;
                    if (Array.isArray(transformations))
                        inputTransformations = transformations;
                    if (event.delta.stop_reason) {
                        output.rawStopReason = event.delta.stop_reason;
                        const stopReasonResult = mapStopReason(event.delta.stop_reason, event.delta.stop_details);
                        output.stopReason = stopReasonResult.stopReason;
                        if (stopReasonResult.errorMessage) {
                            output.errorMessage = stopReasonResult.errorMessage;
                        }
                    }
                    // Only update usage fields if present (not null).
                    // Preserves input_tokens from message_start when proxies omit it in message_delta.
                    if (event.usage) {
                        if (event.usage.input_tokens != null) {
                            output.usage.input = event.usage.input_tokens;
                        }
                        if (event.usage.output_tokens != null) {
                            output.usage.output = event.usage.output_tokens;
                        }
                        if (event.usage.cache_read_input_tokens != null) {
                            output.usage.cacheRead = event.usage.cache_read_input_tokens;
                        }
                        if (event.usage.cache_creation_input_tokens != null) {
                            output.usage.cacheWrite = event.usage.cache_creation_input_tokens;
                        }
                        // Anthropic reports reasoning tokens as a subset of output tokens.
                        const thinkingTokens = event.usage.output_tokens_details?.thinking_tokens;
                        if (thinkingTokens != null) {
                            output.usage.reasoning = thinkingTokens;
                        }
                    }
                    // Anthropic doesn't provide total_tokens, compute from components
                    output.usage.totalTokens =
                        output.usage.input + output.usage.output + output.usage.cacheRead + output.usage.cacheWrite;
                    (0,_models_js__WEBPACK_IMPORTED_MODULE_10__/* .calculateCost */ .yN)(usageModel, output.usage);
                }
            }
            if (options?.signal?.aborted) {
                throw new Error("Request was aborted");
            }
            if (output.stopReason === "pending") {
                throw new Error("Anthropic stream ended without a stop reason");
            }
            if (output.stopReason === "aborted" || output.stopReason === "error") {
                throw new Error(output.errorMessage || "An unknown error occurred");
            }
            if (inputTransformations && inputTransformations.length > 0) {
                (0,_utils_diagnostics_js__WEBPACK_IMPORTED_MODULE_11__/* .appendAssistantMessageDiagnostic */ .vF)(output, {
                    type: "anthropic_input_transformations",
                    timestamp: Date.now(),
                    details: {
                        transformations: inputTransformations.map((transformation) => ({
                            type: transformation.type ?? undefined,
                            path: transformation.path ?? undefined,
                            reason: transformation.reason ?? undefined,
                        })),
                    },
                });
            }
            stream.push({ type: "done", reason: output.stopReason, message: output });
            stream.end();
        }
        catch (error) {
            for (const block of output.content) {
                delete block.index;
                // partialJson is only a streaming scratch buffer; never persist it.
                delete block.partialJson;
            }
            output.stopReason = options?.signal?.aborted ? "aborted" : "error";
            output.errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
            stream.push({ type: "error", reason: output.stopReason, error: output });
            stream.end();
        }
    })();
    return stream;
};
/**
 * Map ThinkingLevel to Anthropic effort levels for adaptive thinking.
 * Note: effort "max" is available on all adaptive-thinking Claude models, while native
 * "xhigh" is only available on Opus 4.7/4.8, Sonnet 5, and Fable 5.
 */
function mapThinkingLevelToEffort(model, level) {
    const mapped = level ? model.thinkingLevelMap?.[level] : undefined;
    if (typeof mapped === "string")
        return mapped;
    switch (level) {
        case "minimal":
        case "low":
            return "low";
        case "medium":
            return "medium";
        case "high":
            return "high";
        default:
            return "high";
    }
}
const streamSimple = (model, context, options) => {
    assertRequestAuth(model.provider, options?.apiKey, options?.headers);
    const base = {
        ...(0,_simple_options_js__WEBPACK_IMPORTED_MODULE_12__/* .buildBaseOptions */ .QP)(model, context, options, options?.apiKey),
        toolChoice: options?.toolChoice,
    };
    if (!options?.reasoning) {
        return stream(model, context, {
            ...base,
            thinkingEnabled: false,
        });
    }
    // For models with adaptive thinking: use an effort level.
    // For older models: use budget-based thinking.
    if (model.compat?.forceAdaptiveThinking === true) {
        const effort = mapThinkingLevelToEffort(model, options.reasoning);
        return stream(model, context, {
            ...base,
            thinkingEnabled: true,
            effort,
        });
    }
    // Undefined means the caller did not request an output cap; let the helper use the model cap.
    // Do not coerce to 0 here, or the thinking budget would become the entire max_tokens value.
    const adjusted = (0,_simple_options_js__WEBPACK_IMPORTED_MODULE_12__/* .adjustMaxTokensForThinking */ .xw)(base.maxTokens, model.maxTokens, options.reasoning, options.thinkingBudgets);
    const maxTokens = (0,_simple_options_js__WEBPACK_IMPORTED_MODULE_12__/* .clampMaxTokensToContext */ .Yx)(model, context, adjusted.maxTokens);
    return stream(model, context, {
        ...base,
        maxTokens,
        thinkingEnabled: true,
        thinkingBudgetTokens: Math.min(adjusted.thinkingBudget, Math.max(0, maxTokens - 1024)),
    });
};
function isOAuthToken(apiKey) {
    return apiKey.includes("sk-ant-oat");
}
function createClient(model, apiKey, optionsHeaders, fetch, dynamicHeaders, sessionId) {
    // Copilot: Bearer auth.
    if (model.provider === "github-copilot") {
        const client = new _anthropic_ai_sdk__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay({
            apiKey: null,
            authToken: apiKey ?? null,
            baseURL: model.baseUrl,
            dangerouslyAllowBrowser: true,
            fetch,
            defaultHeaders: mergeClientHeaders({
                accept: "application/json",
                "anthropic-dangerous-direct-browser-access": "true",
            }, model.headers, dynamicHeaders, optionsHeaders),
        });
        return { client, isOAuthToken: false };
    }
    // OAuth: Bearer auth, Claude Code identity headers
    if (apiKey && isOAuthToken(apiKey)) {
        const client = new _anthropic_ai_sdk__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay({
            apiKey: null,
            authToken: apiKey,
            baseURL: model.baseUrl,
            dangerouslyAllowBrowser: true,
            fetch,
            defaultHeaders: mergeClientHeaders({
                accept: "application/json",
                "anthropic-dangerous-direct-browser-access": "true",
                "user-agent": `claude-cli/${claudeCodeVersion}`,
                "x-app": "cli",
            }, model.headers, optionsHeaders),
        });
        return { client, isOAuthToken: true };
    }
    // API key or header-owned auth.
    const compat = getAnthropicCompat(model);
    const sessionAffinityHeaders = {};
    if (sessionId && compat.sendSessionAffinityHeaders) {
        const header = compat.sessionAffinityFormat === "openrouter" ? "x-session-id" : "x-session-affinity";
        sessionAffinityHeaders[header] = sessionId;
    }
    const defaultHeaders = mergeClientHeaders({
        accept: "application/json",
        "anthropic-dangerous-direct-browser-access": "true",
    }, sessionAffinityHeaders, model.headers, optionsHeaders);
    const client = new _anthropic_ai_sdk__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay({
        apiKey: apiKey ?? null,
        authToken: null,
        baseURL: model.baseUrl,
        dangerouslyAllowBrowser: true,
        fetch,
        defaultHeaders,
    });
    return { client, isOAuthToken: false };
}
function getBetaFeatures(model, context, isOAuthToken, nativeToolChanges, options) {
    let configuredFeatures;
    for (const headers of [model.headers, options?.headers]) {
        for (const [name, value] of Object.entries(headers ?? {})) {
            if (name.toLowerCase() === "anthropic-beta")
                configuredFeatures = value;
        }
    }
    if (configuredFeatures === null)
        return [];
    if (configuredFeatures !== undefined) {
        return [
            ...new Set(configuredFeatures
                .split(",")
                .map((feature) => feature.trim())
                .filter((feature) => feature.length > 0)),
        ];
    }
    const features = [];
    if (isOAuthToken)
        features.push("claude-code-20250219", "oauth-2025-04-20");
    if (shouldUseFineGrainedToolStreamingBeta(model, context))
        features.push(FINE_GRAINED_TOOL_STREAMING_BETA);
    if (model.reasoning &&
        options?.thinkingEnabled === true &&
        (options.interleavedThinking ?? true) &&
        model.compat?.forceAdaptiveThinking !== true) {
        features.push(INTERLEAVED_THINKING_BETA);
    }
    if (shouldUseServerSideFallbackBeta(model))
        features.push(SERVER_SIDE_FALLBACK_BETA);
    if (model.compat?.supportsMidConvoEffort === true) {
        features.push(MID_CONVERSATION_OUTPUT_CONFIG_BETA, THINKING_BINDING_CONTROLS_BETA);
    }
    if (nativeToolChanges)
        features.push(MID_CONVERSATION_TOOL_CHANGES_BETA);
    return [...new Set(features)];
}
function buildParams(model, context, isOAuthToken, options) {
    const { cacheControl } = getCacheControl(model, options?.cacheRetention, options?.env);
    const compat = getAnthropicCompat(model);
    const initialSystemMessage = (0,_utils_transcript_js__WEBPACK_IMPORTED_MODULE_6__/* .getInitialSystemMessage */ .xF)(context.messages);
    const initialSystemText = initialSystemMessage ? (0,_utils_text_js__WEBPACK_IMPORTED_MODULE_13__/* .getSystemMessageText */ .Y8)(initialSystemMessage) : "";
    const transformedMessages = (0,_transform_messages_js__WEBPACK_IMPORTED_MODULE_14__/* .transformMessages */ .b)(context.messages, model, normalizeToolCallId);
    const conversationMessages = initialSystemMessage ? transformedMessages.slice(1) : transformedMessages;
    // Native tool changes reference tools by name, so a redefined name cannot be expressed,
    // and Anthropic rejects a tool list where every tool is deferred, so there must be an
    // initial active tool to anchor the deferred ones. Otherwise the current tool list is sent.
    const initialTools = initialSystemMessage?.toolsAdded ?? [];
    const nativeToolChanges = compat.supportsMidConvoSystemMessages &&
        compat.supportsMidConvoToolChanges &&
        initialTools.length > 0 &&
        !(0,_utils_transcript_js__WEBPACK_IMPORTED_MODULE_6__/* .hasToolRedefinitions */ .qh)(context.messages);
    const converted = convertMessages(conversationMessages, isOAuthToken, cacheControl, compat.allowEmptySignature, model.compat?.supportsMidConvoEffort === true ? model.provider : undefined, nativeToolChanges);
    const activeEffort = options?.effort ?? "high";
    const betaFeatures = getBetaFeatures(model, context, isOAuthToken, nativeToolChanges, options);
    const params = {
        model: model.id,
        messages: model.compat?.supportsMidConvoEffort === true
            ? insertThinkingLevelMessages(converted, activeEffort)
            : converted.messages,
        max_tokens: options?.maxTokens ?? model.maxTokens,
        stream: true,
        ...(betaFeatures.length > 0 ? { betas: betaFeatures } : {}),
    };
    // For OAuth tokens, we MUST include Claude Code identity
    if (isOAuthToken) {
        params.system = [
            {
                type: "text",
                text: "You are Claude Code, Anthropic's official CLI for Claude.",
                ...(cacheControl ? { cache_control: cacheControl } : {}),
            },
        ];
        if (initialSystemText) {
            params.system.push({
                type: "text",
                text: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeSurrogates */ .J)(initialSystemText),
                ...(cacheControl ? { cache_control: cacheControl } : {}),
            });
        }
    }
    else if (initialSystemText) {
        // Add cache control to system prompt for non-OAuth tokens
        params.system = [
            {
                type: "text",
                text: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeSurrogates */ .J)(initialSystemText),
                ...(cacheControl ? { cache_control: cacheControl } : {}),
            },
        ];
    }
    // Temperature is incompatible with extended thinking and unsupported on Claude Opus 4.7+.
    if (options?.temperature !== undefined &&
        !options?.thinkingEnabled &&
        model.compat?.supportsMidConvoEffort !== true &&
        compat.supportsTemperature) {
        params.temperature = options.temperature;
    }
    const toolCacheControl = compat.supportsCacheControlOnTools ? cacheControl : undefined;
    if (nativeToolChanges) {
        // Initial tools stay active with the cache breakpoint on the last one. Every later
        // declaration is deferred and only surfaced by its `tool_addition` block; removed
        // tools stay declared and are withdrawn by `tool_removal`. The request-level list
        // therefore only grows, keeping the cached prefix intact across tool changes.
        const initialNames = new Set(initialTools.map((tool) => tool.name));
        const laterTools = (0,_utils_transcript_js__WEBPACK_IMPORTED_MODULE_6__/* .getDeclaredTools */ .Wg)(context.messages).filter((tool) => !initialNames.has(tool.name));
        params.tools = [
            ...convertTools(initialTools, isOAuthToken, compat.supportsEagerToolInputStreaming, compat.supportsStrictTools, toolCacheControl),
            DEFERRED_TOOL_PLACEHOLDER,
            ...convertTools(laterTools, isOAuthToken, compat.supportsEagerToolInputStreaming, compat.supportsStrictTools).map((tool) => ({ ...tool, defer_loading: true })),
        ];
    }
    else {
        const tools = (0,_utils_transcript_js__WEBPACK_IMPORTED_MODULE_6__/* .getCurrentTools */ .Fh)(context.messages);
        if (tools.length > 0) {
            params.tools = convertTools(tools, isOAuthToken, compat.supportsEagerToolInputStreaming, compat.supportsStrictTools, toolCacheControl);
        }
    }
    // Managed effort models always use adaptive thinking so prefix mismatches can
    // be dropped instead of surfacing as persistent 400 responses.
    if (model.compat?.supportsMidConvoEffort === true) {
        params.thinking = {
            type: "adaptive",
            display: options?.thinkingDisplay ?? "summarized",
            block_binding: { prefix_mismatch_behavior: "drop_block" },
        };
        params.output_config = { effort: "high" };
    }
    else if (model.reasoning) {
        if (options?.thinkingEnabled) {
            // Default to "summarized" so Opus 4.7 and Mythos Preview behave like
            // older Claude 4 models (whose API default is also "summarized").
            const display = options.thinkingDisplay ?? "summarized";
            if (model.compat?.forceAdaptiveThinking === true) {
                // Adaptive thinking: Claude decides when and how much to think.
                params.thinking = { type: "adaptive", display };
                if (options.effort) {
                    params.output_config = { effort: options.effort };
                }
            }
            else {
                // Budget-based thinking for older models
                params.thinking = {
                    type: "enabled",
                    budget_tokens: options.thinkingBudgetTokens || 1024,
                    display,
                };
            }
        }
        else if (options?.thinkingEnabled === false && model.thinkingLevelMap?.off !== null) {
            params.thinking = { type: "disabled" };
        }
    }
    if (options?.metadata) {
        const userId = options.metadata.user_id;
        if (typeof userId === "string") {
            params.metadata = { user_id: userId };
        }
    }
    if (options?.toolChoice) {
        if (typeof options.toolChoice === "string") {
            params.tool_choice = { type: options.toolChoice };
        }
        else {
            params.tool_choice = options.toolChoice;
        }
    }
    const allowedFallbackModels = model.compat?.allowedFallbackModels;
    if (allowedFallbackModels && allowedFallbackModels.length > 0) {
        params.fallbacks = allowedFallbackModels.map((fallback) => ({ model: fallback.model }));
    }
    return params;
}
// Normalize tool call IDs to match Anthropic's required pattern and length
function normalizeToolCallId(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}
function convertToolResult(msg) {
    return {
        type: "tool_result",
        tool_use_id: msg.toolCallId,
        content: convertContentBlocks(msg.content),
        is_error: msg.isError,
    };
}
function convertMessages(transformedMessages, isOAuthToken, cacheControl, allowEmptySignature = false, managedProvider, nativeToolChanges = false) {
    const params = [];
    const assistantLevels = new Map();
    // Later system messages are held back and emitted directly before the next assistant
    // message (or at the end of the transcript). Anthropic requires `tool_result` blocks to
    // immediately follow their `tool_use`, so a system message between them is rejected; this
    // also mirrors where the managed-effort system messages are inserted. As a result an
    // update placed before a user message in the transcript lands after it on the wire.
    const pendingSystemMessages = [];
    const flushPendingSystemMessages = () => {
        params.push(...pendingSystemMessages);
        pendingSystemMessages.length = 0;
    };
    for (let i = 0; i < transformedMessages.length; i++) {
        const msg = transformedMessages[i];
        if (msg.role === "system") {
            // Later system messages only reach this point when the model accepts them natively;
            // otherwise the transcript was collapsed into the leading message before conversion.
            const text = (0,_utils_text_js__WEBPACK_IMPORTED_MODULE_13__/* .renderSystemMessageUpdate */ .m$)(msg);
            const blocks = [];
            if (text.length > 0)
                blocks.push({ type: "text", text: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeSurrogates */ .J)(text) });
            if (nativeToolChanges) {
                for (const tool of msg.toolsRemoved ?? []) {
                    blocks.push({
                        type: "tool_removal",
                        tool: { type: "tool_reference", name: isOAuthToken ? toClaudeCodeName(tool.name) : tool.name },
                    });
                }
                for (const tool of msg.toolsAdded ?? []) {
                    blocks.push({
                        type: "tool_addition",
                        tool: { type: "tool_reference", name: isOAuthToken ? toClaudeCodeName(tool.name) : tool.name },
                    });
                }
            }
            if (blocks.length > 0)
                pendingSystemMessages.push({ role: "system", content: blocks });
        }
        else if (msg.role === "user") {
            if (typeof msg.content === "string") {
                if (msg.content.trim().length > 0) {
                    params.push({
                        role: "user",
                        content: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeSurrogates */ .J)(msg.content),
                    });
                }
            }
            else {
                const blocks = msg.content.map((item) => {
                    if (item.type === "text") {
                        return {
                            type: "text",
                            text: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeSurrogates */ .J)(item.text),
                        };
                    }
                    else {
                        return {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: item.mimeType,
                                data: item.data,
                            },
                        };
                    }
                });
                const filteredBlocks = blocks.filter((b) => {
                    if (b.type === "text") {
                        return b.text.trim().length > 0;
                    }
                    return true;
                });
                if (filteredBlocks.length === 0)
                    continue;
                params.push({
                    role: "user",
                    content: filteredBlocks,
                });
            }
        }
        else if (msg.role === "assistant") {
            flushPendingSystemMessages();
            const blocks = [];
            for (const block of msg.content) {
                if (block.type === "text") {
                    if (block.text.trim().length === 0)
                        continue;
                    blocks.push({
                        type: "text",
                        text: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeSurrogates */ .J)(block.text),
                    });
                }
                else if (block.type === "thinking") {
                    // Redacted thinking: pass the opaque payload back as redacted_thinking
                    if (block.redacted) {
                        blocks.push({
                            type: "redacted_thinking",
                            data: block.thinkingSignature,
                        });
                        continue;
                    }
                    const thinkingSignature = block.thinkingSignature;
                    const hasThinkingSignature = !!thinkingSignature && thinkingSignature.trim().length > 0;
                    if (block.thinking.trim().length === 0 && !hasThinkingSignature)
                        continue;
                    // If thinking signature is missing/empty (e.g., from aborted stream),
                    // convert to plain text for Anthropic. Some compatible providers emit
                    // and accept empty signatures, so let marked models preserve the block.
                    if (!hasThinkingSignature) {
                        blocks.push(allowEmptySignature
                            ? {
                                type: "thinking",
                                thinking: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeSurrogates */ .J)(block.thinking),
                                signature: "",
                            }
                            : {
                                type: "text",
                                text: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeSurrogates */ .J)(block.thinking),
                            });
                    }
                    else {
                        blocks.push({
                            type: "thinking",
                            thinking: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeSurrogates */ .J)(block.thinking),
                            signature: thinkingSignature,
                        });
                    }
                }
                else if (block.type === "toolCall") {
                    blocks.push({
                        type: "tool_use",
                        id: block.id,
                        name: isOAuthToken ? toClaudeCodeName(block.name) : block.name,
                        input: block.arguments ?? {},
                    });
                }
            }
            if (blocks.length === 0)
                continue;
            const messageIndex = params.length;
            params.push({
                role: "assistant",
                content: blocks,
            });
            if (managedProvider !== undefined &&
                msg.api === "anthropic-messages" &&
                msg.provider === managedProvider &&
                isAnthropicEffort(msg.providerThinkingLevel)) {
                assistantLevels.set(messageIndex, msg.providerThinkingLevel);
            }
        }
        else if (msg.role === "toolResult") {
            // Collect all consecutive toolResult messages, needed for z.ai Anthropic endpoint.
            const toolResults = [];
            let j = i;
            while (j < transformedMessages.length && transformedMessages[j].role === "toolResult") {
                toolResults.push(convertToolResult(transformedMessages[j]));
                j++;
            }
            // Skip the messages we've already processed.
            i = j - 1;
            params.push({
                role: "user",
                content: toolResults,
            });
        }
    }
    flushPendingSystemMessages();
    // Add cache_control to the last user or system message to cache conversation history
    if (cacheControl && params.length > 0) {
        const lastMessage = params[params.length - 1];
        if (lastMessage.role === "user" || lastMessage.role === "system") {
            if (Array.isArray(lastMessage.content)) {
                const lastBlock = lastMessage.content[lastMessage.content.length - 1];
                if (lastBlock &&
                    (lastBlock.type === "text" ||
                        lastBlock.type === "image" ||
                        lastBlock.type === "tool_result" ||
                        lastBlock.type === "tool_addition" ||
                        lastBlock.type === "tool_removal")) {
                    lastBlock.cache_control = cacheControl;
                }
            }
            else if (typeof lastMessage.content === "string") {
                lastMessage.content = [
                    {
                        type: "text",
                        text: lastMessage.content,
                        cache_control: cacheControl,
                    },
                ];
            }
        }
    }
    return { messages: params, assistantLevels };
}
function isAnthropicEffort(value) {
    return value === "low" || value === "medium" || value === "high" || value === "xhigh" || value === "max";
}
function insertThinkingLevelMessages(converted, activeEffort) {
    const messages = [];
    for (let index = 0; index < converted.messages.length; index++) {
        const historicalEffort = converted.assistantLevels.get(index);
        if (historicalEffort !== undefined) {
            messages.push({ role: "system", content: [], output_config: { effort: historicalEffort } });
        }
        messages.push(converted.messages[index]);
    }
    messages.push({ role: "system", content: [], output_config: { effort: activeEffort } });
    return messages;
}
function shouldUseFineGrainedToolStreamingBeta(model, context) {
    return (0,_utils_transcript_js__WEBPACK_IMPORTED_MODULE_6__/* .getCurrentTools */ .Fh)(context.messages).length > 0 && !getAnthropicCompat(model).supportsEagerToolInputStreaming;
}
function convertTools(tools, isOAuthToken, supportsEagerToolInputStreaming, supportsStrictTools, cacheControl) {
    if (!tools)
        return [];
    return tools.map((tool, index) => {
        const strict = (0,_constrained_sampling_js__WEBPACK_IMPORTED_MODULE_15__/* .resolveJsonSchemaStrictSampling */ ._F)(tool, supportsStrictTools);
        const parameters = (0,_constrained_sampling_js__WEBPACK_IMPORTED_MODULE_15__/* .getJsonSchemaToolParameters */ .Km)(tool, strict);
        const schema = parameters;
        const legacyInputSchema = {
            type: "object",
            properties: schema.properties ?? {},
            required: schema.required ?? [],
        };
        const inputSchema = strict === true
            ? {
                ...parameters,
                ...legacyInputSchema,
            }
            : legacyInputSchema;
        return {
            name: isOAuthToken ? toClaudeCodeName(tool.name) : tool.name,
            description: tool.description,
            ...(supportsEagerToolInputStreaming ? { eager_input_streaming: true } : {}),
            ...(strict === true ? { strict: true } : {}),
            input_schema: inputSchema,
            ...(cacheControl && index === tools.length - 1 ? { cache_control: cacheControl } : {}),
        };
    });
}
function mapStopReason(reason, stopDetails) {
    switch (reason) {
        case "end_turn":
            return { stopReason: "stop" };
        case "max_tokens":
            return { stopReason: "length" };
        case "tool_use":
            return { stopReason: "toolUse" };
        case "refusal":
            return {
                stopReason: "error",
                errorMessage: stopDetails?.explanation || `The model refused to complete the request`,
            };
        case "pause_turn": // Stop is good enough -> resubmit
            return { stopReason: "stop" };
        case "stop_sequence":
            return { stopReason: "stop" }; // We don't supply stop sequences, so this should never happen
        case "sensitive": // Content flagged by safety filters (not yet in SDK types)
            return { stopReason: "error", errorMessage: "Provider stopped with: sensitive" };
        default:
            // Handle unknown stop reasons gracefully (API may add new values)
            throw new Error(`Unhandled stop reason: ${reason}`);
    }
}
//# sourceMappingURL=anthropic-messages.js.map

/***/ }),

/***/ 26103:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   G0: () => (/* binding */ buildCopilotDynamicHeaders),
/* harmony export */   d1: () => (/* binding */ hasCopilotVisionInput)
/* harmony export */ });
/* unused harmony export inferCopilotInitiator */
// Copilot expects X-Initiator to indicate whether the request is user-initiated
// or agent-initiated (e.g. follow-up after assistant/tool messages).
function inferCopilotInitiator(messages) {
    const last = messages[messages.length - 1];
    return last && last.role !== "user" ? "agent" : "user";
}
// Copilot requires Copilot-Vision-Request header when sending images
function hasCopilotVisionInput(messages) {
    return messages.some((msg) => {
        if (msg.role === "user" && Array.isArray(msg.content)) {
            return msg.content.some((c) => c.type === "image");
        }
        if (msg.role === "toolResult" && Array.isArray(msg.content)) {
            return msg.content.some((c) => c.type === "image");
        }
        return false;
    });
}
function buildCopilotDynamicHeaders(params) {
    const headers = {
        "X-Initiator": inferCopilotInitiator(params.messages),
        "Openai-Intent": "conversation-edits",
    };
    if (params.hasImages) {
        headers["Copilot-Vision-Request"] = "true";
    }
    return headers;
}
//# sourceMappingURL=github-copilot-headers.js.map

/***/ }),

/***/ 55278:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   w: () => (/* binding */ getPiUserAgent)
/* harmony export */ });
function loadNodeOs() {
    if (typeof process === "undefined" || !(process.versions?.node || process.versions?.bun)) {
        return null;
    }
    return process.getBuiltinModule?.("node:os") ?? null;
}
// Keep runtime OS loading browser-safe. A top-level runtime import of node:os breaks browser/Vite builds.
const nodeOs = loadNodeOs();
function getPiUserAgent() {
    return nodeOs ? `pi (${nodeOs.platform()} ${nodeOs.release()}; ${nodeOs.arch()})` : "pi (browser)";
}
//# sourceMappingURL=pi-user-agent.js.map

/***/ }),

/***/ 46863:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   T: () => (/* binding */ retryProviderRequest)
/* harmony export */ });
const DEFAULT_MAX_RETRY_DELAY_MS = 60_000;
function isProviderError(error) {
    if (!(error instanceof Error) || !("status" in error) || !("headers" in error))
        return false;
    return ((error.status === undefined || typeof error.status === "number") &&
        (error.headers === undefined || error.headers instanceof Headers));
}
/** Mirrors the pinned OpenAI/Anthropic SDK retry policy; review when either SDK is upgraded. */
function isRetryableProviderError(error) {
    const shouldRetry = error.headers?.get("x-should-retry");
    if (shouldRetry === "true")
        return true;
    if (shouldRetry === "false")
        return false;
    if (error.status === undefined)
        return true;
    return (error.status === 408 ||
        error.status === 409 ||
        error.status === 429 ||
        (typeof error.status === "number" && error.status >= 500));
}
function validateServerRetryDelayMs(delayMs, maxRetryDelayMs, providerErrorMessage) {
    const maxDelayMs = maxRetryDelayMs ?? DEFAULT_MAX_RETRY_DELAY_MS;
    if (maxDelayMs > 0 && delayMs > maxDelayMs) {
        throw new Error(`Server requested ${Math.ceil(delayMs / 1000)}s retry delay (max: ${Math.ceil(maxDelayMs / 1000)}s). ${providerErrorMessage}`);
    }
    return delayMs;
}
function getRetryDelayMs(error, retryIndex, maxRetryDelayMs) {
    const retryAfterMs = error.headers?.get("retry-after-ms");
    if (retryAfterMs) {
        const value = Number.parseFloat(retryAfterMs);
        if (!Number.isNaN(value))
            return validateServerRetryDelayMs(value, maxRetryDelayMs, error.message);
    }
    const retryAfter = error.headers?.get("retry-after");
    if (retryAfter) {
        const seconds = Number.parseFloat(retryAfter);
        const delayMs = Number.isNaN(seconds) ? Date.parse(retryAfter) - Date.now() : seconds * 1000;
        return validateServerRetryDelayMs(delayMs, maxRetryDelayMs, error.message);
    }
    const exponentialDelay = Math.min(0.5 * 2 ** retryIndex, 8) * 1000;
    return exponentialDelay * (1 - Math.random() * 0.25);
}
function createAbortError() {
    const error = new Error("Request aborted");
    error.name = "AbortError";
    return error;
}
function abortableSleep(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(createAbortError());
            return;
        }
        const onAbort = () => {
            clearTimeout(timeout);
            reject(createAbortError());
        };
        const timeout = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, Math.max(0, ms));
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}
/**
 * Reproduce the retry behavior used by the OpenAI and Anthropic SDKs while making
 * their backoff sleep interruptible. Their built-in retry timers ignore the
 * request AbortSignal, so callers must invoke the SDK with `maxRetries: 0` and
 * wrap the request with this helper. Provider-requested delays above
 * `maxRetryDelayMs` fail immediately (60 seconds by default); set it to zero to
 * disable the limit.
 */
async function retryProviderRequest(request, options = {}) {
    const maxRetries = options.maxRetries ?? 0;
    let retriesRemaining = maxRetries;
    for (;;) {
        try {
            // Each retry is a fresh SDK request, so X-Stainless-Retry-Count remains zero.
            return await request();
        }
        catch (error) {
            if (options.signal?.aborted)
                throw createAbortError();
            if (retriesRemaining <= 0 || !isProviderError(error) || !isRetryableProviderError(error))
                throw error;
            const retryIndex = maxRetries - retriesRemaining;
            retriesRemaining--;
            await abortableSleep(getRetryDelayMs(error, retryIndex, options.maxRetryDelayMs), options.signal);
        }
    }
}
//# sourceMappingURL=provider-retry.js.map

/***/ })

};
