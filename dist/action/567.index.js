export const id = 567;
export const ids = [567];
export const modules = {

/***/ 67822:
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

/***/ 77567:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   convertMessages: () => (/* binding */ convertMessages),
/* harmony export */   stream: () => (/* binding */ stream),
/* harmony export */   streamSimple: () => (/* binding */ streamSimple)
/* harmony export */ });
/* harmony import */ var openai__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(56722);
/* harmony import */ var _models_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(26168);
/* harmony import */ var _utils_error_body_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(35225);
/* harmony import */ var _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(65979);
/* harmony import */ var _utils_headers_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(35000);
/* harmony import */ var _utils_json_parse_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(68632);
/* harmony import */ var _utils_provider_env_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(15827);
/* harmony import */ var _utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(4001);
/* harmony import */ var _github_copilot_headers_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(67822);
/* harmony import */ var _openai_prompt_cache_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(71851);
/* harmony import */ var _simple_options_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(31751);
/* harmony import */ var _transform_messages_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(88400);












/**
 * Check if conversation messages contain tool calls or tool results.
 * This is needed because Anthropic (via proxy) requires the tools param
 * to be present when messages include tool_calls or tool role messages.
 */
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
function hasToolHistory(messages) {
    for (const msg of messages) {
        if (msg.role === "toolResult") {
            return true;
        }
        if (msg.role === "assistant") {
            if (msg.content.some((block) => block.type === "toolCall")) {
                return true;
            }
        }
    }
    return false;
}
function isTextContentBlock(block) {
    return block.type === "text";
}
function isThinkingContentBlock(block) {
    return block.type === "thinking";
}
function isToolCallBlock(block) {
    return block.type === "toolCall";
}
function isImageContentBlock(block) {
    return block.type === "image";
}
function isEncryptedReasoningDetail(detail) {
    if (typeof detail !== "object" || detail === null) {
        return false;
    }
    const candidate = detail;
    return (candidate.type === "reasoning.encrypted" &&
        typeof candidate.id === "string" &&
        candidate.id.length > 0 &&
        typeof candidate.data === "string" &&
        candidate.data.length > 0);
}
function resolveCacheRetention(cacheRetention, env) {
    if (cacheRetention) {
        return cacheRetention;
    }
    if ((0,_utils_provider_env_js__WEBPACK_IMPORTED_MODULE_1__/* .getProviderEnvValue */ .Y)("PI_CACHE_RETENTION", env) === "long") {
        return "long";
    }
    return "short";
}
const stream = (model, context, options) => {
    const stream = new _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_2__/* .AssistantMessageEventStream */ .Q2();
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
            const apiKey = getClientApiKey(model.provider, options?.apiKey, options?.headers);
            const compat = getCompat(model);
            const cacheRetention = resolveCacheRetention(options?.cacheRetention, options?.env);
            const cacheSessionId = cacheRetention === "none" ? undefined : options?.sessionId;
            const client = createClient(model, context, apiKey, options?.headers, cacheSessionId, compat);
            let params = buildParams(model, context, options, compat, cacheRetention);
            const nextParams = await options?.onPayload?.(params, model);
            if (nextParams !== undefined) {
                params = nextParams;
            }
            const requestOptions = {
                ...(options?.signal ? { signal: options.signal } : {}),
                ...(options?.timeoutMs !== undefined ? { timeout: options.timeoutMs } : {}),
                maxRetries: options?.maxRetries ?? 0,
            };
            const { data: openaiStream, response } = await client.chat.completions
                .create(params, requestOptions)
                .withResponse();
            await options?.onResponse?.({ status: response.status, headers: (0,_utils_headers_js__WEBPACK_IMPORTED_MODULE_3__/* .headersToRecord */ .j)(response.headers) }, model);
            stream.push({ type: "start", partial: output });
            let textBlock = null;
            let thinkingBlock = null;
            let hasFinishReason = false;
            const toolCallBlocksByIndex = new Map();
            const toolCallBlocksById = new Map();
            const pendingReasoningDetailsByToolCallId = new Map();
            const blocks = output.content;
            const getContentIndex = (block) => blocks.indexOf(block);
            const finishBlock = (block) => {
                const contentIndex = getContentIndex(block);
                if (contentIndex === -1) {
                    return;
                }
                if (block.type === "text") {
                    stream.push({
                        type: "text_end",
                        contentIndex,
                        content: block.text,
                        partial: output,
                    });
                }
                else if (block.type === "thinking") {
                    stream.push({
                        type: "thinking_end",
                        contentIndex,
                        content: block.thinking,
                        partial: output,
                    });
                }
                else if (block.type === "toolCall") {
                    block.arguments = (0,_utils_json_parse_js__WEBPACK_IMPORTED_MODULE_4__/* .parseStreamingJson */ .o2)(block.partialArgs);
                    // Finalize in-place and strip the scratch buffers so replay only
                    // carries parsed arguments.
                    delete block.partialArgs;
                    delete block.streamIndex;
                    stream.push({
                        type: "toolcall_end",
                        contentIndex,
                        toolCall: block,
                        partial: output,
                    });
                }
            };
            const ensureTextBlock = () => {
                if (!textBlock) {
                    textBlock = { type: "text", text: "" };
                    blocks.push(textBlock);
                    stream.push({ type: "text_start", contentIndex: getContentIndex(textBlock), partial: output });
                }
                return textBlock;
            };
            const ensureThinkingBlock = (thinkingSignature) => {
                if (!thinkingBlock) {
                    thinkingBlock = {
                        type: "thinking",
                        thinking: "",
                        thinkingSignature,
                    };
                    blocks.push(thinkingBlock);
                    stream.push({ type: "thinking_start", contentIndex: getContentIndex(thinkingBlock), partial: output });
                }
                return thinkingBlock;
            };
            const applyPendingReasoningDetail = (block) => {
                if (!block.id) {
                    return;
                }
                const pendingReasoningDetail = pendingReasoningDetailsByToolCallId.get(block.id);
                if (pendingReasoningDetail) {
                    block.thoughtSignature = pendingReasoningDetail;
                    pendingReasoningDetailsByToolCallId.delete(block.id);
                }
            };
            const ensureToolCallBlock = (toolCall) => {
                const streamIndex = typeof toolCall.index === "number" ? toolCall.index : undefined;
                let block = streamIndex !== undefined ? toolCallBlocksByIndex.get(streamIndex) : undefined;
                if (!block && toolCall.id) {
                    block = toolCallBlocksById.get(toolCall.id);
                }
                if (!block) {
                    block = {
                        type: "toolCall",
                        id: toolCall.id || "",
                        name: toolCall.function?.name || "",
                        arguments: {},
                        partialArgs: "",
                        streamIndex,
                    };
                    if (streamIndex !== undefined) {
                        toolCallBlocksByIndex.set(streamIndex, block);
                    }
                    if (toolCall.id) {
                        toolCallBlocksById.set(toolCall.id, block);
                    }
                    blocks.push(block);
                    stream.push({
                        type: "toolcall_start",
                        contentIndex: getContentIndex(block),
                        partial: output,
                    });
                }
                if (streamIndex !== undefined && block.streamIndex === undefined) {
                    block.streamIndex = streamIndex;
                    toolCallBlocksByIndex.set(streamIndex, block);
                }
                if (toolCall.id) {
                    toolCallBlocksById.set(toolCall.id, block);
                }
                applyPendingReasoningDetail(block);
                return block;
            };
            for await (const chunk of openaiStream) {
                if (!chunk || typeof chunk !== "object")
                    continue;
                // OpenAI documents ChatCompletionChunk.id as the unique chat completion identifier,
                // and each chunk in a streamed completion carries the same id.
                output.responseId ||= chunk.id;
                if (typeof chunk.model === "string" && chunk.model.length > 0 && chunk.model !== model.id) {
                    output.responseModel ||= chunk.model;
                }
                if (chunk.usage) {
                    output.usage = parseChunkUsage(chunk.usage, model);
                }
                const choice = Array.isArray(chunk.choices) ? chunk.choices[0] : undefined;
                if (!choice)
                    continue;
                // Fallback: some providers (e.g., Moonshot) return usage
                // in choice.usage instead of the standard chunk.usage
                if (!chunk.usage && choice.usage) {
                    output.usage = parseChunkUsage(choice.usage, model);
                }
                if (choice.finish_reason) {
                    const finishReasonResult = mapStopReason(choice.finish_reason);
                    output.stopReason = finishReasonResult.stopReason;
                    if (finishReasonResult.errorMessage) {
                        output.errorMessage = finishReasonResult.errorMessage;
                    }
                    hasFinishReason = true;
                }
                if (choice.delta) {
                    if (choice.delta.content !== null &&
                        choice.delta.content !== undefined &&
                        choice.delta.content.length > 0) {
                        const block = ensureTextBlock();
                        block.text += choice.delta.content;
                        stream.push({
                            type: "text_delta",
                            contentIndex: getContentIndex(block),
                            delta: choice.delta.content,
                            partial: output,
                        });
                    }
                    // Some endpoints return reasoning in reasoning_content (llama.cpp),
                    // or reasoning (other openai compatible endpoints)
                    // Use the first non-empty reasoning field to avoid duplication
                    // (e.g., chutes.ai returns both reasoning_content and reasoning with same content)
                    const reasoningFields = ["reasoning_content", "reasoning", "reasoning_text"];
                    const deltaFields = choice.delta;
                    let foundReasoningField = null;
                    for (const field of reasoningFields) {
                        const value = deltaFields[field];
                        if (typeof value === "string" && value.length > 0) {
                            foundReasoningField = field;
                            break;
                        }
                    }
                    if (foundReasoningField) {
                        const delta = deltaFields[foundReasoningField];
                        if (typeof delta === "string" && delta.length > 0) {
                            const thinkingSignature = model.provider === "opencode-go" && foundReasoningField === "reasoning"
                                ? "reasoning_content"
                                : foundReasoningField;
                            const block = ensureThinkingBlock(thinkingSignature);
                            block.thinking += delta;
                            stream.push({
                                type: "thinking_delta",
                                contentIndex: getContentIndex(block),
                                delta,
                                partial: output,
                            });
                        }
                    }
                    if (choice?.delta?.tool_calls) {
                        for (const toolCall of choice.delta.tool_calls) {
                            const block = ensureToolCallBlock(toolCall);
                            if (!block.id && toolCall.id) {
                                block.id = toolCall.id;
                                toolCallBlocksById.set(toolCall.id, block);
                            }
                            if (!block.name && toolCall.function?.name) {
                                block.name = toolCall.function.name;
                            }
                            let delta = "";
                            if (toolCall.function?.arguments) {
                                delta = toolCall.function.arguments;
                                block.partialArgs = (block.partialArgs ?? "") + toolCall.function.arguments;
                                block.arguments = (0,_utils_json_parse_js__WEBPACK_IMPORTED_MODULE_4__/* .parseStreamingJson */ .o2)(block.partialArgs);
                            }
                            stream.push({
                                type: "toolcall_delta",
                                contentIndex: getContentIndex(block),
                                delta,
                                partial: output,
                            });
                        }
                    }
                    const reasoningDetails = choice.delta.reasoning_details;
                    if (Array.isArray(reasoningDetails)) {
                        for (const detail of reasoningDetails) {
                            if (isEncryptedReasoningDetail(detail)) {
                                const serializedDetail = JSON.stringify(detail);
                                const matchingToolCall = toolCallBlocksById.get(detail.id);
                                if (matchingToolCall) {
                                    matchingToolCall.thoughtSignature = serializedDetail;
                                }
                                else {
                                    pendingReasoningDetailsByToolCallId.set(detail.id, serializedDetail);
                                }
                            }
                        }
                    }
                }
            }
            for (const block of blocks) {
                finishBlock(block);
            }
            if (options?.signal?.aborted) {
                throw new Error("Request was aborted");
            }
            if (output.stopReason === "aborted") {
                throw new Error("Request was aborted");
            }
            if (output.stopReason === "error") {
                throw new Error(output.errorMessage || "Provider returned an error stop reason");
            }
            if (!hasFinishReason) {
                throw new Error("Stream ended without finish_reason");
            }
            stream.push({ type: "done", reason: output.stopReason, message: output });
            stream.end();
        }
        catch (error) {
            for (const block of output.content) {
                delete block.index;
                // Streaming scratch buffers are only used during parsing; never persist them.
                delete block.partialArgs;
                delete block.streamIndex;
            }
            output.stopReason = options?.signal?.aborted ? "aborted" : "error";
            output.errorMessage = (0,_utils_error_body_js__WEBPACK_IMPORTED_MODULE_5__/* .formatProviderError */ .lR)((0,_utils_error_body_js__WEBPACK_IMPORTED_MODULE_5__/* .normalizeProviderError */ .Jo)(error));
            // Some providers via OpenRouter give additional information in this field.
            // normalizeProviderError already stringifies the parsed body (error.error)
            // into errorMessage, so only append the raw metadata when it is not already
            // present to avoid double-printing it.
            const rawMetadata = error?.error?.metadata?.raw;
            if (rawMetadata && !output.errorMessage.includes(String(rawMetadata))) {
                output.errorMessage += `\n${rawMetadata}`;
            }
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
    const toolChoice = options?.toolChoice;
    return stream(model, context, {
        ...base,
        reasoningEffort,
        toolChoice,
    });
};
function createClient(model, context, apiKey, optionsHeaders, sessionId, compat = getCompat(model)) {
    const headers = { ...model.headers };
    if (model.provider === "github-copilot") {
        const hasImages = (0,_github_copilot_headers_js__WEBPACK_IMPORTED_MODULE_8__/* .hasCopilotVisionInput */ .d1)(context.messages);
        const copilotHeaders = (0,_github_copilot_headers_js__WEBPACK_IMPORTED_MODULE_8__/* .buildCopilotDynamicHeaders */ .G0)({
            messages: context.messages,
            hasImages,
        });
        Object.assign(headers, copilotHeaders);
    }
    if (sessionId && compat.sendSessionAffinityHeaders) {
        headers.session_id = sessionId;
        headers["x-client-request-id"] = sessionId;
        headers["x-session-affinity"] = sessionId;
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
function buildParams(model, context, options, compat = getCompat(model), cacheRetention = resolveCacheRetention(options?.cacheRetention, options?.env)) {
    const messages = convertMessages(model, context, compat);
    const cacheControl = getCompatCacheControl(compat, cacheRetention);
    const params = {
        model: model.id,
        messages,
        stream: true,
        prompt_cache_key: (model.baseUrl.includes("api.openai.com") && cacheRetention !== "none") ||
            (cacheRetention === "long" && compat.supportsLongCacheRetention)
            ? (0,_openai_prompt_cache_js__WEBPACK_IMPORTED_MODULE_9__/* .clampOpenAIPromptCacheKey */ .l)(options?.sessionId)
            : undefined,
        prompt_cache_retention: cacheRetention === "long" && compat.supportsLongCacheRetention ? "24h" : undefined,
    };
    if (compat.supportsUsageInStreaming !== false) {
        params.stream_options = { include_usage: true };
    }
    if (compat.supportsStore) {
        params.store = false;
    }
    if (options?.maxTokens) {
        if (compat.maxTokensField === "max_tokens") {
            params.max_tokens = options.maxTokens;
        }
        else {
            params.max_completion_tokens = options.maxTokens;
        }
    }
    if (options?.temperature !== undefined) {
        params.temperature = options.temperature;
    }
    if (context.tools && context.tools.length > 0) {
        params.tools = convertTools(context.tools, compat);
        if (compat.zaiToolStream) {
            params.tool_stream = true;
        }
    }
    else if (hasToolHistory(context.messages)) {
        // Anthropic (via LiteLLM/proxy) requires tools param when conversation has tool_calls/tool_results
        params.tools = [];
    }
    if (cacheControl) {
        applyAnthropicCacheControl(messages, params.tools, cacheControl);
    }
    if (options?.toolChoice) {
        params.tool_choice = options.toolChoice;
    }
    if (compat.thinkingFormat === "zai" && model.reasoning) {
        const zaiParams = params;
        zaiParams.thinking = options?.reasoningEffort ? { type: "enabled", clear_thinking: false } : { type: "disabled" };
        if (options?.reasoningEffort && compat.supportsReasoningEffort) {
            const mappedEffort = model.thinkingLevelMap?.[options.reasoningEffort];
            const effort = mappedEffort === undefined ? options.reasoningEffort : mappedEffort;
            if (typeof effort === "string") {
                zaiParams.reasoning_effort = effort;
            }
        }
    }
    else if (compat.thinkingFormat === "qwen" && model.reasoning) {
        params.enable_thinking = !!options?.reasoningEffort;
    }
    else if (compat.thinkingFormat === "qwen-chat-template" && model.reasoning) {
        params.chat_template_kwargs = {
            enable_thinking: !!options?.reasoningEffort,
            preserve_thinking: true,
        };
    }
    else if (compat.thinkingFormat === "chat-template" && model.reasoning) {
        const chatTemplateKwargs = buildChatTemplateKwargs(model, options, compat);
        if (chatTemplateKwargs) {
            params.chat_template_kwargs = chatTemplateKwargs;
        }
    }
    else if (compat.thinkingFormat === "deepseek" && model.reasoning) {
        if (options?.reasoningEffort) {
            params.thinking = { type: "enabled" };
        }
        else if (model.thinkingLevelMap?.off !== null) {
            params.thinking = { type: "disabled" };
        }
        if (options?.reasoningEffort && compat.supportsReasoningEffort) {
            params.reasoning_effort =
                model.thinkingLevelMap?.[options.reasoningEffort] ?? options.reasoningEffort;
        }
    }
    else if (compat.thinkingFormat === "openrouter" && model.reasoning) {
        // OpenRouter normalizes reasoning across providers via a nested reasoning object.
        const openRouterParams = params;
        if (options?.reasoningEffort) {
            openRouterParams.reasoning = {
                effort: model.thinkingLevelMap?.[options.reasoningEffort] ?? options.reasoningEffort,
            };
        }
        else if (model.thinkingLevelMap?.off !== null) {
            openRouterParams.reasoning = { effort: model.thinkingLevelMap?.off ?? "none" };
        }
    }
    else if (compat.thinkingFormat === "ant-ling" && model.reasoning && options?.reasoningEffort) {
        const effort = model.thinkingLevelMap?.[options.reasoningEffort];
        if (typeof effort === "string") {
            params.reasoning = { effort };
        }
    }
    else if (compat.thinkingFormat === "together" && model.reasoning) {
        const togetherParams = params;
        togetherParams.reasoning = { enabled: !!options?.reasoningEffort };
        if (options?.reasoningEffort && compat.supportsReasoningEffort) {
            togetherParams.reasoning_effort = model.thinkingLevelMap?.[options.reasoningEffort] ?? options.reasoningEffort;
        }
    }
    else if (compat.thinkingFormat === "string-thinking" && model.reasoning) {
        const stringThinkingParams = params;
        if (options?.reasoningEffort) {
            stringThinkingParams.thinking = model.thinkingLevelMap?.[options.reasoningEffort] ?? options.reasoningEffort;
        }
        else if (model.thinkingLevelMap?.off !== null) {
            stringThinkingParams.thinking = model.thinkingLevelMap?.off ?? "none";
        }
    }
    else if (options?.reasoningEffort && model.reasoning && compat.supportsReasoningEffort) {
        // OpenAI-style reasoning_effort
        params.reasoning_effort = model.thinkingLevelMap?.[options.reasoningEffort] ?? options.reasoningEffort;
    }
    else if (!options?.reasoningEffort && model.reasoning && compat.supportsReasoningEffort) {
        const offValue = model.thinkingLevelMap?.off;
        if (typeof offValue === "string") {
            params.reasoning_effort = offValue;
        }
    }
    // OpenRouter provider routing preferences
    if (model.compat?.openRouterRouting) {
        params.provider = model.compat.openRouterRouting;
    }
    // Vercel AI Gateway provider routing preferences
    if (model.compat?.vercelGatewayRouting) {
        const routing = model.compat.vercelGatewayRouting;
        if (routing.only || routing.order) {
            const gatewayOptions = {};
            if (routing.only)
                gatewayOptions.only = routing.only;
            if (routing.order)
                gatewayOptions.order = routing.order;
            params.providerOptions = { gateway: gatewayOptions };
        }
    }
    return params;
}
function buildChatTemplateKwargs(model, options, compat) {
    const kwargs = {};
    for (const [key, value] of Object.entries(compat.chatTemplateKwargs)) {
        const resolved = resolveChatTemplateKwargValue(model, options, value);
        if (resolved !== undefined) {
            kwargs[key] = resolved;
        }
    }
    return Object.keys(kwargs).length > 0 ? kwargs : undefined;
}
function resolveChatTemplateKwargValue(model, options, value) {
    if (typeof value !== "object" || value === null) {
        return value;
    }
    const reasoningEffort = options?.reasoningEffort;
    if (!reasoningEffort && value.omitWhenOff) {
        return undefined;
    }
    if (value.$var === "thinking.enabled") {
        return !!reasoningEffort;
    }
    const mappedValue = reasoningEffort ? model.thinkingLevelMap?.[reasoningEffort] : model.thinkingLevelMap?.off;
    return mappedValue === undefined ? reasoningEffort : typeof mappedValue === "string" ? mappedValue : undefined;
}
function getCompatCacheControl(compat, cacheRetention) {
    if (compat.cacheControlFormat !== "anthropic" || cacheRetention === "none") {
        return undefined;
    }
    const ttl = cacheRetention === "long" && compat.supportsLongCacheRetention ? "1h" : undefined;
    return { type: "ephemeral", ...(ttl ? { ttl } : {}) };
}
function applyAnthropicCacheControl(messages, tools, cacheControl) {
    addCacheControlToSystemPrompt(messages, cacheControl);
    addCacheControlToLastTool(tools, cacheControl);
    addCacheControlToLastConversationMessage(messages, cacheControl);
}
function addCacheControlToSystemPrompt(messages, cacheControl) {
    for (const message of messages) {
        if (message.role === "system" || message.role === "developer") {
            addCacheControlToInstructionMessage(message, cacheControl);
            return;
        }
    }
}
function addCacheControlToLastConversationMessage(messages, cacheControl) {
    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message.role === "user" || message.role === "assistant") {
            if (addCacheControlToMessage(message, cacheControl)) {
                return;
            }
        }
    }
}
function addCacheControlToLastTool(tools, cacheControl) {
    if (!tools || tools.length === 0) {
        return;
    }
    const lastTool = tools[tools.length - 1];
    lastTool.cache_control = cacheControl;
}
function addCacheControlToInstructionMessage(message, cacheControl) {
    return addCacheControlToTextContent(message, cacheControl);
}
function addCacheControlToMessage(message, cacheControl) {
    if (message.role === "user" || message.role === "assistant") {
        return addCacheControlToTextContent(message, cacheControl);
    }
    return false;
}
function addCacheControlToTextContent(message, cacheControl) {
    const content = message.content;
    if (typeof content === "string") {
        if (content.length === 0) {
            return false;
        }
        message.content = [
            {
                type: "text",
                text: content,
                cache_control: cacheControl,
            },
        ];
        return true;
    }
    if (!Array.isArray(content)) {
        return false;
    }
    for (let i = content.length - 1; i >= 0; i--) {
        const part = content[i];
        if (part?.type === "text") {
            const textPart = part;
            textPart.cache_control = cacheControl;
            return true;
        }
    }
    return false;
}
function convertMessages(model, context, compat) {
    const params = [];
    const normalizeToolCallId = (id) => {
        // Handle pipe-separated IDs from OpenAI Responses API
        // Format: {call_id}|{id} where {id} can be 400+ chars with special chars (+, /, =)
        // These come from providers like github-copilot, openai-codex, opencode
        // Extract just the call_id part and normalize it
        if (id.includes("|")) {
            const [callId] = id.split("|");
            // Sanitize to allowed chars and truncate to 40 chars (OpenAI limit)
            return callId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
        }
        if (model.provider === "openai")
            return id.length > 40 ? id.slice(0, 40) : id;
        return id;
    };
    const transformedMessages = (0,_transform_messages_js__WEBPACK_IMPORTED_MODULE_10__/* .transformMessages */ .b)(context.messages, model, (id) => normalizeToolCallId(id));
    if (context.systemPrompt) {
        const useDeveloperRole = model.reasoning && compat.supportsDeveloperRole;
        const role = useDeveloperRole ? "developer" : "system";
        params.push({ role: role, content: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_11__/* .sanitizeSurrogates */ .J)(context.systemPrompt) });
    }
    let lastRole = null;
    for (let i = 0; i < transformedMessages.length; i++) {
        const msg = transformedMessages[i];
        // Some providers don't allow user messages directly after tool results
        // Insert a synthetic assistant message to bridge the gap
        if (compat.requiresAssistantAfterToolResult && lastRole === "toolResult" && msg.role === "user") {
            params.push({
                role: "assistant",
                content: "I have processed the tool results.",
            });
        }
        if (msg.role === "user") {
            if (typeof msg.content === "string") {
                params.push({
                    role: "user",
                    content: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_11__/* .sanitizeSurrogates */ .J)(msg.content),
                });
            }
            else {
                const content = msg.content.map((item) => {
                    if (item.type === "text") {
                        return {
                            type: "text",
                            text: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_11__/* .sanitizeSurrogates */ .J)(item.text),
                        };
                    }
                    else {
                        return {
                            type: "image_url",
                            image_url: {
                                url: `data:${item.mimeType};base64,${item.data}`,
                            },
                        };
                    }
                });
                if (content.length === 0)
                    continue;
                params.push({
                    role: "user",
                    content,
                });
            }
        }
        else if (msg.role === "assistant") {
            // Some providers don't accept null content, use empty string instead
            const assistantMsg = {
                role: "assistant",
                content: compat.requiresAssistantAfterToolResult ? "" : null,
            };
            const assistantTextParts = msg.content
                .filter(isTextContentBlock)
                .filter((block) => block.text.trim().length > 0)
                .map((block) => ({
                type: "text",
                text: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_11__/* .sanitizeSurrogates */ .J)(block.text),
            }));
            const assistantText = assistantTextParts.map((part) => part.text).join("");
            const nonEmptyThinkingBlocks = msg.content
                .filter(isThinkingContentBlock)
                .filter((block) => block.thinking.trim().length > 0);
            if (nonEmptyThinkingBlocks.length > 0) {
                if (compat.requiresThinkingAsText) {
                    // Convert thinking blocks to plain text (no tags to avoid model mimicking them)
                    const thinkingText = nonEmptyThinkingBlocks
                        .map((block) => (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_11__/* .sanitizeSurrogates */ .J)(block.thinking))
                        .join("\n\n");
                    assistantMsg.content = [{ type: "text", text: thinkingText }, ...assistantTextParts];
                }
                else {
                    // Always send assistant content as a plain string (OpenAI Chat Completions
                    // API standard format). Sending as an array of {type:"text", text:"..."}
                    // objects is non-standard and causes some models (e.g. DeepSeek V3.2 via
                    // NVIDIA NIM) to mirror the content-block structure literally in their
                    // output, producing recursive nesting like [{'type':'text','text':'[{...}]'}].
                    if (assistantText.length > 0) {
                        assistantMsg.content = assistantText;
                    }
                    // Use the signature from the first thinking block if available (for llama.cpp server + gpt-oss)
                    let signature = nonEmptyThinkingBlocks[0].thinkingSignature;
                    if (model.provider === "opencode-go" && signature === "reasoning") {
                        signature = "reasoning_content";
                    }
                    if (signature && signature.length > 0) {
                        assistantMsg[signature] = nonEmptyThinkingBlocks.map((block) => block.thinking).join("\n");
                    }
                }
            }
            else if (assistantText.length > 0) {
                // Always send assistant content as a plain string (OpenAI Chat Completions
                // API standard format). Sending as an array of {type:"text", text:"..."}
                // objects is non-standard and causes some models (e.g. DeepSeek V3.2 via
                // NVIDIA NIM) to mirror the content-block structure literally in their
                // output, producing recursive nesting like [{'type':'text','text':'[{...}]'}].
                assistantMsg.content = assistantText;
            }
            const toolCalls = msg.content.filter(isToolCallBlock);
            if (toolCalls.length > 0) {
                assistantMsg.tool_calls = toolCalls.map((tc) => ({
                    id: tc.id,
                    type: "function",
                    function: {
                        name: tc.name,
                        arguments: JSON.stringify(tc.arguments),
                    },
                }));
                const reasoningDetails = toolCalls
                    .filter((tc) => tc.thoughtSignature)
                    .map((tc) => {
                    try {
                        return JSON.parse(tc.thoughtSignature);
                    }
                    catch {
                        return null;
                    }
                })
                    .filter(Boolean);
                if (reasoningDetails.length > 0) {
                    assistantMsg.reasoning_details = reasoningDetails;
                }
            }
            if (compat.requiresReasoningContentOnAssistantMessages &&
                model.reasoning &&
                assistantMsg.reasoning_content === undefined) {
                assistantMsg.reasoning_content = "";
            }
            // Skip assistant messages that have no content and no tool calls.
            // Some providers require "either content or tool_calls, but not none".
            // Other providers also don't accept empty assistant messages.
            // This handles aborted assistant responses that got no content.
            const content = assistantMsg.content;
            const hasContent = content !== null &&
                content !== undefined &&
                (typeof content === "string" ? content.length > 0 : content.length > 0);
            if (!hasContent && !assistantMsg.tool_calls) {
                continue;
            }
            params.push(assistantMsg);
        }
        else if (msg.role === "toolResult") {
            const imageBlocks = [];
            let j = i;
            for (; j < transformedMessages.length && transformedMessages[j].role === "toolResult"; j++) {
                const toolMsg = transformedMessages[j];
                // Extract text and image content
                const textResult = toolMsg.content
                    .filter(isTextContentBlock)
                    .map((block) => block.text)
                    .join("\n");
                const hasImages = toolMsg.content.some((c) => c.type === "image");
                // Always send tool result with text (or placeholder if only images)
                const hasText = textResult.length > 0;
                const toolResultText = hasText ? textResult : hasImages ? "(see attached image)" : "(no tool output)";
                // Some providers require the 'name' field in tool results
                const toolResultMsg = {
                    role: "tool",
                    content: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_11__/* .sanitizeSurrogates */ .J)(toolResultText),
                    tool_call_id: toolMsg.toolCallId,
                };
                if (compat.requiresToolResultName && toolMsg.toolName) {
                    toolResultMsg.name = toolMsg.toolName;
                }
                params.push(toolResultMsg);
                if (hasImages && model.input.includes("image")) {
                    for (const block of toolMsg.content) {
                        if (isImageContentBlock(block)) {
                            imageBlocks.push({
                                type: "image_url",
                                image_url: {
                                    url: `data:${block.mimeType};base64,${block.data}`,
                                },
                            });
                        }
                    }
                }
            }
            i = j - 1;
            if (imageBlocks.length > 0) {
                if (compat.requiresAssistantAfterToolResult) {
                    params.push({
                        role: "assistant",
                        content: "I have processed the tool results.",
                    });
                }
                params.push({
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Attached image(s) from tool result:",
                        },
                        ...imageBlocks,
                    ],
                });
                lastRole = "user";
            }
            else {
                lastRole = "toolResult";
            }
            continue;
        }
        lastRole = msg.role;
    }
    return params;
}
function convertTools(tools, compat) {
    return tools.map((tool) => ({
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters, // TypeBox already generates JSON Schema
            // Only include strict if provider supports it. Some reject unknown fields.
            ...(compat.supportsStrictMode !== false && { strict: false }),
        },
    }));
}
function parseChunkUsage(rawUsage, model) {
    const promptTokens = rawUsage.prompt_tokens || 0;
    const cacheReadTokens = rawUsage.prompt_tokens_details?.cached_tokens ?? rawUsage.prompt_cache_hit_tokens ?? 0;
    const cacheWriteTokens = rawUsage.prompt_tokens_details?.cache_write_tokens || 0;
    // Follow documented OpenAI/OpenRouter semantics: cached_tokens is cache-read
    // tokens (hits). OpenAI does not document or emit cache_write_tokens, but
    // OpenRouter-compatible providers can include it as a separate write count.
    // OpenRouter's own provider/tests affirm the separate mapping:
    // https://github.com/OpenRouterTeam/ai-sdk-provider/pull/409
    // Do not subtract writes from cached_tokens, otherwise spec-compliant
    // providers are under-reported. DS4 mirrors this contract too:
    // https://github.com/antirez/ds4/pull/29
    const input = Math.max(0, promptTokens - cacheReadTokens - cacheWriteTokens);
    // OpenAI completion_tokens already includes reasoning_tokens.
    const outputTokens = rawUsage.completion_tokens || 0;
    const usage = {
        input,
        output: outputTokens,
        cacheRead: cacheReadTokens,
        cacheWrite: cacheWriteTokens,
        reasoning: rawUsage.completion_tokens_details?.reasoning_tokens || 0,
        totalTokens: input + outputTokens + cacheReadTokens + cacheWriteTokens,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    };
    (0,_models_js__WEBPACK_IMPORTED_MODULE_7__/* .calculateCost */ .yN)(model, usage);
    return usage;
}
function mapStopReason(reason) {
    if (reason === null)
        return { stopReason: "stop" };
    switch (reason) {
        case "stop":
        case "end":
            return { stopReason: "stop" };
        case "length":
            return { stopReason: "length" };
        case "function_call":
        case "tool_calls":
            return { stopReason: "toolUse" };
        case "content_filter":
            return { stopReason: "error", errorMessage: "Provider finish_reason: content_filter" };
        case "network_error":
            return { stopReason: "error", errorMessage: "Provider finish_reason: network_error" };
        default:
            return {
                stopReason: "error",
                errorMessage: `Provider finish_reason: ${reason}`,
            };
    }
}
/**
 * Auto-detect compatibility settings from provider name and baseUrl.
 * Used as the base when model.compat is not set; explicit model.compat
 * entries override these detected values.
 */
