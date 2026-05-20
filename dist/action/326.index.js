export const id = 326;
export const ids = [326];
export const modules = {

/***/ 45070:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   S7: () => (/* binding */ resolveCloudflareBaseUrl),
/* harmony export */   vk: () => (/* binding */ isCloudflareProvider)
/* harmony export */ });
/* unused harmony exports CLOUDFLARE_WORKERS_AI_BASE_URL, CLOUDFLARE_AI_GATEWAY_COMPAT_BASE_URL, CLOUDFLARE_AI_GATEWAY_OPENAI_BASE_URL, CLOUDFLARE_AI_GATEWAY_ANTHROPIC_BASE_URL */
/** Workers AI direct endpoint. */
const CLOUDFLARE_WORKERS_AI_BASE_URL = "https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/v1";
/** AI Gateway Unified API. https://developers.cloudflare.com/ai-gateway/usage/unified-api/ */
const CLOUDFLARE_AI_GATEWAY_COMPAT_BASE_URL = "https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/{CLOUDFLARE_GATEWAY_ID}/compat";
/** AI Gateway → OpenAI passthrough. Used until /compat supports /v1/responses. */
const CLOUDFLARE_AI_GATEWAY_OPENAI_BASE_URL = "https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/{CLOUDFLARE_GATEWAY_ID}/openai";
/** AI Gateway → Anthropic passthrough. */
const CLOUDFLARE_AI_GATEWAY_ANTHROPIC_BASE_URL = "https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/{CLOUDFLARE_GATEWAY_ID}/anthropic";
function isCloudflareProvider(provider) {
    return provider === "cloudflare-workers-ai" || provider === "cloudflare-ai-gateway";
}
/** Substitute `{VAR}` placeholders in a Cloudflare baseUrl from process.env. */
function resolveCloudflareBaseUrl(model) {
    const url = model.baseUrl;
    if (!url.includes("{"))
        return url;
    const baseUrl = url.replace(/\{([A-Z_][A-Z0-9_]*)\}/g, (_match, name) => {
        const value = process.env[name];
        if (!value) {
            throw new Error(`${name} is required for provider ${model.provider} but is not set.`);
        }
        return value;
    });
    return baseUrl;
}
//# sourceMappingURL=cloudflare.js.map

/***/ }),

/***/ 54208:
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

/***/ 7326:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   streamOpenAIResponses: () => (/* binding */ streamOpenAIResponses),
/* harmony export */   streamSimpleOpenAIResponses: () => (/* binding */ streamSimpleOpenAIResponses)
/* harmony export */ });
/* harmony import */ var openai__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(63883);
/* harmony import */ var _env_api_keys_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(64827);
/* harmony import */ var _models_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(47377);
/* harmony import */ var _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(86327);
/* harmony import */ var _utils_headers_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(56412);
/* harmony import */ var _cloudflare_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(45070);
/* harmony import */ var _github_copilot_headers_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(54208);
/* harmony import */ var _openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(99246);
/* harmony import */ var _simple_options_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(97672);









const OPENAI_TOOL_CALL_PROVIDERS = new Set(["openai", "openai-codex", "opencode"]);
/**
 * Resolve cache retention preference.
 * Defaults to "short" and uses PI_CACHE_RETENTION for backward compatibility.
 */
function resolveCacheRetention(cacheRetention) {
    if (cacheRetention) {
        return cacheRetention;
    }
    if (typeof process !== "undefined" && process.env.PI_CACHE_RETENTION === "long") {
        return "long";
    }
    return "short";
}
function getCompat(model) {
    return {
        sendSessionIdHeader: model.compat?.sendSessionIdHeader ?? true,
        supportsLongCacheRetention: model.compat?.supportsLongCacheRetention ?? true,
    };
}
function getPromptCacheRetention(compat, cacheRetention) {
    return cacheRetention === "long" && compat.supportsLongCacheRetention ? "24h" : undefined;
}
/**
 * Generate function for OpenAI Responses API
 */
