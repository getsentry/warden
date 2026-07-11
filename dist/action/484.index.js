export const id = 484;
export const ids = [484,713,94];
export const modules = {

/***/ 46157:
/***/ ((module) => {

function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(() => {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = () => ([]);
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = 46157;
module.exports = webpackEmptyAsyncContext;

/***/ }),

/***/ 70713:
/***/ ((module) => {

function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(() => {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = () => ([]);
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = 70713;
module.exports = webpackEmptyAsyncContext;

/***/ }),

/***/ 83950:
/***/ ((module) => {

function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(() => {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = () => ([]);
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = 83950;
module.exports = webpackEmptyAsyncContext;

/***/ }),

/***/ 83264:
/***/ ((module) => {

function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(() => {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = () => ([]);
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = 83264;
module.exports = webpackEmptyAsyncContext;

/***/ }),

/***/ 98229:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   $d: () => (/* binding */ isRetryableError),
/* harmony export */   $w: () => (/* binding */ sanitizeErrorMessage),
/* harmony export */   Aq: () => (/* binding */ WardenAuthenticationError),
/* harmony export */   HD: () => (/* binding */ isAuthenticationError),
/* harmony export */   Ip: () => (/* binding */ isAuthenticationErrorMessage),
/* harmony export */   Ro: () => (/* binding */ humanizeProviderError),
/* harmony export */   bk: () => (/* binding */ mapExtractionErrorCode),
/* harmony export */   cy: () => (/* binding */ SkillRunnerError),
/* harmony export */   fe: () => (/* binding */ classifyError),
/* harmony export */   mu: () => (/* binding */ isSubprocessError)
/* harmony export */ });
/* harmony import */ var _anthropic_ai_sdk__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(36965);
/* harmony import */ var _runtimes_model_selectors_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(85286);


class SkillRunnerError extends Error {
    /** Optional classification so callers skip message-sniffing. */
    code;
    constructor(message, options) {
        super(message, options);
        this.name = 'SkillRunnerError';
        if (options?.code)
            this.code = options.code;
    }
}
const SENSITIVE_VALUE = '[redacted]';
/**
 * Remove likely credential material before an error message is surfaced through
 * logs, callbacks, reports, or telemetry.
 */
function sanitizeErrorMessage(message) {
    return message
        .replace(/\b(sk-ant-[A-Za-z0-9_-]+)/g, SENSITIVE_VALUE)
        .replace(/\b(sk-[A-Za-z0-9_-]{16,})\b/g, SENSITIVE_VALUE)
        .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, `$1${SENSITIVE_VALUE}`)
        .replace(/\b(authorization)(\s*[:=]\s*)(["']?)(Bearer\s+)?[^"',\s)]+/gi, (_match, key, separator, quote, bearer) => `${key}${separator}${quote}${bearer ?? ''}${SENSITIVE_VALUE}`)
        .replace(/\b(api[_-]?key|x-api-key|auth[_-]?token|oauth[_-]?token|token)(\s*[:=]\s*)(["']?)[^"',\s)]+/gi, `$1$2$3${SENSITIVE_VALUE}`);
}
/** Patterns that indicate an authentication failure */
const AUTH_ERROR_PATTERNS = [
    'authentication',
    'unauthorized',
    'invalid.*api.*key',
    'invalid.*key',
    'not.*logged.*in',
    'login.*required',
    'api key',
];
/**
 * Check if an error message indicates an authentication failure.
 */
function isAuthenticationErrorMessage(message) {
    return AUTH_ERROR_PATTERNS.some((pattern) => new RegExp(pattern, 'i').test(message));
}
/** User-friendly error message for authentication failures (Claude runtime) */
const CLAUDE_AUTH_GUIDANCE = `
  claude login                             # Use local Claude Code auth
  export WARDEN_ANTHROPIC_API_KEY=sk-...   # Or use API key

https://console.anthropic.com/ for API keys`;
/** User-friendly error message for authentication failures (Pi runtime) */
const PI_AUTH_GUIDANCE = `
  export WARDEN_MODEL=provider/model-id    # e.g. openai/gpt-5.5
  export WARDEN_{PROVIDER}_API_KEY=...     # WARDEN-prefixed key for that provider

See https://warden.sentry.dev/config/models for provider selectors and credential names.`;
/** IPC/subprocess failure error codes (EPIPE, ECONNRESET, etc.) */
const IPC_ERROR_CODES = ['EPIPE', 'ECONNRESET', 'ECONNREFUSED', 'ENOTCONN'];
/**
 * Check if an error is an IPC/subprocess failure.
 * These occur when the Claude Code subprocess can't communicate (e.g., sandbox restrictions).
 */
function isSubprocessError(error) {
    if (!(error instanceof Error))
        return false;
    // Check error.code property (Node.js ErrnoException) first
    const errorCode = error.code;
    if (errorCode && IPC_ERROR_CODES.includes(errorCode))
        return true;
    // Fallback: check the original error message only, not appended stderr content.
    // executeQuery appends "\nClaude Code stderr: ..." which could contain IPC codes
    // from debug output, causing false positives.
    const stderrIdx = error.message.indexOf('\nClaude Code stderr:');
    const message = stderrIdx >= 0 ? error.message.slice(0, stderrIdx) : error.message;
    return IPC_ERROR_CODES.some((code) => message.includes(code));
}
class WardenAuthenticationError extends Error {
    constructor(sdkError, options) {
        const { cause, runtime } = options ?? {};
        const guidance = runtime === 'pi' ? PI_AUTH_GUIDANCE : CLAUDE_AUTH_GUIDANCE;
        const message = sdkError
            ? `Authentication failed: ${sdkError}\n${guidance}`
            : `Authentication required.${guidance}`;
        super(message, { cause });
        this.name = 'WardenAuthenticationError';
    }
}
/**
 * Check if an error is retryable.
 * Retries on: rate limits (429), server errors (5xx), connection errors, timeouts.
 */
function isRetryableError(error) {
    if (error instanceof _anthropic_ai_sdk__WEBPACK_IMPORTED_MODULE_0__/* .RateLimitError */ .OE)
        return true;
    if (error instanceof _anthropic_ai_sdk__WEBPACK_IMPORTED_MODULE_0__/* .InternalServerError */ .PO)
        return true;
    if (error instanceof _anthropic_ai_sdk__WEBPACK_IMPORTED_MODULE_0__/* .APIConnectionError */ .xX)
        return true;
    if (error instanceof _anthropic_ai_sdk__WEBPACK_IMPORTED_MODULE_0__/* .APIConnectionTimeoutError */ .qA)
        return true;
    // Check for generic APIError with retryable status codes
    if (error instanceof _anthropic_ai_sdk__WEBPACK_IMPORTED_MODULE_0__/* .APIError */ .LG) {
        const status = error.status;
        if (status === 429)
            return true;
        if (status !== undefined && status >= 500 && status < 600)
            return true;
    }
    return false;
}
/**
 * Check if an error indicates an unavailable provider/runtime.
 * These failures can recover later, but repeated failures should stop the run.
 */
function isProviderUnavailableError(error) {
    if (isRetryableError(error))
        return true;
    const message = error instanceof Error ? error.message : String(error);
    return (/Claude Code process exited with code \d+/i.test(message) ||
        /Claude Code stderr:[\s\S]*\b(overloaded|rate limit|timed? out|timeout|ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT)\b/i.test(message));
}
/**
 * Check if an error is an authentication failure.
 * These require user action (login or API key) and should not be retried.
 */
function isAuthenticationError(error) {
    if (error instanceof _anthropic_ai_sdk__WEBPACK_IMPORTED_MODULE_0__/* .APIError */ .LG && error.status === 401) {
        return true;
    }
    // Check error message for common auth failure patterns
    const message = error instanceof Error ? error.message : String(error);
    return isAuthenticationErrorMessage(message);
}
/** Classify an unknown error into a stable ErrorCode + message. */
function classifyError(error) {
    const message = error instanceof Error ? error.message : String(error ?? 'unknown error');
    if (error instanceof WardenAuthenticationError) {
        return { code: 'auth_failed', message };
    }
    if (error instanceof SkillRunnerError && error.code) {
        return { code: error.code, message };
    }
    if (error instanceof _runtimes_model_selectors_js__WEBPACK_IMPORTED_MODULE_1__/* .InvalidPiModelSelectorError */ .n1) {
        return { code: 'invalid_model_selector', message };
    }
    if (isSubprocessError(error)) {
        return { code: 'subprocess_failure', message };
    }
    if (isAuthenticationError(error)) {
        return { code: 'auth_failed', message };
    }
    if (isProviderUnavailableError(error)) {
        return { code: 'provider_unavailable', message: humanizeProviderError(error) };
    }
    if (error instanceof Error && error.name === 'AbortError') {
        return { code: 'aborted', message };
    }
    if (/\baborted\b/i.test(message)) {
        return { code: 'aborted', message };
    }
    return { code: 'unknown', message };
}
/** Human-friendly messages for known Anthropic API error types. */
const ANTHROPIC_ERROR_LABELS = {
    overloaded_error: 'Anthropic is overloaded — try again later.',
    rate_limit_error: 'Anthropic rate limit reached — try again later.',
    api_error: 'Anthropic API error — try again later.',
    authentication_error: 'Anthropic authentication error.',
};
function humanizeProviderErrorPayload(payload) {
    const body = payload && typeof payload === 'object' ? payload : undefined;
    const rawError = body?.error ?? body;
    const error = rawError && typeof rawError === 'object' ? rawError : undefined;
    const type = typeof error?.type === 'string' ? error.type : undefined;
    const message = typeof error?.message === 'string' ? error.message : undefined;
    return type ? ANTHROPIC_ERROR_LABELS[type] ?? message : message;
}
/**
 * Extract a human-readable summary from a raw provider error.
 *
 * Structured Anthropic error bodies are preferred so summaries are based on the
 * provider error type. String errors fall back to parsing embedded JSON
 * before returning the text prefix or original message.
 */
function humanizeProviderError(error) {
    const payload = error instanceof _anthropic_ai_sdk__WEBPACK_IMPORTED_MODULE_0__/* .APIError */ .LG
        ? error.error
        : error;
    const structuredSummary = humanizeProviderErrorPayload(payload);
    if (structuredSummary)
        return structuredSummary;
    const message = error instanceof Error ? error.message : String(error);
    const jsonStart = message.indexOf('{');
    if (jsonStart < 0)
        return message;
    try {
        const jsonSummary = humanizeProviderErrorPayload(JSON.parse(message.slice(jsonStart)));
        if (jsonSummary)
            return jsonSummary;
    }
    catch {
        // Ignore malformed embedded JSON and fall back to the readable prefix.
    }
    return message.slice(0, jsonStart).replace(/[:\s]+$/, '').trim() || message;
}
/** Map an internal extract.ts error string to a stable public ErrorCode. */
function mapExtractionErrorCode(raw) {
    if (!raw)
        return 'unknown';
    if (raw === 'invalid_json')
        return 'extraction_invalid_json';
    if (raw === 'unbalanced_json')
        return 'extraction_unbalanced_json';
    if (raw === 'no_findings_json' || raw === 'no_findings_to_extract')
        return 'extraction_no_findings_json';
    if (raw === 'missing_findings_key')
        return 'extraction_missing_findings_key';
    if (raw === 'findings_not_array')
        return 'extraction_findings_not_array';
    if (raw === 'no_api_key_for_fallback')
        return 'extraction_no_api_key';
    if (raw.startsWith('llm_extraction_failed')) {
        if (/timeout|timed out/i.test(raw))
            return 'extraction_llm_timeout';
        return 'extraction_llm_failed';
    }
    return 'unknown';
}


/***/ }),

/***/ 39026:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   eg: () => (/* binding */ extractJson),
/* harmony export */   tQ: () => (/* binding */ callHaiku),
/* harmony export */   u2: () => (/* binding */ callHaikuWithTools)
/* harmony export */ });
/* unused harmony exports HAIKU_MODEL, DEFAULT_AUXILIARY_MAX_RETRIES, setGenAiResponseAttrs */
/* harmony import */ var _anthropic_ai_sdk__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(36965);
/* harmony import */ var _sentry_trace_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(68016);
/* harmony import */ var _pricing_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(64602);
/* harmony import */ var _usage_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(44759);
/* harmony import */ var _otel_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(85884);





const HAIKU_MODEL = 'claude-haiku-4-5';
const DEFAULT_AUXILIARY_MAX_RETRIES = 5;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_TOKENS = 4096;
/**
 * Set standard gen_ai response attributes on a Sentry span.
 *
 * Follows the same token accounting as analyze.ts: gen_ai.usage.input_tokens
 * is the total (non-cached + cache_read + cache_creation), with cache fields
 * as subsets.
 */
function setGenAiResponseAttrs(span, usage, stopReason, responseText) {
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    const rawCacheWrite = usage.cache_creation_input_tokens ?? 0;
    const tieredCacheWrite = (usage.cache_creation?.ephemeral_5m_input_tokens ?? 0) +
        (usage.cache_creation?.ephemeral_1h_input_tokens ?? 0);
    const cacheWrite = Math.max(rawCacheWrite, tieredCacheWrite);
    (0,_otel_js__WEBPACK_IMPORTED_MODULE_3__/* .setGenAiUsageAttrs */ .qk)(span, {
        inputTokens: usage.input_tokens + cacheRead + cacheWrite,
        outputTokens: usage.output_tokens,
        cacheReadInputTokens: cacheRead,
        cacheCreationInputTokens: cacheWrite,
        cacheCreation5mInputTokens: usage.cache_creation?.ephemeral_5m_input_tokens ?? cacheWrite,
        cacheCreation1hInputTokens: usage.cache_creation?.ephemeral_1h_input_tokens ?? 0,
        webSearchRequests: 0,
        costUSD: 0,
    });
    if (stopReason) {
        span.setAttribute('gen_ai.response.finish_reasons', [stopReason]);
    }
    if (responseText !== undefined) {
        (0,_otel_js__WEBPACK_IMPORTED_MODULE_3__/* .setGenAiOutputMessagesAttr */ .hX)(span, responseText, stopReason);
    }
}
/**
 * Extract the first JSON object or array from LLM text.
 * Handles markdown code fences and prose before/after JSON.
 */
function extractJson(text) {
    const stripped = text.trim();
    // Try parsing the whole thing first (common case: clean JSON output)
    try {
        JSON.parse(stripped);
        return stripped;
    }
    catch {
        // Fall through to extraction
    }
    // Try every object/array opener. This handles prose, fenced JSON, orphaned
    // prefill, and markdown fences embedded inside JSON string values.
    for (let start = 0; start < stripped.length; start++) {
        const opener = stripped[start];
        if (opener !== '{' && opener !== '[') {
            continue;
        }
        const stack = [opener === '{' ? '}' : ']'];
        let inString = false;
        let escape = false;
        for (let i = start + 1; i < stripped.length; i++) {
            const char = stripped[i];
            if (escape) {
                escape = false;
                continue;
            }
            if (char === '\\' && inString) {
                escape = true;
                continue;
            }
            if (char === '"') {
                inString = !inString;
                continue;
            }
            if (inString) {
                continue;
            }
            if (char === '{') {
                stack.push('}');
                continue;
            }
            if (char === '[') {
                stack.push(']');
                continue;
            }
            const expectedCloser = stack[stack.length - 1];
            if (char === '}' || char === ']') {
                if (char !== expectedCloser) {
                    break;
                }
                stack.pop();
                if (stack.length === 0) {
                    const candidate = stripped.slice(start, i + 1);
                    try {
                        JSON.parse(candidate);
                        return candidate;
                    }
                    catch {
                        break;
                    }
                }
            }
        }
    }
    return null;
}
/**
 * Infer prefill character from schema type to force JSON output.
 */
function inferPrefill(schema) {
    // Check for ZodObject (name === 'ZodObject')
    if ('_def' in schema && schema._def.typeName === 'ZodObject')
        return '{';
    // Check for ZodArray
    if ('_def' in schema && schema._def.typeName === 'ZodArray')
        return '[';
    return undefined;
}
/**
 * Single-turn structured Haiku call.
 * Auto-prefills based on Zod schema type, extracts JSON, validates with Zod.
 */
async function callHaiku(options) {
    const { apiKey, prompt, schema, agentName, task, model = HAIKU_MODEL, maxTokens = DEFAULT_MAX_TOKENS, timeout = DEFAULT_TIMEOUT_MS, maxRetries = DEFAULT_AUXILIARY_MAX_RETRIES } = options;
    return (0,_sentry_trace_js__WEBPACK_IMPORTED_MODULE_1__/* .startTracedSpan */ .wZ)({
        op: 'gen_ai.chat',
        name: (0,_otel_js__WEBPACK_IMPORTED_MODULE_3__/* .genAiSpanName */ .kj)('chat', model),
        attributes: {
            'gen_ai.operation.name': 'chat',
            'gen_ai.provider.name': 'anthropic',
            ...(agentName ? { 'gen_ai.agent.name': agentName } : {}),
            ...(task ? { 'warden.ai.task': task } : {}),
            'gen_ai.request.model': model,
            'gen_ai.request.max_tokens': maxTokens,
            'gen_ai.output.type': 'json',
        },
    }, async (span) => {
        const client = new _anthropic_ai_sdk__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay({ apiKey, timeout, maxRetries });
        const prefill = inferPrefill(schema);
        const messages = [
            { role: 'user', content: prompt },
        ];
        if (prefill) {
            messages.push({ role: 'assistant', content: prefill });
        }
        (0,_otel_js__WEBPACK_IMPORTED_MODULE_3__/* .setGenAiInputMessagesAttr */ .uQ)(span, messages);
        try {
            const response = await client.messages.create({
                model,
                max_tokens: maxTokens,
                messages,
            });
            const usage = (0,_pricing_js__WEBPACK_IMPORTED_MODULE_2__/* .apiUsageToStats */ .Y4)(model, response.usage);
            const content = response.content[0];
            if (!content || content.type !== 'text') {
                setGenAiResponseAttrs(span, response.usage, response.stop_reason);
                span.setAttribute('error.type', 'empty_response');
                return { success: false, error: 'Empty response from model', usage };
            }
            let fullText = content.text;
            if (prefill) {
                fullText = prefill + fullText;
            }
            setGenAiResponseAttrs(span, response.usage, response.stop_reason, fullText);
            const jsonStr = extractJson(fullText);
            if (!jsonStr) {
                span.setAttribute('error.type', 'invalid_json');
                return { success: false, error: 'No JSON found in response', usage };
            }
            const parsed = JSON.parse(jsonStr);
            const validated = schema.safeParse(parsed);
            if (!validated.success) {
                span.setAttribute('error.type', 'validation_error');
                return { success: false, error: `Validation failed: ${validated.error.message}`, usage };
            }
            return { success: true, data: validated.data, usage };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            span.setAttribute('error.type', error instanceof Error ? error.name : '_OTHER');
            return { success: false, error: message, usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_4__/* .emptyUsage */ .ly)() };
        }
    });
}
/**
 * Multi-turn Haiku call with tool use loop.
 * Iterates tool calls until the model produces a final text response.
 * Accumulates usage across all iterations.
 *
 * Telemetry mirrors an agent run: the outer span describes the local
 * orchestration, each Anthropic API call gets its own `gen_ai.chat` span, and
 * every application-executed tool call is recorded as `gen_ai.execute_tool`.
 */
async function callHaikuWithTools(options) {
    const { apiKey, prompt, schema, tools, executeTool, agentName, task, model = HAIKU_MODEL, maxTokens = DEFAULT_MAX_TOKENS, maxIterations = 5, timeout = DEFAULT_TIMEOUT_MS, maxRetries = DEFAULT_AUXILIARY_MAX_RETRIES, } = options;
    return (0,_sentry_trace_js__WEBPACK_IMPORTED_MODULE_1__/* .startTracedSpan */ .wZ)({
        op: 'gen_ai.invoke_agent',
        name: (0,_otel_js__WEBPACK_IMPORTED_MODULE_3__/* .genAiSpanName */ .kj)('invoke_agent', agentName),
        attributes: {
            'gen_ai.operation.name': 'invoke_agent',
            'gen_ai.provider.name': 'anthropic',
            ...(agentName ? { 'gen_ai.agent.name': agentName } : {}),
            ...(task ? { 'warden.ai.task': task } : {}),
            'gen_ai.request.model': model,
            'gen_ai.request.max_tokens': maxTokens,
            'gen_ai.output.type': 'json',
        },
    }, async (span) => {
        const client = new _anthropic_ai_sdk__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay({ apiKey, timeout, maxRetries });
        const toolDescriptions = new Map(tools
            .map((tool) => [tool.name, tool.description])
            .filter((entry) => typeof entry[1] === 'string' && entry[1].length > 0));
        // No prefill for tool-use loops: prefill biases the model to output JSON
        // immediately instead of calling tools to gather information first.
        const messages = [
            { role: 'user', content: prompt },
        ];
        const usages = [];
        // Accumulate raw API usage across iterations so setGenAiResponseAttrs
        // can compute totals consistently (input_tokens + cache subsets).
        const cumulativeUsage = {
            input_tokens: 0,
            output_tokens: 0,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0,
            cache_creation: {
                ephemeral_5m_input_tokens: 0,
                ephemeral_1h_input_tokens: 0,
            },
        };
        function setFinalSpanAttrs(stopReason) {
            setGenAiResponseAttrs(span, cumulativeUsage, stopReason);
        }
        function currentUsage() {
            return usages.length > 0 ? (0,_usage_js__WEBPACK_IMPORTED_MODULE_4__/* .aggregateUsage */ .Z$)(usages) : (0,_usage_js__WEBPACK_IMPORTED_MODULE_4__/* .emptyUsage */ .ly)();
        }
        async function runModelIteration() {
            const inputMessages = [...messages];
            return (0,_sentry_trace_js__WEBPACK_IMPORTED_MODULE_1__/* .startTracedSpan */ .wZ)({
                op: 'gen_ai.chat',
                name: (0,_otel_js__WEBPACK_IMPORTED_MODULE_3__/* .genAiSpanName */ .kj)('chat', model),
                parentSpan: span,
                attributes: {
                    'gen_ai.operation.name': 'chat',
                    'gen_ai.provider.name': 'anthropic',
                    ...(agentName ? { 'gen_ai.agent.name': agentName } : {}),
                    ...(task ? { 'warden.ai.task': task } : {}),
                    'gen_ai.request.model': model,
                    'gen_ai.request.max_tokens': maxTokens,
                    'gen_ai.output.type': 'json',
                },
            }, async (chatSpan) => {
                (0,_otel_js__WEBPACK_IMPORTED_MODULE_3__/* .setGenAiInputMessagesAttr */ .uQ)(chatSpan, inputMessages);
                try {
                    const response = await client.messages.create({
                        model,
                        max_tokens: maxTokens,
                        messages: inputMessages,
                        tools,
                    });
                    setGenAiResponseAttrs(chatSpan, response.usage, response.stop_reason);
                    (0,_otel_js__WEBPACK_IMPORTED_MODULE_3__/* .setGenAiOutputMessagesAttrFromMessages */ .L6)(chatSpan, [{
                            role: response.role,
                            content: response.content,
                            finishReason: response.stop_reason,
                        }]);
                    return response;
                }
                catch (error) {
                    chatSpan.setAttribute('error.type', error instanceof Error ? error.name : '_OTHER');
                    throw error;
                }
            });
        }
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            let response;
            try {
                response = await runModelIteration();
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                span.setAttribute('error.type', error instanceof Error ? error.name : '_OTHER');
                return { success: false, error: message, usage: currentUsage() };
            }
            usages.push((0,_pricing_js__WEBPACK_IMPORTED_MODULE_2__/* .apiUsageToStats */ .Y4)(model, response.usage));
            cumulativeUsage.input_tokens += response.usage.input_tokens;
            cumulativeUsage.output_tokens += response.usage.output_tokens;
            cumulativeUsage.cache_read_input_tokens += response.usage.cache_read_input_tokens ?? 0;
            cumulativeUsage.cache_creation_input_tokens += response.usage.cache_creation_input_tokens ?? 0;
            cumulativeUsage.cache_creation.ephemeral_5m_input_tokens +=
                response.usage.cache_creation?.ephemeral_5m_input_tokens ?? 0;
            cumulativeUsage.cache_creation.ephemeral_1h_input_tokens +=
                response.usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
            // Handle tool use
            if (response.stop_reason === 'tool_use') {
                const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');
                if (toolUseBlocks.length === 0) {
                    span.setAttribute('error.type', 'missing_tool_call');
                    return { success: false, error: 'Tool use indicated but no tool calls found', usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_4__/* .aggregateUsage */ .Z$)(usages) };
                }
                const toolResults = [];
                for (const block of toolUseBlocks) {
                    await (0,_sentry_trace_js__WEBPACK_IMPORTED_MODULE_1__/* .startTracedSpan */ .wZ)({
                        op: 'gen_ai.execute_tool',
                        name: `execute_tool ${block.name}`,
                        parentSpan: span,
                        attributes: (0,_otel_js__WEBPACK_IMPORTED_MODULE_3__/* .genAiToolCallAttributes */ .Mf)({
                            agentName,
                            task,
                            toolName: block.name,
                            toolDescription: toolDescriptions.get(block.name),
                            toolCallId: block.id,
                            toolType: 'function',
                            arguments: block.input,
                        }),
                    }, async (toolSpan) => {
                        try {
                            const result = await executeTool(block.name, block.input);
                            for (const [key, value] of Object.entries((0,_otel_js__WEBPACK_IMPORTED_MODULE_3__/* .genAiToolCallAttributes */ .Mf)({
                                toolName: block.name,
                                result,
                            }))) {
                                toolSpan.setAttribute(key, value);
                            }
                            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
                        }
                        catch (error) {
                            const errMsg = error instanceof Error ? error.message : String(error);
                            toolSpan.setAttribute('error.type', error instanceof Error ? error.name : '_OTHER');
                            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: errMsg, is_error: true });
                        }
                    });
                }
                messages.push({ role: 'assistant', content: response.content });
                messages.push({ role: 'user', content: toolResults });
                continue;
            }
            // Final response - extract text and set span attributes
            if (response.stop_reason !== 'end_turn' && response.stop_reason !== 'max_tokens') {
                setFinalSpanAttrs(response.stop_reason);
                span.setAttribute('error.type', 'unexpected_stop_reason');
                return { success: false, error: `Unexpected stop reason: ${response.stop_reason}`, usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_4__/* .aggregateUsage */ .Z$)(usages) };
            }
            const textBlock = response.content.find((b) => b.type === 'text');
            if (!textBlock) {
                setFinalSpanAttrs(response.stop_reason);
                span.setAttribute('error.type', 'empty_response');
                return { success: false, error: 'No text in final response', usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_4__/* .aggregateUsage */ .Z$)(usages) };
            }
            setFinalSpanAttrs(response.stop_reason);
            const jsonStr = extractJson(textBlock.text);
            if (!jsonStr) {
                span.setAttribute('error.type', 'invalid_json');
                return { success: false, error: 'No JSON found in response', usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_4__/* .aggregateUsage */ .Z$)(usages) };
            }
            const parsed = JSON.parse(jsonStr);
            const validated = schema.safeParse(parsed);
            if (!validated.success) {
                span.setAttribute('error.type', 'validation_error');
                return { success: false, error: `Validation failed: ${validated.error.message}`, usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_4__/* .aggregateUsage */ .Z$)(usages) };
            }
            return { success: true, data: validated.data, usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_4__/* .aggregateUsage */ .Z$)(usages) };
        }
        // Max iterations exceeded - still record usage on span
        setFinalSpanAttrs();
        span.setAttribute('error.type', 'max_tool_iterations');
        return { success: false, error: 'Max tool iterations exceeded', usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_4__/* .aggregateUsage */ .Z$)(usages) };
    });
}


