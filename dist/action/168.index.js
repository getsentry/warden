export const id = 168;
export const ids = [168];
export const modules = {

/***/ 92685:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



const PROTECTED_KEYS = {
    REQUEST_ID: Symbol.for("_AWS_LAMBDA_REQUEST_ID"),
    X_RAY_TRACE_ID: Symbol.for("_AWS_LAMBDA_X_RAY_TRACE_ID"),
    TENANT_ID: Symbol.for("_AWS_LAMBDA_TENANT_ID"),
};
const NO_GLOBAL_AWS_LAMBDA = ["true", "1"].includes(process.env?.AWS_LAMBDA_NODEJS_NO_GLOBAL_AWSLAMBDA ?? "");
if (!NO_GLOBAL_AWS_LAMBDA) {
    globalThis.awslambda = globalThis.awslambda || {};
}
class InvokeStoreBase {
    static PROTECTED_KEYS = PROTECTED_KEYS;
    isProtectedKey(key) {
        return Object.values(PROTECTED_KEYS).includes(key);
    }
    getRequestId() {
        return this.get(PROTECTED_KEYS.REQUEST_ID) ?? "-";
    }
    getXRayTraceId() {
        return this.get(PROTECTED_KEYS.X_RAY_TRACE_ID);
    }
    getTenantId() {
        return this.get(PROTECTED_KEYS.TENANT_ID);
    }
}
class InvokeStoreSingle extends InvokeStoreBase {
    currentContext;
    getContext() {
        return this.currentContext;
    }
    hasContext() {
        return this.currentContext !== undefined;
    }
    get(key) {
        return this.currentContext?.[key];
    }
    set(key, value) {
        if (this.isProtectedKey(key)) {
            throw new Error(`Cannot modify protected Lambda context field: ${String(key)}`);
        }
        this.currentContext = this.currentContext || {};
        this.currentContext[key] = value;
    }
    run(context, fn) {
        this.currentContext = context;
        return fn();
    }
}
class InvokeStoreMulti extends InvokeStoreBase {
    als;
    static async create() {
        const instance = new InvokeStoreMulti();
        const asyncHooks = await Promise.resolve(/* import() */).then(__webpack_require__.t.bind(__webpack_require__, 16698, 23));
        instance.als = new asyncHooks.AsyncLocalStorage();
        return instance;
    }
    getContext() {
        return this.als.getStore();
    }
    hasContext() {
        return this.als.getStore() !== undefined;
    }
    get(key) {
        return this.als.getStore()?.[key];
    }
    set(key, value) {
        if (this.isProtectedKey(key)) {
            throw new Error(`Cannot modify protected Lambda context field: ${String(key)}`);
        }
        const store = this.als.getStore();
        if (!store) {
            throw new Error("No context available");
        }
        store[key] = value;
    }
    run(context, fn) {
        return this.als.run(context, fn);
    }
}
exports.InvokeStore = void 0;
(function (InvokeStore) {
    let instance = null;
    async function getInstanceAsync(forceInvokeStoreMulti) {
        if (!instance) {
            instance = (async () => {
                const isMulti = forceInvokeStoreMulti === true || "AWS_LAMBDA_MAX_CONCURRENCY" in process.env;
                const newInstance = isMulti
                    ? await InvokeStoreMulti.create()
                    : new InvokeStoreSingle();
                if (!NO_GLOBAL_AWS_LAMBDA && globalThis.awslambda?.InvokeStore) {
                    return globalThis.awslambda.InvokeStore;
                }
                else if (!NO_GLOBAL_AWS_LAMBDA && globalThis.awslambda) {
                    globalThis.awslambda.InvokeStore = newInstance;
                    return newInstance;
                }
                else {
                    return newInstance;
                }
            })();
        }
        return instance;
    }
    InvokeStore.getInstanceAsync = getInstanceAsync;
    InvokeStore._testing = process.env.AWS_LAMBDA_BENCHMARK_MODE === "1"
        ? {
            reset: () => {
                instance = null;
                if (globalThis.awslambda?.InvokeStore) {
                    delete globalThis.awslambda.InvokeStore;
                }
                globalThis.awslambda = { InvokeStore: undefined };
            },
        }
        : undefined;
})(exports.InvokeStore || (exports.InvokeStore = {}));

exports.InvokeStoreBase = InvokeStoreBase;


/***/ }),

/***/ 83294:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AwsCrc32 = void 0;
var tslib_1 = __webpack_require__(53824);
var util_1 = __webpack_require__(71255);
var index_1 = __webpack_require__(14123);
var AwsCrc32 = /** @class */ (function () {
    function AwsCrc32() {
        this.crc32 = new index_1.Crc32();
    }
    AwsCrc32.prototype.update = function (toHash) {
        if ((0, util_1.isEmptyData)(toHash))
            return;
        this.crc32.update((0, util_1.convertToBuffer)(toHash));
    };
    AwsCrc32.prototype.digest = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                return [2 /*return*/, (0, util_1.numToUint8)(this.crc32.digest())];
            });
        });
    };
    AwsCrc32.prototype.reset = function () {
        this.crc32 = new index_1.Crc32();
    };
    return AwsCrc32;
}());
exports.AwsCrc32 = AwsCrc32;
//# sourceMappingURL=aws_crc32.js.map

/***/ }),

/***/ 14123:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AwsCrc32 = exports.Crc32 = exports.crc32 = void 0;
var tslib_1 = __webpack_require__(53824);
var util_1 = __webpack_require__(71255);
function crc32(data) {
    return new Crc32().update(data).digest();
}
exports.crc32 = crc32;
var Crc32 = /** @class */ (function () {
    function Crc32() {
        this.checksum = 0xffffffff;
    }
    Crc32.prototype.update = function (data) {
        var e_1, _a;
        try {
            for (var data_1 = tslib_1.__values(data), data_1_1 = data_1.next(); !data_1_1.done; data_1_1 = data_1.next()) {
                var byte = data_1_1.value;
                this.checksum =
                    (this.checksum >>> 8) ^ lookupTable[(this.checksum ^ byte) & 0xff];
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (data_1_1 && !data_1_1.done && (_a = data_1.return)) _a.call(data_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return this;
    };
    Crc32.prototype.digest = function () {
        return (this.checksum ^ 0xffffffff) >>> 0;
    };
    return Crc32;
}());
exports.Crc32 = Crc32;
// prettier-ignore
var a_lookUpTable = [
    0x00000000, 0x77073096, 0xEE0E612C, 0x990951BA,
    0x076DC419, 0x706AF48F, 0xE963A535, 0x9E6495A3,
    0x0EDB8832, 0x79DCB8A4, 0xE0D5E91E, 0x97D2D988,
    0x09B64C2B, 0x7EB17CBD, 0xE7B82D07, 0x90BF1D91,
    0x1DB71064, 0x6AB020F2, 0xF3B97148, 0x84BE41DE,
    0x1ADAD47D, 0x6DDDE4EB, 0xF4D4B551, 0x83D385C7,
    0x136C9856, 0x646BA8C0, 0xFD62F97A, 0x8A65C9EC,
    0x14015C4F, 0x63066CD9, 0xFA0F3D63, 0x8D080DF5,
    0x3B6E20C8, 0x4C69105E, 0xD56041E4, 0xA2677172,
    0x3C03E4D1, 0x4B04D447, 0xD20D85FD, 0xA50AB56B,
    0x35B5A8FA, 0x42B2986C, 0xDBBBC9D6, 0xACBCF940,
    0x32D86CE3, 0x45DF5C75, 0xDCD60DCF, 0xABD13D59,
    0x26D930AC, 0x51DE003A, 0xC8D75180, 0xBFD06116,
    0x21B4F4B5, 0x56B3C423, 0xCFBA9599, 0xB8BDA50F,
    0x2802B89E, 0x5F058808, 0xC60CD9B2, 0xB10BE924,
    0x2F6F7C87, 0x58684C11, 0xC1611DAB, 0xB6662D3D,
    0x76DC4190, 0x01DB7106, 0x98D220BC, 0xEFD5102A,
    0x71B18589, 0x06B6B51F, 0x9FBFE4A5, 0xE8B8D433,
    0x7807C9A2, 0x0F00F934, 0x9609A88E, 0xE10E9818,
    0x7F6A0DBB, 0x086D3D2D, 0x91646C97, 0xE6635C01,
    0x6B6B51F4, 0x1C6C6162, 0x856530D8, 0xF262004E,
    0x6C0695ED, 0x1B01A57B, 0x8208F4C1, 0xF50FC457,
    0x65B0D9C6, 0x12B7E950, 0x8BBEB8EA, 0xFCB9887C,
    0x62DD1DDF, 0x15DA2D49, 0x8CD37CF3, 0xFBD44C65,
    0x4DB26158, 0x3AB551CE, 0xA3BC0074, 0xD4BB30E2,
    0x4ADFA541, 0x3DD895D7, 0xA4D1C46D, 0xD3D6F4FB,
    0x4369E96A, 0x346ED9FC, 0xAD678846, 0xDA60B8D0,
    0x44042D73, 0x33031DE5, 0xAA0A4C5F, 0xDD0D7CC9,
    0x5005713C, 0x270241AA, 0xBE0B1010, 0xC90C2086,
    0x5768B525, 0x206F85B3, 0xB966D409, 0xCE61E49F,
    0x5EDEF90E, 0x29D9C998, 0xB0D09822, 0xC7D7A8B4,
    0x59B33D17, 0x2EB40D81, 0xB7BD5C3B, 0xC0BA6CAD,
    0xEDB88320, 0x9ABFB3B6, 0x03B6E20C, 0x74B1D29A,
    0xEAD54739, 0x9DD277AF, 0x04DB2615, 0x73DC1683,
    0xE3630B12, 0x94643B84, 0x0D6D6A3E, 0x7A6A5AA8,
    0xE40ECF0B, 0x9309FF9D, 0x0A00AE27, 0x7D079EB1,
    0xF00F9344, 0x8708A3D2, 0x1E01F268, 0x6906C2FE,
    0xF762575D, 0x806567CB, 0x196C3671, 0x6E6B06E7,
    0xFED41B76, 0x89D32BE0, 0x10DA7A5A, 0x67DD4ACC,
    0xF9B9DF6F, 0x8EBEEFF9, 0x17B7BE43, 0x60B08ED5,
    0xD6D6A3E8, 0xA1D1937E, 0x38D8C2C4, 0x4FDFF252,
    0xD1BB67F1, 0xA6BC5767, 0x3FB506DD, 0x48B2364B,
    0xD80D2BDA, 0xAF0A1B4C, 0x36034AF6, 0x41047A60,
    0xDF60EFC3, 0xA867DF55, 0x316E8EEF, 0x4669BE79,
    0xCB61B38C, 0xBC66831A, 0x256FD2A0, 0x5268E236,
    0xCC0C7795, 0xBB0B4703, 0x220216B9, 0x5505262F,
    0xC5BA3BBE, 0xB2BD0B28, 0x2BB45A92, 0x5CB36A04,
    0xC2D7FFA7, 0xB5D0CF31, 0x2CD99E8B, 0x5BDEAE1D,
    0x9B64C2B0, 0xEC63F226, 0x756AA39C, 0x026D930A,
    0x9C0906A9, 0xEB0E363F, 0x72076785, 0x05005713,
    0x95BF4A82, 0xE2B87A14, 0x7BB12BAE, 0x0CB61B38,
    0x92D28E9B, 0xE5D5BE0D, 0x7CDCEFB7, 0x0BDBDF21,
    0x86D3D2D4, 0xF1D4E242, 0x68DDB3F8, 0x1FDA836E,
    0x81BE16CD, 0xF6B9265B, 0x6FB077E1, 0x18B74777,
    0x88085AE6, 0xFF0F6A70, 0x66063BCA, 0x11010B5C,
    0x8F659EFF, 0xF862AE69, 0x616BFFD3, 0x166CCF45,
    0xA00AE278, 0xD70DD2EE, 0x4E048354, 0x3903B3C2,
    0xA7672661, 0xD06016F7, 0x4969474D, 0x3E6E77DB,
    0xAED16A4A, 0xD9D65ADC, 0x40DF0B66, 0x37D83BF0,
    0xA9BCAE53, 0xDEBB9EC5, 0x47B2CF7F, 0x30B5FFE9,
    0xBDBDF21C, 0xCABAC28A, 0x53B39330, 0x24B4A3A6,
    0xBAD03605, 0xCDD70693, 0x54DE5729, 0x23D967BF,
    0xB3667A2E, 0xC4614AB8, 0x5D681B02, 0x2A6F2B94,
    0xB40BBE37, 0xC30C8EA1, 0x5A05DF1B, 0x2D02EF8D,
];
var lookupTable = (0, util_1.uint32ArrayFrom)(a_lookUpTable);
var aws_crc32_1 = __webpack_require__(83294);
Object.defineProperty(exports, "AwsCrc32", ({ enumerable: true, get: function () { return aws_crc32_1.AwsCrc32; } }));
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 30703:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.convertToBuffer = void 0;
var util_utf8_1 = __webpack_require__(11478);
// Quick polyfill
var fromUtf8 = typeof Buffer !== "undefined" && Buffer.from
    ? function (input) { return Buffer.from(input, "utf8"); }
    : util_utf8_1.fromUtf8;
function convertToBuffer(data) {
    // Already a Uint8, do nothing
    if (data instanceof Uint8Array)
        return data;
    if (typeof data === "string") {
        return fromUtf8(data);
    }
    if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength / Uint8Array.BYTES_PER_ELEMENT);
    }
    return new Uint8Array(data);
}
exports.convertToBuffer = convertToBuffer;
//# sourceMappingURL=convertToBuffer.js.map

/***/ }),

/***/ 71255:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.uint32ArrayFrom = exports.numToUint8 = exports.isEmptyData = exports.convertToBuffer = void 0;
var convertToBuffer_1 = __webpack_require__(30703);
Object.defineProperty(exports, "convertToBuffer", ({ enumerable: true, get: function () { return convertToBuffer_1.convertToBuffer; } }));
var isEmptyData_1 = __webpack_require__(86342);
Object.defineProperty(exports, "isEmptyData", ({ enumerable: true, get: function () { return isEmptyData_1.isEmptyData; } }));
var numToUint8_1 = __webpack_require__(88288);
Object.defineProperty(exports, "numToUint8", ({ enumerable: true, get: function () { return numToUint8_1.numToUint8; } }));
var uint32ArrayFrom_1 = __webpack_require__(10605);
Object.defineProperty(exports, "uint32ArrayFrom", ({ enumerable: true, get: function () { return uint32ArrayFrom_1.uint32ArrayFrom; } }));
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 86342:
/***/ ((__unused_webpack_module, exports) => {


// Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isEmptyData = void 0;
function isEmptyData(data) {
    if (typeof data === "string") {
        return data.length === 0;
    }
    return data.byteLength === 0;
}
exports.isEmptyData = isEmptyData;
//# sourceMappingURL=isEmptyData.js.map

/***/ }),

/***/ 88288:
/***/ ((__unused_webpack_module, exports) => {


// Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.numToUint8 = void 0;
function numToUint8(num) {
    return new Uint8Array([
        (num & 0xff000000) >> 24,
        (num & 0x00ff0000) >> 16,
        (num & 0x0000ff00) >> 8,
        num & 0x000000ff,
    ]);
}
exports.numToUint8 = numToUint8;
//# sourceMappingURL=numToUint8.js.map

/***/ }),

/***/ 10605:
/***/ ((__unused_webpack_module, exports) => {


// Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.uint32ArrayFrom = void 0;
// IE 11 does not support Array.from, so we do it manually
function uint32ArrayFrom(a_lookUpTable) {
    if (!Uint32Array.from) {
        var return_array = new Uint32Array(a_lookUpTable.length);
        var a_index = 0;
        while (a_index < a_lookUpTable.length) {
            return_array[a_index] = a_lookUpTable[a_index];
            a_index += 1;
        }
        return return_array;
    }
    return Uint32Array.from(a_lookUpTable);
}
exports.uint32ArrayFrom = uint32ArrayFrom;
//# sourceMappingURL=uint32ArrayFrom.js.map

/***/ }),

/***/ 46556:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.resolveHttpAuthSchemeConfig = exports.defaultBedrockRuntimeHttpAuthSchemeProvider = exports.defaultBedrockRuntimeHttpAuthSchemeParametersProvider = void 0;
const httpAuthSchemes_1 = __webpack_require__(65741);
const core_1 = __webpack_require__(86578);
const client_1 = __webpack_require__(63234);
const defaultBedrockRuntimeHttpAuthSchemeParametersProvider = async (config, context, input) => {
    return {
        operation: (0, client_1.getSmithyContext)(context).operation,
        region: await (0, client_1.normalizeProvider)(config.region)() || (() => {
            throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
        })(),
    };
};
exports.defaultBedrockRuntimeHttpAuthSchemeParametersProvider = defaultBedrockRuntimeHttpAuthSchemeParametersProvider;
function createAwsAuthSigv4HttpAuthOption(authParameters) {
    return {
        schemeId: "aws.auth#sigv4",
        signingProperties: {
            name: "bedrock",
            region: authParameters.region,
        },
        propertiesExtractor: (config, context) => ({
            signingProperties: {
                config,
                context,
            },
        }),
    };
}
function createSmithyApiHttpBearerAuthHttpAuthOption(authParameters) {
    return {
        schemeId: "smithy.api#httpBearerAuth",
        propertiesExtractor: ({ profile, filepath, configFilepath, ignoreCache, }, context) => ({
            identityProperties: {
                profile,
                filepath,
                configFilepath,
                ignoreCache,
            },
        }),
    };
}
const defaultBedrockRuntimeHttpAuthSchemeProvider = (authParameters) => {
    const options = [];
    switch (authParameters.operation) {
        default: {
            options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
            options.push(createSmithyApiHttpBearerAuthHttpAuthOption(authParameters));
        }
    }
    return options;
};
exports.defaultBedrockRuntimeHttpAuthSchemeProvider = defaultBedrockRuntimeHttpAuthSchemeProvider;
const resolveHttpAuthSchemeConfig = (config) => {
    const token = (0, core_1.memoizeIdentityProvider)(config.token, core_1.isIdentityExpired, core_1.doesIdentityRequireRefresh);
    const config_0 = (0, httpAuthSchemes_1.resolveAwsSdkSigV4Config)(config);
    return Object.assign(config_0, {
        authSchemePreference: (0, client_1.normalizeProvider)(config.authSchemePreference ?? []),
        token,
    });
};
exports.resolveHttpAuthSchemeConfig = resolveHttpAuthSchemeConfig;


/***/ }),

/***/ 27559:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.bdd = void 0;
const endpoints_1 = __webpack_require__(86773);
const k = "ref";
const a = -1, b = true, c = "isSet", d = "PartitionResult", e = "booleanEquals", f = "getAttr", g = { [k]: "Endpoint" }, h = { [k]: d }, i = {}, j = [{ [k]: "Region" }];
const _data = {
    conditions: [
        [c, [g]],
        [c, j],
        ["aws.partition", j, d],
        [e, [{ [k]: "UseFIPS" }, b]],
        [e, [{ [k]: "UseDualStack" }, b]],
        [e, [{ fn: f, argv: [h, "supportsDualStack"] }, b]],
        [e, [{ fn: f, argv: [h, "supportsFIPS"] }, b]]
    ],
    results: [
        [a],
        [a, "Invalid Configuration: FIPS and custom endpoint are not supported"],
        [a, "Invalid Configuration: Dualstack and custom endpoint are not supported"],
        [g, i],
        ["https://bedrock-runtime-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", i],
        [a, "FIPS and DualStack are enabled, but this partition does not support one or both"],
        ["https://bedrock-runtime-fips.{Region}.{PartitionResult#dnsSuffix}", i],
        [a, "FIPS is enabled but this partition does not support FIPS"],
        ["https://bedrock-runtime.{Region}.{PartitionResult#dualStackDnsSuffix}", i],
        [a, "DualStack is enabled but this partition does not support DualStack"],
        ["https://bedrock-runtime.{Region}.{PartitionResult#dnsSuffix}", i],
        [a, "Invalid Configuration: Missing Region"]
    ]
};
const root = 2;
const r = 100_000_000;
const nodes = new Int32Array([
    -1, 1, -1,
    0, 12, 3,
    1, 4, r + 11,
    2, 5, r + 11,
    3, 8, 6,
    4, 7, r + 10,
    5, r + 8, r + 9,
    4, 10, 9,
    6, r + 6, r + 7,
    5, 11, r + 5,
    6, r + 4, r + 5,
    3, r + 1, 13,
    4, r + 2, r + 3,
]);
exports.bdd = endpoints_1.BinaryDecisionDiagram.from(nodes, root, _data.conditions, _data.results);


/***/ }),

/***/ 91330:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.defaultEndpointResolver = void 0;
const client_1 = __webpack_require__(77186);
const endpoints_1 = __webpack_require__(86773);
const bdd_1 = __webpack_require__(27559);
const cache = new endpoints_1.EndpointCache({
    size: 50,
    params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"],
});
const defaultEndpointResolver = (endpointParams, context = {}) => {
    return cache.get(endpointParams, () => (0, endpoints_1.decideEndpoint)(bdd_1.bdd, {
        endpointParams: endpointParams,
        logger: context.logger,
    }));
};
exports.defaultEndpointResolver = defaultEndpointResolver;
endpoints_1.customEndpointFunctions.aws = client_1.awsEndpointFunctions;


/***/ }),

/***/ 64883:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var client$1 = __webpack_require__(77186);
var middlewareEventstream = __webpack_require__(53996);
var middlewareWebsocket = __webpack_require__(93897);
var core = __webpack_require__(86578);
var client = __webpack_require__(63234);
var config = __webpack_require__(99659);
var endpoints = __webpack_require__(86773);
var eventStreams = __webpack_require__(40051);
var protocols = __webpack_require__(45598);
var retry = __webpack_require__(64233);
var schema = __webpack_require__(95258);
var httpAuthSchemeProvider = __webpack_require__(46556);
var runtimeConfig = __webpack_require__(86197);
var schemas_0 = __webpack_require__(52887);
var errors = __webpack_require__(72467);
var BedrockRuntimeServiceException = __webpack_require__(73858);

const resolveClientEndpointParameters = (options) => {
    return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        defaultSigningName: "bedrock",
    });
};
const commonParams = {
    UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
    Endpoint: { type: "builtInParams", name: "endpoint" },
    Region: { type: "builtInParams", name: "region" },
    UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" },
};

const getHttpAuthExtensionConfiguration = (runtimeConfig) => {
    const _httpAuthSchemes = runtimeConfig.httpAuthSchemes;
    let _httpAuthSchemeProvider = runtimeConfig.httpAuthSchemeProvider;
    let _credentials = runtimeConfig.credentials;
    let _token = runtimeConfig.token;
    return {
        setHttpAuthScheme(httpAuthScheme) {
            const index = _httpAuthSchemes.findIndex((scheme) => scheme.schemeId === httpAuthScheme.schemeId);
            if (index === -1) {
                _httpAuthSchemes.push(httpAuthScheme);
            }
            else {
                _httpAuthSchemes.splice(index, 1, httpAuthScheme);
            }
        },
        httpAuthSchemes() {
            return _httpAuthSchemes;
        },
        setHttpAuthSchemeProvider(httpAuthSchemeProvider) {
            _httpAuthSchemeProvider = httpAuthSchemeProvider;
        },
        httpAuthSchemeProvider() {
            return _httpAuthSchemeProvider;
        },
        setCredentials(credentials) {
            _credentials = credentials;
        },
        credentials() {
            return _credentials;
        },
        setToken(token) {
            _token = token;
        },
        token() {
            return _token;
        },
    };
};
const resolveHttpAuthRuntimeConfig = (config) => {
    return {
        httpAuthSchemes: config.httpAuthSchemes(),
        httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
        credentials: config.credentials(),
        token: config.token(),
    };
};

const resolveRuntimeExtensions = (runtimeConfig, extensions) => {
    const extensionConfiguration = Object.assign(client$1.getAwsRegionExtensionConfiguration(runtimeConfig), client.getDefaultExtensionConfiguration(runtimeConfig), protocols.getHttpHandlerExtensionConfiguration(runtimeConfig), getHttpAuthExtensionConfiguration(runtimeConfig));
    extensions.forEach((extension) => extension.configure(extensionConfiguration));
    return Object.assign(runtimeConfig, client$1.resolveAwsRegionExtensionConfiguration(extensionConfiguration), client.resolveDefaultRuntimeConfig(extensionConfiguration), protocols.resolveHttpHandlerRuntimeConfig(extensionConfiguration), resolveHttpAuthRuntimeConfig(extensionConfiguration));
};

class BedrockRuntimeClient extends client.Client {
    config;
    constructor(...[configuration]) {
        const _config_0 = runtimeConfig.getRuntimeConfig(configuration || {});
        super(_config_0);
        this.initConfig = _config_0;
        const _config_1 = resolveClientEndpointParameters(_config_0);
        const _config_2 = client$1.resolveUserAgentConfig(_config_1);
        const _config_3 = retry.resolveRetryConfig(_config_2);
        const _config_4 = config.resolveRegionConfig(_config_3);
        const _config_5 = client$1.resolveHostHeaderConfig(_config_4);
        const _config_6 = endpoints.resolveEndpointConfig(_config_5);
        const _config_7 = eventStreams.resolveEventStreamSerdeConfig(_config_6);
        const _config_8 = httpAuthSchemeProvider.resolveHttpAuthSchemeConfig(_config_7);
        const _config_9 = middlewareEventstream.resolveEventStreamConfig(_config_8);
        const _config_10 = middlewareWebsocket.resolveWebSocketConfig(_config_9);
        const _config_11 = resolveRuntimeExtensions(_config_10, configuration?.extensions || []);
        this.config = _config_11;
        this.middlewareStack.use(schema.getSchemaSerdePlugin(this.config));
        this.middlewareStack.use(client$1.getUserAgentPlugin(this.config));
        this.middlewareStack.use(retry.getRetryPlugin(this.config));
        this.middlewareStack.use(protocols.getContentLengthPlugin(this.config));
        this.middlewareStack.use(client$1.getHostHeaderPlugin(this.config));
        this.middlewareStack.use(client$1.getLoggerPlugin(this.config));
        this.middlewareStack.use(client$1.getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(core.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
            httpAuthSchemeParametersProvider: httpAuthSchemeProvider.defaultBedrockRuntimeHttpAuthSchemeParametersProvider,
            identityProviderConfigProvider: async (config) => new core.DefaultIdentityProviderConfig({
                "aws.auth#sigv4": config.credentials,
                "smithy.api#httpBearerAuth": config.token,
            }),
        }));
        this.middlewareStack.use(core.getHttpSigningPlugin(this.config));
    }
    destroy() {
        super.destroy();
    }
}

class ApplyGuardrailCommand extends client.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [endpoints.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "ApplyGuardrail", {})
    .n("BedrockRuntimeClient", "ApplyGuardrailCommand")
    .sc(schemas_0.ApplyGuardrail$)
    .build() {
}

class ConverseCommand extends client.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [endpoints.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "Converse", {})
    .n("BedrockRuntimeClient", "ConverseCommand")
    .sc(schemas_0.Converse$)
    .build() {
}

class ConverseStreamCommand extends client.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [endpoints.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "ConverseStream", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockRuntimeClient", "ConverseStreamCommand")
    .sc(schemas_0.ConverseStream$)
    .build() {
}

class CountTokensCommand extends client.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [endpoints.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "CountTokens", {})
    .n("BedrockRuntimeClient", "CountTokensCommand")
    .sc(schemas_0.CountTokens$)
    .build() {
}

class GetAsyncInvokeCommand extends client.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [endpoints.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "GetAsyncInvoke", {})
    .n("BedrockRuntimeClient", "GetAsyncInvokeCommand")
    .sc(schemas_0.GetAsyncInvoke$)
    .build() {
}

class InvokeModelCommand extends client.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [endpoints.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "InvokeModel", {})
    .n("BedrockRuntimeClient", "InvokeModelCommand")
    .sc(schemas_0.InvokeModel$)
    .build() {
}

class InvokeModelWithBidirectionalStreamCommand extends client.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        endpoints.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareEventstream.getEventStreamPlugin(config),
        middlewareWebsocket.getWebSocketPlugin(config, {
            headerPrefix: 'x-amz-bedrock-',
        }),
    ];
})
    .s("AmazonBedrockFrontendService", "InvokeModelWithBidirectionalStream", {
    eventStream: {
        input: true,
        output: true,
    },
})
    .n("BedrockRuntimeClient", "InvokeModelWithBidirectionalStreamCommand")
    .sc(schemas_0.InvokeModelWithBidirectionalStream$)
    .build() {
}

class InvokeModelWithResponseStreamCommand extends client.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [endpoints.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "InvokeModelWithResponseStream", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockRuntimeClient", "InvokeModelWithResponseStreamCommand")
    .sc(schemas_0.InvokeModelWithResponseStream$)
    .build() {
}

class ListAsyncInvokesCommand extends client.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [endpoints.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "ListAsyncInvokes", {})
    .n("BedrockRuntimeClient", "ListAsyncInvokesCommand")
    .sc(schemas_0.ListAsyncInvokes$)
    .build() {
}

class StartAsyncInvokeCommand extends client.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [endpoints.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "StartAsyncInvoke", {})
    .n("BedrockRuntimeClient", "StartAsyncInvokeCommand")
    .sc(schemas_0.StartAsyncInvoke$)
    .build() {
}

const paginateListAsyncInvokes = core.createPaginator(BedrockRuntimeClient, ListAsyncInvokesCommand, "nextToken", "nextToken", "maxResults");

const commands = {
    ApplyGuardrailCommand,
    ConverseCommand,
    ConverseStreamCommand,
    CountTokensCommand,
    GetAsyncInvokeCommand,
    InvokeModelCommand,
    InvokeModelWithBidirectionalStreamCommand,
    InvokeModelWithResponseStreamCommand,
    ListAsyncInvokesCommand,
    StartAsyncInvokeCommand,
};
const paginators = {
    paginateListAsyncInvokes,
};
class BedrockRuntime extends BedrockRuntimeClient {
}
client.createAggregatedClient(commands, BedrockRuntime, { paginators });

const AsyncInvokeStatus = {
    COMPLETED: "Completed",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
};
const SortAsyncInvocationBy = {
    SUBMISSION_TIME: "SubmissionTime",
};
const SortOrder = {
    ASCENDING: "Ascending",
    DESCENDING: "Descending",
};
const GuardrailImageFormat = {
    JPEG: "jpeg",
    PNG: "png",
};
const GuardrailContentQualifier = {
    GROUNDING_SOURCE: "grounding_source",
    GUARD_CONTENT: "guard_content",
    QUERY: "query",
};
const GuardrailOutputScope = {
    FULL: "FULL",
    INTERVENTIONS: "INTERVENTIONS",
};
const GuardrailContentSource = {
    INPUT: "INPUT",
    OUTPUT: "OUTPUT",
};
const GuardrailAction = {
    GUARDRAIL_INTERVENED: "GUARDRAIL_INTERVENED",
    NONE: "NONE",
};
const GuardrailOrigin = {
    ACCOUNT_ENFORCED: "ACCOUNT_ENFORCED",
    ORGANIZATION_ENFORCED: "ORGANIZATION_ENFORCED",
    REQUEST: "REQUEST",
};
const GuardrailOwnership = {
    CROSS_ACCOUNT: "CROSS_ACCOUNT",
    SELF: "SELF",
};
const GuardrailAutomatedReasoningLogicWarningType = {
    ALWAYS_FALSE: "ALWAYS_FALSE",
    ALWAYS_TRUE: "ALWAYS_TRUE",
};
const GuardrailContentPolicyAction = {
    BLOCKED: "BLOCKED",
    NONE: "NONE",
};
const GuardrailContentFilterConfidence = {
    HIGH: "HIGH",
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    NONE: "NONE",
};
const GuardrailContentFilterStrength = {
    HIGH: "HIGH",
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    NONE: "NONE",
};
const GuardrailContentFilterType = {
    HATE: "HATE",
    INSULTS: "INSULTS",
    MISCONDUCT: "MISCONDUCT",
    PROMPT_ATTACK: "PROMPT_ATTACK",
    SEXUAL: "SEXUAL",
    VIOLENCE: "VIOLENCE",
};
const GuardrailContextualGroundingPolicyAction = {
    BLOCKED: "BLOCKED",
    NONE: "NONE",
};
const GuardrailContextualGroundingFilterType = {
    GROUNDING: "GROUNDING",
    RELEVANCE: "RELEVANCE",
};
const GuardrailSensitiveInformationPolicyAction = {
    ANONYMIZED: "ANONYMIZED",
    BLOCKED: "BLOCKED",
    NONE: "NONE",
};
const GuardrailPiiEntityType = {
    ADDRESS: "ADDRESS",
    AGE: "AGE",
    AWS_ACCESS_KEY: "AWS_ACCESS_KEY",
    AWS_SECRET_KEY: "AWS_SECRET_KEY",
    CA_HEALTH_NUMBER: "CA_HEALTH_NUMBER",
    CA_SOCIAL_INSURANCE_NUMBER: "CA_SOCIAL_INSURANCE_NUMBER",
    CREDIT_DEBIT_CARD_CVV: "CREDIT_DEBIT_CARD_CVV",
    CREDIT_DEBIT_CARD_EXPIRY: "CREDIT_DEBIT_CARD_EXPIRY",
    CREDIT_DEBIT_CARD_NUMBER: "CREDIT_DEBIT_CARD_NUMBER",
    DRIVER_ID: "DRIVER_ID",
    EMAIL: "EMAIL",
    INTERNATIONAL_BANK_ACCOUNT_NUMBER: "INTERNATIONAL_BANK_ACCOUNT_NUMBER",
    IP_ADDRESS: "IP_ADDRESS",
    LICENSE_PLATE: "LICENSE_PLATE",
    MAC_ADDRESS: "MAC_ADDRESS",
    NAME: "NAME",
    PASSWORD: "PASSWORD",
    PHONE: "PHONE",
    PIN: "PIN",
    SWIFT_CODE: "SWIFT_CODE",
    UK_NATIONAL_HEALTH_SERVICE_NUMBER: "UK_NATIONAL_HEALTH_SERVICE_NUMBER",
    UK_NATIONAL_INSURANCE_NUMBER: "UK_NATIONAL_INSURANCE_NUMBER",
    UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER: "UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER",
    URL: "URL",
    USERNAME: "USERNAME",
    US_BANK_ACCOUNT_NUMBER: "US_BANK_ACCOUNT_NUMBER",
    US_BANK_ROUTING_NUMBER: "US_BANK_ROUTING_NUMBER",
    US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER: "US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER",
    US_PASSPORT_NUMBER: "US_PASSPORT_NUMBER",
    US_SOCIAL_SECURITY_NUMBER: "US_SOCIAL_SECURITY_NUMBER",
    VEHICLE_IDENTIFICATION_NUMBER: "VEHICLE_IDENTIFICATION_NUMBER",
};
const GuardrailTopicPolicyAction = {
    BLOCKED: "BLOCKED",
    NONE: "NONE",
};
const GuardrailTopicType = {
    DENY: "DENY",
};
const GuardrailWordPolicyAction = {
    BLOCKED: "BLOCKED",
    NONE: "NONE",
};
const GuardrailManagedWordType = {
    PROFANITY: "PROFANITY",
};
const GuardrailTrace = {
    DISABLED: "disabled",
    ENABLED: "enabled",
    ENABLED_FULL: "enabled_full",
};
const AudioFormat = {
    AAC: "aac",
    FLAC: "flac",
    M4A: "m4a",
    MKA: "mka",
    MKV: "mkv",
    MP3: "mp3",
    MP4: "mp4",
    MPEG: "mpeg",
    MPGA: "mpga",
    OGG: "ogg",
    OPUS: "opus",
    PCM: "pcm",
    WAV: "wav",
    WEBM: "webm",
    X_AAC: "x-aac",
};
const CacheTTL = {
    FIVE_MINUTES: "5m",
    ONE_HOUR: "1h",
};
const CachePointType = {
    DEFAULT: "default",
};
const DocumentFormat = {
    CSV: "csv",
    DOC: "doc",
    DOCX: "docx",
    HTML: "html",
    MD: "md",
    PDF: "pdf",
    TXT: "txt",
    XLS: "xls",
    XLSX: "xlsx",
};
const GuardrailConverseImageFormat = {
    JPEG: "jpeg",
    PNG: "png",
};
const GuardrailConverseContentQualifier = {
    GROUNDING_SOURCE: "grounding_source",
    GUARD_CONTENT: "guard_content",
    QUERY: "query",
};
const ImageFormat = {
    GIF: "gif",
    JPEG: "jpeg",
    PNG: "png",
    WEBP: "webp",
};
const VideoFormat = {
    FLV: "flv",
    MKV: "mkv",
    MOV: "mov",
    MP4: "mp4",
    MPEG: "mpeg",
    MPG: "mpg",
    THREE_GP: "three_gp",
    WEBM: "webm",
    WMV: "wmv",
};
const ToolResultStatus = {
    ERROR: "error",
    SUCCESS: "success",
};
const ToolUseType = {
    SERVER_TOOL_USE: "server_tool_use",
};
const ConversationRole = {
    ASSISTANT: "assistant",
    USER: "user",
};
const OutputFormatType = {
    JSON_SCHEMA: "json_schema",
};
const PerformanceConfigLatency = {
    OPTIMIZED: "optimized",
    STANDARD: "standard",
};
const ServiceTierType = {
    DEFAULT: "default",
    FLEX: "flex",
    PRIORITY: "priority",
    RESERVED: "reserved",
};
const StopReason = {
    CONTENT_FILTERED: "content_filtered",
    END_TURN: "end_turn",
    GUARDRAIL_INTERVENED: "guardrail_intervened",
    MALFORMED_MODEL_OUTPUT: "malformed_model_output",
    MALFORMED_TOOL_USE: "malformed_tool_use",
    MAX_TOKENS: "max_tokens",
    MODEL_CONTEXT_WINDOW_EXCEEDED: "model_context_window_exceeded",
    STOP_SEQUENCE: "stop_sequence",
    TOOL_USE: "tool_use",
};
const GuardrailStreamProcessingMode = {
    ASYNC: "async",
    SYNC: "sync",
};
const Trace = {
    DISABLED: "DISABLED",
    ENABLED: "ENABLED",
    ENABLED_FULL: "ENABLED_FULL",
};

exports.$Command = client.Command;
exports.__Client = client.Client;
exports.BedrockRuntimeServiceException = BedrockRuntimeServiceException.BedrockRuntimeServiceException;
exports.ApplyGuardrailCommand = ApplyGuardrailCommand;
exports.AsyncInvokeStatus = AsyncInvokeStatus;
exports.AudioFormat = AudioFormat;
exports.BedrockRuntime = BedrockRuntime;
exports.BedrockRuntimeClient = BedrockRuntimeClient;
exports.CachePointType = CachePointType;
exports.CacheTTL = CacheTTL;
exports.ConversationRole = ConversationRole;
exports.ConverseCommand = ConverseCommand;
exports.ConverseStreamCommand = ConverseStreamCommand;
exports.CountTokensCommand = CountTokensCommand;
exports.DocumentFormat = DocumentFormat;
exports.GetAsyncInvokeCommand = GetAsyncInvokeCommand;
exports.GuardrailAction = GuardrailAction;
exports.GuardrailAutomatedReasoningLogicWarningType = GuardrailAutomatedReasoningLogicWarningType;
exports.GuardrailContentFilterConfidence = GuardrailContentFilterConfidence;
exports.GuardrailContentFilterStrength = GuardrailContentFilterStrength;
exports.GuardrailContentFilterType = GuardrailContentFilterType;
exports.GuardrailContentPolicyAction = GuardrailContentPolicyAction;
exports.GuardrailContentQualifier = GuardrailContentQualifier;
exports.GuardrailContentSource = GuardrailContentSource;
exports.GuardrailContextualGroundingFilterType = GuardrailContextualGroundingFilterType;
exports.GuardrailContextualGroundingPolicyAction = GuardrailContextualGroundingPolicyAction;
exports.GuardrailConverseContentQualifier = GuardrailConverseContentQualifier;
exports.GuardrailConverseImageFormat = GuardrailConverseImageFormat;
exports.GuardrailImageFormat = GuardrailImageFormat;
exports.GuardrailManagedWordType = GuardrailManagedWordType;
exports.GuardrailOrigin = GuardrailOrigin;
exports.GuardrailOutputScope = GuardrailOutputScope;
exports.GuardrailOwnership = GuardrailOwnership;
exports.GuardrailPiiEntityType = GuardrailPiiEntityType;
exports.GuardrailSensitiveInformationPolicyAction = GuardrailSensitiveInformationPolicyAction;
exports.GuardrailStreamProcessingMode = GuardrailStreamProcessingMode;
exports.GuardrailTopicPolicyAction = GuardrailTopicPolicyAction;
exports.GuardrailTopicType = GuardrailTopicType;
exports.GuardrailTrace = GuardrailTrace;
exports.GuardrailWordPolicyAction = GuardrailWordPolicyAction;
exports.ImageFormat = ImageFormat;
exports.InvokeModelCommand = InvokeModelCommand;
exports.InvokeModelWithBidirectionalStreamCommand = InvokeModelWithBidirectionalStreamCommand;
exports.InvokeModelWithResponseStreamCommand = InvokeModelWithResponseStreamCommand;
exports.ListAsyncInvokesCommand = ListAsyncInvokesCommand;
exports.OutputFormatType = OutputFormatType;
exports.PerformanceConfigLatency = PerformanceConfigLatency;
exports.ServiceTierType = ServiceTierType;
exports.SortAsyncInvocationBy = SortAsyncInvocationBy;
exports.SortOrder = SortOrder;
exports.StartAsyncInvokeCommand = StartAsyncInvokeCommand;
exports.StopReason = StopReason;
exports.ToolResultStatus = ToolResultStatus;
exports.ToolUseType = ToolUseType;
exports.Trace = Trace;
exports.VideoFormat = VideoFormat;
exports.paginateListAsyncInvokes = paginateListAsyncInvokes;
Object.prototype.hasOwnProperty.call(schemas_0, '__proto__') &&
    !Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
    Object.defineProperty(exports, '__proto__', {
        enumerable: true,
        value: schemas_0['__proto__']
    });

Object.keys(schemas_0).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = schemas_0[k];
});
Object.prototype.hasOwnProperty.call(errors, '__proto__') &&
    !Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
    Object.defineProperty(exports, '__proto__', {
        enumerable: true,
        value: errors['__proto__']
    });

Object.keys(errors).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = errors[k];
});


/***/ }),

/***/ 73858:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BedrockRuntimeServiceException = exports.__ServiceException = void 0;
const client_1 = __webpack_require__(63234);
Object.defineProperty(exports, "__ServiceException", ({ enumerable: true, get: function () { return client_1.ServiceException; } }));
class BedrockRuntimeServiceException extends client_1.ServiceException {
    constructor(options) {
        super(options);
        Object.setPrototypeOf(this, BedrockRuntimeServiceException.prototype);
    }
}
exports.BedrockRuntimeServiceException = BedrockRuntimeServiceException;


/***/ }),

/***/ 72467:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ModelStreamErrorException = exports.ModelTimeoutException = exports.ModelNotReadyException = exports.ModelErrorException = exports.ServiceUnavailableException = exports.ServiceQuotaExceededException = exports.ResourceNotFoundException = exports.ConflictException = exports.ValidationException = exports.ThrottlingException = exports.InternalServerException = exports.AccessDeniedException = void 0;
const BedrockRuntimeServiceException_1 = __webpack_require__(73858);
class AccessDeniedException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "AccessDeniedException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "AccessDeniedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, AccessDeniedException.prototype);
    }
}
exports.AccessDeniedException = AccessDeniedException;
class InternalServerException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "InternalServerException";
    $fault = "server";
    constructor(opts) {
        super({
            name: "InternalServerException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, InternalServerException.prototype);
    }
}
exports.InternalServerException = InternalServerException;
class ThrottlingException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ThrottlingException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ThrottlingException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ThrottlingException.prototype);
    }
}
exports.ThrottlingException = ThrottlingException;
class ValidationException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ValidationException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ValidationException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ValidationException.prototype);
    }
}
exports.ValidationException = ValidationException;
class ConflictException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ConflictException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ConflictException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ConflictException.prototype);
    }
}
exports.ConflictException = ConflictException;
class ResourceNotFoundException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ResourceNotFoundException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ResourceNotFoundException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ResourceNotFoundException.prototype);
    }
}
exports.ResourceNotFoundException = ResourceNotFoundException;
class ServiceQuotaExceededException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ServiceQuotaExceededException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ServiceQuotaExceededException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ServiceQuotaExceededException.prototype);
    }
}
exports.ServiceQuotaExceededException = ServiceQuotaExceededException;
class ServiceUnavailableException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ServiceUnavailableException";
    $fault = "server";
    constructor(opts) {
        super({
            name: "ServiceUnavailableException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, ServiceUnavailableException.prototype);
    }
}
exports.ServiceUnavailableException = ServiceUnavailableException;
class ModelErrorException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ModelErrorException";
    $fault = "client";
    originalStatusCode;
    resourceName;
    constructor(opts) {
        super({
            name: "ModelErrorException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ModelErrorException.prototype);
        this.originalStatusCode = opts.originalStatusCode;
        this.resourceName = opts.resourceName;
    }
}
exports.ModelErrorException = ModelErrorException;
class ModelNotReadyException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ModelNotReadyException";
    $fault = "client";
    $retryable = {};
    constructor(opts) {
        super({
            name: "ModelNotReadyException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ModelNotReadyException.prototype);
    }
}
exports.ModelNotReadyException = ModelNotReadyException;
class ModelTimeoutException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ModelTimeoutException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ModelTimeoutException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ModelTimeoutException.prototype);
    }
}
exports.ModelTimeoutException = ModelTimeoutException;
class ModelStreamErrorException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ModelStreamErrorException";
    $fault = "client";
    originalStatusCode;
    originalMessage;
    constructor(opts) {
        super({
            name: "ModelStreamErrorException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ModelStreamErrorException.prototype);
        this.originalStatusCode = opts.originalStatusCode;
        this.originalMessage = opts.originalMessage;
    }
}
exports.ModelStreamErrorException = ModelStreamErrorException;


/***/ }),

/***/ 86197:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getRuntimeConfig = void 0;
const tslib_1 = __webpack_require__(53824);
const package_json_1 = tslib_1.__importDefault(__webpack_require__(40423));
const client_1 = __webpack_require__(77186);
const httpAuthSchemes_1 = __webpack_require__(65741);
const credential_provider_node_1 = __webpack_require__(54944);
const eventstream_handler_node_1 = __webpack_require__(17232);
const token_providers_1 = __webpack_require__(81533);
const core_1 = __webpack_require__(86578);
const client_2 = __webpack_require__(63234);
const config_1 = __webpack_require__(99659);
const event_streams_1 = __webpack_require__(40051);
const retry_1 = __webpack_require__(64233);
const serde_1 = __webpack_require__(38622);
const node_http_handler_1 = __webpack_require__(71745);
const runtimeConfig_shared_1 = __webpack_require__(86906);
const getRuntimeConfig = (config) => {
    (0, client_2.emitWarningIfUnsupportedVersion)(process.version);
    const defaultsMode = (0, config_1.resolveDefaultsModeConfig)(config);
    const defaultConfigProvider = () => defaultsMode().then(client_2.loadConfigsForDefaultMode);
    const clientSharedValues = (0, runtimeConfig_shared_1.getRuntimeConfig)(config);
    (0, client_1.emitWarningIfUnsupportedVersion)(process.version);
    const loaderConfig = {
        profile: config?.profile,
        logger: clientSharedValues.logger,
        signingName: "bedrock",
    };
    return {
        ...clientSharedValues,
        ...config,
        runtime: "node",
        defaultsMode,
        authSchemePreference: config?.authSchemePreference ?? (0, config_1.loadConfig)(httpAuthSchemes_1.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, loaderConfig),
        bodyLengthChecker: config?.bodyLengthChecker ?? serde_1.calculateBodyLength,
        credentialDefaultProvider: config?.credentialDefaultProvider ?? credential_provider_node_1.defaultProvider,
        defaultUserAgentProvider: config?.defaultUserAgentProvider ?? (0, client_1.createDefaultUserAgentProvider)({ serviceId: clientSharedValues.serviceId, clientVersion: package_json_1.default.version }),
        eventStreamPayloadHandlerProvider: config?.eventStreamPayloadHandlerProvider ?? eventstream_handler_node_1.eventStreamPayloadHandlerProvider,
        eventStreamSerdeProvider: config?.eventStreamSerdeProvider ?? event_streams_1.eventStreamSerdeProvider,
        httpAuthSchemes: config?.httpAuthSchemes ?? [
            {
                schemeId: "aws.auth#sigv4",
                identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4"),
                signer: new httpAuthSchemes_1.AwsSdkSigV4Signer(),
            },
            {
                schemeId: "smithy.api#httpBearerAuth",
                identityProvider: (ipc) => ipc.getIdentityProvider("smithy.api#httpBearerAuth") || (async (idProps) => {
                    try {
                        return await (0, token_providers_1.fromEnvSigningName)({ signingName: "bedrock" })();
                    }
                    catch (error) {
                        return await (0, token_providers_1.nodeProvider)(idProps)(idProps);
                    }
                }),
                signer: new core_1.HttpBearerAuthSigner(),
            },
        ],
        maxAttempts: config?.maxAttempts ?? (0, config_1.loadConfig)(retry_1.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config),
        region: config?.region ?? (0, config_1.loadConfig)(config_1.NODE_REGION_CONFIG_OPTIONS, { ...config_1.NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig }),
        requestHandler: node_http_handler_1.NodeHttp2Handler.create(config?.requestHandler ?? (async () => ({
            ...await defaultConfigProvider(),
            disableConcurrentStreams: true
        }))),
        retryMode: config?.retryMode ??
            (0, config_1.loadConfig)({
                ...retry_1.NODE_RETRY_MODE_CONFIG_OPTIONS,
                default: async () => (await defaultConfigProvider()).retryMode || retry_1.DEFAULT_RETRY_MODE,
            }, config),
        sha256: config?.sha256 ?? serde_1.Hash.bind(null, "sha256"),
        streamCollector: config?.streamCollector ?? node_http_handler_1.streamCollector,
        useDualstackEndpoint: config?.useDualstackEndpoint ?? (0, config_1.loadConfig)(config_1.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        useFipsEndpoint: config?.useFipsEndpoint ?? (0, config_1.loadConfig)(config_1.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        userAgentAppId: config?.userAgentAppId ?? (0, config_1.loadConfig)(client_1.NODE_APP_ID_CONFIG_OPTIONS, loaderConfig),
    };
};
exports.getRuntimeConfig = getRuntimeConfig;


/***/ }),

/***/ 86906:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getRuntimeConfig = void 0;
const httpAuthSchemes_1 = __webpack_require__(65741);
const protocols_1 = __webpack_require__(78206);
const core_1 = __webpack_require__(86578);
const client_1 = __webpack_require__(63234);
const protocols_2 = __webpack_require__(45598);
const serde_1 = __webpack_require__(38622);
const httpAuthSchemeProvider_1 = __webpack_require__(46556);
const endpointResolver_1 = __webpack_require__(91330);
const schemas_0_1 = __webpack_require__(52887);
const getRuntimeConfig = (config) => {
    return {
        apiVersion: "2023-09-30",
        base64Decoder: config?.base64Decoder ?? serde_1.fromBase64,
        base64Encoder: config?.base64Encoder ?? serde_1.toBase64,
        disableHostPrefix: config?.disableHostPrefix ?? false,
        endpointProvider: config?.endpointProvider ?? endpointResolver_1.defaultEndpointResolver,
        extensions: config?.extensions ?? [],
        httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? httpAuthSchemeProvider_1.defaultBedrockRuntimeHttpAuthSchemeProvider,
        httpAuthSchemes: config?.httpAuthSchemes ?? [
            {
                schemeId: "aws.auth#sigv4",
                identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4"),
                signer: new httpAuthSchemes_1.AwsSdkSigV4Signer(),
            },
            {
                schemeId: "smithy.api#httpBearerAuth",
                identityProvider: (ipc) => ipc.getIdentityProvider("smithy.api#httpBearerAuth"),
                signer: new core_1.HttpBearerAuthSigner(),
            },
        ],
        logger: config?.logger ?? new client_1.NoOpLogger(),
        protocol: config?.protocol ?? protocols_1.AwsRestJsonProtocol,
        protocolSettings: config?.protocolSettings ?? {
            defaultNamespace: "com.amazonaws.bedrockruntime",
            errorTypeRegistries: schemas_0_1.errorTypeRegistries,
            version: "2023-09-30",
            serviceTarget: "AmazonBedrockFrontendService",
        },
        serviceId: config?.serviceId ?? "Bedrock Runtime",
        urlParser: config?.urlParser ?? protocols_2.parseUrl,
        utf8Decoder: config?.utf8Decoder ?? serde_1.fromUtf8,
        utf8Encoder: config?.utf8Encoder ?? serde_1.toUtf8,
    };
};
exports.getRuntimeConfig = getRuntimeConfig;


/***/ }),

/***/ 52887:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DocumentPageLocation$ = exports.DocumentChunkLocation$ = exports.DocumentCharLocation$ = exports.DocumentBlock$ = exports.CountTokensResponse$ = exports.CountTokensRequest$ = exports.ConverseTrace$ = exports.ConverseTokensRequest$ = exports.ConverseStreamTrace$ = exports.ConverseStreamResponse$ = exports.ConverseStreamRequest$ = exports.ConverseStreamMetrics$ = exports.ConverseStreamMetadataEvent$ = exports.ConverseResponse$ = exports.ConverseRequest$ = exports.ConverseMetrics$ = exports.ContentBlockStopEvent$ = exports.ContentBlockStartEvent$ = exports.ContentBlockDeltaEvent$ = exports.CitationSourceContentDelta$ = exports.CitationsDelta$ = exports.CitationsContentBlock$ = exports.CitationsConfig$ = exports.Citation$ = exports.CachePointBlock$ = exports.CacheDetail$ = exports.BidirectionalOutputPayloadPart$ = exports.BidirectionalInputPayloadPart$ = exports.AutoToolChoice$ = exports.AudioBlock$ = exports.AsyncInvokeSummary$ = exports.AsyncInvokeS3OutputDataConfig$ = exports.ApplyGuardrailResponse$ = exports.ApplyGuardrailRequest$ = exports.AppliedGuardrailDetails$ = exports.AnyToolChoice$ = exports.errorTypeRegistries = exports.ValidationException$ = exports.ThrottlingException$ = exports.ServiceUnavailableException$ = exports.ServiceQuotaExceededException$ = exports.ResourceNotFoundException$ = exports.ModelTimeoutException$ = exports.ModelStreamErrorException$ = exports.ModelNotReadyException$ = exports.ModelErrorException$ = exports.InternalServerException$ = exports.ConflictException$ = exports.AccessDeniedException$ = exports.BedrockRuntimeServiceException$ = void 0;
exports.InvokeModelResponse$ = exports.InvokeModelRequest$ = exports.InferenceConfiguration$ = exports.ImageBlockStart$ = exports.ImageBlockDelta$ = exports.ImageBlock$ = exports.GuardrailWordPolicyAssessment$ = exports.GuardrailUsage$ = exports.GuardrailTraceAssessment$ = exports.GuardrailTopicPolicyAssessment$ = exports.GuardrailTopic$ = exports.GuardrailTextCharactersCoverage$ = exports.GuardrailTextBlock$ = exports.GuardrailStreamConfiguration$ = exports.GuardrailSensitiveInformationPolicyAssessment$ = exports.GuardrailRegexFilter$ = exports.GuardrailPiiEntityFilter$ = exports.GuardrailOutputContent$ = exports.GuardrailManagedWord$ = exports.GuardrailInvocationMetrics$ = exports.GuardrailImageCoverage$ = exports.GuardrailImageBlock$ = exports.GuardrailCustomWord$ = exports.GuardrailCoverage$ = exports.GuardrailConverseTextBlock$ = exports.GuardrailConverseImageBlock$ = exports.GuardrailContextualGroundingPolicyAssessment$ = exports.GuardrailContextualGroundingFilter$ = exports.GuardrailContentPolicyAssessment$ = exports.GuardrailContentFilter$ = exports.GuardrailConfiguration$ = exports.GuardrailAutomatedReasoningValidFinding$ = exports.GuardrailAutomatedReasoningTranslationOption$ = exports.GuardrailAutomatedReasoningTranslationAmbiguousFinding$ = exports.GuardrailAutomatedReasoningTranslation$ = exports.GuardrailAutomatedReasoningTooComplexFinding$ = exports.GuardrailAutomatedReasoningStatement$ = exports.GuardrailAutomatedReasoningScenario$ = exports.GuardrailAutomatedReasoningSatisfiableFinding$ = exports.GuardrailAutomatedReasoningRule$ = exports.GuardrailAutomatedReasoningPolicyAssessment$ = exports.GuardrailAutomatedReasoningNoTranslationsFinding$ = exports.GuardrailAutomatedReasoningLogicWarning$ = exports.GuardrailAutomatedReasoningInvalidFinding$ = exports.GuardrailAutomatedReasoningInputTextReference$ = exports.GuardrailAutomatedReasoningImpossibleFinding$ = exports.GuardrailAssessment$ = exports.GetAsyncInvokeResponse$ = exports.GetAsyncInvokeRequest$ = exports.ErrorBlock$ = void 0;
exports.DocumentSource$ = exports.DocumentContentBlock$ = exports.CountTokensInput$ = exports.ConverseStreamOutput$ = exports.ConverseOutput$ = exports.ContentBlockStart$ = exports.ContentBlockDelta$ = exports.ContentBlock$ = exports.CitationSourceContent$ = exports.CitationLocation$ = exports.CitationGeneratedContent$ = exports.AudioSource$ = exports.AsyncInvokeOutputDataConfig$ = exports.WebLocation$ = exports.VideoBlock$ = exports.ToolUseBlockStart$ = exports.ToolUseBlockDelta$ = exports.ToolUseBlock$ = exports.ToolSpecification$ = exports.ToolResultBlockStart$ = exports.ToolResultBlock$ = exports.ToolConfiguration$ = exports.TokenUsage$ = exports.Tag$ = exports.SystemTool$ = exports.StartAsyncInvokeResponse$ = exports.StartAsyncInvokeRequest$ = exports.SpecificToolChoice$ = exports.ServiceTier$ = exports.SearchResultLocation$ = exports.SearchResultContentBlock$ = exports.SearchResultBlock$ = exports.S3Location$ = exports.ReasoningTextBlock$ = exports.PromptRouterTrace$ = exports.PerformanceConfiguration$ = exports.PayloadPart$ = exports.OutputFormat$ = exports.OutputConfig$ = exports.MessageStopEvent$ = exports.MessageStartEvent$ = exports.Message$ = exports.ListAsyncInvokesResponse$ = exports.ListAsyncInvokesRequest$ = exports.JsonSchemaDefinition$ = exports.InvokeModelWithResponseStreamResponse$ = exports.InvokeModelWithResponseStreamRequest$ = exports.InvokeModelWithBidirectionalStreamResponse$ = exports.InvokeModelWithBidirectionalStreamRequest$ = exports.InvokeModelTokensRequest$ = void 0;
exports.StartAsyncInvoke$ = exports.ListAsyncInvokes$ = exports.InvokeModelWithResponseStream$ = exports.InvokeModelWithBidirectionalStream$ = exports.InvokeModel$ = exports.GetAsyncInvoke$ = exports.CountTokens$ = exports.ConverseStream$ = exports.Converse$ = exports.ApplyGuardrail$ = exports.VideoSource$ = exports.ToolResultContentBlock$ = exports.ToolResultBlockDelta$ = exports.ToolInputSchema$ = exports.ToolChoice$ = exports.Tool$ = exports.SystemContentBlock$ = exports.ResponseStream$ = exports.ReasoningContentBlockDelta$ = exports.ReasoningContentBlock$ = exports.PromptVariableValues$ = exports.OutputFormatStructure$ = exports.InvokeModelWithBidirectionalStreamOutput$ = exports.InvokeModelWithBidirectionalStreamInput$ = exports.ImageSource$ = exports.GuardrailImageSource$ = exports.GuardrailConverseImageSource$ = exports.GuardrailConverseContentBlock$ = exports.GuardrailContentBlock$ = exports.GuardrailAutomatedReasoningFinding$ = void 0;
const _A = "Accept";
const _AB = "AudioBlock";
const _ADE = "AccessDeniedException";
const _AG = "ApplyGuardrail";
const _AGD = "AppliedGuardrailDetails";
const _AGR = "ApplyGuardrailRequest";
const _AGRp = "ApplyGuardrailResponse";
const _AIM = "AsyncInvokeMessage";
const _AIODC = "AsyncInvokeOutputDataConfig";
const _AIS = "AsyncInvokeSummary";
const _AISODC = "AsyncInvokeS3OutputDataConfig";
const _AISs = "AsyncInvokeSummaries";
const _AS = "AudioSource";
const _ATC = "AnyToolChoice";
const _ATCu = "AutoToolChoice";
const _B = "Body";
const _BIPP = "BidirectionalInputPayloadPart";
const _BOPP = "BidirectionalOutputPayloadPart";
const _C = "Citation";
const _CB = "ContentBlocks";
const _CBD = "ContentBlockDelta";
const _CBDE = "ContentBlockDeltaEvent";
const _CBS = "ContentBlockStart";
const _CBSE = "ContentBlockStartEvent";
const _CBSEo = "ContentBlockStopEvent";
const _CBo = "ContentBlock";
const _CC = "CitationsConfig";
const _CCB = "CitationsContentBlock";
const _CD = "CacheDetail";
const _CDL = "CacheDetailsList";
const _CDi = "CitationsDelta";
const _CE = "ConflictException";
const _CGC = "CitationGeneratedContent";
const _CGCL = "CitationGeneratedContentList";
const _CL = "CitationLocation";
const _CM = "ConverseMetrics";
const _CO = "ConverseOutput";
const _CPB = "CachePointBlock";
const _CR = "ConverseRequest";
const _CRo = "ConverseResponse";
const _CS = "ConverseStream";
const _CSC = "CitationSourceContent";
const _CSCD = "CitationSourceContentDelta";
const _CSCL = "CitationSourceContentList";
const _CSCLD = "CitationSourceContentListDelta";
const _CSM = "ConverseStreamMetrics";
const _CSME = "ConverseStreamMetadataEvent";
const _CSO = "ConverseStreamOutput";
const _CSR = "ConverseStreamRequest";
const _CSRo = "ConverseStreamResponse";
const _CST = "ConverseStreamTrace";
const _CT = "ConverseTrace";
const _CTI = "CountTokensInput";
const _CTR = "ConverseTokensRequest";
const _CTRo = "CountTokensRequest";
const _CTRou = "CountTokensResponse";
const _CT_ = "Content-Type";
const _CTo = "CountTokens";
const _Ci = "Citations";
const _Co = "Converse";
const _DB = "DocumentBlock";
const _DCB = "DocumentContentBlocks";
const _DCBo = "DocumentContentBlock";
const _DCL = "DocumentCharLocation";
const _DCLo = "DocumentChunkLocation";
const _DPL = "DocumentPageLocation";
const _DS = "DocumentSource";
const _EB = "ErrorBlock";
const _GA = "GuardrailAssessment";
const _GAI = "GetAsyncInvoke";
const _GAIR = "GetAsyncInvokeRequest";
const _GAIRe = "GetAsyncInvokeResponse";
const _GAL = "GuardrailAssessmentList";
const _GALM = "GuardrailAssessmentListMap";
const _GAM = "GuardrailAssessmentMap";
const _GARDSL = "GuardrailAutomatedReasoningDifferenceScenarioList";
const _GARF = "GuardrailAutomatedReasoningFinding";
const _GARFL = "GuardrailAutomatedReasoningFindingList";
const _GARIF = "GuardrailAutomatedReasoningImpossibleFinding";
const _GARIFu = "GuardrailAutomatedReasoningInvalidFinding";
const _GARITR = "GuardrailAutomatedReasoningInputTextReference";
const _GARITRL = "GuardrailAutomatedReasoningInputTextReferenceList";
const _GARLW = "GuardrailAutomatedReasoningLogicWarning";
const _GARNTF = "GuardrailAutomatedReasoningNoTranslationsFinding";
const _GARPA = "GuardrailAutomatedReasoningPolicyAssessment";
const _GARR = "GuardrailAutomatedReasoningRule";
const _GARRL = "GuardrailAutomatedReasoningRuleList";
const _GARS = "GuardrailAutomatedReasoningScenario";
const _GARSF = "GuardrailAutomatedReasoningSatisfiableFinding";
const _GARSL = "GuardrailAutomatedReasoningStatementList";
const _GARSLC = "GuardrailAutomatedReasoningStatementLogicContent";
const _GARSNLC = "GuardrailAutomatedReasoningStatementNaturalLanguageContent";
const _GARSu = "GuardrailAutomatedReasoningStatement";
const _GART = "GuardrailAutomatedReasoningTranslation";
const _GARTAF = "GuardrailAutomatedReasoningTranslationAmbiguousFinding";
const _GARTCF = "GuardrailAutomatedReasoningTooComplexFinding";
const _GARTL = "GuardrailAutomatedReasoningTranslationList";
const _GARTO = "GuardrailAutomatedReasoningTranslationOption";
const _GARTOL = "GuardrailAutomatedReasoningTranslationOptionList";
const _GARVF = "GuardrailAutomatedReasoningValidFinding";
const _GC = "GuardrailConfiguration";
const _GCB = "GuardrailContentBlock";
const _GCBL = "GuardrailContentBlockList";
const _GCCB = "GuardrailConverseContentBlock";
const _GCF = "GuardrailContentFilter";
const _GCFL = "GuardrailContentFilterList";
const _GCGF = "GuardrailContextualGroundingFilter";
const _GCGFu = "GuardrailContextualGroundingFilters";
const _GCGPA = "GuardrailContextualGroundingPolicyAssessment";
const _GCIB = "GuardrailConverseImageBlock";
const _GCIS = "GuardrailConverseImageSource";
const _GCPA = "GuardrailContentPolicyAssessment";
const _GCTB = "GuardrailConverseTextBlock";
const _GCW = "GuardrailCustomWord";
const _GCWL = "GuardrailCustomWordList";
const _GCu = "GuardrailCoverage";
const _GIB = "GuardrailImageBlock";
const _GIC = "GuardrailImageCoverage";
const _GIM = "GuardrailInvocationMetrics";
const _GIS = "GuardrailImageSource";
const _GMW = "GuardrailManagedWord";
const _GMWL = "GuardrailManagedWordList";
const _GOC = "GuardrailOutputContent";
const _GOCL = "GuardrailOutputContentList";
const _GPEF = "GuardrailPiiEntityFilter";
const _GPEFL = "GuardrailPiiEntityFilterList";
const _GRF = "GuardrailRegexFilter";
const _GRFL = "GuardrailRegexFilterList";
const _GSC = "GuardrailStreamConfiguration";
const _GSIPA = "GuardrailSensitiveInformationPolicyAssessment";
const _GT = "GuardrailTopic";
const _GTA = "GuardrailTraceAssessment";
const _GTB = "GuardrailTextBlock";
const _GTCC = "GuardrailTextCharactersCoverage";
const _GTL = "GuardrailTopicList";
const _GTPA = "GuardrailTopicPolicyAssessment";
const _GU = "GuardrailUsage";
const _GWPA = "GuardrailWordPolicyAssessment";
const _IB = "ImageBlock";
const _IBD = "ImageBlockDelta";
const _IBS = "ImageBlockStart";
const _IC = "InferenceConfiguration";
const _IM = "InvokeModel";
const _IMR = "InvokeModelRequest";
const _IMRn = "InvokeModelResponse";
const _IMTR = "InvokeModelTokensRequest";
const _IMWBS = "InvokeModelWithBidirectionalStream";
const _IMWBSI = "InvokeModelWithBidirectionalStreamInput";
const _IMWBSO = "InvokeModelWithBidirectionalStreamOutput";
const _IMWBSR = "InvokeModelWithBidirectionalStreamRequest";
const _IMWBSRn = "InvokeModelWithBidirectionalStreamResponse";
const _IMWRS = "InvokeModelWithResponseStream";
const _IMWRSR = "InvokeModelWithResponseStreamRequest";
const _IMWRSRn = "InvokeModelWithResponseStreamResponse";
const _IS = "ImageSource";
const _ISE = "InternalServerException";
const _JSD = "JsonSchemaDefinition";
const _LAI = "ListAsyncInvokes";
const _LAIR = "ListAsyncInvokesRequest";
const _LAIRi = "ListAsyncInvokesResponse";
const _M = "Message";
const _MEE = "ModelErrorException";
const _MIP = "ModelInputPayload";
const _MNRE = "ModelNotReadyException";
const _MSE = "MessageStartEvent";
const _MSEE = "ModelStreamErrorException";
const _MSEe = "MessageStopEvent";
const _MTE = "ModelTimeoutException";
const _Me = "Messages";
const _OC = "OutputConfig";
const _OF = "OutputFormat";
const _OFS = "OutputFormatStructure";
const _PB = "PartBody";
const _PC = "PerformanceConfiguration";
const _PP = "PayloadPart";
const _PRT = "PromptRouterTrace";
const _PVM = "PromptVariableMap";
const _PVV = "PromptVariableValues";
const _RCB = "ReasoningContentBlock";
const _RCBD = "ReasoningContentBlockDelta";
const _RM = "RequestMetadata";
const _RNFE = "ResourceNotFoundException";
const _RS = "ResponseStream";
const _RTB = "ReasoningTextBlock";
const _SAI = "StartAsyncInvoke";
const _SAIR = "StartAsyncInvokeRequest";
const _SAIRt = "StartAsyncInvokeResponse";
const _SCB = "SystemContentBlocks";
const _SCBy = "SystemContentBlock";
const _SL = "S3Location";
const _SQEE = "ServiceQuotaExceededException";
const _SRB = "SearchResultBlock";
const _SRCB = "SearchResultContentBlock";
const _SRCBe = "SearchResultContentBlocks";
const _SRL = "SearchResultLocation";
const _ST = "ServiceTier";
const _STC = "SpecificToolChoice";
const _STy = "SystemTool";
const _SUE = "ServiceUnavailableException";
const _T = "Tag";
const _TC = "ToolConfiguration";
const _TCo = "ToolChoice";
const _TE = "ThrottlingException";
const _TIS = "ToolInputSchema";
const _TL = "TagList";
const _TRB = "ToolResultBlock";
const _TRBD = "ToolResultBlocksDelta";
const _TRBDo = "ToolResultBlockDelta";
const _TRBS = "ToolResultBlockStart";
const _TRCB = "ToolResultContentBlocks";
const _TRCBo = "ToolResultContentBlock";
const _TS = "ToolSpecification";
const _TU = "TokenUsage";
const _TUB = "ToolUseBlock";
const _TUBD = "ToolUseBlockDelta";
const _TUBS = "ToolUseBlockStart";
const _To = "Tools";
const _Too = "Tool";
const _VB = "VideoBlock";
const _VE = "ValidationException";
const _VS = "VideoSource";
const _WL = "WebLocation";
const _XABA = "X-Amzn-Bedrock-Accept";
const _XABCT = "X-Amzn-Bedrock-Content-Type";
const _XABG = "X-Amzn-Bedrock-GuardrailIdentifier";
const _XABG_ = "X-Amzn-Bedrock-GuardrailVersion";
const _XABPL = "X-Amzn-Bedrock-PerformanceConfig-Latency";
const _XABST = "X-Amzn-Bedrock-Service-Tier";
const _XABT = "X-Amzn-Bedrock-Trace";
const _a = "action";
const _aGD = "appliedGuardrailDetails";
const _aIS = "asyncInvokeSummaries";
const _aMRF = "additionalModelRequestFields";
const _aMRFP = "additionalModelResponseFieldPaths";
const _aMRFd = "additionalModelResponseFields";
const _aR = "actionReason";
const _aRP = "automatedReasoningPolicy";
const _aRPU = "automatedReasoningPolicyUnits";
const _aRPu = "automatedReasoningPolicies";
const _ac = "accept";
const _an = "any";
const _as = "assessments";
const _au = "audio";
const _aut = "auto";
const _b = "bytes";
const _bO = "bucketOwner";
const _bo = "body";
const _c = "client";
const _cBD = "contentBlockDelta";
const _cBI = "contentBlockIndex";
const _cBS = "contentBlockStart";
const _cBSo = "contentBlockStop";
const _cC = "citationsContent";
const _cD = "cacheDetails";
const _cFS = "claimsFalseScenario";
const _cGP = "contextualGroundingPolicy";
const _cGPU = "contextualGroundingPolicyUnits";
const _cP = "contentPolicy";
const _cPIU = "contentPolicyImageUnits";
const _cPU = "contentPolicyUnits";
const _cPa = "cachePoint";
const _cR = "contradictingRules";
const _cRIT = "cacheReadInputTokens";
const _cRT = "clientRequestToken";
const _cT = "contentType";
const _cTS = "claimsTrueScenario";
const _cW = "customWords";
const _cWIT = "cacheWriteInputTokens";
const _ch = "chunk";
const _ci = "citations";
const _cit = "citation";
const _cl = "claims";
const _co = "content";
const _con = "context";
const _conf = "confidence";
const _conv = "converse";
const _d = "delta";
const _dC = "documentChar";
const _dCo = "documentChunk";
const _dI = "documentIndex";
const _dP = "documentPage";
const _dS = "differenceScenarios";
const _de = "detected";
const _des = "description";
const _do = "domain";
const _doc = "document";
const _e = "error";
const _eT = "endTime";
const _en = "enabled";
const _end = "end";
const _f = "format";
const _fM = "failureMessage";
const _fS = "filterStrength";
const _fi = "findings";
const _fil = "filters";
const _g = "guardrail";
const _gA = "guardrailArn";
const _gC = "guardrailCoverage";
const _gCu = "guardrailConfig";
const _gCua = "guardContent";
const _gI = "guardrailId";
const _gIu = "guardrailIdentifier";
const _gO = "guardrailOrigin";
const _gOu = "guardrailOwnership";
const _gPL = "guardrailProcessingLatency";
const _gV = "guardrailVersion";
const _gu = "guarded";
const _h = "http";
const _hE = "httpError";
const _hH = "httpHeader";
const _hQ = "httpQuery";
const _i = "input";
const _iA = "invocationArn";
const _iAn = "inputAssessment";
const _iC = "inferenceConfig";
const _iM = "invocationMetrics";
const _iMI = "invokedModelId";
const _iMn = "invokeModel";
const _iS = "inputSchema";
const _iSE = "internalServerException";
const _iT = "inputTokens";
const _id = "identifier";
const _im = "images";
const _ima = "image";
const _imp = "impossible";
const _in = "invalid";
const _j = "json";
const _jS = "jsonSchema";
const _k = "key";
const _kKI = "kmsKeyId";
const _l = "location";
const _lM = "latencyMs";
const _lMT = "lastModifiedTime";
const _lW = "logicWarning";
const _la = "latency";
const _lo = "logic";
const _m = "message";
const _mA = "modelArn";
const _mI = "modelId";
const _mIo = "modelInput";
const _mO = "modelOutput";
const _mR = "maxResults";
const _mS = "messageStart";
const _mSEE = "modelStreamErrorException";
const _mSe = "messageStop";
const _mT = "maxTokens";
const _mTE = "modelTimeoutException";
const _mWL = "managedWordLists";
const _ma = "match";
const _me = "messages";
const _met = "metrics";
const _meta = "metadata";
const _n = "name";
const _nL = "naturalLanguage";
const _nT = "nextToken";
const _nTo = "noTranslations";
const _o = "outputs";
const _oA = "outputAssessments";
const _oC = "outputConfig";
const _oDC = "outputDataConfig";
const _oM = "originalMessage";
const _oS = "outputScope";
const _oSC = "originalStatusCode";
const _oT = "outputTokens";
const _op = "options";
const _ou = "output";
const _p = "premises";
const _pC = "performanceConfig";
const _pCL = "performanceConfigLatency";
const _pE = "piiEntities";
const _pR = "promptRouter";
const _pV = "promptVariables";
const _pVA = "policyVersionArn";
const _q = "qualifiers";
const _r = "regex";
const _rC = "reasoningContent";
const _rCe = "redactedContent";
const _rM = "requestMetadata";
const _rN = "resourceName";
const _rT = "reasoningText";
const _re = "regexes";
const _ro = "role";
const _s = "smithy.ts.sdk.synthetic.com.amazonaws.bedrockruntime";
const _sB = "sortBy";
const _sC = "sourceContent";
const _sE = "statusEquals";
const _sIP = "sensitiveInformationPolicy";
const _sIPFU = "sensitiveInformationPolicyFreeUnits";
const _sIPU = "sensitiveInformationPolicyUnits";
const _sL = "s3Location";
const _sO = "sortOrder";
const _sODC = "s3OutputDataConfig";
const _sPM = "streamProcessingMode";
const _sR = "stopReason";
const _sRI = "searchResultIndex";
const _sRL = "searchResultLocation";
const _sRe = "searchResult";
const _sRu = "supportingRules";
const _sS = "stopSequences";
const _sT = "submitTime";
const _sTA = "submitTimeAfter";
const _sTB = "submitTimeBefore";
const _sTe = "serviceTier";
const _sTy = "systemTool";
const _sU = "s3Uri";
const _sUE = "serviceUnavailableException";
const _sa = "satisfiable";
const _sc = "score";
const _sch = "schema";
const _se = "server";
const _si = "signature";
const _so = "source";
const _st = "status";
const _sta = "start";
const _stat = "statements";
const _str = "stream";
const _stre = "streaming";
const _stri = "strict";
const _stru = "structure";
const _sy = "system";
const _t = "ttl";
const _tA = "translationAmbiguous";
const _tC = "toolConfig";
const _tCe = "textCharacters";
const _tCo = "toolChoice";
const _tCoo = "tooComplex";
const _tE = "throttlingException";
const _tF = "textFormat";
const _tP = "topicPolicy";
const _tPU = "topicPolicyUnits";
const _tPo = "topP";
const _tR = "toolResult";
const _tS = "toolSpec";
const _tT = "totalTokens";
const _tU = "toolUse";
const _tUI = "toolUseId";
const _ta = "tags";
const _te = "text";
const _tem = "temperature";
const _th = "threshold";
const _ti = "title";
const _to = "total";
const _too = "tools";
const _tool = "tool";
const _top = "topics";
const _tr = "trace";
const _tra = "translation";
const _tran = "translations";
const _ty = "type";
const _u = "usage";
const _uC = "untranslatedClaims";
const _uP = "untranslatedPremises";
const _ur = "uri";
const _url = "url";
const _v = "value";
const _vE = "validationException";
const _va = "valid";
const _vi = "video";
const _w = "web";
const _wP = "wordPolicy";
const _wPU = "wordPolicyUnits";
const n0 = "com.amazonaws.bedrockruntime";
const schema_1 = __webpack_require__(95258);
const BedrockRuntimeServiceException_1 = __webpack_require__(73858);
const errors_1 = __webpack_require__(72467);
const _s_registry = schema_1.TypeRegistry.for(_s);
exports.BedrockRuntimeServiceException$ = [-3, _s, "BedrockRuntimeServiceException", 0, [], []];
_s_registry.registerError(exports.BedrockRuntimeServiceException$, BedrockRuntimeServiceException_1.BedrockRuntimeServiceException);
const n0_registry = schema_1.TypeRegistry.for(n0);
exports.AccessDeniedException$ = [-3, n0, _ADE,
    { [_e]: _c, [_hE]: 403 },
    [_m],
    [0]
];
n0_registry.registerError(exports.AccessDeniedException$, errors_1.AccessDeniedException);
exports.ConflictException$ = [-3, n0, _CE,
    { [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
n0_registry.registerError(exports.ConflictException$, errors_1.ConflictException);
exports.InternalServerException$ = [-3, n0, _ISE,
    { [_e]: _se, [_hE]: 500 },
    [_m],
    [0]
];
n0_registry.registerError(exports.InternalServerException$, errors_1.InternalServerException);
exports.ModelErrorException$ = [-3, n0, _MEE,
    { [_e]: _c, [_hE]: 424 },
    [_m, _oSC, _rN],
    [0, 1, 0]
];
n0_registry.registerError(exports.ModelErrorException$, errors_1.ModelErrorException);
exports.ModelNotReadyException$ = [-3, n0, _MNRE,
    { [_e]: _c, [_hE]: 429 },
    [_m],
    [0]
];
n0_registry.registerError(exports.ModelNotReadyException$, errors_1.ModelNotReadyException);
exports.ModelStreamErrorException$ = [-3, n0, _MSEE,
    { [_e]: _c, [_hE]: 424 },
    [_m, _oSC, _oM],
    [0, 1, 0]
];
n0_registry.registerError(exports.ModelStreamErrorException$, errors_1.ModelStreamErrorException);
exports.ModelTimeoutException$ = [-3, n0, _MTE,
    { [_e]: _c, [_hE]: 408 },
    [_m],
    [0]
];
n0_registry.registerError(exports.ModelTimeoutException$, errors_1.ModelTimeoutException);
exports.ResourceNotFoundException$ = [-3, n0, _RNFE,
    { [_e]: _c, [_hE]: 404 },
    [_m],
    [0]
];
n0_registry.registerError(exports.ResourceNotFoundException$, errors_1.ResourceNotFoundException);
exports.ServiceQuotaExceededException$ = [-3, n0, _SQEE,
    { [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
n0_registry.registerError(exports.ServiceQuotaExceededException$, errors_1.ServiceQuotaExceededException);
exports.ServiceUnavailableException$ = [-3, n0, _SUE,
    { [_e]: _se, [_hE]: 503 },
    [_m],
    [0]
];
n0_registry.registerError(exports.ServiceUnavailableException$, errors_1.ServiceUnavailableException);
exports.ThrottlingException$ = [-3, n0, _TE,
    { [_e]: _c, [_hE]: 429 },
    [_m],
    [0]
];
n0_registry.registerError(exports.ThrottlingException$, errors_1.ThrottlingException);
exports.ValidationException$ = [-3, n0, _VE,
    { [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
n0_registry.registerError(exports.ValidationException$, errors_1.ValidationException);
exports.errorTypeRegistries = [
    _s_registry,
    n0_registry,
];
var AsyncInvokeMessage = [0, n0, _AIM, 8, 0];
var Body = [0, n0, _B, 8, 21];
var GuardrailAutomatedReasoningStatementLogicContent = [0, n0, _GARSLC, 8, 0];
var GuardrailAutomatedReasoningStatementNaturalLanguageContent = [0, n0, _GARSNLC, 8, 0];
var ModelInputPayload = [0, n0, _MIP, 8, 15];
var PartBody = [0, n0, _PB, 8, 21];
exports.AnyToolChoice$ = [3, n0, _ATC,
    0,
    [],
    []
];
exports.AppliedGuardrailDetails$ = [3, n0, _AGD,
    0,
    [_gI, _gV, _gA, _gO, _gOu],
    [0, 0, 0, 64 | 0, 0]
];
exports.ApplyGuardrailRequest$ = [3, n0, _AGR,
    0,
    [_gIu, _gV, _so, _co, _oS],
    [[0, 1], [0, 1], 0, [() => GuardrailContentBlockList, 0], 0], 4
];
exports.ApplyGuardrailResponse$ = [3, n0, _AGRp,
    0,
    [_u, _a, _o, _as, _aR, _gC],
    [() => exports.GuardrailUsage$, 0, () => GuardrailOutputContentList, [() => GuardrailAssessmentList, 0], 0, () => exports.GuardrailCoverage$], 4
];
exports.AsyncInvokeS3OutputDataConfig$ = [3, n0, _AISODC,
    0,
    [_sU, _kKI, _bO],
    [0, 0, 0], 1
];
exports.AsyncInvokeSummary$ = [3, n0, _AIS,
    0,
    [_iA, _mA, _sT, _oDC, _cRT, _st, _fM, _lMT, _eT],
    [0, 0, 5, () => exports.AsyncInvokeOutputDataConfig$, 0, 0, [() => AsyncInvokeMessage, 0], 5, 5], 4
];
exports.AudioBlock$ = [3, n0, _AB,
    0,
    [_f, _so, _e],
    [0, [() => exports.AudioSource$, 0], [() => exports.ErrorBlock$, 0]], 2
];
exports.AutoToolChoice$ = [3, n0, _ATCu,
    0,
    [],
    []
];
exports.BidirectionalInputPayloadPart$ = [3, n0, _BIPP,
    8,
    [_b],
    [[() => PartBody, 0]]
];
exports.BidirectionalOutputPayloadPart$ = [3, n0, _BOPP,
    8,
    [_b],
    [[() => PartBody, 0]]
];
exports.CacheDetail$ = [3, n0, _CD,
    0,
    [_t, _iT],
    [0, 1], 2
];
exports.CachePointBlock$ = [3, n0, _CPB,
    0,
    [_ty, _t],
    [0, 0], 1
];
exports.Citation$ = [3, n0, _C,
    0,
    [_ti, _so, _sC, _l],
    [0, 0, () => CitationSourceContentList, () => exports.CitationLocation$]
];
exports.CitationsConfig$ = [3, n0, _CC,
    0,
    [_en],
    [2], 1
];
exports.CitationsContentBlock$ = [3, n0, _CCB,
    0,
    [_co, _ci],
    [() => CitationGeneratedContentList, () => Citations]
];
exports.CitationsDelta$ = [3, n0, _CDi,
    0,
    [_ti, _so, _sC, _l],
    [0, 0, () => CitationSourceContentListDelta, () => exports.CitationLocation$]
];
exports.CitationSourceContentDelta$ = [3, n0, _CSCD,
    0,
    [_te],
    [0]
];
exports.ContentBlockDeltaEvent$ = [3, n0, _CBDE,
    0,
    [_d, _cBI],
    [[() => exports.ContentBlockDelta$, 0], 1], 2
];
exports.ContentBlockStartEvent$ = [3, n0, _CBSE,
    0,
    [_sta, _cBI],
    [() => exports.ContentBlockStart$, 1], 2
];
exports.ContentBlockStopEvent$ = [3, n0, _CBSEo,
    0,
    [_cBI],
    [1], 1
];
exports.ConverseMetrics$ = [3, n0, _CM,
    0,
    [_lM],
    [1], 1
];
exports.ConverseRequest$ = [3, n0, _CR,
    0,
    [_mI, _me, _sy, _iC, _tC, _gCu, _aMRF, _pV, _aMRFP, _rM, _pC, _sTe, _oC],
    [[0, 1], [() => Messages, 0], [() => SystemContentBlocks, 0], () => exports.InferenceConfiguration$, () => exports.ToolConfiguration$, () => exports.GuardrailConfiguration$, 15, [() => PromptVariableMap, 0], 64 | 0, [() => RequestMetadata, 0], () => exports.PerformanceConfiguration$, () => exports.ServiceTier$, [() => exports.OutputConfig$, 0]], 1
];
exports.ConverseResponse$ = [3, n0, _CRo,
    0,
    [_ou, _sR, _u, _met, _aMRFd, _tr, _pC, _sTe],
    [[() => exports.ConverseOutput$, 0], 0, () => exports.TokenUsage$, () => exports.ConverseMetrics$, 15, [() => exports.ConverseTrace$, 0], () => exports.PerformanceConfiguration$, () => exports.ServiceTier$], 4
];
exports.ConverseStreamMetadataEvent$ = [3, n0, _CSME,
    0,
    [_u, _met, _tr, _pC, _sTe],
    [() => exports.TokenUsage$, () => exports.ConverseStreamMetrics$, [() => exports.ConverseStreamTrace$, 0], () => exports.PerformanceConfiguration$, () => exports.ServiceTier$], 2
];
exports.ConverseStreamMetrics$ = [3, n0, _CSM,
    0,
    [_lM],
    [1], 1
];
exports.ConverseStreamRequest$ = [3, n0, _CSR,
    0,
    [_mI, _me, _sy, _iC, _tC, _gCu, _aMRF, _pV, _aMRFP, _rM, _pC, _sTe, _oC],
    [[0, 1], [() => Messages, 0], [() => SystemContentBlocks, 0], () => exports.InferenceConfiguration$, () => exports.ToolConfiguration$, () => exports.GuardrailStreamConfiguration$, 15, [() => PromptVariableMap, 0], 64 | 0, [() => RequestMetadata, 0], () => exports.PerformanceConfiguration$, () => exports.ServiceTier$, [() => exports.OutputConfig$, 0]], 1
];
exports.ConverseStreamResponse$ = [3, n0, _CSRo,
    0,
    [_str],
    [[() => exports.ConverseStreamOutput$, 16]]
];
exports.ConverseStreamTrace$ = [3, n0, _CST,
    0,
    [_g, _pR],
    [[() => exports.GuardrailTraceAssessment$, 0], () => exports.PromptRouterTrace$]
];
exports.ConverseTokensRequest$ = [3, n0, _CTR,
    0,
    [_me, _sy, _tC, _aMRF],
    [[() => Messages, 0], [() => SystemContentBlocks, 0], () => exports.ToolConfiguration$, 15]
];
exports.ConverseTrace$ = [3, n0, _CT,
    0,
    [_g, _pR],
    [[() => exports.GuardrailTraceAssessment$, 0], () => exports.PromptRouterTrace$]
];
exports.CountTokensRequest$ = [3, n0, _CTRo,
    0,
    [_mI, _i],
    [[0, 1], [() => exports.CountTokensInput$, 0]], 2
];
exports.CountTokensResponse$ = [3, n0, _CTRou,
    0,
    [_iT],
    [1], 1
];
exports.DocumentBlock$ = [3, n0, _DB,
    0,
    [_n, _so, _f, _con, _ci],
    [0, () => exports.DocumentSource$, 0, 0, () => exports.CitationsConfig$], 2
];
exports.DocumentCharLocation$ = [3, n0, _DCL,
    0,
    [_dI, _sta, _end],
    [1, 1, 1]
];
exports.DocumentChunkLocation$ = [3, n0, _DCLo,
    0,
    [_dI, _sta, _end],
    [1, 1, 1]
];
exports.DocumentPageLocation$ = [3, n0, _DPL,
    0,
    [_dI, _sta, _end],
    [1, 1, 1]
];
exports.ErrorBlock$ = [3, n0, _EB,
    8,
    [_m],
    [0]
];
exports.GetAsyncInvokeRequest$ = [3, n0, _GAIR,
    0,
    [_iA],
    [[0, 1]], 1
];
exports.GetAsyncInvokeResponse$ = [3, n0, _GAIRe,
    0,
    [_iA, _mA, _st, _sT, _oDC, _cRT, _fM, _lMT, _eT],
    [0, 0, 0, 5, () => exports.AsyncInvokeOutputDataConfig$, 0, [() => AsyncInvokeMessage, 0], 5, 5], 5
];
exports.GuardrailAssessment$ = [3, n0, _GA,
    0,
    [_tP, _cP, _wP, _sIP, _cGP, _aRP, _iM, _aGD],
    [() => exports.GuardrailTopicPolicyAssessment$, () => exports.GuardrailContentPolicyAssessment$, () => exports.GuardrailWordPolicyAssessment$, () => exports.GuardrailSensitiveInformationPolicyAssessment$, () => exports.GuardrailContextualGroundingPolicyAssessment$, [() => exports.GuardrailAutomatedReasoningPolicyAssessment$, 0], () => exports.GuardrailInvocationMetrics$, () => exports.AppliedGuardrailDetails$]
];
exports.GuardrailAutomatedReasoningImpossibleFinding$ = [3, n0, _GARIF,
    0,
    [_tra, _cR, _lW],
    [[() => exports.GuardrailAutomatedReasoningTranslation$, 0], () => GuardrailAutomatedReasoningRuleList, [() => exports.GuardrailAutomatedReasoningLogicWarning$, 0]]
];
exports.GuardrailAutomatedReasoningInputTextReference$ = [3, n0, _GARITR,
    0,
    [_te],
    [[() => GuardrailAutomatedReasoningStatementNaturalLanguageContent, 0]]
];
exports.GuardrailAutomatedReasoningInvalidFinding$ = [3, n0, _GARIFu,
    0,
    [_tra, _cR, _lW],
    [[() => exports.GuardrailAutomatedReasoningTranslation$, 0], () => GuardrailAutomatedReasoningRuleList, [() => exports.GuardrailAutomatedReasoningLogicWarning$, 0]]
];
exports.GuardrailAutomatedReasoningLogicWarning$ = [3, n0, _GARLW,
    0,
    [_ty, _p, _cl],
    [0, [() => GuardrailAutomatedReasoningStatementList, 0], [() => GuardrailAutomatedReasoningStatementList, 0]]
];
exports.GuardrailAutomatedReasoningNoTranslationsFinding$ = [3, n0, _GARNTF,
    0,
    [],
    []
];
exports.GuardrailAutomatedReasoningPolicyAssessment$ = [3, n0, _GARPA,
    0,
    [_fi],
    [[() => GuardrailAutomatedReasoningFindingList, 0]]
];
exports.GuardrailAutomatedReasoningRule$ = [3, n0, _GARR,
    0,
    [_id, _pVA],
    [0, 0]
];
exports.GuardrailAutomatedReasoningSatisfiableFinding$ = [3, n0, _GARSF,
    0,
    [_tra, _cTS, _cFS, _lW],
    [[() => exports.GuardrailAutomatedReasoningTranslation$, 0], [() => exports.GuardrailAutomatedReasoningScenario$, 0], [() => exports.GuardrailAutomatedReasoningScenario$, 0], [() => exports.GuardrailAutomatedReasoningLogicWarning$, 0]]
];
exports.GuardrailAutomatedReasoningScenario$ = [3, n0, _GARS,
    0,
    [_stat],
    [[() => GuardrailAutomatedReasoningStatementList, 0]]
];
exports.GuardrailAutomatedReasoningStatement$ = [3, n0, _GARSu,
    0,
    [_lo, _nL],
    [[() => GuardrailAutomatedReasoningStatementLogicContent, 0], [() => GuardrailAutomatedReasoningStatementNaturalLanguageContent, 0]]
];
exports.GuardrailAutomatedReasoningTooComplexFinding$ = [3, n0, _GARTCF,
    0,
    [],
    []
];
exports.GuardrailAutomatedReasoningTranslation$ = [3, n0, _GART,
    0,
    [_p, _cl, _uP, _uC, _conf],
    [[() => GuardrailAutomatedReasoningStatementList, 0], [() => GuardrailAutomatedReasoningStatementList, 0], [() => GuardrailAutomatedReasoningInputTextReferenceList, 0], [() => GuardrailAutomatedReasoningInputTextReferenceList, 0], 1]
];
exports.GuardrailAutomatedReasoningTranslationAmbiguousFinding$ = [3, n0, _GARTAF,
    0,
    [_op, _dS],
    [[() => GuardrailAutomatedReasoningTranslationOptionList, 0], [() => GuardrailAutomatedReasoningDifferenceScenarioList, 0]]
];
exports.GuardrailAutomatedReasoningTranslationOption$ = [3, n0, _GARTO,
    0,
    [_tran],
    [[() => GuardrailAutomatedReasoningTranslationList, 0]]
];
exports.GuardrailAutomatedReasoningValidFinding$ = [3, n0, _GARVF,
    0,
    [_tra, _cTS, _sRu, _lW],
    [[() => exports.GuardrailAutomatedReasoningTranslation$, 0], [() => exports.GuardrailAutomatedReasoningScenario$, 0], () => GuardrailAutomatedReasoningRuleList, [() => exports.GuardrailAutomatedReasoningLogicWarning$, 0]]
];
exports.GuardrailConfiguration$ = [3, n0, _GC,
    0,
    [_gIu, _gV, _tr],
    [0, 0, 0]
];
exports.GuardrailContentFilter$ = [3, n0, _GCF,
    0,
    [_ty, _conf, _a, _fS, _de],
    [0, 0, 0, 0, 2], 3
];
exports.GuardrailContentPolicyAssessment$ = [3, n0, _GCPA,
    0,
    [_fil],
    [() => GuardrailContentFilterList], 1
];
exports.GuardrailContextualGroundingFilter$ = [3, n0, _GCGF,
    0,
    [_ty, _th, _sc, _a, _de],
    [0, 1, 1, 0, 2], 4
];
exports.GuardrailContextualGroundingPolicyAssessment$ = [3, n0, _GCGPA,
    0,
    [_fil],
    [() => GuardrailContextualGroundingFilters]
];
exports.GuardrailConverseImageBlock$ = [3, n0, _GCIB,
    8,
    [_f, _so],
    [0, [() => exports.GuardrailConverseImageSource$, 0]], 2
];
exports.GuardrailConverseTextBlock$ = [3, n0, _GCTB,
    0,
    [_te, _q],
    [0, 64 | 0], 1
];
exports.GuardrailCoverage$ = [3, n0, _GCu,
    0,
    [_tCe, _im],
    [() => exports.GuardrailTextCharactersCoverage$, () => exports.GuardrailImageCoverage$]
];
exports.GuardrailCustomWord$ = [3, n0, _GCW,
    0,
    [_ma, _a, _de],
    [0, 0, 2], 2
];
exports.GuardrailImageBlock$ = [3, n0, _GIB,
    8,
    [_f, _so],
    [0, [() => exports.GuardrailImageSource$, 0]], 2
];
exports.GuardrailImageCoverage$ = [3, n0, _GIC,
    0,
    [_gu, _to],
    [1, 1]
];
exports.GuardrailInvocationMetrics$ = [3, n0, _GIM,
    0,
    [_gPL, _u, _gC],
    [1, () => exports.GuardrailUsage$, () => exports.GuardrailCoverage$]
];
exports.GuardrailManagedWord$ = [3, n0, _GMW,
    0,
    [_ma, _ty, _a, _de],
    [0, 0, 0, 2], 3
];
exports.GuardrailOutputContent$ = [3, n0, _GOC,
    0,
    [_te],
    [0]
];
exports.GuardrailPiiEntityFilter$ = [3, n0, _GPEF,
    0,
    [_ma, _ty, _a, _de],
    [0, 0, 0, 2], 3
];
exports.GuardrailRegexFilter$ = [3, n0, _GRF,
    0,
    [_a, _n, _ma, _r, _de],
    [0, 0, 0, 0, 2], 1
];
exports.GuardrailSensitiveInformationPolicyAssessment$ = [3, n0, _GSIPA,
    0,
    [_pE, _re],
    [() => GuardrailPiiEntityFilterList, () => GuardrailRegexFilterList], 2
];
exports.GuardrailStreamConfiguration$ = [3, n0, _GSC,
    0,
    [_gIu, _gV, _tr, _sPM],
    [0, 0, 0, 0]
];
exports.GuardrailTextBlock$ = [3, n0, _GTB,
    0,
    [_te, _q],
    [0, 64 | 0], 1
];
exports.GuardrailTextCharactersCoverage$ = [3, n0, _GTCC,
    0,
    [_gu, _to],
    [1, 1]
];
exports.GuardrailTopic$ = [3, n0, _GT,
    0,
    [_n, _ty, _a, _de],
    [0, 0, 0, 2], 3
];
exports.GuardrailTopicPolicyAssessment$ = [3, n0, _GTPA,
    0,
    [_top],
    [() => GuardrailTopicList], 1
];
exports.GuardrailTraceAssessment$ = [3, n0, _GTA,
    0,
    [_mO, _iAn, _oA, _aR],
    [64 | 0, [() => GuardrailAssessmentMap, 0], [() => GuardrailAssessmentListMap, 0], 0]
];
exports.GuardrailUsage$ = [3, n0, _GU,
    0,
    [_tPU, _cPU, _wPU, _sIPU, _sIPFU, _cGPU, _cPIU, _aRPU, _aRPu],
    [1, 1, 1, 1, 1, 1, 1, 1, 1], 6
];
exports.GuardrailWordPolicyAssessment$ = [3, n0, _GWPA,
    0,
    [_cW, _mWL],
    [() => GuardrailCustomWordList, () => GuardrailManagedWordList], 2
];
exports.ImageBlock$ = [3, n0, _IB,
    0,
    [_f, _so, _e],
    [0, [() => exports.ImageSource$, 0], [() => exports.ErrorBlock$, 0]], 2
];
exports.ImageBlockDelta$ = [3, n0, _IBD,
    0,
    [_so, _e],
    [[() => exports.ImageSource$, 0], [() => exports.ErrorBlock$, 0]]
];
exports.ImageBlockStart$ = [3, n0, _IBS,
    0,
    [_f],
    [0], 1
];
exports.InferenceConfiguration$ = [3, n0, _IC,
    0,
    [_mT, _tem, _tPo, _sS],
    [1, 1, 1, 64 | 0]
];
exports.InvokeModelRequest$ = [3, n0, _IMR,
    0,
    [_mI, _bo, _cT, _ac, _tr, _gIu, _gV, _pCL, _sTe],
    [[0, 1], [() => Body, 16], [0, { [_hH]: _CT_ }], [0, { [_hH]: _A }], [0, { [_hH]: _XABT }], [0, { [_hH]: _XABG }], [0, { [_hH]: _XABG_ }], [0, { [_hH]: _XABPL }], [0, { [_hH]: _XABST }]], 1
];
exports.InvokeModelResponse$ = [3, n0, _IMRn,
    0,
    [_bo, _cT, _pCL, _sTe],
    [[() => Body, 16], [0, { [_hH]: _CT_ }], [0, { [_hH]: _XABPL }], [0, { [_hH]: _XABST }]], 2
];
exports.InvokeModelTokensRequest$ = [3, n0, _IMTR,
    0,
    [_bo],
    [[() => Body, 0]], 1
];
exports.InvokeModelWithBidirectionalStreamRequest$ = [3, n0, _IMWBSR,
    0,
    [_mI, _bo],
    [[0, 1], [() => exports.InvokeModelWithBidirectionalStreamInput$, 16]], 2
];
exports.InvokeModelWithBidirectionalStreamResponse$ = [3, n0, _IMWBSRn,
    0,
    [_bo],
    [[() => exports.InvokeModelWithBidirectionalStreamOutput$, 16]], 1
];
exports.InvokeModelWithResponseStreamRequest$ = [3, n0, _IMWRSR,
    0,
    [_mI, _bo, _cT, _ac, _tr, _gIu, _gV, _pCL, _sTe],
    [[0, 1], [() => Body, 16], [0, { [_hH]: _CT_ }], [0, { [_hH]: _XABA }], [0, { [_hH]: _XABT }], [0, { [_hH]: _XABG }], [0, { [_hH]: _XABG_ }], [0, { [_hH]: _XABPL }], [0, { [_hH]: _XABST }]], 1
];
exports.InvokeModelWithResponseStreamResponse$ = [3, n0, _IMWRSRn,
    0,
    [_bo, _cT, _pCL, _sTe],
    [[() => exports.ResponseStream$, 16], [0, { [_hH]: _XABCT }], [0, { [_hH]: _XABPL }], [0, { [_hH]: _XABST }]], 2
];
exports.JsonSchemaDefinition$ = [3, n0, _JSD,
    0,
    [_sch, _n, _des],
    [0, 0, 0], 1
];
exports.ListAsyncInvokesRequest$ = [3, n0, _LAIR,
    0,
    [_sTA, _sTB, _sE, _mR, _nT, _sB, _sO],
    [[5, { [_hQ]: _sTA }], [5, { [_hQ]: _sTB }], [0, { [_hQ]: _sE }], [1, { [_hQ]: _mR }], [0, { [_hQ]: _nT }], [0, { [_hQ]: _sB }], [0, { [_hQ]: _sO }]]
];
exports.ListAsyncInvokesResponse$ = [3, n0, _LAIRi,
    0,
    [_nT, _aIS],
    [0, [() => AsyncInvokeSummaries, 0]]
];
exports.Message$ = [3, n0, _M,
    0,
    [_ro, _co],
    [0, [() => ContentBlocks, 0]], 2
];
exports.MessageStartEvent$ = [3, n0, _MSE,
    0,
    [_ro],
    [0], 1
];
exports.MessageStopEvent$ = [3, n0, _MSEe,
    0,
    [_sR, _aMRFd],
    [0, 15], 1
];
exports.OutputConfig$ = [3, n0, _OC,
    0,
    [_tF],
    [[() => exports.OutputFormat$, 0]]
];
exports.OutputFormat$ = [3, n0, _OF,
    0,
    [_ty, _stru],
    [0, [() => exports.OutputFormatStructure$, 0]], 2
];
exports.PayloadPart$ = [3, n0, _PP,
    8,
    [_b],
    [[() => PartBody, 0]]
];
exports.PerformanceConfiguration$ = [3, n0, _PC,
    0,
    [_la],
    [0]
];
exports.PromptRouterTrace$ = [3, n0, _PRT,
    0,
    [_iMI],
    [0]
];
exports.ReasoningTextBlock$ = [3, n0, _RTB,
    8,
    [_te, _si],
    [0, 0], 1
];
exports.S3Location$ = [3, n0, _SL,
    0,
    [_ur, _bO],
    [0, 0], 1
];
exports.SearchResultBlock$ = [3, n0, _SRB,
    0,
    [_so, _ti, _co, _ci],
    [0, 0, () => SearchResultContentBlocks, () => exports.CitationsConfig$], 3
];
exports.SearchResultContentBlock$ = [3, n0, _SRCB,
    0,
    [_te],
    [0], 1
];
exports.SearchResultLocation$ = [3, n0, _SRL,
    0,
    [_sRI, _sta, _end],
    [1, 1, 1]
];
exports.ServiceTier$ = [3, n0, _ST,
    0,
    [_ty],
    [0], 1
];
exports.SpecificToolChoice$ = [3, n0, _STC,
    0,
    [_n],
    [0], 1
];
exports.StartAsyncInvokeRequest$ = [3, n0, _SAIR,
    0,
    [_mI, _mIo, _oDC, _cRT, _ta],
    [0, [() => ModelInputPayload, 0], () => exports.AsyncInvokeOutputDataConfig$, [0, 4], () => TagList], 3
];
exports.StartAsyncInvokeResponse$ = [3, n0, _SAIRt,
    0,
    [_iA],
    [0], 1
];
exports.SystemTool$ = [3, n0, _STy,
    0,
    [_n],
    [0], 1
];
exports.Tag$ = [3, n0, _T,
    0,
    [_k, _v],
    [0, 0], 2
];
exports.TokenUsage$ = [3, n0, _TU,
    0,
    [_iT, _oT, _tT, _cRIT, _cWIT, _cD],
    [1, 1, 1, 1, 1, () => CacheDetailsList], 3
];
exports.ToolConfiguration$ = [3, n0, _TC,
    0,
    [_too, _tCo],
    [() => Tools, () => exports.ToolChoice$], 1
];
exports.ToolResultBlock$ = [3, n0, _TRB,
    0,
    [_tUI, _co, _st, _ty],
    [0, [() => ToolResultContentBlocks, 0], 0, 0], 2
];
exports.ToolResultBlockStart$ = [3, n0, _TRBS,
    0,
    [_tUI, _ty, _st],
    [0, 0, 0], 1
];
exports.ToolSpecification$ = [3, n0, _TS,
    0,
    [_n, _iS, _des, _stri],
    [0, () => exports.ToolInputSchema$, 0, 2], 2
];
exports.ToolUseBlock$ = [3, n0, _TUB,
    0,
    [_tUI, _n, _i, _ty],
    [0, 0, 15, 0], 3
];
exports.ToolUseBlockDelta$ = [3, n0, _TUBD,
    0,
    [_i],
    [0], 1
];
exports.ToolUseBlockStart$ = [3, n0, _TUBS,
    0,
    [_tUI, _n, _ty],
    [0, 0, 0], 2
];
exports.VideoBlock$ = [3, n0, _VB,
    0,
    [_f, _so],
    [0, () => exports.VideoSource$], 2
];
exports.WebLocation$ = [3, n0, _WL,
    0,
    [_url, _do],
    [0, 0]
];
var AdditionalModelResponseFieldPaths = (/* unused pure expression or super */ null && (64 | 0));
var AsyncInvokeSummaries = [1, n0, _AISs,
    0, [() => exports.AsyncInvokeSummary$,
        0]
];
var CacheDetailsList = [1, n0, _CDL,
    0, () => exports.CacheDetail$
];
var CitationGeneratedContentList = [1, n0, _CGCL,
    0, () => exports.CitationGeneratedContent$
];
var Citations = [1, n0, _Ci,
    0, () => exports.Citation$
];
var CitationSourceContentList = [1, n0, _CSCL,
    0, () => exports.CitationSourceContent$
];
var CitationSourceContentListDelta = [1, n0, _CSCLD,
    0, () => exports.CitationSourceContentDelta$
];
var ContentBlocks = [1, n0, _CB,
    0, [() => exports.ContentBlock$,
        0]
];
var DocumentContentBlocks = [1, n0, _DCB,
    0, () => exports.DocumentContentBlock$
];
var GuardrailAssessmentList = [1, n0, _GAL,
    0, [() => exports.GuardrailAssessment$,
        0]
];
var GuardrailAutomatedReasoningDifferenceScenarioList = [1, n0, _GARDSL,
    0, [() => exports.GuardrailAutomatedReasoningScenario$,
        0]
];
var GuardrailAutomatedReasoningFindingList = [1, n0, _GARFL,
    0, [() => exports.GuardrailAutomatedReasoningFinding$,
        0]
];
var GuardrailAutomatedReasoningInputTextReferenceList = [1, n0, _GARITRL,
    0, [() => exports.GuardrailAutomatedReasoningInputTextReference$,
        0]
];
var GuardrailAutomatedReasoningRuleList = [1, n0, _GARRL,
    0, () => exports.GuardrailAutomatedReasoningRule$
];
var GuardrailAutomatedReasoningStatementList = [1, n0, _GARSL,
    0, [() => exports.GuardrailAutomatedReasoningStatement$,
        0]
];
var GuardrailAutomatedReasoningTranslationList = [1, n0, _GARTL,
    0, [() => exports.GuardrailAutomatedReasoningTranslation$,
        0]
];
var GuardrailAutomatedReasoningTranslationOptionList = [1, n0, _GARTOL,
    0, [() => exports.GuardrailAutomatedReasoningTranslationOption$,
        0]
];
var GuardrailContentBlockList = [1, n0, _GCBL,
    0, [() => exports.GuardrailContentBlock$,
        0]
];
var GuardrailContentFilterList = [1, n0, _GCFL,
    0, () => exports.GuardrailContentFilter$
];
var GuardrailContentQualifierList = (/* unused pure expression or super */ null && (64 | 0));
var GuardrailContextualGroundingFilters = [1, n0, _GCGFu,
    0, () => exports.GuardrailContextualGroundingFilter$
];
var GuardrailConverseContentQualifierList = (/* unused pure expression or super */ null && (64 | 0));
var GuardrailCustomWordList = [1, n0, _GCWL,
    0, () => exports.GuardrailCustomWord$
];
var GuardrailManagedWordList = [1, n0, _GMWL,
    0, () => exports.GuardrailManagedWord$
];
var GuardrailOriginList = (/* unused pure expression or super */ null && (64 | 0));
var GuardrailOutputContentList = [1, n0, _GOCL,
    0, () => exports.GuardrailOutputContent$
];
var GuardrailPiiEntityFilterList = [1, n0, _GPEFL,
    0, () => exports.GuardrailPiiEntityFilter$
];
var GuardrailRegexFilterList = [1, n0, _GRFL,
    0, () => exports.GuardrailRegexFilter$
];
var GuardrailTopicList = [1, n0, _GTL,
    0, () => exports.GuardrailTopic$
];
var Messages = [1, n0, _Me,
    0, [() => exports.Message$,
        0]
];
var ModelOutputs = (/* unused pure expression or super */ null && (64 | 0));
var NonEmptyStringList = (/* unused pure expression or super */ null && (64 | 0));
var SearchResultContentBlocks = [1, n0, _SRCBe,
    0, () => exports.SearchResultContentBlock$
];
var SystemContentBlocks = [1, n0, _SCB,
    0, [() => exports.SystemContentBlock$,
        0]
];
var TagList = [1, n0, _TL,
    0, () => exports.Tag$
];
var ToolResultBlocksDelta = [1, n0, _TRBD,
    0, () => exports.ToolResultBlockDelta$
];
var ToolResultContentBlocks = [1, n0, _TRCB,
    0, [() => exports.ToolResultContentBlock$,
        0]
];
var Tools = [1, n0, _To,
    0, () => exports.Tool$
];
var GuardrailAssessmentListMap = [2, n0, _GALM,
    0, [0,
        0],
    [() => GuardrailAssessmentList,
        0]
];
var GuardrailAssessmentMap = [2, n0, _GAM,
    0, [0,
        0],
    [() => exports.GuardrailAssessment$,
        0]
];
var PromptVariableMap = [2, n0, _PVM,
    8, 0, () => exports.PromptVariableValues$
];
var RequestMetadata = [2, n0, _RM,
    8, 0, 0
];
exports.AsyncInvokeOutputDataConfig$ = [4, n0, _AIODC,
    0,
    [_sODC],
    [() => exports.AsyncInvokeS3OutputDataConfig$]
];
exports.AudioSource$ = [4, n0, _AS,
    8,
    [_b, _sL],
    [21, () => exports.S3Location$]
];
exports.CitationGeneratedContent$ = [4, n0, _CGC,
    0,
    [_te],
    [0]
];
exports.CitationLocation$ = [4, n0, _CL,
    0,
    [_w, _dC, _dP, _dCo, _sRL],
    [() => exports.WebLocation$, () => exports.DocumentCharLocation$, () => exports.DocumentPageLocation$, () => exports.DocumentChunkLocation$, () => exports.SearchResultLocation$]
];
exports.CitationSourceContent$ = [4, n0, _CSC,
    0,
    [_te],
    [0]
];
exports.ContentBlock$ = [4, n0, _CBo,
    0,
    [_te, _ima, _doc, _vi, _au, _tU, _tR, _gCua, _cPa, _rC, _cC, _sRe],
    [0, [() => exports.ImageBlock$, 0], () => exports.DocumentBlock$, () => exports.VideoBlock$, [() => exports.AudioBlock$, 0], () => exports.ToolUseBlock$, [() => exports.ToolResultBlock$, 0], [() => exports.GuardrailConverseContentBlock$, 0], () => exports.CachePointBlock$, [() => exports.ReasoningContentBlock$, 0], () => exports.CitationsContentBlock$, () => exports.SearchResultBlock$]
];
exports.ContentBlockDelta$ = [4, n0, _CBD,
    0,
    [_te, _tU, _tR, _rC, _cit, _ima],
    [0, () => exports.ToolUseBlockDelta$, () => ToolResultBlocksDelta, [() => exports.ReasoningContentBlockDelta$, 0], () => exports.CitationsDelta$, [() => exports.ImageBlockDelta$, 0]]
];
exports.ContentBlockStart$ = [4, n0, _CBS,
    0,
    [_tU, _tR, _ima],
    [() => exports.ToolUseBlockStart$, () => exports.ToolResultBlockStart$, () => exports.ImageBlockStart$]
];
exports.ConverseOutput$ = [4, n0, _CO,
    0,
    [_m],
    [[() => exports.Message$, 0]]
];
exports.ConverseStreamOutput$ = [4, n0, _CSO,
    { [_stre]: 1 },
    [_mS, _cBS, _cBD, _cBSo, _mSe, _meta, _iSE, _mSEE, _vE, _tE, _sUE],
    [() => exports.MessageStartEvent$, () => exports.ContentBlockStartEvent$, [() => exports.ContentBlockDeltaEvent$, 0], () => exports.ContentBlockStopEvent$, () => exports.MessageStopEvent$, [() => exports.ConverseStreamMetadataEvent$, 0], [() => exports.InternalServerException$, 0], [() => exports.ModelStreamErrorException$, 0], [() => exports.ValidationException$, 0], [() => exports.ThrottlingException$, 0], [() => exports.ServiceUnavailableException$, 0]]
];
exports.CountTokensInput$ = [4, n0, _CTI,
    0,
    [_iMn, _conv],
    [[() => exports.InvokeModelTokensRequest$, 0], [() => exports.ConverseTokensRequest$, 0]]
];
exports.DocumentContentBlock$ = [4, n0, _DCBo,
    0,
    [_te],
    [0]
];
exports.DocumentSource$ = [4, n0, _DS,
    0,
    [_b, _sL, _te, _co],
    [21, () => exports.S3Location$, 0, () => DocumentContentBlocks]
];
exports.GuardrailAutomatedReasoningFinding$ = [4, n0, _GARF,
    0,
    [_va, _in, _sa, _imp, _tA, _tCoo, _nTo],
    [[() => exports.GuardrailAutomatedReasoningValidFinding$, 0], [() => exports.GuardrailAutomatedReasoningInvalidFinding$, 0], [() => exports.GuardrailAutomatedReasoningSatisfiableFinding$, 0], [() => exports.GuardrailAutomatedReasoningImpossibleFinding$, 0], [() => exports.GuardrailAutomatedReasoningTranslationAmbiguousFinding$, 0], () => exports.GuardrailAutomatedReasoningTooComplexFinding$, () => exports.GuardrailAutomatedReasoningNoTranslationsFinding$]
];
exports.GuardrailContentBlock$ = [4, n0, _GCB,
    0,
    [_te, _ima],
    [() => exports.GuardrailTextBlock$, [() => exports.GuardrailImageBlock$, 0]]
];
exports.GuardrailConverseContentBlock$ = [4, n0, _GCCB,
    0,
    [_te, _ima],
    [() => exports.GuardrailConverseTextBlock$, [() => exports.GuardrailConverseImageBlock$, 0]]
];
exports.GuardrailConverseImageSource$ = [4, n0, _GCIS,
    8,
    [_b],
    [21]
];
exports.GuardrailImageSource$ = [4, n0, _GIS,
    8,
    [_b],
    [21]
];
exports.ImageSource$ = [4, n0, _IS,
    8,
    [_b, _sL],
    [21, () => exports.S3Location$]
];
exports.InvokeModelWithBidirectionalStreamInput$ = [4, n0, _IMWBSI,
    { [_stre]: 1 },
    [_ch],
    [[() => exports.BidirectionalInputPayloadPart$, 0]]
];
exports.InvokeModelWithBidirectionalStreamOutput$ = [4, n0, _IMWBSO,
    { [_stre]: 1 },
    [_ch, _iSE, _mSEE, _vE, _tE, _mTE, _sUE],
    [[() => exports.BidirectionalOutputPayloadPart$, 0], [() => exports.InternalServerException$, 0], [() => exports.ModelStreamErrorException$, 0], [() => exports.ValidationException$, 0], [() => exports.ThrottlingException$, 0], [() => exports.ModelTimeoutException$, 0], [() => exports.ServiceUnavailableException$, 0]]
];
exports.OutputFormatStructure$ = [4, n0, _OFS,
    8,
    [_jS],
    [() => exports.JsonSchemaDefinition$]
];
exports.PromptVariableValues$ = [4, n0, _PVV,
    0,
    [_te],
    [0]
];
exports.ReasoningContentBlock$ = [4, n0, _RCB,
    8,
    [_rT, _rCe],
    [[() => exports.ReasoningTextBlock$, 0], 21]
];
exports.ReasoningContentBlockDelta$ = [4, n0, _RCBD,
    8,
    [_te, _rCe, _si],
    [0, 21, 0]
];
exports.ResponseStream$ = [4, n0, _RS,
    { [_stre]: 1 },
    [_ch, _iSE, _mSEE, _vE, _tE, _mTE, _sUE],
    [[() => exports.PayloadPart$, 0], [() => exports.InternalServerException$, 0], [() => exports.ModelStreamErrorException$, 0], [() => exports.ValidationException$, 0], [() => exports.ThrottlingException$, 0], [() => exports.ModelTimeoutException$, 0], [() => exports.ServiceUnavailableException$, 0]]
];
exports.SystemContentBlock$ = [4, n0, _SCBy,
    0,
    [_te, _gCua, _cPa],
    [0, [() => exports.GuardrailConverseContentBlock$, 0], () => exports.CachePointBlock$]
];
exports.Tool$ = [4, n0, _Too,
    0,
    [_tS, _sTy, _cPa],
    [() => exports.ToolSpecification$, () => exports.SystemTool$, () => exports.CachePointBlock$]
];
exports.ToolChoice$ = [4, n0, _TCo,
    0,
    [_aut, _an, _tool],
    [() => exports.AutoToolChoice$, () => exports.AnyToolChoice$, () => exports.SpecificToolChoice$]
];
exports.ToolInputSchema$ = [4, n0, _TIS,
    0,
    [_j],
    [15]
];
exports.ToolResultBlockDelta$ = [4, n0, _TRBDo,
    0,
    [_te, _j],
    [0, 15]
];
exports.ToolResultContentBlock$ = [4, n0, _TRCBo,
    0,
    [_j, _te, _ima, _doc, _vi, _sRe],
    [15, 0, [() => exports.ImageBlock$, 0], () => exports.DocumentBlock$, () => exports.VideoBlock$, () => exports.SearchResultBlock$]
];
exports.VideoSource$ = [4, n0, _VS,
    0,
    [_b, _sL],
    [21, () => exports.S3Location$]
];
exports.ApplyGuardrail$ = [9, n0, _AG,
    { [_h]: ["POST", "/guardrail/{guardrailIdentifier}/version/{guardrailVersion}/apply", 200] }, () => exports.ApplyGuardrailRequest$, () => exports.ApplyGuardrailResponse$
];
exports.Converse$ = [9, n0, _Co,
    { [_h]: ["POST", "/model/{modelId}/converse", 200] }, () => exports.ConverseRequest$, () => exports.ConverseResponse$
];
exports.ConverseStream$ = [9, n0, _CS,
    { [_h]: ["POST", "/model/{modelId}/converse-stream", 200] }, () => exports.ConverseStreamRequest$, () => exports.ConverseStreamResponse$
];
exports.CountTokens$ = [9, n0, _CTo,
    { [_h]: ["POST", "/model/{modelId}/count-tokens", 200] }, () => exports.CountTokensRequest$, () => exports.CountTokensResponse$
];
exports.GetAsyncInvoke$ = [9, n0, _GAI,
    { [_h]: ["GET", "/async-invoke/{invocationArn}", 200] }, () => exports.GetAsyncInvokeRequest$, () => exports.GetAsyncInvokeResponse$
];
exports.InvokeModel$ = [9, n0, _IM,
    { [_h]: ["POST", "/model/{modelId}/invoke", 200] }, () => exports.InvokeModelRequest$, () => exports.InvokeModelResponse$
];
exports.InvokeModelWithBidirectionalStream$ = [9, n0, _IMWBS,
    { [_h]: ["POST", "/model/{modelId}/invoke-with-bidirectional-stream", 200] }, () => exports.InvokeModelWithBidirectionalStreamRequest$, () => exports.InvokeModelWithBidirectionalStreamResponse$
];
exports.InvokeModelWithResponseStream$ = [9, n0, _IMWRS,
    { [_h]: ["POST", "/model/{modelId}/invoke-with-response-stream", 200] }, () => exports.InvokeModelWithResponseStreamRequest$, () => exports.InvokeModelWithResponseStreamResponse$
];
exports.ListAsyncInvokes$ = [9, n0, _LAI,
    { [_h]: ["GET", "/async-invoke", 200] }, () => exports.ListAsyncInvokesRequest$, () => exports.ListAsyncInvokesResponse$
];
exports.StartAsyncInvoke$ = [9, n0, _SAI,
    { [_h]: ["POST", "/async-invoke", 200] }, () => exports.StartAsyncInvokeRequest$, () => exports.StartAsyncInvokeResponse$
];


/***/ }),

/***/ 77186:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var retry = __webpack_require__(64233);
var protocols = __webpack_require__(45598);
var lambdaInvokeStore = __webpack_require__(92685);
var core = __webpack_require__(86578);
var node_os = __webpack_require__(48161);
var node_process = __webpack_require__(1708);
var config = __webpack_require__(99659);
var promises = __webpack_require__(51455);
var node_path = __webpack_require__(76760);
var endpoints = __webpack_require__(86773);

const state = {
    warningEmitted: false,
};
const emitWarningIfUnsupportedVersion = (version) => {
    if (version && !state.warningEmitted) {
        if (process.env.AWS_SDK_JS_NODE_VERSION_SUPPORT_WARNING_DISABLED === "true") {
            state.warningEmitted = true;
            return;
        }
        const userMajorVersion = parseInt(version.substring(1, version.indexOf(".")));
        const vv = 22;
        if (userMajorVersion < vv) {
            state.warningEmitted = true;
            process.emitWarning(`NodeVersionSupportWarning: The AWS SDK for JavaScript (v3)
versions published after the first week of January 2027
will require node >=${vv}. You are running node ${version}.

To continue receiving updates to AWS services, bug fixes,
and security updates please upgrade to node >=${vv}.

More information can be found at: https://a.co/c895JFp`);
        }
    }
};

const longPollMiddleware = () => (next, context) => async (args) => {
    context.__retryLongPoll = true;
    return next(args);
};
const longPollMiddlewareOptions = {
    name: "longPollMiddleware",
    tags: ["RETRY"],
    step: "initialize",
    override: true,
};
const getLongPollPlugin = (options) => ({
    applyToStack: (clientStack) => {
        clientStack.add(longPollMiddleware(), longPollMiddlewareOptions);
    },
});

function setCredentialFeature(credentials, feature, value) {
    if (!credentials.$source) {
        credentials.$source = {};
    }
    credentials.$source[feature] = value;
    return credentials;
}

retry.Retry.v2026 ||= typeof process === "object" && process.env?.AWS_NEW_RETRIES_2026 === "true";
function setFeature(context, feature, value) {
    if (!context.__aws_sdk_context) {
        context.__aws_sdk_context = {
            features: {},
        };
    }
    else if (!context.__aws_sdk_context.features) {
        context.__aws_sdk_context.features = {};
    }
    context.__aws_sdk_context.features[feature] = value;
}

function setTokenFeature(token, feature, value) {
    if (!token.$source) {
        token.$source = {};
    }
    token.$source[feature] = value;
    return token;
}

function resolveHostHeaderConfig(input) {
    return input;
}
const hostHeaderMiddleware = (options) => (next) => async (args) => {
    if (!protocols.HttpRequest.isInstance(args.request))
        return next(args);
    const { request } = args;
    const { handlerProtocol = "" } = options.requestHandler.metadata || {};
    if (handlerProtocol.indexOf("h2") >= 0 && !request.headers[":authority"]) {
        delete request.headers["host"];
        request.headers[":authority"] = request.hostname + (request.port ? ":" + request.port : "");
    }
    else if (!request.headers["host"]) {
        let host = request.hostname;
        if (request.port != null)
            host += `:${request.port}`;
        request.headers["host"] = host;
    }
    return next(args);
};
const hostHeaderMiddlewareOptions = {
    name: "hostHeaderMiddleware",
    step: "build",
    priority: "low",
    tags: ["HOST"],
    override: true,
};
const getHostHeaderPlugin = (options) => ({
    applyToStack: (clientStack) => {
        clientStack.add(hostHeaderMiddleware(options), hostHeaderMiddlewareOptions);
    },
});

const loggerMiddleware = () => (next, context) => async (args) => {
    try {
        const response = await next(args);
        const { clientName, commandName, logger, dynamoDbDocumentClientOptions = {} } = context;
        const { overrideInputFilterSensitiveLog, overrideOutputFilterSensitiveLog } = dynamoDbDocumentClientOptions;
        const inputFilterSensitiveLog = overrideInputFilterSensitiveLog ?? context.inputFilterSensitiveLog;
        const outputFilterSensitiveLog = overrideOutputFilterSensitiveLog ?? context.outputFilterSensitiveLog;
        const { $metadata, ...outputWithoutMetadata } = response.output;
        logger?.info?.({
            clientName,
            commandName,
            input: inputFilterSensitiveLog(args.input),
            output: outputFilterSensitiveLog(outputWithoutMetadata),
            metadata: $metadata,
        });
        return response;
    }
    catch (error) {
        const { clientName, commandName, logger, dynamoDbDocumentClientOptions = {} } = context;
        const { overrideInputFilterSensitiveLog } = dynamoDbDocumentClientOptions;
        const inputFilterSensitiveLog = overrideInputFilterSensitiveLog ?? context.inputFilterSensitiveLog;
        logger?.error?.({
            clientName,
            commandName,
            input: inputFilterSensitiveLog(args.input),
            error,
            metadata: error.$metadata,
        });
        throw error;
    }
};
const loggerMiddlewareOptions = {
    name: "loggerMiddleware",
    tags: ["LOGGER"],
    step: "initialize",
    override: true,
};
const getLoggerPlugin = (options) => ({
    applyToStack: (clientStack) => {
        clientStack.add(loggerMiddleware(), loggerMiddlewareOptions);
    },
});

const recursionDetectionMiddlewareOptions = {
    step: "build",
    tags: ["RECURSION_DETECTION"],
    name: "recursionDetectionMiddleware",
    override: true,
    priority: "low",
};

const TRACE_ID_HEADER_NAME = "X-Amzn-Trace-Id";
const ENV_LAMBDA_FUNCTION_NAME = "AWS_LAMBDA_FUNCTION_NAME";
const ENV_TRACE_ID = "_X_AMZN_TRACE_ID";
const recursionDetectionMiddleware = () => (next) => async (args) => {
    const { request } = args;
    if (!protocols.HttpRequest.isInstance(request)) {
        return next(args);
    }
    const traceIdHeader = Object.keys(request.headers ?? {}).find((h) => h.toLowerCase() === TRACE_ID_HEADER_NAME.toLowerCase()) ??
        TRACE_ID_HEADER_NAME;
    if (request.headers.hasOwnProperty(traceIdHeader)) {
        return next(args);
    }
    const functionName = process.env[ENV_LAMBDA_FUNCTION_NAME];
    const traceIdFromEnv = process.env[ENV_TRACE_ID];
    const invokeStore = await lambdaInvokeStore.InvokeStore.getInstanceAsync();
    const traceIdFromInvokeStore = invokeStore?.getXRayTraceId();
    const traceId = traceIdFromInvokeStore ?? traceIdFromEnv;
    const nonEmptyString = (str) => typeof str === "string" && str.length > 0;
    if (nonEmptyString(functionName) && nonEmptyString(traceId)) {
        request.headers[TRACE_ID_HEADER_NAME] = traceId;
    }
    return next({
        ...args,
        request,
    });
};

const getRecursionDetectionPlugin = (options) => ({
    applyToStack: (clientStack) => {
        clientStack.add(recursionDetectionMiddleware(), recursionDetectionMiddlewareOptions);
    },
});

const DEFAULT_UA_APP_ID = undefined;
function isValidUserAgentAppId(appId) {
    if (appId === undefined) {
        return true;
    }
    return typeof appId === "string" && appId.length <= 50;
}
function resolveUserAgentConfig(input) {
    const normalizedAppIdProvider = core.normalizeProvider(input.userAgentAppId ?? DEFAULT_UA_APP_ID);
    const { customUserAgent } = input;
    return Object.assign(input, {
        customUserAgent: typeof customUserAgent === "string" ? [[customUserAgent]] : customUserAgent,
        userAgentAppId: async () => {
            const appId = await normalizedAppIdProvider();
            if (!isValidUserAgentAppId(appId)) {
                const logger = input.logger?.constructor?.name === "NoOpLogger" || !input.logger ? console : input.logger;
                if (typeof appId !== "string") {
                    logger?.warn("userAgentAppId must be a string or undefined.");
                }
                else if (appId.length > 50) {
                    logger?.warn("The provided userAgentAppId exceeds the maximum length of 50 characters.");
                }
            }
            return appId;
        },
    });
}

const partitionsInfo = { "partitions": [{ "id": "aws", "outputs": { "dnsSuffix": "amazonaws.com", "dualStackDnsSuffix": "api.aws", "implicitGlobalRegion": "us-east-1", "name": "aws", "supportsDualStack": true, "supportsFIPS": true }, "regionRegex": "^(us|eu|ap|sa|ca|me|af|il|mx)\\-\\w+\\-\\d+$", "regions": { "af-south-1": { "description": "Africa (Cape Town)" }, "ap-east-1": { "description": "Asia Pacific (Hong Kong)" }, "ap-east-2": { "description": "Asia Pacific (Taipei)" }, "ap-northeast-1": { "description": "Asia Pacific (Tokyo)" }, "ap-northeast-2": { "description": "Asia Pacific (Seoul)" }, "ap-northeast-3": { "description": "Asia Pacific (Osaka)" }, "ap-south-1": { "description": "Asia Pacific (Mumbai)" }, "ap-south-2": { "description": "Asia Pacific (Hyderabad)" }, "ap-southeast-1": { "description": "Asia Pacific (Singapore)" }, "ap-southeast-2": { "description": "Asia Pacific (Sydney)" }, "ap-southeast-3": { "description": "Asia Pacific (Jakarta)" }, "ap-southeast-4": { "description": "Asia Pacific (Melbourne)" }, "ap-southeast-5": { "description": "Asia Pacific (Malaysia)" }, "ap-southeast-6": { "description": "Asia Pacific (New Zealand)" }, "ap-southeast-7": { "description": "Asia Pacific (Thailand)" }, "aws-global": { "description": "aws global region" }, "ca-central-1": { "description": "Canada (Central)" }, "ca-west-1": { "description": "Canada West (Calgary)" }, "eu-central-1": { "description": "Europe (Frankfurt)" }, "eu-central-2": { "description": "Europe (Zurich)" }, "eu-north-1": { "description": "Europe (Stockholm)" }, "eu-south-1": { "description": "Europe (Milan)" }, "eu-south-2": { "description": "Europe (Spain)" }, "eu-west-1": { "description": "Europe (Ireland)" }, "eu-west-2": { "description": "Europe (London)" }, "eu-west-3": { "description": "Europe (Paris)" }, "il-central-1": { "description": "Israel (Tel Aviv)" }, "me-central-1": { "description": "Middle East (UAE)" }, "me-south-1": { "description": "Middle East (Bahrain)" }, "mx-central-1": { "description": "Mexico (Central)" }, "sa-east-1": { "description": "South America (Sao Paulo)" }, "us-east-1": { "description": "US East (N. Virginia)" }, "us-east-2": { "description": "US East (Ohio)" }, "us-west-1": { "description": "US West (N. California)" }, "us-west-2": { "description": "US West (Oregon)" } } }, { "id": "aws-cn", "outputs": { "dnsSuffix": "amazonaws.com.cn", "dualStackDnsSuffix": "api.amazonwebservices.com.cn", "implicitGlobalRegion": "cn-northwest-1", "name": "aws-cn", "supportsDualStack": true, "supportsFIPS": true }, "regionRegex": "^cn\\-\\w+\\-\\d+$", "regions": { "aws-cn-global": { "description": "aws-cn global region" }, "cn-north-1": { "description": "China (Beijing)" }, "cn-northwest-1": { "description": "China (Ningxia)" } } }, { "id": "aws-eusc", "outputs": { "dnsSuffix": "amazonaws.eu", "dualStackDnsSuffix": "api.amazonwebservices.eu", "implicitGlobalRegion": "eusc-de-east-1", "name": "aws-eusc", "supportsDualStack": true, "supportsFIPS": true }, "regionRegex": "^eusc\\-(de)\\-\\w+\\-\\d+$", "regions": { "eusc-de-east-1": { "description": "AWS European Sovereign Cloud (Germany)" } } }, { "id": "aws-iso", "outputs": { "dnsSuffix": "c2s.ic.gov", "dualStackDnsSuffix": "api.aws.ic.gov", "implicitGlobalRegion": "us-iso-east-1", "name": "aws-iso", "supportsDualStack": true, "supportsFIPS": true }, "regionRegex": "^us\\-iso\\-\\w+\\-\\d+$", "regions": { "aws-iso-global": { "description": "aws-iso global region" }, "us-iso-east-1": { "description": "US ISO East" }, "us-iso-west-1": { "description": "US ISO WEST" } } }, { "id": "aws-iso-b", "outputs": { "dnsSuffix": "sc2s.sgov.gov", "dualStackDnsSuffix": "api.aws.scloud", "implicitGlobalRegion": "us-isob-east-1", "name": "aws-iso-b", "supportsDualStack": true, "supportsFIPS": true }, "regionRegex": "^us\\-isob\\-\\w+\\-\\d+$", "regions": { "aws-iso-b-global": { "description": "aws-iso-b global region" }, "us-isob-east-1": { "description": "US ISOB East (Ohio)" }, "us-isob-west-1": { "description": "US ISOB West" } } }, { "id": "aws-iso-e", "outputs": { "dnsSuffix": "cloud.adc-e.uk", "dualStackDnsSuffix": "api.cloud-aws.adc-e.uk", "implicitGlobalRegion": "eu-isoe-west-1", "name": "aws-iso-e", "supportsDualStack": true, "supportsFIPS": true }, "regionRegex": "^eu\\-isoe\\-\\w+\\-\\d+$", "regions": { "aws-iso-e-global": { "description": "aws-iso-e global region" }, "eu-isoe-west-1": { "description": "EU ISOE West" } } }, { "id": "aws-iso-f", "outputs": { "dnsSuffix": "csp.hci.ic.gov", "dualStackDnsSuffix": "api.aws.hci.ic.gov", "implicitGlobalRegion": "us-isof-south-1", "name": "aws-iso-f", "supportsDualStack": true, "supportsFIPS": true }, "regionRegex": "^us\\-isof\\-\\w+\\-\\d+$", "regions": { "aws-iso-f-global": { "description": "aws-iso-f global region" }, "us-isof-east-1": { "description": "US ISOF EAST" }, "us-isof-south-1": { "description": "US ISOF SOUTH" } } }, { "id": "aws-us-gov", "outputs": { "dnsSuffix": "amazonaws.com", "dualStackDnsSuffix": "api.aws", "implicitGlobalRegion": "us-gov-west-1", "name": "aws-us-gov", "supportsDualStack": true, "supportsFIPS": true }, "regionRegex": "^us\\-gov\\-\\w+\\-\\d+$", "regions": { "aws-us-gov-global": { "description": "aws-us-gov global region" }, "us-gov-east-1": { "description": "AWS GovCloud (US-East)" }, "us-gov-west-1": { "description": "AWS GovCloud (US-West)" } } }], "version": "1.1" };

let selectedPartitionsInfo = partitionsInfo;
let selectedUserAgentPrefix = "";
const partition = (value) => {
    const { partitions } = selectedPartitionsInfo;
    for (const partition of partitions) {
        const { regions, outputs } = partition;
        for (const [region, regionData] of Object.entries(regions)) {
            if (region === value) {
                return {
                    ...outputs,
                    ...regionData,
                };
            }
        }
    }
    for (const partition of partitions) {
        const { regionRegex, outputs } = partition;
        if (new RegExp(regionRegex).test(value)) {
            return {
                ...outputs,
            };
        }
    }
    const DEFAULT_PARTITION = partitions.find((partition) => partition.id === "aws");
    if (!DEFAULT_PARTITION) {
        throw new Error("Provided region was not found in the partition array or regex," +
            " and default partition with id 'aws' doesn't exist.");
    }
    return {
        ...DEFAULT_PARTITION.outputs,
    };
};
const setPartitionInfo = (partitionsInfo, userAgentPrefix = "") => {
    selectedPartitionsInfo = partitionsInfo;
    selectedUserAgentPrefix = userAgentPrefix;
};
const useDefaultPartitionInfo = () => {
    setPartitionInfo(partitionsInfo, "");
};
const getUserAgentPrefix = () => selectedUserAgentPrefix;

const ACCOUNT_ID_ENDPOINT_REGEX = /\d{12}\.ddb/;
async function checkFeatures(context, config, args) {
    const request = args.request;
    if (request?.headers?.["smithy-protocol"] === "rpc-v2-cbor") {
        setFeature(context, "PROTOCOL_RPC_V2_CBOR", "M");
    }
    if (typeof config.retryStrategy === "function") {
        const retryStrategy = await config.retryStrategy();
        if (typeof retryStrategy.mode === "string") {
            switch (retryStrategy.mode) {
                case retry.RETRY_MODES.ADAPTIVE:
                    setFeature(context, "RETRY_MODE_ADAPTIVE", "F");
                    break;
                case retry.RETRY_MODES.STANDARD:
                    setFeature(context, "RETRY_MODE_STANDARD", "E");
                    break;
            }
        }
    }
    if (typeof config.accountIdEndpointMode === "function") {
        const endpointV2 = context.endpointV2;
        if (String(endpointV2?.url?.hostname).match(ACCOUNT_ID_ENDPOINT_REGEX)) {
            setFeature(context, "ACCOUNT_ID_ENDPOINT", "O");
        }
        switch (await config.accountIdEndpointMode?.()) {
            case "disabled":
                setFeature(context, "ACCOUNT_ID_MODE_DISABLED", "Q");
                break;
            case "preferred":
                setFeature(context, "ACCOUNT_ID_MODE_PREFERRED", "P");
                break;
            case "required":
                setFeature(context, "ACCOUNT_ID_MODE_REQUIRED", "R");
                break;
        }
    }
    const identity = context.__smithy_context?.selectedHttpAuthScheme?.identity;
    if (identity?.$source) {
        const credentials = identity;
        if (credentials.accountId) {
            setFeature(context, "RESOLVED_ACCOUNT_ID", "T");
        }
        for (const [key, value] of Object.entries(credentials.$source ?? {})) {
            setFeature(context, key, value);
        }
    }
}

const USER_AGENT = "user-agent";
const X_AMZ_USER_AGENT = "x-amz-user-agent";
const SPACE = " ";
const UA_NAME_SEPARATOR = "/";
const UA_NAME_ESCAPE_REGEX = /[^!$%&'*+\-.^_`|~\w]/g;
const UA_VALUE_ESCAPE_REGEX = /[^!$%&'*+\-.^_`|~\w#]/g;
const UA_ESCAPE_CHAR = "-";

const BYTE_LIMIT = 1024;
function encodeFeatures(features) {
    let buffer = "";
    for (const key in features) {
        const val = features[key];
        if (buffer.length + val.length + 1 <= BYTE_LIMIT) {
            if (buffer.length) {
                buffer += "," + val;
            }
            else {
                buffer += val;
            }
            continue;
        }
        break;
    }
    return buffer;
}

const userAgentMiddleware = (options) => (next, context) => async (args) => {
    const { request } = args;
    if (!protocols.HttpRequest.isInstance(request)) {
        return next(args);
    }
    const { headers } = request;
    const userAgent = context?.userAgent?.map(escapeUserAgent) || [];
    const defaultUserAgent = (await options.defaultUserAgentProvider()).map(escapeUserAgent);
    await checkFeatures(context, options, args);
    const awsContext = context;
    defaultUserAgent.push(`m/${encodeFeatures(Object.assign({}, context.__smithy_context?.features, awsContext.__aws_sdk_context?.features))}`);
    const customUserAgent = options?.customUserAgent?.map(escapeUserAgent) || [];
    const appId = await options.userAgentAppId();
    if (appId) {
        defaultUserAgent.push(escapeUserAgent([`app`, `${appId}`]));
    }
    const prefix = getUserAgentPrefix();
    const sdkUserAgentValue = (prefix ? [prefix] : [])
        .concat([...defaultUserAgent, ...userAgent, ...customUserAgent])
        .join(SPACE);
    const normalUAValue = [
        ...defaultUserAgent.filter((section) => section.startsWith("aws-sdk-")),
        ...customUserAgent,
    ].join(SPACE);
    if (options.runtime !== "browser") {
        if (normalUAValue) {
            headers[X_AMZ_USER_AGENT] = headers[X_AMZ_USER_AGENT]
                ? `${headers[USER_AGENT]} ${normalUAValue}`
                : normalUAValue;
        }
        headers[USER_AGENT] = sdkUserAgentValue;
    }
    else {
        headers[X_AMZ_USER_AGENT] = sdkUserAgentValue;
    }
    return next({
        ...args,
        request,
    });
};
const escapeUserAgent = (userAgentPair) => {
    const name = userAgentPair[0]
        .split(UA_NAME_SEPARATOR)
        .map((part) => part.replace(UA_NAME_ESCAPE_REGEX, UA_ESCAPE_CHAR))
        .join(UA_NAME_SEPARATOR);
    const version = userAgentPair[1]?.replace(UA_VALUE_ESCAPE_REGEX, UA_ESCAPE_CHAR);
    const prefixSeparatorIndex = name.indexOf(UA_NAME_SEPARATOR);
    const prefix = name.substring(0, prefixSeparatorIndex);
    let uaName = name.substring(prefixSeparatorIndex + 1);
    if (prefix === "api") {
        uaName = uaName.toLowerCase();
    }
    return [prefix, uaName, version]
        .filter((item) => item && item.length > 0)
        .reduce((acc, item, index) => {
        switch (index) {
            case 0:
                return item;
            case 1:
                return `${acc}/${item}`;
            default:
                return `${acc}#${item}`;
        }
    }, "");
};
const getUserAgentMiddlewareOptions = {
    name: "getUserAgentMiddleware",
    step: "build",
    priority: "low",
    tags: ["SET_USER_AGENT", "USER_AGENT"],
    override: true,
};
const getUserAgentPlugin = (config) => ({
    applyToStack: (clientStack) => {
        clientStack.add(userAgentMiddleware(config), getUserAgentMiddlewareOptions);
    },
});

const getRuntimeUserAgentPair = () => {
    const runtimesToCheck = ["deno", "bun", "llrt"];
    for (const runtime of runtimesToCheck) {
        if (node_process.versions[runtime]) {
            return [`md/${runtime}`, node_process.versions[runtime]];
        }
    }
    return ["md/nodejs", node_process.versions.node];
};

const getNodeModulesParentDirs = (dirname) => {
    const cwd = process.cwd();
    if (!dirname) {
        return [cwd];
    }
    const normalizedPath = node_path.normalize(dirname);
    const parts = normalizedPath.split(node_path.sep);
    const nodeModulesIndex = parts.indexOf("node_modules");
    const parentDir = nodeModulesIndex !== -1 ? parts.slice(0, nodeModulesIndex).join(node_path.sep) : normalizedPath;
    if (cwd === parentDir) {
        return [cwd];
    }
    return [parentDir, cwd];
};

const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/;
const getSanitizedTypeScriptVersion = (version = "") => {
    const match = version.match(SEMVER_REGEX);
    if (!match) {
        return undefined;
    }
    const [major, minor, patch, prerelease] = [match[1], match[2], match[3], match[4]];
    return prerelease ? `${major}.${minor}.${patch}-${prerelease}` : `${major}.${minor}.${patch}`;
};

const ALLOWED_PREFIXES = ["^", "~", ">=", "<=", ">", "<"];
const ALLOWED_DIST_TAGS = ["latest", "beta", "dev", "rc", "insiders", "next"];
const getSanitizedDevTypeScriptVersion = (version = "") => {
    if (ALLOWED_DIST_TAGS.includes(version)) {
        return version;
    }
    const prefix = ALLOWED_PREFIXES.find((p) => version.startsWith(p)) ?? "";
    const sanitizedTypeScriptVersion = getSanitizedTypeScriptVersion(version.slice(prefix.length));
    if (!sanitizedTypeScriptVersion) {
        return undefined;
    }
    return `${prefix}${sanitizedTypeScriptVersion}`;
};

let tscVersion;
const TS_PACKAGE_JSON = node_path.join("node_modules", "typescript", "package.json");
const getTypeScriptUserAgentPair = async () => {
    if (tscVersion === null) {
        return undefined;
    }
    else if (typeof tscVersion === "string") {
        return ["md/tsc", tscVersion];
    }
    let isTypeScriptDetectionDisabled = false;
    try {
        isTypeScriptDetectionDisabled =
            config.booleanSelector(process.env, "AWS_SDK_JS_TYPESCRIPT_DETECTION_DISABLED", config.SelectorType.ENV) || false;
    }
    catch { }
    if (isTypeScriptDetectionDisabled) {
        tscVersion = null;
        return undefined;
    }
    const dirname = typeof __dirname !== "undefined" ? __dirname : undefined;
    const nodeModulesParentDirs = getNodeModulesParentDirs(dirname);
    let versionFromApp;
    for (const nodeModulesParentDir of nodeModulesParentDirs) {
        try {
            const appPackageJsonPath = node_path.join(nodeModulesParentDir, "package.json");
            const packageJson = await promises.readFile(appPackageJsonPath, "utf-8");
            const { dependencies, devDependencies } = JSON.parse(packageJson);
            const version = devDependencies?.typescript ?? dependencies?.typescript;
            if (typeof version !== "string") {
                continue;
            }
            versionFromApp = version;
            break;
        }
        catch {
        }
    }
    if (!versionFromApp) {
        tscVersion = null;
        return undefined;
    }
    let versionFromNodeModules;
    for (const nodeModulesParentDir of nodeModulesParentDirs) {
        try {
            const tsPackageJsonPath = node_path.join(nodeModulesParentDir, TS_PACKAGE_JSON);
            const packageJson = await promises.readFile(tsPackageJsonPath, "utf-8");
            const { version } = JSON.parse(packageJson);
            const sanitizedVersion = getSanitizedTypeScriptVersion(version);
            if (typeof sanitizedVersion !== "string") {
                continue;
            }
            versionFromNodeModules = sanitizedVersion;
            break;
        }
        catch {
        }
    }
    if (versionFromNodeModules) {
        tscVersion = versionFromNodeModules;
        return ["md/tsc", tscVersion];
    }
    const sanitizedVersion = getSanitizedDevTypeScriptVersion(versionFromApp);
    if (typeof sanitizedVersion !== "string") {
        tscVersion = null;
        return undefined;
    }
    tscVersion = `dev_${sanitizedVersion}`;
    return ["md/tsc", tscVersion];
};

const crtAvailability = {
    isCrtAvailable: false,
};

const isCrtAvailable = () => {
    if (crtAvailability.isCrtAvailable) {
        return ["md/crt-avail"];
    }
    return null;
};

const createDefaultUserAgentProvider = ({ serviceId, clientVersion }) => {
    const runtimeUserAgentPair = getRuntimeUserAgentPair();
    return async (config) => {
        const sections = [
            ["aws-sdk-js", clientVersion],
            ["ua", "2.1"],
            [`os/${node_os.platform()}`, node_os.release()],
            ["lang/js"],
            runtimeUserAgentPair,
        ];
        const typescriptUserAgentPair = await getTypeScriptUserAgentPair();
        if (typescriptUserAgentPair) {
            sections.push(typescriptUserAgentPair);
        }
        const crtAvailable = isCrtAvailable();
        if (crtAvailable) {
            sections.push(crtAvailable);
        }
        if (serviceId) {
            sections.push([`api/${serviceId}`, clientVersion]);
        }
        if (node_process.env.AWS_EXECUTION_ENV) {
            sections.push([`exec-env/${node_process.env.AWS_EXECUTION_ENV}`]);
        }
        const appId = await config?.userAgentAppId?.();
        const resolvedUserAgent = appId ? [...sections, [`app/${appId}`]] : [...sections];
        return resolvedUserAgent;
    };
};
const defaultUserAgent = createDefaultUserAgentProvider;

const UA_APP_ID_ENV_NAME = "AWS_SDK_UA_APP_ID";
const UA_APP_ID_INI_NAME = "sdk_ua_app_id";
const UA_APP_ID_INI_NAME_DEPRECATED = "sdk-ua-app-id";
const NODE_APP_ID_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => env[UA_APP_ID_ENV_NAME],
    configFileSelector: (profile) => profile[UA_APP_ID_INI_NAME] ?? profile[UA_APP_ID_INI_NAME_DEPRECATED],
    default: DEFAULT_UA_APP_ID,
};

const createUserAgentStringParsingProvider = ({ serviceId, clientVersion }) => async (config) => {
    const module = await __webpack_require__.e(/* import() */ 458).then(__webpack_require__.t.bind(__webpack_require__, 97458, 23));
    const parse = module.parse ?? module.default.parse ?? (() => "");
    const parsedUA = typeof window !== "undefined" && window?.navigator?.userAgent ? parse(window.navigator.userAgent) : undefined;
    const sections = [
        ["aws-sdk-js", clientVersion],
        ["ua", "2.1"],
        [`os/${parsedUA?.os?.name || "other"}`, parsedUA?.os?.version],
        ["lang/js"],
        ["md/browser", `${parsedUA?.browser?.name ?? "unknown"}_${parsedUA?.browser?.version ?? "unknown"}`],
    ];
    if (serviceId) {
        sections.push([`api/${serviceId}`, clientVersion]);
    }
    const appId = await config?.userAgentAppId?.();
    if (appId) {
        sections.push([`app/${appId}`]);
    }
    return sections;
};

const fallback = {
    os(ua) {
        if (/iPhone|iPad|iPod/.test(ua))
            return "iOS";
        if (/Macintosh|Mac OS X/.test(ua))
            return "macOS";
        if (/Windows NT/.test(ua))
            return "Windows";
        if (/Android/.test(ua))
            return "Android";
        if (/Linux/.test(ua))
            return "Linux";
        return undefined;
    },
    browser(ua) {
        if (/EdgiOS|EdgA|Edg\//.test(ua))
            return "Microsoft Edge";
        if (/Firefox\//.test(ua))
            return "Firefox";
        if (/Chrome\//.test(ua))
            return "Chrome";
        if (/Safari\//.test(ua))
            return "Safari";
        return undefined;
    },
};

const isVirtualHostableS3Bucket = (value, allowSubDomains = false) => {
    if (allowSubDomains) {
        for (const label of value.split(".")) {
            if (!isVirtualHostableS3Bucket(label)) {
                return false;
            }
        }
        return true;
    }
    if (!endpoints.isValidHostLabel(value)) {
        return false;
    }
    if (value.length < 3 || value.length > 63) {
        return false;
    }
    if (value !== value.toLowerCase()) {
        return false;
    }
    if (endpoints.isIpAddress(value)) {
        return false;
    }
    return true;
};

const ARN_DELIMITER = ":";
const RESOURCE_DELIMITER = "/";
const parseArn = (value) => {
    const segments = value.split(ARN_DELIMITER);
    if (segments.length < 6)
        return null;
    const [arn, partition, service, region, accountId, ...resourcePath] = segments;
    if (arn !== "arn" || partition === "" || service === "" || resourcePath.join(ARN_DELIMITER) === "")
        return null;
    const resourceId = resourcePath.map((resource) => resource.split(RESOURCE_DELIMITER)).flat();
    return {
        partition,
        service,
        region,
        accountId,
        resourceId,
    };
};

const awsEndpointFunctions = {
    isVirtualHostableS3Bucket: isVirtualHostableS3Bucket,
    parseArn: parseArn,
    partition: partition,
};
endpoints.customEndpointFunctions.aws = awsEndpointFunctions;

const resolveDefaultAwsRegionalEndpointsConfig = (input) => {
    if (typeof input.endpointProvider !== "function") {
        throw new Error("@aws-sdk/util-endpoint - endpointProvider and endpoint missing in config for this client.");
    }
    const { endpoint } = input;
    if (endpoint === undefined) {
        input.endpoint = async () => {
            return toEndpointV1(input.endpointProvider({
                Region: typeof input.region === "function" ? await input.region() : input.region,
                UseDualStack: typeof input.useDualstackEndpoint === "function"
                    ? await input.useDualstackEndpoint()
                    : input.useDualstackEndpoint,
                UseFIPS: typeof input.useFipsEndpoint === "function" ? await input.useFipsEndpoint() : input.useFipsEndpoint,
                Endpoint: undefined,
            }, { logger: input.logger }));
        };
    }
    return input;
};
const toEndpointV1 = (endpoint) => protocols.parseUrl(endpoint.url);

function stsRegionDefaultResolver(loaderConfig = {}) {
    return config.loadConfig({
        ...config.NODE_REGION_CONFIG_OPTIONS,
        async default() {
            if (!warning.silence) {
                console.warn("@aws-sdk - WARN - default STS region of us-east-1 used. See @aws-sdk/credential-providers README and set a region explicitly.");
            }
            return "us-east-1";
        },
    }, { ...config.NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig });
}
const warning = {
    silence: false,
};

const getAwsRegionExtensionConfiguration = (runtimeConfig) => {
    return {
        setRegion(region) {
            runtimeConfig.region = region;
        },
        region() {
            return runtimeConfig.region;
        },
    };
};
const resolveAwsRegionExtensionConfiguration = (awsRegionExtensionConfiguration) => {
    return {
        region: awsRegionExtensionConfiguration.region(),
    };
};

exports.NODE_REGION_CONFIG_FILE_OPTIONS = config.NODE_REGION_CONFIG_FILE_OPTIONS;
exports.NODE_REGION_CONFIG_OPTIONS = config.NODE_REGION_CONFIG_OPTIONS;
exports.REGION_ENV_NAME = config.REGION_ENV_NAME;
exports.REGION_INI_NAME = config.REGION_INI_NAME;
exports.resolveRegionConfig = config.resolveRegionConfig;
exports.EndpointError = endpoints.EndpointError;
exports.isIpAddress = endpoints.isIpAddress;
exports.resolveEndpoint = endpoints.resolveEndpoint;
exports.DEFAULT_UA_APP_ID = DEFAULT_UA_APP_ID;
exports.NODE_APP_ID_CONFIG_OPTIONS = NODE_APP_ID_CONFIG_OPTIONS;
exports.UA_APP_ID_ENV_NAME = UA_APP_ID_ENV_NAME;
exports.UA_APP_ID_INI_NAME = UA_APP_ID_INI_NAME;
exports.awsEndpointFunctions = awsEndpointFunctions;
exports.createDefaultUserAgentProvider = createDefaultUserAgentProvider;
exports.createUserAgentStringParsingProvider = createUserAgentStringParsingProvider;
exports.crtAvailability = crtAvailability;
exports.defaultUserAgent = defaultUserAgent;
exports.emitWarningIfUnsupportedVersion = emitWarningIfUnsupportedVersion;
exports.fallback = fallback;
exports.getAwsRegionExtensionConfiguration = getAwsRegionExtensionConfiguration;
exports.getHostHeaderPlugin = getHostHeaderPlugin;
exports.getLoggerPlugin = getLoggerPlugin;
exports.getLongPollPlugin = getLongPollPlugin;
exports.getRecursionDetectionPlugin = getRecursionDetectionPlugin;
exports.getUserAgentMiddlewareOptions = getUserAgentMiddlewareOptions;
exports.getUserAgentPlugin = getUserAgentPlugin;
exports.getUserAgentPrefix = getUserAgentPrefix;
exports.hostHeaderMiddleware = hostHeaderMiddleware;
exports.hostHeaderMiddlewareOptions = hostHeaderMiddlewareOptions;
exports.isVirtualHostableS3Bucket = isVirtualHostableS3Bucket;
exports.loggerMiddleware = loggerMiddleware;
exports.loggerMiddlewareOptions = loggerMiddlewareOptions;
exports.parseArn = parseArn;
exports.partition = partition;
exports.recursionDetectionMiddleware = recursionDetectionMiddleware;
exports.recursionDetectionMiddlewareOptions = recursionDetectionMiddlewareOptions;
exports.resolveAwsRegionExtensionConfiguration = resolveAwsRegionExtensionConfiguration;
exports.resolveDefaultAwsRegionalEndpointsConfig = resolveDefaultAwsRegionalEndpointsConfig;
exports.resolveHostHeaderConfig = resolveHostHeaderConfig;
exports.resolveUserAgentConfig = resolveUserAgentConfig;
exports.setCredentialFeature = setCredentialFeature;
exports.setFeature = setFeature;
exports.setPartitionInfo = setPartitionInfo;
exports.setTokenFeature = setTokenFeature;
exports.state = state;
exports.stsRegionDefaultResolver = stsRegionDefaultResolver;
exports.stsRegionWarning = warning;
exports.toEndpointV1 = toEndpointV1;
exports.useDefaultPartitionInfo = useDefaultPartitionInfo;
exports.userAgentMiddleware = userAgentMiddleware;


/***/ }),

/***/ 65741:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var protocols = __webpack_require__(45598);
var core = __webpack_require__(86578);
var config = __webpack_require__(99659);
var client = __webpack_require__(77186);
var signatureV4 = __webpack_require__(51342);

const getDateHeader = (response) => protocols.HttpResponse.isInstance(response) ? response.headers?.date ?? response.headers?.Date : undefined;

const getSkewCorrectedDate = (systemClockOffset) => new Date(Date.now() + systemClockOffset);

const isClockSkewed = (clockTime, systemClockOffset) => Math.abs(getSkewCorrectedDate(systemClockOffset).getTime() - clockTime) >= 300000;

const getUpdatedSystemClockOffset = (clockTime, currentSystemClockOffset) => {
    const clockTimeInMs = Date.parse(clockTime);
    if (isClockSkewed(clockTimeInMs, currentSystemClockOffset)) {
        return clockTimeInMs - Date.now();
    }
    return currentSystemClockOffset;
};

const throwSigningPropertyError = (name, property) => {
    if (!property) {
        throw new Error(`Property \`${name}\` is not resolved for AWS SDK SigV4Auth`);
    }
    return property;
};
const validateSigningProperties = async (signingProperties) => {
    const context = throwSigningPropertyError("context", signingProperties.context);
    const config = throwSigningPropertyError("config", signingProperties.config);
    const authScheme = context.endpointV2?.properties?.authSchemes?.[0];
    const signerFunction = throwSigningPropertyError("signer", config.signer);
    const signer = await signerFunction(authScheme);
    const signingRegion = signingProperties?.signingRegion;
    const signingRegionSet = signingProperties?.signingRegionSet;
    const signingName = signingProperties?.signingName;
    return {
        config,
        signer,
        signingRegion,
        signingRegionSet,
        signingName,
    };
};
class AwsSdkSigV4Signer {
    async sign(httpRequest, identity, signingProperties) {
        if (!protocols.HttpRequest.isInstance(httpRequest)) {
            throw new Error("The request is not an instance of `HttpRequest` and cannot be signed");
        }
        const validatedProps = await validateSigningProperties(signingProperties);
        const { config, signer } = validatedProps;
        let { signingRegion, signingName } = validatedProps;
        const handlerExecutionContext = signingProperties.context;
        if (handlerExecutionContext?.authSchemes?.length ?? 0 > 1) {
            const [first, second] = handlerExecutionContext.authSchemes;
            if (first?.name === "sigv4a" && second?.name === "sigv4") {
                signingRegion = second?.signingRegion ?? signingRegion;
                signingName = second?.signingName ?? signingName;
            }
        }
        const signedRequest = await signer.sign(httpRequest, {
            signingDate: getSkewCorrectedDate(config.systemClockOffset),
            signingRegion: signingRegion,
            signingService: signingName,
        });
        return signedRequest;
    }
    errorHandler(signingProperties) {
        return (error) => {
            const serverTime = error.ServerTime ?? getDateHeader(error.$response);
            if (serverTime) {
                const config = throwSigningPropertyError("config", signingProperties.config);
                const initialSystemClockOffset = config.systemClockOffset;
                config.systemClockOffset = getUpdatedSystemClockOffset(serverTime, config.systemClockOffset);
                const clockSkewCorrected = config.systemClockOffset !== initialSystemClockOffset;
                if (clockSkewCorrected && error.$metadata) {
                    error.$metadata.clockSkewCorrected = true;
                }
            }
            throw error;
        };
    }
    successHandler(httpResponse, signingProperties) {
        const dateHeader = getDateHeader(httpResponse);
        if (dateHeader) {
            const config = throwSigningPropertyError("config", signingProperties.config);
            config.systemClockOffset = getUpdatedSystemClockOffset(dateHeader, config.systemClockOffset);
        }
    }
}
const AWSSDKSigV4Signer = AwsSdkSigV4Signer;

class AwsSdkSigV4ASigner extends AwsSdkSigV4Signer {
    async sign(httpRequest, identity, signingProperties) {
        if (!protocols.HttpRequest.isInstance(httpRequest)) {
            throw new Error("The request is not an instance of `HttpRequest` and cannot be signed");
        }
        const { config, signer, signingRegion, signingRegionSet, signingName } = await validateSigningProperties(signingProperties);
        const configResolvedSigningRegionSet = await config.sigv4aSigningRegionSet?.();
        const multiRegionOverride = (configResolvedSigningRegionSet ??
            signingRegionSet ?? [signingRegion]).join(",");
        const signedRequest = await signer.sign(httpRequest, {
            signingDate: getSkewCorrectedDate(config.systemClockOffset),
            signingRegion: multiRegionOverride,
            signingService: signingName,
        });
        return signedRequest;
    }
}

const getArrayForCommaSeparatedString = (str) => typeof str === "string" && str.length > 0 ? str.split(",").map((item) => item.trim()) : [];

const getBearerTokenEnvKey = (signingName) => `AWS_BEARER_TOKEN_${signingName.replace(/[\s-]/g, "_").toUpperCase()}`;

const NODE_AUTH_SCHEME_PREFERENCE_ENV_KEY = "AWS_AUTH_SCHEME_PREFERENCE";
const NODE_AUTH_SCHEME_PREFERENCE_CONFIG_KEY = "auth_scheme_preference";
const NODE_AUTH_SCHEME_PREFERENCE_OPTIONS = {
    environmentVariableSelector: (env, options) => {
        if (options?.signingName) {
            const bearerTokenKey = getBearerTokenEnvKey(options.signingName);
            if (bearerTokenKey in env)
                return ["httpBearerAuth"];
        }
        if (!(NODE_AUTH_SCHEME_PREFERENCE_ENV_KEY in env))
            return undefined;
        return getArrayForCommaSeparatedString(env[NODE_AUTH_SCHEME_PREFERENCE_ENV_KEY]);
    },
    configFileSelector: (profile) => {
        if (!(NODE_AUTH_SCHEME_PREFERENCE_CONFIG_KEY in profile))
            return undefined;
        return getArrayForCommaSeparatedString(profile[NODE_AUTH_SCHEME_PREFERENCE_CONFIG_KEY]);
    },
    default: [],
};

const resolveAwsSdkSigV4AConfig = (config) => {
    config.sigv4aSigningRegionSet = core.normalizeProvider(config.sigv4aSigningRegionSet);
    return config;
};
const NODE_SIGV4A_CONFIG_OPTIONS = {
    environmentVariableSelector(env) {
        if (env.AWS_SIGV4A_SIGNING_REGION_SET) {
            return env.AWS_SIGV4A_SIGNING_REGION_SET.split(",").map((_) => _.trim());
        }
        throw new config.ProviderError("AWS_SIGV4A_SIGNING_REGION_SET not set in env.", {
            tryNextLink: true,
        });
    },
    configFileSelector(profile) {
        if (profile.sigv4a_signing_region_set) {
            return (profile.sigv4a_signing_region_set ?? "").split(",").map((_) => _.trim());
        }
        throw new config.ProviderError("sigv4a_signing_region_set not set in profile.", {
            tryNextLink: true,
        });
    },
    default: undefined,
};

const resolveAwsSdkSigV4Config = (config) => {
    let inputCredentials = config.credentials;
    let isUserSupplied = !!config.credentials;
    let resolvedCredentials = undefined;
    Object.defineProperty(config, "credentials", {
        set(credentials) {
            if (credentials && credentials !== inputCredentials && credentials !== resolvedCredentials) {
                isUserSupplied = true;
            }
            inputCredentials = credentials;
            const memoizedProvider = normalizeCredentialProvider(config, {
                credentials: inputCredentials,
                credentialDefaultProvider: config.credentialDefaultProvider,
            });
            const boundProvider = bindCallerConfig(config, memoizedProvider);
            if (isUserSupplied && !boundProvider.attributed) {
                const isCredentialObject = typeof inputCredentials === "object" && inputCredentials !== null;
                resolvedCredentials = async (options) => {
                    const creds = await boundProvider(options);
                    const attributedCreds = creds;
                    if (isCredentialObject && (!attributedCreds.$source || Object.keys(attributedCreds.$source).length === 0)) {
                        return client.setCredentialFeature(attributedCreds, "CREDENTIALS_CODE", "e");
                    }
                    return attributedCreds;
                };
                resolvedCredentials.memoized = boundProvider.memoized;
                resolvedCredentials.configBound = boundProvider.configBound;
                resolvedCredentials.attributed = true;
            }
            else {
                resolvedCredentials = boundProvider;
            }
        },
        get() {
            return resolvedCredentials;
        },
        enumerable: true,
        configurable: true,
    });
    config.credentials = inputCredentials;
    const { signingEscapePath = true, systemClockOffset = config.systemClockOffset || 0, sha256, } = config;
    let signer;
    if (config.signer) {
        signer = core.normalizeProvider(config.signer);
    }
    else if (config.regionInfoProvider) {
        signer = () => core.normalizeProvider(config.region)()
            .then(async (region) => [
            (await config.regionInfoProvider(region, {
                useFipsEndpoint: await config.useFipsEndpoint(),
                useDualstackEndpoint: await config.useDualstackEndpoint(),
            })) || {},
            region,
        ])
            .then(([regionInfo, region]) => {
            const { signingRegion, signingService } = regionInfo;
            config.signingRegion = config.signingRegion || signingRegion || region;
            config.signingName = config.signingName || signingService || config.serviceId;
            const params = {
                ...config,
                credentials: config.credentials,
                region: config.signingRegion,
                service: config.signingName,
                sha256,
                uriEscapePath: signingEscapePath,
            };
            const SignerCtor = config.signerConstructor || signatureV4.SignatureV4;
            return new SignerCtor(params);
        });
    }
    else {
        signer = async (authScheme) => {
            authScheme = Object.assign({}, {
                name: "sigv4",
                signingName: config.signingName || config.defaultSigningName,
                signingRegion: await core.normalizeProvider(config.region)(),
                properties: {},
            }, authScheme);
            const signingRegion = authScheme.signingRegion;
            const signingService = authScheme.signingName;
            config.signingRegion = config.signingRegion || signingRegion;
            config.signingName = config.signingName || signingService || config.serviceId;
            const params = {
                ...config,
                credentials: config.credentials,
                region: config.signingRegion,
                service: config.signingName,
                sha256,
                uriEscapePath: signingEscapePath,
            };
            const SignerCtor = config.signerConstructor || signatureV4.SignatureV4;
            return new SignerCtor(params);
        };
    }
    const resolvedConfig = Object.assign(config, {
        systemClockOffset,
        signingEscapePath,
        signer,
    });
    return resolvedConfig;
};
const resolveAWSSDKSigV4Config = resolveAwsSdkSigV4Config;
function normalizeCredentialProvider(config, { credentials, credentialDefaultProvider, }) {
    let credentialsProvider;
    if (credentials) {
        if (!credentials?.memoized) {
            credentialsProvider = core.memoizeIdentityProvider(credentials, core.isIdentityExpired, core.doesIdentityRequireRefresh);
        }
        else {
            credentialsProvider = credentials;
        }
    }
    else {
        if (credentialDefaultProvider) {
            credentialsProvider = core.normalizeProvider(credentialDefaultProvider(Object.assign({}, config, {
                parentClientConfig: config,
            })));
        }
        else {
            credentialsProvider = async () => {
                throw new Error("@aws-sdk/core::resolveAwsSdkSigV4Config - `credentials` not provided and no credentialDefaultProvider was configured.");
            };
        }
    }
    credentialsProvider.memoized = true;
    return credentialsProvider;
}
function bindCallerConfig(config, credentialsProvider) {
    if (credentialsProvider.configBound) {
        return credentialsProvider;
    }
    const fn = async (options) => credentialsProvider({ ...options, callerClientConfig: config });
    fn.memoized = credentialsProvider.memoized;
    fn.configBound = true;
    return fn;
}

exports.AWSSDKSigV4Signer = AWSSDKSigV4Signer;
exports.AwsSdkSigV4ASigner = AwsSdkSigV4ASigner;
exports.AwsSdkSigV4Signer = AwsSdkSigV4Signer;
exports.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS = NODE_AUTH_SCHEME_PREFERENCE_OPTIONS;
exports.NODE_SIGV4A_CONFIG_OPTIONS = NODE_SIGV4A_CONFIG_OPTIONS;
exports.getBearerTokenEnvKey = getBearerTokenEnvKey;
exports.resolveAWSSDKSigV4Config = resolveAWSSDKSigV4Config;
exports.resolveAwsSdkSigV4AConfig = resolveAwsSdkSigV4AConfig;
exports.resolveAwsSdkSigV4Config = resolveAwsSdkSigV4Config;
exports.validateSigningProperties = validateSigningProperties;


/***/ }),

/***/ 78206:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var cbor = __webpack_require__(56949);
var schema = __webpack_require__(95258);
var client = __webpack_require__(63234);
var protocols = __webpack_require__(45598);
var serde = __webpack_require__(38622);
var xmlBuilder = __webpack_require__(30597);

class ProtocolLib {
    queryCompat;
    errorRegistry;
    constructor(queryCompat = false) {
        this.queryCompat = queryCompat;
    }
    resolveRestContentType(defaultContentType, inputSchema) {
        const members = inputSchema.getMemberSchemas();
        const httpPayloadMember = Object.values(members).find((m) => {
            return !!m.getMergedTraits().httpPayload;
        });
        if (httpPayloadMember) {
            const mediaType = httpPayloadMember.getMergedTraits().mediaType;
            if (mediaType) {
                return mediaType;
            }
            else if (httpPayloadMember.isStringSchema()) {
                return "text/plain";
            }
            else if (httpPayloadMember.isBlobSchema()) {
                return "application/octet-stream";
            }
            else {
                return defaultContentType;
            }
        }
        else if (!inputSchema.isUnitSchema()) {
            const hasBody = Object.values(members).find((m) => {
                const { httpQuery, httpQueryParams, httpHeader, httpLabel, httpPrefixHeaders } = m.getMergedTraits();
                const noPrefixHeaders = httpPrefixHeaders === void 0;
                return !httpQuery && !httpQueryParams && !httpHeader && !httpLabel && noPrefixHeaders;
            });
            if (hasBody) {
                return defaultContentType;
            }
        }
    }
    async getErrorSchemaOrThrowBaseException(errorIdentifier, defaultNamespace, response, dataObject, metadata, getErrorSchema) {
        let errorName = errorIdentifier;
        if (errorIdentifier.includes("#")) {
            [, errorName] = errorIdentifier.split("#");
        }
        const errorMetadata = {
            $metadata: metadata,
            $fault: response.statusCode < 500 ? "client" : "server",
        };
        if (!this.errorRegistry) {
            throw new Error("@aws-sdk/core/protocols - error handler not initialized.");
        }
        try {
            const errorSchema = getErrorSchema?.(this.errorRegistry, errorName) ??
                this.errorRegistry.getSchema(errorIdentifier);
            return { errorSchema, errorMetadata };
        }
        catch (e) {
            dataObject.message = dataObject.message ?? dataObject.Message ?? "UnknownError";
            const synthetic = this.errorRegistry;
            const baseExceptionSchema = synthetic.getBaseException();
            if (baseExceptionSchema) {
                const ErrorCtor = synthetic.getErrorCtor(baseExceptionSchema) ?? Error;
                throw this.decorateServiceException(Object.assign(new ErrorCtor({ name: errorName }), errorMetadata), dataObject);
            }
            const d = dataObject;
            const message = d?.message ?? d?.Message ?? d?.Error?.Message ?? d?.Error?.message;
            throw this.decorateServiceException(Object.assign(new Error(message), {
                name: errorName,
            }, errorMetadata), dataObject);
        }
    }
    compose(composite, errorIdentifier, defaultNamespace) {
        let namespace = defaultNamespace;
        if (errorIdentifier.includes("#")) {
            [namespace] = errorIdentifier.split("#");
        }
        const staticRegistry = schema.TypeRegistry.for(namespace);
        const defaultSyntheticRegistry = schema.TypeRegistry.for("smithy.ts.sdk.synthetic." + defaultNamespace);
        composite.copyFrom(staticRegistry);
        composite.copyFrom(defaultSyntheticRegistry);
        this.errorRegistry = composite;
    }
    decorateServiceException(exception, additions = {}) {
        if (this.queryCompat) {
            const msg = exception.Message ?? additions.Message;
            const error = client.decorateServiceException(exception, additions);
            if (msg) {
                error.message = msg;
            }
            const errorObj = error.Error ?? {};
            errorObj.Type = error.Error?.Type;
            errorObj.Code = error.Error?.Code;
            errorObj.Message = error.Error?.message ?? error.Error?.Message ?? msg;
            error.Error = errorObj;
            const reqId = error.$metadata.requestId;
            if (reqId) {
                error.RequestId = reqId;
            }
            return error;
        }
        return client.decorateServiceException(exception, additions);
    }
    setQueryCompatError(output, response) {
        const queryErrorHeader = response.headers?.["x-amzn-query-error"];
        if (output !== undefined && queryErrorHeader != null) {
            const [Code, Type] = queryErrorHeader.split(";");
            const keys = Object.keys(output);
            const Error = {
                Code,
                Type,
            };
            output.Code = Code;
            output.Type = Type;
            for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                Error[k === "message" ? "Message" : k] = output[k];
            }
            delete Error.__type;
            output.Error = Error;
        }
    }
    queryCompatOutput(queryCompatErrorData, errorData) {
        if (queryCompatErrorData.Error) {
            errorData.Error = queryCompatErrorData.Error;
        }
        if (queryCompatErrorData.Type) {
            errorData.Type = queryCompatErrorData.Type;
        }
        if (queryCompatErrorData.Code) {
            errorData.Code = queryCompatErrorData.Code;
        }
    }
    findQueryCompatibleError(registry, errorName) {
        try {
            return registry.getSchema(errorName);
        }
        catch (e) {
            return registry.find((schema$1) => schema.NormalizedSchema.of(schema$1).getMergedTraits().awsQueryError?.[0] === errorName);
        }
    }
}

class AwsSmithyRpcV2CborProtocol extends cbor.SmithyRpcV2CborProtocol {
    awsQueryCompatible;
    mixin;
    constructor({ defaultNamespace, errorTypeRegistries, awsQueryCompatible, }) {
        super({ defaultNamespace, errorTypeRegistries });
        this.awsQueryCompatible = !!awsQueryCompatible;
        this.mixin = new ProtocolLib(this.awsQueryCompatible);
    }
    async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        if (this.awsQueryCompatible) {
            request.headers["x-amzn-query-mode"] = "true";
        }
        return request;
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
        if (this.awsQueryCompatible) {
            this.mixin.setQueryCompatError(dataObject, response);
        }
        const errorName = (() => {
            const compatHeader = response.headers["x-amzn-query-error"];
            if (compatHeader && this.awsQueryCompatible) {
                return compatHeader.split(";")[0];
            }
            return cbor.loadSmithyRpcV2CborErrorCode(response, dataObject) ?? "Unknown";
        })();
        this.mixin.compose(this.compositeErrorRegistry, errorName, this.options.defaultNamespace);
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorName, this.options.defaultNamespace, response, dataObject, metadata, this.awsQueryCompatible ? this.mixin.findQueryCompatibleError : undefined);
        const ns = schema.NormalizedSchema.of(errorSchema);
        const message = dataObject.message ?? dataObject.Message ?? "UnknownError";
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor({});
        const output = {};
        for (const [name, member] of ns.structIterator()) {
            if (dataObject[name] != null) {
                output[name] = this.deserializer.readValue(member, dataObject[name]);
            }
        }
        if (this.awsQueryCompatible) {
            this.mixin.queryCompatOutput(dataObject, output);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
            $fault: ns.getMergedTraits().error,
            message,
        }, output), dataObject);
    }
}

const _toStr = (val) => {
    if (val == null) {
        return val;
    }
    if (typeof val === "number" || typeof val === "bigint") {
        const warning = new Error(`Received number ${val} where a string was expected.`);
        warning.name = "Warning";
        console.warn(warning);
        return String(val);
    }
    if (typeof val === "boolean") {
        const warning = new Error(`Received boolean ${val} where a string was expected.`);
        warning.name = "Warning";
        console.warn(warning);
        return String(val);
    }
    return val;
};
const _toBool = (val) => {
    if (val == null) {
        return val;
    }
    if (typeof val === "string") {
        const lowercase = val.toLowerCase();
        if (val !== "" && lowercase !== "false" && lowercase !== "true") {
            const warning = new Error(`Received string "${val}" where a boolean was expected.`);
            warning.name = "Warning";
            console.warn(warning);
        }
        return val !== "" && lowercase !== "false";
    }
    return val;
};
const _toNum = (val) => {
    if (val == null) {
        return val;
    }
    if (typeof val === "string") {
        const num = Number(val);
        if (num.toString() !== val) {
            const warning = new Error(`Received string "${val}" where a number was expected.`);
            warning.name = "Warning";
            console.warn(warning);
            return val;
        }
        return num;
    }
    return val;
};

class SerdeContextConfig {
    serdeContext;
    setSerdeContext(serdeContext) {
        this.serdeContext = serdeContext;
    }
}

class UnionSerde {
    from;
    to;
    keys;
    constructor(from, to) {
        this.from = from;
        this.to = to;
        const keys = Object.keys(this.from);
        const set = new Set(keys);
        set.delete("__type");
        this.keys = set;
    }
    mark(key) {
        this.keys.delete(key);
    }
    hasUnknown() {
        return this.keys.size === 1 && Object.keys(this.to).length === 0;
    }
    writeUnknown() {
        if (this.hasUnknown()) {
            const k = this.keys.values().next().value;
            const v = this.from[k];
            this.to.$unknown = [k, v];
        }
    }
}

function jsonReviver(key, value, context) {
    if (context?.source) {
        const numericString = context.source;
        if (typeof value === "number") {
            if (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER || numericString !== String(value)) {
                const isFractional = numericString.includes(".");
                if (isFractional) {
                    return new serde.NumericValue(numericString, "bigDecimal");
                }
                else {
                    return BigInt(numericString);
                }
            }
        }
    }
    return value;
}

const collectBodyString = (streamBody, context) => protocols.collectBody(streamBody, context).then((body) => (context?.utf8Encoder ?? serde.toUtf8)(body));

const parseJsonBody = (streamBody, context) => collectBodyString(streamBody, context).then((encoded) => {
    if (encoded.length) {
        try {
            return JSON.parse(encoded);
        }
        catch (e) {
            if (e?.name === "SyntaxError") {
                Object.defineProperty(e, "$responseBodyText", {
                    value: encoded,
                });
            }
            throw e;
        }
    }
    return {};
});
const parseJsonErrorBody = async (errorBody, context) => {
    const value = await parseJsonBody(errorBody, context);
    value.message = value.message ?? value.Message;
    return value;
};
const findKey = (object, key) => Object.keys(object).find((k) => k.toLowerCase() === key.toLowerCase());
const sanitizeErrorCode = (rawValue) => {
    let cleanValue = rawValue;
    if (typeof cleanValue === "number") {
        cleanValue = cleanValue.toString();
    }
    if (cleanValue.indexOf(",") >= 0) {
        cleanValue = cleanValue.split(",")[0];
    }
    if (cleanValue.indexOf(":") >= 0) {
        cleanValue = cleanValue.split(":")[0];
    }
    if (cleanValue.indexOf("#") >= 0) {
        cleanValue = cleanValue.split("#")[1];
    }
    return cleanValue;
};
const loadRestJsonErrorCode = (output, data) => {
    return loadErrorCode(output, data, ["header", "code", "type"]);
};
const loadJsonRpcErrorCode = (output, data, queryCompat = false) => {
    return loadErrorCode(output, data, queryCompat ? ["code", "header", "type"] : ["type", "code", "header"]);
};
const loadErrorCode = ({ headers }, data, order) => {
    while (order.length > 0) {
        const location = order.shift();
        switch (location) {
            case "header":
                const headerKey = findKey(headers ?? {}, "x-amzn-errortype");
                if (headerKey !== undefined) {
                    return sanitizeErrorCode(headers[headerKey]);
                }
                break;
            case "code":
                const codeKey = findKey(data ?? {}, "code");
                if (codeKey && data[codeKey] !== undefined) {
                    return sanitizeErrorCode(data[codeKey]);
                }
                break;
            case "type":
                if (data?.__type !== undefined) {
                    return sanitizeErrorCode(data.__type);
                }
                break;
        }
    }
};

class JsonShapeDeserializer extends SerdeContextConfig {
    settings;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    async read(schema, data) {
        return this._read(schema, typeof data === "string" ? JSON.parse(data, jsonReviver) : await parseJsonBody(data, this.serdeContext));
    }
    readObject(schema, data) {
        return this._read(schema, data);
    }
    _read(schema$1, value) {
        const isObject = value !== null && typeof value === "object";
        const ns = schema.NormalizedSchema.of(schema$1);
        if (isObject) {
            if (ns.isStructSchema()) {
                const record = value;
                const union = ns.isUnionSchema();
                const out = {};
                let nameMap = void 0;
                const { jsonName } = this.settings;
                if (jsonName) {
                    nameMap = {};
                }
                let unionSerde;
                if (union) {
                    unionSerde = new UnionSerde(record, out);
                }
                for (const [memberName, memberSchema] of ns.structIterator()) {
                    let fromKey = memberName;
                    if (jsonName) {
                        fromKey = memberSchema.getMergedTraits().jsonName ?? fromKey;
                        nameMap[fromKey] = memberName;
                    }
                    if (union) {
                        unionSerde.mark(fromKey);
                    }
                    if (record[fromKey] != null) {
                        out[memberName] = this._read(memberSchema, record[fromKey]);
                    }
                }
                if (union) {
                    unionSerde.writeUnknown();
                }
                else if (typeof record.__type === "string") {
                    for (const k in record) {
                        const v = record[k];
                        const t = jsonName ? nameMap[k] ?? k : k;
                        if (!(t in out)) {
                            out[t] = v;
                        }
                    }
                }
                return out;
            }
            if (Array.isArray(value) && ns.isListSchema()) {
                const listMember = ns.getValueSchema();
                const out = [];
                for (const item of value) {
                    out.push(this._read(listMember, item));
                }
                return out;
            }
            if (ns.isMapSchema()) {
                const mapMember = ns.getValueSchema();
                const out = {};
                for (const _k in value) {
                    out[_k] = this._read(mapMember, value[_k]);
                }
                return out;
            }
        }
        if (ns.isBlobSchema() && typeof value === "string") {
            return serde.fromBase64(value);
        }
        const mediaType = ns.getMergedTraits().mediaType;
        if (ns.isStringSchema() && typeof value === "string" && mediaType) {
            const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
            if (isJson) {
                return serde.LazyJsonString.from(value);
            }
            return value;
        }
        if (ns.isTimestampSchema() && value != null) {
            const format = protocols.determineTimestampFormat(ns, this.settings);
            switch (format) {
                case 5:
                    return serde.parseRfc3339DateTimeWithOffset(value);
                case 6:
                    return serde.parseRfc7231DateTime(value);
                case 7:
                    return serde.parseEpochTimestamp(value);
                default:
                    console.warn("Missing timestamp format, parsing value with Date constructor:", value);
                    return new Date(value);
            }
        }
        if (ns.isBigIntegerSchema() && (typeof value === "number" || typeof value === "string")) {
            return BigInt(value);
        }
        if (ns.isBigDecimalSchema() && value != undefined) {
            if (value instanceof serde.NumericValue) {
                return value;
            }
            const untyped = value;
            if (untyped.type === "bigDecimal" && "string" in untyped) {
                return new serde.NumericValue(untyped.string, untyped.type);
            }
            return new serde.NumericValue(String(value), "bigDecimal");
        }
        if (ns.isNumericSchema() && typeof value === "string") {
            switch (value) {
                case "Infinity":
                    return Infinity;
                case "-Infinity":
                    return -Infinity;
                case "NaN":
                    return NaN;
            }
            return value;
        }
        if (ns.isDocumentSchema()) {
            if (isObject) {
                const out = Array.isArray(value) ? [] : {};
                for (const k in value) {
                    const v = value[k];
                    if (v instanceof serde.NumericValue) {
                        out[k] = v;
                    }
                    else {
                        out[k] = this._read(ns, v);
                    }
                }
                return out;
            }
            else {
                return structuredClone(value);
            }
        }
        return value;
    }
}

const NUMERIC_CONTROL_CHAR = String.fromCharCode(925);
class JsonReplacer {
    values = new Map();
    counter = 0;
    stage = 0;
    createReplacer() {
        if (this.stage === 1) {
            throw new Error("@aws-sdk/core/protocols - JsonReplacer already created.");
        }
        if (this.stage === 2) {
            throw new Error("@aws-sdk/core/protocols - JsonReplacer exhausted.");
        }
        this.stage = 1;
        return (key, value) => {
            if (value instanceof serde.NumericValue) {
                const v = `${NUMERIC_CONTROL_CHAR + "nv" + this.counter++}_` + value.string;
                this.values.set(`"${v}"`, value.string);
                return v;
            }
            if (typeof value === "bigint") {
                const s = value.toString();
                const v = `${NUMERIC_CONTROL_CHAR + "b" + this.counter++}_` + s;
                this.values.set(`"${v}"`, s);
                return v;
            }
            return value;
        };
    }
    replaceInJson(json) {
        if (this.stage === 0) {
            throw new Error("@aws-sdk/core/protocols - JsonReplacer not created yet.");
        }
        if (this.stage === 2) {
            throw new Error("@aws-sdk/core/protocols - JsonReplacer exhausted.");
        }
        this.stage = 2;
        if (this.counter === 0) {
            return json;
        }
        for (const [key, value] of this.values) {
            json = json.replace(key, value);
        }
        return json;
    }
}

class JsonShapeSerializer extends SerdeContextConfig {
    settings;
    buffer;
    useReplacer = false;
    rootSchema;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    write(schema$1, value) {
        this.rootSchema = schema.NormalizedSchema.of(schema$1);
        this.buffer = this._write(this.rootSchema, value);
    }
    flush() {
        const { rootSchema, useReplacer } = this;
        this.rootSchema = undefined;
        this.useReplacer = false;
        if (rootSchema?.isStructSchema() || rootSchema?.isDocumentSchema()) {
            if (!useReplacer) {
                return JSON.stringify(this.buffer);
            }
            const replacer = new JsonReplacer();
            return replacer.replaceInJson(JSON.stringify(this.buffer, replacer.createReplacer(), 0));
        }
        return this.buffer;
    }
    writeDiscriminatedDocument(schema$1, value) {
        this.write(schema$1, value);
        if (typeof this.buffer === "object") {
            this.buffer.__type = schema.NormalizedSchema.of(schema$1).getName(true);
        }
    }
    _write(schema$1, value, container) {
        const isObject = value !== null && typeof value === "object";
        const ns = schema.NormalizedSchema.of(schema$1);
        if (isObject) {
            if (ns.isStructSchema()) {
                const record = value;
                const out = {};
                const { jsonName } = this.settings;
                let nameMap = void 0;
                if (jsonName) {
                    nameMap = {};
                }
                let outCount = 0;
                for (const [memberName, memberSchema] of ns.structIterator()) {
                    const serializableValue = this._write(memberSchema, record[memberName], ns);
                    if (serializableValue !== undefined) {
                        let targetKey = memberName;
                        if (jsonName) {
                            targetKey = memberSchema.getMergedTraits().jsonName ?? memberName;
                            nameMap[memberName] = targetKey;
                        }
                        out[targetKey] = serializableValue;
                        outCount++;
                    }
                }
                if (ns.isUnionSchema() && outCount === 0) {
                    const { $unknown } = record;
                    if (Array.isArray($unknown)) {
                        const [k, v] = $unknown;
                        out[k] = this._write(15, v);
                    }
                }
                else if (typeof record.__type === "string") {
                    for (const k in record) {
                        const v = record[k];
                        const targetKey = jsonName ? nameMap[k] ?? k : k;
                        if (!(targetKey in out)) {
                            out[targetKey] = this._write(15, v);
                        }
                    }
                }
                return out;
            }
            if (Array.isArray(value) && ns.isListSchema()) {
                const listMember = ns.getValueSchema();
                const out = [];
                const sparse = !!ns.getMergedTraits().sparse;
                for (const item of value) {
                    if (sparse || item != null) {
                        out.push(this._write(listMember, item));
                    }
                }
                return out;
            }
            if (ns.isMapSchema()) {
                const mapMember = ns.getValueSchema();
                const out = {};
                const sparse = !!ns.getMergedTraits().sparse;
                for (const _k in value) {
                    const _v = value[_k];
                    if (sparse || _v != null) {
                        out[_k] = this._write(mapMember, _v);
                    }
                }
                return out;
            }
            if (value instanceof Uint8Array && (ns.isBlobSchema() || ns.isDocumentSchema())) {
                if (ns === this.rootSchema) {
                    return value;
                }
                return (this.serdeContext?.base64Encoder ?? serde.toBase64)(value);
            }
            if (value instanceof Date && (ns.isTimestampSchema() || ns.isDocumentSchema())) {
                const format = protocols.determineTimestampFormat(ns, this.settings);
                switch (format) {
                    case 5:
                        return value.toISOString().replace(".000Z", "Z");
                    case 6:
                        return serde.dateToUtcString(value);
                    case 7:
                        return value.getTime() / 1000;
                    default:
                        console.warn("Missing timestamp format, using epoch seconds", value);
                        return value.getTime() / 1000;
                }
            }
            if (value instanceof serde.NumericValue) {
                this.useReplacer = true;
            }
        }
        if (value === null && container?.isStructSchema()) {
            return void 0;
        }
        if (ns.isStringSchema()) {
            if (typeof value === "undefined" && ns.isIdempotencyToken()) {
                return serde.generateIdempotencyToken();
            }
            const mediaType = ns.getMergedTraits().mediaType;
            if (value != null && mediaType) {
                const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
                if (isJson) {
                    return serde.LazyJsonString.from(value);
                }
            }
            return value;
        }
        if (typeof value === "number" && ns.isNumericSchema()) {
            if (Math.abs(value) === Infinity || isNaN(value)) {
                return String(value);
            }
            return value;
        }
        if (typeof value === "string" && ns.isBlobSchema()) {
            if (ns === this.rootSchema) {
                return value;
            }
            return (this.serdeContext?.base64Encoder ?? serde.toBase64)(value);
        }
        if (typeof value === "bigint") {
            this.useReplacer = true;
        }
        if (ns.isDocumentSchema()) {
            if (isObject) {
                const out = Array.isArray(value) ? [] : {};
                for (const k in value) {
                    const v = value[k];
                    if (v instanceof serde.NumericValue) {
                        this.useReplacer = true;
                        out[k] = v;
                    }
                    else {
                        out[k] = this._write(ns, v);
                    }
                }
                return out;
            }
            else {
                return structuredClone(value);
            }
        }
        return value;
    }
}

class JsonCodec extends SerdeContextConfig {
    settings;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    createSerializer() {
        const serializer = new JsonShapeSerializer(this.settings);
        serializer.setSerdeContext(this.serdeContext);
        return serializer;
    }
    createDeserializer() {
        const deserializer = new JsonShapeDeserializer(this.settings);
        deserializer.setSerdeContext(this.serdeContext);
        return deserializer;
    }
}

class AwsJsonRpcProtocol extends protocols.RpcProtocol {
    serializer;
    deserializer;
    serviceTarget;
    codec;
    mixin;
    awsQueryCompatible;
    constructor({ defaultNamespace, errorTypeRegistries, serviceTarget, awsQueryCompatible, jsonCodec, }) {
        super({
            defaultNamespace,
            errorTypeRegistries,
        });
        this.serviceTarget = serviceTarget;
        this.codec =
            jsonCodec ??
                new JsonCodec({
                    timestampFormat: {
                        useTrait: true,
                        default: 7,
                    },
                    jsonName: false,
                });
        this.serializer = this.codec.createSerializer();
        this.deserializer = this.codec.createDeserializer();
        this.awsQueryCompatible = !!awsQueryCompatible;
        this.mixin = new ProtocolLib(this.awsQueryCompatible);
    }
    async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        if (!request.path.endsWith("/")) {
            request.path += "/";
        }
        request.headers["content-type"] = `application/x-amz-json-${this.getJsonRpcVersion()}`;
        request.headers["x-amz-target"] = `${this.serviceTarget}.${operationSchema.name}`;
        if (this.awsQueryCompatible) {
            request.headers["x-amzn-query-mode"] = "true";
        }
        if (schema.deref(operationSchema.input) === "unit" || !request.body) {
            request.body = "{}";
        }
        return request;
    }
    getPayloadCodec() {
        return this.codec;
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
        const { awsQueryCompatible } = this;
        if (awsQueryCompatible) {
            this.mixin.setQueryCompatError(dataObject, response);
        }
        const errorIdentifier = loadJsonRpcErrorCode(response, dataObject, awsQueryCompatible) ?? "Unknown";
        this.mixin.compose(this.compositeErrorRegistry, errorIdentifier, this.options.defaultNamespace);
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, dataObject, metadata, awsQueryCompatible ? this.mixin.findQueryCompatibleError : undefined);
        const ns = schema.NormalizedSchema.of(errorSchema);
        const message = dataObject.message ?? dataObject.Message ?? "UnknownError";
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor({});
        const output = {};
        const errorDeserializer = this.codec.createDeserializer();
        for (const [name, member] of ns.structIterator()) {
            if (dataObject[name] != null) {
                output[name] = errorDeserializer.readObject(member, dataObject[name]);
            }
        }
        if (awsQueryCompatible) {
            this.mixin.queryCompatOutput(dataObject, output);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
            $fault: ns.getMergedTraits().error,
            message,
        }, output), dataObject);
    }
}

class AwsJson1_0Protocol extends AwsJsonRpcProtocol {
    constructor({ defaultNamespace, errorTypeRegistries, serviceTarget, awsQueryCompatible, jsonCodec, }) {
        super({
            defaultNamespace,
            errorTypeRegistries,
            serviceTarget,
            awsQueryCompatible,
            jsonCodec,
        });
    }
    getShapeId() {
        return "aws.protocols#awsJson1_0";
    }
    getJsonRpcVersion() {
        return "1.0";
    }
    getDefaultContentType() {
        return "application/x-amz-json-1.0";
    }
}

class AwsJson1_1Protocol extends AwsJsonRpcProtocol {
    constructor({ defaultNamespace, errorTypeRegistries, serviceTarget, awsQueryCompatible, jsonCodec, }) {
        super({
            defaultNamespace,
            errorTypeRegistries,
            serviceTarget,
            awsQueryCompatible,
            jsonCodec,
        });
    }
    getShapeId() {
        return "aws.protocols#awsJson1_1";
    }
    getJsonRpcVersion() {
        return "1.1";
    }
    getDefaultContentType() {
        return "application/x-amz-json-1.1";
    }
}

class AwsRestJsonProtocol extends protocols.HttpBindingProtocol {
    serializer;
    deserializer;
    codec;
    mixin = new ProtocolLib();
    constructor({ defaultNamespace, errorTypeRegistries, }) {
        super({
            defaultNamespace,
            errorTypeRegistries,
        });
        const settings = {
            timestampFormat: {
                useTrait: true,
                default: 7,
            },
            httpBindings: true,
            jsonName: true,
        };
        this.codec = new JsonCodec(settings);
        this.serializer = new protocols.HttpInterceptingShapeSerializer(this.codec.createSerializer(), settings);
        this.deserializer = new protocols.HttpInterceptingShapeDeserializer(this.codec.createDeserializer(), settings);
    }
    getShapeId() {
        return "aws.protocols#restJson1";
    }
    getPayloadCodec() {
        return this.codec;
    }
    setSerdeContext(serdeContext) {
        this.codec.setSerdeContext(serdeContext);
        super.setSerdeContext(serdeContext);
    }
    async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        const inputSchema = schema.NormalizedSchema.of(operationSchema.input);
        if (!request.headers["content-type"]) {
            const contentType = this.mixin.resolveRestContentType(this.getDefaultContentType(), inputSchema);
            if (contentType) {
                request.headers["content-type"] = contentType;
            }
        }
        if (request.body == null && request.headers["content-type"] === this.getDefaultContentType()) {
            request.body = "{}";
        }
        return request;
    }
    async deserializeResponse(operationSchema, context, response) {
        const output = await super.deserializeResponse(operationSchema, context, response);
        const outputSchema = schema.NormalizedSchema.of(operationSchema.output);
        for (const [name, member] of outputSchema.structIterator()) {
            if (member.getMemberTraits().httpPayload && !(name in output)) {
                output[name] = null;
            }
        }
        return output;
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
        const errorIdentifier = loadRestJsonErrorCode(response, dataObject) ?? "Unknown";
        this.mixin.compose(this.compositeErrorRegistry, errorIdentifier, this.options.defaultNamespace);
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, dataObject, metadata);
        const ns = schema.NormalizedSchema.of(errorSchema);
        const message = dataObject.message ?? dataObject.Message ?? "UnknownError";
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor({});
        await this.deserializeHttpMessage(errorSchema, context, response, dataObject);
        const output = {};
        const errorDeserializer = this.codec.createDeserializer();
        for (const [name, member] of ns.structIterator()) {
            const target = member.getMergedTraits().jsonName ?? name;
            output[name] = errorDeserializer.readObject(member, dataObject[target]);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
            $fault: ns.getMergedTraits().error,
            message,
        }, output), dataObject);
    }
    getDefaultContentType() {
        return "application/json";
    }
}

const awsExpectUnion = (value) => {
    if (value == null) {
        return undefined;
    }
    if (typeof value === "object" && "__type" in value) {
        delete value.__type;
    }
    return serde.expectUnion(value);
};

class XmlShapeDeserializer extends SerdeContextConfig {
    settings;
    stringDeserializer;
    constructor(settings) {
        super();
        this.settings = settings;
        this.stringDeserializer = new protocols.FromStringShapeDeserializer(settings);
    }
    setSerdeContext(serdeContext) {
        this.serdeContext = serdeContext;
        this.stringDeserializer.setSerdeContext(serdeContext);
    }
    read(schema$1, bytes, key) {
        const ns = schema.NormalizedSchema.of(schema$1);
        const memberSchemas = ns.getMemberSchemas();
        const isEventPayload = ns.isStructSchema() &&
            ns.isMemberSchema() &&
            !!Object.values(memberSchemas).find((memberNs) => {
                return !!memberNs.getMemberTraits().eventPayload;
            });
        if (isEventPayload) {
            const output = {};
            const memberName = Object.keys(memberSchemas)[0];
            const eventMemberSchema = memberSchemas[memberName];
            if (eventMemberSchema.isBlobSchema()) {
                output[memberName] = bytes;
            }
            else {
                output[memberName] = this.read(memberSchemas[memberName], bytes);
            }
            return output;
        }
        const xmlString = (this.serdeContext?.utf8Encoder ?? serde.toUtf8)(bytes);
        const parsedObject = this.parseXml(xmlString);
        return this.readSchema(schema$1, key ? parsedObject[key] : parsedObject);
    }
    readSchema(_schema, value) {
        const ns = schema.NormalizedSchema.of(_schema);
        if (ns.isUnitSchema()) {
            return;
        }
        const traits = ns.getMergedTraits();
        if (ns.isListSchema() && !Array.isArray(value)) {
            return this.readSchema(ns, [value]);
        }
        if (value == null) {
            return value;
        }
        if (typeof value === "object") {
            const flat = !!traits.xmlFlattened;
            if (ns.isListSchema()) {
                const listValue = ns.getValueSchema();
                const buffer = [];
                const sourceKey = listValue.getMergedTraits().xmlName ?? "member";
                const source = flat ? value : (value[0] ?? value)[sourceKey];
                if (source == null) {
                    return buffer;
                }
                const sourceArray = Array.isArray(source) ? source : [source];
                for (const v of sourceArray) {
                    buffer.push(this.readSchema(listValue, v));
                }
                return buffer;
            }
            const buffer = {};
            if (ns.isMapSchema()) {
                const keyNs = ns.getKeySchema();
                const memberNs = ns.getValueSchema();
                let entries;
                if (flat) {
                    entries = Array.isArray(value) ? value : [value];
                }
                else {
                    entries = Array.isArray(value.entry) ? value.entry : [value.entry];
                }
                const keyProperty = keyNs.getMergedTraits().xmlName ?? "key";
                const valueProperty = memberNs.getMergedTraits().xmlName ?? "value";
                for (const entry of entries) {
                    const key = entry[keyProperty];
                    const value = entry[valueProperty];
                    buffer[key] = this.readSchema(memberNs, value);
                }
                return buffer;
            }
            if (ns.isStructSchema()) {
                const union = ns.isUnionSchema();
                let unionSerde;
                if (union) {
                    unionSerde = new UnionSerde(value, buffer);
                }
                for (const [memberName, memberSchema] of ns.structIterator()) {
                    const memberTraits = memberSchema.getMergedTraits();
                    const xmlObjectKey = !memberTraits.httpPayload
                        ? memberSchema.getMemberTraits().xmlName ?? memberName
                        : memberTraits.xmlName ?? memberSchema.getName();
                    if (union) {
                        unionSerde.mark(xmlObjectKey);
                    }
                    if (value[xmlObjectKey] != null) {
                        buffer[memberName] = this.readSchema(memberSchema, value[xmlObjectKey]);
                    }
                }
                if (union) {
                    unionSerde.writeUnknown();
                }
                return buffer;
            }
            if (ns.isDocumentSchema()) {
                return value;
            }
            throw new Error(`@aws-sdk/core/protocols - xml deserializer unhandled schema type for ${ns.getName(true)}`);
        }
        if (ns.isListSchema()) {
            return [];
        }
        if (ns.isMapSchema() || ns.isStructSchema()) {
            return {};
        }
        return this.stringDeserializer.read(ns, value);
    }
    parseXml(xml) {
        if (xml.length) {
            let parsedObj;
            try {
                parsedObj = xmlBuilder.parseXML(xml);
            }
            catch (e) {
                if (e && typeof e === "object") {
                    Object.defineProperty(e, "$responseBodyText", {
                        value: xml,
                    });
                }
                throw e;
            }
            const textNodeName = "#text";
            const key = Object.keys(parsedObj)[0];
            const parsedObjToReturn = parsedObj[key];
            if (parsedObjToReturn[textNodeName]) {
                parsedObjToReturn[key] = parsedObjToReturn[textNodeName];
                delete parsedObjToReturn[textNodeName];
            }
            return client.getValueFromTextNode(parsedObjToReturn);
        }
        return {};
    }
}

class QueryShapeSerializer extends SerdeContextConfig {
    settings;
    buffer;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    write(schema$1, value, prefix = "") {
        if (this.buffer === undefined) {
            this.buffer = "";
        }
        const ns = schema.NormalizedSchema.of(schema$1);
        if (prefix && !prefix.endsWith(".")) {
            prefix += ".";
        }
        if (ns.isBlobSchema()) {
            if (typeof value === "string" || value instanceof Uint8Array) {
                this.writeKey(prefix);
                this.writeValue((this.serdeContext?.base64Encoder ?? serde.toBase64)(value));
            }
        }
        else if (ns.isBooleanSchema() || ns.isNumericSchema() || ns.isStringSchema()) {
            if (value != null) {
                this.writeKey(prefix);
                this.writeValue(String(value));
            }
            else if (ns.isIdempotencyToken()) {
                this.writeKey(prefix);
                this.writeValue(serde.generateIdempotencyToken());
            }
        }
        else if (ns.isBigIntegerSchema()) {
            if (value != null) {
                this.writeKey(prefix);
                this.writeValue(String(value));
            }
        }
        else if (ns.isBigDecimalSchema()) {
            if (value != null) {
                this.writeKey(prefix);
                this.writeValue(value instanceof serde.NumericValue ? value.string : String(value));
            }
        }
        else if (ns.isTimestampSchema()) {
            if (value instanceof Date) {
                this.writeKey(prefix);
                const format = protocols.determineTimestampFormat(ns, this.settings);
                switch (format) {
                    case 5:
                        this.writeValue(value.toISOString().replace(".000Z", "Z"));
                        break;
                    case 6:
                        this.writeValue(serde.dateToUtcString(value));
                        break;
                    case 7:
                        this.writeValue(String(value.getTime() / 1000));
                        break;
                }
            }
        }
        else if (ns.isDocumentSchema()) {
            if (Array.isArray(value)) {
                this.write(64 | 15, value, prefix);
            }
            else if (value instanceof Date) {
                this.write(4, value, prefix);
            }
            else if (value instanceof Uint8Array) {
                this.write(21, value, prefix);
            }
            else if (value && typeof value === "object") {
                this.write(128 | 15, value, prefix);
            }
            else {
                this.writeKey(prefix);
                this.writeValue(String(value));
            }
        }
        else if (ns.isListSchema()) {
            if (Array.isArray(value)) {
                if (value.length === 0) {
                    if (this.settings.serializeEmptyLists) {
                        this.writeKey(prefix);
                        this.writeValue("");
                    }
                }
                else {
                    const member = ns.getValueSchema();
                    const flat = this.settings.flattenLists || ns.getMergedTraits().xmlFlattened;
                    let i = 1;
                    for (const item of value) {
                        if (item == null) {
                            continue;
                        }
                        const traits = member.getMergedTraits();
                        const suffix = this.getKey("member", traits.xmlName, traits.ec2QueryName);
                        const key = flat ? `${prefix}${i}` : `${prefix}${suffix}.${i}`;
                        this.write(member, item, key);
                        ++i;
                    }
                }
            }
        }
        else if (ns.isMapSchema()) {
            if (value && typeof value === "object") {
                const keySchema = ns.getKeySchema();
                const memberSchema = ns.getValueSchema();
                const flat = ns.getMergedTraits().xmlFlattened;
                let i = 1;
                for (const k in value) {
                    const v = value[k];
                    if (v == null) {
                        continue;
                    }
                    const keyTraits = keySchema.getMergedTraits();
                    const keySuffix = this.getKey("key", keyTraits.xmlName, keyTraits.ec2QueryName);
                    const key = flat ? `${prefix}${i}.${keySuffix}` : `${prefix}entry.${i}.${keySuffix}`;
                    const valTraits = memberSchema.getMergedTraits();
                    const valueSuffix = this.getKey("value", valTraits.xmlName, valTraits.ec2QueryName);
                    const valueKey = flat ? `${prefix}${i}.${valueSuffix}` : `${prefix}entry.${i}.${valueSuffix}`;
                    this.write(keySchema, k, key);
                    this.write(memberSchema, v, valueKey);
                    ++i;
                }
            }
        }
        else if (ns.isStructSchema()) {
            if (value && typeof value === "object") {
                let didWriteMember = false;
                for (const [memberName, member] of ns.structIterator()) {
                    if (value[memberName] == null && !member.isIdempotencyToken()) {
                        continue;
                    }
                    const traits = member.getMergedTraits();
                    const suffix = this.getKey(memberName, traits.xmlName, traits.ec2QueryName, "struct");
                    const key = `${prefix}${suffix}`;
                    this.write(member, value[memberName], key);
                    didWriteMember = true;
                }
                if (!didWriteMember && ns.isUnionSchema()) {
                    const { $unknown } = value;
                    if (Array.isArray($unknown)) {
                        const [k, v] = $unknown;
                        const key = `${prefix}${k}`;
                        this.write(15, v, key);
                    }
                }
            }
        }
        else if (ns.isUnitSchema()) ;
        else {
            throw new Error(`@aws-sdk/core/protocols - QuerySerializer unrecognized schema type ${ns.getName(true)}`);
        }
    }
    flush() {
        if (this.buffer === undefined) {
            throw new Error("@aws-sdk/core/protocols - QuerySerializer cannot flush with nothing written to buffer.");
        }
        const str = this.buffer;
        delete this.buffer;
        return str;
    }
    getKey(memberName, xmlName, ec2QueryName, keySource) {
        const { ec2, capitalizeKeys } = this.settings;
        if (ec2 && ec2QueryName) {
            return ec2QueryName;
        }
        const key = xmlName ?? memberName;
        if (capitalizeKeys && keySource === "struct") {
            return key[0].toUpperCase() + key.slice(1);
        }
        return key;
    }
    writeKey(key) {
        if (key.endsWith(".")) {
            key = key.slice(0, key.length - 1);
        }
        this.buffer += `&${protocols.extendedEncodeURIComponent(key)}=`;
    }
    writeValue(value) {
        this.buffer += protocols.extendedEncodeURIComponent(value);
    }
}

class AwsQueryProtocol extends protocols.RpcProtocol {
    options;
    serializer;
    deserializer;
    mixin = new ProtocolLib();
    constructor(options) {
        super({
            defaultNamespace: options.defaultNamespace,
            errorTypeRegistries: options.errorTypeRegistries,
        });
        this.options = options;
        const settings = {
            timestampFormat: {
                useTrait: true,
                default: 5,
            },
            httpBindings: false,
            xmlNamespace: options.xmlNamespace,
            serviceNamespace: options.defaultNamespace,
            serializeEmptyLists: true,
        };
        this.serializer = new QueryShapeSerializer(settings);
        this.deserializer = new XmlShapeDeserializer(settings);
    }
    getShapeId() {
        return "aws.protocols#awsQuery";
    }
    setSerdeContext(serdeContext) {
        this.serializer.setSerdeContext(serdeContext);
        this.deserializer.setSerdeContext(serdeContext);
    }
    getPayloadCodec() {
        throw new Error("AWSQuery protocol has no payload codec.");
    }
    async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        if (!request.path.endsWith("/")) {
            request.path += "/";
        }
        request.headers["content-type"] = "application/x-www-form-urlencoded";
        if (schema.deref(operationSchema.input) === "unit" || !request.body) {
            request.body = "";
        }
        const action = operationSchema.name.split("#")[1] ?? operationSchema.name;
        request.body = `Action=${action}&Version=${this.options.version}` + request.body;
        if (request.body.endsWith("&")) {
            request.body = request.body.slice(-1);
        }
        return request;
    }
    async deserializeResponse(operationSchema, context, response) {
        const deserializer = this.deserializer;
        const ns = schema.NormalizedSchema.of(operationSchema.output);
        const dataObject = {};
        if (response.statusCode >= 300) {
            const bytes = await protocols.collectBody(response.body, context);
            if (bytes.byteLength > 0) {
                Object.assign(dataObject, await deserializer.read(15, bytes));
            }
            await this.handleError(operationSchema, context, response, dataObject, this.deserializeMetadata(response));
        }
        for (const header in response.headers) {
            const value = response.headers[header];
            delete response.headers[header];
            response.headers[header.toLowerCase()] = value;
        }
        const shortName = operationSchema.name.split("#")[1] ?? operationSchema.name;
        const awsQueryResultKey = ns.isStructSchema() && this.useNestedResult() ? shortName + "Result" : undefined;
        const bytes = await protocols.collectBody(response.body, context);
        if (bytes.byteLength > 0) {
            Object.assign(dataObject, await deserializer.read(ns, bytes, awsQueryResultKey));
        }
        dataObject.$metadata = this.deserializeMetadata(response);
        return dataObject;
    }
    useNestedResult() {
        return true;
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
        const errorIdentifier = this.loadQueryErrorCode(response, dataObject) ?? "Unknown";
        this.mixin.compose(this.compositeErrorRegistry, errorIdentifier, this.options.defaultNamespace);
        const errorData = this.loadQueryError(dataObject) ?? {};
        const message = this.loadQueryErrorMessage(dataObject);
        errorData.message = message;
        errorData.Error = {
            Type: errorData.Type,
            Code: errorData.Code,
            Message: message,
        };
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, errorData, metadata, this.mixin.findQueryCompatibleError);
        const ns = schema.NormalizedSchema.of(errorSchema);
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor({});
        const output = {
            Type: errorData.Error.Type,
            Code: errorData.Error.Code,
            Error: errorData.Error,
        };
        for (const [name, member] of ns.structIterator()) {
            const target = member.getMergedTraits().xmlName ?? name;
            const value = errorData[target] ?? dataObject[target];
            output[name] = this.deserializer.readSchema(member, value);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
            $fault: ns.getMergedTraits().error,
            message,
        }, output), dataObject);
    }
    loadQueryErrorCode(output, data) {
        const code = (data.Errors?.[0]?.Error ?? data.Errors?.Error ?? data.Error)?.Code;
        if (code !== undefined) {
            return code;
        }
        if (output.statusCode == 404) {
            return "NotFound";
        }
    }
    loadQueryError(data) {
        return data.Errors?.[0]?.Error ?? data.Errors?.Error ?? data.Error;
    }
    loadQueryErrorMessage(data) {
        const errorData = this.loadQueryError(data);
        return errorData?.message ?? errorData?.Message ?? data.message ?? data.Message ?? "Unknown";
    }
    getDefaultContentType() {
        return "application/x-www-form-urlencoded";
    }
}

class AwsEc2QueryProtocol extends AwsQueryProtocol {
    options;
    constructor(options) {
        super(options);
        this.options = options;
        const ec2Settings = {
            capitalizeKeys: true,
            flattenLists: true,
            serializeEmptyLists: false,
            ec2: true,
        };
        Object.assign(this.serializer.settings, ec2Settings);
    }
    getShapeId() {
        return "aws.protocols#ec2Query";
    }
    useNestedResult() {
        return false;
    }
}

const parseXmlBody = (streamBody, context) => collectBodyString(streamBody, context).then((encoded) => {
    if (encoded.length) {
        let parsedObj;
        try {
            parsedObj = xmlBuilder.parseXML(encoded);
        }
        catch (e) {
            if (e && typeof e === "object") {
                Object.defineProperty(e, "$responseBodyText", {
                    value: encoded,
                });
            }
            throw e;
        }
        const textNodeName = "#text";
        const key = Object.keys(parsedObj)[0];
        const parsedObjToReturn = parsedObj[key];
        if (parsedObjToReturn[textNodeName]) {
            parsedObjToReturn[key] = parsedObjToReturn[textNodeName];
            delete parsedObjToReturn[textNodeName];
        }
        return client.getValueFromTextNode(parsedObjToReturn);
    }
    return {};
});
const parseXmlErrorBody = async (errorBody, context) => {
    const value = await parseXmlBody(errorBody, context);
    if (value.Error) {
        value.Error.message = value.Error.message ?? value.Error.Message;
    }
    return value;
};
const loadRestXmlErrorCode = (output, data) => {
    if (data?.Error?.Code !== undefined) {
        return data.Error.Code;
    }
    if (data?.Code !== undefined) {
        return data.Code;
    }
    if (output.statusCode == 404) {
        return "NotFound";
    }
};

class XmlShapeSerializer extends SerdeContextConfig {
    settings;
    stringBuffer;
    byteBuffer;
    buffer;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    write(schema$1, value) {
        const ns = schema.NormalizedSchema.of(schema$1);
        if (ns.isStringSchema() && typeof value === "string") {
            this.stringBuffer = value;
        }
        else if (ns.isBlobSchema()) {
            this.byteBuffer =
                "byteLength" in value
                    ? value
                    : (this.serdeContext?.base64Decoder ?? serde.fromBase64)(value);
        }
        else {
            this.buffer = this.writeStruct(ns, value, undefined);
            const traits = ns.getMergedTraits();
            if (traits.httpPayload && !traits.xmlName) {
                this.buffer.withName(ns.getName());
            }
        }
    }
    flush() {
        if (this.byteBuffer !== undefined) {
            const bytes = this.byteBuffer;
            delete this.byteBuffer;
            return bytes;
        }
        if (this.stringBuffer !== undefined) {
            const str = this.stringBuffer;
            delete this.stringBuffer;
            return str;
        }
        const buffer = this.buffer;
        if (this.settings.xmlNamespace) {
            if (!buffer?.attributes?.["xmlns"]) {
                buffer.addAttribute("xmlns", this.settings.xmlNamespace);
            }
        }
        delete this.buffer;
        return buffer.toString();
    }
    writeStruct(ns, value, parentXmlns) {
        const traits = ns.getMergedTraits();
        const name = ns.isMemberSchema() && !traits.httpPayload
            ? ns.getMemberTraits().xmlName ?? ns.getMemberName()
            : traits.xmlName ?? ns.getName();
        if (!name || !ns.isStructSchema()) {
            throw new Error(`@aws-sdk/core/protocols - xml serializer, cannot write struct with empty name or non-struct, schema=${ns.getName(true)}.`);
        }
        const structXmlNode = xmlBuilder.XmlNode.of(name);
        const [xmlnsAttr, xmlns] = this.getXmlnsAttribute(ns, parentXmlns);
        for (const [memberName, memberSchema] of ns.structIterator()) {
            const val = value[memberName];
            if (val != null || memberSchema.isIdempotencyToken()) {
                if (memberSchema.getMergedTraits().xmlAttribute) {
                    structXmlNode.addAttribute(memberSchema.getMergedTraits().xmlName ?? memberName, this.writeSimple(memberSchema, val));
                    continue;
                }
                if (memberSchema.isListSchema()) {
                    this.writeList(memberSchema, val, structXmlNode, xmlns);
                }
                else if (memberSchema.isMapSchema()) {
                    this.writeMap(memberSchema, val, structXmlNode, xmlns);
                }
                else if (memberSchema.isStructSchema()) {
                    structXmlNode.addChildNode(this.writeStruct(memberSchema, val, xmlns));
                }
                else {
                    const memberNode = xmlBuilder.XmlNode.of(memberSchema.getMergedTraits().xmlName ?? memberSchema.getMemberName());
                    this.writeSimpleInto(memberSchema, val, memberNode, xmlns);
                    structXmlNode.addChildNode(memberNode);
                }
            }
        }
        const { $unknown } = value;
        if ($unknown && ns.isUnionSchema() && Array.isArray($unknown) && Object.keys(value).length === 1) {
            const [k, v] = $unknown;
            const node = xmlBuilder.XmlNode.of(k);
            if (typeof v !== "string") {
                if (value instanceof xmlBuilder.XmlNode || value instanceof xmlBuilder.XmlText) {
                    structXmlNode.addChildNode(value);
                }
                else {
                    throw new Error(`@aws-sdk - $unknown union member in XML requires ` +
                        `value of type string, @aws-sdk/xml-builder::XmlNode or XmlText.`);
                }
            }
            this.writeSimpleInto(0, v, node, xmlns);
            structXmlNode.addChildNode(node);
        }
        if (xmlns) {
            structXmlNode.addAttribute(xmlnsAttr, xmlns);
        }
        return structXmlNode;
    }
    writeList(listMember, array, container, parentXmlns) {
        if (!listMember.isMemberSchema()) {
            throw new Error(`@aws-sdk/core/protocols - xml serializer, cannot write non-member list: ${listMember.getName(true)}`);
        }
        const listTraits = listMember.getMergedTraits();
        const listValueSchema = listMember.getValueSchema();
        const listValueTraits = listValueSchema.getMergedTraits();
        const sparse = !!listValueTraits.sparse;
        const flat = !!listTraits.xmlFlattened;
        const [xmlnsAttr, xmlns] = this.getXmlnsAttribute(listMember, parentXmlns);
        const writeItem = (container, value) => {
            if (listValueSchema.isListSchema()) {
                this.writeList(listValueSchema, Array.isArray(value) ? value : [value], container, xmlns);
            }
            else if (listValueSchema.isMapSchema()) {
                this.writeMap(listValueSchema, value, container, xmlns);
            }
            else if (listValueSchema.isStructSchema()) {
                const struct = this.writeStruct(listValueSchema, value, xmlns);
                container.addChildNode(struct.withName(flat ? listTraits.xmlName ?? listMember.getMemberName() : listValueTraits.xmlName ?? "member"));
            }
            else {
                const listItemNode = xmlBuilder.XmlNode.of(flat ? listTraits.xmlName ?? listMember.getMemberName() : listValueTraits.xmlName ?? "member");
                this.writeSimpleInto(listValueSchema, value, listItemNode, xmlns);
                container.addChildNode(listItemNode);
            }
        };
        if (flat) {
            for (const value of array) {
                if (sparse || value != null) {
                    writeItem(container, value);
                }
            }
        }
        else {
            const listNode = xmlBuilder.XmlNode.of(listTraits.xmlName ?? listMember.getMemberName());
            if (xmlns) {
                listNode.addAttribute(xmlnsAttr, xmlns);
            }
            for (const value of array) {
                if (sparse || value != null) {
                    writeItem(listNode, value);
                }
            }
            container.addChildNode(listNode);
        }
    }
    writeMap(mapMember, map, container, parentXmlns, containerIsMap = false) {
        if (!mapMember.isMemberSchema()) {
            throw new Error(`@aws-sdk/core/protocols - xml serializer, cannot write non-member map: ${mapMember.getName(true)}`);
        }
        const mapTraits = mapMember.getMergedTraits();
        const mapKeySchema = mapMember.getKeySchema();
        const mapKeyTraits = mapKeySchema.getMergedTraits();
        const keyTag = mapKeyTraits.xmlName ?? "key";
        const mapValueSchema = mapMember.getValueSchema();
        const mapValueTraits = mapValueSchema.getMergedTraits();
        const valueTag = mapValueTraits.xmlName ?? "value";
        const sparse = !!mapValueTraits.sparse;
        const flat = !!mapTraits.xmlFlattened;
        const [xmlnsAttr, xmlns] = this.getXmlnsAttribute(mapMember, parentXmlns);
        const addKeyValue = (entry, key, val) => {
            const keyNode = xmlBuilder.XmlNode.of(keyTag, key);
            const [keyXmlnsAttr, keyXmlns] = this.getXmlnsAttribute(mapKeySchema, xmlns);
            if (keyXmlns) {
                keyNode.addAttribute(keyXmlnsAttr, keyXmlns);
            }
            entry.addChildNode(keyNode);
            let valueNode = xmlBuilder.XmlNode.of(valueTag);
            if (mapValueSchema.isListSchema()) {
                this.writeList(mapValueSchema, val, valueNode, xmlns);
            }
            else if (mapValueSchema.isMapSchema()) {
                this.writeMap(mapValueSchema, val, valueNode, xmlns, true);
            }
            else if (mapValueSchema.isStructSchema()) {
                valueNode = this.writeStruct(mapValueSchema, val, xmlns);
            }
            else {
                this.writeSimpleInto(mapValueSchema, val, valueNode, xmlns);
            }
            entry.addChildNode(valueNode);
        };
        if (flat) {
            for (const key in map) {
                const val = map[key];
                if (sparse || val != null) {
                    const entry = xmlBuilder.XmlNode.of(mapTraits.xmlName ?? mapMember.getMemberName());
                    addKeyValue(entry, key, val);
                    container.addChildNode(entry);
                }
            }
        }
        else {
            let mapNode;
            if (!containerIsMap) {
                mapNode = xmlBuilder.XmlNode.of(mapTraits.xmlName ?? mapMember.getMemberName());
                if (xmlns) {
                    mapNode.addAttribute(xmlnsAttr, xmlns);
                }
                container.addChildNode(mapNode);
            }
            for (const key in map) {
                const val = map[key];
                if (sparse || val != null) {
                    const entry = xmlBuilder.XmlNode.of("entry");
                    addKeyValue(entry, key, val);
                    (containerIsMap ? container : mapNode).addChildNode(entry);
                }
            }
        }
    }
    writeSimple(_schema, value) {
        if (null === value) {
            throw new Error("@aws-sdk/core/protocols - (XML serializer) cannot write null value.");
        }
        const ns = schema.NormalizedSchema.of(_schema);
        let nodeContents = null;
        if (value && typeof value === "object") {
            if (ns.isBlobSchema()) {
                nodeContents = (this.serdeContext?.base64Encoder ?? serde.toBase64)(value);
            }
            else if (ns.isTimestampSchema() && value instanceof Date) {
                const format = protocols.determineTimestampFormat(ns, this.settings);
                switch (format) {
                    case 5:
                        nodeContents = value.toISOString().replace(".000Z", "Z");
                        break;
                    case 6:
                        nodeContents = serde.dateToUtcString(value);
                        break;
                    case 7:
                        nodeContents = String(value.getTime() / 1000);
                        break;
                    default:
                        console.warn("Missing timestamp format, using http date", value);
                        nodeContents = serde.dateToUtcString(value);
                        break;
                }
            }
            else if (ns.isBigDecimalSchema() && value) {
                if (value instanceof serde.NumericValue) {
                    return value.string;
                }
                return String(value);
            }
            else if (ns.isMapSchema() || ns.isListSchema()) {
                throw new Error("@aws-sdk/core/protocols - xml serializer, cannot call _write() on List/Map schema, call writeList or writeMap() instead.");
            }
            else {
                throw new Error(`@aws-sdk/core/protocols - xml serializer, unhandled schema type for object value and schema: ${ns.getName(true)}`);
            }
        }
        if (ns.isBooleanSchema() || ns.isNumericSchema() || ns.isBigIntegerSchema() || ns.isBigDecimalSchema()) {
            nodeContents = String(value);
        }
        if (ns.isStringSchema()) {
            if (value === undefined && ns.isIdempotencyToken()) {
                nodeContents = serde.generateIdempotencyToken();
            }
            else {
                nodeContents = String(value);
            }
        }
        if (nodeContents === null) {
            throw new Error(`Unhandled schema-value pair ${ns.getName(true)}=${value}`);
        }
        return nodeContents;
    }
    writeSimpleInto(_schema, value, into, parentXmlns) {
        const nodeContents = this.writeSimple(_schema, value);
        const ns = schema.NormalizedSchema.of(_schema);
        const content = new xmlBuilder.XmlText(nodeContents);
        const [xmlnsAttr, xmlns] = this.getXmlnsAttribute(ns, parentXmlns);
        if (xmlns) {
            into.addAttribute(xmlnsAttr, xmlns);
        }
        into.addChildNode(content);
    }
    getXmlnsAttribute(ns, parentXmlns) {
        const traits = ns.getMergedTraits();
        const [prefix, xmlns] = traits.xmlNamespace ?? [];
        if (xmlns && xmlns !== parentXmlns) {
            return [prefix ? `xmlns:${prefix}` : "xmlns", xmlns];
        }
        return [void 0, void 0];
    }
}

class XmlCodec extends SerdeContextConfig {
    settings;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    createSerializer() {
        const serializer = new XmlShapeSerializer(this.settings);
        serializer.setSerdeContext(this.serdeContext);
        return serializer;
    }
    createDeserializer() {
        const deserializer = new XmlShapeDeserializer(this.settings);
        deserializer.setSerdeContext(this.serdeContext);
        return deserializer;
    }
}

class AwsRestXmlProtocol extends protocols.HttpBindingProtocol {
    codec;
    serializer;
    deserializer;
    mixin = new ProtocolLib();
    constructor(options) {
        super(options);
        const settings = {
            timestampFormat: {
                useTrait: true,
                default: 5,
            },
            httpBindings: true,
            xmlNamespace: options.xmlNamespace,
            serviceNamespace: options.defaultNamespace,
        };
        this.codec = new XmlCodec(settings);
        this.serializer = new protocols.HttpInterceptingShapeSerializer(this.codec.createSerializer(), settings);
        this.deserializer = new protocols.HttpInterceptingShapeDeserializer(this.codec.createDeserializer(), settings);
    }
    getPayloadCodec() {
        return this.codec;
    }
    getShapeId() {
        return "aws.protocols#restXml";
    }
    async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        const inputSchema = schema.NormalizedSchema.of(operationSchema.input);
        if (!request.headers["content-type"]) {
            const contentType = this.mixin.resolveRestContentType(this.getDefaultContentType(), inputSchema);
            if (contentType) {
                request.headers["content-type"] = contentType;
            }
        }
        if (typeof request.body === "string" &&
            request.headers["content-type"] === this.getDefaultContentType() &&
            !request.body.startsWith("<?xml ") &&
            !this.hasUnstructuredPayloadBinding(inputSchema)) {
            request.body = '<?xml version="1.0" encoding="UTF-8"?>' + request.body;
        }
        return request;
    }
    async deserializeResponse(operationSchema, context, response) {
        return super.deserializeResponse(operationSchema, context, response);
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
        const errorIdentifier = loadRestXmlErrorCode(response, dataObject) ?? "Unknown";
        this.mixin.compose(this.compositeErrorRegistry, errorIdentifier, this.options.defaultNamespace);
        if (dataObject.Error && typeof dataObject.Error === "object") {
            for (const key of Object.keys(dataObject.Error)) {
                dataObject[key] = dataObject.Error[key];
                if (key.toLowerCase() === "message") {
                    dataObject.message = dataObject.Error[key];
                }
            }
        }
        if (dataObject.RequestId && !metadata.requestId) {
            metadata.requestId = dataObject.RequestId;
        }
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, dataObject, metadata);
        const ns = schema.NormalizedSchema.of(errorSchema);
        const message = dataObject.Error?.message ??
            dataObject.Error?.Message ??
            dataObject.message ??
            dataObject.Message ??
            "UnknownError";
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor({});
        await this.deserializeHttpMessage(errorSchema, context, response, dataObject);
        const output = {};
        const errorDeserializer = this.codec.createDeserializer();
        for (const [name, member] of ns.structIterator()) {
            const target = member.getMergedTraits().xmlName ?? name;
            const value = dataObject.Error?.[target] ?? dataObject[target];
            output[name] = errorDeserializer.readSchema(member, value);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
            $fault: ns.getMergedTraits().error,
            message,
        }, output), dataObject);
    }
    getDefaultContentType() {
        return "application/xml";
    }
    hasUnstructuredPayloadBinding(ns) {
        for (const [, member] of ns.structIterator()) {
            if (member.getMergedTraits().httpPayload) {
                return !(member.isStructSchema() || member.isMapSchema() || member.isListSchema());
            }
        }
        return false;
    }
}

exports.AwsEc2QueryProtocol = AwsEc2QueryProtocol;
exports.AwsJson1_0Protocol = AwsJson1_0Protocol;
exports.AwsJson1_1Protocol = AwsJson1_1Protocol;
exports.AwsJsonRpcProtocol = AwsJsonRpcProtocol;
exports.AwsQueryProtocol = AwsQueryProtocol;
exports.AwsRestJsonProtocol = AwsRestJsonProtocol;
exports.AwsRestXmlProtocol = AwsRestXmlProtocol;
exports.AwsSmithyRpcV2CborProtocol = AwsSmithyRpcV2CborProtocol;
exports.JsonCodec = JsonCodec;
exports.JsonShapeDeserializer = JsonShapeDeserializer;
exports.JsonShapeSerializer = JsonShapeSerializer;
exports.QueryShapeSerializer = QueryShapeSerializer;
exports.XmlCodec = XmlCodec;
exports.XmlShapeDeserializer = XmlShapeDeserializer;
exports.XmlShapeSerializer = XmlShapeSerializer;
exports._toBool = _toBool;
exports._toNum = _toNum;
exports._toStr = _toStr;
exports.awsExpectUnion = awsExpectUnion;
exports.loadJsonRpcErrorCode = loadJsonRpcErrorCode;
exports.loadRestJsonErrorCode = loadRestJsonErrorCode;
exports.loadRestXmlErrorCode = loadRestXmlErrorCode;
exports.parseJsonBody = parseJsonBody;
exports.parseJsonErrorBody = parseJsonErrorBody;
exports.parseXmlBody = parseXmlBody;
exports.parseXmlErrorBody = parseXmlErrorBody;


/***/ }),

/***/ 20121:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var protocols = __webpack_require__(45598);

const validate = (str) => typeof str === "string" && str.indexOf("arn:") === 0 && str.split(":").length >= 6;
const parse = (arn) => {
    const segments = arn.split(":");
    if (segments.length < 6 || segments[0] !== "arn")
        throw new Error("Malformed ARN");
    const [, partition, service, region, accountId, ...resource] = segments;
    return {
        partition,
        service,
        region,
        accountId,
        resource: resource.join(":"),
    };
};
const build = (arnObject) => {
    const { partition = "aws", service, region, accountId, resource } = arnObject;
    if ([service, region, accountId, resource].some((segment) => typeof segment !== "string")) {
        throw new Error("Input ARN object is invalid");
    }
    return `arn:${partition}:${service}:${region}:${accountId}:${resource}`;
};

function formatUrl(request) {
    const { port, query } = request;
    let { protocol, path, hostname } = request;
    if (protocol && protocol.slice(-1) !== ":") {
        protocol += ":";
    }
    if (port) {
        hostname += `:${port}`;
    }
    if (path && path.charAt(0) !== "/") {
        path = `/${path}`;
    }
    let queryString = query ? protocols.buildQueryString(query) : "";
    if (queryString && queryString[0] !== "?") {
        queryString = `?${queryString}`;
    }
    let auth = "";
    if (request.username != null || request.password != null) {
        const username = request.username ?? "";
        const password = request.password ?? "";
        auth = `${username}:${password}@`;
    }
    let fragment = "";
    if (request.fragment) {
        fragment = `#${request.fragment}`;
    }
    return `${protocol}//${auth}${hostname}${path}${queryString}${fragment}`;
}

exports.build = build;
exports.formatUrl = formatUrl;
exports.parse = parse;
exports.validate = validate;


/***/ }),

/***/ 20702:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var client = __webpack_require__(77186);
var config = __webpack_require__(99659);

const ENV_KEY = "AWS_ACCESS_KEY_ID";
const ENV_SECRET = "AWS_SECRET_ACCESS_KEY";
const ENV_SESSION = "AWS_SESSION_TOKEN";
const ENV_EXPIRATION = "AWS_CREDENTIAL_EXPIRATION";
const ENV_CREDENTIAL_SCOPE = "AWS_CREDENTIAL_SCOPE";
const ENV_ACCOUNT_ID = "AWS_ACCOUNT_ID";
const fromEnv = (init) => async () => {
    init?.logger?.debug("@aws-sdk/credential-provider-env - fromEnv");
    const accessKeyId = process.env[ENV_KEY];
    const secretAccessKey = process.env[ENV_SECRET];
    const sessionToken = process.env[ENV_SESSION];
    const expiry = process.env[ENV_EXPIRATION];
    const credentialScope = process.env[ENV_CREDENTIAL_SCOPE];
    const accountId = process.env[ENV_ACCOUNT_ID];
    if (accessKeyId && secretAccessKey) {
        const credentials = {
            accessKeyId,
            secretAccessKey,
            ...(sessionToken && { sessionToken }),
            ...(expiry && { expiration: new Date(expiry) }),
            ...(credentialScope && { credentialScope }),
            ...(accountId && { accountId }),
        };
        client.setCredentialFeature(credentials, "CREDENTIALS_ENV_VARS", "g");
        return credentials;
    }
    throw new config.CredentialsProviderError("Unable to find environment variable credentials.", { logger: init?.logger });
};

exports.ENV_ACCOUNT_ID = ENV_ACCOUNT_ID;
exports.ENV_CREDENTIAL_SCOPE = ENV_CREDENTIAL_SCOPE;
exports.ENV_EXPIRATION = ENV_EXPIRATION;
exports.ENV_KEY = ENV_KEY;
exports.ENV_SECRET = ENV_SECRET;
exports.ENV_SESSION = ENV_SESSION;
exports.fromEnv = fromEnv;


/***/ }),

/***/ 54944:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var credentialProviderEnv = __webpack_require__(20702);
var config = __webpack_require__(99659);

const ENV_IMDS_DISABLED = "AWS_EC2_METADATA_DISABLED";
const remoteProvider = async (init) => {
    const { ENV_CMDS_FULL_URI, ENV_CMDS_RELATIVE_URI, fromContainerMetadata, fromInstanceMetadata } = await __webpack_require__.e(/* import() */ 116).then(__webpack_require__.t.bind(__webpack_require__, 57116, 19));
    if (process.env[ENV_CMDS_RELATIVE_URI] || process.env[ENV_CMDS_FULL_URI]) {
        init.logger?.debug("@aws-sdk/credential-provider-node - remoteProvider::fromHttp/fromContainerMetadata");
        const { fromHttp } = await __webpack_require__.e(/* import() */ 511).then(__webpack_require__.t.bind(__webpack_require__, 95511, 19));
        return config.chain(fromHttp(init), fromContainerMetadata(init));
    }
    if (process.env[ENV_IMDS_DISABLED] && process.env[ENV_IMDS_DISABLED] !== "false") {
        return async () => {
            throw new config.CredentialsProviderError("EC2 Instance Metadata Service access disabled", { logger: init.logger });
        };
    }
    init.logger?.debug("@aws-sdk/credential-provider-node - remoteProvider::fromInstanceMetadata");
    return fromInstanceMetadata(init);
};

function memoizeChain(providers, treatAsExpired) {
    const chain = internalCreateChain(providers);
    let activeLock;
    let passiveLock;
    let credentials;
    const provider = async (options) => {
        if (options?.forceRefresh) {
            return await chain(options);
        }
        if (credentials?.expiration) {
            if (credentials?.expiration?.getTime() < Date.now()) {
                credentials = undefined;
            }
        }
        if (activeLock) {
            await activeLock;
        }
        else if (!credentials || treatAsExpired?.(credentials)) {
            if (credentials) {
                if (!passiveLock) {
                    passiveLock = chain(options)
                        .then((c) => {
                        credentials = c;
                    })
                        .finally(() => {
                        passiveLock = undefined;
                    });
                }
            }
            else {
                activeLock = chain(options)
                    .then((c) => {
                    credentials = c;
                })
                    .finally(() => {
                    activeLock = undefined;
                });
                return provider(options);
            }
        }
        return credentials;
    };
    return provider;
}
const internalCreateChain = (providers) => async (awsIdentityProperties) => {
    let lastProviderError;
    for (const provider of providers) {
        try {
            return await provider(awsIdentityProperties);
        }
        catch (err) {
            lastProviderError = err;
            if (err?.tryNextLink) {
                continue;
            }
            throw err;
        }
    }
    throw lastProviderError;
};

let multipleCredentialSourceWarningEmitted = false;
const defaultProvider = (init = {}) => memoizeChain([
    async () => {
        const profile = init.profile ?? process.env[config.ENV_PROFILE];
        if (profile) {
            const envStaticCredentialsAreSet = process.env[credentialProviderEnv.ENV_KEY] && process.env[credentialProviderEnv.ENV_SECRET];
            if (envStaticCredentialsAreSet) {
                if (!multipleCredentialSourceWarningEmitted) {
                    const warnFn = init.logger?.warn && init.logger?.constructor?.name !== "NoOpLogger"
                        ? init.logger.warn.bind(init.logger)
                        : console.warn;
                    warnFn(`@aws-sdk/credential-provider-node - defaultProvider::fromEnv WARNING:
    Multiple credential sources detected: 
    Both AWS_PROFILE and the pair AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY static credentials are set.
    This SDK will proceed with the AWS_PROFILE value.
    
    However, a future version may change this behavior to prefer the ENV static credentials.
    Please ensure that your environment only sets either the AWS_PROFILE or the
    AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY pair.
`);
                    multipleCredentialSourceWarningEmitted = true;
                }
            }
            throw new config.CredentialsProviderError("AWS_PROFILE is set, skipping fromEnv provider.", {
                logger: init.logger,
                tryNextLink: true,
            });
        }
        init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromEnv");
        return credentialProviderEnv.fromEnv(init)();
    },
    async (awsIdentityProperties) => {
        init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromSSO");
        const { ssoStartUrl, ssoAccountId, ssoRegion, ssoRoleName, ssoSession } = init;
        if (!ssoStartUrl && !ssoAccountId && !ssoRegion && !ssoRoleName && !ssoSession) {
            throw new config.CredentialsProviderError("Skipping SSO provider in default chain (inputs do not include SSO fields).", { logger: init.logger });
        }
        const { fromSSO } = await __webpack_require__.e(/* import() */ 193).then(__webpack_require__.t.bind(__webpack_require__, 75193, 19));
        return fromSSO(init)(awsIdentityProperties);
    },
    async (awsIdentityProperties) => {
        init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromIni");
        const { fromIni } = await __webpack_require__.e(/* import() */ 607).then(__webpack_require__.t.bind(__webpack_require__, 9607, 19));
        return fromIni(init)(awsIdentityProperties);
    },
    async (awsIdentityProperties) => {
        init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromProcess");
        const { fromProcess } = await __webpack_require__.e(/* import() */ 222).then(__webpack_require__.t.bind(__webpack_require__, 61222, 19));
        return fromProcess(init)(awsIdentityProperties);
    },
    async (awsIdentityProperties) => {
        init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromTokenFile");
        const { fromTokenFile } = await __webpack_require__.e(/* import() */ 69).then(__webpack_require__.t.bind(__webpack_require__, 98069, 23));
        return fromTokenFile(init)(awsIdentityProperties);
    },
    async () => {
        init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::remoteProvider");
        return (await remoteProvider(init))();
    },
    async () => {
        throw new config.CredentialsProviderError("Could not load credentials from any providers", {
            tryNextLink: false,
            logger: init.logger,
        });
    },
], credentialsTreatedAsExpired);
const credentialsWillNeedRefresh = (credentials) => credentials?.expiration !== undefined;
const credentialsTreatedAsExpired = (credentials) => credentials?.expiration !== undefined && credentials.expiration.getTime() - Date.now() < 300000;

exports.credentialsTreatedAsExpired = credentialsTreatedAsExpired;
exports.credentialsWillNeedRefresh = credentialsWillNeedRefresh;
exports.defaultProvider = defaultProvider;


/***/ }),

/***/ 17232:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var eventStreams = __webpack_require__(40051);
var node_stream = __webpack_require__(57075);

class EventSigningTransformStream extends node_stream.Transform {
    priorSignature;
    messageSigner;
    eventStreamCodec;
    systemClockOffsetProvider;
    staticCredentials;
    constructor(options) {
        super({
            autoDestroy: true,
            readableObjectMode: true,
            writableObjectMode: true,
            ...options,
        });
        this.priorSignature = options.priorSignature;
        this.eventStreamCodec = options.eventStreamCodec;
        this.messageSigner = options.messageSigner;
        this.systemClockOffsetProvider = options.systemClockOffsetProvider;
        this.staticCredentials = options.credentials?.();
    }
    async _transform(chunk, encoding, callback) {
        try {
            const now = new Date(Date.now() + (await this.systemClockOffsetProvider()));
            const dateHeader = {
                ":date": { type: "timestamp", value: now },
            };
            const signedMessage = await this.messageSigner.sign({
                message: {
                    body: chunk,
                    headers: dateHeader,
                },
                priorSignature: this.priorSignature,
            }, {
                signingDate: now,
                eventStreamCredentials: await this.staticCredentials,
            });
            this.priorSignature = signedMessage.signature;
            const serializedSigned = this.eventStreamCodec.encode({
                headers: {
                    ...dateHeader,
                    ":chunk-signature": {
                        type: "binary",
                        value: getSignatureBinary(signedMessage.signature),
                    },
                },
                body: chunk,
            });
            this.push(serializedSigned);
            return callback();
        }
        catch (err) {
            callback(err);
        }
    }
}
function getSignatureBinary(signature) {
    const buf = Buffer.from(signature, "hex");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength / Uint8Array.BYTES_PER_ELEMENT);
}

class EventStreamPayloadHandler {
    messageSigner;
    eventStreamCodec;
    systemClockOffsetProvider;
    credentials;
    constructor(options) {
        this.messageSigner = options.messageSigner;
        this.eventStreamCodec = new eventStreams.EventStreamCodec(options.utf8Encoder, options.utf8Decoder);
        this.systemClockOffsetProvider = async () => options.systemClockOffset ?? 0;
        this.credentials = options.credentials;
    }
    async handle(next, args, context = {}) {
        const request = args.request;
        const { body: payload, query } = request;
        if (!(payload instanceof node_stream.Readable)) {
            throw new Error("Eventstream payload must be a Readable stream.");
        }
        const payloadStream = payload;
        request.body = new node_stream.PassThrough({
            objectMode: true,
        });
        const match = request.headers?.authorization?.match(/Signature=([\w]+)$/);
        let priorSignature = match?.[1] ?? query?.["X-Amz-Signature"] ?? "";
        if (context.__staticSignature) {
            priorSignature = "";
        }
        const signingStream = new EventSigningTransformStream({
            priorSignature,
            eventStreamCodec: this.eventStreamCodec,
            messageSigner: await this.messageSigner(),
            systemClockOffsetProvider: this.systemClockOffsetProvider,
            credentials: this.credentials,
        });
        let resolvePipeline;
        const pipelineError = new Promise((resolve, reject) => {
            resolvePipeline = () => resolve(undefined);
            node_stream.pipeline(payloadStream, signingStream, request.body, (err) => {
                if (err) {
                    reject(new Error(`Pipeline error in @aws-sdk/eventstream-handler-node: ${err.message}`, { cause: err }));
                }
            });
        });
        let result;
        try {
            result = await Promise.race([next(args), pipelineError]);
        }
        catch (e) {
            request.body.end();
            throw e;
        }
        finally {
            resolvePipeline();
        }
        return result;
    }
}

const eventStreamPayloadHandlerProvider = (options) => new EventStreamPayloadHandler(options);

exports.eventStreamPayloadHandlerProvider = eventStreamPayloadHandlerProvider;


/***/ }),

/***/ 53996:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var protocols = __webpack_require__(45598);

function resolveEventStreamConfig(input) {
    const eventSigner = input.signer;
    const messageSigner = input.signer;
    const newInput = Object.assign(input, {
        eventSigner,
        messageSigner,
    });
    const eventStreamPayloadHandler = newInput.eventStreamPayloadHandlerProvider(newInput);
    return Object.assign(newInput, {
        eventStreamPayloadHandler,
    });
}

const eventStreamHandlingMiddleware = (options) => (next, context) => async (args) => {
    const { request } = args;
    if (!protocols.HttpRequest.isInstance(request))
        return next(args);
    return options.eventStreamPayloadHandler.handle(next, args, context);
};
const eventStreamHandlingMiddlewareOptions = {
    tags: ["EVENT_STREAM", "SIGNATURE", "HANDLE"],
    name: "eventStreamHandlingMiddleware",
    relation: "after",
    toMiddleware: "awsAuthMiddleware",
    override: true,
};

const eventStreamHeaderMiddleware = (next) => async (args) => {
    const { request } = args;
    if (!protocols.HttpRequest.isInstance(request))
        return next(args);
    request.headers = {
        ...request.headers,
        "content-type": "application/vnd.amazon.eventstream",
        "x-amz-content-sha256": "STREAMING-AWS4-HMAC-SHA256-EVENTS",
    };
    return next({
        ...args,
        request,
    });
};
const eventStreamHeaderMiddlewareOptions = {
    step: "build",
    tags: ["EVENT_STREAM", "HEADER", "CONTENT_TYPE", "CONTENT_SHA256"],
    name: "eventStreamHeaderMiddleware",
    override: true,
};

const getEventStreamPlugin = (options) => ({
    applyToStack: (clientStack) => {
        clientStack.addRelativeTo(eventStreamHandlingMiddleware(options), eventStreamHandlingMiddlewareOptions);
        clientStack.add(eventStreamHeaderMiddleware, eventStreamHeaderMiddlewareOptions);
    },
});

exports.eventStreamHandlingMiddleware = eventStreamHandlingMiddleware;
exports.eventStreamHandlingMiddlewareOptions = eventStreamHandlingMiddlewareOptions;
exports.eventStreamHeaderMiddleware = eventStreamHeaderMiddleware;
exports.eventStreamHeaderMiddlewareOptions = eventStreamHeaderMiddlewareOptions;
exports.getEventStreamPlugin = getEventStreamPlugin;
exports.resolveEventStreamConfig = resolveEventStreamConfig;


/***/ }),

/***/ 93897:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var util = __webpack_require__(20121);
var eventStreams = __webpack_require__(40051);
var protocols = __webpack_require__(45598);
var serde = __webpack_require__(38622);
var fetchHttpHandler = __webpack_require__(84878);

const isWebSocketRequest = (request) => request.protocol === "ws:" || request.protocol === "wss:";

const DEFAULT_WS_CONNECTION_TIMEOUT_MS = 3000;
class WebSocketFetchHandler {
    metadata = {
        handlerProtocol: "websocket/h1.1",
    };
    config = {};
    configPromise;
    httpHandler;
    sockets = {};
    static create(instanceOrOptions, httpHandler = new fetchHttpHandler.FetchHttpHandler()) {
        if (typeof instanceOrOptions?.handle === "function") {
            return instanceOrOptions;
        }
        return new WebSocketFetchHandler(instanceOrOptions, httpHandler);
    }
    constructor(options, httpHandler = new fetchHttpHandler.FetchHttpHandler()) {
        this.httpHandler = httpHandler;
        const setConfig = (opts) => {
            this.config = {
                ...(opts ?? {}),
            };
            return this.config;
        };
        if (typeof options === "function") {
            this.config = {};
            this.configPromise = options().then((opts) => {
                return setConfig(opts);
            });
        }
        else {
            this.configPromise = Promise.resolve(setConfig(options));
        }
    }
    destroy() {
        for (const [key, sockets] of Object.entries(this.sockets)) {
            for (const socket of sockets) {
                socket.close(1000, `Socket closed through destroy() call`);
            }
            delete this.sockets[key];
        }
    }
    async handle(request) {
        this.config = await this.configPromise;
        const { logger } = this.config;
        if (!isWebSocketRequest(request)) {
            logger?.debug?.(`@aws-sdk - ws fetching ${request.protocol}${request.hostname}${request.path}`);
            return this.httpHandler.handle(request);
        }
        const url = util.formatUrl(request);
        logger?.debug?.(`@aws-sdk - ws connecting ${url.split("?")[0]}`);
        const socket = new WebSocket(url);
        if (!this.sockets[url]) {
            this.sockets[url] = [];
        }
        this.sockets[url].push(socket);
        socket.binaryType = "arraybuffer";
        const { connectionTimeout = DEFAULT_WS_CONNECTION_TIMEOUT_MS } = this.config;
        await this.waitForReady(socket, connectionTimeout);
        const { body } = request;
        const bodyStream = getIterator(body);
        const asyncIterable = this.connect(socket, bodyStream);
        const outputPayload = toReadableStream(asyncIterable);
        return {
            response: new protocols.HttpResponse({
                statusCode: 200,
                body: outputPayload,
            }),
        };
    }
    updateHttpClientConfig(key, value) {
        this.configPromise = this.configPromise.then((config) => {
            config[key] = value;
            return config;
        });
    }
    httpHandlerConfigs() {
        return this.config ?? {};
    }
    removeNotUsableSockets(url) {
        this.sockets[url] = (this.sockets[url] ?? []).filter((socket) => ![WebSocket.CLOSING, WebSocket.CLOSED].includes(socket.readyState));
    }
    waitForReady(socket, connectionTimeout) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.removeNotUsableSockets(socket.url);
                reject({
                    $metadata: {
                        httpStatusCode: 500,
                        websocketSynthetic500Error: true,
                    },
                });
            }, connectionTimeout);
            socket.onopen = () => {
                clearTimeout(timeout);
                resolve();
            };
        });
    }
    connect(socket, data) {
        const messageQueue = [];
        let pendingResolve = null;
        let pendingReject = null;
        const push = (item) => {
            if (pendingResolve) {
                if (item.error) {
                    pendingReject(item.error);
                }
                else {
                    pendingResolve({ done: item.done, value: item.value });
                }
                pendingResolve = null;
                pendingReject = null;
            }
            else {
                messageQueue.push(item);
            }
        };
        socket.onmessage = (event) => {
            const { data } = event;
            if (typeof data === "string") {
                push({
                    done: false,
                    value: serde.fromBase64(data),
                });
            }
            else {
                push({
                    done: false,
                    value: new Uint8Array(data),
                });
            }
        };
        socket.onerror = (event) => {
            socket.close();
            push({ done: true, error: event });
        };
        socket.onclose = () => {
            this.removeNotUsableSockets(socket.url);
            push({ done: true });
        };
        const outputStream = {
            [Symbol.asyncIterator]: () => ({
                async next() {
                    if (messageQueue.length > 0) {
                        const item = messageQueue.shift();
                        if (item.error) {
                            throw item.error;
                        }
                        return { done: item.done, value: item.value };
                    }
                    return new Promise((resolve, reject) => {
                        pendingResolve = resolve;
                        pendingReject = reject;
                    });
                },
            }),
        };
        const send = async () => {
            try {
                for await (const chunk of data) {
                    if (socket.readyState >= WebSocket.CLOSING) {
                        break;
                    }
                    else {
                        socket.send(chunk);
                    }
                }
            }
            catch (err) {
                push({
                    done: true,
                    error: err,
                });
            }
            finally {
                socket.close(1000);
            }
        };
        send();
        return outputStream;
    }
}
const getIterator = (stream) => {
    if (stream[Symbol.asyncIterator]) {
        return stream;
    }
    if (isReadableStream(stream)) {
        return eventStreams.readableStreamToIterable(stream);
    }
    return {
        [Symbol.asyncIterator]: async function* () {
            yield stream;
        },
    };
};
const toReadableStream = (asyncIterable) => typeof ReadableStream === "function" ? eventStreams.iterableToReadableStream(asyncIterable) : asyncIterable;
const isReadableStream = (payload) => typeof ReadableStream === "function" && payload instanceof ReadableStream;

const websocketEndpointMiddleware = (config, options) => (next) => (args) => {
    const { request } = args;
    if (protocols.HttpRequest.isInstance(request) &&
        config.requestHandler.metadata?.handlerProtocol?.toLowerCase().includes("websocket")) {
        request.protocol = "wss:";
        request.method = "GET";
        request.path = `${request.path}-websocket`;
        const { headers } = request;
        delete headers["content-type"];
        delete headers["x-amz-content-sha256"];
        for (const name of Object.keys(headers)) {
            if (name.indexOf(options.headerPrefix) === 0) {
                const chunkedName = name.replace(options.headerPrefix, "");
                request.query[chunkedName] = headers[name];
            }
        }
        if (headers["x-amz-user-agent"]) {
            request.query["user-agent"] = headers["x-amz-user-agent"];
        }
        request.headers = { host: headers.host ?? request.hostname };
    }
    return next(args);
};
const websocketEndpointMiddlewareOptions = {
    name: "websocketEndpointMiddleware",
    tags: ["WEBSOCKET", "EVENT_STREAM"],
    relation: "after",
    toMiddleware: "eventStreamHeaderMiddleware",
    override: true,
};

const injectSessionIdMiddleware = () => (next) => async (args) => {
    const requestParams = {
        ...args.input,
    };
    const response = await next(args);
    const output = response.output;
    if (requestParams.SessionId && output.SessionId == null) {
        output.SessionId = requestParams.SessionId;
    }
    return response;
};
const injectSessionIdMiddlewareOptions = {
    step: "initialize",
    name: "injectSessionIdMiddleware",
    tags: ["WEBSOCKET", "EVENT_STREAM"],
    override: true,
};

const getWebSocketPlugin = (config, options) => ({
    applyToStack: (clientStack) => {
        clientStack.addRelativeTo(websocketEndpointMiddleware(config, options), websocketEndpointMiddlewareOptions);
        clientStack.add(injectSessionIdMiddleware(), injectSessionIdMiddlewareOptions);
    },
});

class WebsocketSignatureV4 {
    signer;
    constructor(options) {
        this.signer = options.signer;
    }
    presign(originalRequest, options = {}) {
        return this.signer.presign(originalRequest, options);
    }
    async sign(toSign, options) {
        if (protocols.HttpRequest.isInstance(toSign) && isWebSocketRequest(toSign)) {
            const signedRequest = await this.signer.presign({ ...toSign, body: "" }, {
                ...options,
                expiresIn: 60,
                unsignableHeaders: new Set(Object.keys(toSign.headers).filter((header) => header !== "host")),
            });
            return {
                ...signedRequest,
                body: toSign.body,
            };
        }
        else {
            return this.signer.sign(toSign, options);
        }
    }
    signMessage(message, args) {
        return this.signer.signMessage(message, args);
    }
}

const resolveWebSocketConfig = (input) => {
    const { signer } = input;
    return Object.assign(input, {
        signer: async (authScheme) => {
            const signerObj = await signer(authScheme);
            if (validateSigner(signerObj)) {
                return new WebsocketSignatureV4({ signer: signerObj });
            }
            throw new Error("Expected WebsocketSignatureV4 signer, please check the client constructor.");
        },
    });
};
const validateSigner = (signer) => !!signer;

class EventSigningTransformStream extends TransformStream {
    constructor(initialSignature, messageSigner, eventStreamCodec, systemClockOffsetProvider, credentials) {
        let priorSignature = initialSignature;
        const staticCredentials = credentials?.();
        super({
            start() { },
            async transform(chunk, controller) {
                try {
                    const now = new Date(Date.now() + (await systemClockOffsetProvider()));
                    const dateHeader = {
                        ":date": { type: "timestamp", value: now },
                    };
                    const signedMessage = await messageSigner.sign({
                        message: {
                            body: chunk,
                            headers: dateHeader,
                        },
                        priorSignature: priorSignature,
                    }, {
                        signingDate: now,
                        eventStreamCredentials: await staticCredentials,
                    });
                    priorSignature = signedMessage.signature;
                    const serializedSigned = eventStreamCodec.encode({
                        headers: {
                            ...dateHeader,
                            ":chunk-signature": {
                                type: "binary",
                                value: serde.fromHex(signedMessage.signature),
                            },
                        },
                        body: chunk,
                    });
                    controller.enqueue(serializedSigned);
                }
                catch (error) {
                    controller.error(error);
                }
            },
        });
    }
}

class EventStreamPayloadHandler {
    messageSigner;
    eventStreamCodec;
    systemClockOffsetProvider;
    credentials;
    constructor(options) {
        this.messageSigner = options.messageSigner;
        this.eventStreamCodec = new eventStreams.EventStreamCodec(options.utf8Encoder, options.utf8Decoder);
        this.systemClockOffsetProvider = async () => options.systemClockOffset ?? 0;
        this.credentials = options.credentials;
    }
    async handle(next, args, context = {}) {
        const request = args.request;
        const { body: payload, headers, query } = request;
        if (!(payload instanceof ReadableStream)) {
            throw new Error("Eventstream payload must be a ReadableStream.");
        }
        const placeHolderStream = new TransformStream();
        request.body = placeHolderStream.readable;
        const match = (headers?.authorization ?? "").match(/Signature=(\w+)$/);
        let priorSignature = (match ?? [])[1] ?? (query && query["X-Amz-Signature"]) ?? "";
        if (context.__staticSignature) {
            priorSignature = "";
        }
        const signingStream = new EventSigningTransformStream(priorSignature, await this.messageSigner(), this.eventStreamCodec, this.systemClockOffsetProvider, this.credentials);
        payload.pipeThrough(signingStream).pipeThrough(placeHolderStream);
        let result;
        try {
            result = await next(args);
        }
        catch (e) {
            const p = payload.cancel?.();
            if (p instanceof Promise) {
                p.catch(() => { });
            }
            throw e;
        }
        return result;
    }
}

const eventStreamPayloadHandlerProvider = (options) => new EventStreamPayloadHandler(options);

exports.WebSocketFetchHandler = WebSocketFetchHandler;
exports.eventStreamPayloadHandlerProvider = eventStreamPayloadHandlerProvider;
exports.getWebSocketPlugin = getWebSocketPlugin;
exports.resolveWebSocketConfig = resolveWebSocketConfig;


/***/ }),

/***/ 81533:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var client = __webpack_require__(77186);
var httpAuthSchemes = __webpack_require__(65741);
var config = __webpack_require__(99659);
var node_fs = __webpack_require__(73024);

const fromEnvSigningName = ({ logger, signingName } = {}) => async () => {
    logger?.debug?.("@aws-sdk/token-providers - fromEnvSigningName");
    if (!signingName) {
        throw new config.TokenProviderError("Please pass 'signingName' to compute environment variable key", { logger });
    }
    const bearerTokenKey = httpAuthSchemes.getBearerTokenEnvKey(signingName);
    if (!(bearerTokenKey in process.env)) {
        throw new config.TokenProviderError(`Token not present in '${bearerTokenKey}' environment variable`, { logger });
    }
    const token = { token: process.env[bearerTokenKey] };
    client.setTokenFeature(token, "BEARER_SERVICE_ENV_VARS", "3");
    return token;
};

const EXPIRE_WINDOW_MS = 5 * 60 * 1000;
const REFRESH_MESSAGE = `To refresh this SSO session run 'aws sso login' with the corresponding profile.`;

const getSsoOidcClient = async (ssoRegion, init = {}, callerClientConfig) => {
    const { SSOOIDCClient } = await __webpack_require__.e(/* import() */ 657).then(__webpack_require__.t.bind(__webpack_require__, 79657, 19));
    const coalesce = (prop) => init.clientConfig?.[prop] ?? init.parentClientConfig?.[prop] ?? callerClientConfig?.[prop];
    const ssoOidcClient = new SSOOIDCClient(Object.assign({}, init.clientConfig ?? {}, {
        region: ssoRegion ?? init.clientConfig?.region,
        logger: coalesce("logger"),
        userAgentAppId: coalesce("userAgentAppId"),
    }));
    return ssoOidcClient;
};

const getNewSsoOidcToken = async (ssoToken, ssoRegion, init = {}, callerClientConfig) => {
    const { CreateTokenCommand } = await __webpack_require__.e(/* import() */ 657).then(__webpack_require__.t.bind(__webpack_require__, 79657, 19));
    const ssoOidcClient = await getSsoOidcClient(ssoRegion, init, callerClientConfig);
    return ssoOidcClient.send(new CreateTokenCommand({
        clientId: ssoToken.clientId,
        clientSecret: ssoToken.clientSecret,
        refreshToken: ssoToken.refreshToken,
        grantType: "refresh_token",
    }));
};

const validateTokenExpiry = (token) => {
    if (token.expiration && token.expiration.getTime() < Date.now()) {
        throw new config.TokenProviderError(`Token is expired. ${REFRESH_MESSAGE}`, false);
    }
};

const validateTokenKey = (key, value, forRefresh = false) => {
    if (typeof value === "undefined") {
        throw new config.TokenProviderError(`Value not present for '${key}' in SSO Token${forRefresh ? ". Cannot refresh" : ""}. ${REFRESH_MESSAGE}`, false);
    }
};

const { writeFile } = node_fs.promises;
const writeSSOTokenToFile = (id, ssoToken) => {
    const tokenFilepath = config.getSSOTokenFilepath(id);
    const tokenString = JSON.stringify(ssoToken, null, 2);
    return writeFile(tokenFilepath, tokenString);
};

const lastRefreshAttemptTime = new Date(0);
const fromSso = (init = {}) => async ({ callerClientConfig } = {}) => {
    init.logger?.debug("@aws-sdk/token-providers - fromSso");
    const profiles = await config.parseKnownFiles(init);
    const profileName = config.getProfileName({
        profile: init.profile ?? callerClientConfig?.profile,
    });
    const profile = profiles[profileName];
    if (!profile) {
        throw new config.TokenProviderError(`Profile '${profileName}' could not be found in shared credentials file.`, false);
    }
    else if (!profile["sso_session"]) {
        throw new config.TokenProviderError(`Profile '${profileName}' is missing required property 'sso_session'.`);
    }
    const ssoSessionName = profile["sso_session"];
    const ssoSessions = await config.loadSsoSessionData(init);
    const ssoSession = ssoSessions[ssoSessionName];
    if (!ssoSession) {
        throw new config.TokenProviderError(`Sso session '${ssoSessionName}' could not be found in shared credentials file.`, false);
    }
    for (const ssoSessionRequiredKey of ["sso_start_url", "sso_region"]) {
        if (!ssoSession[ssoSessionRequiredKey]) {
            throw new config.TokenProviderError(`Sso session '${ssoSessionName}' is missing required property '${ssoSessionRequiredKey}'.`, false);
        }
    }
    ssoSession["sso_start_url"];
    const ssoRegion = ssoSession["sso_region"];
    let ssoToken;
    try {
        ssoToken = await config.getSSOTokenFromFile(ssoSessionName);
    }
    catch (e) {
        throw new config.TokenProviderError(`The SSO session token associated with profile=${profileName} was not found or is invalid. ${REFRESH_MESSAGE}`, false);
    }
    validateTokenKey("accessToken", ssoToken.accessToken);
    validateTokenKey("expiresAt", ssoToken.expiresAt);
    const { accessToken, expiresAt } = ssoToken;
    const existingToken = { token: accessToken, expiration: new Date(expiresAt) };
    if (existingToken.expiration.getTime() - Date.now() > EXPIRE_WINDOW_MS) {
        return existingToken;
    }
    if (Date.now() - lastRefreshAttemptTime.getTime() < 30 * 1000) {
        validateTokenExpiry(existingToken);
        return existingToken;
    }
    validateTokenKey("clientId", ssoToken.clientId, true);
    validateTokenKey("clientSecret", ssoToken.clientSecret, true);
    validateTokenKey("refreshToken", ssoToken.refreshToken, true);
    try {
        lastRefreshAttemptTime.setTime(Date.now());
        const newSsoOidcToken = await getNewSsoOidcToken(ssoToken, ssoRegion, init, callerClientConfig);
        validateTokenKey("accessToken", newSsoOidcToken.accessToken);
        validateTokenKey("expiresIn", newSsoOidcToken.expiresIn);
        const newTokenExpiration = new Date(Date.now() + newSsoOidcToken.expiresIn * 1000);
        try {
            await writeSSOTokenToFile(ssoSessionName, {
                ...ssoToken,
                accessToken: newSsoOidcToken.accessToken,
                expiresAt: newTokenExpiration.toISOString(),
                refreshToken: newSsoOidcToken.refreshToken,
            });
        }
        catch (error) {
        }
        return {
            token: newSsoOidcToken.accessToken,
            expiration: newTokenExpiration,
        };
    }
    catch (error) {
        validateTokenExpiry(existingToken);
        return existingToken;
    }
};

const fromStatic = ({ token, logger }) => async () => {
    logger?.debug("@aws-sdk/token-providers - fromStatic");
    if (!token || !token.token) {
        throw new config.TokenProviderError(`Please pass a valid token to fromStatic`, false);
    }
    return token;
};

const nodeProvider = (init = {}) => config.memoize(config.chain(fromSso(init), async () => {
    throw new config.TokenProviderError("Could not load token from any providers", false);
}), (token) => token.expiration !== undefined && token.expiration.getTime() - Date.now() < 300000, (token) => token.expiration !== undefined);

exports.fromEnvSigningName = fromEnvSigningName;
exports.fromSso = fromSso;
exports.fromStatic = fromStatic;
exports.nodeProvider = nodeProvider;


/***/ }),

/***/ 30597:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var xmlParser = __webpack_require__(12590);

const ATTR_ESCAPE_RE = /[&<>"]/g;
const ATTR_ESCAPE_MAP = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
};
function escapeAttribute(value) {
    return value.replace(ATTR_ESCAPE_RE, (ch) => ATTR_ESCAPE_MAP[ch]);
}

const ELEMENT_ESCAPE_RE = /[&"'<>\r\n\u0085\u2028]/g;
const ELEMENT_ESCAPE_MAP = {
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
    "<": "&lt;",
    ">": "&gt;",
    "\r": "&#x0D;",
    "\n": "&#x0A;",
    "\u0085": "&#x85;",
    "\u2028": "&#x2028;",
};
function escapeElement(value) {
    return value.replace(ELEMENT_ESCAPE_RE, (ch) => ELEMENT_ESCAPE_MAP[ch]);
}

class XmlText {
    value;
    constructor(value) {
        this.value = value;
    }
    toString() {
        return escapeElement("" + this.value);
    }
}

class XmlNode {
    name;
    children;
    attributes = {};
    static of(name, childText, withName) {
        const node = new XmlNode(name);
        if (childText !== undefined) {
            node.addChildNode(new XmlText(childText));
        }
        if (withName !== undefined) {
            node.withName(withName);
        }
        return node;
    }
    constructor(name, children = []) {
        this.name = name;
        this.children = children;
    }
    withName(name) {
        this.name = name;
        return this;
    }
    addAttribute(name, value) {
        this.attributes[name] = value;
        return this;
    }
    addChildNode(child) {
        this.children.push(child);
        return this;
    }
    removeAttribute(name) {
        delete this.attributes[name];
        return this;
    }
    n(name) {
        this.name = name;
        return this;
    }
    c(child) {
        this.children.push(child);
        return this;
    }
    a(name, value) {
        if (value != null) {
            this.attributes[name] = value;
        }
        return this;
    }
    cc(input, field, withName = field) {
        if (input[field] != null) {
            const node = XmlNode.of(field, input[field]).withName(withName);
            this.c(node);
        }
    }
    l(input, listName, memberName, valueProvider) {
        if (input[listName] != null) {
            const nodes = valueProvider();
            nodes.map((node) => {
                node.withName(memberName);
                this.c(node);
            });
        }
    }
    lc(input, listName, memberName, valueProvider) {
        if (input[listName] != null) {
            const nodes = valueProvider();
            const containerNode = new XmlNode(memberName);
            nodes.map((node) => {
                containerNode.c(node);
            });
            this.c(containerNode);
        }
    }
    toString() {
        const hasChildren = Boolean(this.children.length);
        let xmlText = `<${this.name}`;
        const attributes = this.attributes;
        for (const attributeName of Object.keys(attributes)) {
            const attribute = attributes[attributeName];
            if (attribute != null) {
                xmlText += ` ${attributeName}="${escapeAttribute("" + attribute)}"`;
            }
        }
        return (xmlText += !hasChildren ? "/>" : `>${this.children.map((c) => c.toString()).join("")}</${this.name}>`);
    }
}

exports.parseXML = xmlParser.parseXML;
exports.XmlNode = XmlNode;
exports.XmlText = XmlText;


/***/ }),

/***/ 36412:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EntityDecoderImpl = exports.CURRENCY = exports.COMMON_HTML = exports.XML = void 0;
exports.XML = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
};
exports.COMMON_HTML = {
    nbsp: "\u00a0",
    copy: "\u00a9",
    reg: "\u00ae",
    trade: "\u2122",
    mdash: "\u2014",
    ndash: "\u2013",
    hellip: "\u2026",
    laquo: "\u00ab",
    raquo: "\u00bb",
    lsquo: "\u2018",
    rsquo: "\u2019",
    ldquo: "\u201c",
    rdquo: "\u201d",
    bull: "\u2022",
    para: "\u00b6",
    sect: "\u00a7",
    deg: "\u00b0",
    frac12: "\u00bd",
    frac14: "\u00bc",
    frac34: "\u00be",
};
exports.CURRENCY = {
    cent: "\u00a2",
    pound: "\u00a3",
    curren: "\u00a4",
    yen: "\u00a5",
    euro: "\u20ac",
    dollar: "$",
    fnof: "\u0192",
    inr: "\u20b9",
    af: "\u060b",
    birr: "\u1265\u122d",
    peso: "\u20b1",
    rub: "\u20bd",
    won: "\u20a9",
    yuan: "\u00a5",
    cedil: "\u00b8",
};
const SPECIAL_CHARS = new Set("!?\\/[]$%{}^&*()<>|+");
function validateEntityName(name) {
    if (name[0] === "#") {
        throw new Error(`[EntityReplacer] Invalid character '#' in entity name: "${name}"`);
    }
    for (const ch of name) {
        if (SPECIAL_CHARS.has(ch)) {
            throw new Error(`[EntityReplacer] Invalid character '${ch}' in entity name: "${name}"`);
        }
    }
    return name;
}
function mergeEntityMaps(...maps) {
    const out = Object.create(null);
    for (const map of maps) {
        if (!map) {
            continue;
        }
        for (const key of Object.keys(map)) {
            const raw = map[key];
            if (typeof raw === "string") {
                out[key] = raw;
            }
            else if (raw && typeof raw === "object" && raw.val !== undefined) {
                const val = raw.val;
                if (typeof val === "string") {
                    out[key] = val;
                }
            }
        }
    }
    return out;
}
const LIMIT_TIER_EXTERNAL = "external";
const LIMIT_TIER_BASE = "base";
const LIMIT_TIER_ALL = "all";
function parseLimitTiers(raw) {
    if (!raw || raw === LIMIT_TIER_EXTERNAL) {
        return new Set([LIMIT_TIER_EXTERNAL]);
    }
    if (raw === LIMIT_TIER_ALL) {
        return new Set([LIMIT_TIER_ALL]);
    }
    if (raw === LIMIT_TIER_BASE) {
        return new Set([LIMIT_TIER_BASE]);
    }
    if (Array.isArray(raw)) {
        return new Set(raw);
    }
    return new Set([LIMIT_TIER_EXTERNAL]);
}
const NCR_LEVEL = Object.freeze({ allow: 0, leave: 1, remove: 2, throw: 3 });
const XML10_ALLOWED_C0 = new Set([0x09, 0x0a, 0x0d]);
function parseNCRConfig(ncr) {
    if (!ncr) {
        return { xmlVersion: 1.0, onLevel: NCR_LEVEL.allow, nullLevel: NCR_LEVEL.remove };
    }
    const xmlVersion = ncr.xmlVersion === 1.1 ? 1.1 : 1.0;
    const onLevel = NCR_LEVEL[ncr.onNCR ?? "allow"] ?? NCR_LEVEL.allow;
    const nullLevel = NCR_LEVEL[ncr.nullNCR ?? "remove"] ?? NCR_LEVEL.remove;
    const clampedNull = Math.max(nullLevel, NCR_LEVEL.remove);
    return { xmlVersion, onLevel, nullLevel: clampedNull };
}
const EntityDecoderImpl = class EntityDecoderImpl {
    _limit;
    _maxTotalExpansions;
    _maxExpandedLength;
    _postCheck;
    _limitTiers;
    _numericAllowed;
    _baseMap;
    _externalMap;
    _inputMap;
    _totalExpansions;
    _expandedLength;
    _removeSet;
    _leaveSet;
    _ncrXmlVersion;
    _ncrOnLevel;
    _ncrNullLevel;
    constructor(options = {}) {
        this._limit = options.limit || {};
        this._maxTotalExpansions = this._limit.maxTotalExpansions || 0;
        this._maxExpandedLength = this._limit.maxExpandedLength || 0;
        this._postCheck = typeof options.postCheck === "function" ? options.postCheck : (r) => r;
        this._limitTiers = parseLimitTiers(this._limit.applyLimitsTo ?? LIMIT_TIER_EXTERNAL);
        this._numericAllowed = options.numericAllowed ?? true;
        this._baseMap = mergeEntityMaps(exports.XML, options.namedEntities || null);
        this._externalMap = Object.create(null);
        this._inputMap = Object.create(null);
        this._totalExpansions = 0;
        this._expandedLength = 0;
        this._removeSet = new Set(options.remove && Array.isArray(options.remove) ? options.remove : []);
        this._leaveSet = new Set(options.leave && Array.isArray(options.leave) ? options.leave : []);
        const ncrCfg = parseNCRConfig(options.ncr);
        this._ncrXmlVersion = ncrCfg.xmlVersion;
        this._ncrOnLevel = ncrCfg.onLevel;
        this._ncrNullLevel = ncrCfg.nullLevel;
    }
    setExternalEntities(map) {
        if (map) {
            for (const key of Object.keys(map)) {
                validateEntityName(key);
            }
        }
        this._externalMap = mergeEntityMaps(map);
    }
    addExternalEntity(key, value) {
        validateEntityName(key);
        if (typeof value === "string" && value.indexOf("&") === -1) {
            this._externalMap[key] = value;
        }
    }
    addInputEntities(map) {
        this._totalExpansions = 0;
        this._expandedLength = 0;
        this._inputMap = mergeEntityMaps(map);
    }
    reset() {
        this._inputMap = Object.create(null);
        this._totalExpansions = 0;
        this._expandedLength = 0;
        return this;
    }
    setXmlVersion(version) {
        this._ncrXmlVersion = version === "1.1" || version === 1.1 ? 1.1 : 1.0;
    }
    decode(str) {
        if (typeof str !== "string" || str.length === 0) {
            return str;
        }
        const original = str;
        const chunks = [];
        const len = str.length;
        let last = 0;
        let i = 0;
        const limitExpansions = this._maxTotalExpansions > 0;
        const limitLength = this._maxExpandedLength > 0;
        const checkLimits = limitExpansions || limitLength;
        while (i < len) {
            if (str.charCodeAt(i) !== 38) {
                i++;
                continue;
            }
            let j = i + 1;
            while (j < len && str.charCodeAt(j) !== 59 && j - i <= 32) {
                j++;
            }
            if (j >= len || str.charCodeAt(j) !== 59) {
                i++;
                continue;
            }
            const token = str.slice(i + 1, j);
            if (token.length === 0) {
                i++;
                continue;
            }
            let replacement;
            let tier;
            if (this._removeSet.has(token)) {
                replacement = "";
                if (tier === undefined) {
                    tier = LIMIT_TIER_EXTERNAL;
                }
            }
            else if (this._leaveSet.has(token)) {
                i++;
                continue;
            }
            else if (token.charCodeAt(0) === 35) {
                const ncrResult = this._resolveNCR(token);
                if (ncrResult === undefined) {
                    i++;
                    continue;
                }
                replacement = ncrResult;
                tier = LIMIT_TIER_BASE;
            }
            else {
                const resolved = this._resolveName(token);
                replacement = resolved?.value;
                tier = resolved?.tier;
            }
            if (replacement === undefined) {
                i++;
                continue;
            }
            if (i > last) {
                chunks.push(str.slice(last, i));
            }
            chunks.push(replacement);
            last = j + 1;
            i = last;
            if (checkLimits && this._tierCounts(tier)) {
                if (limitExpansions) {
                    this._totalExpansions++;
                    if (this._totalExpansions > this._maxTotalExpansions) {
                        throw new Error(`[EntityReplacer] Entity expansion count limit exceeded: ` +
                            `${this._totalExpansions} > ${this._maxTotalExpansions}`);
                    }
                }
                if (limitLength) {
                    const delta = replacement.length - (token.length + 2);
                    if (delta > 0) {
                        this._expandedLength += delta;
                        if (this._expandedLength > this._maxExpandedLength) {
                            throw new Error(`[EntityReplacer] Expanded content length limit exceeded: ` +
                                `${this._expandedLength} > ${this._maxExpandedLength}`);
                        }
                    }
                }
            }
        }
        if (last < len) {
            chunks.push(str.slice(last));
        }
        const result = chunks.length === 0 ? str : chunks.join("");
        return this._postCheck(result, original);
    }
    _tierCounts(tier) {
        if (this._limitTiers.has(LIMIT_TIER_ALL)) {
            return true;
        }
        return this._limitTiers.has(tier);
    }
    _resolveName(name) {
        if (name in this._inputMap) {
            return { value: this._inputMap[name], tier: LIMIT_TIER_EXTERNAL };
        }
        if (name in this._externalMap) {
            return { value: this._externalMap[name], tier: LIMIT_TIER_EXTERNAL };
        }
        if (name in this._baseMap) {
            return { value: this._baseMap[name], tier: LIMIT_TIER_BASE };
        }
        return undefined;
    }
    _classifyNCR(cp) {
        if (cp === 0) {
            return this._ncrNullLevel;
        }
        if (cp >= 0xd800 && cp <= 0xdfff) {
            return NCR_LEVEL.remove;
        }
        if (this._ncrXmlVersion === 1.0) {
            if (cp >= 0x01 && cp <= 0x1f && !XML10_ALLOWED_C0.has(cp)) {
                return NCR_LEVEL.remove;
            }
        }
        return -1;
    }
    _applyNCRAction(action, token, cp) {
        switch (action) {
            case NCR_LEVEL.allow:
                return String.fromCodePoint(cp);
            case NCR_LEVEL.remove:
                return "";
            case NCR_LEVEL.leave:
                return undefined;
            case NCR_LEVEL.throw:
                throw new Error(`[EntityDecoder] Prohibited numeric character reference ` +
                    `&${token}; (U+${cp.toString(16).toUpperCase().padStart(4, "0")})`);
            default:
                return String.fromCodePoint(cp);
        }
    }
    _resolveNCR(token) {
        const second = token.charCodeAt(1);
        let cp;
        if (second === 120 || second === 88) {
            cp = parseInt(token.slice(2), 16);
        }
        else {
            cp = parseInt(token.slice(1), 10);
        }
        if (Number.isNaN(cp) || cp < 0 || cp > 0x10ffff) {
            return undefined;
        }
        const minimum = this._classifyNCR(cp);
        if (!this._numericAllowed && minimum < NCR_LEVEL.remove) {
            return undefined;
        }
        const effective = minimum === -1 ? this._ncrOnLevel : Math.max(this._ncrOnLevel, minimum);
        return this._applyNCRAction(effective, token, cp);
    }
};
exports.EntityDecoderImpl = EntityDecoderImpl;


/***/ }),

/***/ 12590:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parseXML = parseXML;
const fast_xml_parser_1 = __webpack_require__(19815);
const nodable_entities_1 = __webpack_require__(36412);
const entityDecoder = new nodable_entities_1.EntityDecoderImpl({
    namedEntities: { ...nodable_entities_1.XML, ...nodable_entities_1.COMMON_HTML, ...nodable_entities_1.CURRENCY },
    numericAllowed: true,
    limit: {
        maxTotalExpansions: Infinity,
    },
    ncr: {
        xmlVersion: 1.1,
    },
});
const parser = new fast_xml_parser_1.XMLParser({
    attributeNamePrefix: "",
    processEntities: {
        enabled: true,
        maxTotalExpansions: Infinity,
    },
    htmlEntities: true,
    entityDecoder: {
        setExternalEntities: (entities) => {
            entityDecoder.setExternalEntities(entities);
        },
        addInputEntities: (entities) => {
            entityDecoder.addInputEntities(entities);
        },
        reset: () => {
            entityDecoder.reset();
        },
        decode: (text) => {
            return entityDecoder.decode(text);
        },
        setXmlVersion: (version) => void {},
    },
    ignoreAttributes: false,
    ignoreDeclaration: true,
    parseTagValue: false,
    trimValues: false,
    tagValueProcessor: (_, val) => (val.trim() === "" && val.includes("\n") ? "" : undefined),
    maxNestedTags: Infinity,
});
function parseXML(xmlString) {
    return parser.parse(xmlString, true);
}


/***/ }),

/***/ 86578:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var types = __webpack_require__(39654);
var protocols = __webpack_require__(45598);
var client = __webpack_require__(63234);

const getSmithyContext = (context) => context[types.SMITHY_CONTEXT_KEY] || (context[types.SMITHY_CONTEXT_KEY] = {});

const resolveAuthOptions = (candidateAuthOptions, authSchemePreference) => {
    if (!authSchemePreference || authSchemePreference.length === 0) {
        return candidateAuthOptions;
    }
    const preferredAuthOptions = [];
    for (const preferredSchemeName of authSchemePreference) {
        for (const candidateAuthOption of candidateAuthOptions) {
            const candidateAuthSchemeName = candidateAuthOption.schemeId.split("#")[1];
            if (candidateAuthSchemeName === preferredSchemeName) {
                preferredAuthOptions.push(candidateAuthOption);
            }
        }
    }
    for (const candidateAuthOption of candidateAuthOptions) {
        if (!preferredAuthOptions.find(({ schemeId }) => schemeId === candidateAuthOption.schemeId)) {
            preferredAuthOptions.push(candidateAuthOption);
        }
    }
    return preferredAuthOptions;
};

function convertHttpAuthSchemesToMap(httpAuthSchemes) {
    const map = new Map();
    for (const scheme of httpAuthSchemes) {
        map.set(scheme.schemeId, scheme);
    }
    return map;
}
const httpAuthSchemeMiddleware = (config, mwOptions) => (next, context) => async (args) => {
    const options = config.httpAuthSchemeProvider(await mwOptions.httpAuthSchemeParametersProvider(config, context, args.input));
    const authSchemePreference = config.authSchemePreference ? await config.authSchemePreference() : [];
    const resolvedOptions = resolveAuthOptions(options, authSchemePreference);
    const authSchemes = convertHttpAuthSchemesToMap(config.httpAuthSchemes);
    const smithyContext = client.getSmithyContext(context);
    const failureReasons = [];
    for (const option of resolvedOptions) {
        const scheme = authSchemes.get(option.schemeId);
        if (!scheme) {
            failureReasons.push(`HttpAuthScheme \`${option.schemeId}\` was not enabled for this service.`);
            continue;
        }
        const identityProvider = scheme.identityProvider(await mwOptions.identityProviderConfigProvider(config));
        if (!identityProvider) {
            failureReasons.push(`HttpAuthScheme \`${option.schemeId}\` did not have an IdentityProvider configured.`);
            continue;
        }
        const { identityProperties = {}, signingProperties = {} } = option.propertiesExtractor?.(config, context) || {};
        option.identityProperties = Object.assign(option.identityProperties || {}, identityProperties);
        option.signingProperties = Object.assign(option.signingProperties || {}, signingProperties);
        smithyContext.selectedHttpAuthScheme = {
            httpAuthOption: option,
            identity: await identityProvider(option.identityProperties),
            signer: scheme.signer,
        };
        break;
    }
    if (!smithyContext.selectedHttpAuthScheme) {
        throw new Error(failureReasons.join("\n"));
    }
    return next(args);
};

const httpAuthSchemeEndpointRuleSetMiddlewareOptions = {
    step: "serialize",
    tags: ["HTTP_AUTH_SCHEME"],
    name: "httpAuthSchemeMiddleware",
    override: true,
    relation: "before",
    toMiddleware: "endpointV2Middleware",
};
const getHttpAuthSchemeEndpointRuleSetPlugin = (config, { httpAuthSchemeParametersProvider, identityProviderConfigProvider, }) => ({
    applyToStack: (clientStack) => {
        clientStack.addRelativeTo(httpAuthSchemeMiddleware(config, {
            httpAuthSchemeParametersProvider,
            identityProviderConfigProvider,
        }), httpAuthSchemeEndpointRuleSetMiddlewareOptions);
    },
});

const httpAuthSchemeMiddlewareOptions = {
    step: "serialize",
    tags: ["HTTP_AUTH_SCHEME"],
    name: "httpAuthSchemeMiddleware",
    override: true,
    relation: "before",
    toMiddleware: "serializerMiddleware",
};
const getHttpAuthSchemePlugin = (config, { httpAuthSchemeParametersProvider, identityProviderConfigProvider, }) => ({
    applyToStack: (clientStack) => {
        clientStack.addRelativeTo(httpAuthSchemeMiddleware(config, {
            httpAuthSchemeParametersProvider,
            identityProviderConfigProvider,
        }), httpAuthSchemeMiddlewareOptions);
    },
});

const defaultErrorHandler = (signingProperties) => (error) => {
    throw error;
};
const defaultSuccessHandler = (httpResponse, signingProperties) => { };
const httpSigningMiddleware = (config) => (next, context) => async (args) => {
    if (!protocols.HttpRequest.isInstance(args.request)) {
        return next(args);
    }
    const smithyContext = client.getSmithyContext(context);
    const scheme = smithyContext.selectedHttpAuthScheme;
    if (!scheme) {
        throw new Error(`No HttpAuthScheme was selected: unable to sign request`);
    }
    const { httpAuthOption: { signingProperties = {} }, identity, signer, } = scheme;
    const output = await next({
        ...args,
        request: await signer.sign(args.request, identity, signingProperties),
    }).catch((signer.errorHandler || defaultErrorHandler)(signingProperties));
    (signer.successHandler || defaultSuccessHandler)(output.response, signingProperties);
    return output;
};

const httpSigningMiddlewareOptions = {
    step: "finalizeRequest",
    tags: ["HTTP_SIGNING"],
    name: "httpSigningMiddleware",
    aliases: ["apiKeyMiddleware", "tokenMiddleware", "awsAuthMiddleware"],
    override: true,
    relation: "after",
    toMiddleware: "retryMiddleware",
};
const getHttpSigningPlugin = (config) => ({
    applyToStack: (clientStack) => {
        clientStack.addRelativeTo(httpSigningMiddleware(), httpSigningMiddlewareOptions);
    },
});

const normalizeProvider = (input) => {
    if (typeof input === "function")
        return input;
    const promisified = Promise.resolve(input);
    return () => promisified;
};

const makePagedClientRequest = async (CommandCtor, client, input, withCommand = (_) => _, ...args) => {
    let command = new CommandCtor(input);
    command = withCommand(command) ?? command;
    return await client.send(command, ...args);
};
function createPaginator(ClientCtor, CommandCtor, inputTokenName, outputTokenName, pageSizeTokenName) {
    return async function* paginateOperation(config, input, ...additionalArguments) {
        const _input = input;
        let token = config.startingToken ?? _input[inputTokenName];
        let hasNext = true;
        let page;
        while (hasNext) {
            _input[inputTokenName] = token;
            if (pageSizeTokenName) {
                _input[pageSizeTokenName] = _input[pageSizeTokenName] ?? config.pageSize;
            }
            if (config.client instanceof ClientCtor) {
                page = await makePagedClientRequest(CommandCtor, config.client, input, config.withCommand, ...additionalArguments);
            }
            else {
                throw new Error(`Invalid client, expected instance of ${ClientCtor.name}`);
            }
            yield page;
            const prevToken = token;
            token = get(page, outputTokenName);
            hasNext = !!(token && (!config.stopOnSameToken || token !== prevToken));
        }
        return undefined;
    };
}
const get = (fromObject, path) => {
    let cursor = fromObject;
    const pathComponents = path.split(".");
    for (const step of pathComponents) {
        if (!cursor || typeof cursor !== "object") {
            return undefined;
        }
        cursor = cursor[step];
    }
    return cursor;
};

function setFeature(context, feature, value) {
    if (!context.__smithy_context) {
        context.__smithy_context = {
            features: {},
        };
    }
    else if (!context.__smithy_context.features) {
        context.__smithy_context.features = {};
    }
    context.__smithy_context.features[feature] = value;
}

class DefaultIdentityProviderConfig {
    authSchemes = new Map();
    constructor(config) {
        for (const key in config) {
            const value = config[key];
            if (value !== undefined) {
                this.authSchemes.set(key, value);
            }
        }
    }
    getIdentityProvider(schemeId) {
        return this.authSchemes.get(schemeId);
    }
}

class HttpApiKeyAuthSigner {
    async sign(httpRequest, identity, signingProperties) {
        if (!signingProperties) {
            throw new Error("request could not be signed with `apiKey` since the `name` and `in` signer properties are missing");
        }
        if (!signingProperties.name) {
            throw new Error("request could not be signed with `apiKey` since the `name` signer property is missing");
        }
        if (!signingProperties.in) {
            throw new Error("request could not be signed with `apiKey` since the `in` signer property is missing");
        }
        if (!identity.apiKey) {
            throw new Error("request could not be signed with `apiKey` since the `apiKey` is not defined");
        }
        const clonedRequest = protocols.HttpRequest.clone(httpRequest);
        if (signingProperties.in === types.HttpApiKeyAuthLocation.QUERY) {
            clonedRequest.query[signingProperties.name] = identity.apiKey;
        }
        else if (signingProperties.in === types.HttpApiKeyAuthLocation.HEADER) {
            clonedRequest.headers[signingProperties.name] = signingProperties.scheme
                ? `${signingProperties.scheme} ${identity.apiKey}`
                : identity.apiKey;
        }
        else {
            throw new Error("request can only be signed with `apiKey` locations `query` or `header`, " +
                "but found: `" +
                signingProperties.in +
                "`");
        }
        return clonedRequest;
    }
}

class HttpBearerAuthSigner {
    async sign(httpRequest, identity, signingProperties) {
        const clonedRequest = protocols.HttpRequest.clone(httpRequest);
        if (!identity.token) {
            throw new Error("request could not be signed with `token` since the `token` is not defined");
        }
        clonedRequest.headers["Authorization"] = `Bearer ${identity.token}`;
        return clonedRequest;
    }
}

class NoAuthSigner {
    async sign(httpRequest, identity, signingProperties) {
        return httpRequest;
    }
}

const createIsIdentityExpiredFunction = (expirationMs) => function isIdentityExpired(identity) {
    return doesIdentityRequireRefresh(identity) && identity.expiration.getTime() - Date.now() < expirationMs;
};
const EXPIRATION_MS = 300_000;
const isIdentityExpired = createIsIdentityExpiredFunction(EXPIRATION_MS);
const doesIdentityRequireRefresh = (identity) => identity.expiration !== undefined;
const memoizeIdentityProvider = (provider, isExpired, requiresRefresh) => {
    if (provider === undefined) {
        return undefined;
    }
    const normalizedProvider = typeof provider !== "function" ? async () => Promise.resolve(provider) : provider;
    let resolved;
    let pending;
    let hasResult;
    let isConstant = false;
    const coalesceProvider = async (options) => {
        if (!pending) {
            pending = normalizedProvider(options);
        }
        try {
            resolved = await pending;
            hasResult = true;
            isConstant = false;
        }
        finally {
            pending = undefined;
        }
        return resolved;
    };
    if (isExpired === undefined) {
        return async (options) => {
            if (!hasResult || options?.forceRefresh) {
                resolved = await coalesceProvider(options);
            }
            return resolved;
        };
    }
    return async (options) => {
        if (!hasResult || options?.forceRefresh) {
            resolved = await coalesceProvider(options);
        }
        if (isConstant) {
            return resolved;
        }
        if (!requiresRefresh(resolved)) {
            isConstant = true;
            return resolved;
        }
        if (isExpired(resolved)) {
            await coalesceProvider(options);
            return resolved;
        }
        return resolved;
    };
};

exports.requestBuilder = protocols.requestBuilder;
exports.DefaultIdentityProviderConfig = DefaultIdentityProviderConfig;
exports.EXPIRATION_MS = EXPIRATION_MS;
exports.HttpApiKeyAuthSigner = HttpApiKeyAuthSigner;
exports.HttpBearerAuthSigner = HttpBearerAuthSigner;
exports.NoAuthSigner = NoAuthSigner;
exports.createIsIdentityExpiredFunction = createIsIdentityExpiredFunction;
exports.createPaginator = createPaginator;
exports.doesIdentityRequireRefresh = doesIdentityRequireRefresh;
exports.getHttpAuthSchemeEndpointRuleSetPlugin = getHttpAuthSchemeEndpointRuleSetPlugin;
exports.getHttpAuthSchemePlugin = getHttpAuthSchemePlugin;
exports.getHttpSigningPlugin = getHttpSigningPlugin;
exports.getSmithyContext = getSmithyContext;
exports.httpAuthSchemeEndpointRuleSetMiddlewareOptions = httpAuthSchemeEndpointRuleSetMiddlewareOptions;
exports.httpAuthSchemeMiddleware = httpAuthSchemeMiddleware;
exports.httpAuthSchemeMiddlewareOptions = httpAuthSchemeMiddlewareOptions;
exports.httpSigningMiddleware = httpSigningMiddleware;
exports.httpSigningMiddlewareOptions = httpSigningMiddlewareOptions;
exports.isIdentityExpired = isIdentityExpired;
exports.memoizeIdentityProvider = memoizeIdentityProvider;
exports.normalizeProvider = normalizeProvider;
exports.setFeature = setFeature;


/***/ }),

/***/ 56949:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var serde = __webpack_require__(38622);
var protocols = __webpack_require__(45598);
var client = __webpack_require__(63234);
var schema = __webpack_require__(95258);

const majorUint64 = 0;
const majorNegativeInt64 = 1;
const majorUnstructuredByteString = 2;
const majorUtf8String = 3;
const majorList = 4;
const majorMap = 5;
const majorTag = 6;
const majorSpecial = 7;
const specialFalse = 20;
const specialTrue = 21;
const specialNull = 22;
const specialUndefined = 23;
const extendedOneByte = 24;
const extendedFloat16 = 25;
const extendedFloat32 = 26;
const extendedFloat64 = 27;
const minorIndefinite = 31;
function alloc(size) {
    return typeof Buffer !== "undefined" ? Buffer.alloc(size) : new Uint8Array(size);
}
const tagSymbol = Symbol("@smithy/core/cbor::tagSymbol");
function tag(data) {
    data[tagSymbol] = true;
    return data;
}

const USE_TEXT_DECODER = typeof TextDecoder !== "undefined";
const USE_BUFFER$1 = typeof Buffer !== "undefined";
let payload = alloc(0);
let dataView$1 = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
const textDecoder = USE_TEXT_DECODER ? new TextDecoder() : null;
let _offset = 0;
function setPayload(bytes) {
    payload = bytes;
    dataView$1 = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
}
function decode(at, to) {
    if (at >= to) {
        throw new Error("unexpected end of (decode) payload.");
    }
    const major = (payload[at] & 0b1110_0000) >> 5;
    const minor = payload[at] & 0b0001_1111;
    switch (major) {
        case majorUint64:
        case majorNegativeInt64:
        case majorTag:
            let unsignedInt;
            let offset;
            if (minor < 24) {
                unsignedInt = minor;
                offset = 1;
            }
            else {
                switch (minor) {
                    case extendedOneByte:
                    case extendedFloat16:
                    case extendedFloat32:
                    case extendedFloat64:
                        const countLength = minorValueToArgumentLength[minor];
                        const countOffset = (countLength + 1);
                        offset = countOffset;
                        if (to - at < countOffset) {
                            throw new Error(`countLength ${countLength} greater than remaining buf len.`);
                        }
                        const countIndex = at + 1;
                        if (countLength === 1) {
                            unsignedInt = payload[countIndex];
                        }
                        else if (countLength === 2) {
                            unsignedInt = dataView$1.getUint16(countIndex);
                        }
                        else if (countLength === 4) {
                            unsignedInt = dataView$1.getUint32(countIndex);
                        }
                        else {
                            unsignedInt = dataView$1.getBigUint64(countIndex);
                        }
                        break;
                    default:
                        throw new Error(`unexpected minor value ${minor}.`);
                }
            }
            if (major === majorUint64) {
                _offset = offset;
                return castBigInt(unsignedInt);
            }
            else if (major === majorNegativeInt64) {
                let negativeInt;
                if (typeof unsignedInt === "bigint") {
                    negativeInt = BigInt(-1) - unsignedInt;
                }
                else {
                    negativeInt = -1 - unsignedInt;
                }
                _offset = offset;
                return castBigInt(negativeInt);
            }
            else {
                if (minor === 2 || minor === 3) {
                    const length = decodeCount(at + offset, to);
                    let b = BigInt(0);
                    const start = at + offset + _offset;
                    for (let i = start; i < start + length; ++i) {
                        b = (b << BigInt(8)) | BigInt(payload[i]);
                    }
                    _offset = offset + _offset + length;
                    return minor === 3 ? -b - BigInt(1) : b;
                }
                else if (minor === 4) {
                    const decimalFraction = decode(at + offset, to);
                    const [exponent, mantissa] = decimalFraction;
                    const normalizer = mantissa < 0 ? -1 : 1;
                    const mantissaStr = "0".repeat(Math.abs(exponent) + 1) + String(BigInt(normalizer) * BigInt(mantissa));
                    let numericString;
                    const sign = mantissa < 0 ? "-" : "";
                    numericString =
                        exponent === 0
                            ? mantissaStr
                            : mantissaStr.slice(0, mantissaStr.length + exponent) + "." + mantissaStr.slice(exponent);
                    numericString = numericString.replace(/^0+/g, "");
                    if (numericString === "") {
                        numericString = "0";
                    }
                    if (numericString[0] === ".") {
                        numericString = "0" + numericString;
                    }
                    numericString = sign + numericString;
                    _offset = offset + _offset;
                    return serde.nv(numericString);
                }
                else {
                    const value = decode(at + offset, to);
                    const valueOffset = _offset;
                    _offset = offset + valueOffset;
                    return tag({ tag: castBigInt(unsignedInt), value });
                }
            }
        case majorUtf8String:
        case majorMap:
        case majorList:
        case majorUnstructuredByteString:
            if (minor === minorIndefinite) {
                switch (major) {
                    case majorUtf8String:
                        return decodeUtf8StringIndefinite(at, to);
                    case majorMap:
                        return decodeMapIndefinite(at, to);
                    case majorList:
                        return decodeListIndefinite(at, to);
                    case majorUnstructuredByteString:
                        return decodeUnstructuredByteStringIndefinite(at, to);
                }
            }
            else {
                switch (major) {
                    case majorUtf8String:
                        return decodeUtf8String(at, to);
                    case majorMap:
                        return decodeMap(at, to);
                    case majorList:
                        return decodeList(at, to);
                    case majorUnstructuredByteString:
                        return decodeUnstructuredByteString(at, to);
                }
            }
        default:
            return decodeSpecial(at, to);
    }
}
function bytesToUtf8(bytes, at, to) {
    if (USE_BUFFER$1 && bytes.constructor?.name === "Buffer") {
        return bytes.toString("utf-8", at, to);
    }
    if (textDecoder) {
        return textDecoder.decode(bytes.subarray(at, to));
    }
    return serde.toUtf8(bytes.subarray(at, to));
}
function demote(bigInteger) {
    const num = Number(bigInteger);
    if (num < Number.MIN_SAFE_INTEGER || Number.MAX_SAFE_INTEGER < num) {
        console.warn(new Error(`@smithy/core/cbor - truncating BigInt(${bigInteger}) to ${num} with loss of precision.`));
    }
    return num;
}
const minorValueToArgumentLength = {
    [extendedOneByte]: 1,
    [extendedFloat16]: 2,
    [extendedFloat32]: 4,
    [extendedFloat64]: 8,
};
function bytesToFloat16(a, b) {
    const sign = a >> 7;
    const exponent = (a & 0b0111_1100) >> 2;
    const fraction = ((a & 0b0000_0011) << 8) | b;
    const scalar = sign === 0 ? 1 : -1;
    let exponentComponent;
    let summation;
    if (exponent === 0b00000) {
        if (fraction === 0b00000_00000) {
            return 0;
        }
        else {
            exponentComponent = Math.pow(2, 1 - 15);
            summation = 0;
        }
    }
    else if (exponent === 0b11111) {
        if (fraction === 0b00000_00000) {
            return scalar * Infinity;
        }
        else {
            return NaN;
        }
    }
    else {
        exponentComponent = Math.pow(2, exponent - 15);
        summation = 1;
    }
    summation += fraction / 1024;
    return scalar * (exponentComponent * summation);
}
function decodeCount(at, to) {
    const minor = payload[at] & 0b0001_1111;
    if (minor < 24) {
        _offset = 1;
        return minor;
    }
    if (minor === extendedOneByte ||
        minor === extendedFloat16 ||
        minor === extendedFloat32 ||
        minor === extendedFloat64) {
        const countLength = minorValueToArgumentLength[minor];
        _offset = (countLength + 1);
        if (to - at < _offset) {
            throw new Error(`countLength ${countLength} greater than remaining buf len.`);
        }
        const countIndex = at + 1;
        if (countLength === 1) {
            return payload[countIndex];
        }
        else if (countLength === 2) {
            return dataView$1.getUint16(countIndex);
        }
        else if (countLength === 4) {
            return dataView$1.getUint32(countIndex);
        }
        return demote(dataView$1.getBigUint64(countIndex));
    }
    throw new Error(`unexpected minor value ${minor}.`);
}
function decodeUtf8String(at, to) {
    const length = decodeCount(at, to);
    const offset = _offset;
    at += offset;
    if (to - at < length) {
        throw new Error(`string len ${length} greater than remaining buf len.`);
    }
    const value = bytesToUtf8(payload, at, at + length);
    _offset = offset + length;
    return value;
}
function decodeUtf8StringIndefinite(at, to) {
    at += 1;
    const vector = [];
    for (const base = at; at < to;) {
        if (payload[at] === 0b1111_1111) {
            const data = alloc(vector.length);
            data.set(vector, 0);
            _offset = at - base + 2;
            return bytesToUtf8(data, 0, data.length);
        }
        const major = (payload[at] & 0b1110_0000) >> 5;
        const minor = payload[at] & 0b0001_1111;
        if (major !== majorUtf8String) {
            throw new Error(`unexpected major type ${major} in indefinite string.`);
        }
        if (minor === minorIndefinite) {
            throw new Error("nested indefinite string.");
        }
        const bytes = decodeUnstructuredByteString(at, to);
        const length = _offset;
        at += length;
        for (let i = 0; i < bytes.length; ++i) {
            vector.push(bytes[i]);
        }
    }
    throw new Error("expected break marker.");
}
function decodeUnstructuredByteString(at, to) {
    const length = decodeCount(at, to);
    const offset = _offset;
    at += offset;
    if (to - at < length) {
        throw new Error(`unstructured byte string len ${length} greater than remaining buf len.`);
    }
    const value = payload.subarray(at, at + length);
    _offset = offset + length;
    return value;
}
function decodeUnstructuredByteStringIndefinite(at, to) {
    at += 1;
    const vector = [];
    for (const base = at; at < to;) {
        if (payload[at] === 0b1111_1111) {
            const data = alloc(vector.length);
            data.set(vector, 0);
            _offset = at - base + 2;
            return data;
        }
        const major = (payload[at] & 0b1110_0000) >> 5;
        const minor = payload[at] & 0b0001_1111;
        if (major !== majorUnstructuredByteString) {
            throw new Error(`unexpected major type ${major} in indefinite string.`);
        }
        if (minor === minorIndefinite) {
            throw new Error("nested indefinite string.");
        }
        const bytes = decodeUnstructuredByteString(at, to);
        const length = _offset;
        at += length;
        for (let i = 0; i < bytes.length; ++i) {
            vector.push(bytes[i]);
        }
    }
    throw new Error("expected break marker.");
}
function decodeList(at, to) {
    const listDataLength = decodeCount(at, to);
    const offset = _offset;
    at += offset;
    const base = at;
    const list = Array(listDataLength);
    for (let i = 0; i < listDataLength; ++i) {
        const item = decode(at, to);
        const itemOffset = _offset;
        list[i] = item;
        at += itemOffset;
    }
    _offset = offset + (at - base);
    return list;
}
function decodeListIndefinite(at, to) {
    at += 1;
    const list = [];
    for (const base = at; at < to;) {
        if (payload[at] === 0b1111_1111) {
            _offset = at - base + 2;
            return list;
        }
        const item = decode(at, to);
        const n = _offset;
        at += n;
        list.push(item);
    }
    throw new Error("expected break marker.");
}
function decodeMap(at, to) {
    const mapDataLength = decodeCount(at, to);
    const offset = _offset;
    at += offset;
    const base = at;
    const map = {};
    for (let i = 0; i < mapDataLength; ++i) {
        if (at >= to) {
            throw new Error("unexpected end of map payload.");
        }
        const major = (payload[at] & 0b1110_0000) >> 5;
        if (major !== majorUtf8String) {
            throw new Error(`unexpected major type ${major} for map key at index ${at}.`);
        }
        const key = decode(at, to);
        at += _offset;
        const value = decode(at, to);
        at += _offset;
        map[key] = value;
    }
    _offset = offset + (at - base);
    return map;
}
function decodeMapIndefinite(at, to) {
    at += 1;
    const base = at;
    const map = {};
    for (; at < to;) {
        if (at >= to) {
            throw new Error("unexpected end of map payload.");
        }
        if (payload[at] === 0b1111_1111) {
            _offset = at - base + 2;
            return map;
        }
        const major = (payload[at] & 0b1110_0000) >> 5;
        if (major !== majorUtf8String) {
            throw new Error(`unexpected major type ${major} for map key.`);
        }
        const key = decode(at, to);
        at += _offset;
        const value = decode(at, to);
        at += _offset;
        map[key] = value;
    }
    throw new Error("expected break marker.");
}
function decodeSpecial(at, to) {
    const minor = payload[at] & 0b0001_1111;
    switch (minor) {
        case specialTrue:
        case specialFalse:
            _offset = 1;
            return minor === specialTrue;
        case specialNull:
            _offset = 1;
            return null;
        case specialUndefined:
            _offset = 1;
            return null;
        case extendedFloat16:
            if (to - at < 3) {
                throw new Error("incomplete float16 at end of buf.");
            }
            _offset = 3;
            return bytesToFloat16(payload[at + 1], payload[at + 2]);
        case extendedFloat32:
            if (to - at < 5) {
                throw new Error("incomplete float32 at end of buf.");
            }
            _offset = 5;
            return dataView$1.getFloat32(at + 1);
        case extendedFloat64:
            if (to - at < 9) {
                throw new Error("incomplete float64 at end of buf.");
            }
            _offset = 9;
            return dataView$1.getFloat64(at + 1);
        default:
            throw new Error(`unexpected minor value ${minor}.`);
    }
}
function castBigInt(bigInt) {
    if (typeof bigInt === "number") {
        return bigInt;
    }
    const num = Number(bigInt);
    if (Number.MIN_SAFE_INTEGER <= num && num <= Number.MAX_SAFE_INTEGER) {
        return num;
    }
    return bigInt;
}

const USE_BUFFER = typeof Buffer !== "undefined";
const initialSize = 2048;
let data = alloc(initialSize);
let dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
let cursor = 0;
function ensureSpace(bytes) {
    const remaining = data.byteLength - cursor;
    if (remaining < bytes) {
        if (cursor < 16_000_000) {
            resize(Math.max(data.byteLength * 4, data.byteLength + bytes));
        }
        else {
            resize(data.byteLength + bytes + 16_000_000);
        }
    }
}
function toUint8Array() {
    const out = alloc(cursor);
    out.set(data.subarray(0, cursor), 0);
    cursor = 0;
    return out;
}
function resize(size) {
    const old = data;
    data = alloc(size);
    if (old) {
        if (old.copy) {
            old.copy(data, 0, 0, old.byteLength);
        }
        else {
            data.set(old, 0);
        }
    }
    dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
}
function encodeHeader(major, value) {
    if (value < 24) {
        data[cursor++] = (major << 5) | value;
    }
    else if (value < 1 << 8) {
        data[cursor++] = (major << 5) | 24;
        data[cursor++] = value;
    }
    else if (value < 1 << 16) {
        data[cursor++] = (major << 5) | extendedFloat16;
        dataView.setUint16(cursor, value);
        cursor += 2;
    }
    else if (value < 2 ** 32) {
        data[cursor++] = (major << 5) | extendedFloat32;
        dataView.setUint32(cursor, value);
        cursor += 4;
    }
    else {
        data[cursor++] = (major << 5) | extendedFloat64;
        dataView.setBigUint64(cursor, typeof value === "bigint" ? value : BigInt(value));
        cursor += 8;
    }
}
function encode(_input) {
    const encodeStack = [_input];
    while (encodeStack.length) {
        const input = encodeStack.pop();
        ensureSpace(typeof input === "string" ? input.length * 4 : 64);
        if (typeof input === "string") {
            if (USE_BUFFER) {
                encodeHeader(majorUtf8String, Buffer.byteLength(input));
                cursor += data.write(input, cursor);
            }
            else {
                const bytes = serde.fromUtf8(input);
                encodeHeader(majorUtf8String, bytes.byteLength);
                data.set(bytes, cursor);
                cursor += bytes.byteLength;
            }
            continue;
        }
        else if (typeof input === "number") {
            if (Number.isInteger(input)) {
                const nonNegative = input >= 0;
                const major = nonNegative ? majorUint64 : majorNegativeInt64;
                const value = nonNegative ? input : -input - 1;
                if (value < 24) {
                    data[cursor++] = (major << 5) | value;
                }
                else if (value < 256) {
                    data[cursor++] = (major << 5) | 24;
                    data[cursor++] = value;
                }
                else if (value < 65536) {
                    data[cursor++] = (major << 5) | extendedFloat16;
                    data[cursor++] = value >> 8;
                    data[cursor++] = value;
                }
                else if (value < 4294967296) {
                    data[cursor++] = (major << 5) | extendedFloat32;
                    dataView.setUint32(cursor, value);
                    cursor += 4;
                }
                else {
                    data[cursor++] = (major << 5) | extendedFloat64;
                    dataView.setBigUint64(cursor, BigInt(value));
                    cursor += 8;
                }
                continue;
            }
            data[cursor++] = (majorSpecial << 5) | extendedFloat64;
            dataView.setFloat64(cursor, input);
            cursor += 8;
            continue;
        }
        else if (typeof input === "bigint") {
            const nonNegative = input >= 0;
            const major = nonNegative ? majorUint64 : majorNegativeInt64;
            const value = nonNegative ? input : -input - BigInt(1);
            const n = Number(value);
            if (n < 24) {
                data[cursor++] = (major << 5) | n;
            }
            else if (n < 256) {
                data[cursor++] = (major << 5) | 24;
                data[cursor++] = n;
            }
            else if (n < 65536) {
                data[cursor++] = (major << 5) | extendedFloat16;
                data[cursor++] = n >> 8;
                data[cursor++] = n & 0b1111_1111;
            }
            else if (n < 4294967296) {
                data[cursor++] = (major << 5) | extendedFloat32;
                dataView.setUint32(cursor, n);
                cursor += 4;
            }
            else if (value < BigInt("18446744073709551616")) {
                data[cursor++] = (major << 5) | extendedFloat64;
                dataView.setBigUint64(cursor, value);
                cursor += 8;
            }
            else {
                const binaryBigInt = value.toString(2);
                const bigIntBytes = new Uint8Array(Math.ceil(binaryBigInt.length / 8));
                let b = value;
                let i = 0;
                while (bigIntBytes.byteLength - ++i >= 0) {
                    bigIntBytes[bigIntBytes.byteLength - i] = Number(b & BigInt(255));
                    b >>= BigInt(8);
                }
                ensureSpace(bigIntBytes.byteLength * 2);
                data[cursor++] = nonNegative ? 0b110_00010 : 0b110_00011;
                if (USE_BUFFER) {
                    encodeHeader(majorUnstructuredByteString, Buffer.byteLength(bigIntBytes));
                }
                else {
                    encodeHeader(majorUnstructuredByteString, bigIntBytes.byteLength);
                }
                data.set(bigIntBytes, cursor);
                cursor += bigIntBytes.byteLength;
            }
            continue;
        }
        else if (input === null) {
            data[cursor++] = (majorSpecial << 5) | specialNull;
            continue;
        }
        else if (typeof input === "boolean") {
            data[cursor++] = (majorSpecial << 5) | (input ? specialTrue : specialFalse);
            continue;
        }
        else if (typeof input === "undefined") {
            throw new Error("@smithy/core/cbor: client may not serialize undefined value.");
        }
        else if (Array.isArray(input)) {
            for (let i = input.length - 1; i >= 0; --i) {
                encodeStack.push(input[i]);
            }
            encodeHeader(majorList, input.length);
            continue;
        }
        else if (typeof input.byteLength === "number") {
            ensureSpace(input.length * 2);
            encodeHeader(majorUnstructuredByteString, input.length);
            data.set(input, cursor);
            cursor += input.byteLength;
            continue;
        }
        else if (typeof input === "object") {
            if (input instanceof serde.NumericValue) {
                const decimalIndex = input.string.indexOf(".");
                const exponent = decimalIndex === -1 ? 0 : decimalIndex - input.string.length + 1;
                const mantissa = BigInt(input.string.replace(".", ""));
                data[cursor++] = 0b110_00100;
                encodeStack.push(mantissa);
                encodeStack.push(exponent);
                encodeHeader(majorList, 2);
                continue;
            }
            if (input[tagSymbol]) {
                if ("tag" in input && "value" in input) {
                    encodeStack.push(input.value);
                    encodeHeader(majorTag, input.tag);
                    continue;
                }
                else {
                    throw new Error("tag encountered with missing fields, need 'tag' and 'value', found: " + JSON.stringify(input));
                }
            }
            const keys = Object.keys(input);
            for (let i = keys.length - 1; i >= 0; --i) {
                const key = keys[i];
                encodeStack.push(input[key]);
                encodeStack.push(key);
            }
            encodeHeader(majorMap, keys.length);
            continue;
        }
        throw new Error(`data type ${input?.constructor?.name ?? typeof input} not compatible for encoding.`);
    }
}

const cbor = {
    deserialize(payload) {
        setPayload(payload);
        return decode(0, payload.length);
    },
    serialize(input) {
        try {
            encode(input);
            return toUint8Array();
        }
        catch (e) {
            toUint8Array();
            throw e;
        }
    },
    resizeEncodingBuffer(size) {
        resize(size);
    },
};

const parseCborBody = (streamBody, context) => {
    return protocols.collectBody(streamBody, context).then(async (bytes) => {
        if (bytes.length) {
            try {
                return cbor.deserialize(bytes);
            }
            catch (e) {
                Object.defineProperty(e, "$responseBodyText", {
                    value: context.utf8Encoder(bytes),
                });
                throw e;
            }
        }
        return {};
    });
};
const dateToTag = (date) => {
    return tag({
        tag: 1,
        value: date.getTime() / 1000,
    });
};
const parseCborErrorBody = async (errorBody, context) => {
    const value = await parseCborBody(errorBody, context);
    value.message = value.message ?? value.Message;
    return value;
};
const loadSmithyRpcV2CborErrorCode = (output, data) => {
    const sanitizeErrorCode = (rawValue) => {
        let cleanValue = rawValue;
        if (typeof cleanValue === "number") {
            cleanValue = cleanValue.toString();
        }
        if (cleanValue.indexOf(",") >= 0) {
            cleanValue = cleanValue.split(",")[0];
        }
        if (cleanValue.indexOf(":") >= 0) {
            cleanValue = cleanValue.split(":")[0];
        }
        if (cleanValue.indexOf("#") >= 0) {
            cleanValue = cleanValue.split("#")[1];
        }
        return cleanValue;
    };
    if (data["__type"] !== undefined) {
        return sanitizeErrorCode(data["__type"]);
    }
    let codeKey;
    for (const key in data) {
        if (key.toLowerCase() === "code") {
            codeKey = key;
            break;
        }
    }
    if (codeKey && data[codeKey] !== undefined) {
        return sanitizeErrorCode(data[codeKey]);
    }
};
const checkCborResponse = (response) => {
    if (String(response.headers["smithy-protocol"]).toLowerCase() !== "rpc-v2-cbor") {
        throw new Error("Malformed RPCv2 CBOR response, status: " + response.statusCode);
    }
};
const buildHttpRpcRequest = async (context, headers, path, resolvedHostname, body) => {
    const endpoint = await context.endpoint();
    const { hostname, protocol = "https", port, path: basePath } = endpoint;
    const contents = {
        protocol,
        hostname,
        port,
        method: "POST",
        path: basePath.endsWith("/") ? basePath.slice(0, -1) + path : basePath + path,
        headers: {
            ...headers,
        },
    };
    if (resolvedHostname !== undefined) {
        contents.hostname = resolvedHostname;
    }
    if (endpoint.headers) {
        for (const name in endpoint.headers) {
            contents.headers[name] = endpoint.headers[name];
        }
    }
    if (body !== undefined) {
        contents.body = body;
        try {
            contents.headers["content-length"] = String(serde.calculateBodyLength(body));
        }
        catch (e) { }
    }
    return new protocols.HttpRequest(contents);
};

class CborCodec extends protocols.SerdeContext {
    createSerializer() {
        const serializer = new CborShapeSerializer();
        serializer.setSerdeContext(this.serdeContext);
        return serializer;
    }
    createDeserializer() {
        const deserializer = new CborShapeDeserializer();
        deserializer.setSerdeContext(this.serdeContext);
        return deserializer;
    }
}
class CborShapeSerializer extends protocols.SerdeContext {
    value;
    write(schema, value) {
        this.value = this.serialize(schema, value);
    }
    serialize(schema$1, source) {
        const ns = schema.NormalizedSchema.of(schema$1);
        if (source == null) {
            if (ns.isIdempotencyToken()) {
                return serde.generateIdempotencyToken();
            }
            return source;
        }
        if (ns.isBlobSchema()) {
            if (typeof source === "string") {
                return (this.serdeContext?.base64Decoder ?? serde.fromBase64)(source);
            }
            return source;
        }
        if (ns.isTimestampSchema()) {
            if (typeof source === "number" || typeof source === "bigint") {
                return dateToTag(new Date((Number(source) / 1000) | 0));
            }
            return dateToTag(source);
        }
        if (typeof source === "function" || typeof source === "object") {
            const sourceObject = source;
            if (ns.isListSchema() && Array.isArray(sourceObject)) {
                const sparse = !!ns.getMergedTraits().sparse;
                const newArray = [];
                let i = 0;
                for (const item of sourceObject) {
                    const value = this.serialize(ns.getValueSchema(), item);
                    if (value != null || sparse) {
                        newArray[i++] = value;
                    }
                }
                return newArray;
            }
            if (sourceObject instanceof Date) {
                return dateToTag(sourceObject);
            }
            const newObject = {};
            if (ns.isMapSchema()) {
                const sparse = !!ns.getMergedTraits().sparse;
                for (const key in sourceObject) {
                    const value = this.serialize(ns.getValueSchema(), sourceObject[key]);
                    if (value != null || sparse) {
                        newObject[key] = value;
                    }
                }
            }
            else if (ns.isStructSchema()) {
                for (const [key, memberSchema] of ns.structIterator()) {
                    const value = this.serialize(memberSchema, sourceObject[key]);
                    if (value != null) {
                        newObject[key] = value;
                    }
                }
                const isUnion = ns.isUnionSchema();
                if (isUnion && Array.isArray(sourceObject.$unknown)) {
                    const [k, v] = sourceObject.$unknown;
                    newObject[k] = v;
                }
                else if (typeof sourceObject.__type === "string") {
                    for (const k in sourceObject) {
                        if (!(k in newObject)) {
                            newObject[k] = this.serialize(15, sourceObject[k]);
                        }
                    }
                }
            }
            else if (ns.isDocumentSchema()) {
                for (const key in sourceObject) {
                    newObject[key] = this.serialize(ns.getValueSchema(), sourceObject[key]);
                }
            }
            else if (ns.isBigDecimalSchema()) {
                return sourceObject;
            }
            return newObject;
        }
        return source;
    }
    flush() {
        const buffer = cbor.serialize(this.value);
        this.value = undefined;
        return buffer;
    }
}
class CborShapeDeserializer extends protocols.SerdeContext {
    read(schema, bytes) {
        const data = cbor.deserialize(bytes);
        return this.readValue(schema, data);
    }
    readValue(_schema, value) {
        const ns = schema.NormalizedSchema.of(_schema);
        if (ns.isTimestampSchema()) {
            if (typeof value === "number") {
                return serde._parseEpochTimestamp(value);
            }
            if (typeof value === "object") {
                if (value.tag === 1 && "value" in value) {
                    return serde._parseEpochTimestamp(value.value);
                }
            }
        }
        if (ns.isBlobSchema()) {
            if (typeof value === "string") {
                return (this.serdeContext?.base64Decoder ?? serde.fromBase64)(value);
            }
            return value;
        }
        if (typeof value === "undefined" ||
            typeof value === "boolean" ||
            typeof value === "number" ||
            typeof value === "string" ||
            typeof value === "bigint" ||
            typeof value === "symbol") {
            return value;
        }
        else if (typeof value === "object") {
            if (value === null) {
                return null;
            }
            if ("byteLength" in value) {
                return value;
            }
            if (value instanceof Date) {
                return value;
            }
            if (ns.isDocumentSchema()) {
                return value;
            }
            if (ns.isListSchema()) {
                const newArray = [];
                const memberSchema = ns.getValueSchema();
                for (const item of value) {
                    const itemValue = this.readValue(memberSchema, item);
                    newArray.push(itemValue);
                }
                return newArray;
            }
            const newObject = {};
            if (ns.isMapSchema()) {
                const targetSchema = ns.getValueSchema();
                for (const key in value) {
                    const itemValue = this.readValue(targetSchema, value[key]);
                    newObject[key] = itemValue;
                }
            }
            else if (ns.isStructSchema()) {
                const isUnion = ns.isUnionSchema();
                let keys;
                if (isUnion) {
                    keys = new Set();
                    for (const k in value) {
                        if (k !== "__type") {
                            keys.add(k);
                        }
                    }
                }
                for (const [key, memberSchema] of ns.structIterator()) {
                    if (isUnion) {
                        keys.delete(key);
                    }
                    if (value[key] != null) {
                        newObject[key] = this.readValue(memberSchema, value[key]);
                    }
                }
                if (isUnion && keys?.size === 1) {
                    let newObjectEmpty = true;
                    for (const _ in newObject) {
                        newObjectEmpty = false;
                        break;
                    }
                    if (newObjectEmpty) {
                        const k = keys.values().next().value;
                        newObject.$unknown = [k, value[k]];
                    }
                }
                else if (typeof value.__type === "string") {
                    for (const k in value) {
                        if (!(k in newObject)) {
                            newObject[k] = value[k];
                        }
                    }
                }
            }
            else if (value instanceof serde.NumericValue) {
                return value;
            }
            return newObject;
        }
        else {
            return value;
        }
    }
}

class SmithyRpcV2CborProtocol extends protocols.RpcProtocol {
    codec = new CborCodec();
    serializer = this.codec.createSerializer();
    deserializer = this.codec.createDeserializer();
    constructor({ defaultNamespace, errorTypeRegistries, }) {
        super({ defaultNamespace, errorTypeRegistries });
    }
    getShapeId() {
        return "smithy.protocols#rpcv2Cbor";
    }
    getPayloadCodec() {
        return this.codec;
    }
    async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        Object.assign(request.headers, {
            "content-type": this.getDefaultContentType(),
            "smithy-protocol": "rpc-v2-cbor",
            accept: this.getDefaultContentType(),
        });
        if (schema.deref(operationSchema.input) === "unit") {
            delete request.body;
            delete request.headers["content-type"];
        }
        else {
            if (!request.body) {
                this.serializer.write(15, {});
                request.body = this.serializer.flush();
            }
            try {
                request.headers["content-length"] = String(request.body.byteLength);
            }
            catch (e) { }
        }
        const { service, operation } = client.getSmithyContext(context);
        const path = `/service/${service}/operation/${operation}`;
        if (request.path.endsWith("/")) {
            request.path += path.slice(1);
        }
        else {
            request.path += path;
        }
        return request;
    }
    async deserializeResponse(operationSchema, context, response) {
        return super.deserializeResponse(operationSchema, context, response);
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
        const errorName = loadSmithyRpcV2CborErrorCode(response, dataObject) ?? "Unknown";
        const errorMetadata = {
            $metadata: metadata,
            $fault: response.statusCode <= 500 ? "client" : "server",
        };
        let namespace = this.options.defaultNamespace;
        if (errorName.includes("#")) {
            [namespace] = errorName.split("#");
        }
        const registry = this.compositeErrorRegistry;
        const nsRegistry = schema.TypeRegistry.for(namespace);
        registry.copyFrom(nsRegistry);
        let errorSchema;
        try {
            errorSchema = registry.getSchema(errorName);
        }
        catch (e) {
            if (dataObject.Message) {
                dataObject.message = dataObject.Message;
            }
            const syntheticRegistry = schema.TypeRegistry.for("smithy.ts.sdk.synthetic." + namespace);
            registry.copyFrom(syntheticRegistry);
            const baseExceptionSchema = registry.getBaseException();
            if (baseExceptionSchema) {
                const ErrorCtor = registry.getErrorCtor(baseExceptionSchema);
                throw Object.assign(new ErrorCtor({ name: errorName }), errorMetadata, dataObject);
            }
            throw Object.assign(new Error(errorName), errorMetadata, dataObject);
        }
        const ns = schema.NormalizedSchema.of(errorSchema);
        const ErrorCtor = registry.getErrorCtor(errorSchema);
        const message = dataObject.message ?? dataObject.Message ?? "Unknown";
        const exception = new ErrorCtor({});
        const output = {};
        for (const [name, member] of ns.structIterator()) {
            output[name] = this.deserializer.readValue(member, dataObject[name]);
        }
        throw Object.assign(exception, errorMetadata, {
            $fault: ns.getMergedTraits().error,
            message,
        }, output);
    }
    getDefaultContentType() {
        return "application/cbor";
    }
}

exports.CborCodec = CborCodec;
exports.CborShapeDeserializer = CborShapeDeserializer;
exports.CborShapeSerializer = CborShapeSerializer;
exports.SmithyRpcV2CborProtocol = SmithyRpcV2CborProtocol;
exports.buildHttpRpcRequest = buildHttpRpcRequest;
exports.cbor = cbor;
exports.checkCborResponse = checkCborResponse;
exports.dateToTag = dateToTag;
exports.loadSmithyRpcV2CborErrorCode = loadSmithyRpcV2CborErrorCode;
exports.parseCborBody = parseCborBody;
exports.parseCborErrorBody = parseCborErrorBody;
exports.tag = tag;
exports.tagSymbol = tagSymbol;


/***/ }),

/***/ 63234:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var types = __webpack_require__(39654);
var schema = __webpack_require__(95258);

const getAllAliases = (name, aliases) => {
    const _aliases = [];
    if (name) {
        _aliases.push(name);
    }
    if (aliases) {
        for (const alias of aliases) {
            _aliases.push(alias);
        }
    }
    return _aliases;
};
const getMiddlewareNameWithAliases = (name, aliases) => {
    return `${name || "anonymous"}${aliases && aliases.length > 0 ? ` (a.k.a. ${aliases.join(",")})` : ""}`;
};
const constructStack = () => {
    let absoluteEntries = [];
    let relativeEntries = [];
    let identifyOnResolve = false;
    const entriesNameSet = new Set();
    const sort = (entries) => entries.sort((a, b) => stepWeights[b.step] - stepWeights[a.step] ||
        priorityWeights[b.priority || "normal"] - priorityWeights[a.priority || "normal"]);
    const removeByName = (toRemove) => {
        let isRemoved = false;
        const filterCb = (entry) => {
            const aliases = getAllAliases(entry.name, entry.aliases);
            if (aliases.includes(toRemove)) {
                isRemoved = true;
                for (const alias of aliases) {
                    entriesNameSet.delete(alias);
                }
                return false;
            }
            return true;
        };
        absoluteEntries = absoluteEntries.filter(filterCb);
        relativeEntries = relativeEntries.filter(filterCb);
        return isRemoved;
    };
    const removeByReference = (toRemove) => {
        let isRemoved = false;
        const filterCb = (entry) => {
            if (entry.middleware === toRemove) {
                isRemoved = true;
                for (const alias of getAllAliases(entry.name, entry.aliases)) {
                    entriesNameSet.delete(alias);
                }
                return false;
            }
            return true;
        };
        absoluteEntries = absoluteEntries.filter(filterCb);
        relativeEntries = relativeEntries.filter(filterCb);
        return isRemoved;
    };
    const cloneTo = (toStack) => {
        absoluteEntries.forEach((entry) => {
            toStack.add(entry.middleware, { ...entry });
        });
        relativeEntries.forEach((entry) => {
            toStack.addRelativeTo(entry.middleware, { ...entry });
        });
        toStack.identifyOnResolve?.(stack.identifyOnResolve());
        return toStack;
    };
    const expandRelativeMiddlewareList = (from) => {
        const expandedMiddlewareList = [];
        from.before.forEach((entry) => {
            if (entry.before.length === 0 && entry.after.length === 0) {
                expandedMiddlewareList.push(entry);
            }
            else {
                expandedMiddlewareList.push(...expandRelativeMiddlewareList(entry));
            }
        });
        expandedMiddlewareList.push(from);
        from.after.reverse().forEach((entry) => {
            if (entry.before.length === 0 && entry.after.length === 0) {
                expandedMiddlewareList.push(entry);
            }
            else {
                expandedMiddlewareList.push(...expandRelativeMiddlewareList(entry));
            }
        });
        return expandedMiddlewareList;
    };
    const getMiddlewareList = (debug = false) => {
        const normalizedAbsoluteEntries = [];
        const normalizedRelativeEntries = [];
        const normalizedEntriesNameMap = {};
        absoluteEntries.forEach((entry) => {
            const normalizedEntry = {
                ...entry,
                before: [],
                after: [],
            };
            for (const alias of getAllAliases(normalizedEntry.name, normalizedEntry.aliases)) {
                normalizedEntriesNameMap[alias] = normalizedEntry;
            }
            normalizedAbsoluteEntries.push(normalizedEntry);
        });
        relativeEntries.forEach((entry) => {
            const normalizedEntry = {
                ...entry,
                before: [],
                after: [],
            };
            for (const alias of getAllAliases(normalizedEntry.name, normalizedEntry.aliases)) {
                normalizedEntriesNameMap[alias] = normalizedEntry;
            }
            normalizedRelativeEntries.push(normalizedEntry);
        });
        normalizedRelativeEntries.forEach((entry) => {
            if (entry.toMiddleware) {
                const toMiddleware = normalizedEntriesNameMap[entry.toMiddleware];
                if (toMiddleware === undefined) {
                    if (debug) {
                        return;
                    }
                    throw new Error(`${entry.toMiddleware} is not found when adding ` +
                        `${getMiddlewareNameWithAliases(entry.name, entry.aliases)} ` +
                        `middleware ${entry.relation} ${entry.toMiddleware}`);
                }
                if (entry.relation === "after") {
                    toMiddleware.after.push(entry);
                }
                if (entry.relation === "before") {
                    toMiddleware.before.push(entry);
                }
            }
        });
        const mainChain = sort(normalizedAbsoluteEntries)
            .map(expandRelativeMiddlewareList)
            .reduce((wholeList, expandedMiddlewareList) => {
            wholeList.push(...expandedMiddlewareList);
            return wholeList;
        }, []);
        return mainChain;
    };
    const stack = {
        add: (middleware, options = {}) => {
            const { name, override, aliases: _aliases } = options;
            const entry = {
                step: "initialize",
                priority: "normal",
                middleware,
                ...options,
            };
            const aliases = getAllAliases(name, _aliases);
            if (aliases.length > 0) {
                if (aliases.some((alias) => entriesNameSet.has(alias))) {
                    if (!override)
                        throw new Error(`Duplicate middleware name '${getMiddlewareNameWithAliases(name, _aliases)}'`);
                    for (const alias of aliases) {
                        const toOverrideIndex = absoluteEntries.findIndex((entry) => entry.name === alias || entry.aliases?.some((a) => a === alias));
                        if (toOverrideIndex === -1) {
                            continue;
                        }
                        const toOverride = absoluteEntries[toOverrideIndex];
                        if (toOverride.step !== entry.step || entry.priority !== toOverride.priority) {
                            throw new Error(`"${getMiddlewareNameWithAliases(toOverride.name, toOverride.aliases)}" middleware with ` +
                                `${toOverride.priority} priority in ${toOverride.step} step cannot ` +
                                `be overridden by "${getMiddlewareNameWithAliases(name, _aliases)}" middleware with ` +
                                `${entry.priority} priority in ${entry.step} step.`);
                        }
                        absoluteEntries.splice(toOverrideIndex, 1);
                    }
                }
                for (const alias of aliases) {
                    entriesNameSet.add(alias);
                }
            }
            absoluteEntries.push(entry);
        },
        addRelativeTo: (middleware, options) => {
            const { name, override, aliases: _aliases } = options;
            const entry = {
                middleware,
                ...options,
            };
            const aliases = getAllAliases(name, _aliases);
            if (aliases.length > 0) {
                if (aliases.some((alias) => entriesNameSet.has(alias))) {
                    if (!override)
                        throw new Error(`Duplicate middleware name '${getMiddlewareNameWithAliases(name, _aliases)}'`);
                    for (const alias of aliases) {
                        const toOverrideIndex = relativeEntries.findIndex((entry) => entry.name === alias || entry.aliases?.some((a) => a === alias));
                        if (toOverrideIndex === -1) {
                            continue;
                        }
                        const toOverride = relativeEntries[toOverrideIndex];
                        if (toOverride.toMiddleware !== entry.toMiddleware || toOverride.relation !== entry.relation) {
                            throw new Error(`"${getMiddlewareNameWithAliases(toOverride.name, toOverride.aliases)}" middleware ` +
                                `${toOverride.relation} "${toOverride.toMiddleware}" middleware cannot be overridden ` +
                                `by "${getMiddlewareNameWithAliases(name, _aliases)}" middleware ${entry.relation} ` +
                                `"${entry.toMiddleware}" middleware.`);
                        }
                        relativeEntries.splice(toOverrideIndex, 1);
                    }
                }
                for (const alias of aliases) {
                    entriesNameSet.add(alias);
                }
            }
            relativeEntries.push(entry);
        },
        clone: () => cloneTo(constructStack()),
        use: (plugin) => {
            plugin.applyToStack(stack);
        },
        remove: (toRemove) => {
            if (typeof toRemove === "string")
                return removeByName(toRemove);
            else
                return removeByReference(toRemove);
        },
        removeByTag: (toRemove) => {
            let isRemoved = false;
            const filterCb = (entry) => {
                const { tags, name, aliases: _aliases } = entry;
                if (tags && tags.includes(toRemove)) {
                    const aliases = getAllAliases(name, _aliases);
                    for (const alias of aliases) {
                        entriesNameSet.delete(alias);
                    }
                    isRemoved = true;
                    return false;
                }
                return true;
            };
            absoluteEntries = absoluteEntries.filter(filterCb);
            relativeEntries = relativeEntries.filter(filterCb);
            return isRemoved;
        },
        concat: (from) => {
            const cloned = cloneTo(constructStack());
            cloned.use(from);
            cloned.identifyOnResolve(identifyOnResolve || cloned.identifyOnResolve() || (from.identifyOnResolve?.() ?? false));
            return cloned;
        },
        applyToStack: cloneTo,
        identify: () => {
            return getMiddlewareList(true).map((mw) => {
                const step = mw.step ??
                    mw.relation +
                        " " +
                        mw.toMiddleware;
                return getMiddlewareNameWithAliases(mw.name, mw.aliases) + " - " + step;
            });
        },
        identifyOnResolve(toggle) {
            if (typeof toggle === "boolean")
                identifyOnResolve = toggle;
            return identifyOnResolve;
        },
        resolve: (handler, context) => {
            for (const middleware of getMiddlewareList()
                .map((entry) => entry.middleware)
                .reverse()) {
                handler = middleware(handler, context);
            }
            if (identifyOnResolve) {
                console.log(stack.identify());
            }
            return handler;
        },
    };
    return stack;
};
const stepWeights = {
    initialize: 5,
    serialize: 4,
    build: 3,
    finalizeRequest: 2,
    deserialize: 1,
};
const priorityWeights = {
    high: 3,
    normal: 2,
    low: 1,
};

const getSmithyContext = (context) => context[types.SMITHY_CONTEXT_KEY] || (context[types.SMITHY_CONTEXT_KEY] = {});

const normalizeProvider = (input) => {
    if (typeof input === "function")
        return input;
    const promisified = Promise.resolve(input);
    return () => promisified;
};

const invalidFunction = (message) => () => {
    throw new Error(message);
};

const invalidProvider = (message) => () => Promise.reject(message);

const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return "[Circular]";
            }
            seen.add(value);
        }
        return value;
    };
};

const sleep = (seconds) => {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

const waiterServiceDefaults = {
    minDelay: 2,
    maxDelay: 120,
};
exports.WaiterState = void 0;
(function (WaiterState) {
    WaiterState["ABORTED"] = "ABORTED";
    WaiterState["FAILURE"] = "FAILURE";
    WaiterState["SUCCESS"] = "SUCCESS";
    WaiterState["RETRY"] = "RETRY";
    WaiterState["TIMEOUT"] = "TIMEOUT";
})(exports.WaiterState || (exports.WaiterState = {}));
const checkExceptions = (result) => {
    if (result.state === exports.WaiterState.ABORTED) {
        const abortError = new Error(`${JSON.stringify({
            ...result,
            reason: "Request was aborted",
        }, getCircularReplacer())}`);
        abortError.name = "AbortError";
        throw abortError;
    }
    else if (result.state === exports.WaiterState.TIMEOUT) {
        const timeoutError = new Error(`${JSON.stringify({
            ...result,
            reason: "Waiter has timed out",
        }, getCircularReplacer())}`);
        timeoutError.name = "TimeoutError";
        throw timeoutError;
    }
    else if (result.state !== exports.WaiterState.SUCCESS) {
        throw new Error(`${JSON.stringify(result, getCircularReplacer())}`);
    }
    return result;
};

const runPolling = async ({ minDelay, maxDelay, maxWaitTime, abortController, client, abortSignal }, input, acceptorChecks) => {
    const observedResponses = {};
    const [minDelayMs, maxDelayMs] = [minDelay * 1000, maxDelay * 1000];
    let currentAttempt = 0;
    const waitUntil = Date.now() + maxWaitTime * 1000;
    const warn403Time = Date.now() + 60_000;
    let didWarn403 = false;
    while (true) {
        if (currentAttempt > 0) {
            const delayMs = exponentialBackoffWithJitter(minDelayMs, maxDelayMs, currentAttempt, waitUntil);
            if (abortController?.signal?.aborted || abortSignal?.aborted) {
                const message = "AbortController signal aborted.";
                observedResponses[message] |= 0;
                observedResponses[message] += 1;
                return { state: exports.WaiterState.ABORTED, observedResponses };
            }
            if (Date.now() + delayMs > waitUntil) {
                return { state: exports.WaiterState.TIMEOUT, observedResponses };
            }
            await sleep(delayMs / 1_000);
        }
        const { state, reason } = await acceptorChecks(client, input);
        if (reason) {
            const message = createMessageFromResponse(reason);
            observedResponses[message] |= 0;
            observedResponses[message] += 1;
        }
        if (state !== exports.WaiterState.RETRY) {
            return { state, reason, final: reason, observedResponses };
        }
        currentAttempt += 1;
        if (!didWarn403 && Date.now() >= warn403Time) {
            checkWarn403(observedResponses, client);
            didWarn403 = true;
        }
    }
};
const checkWarn403 = (observedResponses = {}, client) => {
    const orderedErrors = Object.keys(observedResponses);
    let count403 = 0;
    for (const response of orderedErrors) {
        const n = observedResponses[response] | 0;
        if (response.startsWith("403:")) {
            count403 += n;
        }
    }
    const clientLogger = client?.config?.logger;
    const warningLogger = typeof clientLogger?.warn === "function" && !clientLogger.constructor?.name?.includes?.("NoOpLogger")
        ? clientLogger
        : console;
    if (count403 >= 3 || orderedErrors[orderedErrors.length - 1]?.startsWith("403:")) {
        warningLogger.warn(`@smithy/util-waiter WARN - 403 status code encountered during waiter polling.`);
    }
};
const createMessageFromResponse = (reason) => {
    const status = reason?.$response?.statusCode ?? reason?.$metadata?.httpStatusCode;
    if (reason?.$responseBodyText) {
        return `${status ? status + ": " : ""}Deserialization error for body: ${reason.$responseBodyText}`;
    }
    if (status) {
        if (reason?.$response || reason?.message) {
            return `${status ?? "Unknown"}: ${reason?.message}`;
        }
        return `${status}: OK`;
    }
    return String(reason?.message ?? JSON.stringify(reason, getCircularReplacer()) ?? "Unknown");
};
const exponentialBackoffWithJitter = (minDelayMs, maxDelayMs, attempt, waitUntil) => {
    const attemptCountCeiling = Math.log(maxDelayMs / minDelayMs) / Math.log(2) + 1;
    if (attempt > attemptCountCeiling) {
        return maxDelayMs;
    }
    const delay = minDelayMs * 2 ** (attempt - 1);
    const capped = Math.min(delay, maxDelayMs);
    const waitFor = randomInRange(minDelayMs, capped);
    if (Date.now() + waitFor > waitUntil) {
        const timeRemaining = waitUntil - Date.now();
        return Math.max(0, timeRemaining - 500);
    }
    return waitFor;
};
const randomInRange = (min, max) => min + Math.random() * (max - min);

const validateWaiterOptions = (options) => {
    if (options.maxWaitTime <= 0) {
        throw new Error(`WaiterConfiguration.maxWaitTime must be greater than 0`);
    }
    else if (options.minDelay <= 0) {
        throw new Error(`WaiterConfiguration.minDelay must be greater than 0`);
    }
    else if (options.maxDelay <= 0) {
        throw new Error(`WaiterConfiguration.maxDelay must be greater than 0`);
    }
    else if (options.maxWaitTime <= options.minDelay) {
        throw new Error(`WaiterConfiguration.maxWaitTime [${options.maxWaitTime}] must be greater than WaiterConfiguration.minDelay [${options.minDelay}] for this waiter`);
    }
    else if (options.maxDelay < options.minDelay) {
        throw new Error(`WaiterConfiguration.maxDelay [${options.maxDelay}] must be greater than WaiterConfiguration.minDelay [${options.minDelay}] for this waiter`);
    }
};

const abortTimeout = (abortSignal) => {
    let onAbort;
    const promise = new Promise((resolve) => {
        onAbort = () => resolve({ state: exports.WaiterState.ABORTED });
        if (typeof abortSignal.addEventListener === "function") {
            abortSignal.addEventListener("abort", onAbort);
        }
        else {
            abortSignal.onabort = onAbort;
        }
    });
    return {
        clearListener() {
            if (typeof abortSignal.removeEventListener === "function") {
                abortSignal.removeEventListener("abort", onAbort);
            }
        },
        aborted: promise,
    };
};
const createWaiter = async (options, input, acceptorChecks) => {
    const params = {
        ...waiterServiceDefaults,
        ...options,
    };
    validateWaiterOptions(params);
    const exitConditions = [runPolling(params, input, acceptorChecks)];
    const finalize = [];
    if (options.abortSignal) {
        const { aborted, clearListener } = abortTimeout(options.abortSignal);
        finalize.push(clearListener);
        exitConditions.push(aborted);
    }
    if (options.abortController?.signal) {
        const { aborted, clearListener } = abortTimeout(options.abortController.signal);
        finalize.push(clearListener);
        exitConditions.push(aborted);
    }
    return Promise.race(exitConditions).then((result) => {
        for (const fn of finalize) {
            fn();
        }
        return result;
    });
};

class Client {
    config;
    middlewareStack = constructStack();
    initConfig;
    handlers;
    constructor(config) {
        this.config = config;
        const { protocol, protocolSettings } = config;
        if (protocolSettings) {
            if (typeof protocol === "function") {
                config.protocol = new protocol(protocolSettings);
            }
        }
    }
    send(command, optionsOrCb, cb) {
        const options = typeof optionsOrCb !== "function" ? optionsOrCb : undefined;
        const callback = typeof optionsOrCb === "function" ? optionsOrCb : cb;
        const useHandlerCache = options === undefined && this.config.cacheMiddleware === true;
        let handler;
        if (useHandlerCache) {
            if (!this.handlers) {
                this.handlers = new WeakMap();
            }
            const handlers = this.handlers;
            if (handlers.has(command.constructor)) {
                handler = handlers.get(command.constructor);
            }
            else {
                handler = command.resolveMiddleware(this.middlewareStack, this.config, options);
                handlers.set(command.constructor, handler);
            }
        }
        else {
            delete this.handlers;
            handler = command.resolveMiddleware(this.middlewareStack, this.config, options);
        }
        if (callback) {
            handler(command)
                .then((result) => callback(null, result.output), (err) => callback(err))
                .catch(() => { });
        }
        else {
            return handler(command).then((result) => result.output);
        }
    }
    destroy() {
        this.config?.requestHandler?.destroy?.();
        delete this.handlers;
    }
}

const SENSITIVE_STRING$1 = "***SensitiveInformation***";
function schemaLogFilter(schema$1, data) {
    if (data == null) {
        return data;
    }
    const ns = schema.NormalizedSchema.of(schema$1);
    if (ns.getMergedTraits().sensitive) {
        return SENSITIVE_STRING$1;
    }
    if (ns.isListSchema()) {
        const isSensitive = !!ns.getValueSchema().getMergedTraits().sensitive;
        if (isSensitive) {
            return SENSITIVE_STRING$1;
        }
    }
    else if (ns.isMapSchema()) {
        const isSensitive = !!ns.getKeySchema().getMergedTraits().sensitive || !!ns.getValueSchema().getMergedTraits().sensitive;
        if (isSensitive) {
            return SENSITIVE_STRING$1;
        }
    }
    else if (ns.isStructSchema() && typeof data === "object") {
        const object = data;
        const newObject = {};
        for (const [member, memberNs] of ns.structIterator()) {
            if (object[member] != null) {
                newObject[member] = schemaLogFilter(memberNs, object[member]);
            }
        }
        return newObject;
    }
    return data;
}

class Command {
    middlewareStack = constructStack();
    schema;
    static classBuilder() {
        return new ClassBuilder();
    }
    resolveMiddlewareWithContext(clientStack, configuration, options, { middlewareFn, clientName, commandName, inputFilterSensitiveLog, outputFilterSensitiveLog, smithyContext, additionalContext, CommandCtor, }) {
        for (const mw of middlewareFn.bind(this)(CommandCtor, clientStack, configuration, options)) {
            this.middlewareStack.use(mw);
        }
        const stack = clientStack.concat(this.middlewareStack);
        const { logger } = configuration;
        const handlerExecutionContext = {
            logger,
            clientName,
            commandName,
            inputFilterSensitiveLog,
            outputFilterSensitiveLog,
            [types.SMITHY_CONTEXT_KEY]: {
                commandInstance: this,
                ...smithyContext,
            },
            ...additionalContext,
        };
        const { requestHandler } = configuration;
        let requestOptions = options ?? {};
        if (smithyContext.eventStream) {
            requestOptions = {
                isEventStream: true,
                ...requestOptions,
            };
        }
        return stack.resolve((request) => requestHandler.handle(request.request, requestOptions), handlerExecutionContext);
    }
}
class ClassBuilder {
    _init = () => { };
    _ep = {};
    _middlewareFn = () => [];
    _commandName = "";
    _clientName = "";
    _additionalContext = {};
    _smithyContext = {};
    _inputFilterSensitiveLog = undefined;
    _outputFilterSensitiveLog = undefined;
    _serializer = null;
    _deserializer = null;
    _operationSchema;
    init(cb) {
        this._init = cb;
    }
    ep(endpointParameterInstructions) {
        this._ep = endpointParameterInstructions;
        return this;
    }
    m(middlewareSupplier) {
        this._middlewareFn = middlewareSupplier;
        return this;
    }
    s(service, operation, smithyContext = {}) {
        this._smithyContext = {
            service,
            operation,
            ...smithyContext,
        };
        return this;
    }
    c(additionalContext = {}) {
        this._additionalContext = additionalContext;
        return this;
    }
    n(clientName, commandName) {
        this._clientName = clientName;
        this._commandName = commandName;
        return this;
    }
    f(inputFilter = (_) => _, outputFilter = (_) => _) {
        this._inputFilterSensitiveLog = inputFilter;
        this._outputFilterSensitiveLog = outputFilter;
        return this;
    }
    ser(serializer) {
        this._serializer = serializer;
        return this;
    }
    de(deserializer) {
        this._deserializer = deserializer;
        return this;
    }
    sc(operation) {
        this._operationSchema = operation;
        this._smithyContext.operationSchema = operation;
        return this;
    }
    build() {
        const closure = this;
        let CommandRef;
        return (CommandRef = class extends Command {
            input;
            static getEndpointParameterInstructions() {
                return closure._ep;
            }
            constructor(...[input]) {
                super();
                this.input = input ?? {};
                closure._init(this);
                this.schema = closure._operationSchema;
            }
            resolveMiddleware(stack, configuration, options) {
                const op = closure._operationSchema;
                const input = op?.[4] ?? op?.input;
                const output = op?.[5] ?? op?.output;
                return this.resolveMiddlewareWithContext(stack, configuration, options, {
                    CommandCtor: CommandRef,
                    middlewareFn: closure._middlewareFn,
                    clientName: closure._clientName,
                    commandName: closure._commandName,
                    inputFilterSensitiveLog: closure._inputFilterSensitiveLog ?? (op ? schemaLogFilter.bind(null, input) : (_) => _),
                    outputFilterSensitiveLog: closure._outputFilterSensitiveLog ?? (op ? schemaLogFilter.bind(null, output) : (_) => _),
                    smithyContext: closure._smithyContext,
                    additionalContext: closure._additionalContext,
                });
            }
            serialize = closure._serializer;
            deserialize = closure._deserializer;
        });
    }
}

const SENSITIVE_STRING = "***SensitiveInformation***";

const createAggregatedClient = (commands, Client, options) => {
    for (const [command, CommandCtor] of Object.entries(commands)) {
        const methodImpl = async function (args, optionsOrCb, cb) {
            const command = new CommandCtor(args);
            if (typeof optionsOrCb === "function") {
                this.send(command, optionsOrCb);
            }
            else if (typeof cb === "function") {
                if (typeof optionsOrCb !== "object")
                    throw new Error(`Expected http options but got ${typeof optionsOrCb}`);
                this.send(command, optionsOrCb || {}, cb);
            }
            else {
                return this.send(command, optionsOrCb);
            }
        };
        const methodName = (command[0].toLowerCase() + command.slice(1)).replace(/Command$/, "");
        Client.prototype[methodName] = methodImpl;
    }
    const { paginators = {}, waiters = {} } = options ?? {};
    for (const [paginatorName, paginatorFn] of Object.entries(paginators)) {
        if (Client.prototype[paginatorName] === void 0) {
            Client.prototype[paginatorName] = function (commandInput = {}, paginationConfiguration, ...rest) {
                return paginatorFn({
                    ...paginationConfiguration,
                    client: this,
                }, commandInput, ...rest);
            };
        }
    }
    for (const [waiterName, waiterFn] of Object.entries(waiters)) {
        if (Client.prototype[waiterName] === void 0) {
            Client.prototype[waiterName] = async function (commandInput = {}, waiterConfiguration, ...rest) {
                let config = waiterConfiguration;
                if (typeof waiterConfiguration === "number") {
                    config = {
                        maxWaitTime: waiterConfiguration,
                    };
                }
                return waiterFn({
                    ...config,
                    client: this,
                }, commandInput, ...rest);
            };
        }
    }
};

class ServiceException extends Error {
    $fault;
    $response;
    $retryable;
    $metadata;
    constructor(options) {
        super(options.message);
        Object.setPrototypeOf(this, Object.getPrototypeOf(this).constructor.prototype);
        this.name = options.name;
        this.$fault = options.$fault;
        this.$metadata = options.$metadata;
    }
    static isInstance(value) {
        if (!value)
            return false;
        const candidate = value;
        return (ServiceException.prototype.isPrototypeOf(candidate) ||
            (Boolean(candidate.$fault) &&
                Boolean(candidate.$metadata) &&
                (candidate.$fault === "client" || candidate.$fault === "server")));
    }
    static [Symbol.hasInstance](instance) {
        if (!instance)
            return false;
        const candidate = instance;
        if (this === ServiceException) {
            return ServiceException.isInstance(instance);
        }
        if (ServiceException.isInstance(instance)) {
            if (candidate.name && this.name) {
                return this.prototype.isPrototypeOf(instance) || candidate.name === this.name;
            }
            return this.prototype.isPrototypeOf(instance);
        }
        return false;
    }
}
const decorateServiceException = (exception, additions = {}) => {
    Object.entries(additions)
        .filter(([, v]) => v !== undefined)
        .forEach(([k, v]) => {
        if (exception[k] == undefined || exception[k] === "") {
            exception[k] = v;
        }
    });
    const message = exception.message || exception.Message || "UnknownError";
    exception.message = message;
    delete exception.Message;
    return exception;
};

const throwDefaultError = ({ output, parsedBody, exceptionCtor, errorCode }) => {
    const $metadata = deserializeMetadata(output);
    const statusCode = $metadata.httpStatusCode ? $metadata.httpStatusCode + "" : undefined;
    const response = new exceptionCtor({
        name: parsedBody?.code || parsedBody?.Code || errorCode || statusCode || "UnknownError",
        $fault: "client",
        $metadata,
    });
    throw decorateServiceException(response, parsedBody);
};
const withBaseException = (ExceptionCtor) => {
    return ({ output, parsedBody, errorCode }) => {
        throwDefaultError({ output, parsedBody, exceptionCtor: ExceptionCtor, errorCode });
    };
};
const deserializeMetadata = (output) => ({
    httpStatusCode: output.statusCode,
    requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
    extendedRequestId: output.headers["x-amz-id-2"],
    cfId: output.headers["x-amz-cf-id"],
});

const loadConfigsForDefaultMode = (mode) => {
    switch (mode) {
        case "standard":
            return {
                retryMode: "standard",
                connectionTimeout: 3100,
            };
        case "in-region":
            return {
                retryMode: "standard",
                connectionTimeout: 1100,
            };
        case "cross-region":
            return {
                retryMode: "standard",
                connectionTimeout: 3100,
            };
        case "mobile":
            return {
                retryMode: "standard",
                connectionTimeout: 30000,
            };
        default:
            return {};
    }
};

let warningEmitted = false;
const emitWarningIfUnsupportedVersion = (version) => {
    if (version && !warningEmitted && parseInt(version.substring(1, version.indexOf("."))) < 16) {
        warningEmitted = true;
    }
};

const knownAlgorithms = Object.values(types.AlgorithmId);
const getChecksumConfiguration = (runtimeConfig) => {
    const checksumAlgorithms = [];
    for (const id in types.AlgorithmId) {
        const algorithmId = types.AlgorithmId[id];
        if (runtimeConfig[algorithmId] === undefined) {
            continue;
        }
        checksumAlgorithms.push({
            algorithmId: () => algorithmId,
            checksumConstructor: () => runtimeConfig[algorithmId],
        });
    }
    for (const [id, ChecksumCtor] of Object.entries(runtimeConfig.checksumAlgorithms ?? {})) {
        checksumAlgorithms.push({
            algorithmId: () => id,
            checksumConstructor: () => ChecksumCtor,
        });
    }
    return {
        addChecksumAlgorithm(algo) {
            runtimeConfig.checksumAlgorithms = runtimeConfig.checksumAlgorithms ?? {};
            const id = algo.algorithmId();
            const ctor = algo.checksumConstructor();
            if (knownAlgorithms.includes(id)) {
                runtimeConfig.checksumAlgorithms[id.toUpperCase()] = ctor;
            }
            else {
                runtimeConfig.checksumAlgorithms[id] = ctor;
            }
            checksumAlgorithms.push(algo);
        },
        checksumAlgorithms() {
            return checksumAlgorithms;
        },
    };
};
const resolveChecksumRuntimeConfig = (clientConfig) => {
    const runtimeConfig = {};
    clientConfig.checksumAlgorithms().forEach((checksumAlgorithm) => {
        const id = checksumAlgorithm.algorithmId();
        if (knownAlgorithms.includes(id)) {
            runtimeConfig[id] = checksumAlgorithm.checksumConstructor();
        }
    });
    return runtimeConfig;
};

const getRetryConfiguration = (runtimeConfig) => {
    return {
        setRetryStrategy(retryStrategy) {
            runtimeConfig.retryStrategy = retryStrategy;
        },
        retryStrategy() {
            return runtimeConfig.retryStrategy;
        },
    };
};
const resolveRetryRuntimeConfig = (retryStrategyConfiguration) => {
    const runtimeConfig = {};
    runtimeConfig.retryStrategy = retryStrategyConfiguration.retryStrategy();
    return runtimeConfig;
};

const getDefaultExtensionConfiguration = (runtimeConfig) => {
    return Object.assign(getChecksumConfiguration(runtimeConfig), getRetryConfiguration(runtimeConfig));
};
const getDefaultClientConfiguration = getDefaultExtensionConfiguration;
const resolveDefaultRuntimeConfig = (config) => {
    return Object.assign(resolveChecksumRuntimeConfig(config), resolveRetryRuntimeConfig(config));
};

const getArrayIfSingleItem = (mayBeArray) => Array.isArray(mayBeArray) ? mayBeArray : [mayBeArray];

const getValueFromTextNode = (obj) => {
    const textNodeName = "#text";
    for (const key in obj) {
        if (obj.hasOwnProperty(key) && obj[key][textNodeName] !== undefined) {
            obj[key] = obj[key][textNodeName];
        }
        else if (typeof obj[key] === "object" && obj[key] !== null) {
            obj[key] = getValueFromTextNode(obj[key]);
        }
    }
    return obj;
};

const isSerializableHeaderValue = (value) => {
    return value != null;
};

class NoOpLogger {
    trace() { }
    debug() { }
    info() { }
    warn() { }
    error() { }
}

function map(arg0, arg1, arg2) {
    let target;
    let filter;
    let instructions;
    if (typeof arg1 === "undefined" && typeof arg2 === "undefined") {
        target = {};
        instructions = arg0;
    }
    else {
        target = arg0;
        if (typeof arg1 === "function") {
            filter = arg1;
            instructions = arg2;
            return mapWithFilter(target, filter, instructions);
        }
        else {
            instructions = arg1;
        }
    }
    for (const key of Object.keys(instructions)) {
        if (!Array.isArray(instructions[key])) {
            target[key] = instructions[key];
            continue;
        }
        applyInstruction(target, null, instructions, key);
    }
    return target;
}
const convertMap = (target) => {
    const output = {};
    for (const [k, v] of Object.entries(target || {})) {
        output[k] = [, v];
    }
    return output;
};
const take = (source, instructions) => {
    const out = {};
    for (const key in instructions) {
        applyInstruction(out, source, instructions, key);
    }
    return out;
};
const mapWithFilter = (target, filter, instructions) => {
    return map(target, Object.entries(instructions).reduce((_instructions, [key, value]) => {
        if (Array.isArray(value)) {
            _instructions[key] = value;
        }
        else {
            if (typeof value === "function") {
                _instructions[key] = [filter, value()];
            }
            else {
                _instructions[key] = [filter, value];
            }
        }
        return _instructions;
    }, {}));
};
const applyInstruction = (target, source, instructions, targetKey) => {
    if (source !== null) {
        let instruction = instructions[targetKey];
        if (typeof instruction === "function") {
            instruction = [, instruction];
        }
        const [filter = nonNullish, valueFn = pass, sourceKey = targetKey] = instruction;
        if ((typeof filter === "function" && filter(source[sourceKey])) || (typeof filter !== "function" && !!filter)) {
            target[targetKey] = valueFn(source[sourceKey]);
        }
        return;
    }
    let [filter, value] = instructions[targetKey];
    if (typeof value === "function") {
        let _value;
        const defaultFilterPassed = filter === undefined && (_value = value()) != null;
        const customFilterPassed = (typeof filter === "function" && !!filter(void 0)) || (typeof filter !== "function" && !!filter);
        if (defaultFilterPassed) {
            target[targetKey] = _value;
        }
        else if (customFilterPassed) {
            target[targetKey] = value();
        }
    }
    else {
        const defaultFilterPassed = filter === undefined && value != null;
        const customFilterPassed = (typeof filter === "function" && !!filter(value)) || (typeof filter !== "function" && !!filter);
        if (defaultFilterPassed || customFilterPassed) {
            target[targetKey] = value;
        }
    }
};
const nonNullish = (_) => _ != null;
const pass = (_) => _;

const serializeFloat = (value) => {
    if (value !== value) {
        return "NaN";
    }
    switch (value) {
        case Infinity:
            return "Infinity";
        case -Infinity:
            return "-Infinity";
        default:
            return value;
    }
};
const serializeDateTime = (date) => date.toISOString().replace(".000Z", "Z");

const _json = (obj) => {
    if (obj == null) {
        return {};
    }
    if (Array.isArray(obj)) {
        return obj.filter((_) => _ != null).map(_json);
    }
    if (typeof obj === "object") {
        const target = {};
        for (const key of Object.keys(obj)) {
            if (obj[key] == null) {
                continue;
            }
            target[key] = _json(obj[key]);
        }
        return target;
    }
    return obj;
};

exports.AlgorithmId = types.AlgorithmId;
exports.Client = Client;
exports.Command = Command;
exports.NoOpLogger = NoOpLogger;
exports.SENSITIVE_STRING = SENSITIVE_STRING;
exports.ServiceException = ServiceException;
exports._json = _json;
exports.checkExceptions = checkExceptions;
exports.constructStack = constructStack;
exports.convertMap = convertMap;
exports.createAggregatedClient = createAggregatedClient;
exports.createWaiter = createWaiter;
exports.decorateServiceException = decorateServiceException;
exports.emitWarningIfUnsupportedVersion = emitWarningIfUnsupportedVersion;
exports.getArrayIfSingleItem = getArrayIfSingleItem;
exports.getChecksumConfiguration = getChecksumConfiguration;
exports.getDefaultClientConfiguration = getDefaultClientConfiguration;
exports.getDefaultExtensionConfiguration = getDefaultExtensionConfiguration;
exports.getRetryConfiguration = getRetryConfiguration;
exports.getSmithyContext = getSmithyContext;
exports.getValueFromTextNode = getValueFromTextNode;
exports.invalidFunction = invalidFunction;
exports.invalidProvider = invalidProvider;
exports.isSerializableHeaderValue = isSerializableHeaderValue;
exports.loadConfigsForDefaultMode = loadConfigsForDefaultMode;
exports.map = map;
exports.normalizeProvider = normalizeProvider;
exports.resolveChecksumRuntimeConfig = resolveChecksumRuntimeConfig;
exports.resolveDefaultRuntimeConfig = resolveDefaultRuntimeConfig;
exports.resolveRetryRuntimeConfig = resolveRetryRuntimeConfig;
exports.schemaLogFilter = schemaLogFilter;
exports.serializeDateTime = serializeDateTime;
exports.serializeFloat = serializeFloat;
exports.take = take;
exports.throwDefaultError = throwDefaultError;
exports.waiterServiceDefaults = waiterServiceDefaults;
exports.withBaseException = withBaseException;


/***/ }),

/***/ 99659:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var node_os = __webpack_require__(48161);
var node_path = __webpack_require__(76760);
var node_crypto = __webpack_require__(77598);
var promises = __webpack_require__(51455);
var types = __webpack_require__(39654);
var client = __webpack_require__(63234);
var endpoints = __webpack_require__(86773);

class ProviderError extends Error {
    name = "ProviderError";
    tryNextLink;
    constructor(message, options = true) {
        let logger;
        let tryNextLink = true;
        if (typeof options === "boolean") {
            logger = undefined;
            tryNextLink = options;
        }
        else if (options != null && typeof options === "object") {
            logger = options.logger;
            tryNextLink = options.tryNextLink ?? true;
        }
        super(message);
        this.tryNextLink = tryNextLink;
        Object.setPrototypeOf(this, ProviderError.prototype);
        logger?.debug?.(`@smithy/property-provider ${tryNextLink ? "->" : "(!)"} ${message}`);
    }
    static from(error, options = true) {
        return Object.assign(new this(error.message, options), error);
    }
}

class CredentialsProviderError extends ProviderError {
    name = "CredentialsProviderError";
    constructor(message, options = true) {
        super(message, options);
        Object.setPrototypeOf(this, CredentialsProviderError.prototype);
    }
}

class TokenProviderError extends ProviderError {
    name = "TokenProviderError";
    constructor(message, options = true) {
        super(message, options);
        Object.setPrototypeOf(this, TokenProviderError.prototype);
    }
}

const chain = (...providers) => async () => {
    if (providers.length === 0) {
        throw new ProviderError("No providers in chain");
    }
    let lastProviderError;
    for (const provider of providers) {
        try {
            const credentials = await provider();
            return credentials;
        }
        catch (err) {
            lastProviderError = err;
            if (err?.tryNextLink) {
                continue;
            }
            throw err;
        }
    }
    throw lastProviderError;
};

const fromValue = (staticValue) => () => Promise.resolve(staticValue);

const memoize = (provider, isExpired, requiresRefresh) => {
    let resolved;
    let pending;
    let hasResult;
    let isConstant = false;
    const coalesceProvider = async () => {
        if (!pending) {
            pending = provider();
        }
        try {
            resolved = await pending;
            hasResult = true;
            isConstant = false;
        }
        finally {
            pending = undefined;
        }
        return resolved;
    };
    if (isExpired === undefined) {
        return async (options) => {
            if (!hasResult || options?.forceRefresh) {
                resolved = await coalesceProvider();
            }
            return resolved;
        };
    }
    return async (options) => {
        if (!hasResult || options?.forceRefresh) {
            resolved = await coalesceProvider();
        }
        if (isConstant) {
            return resolved;
        }
        if (requiresRefresh && !requiresRefresh(resolved)) {
            isConstant = true;
            return resolved;
        }
        if (isExpired(resolved)) {
            await coalesceProvider();
            return resolved;
        }
        return resolved;
    };
};

const booleanSelector = (obj, key, type) => {
    if (!(key in obj))
        return undefined;
    if (obj[key] === "true")
        return true;
    if (obj[key] === "false")
        return false;
    throw new Error(`Cannot load ${type} "${key}". Expected "true" or "false", got ${obj[key]}.`);
};

const numberSelector = (obj, key, type) => {
    if (!(key in obj))
        return undefined;
    const numberValue = parseInt(obj[key], 10);
    if (Number.isNaN(numberValue)) {
        throw new TypeError(`Cannot load ${type} '${key}'. Expected number, got '${obj[key]}'.`);
    }
    return numberValue;
};

exports.SelectorType = void 0;
(function (SelectorType) {
    SelectorType["ENV"] = "env";
    SelectorType["CONFIG"] = "shared config entry";
})(exports.SelectorType || (exports.SelectorType = {}));

const homeDirCache = {};
const getHomeDirCacheKey = () => {
    if (process && process.geteuid) {
        return `${process.geteuid()}`;
    }
    return "DEFAULT";
};
const getHomeDir = () => {
    const { HOME, USERPROFILE, HOMEPATH, HOMEDRIVE = `C:${node_path.sep}` } = process.env;
    if (HOME)
        return HOME;
    if (USERPROFILE)
        return USERPROFILE;
    if (HOMEPATH)
        return `${HOMEDRIVE}${HOMEPATH}`;
    const homeDirCacheKey = getHomeDirCacheKey();
    if (!homeDirCache[homeDirCacheKey])
        homeDirCache[homeDirCacheKey] = node_os.homedir();
    return homeDirCache[homeDirCacheKey];
};

const ENV_PROFILE = "AWS_PROFILE";
const DEFAULT_PROFILE = "default";
const getProfileName = (init) => init.profile || process.env[ENV_PROFILE] || DEFAULT_PROFILE;

const getSSOTokenFilepath = (id) => {
    const hasher = node_crypto.createHash("sha1");
    const cacheName = hasher.update(id).digest("hex");
    return node_path.join(getHomeDir(), ".aws", "sso", "cache", `${cacheName}.json`);
};

const tokenIntercept = {};
const getSSOTokenFromFile = async (id) => {
    if (tokenIntercept[id]) {
        return tokenIntercept[id];
    }
    const ssoTokenFilepath = getSSOTokenFilepath(id);
    const ssoTokenText = await promises.readFile(ssoTokenFilepath, "utf8");
    return JSON.parse(ssoTokenText);
};

const CONFIG_PREFIX_SEPARATOR = ".";

const getConfigData = (data) => Object.entries(data)
    .filter(([key]) => {
    const indexOfSeparator = key.indexOf(CONFIG_PREFIX_SEPARATOR);
    if (indexOfSeparator === -1) {
        return false;
    }
    return Object.values(types.IniSectionType).includes(key.substring(0, indexOfSeparator));
})
    .reduce((acc, [key, value]) => {
    const indexOfSeparator = key.indexOf(CONFIG_PREFIX_SEPARATOR);
    const updatedKey = key.substring(0, indexOfSeparator) === types.IniSectionType.PROFILE ? key.substring(indexOfSeparator + 1) : key;
    acc[updatedKey] = value;
    return acc;
}, {
    ...(data.default && { default: data.default }),
});

const ENV_CONFIG_PATH = "AWS_CONFIG_FILE";
const getConfigFilepath = () => process.env[ENV_CONFIG_PATH] || node_path.join(getHomeDir(), ".aws", "config");

const ENV_CREDENTIALS_PATH = "AWS_SHARED_CREDENTIALS_FILE";
const getCredentialsFilepath = () => process.env[ENV_CREDENTIALS_PATH] || node_path.join(getHomeDir(), ".aws", "credentials");

const prefixKeyRegex = /^([\w-]+)\s(["'])?([\w-@\+\.%:/]+)\2$/;
const profileNameBlockList = ["__proto__", "profile __proto__"];
const parseIni = (iniData) => {
    const map = {};
    let currentSection;
    let currentSubSection;
    for (const iniLine of iniData.split(/\r?\n/)) {
        const trimmedLine = iniLine.split(/(^|\s)[;#]/)[0].trim();
        const isSection = trimmedLine[0] === "[" && trimmedLine[trimmedLine.length - 1] === "]";
        if (isSection) {
            currentSection = undefined;
            currentSubSection = undefined;
            const sectionName = trimmedLine.substring(1, trimmedLine.length - 1);
            const matches = prefixKeyRegex.exec(sectionName);
            if (matches) {
                const [, prefix, , name] = matches;
                if (Object.values(types.IniSectionType).includes(prefix)) {
                    currentSection = [prefix, name].join(CONFIG_PREFIX_SEPARATOR);
                }
            }
            else {
                currentSection = sectionName;
            }
            if (profileNameBlockList.includes(sectionName)) {
                throw new Error(`Found invalid profile name "${sectionName}"`);
            }
        }
        else if (currentSection) {
            const indexOfEqualsSign = trimmedLine.indexOf("=");
            if (![0, -1].includes(indexOfEqualsSign)) {
                const [name, value] = [
                    trimmedLine.substring(0, indexOfEqualsSign).trim(),
                    trimmedLine.substring(indexOfEqualsSign + 1).trim(),
                ];
                if (value === "") {
                    currentSubSection = name;
                }
                else {
                    if (currentSubSection && iniLine.trimStart() === iniLine) {
                        currentSubSection = undefined;
                    }
                    map[currentSection] = map[currentSection] || {};
                    const key = currentSubSection ? [currentSubSection, name].join(CONFIG_PREFIX_SEPARATOR) : name;
                    map[currentSection][key] = value;
                }
            }
        }
    }
    return map;
};

const filePromises = {};
const fileIntercept = {};
const readFile = (path, options) => {
    if (fileIntercept[path] !== undefined) {
        return fileIntercept[path];
    }
    if (!filePromises[path] || options?.ignoreCache) {
        filePromises[path] = promises.readFile(path, "utf8");
    }
    return filePromises[path];
};

const swallowError$1 = () => ({});
const loadSharedConfigFiles = async (init = {}) => {
    const { filepath = getCredentialsFilepath(), configFilepath = getConfigFilepath() } = init;
    const homeDir = getHomeDir();
    const relativeHomeDirPrefix = "~/";
    let resolvedFilepath = filepath;
    if (filepath.startsWith(relativeHomeDirPrefix)) {
        resolvedFilepath = node_path.join(homeDir, filepath.slice(2));
    }
    let resolvedConfigFilepath = configFilepath;
    if (configFilepath.startsWith(relativeHomeDirPrefix)) {
        resolvedConfigFilepath = node_path.join(homeDir, configFilepath.slice(2));
    }
    const parsedFiles = await Promise.all([
        readFile(resolvedConfigFilepath, {
            ignoreCache: init.ignoreCache,
        })
            .then(parseIni)
            .then(getConfigData)
            .catch(swallowError$1),
        readFile(resolvedFilepath, {
            ignoreCache: init.ignoreCache,
        })
            .then(parseIni)
            .catch(swallowError$1),
    ]);
    return {
        configFile: parsedFiles[0],
        credentialsFile: parsedFiles[1],
    };
};

const getSsoSessionData = (data) => Object.entries(data)
    .filter(([key]) => key.startsWith(types.IniSectionType.SSO_SESSION + CONFIG_PREFIX_SEPARATOR))
    .reduce((acc, [key, value]) => ({ ...acc, [key.substring(key.indexOf(CONFIG_PREFIX_SEPARATOR) + 1)]: value }), {});

const swallowError = () => ({});
const loadSsoSessionData = async (init = {}) => readFile(init.configFilepath ?? getConfigFilepath())
    .then(parseIni)
    .then(getSsoSessionData)
    .catch(swallowError);

const mergeConfigFiles = (...files) => {
    const merged = {};
    for (const file of files) {
        for (const [key, values] of Object.entries(file)) {
            if (merged[key] !== undefined) {
                Object.assign(merged[key], values);
            }
            else {
                merged[key] = values;
            }
        }
    }
    return merged;
};

const parseKnownFiles = async (init) => {
    const parsedFiles = await loadSharedConfigFiles(init);
    return mergeConfigFiles(parsedFiles.configFile, parsedFiles.credentialsFile);
};

const externalDataInterceptor = {
    getFileRecord() {
        return fileIntercept;
    },
    interceptFile(path, contents) {
        fileIntercept[path] = Promise.resolve(contents);
    },
    getTokenRecord() {
        return tokenIntercept;
    },
    interceptToken(id, contents) {
        tokenIntercept[id] = contents;
    },
};

function getSelectorName(functionString) {
    try {
        const constants = new Set(Array.from(functionString.match(/([A-Z_]){3,}/g) ?? []));
        constants.delete("CONFIG");
        constants.delete("CONFIG_PREFIX_SEPARATOR");
        constants.delete("ENV");
        return [...constants].join(", ");
    }
    catch (e) {
        return functionString;
    }
}

const fromEnv = (envVarSelector, options) => async () => {
    try {
        const config = envVarSelector(process.env, options);
        if (config === undefined) {
            throw new Error();
        }
        return config;
    }
    catch (e) {
        throw new CredentialsProviderError(e.message || `Not found in ENV: ${getSelectorName(envVarSelector.toString())}`, { logger: options?.logger });
    }
};

const fromSharedConfigFiles = (configSelector, { preferredFile = "config", ...init } = {}) => async () => {
    const profile = getProfileName(init);
    const { configFile, credentialsFile } = await loadSharedConfigFiles(init);
    const profileFromCredentials = credentialsFile[profile] || {};
    const profileFromConfig = configFile[profile] || {};
    const mergedProfile = preferredFile === "config"
        ? { ...profileFromCredentials, ...profileFromConfig }
        : { ...profileFromConfig, ...profileFromCredentials };
    try {
        const cfgFile = preferredFile === "config" ? configFile : credentialsFile;
        const configValue = configSelector(mergedProfile, cfgFile);
        if (configValue === undefined) {
            throw new Error();
        }
        return configValue;
    }
    catch (e) {
        throw new CredentialsProviderError(e.message || `Not found in config files w/ profile [${profile}]: ${getSelectorName(configSelector.toString())}`, { logger: init.logger });
    }
};

const isFunction = (func) => typeof func === "function";
const fromStatic = (defaultValue) => isFunction(defaultValue) ? async () => await defaultValue() : fromValue(defaultValue);

const loadConfig = ({ environmentVariableSelector, configFileSelector, default: defaultValue }, configuration = {}) => {
    const { signingName, logger } = configuration;
    const envOptions = { signingName, logger };
    return memoize(chain(fromEnv(environmentVariableSelector, envOptions), fromSharedConfigFiles(configFileSelector, configuration), fromStatic(defaultValue)));
};

const ENV_USE_DUALSTACK_ENDPOINT = "AWS_USE_DUALSTACK_ENDPOINT";
const CONFIG_USE_DUALSTACK_ENDPOINT = "use_dualstack_endpoint";
const DEFAULT_USE_DUALSTACK_ENDPOINT = false;
const NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => booleanSelector(env, ENV_USE_DUALSTACK_ENDPOINT, exports.SelectorType.ENV),
    configFileSelector: (profile) => booleanSelector(profile, CONFIG_USE_DUALSTACK_ENDPOINT, exports.SelectorType.CONFIG),
    default: false,
};
const nodeDualstackConfigSelectors = {
    environmentVariableSelector: (env) => booleanSelector(env, ENV_USE_DUALSTACK_ENDPOINT, exports.SelectorType.ENV),
    configFileSelector: (profile) => booleanSelector(profile, CONFIG_USE_DUALSTACK_ENDPOINT, exports.SelectorType.CONFIG),
    default: undefined,
};

const ENV_USE_FIPS_ENDPOINT = "AWS_USE_FIPS_ENDPOINT";
const CONFIG_USE_FIPS_ENDPOINT = "use_fips_endpoint";
const DEFAULT_USE_FIPS_ENDPOINT = false;
const NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => booleanSelector(env, ENV_USE_FIPS_ENDPOINT, exports.SelectorType.ENV),
    configFileSelector: (profile) => booleanSelector(profile, CONFIG_USE_FIPS_ENDPOINT, exports.SelectorType.CONFIG),
    default: false,
};
const nodeFipsConfigSelectors = {
    environmentVariableSelector: (env) => booleanSelector(env, ENV_USE_FIPS_ENDPOINT, exports.SelectorType.ENV),
    configFileSelector: (profile) => booleanSelector(profile, CONFIG_USE_FIPS_ENDPOINT, exports.SelectorType.CONFIG),
    default: undefined,
};

const resolveCustomEndpointsConfig = (input) => {
    const { tls, endpoint, urlParser, useDualstackEndpoint } = input;
    return Object.assign(input, {
        tls: tls ?? true,
        endpoint: client.normalizeProvider(typeof endpoint === "string" ? urlParser(endpoint) : endpoint),
        isCustomEndpoint: true,
        useDualstackEndpoint: client.normalizeProvider(useDualstackEndpoint ?? false),
    });
};

const getEndpointFromRegion = async (input) => {
    const { tls = true } = input;
    const region = await input.region();
    const dnsHostRegex = new RegExp(/^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])$/);
    if (!dnsHostRegex.test(region)) {
        throw new Error("Invalid region in client config");
    }
    const useDualstackEndpoint = await input.useDualstackEndpoint();
    const useFipsEndpoint = await input.useFipsEndpoint();
    const { hostname } = (await input.regionInfoProvider(region, { useDualstackEndpoint, useFipsEndpoint })) ?? {};
    if (!hostname) {
        throw new Error("Cannot resolve hostname from client config");
    }
    return input.urlParser(`${tls ? "https:" : "http:"}//${hostname}`);
};

const resolveEndpointsConfig = (input) => {
    const useDualstackEndpoint = client.normalizeProvider(input.useDualstackEndpoint ?? false);
    const { endpoint, useFipsEndpoint, urlParser, tls } = input;
    return Object.assign(input, {
        tls: tls ?? true,
        endpoint: endpoint
            ? client.normalizeProvider(typeof endpoint === "string" ? urlParser(endpoint) : endpoint)
            : () => getEndpointFromRegion({ ...input, useDualstackEndpoint, useFipsEndpoint }),
        isCustomEndpoint: !!endpoint,
        useDualstackEndpoint,
    });
};

const REGION_ENV_NAME = "AWS_REGION";
const REGION_INI_NAME = "region";
const NODE_REGION_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => env[REGION_ENV_NAME],
    configFileSelector: (profile) => profile[REGION_INI_NAME],
    default: () => {
        throw new Error("Region is missing");
    },
};
const NODE_REGION_CONFIG_FILE_OPTIONS = {
    preferredFile: "credentials",
};

const validRegions = new Set();
const checkRegion = (region, check = endpoints.isValidHostLabel) => {
    if (!validRegions.has(region) && !check(region)) {
        if (region === "*") {
            console.warn(`@smithy/config-resolver WARN - Please use the caller region instead of "*". See "sigv4a" in https://github.com/aws/aws-sdk-js-v3/blob/main/supplemental-docs/CLIENTS.md.`);
        }
        else {
            throw new Error(`Region not accepted: region="${region}" is not a valid hostname component.`);
        }
    }
    else {
        validRegions.add(region);
    }
};

const isFipsRegion = (region) => typeof region === "string" && (region.startsWith("fips-") || region.endsWith("-fips"));

const getRealRegion = (region) => isFipsRegion(region)
    ? ["fips-aws-global", "aws-fips"].includes(region)
        ? "us-east-1"
        : region.replace(/fips-(dkr-|prod-)?|-fips/, "")
    : region;

const resolveRegionConfig = (input) => {
    const { region, useFipsEndpoint } = input;
    if (!region) {
        throw new Error("Region is missing");
    }
    return Object.assign(input, {
        region: async () => {
            const providedRegion = typeof region === "function" ? await region() : region;
            const realRegion = getRealRegion(providedRegion);
            checkRegion(realRegion);
            return realRegion;
        },
        useFipsEndpoint: async () => {
            const providedRegion = typeof region === "string" ? region : await region();
            if (isFipsRegion(providedRegion)) {
                return true;
            }
            return typeof useFipsEndpoint !== "function" ? Promise.resolve(!!useFipsEndpoint) : useFipsEndpoint();
        },
    });
};

const getHostnameFromVariants = (variants = [], { useFipsEndpoint, useDualstackEndpoint }) => variants.find(({ tags }) => useFipsEndpoint === tags.includes("fips") && useDualstackEndpoint === tags.includes("dualstack"))?.hostname;

const getResolvedHostname = (resolvedRegion, { regionHostname, partitionHostname }) => regionHostname
    ? regionHostname
    : partitionHostname
        ? partitionHostname.replace("{region}", resolvedRegion)
        : undefined;

const getResolvedPartition = (region, { partitionHash }) => Object.keys(partitionHash || {}).find((key) => partitionHash[key].regions.includes(region)) ?? "aws";

const getResolvedSigningRegion = (hostname, { signingRegion, regionRegex, useFipsEndpoint }) => {
    if (signingRegion) {
        return signingRegion;
    }
    else if (useFipsEndpoint) {
        const regionRegexJs = regionRegex.replace("\\\\", "\\").replace(/^\^/g, "\\.").replace(/\$$/g, "\\.");
        const regionRegexmatchArray = hostname.match(regionRegexJs);
        if (regionRegexmatchArray) {
            return regionRegexmatchArray[0].slice(1, -1);
        }
    }
};

const getRegionInfo = (region, { useFipsEndpoint = false, useDualstackEndpoint = false, signingService, regionHash, partitionHash, }) => {
    const partition = getResolvedPartition(region, { partitionHash });
    const resolvedRegion = region in regionHash ? region : partitionHash[partition]?.endpoint ?? region;
    const hostnameOptions = { useFipsEndpoint, useDualstackEndpoint };
    const regionHostname = getHostnameFromVariants(regionHash[resolvedRegion]?.variants, hostnameOptions);
    const partitionHostname = getHostnameFromVariants(partitionHash[partition]?.variants, hostnameOptions);
    const hostname = getResolvedHostname(resolvedRegion, { regionHostname, partitionHostname });
    if (hostname === undefined) {
        throw new Error(`Endpoint resolution failed for: ${{ resolvedRegion, useFipsEndpoint, useDualstackEndpoint }}`);
    }
    const signingRegion = getResolvedSigningRegion(hostname, {
        signingRegion: regionHash[resolvedRegion]?.signingRegion,
        regionRegex: partitionHash[partition].regionRegex,
        useFipsEndpoint,
    });
    return {
        partition,
        signingService,
        hostname,
        ...(signingRegion && { signingRegion }),
        ...(regionHash[resolvedRegion]?.signingService && {
            signingService: regionHash[resolvedRegion].signingService,
        }),
    };
};

const AWS_EXECUTION_ENV = "AWS_EXECUTION_ENV";
const AWS_REGION_ENV = "AWS_REGION";
const AWS_DEFAULT_REGION_ENV = "AWS_DEFAULT_REGION";
const ENV_IMDS_DISABLED = "AWS_EC2_METADATA_DISABLED";
const DEFAULTS_MODE_OPTIONS = ["in-region", "cross-region", "mobile", "standard", "legacy"];
const IMDS_REGION_PATH = "/latest/meta-data/placement/region";

const AWS_DEFAULTS_MODE_ENV = "AWS_DEFAULTS_MODE";
const AWS_DEFAULTS_MODE_CONFIG = "defaults_mode";
const NODE_DEFAULTS_MODE_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => {
        return env[AWS_DEFAULTS_MODE_ENV];
    },
    configFileSelector: (profile) => {
        return profile[AWS_DEFAULTS_MODE_CONFIG];
    },
    default: "legacy",
};

const resolveDefaultsModeConfig = ({ region = loadConfig(NODE_REGION_CONFIG_OPTIONS), defaultsMode = loadConfig(NODE_DEFAULTS_MODE_CONFIG_OPTIONS), } = {}) => memoize(async () => {
    const mode = typeof defaultsMode === "function" ? await defaultsMode() : defaultsMode;
    switch (mode?.toLowerCase()) {
        case "auto":
            return resolveNodeDefaultsModeAuto(region);
        case "in-region":
        case "cross-region":
        case "mobile":
        case "standard":
        case "legacy":
            return Promise.resolve(mode?.toLocaleLowerCase());
        case undefined:
            return Promise.resolve("legacy");
        default:
            throw new Error(`Invalid parameter for "defaultsMode", expect ${DEFAULTS_MODE_OPTIONS.join(", ")}, got ${mode}`);
    }
});
const resolveNodeDefaultsModeAuto = async (clientRegion) => {
    if (clientRegion) {
        const resolvedRegion = typeof clientRegion === "function" ? await clientRegion() : clientRegion;
        const inferredRegion = await inferPhysicalRegion();
        if (!inferredRegion) {
            return "standard";
        }
        if (resolvedRegion === inferredRegion) {
            return "in-region";
        }
        else {
            return "cross-region";
        }
    }
    return "standard";
};
const inferPhysicalRegion = async () => {
    if (process.env[AWS_EXECUTION_ENV] && (process.env[AWS_REGION_ENV] || process.env[AWS_DEFAULT_REGION_ENV])) {
        return process.env[AWS_REGION_ENV] ?? process.env[AWS_DEFAULT_REGION_ENV];
    }
    if (!process.env[ENV_IMDS_DISABLED]) {
        try {
            const endpoint = await getImdsEndpoint();
            return (await imdsHttpGet({ hostname: endpoint.hostname, path: IMDS_REGION_PATH })).toString();
        }
        catch (e) {
        }
    }
};
const getImdsEndpoint = async () => {
    const envEndpoint = process.env.AWS_EC2_METADATA_SERVICE_ENDPOINT;
    if (envEndpoint) {
        const url = new URL(envEndpoint);
        return { hostname: url.hostname, path: url.pathname };
    }
    const envMode = process.env.AWS_EC2_METADATA_SERVICE_ENDPOINT_MODE;
    if (envMode === "IPv6") {
        return { hostname: "fd00:ec2::254", path: "/" };
    }
    return { hostname: "169.254.169.254", path: "/" };
};
const imdsHttpGet = async ({ hostname, path }) => {
    const { request } = await Promise.resolve(/* import() */).then(__webpack_require__.t.bind(__webpack_require__, 37067, 23));
    return new Promise((resolve, reject) => {
        const req = request({
            method: "GET",
            hostname: hostname.replace(/^\[(.+)]$/, "$1"),
            path,
            timeout: 1000,
            signal: AbortSignal.timeout(1000),
        });
        req.on("error", (err) => {
            reject(err);
            req.destroy();
        });
        req.on("timeout", () => {
            reject(new Error("TimeoutError from instance metadata service"));
            req.destroy();
        });
        req.on("response", (res) => {
            const { statusCode = 400 } = res;
            if (statusCode < 200 || 300 <= statusCode) {
                reject(Object.assign(new Error("Error response received from instance metadata service"), { statusCode }));
                req.destroy();
                return;
            }
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => {
                resolve(Buffer.concat(chunks));
                req.destroy();
            });
        });
        req.end();
    });
};

exports.CONFIG_PREFIX_SEPARATOR = CONFIG_PREFIX_SEPARATOR;
exports.CONFIG_USE_DUALSTACK_ENDPOINT = CONFIG_USE_DUALSTACK_ENDPOINT;
exports.CONFIG_USE_FIPS_ENDPOINT = CONFIG_USE_FIPS_ENDPOINT;
exports.CredentialsProviderError = CredentialsProviderError;
exports.DEFAULT_PROFILE = DEFAULT_PROFILE;
exports.DEFAULT_USE_DUALSTACK_ENDPOINT = DEFAULT_USE_DUALSTACK_ENDPOINT;
exports.DEFAULT_USE_FIPS_ENDPOINT = DEFAULT_USE_FIPS_ENDPOINT;
exports.ENV_PROFILE = ENV_PROFILE;
exports.ENV_USE_DUALSTACK_ENDPOINT = ENV_USE_DUALSTACK_ENDPOINT;
exports.ENV_USE_FIPS_ENDPOINT = ENV_USE_FIPS_ENDPOINT;
exports.NODE_REGION_CONFIG_FILE_OPTIONS = NODE_REGION_CONFIG_FILE_OPTIONS;
exports.NODE_REGION_CONFIG_OPTIONS = NODE_REGION_CONFIG_OPTIONS;
exports.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS = NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS;
exports.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS = NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS;
exports.ProviderError = ProviderError;
exports.REGION_ENV_NAME = REGION_ENV_NAME;
exports.REGION_INI_NAME = REGION_INI_NAME;
exports.TokenProviderError = TokenProviderError;
exports.booleanSelector = booleanSelector;
exports.chain = chain;
exports.externalDataInterceptor = externalDataInterceptor;
exports.fromStatic = fromStatic;
exports.fromValue = fromValue;
exports.getHomeDir = getHomeDir;
exports.getProfileName = getProfileName;
exports.getRegionInfo = getRegionInfo;
exports.getSSOTokenFilepath = getSSOTokenFilepath;
exports.getSSOTokenFromFile = getSSOTokenFromFile;
exports.loadConfig = loadConfig;
exports.loadSharedConfigFiles = loadSharedConfigFiles;
exports.loadSsoSessionData = loadSsoSessionData;
exports.memoize = memoize;
exports.nodeDualstackConfigSelectors = nodeDualstackConfigSelectors;
exports.nodeFipsConfigSelectors = nodeFipsConfigSelectors;
exports.numberSelector = numberSelector;
exports.parseKnownFiles = parseKnownFiles;
exports.readFile = readFile;
exports.resolveCustomEndpointsConfig = resolveCustomEndpointsConfig;
exports.resolveDefaultsModeConfig = resolveDefaultsModeConfig;
exports.resolveEndpointsConfig = resolveEndpointsConfig;
exports.resolveRegionConfig = resolveRegionConfig;


/***/ }),

/***/ 86773:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var config = __webpack_require__(99659);
var protocols = __webpack_require__(45598);
var client = __webpack_require__(63234);
var types = __webpack_require__(39654);

const ENV_ENDPOINT_URL = "AWS_ENDPOINT_URL";
const CONFIG_ENDPOINT_URL = "endpoint_url";
const getEndpointUrlConfig = (serviceId) => ({
    environmentVariableSelector: (env) => {
        const serviceSuffixParts = serviceId.split(" ").map((w) => w.toUpperCase());
        const serviceEndpointUrl = env[[ENV_ENDPOINT_URL, ...serviceSuffixParts].join("_")];
        if (serviceEndpointUrl)
            return serviceEndpointUrl;
        const endpointUrl = env[ENV_ENDPOINT_URL];
        if (endpointUrl)
            return endpointUrl;
        return undefined;
    },
    configFileSelector: (profile, config$1) => {
        if (config$1 && profile.services) {
            const servicesSection = config$1[["services", profile.services].join(config.CONFIG_PREFIX_SEPARATOR)];
            if (servicesSection) {
                const servicePrefixParts = serviceId.split(" ").map((w) => w.toLowerCase());
                const endpointUrl = servicesSection[[servicePrefixParts.join("_"), CONFIG_ENDPOINT_URL].join(config.CONFIG_PREFIX_SEPARATOR)];
                if (endpointUrl)
                    return endpointUrl;
            }
        }
        const endpointUrl = profile[CONFIG_ENDPOINT_URL];
        if (endpointUrl)
            return endpointUrl;
        return undefined;
    },
    default: undefined,
});

const getEndpointFromConfig = async (serviceId) => config.loadConfig(getEndpointUrlConfig(serviceId ?? ""))();

const resolveParamsForS3 = async (endpointParams) => {
    const bucket = endpointParams?.Bucket || "";
    if (typeof endpointParams.Bucket === "string") {
        endpointParams.Bucket = bucket.replace(/#/g, encodeURIComponent("#")).replace(/\?/g, encodeURIComponent("?"));
    }
    if (isArnBucketName(bucket)) {
        if (endpointParams.ForcePathStyle === true) {
            throw new Error("Path-style addressing cannot be used with ARN buckets");
        }
    }
    else if (!isDnsCompatibleBucketName(bucket) ||
        (bucket.indexOf(".") !== -1 && !String(endpointParams.Endpoint).startsWith("http:")) ||
        bucket.toLowerCase() !== bucket ||
        bucket.length < 3) {
        endpointParams.ForcePathStyle = true;
    }
    if (endpointParams.DisableMultiRegionAccessPoints) {
        endpointParams.disableMultiRegionAccessPoints = true;
        endpointParams.DisableMRAP = true;
    }
    return endpointParams;
};
const DOMAIN_PATTERN = /^[a-z0-9][a-z0-9\.\-]{1,61}[a-z0-9]$/;
const IP_ADDRESS_PATTERN = /(\d+\.){3}\d+/;
const DOTS_PATTERN = /\.\./;
const isDnsCompatibleBucketName = (bucketName) => DOMAIN_PATTERN.test(bucketName) && !IP_ADDRESS_PATTERN.test(bucketName) && !DOTS_PATTERN.test(bucketName);
const isArnBucketName = (bucketName) => {
    const [arn, partition, service, , , bucket] = bucketName.split(":");
    const isArn = arn === "arn" && bucketName.split(":").length >= 6;
    const isValidArn = Boolean(isArn && partition && service && bucket);
    if (isArn && !isValidArn) {
        throw new Error(`Invalid ARN: ${bucketName} was an invalid ARN.`);
    }
    return isValidArn;
};

const createConfigValueProvider = (configKey, canonicalEndpointParamKey, config, isClientContextParam = false) => {
    const configProvider = async () => {
        let configValue;
        if (isClientContextParam) {
            const clientContextParams = config.clientContextParams;
            const nestedValue = clientContextParams?.[configKey];
            configValue = nestedValue ?? config[configKey] ?? config[canonicalEndpointParamKey];
        }
        else {
            configValue = config[configKey] ?? config[canonicalEndpointParamKey];
        }
        if (typeof configValue === "function") {
            return configValue();
        }
        return configValue;
    };
    if (configKey === "credentialScope" || canonicalEndpointParamKey === "CredentialScope") {
        return async () => {
            const credentials = typeof config.credentials === "function" ? await config.credentials() : config.credentials;
            const configValue = credentials?.credentialScope ?? credentials?.CredentialScope;
            return configValue;
        };
    }
    if (configKey === "accountId" || canonicalEndpointParamKey === "AccountId") {
        return async () => {
            const credentials = typeof config.credentials === "function" ? await config.credentials() : config.credentials;
            const configValue = credentials?.accountId ?? credentials?.AccountId;
            return configValue;
        };
    }
    if (configKey === "endpoint" || canonicalEndpointParamKey === "endpoint") {
        return async () => {
            if (config.isCustomEndpoint === false) {
                return undefined;
            }
            const endpoint = await configProvider();
            if (endpoint && typeof endpoint === "object") {
                if ("url" in endpoint) {
                    return endpoint.url.href;
                }
                if ("hostname" in endpoint) {
                    const { protocol, hostname, port, path } = endpoint;
                    return `${protocol}//${hostname}${port ? ":" + port : ""}${path}`;
                }
            }
            return endpoint;
        };
    }
    return configProvider;
};

const toEndpointV1 = (endpoint) => {
    if (typeof endpoint === "object") {
        if ("url" in endpoint) {
            const v1Endpoint = protocols.parseUrl(endpoint.url);
            if (endpoint.headers) {
                v1Endpoint.headers = {};
                for (const name in endpoint.headers) {
                    v1Endpoint.headers[name.toLowerCase()] = endpoint.headers[name].join(", ");
                }
            }
            return v1Endpoint;
        }
        return endpoint;
    }
    return protocols.parseUrl(endpoint);
};

function bindGetEndpointFromInstructions(getEndpointFromConfig) {
    return async (commandInput, instructionsSupplier, clientConfig, context) => {
        if (!clientConfig.isCustomEndpoint) {
            let endpointFromConfig;
            if (clientConfig.serviceConfiguredEndpoint) {
                endpointFromConfig = await clientConfig.serviceConfiguredEndpoint();
            }
            else {
                endpointFromConfig = await getEndpointFromConfig(clientConfig.serviceId);
            }
            if (endpointFromConfig) {
                clientConfig.endpoint = () => Promise.resolve(toEndpointV1(endpointFromConfig));
                clientConfig.isCustomEndpoint = true;
            }
        }
        const endpointParams = await resolveParams(commandInput, instructionsSupplier, clientConfig);
        if (typeof clientConfig.endpointProvider !== "function") {
            throw new Error("config.endpointProvider is not set.");
        }
        const endpoint = clientConfig.endpointProvider(endpointParams, context);
        if (clientConfig.isCustomEndpoint && clientConfig.endpoint) {
            const customEndpoint = await clientConfig.endpoint();
            if (customEndpoint?.headers) {
                endpoint.headers ??= {};
                for (const [name, value] of Object.entries(customEndpoint.headers)) {
                    endpoint.headers[name] = Array.isArray(value) ? value : [value];
                }
            }
        }
        return endpoint;
    };
}
const resolveParams = async (commandInput, instructionsSupplier, clientConfig) => {
    const endpointParams = {};
    const instructions = instructionsSupplier?.getEndpointParameterInstructions?.() || {};
    for (const [name, instruction] of Object.entries(instructions)) {
        switch (instruction.type) {
            case "staticContextParams":
                endpointParams[name] = instruction.value;
                break;
            case "contextParams":
                endpointParams[name] = commandInput[instruction.name];
                break;
            case "clientContextParams":
            case "builtInParams":
                endpointParams[name] = await createConfigValueProvider(instruction.name, name, clientConfig, instruction.type !== "builtInParams")();
                break;
            case "operationContextParams":
                endpointParams[name] = instruction.get(commandInput);
                break;
            default:
                throw new Error("Unrecognized endpoint parameter instruction: " + JSON.stringify(instruction));
        }
    }
    if (Object.keys(instructions).length === 0) {
        Object.assign(endpointParams, clientConfig);
    }
    if (String(clientConfig.serviceId).toLowerCase() === "s3") {
        await resolveParamsForS3(endpointParams);
    }
    return endpointParams;
};

function setFeature(context, feature, value) {
    if (!context.__smithy_context) {
        context.__smithy_context = { features: {} };
    }
    else if (!context.__smithy_context.features) {
        context.__smithy_context.features = {};
    }
    context.__smithy_context.features[feature] = value;
}
function bindEndpointMiddleware(getEndpointFromConfig) {
    const getEndpointFromInstructions = bindGetEndpointFromInstructions(getEndpointFromConfig);
    return ({ config, instructions, }) => {
        return (next, context) => async (args) => {
            if (config.isCustomEndpoint) {
                setFeature(context, "ENDPOINT_OVERRIDE", "N");
            }
            const endpoint = await getEndpointFromInstructions(args.input, {
                getEndpointParameterInstructions() {
                    return instructions;
                },
            }, { ...config }, context);
            context.endpointV2 = endpoint;
            context.authSchemes = endpoint.properties?.authSchemes;
            const authScheme = context.authSchemes?.[0];
            if (authScheme) {
                context["signing_region"] = authScheme.signingRegion;
                context["signing_service"] = authScheme.signingName;
                const smithyContext = client.getSmithyContext(context);
                const httpAuthOption = smithyContext?.selectedHttpAuthScheme?.httpAuthOption;
                if (httpAuthOption) {
                    httpAuthOption.signingProperties = Object.assign(httpAuthOption.signingProperties || {}, {
                        signing_region: authScheme.signingRegion,
                        signingRegion: authScheme.signingRegion,
                        signing_service: authScheme.signingName,
                        signingName: authScheme.signingName,
                        signingRegionSet: authScheme.signingRegionSet,
                    }, authScheme.properties);
                }
            }
            return next({
                ...args,
            });
        };
    };
}

const serializerMiddlewareOption = {
    name: "serializerMiddleware"};
const endpointMiddlewareOptions = {
    step: "serialize",
    tags: ["ENDPOINT_PARAMETERS", "ENDPOINT_V2", "ENDPOINT"],
    name: "endpointV2Middleware",
    override: true,
    relation: "before",
    toMiddleware: serializerMiddlewareOption.name,
};
function bindGetEndpointPlugin(getEndpointFromConfig) {
    const endpointMiddleware = bindEndpointMiddleware(getEndpointFromConfig);
    return (config, instructions) => ({
        applyToStack: (clientStack) => {
            clientStack.addRelativeTo(endpointMiddleware({
                config,
                instructions,
            }), endpointMiddlewareOptions);
        },
    });
}

function bindResolveEndpointConfig(getEndpointFromConfig) {
    return (input) => {
        const tls = input.tls ?? true;
        const { endpoint, useDualstackEndpoint, useFipsEndpoint } = input;
        const customEndpointProvider = endpoint != null ? async () => toEndpointV1(await client.normalizeProvider(endpoint)()) : undefined;
        const isCustomEndpoint = !!endpoint;
        const resolvedConfig = Object.assign(input, {
            endpoint: customEndpointProvider,
            tls,
            isCustomEndpoint,
            useDualstackEndpoint: client.normalizeProvider(useDualstackEndpoint ?? false),
            useFipsEndpoint: client.normalizeProvider(useFipsEndpoint ?? false),
        });
        let configuredEndpointPromise = undefined;
        resolvedConfig.serviceConfiguredEndpoint = async () => {
            if (input.serviceId && !configuredEndpointPromise) {
                configuredEndpointPromise = getEndpointFromConfig(input.serviceId);
            }
            return configuredEndpointPromise;
        };
        return resolvedConfig;
    };
}

class BinaryDecisionDiagram {
    nodes;
    root;
    conditions;
    results;
    constructor(bdd, root, conditions, results) {
        this.nodes = bdd;
        this.root = root;
        this.conditions = conditions;
        this.results = results;
    }
    static from(bdd, root, conditions, results) {
        return new BinaryDecisionDiagram(bdd, root, conditions, results);
    }
}

class EndpointCache {
    capacity;
    data = new Map();
    parameters = [];
    constructor({ size, params }) {
        this.capacity = size ?? 50;
        if (params) {
            this.parameters = params;
        }
    }
    get(endpointParams, resolver) {
        const key = this.hash(endpointParams);
        if (key === false) {
            return resolver();
        }
        if (!this.data.has(key)) {
            if (this.data.size > this.capacity + 10) {
                const keys = this.data.keys();
                let i = 0;
                while (true) {
                    const { value, done } = keys.next();
                    this.data.delete(value);
                    if (done || ++i > 10) {
                        break;
                    }
                }
            }
            this.data.set(key, resolver());
        }
        return this.data.get(key);
    }
    size() {
        return this.data.size;
    }
    hash(endpointParams) {
        let buffer = "";
        const { parameters } = this;
        if (parameters.length === 0) {
            return false;
        }
        for (const param of parameters) {
            const val = String(endpointParams[param] ?? "");
            if (val.includes("|;")) {
                return false;
            }
            buffer += val + "|;";
        }
        return buffer;
    }
}

class EndpointError extends Error {
    constructor(message) {
        super(message);
        this.name = "EndpointError";
    }
}

const debugId = "endpoints";

function toDebugString(input) {
    if (typeof input !== "object" || input == null) {
        return input;
    }
    if ("ref" in input) {
        return `$${toDebugString(input.ref)}`;
    }
    if ("fn" in input) {
        return `${input.fn}(${(input.argv || []).map(toDebugString).join(", ")})`;
    }
    return JSON.stringify(input, null, 2);
}

const customEndpointFunctions = {};

const booleanEquals = (value1, value2) => value1 === value2;

function coalesce(...args) {
    for (const arg of args) {
        if (arg != null) {
            return arg;
        }
    }
    return undefined;
}

const getAttrPathList = (path) => {
    const parts = path.split(".");
    const pathList = [];
    for (const part of parts) {
        const squareBracketIndex = part.indexOf("[");
        if (squareBracketIndex !== -1) {
            if (part.indexOf("]") !== part.length - 1) {
                throw new EndpointError(`Path: '${path}' does not end with ']'`);
            }
            const arrayIndex = part.slice(squareBracketIndex + 1, -1);
            if (Number.isNaN(parseInt(arrayIndex))) {
                throw new EndpointError(`Invalid array index: '${arrayIndex}' in path: '${path}'`);
            }
            if (squareBracketIndex !== 0) {
                pathList.push(part.slice(0, squareBracketIndex));
            }
            pathList.push(arrayIndex);
        }
        else {
            pathList.push(part);
        }
    }
    return pathList;
};

const getAttr = (value, path) => getAttrPathList(path).reduce((acc, index) => {
    if (typeof acc !== "object") {
        throw new EndpointError(`Index '${index}' in '${path}' not found in '${JSON.stringify(value)}'`);
    }
    else if (Array.isArray(acc)) {
        const i = parseInt(index);
        return acc[i < 0 ? acc.length + i : i];
    }
    return acc[index];
}, value);

const isSet = (value) => value != null;

const VALID_HOST_LABEL_REGEX = new RegExp(`^(?!.*-$)(?!-)[a-zA-Z0-9-]{1,63}$`);
const isValidHostLabel = (value, allowSubDomains = false) => {
    if (!allowSubDomains) {
        return VALID_HOST_LABEL_REGEX.test(value);
    }
    const labels = value.split(".");
    for (const label of labels) {
        if (!isValidHostLabel(label)) {
            return false;
        }
    }
    return true;
};

function ite(condition, trueValue, falseValue) {
    return condition ? trueValue : falseValue;
}

const not = (value) => !value;

const IP_V4_REGEX = new RegExp(`^(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}$`);
const isIpAddress = (value) => IP_V4_REGEX.test(value) || (value.startsWith("[") && value.endsWith("]"));

const DEFAULT_PORTS = {
    [types.EndpointURLScheme.HTTP]: 80,
    [types.EndpointURLScheme.HTTPS]: 443,
};
const parseURL = (value) => {
    const whatwgURL = (() => {
        try {
            if (value instanceof URL) {
                return value;
            }
            if (typeof value === "object" && "hostname" in value) {
                const { hostname, port, protocol = "", path = "", query = {} } = value;
                const url = new URL(`${protocol}//${hostname}${port ? `:${port}` : ""}${path}`);
                url.search = Object.entries(query)
                    .map(([k, v]) => `${k}=${v}`)
                    .join("&");
                return url;
            }
            return new URL(value);
        }
        catch (error) {
            return null;
        }
    })();
    if (!whatwgURL) {
        console.error(`Unable to parse ${JSON.stringify(value)} as a whatwg URL.`);
        return null;
    }
    const urlString = whatwgURL.href;
    const { host, hostname, pathname, protocol, search } = whatwgURL;
    if (search) {
        return null;
    }
    const scheme = protocol.slice(0, -1);
    if (!Object.values(types.EndpointURLScheme).includes(scheme)) {
        return null;
    }
    const isIp = isIpAddress(hostname);
    const inputContainsDefaultPort = urlString.includes(`${host}:${DEFAULT_PORTS[scheme]}`) ||
        (typeof value === "string" && value.includes(`${host}:${DEFAULT_PORTS[scheme]}`));
    const authority = `${host}${inputContainsDefaultPort ? `:${DEFAULT_PORTS[scheme]}` : ``}`;
    return {
        scheme,
        authority,
        path: pathname,
        normalizedPath: pathname.endsWith("/") ? pathname : `${pathname}/`,
        isIp,
    };
};

function split(value, delimiter, limit) {
    if (limit === 1) {
        return [value];
    }
    if (value === "") {
        return [""];
    }
    const parts = value.split(delimiter);
    if (limit === 0) {
        return parts;
    }
    return parts.slice(0, limit - 1).concat(parts.slice(1).join(delimiter));
}

const stringEquals = (value1, value2) => value1 === value2;

const substring = (input, start, stop, reverse) => {
    if (input == null || start >= stop || input.length < stop || /[^\u0000-\u007f]/.test(input)) {
        return null;
    }
    if (!reverse) {
        return input.substring(start, stop);
    }
    return input.substring(input.length - stop, input.length - start);
};

const uriEncode = (value) => encodeURIComponent(value).replace(/[!*'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

const endpointFunctions = {
    booleanEquals,
    coalesce,
    getAttr,
    isSet,
    isValidHostLabel,
    ite,
    not,
    parseURL,
    split,
    stringEquals,
    substring,
    uriEncode,
};

const evaluateTemplate = (template, options) => {
    const evaluatedTemplateArr = [];
    const { referenceRecord, endpointParams } = options;
    let currentIndex = 0;
    while (currentIndex < template.length) {
        const openingBraceIndex = template.indexOf("{", currentIndex);
        if (openingBraceIndex === -1) {
            evaluatedTemplateArr.push(template.slice(currentIndex));
            break;
        }
        evaluatedTemplateArr.push(template.slice(currentIndex, openingBraceIndex));
        const closingBraceIndex = template.indexOf("}", openingBraceIndex);
        if (closingBraceIndex === -1) {
            evaluatedTemplateArr.push(template.slice(openingBraceIndex));
            break;
        }
        if (template[openingBraceIndex + 1] === "{" && template[closingBraceIndex + 1] === "}") {
            evaluatedTemplateArr.push(template.slice(openingBraceIndex + 1, closingBraceIndex));
            currentIndex = closingBraceIndex + 2;
        }
        const parameterName = template.substring(openingBraceIndex + 1, closingBraceIndex);
        if (parameterName.includes("#")) {
            const [refName, attrName] = parameterName.split("#");
            evaluatedTemplateArr.push(getAttr((referenceRecord[refName] ?? endpointParams[refName]), attrName));
        }
        else {
            evaluatedTemplateArr.push((referenceRecord[parameterName] ?? endpointParams[parameterName]));
        }
        currentIndex = closingBraceIndex + 1;
    }
    return evaluatedTemplateArr.join("");
};

const getReferenceValue = ({ ref }, options) => {
    return options.referenceRecord[ref] ?? options.endpointParams[ref];
};

const evaluateExpression = (obj, keyName, options) => {
    if (typeof obj === "string") {
        return evaluateTemplate(obj, options);
    }
    else if (obj["fn"]) {
        return group$2.callFunction(obj, options);
    }
    else if (obj["ref"]) {
        return getReferenceValue(obj, options);
    }
    throw new EndpointError(`'${keyName}': ${String(obj)} is not a string, function or reference.`);
};
const callFunction = ({ fn, argv }, options) => {
    const evaluatedArgs = Array(argv.length);
    for (let i = 0; i < evaluatedArgs.length; ++i) {
        const arg = argv[i];
        if (typeof arg === "boolean" || typeof arg === "number") {
            evaluatedArgs[i] = arg;
        }
        else {
            evaluatedArgs[i] = group$2.evaluateExpression(arg, "arg", options);
        }
    }
    const namespaceSeparatorIndex = fn.indexOf(".");
    if (namespaceSeparatorIndex !== -1) {
        const namespaceFunctions = customEndpointFunctions[fn.slice(0, namespaceSeparatorIndex)];
        const customFunction = namespaceFunctions?.[fn.slice(namespaceSeparatorIndex + 1)];
        if (typeof customFunction === "function") {
            return customFunction(...evaluatedArgs);
        }
    }
    const callable = endpointFunctions[fn];
    if (typeof callable === "function") {
        return callable(...evaluatedArgs);
    }
    throw new Error(`function ${fn} not loaded in endpointFunctions.`);
};
const group$2 = {
    evaluateExpression,
    callFunction,
};

const evaluateCondition = (condition, options) => {
    const { assign } = condition;
    if (assign && assign in options.referenceRecord) {
        throw new EndpointError(`'${assign}' is already defined in Reference Record.`);
    }
    const value = callFunction(condition, options);
    options.logger?.debug?.(`${debugId} evaluateCondition: ${toDebugString(condition)} = ${toDebugString(value)}`);
    const result = value === "" ? true : !!value;
    if (assign != null) {
        return { result, toAssign: { name: assign, value } };
    }
    return { result };
};

const getEndpointHeaders = (headers, options) => Object.entries(headers ?? {}).reduce((acc, [headerKey, headerVal]) => {
    acc[headerKey] = headerVal.map((headerValEntry) => {
        const processedExpr = evaluateExpression(headerValEntry, "Header value entry", options);
        if (typeof processedExpr !== "string") {
            throw new EndpointError(`Header '${headerKey}' value '${processedExpr}' is not a string`);
        }
        return processedExpr;
    });
    return acc;
}, {});

const getEndpointProperties = (properties, options) => Object.entries(properties).reduce((acc, [propertyKey, propertyVal]) => {
    acc[propertyKey] = group$1.getEndpointProperty(propertyVal, options);
    return acc;
}, {});
const getEndpointProperty = (property, options) => {
    if (Array.isArray(property)) {
        return property.map((propertyEntry) => getEndpointProperty(propertyEntry, options));
    }
    switch (typeof property) {
        case "string":
            return evaluateTemplate(property, options);
        case "object":
            if (property === null) {
                throw new EndpointError(`Unexpected endpoint property: ${property}`);
            }
            return group$1.getEndpointProperties(property, options);
        case "boolean":
            return property;
        default:
            throw new EndpointError(`Unexpected endpoint property type: ${typeof property}`);
    }
};
const group$1 = {
    getEndpointProperty,
    getEndpointProperties,
};

const getEndpointUrl = (endpointUrl, options) => {
    const expression = evaluateExpression(endpointUrl, "Endpoint URL", options);
    if (typeof expression === "string") {
        try {
            return new URL(expression);
        }
        catch (error) {
            console.error(`Failed to construct URL with ${expression}`, error);
            throw error;
        }
    }
    throw new EndpointError(`Endpoint URL must be a string, got ${typeof expression}`);
};

const RESULT = 100_000_000;
const decideEndpoint = (bdd, options) => {
    const { nodes, root, results, conditions } = bdd;
    let ref = root;
    const referenceRecord = {};
    const closure = {
        referenceRecord,
        endpointParams: options.endpointParams,
        logger: options.logger,
    };
    while (ref !== 1 && ref !== -1 && ref < RESULT) {
        const node_i = 3 * (Math.abs(ref) - 1);
        const [condition_i, highRef, lowRef] = [nodes[node_i], nodes[node_i + 1], nodes[node_i + 2]];
        const [fn, argv, assign] = conditions[condition_i];
        const evaluation = evaluateCondition({ fn, assign, argv }, closure);
        if (evaluation.toAssign) {
            const { name, value } = evaluation.toAssign;
            referenceRecord[name] = value;
        }
        ref = ref >= 0 === evaluation.result ? highRef : lowRef;
    }
    if (ref >= RESULT) {
        const result = results[ref - RESULT];
        if (result[0] === -1) {
            const [, errorExpression] = result;
            throw new EndpointError(evaluateExpression(errorExpression, "Error", closure));
        }
        const [url, properties, headers] = result;
        return {
            url: getEndpointUrl(url, closure),
            properties: getEndpointProperties(properties, closure),
            headers: getEndpointHeaders(headers ?? {}, closure),
        };
    }
    throw new EndpointError(`No matching endpoint.`);
};

const evaluateConditions = (conditions = [], options) => {
    const conditionsReferenceRecord = {};
    const conditionOptions = {
        ...options,
        referenceRecord: { ...options.referenceRecord },
    };
    let didAssign = false;
    for (const condition of conditions) {
        const { result, toAssign } = evaluateCondition(condition, conditionOptions);
        if (!result) {
            return { result };
        }
        if (toAssign) {
            didAssign = true;
            conditionsReferenceRecord[toAssign.name] = toAssign.value;
            conditionOptions.referenceRecord[toAssign.name] = toAssign.value;
            options.logger?.debug?.(`${debugId} assign: ${toAssign.name} := ${toDebugString(toAssign.value)}`);
        }
    }
    if (didAssign) {
        return { result: true, referenceRecord: conditionsReferenceRecord };
    }
    return { result: true };
};

const evaluateEndpointRule = (endpointRule, options) => {
    const { conditions, endpoint } = endpointRule;
    const { result, referenceRecord } = evaluateConditions(conditions, options);
    if (!result) {
        return;
    }
    const endpointRuleOptions = referenceRecord
        ? {
            ...options,
            referenceRecord: { ...options.referenceRecord, ...referenceRecord },
        }
        : options;
    const { url, properties, headers } = endpoint;
    options.logger?.debug?.(`${debugId} Resolving endpoint from template: ${toDebugString(endpoint)}`);
    const endpointToReturn = { url: getEndpointUrl(url, endpointRuleOptions) };
    if (headers != null) {
        endpointToReturn.headers = getEndpointHeaders(headers, endpointRuleOptions);
    }
    if (properties != null) {
        endpointToReturn.properties = getEndpointProperties(properties, endpointRuleOptions);
    }
    return endpointToReturn;
};

const evaluateErrorRule = (errorRule, options) => {
    const { conditions, error } = errorRule;
    const { result, referenceRecord } = evaluateConditions(conditions, options);
    if (!result) {
        return;
    }
    const errorRuleOptions = referenceRecord
        ? {
            ...options,
            referenceRecord: { ...options.referenceRecord, ...referenceRecord },
        }
        : options;
    throw new EndpointError(evaluateExpression(error, "Error", errorRuleOptions));
};

const evaluateRules = (rules, options) => {
    for (const rule of rules) {
        if (rule.type === "endpoint") {
            const endpointOrUndefined = evaluateEndpointRule(rule, options);
            if (endpointOrUndefined) {
                return endpointOrUndefined;
            }
        }
        else if (rule.type === "error") {
            evaluateErrorRule(rule, options);
        }
        else if (rule.type === "tree") {
            const endpointOrUndefined = group.evaluateTreeRule(rule, options);
            if (endpointOrUndefined) {
                return endpointOrUndefined;
            }
        }
        else {
            throw new EndpointError(`Unknown endpoint rule: ${rule}`);
        }
    }
    throw new EndpointError(`Rules evaluation failed`);
};
const evaluateTreeRule = (treeRule, options) => {
    const { conditions, rules } = treeRule;
    const { result, referenceRecord } = evaluateConditions(conditions, options);
    if (!result) {
        return;
    }
    const treeRuleOptions = referenceRecord
        ? { ...options, referenceRecord: { ...options.referenceRecord, ...referenceRecord } }
        : options;
    return group.evaluateRules(rules, treeRuleOptions);
};
const group = {
    evaluateRules,
    evaluateTreeRule,
};

const resolveEndpoint = (ruleSetObject, options) => {
    const { endpointParams, logger } = options;
    const { parameters, rules } = ruleSetObject;
    options.logger?.debug?.(`${debugId} Initial EndpointParams: ${toDebugString(endpointParams)}`);
    for (const paramKey in parameters) {
        const parameter = parameters[paramKey];
        const endpointParam = endpointParams[paramKey];
        if (endpointParam == null && parameter.default != null) {
            endpointParams[paramKey] = parameter.default;
            continue;
        }
        if (parameter.required && endpointParam == null) {
            throw new EndpointError(`Missing required parameter: '${paramKey}'`);
        }
    }
    const endpoint = evaluateRules(rules, { endpointParams, logger, referenceRecord: {} });
    options.logger?.debug?.(`${debugId} Resolved endpoint: ${toDebugString(endpoint)}`);
    return endpoint;
};

const resolveEndpointRequiredConfig = (input) => {
    const { endpoint } = input;
    if (endpoint === undefined) {
        input.endpoint = async () => {
            throw new Error("@smithy/middleware-endpoint: (default endpointRuleSet) endpoint is not set - you must configure an endpoint.");
        };
    }
    return input;
};

const getEndpointFromInstructions = bindGetEndpointFromInstructions(getEndpointFromConfig);
const resolveEndpointConfig = bindResolveEndpointConfig(getEndpointFromConfig);
const endpointMiddleware = bindEndpointMiddleware(getEndpointFromConfig);
const getEndpointPlugin = bindGetEndpointPlugin(getEndpointFromConfig);

exports.BinaryDecisionDiagram = BinaryDecisionDiagram;
exports.EndpointCache = EndpointCache;
exports.EndpointError = EndpointError;
exports.customEndpointFunctions = customEndpointFunctions;
exports.decideEndpoint = decideEndpoint;
exports.endpointMiddleware = endpointMiddleware;
exports.endpointMiddlewareOptions = endpointMiddlewareOptions;
exports.getEndpointFromInstructions = getEndpointFromInstructions;
exports.getEndpointPlugin = getEndpointPlugin;
exports.isIpAddress = isIpAddress;
exports.isValidHostLabel = isValidHostLabel;
exports.middlewareEndpointToEndpointV1 = toEndpointV1;
exports.resolveEndpoint = resolveEndpoint;
exports.resolveEndpointConfig = resolveEndpointConfig;
exports.resolveEndpointRequiredConfig = resolveEndpointRequiredConfig;
exports.resolveParams = resolveParams;
exports.toEndpointV1 = toEndpointV1;


/***/ }),

/***/ 40051:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var crc32 = __webpack_require__(14123);
var serde = __webpack_require__(38622);
var node_stream = __webpack_require__(57075);

class Int64 {
    bytes;
    constructor(bytes) {
        this.bytes = bytes;
        if (bytes.byteLength !== 8) {
            throw new Error("Int64 buffers must be exactly 8 bytes");
        }
    }
    static fromNumber(number) {
        if (number > 9_223_372_036_854_775_807 || number < -9223372036854776e3) {
            throw new Error(`${number} is too large (or, if negative, too small) to represent as an Int64`);
        }
        const bytes = new Uint8Array(8);
        for (let i = 7, remaining = Math.abs(Math.round(number)); i > -1 && remaining > 0; i--, remaining /= 256) {
            bytes[i] = remaining;
        }
        if (number < 0) {
            negate(bytes);
        }
        return new Int64(bytes);
    }
    valueOf() {
        const bytes = this.bytes.slice(0);
        const negative = bytes[0] & 0b10000000;
        if (negative) {
            negate(bytes);
        }
        return parseInt(serde.toHex(bytes), 16) * (negative ? -1 : 1);
    }
    toString() {
        return String(this.valueOf());
    }
}
function negate(bytes) {
    for (let i = 0; i < 8; i++) {
        bytes[i] ^= 0xff;
    }
    for (let i = 7; i > -1; i--) {
        bytes[i]++;
        if (bytes[i] !== 0)
            break;
    }
}

class HeaderMarshaller {
    toUtf8;
    fromUtf8;
    constructor(toUtf8, fromUtf8) {
        this.toUtf8 = toUtf8;
        this.fromUtf8 = fromUtf8;
    }
    format(headers) {
        const chunks = [];
        for (const headerName of Object.keys(headers)) {
            const bytes = this.fromUtf8(headerName);
            chunks.push(Uint8Array.from([bytes.byteLength]), bytes, this.formatHeaderValue(headers[headerName]));
        }
        const out = new Uint8Array(chunks.reduce((carry, bytes) => carry + bytes.byteLength, 0));
        let position = 0;
        for (const chunk of chunks) {
            out.set(chunk, position);
            position += chunk.byteLength;
        }
        return out;
    }
    formatHeaderValue(header) {
        switch (header.type) {
            case "boolean":
                return Uint8Array.from([header.value ? 0 : 1]);
            case "byte":
                return Uint8Array.from([2, header.value]);
            case "short":
                const shortView = new DataView(new ArrayBuffer(3));
                shortView.setUint8(0, 3);
                shortView.setInt16(1, header.value, false);
                return new Uint8Array(shortView.buffer);
            case "integer":
                const intView = new DataView(new ArrayBuffer(5));
                intView.setUint8(0, 4);
                intView.setInt32(1, header.value, false);
                return new Uint8Array(intView.buffer);
            case "long":
                const longBytes = new Uint8Array(9);
                longBytes[0] = 5;
                longBytes.set(header.value.bytes, 1);
                return longBytes;
            case "binary":
                const binView = new DataView(new ArrayBuffer(3 + header.value.byteLength));
                binView.setUint8(0, 6);
                binView.setUint16(1, header.value.byteLength, false);
                const binBytes = new Uint8Array(binView.buffer);
                binBytes.set(header.value, 3);
                return binBytes;
            case "string":
                const utf8Bytes = this.fromUtf8(header.value);
                const strView = new DataView(new ArrayBuffer(3 + utf8Bytes.byteLength));
                strView.setUint8(0, 7);
                strView.setUint16(1, utf8Bytes.byteLength, false);
                const strBytes = new Uint8Array(strView.buffer);
                strBytes.set(utf8Bytes, 3);
                return strBytes;
            case "timestamp":
                const tsBytes = new Uint8Array(9);
                tsBytes[0] = 8;
                tsBytes.set(Int64.fromNumber(header.value.valueOf()).bytes, 1);
                return tsBytes;
            case "uuid":
                if (!UUID_PATTERN.test(header.value)) {
                    throw new Error(`Invalid UUID received: ${header.value}`);
                }
                const uuidBytes = new Uint8Array(17);
                uuidBytes[0] = 9;
                uuidBytes.set(serde.fromHex(header.value.replace(/\-/g, "")), 1);
                return uuidBytes;
        }
    }
    parse(headers) {
        const out = {};
        let position = 0;
        while (position < headers.byteLength) {
            const nameLength = headers.getUint8(position++);
            const name = this.toUtf8(new Uint8Array(headers.buffer, headers.byteOffset + position, nameLength));
            position += nameLength;
            switch (headers.getUint8(position++)) {
                case 0:
                    out[name] = {
                        type: BOOLEAN_TAG,
                        value: true,
                    };
                    break;
                case 1:
                    out[name] = {
                        type: BOOLEAN_TAG,
                        value: false,
                    };
                    break;
                case 2:
                    out[name] = {
                        type: BYTE_TAG,
                        value: headers.getInt8(position++),
                    };
                    break;
                case 3:
                    out[name] = {
                        type: SHORT_TAG,
                        value: headers.getInt16(position, false),
                    };
                    position += 2;
                    break;
                case 4:
                    out[name] = {
                        type: INT_TAG,
                        value: headers.getInt32(position, false),
                    };
                    position += 4;
                    break;
                case 5:
                    out[name] = {
                        type: LONG_TAG,
                        value: new Int64(new Uint8Array(headers.buffer, headers.byteOffset + position, 8)),
                    };
                    position += 8;
                    break;
                case 6:
                    const binaryLength = headers.getUint16(position, false);
                    position += 2;
                    out[name] = {
                        type: BINARY_TAG,
                        value: new Uint8Array(headers.buffer, headers.byteOffset + position, binaryLength),
                    };
                    position += binaryLength;
                    break;
                case 7:
                    const stringLength = headers.getUint16(position, false);
                    position += 2;
                    out[name] = {
                        type: STRING_TAG,
                        value: this.toUtf8(new Uint8Array(headers.buffer, headers.byteOffset + position, stringLength)),
                    };
                    position += stringLength;
                    break;
                case 8:
                    out[name] = {
                        type: TIMESTAMP_TAG,
                        value: new Date(new Int64(new Uint8Array(headers.buffer, headers.byteOffset + position, 8)).valueOf()),
                    };
                    position += 8;
                    break;
                case 9:
                    const uuidBytes = new Uint8Array(headers.buffer, headers.byteOffset + position, 16);
                    position += 16;
                    out[name] = {
                        type: UUID_TAG,
                        value: `${serde.toHex(uuidBytes.subarray(0, 4))}-${serde.toHex(uuidBytes.subarray(4, 6))}-${serde.toHex(uuidBytes.subarray(6, 8))}-${serde.toHex(uuidBytes.subarray(8, 10))}-${serde.toHex(uuidBytes.subarray(10))}`,
                    };
                    break;
                default:
                    throw new Error(`Unrecognized header type tag`);
            }
        }
        return out;
    }
}
var HEADER_VALUE_TYPE;
(function (HEADER_VALUE_TYPE) {
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["boolTrue"] = 0] = "boolTrue";
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["boolFalse"] = 1] = "boolFalse";
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["byte"] = 2] = "byte";
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["short"] = 3] = "short";
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["integer"] = 4] = "integer";
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["long"] = 5] = "long";
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["byteArray"] = 6] = "byteArray";
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["string"] = 7] = "string";
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["timestamp"] = 8] = "timestamp";
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["uuid"] = 9] = "uuid";
})(HEADER_VALUE_TYPE || (HEADER_VALUE_TYPE = {}));
const BOOLEAN_TAG = "boolean";
const BYTE_TAG = "byte";
const SHORT_TAG = "short";
const INT_TAG = "integer";
const LONG_TAG = "long";
const BINARY_TAG = "binary";
const STRING_TAG = "string";
const TIMESTAMP_TAG = "timestamp";
const UUID_TAG = "uuid";
const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

const PRELUDE_MEMBER_LENGTH = 4;
const PRELUDE_LENGTH = PRELUDE_MEMBER_LENGTH * 2;
const CHECKSUM_LENGTH = 4;
const MINIMUM_MESSAGE_LENGTH = PRELUDE_LENGTH + CHECKSUM_LENGTH * 2;
function splitMessage({ byteLength, byteOffset, buffer }) {
    if (byteLength < MINIMUM_MESSAGE_LENGTH) {
        throw new Error("Provided message too short to accommodate event stream message overhead");
    }
    const view = new DataView(buffer, byteOffset, byteLength);
    const messageLength = view.getUint32(0, false);
    if (byteLength !== messageLength) {
        throw new Error("Reported message length does not match received message length");
    }
    const headerLength = view.getUint32(PRELUDE_MEMBER_LENGTH, false);
    const expectedPreludeChecksum = view.getUint32(PRELUDE_LENGTH, false);
    const expectedMessageChecksum = view.getUint32(byteLength - CHECKSUM_LENGTH, false);
    const checksummer = new crc32.Crc32().update(new Uint8Array(buffer, byteOffset, PRELUDE_LENGTH));
    if (expectedPreludeChecksum !== checksummer.digest()) {
        throw new Error(`The prelude checksum specified in the message (${expectedPreludeChecksum}) does not match the calculated CRC32 checksum (${checksummer.digest()})`);
    }
    checksummer.update(new Uint8Array(buffer, byteOffset + PRELUDE_LENGTH, byteLength - (PRELUDE_LENGTH + CHECKSUM_LENGTH)));
    if (expectedMessageChecksum !== checksummer.digest()) {
        throw new Error(`The message checksum (${checksummer.digest()}) did not match the expected value of ${expectedMessageChecksum}`);
    }
    return {
        headers: new DataView(buffer, byteOffset + PRELUDE_LENGTH + CHECKSUM_LENGTH, headerLength),
        body: new Uint8Array(buffer, byteOffset + PRELUDE_LENGTH + CHECKSUM_LENGTH + headerLength, messageLength - headerLength - (PRELUDE_LENGTH + CHECKSUM_LENGTH + CHECKSUM_LENGTH)),
    };
}

class EventStreamCodec {
    headerMarshaller;
    messageBuffer;
    isEndOfStream;
    constructor(toUtf8, fromUtf8) {
        this.headerMarshaller = new HeaderMarshaller(toUtf8, fromUtf8);
        this.messageBuffer = [];
        this.isEndOfStream = false;
    }
    feed(message) {
        this.messageBuffer.push(this.decode(message));
    }
    endOfStream() {
        this.isEndOfStream = true;
    }
    getMessage() {
        const message = this.messageBuffer.pop();
        const isEndOfStream = this.isEndOfStream;
        return {
            getMessage() {
                return message;
            },
            isEndOfStream() {
                return isEndOfStream;
            },
        };
    }
    getAvailableMessages() {
        const messages = this.messageBuffer;
        this.messageBuffer = [];
        const isEndOfStream = this.isEndOfStream;
        return {
            getMessages() {
                return messages;
            },
            isEndOfStream() {
                return isEndOfStream;
            },
        };
    }
    encode({ headers: rawHeaders, body }) {
        const headers = this.headerMarshaller.format(rawHeaders);
        const length = headers.byteLength + body.byteLength + 16;
        const out = new Uint8Array(length);
        const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
        const checksum = new crc32.Crc32();
        view.setUint32(0, length, false);
        view.setUint32(4, headers.byteLength, false);
        view.setUint32(8, checksum.update(out.subarray(0, 8)).digest(), false);
        out.set(headers, 12);
        out.set(body, headers.byteLength + 12);
        view.setUint32(length - 4, checksum.update(out.subarray(8, length - 4)).digest(), false);
        return out;
    }
    decode(message) {
        const { headers, body } = splitMessage(message);
        return { headers: this.headerMarshaller.parse(headers), body };
    }
    formatHeaders(rawHeaders) {
        return this.headerMarshaller.format(rawHeaders);
    }
}

class MessageDecoderStream {
    options;
    constructor(options) {
        this.options = options;
    }
    [Symbol.asyncIterator]() {
        return this.asyncIterator();
    }
    async *asyncIterator() {
        for await (const bytes of this.options.inputStream) {
            const decoded = this.options.decoder.decode(bytes);
            yield decoded;
        }
    }
}

class MessageEncoderStream {
    options;
    constructor(options) {
        this.options = options;
    }
    [Symbol.asyncIterator]() {
        return this.asyncIterator();
    }
    async *asyncIterator() {
        for await (const msg of this.options.messageStream) {
            const encoded = this.options.encoder.encode(msg);
            yield encoded;
        }
        if (this.options.includeEndFrame) {
            yield new Uint8Array(0);
        }
    }
}

class SmithyMessageDecoderStream {
    options;
    constructor(options) {
        this.options = options;
    }
    [Symbol.asyncIterator]() {
        return this.asyncIterator();
    }
    async *asyncIterator() {
        for await (const message of this.options.messageStream) {
            const deserialized = await this.options.deserializer(message);
            if (deserialized === undefined)
                continue;
            yield deserialized;
        }
    }
}

class SmithyMessageEncoderStream {
    options;
    constructor(options) {
        this.options = options;
    }
    [Symbol.asyncIterator]() {
        return this.asyncIterator();
    }
    async *asyncIterator() {
        for await (const chunk of this.options.inputStream) {
            const payloadBuf = this.options.serializer(chunk);
            yield payloadBuf;
        }
    }
}

function getChunkedStream(source) {
    let currentMessageTotalLength = 0;
    let currentMessagePendingLength = 0;
    let currentMessage = null;
    let messageLengthBuffer = null;
    const allocateMessage = (size) => {
        if (typeof size !== "number") {
            throw new Error("Attempted to allocate an event message where size was not a number: " + size);
        }
        currentMessageTotalLength = size;
        currentMessagePendingLength = 4;
        currentMessage = new Uint8Array(size);
        const currentMessageView = new DataView(currentMessage.buffer);
        currentMessageView.setUint32(0, size, false);
    };
    const iterator = async function* () {
        const sourceIterator = source[Symbol.asyncIterator]();
        while (true) {
            const { value, done } = await sourceIterator.next();
            if (done) {
                if (!currentMessageTotalLength) {
                    return;
                }
                else if (currentMessageTotalLength === currentMessagePendingLength) {
                    yield currentMessage;
                }
                else {
                    throw new Error("Truncated event message received.");
                }
                return;
            }
            const chunkLength = value.length;
            let currentOffset = 0;
            while (currentOffset < chunkLength) {
                if (!currentMessage) {
                    const bytesRemaining = chunkLength - currentOffset;
                    if (!messageLengthBuffer) {
                        messageLengthBuffer = new Uint8Array(4);
                    }
                    const numBytesForTotal = Math.min(4 - currentMessagePendingLength, bytesRemaining);
                    messageLengthBuffer.set(value.slice(currentOffset, currentOffset + numBytesForTotal), currentMessagePendingLength);
                    currentMessagePendingLength += numBytesForTotal;
                    currentOffset += numBytesForTotal;
                    if (currentMessagePendingLength < 4) {
                        break;
                    }
                    allocateMessage(new DataView(messageLengthBuffer.buffer).getUint32(0, false));
                    messageLengthBuffer = null;
                }
                const numBytesToWrite = Math.min(currentMessageTotalLength - currentMessagePendingLength, chunkLength - currentOffset);
                currentMessage.set(value.slice(currentOffset, currentOffset + numBytesToWrite), currentMessagePendingLength);
                currentMessagePendingLength += numBytesToWrite;
                currentOffset += numBytesToWrite;
                if (currentMessageTotalLength && currentMessageTotalLength === currentMessagePendingLength) {
                    yield currentMessage;
                    currentMessage = null;
                    currentMessageTotalLength = 0;
                    currentMessagePendingLength = 0;
                }
            }
        }
    };
    return {
        [Symbol.asyncIterator]: iterator,
    };
}

function getUnmarshalledStream(source, options) {
    const messageUnmarshaller = getMessageUnmarshaller(options.deserializer, options.toUtf8);
    return {
        [Symbol.asyncIterator]: async function* () {
            for await (const chunk of source) {
                const message = options.eventStreamCodec.decode(chunk);
                const type = await messageUnmarshaller(message);
                if (type === undefined)
                    continue;
                yield type;
            }
        },
    };
}
function getMessageUnmarshaller(deserializer, toUtf8) {
    return async function (message) {
        const { value: messageType } = message.headers[":message-type"];
        if (messageType === "error") {
            const unmodeledError = new Error(message.headers[":error-message"].value || "UnknownError");
            unmodeledError.name = message.headers[":error-code"].value;
            throw unmodeledError;
        }
        else if (messageType === "exception") {
            const code = message.headers[":exception-type"].value;
            const exception = { [code]: message };
            const deserializedException = await deserializer(exception);
            if (deserializedException.$unknown) {
                const error = new Error(toUtf8(message.body));
                error.name = code;
                throw error;
            }
            throw deserializedException[code];
        }
        else if (messageType === "event") {
            const event = {
                [message.headers[":event-type"].value]: message,
            };
            const deserialized = await deserializer(event);
            if (deserialized.$unknown)
                return;
            return deserialized;
        }
        else {
            throw Error(`Unrecognizable event type: ${message.headers[":event-type"].value}`);
        }
    };
}

let EventStreamMarshaller$1 = class EventStreamMarshaller {
    eventStreamCodec;
    utfEncoder;
    constructor({ utf8Encoder, utf8Decoder }) {
        this.eventStreamCodec = new EventStreamCodec(utf8Encoder, utf8Decoder);
        this.utfEncoder = utf8Encoder;
    }
    deserialize(body, deserializer) {
        const inputStream = getChunkedStream(body);
        return new SmithyMessageDecoderStream({
            messageStream: new MessageDecoderStream({ inputStream, decoder: this.eventStreamCodec }),
            deserializer: getMessageUnmarshaller(deserializer, this.utfEncoder),
        });
    }
    serialize(inputStream, serializer) {
        return new MessageEncoderStream({
            messageStream: new SmithyMessageEncoderStream({ inputStream, serializer }),
            encoder: this.eventStreamCodec,
            includeEndFrame: true,
        });
    }
};
const eventStreamSerdeProvider$1 = (options) => new EventStreamMarshaller$1(options);

class EventStreamMarshaller {
    universalMarshaller;
    constructor({ utf8Encoder, utf8Decoder }) {
        this.universalMarshaller = new EventStreamMarshaller$1({
            utf8Decoder,
            utf8Encoder,
        });
    }
    deserialize(body, deserializer) {
        const bodyIterable = typeof body[Symbol.asyncIterator] === "function" ? body : readableToIterable(body);
        return this.universalMarshaller.deserialize(bodyIterable, deserializer);
    }
    serialize(input, serializer) {
        return node_stream.Readable.from(this.universalMarshaller.serialize(input, serializer));
    }
}
const eventStreamSerdeProvider = (options) => new EventStreamMarshaller(options);
async function* readableToIterable(readStream) {
    let streamEnded = false;
    let generationEnded = false;
    const records = new Array();
    readStream.on("error", (err) => {
        if (!streamEnded) {
            streamEnded = true;
        }
        if (err) {
            throw err;
        }
    });
    readStream.on("data", (data) => {
        records.push(data);
    });
    readStream.on("end", () => {
        streamEnded = true;
    });
    while (!generationEnded) {
        const value = await new Promise((resolve) => setTimeout(() => resolve(records.shift()), 0));
        if (value) {
            yield value;
        }
        generationEnded = streamEnded && records.length === 0;
    }
}

const readableStreamToIterable = (readableStream) => ({
    [Symbol.asyncIterator]: async function* () {
        const reader = readableStream.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    return;
                yield value;
            }
        }
        finally {
            reader.releaseLock();
        }
    },
});
const iterableToReadableStream = (asyncIterable) => {
    const iterator = asyncIterable[Symbol.asyncIterator]();
    return new ReadableStream({
        async pull(controller) {
            const { done, value } = await iterator.next();
            if (done) {
                return controller.close();
            }
            controller.enqueue(value);
        },
    });
};

const resolveEventStreamSerdeConfig = (input) => Object.assign(input, {
    eventStreamMarshaller: input.eventStreamSerdeProvider(input),
});

class EventStreamSerde {
    marshaller;
    serializer;
    deserializer;
    serdeContext;
    defaultContentType;
    constructor({ marshaller, serializer, deserializer, serdeContext, defaultContentType, }) {
        this.marshaller = marshaller;
        this.serializer = serializer;
        this.deserializer = deserializer;
        this.serdeContext = serdeContext;
        this.defaultContentType = defaultContentType;
    }
    async serializeEventStream({ eventStream, requestSchema, initialRequest, }) {
        const marshaller = this.marshaller;
        const eventStreamMember = requestSchema.getEventStreamMember();
        const unionSchema = requestSchema.getMemberSchema(eventStreamMember);
        const serializer = this.serializer;
        const defaultContentType = this.defaultContentType;
        const initialRequestMarker = Symbol("initialRequestMarker");
        const eventStreamIterable = {
            async *[Symbol.asyncIterator]() {
                if (initialRequest) {
                    const headers = {
                        ":event-type": { type: "string", value: "initial-request" },
                        ":message-type": { type: "string", value: "event" },
                        ":content-type": { type: "string", value: defaultContentType },
                    };
                    serializer.write(requestSchema, initialRequest);
                    const body = serializer.flush();
                    yield {
                        [initialRequestMarker]: true,
                        headers,
                        body,
                    };
                }
                for await (const page of eventStream) {
                    yield page;
                }
            },
        };
        return marshaller.serialize(eventStreamIterable, (event) => {
            if (event[initialRequestMarker]) {
                return {
                    headers: event.headers,
                    body: event.body,
                };
            }
            let unionMember = "";
            for (const key in event) {
                if (key !== "__type") {
                    unionMember = key;
                    break;
                }
            }
            const { additionalHeaders, body, eventType, explicitPayloadContentType } = this.writeEventBody(unionMember, unionSchema, event);
            const headers = {
                ":event-type": { type: "string", value: eventType },
                ":message-type": { type: "string", value: "event" },
                ":content-type": { type: "string", value: explicitPayloadContentType ?? defaultContentType },
                ...additionalHeaders,
            };
            return {
                headers,
                body,
            };
        });
    }
    async deserializeEventStream({ response, responseSchema, initialResponseContainer, }) {
        const marshaller = this.marshaller;
        const eventStreamMember = responseSchema.getEventStreamMember();
        const unionSchema = responseSchema.getMemberSchema(eventStreamMember);
        const memberSchemas = unionSchema.getMemberSchemas();
        const initialResponseMarker = Symbol("initialResponseMarker");
        const asyncIterable = marshaller.deserialize(response.body, async (event) => {
            let unionMember = "";
            for (const key in event) {
                if (key !== "__type") {
                    unionMember = key;
                    break;
                }
            }
            const body = event[unionMember].body;
            if (unionMember === "initial-response") {
                const dataObject = await this.deserializer.read(responseSchema, body);
                delete dataObject[eventStreamMember];
                return {
                    [initialResponseMarker]: true,
                    ...dataObject,
                };
            }
            else if (unionMember in memberSchemas) {
                const eventStreamSchema = memberSchemas[unionMember];
                if (eventStreamSchema.isStructSchema()) {
                    const out = {};
                    let hasBindings = false;
                    for (const [name, member] of eventStreamSchema.structIterator()) {
                        const { eventHeader, eventPayload } = member.getMergedTraits();
                        hasBindings = hasBindings || Boolean(eventHeader || eventPayload);
                        if (eventPayload) {
                            if (member.isBlobSchema()) {
                                out[name] = body;
                            }
                            else if (member.isStringSchema()) {
                                out[name] = (this.serdeContext?.utf8Encoder ?? serde.toUtf8)(body);
                            }
                            else if (member.isStructSchema()) {
                                out[name] = await this.deserializer.read(member, body);
                            }
                        }
                        else if (eventHeader) {
                            const value = event[unionMember].headers[name]?.value;
                            if (value != null) {
                                if (member.isNumericSchema()) {
                                    if (value && typeof value === "object" && "bytes" in value) {
                                        out[name] = BigInt(value.toString());
                                    }
                                    else {
                                        out[name] = Number(value);
                                    }
                                }
                                else {
                                    out[name] = value;
                                }
                            }
                        }
                    }
                    if (hasBindings) {
                        return {
                            [unionMember]: out,
                        };
                    }
                    if (body.byteLength === 0) {
                        return {
                            [unionMember]: {},
                        };
                    }
                }
                return {
                    [unionMember]: await this.deserializer.read(eventStreamSchema, body),
                };
            }
            else {
                return {
                    $unknown: event,
                };
            }
        });
        const asyncIterator = asyncIterable[Symbol.asyncIterator]();
        const firstEvent = await asyncIterator.next();
        if (firstEvent.done) {
            return asyncIterable;
        }
        if (firstEvent.value?.[initialResponseMarker]) {
            if (!responseSchema) {
                throw new Error("@smithy::core/protocols - initial-response event encountered in event stream but no response schema given.");
            }
            for (const key in firstEvent.value) {
                initialResponseContainer[key] = firstEvent.value[key];
            }
        }
        return {
            async *[Symbol.asyncIterator]() {
                if (!firstEvent?.value?.[initialResponseMarker]) {
                    yield firstEvent.value;
                }
                while (true) {
                    const { done, value } = await asyncIterator.next();
                    if (done) {
                        break;
                    }
                    yield value;
                }
            },
        };
    }
    writeEventBody(unionMember, unionSchema, event) {
        const serializer = this.serializer;
        let eventType = unionMember;
        let explicitPayloadMember = null;
        let explicitPayloadContentType;
        const isKnownSchema = (() => {
            const struct = unionSchema.getSchema();
            return struct[4].includes(unionMember);
        })();
        const additionalHeaders = {};
        if (!isKnownSchema) {
            const [type, value] = event[unionMember];
            eventType = type;
            serializer.write(15, value);
        }
        else {
            const eventSchema = unionSchema.getMemberSchema(unionMember);
            if (eventSchema.isStructSchema()) {
                for (const [memberName, memberSchema] of eventSchema.structIterator()) {
                    const { eventHeader, eventPayload } = memberSchema.getMergedTraits();
                    if (eventPayload) {
                        explicitPayloadMember = memberName;
                    }
                    else if (eventHeader) {
                        const value = event[unionMember][memberName];
                        let type = "binary";
                        if (memberSchema.isNumericSchema()) {
                            if ((-2) ** 31 <= value && value <= 2 ** 31 - 1) {
                                type = "integer";
                            }
                            else {
                                type = "long";
                            }
                        }
                        else if (memberSchema.isTimestampSchema()) {
                            type = "timestamp";
                        }
                        else if (memberSchema.isStringSchema()) {
                            type = "string";
                        }
                        else if (memberSchema.isBooleanSchema()) {
                            type = "boolean";
                        }
                        if (value != null) {
                            additionalHeaders[memberName] = {
                                type,
                                value,
                            };
                            delete event[unionMember][memberName];
                        }
                    }
                }
                if (explicitPayloadMember !== null) {
                    const payloadSchema = eventSchema.getMemberSchema(explicitPayloadMember);
                    if (payloadSchema.isBlobSchema()) {
                        explicitPayloadContentType = "application/octet-stream";
                    }
                    else if (payloadSchema.isStringSchema()) {
                        explicitPayloadContentType = "text/plain";
                    }
                    serializer.write(payloadSchema, event[unionMember][explicitPayloadMember]);
                }
                else {
                    serializer.write(eventSchema, event[unionMember]);
                }
            }
            else if (eventSchema.isUnitSchema()) {
                serializer.write(eventSchema, {});
            }
            else {
                throw new Error("@smithy/core/event-streams - non-struct member not supported in event stream union.");
            }
        }
        const messageSerialization = serializer.flush() ?? new Uint8Array();
        const body = typeof messageSerialization === "string"
            ? (this.serdeContext?.utf8Decoder ?? serde.fromUtf8)(messageSerialization)
            : messageSerialization;
        return {
            body,
            eventType,
            explicitPayloadContentType,
            additionalHeaders,
        };
    }
}

exports.EventStreamCodec = EventStreamCodec;
exports.EventStreamMarshaller = EventStreamMarshaller;
exports.EventStreamSerde = EventStreamSerde;
exports.HeaderMarshaller = HeaderMarshaller;
exports.Int64 = Int64;
exports.MessageDecoderStream = MessageDecoderStream;
exports.MessageEncoderStream = MessageEncoderStream;
exports.SmithyMessageDecoderStream = SmithyMessageDecoderStream;
exports.SmithyMessageEncoderStream = SmithyMessageEncoderStream;
exports.UniversalEventStreamMarshaller = EventStreamMarshaller$1;
exports.eventStreamSerdeProvider = eventStreamSerdeProvider;
exports.getChunkedStream = getChunkedStream;
exports.getMessageUnmarshaller = getMessageUnmarshaller;
exports.getUnmarshalledStream = getUnmarshalledStream;
exports.iterableToReadableStream = iterableToReadableStream;
exports.readableStreamToIterable = readableStreamToIterable;
exports.resolveEventStreamSerdeConfig = resolveEventStreamSerdeConfig;
exports.universalEventStreamSerdeProvider = eventStreamSerdeProvider$1;


/***/ }),

/***/ 45598:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var serde = __webpack_require__(38622);
var schema = __webpack_require__(95258);
var types = __webpack_require__(39654);

const collectBody = async (streamBody = new Uint8Array(), context) => {
    if (streamBody instanceof Uint8Array) {
        return serde.Uint8ArrayBlobAdapter.mutate(streamBody);
    }
    if (!streamBody) {
        return serde.Uint8ArrayBlobAdapter.mutate(new Uint8Array());
    }
    const fromContext = context.streamCollector(streamBody);
    return serde.Uint8ArrayBlobAdapter.mutate(await fromContext);
};

function extendedEncodeURIComponent(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
        return "%" + c.charCodeAt(0).toString(16).toUpperCase();
    });
}

class SerdeContext {
    serdeContext;
    setSerdeContext(serdeContext) {
        this.serdeContext = serdeContext;
    }
}

class HttpRequest {
    method;
    protocol;
    hostname;
    port;
    path;
    query;
    headers;
    username;
    password;
    fragment;
    body;
    constructor(options) {
        this.method = options.method || "GET";
        this.hostname = options.hostname || "localhost";
        this.port = options.port;
        this.query = options.query || {};
        this.headers = options.headers || {};
        this.body = options.body;
        this.protocol = options.protocol
            ? options.protocol.slice(-1) !== ":"
                ? `${options.protocol}:`
                : options.protocol
            : "https:";
        this.path = options.path ? (options.path.charAt(0) !== "/" ? `/${options.path}` : options.path) : "/";
        this.username = options.username;
        this.password = options.password;
        this.fragment = options.fragment;
    }
    static clone(request) {
        const cloned = new HttpRequest({
            ...request,
            headers: { ...request.headers },
        });
        if (cloned.query) {
            cloned.query = cloneQuery(cloned.query);
        }
        return cloned;
    }
    static isInstance(request) {
        if (!request) {
            return false;
        }
        const req = request;
        return ("method" in req &&
            "protocol" in req &&
            "hostname" in req &&
            "path" in req &&
            typeof req["query"] === "object" &&
            typeof req["headers"] === "object");
    }
    clone() {
        return HttpRequest.clone(this);
    }
}
function cloneQuery(query) {
    return Object.keys(query).reduce((carry, paramName) => {
        const param = query[paramName];
        return {
            ...carry,
            [paramName]: Array.isArray(param) ? [...param] : param,
        };
    }, {});
}

class HttpResponse {
    statusCode;
    reason;
    headers;
    body;
    constructor(options) {
        this.statusCode = options.statusCode;
        this.reason = options.reason;
        this.headers = options.headers || {};
        this.body = options.body;
    }
    static isInstance(response) {
        if (!response)
            return false;
        const resp = response;
        return typeof resp.statusCode === "number" && typeof resp.headers === "object";
    }
}

class HttpProtocol extends SerdeContext {
    options;
    compositeErrorRegistry;
    constructor(options) {
        super();
        this.options = options;
        this.compositeErrorRegistry = schema.TypeRegistry.for(options.defaultNamespace);
        for (const etr of options.errorTypeRegistries ?? []) {
            this.compositeErrorRegistry.copyFrom(etr);
        }
    }
    getRequestType() {
        return HttpRequest;
    }
    getResponseType() {
        return HttpResponse;
    }
    setSerdeContext(serdeContext) {
        this.serdeContext = serdeContext;
        this.serializer.setSerdeContext(serdeContext);
        this.deserializer.setSerdeContext(serdeContext);
        if (this.getPayloadCodec()) {
            this.getPayloadCodec().setSerdeContext(serdeContext);
        }
    }
    updateServiceEndpoint(request, endpoint) {
        if ("url" in endpoint) {
            request.protocol = endpoint.url.protocol;
            request.hostname = endpoint.url.hostname;
            request.port = endpoint.url.port ? Number(endpoint.url.port) : undefined;
            request.path = endpoint.url.pathname;
            request.fragment = endpoint.url.hash || void 0;
            request.username = endpoint.url.username || void 0;
            request.password = endpoint.url.password || void 0;
            if (!request.query) {
                request.query = {};
            }
            for (const [k, v] of endpoint.url.searchParams.entries()) {
                request.query[k] = v;
            }
            if (endpoint.headers) {
                for (const name in endpoint.headers) {
                    request.headers[name] = endpoint.headers[name].join(", ");
                }
            }
            return request;
        }
        else {
            request.protocol = endpoint.protocol;
            request.hostname = endpoint.hostname;
            request.port = endpoint.port ? Number(endpoint.port) : undefined;
            request.path = endpoint.path;
            request.query = {
                ...endpoint.query,
            };
            if (endpoint.headers) {
                for (const name in endpoint.headers) {
                    request.headers[name] = endpoint.headers[name];
                }
            }
            return request;
        }
    }
    setHostPrefix(request, operationSchema, input) {
        if (this.serdeContext?.disableHostPrefix) {
            return;
        }
        const inputNs = schema.NormalizedSchema.of(operationSchema.input);
        const opTraits = schema.translateTraits(operationSchema.traits ?? {});
        if (opTraits.endpoint) {
            let hostPrefix = opTraits.endpoint?.[0];
            if (typeof hostPrefix === "string") {
                for (const [name, member] of inputNs.structIterator()) {
                    if (!member.getMergedTraits().hostLabel) {
                        continue;
                    }
                    const replacement = input[name];
                    if (typeof replacement !== "string") {
                        throw new Error(`@smithy/core/schema - ${name} in input must be a string as hostLabel.`);
                    }
                    hostPrefix = hostPrefix.replace(`{${name}}`, replacement);
                }
                request.hostname = hostPrefix + request.hostname;
            }
        }
    }
    deserializeMetadata(output) {
        return {
            httpStatusCode: output.statusCode,
            requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
            extendedRequestId: output.headers["x-amz-id-2"],
            cfId: output.headers["x-amz-cf-id"],
        };
    }
    async serializeEventStream({ eventStream, requestSchema, initialRequest, }) {
        const eventStreamSerde = await this.loadEventStreamCapability();
        return eventStreamSerde.serializeEventStream({
            eventStream,
            requestSchema,
            initialRequest,
        });
    }
    async deserializeEventStream({ response, responseSchema, initialResponseContainer, }) {
        const eventStreamSerde = await this.loadEventStreamCapability();
        return eventStreamSerde.deserializeEventStream({
            response,
            responseSchema,
            initialResponseContainer,
        });
    }
    async loadEventStreamCapability() {
        const { EventStreamSerde } = await Promise.resolve(/* import() */).then(__webpack_require__.t.bind(__webpack_require__, 40051, 19));
        return new EventStreamSerde({
            marshaller: this.getEventStreamMarshaller(),
            serializer: this.serializer,
            deserializer: this.deserializer,
            serdeContext: this.serdeContext,
            defaultContentType: this.getDefaultContentType(),
        });
    }
    getDefaultContentType() {
        throw new Error(`@smithy/core/protocols - ${this.constructor.name} getDefaultContentType() implementation missing.`);
    }
    async deserializeHttpMessage(schema, context, response, arg4, arg5) {
        return [];
    }
    getEventStreamMarshaller() {
        const context = this.serdeContext;
        if (!context.eventStreamMarshaller) {
            throw new Error("@smithy/core - HttpProtocol: eventStreamMarshaller missing in serdeContext.");
        }
        return context.eventStreamMarshaller;
    }
}

class HttpBindingProtocol extends HttpProtocol {
    async serializeRequest(operationSchema, _input, context) {
        const input = _input && typeof _input === "object" ? _input : {};
        const serializer = this.serializer;
        const query = {};
        const headers = {};
        const endpoint = await context.endpoint();
        const ns = schema.NormalizedSchema.of(operationSchema?.input);
        const payloadMemberNames = [];
        const payloadMemberSchemas = [];
        let hasNonHttpBindingMember = false;
        let payload;
        const request = new HttpRequest({
            protocol: "",
            hostname: "",
            port: undefined,
            path: "",
            fragment: undefined,
            query: query,
            headers: headers,
            body: undefined,
        });
        if (endpoint) {
            this.updateServiceEndpoint(request, endpoint);
            this.setHostPrefix(request, operationSchema, input);
            const opTraits = schema.translateTraits(operationSchema.traits);
            if (opTraits.http) {
                request.method = opTraits.http[0];
                const [path, search] = opTraits.http[1].split("?");
                if (request.path == "/") {
                    request.path = path;
                }
                else {
                    request.path += path;
                }
                const traitSearchParams = new URLSearchParams(search ?? "");
                for (const [key, value] of traitSearchParams) {
                    query[key] = value;
                }
            }
        }
        for (const [memberName, memberNs] of ns.structIterator()) {
            const memberTraits = memberNs.getMergedTraits() ?? {};
            const inputMemberValue = input[memberName];
            if (inputMemberValue == null && !memberNs.isIdempotencyToken()) {
                if (memberTraits.httpLabel) {
                    if (request.path.includes(`{${memberName}+}`) || request.path.includes(`{${memberName}}`)) {
                        throw new Error(`No value provided for input HTTP label: ${memberName}.`);
                    }
                }
                continue;
            }
            if (memberTraits.httpPayload) {
                const isStreaming = memberNs.isStreaming();
                if (isStreaming) {
                    const isEventStream = memberNs.isStructSchema();
                    if (isEventStream) {
                        if (input[memberName]) {
                            payload = await this.serializeEventStream({
                                eventStream: input[memberName],
                                requestSchema: ns,
                            });
                        }
                    }
                    else {
                        payload = inputMemberValue;
                    }
                }
                else {
                    serializer.write(memberNs, inputMemberValue);
                    payload = serializer.flush();
                }
            }
            else if (memberTraits.httpLabel) {
                serializer.write(memberNs, inputMemberValue);
                const replacement = serializer.flush();
                if (request.path.includes(`{${memberName}+}`)) {
                    request.path = request.path.replace(`{${memberName}+}`, replacement.split("/").map(extendedEncodeURIComponent).join("/"));
                }
                else if (request.path.includes(`{${memberName}}`)) {
                    request.path = request.path.replace(`{${memberName}}`, extendedEncodeURIComponent(replacement));
                }
            }
            else if (memberTraits.httpHeader) {
                serializer.write(memberNs, inputMemberValue);
                headers[memberTraits.httpHeader.toLowerCase()] = String(serializer.flush());
            }
            else if (typeof memberTraits.httpPrefixHeaders === "string") {
                for (const key in inputMemberValue) {
                    const val = inputMemberValue[key];
                    const amalgam = memberTraits.httpPrefixHeaders + key;
                    serializer.write([memberNs.getValueSchema(), { httpHeader: amalgam }], val);
                    headers[amalgam.toLowerCase()] = serializer.flush();
                }
            }
            else if (memberTraits.httpQuery || memberTraits.httpQueryParams) {
                this.serializeQuery(memberNs, inputMemberValue, query);
            }
            else {
                hasNonHttpBindingMember = true;
                payloadMemberNames.push(memberName);
                payloadMemberSchemas.push(memberNs);
            }
        }
        if (hasNonHttpBindingMember && input) {
            const [namespace, name] = (ns.getName(true) ?? "#Unknown").split("#");
            const requiredMembers = ns.getSchema()[6];
            const payloadSchema = [
                3,
                namespace,
                name,
                ns.getMergedTraits(),
                payloadMemberNames,
                payloadMemberSchemas,
                undefined,
            ];
            if (requiredMembers) {
                payloadSchema[6] = requiredMembers;
            }
            else {
                payloadSchema.pop();
            }
            serializer.write(payloadSchema, input);
            payload = serializer.flush();
        }
        request.headers = headers;
        request.query = query;
        request.body = payload;
        return request;
    }
    serializeQuery(ns, data, query) {
        const serializer = this.serializer;
        const traits = ns.getMergedTraits();
        if (traits.httpQueryParams) {
            for (const key in data) {
                if (!(key in query)) {
                    const val = data[key];
                    const valueSchema = ns.getValueSchema();
                    Object.assign(valueSchema.getMergedTraits(), {
                        ...traits,
                        httpQuery: key,
                        httpQueryParams: undefined,
                    });
                    this.serializeQuery(valueSchema, val, query);
                }
            }
            return;
        }
        if (ns.isListSchema()) {
            const sparse = !!ns.getMergedTraits().sparse;
            const buffer = [];
            for (const item of data) {
                serializer.write([ns.getValueSchema(), traits], item);
                const serializable = serializer.flush();
                if (sparse || serializable !== undefined) {
                    buffer.push(serializable);
                }
            }
            query[traits.httpQuery] = buffer;
        }
        else {
            serializer.write([ns, traits], data);
            query[traits.httpQuery] = serializer.flush();
        }
    }
    async deserializeResponse(operationSchema, context, response) {
        const deserializer = this.deserializer;
        const ns = schema.NormalizedSchema.of(operationSchema.output);
        const dataObject = {};
        if (response.statusCode >= 300) {
            const bytes = await collectBody(response.body, context);
            if (bytes.byteLength > 0) {
                Object.assign(dataObject, await deserializer.read(15, bytes));
            }
            await this.handleError(operationSchema, context, response, dataObject, this.deserializeMetadata(response));
            throw new Error("@smithy/core/protocols - HTTP Protocol error handler failed to throw.");
        }
        for (const header in response.headers) {
            const value = response.headers[header];
            delete response.headers[header];
            response.headers[header.toLowerCase()] = value;
        }
        const nonHttpBindingMembers = await this.deserializeHttpMessage(ns, context, response, dataObject);
        if (nonHttpBindingMembers.length) {
            const bytes = await collectBody(response.body, context);
            if (bytes.byteLength > 0) {
                const dataFromBody = await deserializer.read(ns, bytes);
                for (const member of nonHttpBindingMembers) {
                    if (dataFromBody[member] != null) {
                        dataObject[member] = dataFromBody[member];
                    }
                }
            }
        }
        else if (nonHttpBindingMembers.discardResponseBody) {
            await collectBody(response.body, context);
        }
        dataObject.$metadata = this.deserializeMetadata(response);
        return dataObject;
    }
    async deserializeHttpMessage(schema$1, context, response, arg4, arg5) {
        let dataObject;
        if (arg4 instanceof Set) {
            dataObject = arg5;
        }
        else {
            dataObject = arg4;
        }
        let discardResponseBody = true;
        const deserializer = this.deserializer;
        const ns = schema.NormalizedSchema.of(schema$1);
        const nonHttpBindingMembers = [];
        for (const [memberName, memberSchema] of ns.structIterator()) {
            const memberTraits = memberSchema.getMemberTraits();
            if (memberTraits.httpPayload) {
                discardResponseBody = false;
                const isStreaming = memberSchema.isStreaming();
                if (isStreaming) {
                    const isEventStream = memberSchema.isStructSchema();
                    if (isEventStream) {
                        dataObject[memberName] = await this.deserializeEventStream({
                            response,
                            responseSchema: ns,
                        });
                    }
                    else {
                        dataObject[memberName] = serde.sdkStreamMixin(response.body);
                    }
                }
                else if (response.body) {
                    const bytes = await collectBody(response.body, context);
                    if (bytes.byteLength > 0) {
                        dataObject[memberName] = await deserializer.read(memberSchema, bytes);
                    }
                }
            }
            else if (memberTraits.httpHeader) {
                const key = String(memberTraits.httpHeader).toLowerCase();
                const value = response.headers[key];
                if (null != value) {
                    if (memberSchema.isListSchema()) {
                        const headerListValueSchema = memberSchema.getValueSchema();
                        headerListValueSchema.getMergedTraits().httpHeader = key;
                        let sections;
                        if (headerListValueSchema.isTimestampSchema() &&
                            headerListValueSchema.getSchema() === 4) {
                            sections = serde.splitEvery(value, ",", 2);
                        }
                        else {
                            sections = serde.splitHeader(value);
                        }
                        const list = [];
                        for (const section of sections) {
                            list.push(await deserializer.read(headerListValueSchema, section.trim()));
                        }
                        dataObject[memberName] = list;
                    }
                    else {
                        dataObject[memberName] = await deserializer.read(memberSchema, value);
                    }
                }
            }
            else if (memberTraits.httpPrefixHeaders !== undefined) {
                dataObject[memberName] = {};
                for (const header in response.headers) {
                    if (header.startsWith(memberTraits.httpPrefixHeaders)) {
                        const value = response.headers[header];
                        const valueSchema = memberSchema.getValueSchema();
                        valueSchema.getMergedTraits().httpHeader = header;
                        dataObject[memberName][header.slice(memberTraits.httpPrefixHeaders.length)] = await deserializer.read(valueSchema, value);
                    }
                }
            }
            else if (memberTraits.httpResponseCode) {
                dataObject[memberName] = response.statusCode;
            }
            else {
                nonHttpBindingMembers.push(memberName);
            }
        }
        nonHttpBindingMembers.discardResponseBody = discardResponseBody;
        return nonHttpBindingMembers;
    }
}

class RpcProtocol extends HttpProtocol {
    async serializeRequest(operationSchema, _input, context) {
        const serializer = this.serializer;
        const query = {};
        const headers = {};
        const endpoint = await context.endpoint();
        const ns = schema.NormalizedSchema.of(operationSchema?.input);
        const schema$1 = ns.getSchema();
        let payload;
        const input = _input && typeof _input === "object" ? _input : {};
        const request = new HttpRequest({
            protocol: "",
            hostname: "",
            port: undefined,
            path: "/",
            fragment: undefined,
            query: query,
            headers: headers,
            body: undefined,
        });
        if (endpoint) {
            this.updateServiceEndpoint(request, endpoint);
            this.setHostPrefix(request, operationSchema, input);
        }
        if (input) {
            const eventStreamMember = ns.getEventStreamMember();
            if (eventStreamMember) {
                if (input[eventStreamMember]) {
                    const initialRequest = {};
                    for (const [memberName, memberSchema] of ns.structIterator()) {
                        if (memberName !== eventStreamMember && input[memberName]) {
                            serializer.write(memberSchema, input[memberName]);
                            initialRequest[memberName] = serializer.flush();
                        }
                    }
                    payload = await this.serializeEventStream({
                        eventStream: input[eventStreamMember],
                        requestSchema: ns,
                        initialRequest,
                    });
                }
            }
            else {
                serializer.write(schema$1, input);
                payload = serializer.flush();
            }
        }
        request.headers = Object.assign(request.headers, headers);
        request.query = query;
        request.body = payload;
        request.method = "POST";
        return request;
    }
    async deserializeResponse(operationSchema, context, response) {
        const deserializer = this.deserializer;
        const ns = schema.NormalizedSchema.of(operationSchema.output);
        const dataObject = {};
        if (response.statusCode >= 300) {
            const bytes = await collectBody(response.body, context);
            if (bytes.byteLength > 0) {
                Object.assign(dataObject, await deserializer.read(15, bytes));
            }
            await this.handleError(operationSchema, context, response, dataObject, this.deserializeMetadata(response));
            throw new Error("@smithy/core/protocols - RPC Protocol error handler failed to throw.");
        }
        for (const header in response.headers) {
            const value = response.headers[header];
            delete response.headers[header];
            response.headers[header.toLowerCase()] = value;
        }
        const eventStreamMember = ns.getEventStreamMember();
        if (eventStreamMember) {
            dataObject[eventStreamMember] = await this.deserializeEventStream({
                response,
                responseSchema: ns,
                initialResponseContainer: dataObject,
            });
        }
        else {
            const bytes = await collectBody(response.body, context);
            if (bytes.byteLength > 0) {
                Object.assign(dataObject, await deserializer.read(ns, bytes));
            }
        }
        dataObject.$metadata = this.deserializeMetadata(response);
        return dataObject;
    }
}

const resolvedPath = (resolvedPath, input, memberName, labelValueProvider, uriLabel, isGreedyLabel) => {
    if (input != null && input[memberName] !== undefined) {
        const labelValue = labelValueProvider();
        if (labelValue == null || labelValue.length <= 0) {
            throw new Error("Empty value provided for input HTTP label: " + memberName + ".");
        }
        resolvedPath = resolvedPath.replace(uriLabel, isGreedyLabel
            ? labelValue
                .split("/")
                .map((segment) => extendedEncodeURIComponent(segment))
                .join("/")
            : extendedEncodeURIComponent(labelValue));
    }
    else {
        throw new Error("No value provided for input HTTP label: " + memberName + ".");
    }
    return resolvedPath;
};

function requestBuilder(input, context) {
    return new RequestBuilder(input, context);
}
class RequestBuilder {
    input;
    context;
    query = {};
    method = "";
    headers = {};
    path = "";
    body = null;
    hostname = "";
    resolvePathStack = [];
    constructor(input, context) {
        this.input = input;
        this.context = context;
    }
    async build() {
        const { hostname, protocol = "https", port, path: basePath } = await this.context.endpoint();
        this.path = basePath;
        for (const resolvePath of this.resolvePathStack) {
            resolvePath(this.path);
        }
        return new HttpRequest({
            protocol,
            hostname: this.hostname || hostname,
            port,
            method: this.method,
            path: this.path,
            query: this.query,
            body: this.body,
            headers: this.headers,
        });
    }
    hn(hostname) {
        this.hostname = hostname;
        return this;
    }
    bp(uriLabel) {
        this.resolvePathStack.push((basePath) => {
            this.path = `${basePath?.endsWith("/") ? basePath.slice(0, -1) : basePath || ""}` + uriLabel;
        });
        return this;
    }
    p(memberName, labelValueProvider, uriLabel, isGreedyLabel) {
        this.resolvePathStack.push((path) => {
            this.path = resolvedPath(path, this.input, memberName, labelValueProvider, uriLabel, isGreedyLabel);
        });
        return this;
    }
    h(headers) {
        this.headers = headers;
        return this;
    }
    q(query) {
        this.query = query;
        return this;
    }
    b(body) {
        this.body = body;
        return this;
    }
    m(method) {
        this.method = method;
        return this;
    }
}

function determineTimestampFormat(ns, settings) {
    if (settings.timestampFormat.useTrait) {
        if (ns.isTimestampSchema() &&
            (ns.getSchema() === 5 ||
                ns.getSchema() === 6 ||
                ns.getSchema() === 7)) {
            return ns.getSchema();
        }
    }
    const { httpLabel, httpPrefixHeaders, httpHeader, httpQuery } = ns.getMergedTraits();
    const bindingFormat = settings.httpBindings
        ? typeof httpPrefixHeaders === "string" || Boolean(httpHeader)
            ? 6
            : Boolean(httpQuery) || Boolean(httpLabel)
                ? 5
                : undefined
        : undefined;
    return bindingFormat ?? settings.timestampFormat.default;
}

class FromStringShapeDeserializer extends SerdeContext {
    settings;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    read(_schema, data) {
        const ns = schema.NormalizedSchema.of(_schema);
        if (ns.isListSchema()) {
            return serde.splitHeader(data).map((item) => this.read(ns.getValueSchema(), item));
        }
        if (ns.isBlobSchema()) {
            return (this.serdeContext?.base64Decoder ?? serde.fromBase64)(data);
        }
        if (ns.isTimestampSchema()) {
            const format = determineTimestampFormat(ns, this.settings);
            switch (format) {
                case 5:
                    return serde._parseRfc3339DateTimeWithOffset(data);
                case 6:
                    return serde._parseRfc7231DateTime(data);
                case 7:
                    return serde._parseEpochTimestamp(data);
                default:
                    console.warn("Missing timestamp format, parsing value with Date constructor:", data);
                    return new Date(data);
            }
        }
        if (ns.isStringSchema()) {
            const mediaType = ns.getMergedTraits().mediaType;
            let intermediateValue = data;
            if (mediaType) {
                if (ns.getMergedTraits().httpHeader) {
                    intermediateValue = this.base64ToUtf8(intermediateValue);
                }
                const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
                if (isJson) {
                    intermediateValue = serde.LazyJsonString.from(intermediateValue);
                }
                return intermediateValue;
            }
        }
        if (ns.isNumericSchema()) {
            return Number(data);
        }
        if (ns.isBigIntegerSchema()) {
            return BigInt(data);
        }
        if (ns.isBigDecimalSchema()) {
            return new serde.NumericValue(data, "bigDecimal");
        }
        if (ns.isBooleanSchema()) {
            return String(data).toLowerCase() === "true";
        }
        return data;
    }
    base64ToUtf8(base64String) {
        return (this.serdeContext?.utf8Encoder ?? serde.toUtf8)((this.serdeContext?.base64Decoder ?? serde.fromBase64)(base64String));
    }
}

class HttpInterceptingShapeDeserializer extends SerdeContext {
    codecDeserializer;
    stringDeserializer;
    constructor(codecDeserializer, codecSettings) {
        super();
        this.codecDeserializer = codecDeserializer;
        this.stringDeserializer = new FromStringShapeDeserializer(codecSettings);
    }
    setSerdeContext(serdeContext) {
        this.stringDeserializer.setSerdeContext(serdeContext);
        this.codecDeserializer.setSerdeContext(serdeContext);
        this.serdeContext = serdeContext;
    }
    read(schema$1, data) {
        const ns = schema.NormalizedSchema.of(schema$1);
        const traits = ns.getMergedTraits();
        const toString = this.serdeContext?.utf8Encoder ?? serde.toUtf8;
        if (traits.httpHeader || traits.httpResponseCode) {
            return this.stringDeserializer.read(ns, toString(data));
        }
        if (traits.httpPayload) {
            if (ns.isBlobSchema()) {
                const toBytes = this.serdeContext?.utf8Decoder ?? serde.fromUtf8;
                if (typeof data === "string") {
                    return toBytes(data);
                }
                return data;
            }
            else if (ns.isStringSchema()) {
                if ("byteLength" in data) {
                    return toString(data);
                }
                return data;
            }
        }
        return this.codecDeserializer.read(ns, data);
    }
}

class ToStringShapeSerializer extends SerdeContext {
    settings;
    stringBuffer = "";
    constructor(settings) {
        super();
        this.settings = settings;
    }
    write(schema$1, value) {
        const ns = schema.NormalizedSchema.of(schema$1);
        switch (typeof value) {
            case "object":
                if (value === null) {
                    this.stringBuffer = "null";
                    return;
                }
                if (ns.isTimestampSchema()) {
                    if (!(value instanceof Date)) {
                        throw new Error(`@smithy/core/protocols - received non-Date value ${value} when schema expected Date in ${ns.getName(true)}`);
                    }
                    const format = determineTimestampFormat(ns, this.settings);
                    switch (format) {
                        case 5:
                            this.stringBuffer = value.toISOString().replace(".000Z", "Z");
                            break;
                        case 6:
                            this.stringBuffer = serde.dateToUtcString(value);
                            break;
                        case 7:
                            this.stringBuffer = String(value.getTime() / 1000);
                            break;
                        default:
                            console.warn("Missing timestamp format, using epoch seconds", value);
                            this.stringBuffer = String(value.getTime() / 1000);
                    }
                    return;
                }
                if (ns.isBlobSchema() && "byteLength" in value) {
                    this.stringBuffer = (this.serdeContext?.base64Encoder ?? serde.toBase64)(value);
                    return;
                }
                if (ns.isListSchema() && Array.isArray(value)) {
                    let buffer = "";
                    for (const item of value) {
                        this.write([ns.getValueSchema(), ns.getMergedTraits()], item);
                        const headerItem = this.flush();
                        const serialized = ns.getValueSchema().isTimestampSchema() ? headerItem : serde.quoteHeader(headerItem);
                        if (buffer !== "") {
                            buffer += ", ";
                        }
                        buffer += serialized;
                    }
                    this.stringBuffer = buffer;
                    return;
                }
                this.stringBuffer = JSON.stringify(value, null, 2);
                break;
            case "string":
                const mediaType = ns.getMergedTraits().mediaType;
                let intermediateValue = value;
                if (mediaType) {
                    const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
                    if (isJson) {
                        intermediateValue = serde.LazyJsonString.from(intermediateValue);
                    }
                    if (ns.getMergedTraits().httpHeader) {
                        this.stringBuffer = (this.serdeContext?.base64Encoder ?? serde.toBase64)(intermediateValue.toString());
                        return;
                    }
                }
                this.stringBuffer = value;
                break;
            default:
                if (ns.isIdempotencyToken()) {
                    this.stringBuffer = serde.generateIdempotencyToken();
                }
                else {
                    this.stringBuffer = String(value);
                }
        }
    }
    flush() {
        const buffer = this.stringBuffer;
        this.stringBuffer = "";
        return buffer;
    }
}

class HttpInterceptingShapeSerializer {
    codecSerializer;
    stringSerializer;
    buffer;
    constructor(codecSerializer, codecSettings, stringSerializer = new ToStringShapeSerializer(codecSettings)) {
        this.codecSerializer = codecSerializer;
        this.stringSerializer = stringSerializer;
    }
    setSerdeContext(serdeContext) {
        this.codecSerializer.setSerdeContext(serdeContext);
        this.stringSerializer.setSerdeContext(serdeContext);
    }
    write(schema$1, value) {
        const ns = schema.NormalizedSchema.of(schema$1);
        const traits = ns.getMergedTraits();
        if (traits.httpHeader || traits.httpLabel || traits.httpQuery) {
            this.stringSerializer.write(ns, value);
            this.buffer = this.stringSerializer.flush();
            return;
        }
        return this.codecSerializer.write(ns, value);
    }
    flush() {
        if (this.buffer !== undefined) {
            const buffer = this.buffer;
            this.buffer = undefined;
            return buffer;
        }
        return this.codecSerializer.flush();
    }
}

class Field {
    name;
    kind;
    values;
    constructor({ name, kind = types.FieldPosition.HEADER, values = [] }) {
        this.name = name;
        this.kind = kind;
        this.values = values;
    }
    add(value) {
        this.values.push(value);
    }
    set(values) {
        this.values = values;
    }
    remove(value) {
        this.values = this.values.filter((v) => v !== value);
    }
    toString() {
        return this.values.map((v) => (v.includes(",") || v.includes(" ") ? `"${v}"` : v)).join(", ");
    }
    get() {
        return this.values;
    }
}

class Fields {
    entries = {};
    encoding;
    constructor({ fields = [], encoding = "utf-8" }) {
        fields.forEach(this.setField.bind(this));
        this.encoding = encoding;
    }
    setField(field) {
        this.entries[field.name.toLowerCase()] = field;
    }
    getField(name) {
        return this.entries[name.toLowerCase()];
    }
    removeField(name) {
        delete this.entries[name.toLowerCase()];
    }
    getByType(kind) {
        return Object.values(this.entries).filter((field) => field.kind === kind);
    }
}

function isValidHostname(hostname) {
    const hostPattern = /^[a-z0-9][a-z0-9\.\-]*[a-z0-9]$/;
    return hostPattern.test(hostname);
}

const getHttpHandlerExtensionConfiguration = (runtimeConfig) => {
    return {
        setHttpHandler(handler) {
            runtimeConfig.httpHandler = handler;
        },
        httpHandler() {
            return runtimeConfig.httpHandler;
        },
        updateHttpClientConfig(key, value) {
            runtimeConfig.httpHandler?.updateHttpClientConfig(key, value);
        },
        httpHandlerConfigs() {
            return runtimeConfig.httpHandler.httpHandlerConfigs();
        },
    };
};
const resolveHttpHandlerRuntimeConfig = (httpHandlerExtensionConfiguration) => {
    return {
        httpHandler: httpHandlerExtensionConfiguration.httpHandler(),
    };
};

const CONTENT_LENGTH_HEADER = "content-length";
function contentLengthMiddleware(bodyLengthChecker) {
    return (next) => async (args) => {
        const request = args.request;
        if (HttpRequest.isInstance(request)) {
            const { body, headers } = request;
            if (body &&
                Object.keys(headers)
                    .map((str) => str.toLowerCase())
                    .indexOf(CONTENT_LENGTH_HEADER) === -1) {
                try {
                    const length = bodyLengthChecker(body);
                    request.headers = {
                        ...request.headers,
                        [CONTENT_LENGTH_HEADER]: String(length),
                    };
                }
                catch (error) {
                }
            }
        }
        return next({
            ...args,
            request,
        });
    };
}
const contentLengthMiddlewareOptions = {
    step: "build",
    tags: ["SET_CONTENT_LENGTH", "CONTENT_LENGTH"],
    name: "contentLengthMiddleware",
    override: true,
};
const getContentLengthPlugin = (options) => ({
    applyToStack: (clientStack) => {
        clientStack.add(contentLengthMiddleware(options.bodyLengthChecker), contentLengthMiddlewareOptions);
    },
});

const escapeUri = (uri) => encodeURIComponent(uri).replace(/[!'()*]/g, hexEncode);
const hexEncode = (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`;

const escapeUriPath = (uri) => uri.split("/").map(escapeUri).join("/");

function buildQueryString(query) {
    const parts = [];
    for (let key of Object.keys(query).sort()) {
        const value = query[key];
        key = escapeUri(key);
        if (Array.isArray(value)) {
            for (let i = 0, iLen = value.length; i < iLen; i++) {
                parts.push(`${key}=${escapeUri(value[i])}`);
            }
        }
        else {
            let qsEntry = key;
            if (value || typeof value === "string") {
                qsEntry += `=${escapeUri(value)}`;
            }
            parts.push(qsEntry);
        }
    }
    return parts.join("&");
}

function parseQueryString(querystring) {
    const query = {};
    querystring = querystring.replace(/^\?/, "");
    if (querystring) {
        for (const pair of querystring.split("&")) {
            let [key, value = null] = pair.split("=");
            key = decodeURIComponent(key);
            if (value) {
                value = decodeURIComponent(value);
            }
            if (!(key in query)) {
                query[key] = value;
            }
            else if (Array.isArray(query[key])) {
                query[key].push(value);
            }
            else {
                query[key] = [query[key], value];
            }
        }
    }
    return query;
}

const parseUrl = (url) => {
    if (typeof url === "string") {
        return parseUrl(new URL(url));
    }
    const { hostname, pathname, port, protocol, search } = url;
    let query;
    if (search) {
        query = parseQueryString(search);
    }
    return {
        hostname,
        port: port ? parseInt(port) : undefined,
        protocol,
        path: pathname,
        query,
    };
};

exports.Field = Field;
exports.Fields = Fields;
exports.FromStringShapeDeserializer = FromStringShapeDeserializer;
exports.HttpBindingProtocol = HttpBindingProtocol;
exports.HttpInterceptingShapeDeserializer = HttpInterceptingShapeDeserializer;
exports.HttpInterceptingShapeSerializer = HttpInterceptingShapeSerializer;
exports.HttpProtocol = HttpProtocol;
exports.HttpRequest = HttpRequest;
exports.HttpResponse = HttpResponse;
exports.RequestBuilder = RequestBuilder;
exports.RpcProtocol = RpcProtocol;
exports.SerdeContext = SerdeContext;
exports.ToStringShapeSerializer = ToStringShapeSerializer;
exports.buildQueryString = buildQueryString;
exports.collectBody = collectBody;
exports.contentLengthMiddleware = contentLengthMiddleware;
exports.contentLengthMiddlewareOptions = contentLengthMiddlewareOptions;
exports.determineTimestampFormat = determineTimestampFormat;
exports.escapeUri = escapeUri;
exports.escapeUriPath = escapeUriPath;
exports.extendedEncodeURIComponent = extendedEncodeURIComponent;
exports.getContentLengthPlugin = getContentLengthPlugin;
exports.getHttpHandlerExtensionConfiguration = getHttpHandlerExtensionConfiguration;
exports.isValidHostname = isValidHostname;
exports.parseQueryString = parseQueryString;
exports.parseUrl = parseUrl;
exports.requestBuilder = requestBuilder;
exports.resolveHttpHandlerRuntimeConfig = resolveHttpHandlerRuntimeConfig;
exports.resolvedPath = resolvedPath;


/***/ }),

/***/ 64233:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var node_stream = __webpack_require__(57075);
var client = __webpack_require__(63234);
var protocols = __webpack_require__(45598);
var serde = __webpack_require__(38622);

const isStreamingPayload = (request) => request?.body instanceof node_stream.Readable ||
    (typeof ReadableStream !== "undefined" && request?.body instanceof ReadableStream);

const CLOCK_SKEW_ERROR_CODES = [
    "AuthFailure",
    "InvalidSignatureException",
    "RequestExpired",
    "RequestInTheFuture",
    "RequestTimeTooSkewed",
    "SignatureDoesNotMatch",
];
const THROTTLING_ERROR_CODES = [
    "BandwidthLimitExceeded",
    "EC2ThrottledException",
    "LimitExceededException",
    "PriorRequestNotComplete",
    "ProvisionedThroughputExceededException",
    "RequestLimitExceeded",
    "RequestThrottled",
    "RequestThrottledException",
    "SlowDown",
    "ThrottledException",
    "Throttling",
    "ThrottlingException",
    "TooManyRequestsException",
    "TransactionInProgressException",
];
const TRANSIENT_ERROR_CODES = ["TimeoutError", "RequestTimeout", "RequestTimeoutException"];
const TRANSIENT_ERROR_STATUS_CODES = [500, 502, 503, 504];
const NODEJS_TIMEOUT_ERROR_CODES = ["ECONNRESET", "ECONNREFUSED", "EPIPE", "ETIMEDOUT"];
const NODEJS_NETWORK_ERROR_CODES = ["EHOSTUNREACH", "ENETUNREACH", "ENOTFOUND"];

const isRetryableByTrait = (error) => error?.$retryable !== undefined;
const isClockSkewError = (error) => CLOCK_SKEW_ERROR_CODES.includes(error.name);
const isClockSkewCorrectedError = (error) => error.$metadata?.clockSkewCorrected;
const isBrowserNetworkError = (error) => {
    const errorMessages = new Set([
        "Failed to fetch",
        "NetworkError when attempting to fetch resource",
        "The Internet connection appears to be offline",
        "Load failed",
        "Network request failed",
    ]);
    const isValid = error && error instanceof TypeError;
    if (!isValid) {
        return false;
    }
    return errorMessages.has(error.message);
};
const isThrottlingError = (error) => error.$metadata?.httpStatusCode === 429 ||
    THROTTLING_ERROR_CODES.includes(error.name) ||
    error.$retryable?.throttling == true;
const isTransientError = (error, depth = 0) => isRetryableByTrait(error) ||
    isClockSkewCorrectedError(error) ||
    (error.name === "InvalidSignatureException" && error.message?.includes("Signature expired")) ||
    TRANSIENT_ERROR_CODES.includes(error.name) ||
    NODEJS_TIMEOUT_ERROR_CODES.includes(error?.code || "") ||
    NODEJS_NETWORK_ERROR_CODES.includes(error?.code || "") ||
    TRANSIENT_ERROR_STATUS_CODES.includes(error.$metadata?.httpStatusCode || 0) ||
    isBrowserNetworkError(error) ||
    isNodeJsHttp2TransientError(error) ||
    (error.cause !== undefined && depth <= 10 && isTransientError(error.cause, depth + 1));
const isServerError = (error) => {
    if (error.$metadata?.httpStatusCode !== undefined) {
        const statusCode = error.$metadata.httpStatusCode;
        if (500 <= statusCode && statusCode <= 599 && !isTransientError(error)) {
            return true;
        }
        return false;
    }
    return false;
};
function isNodeJsHttp2TransientError(error) {
    return error.code === "ERR_HTTP2_STREAM_ERROR" && error.message.includes("NGHTTP2_REFUSED_STREAM");
}

const DEFAULT_RETRY_DELAY_BASE = 100;
const MAXIMUM_RETRY_DELAY = 20 * 1000;
const THROTTLING_RETRY_DELAY_BASE = 500;
const INITIAL_RETRY_TOKENS = 500;
const RETRY_COST = 5;
const TIMEOUT_RETRY_COST = 10;
const NO_RETRY_INCREMENT = 1;
const INVOCATION_ID_HEADER = "amz-sdk-invocation-id";
const REQUEST_HEADER = "amz-sdk-request";

function parseRetryAfterHeader(response, logger) {
    if (!protocols.HttpResponse.isInstance(response)) {
        return;
    }
    for (const header of Object.keys(response.headers)) {
        const h = header.toLowerCase();
        if (h === "retry-after") {
            const retryAfter = response.headers[header];
            let retryAfterSeconds = NaN;
            if (retryAfter.endsWith("GMT")) {
                try {
                    const date = serde.parseRfc7231DateTime(retryAfter);
                    retryAfterSeconds = (date.getTime() - Date.now()) / 1000;
                }
                catch (e) {
                    logger?.trace?.("Failed to parse retry-after header");
                    logger?.trace?.(e);
                }
            }
            else if (retryAfter.match(/ GMT, ((\d+)|(\d+\.\d+))$/)) {
                retryAfterSeconds = Number(retryAfter.match(/ GMT, ([\d.]+)$/)?.[1]);
            }
            else if (retryAfter.match(/^((\d+)|(\d+\.\d+))$/)) {
                retryAfterSeconds = Number(retryAfter);
            }
            else if (Date.parse(retryAfter) >= Date.now()) {
                retryAfterSeconds = (Date.parse(retryAfter) - Date.now()) / 1000;
            }
            if (isNaN(retryAfterSeconds)) {
                return;
            }
            return new Date(Date.now() + retryAfterSeconds * 1000);
        }
        else if (h === "x-amz-retry-after") {
            const v = response.headers[header];
            const backoffMilliseconds = Number(v);
            if (isNaN(backoffMilliseconds)) {
                logger?.trace?.(`Failed to parse x-amz-retry-after=${v}`);
                return;
            }
            return new Date(Date.now() + backoffMilliseconds);
        }
    }
}
function getRetryAfterHint(response, logger) {
    return parseRetryAfterHeader(response, logger);
}

const asSdkError = (error) => {
    if (error instanceof Error)
        return error;
    if (error instanceof Object)
        return Object.assign(new Error(), error);
    if (typeof error === "string")
        return new Error(error);
    return new Error(`AWS SDK error wrapper for ${error}`);
};

function bindRetryMiddleware(isStreamingPayload) {
    return (options) => (next, context) => async (args) => {
        let retryStrategy = await options.retryStrategy();
        const maxAttempts = await options.maxAttempts();
        if (isRetryStrategyV2(retryStrategy)) {
            retryStrategy = retryStrategy;
            let retryToken = await retryStrategy.acquireInitialRetryToken((context["partition_id"] ?? "") + (context.__retryLongPoll ? ":longpoll" : ""));
            let lastError = new Error();
            let attempts = 0;
            let totalRetryDelay = 0;
            const { request } = args;
            const isRequest = protocols.HttpRequest.isInstance(request);
            if (isRequest) {
                request.headers[INVOCATION_ID_HEADER] = serde.v4();
            }
            while (true) {
                try {
                    if (isRequest) {
                        request.headers[REQUEST_HEADER] = `attempt=${attempts + 1}; max=${maxAttempts}`;
                    }
                    const { response, output } = await next(args);
                    retryStrategy.recordSuccess(retryToken);
                    output.$metadata.attempts = attempts + 1;
                    output.$metadata.totalRetryDelay = totalRetryDelay;
                    return { response, output };
                }
                catch (e) {
                    const retryErrorInfo = getRetryErrorInfo(e, options.logger);
                    lastError = asSdkError(e);
                    if (isRequest && isStreamingPayload(request)) {
                        (context.logger instanceof client.NoOpLogger ? console : context.logger)?.warn("An error was encountered in a non-retryable streaming request.");
                        throw lastError;
                    }
                    try {
                        retryToken = await retryStrategy.refreshRetryTokenForRetry(retryToken, retryErrorInfo);
                    }
                    catch (refreshError) {
                        if (typeof refreshError.$backoff === "number") {
                            await cooldown(refreshError.$backoff);
                        }
                        if (!lastError.$metadata) {
                            lastError.$metadata = {};
                        }
                        lastError.$metadata.attempts = attempts + 1;
                        lastError.$metadata.totalRetryDelay = totalRetryDelay;
                        throw lastError;
                    }
                    attempts = retryToken.getRetryCount();
                    const delay = retryToken.getRetryDelay();
                    totalRetryDelay += delay;
                    await cooldown(delay);
                }
            }
        }
        else {
            retryStrategy = retryStrategy;
            if (retryStrategy?.mode) {
                context.userAgent = [...(context.userAgent || []), ["cfg/retry-mode", retryStrategy.mode]];
            }
            return retryStrategy.retry(next, args);
        }
    };
}
const cooldown = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isRetryStrategyV2 = (retryStrategy) => typeof retryStrategy.acquireInitialRetryToken !== "undefined" &&
    typeof retryStrategy.refreshRetryTokenForRetry !== "undefined" &&
    typeof retryStrategy.recordSuccess !== "undefined";
const getRetryErrorInfo = (error, logger) => {
    const errorInfo = {
        error,
        errorType: getRetryErrorType(error),
    };
    const retryAfterHint = parseRetryAfterHeader(error.$response, logger);
    if (retryAfterHint) {
        errorInfo.retryAfterHint = retryAfterHint;
    }
    return errorInfo;
};
const getRetryErrorType = (error) => {
    if (isThrottlingError(error))
        return "THROTTLING";
    if (isTransientError(error))
        return "TRANSIENT";
    if (isServerError(error))
        return "SERVER_ERROR";
    return "CLIENT_ERROR";
};
const retryMiddlewareOptions = {
    name: "retryMiddleware",
    tags: ["RETRY"],
    step: "finalizeRequest",
    priority: "high",
    override: true,
};
function bindGetRetryPlugin(isStreamingPayload) {
    const retryMiddleware = bindRetryMiddleware(isStreamingPayload);
    return (options) => ({
        applyToStack: (clientStack) => {
            clientStack.add(retryMiddleware(options), retryMiddlewareOptions);
        },
    });
}

class DefaultRateLimiter {
    static setTimeoutFn = setTimeout;
    beta;
    minCapacity;
    minFillRate;
    scaleConstant;
    smooth;
    enabled = false;
    availableTokens = 0;
    lastMaxRate = 0;
    measuredTxRate = 0;
    requestCount = 0;
    fillRate;
    lastThrottleTime;
    lastTimestamp = 0;
    lastTxRateBucket;
    maxCapacity;
    timeWindow = 0;
    constructor(options) {
        this.beta = options?.beta ?? 0.7;
        this.minCapacity = options?.minCapacity ?? 1;
        this.minFillRate = options?.minFillRate ?? 0.5;
        this.scaleConstant = options?.scaleConstant ?? 0.4;
        this.smooth = options?.smooth ?? 0.8;
        this.lastThrottleTime = this.getCurrentTimeInSeconds();
        this.lastTxRateBucket = Math.floor(this.getCurrentTimeInSeconds());
        this.fillRate = this.minFillRate;
        this.maxCapacity = this.minCapacity;
    }
    async getSendToken() {
        return this.acquireTokenBucket(1);
    }
    updateClientSendingRate(response) {
        let calculatedRate;
        this.updateMeasuredRate();
        const retryErrorInfo = response;
        const isThrottling = retryErrorInfo?.errorType === "THROTTLING" || isThrottlingError(retryErrorInfo?.error ?? response);
        if (isThrottling) {
            const rateToUse = !this.enabled ? this.measuredTxRate : Math.min(this.measuredTxRate, this.fillRate);
            this.lastMaxRate = rateToUse;
            this.calculateTimeWindow();
            this.lastThrottleTime = this.getCurrentTimeInSeconds();
            calculatedRate = this.cubicThrottle(rateToUse);
            this.enableTokenBucket();
        }
        else {
            this.calculateTimeWindow();
            calculatedRate = this.cubicSuccess(this.getCurrentTimeInSeconds());
        }
        const newRate = Math.min(calculatedRate, 2 * this.measuredTxRate);
        this.updateTokenBucketRate(newRate);
    }
    getCurrentTimeInSeconds() {
        return Date.now() / 1000;
    }
    async acquireTokenBucket(amount) {
        if (!this.enabled) {
            return;
        }
        this.refillTokenBucket();
        while (amount > this.availableTokens) {
            const delay = ((amount - this.availableTokens) / this.fillRate) * 1000;
            await new Promise((resolve) => DefaultRateLimiter.setTimeoutFn(resolve, delay));
            this.refillTokenBucket();
        }
        this.availableTokens = this.availableTokens - amount;
    }
    refillTokenBucket() {
        const timestamp = this.getCurrentTimeInSeconds();
        if (!this.lastTimestamp) {
            this.lastTimestamp = timestamp;
            return;
        }
        const fillAmount = (timestamp - this.lastTimestamp) * this.fillRate;
        this.availableTokens = Math.min(this.maxCapacity, this.availableTokens + fillAmount);
        this.lastTimestamp = timestamp;
    }
    calculateTimeWindow() {
        this.timeWindow = this.getPrecise(Math.pow((this.lastMaxRate * (1 - this.beta)) / this.scaleConstant, 1 / 3));
    }
    cubicThrottle(rateToUse) {
        return this.getPrecise(rateToUse * this.beta);
    }
    cubicSuccess(timestamp) {
        return this.getPrecise(this.scaleConstant * Math.pow(timestamp - this.lastThrottleTime - this.timeWindow, 3) + this.lastMaxRate);
    }
    enableTokenBucket() {
        this.enabled = true;
    }
    updateTokenBucketRate(newRate) {
        this.refillTokenBucket();
        this.fillRate = Math.max(newRate, this.minFillRate);
        this.maxCapacity = Math.max(newRate, this.minCapacity);
        this.availableTokens = Math.min(this.availableTokens, this.maxCapacity);
    }
    updateMeasuredRate() {
        const t = this.getCurrentTimeInSeconds();
        const timeBucket = Math.floor(t * 2) / 2;
        this.requestCount++;
        if (timeBucket > this.lastTxRateBucket) {
            const currentRate = this.requestCount / (timeBucket - this.lastTxRateBucket);
            this.measuredTxRate = this.getPrecise(currentRate * this.smooth + this.measuredTxRate * (1 - this.smooth));
            this.requestCount = 0;
            this.lastTxRateBucket = timeBucket;
        }
    }
    getPrecise(num) {
        return parseFloat(num.toFixed(8));
    }
}

class Retry {
    static v2026 = typeof process !== "undefined" && process.env?.SMITHY_NEW_RETRIES_2026 === "true";
    static delay() {
        return Retry.v2026 ? 50 : 100;
    }
    static throttlingDelay() {
        return Retry.v2026 ? 1_000 : 500;
    }
    static cost() {
        return Retry.v2026 ? 14 : 5;
    }
    static throttlingCost() {
        return Retry.v2026 ? 5 : 10;
    }
    static modifiedCostType() {
        return Retry.v2026 ? "THROTTLING" : "TRANSIENT";
    }
}

class DefaultRetryBackoffStrategy {
    x = Retry.delay();
    computeNextBackoffDelay(i) {
        const b = Math.random();
        const r = 2;
        const t_i = b * Math.min(this.x * r ** i, MAXIMUM_RETRY_DELAY);
        return Math.floor(t_i);
    }
    setDelayBase(delay) {
        this.x = delay;
    }
}

class DefaultRetryToken {
    delay;
    count;
    cost;
    longPoll;
    constructor(delay, count, cost, longPoll) {
        this.delay = delay;
        this.count = count;
        this.cost = cost;
        this.longPoll = longPoll;
    }
    getRetryCount() {
        return this.count;
    }
    getRetryDelay() {
        return Math.min(MAXIMUM_RETRY_DELAY, this.delay);
    }
    getRetryCost() {
        return this.cost;
    }
    isLongPoll() {
        return this.longPoll;
    }
}

exports.RETRY_MODES = void 0;
(function (RETRY_MODES) {
    RETRY_MODES["STANDARD"] = "standard";
    RETRY_MODES["ADAPTIVE"] = "adaptive";
})(exports.RETRY_MODES || (exports.RETRY_MODES = {}));
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_MODE = exports.RETRY_MODES.STANDARD;

const refusal = {
    incompatible: 1,
    attempts: 2,
    capacity: 3,
};
let StandardRetryStrategy$1 = class StandardRetryStrategy {
    mode = exports.RETRY_MODES.STANDARD;
    capacity = INITIAL_RETRY_TOKENS;
    retryBackoffStrategy;
    maxAttemptsProvider;
    baseDelay;
    constructor(arg1) {
        if (typeof arg1 === "number") {
            this.maxAttemptsProvider = async () => arg1;
        }
        else if (typeof arg1 === "function") {
            this.maxAttemptsProvider = arg1;
        }
        else if (arg1 && typeof arg1 === "object") {
            this.maxAttemptsProvider = async () => arg1.maxAttempts;
            this.baseDelay = arg1.baseDelay;
            this.retryBackoffStrategy = arg1.backoff;
        }
        this.maxAttemptsProvider ??= async () => DEFAULT_MAX_ATTEMPTS;
        this.baseDelay ??= Retry.delay();
        this.retryBackoffStrategy ??= new DefaultRetryBackoffStrategy();
    }
    async acquireInitialRetryToken(retryTokenScope) {
        return new DefaultRetryToken(Retry.delay(), 0, undefined, Retry.v2026 && retryTokenScope.includes(":longpoll"));
    }
    async refreshRetryTokenForRetry(token, errorInfo) {
        const maxAttempts = await this.getMaxAttempts();
        const retryCode = this.retryCode(token, errorInfo, maxAttempts);
        const shouldRetry = retryCode === 0;
        const isLongPoll = token.isLongPoll?.();
        if (shouldRetry || isLongPoll) {
            const errorType = errorInfo.errorType;
            this.retryBackoffStrategy.setDelayBase(errorType === "THROTTLING" ? Retry.throttlingDelay() : this.baseDelay);
            const delayFromErrorType = this.retryBackoffStrategy.computeNextBackoffDelay(token.getRetryCount());
            let retryDelay = delayFromErrorType;
            if (errorInfo.retryAfterHint instanceof Date) {
                retryDelay = Math.max(delayFromErrorType, Math.min(errorInfo.retryAfterHint.getTime() - Date.now(), delayFromErrorType + 5_000));
            }
            if (!shouldRetry) {
                throw Object.assign(new Error("No retry token available"), {
                    $backoff: Retry.v2026 && retryCode === refusal.capacity && isLongPoll ? retryDelay : 0,
                });
            }
            else {
                const capacityCost = this.getCapacityCost(errorType);
                this.capacity -= capacityCost;
                return new DefaultRetryToken(retryDelay, token.getRetryCount() + 1, capacityCost, token.isLongPoll?.() ?? false);
            }
        }
        throw new Error("No retry token available");
    }
    recordSuccess(token) {
        this.capacity = Math.min(INITIAL_RETRY_TOKENS, this.capacity + (token.getRetryCost() ?? NO_RETRY_INCREMENT));
    }
    getCapacity() {
        return this.capacity;
    }
    async maxAttempts() {
        return this.maxAttemptsProvider();
    }
    async getMaxAttempts() {
        try {
            return await this.maxAttemptsProvider();
        }
        catch (error) {
            console.warn(`Max attempts provider could not resolve. Using default of ${DEFAULT_MAX_ATTEMPTS}`);
            return DEFAULT_MAX_ATTEMPTS;
        }
    }
    retryCode(tokenToRenew, errorInfo, maxAttempts) {
        const attempts = tokenToRenew.getRetryCount() + 1;
        const retryableStatus = this.isRetryableError(errorInfo.errorType) ? 0 : refusal.incompatible;
        const attemptStatus = attempts < maxAttempts ? 0 : refusal.attempts;
        const capacityStatus = this.capacity >= this.getCapacityCost(errorInfo.errorType) ? 0 : refusal.capacity;
        return retryableStatus || attemptStatus || capacityStatus;
    }
    getCapacityCost(errorType) {
        return errorType === Retry.modifiedCostType() ? Retry.throttlingCost() : Retry.cost();
    }
    isRetryableError(errorType) {
        return errorType === "THROTTLING" || errorType === "TRANSIENT";
    }
};

let AdaptiveRetryStrategy$1 = class AdaptiveRetryStrategy {
    mode = exports.RETRY_MODES.ADAPTIVE;
    rateLimiter;
    standardRetryStrategy;
    constructor(maxAttemptsProvider, options) {
        const { rateLimiter } = options ?? {};
        this.rateLimiter = rateLimiter ?? new DefaultRateLimiter();
        this.standardRetryStrategy = options
            ? new StandardRetryStrategy$1({
                maxAttempts: typeof maxAttemptsProvider === "number" ? maxAttemptsProvider : 3,
                ...options,
            })
            : new StandardRetryStrategy$1(maxAttemptsProvider);
    }
    async acquireInitialRetryToken(retryTokenScope) {
        const token = await this.standardRetryStrategy.acquireInitialRetryToken(retryTokenScope);
        await this.rateLimiter.getSendToken();
        return token;
    }
    async refreshRetryTokenForRetry(tokenToRenew, errorInfo) {
        this.rateLimiter.updateClientSendingRate(errorInfo);
        const token = await this.standardRetryStrategy.refreshRetryTokenForRetry(tokenToRenew, errorInfo);
        await this.rateLimiter.getSendToken();
        return token;
    }
    recordSuccess(token) {
        this.rateLimiter.updateClientSendingRate({});
        this.standardRetryStrategy.recordSuccess(token);
    }
    async maxAttemptsProvider() {
        return this.standardRetryStrategy.maxAttempts();
    }
};

class ConfiguredRetryStrategy extends StandardRetryStrategy$1 {
    computeNextBackoffDelay;
    constructor(maxAttempts, computeNextBackoffDelay = Retry.delay()) {
        super(typeof maxAttempts === "function" ? maxAttempts : async () => maxAttempts);
        if (typeof computeNextBackoffDelay === "number") {
            this.computeNextBackoffDelay = () => computeNextBackoffDelay;
        }
        else {
            this.computeNextBackoffDelay = computeNextBackoffDelay;
        }
    }
    async refreshRetryTokenForRetry(tokenToRenew, errorInfo) {
        const token = await super.refreshRetryTokenForRetry(tokenToRenew, errorInfo);
        token.getRetryDelay = () => this.computeNextBackoffDelay(token.getRetryCount());
        return token;
    }
}

const getDefaultRetryQuota = (initialRetryTokens, options) => {
    const MAX_CAPACITY = initialRetryTokens;
    const noRetryIncrement = NO_RETRY_INCREMENT;
    const retryCost = RETRY_COST;
    const timeoutRetryCost = TIMEOUT_RETRY_COST;
    let availableCapacity = initialRetryTokens;
    const getCapacityAmount = (error) => (error.name === "TimeoutError" ? timeoutRetryCost : retryCost);
    const hasRetryTokens = (error) => getCapacityAmount(error) <= availableCapacity;
    const retrieveRetryTokens = (error) => {
        if (!hasRetryTokens(error)) {
            throw new Error("No retry token available");
        }
        const capacityAmount = getCapacityAmount(error);
        availableCapacity -= capacityAmount;
        return capacityAmount;
    };
    const releaseRetryTokens = (capacityReleaseAmount) => {
        availableCapacity += capacityReleaseAmount ?? noRetryIncrement;
        availableCapacity = Math.min(availableCapacity, MAX_CAPACITY);
    };
    return Object.freeze({
        hasRetryTokens,
        retrieveRetryTokens,
        releaseRetryTokens,
    });
};

const defaultDelayDecider = (delayBase, attempts) => Math.floor(Math.min(MAXIMUM_RETRY_DELAY, Math.random() * 2 ** attempts * delayBase));

const defaultRetryDecider = (error) => {
    if (!error) {
        return false;
    }
    return isRetryableByTrait(error) || isClockSkewError(error) || isThrottlingError(error) || isTransientError(error);
};

class StandardRetryStrategy {
    maxAttemptsProvider;
    retryDecider;
    delayDecider;
    retryQuota;
    mode = exports.RETRY_MODES.STANDARD;
    constructor(maxAttemptsProvider, options) {
        this.maxAttemptsProvider = maxAttemptsProvider;
        this.retryDecider = options?.retryDecider ?? defaultRetryDecider;
        this.delayDecider = options?.delayDecider ?? defaultDelayDecider;
        this.retryQuota = options?.retryQuota ?? getDefaultRetryQuota(INITIAL_RETRY_TOKENS);
    }
    shouldRetry(error, attempts, maxAttempts) {
        return attempts < maxAttempts && this.retryDecider(error) && this.retryQuota.hasRetryTokens(error);
    }
    async getMaxAttempts() {
        let maxAttempts;
        try {
            maxAttempts = await this.maxAttemptsProvider();
        }
        catch (error) {
            maxAttempts = DEFAULT_MAX_ATTEMPTS;
        }
        return maxAttempts;
    }
    async retry(next, args, options) {
        let retryTokenAmount;
        let attempts = 0;
        let totalDelay = 0;
        const maxAttempts = await this.getMaxAttempts();
        const { request } = args;
        if (protocols.HttpRequest.isInstance(request)) {
            request.headers[INVOCATION_ID_HEADER] = serde.v4();
        }
        while (true) {
            try {
                if (protocols.HttpRequest.isInstance(request)) {
                    request.headers[REQUEST_HEADER] = `attempt=${attempts + 1}; max=${maxAttempts}`;
                }
                if (options?.beforeRequest) {
                    await options.beforeRequest();
                }
                const { response, output } = await next(args);
                if (options?.afterRequest) {
                    options.afterRequest(response);
                }
                this.retryQuota.releaseRetryTokens(retryTokenAmount);
                output.$metadata.attempts = attempts + 1;
                output.$metadata.totalRetryDelay = totalDelay;
                return { response, output };
            }
            catch (e) {
                const err = asSdkError(e);
                attempts++;
                if (this.shouldRetry(err, attempts, maxAttempts)) {
                    retryTokenAmount = this.retryQuota.retrieveRetryTokens(err);
                    const delayFromDecider = this.delayDecider(isThrottlingError(err) ? THROTTLING_RETRY_DELAY_BASE : DEFAULT_RETRY_DELAY_BASE, attempts);
                    const delayFromResponse = getDelayFromRetryAfterHeader(err.$response);
                    const delay = Math.max(delayFromResponse || 0, delayFromDecider);
                    totalDelay += delay;
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    continue;
                }
                if (!err.$metadata) {
                    err.$metadata = {};
                }
                err.$metadata.attempts = attempts;
                err.$metadata.totalRetryDelay = totalDelay;
                throw err;
            }
        }
    }
}
const getDelayFromRetryAfterHeader = (response) => {
    if (!protocols.HttpResponse.isInstance(response))
        return;
    const retryAfterHeaderName = Object.keys(response.headers).find((key) => key.toLowerCase() === "retry-after");
    if (!retryAfterHeaderName)
        return;
    const retryAfter = response.headers[retryAfterHeaderName];
    const retryAfterSeconds = Number(retryAfter);
    if (!Number.isNaN(retryAfterSeconds))
        return retryAfterSeconds * 1000;
    const retryAfterDate = new Date(retryAfter);
    return retryAfterDate.getTime() - Date.now();
};

class AdaptiveRetryStrategy extends StandardRetryStrategy {
    rateLimiter;
    constructor(maxAttemptsProvider, options) {
        const { rateLimiter, ...superOptions } = options ?? {};
        super(maxAttemptsProvider, superOptions);
        this.rateLimiter = rateLimiter ?? new DefaultRateLimiter();
        this.mode = exports.RETRY_MODES.ADAPTIVE;
    }
    async retry(next, args) {
        return super.retry(next, args, {
            beforeRequest: async () => {
                return this.rateLimiter.getSendToken();
            },
            afterRequest: (response) => {
                this.rateLimiter.updateClientSendingRate(response);
            },
        });
    }
}

const ENV_MAX_ATTEMPTS = "AWS_MAX_ATTEMPTS";
const CONFIG_MAX_ATTEMPTS = "max_attempts";
const NODE_MAX_ATTEMPT_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => {
        const value = env[ENV_MAX_ATTEMPTS];
        if (!value)
            return undefined;
        const maxAttempt = parseInt(value);
        if (Number.isNaN(maxAttempt)) {
            throw new Error(`Environment variable ${ENV_MAX_ATTEMPTS} mast be a number, got "${value}"`);
        }
        return maxAttempt;
    },
    configFileSelector: (profile) => {
        const value = profile[CONFIG_MAX_ATTEMPTS];
        if (!value)
            return undefined;
        const maxAttempt = parseInt(value);
        if (Number.isNaN(maxAttempt)) {
            throw new Error(`Shared config file entry ${CONFIG_MAX_ATTEMPTS} mast be a number, got "${value}"`);
        }
        return maxAttempt;
    },
    default: DEFAULT_MAX_ATTEMPTS,
};
const resolveRetryConfig = (input) => {
    const { retryStrategy, retryMode } = input;
    const maxAttempts = client.normalizeProvider(input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
    let controller = retryStrategy
        ? Promise.resolve(retryStrategy)
        : undefined;
    const getDefault = async () => (await client.normalizeProvider(retryMode)()) === exports.RETRY_MODES.ADAPTIVE
        ? new AdaptiveRetryStrategy$1(maxAttempts)
        : new StandardRetryStrategy$1(maxAttempts);
    return Object.assign(input, {
        maxAttempts,
        retryStrategy: () => (controller ??= getDefault()),
    });
};
const ENV_RETRY_MODE = "AWS_RETRY_MODE";
const CONFIG_RETRY_MODE = "retry_mode";
const NODE_RETRY_MODE_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => env[ENV_RETRY_MODE],
    configFileSelector: (profile) => profile[CONFIG_RETRY_MODE],
    default: DEFAULT_RETRY_MODE,
};

const omitRetryHeadersMiddleware = () => (next) => async (args) => {
    const { request } = args;
    if (protocols.HttpRequest.isInstance(request)) {
        delete request.headers[INVOCATION_ID_HEADER];
        delete request.headers[REQUEST_HEADER];
    }
    return next(args);
};
const omitRetryHeadersMiddlewareOptions = {
    name: "omitRetryHeadersMiddleware",
    tags: ["RETRY", "HEADERS", "OMIT_RETRY_HEADERS"],
    relation: "before",
    toMiddleware: "awsAuthMiddleware",
    override: true,
};
const getOmitRetryHeadersPlugin = (options) => ({
    applyToStack: (clientStack) => {
        clientStack.addRelativeTo(omitRetryHeadersMiddleware(), omitRetryHeadersMiddlewareOptions);
    },
});

const retryMiddleware = bindRetryMiddleware(isStreamingPayload);
const getRetryPlugin = bindGetRetryPlugin(isStreamingPayload);

exports.AdaptiveRetryStrategy = AdaptiveRetryStrategy$1;
exports.CONFIG_MAX_ATTEMPTS = CONFIG_MAX_ATTEMPTS;
exports.CONFIG_RETRY_MODE = CONFIG_RETRY_MODE;
exports.ConfiguredRetryStrategy = ConfiguredRetryStrategy;
exports.DEFAULT_MAX_ATTEMPTS = DEFAULT_MAX_ATTEMPTS;
exports.DEFAULT_RETRY_DELAY_BASE = DEFAULT_RETRY_DELAY_BASE;
exports.DEFAULT_RETRY_MODE = DEFAULT_RETRY_MODE;
exports.DefaultRateLimiter = DefaultRateLimiter;
exports.DeprecatedAdaptiveRetryStrategy = AdaptiveRetryStrategy;
exports.DeprecatedStandardRetryStrategy = StandardRetryStrategy;
exports.ENV_MAX_ATTEMPTS = ENV_MAX_ATTEMPTS;
exports.ENV_RETRY_MODE = ENV_RETRY_MODE;
exports.INITIAL_RETRY_TOKENS = INITIAL_RETRY_TOKENS;
exports.INVOCATION_ID_HEADER = INVOCATION_ID_HEADER;
exports.MAXIMUM_RETRY_DELAY = MAXIMUM_RETRY_DELAY;
exports.NODE_MAX_ATTEMPT_CONFIG_OPTIONS = NODE_MAX_ATTEMPT_CONFIG_OPTIONS;
exports.NODE_RETRY_MODE_CONFIG_OPTIONS = NODE_RETRY_MODE_CONFIG_OPTIONS;
exports.NO_RETRY_INCREMENT = NO_RETRY_INCREMENT;
exports.REQUEST_HEADER = REQUEST_HEADER;
exports.RETRY_COST = RETRY_COST;
exports.Retry = Retry;
exports.StandardRetryStrategy = StandardRetryStrategy$1;
exports.THROTTLING_RETRY_DELAY_BASE = THROTTLING_RETRY_DELAY_BASE;
exports.TIMEOUT_RETRY_COST = TIMEOUT_RETRY_COST;
exports.defaultDelayDecider = defaultDelayDecider;
exports.defaultRetryDecider = defaultRetryDecider;
exports.getOmitRetryHeadersPlugin = getOmitRetryHeadersPlugin;
exports.getRetryAfterHint = getRetryAfterHint;
exports.getRetryPlugin = getRetryPlugin;
exports.isBrowserNetworkError = isBrowserNetworkError;
exports.isClockSkewCorrectedError = isClockSkewCorrectedError;
exports.isClockSkewError = isClockSkewError;
exports.isNodeJsHttp2TransientError = isNodeJsHttp2TransientError;
exports.isRetryableByTrait = isRetryableByTrait;
exports.isServerError = isServerError;
exports.isThrottlingError = isThrottlingError;
exports.isTransientError = isTransientError;
exports.omitRetryHeadersMiddleware = omitRetryHeadersMiddleware;
exports.omitRetryHeadersMiddlewareOptions = omitRetryHeadersMiddlewareOptions;
exports.resolveRetryConfig = resolveRetryConfig;
exports.retryMiddleware = retryMiddleware;
exports.retryMiddlewareOptions = retryMiddlewareOptions;


/***/ }),

/***/ 95258:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var client = __webpack_require__(63234);
var protocols = __webpack_require__(45598);
var endpoints = __webpack_require__(86773);

const deref = (schemaRef) => {
    if (typeof schemaRef === "function") {
        return schemaRef();
    }
    return schemaRef;
};

const operation = (namespace, name, traits, input, output) => ({
    name,
    namespace,
    traits,
    input,
    output,
});

const schemaDeserializationMiddleware = (config) => (next, context) => async (args) => {
    const { response } = await next(args);
    const { operationSchema } = client.getSmithyContext(context);
    const [, ns, n, t, i, o] = operationSchema ?? [];
    try {
        const parsed = await config.protocol.deserializeResponse(operation(ns, n, t, i, o), {
            ...config,
            ...context,
        }, response);
        return {
            response,
            output: parsed,
        };
    }
    catch (error) {
        Object.defineProperty(error, "$response", {
            value: response,
            enumerable: false,
            writable: false,
            configurable: false,
        });
        if (!("$metadata" in error)) {
            const hint = `Deserialization error: to see the raw response, inspect the hidden field {error}.$response on this object.`;
            try {
                error.message += "\n  " + hint;
            }
            catch (e) {
                if (!context.logger || context.logger?.constructor?.name === "NoOpLogger") {
                    console.warn(hint);
                }
                else {
                    context.logger?.warn?.(hint);
                }
            }
            if (typeof error.$responseBodyText !== "undefined") {
                if (error.$response) {
                    error.$response.body = error.$responseBodyText;
                }
            }
            try {
                if (protocols.HttpResponse.isInstance(response)) {
                    const { headers = {} } = response;
                    const headerEntries = Object.entries(headers);
                    error.$metadata = {
                        httpStatusCode: response.statusCode,
                        requestId: findHeader(/^x-[\w-]+-request-?id$/, headerEntries),
                        extendedRequestId: findHeader(/^x-[\w-]+-id-2$/, headerEntries),
                        cfId: findHeader(/^x-[\w-]+-cf-id$/, headerEntries),
                    };
                }
            }
            catch (e) {
            }
        }
        throw error;
    }
};
const findHeader = (pattern, headers) => {
    return (headers.find(([k]) => {
        return k.match(pattern);
    }) || [void 0, void 0])[1];
};

const schemaSerializationMiddleware = (config) => (next, context) => async (args) => {
    const { operationSchema } = client.getSmithyContext(context);
    const [, ns, n, t, i, o] = operationSchema ?? [];
    const endpoint = context.endpointV2
        ? async () => endpoints.toEndpointV1(context.endpointV2)
        : config.endpoint;
    const request = await config.protocol.serializeRequest(operation(ns, n, t, i, o), args.input, {
        ...config,
        ...context,
        endpoint,
    });
    return next({
        ...args,
        request,
    });
};

const deserializerMiddlewareOption = {
    name: "deserializerMiddleware",
    step: "deserialize",
    tags: ["DESERIALIZER"],
    override: true,
};
const serializerMiddlewareOption = {
    name: "serializerMiddleware",
    step: "serialize",
    tags: ["SERIALIZER"],
    override: true,
};
function getSchemaSerdePlugin(config) {
    return {
        applyToStack: (commandStack) => {
            commandStack.add(schemaSerializationMiddleware(config), serializerMiddlewareOption);
            commandStack.add(schemaDeserializationMiddleware(config), deserializerMiddlewareOption);
            config.protocol.setSerdeContext(config);
        },
    };
}

class Schema {
    name;
    namespace;
    traits;
    static assign(instance, values) {
        const schema = Object.assign(instance, values);
        return schema;
    }
    static [Symbol.hasInstance](lhs) {
        const isPrototype = this.prototype.isPrototypeOf(lhs);
        if (!isPrototype && typeof lhs === "object" && lhs !== null) {
            const list = lhs;
            return list.symbol === this.symbol;
        }
        return isPrototype;
    }
    getName() {
        return this.namespace + "#" + this.name;
    }
}

class ListSchema extends Schema {
    static symbol = Symbol.for("@smithy/lis");
    name;
    traits;
    valueSchema;
    symbol = ListSchema.symbol;
}
const list = (namespace, name, traits, valueSchema) => Schema.assign(new ListSchema(), {
    name,
    namespace,
    traits,
    valueSchema,
});

class MapSchema extends Schema {
    static symbol = Symbol.for("@smithy/map");
    name;
    traits;
    keySchema;
    valueSchema;
    symbol = MapSchema.symbol;
}
const map = (namespace, name, traits, keySchema, valueSchema) => Schema.assign(new MapSchema(), {
    name,
    namespace,
    traits,
    keySchema,
    valueSchema,
});

class OperationSchema extends Schema {
    static symbol = Symbol.for("@smithy/ope");
    name;
    traits;
    input;
    output;
    symbol = OperationSchema.symbol;
}
const op = (namespace, name, traits, input, output) => Schema.assign(new OperationSchema(), {
    name,
    namespace,
    traits,
    input,
    output,
});

class StructureSchema extends Schema {
    static symbol = Symbol.for("@smithy/str");
    name;
    traits;
    memberNames;
    memberList;
    symbol = StructureSchema.symbol;
}
const struct = (namespace, name, traits, memberNames, memberList) => Schema.assign(new StructureSchema(), {
    name,
    namespace,
    traits,
    memberNames,
    memberList,
});

class ErrorSchema extends StructureSchema {
    static symbol = Symbol.for("@smithy/err");
    ctor;
    symbol = ErrorSchema.symbol;
}
const error = (namespace, name, traits, memberNames, memberList, ctor) => Schema.assign(new ErrorSchema(), {
    name,
    namespace,
    traits,
    memberNames,
    memberList,
    ctor: null,
});

const traitsCache = [];
function translateTraits(indicator) {
    if (typeof indicator === "object") {
        return indicator;
    }
    indicator = indicator | 0;
    if (traitsCache[indicator]) {
        return traitsCache[indicator];
    }
    const traits = {};
    let i = 0;
    for (const trait of [
        "httpLabel",
        "idempotent",
        "idempotencyToken",
        "sensitive",
        "httpPayload",
        "httpResponseCode",
        "httpQueryParams",
    ]) {
        if (((indicator >> i++) & 1) === 1) {
            traits[trait] = 1;
        }
    }
    return (traitsCache[indicator] = traits);
}

const anno = {
    it: Symbol.for("@smithy/nor-struct-it"),
    ns: Symbol.for("@smithy/ns"),
};
const simpleSchemaCacheN = [];
const simpleSchemaCacheS = {};
class NormalizedSchema {
    ref;
    memberName;
    static symbol = Symbol.for("@smithy/nor");
    symbol = NormalizedSchema.symbol;
    name;
    schema;
    _isMemberSchema;
    traits;
    memberTraits;
    normalizedTraits;
    constructor(ref, memberName) {
        this.ref = ref;
        this.memberName = memberName;
        const traitStack = [];
        let _ref = ref;
        let schema = ref;
        this._isMemberSchema = false;
        while (isMemberSchema(_ref)) {
            traitStack.push(_ref[1]);
            _ref = _ref[0];
            schema = deref(_ref);
            this._isMemberSchema = true;
        }
        if (traitStack.length > 0) {
            this.memberTraits = {};
            for (let i = traitStack.length - 1; i >= 0; --i) {
                const traitSet = traitStack[i];
                Object.assign(this.memberTraits, translateTraits(traitSet));
            }
        }
        else {
            this.memberTraits = 0;
        }
        if (schema instanceof NormalizedSchema) {
            const computedMemberTraits = this.memberTraits;
            Object.assign(this, schema);
            this.memberTraits = Object.assign({}, computedMemberTraits, schema.getMemberTraits(), this.getMemberTraits());
            this.normalizedTraits = void 0;
            this.memberName = memberName ?? schema.memberName;
            return;
        }
        this.schema = deref(schema);
        if (isStaticSchema(this.schema)) {
            this.name = `${this.schema[1]}#${this.schema[2]}`;
            this.traits = this.schema[3];
        }
        else {
            this.name = this.memberName ?? String(schema);
            this.traits = 0;
        }
        if (this._isMemberSchema && !memberName) {
            throw new Error(`@smithy/core/schema - NormalizedSchema member init ${this.getName(true)} missing member name.`);
        }
    }
    static [Symbol.hasInstance](lhs) {
        const isPrototype = this.prototype.isPrototypeOf(lhs);
        if (!isPrototype && typeof lhs === "object" && lhs !== null) {
            const ns = lhs;
            return ns.symbol === this.symbol;
        }
        return isPrototype;
    }
    static of(ref) {
        const keyAble = typeof ref === "function" || (typeof ref === "object" && ref !== null);
        if (typeof ref === "number") {
            if (simpleSchemaCacheN[ref]) {
                return simpleSchemaCacheN[ref];
            }
        }
        else if (typeof ref === "string") {
            if (simpleSchemaCacheS[ref]) {
                return simpleSchemaCacheS[ref];
            }
        }
        else if (keyAble) {
            if (ref[anno.ns]) {
                return ref[anno.ns];
            }
        }
        const sc = deref(ref);
        if (sc instanceof NormalizedSchema) {
            return sc;
        }
        if (isMemberSchema(sc)) {
            const [ns, traits] = sc;
            if (ns instanceof NormalizedSchema) {
                Object.assign(ns.getMergedTraits(), translateTraits(traits));
                return ns;
            }
            throw new Error(`@smithy/core/schema - may not init unwrapped member schema=${JSON.stringify(ref, null, 2)}.`);
        }
        const ns = new NormalizedSchema(sc);
        if (keyAble) {
            return (ref[anno.ns] = ns);
        }
        if (typeof sc === "string") {
            return (simpleSchemaCacheS[sc] = ns);
        }
        if (typeof sc === "number") {
            return (simpleSchemaCacheN[sc] = ns);
        }
        return ns;
    }
    getSchema() {
        const sc = this.schema;
        if (Array.isArray(sc) && sc[0] === 0) {
            return sc[4];
        }
        return sc;
    }
    getName(withNamespace = false) {
        const { name } = this;
        const short = !withNamespace && name && name.includes("#");
        return short ? name.split("#")[1] : name || undefined;
    }
    getMemberName() {
        return this.memberName;
    }
    isMemberSchema() {
        return this._isMemberSchema;
    }
    isListSchema() {
        const sc = this.getSchema();
        return typeof sc === "number"
            ? sc >= 64 && sc < 128
            : sc[0] === 1;
    }
    isMapSchema() {
        const sc = this.getSchema();
        return typeof sc === "number"
            ? sc >= 128 && sc <= 0b1111_1111
            : sc[0] === 2;
    }
    isStructSchema() {
        const sc = this.getSchema();
        if (typeof sc !== "object") {
            return false;
        }
        const id = sc[0];
        return (id === 3 ||
            id === -3 ||
            id === 4);
    }
    isUnionSchema() {
        const sc = this.getSchema();
        if (typeof sc !== "object") {
            return false;
        }
        return sc[0] === 4;
    }
    isBlobSchema() {
        const sc = this.getSchema();
        return sc === 21 || sc === 42;
    }
    isTimestampSchema() {
        const sc = this.getSchema();
        return (typeof sc === "number" &&
            sc >= 4 &&
            sc <= 7);
    }
    isUnitSchema() {
        return this.getSchema() === "unit";
    }
    isDocumentSchema() {
        return this.getSchema() === 15;
    }
    isStringSchema() {
        return this.getSchema() === 0;
    }
    isBooleanSchema() {
        return this.getSchema() === 2;
    }
    isNumericSchema() {
        return this.getSchema() === 1;
    }
    isBigIntegerSchema() {
        return this.getSchema() === 17;
    }
    isBigDecimalSchema() {
        return this.getSchema() === 19;
    }
    isStreaming() {
        const { streaming } = this.getMergedTraits();
        return !!streaming || this.getSchema() === 42;
    }
    isIdempotencyToken() {
        return !!this.getMergedTraits().idempotencyToken;
    }
    getMergedTraits() {
        return (this.normalizedTraits ??
            (this.normalizedTraits = {
                ...this.getOwnTraits(),
                ...this.getMemberTraits(),
            }));
    }
    getMemberTraits() {
        return translateTraits(this.memberTraits);
    }
    getOwnTraits() {
        return translateTraits(this.traits);
    }
    getKeySchema() {
        const [isDoc, isMap] = [this.isDocumentSchema(), this.isMapSchema()];
        if (!isDoc && !isMap) {
            throw new Error(`@smithy/core/schema - cannot get key for non-map: ${this.getName(true)}`);
        }
        const schema = this.getSchema();
        const memberSchema = isDoc
            ? 15
            : schema[4] ?? 0;
        return member([memberSchema, 0], "key");
    }
    getValueSchema() {
        const sc = this.getSchema();
        const [isDoc, isMap, isList] = [this.isDocumentSchema(), this.isMapSchema(), this.isListSchema()];
        const memberSchema = typeof sc === "number"
            ? 0b0011_1111 & sc
            : sc && typeof sc === "object" && (isMap || isList)
                ? sc[3 + sc[0]]
                : isDoc
                    ? 15
                    : void 0;
        if (memberSchema != null) {
            return member([memberSchema, 0], isMap ? "value" : "member");
        }
        throw new Error(`@smithy/core/schema - ${this.getName(true)} has no value member.`);
    }
    getMemberSchema(memberName) {
        const struct = this.getSchema();
        if (this.isStructSchema() && struct[4].includes(memberName)) {
            const i = struct[4].indexOf(memberName);
            const memberSchema = struct[5][i];
            return member(isMemberSchema(memberSchema) ? memberSchema : [memberSchema, 0], memberName);
        }
        if (this.isDocumentSchema()) {
            return member([15, 0], memberName);
        }
        throw new Error(`@smithy/core/schema - ${this.getName(true)} has no member=${memberName}.`);
    }
    getMemberSchemas() {
        const buffer = {};
        try {
            for (const [k, v] of this.structIterator()) {
                buffer[k] = v;
            }
        }
        catch (ignored) { }
        return buffer;
    }
    getEventStreamMember() {
        if (this.isStructSchema()) {
            for (const [memberName, memberSchema] of this.structIterator()) {
                if (memberSchema.isStreaming() && memberSchema.isStructSchema()) {
                    return memberName;
                }
            }
        }
        return "";
    }
    *structIterator() {
        if (this.isUnitSchema()) {
            return;
        }
        if (!this.isStructSchema()) {
            throw new Error("@smithy/core/schema - cannot iterate non-struct schema.");
        }
        const struct = this.getSchema();
        const z = struct[4].length;
        let it = struct[anno.it];
        if (it && z === it.length) {
            yield* it;
            return;
        }
        it = Array(z);
        for (let i = 0; i < z; ++i) {
            const k = struct[4][i];
            const v = member([struct[5][i], 0], k);
            yield (it[i] = [k, v]);
        }
        struct[anno.it] = it;
    }
}
function member(memberSchema, memberName) {
    if (memberSchema instanceof NormalizedSchema) {
        return Object.assign(memberSchema, {
            memberName,
            _isMemberSchema: true,
        });
    }
    const internalCtorAccess = NormalizedSchema;
    return new internalCtorAccess(memberSchema, memberName);
}
const isMemberSchema = (sc) => Array.isArray(sc) && sc.length === 2;
const isStaticSchema = (sc) => Array.isArray(sc) && sc.length >= 5;

class SimpleSchema extends Schema {
    static symbol = Symbol.for("@smithy/sim");
    name;
    schemaRef;
    traits;
    symbol = SimpleSchema.symbol;
}
const sim = (namespace, name, schemaRef, traits) => Schema.assign(new SimpleSchema(), {
    name,
    namespace,
    traits,
    schemaRef,
});
const simAdapter = (namespace, name, traits, schemaRef) => Schema.assign(new SimpleSchema(), {
    name,
    namespace,
    traits,
    schemaRef,
});

const SCHEMA = {
    BLOB: 0b0001_0101,
    STREAMING_BLOB: 0b0010_1010,
    BOOLEAN: 0b0000_0010,
    STRING: 0b0000_0000,
    NUMERIC: 0b0000_0001,
    BIG_INTEGER: 0b0001_0001,
    BIG_DECIMAL: 0b0001_0011,
    DOCUMENT: 0b0000_1111,
    TIMESTAMP_DEFAULT: 0b0000_0100,
    TIMESTAMP_DATE_TIME: 0b0000_0101,
    TIMESTAMP_HTTP_DATE: 0b0000_0110,
    TIMESTAMP_EPOCH_SECONDS: 0b0000_0111,
    LIST_MODIFIER: 0b0100_0000,
    MAP_MODIFIER: 0b1000_0000,
};

class TypeRegistry {
    namespace;
    schemas;
    exceptions;
    static registries = new Map();
    constructor(namespace, schemas = new Map(), exceptions = new Map()) {
        this.namespace = namespace;
        this.schemas = schemas;
        this.exceptions = exceptions;
    }
    static for(namespace) {
        if (!TypeRegistry.registries.has(namespace)) {
            TypeRegistry.registries.set(namespace, new TypeRegistry(namespace));
        }
        return TypeRegistry.registries.get(namespace);
    }
    copyFrom(other) {
        const { schemas, exceptions } = this;
        for (const [k, v] of other.schemas) {
            if (!schemas.has(k)) {
                schemas.set(k, v);
            }
        }
        for (const [k, v] of other.exceptions) {
            if (!exceptions.has(k)) {
                exceptions.set(k, v);
            }
        }
    }
    register(shapeId, schema) {
        const qualifiedName = this.normalizeShapeId(shapeId);
        for (const r of [this, TypeRegistry.for(qualifiedName.split("#")[0])]) {
            r.schemas.set(qualifiedName, schema);
        }
    }
    getSchema(shapeId) {
        const id = this.normalizeShapeId(shapeId);
        if (!this.schemas.has(id)) {
            if (!shapeId.includes("#")) {
                const suffix = "#" + shapeId;
                const candidates = [];
                for (const [shapeId, schema] of this.schemas.entries()) {
                    if (shapeId.endsWith(suffix)) {
                        candidates.push(schema);
                    }
                }
                if (candidates.length === 1) {
                    return candidates[0];
                }
            }
            throw new Error(`@smithy/core/schema - schema not found for ${id}`);
        }
        return this.schemas.get(id);
    }
    registerError(es, ctor) {
        const $error = es;
        const ns = $error[1];
        for (const r of [this, TypeRegistry.for(ns)]) {
            r.schemas.set(ns + "#" + $error[2], $error);
            r.exceptions.set($error, ctor);
        }
    }
    getErrorCtor(es) {
        const $error = es;
        if (this.exceptions.has($error)) {
            return this.exceptions.get($error);
        }
        const registry = TypeRegistry.for($error[1]);
        return registry.exceptions.get($error);
    }
    getBaseException() {
        for (const exceptionKey of this.exceptions.keys()) {
            if (Array.isArray(exceptionKey)) {
                const [, ns, name] = exceptionKey;
                const id = ns + "#" + name;
                if (id.startsWith("smithy.ts.sdk.synthetic.") && id.endsWith("ServiceException")) {
                    return exceptionKey;
                }
            }
        }
        return undefined;
    }
    find(predicate) {
        for (const schema of this.schemas.values()) {
            if (predicate(schema)) {
                return schema;
            }
        }
        return undefined;
    }
    clear() {
        this.schemas.clear();
        this.exceptions.clear();
    }
    normalizeShapeId(shapeId) {
        if (shapeId.includes("#")) {
            return shapeId;
        }
        return this.namespace + "#" + shapeId;
    }
}

exports.ErrorSchema = ErrorSchema;
exports.ListSchema = ListSchema;
exports.MapSchema = MapSchema;
exports.NormalizedSchema = NormalizedSchema;
exports.OperationSchema = OperationSchema;
exports.SCHEMA = SCHEMA;
exports.Schema = Schema;
exports.SimpleSchema = SimpleSchema;
exports.StructureSchema = StructureSchema;
exports.TypeRegistry = TypeRegistry;
exports.deref = deref;
exports.deserializerMiddlewareOption = deserializerMiddlewareOption;
exports.error = error;
exports.getSchemaSerdePlugin = getSchemaSerdePlugin;
exports.isStaticSchema = isStaticSchema;
exports.list = list;
exports.map = map;
exports.op = op;
exports.operation = operation;
exports.serializerMiddlewareOption = serializerMiddlewareOption;
exports.sim = sim;
exports.simAdapter = simAdapter;
exports.simpleSchemaCacheN = simpleSchemaCacheN;
exports.simpleSchemaCacheS = simpleSchemaCacheS;
exports.struct = struct;
exports.traitsCache = traitsCache;
exports.translateTraits = translateTraits;


/***/ }),

/***/ 38622:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var node_crypto = __webpack_require__(77598);
var node_fs = __webpack_require__(73024);
var protocols = __webpack_require__(45598);
var endpoints = __webpack_require__(86773);
var node_stream = __webpack_require__(57075);

const isArrayBuffer = (arg) => (typeof ArrayBuffer === "function" && arg instanceof ArrayBuffer) ||
    Object.prototype.toString.call(arg) === "[object ArrayBuffer]";

const fromArrayBuffer = (input, offset = 0, length = input.byteLength - offset) => {
    if (!isArrayBuffer(input)) {
        throw new TypeError(`The "input" argument must be ArrayBuffer. Received type ${typeof input} (${input})`);
    }
    return Buffer.from(input, offset, length);
};
const fromString = (input, encoding) => {
    if (typeof input !== "string") {
        throw new TypeError(`The "input" argument must be of type string. Received type ${typeof input} (${input})`);
    }
    return encoding ? Buffer.from(input, encoding) : Buffer.from(input);
};

const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;
const fromBase64$1 = (input) => {
    if ((input.length * 3) % 4 !== 0) {
        throw new TypeError(`Incorrect padding on base64 string.`);
    }
    if (!BASE64_REGEX.exec(input)) {
        throw new TypeError(`Invalid base64 string.`);
    }
    const buffer = fromString(input, "base64");
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
};

const fromUtf8$1 = (input) => {
    const buf = fromString(input, "utf8");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength / Uint8Array.BYTES_PER_ELEMENT);
};

const toBase64$1 = (_input) => {
    let input;
    if (typeof _input === "string") {
        input = fromUtf8$1(_input);
    }
    else {
        input = _input;
    }
    if (typeof input !== "object" || typeof input.byteOffset !== "number" || typeof input.byteLength !== "number") {
        throw new Error("@smithy/util-base64: toBase64 encoder function only accepts string | Uint8Array.");
    }
    return fromArrayBuffer(input.buffer, input.byteOffset, input.byteLength).toString("base64");
};

function bindUint8ArrayBlobAdapter(toUtf8, fromUtf8, toBase64, fromBase64) {
    return class Uint8ArrayBlobAdapter extends Uint8Array {
        static fromString(source, encoding = "utf-8") {
            if (typeof source === "string") {
                if (encoding === "base64") {
                    return Uint8ArrayBlobAdapter.mutate(fromBase64(source));
                }
                return Uint8ArrayBlobAdapter.mutate(fromUtf8(source));
            }
            throw new Error(`Unsupported conversion from ${typeof source} to Uint8ArrayBlobAdapter.`);
        }
        static mutate(source) {
            Object.setPrototypeOf(source, Uint8ArrayBlobAdapter.prototype);
            return source;
        }
        transformToString(encoding = "utf-8") {
            if (encoding === "base64") {
                return toBase64(this);
            }
            return toUtf8(this);
        }
    };
}

const toUtf8$1 = (input) => {
    if (typeof input === "string") {
        return input;
    }
    if (typeof input !== "object" || typeof input.byteOffset !== "number" || typeof input.byteLength !== "number") {
        throw new Error("@smithy/util-utf8: toUtf8 encoder function only accepts string | Uint8Array.");
    }
    return fromArrayBuffer(input.buffer, input.byteOffset, input.byteLength).toString("utf8");
};

const decimalToHex = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
function bindV4(getRandomValues) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return () => crypto.randomUUID();
    }
    return () => {
        const rnds = new Uint8Array(16);
        getRandomValues(rnds);
        rnds[6] = (rnds[6] & 0x0f) | 0x40;
        rnds[8] = (rnds[8] & 0x3f) | 0x80;
        return (decimalToHex[rnds[0]] +
            decimalToHex[rnds[1]] +
            decimalToHex[rnds[2]] +
            decimalToHex[rnds[3]] +
            "-" +
            decimalToHex[rnds[4]] +
            decimalToHex[rnds[5]] +
            "-" +
            decimalToHex[rnds[6]] +
            decimalToHex[rnds[7]] +
            "-" +
            decimalToHex[rnds[8]] +
            decimalToHex[rnds[9]] +
            "-" +
            decimalToHex[rnds[10]] +
            decimalToHex[rnds[11]] +
            decimalToHex[rnds[12]] +
            decimalToHex[rnds[13]] +
            decimalToHex[rnds[14]] +
            decimalToHex[rnds[15]]);
    };
}

const copyDocumentWithTransform = (source, schemaRef, transform = (_) => _) => source;

const parseBoolean = (value) => {
    switch (value) {
        case "true":
            return true;
        case "false":
            return false;
        default:
            throw new Error(`Unable to parse boolean value "${value}"`);
    }
};
const expectBoolean = (value) => {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value === "number") {
        if (value === 0 || value === 1) {
            logger.warn(stackTraceWarning(`Expected boolean, got ${typeof value}: ${value}`));
        }
        if (value === 0) {
            return false;
        }
        if (value === 1) {
            return true;
        }
    }
    if (typeof value === "string") {
        const lower = value.toLowerCase();
        if (lower === "false" || lower === "true") {
            logger.warn(stackTraceWarning(`Expected boolean, got ${typeof value}: ${value}`));
        }
        if (lower === "false") {
            return false;
        }
        if (lower === "true") {
            return true;
        }
    }
    if (typeof value === "boolean") {
        return value;
    }
    throw new TypeError(`Expected boolean, got ${typeof value}: ${value}`);
};
const expectNumber = (value) => {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value === "string") {
        const parsed = parseFloat(value);
        if (!Number.isNaN(parsed)) {
            if (String(parsed) !== String(value)) {
                logger.warn(stackTraceWarning(`Expected number but observed string: ${value}`));
            }
            return parsed;
        }
    }
    if (typeof value === "number") {
        return value;
    }
    throw new TypeError(`Expected number, got ${typeof value}: ${value}`);
};
const MAX_FLOAT = Math.ceil(2 ** 127 * (2 - 2 ** -23));
const expectFloat32 = (value) => {
    const expected = expectNumber(value);
    if (expected !== undefined && !Number.isNaN(expected) && expected !== Infinity && expected !== -Infinity) {
        if (Math.abs(expected) > MAX_FLOAT) {
            throw new TypeError(`Expected 32-bit float, got ${value}`);
        }
    }
    return expected;
};
const expectLong = (value) => {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (Number.isInteger(value) && !Number.isNaN(value)) {
        return value;
    }
    throw new TypeError(`Expected integer, got ${typeof value}: ${value}`);
};
const expectInt = expectLong;
const expectInt32 = (value) => expectSizedInt(value, 32);
const expectShort = (value) => expectSizedInt(value, 16);
const expectByte = (value) => expectSizedInt(value, 8);
const expectSizedInt = (value, size) => {
    const expected = expectLong(value);
    if (expected !== undefined && castInt(expected, size) !== expected) {
        throw new TypeError(`Expected ${size}-bit integer, got ${value}`);
    }
    return expected;
};
const castInt = (value, size) => {
    switch (size) {
        case 32:
            return Int32Array.of(value)[0];
        case 16:
            return Int16Array.of(value)[0];
        case 8:
            return Int8Array.of(value)[0];
    }
};
const expectNonNull = (value, location) => {
    if (value === null || value === undefined) {
        if (location) {
            throw new TypeError(`Expected a non-null value for ${location}`);
        }
        throw new TypeError("Expected a non-null value");
    }
    return value;
};
const expectObject = (value) => {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value === "object" && !Array.isArray(value)) {
        return value;
    }
    const receivedType = Array.isArray(value) ? "array" : typeof value;
    throw new TypeError(`Expected object, got ${receivedType}: ${value}`);
};
const expectString = (value) => {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value === "string") {
        return value;
    }
    if (["boolean", "number", "bigint"].includes(typeof value)) {
        logger.warn(stackTraceWarning(`Expected string, got ${typeof value}: ${value}`));
        return String(value);
    }
    throw new TypeError(`Expected string, got ${typeof value}: ${value}`);
};
const expectUnion = (value) => {
    if (value === null || value === undefined) {
        return undefined;
    }
    const asObject = expectObject(value);
    const setKeys = [];
    for (const k in asObject) {
        if (asObject[k] != null) {
            setKeys.push(k);
        }
    }
    if (setKeys.length === 0) {
        throw new TypeError(`Unions must have exactly one non-null member. None were found.`);
    }
    if (setKeys.length > 1) {
        throw new TypeError(`Unions must have exactly one non-null member. Keys ${setKeys} were not null.`);
    }
    return asObject;
};
const strictParseDouble = (value) => {
    if (typeof value == "string") {
        return expectNumber(parseNumber(value));
    }
    return expectNumber(value);
};
const strictParseFloat = strictParseDouble;
const strictParseFloat32 = (value) => {
    if (typeof value == "string") {
        return expectFloat32(parseNumber(value));
    }
    return expectFloat32(value);
};
const NUMBER_REGEX = /(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)|(-?Infinity)|(NaN)/g;
const parseNumber = (value) => {
    const matches = value.match(NUMBER_REGEX);
    if (matches === null || matches[0].length !== value.length) {
        throw new TypeError(`Expected real number, got implicit NaN`);
    }
    return parseFloat(value);
};
const limitedParseDouble = (value) => {
    if (typeof value == "string") {
        return parseFloatString(value);
    }
    return expectNumber(value);
};
const handleFloat = limitedParseDouble;
const limitedParseFloat = limitedParseDouble;
const limitedParseFloat32 = (value) => {
    if (typeof value == "string") {
        return parseFloatString(value);
    }
    return expectFloat32(value);
};
const parseFloatString = (value) => {
    switch (value) {
        case "NaN":
            return NaN;
        case "Infinity":
            return Infinity;
        case "-Infinity":
            return -Infinity;
        default:
            throw new Error(`Unable to parse float value: ${value}`);
    }
};
const strictParseLong = (value) => {
    if (typeof value === "string") {
        return expectLong(parseNumber(value));
    }
    return expectLong(value);
};
const strictParseInt = strictParseLong;
const strictParseInt32 = (value) => {
    if (typeof value === "string") {
        return expectInt32(parseNumber(value));
    }
    return expectInt32(value);
};
const strictParseShort = (value) => {
    if (typeof value === "string") {
        return expectShort(parseNumber(value));
    }
    return expectShort(value);
};
const strictParseByte = (value) => {
    if (typeof value === "string") {
        return expectByte(parseNumber(value));
    }
    return expectByte(value);
};
const stackTraceWarning = (message) => {
    return String(new TypeError(message).stack || message)
        .split("\n")
        .slice(0, 5)
        .filter((s) => !s.includes("stackTraceWarning"))
        .join("\n");
};
const logger = {
    warn: console.warn,
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function dateToUtcString(date) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const dayOfWeek = date.getUTCDay();
    const dayOfMonthInt = date.getUTCDate();
    const hoursInt = date.getUTCHours();
    const minutesInt = date.getUTCMinutes();
    const secondsInt = date.getUTCSeconds();
    const dayOfMonthString = dayOfMonthInt < 10 ? `0${dayOfMonthInt}` : `${dayOfMonthInt}`;
    const hoursString = hoursInt < 10 ? `0${hoursInt}` : `${hoursInt}`;
    const minutesString = minutesInt < 10 ? `0${minutesInt}` : `${minutesInt}`;
    const secondsString = secondsInt < 10 ? `0${secondsInt}` : `${secondsInt}`;
    return `${DAYS[dayOfWeek]}, ${dayOfMonthString} ${MONTHS[month]} ${year} ${hoursString}:${minutesString}:${secondsString} GMT`;
}
const RFC3339 = new RegExp(/^(\d{4})-(\d{2})-(\d{2})[tT](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?[zZ]$/);
const parseRfc3339DateTime = (value) => {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value !== "string") {
        throw new TypeError("RFC-3339 date-times must be expressed as strings");
    }
    const match = RFC3339.exec(value);
    if (!match) {
        throw new TypeError("Invalid RFC-3339 date-time value");
    }
    const [_, yearStr, monthStr, dayStr, hours, minutes, seconds, fractionalMilliseconds] = match;
    const year = strictParseShort(stripLeadingZeroes(yearStr));
    const month = parseDateValue(monthStr, "month", 1, 12);
    const day = parseDateValue(dayStr, "day", 1, 31);
    return buildDate(year, month, day, { hours, minutes, seconds, fractionalMilliseconds });
};
const RFC3339_WITH_OFFSET$1 = new RegExp(/^(\d{4})-(\d{2})-(\d{2})[tT](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(([-+]\d{2}\:\d{2})|[zZ])$/);
const parseRfc3339DateTimeWithOffset = (value) => {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value !== "string") {
        throw new TypeError("RFC-3339 date-times must be expressed as strings");
    }
    const match = RFC3339_WITH_OFFSET$1.exec(value);
    if (!match) {
        throw new TypeError("Invalid RFC-3339 date-time value");
    }
    const [_, yearStr, monthStr, dayStr, hours, minutes, seconds, fractionalMilliseconds, offsetStr] = match;
    const year = strictParseShort(stripLeadingZeroes(yearStr));
    const month = parseDateValue(monthStr, "month", 1, 12);
    const day = parseDateValue(dayStr, "day", 1, 31);
    const date = buildDate(year, month, day, { hours, minutes, seconds, fractionalMilliseconds });
    if (offsetStr.toUpperCase() != "Z") {
        date.setTime(date.getTime() - parseOffsetToMilliseconds(offsetStr));
    }
    return date;
};
const IMF_FIXDATE$1 = new RegExp(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))? GMT$/);
const RFC_850_DATE$1 = new RegExp(/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d{2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2}) (\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))? GMT$/);
const ASC_TIME$1 = new RegExp(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( [1-9]|\d{2}) (\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))? (\d{4})$/);
const parseRfc7231DateTime = (value) => {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value !== "string") {
        throw new TypeError("RFC-7231 date-times must be expressed as strings");
    }
    let match = IMF_FIXDATE$1.exec(value);
    if (match) {
        const [_, dayStr, monthStr, yearStr, hours, minutes, seconds, fractionalMilliseconds] = match;
        return buildDate(strictParseShort(stripLeadingZeroes(yearStr)), parseMonthByShortName(monthStr), parseDateValue(dayStr, "day", 1, 31), { hours, minutes, seconds, fractionalMilliseconds });
    }
    match = RFC_850_DATE$1.exec(value);
    if (match) {
        const [_, dayStr, monthStr, yearStr, hours, minutes, seconds, fractionalMilliseconds] = match;
        return adjustRfc850Year(buildDate(parseTwoDigitYear(yearStr), parseMonthByShortName(monthStr), parseDateValue(dayStr, "day", 1, 31), {
            hours,
            minutes,
            seconds,
            fractionalMilliseconds,
        }));
    }
    match = ASC_TIME$1.exec(value);
    if (match) {
        const [_, monthStr, dayStr, hours, minutes, seconds, fractionalMilliseconds, yearStr] = match;
        return buildDate(strictParseShort(stripLeadingZeroes(yearStr)), parseMonthByShortName(monthStr), parseDateValue(dayStr.trimLeft(), "day", 1, 31), { hours, minutes, seconds, fractionalMilliseconds });
    }
    throw new TypeError("Invalid RFC-7231 date-time value");
};
const parseEpochTimestamp = (value) => {
    if (value === null || value === undefined) {
        return undefined;
    }
    let valueAsDouble;
    if (typeof value === "number") {
        valueAsDouble = value;
    }
    else if (typeof value === "string") {
        valueAsDouble = strictParseDouble(value);
    }
    else if (typeof value === "object" && value.tag === 1) {
        valueAsDouble = value.value;
    }
    else {
        throw new TypeError("Epoch timestamps must be expressed as floating point numbers or their string representation");
    }
    if (Number.isNaN(valueAsDouble) || valueAsDouble === Infinity || valueAsDouble === -Infinity) {
        throw new TypeError("Epoch timestamps must be valid, non-Infinite, non-NaN numerics");
    }
    return new Date(Math.round(valueAsDouble * 1000));
};
const buildDate = (year, month, day, time) => {
    const adjustedMonth = month - 1;
    validateDayOfMonth(year, adjustedMonth, day);
    return new Date(Date.UTC(year, adjustedMonth, day, parseDateValue(time.hours, "hour", 0, 23), parseDateValue(time.minutes, "minute", 0, 59), parseDateValue(time.seconds, "seconds", 0, 60), parseMilliseconds(time.fractionalMilliseconds)));
};
const parseTwoDigitYear = (value) => {
    const thisYear = new Date().getUTCFullYear();
    const valueInThisCentury = Math.floor(thisYear / 100) * 100 + strictParseShort(stripLeadingZeroes(value));
    if (valueInThisCentury < thisYear) {
        return valueInThisCentury + 100;
    }
    return valueInThisCentury;
};
const FIFTY_YEARS_IN_MILLIS = 50 * 365 * 24 * 60 * 60 * 1000;
const adjustRfc850Year = (input) => {
    if (input.getTime() - new Date().getTime() > FIFTY_YEARS_IN_MILLIS) {
        return new Date(Date.UTC(input.getUTCFullYear() - 100, input.getUTCMonth(), input.getUTCDate(), input.getUTCHours(), input.getUTCMinutes(), input.getUTCSeconds(), input.getUTCMilliseconds()));
    }
    return input;
};
const parseMonthByShortName = (value) => {
    const monthIdx = MONTHS.indexOf(value);
    if (monthIdx < 0) {
        throw new TypeError(`Invalid month: ${value}`);
    }
    return monthIdx + 1;
};
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const validateDayOfMonth = (year, month, day) => {
    let maxDays = DAYS_IN_MONTH[month];
    if (month === 1 && isLeapYear(year)) {
        maxDays = 29;
    }
    if (day > maxDays) {
        throw new TypeError(`Invalid day for ${MONTHS[month]} in ${year}: ${day}`);
    }
};
const isLeapYear = (year) => {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
};
const parseDateValue = (value, type, lower, upper) => {
    const dateVal = strictParseByte(stripLeadingZeroes(value));
    if (dateVal < lower || dateVal > upper) {
        throw new TypeError(`${type} must be between ${lower} and ${upper}, inclusive`);
    }
    return dateVal;
};
const parseMilliseconds = (value) => {
    if (value === null || value === undefined) {
        return 0;
    }
    return strictParseFloat32("0." + value) * 1000;
};
const parseOffsetToMilliseconds = (value) => {
    const directionStr = value[0];
    let direction = 1;
    if (directionStr == "+") {
        direction = 1;
    }
    else if (directionStr == "-") {
        direction = -1;
    }
    else {
        throw new TypeError(`Offset direction, ${directionStr}, must be "+" or "-"`);
    }
    const hour = Number(value.substring(1, 3));
    const minute = Number(value.substring(4, 6));
    return direction * (hour * 60 + minute) * 60 * 1000;
};
const stripLeadingZeroes = (value) => {
    let idx = 0;
    while (idx < value.length - 1 && value.charAt(idx) === "0") {
        idx++;
    }
    if (idx === 0) {
        return value;
    }
    return value.slice(idx);
};

const LazyJsonString = function LazyJsonString(val) {
    const str = Object.assign(new String(val), {
        deserializeJSON() {
            return JSON.parse(String(val));
        },
        toString() {
            return String(val);
        },
        toJSON() {
            return String(val);
        },
    });
    return str;
};
LazyJsonString.from = (object) => {
    if (object && typeof object === "object" && (object instanceof LazyJsonString || "deserializeJSON" in object)) {
        return object;
    }
    else if (typeof object === "string" || Object.getPrototypeOf(object) === String.prototype) {
        return LazyJsonString(String(object));
    }
    return LazyJsonString(JSON.stringify(object));
};
LazyJsonString.fromObject = LazyJsonString.from;

function quoteHeader(part) {
    if (part.includes(",") || part.includes('"')) {
        part = `"${part.replace(/"/g, '\\"')}"`;
    }
    return part;
}

const ddd = `(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:[ne|u?r]?s?day)?`;
const mmm = `(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)`;
const time = `(\\d?\\d):(\\d{2}):(\\d{2})(?:\\.(\\d+))?`;
const date = `(\\d?\\d)`;
const year = `(\\d{4})`;
const RFC3339_WITH_OFFSET = new RegExp(/^(\d{4})-(\d\d)-(\d\d)[tT](\d\d):(\d\d):(\d\d)(\.(\d+))?(([-+]\d\d:\d\d)|[zZ])$/);
const IMF_FIXDATE = new RegExp(`^${ddd}, ${date} ${mmm} ${year} ${time} GMT$`);
const RFC_850_DATE = new RegExp(`^${ddd}, ${date}-${mmm}-(\\d\\d) ${time} GMT$`);
const ASC_TIME = new RegExp(`^${ddd} ${mmm} ( [1-9]|\\d\\d) ${time} ${year}$`);
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const _parseEpochTimestamp = (value) => {
    if (value == null) {
        return void 0;
    }
    let num = NaN;
    if (typeof value === "number") {
        num = value;
    }
    else if (typeof value === "string") {
        if (!/^-?\d*\.?\d+$/.test(value)) {
            throw new TypeError(`parseEpochTimestamp - numeric string invalid.`);
        }
        num = Number.parseFloat(value);
    }
    else if (typeof value === "object" && value.tag === 1) {
        num = value.value;
    }
    if (isNaN(num) || Math.abs(num) === Infinity) {
        throw new TypeError("Epoch timestamps must be valid finite numbers.");
    }
    return new Date(Math.round(num * 1000));
};
const _parseRfc3339DateTimeWithOffset = (value) => {
    if (value == null) {
        return void 0;
    }
    if (typeof value !== "string") {
        throw new TypeError("RFC3339 timestamps must be strings");
    }
    const matches = RFC3339_WITH_OFFSET.exec(value);
    if (!matches) {
        throw new TypeError(`Invalid RFC3339 timestamp format ${value}`);
    }
    const [, yearStr, monthStr, dayStr, hours, minutes, seconds, , ms, offsetStr] = matches;
    range(monthStr, 1, 12);
    range(dayStr, 1, 31);
    range(hours, 0, 23);
    range(minutes, 0, 59);
    range(seconds, 0, 60);
    const date = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr), Number(hours), Number(minutes), Number(seconds), Number(ms) ? Math.round(parseFloat(`0.${ms}`) * 1000) : 0));
    date.setUTCFullYear(Number(yearStr));
    if (offsetStr.toUpperCase() != "Z") {
        const [, sign, offsetH, offsetM] = /([+-])(\d\d):(\d\d)/.exec(offsetStr) || [void 0, "+", 0, 0];
        const scalar = sign === "-" ? 1 : -1;
        date.setTime(date.getTime() + scalar * (Number(offsetH) * 60 * 60 * 1000 + Number(offsetM) * 60 * 1000));
    }
    return date;
};
const _parseRfc7231DateTime = (value) => {
    if (value == null) {
        return void 0;
    }
    if (typeof value !== "string") {
        throw new TypeError("RFC7231 timestamps must be strings.");
    }
    let day;
    let month;
    let year;
    let hour;
    let minute;
    let second;
    let fraction;
    let matches;
    if ((matches = IMF_FIXDATE.exec(value))) {
        [, day, month, year, hour, minute, second, fraction] = matches;
    }
    else if ((matches = RFC_850_DATE.exec(value))) {
        [, day, month, year, hour, minute, second, fraction] = matches;
        year = (Number(year) + 1900).toString();
    }
    else if ((matches = ASC_TIME.exec(value))) {
        [, month, day, hour, minute, second, fraction, year] = matches;
    }
    if (year && second) {
        const timestamp = Date.UTC(Number(year), months.indexOf(month), Number(day), Number(hour), Number(minute), Number(second), fraction ? Math.round(parseFloat(`0.${fraction}`) * 1000) : 0);
        range(day, 1, 31);
        range(hour, 0, 23);
        range(minute, 0, 59);
        range(second, 0, 60);
        const date = new Date(timestamp);
        date.setUTCFullYear(Number(year));
        return date;
    }
    throw new TypeError(`Invalid RFC7231 date-time value ${value}.`);
};
function range(v, min, max) {
    const _v = Number(v);
    if (_v < min || _v > max) {
        throw new Error(`Value ${_v} out of range [${min}, ${max}]`);
    }
}

function splitEvery(value, delimiter, numDelimiters) {
    if (numDelimiters <= 0 || !Number.isInteger(numDelimiters)) {
        throw new Error("Invalid number of delimiters (" + numDelimiters + ") for splitEvery.");
    }
    const segments = value.split(delimiter);
    if (numDelimiters === 1) {
        return segments;
    }
    const compoundSegments = [];
    let currentSegment = "";
    for (let i = 0; i < segments.length; i++) {
        if (currentSegment === "") {
            currentSegment = segments[i];
        }
        else {
            currentSegment += delimiter + segments[i];
        }
        if ((i + 1) % numDelimiters === 0) {
            compoundSegments.push(currentSegment);
            currentSegment = "";
        }
    }
    if (currentSegment !== "") {
        compoundSegments.push(currentSegment);
    }
    return compoundSegments;
}

const splitHeader = (value) => {
    const z = value.length;
    const values = [];
    let withinQuotes = false;
    let prevChar = undefined;
    let anchor = 0;
    for (let i = 0; i < z; ++i) {
        const char = value[i];
        switch (char) {
            case `"`:
                if (prevChar !== "\\") {
                    withinQuotes = !withinQuotes;
                }
                break;
            case ",":
                if (!withinQuotes) {
                    values.push(value.slice(anchor, i));
                    anchor = i + 1;
                }
                break;
        }
        prevChar = char;
    }
    values.push(value.slice(anchor));
    return values.map((v) => {
        v = v.trim();
        const z = v.length;
        if (z < 2) {
            return v;
        }
        if (v[0] === `"` && v[z - 1] === `"`) {
            v = v.slice(1, z - 1);
        }
        return v.replace(/\\"/g, '"');
    });
};

const format = /^-?\d*(\.\d+)?$/;
class NumericValue {
    string;
    type;
    constructor(string, type) {
        this.string = string;
        this.type = type;
        if (!format.test(string)) {
            throw new Error(`@smithy/core/serde - NumericValue must only contain [0-9], at most one decimal point ".", and an optional negation prefix "-".`);
        }
    }
    toString() {
        return this.string;
    }
    static [Symbol.hasInstance](object) {
        if (!object || typeof object !== "object") {
            return false;
        }
        const _nv = object;
        return NumericValue.prototype.isPrototypeOf(object) || (_nv.type === "bigDecimal" && format.test(_nv.string));
    }
}
function nv(input) {
    return new NumericValue(String(input), "bigDecimal");
}

const SHORT_TO_HEX = {};
const HEX_TO_SHORT = {};
for (let i = 0; i < 256; i++) {
    let encodedByte = i.toString(16).toLowerCase();
    if (encodedByte.length === 1) {
        encodedByte = `0${encodedByte}`;
    }
    SHORT_TO_HEX[i] = encodedByte;
    HEX_TO_SHORT[encodedByte] = i;
}
function fromHex(encoded) {
    if (encoded.length % 2 !== 0) {
        throw new Error("Hex encoded strings must have an even number length");
    }
    const out = new Uint8Array(encoded.length / 2);
    for (let i = 0; i < encoded.length; i += 2) {
        const encodedByte = encoded.slice(i, i + 2).toLowerCase();
        if (encodedByte in HEX_TO_SHORT) {
            out[i / 2] = HEX_TO_SHORT[encodedByte];
        }
        else {
            throw new Error(`Cannot decode unrecognized sequence ${encodedByte} as hexadecimal`);
        }
    }
    return out;
}
function toHex(bytes) {
    let out = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        out += SHORT_TO_HEX[bytes[i]];
    }
    return out;
}

const calculateBodyLength = (body) => {
    if (!body) {
        return 0;
    }
    if (typeof body === "string") {
        return Buffer.byteLength(body);
    }
    else if (typeof body.byteLength === "number") {
        return body.byteLength;
    }
    else if (typeof body.size === "number") {
        return body.size;
    }
    else if (typeof body.start === "number" && typeof body.end === "number") {
        return body.end + 1 - body.start;
    }
    else if (body instanceof node_fs.ReadStream) {
        if (body.path != null) {
            return node_fs.lstatSync(body.path).size;
        }
        else if (typeof body.fd === "number") {
            return node_fs.fstatSync(body.fd).size;
        }
    }
    throw new Error(`Body Length computation failed for ${body}`);
};

const toUint8Array = (data) => {
    if (typeof data === "string") {
        return fromUtf8$1(data);
    }
    if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength / Uint8Array.BYTES_PER_ELEMENT);
    }
    return new Uint8Array(data);
};

const deserializerMiddleware = (options, deserializer) => (next, context) => async (args) => {
    const { response } = await next(args);
    try {
        const parsed = await deserializer(response, options);
        return {
            response,
            output: parsed,
        };
    }
    catch (error) {
        Object.defineProperty(error, "$response", {
            value: response,
            enumerable: false,
            writable: false,
            configurable: false,
        });
        if (!("$metadata" in error)) {
            const hint = `Deserialization error: to see the raw response, inspect the hidden field {error}.$response on this object.`;
            try {
                error.message += "\n  " + hint;
            }
            catch (e) {
                if (!context.logger || context.logger?.constructor?.name === "NoOpLogger") {
                    console.warn(hint);
                }
                else {
                    context.logger?.warn?.(hint);
                }
            }
            if (typeof error.$responseBodyText !== "undefined") {
                if (error.$response) {
                    error.$response.body = error.$responseBodyText;
                }
            }
            try {
                if (protocols.HttpResponse.isInstance(response)) {
                    const { headers = {} } = response;
                    const headerEntries = Object.entries(headers);
                    error.$metadata = {
                        httpStatusCode: response.statusCode,
                        requestId: findHeader(/^x-[\w-]+-request-?id$/, headerEntries),
                        extendedRequestId: findHeader(/^x-[\w-]+-id-2$/, headerEntries),
                        cfId: findHeader(/^x-[\w-]+-cf-id$/, headerEntries),
                    };
                }
            }
            catch (e) {
            }
        }
        throw error;
    }
};
const findHeader = (pattern, headers) => {
    return (headers.find(([k]) => {
        return k.match(pattern);
    }) || [void 0, void 0])[1];
};

const serializerMiddleware = (options, serializer) => (next, context) => async (args) => {
    const endpointConfig = options;
    const endpoint = context.endpointV2
        ? async () => endpoints.toEndpointV1(context.endpointV2)
        : endpointConfig.endpoint;
    if (!endpoint) {
        throw new Error("No valid endpoint provider available.");
    }
    const request = await serializer(args.input, { ...options, endpoint });
    return next({
        ...args,
        request,
    });
};

const deserializerMiddlewareOption = {
    name: "deserializerMiddleware",
    step: "deserialize",
    tags: ["DESERIALIZER"],
    override: true,
};
const serializerMiddlewareOption = {
    name: "serializerMiddleware",
    step: "serialize",
    tags: ["SERIALIZER"],
    override: true,
};
function getSerdePlugin(config, serializer, deserializer) {
    return {
        applyToStack: (commandStack) => {
            commandStack.add(deserializerMiddleware(config, deserializer), deserializerMiddlewareOption);
            commandStack.add(serializerMiddleware(config, serializer), serializerMiddlewareOption);
        },
    };
}

class Hash {
    algorithmIdentifier;
    secret;
    hash;
    constructor(algorithmIdentifier, secret) {
        this.algorithmIdentifier = algorithmIdentifier;
        this.secret = secret;
        this.reset();
    }
    update(toHash, encoding) {
        this.hash.update(toUint8Array(castSourceData(toHash, encoding)));
    }
    digest() {
        return Promise.resolve(this.hash.digest());
    }
    reset() {
        this.hash = this.secret
            ? node_crypto.createHmac(this.algorithmIdentifier, castSourceData(this.secret))
            : node_crypto.createHash(this.algorithmIdentifier);
    }
}
function castSourceData(toCast, encoding) {
    if (Buffer.isBuffer(toCast)) {
        return toCast;
    }
    if (typeof toCast === "string") {
        return fromString(toCast, encoding);
    }
    if (ArrayBuffer.isView(toCast)) {
        return fromArrayBuffer(toCast.buffer, toCast.byteOffset, toCast.byteLength);
    }
    return fromArrayBuffer(toCast);
}

let ChecksumStream$1 = class ChecksumStream extends node_stream.Duplex {
    expectedChecksum;
    checksumSourceLocation;
    checksum;
    source;
    base64Encoder;
    pendingCallback = null;
    constructor({ expectedChecksum, checksum, source, checksumSourceLocation, base64Encoder, }) {
        super();
        if (typeof source.pipe === "function") {
            this.source = source;
        }
        else {
            throw new Error(`@smithy/util-stream: unsupported source type ${source?.constructor?.name ?? source} in ChecksumStream.`);
        }
        this.base64Encoder = base64Encoder ?? toBase64$1;
        this.expectedChecksum = expectedChecksum;
        this.checksum = checksum;
        this.checksumSourceLocation = checksumSourceLocation;
        this.source.pipe(this);
    }
    _read(size) {
        if (this.pendingCallback) {
            const callback = this.pendingCallback;
            this.pendingCallback = null;
            callback();
        }
    }
    _write(chunk, encoding, callback) {
        try {
            this.checksum.update(chunk);
            const canPushMore = this.push(chunk);
            if (!canPushMore) {
                this.pendingCallback = callback;
                return;
            }
        }
        catch (e) {
            return callback(e);
        }
        return callback();
    }
    async _final(callback) {
        try {
            const digest = await this.checksum.digest();
            const received = this.base64Encoder(digest);
            if (this.expectedChecksum !== received) {
                return callback(new Error(`Checksum mismatch: expected "${this.expectedChecksum}" but received "${received}"` +
                    ` in response header "${this.checksumSourceLocation}".`));
            }
        }
        catch (e) {
            return callback(e);
        }
        this.push(null);
        return callback();
    }
};

const isReadableStream = (stream) => typeof ReadableStream === "function" &&
    (stream?.constructor?.name === ReadableStream.name || stream instanceof ReadableStream);
const isBlob = (blob) => {
    return typeof Blob === "function" && (blob?.constructor?.name === Blob.name || blob instanceof Blob);
};

const fromUtf8 = (input) => new TextEncoder().encode(input);

const chars = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/`;
const alphabetByEncoding = Object.entries(chars).reduce((acc, [i, c]) => {
    acc[c] = Number(i);
    return acc;
}, {});
const alphabetByValue = chars.split("");
const bitsPerLetter = 6;
const bitsPerByte = 8;
const maxLetterValue = 0b111111;

function toBase64(_input) {
    let input;
    if (typeof _input === "string") {
        input = fromUtf8(_input);
    }
    else {
        input = _input;
    }
    const isArrayLike = typeof input === "object" && typeof input.length === "number";
    const isUint8Array = typeof input === "object" &&
        typeof input.byteOffset === "number" &&
        typeof input.byteLength === "number";
    if (!isArrayLike && !isUint8Array) {
        throw new Error("@smithy/util-base64: toBase64 encoder function only accepts string | Uint8Array.");
    }
    let str = "";
    for (let i = 0; i < input.length; i += 3) {
        let bits = 0;
        let bitLength = 0;
        for (let j = i, limit = Math.min(i + 3, input.length); j < limit; j++) {
            bits |= input[j] << ((limit - j - 1) * bitsPerByte);
            bitLength += bitsPerByte;
        }
        const bitClusterCount = Math.ceil(bitLength / bitsPerLetter);
        bits <<= bitClusterCount * bitsPerLetter - bitLength;
        for (let k = 1; k <= bitClusterCount; k++) {
            const offset = (bitClusterCount - k) * bitsPerLetter;
            str += alphabetByValue[(bits & (maxLetterValue << offset)) >> offset];
        }
        str += "==".slice(0, 4 - bitClusterCount);
    }
    return str;
}

const ReadableStreamRef = typeof ReadableStream === "function" ? ReadableStream : function () { };
class ChecksumStream extends ReadableStreamRef {
}

const createChecksumStream$1 = ({ expectedChecksum, checksum, source, checksumSourceLocation, base64Encoder, }) => {
    if (!isReadableStream(source)) {
        throw new Error(`@smithy/util-stream: unsupported source type ${source?.constructor?.name ?? source} in ChecksumStream.`);
    }
    const encoder = base64Encoder ?? toBase64;
    if (typeof TransformStream !== "function") {
        throw new Error("@smithy/util-stream: unable to instantiate ChecksumStream because API unavailable: ReadableStream/TransformStream.");
    }
    const transform = new TransformStream({
        start() { },
        async transform(chunk, controller) {
            checksum.update(chunk);
            controller.enqueue(chunk);
        },
        async flush(controller) {
            const digest = await checksum.digest();
            const received = encoder(digest);
            if (expectedChecksum !== received) {
                const error = new Error(`Checksum mismatch: expected "${expectedChecksum}" but received "${received}"` +
                    ` in response header "${checksumSourceLocation}".`);
                controller.error(error);
            }
            else {
                controller.terminate();
            }
        },
    });
    source.pipeThrough(transform);
    const readable = transform.readable;
    Object.setPrototypeOf(readable, ChecksumStream.prototype);
    return readable;
};

function createChecksumStream(init) {
    if (typeof ReadableStream === "function" && isReadableStream(init.source)) {
        return createChecksumStream$1(init);
    }
    return new ChecksumStream$1(init);
}

class ByteArrayCollector {
    allocByteArray;
    byteLength = 0;
    byteArrays = [];
    constructor(allocByteArray) {
        this.allocByteArray = allocByteArray;
    }
    push(byteArray) {
        this.byteArrays.push(byteArray);
        this.byteLength += byteArray.byteLength;
    }
    flush() {
        if (this.byteArrays.length === 1) {
            const bytes = this.byteArrays[0];
            this.reset();
            return bytes;
        }
        const aggregation = this.allocByteArray(this.byteLength);
        let cursor = 0;
        for (let i = 0; i < this.byteArrays.length; ++i) {
            const bytes = this.byteArrays[i];
            aggregation.set(bytes, cursor);
            cursor += bytes.byteLength;
        }
        this.reset();
        return aggregation;
    }
    reset() {
        this.byteArrays = [];
        this.byteLength = 0;
    }
}

function createBufferedReadableStream(upstream, size, logger) {
    const reader = upstream.getReader();
    let streamBufferingLoggedWarning = false;
    let bytesSeen = 0;
    const buffers = ["", new ByteArrayCollector((size) => new Uint8Array(size))];
    let mode = -1;
    const pull = async (controller) => {
        const { value, done } = await reader.read();
        const chunk = value;
        if (done) {
            if (mode !== -1) {
                const remainder = flush(buffers, mode);
                if (sizeOf(remainder) > 0) {
                    controller.enqueue(remainder);
                }
            }
            controller.close();
        }
        else {
            const chunkMode = modeOf(chunk, false);
            if (mode !== chunkMode) {
                if (mode >= 0) {
                    controller.enqueue(flush(buffers, mode));
                }
                mode = chunkMode;
            }
            if (mode === -1) {
                controller.enqueue(chunk);
                return;
            }
            const chunkSize = sizeOf(chunk);
            bytesSeen += chunkSize;
            const bufferSize = sizeOf(buffers[mode]);
            if (chunkSize >= size && bufferSize === 0) {
                controller.enqueue(chunk);
            }
            else {
                const newSize = merge(buffers, mode, chunk);
                if (!streamBufferingLoggedWarning && bytesSeen > size * 2) {
                    streamBufferingLoggedWarning = true;
                    logger?.warn(`@smithy/util-stream - stream chunk size ${chunkSize} is below threshold of ${size}, automatically buffering.`);
                }
                if (newSize >= size) {
                    controller.enqueue(flush(buffers, mode));
                }
                else {
                    await pull(controller);
                }
            }
        }
    };
    return new ReadableStream({
        pull,
    });
}
function merge(buffers, mode, chunk) {
    switch (mode) {
        case 0:
            buffers[0] += chunk;
            return sizeOf(buffers[0]);
        case 1:
        case 2:
            buffers[mode].push(chunk);
            return sizeOf(buffers[mode]);
    }
}
function flush(buffers, mode) {
    switch (mode) {
        case 0:
            const s = buffers[0];
            buffers[0] = "";
            return s;
        case 1:
        case 2:
            return buffers[mode].flush();
    }
    throw new Error(`@smithy/util-stream - invalid index ${mode} given to flush()`);
}
function sizeOf(chunk) {
    return chunk?.byteLength ?? chunk?.length ?? 0;
}
function modeOf(chunk, allowBuffer = true) {
    if (allowBuffer && typeof Buffer !== "undefined" && chunk instanceof Buffer) {
        return 2;
    }
    if (chunk instanceof Uint8Array) {
        return 1;
    }
    if (typeof chunk === "string") {
        return 0;
    }
    return -1;
}

function createBufferedReadable(upstream, size, logger) {
    if (isReadableStream(upstream)) {
        return createBufferedReadableStream(upstream, size, logger);
    }
    const downstream = new node_stream.Readable({ read() { } });
    let streamBufferingLoggedWarning = false;
    let bytesSeen = 0;
    const buffers = [
        "",
        new ByteArrayCollector((size) => new Uint8Array(size)),
        new ByteArrayCollector((size) => Buffer.from(new Uint8Array(size))),
    ];
    let mode = -1;
    upstream.on("data", (chunk) => {
        const chunkMode = modeOf(chunk, true);
        if (mode !== chunkMode) {
            if (mode >= 0) {
                downstream.push(flush(buffers, mode));
            }
            mode = chunkMode;
        }
        if (mode === -1) {
            downstream.push(chunk);
            return;
        }
        const chunkSize = sizeOf(chunk);
        bytesSeen += chunkSize;
        const bufferSize = sizeOf(buffers[mode]);
        if (chunkSize >= size && bufferSize === 0) {
            downstream.push(chunk);
        }
        else {
            const newSize = merge(buffers, mode, chunk);
            if (!streamBufferingLoggedWarning && bytesSeen > size * 2) {
                streamBufferingLoggedWarning = true;
                logger?.warn(`@smithy/util-stream - stream chunk size ${chunkSize} is below threshold of ${size}, automatically buffering.`);
            }
            if (newSize >= size) {
                downstream.push(flush(buffers, mode));
            }
        }
    });
    upstream.on("end", () => {
        if (mode !== -1) {
            const remainder = flush(buffers, mode);
            if (sizeOf(remainder) > 0) {
                downstream.push(remainder);
            }
        }
        downstream.push(null);
    });
    return downstream;
}

const getAwsChunkedEncodingStream$1 = (readableStream, options) => {
    const { base64Encoder, bodyLengthChecker, checksumAlgorithmFn, checksumLocationName, streamHasher } = options;
    const checksumRequired = base64Encoder !== undefined &&
        bodyLengthChecker !== undefined &&
        checksumAlgorithmFn !== undefined &&
        checksumLocationName !== undefined &&
        streamHasher !== undefined;
    const digest = checksumRequired ? streamHasher(checksumAlgorithmFn, readableStream) : undefined;
    const reader = readableStream.getReader();
    return new ReadableStream({
        async pull(controller) {
            const { value, done } = await reader.read();
            if (done) {
                controller.enqueue(`0\r\n`);
                if (checksumRequired) {
                    const checksum = base64Encoder(await digest);
                    controller.enqueue(`${checksumLocationName}:${checksum}\r\n`);
                    controller.enqueue(`\r\n`);
                }
                controller.close();
            }
            else {
                controller.enqueue(`${(bodyLengthChecker(value) || 0).toString(16)}\r\n${value}\r\n`);
            }
        },
    });
};

function getAwsChunkedEncodingStream(stream, options) {
    const readable = stream;
    const readableStream = stream;
    if (isReadableStream(readableStream)) {
        return getAwsChunkedEncodingStream$1(readableStream, options);
    }
    const { base64Encoder, bodyLengthChecker, checksumAlgorithmFn, checksumLocationName, streamHasher } = options;
    const checksumRequired = base64Encoder !== undefined &&
        checksumAlgorithmFn !== undefined &&
        checksumLocationName !== undefined &&
        streamHasher !== undefined;
    const digest = checksumRequired ? streamHasher(checksumAlgorithmFn, readable) : undefined;
    const awsChunkedEncodingStream = new node_stream.Readable({
        read: () => { },
    });
    readable.on("data", (data) => {
        const length = bodyLengthChecker(data) || 0;
        if (length === 0) {
            return;
        }
        awsChunkedEncodingStream.push(`${length.toString(16)}\r\n`);
        awsChunkedEncodingStream.push(data);
        awsChunkedEncodingStream.push("\r\n");
    });
    readable.on("end", async () => {
        awsChunkedEncodingStream.push(`0\r\n`);
        if (checksumRequired) {
            const checksum = base64Encoder(await digest);
            awsChunkedEncodingStream.push(`${checksumLocationName}:${checksum}\r\n`);
            awsChunkedEncodingStream.push(`\r\n`);
        }
        awsChunkedEncodingStream.push(null);
    });
    return awsChunkedEncodingStream;
}

async function headStream$1(stream, bytes) {
    let byteLengthCounter = 0;
    const chunks = [];
    const reader = stream.getReader();
    let isDone = false;
    while (!isDone) {
        const { done, value } = await reader.read();
        if (value) {
            chunks.push(value);
            byteLengthCounter += value?.byteLength ?? 0;
        }
        if (byteLengthCounter >= bytes) {
            break;
        }
        isDone = done;
    }
    reader.releaseLock();
    const collected = new Uint8Array(Math.min(bytes, byteLengthCounter));
    let offset = 0;
    for (const chunk of chunks) {
        if (chunk.byteLength > collected.byteLength - offset) {
            collected.set(chunk.subarray(0, collected.byteLength - offset), offset);
            break;
        }
        else {
            collected.set(chunk, offset);
        }
        offset += chunk.length;
    }
    return collected;
}

const headStream = (stream, bytes) => {
    if (isReadableStream(stream)) {
        return headStream$1(stream, bytes);
    }
    return new Promise((resolve, reject) => {
        const collector = new Collector$1();
        collector.limit = bytes;
        stream.pipe(collector);
        stream.on("error", (err) => {
            collector.end();
            reject(err);
        });
        collector.on("error", reject);
        collector.on("finish", function () {
            const bytes = new Uint8Array(Buffer.concat(this.buffers));
            resolve(bytes);
        });
    });
};
let Collector$1 = class Collector extends node_stream.Writable {
    buffers = [];
    limit = Infinity;
    bytesBuffered = 0;
    _write(chunk, encoding, callback) {
        this.buffers.push(chunk);
        this.bytesBuffered += chunk.byteLength ?? 0;
        if (this.bytesBuffered >= this.limit) {
            const excess = this.bytesBuffered - this.limit;
            const tailBuffer = this.buffers[this.buffers.length - 1];
            this.buffers[this.buffers.length - 1] = tailBuffer.subarray(0, tailBuffer.byteLength - excess);
            this.emit("finish");
        }
        callback();
    }
};

const toUtf8 = (input) => {
    if (typeof input === "string") {
        return input;
    }
    if (typeof input !== "object" || typeof input.byteOffset !== "number" || typeof input.byteLength !== "number") {
        throw new Error("@smithy/util-utf8: toUtf8 encoder function only accepts string | Uint8Array.");
    }
    return new TextDecoder("utf-8").decode(input);
};

const fromBase64 = (input) => {
    let totalByteLength = (input.length / 4) * 3;
    if (input.slice(-2) === "==") {
        totalByteLength -= 2;
    }
    else if (input.slice(-1) === "=") {
        totalByteLength--;
    }
    const out = new ArrayBuffer(totalByteLength);
    const dataView = new DataView(out);
    for (let i = 0; i < input.length; i += 4) {
        let bits = 0;
        let bitLength = 0;
        for (let j = i, limit = i + 3; j <= limit; j++) {
            if (input[j] !== "=") {
                if (!(input[j] in alphabetByEncoding)) {
                    throw new TypeError(`Invalid character ${input[j]} in base64 string.`);
                }
                bits |= alphabetByEncoding[input[j]] << ((limit - j) * bitsPerLetter);
                bitLength += bitsPerLetter;
            }
            else {
                bits >>= bitsPerLetter;
            }
        }
        const chunkOffset = (i / 4) * 3;
        bits >>= bitLength % bitsPerByte;
        const byteLength = Math.floor(bitLength / bitsPerByte);
        for (let k = 0; k < byteLength; k++) {
            const offset = (byteLength - k - 1) * bitsPerByte;
            dataView.setUint8(chunkOffset + k, (bits & (255 << offset)) >> offset);
        }
    }
    return new Uint8Array(out);
};

const streamCollector$1 = async (stream) => {
    if ((typeof Blob === "function" && stream instanceof Blob) || stream.constructor?.name === "Blob") {
        if (Blob.prototype.arrayBuffer !== undefined) {
            return new Uint8Array(await stream.arrayBuffer());
        }
        return collectBlob(stream);
    }
    return collectStream(stream);
};
async function collectBlob(blob) {
    const base64 = await readToBase64(blob);
    const arrayBuffer = fromBase64(base64);
    return new Uint8Array(arrayBuffer);
}
async function collectStream(stream) {
    const chunks = [];
    const reader = stream.getReader();
    let isDone = false;
    let length = 0;
    while (!isDone) {
        const { done, value } = await reader.read();
        if (value) {
            chunks.push(value);
            length += value.length;
        }
        isDone = done;
    }
    const collected = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
        collected.set(chunk, offset);
        offset += chunk.length;
    }
    return collected;
}
function readToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (reader.readyState !== 2) {
                return reject(new Error("Reader aborted too early"));
            }
            const result = (reader.result ?? "");
            const commaIndex = result.indexOf(",");
            const dataOffset = commaIndex > -1 ? commaIndex + 1 : result.length;
            resolve(result.substring(dataOffset));
        };
        reader.onabort = () => reject(new Error("Read aborted"));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

const ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED$1 = "The stream has already been transformed.";
const sdkStreamMixin$1 = (stream) => {
    if (!isBlobInstance(stream) && !isReadableStream(stream)) {
        const name = stream?.__proto__?.constructor?.name || stream;
        throw new Error(`Unexpected stream implementation, expect Blob or ReadableStream, got ${name}`);
    }
    let transformed = false;
    const transformToByteArray = async () => {
        if (transformed) {
            throw new Error(ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED$1);
        }
        transformed = true;
        return await streamCollector$1(stream);
    };
    const blobToWebStream = (blob) => {
        if (typeof blob.stream !== "function") {
            throw new Error("Cannot transform payload Blob to web stream. Please make sure the Blob.stream() is polyfilled.\n" +
                "If you are using React Native, this API is not yet supported, see: https://react-native.canny.io/feature-requests/p/fetch-streaming-body");
        }
        return blob.stream();
    };
    return Object.assign(stream, {
        transformToByteArray: transformToByteArray,
        transformToString: async (encoding) => {
            const buf = await transformToByteArray();
            if (encoding === "base64") {
                return toBase64(buf);
            }
            else if (encoding === "hex") {
                return toHex(buf);
            }
            else if (encoding === undefined || encoding === "utf8" || encoding === "utf-8") {
                return toUtf8(buf);
            }
            else if (typeof TextDecoder === "function") {
                return new TextDecoder(encoding).decode(buf);
            }
            else {
                throw new Error("TextDecoder is not available, please make sure polyfill is provided.");
            }
        },
        transformToWebStream: () => {
            if (transformed) {
                throw new Error(ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED$1);
            }
            transformed = true;
            if (isBlobInstance(stream)) {
                return blobToWebStream(stream);
            }
            else if (isReadableStream(stream)) {
                return stream;
            }
            else {
                throw new Error(`Cannot transform payload to web stream, got ${stream}`);
            }
        },
    });
};
const isBlobInstance = (stream) => typeof Blob === "function" && stream instanceof Blob;

class Collector extends node_stream.Writable {
    bufferedBytes = [];
    _write(chunk, encoding, callback) {
        this.bufferedBytes.push(chunk);
        callback();
    }
}
const isReadableStreamInstance = (stream) => typeof ReadableStream === "function" && stream instanceof ReadableStream;
async function collectReadableStream(stream) {
    const chunks = [];
    const reader = stream.getReader();
    let isDone = false;
    let length = 0;
    while (!isDone) {
        const { done, value } = await reader.read();
        if (value) {
            chunks.push(value);
            length += value.length;
        }
        isDone = done;
    }
    const collected = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
        collected.set(chunk, offset);
        offset += chunk.length;
    }
    return collected;
}
const streamCollector = (stream) => {
    if (isReadableStreamInstance(stream)) {
        return collectReadableStream(stream);
    }
    return new Promise((resolve, reject) => {
        const collector = new Collector();
        stream.pipe(collector);
        stream.on("error", (err) => {
            collector.end();
            reject(err);
        });
        collector.on("error", reject);
        collector.on("finish", function () {
            const bytes = new Uint8Array(Buffer.concat(this.bufferedBytes));
            resolve(bytes);
        });
    });
};

const ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED = "The stream has already been transformed.";
const sdkStreamMixin = (stream) => {
    if (!(stream instanceof node_stream.Readable)) {
        try {
            return sdkStreamMixin$1(stream);
        }
        catch (e) {
            const name = stream?.__proto__?.constructor?.name || stream;
            throw new Error(`Unexpected stream implementation, expect Stream.Readable instance, got ${name}`);
        }
    }
    let transformed = false;
    const transformToByteArray = async () => {
        if (transformed) {
            throw new Error(ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED);
        }
        transformed = true;
        return await streamCollector(stream);
    };
    return Object.assign(stream, {
        transformToByteArray,
        transformToString: async (encoding) => {
            const buf = await transformToByteArray();
            if (encoding === undefined || Buffer.isEncoding(encoding)) {
                return fromArrayBuffer(buf.buffer, buf.byteOffset, buf.byteLength).toString(encoding);
            }
            else {
                const decoder = new TextDecoder(encoding);
                return decoder.decode(buf);
            }
        },
        transformToWebStream: () => {
            if (transformed) {
                throw new Error(ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED);
            }
            if (stream.readableFlowing !== null) {
                throw new Error("The stream has been consumed by other callbacks.");
            }
            if (typeof node_stream.Readable.toWeb !== "function") {
                throw new Error("Readable.toWeb() is not supported. Please ensure a polyfill is available.");
            }
            transformed = true;
            return node_stream.Readable.toWeb(stream);
        },
    });
};

async function splitStream$1(stream) {
    if (typeof stream.stream === "function") {
        stream = stream.stream();
    }
    const readableStream = stream;
    return readableStream.tee();
}

async function splitStream(stream) {
    if (isReadableStream(stream) || isBlob(stream)) {
        return splitStream$1(stream);
    }
    const stream1 = new node_stream.PassThrough();
    const stream2 = new node_stream.PassThrough();
    stream.pipe(stream1);
    stream.pipe(stream2);
    return [stream1, stream2];
}

class Uint8ArrayBlobAdapter extends bindUint8ArrayBlobAdapter(toUtf8$1, fromUtf8$1, toBase64$1, fromBase64$1) {
}
const _getRandomValues = node_crypto.getRandomValues;
const v4 = bindV4(_getRandomValues);
const generateIdempotencyToken = v4;

exports.ChecksumStream = ChecksumStream$1;
exports.Hash = Hash;
exports.LazyJsonString = LazyJsonString;
exports.NumericValue = NumericValue;
exports.Uint8ArrayBlobAdapter = Uint8ArrayBlobAdapter;
exports._parseEpochTimestamp = _parseEpochTimestamp;
exports._parseRfc3339DateTimeWithOffset = _parseRfc3339DateTimeWithOffset;
exports._parseRfc7231DateTime = _parseRfc7231DateTime;
exports.calculateBodyLength = calculateBodyLength;
exports.copyDocumentWithTransform = copyDocumentWithTransform;
exports.createBufferedReadable = createBufferedReadable;
exports.createChecksumStream = createChecksumStream;
exports.dateToUtcString = dateToUtcString;
exports.deserializerMiddleware = deserializerMiddleware;
exports.deserializerMiddlewareOption = deserializerMiddlewareOption;
exports.expectBoolean = expectBoolean;
exports.expectByte = expectByte;
exports.expectFloat32 = expectFloat32;
exports.expectInt = expectInt;
exports.expectInt32 = expectInt32;
exports.expectLong = expectLong;
exports.expectNonNull = expectNonNull;
exports.expectNumber = expectNumber;
exports.expectObject = expectObject;
exports.expectShort = expectShort;
exports.expectString = expectString;
exports.expectUnion = expectUnion;
exports.fromArrayBuffer = fromArrayBuffer;
exports.fromBase64 = fromBase64$1;
exports.fromHex = fromHex;
exports.fromString = fromString;
exports.fromUtf8 = fromUtf8$1;
exports.generateIdempotencyToken = generateIdempotencyToken;
exports.getAwsChunkedEncodingStream = getAwsChunkedEncodingStream;
exports.getSerdePlugin = getSerdePlugin;
exports.handleFloat = handleFloat;
exports.headStream = headStream;
exports.isArrayBuffer = isArrayBuffer;
exports.isBlob = isBlob;
exports.isReadableStream = isReadableStream;
exports.limitedParseDouble = limitedParseDouble;
exports.limitedParseFloat = limitedParseFloat;
exports.limitedParseFloat32 = limitedParseFloat32;
exports.logger = logger;
exports.nv = nv;
exports.parseBoolean = parseBoolean;
exports.parseEpochTimestamp = parseEpochTimestamp;
exports.parseRfc3339DateTime = parseRfc3339DateTime;
exports.parseRfc3339DateTimeWithOffset = parseRfc3339DateTimeWithOffset;
exports.parseRfc7231DateTime = parseRfc7231DateTime;
exports.quoteHeader = quoteHeader;
exports.sdkStreamMixin = sdkStreamMixin;
exports.serializerMiddleware = serializerMiddleware;
exports.serializerMiddlewareOption = serializerMiddlewareOption;
exports.splitEvery = splitEvery;
exports.splitHeader = splitHeader;
exports.splitStream = splitStream;
exports.strictParseByte = strictParseByte;
exports.strictParseDouble = strictParseDouble;
exports.strictParseFloat = strictParseFloat;
exports.strictParseFloat32 = strictParseFloat32;
exports.strictParseInt = strictParseInt;
exports.strictParseInt32 = strictParseInt32;
exports.strictParseLong = strictParseLong;
exports.strictParseShort = strictParseShort;
exports.toBase64 = toBase64$1;
exports.toHex = toHex;
exports.toUint8Array = toUint8Array;
exports.toUtf8 = toUtf8$1;
exports.v4 = v4;


/***/ }),

/***/ 84878:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var protocols = __webpack_require__(45598);
var serde = __webpack_require__(38622);

function createRequest(url, requestOptions) {
    return new Request(url, requestOptions);
}

function requestTimeout(timeoutInMs = 0) {
    return new Promise((resolve, reject) => {
        if (timeoutInMs) {
            setTimeout(() => {
                const timeoutError = new Error(`Request did not complete within ${timeoutInMs} ms`);
                timeoutError.name = "TimeoutError";
                reject(timeoutError);
            }, timeoutInMs);
        }
    });
}

const keepAliveSupport = {
    supported: undefined,
};
class FetchHttpHandler {
    config;
    configProvider;
    static create(instanceOrOptions) {
        if (typeof instanceOrOptions?.handle === "function") {
            return instanceOrOptions;
        }
        return new FetchHttpHandler(instanceOrOptions);
    }
    constructor(options) {
        if (typeof options === "function") {
            this.configProvider = options().then((opts) => opts || {});
        }
        else {
            this.config = options ?? {};
            this.configProvider = Promise.resolve(this.config);
        }
        if (keepAliveSupport.supported === undefined) {
            keepAliveSupport.supported = Boolean(typeof Request !== "undefined" && "keepalive" in createRequest("https://[::1]"));
        }
    }
    destroy() {
    }
    async handle(request, { abortSignal, requestTimeout: requestTimeout$1 } = {}) {
        if (!this.config) {
            this.config = await this.configProvider;
        }
        const requestTimeoutInMs = requestTimeout$1 ?? this.config.requestTimeout;
        const keepAlive = this.config.keepAlive === true;
        const credentials = this.config.credentials;
        if (abortSignal?.aborted) {
            const abortError = buildAbortError(abortSignal);
            return Promise.reject(abortError);
        }
        let path = request.path;
        const queryString = protocols.buildQueryString(request.query || {});
        if (queryString) {
            path += `?${queryString}`;
        }
        if (request.fragment) {
            path += `#${request.fragment}`;
        }
        let auth = "";
        if (request.username != null || request.password != null) {
            const username = request.username ?? "";
            const password = request.password ?? "";
            auth = `${username}:${password}@`;
        }
        const { port, method } = request;
        const url = `${request.protocol}//${auth}${request.hostname}${port ? `:${port}` : ""}${path}`;
        const body = method === "GET" || method === "HEAD" ? undefined : request.body;
        const requestOptions = {
            body,
            headers: new Headers(request.headers),
            method: method,
            credentials,
        };
        if (this.config?.cache) {
            requestOptions.cache = this.config.cache;
        }
        if (body) {
            requestOptions.duplex = "half";
        }
        if (typeof AbortController !== "undefined") {
            requestOptions.signal = abortSignal;
        }
        if (keepAliveSupport.supported) {
            requestOptions.keepalive = keepAlive;
        }
        if (typeof this.config.requestInit === "function") {
            Object.assign(requestOptions, this.config.requestInit(request));
        }
        let removeSignalEventListener = () => { };
        const fetchRequest = createRequest(url, requestOptions);
        const raceOfPromises = [
            fetch(fetchRequest).then((response) => {
                const fetchHeaders = response.headers;
                const transformedHeaders = {};
                for (const pair of fetchHeaders.entries()) {
                    transformedHeaders[pair[0]] = pair[1];
                }
                const hasReadableStream = response.body != undefined;
                if (!hasReadableStream) {
                    return response.blob().then((body) => ({
                        response: new protocols.HttpResponse({
                            headers: transformedHeaders,
                            reason: response.statusText,
                            statusCode: response.status,
                            body,
                        }),
                    }));
                }
                return {
                    response: new protocols.HttpResponse({
                        headers: transformedHeaders,
                        reason: response.statusText,
                        statusCode: response.status,
                        body: response.body,
                    }),
                };
            }),
            requestTimeout(requestTimeoutInMs),
        ];
        if (abortSignal) {
            raceOfPromises.push(new Promise((resolve, reject) => {
                const onAbort = () => {
                    const abortError = buildAbortError(abortSignal);
                    reject(abortError);
                };
                if (typeof abortSignal.addEventListener === "function") {
                    const signal = abortSignal;
                    signal.addEventListener("abort", onAbort, { once: true });
                    removeSignalEventListener = () => signal.removeEventListener("abort", onAbort);
                }
                else {
                    abortSignal.onabort = onAbort;
                }
            }));
        }
        return Promise.race(raceOfPromises).finally(removeSignalEventListener);
    }
    updateHttpClientConfig(key, value) {
        this.config = undefined;
        this.configProvider = this.configProvider.then((config) => {
            config[key] = value;
            return config;
        });
    }
    httpHandlerConfigs() {
        return this.config ?? {};
    }
}
function buildAbortError(abortSignal) {
    const reason = abortSignal && typeof abortSignal === "object" && "reason" in abortSignal
        ? abortSignal.reason
        : undefined;
    if (reason) {
        if (reason instanceof Error) {
            const abortError = new Error("Request aborted");
            abortError.name = "AbortError";
            abortError.cause = reason;
            return abortError;
        }
        const abortError = new Error(String(reason));
        abortError.name = "AbortError";
        return abortError;
    }
    const abortError = new Error("Request aborted");
    abortError.name = "AbortError";
    return abortError;
}

const streamCollector = async (stream) => {
    if ((typeof Blob === "function" && stream instanceof Blob) || stream.constructor?.name === "Blob") {
        if (Blob.prototype.arrayBuffer !== undefined) {
            return new Uint8Array(await stream.arrayBuffer());
        }
        return collectBlob(stream);
    }
    return collectStream(stream);
};
async function collectBlob(blob) {
    const base64 = await readToBase64(blob);
    const arrayBuffer = serde.fromBase64(base64);
    return new Uint8Array(arrayBuffer);
}
async function collectStream(stream) {
    const chunks = [];
    const reader = stream.getReader();
    let isDone = false;
    let length = 0;
    while (!isDone) {
        const { done, value } = await reader.read();
        if (value) {
            chunks.push(value);
            length += value.length;
        }
        isDone = done;
    }
    const collected = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
        collected.set(chunk, offset);
        offset += chunk.length;
    }
    return collected;
}
function readToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (reader.readyState !== 2) {
                return reject(new Error("Reader aborted too early"));
            }
            const result = (reader.result ?? "");
            const commaIndex = result.indexOf(",");
            const dataOffset = commaIndex > -1 ? commaIndex + 1 : result.length;
            resolve(result.substring(dataOffset));
        };
        reader.onabort = () => reject(new Error("Read aborted"));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

exports.FetchHttpHandler = FetchHttpHandler;
exports.keepAliveSupport = keepAliveSupport;
exports.streamCollector = streamCollector;


/***/ }),

/***/ 1767:
/***/ ((module) => {

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  isArrayBuffer: () => isArrayBuffer
});
module.exports = __toCommonJS(src_exports);
var isArrayBuffer = /* @__PURE__ */ __name((arg) => typeof ArrayBuffer === "function" && arg instanceof ArrayBuffer || Object.prototype.toString.call(arg) === "[object ArrayBuffer]", "isArrayBuffer");
// Annotate the CommonJS export names for ESM import in node:

0 && (0);



/***/ }),

/***/ 71745:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var node_https = __webpack_require__(44708);
var protocols = __webpack_require__(45598);
var node_stream = __webpack_require__(57075);
var http2 = __webpack_require__(32467);

function buildAbortError(abortSignal) {
    const reason = abortSignal && typeof abortSignal === "object" && "reason" in abortSignal
        ? abortSignal.reason
        : undefined;
    if (reason) {
        if (reason instanceof Error) {
            const abortError = new Error("Request aborted");
            abortError.name = "AbortError";
            abortError.cause = reason;
            return abortError;
        }
        const abortError = new Error(String(reason));
        abortError.name = "AbortError";
        return abortError;
    }
    const abortError = new Error("Request aborted");
    abortError.name = "AbortError";
    return abortError;
}

const NODEJS_TIMEOUT_ERROR_CODES = ["ECONNRESET", "EPIPE", "ETIMEDOUT"];

const getTransformedHeaders = (headers) => {
    const transformedHeaders = {};
    for (const name in headers) {
        const headerValues = headers[name];
        transformedHeaders[name] = Array.isArray(headerValues) ? headerValues.join(",") : headerValues;
    }
    return transformedHeaders;
};

const timing = {
    setTimeout: (cb, ms) => setTimeout(cb, ms),
    clearTimeout: (timeoutId) => clearTimeout(timeoutId),
};

const DEFER_EVENT_LISTENER_TIME$2 = 1000;
const setConnectionTimeout = (request, reject, timeoutInMs = 0) => {
    if (!timeoutInMs) {
        return -1;
    }
    const registerTimeout = (offset) => {
        const timeoutId = timing.setTimeout(() => {
            request.destroy();
            reject(Object.assign(new Error(`@smithy/node-http-handler - the request socket did not establish a connection with the server within the configured timeout of ${timeoutInMs} ms.`), {
                name: "TimeoutError",
            }));
        }, timeoutInMs - offset);
        const doWithSocket = (socket) => {
            if (socket?.connecting) {
                socket.on("connect", () => {
                    timing.clearTimeout(timeoutId);
                });
            }
            else {
                timing.clearTimeout(timeoutId);
            }
        };
        if (request.socket) {
            doWithSocket(request.socket);
        }
        else {
            request.on("socket", doWithSocket);
        }
    };
    if (timeoutInMs < 2000) {
        registerTimeout(0);
        return 0;
    }
    return timing.setTimeout(registerTimeout.bind(null, DEFER_EVENT_LISTENER_TIME$2), DEFER_EVENT_LISTENER_TIME$2);
};

const setRequestTimeout = (req, reject, timeoutInMs = 0, throwOnRequestTimeout, logger) => {
    if (timeoutInMs) {
        return timing.setTimeout(() => {
            let msg = `@smithy/node-http-handler - [${throwOnRequestTimeout ? "ERROR" : "WARN"}] a request has exceeded the configured ${timeoutInMs} ms requestTimeout.`;
            if (throwOnRequestTimeout) {
                const error = Object.assign(new Error(msg), {
                    name: "TimeoutError",
                    code: "ETIMEDOUT",
                });
                req.destroy(error);
                reject(error);
            }
            else {
                msg += ` Init client requestHandler with throwOnRequestTimeout=true to turn this into an error.`;
                logger?.warn?.(msg);
            }
        }, timeoutInMs);
    }
    return -1;
};

const DEFER_EVENT_LISTENER_TIME$1 = 3000;
const setSocketKeepAlive = (request, { keepAlive, keepAliveMsecs }, deferTimeMs = DEFER_EVENT_LISTENER_TIME$1) => {
    if (keepAlive !== true) {
        return -1;
    }
    const registerListener = () => {
        if (request.socket) {
            request.socket.setKeepAlive(keepAlive, keepAliveMsecs || 0);
        }
        else {
            request.on("socket", (socket) => {
                socket.setKeepAlive(keepAlive, keepAliveMsecs || 0);
            });
        }
    };
    if (deferTimeMs === 0) {
        registerListener();
        return 0;
    }
    return timing.setTimeout(registerListener, deferTimeMs);
};

const DEFER_EVENT_LISTENER_TIME = 3000;
const setSocketTimeout = (request, reject, timeoutInMs = 0) => {
    const registerTimeout = (offset) => {
        const timeout = timeoutInMs - offset;
        const onTimeout = () => {
            request.destroy();
            reject(Object.assign(new Error(`@smithy/node-http-handler - the request socket timed out after ${timeoutInMs} ms of inactivity (configured by client requestHandler).`), { name: "TimeoutError" }));
        };
        if (request.socket) {
            request.socket.setTimeout(timeout, onTimeout);
            request.on("close", () => request.socket?.removeListener("timeout", onTimeout));
        }
        else {
            request.setTimeout(timeout, onTimeout);
        }
    };
    if (0 < timeoutInMs && timeoutInMs < 6000) {
        registerTimeout(0);
        return 0;
    }
    return timing.setTimeout(registerTimeout.bind(null, timeoutInMs === 0 ? 0 : DEFER_EVENT_LISTENER_TIME), DEFER_EVENT_LISTENER_TIME);
};

const MIN_WAIT_TIME = 6_000;
async function writeRequestBody(httpRequest, request, maxContinueTimeoutMs = MIN_WAIT_TIME, externalAgent = false) {
    const headers = request.headers;
    const expect = headers ? headers.Expect || headers.expect : undefined;
    let timeoutId = -1;
    let sendBody = true;
    if (!externalAgent && expect === "100-continue") {
        sendBody = await Promise.race([
            new Promise((resolve) => {
                timeoutId = Number(timing.setTimeout(() => resolve(true), Math.max(MIN_WAIT_TIME, maxContinueTimeoutMs)));
            }),
            new Promise((resolve) => {
                httpRequest.on("continue", () => {
                    timing.clearTimeout(timeoutId);
                    resolve(true);
                });
                httpRequest.on("response", () => {
                    timing.clearTimeout(timeoutId);
                    resolve(false);
                });
                httpRequest.on("error", () => {
                    timing.clearTimeout(timeoutId);
                    resolve(false);
                });
            }),
        ]);
    }
    if (sendBody) {
        writeBody(httpRequest, request.body);
    }
}
function writeBody(httpRequest, body) {
    if (body instanceof node_stream.Readable) {
        body.pipe(httpRequest);
        return;
    }
    if (body) {
        const isBuffer = Buffer.isBuffer(body);
        const isString = typeof body === "string";
        if (isBuffer || isString) {
            if (isBuffer && body.byteLength === 0) {
                httpRequest.end();
            }
            else {
                httpRequest.end(body);
            }
            return;
        }
        const uint8 = body;
        if (typeof uint8 === "object" &&
            uint8.buffer &&
            typeof uint8.byteOffset === "number" &&
            typeof uint8.byteLength === "number") {
            httpRequest.end(Buffer.from(uint8.buffer, uint8.byteOffset, uint8.byteLength));
            return;
        }
        httpRequest.end(Buffer.from(body));
        return;
    }
    httpRequest.end();
}

const DEFAULT_REQUEST_TIMEOUT = 0;
let hAgent = undefined;
let hRequest = undefined;
class NodeHttpHandler {
    config;
    configProvider;
    socketWarningTimestamp = 0;
    externalAgent = false;
    metadata = { handlerProtocol: "http/1.1" };
    static create(instanceOrOptions) {
        if (typeof instanceOrOptions?.handle === "function") {
            return instanceOrOptions;
        }
        return new NodeHttpHandler(instanceOrOptions);
    }
    static checkSocketUsage(agent, socketWarningTimestamp, logger = console) {
        const { sockets, requests, maxSockets } = agent;
        if (typeof maxSockets !== "number" || maxSockets === Infinity) {
            return socketWarningTimestamp;
        }
        const interval = 15_000;
        if (Date.now() - interval < socketWarningTimestamp) {
            return socketWarningTimestamp;
        }
        if (sockets && requests) {
            for (const origin in sockets) {
                const socketsInUse = sockets[origin]?.length ?? 0;
                const requestsEnqueued = requests[origin]?.length ?? 0;
                if (socketsInUse >= maxSockets && requestsEnqueued >= 2 * maxSockets) {
                    logger?.warn?.(`@smithy/node-http-handler:WARN - socket usage at capacity=${socketsInUse} and ${requestsEnqueued} additional requests are enqueued.
See https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-configuring-maxsockets.html
or increase socketAcquisitionWarningTimeout=(millis) in the NodeHttpHandler config.`);
                    return Date.now();
                }
            }
        }
        return socketWarningTimestamp;
    }
    constructor(options) {
        this.configProvider = new Promise((resolve, reject) => {
            if (typeof options === "function") {
                options()
                    .then((_options) => {
                    resolve(this.resolveDefaultConfig(_options));
                })
                    .catch(reject);
            }
            else {
                resolve(this.resolveDefaultConfig(options));
            }
        });
    }
    destroy() {
        this.config?.httpAgent?.destroy();
        this.config?.httpsAgent?.destroy();
    }
    async handle(request, { abortSignal, requestTimeout } = {}) {
        if (!this.config) {
            this.config = await this.configProvider;
        }
        const config = this.config;
        const isSSL = request.protocol === "https:";
        if (!isSSL && !this.config.httpAgent) {
            this.config.httpAgent = await this.config.httpAgentProvider();
        }
        return new Promise((_resolve, _reject) => {
            let writeRequestBodyPromise = undefined;
            let socketWarningTimeoutId = -1;
            let connectionTimeoutId = -1;
            let requestTimeoutId = -1;
            let socketTimeoutId = -1;
            let keepAliveTimeoutId = -1;
            const clearTimeouts = () => {
                timing.clearTimeout(socketWarningTimeoutId);
                timing.clearTimeout(connectionTimeoutId);
                timing.clearTimeout(requestTimeoutId);
                timing.clearTimeout(socketTimeoutId);
                timing.clearTimeout(keepAliveTimeoutId);
            };
            const resolve = async (arg) => {
                await writeRequestBodyPromise;
                clearTimeouts();
                _resolve(arg);
            };
            const reject = async (arg) => {
                await writeRequestBodyPromise;
                clearTimeouts();
                _reject(arg);
            };
            if (abortSignal?.aborted) {
                const abortError = buildAbortError(abortSignal);
                reject(abortError);
                return;
            }
            const headers = request.headers;
            const expectContinue = headers ? (headers.Expect ?? headers.expect) === "100-continue" : false;
            let agent = isSSL ? config.httpsAgent : config.httpAgent;
            if (expectContinue && !this.externalAgent) {
                agent = new (isSSL ? node_https.Agent : hAgent)({
                    keepAlive: false,
                    maxSockets: Infinity,
                });
            }
            socketWarningTimeoutId = timing.setTimeout(() => {
                this.socketWarningTimestamp = NodeHttpHandler.checkSocketUsage(agent, this.socketWarningTimestamp, config.logger);
            }, config.socketAcquisitionWarningTimeout ?? (config.requestTimeout ?? 2000) + (config.connectionTimeout ?? 1000));
            const queryString = request.query ? protocols.buildQueryString(request.query) : "";
            let auth = undefined;
            if (request.username != null || request.password != null) {
                const username = request.username ?? "";
                const password = request.password ?? "";
                auth = `${username}:${password}`;
            }
            let path = request.path;
            if (queryString) {
                path += `?${queryString}`;
            }
            if (request.fragment) {
                path += `#${request.fragment}`;
            }
            let hostname = request.hostname ?? "";
            if (hostname[0] === "[" && hostname.endsWith("]")) {
                hostname = request.hostname.slice(1, -1);
            }
            else {
                hostname = request.hostname;
            }
            const nodeHttpsOptions = {
                headers: request.headers,
                host: hostname,
                method: request.method,
                path,
                port: request.port,
                agent,
                auth,
            };
            const requestFunc = isSSL ? node_https.request : hRequest;
            const req = requestFunc(nodeHttpsOptions, (res) => {
                const httpResponse = new protocols.HttpResponse({
                    statusCode: res.statusCode || -1,
                    reason: res.statusMessage,
                    headers: getTransformedHeaders(res.headers),
                    body: res,
                });
                resolve({ response: httpResponse });
            });
            req.on("error", (err) => {
                if (NODEJS_TIMEOUT_ERROR_CODES.includes(err.code)) {
                    reject(Object.assign(err, { name: "TimeoutError" }));
                }
                else {
                    reject(err);
                }
            });
            if (abortSignal) {
                const onAbort = () => {
                    req.destroy();
                    const abortError = buildAbortError(abortSignal);
                    reject(abortError);
                };
                if (typeof abortSignal.addEventListener === "function") {
                    const signal = abortSignal;
                    signal.addEventListener("abort", onAbort, { once: true });
                    req.once("close", () => signal.removeEventListener("abort", onAbort));
                }
                else {
                    abortSignal.onabort = onAbort;
                }
            }
            const effectiveRequestTimeout = requestTimeout ?? config.requestTimeout;
            connectionTimeoutId = setConnectionTimeout(req, reject, config.connectionTimeout);
            requestTimeoutId = setRequestTimeout(req, reject, effectiveRequestTimeout, config.throwOnRequestTimeout, config.logger ?? console);
            socketTimeoutId = setSocketTimeout(req, reject, config.socketTimeout);
            const httpAgent = nodeHttpsOptions.agent;
            if (typeof httpAgent === "object" && "keepAlive" in httpAgent) {
                keepAliveTimeoutId = setSocketKeepAlive(req, {
                    keepAlive: httpAgent.keepAlive,
                    keepAliveMsecs: httpAgent.keepAliveMsecs,
                });
            }
            writeRequestBodyPromise = writeRequestBody(req, request, effectiveRequestTimeout, this.externalAgent).catch((e) => {
                clearTimeouts();
                return _reject(e);
            });
        });
    }
    updateHttpClientConfig(key, value) {
        this.config = undefined;
        this.configProvider = this.configProvider.then((config) => {
            return {
                ...config,
                [key]: value,
            };
        });
    }
    httpHandlerConfigs() {
        return this.config ?? {};
    }
    resolveDefaultConfig(options) {
        const { requestTimeout, connectionTimeout, socketTimeout, socketAcquisitionWarningTimeout, httpAgent, httpsAgent, throwOnRequestTimeout, logger, } = options || {};
        const keepAlive = true;
        const maxSockets = 50;
        return {
            connectionTimeout,
            requestTimeout,
            socketTimeout,
            socketAcquisitionWarningTimeout,
            throwOnRequestTimeout,
            httpAgentProvider: async () => {
                const { Agent, request } = await Promise.resolve(/* import() */).then(__webpack_require__.t.bind(__webpack_require__, 37067, 23));
                hRequest = request;
                hAgent = Agent;
                if (httpAgent instanceof hAgent || typeof httpAgent?.destroy === "function") {
                    this.externalAgent = true;
                    return httpAgent;
                }
                return new hAgent({ keepAlive, maxSockets, ...httpAgent });
            },
            httpsAgent: (() => {
                if (httpsAgent instanceof node_https.Agent || typeof httpsAgent?.destroy === "function") {
                    this.externalAgent = true;
                    return httpsAgent;
                }
                return new node_https.Agent({ keepAlive, maxSockets, ...httpsAgent });
            })(),
            logger,
        };
    }
}

const ids = new Uint16Array(1);
class ClientHttp2SessionRef {
    id = ids[0]++;
    total = 0;
    max = 0;
    session;
    refs = 0;
    constructor(session) {
        session.unref();
        this.session = session;
    }
    retain() {
        if (this.session.destroyed) {
            throw new Error("@smithy/node-http-handler - cannot acquire reference to destroyed session.");
        }
        this.refs += 1;
        this.total += 1;
        this.max = Math.max(this.refs, this.max);
        this.session.ref();
    }
    free() {
        if (this.session.destroyed) {
            return;
        }
        this.refs -= 1;
        if (this.refs === 0) {
            this.session.unref();
        }
        if (this.refs < 0) {
            throw new Error("@smithy/node-http-handler - ClientHttp2Session refcount at zero, cannot decrement.");
        }
    }
    deref() {
        return this.session;
    }
    close() {
        if (!this.session.closed) {
            this.session.close();
        }
    }
    destroy() {
        this.refs = 0;
        if (!this.session.destroyed) {
            this.session.destroy();
        }
    }
    useCount() {
        return this.refs;
    }
}

class NodeHttp2ConnectionPool {
    sessions = [];
    maxConcurrency = 0;
    constructor(sessions) {
        this.sessions = (sessions ?? []).map((session) => new ClientHttp2SessionRef(session));
    }
    poll() {
        let cleanup = false;
        for (const session of this.sessions) {
            if (session.deref().destroyed) {
                cleanup = true;
                continue;
            }
            if (!this.maxConcurrency || session.useCount() < this.maxConcurrency) {
                return session;
            }
        }
        if (cleanup) {
            for (const session of this.sessions) {
                if (session.deref().destroyed) {
                    this.remove(session);
                }
            }
        }
    }
    offerLast(ref) {
        this.sessions.push(ref);
    }
    remove(ref) {
        const ix = this.sessions.indexOf(ref);
        if (ix > -1) {
            this.sessions.splice(ix, 1);
        }
    }
    [Symbol.iterator]() {
        return this.sessions[Symbol.iterator]();
    }
    setMaxConcurrency(maxConcurrency) {
        this.maxConcurrency = maxConcurrency;
    }
    destroy(ref) {
        this.remove(ref);
        ref.destroy();
    }
}

class NodeHttp2ConnectionManager {
    config;
    connectOptions;
    connectionPools = new Map();
    constructor(config) {
        this.config = config;
        if (this.config.maxConcurrency && this.config.maxConcurrency <= 0) {
            throw new RangeError("maxConcurrency must be greater than zero.");
        }
    }
    lease(requestContext, connectionConfiguration) {
        const url = this.getUrlString(requestContext);
        const pool = this.getPool(url);
        if (!this.config.disableConcurrency && !connectionConfiguration.isEventStream) {
            const available = pool.poll();
            if (available) {
                available.retain();
                return available;
            }
        }
        const ref = new ClientHttp2SessionRef(this.connect(url));
        const session = ref.deref();
        if (this.config.maxConcurrency) {
            session.settings({ maxConcurrentStreams: this.config.maxConcurrency }, (err) => {
                if (err) {
                    throw new Error("Fail to set maxConcurrentStreams to " +
                        this.config.maxConcurrency +
                        "when creating new session for " +
                        requestContext.destination.toString());
                }
            });
        }
        const graceful = () => {
            this.removeFromPoolAndClose(url, ref);
        };
        const ensureDestroyed = () => {
            this.removeFromPoolAndCheckedDestroy(url, ref);
        };
        session.on("goaway", graceful);
        session.on("error", ensureDestroyed);
        session.on("frameError", ensureDestroyed);
        session.on("close", ensureDestroyed);
        if (connectionConfiguration.requestTimeout) {
            session.setTimeout(connectionConfiguration.requestTimeout, ensureDestroyed);
        }
        pool.offerLast(ref);
        ref.retain();
        return ref;
    }
    release(_requestContext, ref) {
        ref.free();
    }
    createIsolatedSession(requestContext, connectionConfiguration) {
        const url = this.getUrlString(requestContext);
        const ref = new ClientHttp2SessionRef(this.connect(url));
        const session = ref.deref();
        session.settings({ maxConcurrentStreams: 1 });
        const ensureDestroyed = () => {
            ref.destroy();
        };
        session.on("error", ensureDestroyed);
        session.on("frameError", ensureDestroyed);
        session.on("close", ensureDestroyed);
        if (connectionConfiguration.requestTimeout) {
            session.setTimeout(connectionConfiguration.requestTimeout, ensureDestroyed);
        }
        ref.retain();
        return ref;
    }
    destroy() {
        for (const [url, connectionPool] of this.connectionPools) {
            for (const session of [...connectionPool]) {
                session.destroy();
            }
            this.connectionPools.delete(url);
        }
    }
    setMaxConcurrentStreams(maxConcurrentStreams) {
        if (maxConcurrentStreams && maxConcurrentStreams <= 0) {
            throw new RangeError("maxConcurrentStreams must be greater than zero.");
        }
        this.config.maxConcurrency = maxConcurrentStreams;
        for (const pool of this.connectionPools.values()) {
            pool.setMaxConcurrency(maxConcurrentStreams);
        }
    }
    setDisableConcurrentStreams(disableConcurrentStreams) {
        this.config.disableConcurrency = disableConcurrentStreams;
    }
    setNodeHttp2ConnectOptions(nodeHttp2ConnectOptions) {
        this.connectOptions = nodeHttp2ConnectOptions;
    }
    debug() {
        const pools = {};
        for (const [url, pool] of this.connectionPools) {
            const sessions = [];
            for (const ref of pool) {
                sessions.push({
                    id: ref.id,
                    active: ref.useCount(),
                    maxConcurrent: ref.max,
                    totalRequests: ref.total,
                });
            }
            pools[url] = { sessions };
        }
        return pools;
    }
    removeFromPoolAndClose(authority, ref) {
        this.connectionPools.get(authority)?.remove(ref);
        ref.close();
    }
    removeFromPoolAndCheckedDestroy(authority, ref) {
        this.connectionPools.get(authority)?.remove(ref);
        ref.destroy();
    }
    getPool(url) {
        if (!this.connectionPools.has(url)) {
            const pool = new NodeHttp2ConnectionPool();
            if (this.config.maxConcurrency) {
                pool.setMaxConcurrency(this.config.maxConcurrency);
            }
            this.connectionPools.set(url, pool);
        }
        return this.connectionPools.get(url);
    }
    getUrlString(request) {
        return request.destination.toString();
    }
    connect(url) {
        return this.connectOptions === undefined ? http2.connect(url) : http2.connect(url, this.connectOptions);
    }
}

class NodeHttp2Handler {
    config;
    configProvider;
    metadata = { handlerProtocol: "h2" };
    connectionManager = new NodeHttp2ConnectionManager({});
    static create(instanceOrOptions) {
        if (typeof instanceOrOptions?.handle === "function") {
            return instanceOrOptions;
        }
        return new NodeHttp2Handler(instanceOrOptions);
    }
    constructor(options) {
        this.configProvider = new Promise((resolve, reject) => {
            if (typeof options === "function") {
                options()
                    .then((opts) => {
                    resolve(opts || {});
                })
                    .catch(reject);
            }
            else {
                resolve(options || {});
            }
        });
    }
    destroy() {
        this.connectionManager.destroy();
    }
    async handle(request, { abortSignal, requestTimeout, isEventStream } = {}) {
        if (!this.config) {
            this.config = await this.configProvider;
            const { disableConcurrentStreams, maxConcurrentStreams, nodeHttp2ConnectOptions } = this.config;
            this.connectionManager.setDisableConcurrentStreams(disableConcurrentStreams ?? false);
            if (maxConcurrentStreams) {
                this.connectionManager.setMaxConcurrentStreams(maxConcurrentStreams);
            }
            if (nodeHttp2ConnectOptions) {
                this.connectionManager.setNodeHttp2ConnectOptions(nodeHttp2ConnectOptions);
            }
        }
        const { requestTimeout: configRequestTimeout, disableConcurrentStreams } = this.config;
        const useIsolatedSession = disableConcurrentStreams || isEventStream;
        const effectiveRequestTimeout = requestTimeout ?? configRequestTimeout;
        return new Promise((_resolve, _reject) => {
            let fulfilled = false;
            let writeRequestBodyPromise = undefined;
            const resolve = async (arg) => {
                await writeRequestBodyPromise;
                _resolve(arg);
            };
            const reject = async (arg) => {
                await writeRequestBodyPromise;
                _reject(arg);
            };
            if (abortSignal?.aborted) {
                fulfilled = true;
                const abortError = buildAbortError(abortSignal);
                reject(abortError);
                return;
            }
            const { hostname, method, port, protocol, query } = request;
            let auth = "";
            if (request.username != null || request.password != null) {
                const username = request.username ?? "";
                const password = request.password ?? "";
                auth = `${username}:${password}@`;
            }
            const authority = `${protocol}//${auth}${hostname}${port ? `:${port}` : ""}`;
            const requestContext = { destination: new URL(authority) };
            const connectConfig = {
                requestTimeout: this.config?.sessionTimeout,
                isEventStream,
            };
            const ref = useIsolatedSession
                ? this.connectionManager.createIsolatedSession(requestContext, connectConfig)
                : this.connectionManager.lease(requestContext, connectConfig);
            const session = ref.deref();
            const rejectWithDestroy = (err) => {
                if (useIsolatedSession) {
                    ref.destroy();
                }
                fulfilled = true;
                reject(err);
            };
            const queryString = query ? protocols.buildQueryString(query) : "";
            let path = request.path;
            if (queryString) {
                path += `?${queryString}`;
            }
            if (request.fragment) {
                path += `#${request.fragment}`;
            }
            const clientHttp2Stream = session.request({
                ...request.headers,
                [http2.constants.HTTP2_HEADER_PATH]: path,
                [http2.constants.HTTP2_HEADER_METHOD]: method,
            });
            if (effectiveRequestTimeout) {
                clientHttp2Stream.setTimeout(effectiveRequestTimeout, () => {
                    clientHttp2Stream.close();
                    const timeoutError = new Error(`Stream timed out because of no activity for ${effectiveRequestTimeout} ms`);
                    timeoutError.name = "TimeoutError";
                    rejectWithDestroy(timeoutError);
                });
            }
            if (abortSignal) {
                const onAbort = () => {
                    clientHttp2Stream.close();
                    const abortError = buildAbortError(abortSignal);
                    rejectWithDestroy(abortError);
                };
                if (typeof abortSignal.addEventListener === "function") {
                    const signal = abortSignal;
                    signal.addEventListener("abort", onAbort, { once: true });
                    clientHttp2Stream.once("close", () => signal.removeEventListener("abort", onAbort));
                }
                else {
                    abortSignal.onabort = onAbort;
                }
            }
            clientHttp2Stream.on("frameError", (type, code, id) => {
                rejectWithDestroy(new Error(`Frame type id ${type} in stream id ${id} has failed with code ${code}.`));
            });
            clientHttp2Stream.on("error", rejectWithDestroy);
            clientHttp2Stream.on("aborted", () => {
                rejectWithDestroy(new Error(`HTTP/2 stream is abnormally aborted in mid-communication with result code ${clientHttp2Stream.rstCode}.`));
            });
            clientHttp2Stream.on("response", (headers) => {
                const httpResponse = new protocols.HttpResponse({
                    statusCode: headers[":status"] ?? -1,
                    headers: getTransformedHeaders(headers),
                    body: clientHttp2Stream,
                });
                fulfilled = true;
                resolve({ response: httpResponse });
                if (useIsolatedSession) {
                    session.close();
                }
            });
            clientHttp2Stream.on("close", () => {
                if (useIsolatedSession) {
                    ref.destroy();
                }
                else {
                    this.connectionManager.release(requestContext, ref);
                }
                if (!fulfilled) {
                    rejectWithDestroy(new Error("Unexpected error: http2 request did not get a response"));
                }
            });
            writeRequestBodyPromise = writeRequestBody(clientHttp2Stream, request, effectiveRequestTimeout);
        });
    }
    updateHttpClientConfig(key, value) {
        this.config = undefined;
        this.configProvider = this.configProvider.then((config) => {
            return {
                ...config,
                [key]: value,
            };
        });
    }
    httpHandlerConfigs() {
        return this.config ?? {};
    }
}

class Collector extends node_stream.Writable {
    bufferedBytes = [];
    _write(chunk, encoding, callback) {
        this.bufferedBytes.push(chunk);
        callback();
    }
}

const streamCollector = (stream) => {
    if (isReadableStreamInstance(stream)) {
        return collectReadableStream(stream);
    }
    return new Promise((resolve, reject) => {
        const collector = new Collector();
        stream.pipe(collector);
        stream.on("error", (err) => {
            collector.end();
            reject(err);
        });
        collector.on("error", reject);
        collector.on("finish", function () {
            const bytes = new Uint8Array(Buffer.concat(this.bufferedBytes));
            resolve(bytes);
        });
    });
};
const isReadableStreamInstance = (stream) => typeof ReadableStream === "function" && stream instanceof ReadableStream;
async function collectReadableStream(stream) {
    const chunks = [];
    const reader = stream.getReader();
    let isDone = false;
    let length = 0;
    while (!isDone) {
        const { done, value } = await reader.read();
        if (value) {
            chunks.push(value);
            length += value.length;
        }
        isDone = done;
    }
    const collected = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
        collected.set(chunk, offset);
        offset += chunk.length;
    }
    return collected;
}

exports.DEFAULT_REQUEST_TIMEOUT = DEFAULT_REQUEST_TIMEOUT;
exports.NodeHttp2Handler = NodeHttp2Handler;
exports.NodeHttpHandler = NodeHttpHandler;
exports.streamCollector = streamCollector;


/***/ }),

/***/ 51342:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var serde = __webpack_require__(38622);
var client = __webpack_require__(63234);
var protocols = __webpack_require__(45598);

class HeaderFormatter {
    format(headers) {
        const chunks = [];
        for (const headerName of Object.keys(headers)) {
            const bytes = serde.fromUtf8(headerName);
            chunks.push(Uint8Array.from([bytes.byteLength]), bytes, this.formatHeaderValue(headers[headerName]));
        }
        const out = new Uint8Array(chunks.reduce((carry, bytes) => carry + bytes.byteLength, 0));
        let position = 0;
        for (const chunk of chunks) {
            out.set(chunk, position);
            position += chunk.byteLength;
        }
        return out;
    }
    formatHeaderValue(header) {
        switch (header.type) {
            case "boolean":
                return Uint8Array.from([header.value ? 0 : 1]);
            case "byte":
                return Uint8Array.from([2, header.value]);
            case "short":
                const shortView = new DataView(new ArrayBuffer(3));
                shortView.setUint8(0, 3);
                shortView.setInt16(1, header.value, false);
                return new Uint8Array(shortView.buffer);
            case "integer":
                const intView = new DataView(new ArrayBuffer(5));
                intView.setUint8(0, 4);
                intView.setInt32(1, header.value, false);
                return new Uint8Array(intView.buffer);
            case "long":
                const longBytes = new Uint8Array(9);
                longBytes[0] = 5;
                longBytes.set(header.value.bytes, 1);
                return longBytes;
            case "binary":
                const binView = new DataView(new ArrayBuffer(3 + header.value.byteLength));
                binView.setUint8(0, 6);
                binView.setUint16(1, header.value.byteLength, false);
                const binBytes = new Uint8Array(binView.buffer);
                binBytes.set(header.value, 3);
                return binBytes;
            case "string":
                const utf8Bytes = serde.fromUtf8(header.value);
                const strView = new DataView(new ArrayBuffer(3 + utf8Bytes.byteLength));
                strView.setUint8(0, 7);
                strView.setUint16(1, utf8Bytes.byteLength, false);
                const strBytes = new Uint8Array(strView.buffer);
                strBytes.set(utf8Bytes, 3);
                return strBytes;
            case "timestamp":
                const tsBytes = new Uint8Array(9);
                tsBytes[0] = 8;
                tsBytes.set(Int64.fromNumber(header.value.valueOf()).bytes, 1);
                return tsBytes;
            case "uuid":
                if (!UUID_PATTERN.test(header.value)) {
                    throw new Error(`Invalid UUID received: ${header.value}`);
                }
                const uuidBytes = new Uint8Array(17);
                uuidBytes[0] = 9;
                uuidBytes.set(serde.fromHex(header.value.replace(/\-/g, "")), 1);
                return uuidBytes;
        }
    }
}
var HEADER_VALUE_TYPE;
(function (HEADER_VALUE_TYPE) {
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["boolTrue"] = 0] = "boolTrue";
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["boolFalse"] = 1] = "boolFalse";
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["byte"] = 2] = "byte";
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["short"] = 3] = "short";
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["integer"] = 4] = "integer";
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["long"] = 5] = "long";
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["byteArray"] = 6] = "byteArray";
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["string"] = 7] = "string";
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["timestamp"] = 8] = "timestamp";
    HEADER_VALUE_TYPE[HEADER_VALUE_TYPE["uuid"] = 9] = "uuid";
})(HEADER_VALUE_TYPE || (HEADER_VALUE_TYPE = {}));
const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
class Int64 {
    bytes;
    constructor(bytes) {
        this.bytes = bytes;
        if (bytes.byteLength !== 8) {
            throw new Error("Int64 buffers must be exactly 8 bytes");
        }
    }
    static fromNumber(number) {
        if (number > 9_223_372_036_854_775_807 || number < -9223372036854776e3) {
            throw new Error(`${number} is too large (or, if negative, too small) to represent as an Int64`);
        }
        const bytes = new Uint8Array(8);
        for (let i = 7, remaining = Math.abs(Math.round(number)); i > -1 && remaining > 0; i--, remaining /= 256) {
            bytes[i] = remaining;
        }
        if (number < 0) {
            negate(bytes);
        }
        return new Int64(bytes);
    }
    valueOf() {
        const bytes = this.bytes.slice(0);
        const negative = bytes[0] & 0b10000000;
        if (negative) {
            negate(bytes);
        }
        return parseInt(serde.toHex(bytes), 16) * (negative ? -1 : 1);
    }
    toString() {
        return String(this.valueOf());
    }
}
function negate(bytes) {
    for (let i = 0; i < 8; i++) {
        bytes[i] ^= 0xff;
    }
    for (let i = 7; i > -1; i--) {
        bytes[i]++;
        if (bytes[i] !== 0)
            break;
    }
}

const ALGORITHM_QUERY_PARAM = "X-Amz-Algorithm";
const CREDENTIAL_QUERY_PARAM = "X-Amz-Credential";
const AMZ_DATE_QUERY_PARAM = "X-Amz-Date";
const SIGNED_HEADERS_QUERY_PARAM = "X-Amz-SignedHeaders";
const EXPIRES_QUERY_PARAM = "X-Amz-Expires";
const SIGNATURE_QUERY_PARAM = "X-Amz-Signature";
const TOKEN_QUERY_PARAM = "X-Amz-Security-Token";
const REGION_SET_PARAM = "X-Amz-Region-Set";
const AUTH_HEADER = "authorization";
const AMZ_DATE_HEADER = AMZ_DATE_QUERY_PARAM.toLowerCase();
const DATE_HEADER = "date";
const GENERATED_HEADERS = [AUTH_HEADER, AMZ_DATE_HEADER, DATE_HEADER];
const SIGNATURE_HEADER = SIGNATURE_QUERY_PARAM.toLowerCase();
const SHA256_HEADER = "x-amz-content-sha256";
const TOKEN_HEADER = TOKEN_QUERY_PARAM.toLowerCase();
const HOST_HEADER = "host";
const ALWAYS_UNSIGNABLE_HEADERS = {
    authorization: true,
    "cache-control": true,
    connection: true,
    expect: true,
    from: true,
    "keep-alive": true,
    "max-forwards": true,
    pragma: true,
    referer: true,
    te: true,
    trailer: true,
    "transfer-encoding": true,
    upgrade: true,
    "user-agent": true,
    "x-amzn-trace-id": true,
};
const PROXY_HEADER_PATTERN = /^proxy-/;
const SEC_HEADER_PATTERN = /^sec-/;
const UNSIGNABLE_PATTERNS = [/^proxy-/i, /^sec-/i];
const ALGORITHM_IDENTIFIER = "AWS4-HMAC-SHA256";
const ALGORITHM_IDENTIFIER_V4A = "AWS4-ECDSA-P256-SHA256";
const EVENT_ALGORITHM_IDENTIFIER = "AWS4-HMAC-SHA256-PAYLOAD";
const UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";
const MAX_CACHE_SIZE = 50;
const KEY_TYPE_IDENTIFIER = "aws4_request";
const MAX_PRESIGNED_TTL = 60 * 60 * 24 * 7;

const getCanonicalQuery = ({ query = {} }) => {
    const keys = [];
    const serialized = {};
    for (const key of Object.keys(query)) {
        if (key.toLowerCase() === SIGNATURE_HEADER) {
            continue;
        }
        const encodedKey = protocols.escapeUri(key);
        keys.push(encodedKey);
        const value = query[key];
        if (typeof value === "string") {
            serialized[encodedKey] = `${encodedKey}=${protocols.escapeUri(value)}`;
        }
        else if (Array.isArray(value)) {
            serialized[encodedKey] = value
                .slice(0)
                .reduce((encoded, value) => encoded.concat([`${encodedKey}=${protocols.escapeUri(value)}`]), [])
                .sort()
                .join("&");
        }
    }
    return keys
        .sort()
        .map((key) => serialized[key])
        .filter((serialized) => serialized)
        .join("&");
};

const iso8601 = (time) => toDate(time)
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");
const toDate = (time) => {
    if (typeof time === "number") {
        return new Date(time * 1000);
    }
    if (typeof time === "string") {
        if (Number(time)) {
            return new Date(Number(time) * 1000);
        }
        return new Date(time);
    }
    return time;
};

class SignatureV4Base {
    service;
    regionProvider;
    credentialProvider;
    sha256;
    uriEscapePath;
    applyChecksum;
    constructor({ applyChecksum, credentials, region, service, sha256, uriEscapePath = true, }) {
        this.service = service;
        this.sha256 = sha256;
        this.uriEscapePath = uriEscapePath;
        this.applyChecksum = typeof applyChecksum === "boolean" ? applyChecksum : true;
        this.regionProvider = client.normalizeProvider(region);
        this.credentialProvider = client.normalizeProvider(credentials);
    }
    createCanonicalRequest(request, canonicalHeaders, payloadHash) {
        const sortedHeaders = Object.keys(canonicalHeaders).sort();
        return `${request.method}
${this.getCanonicalPath(request)}
${getCanonicalQuery(request)}
${sortedHeaders.map((name) => `${name}:${canonicalHeaders[name]}`).join("\n")}

${sortedHeaders.join(";")}
${payloadHash}`;
    }
    async createStringToSign(longDate, credentialScope, canonicalRequest, algorithmIdentifier) {
        const hash = new this.sha256();
        hash.update(serde.toUint8Array(canonicalRequest));
        const hashedRequest = await hash.digest();
        return `${algorithmIdentifier}
${longDate}
${credentialScope}
${serde.toHex(hashedRequest)}`;
    }
    getCanonicalPath({ path }) {
        if (this.uriEscapePath) {
            const normalizedPathSegments = [];
            for (const pathSegment of path.split("/")) {
                if (pathSegment?.length === 0)
                    continue;
                if (pathSegment === ".")
                    continue;
                if (pathSegment === "..") {
                    normalizedPathSegments.pop();
                }
                else {
                    normalizedPathSegments.push(pathSegment);
                }
            }
            const normalizedPath = `${path?.startsWith("/") ? "/" : ""}${normalizedPathSegments.join("/")}${normalizedPathSegments.length > 0 && path?.endsWith("/") ? "/" : ""}`;
            const doubleEncoded = protocols.escapeUri(normalizedPath);
            return doubleEncoded.replace(/%2F/g, "/");
        }
        return path;
    }
    validateResolvedCredentials(credentials) {
        if (typeof credentials !== "object" ||
            typeof credentials.accessKeyId !== "string" ||
            typeof credentials.secretAccessKey !== "string") {
            throw new Error("Resolved credential object is not valid");
        }
    }
    formatDate(now) {
        const longDate = iso8601(now).replace(/[\-:]/g, "");
        return {
            longDate,
            shortDate: longDate.slice(0, 8),
        };
    }
    getCanonicalHeaderList(headers) {
        return Object.keys(headers).sort().join(";");
    }
}

const signingKeyCache = {};
const cacheQueue = [];
const createScope = (shortDate, region, service) => `${shortDate}/${region}/${service}/${KEY_TYPE_IDENTIFIER}`;
const getSigningKey = async (sha256Constructor, credentials, shortDate, region, service) => {
    const credsHash = await hmac(sha256Constructor, credentials.secretAccessKey, credentials.accessKeyId);
    const cacheKey = `${shortDate}:${region}:${service}:${serde.toHex(credsHash)}:${credentials.sessionToken}`;
    if (cacheKey in signingKeyCache) {
        return signingKeyCache[cacheKey];
    }
    cacheQueue.push(cacheKey);
    while (cacheQueue.length > MAX_CACHE_SIZE) {
        delete signingKeyCache[cacheQueue.shift()];
    }
    let key = `AWS4${credentials.secretAccessKey}`;
    for (const signable of [shortDate, region, service, KEY_TYPE_IDENTIFIER]) {
        key = await hmac(sha256Constructor, key, signable);
    }
    return (signingKeyCache[cacheKey] = key);
};
const clearCredentialCache = () => {
    cacheQueue.length = 0;
    Object.keys(signingKeyCache).forEach((cacheKey) => {
        delete signingKeyCache[cacheKey];
    });
};
const hmac = (ctor, secret, data) => {
    const hash = new ctor(secret);
    hash.update(serde.toUint8Array(data));
    return hash.digest();
};

const getCanonicalHeaders = ({ headers }, unsignableHeaders, signableHeaders) => {
    const canonical = {};
    for (const headerName of Object.keys(headers).sort()) {
        if (headers[headerName] == undefined) {
            continue;
        }
        const canonicalHeaderName = headerName.toLowerCase();
        if (canonicalHeaderName in ALWAYS_UNSIGNABLE_HEADERS ||
            unsignableHeaders?.has(canonicalHeaderName) ||
            PROXY_HEADER_PATTERN.test(canonicalHeaderName) ||
            SEC_HEADER_PATTERN.test(canonicalHeaderName)) {
            if (!signableHeaders || (signableHeaders && !signableHeaders.has(canonicalHeaderName))) {
                continue;
            }
        }
        canonical[canonicalHeaderName] = headers[headerName].trim().replace(/\s+/g, " ");
    }
    return canonical;
};

const getPayloadHash = async ({ headers, body }, hashConstructor) => {
    for (const headerName of Object.keys(headers)) {
        if (headerName.toLowerCase() === SHA256_HEADER) {
            return headers[headerName];
        }
    }
    if (body == undefined) {
        return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    }
    else if (typeof body === "string" || ArrayBuffer.isView(body) || serde.isArrayBuffer(body)) {
        const hashCtor = new hashConstructor();
        hashCtor.update(serde.toUint8Array(body));
        return serde.toHex(await hashCtor.digest());
    }
    return UNSIGNED_PAYLOAD;
};

const hasHeader = (soughtHeader, headers) => {
    soughtHeader = soughtHeader.toLowerCase();
    for (const headerName of Object.keys(headers)) {
        if (soughtHeader === headerName.toLowerCase()) {
            return true;
        }
    }
    return false;
};

const moveHeadersToQuery = (request, options = {}) => {
    const { headers, query = {} } = protocols.HttpRequest.clone(request);
    for (const name of Object.keys(headers)) {
        const lname = name.toLowerCase();
        if ((lname.slice(0, 6) === "x-amz-" && !options.unhoistableHeaders?.has(lname)) ||
            options.hoistableHeaders?.has(lname)) {
            query[name] = headers[name];
            delete headers[name];
        }
    }
    return {
        ...request,
        headers,
        query,
    };
};

const prepareRequest = (request) => {
    request = protocols.HttpRequest.clone(request);
    for (const headerName of Object.keys(request.headers)) {
        if (GENERATED_HEADERS.indexOf(headerName.toLowerCase()) > -1) {
            delete request.headers[headerName];
        }
    }
    return request;
};

class SignatureV4 extends SignatureV4Base {
    headerFormatter = new HeaderFormatter();
    constructor({ applyChecksum, credentials, region, service, sha256, uriEscapePath = true, }) {
        super({
            applyChecksum,
            credentials,
            region,
            service,
            sha256,
            uriEscapePath,
        });
    }
    async presign(originalRequest, options = {}) {
        const { signingDate = new Date(), expiresIn = 3600, unsignableHeaders, unhoistableHeaders, signableHeaders, hoistableHeaders, signingRegion, signingService, } = options;
        const credentials = await this.credentialProvider();
        this.validateResolvedCredentials(credentials);
        const region = signingRegion ?? (await this.regionProvider());
        const { longDate, shortDate } = this.formatDate(signingDate);
        if (expiresIn > MAX_PRESIGNED_TTL) {
            return Promise.reject("Signature version 4 presigned URLs" + " must have an expiration date less than one week in" + " the future");
        }
        const scope = createScope(shortDate, region, signingService ?? this.service);
        const request = moveHeadersToQuery(prepareRequest(originalRequest), { unhoistableHeaders, hoistableHeaders });
        if (credentials.sessionToken) {
            request.query[TOKEN_QUERY_PARAM] = credentials.sessionToken;
        }
        request.query[ALGORITHM_QUERY_PARAM] = ALGORITHM_IDENTIFIER;
        request.query[CREDENTIAL_QUERY_PARAM] = `${credentials.accessKeyId}/${scope}`;
        request.query[AMZ_DATE_QUERY_PARAM] = longDate;
        request.query[EXPIRES_QUERY_PARAM] = expiresIn.toString(10);
        const canonicalHeaders = getCanonicalHeaders(request, unsignableHeaders, signableHeaders);
        request.query[SIGNED_HEADERS_QUERY_PARAM] = this.getCanonicalHeaderList(canonicalHeaders);
        request.query[SIGNATURE_QUERY_PARAM] = await this.getSignature(longDate, scope, this.getSigningKey(credentials, region, shortDate, signingService), this.createCanonicalRequest(request, canonicalHeaders, await getPayloadHash(originalRequest, this.sha256)));
        return request;
    }
    async sign(toSign, options) {
        if (typeof toSign === "string") {
            return this.signString(toSign, options);
        }
        else if (toSign.headers && toSign.payload) {
            return this.signEvent(toSign, options);
        }
        else if (toSign.message) {
            return this.signMessage(toSign, options);
        }
        else {
            return this.signRequest(toSign, options);
        }
    }
    async signEvent({ headers, payload }, { signingDate = new Date(), priorSignature, signingRegion, signingService, eventStreamCredentials, }) {
        const region = signingRegion ?? (await this.regionProvider());
        const { shortDate, longDate } = this.formatDate(signingDate);
        const scope = createScope(shortDate, region, signingService ?? this.service);
        const hashedPayload = await getPayloadHash({ headers: {}, body: payload }, this.sha256);
        const hash = new this.sha256();
        hash.update(headers);
        const hashedHeaders = serde.toHex(await hash.digest());
        const stringToSign = [
            EVENT_ALGORITHM_IDENTIFIER,
            longDate,
            scope,
            priorSignature,
            hashedHeaders,
            hashedPayload,
        ].join("\n");
        return this.signString(stringToSign, {
            signingDate,
            signingRegion: region,
            signingService,
            eventStreamCredentials,
        });
    }
    async signMessage(signableMessage, { signingDate = new Date(), signingRegion, signingService, eventStreamCredentials }) {
        const promise = this.signEvent({
            headers: this.headerFormatter.format(signableMessage.message.headers),
            payload: signableMessage.message.body,
        }, {
            signingDate,
            signingRegion,
            signingService,
            priorSignature: signableMessage.priorSignature,
            eventStreamCredentials,
        });
        return promise.then((signature) => {
            return { message: signableMessage.message, signature };
        });
    }
    async signString(stringToSign, { signingDate = new Date(), signingRegion, signingService, eventStreamCredentials, } = {}) {
        const credentials = eventStreamCredentials ?? (await this.credentialProvider());
        this.validateResolvedCredentials(credentials);
        const region = signingRegion ?? (await this.regionProvider());
        const { shortDate } = this.formatDate(signingDate);
        const hash = new this.sha256(await this.getSigningKey(credentials, region, shortDate, signingService));
        hash.update(serde.toUint8Array(stringToSign));
        return serde.toHex(await hash.digest());
    }
    async signRequest(requestToSign, { signingDate = new Date(), signableHeaders, unsignableHeaders, signingRegion, signingService, } = {}) {
        const credentials = await this.credentialProvider();
        this.validateResolvedCredentials(credentials);
        const region = signingRegion ?? (await this.regionProvider());
        const request = prepareRequest(requestToSign);
        const { longDate, shortDate } = this.formatDate(signingDate);
        const scope = createScope(shortDate, region, signingService ?? this.service);
        request.headers[AMZ_DATE_HEADER] = longDate;
        if (credentials.sessionToken) {
            request.headers[TOKEN_HEADER] = credentials.sessionToken;
        }
        const payloadHash = await getPayloadHash(request, this.sha256);
        if (!hasHeader(SHA256_HEADER, request.headers) && this.applyChecksum) {
            request.headers[SHA256_HEADER] = payloadHash;
        }
        const canonicalHeaders = getCanonicalHeaders(request, unsignableHeaders, signableHeaders);
        const signature = await this.getSignature(longDate, scope, this.getSigningKey(credentials, region, shortDate, signingService), this.createCanonicalRequest(request, canonicalHeaders, payloadHash));
        request.headers[AUTH_HEADER] =
            `${ALGORITHM_IDENTIFIER} ` +
                `Credential=${credentials.accessKeyId}/${scope}, ` +
                `SignedHeaders=${this.getCanonicalHeaderList(canonicalHeaders)}, ` +
                `Signature=${signature}`;
        return request;
    }
    async getSignature(longDate, credentialScope, keyPromise, canonicalRequest) {
        const stringToSign = await this.createStringToSign(longDate, credentialScope, canonicalRequest, ALGORITHM_IDENTIFIER);
        const hash = new this.sha256(await keyPromise);
        hash.update(serde.toUint8Array(stringToSign));
        return serde.toHex(await hash.digest());
    }
    getSigningKey(credentials, region, shortDate, service) {
        return getSigningKey(this.sha256, credentials, shortDate, region, service || this.service);
    }
}

const signatureV4aContainer = {
    SignatureV4a: null,
};

exports.ALGORITHM_IDENTIFIER = ALGORITHM_IDENTIFIER;
exports.ALGORITHM_IDENTIFIER_V4A = ALGORITHM_IDENTIFIER_V4A;
exports.ALGORITHM_QUERY_PARAM = ALGORITHM_QUERY_PARAM;
exports.ALWAYS_UNSIGNABLE_HEADERS = ALWAYS_UNSIGNABLE_HEADERS;
exports.AMZ_DATE_HEADER = AMZ_DATE_HEADER;
exports.AMZ_DATE_QUERY_PARAM = AMZ_DATE_QUERY_PARAM;
exports.AUTH_HEADER = AUTH_HEADER;
exports.CREDENTIAL_QUERY_PARAM = CREDENTIAL_QUERY_PARAM;
exports.DATE_HEADER = DATE_HEADER;
exports.EVENT_ALGORITHM_IDENTIFIER = EVENT_ALGORITHM_IDENTIFIER;
exports.EXPIRES_QUERY_PARAM = EXPIRES_QUERY_PARAM;
exports.GENERATED_HEADERS = GENERATED_HEADERS;
exports.HOST_HEADER = HOST_HEADER;
exports.KEY_TYPE_IDENTIFIER = KEY_TYPE_IDENTIFIER;
exports.MAX_CACHE_SIZE = MAX_CACHE_SIZE;
exports.MAX_PRESIGNED_TTL = MAX_PRESIGNED_TTL;
exports.PROXY_HEADER_PATTERN = PROXY_HEADER_PATTERN;
exports.REGION_SET_PARAM = REGION_SET_PARAM;
exports.SEC_HEADER_PATTERN = SEC_HEADER_PATTERN;
exports.SHA256_HEADER = SHA256_HEADER;
exports.SIGNATURE_HEADER = SIGNATURE_HEADER;
exports.SIGNATURE_QUERY_PARAM = SIGNATURE_QUERY_PARAM;
exports.SIGNED_HEADERS_QUERY_PARAM = SIGNED_HEADERS_QUERY_PARAM;
exports.SignatureV4 = SignatureV4;
exports.SignatureV4Base = SignatureV4Base;
exports.TOKEN_HEADER = TOKEN_HEADER;
exports.TOKEN_QUERY_PARAM = TOKEN_QUERY_PARAM;
exports.UNSIGNABLE_PATTERNS = UNSIGNABLE_PATTERNS;
exports.UNSIGNED_PAYLOAD = UNSIGNED_PAYLOAD;
exports.clearCredentialCache = clearCredentialCache;
exports.createScope = createScope;
exports.getCanonicalHeaders = getCanonicalHeaders;
exports.getCanonicalQuery = getCanonicalQuery;
exports.getPayloadHash = getPayloadHash;
exports.getSigningKey = getSigningKey;
exports.hasHeader = hasHeader;
exports.moveHeadersToQuery = moveHeadersToQuery;
exports.prepareRequest = prepareRequest;
exports.signatureV4aContainer = signatureV4aContainer;


/***/ }),

/***/ 39654:
/***/ ((__unused_webpack_module, exports) => {



exports.HttpAuthLocation = void 0;
(function (HttpAuthLocation) {
    HttpAuthLocation["HEADER"] = "header";
    HttpAuthLocation["QUERY"] = "query";
})(exports.HttpAuthLocation || (exports.HttpAuthLocation = {}));

exports.HttpApiKeyAuthLocation = void 0;
(function (HttpApiKeyAuthLocation) {
    HttpApiKeyAuthLocation["HEADER"] = "header";
    HttpApiKeyAuthLocation["QUERY"] = "query";
})(exports.HttpApiKeyAuthLocation || (exports.HttpApiKeyAuthLocation = {}));

exports.EndpointURLScheme = void 0;
(function (EndpointURLScheme) {
    EndpointURLScheme["HTTP"] = "http";
    EndpointURLScheme["HTTPS"] = "https";
})(exports.EndpointURLScheme || (exports.EndpointURLScheme = {}));

exports.AlgorithmId = void 0;
(function (AlgorithmId) {
    AlgorithmId["MD5"] = "md5";
    AlgorithmId["CRC32"] = "crc32";
    AlgorithmId["CRC32C"] = "crc32c";
    AlgorithmId["SHA1"] = "sha1";
    AlgorithmId["SHA256"] = "sha256";
})(exports.AlgorithmId || (exports.AlgorithmId = {}));
const getChecksumConfiguration = (runtimeConfig) => {
    const checksumAlgorithms = [];
    if (runtimeConfig.sha256 !== undefined) {
        checksumAlgorithms.push({
            algorithmId: () => exports.AlgorithmId.SHA256,
            checksumConstructor: () => runtimeConfig.sha256,
        });
    }
    if (runtimeConfig.md5 != undefined) {
        checksumAlgorithms.push({
            algorithmId: () => exports.AlgorithmId.MD5,
            checksumConstructor: () => runtimeConfig.md5,
        });
    }
    return {
        addChecksumAlgorithm(algo) {
            checksumAlgorithms.push(algo);
        },
        checksumAlgorithms() {
            return checksumAlgorithms;
        },
    };
};
const resolveChecksumRuntimeConfig = (clientConfig) => {
    const runtimeConfig = {};
    clientConfig.checksumAlgorithms().forEach((checksumAlgorithm) => {
        runtimeConfig[checksumAlgorithm.algorithmId()] = checksumAlgorithm.checksumConstructor();
    });
    return runtimeConfig;
};

const getDefaultClientConfiguration = (runtimeConfig) => {
    return getChecksumConfiguration(runtimeConfig);
};
const resolveDefaultRuntimeConfig = (config) => {
    return resolveChecksumRuntimeConfig(config);
};

exports.FieldPosition = void 0;
(function (FieldPosition) {
    FieldPosition[FieldPosition["HEADER"] = 0] = "HEADER";
    FieldPosition[FieldPosition["TRAILER"] = 1] = "TRAILER";
})(exports.FieldPosition || (exports.FieldPosition = {}));

const SMITHY_CONTEXT_KEY = "__smithy_context";

exports.IniSectionType = void 0;
(function (IniSectionType) {
    IniSectionType["PROFILE"] = "profile";
    IniSectionType["SSO_SESSION"] = "sso-session";
    IniSectionType["SERVICES"] = "services";
})(exports.IniSectionType || (exports.IniSectionType = {}));

exports.RequestHandlerProtocol = void 0;
(function (RequestHandlerProtocol) {
    RequestHandlerProtocol["HTTP_0_9"] = "http/0.9";
    RequestHandlerProtocol["HTTP_1_0"] = "http/1.0";
    RequestHandlerProtocol["TDS_8_0"] = "tds/8.0";
})(exports.RequestHandlerProtocol || (exports.RequestHandlerProtocol = {}));

exports.SMITHY_CONTEXT_KEY = SMITHY_CONTEXT_KEY;
exports.getDefaultClientConfiguration = getDefaultClientConfiguration;
exports.resolveDefaultRuntimeConfig = resolveDefaultRuntimeConfig;


/***/ }),

/***/ 10683:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  fromArrayBuffer: () => fromArrayBuffer,
  fromString: () => fromString
});
module.exports = __toCommonJS(src_exports);
var import_is_array_buffer = __webpack_require__(1767);
var import_buffer = __webpack_require__(20181);
var fromArrayBuffer = /* @__PURE__ */ __name((input, offset = 0, length = input.byteLength - offset) => {
  if (!(0, import_is_array_buffer.isArrayBuffer)(input)) {
    throw new TypeError(`The "input" argument must be ArrayBuffer. Received type ${typeof input} (${input})`);
  }
  return import_buffer.Buffer.from(input, offset, length);
}, "fromArrayBuffer");
var fromString = /* @__PURE__ */ __name((input, encoding) => {
  if (typeof input !== "string") {
    throw new TypeError(`The "input" argument must be of type string. Received type ${typeof input} (${input})`);
  }
  return encoding ? import_buffer.Buffer.from(input, encoding) : import_buffer.Buffer.from(input);
}, "fromString");
// Annotate the CommonJS export names for ESM import in node:

0 && (0);



/***/ }),

/***/ 11478:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  fromUtf8: () => fromUtf8,
  toUint8Array: () => toUint8Array,
  toUtf8: () => toUtf8
});
module.exports = __toCommonJS(src_exports);

// src/fromUtf8.ts
var import_util_buffer_from = __webpack_require__(10683);
var fromUtf8 = /* @__PURE__ */ __name((input) => {
  const buf = (0, import_util_buffer_from.fromString)(input, "utf8");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength / Uint8Array.BYTES_PER_ELEMENT);
}, "fromUtf8");

// src/toUint8Array.ts
var toUint8Array = /* @__PURE__ */ __name((data) => {
  if (typeof data === "string") {
    return fromUtf8(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength / Uint8Array.BYTES_PER_ELEMENT);
  }
  return new Uint8Array(data);
}, "toUint8Array");

// src/toUtf8.ts

var toUtf8 = /* @__PURE__ */ __name((input) => {
  if (typeof input === "string") {
    return input;
  }
  if (typeof input !== "object" || typeof input.byteOffset !== "number" || typeof input.byteLength !== "number") {
    throw new Error("@smithy/util-utf8: toUtf8 encoder function only accepts string | Uint8Array.");
  }
  return (0, import_util_buffer_from.fromArrayBuffer)(input.buffer, input.byteOffset, input.byteLength).toString("utf8");
}, "toUtf8");
// Annotate the CommonJS export names for ESM import in node:

0 && (0);



/***/ }),

/***/ 6965:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HttpProxyAgent = void 0;
const net = __importStar(__webpack_require__(69278));
const tls = __importStar(__webpack_require__(64756));
const debug_1 = __importDefault(__webpack_require__(26675));
const events_1 = __webpack_require__(24434);
const agent_base_1 = __webpack_require__(66714);
const url_1 = __webpack_require__(87016);
const debug = (0, debug_1.default)('http-proxy-agent');
/**
 * The `HttpProxyAgent` implements an HTTP Agent subclass that connects
 * to the specified "HTTP proxy server" in order to proxy HTTP requests.
 */
class HttpProxyAgent extends agent_base_1.Agent {
    constructor(proxy, opts) {
        super(opts);
        this.proxy = typeof proxy === 'string' ? new url_1.URL(proxy) : proxy;
        this.proxyHeaders = opts?.headers ?? {};
        debug('Creating new HttpProxyAgent instance: %o', this.proxy.href);
        // Trim off the brackets from IPv6 addresses
        const host = (this.proxy.hostname || this.proxy.host).replace(/^\[|\]$/g, '');
        const port = this.proxy.port
            ? parseInt(this.proxy.port, 10)
            : this.proxy.protocol === 'https:'
                ? 443
                : 80;
        this.connectOpts = {
            ...(opts ? omit(opts, 'headers') : null),
            host,
            port,
        };
    }
    addRequest(req, opts) {
        req._header = null;
        this.setRequestProps(req, opts);
        // @ts-expect-error `addRequest()` isn't defined in `@types/node`
        super.addRequest(req, opts);
    }
    setRequestProps(req, opts) {
        const { proxy } = this;
        const protocol = opts.secureEndpoint ? 'https:' : 'http:';
        const hostname = req.getHeader('host') || 'localhost';
        const base = `${protocol}//${hostname}`;
        const url = new url_1.URL(req.path, base);
        if (opts.port !== 80) {
            url.port = String(opts.port);
        }
        // Change the `http.ClientRequest` instance's "path" field
        // to the absolute path of the URL that will be requested.
        req.path = String(url);
        // Inject the `Proxy-Authorization` header if necessary.
        const headers = typeof this.proxyHeaders === 'function'
            ? this.proxyHeaders()
            : { ...this.proxyHeaders };
        if (proxy.username || proxy.password) {
            const auth = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`;
            headers['Proxy-Authorization'] = `Basic ${Buffer.from(auth).toString('base64')}`;
        }
        if (!headers['Proxy-Connection']) {
            headers['Proxy-Connection'] = this.keepAlive
                ? 'Keep-Alive'
                : 'close';
        }
        for (const name of Object.keys(headers)) {
            const value = headers[name];
            if (value) {
                req.setHeader(name, value);
            }
        }
    }
    async connect(req, opts) {
        req._header = null;
        if (!req.path.includes('://')) {
            this.setRequestProps(req, opts);
        }
        // At this point, the http ClientRequest's internal `_header` field
        // might have already been set. If this is the case then we'll need
        // to re-generate the string since we just changed the `req.path`.
        let first;
        let endOfHeaders;
        debug('Regenerating stored HTTP header string for request');
        req._implicitHeader();
        if (req.outputData && req.outputData.length > 0) {
            debug('Patching connection write() output buffer with updated header');
            first = req.outputData[0].data;
            endOfHeaders = first.indexOf('\r\n\r\n') + 4;
            req.outputData[0].data =
                req._header + first.substring(endOfHeaders);
            debug('Output buffer: %o', req.outputData[0].data);
        }
        // Create a socket connection to the proxy server.
        let socket;
        if (this.proxy.protocol === 'https:') {
            debug('Creating `tls.Socket`: %o', this.connectOpts);
            socket = tls.connect(this.connectOpts);
        }
        else {
            debug('Creating `net.Socket`: %o', this.connectOpts);
            socket = net.connect(this.connectOpts);
        }
        // Wait for the socket's `connect` event, so that this `callback()`
        // function throws instead of the `http` request machinery. This is
        // important for i.e. `PacProxyAgent` which determines a failed proxy
        // connection via the `callback()` function throwing.
        await (0, events_1.once)(socket, 'connect');
        return socket;
    }
}
HttpProxyAgent.protocols = ['http', 'https'];
exports.HttpProxyAgent = HttpProxyAgent;
function omit(obj, ...keys) {
    const ret = {};
    let key;
    for (key in obj) {
        if (!keys.includes(key)) {
            ret[key] = obj[key];
        }
    }
    return ret;
}
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 53824:
/***/ ((module) => {

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global global, define, Symbol, Reflect, Promise, SuppressedError, Iterator */
var __extends;
var __assign;
var __rest;
var __decorate;
var __param;
var __esDecorate;
var __runInitializers;
var __propKey;
var __setFunctionName;
var __metadata;
var __awaiter;
var __generator;
var __exportStar;
var __values;
var __read;
var __spread;
var __spreadArrays;
var __spreadArray;
var __await;
var __asyncGenerator;
var __asyncDelegator;
var __asyncValues;
var __makeTemplateObject;
var __importStar;
var __importDefault;
var __classPrivateFieldGet;
var __classPrivateFieldSet;
var __classPrivateFieldIn;
var __createBinding;
var __addDisposableResource;
var __disposeResources;
var __rewriteRelativeImportExtension;
(function (factory) {
    var root = typeof global === "object" ? global : typeof self === "object" ? self : typeof this === "object" ? this : {};
    if (typeof define === "function" && define.amd) {
        define("tslib", ["exports"], function (exports) { factory(createExporter(root, createExporter(exports))); });
    }
    else if ( true && typeof module.exports === "object") {
        factory(createExporter(root, createExporter(module.exports)));
    }
    else {
        factory(createExporter(root));
    }
    function createExporter(exports, previous) {
        if (exports !== root) {
            if (typeof Object.create === "function") {
                Object.defineProperty(exports, "__esModule", { value: true });
            }
            else {
                exports.__esModule = true;
            }
        }
        return function (id, v) { return exports[id] = previous ? previous(id, v) : v; };
    }
})
(function (exporter) {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };

    __extends = function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };

    __assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };

    __rest = function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    };

    __decorate = function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };

    __param = function (paramIndex, decorator) {
        return function (target, key) { decorator(target, key, paramIndex); }
    };

    __esDecorate = function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
        function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
        var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
        var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
        var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
        var _, done = false;
        for (var i = decorators.length - 1; i >= 0; i--) {
            var context = {};
            for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
            for (var p in contextIn.access) context.access[p] = contextIn.access[p];
            context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
            var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
            if (kind === "accessor") {
                if (result === void 0) continue;
                if (result === null || typeof result !== "object") throw new TypeError("Object expected");
                if (_ = accept(result.get)) descriptor.get = _;
                if (_ = accept(result.set)) descriptor.set = _;
                if (_ = accept(result.init)) initializers.unshift(_);
            }
            else if (_ = accept(result)) {
                if (kind === "field") initializers.unshift(_);
                else descriptor[key] = _;
            }
        }
        if (target) Object.defineProperty(target, contextIn.name, descriptor);
        done = true;
    };

    __runInitializers = function (thisArg, initializers, value) {
        var useValue = arguments.length > 2;
        for (var i = 0; i < initializers.length; i++) {
            value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
        }
        return useValue ? value : void 0;
    };

    __propKey = function (x) {
        return typeof x === "symbol" ? x : "".concat(x);
    };

    __setFunctionName = function (f, name, prefix) {
        if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
        return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
    };

    __metadata = function (metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
    };

    __awaiter = function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };

    __generator = function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
        return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (g && (g = 0, op[0] && (_ = 0)), _) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };

    __exportStar = function(m, o) {
        for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
    };

    __createBinding = Object.create ? (function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
            desc = { enumerable: true, get: function() { return m[k]; } };
        }
        Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });

    __values = function (o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    };

    __read = function (o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    };

    /** @deprecated */
    __spread = function () {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    };

    /** @deprecated */
    __spreadArrays = function () {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    };

    __spreadArray = function (to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
    };

    __await = function (v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    };

    __asyncGenerator = function (thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
        function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
        function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
        function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
        function fulfill(value) { resume("next", value); }
        function reject(value) { resume("throw", value); }
        function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
    };

    __asyncDelegator = function (o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
        function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
    };

    __asyncValues = function (o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
    };

    __makeTemplateObject = function (cooked, raw) {
        if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
        return cooked;
    };

    var __setModuleDefault = Object.create ? (function(o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
        o["default"] = v;
    };

    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };

    __importStar = function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };

    __importDefault = function (mod) {
        return (mod && mod.__esModule) ? mod : { "default": mod };
    };

    __classPrivateFieldGet = function (receiver, state, kind, f) {
        if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
        return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    };

    __classPrivateFieldSet = function (receiver, state, value, kind, f) {
        if (kind === "m") throw new TypeError("Private method is not writable");
        if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
        return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
    };

    __classPrivateFieldIn = function (state, receiver) {
        if (receiver === null || (typeof receiver !== "object" && typeof receiver !== "function")) throw new TypeError("Cannot use 'in' operator on non-object");
        return typeof state === "function" ? receiver === state : state.has(receiver);
    };

    __addDisposableResource = function (env, value, async) {
        if (value !== null && value !== void 0) {
            if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
            var dispose, inner;
            if (async) {
                if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
                dispose = value[Symbol.asyncDispose];
            }
            if (dispose === void 0) {
                if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
                dispose = value[Symbol.dispose];
                if (async) inner = dispose;
            }
            if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
            if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
            env.stack.push({ value: value, dispose: dispose, async: async });
        }
        else if (async) {
            env.stack.push({ async: true });
        }
        return value;
    };

    var _SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    __disposeResources = function (env) {
        function fail(e) {
            env.error = env.hasError ? new _SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        var r, s = 0;
        function next() {
            while (r = env.stack.pop()) {
                try {
                    if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                    if (r.dispose) {
                        var result = r.dispose.call(r.value);
                        if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                    }
                    else s |= 1;
                }
                catch (e) {
                    fail(e);
                }
            }
            if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
            if (env.hasError) throw env.error;
        }
        return next();
    };

    __rewriteRelativeImportExtension = function (path, preserveJsx) {
        if (typeof path === "string" && /^\.\.?\//.test(path)) {
            return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
                return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
            });
        }
        return path;
    };

    exporter("__extends", __extends);
    exporter("__assign", __assign);
    exporter("__rest", __rest);
    exporter("__decorate", __decorate);
    exporter("__param", __param);
    exporter("__esDecorate", __esDecorate);
    exporter("__runInitializers", __runInitializers);
    exporter("__propKey", __propKey);
    exporter("__setFunctionName", __setFunctionName);
    exporter("__metadata", __metadata);
    exporter("__awaiter", __awaiter);
    exporter("__generator", __generator);
    exporter("__exportStar", __exportStar);
    exporter("__createBinding", __createBinding);
    exporter("__values", __values);
    exporter("__read", __read);
    exporter("__spread", __spread);
    exporter("__spreadArrays", __spreadArrays);
    exporter("__spreadArray", __spreadArray);
    exporter("__await", __await);
    exporter("__asyncGenerator", __asyncGenerator);
    exporter("__asyncDelegator", __asyncDelegator);
    exporter("__asyncValues", __asyncValues);
    exporter("__makeTemplateObject", __makeTemplateObject);
    exporter("__importStar", __importStar);
    exporter("__importDefault", __importDefault);
    exporter("__classPrivateFieldGet", __classPrivateFieldGet);
    exporter("__classPrivateFieldSet", __classPrivateFieldSet);
    exporter("__classPrivateFieldIn", __classPrivateFieldIn);
    exporter("__addDisposableResource", __addDisposableResource);
    exporter("__disposeResources", __disposeResources);
    exporter("__rewriteRelativeImportExtension", __rewriteRelativeImportExtension);
});

0 && (0);


/***/ }),

/***/ 19815:
/***/ ((module) => {

(()=>{"use strict";var t={d:(e,n)=>{for(var i in n)t.o(n,i)&&!t.o(e,i)&&Object.defineProperty(e,i,{enumerable:!0,get:n[i]})},o:(t,e)=>Object.prototype.hasOwnProperty.call(t,e),r:t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})}},e={};t.r(e),t.d(e,{XMLBuilder:()=>Xt,XMLParser:()=>Tt,XMLValidator:()=>Yt});const n=":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD",i=new RegExp("^["+n+"]["+n+"\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$");function s(t,e){const n=[];let i=e.exec(t);for(;i;){const s=[];s.startIndex=e.lastIndex-i[0].length;const r=i.length;for(let t=0;t<r;t++)s.push(i[t]);n.push(s),i=e.exec(t)}return n}const r=function(t){return!(null==i.exec(t))},o=["hasOwnProperty","toString","valueOf","__defineGetter__","__defineSetter__","__lookupGetter__","__lookupSetter__"],a=["__proto__","constructor","prototype"],h={allowBooleanAttributes:!1,unpairedTags:[]};function l(t,e){e=Object.assign({},h,e);const n=[];let i=!1,s=!1;"\ufeff"===t[0]&&(t=t.substr(1));for(let r=0;r<t.length;r++)if("<"===t[r]&&"?"===t[r+1]){if(r+=2,r=p(t,r),r.err)return r}else{if("<"!==t[r]){if(u(t[r]))continue;return b("InvalidChar","char '"+t[r]+"' is not expected.",w(t,r))}{let o=r;if(r++,"!"===t[r]){r=c(t,r);continue}{let a=!1;"/"===t[r]&&(a=!0,r++);let h="";for(;r<t.length&&">"!==t[r]&&" "!==t[r]&&"\t"!==t[r]&&"\n"!==t[r]&&"\r"!==t[r];r++)h+=t[r];if(h=h.trim(),"/"===h[h.length-1]&&(h=h.substring(0,h.length-1),r--),!E(h)){let e;return e=0===h.trim().length?"Invalid space after '<'.":"Tag '"+h+"' is an invalid name.",b("InvalidTag",e,w(t,r))}const l=g(t,r);if(!1===l)return b("InvalidAttr","Attributes for '"+h+"' have open quote.",w(t,r));let d=l.value;if(r=l.index,"/"===d[d.length-1]){const n=r-d.length;d=d.substring(0,d.length-1);const s=x(d,e);if(!0!==s)return b(s.err.code,s.err.msg,w(t,n+s.err.line));i=!0}else if(a){if(!l.tagClosed)return b("InvalidTag","Closing tag '"+h+"' doesn't have proper closing.",w(t,r));if(d.trim().length>0)return b("InvalidTag","Closing tag '"+h+"' can't have attributes or invalid starting.",w(t,o));if(0===n.length)return b("InvalidTag","Closing tag '"+h+"' has not been opened.",w(t,o));{const e=n.pop();if(h!==e.tagName){let n=w(t,e.tagStartPos);return b("InvalidTag","Expected closing tag '"+e.tagName+"' (opened in line "+n.line+", col "+n.col+") instead of closing tag '"+h+"'.",w(t,o))}0==n.length&&(s=!0)}}else{const a=x(d,e);if(!0!==a)return b(a.err.code,a.err.msg,w(t,r-d.length+a.err.line));if(!0===s)return b("InvalidXml","Multiple possible root nodes found.",w(t,r));-1!==e.unpairedTags.indexOf(h)||n.push({tagName:h,tagStartPos:o}),i=!0}for(r++;r<t.length;r++)if("<"===t[r]){if("!"===t[r+1]){r++,r=c(t,r);continue}if("?"!==t[r+1])break;if(r=p(t,++r),r.err)return r}else if("&"===t[r]){const e=N(t,r);if(-1==e)return b("InvalidChar","char '&' is not expected.",w(t,r));r=e}else if(!0===s&&!u(t[r]))return b("InvalidXml","Extra text at the end",w(t,r));"<"===t[r]&&r--}}}return i?1==n.length?b("InvalidTag","Unclosed tag '"+n[0].tagName+"'.",w(t,n[0].tagStartPos)):!(n.length>0)||b("InvalidXml","Invalid '"+JSON.stringify(n.map(t=>t.tagName),null,4).replace(/\r?\n/g,"")+"' found.",{line:1,col:1}):b("InvalidXml","Start tag expected.",1)}function u(t){return" "===t||"\t"===t||"\n"===t||"\r"===t}function p(t,e){const n=e;for(;e<t.length;e++)if("?"==t[e]||" "==t[e]){const i=t.substr(n,e-n);if(e>5&&"xml"===i)return b("InvalidXml","XML declaration allowed only at the start of the document.",w(t,e));if("?"==t[e]&&">"==t[e+1]){e++;break}continue}return e}function c(t,e){if(t.length>e+5&&"-"===t[e+1]&&"-"===t[e+2]){for(e+=3;e<t.length;e++)if("-"===t[e]&&"-"===t[e+1]&&">"===t[e+2]){e+=2;break}}else if(t.length>e+8&&"D"===t[e+1]&&"O"===t[e+2]&&"C"===t[e+3]&&"T"===t[e+4]&&"Y"===t[e+5]&&"P"===t[e+6]&&"E"===t[e+7]){let n=1;for(e+=8;e<t.length;e++)if("<"===t[e])n++;else if(">"===t[e]&&(n--,0===n))break}else if(t.length>e+9&&"["===t[e+1]&&"C"===t[e+2]&&"D"===t[e+3]&&"A"===t[e+4]&&"T"===t[e+5]&&"A"===t[e+6]&&"["===t[e+7])for(e+=8;e<t.length;e++)if("]"===t[e]&&"]"===t[e+1]&&">"===t[e+2]){e+=2;break}return e}const d='"',f="'";function g(t,e){let n="",i="",s=!1;for(;e<t.length;e++){if(t[e]===d||t[e]===f)""===i?i=t[e]:i!==t[e]||(i="");else if(">"===t[e]&&""===i){s=!0;break}n+=t[e]}return""===i&&{value:n,index:e,tagClosed:s}}const m=new RegExp("(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['\"])(([\\s\\S])*?)\\5)?","g");function x(t,e){const n=s(t,m),i={};for(let t=0;t<n.length;t++){if(0===n[t][1].length)return b("InvalidAttr","Attribute '"+n[t][2]+"' has no space in starting.",v(n[t]));if(void 0!==n[t][3]&&void 0===n[t][4])return b("InvalidAttr","Attribute '"+n[t][2]+"' is without value.",v(n[t]));if(void 0===n[t][3]&&!e.allowBooleanAttributes)return b("InvalidAttr","boolean attribute '"+n[t][2]+"' is not allowed.",v(n[t]));const s=n[t][2];if(!y(s))return b("InvalidAttr","Attribute '"+s+"' is an invalid name.",v(n[t]));if(Object.prototype.hasOwnProperty.call(i,s))return b("InvalidAttr","Attribute '"+s+"' is repeated.",v(n[t]));i[s]=1}return!0}function N(t,e){if(";"===t[++e])return-1;if("#"===t[e])return function(t,e){let n=/\d/;for("x"===t[e]&&(e++,n=/[\da-fA-F]/);e<t.length;e++){if(";"===t[e])return e;if(!t[e].match(n))break}return-1}(t,++e);let n=0;for(;e<t.length;e++,n++)if(!(t[e].match(/\w/)&&n<20)){if(";"===t[e])break;return-1}return e}function b(t,e,n){return{err:{code:t,msg:e,line:n.line||n,col:n.col}}}function y(t){return r(t)}function E(t){return r(t)}function w(t,e){const n=t.substring(0,e).split(/\r?\n/);return{line:n.length,col:n[n.length-1].length+1}}function v(t){return t.startIndex+t[1].length}const S=t=>o.includes(t)?"__"+t:t,_={preserveOrder:!1,attributeNamePrefix:"@_",attributesGroupName:!1,textNodeName:"#text",ignoreAttributes:!0,removeNSPrefix:!1,allowBooleanAttributes:!1,parseTagValue:!0,parseAttributeValue:!1,trimValues:!0,cdataPropName:!1,numberParseOptions:{hex:!0,leadingZeros:!0,eNotation:!0},tagValueProcessor:function(t,e){return e},attributeValueProcessor:function(t,e){return e},stopNodes:[],alwaysCreateTextNode:!1,isArray:()=>!1,commentPropName:!1,unpairedTags:[],processEntities:!0,htmlEntities:!1,entityDecoder:null,ignoreDeclaration:!1,ignorePiTags:!1,transformTagName:!1,transformAttributeName:!1,updateTag:function(t,e,n){return t},captureMetaData:!1,maxNestedTags:100,strictReservedNames:!0,jPath:!0,onDangerousProperty:S};function A(t,e){if("string"!=typeof t)return;const n=t.toLowerCase();if(o.some(t=>n===t.toLowerCase()))throw new Error(`[SECURITY] Invalid ${e}: "${t}" is a reserved JavaScript keyword that could cause prototype pollution`);if(a.some(t=>n===t.toLowerCase()))throw new Error(`[SECURITY] Invalid ${e}: "${t}" is a reserved JavaScript keyword that could cause prototype pollution`)}function T(t,e){return"boolean"==typeof t?{enabled:t,maxEntitySize:1e4,maxExpansionDepth:1e4,maxTotalExpansions:1/0,maxExpandedLength:1e5,maxEntityCount:1e3,allowedTags:null,tagFilter:null,appliesTo:"all"}:"object"==typeof t&&null!==t?{enabled:!1!==t.enabled,maxEntitySize:Math.max(1,t.maxEntitySize??1e4),maxExpansionDepth:Math.max(1,t.maxExpansionDepth??1e4),maxTotalExpansions:Math.max(1,t.maxTotalExpansions??1/0),maxExpandedLength:Math.max(1,t.maxExpandedLength??1e5),maxEntityCount:Math.max(1,t.maxEntityCount??1e3),allowedTags:t.allowedTags??null,tagFilter:t.tagFilter??null,appliesTo:t.appliesTo??"all"}:T(!0)}const C=function(t){const e=Object.assign({},_,t),n=[{value:e.attributeNamePrefix,name:"attributeNamePrefix"},{value:e.attributesGroupName,name:"attributesGroupName"},{value:e.textNodeName,name:"textNodeName"},{value:e.cdataPropName,name:"cdataPropName"},{value:e.commentPropName,name:"commentPropName"}];for(const{value:t,name:e}of n)t&&A(t,e);return null===e.onDangerousProperty&&(e.onDangerousProperty=S),e.processEntities=T(e.processEntities,e.htmlEntities),e.unpairedTagsSet=new Set(e.unpairedTags),e.stopNodes&&Array.isArray(e.stopNodes)&&(e.stopNodes=e.stopNodes.map(t=>"string"==typeof t&&t.startsWith("*.")?".."+t.substring(2):t)),e};let P;P="function"!=typeof Symbol?"@@xmlMetadata":Symbol("XML Node Metadata");class O{constructor(t){this.tagname=t,this.child=[],this[":@"]=Object.create(null)}add(t,e){"__proto__"===t&&(t="#__proto__"),this.child.push({[t]:e})}addChild(t,e){"__proto__"===t.tagname&&(t.tagname="#__proto__"),t[":@"]&&Object.keys(t[":@"]).length>0?this.child.push({[t.tagname]:t.child,":@":t[":@"]}):this.child.push({[t.tagname]:t.child}),void 0!==e&&(this.child[this.child.length-1][P]={startIndex:e})}static getMetaDataSymbol(){return P}}class ${constructor(t){this.suppressValidationErr=!t,this.options=t}readDocType(t,e){const n=Object.create(null);let i=0;if("O"!==t[e+3]||"C"!==t[e+4]||"T"!==t[e+5]||"Y"!==t[e+6]||"P"!==t[e+7]||"E"!==t[e+8])throw new Error("Invalid Tag instead of DOCTYPE");{e+=9;let s=1,r=!1,o=!1,a="";for(;e<t.length;e++)if("<"!==t[e]||o)if(">"===t[e]){if(o?"-"===t[e-1]&&"-"===t[e-2]&&(o=!1,s--):s--,0===s)break}else"["===t[e]?r=!0:a+=t[e];else{if(r&&D(t,"!ENTITY",e)){let s,r;if(e+=7,[s,r,e]=this.readEntityExp(t,e+1,this.suppressValidationErr),-1===r.indexOf("&")){if(!1!==this.options.enabled&&null!=this.options.maxEntityCount&&i>=this.options.maxEntityCount)throw new Error(`Entity count (${i+1}) exceeds maximum allowed (${this.options.maxEntityCount})`);n[s]=r,i++}}else if(r&&D(t,"!ELEMENT",e)){e+=8;const{index:n}=this.readElementExp(t,e+1);e=n}else if(r&&D(t,"!ATTLIST",e))e+=8;else if(r&&D(t,"!NOTATION",e)){e+=9;const{index:n}=this.readNotationExp(t,e+1,this.suppressValidationErr);e=n}else{if(!D(t,"!--",e))throw new Error("Invalid DOCTYPE");o=!0}s++,a=""}if(0!==s)throw new Error("Unclosed DOCTYPE")}return{entities:n,i:e}}readEntityExp(t,e){const n=e=I(t,e);for(;e<t.length&&!/\s/.test(t[e])&&'"'!==t[e]&&"'"!==t[e];)e++;let i=t.substring(n,e);if(M(i),e=I(t,e),!this.suppressValidationErr){if("SYSTEM"===t.substring(e,e+6).toUpperCase())throw new Error("External entities are not supported");if("%"===t[e])throw new Error("Parameter entities are not supported")}let s="";if([e,s]=this.readIdentifierVal(t,e,"entity"),!1!==this.options.enabled&&null!=this.options.maxEntitySize&&s.length>this.options.maxEntitySize)throw new Error(`Entity "${i}" size (${s.length}) exceeds maximum allowed size (${this.options.maxEntitySize})`);return[i,s,--e]}readNotationExp(t,e){const n=e=I(t,e);for(;e<t.length&&!/\s/.test(t[e]);)e++;let i=t.substring(n,e);!this.suppressValidationErr&&M(i),e=I(t,e);const s=t.substring(e,e+6).toUpperCase();if(!this.suppressValidationErr&&"SYSTEM"!==s&&"PUBLIC"!==s)throw new Error(`Expected SYSTEM or PUBLIC, found "${s}"`);e+=s.length,e=I(t,e);let r=null,o=null;if("PUBLIC"===s)[e,r]=this.readIdentifierVal(t,e,"publicIdentifier"),'"'!==t[e=I(t,e)]&&"'"!==t[e]||([e,o]=this.readIdentifierVal(t,e,"systemIdentifier"));else if("SYSTEM"===s&&([e,o]=this.readIdentifierVal(t,e,"systemIdentifier"),!this.suppressValidationErr&&!o))throw new Error("Missing mandatory system identifier for SYSTEM notation");return{notationName:i,publicIdentifier:r,systemIdentifier:o,index:--e}}readIdentifierVal(t,e,n){let i="";const s=t[e];if('"'!==s&&"'"!==s)throw new Error(`Expected quoted string, found "${s}"`);const r=++e;for(;e<t.length&&t[e]!==s;)e++;if(i=t.substring(r,e),t[e]!==s)throw new Error(`Unterminated ${n} value`);return[++e,i]}readElementExp(t,e){const n=e=I(t,e);for(;e<t.length&&!/\s/.test(t[e]);)e++;let i=t.substring(n,e);if(!this.suppressValidationErr&&!r(i))throw new Error(`Invalid element name: "${i}"`);let s="";if("E"===t[e=I(t,e)]&&D(t,"MPTY",e))e+=4;else if("A"===t[e]&&D(t,"NY",e))e+=2;else if("("===t[e]){const n=++e;for(;e<t.length&&")"!==t[e];)e++;if(s=t.substring(n,e),")"!==t[e])throw new Error("Unterminated content model")}else if(!this.suppressValidationErr)throw new Error(`Invalid Element Expression, found "${t[e]}"`);return{elementName:i,contentModel:s.trim(),index:e}}readAttlistExp(t,e){let n=e=I(t,e);for(;e<t.length&&!/\s/.test(t[e]);)e++;let i=t.substring(n,e);for(M(i),n=e=I(t,e);e<t.length&&!/\s/.test(t[e]);)e++;let s=t.substring(n,e);if(!M(s))throw new Error(`Invalid attribute name: "${s}"`);e=I(t,e);let r="";if("NOTATION"===t.substring(e,e+8).toUpperCase()){if(r="NOTATION","("!==t[e=I(t,e+=8)])throw new Error(`Expected '(', found "${t[e]}"`);e++;let n=[];for(;e<t.length&&")"!==t[e];){const i=e;for(;e<t.length&&"|"!==t[e]&&")"!==t[e];)e++;let s=t.substring(i,e);if(s=s.trim(),!M(s))throw new Error(`Invalid notation name: "${s}"`);n.push(s),"|"===t[e]&&(e++,e=I(t,e))}if(")"!==t[e])throw new Error("Unterminated list of notations");e++,r+=" ("+n.join("|")+")"}else{const n=e;for(;e<t.length&&!/\s/.test(t[e]);)e++;r+=t.substring(n,e);const i=["CDATA","ID","IDREF","IDREFS","ENTITY","ENTITIES","NMTOKEN","NMTOKENS"];if(!this.suppressValidationErr&&!i.includes(r.toUpperCase()))throw new Error(`Invalid attribute type: "${r}"`)}e=I(t,e);let o="";return"#REQUIRED"===t.substring(e,e+8).toUpperCase()?(o="#REQUIRED",e+=8):"#IMPLIED"===t.substring(e,e+7).toUpperCase()?(o="#IMPLIED",e+=7):[e,o]=this.readIdentifierVal(t,e,"ATTLIST"),{elementName:i,attributeName:s,attributeType:r,defaultValue:o,index:e}}}const I=(t,e)=>{for(;e<t.length&&/\s/.test(t[e]);)e++;return e};function D(t,e,n){for(let i=0;i<e.length;i++)if(e[i]!==t[n+i+1])return!1;return!0}function M(t){if(r(t))return t;throw new Error(`Invalid entity name ${t}`)}const j=/^[-+]?0x[a-fA-F0-9]+$/,V=/^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/,L={hex:!0,leadingZeros:!0,decimalPoint:".",eNotation:!0,infinity:"original"};const k=/^([-+])?(0*)(\d*(\.\d*)?[eE][-\+]?\d+)$/;class F{constructor(t){this._matcher=t}get separator(){return this._matcher.separator}getCurrentTag(){const t=this._matcher.path;return t.length>0?t[t.length-1].tag:void 0}getCurrentNamespace(){const t=this._matcher.path;return t.length>0?t[t.length-1].namespace:void 0}getAttrValue(t){const e=this._matcher.path;if(0!==e.length)return e[e.length-1].values?.[t]}hasAttr(t){const e=this._matcher.path;if(0===e.length)return!1;const n=e[e.length-1];return void 0!==n.values&&t in n.values}getPosition(){const t=this._matcher.path;return 0===t.length?-1:t[t.length-1].position??0}getCounter(){const t=this._matcher.path;return 0===t.length?-1:t[t.length-1].counter??0}getIndex(){return this.getPosition()}getDepth(){return this._matcher.path.length}toString(t,e=!0){return this._matcher.toString(t,e)}toArray(){return this._matcher.path.map(t=>t.tag)}matches(t){return this._matcher.matches(t)}matchesAny(t){return t.matchesAny(this._matcher)}}class R{constructor(t={}){this.separator=t.separator||".",this.path=[],this.siblingStacks=[],this._pathStringCache=null,this._view=new F(this)}push(t,e=null,n=null){this._pathStringCache=null,this.path.length>0&&(this.path[this.path.length-1].values=void 0);const i=this.path.length;this.siblingStacks[i]||(this.siblingStacks[i]=new Map);const s=this.siblingStacks[i],r=n?`${n}:${t}`:t,o=s.get(r)||0;let a=0;for(const t of s.values())a+=t;s.set(r,o+1);const h={tag:t,position:a,counter:o};null!=n&&(h.namespace=n),null!=e&&(h.values=e),this.path.push(h)}pop(){if(0===this.path.length)return;this._pathStringCache=null;const t=this.path.pop();return this.siblingStacks.length>this.path.length+1&&(this.siblingStacks.length=this.path.length+1),t}updateCurrent(t){if(this.path.length>0){const e=this.path[this.path.length-1];null!=t&&(e.values=t)}}getCurrentTag(){return this.path.length>0?this.path[this.path.length-1].tag:void 0}getCurrentNamespace(){return this.path.length>0?this.path[this.path.length-1].namespace:void 0}getAttrValue(t){if(0!==this.path.length)return this.path[this.path.length-1].values?.[t]}hasAttr(t){if(0===this.path.length)return!1;const e=this.path[this.path.length-1];return void 0!==e.values&&t in e.values}getPosition(){return 0===this.path.length?-1:this.path[this.path.length-1].position??0}getCounter(){return 0===this.path.length?-1:this.path[this.path.length-1].counter??0}getIndex(){return this.getPosition()}getDepth(){return this.path.length}toString(t,e=!0){const n=t||this.separator;if(n===this.separator&&!0===e){if(null!==this._pathStringCache)return this._pathStringCache;const t=this.path.map(t=>t.namespace?`${t.namespace}:${t.tag}`:t.tag).join(n);return this._pathStringCache=t,t}return this.path.map(t=>e&&t.namespace?`${t.namespace}:${t.tag}`:t.tag).join(n)}toArray(){return this.path.map(t=>t.tag)}reset(){this._pathStringCache=null,this.path=[],this.siblingStacks=[]}matches(t){const e=t.segments;return 0!==e.length&&(t.hasDeepWildcard()?this._matchWithDeepWildcard(e):this._matchSimple(e))}_matchSimple(t){if(this.path.length!==t.length)return!1;for(let e=0;e<t.length;e++)if(!this._matchSegment(t[e],this.path[e],e===this.path.length-1))return!1;return!0}_matchWithDeepWildcard(t){let e=this.path.length-1,n=t.length-1;for(;n>=0&&e>=0;){const i=t[n];if("deep-wildcard"===i.type){if(n--,n<0)return!0;const i=t[n];let s=!1;for(let t=e;t>=0;t--)if(this._matchSegment(i,this.path[t],t===this.path.length-1)){e=t-1,n--,s=!0;break}if(!s)return!1}else{if(!this._matchSegment(i,this.path[e],e===this.path.length-1))return!1;e--,n--}}return n<0}_matchSegment(t,e,n){if("*"!==t.tag&&t.tag!==e.tag)return!1;if(void 0!==t.namespace&&"*"!==t.namespace&&t.namespace!==e.namespace)return!1;if(void 0!==t.attrName){if(!n)return!1;if(!e.values||!(t.attrName in e.values))return!1;if(void 0!==t.attrValue&&String(e.values[t.attrName])!==String(t.attrValue))return!1}if(void 0!==t.position){if(!n)return!1;const i=e.counter??0;if("first"===t.position&&0!==i)return!1;if("odd"===t.position&&i%2!=1)return!1;if("even"===t.position&&i%2!=0)return!1;if("nth"===t.position&&i!==t.positionValue)return!1}return!0}matchesAny(t){return t.matchesAny(this)}snapshot(){return{path:this.path.map(t=>({...t})),siblingStacks:this.siblingStacks.map(t=>new Map(t))}}restore(t){this._pathStringCache=null,this.path=t.path.map(t=>({...t})),this.siblingStacks=t.siblingStacks.map(t=>new Map(t))}readOnly(){return this._view}}class G{constructor(t,e={},n){this.pattern=t,this.separator=e.separator||".",this.segments=this._parse(t),this.data=n,this._hasDeepWildcard=this.segments.some(t=>"deep-wildcard"===t.type),this._hasAttributeCondition=this.segments.some(t=>void 0!==t.attrName),this._hasPositionSelector=this.segments.some(t=>void 0!==t.position)}_parse(t){const e=[];let n=0,i="";for(;n<t.length;)t[n]===this.separator?n+1<t.length&&t[n+1]===this.separator?(i.trim()&&(e.push(this._parseSegment(i.trim())),i=""),e.push({type:"deep-wildcard"}),n+=2):(i.trim()&&e.push(this._parseSegment(i.trim())),i="",n++):(i+=t[n],n++);return i.trim()&&e.push(this._parseSegment(i.trim())),e}_parseSegment(t){const e={type:"tag"};let n=null,i=t;const s=t.match(/^([^\[]+)(\[[^\]]*\])(.*)$/);if(s&&(i=s[1]+s[3],s[2])){const t=s[2].slice(1,-1);t&&(n=t)}let r,o,a=i;if(i.includes("::")){const e=i.indexOf("::");if(r=i.substring(0,e).trim(),a=i.substring(e+2).trim(),!r)throw new Error(`Invalid namespace in pattern: ${t}`)}let h=null;if(a.includes(":")){const t=a.lastIndexOf(":"),e=a.substring(0,t).trim(),n=a.substring(t+1).trim();["first","last","odd","even"].includes(n)||/^nth\(\d+\)$/.test(n)?(o=e,h=n):o=a}else o=a;if(!o)throw new Error(`Invalid segment pattern: ${t}`);if(e.tag=o,r&&(e.namespace=r),n)if(n.includes("=")){const t=n.indexOf("=");e.attrName=n.substring(0,t).trim(),e.attrValue=n.substring(t+1).trim()}else e.attrName=n.trim();if(h){const t=h.match(/^nth\((\d+)\)$/);t?(e.position="nth",e.positionValue=parseInt(t[1],10)):e.position=h}return e}get length(){return this.segments.length}hasDeepWildcard(){return this._hasDeepWildcard}hasAttributeCondition(){return this._hasAttributeCondition}hasPositionSelector(){return this._hasPositionSelector}toString(){return this.pattern}}class B{constructor(){this._byDepthAndTag=new Map,this._wildcardByDepth=new Map,this._deepWildcards=[],this._patterns=new Set,this._sealed=!1}add(t){if(this._sealed)throw new TypeError("ExpressionSet is sealed. Create a new ExpressionSet to add more expressions.");if(this._patterns.has(t.pattern))return this;if(this._patterns.add(t.pattern),t.hasDeepWildcard())return this._deepWildcards.push(t),this;const e=t.length,n=t.segments[t.segments.length-1],i=n?.tag;if(i&&"*"!==i){const n=`${e}:${i}`;this._byDepthAndTag.has(n)||this._byDepthAndTag.set(n,[]),this._byDepthAndTag.get(n).push(t)}else this._wildcardByDepth.has(e)||this._wildcardByDepth.set(e,[]),this._wildcardByDepth.get(e).push(t);return this}addAll(t){for(const e of t)this.add(e);return this}has(t){return this._patterns.has(t.pattern)}get size(){return this._patterns.size}seal(){return this._sealed=!0,this}get isSealed(){return this._sealed}matchesAny(t){return null!==this.findMatch(t)}findMatch(t){const e=t.getDepth(),n=`${e}:${t.getCurrentTag()}`,i=this._byDepthAndTag.get(n);if(i)for(let e=0;e<i.length;e++)if(t.matches(i[e]))return i[e];const s=this._wildcardByDepth.get(e);if(s)for(let e=0;e<s.length;e++)if(t.matches(s[e]))return s[e];for(let e=0;e<this._deepWildcards.length;e++)if(t.matches(this._deepWildcards[e]))return this._deepWildcards[e];return null}}const U={cent:"¢",pound:"£",curren:"¤",yen:"¥",euro:"€",dollar:"$",euro:"€",fnof:"ƒ",inr:"₹",af:"؋",birr:"ብር",peso:"₱",rub:"₽",won:"₩",yuan:"¥",cedil:"¸"},W={amp:"&",apos:"'",gt:">",lt:"<",quot:'"'},X={nbsp:" ",copy:"©",reg:"®",trade:"™",mdash:"—",ndash:"–",hellip:"…",laquo:"«",raquo:"»",lsquo:"‘",rsquo:"’",ldquo:"“",rdquo:"”",bull:"•",para:"¶",sect:"§",deg:"°",frac12:"½",frac14:"¼",frac34:"¾"},Y=new Set("!?\\\\/[]$%{}^&*()<>|+");function z(t){if("#"===t[0])throw new Error(`[EntityReplacer] Invalid character '#' in entity name: "${t}"`);for(const e of t)if(Y.has(e))throw new Error(`[EntityReplacer] Invalid character '${e}' in entity name: "${t}"`);return t}function q(...t){const e=Object.create(null);for(const n of t)if(n)for(const t of Object.keys(n)){const i=n[t];if("string"==typeof i)e[t]=i;else if(i&&"object"==typeof i&&void 0!==i.val){const n=i.val;"string"==typeof n&&(e[t]=n)}}return e}const Z="external",J="base",K="all",Q=Object.freeze({allow:0,leave:1,remove:2,throw:3}),H=new Set([9,10,13]);class tt{constructor(t={}){var e;this._limit=t.limit||{},this._maxTotalExpansions=this._limit.maxTotalExpansions||0,this._maxExpandedLength=this._limit.maxExpandedLength||0,this._postCheck="function"==typeof t.postCheck?t.postCheck:t=>t,this._limitTiers=(e=this._limit.applyLimitsTo??Z)&&e!==Z?e===K?new Set([K]):e===J?new Set([J]):Array.isArray(e)?new Set(e):new Set([Z]):new Set([Z]),this._numericAllowed=t.numericAllowed??!0,this._baseMap=q(W,t.namedEntities||null),this._externalMap=Object.create(null),this._inputMap=Object.create(null),this._totalExpansions=0,this._expandedLength=0,this._removeSet=new Set(t.remove&&Array.isArray(t.remove)?t.remove:[]),this._leaveSet=new Set(t.leave&&Array.isArray(t.leave)?t.leave:[]);const n=function(t){if(!t)return{xmlVersion:1,onLevel:Q.allow,nullLevel:Q.remove};const e=1.1===t.xmlVersion?1.1:1,n=Q[t.onNCR]??Q.allow,i=Q[t.nullNCR]??Q.remove;return{xmlVersion:e,onLevel:n,nullLevel:Math.max(i,Q.remove)}}(t.ncr);this._ncrXmlVersion=n.xmlVersion,this._ncrOnLevel=n.onLevel,this._ncrNullLevel=n.nullLevel}setExternalEntities(t){if(t)for(const e of Object.keys(t))z(e);this._externalMap=q(t)}addExternalEntity(t,e){z(t),"string"==typeof e&&-1===e.indexOf("&")&&(this._externalMap[t]=e)}addInputEntities(t){this._totalExpansions=0,this._expandedLength=0,this._inputMap=q(t)}reset(){return this._inputMap=Object.create(null),this._totalExpansions=0,this._expandedLength=0,this}setXmlVersion(t){this._ncrXmlVersion=1.1===t?1.1:1}decode(t){if("string"!=typeof t||0===t.length)return t;const e=t,n=[],i=t.length;let s=0,r=0;const o=this._maxTotalExpansions>0,a=this._maxExpandedLength>0,h=o||a;for(;r<i;){if(38!==t.charCodeAt(r)){r++;continue}let e=r+1;for(;e<i&&59!==t.charCodeAt(e)&&e-r<=32;)e++;if(e>=i||59!==t.charCodeAt(e)){r++;continue}const l=t.slice(r+1,e);if(0===l.length){r++;continue}let u,p;if(this._removeSet.has(l))u="",void 0===p&&(p=Z);else{if(this._leaveSet.has(l)){r++;continue}if(35===l.charCodeAt(0)){const t=this._resolveNCR(l);if(void 0===t){r++;continue}u=t,p=J}else{const t=this._resolveName(l);u=t?.value,p=t?.tier}}if(void 0!==u){if(r>s&&n.push(t.slice(s,r)),n.push(u),s=e+1,r=s,h&&this._tierCounts(p)){if(o&&(this._totalExpansions++,this._totalExpansions>this._maxTotalExpansions))throw new Error(`[EntityReplacer] Entity expansion count limit exceeded: ${this._totalExpansions} > ${this._maxTotalExpansions}`);if(a){const t=u.length-(l.length+2);if(t>0&&(this._expandedLength+=t,this._expandedLength>this._maxExpandedLength))throw new Error(`[EntityReplacer] Expanded content length limit exceeded: ${this._expandedLength} > ${this._maxExpandedLength}`)}}}else r++}s<i&&n.push(t.slice(s));const l=0===n.length?t:n.join("");return this._postCheck(l,e)}_tierCounts(t){return!!this._limitTiers.has(K)||this._limitTiers.has(t)}_resolveName(t){return t in this._inputMap?{value:this._inputMap[t],tier:Z}:t in this._externalMap?{value:this._externalMap[t],tier:Z}:t in this._baseMap?{value:this._baseMap[t],tier:J}:void 0}_classifyNCR(t){return 0===t?this._ncrNullLevel:t>=55296&&t<=57343||1===this._ncrXmlVersion&&t>=1&&t<=31&&!H.has(t)?Q.remove:-1}_applyNCRAction(t,e,n){switch(t){case Q.allow:return String.fromCodePoint(n);case Q.remove:return"";case Q.leave:return;case Q.throw:throw new Error(`[EntityDecoder] Prohibited numeric character reference &${e}; (U+${n.toString(16).toUpperCase().padStart(4,"0")})`);default:return String.fromCodePoint(n)}}_resolveNCR(t){const e=t.charCodeAt(1);let n;if(n=120===e||88===e?parseInt(t.slice(2),16):parseInt(t.slice(1),10),Number.isNaN(n)||n<0||n>1114111)return;const i=this._classifyNCR(n);if(!this._numericAllowed&&i<Q.remove)return;const s=-1===i?this._ncrOnLevel:Math.max(this._ncrOnLevel,i);return this._applyNCRAction(s,t,n)}}function et(t,e){if(!t)return{};const n=e.attributesGroupName?t[e.attributesGroupName]:t;if(!n)return{};const i={};for(const t in n)t.startsWith(e.attributeNamePrefix)?i[t.substring(e.attributeNamePrefix.length)]=n[t]:i[t]=n[t];return i}function nt(t){if(!t||"string"!=typeof t)return;const e=t.indexOf(":");if(-1!==e&&e>0){const n=t.substring(0,e);if("xmlns"!==n)return n}}class it{constructor(t,e){var n;this.options=t,this.currentNode=null,this.tagsNodeStack=[],this.parseXml=ht,this.parseTextData=st,this.resolveNameSpace=rt,this.buildAttributesMap=at,this.isItStopNode=ct,this.replaceEntitiesValue=ut,this.readStopNodeData=mt,this.saveTextToParentTag=pt,this.addChild=lt,this.ignoreAttributesFn="function"==typeof(n=this.options.ignoreAttributes)?n:Array.isArray(n)?t=>{for(const e of n){if("string"==typeof e&&t===e)return!0;if(e instanceof RegExp&&e.test(t))return!0}}:()=>!1,this.entityExpansionCount=0,this.currentExpandedLength=0;let i={...W};this.options.entityDecoder?this.entityDecoder=this.options.entityDecoder:("object"==typeof this.options.htmlEntities?i=this.options.htmlEntities:!0===this.options.htmlEntities&&(i={...X,...U}),this.entityDecoder=new tt({namedEntities:{...i,...e},numericAllowed:this.options.htmlEntities,limit:{maxTotalExpansions:this.options.processEntities.maxTotalExpansions,maxExpandedLength:this.options.processEntities.maxExpandedLength,applyLimitsTo:this.options.processEntities.appliesTo}})),this.matcher=new R,this.readonlyMatcher=this.matcher.readOnly(),this.isCurrentNodeStopNode=!1,this.stopNodeExpressionsSet=new B;const s=this.options.stopNodes;if(s&&s.length>0){for(let t=0;t<s.length;t++){const e=s[t];"string"==typeof e?this.stopNodeExpressionsSet.add(new G(e)):e instanceof G&&this.stopNodeExpressionsSet.add(e)}this.stopNodeExpressionsSet.seal()}}}function st(t,e,n,i,s,r,o){const a=this.options;if(void 0!==t&&(a.trimValues&&!i&&(t=t.trim()),t.length>0)){o||(t=this.replaceEntitiesValue(t,e,n));const i=a.jPath?n.toString():n,h=a.tagValueProcessor(e,t,i,s,r);return null==h?t:typeof h!=typeof t||h!==t?h:a.trimValues||t.trim()===t?xt(t,a.parseTagValue,a.numberParseOptions):t}}function rt(t){if(this.options.removeNSPrefix){const e=t.split(":"),n="/"===t.charAt(0)?"/":"";if("xmlns"===e[0])return"";2===e.length&&(t=n+e[1])}return t}const ot=new RegExp("([^\\s=]+)\\s*(=\\s*(['\"])([\\s\\S]*?)\\3)?","gm");function at(t,e,n,i=!1){const r=this.options;if(!0===i||!0!==r.ignoreAttributes&&"string"==typeof t){const i=s(t,ot),o=i.length,a={},h=new Array(o);let l=!1;const u={};for(let t=0;t<o;t++){const e=this.resolveNameSpace(i[t][1]),s=i[t][4];if(e.length&&void 0!==s){let i=s;r.trimValues&&(i=i.trim()),i=this.replaceEntitiesValue(i,n,this.readonlyMatcher),h[t]=i,u[e]=i,l=!0}}l&&"object"==typeof e&&e.updateCurrent&&e.updateCurrent(u);const p=r.jPath?e.toString():this.readonlyMatcher;let c=!1;for(let t=0;t<o;t++){const e=this.resolveNameSpace(i[t][1]);if(this.ignoreAttributesFn(e,p))continue;let n=r.attributeNamePrefix+e;if(e.length)if(r.transformAttributeName&&(n=r.transformAttributeName(n)),n=bt(n,r),void 0!==i[t][4]){const i=h[t],s=r.attributeValueProcessor(e,i,p);a[n]=null==s?i:typeof s!=typeof i||s!==i?s:xt(i,r.parseAttributeValue,r.numberParseOptions),c=!0}else r.allowBooleanAttributes&&(a[n]=!0,c=!0)}if(!c)return;if(r.attributesGroupName&&!r.preserveOrder){const t={};return t[r.attributesGroupName]=a,t}return a}}const ht=function(t){t=t.replace(/\r\n?/g,"\n");const e=new O("!xml");let n=e,i="";this.matcher.reset(),this.entityDecoder.reset(),this.entityExpansionCount=0,this.currentExpandedLength=0;const s=this.options,r=new $(s.processEntities),o=t.length;for(let a=0;a<o;a++)if("<"===t[a]){const h=t.charCodeAt(a+1);if(47===h){const e=dt(t,">",a,"Closing Tag is not closed.");let r=t.substring(a+2,e).trim();if(s.removeNSPrefix){const t=r.indexOf(":");-1!==t&&(r=r.substr(t+1))}r=Nt(s.transformTagName,r,"",s).tagName,n&&(i=this.saveTextToParentTag(i,n,this.readonlyMatcher));const o=this.matcher.getCurrentTag();if(r&&s.unpairedTagsSet.has(r))throw new Error(`Unpaired tag can not be used as closing tag: </${r}>`);o&&s.unpairedTagsSet.has(o)&&(this.matcher.pop(),this.tagsNodeStack.pop()),this.matcher.pop(),this.isCurrentNodeStopNode=!1,n=this.tagsNodeStack.pop(),i="",a=e}else if(63===h){let e=gt(t,a,!1,"?>");if(!e)throw new Error("Pi Tag is not closed.");i=this.saveTextToParentTag(i,n,this.readonlyMatcher);const r=this.buildAttributesMap(e.tagExp,this.matcher,e.tagName,!0);if(r){const t=r[this.options.attributeNamePrefix+"version"];this.entityDecoder.setXmlVersion(Number(t)||1)}if(s.ignoreDeclaration&&"?xml"===e.tagName||s.ignorePiTags);else{const t=new O(e.tagName);t.add(s.textNodeName,""),e.tagName!==e.tagExp&&e.attrExpPresent&&!0!==s.ignoreAttributes&&(t[":@"]=r),this.addChild(n,t,this.readonlyMatcher,a)}a=e.closeIndex+1}else if(33===h&&45===t.charCodeAt(a+2)&&45===t.charCodeAt(a+3)){const e=dt(t,"--\x3e",a+4,"Comment is not closed.");if(s.commentPropName){const r=t.substring(a+4,e-2);i=this.saveTextToParentTag(i,n,this.readonlyMatcher),n.add(s.commentPropName,[{[s.textNodeName]:r}])}a=e}else if(33===h&&68===t.charCodeAt(a+2)){const e=r.readDocType(t,a);this.entityDecoder.addInputEntities(e.entities),a=e.i}else if(33===h&&91===t.charCodeAt(a+2)){const e=dt(t,"]]>",a,"CDATA is not closed.")-2,r=t.substring(a+9,e);i=this.saveTextToParentTag(i,n,this.readonlyMatcher);let o=this.parseTextData(r,n.tagname,this.readonlyMatcher,!0,!1,!0,!0);null==o&&(o=""),s.cdataPropName?n.add(s.cdataPropName,[{[s.textNodeName]:r}]):n.add(s.textNodeName,o),a=e+2}else{let r=gt(t,a,s.removeNSPrefix);if(!r){const e=t.substring(Math.max(0,a-50),Math.min(o,a+50));throw new Error(`readTagExp returned undefined at position ${a}. Context: "${e}"`)}let h=r.tagName;const l=r.rawTagName;let u=r.tagExp,p=r.attrExpPresent,c=r.closeIndex;if(({tagName:h,tagExp:u}=Nt(s.transformTagName,h,u,s)),s.strictReservedNames&&(h===s.commentPropName||h===s.cdataPropName||h===s.textNodeName||h===s.attributesGroupName))throw new Error(`Invalid tag name: ${h}`);n&&i&&"!xml"!==n.tagname&&(i=this.saveTextToParentTag(i,n,this.readonlyMatcher,!1));const d=n;d&&s.unpairedTagsSet.has(d.tagname)&&(n=this.tagsNodeStack.pop(),this.matcher.pop());let f=!1;u.length>0&&u.lastIndexOf("/")===u.length-1&&(f=!0,"/"===h[h.length-1]?(h=h.substr(0,h.length-1),u=h):u=u.substr(0,u.length-1),p=h!==u);let g,m=null,x={};g=nt(l),h!==e.tagname&&this.matcher.push(h,{},g),h!==u&&p&&(m=this.buildAttributesMap(u,this.matcher,h),m&&(x=et(m,s))),h!==e.tagname&&(this.isCurrentNodeStopNode=this.isItStopNode());const N=a;if(this.isCurrentNodeStopNode){let e="";if(f)a=r.closeIndex;else if(s.unpairedTagsSet.has(h))a=r.closeIndex;else{const n=this.readStopNodeData(t,l,c+1);if(!n)throw new Error(`Unexpected end of ${l}`);a=n.i,e=n.tagContent}const i=new O(h);m&&(i[":@"]=m),i.add(s.textNodeName,e),this.matcher.pop(),this.isCurrentNodeStopNode=!1,this.addChild(n,i,this.readonlyMatcher,N)}else{if(f){({tagName:h,tagExp:u}=Nt(s.transformTagName,h,u,s));const t=new O(h);m&&(t[":@"]=m),this.addChild(n,t,this.readonlyMatcher,N),this.matcher.pop(),this.isCurrentNodeStopNode=!1}else{if(s.unpairedTagsSet.has(h)){const t=new O(h);m&&(t[":@"]=m),this.addChild(n,t,this.readonlyMatcher,N),this.matcher.pop(),this.isCurrentNodeStopNode=!1,a=r.closeIndex;continue}{const t=new O(h);if(this.tagsNodeStack.length>s.maxNestedTags)throw new Error("Maximum nested tags exceeded");this.tagsNodeStack.push(n),m&&(t[":@"]=m),this.addChild(n,t,this.readonlyMatcher,N),n=t}}i="",a=c}}}else i+=t[a];return e.child};function lt(t,e,n,i){this.options.captureMetaData||(i=void 0);const s=this.options.jPath?n.toString():n,r=this.options.updateTag(e.tagname,s,e[":@"]);!1===r||("string"==typeof r?(e.tagname=r,t.addChild(e,i)):t.addChild(e,i))}function ut(t,e,n){const i=this.options.processEntities;if(!i||!i.enabled)return t;if(i.allowedTags){const s=this.options.jPath?n.toString():n;if(!(Array.isArray(i.allowedTags)?i.allowedTags.includes(e):i.allowedTags(e,s)))return t}if(i.tagFilter){const s=this.options.jPath?n.toString():n;if(!i.tagFilter(e,s))return t}return this.entityDecoder.decode(t)}function pt(t,e,n,i){return t&&(void 0===i&&(i=0===e.child.length),void 0!==(t=this.parseTextData(t,e.tagname,n,!1,!!e[":@"]&&0!==Object.keys(e[":@"]).length,i))&&""!==t&&e.add(this.options.textNodeName,t),t=""),t}function ct(){return 0!==this.stopNodeExpressionsSet.size&&this.matcher.matchesAny(this.stopNodeExpressionsSet)}function dt(t,e,n,i){const s=t.indexOf(e,n);if(-1===s)throw new Error(i);return s+e.length-1}function ft(t,e,n,i){const s=t.indexOf(e,n);if(-1===s)throw new Error(i);return s}function gt(t,e,n,i=">"){const s=function(t,e,n=">"){let i=0;const s=t.length,r=n.charCodeAt(0),o=n.length>1?n.charCodeAt(1):-1;let a="",h=e;for(let n=e;n<s;n++){const e=t.charCodeAt(n);if(i)e===i&&(i=0);else if(34===e||39===e)i=e;else if(e===r){if(-1===o)return a+=t.substring(h,n),{data:a,index:n};if(t.charCodeAt(n+1)===o)return a+=t.substring(h,n),{data:a,index:n}}else 9!==e||i||(a+=t.substring(h,n)+" ",h=n+1)}}(t,e+1,i);if(!s)return;let r=s.data;const o=s.index,a=r.search(/\s/);let h=r,l=!0;-1!==a&&(h=r.substring(0,a),r=r.substring(a+1).trimStart());const u=h;if(n){const t=h.indexOf(":");-1!==t&&(h=h.substr(t+1),l=h!==s.data.substr(t+1))}return{tagName:h,tagExp:r,closeIndex:o,attrExpPresent:l,rawTagName:u}}function mt(t,e,n){const i=n;let s=1;const r=t.length;for(;n<r;n++)if("<"===t[n]){const r=t.charCodeAt(n+1);if(47===r){const r=ft(t,">",n,`${e} is not closed`);if(t.substring(n+2,r).trim()===e&&(s--,0===s))return{tagContent:t.substring(i,n),i:r};n=r}else if(63===r)n=dt(t,"?>",n+1,"StopNode is not closed.");else if(33===r&&45===t.charCodeAt(n+2)&&45===t.charCodeAt(n+3))n=dt(t,"--\x3e",n+3,"StopNode is not closed.");else if(33===r&&91===t.charCodeAt(n+2))n=dt(t,"]]>",n,"StopNode is not closed.")-2;else{const i=gt(t,n,!1);i&&((i&&i.tagName)===e&&"/"!==i.tagExp[i.tagExp.length-1]&&s++,n=i.closeIndex)}}}function xt(t,e,n){if(e&&"string"==typeof t){const e=t.trim();return"true"===e||"false"!==e&&function(t,e={}){if(e=Object.assign({},L,e),!t||"string"!=typeof t)return t;let n=t.trim();if(0===n.length)return t;if(void 0!==e.skipLike&&e.skipLike.test(n))return t;if("0"===n)return 0;if(e.hex&&j.test(n))return function(t){if(parseInt)return parseInt(t,16);if(Number.parseInt)return Number.parseInt(t,16);if(window&&window.parseInt)return window.parseInt(t,16);throw new Error("parseInt, Number.parseInt, window.parseInt are not supported")}(n);if(isFinite(n)){if(n.includes("e")||n.includes("E"))return function(t,e,n){if(!n.eNotation)return t;const i=e.match(k);if(i){let s=i[1]||"";const r=-1===i[3].indexOf("e")?"E":"e",o=i[2],a=s?t[o.length+1]===r:t[o.length]===r;return o.length>1&&a?t:(1!==o.length||!i[3].startsWith(`.${r}`)&&i[3][0]!==r)&&o.length>0?n.leadingZeros&&!a?(e=(i[1]||"")+i[3],Number(e)):t:Number(e)}return t}(t,n,e);{const s=V.exec(n);if(s){const r=s[1]||"",o=s[2];let a=(i=s[3])&&-1!==i.indexOf(".")?("."===(i=i.replace(/0+$/,""))?i="0":"."===i[0]?i="0"+i:"."===i[i.length-1]&&(i=i.substring(0,i.length-1)),i):i;const h=r?"."===t[o.length+1]:"."===t[o.length];if(!e.leadingZeros&&(o.length>1||1===o.length&&!h))return t;{const i=Number(n),s=String(i);if(0===i)return i;if(-1!==s.search(/[eE]/))return e.eNotation?i:t;if(-1!==n.indexOf("."))return"0"===s||s===a||s===`${r}${a}`?i:t;let h=o?a:n;return o?h===s||r+h===s?i:t:h===s||h===r+s?i:t}}return t}}var i;return function(t,e,n){const i=e===1/0;switch(n.infinity.toLowerCase()){case"null":return null;case"infinity":return e;case"string":return i?"Infinity":"-Infinity";default:return t}}(t,Number(n),e)}(t,n)}return void 0!==t?t:""}function Nt(t,e,n,i){if(t){const i=t(e);n===e&&(n=i),e=i}return{tagName:e=bt(e,i),tagExp:n}}function bt(t,e){if(a.includes(t))throw new Error(`[SECURITY] Invalid name: "${t}" is a reserved JavaScript keyword that could cause prototype pollution`);return o.includes(t)?e.onDangerousProperty(t):t}const yt=O.getMetaDataSymbol();function Et(t,e){if(!t||"object"!=typeof t)return{};if(!e)return t;const n={};for(const i in t)i.startsWith(e)?n[i.substring(e.length)]=t[i]:n[i]=t[i];return n}function wt(t,e,n,i){return vt(t,e,n,i)}function vt(t,e,n,i){let s;const r={};for(let o=0;o<t.length;o++){const a=t[o],h=St(a);if(void 0!==h&&h!==e.textNodeName){const t=Et(a[":@"]||{},e.attributeNamePrefix);n.push(h,t)}if(h===e.textNodeName)void 0===s?s=a[h]:s+=""+a[h];else{if(void 0===h)continue;if(a[h]){let t=vt(a[h],e,n,i);const s=At(t,e);if(0===Object.keys(t).length&&e.alwaysCreateTextNode&&(t[e.textNodeName]=""),a[":@"]?_t(t,a[":@"],i,e):1!==Object.keys(t).length||void 0===t[e.textNodeName]||e.alwaysCreateTextNode?0===Object.keys(t).length&&(e.alwaysCreateTextNode?t[e.textNodeName]="":t=""):t=t[e.textNodeName],void 0!==a[yt]&&"object"==typeof t&&null!==t&&(t[yt]=a[yt]),void 0!==r[h]&&Object.prototype.hasOwnProperty.call(r,h))Array.isArray(r[h])||(r[h]=[r[h]]),r[h].push(t);else{const n=e.jPath?i.toString():i;e.isArray(h,n,s)?r[h]=[t]:r[h]=t}void 0!==h&&h!==e.textNodeName&&n.pop()}}}return"string"==typeof s?s.length>0&&(r[e.textNodeName]=s):void 0!==s&&(r[e.textNodeName]=s),r}function St(t){const e=Object.keys(t);for(let t=0;t<e.length;t++){const n=e[t];if(":@"!==n)return n}}function _t(t,e,n,i){if(e){const s=Object.keys(e),r=s.length;for(let o=0;o<r;o++){const r=s[o],a=r.startsWith(i.attributeNamePrefix)?r.substring(i.attributeNamePrefix.length):r,h=i.jPath?n.toString()+"."+a:n;i.isArray(r,h,!0,!0)?t[r]=[e[r]]:t[r]=e[r]}}}function At(t,e){const{textNodeName:n}=e,i=Object.keys(t).length;return 0===i||!(1!==i||!t[n]&&"boolean"!=typeof t[n]&&0!==t[n])}class Tt{constructor(t){this.externalEntities={},this.options=C(t)}parse(t,e){if("string"!=typeof t&&t.toString)t=t.toString();else if("string"!=typeof t)throw new Error("XML data is accepted in String or Bytes[] form.");if(e){!0===e&&(e={});const n=l(t,e);if(!0!==n)throw Error(`${n.err.msg}:${n.err.line}:${n.err.col}`)}const n=new it(this.options,this.externalEntities),i=n.parseXml(t);return this.options.preserveOrder||void 0===i?i:wt(i,this.options,n.matcher,n.readonlyMatcher)}addEntity(t,e){if(-1!==e.indexOf("&"))throw new Error("Entity value can't have '&'");if(-1!==t.indexOf("&")||-1!==t.indexOf(";"))throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");if("&"===e)throw new Error("An entity with value '&' is not permitted");this.externalEntities[t]=e}static getMetaDataSymbol(){return O.getMetaDataSymbol()}}function Ct(t){return String(t).replace(/--/g,"- -").replace(/--/g,"- -").replace(/-$/,"- ")}function Pt(t){return String(t).replace(/\]\]>/g,"]]]]><![CDATA[>")}function Ot(t){return String(t).replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function $t(t,e){let n="";e.format&&e.indentBy.length>0&&(n="\n");const i=[];if(e.stopNodes&&Array.isArray(e.stopNodes))for(let t=0;t<e.stopNodes.length;t++){const n=e.stopNodes[t];"string"==typeof n?i.push(new G(n)):n instanceof G&&i.push(n)}return It(t,e,n,new R,i)}function It(t,e,n,i,s){let r="",o=!1;if(e.maxNestedTags&&i.getDepth()>e.maxNestedTags)throw new Error("Maximum nested tags exceeded");if(!Array.isArray(t)){if(null!=t){let n=t.toString();return n=Ft(n,e),n}return""}for(let a=0;a<t.length;a++){const h=t[a],l=Vt(h);if(void 0===l)continue;const u=Dt(h[":@"],e);i.push(l,u);const p=kt(i,s);if(l===e.textNodeName){let t=h[l];p||(t=e.tagValueProcessor(l,t),t=Ft(t,e)),o&&(r+=n),r+=t,o=!1,i.pop();continue}if(l===e.cdataPropName){o&&(r+=n),r+=`<![CDATA[${Pt(h[l][0][e.textNodeName])}]]>`,o=!1,i.pop();continue}if(l===e.commentPropName){r+=n+`\x3c!--${Ct(h[l][0][e.textNodeName])}--\x3e`,o=!0,i.pop();continue}if("?"===l[0]){const t=Lt(h[":@"],e,p),s="?xml"===l?"":n;let a=h[l][0][e.textNodeName];a=0!==a.length?" "+a:"",r+=s+`<${l}${a}${t}?>`,o=!0,i.pop();continue}let c=n;""!==c&&(c+=e.indentBy);const d=n+`<${l}${Lt(h[":@"],e,p)}`;let f;f=p?Mt(h[l],e):It(h[l],e,c,i,s),-1!==e.unpairedTags.indexOf(l)?e.suppressUnpairedNode?r+=d+">":r+=d+"/>":f&&0!==f.length||!e.suppressEmptyNode?f&&f.endsWith(">")?r+=d+`>${f}${n}</${l}>`:(r+=d+">",f&&""!==n&&(f.includes("/>")||f.includes("</"))?r+=n+e.indentBy+f+n:r+=f,r+=`</${l}>`):r+=d+"/>",o=!0,i.pop()}return r}function Dt(t,e){if(!t||e.ignoreAttributes)return null;const n={};let i=!1;for(let s in t)Object.prototype.hasOwnProperty.call(t,s)&&(n[s.startsWith(e.attributeNamePrefix)?s.substr(e.attributeNamePrefix.length):s]=Ot(t[s]),i=!0);return i?n:null}function Mt(t,e){if(!Array.isArray(t))return null!=t?t.toString():"";let n="";for(let i=0;i<t.length;i++){const s=t[i],r=Vt(s);if(r===e.textNodeName)n+=s[r];else if(r===e.cdataPropName)n+=s[r][0][e.textNodeName];else if(r===e.commentPropName)n+=s[r][0][e.textNodeName];else{if(r&&"?"===r[0])continue;if(r){const t=jt(s[":@"],e),i=Mt(s[r],e);i&&0!==i.length?n+=`<${r}${t}>${i}</${r}>`:n+=`<${r}${t}/>`}}}return n}function jt(t,e){let n="";if(t&&!e.ignoreAttributes)for(let i in t){if(!Object.prototype.hasOwnProperty.call(t,i))continue;let s=t[i];!0===s&&e.suppressBooleanAttributes?n+=` ${i.substr(e.attributeNamePrefix.length)}`:n+=` ${i.substr(e.attributeNamePrefix.length)}="${Ot(s)}"`}return n}function Vt(t){const e=Object.keys(t);for(let n=0;n<e.length;n++){const i=e[n];if(Object.prototype.hasOwnProperty.call(t,i)&&":@"!==i)return i}}function Lt(t,e,n){let i="";if(t&&!e.ignoreAttributes)for(let s in t){if(!Object.prototype.hasOwnProperty.call(t,s))continue;let r;n?r=t[s]:(r=e.attributeValueProcessor(s,t[s]),r=Ft(r,e)),!0===r&&e.suppressBooleanAttributes?i+=` ${s.substr(e.attributeNamePrefix.length)}`:i+=` ${s.substr(e.attributeNamePrefix.length)}="${Ot(r)}"`}return i}function kt(t,e){if(!e||0===e.length)return!1;for(let n=0;n<e.length;n++)if(t.matches(e[n]))return!0;return!1}function Ft(t,e){if(t&&t.length>0&&e.processEntities)for(let n=0;n<e.entities.length;n++){const i=e.entities[n];t=t.replace(i.regex,i.val)}return t}const Rt={attributeNamePrefix:"@_",attributesGroupName:!1,textNodeName:"#text",ignoreAttributes:!0,cdataPropName:!1,format:!1,indentBy:"  ",suppressEmptyNode:!1,suppressUnpairedNode:!0,suppressBooleanAttributes:!0,tagValueProcessor:function(t,e){return e},attributeValueProcessor:function(t,e){return e},preserveOrder:!1,commentPropName:!1,unpairedTags:[],entities:[{regex:new RegExp("&","g"),val:"&amp;"},{regex:new RegExp(">","g"),val:"&gt;"},{regex:new RegExp("<","g"),val:"&lt;"},{regex:new RegExp("'","g"),val:"&apos;"},{regex:new RegExp('"',"g"),val:"&quot;"}],processEntities:!0,stopNodes:[],oneListGroup:!1,maxNestedTags:100,jPath:!0};function Gt(t){if(this.options=Object.assign({},Rt,t),this.options.stopNodes&&Array.isArray(this.options.stopNodes)&&(this.options.stopNodes=this.options.stopNodes.map(t=>"string"==typeof t&&t.startsWith("*.")?".."+t.substring(2):t)),this.stopNodeExpressions=[],this.options.stopNodes&&Array.isArray(this.options.stopNodes))for(let t=0;t<this.options.stopNodes.length;t++){const e=this.options.stopNodes[t];"string"==typeof e?this.stopNodeExpressions.push(new G(e)):e instanceof G&&this.stopNodeExpressions.push(e)}var e;!0===this.options.ignoreAttributes||this.options.attributesGroupName?this.isAttribute=function(){return!1}:(this.ignoreAttributesFn="function"==typeof(e=this.options.ignoreAttributes)?e:Array.isArray(e)?t=>{for(const n of e){if("string"==typeof n&&t===n)return!0;if(n instanceof RegExp&&n.test(t))return!0}}:()=>!1,this.attrPrefixLen=this.options.attributeNamePrefix.length,this.isAttribute=Wt),this.processTextOrObjNode=Bt,this.options.format?(this.indentate=Ut,this.tagEndChar=">\n",this.newLine="\n"):(this.indentate=function(){return""},this.tagEndChar=">",this.newLine="")}function Bt(t,e,n,i){const s=this.extractAttributes(t);if(i.push(e,s),this.checkStopNode(i)){const s=this.buildRawContent(t),r=this.buildAttributesForStopNode(t);return i.pop(),this.buildObjectNode(s,e,r,n)}const r=this.j2x(t,n+1,i);return i.pop(),void 0!==t[this.options.textNodeName]&&1===Object.keys(t).length?this.buildTextValNode(t[this.options.textNodeName],e,r.attrStr,n,i):this.buildObjectNode(r.val,e,r.attrStr,n)}function Ut(t){return this.options.indentBy.repeat(t)}function Wt(t){return!(!t.startsWith(this.options.attributeNamePrefix)||t===this.options.textNodeName)&&t.substr(this.attrPrefixLen)}Gt.prototype.build=function(t){if(this.options.preserveOrder)return $t(t,this.options);{Array.isArray(t)&&this.options.arrayNodeName&&this.options.arrayNodeName.length>1&&(t={[this.options.arrayNodeName]:t});const e=new R;return this.j2x(t,0,e).val}},Gt.prototype.j2x=function(t,e,n){let i="",s="";if(this.options.maxNestedTags&&n.getDepth()>=this.options.maxNestedTags)throw new Error("Maximum nested tags exceeded");const r=this.options.jPath?n.toString():n,o=this.checkStopNode(n);for(let a in t)if(Object.prototype.hasOwnProperty.call(t,a))if(void 0===t[a])this.isAttribute(a)&&(s+="");else if(null===t[a])this.isAttribute(a)||a===this.options.cdataPropName||a===this.options.commentPropName?s+="":"?"===a[0]?s+=this.indentate(e)+"<"+a+"?"+this.tagEndChar:s+=this.indentate(e)+"<"+a+"/"+this.tagEndChar;else if(t[a]instanceof Date)s+=this.buildTextValNode(t[a],a,"",e,n);else if("object"!=typeof t[a]){const h=this.isAttribute(a);if(h&&!this.ignoreAttributesFn(h,r))i+=this.buildAttrPairStr(h,""+t[a],o);else if(!h)if(a===this.options.textNodeName){let e=this.options.tagValueProcessor(a,""+t[a]);s+=this.replaceEntitiesValue(e)}else{n.push(a);const i=this.checkStopNode(n);if(n.pop(),i){const n=""+t[a];s+=""===n?this.indentate(e)+"<"+a+this.closeTag(a)+this.tagEndChar:this.indentate(e)+"<"+a+">"+n+"</"+a+this.tagEndChar}else s+=this.buildTextValNode(t[a],a,"",e,n)}}else if(Array.isArray(t[a])){const i=t[a].length;let r="",o="";for(let h=0;h<i;h++){const i=t[a][h];if(void 0===i);else if(null===i)"?"===a[0]?s+=this.indentate(e)+"<"+a+"?"+this.tagEndChar:s+=this.indentate(e)+"<"+a+"/"+this.tagEndChar;else if("object"==typeof i)if(this.options.oneListGroup){n.push(a);const t=this.j2x(i,e+1,n);n.pop(),r+=t.val,this.options.attributesGroupName&&i.hasOwnProperty(this.options.attributesGroupName)&&(o+=t.attrStr)}else r+=this.processTextOrObjNode(i,a,e,n);else if(this.options.oneListGroup){let t=this.options.tagValueProcessor(a,i);t=this.replaceEntitiesValue(t),r+=t}else{n.push(a);const t=this.checkStopNode(n);if(n.pop(),t){const t=""+i;r+=""===t?this.indentate(e)+"<"+a+this.closeTag(a)+this.tagEndChar:this.indentate(e)+"<"+a+">"+t+"</"+a+this.tagEndChar}else r+=this.buildTextValNode(i,a,"",e,n)}}this.options.oneListGroup&&(r=this.buildObjectNode(r,a,o,e)),s+=r}else if(this.options.attributesGroupName&&a===this.options.attributesGroupName){const e=Object.keys(t[a]),n=e.length;for(let s=0;s<n;s++)i+=this.buildAttrPairStr(e[s],""+t[a][e[s]],o)}else s+=this.processTextOrObjNode(t[a],a,e,n);return{attrStr:i,val:s}},Gt.prototype.buildAttrPairStr=function(t,e,n){return n||(e=this.options.attributeValueProcessor(t,""+e),e=this.replaceEntitiesValue(e)),this.options.suppressBooleanAttributes&&"true"===e?" "+t:" "+t+'="'+Ot(e)+'"'},Gt.prototype.extractAttributes=function(t){if(!t||"object"!=typeof t)return null;const e={};let n=!1;if(this.options.attributesGroupName&&t[this.options.attributesGroupName]){const i=t[this.options.attributesGroupName];for(let t in i)Object.prototype.hasOwnProperty.call(i,t)&&(e[t.startsWith(this.options.attributeNamePrefix)?t.substring(this.options.attributeNamePrefix.length):t]=Ot(i[t]),n=!0)}else for(let i in t){if(!Object.prototype.hasOwnProperty.call(t,i))continue;const s=this.isAttribute(i);s&&(e[s]=Ot(t[i]),n=!0)}return n?e:null},Gt.prototype.buildRawContent=function(t){if("string"==typeof t)return t;if("object"!=typeof t||null===t)return String(t);if(void 0!==t[this.options.textNodeName])return t[this.options.textNodeName];let e="";for(let n in t){if(!Object.prototype.hasOwnProperty.call(t,n))continue;if(this.isAttribute(n))continue;if(this.options.attributesGroupName&&n===this.options.attributesGroupName)continue;const i=t[n];if(n===this.options.textNodeName)e+=i;else if(Array.isArray(i)){for(let t of i)if("string"==typeof t||"number"==typeof t)e+=`<${n}>${t}</${n}>`;else if("object"==typeof t&&null!==t){const i=this.buildRawContent(t),s=this.buildAttributesForStopNode(t);e+=""===i?`<${n}${s}/>`:`<${n}${s}>${i}</${n}>`}}else if("object"==typeof i&&null!==i){const t=this.buildRawContent(i),s=this.buildAttributesForStopNode(i);e+=""===t?`<${n}${s}/>`:`<${n}${s}>${t}</${n}>`}else e+=`<${n}>${i}</${n}>`}return e},Gt.prototype.buildAttributesForStopNode=function(t){if(!t||"object"!=typeof t)return"";let e="";if(this.options.attributesGroupName&&t[this.options.attributesGroupName]){const n=t[this.options.attributesGroupName];for(let t in n){if(!Object.prototype.hasOwnProperty.call(n,t))continue;const i=t.startsWith(this.options.attributeNamePrefix)?t.substring(this.options.attributeNamePrefix.length):t,s=n[t];!0===s&&this.options.suppressBooleanAttributes?e+=" "+i:e+=" "+i+'="'+s+'"'}}else for(let n in t){if(!Object.prototype.hasOwnProperty.call(t,n))continue;const i=this.isAttribute(n);if(i){const s=t[n];!0===s&&this.options.suppressBooleanAttributes?e+=" "+i:e+=" "+i+'="'+s+'"'}}return e},Gt.prototype.buildObjectNode=function(t,e,n,i){if(""===t)return"?"===e[0]?this.indentate(i)+"<"+e+n+"?"+this.tagEndChar:this.indentate(i)+"<"+e+n+this.closeTag(e)+this.tagEndChar;{let s="</"+e+this.tagEndChar,r="";return"?"===e[0]&&(r="?",s=""),!n&&""!==n||-1!==t.indexOf("<")?!1!==this.options.commentPropName&&e===this.options.commentPropName&&0===r.length?this.indentate(i)+`\x3c!--${t}--\x3e`+this.newLine:this.indentate(i)+"<"+e+n+r+this.tagEndChar+t+this.indentate(i)+s:this.indentate(i)+"<"+e+n+r+">"+t+s}},Gt.prototype.closeTag=function(t){let e="";return-1!==this.options.unpairedTags.indexOf(t)?this.options.suppressUnpairedNode||(e="/"):e=this.options.suppressEmptyNode?"/":`></${t}`,e},Gt.prototype.checkStopNode=function(t){if(!this.stopNodeExpressions||0===this.stopNodeExpressions.length)return!1;for(let e=0;e<this.stopNodeExpressions.length;e++)if(t.matches(this.stopNodeExpressions[e]))return!0;return!1},Gt.prototype.buildTextValNode=function(t,e,n,i,s){if(!1!==this.options.cdataPropName&&e===this.options.cdataPropName){const e=Pt(t);return this.indentate(i)+`<![CDATA[${e}]]>`+this.newLine}if(!1!==this.options.commentPropName&&e===this.options.commentPropName){const e=Ct(t);return this.indentate(i)+`\x3c!--${e}--\x3e`+this.newLine}if("?"===e[0])return this.indentate(i)+"<"+e+n+"?"+this.tagEndChar;{let s=this.options.tagValueProcessor(e,t);return s=this.replaceEntitiesValue(s),""===s?this.indentate(i)+"<"+e+n+this.closeTag(e)+this.tagEndChar:this.indentate(i)+"<"+e+n+">"+s+"</"+e+this.tagEndChar}},Gt.prototype.replaceEntitiesValue=function(t){if(t&&t.length>0&&this.options.processEntities)for(let e=0;e<this.options.entities.length;e++){const n=this.options.entities[e];t=t.replace(n.regex,n.val)}return t};const Xt=Gt,Yt={validate:l};module.exports=e})();

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

/***/ 69168:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  bedrockProviderModule: () => (/* binding */ bedrockProviderModule)
});

// EXTERNAL MODULE: ../../node_modules/.pnpm/@aws-sdk+client-bedrock-runtime@3.1048.0/node_modules/@aws-sdk/client-bedrock-runtime/dist-cjs/index.js
var dist_cjs = __webpack_require__(64883);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@smithy+node-http-handler@4.7.3/node_modules/@smithy/node-http-handler/dist-cjs/index.js
var node_http_handler_dist_cjs = __webpack_require__(71745);
// EXTERNAL MODULE: ../../node_modules/.pnpm/http-proxy-agent@7.0.2/node_modules/http-proxy-agent/dist/index.js
var dist = __webpack_require__(6965);
// EXTERNAL MODULE: ../../node_modules/.pnpm/https-proxy-agent@7.0.6/node_modules/https-proxy-agent/dist/index.js
var https_proxy_agent_dist = __webpack_require__(4599);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/models.js
var models = __webpack_require__(73470);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/utils/error-body.js
var error_body = __webpack_require__(22191);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/utils/event-stream.js
var event_stream = __webpack_require__(14257);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/utils/headers.js
var headers = __webpack_require__(41146);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/utils/json-parse.js
var json_parse = __webpack_require__(91814);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/utils/node-http-proxy.js
var node_http_proxy = __webpack_require__(42594);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/utils/provider-env.js
var provider_env = __webpack_require__(94313);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/utils/sanitize-unicode.js
var sanitize_unicode = __webpack_require__(80279);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/api/simple-options.js + 1 modules
var simple_options = __webpack_require__(16417);
// EXTERNAL MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/api/transform-messages.js
var transform_messages = __webpack_require__(99994);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/api/bedrock-converse-stream.js














const EMPTY_TEXT_PLACEHOLDER = "<empty>";
const stream = (model, context, options = {}) => {
    const stream = new event_stream/* AssistantMessageEventStream */.Q2();
    (async () => {
        const output = {
            role: "assistant",
            content: [],
            api: "bedrock-converse-stream",
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
        const blocks = output.content;
        const config = {
            profile: options.profile || (0,provider_env/* getProviderEnvValue */.Y)("AWS_PROFILE", options.env),
        };
        const configuredRegion = getConfiguredBedrockRegion(options);
        const hasAmbientConfiguredProfile = Boolean((0,provider_env/* getProviderEnvValue */.Y)("AWS_PROFILE"));
        const endpointRegion = getStandardBedrockEndpointRegion(model.baseUrl);
        const useExplicitEndpoint = shouldUseExplicitBedrockEndpoint(model.baseUrl, configuredRegion, hasAmbientConfiguredProfile);
        // Only pin standard AWS Bedrock runtime endpoints when no region or ambient AWS_PROFILE is configured.
        // This preserves custom endpoints (VPC/proxy) from #3402 without forcing built-in
        // catalog defaults such as us-east-1 to override AWS_REGION/AWS_PROFILE.
        if (useExplicitEndpoint) {
            config.endpoint = model.baseUrl;
        }
        // Resolve bearer token for Bedrock API key auth.
        const skipAuth = (0,provider_env/* getProviderEnvValue */.Y)("AWS_BEDROCK_SKIP_AUTH", options.env) === "1";
        const bearerToken = options.bearerToken ||
            options.apiKey ||
            (0,provider_env/* getProviderEnvValue */.Y)("AWS_BEARER_TOKEN_BEDROCK", options.env) ||
            undefined;
        const useBearerToken = bearerToken !== undefined && !skipAuth;
        // in Node.js/Bun environment only
        if (typeof process !== "undefined" && (process.versions?.node || process.versions?.bun)) {
            // Region resolution: ARN-embedded > explicit option > env vars > SDK default chain.
            // When the model ID is an inference profile ARN, extract the region from it.
            // This avoids conflicts with AWS_REGION set for other services.
            const arnRegionMatch = model.id.match(/^arn:aws(?:-[a-z0-9-]+)?:bedrock:([a-z0-9-]+):/);
            if (arnRegionMatch) {
                config.region = arnRegionMatch[1];
            }
            else if (configuredRegion) {
                config.region = configuredRegion;
            }
            else if (endpointRegion && useExplicitEndpoint) {
                config.region = endpointRegion;
            }
            else if (!hasAmbientConfiguredProfile) {
                config.region = "us-east-1";
            }
            // Support proxies that don't need authentication
            if (skipAuth) {
                config.credentials = {
                    accessKeyId: "dummy-access-key",
                    secretAccessKey: "dummy-secret-key",
                };
            }
            const credentials = getConfiguredBedrockCredentials(options.env);
            if (!skipAuth && credentials) {
                config.credentials = credentials;
            }
            const proxyUrl = (0,node_http_proxy/* resolveHttpProxyUrlForTarget */.Q)(model.baseUrl, options.env);
            if (proxyUrl) {
                // Bedrock runtime uses NodeHttp2Handler by default since v3.798.0, which is based
                // on `http2` module and has no support for http agent.
                // Use NodeHttpHandler to support HTTP(S) proxy agents.
                config.requestHandler = new node_http_handler_dist_cjs.NodeHttpHandler({
                    httpAgent: new dist.HttpProxyAgent(proxyUrl),
                    httpsAgent: new https_proxy_agent_dist.HttpsProxyAgent(proxyUrl),
                });
            }
            else if ((0,provider_env/* getProviderEnvValue */.Y)("AWS_BEDROCK_FORCE_HTTP1", options.env) === "1") {
                // Some custom endpoints require HTTP/1.1 instead of HTTP/2
                config.requestHandler = new node_http_handler_dist_cjs.NodeHttpHandler();
            }
        }
        else {
            // Non-Node environment (browser): fall back to us-east-1 since
            // there's no config file resolution available.
            config.region =
                configuredRegion || (endpointRegion && useExplicitEndpoint ? endpointRegion : undefined) || "us-east-1";
        }
        if (useBearerToken) {
            config.token = { token: bearerToken };
            config.authSchemePreference = ["httpBearerAuth"];
        }
        try {
            const client = new dist_cjs.BedrockRuntimeClient(config);
            const customHeaders = (0,headers/* providerHeadersToRecord */.m)(options.headers);
            if (customHeaders) {
                addCustomHeadersMiddleware(client, customHeaders);
            }
            const cacheRetention = resolveCacheRetention(options.cacheRetention, options.env);
            const inferenceMaxTokens = options.maxTokens ?? (isAnthropicClaudeModel(model) ? model.maxTokens : undefined);
            let commandInput = {
                modelId: model.id,
                messages: convertMessages(context, model, cacheRetention, options.env),
                system: buildSystemPrompt(context.systemPrompt, model, cacheRetention, options.env),
                inferenceConfig: {
                    ...(inferenceMaxTokens !== undefined && { maxTokens: inferenceMaxTokens }),
                    ...(options.temperature !== undefined && { temperature: options.temperature }),
                },
                toolConfig: convertToolConfig(context.tools, options.toolChoice),
                additionalModelRequestFields: buildAdditionalModelRequestFields(model, options),
                ...(options.requestMetadata !== undefined && { requestMetadata: options.requestMetadata }),
            };
            const nextCommandInput = await options?.onPayload?.(commandInput, model);
            if (nextCommandInput !== undefined) {
                commandInput = nextCommandInput;
            }
            const command = new dist_cjs.ConverseStreamCommand(commandInput);
            const response = await client.send(command, { abortSignal: options.signal });
            if (response.$metadata.httpStatusCode !== undefined) {
                const responseHeaders = {};
                if (response.$metadata.requestId) {
                    responseHeaders["x-amzn-requestid"] = response.$metadata.requestId;
                }
                await options?.onResponse?.({ status: response.$metadata.httpStatusCode, headers: responseHeaders }, model);
            }
            for await (const item of response.stream) {
                if (item.messageStart) {
                    if (item.messageStart.role !== dist_cjs.ConversationRole.ASSISTANT) {
                        throw new Error("Unexpected assistant message start but got user message start instead");
                    }
                    stream.push({ type: "start", partial: output });
                }
                else if (item.contentBlockStart) {
                    handleContentBlockStart(item.contentBlockStart, blocks, output, stream);
                }
                else if (item.contentBlockDelta) {
                    handleContentBlockDelta(item.contentBlockDelta, blocks, output, stream);
                }
                else if (item.contentBlockStop) {
                    handleContentBlockStop(item.contentBlockStop, blocks, output, stream);
                }
                else if (item.messageStop) {
                    const { stopReason, errorMessage } = mapStopReason(item.messageStop.stopReason);
                    output.stopReason = stopReason;
                    if (errorMessage) {
                        output.errorMessage = errorMessage;
                    }
                }
                else if (item.metadata) {
                    handleMetadata(item.metadata, model, output);
                }
                else if (item.internalServerException) {
                    throw item.internalServerException;
                }
                else if (item.modelStreamErrorException) {
                    throw item.modelStreamErrorException;
                }
                else if (item.validationException) {
                    throw item.validationException;
                }
                else if (item.throttlingException) {
                    throw item.throttlingException;
                }
                else if (item.serviceUnavailableException) {
                    throw item.serviceUnavailableException;
                }
            }
            if (options.signal?.aborted) {
                throw new Error("Request was aborted");
            }
            if (output.stopReason === "error" || output.stopReason === "aborted") {
                throw new Error(output.errorMessage || "An unknown error occurred");
            }
            stream.push({ type: "done", reason: output.stopReason, message: output });
            stream.end();
        }
        catch (error) {
            for (const block of output.content) {
                delete block.index;
                // partialJson is only a streaming scratch buffer; never persist it.
                delete block.partialJson;
            }
            output.stopReason = options.signal?.aborted ? "aborted" : "error";
            output.errorMessage = formatBedrockError(error);
            stream.push({ type: "error", reason: output.stopReason, error: output });
            stream.end();
        }
    })();
    return stream;
};
/**
 * Human-readable prefixes for Bedrock SDK exception names.
 * The downstream retry logic in agent-session matches patterns like
 * `server.?error` and `service.?unavailable`, so we preserve the legacy
 * prefix format rather than using the raw SDK exception name.
 */
const BEDROCK_ERROR_PREFIXES = {
    InternalServerException: "Internal server error",
    ModelStreamErrorException: "Model stream error",
    ValidationException: "Validation error",
    ThrottlingException: "Throttling error",
    ServiceUnavailableException: "Service unavailable",
};
/**
 * Some models reject the account/profile's configured Bedrock data retention mode
 * (e.g. "data retention mode 'default' is not available for this model"). Point
 * users at the AWS docs explaining how to configure a supported mode.
 */
const BEDROCK_DATA_RETENTION_DOCS_URL = "https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html";
/**
 * Format a Bedrock error with a human-readable prefix.
 * AWS SDK exceptions (both from `client.send()` and from stream event items)
 * extend BedrockRuntimeServiceException. We map the `.name` to a stable
 * human-readable prefix so downstream consumers (retry logic, context-overflow
 * detection) can distinguish error categories via simple string matching.
 */
function formatBedrockError(error) {
    const norm = (0,error_body/* normalizeProviderError */.Jo)(error);
    // Surface the raw HTTP body (with status) when the SDK did not fold it into
    // the message; otherwise fall back to the message. This is what stops a
    // gateway 403 from collapsing to `Unknown: UnknownError`.
    const core = !norm.messageCarriesBody && norm.status !== undefined && norm.body !== undefined
        ? `${norm.status}: ${norm.body}`
        : norm.message;
    const dataRetentionHint = /data retention mode/i.test(core)
        ? ` See ${BEDROCK_DATA_RETENTION_DOCS_URL} for supported data retention modes.`
        : "";
    if (error instanceof dist_cjs.BedrockRuntimeServiceException) {
        const prefix = BEDROCK_ERROR_PREFIXES[error.name] ?? error.name;
        return `${prefix}: ${core}${dataRetentionHint}`;
    }
    return `${core}${dataRetentionHint}`;
}
/**
 * Header keys that must never be overwritten by caller-supplied headers.
 * `host` and `x-amz-*` participate in the SigV4 canonical request; `authorization`
 * is owned by SigV4 or the bearer-token path (config.token + authSchemePreference).
 * Compared case-insensitively (caller key is lower-cased before lookup).
 */
const RESERVED_HEADER_EXACT = new Set(["authorization", "host"]);
function isReservedHeader(key) {
    const lower = key.toLowerCase();
    return lower.startsWith("x-amz-") || RESERVED_HEADER_EXACT.has(lower);
}
/**
 * Attach caller-supplied headers to the outgoing Bedrock request via a Smithy
 * `build`-step middleware. The `build` step runs after request serialisation but
 * before SigV4 signing, so injected headers are covered by the signature. Reserved
 * SigV4 / auth headers (`x-amz-*`, `authorization`, `host`) are silently skipped;
 * all other caller headers override any existing same-named header on the request.
 */
function addCustomHeadersMiddleware(client, headers) {
    const middleware = (next) => async (args) => {
        const request = args.request;
        if (request && typeof request === "object" && "headers" in request) {
            const requestHeaders = request.headers;
            for (const [key, value] of Object.entries(headers)) {
                if (!isReservedHeader(key)) {
                    requestHeaders[key] = value;
                }
            }
        }
        return next(args);
    };
    client.middlewareStack.add(middleware, { step: "build", name: "pi-ai-custom-headers", priority: "low" });
}
const streamSimple = (model, context, options) => {
    const base = (0,simple_options/* buildBaseOptions */.QP)(model, context, options, undefined);
    if (!options?.reasoning) {
        return stream(model, context, { ...base, reasoning: undefined });
    }
    if (isAnthropicClaudeModel(model)) {
        if (supportsAdaptiveThinking(model.id, model.name)) {
            return stream(model, context, {
                ...base,
                reasoning: options.reasoning,
                thinkingBudgets: options.thinkingBudgets,
            });
        }
        // Undefined means the caller did not request an output cap; let the helper use the model cap.
        // Do not coerce to 0 here, or the thinking budget would become the entire maxTokens value.
        const adjusted = (0,simple_options/* adjustMaxTokensForThinking */.xw)(base.maxTokens, model.maxTokens, options.reasoning, options.thinkingBudgets);
        const maxTokens = (0,simple_options/* clampMaxTokensToContext */.Yx)(model, context, adjusted.maxTokens);
        return stream(model, context, {
            ...base,
            maxTokens,
            reasoning: options.reasoning,
            thinkingBudgets: {
                ...(options.thinkingBudgets || {}),
                [(0,simple_options/* clampReasoning */.M7)(options.reasoning)]: Math.min(adjusted.thinkingBudget, Math.max(0, maxTokens - 1024)),
            },
        });
    }
    return stream(model, context, {
        ...base,
        reasoning: options.reasoning,
        thinkingBudgets: options.thinkingBudgets,
    });
};
function handleContentBlockStart(event, blocks, output, stream) {
    const index = event.contentBlockIndex;
    const start = event.start;
    if (start?.toolUse) {
        const block = {
            type: "toolCall",
            id: start.toolUse.toolUseId || "",
            name: start.toolUse.name || "",
            arguments: {},
            partialJson: "",
            index,
        };
        output.content.push(block);
        stream.push({ type: "toolcall_start", contentIndex: blocks.length - 1, partial: output });
    }
}
function handleContentBlockDelta(event, blocks, output, stream) {
    const contentBlockIndex = event.contentBlockIndex;
    const delta = event.delta;
    let index = blocks.findIndex((b) => b.index === contentBlockIndex);
    let block = blocks[index];
    if (delta?.text !== undefined) {
        // If no text block exists yet, create one, as `handleContentBlockStart` is not sent for text blocks
        if (!block) {
            const newBlock = { type: "text", text: "", index: contentBlockIndex };
            output.content.push(newBlock);
            index = blocks.length - 1;
            block = blocks[index];
            stream.push({ type: "text_start", contentIndex: index, partial: output });
        }
        if (block.type === "text") {
            block.text += delta.text;
            stream.push({ type: "text_delta", contentIndex: index, delta: delta.text, partial: output });
        }
    }
    else if (delta?.toolUse && block?.type === "toolCall") {
        block.partialJson = (block.partialJson || "") + (delta.toolUse.input || "");
        block.arguments = (0,json_parse/* parseStreamingJson */.o2)(block.partialJson);
        stream.push({ type: "toolcall_delta", contentIndex: index, delta: delta.toolUse.input || "", partial: output });
    }
    else if (delta?.reasoningContent) {
        let thinkingBlock = block;
        let thinkingIndex = index;
        if (!thinkingBlock) {
            const newBlock = { type: "thinking", thinking: "", thinkingSignature: "", index: contentBlockIndex };
            output.content.push(newBlock);
            thinkingIndex = blocks.length - 1;
            thinkingBlock = blocks[thinkingIndex];
            stream.push({ type: "thinking_start", contentIndex: thinkingIndex, partial: output });
        }
        if (thinkingBlock?.type === "thinking") {
            if (delta.reasoningContent.text) {
                thinkingBlock.thinking += delta.reasoningContent.text;
                stream.push({
                    type: "thinking_delta",
                    contentIndex: thinkingIndex,
                    delta: delta.reasoningContent.text,
                    partial: output,
                });
            }
            if (delta.reasoningContent.signature) {
                thinkingBlock.thinkingSignature =
                    (thinkingBlock.thinkingSignature || "") + delta.reasoningContent.signature;
            }
        }
    }
}
function handleMetadata(event, model, output) {
    if (event.usage) {
        output.usage.input = event.usage.inputTokens || 0;
        output.usage.output = event.usage.outputTokens || 0;
        output.usage.cacheRead = event.usage.cacheReadInputTokens || 0;
        output.usage.cacheWrite = event.usage.cacheWriteInputTokens || 0;
        output.usage.totalTokens = event.usage.totalTokens || output.usage.input + output.usage.output;
        (0,models/* calculateCost */.yN)(model, output.usage);
    }
}
function handleContentBlockStop(event, blocks, output, stream) {
    const index = blocks.findIndex((b) => b.index === event.contentBlockIndex);
    const block = blocks[index];
    if (!block)
        return;
    delete block.index;
    switch (block.type) {
        case "text":
            stream.push({ type: "text_end", contentIndex: index, content: block.text, partial: output });
            break;
        case "thinking":
            stream.push({ type: "thinking_end", contentIndex: index, content: block.thinking, partial: output });
            break;
        case "toolCall":
            block.arguments = (0,json_parse/* parseStreamingJson */.o2)(block.partialJson);
            // Finalize in-place and strip the scratch buffer so replay only
            // carries parsed arguments.
            delete block.partialJson;
            stream.push({ type: "toolcall_end", contentIndex: index, toolCall: block, partial: output });
            break;
    }
}
/**
 * Check if the model supports adaptive thinking (Opus 4.6+, Sonnet 4.6).
 * Checks both model ID and model name to support application inference profiles
 * whose ARNs don't contain the model name.
 */
function getModelMatchCandidates(modelId, modelName) {
    const values = modelName ? [modelId, modelName] : [modelId];
    return values.flatMap((value) => {
        const lower = value.toLowerCase();
        return [lower, lower.replace(/[\s_.:]+/g, "-")];
    });
}
function supportsAdaptiveThinking(modelId, modelName) {
    const candidates = getModelMatchCandidates(modelId, modelName);
    return candidates.some((s) => s.includes("opus-4-6") ||
        s.includes("opus-4-7") ||
        s.includes("opus-4-8") ||
        s.includes("sonnet-4-6") ||
        s.includes("sonnet-5") ||
        s.includes("fable-5"));
}
function supportsNativeXhighEffort(model) {
    const candidates = getModelMatchCandidates(model.id, model.name);
    return candidates.some((s) => s.includes("opus-4-7") || s.includes("opus-4-8") || s.includes("sonnet-5") || s.includes("fable-5"));
}
function mapThinkingLevelToEffort(model, level) {
    if (level === "xhigh" && supportsNativeXhighEffort(model))
        return "xhigh";
    const mapped = level ? model.thinkingLevelMap?.[level] : undefined;
    if (typeof mapped === "string")
        return mapped;
    switch (level) {
        case "minimal":
        case "low":
            return "low";
        case "medium":
            return "medium";
        case "high":
            return "high";
        default:
            return "high";
    }
}
/**
 * Resolve cache retention preference.
 * Defaults to "short" and uses PI_CACHE_RETENTION for backward compatibility.
 */
function resolveCacheRetention(cacheRetention, env) {
    if (cacheRetention) {
        return cacheRetention;
    }
    if ((0,provider_env/* getProviderEnvValue */.Y)("PI_CACHE_RETENTION", env) === "long") {
        return "long";
    }
    return "short";
}
/**
 * Check if the model is an Anthropic Claude model on Bedrock.
 * Checks both model ID and model name to support application inference profiles
 * whose ARNs don't contain the model name.
 */
function isAnthropicClaudeModel(model) {
    const id = model.id.toLowerCase();
    const name = model.name?.toLowerCase() ?? "";
    return (id.includes("anthropic.claude") ||
        id.includes("anthropic/claude") ||
        name.includes("anthropic.claude") ||
        name.includes("anthropic/claude") ||
        name.includes("claude"));
}
/**
 * Check if the model supports prompt caching.
 * Supported: Claude 3.5 Haiku, Claude 3.7 Sonnet, Claude 4.x models, Claude 5 models
 *
 * For base models and system-defined inference profiles the model ID / ARN
 * contains the model name, so we can decide locally.
 *
 * For application inference profiles (whose ARNs don't contain the model name),
 * also checks model.name which is user-controlled via models.json or registerProvider.
 * As a last resort, set AWS_BEDROCK_FORCE_CACHE=1 to enable cache points.
 * Amazon Nova models have automatic caching and don't need explicit cache points.
 */
function supportsPromptCaching(model, env) {
    const candidates = getModelMatchCandidates(model.id, model.name);
    const hasClaudeRef = candidates.some((s) => s.includes("claude"));
    if (!hasClaudeRef) {
        // Application inference profiles don't contain the model name in the ARN.
        // Allow users to force cache points via environment variable.
        if ((0,provider_env/* getProviderEnvValue */.Y)("AWS_BEDROCK_FORCE_CACHE", env) === "1")
            return true;
        return false;
    }
    // Claude 5 models (fable-5, sonnet-5)
    if (candidates.some((s) => s.includes("fable-5") || s.includes("sonnet-5")))
        return true;
    // Claude 4.x models (opus-4, sonnet-4, haiku-4)
    if (candidates.some((s) => s.includes("-4-")))
        return true;
    // Claude 3.7 Sonnet
    if (candidates.some((s) => s.includes("claude-3-7-sonnet")))
        return true;
    // Claude 3.5 Haiku
    if (candidates.some((s) => s.includes("claude-3-5-haiku")))
        return true;
    return false;
}
/**
 * Check if the model supports thinking signatures in reasoningContent.
 * Only Anthropic Claude models support the signature field.
 * Other models (OpenAI, Qwen, Minimax, Moonshot, etc.) reject it with:
 * "This model doesn't support the reasoningContent.reasoningText.signature field"
 *
 * Checks both model ID and model name to support application inference profiles.
 */
function supportsThinkingSignature(model) {
    return isAnthropicClaudeModel(model);
}
function buildSystemPrompt(systemPrompt, model, cacheRetention, env) {
    if (!systemPrompt)
        return undefined;
    const blocks = [{ text: (0,sanitize_unicode/* sanitizeSurrogates */.J)(systemPrompt) }];
    // Add cache point for supported Claude models when caching is enabled
    if (cacheRetention !== "none" && supportsPromptCaching(model, env)) {
        blocks.push({
            cachePoint: { type: dist_cjs.CachePointType.DEFAULT, ...(cacheRetention === "long" ? { ttl: dist_cjs.CacheTTL.ONE_HOUR } : {}) },
        });
    }
    return blocks;
}
function normalizeToolCallId(id) {
    const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, "_");
    return sanitized.length > 64 ? sanitized.slice(0, 64) : sanitized;
}
function createNonBlankTextBlock(text) {
    const sanitized = (0,sanitize_unicode/* sanitizeSurrogates */.J)(text);
    return sanitized.trim().length === 0 ? undefined : { text: sanitized };
}
function createRequiredTextBlock(text) {
    return createNonBlankTextBlock(text) ?? { text: EMPTY_TEXT_PLACEHOLDER };
}
function convertToolResultContent(content) {
    const result = [];
    for (const c of content) {
        if (c.type === "image") {
            result.push({ image: createImageBlock(c.mimeType, c.data) });
        }
        else {
            const textBlock = createNonBlankTextBlock(c.text);
            if (textBlock)
                result.push(textBlock);
        }
    }
    if (result.length === 0)
        result.push({ text: EMPTY_TEXT_PLACEHOLDER });
    return result;
}
function convertMessages(context, model, cacheRetention, env) {
    const result = [];
    const transformedMessages = (0,transform_messages/* transformMessages */.b)(context.messages, model, normalizeToolCallId);
    for (let i = 0; i < transformedMessages.length; i++) {
        const m = transformedMessages[i];
        switch (m.role) {
            case "user": {
                const content = [];
                if (typeof m.content === "string") {
                    content.push(createRequiredTextBlock(m.content));
                }
                else {
                    for (const c of m.content) {
                        switch (c.type) {
                            case "text": {
                                const textBlock = createNonBlankTextBlock(c.text);
                                if (textBlock)
                                    content.push(textBlock);
                                break;
                            }
                            case "image":
                                content.push({ image: createImageBlock(c.mimeType, c.data) });
                                break;
                            default:
                                continue;
                        }
                    }
                    if (content.length === 0)
                        content.push({ text: EMPTY_TEXT_PLACEHOLDER });
                }
                result.push({
                    role: dist_cjs.ConversationRole.USER,
                    content,
                });
                break;
            }
            case "assistant": {
                // Skip assistant messages with empty content (e.g., from aborted requests)
                // Bedrock rejects messages with empty content arrays
                if (m.content.length === 0) {
                    continue;
                }
                const contentBlocks = [];
                for (const c of m.content) {
                    switch (c.type) {
                        case "text": {
                            // Skip empty text blocks
                            const textBlock = createNonBlankTextBlock(c.text);
                            if (!textBlock)
                                continue;
                            contentBlocks.push(textBlock);
                            break;
                        }
                        case "toolCall":
                            contentBlocks.push({
                                toolUse: { toolUseId: c.id, name: c.name, input: c.arguments },
                            });
                            break;
                        case "thinking": {
                            // Skip empty thinking blocks
                            const thinking = (0,sanitize_unicode/* sanitizeSurrogates */.J)(c.thinking);
                            if (thinking.trim().length === 0)
                                continue;
                            // Only Anthropic models support the signature field in reasoningText.
                            // For other models, we omit the signature to avoid errors like:
                            // "This model doesn't support the reasoningContent.reasoningText.signature field"
                            if (supportsThinkingSignature(model)) {
                                // Signatures arrive after thinking deltas. If a partial or externally
                                // persisted message lacks a signature, Bedrock rejects the replayed
                                // reasoning block. Fall back to plain text, matching Anthropic.
                                if (!c.thinkingSignature || c.thinkingSignature.trim().length === 0) {
                                    contentBlocks.push({ text: thinking });
                                }
                                else {
                                    contentBlocks.push({
                                        reasoningContent: {
                                            reasoningText: {
                                                text: thinking,
                                                signature: c.thinkingSignature,
                                            },
                                        },
                                    });
                                }
                            }
                            else {
                                contentBlocks.push({
                                    reasoningContent: {
                                        reasoningText: { text: thinking },
                                    },
                                });
                            }
                            break;
                        }
                        default:
                            continue;
                    }
                }
                // Skip if all content blocks were filtered out
                if (contentBlocks.length === 0) {
                    continue;
                }
                result.push({
                    role: dist_cjs.ConversationRole.ASSISTANT,
                    content: contentBlocks,
                });
                break;
            }
            case "toolResult": {
                // Collect all consecutive toolResult messages into a single user message
                // Bedrock requires all tool results to be in one message
                const toolResults = [];
                // Add current tool result with all content blocks combined
                toolResults.push({
                    toolResult: {
                        toolUseId: m.toolCallId,
                        content: convertToolResultContent(m.content),
                        status: m.isError ? dist_cjs.ToolResultStatus.ERROR : dist_cjs.ToolResultStatus.SUCCESS,
                    },
                });
                // Look ahead for consecutive toolResult messages
                let j = i + 1;
                while (j < transformedMessages.length && transformedMessages[j].role === "toolResult") {
                    const nextMsg = transformedMessages[j];
                    toolResults.push({
                        toolResult: {
                            toolUseId: nextMsg.toolCallId,
                            content: convertToolResultContent(nextMsg.content),
                            status: nextMsg.isError ? dist_cjs.ToolResultStatus.ERROR : dist_cjs.ToolResultStatus.SUCCESS,
                        },
                    });
                    j++;
                }
                // Skip the messages we've already processed
                i = j - 1;
                result.push({
                    role: dist_cjs.ConversationRole.USER,
                    content: toolResults,
                });
                break;
            }
            default:
                continue;
        }
    }
    // Add cache point to the last user message for supported Claude models when caching is enabled
    if (cacheRetention !== "none" && supportsPromptCaching(model, env) && result.length > 0) {
        const lastMessage = result[result.length - 1];
        if (lastMessage.role === dist_cjs.ConversationRole.USER && lastMessage.content) {
            lastMessage.content.push({
                cachePoint: {
                    type: dist_cjs.CachePointType.DEFAULT,
                    ...(cacheRetention === "long" ? { ttl: dist_cjs.CacheTTL.ONE_HOUR } : {}),
                },
            });
        }
    }
    return result;
}
function convertToolConfig(tools, toolChoice) {
    if (!tools?.length || toolChoice === "none")
        return undefined;
    const bedrockTools = tools.map((tool) => ({
        toolSpec: {
            name: tool.name,
            description: tool.description,
            inputSchema: { json: tool.parameters },
        },
    }));
    let bedrockToolChoice;
    switch (toolChoice) {
        case "auto":
            bedrockToolChoice = { auto: {} };
            break;
        case "any":
            bedrockToolChoice = { any: {} };
            break;
        default:
            if (toolChoice?.type === "tool") {
                bedrockToolChoice = { tool: { name: toolChoice.name } };
            }
    }
    return { tools: bedrockTools, toolChoice: bedrockToolChoice };
}
function mapStopReason(reason) {
    switch (reason) {
        case dist_cjs.StopReason.END_TURN:
        case dist_cjs.StopReason.STOP_SEQUENCE:
            return { stopReason: "stop" };
        case dist_cjs.StopReason.MAX_TOKENS:
        case dist_cjs.StopReason.MODEL_CONTEXT_WINDOW_EXCEEDED:
            return { stopReason: "length" };
        case dist_cjs.StopReason.TOOL_USE:
            return { stopReason: "toolUse" };
        default:
            return reason ? { stopReason: "error", errorMessage: reason } : { stopReason: "error" };
    }
}
function getConfiguredBedrockRegion(options) {
    return (options.region ||
        (0,provider_env/* getProviderEnvValue */.Y)("AWS_REGION", options.env) ||
        (0,provider_env/* getProviderEnvValue */.Y)("AWS_DEFAULT_REGION", options.env) ||
        undefined);
}
function getConfiguredBedrockCredentials(env) {
    const accessKeyId = (0,provider_env/* getProviderEnvValue */.Y)("AWS_ACCESS_KEY_ID", env);
    const secretAccessKey = (0,provider_env/* getProviderEnvValue */.Y)("AWS_SECRET_ACCESS_KEY", env);
    if (!accessKeyId || !secretAccessKey) {
        return undefined;
    }
    const sessionToken = (0,provider_env/* getProviderEnvValue */.Y)("AWS_SESSION_TOKEN", env);
    return {
        accessKeyId,
        secretAccessKey,
        ...(sessionToken ? { sessionToken } : {}),
    };
}
function getStandardBedrockEndpointRegion(baseUrl) {
    if (!baseUrl) {
        return undefined;
    }
    try {
        const { hostname } = new URL(baseUrl);
        const match = hostname.toLowerCase().match(/^bedrock-runtime(?:-fips)?\.([a-z0-9-]+)\.amazonaws\.com(?:\.cn)?$/);
        return match?.[1];
    }
    catch {
        return undefined;
    }
}
function shouldUseExplicitBedrockEndpoint(baseUrl, configuredRegion, hasAmbientConfiguredProfile) {
    const endpointRegion = getStandardBedrockEndpointRegion(baseUrl);
    if (!endpointRegion) {
        return true;
    }
    return !configuredRegion && !hasAmbientConfiguredProfile;
}
function isGovCloudBedrockTarget(model, options) {
    const region = getConfiguredBedrockRegion(options);
    if (region?.toLowerCase().startsWith("us-gov-")) {
        return true;
    }
    const modelId = model.id.toLowerCase();
    return modelId.startsWith("us-gov.") || modelId.startsWith("arn:aws-us-gov:");
}
function buildAdditionalModelRequestFields(model, options) {
    if (!options.reasoning || !model.reasoning) {
        return undefined;
    }
    if (isAnthropicClaudeModel(model)) {
        // GovCloud Bedrock currently rejects the Claude thinking.display field.
        // Omit it there until the GovCloud Converse schema catches up.
        const display = isGovCloudBedrockTarget(model, options) ? undefined : (options.thinkingDisplay ?? "summarized");
        const result = supportsAdaptiveThinking(model.id, model.name)
            ? {
                thinking: { type: "adaptive", ...(display !== undefined ? { display } : {}) },
                output_config: { effort: mapThinkingLevelToEffort(model, options.reasoning) },
            }
            : (() => {
                const defaultBudgets = {
                    minimal: 1024,
                    low: 2048,
                    medium: 8192,
                    high: 16384,
                    xhigh: 16384, // Budget-based Claude clamps extended levels to high
                    max: 16384,
                };
                // Custom budgets only cover token-based levels through high.
                const level = options.reasoning === "xhigh" || options.reasoning === "max" ? "high" : options.reasoning;
                const budget = options.thinkingBudgets?.[level] ?? defaultBudgets[options.reasoning];
                return {
                    thinking: {
                        type: "enabled",
                        budget_tokens: budget,
                        ...(display !== undefined ? { display } : {}),
                    },
                };
            })();
        if (!supportsAdaptiveThinking(model.id, model.name) && (options.interleavedThinking ?? true)) {
            result.anthropic_beta = ["interleaved-thinking-2025-05-14"];
        }
        return result;
    }
    return undefined;
}
function createImageBlock(mimeType, data) {
    let format;
    switch (mimeType) {
        case "image/jpeg":
        case "image/jpg":
            format = dist_cjs.ImageFormat.JPEG;
            break;
        case "image/png":
            format = dist_cjs.ImageFormat.PNG;
            break;
        case "image/gif":
            format = dist_cjs.ImageFormat.GIF;
            break;
        case "image/webp":
            format = dist_cjs.ImageFormat.WEBP;
            break;
        default:
            throw new Error(`Unknown image type: ${mimeType}`);
    }
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return { source: { bytes }, format };
}
//# sourceMappingURL=bedrock-converse-stream.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@earendil-works+pi-ai@0.81.1_@modelcontextprotocol+sdk@1.29.0_zod@4.4.3__ws@8.21.0_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/bedrock-provider.js

const bedrockProviderModule = {
    stream: stream,
    streamSimple: streamSimple,
};
//# sourceMappingURL=bedrock-provider.js.map

/***/ }),

/***/ 22191:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Jo: () => (/* binding */ normalizeProviderError),
/* harmony export */   lR: () => (/* binding */ formatProviderError)
/* harmony export */ });
/* unused harmony exports MAX_PROVIDER_ERROR_BODY_CHARS, truncateErrorText, safeJsonStringify */
// Shared normalization for provider HTTP error objects.
//
// Endpoints behind a proxy / gateway may return a non-2xx response whose body
// the provider SDK cannot fold into `error.message`. The SDK error object still
// carries the HTTP status and the raw/parsed body, but under SDK-specific field
// names. Provider catch blocks that read only `error.message` therefore drop
// the body and surface opaque messages like `"403 status code (no body)"` or
// collapse to `"Unknown: UnknownError"`.
//
// `normalizeProviderError` probes the known SDK field shapes (Mistral,
// `openai`, `@google/genai`, AWS Bedrock) and returns a struct each provider
// composes into its display string. The `messageCarriesBody` flag captures the
// Anthropic / `@google/genai` happy path where the SDK already folded the body
// into the message, so providers can preserve it without double-printing.
const MAX_PROVIDER_ERROR_BODY_CHARS = 4000;
function normalizeProviderError(error) {
    if (!(error instanceof Error)) {
        return { message: safeJsonStringify(error), messageCarriesBody: false };
    }
    const sdkError = error;
    const status = extractStatus(sdkError);
    const body = extractBody(sdkError);
    const messageCarriesBody = body === undefined || error.message.includes(body);
    return {
        status,
        body,
        message: error.message,
        messageCarriesBody,
    };
}
/**
 * Probe the HTTP status, first numeric hit wins, in SDK-field order:
 * `statusCode` (Mistral) → `status` (`openai`, `@google/genai`) →
 * `$metadata.httpStatusCode` (Bedrock) → `$response.statusCode` (Bedrock).
 */
function extractStatus(error) {
    if (typeof error.statusCode === "number")
        return error.statusCode;
    if (typeof error.status === "number")
        return error.status;
    if (typeof error.$metadata?.httpStatusCode === "number")
        return error.$metadata.httpStatusCode;
    if (typeof error.$response?.statusCode === "number")
        return error.$response.statusCode;
    return undefined;
}
/**
 * Probe the raw body reason, first usable hit wins, in SDK-field order:
 * `body` string (Mistral) → `error` parsed JSON body object (`openai` SDK's
 * `this.error`) → `$response.body` (Bedrock). Empty objects are treated as no
 * body so an empty parsed body does not surface as `"{}"`. The chosen body is
 * truncated to the cap.
 */
function extractBody(error) {
    const bodyText = pickBodyText(error);
    if (bodyText === undefined)
        return undefined;
    const trimmed = bodyText.trim();
    if (trimmed.length === 0)
        return undefined;
    return truncateErrorText(trimmed, MAX_PROVIDER_ERROR_BODY_CHARS);
}
function pickBodyText(error) {
    if (typeof error.body === "string")
        return error.body;
    if (isNonEmptyObject(error.error))
        return safeJsonStringify(error.error);
    const responseBody = error.$response?.body;
    if (typeof responseBody === "string")
        return responseBody;
    if (isNonEmptyObject(responseBody))
        return safeJsonStringify(responseBody);
    return undefined;
}
function isNonEmptyObject(value) {
    return typeof value === "object" && value !== null && Object.keys(value).length > 0;
}
/**
 * Compose a display string from a normalized error. When the message already
 * carries the body (Anthropic / `@google/genai` happy path) or no body/status
 * was extracted, the message is returned unchanged. Otherwise the status and
 * body are surfaced, with an optional provider prefix.
 *
 * - no prefix: `"<status>: <body>"`
 * - prefix:    `"<prefix> (<status>): <body>"`
 */
function formatProviderError(norm, prefix) {
    if (norm.messageCarriesBody || norm.status === undefined || norm.body === undefined) {
        return prefix !== undefined && norm.status !== undefined
            ? `${prefix} (${norm.status}): ${norm.message}`
            : norm.message;
    }
    return prefix !== undefined ? `${prefix} (${norm.status}): ${norm.body}` : `${norm.status}: ${norm.body}`;
}
function truncateErrorText(text, maxChars) {
    if (text.length <= maxChars)
        return text;
    return `${text.slice(0, maxChars)}... [truncated ${text.length - maxChars} chars]`;
}
function safeJsonStringify(value) {
    try {
        const serialized = JSON.stringify(value);
        return serialized === undefined ? String(value) : serialized;
    }
    catch {
        return String(value);
    }
}
//# sourceMappingURL=error-body.js.map

/***/ }),

/***/ 41146:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   j: () => (/* binding */ headersToRecord),
/* harmony export */   m: () => (/* binding */ providerHeadersToRecord)
/* harmony export */ });
function headersToRecord(headers) {
    const result = {};
    for (const [key, value] of headers.entries()) {
        result[key] = value;
    }
    return result;
}
function providerHeadersToRecord(headers) {
    if (!headers)
        return undefined;
    const result = {};
    for (const [key, value] of Object.entries(headers)) {
        if (value !== null)
            result[key] = value;
    }
    return Object.keys(result).length > 0 ? result : undefined;
}
//# sourceMappingURL=headers.js.map

/***/ }),

/***/ 42594:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Q: () => (/* binding */ resolveHttpProxyUrlForTarget)
/* harmony export */ });
/* unused harmony export UNSUPPORTED_PROXY_PROTOCOL_MESSAGE */
/* harmony import */ var _provider_env_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(94313);

const DEFAULT_PROXY_PORTS = {
    ftp: 21,
    gopher: 70,
    http: 80,
    https: 443,
    ws: 80,
    wss: 443,
};
function getProxyEnv(key, env) {
    const lowercaseKey = key.toLowerCase();
    const uppercaseKey = key.toUpperCase();
    return (env?.[lowercaseKey] ||
        env?.[uppercaseKey] ||
        (0,_provider_env_js__WEBPACK_IMPORTED_MODULE_0__/* .getProviderEnvValue */ .Y)(lowercaseKey) ||
        (0,_provider_env_js__WEBPACK_IMPORTED_MODULE_0__/* .getProviderEnvValue */ .Y)(uppercaseKey) ||
        "");
}
function parseProxyTargetUrl(targetUrl) {
    if (targetUrl instanceof URL) {
        return targetUrl;
    }
    try {
        return new URL(targetUrl);
    }
    catch {
        return undefined;
    }
}
function shouldProxyHostname(hostname, port, env) {
    const noProxy = getProxyEnv("no_proxy", env).toLowerCase();
    if (!noProxy) {
        return true;
    }
    if (noProxy === "*") {
        return false;
    }
    return noProxy.split(/[,\s]/).every((proxy) => {
        if (!proxy) {
            return true;
        }
        const parsedProxy = proxy.match(/^(.+):(\d+)$/);
        let proxyHostname = parsedProxy ? parsedProxy[1] : proxy;
        const proxyPort = parsedProxy ? Number.parseInt(parsedProxy[2], 10) : 0;
        if (proxyPort && proxyPort !== port) {
            return true;
        }
        if (!/^[.*]/.test(proxyHostname)) {
            return hostname !== proxyHostname;
        }
        if (proxyHostname.startsWith("*")) {
            proxyHostname = proxyHostname.slice(1);
        }
        return !hostname.endsWith(proxyHostname);
    });
}
function getProxyForUrl(targetUrl, env) {
    const parsedUrl = parseProxyTargetUrl(targetUrl);
    if (!parsedUrl?.protocol || !parsedUrl.host) {
        return "";
    }
    const protocol = parsedUrl.protocol.split(":", 1)[0];
    const hostname = parsedUrl.host.replace(/:\d*$/, "");
    const port = Number.parseInt(parsedUrl.port, 10) || DEFAULT_PROXY_PORTS[protocol] || 0;
    if (!shouldProxyHostname(hostname, port, env)) {
        return "";
    }
    let proxy = getProxyEnv(`${protocol}_proxy`, env) || getProxyEnv("all_proxy", env);
    if (proxy && !proxy.includes("://")) {
        proxy = `${protocol}://${proxy}`;
    }
    return proxy;
}
const UNSUPPORTED_PROXY_PROTOCOL_MESSAGE = "Unsupported proxy protocol. SOCKS and PAC proxy URLs are not supported; use an HTTP or HTTPS proxy URL.";
function resolveHttpProxyUrlForTarget(targetUrl, env) {
    const proxy = getProxyForUrl(targetUrl, env);
    if (!proxy) {
        return undefined;
    }
    let proxyUrl;
    try {
        proxyUrl = new URL(proxy);
    }
    catch (error) {
        throw new Error(`Invalid proxy URL ${JSON.stringify(proxy)}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (proxyUrl.protocol !== "http:" && proxyUrl.protocol !== "https:") {
        throw new Error(`${UNSUPPORTED_PROXY_PROTOCOL_MESSAGE} Got ${proxyUrl.protocol}`);
    }
    return proxyUrl;
}
//# sourceMappingURL=node-http-proxy.js.map

/***/ }),

/***/ 80279:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   J: () => (/* binding */ sanitizeSurrogates)
/* harmony export */ });
/**
 * Removes unpaired Unicode surrogate characters from a string.
 *
 * Unpaired surrogates (high surrogates 0xD800-0xDBFF without matching low surrogates 0xDC00-0xDFFF,
 * or vice versa) cause JSON serialization errors in many API providers.
 *
 * Valid emoji and other characters outside the Basic Multilingual Plane use properly paired
 * surrogates and will NOT be affected by this function.
 *
 * @param text - The text to sanitize
 * @returns The sanitized text with unpaired surrogates removed
 *
 * @example
 * // Valid emoji (properly paired surrogates) are preserved
 * sanitizeSurrogates("Hello 🙈 World") // => "Hello 🙈 World"
 *
 * // Unpaired high surrogate is removed
 * const unpaired = String.fromCharCode(0xD83D); // high surrogate without low
 * sanitizeSurrogates(`Text ${unpaired} here`) // => "Text  here"
 */
function sanitizeSurrogates(text) {
    // Replace unpaired high surrogates (0xD800-0xDBFF not followed by low surrogate)
    // Replace unpaired low surrogates (0xDC00-0xDFFF not preceded by high surrogate)
    return text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}
//# sourceMappingURL=sanitize-unicode.js.map

/***/ }),

/***/ 40423:
/***/ ((module) => {

module.exports = /*#__PURE__*/JSON.parse('{"name":"@aws-sdk/client-bedrock-runtime","description":"AWS SDK for JavaScript Bedrock Runtime Client for Node.js, Browser and React Native","version":"3.1048.0","scripts":{"build":"concurrently \'yarn:build:types\' \'yarn:build:es\' && yarn build:cjs","build:cjs":"node ../../scripts/compilation/inline client-bedrock-runtime","build:es":"tsc -p tsconfig.es.json","build:include:deps":"yarn g:turbo run build -F=\\"$npm_package_name\\"","build:types":"tsc -p tsconfig.types.json","build:types:downlevel":"downlevel-dts dist-types dist-types/ts3.4","clean":"premove dist-cjs dist-es dist-types tsconfig.cjs.tsbuildinfo tsconfig.es.tsbuildinfo tsconfig.types.tsbuildinfo","extract:docs":"api-extractor run --local","generate:client":"node ../../scripts/generate-clients/single-service --solo bedrock-runtime","test":"yarn g:vitest run --passWithNoTests","test:browser":"yarn g:vitest run -c vitest.config.browser.e2e.mts","test:browser:watch":"yarn g:vitest watch -c vitest.config.browser.e2e.mts","test:e2e":"yarn g:vitest run -c vitest.config.e2e.mts","test:e2e:watch":"yarn g:vitest watch -c vitest.config.e2e.mts","test:index":"tsc --noEmit ./test/index-types.ts && node ./test/index-objects.spec.mjs","test:integration":"yarn g:vitest run --passWithNoTests -c vitest.config.integ.mts","test:integration:watch":"yarn g:vitest run --passWithNoTests -c vitest.config.integ.mts","test:watch":"yarn g:vitest watch --passWithNoTests"},"main":"./dist-cjs/index.js","types":"./dist-types/index.d.ts","module":"./dist-es/index.js","sideEffects":false,"dependencies":{"@aws-crypto/sha256-browser":"5.2.0","@aws-crypto/sha256-js":"5.2.0","@aws-sdk/core":"^3.974.11","@aws-sdk/credential-provider-node":"^3.972.42","@aws-sdk/eventstream-handler-node":"^3.972.16","@aws-sdk/middleware-eventstream":"^3.972.12","@aws-sdk/middleware-websocket":"^3.972.19","@aws-sdk/token-providers":"3.1048.0","@aws-sdk/types":"^3.973.8","@smithy/core":"^3.24.2","@smithy/fetch-http-handler":"^5.4.2","@smithy/node-http-handler":"^4.7.2","@smithy/types":"^4.14.1","tslib":"^2.6.2"},"devDependencies":{"@smithy/snapshot-testing":"^2.1.2","@tsconfig/node20":"20.1.8","@types/node":"^20.14.8","concurrently":"7.0.0","downlevel-dts":"0.10.1","premove":"4.0.0","typescript":"~5.8.3","vitest":"^4.0.17"},"engines":{"node":">=20.0.0"},"typesVersions":{"<4.5":{"dist-types/*":["dist-types/ts3.4/*"]}},"files":["dist-*/**"],"author":{"name":"AWS SDK for JavaScript Team","url":"https://aws.amazon.com/javascript/"},"license":"Apache-2.0","browser":{"./dist-es/runtimeConfig":"./dist-es/runtimeConfig.browser"},"react-native":{"./dist-es/runtimeConfig":"./dist-es/runtimeConfig.native"},"homepage":"https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-bedrock-runtime","repository":{"type":"git","url":"https://github.com/aws/aws-sdk-js-v3.git","directory":"clients/client-bedrock-runtime"}}');

/***/ })

};
