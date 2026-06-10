export const id = 578;
export const ids = [578];
export const modules = {

/***/ 67026:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   kB: () => (/* binding */ time),
/* harmony export */   p0: () => (/* binding */ duration),
/* harmony export */   p6: () => (/* binding */ date),
/* harmony export */   w$: () => (/* binding */ datetime)
/* harmony export */ });
/* unused harmony exports ZodISODateTime, ZodISODate, ZodISOTime, ZodISODuration */
/* harmony import */ var _core_index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(67415);
/* harmony import */ var _core_index_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(74508);
/* harmony import */ var _core_index_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(40610);
/* harmony import */ var _schemas_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(53391);


const ZodISODateTime = /*@__PURE__*/ _core_index_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("ZodISODateTime", (inst, def) => {
    _core_index_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodISODateTime */ .Ko.init(inst, def);
    _schemas_js__WEBPACK_IMPORTED_MODULE_2__/* .ZodStringFormat */ .EB.init(inst, def);
});
function datetime(params) {
    return _core_index_js__WEBPACK_IMPORTED_MODULE_3__/* ._isoDateTime */ .G1(ZodISODateTime, params);
}
const ZodISODate = /*@__PURE__*/ _core_index_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("ZodISODate", (inst, def) => {
    _core_index_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodISODate */ .v1.init(inst, def);
    _schemas_js__WEBPACK_IMPORTED_MODULE_2__/* .ZodStringFormat */ .EB.init(inst, def);
});
function date(params) {
    return _core_index_js__WEBPACK_IMPORTED_MODULE_3__/* ._isoDate */ .db(ZodISODate, params);
}
const ZodISOTime = /*@__PURE__*/ _core_index_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("ZodISOTime", (inst, def) => {
    _core_index_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodISOTime */ .Ax.init(inst, def);
    _schemas_js__WEBPACK_IMPORTED_MODULE_2__/* .ZodStringFormat */ .EB.init(inst, def);
});
function time(params) {
    return _core_index_js__WEBPACK_IMPORTED_MODULE_3__/* ._isoTime */ .Kn(ZodISOTime, params);
}
const ZodISODuration = /*@__PURE__*/ _core_index_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("ZodISODuration", (inst, def) => {
    _core_index_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodISODuration */ .$N.init(inst, def);
    _schemas_js__WEBPACK_IMPORTED_MODULE_2__/* .ZodStringFormat */ .EB.init(inst, def);
});
function duration(params) {
    return _core_index_js__WEBPACK_IMPORTED_MODULE_3__/* ._isoDuration */ .f2(ZodISODuration, params);
}


/***/ }),

/***/ 53391:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  WF: () => (/* binding */ ZodBoolean),
  EB: () => (/* binding */ ZodStringFormat),
  bz: () => (/* binding */ any),
  YO: () => (/* binding */ array),
  zM: () => (/* binding */ schemas_boolean),
  Ie: () => (/* binding */ custom),
  p6: () => (/* binding */ date),
  gM: () => (/* binding */ discriminatedUnion),
  k5: () => (/* binding */ _enum),
  Wh: () => (/* binding */ schemas_int),
  RZ: () => (/* binding */ lazy),
  eu: () => (/* binding */ literal),
  Zm: () => (/* binding */ never),
  me: () => (/* binding */ nullable),
  ai: () => (/* binding */ number),
  Ik: () => (/* binding */ object),
  vk: () => (/* binding */ preprocess),
  g1: () => (/* binding */ record),
  Yj: () => (/* binding */ string),
  KC: () => (/* binding */ union),
  L5: () => (/* binding */ unknown),
  rI: () => (/* binding */ _void)
});

// UNUSED EXPORTS: ZodAny, ZodArray, ZodBase64, ZodBase64URL, ZodBigInt, ZodBigIntFormat, ZodCIDRv4, ZodCIDRv6, ZodCUID, ZodCUID2, ZodCatch, ZodCodec, ZodCustom, ZodCustomStringFormat, ZodDate, ZodDefault, ZodDiscriminatedUnion, ZodE164, ZodEmail, ZodEmoji, ZodEnum, ZodExactOptional, ZodFile, ZodFunction, ZodGUID, ZodIPv4, ZodIPv6, ZodIntersection, ZodJWT, ZodKSUID, ZodLazy, ZodLiteral, ZodMAC, ZodMap, ZodNaN, ZodNanoID, ZodNever, ZodNonOptional, ZodNull, ZodNullable, ZodNumber, ZodNumberFormat, ZodObject, ZodOptional, ZodPipe, ZodPrefault, ZodPreprocess, ZodPromise, ZodReadonly, ZodRecord, ZodSet, ZodString, ZodSuccess, ZodSymbol, ZodTemplateLiteral, ZodTransform, ZodTuple, ZodType, ZodULID, ZodURL, ZodUUID, ZodUndefined, ZodUnion, ZodUnknown, ZodVoid, ZodXID, ZodXor, _ZodString, _default, _function, base64, base64url, bigint, catch, check, cidrv4, cidrv6, codec, cuid, cuid2, describe, e164, email, emoji, exactOptional, file, float32, float64, function, guid, hash, hex, hostname, httpUrl, instanceof, int32, int64, intersection, invertCodec, ipv4, ipv6, json, jwt, keyof, ksuid, looseObject, looseRecord, mac, map, meta, nan, nanoid, nativeEnum, nonoptional, null, nullish, optional, partialRecord, pipe, prefault, promise, readonly, refine, set, strictObject, stringFormat, stringbool, success, superRefine, symbol, templateLiteral, transform, tuple, uint32, uint64, ulid, undefined, url, uuid, uuidv4, uuidv6, uuidv7, xid, xor

// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/core.js
var core_core = __webpack_require__(67415);
// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/schemas.js + 2 modules
var schemas = __webpack_require__(74508);
// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/util.js
var core_util = __webpack_require__(92220);
// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/registries.js
var registries = __webpack_require__(62687);
// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/api.js
var api = __webpack_require__(40610);
// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js
var json_schema_processors = __webpack_require__(7096);
// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js
var to_json_schema = __webpack_require__(94610);
// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/iso.js
var iso = __webpack_require__(67026);
// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/parse.js
var parse = __webpack_require__(1937);
// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/errors.js
var errors = __webpack_require__(46663);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/errors.js



const initializer = (inst, issues) => {
    errors/* $ZodError */.a$.init(inst, issues);
    inst.name = "ZodError";
    Object.defineProperties(inst, {
        format: {
            value: (mapper) => errors/* formatError */.Wk(inst, mapper),
            // enumerable: false,
        },
        flatten: {
            value: (mapper) => errors/* flattenError */.JM(inst, mapper),
            // enumerable: false,
        },
        addIssue: {
            value: (issue) => {
                inst.issues.push(issue);
                inst.message = JSON.stringify(inst.issues, core_util/* jsonStringifyReplacer */.k8, 2);
            },
            // enumerable: false,
        },
        addIssues: {
            value: (issues) => {
                inst.issues.push(...issues);
                inst.message = JSON.stringify(inst.issues, core_util/* jsonStringifyReplacer */.k8, 2);
            },
            // enumerable: false,
        },
        isEmpty: {
            get() {
                return inst.issues.length === 0;
            },
            // enumerable: false,
        },
    });
    // Object.defineProperty(inst, "isEmpty", {
    //   get() {
    //     return inst.issues.length === 0;
    //   },
    // });
};
const ZodError = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodError", initializer)));
const ZodRealError = /*@__PURE__*/ core_core/* $constructor */.xI("ZodError", initializer, {
    Parent: Error,
});
// /** @deprecated Use `z.core.$ZodErrorMapCtx` instead. */
// export type ErrorMapCtx = core.$ZodErrorMapCtx;

;// CONCATENATED MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/parse.js


const parse_parse = /* @__PURE__ */ parse/* _parse */.Tj(ZodRealError);
const parseAsync = /* @__PURE__ */ parse/* _parseAsync */.Rb(ZodRealError);
const safeParse = /* @__PURE__ */ parse/* _safeParse */.Od(ZodRealError);
const safeParseAsync = /* @__PURE__ */ parse/* _safeParseAsync */.wG(ZodRealError);
// Codec functions
const encode = /* @__PURE__ */ parse/* _encode */.Mv(ZodRealError);
const decode = /* @__PURE__ */ parse/* _decode */.e2(ZodRealError);
const encodeAsync = /* @__PURE__ */ parse/* _encodeAsync */.GW(ZodRealError);
const decodeAsync = /* @__PURE__ */ parse/* _decodeAsync */.or(ZodRealError);
const safeEncode = /* @__PURE__ */ parse/* _safeEncode */.rh(ZodRealError);
const safeDecode = /* @__PURE__ */ parse/* _safeDecode */.VS(ZodRealError);
const safeEncodeAsync = /* @__PURE__ */ parse/* _safeEncodeAsync */.v_(ZodRealError);
const safeDecodeAsync = /* @__PURE__ */ parse/* _safeDecodeAsync */.R3(ZodRealError);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/schemas.js







// Lazy-bind builder methods.
//
// Builder methods (`.optional`, `.array`, `.refine`, ...) live as
// non-enumerable getters on each concrete schema constructor's
// prototype. On first access from an instance the getter allocates
// `fn.bind(this)` and caches it as an own property on that instance,
// so detached usage (`const m = schema.optional; m()`) still works
// and the per-instance allocation only happens for methods actually
// touched.
//
// One install per (prototype, group), memoized by `_installedGroups`.
const _installedGroups = /* @__PURE__ */ new WeakMap();
function _installLazyMethods(inst, group, methods) {
    const proto = Object.getPrototypeOf(inst);
    let installed = _installedGroups.get(proto);
    if (!installed) {
        installed = new Set();
        _installedGroups.set(proto, installed);
    }
    if (installed.has(group))
        return;
    installed.add(group);
    for (const key in methods) {
        const fn = methods[key];
        Object.defineProperty(proto, key, {
            configurable: true,
            enumerable: false,
            get() {
                const bound = fn.bind(this);
                Object.defineProperty(this, key, {
                    configurable: true,
                    writable: true,
                    enumerable: true,
                    value: bound,
                });
                return bound;
            },
            set(v) {
                Object.defineProperty(this, key, {
                    configurable: true,
                    writable: true,
                    enumerable: true,
                    value: v,
                });
            },
        });
    }
}
const ZodType = /*@__PURE__*/ core_core/* $constructor */.xI("ZodType", (inst, def) => {
    schemas/* $ZodType */.W4.init(inst, def);
    Object.assign(inst["~standard"], {
        jsonSchema: {
            input: (0,to_json_schema/* createStandardJSONSchemaMethod */.uE)(inst, "input"),
            output: (0,to_json_schema/* createStandardJSONSchemaMethod */.uE)(inst, "output"),
        },
    });
    inst.toJSONSchema = (0,to_json_schema/* createToJSONSchemaMethod */.OA)(inst, {});
    inst.def = def;
    inst.type = def.type;
    Object.defineProperty(inst, "_def", { value: def });
    // Parse-family is intentionally kept as per-instance closures: these are
    // the hot path AND the most-detached methods (`arr.map(schema.parse)`,
    // `const { parse } = schema`, etc.). Eager closures here mean callers pay
    // ~12 closure allocations per schema but get monomorphic call sites and
    // detached usage that "just works".
    inst.parse = (data, params) => parse_parse(inst, data, params, { callee: inst.parse });
    inst.safeParse = (data, params) => safeParse(inst, data, params);
    inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
    inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
    inst.spa = inst.safeParseAsync;
    inst.encode = (data, params) => encode(inst, data, params);
    inst.decode = (data, params) => decode(inst, data, params);
    inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
    inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
    inst.safeEncode = (data, params) => safeEncode(inst, data, params);
    inst.safeDecode = (data, params) => safeDecode(inst, data, params);
    inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
    inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
    // All builder methods are placed on the internal prototype as lazy-bind
    // getters. On first access per-instance, a bound thunk is allocated and
    // cached as an own property; subsequent accesses skip the getter. This
    // means: no per-instance allocation for unused methods, full
    // detachability preserved (`const m = schema.optional; m()` works), and
    // shared underlying function references across all instances.
    _installLazyMethods(inst, "ZodType", {
        check(...chks) {
            const def = this.def;
            return this.clone(core_util/* mergeDefs */.zM(def, {
                checks: [
                    ...(def.checks ?? []),
                    ...chks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch),
                ],
            }), { parent: true });
        },
        with(...chks) {
            return this.check(...chks);
        },
        clone(def, params) {
            return core_util/* clone */.o8(this, def, params);
        },
        brand() {
            return this;
        },
        register(reg, meta) {
            reg.add(this, meta);
            return this;
        },
        refine(check, params) {
            return this.check(refine(check, params));
        },
        superRefine(refinement, params) {
            return this.check(superRefine(refinement, params));
        },
        overwrite(fn) {
            return this.check(api/* _overwrite */.bS(fn));
        },
        optional() {
            return optional(this);
        },
        exactOptional() {
            return exactOptional(this);
        },
        nullable() {
            return nullable(this);
        },
        nullish() {
            return optional(nullable(this));
        },
        nonoptional(params) {
            return nonoptional(this, params);
        },
        array() {
            return array(this);
        },
        or(arg) {
            return union([this, arg]);
        },
        and(arg) {
            return intersection(this, arg);
        },
        transform(tx) {
            return pipe(this, transform(tx));
        },
        default(d) {
            return _default(this, d);
        },
        prefault(d) {
            return prefault(this, d);
        },
        catch(params) {
            return _catch(this, params);
        },
        pipe(target) {
            return pipe(this, target);
        },
        readonly() {
            return readonly(this);
        },
        describe(description) {
            const cl = this.clone();
            registries/* globalRegistry */.fd.add(cl, { description });
            return cl;
        },
        meta(...args) {
            // overloaded: meta() returns the registered metadata, meta(data)
            // returns a clone with `data` registered. The mapped type picks
            // up the second overload, so we accept variadic any-args and
            // return `any` to satisfy both at runtime.
            if (args.length === 0)
                return registries/* globalRegistry */.fd.get(this);
            const cl = this.clone();
            registries/* globalRegistry */.fd.add(cl, args[0]);
            return cl;
        },
        isOptional() {
            return this.safeParse(undefined).success;
        },
        isNullable() {
            return this.safeParse(null).success;
        },
        apply(fn) {
            return fn(this);
        },
    });
    Object.defineProperty(inst, "description", {
        get() {
            return registries/* globalRegistry */.fd.get(inst)?.description;
        },
        configurable: true,
    });
    return inst;
});
/** @internal */
const _ZodString = /*@__PURE__*/ core_core/* $constructor */.xI("_ZodString", (inst, def) => {
    schemas/* $ZodString */.$v.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* stringProcessor */.SW(inst, ctx, json, params);
    const bag = inst._zod.bag;
    inst.format = bag.format ?? null;
    inst.minLength = bag.minimum ?? null;
    inst.maxLength = bag.maximum ?? null;
    _installLazyMethods(inst, "_ZodString", {
        regex(...args) {
            return this.check(api/* _regex */.Fk(...args));
        },
        includes(...args) {
            return this.check(api/* _includes */.dR(...args));
        },
        startsWith(...args) {
            return this.check(api/* _startsWith */.$S(...args));
        },
        endsWith(...args) {
            return this.check(api/* _endsWith */.ER(...args));
        },
        min(...args) {
            return this.check(api/* _minLength */.m9(...args));
        },
        max(...args) {
            return this.check(api/* _maxLength */.Eb(...args));
        },
        length(...args) {
            return this.check(api/* _length */.YA(...args));
        },
        nonempty(...args) {
            return this.check(api/* _minLength */.m9(1, ...args));
        },
        lowercase(params) {
            return this.check(api/* _lowercase */.hH(params));
        },
        uppercase(params) {
            return this.check(api/* _uppercase */.qF(params));
        },
        trim() {
            return this.check(api/* _trim */.WN());
        },
        normalize(...args) {
            return this.check(api/* _normalize */.lo(...args));
        },
        toLowerCase() {
            return this.check(api/* _toLowerCase */.Il());
        },
        toUpperCase() {
            return this.check(api/* _toUpperCase */.xY());
        },
        slugify() {
            return this.check(api/* _slugify */.TL());
        },
    });
});
const ZodString = /*@__PURE__*/ core_core/* $constructor */.xI("ZodString", (inst, def) => {
    schemas/* $ZodString */.$v.init(inst, def);
    _ZodString.init(inst, def);
    inst.email = (params) => inst.check(api/* _email */.Mu(ZodEmail, params));
    inst.url = (params) => inst.check(api/* _url */.Fn(ZodURL, params));
    inst.jwt = (params) => inst.check(api/* _jwt */.rk(ZodJWT, params));
    inst.emoji = (params) => inst.check(api/* _emoji */.aC(ZodEmoji, params));
    inst.guid = (params) => inst.check(api/* _guid */.tB(ZodGUID, params));
    inst.uuid = (params) => inst.check(api/* _uuid */.Be(ZodUUID, params));
    inst.uuidv4 = (params) => inst.check(api/* _uuidv4 */.nA(ZodUUID, params));
    inst.uuidv6 = (params) => inst.check(api/* _uuidv6 */.pY(ZodUUID, params));
    inst.uuidv7 = (params) => inst.check(api/* _uuidv7 */.wA(ZodUUID, params));
    inst.nanoid = (params) => inst.check(api/* _nanoid */.Dl(ZodNanoID, params));
    inst.guid = (params) => inst.check(api/* _guid */.tB(ZodGUID, params));
    inst.cuid = (params) => inst.check(api/* _cuid */.fs(ZodCUID, params));
    inst.cuid2 = (params) => inst.check(api/* _cuid2 */.Bj(ZodCUID2, params));
    inst.ulid = (params) => inst.check(api/* _ulid */.Ct(ZodULID, params));
    inst.base64 = (params) => inst.check(api/* _base64 */.rt(ZodBase64, params));
    inst.base64url = (params) => inst.check(api/* _base64url */.cU(ZodBase64URL, params));
    inst.xid = (params) => inst.check(api/* _xid */.Pw(ZodXID, params));
    inst.ksuid = (params) => inst.check(api/* _ksuid */._z(ZodKSUID, params));
    inst.ipv4 = (params) => inst.check(api/* _ipv4 */.Ny(ZodIPv4, params));
    inst.ipv6 = (params) => inst.check(api/* _ipv6 */.$O(ZodIPv6, params));
    inst.cidrv4 = (params) => inst.check(api/* _cidrv4 */.Uy(ZodCIDRv4, params));
    inst.cidrv6 = (params) => inst.check(api/* _cidrv6 */.gP(ZodCIDRv6, params));
    inst.e164 = (params) => inst.check(api/* _e164 */.KB(ZodE164, params));
    // iso
    inst.datetime = (params) => inst.check(iso/* datetime */.w$(params));
    inst.date = (params) => inst.check(iso/* date */.p6(params));
    inst.time = (params) => inst.check(iso/* time */.kB(params));
    inst.duration = (params) => inst.check(iso/* duration */.p0(params));
});
function string(params) {
    return api/* _string */.Rl(ZodString, params);
}
const ZodStringFormat = /*@__PURE__*/ core_core/* $constructor */.xI("ZodStringFormat", (inst, def) => {
    schemas/* $ZodStringFormat */.EY.init(inst, def);
    _ZodString.init(inst, def);
});
const ZodEmail = /*@__PURE__*/ core_core/* $constructor */.xI("ZodEmail", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    schemas/* $ZodEmail */.qG.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function email(params) {
    return core._email(ZodEmail, params);
}
const ZodGUID = /*@__PURE__*/ core_core/* $constructor */.xI("ZodGUID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    schemas/* $ZodGUID */.Zc.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function guid(params) {
    return core._guid(ZodGUID, params);
}
const ZodUUID = /*@__PURE__*/ core_core/* $constructor */.xI("ZodUUID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    schemas/* $ZodUUID */.Zn.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function uuid(params) {
    return core._uuid(ZodUUID, params);
}
function uuidv4(params) {
    return core._uuidv4(ZodUUID, params);
}
// ZodUUIDv6
function uuidv6(params) {
    return core._uuidv6(ZodUUID, params);
}
// ZodUUIDv7
function uuidv7(params) {
    return core._uuidv7(ZodUUID, params);
}
const ZodURL = /*@__PURE__*/ core_core/* $constructor */.xI("ZodURL", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    schemas/* $ZodURL */.VY.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function url(params) {
    return core._url(ZodURL, params);
}
function httpUrl(params) {
    return core._url(ZodURL, {
        protocol: core.regexes.httpProtocol,
        hostname: core.regexes.domain,
        ...util.normalizeParams(params),
    });
}
const ZodEmoji = /*@__PURE__*/ core_core/* $constructor */.xI("ZodEmoji", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    schemas/* $ZodEmoji */.cG.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function emoji(params) {
    return core._emoji(ZodEmoji, params);
}
const ZodNanoID = /*@__PURE__*/ core_core/* $constructor */.xI("ZodNanoID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    schemas/* $ZodNanoID */.Py.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function nanoid(params) {
    return core._nanoid(ZodNanoID, params);
}
/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link ZodCUID2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
const ZodCUID = /*@__PURE__*/ core_core/* $constructor */.xI("ZodCUID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    schemas/* $ZodCUID */.bl.init(inst, def);
    ZodStringFormat.init(inst, def);
});
/**
 * Validates a CUID v1 string.
 *
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link cuid2 | `z.cuid2()`} instead.
 * See https://github.com/paralleldrive/cuid.
 */
function cuid(params) {
    return core._cuid(ZodCUID, params);
}
const ZodCUID2 = /*@__PURE__*/ core_core/* $constructor */.xI("ZodCUID2", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    schemas/* $ZodCUID2 */.Zu.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function cuid2(params) {
    return core._cuid2(ZodCUID2, params);
}
const ZodULID = /*@__PURE__*/ core_core/* $constructor */.xI("ZodULID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    schemas/* $ZodULID */.g5.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function ulid(params) {
    return core._ulid(ZodULID, params);
}
const ZodXID = /*@__PURE__*/ core_core/* $constructor */.xI("ZodXID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    schemas/* $ZodXID */.TF.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function xid(params) {
    return core._xid(ZodXID, params);
}
const ZodKSUID = /*@__PURE__*/ core_core/* $constructor */.xI("ZodKSUID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    schemas/* $ZodKSUID */.GY.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function ksuid(params) {
    return core._ksuid(ZodKSUID, params);
}
const ZodIPv4 = /*@__PURE__*/ core_core/* $constructor */.xI("ZodIPv4", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    schemas/* $ZodIPv4 */.Lc.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function ipv4(params) {
    return core._ipv4(ZodIPv4, params);
}
const ZodMAC = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodMAC", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodMAC.init(inst, def);
    ZodStringFormat.init(inst, def);
})));
function mac(params) {
    return core._mac(ZodMAC, params);
}
const ZodIPv6 = /*@__PURE__*/ core_core/* $constructor */.xI("ZodIPv6", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    schemas/* $ZodIPv6 */.Zy.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function ipv6(params) {
    return core._ipv6(ZodIPv6, params);
}
const ZodCIDRv4 = /*@__PURE__*/ core_core/* $constructor */.xI("ZodCIDRv4", (inst, def) => {
    schemas/* $ZodCIDRv4 */.CI.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function cidrv4(params) {
    return core._cidrv4(ZodCIDRv4, params);
}
const ZodCIDRv6 = /*@__PURE__*/ core_core/* $constructor */.xI("ZodCIDRv6", (inst, def) => {
    schemas/* $ZodCIDRv6 */.Cn.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function cidrv6(params) {
    return core._cidrv6(ZodCIDRv6, params);
}
const ZodBase64 = /*@__PURE__*/ core_core/* $constructor */.xI("ZodBase64", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    schemas/* $ZodBase64 */.Dq.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function base64(params) {
    return core._base64(ZodBase64, params);
}
const ZodBase64URL = /*@__PURE__*/ core_core/* $constructor */.xI("ZodBase64URL", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    schemas/* $ZodBase64URL */.CQ.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function base64url(params) {
    return core._base64url(ZodBase64URL, params);
}
const ZodE164 = /*@__PURE__*/ core_core/* $constructor */.xI("ZodE164", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    schemas/* $ZodE164 */.Oy.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function e164(params) {
    return core._e164(ZodE164, params);
}
const ZodJWT = /*@__PURE__*/ core_core/* $constructor */.xI("ZodJWT", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    schemas/* $ZodJWT */.h8.init(inst, def);
    ZodStringFormat.init(inst, def);
});
function jwt(params) {
    return core._jwt(ZodJWT, params);
}
const ZodCustomStringFormat = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodCustomStringFormat", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodCustomStringFormat.init(inst, def);
    ZodStringFormat.init(inst, def);
})));
function stringFormat(format, fnOrRegex, _params = {}) {
    return core._stringFormat(ZodCustomStringFormat, format, fnOrRegex, _params);
}
function hostname(_params) {
    return core._stringFormat(ZodCustomStringFormat, "hostname", core.regexes.hostname, _params);
}
function hex(_params) {
    return core._stringFormat(ZodCustomStringFormat, "hex", core.regexes.hex, _params);
}
function hash(alg, params) {
    const enc = params?.enc ?? "hex";
    const format = `${alg}_${enc}`;
    const regex = core.regexes[format];
    if (!regex)
        throw new Error(`Unrecognized hash format: ${format}`);
    return core._stringFormat(ZodCustomStringFormat, format, regex, params);
}
const ZodNumber = /*@__PURE__*/ core_core/* $constructor */.xI("ZodNumber", (inst, def) => {
    schemas/* $ZodNumber */.vz.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* numberProcessor */.Wg(inst, ctx, json, params);
    _installLazyMethods(inst, "ZodNumber", {
        gt(value, params) {
            return this.check(api/* _gt */.Tx(value, params));
        },
        gte(value, params) {
            return this.check(api/* _gte */.qm(value, params));
        },
        min(value, params) {
            return this.check(api/* _gte */.qm(value, params));
        },
        lt(value, params) {
            return this.check(api/* _lt */.Au(value, params));
        },
        lte(value, params) {
            return this.check(api/* _lte */.Zm(value, params));
        },
        max(value, params) {
            return this.check(api/* _lte */.Zm(value, params));
        },
        int(params) {
            return this.check(schemas_int(params));
        },
        safe(params) {
            return this.check(schemas_int(params));
        },
        positive(params) {
            return this.check(api/* _gt */.Tx(0, params));
        },
        nonnegative(params) {
            return this.check(api/* _gte */.qm(0, params));
        },
        negative(params) {
            return this.check(api/* _lt */.Au(0, params));
        },
        nonpositive(params) {
            return this.check(api/* _lte */.Zm(0, params));
        },
        multipleOf(value, params) {
            return this.check(api/* _multipleOf */.Hi(value, params));
        },
        step(value, params) {
            return this.check(api/* _multipleOf */.Hi(value, params));
        },
        finite() {
            return this;
        },
    });
    const bag = inst._zod.bag;
    inst.minValue =
        Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
    inst.maxValue =
        Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
    inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
    inst.isFinite = true;
    inst.format = bag.format ?? null;
});
function number(params) {
    return api/* _number */.F7(ZodNumber, params);
}
const ZodNumberFormat = /*@__PURE__*/ core_core/* $constructor */.xI("ZodNumberFormat", (inst, def) => {
    schemas/* $ZodNumberFormat */.I.init(inst, def);
    ZodNumber.init(inst, def);
});
function schemas_int(params) {
    return api/* _int */.LK(ZodNumberFormat, params);
}
function float32(params) {
    return core._float32(ZodNumberFormat, params);
}
function float64(params) {
    return core._float64(ZodNumberFormat, params);
}
function int32(params) {
    return core._int32(ZodNumberFormat, params);
}
function uint32(params) {
    return core._uint32(ZodNumberFormat, params);
}
const ZodBoolean = /*@__PURE__*/ core_core/* $constructor */.xI("ZodBoolean", (inst, def) => {
    schemas/* $ZodBoolean */.sF.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* booleanProcessor */.dO(inst, ctx, json, params);
});
function schemas_boolean(params) {
    return api/* _boolean */._L(ZodBoolean, params);
}
const ZodBigInt = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodBigInt", (inst, def) => {
    core.$ZodBigInt.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.bigintProcessor(inst, ctx, json, params);
    inst.gte = (value, params) => inst.check(checks.gte(value, params));
    inst.min = (value, params) => inst.check(checks.gte(value, params));
    inst.gt = (value, params) => inst.check(checks.gt(value, params));
    inst.gte = (value, params) => inst.check(checks.gte(value, params));
    inst.min = (value, params) => inst.check(checks.gte(value, params));
    inst.lt = (value, params) => inst.check(checks.lt(value, params));
    inst.lte = (value, params) => inst.check(checks.lte(value, params));
    inst.max = (value, params) => inst.check(checks.lte(value, params));
    inst.positive = (params) => inst.check(checks.gt(BigInt(0), params));
    inst.negative = (params) => inst.check(checks.lt(BigInt(0), params));
    inst.nonpositive = (params) => inst.check(checks.lte(BigInt(0), params));
    inst.nonnegative = (params) => inst.check(checks.gte(BigInt(0), params));
    inst.multipleOf = (value, params) => inst.check(checks.multipleOf(value, params));
    const bag = inst._zod.bag;
    inst.minValue = bag.minimum ?? null;
    inst.maxValue = bag.maximum ?? null;
    inst.format = bag.format ?? null;
})));
function bigint(params) {
    return core._bigint(ZodBigInt, params);
}
const ZodBigIntFormat = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodBigIntFormat", (inst, def) => {
    core.$ZodBigIntFormat.init(inst, def);
    ZodBigInt.init(inst, def);
})));
// int64
function int64(params) {
    return core._int64(ZodBigIntFormat, params);
}
// uint64
function uint64(params) {
    return core._uint64(ZodBigIntFormat, params);
}
const ZodSymbol = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodSymbol", (inst, def) => {
    core.$ZodSymbol.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.symbolProcessor(inst, ctx, json, params);
})));
function symbol(params) {
    return core._symbol(ZodSymbol, params);
}
const ZodUndefined = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodUndefined", (inst, def) => {
    core.$ZodUndefined.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.undefinedProcessor(inst, ctx, json, params);
})));
function _undefined(params) {
    return core._undefined(ZodUndefined, params);
}

