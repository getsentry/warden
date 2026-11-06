export const id = 373;
export const ids = [373];
export const modules = {

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

/***/ 91373:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   stream: () => (/* binding */ stream),
/* harmony export */   streamSimple: () => (/* binding */ streamSimple)
/* harmony export */ });
/* harmony import */ var openai__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3840);
/* harmony import */ var _models_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(25941);
/* harmony import */ var _utils_error_body_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(20372);
/* harmony import */ var _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(45174);
/* harmony import */ var _utils_headers_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(82003);
/* harmony import */ var _utils_pi_user_agent_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(55278);
/* harmony import */ var _utils_provider_env_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(67982);
/* harmony import */ var _utils_provider_retry_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(46863);
/* harmony import */ var _utils_transcript_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(19883);
/* harmony import */ var _constrained_sampling_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(37776);
/* harmony import */ var _github_copilot_headers_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(26103);
/* harmony import */ var _openai_prompt_cache_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(95304);
/* harmony import */ var _openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(33115);
/* harmony import */ var _simple_options_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(18296);














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
        supportsMidConvoSystemMessages: model.compat?.supportsMidConvoSystemMessages ?? false,
        sessionAffinityFormat: model.compat?.sessionAffinityFormat ?? detectSessionAffinityFormat(model),
        supportsLongCacheRetention: model.compat?.supportsLongCacheRetention ?? true,
        supportsStrictMode: model.compat?.supportsStrictMode ?? false,
        supportsOpenAIGrammarTools: model.compat?.supportsOpenAIGrammarTools ?? false,
        supportsAdditionalTools: model.compat?.supportsAdditionalTools ?? false,
        supportsToolSearch: model.compat?.supportsToolSearch ?? false,
        supportsExplicitPromptCacheMode: model.compat?.supportsExplicitPromptCacheMode ?? false,
        supportsMaxOutputTokens: model.compat?.supportsMaxOutputTokens ?? true,
    };
}
function getPromptCacheRetention(compat, cacheRetention) {
    return cacheRetention === "long" && compat.supportsLongCacheRetention && !compat.supportsExplicitPromptCacheMode
        ? "24h"
        : undefined;
}
function getPromptCacheOptions(compat, cacheRetention) {
    if (!compat.supportsExplicitPromptCacheMode)
        return undefined;
    if (cacheRetention === "none")
        return { mode: "explicit" };
    if (cacheRetention === "long" && compat.supportsLongCacheRetention)
        return { ttl: "30m" };
    return undefined;
}
/**
 * Generate function for OpenAI Responses API
 */
