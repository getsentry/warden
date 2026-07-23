export const id = 264;
export const ids = [264];
export const modules = {

/***/ 92297:
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

/***/ 39746:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   KB: () => (/* binding */ processResponsesStream),
/* harmony export */   hX: () => (/* binding */ convertResponsesTools),
/* harmony export */   iq: () => (/* binding */ convertResponsesMessages)
/* harmony export */ });
/* harmony import */ var _models_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(73470);
/* harmony import */ var _utils_hash_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(12466);
/* harmony import */ var _utils_json_parse_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(91814);
/* harmony import */ var _utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(80279);
/* harmony import */ var _transform_messages_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(99994);





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
    const loadedToolNames = new Set();
    const normalizeIdPart = (part) => {
        const sanitized = part.replace(/[^a-zA-Z0-9_-]/g, "_");
        const normalized = sanitized.length > 64 ? sanitized.slice(0, 64) : sanitized;
        return normalized.replace(/_+$/, "");
    };
    const buildForeignResponsesItemId = (itemId) => {
        const normalized = `fc_${(0,_utils_hash_js__WEBPACK_IMPORTED_MODULE_0__/* .shortHash */ .B)(itemId)}`;
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
    const transformedMessages = (0,_transform_messages_js__WEBPACK_IMPORTED_MODULE_1__/* .transformMessages */ .b)(context.messages, model, normalizeToolCallId);
    const includeSystemPrompt = options?.includeSystemPrompt ?? true;
    if (includeSystemPrompt && context.systemPrompt) {
        const compat = model.compat;
        const role = model.reasoning && compat?.supportsDeveloperRole !== false ? "developer" : "system";
        messages.push({
            role,
            content: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeSurrogates */ .J)(context.systemPrompt),
        });
    }
    let msgIndex = 0;
    for (const msg of transformedMessages) {
        if (msg.role === "user") {
            if (typeof msg.content === "string") {
                messages.push({
                    role: "user",
                    content: [{ type: "input_text", text: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeSurrogates */ .J)(msg.content) }],
                });
            }
            else {
                const content = msg.content.map((item) => {
                    if (item.type === "text") {
                        return {
                            type: "input_text",
                            text: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeSurrogates */ .J)(item.text),
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
                        msgId = `msg_${(0,_utils_hash_js__WEBPACK_IMPORTED_MODULE_0__/* .shortHash */ .B)(msgId)}`;
                    }
                    output.push({
                        type: "message",
                        role: "assistant",
                        content: [{ type: "output_text", text: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeSurrogates */ .J)(textBlock.text), annotations: [] }],
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
                        text: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeSurrogates */ .J)(textResult),
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
                output = (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeSurrogates */ .J)(hasText ? textResult : hasImages ? "(see attached image)" : "(no tool output)");
            }
            messages.push({
                type: "function_call_output",
                call_id: callId,
                output,
            });
            const deferredTools = [];
            for (const name of msg.addedToolNames ?? []) {
                const tool = options?.deferredTools?.get(name);
                if (!tool || loadedToolNames.has(name))
                    continue;
                loadedToolNames.add(name);
                deferredTools.push(tool);
            }
            if (deferredTools.length > 0) {
                const names = deferredTools.map((tool) => tool.name);
                const searchCallId = `pi_tool_load_${(0,_utils_hash_js__WEBPACK_IMPORTED_MODULE_0__/* .shortHash */ .B)(`${msg.toolCallId}:${names.join(",")}`)}`;
                messages.push({
                    type: "tool_search_call",
                    call_id: searchCallId,
                    execution: "client",
                    status: "completed",
                    arguments: { query: names.join(" "), limit: names.length },
                });
                messages.push({
                    type: "tool_search_output",
                    call_id: searchCallId,
                    execution: "client",
                    status: "completed",
                    tools: convertResponsesTools(deferredTools, { deferLoading: true }),
                });
            }
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
        ...(options?.deferLoading ? { defer_loading: true } : {}),
    }));
}
async function processResponsesStream(openaiStream, output, stream, model, options) {
    let sawTerminalResponseEvent = false;
    const outputSlots = new Map();
    const reasoningBlocksById = new Map();
    const getSlot = (outputIndex, type) => {
        const slot = outputSlots.get(outputIndex);
        return slot?.type === type ? slot : undefined;
    };
    const createSlot = (outputIndex, item) => {
        if (item.type === "reasoning") {
            const block = { type: "thinking", thinking: "" };
            output.content.push(block);
            const slot = {
                type: "thinking",
                block,
                contentIndex: output.content.length - 1,
            };
            outputSlots.set(outputIndex, slot);
            stream.push({ type: "thinking_start", contentIndex: slot.contentIndex, partial: output });
            return slot;
        }
        if (item.type === "message") {
            const block = { type: "text", text: "" };
            output.content.push(block);
            const slot = { type: "text", block, contentIndex: output.content.length - 1 };
            outputSlots.set(outputIndex, slot);
            stream.push({ type: "text_start", contentIndex: slot.contentIndex, partial: output });
            return slot;
        }
        if (item.type === "function_call") {
            const block = {
                type: "toolCall",
                id: `${item.call_id}|${item.id}`,
                name: item.name,
                arguments: {},
                partialJson: item.arguments || "",
            };
            output.content.push(block);
            const slot = {
                type: "toolCall",
                block,
                contentIndex: output.content.length - 1,
            };
            outputSlots.set(outputIndex, slot);
            stream.push({ type: "toolcall_start", contentIndex: slot.contentIndex, partial: output });
            return slot;
        }
        return undefined;
    };
    const getOrCreateSlot = (outputIndex, item) => {
        return outputSlots.get(outputIndex) ?? createSlot(outputIndex, item);
    };
    // Azure OpenAI can omit reasoning.encrypted_content from response.output_item.done
    // and provide it only in response.completed.response.output. Backfill the
    // persisted reasoning signature from the terminal response to keep store:false
    // multi-turn replay stateless. See https://github.com/earendil-works/pi/issues/6409.
    const backfillReasoningSignatures = (responseOutput) => {
        for (const item of responseOutput) {
            if (item.type !== "reasoning" || !item.encrypted_content)
                continue;
            const block = reasoningBlocksById.get(item.id);
            if (!block?.thinkingSignature)
                continue;
            const storedItem = JSON.parse(block.thinkingSignature);
            if (storedItem.encrypted_content)
                continue;
            block.thinkingSignature = JSON.stringify({
                ...storedItem,
                encrypted_content: item.encrypted_content,
            });
        }
    };
    const finalizeResponse = (response) => {
        sawTerminalResponseEvent = true;
        backfillReasoningSignatures(response.output ?? []);
        if (response?.id) {
            output.responseId = response.id;
        }
        if (response?.usage) {
            const inputDetails = response.usage.input_tokens_details;
            const cachedTokens = inputDetails?.cached_tokens || 0;
            const cacheWriteTokens = inputDetails?.cache_write_tokens || 0;
            output.usage = {
                // OpenAI includes cached and cache-write tokens in input_tokens, so subtract both.
                input: Math.max(0, (response.usage.input_tokens || 0) - cachedTokens - cacheWriteTokens),
                output: response.usage.output_tokens || 0,
                cacheRead: cachedTokens,
                cacheWrite: cacheWriteTokens,
                reasoning: response.usage.output_tokens_details?.reasoning_tokens || 0,
                totalTokens: response.usage.total_tokens || 0,
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
            };
        }
        (0,_models_js__WEBPACK_IMPORTED_MODULE_3__/* .calculateCost */ .yN)(model, output.usage);
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
    };
    for await (const event of openaiStream) {
        if (event.type === "response.created") {
            output.responseId = event.response.id;
        }
        else if (event.type === "response.output_item.added") {
            createSlot(event.output_index, event.item);
        }
        else if (event.type === "response.reasoning_summary_text.delta") {
            const slot = getSlot(event.output_index, "thinking");
            if (!slot)
                continue;
            slot.block.thinking += event.delta;
            stream.push({
                type: "thinking_delta",
                contentIndex: slot.contentIndex,
                delta: event.delta,
                partial: output,
            });
        }
        else if (event.type === "response.reasoning_summary_part.done") {
            const slot = getSlot(event.output_index, "thinking");
            if (!slot)
                continue;
            slot.block.thinking += "\n\n";
            stream.push({
                type: "thinking_delta",
                contentIndex: slot.contentIndex,
                delta: "\n\n",
                partial: output,
            });
        }
        else if (event.type === "response.reasoning_text.delta") {
            const slot = getSlot(event.output_index, "thinking");
            if (!slot)
                continue;
            slot.block.thinking += event.delta;
            stream.push({
                type: "thinking_delta",
                contentIndex: slot.contentIndex,
                delta: event.delta,
                partial: output,
            });
        }
        else if (event.type === "response.output_text.delta") {
            const slot = getSlot(event.output_index, "text");
            if (!slot)
                continue;
            slot.block.text += event.delta;
            stream.push({
                type: "text_delta",
                contentIndex: slot.contentIndex,
                delta: event.delta,
                partial: output,
            });
        }
        else if (event.type === "response.refusal.delta") {
            const slot = getSlot(event.output_index, "text");
            if (!slot)
                continue;
            slot.block.text += event.delta;
            stream.push({
                type: "text_delta",
                contentIndex: slot.contentIndex,
                delta: event.delta,
                partial: output,
            });
        }
        else if (event.type === "response.function_call_arguments.delta") {
            const slot = getSlot(event.output_index, "toolCall");
            if (!slot)
                continue;
            slot.block.partialJson += event.delta;
            slot.block.arguments = (0,_utils_json_parse_js__WEBPACK_IMPORTED_MODULE_4__/* .parseStreamingJson */ .o2)(slot.block.partialJson);
            stream.push({
                type: "toolcall_delta",
                contentIndex: slot.contentIndex,
                delta: event.delta,
                partial: output,
            });
        }
        else if (event.type === "response.function_call_arguments.done") {
            const slot = getSlot(event.output_index, "toolCall");
            if (!slot)
                continue;
            const previousPartialJson = slot.block.partialJson;
            slot.block.partialJson = event.arguments;
            slot.block.arguments = (0,_utils_json_parse_js__WEBPACK_IMPORTED_MODULE_4__/* .parseStreamingJson */ .o2)(slot.block.partialJson);
            if (event.arguments.startsWith(previousPartialJson)) {
                const delta = event.arguments.slice(previousPartialJson.length);
                if (delta.length > 0) {
                    stream.push({
                        type: "toolcall_delta",
                        contentIndex: slot.contentIndex,
                        delta,
                        partial: output,
                    });
                }
            }
        }
        else if (event.type === "response.output_item.done") {
            const item = event.item;
            const slot = getOrCreateSlot(event.output_index, item);
            if (item.type === "reasoning" && slot?.type === "thinking") {
                const summaryText = item.summary?.map((s) => s.text).join("\n\n") || "";
                const contentText = item.content?.map((c) => c.text).join("\n\n") || "";
                slot.block.thinking = summaryText || contentText || slot.block.thinking;
                slot.block.thinkingSignature = JSON.stringify(item);
                reasoningBlocksById.set(item.id, slot.block);
                stream.push({
                    type: "thinking_end",
                    contentIndex: slot.contentIndex,
                    content: slot.block.thinking,
                    partial: output,
                });
                outputSlots.delete(event.output_index);
            }
            else if (item.type === "message" && slot?.type === "text") {
                slot.block.text = item.content?.map((c) => (c.type === "output_text" ? c.text : c.refusal)).join("") || "";
                slot.block.textSignature = encodeTextSignatureV1(item.id, item.phase ?? undefined);
                stream.push({
                    type: "text_end",
                    contentIndex: slot.contentIndex,
                    content: slot.block.text,
                    partial: output,
                });
                outputSlots.delete(event.output_index);
            }
            else if (item.type === "function_call" && slot?.type === "toolCall") {
                slot.block.arguments = (0,_utils_json_parse_js__WEBPACK_IMPORTED_MODULE_4__/* .parseStreamingJson */ .o2)(item.arguments || slot.block.partialJson || "{}");
                // Finalize in-place and strip the scratch buffer so replay only
                // carries parsed arguments.
                delete slot.block.partialJson;
                stream.push({
                    type: "toolcall_end",
                    contentIndex: slot.contentIndex,
                    toolCall: slot.block,
                    partial: output,
                });
                outputSlots.delete(event.output_index);
            }
        }
        else if (event.type === "response.completed" || event.type === "response.incomplete") {
            finalizeResponse(event.response);
        }
        else if (event.type === "error") {
            throw new Error(`Error Code ${event.code}: ${event.message}` || "Unknown error");
        }
        else if (event.type === "response.failed") {
            sawTerminalResponseEvent = true;
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
    if (!sawTerminalResponseEvent) {
        throw new Error("OpenAI Responses stream ended before a terminal response event");
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

/***/ 16417:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  xw: () => (/* binding */ adjustMaxTokensForThinking),
  QP: () => (/* binding */ buildBaseOptions),
  Yx: () => (/* binding */ clampMaxTokensToContext),
  M7: () => (/* binding */ clampReasoning)
});

;// CONCATENATED MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/utils/estimate.js
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
function estimateToolsTokens(tools) {
    if (!tools || tools.length === 0)
        return 0;
    return estimateTextTokens(safeJsonStringify(tools));
}
function isMessageArray(value) {
    return Array.isArray(value);
}
function estimateContextTokens(context) {
    if (isMessageArray(context))
        return estimateMessages(context);
    const estimate = estimateMessages(context.messages);
    if (estimate.lastUsageIndex !== null) {
        const addedNames = new Set(context.messages
            .slice(estimate.lastUsageIndex + 1)
            .filter((message) => message.role === "toolResult")
            .flatMap((message) => message.addedToolNames ?? []));
        const addedToolTokens = estimateToolsTokens(context.tools?.filter((tool) => addedNames.has(tool.name)));
        return {
            tokens: estimate.tokens + addedToolTokens,
            usageTokens: estimate.usageTokens,
            trailingTokens: estimate.trailingTokens + addedToolTokens,
            lastUsageIndex: estimate.lastUsageIndex,
        };
    }
    const prefixTokens = (context.systemPrompt ? estimateTextTokens(context.systemPrompt) : 0) + estimateToolsTokens(context.tools);
    return {
        tokens: estimate.tokens + prefixTokens,
        usageTokens: estimate.usageTokens,
        trailingTokens: estimate.trailingTokens + prefixTokens,
        lastUsageIndex: estimate.lastUsageIndex,
    };
}
//# sourceMappingURL=estimate.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/api/simple-options.js

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

/***/ 99994:
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

/***/ }),

/***/ 12466:
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
