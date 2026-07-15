export const id = 405;
export const ids = [405];
export const modules = {

/***/ 48405:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   generateImages: () => (/* binding */ generateImages)
/* harmony export */ });
/* harmony import */ var openai__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(56722);
/* harmony import */ var _utils_error_body_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(35225);
/* harmony import */ var _utils_headers_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(35000);
/* harmony import */ var _utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(4001);




const generateImages = async (model, context, options) => {
    const output = {
        api: model.api,
        provider: model.provider,
        model: model.id,
        output: [],
        stopReason: "stop",
        timestamp: Date.now(),
    };
    try {
        const apiKey = options?.apiKey;
        if (!apiKey) {
            throw new Error(`No API key for provider: ${model.provider}`);
        }
        const client = createClient(model, apiKey, options?.headers);
        let params = buildParams(model, context);
        const nextParams = await options?.onPayload?.(params, model);
        if (nextParams !== undefined) {
            params = nextParams;
        }
        const requestOptions = {
            ...(options?.signal ? { signal: options.signal } : {}),
            ...(options?.timeoutMs !== undefined ? { timeout: options.timeoutMs } : {}),
            maxRetries: options?.maxRetries ?? 0,
        };
        const { data: response, response: rawResponse } = await client.chat.completions
            .create(params, requestOptions)
            .withResponse();
        await options?.onResponse?.({ status: rawResponse.status, headers: (0,_utils_headers_js__WEBPACK_IMPORTED_MODULE_1__/* .headersToRecord */ .j)(rawResponse.headers) }, model);
        const imageResponse = response;
        output.responseId = imageResponse.id;
        if (imageResponse.usage) {
            output.usage = parseUsage(imageResponse.usage, model);
        }
        const choice = imageResponse.choices[0];
        if (choice) {
            const content = choice.message.content;
            if (typeof content === "string" && content.length > 0) {
                output.output.push({ type: "text", text: content });
            }
            for (const image of choice.message.images ?? []) {
                const imageUrl = typeof image.image_url === "string" ? image.image_url : image.image_url?.url;
                if (!imageUrl?.startsWith("data:"))
                    continue;
                const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
                if (!matches)
                    continue;
                output.output.push({
                    type: "image",
                    mimeType: matches[1],
                    data: matches[2],
                });
            }
        }
        return output;
    }
    catch (error) {
        output.stopReason = options?.signal?.aborted ? "aborted" : "error";
        output.errorMessage = (0,_utils_error_body_js__WEBPACK_IMPORTED_MODULE_2__/* .formatProviderError */ .lR)((0,_utils_error_body_js__WEBPACK_IMPORTED_MODULE_2__/* .normalizeProviderError */ .Jo)(error));
        return output;
    }
};
function createClient(model, apiKey, optionsHeaders) {
    return new openai__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay({
        apiKey,
        baseURL: model.baseUrl,
        dangerouslyAllowBrowser: true,
        defaultHeaders: (0,_utils_headers_js__WEBPACK_IMPORTED_MODULE_1__/* .providerHeadersToRecord */ .m)({ ...model.headers, ...optionsHeaders }),
    });
}
function buildParams(model, context) {
    const content = context.input.map((item) => {
        if (item.type === "text") {
            return {
                type: "text",
                text: (0,_utils_sanitize_unicode_js__WEBPACK_IMPORTED_MODULE_3__/* .sanitizeSurrogates */ .J)(item.text),
            };
        }
        return {
            type: "image_url",
            image_url: {
                url: `data:${item.mimeType};base64,${item.data}`,
            },
        };
    });
    return {
        model: model.id,
        messages: [
            {
                role: "user",
                content,
            },
        ],
        stream: false,
        modalities: model.output.includes("text") ? ["image", "text"] : ["image"],
    };
}
function parseUsage(rawUsage, model) {
    const promptTokens = rawUsage.prompt_tokens || 0;
    const reportedCachedTokens = rawUsage.prompt_tokens_details?.cached_tokens || 0;
    const cacheWriteTokens = rawUsage.prompt_tokens_details?.cache_write_tokens || 0;
    const cacheReadTokens = cacheWriteTokens > 0 ? Math.max(0, reportedCachedTokens - cacheWriteTokens) : reportedCachedTokens;
    const input = Math.max(0, promptTokens - cacheReadTokens - cacheWriteTokens);
    const output = rawUsage.completion_tokens || 0;
    const usage = {
        input,
        output,
        cacheRead: cacheReadTokens,
        cacheWrite: cacheWriteTokens,
        totalTokens: input + output + cacheReadTokens + cacheWriteTokens,
        cost: {
            input: (model.cost.input / 1000000) * input,
            output: (model.cost.output / 1000000) * output,
            cacheRead: (model.cost.cacheRead / 1000000) * cacheReadTokens,
            cacheWrite: (model.cost.cacheWrite / 1000000) * cacheWriteTokens,
            total: 0,
        },
    };
    usage.cost.total = usage.cost.input + usage.cost.output + usage.cost.cacheRead + usage.cost.cacheWrite;
    return usage;
}
//# sourceMappingURL=openrouter-images.js.map

/***/ })

};