/***/ }),

/***/ 85884:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Jo: () => (/* binding */ genAiProviderName),
/* harmony export */   L6: () => (/* binding */ setGenAiOutputMessagesAttrFromMessages),
/* harmony export */   Mf: () => (/* binding */ genAiToolCallAttributes),
/* harmony export */   bO: () => (/* binding */ genAiUsageAttributes),
/* harmony export */   hX: () => (/* binding */ setGenAiOutputMessagesAttr),
/* harmony export */   kj: () => (/* binding */ genAiSpanName),
/* harmony export */   kq: () => (/* binding */ setGenAiSystemInstructionsAttr),
/* harmony export */   qk: () => (/* binding */ setGenAiUsageAttrs),
/* harmony export */   uQ: () => (/* binding */ setGenAiInputMessagesAttr)
/* harmony export */ });
const PROVIDER_NAME_ALIASES = {
    mistral: 'mistral_ai',
    xai: 'x_ai',
};
function providerFromModel(model) {
    if (!model) {
        return undefined;
    }
    const slashIndex = model.indexOf('/');
    if (slashIndex > 0) {
        const provider = model.slice(0, slashIndex);
        return PROVIDER_NAME_ALIASES[provider] ?? provider;
    }
    return undefined;
}
/** Resolve the OpenTelemetry GenAI provider name from runtime and model selectors. */
function genAiProviderName(runtime, model) {
    return providerFromModel(model) ?? (runtime === 'pi' ? 'pi' : 'anthropic');
}
/** Build OTel GenAI span names as `<operation> <semantic target>`, when known. */
function genAiSpanName(operationName, targetName) {
    const trimmedTarget = targetName?.trim();
    return trimmedTarget ? `${operationName} ${trimmedTarget}` : operationName;
}
/** Build current OpenTelemetry GenAI usage attributes from normalized usage. */
function genAiUsageAttributes(usage) {
    return {
        'gen_ai.usage.input_tokens': usage.inputTokens,
        'gen_ai.usage.output_tokens': usage.outputTokens,
        'gen_ai.usage.cache_read.input_tokens': usage.cacheReadInputTokens ?? 0,
        'gen_ai.usage.cache_creation.input_tokens': usage.cacheCreationInputTokens ?? 0,
    };
}
function stringifyGenAiAttribute(value) {
    if (value === undefined) {
        return undefined;
    }
    try {
        const json = JSON.stringify(value);
        return json === undefined ? String(value) : json;
    }
    catch {
        return String(value);
    }
}
/**
 * Build OpenTelemetry GenAI attributes for an executed tool call span.
 *
 * Tool arguments and results are opt-in content attributes in OTel. Sentry span
 * data and Warden's local trace schema only preserve primitive attributes, so
 * structured values are JSON-encoded at this boundary.
 */