function detectCompat(model) {
    const provider = model.provider;
    const baseUrl = model.baseUrl;
    const isZai = provider === "zai" ||
        provider === "zai-coding-cn" ||
        baseUrl.includes("api.z.ai") ||
        baseUrl.includes("open.bigmodel.cn");
    const isTogether = provider === "together" || baseUrl.includes("api.together.ai") || baseUrl.includes("api.together.xyz");
    const isMoonshot = provider === "moonshotai" || provider === "moonshotai-cn" || baseUrl.includes("api.moonshot.");
    const isOpenRouter = provider === "openrouter" || baseUrl.includes("openrouter.ai");
    const isCloudflareWorkersAI = provider === "cloudflare-workers-ai" || baseUrl.includes("api.cloudflare.com");
    const isCloudflareAiGateway = provider === "cloudflare-ai-gateway" || baseUrl.includes("gateway.ai.cloudflare.com");
    const isNvidia = provider === "nvidia" || baseUrl.includes("integrate.api.nvidia.com");
    const isAntLing = provider === "ant-ling" || baseUrl.includes("api.ant-ling.com");
    const isNonStandard = isNvidia ||
        provider === "cerebras" ||
        baseUrl.includes("cerebras.ai") ||
        provider === "xai" ||
        baseUrl.includes("api.x.ai") ||
        isTogether ||
        baseUrl.includes("chutes.ai") ||
        baseUrl.includes("deepseek.com") ||
        isZai ||
        isMoonshot ||
        provider === "opencode" ||
        baseUrl.includes("opencode.ai") ||
        isCloudflareWorkersAI ||
        isCloudflareAiGateway ||
        isAntLing;
    const useMaxTokens = baseUrl.includes("chutes.ai") || isMoonshot || isCloudflareAiGateway || isTogether || isNvidia || isAntLing;
    const isGrok = provider === "xai" || baseUrl.includes("api.x.ai");
    const isDeepSeek = provider === "deepseek" || baseUrl.includes("deepseek.com");
    const isOpenRouterDeveloperRoleModel = isOpenRouter && (model.id.startsWith("anthropic/") || model.id.startsWith("openai/"));
    const cacheControlFormat = provider === "openrouter" && model.id.startsWith("anthropic/") ? "anthropic" : undefined;
    return {
        supportsStore: !isNonStandard,
        supportsDeveloperRole: isOpenRouterDeveloperRoleModel || (!isNonStandard && !isOpenRouter),
        supportsReasoningEffort: !isGrok && !isZai && !isMoonshot && !isTogether && !isCloudflareAiGateway && !isNvidia && !isAntLing,
        supportsUsageInStreaming: true,
        maxTokensField: useMaxTokens ? "max_tokens" : "max_completion_tokens",
        requiresToolResultName: false,
        requiresAssistantAfterToolResult: false,
        requiresThinkingAsText: false,
        requiresReasoningContentOnAssistantMessages: isDeepSeek,
        thinkingFormat: isDeepSeek
            ? "deepseek"
            : isZai
                ? "zai"
                : isTogether
                    ? "together"
                    : isAntLing
                        ? "ant-ling"
                        : isOpenRouter
                            ? "openrouter"
                            : "openai",
        openRouterRouting: {},
        vercelGatewayRouting: {},
        chatTemplateKwargs: {},
        zaiToolStream: false,
        supportsStrictMode: !isMoonshot && !isTogether && !isCloudflareAiGateway && !isNvidia,
        cacheControlFormat,
        sendSessionAffinityHeaders: false,
        supportsLongCacheRetention: !(isTogether ||
            isCloudflareWorkersAI ||
            isCloudflareAiGateway ||
            isNvidia ||
            isAntLing),
    };
}
/**
 * Get resolved compatibility settings for a model.
 * Auto-detects from provider/URL then overrides with explicit model.compat.
 */
