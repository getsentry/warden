export const id = 762;
export const ids = [762];
export const modules = {

/***/ 70340:
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

/***/ 63381:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   stream: () => (/* binding */ stream),
/* harmony export */   streamSimple: () => (/* binding */ streamSimple)
/* harmony export */ });
/* harmony import */ var openai__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(56722);
/* harmony import */ var _models_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(73470);
/* harmony import */ var _utils_deferred_tools_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(3123);
/* harmony import */ var _utils_error_body_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(22191);
/* harmony import */ var _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(14257);
/* harmony import */ var _utils_headers_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(41146);
/* harmony import */ var _utils_provider_env_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(94313);
/* harmony import */ var _github_copilot_headers_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(70340);
/* harmony import */ var _openai_prompt_cache_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(92297);
/* harmony import */ var _openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(39746);
/* harmony import */ var _simple_options_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(16417);











const OPENAI_TOOL_CALL_PROVIDERS = new Set(["openai", "openai-codex", "opencode"]);
// OpenAI Responses rejects max_output_tokens below 16: https://github.com/earendil-works/pi/issues/6265
const OPENAI_RESPONSES_MIN_OUTPUT_TOKENS = 16;
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
function getClientApiKey(provider, apiKey, headers) {
    if (apiKey)
        return apiKey;
    if (hasHeader(headers, "authorization") || hasHeader(headers, "cf-aig-authorization"))
        return "unused";
    throw new Error(`No API key for provider: ${provider}`);
}
function detectSessionAffinityFormat(model) {
    return model.provider === "openrouter" || model.baseUrl.includes("openrouter.ai") ? "openrouter" : "openai";
}
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
function getCompat(model) {
    return {
        supportsDeveloperRole: model.compat?.supportsDeveloperRole ?? true,
        sessionAffinityFormat: model.compat?.sessionAffinityFormat ?? detectSessionAffinityFormat(model),
        supportsLongCacheRetention: model.compat?.supportsLongCacheRetention ?? true,
        supportsToolSearch: model.compat?.supportsToolSearch ?? false,
    };
}
function getPromptCacheRetention(compat, cacheRetention) {
    return cacheRetention === "long" && compat.supportsLongCacheRetention ? "24h" : undefined;
}
function formatOpenAIResponsesError(error) {
    return (0,_utils_error_body_js__WEBPACK_IMPORTED_MODULE_2__/* .formatProviderError */ .lR)((0,_utils_error_body_js__WEBPACK_IMPORTED_MODULE_2__/* .normalizeProviderError */ .Jo)(error), "OpenAI API error");
}
/**
 * Generate function for OpenAI Responses API
 */
