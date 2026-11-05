export const id = 451;
export const ids = [451];
export const modules = {

/***/ 78932:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   X: () => (/* binding */ lazyApi),
/* harmony export */   n: () => (/* binding */ lazyStream)
/* harmony export */ });
/* harmony import */ var _utils_event_stream_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(45174);

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
function lazyApi(load, capabilities) {
    const api = {
        stream: (model, context, options) => lazyStream(model, async () => (await load()).stream(model, context, options)),
        streamSimple: (model, context, options) => lazyStream(model, async () => (await load()).streamSimple(model, context, options)),
    };
    if (capabilities?.fetchDeferred) {
        api.fetchDeferred = (model, handle, options) => lazyStream(model, async () => {
            const implementation = await load();
            if (!implementation.fetchDeferred)
                throw new Error("API does not support deferred responses");
            return implementation.fetchDeferred(model, handle, options);
        });
    }
    if (capabilities?.cancelDeferred) {
        api.cancelDeferred = async (model, handle, options) => {
            const implementation = await load();
            if (!implementation.cancelDeferred)
                throw new Error("API cannot cancel deferred responses");
            await implementation.cancelDeferred(model, handle, options);
        };
    }
    return api;
}
//# sourceMappingURL=lazy.js.map

/***/ }),

/***/ 63451:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   openAICodexResponsesApi: () => (/* binding */ openAICodexResponsesApi)
/* harmony export */ });
/* harmony import */ var _lazy_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(78932);

const openAICodexResponsesApi = () => (0,_lazy_js__WEBPACK_IMPORTED_MODULE_0__/* .lazyApi */ .X)(() => Promise.all(/* import() */[__webpack_require__.e(804), __webpack_require__.e(942), __webpack_require__.e(923), __webpack_require__.e(548), __webpack_require__.e(453)]).then(__webpack_require__.bind(__webpack_require__, 71548)));
//# sourceMappingURL=openai-codex-responses.lazy.js.map

/***/ }),

/***/ 45174:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Q2: () => (/* binding */ AssistantMessageEventStream),
/* harmony export */   sM: () => (/* binding */ createAssistantMessageEventStream),
/* harmony export */   vC: () => (/* binding */ EventStream)
/* harmony export */ });
class FifoQueue {
    incoming = [];
    outgoing = [];
    get length() {
        return this.incoming.length + this.outgoing.length;
    }
    enqueue(value) {
        this.incoming.push(value);
    }
    dequeue() {
        if (this.outgoing.length === 0) {
            while (this.incoming.length > 0) {
                this.outgoing.push(this.incoming.pop());
            }
        }
        return this.outgoing.pop();
    }
}
// Generic event stream class for async iteration
class EventStream {
    queue = new FifoQueue();
    waiting = new FifoQueue();
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
        const waiter = this.waiting.dequeue();
        if (waiter) {
            waiter({ value: event, done: false });
        }
        else {
            this.queue.enqueue(event);
        }
    }
    end(result) {
        this.done = true;
        if (result !== undefined) {
            this.resolveFinalResult(result);
        }
        // Notify all waiting consumers that we're done
        while (this.waiting.length > 0) {
            const waiter = this.waiting.dequeue();
            waiter({ value: undefined, done: true });
        }
    }
    async *[Symbol.asyncIterator]() {
        while (true) {
            if (this.queue.length > 0) {
                yield this.queue.dequeue();
            }
            else if (this.done) {
                return;
            }
            else {
                const result = await new Promise((resolve) => this.waiting.enqueue(resolve));
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