function getCompat(model) {
    const detected = detectCompat(model);
    if (!model.compat)
        return detected;
    return {
        supportsStore: model.compat.supportsStore ?? detected.supportsStore,
        supportsDeveloperRole: model.compat.supportsDeveloperRole ?? detected.supportsDeveloperRole,
        supportsReasoningEffort: model.compat.supportsReasoningEffort ?? detected.supportsReasoningEffort,
        supportsUsageInStreaming: model.compat.supportsUsageInStreaming ?? detected.supportsUsageInStreaming,
        maxTokensField: model.compat.maxTokensField ?? detected.maxTokensField,
        requiresToolResultName: model.compat.requiresToolResultName ?? detected.requiresToolResultName,
        requiresAssistantAfterToolResult: model.compat.requiresAssistantAfterToolResult ?? detected.requiresAssistantAfterToolResult,
        requiresThinkingAsText: model.compat.requiresThinkingAsText ?? detected.requiresThinkingAsText,
        requiresReasoningContentOnAssistantMessages: model.compat.requiresReasoningContentOnAssistantMessages ??
            detected.requiresReasoningContentOnAssistantMessages,
        thinkingFormat: model.compat.thinkingFormat ?? detected.thinkingFormat,
        openRouterRouting: model.compat.openRouterRouting ?? {},
        vercelGatewayRouting: model.compat.vercelGatewayRouting ?? detected.vercelGatewayRouting,
        chatTemplateKwargs: model.compat.chatTemplateKwargs ?? detected.chatTemplateKwargs,
        zaiToolStream: model.compat.zaiToolStream ?? detected.zaiToolStream,
        supportsStrictMode: model.compat.supportsStrictMode ?? detected.supportsStrictMode,
        cacheControlFormat: model.compat.cacheControlFormat ?? detected.cacheControlFormat,
        sendSessionAffinityHeaders: model.compat.sendSessionAffinityHeaders ?? detected.sendSessionAffinityHeaders,
        supportsLongCacheRetention: model.compat.supportsLongCacheRetention ?? detected.supportsLongCacheRetention,
    };
}
//# sourceMappingURL=openai-completions.js.map

