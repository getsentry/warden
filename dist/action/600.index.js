export const id = 600;
export const ids = [600];
export const modules = {

/***/ 17600:
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
/* harmony import */ var _utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(80279);
/* harmony import */ var _google_shared_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(77350);
/* harmony import */ var _simple_options_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(16417);








// Counter for generating unique tool call IDs
let toolCallCounter = 0;
const stream = (model, context, options) => {
    const stream = new _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_1__/* .AssistantMessageEventStream */ .Q2();
    (async () => {
        const output = {
            role: "assistant",
            content: [],
            api: "google-generative-ai",
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
            const client = createClient(model, apiKey, options?.headers);
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
                // @google/genai documents GenerateContentResponse.responseId as an output-only field
                // used to identify each response. Keep the first non-empty one from the stream.
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
                            // Generate unique ID if not provided or if it's a duplicate
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
    const apiKey = options?.apiKey;
    if (!apiKey) {
        throw new Error(`No API key for provider: ${model.provider}`);
    }
    const base = (0,_simple_options_js__WEBPACK_IMPORTED_MODULE_5__/* .buildBaseOptions */ .QP)(model, context, options, apiKey);
    if (!options?.reasoning) {
        return stream(model, context, { ...base, thinking: { enabled: false } });
    }
    const clampedReasoning = (0,_models_js__WEBPACK_IMPORTED_MODULE_3__/* .clampThinkingLevel */ .Kt)(model, options.reasoning);
    const effort = (clampedReasoning === "off" ? "high" : clampedReasoning);
    const googleModel = model;
    if (isGemini3ProModel(googleModel) || isGemini3FlashModel(googleModel) || isGemma4Model(googleModel)) {
        return stream(model, context, {
            ...base,
            thinking: {
                enabled: true,
                level: getThinkingLevel(effort, googleModel),
            },
        });
    }
    return stream(model, context, {
        ...base,
        thinking: {
            enabled: true,
            budgetTokens: getGoogleBudget(googleModel, effort, options.thinkingBudgets),
        },
    });
};
function createClient(model, apiKey, optionsHeaders) {
    const httpOptions = {};
    if (model.baseUrl) {
        httpOptions.baseUrl = model.baseUrl;
        httpOptions.apiVersion = ""; // baseUrl already includes version path, don't append
    }
    const headers = (0,_utils_headers_js__WEBPACK_IMPORTED_MODULE_6__/* .providerHeadersToRecord */ .m)({ ...model.headers, ...optionsHeaders });
    if (headers) {
        httpOptions.headers = headers;
    }
    return new _google_genai__WEBPACK_IMPORTED_MODULE_0__/* .GoogleGenAI */ .M4({
        apiKey,
        httpOptions: Object.keys(httpOptions).length > 0 ? httpOptions : undefined,
    });
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
        ...(context.systemPrompt && { systemInstruction: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_7__/* .sanitizeSurrogates */ .J)(context.systemPrompt) }),
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
            // Cast to any since our GoogleThinkingLevel mirrors Google's ThinkingLevel enum values
            thinkingConfig.thinkingLevel = options.thinking.level;
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
function isGemma4Model(model) {
    return /gemma-?4/.test(model.id.toLowerCase());
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
    if (isGemini3ProModel(model)) {
        return { thinkingLevel: "LOW" };
    }
    if (isGemini3FlashModel(model)) {
        return { thinkingLevel: "MINIMAL" };
    }
    if (isGemma4Model(model)) {
        return { thinkingLevel: "MINIMAL" };
    }
    // Gemini 2.x supports disabling via thinkingBudget = 0.
    return { thinkingBudget: 0 };
}
function getThinkingLevel(effort, model) {
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
    if (isGemma4Model(model)) {
        switch (effort) {
            case "minimal":
            case "low":
                return "MINIMAL";
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
    if (model.id.includes("2.5-flash-lite")) {
        const budgets = {
            minimal: 512,
            low: 2048,
            medium: 8192,
            high: 24576,
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
//# sourceMappingURL=google-generative-ai.js.map

/***/ })

};
