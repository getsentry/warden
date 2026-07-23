export const id = 31;
export const ids = [31];
export const modules = {

/***/ 64329:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  closeOpenAICodexWebSocketSessions: () => (/* binding */ closeOpenAICodexWebSocketSessions),
  getOpenAICodexWebSocketDebugStats: () => (/* binding */ getOpenAICodexWebSocketDebugStats),
  resetOpenAICodexWebSocketDebugStats: () => (/* binding */ resetOpenAICodexWebSocketDebugStats),
  stream: () => (/* binding */ stream),
  streamSimple: () => (/* binding */ streamSimple)
});

// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/models.js
var models = __webpack_require__(73470);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/session-resources.js
var session_resources = __webpack_require__(29954);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/utils/abort-signals.js
function combineAbortSignals(signals) {
    const activeSignals = signals.filter((signal) => signal !== undefined);
    if (activeSignals.length === 0) {
        return { cleanup: () => { } };
    }
    if (activeSignals.length === 1) {
        return { signal: activeSignals[0], cleanup: () => { } };
    }
    const controller = new AbortController();
    const listeners = [];
    const abort = (signal) => {
        if (!controller.signal.aborted) {
            controller.abort(signal.reason);
        }
    };
    for (const signal of activeSignals) {
        if (signal.aborted) {
            abort(signal);
            break;
        }
        const listener = () => abort(signal);
        signal.addEventListener("abort", listener, { once: true });
        listeners.push({ signal, listener });
    }
    return {
        signal: controller.signal,
        cleanup: () => {
            for (const { signal, listener } of listeners) {
                signal.removeEventListener("abort", listener);
            }
        },
    };
}
//# sourceMappingURL=abort-signals.js.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/utils/deferred-tools.js
var deferred_tools = __webpack_require__(3123);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/utils/diagnostics.js
var diagnostics = __webpack_require__(10364);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/utils/error-body.js
var error_body = __webpack_require__(22191);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/utils/event-stream.js
var event_stream = __webpack_require__(14257);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/utils/headers.js
var utils_headers = __webpack_require__(41146);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/utils/node-http-proxy.js
var node_http_proxy = __webpack_require__(42594);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/utils/uuid.js
var uuid = __webpack_require__(92869);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/api/openai-prompt-cache.js
var openai_prompt_cache = __webpack_require__(92297);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/api/openai-responses-shared.js
var openai_responses_shared = __webpack_require__(39746);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/api/simple-options.js + 1 modules
var simple_options = __webpack_require__(16417);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/api/openai-codex-responses.js
function loadNodeOs() {
    if (typeof process === "undefined" || !(process.versions?.node || process.versions?.bun)) {
        return null;
    }
    return process.getBuiltinModule?.("node:os") ?? null;
}
// NEVER convert to top-level runtime imports - breaks browser/Vite builds
const _os = loadNodeOs();













