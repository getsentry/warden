export const id = 743;
export const ids = [743];
export const modules = {

/***/ 68743:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PiMessagesResponseError: () => (/* binding */ PiMessagesResponseError),
/* harmony export */   stream: () => (/* binding */ stream),
/* harmony export */   streamSimple: () => (/* binding */ streamSimple)
/* harmony export */ });
/* harmony import */ var _utils_diagnostics_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(10364);
/* harmony import */ var _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(14257);
/* harmony import */ var _utils_headers_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(41146);
/* harmony import */ var _utils_json_parse_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(91814);
/* harmony import */ var _utils_provider_env_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(94313);
/**
 * pi-messages API implementation.
 *
 * Streams pi's own message protocol directly to a backend: the request is a
 * single POST of `{ model, context, options }` to `<baseUrl>/messages`, the
 * response is an SSE stream of serialized assistant-message events plus a
 * terminal `done`/`error` event. This is the wire protocol spoken by the
 * Radius gateway, but any backend implementing it can be used, e.g. via a
 * models.json custom provider with `"api": "pi-messages"`.
 */





class PiMessagesResponseError extends Error {
    code;
    diagnosticDetails;
    constructor(message, code, diagnosticDetails) {
        super(message);
        this.name = "PiMessagesResponseError";
        this.code = code;
        this.diagnosticDetails = diagnosticDetails;
    }
}
function parsePiMessagesErrorBody(body) {
    try {
        const parsed = JSON.parse(body);
        const error = parsed?.error;
        return parsed && typeof error === "object" && error !== null && !Array.isArray(error) ? parsed : undefined;
    }
    catch {
        return undefined;
    }
}
function truncateDiagnosticString(value) {
    const maxLength = 8192;
    return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}
