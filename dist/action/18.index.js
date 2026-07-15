export const id = 18;
export const ids = [18];
export const modules = {

/***/ 17018:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   stream: () => (/* binding */ stream),
/* harmony export */   streamSimple: () => (/* binding */ streamSimple)
/* harmony export */ });
/* harmony import */ var openai__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(56722);
/* harmony import */ var _models_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(26168);
/* harmony import */ var _utils_error_body_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(35225);
/* harmony import */ var _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(65979);
/* harmony import */ var _utils_headers_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(35000);
/* harmony import */ var _utils_provider_env_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(15827);
/* harmony import */ var _openai_prompt_cache_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(71851);
/* harmony import */ var _openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(32660);
/* harmony import */ var _simple_options_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(31751);









const DEFAULT_AZURE_API_VERSION = "v1";
const AZURE_TOOL_CALL_PROVIDERS = new Set(["openai", "openai-codex", "opencode", "azure-openai-responses"]);
// OpenAI Responses rejects max_output_tokens below 16: https://github.com/earendil-works/pi/issues/6265
const OPENAI_RESPONSES_MIN_OUTPUT_TOKENS = 16;
function parseDeploymentNameMap(value) {
    const map = new Map();
    if (!value)
        return map;
    for (const entry of value.split(",")) {
        const trimmed = entry.trim();
        if (!trimmed)
            continue;
        const [modelId, deploymentName] = trimmed.split("=", 2);
        if (!modelId || !deploymentName)
            continue;
        map.set(modelId.trim(), deploymentName.trim());
    }
    return map;
}
function resolveDeploymentName(model, options) {
    if (options?.azureDeploymentName) {
        return options.azureDeploymentName;
    }
    const mappedDeployment = parseDeploymentNameMap((0,_utils_provider_env_js__WEBPACK_IMPORTED_MODULE_1__/* .getProviderEnvValue */ .Y)("AZURE_OPENAI_DEPLOYMENT_NAME_MAP", options?.env)).get(model.id);
    return mappedDeployment || model.id;
}
function formatAzureOpenAIError(error) {
    return (0,_utils_error_body_js__WEBPACK_IMPORTED_MODULE_2__/* .formatProviderError */ .lR)((0,_utils_error_body_js__WEBPACK_IMPORTED_MODULE_2__/* .normalizeProviderError */ .Jo)(error), "Azure OpenAI API error");
}
/**
 * Generate function for Azure OpenAI Responses API
 */