const ZodNull = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodNull", (inst, def) => {
    core.$ZodNull.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.nullProcessor(inst, ctx, json, params);
})));
function _null(params) {
    return core._null(ZodNull, params);
}

const ZodAny = /*@__PURE__*/ core_core/* $constructor */.xI("ZodAny", (inst, def) => {
    schemas/* $ZodAny */.Gb.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* anyProcessor */.NX(inst, ctx, json, params);
});
function any() {
    return api/* _any */.KA(ZodAny);
}
const ZodUnknown = /*@__PURE__*/ core_core/* $constructor */.xI("ZodUnknown", (inst, def) => {
    schemas/* $ZodUnknown */.GP.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* unknownProcessor */.NV(inst, ctx, json, params);
});
function unknown() {
    return api/* _unknown */.em(ZodUnknown);
}
const ZodNever = /*@__PURE__*/ core_core/* $constructor */.xI("ZodNever", (inst, def) => {
    schemas/* $ZodNever */.Um.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* neverProcessor */.RH(inst, ctx, json, params);
});
function never(params) {
    return api/* _never */.G8(ZodNever, params);
}
const ZodVoid = /*@__PURE__*/ core_core/* $constructor */.xI("ZodVoid", (inst, def) => {
    schemas/* $ZodVoid */.WH.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* voidProcessor */.vn(inst, ctx, json, params);
});
function _void(params) {
    return api/* _void */.OC(ZodVoid, params);
}

const ZodDate = /*@__PURE__*/ core_core/* $constructor */.xI("ZodDate", (inst, def) => {
    schemas/* $ZodDate */.o5.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* dateProcessor */.Fl(inst, ctx, json, params);
    inst.min = (value, params) => inst.check(api/* _gte */.qm(value, params));
    inst.max = (value, params) => inst.check(api/* _lte */.Zm(value, params));
    const c = inst._zod.bag;
    inst.minDate = c.minimum ? new Date(c.minimum) : null;
    inst.maxDate = c.maximum ? new Date(c.maximum) : null;
});
function date(params) {
    return api/* _date */.YY(ZodDate, params);
}
const ZodArray = /*@__PURE__*/ core_core/* $constructor */.xI("ZodArray", (inst, def) => {
    schemas/* $ZodArray */.$p.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* arrayProcessor */.cY(inst, ctx, json, params);
    inst.element = def.element;
    _installLazyMethods(inst, "ZodArray", {
        min(n, params) {
            return this.check(api/* _minLength */.m9(n, params));
        },
        nonempty(params) {
            return this.check(api/* _minLength */.m9(1, params));
        },
        max(n, params) {
            return this.check(api/* _maxLength */.Eb(n, params));
        },
        length(n, params) {
            return this.check(api/* _length */.YA(n, params));
        },
        unwrap() {
            return this.element;
        },
    });
});
function array(element, params) {
    return api/* _array */.dZ(ZodArray, element, params);
}
// .keyof
function keyof(schema) {
    const shape = schema._zod.def.shape;
    return _enum(Object.keys(shape));
}
const ZodObject = /*@__PURE__*/ core_core/* $constructor */.xI("ZodObject", (inst, def) => {
    schemas/* $ZodObjectJIT */.w.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* objectProcessor */.Ec(inst, ctx, json, params);
    core_util/* defineLazy */.gJ(inst, "shape", () => {
        return def.shape;
    });
    _installLazyMethods(inst, "ZodObject", {
        keyof() {
            return _enum(Object.keys(this._zod.def.shape));
        },
        catchall(catchall) {
            return this.clone({ ...this._zod.def, catchall: catchall });
        },
        passthrough() {
            return this.clone({ ...this._zod.def, catchall: unknown() });
        },
        loose() {
            return this.clone({ ...this._zod.def, catchall: unknown() });
        },
        strict() {
            return this.clone({ ...this._zod.def, catchall: never() });
        },
        strip() {
            return this.clone({ ...this._zod.def, catchall: undefined });
        },
        extend(incoming) {
            return core_util/* extend */.X$(this, incoming);
        },
        safeExtend(incoming) {
            return core_util/* safeExtend */.W0(this, incoming);
        },
        merge(other) {
            return core_util/* merge */.h1(this, other);
        },
        pick(mask) {
            return core_util/* pick */.Up(this, mask);
        },
        omit(mask) {
            return core_util/* omit */.cJ(this, mask);
        },
        partial(...args) {
            return core_util/* partial */.OH(ZodOptional, this, args[0]);
        },
        required(...args) {
            return core_util/* required */.mw(ZodNonOptional, this, args[0]);
        },
    });
});
function object(shape, params) {
    const def = {
        type: "object",
        shape: shape ?? {},
        ...core_util/* normalizeParams */.A2(params),
    };
    return new ZodObject(def);
}
// strictObject
function strictObject(shape, params) {
    return new ZodObject({
        type: "object",
        shape,
        catchall: never(),
        ...util.normalizeParams(params),
    });
}
// looseObject
function looseObject(shape, params) {
    return new ZodObject({
        type: "object",
        shape,
        catchall: unknown(),
        ...util.normalizeParams(params),
    });
}
const ZodUnion = /*@__PURE__*/ core_core/* $constructor */.xI("ZodUnion", (inst, def) => {
    schemas/* $ZodUnion */.cu.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* unionProcessor */.iC(inst, ctx, json, params);
    inst.options = def.options;
});
function union(options, params) {
    return new ZodUnion({
        type: "union",
        options: options,
        ...core_util/* normalizeParams */.A2(params),
    });
}
const ZodXor = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodXor", (inst, def) => {
    ZodUnion.init(inst, def);
    core.$ZodXor.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.unionProcessor(inst, ctx, json, params);
    inst.options = def.options;
})));
/** Creates an exclusive union (XOR) where exactly one option must match.
 * Unlike regular unions that succeed when any option matches, xor fails if
 * zero or more than one option matches the input. */
function xor(options, params) {
    return new ZodXor({
        type: "union",
        options: options,
        inclusive: false,
        ...util.normalizeParams(params),
    });
}
const ZodDiscriminatedUnion = /*@__PURE__*/ core_core/* $constructor */.xI("ZodDiscriminatedUnion", (inst, def) => {
    ZodUnion.init(inst, def);
    schemas/* $ZodDiscriminatedUnion */.P0.init(inst, def);
});
function discriminatedUnion(discriminator, options, params) {
    // const [options, params] = args;
    return new ZodDiscriminatedUnion({
        type: "union",
        options,
        discriminator,
        ...core_util/* normalizeParams */.A2(params),
    });
}
const ZodIntersection = /*@__PURE__*/ core_core/* $constructor */.xI("ZodIntersection", (inst, def) => {
    schemas/* $ZodIntersection */.LJ.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* intersectionProcessor */.i_(inst, ctx, json, params);
});
function intersection(left, right) {
    return new ZodIntersection({
        type: "intersection",
        left: left,
        right: right,
    });
}
const ZodTuple = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodTuple", (inst, def) => {
    core.$ZodTuple.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.tupleProcessor(inst, ctx, json, params);
    inst.rest = (rest) => inst.clone({
        ...inst._zod.def,
        rest: rest,
    });
})));
function tuple(items, _paramsOrRest, _params) {
    const hasRest = _paramsOrRest instanceof core.$ZodType;
    const params = hasRest ? _params : _paramsOrRest;
    const rest = hasRest ? _paramsOrRest : null;
    return new ZodTuple({
        type: "tuple",
        items: items,
        rest,
        ...util.normalizeParams(params),
    });
}
const ZodRecord = /*@__PURE__*/ core_core/* $constructor */.xI("ZodRecord", (inst, def) => {
    schemas/* $ZodRecord */.h.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* recordProcessor */.GC(inst, ctx, json, params);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
});
function record(keyType, valueType, params) {
    // v3-compat: z.record(valueType, params?) — defaults keyType to z.string()
    if (!valueType || !valueType._zod) {
        return new ZodRecord({
            type: "record",
            keyType: string(),
            valueType: keyType,
            ...core_util/* normalizeParams */.A2(valueType),
        });
    }
    return new ZodRecord({
        type: "record",
        keyType,
        valueType: valueType,
        ...core_util/* normalizeParams */.A2(params),
    });
}
// type alksjf = core.output<core.$ZodRecordKey>;
function partialRecord(keyType, valueType, params) {
    const k = core.clone(keyType);
    k._zod.values = undefined;
    return new ZodRecord({
        type: "record",
        keyType: k,
        valueType: valueType,
        ...util.normalizeParams(params),
    });
}
function looseRecord(keyType, valueType, params) {
    return new ZodRecord({
        type: "record",
        keyType,
        valueType: valueType,
        mode: "loose",
        ...util.normalizeParams(params),
    });
}
const ZodMap = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodMap", (inst, def) => {
    core.$ZodMap.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.mapProcessor(inst, ctx, json, params);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
    inst.min = (...args) => inst.check(core._minSize(...args));
    inst.nonempty = (params) => inst.check(core._minSize(1, params));
    inst.max = (...args) => inst.check(core._maxSize(...args));
    inst.size = (...args) => inst.check(core._size(...args));
})));
function map(keyType, valueType, params) {
    return new ZodMap({
        type: "map",
        keyType: keyType,
        valueType: valueType,
        ...util.normalizeParams(params),
    });
}
const ZodSet = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodSet", (inst, def) => {
    core.$ZodSet.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.setProcessor(inst, ctx, json, params);
    inst.min = (...args) => inst.check(core._minSize(...args));
    inst.nonempty = (params) => inst.check(core._minSize(1, params));
    inst.max = (...args) => inst.check(core._maxSize(...args));
    inst.size = (...args) => inst.check(core._size(...args));
})));
function set(valueType, params) {
    return new ZodSet({
        type: "set",
        valueType: valueType,
        ...util.normalizeParams(params),
    });
}
const ZodEnum = /*@__PURE__*/ core_core/* $constructor */.xI("ZodEnum", (inst, def) => {
    schemas/* $ZodEnum */.VO.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* enumProcessor */.C0(inst, ctx, json, params);
    inst.enum = def.entries;
    inst.options = Object.values(def.entries);
    const keys = new Set(Object.keys(def.entries));
    inst.extract = (values, params) => {
        const newEntries = {};
        for (const value of values) {
            if (keys.has(value)) {
                newEntries[value] = def.entries[value];
            }
            else
                throw new Error(`Key ${value} not found in enum`);
        }
        return new ZodEnum({
            ...def,
            checks: [],
            ...core_util/* normalizeParams */.A2(params),
            entries: newEntries,
        });
    };
    inst.exclude = (values, params) => {
        const newEntries = { ...def.entries };
        for (const value of values) {
            if (keys.has(value)) {
                delete newEntries[value];
            }
            else
                throw new Error(`Key ${value} not found in enum`);
        }
        return new ZodEnum({
            ...def,
            checks: [],
            ...core_util/* normalizeParams */.A2(params),
            entries: newEntries,
        });
    };
});
function _enum(values, params) {
    const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
    return new ZodEnum({
        type: "enum",
        entries,
        ...core_util/* normalizeParams */.A2(params),
    });
}

/** @deprecated This API has been merged into `z.enum()`. Use `z.enum()` instead.
 *
 * ```ts
 * enum Colors { red, green, blue }
 * z.enum(Colors);
 * ```
 */
function nativeEnum(entries, params) {
    return new ZodEnum({
        type: "enum",
        entries,
        ...util.normalizeParams(params),
    });
}
const ZodLiteral = /*@__PURE__*/ core_core/* $constructor */.xI("ZodLiteral", (inst, def) => {
    schemas/* $ZodLiteral */.nu.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* literalProcessor */.Yv(inst, ctx, json, params);
    inst.values = new Set(def.values);
    Object.defineProperty(inst, "value", {
        get() {
            if (def.values.length > 1) {
                throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
            }
            return def.values[0];
        },
    });
});
function literal(value, params) {
    return new ZodLiteral({
        type: "literal",
        values: Array.isArray(value) ? value : [value],
        ...core_util/* normalizeParams */.A2(params),
    });
}
const ZodFile = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodFile", (inst, def) => {
    core.$ZodFile.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.fileProcessor(inst, ctx, json, params);
    inst.min = (size, params) => inst.check(core._minSize(size, params));
    inst.max = (size, params) => inst.check(core._maxSize(size, params));
    inst.mime = (types, params) => inst.check(core._mime(Array.isArray(types) ? types : [types], params));
})));
function file(params) {
    return core._file(ZodFile, params);
}
const ZodTransform = /*@__PURE__*/ core_core/* $constructor */.xI("ZodTransform", (inst, def) => {
    schemas/* $ZodTransform */.Wc.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* transformProcessor */.xi(inst, ctx, json, params);
    inst._zod.parse = (payload, _ctx) => {
        if (_ctx.direction === "backward") {
            throw new core_core/* $ZodEncodeError */.cV(inst.constructor.name);
        }
        payload.addIssue = (issue) => {
            if (typeof issue === "string") {
                payload.issues.push(core_util/* issue */.sn(issue, payload.value, def));
            }
            else {
                // for Zod 3 backwards compatibility
                const _issue = issue;
                if (_issue.fatal)
                    _issue.continue = false;
                _issue.code ?? (_issue.code = "custom");
                _issue.input ?? (_issue.input = payload.value);
                _issue.inst ?? (_issue.inst = inst);
                // _issue.continue ??= true;
                payload.issues.push(core_util/* issue */.sn(_issue));
            }
        };
        const output = def.transform(payload.value, payload);
        if (output instanceof Promise) {
            return output.then((output) => {
                payload.value = output;
                payload.fallback = true;
                return payload;
            });
        }
        payload.value = output;
        payload.fallback = true;
        return payload;
    };
});
function transform(fn) {
    return new ZodTransform({
        type: "transform",
        transform: fn,
    });
}
const ZodOptional = /*@__PURE__*/ core_core/* $constructor */.xI("ZodOptional", (inst, def) => {
    schemas/* $ZodOptional */.ig.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* optionalProcessor */.$k(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
    return new ZodOptional({
        type: "optional",
        innerType: innerType,
    });
}
const ZodExactOptional = /*@__PURE__*/ core_core/* $constructor */.xI("ZodExactOptional", (inst, def) => {
    schemas/* $ZodExactOptional */.RL.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* optionalProcessor */.$k(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
    return new ZodExactOptional({
        type: "optional",
        innerType: innerType,
    });
}
const ZodNullable = /*@__PURE__*/ core_core/* $constructor */.xI("ZodNullable", (inst, def) => {
    schemas/* $ZodNullable */.qc.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* nullableProcessor */.yq(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
    return new ZodNullable({
        type: "nullable",
        innerType: innerType,
    });
}
// nullish
function nullish(innerType) {
    return optional(nullable(innerType));
}
const ZodDefault = /*@__PURE__*/ core_core/* $constructor */.xI("ZodDefault", (inst, def) => {
    schemas/* $ZodDefault */.rv.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* defaultProcessor */.mh(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
    return new ZodDefault({
        type: "default",
        innerType: innerType,
        get defaultValue() {
            return typeof defaultValue === "function" ? defaultValue() : core_util/* shallowClone */.yG(defaultValue);
        },
    });
}
const ZodPrefault = /*@__PURE__*/ core_core/* $constructor */.xI("ZodPrefault", (inst, def) => {
    schemas/* $ZodPrefault */.VF.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* prefaultProcessor */.A(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
    return new ZodPrefault({
        type: "prefault",
        innerType: innerType,
        get defaultValue() {
            return typeof defaultValue === "function" ? defaultValue() : core_util/* shallowClone */.yG(defaultValue);
        },
    });
}
const ZodNonOptional = /*@__PURE__*/ core_core/* $constructor */.xI("ZodNonOptional", (inst, def) => {
    schemas/* $ZodNonOptional */.N$.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* nonoptionalProcessor */.cR(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
    return new ZodNonOptional({
        type: "nonoptional",
        innerType: innerType,
        ...core_util/* normalizeParams */.A2(params),
    });
}
const ZodSuccess = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodSuccess", (inst, def) => {
    core.$ZodSuccess.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.successProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
})));
function success(innerType) {
    return new ZodSuccess({
        type: "success",
        innerType: innerType,
    });
}
const ZodCatch = /*@__PURE__*/ core_core/* $constructor */.xI("ZodCatch", (inst, def) => {
    schemas/* $ZodCatch */.t$.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* catchProcessor */.Q9(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
    return new ZodCatch({
        type: "catch",
        innerType: innerType,
        catchValue: (typeof catchValue === "function" ? catchValue : () => catchValue),
    });
}

const ZodNaN = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodNaN", (inst, def) => {
    core.$ZodNaN.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.nanProcessor(inst, ctx, json, params);
})));
function nan(params) {
    return core._nan(ZodNaN, params);
}
const ZodPipe = /*@__PURE__*/ core_core/* $constructor */.xI("ZodPipe", (inst, def) => {
    schemas/* $ZodPipe */._m.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* pipeProcessor */.fs(inst, ctx, json, params);
    inst.in = def.in;
    inst.out = def.out;
});
function pipe(in_, out) {
    return new ZodPipe({
        type: "pipe",
        in: in_,
        out: out,
        // ...util.normalizeParams(params),
    });
}
const ZodCodec = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodCodec", (inst, def) => {
    ZodPipe.init(inst, def);
    core.$ZodCodec.init(inst, def);
})));
function codec(in_, out, params) {
    return new ZodCodec({
        type: "pipe",
        in: in_,
        out: out,
        transform: params.decode,
        reverseTransform: params.encode,
    });
}
function invertCodec(codec) {
    const def = codec._zod.def;
    return new ZodCodec({
        type: "pipe",
        in: def.out,
        out: def.in,
        transform: def.reverseTransform,
        reverseTransform: def.transform,
    });
}
const ZodPreprocess = /*@__PURE__*/ core_core/* $constructor */.xI("ZodPreprocess", (inst, def) => {
    ZodPipe.init(inst, def);
    schemas/* $ZodPreprocess */.KX.init(inst, def);
});
const ZodReadonly = /*@__PURE__*/ core_core/* $constructor */.xI("ZodReadonly", (inst, def) => {
    schemas/* $ZodReadonly */.Sb.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* readonlyProcessor */.$X(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
    return new ZodReadonly({
        type: "readonly",
        innerType: innerType,
    });
}
const ZodTemplateLiteral = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodTemplateLiteral", (inst, def) => {
    core.$ZodTemplateLiteral.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.templateLiteralProcessor(inst, ctx, json, params);
})));
function templateLiteral(parts, params) {
    return new ZodTemplateLiteral({
        type: "template_literal",
        parts,
        ...util.normalizeParams(params),
    });
}
const ZodLazy = /*@__PURE__*/ core_core/* $constructor */.xI("ZodLazy", (inst, def) => {
    schemas/* $ZodLazy */.kU.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* lazyProcessor */.Tr(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.getter();
});
function lazy(getter) {
    return new ZodLazy({
        type: "lazy",
        getter: getter,
    });
}
const ZodPromise = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodPromise", (inst, def) => {
    core.$ZodPromise.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.promiseProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
})));
function promise(innerType) {
    return new ZodPromise({
        type: "promise",
        innerType: innerType,
    });
}
const ZodFunction = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("ZodFunction", (inst, def) => {
    core.$ZodFunction.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.functionProcessor(inst, ctx, json, params);
})));
function _function(params) {
    return new ZodFunction({
        type: "function",
        input: Array.isArray(params?.input) ? tuple(params?.input) : (params?.input ?? array(unknown())),
        output: params?.output ?? unknown(),
    });
}

const ZodCustom = /*@__PURE__*/ core_core/* $constructor */.xI("ZodCustom", (inst, def) => {
    schemas/* $ZodCustom */.b0.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => json_schema_processors/* customProcessor */.A6(inst, ctx, json, params);
});
// custom checks
function check(fn) {
    const ch = new core.$ZodCheck({
        check: "custom",
        // ...util.normalizeParams(params),
    });
    ch._zod.check = fn;
    return ch;
}
function custom(fn, _params) {
    return api/* _custom */.FO(ZodCustom, fn ?? (() => true), _params);
}
function refine(fn, _params = {}) {
    return api/* _refine */.fU(ZodCustom, fn, _params);
}
// superRefine
function superRefine(fn, params) {
    return api/* _superRefine */.MB(fn, params);
}
// Re-export describe and meta from core
const describe = api/* describe */.q0;
const meta = api/* meta */.mI;
function _instanceof(cls, params = {}) {
    const inst = new ZodCustom({
        type: "custom",
        check: "custom",
        fn: (data) => data instanceof cls,
        abort: true,
        ...util.normalizeParams(params),
    });
    inst._zod.bag.Class = cls;
    // Override check to emit invalid_type instead of custom
    inst._zod.check = (payload) => {
        if (!(payload.value instanceof cls)) {
            payload.issues.push({
                code: "invalid_type",
                expected: cls.name,
                input: payload.value,
                inst,
                path: [...(inst._zod.def.path ?? [])],
            });
        }
    };
    return inst;
}

// stringbool
const stringbool = (...args) => core._stringbool({
    Codec: ZodCodec,
    Boolean: ZodBoolean,
    String: ZodString,
}, ...args);
function json(params) {
    const jsonSchema = lazy(() => {
        return union([string(params), number(), schemas_boolean(), _null(), array(jsonSchema), record(string(), jsonSchema)]);
    });
    return jsonSchema;
}
// preprocess
function preprocess(fn, schema) {
    return new ZodPreprocess({
        type: "pipe",
        in: transform(fn),
        out: schema,
    });
}


/***/ }),

/***/ 40610:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   $O: () => (/* binding */ _ipv6),
/* harmony export */   $S: () => (/* binding */ _startsWith),
/* harmony export */   Au: () => (/* binding */ _lt),
/* harmony export */   Be: () => (/* binding */ _uuid),
/* harmony export */   Bj: () => (/* binding */ _cuid2),
/* harmony export */   Ct: () => (/* binding */ _ulid),
/* harmony export */   Dl: () => (/* binding */ _nanoid),
/* harmony export */   ER: () => (/* binding */ _endsWith),
/* harmony export */   Eb: () => (/* binding */ _maxLength),
/* harmony export */   F7: () => (/* binding */ _number),
/* harmony export */   FO: () => (/* binding */ _custom),
/* harmony export */   Fk: () => (/* binding */ _regex),
/* harmony export */   Fn: () => (/* binding */ _url),
/* harmony export */   G1: () => (/* binding */ _isoDateTime),
/* harmony export */   G8: () => (/* binding */ _never),
/* harmony export */   Hi: () => (/* binding */ _multipleOf),
/* harmony export */   Il: () => (/* binding */ _toLowerCase),
/* harmony export */   KA: () => (/* binding */ _any),
/* harmony export */   KB: () => (/* binding */ _e164),
/* harmony export */   Kn: () => (/* binding */ _isoTime),
/* harmony export */   LK: () => (/* binding */ _int),
/* harmony export */   MB: () => (/* binding */ _superRefine),
/* harmony export */   Mu: () => (/* binding */ _email),
/* harmony export */   Ny: () => (/* binding */ _ipv4),
/* harmony export */   OC: () => (/* binding */ _void),
/* harmony export */   Pw: () => (/* binding */ _xid),
/* harmony export */   Rl: () => (/* binding */ _string),
/* harmony export */   TL: () => (/* binding */ _slugify),
/* harmony export */   Tx: () => (/* binding */ _gt),
/* harmony export */   Uy: () => (/* binding */ _cidrv4),
/* harmony export */   WN: () => (/* binding */ _trim),
/* harmony export */   YA: () => (/* binding */ _length),
/* harmony export */   YY: () => (/* binding */ _date),
/* harmony export */   Zm: () => (/* binding */ _lte),
/* harmony export */   _L: () => (/* binding */ _boolean),
/* harmony export */   _z: () => (/* binding */ _ksuid),
/* harmony export */   aC: () => (/* binding */ _emoji),
/* harmony export */   bS: () => (/* binding */ _overwrite),
/* harmony export */   cU: () => (/* binding */ _base64url),
/* harmony export */   dN: () => (/* binding */ _coercedBoolean),
/* harmony export */   dR: () => (/* binding */ _includes),
/* harmony export */   dZ: () => (/* binding */ _array),
/* harmony export */   db: () => (/* binding */ _isoDate),
/* harmony export */   em: () => (/* binding */ _unknown),
/* harmony export */   f2: () => (/* binding */ _isoDuration),
/* harmony export */   fU: () => (/* binding */ _refine),
/* harmony export */   fs: () => (/* binding */ _cuid),
/* harmony export */   gP: () => (/* binding */ _cidrv6),
/* harmony export */   hH: () => (/* binding */ _lowercase),
/* harmony export */   lo: () => (/* binding */ _normalize),
/* harmony export */   m9: () => (/* binding */ _minLength),
/* harmony export */   mI: () => (/* binding */ meta),
/* harmony export */   nA: () => (/* binding */ _uuidv4),
/* harmony export */   pY: () => (/* binding */ _uuidv6),
/* harmony export */   q0: () => (/* binding */ describe),
/* harmony export */   qF: () => (/* binding */ _uppercase),
/* harmony export */   qm: () => (/* binding */ _gte),
/* harmony export */   rk: () => (/* binding */ _jwt),
/* harmony export */   rt: () => (/* binding */ _base64),
/* harmony export */   tB: () => (/* binding */ _guid),
/* harmony export */   wA: () => (/* binding */ _uuidv7),
/* harmony export */   xY: () => (/* binding */ _toUpperCase)
/* harmony export */ });
/* unused harmony exports _coercedString, _mac, TimePrecision, _coercedNumber, _float32, _float64, _int32, _uint32, _bigint, _coercedBigint, _int64, _uint64, _symbol, _undefined, _null, _coercedDate, _nan, _max, _min, _positive, _negative, _nonpositive, _nonnegative, _maxSize, _minSize, _size, _property, _mime, _union, _xor, _discriminatedUnion, _intersection, _tuple, _record, _map, _set, _enum, _nativeEnum, _literal, _file, _transform, _optional, _nullable, _default, _nonoptional, _success, _catch, _pipe, _readonly, _templateLiteral, _lazy, _promise, _check, _stringbool, _stringFormat */
/* harmony import */ var _checks_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(18941);
/* harmony import */ var _registries_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(62687);
/* harmony import */ var _util_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(92220);