// ============================================================================
// Configuration
// ============================================================================
const DEFAULT_CODEX_BASE_URL = "https://chatgpt.com/backend-api";
const JWT_CLAIM_PATH = "https://api.openai.com/auth";
const DEFAULT_MAX_RETRIES = 0;
const BASE_DELAY_MS = 1000;
const DEFAULT_MAX_RETRY_DELAY_MS = 60_000;
const DEFAULT_WEBSOCKET_CONNECT_TIMEOUT_MS = 15_000;
// The Codex backend accepts zstd-compressed request bodies on the SSE responses
// endpoint (the same endpoint the official Codex client compresses against).
const REQUEST_COMPRESSION_ZSTD_LEVEL = 3;
const CODEX_TOOL_CALL_PROVIDERS = new Set(["openai", "openai-codex", "opencode"]);
const WEBSOCKET_MESSAGE_TOO_BIG_CLOSE_CODE = 1009;
const WEBSOCKET_CONNECTION_LIMIT_REACHED_CODE = "websocket_connection_limit_reached";
const CODEX_RESPONSE_STATUSES = new Set([
    "completed",
    "incomplete",
    "failed",
    "cancelled",
    "queued",
    "in_progress",
]);
// ============================================================================
// Retry Helpers
// ============================================================================
function isTerminalRateLimitError(errorText) {
    return /GoUsageLimitError|FreeUsageLimitError|Monthly usage limit reached|available balance|insufficient_quota|out of budget|quota exceeded|billing/i.test(errorText);
}
function isRetryableError(status, errorText) {
    if (status === 429 && isTerminalRateLimitError(errorText)) {
        return false;
    }
    if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
        return true;
    }
    return /rate.?limit|overloaded|service.?unavailable|upstream.?connect|connection.?refused/i.test(errorText);
}
function getRetryAfterDelayMs(headers) {
    const retryAfterMs = headers.get("retry-after-ms");
    if (retryAfterMs !== null) {
        const millis = Number(retryAfterMs);
        if (Number.isFinite(millis)) {
            return Math.max(0, millis);
        }
    }
    const retryAfter = headers.get("retry-after");
    if (!retryAfter) {
        return undefined;
    }
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) {
        return Math.max(0, seconds * 1000);
    }
    const date = Date.parse(retryAfter);
    if (!Number.isNaN(date)) {
        return Math.max(0, date - Date.now());
    }
    return undefined;
}
function capRetryDelayMs(delayMs, options) {
    const maxRetryDelayMs = options?.maxRetryDelayMs ?? DEFAULT_MAX_RETRY_DELAY_MS;
    return maxRetryDelayMs > 0 ? Math.min(delayMs, maxRetryDelayMs) : delayMs;
}
function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new Error("Request was aborted"));
            return;
        }
        const timeout = setTimeout(resolve, ms);
        signal?.addEventListener("abort", () => {
            clearTimeout(timeout);
            reject(new Error("Request was aborted"));
        });
    });
}
function normalizeTimeoutMs(value) {
    if (value === undefined)
        return undefined;
    if (!Number.isFinite(value) || value < 0) {
        throw new Error(`Invalid timeoutMs: ${String(value)}`);
    }
    return Math.floor(value);
}
function loadNodeZlib() {
    if (typeof process === "undefined" || !(process.versions?.node || process.versions?.bun)) {
        return null;
    }
    return process.getBuiltinModule?.("node:zlib") ?? null;
}
// Returns the zstd-compressed body bytes, or null when compression is
// unavailable (browser/Vite builds). Callers fall back to sending the
// uncompressed JSON when this returns null.
function compressRequestBodyZstd(bodyJson) {
    const zlib = loadNodeZlib();
    if (!zlib || typeof zlib.zstdCompressSync !== "function") {
        return null;
    }
    try {
        const compressed = zlib.zstdCompressSync(bodyJson, {
            params: { [zlib.constants.ZSTD_c_compressionLevel]: REQUEST_COMPRESSION_ZSTD_LEVEL },
        });
        return new Uint8Array(compressed.buffer, compressed.byteOffset, compressed.byteLength);
    }
    catch {
        return null;
    }
}
// ============================================================================
// Main Stream Function
// ============================================================================
const stream = (model, context, options) => {
    const stream = new event_stream/* AssistantMessageEventStream */.Q2();
    (async () => {
        const output = {
            role: "assistant",
            content: [],
            api: "openai-codex-responses",
            provider: model.provider,
            model: model.id,
            usage: {
                input: 0,
                output: 0,
                cacheRead: 0,
                cacheWrite: 0,
                totalTokens: 0,
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
            },
            stopReason: "stop",
            timestamp: Date.now(),
        };
        try {
            const apiKey = options?.apiKey;
            if (!apiKey) {
                throw new Error(`No API key for provider: ${model.provider}`);
            }
            const accountId = extractAccountId(apiKey);
            let body = buildRequestBody(model, context, options);
            const nextBody = await options?.onPayload?.(body, model);
            if (nextBody !== undefined) {
                body = nextBody;
            }
            const codexSessionId = (0,openai_prompt_cache/* clampOpenAIPromptCacheKey */.l)(options?.sessionId);
            const websocketRequestId = codexSessionId || (0,uuid/* uuidv7 */.n)();
            const sseHeaders = buildSSEHeaders(model.headers, options?.headers, accountId, apiKey, codexSessionId);
            const websocketHeaders = buildWebSocketHeaders(model.headers, options?.headers, accountId, apiKey, websocketRequestId);
            const bodyJson = JSON.stringify(body);
            const httpTimeoutMs = normalizeTimeoutMs(options?.timeoutMs);
            const websocketConnectTimeoutMs = normalizeTimeoutMs(options?.websocketConnectTimeoutMs);
            const transport = options?.transport || "auto";
            const websocketDisabledForSession = transport !== "sse" && isWebSocketSseFallbackActive(options?.sessionId);
            if (websocketDisabledForSession) {
                recordWebSocketSseFallback(options?.sessionId);
            }
            if (transport !== "sse" && !websocketDisabledForSession) {
                let websocketStarted = false;
                let retriedWebSocketConnectionLimit = false;
                while (true) {
                    websocketStarted = false;
                    try {
                        await processWebSocketStream(resolveCodexWebSocketUrl(model.baseUrl), body, websocketHeaders, output, stream, model, () => {
                            websocketStarted = true;
                        }, httpTimeoutMs, websocketConnectTimeoutMs, options);
                        if (options?.signal?.aborted) {
                            throw new Error("Request was aborted");
                        }
                        stream.push({
                            type: "done",
                            reason: output.stopReason,
                            message: output,
                        });
                        stream.end();
                        return;
                    }
                    catch (error) {
                        const aborted = options?.signal?.aborted;
                        const connectionLimitBeforeStart = !websocketStarted && isWebSocketConnectionLimitReachedError(error);
                        if (!aborted && connectionLimitBeforeStart && !retriedWebSocketConnectionLimit) {
                            retriedWebSocketConnectionLimit = true;
                            continue;
                        }
                        if (aborted || (isCodexNonTransportError(error) && !connectionLimitBeforeStart)) {
                            throw error;
                        }
                        (0,diagnostics/* appendAssistantMessageDiagnostic */.vF)(output, (0,diagnostics/* createAssistantMessageDiagnostic */.hY)("provider_transport_failure", error, {
                            configuredTransport: transport,
                            fallbackTransport: websocketStarted ? undefined : "sse",
                            eventsEmitted: websocketStarted,
                            phase: websocketStarted ? "after_message_stream_start" : "before_message_stream_start",
                            requestBytes: new TextEncoder().encode(bodyJson).byteLength,
                        }));
                        recordWebSocketFailure(options?.sessionId, error);
                        if (websocketStarted) {
                            throw error;
                        }
                        recordWebSocketSseFallback(options?.sessionId);
                        break;
                    }
                }
            }
            // Compress the request body once for the SSE path. The Codex backend
            // decodes Content-Encoding: zstd; the WebSocket transport above sends the
            // uncompressed JSON frame, matching the official Codex client.
            const compressedBody = compressRequestBodyZstd(bodyJson);
            if (compressedBody) {
                sseHeaders.set("content-encoding", "zstd");
            }
            const sseBody = compressedBody ?? bodyJson;
            // Fetch with retry logic for rate limits and transient errors
            let response;
            let lastError;
            const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                if (options?.signal?.aborted) {
                    throw new Error("Request was aborted");
                }
                try {
                    const headerTimeoutSignal = httpTimeoutMs !== undefined && httpTimeoutMs > 0 ? AbortSignal.timeout(httpTimeoutMs) : undefined;
                    const combinedSignal = combineAbortSignals([options?.signal, headerTimeoutSignal]);
                    try {
                        response = await fetch(resolveCodexUrl(model.baseUrl), {
                            method: "POST",
                            headers: sseHeaders,
                            body: sseBody,
                            signal: combinedSignal.signal,
                        });
                    }
                    catch (error) {
                        if (headerTimeoutSignal?.aborted && !options?.signal?.aborted) {
                            throw new Error(`Codex SSE response headers timed out after ${httpTimeoutMs}ms`);
                        }
                        throw error;
                    }
                    finally {
                        combinedSignal.cleanup();
                    }
                    await options?.onResponse?.({ status: response.status, headers: (0,utils_headers/* headersToRecord */.j)(response.headers) }, model);
                    if (response.ok) {
                        break;
                    }
                    const errorText = await response.text();
                    if (attempt < maxRetries && isRetryableError(response.status, errorText)) {
                        const retryAfterDelayMs = getRetryAfterDelayMs(response.headers);
                        const delayMs = retryAfterDelayMs === undefined
                            ? BASE_DELAY_MS * 2 ** attempt
                            : response.status === 429
                                ? capRetryDelayMs(retryAfterDelayMs, options)
                                : retryAfterDelayMs;
                        await sleep(delayMs, options?.signal);
                        continue;
                    }
                    // Parse error for friendly message on final attempt or non-retryable error
                    const fakeResponse = new Response(errorText, {
                        status: response.status,
                        statusText: response.statusText,
                    });
                    const info = await parseErrorResponse(fakeResponse);
                    throw new Error(info.friendlyMessage || info.message);
                }
                catch (error) {
                    if (error instanceof Error) {
                        if (error.name === "AbortError" || error.message === "Request was aborted") {
                            throw new Error("Request was aborted");
                        }
                    }
                    lastError = error instanceof Error ? error : new Error(String(error));
                    // Network errors are retryable
                    if (attempt < maxRetries && !lastError.message.includes("usage limit")) {
                        const delayMs = BASE_DELAY_MS * 2 ** attempt;
                        await sleep(delayMs, options?.signal);
                        continue;
                    }
                    throw lastError;
                }
            }
            if (!response?.ok) {
                throw lastError ?? new Error("Failed after retries");
            }
            if (!response.body) {
                throw new Error("No response body");
            }
            stream.push({ type: "start", partial: output });
            await processStream(response, output, stream, model, options);
            if (options?.signal?.aborted) {
                throw new Error("Request was aborted");
            }
            stream.push({ type: "done", reason: output.stopReason, message: output });
            stream.end();
        }
        catch (error) {
            for (const block of output.content) {
                // partialJson is only a streaming scratch buffer; never persist it.
                delete block.partialJson;
            }
            output.stopReason = options?.signal?.aborted ? "aborted" : "error";
            output.errorMessage = (0,error_body/* formatProviderError */.lR)((0,error_body/* normalizeProviderError */.Jo)(error));
            stream.push({ type: "error", reason: output.stopReason, error: output });
            stream.end();
        }
    })();
    return stream;
};
const streamSimple = (model, context, options) => {
    const apiKey = options?.apiKey;
    if (!apiKey) {
        throw new Error(`No API key for provider: ${model.provider}`);
    }
    const base = (0,simple_options/* buildBaseOptions */.QP)(model, context, options, apiKey);
    const clampedReasoning = options?.reasoning ? (0,models/* clampThinkingLevel */.Kt)(model, options.reasoning) : undefined;
    const reasoningEffort = clampedReasoning === "off" ? undefined : clampedReasoning;
    return stream(model, context, {
        ...base,
        reasoningEffort,
    });
};
// ============================================================================
// Request Building
// ============================================================================
function buildRequestBody(model, context, options) {
    const toolPlacement = (0,deferred_tools/* splitDeferredTools */.F)(context, model.compat?.supportsToolSearch ?? false);
    const messages = (0,openai_responses_shared/* convertResponsesMessages */.iq)(model, context, CODEX_TOOL_CALL_PROVIDERS, {
        includeSystemPrompt: false,
        deferredTools: toolPlacement.deferred,
    });
    const body = {
        model: model.id,
        store: false,
        stream: true,
        instructions: context.systemPrompt || "You are a helpful assistant.",
        input: messages,
        text: { verbosity: options?.textVerbosity || "low" },
        include: ["reasoning.encrypted_content"],
        prompt_cache_key: (0,openai_prompt_cache/* clampOpenAIPromptCacheKey */.l)(options?.sessionId),
        tool_choice: options?.toolChoice ?? "auto",
        parallel_tool_calls: true,
    };
    if (options?.temperature !== undefined) {
        body.temperature = options.temperature;
    }
    if (options?.serviceTier !== undefined) {
        body.service_tier = options.serviceTier;
    }
    if (toolPlacement.immediate.length > 0) {
        body.tools = (0,openai_responses_shared/* convertResponsesTools */.hX)(toolPlacement.immediate, { strict: null });
    }
    if (options?.reasoningEffort !== undefined) {
        const effort = options.reasoningEffort === "none"
            ? (model.thinkingLevelMap?.off ?? "none")
            : (model.thinkingLevelMap?.[options.reasoningEffort] ?? options.reasoningEffort);
        if (effort !== null) {
            body.reasoning = {
                effort,
                summary: options.reasoningSummary ?? "auto",
            };
        }
    }
    return body;
}
function getServiceTierCostMultiplier(model, serviceTier) {
    switch (serviceTier) {
        case "flex":
            return 0.5;
        case "priority":
            return model.id === "gpt-5.5" ? 2.5 : 2;
        default:
            return 1;
    }
}
function applyServiceTierPricing(usage, serviceTier, model) {
    const multiplier = getServiceTierCostMultiplier(model, serviceTier);
    if (multiplier === 1)
        return;
    usage.cost.input *= multiplier;
    usage.cost.output *= multiplier;
    usage.cost.cacheRead *= multiplier;
    usage.cost.cacheWrite *= multiplier;
    usage.cost.total = usage.cost.input + usage.cost.output + usage.cost.cacheRead + usage.cost.cacheWrite;
}
function resolveCodexServiceTier(responseServiceTier, requestServiceTier) {
    if (responseServiceTier === "default" && (requestServiceTier === "flex" || requestServiceTier === "priority")) {
        return requestServiceTier;
    }
    return responseServiceTier ?? requestServiceTier;
}
function resolveCodexUrl(baseUrl) {
    const raw = baseUrl && baseUrl.trim().length > 0 ? baseUrl : DEFAULT_CODEX_BASE_URL;
    const normalized = raw.replace(/\/+$/, "");
    if (normalized.endsWith("/codex/responses"))
        return normalized;
    if (normalized.endsWith("/codex"))
        return `${normalized}/responses`;
    return `${normalized}/codex/responses`;
}
function resolveCodexWebSocketUrl(baseUrl) {
    const url = new URL(resolveCodexUrl(baseUrl));
    if (url.protocol === "https:")
        url.protocol = "wss:";
    if (url.protocol === "http:")
        url.protocol = "ws:";
    return url.toString();
}
// ============================================================================
// Response Processing
// ============================================================================
async function processStream(response, output, stream, model, options) {
    await (0,openai_responses_shared/* processResponsesStream */.KB)(mapCodexEvents(parseSSE(response, options?.signal)), output, stream, model, {
        serviceTier: options?.serviceTier,
        resolveServiceTier: resolveCodexServiceTier,
        applyServiceTierPricing: (usage, serviceTier) => applyServiceTierPricing(usage, serviceTier, model),
    });
}
class CodexApiError extends Error {
    code;
    payload;
    constructor(message, options) {
        super(message);
        this.name = "CodexApiError";
        this.code = options?.code;
        this.payload = options?.payload;
        this.cause = options?.cause;
    }
}
class CodexProtocolError extends Error {
    payload;
    constructor(message, options) {
        super(message);
        this.name = "CodexProtocolError";
        this.payload = options?.payload;
        this.cause = options?.cause;
    }
}
function isCodexNonTransportError(error) {
    return error instanceof CodexApiError || error instanceof CodexProtocolError;
}
function isWebSocketConnectionLimitReachedError(error) {
    return error instanceof CodexApiError && error.code === WEBSOCKET_CONNECTION_LIMIT_REACHED_CODE;
}
function extractCodexEventError(event) {
    const nested = event.error && typeof event.error === "object" ? event.error : undefined;
    return {
        code: typeof event.code === "string" ? event.code : typeof nested?.code === "string" ? nested.code : undefined,
        message: typeof event.message === "string"
            ? event.message
            : typeof nested?.message === "string"
                ? nested.message
                : undefined,
    };
}
async function* mapCodexEvents(events) {
    for await (const event of events) {
        const type = typeof event.type === "string" ? event.type : undefined;
        if (!type)
            continue;
        if (type === "error") {
            const { code, message } = extractCodexEventError(event);
            throw new CodexApiError(`Codex error: ${message || code || JSON.stringify(event)}`, {
                code,
                payload: event,
            });
        }
        if (type === "response.failed") {
            const response = event.response;
            const code = response?.error?.code;
            const message = response?.error?.message;
            throw new CodexApiError(message || "Codex response failed", { code, payload: event });
        }
        if (type === "response.done" || type === "response.completed" || type === "response.incomplete") {
            const response = event.response;
            const normalizedResponse = response
                ? { ...response, status: normalizeCodexStatus(response.status) }
                : response;
            yield { ...event, type: "response.completed", response: normalizedResponse };
            return;
        }
        yield event;
    }
}
function normalizeCodexStatus(status) {
    if (typeof status !== "string")
        return undefined;
    return CODEX_RESPONSE_STATUSES.has(status) ? status : undefined;
}
// ============================================================================
// SSE Parsing
// ============================================================================
async function* parseSSE(response, signal) {
    if (!response.body)
        return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const onAbort = () => {
        void reader.cancel().catch(() => { });
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
        while (true) {
            if (signal?.aborted) {
                throw new Error("Request was aborted");
            }
            const { done, value } = await reader.read();
            if (signal?.aborted) {
                throw new Error("Request was aborted");
            }
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            let idx = buffer.indexOf("\n\n");
            while (idx !== -1) {
                const chunk = buffer.slice(0, idx);
                buffer = buffer.slice(idx + 2);
                const dataLines = chunk
                    .split("\n")
                    .filter((l) => l.startsWith("data:"))
                    .map((l) => l.slice(5).trim());
                if (dataLines.length > 0) {
                    const data = dataLines.join("\n").trim();
                    if (data && data !== "[DONE]") {
                        try {
                            yield JSON.parse(data);
                        }
                        catch (cause) {
                            throw new CodexProtocolError(`Invalid Codex SSE JSON: ${(0,diagnostics/* formatThrownValue */.Fu)(cause)}`, {
                                cause,
                                payload: data,
                            });
                        }
                    }
                }
                idx = buffer.indexOf("\n\n");
            }
        }
    }
    finally {
        signal?.removeEventListener("abort", onAbort);
        try {
            await reader.cancel();
        }
        catch { }
        try {
            reader.releaseLock();
        }
        catch { }
    }
}
// ============================================================================
// WebSocket Parsing
// ============================================================================
const OPENAI_BETA_RESPONSES_WEBSOCKETS = "responses_websockets=2026-02-06";
const SESSION_WEBSOCKET_CACHE_TTL_MS = 5 * 60 * 1000;
const SESSION_WEBSOCKET_MAX_AGE_MS = 55 * 60 * 1000;
const websocketSessionCache = new Map();
const websocketDebugStats = new Map();
const websocketSseFallbackSessions = new Set();
function getOrCreateWebSocketDebugStats(sessionId) {
    let stats = websocketDebugStats.get(sessionId);
    if (!stats) {
        stats = {
            requests: 0,
            connectionsCreated: 0,
            connectionsReused: 0,
            cachedContextRequests: 0,
            storeTrueRequests: 0,
            fullContextRequests: 0,
            deltaRequests: 0,
            lastInputItems: 0,
            websocketFailures: 0,
            sseFallbacks: 0,
        };
        websocketDebugStats.set(sessionId, stats);
    }
    return stats;
}
function getOpenAICodexWebSocketDebugStats(sessionId) {
    const stats = websocketDebugStats.get(sessionId);
    return stats ? { ...stats } : undefined;
}
function resetOpenAICodexWebSocketDebugStats(sessionId) {
    if (sessionId) {
        websocketDebugStats.delete(sessionId);
        websocketSseFallbackSessions.delete(sessionId);
        return;
    }
    websocketDebugStats.clear();
    websocketSseFallbackSessions.clear();
}
function closeOpenAICodexWebSocketSessions(sessionId) {
    const closeEntry = (entry) => {
        if (entry.idleTimer)
            clearTimeout(entry.idleTimer);
        closeWebSocketSilently(entry.socket, 1000, "debug_close");
    };
    if (sessionId) {
        const entry = websocketSessionCache.get(sessionId);
        if (entry)
            closeEntry(entry);
        websocketSessionCache.delete(sessionId);
        return;
    }
    for (const entry of websocketSessionCache.values()) {
        closeEntry(entry);
    }
    websocketSessionCache.clear();
}
(0,session_resources/* registerSessionResourceCleanup */.m)(closeOpenAICodexWebSocketSessions);
function isWebSocketSseFallbackActive(sessionId) {
    return sessionId ? websocketSseFallbackSessions.has(sessionId) : false;
}
function recordWebSocketSseFallback(sessionId) {
    if (!sessionId)
        return;
    const stats = getOrCreateWebSocketDebugStats(sessionId);
    stats.sseFallbacks++;
    stats.websocketFallbackActive = isWebSocketSseFallbackActive(sessionId);
}
function recordWebSocketFailure(sessionId, error) {
    if (!sessionId)
        return;
    websocketSseFallbackSessions.add(sessionId);
    const stats = getOrCreateWebSocketDebugStats(sessionId);
    stats.websocketFailures++;
    stats.lastWebSocketError = (0,diagnostics/* formatThrownValue */.Fu)(error);
    stats.websocketFallbackActive = true;
}
let _cachedWebsocket = null;
async function getWebSocketConstructor(env) {
    if (!env && _cachedWebsocket)
        return _cachedWebsocket;
    // bun doesn't respect http proxy envs, ref: https://github.com/oven-sh/bun/issues/15489
    // TODO: remove this when bun supports proxy envs in websocket.
    if (typeof process !== "undefined" && process.versions?.bun) {
        const WebSocketWithProxy = class extends WebSocket {
            constructor(url, options) {
                let _opts = {};
                if (Array.isArray(options) || typeof options === "string") {
                    _opts = { protocols: options };
                }
                else {
                    _opts = { ...options };
                }
                const proxyUrl = (0,node_http_proxy/* resolveHttpProxyUrlForTarget */.Q)(url.toString().replace(/^wss:/, "https:").replace(/^ws:/, "http:"), env);
                super(url, { ..._opts, ...(proxyUrl ? { proxy: proxyUrl.toString() } : {}) });
            }
        };
        if (!env) {
            _cachedWebsocket = WebSocketWithProxy;
        }
        return WebSocketWithProxy;
    }
    const ctor = globalThis.WebSocket;
    if (typeof ctor !== "function")
        return null;
    return ctor;
}
class WebSocketCloseError extends Error {
    code;
    reason;
    wasClean;
    constructor(message, options) {
        super(message);
        this.name = "WebSocketCloseError";
        this.code = options?.code;
        this.reason = options?.reason;
        this.wasClean = options?.wasClean;
    }
}
function getWebSocketReadyState(socket) {
    const readyState = socket.readyState;
    return typeof readyState === "number" ? readyState : undefined;
}
function isWebSocketReusable(socket) {
    const readyState = getWebSocketReadyState(socket);
    // If readyState is unavailable, assume the runtime keeps it open/reusable.
    return readyState === undefined || readyState === 1;
}
function isWebSocketSessionExpired(entry) {
    return Date.now() - entry.createdAt >= SESSION_WEBSOCKET_MAX_AGE_MS;
}
function closeWebSocketSilently(socket, code = 1000, reason = "done") {
    try {
        socket.close(code, reason);
    }
    catch { }
}
function scheduleSessionWebSocketExpiry(sessionId, entry) {
    if (entry.idleTimer) {
        clearTimeout(entry.idleTimer);
    }
    entry.idleTimer = setTimeout(() => {
        if (entry.busy)
            return;
        closeWebSocketSilently(entry.socket, 1000, "idle_timeout");
        websocketSessionCache.delete(sessionId);
    }, SESSION_WEBSOCKET_CACHE_TTL_MS);
}
async function connectWebSocket(url, headers, signal, connectTimeoutMs = DEFAULT_WEBSOCKET_CONNECT_TIMEOUT_MS, env) {
    const WebSocketCtor = await getWebSocketConstructor(env);
    if (!WebSocketCtor) {
        throw new Error("WebSocket transport is not available in this runtime");
    }
    const wsHeaders = (0,utils_headers/* headersToRecord */.j)(headers);
    delete wsHeaders["OpenAI-Beta"];
    return new Promise((resolve, reject) => {
        let settled = false;
        let timeout;
        let socket;
        try {
            socket = new WebSocketCtor(url, { headers: wsHeaders });
        }
        catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
            return;
        }
        const cleanup = () => {
            if (timeout) {
                clearTimeout(timeout);
                timeout = undefined;
            }
            socket.removeEventListener("open", onOpen);
            socket.removeEventListener("error", onError);
            socket.removeEventListener("close", onClose);
            signal?.removeEventListener("abort", onAbort);
        };
        const fail = (error, closeReason) => {
            if (settled)
                return;
            settled = true;
            cleanup();
            if (closeReason) {
                closeWebSocketSilently(socket, 1000, closeReason);
            }
            reject(error);
        };
        const onOpen = () => {
            if (settled)
                return;
            settled = true;
            cleanup();
            resolve(socket);
        };
        const onError = (event) => {
            fail(extractWebSocketError(event));
        };
        const onClose = (event) => {
            fail(extractWebSocketCloseError(event));
        };
        const onAbort = () => {
            fail(new Error("Request was aborted"), "aborted");
        };
        socket.addEventListener("open", onOpen);
        socket.addEventListener("error", onError);
        socket.addEventListener("close", onClose);
        signal?.addEventListener("abort", onAbort);
        if (connectTimeoutMs > 0) {
            timeout = setTimeout(() => {
                fail(new Error(`WebSocket connect timeout after ${connectTimeoutMs}ms`), "connect_timeout");
            }, connectTimeoutMs);
        }
        if (signal?.aborted) {
            onAbort();
        }
    });
}
async function acquireWebSocket(url, headers, sessionId, signal, connectTimeoutMs, env) {
    if (!sessionId) {
        const socket = await connectWebSocket(url, headers, signal, connectTimeoutMs, env);
        return {
            socket,
            reused: false,
            release: () => closeWebSocketSilently(socket),
        };
    }
    const cached = websocketSessionCache.get(sessionId);
    if (cached) {
        if (cached.idleTimer) {
            clearTimeout(cached.idleTimer);
            cached.idleTimer = undefined;
        }
        if (!cached.busy && isWebSocketSessionExpired(cached)) {
            closeWebSocketSilently(cached.socket, 1000, "connection_age_limit");
            websocketSessionCache.delete(sessionId);
        }
        else if (!cached.busy && isWebSocketReusable(cached.socket)) {
            cached.busy = true;
            return {
                socket: cached.socket,
                entry: cached,
                reused: true,
                release: ({ keep } = {}) => {
                    if (!keep || !isWebSocketReusable(cached.socket)) {
                        closeWebSocketSilently(cached.socket);
                        websocketSessionCache.delete(sessionId);
                        return;
                    }
                    cached.busy = false;
                    scheduleSessionWebSocketExpiry(sessionId, cached);
                },
            };
        }
        if (cached.busy) {
            const socket = await connectWebSocket(url, headers, signal, connectTimeoutMs, env);
            return {
                socket,
                reused: false,
                release: () => {
                    closeWebSocketSilently(socket);
                },
            };
        }
        if (!isWebSocketReusable(cached.socket)) {
            closeWebSocketSilently(cached.socket);
            websocketSessionCache.delete(sessionId);
        }
    }
    const socket = await connectWebSocket(url, headers, signal, connectTimeoutMs, env);
    const entry = { socket, busy: true, createdAt: Date.now() };
    websocketSessionCache.set(sessionId, entry);
    return {
        socket,
        entry,
        reused: false,
        release: ({ keep } = {}) => {
            if (!keep || !isWebSocketReusable(entry.socket)) {
                closeWebSocketSilently(entry.socket);
                if (entry.idleTimer)
                    clearTimeout(entry.idleTimer);
                if (websocketSessionCache.get(sessionId) === entry) {
                    websocketSessionCache.delete(sessionId);
                }
                return;
            }
            entry.busy = false;
            scheduleSessionWebSocketExpiry(sessionId, entry);
        },
    };
}
function extractWebSocketError(event) {
    if (event && typeof event === "object") {
        const message = "message" in event ? event.message : undefined;
        if (typeof message === "string" && message.length > 0) {
            return new Error(message);
        }
        const nestedError = "error" in event ? event.error : undefined;
        if (nestedError instanceof Error && nestedError.message.length > 0) {
            return nestedError;
        }
        if (nestedError && typeof nestedError === "object" && "message" in nestedError) {
            const nestedMessage = nestedError.message;
            if (typeof nestedMessage === "string" && nestedMessage.length > 0) {
                return new Error(nestedMessage);
            }
        }
    }
    return new Error("WebSocket error");
}
function extractWebSocketCloseError(event) {
    if (event && typeof event === "object") {
        const code = "code" in event ? event.code : undefined;
        const reason = "reason" in event ? event.reason : undefined;
        const wasClean = "wasClean" in event ? event.wasClean : undefined;
        const codeText = typeof code === "number" ? ` ${code}` : "";
        let reasonText = typeof reason === "string" && reason.length > 0 ? ` ${reason}` : "";
        if (!reasonText && code === WEBSOCKET_MESSAGE_TOO_BIG_CLOSE_CODE) {
            reasonText = " message too big";
        }
        return new WebSocketCloseError(`WebSocket closed${codeText}${reasonText}`.trim(), {
            code: typeof code === "number" ? code : undefined,
            reason: typeof reason === "string" && reason.length > 0 ? reason : undefined,
            wasClean: typeof wasClean === "boolean" ? wasClean : undefined,
        });
    }
    return new Error("WebSocket closed");
}
async function decodeWebSocketData(data) {
    if (typeof data === "string")
        return data;
    if (data instanceof ArrayBuffer) {
        return new TextDecoder().decode(new Uint8Array(data));
    }
    if (ArrayBuffer.isView(data)) {
        const view = data;
        return new TextDecoder().decode(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    }
    if (data && typeof data === "object" && "arrayBuffer" in data) {
        const blobLike = data;
        const arrayBuffer = await blobLike.arrayBuffer();
        return new TextDecoder().decode(new Uint8Array(arrayBuffer));
    }
    return null;
}
async function* parseWebSocket(socket, signal, idleTimeoutMs) {
    const queue = [];
    let pending = null;
    let done = false;
    let failed = null;
    let sawCompletion = false;
    const wake = () => {
        if (!pending)
            return;
        const resolve = pending;
        pending = null;
        resolve();
    };
    const onMessage = (event) => {
        void (async () => {
            let text = null;
            try {
                if (!event || typeof event !== "object" || !("data" in event))
                    return;
                text = await decodeWebSocketData(event.data);
                if (!text)
                    return;
                const parsed = JSON.parse(text);
                const type = typeof parsed.type === "string" ? parsed.type : "";
                if (type === "response.completed" || type === "response.done" || type === "response.incomplete") {
                    sawCompletion = true;
                    done = true;
                }
                queue.push(parsed);
                wake();
            }
            catch (cause) {
                failed = new CodexProtocolError(`Invalid Codex WebSocket JSON: ${(0,diagnostics/* formatThrownValue */.Fu)(cause)}`, {
                    cause,
                    payload: text,
                });
                done = true;
                wake();
            }
        })();
    };
    const onError = (event) => {
        failed = extractWebSocketError(event);
        done = true;
        wake();
    };
    const onClose = (event) => {
        if (sawCompletion) {
            done = true;
            wake();
            return;
        }
        if (!failed) {
            failed = extractWebSocketCloseError(event);
        }
        done = true;
        wake();
    };
    const onAbort = () => {
        failed = new Error("Request was aborted");
        done = true;
        wake();
    };
    socket.addEventListener("message", onMessage);
    socket.addEventListener("error", onError);
    socket.addEventListener("close", onClose);
    signal?.addEventListener("abort", onAbort);
    try {
        while (true) {
            if (signal?.aborted) {
                throw new Error("Request was aborted");
            }
            if (queue.length > 0) {
                yield queue.shift();
                continue;
            }
            if (done)
                break;
            let timeout;
            await new Promise((resolve, reject) => {
                pending = resolve;
                if (idleTimeoutMs !== undefined && idleTimeoutMs > 0) {
                    timeout = setTimeout(() => {
                        const error = new Error(`WebSocket idle timeout after ${idleTimeoutMs}ms`);
                        failed = error;
                        done = true;
                        pending = null;
                        closeWebSocketSilently(socket, 1000, "idle_timeout");
                        reject(error);
                    }, idleTimeoutMs);
                }
            }).finally(() => {
                if (timeout) {
                    clearTimeout(timeout);
                }
            });
        }
        if (failed) {
            throw failed;
        }
        if (!sawCompletion) {
            throw new Error("WebSocket stream closed before response.completed");
        }
    }
    finally {
        socket.removeEventListener("message", onMessage);
        socket.removeEventListener("error", onError);
        socket.removeEventListener("close", onClose);
        signal?.removeEventListener("abort", onAbort);
    }
}
function requestBodyWithoutInput(body) {
    const { input: _input, previous_response_id: _previousResponseId, ...rest } = body;
    return rest;
}
function responseInputsEqual(a, b) {
    return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
}
function requestBodiesMatchExceptInput(a, b) {
    return JSON.stringify(requestBodyWithoutInput(a)) === JSON.stringify(requestBodyWithoutInput(b));
}
function getCachedWebSocketInputDelta(body, continuation) {
    if (!requestBodiesMatchExceptInput(body, continuation.lastRequestBody)) {
        return undefined;
    }
    const currentInput = body.input ?? [];
    const baseline = [...(continuation.lastRequestBody.input ?? []), ...continuation.lastResponseItems];
    if (currentInput.length < baseline.length) {
        return undefined;
    }
    const prefix = currentInput.slice(0, baseline.length);
    if (!responseInputsEqual(prefix, baseline)) {
        return undefined;
    }
    return currentInput.slice(baseline.length);
}
function buildCachedWebSocketRequestBody(entry, body) {
    const continuation = entry.continuation;
    if (!continuation) {
        return body;
    }
    const delta = getCachedWebSocketInputDelta(body, continuation);
    if (!delta || !continuation.lastResponseId) {
        entry.continuation = undefined;
        return body;
    }
    return {
        ...body,
        previous_response_id: continuation.lastResponseId,
        input: delta,
    };
}
async function* startWebSocketOutputOnFirstEvent(events, output, stream, onStart) {
    let started = false;
    for await (const event of events) {
        if (!started) {
            started = true;
            onStart();
            stream.push({ type: "start", partial: output });
        }
        yield event;
    }
}
async function processWebSocketStream(url, body, headers, output, stream, model, onStart, idleTimeoutMs, websocketConnectTimeoutMs, options) {
    const { socket, entry, reused, release } = await acquireWebSocket(url, headers, options?.sessionId, options?.signal, websocketConnectTimeoutMs, options?.env);
    let keepConnection = true;
    const useCachedContext = options?.transport === "websocket-cached" || options?.transport === "auto";
    // ChatGPT Codex Responses rejects `store: true` ("Store must be set to false").
    // WebSocket continuation still works via connection-scoped previous_response_id state.
    const fullBody = body;
    const requestBody = useCachedContext && entry ? buildCachedWebSocketRequestBody(entry, fullBody) : fullBody;
    const stats = options?.sessionId ? getOrCreateWebSocketDebugStats(options.sessionId) : undefined;
    if (stats) {
        stats.requests++;
        if (reused)
            stats.connectionsReused++;
        else
            stats.connectionsCreated++;
        if (useCachedContext)
            stats.cachedContextRequests++;
        if (requestBody.store === true)
            stats.storeTrueRequests++;
        stats.lastInputItems = requestBody.input?.length ?? 0;
        if (requestBody.previous_response_id) {
            stats.deltaRequests++;
            stats.lastDeltaInputItems = requestBody.input?.length ?? 0;
            stats.lastPreviousResponseId = requestBody.previous_response_id;
        }
        else {
            stats.fullContextRequests++;
            stats.lastDeltaInputItems = undefined;
            stats.lastPreviousResponseId = undefined;
        }
    }
    try {
        socket.send(JSON.stringify({ type: "response.create", ...requestBody }));
        await (0,openai_responses_shared/* processResponsesStream */.KB)(startWebSocketOutputOnFirstEvent(mapCodexEvents(parseWebSocket(socket, options?.signal, idleTimeoutMs)), output, stream, onStart), output, stream, model, {
            serviceTier: options?.serviceTier,
            resolveServiceTier: resolveCodexServiceTier,
            applyServiceTierPricing: (usage, serviceTier) => applyServiceTierPricing(usage, serviceTier, model),
        });
        if (options?.signal?.aborted) {
            keepConnection = false;
        }
        else if (useCachedContext && entry && output.responseId) {
            const responseItems = (0,openai_responses_shared/* convertResponsesMessages */.iq)(model, { messages: [output] }, CODEX_TOOL_CALL_PROVIDERS, {
                includeSystemPrompt: false,
            }).filter((item) => item.type !== "function_call_output");
            entry.continuation = {
                lastRequestBody: fullBody,
                lastResponseId: output.responseId,
                lastResponseItems: responseItems,
            };
        }
    }
    catch (error) {
        if (entry) {
            entry.continuation = undefined;
        }
        keepConnection = false;
        throw error;
    }
    finally {
        release({ keep: keepConnection });
    }
}
// ============================================================================
// Error Handling
// ============================================================================
async function parseErrorResponse(response) {
    const raw = await response.text();
    let message = raw || response.statusText || "Request failed";
    let friendlyMessage;
    try {
        const parsed = JSON.parse(raw);
        const err = parsed?.error;
        if (err) {
            const code = err.code || err.type || "";
            if (/usage_limit_reached|usage_not_included|rate_limit_exceeded/i.test(code) || response.status === 429) {
                const plan = err.plan_type ? ` (${err.plan_type.toLowerCase()} plan)` : "";
                const mins = err.resets_at
                    ? Math.max(0, Math.round((err.resets_at * 1000 - Date.now()) / 60000))
                    : undefined;
                const when = mins !== undefined ? ` Try again in ~${mins} min.` : "";
                friendlyMessage = `You have hit your ChatGPT usage limit${plan}.${when}`.trim();
            }
            message = err.message || friendlyMessage || message;
        }
    }
    catch { }
    return { message, friendlyMessage };
}
// ============================================================================
// Auth & Headers
// ============================================================================
function extractAccountId(token) {
    try {
        const parts = token.split(".");
        if (parts.length !== 3)
            throw new Error("Invalid token");
        const payload = JSON.parse(atob(parts[1]));
        const accountId = payload?.[JWT_CLAIM_PATH]?.chatgpt_account_id;
        if (!accountId)
            throw new Error("No account ID in token");
        return accountId;
    }
    catch {
        throw new Error("Failed to extract accountId from token");
    }
}
function buildBaseCodexHeaders(initHeaders, additionalHeaders, accountId, token) {
    const headers = new Headers(initHeaders);
    for (const [key, value] of Object.entries(additionalHeaders || {})) {
        if (value === null) {
            headers.delete(key);
        }
        else {
            headers.set(key, value);
        }
    }
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("chatgpt-account-id", accountId);
    headers.set("originator", "pi");
    const userAgent = _os ? `pi (${_os.platform()} ${_os.release()}; ${_os.arch()})` : "pi (browser)";
    headers.set("User-Agent", userAgent);
    return headers;
}
function buildSSEHeaders(initHeaders, additionalHeaders, accountId, token, sessionId) {
    const headers = buildBaseCodexHeaders(initHeaders, additionalHeaders, accountId, token);
    headers.set("OpenAI-Beta", "responses=experimental");
    headers.set("accept", "text/event-stream");
    headers.set("content-type", "application/json");
    if (sessionId) {
        headers.set("session-id", sessionId);
        headers.set("x-client-request-id", sessionId);
    }
    return headers;
}
function buildWebSocketHeaders(initHeaders, additionalHeaders, accountId, token, requestId) {
    const headers = buildBaseCodexHeaders(initHeaders, additionalHeaders, accountId, token);
    headers.delete("accept");
    headers.delete("content-type");
    headers.delete("OpenAI-Beta");
    headers.delete("openai-beta");
    headers.set("OpenAI-Beta", OPENAI_BETA_RESPONSES_WEBSOCKETS);
    headers.set("x-client-request-id", requestId);
    headers.set("session-id", requestId);
    return headers;
}
//# sourceMappingURL=openai-codex-responses.js.map

/***/ }),