/***/ }),

/***/ 71851:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   l: () => (/* binding */ clampOpenAIPromptCacheKey)
/* harmony export */ });
/* unused harmony export OPENAI_PROMPT_CACHE_KEY_MAX_LENGTH */
const OPENAI_PROMPT_CACHE_KEY_MAX_LENGTH = 64;
function clampOpenAIPromptCacheKey(key) {
    if (key === undefined)
        return undefined;
    const chars = Array.from(key);
    if (chars.length <= OPENAI_PROMPT_CACHE_KEY_MAX_LENGTH)
        return key;
    return chars.slice(0, OPENAI_PROMPT_CACHE_KEY_MAX_LENGTH).join("");
}
//# sourceMappingURL=openai-prompt-cache.js.map

/***/ }),

/***/ 31751:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  xw: () => (/* binding */ adjustMaxTokensForThinking),
  QP: () => (/* binding */ buildBaseOptions),
  Yx: () => (/* binding */ clampMaxTokensToContext),
  M7: () => (/* binding */ clampReasoning)
});

;// CONCATENATED MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.80.6_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/utils/estimate.js
const CHARS_PER_TOKEN = 4;
const ESTIMATED_IMAGE_CHARS = 4800;
function calculateContextTokens(usage) {
    return usage.totalTokens || usage.input + usage.output + usage.cacheRead + usage.cacheWrite;
}
function safeJsonStringify(value) {
    try {
        return JSON.stringify(value) ?? "undefined";
    }
    catch {
        return "[unserializable]";
    }
}
function estimateTextAndImageContentChars(content) {
    if (typeof content === "string")
        return content.length;
    let chars = 0;
    for (const block of content)
        chars += block.type === "text" ? block.text.length : ESTIMATED_IMAGE_CHARS;
    return chars;
}
function estimateTextTokens(text) {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
}
function estimateTextAndImageContentTokens(content) {
    return Math.ceil(estimateTextAndImageContentChars(content) / CHARS_PER_TOKEN);
}
function estimateMessageTokens(message) {
    let chars = 0;
    if (message.role === "user")
        return estimateTextAndImageContentTokens(message.content);
    if (message.role === "toolResult")
        return estimateTextAndImageContentTokens(message.content);
    for (const block of message.content) {
        if (block.type === "text") {
            chars += block.text.length;
        }
        else if (block.type === "thinking") {
            chars += block.thinking.length;
        }
        else {
            chars += block.name.length + safeJsonStringify(block.arguments).length;
        }
    }
    return Math.ceil(chars / CHARS_PER_TOKEN);
}
function getLastAssistantUsageInfo(messages) {
    let latestPrefixTimestamp = Number.NEGATIVE_INFINITY;
    let usageInfo;
    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        if (message.role === "assistant") {
            const assistant = message;
            // A newer prefix message was inserted after this response (for example, a
            // compaction summary), so its usage cannot describe the current prefix.
            const usageAppliesToPrefix = assistant.timestamp >= latestPrefixTimestamp;
            if (usageAppliesToPrefix &&
                assistant.stopReason !== "aborted" &&
                assistant.stopReason !== "error" &&
                calculateContextTokens(assistant.usage) > 0) {
                usageInfo = { usage: assistant.usage, index: i };
            }
        }
        latestPrefixTimestamp = Math.max(latestPrefixTimestamp, message.timestamp);
    }
    return usageInfo;
}
function estimateMessages(messages) {
    const usageInfo = getLastAssistantUsageInfo(messages);
    if (usageInfo) {
        const usageTokens = calculateContextTokens(usageInfo.usage);
        let trailingTokens = 0;
        for (let i = usageInfo.index + 1; i < messages.length; i++) {
            trailingTokens += estimateMessageTokens(messages[i]);
        }
        return { tokens: usageTokens + trailingTokens, usageTokens, trailingTokens, lastUsageIndex: usageInfo.index };
    }
    let tokens = 0;
    for (const message of messages)
        tokens += estimateMessageTokens(message);
    return { tokens, usageTokens: 0, trailingTokens: tokens, lastUsageIndex: null };
}
function isMessageArray(value) {
    return Array.isArray(value);
}
function estimateContextTokens(context) {
    if (isMessageArray(context))
        return estimateMessages(context);
    const estimate = estimateMessages(context.messages);
    if (estimate.lastUsageIndex !== null)
        return estimate;
    let prefixTokens = context.systemPrompt ? estimateTextTokens(context.systemPrompt) : 0;
    if (context.tools && context.tools.length > 0) {
        prefixTokens += estimateTextTokens(safeJsonStringify(context.tools));
    }
    return {
        tokens: estimate.tokens + prefixTokens,
        usageTokens: estimate.usageTokens,
        trailingTokens: estimate.trailingTokens + prefixTokens,
        lastUsageIndex: estimate.lastUsageIndex,
    };
}
//# sourceMappingURL=estimate.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.80.6_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/api/simple-options.js