// @__NO_SIDE_EFFECTS__
function _string(Class, params) {
    return new Class({
        type: "string",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _coercedString(Class, params) {
    return new Class({
        type: "string",
        coerce: true,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _email(Class, params) {
    return new Class({
        type: "string",
        format: "email",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _guid(Class, params) {
    return new Class({
        type: "string",
        format: "guid",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _uuid(Class, params) {
    return new Class({
        type: "string",
        format: "uuid",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _uuidv4(Class, params) {
    return new Class({
        type: "string",
        format: "uuid",
        check: "string_format",
        abort: false,
        version: "v4",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _uuidv6(Class, params) {
    return new Class({
        type: "string",
        format: "uuid",
        check: "string_format",
        abort: false,
        version: "v6",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _uuidv7(Class, params) {
    return new Class({
        type: "string",
        format: "uuid",
        check: "string_format",
        abort: false,
        version: "v7",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _url(Class, params) {
    return new Class({
        type: "string",
        format: "url",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _emoji(Class, params) {
    return new Class({
        type: "string",
        format: "emoji",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _nanoid(Class, params) {
    return new Class({
        type: "string",
        format: "nanoid",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link _cuid2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
// @__NO_SIDE_EFFECTS__
function _cuid(Class, params) {
    return new Class({
        type: "string",
        format: "cuid",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _cuid2(Class, params) {
    return new Class({
        type: "string",
        format: "cuid2",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _ulid(Class, params) {
    return new Class({
        type: "string",
        format: "ulid",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _xid(Class, params) {
    return new Class({
        type: "string",
        format: "xid",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _ksuid(Class, params) {
    return new Class({
        type: "string",
        format: "ksuid",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _ipv4(Class, params) {
    return new Class({
        type: "string",
        format: "ipv4",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _ipv6(Class, params) {
    return new Class({
        type: "string",
        format: "ipv6",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _mac(Class, params) {
    return new Class({
        type: "string",
        format: "mac",
        check: "string_format",
        abort: false,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _cidrv4(Class, params) {
    return new Class({
        type: "string",
        format: "cidrv4",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _cidrv6(Class, params) {
    return new Class({
        type: "string",
        format: "cidrv6",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _base64(Class, params) {
    return new Class({
        type: "string",
        format: "base64",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _base64url(Class, params) {
    return new Class({
        type: "string",
        format: "base64url",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _e164(Class, params) {
    return new Class({
        type: "string",
        format: "e164",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _jwt(Class, params) {
    return new Class({
        type: "string",
        format: "jwt",
        check: "string_format",
        abort: false,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
const TimePrecision = {
    Any: null,
    Minute: -1,
    Second: 0,
    Millisecond: 3,
    Microsecond: 6,
};
// @__NO_SIDE_EFFECTS__
function _isoDateTime(Class, params) {
    return new Class({
        type: "string",
        format: "datetime",
        check: "string_format",
        offset: false,
        local: false,
        precision: null,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _isoDate(Class, params) {
    return new Class({
        type: "string",
        format: "date",
        check: "string_format",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _isoTime(Class, params) {
    return new Class({
        type: "string",
        format: "time",
        check: "string_format",
        precision: null,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _isoDuration(Class, params) {
    return new Class({
        type: "string",
        format: "duration",
        check: "string_format",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _number(Class, params) {
    return new Class({
        type: "number",
        checks: [],
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _coercedNumber(Class, params) {
    return new Class({
        type: "number",
        coerce: true,
        checks: [],
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _int(Class, params) {
    return new Class({
        type: "number",
        check: "number_format",
        abort: false,
        format: "safeint",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _float32(Class, params) {
    return new Class({
        type: "number",
        check: "number_format",
        abort: false,
        format: "float32",
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _float64(Class, params) {
    return new Class({
        type: "number",
        check: "number_format",
        abort: false,
        format: "float64",
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _int32(Class, params) {
    return new Class({
        type: "number",
        check: "number_format",
        abort: false,
        format: "int32",
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _uint32(Class, params) {
    return new Class({
        type: "number",
        check: "number_format",
        abort: false,
        format: "uint32",
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _boolean(Class, params) {
    return new Class({
        type: "boolean",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _coercedBoolean(Class, params) {
    return new Class({
        type: "boolean",
        coerce: true,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _bigint(Class, params) {
    return new Class({
        type: "bigint",
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _coercedBigint(Class, params) {
    return new Class({
        type: "bigint",
        coerce: true,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _int64(Class, params) {
    return new Class({
        type: "bigint",
        check: "bigint_format",
        abort: false,
        format: "int64",
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _uint64(Class, params) {
    return new Class({
        type: "bigint",
        check: "bigint_format",
        abort: false,
        format: "uint64",
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _symbol(Class, params) {
    return new Class({
        type: "symbol",
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _undefined(Class, params) {
    return new Class({
        type: "undefined",
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _null(Class, params) {
    return new Class({
        type: "null",
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _any(Class) {
    return new Class({
        type: "any",
    });
}
// @__NO_SIDE_EFFECTS__
function _unknown(Class) {
    return new Class({
        type: "unknown",
    });
}
// @__NO_SIDE_EFFECTS__
function _never(Class, params) {
    return new Class({
        type: "never",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _void(Class, params) {
    return new Class({
        type: "void",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _date(Class, params) {
    return new Class({
        type: "date",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _coercedDate(Class, params) {
    return new Class({
        type: "date",
        coerce: true,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _nan(Class, params) {
    return new Class({
        type: "nan",
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _lt(value, params) {
    return new _checks_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodCheckLessThan */ .sm({
        check: "less_than",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
        value,
        inclusive: false,
    });
}
// @__NO_SIDE_EFFECTS__
function _lte(value, params) {
    return new _checks_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodCheckLessThan */ .sm({
        check: "less_than",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
        value,
        inclusive: true,
    });
}

// @__NO_SIDE_EFFECTS__
function _gt(value, params) {
    return new _checks_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodCheckGreaterThan */ .J_({
        check: "greater_than",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
        value,
        inclusive: false,
    });
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
    return new _checks_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodCheckGreaterThan */ .J_({
        check: "greater_than",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
        value,
        inclusive: true,
    });
}

// @__NO_SIDE_EFFECTS__
function _positive(params) {
    return _gt(0, params);
}
// negative
// @__NO_SIDE_EFFECTS__
function _negative(params) {
    return _lt(0, params);
}
// nonpositive
// @__NO_SIDE_EFFECTS__
function _nonpositive(params) {
    return _lte(0, params);
}
// nonnegative
// @__NO_SIDE_EFFECTS__
function _nonnegative(params) {
    return _gte(0, params);
}
// @__NO_SIDE_EFFECTS__
function _multipleOf(value, params) {
    return new _checks_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodCheckMultipleOf */ .Jk({
        check: "multiple_of",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
        value,
    });
}
// @__NO_SIDE_EFFECTS__
function _maxSize(maximum, params) {
    return new checks.$ZodCheckMaxSize({
        check: "max_size",
        ...util.normalizeParams(params),
        maximum,
    });
}
// @__NO_SIDE_EFFECTS__
function _minSize(minimum, params) {
    return new checks.$ZodCheckMinSize({
        check: "min_size",
        ...util.normalizeParams(params),
        minimum,
    });
}
// @__NO_SIDE_EFFECTS__
function _size(size, params) {
    return new checks.$ZodCheckSizeEquals({
        check: "size_equals",
        ...util.normalizeParams(params),
        size,
    });
}
// @__NO_SIDE_EFFECTS__
function _maxLength(maximum, params) {
    const ch = new _checks_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodCheckMaxLength */ .Yk({
        check: "max_length",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
        maximum,
    });
    return ch;
}
// @__NO_SIDE_EFFECTS__
function _minLength(minimum, params) {
    return new _checks_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodCheckMinLength */ .Kk({
        check: "min_length",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
        minimum,
    });
}
// @__NO_SIDE_EFFECTS__
function _length(length, params) {
    return new _checks_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodCheckLengthEquals */ .RM({
        check: "length_equals",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
        length,
    });
}
// @__NO_SIDE_EFFECTS__
function _regex(pattern, params) {
    return new _checks_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodCheckRegex */ .DG({
        check: "string_format",
        format: "regex",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
        pattern,
    });
}
// @__NO_SIDE_EFFECTS__
function _lowercase(params) {
    return new _checks_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodCheckLowerCase */ .NI({
        check: "string_format",
        format: "lowercase",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _uppercase(params) {
    return new _checks_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodCheckUpperCase */ .kH({
        check: "string_format",
        format: "uppercase",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _includes(includes, params) {
    return new _checks_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodCheckIncludes */ .Tt({
        check: "string_format",
        format: "includes",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
        includes,
    });
}
// @__NO_SIDE_EFFECTS__
function _startsWith(prefix, params) {
    return new _checks_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodCheckStartsWith */ .J({
        check: "string_format",
        format: "starts_with",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
        prefix,
    });
}
// @__NO_SIDE_EFFECTS__
function _endsWith(suffix, params) {
    return new _checks_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodCheckEndsWith */ .E6({
        check: "string_format",
        format: "ends_with",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
        suffix,
    });
}
// @__NO_SIDE_EFFECTS__
function _property(property, schema, params) {
    return new checks.$ZodCheckProperty({
        check: "property",
        property,
        schema,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _mime(types, params) {
    return new checks.$ZodCheckMimeType({
        check: "mime_type",
        mime: types,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _overwrite(tx) {
    return new _checks_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodCheckOverwrite */ .v$({
        check: "overwrite",
        tx,
    });
}
// normalize
// @__NO_SIDE_EFFECTS__
function _normalize(form) {
    return _overwrite((input) => input.normalize(form));
}
// trim
// @__NO_SIDE_EFFECTS__
function _trim() {
    return _overwrite((input) => input.trim());
}
// toLowerCase
// @__NO_SIDE_EFFECTS__
function _toLowerCase() {
    return _overwrite((input) => input.toLowerCase());
}
// toUpperCase
// @__NO_SIDE_EFFECTS__
function _toUpperCase() {
    return _overwrite((input) => input.toUpperCase());
}
// slugify
// @__NO_SIDE_EFFECTS__
function _slugify() {
    return _overwrite((input) => _util_js__WEBPACK_IMPORTED_MODULE_0__/* .slugify */ .Yv(input));
}
// @__NO_SIDE_EFFECTS__
function _array(Class, element, params) {
    return new Class({
        type: "array",
        element,
        // get element() {
        //   return element;
        // },
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _union(Class, options, params) {
    return new Class({
        type: "union",
        options,
        ...util.normalizeParams(params),
    });
}
function _xor(Class, options, params) {
    return new Class({
        type: "union",
        options,
        inclusive: false,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _discriminatedUnion(Class, discriminator, options, params) {
    return new Class({
        type: "union",
        options,
        discriminator,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _intersection(Class, left, right) {
    return new Class({
        type: "intersection",
        left,
        right,
    });
}
// export function _tuple(
//   Class: util.SchemaClass<schemas.$ZodTuple>,
//   items: [],
//   params?: string | $ZodTupleParams
// ): schemas.$ZodTuple<[], null>;
// @__NO_SIDE_EFFECTS__
function _tuple(Class, items, _paramsOrRest, _params) {
    const hasRest = _paramsOrRest instanceof schemas.$ZodType;
    const params = hasRest ? _params : _paramsOrRest;
    const rest = hasRest ? _paramsOrRest : null;
    return new Class({
        type: "tuple",
        items,
        rest,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _record(Class, keyType, valueType, params) {
    return new Class({
        type: "record",
        keyType,
        valueType,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _map(Class, keyType, valueType, params) {
    return new Class({
        type: "map",
        keyType,
        valueType,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _set(Class, valueType, params) {
    return new Class({
        type: "set",
        valueType,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _enum(Class, values, params) {
    const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
    // if (Array.isArray(values)) {
    //   for (const value of values) {
    //     entries[value] = value;
    //   }
    // } else {
    //   Object.assign(entries, values);
    // }
    // const entries: util.EnumLike = {};
    // for (const val of values) {
    //   entries[val] = val;
    // }
    return new Class({
        type: "enum",
        entries,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
/** @deprecated This API has been merged into `z.enum()`. Use `z.enum()` instead.
 *
 * ```ts
 * enum Colors { red, green, blue }
 * z.enum(Colors);
 * ```
 */
function _nativeEnum(Class, entries, params) {
    return new Class({
        type: "enum",
        entries,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _literal(Class, value, params) {
    return new Class({
        type: "literal",
        values: Array.isArray(value) ? value : [value],
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _file(Class, params) {
    return new Class({
        type: "file",
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _transform(Class, fn) {
    return new Class({
        type: "transform",
        transform: fn,
    });
}
// @__NO_SIDE_EFFECTS__
function _optional(Class, innerType) {
    return new Class({
        type: "optional",
        innerType,
    });
}
// @__NO_SIDE_EFFECTS__
function _nullable(Class, innerType) {
    return new Class({
        type: "nullable",
        innerType,
    });
}
// @__NO_SIDE_EFFECTS__
function _default(Class, innerType, defaultValue) {
    return new Class({
        type: "default",
        innerType,
        get defaultValue() {
            return typeof defaultValue === "function" ? defaultValue() : util.shallowClone(defaultValue);
        },
    });
}
// @__NO_SIDE_EFFECTS__
function _nonoptional(Class, innerType, params) {
    return new Class({
        type: "nonoptional",
        innerType,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _success(Class, innerType) {
    return new Class({
        type: "success",
        innerType,
    });
}
// @__NO_SIDE_EFFECTS__
function _catch(Class, innerType, catchValue) {
    return new Class({
        type: "catch",
        innerType,
        catchValue: (typeof catchValue === "function" ? catchValue : () => catchValue),
    });
}
// @__NO_SIDE_EFFECTS__
function _pipe(Class, in_, out) {
    return new Class({
        type: "pipe",
        in: in_,
        out,
    });
}
// @__NO_SIDE_EFFECTS__
function _readonly(Class, innerType) {
    return new Class({
        type: "readonly",
        innerType,
    });
}
// @__NO_SIDE_EFFECTS__
function _templateLiteral(Class, parts, params) {
    return new Class({
        type: "template_literal",
        parts,
        ...util.normalizeParams(params),
    });
}
// @__NO_SIDE_EFFECTS__
function _lazy(Class, getter) {
    return new Class({
        type: "lazy",
        getter,
    });
}
// @__NO_SIDE_EFFECTS__
function _promise(Class, innerType) {
    return new Class({
        type: "promise",
        innerType,
    });
}
// @__NO_SIDE_EFFECTS__
function _custom(Class, fn, _params) {
    const norm = _util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(_params);
    norm.abort ?? (norm.abort = true); // default to abort:false
    const schema = new Class({
        type: "custom",
        check: "custom",
        fn: fn,
        ...norm,
    });
    return schema;
}
// same as _custom but defaults to abort:false
// @__NO_SIDE_EFFECTS__
function _refine(Class, fn, _params) {
    const schema = new Class({
        type: "custom",
        check: "custom",
        fn: fn,
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(_params),
    });
    return schema;
}
// @__NO_SIDE_EFFECTS__
function _superRefine(fn, params) {
    const ch = _check((payload) => {
        payload.addIssue = (issue) => {
            if (typeof issue === "string") {
                payload.issues.push(_util_js__WEBPACK_IMPORTED_MODULE_0__/* .issue */ .sn(issue, payload.value, ch._zod.def));
            }
            else {
                // for Zod 3 backwards compatibility
                const _issue = issue;
                if (_issue.fatal)
                    _issue.continue = false;
                _issue.code ?? (_issue.code = "custom");
                _issue.input ?? (_issue.input = payload.value);
                _issue.inst ?? (_issue.inst = ch);
                _issue.continue ?? (_issue.continue = !ch._zod.def.abort); // abort is always undefined, so this is always true...
                payload.issues.push(_util_js__WEBPACK_IMPORTED_MODULE_0__/* .issue */ .sn(_issue));
            }
        };
        return fn(payload.value, payload);
    }, params);
    return ch;
}
// @__NO_SIDE_EFFECTS__
function _check(fn, params) {
    const ch = new _checks_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodCheck */ .QP({
        check: "custom",
        ..._util_js__WEBPACK_IMPORTED_MODULE_0__/* .normalizeParams */ .A2(params),
    });
    ch._zod.check = fn;
    return ch;
}
// @__NO_SIDE_EFFECTS__
function describe(description) {
    const ch = new _checks_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodCheck */ .QP({ check: "describe" });
    ch._zod.onattach = [
        (inst) => {
            const existing = _registries_js__WEBPACK_IMPORTED_MODULE_2__/* .globalRegistry */ .fd.get(inst) ?? {};
            _registries_js__WEBPACK_IMPORTED_MODULE_2__/* .globalRegistry */ .fd.add(inst, { ...existing, description });
        },
    ];
    ch._zod.check = () => { }; // no-op check
    return ch;
}
// @__NO_SIDE_EFFECTS__
function meta(metadata) {
    const ch = new _checks_js__WEBPACK_IMPORTED_MODULE_1__/* .$ZodCheck */ .QP({ check: "meta" });
    ch._zod.onattach = [
        (inst) => {
            const existing = _registries_js__WEBPACK_IMPORTED_MODULE_2__/* .globalRegistry */ .fd.get(inst) ?? {};
            _registries_js__WEBPACK_IMPORTED_MODULE_2__/* .globalRegistry */ .fd.add(inst, { ...existing, ...metadata });
        },
    ];
    ch._zod.check = () => { }; // no-op check
    return ch;
}
// @__NO_SIDE_EFFECTS__
function _stringbool(Classes, _params) {
    const params = util.normalizeParams(_params);
    let truthyArray = params.truthy ?? ["true", "1", "yes", "on", "y", "enabled"];
    let falsyArray = params.falsy ?? ["false", "0", "no", "off", "n", "disabled"];
    if (params.case !== "sensitive") {
        truthyArray = truthyArray.map((v) => (typeof v === "string" ? v.toLowerCase() : v));
        falsyArray = falsyArray.map((v) => (typeof v === "string" ? v.toLowerCase() : v));
    }
    const truthySet = new Set(truthyArray);
    const falsySet = new Set(falsyArray);
    const _Codec = Classes.Codec ?? schemas.$ZodCodec;
    const _Boolean = Classes.Boolean ?? schemas.$ZodBoolean;
    const _String = Classes.String ?? schemas.$ZodString;
    const stringSchema = new _String({ type: "string", error: params.error });
    const booleanSchema = new _Boolean({ type: "boolean", error: params.error });
    const codec = new _Codec({
        type: "pipe",
        in: stringSchema,
        out: booleanSchema,
        transform: ((input, payload) => {
            let data = input;
            if (params.case !== "sensitive")
                data = data.toLowerCase();
            if (truthySet.has(data)) {
                return true;
            }
            else if (falsySet.has(data)) {
                return false;
            }
            else {
                payload.issues.push({
                    code: "invalid_value",
                    expected: "stringbool",
                    values: [...truthySet, ...falsySet],
                    input: payload.value,
                    inst: codec,
                    continue: false,
                });
                return {};
            }
        }),
        reverseTransform: ((input, _payload) => {
            if (input === true) {
                return truthyArray[0] || "true";
            }
            else {
                return falsyArray[0] || "false";
            }
        }),
        error: params.error,
    });
    return codec;
}
// @__NO_SIDE_EFFECTS__
function _stringFormat(Class, format, fnOrRegex, _params = {}) {
    const params = util.normalizeParams(_params);
    const def = {
        ...util.normalizeParams(_params),
        check: "string_format",
        type: "string",
        format,
        fn: typeof fnOrRegex === "function" ? fnOrRegex : (val) => fnOrRegex.test(val),
        ...params,
    };
    if (fnOrRegex instanceof RegExp) {
        def.pattern = fnOrRegex;
    }
    const inst = new Class(def);
    return inst;
}


/***/ }),

/***/ 18941:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DG: () => (/* binding */ $ZodCheckRegex),
/* harmony export */   E6: () => (/* binding */ $ZodCheckEndsWith),
/* harmony export */   J: () => (/* binding */ $ZodCheckStartsWith),
/* harmony export */   J_: () => (/* binding */ $ZodCheckGreaterThan),
/* harmony export */   Jk: () => (/* binding */ $ZodCheckMultipleOf),
/* harmony export */   KH: () => (/* binding */ $ZodCheckNumberFormat),
/* harmony export */   Kk: () => (/* binding */ $ZodCheckMinLength),
/* harmony export */   NI: () => (/* binding */ $ZodCheckLowerCase),
/* harmony export */   QP: () => (/* binding */ $ZodCheck),
/* harmony export */   RM: () => (/* binding */ $ZodCheckLengthEquals),
/* harmony export */   Tt: () => (/* binding */ $ZodCheckIncludes),
/* harmony export */   Yk: () => (/* binding */ $ZodCheckMaxLength),
/* harmony export */   kH: () => (/* binding */ $ZodCheckUpperCase),
/* harmony export */   ql: () => (/* binding */ $ZodCheckStringFormat),
/* harmony export */   sm: () => (/* binding */ $ZodCheckLessThan),
/* harmony export */   v$: () => (/* binding */ $ZodCheckOverwrite)
/* harmony export */ });
/* unused harmony exports $ZodCheckBigIntFormat, $ZodCheckMaxSize, $ZodCheckMinSize, $ZodCheckSizeEquals, $ZodCheckProperty, $ZodCheckMimeType */
/* harmony import */ var _core_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(67415);
/* harmony import */ var _regexes_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(94157);
/* harmony import */ var _util_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(92220);
// import { $ZodType } from "./schemas.js";



const $ZodCheck = /*@__PURE__*/ _core_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("$ZodCheck", (inst, def) => {
    var _a;
    inst._zod ?? (inst._zod = {});
    inst._zod.def = def;
    (_a = inst._zod).onattach ?? (_a.onattach = []);
});
const numericOriginMap = {
    number: "number",
    bigint: "bigint",
    object: "date",
};
const $ZodCheckLessThan = /*@__PURE__*/ _core_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("$ZodCheckLessThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
        if (def.value < curr) {
            if (def.inclusive)
                bag.maximum = def.value;
            else
                bag.exclusiveMaximum = def.value;
        }
    });
    inst._zod.check = (payload) => {
        if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
            return;
        }
        payload.issues.push({
            origin,
            code: "too_big",
            maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
            input: payload.value,
            inclusive: def.inclusive,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckGreaterThan = /*@__PURE__*/ _core_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("$ZodCheckGreaterThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
        if (def.value > curr) {
            if (def.inclusive)
                bag.minimum = def.value;
            else
                bag.exclusiveMinimum = def.value;
        }
    });
    inst._zod.check = (payload) => {
        if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
            return;
        }
        payload.issues.push({
            origin,
            code: "too_small",
            minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
            input: payload.value,
            inclusive: def.inclusive,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckMultipleOf = 
/*@__PURE__*/ _core_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("$ZodCheckMultipleOf", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst) => {
        var _a;
        (_a = inst._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
    });
    inst._zod.check = (payload) => {
        if (typeof payload.value !== typeof def.value)
            throw new Error("Cannot mix number and bigint in multiple_of check.");
        const isMultiple = typeof payload.value === "bigint"
            ? payload.value % def.value === BigInt(0)
            : _util_js__WEBPACK_IMPORTED_MODULE_1__/* .floatSafeRemainder */ .LG(payload.value, def.value) === 0;
        if (isMultiple)
            return;
        payload.issues.push({
            origin: typeof payload.value,
            code: "not_multiple_of",
            divisor: def.value,
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckNumberFormat = /*@__PURE__*/ _core_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("$ZodCheckNumberFormat", (inst, def) => {
    $ZodCheck.init(inst, def); // no format checks
    def.format = def.format || "float64";
    const isInt = def.format?.includes("int");
    const origin = isInt ? "int" : "number";
    const [minimum, maximum] = _util_js__WEBPACK_IMPORTED_MODULE_1__/* .NUMBER_FORMAT_RANGES */ .zH[def.format];
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        bag.format = def.format;
        bag.minimum = minimum;
        bag.maximum = maximum;
        if (isInt)
            bag.pattern = _regexes_js__WEBPACK_IMPORTED_MODULE_2__/* .integer */ .nd;
    });
    inst._zod.check = (payload) => {
        const input = payload.value;
        if (isInt) {
            if (!Number.isInteger(input)) {
                // invalid_format issue
                // payload.issues.push({
                //   expected: def.format,
                //   format: def.format,
                //   code: "invalid_format",
                //   input,
                //   inst,
                // });
                // invalid_type issue
                payload.issues.push({
                    expected: origin,
                    format: def.format,
                    code: "invalid_type",
                    continue: false,
                    input,
                    inst,
                });
                return;
                // not_multiple_of issue
                // payload.issues.push({
                //   code: "not_multiple_of",
                //   origin: "number",
                //   input,
                //   inst,
                //   divisor: 1,
                // });
            }
            if (!Number.isSafeInteger(input)) {
                if (input > 0) {
                    // too_big
                    payload.issues.push({
                        input,
                        code: "too_big",
                        maximum: Number.MAX_SAFE_INTEGER,
                        note: "Integers must be within the safe integer range.",
                        inst,
                        origin,
                        inclusive: true,
                        continue: !def.abort,
                    });
                }
                else {
                    // too_small
                    payload.issues.push({
                        input,
                        code: "too_small",
                        minimum: Number.MIN_SAFE_INTEGER,
                        note: "Integers must be within the safe integer range.",
                        inst,
                        origin,
                        inclusive: true,
                        continue: !def.abort,
                    });
                }
                return;
            }
        }
        if (input < minimum) {
            payload.issues.push({
                origin: "number",
                input,
                code: "too_small",
                minimum,
                inclusive: true,
                inst,
                continue: !def.abort,
            });
        }
        if (input > maximum) {
            payload.issues.push({
                origin: "number",
                input,
                code: "too_big",
                maximum,
                inclusive: true,
                inst,
                continue: !def.abort,
            });
        }
    };
});
const $ZodCheckBigIntFormat = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodCheckBigIntFormat", (inst, def) => {
    $ZodCheck.init(inst, def); // no format checks
    const [minimum, maximum] = util.BIGINT_FORMAT_RANGES[def.format];
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        bag.format = def.format;
        bag.minimum = minimum;
        bag.maximum = maximum;
    });
    inst._zod.check = (payload) => {
        const input = payload.value;
        if (input < minimum) {
            payload.issues.push({
                origin: "bigint",
                input,
                code: "too_small",
                minimum: minimum,
                inclusive: true,
                inst,
                continue: !def.abort,
            });
        }
        if (input > maximum) {
            payload.issues.push({
                origin: "bigint",
                input,
                code: "too_big",
                maximum,
                inclusive: true,
                inst,
                continue: !def.abort,
            });
        }
    };
})));
const $ZodCheckMaxSize = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodCheckMaxSize", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = (payload) => {
        const val = payload.value;
        return !util.nullish(val) && val.size !== undefined;
    });
    inst._zod.onattach.push((inst) => {
        const curr = (inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY);
        if (def.maximum < curr)
            inst._zod.bag.maximum = def.maximum;
    });
    inst._zod.check = (payload) => {
        const input = payload.value;
        const size = input.size;
        if (size <= def.maximum)
            return;
        payload.issues.push({
            origin: util.getSizableOrigin(input),
            code: "too_big",
            maximum: def.maximum,
            inclusive: true,
            input,
            inst,
            continue: !def.abort,
        });
    };
})));
const $ZodCheckMinSize = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodCheckMinSize", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = (payload) => {
        const val = payload.value;
        return !util.nullish(val) && val.size !== undefined;
    });
    inst._zod.onattach.push((inst) => {
        const curr = (inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY);
        if (def.minimum > curr)
            inst._zod.bag.minimum = def.minimum;
    });
    inst._zod.check = (payload) => {
        const input = payload.value;
        const size = input.size;
        if (size >= def.minimum)
            return;
        payload.issues.push({
            origin: util.getSizableOrigin(input),
            code: "too_small",
            minimum: def.minimum,
            inclusive: true,
            input,
            inst,
            continue: !def.abort,
        });
    };
})));
const $ZodCheckSizeEquals = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodCheckSizeEquals", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = (payload) => {
        const val = payload.value;
        return !util.nullish(val) && val.size !== undefined;
    });
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        bag.minimum = def.size;
        bag.maximum = def.size;
        bag.size = def.size;
    });
    inst._zod.check = (payload) => {
        const input = payload.value;
        const size = input.size;
        if (size === def.size)
            return;
        const tooBig = size > def.size;
        payload.issues.push({
            origin: util.getSizableOrigin(input),
            ...(tooBig ? { code: "too_big", maximum: def.size } : { code: "too_small", minimum: def.size }),
            inclusive: true,
            exact: true,
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
})));
const $ZodCheckMaxLength = /*@__PURE__*/ _core_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("$ZodCheckMaxLength", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = (payload) => {
        const val = payload.value;
        return !_util_js__WEBPACK_IMPORTED_MODULE_1__/* .nullish */ .cl(val) && val.length !== undefined;
    });
    inst._zod.onattach.push((inst) => {
        const curr = (inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY);
        if (def.maximum < curr)
            inst._zod.bag.maximum = def.maximum;
    });
    inst._zod.check = (payload) => {
        const input = payload.value;
        const length = input.length;
        if (length <= def.maximum)
            return;
        const origin = _util_js__WEBPACK_IMPORTED_MODULE_1__/* .getLengthableOrigin */ .Rc(input);
        payload.issues.push({
            origin,
            code: "too_big",
            maximum: def.maximum,
            inclusive: true,
            input,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckMinLength = /*@__PURE__*/ _core_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("$ZodCheckMinLength", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = (payload) => {
        const val = payload.value;
        return !_util_js__WEBPACK_IMPORTED_MODULE_1__/* .nullish */ .cl(val) && val.length !== undefined;
    });
    inst._zod.onattach.push((inst) => {
        const curr = (inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY);
        if (def.minimum > curr)
            inst._zod.bag.minimum = def.minimum;
    });
    inst._zod.check = (payload) => {
        const input = payload.value;
        const length = input.length;
        if (length >= def.minimum)
            return;
        const origin = _util_js__WEBPACK_IMPORTED_MODULE_1__/* .getLengthableOrigin */ .Rc(input);
        payload.issues.push({
            origin,
            code: "too_small",
            minimum: def.minimum,
            inclusive: true,
            input,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckLengthEquals = /*@__PURE__*/ _core_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("$ZodCheckLengthEquals", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = (payload) => {
        const val = payload.value;
        return !_util_js__WEBPACK_IMPORTED_MODULE_1__/* .nullish */ .cl(val) && val.length !== undefined;
    });
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        bag.minimum = def.length;
        bag.maximum = def.length;
        bag.length = def.length;
    });
    inst._zod.check = (payload) => {
        const input = payload.value;
        const length = input.length;
        if (length === def.length)
            return;
        const origin = _util_js__WEBPACK_IMPORTED_MODULE_1__/* .getLengthableOrigin */ .Rc(input);
        const tooBig = length > def.length;
        payload.issues.push({
            origin,
            ...(tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length }),
            inclusive: true,
            exact: true,
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckStringFormat = /*@__PURE__*/ _core_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("$ZodCheckStringFormat", (inst, def) => {
    var _a, _b;
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        bag.format = def.format;
        if (def.pattern) {
            bag.patterns ?? (bag.patterns = new Set());
            bag.patterns.add(def.pattern);
        }
    });
    if (def.pattern)
        (_a = inst._zod).check ?? (_a.check = (payload) => {
            def.pattern.lastIndex = 0;
            if (def.pattern.test(payload.value))
                return;
            payload.issues.push({
                origin: "string",
                code: "invalid_format",
                format: def.format,
                input: payload.value,
                ...(def.pattern ? { pattern: def.pattern.toString() } : {}),
                inst,
                continue: !def.abort,
            });
        });
    else
        (_b = inst._zod).check ?? (_b.check = () => { });
});
const $ZodCheckRegex = /*@__PURE__*/ _core_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("$ZodCheckRegex", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        def.pattern.lastIndex = 0;
        if (def.pattern.test(payload.value))
            return;
        payload.issues.push({
            origin: "string",
            code: "invalid_format",
            format: "regex",
            input: payload.value,
            pattern: def.pattern.toString(),
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckLowerCase = /*@__PURE__*/ _core_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("$ZodCheckLowerCase", (inst, def) => {
    def.pattern ?? (def.pattern = _regexes_js__WEBPACK_IMPORTED_MODULE_2__/* .lowercase */ .AC);
    $ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckUpperCase = /*@__PURE__*/ _core_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("$ZodCheckUpperCase", (inst, def) => {
    def.pattern ?? (def.pattern = _regexes_js__WEBPACK_IMPORTED_MODULE_2__/* .uppercase */ .Zv);
    $ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckIncludes = /*@__PURE__*/ _core_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("$ZodCheckIncludes", (inst, def) => {
    $ZodCheck.init(inst, def);
    const escapedRegex = _util_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeRegex */ .$f(def.includes);
    const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
    def.pattern = pattern;
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        bag.patterns ?? (bag.patterns = new Set());
        bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
        if (payload.value.includes(def.includes, def.position))
            return;
        payload.issues.push({
            origin: "string",
            code: "invalid_format",
            format: "includes",
            includes: def.includes,
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckStartsWith = /*@__PURE__*/ _core_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("$ZodCheckStartsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`^${_util_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeRegex */ .$f(def.prefix)}.*`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        bag.patterns ?? (bag.patterns = new Set());
        bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
        if (payload.value.startsWith(def.prefix))
            return;
        payload.issues.push({
            origin: "string",
            code: "invalid_format",
            format: "starts_with",
            prefix: def.prefix,
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCheckEndsWith = /*@__PURE__*/ _core_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("$ZodCheckEndsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`.*${_util_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeRegex */ .$f(def.suffix)}$`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.onattach.push((inst) => {
        const bag = inst._zod.bag;
        bag.patterns ?? (bag.patterns = new Set());
        bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
        if (payload.value.endsWith(def.suffix))
            return;
        payload.issues.push({
            origin: "string",
            code: "invalid_format",
            format: "ends_with",
            suffix: def.suffix,
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
///////////////////////////////////
/////    $ZodCheckProperty    /////
///////////////////////////////////
function handleCheckPropertyResult(result, payload, property) {
    if (result.issues.length) {
        payload.issues.push(...util.prefixIssues(property, result.issues));
    }
}
const $ZodCheckProperty = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodCheckProperty", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
        const result = def.schema._zod.run({
            value: payload.value[def.property],
            issues: [],
        }, {});
        if (result instanceof Promise) {
            return result.then((result) => handleCheckPropertyResult(result, payload, def.property));
        }
        handleCheckPropertyResult(result, payload, def.property);
        return;
    };
})));
const $ZodCheckMimeType = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodCheckMimeType", (inst, def) => {
    $ZodCheck.init(inst, def);
    const mimeSet = new Set(def.mime);
    inst._zod.onattach.push((inst) => {
        inst._zod.bag.mime = def.mime;
    });
    inst._zod.check = (payload) => {
        if (mimeSet.has(payload.value.type))
            return;
        payload.issues.push({
            code: "invalid_value",
            values: def.mime,
            input: payload.value.type,
            inst,
            continue: !def.abort,
        });
    };
})));
const $ZodCheckOverwrite = /*@__PURE__*/ _core_js__WEBPACK_IMPORTED_MODULE_0__/* .$constructor */ .xI("$ZodCheckOverwrite", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
        payload.value = def.tx(payload.value);
    };
});


/***/ }),

/***/ 67415:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   $W: () => (/* binding */ config),
/* harmony export */   GT: () => (/* binding */ $ZodAsyncError),
/* harmony export */   cV: () => (/* binding */ $ZodEncodeError),
/* harmony export */   cr: () => (/* binding */ globalConfig),
/* harmony export */   tm: () => (/* binding */ NEVER),
/* harmony export */   xI: () => (/* binding */ $constructor)
/* harmony export */ });
/* unused harmony export $brand */
var _a;
/** A special constant with type `never` */
const NEVER = /*@__PURE__*/ Object.freeze({
    status: "aborted",
});
function $constructor(name, initializer, params) {
    function init(inst, def) {
        if (!inst._zod) {
            Object.defineProperty(inst, "_zod", {
                value: {
                    def,
                    constr: _,
                    traits: new Set(),
                },
                enumerable: false,
            });
        }
        if (inst._zod.traits.has(name)) {
            return;
        }
        inst._zod.traits.add(name);
        initializer(inst, def);
        // support prototype modifications
        const proto = _.prototype;
        const keys = Object.keys(proto);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            if (!(k in inst)) {
                inst[k] = proto[k].bind(inst);
            }
        }
    }
    // doesn't work if Parent has a constructor with arguments
    const Parent = params?.Parent ?? Object;
    class Definition extends Parent {
    }
    Object.defineProperty(Definition, "name", { value: name });
    function _(def) {
        var _a;
        const inst = params?.Parent ? new Definition() : this;
        init(inst, def);
        (_a = inst._zod).deferred ?? (_a.deferred = []);
        for (const fn of inst._zod.deferred) {
            fn();
        }
        return inst;
    }
    Object.defineProperty(_, "init", { value: init });
    Object.defineProperty(_, Symbol.hasInstance, {
        value: (inst) => {
            if (params?.Parent && inst instanceof params.Parent)
                return true;
            return inst?._zod?.traits?.has(name);
        },
    });
    Object.defineProperty(_, "name", { value: name });
    return _;
}
//////////////////////////////   UTILITIES   ///////////////////////////////////////
const $brand = Symbol("zod_brand");
class $ZodAsyncError extends Error {
    constructor() {
        super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
    }
}
class $ZodEncodeError extends Error {
    constructor(name) {
        super(`Encountered unidirectional transform during encode: ${name}`);
        this.name = "ZodEncodeError";
    }
}
(_a = globalThis).__zod_globalConfig ?? (_a.__zod_globalConfig = {});
const globalConfig = globalThis.__zod_globalConfig;
function config(newConfig) {
    if (newConfig)
        Object.assign(globalConfig, newConfig);
    return globalConfig;
}


/***/ }),

/***/ 46663:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   JM: () => (/* binding */ flattenError),
/* harmony export */   Kd: () => (/* binding */ $ZodRealError),
/* harmony export */   S1: () => (/* binding */ prettifyError),
/* harmony export */   Wk: () => (/* binding */ formatError),
/* harmony export */   a$: () => (/* binding */ $ZodError)
/* harmony export */ });
/* unused harmony exports treeifyError, toDotPath */
/* harmony import */ var _core_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(67415);
/* harmony import */ var _util_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(92220);


const initializer = (inst, def) => {
    inst.name = "$ZodError";
    Object.defineProperty(inst, "_zod", {
        value: inst._zod,
        enumerable: false,
    });
    Object.defineProperty(inst, "issues", {
        value: def,
        enumerable: false,
    });
    inst.message = JSON.stringify(def, _util_js__WEBPACK_IMPORTED_MODULE_0__/* .jsonStringifyReplacer */ .k8, 2);
    Object.defineProperty(inst, "toString", {
        value: () => inst.message,
        enumerable: false,
    });
};
const $ZodError = (0,_core_js__WEBPACK_IMPORTED_MODULE_1__/* .$constructor */ .xI)("$ZodError", initializer);
const $ZodRealError = (0,_core_js__WEBPACK_IMPORTED_MODULE_1__/* .$constructor */ .xI)("$ZodError", initializer, { Parent: Error });
function flattenError(error, mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of error.issues) {
        if (sub.path.length > 0) {
            fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
            fieldErrors[sub.path[0]].push(mapper(sub));
        }
        else {
            formErrors.push(mapper(sub));
        }
    }
    return { formErrors, fieldErrors };
}
function formatError(error, mapper = (issue) => issue.message) {
    const fieldErrors = { _errors: [] };
    const processError = (error, path = []) => {
        for (const issue of error.issues) {
            if (issue.code === "invalid_union" && issue.errors.length) {
                issue.errors.map((issues) => processError({ issues }, [...path, ...issue.path]));
            }
            else if (issue.code === "invalid_key") {
                processError({ issues: issue.issues }, [...path, ...issue.path]);
            }
            else if (issue.code === "invalid_element") {
                processError({ issues: issue.issues }, [...path, ...issue.path]);
            }
            else {
                const fullpath = [...path, ...issue.path];
                if (fullpath.length === 0) {
                    fieldErrors._errors.push(mapper(issue));
                }
                else {
                    let curr = fieldErrors;
                    let i = 0;
                    while (i < fullpath.length) {
                        const el = fullpath[i];
                        const terminal = i === fullpath.length - 1;
                        if (!terminal) {
                            curr[el] = curr[el] || { _errors: [] };
                        }
                        else {
                            curr[el] = curr[el] || { _errors: [] };
                            curr[el]._errors.push(mapper(issue));
                        }
                        curr = curr[el];
                        i++;
                    }
                }
            }
        }
    };
    processError(error);
    return fieldErrors;
}
function treeifyError(error, mapper = (issue) => issue.message) {
    const result = { errors: [] };
    const processError = (error, path = []) => {
        var _a, _b;
        for (const issue of error.issues) {
            if (issue.code === "invalid_union" && issue.errors.length) {
                // regular union error
                issue.errors.map((issues) => processError({ issues }, [...path, ...issue.path]));
            }
            else if (issue.code === "invalid_key") {
                processError({ issues: issue.issues }, [...path, ...issue.path]);
            }
            else if (issue.code === "invalid_element") {
                processError({ issues: issue.issues }, [...path, ...issue.path]);
            }
            else {
                const fullpath = [...path, ...issue.path];
                if (fullpath.length === 0) {
                    result.errors.push(mapper(issue));
                    continue;
                }
                let curr = result;
                let i = 0;
                while (i < fullpath.length) {
                    const el = fullpath[i];
                    const terminal = i === fullpath.length - 1;
                    if (typeof el === "string") {
                        curr.properties ?? (curr.properties = {});
                        (_a = curr.properties)[el] ?? (_a[el] = { errors: [] });
                        curr = curr.properties[el];
                    }
                    else {
                        curr.items ?? (curr.items = []);
                        (_b = curr.items)[el] ?? (_b[el] = { errors: [] });
                        curr = curr.items[el];
                    }
                    if (terminal) {
                        curr.errors.push(mapper(issue));
                    }
                    i++;
                }
            }
        }
    };
    processError(error);
    return result;
}
/** Format a ZodError as a human-readable string in the following form.
 *
 * From
 *
 * ```ts
 * ZodError {
 *   issues: [
 *     {
 *       expected: 'string',
 *       code: 'invalid_type',
 *       path: [ 'username' ],
 *       message: 'Invalid input: expected string'
 *     },
 *     {
 *       expected: 'number',
 *       code: 'invalid_type',
 *       path: [ 'favoriteNumbers', 1 ],
 *       message: 'Invalid input: expected number'
 *     }
 *   ];
 * }
 * ```
 *
 * to
 *
 * ```
 * username
 *   ✖ Expected number, received string at "username
 * favoriteNumbers[0]
 *   ✖ Invalid input: expected number
 * ```
 */
function toDotPath(_path) {
    const segs = [];
    const path = _path.map((seg) => (typeof seg === "object" ? seg.key : seg));
    for (const seg of path) {
        if (typeof seg === "number")
            segs.push(`[${seg}]`);
        else if (typeof seg === "symbol")
            segs.push(`[${JSON.stringify(String(seg))}]`);
        else if (/[^\w$]/.test(seg))
            segs.push(`[${JSON.stringify(seg)}]`);
        else {
            if (segs.length)
                segs.push(".");
            segs.push(seg);
        }
    }
    return segs.join("");
}
function prettifyError(error) {
    const lines = [];
    // sort by path length
    const issues = [...error.issues].sort((a, b) => (a.path ?? []).length - (b.path ?? []).length);
    // Process each issue
    for (const issue of issues) {
        lines.push(`✖ ${issue.message}`);
        if (issue.path?.length)
            lines.push(`  → at ${toDotPath(issue.path)}`);
    }
    // Convert Map to formatted string
    return lines.join("\n");
}


/***/ }),

/***/ 7096:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   $X: () => (/* binding */ readonlyProcessor),
/* harmony export */   $k: () => (/* binding */ optionalProcessor),
/* harmony export */   A: () => (/* binding */ prefaultProcessor),
/* harmony export */   A6: () => (/* binding */ customProcessor),
/* harmony export */   C0: () => (/* binding */ enumProcessor),
/* harmony export */   Ec: () => (/* binding */ objectProcessor),
/* harmony export */   Fl: () => (/* binding */ dateProcessor),
/* harmony export */   GC: () => (/* binding */ recordProcessor),
/* harmony export */   NV: () => (/* binding */ unknownProcessor),
/* harmony export */   NX: () => (/* binding */ anyProcessor),
/* harmony export */   Q9: () => (/* binding */ catchProcessor),
/* harmony export */   RH: () => (/* binding */ neverProcessor),
/* harmony export */   SW: () => (/* binding */ stringProcessor),
/* harmony export */   Tr: () => (/* binding */ lazyProcessor),
/* harmony export */   Wg: () => (/* binding */ numberProcessor),
/* harmony export */   Yv: () => (/* binding */ literalProcessor),
/* harmony export */   bl: () => (/* binding */ toJSONSchema),
/* harmony export */   cR: () => (/* binding */ nonoptionalProcessor),
/* harmony export */   cY: () => (/* binding */ arrayProcessor),
/* harmony export */   dO: () => (/* binding */ booleanProcessor),
/* harmony export */   fs: () => (/* binding */ pipeProcessor),
/* harmony export */   iC: () => (/* binding */ unionProcessor),
/* harmony export */   i_: () => (/* binding */ intersectionProcessor),
/* harmony export */   mh: () => (/* binding */ defaultProcessor),
/* harmony export */   vn: () => (/* binding */ voidProcessor),
/* harmony export */   xi: () => (/* binding */ transformProcessor),
/* harmony export */   yq: () => (/* binding */ nullableProcessor)
/* harmony export */ });
/* unused harmony exports bigintProcessor, symbolProcessor, nullProcessor, undefinedProcessor, nanProcessor, templateLiteralProcessor, fileProcessor, successProcessor, functionProcessor, mapProcessor, setProcessor, tupleProcessor, promiseProcessor, allProcessors */
/* harmony import */ var _to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(94610);
/* harmony import */ var _util_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(92220);


const formatMap = {
    guid: "uuid",
    url: "uri",
    datetime: "date-time",
    json_string: "json-string",
    regex: "", // do not set
};
// ==================== SIMPLE TYPE PROCESSORS ====================
const stringProcessor = (schema, ctx, _json, _params) => {
    const json = _json;
    json.type = "string";
    const { minimum, maximum, format, patterns, contentEncoding } = schema._zod
        .bag;
    if (typeof minimum === "number")
        json.minLength = minimum;
    if (typeof maximum === "number")
        json.maxLength = maximum;
    // custom pattern overrides format
    if (format) {
        json.format = formatMap[format] ?? format;
        if (json.format === "")
            delete json.format; // empty format is not valid
        // JSON Schema format: "time" requires a full time with offset or Z
        // z.iso.time() does not include timezone information, so format: "time" should never be used
        if (format === "time") {
            delete json.format;
        }
    }
    if (contentEncoding)
        json.contentEncoding = contentEncoding;
    if (patterns && patterns.size > 0) {
        const regexes = [...patterns];
        if (regexes.length === 1)
            json.pattern = regexes[0].source;
        else if (regexes.length > 1) {
            json.allOf = [
                ...regexes.map((regex) => ({
                    ...(ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0"
                        ? { type: "string" }
                        : {}),
                    pattern: regex.source,
                })),
            ];
        }
    }
};
const numberProcessor = (schema, ctx, _json, _params) => {
    const json = _json;
    const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
    if (typeof format === "string" && format.includes("int"))
        json.type = "integer";
    else
        json.type = "number";
    // when both minimum and exclusiveMinimum exist, pick the more restrictive one
    const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
    const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
    const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
    if (exMin) {
        if (legacy) {
            json.minimum = exclusiveMinimum;
            json.exclusiveMinimum = true;
        }
        else {
            json.exclusiveMinimum = exclusiveMinimum;
        }
    }
    else if (typeof minimum === "number") {
        json.minimum = minimum;
    }
    if (exMax) {
        if (legacy) {
            json.maximum = exclusiveMaximum;
            json.exclusiveMaximum = true;
        }
        else {
            json.exclusiveMaximum = exclusiveMaximum;
        }
    }
    else if (typeof maximum === "number") {
        json.maximum = maximum;
    }
    if (typeof multipleOf === "number")
        json.multipleOf = multipleOf;
};
const booleanProcessor = (_schema, _ctx, json, _params) => {
    json.type = "boolean";
};
const bigintProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("BigInt cannot be represented in JSON Schema");
    }
};
const symbolProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("Symbols cannot be represented in JSON Schema");
    }
};
const nullProcessor = (_schema, ctx, json, _params) => {
    if (ctx.target === "openapi-3.0") {
        json.type = "string";
        json.nullable = true;
        json.enum = [null];
    }
    else {
        json.type = "null";
    }
};
const undefinedProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("Undefined cannot be represented in JSON Schema");
    }
};
const voidProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("Void cannot be represented in JSON Schema");
    }
};
const neverProcessor = (_schema, _ctx, json, _params) => {
    json.not = {};
};
const anyProcessor = (_schema, _ctx, _json, _params) => {
    // empty schema accepts anything
};
const unknownProcessor = (_schema, _ctx, _json, _params) => {
    // empty schema accepts anything
};
const dateProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("Date cannot be represented in JSON Schema");
    }
};
const enumProcessor = (schema, _ctx, json, _params) => {
    const def = schema._zod.def;
    const values = (0,_util_js__WEBPACK_IMPORTED_MODULE_0__/* .getEnumValues */ .w5)(def.entries);
    // Number enums can have both string and number values
    if (values.every((v) => typeof v === "number"))
        json.type = "number";
    if (values.every((v) => typeof v === "string"))
        json.type = "string";
    json.enum = values;
};
const literalProcessor = (schema, ctx, json, _params) => {
    const def = schema._zod.def;
    const vals = [];
    for (const val of def.values) {
        if (val === undefined) {
            if (ctx.unrepresentable === "throw") {
                throw new Error("Literal `undefined` cannot be represented in JSON Schema");
            }
            else {
                // do not add to vals
            }
        }
        else if (typeof val === "bigint") {
            if (ctx.unrepresentable === "throw") {
                throw new Error("BigInt literals cannot be represented in JSON Schema");
            }
            else {
                vals.push(Number(val));
            }
        }
        else {
            vals.push(val);
        }
    }
    if (vals.length === 0) {
        // do nothing (an undefined literal was stripped)
    }
    else if (vals.length === 1) {
        const val = vals[0];
        json.type = val === null ? "null" : typeof val;
        if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
            json.enum = [val];
        }
        else {
            json.const = val;
        }
    }
    else {
        if (vals.every((v) => typeof v === "number"))
            json.type = "number";
        if (vals.every((v) => typeof v === "string"))
            json.type = "string";
        if (vals.every((v) => typeof v === "boolean"))
            json.type = "boolean";
        if (vals.every((v) => v === null))
            json.type = "null";
        json.enum = vals;
    }
};
const nanProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("NaN cannot be represented in JSON Schema");
    }
};
const templateLiteralProcessor = (schema, _ctx, json, _params) => {
    const _json = json;
    const pattern = schema._zod.pattern;
    if (!pattern)
        throw new Error("Pattern not found in template literal");
    _json.type = "string";
    _json.pattern = pattern.source;
};
const fileProcessor = (schema, _ctx, json, _params) => {
    const _json = json;
    const file = {
        type: "string",
        format: "binary",
        contentEncoding: "binary",
    };
    const { minimum, maximum, mime } = schema._zod.bag;
    if (minimum !== undefined)
        file.minLength = minimum;
    if (maximum !== undefined)
        file.maxLength = maximum;
    if (mime) {
        if (mime.length === 1) {
            file.contentMediaType = mime[0];
            Object.assign(_json, file);
        }
        else {
            Object.assign(_json, file); // shared props at root
            _json.anyOf = mime.map((m) => ({ contentMediaType: m })); // only contentMediaType differs
        }
    }
    else {
        Object.assign(_json, file);
    }
};
const successProcessor = (_schema, _ctx, json, _params) => {
    json.type = "boolean";
};
const customProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("Custom types cannot be represented in JSON Schema");
    }
};
const functionProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("Function types cannot be represented in JSON Schema");
    }
};
const transformProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("Transforms cannot be represented in JSON Schema");
    }
};
const mapProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("Map cannot be represented in JSON Schema");
    }
};
const setProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
        throw new Error("Set cannot be represented in JSON Schema");
    }
};
// ==================== COMPOSITE TYPE PROCESSORS ====================
const arrayProcessor = (schema, ctx, _json, params) => {
    const json = _json;
    const def = schema._zod.def;
    const { minimum, maximum } = schema._zod.bag;
    if (typeof minimum === "number")
        json.minItems = minimum;
    if (typeof maximum === "number")
        json.maxItems = maximum;
    json.type = "array";
    json.items = (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(def.element, ctx, {
        ...params,
        path: [...params.path, "items"],
    });
};
const objectProcessor = (schema, ctx, _json, params) => {
    const json = _json;
    const def = schema._zod.def;
    json.type = "object";
    json.properties = {};
    const shape = def.shape;
    for (const key in shape) {
        json.properties[key] = (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(shape[key], ctx, {
            ...params,
            path: [...params.path, "properties", key],
        });
    }
    // required keys
    const allKeys = new Set(Object.keys(shape));
    const requiredKeys = new Set([...allKeys].filter((key) => {
        const v = def.shape[key]._zod;
        if (ctx.io === "input") {
            return v.optin === undefined;
        }
        else {
            return v.optout === undefined;
        }
    }));
    if (requiredKeys.size > 0) {
        json.required = Array.from(requiredKeys);
    }
    // catchall
    if (def.catchall?._zod.def.type === "never") {
        // strict
        json.additionalProperties = false;
    }
    else if (!def.catchall) {
        // regular
        if (ctx.io === "output")
            json.additionalProperties = false;
    }
    else if (def.catchall) {
        json.additionalProperties = (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(def.catchall, ctx, {
            ...params,
            path: [...params.path, "additionalProperties"],
        });
    }
};
const unionProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    // Exclusive unions (inclusive === false) use oneOf (exactly one match) instead of anyOf (one or more matches)
    // This includes both z.xor() and discriminated unions
    const isExclusive = def.inclusive === false;
    const options = def.options.map((x, i) => (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(x, ctx, {
        ...params,
        path: [...params.path, isExclusive ? "oneOf" : "anyOf", i],
    }));
    if (isExclusive) {
        json.oneOf = options;
    }
    else {
        json.anyOf = options;
    }
};
const intersectionProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    const a = (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(def.left, ctx, {
        ...params,
        path: [...params.path, "allOf", 0],
    });
    const b = (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(def.right, ctx, {
        ...params,
        path: [...params.path, "allOf", 1],
    });
    const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
    const allOf = [
        ...(isSimpleIntersection(a) ? a.allOf : [a]),
        ...(isSimpleIntersection(b) ? b.allOf : [b]),
    ];
    json.allOf = allOf;
};
const tupleProcessor = (schema, ctx, _json, params) => {
    const json = _json;
    const def = schema._zod.def;
    json.type = "array";
    const prefixPath = ctx.target === "draft-2020-12" ? "prefixItems" : "items";
    const restPath = ctx.target === "draft-2020-12" ? "items" : ctx.target === "openapi-3.0" ? "items" : "additionalItems";
    const prefixItems = def.items.map((x, i) => (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(x, ctx, {
        ...params,
        path: [...params.path, prefixPath, i],
    }));
    const rest = def.rest
        ? (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(def.rest, ctx, {
            ...params,
            path: [...params.path, restPath, ...(ctx.target === "openapi-3.0" ? [def.items.length] : [])],
        })
        : null;
    if (ctx.target === "draft-2020-12") {
        json.prefixItems = prefixItems;
        if (rest) {
            json.items = rest;
        }
    }
    else if (ctx.target === "openapi-3.0") {
        json.items = {
            anyOf: prefixItems,
        };
        if (rest) {
            json.items.anyOf.push(rest);
        }
        json.minItems = prefixItems.length;
        if (!rest) {
            json.maxItems = prefixItems.length;
        }
    }
    else {
        json.items = prefixItems;
        if (rest) {
            json.additionalItems = rest;
        }
    }
    // length
    const { minimum, maximum } = schema._zod.bag;
    if (typeof minimum === "number")
        json.minItems = minimum;
    if (typeof maximum === "number")
        json.maxItems = maximum;
};
const recordProcessor = (schema, ctx, _json, params) => {
    const json = _json;
    const def = schema._zod.def;
    json.type = "object";
    // For looseRecord with regex patterns, use patternProperties
    // This correctly represents "only validate keys matching the pattern" semantics
    // and composes well with allOf (intersections)
    const keyType = def.keyType;
    const keyBag = keyType._zod.bag;
    const patterns = keyBag?.patterns;
    if (def.mode === "loose" && patterns && patterns.size > 0) {
        // Use patternProperties for looseRecord with regex patterns
        const valueSchema = (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(def.valueType, ctx, {
            ...params,
            path: [...params.path, "patternProperties", "*"],
        });
        json.patternProperties = {};
        for (const pattern of patterns) {
            json.patternProperties[pattern.source] = valueSchema;
        }
    }
    else {
        // Default behavior: use propertyNames + additionalProperties
        if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
            json.propertyNames = (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(def.keyType, ctx, {
                ...params,
                path: [...params.path, "propertyNames"],
            });
        }
        json.additionalProperties = (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(def.valueType, ctx, {
            ...params,
            path: [...params.path, "additionalProperties"],
        });
    }
    // Add required for keys with discrete values (enum, literal, etc.)
    const keyValues = keyType._zod.values;
    if (keyValues) {
        const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
        if (validKeyValues.length > 0) {
            json.required = validKeyValues;
        }
    }
};
const nullableProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    const inner = (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    if (ctx.target === "openapi-3.0") {
        seen.ref = def.innerType;
        json.nullable = true;
    }
    else {
        json.anyOf = [inner, { type: "null" }];
    }
};
const nonoptionalProcessor = (schema, ctx, _json, params) => {
    const def = schema._zod.def;
    (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
};
const defaultProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    json.default = JSON.parse(JSON.stringify(def.defaultValue));
};
const prefaultProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    if (ctx.io === "input")
        json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
};
const catchProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    let catchValue;
    try {
        catchValue = def.catchValue(undefined);
    }
    catch {
        throw new Error("Dynamic catch values are not supported in JSON Schema");
    }
    json.default = catchValue;
};
const pipeProcessor = (schema, ctx, _json, params) => {
    const def = schema._zod.def;
    const inIsTransform = def.in._zod.traits.has("$ZodTransform");
    const innerType = ctx.io === "input" ? (inIsTransform ? def.out : def.in) : def.out;
    (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = innerType;
};
const readonlyProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    json.readOnly = true;
};
const promiseProcessor = (schema, ctx, _json, params) => {
    const def = schema._zod.def;
    (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
};
const optionalProcessor = (schema, ctx, _json, params) => {
    const def = schema._zod.def;
    (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
};
const lazyProcessor = (schema, ctx, _json, params) => {
    const innerType = schema._zod.innerType;
    (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = innerType;
};
// ==================== ALL PROCESSORS ====================
const allProcessors = {
    string: stringProcessor,
    number: numberProcessor,
    boolean: booleanProcessor,
    bigint: bigintProcessor,
    symbol: symbolProcessor,
    null: nullProcessor,
    undefined: undefinedProcessor,
    void: voidProcessor,
    never: neverProcessor,
    any: anyProcessor,
    unknown: unknownProcessor,
    date: dateProcessor,
    enum: enumProcessor,
    literal: literalProcessor,
    nan: nanProcessor,
    template_literal: templateLiteralProcessor,
    file: fileProcessor,
    success: successProcessor,
    custom: customProcessor,
    function: functionProcessor,
    transform: transformProcessor,
    map: mapProcessor,
    set: setProcessor,
    array: arrayProcessor,
    object: objectProcessor,
    union: unionProcessor,
    intersection: intersectionProcessor,
    tuple: tupleProcessor,
    record: recordProcessor,
    nullable: nullableProcessor,
    nonoptional: nonoptionalProcessor,
    default: defaultProcessor,
    prefault: prefaultProcessor,
    catch: catchProcessor,
    pipe: pipeProcessor,
    readonly: readonlyProcessor,
    promise: promiseProcessor,
    optional: optionalProcessor,
    lazy: lazyProcessor,
};
function toJSONSchema(input, params) {
    if ("_idmap" in input) {
        // Registry case
        const registry = input;
        const ctx = (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .initializeContext */ .az)({ ...params, processors: allProcessors });
        const defs = {};
        // First pass: process all schemas to build the seen map
        for (const entry of registry._idmap.entries()) {
            const [_, schema] = entry;
            (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(schema, ctx);
        }
        const schemas = {};
        const external = {
            registry,
            uri: params?.uri,
            defs,
        };
        // Update the context with external configuration
        ctx.external = external;
        // Second pass: emit each schema
        for (const entry of registry._idmap.entries()) {
            const [key, schema] = entry;
            (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .extractDefs */ .Wb)(ctx, schema);
            schemas[key] = (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .finalize */ .jE)(ctx, schema);
        }
        if (Object.keys(defs).length > 0) {
            const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
            schemas.__shared = {
                [defsSegment]: defs,
            };
        }
        return { schemas };
    }
    // Single schema case
    const ctx = (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .initializeContext */ .az)({ ...params, processors: allProcessors });
    (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .process */ .eh)(input, ctx);
    (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .extractDefs */ .Wb)(ctx, input);
    return (0,_to_json_schema_js__WEBPACK_IMPORTED_MODULE_1__/* .finalize */ .jE)(ctx, input);
}


/***/ }),

/***/ 1937:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GW: () => (/* binding */ _encodeAsync),
/* harmony export */   Mv: () => (/* binding */ _encode),
/* harmony export */   Od: () => (/* binding */ _safeParse),
/* harmony export */   R3: () => (/* binding */ _safeDecodeAsync),
/* harmony export */   Rb: () => (/* binding */ _parseAsync),
/* harmony export */   Tj: () => (/* binding */ _parse),
/* harmony export */   VS: () => (/* binding */ _safeDecode),
/* harmony export */   bp: () => (/* binding */ safeParseAsync),
/* harmony export */   e2: () => (/* binding */ _decode),
/* harmony export */   or: () => (/* binding */ _decodeAsync),
/* harmony export */   rh: () => (/* binding */ _safeEncode),
/* harmony export */   v_: () => (/* binding */ _safeEncodeAsync),
/* harmony export */   wG: () => (/* binding */ _safeParseAsync),
/* harmony export */   xL: () => (/* binding */ safeParse)
/* harmony export */ });
/* unused harmony exports parse, parseAsync, encode, decode, encodeAsync, decodeAsync, safeEncode, safeDecode, safeEncodeAsync, safeDecodeAsync */
/* harmony import */ var _core_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(67415);
/* harmony import */ var _errors_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(46663);
/* harmony import */ var _util_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(92220);



const _parse = (_Err) => (schema, value, _ctx, _params) => {
    const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
    const result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise) {
        throw new _core_js__WEBPACK_IMPORTED_MODULE_0__/* .$ZodAsyncError */ .GT();
    }
    if (result.issues.length) {
        const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => _util_js__WEBPACK_IMPORTED_MODULE_1__/* .finalizeIssue */ .iR(iss, ctx, _core_js__WEBPACK_IMPORTED_MODULE_0__/* .config */ .$W())));
        _util_js__WEBPACK_IMPORTED_MODULE_1__/* .captureStackTrace */ .gx(e, _params?.callee);
        throw e;
    }
    return result.value;
};
const parse = /* @__PURE__*/ _parse(_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .$ZodRealError */ .Kd);
const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
    const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
        result = await result;
    if (result.issues.length) {
        const e = new (params?.Err ?? _Err)(result.issues.map((iss) => _util_js__WEBPACK_IMPORTED_MODULE_1__/* .finalizeIssue */ .iR(iss, ctx, _core_js__WEBPACK_IMPORTED_MODULE_0__/* .config */ .$W())));
        _util_js__WEBPACK_IMPORTED_MODULE_1__/* .captureStackTrace */ .gx(e, params?.callee);
        throw e;
    }
    return result.value;
};
const parseAsync = /* @__PURE__*/ _parseAsync(_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .$ZodRealError */ .Kd);
const _safeParse = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
    const result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise) {
        throw new _core_js__WEBPACK_IMPORTED_MODULE_0__/* .$ZodAsyncError */ .GT();
    }
    return result.issues.length
        ? {
            success: false,
            error: new (_Err ?? _errors_js__WEBPACK_IMPORTED_MODULE_2__/* .$ZodError */ .a$)(result.issues.map((iss) => _util_js__WEBPACK_IMPORTED_MODULE_1__/* .finalizeIssue */ .iR(iss, ctx, _core_js__WEBPACK_IMPORTED_MODULE_0__/* .config */ .$W()))),
        }
        : { success: true, data: result.value };
};
const safeParse = /* @__PURE__*/ _safeParse(_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .$ZodRealError */ .Kd);
const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
        result = await result;
    return result.issues.length
        ? {
            success: false,
            error: new _Err(result.issues.map((iss) => _util_js__WEBPACK_IMPORTED_MODULE_1__/* .finalizeIssue */ .iR(iss, ctx, _core_js__WEBPACK_IMPORTED_MODULE_0__/* .config */ .$W()))),
        }
        : { success: true, data: result.value };
};
const safeParseAsync = /* @__PURE__*/ _safeParseAsync(_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .$ZodRealError */ .Kd);
const _encode = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
    return _parse(_Err)(schema, value, ctx);
};
const encode = /* @__PURE__*/ _encode(_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .$ZodRealError */ .Kd);
const _decode = (_Err) => (schema, value, _ctx) => {
    return _parse(_Err)(schema, value, _ctx);
};
const decode = /* @__PURE__*/ _decode(_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .$ZodRealError */ .Kd);
const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
    return _parseAsync(_Err)(schema, value, ctx);
};
const encodeAsync = /* @__PURE__*/ _encodeAsync(_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .$ZodRealError */ .Kd);
const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
    return _parseAsync(_Err)(schema, value, _ctx);
};
const decodeAsync = /* @__PURE__*/ _decodeAsync(_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .$ZodRealError */ .Kd);
const _safeEncode = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
    return _safeParse(_Err)(schema, value, ctx);
};
const safeEncode = /* @__PURE__*/ _safeEncode(_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .$ZodRealError */ .Kd);
const _safeDecode = (_Err) => (schema, value, _ctx) => {
    return _safeParse(_Err)(schema, value, _ctx);
};
const safeDecode = /* @__PURE__*/ _safeDecode(_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .$ZodRealError */ .Kd);
const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
    return _safeParseAsync(_Err)(schema, value, ctx);
};
const safeEncodeAsync = /* @__PURE__*/ _safeEncodeAsync(_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .$ZodRealError */ .Kd);
const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
    return _safeParseAsync(_Err)(schema, value, _ctx);
};
const safeDecodeAsync = /* @__PURE__*/ _safeDecodeAsync(_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .$ZodRealError */ .Kd);


/***/ }),

/***/ 94157:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AC: () => (/* binding */ lowercase),
/* harmony export */   Ak: () => (/* binding */ nanoid),
/* harmony export */   F: () => (/* binding */ httpProtocol),
/* harmony export */   Gl: () => (/* binding */ cuid2),
/* harmony export */   K3: () => (/* binding */ base64),
/* harmony export */   Os: () => (/* binding */ guid),
/* harmony export */   Rp: () => (/* binding */ email),
/* harmony export */   Yj: () => (/* binding */ string),
/* harmony export */   Z0: () => (/* binding */ ulid),
/* harmony export */   Zg: () => (/* binding */ emoji),
/* harmony export */   Zv: () => (/* binding */ uppercase),
/* harmony export */   ai: () => (/* binding */ number),
/* harmony export */   fO: () => (/* binding */ ksuid),
/* harmony export */   gF: () => (/* binding */ cuid),
/* harmony export */   hQ: () => (/* binding */ e164),
/* harmony export */   kB: () => (/* binding */ time),
/* harmony export */   kM: () => (/* binding */ xid),
/* harmony export */   l7: () => (/* binding */ cidrv6),
/* harmony export */   nd: () => (/* binding */ integer),
/* harmony export */   p0: () => (/* binding */ duration),
/* harmony export */   p6: () => (/* binding */ date),
/* harmony export */   r0: () => (/* binding */ base64url),
/* harmony export */   uR: () => (/* binding */ uuid),
/* harmony export */   uX: () => (/* binding */ ipv4),
/* harmony export */   ug: () => (/* binding */ ipv6),
/* harmony export */   w$: () => (/* binding */ datetime),
/* harmony export */   zM: () => (/* binding */ boolean),
/* harmony export */   zr: () => (/* binding */ cidrv4)
/* harmony export */ });
/* unused harmony exports extendedDuration, uuid4, uuid6, uuid7, html5Email, rfc5322Email, unicodeEmail, idnEmail, browserEmail, mac, hostname, domain, bigint, null, undefined, hex, md5_hex, md5_base64, md5_base64url, sha1_hex, sha1_base64, sha1_base64url, sha256_hex, sha256_base64, sha256_base64url, sha384_hex, sha384_base64, sha384_base64url, sha512_hex, sha512_base64, sha512_base64url */

/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link cuid2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
const cuid = /^[cC][0-9a-z]{6,}$/;
const cuid2 = /^[0-9a-z]+$/;
const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
const xid = /^[0-9a-vA-V]{20}$/;
const ksuid = /^[A-Za-z0-9]{27}$/;
const nanoid = /^[a-zA-Z0-9_-]{21}$/;
/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
const duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
/** Implements ISO 8601-2 extensions like explicit +- prefixes, mixing weeks with other units, and fractional/negative components. */
const extendedDuration = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
/** Returns a regex for validating an RFC 9562/4122 UUID.
 *
 * @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
const uuid = (version) => {
    if (!version)
        return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
    return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
const uuid4 = /*@__PURE__*/ (/* unused pure expression or super */ null && (uuid(4)));
const uuid6 = /*@__PURE__*/ (/* unused pure expression or super */ null && (uuid(6)));
const uuid7 = /*@__PURE__*/ (/* unused pure expression or super */ null && (uuid(7)));
/** Practical email validation */
const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
/** Equivalent to the HTML5 input[type=email] validation implemented by browsers. Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email */
const html5Email = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
/** The classic emailregex.com regex for RFC 5322-compliant emails */
const rfc5322Email = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
/** A loose regex that allows Unicode characters, enforces length limits, and that's about it. */
const unicodeEmail = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u;
const idnEmail = (/* unused pure expression or super */ null && (unicodeEmail));
const browserEmail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
// from https://thekevinscott.com/emojis-in-javascript/#writing-a-regular-expression
const _emoji = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
    return new RegExp(_emoji, "u");
}
const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
const mac = (delimiter) => {
    const escapedDelim = util.escapeRegex(delimiter ?? ":");
    return new RegExp(`^(?:[0-9A-F]{2}${escapedDelim}){5}[0-9A-F]{2}$|^(?:[0-9a-f]{2}${escapedDelim}){5}[0-9a-f]{2}$`);
};
const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
// https://stackoverflow.com/questions/7860392/determine-if-string-is-in-base64-using-javascript
const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
const base64url = /^[A-Za-z0-9_-]*$/;
// based on https://stackoverflow.com/questions/106179/regular-expression-to-match-dns-hostname-or-ip-address
// export const hostname: RegExp = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+$/;
const hostname = /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
const domain = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const httpProtocol = /^https?$/;
// https://blog.stevenlevithan.com/archives/validate-phone-number#r4-3 (regex sans spaces)
// E.164: leading digit must be 1-9; total digits (excluding '+') between 7-15
const e164 = /^\+[1-9]\d{6,14}$/;
// const dateSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
const date = /*@__PURE__*/ new RegExp(`^${dateSource}$`);
function timeSource(args) {
    const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
    const regex = typeof args.precision === "number"
        ? args.precision === -1
            ? `${hhmm}`
            : args.precision === 0
                ? `${hhmm}:[0-5]\\d`
                : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}`
        : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
    return regex;
}
function time(args) {
    return new RegExp(`^${timeSource(args)}$`);
}
// Adapted from https://stackoverflow.com/a/3143231
function datetime(args) {
    const time = timeSource({ precision: args.precision });
    const opts = ["Z"];
    if (args.local)
        opts.push("");
    // if (args.offset) opts.push(`([+-]\\d{2}:\\d{2})`);
    if (args.offset)
        opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
    const timeRegex = `${time}(?:${opts.join("|")})`;
    return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
const string = (params) => {
    const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
    return new RegExp(`^${regex}$`);
};
const bigint = /^-?\d+n?$/;
const integer = /^-?\d+$/;
const number = /^-?\d+(?:\.\d+)?$/;
const boolean = /^(?:true|false)$/i;
const _null = /^null$/i;

const _undefined = /^undefined$/i;

// regex for string with no uppercase letters
const lowercase = /^[^A-Z]*$/;
// regex for string with no lowercase letters
const uppercase = /^[^a-z]*$/;
// regex for hexadecimal strings (any length)
const hex = /^[0-9a-fA-F]*$/;
// Hash regexes for different algorithms and encodings
// Helper function to create base64 regex with exact length and padding
function fixedBase64(bodyLength, padding) {
    return new RegExp(`^[A-Za-z0-9+/]{${bodyLength}}${padding}$`);
}
// Helper function to create base64url regex with exact length (no padding)
function fixedBase64url(length) {
    return new RegExp(`^[A-Za-z0-9_-]{${length}}$`);
}
// MD5 (16 bytes): base64 = 24 chars total (22 + "==")
const md5_hex = /^[0-9a-fA-F]{32}$/;
const md5_base64 = /*@__PURE__*/ (/* unused pure expression or super */ null && (fixedBase64(22, "==")));
const md5_base64url = /*@__PURE__*/ (/* unused pure expression or super */ null && (fixedBase64url(22)));
// SHA1 (20 bytes): base64 = 28 chars total (27 + "=")
const sha1_hex = /^[0-9a-fA-F]{40}$/;
const sha1_base64 = /*@__PURE__*/ (/* unused pure expression or super */ null && (fixedBase64(27, "=")));
const sha1_base64url = /*@__PURE__*/ (/* unused pure expression or super */ null && (fixedBase64url(27)));
// SHA256 (32 bytes): base64 = 44 chars total (43 + "=")
const sha256_hex = /^[0-9a-fA-F]{64}$/;
const sha256_base64 = /*@__PURE__*/ (/* unused pure expression or super */ null && (fixedBase64(43, "=")));
const sha256_base64url = /*@__PURE__*/ (/* unused pure expression or super */ null && (fixedBase64url(43)));
// SHA384 (48 bytes): base64 = 64 chars total (no padding)
const sha384_hex = /^[0-9a-fA-F]{96}$/;
const sha384_base64 = /*@__PURE__*/ (/* unused pure expression or super */ null && (fixedBase64(64, "")));
const sha384_base64url = /*@__PURE__*/ (/* unused pure expression or super */ null && (fixedBase64url(64)));
// SHA512 (64 bytes): base64 = 88 chars total (86 + "==")
const sha512_hex = /^[0-9a-fA-F]{128}$/;
const sha512_base64 = /*@__PURE__*/ (/* unused pure expression or super */ null && (fixedBase64(86, "==")));
const sha512_base64url = /*@__PURE__*/ (/* unused pure expression or super */ null && (fixedBase64url(86)));


/***/ }),

/***/ 62687:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   fd: () => (/* binding */ globalRegistry)
/* harmony export */ });
/* unused harmony exports $output, $input, $ZodRegistry, registry */
var _a;
const $output = Symbol("ZodOutput");
const $input = Symbol("ZodInput");
class $ZodRegistry {
    constructor() {
        this._map = new WeakMap();
        this._idmap = new Map();
    }
    add(schema, ..._meta) {
        const meta = _meta[0];
        this._map.set(schema, meta);
        if (meta && typeof meta === "object" && "id" in meta) {
            this._idmap.set(meta.id, schema);
        }
        return this;
    }
    clear() {
        this._map = new WeakMap();
        this._idmap = new Map();
        return this;
    }
    remove(schema) {
        const meta = this._map.get(schema);
        if (meta && typeof meta === "object" && "id" in meta) {
            this._idmap.delete(meta.id);
        }
        this._map.delete(schema);
        return this;
    }
    get(schema) {
        // return this._map.get(schema) as any;
        // inherit metadata
        const p = schema._zod.parent;
        if (p) {
            const pm = { ...(this.get(p) ?? {}) };
            delete pm.id; // do not inherit id
            const f = { ...pm, ...this._map.get(schema) };
            return Object.keys(f).length ? f : undefined;
        }
        return this._map.get(schema);
    }
    has(schema) {
        return this._map.has(schema);
    }
}
// registries
function registry() {
    return new $ZodRegistry();
}
(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
const globalRegistry = globalThis.__zod_globalRegistry;


/***/ }),

/***/ 74508:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  Gb: () => (/* binding */ $ZodAny),
  $p: () => (/* binding */ $ZodArray),
  Dq: () => (/* binding */ $ZodBase64),
  CQ: () => (/* binding */ $ZodBase64URL),
  sF: () => (/* binding */ $ZodBoolean),
  CI: () => (/* binding */ $ZodCIDRv4),
  Cn: () => (/* binding */ $ZodCIDRv6),
  bl: () => (/* binding */ $ZodCUID),
  Zu: () => (/* binding */ $ZodCUID2),
  t$: () => (/* binding */ $ZodCatch),
  b0: () => (/* binding */ $ZodCustom),
  o5: () => (/* binding */ $ZodDate),
  rv: () => (/* binding */ $ZodDefault),
  P0: () => (/* binding */ $ZodDiscriminatedUnion),
  Oy: () => (/* binding */ $ZodE164),
  qG: () => (/* binding */ $ZodEmail),
  cG: () => (/* binding */ $ZodEmoji),
  VO: () => (/* binding */ $ZodEnum),
  RL: () => (/* binding */ $ZodExactOptional),
  Zc: () => (/* binding */ $ZodGUID),
  Lc: () => (/* binding */ $ZodIPv4),
  Zy: () => (/* binding */ $ZodIPv6),
  v1: () => (/* binding */ $ZodISODate),
  Ko: () => (/* binding */ $ZodISODateTime),
  $N: () => (/* binding */ $ZodISODuration),
  Ax: () => (/* binding */ $ZodISOTime),
  LJ: () => (/* binding */ $ZodIntersection),
  h8: () => (/* binding */ $ZodJWT),
  GY: () => (/* binding */ $ZodKSUID),
  kU: () => (/* binding */ $ZodLazy),
  nu: () => (/* binding */ $ZodLiteral),
  Py: () => (/* binding */ $ZodNanoID),
  Um: () => (/* binding */ $ZodNever),
  N$: () => (/* binding */ $ZodNonOptional),
  qc: () => (/* binding */ $ZodNullable),
  vz: () => (/* binding */ $ZodNumber),
  I: () => (/* binding */ $ZodNumberFormat),
  w: () => (/* binding */ $ZodObjectJIT),
  ig: () => (/* binding */ $ZodOptional),
  _m: () => (/* binding */ $ZodPipe),
  VF: () => (/* binding */ $ZodPrefault),
  KX: () => (/* binding */ $ZodPreprocess),
  Sb: () => (/* binding */ $ZodReadonly),
  h: () => (/* binding */ $ZodRecord),
  $v: () => (/* binding */ $ZodString),
  EY: () => (/* binding */ $ZodStringFormat),
  Wc: () => (/* binding */ $ZodTransform),
  W4: () => (/* binding */ $ZodType),
  g5: () => (/* binding */ $ZodULID),
  VY: () => (/* binding */ $ZodURL),
  Zn: () => (/* binding */ $ZodUUID),
  cu: () => (/* binding */ $ZodUnion),
  GP: () => (/* binding */ $ZodUnknown),
  WH: () => (/* binding */ $ZodVoid),
  TF: () => (/* binding */ $ZodXID)
});

// UNUSED EXPORTS: $ZodBigInt, $ZodBigIntFormat, $ZodCodec, $ZodCustomStringFormat, $ZodFile, $ZodFunction, $ZodMAC, $ZodMap, $ZodNaN, $ZodNull, $ZodObject, $ZodPromise, $ZodSet, $ZodSuccess, $ZodSymbol, $ZodTemplateLiteral, $ZodTuple, $ZodUndefined, $ZodXor, clone, isValidBase64, isValidBase64URL, isValidJWT

// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/checks.js
var core_checks = __webpack_require__(18941);
// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/core.js
var core_core = __webpack_require__(67415);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/doc.js
class Doc {
    constructor(args = []) {
        this.content = [];
        this.indent = 0;
        if (this)
            this.args = args;
    }
    indented(fn) {
        this.indent += 1;
        fn(this);
        this.indent -= 1;
    }
    write(arg) {
        if (typeof arg === "function") {
            arg(this, { execution: "sync" });
            arg(this, { execution: "async" });
            return;
        }
        const content = arg;
        const lines = content.split("\n").filter((x) => x);
        const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
        const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
        for (const line of dedented) {
            this.content.push(line);
        }
    }
    compile() {
        const F = Function;
        const args = this?.args;
        const content = this?.content ?? [``];
        const lines = [...content.map((x) => `  ${x}`)];
        // console.log(lines.join("\n"));
        return new F(...args, lines.join("\n"));
    }
}

// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/parse.js
var core_parse = __webpack_require__(1937);
// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/regexes.js
var core_regexes = __webpack_require__(94157);
// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/util.js
var core_util = __webpack_require__(92220);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/versions.js
const version = {
    major: 4,
    minor: 4,
    patch: 3,
};

;// CONCATENATED MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/schemas.js







const $ZodType = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodType", (inst, def) => {
    var _a;
    inst ?? (inst = {});
    inst._zod.def = def; // set _def property
    inst._zod.bag = inst._zod.bag || {}; // initialize _bag object
    inst._zod.version = version;
    const checks = [...(inst._zod.def.checks ?? [])];
    // if inst is itself a checks.$ZodCheck, run it as a check
    if (inst._zod.traits.has("$ZodCheck")) {
        checks.unshift(inst);
    }
    for (const ch of checks) {
        for (const fn of ch._zod.onattach) {
            fn(inst);
        }
    }
    if (checks.length === 0) {
        // deferred initializer
        // inst._zod.parse is not yet defined
        (_a = inst._zod).deferred ?? (_a.deferred = []);
        inst._zod.deferred?.push(() => {
            inst._zod.run = inst._zod.parse;
        });
    }
    else {
        const runChecks = (payload, checks, ctx) => {
            let isAborted = core_util/* aborted */.QH(payload);
            let asyncResult;
            for (const ch of checks) {
                if (ch._zod.def.when) {
                    if (core_util/* explicitlyAborted */.rL(payload))
                        continue;
                    const shouldRun = ch._zod.def.when(payload);
                    if (!shouldRun)
                        continue;
                }
                else if (isAborted) {
                    continue;
                }
                const currLen = payload.issues.length;
                const _ = ch._zod.check(payload);
                if (_ instanceof Promise && ctx?.async === false) {
                    throw new core_core/* $ZodAsyncError */.GT();
                }
                if (asyncResult || _ instanceof Promise) {
                    asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
                        await _;
                        const nextLen = payload.issues.length;
                        if (nextLen === currLen)
                            return;
                        if (!isAborted)
                            isAborted = core_util/* aborted */.QH(payload, currLen);
                    });
                }
                else {
                    const nextLen = payload.issues.length;
                    if (nextLen === currLen)
                        continue;
                    if (!isAborted)
                        isAborted = core_util/* aborted */.QH(payload, currLen);
                }
            }
            if (asyncResult) {
                return asyncResult.then(() => {
                    return payload;
                });
            }
            return payload;
        };
        const handleCanaryResult = (canary, payload, ctx) => {
            // abort if the canary is aborted
            if (core_util/* aborted */.QH(canary)) {
                canary.aborted = true;
                return canary;
            }
            // run checks first, then
            const checkResult = runChecks(payload, checks, ctx);
            if (checkResult instanceof Promise) {
                if (ctx.async === false)
                    throw new core_core/* $ZodAsyncError */.GT();
                return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
            }
            return inst._zod.parse(checkResult, ctx);
        };
        inst._zod.run = (payload, ctx) => {
            if (ctx.skipChecks) {
                return inst._zod.parse(payload, ctx);
            }
            if (ctx.direction === "backward") {
                // run canary
                // initial pass (no checks)
                const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
                if (canary instanceof Promise) {
                    return canary.then((canary) => {
                        return handleCanaryResult(canary, payload, ctx);
                    });
                }
                return handleCanaryResult(canary, payload, ctx);
            }
            // forward
            const result = inst._zod.parse(payload, ctx);
            if (result instanceof Promise) {
                if (ctx.async === false)
                    throw new core_core/* $ZodAsyncError */.GT();
                return result.then((result) => runChecks(result, checks, ctx));
            }
            return runChecks(result, checks, ctx);
        };
    }
    // Lazy initialize ~standard to avoid creating objects for every schema
    core_util/* defineLazy */.gJ(inst, "~standard", () => ({
        validate: (value) => {
            try {
                const r = (0,core_parse/* safeParse */.xL)(inst, value);
                return r.success ? { value: r.data } : { issues: r.error?.issues };
            }
            catch (_) {
                return (0,core_parse/* safeParseAsync */.bp)(inst, value).then((r) => (r.success ? { value: r.data } : { issues: r.error?.issues }));
            }
        },
        vendor: "zod",
        version: 1,
    }));
});

const $ZodString = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodString", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = [...(inst?._zod.bag?.patterns ?? [])].pop() ?? core_regexes/* string */.Yj(inst._zod.bag);
    inst._zod.parse = (payload, _) => {
        if (def.coerce)
            try {
                payload.value = String(payload.value);
            }
            catch (_) { }
        if (typeof payload.value === "string")
            return payload;
        payload.issues.push({
            expected: "string",
            code: "invalid_type",
            input: payload.value,
            inst,
        });
        return payload;
    };
});
const $ZodStringFormat = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodStringFormat", (inst, def) => {
    // check initialization must come first
    core_checks/* $ZodCheckStringFormat */.ql.init(inst, def);
    $ZodString.init(inst, def);
});
const $ZodGUID = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodGUID", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* guid */.Os);
    $ZodStringFormat.init(inst, def);
});
const $ZodUUID = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodUUID", (inst, def) => {
    if (def.version) {
        const versionMap = {
            v1: 1,
            v2: 2,
            v3: 3,
            v4: 4,
            v5: 5,
            v6: 6,
            v7: 7,
            v8: 8,
        };
        const v = versionMap[def.version];
        if (v === undefined)
            throw new Error(`Invalid UUID version: "${def.version}"`);
        def.pattern ?? (def.pattern = core_regexes/* uuid */.uR(v));
    }
    else
        def.pattern ?? (def.pattern = core_regexes/* uuid */.uR());
    $ZodStringFormat.init(inst, def);
});
const $ZodEmail = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodEmail", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* email */.Rp);
    $ZodStringFormat.init(inst, def);
});
const $ZodURL = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodURL", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        try {
            // Trim whitespace from input
            const trimmed = payload.value.trim();
            // When normalize is off, require :// for http/https URLs
            // This prevents strings like "http:example.com" or "https:/path" from being silently accepted
            if (!def.normalize && def.protocol?.source === core_regexes/* httpProtocol */.F.source) {
                if (!/^https?:\/\//i.test(trimmed)) {
                    payload.issues.push({
                        code: "invalid_format",
                        format: "url",
                        note: "Invalid URL format",
                        input: payload.value,
                        inst,
                        continue: !def.abort,
                    });
                    return;
                }
            }
            // @ts-ignore
            const url = new URL(trimmed);
            if (def.hostname) {
                def.hostname.lastIndex = 0;
                if (!def.hostname.test(url.hostname)) {
                    payload.issues.push({
                        code: "invalid_format",
                        format: "url",
                        note: "Invalid hostname",
                        pattern: def.hostname.source,
                        input: payload.value,
                        inst,
                        continue: !def.abort,
                    });
                }
            }
            if (def.protocol) {
                def.protocol.lastIndex = 0;
                if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) {
                    payload.issues.push({
                        code: "invalid_format",
                        format: "url",
                        note: "Invalid protocol",
                        pattern: def.protocol.source,
                        input: payload.value,
                        inst,
                        continue: !def.abort,
                    });
                }
            }
            // Set the output value based on normalize flag
            if (def.normalize) {
                // Use normalized URL
                payload.value = url.href;
            }
            else {
                // Preserve the original input (trimmed)
                payload.value = trimmed;
            }
            return;
        }
        catch (_) {
            payload.issues.push({
                code: "invalid_format",
                format: "url",
                input: payload.value,
                inst,
                continue: !def.abort,
            });
        }
    };
});
const $ZodEmoji = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodEmoji", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* emoji */.Zg());
    $ZodStringFormat.init(inst, def);
});
const $ZodNanoID = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodNanoID", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* nanoid */.Ak);
    $ZodStringFormat.init(inst, def);
});
/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
const $ZodCUID = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodCUID", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* cuid */.gF);
    $ZodStringFormat.init(inst, def);
});
const $ZodCUID2 = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodCUID2", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* cuid2 */.Gl);
    $ZodStringFormat.init(inst, def);
});
const $ZodULID = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodULID", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* ulid */.Z0);
    $ZodStringFormat.init(inst, def);
});
const $ZodXID = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodXID", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* xid */.kM);
    $ZodStringFormat.init(inst, def);
});
const $ZodKSUID = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodKSUID", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* ksuid */.fO);
    $ZodStringFormat.init(inst, def);
});
const $ZodISODateTime = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodISODateTime", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* datetime */.w$(def));
    $ZodStringFormat.init(inst, def);
});
const $ZodISODate = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodISODate", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* date */.p6);
    $ZodStringFormat.init(inst, def);
});
const $ZodISOTime = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodISOTime", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* time */.kB(def));
    $ZodStringFormat.init(inst, def);
});
const $ZodISODuration = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodISODuration", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* duration */.p0);
    $ZodStringFormat.init(inst, def);
});
const $ZodIPv4 = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodIPv4", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* ipv4 */.uX);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.format = `ipv4`;
});
const $ZodIPv6 = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodIPv6", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* ipv6 */.ug);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.format = `ipv6`;
    inst._zod.check = (payload) => {
        try {
            // @ts-ignore
            new URL(`http://[${payload.value}]`);
            // return;
        }
        catch {
            payload.issues.push({
                code: "invalid_format",
                format: "ipv6",
                input: payload.value,
                inst,
                continue: !def.abort,
            });
        }
    };
});
const $ZodMAC = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodMAC", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.mac(def.delimiter));
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.format = `mac`;
})));
const $ZodCIDRv4 = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodCIDRv4", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* cidrv4 */.zr);
    $ZodStringFormat.init(inst, def);
});
const $ZodCIDRv6 = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodCIDRv6", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* cidrv6 */.l7); // not used for validation
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        const parts = payload.value.split("/");
        try {
            if (parts.length !== 2)
                throw new Error();
            const [address, prefix] = parts;
            if (!prefix)
                throw new Error();
            const prefixNum = Number(prefix);
            if (`${prefixNum}` !== prefix)
                throw new Error();
            if (prefixNum < 0 || prefixNum > 128)
                throw new Error();
            // @ts-ignore
            new URL(`http://[${address}]`);
        }
        catch {
            payload.issues.push({
                code: "invalid_format",
                format: "cidrv6",
                input: payload.value,
                inst,
                continue: !def.abort,
            });
        }
    };
});
//////////////////////////////   ZodBase64   //////////////////////////////
function isValidBase64(data) {
    if (data === "")
        return true;
    // atob ignores whitespace, so reject it up front.
    if (/\s/.test(data))
        return false;
    if (data.length % 4 !== 0)
        return false;
    try {
        // @ts-ignore
        atob(data);
        return true;
    }
    catch {
        return false;
    }
}
const $ZodBase64 = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodBase64", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* base64 */.K3);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.contentEncoding = "base64";
    inst._zod.check = (payload) => {
        if (isValidBase64(payload.value))
            return;
        payload.issues.push({
            code: "invalid_format",
            format: "base64",
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
//////////////////////////////   ZodBase64   //////////////////////////////
function isValidBase64URL(data) {
    if (!core_regexes/* base64url */.r0.test(data))
        return false;
    const base64 = data.replace(/[-_]/g, (c) => (c === "-" ? "+" : "/"));
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return isValidBase64(padded);
}
const $ZodBase64URL = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodBase64URL", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* base64url */.r0);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.contentEncoding = "base64url";
    inst._zod.check = (payload) => {
        if (isValidBase64URL(payload.value))
            return;
        payload.issues.push({
            code: "invalid_format",
            format: "base64url",
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodE164 = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodE164", (inst, def) => {
    def.pattern ?? (def.pattern = core_regexes/* e164 */.hQ);
    $ZodStringFormat.init(inst, def);
});
//////////////////////////////   ZodJWT   //////////////////////////////
function isValidJWT(token, algorithm = null) {
    try {
        const tokensParts = token.split(".");
        if (tokensParts.length !== 3)
            return false;
        const [header] = tokensParts;
        if (!header)
            return false;
        // @ts-ignore
        const parsedHeader = JSON.parse(atob(header));
        if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
            return false;
        if (!parsedHeader.alg)
            return false;
        if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
            return false;
        return true;
    }
    catch {
        return false;
    }
}
const $ZodJWT = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodJWT", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        if (isValidJWT(payload.value, def.alg))
            return;
        payload.issues.push({
            code: "invalid_format",
            format: "jwt",
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
const $ZodCustomStringFormat = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodCustomStringFormat", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        if (def.fn(payload.value))
            return;
        payload.issues.push({
            code: "invalid_format",
            format: def.format,
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
})));
const $ZodNumber = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodNumber", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = inst._zod.bag.pattern ?? core_regexes/* number */.ai;
    inst._zod.parse = (payload, _ctx) => {
        if (def.coerce)
            try {
                payload.value = Number(payload.value);
            }
            catch (_) { }
        const input = payload.value;
        if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
            return payload;
        }
        const received = typeof input === "number"
            ? Number.isNaN(input)
                ? "NaN"
                : !Number.isFinite(input)
                    ? "Infinity"
                    : undefined
            : undefined;
        payload.issues.push({
            expected: "number",
            code: "invalid_type",
            input,
            inst,
            ...(received ? { received } : {}),
        });
        return payload;
    };
});
const $ZodNumberFormat = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodNumberFormat", (inst, def) => {
    core_checks/* $ZodCheckNumberFormat */.KH.init(inst, def);
    $ZodNumber.init(inst, def); // no format checks
});
const $ZodBoolean = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodBoolean", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = core_regexes/* boolean */.zM;
    inst._zod.parse = (payload, _ctx) => {
        if (def.coerce)
            try {
                payload.value = Boolean(payload.value);
            }
            catch (_) { }
        const input = payload.value;
        if (typeof input === "boolean")
            return payload;
        payload.issues.push({
            expected: "boolean",
            code: "invalid_type",
            input,
            inst,
        });
        return payload;
    };
});
const $ZodBigInt = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodBigInt", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = regexes.bigint;
    inst._zod.parse = (payload, _ctx) => {
        if (def.coerce)
            try {
                payload.value = BigInt(payload.value);
            }
            catch (_) { }
        if (typeof payload.value === "bigint")
            return payload;
        payload.issues.push({
            expected: "bigint",
            code: "invalid_type",
            input: payload.value,
            inst,
        });
        return payload;
    };
})));
const $ZodBigIntFormat = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodBigIntFormat", (inst, def) => {
    checks.$ZodCheckBigIntFormat.init(inst, def);
    $ZodBigInt.init(inst, def); // no format checks
})));
const $ZodSymbol = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodSymbol", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (typeof input === "symbol")
            return payload;
        payload.issues.push({
            expected: "symbol",
            code: "invalid_type",
            input,
            inst,
        });
        return payload;
    };
})));
const $ZodUndefined = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodUndefined", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = regexes.undefined;
    inst._zod.values = new Set([undefined]);
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (typeof input === "undefined")
            return payload;
        payload.issues.push({
            expected: "undefined",
            code: "invalid_type",
            input,
            inst,
        });
        return payload;
    };
})));
const $ZodNull = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodNull", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = regexes.null;
    inst._zod.values = new Set([null]);
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (input === null)
            return payload;
        payload.issues.push({
            expected: "null",
            code: "invalid_type",
            input,
            inst,
        });
        return payload;
    };
})));
const $ZodAny = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodAny", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
});
const $ZodUnknown = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodUnknown", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
});
const $ZodNever = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodNever", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
        payload.issues.push({
            expected: "never",
            code: "invalid_type",
            input: payload.value,
            inst,
        });
        return payload;
    };
});
const $ZodVoid = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodVoid", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (typeof input === "undefined")
            return payload;
        payload.issues.push({
            expected: "void",
            code: "invalid_type",
            input,
            inst,
        });
        return payload;
    };
});
const $ZodDate = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodDate", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
        if (def.coerce) {
            try {
                payload.value = new Date(payload.value);
            }
            catch (_err) { }
        }
        const input = payload.value;
        const isDate = input instanceof Date;
        const isValidDate = isDate && !Number.isNaN(input.getTime());
        if (isValidDate)
            return payload;
        payload.issues.push({
            expected: "date",
            code: "invalid_type",
            input,
            ...(isDate ? { received: "Invalid Date" } : {}),
            inst,
        });
        return payload;
    };
});
function handleArrayResult(result, final, index) {
    if (result.issues.length) {
        final.issues.push(...core_util/* prefixIssues */.lQ(index, result.issues));
    }
    final.value[index] = result.value;
}
const $ZodArray = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodArray", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!Array.isArray(input)) {
            payload.issues.push({
                expected: "array",
                code: "invalid_type",
                input,
                inst,
            });
            return payload;
        }
        payload.value = Array(input.length);
        const proms = [];
        for (let i = 0; i < input.length; i++) {
            const item = input[i];
            const result = def.element._zod.run({
                value: item,
                issues: [],
            }, ctx);
            if (result instanceof Promise) {
                proms.push(result.then((result) => handleArrayResult(result, payload, i)));
            }
            else {
                handleArrayResult(result, payload, i);
            }
        }
        if (proms.length) {
            return Promise.all(proms).then(() => payload);
        }
        return payload; //handleArrayResultsAsync(parseResults, final);
    };
});
function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
    const isPresent = key in input;
    if (result.issues.length) {
        // For optional-in/out schemas, ignore errors on absent keys.
        if (isOptionalIn && isOptionalOut && !isPresent) {
            return;
        }
        final.issues.push(...core_util/* prefixIssues */.lQ(key, result.issues));
    }
    if (!isPresent && !isOptionalIn) {
        if (!result.issues.length) {
            final.issues.push({
                code: "invalid_type",
                expected: "nonoptional",
                input: undefined,
                path: [key],
            });
        }
        return;
    }
    if (result.value === undefined) {
        if (isPresent) {
            final.value[key] = undefined;
        }
    }
    else {
        final.value[key] = result.value;
    }
}
function normalizeDef(def) {
    const keys = Object.keys(def.shape);
    for (const k of keys) {
        if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
            throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
        }
    }
    const okeys = core_util/* optionalKeys */.NM(def.shape);
    return {
        ...def,
        keys,
        keySet: new Set(keys),
        numKeys: keys.length,
        optionalKeys: new Set(okeys),
    };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
    const unrecognized = [];
    const keySet = def.keySet;
    const _catchall = def.catchall._zod;
    const t = _catchall.def.type;
    const isOptionalIn = _catchall.optin === "optional";
    const isOptionalOut = _catchall.optout === "optional";
    for (const key in input) {
        // skip __proto__ so it can't replace the result prototype via the
        // assignment setter on the plain {} we build into
        if (key === "__proto__")
            continue;
        if (keySet.has(key))
            continue;
        if (t === "never") {
            unrecognized.push(key);
            continue;
        }
        const r = _catchall.run({ value: input[key], issues: [] }, ctx);
        if (r instanceof Promise) {
            proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
        }
        else {
            handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
        }
    }
    if (unrecognized.length) {
        payload.issues.push({
            code: "unrecognized_keys",
            keys: unrecognized,
            input,
            inst,
        });
    }
    if (!proms.length)
        return payload;
    return Promise.all(proms).then(() => {
        return payload;
    });
}
const $ZodObject = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodObject", (inst, def) => {
    // requires cast because technically $ZodObject doesn't extend
    $ZodType.init(inst, def);
    // const sh = def.shape;
    const desc = Object.getOwnPropertyDescriptor(def, "shape");
    if (!desc?.get) {
        const sh = def.shape;
        Object.defineProperty(def, "shape", {
            get: () => {
                const newSh = { ...sh };
                Object.defineProperty(def, "shape", {
                    value: newSh,
                });
                return newSh;
            },
        });
    }
    const _normalized = core_util/* cached */.PO(() => normalizeDef(def));
    core_util/* defineLazy */.gJ(inst._zod, "propValues", () => {
        const shape = def.shape;
        const propValues = {};
        for (const key in shape) {
            const field = shape[key]._zod;
            if (field.values) {
                propValues[key] ?? (propValues[key] = new Set());
                for (const v of field.values)
                    propValues[key].add(v);
            }
        }
        return propValues;
    });
    const isObject = core_util/* isObject */.Gv;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
        value ?? (value = _normalized.value);
        const input = payload.value;
        if (!isObject(input)) {
            payload.issues.push({
                expected: "object",
                code: "invalid_type",
                input,
                inst,
            });
            return payload;
        }
        payload.value = {};
        const proms = [];
        const shape = value.shape;
        for (const key of value.keys) {
            const el = shape[key];
            const isOptionalIn = el._zod.optin === "optional";
            const isOptionalOut = el._zod.optout === "optional";
            const r = el._zod.run({ value: input[key], issues: [] }, ctx);
            if (r instanceof Promise) {
                proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
            }
            else {
                handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
            }
        }
        if (!catchall) {
            return proms.length ? Promise.all(proms).then(() => payload) : payload;
        }
        return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
    };
});
const $ZodObjectJIT = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodObjectJIT", (inst, def) => {
    // requires cast because technically $ZodObject doesn't extend
    $ZodObject.init(inst, def);
    const superParse = inst._zod.parse;
    const _normalized = core_util/* cached */.PO(() => normalizeDef(def));
    const generateFastpass = (shape) => {
        const doc = new Doc(["shape", "payload", "ctx"]);
        const normalized = _normalized.value;
        const parseStr = (key) => {
            const k = core_util/* esc */.UQ(key);
            return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
        };
        doc.write(`const input = payload.value;`);
        const ids = Object.create(null);
        let counter = 0;
        for (const key of normalized.keys) {
            ids[key] = `key_${counter++}`;
        }
        // A: preserve key order {
        doc.write(`const newResult = {};`);
        for (const key of normalized.keys) {
            const id = ids[key];
            const k = core_util/* esc */.UQ(key);
            const schema = shape[key];
            const isOptionalIn = schema?._zod?.optin === "optional";
            const isOptionalOut = schema?._zod?.optout === "optional";
            doc.write(`const ${id} = ${parseStr(key)};`);
            if (isOptionalIn && isOptionalOut) {
                // For optional-in/out schemas, ignore errors on absent keys
                doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
            }
            else if (!isOptionalIn) {
                doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
            }
            else {
                doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
            }
        }
        doc.write(`payload.value = newResult;`);
        doc.write(`return payload;`);
        const fn = doc.compile();
        return (payload, ctx) => fn(shape, payload, ctx);
    };
    let fastpass;
    const isObject = core_util/* isObject */.Gv;
    const jit = !core_core/* globalConfig */.cr.jitless;
    const allowsEval = core_util/* allowsEval */.hI;
    const fastEnabled = jit && allowsEval.value; // && !def.catchall;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
        value ?? (value = _normalized.value);
        const input = payload.value;
        if (!isObject(input)) {
            payload.issues.push({
                expected: "object",
                code: "invalid_type",
                input,
                inst,
            });
            return payload;
        }
        if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
            // always synchronous
            if (!fastpass)
                fastpass = generateFastpass(def.shape);
            payload = fastpass(payload, ctx);
            if (!catchall)
                return payload;
            return handleCatchall([], input, payload, ctx, value, inst);
        }
        return superParse(payload, ctx);
    };
});
function handleUnionResults(results, final, inst, ctx) {
    for (const result of results) {
        if (result.issues.length === 0) {
            final.value = result.value;
            return final;
        }
    }
    const nonaborted = results.filter((r) => !core_util/* aborted */.QH(r));
    if (nonaborted.length === 1) {
        final.value = nonaborted[0].value;
        return nonaborted[0];
    }
    final.issues.push({
        code: "invalid_union",
        input: final.value,
        inst,
        errors: results.map((result) => result.issues.map((iss) => core_util/* finalizeIssue */.iR(iss, ctx, core_core/* config */.$W()))),
    });
    return final;
}
const $ZodUnion = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodUnion", (inst, def) => {
    $ZodType.init(inst, def);
    core_util/* defineLazy */.gJ(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : undefined);
    core_util/* defineLazy */.gJ(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : undefined);
    core_util/* defineLazy */.gJ(inst._zod, "values", () => {
        if (def.options.every((o) => o._zod.values)) {
            return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
        }
        return undefined;
    });
    core_util/* defineLazy */.gJ(inst._zod, "pattern", () => {
        if (def.options.every((o) => o._zod.pattern)) {
            const patterns = def.options.map((o) => o._zod.pattern);
            return new RegExp(`^(${patterns.map((p) => core_util/* cleanRegex */.p6(p.source)).join("|")})$`);
        }
        return undefined;
    });
    const first = def.options.length === 1 ? def.options[0]._zod.run : null;
    inst._zod.parse = (payload, ctx) => {
        if (first) {
            return first(payload, ctx);
        }
        let async = false;
        const results = [];
        for (const option of def.options) {
            const result = option._zod.run({
                value: payload.value,
                issues: [],
            }, ctx);
            if (result instanceof Promise) {
                results.push(result);
                async = true;
            }
            else {
                if (result.issues.length === 0)
                    return result;
                results.push(result);
            }
        }
        if (!async)
            return handleUnionResults(results, payload, inst, ctx);
        return Promise.all(results).then((results) => {
            return handleUnionResults(results, payload, inst, ctx);
        });
    };
});
function handleExclusiveUnionResults(results, final, inst, ctx) {
    const successes = results.filter((r) => r.issues.length === 0);
    if (successes.length === 1) {
        final.value = successes[0].value;
        return final;
    }
    if (successes.length === 0) {
        // No matches - same as regular union
        final.issues.push({
            code: "invalid_union",
            input: final.value,
            inst,
            errors: results.map((result) => result.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config()))),
        });
    }
    else {
        // Multiple matches - exclusive union failure
        final.issues.push({
            code: "invalid_union",
            input: final.value,
            inst,
            errors: [],
            inclusive: false,
        });
    }
    return final;
}
const $ZodXor = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodXor", (inst, def) => {
    $ZodUnion.init(inst, def);
    def.inclusive = false;
    const first = def.options.length === 1 ? def.options[0]._zod.run : null;
    inst._zod.parse = (payload, ctx) => {
        if (first) {
            return first(payload, ctx);
        }
        let async = false;
        const results = [];
        for (const option of def.options) {
            const result = option._zod.run({
                value: payload.value,
                issues: [],
            }, ctx);
            if (result instanceof Promise) {
                results.push(result);
                async = true;
            }
            else {
                results.push(result);
            }
        }
        if (!async)
            return handleExclusiveUnionResults(results, payload, inst, ctx);
        return Promise.all(results).then((results) => {
            return handleExclusiveUnionResults(results, payload, inst, ctx);
        });
    };
})));
const $ZodDiscriminatedUnion = 
/*@__PURE__*/
core_core/* $constructor */.xI("$ZodDiscriminatedUnion", (inst, def) => {
    def.inclusive = false;
    $ZodUnion.init(inst, def);
    const _super = inst._zod.parse;
    core_util/* defineLazy */.gJ(inst._zod, "propValues", () => {
        const propValues = {};
        for (const option of def.options) {
            const pv = option._zod.propValues;
            if (!pv || Object.keys(pv).length === 0)
                throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
            for (const [k, v] of Object.entries(pv)) {
                if (!propValues[k])
                    propValues[k] = new Set();
                for (const val of v) {
                    propValues[k].add(val);
                }
            }
        }
        return propValues;
    });
    const disc = core_util/* cached */.PO(() => {
        const opts = def.options;
        const map = new Map();
        for (const o of opts) {
            const values = o._zod.propValues?.[def.discriminator];
            if (!values || values.size === 0)
                throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
            for (const v of values) {
                if (map.has(v)) {
                    throw new Error(`Duplicate discriminator value "${String(v)}"`);
                }
                map.set(v, o);
            }
        }
        return map;
    });
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!core_util/* isObject */.Gv(input)) {
            payload.issues.push({
                code: "invalid_type",
                expected: "object",
                input,
                inst,
            });
            return payload;
        }
        const opt = disc.value.get(input?.[def.discriminator]);
        if (opt) {
            return opt._zod.run(payload, ctx);
        }
        // Fall back to union matching when the fast discriminator path fails:
        // - explicitly enabled via unionFallback, or
        // - during backward direction (encode), since codec-based discriminators
        //   have different values in forward vs backward directions
        if (def.unionFallback || ctx.direction === "backward") {
            return _super(payload, ctx);
        }
        // no matching discriminator
        payload.issues.push({
            code: "invalid_union",
            errors: [],
            note: "No matching discriminator",
            discriminator: def.discriminator,
            options: Array.from(disc.value.keys()),
            input,
            path: [def.discriminator],
            inst,
        });
        return payload;
    };
});
const $ZodIntersection = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodIntersection", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        const left = def.left._zod.run({ value: input, issues: [] }, ctx);
        const right = def.right._zod.run({ value: input, issues: [] }, ctx);
        const async = left instanceof Promise || right instanceof Promise;
        if (async) {
            return Promise.all([left, right]).then(([left, right]) => {
                return handleIntersectionResults(payload, left, right);
            });
        }
        return handleIntersectionResults(payload, left, right);
    };
});
function mergeValues(a, b) {
    // const aType = parse.t(a);
    // const bType = parse.t(b);
    if (a === b) {
        return { valid: true, data: a };
    }
    if (a instanceof Date && b instanceof Date && +a === +b) {
        return { valid: true, data: a };
    }
    if (core_util/* isPlainObject */.Qd(a) && core_util/* isPlainObject */.Qd(b)) {
        const bKeys = Object.keys(b);
        const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
        const newObj = { ...a, ...b };
        for (const key of sharedKeys) {
            const sharedValue = mergeValues(a[key], b[key]);
            if (!sharedValue.valid) {
                return {
                    valid: false,
                    mergeErrorPath: [key, ...sharedValue.mergeErrorPath],
                };
            }
            newObj[key] = sharedValue.data;
        }
        return { valid: true, data: newObj };
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return { valid: false, mergeErrorPath: [] };
        }
        const newArray = [];
        for (let index = 0; index < a.length; index++) {
            const itemA = a[index];
            const itemB = b[index];
            const sharedValue = mergeValues(itemA, itemB);
            if (!sharedValue.valid) {
                return {
                    valid: false,
                    mergeErrorPath: [index, ...sharedValue.mergeErrorPath],
                };
            }
            newArray.push(sharedValue.data);
        }
        return { valid: true, data: newArray };
    }
    return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
    // Track which side(s) report each key as unrecognized
    const unrecKeys = new Map();
    let unrecIssue;
    for (const iss of left.issues) {
        if (iss.code === "unrecognized_keys") {
            unrecIssue ?? (unrecIssue = iss);
            for (const k of iss.keys) {
                if (!unrecKeys.has(k))
                    unrecKeys.set(k, {});
                unrecKeys.get(k).l = true;
            }
        }
        else {
            result.issues.push(iss);
        }
    }
    for (const iss of right.issues) {
        if (iss.code === "unrecognized_keys") {
            for (const k of iss.keys) {
                if (!unrecKeys.has(k))
                    unrecKeys.set(k, {});
                unrecKeys.get(k).r = true;
            }
        }
        else {
            result.issues.push(iss);
        }
    }
    // Report only keys unrecognized by BOTH sides
    const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
    if (bothKeys.length && unrecIssue) {
        result.issues.push({ ...unrecIssue, keys: bothKeys });
    }
    if (core_util/* aborted */.QH(result))
        return result;
    const merged = mergeValues(left.value, right.value);
    if (!merged.valid) {
        throw new Error(`Unmergable intersection. Error path: ` + `${JSON.stringify(merged.mergeErrorPath)}`);
    }
    result.value = merged.data;
    return result;
}
const $ZodTuple = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodTuple", (inst, def) => {
    $ZodType.init(inst, def);
    const items = def.items;
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!Array.isArray(input)) {
            payload.issues.push({
                input,
                inst,
                expected: "tuple",
                code: "invalid_type",
            });
            return payload;
        }
        payload.value = [];
        const proms = [];
        const optinStart = getTupleOptStart(items, "optin");
        const optoutStart = getTupleOptStart(items, "optout");
        if (!def.rest) {
            if (input.length < optinStart) {
                payload.issues.push({
                    code: "too_small",
                    minimum: optinStart,
                    inclusive: true,
                    input,
                    inst,
                    origin: "array",
                });
                return payload;
            }
            if (input.length > items.length) {
                payload.issues.push({
                    code: "too_big",
                    maximum: items.length,
                    inclusive: true,
                    input,
                    inst,
                    origin: "array",
                });
            }
        }
        // Run every item in parallel, collecting results into an indexed
        // array. The post-processing in `handleTupleResults` walks them in
        // order so it can decide whether an absent optional-output error can
        // truncate the tail or must be reported to preserve required output.
        const itemResults = new Array(items.length);
        for (let i = 0; i < items.length; i++) {
            const r = items[i]._zod.run({ value: input[i], issues: [] }, ctx);
            if (r instanceof Promise) {
                proms.push(r.then((rr) => {
                    itemResults[i] = rr;
                }));
            }
            else {
                itemResults[i] = r;
            }
        }
        if (def.rest) {
            let i = items.length - 1;
            const rest = input.slice(items.length);
            for (const el of rest) {
                i++;
                const result = def.rest._zod.run({ value: el, issues: [] }, ctx);
                if (result instanceof Promise) {
                    proms.push(result.then((r) => handleTupleResult(r, payload, i)));
                }
                else {
                    handleTupleResult(result, payload, i);
                }
            }
        }
        if (proms.length) {
            return Promise.all(proms).then(() => handleTupleResults(itemResults, payload, items, input, optoutStart));
        }
        return handleTupleResults(itemResults, payload, items, input, optoutStart);
    };
})));
function getTupleOptStart(items, key) {
    for (let i = items.length - 1; i >= 0; i--) {
        if (items[i]._zod[key] !== "optional")
            return i + 1;
    }
    return 0;
}
function handleTupleResult(result, final, index) {
    if (result.issues.length) {
        final.issues.push(...util.prefixIssues(index, result.issues));
    }
    final.value[index] = result.value;
}
function handleTupleResults(itemResults, final, items, input, optoutStart) {
    // Walk results in order. Mirror $ZodObject's swallow-on-absent-optional
    // rule, but only after `optoutStart`: the first index where the output
    // tuple tail can be absent.
    for (let i = 0; i < items.length; i++) {
        const r = itemResults[i];
        const isPresent = i < input.length;
        if (r.issues.length) {
            if (!isPresent && i >= optoutStart) {
                final.value.length = i;
                break;
            }
            final.issues.push(...util.prefixIssues(i, r.issues));
        }
        final.value[i] = r.value;
    }
    // Drop trailing slots that produced `undefined` for absent input
    // (the array analog of an absent optional key on an object). The
    // `i >= input.length` floor is critical: an explicit `undefined`
    // *inside* the input must be preserved even when the schema is
    // optional-out (e.g. `z.string().or(z.undefined())` accepting an
    // explicit undefined value).
    for (let i = final.value.length - 1; i >= input.length; i--) {
        if (items[i]._zod.optout === "optional" && final.value[i] === undefined) {
            final.value.length = i;
        }
        else {
            break;
        }
    }
    return final;
}
const $ZodRecord = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodRecord", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!core_util/* isPlainObject */.Qd(input)) {
            payload.issues.push({
                expected: "record",
                code: "invalid_type",
                input,
                inst,
            });
            return payload;
        }
        const proms = [];
        const values = def.keyType._zod.values;
        if (values) {
            payload.value = {};
            const recordKeys = new Set();
            for (const key of values) {
                if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
                    recordKeys.add(typeof key === "number" ? key.toString() : key);
                    const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
                    if (keyResult instanceof Promise) {
                        throw new Error("Async schemas not supported in object keys currently");
                    }
                    if (keyResult.issues.length) {
                        payload.issues.push({
                            code: "invalid_key",
                            origin: "record",
                            issues: keyResult.issues.map((iss) => core_util/* finalizeIssue */.iR(iss, ctx, core_core/* config */.$W())),
                            input: key,
                            path: [key],
                            inst,
                        });
                        continue;
                    }
                    const outKey = keyResult.value;
                    const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
                    if (result instanceof Promise) {
                        proms.push(result.then((result) => {
                            if (result.issues.length) {
                                payload.issues.push(...core_util/* prefixIssues */.lQ(key, result.issues));
                            }
                            payload.value[outKey] = result.value;
                        }));
                    }
                    else {
                        if (result.issues.length) {
                            payload.issues.push(...core_util/* prefixIssues */.lQ(key, result.issues));
                        }
                        payload.value[outKey] = result.value;
                    }
                }
            }
            let unrecognized;
            for (const key in input) {
                if (!recordKeys.has(key)) {
                    unrecognized = unrecognized ?? [];
                    unrecognized.push(key);
                }
            }
            if (unrecognized && unrecognized.length > 0) {
                payload.issues.push({
                    code: "unrecognized_keys",
                    input,
                    inst,
                    keys: unrecognized,
                });
            }
        }
        else {
            payload.value = {};
            // Reflect.ownKeys for Symbol-key support; filter non-enumerable to match z.object()
            for (const key of Reflect.ownKeys(input)) {
                if (key === "__proto__")
                    continue;
                if (!Object.prototype.propertyIsEnumerable.call(input, key))
                    continue;
                let keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
                if (keyResult instanceof Promise) {
                    throw new Error("Async schemas not supported in object keys currently");
                }
                // Numeric string fallback: if key is a numeric string and failed, retry with Number(key)
                // This handles z.number(), z.literal([1, 2, 3]), and unions containing numeric literals
                const checkNumericKey = typeof key === "string" && core_regexes/* number */.ai.test(key) && keyResult.issues.length;
                if (checkNumericKey) {
                    const retryResult = def.keyType._zod.run({ value: Number(key), issues: [] }, ctx);
                    if (retryResult instanceof Promise) {
                        throw new Error("Async schemas not supported in object keys currently");
                    }
                    if (retryResult.issues.length === 0) {
                        keyResult = retryResult;
                    }
                }
                if (keyResult.issues.length) {
                    if (def.mode === "loose") {
                        // Pass through unchanged
                        payload.value[key] = input[key];
                    }
                    else {
                        // Default "strict" behavior: error on invalid key
                        payload.issues.push({
                            code: "invalid_key",
                            origin: "record",
                            issues: keyResult.issues.map((iss) => core_util/* finalizeIssue */.iR(iss, ctx, core_core/* config */.$W())),
                            input: key,
                            path: [key],
                            inst,
                        });
                    }
                    continue;
                }
                const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
                if (result instanceof Promise) {
                    proms.push(result.then((result) => {
                        if (result.issues.length) {
                            payload.issues.push(...core_util/* prefixIssues */.lQ(key, result.issues));
                        }
                        payload.value[keyResult.value] = result.value;
                    }));
                }
                else {
                    if (result.issues.length) {
                        payload.issues.push(...core_util/* prefixIssues */.lQ(key, result.issues));
                    }
                    payload.value[keyResult.value] = result.value;
                }
            }
        }
        if (proms.length) {
            return Promise.all(proms).then(() => payload);
        }
        return payload;
    };
});
const $ZodMap = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodMap", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!(input instanceof Map)) {
            payload.issues.push({
                expected: "map",
                code: "invalid_type",
                input,
                inst,
            });
            return payload;
        }
        const proms = [];
        payload.value = new Map();
        for (const [key, value] of input) {
            const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
            const valueResult = def.valueType._zod.run({ value: value, issues: [] }, ctx);
            if (keyResult instanceof Promise || valueResult instanceof Promise) {
                proms.push(Promise.all([keyResult, valueResult]).then(([keyResult, valueResult]) => {
                    handleMapResult(keyResult, valueResult, payload, key, input, inst, ctx);
                }));
            }
            else {
                handleMapResult(keyResult, valueResult, payload, key, input, inst, ctx);
            }
        }
        if (proms.length)
            return Promise.all(proms).then(() => payload);
        return payload;
    };
})));
function handleMapResult(keyResult, valueResult, final, key, input, inst, ctx) {
    if (keyResult.issues.length) {
        if (util.propertyKeyTypes.has(typeof key)) {
            final.issues.push(...util.prefixIssues(key, keyResult.issues));
        }
        else {
            final.issues.push({
                code: "invalid_key",
                origin: "map",
                input,
                inst,
                issues: keyResult.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())),
            });
        }
    }
    if (valueResult.issues.length) {
        if (util.propertyKeyTypes.has(typeof key)) {
            final.issues.push(...util.prefixIssues(key, valueResult.issues));
        }
        else {
            final.issues.push({
                origin: "map",
                code: "invalid_element",
                input,
                inst,
                key: key,
                issues: valueResult.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())),
            });
        }
    }
    final.value.set(keyResult.value, valueResult.value);
}
const $ZodSet = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodSet", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!(input instanceof Set)) {
            payload.issues.push({
                input,
                inst,
                expected: "set",
                code: "invalid_type",
            });
            return payload;
        }
        const proms = [];
        payload.value = new Set();
        for (const item of input) {
            const result = def.valueType._zod.run({ value: item, issues: [] }, ctx);
            if (result instanceof Promise) {
                proms.push(result.then((result) => handleSetResult(result, payload)));
            }
            else
                handleSetResult(result, payload);
        }
        if (proms.length)
            return Promise.all(proms).then(() => payload);
        return payload;
    };
})));
function handleSetResult(result, final) {
    if (result.issues.length) {
        final.issues.push(...result.issues);
    }
    final.value.add(result.value);
}
const $ZodEnum = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodEnum", (inst, def) => {
    $ZodType.init(inst, def);
    const values = core_util/* getEnumValues */.w5(def.entries);
    const valuesSet = new Set(values);
    inst._zod.values = valuesSet;
    inst._zod.pattern = new RegExp(`^(${values
        .filter((k) => core_util/* propertyKeyTypes */.qQ.has(typeof k))
        .map((o) => (typeof o === "string" ? core_util/* escapeRegex */.$f(o) : o.toString()))
        .join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (valuesSet.has(input)) {
            return payload;
        }
        payload.issues.push({
            code: "invalid_value",
            values,
            input,
            inst,
        });
        return payload;
    };
});
const $ZodLiteral = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodLiteral", (inst, def) => {
    $ZodType.init(inst, def);
    if (def.values.length === 0) {
        throw new Error("Cannot create literal schema with no valid values");
    }
    const values = new Set(def.values);
    inst._zod.values = values;
    inst._zod.pattern = new RegExp(`^(${def.values
        .map((o) => (typeof o === "string" ? core_util/* escapeRegex */.$f(o) : o ? core_util/* escapeRegex */.$f(o.toString()) : String(o)))
        .join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (values.has(input)) {
            return payload;
        }
        payload.issues.push({
            code: "invalid_value",
            values: def.values,
            input,
            inst,
        });
        return payload;
    };
});
const $ZodFile = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodFile", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        // @ts-ignore
        if (input instanceof File)
            return payload;
        payload.issues.push({
            expected: "file",
            code: "invalid_type",
            input,
            inst,
        });
        return payload;
    };
})));
const $ZodTransform = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodTransform", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            throw new core_core/* $ZodEncodeError */.cV(inst.constructor.name);
        }
        const _out = def.transform(payload.value, payload);
        if (ctx.async) {
            const output = _out instanceof Promise ? _out : Promise.resolve(_out);
            return output.then((output) => {
                payload.value = output;
                payload.fallback = true;
                return payload;
            });
        }
        if (_out instanceof Promise) {
            throw new core_core/* $ZodAsyncError */.GT();
        }
        payload.value = _out;
        payload.fallback = true;
        return payload;
    };
});
function handleOptionalResult(result, input) {
    if (input === undefined && (result.issues.length || result.fallback)) {
        return { issues: [], value: undefined };
    }
    return result;
}
const $ZodOptional = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodOptional", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    inst._zod.optout = "optional";
    core_util/* defineLazy */.gJ(inst._zod, "values", () => {
        return def.innerType._zod.values ? new Set([...def.innerType._zod.values, undefined]) : undefined;
    });
    core_util/* defineLazy */.gJ(inst._zod, "pattern", () => {
        const pattern = def.innerType._zod.pattern;
        return pattern ? new RegExp(`^(${core_util/* cleanRegex */.p6(pattern.source)})?$`) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
        if (def.innerType._zod.optin === "optional") {
            const input = payload.value;
            const result = def.innerType._zod.run(payload, ctx);
            if (result instanceof Promise)
                return result.then((r) => handleOptionalResult(r, input));
            return handleOptionalResult(result, input);
        }
        if (payload.value === undefined) {
            return payload;
        }
        return def.innerType._zod.run(payload, ctx);
    };
});
const $ZodExactOptional = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodExactOptional", (inst, def) => {
    // Call parent init - inherits optin/optout = "optional"
    $ZodOptional.init(inst, def);
    // Override values/pattern to NOT add undefined
    core_util/* defineLazy */.gJ(inst._zod, "values", () => def.innerType._zod.values);
    core_util/* defineLazy */.gJ(inst._zod, "pattern", () => def.innerType._zod.pattern);
    // Override parse to just delegate (no undefined handling)
    inst._zod.parse = (payload, ctx) => {
        return def.innerType._zod.run(payload, ctx);
    };
});
const $ZodNullable = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodNullable", (inst, def) => {
    $ZodType.init(inst, def);
    core_util/* defineLazy */.gJ(inst._zod, "optin", () => def.innerType._zod.optin);
    core_util/* defineLazy */.gJ(inst._zod, "optout", () => def.innerType._zod.optout);
    core_util/* defineLazy */.gJ(inst._zod, "pattern", () => {
        const pattern = def.innerType._zod.pattern;
        return pattern ? new RegExp(`^(${core_util/* cleanRegex */.p6(pattern.source)}|null)$`) : undefined;
    });
    core_util/* defineLazy */.gJ(inst._zod, "values", () => {
        return def.innerType._zod.values ? new Set([...def.innerType._zod.values, null]) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
        // Forward direction (decode): allow null to pass through
        if (payload.value === null)
            return payload;
        return def.innerType._zod.run(payload, ctx);
    };
});
const $ZodDefault = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodDefault", (inst, def) => {
    $ZodType.init(inst, def);
    // inst._zod.qin = "true";
    inst._zod.optin = "optional";
    core_util/* defineLazy */.gJ(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            return def.innerType._zod.run(payload, ctx);
        }
        // Forward direction (decode): apply defaults for undefined input
        if (payload.value === undefined) {
            payload.value = def.defaultValue;
            /**
             * $ZodDefault returns the default value immediately in forward direction.
             * It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
            return payload;
        }
        // Forward direction: continue with default handling
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
            return result.then((result) => handleDefaultResult(result, def));
        }
        return handleDefaultResult(result, def);
    };
});
function handleDefaultResult(payload, def) {
    if (payload.value === undefined) {
        payload.value = def.defaultValue;
    }
    return payload;
}
const $ZodPrefault = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodPrefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    core_util/* defineLazy */.gJ(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            return def.innerType._zod.run(payload, ctx);
        }
        // Forward direction (decode): apply prefault for undefined input
        if (payload.value === undefined) {
            payload.value = def.defaultValue;
        }
        return def.innerType._zod.run(payload, ctx);
    };
});
const $ZodNonOptional = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodNonOptional", (inst, def) => {
    $ZodType.init(inst, def);
    core_util/* defineLazy */.gJ(inst._zod, "values", () => {
        const v = def.innerType._zod.values;
        return v ? new Set([...v].filter((x) => x !== undefined)) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
            return result.then((result) => handleNonOptionalResult(result, inst));
        }
        return handleNonOptionalResult(result, inst);
    };
});
function handleNonOptionalResult(payload, inst) {
    if (!payload.issues.length && payload.value === undefined) {
        payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: payload.value,
            inst,
        });
    }
    return payload;
}
const $ZodSuccess = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodSuccess", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            throw new core.$ZodEncodeError("ZodSuccess");
        }
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
            return result.then((result) => {
                payload.value = result.issues.length === 0;
                return payload;
            });
        }
        payload.value = result.issues.length === 0;
        return payload;
    };
})));
const $ZodCatch = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodCatch", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    core_util/* defineLazy */.gJ(inst._zod, "optout", () => def.innerType._zod.optout);
    core_util/* defineLazy */.gJ(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            return def.innerType._zod.run(payload, ctx);
        }
        // Forward direction (decode): apply catch logic
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
            return result.then((result) => {
                payload.value = result.value;
                if (result.issues.length) {
                    payload.value = def.catchValue({
                        ...payload,
                        error: {
                            issues: result.issues.map((iss) => core_util/* finalizeIssue */.iR(iss, ctx, core_core/* config */.$W())),
                        },
                        input: payload.value,
                    });
                    payload.issues = [];
                    payload.fallback = true;
                }
                return payload;
            });
        }
        payload.value = result.value;
        if (result.issues.length) {
            payload.value = def.catchValue({
                ...payload,
                error: {
                    issues: result.issues.map((iss) => core_util/* finalizeIssue */.iR(iss, ctx, core_core/* config */.$W())),
                },
                input: payload.value,
            });
            payload.issues = [];
            payload.fallback = true;
        }
        return payload;
    };
});
const $ZodNaN = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodNaN", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
        if (typeof payload.value !== "number" || !Number.isNaN(payload.value)) {
            payload.issues.push({
                input: payload.value,
                inst,
                expected: "nan",
                code: "invalid_type",
            });
            return payload;
        }
        return payload;
    };
})));
const $ZodPipe = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodPipe", (inst, def) => {
    $ZodType.init(inst, def);
    core_util/* defineLazy */.gJ(inst._zod, "values", () => def.in._zod.values);
    core_util/* defineLazy */.gJ(inst._zod, "optin", () => def.in._zod.optin);
    core_util/* defineLazy */.gJ(inst._zod, "optout", () => def.out._zod.optout);
    core_util/* defineLazy */.gJ(inst._zod, "propValues", () => def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            const right = def.out._zod.run(payload, ctx);
            if (right instanceof Promise) {
                return right.then((right) => handlePipeResult(right, def.in, ctx));
            }
            return handlePipeResult(right, def.in, ctx);
        }
        const left = def.in._zod.run(payload, ctx);
        if (left instanceof Promise) {
            return left.then((left) => handlePipeResult(left, def.out, ctx));
        }
        return handlePipeResult(left, def.out, ctx);
    };
});
function handlePipeResult(left, next, ctx) {
    if (left.issues.length) {
        // prevent further checks
        left.aborted = true;
        return left;
    }
    return next._zod.run({ value: left.value, issues: left.issues, fallback: left.fallback }, ctx);
}
const $ZodCodec = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodCodec", (inst, def) => {
    $ZodType.init(inst, def);
    util.defineLazy(inst._zod, "values", () => def.in._zod.values);
    util.defineLazy(inst._zod, "optin", () => def.in._zod.optin);
    util.defineLazy(inst._zod, "optout", () => def.out._zod.optout);
    util.defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
        const direction = ctx.direction || "forward";
        if (direction === "forward") {
            const left = def.in._zod.run(payload, ctx);
            if (left instanceof Promise) {
                return left.then((left) => handleCodecAResult(left, def, ctx));
            }
            return handleCodecAResult(left, def, ctx);
        }
        else {
            const right = def.out._zod.run(payload, ctx);
            if (right instanceof Promise) {
                return right.then((right) => handleCodecAResult(right, def, ctx));
            }
            return handleCodecAResult(right, def, ctx);
        }
    };
})));
function handleCodecAResult(result, def, ctx) {
    if (result.issues.length) {
        // prevent further checks
        result.aborted = true;
        return result;
    }
    const direction = ctx.direction || "forward";
    if (direction === "forward") {
        const transformed = def.transform(result.value, result);
        if (transformed instanceof Promise) {
            return transformed.then((value) => handleCodecTxResult(result, value, def.out, ctx));
        }
        return handleCodecTxResult(result, transformed, def.out, ctx);
    }
    else {
        const transformed = def.reverseTransform(result.value, result);
        if (transformed instanceof Promise) {
            return transformed.then((value) => handleCodecTxResult(result, value, def.in, ctx));
        }
        return handleCodecTxResult(result, transformed, def.in, ctx);
    }
}
function handleCodecTxResult(left, value, nextSchema, ctx) {
    // Check if transform added any issues
    if (left.issues.length) {
        left.aborted = true;
        return left;
    }
    return nextSchema._zod.run({ value, issues: left.issues }, ctx);
}
const $ZodPreprocess = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodPreprocess", (inst, def) => {
    $ZodPipe.init(inst, def);
});
const $ZodReadonly = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodReadonly", (inst, def) => {
    $ZodType.init(inst, def);
    core_util/* defineLazy */.gJ(inst._zod, "propValues", () => def.innerType._zod.propValues);
    core_util/* defineLazy */.gJ(inst._zod, "values", () => def.innerType._zod.values);
    core_util/* defineLazy */.gJ(inst._zod, "optin", () => def.innerType?._zod?.optin);
    core_util/* defineLazy */.gJ(inst._zod, "optout", () => def.innerType?._zod?.optout);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            return def.innerType._zod.run(payload, ctx);
        }
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
            return result.then(handleReadonlyResult);
        }
        return handleReadonlyResult(result);
    };
});
function handleReadonlyResult(payload) {
    payload.value = Object.freeze(payload.value);
    return payload;
}
const $ZodTemplateLiteral = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodTemplateLiteral", (inst, def) => {
    $ZodType.init(inst, def);
    const regexParts = [];
    for (const part of def.parts) {
        if (typeof part === "object" && part !== null) {
            // is Zod schema
            if (!part._zod.pattern) {
                // if (!source)
                throw new Error(`Invalid template literal part, no pattern found: ${[...part._zod.traits].shift()}`);
            }
            const source = part._zod.pattern instanceof RegExp ? part._zod.pattern.source : part._zod.pattern;
            if (!source)
                throw new Error(`Invalid template literal part: ${part._zod.traits}`);
            const start = source.startsWith("^") ? 1 : 0;
            const end = source.endsWith("$") ? source.length - 1 : source.length;
            regexParts.push(source.slice(start, end));
        }
        else if (part === null || util.primitiveTypes.has(typeof part)) {
            regexParts.push(util.escapeRegex(`${part}`));
        }
        else {
            throw new Error(`Invalid template literal part: ${part}`);
        }
    }
    inst._zod.pattern = new RegExp(`^${regexParts.join("")}$`);
    inst._zod.parse = (payload, _ctx) => {
        if (typeof payload.value !== "string") {
            payload.issues.push({
                input: payload.value,
                inst,
                expected: "string",
                code: "invalid_type",
            });
            return payload;
        }
        inst._zod.pattern.lastIndex = 0;
        if (!inst._zod.pattern.test(payload.value)) {
            payload.issues.push({
                input: payload.value,
                inst,
                code: "invalid_format",
                format: def.format ?? "template_literal",
                pattern: inst._zod.pattern.source,
            });
            return payload;
        }
        return payload;
    };
})));
const $ZodFunction = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodFunction", (inst, def) => {
    $ZodType.init(inst, def);
    inst._def = def;
    inst._zod.def = def;
    inst.implement = (func) => {
        if (typeof func !== "function") {
            throw new Error("implement() must be called with a function");
        }
        return function (...args) {
            const parsedArgs = inst._def.input ? parse(inst._def.input, args) : args;
            const result = Reflect.apply(func, this, parsedArgs);
            if (inst._def.output) {
                return parse(inst._def.output, result);
            }
            return result;
        };
    };
    inst.implementAsync = (func) => {
        if (typeof func !== "function") {
            throw new Error("implementAsync() must be called with a function");
        }
        return async function (...args) {
            const parsedArgs = inst._def.input ? await parseAsync(inst._def.input, args) : args;
            const result = await Reflect.apply(func, this, parsedArgs);
            if (inst._def.output) {
                return await parseAsync(inst._def.output, result);
            }
            return result;
        };
    };
    inst._zod.parse = (payload, _ctx) => {
        if (typeof payload.value !== "function") {
            payload.issues.push({
                code: "invalid_type",
                expected: "function",
                input: payload.value,
                inst,
            });
            return payload;
        }
        // Check if output is a promise type to determine if we should use async implementation
        const hasPromiseOutput = inst._def.output && inst._def.output._zod.def.type === "promise";
        if (hasPromiseOutput) {
            payload.value = inst.implementAsync(payload.value);
        }
        else {
            payload.value = inst.implement(payload.value);
        }
        return payload;
    };
    inst.input = (...args) => {
        const F = inst.constructor;
        if (Array.isArray(args[0])) {
            return new F({
                type: "function",
                input: new $ZodTuple({
                    type: "tuple",
                    items: args[0],
                    rest: args[1],
                }),
                output: inst._def.output,
            });
        }
        return new F({
            type: "function",
            input: args[0],
            output: inst._def.output,
        });
    };
    inst.output = (output) => {
        const F = inst.constructor;
        return new F({
            type: "function",
            input: inst._def.input,
            output,
        });
    };
    return inst;
})));
const $ZodPromise = /*@__PURE__*/ (/* unused pure expression or super */ null && (core.$constructor("$ZodPromise", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
        return Promise.resolve(payload.value).then((inner) => def.innerType._zod.run({ value: inner, issues: [] }, ctx));
    };
})));
const $ZodLazy = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodLazy", (inst, def) => {
    $ZodType.init(inst, def);
    // Cache the resolved inner type on the shared `def` so all clones of this
    // lazy (e.g. via `.describe()`/`.meta()`) share the same inner instance,
    // preserving identity for cycle detection on recursive schemas.
    core_util/* defineLazy */.gJ(inst._zod, "innerType", () => {
        const d = def;
        if (!d._cachedInner)
            d._cachedInner = def.getter();
        return d._cachedInner;
    });
    core_util/* defineLazy */.gJ(inst._zod, "pattern", () => inst._zod.innerType?._zod?.pattern);
    core_util/* defineLazy */.gJ(inst._zod, "propValues", () => inst._zod.innerType?._zod?.propValues);
    core_util/* defineLazy */.gJ(inst._zod, "optin", () => inst._zod.innerType?._zod?.optin ?? undefined);
    core_util/* defineLazy */.gJ(inst._zod, "optout", () => inst._zod.innerType?._zod?.optout ?? undefined);
    inst._zod.parse = (payload, ctx) => {
        const inner = inst._zod.innerType;
        return inner._zod.run(payload, ctx);
    };
});
const $ZodCustom = /*@__PURE__*/ core_core/* $constructor */.xI("$ZodCustom", (inst, def) => {
    core_checks/* $ZodCheck */.QP.init(inst, def);
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _) => {
        return payload;
    };
    inst._zod.check = (payload) => {
        const input = payload.value;
        const r = def.fn(input);
        if (r instanceof Promise) {
            return r.then((r) => handleRefineResult(r, payload, input, inst));
        }
        handleRefineResult(r, payload, input, inst);
        return;
    };
});
function handleRefineResult(result, payload, input, inst) {
    if (!result) {
        const _iss = {
            code: "custom",
            input,
            inst, // incorporates params.error into issue reporting
            path: [...(inst._zod.def.path ?? [])], // incorporates params.error into issue reporting
            continue: !inst._zod.def.abort,
            // params: inst._zod.def.params,
        };
        if (inst._zod.def.params)
            _iss.params = inst._zod.def.params;
        payload.issues.push(core_util/* issue */.sn(_iss));
    }
}


