export const id = 246;
export const ids = [246];
export const modules = {

/***/ 86027:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   X: () => (/* binding */ lazyApi),
/* harmony export */   n: () => (/* binding */ lazyStream)
/* harmony export */ });
/* harmony import */ var _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(14257);

function createSetupErrorMessage(model, error) {
    return {
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
        stopReason: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
    };
}
function hasResult(source) {
    return typeof source.result === "function";
}
async function forwardStream(target, source) {
    for await (const event of source) {
        target.push(event);
    }
    target.end(hasResult(source) ? await source.result() : undefined);
}
/**
 * Returns a stream synchronously while running async setup (auth resolution,
 * lazy module loading) behind it. Setup failures terminate the stream with an
 * error event.
 */
function lazyStream(model, setup) {
    const outer = new _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_0__/* .AssistantMessageEventStream */ .Q2();
    setup()
        .then((inner) => forwardStream(outer, inner))
        .catch((error) => {
        const message = createSetupErrorMessage(model, error);
        outer.push({ type: "error", reason: "error", error: message });
        outer.end(message);
    });
    return outer;
}
/**
 * Wraps a dynamically imported API implementation module as `ProviderStreams`.
 * The module loads on first stream call; the host's import cache deduplicates
 * loads. Load failures terminate the returned stream with an error event.
 */
function lazyApi(load) {
    return {
        stream: (model, context, options) => lazyStream(model, async () => (await load()).stream(model, context, options)),
        streamSimple: (model, context, options) => lazyStream(model, async () => (await load()).streamSimple(model, context, options)),
    };
}
//# sourceMappingURL=lazy.js.map

/***/ }),

/***/ 60246:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   openAICodexResponsesApi: () => (/* binding */ openAICodexResponsesApi)
/* harmony export */ });
/* harmony import */ var _lazy_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(86027);

const openAICodexResponsesApi = () => (0,_lazy_js__WEBPACK_IMPORTED_MODULE_0__/* .lazyApi */ .X)(() => Promise.all(/* import() */[__webpack_require__.e(601), __webpack_require__.e(264), __webpack_require__.e(31), __webpack_require__.e(848)]).then(__webpack_require__.bind(__webpack_require__, 64329)));
//# sourceMappingURL=openai-codex-responses.lazy.js.map

/***/ }),

/***/ 14257:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Q2: () => (/* binding */ AssistantMessageEventStream),
/* harmony export */   sM: () => (/* binding */ createAssistantMessageEventStream),
/* harmony export */   vC: () => (/* binding */ EventStream)
/* harmony export */ });
// Generic event stream class for async iteration
class EventStream {
    queue = [];
    waiting = [];
    done = false;
    finalResultPromise;
    resolveFinalResult;
    isComplete;
    extractResult;
    constructor(isComplete, extractResult) {
        this.isComplete = isComplete;
        this.extractResult = extractResult;
        this.finalResultPromise = new Promise((resolve) => {
            this.resolveFinalResult = resolve;
        });
    }
    push(event) {
        if (this.done)
            return;
        if (this.isComplete(event)) {
            this.done = true;
            this.resolveFinalResult(this.extractResult(event));
        }
        // Deliver to waiting consumer or queue it
        const waiter = this.waiting.shift();
        if (waiter) {
            waiter({ value: event, done: false });
        }
        else {
            this.queue.push(event);
        }
    }
    end(result) {
        this.done = true;
        if (result !== undefined) {
            this.resolveFinalResult(result);
        }
        // Notify all waiting consumers that we're done
        while (this.waiting.length > 0) {
            const waiter = this.waiting.shift();
            waiter({ value: undefined, done: true });
        }
    }
    async *[Symbol.asyncIterator]() {
        while (true) {
            if (this.queue.length > 0) {
                yield this.queue.shift();
            }
            else if (this.done) {
                return;
            }
            else {
                const result = await new Promise((resolve) => this.waiting.push(resolve));
                if (result.done)
                    return;
                yield result.value;
            }
        }
    }
    result() {
        return this.finalResultPromise;
    }
}
class AssistantMessageEventStream extends EventStream {
    constructor() {
        super((event) => event.type === "done" || event.type === "error", (event) => {
            if (event.type === "done") {
                return event.message;
            }
            else if (event.type === "error") {
                return event.error;
            }
            throw new Error("Unexpected event type for final result");
        });
    }
}
/** Factory function for AssistantMessageEventStream (for use in extensions) */
function createAssistantMessageEventStream() {
    return new AssistantMessageEventStream();
}
//# sourceMappingURL=event-stream.js.map

/***/ })

};