const CONTEXT_SAFETY_TOKENS = 4096;
const MIN_MAX_TOKENS = 1;
function clampMaxTokensToContext(model, context, maxTokens) {
    if (model.contextWindow <= 0)
        return Math.max(MIN_MAX_TOKENS, maxTokens);
    const available = model.contextWindow - estimateContextTokens(context).tokens - CONTEXT_SAFETY_TOKENS;
    return Math.min(maxTokens, Math.max(MIN_MAX_TOKENS, available));
}
function buildBaseOptions(model, context, options, apiKey) {
    return {
        temperature: options?.temperature,
        maxTokens: clampMaxTokensToContext(model, context, options?.maxTokens ?? model.maxTokens),
        signal: options?.signal,
        apiKey: apiKey || options?.apiKey,
        transport: options?.transport,
        cacheRetention: options?.cacheRetention,
        sessionId: options?.sessionId,
        headers: options?.headers,
        onPayload: options?.onPayload,
        onResponse: options?.onResponse,
        timeoutMs: options?.timeoutMs,
        websocketConnectTimeoutMs: options?.websocketConnectTimeoutMs,
        maxRetries: options?.maxRetries,
        maxRetryDelayMs: options?.maxRetryDelayMs,
        metadata: options?.metadata,
        env: options?.env,
    };
}
function clampReasoning(effort) {
    return effort === "xhigh" || effort === "max" ? "high" : effort;
}
function adjustMaxTokensForThinking(
// Undefined means no explicit caller cap. Use the model cap and fit thinking inside it.
baseMaxTokens, modelMaxTokens, reasoningLevel, customBudgets) {
    const defaultBudgets = {
        minimal: 1024,
        low: 2048,
        medium: 8192,
        high: 16384,
    };
    const budgets = { ...defaultBudgets, ...customBudgets };
    const minOutputTokens = 1024;
    const level = clampReasoning(reasoningLevel);
    let thinkingBudget = budgets[level];
    const maxTokens = baseMaxTokens === undefined ? modelMaxTokens : Math.min(baseMaxTokens + thinkingBudget, modelMaxTokens);
    if (maxTokens <= thinkingBudget) {
        thinkingBudget = Math.max(0, maxTokens - minOutputTokens);
    }
    return { maxTokens, thinkingBudget };
}
//# sourceMappingURL=simple-options.js.map

