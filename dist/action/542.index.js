export const id = 542;
export const ids = [542];
export const modules = {

/***/ 80524:
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

/***/ 13551:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   KB: () => (/* binding */ processResponsesStream),
/* harmony export */   hX: () => (/* binding */ convertResponsesTools),
/* harmony export */   iq: () => (/* binding */ convertResponsesMessages)
/* harmony export */ });
/* harmony import */ var _models_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(63068);
/* harmony import */ var _utils_hash_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(64919);
/* harmony import */ var _utils_json_parse_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(11043);
/* harmony import */ var _utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(49986);
/* harmony import */ var _transform_messages_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(1901);





// =============================================================================
// Utilities
// =============================================================================
function encodeTextSignatureV1(id, phase) {
    const payload = { v: 1, id };
    if (phase)
        payload.phase = phase;
    return JSON.stringify(payload);
}
function parseTextSignature(signature) {
    if (!signature)
        return undefined;
    if (signature.startsWith("{")) {
        try {
            const parsed = JSON.parse(signature);
            if (parsed.v === 1 && typeof parsed.id === "string") {
                if (parsed.phase === "commentary" || parsed.phase === "final_answer") {
                    return { id: parsed.id, phase: parsed.phase };
                }
                return { id: parsed.id };
            }
        }
        catch {
            // Fall through to legacy plain-string handling.
        }
    }
    return { id: signature };
}
// =============================================================================
// Message conversion
// =============================================================================
function convertResponsesMessages(model, context, allowedToolCallProviders, options) {
    const messages = [];
    const normalizeIdPart = (part) => {
        const sanitized = part.replace(/[^a-zA-Z0-9_-]/g, "_");
        const normalized = sanitized.length > 64 ? sanitized.slice(0, 64) : sanitized;
        return normalized.replace(/_+$/, "");
    };
    const buildForeignResponsesItemId = (itemId) => {
        const normalized = `fc_${(0,_utils_hash_js__WEBPACK_IMPORTED_MODULE_2__/* .shortHash */ .B)(itemId)}`;
        return normalized.length > 64 ? normalized.slice(0, 64) : normalized;
    };
    const normalizeToolCallId = (id, _targetModel, source) => {
        if (!allowedToolCallProviders.has(model.provider))
            return normalizeIdPart(id);
        if (!id.includes("|"))
            return normalizeIdPart(id);
        const [callId, itemId] = id.split("|");
        const normalizedCallId = normalizeIdPart(callId);
        const isForeignToolCall = source.provider !== model.provider || source.api !== model.api;
        let normalizedItemId = isForeignToolCall ? buildForeignResponsesItemId(itemId) : normalizeIdPart(itemId);
        // OpenAI Responses API requires item id to start with "fc"
        if (!normalizedItemId.startsWith("fc_")) {
            normalizedItemId = normalizeIdPart(`fc_${normalizedItemId}`);
        }
        return `${normalizedCallId}|${normalizedItemId}`;
    };
    const transformedMessages = (0,_transform_messages_js__WEBPACK_IMPORTED_MODULE_3__/* .transformMessages */ .b)(context.messages, model, normalizeToolCallId);
    const includeSystemPrompt = options?.includeSystemPrompt ?? true;
    if (includeSystemPrompt && context.systemPrompt) {
        const role = model.reasoning ? "developer" : "system";
        messages.push({
            role,
            content: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_4__/* .sanitizeSurrogates */ .J)(context.systemPrompt),
        });
    }
    let msgIndex = 0;
    for (const msg of transformedMessages) {
        if (msg.role === "user") {
            if (typeof msg.content === "string") {
                messages.push({
                    role: "user",
                    content: [{ type: "input_text", text: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_4__/* .sanitizeSurrogates */ .J)(msg.content) }],
                });
            }
            else {
                const content = msg.content.map((item) => {
                    if (item.type === "text") {
                        return {
                            type: "input_text",
                            text: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_4__/* .sanitizeSurrogates */ .J)(item.text),
                        };
                    }
                    return {
                        type: "input_image",
                        detail: "auto",
                        image_url: `data:${item.mimeType};base64,${item.data}`,
                    };
                });
                if (content.length === 0)
                    continue;
                messages.push({
                    role: "user",
                    content,
                });
            }
        }
        else if (msg.role === "assistant") {
            const output = [];
            const assistantMsg = msg;
            const isDifferentModel = assistantMsg.model !== model.id &&
                assistantMsg.provider === model.provider &&
                assistantMsg.api === model.api;
            let textBlockIndex = 0;
            for (const block of msg.content) {
                if (block.type === "thinking") {
                    if (block.thinkingSignature) {
                        const reasoningItem = JSON.parse(block.thinkingSignature);
                        output.push(reasoningItem);
                    }
                }
                else if (block.type === "text") {
                    const textBlock = block;
                    const parsedSignature = parseTextSignature(textBlock.textSignature);
                    const fallbackMessageId = textBlockIndex === 0 ? `msg_pi_${msgIndex}` : `msg_pi_${msgIndex}_${textBlockIndex}`;
                    textBlockIndex++;
                    // OpenAI requires id to be max 64 characters
                    let msgId = parsedSignature?.id;
                    if (!msgId) {
                        msgId = fallbackMessageId;
                    }
                    else if (msgId.length > 64) {
                        msgId = `msg_${(0,_utils_hash_js__WEBPACK_IMPORTED_MODULE_2__/* .shortHash */ .B)(msgId)}`;
                    }
                    output.push({
                        type: "message",
                        role: "assistant",
                        content: [{ type: "output_text", text: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_4__/* .sanitizeSurrogates */ .J)(textBlock.text), annotations: [] }],
                        status: "completed",
                        id: msgId,
                        phase: parsedSignature?.phase,
                    });
                }
                else if (block.type === "toolCall") {
                    const toolCall = block;
                    const [callId, itemIdRaw] = toolCall.id.split("|");
                    let itemId = itemIdRaw;
                    // For different-model messages, set id to undefined to avoid pairing validation.
                    // OpenAI tracks which fc_xxx IDs were paired with rs_xxx reasoning items.
                    // By omitting the id, we avoid triggering that validation (like cross-provider does).
                    if (isDifferentModel && itemId?.startsWith("fc_")) {
                        itemId = undefined;
                    }
                    output.push({
                        type: "function_call",
                        id: itemId,
                        call_id: callId,
                        name: toolCall.name,
                        arguments: JSON.stringify(toolCall.arguments),
                    });
                }
            }
            if (output.length === 0)
                continue;
            messages.push(...output);
        }
        else if (msg.role === "toolResult") {
            const textResult = msg.content
                .filter((c) => c.type === "text")
                .map((c) => c.text)
                .join("\n");
            const hasImages = msg.content.some((c) => c.type === "image");
            const hasText = textResult.length > 0;
            const [callId] = msg.toolCallId.split("|");
            let output;
            if (hasImages && model.input.includes("image")) {
                const contentParts = [];
                if (hasText) {
                    contentParts.push({
                        type: "input_text",
                        text: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_4__/* .sanitizeSurrogates */ .J)(textResult),
                    });
                }
                for (const block of msg.content) {
                    if (block.type === "image") {
                        contentParts.push({
                            type: "input_image",
                            detail: "auto",
                            image_url: `data:${block.mimeType};base64,${block.data}`,
                        });
                    }
                }
                output = contentParts;
            }
            else {
                output = (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_4__/* .sanitizeSurrogates */ .J)(hasText ? textResult : "(see attached image)");
            }
            messages.push({
                type: "function_call_output",
                call_id: callId,
                output,
            });
        }
        msgIndex++;
    }
    return messages;
}
// =============================================================================
// Tool conversion
// =============================================================================
function convertResponsesTools(tools, options) {
    const strict = options?.strict === undefined ? false : options.strict;
    return tools.map((tool) => ({
        type: "function",
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters, // TypeBox already generates JSON Schema
        strict,
    }));
}
// =============================================================================
// Stream processing
// =============================================================================
async function processResponsesStream(openaiStream, output, stream, model, options) {
    let currentItem = null;
    let currentBlock = null;
    const blocks = output.content;
    const blockIndex = () => blocks.length - 1;
    for await (const event of openaiStream) {
        if (event.type === "response.created") {
            output.responseId = event.response.id;
        }
        else if (event.type === "response.output_item.added") {
            const item = event.item;
            if (item.type === "reasoning") {
                currentItem = item;
                currentBlock = { type: "thinking", thinking: "" };
                output.content.push(currentBlock);
                stream.push({ type: "thinking_start", contentIndex: blockIndex(), partial: output });
            }
            else if (item.type === "message") {
                currentItem = item;
                currentBlock = { type: "text", text: "" };
                output.content.push(currentBlock);
                stream.push({ type: "text_start", contentIndex: blockIndex(), partial: output });
            }
            else if (item.type === "function_call") {
                currentItem = item;
                currentBlock = {
                    type: "toolCall",
                    id: `${item.call_id}|${item.id}`,
                    name: item.name,
                    arguments: {},
                    partialJson: item.arguments || "",
                };
                output.content.push(currentBlock);
                stream.push({ type: "toolcall_start", contentIndex: blockIndex(), partial: output });
            }
        }
        else if (event.type === "response.reasoning_summary_part.added") {
            if (currentItem && currentItem.type === "reasoning") {
                currentItem.summary = currentItem.summary || [];
                currentItem.summary.push(event.part);
            }
        }
        else if (event.type === "response.reasoning_summary_text.delta") {
            if (currentItem?.type === "reasoning" && currentBlock?.type === "thinking") {
                currentItem.summary = currentItem.summary || [];
                const lastPart = currentItem.summary[currentItem.summary.length - 1];
                if (lastPart) {
                    currentBlock.thinking += event.delta;
                    lastPart.text += event.delta;
                    stream.push({
                        type: "thinking_delta",
                        contentIndex: blockIndex(),
                        delta: event.delta,
                        partial: output,
                    });
                }
            }
        }
        else if (event.type === "response.reasoning_summary_part.done") {
            if (currentItem?.type === "reasoning" && currentBlock?.type === "thinking") {
                currentItem.summary = currentItem.summary || [];
                const lastPart = currentItem.summary[currentItem.summary.length - 1];
                if (lastPart) {
                    currentBlock.thinking += "\n\n";
                    lastPart.text += "\n\n";
                    stream.push({
                        type: "thinking_delta",
                        contentIndex: blockIndex(),
                        delta: "\n\n",
                        partial: output,
                    });
                }
            }
        }
        else if (event.type === "response.reasoning_text.delta") {
            if (currentItem?.type === "reasoning" && currentBlock?.type === "thinking") {
                currentBlock.thinking += event.delta;
                stream.push({
                    type: "thinking_delta",
                    contentIndex: blockIndex(),
                    delta: event.delta,
                    partial: output,
                });
            }
        }
        else if (event.type === "response.content_part.added") {
            if (currentItem?.type === "message") {
                currentItem.content = currentItem.content || [];
                // Filter out ReasoningText, only accept output_text and refusal
                if (event.part.type === "output_text" || event.part.type === "refusal") {
                    currentItem.content.push(event.part);
                }
            }
        }
        else if (event.type === "response.output_text.delta") {
            if (currentItem?.type === "message" && currentBlock?.type === "text") {
                if (!currentItem.content || currentItem.content.length === 0) {
                    continue;
                }
                const lastPart = currentItem.content[currentItem.content.length - 1];
                if (lastPart?.type === "output_text") {
                    currentBlock.text += event.delta;
                    lastPart.text += event.delta;
                    stream.push({
                        type: "text_delta",
                        contentIndex: blockIndex(),
                        delta: event.delta,
                        partial: output,
                    });
                }
            }
        }
        else if (event.type === "response.refusal.delta") {
            if (currentItem?.type === "message" && currentBlock?.type === "text") {
                if (!currentItem.content || currentItem.content.length === 0) {
                    continue;
                }
                const lastPart = currentItem.content[currentItem.content.length - 1];
                if (lastPart?.type === "refusal") {
                    currentBlock.text += event.delta;
                    lastPart.refusal += event.delta;
                    stream.push({
                        type: "text_delta",
                        contentIndex: blockIndex(),
                        delta: event.delta,
                        partial: output,
                    });
                }
            }
        }
        else if (event.type === "response.function_call_arguments.delta") {
            if (currentItem?.type === "function_call" && currentBlock?.type === "toolCall") {
                currentBlock.partialJson += event.delta;
                currentBlock.arguments = (0,_utils_json_parse_js__WEBPACK_IMPORTED_MODULE_1__/* .parseStreamingJson */ .o2)(currentBlock.partialJson);
                stream.push({
                    type: "toolcall_delta",
                    contentIndex: blockIndex(),
                    delta: event.delta,
                    partial: output,
                });
            }
        }
        else if (event.type === "response.function_call_arguments.done") {
            if (currentItem?.type === "function_call" && currentBlock?.type === "toolCall") {
                const previousPartialJson = currentBlock.partialJson;
                currentBlock.partialJson = event.arguments;
                currentBlock.arguments = (0,_utils_json_parse_js__WEBPACK_IMPORTED_MODULE_1__/* .parseStreamingJson */ .o2)(currentBlock.partialJson);
                if (event.arguments.startsWith(previousPartialJson)) {
                    const delta = event.arguments.slice(previousPartialJson.length);
                    if (delta.length > 0) {
                        stream.push({
                            type: "toolcall_delta",
                            contentIndex: blockIndex(),
                            delta,
                            partial: output,
                        });
                    }
                }
            }
        }
        else if (event.type === "response.output_item.done") {
            const item = event.item;
            if (item.type === "reasoning" && currentBlock?.type === "thinking") {
                const summaryText = item.summary?.map((s) => s.text).join("\n\n") || "";
                const contentText = item.content?.map((c) => c.text).join("\n\n") || "";
                currentBlock.thinking = summaryText || contentText || currentBlock.thinking;
                currentBlock.thinkingSignature = JSON.stringify(item);
                stream.push({
                    type: "thinking_end",
                    contentIndex: blockIndex(),
                    content: currentBlock.thinking,
                    partial: output,
                });
                currentBlock = null;
            }
            else if (item.type === "message" && currentBlock?.type === "text") {
                currentBlock.text = item.content.map((c) => (c.type === "output_text" ? c.text : c.refusal)).join("");
                currentBlock.textSignature = encodeTextSignatureV1(item.id, item.phase ?? undefined);
                stream.push({
                    type: "text_end",
                    contentIndex: blockIndex(),
                    content: currentBlock.text,
                    partial: output,
                });
                currentBlock = null;
            }
            else if (item.type === "function_call") {
                const args = currentBlock?.type === "toolCall" && currentBlock.partialJson
                    ? (0,_utils_json_parse_js__WEBPACK_IMPORTED_MODULE_1__/* .parseStreamingJson */ .o2)(currentBlock.partialJson)
                    : (0,_utils_json_parse_js__WEBPACK_IMPORTED_MODULE_1__/* .parseStreamingJson */ .o2)(item.arguments || "{}");
                let toolCall;
                if (currentBlock?.type === "toolCall") {
                    // Finalize in-place and strip the scratch buffer so replay only
                    // carries parsed arguments.
                    currentBlock.arguments = args;
                    delete currentBlock.partialJson;
                    toolCall = currentBlock;
                }
                else {
                    toolCall = {
                        type: "toolCall",
                        id: `${item.call_id}|${item.id}`,
                        name: item.name,
                        arguments: args,
                    };
                }
                currentBlock = null;
                stream.push({ type: "toolcall_end", contentIndex: blockIndex(), toolCall, partial: output });
            }
        }
        else if (event.type === "response.completed") {
            const response = event.response;
            if (response?.id) {
                output.responseId = response.id;
            }
            if (response?.usage) {
                const cachedTokens = response.usage.input_tokens_details?.cached_tokens || 0;
                output.usage = {
                    // OpenAI includes cached tokens in input_tokens, so subtract to get non-cached input
                    input: (response.usage.input_tokens || 0) - cachedTokens,
                    output: response.usage.output_tokens || 0,
                    cacheRead: cachedTokens,
                    cacheWrite: 0,
                    totalTokens: response.usage.total_tokens || 0,
                    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
                };
            }
            (0,_models_js__WEBPACK_IMPORTED_MODULE_0__/* .calculateCost */ .yN)(model, output.usage);
            if (options?.applyServiceTierPricing) {
                const serviceTier = options.resolveServiceTier
                    ? options.resolveServiceTier(response?.service_tier, options.serviceTier)
                    : (response?.service_tier ?? options.serviceTier);
                options.applyServiceTierPricing(output.usage, serviceTier);
            }
            // Map status to stop reason
            output.stopReason = mapStopReason(response?.status);
            if (output.content.some((b) => b.type === "toolCall") && output.stopReason === "stop") {
                output.stopReason = "toolUse";
            }
        }
        else if (event.type === "error") {
            throw new Error(`Error Code ${event.code}: ${event.message}` || "Unknown error");
        }
        else if (event.type === "response.failed") {
            const error = event.response?.error;
            const details = event.response?.incomplete_details;
            const msg = error
                ? `${error.code || "unknown"}: ${error.message || "no message"}`
                : details?.reason
                    ? `incomplete: ${details.reason}`
                    : "Unknown error (no error details in response)";
            throw new Error(msg);
        }
    }
}
function mapStopReason(status) {
    if (!status)
        return "stop";
    switch (status) {
        case "completed":
            return "stop";
        case "incomplete":
            return "length";
        case "failed":
        case "cancelled":
            return "error";
        // These two are wonky ...
        case "in_progress":
        case "queued":
            return "stop";
        default: {
            const _exhaustive = status;
            throw new Error(`Unhandled stop reason: ${_exhaustive}`);
        }
    }
}
//# sourceMappingURL=openai-responses-shared.js.map

/***/ }),

/***/ 78379:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   M7: () => (/* binding */ clampReasoning),
/* harmony export */   QP: () => (/* binding */ buildBaseOptions),
/* harmony export */   xw: () => (/* binding */ adjustMaxTokensForThinking)
/* harmony export */ });
function buildBaseOptions(_model, options, apiKey) {
    return {
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
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
    };
}
function clampReasoning(effort) {
    return effort === "xhigh" ? "high" : effort;
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

/***/ 1901:
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
    const imageAwareMessages = downgradeUnsupportedImages(messages, model);
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

/***/ }),

/***/ 64919:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   B: () => (/* binding */ shortHash)
/* harmony export */ });
/** Fast deterministic hash to shorten long strings */
function shortHash(str) {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
}
//# sourceMappingURL=hash.js.map

/***/ })

};