const stream = (model, context, options) => {
    const stream = new _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_3__/* .AssistantMessageEventStream */ .Q2();
    // Start async processing
    (async () => {
        const output = {
            role: "assistant",
            content: [],
            api: model.api,
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
            // Create OpenAI client
            const apiKey = getClientApiKey(model.provider, options?.apiKey, options?.headers);
            const cacheRetention = resolveCacheRetention(options?.cacheRetention, options?.env);
            const cacheSessionId = cacheRetention === "none" ? undefined : options?.sessionId;
            const client = createClient(model, context, apiKey, options?.headers, cacheSessionId);
            let params = buildParams(model, context, options);
            const nextParams = await options?.onPayload?.(params, model);
            if (nextParams !== undefined) {
                params = nextParams;
            }
            const requestOptions = {
                ...(options?.signal ? { signal: options.signal } : {}),
                ...(options?.timeoutMs !== undefined ? { timeout: options.timeoutMs } : {}),
                maxRetries: options?.maxRetries ?? 0,
            };
            const { data: openaiStream, response } = await client.responses.create(params, requestOptions).withResponse();
            await options?.onResponse?.({ status: response.status, headers: (0,_utils_headers_js__WEBPACK_IMPORTED_MODULE_4__/* .headersToRecord */ .j)(response.headers) }, model);
            stream.push({ type: "start", partial: output });
            await (0,_openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_5__/* .processResponsesStream */ .KB)(openaiStream, output, stream, model, {
                serviceTier: options?.serviceTier,
                applyServiceTierPricing: (usage, serviceTier) => applyServiceTierPricing(usage, serviceTier, model),
            });
            if (options?.signal?.aborted) {
                throw new Error("Request was aborted");
            }
            if (output.stopReason === "aborted" || output.stopReason === "error") {
                throw new Error("An unknown error occurred");
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
            output.errorMessage = formatOpenAIResponsesError(error);
            stream.push({ type: "error", reason: output.stopReason, error: output });
            stream.end();
        }
    })();
    return stream;
};
const streamSimple = (model, context, options) => {
    getClientApiKey(model.provider, options?.apiKey, options?.headers);
    const base = (0,_simple_options_js__WEBPACK_IMPORTED_MODULE_6__/* .buildBaseOptions */ .QP)(model, context, options, options?.apiKey);
    const clampedReasoning = options?.reasoning ? (0,_models_js__WEBPACK_IMPORTED_MODULE_7__/* .clampThinkingLevel */ .Kt)(model, options.reasoning) : undefined;
    const reasoningEffort = clampedReasoning === "off" ? undefined : clampedReasoning;
    return stream(model, context, {
        ...base,
        reasoningEffort,
    });
};
function createClient(model, context, apiKey, optionsHeaders, sessionId) {
    const compat = getCompat(model);
    const headers = { ...model.headers };
    if (model.provider === "github-copilot") {
        const hasImages = (0,_github_copilot_headers_js__WEBPACK_IMPORTED_MODULE_8__/* .hasCopilotVisionInput */ .d1)(context.messages);
        const copilotHeaders = (0,_github_copilot_headers_js__WEBPACK_IMPORTED_MODULE_8__/* .buildCopilotDynamicHeaders */ .G0)({
            messages: context.messages,
            hasImages,
        });
        Object.assign(headers, copilotHeaders);
    }
    if (sessionId) {
        if (compat.sessionAffinityFormat === "openrouter") {
            headers["x-session-id"] = sessionId;
        }
        else {
            if (compat.sessionAffinityFormat === "openai") {
                headers.session_id = sessionId;
            }
            headers["x-client-request-id"] = sessionId;
        }
    }
    // Merge options headers last so they can override defaults
    if (optionsHeaders) {
        Object.assign(headers, optionsHeaders);
    }
    return new openai__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay({
        apiKey,
        baseURL: model.baseUrl,
        dangerouslyAllowBrowser: true,
        defaultHeaders: headers,
    });
}
function buildParams(model, context, options) {
    const compat = getCompat(model);
    const toolPlacement = (0,_utils_deferred_tools_js__WEBPACK_IMPORTED_MODULE_9__/* .splitDeferredTools */ .F)(context, compat.supportsToolSearch);
    const messages = (0,_openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_5__/* .convertResponsesMessages */ .iq)(model, context, OPENAI_TOOL_CALL_PROVIDERS, {
        deferredTools: toolPlacement.deferred,
    });
    const cacheRetention = resolveCacheRetention(options?.cacheRetention, options?.env);
    const params = {
        model: model.id,
        input: messages,
        stream: true,
        prompt_cache_key: cacheRetention === "none" ? undefined : (0,_openai_prompt_cache_js__WEBPACK_IMPORTED_MODULE_10__/* .clampOpenAIPromptCacheKey */ .l)(options?.sessionId),
        prompt_cache_retention: getPromptCacheRetention(compat, cacheRetention),
        store: false,
    };
    if (options?.maxTokens) {
        params.max_output_tokens = Math.max(options.maxTokens, OPENAI_RESPONSES_MIN_OUTPUT_TOKENS);
    }
    if (options?.temperature !== undefined) {
        params.temperature = options?.temperature;
    }
    if (options?.serviceTier !== undefined) {
        params.service_tier = options.serviceTier;
    }
    if (toolPlacement.immediate.length > 0) {
        params.tools = (0,_openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_5__/* .convertResponsesTools */ .hX)(toolPlacement.immediate);
    }
    if (options?.toolChoice !== undefined) {
        params.tool_choice = options.toolChoice;
    }
    if (model.reasoning) {
        if (options?.reasoningEffort || options?.reasoningSummary) {
            const effort = options?.reasoningEffort
                ? (model.thinkingLevelMap?.[options.reasoningEffort] ?? options.reasoningEffort)
                : "medium";
            params.reasoning = {
                effort: effort,
                summary: options?.reasoningSummary || "auto",
            };
            params.include = ["reasoning.encrypted_content"];
        }
        else if (model.provider !== "github-copilot" && model.thinkingLevelMap?.off !== null) {
            params.reasoning = {
                effort: (model.thinkingLevelMap?.off ?? "none"),
            };
        }
        if (model.provider === "xai")
            params.include = ["reasoning.encrypted_content"];
    }
    return params;
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
//# sourceMappingURL=openai-responses.js.map

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

/***/ })

};
