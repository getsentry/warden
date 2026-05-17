export const id = 599;
export const ids = [599];
export const modules = {

/***/ 47980:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   closeOpenAICodexWebSocketSessions: () => (/* binding */ closeOpenAICodexWebSocketSessions),
/* harmony export */   getOpenAICodexWebSocketDebugStats: () => (/* binding */ getOpenAICodexWebSocketDebugStats),
/* harmony export */   resetOpenAICodexWebSocketDebugStats: () => (/* binding */ resetOpenAICodexWebSocketDebugStats),
/* harmony export */   streamOpenAICodexResponses: () => (/* binding */ streamOpenAICodexResponses),
/* harmony export */   streamSimpleOpenAICodexResponses: () => (/* binding */ streamSimpleOpenAICodexResponses)
/* harmony export */ });
/* harmony import */ var _env_api_keys_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(64827);
/* harmony import */ var _models_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(47377);
/* harmony import */ var _session_resources_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(67504);
/* harmony import */ var _utils_diagnostics_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(40998);
/* harmony import */ var _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(86327);
/* harmony import */ var _utils_headers_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(56412);
/* harmony import */ var _openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(99246);
/* harmony import */ var _simple_options_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(97672);
// NEVER convert to top-level runtime imports - breaks browser/Vite builds (web-ui)
let _os = null;
const dynamicImport = (specifier) => __webpack_require__(55738)(specifier);
const NODE_OS_SPECIFIER = "node:" + "os";
if (typeof process !== "undefined" && (process.versions?.node || process.versions?.bun)) {
    dynamicImport(NODE_OS_SPECIFIER).then((m) => {
        _os = m;
    });
}