function genAiToolCallAttributes(args) {
    const attributes = {
        'gen_ai.operation.name': 'execute_tool',
        ...(args.agentName ? { 'gen_ai.agent.name': args.agentName } : {}),
        ...(args.task ? { 'warden.ai.task': args.task } : {}),
        'gen_ai.tool.name': args.toolName,
        ...(args.toolDescription ? { 'gen_ai.tool.description': args.toolDescription } : {}),
        ...(args.toolCallId ? { 'gen_ai.tool.call.id': args.toolCallId } : {}),
        ...(args.toolType ? { 'gen_ai.tool.type': args.toolType } : {}),
    };
    const serializedArguments = stringifyGenAiAttribute(args.arguments);
    if (serializedArguments !== undefined) {
        attributes['gen_ai.tool.call.arguments'] = serializedArguments;
    }
    const serializedResult = args.isError ? undefined : stringifyGenAiAttribute(args.result);
    if (serializedResult !== undefined) {
        attributes['gen_ai.tool.call.result'] = serializedResult;
    }
    return attributes;
}
/** Set GenAI token usage attributes expected by Sentry AI monitoring. */
function setGenAiUsageAttrs(span, usage) {
    for (const [key, value] of Object.entries(genAiUsageAttributes(usage))) {
        span.setAttribute(key, value);
    }
}
/** Set OpenTelemetry GenAI system-instruction attributes for prompt spans. */
function setGenAiSystemInstructionsAttr(span, systemPrompt) {
    span.setAttribute('gen_ai.system_instructions', JSON.stringify([
        { type: 'text', content: systemPrompt },
    ]));
}
function normalizeContentPart(part) {
    if (!part || typeof part !== 'object') {
        return { type: 'text', content: String(part ?? '') };
    }
    const block = part;
    if (block['type'] === 'text' && typeof block['text'] === 'string') {
        return { type: 'text', content: block['text'] };
    }
    if (block['type'] === 'tool_use') {
        return {
            type: 'tool_call',
            id: block['id'],
            name: block['name'],
            arguments: block['input'],
        };
    }
    if (block['type'] === 'toolCall') {
        return {
            type: 'tool_call',
            id: block['id'],
            name: block['name'],
            arguments: block['arguments'],
        };
    }
    if (block['type'] === 'tool_result') {
        return {
            type: 'tool_call_response',
            id: block['tool_use_id'],
            result: normalizeToolResultContent(block['content']),
        };
    }
    return { ...block };
}
function normalizeToolResultContent(content) {
    if (Array.isArray(content)) {
        const normalized = content.map(normalizeContentPart);
        if (normalized.length === 1
            && normalized[0]?.['type'] === 'text'
            && typeof normalized[0]?.['content'] === 'string') {
            return normalized[0]['content'];
        }
        return normalized;
    }
    return content;
}
function finishReasonAttrs(message) {
    return message.finishReason ? { finish_reason: message.finishReason } : {};
}
function normalizeMessage(message) {
    const { role, content } = message;
    if ((role === 'tool' || role === 'toolResult') && message.toolCallId) {
        return {
            role: 'tool',
            parts: [{
                    type: 'tool_call_response',
                    id: message.toolCallId,
                    result: normalizeToolResultContent(content),
                }],
        };
    }
    const contentParts = Array.isArray(content) ? content : undefined;
    // Anthropic tool results arrive as user messages; OTel records them as tool
    // messages so trace readers can reconstruct the request/result pairing.
    const normalizedRole = role === 'toolResult'
        || (role === 'user'
            && contentParts?.length
            && contentParts.every((part) => Boolean(part && typeof part === 'object' && part['type'] === 'tool_result')))
        ? 'tool'
        : role;
    if (typeof content === 'string') {
        return {
            role: normalizedRole,
            parts: [{ type: 'text', content }],
            ...finishReasonAttrs(message),
        };
    }
    if (Array.isArray(content)) {
        return {
            role: normalizedRole,
            parts: content.map(normalizeContentPart),
            ...finishReasonAttrs(message),
        };
    }
    return {
        role: normalizedRole,
        parts: [normalizeContentPart(content)],
        ...finishReasonAttrs(message),
    };
}
/** Set OTel GenAI input messages from raw runtime transcript messages. */
function setGenAiInputMessagesAttr(span, messages) {
    span.setAttribute('gen_ai.input.messages', JSON.stringify(messages.map(normalizeMessage)));
}
/** Set OTel GenAI output messages from raw runtime response messages. */
function setGenAiOutputMessagesAttrFromMessages(span, messages) {
    span.setAttribute('gen_ai.output.messages', JSON.stringify(messages.map(normalizeMessage)));
}
/** Set OpenTelemetry GenAI output message attributes for text responses. */
function setGenAiOutputMessagesAttr(span, responseText, finishReason) {
    span.setAttribute('gen_ai.output.messages', JSON.stringify([
        {
            role: 'assistant',
            parts: [{ type: 'text', content: responseText }],
            ...(finishReason ? { finish_reason: finishReason } : {}),
        },
    ]));
}


/***/ }),

/***/ 64602:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MG: () => (/* binding */ estimateUsageCostBreakdown),
/* harmony export */   Y4: () => (/* binding */ apiUsageToStats)
/* harmony export */ });
/* unused harmony export anthropicUsageToStats */
/* harmony import */ var _earendil_works_pi_ai__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(26168);
/* harmony import */ var _earendil_works_pi_ai_providers_anthropic__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(11057);


const WEB_SEARCH_PER_REQUEST_USD = 0.01;
const ANTHROPIC_MODELS = new Map((0,_earendil_works_pi_ai_providers_anthropic__WEBPACK_IMPORTED_MODULE_0__/* .anthropicProvider */ .K)().getModels().map((model) => [model.id, model]));
/** Resolve exact Pi IDs or dated API response IDs whose base model Pi owns. */
function findAnthropicModel(model) {
    return ANTHROPIC_MODELS.get(model)
        ?? ANTHROPIC_MODELS.get(model.replace(/-\d{8}$/, ''));
}
function createPiUsage(input, output, cacheRead, cacheWrite, cacheWrite1h) {
    return {
        input,
        output,
        cacheRead,
        cacheWrite,
        cacheWrite1h,
        totalTokens: input + output + cacheRead + cacheWrite,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    };
}
/** Return categorized costs when the Anthropic model resolves to Pi's catalog. */
function estimateUsageCostBreakdown(model, usage) {
    if (!model)
        return undefined;
    const cacheReadInputTokens = usage.cacheReadInputTokens ?? 0;
    const cacheCreation5mInputTokens = usage.cacheCreation5mInputTokens ?? 0;
    const cacheCreation1hInputTokens = usage.cacheCreation1hInputTokens ?? 0;
    const cacheCreationInputTokens = Math.max(usage.cacheCreationInputTokens ?? 0, cacheCreation5mInputTokens + cacheCreation1hInputTokens);
    const cacheCreationInputTokensByTier = cacheCreation5mInputTokens + cacheCreation1hInputTokens;
    const uncategorizedCacheCreationInputTokens = Math.max(0, cacheCreationInputTokens - cacheCreationInputTokensByTier);
    const freshInputTokens = Math.max(0, usage.inputTokens - cacheReadInputTokens - cacheCreationInputTokens);
    const webSearchRequests = usage.webSearchRequests ?? 0;
    const piModel = findAnthropicModel(model);
    if (!piModel)
        return undefined;
    const piUsage = createPiUsage(freshInputTokens, usage.outputTokens, cacheReadInputTokens, cacheCreationInputTokens, cacheCreation1hInputTokens);
    const piCost = (0,_earendil_works_pi_ai__WEBPACK_IMPORTED_MODULE_1__/* .calculateCost */ .yN)(piModel, piUsage);
    const shortCacheCreationInputTokens = uncategorizedCacheCreationInputTokens + cacheCreation5mInputTokens;
    let cacheCreation1hUSD = 0;
    if (cacheCreation1hInputTokens > 0) {
        // Keep total input constant so Pi selects the same pricing tier while isolating 1h writes.
        const longWriteUsage = createPiUsage(freshInputTokens + shortCacheCreationInputTokens, 0, cacheReadInputTokens, cacheCreation1hInputTokens, cacheCreation1hInputTokens);
        cacheCreation1hUSD = (0,_earendil_works_pi_ai__WEBPACK_IMPORTED_MODULE_1__/* .calculateCost */ .yN)(piModel, longWriteUsage).cacheWrite;
    }
    const shortCacheCreationUSD = piCost.cacheWrite - cacheCreation1hUSD;
    const cacheCreationUSD = shortCacheCreationInputTokens > 0
        ? shortCacheCreationUSD * uncategorizedCacheCreationInputTokens / shortCacheCreationInputTokens
        : 0;
    const cacheCreation5mUSD = shortCacheCreationUSD - cacheCreationUSD;
    // Pi calculates token costs; Anthropic's server-side web search charge is separate.
    const webSearchUSD = webSearchRequests * WEB_SEARCH_PER_REQUEST_USD;
    return {
        freshInputUSD: piCost.input,
        outputUSD: piCost.output,
        cacheReadUSD: piCost.cacheRead,
        cacheCreationUSD,
        cacheCreation5mUSD,
        cacheCreation1hUSD,
        webSearchUSD,
        totalUSD: piCost.total + webSearchUSD,
    };
}
/**
 * Convert Anthropic API usage to our UsageStats format.
 * Calculates cost from token counts using model pricing.
 *
 * The Anthropic API reports `input_tokens` as only the non-cached portion.
 * We normalize so that `inputTokens` is the *total* input tokens
 * (non-cached + cache_read + cache_creation), with the cache fields
 * being subsets of that total.
 */
function anthropicUsageToStats(model, usage) {
    const outputTokens = usage.output_tokens;
    const cacheReadInputTokens = usage.cache_read_input_tokens ?? 0;
    const rawCacheCreationInputTokens = usage.cache_creation_input_tokens ?? 0;
    const tieredCacheCreation5mInputTokens = usage.cache_creation?.ephemeral_5m_input_tokens ?? 0;
    const cacheCreation1hInputTokens = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
    const hasTieredCacheCreation = usage.cache_creation !== undefined && usage.cache_creation !== null;
    const tieredCacheCreationInputTokens = tieredCacheCreation5mInputTokens + cacheCreation1hInputTokens;
    const cacheCreationInputTokens = Math.max(rawCacheCreationInputTokens, tieredCacheCreationInputTokens);
    const cacheCreation5mInputTokens = hasTieredCacheCreation
        ? tieredCacheCreation5mInputTokens
        : rawCacheCreationInputTokens;
    const uncategorizedCacheCreationInputTokens = Math.max(0, cacheCreationInputTokens - cacheCreation5mInputTokens - cacheCreation1hInputTokens);
    const webSearchRequests = usage.server_tool_use?.web_search_requests ?? 0;
    // inputTokens is the total: raw API input_tokens + cache subsets.
    const inputTokens = usage.input_tokens + cacheReadInputTokens + cacheCreationInputTokens;
    const stats = {
        inputTokens,
        outputTokens,
        cacheReadInputTokens,
        cacheCreationInputTokens,
        cacheCreation5mInputTokens: cacheCreation5mInputTokens + uncategorizedCacheCreationInputTokens,
        cacheCreation1hInputTokens,
        webSearchRequests,
        costUSD: 0,
    };
    const breakdown = estimateUsageCostBreakdown(model, stats);
    stats.costUSD = breakdown?.totalUSD ?? 0;
    return stats;
}
/** @deprecated Use anthropicUsageToStats. */
const apiUsageToStats = anthropicUsageToStats;


/***/ }),

/***/ 85286:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   E_: () => (/* binding */ isPiModelSelector),
/* harmony export */   lG: () => (/* binding */ assertValidPiModelSelectors),
/* harmony export */   n1: () => (/* binding */ InvalidPiModelSelectorError)
/* harmony export */ });
/* unused harmony exports invalidPiModelSelectorMessage, findInvalidPiModelSelector */
/**
 * Return true when a Pi model selector uses provider/model-id syntax.
 */
function isPiModelSelector(model) {
    const slashIndex = model.indexOf('/');
    return slashIndex > 0 && slashIndex < model.length - 1;
}
/**
 * Format the user-facing error for an invalid Pi model selector.
 */
function invalidPiModelSelectorMessage(invalid) {
    const target = invalid.specName ? ` for ${invalid.specName}` : '';
    return `Pi runtime ${invalid.option}${target} must use provider/model format: ${invalid.model}`;
}
/**
 * Preserve invalid Pi selector details through shared error classification.
 */
class InvalidPiModelSelectorError extends Error {
    invalid;
    constructor(invalid) {
        super(invalidPiModelSelectorMessage(invalid));
        this.name = 'InvalidPiModelSelectorError';
        this.invalid = invalid;
    }
}
/**
 * Find the first Pi runner option using a model ID that is not provider/model.
 */
function findInvalidPiModelSelector(targets) {
    for (const target of targets) {
        const runtimeName = target.runtime ?? 'pi';
        if (runtimeName !== 'pi') {
            continue;
        }
        for (const option of ['model', 'auxiliaryModel', 'synthesisModel']) {
            const model = target[option];
            if (model && !isPiModelSelector(model)) {
                return { specName: target.name, option, model };
            }
        }
    }
    return undefined;
}
/**
 * Throw when any Pi runner option is not a provider/model selector.
 */
function assertValidPiModelSelectors(targets) {
    const invalid = findInvalidPiModelSelector(targets);
    if (invalid) {
        throw new InvalidPiModelSelectorError(invalid);
    }
}


/***/ }),

/***/ 19113:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   piRuntime: () => (/* binding */ piRuntime)
/* harmony export */ });
/* harmony import */ var _earendil_works_pi_coding_agent__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(44077);
/* harmony import */ var _earendil_works_pi_ai__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(45736);
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(7096);
/* harmony import */ var _sentry_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(30340);
/* harmony import */ var _sentry_trace_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(68016);
/* harmony import */ var _utils_index_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(36137);
/* harmony import */ var _haiku_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(39026);
/* harmony import */ var _errors_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(98229);
/* harmony import */ var _otel_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(85884);
/* harmony import */ var _usage_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(44759);
/* harmony import */ var _model_selectors_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(85286);
/**
 * Pi runtime adapter.
 *
 * This keeps Pi-specific session setup, model selection, tool mapping, auth
 * handling, telemetry, and usage normalization behind Warden's runtime
 * contract. Warden still owns prompt construction, finding extraction,
 * verification, deduplication, and reporting.
 */











const READ_ONLY_TOOLS = ['Read', 'Grep', 'Glob'];
const MUTATING_TOOLS = ['Write', 'Edit', 'Bash'];
const UNSUPPORTED_TOOLS = ['WebFetch', 'WebSearch'];
const DEFAULT_PI_PROVIDER_MAX_RETRIES = 2;
const PI_TOOL_NAMES = {
    Read: ['read'],
    Write: ['write'],
    Edit: ['edit'],
    Bash: ['bash'],
    Glob: ['find', 'ls'],
    Grep: ['grep'],
};
function errorMessage(error) {
    return (0,_errors_js__WEBPACK_IMPORTED_MODULE_5__/* .sanitizeErrorMessage */ .$w)(error instanceof Error ? error.message : String(error));
}
function parseModelSelector(model) {
    if (!(0,_model_selectors_js__WEBPACK_IMPORTED_MODULE_7__/* .isPiModelSelector */ .E_)(model)) {
        throw new _model_selectors_js__WEBPACK_IMPORTED_MODULE_7__/* .InvalidPiModelSelectorError */ .n1({ option: 'model', model });
    }
    const slashIndex = model.indexOf('/');
    return {
        provider: model.slice(0, slashIndex),
        modelId: model.slice(slashIndex + 1),
    };
}
function legacyApiKeyProvider(model) {
    if (!model) {
        return 'anthropic';
    }
    const selector = parseModelSelector(model);
    return selector.provider === 'anthropic' ? 'anthropic' : undefined;
}
function createAuthStorage(model, legacyAnthropicApiKey) {
    const authStorage = _earendil_works_pi_coding_agent__WEBPACK_IMPORTED_MODULE_0__.AuthStorage.create();
    const provider = legacyApiKeyProvider(model);
    if (legacyAnthropicApiKey && provider) {
        authStorage.setRuntimeApiKey(provider, legacyAnthropicApiKey);
    }
    return authStorage;
}
function resolvePiModel(model, registry) {
    if (!model) {
        return undefined;
    }
    const { provider, modelId } = parseModelSelector(model);
    const resolved = registry.find(provider, modelId);
    if (!resolved) {
        throw new Error(`Pi model not found: ${model}. Use provider/model, for example openai/gpt-5.5.`);
    }
    return resolved;
}
function resolvePiSkillTools(tools, allowMutatingTools = false) {
    const denied = new Set(tools?.denied ?? []);
    const requested = tools?.allowed ?? READ_ONLY_TOOLS;
    const availableTools = allowMutatingTools
        ? [...READ_ONLY_TOOLS, ...MUTATING_TOOLS]
        : READ_ONLY_TOOLS;
    const toolNames = [];
    const warnings = [];
    for (const tool of requested) {
        if (denied.has(tool)) {
            continue;
        }
        if (UNSUPPORTED_TOOLS.includes(tool)) {
            warnings.push(`Pi runtime ignored unsupported tool: ${tool}`);
            continue;
        }
        if (!allowMutatingTools && MUTATING_TOOLS.includes(tool)) {
            warnings.push(`Pi runtime ignored mutating tool without allowMutatingTools: ${tool}`);
            continue;
        }
        if (!availableTools.includes(tool)) {
            continue;
        }
        for (const name of PI_TOOL_NAMES[tool]) {
            if (!toolNames.includes(name)) {
                toolNames.push(name);
            }
        }
    }
    return { toolNames, warnings };
}
function isAssistantMessage(message) {
    return Boolean(message
        && typeof message === 'object'
        && message.role === 'assistant');
}
function textFromAssistant(message) {
    return message.content
        .filter((content) => content.type === 'text')
        .map((content) => content.text)
        .join('');
}
function piUsageToStats(usage) {
    const cacheRead = usage.cacheRead;
    const cacheWrite = usage.cacheWrite;
    return {
        inputTokens: usage.input + cacheRead + cacheWrite,
        outputTokens: usage.output,
        cacheReadInputTokens: cacheRead,
        cacheCreationInputTokens: cacheWrite,
        cacheCreation5mInputTokens: cacheWrite,
        cacheCreation1hInputTokens: 0,
        webSearchRequests: 0,
        costUSD: usage.cost.total,
    };
}
function aggregatePiUsage(messages) {
    return (0,_usage_js__WEBPACK_IMPORTED_MODULE_8__/* .aggregateUsage */ .Z$)(messages.map((message) => piUsageToStats(message.usage)));
}
function statusFromPiMessage(message, hitMaxTurns) {
    if (hitMaxTurns) {
        return 'turn_limit';
    }
    switch (message.stopReason) {
        case 'stop':
            return 'success';
        case 'length':
        case 'toolUse':
            return 'provider_error';
        case 'error':
            return message.errorMessage && (0,_errors_js__WEBPACK_IMPORTED_MODULE_5__/* .isAuthenticationErrorMessage */ .Ip)(message.errorMessage)
                ? 'auth_error'
                : 'provider_error';
        case 'aborted':
            return 'aborted';
        default:
            return 'provider_error';
    }
}
function normalizePiResult(run) {
    const message = run.lastAssistant;
    if (!message) {
        return undefined;
    }
    const errors = message.errorMessage ? [message.errorMessage] : [];
    return {
        status: statusFromPiMessage(message, run.hitMaxTurns),
        text: textFromAssistant(message),
        errors,
        usage: run.usage,
        responseId: message.responseId,
        responseModel: message.responseModel ?? message.model,
        sessionId: run.sessionId,
        durationMs: run.durationMs,
        numTurns: run.numTurns,
    };
}
function buildSettingsManager(timeout, maxRetries) {
    const providerMaxRetries = maxRetries ?? DEFAULT_PI_PROVIDER_MAX_RETRIES;
    return _earendil_works_pi_coding_agent__WEBPACK_IMPORTED_MODULE_0__.SettingsManager.inMemory({
        compaction: { enabled: false },
        retry: {
            enabled: providerMaxRetries > 0,
            provider: {
                ...(timeout !== undefined ? { timeoutMs: timeout } : {}),
                maxRetries: providerMaxRetries,
            },
        },
    });
}
function setSpanAttributes(span, attributes) {
    for (const [key, value] of Object.entries(attributes)) {
        if (value !== undefined) {
            span.setAttribute(key, value);
        }
    }
}
async function promptWithTimeout(session, userPrompt, timeout) {
    const prompt = session.prompt(userPrompt, { expandPromptTemplates: false });
    if (timeout === undefined) {
        await prompt;
        return;
    }
    let timeoutId;
    let timedOut = false;
    const timeoutPromise = new Promise((_resolve, reject) => {
        timeoutId = setTimeout(() => {
            timedOut = true;
            reject(new Error(`Pi runtime timed out after ${timeout}ms`));
        }, timeout);
    });
    try {
        await Promise.race([prompt, timeoutPromise]);
    }
    catch (error) {
        if (timedOut) {
            await session.abort();
        }
        throw error;
    }
    finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}