const streamOpenAIResponses = (model, context, options) => {
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
            const apiKey = options?.apiKey || (0,_env_api_keys_js__WEBPACK_IMPORTED_MODULE_1__/* .getEnvApiKey */ .P)(model.provider) || "";
            const cacheRetention = resolveCacheRetention(options?.cacheRetention);
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
                ...(options?.maxRetries !== undefined ? { maxRetries: options.maxRetries } : {}),
            };
            const { data: openaiStream, response } = await client.responses.create(params, requestOptions).withResponse();
            await options?.onResponse?.({ status: response.status, headers: (0,_utils_headers_js__WEBPACK_IMPORTED_MODULE_5__/* .headersToRecord */ .j)(response.headers) }, model);
            stream.push({ type: "start", partial: output });
            await (0,_openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_4__/* .processResponsesStream */ .KB)(openaiStream, output, stream, model, {
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
            output.errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
            stream.push({ type: "error", reason: output.stopReason, error: output });
            stream.end();
        }
    })();
    return stream;
};
const streamSimpleOpenAIResponses = (model, context, options) => {
    const apiKey = options?.apiKey || (0,_env_api_keys_js__WEBPACK_IMPORTED_MODULE_1__/* .getEnvApiKey */ .P)(model.provider);
    if (!apiKey) {
        throw new Error(`No API key for provider: ${model.provider}`);
    }
    const base = (0,_simple_options_js__WEBPACK_IMPORTED_MODULE_6__/* .buildBaseOptions */ .QP)(model, options, apiKey);
    const clampedReasoning = options?.reasoning ? (0,_models_js__WEBPACK_IMPORTED_MODULE_2__/* .clampThinkingLevel */ .Kt)(model, options.reasoning) : undefined;
    const reasoningEffort = clampedReasoning === "off" ? undefined : clampedReasoning;
    return streamOpenAIResponses(model, context, {
        ...base,
        reasoningEffort,
    });
};
function createClient(model, context, apiKey, optionsHeaders, sessionId) {
    if (!apiKey) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OpenAI API key is required. Set OPENAI_API_KEY environment variable or pass it as an argument.");
        }
        apiKey = process.env.OPENAI_API_KEY;
    }
    const compat = getCompat(model);
    const headers = { ...model.headers };
    if (model.provider === "github-copilot") {
        const hasImages = (0,_github_copilot_headers_js__WEBPACK_IMPORTED_MODULE_7__/* .hasCopilotVisionInput */ .d1)(context.messages);
        const copilotHeaders = (0,_github_copilot_headers_js__WEBPACK_IMPORTED_MODULE_7__/* .buildCopilotDynamicHeaders */ .G0)({
            messages: context.messages,
            hasImages,
        });
        Object.assign(headers, copilotHeaders);
    }
    if (sessionId) {
        if (compat.sendSessionIdHeader) {
            headers.session_id = sessionId;
        }
        headers["x-client-request-id"] = sessionId;
    }
    // Merge options headers last so they can override defaults
    if (optionsHeaders) {
        Object.assign(headers, optionsHeaders);
    }
    const defaultHeaders = model.provider === "cloudflare-ai-gateway"
        ? {
            ...headers,
            Authorization: headers.Authorization ?? null,
            "cf-aig-authorization": `Bearer ${apiKey}`,
        }
        : headers;
    return new openai__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay({
        apiKey,
        baseURL: (0,_cloudflare_js__WEBPACK_IMPORTED_MODULE_8__/* .isCloudflareProvider */ .vk)(model.provider) ? (0,_cloudflare_js__WEBPACK_IMPORTED_MODULE_8__/* .resolveCloudflareBaseUrl */ .S7)(model) : model.baseUrl,
        dangerouslyAllowBrowser: true,
        defaultHeaders,
    });
}
function buildParams(model, context, options) {
    const messages = (0,_openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_4__/* .convertResponsesMessages */ .iq)(model, context, OPENAI_TOOL_CALL_PROVIDERS);
    const cacheRetention = resolveCacheRetention(options?.cacheRetention);
    const compat = getCompat(model);
    const params = {
        model: model.id,
        input: messages,
        stream: true,
        prompt_cache_key: cacheRetention === "none" ? undefined : options?.sessionId,
        prompt_cache_retention: getPromptCacheRetention(compat, cacheRetention),
        store: false,
    };
    if (options?.maxTokens) {
        params.max_output_tokens = options?.maxTokens;
    }
    if (options?.temperature !== undefined) {
        params.temperature = options?.temperature;
    }
    if (options?.serviceTier !== undefined) {
        params.service_tier = options.serviceTier;
    }
    if (context.tools && context.tools.length > 0) {
        params.tools = (0,_openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_4__/* .convertResponsesTools */ .hX)(context.tools);
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