// ============================================================================
// Configuration
// ============================================================================
const DEFAULT_CODEX_BASE_URL = "https://chatgpt.com/backend-api";
const JWT_CLAIM_PATH = "https://api.openai.com/auth";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const CODEX_TOOL_CALL_PROVIDERS = new Set(["openai", "openai-codex", "opencode"]);
const WEBSOCKET_MESSAGE_TOO_BIG_CLOSE_CODE = 1009;
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
function isRetryableError(status, errorText) {
    if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
        return true;
    }
    return /rate.?limit|overloaded|service.?unavailable|upstream.?connect|connection.?refused/i.test(errorText);
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
// ============================================================================
// Main Stream Function
// ============================================================================
const streamOpenAICodexResponses = (model, context, options) => {
    const stream = new _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_3__/* .AssistantMessageEventStream */ .Q2();
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
            const apiKey = options?.apiKey || (0,_env_api_keys_js__WEBPACK_IMPORTED_MODULE_0__/* .getEnvApiKey */ .P)(model.provider) || "";
            if (!apiKey) {
                throw new Error(`No API key for provider: ${model.provider}`);
            }
            const accountId = extractAccountId(apiKey);
            let body = buildRequestBody(model, context, options);
            const nextBody = await options?.onPayload?.(body, model);
            if (nextBody !== undefined) {
                body = nextBody;
            }
            const websocketRequestId = options?.sessionId || createCodexRequestId();
            const sseHeaders = buildSSEHeaders(model.headers, options?.headers, accountId, apiKey, options?.sessionId);
            const websocketHeaders = buildWebSocketHeaders(model.headers, options?.headers, accountId, apiKey, websocketRequestId);
            const bodyJson = JSON.stringify(body);
            const transport = options?.transport || "auto";
            const websocketDisabledForSession = transport !== "sse" && isWebSocketSseFallbackActive(options?.sessionId);
            if (websocketDisabledForSession) {
                recordWebSocketSseFallback(options?.sessionId);
            }
            if (transport !== "sse" && !websocketDisabledForSession) {
                let websocketStarted = false;
                try {
                    await processWebSocketStream(resolveCodexWebSocketUrl(model.baseUrl), body, websocketHeaders, output, stream, model, () => {
                        websocketStarted = true;
                    }, options);
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
                    if (aborted || isCodexNonTransportError(error)) {
                        throw error;
                    }
                    (0,_utils_diagnostics_js__WEBPACK_IMPORTED_MODULE_5__/* .appendAssistantMessageDiagnostic */ .vF)(output, (0,_utils_diagnostics_js__WEBPACK_IMPORTED_MODULE_5__/* .createAssistantMessageDiagnostic */ .hY)("provider_transport_failure", error, {
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
                }
            }
            // Fetch with retry logic for rate limits and transient errors
            let response;
            let lastError;
            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                if (options?.signal?.aborted) {
                    throw new Error("Request was aborted");
                }
                try {
                    response = await fetch(resolveCodexUrl(model.baseUrl), {
                        method: "POST",
                        headers: sseHeaders,
                        body: bodyJson,
                        signal: options?.signal,
                    });
                    await options?.onResponse?.({ status: response.status, headers: (0,_utils_headers_js__WEBPACK_IMPORTED_MODULE_6__/* .headersToRecord */ .j)(response.headers) }, model);
                    if (response.ok) {
                        break;
                    }
                    const errorText = await response.text();
                    if (attempt < MAX_RETRIES && isRetryableError(response.status, errorText)) {
                        const delayMs = BASE_DELAY_MS * 2 ** attempt;
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
                    if (attempt < MAX_RETRIES && !lastError.message.includes("usage limit")) {
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
            output.errorMessage = error instanceof Error ? error.message : String(error);
            stream.push({ type: "error", reason: output.stopReason, error: output });
            stream.end();
        }
    })();
    return stream;
};
const streamSimpleOpenAICodexResponses = (model, context, options) => {
    const apiKey = options?.apiKey || (0,_env_api_keys_js__WEBPACK_IMPORTED_MODULE_0__/* .getEnvApiKey */ .P)(model.provider);
    if (!apiKey) {
        throw new Error(`No API key for provider: ${model.provider}`);
    }
    const base = (0,_simple_options_js__WEBPACK_IMPORTED_MODULE_7__/* .buildBaseOptions */ .QP)(model, options, apiKey);
    const clampedReasoning = options?.reasoning ? (0,_models_js__WEBPACK_IMPORTED_MODULE_1__/* .clampThinkingLevel */ .Kt)(model, options.reasoning) : undefined;
    const reasoningEffort = clampedReasoning === "off" ? undefined : clampedReasoning;
    return streamOpenAICodexResponses(model, context, {
        ...base,
        reasoningEffort,
    });
};
// ============================================================================
// Request Building
// ============================================================================
function buildRequestBody(model, context, options) {
    const messages = (0,_openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_4__/* .convertResponsesMessages */ .iq)(model, context, CODEX_TOOL_CALL_PROVIDERS, {
        includeSystemPrompt: false,
    });
    const body = {
        model: model.id,
        store: false,
        stream: true,
        instructions: context.systemPrompt || "You are a helpful assistant.",
        input: messages,
        text: { verbosity: options?.textVerbosity || "low" },
        include: ["reasoning.encrypted_content"],
        prompt_cache_key: options?.sessionId,
        tool_choice: "auto",
        parallel_tool_calls: true,
    };
    if (options?.temperature !== undefined) {
        body.temperature = options.temperature;
    }
    if (options?.serviceTier !== undefined) {
        body.service_tier = options.serviceTier;
    }
    if (context.tools && context.tools.length > 0) {
        body.tools = (0,_openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_4__/* .convertResponsesTools */ .hX)(context.tools, { strict: null });
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
    await (0,_openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_4__/* .processResponsesStream */ .KB)(mapCodexEvents(parseSSE(response)), output, stream, model, {
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
async function* mapCodexEvents(events) {
    for await (const event of events) {
        const type = typeof event.type === "string" ? event.type : undefined;
        if (!type)
            continue;
        if (type === "error") {
            const code = event.code || "";
            const message = event.message || "";
            throw new CodexApiError(`Codex error: ${message || code || JSON.stringify(event)}`, {
                code: code || undefined,
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
async function* parseSSE(response) {
    if (!response.body)
        return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
        while (true) {
            const { done, value } = await reader.read();
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
                            throw new CodexProtocolError(`Invalid Codex SSE JSON: ${(0,_utils_diagnostics_js__WEBPACK_IMPORTED_MODULE_5__/* .formatThrownValue */ .Fu)(cause)}`, {
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
(0,_session_resources_js__WEBPACK_IMPORTED_MODULE_2__/* .registerSessionResourceCleanup */ .m)(closeOpenAICodexWebSocketSessions);
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
    stats.lastWebSocketError = (0,_utils_diagnostics_js__WEBPACK_IMPORTED_MODULE_5__/* .formatThrownValue */ .Fu)(error);
    stats.websocketFallbackActive = true;
}
function getWebSocketConstructor() {
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
async function connectWebSocket(url, headers, signal) {
    const WebSocketCtor = getWebSocketConstructor();
    if (!WebSocketCtor) {
        throw new Error("WebSocket transport is not available in this runtime");
    }
    const wsHeaders = (0,_utils_headers_js__WEBPACK_IMPORTED_MODULE_6__/* .headersToRecord */ .j)(headers);
    delete wsHeaders["OpenAI-Beta"];
    return new Promise((resolve, reject) => {
        let settled = false;
        let socket;
        try {
            socket = new WebSocketCtor(url, { headers: wsHeaders });
        }
        catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
            return;
        }
        const onOpen = () => {
            if (settled)
                return;
            settled = true;
            cleanup();
            resolve(socket);
        };
        const onError = (event) => {
            const error = extractWebSocketError(event);
            if (settled)
                return;
            settled = true;
            cleanup();
            reject(error);
        };
        const onClose = (event) => {
            const error = extractWebSocketCloseError(event);
            if (settled)
                return;
            settled = true;
            cleanup();
            reject(error);
        };
        const onAbort = () => {
            if (settled)
                return;
            settled = true;
            cleanup();
            socket.close(1000, "aborted");
            reject(new Error("Request was aborted"));
        };
        const cleanup = () => {
            socket.removeEventListener("open", onOpen);
            socket.removeEventListener("error", onError);
            socket.removeEventListener("close", onClose);
            signal?.removeEventListener("abort", onAbort);
        };
        socket.addEventListener("open", onOpen);
        socket.addEventListener("error", onError);
        socket.addEventListener("close", onClose);
        signal?.addEventListener("abort", onAbort);
    });
}
async function acquireWebSocket(url, headers, sessionId, signal) {
    if (!sessionId) {
        const socket = await connectWebSocket(url, headers, signal);
        return {
            socket,
            reused: false,
            release: ({ keep } = {}) => {
                if (keep === false) {
                    closeWebSocketSilently(socket);
                    return;
                }
                closeWebSocketSilently(socket);
            },
        };
    }
    const cached = websocketSessionCache.get(sessionId);
    if (cached) {
        if (cached.idleTimer) {
            clearTimeout(cached.idleTimer);
            cached.idleTimer = undefined;
        }
        if (!cached.busy && isWebSocketReusable(cached.socket)) {
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
            const socket = await connectWebSocket(url, headers, signal);
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
    const socket = await connectWebSocket(url, headers, signal);
    const entry = { socket, busy: true };
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
async function* parseWebSocket(socket, signal) {
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
                failed = new CodexProtocolError(`Invalid Codex WebSocket JSON: ${(0,_utils_diagnostics_js__WEBPACK_IMPORTED_MODULE_5__/* .formatThrownValue */ .Fu)(cause)}`, {
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
            await new Promise((resolve) => {
                pending = resolve;
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
async function processWebSocketStream(url, body, headers, output, stream, model, onStart, options) {
    const { socket, entry, reused, release } = await acquireWebSocket(url, headers, options?.sessionId, options?.signal);
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
        await (0,_openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_4__/* .processResponsesStream */ .KB)(startWebSocketOutputOnFirstEvent(mapCodexEvents(parseWebSocket(socket, options?.signal)), output, stream, onStart), output, stream, model, {
            serviceTier: options?.serviceTier,
            resolveServiceTier: resolveCodexServiceTier,
            applyServiceTierPricing: (usage, serviceTier) => applyServiceTierPricing(usage, serviceTier, model),
        });
        if (options?.signal?.aborted) {
            keepConnection = false;
        }
        else if (useCachedContext && entry && output.responseId) {
            const responseItems = (0,_openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_4__/* .convertResponsesMessages */ .iq)(model, { messages: [output] }, CODEX_TOOL_CALL_PROVIDERS, {
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
function createCodexRequestId() {
    if (typeof globalThis.crypto?.randomUUID === "function") {
        return globalThis.crypto.randomUUID();
    }
    return `codex_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
function buildBaseCodexHeaders(initHeaders, additionalHeaders, accountId, token) {
    const headers = new Headers(initHeaders);
    for (const [key, value] of Object.entries(additionalHeaders || {})) {
        headers.set(key, value);
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
        headers.set("session_id", sessionId);
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
    headers.set("session_id", requestId);
    return headers;
}
//# sourceMappingURL=openai-codex-responses.js.map

/***/ })

};