async function runPiPrompt(options) {
    const warnings = [];
    (0,_utils_index_js__WEBPACK_IMPORTED_MODULE_3__/* .bridgeWardenProviderApiKeyEnv */ .cw)();
    const authStorage = createAuthStorage(options.model, options.legacyAnthropicApiKey);
    const modelRegistry = _earendil_works_pi_coding_agent__WEBPACK_IMPORTED_MODULE_0__.ModelRegistry.create(authStorage);
    const model = resolvePiModel(options.model, modelRegistry);
    const settingsManager = buildSettingsManager(options.timeout, options.maxRetries);
    const agentDir = (0,_earendil_works_pi_coding_agent__WEBPACK_IMPORTED_MODULE_0__.getAgentDir)();
    const resourceLoader = new _earendil_works_pi_coding_agent__WEBPACK_IMPORTED_MODULE_0__.DefaultResourceLoader({
        cwd: options.cwd,
        agentDir,
        settingsManager,
        noExtensions: true,
        noSkills: true,
        noPromptTemplates: true,
        noThemes: true,
        noContextFiles: true,
        systemPrompt: options.systemPrompt,
    });
    await resourceLoader.reload();
    let session;
    const assistantMessages = [];
    let agentEndMessages;
    let lastAssistant;
    let numTurns = 0;
    let hitMaxTurns = false;
    const startedAt = Date.now();
    const activeToolSpans = new Map();
    const conversationMessages = [{ role: 'user', content: options.userPrompt }];
    const buildToolAttributes = (args) => (0,_otel_js__WEBPACK_IMPORTED_MODULE_6__/* .genAiToolCallAttributes */ .Mf)({
        agentName: options.agentName,
        toolName: args.toolName,
        toolDescription: options.toolDescriptions?.[args.toolName],
        toolCallId: args.toolCallId,
        toolType: 'function',
        arguments: args.input,
        result: args.result,
        isError: args.isError,
    });
    function startToolSpan(event) {
        try {
            const parentSpan = options.parentSpan ?? _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.getActiveSpan */ .sQ.getActiveSpan();
            const span = (0,_sentry_trace_js__WEBPACK_IMPORTED_MODULE_2__/* .startInactiveTracedSpan */ .By)({
                op: 'gen_ai.execute_tool',
                name: `execute_tool ${event.toolName}`,
                ...(parentSpan && { parentSpan }),
                attributes: buildToolAttributes({
                    toolName: event.toolName,
                    toolCallId: event.toolCallId,
                    input: event.args,
                }),
            });
            activeToolSpans.set(event.toolCallId, span);
        }
        catch {
            // Telemetry should never break the workflow.
        }
    }
    function finishToolSpan(event) {
        try {
            const parentSpan = options.parentSpan ?? _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.getActiveSpan */ .sQ.getActiveSpan();
            const span = activeToolSpans.get(event.toolCallId) ?? (0,_sentry_trace_js__WEBPACK_IMPORTED_MODULE_2__/* .startInactiveTracedSpan */ .By)({
                op: 'gen_ai.execute_tool',
                name: `execute_tool ${event.toolName}`,
                ...(parentSpan && { parentSpan }),
            });
            activeToolSpans.delete(event.toolCallId);
            setSpanAttributes(span, buildToolAttributes({
                toolName: event.toolName,
                toolCallId: event.toolCallId,
                result: event.result,
                isError: event.isError,
            }));
            if (event.isError) {
                span.setAttribute('error.type', 'tool_error');
            }
            span.end();
            (0,_sentry_trace_js__WEBPACK_IMPORTED_MODULE_2__/* .recordTracedSpan */ .hb)(span, options.traceRecorder);
        }
        catch {
            // Telemetry should never break the workflow.
        }
    }
    function finishOpenToolSpans(errorType) {
        for (const span of activeToolSpans.values()) {
            try {
                span.setAttribute('error.type', errorType);
                span.end();
                (0,_sentry_trace_js__WEBPACK_IMPORTED_MODULE_2__/* .recordTracedSpan */ .hb)(span, options.traceRecorder);
            }
            catch {
                // Telemetry should never break the workflow.
            }
        }
        activeToolSpans.clear();
    }
    function recordTurnSpan(message, toolResults) {
        const outputMessage = {
            role: message.role,
            content: message.content,
            finishReason: message.stopReason,
        };
        const followUpMessages = toolResults ?? [];
        const requestModel = options.model ?? message.model ?? message.responseModel;
        try {
            const usageAttrs = (0,_otel_js__WEBPACK_IMPORTED_MODULE_6__/* .genAiUsageAttributes */ .bO)(piUsageToStats(message.usage));
            (0,_sentry_trace_js__WEBPACK_IMPORTED_MODULE_2__/* .startTracedSpan */ .wZ)({
                op: 'gen_ai.chat',
                name: (0,_otel_js__WEBPACK_IMPORTED_MODULE_6__/* .genAiSpanName */ .kj)('chat', requestModel),
                ...(options.parentSpan ? { parentSpan: options.parentSpan } : {}),
                attributes: {
                    'gen_ai.operation.name': 'chat',
                    'gen_ai.provider.name': message.provider ?? (0,_otel_js__WEBPACK_IMPORTED_MODULE_6__/* .genAiProviderName */ .Jo)('pi', options.model),
                    ...(options.agentName ? { 'gen_ai.agent.name': options.agentName } : {}),
                    ...(requestModel ? { 'gen_ai.request.model': requestModel } : {}),
                    'gen_ai.response.model': message.responseModel ?? message.model,
                    ...usageAttrs,
                },
            }, (span) => {
                (0,_otel_js__WEBPACK_IMPORTED_MODULE_6__/* .setGenAiInputMessagesAttr */ .uQ)(span, conversationMessages);
                (0,_otel_js__WEBPACK_IMPORTED_MODULE_6__/* .setGenAiOutputMessagesAttrFromMessages */ .L6)(span, [outputMessage]);
            }, options.traceRecorder);
        }
        catch {
            // Telemetry should never break the workflow.
        }
        conversationMessages.push(outputMessage, ...followUpMessages);
    }
    try {
        const result = await (0,_earendil_works_pi_coding_agent__WEBPACK_IMPORTED_MODULE_0__.createAgentSession)({
            cwd: options.cwd,
            agentDir,
            authStorage,
            modelRegistry,
            model,
            thinkingLevel: options.effort,
            tools: options.toolNames,
            noTools: options.toolNames.length === 0 ? 'all' : undefined,
            customTools: options.customTools,
            resourceLoader,
            sessionManager: _earendil_works_pi_coding_agent__WEBPACK_IMPORTED_MODULE_0__.SessionManager.inMemory(options.cwd),
            settingsManager,
        });
        session = result.session;
        if (result.modelFallbackMessage) {
            warnings.push(result.modelFallbackMessage);
        }
        const unsubscribe = session.subscribe((event) => {
            if (event.type === 'message_end' && isAssistantMessage(event.message)) {
                if (hitMaxTurns
                    && lastAssistant?.stopReason === 'toolUse'
                    && event.message.stopReason === 'aborted') {
                    return;
                }
                assistantMessages.push(event.message);
                lastAssistant = event.message;
            }
            else if (event.type === 'agent_end') {
                agentEndMessages = [...event.messages];
            }
            else if (event.type === 'tool_execution_start') {
                startToolSpan(event);
            }
            else if (event.type === 'tool_execution_end') {
                finishToolSpan(event);
            }
            else if (event.type === 'turn_end') {
                if (isAssistantMessage(event.message)) {
                    recordTurnSpan(event.message, event.toolResults);
                }
                numTurns++;
                if (options.maxTurns !== undefined
                    && numTurns >= options.maxTurns
                    && isAssistantMessage(event.message)
                    && event.message.stopReason === 'toolUse') {
                    hitMaxTurns = true;
                    lastAssistant = event.message;
                    void session?.abort();
                }
            }
        });
        const abortSignal = options.abortController?.signal;
        const onAbort = () => {
            void session?.abort();
        };
        abortSignal?.addEventListener('abort', onAbort, { once: true });
        try {
            if (abortSignal?.aborted) {
                await session.abort();
            }
            else {
                await promptWithTimeout(session, options.userPrompt, options.timeout);
            }
        }
        finally {
            abortSignal?.removeEventListener('abort', onAbort);
            unsubscribe();
        }
    }
    finally {
        finishOpenToolSpans('aborted');
        session?.dispose();
    }
    if (!lastAssistant && agentEndMessages) {
        for (const message of agentEndMessages) {
            if (isAssistantMessage(message)) {
                assistantMessages.push(message);
                lastAssistant = message;
            }
        }
    }
    return {
        lastAssistant,
        assistantMessages,
        usage: aggregatePiUsage(assistantMessages),
        sessionId: session?.sessionId,
        durationMs: Date.now() - startedAt,
        numTurns,
        hitMaxTurns,
        warnings,
    };
}
function toStructuredPrompt(kind, task, schema) {
    const jsonSchema = zod__WEBPACK_IMPORTED_MODULE_9__/* .toJSONSchema */ .bl(schema);
    return [
        `You are Warden's ${kind} structured-output runtime.`,
        task ? `Task: ${task}` : undefined,
        'Return only valid JSON. Do not include markdown fences, commentary, or surrounding prose.',
        'The JSON must match this schema:',
        JSON.stringify(jsonSchema, null, 2),
    ].filter((line) => line !== undefined).join('\n\n');
}
function toPiCustomTools(tools, executeTool) {
    if (!tools || tools.length === 0) {
        return undefined;
    }
    return tools.map((tool) => (0,_earendil_works_pi_coding_agent__WEBPACK_IMPORTED_MODULE_0__.defineTool)({
        name: tool.name,
        label: tool.name,
        description: tool.description ?? '',
        promptSnippet: `${tool.name}: ${tool.description ?? 'custom tool'}`,
        parameters: _earendil_works_pi_ai__WEBPACK_IMPORTED_MODULE_10__.Type.Unsafe(tool.inputSchema),
        async execute(_toolCallId, params) {
            const result = await (executeTool ?? (async () => ''))(tool.name, params);
            return {
                content: [{ type: 'text', text: result }],
                details: { tool: tool.name },
            };
        },
    }));
}
function toolDescriptionsByName(tools) {
    const descriptions = Object.fromEntries((tools ?? [])
        .filter((tool) => typeof tool.description === 'string' && tool.description.length > 0)
        .map((tool) => [tool.name, tool.description]));
    return Object.keys(descriptions).length > 0 ? descriptions : undefined;
}
async function runStructured(request) {
    const customTools = toPiCustomTools(request.tools, request.executeTool);
    const systemPrompt = toStructuredPrompt(request.kind, request.task, request.schema);
    const toolNames = customTools?.map((tool) => tool.name) ?? [];
    const toolDescriptions = toolDescriptionsByName(request.tools);
    return (0,_sentry_trace_js__WEBPACK_IMPORTED_MODULE_2__/* .startTracedSpan */ .wZ)({
        op: 'gen_ai.invoke_agent',
        name: (0,_otel_js__WEBPACK_IMPORTED_MODULE_6__/* .genAiSpanName */ .kj)('invoke_agent', request.agentName),
        attributes: {
            'gen_ai.operation.name': 'invoke_agent',
            'gen_ai.provider.name': (0,_otel_js__WEBPACK_IMPORTED_MODULE_6__/* .genAiProviderName */ .Jo)('pi', request.model),
            ...(request.agentName ? { 'gen_ai.agent.name': request.agentName } : {}),
            ...(request.task ? { 'warden.ai.task': request.task } : {}),
            ...(request.model ? { 'gen_ai.request.model': request.model } : {}),
            'gen_ai.output.type': 'json',
        },
    }, async (span) => {
        (0,_otel_js__WEBPACK_IMPORTED_MODULE_6__/* .setGenAiSystemInstructionsAttr */ .kq)(span, systemPrompt);
        (0,_otel_js__WEBPACK_IMPORTED_MODULE_6__/* .setGenAiInputMessagesAttr */ .uQ)(span, [{ role: 'user', content: request.prompt }]);
        try {
            const run = await runPiPrompt({
                cwd: process.cwd(),
                systemPrompt,
                userPrompt: request.prompt,
                agentName: request.agentName,
                model: request.model,
                legacyAnthropicApiKey: request.apiKey,
                toolNames,
                customTools,
                toolDescriptions,
                maxTurns: request.maxIterations,
                maxRetries: request.maxRetries,
                timeout: request.timeout,
                parentSpan: span,
            });
            const result = normalizePiResult(run);
            if (!result) {
                span.setAttribute('error.type', 'missing_response');
                return { success: false, error: 'Pi runtime returned no response', usage: run.usage };
            }
            if (run.lastAssistant?.provider) {
                span.setAttribute('gen_ai.provider.name', run.lastAssistant.provider);
            }
            (0,_otel_js__WEBPACK_IMPORTED_MODULE_6__/* .setGenAiUsageAttrs */ .qk)(span, result.usage);
            if (result.responseId) {
                span.setAttribute('gen_ai.response.id', result.responseId);
            }
            if (result.responseModel) {
                span.setAttribute('gen_ai.response.model', result.responseModel);
            }
            span.setAttribute('gen_ai.response.finish_reasons', [run.lastAssistant?.stopReason ?? result.status]);
            (0,_otel_js__WEBPACK_IMPORTED_MODULE_6__/* .setGenAiOutputMessagesAttr */ .hX)(span, result.text, run.lastAssistant?.stopReason ?? result.status);
            if (result.status !== 'success') {
                span.setAttribute('error.type', result.status);
                return {
                    success: false,
                    error: result.errors.join('; ') || `Pi runtime execution failed: ${result.status}`,
                    usage: result.usage,
                };
            }
            const json = (0,_haiku_js__WEBPACK_IMPORTED_MODULE_4__/* .extractJson */ .eg)(result.text);
            if (!json) {
                span.setAttribute('error.type', 'invalid_json');
                return { success: false, error: 'No JSON found in response', usage: result.usage };
            }
            const parsed = JSON.parse(json);
            const validated = request.schema.safeParse(parsed);
            if (!validated.success) {
                span.setAttribute('error.type', 'validation_error');
                return { success: false, error: `Validation failed: ${validated.error.message}`, usage: result.usage };
            }
            return { success: true, data: validated.data, usage: result.usage };
        }
        catch (error) {
            span.setAttribute('error.type', error instanceof Error ? error.name : '_OTHER');
            return { success: false, error: errorMessage(error), usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_8__/* .emptyUsage */ .ly)() };
        }
    });
}
const piRuntime = {
    name: 'pi',
    async runSkill(request) {
        const { systemPrompt, userPrompt, repoPath, apiKey, options, skillName, tools, allowMutatingTools, } = request;
        const { maxTurns = 50, model, effort, abortController } = options;
        const skillTools = resolvePiSkillTools(tools, allowMutatingTools);
        return (0,_sentry_trace_js__WEBPACK_IMPORTED_MODULE_2__/* .startTracedSpan */ .wZ)({
            op: 'gen_ai.invoke_agent',
            name: (0,_otel_js__WEBPACK_IMPORTED_MODULE_6__/* .genAiSpanName */ .kj)('invoke_agent', skillName),
            ...(request.parentSpan ? { parentSpan: request.parentSpan } : {}),
            attributes: {
                'gen_ai.operation.name': 'invoke_agent',
                'gen_ai.provider.name': (0,_otel_js__WEBPACK_IMPORTED_MODULE_6__/* .genAiProviderName */ .Jo)('pi', model),
                'gen_ai.agent.name': skillName,
                ...(model ? { 'gen_ai.request.model': model } : {}),
                'warden.request.max_turns': maxTurns,
            },
        }, async (span) => {
            (0,_otel_js__WEBPACK_IMPORTED_MODULE_6__/* .setGenAiSystemInstructionsAttr */ .kq)(span, systemPrompt);
            (0,_otel_js__WEBPACK_IMPORTED_MODULE_6__/* .setGenAiInputMessagesAttr */ .uQ)(span, [{ role: 'user', content: userPrompt }]);
            try {
                const run = await runPiPrompt({
                    cwd: repoPath,
                    systemPrompt,
                    userPrompt,
                    agentName: skillName,
                    model,
                    legacyAnthropicApiKey: apiKey,
                    toolNames: skillTools.toolNames,
                    maxTurns,
                    effort,
                    abortController,
                    parentSpan: span,
                    traceRecorder: request.traceRecorder,
                });
                run.warnings.unshift(...skillTools.warnings);
                const result = normalizePiResult(run);
                if (result) {
                    if (run.lastAssistant?.provider) {
                        span.setAttribute('gen_ai.provider.name', run.lastAssistant.provider);
                    }
                    (0,_otel_js__WEBPACK_IMPORTED_MODULE_6__/* .setGenAiUsageAttrs */ .qk)(span, result.usage);
                    if (result.responseId) {
                        span.setAttribute('gen_ai.response.id', result.responseId);
                    }
                    if (result.responseModel) {
                        span.setAttribute('gen_ai.response.model', result.responseModel);
                    }
                    span.setAttribute('gen_ai.response.finish_reasons', [run.lastAssistant?.stopReason ?? result.status]);
                    if (result.text) {
                        (0,_otel_js__WEBPACK_IMPORTED_MODULE_6__/* .setGenAiOutputMessagesAttr */ .hX)(span, result.text, run.lastAssistant?.stopReason ?? result.status);
                    }
                    if (result.status !== 'success') {
                        span.setAttribute('error.type', result.status);
                    }
                    if (result.sessionId) {
                        span.setAttribute('gen_ai.conversation.id', result.sessionId);
                    }
                    if (result.durationMs !== undefined) {
                        span.setAttribute('warden.sdk.duration_ms', result.durationMs);
                    }
                    if (result.numTurns !== undefined) {
                        span.setAttribute('warden.sdk.num_turns', result.numTurns);
                    }
                }
                return {
                    result,
                    stderr: run.warnings.join('\n') || undefined,
                };
            }
            catch (error) {
                const message = errorMessage(error);
                if ((0,_errors_js__WEBPACK_IMPORTED_MODULE_5__/* .isAuthenticationErrorMessage */ .Ip)(message)) {
                    span.setAttribute('error.type', 'auth_error');
                    return { authError: message };
                }
                span.setAttribute('error.type', error instanceof Error ? error.name : '_OTHER');
                throw error;
            }
        }, request.traceRecorder);
    },
    async runAuxiliary(request) {
        return runStructured({ kind: 'auxiliary', ...request });
    },
    async runSynthesis(request) {
        return runStructured({ kind: 'synthesis', ...request });
    },
};