const stream = (model, context, options) => {
    const stream = new _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_2__/* .AssistantMessageEventStream */ .Q2();
    const normalizedContext = (0,_utils_transcript_js__WEBPACK_IMPORTED_MODULE_3__/* .resolveTranscript */ .lw)(context, getCompat(model).supportsMidConvoSystemMessages);
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
            stopReason: "pending",
            timestamp: Date.now(),
        };
        try {
            // Create OpenAI client
            const apiKey = getClientApiKey(model.provider, options?.apiKey, options?.headers);
            const cacheRetention = resolveCacheRetention(options?.cacheRetention, options?.env);
            const cacheSessionId = cacheRetention === "none" ? undefined : options?.sessionId;
            const compat = getCompat(model);
            const grammarToolInputProperties = (0,_constrained_sampling_js__WEBPACK_IMPORTED_MODULE_4__/* .createGrammarToolInputProperties */ .PJ)((0,_utils_transcript_js__WEBPACK_IMPORTED_MODULE_3__/* .getDeclaredTools */ .Wg)(normalizedContext.messages), compat.supportsOpenAIGrammarTools);
            const client = createClient(model, normalizedContext, apiKey, options?.headers, options?.fetch, cacheSessionId);
            let params = buildParams(model, normalizedContext, options, compat, grammarToolInputProperties);
            const nextParams = await options?.onPayload?.(params, model);
            if (nextParams !== undefined) {
                params = nextParams;
            }
            const requestOptions = {
                ...(options?.signal ? { signal: options.signal } : {}),
                ...(options?.timeoutMs !== undefined ? { timeout: options.timeoutMs } : {}),
                maxRetries: 0,
            };
            const { data: openaiStream, response } = await (0,_utils_provider_retry_js__WEBPACK_IMPORTED_MODULE_5__/* .retryProviderRequest */ .T)(() => client.responses.create(params, requestOptions).withResponse(), {
                maxRetries: options?.maxRetries,
                maxRetryDelayMs: options?.maxRetryDelayMs,
                signal: options?.signal,
            });
            await options?.onResponse?.({ status: response.status, headers: (0,_utils_headers_js__WEBPACK_IMPORTED_MODULE_6__/* .headersToRecord */ .j)(response.headers) }, model);
            stream.push({ type: "start", partial: output });
            await (0,_openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_7__/* .processResponsesStream */ .KB)(openaiStream, output, stream, model, {
                serviceTier: options?.serviceTier,
                grammarToolInputProperties,
                applyServiceTierPricing: (usage, serviceTier) => applyServiceTierPricing(usage, serviceTier, model),
            });
            if (options?.signal?.aborted) {
                throw new Error("Request was aborted");
            }
            if (output.stopReason === "pending") {
                throw new Error("OpenAI Responses stream ended without a stop reason");
            }
            if (output.stopReason === "aborted" || output.stopReason === "error") {
                throw new Error(output.errorMessage || "An unknown error occurred");
            }
            stream.push({ type: "done", reason: output.stopReason, message: output });
            stream.end();
        }
        catch (error) {
            for (const block of output.content) {
                delete block.index;
                // Streaming scratch buffers are only used during parsing; never persist them.
                delete block.partialJson;
                delete block.customInput;
            }
            output.stopReason = options?.signal?.aborted ? "aborted" : "error";
            output.errorMessage = (0,_utils_error_body_js__WEBPACK_IMPORTED_MODULE_8__/* .formatProviderError */ .lR)((0,_utils_error_body_js__WEBPACK_IMPORTED_MODULE_8__/* .normalizeProviderError */ .Jo)(error), `${model.provider === "openai" ? "OpenAI" : model.provider} API error`);
            stream.push({ type: "error", reason: output.stopReason, error: output });
            stream.end();
        }
    })();
    return stream;
};
const streamSimple = (model, context, options) => {
    getClientApiKey(model.provider, options?.apiKey, options?.headers);
    const base = {
        ...(0,_simple_options_js__WEBPACK_IMPORTED_MODULE_9__/* .buildBaseOptions */ .QP)(model, context, options, options?.apiKey),
        toolChoice: options?.toolChoice,
    };
    const clampedReasoning = options?.reasoning ? (0,_models_js__WEBPACK_IMPORTED_MODULE_10__/* .clampThinkingLevel */ .Kt)(model, options.reasoning) : undefined;
    const reasoningEffort = clampedReasoning === "off" ? undefined : clampedReasoning;
    return stream(model, context, {
        ...base,
        reasoningEffort,
    });
};
function createClient(model, context, apiKey, optionsHeaders, fetch, sessionId) {
    const compat = getCompat(model);
    const headers = { "User-Agent": (0,_utils_pi_user_agent_js__WEBPACK_IMPORTED_MODULE_11__/* .getPiUserAgent */ .w)(), ...model.headers };
    if (model.provider === "github-copilot") {
        const hasImages = (0,_github_copilot_headers_js__WEBPACK_IMPORTED_MODULE_12__/* .hasCopilotVisionInput */ .d1)(context.messages);
        const copilotHeaders = (0,_github_copilot_headers_js__WEBPACK_IMPORTED_MODULE_12__/* .buildCopilotDynamicHeaders */ .G0)({
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
        fetch,
        defaultHeaders: headers,
    });
}
function buildParams(model, context, options, compat = getCompat(model), grammarToolInputProperties = (0,_constrained_sampling_js__WEBPACK_IMPORTED_MODULE_4__/* .createGrammarToolInputProperties */ .PJ)((0,_utils_transcript_js__WEBPACK_IMPORTED_MODULE_3__/* .getDeclaredTools */ .Wg)(context.messages), compat.supportsOpenAIGrammarTools)) {
    const transcriptTools = (0,_utils_transcript_js__WEBPACK_IMPORTED_MODULE_3__/* .resolveTranscriptTools */ .eW)(context.messages, compat.supportsAdditionalTools || compat.supportsToolSearch);
    const messages = (0,_openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_7__/* .convertResponsesMessages */ .iq)(model, context, OPENAI_TOOL_CALL_PROVIDERS, {
        grammarToolInputProperties,
        supportsMidConvoSystemMessages: compat.supportsMidConvoSystemMessages,
        supportsAdditionalTools: compat.supportsAdditionalTools,
        supportsToolSearch: compat.supportsToolSearch,
        toolOptions: {
            supportsStrictMode: compat.supportsStrictMode,
            supportsOpenAIGrammarTools: compat.supportsOpenAIGrammarTools,
        },
    });
    const cacheRetention = resolveCacheRetention(options?.cacheRetention, options?.env);
    const params = {
        model: model.id,
        input: messages,
        stream: true,
        prompt_cache_key: cacheRetention === "none" ? undefined : (0,_openai_prompt_cache_js__WEBPACK_IMPORTED_MODULE_13__/* .clampOpenAIPromptCacheKey */ .l)(options?.sessionId),
        prompt_cache_retention: getPromptCacheRetention(compat, cacheRetention),
        prompt_cache_options: getPromptCacheOptions(compat, cacheRetention),
        store: false,
    };
    if (options?.maxTokens && compat.supportsMaxOutputTokens) {
        params.max_output_tokens = Math.max(options.maxTokens, OPENAI_RESPONSES_MIN_OUTPUT_TOKENS);
    }
    if (options?.temperature !== undefined) {
        params.temperature = options?.temperature;
    }
    if (options?.serviceTier !== undefined) {
        params.service_tier = options.serviceTier;
    }
    if (transcriptTools.requestTools.length > 0) {
        params.tools = (0,_openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_7__/* .convertResponsesTools */ .hX)(transcriptTools.requestTools, {
            supportsStrictMode: compat.supportsStrictMode,
            supportsOpenAIGrammarTools: compat.supportsOpenAIGrammarTools,
        });
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
    // Last so custom keys override the named request fields.
    if (options?.samplingParams) {
        Object.assign(params, options.samplingParams);
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

/***/ })

};