/***/ 29954:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   K: () => (/* binding */ cleanupSessionResources),
/* harmony export */   m: () => (/* binding */ registerSessionResourceCleanup)
/* harmony export */ });
const sessionResourceCleanups = new Set();
function registerSessionResourceCleanup(cleanup) {
    sessionResourceCleanups.add(cleanup);
    return () => {
        sessionResourceCleanups.delete(cleanup);
    };
}
function cleanupSessionResources(sessionId) {
    const errors = [];
    for (const cleanup of sessionResourceCleanups) {
        try {
            cleanup(sessionId);
        }
        catch (error) {
            errors.push(error);
        }
    }
    if (errors.length > 0) {
        throw new AggregateError(errors, "Failed to cleanup session resources");
    }
}
//# sourceMappingURL=session-resources.js.map

/***/ }),

/***/ 3123:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   F: () => (/* binding */ splitDeferredTools)
/* harmony export */ });
const identityToolName = (name) => name;
/** Split current tools into prefix and transcript-loaded definitions. */
function splitDeferredTools(context, enabled, normalizeName = identityToolName) {
    const uniqueTools = new Map();
    for (const tool of context.tools ?? [])
        uniqueTools.set(normalizeName(tool.name), tool);
    if (!enabled)
        return { immediate: [...uniqueTools.values()], deferred: new Map() };
    const deferredNames = new Set();
    const usedNames = new Set();
    for (const message of context.messages) {
        if (message.role === "assistant") {
            for (const block of message.content) {
                if (block.type === "toolCall")
                    usedNames.add(normalizeName(block.name));
            }
        }
        else if (message.role === "toolResult") {
            for (const name of message.addedToolNames ?? []) {
                const normalizedName = normalizeName(name);
                if (!usedNames.has(normalizedName))
                    deferredNames.add(normalizedName);
            }
        }
    }
    const immediate = [];
    const deferred = new Map();
    for (const [name, tool] of uniqueTools) {
        if (deferredNames.has(name))
            deferred.set(name, tool);
        else
            immediate.push(tool);
    }
    return { immediate, deferred };
}
//# sourceMappingURL=deferred-tools.js.map