/***/ }),

/***/ 44759:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   RL: () => (/* binding */ aggregateAuxiliaryUsage),
/* harmony export */   UN: () => (/* binding */ aggregateAuxiliaryUsageAttribution),
/* harmony export */   Z$: () => (/* binding */ aggregateUsage),
/* harmony export */   bP: () => (/* binding */ estimateTokens),
/* harmony export */   f5: () => (/* binding */ extractUsage),
/* harmony export */   ly: () => (/* binding */ emptyUsage),
/* harmony export */   vd: () => (/* binding */ mergeAuxiliaryUsageAttribution),
/* harmony export */   wV: () => (/* binding */ mergeAuxiliaryUsage)
/* harmony export */ });
/**
 * Extract usage stats from a runtime result message.
 *
 * The Anthropic API reports `input_tokens` as only the non-cached portion.
 * We normalize so that `inputTokens` is the total input token count
 * (non-cached + cache_read + cache_creation), with cache fields reported
 * separately as subsets of that total.
 */
function extractUsage(result) {
    const usage = result.usage;
    const rawInput = usage?.input_tokens ?? 0;
    const cacheRead = usage?.cache_read_input_tokens ?? 0;
    const rawCacheCreation = usage?.cache_creation_input_tokens ?? 0;
    const cacheCreation1h = usage?.cache_creation?.ephemeral_1h_input_tokens ?? 0;
    const tieredCacheCreation5m = usage?.cache_creation?.ephemeral_5m_input_tokens ?? 0;
    const hasTieredCacheCreation = usage?.cache_creation !== undefined && usage.cache_creation !== null;
    const tieredCacheCreation = tieredCacheCreation5m + cacheCreation1h;
    const cacheCreation = Math.max(rawCacheCreation, tieredCacheCreation);
    const cacheCreation5m = hasTieredCacheCreation ? tieredCacheCreation5m : rawCacheCreation;
    return {
        inputTokens: rawInput + cacheRead + cacheCreation,
        outputTokens: usage?.output_tokens ?? 0,
        cacheReadInputTokens: cacheRead,
        cacheCreationInputTokens: cacheCreation,
        cacheCreation5mInputTokens: cacheCreation5m,
        cacheCreation1hInputTokens: cacheCreation1h,
        webSearchRequests: usage?.server_tool_use?.web_search_requests ?? 0,
        costUSD: result.total_cost_usd ?? 0,
    };
}
/**
 * Create empty usage stats.
 */
function emptyUsage() {
    return {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheCreation5mInputTokens: 0,
        cacheCreation1hInputTokens: 0,
        webSearchRequests: 0,
        costUSD: 0,
    };
}
function addUsage(a, b) {
    return {
        inputTokens: a.inputTokens + b.inputTokens,
        outputTokens: a.outputTokens + b.outputTokens,
        cacheReadInputTokens: (a.cacheReadInputTokens ?? 0) + (b.cacheReadInputTokens ?? 0),
        cacheCreationInputTokens: (a.cacheCreationInputTokens ?? 0) + (b.cacheCreationInputTokens ?? 0),
        cacheCreation5mInputTokens: (a.cacheCreation5mInputTokens ?? 0) + (b.cacheCreation5mInputTokens ?? 0),
        cacheCreation1hInputTokens: (a.cacheCreation1hInputTokens ?? 0) + (b.cacheCreation1hInputTokens ?? 0),
        webSearchRequests: (a.webSearchRequests ?? 0) + (b.webSearchRequests ?? 0),
        costUSD: a.costUSD + b.costUSD,
    };
}
/**
 * Aggregate multiple usage stats into one.
 */
function aggregateUsage(usages) {
    return usages.reduce(addUsage, emptyUsage());
}
/**
 * Aggregate auxiliary usage entries by agent name.
 * Merges multiple entries for the same agent into a single UsageStats.
 * Returns undefined if no entries are provided.
 */
function aggregateAuxiliaryUsage(entries) {
    if (entries.length === 0)
        return undefined;
    const map = {};
    for (const { agent, usage } of entries) {
        const existing = map[agent];
        if (existing) {
            map[agent] = addUsage(existing, usage);
        }
        else {
            map[agent] = { ...usage };
        }
    }
    return map;
}
function uniqueSorted(values) {
    const unique = [...new Set(values.filter((value) => Boolean(value)))].sort();
    return unique.length > 0 ? unique : undefined;
}
function attributionFromEntries(entries) {
    const models = uniqueSorted(entries.map((entry) => entry.model));
    const runtimes = uniqueSorted(entries.map((entry) => entry.runtime));
    if (!models && !runtimes)
        return undefined;
    return {
        model: models?.length === 1 ? models[0] : undefined,
        models: models && models.length > 1 ? models : undefined,
        runtime: runtimes?.length === 1 ? runtimes[0] : undefined,
        runtimes: runtimes && runtimes.length > 1 ? runtimes : undefined,
    };
}
function attributionValues(attribution) {
    return {
        models: [
            ...(attribution?.model ? [attribution.model] : []),
            ...(attribution?.models ?? []),
        ],
        runtimes: [
            ...(attribution?.runtime ? [attribution.runtime] : []),
            ...(attribution?.runtimes ?? []),
        ],
    };
}
function mergeAttribution(a, b) {
    const aValues = attributionValues(a);
    const bValues = attributionValues(b);
    const models = uniqueSorted([...aValues.models, ...bValues.models]);
    const runtimes = uniqueSorted([...aValues.runtimes, ...bValues.runtimes]);
    if (!models && !runtimes)
        return undefined;
    return {
        model: models?.length === 1 ? models[0] : undefined,
        models: models && models.length > 1 ? models : undefined,
        runtime: runtimes?.length === 1 ? runtimes[0] : undefined,
        runtimes: runtimes && runtimes.length > 1 ? runtimes : undefined,
    };
}
function normalizeAttributionMap(map) {
    if (!map)
        return undefined;
    const normalized = {};
    for (const [agent, attribution] of Object.entries(map)) {
        const next = mergeAttribution(undefined, attribution);
        if (next) {
            normalized[agent] = next;
        }
    }
    return Object.keys(normalized).length > 0 ? normalized : undefined;
}
/**
 * Aggregate auxiliary usage model/runtime attribution by agent name.
 */
function aggregateAuxiliaryUsageAttribution(entries) {
    const byAgent = new Map();
    for (const entry of entries) {
        const agentEntries = byAgent.get(entry.agent) ?? [];
        agentEntries.push(entry);
        byAgent.set(entry.agent, agentEntries);
    }
    const map = {};
    for (const [agent, agentEntries] of byAgent) {
        const attribution = attributionFromEntries(agentEntries);
        if (attribution) {
            map[agent] = attribution;
        }
    }
    return Object.keys(map).length > 0 ? map : undefined;
}
/**
 * Merge two auxiliary usage attribution maps.
 */
function mergeAuxiliaryUsageAttribution(a, b) {
    const left = normalizeAttributionMap(a);
    const right = normalizeAttributionMap(b);
    if (!left && !right)
        return undefined;
    if (!left)
        return right;
    if (!right)
        return left;
    const merged = { ...left };
    for (const [agent, attribution] of Object.entries(right)) {
        const next = mergeAttribution(merged[agent], attribution);
        if (next) {
            merged[agent] = next;
        }
    }
    return Object.keys(merged).length > 0 ? merged : undefined;
}
/**
 * Merge two AuxiliaryUsageMaps together.
 * Entries for the same agent are summed.
 */
function mergeAuxiliaryUsage(a, b) {
    if (!a && !b)
        return undefined;
    if (!a)
        return b;
    if (!b)
        return a;
    const entries = [];
    for (const [agent, usage] of Object.entries(a)) {
        entries.push({ agent, usage });
    }
    for (const [agent, usage] of Object.entries(b)) {
        entries.push({ agent, usage });
    }
    return aggregateAuxiliaryUsage(entries);
}
/**
 * Estimate token count from character count.
 * Uses chars/4 as a rough approximation for English text.
 */
function estimateTokens(chars) {
    return Math.ceil(chars / 4);
}


/***/ }),

/***/ 68016:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   By: () => (/* binding */ startInactiveTracedSpan),
/* harmony export */   gP: () => (/* binding */ withTraceRecorder),
/* harmony export */   hb: () => (/* binding */ recordTracedSpan),
/* harmony export */   qr: () => (/* binding */ startTraceRecorder),
/* harmony export */   w8: () => (/* binding */ getSpanContext),
/* harmony export */   wZ: () => (/* binding */ startTracedSpan)
/* harmony export */ });
/* harmony import */ var node_async_hooks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(16698);
/* harmony import */ var node_async_hooks__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_async_hooks__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _sentry_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(30340);


const traceRecorderStore = new node_async_hooks__WEBPACK_IMPORTED_MODULE_0__.AsyncLocalStorage();
/** Run a callback with a hunk-scoped trace recorder for Warden-created spans. */
function withTraceRecorder(recorder, callback) {
    if (!recorder)
        return callback();
    return traceRecorderStore.run(recorder, callback);
}
/** Return the Sentry span context when available. */
function getSpanContext(span) {
    try {
        return span?.spanContext?.();
    }
    catch {
        return undefined;
    }
}
function isTraceSpanAttributeValue(value) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return true;
    }
    return Array.isArray(value) && value.every((item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean');
}
function compactAttributes(attributes) {
    if (!attributes)
        return undefined;
    const compact = {};
    for (const [key, value] of Object.entries(attributes)) {
        if (isTraceSpanAttributeValue(value)) {
            compact[key] = value;
        }
    }
    return Object.keys(compact).length > 0 ? compact : undefined;
}
function timestampMs(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? Math.round(value * 1000)
        : undefined;
}
function stringValue(value) {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}
function snapshotSpan(span) {
    if (!span)
        return undefined;
    let spanJson;
    try {
        spanJson = _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.spanToJSON */ .sQ.spanToJSON(span);
    }
    catch {
        return undefined;
    }
    const traceId = stringValue(spanJson?.trace_id);
    const spanId = stringValue(spanJson?.span_id);
    if (!traceId || !spanId)
        return undefined;
    const startTimeUnixMs = timestampMs(spanJson?.start_timestamp);
    const endTimeUnixMs = timestampMs(spanJson?.timestamp);
    return {
        traceId,
        spanId,
        parentSpanId: stringValue(spanJson?.parent_span_id),
        op: stringValue(spanJson?.op),
        name: stringValue(spanJson?.description),
        startTimeUnixMs,
        endTimeUnixMs,
        durationMs: startTimeUnixMs !== undefined && endTimeUnixMs !== undefined
            ? Math.max(0, endTimeUnixMs - startTimeUnixMs)
            : undefined,
        status: stringValue(spanJson?.status),
        origin: stringValue(spanJson?.origin),
        attributes: compactAttributes(spanJson?.data),
    };
}
function descendantsForParent(spans, parentSpanId) {
    if (!parentSpanId)
        return spans;
    const byId = new Map(spans.map((span) => [span.spanId, span]));
    return spans.filter((span) => {
        let currentParentId = span.parentSpanId;
        while (currentParentId) {
            if (currentParentId === parentSpanId)
                return true;
            currentParentId = byId.get(currentParentId)?.parentSpanId;
        }
        return false;
    });
}
function activeTraceRecorder() {
    return traceRecorderStore.getStore();
}
function hasFinally(value) {
    return Boolean(value && typeof value === 'object' && typeof value.finally === 'function');
}
/**
 * Start a real Sentry span and record it in Warden's active hunk trace buffer.
 *
 * The span still participates in Sentry's distributed trace. The buffer is
 * Warden-owned, though, so structured run output only depends on spans we
 * explicitly create through this helper.
 */
function startTracedSpan(options, callback, traceRecorder) {
    const recorder = traceRecorder ?? activeTraceRecorder();
    let spanRef;
    const recordSpan = () => recorder?.record(spanRef);
    try {
        const result = _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.startSpan */ .sQ.startSpan(options, (span) => {
            spanRef = span;
            return callback(span);
        });
        if (hasFinally(result)) {
            return result.finally(recordSpan);
        }
        recordSpan();
        return result;
    }
    catch (error) {
        recordSpan();
        throw error;
    }
}
/** Start an inactive Sentry span that can be ended and recorded manually. */
function startInactiveTracedSpan(options) {
    return _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.startInactiveSpan */ .sQ.startInactiveSpan(options);
}
/** Record a manually-ended span in Warden's active or explicit trace buffer. */
function recordTracedSpan(span, traceRecorder) {
    (traceRecorder ?? activeTraceRecorder())?.record(span);
}
/** Create a hunk-scoped recorder for Warden-owned spans under a Sentry parent span. */
function startTraceRecorder(parentSpan) {
    if (!parentSpan)
        return undefined;
    const parentContext = getSpanContext(parentSpan);
    const buffer = new Map();
    return {
        record(span) {
            const snapshot = snapshotSpan(span);
            if (!snapshot)
                return;
            if (parentContext?.traceId && snapshot.traceId !== parentContext.traceId)
                return;
            if (snapshot.spanId === parentContext?.spanId)
                return;
            buffer.set(snapshot.spanId, snapshot);
        },
        snapshot() {
            const spans = descendantsForParent([...buffer.values()], parentContext?.spanId);
            return spans.length > 0 ? spans : undefined;
        },
    };
}


/***/ }),