const stream = (model, context, options) => {
    const stream = new _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_3__/* .AssistantMessageEventStream */ .Q2();
    // Start async processing
    (async () => {
        const deploymentName = resolveDeploymentName(model, options);
        const output = {
            role: "assistant",
            content: [],
            api: "azure-openai-responses",
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
            // Create Azure OpenAI client
            const apiKey = options?.apiKey;
            if (!apiKey) {
                throw new Error(`No API key for provider: ${model.provider}`);
            }
            const client = createClient(model, apiKey, options);
            let params = buildParams(model, context, options, deploymentName);
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
            await (0,_openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_5__/* .processResponsesStream */ .KB)(openaiStream, output, stream, model);
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
            output.errorMessage = formatAzureOpenAIError(error);
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
    const base = (0,_simple_options_js__WEBPACK_IMPORTED_MODULE_6__/* .buildBaseOptions */ .QP)(model, context, options, apiKey);
    const clampedReasoning = options?.reasoning ? (0,_models_js__WEBPACK_IMPORTED_MODULE_7__/* .clampThinkingLevel */ .Kt)(model, options.reasoning) : undefined;
    const reasoningEffort = clampedReasoning === "off" ? undefined : clampedReasoning;
    return stream(model, context, {
        ...base,
        reasoningEffort,
    });
};
function normalizeAzureBaseUrl(baseUrl) {
    const trimmed = baseUrl.trim().replace(/\/+$/, "");
    let url;
    try {
        url = new URL(trimmed);
    }
    catch {
        throw new Error(`Invalid Azure OpenAI base URL: ${baseUrl}`);
    }
    const isAzureHost = url.hostname.endsWith(".openai.azure.com") ||
        url.hostname.endsWith(".cognitiveservices.azure.com") ||
        url.hostname.endsWith(".ai.azure.com");
    const normalizedPath = url.pathname.replace(/\/+$/, "");
    // Ensure Azure hosts have /openai/v1 as base path so the AzureOpenAI SDK
    // can append /deployments/<model>/... and ?api-version=v1 correctly.
    if (isAzureHost &&
        (normalizedPath === "" ||
            normalizedPath === "/" ||
            normalizedPath === "/openai" ||
            normalizedPath === "/openai/v1/responses")) {
        url.pathname = "/openai/v1";
        url.search = "";
    }
    return url.toString().replace(/\/+$/, "");
}
function buildDefaultBaseUrl(resourceName) {
    return `https://${resourceName}.openai.azure.com/openai/v1`;
}
function resolveAzureConfig(model, options) {
    const apiVersion = options?.azureApiVersion ||
        (0,_utils_provider_env_js__WEBPACK_IMPORTED_MODULE_1__/* .getProviderEnvValue */ .Y)("AZURE_OPENAI_API_VERSION", options?.env) ||
        DEFAULT_AZURE_API_VERSION;
    const baseUrl = options?.azureBaseUrl?.trim() || (0,_utils_provider_env_js__WEBPACK_IMPORTED_MODULE_1__/* .getProviderEnvValue */ .Y)("AZURE_OPENAI_BASE_URL", options?.env)?.trim() || undefined;
    const resourceName = options?.azureResourceName || (0,_utils_provider_env_js__WEBPACK_IMPORTED_MODULE_1__/* .getProviderEnvValue */ .Y)("AZURE_OPENAI_RESOURCE_NAME", options?.env);
    let resolvedBaseUrl = baseUrl;
    if (!resolvedBaseUrl && resourceName) {
        resolvedBaseUrl = buildDefaultBaseUrl(resourceName);
    }
    if (!resolvedBaseUrl && model.baseUrl) {
        resolvedBaseUrl = model.baseUrl;
    }
    if (!resolvedBaseUrl) {
        throw new Error("Azure OpenAI base URL is required. Set AZURE_OPENAI_BASE_URL or AZURE_OPENAI_RESOURCE_NAME, or pass azureBaseUrl, azureResourceName, or model.baseUrl.");
    }
    return {
        baseUrl: normalizeAzureBaseUrl(resolvedBaseUrl),
        apiVersion,
    };
}
function createClient(model, apiKey, options) {
    const headers = { ...model.headers };
    if (options?.headers) {
        Object.assign(headers, options.headers);
    }
    const { baseUrl, apiVersion } = resolveAzureConfig(model, options);
    return new openai__WEBPACK_IMPORTED_MODULE_0__/* .AzureOpenAI */ .AC({
        apiKey,
        apiVersion,
        dangerouslyAllowBrowser: true,
        defaultHeaders: headers,
        baseURL: baseUrl,
    });
}
function buildParams(model, context, options, deploymentName) {
    const messages = (0,_openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_5__/* .convertResponsesMessages */ .iq)(model, context, AZURE_TOOL_CALL_PROVIDERS);
    const params = {
        model: deploymentName,
        input: messages,
        stream: true,
        prompt_cache_key: (0,_openai_prompt_cache_js__WEBPACK_IMPORTED_MODULE_8__/* .clampOpenAIPromptCacheKey */ .l)(options?.sessionId),
        store: false,
    };
    if (options?.maxTokens) {
        params.max_output_tokens = Math.max(options.maxTokens, OPENAI_RESPONSES_MIN_OUTPUT_TOKENS);
    }
    if (options?.temperature !== undefined) {
        params.temperature = options?.temperature;
    }
    if (context.tools && context.tools.length > 0) {
        params.tools = (0,_openai_responses_shared_js__WEBPACK_IMPORTED_MODULE_5__/* .convertResponsesTools */ .hX)(context.tools);
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
        else if (model.thinkingLevelMap?.off !== null) {
            params.reasoning = {
                effort: (model.thinkingLevelMap?.off ?? "none"),
            };
        }
    }
    return params;
}
//# sourceMappingURL=azure-openai-responses.js.map

/***/ })

};