/***/ }),

/***/ 10364:
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

/***/ 22191:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Jo: () => (/* binding */ normalizeProviderError),
/* harmony export */   lR: () => (/* binding */ formatProviderError)
/* harmony export */ });
/* unused harmony exports MAX_PROVIDER_ERROR_BODY_CHARS, truncateErrorText, safeJsonStringify */
// Shared normalization for provider HTTP error objects.
//
// Endpoints behind a proxy / gateway may return a non-2xx response whose body
// the provider SDK cannot fold into `error.message`. The SDK error object still
// carries the HTTP status and the raw/parsed body, but under SDK-specific field
// names. Provider catch blocks that read only `error.message` therefore drop
// the body and surface opaque messages like `"403 status code (no body)"` or
// collapse to `"Unknown: UnknownError"`.
//
// `normalizeProviderError` probes the known SDK field shapes (Mistral,
// `openai`, `@google/genai`, AWS Bedrock) and returns a struct each provider
// composes into its display string. The `messageCarriesBody` flag captures the
// Anthropic / `@google/genai` happy path where the SDK already folded the body
// into the message, so providers can preserve it without double-printing.
const MAX_PROVIDER_ERROR_BODY_CHARS = 4000;
function normalizeProviderError(error) {
    if (!(error instanceof Error)) {
        return { message: safeJsonStringify(error), messageCarriesBody: false };
    }
    const sdkError = error;
    const status = extractStatus(sdkError);
    const body = extractBody(sdkError);
    const messageCarriesBody = body === undefined || error.message.includes(body);
    return {
        status,
        body,
        message: error.message,
        messageCarriesBody,
    };
}
/**
 * Probe the HTTP status, first numeric hit wins, in SDK-field order:
 * `statusCode` (Mistral) → `status` (`openai`, `@google/genai`) →
 * `$metadata.httpStatusCode` (Bedrock) → `$response.statusCode` (Bedrock).
 */