/***/ 30340:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   E1: () => (/* binding */ emitFixEvalVerdictMetric),
/* harmony export */   G_: () => (/* binding */ ensureLocalTracing),
/* harmony export */   KR: () => (/* binding */ flushSentry),
/* harmony export */   LW: () => (/* binding */ emitRunMetric),
/* harmony export */   Zn: () => (/* binding */ emitDedupMetrics),
/* harmony export */   fL: () => (/* binding */ emitStaleResolutionMetric),
/* harmony export */   gs: () => (/* binding */ setGitHubActionScope),
/* harmony export */   ig: () => (/* binding */ initSentry),
/* harmony export */   ii: () => (/* binding */ emitFixEvalMetrics),
/* harmony export */   m0: () => (/* binding */ emitRetryMetric),
/* harmony export */   s7: () => (/* binding */ emitSkillMetrics),
/* harmony export */   sQ: () => (/* reexport module object */ _sentry_node__WEBPACK_IMPORTED_MODULE_10__),
/* harmony export */   vF: () => (/* binding */ logger),
/* harmony export */   vx: () => (/* binding */ setRepositoryScope),
/* harmony export */   yI: () => (/* binding */ emitExtractionMetrics)
/* harmony export */ });
/* unused harmony exports setGlobalAttributes, getTraceId */
/* harmony import */ var _sentry_node__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(81788);
/* harmony import */ var _sentry_node__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(99537);
/* harmony import */ var _sentry_node__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(16805);
/* harmony import */ var _sentry_node__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(27995);
/* harmony import */ var _sentry_node__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(74168);
/* harmony import */ var _sentry_node__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(20547);
/* harmony import */ var _sentry_node__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(33199);
/* harmony import */ var _sentry_node__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(93545);
/* harmony import */ var _types_index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(78481);
/* harmony import */ var _utils_index_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(36137);
/* harmony import */ var _sdk_otel_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(85884);
/* harmony import */ var _sdk_pricing_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(64602);





let initialized = false;
function getGitHubServerUrl() {
    const serverUrl = process.env['GITHUB_SERVER_URL'] || 'https://github.com';
    return serverUrl.replace(/\/+$/, '');
}
function initSentry(context) {
    const dsn = process.env['WARDEN_SENTRY_DSN'];
    if (!dsn || initialized)
        return;
    initialized = true;
    _sentry_node__WEBPACK_IMPORTED_MODULE_4__/* .init */ .Ts({
        dsn,
        release: `warden@${(0,_utils_index_js__WEBPACK_IMPORTED_MODULE_1__/* .getVersion */ .HF)()}`,
        environment: context === 'action' ? 'github-action' : 'cli',
        tracesSampleRate: 1.0,
        enableLogs: true,
        integrations: [
            _sentry_node__WEBPACK_IMPORTED_MODULE_5__/* .consoleLoggingIntegration */ .d({ levels: ['warn', 'error'] }),
            _sentry_node__WEBPACK_IMPORTED_MODULE_6__/* .anthropicAIIntegration */ .v({ recordInputs: true, recordOutputs: true }),
            _sentry_node__WEBPACK_IMPORTED_MODULE_7__/* .httpIntegration */ .X(),
        ],
    });
    _sentry_node__WEBPACK_IMPORTED_MODULE_8__/* .setTag */ .NA('service.version', (0,_utils_index_js__WEBPACK_IMPORTED_MODULE_1__/* .getVersion */ .HF)());
    _sentry_node__WEBPACK_IMPORTED_MODULE_9__/* .getGlobalScope */ .m6().setAttributes({
        'warden.source': context === 'action' ? 'github-action' : 'cli',
    });
}
/** Ensure local span objects are materialized for structured trace output. */
function ensureLocalTracing() {
    if (_sentry_node__WEBPACK_IMPORTED_MODULE_9__/* .getClient */ .KU())
        return;
    _sentry_node__WEBPACK_IMPORTED_MODULE_4__/* .init */ .Ts({
        tracesSampleRate: 1.0,
        transport: () => ({
            send: async () => ({}),
            flush: async () => true,
        }),
    });
}

const { logger } = _sentry_node__WEBPACK_IMPORTED_MODULE_10__;
/**
 * Set attributes on the global Sentry scope.
 * These automatically apply to ALL metrics and spans.
 */
function setGlobalAttributes(attrs) {
    if (!initialized)
        return;
    try {
        _sentry_node__WEBPACK_IMPORTED_MODULE_9__/* .getGlobalScope */ .m6().setAttributes(attrs);
    }
    catch {
        // Never break the workflow
    }
}
/**
 * Set repository metadata on the global Sentry scope.
 */
function setRepositoryScope(repository) {
    if (!repository || !initialized)
        return;
    const [owner, name] = repository.split('/');
    const attrs = name
        ? {
            'vcs.owner.name': owner ?? '',
            'vcs.repository.name': name,
        }
        : {
            'vcs.repository.name': repository,
        };
    if (owner && name && owner !== 'local') {
        const serverUrl = getGitHubServerUrl();
        attrs['vcs.provider.name'] = 'github';
        attrs['vcs.repository.url.full'] = `${serverUrl}/${owner}/${name}`;
    }
    setGlobalAttributes(attrs);
}
/**
 * Set GitHub Actions metadata on the global Sentry scope.
 */
function setGitHubActionScope(eventName) {
    if (!initialized)
        return;
    const repository = process.env['GITHUB_REPOSITORY'];
    const runId = process.env['GITHUB_RUN_ID'];
    const serverUrl = getGitHubServerUrl();
    const attrs = {};
    if (eventName) {
        attrs['github.event.name'] = eventName;
    }
    if (process.env['GITHUB_WORKFLOW']) {
        attrs['cicd.pipeline.name'] = process.env['GITHUB_WORKFLOW'];
    }
    if (runId) {
        attrs['cicd.pipeline.run.id'] = runId;
    }
    if (repository && runId) {
        attrs['cicd.pipeline.run.url.full'] = `${serverUrl}/${repository}/actions/runs/${runId}`;
    }
    if (process.env['GITHUB_JOB']) {
        attrs['cicd.pipeline.task.name'] = process.env['GITHUB_JOB'];
    }
    if (Object.keys(attrs).length > 0) {
        setGlobalAttributes(attrs);
    }
}
/**
 * Get the trace ID from the active span, if available.
 * Useful for correlating runs to Sentry traces in logs and output.
 */
function getTraceId() {
    if (!initialized)
        return undefined;
    try {
        return Sentry.getActiveSpan()?.spanContext().traceId;
    }
    catch {
        return undefined;
    }
}
/**
 * Run a metrics callback only when Sentry is initialized.
 * Swallows errors so metrics never break the main workflow.
 */
function safeEmit(fn) {
    if (!initialized)
        return;
    try {
        fn();
    }
    catch {
        // Metrics emission should never break the main workflow
    }
}
/**
 * Build agent-scoped metric attributes that match span attribute names.
 */
function agentMetricAttributes(skill, model, runtime) {
    const attrs = { 'gen_ai.agent.name': skill };
    if (model) {
        attrs['gen_ai.request.model'] = model;
    }
    if (runtime) {
        attrs['warden.runtime.name'] = runtime;
    }
    return attrs;
}
function usageTokenComponents(usage) {
    if (!usage)
        return [];
    const cacheReadInputTokens = usage.cacheReadInputTokens ?? 0;
    const cacheCreation5mInputTokens = usage.cacheCreation5mInputTokens ?? 0;
    const cacheCreation1hInputTokens = usage.cacheCreation1hInputTokens ?? 0;
    const cacheCreationInputTokens = Math.max(usage.cacheCreationInputTokens ?? 0, cacheCreation5mInputTokens + cacheCreation1hInputTokens);
    const categorizedCacheCreationInputTokens = cacheCreation5mInputTokens + cacheCreation1hInputTokens;
    const uncategorizedCacheCreationInputTokens = Math.max(0, cacheCreationInputTokens - categorizedCacheCreationInputTokens);
    const standardInputTokens = Math.max(0, usage.inputTokens - cacheReadInputTokens - cacheCreationInputTokens);
    return [
        { category: 'standard_input', tokens: standardInputTokens },
        { category: 'cache_read_input', tokens: cacheReadInputTokens },
        {
            category: 'cache_creation_5m_input',
            tokens: cacheCreation5mInputTokens + uncategorizedCacheCreationInputTokens,
        },
        { category: 'cache_creation_1h_input', tokens: cacheCreation1hInputTokens },
        { category: 'output', tokens: usage.outputTokens },
    ];
}
function emitUsageComponentMetrics(attrs, usage) {
    for (const { category, tokens } of usageTokenComponents(usage)) {
        if (tokens <= 0)
            continue;
        _sentry_node__WEBPACK_IMPORTED_MODULE_11__.distribution('warden.gen_ai.token.usage', tokens, {
            unit: '{token}',
            attributes: { ...attrs, 'warden.gen_ai.token.category': category },
        });
    }
}
function emitCostComponentMetrics(attrs, model, usage) {
    if (!usage)
        return;
    const breakdown = (0,_sdk_pricing_js__WEBPACK_IMPORTED_MODULE_3__/* .estimateUsageCostBreakdown */ .MG)(model, usage);
    if (!breakdown)
        return;
    const components = [
        { component: 'standard_input', costUSD: breakdown.freshInputUSD },
        { component: 'cache_read_input', costUSD: breakdown.cacheReadUSD },
        { component: 'cache_creation_5m_input', costUSD: breakdown.cacheCreationUSD + breakdown.cacheCreation5mUSD },
        { component: 'cache_creation_1h_input', costUSD: breakdown.cacheCreation1hUSD },
        { component: 'output', costUSD: breakdown.outputUSD },
        { component: 'web_search', costUSD: breakdown.webSearchUSD },
    ];
    for (const { component, costUSD } of components) {
        if (costUSD <= 0)
            continue;
        _sentry_node__WEBPACK_IMPORTED_MODULE_11__.distribution('warden.gen_ai.cost.component.usd', costUSD, {
            attributes: { ...attrs, 'warden.gen_ai.cost.component': component },
        });
    }
}
/**
 * Emit a single run count. Call once per analysis workflow execution.
 * Inherits warden.source, repository, and GitHub Actions attributes from global scope.
 */
function emitRunMetric() {
    safeEmit(() => {
        _sentry_node__WEBPACK_IMPORTED_MODULE_11__.count('warden.workflow.runs', 1);
    });
}
function emitSkillMetrics(report) {
    safeEmit(() => {
        const attrs = agentMetricAttributes(report.skill, report.model, report.runtime);
        _sentry_node__WEBPACK_IMPORTED_MODULE_11__.distribution('warden.skill.duration', report.durationMs ?? 0, {
            unit: 'millisecond',
            attributes: attrs,
        });
        if (report.usage) {
            const tokenAttrs = {
                ...attrs,
                'gen_ai.operation.name': 'invoke_agent',
                'gen_ai.provider.name': (0,_sdk_otel_js__WEBPACK_IMPORTED_MODULE_2__/* .genAiProviderName */ .Jo)(report.runtime, report.model),
            };
            _sentry_node__WEBPACK_IMPORTED_MODULE_11__.distribution('gen_ai.client.token.usage', report.usage.inputTokens, {
                unit: '{token}',
                attributes: { ...tokenAttrs, 'gen_ai.token.type': 'input' },
            });
            _sentry_node__WEBPACK_IMPORTED_MODULE_11__.distribution('gen_ai.client.token.usage', report.usage.outputTokens, {
                unit: '{token}',
                attributes: { ...tokenAttrs, 'gen_ai.token.type': 'output' },
            });
            emitUsageComponentMetrics(tokenAttrs, report.usage);
            emitCostComponentMetrics(attrs, report.model, report.usage);
            if (report.usage.costUSD) {
                _sentry_node__WEBPACK_IMPORTED_MODULE_11__.distribution('warden.gen_ai.cost.usd', report.usage.costUSD, { attributes: attrs });
            }
        }
        for (const severity of Object.keys(_types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B)) {
            const count = report.findings.filter((f) => f.severity === severity).length;
            if (count > 0) {
                _sentry_node__WEBPACK_IMPORTED_MODULE_11__.count('warden.findings', count, {
                    attributes: { ...attrs, 'warden.finding.severity': severity },
                });
            }
        }
    });
}
function emitExtractionMetrics(skill, method, count) {
    safeEmit(() => {
        const attrs = { ...agentMetricAttributes(skill), 'warden.extraction.method': method };
        _sentry_node__WEBPACK_IMPORTED_MODULE_11__.count('warden.extraction.attempts', 1, { attributes: attrs });
        _sentry_node__WEBPACK_IMPORTED_MODULE_11__.count('warden.extraction.findings', count, { attributes: attrs });
    });
}
function emitFixEvalMetrics(evaluated, resolved, failed, skipped, uniqueFindingsEvaluated, uniqueFindingsCodeChanged, uniqueFindingsResolved) {
    safeEmit(() => {
        _sentry_node__WEBPACK_IMPORTED_MODULE_11__.count('warden.fix_eval.evaluated', evaluated);
        _sentry_node__WEBPACK_IMPORTED_MODULE_11__.count('warden.fix_eval.resolved', resolved);
        _sentry_node__WEBPACK_IMPORTED_MODULE_11__.count('warden.fix_eval.failed', failed);
        _sentry_node__WEBPACK_IMPORTED_MODULE_11__.count('warden.fix_eval.skipped', skipped);
        _sentry_node__WEBPACK_IMPORTED_MODULE_11__.count('warden.fix_eval.unique_findings.evaluated', uniqueFindingsEvaluated);
        _sentry_node__WEBPACK_IMPORTED_MODULE_11__.count('warden.fix_eval.unique_findings.code_changed', uniqueFindingsCodeChanged);
        _sentry_node__WEBPACK_IMPORTED_MODULE_11__.count('warden.fix_eval.unique_findings.resolved', uniqueFindingsResolved);
    });
}
function emitRetryMetric(skill, attempt) {
    safeEmit(() => {
        _sentry_node__WEBPACK_IMPORTED_MODULE_11__.count('warden.skill.retries', 1, {
            attributes: { ...agentMetricAttributes(skill), 'warden.retry.attempt': attempt },
        });
    });
}
function emitDedupMetrics(skill, total, unique) {
    safeEmit(() => {
        const attrs = agentMetricAttributes(skill);
        _sentry_node__WEBPACK_IMPORTED_MODULE_11__.distribution('warden.dedup.total', total, { attributes: attrs });
        _sentry_node__WEBPACK_IMPORTED_MODULE_11__.distribution('warden.dedup.unique', unique, { attributes: attrs });
        if (total > 0) {
            _sentry_node__WEBPACK_IMPORTED_MODULE_11__.distribution('warden.dedup.removed', total - unique, { attributes: attrs });
        }
    });
}
/**
 * Emit the final fix-evaluation outcome for one comment.
 */