function formatPiMessagesResponseError(response, body, errorBody) {
    const message = typeof errorBody?.error?.message === "string" ? errorBody.error.message : undefined;
    const code = typeof errorBody?.error?.code === "string" ? errorBody.error.code : undefined;
    const suffix = message ?? body;
    const codeSuffix = code ? ` (${code})` : "";
    return `${response.status} ${response.statusText}: ${suffix}${codeSuffix}`;
}
function createPiMessagesResponseError(model, url, response, body) {
    const errorBody = parsePiMessagesErrorBody(body);
    const code = typeof errorBody?.error?.code === "string" ? errorBody.error.code : undefined;
    return new PiMessagesResponseError(formatPiMessagesResponseError(response, body, errorBody), code, {
        version: 1,
        provider: model.provider,
        model: model.id,
        url: url.toString(),
        status: response.status,
        statusText: response.statusText,
        error: errorBody?.error,
        body: errorBody ? undefined : truncateDiagnosticString(body),
        timestampMs: Date.now(),
    });
}
function createEmptyUsage() {
    return {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    };
}
function appendRewriteDiagnostic(message, rewrite) {
    if (!rewrite) {
        return;
    }
    (0,_utils_diagnostics_js__WEBPACK_IMPORTED_MODULE_0__/* .appendAssistantMessageDiagnostic */ .vF)(message, {
        type: "pi_messages_rewrite",
        timestamp: Date.now(),
        details: { ...rewrite },
    });
}
function createEventConverter(model) {
    const partial = {
        role: "assistant",
        content: [],
        api: model.api,
        provider: model.provider,
        model: model.id,
        usage: createEmptyUsage(),
        stopReason: "stop",
        timestamp: Date.now(),
    };
    const toolJson = new Map();
    return (event) => {
        switch (event.type) {
            case "done":
                Object.assign(partial, {
                    stopReason: event.reason,
                    usage: event.usage,
                    responseId: event.responseId,
                });
                appendRewriteDiagnostic(partial, event.rewrite);
                return { type: "done", reason: event.reason, message: partial };
            case "error":
                Object.assign(partial, {
                    stopReason: event.reason,
                    usage: event.usage,
                    errorMessage: event.errorMessage,
                    responseId: event.responseId,
                });
                appendRewriteDiagnostic(partial, event.rewrite);
                return { type: "error", reason: event.reason, error: partial };
            case "start":
                break;
            case "text_start":
                partial.content[event.contentIndex] = { type: "text", text: "" };
                break;
            case "text_delta":
                partial.content[event.contentIndex].text += event.delta;
                break;
            case "text_end":
                Object.assign(partial.content[event.contentIndex], {
                    text: event.content,
                    textSignature: event.contentSignature,
                });
                break;
            case "thinking_start":
                partial.content[event.contentIndex] = { type: "thinking", thinking: "" };
                break;
            case "thinking_delta":
                partial.content[event.contentIndex].thinking += event.delta;
                break;
            case "thinking_end":
                Object.assign(partial.content[event.contentIndex], {
                    thinking: event.content,
                    thinkingSignature: event.contentSignature,
                    redacted: event.redacted,
                });
                break;
            case "toolcall_start":
                partial.content[event.contentIndex] = {
                    type: "toolCall",
                    id: event.id,
                    name: event.toolName,
                    arguments: {},
                };
                toolJson.set(event.contentIndex, "");
                break;
            case "toolcall_delta": {
                const json = `${toolJson.get(event.contentIndex) ?? ""}${event.delta}`;
                toolJson.set(event.contentIndex, json);
                partial.content[event.contentIndex].arguments =
                    (0,_utils_json_parse_js__WEBPACK_IMPORTED_MODULE_1__/* .parseStreamingJson */ .o2)(json);
                break;
            }
            case "toolcall_end":
                Object.assign(partial.content[event.contentIndex], event.toolCall);
                toolJson.delete(event.contentIndex);
                return {
                    type: "toolcall_end",
                    contentIndex: event.contentIndex,
                    toolCall: partial.content[event.contentIndex],
                    partial,
                };
        }
        return { ...event, partial };
    };
}
async function* readPiMessagesEvents(stream) {
    const decoder = new TextDecoder();
    const reader = stream.getReader();
    let buffer = "";
    try {
        while (true) {
            const { done, value } = await reader.read();
            buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
            buffer = buffer.replace(/\r\n/g, "\n");
            let split = buffer.indexOf("\n\n");
            while (split !== -1) {
                const event = parsePiMessagesEvent(buffer.slice(0, split));
                if (event) {
                    yield event;
                }
                buffer = buffer.slice(split + 2);
                split = buffer.indexOf("\n\n");
            }
            if (done) {
                break;
            }
        }
        if (buffer.trim()) {
            const event = parsePiMessagesEvent(buffer);
            if (event) {
                yield event;
            }
        }
    }
    finally {
        reader.releaseLock();
    }
}
function parsePiMessagesEvent(raw) {
    const data = raw
        .split("\n")
        .find((line) => line.startsWith("data:"))
        ?.slice(5)
        .trim();
    return data && data !== "[DONE]" ? JSON.parse(data) : undefined;
}
function createErrorEvent(model, error, aborted) {
    const reason = aborted ? "aborted" : "error";
    const assistantMessage = {
        role: "assistant",
        content: [],
        api: model.api,
        provider: model.provider,
        model: model.id,
        usage: createEmptyUsage(),
        stopReason: reason,
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
    };
    if (!aborted && error instanceof PiMessagesResponseError) {
        (0,_utils_diagnostics_js__WEBPACK_IMPORTED_MODULE_0__/* .appendAssistantMessageDiagnostic */ .vF)(assistantMessage, (0,_utils_diagnostics_js__WEBPACK_IMPORTED_MODULE_0__/* .createAssistantMessageDiagnostic */ .hY)("pi_messages_response_failure", error, error.diagnosticDetails));
    }
    return { type: "error", reason, error: assistantMessage };
}
function resolveCacheRetention(cacheRetention, env) {
    if (cacheRetention) {
        return cacheRetention;
    }
    // Backend defaults apply when unset; only the legacy env opt-in is mapped.
    return (0,_utils_provider_env_js__WEBPACK_IMPORTED_MODULE_2__/* .getProviderEnvValue */ .Y)("PI_CACHE_RETENTION", env) === "long" ? "long" : undefined;
}
const stream = (model, context, options) => {
    const eventStream = new _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_3__/* .AssistantMessageEventStream */ .Q2();
    const convertEvent = createEventConverter(model);
    void (async () => {
        try {
            const apiKey = options?.apiKey;
            if (!apiKey) {
                throw new Error(`No API key provided for provider "${model.provider}"`);
            }
            const url = new URL(`${model.baseUrl.replace(/\/+$/u, "")}/messages`);
            if (options?.debug) {
                url.searchParams.set("debug", "1");
            }
            let payload = {
                model: model.id,
                context,
                options: {
                    temperature: options?.temperature,
                    maxTokens: options?.maxTokens,
                    reasoning: options?.reasoning,
                    cacheRetention: resolveCacheRetention(options?.cacheRetention, options?.env),
                    sessionId: options?.sessionId,
                    toolChoice: options?.toolChoice,
                },
            };
            const nextPayload = await options?.onPayload?.(payload, model);
            if (nextPayload !== undefined) {
                payload = nextPayload;
            }
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    authorization: `Bearer ${apiKey}`,
                    accept: "text/event-stream",
                    "content-type": "application/json",
                    ...(0,_utils_headers_js__WEBPACK_IMPORTED_MODULE_4__/* .providerHeadersToRecord */ .m)(options?.headers),
                },
                body: JSON.stringify(payload),
                signal: options?.signal,
            });
            await options?.onResponse?.({ status: response.status, headers: (0,_utils_headers_js__WEBPACK_IMPORTED_MODULE_4__/* .headersToRecord */ .j)(response.headers) }, model);
            if (!response.ok) {
                const body = await response.text();
                throw createPiMessagesResponseError(model, url, response, body);
            }
            if (!response.body) {
                throw new Error(`${model.provider} response has no body`);
            }
            for await (const piEvent of readPiMessagesEvents(response.body)) {
                const event = convertEvent(piEvent);
                eventStream.push(event);
                if (event.type === "done" || event.type === "error") {
                    return;
                }
            }
            throw new Error(`${model.provider} stream ended without a terminal event`);
        }
        catch (error) {
            eventStream.push(createErrorEvent(model, error, options?.signal?.aborted ?? false));
        }
    })();
    return eventStream;
};
const streamSimple = (model, context, options) => {
    const extra = options;
    return stream(model, context, {
        ...options,
        reasoning: options?.reasoning,
        toolChoice: extra?.toolChoice,
        debug: extra?.debug,
    });
};
//# sourceMappingURL=pi-messages.js.map

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

/***/ })

};