function extractStatus(error) {
    if (typeof error.statusCode === "number")
        return error.statusCode;
    if (typeof error.status === "number")
        return error.status;
    if (typeof error.$metadata?.httpStatusCode === "number")
        return error.$metadata.httpStatusCode;
    if (typeof error.$response?.statusCode === "number")
        return error.$response.statusCode;
    return undefined;
}
/**
 * Probe the raw body reason, first usable hit wins, in SDK-field order:
 * `body` string (Mistral) → `error` parsed JSON body object (`openai` SDK's
 * `this.error`) → `$response.body` (Bedrock). Empty objects are treated as no
 * body so an empty parsed body does not surface as `"{}"`. The chosen body is
 * truncated to the cap.
 */
function extractBody(error) {
    const bodyText = pickBodyText(error);
    if (bodyText === undefined)
        return undefined;
    const trimmed = bodyText.trim();
    if (trimmed.length === 0)
        return undefined;
    return truncateErrorText(trimmed, MAX_PROVIDER_ERROR_BODY_CHARS);
}
function pickBodyText(error) {
    if (typeof error.body === "string")
        return error.body;
    if (isNonEmptyObject(error.error))
        return safeJsonStringify(error.error);
    const responseBody = error.$response?.body;
    if (typeof responseBody === "string")
        return responseBody;
    if (isNonEmptyObject(responseBody))
        return safeJsonStringify(responseBody);
    return undefined;
}
function isNonEmptyObject(value) {
    return typeof value === "object" && value !== null && Object.keys(value).length > 0;
}
/**
 * Compose a display string from a normalized error. When the message already
 * carries the body (Anthropic / `@google/genai` happy path) or no body/status
 * was extracted, the message is returned unchanged. Otherwise the status and
 * body are surfaced, with an optional provider prefix.
 *
 * - no prefix: `"<status>: <body>"`
 * - prefix:    `"<prefix> (<status>): <body>"`
 */