function emitFixEvalVerdictMetric(verdict, skill, options = {}) {
    safeEmit(() => {
        const attrs = { 'warden.fix_eval.verdict': verdict };
        if (options.usedFallback !== undefined) {
            attrs['warden.fix_eval.used_fallback'] = options.usedFallback;
        }
        if (skill) {
            Object.assign(attrs, agentMetricAttributes(skill));
        }
        _sentry_node__WEBPACK_IMPORTED_MODULE_11__.count('warden.fix_eval.verdict', 1, { attributes: attrs });
    });
}
function emitStaleResolutionMetric(count, skill) {
    safeEmit(() => {
        const attrs = skill ? agentMetricAttributes(skill) : undefined;
        _sentry_node__WEBPACK_IMPORTED_MODULE_11__.count('warden.stale.resolved', count, attrs ? { attributes: attrs } : undefined);
    });
}
/**
 * Flush pending Sentry events. Safe to call even if Sentry is not initialized.
 */
async function flushSentry(timeoutMs = 2000) {
    if (!initialized)
        return;
    try {
        await _sentry_node__WEBPACK_IMPORTED_MODULE_8__/* .flush */ .bX(timeoutMs);
    }
    catch {
        // Sentry flush failure should not prevent normal operation
    }
}


/***/ }),

/***/ 78481:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   $3: () => (/* binding */ FixStatusSchema),
/* harmony export */   AU: () => (/* binding */ SkippedFileSchema),
/* harmony export */   B: () => (/* binding */ SEVERITY_ORDER),
/* harmony export */   HA: () => (/* binding */ ConfidenceThresholdSchema),
/* harmony export */   J1: () => (/* binding */ SkillErrorSchema),
/* harmony export */   Lx: () => (/* binding */ compareFindingPriority),
/* harmony export */   Ne: () => (/* binding */ HunkTraceSchema),
/* harmony export */   Ni: () => (/* binding */ filterFindings),
/* harmony export */   Ot: () => (/* binding */ SourceSnippetSchema),
/* harmony export */   TH: () => (/* binding */ LocationSchema),
/* harmony export */   Ur: () => (/* binding */ UsageStatsSchema),
/* harmony export */   bN: () => (/* binding */ GitHubEventTypeSchema),
/* harmony export */   hA: () => (/* binding */ EventContextSchema),
/* harmony export */   kV: () => (/* binding */ countPatchChunks),
/* harmony export */   mC: () => (/* binding */ findingLine),
/* harmony export */   o2: () => (/* binding */ UsageAttributionSchema),
/* harmony export */   p_: () => (/* binding */ FindingSchema),
/* harmony export */   q$: () => (/* binding */ SeverityThresholdSchema),
/* harmony export */   r6: () => (/* binding */ SkillReportSchema),
/* harmony export */   xb: () => (/* binding */ AuxiliaryUsageMapSchema)
/* harmony export */ });
/* unused harmony exports normalizeSeverity, SeveritySchema, ConfidenceSchema, CONFIDENCE_ORDER, filterFindingsBySeverity, filterFindingsByConfidence, SourceSnippetLineSchema, AuxiliaryUsageAttributionMapSchema, FileReportSchema, ErrorCodeSchema, isExtractionErrorCode, HunkFailureSchema, TraceSpanSchema, PullRequestActionSchema, FileChangeSchema, DiffContextSourceSchema, PullRequestContextSchema, RepositoryContextSchema, RetryConfigSchema */
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(53391);

/**
 * Normalize legacy severity values to the 3-level scale.
 * Maps 'critical' → 'high' and 'info' → 'low' for backwards compatibility
 * with old JSONL logs and LLM responses.
 */
function normalizeSeverity(val) {
    if (val === 'critical')
        return 'high';
    if (val === 'info')
        return 'low';
    return val;
}
// Severity levels for findings
const SeveritySchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .preprocess */ .vk(normalizeSeverity, zod__WEBPACK_IMPORTED_MODULE_0__/* ["enum"] */ .k5(['high', 'medium', 'low']));
// Confidence levels for findings
const ConfidenceSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* ["enum"] */ .k5(['high', 'medium', 'low']);
/**
 * Confidence order for comparison (lower = more confident).
 * Single source of truth for confidence ordering across the codebase.
 */
const CONFIDENCE_ORDER = {
    high: 0,
    medium: 1,
    low: 2,
};
// Severity threshold for config options (includes 'off' to disable)
const SeverityThresholdSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .preprocess */ .vk(normalizeSeverity, zod__WEBPACK_IMPORTED_MODULE_0__/* ["enum"] */ .k5(['off', 'high', 'medium', 'low']));
// Confidence threshold for config options (includes 'off' to disable filtering)
const ConfidenceThresholdSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* ["enum"] */ .k5(['off', 'high', 'medium', 'low']);
/**
 * Severity order for comparison (lower = more severe).
 * Single source of truth for severity ordering across the codebase.
 */
const SEVERITY_ORDER = {
    high: 0,
    medium: 1,
    low: 2,
};
/**
 * Filter findings to only include those at or above the given severity threshold.
 * If no threshold is provided, returns all findings unchanged.
 * If threshold is 'off', returns empty array (disabled).
 */
function filterFindingsBySeverity(findings, threshold) {
    if (!threshold)
        return findings;
    if (threshold === 'off')
        return [];
    const thresholdOrder = SEVERITY_ORDER[threshold];
    return findings.filter((f) => SEVERITY_ORDER[f.severity] <= thresholdOrder);
}
/**
 * Filter findings to only include those at or above the given confidence threshold.
 * If no threshold is provided or threshold is 'off', returns all findings unchanged.
 * Findings without a confidence field are always included (backwards compat).
 */
function filterFindingsByConfidence(findings, threshold) {
    if (!threshold || threshold === 'off')
        return findings;
    const thresholdOrder = CONFIDENCE_ORDER[threshold];
    return findings.filter((f) => {
        if (!f.confidence)
            return true;
        return CONFIDENCE_ORDER[f.confidence] <= thresholdOrder;
    });
}
/**
 * Filter findings by both severity and confidence thresholds.
 * Applies severity filtering first, then confidence filtering.
 * Either threshold can be omitted to skip that filter.
 */
function filterFindings(findings, reportOn, minConfidence) {
    return filterFindingsByConfidence(filterFindingsBySeverity(findings, reportOn), minConfidence);
}
// Location within a file
const LocationSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({
    path: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    startLine: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().positive(),
    endLine: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().positive().optional(),
});
const SourceSnippetLineSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({
    line: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().positive(),
    content: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    highlighted: zod__WEBPACK_IMPORTED_MODULE_0__/* .boolean */ .zM().optional(),
});
const SourceSnippetSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({
    path: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    language: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
    startLine: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().positive(),
    endLine: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().positive(),
    targetStartLine: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().positive(),
    targetEndLine: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().positive(),
    lines: zod__WEBPACK_IMPORTED_MODULE_0__/* .array */ .YO(SourceSnippetLineSchema),
});
// Individual finding from a skill
const FindingSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({
    id: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    severity: SeveritySchema,
    confidence: ConfidenceSchema.optional(),
    title: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    description: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    verification: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
    location: LocationSchema.optional(),
    additionalLocations: zod__WEBPACK_IMPORTED_MODULE_0__/* .array */ .YO(LocationSchema).optional(),
    sourceSnippet: SourceSnippetSchema.optional(),
    elapsedMs: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().nonnegative().optional(),
});
/**
 * Get the effective line number for a finding (endLine if present, otherwise startLine).
 */
function findingLine(f) {
    return f.location?.endLine ?? f.location?.startLine ?? 0;
}
/**
 * Compare two findings by priority for winner selection.
 * Lower return value = higher priority (more severe, more confident, earlier path/line).
 */
function compareFindingPriority(a, b) {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0)
        return sevDiff;
    const confA = CONFIDENCE_ORDER[a.confidence ?? 'low'];
    const confB = CONFIDENCE_ORDER[b.confidence ?? 'low'];
    const confDiff = confA - confB;
    if (confDiff !== 0)
        return confDiff;
    const pathCmp = (a.location?.path ?? '').localeCompare(b.location?.path ?? '');
    if (pathCmp !== 0)
        return pathCmp;
    return findingLine(a) - findingLine(b);
}
// Usage statistics normalized from runtime/provider responses.
// inputTokens is total input, including cache-read and cache-created subsets.
const UsageStatsSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({
    inputTokens: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().nonnegative(),
    outputTokens: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().nonnegative(),
    cacheReadInputTokens: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().nonnegative().optional(),
    cacheCreationInputTokens: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().nonnegative().optional(),
    cacheCreation5mInputTokens: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().nonnegative().optional(),
    cacheCreation1hInputTokens: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().nonnegative().optional(),
    webSearchRequests: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().nonnegative().optional(),
    costUSD: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().nonnegative(),
});
const UsageAttributionSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({
    model: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
    models: zod__WEBPACK_IMPORTED_MODULE_0__/* .array */ .YO(zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj()).optional(),
    runtime: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
    runtimes: zod__WEBPACK_IMPORTED_MODULE_0__/* .array */ .YO(zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj()).optional(),
});
// Auxiliary usage from non-SDK LLM calls (extraction repair, semantic dedup, etc.)
const AuxiliaryUsageMapSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .record */ .g1(zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(), UsageStatsSchema);
const AuxiliaryUsageAttributionMapSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .record */ .g1(zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(), UsageAttributionSchema);
// Skipped file info for scan policy, ignore policy, and chunking.
const SkippedFileSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({
    filename: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    reason: zod__WEBPACK_IMPORTED_MODULE_0__/* ["enum"] */ .k5([
        'pattern',
        'builtin',
        'ignored:builtin',
        'ignored:user',
        'ignored:generated',
        'limit:file_size',
        'limit:file_lines',
        'limit:file_read',
        'limit:file_count',
        'limit:changed_lines',
        'limit:missing_patch',
    ]),
    pattern: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
});
// Per-file report within a skill. `findings` is a count; the per-skill
// record uses the same name for the findings array. This matches the
// JSONL contract (see specs/jsonl-examples.jsonl).
//
// IMPORTANT: breaking on-disk JSONL log formats is NEVER ALLOWED. Old
// `.warden/logs/*.jsonl` files must always parse. The schema may evolve
// (add fields, normalize values) but readers must accept all historical
// shapes — convert legacy fields via preprocess/transform here, never by
// asking users to delete old logs. The preprocess below maps the legacy
// `findingCount` field (used pre-rename) into `findings`.
const FileReportSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .preprocess */ .vk((val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
        const obj = val;
        if ('findingCount' in obj && !('findings' in obj)) {
            const { findingCount, ...rest } = obj;
            return { ...rest, findings: findingCount };
        }
    }
    return val;
}, zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({
    filename: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    findings: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().nonnegative(),
    durationMs: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().nonnegative().optional(),
    usage: UsageStatsSchema.optional(),
}));
// Stable codes for run failures. Public contract: add new codes, do not rename.
const ErrorCodeSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* ["enum"] */ .k5([
    'auth_failed',
    'provider_unavailable',
    'sdk_error',
    'subprocess_failure',
    'max_turns',
    'aborted',
    'all_hunks_failed',
    'invalid_model_selector',
    'skill_resolution_failed',
    'extraction_invalid_json',
    'extraction_unbalanced_json',
    'extraction_no_findings_json',
    'extraction_missing_findings_key',
    'extraction_findings_not_array',
    'extraction_llm_failed',
    'extraction_llm_timeout',
    'extraction_no_api_key',
    'unknown',
]);
const EXTRACTION_ERROR_CODES = new Set([
    'extraction_invalid_json',
    'extraction_unbalanced_json',
    'extraction_no_findings_json',
    'extraction_missing_findings_key',
    'extraction_findings_not_array',
    'extraction_llm_failed',
    'extraction_llm_timeout',
    'extraction_no_api_key',
]);
function isExtractionErrorCode(code) {
    return EXTRACTION_ERROR_CODES.has(code);
}
const SkillErrorSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({
    code: ErrorCodeSchema,
    message: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    timestamp: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().datetime().optional(),
});
// 'analysis' = SDK/auth/abort failure, 'extraction' = parse-tier failure.
const HunkFailureSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({
    type: zod__WEBPACK_IMPORTED_MODULE_0__/* ["enum"] */ .k5(['analysis', 'extraction']),
    filename: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    lineRange: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    code: ErrorCodeSchema,
    message: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    preview: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
    attempts: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().nonnegative().optional(),
});
const TraceSpanAttributeValueSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .union */ .KC([
    zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai(),
    zod__WEBPACK_IMPORTED_MODULE_0__/* .boolean */ .zM(),
    zod__WEBPACK_IMPORTED_MODULE_0__/* .array */ .YO(zod__WEBPACK_IMPORTED_MODULE_0__/* .union */ .KC([zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(), zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai(), zod__WEBPACK_IMPORTED_MODULE_0__/* .boolean */ .zM()])),
]);
const TraceSpanSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({
    traceId: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    spanId: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    parentSpanId: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
    op: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
    name: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
    startTimeUnixMs: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().nonnegative().optional(),
    endTimeUnixMs: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().nonnegative().optional(),
    durationMs: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().nonnegative().optional(),
    status: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
    origin: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
    attributes: zod__WEBPACK_IMPORTED_MODULE_0__/* .record */ .g1(zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(), TraceSpanAttributeValueSchema).optional(),
});
// Optional per-hunk runtime trace captured in structured run output.
const HunkTraceSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({
    filename: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    lineRange: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    runtime: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    status: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    traceId: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
    spanId: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
    responseId: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
    responseModel: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
    sessionId: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
    durationMs: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().nonnegative().optional(),
    durationApiMs: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().nonnegative().optional(),
    numTurns: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().nonnegative().optional(),
    spans: zod__WEBPACK_IMPORTED_MODULE_0__/* .array */ .YO(TraceSpanSchema).optional(),
});
// Skill report output
const SkillReportSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({
    skill: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    summary: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    findings: zod__WEBPACK_IMPORTED_MODULE_0__/* .array */ .YO(FindingSchema),
    metadata: zod__WEBPACK_IMPORTED_MODULE_0__/* .record */ .g1(zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(), zod__WEBPACK_IMPORTED_MODULE_0__/* .unknown */ .L5()).optional(),
    durationMs: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().nonnegative().optional(),
    usage: UsageStatsSchema.optional(),
    /** Files that were skipped due to chunking patterns */
    skippedFiles: zod__WEBPACK_IMPORTED_MODULE_0__/* .array */ .YO(SkippedFileSchema).optional(),
    /** Number of hunks that failed to analyze (SDK errors, API errors, etc.) */
    failedHunks: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().nonnegative().optional(),
    /** Number of hunks where findings extraction failed (JSON parse errors) */
    failedExtractions: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().nonnegative().optional(),
    /** Per-hunk failure details, in execution order. */
    hunkFailures: zod__WEBPACK_IMPORTED_MODULE_0__/* .array */ .YO(HunkFailureSchema).optional(),
    /** Optional per-hunk runtime traces, only captured when explicitly requested. */
    traces: zod__WEBPACK_IMPORTED_MODULE_0__/* .array */ .YO(HunkTraceSchema).optional(),
    /** Set when the run cannot complete normally. */
    error: SkillErrorSchema.optional(),
    /** Usage from auxiliary LLM calls (extraction repair, semantic dedup, etc.) */
    auxiliaryUsage: AuxiliaryUsageMapSchema.optional(),
    /** Model/runtime attribution for auxiliary LLM usage, keyed like auxiliaryUsage */
    auxiliaryUsageAttribution: AuxiliaryUsageAttributionMapSchema.optional(),
    /** Per-file breakdown of findings, timing, and usage */
    files: zod__WEBPACK_IMPORTED_MODULE_0__/* .array */ .YO(FileReportSchema).optional(),
    /** Model used for this skill's analysis */
    model: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
    /** Runtime backend used for this skill's analysis. */
    runtime: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
});
// GitHub event types
const GitHubEventTypeSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* ["enum"] */ .k5([
    'pull_request',
    'issues',
    'issue_comment',
    'pull_request_review',
    'pull_request_review_comment',
    'schedule',
]);
// Pull request actions
const PullRequestActionSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* ["enum"] */ .k5([
    'opened',
    'synchronize',
    'reopened',
    'closed',
    'labeled',
]);
// File change info
const FileChangeSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({
    filename: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    status: zod__WEBPACK_IMPORTED_MODULE_0__/* ["enum"] */ .k5(['added', 'removed', 'modified', 'renamed', 'copied', 'changed', 'unchanged']),
    additions: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().nonnegative(),
    deletions: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().nonnegative(),
    patch: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
    chunks: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().nonnegative().optional(),
});
// Source used to read surrounding file context for diff hunks.
const DiffContextSourceSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .discriminatedUnion */ .gM('type', [
    zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({ type: zod__WEBPACK_IMPORTED_MODULE_0__/* .literal */ .eu('working-tree') }),
    zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({ type: zod__WEBPACK_IMPORTED_MODULE_0__/* .literal */ .eu('git-index') }),
    zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({ type: zod__WEBPACK_IMPORTED_MODULE_0__/* .literal */ .eu('git-ref'), ref: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj() }),
]);
/**
 * Count the number of chunks/hunks in a patch string.
 * Each chunk starts with @@ -X,Y +A,B @@
 */