/***/ }),

/***/ 88400:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   b: () => (/* binding */ transformMessages)
/* harmony export */ });
const NON_VISION_USER_IMAGE_PLACEHOLDER = "(image omitted: model does not support images)";
const NON_VISION_TOOL_IMAGE_PLACEHOLDER = "(tool image omitted: model does not support images)";
function replaceImagesWithPlaceholder(content, placeholder) {
    const result = [];
    let previousWasPlaceholder = false;
    for (const block of content) {
        if (block.type === "image") {
            if (!previousWasPlaceholder) {
                result.push({ type: "text", text: placeholder });
            }
            previousWasPlaceholder = true;
            continue;
        }
        result.push(block);
        previousWasPlaceholder = block.text === placeholder;
    }
    return result;
}
function downgradeUnsupportedImages(messages, model) {
    if (model.input.includes("image")) {
        return messages;
    }
    return messages.map((msg) => {
        if (msg.role === "user" && Array.isArray(msg.content)) {
            return {
                ...msg,
                content: replaceImagesWithPlaceholder(msg.content, NON_VISION_USER_IMAGE_PLACEHOLDER),
            };
        }
        if (msg.role === "toolResult") {
            return {
                ...msg,
                content: replaceImagesWithPlaceholder(msg.content, NON_VISION_TOOL_IMAGE_PLACEHOLDER),
            };
        }
        return msg;
    });
}
/**
 * Normalize tool call ID for cross-provider compatibility.
 * OpenAI Responses API generates IDs that are 450+ chars with special characters like `|`.
 * Anthropic APIs require IDs matching ^[a-zA-Z0-9_-]+$ (max 64 chars).
 */
