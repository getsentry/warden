export const id = 192;
export const ids = [192,181];
export const modules = {

/***/ 51181:
/***/ ((module) => {

function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(() => {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = () => ([]);
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = 51181;
module.exports = webpackEmptyAsyncContext;

/***/ }),

/***/ 94192:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  createJiti: () => (/* reexport */ createJiti)
});

// EXTERNAL MODULE: external "node:module"
var external_node_module_ = __webpack_require__(98995);
// EXTERNAL MODULE: ../../node_modules/.pnpm/jiti@2.7.0/node_modules/jiti/dist/jiti.cjs
var jiti = __webpack_require__(60978);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/jiti@2.7.0/node_modules/jiti/lib/jiti.mjs



function onError(err) {
  throw err; /* ↓ Check stack trace ↓ */
}

const nativeImport = (id) => __webpack_require__(51181)(id);

let _transform;
function lazyTransform(...args) {
  if (!_transform) {
    _transform = (0,external_node_module_.createRequire)(import.meta.url)("../dist/babel.cjs");
  }
  return _transform(...args);
}

function createJiti(id, opts = {}) {
  if (!opts.transform) {
    opts = { ...opts, transform: lazyTransform };
  }
  return jiti(id, opts, {
    onError,
    nativeImport,
    createRequire: external_node_module_.createRequire,
  });
}

/* harmony default export */ const lib_jiti = ((/* unused pure expression or super */ null && (createJiti)));

;// CONCATENATED MODULE: ../../node_modules/.pnpm/@earendil-works+pi-coding-agent@0.86.1_@modelcontextprotocol+sdk@1.32.1_zod@4.6.7__ws@8.22.0_zod@4.6.7/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/jiti-loader.js
// Normal Node runtimes use jiti's lazy transform so Babel is loaded only when
// native loading fails and an extension needs transformation.

//# sourceMappingURL=jiti-loader.js.map

/***/ })

};