function formatProviderError(norm, prefix) {
    if (norm.messageCarriesBody || norm.status === undefined || norm.body === undefined) {
        return prefix !== undefined && norm.status !== undefined
            ? `${prefix} (${norm.status}): ${norm.message}`
            : norm.message;
    }
    return prefix !== undefined ? `${prefix} (${norm.status}): ${norm.body}` : `${norm.status}: ${norm.body}`;
}
function truncateErrorText(text, maxChars) {
    if (text.length <= maxChars)
        return text;
    return `${text.slice(0, maxChars)}... [truncated ${text.length - maxChars} chars]`;
}
function safeJsonStringify(value) {
    try {
        const serialized = JSON.stringify(value);
        return serialized === undefined ? String(value) : serialized;
    }
    catch {
        return String(value);
    }
}
//# sourceMappingURL=error-body.js.map

/***/ }),

/***/ 41146:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   j: () => (/* binding */ headersToRecord),
/* harmony export */   m: () => (/* binding */ providerHeadersToRecord)
/* harmony export */ });
function headersToRecord(headers) {
    const result = {};
    for (const [key, value] of headers.entries()) {
        result[key] = value;
    }
    return result;
}
function providerHeadersToRecord(headers) {
    if (!headers)
        return undefined;
    const result = {};
    for (const [key, value] of Object.entries(headers)) {
        if (value !== null)
            result[key] = value;
    }
    return Object.keys(result).length > 0 ? result : undefined;
}
//# sourceMappingURL=headers.js.map

