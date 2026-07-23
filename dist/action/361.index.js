export const id = 361;
export const ids = [361];
export const modules = {

/***/ 11361:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   stream: () => (/* binding */ stream),
/* harmony export */   streamSimple: () => (/* binding */ streamSimple)
/* harmony export */ });
/* harmony import */ var _google_genai__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(79948);
/* harmony import */ var _models_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(73470);
/* harmony import */ var _utils_error_body_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(22191);
/* harmony import */ var _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(14257);
/* harmony import */ var _utils_headers_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(41146);
/* harmony import */ var _utils_provider_env_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(94313);
/* harmony import */ var _utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(80279);
/* harmony import */ var _google_shared_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(77350);
/* harmony import */ var _simple_options_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(16417);









const API_VERSION = "v1";
const GCP_VERTEX_CREDENTIALS_MARKER = "gcp-vertex-credentials";
const THINKING_LEVEL_MAP = {
    THINKING_LEVEL_UNSPECIFIED: _google_genai__WEBPACK_IMPORTED_MODULE_0__/* .ThinkingLevel */ .HL.THINKING_LEVEL_UNSPECIFIED,
    MINIMAL: _google_genai__WEBPACK_IMPORTED_MODULE_0__/* .ThinkingLevel */ .HL.MINIMAL,
    LOW: _google_genai__WEBPACK_IMPORTED_MODULE_0__/* .ThinkingLevel */ .HL.LOW,
    MEDIUM: _google_genai__WEBPACK_IMPORTED_MODULE_0__/* .ThinkingLevel */ .HL.MEDIUM,
    HIGH: _google_genai__WEBPACK_IMPORTED_MODULE_0__/* .ThinkingLevel */ .HL.HIGH,
};
// Counter for generating unique tool call IDs
let toolCallCounter = 0;
const stream = (model, context, options) => {
    const stream = new _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_1__/* .AssistantMessageEventStream */ .Q2();
    (async () => {
        const output = {
            role: "assistant",
            content: [],
            api: "google-vertex",
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
            const apiKey = resolveApiKey(options);
            // Create the client using either a Vertex API key, if provided, or ADC with project and location
            const client = apiKey
                ? createClientWithApiKey(model, apiKey, options?.headers)
                : createClient(model, resolveProject(options), resolveLocation(options), options?.headers, options?.env);
            let params = buildParams(model, context, options);
            const nextParams = await options?.onPayload?.(params, model);
            if (nextParams !== undefined) {
                params = nextParams;
            }
            const googleStream = await client.models.generateContentStream(params);
            stream.push({ type: "start", partial: output });
            let currentBlock = null;
            const blocks = output.content;
            const blockIndex = () => blocks.length - 1;
            for await (const chunk of googleStream) {
                // Vertex uses the same @google/genai GenerateContentResponse type as Gemini.
                // responseId is documented there as an output-only identifier for each response.
                output.responseId ||= chunk.responseId;
                const candidate = chunk.candidates?.[0];
                if (candidate?.content?.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.text !== undefined) {
                            const isThinking = (0,_google_shared_js__WEBPACK_IMPORTED_MODULE_2__/* .isThinkingPart */ .oH)(part);
                            if (!currentBlock ||
                                (isThinking && currentBlock.type !== "thinking") ||
                                (!isThinking && currentBlock.type !== "text")) {
                                if (currentBlock) {
                                    if (currentBlock.type === "text") {
                                        stream.push({
                                            type: "text_end",
                                            contentIndex: blocks.length - 1,
                                            content: currentBlock.text,
                                            partial: output,
                                        });
                                    }
                                    else {
                                        stream.push({
                                            type: "thinking_end",
                                            contentIndex: blockIndex(),
                                            content: currentBlock.thinking,
                                            partial: output,
                                        });
                                    }
                                }
                                if (isThinking) {
                                    currentBlock = { type: "thinking", thinking: "", thinkingSignature: undefined };
                                    output.content.push(currentBlock);
                                    stream.push({ type: "thinking_start", contentIndex: blockIndex(), partial: output });
                                }
                                else {
                                    currentBlock = { type: "text", text: "" };
                                    output.content.push(currentBlock);
                                    stream.push({ type: "text_start", contentIndex: blockIndex(), partial: output });
                                }
                            }
                            if (currentBlock.type === "thinking") {
                                currentBlock.thinking += part.text;
                                currentBlock.thinkingSignature = (0,_google_shared_js__WEBPACK_IMPORTED_MODULE_2__/* .retainThoughtSignature */ .pc)(currentBlock.thinkingSignature, part.thoughtSignature);
                                stream.push({
                                    type: "thinking_delta",
                                    contentIndex: blockIndex(),
                                    delta: part.text,
                                    partial: output,
                                });
                            }
                            else {
                                currentBlock.text += part.text;
                                currentBlock.textSignature = (0,_google_shared_js__WEBPACK_IMPORTED_MODULE_2__/* .retainThoughtSignature */ .pc)(currentBlock.textSignature, part.thoughtSignature);
                                stream.push({
                                    type: "text_delta",
                                    contentIndex: blockIndex(),
                                    delta: part.text,
                                    partial: output,
                                });
                            }
                        }
                        if (part.functionCall) {
                            if (currentBlock) {
                                if (currentBlock.type === "text") {
                                    stream.push({
                                        type: "text_end",
                                        contentIndex: blockIndex(),
                                        content: currentBlock.text,
                                        partial: output,
                                    });
                                }
                                else {
                                    stream.push({
                                        type: "thinking_end",
                                        contentIndex: blockIndex(),
                                        content: currentBlock.thinking,
                                        partial: output,
                                    });
                                }
                                currentBlock = null;
                            }
                            const providedId = part.functionCall.id;
                            const needsNewId = !providedId || output.content.some((b) => b.type === "toolCall" && b.id === providedId);
                            const toolCallId = needsNewId
                                ? `${part.functionCall.name}_${Date.now()}_${++toolCallCounter}`
                                : providedId;
                            const toolCall = {
                                type: "toolCall",
                                id: toolCallId,
                                name: part.functionCall.name || "",
                                arguments: part.functionCall.args ?? {},
                                ...(part.thoughtSignature && { thoughtSignature: part.thoughtSignature }),
                            };
                            output.content.push(toolCall);
                            stream.push({ type: "toolcall_start", contentIndex: blockIndex(), partial: output });
                            stream.push({
                                type: "toolcall_delta",
                                contentIndex: blockIndex(),
                                delta: JSON.stringify(toolCall.arguments),
                                partial: output,
                            });
                            stream.push({ type: "toolcall_end", contentIndex: blockIndex(), toolCall, partial: output });
                        }
                    }
                }
                if (candidate?.finishReason) {
                    output.stopReason = (0,_google_shared_js__WEBPACK_IMPORTED_MODULE_2__/* .mapStopReason */ .f7)(candidate.finishReason);
                    if (output.content.some((b) => b.type === "toolCall")) {
                        output.stopReason = "toolUse";
                    }
                }
                if (chunk.usageMetadata) {
                    output.usage = {
                        input: (chunk.usageMetadata.promptTokenCount || 0) - (chunk.usageMetadata.cachedContentTokenCount || 0),
                        output: (chunk.usageMetadata.candidatesTokenCount || 0) + (chunk.usageMetadata.thoughtsTokenCount || 0),
                        cacheRead: chunk.usageMetadata.cachedContentTokenCount || 0,
                        cacheWrite: 0,
                        reasoning: chunk.usageMetadata.thoughtsTokenCount || 0,
                        totalTokens: chunk.usageMetadata.totalTokenCount || 0,
                        cost: {
                            input: 0,
                            output: 0,
                            cacheRead: 0,
                            cacheWrite: 0,
                            total: 0,
                        },
                    };
                    (0,_models_js__WEBPACK_IMPORTED_MODULE_3__/* .calculateCost */ .yN)(model, output.usage);
                }
            }
            if (currentBlock) {
                if (currentBlock.type === "text") {
                    stream.push({
                        type: "text_end",
                        contentIndex: blockIndex(),
                        content: currentBlock.text,
                        partial: output,
                    });
                }
                else {
                    stream.push({
                        type: "thinking_end",
                        contentIndex: blockIndex(),
                        content: currentBlock.thinking,
                        partial: output,
                    });
                }
            }
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
            // Remove internal index property used during streaming
            for (const block of output.content) {
                if ("index" in block) {
                    delete block.index;
                }
            }
            output.stopReason = options?.signal?.aborted ? "aborted" : "error";
            output.errorMessage = (0,_utils_error_body_js__WEBPACK_IMPORTED_MODULE_4__/* .formatProviderError */ .lR)((0,_utils_error_body_js__WEBPACK_IMPORTED_MODULE_4__/* .normalizeProviderError */ .Jo)(error));
            stream.push({ type: "error", reason: output.stopReason, error: output });
            stream.end();
        }
    })();
    return stream;
};
const streamSimple = (model, context, options) => {
    const base = (0,_simple_options_js__WEBPACK_IMPORTED_MODULE_5__/* .buildBaseOptions */ .QP)(model, context, options, undefined);
    if (!options?.reasoning) {
        return stream(model, context, {
            ...base,
            thinking: { enabled: false },
        });
    }
    const clampedReasoning = (0,_models_js__WEBPACK_IMPORTED_MODULE_3__/* .clampThinkingLevel */ .Kt)(model, options.reasoning);
    const effort = (clampedReasoning === "off" ? "high" : clampedReasoning);
    const geminiModel = model;
    if (isGemini3ProModel(geminiModel) || isGemini3FlashModel(geminiModel)) {
        return stream(model, context, {
            ...base,
            thinking: {
                enabled: true,
                level: getGemini3ThinkingLevel(effort, geminiModel),
            },
        });
    }
    return stream(model, context, {
        ...base,
        thinking: {
            enabled: true,
            budgetTokens: getGoogleBudget(geminiModel, effort, options.thinkingBudgets),
        },
    });
};
function createClient(model, project, location, optionsHeaders, env) {
    const googleAuthOptions = buildGoogleAuthOptions(env);
    return new _google_genai__WEBPACK_IMPORTED_MODULE_0__/* .GoogleGenAI */ .M4({
        vertexai: true,
        project,
        location,
        apiVersion: API_VERSION,
        ...(googleAuthOptions ? { googleAuthOptions } : {}),
        httpOptions: buildHttpOptions(model, optionsHeaders),
    });
}
function createClientWithApiKey(model, apiKey, optionsHeaders) {
    return new _google_genai__WEBPACK_IMPORTED_MODULE_0__/* .GoogleGenAI */ .M4({
        vertexai: true,
        apiKey,
        apiVersion: API_VERSION,
        httpOptions: buildHttpOptions(model, optionsHeaders),
    });
}
function buildHttpOptions(model, optionsHeaders) {
    const httpOptions = {};
    const baseUrl = resolveCustomBaseUrl(model.baseUrl);
    if (baseUrl) {
        httpOptions.baseUrl = baseUrl;
        httpOptions.baseUrlResourceScope = _google_genai__WEBPACK_IMPORTED_MODULE_0__/* .ResourceScope */ .r.COLLECTION;
        if (baseUrlIncludesApiVersion(baseUrl)) {
            httpOptions.apiVersion = "";
        }
    }
    const headers = (0,_utils_headers_js__WEBPACK_IMPORTED_MODULE_6__/* .providerHeadersToRecord */ .m)({ ...model.headers, ...optionsHeaders });
    if (headers) {
        httpOptions.headers = headers;
    }
    return Object.keys(httpOptions).length > 0 ? httpOptions : undefined;
}
function resolveCustomBaseUrl(baseUrl) {
    const trimmed = baseUrl.trim();
    if (!trimmed || trimmed.includes("{location}")) {
        return undefined;
    }
    return trimmed;
}
function baseUrlIncludesApiVersion(baseUrl) {
    try {
        const url = new URL(baseUrl);
        return url.pathname.split("/").some((part) => /^v\d+(?:beta\d*)?$/.test(part));
    }
    catch {
        return /(?:^|\/)v\d+(?:beta\d*)?(?:\/|$)/.test(baseUrl);
    }
}
function buildGoogleAuthOptions(env) {
    const keyFilename = (0,_utils_provider_env_js__WEBPACK_IMPORTED_MODULE_7__/* .getProviderEnvValue */ .Y)("GOOGLE_APPLICATION_CREDENTIALS", env);
    return keyFilename ? { keyFilename } : undefined;
}
function resolveApiKey(options) {
    const apiKey = options?.apiKey?.trim();
    if (!apiKey || apiKey === GCP_VERTEX_CREDENTIALS_MARKER || isPlaceholderApiKey(apiKey)) {
        return undefined;
    }
    return apiKey;
}
function isPlaceholderApiKey(apiKey) {
    return /^<[^>]+>$/.test(apiKey);
}
function resolveProject(options) {
    const project = options?.project ||
        (0,_utils_provider_env_js__WEBPACK_IMPORTED_MODULE_7__/* .getProviderEnvValue */ .Y)("GOOGLE_CLOUD_PROJECT", options?.env) ||
        (0,_utils_provider_env_js__WEBPACK_IMPORTED_MODULE_7__/* .getProviderEnvValue */ .Y)("GCLOUD_PROJECT", options?.env);
    if (!project) {
        throw new Error("Vertex AI requires a project ID. Set GOOGLE_CLOUD_PROJECT/GCLOUD_PROJECT or pass project in options.");
    }
    return project;
}
function resolveLocation(options) {
    const location = options?.location || (0,_utils_provider_env_js__WEBPACK_IMPORTED_MODULE_7__/* .getProviderEnvValue */ .Y)("GOOGLE_CLOUD_LOCATION", options?.env);
    if (!location) {
        throw new Error("Vertex AI requires a location. Set GOOGLE_CLOUD_LOCATION or pass location in options.");
    }
    return location;
}
function buildParams(model, context, options = {}) {
    const contents = (0,_google_shared_js__WEBPACK_IMPORTED_MODULE_2__/* .convertMessages */ ._0)(model, context);
    const generationConfig = {};
    if (options.temperature !== undefined) {
        generationConfig.temperature = options.temperature;
    }
    if (options.maxTokens !== undefined) {
        generationConfig.maxOutputTokens = options.maxTokens;
    }
    const config = {
        ...(Object.keys(generationConfig).length > 0 && generationConfig),
        ...(context.systemPrompt && { systemInstruction: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_8__/* .sanitizeSurrogates */ .J)(context.systemPrompt) }),
        ...(context.tools && context.tools.length > 0 && { tools: (0,_google_shared_js__WEBPACK_IMPORTED_MODULE_2__/* .convertTools */ .B1)(context.tools) }),
    };
    if (context.tools && context.tools.length > 0 && options.toolChoice) {
        config.toolConfig = {
            functionCallingConfig: {
                mode: (0,_google_shared_js__WEBPACK_IMPORTED_MODULE_2__/* .mapToolChoice */ ._Q)(options.toolChoice),
            },
        };
    }
    else {
        config.toolConfig = undefined;
    }
    if (options.thinking?.enabled && model.reasoning) {
        const thinkingConfig = { includeThoughts: true };
        if (options.thinking.level !== undefined) {
            thinkingConfig.thinkingLevel = THINKING_LEVEL_MAP[options.thinking.level];
        }
        else if (options.thinking.budgetTokens !== undefined) {
            thinkingConfig.thinkingBudget = options.thinking.budgetTokens;
        }
        config.thinkingConfig = thinkingConfig;
    }
    else if (model.reasoning && options.thinking && !options.thinking.enabled) {
        config.thinkingConfig = getDisabledThinkingConfig(model);
    }
    if (options.signal) {
        if (options.signal.aborted) {
            throw new Error("Request aborted");
        }
        config.abortSignal = options.signal;
    }
    const params = {
        model: model.id,
        contents,
        config,
    };
    return params;
}
function isGemini3ProModel(model) {
    return /gemini-3(?:\.\d+)?-pro/.test(model.id.toLowerCase());
}
function isGemini3FlashModel(model) {
    const id = model.id.toLowerCase();
    return /gemini-3(?:\.\d+)?-flash/.test(id) || id === "gemini-flash-latest" || id === "gemini-flash-lite-latest";
}
function getDisabledThinkingConfig(model) {
    // Google docs: Gemini 3.1 Pro cannot disable thinking, and Gemini 3 Flash / Flash-Lite
    // do not support full thinking-off either. For Gemini 3 models, use the lowest supported
    // thinkingLevel without includeThoughts so hidden thinking remains invisible to pi.
    const geminiModel = model;
    if (isGemini3ProModel(geminiModel)) {
        return { thinkingLevel: _google_genai__WEBPACK_IMPORTED_MODULE_0__/* .ThinkingLevel */ .HL.LOW };
    }
    if (isGemini3FlashModel(geminiModel)) {
        return { thinkingLevel: _google_genai__WEBPACK_IMPORTED_MODULE_0__/* .ThinkingLevel */ .HL.MINIMAL };
    }
    // Gemini 2.x supports disabling via thinkingBudget = 0.
    return { thinkingBudget: 0 };
}
function getGemini3ThinkingLevel(effort, model) {
    if (isGemini3ProModel(model)) {
        switch (effort) {
            case "minimal":
            case "low":
                return "LOW";
            case "medium":
            case "high":
                return "HIGH";
        }
    }
    switch (effort) {
        case "minimal":
            return "MINIMAL";
        case "low":
            return "LOW";
        case "medium":
            return "MEDIUM";
        case "high":
            return "HIGH";
    }
}
function getGoogleBudget(model, effort, customBudgets) {
    if (customBudgets?.[effort] !== undefined) {
        return customBudgets[effort];
    }
    if (model.id.includes("2.5-pro")) {
        const budgets = {
            minimal: 128,
            low: 2048,
            medium: 8192,
            high: 32768,
        };
        return budgets[effort];
    }
    if (model.id.includes("2.5-flash")) {
        const budgets = {
            minimal: 128,
            low: 2048,
            medium: 8192,
            high: 24576,
        };
        return budgets[effort];
    }
    return -1;
}
//# sourceMappingURL=google-vertex.js.map

/***/ })

};
