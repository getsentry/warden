export const id = 53;
export const ids = [53];
export const modules = {

/***/ 87823:
/***/ ((module) => {

module.exports = eval("require")("react-devtools-core");


/***/ }),

/***/ 67928:
/***/ ((__unused_webpack___webpack_module__, __unused_webpack___webpack_exports__, __webpack_require__) => {

/* harmony import */ var ws__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9117);
// Ignoring missing types error to avoid adding another dependency for this hack to work

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const customGlobal = globalThis;
// These things must exist before importing `react-devtools-core`
// Using ||= intentionally to set falsy values, not just null/undefined
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
customGlobal.WebSocket ||= ws__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay;
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
customGlobal.window ||= globalThis;
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
customGlobal.self ||= globalThis;
// Filter out Ink's internal components from devtools for a cleaner view.
// Also, ince `react-devtools-shared` package isn't published on npm, we can't
// use its types, that's why there are hard-coded values in `type` fields below.
// See https://github.com/facebook/react/blob/edf6eac8a181860fd8a2d076a43806f1237495a1/packages/react-devtools-shared/src/types.js#L24
customGlobal.window.__REACT_DEVTOOLS_COMPONENT_FILTERS__ = [
    {
        // ComponentFilterElementType
        type: 1,
        // ElementTypeHostComponent
        value: 7,
        isEnabled: true,
    },
    {
        // ComponentFilterDisplayName
        type: 2,
        value: 'InternalApp',
        isEnabled: true,
        isValid: true,
    },
    {
        // ComponentFilterDisplayName
        type: 2,
        value: 'InternalAppContext',
        isEnabled: true,
        isValid: true,
    },
    {
        // ComponentFilterDisplayName
        type: 2,
        value: 'InternalStdoutContext',
        isEnabled: true,
        isValid: true,
    },
    {
        // ComponentFilterDisplayName
        type: 2,
        value: 'InternalStderrContext',
        isEnabled: true,
        isValid: true,
    },
    {
        // ComponentFilterDisplayName
        type: 2,
        value: 'InternalStdinContext',
        isEnabled: true,
        isValid: true,
    },
    {
        // ComponentFilterDisplayName
        type: 2,
        value: 'InternalFocusContext',
        isEnabled: true,
        isValid: true,
    },
];
//# sourceMappingURL=devtools-window-polyfill.js.map

/***/ }),

/***/ 63053:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _devtools_window_polyfill_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(67928);
/* harmony import */ var ws__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(9117);
/* harmony import */ var react_devtools_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(87823);
/* eslint-disable import-x/order */
// eslint-disable-next-line import-x/no-unassigned-import


// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error

const isDevToolsReachable = async () => new Promise(resolve => {
    const socket = new ws__WEBPACK_IMPORTED_MODULE_1__/* ["default"] */ .Ay('ws://localhost:8097');
    const timeout = setTimeout(() => {
        socket.terminate();
        resolve(false);
    }, 2000);
    // Don't let the timeout keep the process alive on its own
    timeout.unref();
    socket.on('open', () => {
        clearTimeout(timeout);
        socket.terminate();
        resolve(true);
    });
    socket.on('error', () => {
        clearTimeout(timeout);
        socket.terminate();
        resolve(false);
    });
});
if (await isDevToolsReachable()) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    react_devtools_core__WEBPACK_IMPORTED_MODULE_2__.initialize();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    react_devtools_core__WEBPACK_IMPORTED_MODULE_2__.connectToDevTools();
}
else {
    console.warn('DEV is set to true, but the React DevTools server is not running. Start it with:\n\n$ npx react-devtools\n');
}
//# sourceMappingURL=devtools.js.map
__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ })

};