/***/ }),

/***/ 42594:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Q: () => (/* binding */ resolveHttpProxyUrlForTarget)
/* harmony export */ });
/* unused harmony export UNSUPPORTED_PROXY_PROTOCOL_MESSAGE */
/* harmony import */ var _provider_env_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(94313);

const DEFAULT_PROXY_PORTS = {
    ftp: 21,
    gopher: 70,
    http: 80,
    https: 443,
    ws: 80,
    wss: 443,
};
function getProxyEnv(key, env) {
    const lowercaseKey = key.toLowerCase();
    const uppercaseKey = key.toUpperCase();
    return (env?.[lowercaseKey] ||
        env?.[uppercaseKey] ||
        (0,_provider_env_js__WEBPACK_IMPORTED_MODULE_0__/* .getProviderEnvValue */ .Y)(lowercaseKey) ||
        (0,_provider_env_js__WEBPACK_IMPORTED_MODULE_0__/* .getProviderEnvValue */ .Y)(uppercaseKey) ||
        "");
}
function parseProxyTargetUrl(targetUrl) {
    if (targetUrl instanceof URL) {
        return targetUrl;
    }
    try {
        return new URL(targetUrl);
    }
    catch {
        return undefined;
    }
}
function shouldProxyHostname(hostname, port, env) {
    const noProxy = getProxyEnv("no_proxy", env).toLowerCase();
    if (!noProxy) {
        return true;
    }
    if (noProxy === "*") {
        return false;
    }
    return noProxy.split(/[,\s]/).every((proxy) => {
        if (!proxy) {
            return true;
        }
        const parsedProxy = proxy.match(/^(.+):(\d+)$/);
        let proxyHostname = parsedProxy ? parsedProxy[1] : proxy;
        const proxyPort = parsedProxy ? Number.parseInt(parsedProxy[2], 10) : 0;
        if (proxyPort && proxyPort !== port) {
            return true;
        }
        if (!/^[.*]/.test(proxyHostname)) {
            return hostname !== proxyHostname;
        }
        if (proxyHostname.startsWith("*")) {
            proxyHostname = proxyHostname.slice(1);
        }
        return !hostname.endsWith(proxyHostname);
    });
}
function getProxyForUrl(targetUrl, env) {
    const parsedUrl = parseProxyTargetUrl(targetUrl);
    if (!parsedUrl?.protocol || !parsedUrl.host) {
        return "";
    }
    const protocol = parsedUrl.protocol.split(":", 1)[0];
    const hostname = parsedUrl.host.replace(/:\d*$/, "");
    const port = Number.parseInt(parsedUrl.port, 10) || DEFAULT_PROXY_PORTS[protocol] || 0;
    if (!shouldProxyHostname(hostname, port, env)) {
        return "";
    }
    let proxy = getProxyEnv(`${protocol}_proxy`, env) || getProxyEnv("all_proxy", env);
    if (proxy && !proxy.includes("://")) {
        proxy = `${protocol}://${proxy}`;
    }
    return proxy;
}
const UNSUPPORTED_PROXY_PROTOCOL_MESSAGE = "Unsupported proxy protocol. SOCKS and PAC proxy URLs are not supported; use an HTTP or HTTPS proxy URL.";
function resolveHttpProxyUrlForTarget(targetUrl, env) {
    const proxy = getProxyForUrl(targetUrl, env);
    if (!proxy) {
        return undefined;
    }
    let proxyUrl;
    try {
        proxyUrl = new URL(proxy);
    }
    catch (error) {
        throw new Error(`Invalid proxy URL ${JSON.stringify(proxy)}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (proxyUrl.protocol !== "http:" && proxyUrl.protocol !== "https:") {
        throw new Error(`${UNSUPPORTED_PROXY_PROTOCOL_MESSAGE} Got ${proxyUrl.protocol}`);
    }
    return proxyUrl;
}
//# sourceMappingURL=node-http-proxy.js.map

/***/ }),

/***/ 80279:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   J: () => (/* binding */ sanitizeSurrogates)
/* harmony export */ });
/**
 * Removes unpaired Unicode surrogate characters from a string.
 *
 * Unpaired surrogates (high surrogates 0xD800-0xDBFF without matching low surrogates 0xDC00-0xDFFF,
 * or vice versa) cause JSON serialization errors in many API providers.
 *
 * Valid emoji and other characters outside the Basic Multilingual Plane use properly paired
 * surrogates and will NOT be affected by this function.
 *
 * @param text - The text to sanitize
 * @returns The sanitized text with unpaired surrogates removed
 *
 * @example
 * // Valid emoji (properly paired surrogates) are preserved
 * sanitizeSurrogates("Hello 🙈 World") // => "Hello 🙈 World"
 *
 * // Unpaired high surrogate is removed
 * const unpaired = String.fromCharCode(0xD83D); // high surrogate without low
 * sanitizeSurrogates(`Text ${unpaired} here`) // => "Text  here"
 */
function sanitizeSurrogates(text) {
    // Replace unpaired high surrogates (0xD800-0xDBFF not followed by low surrogate)
    // Replace unpaired low surrogates (0xDC00-0xDFFF not preceded by high surrogate)
    return text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}
//# sourceMappingURL=sanitize-unicode.js.map

/***/ }),

/***/ 92869:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   n: () => (/* binding */ uuidv7)
/* harmony export */ });
let lastTimestamp = -Infinity;
let sequence = 0;
function fillRandomBytes(bytes) {
    if (globalThis.crypto?.getRandomValues) {
        globalThis.crypto.getRandomValues(bytes);
        return;
    }
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
    }
}
/** Generate a time-ordered UUIDv7. */
function uuidv7() {
    const random = new Uint8Array(16);
    fillRandomBytes(random);
    const timestamp = Date.now();
    if (timestamp > lastTimestamp) {
        sequence = random[6] * 0x1000000 + random[7] * 0x10000 + random[8] * 0x100 + random[9];
        lastTimestamp = timestamp;
    }
    else {
        sequence = (sequence + 1) >>> 0;
        if (sequence === 0)
            lastTimestamp++;
    }
    const bytes = new Uint8Array(16);
    bytes[0] = (lastTimestamp / 0x10000000000) & 0xff;
    bytes[1] = (lastTimestamp / 0x100000000) & 0xff;
    bytes[2] = (lastTimestamp / 0x1000000) & 0xff;
    bytes[3] = (lastTimestamp / 0x10000) & 0xff;
    bytes[4] = (lastTimestamp / 0x100) & 0xff;
    bytes[5] = lastTimestamp & 0xff;
    bytes[6] = 0x70 | ((sequence >>> 28) & 0x0f);
    bytes[7] = (sequence >>> 20) & 0xff;
    bytes[8] = 0x80 | ((sequence >>> 14) & 0x3f);
    bytes[9] = (sequence >>> 6) & 0xff;
    bytes[10] = ((sequence & 0x3f) << 2) | (random[10] & 0x03);
    bytes[11] = random[11];
    bytes[12] = random[12];
    bytes[13] = random[13];
    bytes[14] = random[14];
    bytes[15] = random[15];
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}
//# sourceMappingURL=uuid.js.map

/***/ })

};