function countPatchChunks(patch) {
    if (!patch)
        return 0;
    const matches = patch.match(/^@@\s/gm);
    return matches?.length ?? 0;
}
// Pull request context
const PullRequestContextSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({
    number: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().positive(),
    title: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    body: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().nullable(),
    author: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    draft: zod__WEBPACK_IMPORTED_MODULE_0__/* .boolean */ .zM().optional(),
    labels: zod__WEBPACK_IMPORTED_MODULE_0__/* .array */ .YO(zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj()).optional(),
    baseBranch: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    headBranch: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    headSha: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    baseSha: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    files: zod__WEBPACK_IMPORTED_MODULE_0__/* .array */ .YO(FileChangeSchema),
});
// Repository context
const RepositoryContextSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({
    owner: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    name: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    fullName: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    defaultBranch: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
});
// Full event context
const EventContextSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({
    eventType: GitHubEventTypeSchema,
    action: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    label: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj().optional(),
    repository: RepositoryContextSchema,
    pullRequest: PullRequestContextSchema.optional(),
    repoPath: zod__WEBPACK_IMPORTED_MODULE_0__/* .string */ .Yj(),
    diffContextSource: DiffContextSourceSchema.optional(),
    explicitFileTargets: zod__WEBPACK_IMPORTED_MODULE_0__/* .boolean */ .zM().optional(),
});
// Fix evaluation status
const FixStatusSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* ["enum"] */ .k5(['not_attempted', 'attempted_failed', 'resolved']);
// Retry configuration for SDK calls
const RetryConfigSchema = zod__WEBPACK_IMPORTED_MODULE_0__/* .object */ .Ik({
    /** Maximum number of retry attempts (default: 3) */
    maxRetries: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().nonnegative().default(3),
    /** Initial delay in milliseconds before first retry (default: 1000) */
    initialDelayMs: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().positive().default(1000),
    /** Multiplier for exponential backoff (default: 2) */
    backoffMultiplier: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().positive().default(2),
    /** Maximum delay in milliseconds between retries (default: 30000) */
    maxDelayMs: zod__WEBPACK_IMPORTED_MODULE_0__/* .number */ .ai().int().positive().default(30000),
});


/***/ }),

/***/ 82224:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FR: () => (/* binding */ execFileNonInteractive),
/* harmony export */   OO: () => (/* binding */ GIT_NON_INTERACTIVE_ENV),
/* harmony export */   rd: () => (/* binding */ execGitNonInteractive),
/* harmony export */   zt: () => (/* binding */ execNonInteractive)
/* harmony export */ });
/* unused harmony export ExecError */
/* harmony import */ var node_child_process__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(31421);
/* harmony import */ var node_child_process__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_child_process__WEBPACK_IMPORTED_MODULE_0__);

/**
 * Error thrown when a command fails.
 */
class ExecError extends Error {
    command;
    exitCode;
    stderr;
    signal;
    code;
    constructor(command, exitCode, stderr, signal, code, options) {
        const details = stderr || (signal ? `Killed by signal ${signal}` : 'Unknown error');
        super(`Command failed: ${command}\n${details}`, options);
        this.command = command;
        this.exitCode = exitCode;
        this.stderr = stderr;
        this.signal = signal;
        this.code = code;
        this.name = 'ExecError';
    }
}
/**
 * Git environment variables that disable interactive prompts.
 * - GIT_TERMINAL_PROMPT=0: Disables git's internal prompts
 * - GIT_SSH_COMMAND with BatchMode=yes: Makes SSH fail instead of prompting for passphrase
 */
const GIT_NON_INTERACTIVE_ENV = {
    GIT_TERMINAL_PROMPT: '0',
    GIT_SSH_COMMAND: 'ssh -o BatchMode=yes',
};
/**
 * Build spawn options for non-interactive execution.
 * - stdin: 'ignore' maps to /dev/null, ensuring immediate EOF on read (no hangs)
 * - stdout/stderr: 'pipe' to capture output
 */
function buildSpawnOptions(options) {
    return {
        encoding: 'utf-8',
        cwd: options?.cwd,
        env: options?.env ? { ...process.env, ...options.env } : process.env,
        timeout: options?.timeout,
        stdio: ['ignore', 'pipe', 'pipe'],
    };
}
/**
 * Execute a shell command in non-interactive mode.
 * Uses piped stdio to avoid passing terminal to child process.
 *
 * @param command - The shell command to execute
 * @param options - Execution options (cwd, env, timeout)
 * @returns The trimmed stdout output
 * @throws ExecError if the command fails
 */
function execNonInteractive(command, options) {
    const spawnOptions = buildSpawnOptions(options);
    // Use shell to execute the command string
    const result = (0,node_child_process__WEBPACK_IMPORTED_MODULE_0__.spawnSync)(command, {
        ...spawnOptions,
        shell: true,
    });
    if (result.error) {
        throw new ExecError(command, null, result.error.message, null, result.error.code, { cause: result.error });
    }
    if (result.status !== 0) {
        const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';
        throw new ExecError(command, result.status, stderr, result.signal?.toString() ?? null);
    }
    const stdout = typeof result.stdout === 'string' ? result.stdout : '';
    return stdout.trim();
}
/**
 * Execute a file with arguments in non-interactive mode.
 * Uses execFile semantics (no shell), avoiding shell injection vulnerabilities.
 * Uses piped stdio to avoid passing terminal to child process.
 *
 * @param file - The executable to run
 * @param args - Arguments to pass to the executable
 * @param options - Execution options (cwd, env, timeout)
 * @returns The trimmed stdout output
 * @throws ExecError if the command fails
 */
function execFileNonInteractive(file, args, options) {
    const spawnOptions = buildSpawnOptions(options);
    const command = `${file} ${args.join(' ')}`;
    const result = (0,node_child_process__WEBPACK_IMPORTED_MODULE_0__.spawnSync)(file, args, spawnOptions);
    if (result.error) {
        throw new ExecError(command, null, result.error.message, null, result.error.code, { cause: result.error });
    }
    if (result.status !== 0) {
        const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';
        throw new ExecError(command, result.status, stderr, result.signal?.toString() ?? null);
    }
    const stdout = typeof result.stdout === 'string' ? result.stdout : '';
    return stdout.trim();
}
/**
 * Execute a git command in non-interactive mode.
 * Combines execFileNonInteractive with GIT_NON_INTERACTIVE_ENV for
 * defense-in-depth against SSH prompts.
 *
 * @param args - Arguments to pass to git
 * @param options - Execution options (cwd, env, timeout)
 * @returns The trimmed stdout output
 * @throws ExecError if the command fails
 */
function execGitNonInteractive(args, options) {
    const env = {
        ...options?.env,
        ...GIT_NON_INTERACTIVE_ENV, // Always override to ensure non-interactive
    };
    return execFileNonInteractive('git', args, { ...options, env });
}


/***/ }),

/***/ 36137:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  WH: () => (/* binding */ DEFAULT_CONCURRENCY),
  jf: () => (/* reexport */ Semaphore),
  cw: () => (/* binding */ bridgeWardenProviderApiKeyEnv),
  ZD: () => (/* binding */ escapeHtml),
  HF: () => (/* reexport */ getVersion),
  kD: () => (/* reexport */ runPool)
});

// UNUSED EXPORTS: ExecError, GIT_NON_INTERACTIVE_ENV, execFileNonInteractive, execGitNonInteractive, execNonInteractive, getAnthropicApiKey, getMajorVersion, isPathLike, processInBatches

;// CONCATENATED MODULE: ./src/utils/async.ts
/**
 * A counting semaphore for limiting concurrent access to a shared resource.
 * Callers acquire a permit before starting work and release it when done.
 * If no permits are available, acquire() blocks until one is released.
 */
class Semaphore {
    permits;
    waiters = [];
    /** The initial permit count this semaphore was created with. */
    initialPermits;
    constructor(permits) {
        this.permits = permits;
        this.initialPermits = permits;
    }
    async acquire() {
        if (this.permits > 0) {
            this.permits--;
            return;
        }
        return new Promise((resolve) => {
            this.waiters.push(resolve);
        });
    }
    release() {
        const next = this.waiters.shift();
        if (next) {
            next();
        }
        else {
            this.permits++;
        }
    }
}
/**
 * Run async work items with a sliding-window concurrency pool.
 * Spawns up to `concurrency` workers that each grab the next
 * queued item as soon as they finish, keeping all slots busy.
 *
 * Results are returned in input order regardless of completion order.
 * When `shouldAbort` is provided and returns true, workers stop
 * picking up new items; already-started items run to completion.
 * Only completed items appear in the returned array.
 */
async function runPool(items, concurrency, fn, options) {
    const results = [];
    let nextIndex = 0;
    async function worker() {
        while (nextIndex < items.length) {
            if (options?.shouldAbort?.())
                break;
            const index = nextIndex++;
            const item = items[index];
            results.push({ index, value: await fn(item, index) });
        }
    }
    const workerCount = Math.min(concurrency, items.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    // Return results in input order
    results.sort((a, b) => a.index - b.index);
    return results.map((r) => r.value);
}
/**
 * Process items with limited concurrency using a sliding-window pool.
 */
async function processInBatches(items, fn, batchSize) {
    return runPool(items, batchSize, fn);
}

// EXTERNAL MODULE: external "node:fs"
var external_node_fs_ = __webpack_require__(73024);
// EXTERNAL MODULE: external "node:path"
var external_node_path_ = __webpack_require__(76760);
// EXTERNAL MODULE: external "node:url"
var external_node_url_ = __webpack_require__(73136);
;// CONCATENATED MODULE: ./src/utils/version.ts



let cachedVersion;
function getVersion() {
    if (cachedVersion)
        return cachedVersion;
    const __dirname = (0,external_node_path_.dirname)((0,external_node_url_.fileURLToPath)(import.meta.url));
    const pkg = JSON.parse((0,external_node_fs_.readFileSync)((0,external_node_path_.join)(__dirname, '..', '..', 'package.json'), 'utf-8'));
    cachedVersion = pkg.version;
    return cachedVersion;
}
function getMajorVersion() {
    return getVersion().split('.')[0] ?? '0';
}

// EXTERNAL MODULE: ./src/utils/exec.ts
var exec = __webpack_require__(82224);
// EXTERNAL MODULE: ./src/utils/path.ts
var path = __webpack_require__(60702);
;// CONCATENATED MODULE: ./src/utils/index.ts




/** Default concurrency for parallel trigger/skill execution */
const DEFAULT_CONCURRENCY = 4;
/**
 * Escape HTML special characters to prevent them from being interpreted as HTML.
 * Preserves content inside markdown code blocks (```) and inline code (`).
 * Used when rendering finding titles/descriptions in GitHub comments.
 */
function escapeHtml(text) {
    // Extract code blocks and inline code, escape HTML in the rest
    const codeBlocks = [];
    // Replace code blocks (``` ... ```) and inline code (` ... `) with indexed placeholders
    // Process triple backticks first (they may contain single backticks)
    let processed = text.replace(/```[\s\S]*?```/g, (match) => {
        const idx = codeBlocks.length;
        codeBlocks.push(match);
        return `\0CODE${idx}\0`;
    });
    // Then process inline code (single backticks)
    processed = processed.replace(/`[^`]+`/g, (match) => {
        const idx = codeBlocks.length;
        codeBlocks.push(match);
        return `\0CODE${idx}\0`;
    });
    // Escape HTML in the non-code portions
    processed = processed
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    // Restore code blocks by index
    codeBlocks.forEach((block, i) => {
        processed = processed.replace(`\0CODE${i}\0`, block);
    });
    return processed;
}
/**
 * Get the Anthropic API key from environment variables.
 * Checks WARDEN_ANTHROPIC_API_KEY first, then falls back to ANTHROPIC_API_KEY.
 */
function getAnthropicApiKey() {
    return process.env['WARDEN_ANTHROPIC_API_KEY'] ?? process.env['ANTHROPIC_API_KEY'];
}
/**
 * Mirrors WARDEN-prefixed provider API keys to the env names expected by SDKs.
 */
function bridgeWardenProviderApiKeyEnv(env = process.env) {
    for (const [key, value] of Object.entries(env)) {
        if (!value || !key.startsWith('WARDEN_') || !key.endsWith('_API_KEY')) {
            continue;
        }
        const providerKey = key.slice('WARDEN_'.length);
        if (!env[providerKey]) {
            env[providerKey] = value;
        }
    }
}


/***/ }),

/***/ 60702:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BI: () => (/* binding */ resolvePathTarget),
/* harmony export */   Fd: () => (/* binding */ normalizePath),
/* harmony export */   Ms: () => (/* binding */ isRepoRelativePath),
/* harmony export */   RA: () => (/* binding */ isPathLike)
/* harmony export */ });
/* unused harmony export resolveConfigInput */
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(73024);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_os__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(48161);
/* harmony import */ var node_os__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(node_os__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(76760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(node_path__WEBPACK_IMPORTED_MODULE_2__);



/**
 * Normalize path separators to forward slashes for cross-platform consistency.
 */
function normalizePath(path) {
    return path.replace(/\\/g, '/');
}
/**
 * Check whether a normalized path stays within a repository-relative boundary.
 */
function isRepoRelativePath(path) {
    return path !== '' && path !== '..' && !path.startsWith('../') && !(0,node_path__WEBPACK_IMPORTED_MODULE_2__.isAbsolute)(path);
}
/**
 * Check whether a target string should be treated as a filesystem path.
 */
function isPathLike(value) {
    return value === '~' || value.startsWith('.') || value.includes('/') || value.includes('\\');
}
/**
 * Resolve a user-supplied config input to the absolute path of a warden.toml
 * file. If the resolved path is a directory, appends 'warden.toml'; otherwise
 * treats the input as a direct file path.
 */
function resolveConfigInput(input) {
    const p = resolve(process.cwd(), input);
    try {
        if (statSync(p).isDirectory())
            return join(p, 'warden.toml');
    }
    catch {
        // Path doesn't exist or isn't accessible — treat as direct file path
    }
    return p;
}
/**
 * Resolve a CLI path target against a base directory.
 */
function resolvePathTarget(path, baseDir) {
    if (path.startsWith('~/')) {
        return (0,node_path__WEBPACK_IMPORTED_MODULE_2__.join)((0,node_os__WEBPACK_IMPORTED_MODULE_1__.homedir)(), path.slice(2));
    }
    if (path === '~') {
        return (0,node_os__WEBPACK_IMPORTED_MODULE_1__.homedir)();
    }
    if ((0,node_path__WEBPACK_IMPORTED_MODULE_2__.isAbsolute)(path)) {
        return path;
    }
    return baseDir ? (0,node_path__WEBPACK_IMPORTED_MODULE_2__.join)(baseDir, path) : path;
}


/***/ }),

/***/ 51181:
/***/ ((module) => {

function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(() => {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = () => ([]);
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = 51181;
module.exports = webpackEmptyAsyncContext;

/***/ })

};