/***/ }),

/***/ 94610:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   OA: () => (/* binding */ createToJSONSchemaMethod),
/* harmony export */   Wb: () => (/* binding */ extractDefs),
/* harmony export */   az: () => (/* binding */ initializeContext),
/* harmony export */   eh: () => (/* binding */ process),
/* harmony export */   jE: () => (/* binding */ finalize),
/* harmony export */   uE: () => (/* binding */ createStandardJSONSchemaMethod)
/* harmony export */ });
/* harmony import */ var _registries_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(62687);

// function initializeContext<T extends schemas.$ZodType>(inputs: JSONSchemaGeneratorParams<T>): ToJSONSchemaContext<T> {
//   return {
//     processor: inputs.processor,
//     metadataRegistry: inputs.metadata ?? globalRegistry,
//     target: inputs.target ?? "draft-2020-12",
//     unrepresentable: inputs.unrepresentable ?? "throw",
//   };
// }
function initializeContext(params) {
    // Normalize target: convert old non-hyphenated versions to hyphenated versions
    let target = params?.target ?? "draft-2020-12";
    if (target === "draft-4")
        target = "draft-04";
    if (target === "draft-7")
        target = "draft-07";
    return {
        processors: params.processors ?? {},
        metadataRegistry: params?.metadata ?? _registries_js__WEBPACK_IMPORTED_MODULE_0__/* .globalRegistry */ .fd,
        target,
        unrepresentable: params?.unrepresentable ?? "throw",
        override: params?.override ?? (() => { }),
        io: params?.io ?? "output",
        counter: 0,
        seen: new Map(),
        cycles: params?.cycles ?? "ref",
        reused: params?.reused ?? "inline",
        external: params?.external ?? undefined,
    };
}
function process(schema, ctx, _params = { path: [], schemaPath: [] }) {
    var _a;
    const def = schema._zod.def;
    // check for schema in seens
    const seen = ctx.seen.get(schema);
    if (seen) {
        seen.count++;
        // check if cycle
        const isCycle = _params.schemaPath.includes(schema);
        if (isCycle) {
            seen.cycle = _params.path;
        }
        return seen.schema;
    }
    // initialize
    const result = { schema: {}, count: 1, cycle: undefined, path: _params.path };
    ctx.seen.set(schema, result);
    // custom method overrides default behavior
    const overrideSchema = schema._zod.toJSONSchema?.();
    if (overrideSchema) {
        result.schema = overrideSchema;
    }
    else {
        const params = {
            ..._params,
            schemaPath: [..._params.schemaPath, schema],
            path: _params.path,
        };
        if (schema._zod.processJSONSchema) {
            schema._zod.processJSONSchema(ctx, result.schema, params);
        }
        else {
            const _json = result.schema;
            const processor = ctx.processors[def.type];
            if (!processor) {
                throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
            }
            processor(schema, ctx, _json, params);
        }
        const parent = schema._zod.parent;
        if (parent) {
            // Also set ref if processor didn't (for inheritance)
            if (!result.ref)
                result.ref = parent;
            process(parent, ctx, params);
            ctx.seen.get(parent).isParent = true;
        }
    }
    // metadata
    const meta = ctx.metadataRegistry.get(schema);
    if (meta)
        Object.assign(result.schema, meta);
    if (ctx.io === "input" && isTransforming(schema)) {
        // examples/defaults only apply to output type of pipe
        delete result.schema.examples;
        delete result.schema.default;
    }
    // set prefault as default
    if (ctx.io === "input" && "_prefault" in result.schema)
        (_a = result.schema).default ?? (_a.default = result.schema._prefault);
    delete result.schema._prefault;
    // pulling fresh from ctx.seen in case it was overwritten
    const _result = ctx.seen.get(schema);
    return _result.schema;
}
function extractDefs(ctx, schema
// params: EmitParams
) {
    // iterate over seen map;
    const root = ctx.seen.get(schema);
    if (!root)
        throw new Error("Unprocessed schema. This is a bug in Zod.");
    // Track ids to detect duplicates across different schemas
    const idToSchema = new Map();
    for (const entry of ctx.seen.entries()) {
        const id = ctx.metadataRegistry.get(entry[0])?.id;
        if (id) {
            const existing = idToSchema.get(id);
            if (existing && existing !== entry[0]) {
                throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
            }
            idToSchema.set(id, entry[0]);
        }
    }
    // returns a ref to the schema
    // defId will be empty if the ref points to an external schema (or #)
    const makeURI = (entry) => {
        // comparing the seen objects because sometimes
        // multiple schemas map to the same seen object.
        // e.g. lazy
        // external is configured
        const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
        if (ctx.external) {
            const externalId = ctx.external.registry.get(entry[0])?.id; // ?? "__shared";// `__schema${ctx.counter++}`;
            // check if schema is in the external registry
            const uriGenerator = ctx.external.uri ?? ((id) => id);
            if (externalId) {
                return { ref: uriGenerator(externalId) };
            }
            // otherwise, add to __shared
            const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
            entry[1].defId = id; // set defId so it will be reused if needed
            return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
        }
        if (entry[1] === root) {
            return { ref: "#" };
        }
        // self-contained schema
        const uriPrefix = `#`;
        const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
        const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
        return { defId, ref: defUriPrefix + defId };
    };
    // stored cached version in `def` property
    // remove all properties, set $ref
    const extractToDef = (entry) => {
        // if the schema is already a reference, do not extract it
        if (entry[1].schema.$ref) {
            return;
        }
        const seen = entry[1];
        const { ref, defId } = makeURI(entry);
        seen.def = { ...seen.schema };
        // defId won't be set if the schema is a reference to an external schema
        // or if the schema is the root schema
        if (defId)
            seen.defId = defId;
        // wipe away all properties except $ref
        const schema = seen.schema;
        for (const key in schema) {
            delete schema[key];
        }
        schema.$ref = ref;
    };
    // throw on cycles
    // break cycles
    if (ctx.cycles === "throw") {
        for (const entry of ctx.seen.entries()) {
            const seen = entry[1];
            if (seen.cycle) {
                throw new Error("Cycle detected: " +
                    `#/${seen.cycle?.join("/")}/<root>` +
                    '\n\nSet the `cycles` parameter to `"ref"` to resolve cyclical schemas with defs.');
            }
        }
    }
    // extract schemas into $defs
    for (const entry of ctx.seen.entries()) {
        const seen = entry[1];
        // convert root schema to # $ref
        if (schema === entry[0]) {
            extractToDef(entry); // this has special handling for the root schema
            continue;
        }
        // extract schemas that are in the external registry
        if (ctx.external) {
            const ext = ctx.external.registry.get(entry[0])?.id;
            if (schema !== entry[0] && ext) {
                extractToDef(entry);
                continue;
            }
        }
        // extract schemas with `id` meta
        const id = ctx.metadataRegistry.get(entry[0])?.id;
        if (id) {
            extractToDef(entry);
            continue;
        }
        // break cycles
        if (seen.cycle) {
            // any
            extractToDef(entry);
            continue;
        }
        // extract reused schemas
        if (seen.count > 1) {
            if (ctx.reused === "ref") {
                extractToDef(entry);
                // biome-ignore lint:
                continue;
            }
        }
    }
}
function finalize(ctx, schema) {
    const root = ctx.seen.get(schema);
    if (!root)
        throw new Error("Unprocessed schema. This is a bug in Zod.");
    // flatten refs - inherit properties from parent schemas
    const flattenRef = (zodSchema) => {
        const seen = ctx.seen.get(zodSchema);
        // already processed
        if (seen.ref === null)
            return;
        const schema = seen.def ?? seen.schema;
        const _cached = { ...schema };
        const ref = seen.ref;
        seen.ref = null; // prevent infinite recursion
        if (ref) {
            flattenRef(ref);
            const refSeen = ctx.seen.get(ref);
            const refSchema = refSeen.schema;
            // merge referenced schema into current
            if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
                // older drafts can't combine $ref with other properties
                schema.allOf = schema.allOf ?? [];
                schema.allOf.push(refSchema);
            }
            else {
                Object.assign(schema, refSchema);
            }
            // restore child's own properties (child wins)
            Object.assign(schema, _cached);
            const isParentRef = zodSchema._zod.parent === ref;
            // For parent chain, child is a refinement - remove parent-only properties
            if (isParentRef) {
                for (const key in schema) {
                    if (key === "$ref" || key === "allOf")
                        continue;
                    if (!(key in _cached)) {
                        delete schema[key];
                    }
                }
            }
            // When ref was extracted to $defs, remove properties that match the definition
            if (refSchema.$ref && refSeen.def) {
                for (const key in schema) {
                    if (key === "$ref" || key === "allOf")
                        continue;
                    if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) {
                        delete schema[key];
                    }
                }
            }
        }
        // If parent was extracted (has $ref), propagate $ref to this schema
        // This handles cases like: readonly().meta({id}).describe()
        // where processor sets ref to innerType but parent should be referenced
        const parent = zodSchema._zod.parent;
        if (parent && parent !== ref) {
            // Ensure parent is processed first so its def has inherited properties
            flattenRef(parent);
            const parentSeen = ctx.seen.get(parent);
            if (parentSeen?.schema.$ref) {
                schema.$ref = parentSeen.schema.$ref;
                // De-duplicate with parent's definition
                if (parentSeen.def) {
                    for (const key in schema) {
                        if (key === "$ref" || key === "allOf")
                            continue;
                        if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) {
                            delete schema[key];
                        }
                    }
                }
            }
        }
        // execute overrides
        ctx.override({
            zodSchema: zodSchema,
            jsonSchema: schema,
            path: seen.path ?? [],
        });
    };
    for (const entry of [...ctx.seen.entries()].reverse()) {
        flattenRef(entry[0]);
    }
    const result = {};
    if (ctx.target === "draft-2020-12") {
        result.$schema = "https://json-schema.org/draft/2020-12/schema";
    }
    else if (ctx.target === "draft-07") {
        result.$schema = "http://json-schema.org/draft-07/schema#";
    }
    else if (ctx.target === "draft-04") {
        result.$schema = "http://json-schema.org/draft-04/schema#";
    }
    else if (ctx.target === "openapi-3.0") {
        // OpenAPI 3.0 schema objects should not include a $schema property
    }
    else {
        // Arbitrary string values are allowed but won't have a $schema property set
    }
    if (ctx.external?.uri) {
        const id = ctx.external.registry.get(schema)?.id;
        if (!id)
            throw new Error("Schema is missing an `id` property");
        result.$id = ctx.external.uri(id);
    }
    Object.assign(result, root.def ?? root.schema);
    // The `id` in `.meta()` is a Zod-specific registration tag used to extract
    // schemas into $defs — it is not user-facing JSON Schema metadata. Strip it
    // from the output body where it would otherwise leak. The id is preserved
    // implicitly via the $defs key (and via $ref paths).
    const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
    if (rootMetaId !== undefined && result.id === rootMetaId)
        delete result.id;
    // build defs object
    const defs = ctx.external?.defs ?? {};
    for (const entry of ctx.seen.entries()) {
        const seen = entry[1];
        if (seen.def && seen.defId) {
            if (seen.def.id === seen.defId)
                delete seen.def.id;
            defs[seen.defId] = seen.def;
        }
    }
    // set definitions in result
    if (ctx.external) {
    }
    else {
        if (Object.keys(defs).length > 0) {
            if (ctx.target === "draft-2020-12") {
                result.$defs = defs;
            }
            else {
                result.definitions = defs;
            }
        }
    }
    try {
        // this "finalizes" this schema and ensures all cycles are removed
        // each call to finalize() is functionally independent
        // though the seen map is shared
        const finalized = JSON.parse(JSON.stringify(result));
        Object.defineProperty(finalized, "~standard", {
            value: {
                ...schema["~standard"],
                jsonSchema: {
                    input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
                    output: createStandardJSONSchemaMethod(schema, "output", ctx.processors),
                },
            },
            enumerable: false,
            writable: false,
        });
        return finalized;
    }
    catch (_err) {
        throw new Error("Error converting schema to JSON.");
    }
}
function isTransforming(_schema, _ctx) {
    const ctx = _ctx ?? { seen: new Set() };
    if (ctx.seen.has(_schema))
        return false;
    ctx.seen.add(_schema);
    const def = _schema._zod.def;
    if (def.type === "transform")
        return true;
    if (def.type === "array")
        return isTransforming(def.element, ctx);
    if (def.type === "set")
        return isTransforming(def.valueType, ctx);
    if (def.type === "lazy")
        return isTransforming(def.getter(), ctx);
    if (def.type === "promise" ||
        def.type === "optional" ||
        def.type === "nonoptional" ||
        def.type === "nullable" ||
        def.type === "readonly" ||
        def.type === "default" ||
        def.type === "prefault") {
        return isTransforming(def.innerType, ctx);
    }
    if (def.type === "intersection") {
        return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
    }
    if (def.type === "record" || def.type === "map") {
        return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
    }
    if (def.type === "pipe") {
        if (_schema._zod.traits.has("$ZodCodec"))
            return true;
        return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
    }
    if (def.type === "object") {
        for (const key in def.shape) {
            if (isTransforming(def.shape[key], ctx))
                return true;
        }
        return false;
    }
    if (def.type === "union") {
        for (const option of def.options) {
            if (isTransforming(option, ctx))
                return true;
        }
        return false;
    }
    if (def.type === "tuple") {
        for (const item of def.items) {
            if (isTransforming(item, ctx))
                return true;
        }
        if (def.rest && isTransforming(def.rest, ctx))
            return true;
        return false;
    }
    return false;
}
/**
 * Creates a toJSONSchema method for a schema instance.
 * This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
 */