function transformMessages(messages, model, normalizeToolCallId) {
    // Build a map of original tool call IDs to normalized IDs
    const toolCallIdMap = new Map();
    // Normalize null/undefined content from untyped callers (custom tools, hand-built
    // histories, old session files) so downstream code can rely on the type contract.
    const normalizedMessages = messages.map((msg) => (msg.content == null ? { ...msg, content: [] } : msg));
    const imageAwareMessages = downgradeUnsupportedImages(normalizedMessages, model);
    // First pass: transform messages (unsupported image downgrade, thinking blocks, tool call ID normalization)
    const transformed = imageAwareMessages.map((msg) => {
        // User messages pass through unchanged
        if (msg.role === "user") {
            return msg;
        }
        // Handle toolResult messages - normalize toolCallId if we have a mapping
        if (msg.role === "toolResult") {
            const normalizedId = toolCallIdMap.get(msg.toolCallId);
            if (normalizedId && normalizedId !== msg.toolCallId) {
                return { ...msg, toolCallId: normalizedId };
            }
            return msg;
        }
        // Assistant messages need transformation check
        if (msg.role === "assistant") {
            const assistantMsg = msg;
            const isSameModel = assistantMsg.provider === model.provider &&
                assistantMsg.api === model.api &&
                assistantMsg.model === model.id;
            const transformedContent = assistantMsg.content.flatMap((block) => {
                if (block.type === "thinking") {
                    // Redacted thinking is opaque encrypted content, only valid for the same model.
                    // Drop it for cross-model to avoid API errors.
                    if (block.redacted) {
                        return isSameModel ? block : [];
                    }
                    // For same model: keep thinking blocks with signatures (needed for replay)
                    // even if the thinking text is empty (OpenAI encrypted reasoning)
                    if (isSameModel && block.thinkingSignature)
                        return block;
                    // Skip empty thinking blocks, convert others to plain text
                    if (!block.thinking || block.thinking.trim() === "")
                        return [];
                    if (isSameModel)
                        return block;
                    return {
                        type: "text",
                        text: block.thinking,
                    };
                }
                if (block.type === "text") {
                    if (isSameModel)
                        return block;
                    return {
                        type: "text",
                        text: block.text,
                    };
                }
                if (block.type === "toolCall") {
                    const toolCall = block;
                    let normalizedToolCall = toolCall;
                    if (!isSameModel && toolCall.thoughtSignature) {
                        normalizedToolCall = { ...toolCall };
                        delete normalizedToolCall.thoughtSignature;
                    }
                    if (!isSameModel && normalizeToolCallId) {
                        const normalizedId = normalizeToolCallId(toolCall.id, model, assistantMsg);
                        if (normalizedId !== toolCall.id) {
                            toolCallIdMap.set(toolCall.id, normalizedId);
                            normalizedToolCall = { ...normalizedToolCall, id: normalizedId };
                        }
                    }
                    return normalizedToolCall;
                }
                return block;
            });
            return {
                ...assistantMsg,
                content: transformedContent,
            };
        }
        return msg;
    });
    // Second pass: insert synthetic empty tool results for orphaned tool calls
    // This preserves thinking signatures and satisfies API requirements
    const result = [];
    let pendingToolCalls = [];
    let existingToolResultIds = new Set();
    const insertSyntheticToolResults = () => {
        if (pendingToolCalls.length > 0) {
            for (const tc of pendingToolCalls) {
                if (!existingToolResultIds.has(tc.id)) {
                    result.push({
                        role: "toolResult",
                        toolCallId: tc.id,
                        toolName: tc.name,
                        content: [{ type: "text", text: "No result provided" }],
                        isError: true,
                        timestamp: Date.now(),
                    });
                }
            }
            pendingToolCalls = [];
            existingToolResultIds = new Set();
        }
    };
    for (let i = 0; i < transformed.length; i++) {
        const msg = transformed[i];
        if (msg.role === "assistant") {
            // If we have pending orphaned tool calls from a previous assistant, insert synthetic results now
            insertSyntheticToolResults();
            // Skip errored/aborted assistant messages entirely.
            // These are incomplete turns that shouldn't be replayed:
            // - May have partial content (reasoning without message, incomplete tool calls)
            // - Replaying them can cause API errors (e.g., OpenAI "reasoning without following item")
            // - The model should retry from the last valid state
            const assistantMsg = msg;
            if (assistantMsg.stopReason === "error" || assistantMsg.stopReason === "aborted") {
                continue;
            }
            // Track tool calls from this assistant message
            const toolCalls = assistantMsg.content.filter((b) => b.type === "toolCall");
            if (toolCalls.length > 0) {
                pendingToolCalls = toolCalls;
                existingToolResultIds = new Set();
            }
            result.push(msg);
        }
        else if (msg.role === "toolResult") {
            existingToolResultIds.add(msg.toolCallId);
            result.push(msg);
        }
        else if (msg.role === "user") {
            // User message interrupts tool flow - insert synthetic results for orphaned calls
            insertSyntheticToolResults();
            result.push(msg);
        }
        else {
            result.push(msg);
        }
    }
    // If the conversation ends with unresolved tool calls, synthesize results now.
    insertSyntheticToolResults();
    return result;
}
//# sourceMappingURL=transform-messages.js.map

/***/ })

};