const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
    const ctx = initializeContext({ ...params, processors });
    process(schema, ctx);
    extractDefs(ctx, schema);
    return finalize(ctx, schema);
};
const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
    const { libraryOptions, target } = params ?? {};
    const ctx = initializeContext({ ...(libraryOptions ?? {}), target, io, processors });
    process(schema, ctx);
    extractDefs(ctx, schema);
    return finalize(ctx, schema);
};


/***/ }),

/***/ 92220:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   $f: () => (/* binding */ escapeRegex),
/* harmony export */   A2: () => (/* binding */ normalizeParams),
/* harmony export */   Gv: () => (/* binding */ isObject),
/* harmony export */   LG: () => (/* binding */ floatSafeRemainder),
/* harmony export */   NM: () => (/* binding */ optionalKeys),
/* harmony export */   OH: () => (/* binding */ partial),
/* harmony export */   PO: () => (/* binding */ cached),
/* harmony export */   QH: () => (/* binding */ aborted),
/* harmony export */   Qd: () => (/* binding */ isPlainObject),
/* harmony export */   Rc: () => (/* binding */ getLengthableOrigin),
/* harmony export */   UQ: () => (/* binding */ esc),
/* harmony export */   Up: () => (/* binding */ pick),
/* harmony export */   W0: () => (/* binding */ safeExtend),
/* harmony export */   X$: () => (/* binding */ extend),
/* harmony export */   Yv: () => (/* binding */ slugify),
/* harmony export */   cJ: () => (/* binding */ omit),
/* harmony export */   cl: () => (/* binding */ nullish),
/* harmony export */   gJ: () => (/* binding */ defineLazy),
/* harmony export */   gx: () => (/* binding */ captureStackTrace),
/* harmony export */   h1: () => (/* binding */ merge),
/* harmony export */   hI: () => (/* binding */ allowsEval),
/* harmony export */   iR: () => (/* binding */ finalizeIssue),
/* harmony export */   k8: () => (/* binding */ jsonStringifyReplacer),
/* harmony export */   lQ: () => (/* binding */ prefixIssues),
/* harmony export */   mw: () => (/* binding */ required),
/* harmony export */   o8: () => (/* binding */ clone),
/* harmony export */   p6: () => (/* binding */ cleanRegex),
/* harmony export */   qQ: () => (/* binding */ propertyKeyTypes),
/* harmony export */   rL: () => (/* binding */ explicitlyAborted),
/* harmony export */   sn: () => (/* binding */ issue),
/* harmony export */   w5: () => (/* binding */ getEnumValues),
/* harmony export */   yG: () => (/* binding */ shallowClone),
/* harmony export */   zH: () => (/* binding */ NUMBER_FORMAT_RANGES),
/* harmony export */   zM: () => (/* binding */ mergeDefs)
/* harmony export */ });
/* unused harmony exports assertEqual, assertNotEqual, assertIs, assertNever, assert, joinValues, objectClone, assignProp, cloneDef, getElementAtPath, promiseAllObject, randomString, numKeys, getParsedType, primitiveTypes, createTransparentProxy, stringifyPrimitive, BIGINT_FORMAT_RANGES, unwrapMessage, getSizableOrigin, parsedType, cleanEnum, base64ToUint8Array, uint8ArrayToBase64, base64urlToUint8Array, uint8ArrayToBase64url, hexToUint8Array, uint8ArrayToHex, Class */
/* harmony import */ var _core_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(67415);

// functions
function assertEqual(val) {
    return val;
}
function assertNotEqual(val) {
    return val;
}
function assertIs(_arg) { }
function assertNever(_x) {
    throw new Error("Unexpected value in exhaustive check");
}
function assert(_) { }
function getEnumValues(entries) {
    const numericValues = Object.values(entries).filter((v) => typeof v === "number");
    const values = Object.entries(entries)
        .filter(([k, _]) => numericValues.indexOf(+k) === -1)
        .map(([_, v]) => v);
    return values;
}
function joinValues(array, separator = "|") {
    return array.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
    if (typeof value === "bigint")
        return value.toString();
    return value;
}
function cached(getter) {
    const set = false;
    return {
        get value() {
            if (!set) {
                const value = getter();
                Object.defineProperty(this, "value", { value });
                return value;
            }
            throw new Error("cached value already set");
        },
    };
}
function nullish(input) {
    return input === null || input === undefined;
}
function cleanRegex(source) {
    const start = source.startsWith("^") ? 1 : 0;
    const end = source.endsWith("$") ? source.length - 1 : source.length;
    return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
    const ratio = val / step;
    const roundedRatio = Math.round(ratio);
    // Use a relative epsilon scaled to the magnitude of the result
    const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
    if (Math.abs(ratio - roundedRatio) < tolerance)
        return 0;
    return ratio - roundedRatio;
}
const EVALUATING = /* @__PURE__*/ Symbol("evaluating");
function defineLazy(object, key, getter) {
    let value = undefined;
    Object.defineProperty(object, key, {
        get() {
            if (value === EVALUATING) {
                // Circular reference detected, return undefined to break the cycle
                return undefined;
            }
            if (value === undefined) {
                value = EVALUATING;
                value = getter();
            }
            return value;
        },
        set(v) {
            Object.defineProperty(object, key, {
                value: v,
                // configurable: true,
            });
            // object[key] = v;
        },
        configurable: true,
    });
}
function objectClone(obj) {
    return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
}
function assignProp(target, prop, value) {
    Object.defineProperty(target, prop, {
        value,
        writable: true,
        enumerable: true,
        configurable: true,
    });
}
function mergeDefs(...defs) {
    const mergedDescriptors = {};
    for (const def of defs) {
        const descriptors = Object.getOwnPropertyDescriptors(def);
        Object.assign(mergedDescriptors, descriptors);
    }
    return Object.defineProperties({}, mergedDescriptors);
}
function cloneDef(schema) {
    return mergeDefs(schema._zod.def);
}
function getElementAtPath(obj, path) {
    if (!path)
        return obj;
    return path.reduce((acc, key) => acc?.[key], obj);
}
function promiseAllObject(promisesObj) {
    const keys = Object.keys(promisesObj);
    const promises = keys.map((key) => promisesObj[key]);
    return Promise.all(promises).then((results) => {
        const resolvedObj = {};
        for (let i = 0; i < keys.length; i++) {
            resolvedObj[keys[i]] = results[i];
        }
        return resolvedObj;
    });
}
function randomString(length = 10) {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    let str = "";
    for (let i = 0; i < length; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
}
function esc(str) {
    return JSON.stringify(str);
}
function slugify(input) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
const captureStackTrace = ("captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => { });
function isObject(data) {
    return typeof data === "object" && data !== null && !Array.isArray(data);
}
const allowsEval = /* @__PURE__*/ cached(() => {
    // Skip the probe under `jitless`: strict CSPs report the caught `new Function`
    // as a `securitypolicyviolation` even though the throw is swallowed.
    if (_core_js__WEBPACK_IMPORTED_MODULE_0__/* .globalConfig */ .cr.jitless) {
        return false;
    }
    // @ts-ignore
    if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
        return false;
    }
    try {
        const F = Function;
        new F("");
        return true;
    }
    catch (_) {
        return false;
    }
});
function isPlainObject(o) {
    if (isObject(o) === false)
        return false;
    // modified constructor
    const ctor = o.constructor;
    if (ctor === undefined)
        return true;
    if (typeof ctor !== "function")
        return true;
    // modified prototype
    const prot = ctor.prototype;
    if (isObject(prot) === false)
        return false;
    // ctor doesn't have static `isPrototypeOf`
    if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
        return false;
    }
    return true;
}
function shallowClone(o) {
    if (isPlainObject(o))
        return { ...o };
    if (Array.isArray(o))
        return [...o];
    if (o instanceof Map)
        return new Map(o);
    if (o instanceof Set)
        return new Set(o);
    return o;
}
function numKeys(data) {
    let keyCount = 0;
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            keyCount++;
        }
    }
    return keyCount;
}
const getParsedType = (data) => {
    const t = typeof data;
    switch (t) {
        case "undefined":
            return "undefined";
        case "string":
            return "string";
        case "number":
            return Number.isNaN(data) ? "nan" : "number";
        case "boolean":
            return "boolean";
        case "function":
            return "function";
        case "bigint":
            return "bigint";
        case "symbol":
            return "symbol";
        case "object":
            if (Array.isArray(data)) {
                return "array";
            }
            if (data === null) {
                return "null";
            }
            if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
                return "promise";
            }
            if (typeof Map !== "undefined" && data instanceof Map) {
                return "map";
            }
            if (typeof Set !== "undefined" && data instanceof Set) {
                return "set";
            }
            if (typeof Date !== "undefined" && data instanceof Date) {
                return "date";
            }
            // @ts-ignore
            if (typeof File !== "undefined" && data instanceof File) {
                return "file";
            }
            return "object";
        default:
            throw new Error(`Unknown data type: ${t}`);
    }
};
const propertyKeyTypes = /* @__PURE__*/ new Set(["string", "number", "symbol"]);
const primitiveTypes = /* @__PURE__*/ new Set([
    "string",
    "number",
    "bigint",
    "boolean",
    "symbol",
    "undefined",
]);
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// zod-specific utils
function clone(inst, def, params) {
    const cl = new inst._zod.constr(def ?? inst._zod.def);
    if (!def || params?.parent)
        cl._zod.parent = inst;
    return cl;
}
function normalizeParams(_params) {
    const params = _params;
    if (!params)
        return {};
    if (typeof params === "string")
        return { error: () => params };
    if (params?.message !== undefined) {
        if (params?.error !== undefined)
            throw new Error("Cannot specify both `message` and `error` params");
        params.error = params.message;
    }
    delete params.message;
    if (typeof params.error === "string")
        return { ...params, error: () => params.error };
    return params;
}
function createTransparentProxy(getter) {
    let target;
    return new Proxy({}, {
        get(_, prop, receiver) {
            target ?? (target = getter());
            return Reflect.get(target, prop, receiver);
        },
        set(_, prop, value, receiver) {
            target ?? (target = getter());
            return Reflect.set(target, prop, value, receiver);
        },
        has(_, prop) {
            target ?? (target = getter());
            return Reflect.has(target, prop);
        },
        deleteProperty(_, prop) {
            target ?? (target = getter());
            return Reflect.deleteProperty(target, prop);
        },
        ownKeys(_) {
            target ?? (target = getter());
            return Reflect.ownKeys(target);
        },
        getOwnPropertyDescriptor(_, prop) {
            target ?? (target = getter());
            return Reflect.getOwnPropertyDescriptor(target, prop);
        },
        defineProperty(_, prop, descriptor) {
            target ?? (target = getter());
            return Reflect.defineProperty(target, prop, descriptor);
        },
    });
}
function stringifyPrimitive(value) {
    if (typeof value === "bigint")
        return value.toString() + "n";
    if (typeof value === "string")
        return `"${value}"`;
    return `${value}`;
}
function optionalKeys(shape) {
    return Object.keys(shape).filter((k) => {
        return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
    });
}
const NUMBER_FORMAT_RANGES = {
    safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    int32: [-2147483648, 2147483647],
    uint32: [0, 4294967295],
    float32: [-3.4028234663852886e38, 3.4028234663852886e38],
    float64: [-Number.MAX_VALUE, Number.MAX_VALUE],
};
const BIGINT_FORMAT_RANGES = {
    int64: [/* @__PURE__*/ BigInt("-9223372036854775808"), /* @__PURE__*/ BigInt("9223372036854775807")],
    uint64: [/* @__PURE__*/ BigInt(0), /* @__PURE__*/ BigInt("18446744073709551615")],
};
function pick(schema, mask) {
    const currDef = schema._zod.def;
    const checks = currDef.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
        throw new Error(".pick() cannot be used on object schemas containing refinements");
    }
    const def = mergeDefs(schema._zod.def, {
        get shape() {
            const newShape = {};
            for (const key in mask) {
                if (!(key in currDef.shape)) {
                    throw new Error(`Unrecognized key: "${key}"`);
                }
                if (!mask[key])
                    continue;
                newShape[key] = currDef.shape[key];
            }
            assignProp(this, "shape", newShape); // self-caching
            return newShape;
        },
        checks: [],
    });
    return clone(schema, def);
}
function omit(schema, mask) {
    const currDef = schema._zod.def;
    const checks = currDef.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
        throw new Error(".omit() cannot be used on object schemas containing refinements");
    }
    const def = mergeDefs(schema._zod.def, {
        get shape() {
            const newShape = { ...schema._zod.def.shape };
            for (const key in mask) {
                if (!(key in currDef.shape)) {
                    throw new Error(`Unrecognized key: "${key}"`);
                }
                if (!mask[key])
                    continue;
                delete newShape[key];
            }
            assignProp(this, "shape", newShape); // self-caching
            return newShape;
        },
        checks: [],
    });
    return clone(schema, def);
}
function extend(schema, shape) {
    if (!isPlainObject(shape)) {
        throw new Error("Invalid input to extend: expected a plain object");
    }
    const checks = schema._zod.def.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
        // Only throw if new shape overlaps with existing shape
        // Use getOwnPropertyDescriptor to check key existence without accessing values
        const existingShape = schema._zod.def.shape;
        for (const key in shape) {
            if (Object.getOwnPropertyDescriptor(existingShape, key) !== undefined) {
                throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
            }
        }
    }
    const def = mergeDefs(schema._zod.def, {
        get shape() {
            const _shape = { ...schema._zod.def.shape, ...shape };
            assignProp(this, "shape", _shape); // self-caching
            return _shape;
        },
    });
    return clone(schema, def);
}
function safeExtend(schema, shape) {
    if (!isPlainObject(shape)) {
        throw new Error("Invalid input to safeExtend: expected a plain object");
    }
    const def = mergeDefs(schema._zod.def, {
        get shape() {
            const _shape = { ...schema._zod.def.shape, ...shape };
            assignProp(this, "shape", _shape); // self-caching
            return _shape;
        },
    });
    return clone(schema, def);
}
function merge(a, b) {
    if (a._zod.def.checks?.length) {
        throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
    }
    const def = mergeDefs(a._zod.def, {
        get shape() {
            const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
            assignProp(this, "shape", _shape); // self-caching
            return _shape;
        },
        get catchall() {
            return b._zod.def.catchall;
        },
        checks: b._zod.def.checks ?? [],
    });
    return clone(a, def);
}
function partial(Class, schema, mask) {
    const currDef = schema._zod.def;
    const checks = currDef.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
        throw new Error(".partial() cannot be used on object schemas containing refinements");
    }
    const def = mergeDefs(schema._zod.def, {
        get shape() {
            const oldShape = schema._zod.def.shape;
            const shape = { ...oldShape };
            if (mask) {
                for (const key in mask) {
                    if (!(key in oldShape)) {
                        throw new Error(`Unrecognized key: "${key}"`);
                    }
                    if (!mask[key])
                        continue;
                    // if (oldShape[key]!._zod.optin === "optional") continue;
                    shape[key] = Class
                        ? new Class({
                            type: "optional",
                            innerType: oldShape[key],
                        })
                        : oldShape[key];
                }
            }
            else {
                for (const key in oldShape) {
                    // if (oldShape[key]!._zod.optin === "optional") continue;
                    shape[key] = Class
                        ? new Class({
                            type: "optional",
                            innerType: oldShape[key],
                        })
                        : oldShape[key];
                }
            }
            assignProp(this, "shape", shape); // self-caching
            return shape;
        },
        checks: [],
    });
    return clone(schema, def);
}
function required(Class, schema, mask) {
    const def = mergeDefs(schema._zod.def, {
        get shape() {
            const oldShape = schema._zod.def.shape;
            const shape = { ...oldShape };
            if (mask) {
                for (const key in mask) {
                    if (!(key in shape)) {
                        throw new Error(`Unrecognized key: "${key}"`);
                    }
                    if (!mask[key])
                        continue;
                    // overwrite with non-optional
                    shape[key] = new Class({
                        type: "nonoptional",
                        innerType: oldShape[key],
                    });
                }
            }
            else {
                for (const key in oldShape) {
                    // overwrite with non-optional
                    shape[key] = new Class({
                        type: "nonoptional",
                        innerType: oldShape[key],
                    });
                }
            }
            assignProp(this, "shape", shape); // self-caching
            return shape;
        },
    });
    return clone(schema, def);
}
// invalid_type | too_big | too_small | invalid_format | not_multiple_of | unrecognized_keys | invalid_union | invalid_key | invalid_element | invalid_value | custom
function aborted(x, startIndex = 0) {
    if (x.aborted === true)
        return true;
    for (let i = startIndex; i < x.issues.length; i++) {
        if (x.issues[i]?.continue !== true) {
            return true;
        }
    }
    return false;
}
// Checks for explicit abort (continue === false), as opposed to implicit abort (continue === undefined).
// Used to respect `abort: true` in .refine() even for checks that have a `when` function.
function explicitlyAborted(x, startIndex = 0) {
    if (x.aborted === true)
        return true;
    for (let i = startIndex; i < x.issues.length; i++) {
        if (x.issues[i]?.continue === false) {
            return true;
        }
    }
    return false;
}
function prefixIssues(path, issues) {
    return issues.map((iss) => {
        var _a;
        (_a = iss).path ?? (_a.path = []);
        iss.path.unshift(path);
        return iss;
    });
}
function unwrapMessage(message) {
    return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config) {
    const message = iss.message
        ? iss.message
        : (unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ??
            unwrapMessage(ctx?.error?.(iss)) ??
            unwrapMessage(config.customError?.(iss)) ??
            unwrapMessage(config.localeError?.(iss)) ??
            "Invalid input");
    const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
    rest.path ?? (rest.path = []);
    rest.message = message;
    if (ctx?.reportInput) {
        rest.input = _input;
    }
    return rest;
}
function getSizableOrigin(input) {
    if (input instanceof Set)
        return "set";
    if (input instanceof Map)
        return "map";
    // @ts-ignore
    if (input instanceof File)
        return "file";
    return "unknown";
}
function getLengthableOrigin(input) {
    if (Array.isArray(input))
        return "array";
    if (typeof input === "string")
        return "string";
    return "unknown";
}
function parsedType(data) {
    const t = typeof data;
    switch (t) {
        case "number": {
            return Number.isNaN(data) ? "nan" : "number";
        }
        case "object": {
            if (data === null) {
                return "null";
            }
            if (Array.isArray(data)) {
                return "array";
            }
            const obj = data;
            if (obj && Object.getPrototypeOf(obj) !== Object.prototype && "constructor" in obj && obj.constructor) {
                return obj.constructor.name;
            }
        }
    }
    return t;
}
function issue(...args) {
    const [iss, input, inst] = args;
    if (typeof iss === "string") {
        return {
            message: iss,
            code: "custom",
            input,
            inst,
        };
    }
    return { ...iss };
}
function cleanEnum(obj) {
    return Object.entries(obj)
        .filter(([k, _]) => {
        // return true if NaN, meaning it's not a number, thus a string key
        return Number.isNaN(Number.parseInt(k, 10));
    })
        .map((el) => el[1]);
}
// Codec utility functions
function base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}
function uint8ArrayToBase64(bytes) {
    let binaryString = "";
    for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
    }
    return btoa(binaryString);
}
function base64urlToUint8Array(base64url) {
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    return base64ToUint8Array(base64 + padding);
}
function uint8ArrayToBase64url(bytes) {
    return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function hexToUint8Array(hex) {
    const cleanHex = hex.replace(/^0x/, "");
    if (cleanHex.length % 2 !== 0) {
        throw new Error("Invalid hex string length");
    }
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
        bytes[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
    }
    return bytes;
}
function uint8ArrayToHex(bytes) {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
// instanceof
class Class {
    constructor(..._args) { }
}


/***/ })

};
