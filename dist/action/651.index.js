export const id = 651;
export const ids = [651];
export const modules = {

/***/ 63250:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createFileSystemAdapter = exports.FILE_SYSTEM_ADAPTER = void 0;
const fs = __webpack_require__(79896);
exports.FILE_SYSTEM_ADAPTER = {
    lstat: fs.lstat,
    stat: fs.stat,
    lstatSync: fs.lstatSync,
    statSync: fs.statSync,
    readdir: fs.readdir,
    readdirSync: fs.readdirSync
};
function createFileSystemAdapter(fsMethods) {
    if (fsMethods === undefined) {
        return exports.FILE_SYSTEM_ADAPTER;
    }
    return Object.assign(Object.assign({}, exports.FILE_SYSTEM_ADAPTER), fsMethods);
}
exports.createFileSystemAdapter = createFileSystemAdapter;


/***/ }),

/***/ 64541:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IS_SUPPORT_READDIR_WITH_FILE_TYPES = void 0;
const NODE_PROCESS_VERSION_PARTS = process.versions.node.split('.');
if (NODE_PROCESS_VERSION_PARTS[0] === undefined || NODE_PROCESS_VERSION_PARTS[1] === undefined) {
    throw new Error(`Unexpected behavior. The 'process.versions.node' variable has invalid value: ${process.versions.node}`);
}
const MAJOR_VERSION = Number.parseInt(NODE_PROCESS_VERSION_PARTS[0], 10);
const MINOR_VERSION = Number.parseInt(NODE_PROCESS_VERSION_PARTS[1], 10);
const SUPPORTED_MAJOR_VERSION = 10;
const SUPPORTED_MINOR_VERSION = 10;
const IS_MATCHED_BY_MAJOR = MAJOR_VERSION > SUPPORTED_MAJOR_VERSION;
const IS_MATCHED_BY_MAJOR_AND_MINOR = MAJOR_VERSION === SUPPORTED_MAJOR_VERSION && MINOR_VERSION >= SUPPORTED_MINOR_VERSION;
/**
 * IS `true` for Node.js 10.10 and greater.
 */
exports.IS_SUPPORT_READDIR_WITH_FILE_TYPES = IS_MATCHED_BY_MAJOR || IS_MATCHED_BY_MAJOR_AND_MINOR;


/***/ }),

/***/ 9096:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Settings = exports.scandirSync = exports.scandir = void 0;
const async = __webpack_require__(69389);
const sync = __webpack_require__(72574);
const settings_1 = __webpack_require__(62695);
exports.Settings = settings_1.default;
function scandir(path, optionsOrSettingsOrCallback, callback) {
    if (typeof optionsOrSettingsOrCallback === 'function') {
        async.read(path, getSettings(), optionsOrSettingsOrCallback);
        return;
    }
    async.read(path, getSettings(optionsOrSettingsOrCallback), callback);
}
exports.scandir = scandir;
function scandirSync(path, optionsOrSettings) {
    const settings = getSettings(optionsOrSettings);
    return sync.read(path, settings);
}
exports.scandirSync = scandirSync;
function getSettings(settingsOrOptions = {}) {
    if (settingsOrOptions instanceof settings_1.default) {
        return settingsOrOptions;
    }
    return new settings_1.default(settingsOrOptions);
}


/***/ }),

/***/ 69389:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.readdir = exports.readdirWithFileTypes = exports.read = void 0;
const fsStat = __webpack_require__(61113);
const rpl = __webpack_require__(67710);
const constants_1 = __webpack_require__(64541);
const utils = __webpack_require__(85418);
const common = __webpack_require__(77404);
function read(directory, settings, callback) {
    if (!settings.stats && constants_1.IS_SUPPORT_READDIR_WITH_FILE_TYPES) {
        readdirWithFileTypes(directory, settings, callback);
        return;
    }
    readdir(directory, settings, callback);
}
exports.read = read;
function readdirWithFileTypes(directory, settings, callback) {
    settings.fs.readdir(directory, { withFileTypes: true }, (readdirError, dirents) => {
        if (readdirError !== null) {
            callFailureCallback(callback, readdirError);
            return;
        }
        const entries = dirents.map((dirent) => ({
            dirent,
            name: dirent.name,
            path: common.joinPathSegments(directory, dirent.name, settings.pathSegmentSeparator)
        }));
        if (!settings.followSymbolicLinks) {
            callSuccessCallback(callback, entries);
            return;
        }
        const tasks = entries.map((entry) => makeRplTaskEntry(entry, settings));
        rpl(tasks, (rplError, rplEntries) => {
            if (rplError !== null) {
                callFailureCallback(callback, rplError);
                return;
            }
            callSuccessCallback(callback, rplEntries);
        });
    });
}
exports.readdirWithFileTypes = readdirWithFileTypes;
function makeRplTaskEntry(entry, settings) {
    return (done) => {
        if (!entry.dirent.isSymbolicLink()) {
            done(null, entry);
            return;
        }
        settings.fs.stat(entry.path, (statError, stats) => {
            if (statError !== null) {
                if (settings.throwErrorOnBrokenSymbolicLink) {
                    done(statError);
                    return;
                }
                done(null, entry);
                return;
            }
            entry.dirent = utils.fs.createDirentFromStats(entry.name, stats);
            done(null, entry);
        });
    };
}
function readdir(directory, settings, callback) {
    settings.fs.readdir(directory, (readdirError, names) => {
        if (readdirError !== null) {
            callFailureCallback(callback, readdirError);
            return;
        }
        const tasks = names.map((name) => {
            const path = common.joinPathSegments(directory, name, settings.pathSegmentSeparator);
            return (done) => {
                fsStat.stat(path, settings.fsStatSettings, (error, stats) => {
                    if (error !== null) {
                        done(error);
                        return;
                    }
                    const entry = {
                        name,
                        path,
                        dirent: utils.fs.createDirentFromStats(name, stats)
                    };
                    if (settings.stats) {
                        entry.stats = stats;
                    }
                    done(null, entry);
                });
            };
        });
        rpl(tasks, (rplError, entries) => {
            if (rplError !== null) {
                callFailureCallback(callback, rplError);
                return;
            }
            callSuccessCallback(callback, entries);
        });
    });
}
exports.readdir = readdir;
function callFailureCallback(callback, error) {
    callback(error);
}
function callSuccessCallback(callback, result) {
    callback(null, result);
}


/***/ }),

/***/ 77404:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.joinPathSegments = void 0;
function joinPathSegments(a, b, separator) {
    /**
     * The correct handling of cases when the first segment is a root (`/`, `C:/`) or UNC path (`//?/C:/`).
     */
    if (a.endsWith(separator)) {
        return a + b;
    }
    return a + separator + b;
}
exports.joinPathSegments = joinPathSegments;


/***/ }),

/***/ 72574:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.readdir = exports.readdirWithFileTypes = exports.read = void 0;
const fsStat = __webpack_require__(61113);
const constants_1 = __webpack_require__(64541);
const utils = __webpack_require__(85418);
const common = __webpack_require__(77404);
function read(directory, settings) {
    if (!settings.stats && constants_1.IS_SUPPORT_READDIR_WITH_FILE_TYPES) {
        return readdirWithFileTypes(directory, settings);
    }
    return readdir(directory, settings);
}
exports.read = read;
function readdirWithFileTypes(directory, settings) {
    const dirents = settings.fs.readdirSync(directory, { withFileTypes: true });
    return dirents.map((dirent) => {
        const entry = {
            dirent,
            name: dirent.name,
            path: common.joinPathSegments(directory, dirent.name, settings.pathSegmentSeparator)
        };
        if (entry.dirent.isSymbolicLink() && settings.followSymbolicLinks) {
            try {
                const stats = settings.fs.statSync(entry.path);
                entry.dirent = utils.fs.createDirentFromStats(entry.name, stats);
            }
            catch (error) {
                if (settings.throwErrorOnBrokenSymbolicLink) {
                    throw error;
                }
            }
        }
        return entry;
    });
}
exports.readdirWithFileTypes = readdirWithFileTypes;
function readdir(directory, settings) {
    const names = settings.fs.readdirSync(directory);
    return names.map((name) => {
        const entryPath = common.joinPathSegments(directory, name, settings.pathSegmentSeparator);
        const stats = fsStat.statSync(entryPath, settings.fsStatSettings);
        const entry = {
            name,
            path: entryPath,
            dirent: utils.fs.createDirentFromStats(name, stats)
        };
        if (settings.stats) {
            entry.stats = stats;
        }
        return entry;
    });
}
exports.readdir = readdir;


/***/ }),

/***/ 62695:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const path = __webpack_require__(16928);
const fsStat = __webpack_require__(61113);
const fs = __webpack_require__(63250);
class Settings {
    constructor(_options = {}) {
        this._options = _options;
        this.followSymbolicLinks = this._getValue(this._options.followSymbolicLinks, false);
        this.fs = fs.createFileSystemAdapter(this._options.fs);
        this.pathSegmentSeparator = this._getValue(this._options.pathSegmentSeparator, path.sep);
        this.stats = this._getValue(this._options.stats, false);
        this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, true);
        this.fsStatSettings = new fsStat.Settings({
            followSymbolicLink: this.followSymbolicLinks,
            fs: this.fs,
            throwErrorOnBrokenSymbolicLink: this.throwErrorOnBrokenSymbolicLink
        });
    }
    _getValue(option, value) {
        return option !== null && option !== void 0 ? option : value;
    }
}
exports["default"] = Settings;


/***/ }),

/***/ 79531:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createDirentFromStats = void 0;
class DirentFromStats {
    constructor(name, stats) {
        this.name = name;
        this.isBlockDevice = stats.isBlockDevice.bind(stats);
        this.isCharacterDevice = stats.isCharacterDevice.bind(stats);
        this.isDirectory = stats.isDirectory.bind(stats);
        this.isFIFO = stats.isFIFO.bind(stats);
        this.isFile = stats.isFile.bind(stats);
        this.isSocket = stats.isSocket.bind(stats);
        this.isSymbolicLink = stats.isSymbolicLink.bind(stats);
    }
}
function createDirentFromStats(name, stats) {
    return new DirentFromStats(name, stats);
}
exports.createDirentFromStats = createDirentFromStats;


/***/ }),

/***/ 85418:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.fs = void 0;
const fs = __webpack_require__(79531);
exports.fs = fs;


/***/ }),

/***/ 84491:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createFileSystemAdapter = exports.FILE_SYSTEM_ADAPTER = void 0;
const fs = __webpack_require__(79896);
exports.FILE_SYSTEM_ADAPTER = {
    lstat: fs.lstat,
    stat: fs.stat,
    lstatSync: fs.lstatSync,
    statSync: fs.statSync
};
function createFileSystemAdapter(fsMethods) {
    if (fsMethods === undefined) {
        return exports.FILE_SYSTEM_ADAPTER;
    }
    return Object.assign(Object.assign({}, exports.FILE_SYSTEM_ADAPTER), fsMethods);
}
exports.createFileSystemAdapter = createFileSystemAdapter;


/***/ }),

/***/ 61113:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.statSync = exports.stat = exports.Settings = void 0;
const async = __webpack_require__(10224);
const sync = __webpack_require__(46385);
const settings_1 = __webpack_require__(60052);
exports.Settings = settings_1.default;
function stat(path, optionsOrSettingsOrCallback, callback) {
    if (typeof optionsOrSettingsOrCallback === 'function') {
        async.read(path, getSettings(), optionsOrSettingsOrCallback);
        return;
    }
    async.read(path, getSettings(optionsOrSettingsOrCallback), callback);
}
exports.stat = stat;
function statSync(path, optionsOrSettings) {
    const settings = getSettings(optionsOrSettings);
    return sync.read(path, settings);
}
exports.statSync = statSync;
function getSettings(settingsOrOptions = {}) {
    if (settingsOrOptions instanceof settings_1.default) {
        return settingsOrOptions;
    }
    return new settings_1.default(settingsOrOptions);
}


/***/ }),

/***/ 10224:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.read = void 0;
function read(path, settings, callback) {
    settings.fs.lstat(path, (lstatError, lstat) => {
        if (lstatError !== null) {
            callFailureCallback(callback, lstatError);
            return;
        }
        if (!lstat.isSymbolicLink() || !settings.followSymbolicLink) {
            callSuccessCallback(callback, lstat);
            return;
        }
        settings.fs.stat(path, (statError, stat) => {
            if (statError !== null) {
                if (settings.throwErrorOnBrokenSymbolicLink) {
                    callFailureCallback(callback, statError);
                    return;
                }
                callSuccessCallback(callback, lstat);
                return;
            }
            if (settings.markSymbolicLink) {
                stat.isSymbolicLink = () => true;
            }
            callSuccessCallback(callback, stat);
        });
    });
}
exports.read = read;
function callFailureCallback(callback, error) {
    callback(error);
}
function callSuccessCallback(callback, result) {
    callback(null, result);
}


/***/ }),

/***/ 46385:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.read = void 0;
function read(path, settings) {
    const lstat = settings.fs.lstatSync(path);
    if (!lstat.isSymbolicLink() || !settings.followSymbolicLink) {
        return lstat;
    }
    try {
        const stat = settings.fs.statSync(path);
        if (settings.markSymbolicLink) {
            stat.isSymbolicLink = () => true;
        }
        return stat;
    }
    catch (error) {
        if (!settings.throwErrorOnBrokenSymbolicLink) {
            return lstat;
        }
        throw error;
    }
}
exports.read = read;


/***/ }),

/***/ 60052:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const fs = __webpack_require__(84491);
class Settings {
    constructor(_options = {}) {
        this._options = _options;
        this.followSymbolicLink = this._getValue(this._options.followSymbolicLink, true);
        this.fs = fs.createFileSystemAdapter(this._options.fs);
        this.markSymbolicLink = this._getValue(this._options.markSymbolicLink, false);
        this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, true);
    }
    _getValue(option, value) {
        return option !== null && option !== void 0 ? option : value;
    }
}
exports["default"] = Settings;


/***/ }),

/***/ 77669:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Settings = exports.walkStream = exports.walkSync = exports.walk = void 0;
const async_1 = __webpack_require__(20228);
const stream_1 = __webpack_require__(41254);
const sync_1 = __webpack_require__(67885);
const settings_1 = __webpack_require__(40328);
exports.Settings = settings_1.default;
function walk(directory, optionsOrSettingsOrCallback, callback) {
    if (typeof optionsOrSettingsOrCallback === 'function') {
        new async_1.default(directory, getSettings()).read(optionsOrSettingsOrCallback);
        return;
    }
    new async_1.default(directory, getSettings(optionsOrSettingsOrCallback)).read(callback);
}
exports.walk = walk;
function walkSync(directory, optionsOrSettings) {
    const settings = getSettings(optionsOrSettings);
    const provider = new sync_1.default(directory, settings);
    return provider.read();
}
exports.walkSync = walkSync;
function walkStream(directory, optionsOrSettings) {
    const settings = getSettings(optionsOrSettings);
    const provider = new stream_1.default(directory, settings);
    return provider.read();
}
exports.walkStream = walkStream;
function getSettings(settingsOrOptions = {}) {
    if (settingsOrOptions instanceof settings_1.default) {
        return settingsOrOptions;
    }
    return new settings_1.default(settingsOrOptions);
}


/***/ }),

/***/ 20228:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const async_1 = __webpack_require__(60750);
class AsyncProvider {
    constructor(_root, _settings) {
        this._root = _root;
        this._settings = _settings;
        this._reader = new async_1.default(this._root, this._settings);
        this._storage = [];
    }
    read(callback) {
        this._reader.onError((error) => {
            callFailureCallback(callback, error);
        });
        this._reader.onEntry((entry) => {
            this._storage.push(entry);
        });
        this._reader.onEnd(() => {
            callSuccessCallback(callback, this._storage);
        });
        this._reader.read();
    }
}
exports["default"] = AsyncProvider;
function callFailureCallback(callback, error) {
    callback(error);
}
function callSuccessCallback(callback, entries) {
    callback(null, entries);
}


/***/ }),

/***/ 41254:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const stream_1 = __webpack_require__(2203);
const async_1 = __webpack_require__(60750);
class StreamProvider {
    constructor(_root, _settings) {
        this._root = _root;
        this._settings = _settings;
        this._reader = new async_1.default(this._root, this._settings);
        this._stream = new stream_1.Readable({
            objectMode: true,
            read: () => { },
            destroy: () => {
                if (!this._reader.isDestroyed) {
                    this._reader.destroy();
                }
            }
        });
    }
    read() {
        this._reader.onError((error) => {
            this._stream.emit('error', error);
        });
        this._reader.onEntry((entry) => {
            this._stream.push(entry);
        });
        this._reader.onEnd(() => {
            this._stream.push(null);
        });
        this._reader.read();
        return this._stream;
    }
}
exports["default"] = StreamProvider;


/***/ }),

/***/ 67885:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const sync_1 = __webpack_require__(75835);
class SyncProvider {
    constructor(_root, _settings) {
        this._root = _root;
        this._settings = _settings;
        this._reader = new sync_1.default(this._root, this._settings);
    }
    read() {
        return this._reader.read();
    }
}
exports["default"] = SyncProvider;


/***/ }),

/***/ 60750:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const events_1 = __webpack_require__(24434);
const fsScandir = __webpack_require__(9096);
const fastq = __webpack_require__(65033);
const common = __webpack_require__(43285);
const reader_1 = __webpack_require__(3747);
class AsyncReader extends reader_1.default {
    constructor(_root, _settings) {
        super(_root, _settings);
        this._settings = _settings;
        this._scandir = fsScandir.scandir;
        this._emitter = new events_1.EventEmitter();
        this._queue = fastq(this._worker.bind(this), this._settings.concurrency);
        this._isFatalError = false;
        this._isDestroyed = false;
        this._queue.drain = () => {
            if (!this._isFatalError) {
                this._emitter.emit('end');
            }
        };
    }
    read() {
        this._isFatalError = false;
        this._isDestroyed = false;
        setImmediate(() => {
            this._pushToQueue(this._root, this._settings.basePath);
        });
        return this._emitter;
    }
    get isDestroyed() {
        return this._isDestroyed;
    }
    destroy() {
        if (this._isDestroyed) {
            throw new Error('The reader is already destroyed');
        }
        this._isDestroyed = true;
        this._queue.killAndDrain();
    }
    onEntry(callback) {
        this._emitter.on('entry', callback);
    }
    onError(callback) {
        this._emitter.once('error', callback);
    }
    onEnd(callback) {
        this._emitter.once('end', callback);
    }
    _pushToQueue(directory, base) {
        const queueItem = { directory, base };
        this._queue.push(queueItem, (error) => {
            if (error !== null) {
                this._handleError(error);
            }
        });
    }
    _worker(item, done) {
        this._scandir(item.directory, this._settings.fsScandirSettings, (error, entries) => {
            if (error !== null) {
                done(error, undefined);
                return;
            }
            for (const entry of entries) {
                this._handleEntry(entry, item.base);
            }
            done(null, undefined);
        });
    }
    _handleError(error) {
        if (this._isDestroyed || !common.isFatalError(this._settings, error)) {
            return;
        }
        this._isFatalError = true;
        this._isDestroyed = true;
        this._emitter.emit('error', error);
    }
    _handleEntry(entry, base) {
        if (this._isDestroyed || this._isFatalError) {
            return;
        }
        const fullpath = entry.path;
        if (base !== undefined) {
            entry.path = common.joinPathSegments(base, entry.name, this._settings.pathSegmentSeparator);
        }
        if (common.isAppliedFilter(this._settings.entryFilter, entry)) {
            this._emitEntry(entry);
        }
        if (entry.dirent.isDirectory() && common.isAppliedFilter(this._settings.deepFilter, entry)) {
            this._pushToQueue(fullpath, base === undefined ? undefined : entry.path);
        }
    }
    _emitEntry(entry) {
        this._emitter.emit('entry', entry);
    }
}
exports["default"] = AsyncReader;


/***/ }),

/***/ 43285:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.joinPathSegments = exports.replacePathSegmentSeparator = exports.isAppliedFilter = exports.isFatalError = void 0;
function isFatalError(settings, error) {
    if (settings.errorFilter === null) {
        return true;
    }
    return !settings.errorFilter(error);
}
exports.isFatalError = isFatalError;
function isAppliedFilter(filter, value) {
    return filter === null || filter(value);
}
exports.isAppliedFilter = isAppliedFilter;
function replacePathSegmentSeparator(filepath, separator) {
    return filepath.split(/[/\\]/).join(separator);
}
exports.replacePathSegmentSeparator = replacePathSegmentSeparator;
function joinPathSegments(a, b, separator) {
    if (a === '') {
        return b;
    }
    /**
     * The correct handling of cases when the first segment is a root (`/`, `C:/`) or UNC path (`//?/C:/`).
     */
    if (a.endsWith(separator)) {
        return a + b;
    }
    return a + separator + b;
}
exports.joinPathSegments = joinPathSegments;


/***/ }),

/***/ 3747:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const common = __webpack_require__(43285);
class Reader {
    constructor(_root, _settings) {
        this._root = _root;
        this._settings = _settings;
        this._root = common.replacePathSegmentSeparator(_root, _settings.pathSegmentSeparator);
    }
}
exports["default"] = Reader;


/***/ }),

/***/ 75835:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const fsScandir = __webpack_require__(9096);
const common = __webpack_require__(43285);
const reader_1 = __webpack_require__(3747);
class SyncReader extends reader_1.default {
    constructor() {
        super(...arguments);
        this._scandir = fsScandir.scandirSync;
        this._storage = [];
        this._queue = new Set();
    }
    read() {
        this._pushToQueue(this._root, this._settings.basePath);
        this._handleQueue();
        return this._storage;
    }
    _pushToQueue(directory, base) {
        this._queue.add({ directory, base });
    }
    _handleQueue() {
        for (const item of this._queue.values()) {
            this._handleDirectory(item.directory, item.base);
        }
    }
    _handleDirectory(directory, base) {
        try {
            const entries = this._scandir(directory, this._settings.fsScandirSettings);
            for (const entry of entries) {
                this._handleEntry(entry, base);
            }
        }
        catch (error) {
            this._handleError(error);
        }
    }
    _handleError(error) {
        if (!common.isFatalError(this._settings, error)) {
            return;
        }
        throw error;
    }
    _handleEntry(entry, base) {
        const fullpath = entry.path;
        if (base !== undefined) {
            entry.path = common.joinPathSegments(base, entry.name, this._settings.pathSegmentSeparator);
        }
        if (common.isAppliedFilter(this._settings.entryFilter, entry)) {
            this._pushToStorage(entry);
        }
        if (entry.dirent.isDirectory() && common.isAppliedFilter(this._settings.deepFilter, entry)) {
            this._pushToQueue(fullpath, base === undefined ? undefined : entry.path);
        }
    }
    _pushToStorage(entry) {
        this._storage.push(entry);
    }
}
exports["default"] = SyncReader;


/***/ }),

/***/ 40328:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const path = __webpack_require__(16928);
const fsScandir = __webpack_require__(9096);
class Settings {
    constructor(_options = {}) {
        this._options = _options;
        this.basePath = this._getValue(this._options.basePath, undefined);
        this.concurrency = this._getValue(this._options.concurrency, Number.POSITIVE_INFINITY);
        this.deepFilter = this._getValue(this._options.deepFilter, null);
        this.entryFilter = this._getValue(this._options.entryFilter, null);
        this.errorFilter = this._getValue(this._options.errorFilter, null);
        this.pathSegmentSeparator = this._getValue(this._options.pathSegmentSeparator, path.sep);
        this.fsScandirSettings = new fsScandir.Settings({
            followSymbolicLinks: this._options.followSymbolicLinks,
            fs: this._options.fs,
            pathSegmentSeparator: this._options.pathSegmentSeparator,
            stats: this._options.stats,
            throwErrorOnBrokenSymbolicLink: this._options.throwErrorOnBrokenSymbolicLink
        });
    }
    _getValue(option, value) {
        return option !== null && option !== void 0 ? option : value;
    }
}
exports["default"] = Settings;


/***/ }),

/***/ 37227:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const stringify = __webpack_require__(8602);
const compile = __webpack_require__(62358);
const expand = __webpack_require__(35671);
const parse = __webpack_require__(34180);

/**
 * Expand the given pattern or create a regex-compatible string.
 *
 * ```js
 * const braces = require('braces');
 * console.log(braces('{a,b,c}', { compile: true })); //=> ['(a|b|c)']
 * console.log(braces('{a,b,c}')); //=> ['a', 'b', 'c']
 * ```
 * @param {String} `str`
 * @param {Object} `options`
 * @return {String}
 * @api public
 */

const braces = (input, options = {}) => {
  let output = [];

  if (Array.isArray(input)) {
    for (const pattern of input) {
      const result = braces.create(pattern, options);
      if (Array.isArray(result)) {
        output.push(...result);
      } else {
        output.push(result);
      }
    }
  } else {
    output = [].concat(braces.create(input, options));
  }

  if (options && options.expand === true && options.nodupes === true) {
    output = [...new Set(output)];
  }
  return output;
};

/**
 * Parse the given `str` with the given `options`.
 *
 * ```js
 * // braces.parse(pattern, [, options]);
 * const ast = braces.parse('a/{b,c}/d');
 * console.log(ast);
 * ```
 * @param {String} pattern Brace pattern to parse
 * @param {Object} options
 * @return {Object} Returns an AST
 * @api public
 */

braces.parse = (input, options = {}) => parse(input, options);

/**
 * Creates a braces string from an AST, or an AST node.
 *
 * ```js
 * const braces = require('braces');
 * let ast = braces.parse('foo/{a,b}/bar');
 * console.log(stringify(ast.nodes[2])); //=> '{a,b}'
 * ```
 * @param {String} `input` Brace pattern or AST.
 * @param {Object} `options`
 * @return {Array} Returns an array of expanded values.
 * @api public
 */

braces.stringify = (input, options = {}) => {
  if (typeof input === 'string') {
    return stringify(braces.parse(input, options), options);
  }
  return stringify(input, options);
};

/**
 * Compiles a brace pattern into a regex-compatible, optimized string.
 * This method is called by the main [braces](#braces) function by default.
 *
 * ```js
 * const braces = require('braces');
 * console.log(braces.compile('a/{b,c}/d'));
 * //=> ['a/(b|c)/d']
 * ```
 * @param {String} `input` Brace pattern or AST.
 * @param {Object} `options`
 * @return {Array} Returns an array of expanded values.
 * @api public
 */

braces.compile = (input, options = {}) => {
  if (typeof input === 'string') {
    input = braces.parse(input, options);
  }
  return compile(input, options);
};

/**
 * Expands a brace pattern into an array. This method is called by the
 * main [braces](#braces) function when `options.expand` is true. Before
 * using this method it's recommended that you read the [performance notes](#performance))
 * and advantages of using [.compile](#compile) instead.
 *
 * ```js
 * const braces = require('braces');
 * console.log(braces.expand('a/{b,c}/d'));
 * //=> ['a/b/d', 'a/c/d'];
 * ```
 * @param {String} `pattern` Brace pattern
 * @param {Object} `options`
 * @return {Array} Returns an array of expanded values.
 * @api public
 */

braces.expand = (input, options = {}) => {
  if (typeof input === 'string') {
    input = braces.parse(input, options);
  }

  let result = expand(input, options);

  // filter out empty strings if specified
  if (options.noempty === true) {
    result = result.filter(Boolean);
  }

  // filter out duplicates if specified
  if (options.nodupes === true) {
    result = [...new Set(result)];
  }

  return result;
};

/**
 * Processes a brace pattern and returns either an expanded array
 * (if `options.expand` is true), a highly optimized regex-compatible string.
 * This method is called by the main [braces](#braces) function.
 *
 * ```js
 * const braces = require('braces');
 * console.log(braces.create('user-{200..300}/project-{a,b,c}-{1..10}'))
 * //=> 'user-(20[0-9]|2[1-9][0-9]|300)/project-(a|b|c)-([1-9]|10)'
 * ```
 * @param {String} `pattern` Brace pattern
 * @param {Object} `options`
 * @return {Array} Returns an array of expanded values.
 * @api public
 */

braces.create = (input, options = {}) => {
  if (input === '' || input.length < 3) {
    return [input];
  }

  return options.expand !== true
    ? braces.compile(input, options)
    : braces.expand(input, options);
};

/**
 * Expose "braces"
 */

module.exports = braces;


/***/ }),

/***/ 62358:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const fill = __webpack_require__(56198);
const utils = __webpack_require__(67494);

const compile = (ast, options = {}) => {
  const walk = (node, parent = {}) => {
    const invalidBlock = utils.isInvalidBrace(parent);
    const invalidNode = node.invalid === true && options.escapeInvalid === true;
    const invalid = invalidBlock === true || invalidNode === true;
    const prefix = options.escapeInvalid === true ? '\\' : '';
    let output = '';

    if (node.isOpen === true) {
      return prefix + node.value;
    }

    if (node.isClose === true) {
      console.log('node.isClose', prefix, node.value);
      return prefix + node.value;
    }

    if (node.type === 'open') {
      return invalid ? prefix + node.value : '(';
    }

    if (node.type === 'close') {
      return invalid ? prefix + node.value : ')';
    }

    if (node.type === 'comma') {
      return node.prev.type === 'comma' ? '' : invalid ? node.value : '|';
    }

    if (node.value) {
      return node.value;
    }

    if (node.nodes && node.ranges > 0) {
      const args = utils.reduce(node.nodes);
      const range = fill(...args, { ...options, wrap: false, toRegex: true, strictZeros: true });

      if (range.length !== 0) {
        return args.length > 1 && range.length > 1 ? `(${range})` : range;
      }
    }

    if (node.nodes) {
      for (const child of node.nodes) {
        output += walk(child, node);
      }
    }

    return output;
  };

  return walk(ast);
};

module.exports = compile;


/***/ }),

/***/ 71230:
/***/ ((module) => {



module.exports = {
  MAX_LENGTH: 10000,

  // Digits
  CHAR_0: '0', /* 0 */
  CHAR_9: '9', /* 9 */

  // Alphabet chars.
  CHAR_UPPERCASE_A: 'A', /* A */
  CHAR_LOWERCASE_A: 'a', /* a */
  CHAR_UPPERCASE_Z: 'Z', /* Z */
  CHAR_LOWERCASE_Z: 'z', /* z */

  CHAR_LEFT_PARENTHESES: '(', /* ( */
  CHAR_RIGHT_PARENTHESES: ')', /* ) */

  CHAR_ASTERISK: '*', /* * */

  // Non-alphabetic chars.
  CHAR_AMPERSAND: '&', /* & */
  CHAR_AT: '@', /* @ */
  CHAR_BACKSLASH: '\\', /* \ */
  CHAR_BACKTICK: '`', /* ` */
  CHAR_CARRIAGE_RETURN: '\r', /* \r */
  CHAR_CIRCUMFLEX_ACCENT: '^', /* ^ */
  CHAR_COLON: ':', /* : */
  CHAR_COMMA: ',', /* , */
  CHAR_DOLLAR: '$', /* . */
  CHAR_DOT: '.', /* . */
  CHAR_DOUBLE_QUOTE: '"', /* " */
  CHAR_EQUAL: '=', /* = */
  CHAR_EXCLAMATION_MARK: '!', /* ! */
  CHAR_FORM_FEED: '\f', /* \f */
  CHAR_FORWARD_SLASH: '/', /* / */
  CHAR_HASH: '#', /* # */
  CHAR_HYPHEN_MINUS: '-', /* - */
  CHAR_LEFT_ANGLE_BRACKET: '<', /* < */
  CHAR_LEFT_CURLY_BRACE: '{', /* { */
  CHAR_LEFT_SQUARE_BRACKET: '[', /* [ */
  CHAR_LINE_FEED: '\n', /* \n */
  CHAR_NO_BREAK_SPACE: '\u00A0', /* \u00A0 */
  CHAR_PERCENT: '%', /* % */
  CHAR_PLUS: '+', /* + */
  CHAR_QUESTION_MARK: '?', /* ? */
  CHAR_RIGHT_ANGLE_BRACKET: '>', /* > */
  CHAR_RIGHT_CURLY_BRACE: '}', /* } */
  CHAR_RIGHT_SQUARE_BRACKET: ']', /* ] */
  CHAR_SEMICOLON: ';', /* ; */
  CHAR_SINGLE_QUOTE: '\'', /* ' */
  CHAR_SPACE: ' ', /*   */
  CHAR_TAB: '\t', /* \t */
  CHAR_UNDERSCORE: '_', /* _ */
  CHAR_VERTICAL_LINE: '|', /* | */
  CHAR_ZERO_WIDTH_NOBREAK_SPACE: '\uFEFF' /* \uFEFF */
};


/***/ }),

/***/ 35671:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const fill = __webpack_require__(56198);
const stringify = __webpack_require__(8602);
const utils = __webpack_require__(67494);

const append = (queue = '', stash = '', enclose = false) => {
  const result = [];

  queue = [].concat(queue);
  stash = [].concat(stash);

  if (!stash.length) return queue;
  if (!queue.length) {
    return enclose ? utils.flatten(stash).map(ele => `{${ele}}`) : stash;
  }

  for (const item of queue) {
    if (Array.isArray(item)) {
      for (const value of item) {
        result.push(append(value, stash, enclose));
      }
    } else {
      for (let ele of stash) {
        if (enclose === true && typeof ele === 'string') ele = `{${ele}}`;
        result.push(Array.isArray(ele) ? append(item, ele, enclose) : item + ele);
      }
    }
  }
  return utils.flatten(result);
};

const expand = (ast, options = {}) => {
  const rangeLimit = options.rangeLimit === undefined ? 1000 : options.rangeLimit;

  const walk = (node, parent = {}) => {
    node.queue = [];

    let p = parent;
    let q = parent.queue;

    while (p.type !== 'brace' && p.type !== 'root' && p.parent) {
      p = p.parent;
      q = p.queue;
    }

    if (node.invalid || node.dollar) {
      q.push(append(q.pop(), stringify(node, options)));
      return;
    }

    if (node.type === 'brace' && node.invalid !== true && node.nodes.length === 2) {
      q.push(append(q.pop(), ['{}']));
      return;
    }

    if (node.nodes && node.ranges > 0) {
      const args = utils.reduce(node.nodes);

      if (utils.exceedsLimit(...args, options.step, rangeLimit)) {
        throw new RangeError('expanded array length exceeds range limit. Use options.rangeLimit to increase or disable the limit.');
      }

      let range = fill(...args, options);
      if (range.length === 0) {
        range = stringify(node, options);
      }

      q.push(append(q.pop(), range));
      node.nodes = [];
      return;
    }

    const enclose = utils.encloseBrace(node);
    let queue = node.queue;
    let block = node;

    while (block.type !== 'brace' && block.type !== 'root' && block.parent) {
      block = block.parent;
      queue = block.queue;
    }

    for (let i = 0; i < node.nodes.length; i++) {
      const child = node.nodes[i];

      if (child.type === 'comma' && node.type === 'brace') {
        if (i === 1) queue.push('');
        queue.push('');
        continue;
      }

      if (child.type === 'close') {
        q.push(append(q.pop(), queue, enclose));
        continue;
      }

      if (child.value && child.type !== 'open') {
        queue.push(append(queue.pop(), child.value));
        continue;
      }

      if (child.nodes) {
        walk(child, node);
      }
    }

    return queue;
  };

  return utils.flatten(walk(ast));
};

module.exports = expand;


/***/ }),

/***/ 34180:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const stringify = __webpack_require__(8602);

/**
 * Constants
 */

const {
  MAX_LENGTH,
  CHAR_BACKSLASH, /* \ */
  CHAR_BACKTICK, /* ` */
  CHAR_COMMA, /* , */
  CHAR_DOT, /* . */
  CHAR_LEFT_PARENTHESES, /* ( */
  CHAR_RIGHT_PARENTHESES, /* ) */
  CHAR_LEFT_CURLY_BRACE, /* { */
  CHAR_RIGHT_CURLY_BRACE, /* } */
  CHAR_LEFT_SQUARE_BRACKET, /* [ */
  CHAR_RIGHT_SQUARE_BRACKET, /* ] */
  CHAR_DOUBLE_QUOTE, /* " */
  CHAR_SINGLE_QUOTE, /* ' */
  CHAR_NO_BREAK_SPACE,
  CHAR_ZERO_WIDTH_NOBREAK_SPACE
} = __webpack_require__(71230);

/**
 * parse
 */

const parse = (input, options = {}) => {
  if (typeof input !== 'string') {
    throw new TypeError('Expected a string');
  }

  const opts = options || {};
  const max = typeof opts.maxLength === 'number' ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
  if (input.length > max) {
    throw new SyntaxError(`Input length (${input.length}), exceeds max characters (${max})`);
  }

  const ast = { type: 'root', input, nodes: [] };
  const stack = [ast];
  let block = ast;
  let prev = ast;
  let brackets = 0;
  const length = input.length;
  let index = 0;
  let depth = 0;
  let value;

  /**
   * Helpers
   */

  const advance = () => input[index++];
  const push = node => {
    if (node.type === 'text' && prev.type === 'dot') {
      prev.type = 'text';
    }

    if (prev && prev.type === 'text' && node.type === 'text') {
      prev.value += node.value;
      return;
    }

    block.nodes.push(node);
    node.parent = block;
    node.prev = prev;
    prev = node;
    return node;
  };

  push({ type: 'bos' });

  while (index < length) {
    block = stack[stack.length - 1];
    value = advance();

    /**
     * Invalid chars
     */

    if (value === CHAR_ZERO_WIDTH_NOBREAK_SPACE || value === CHAR_NO_BREAK_SPACE) {
      continue;
    }

    /**
     * Escaped chars
     */

    if (value === CHAR_BACKSLASH) {
      push({ type: 'text', value: (options.keepEscaping ? value : '') + advance() });
      continue;
    }

    /**
     * Right square bracket (literal): ']'
     */

    if (value === CHAR_RIGHT_SQUARE_BRACKET) {
      push({ type: 'text', value: '\\' + value });
      continue;
    }

    /**
     * Left square bracket: '['
     */

    if (value === CHAR_LEFT_SQUARE_BRACKET) {
      brackets++;

      let next;

      while (index < length && (next = advance())) {
        value += next;

        if (next === CHAR_LEFT_SQUARE_BRACKET) {
          brackets++;
          continue;
        }

        if (next === CHAR_BACKSLASH) {
          value += advance();
          continue;
        }

        if (next === CHAR_RIGHT_SQUARE_BRACKET) {
          brackets--;

          if (brackets === 0) {
            break;
          }
        }
      }

      push({ type: 'text', value });
      continue;
    }

    /**
     * Parentheses
     */

    if (value === CHAR_LEFT_PARENTHESES) {
      block = push({ type: 'paren', nodes: [] });
      stack.push(block);
      push({ type: 'text', value });
      continue;
    }

    if (value === CHAR_RIGHT_PARENTHESES) {
      if (block.type !== 'paren') {
        push({ type: 'text', value });
        continue;
      }
      block = stack.pop();
      push({ type: 'text', value });
      block = stack[stack.length - 1];
      continue;
    }

    /**
     * Quotes: '|"|`
     */

    if (value === CHAR_DOUBLE_QUOTE || value === CHAR_SINGLE_QUOTE || value === CHAR_BACKTICK) {
      const open = value;
      let next;

      if (options.keepQuotes !== true) {
        value = '';
      }

      while (index < length && (next = advance())) {
        if (next === CHAR_BACKSLASH) {
          value += next + advance();
          continue;
        }

        if (next === open) {
          if (options.keepQuotes === true) value += next;
          break;
        }

        value += next;
      }

      push({ type: 'text', value });
      continue;
    }

    /**
     * Left curly brace: '{'
     */

    if (value === CHAR_LEFT_CURLY_BRACE) {
      depth++;

      const dollar = prev.value && prev.value.slice(-1) === '$' || block.dollar === true;
      const brace = {
        type: 'brace',
        open: true,
        close: false,
        dollar,
        depth,
        commas: 0,
        ranges: 0,
        nodes: []
      };

      block = push(brace);
      stack.push(block);
      push({ type: 'open', value });
      continue;
    }

    /**
     * Right curly brace: '}'
     */

    if (value === CHAR_RIGHT_CURLY_BRACE) {
      if (block.type !== 'brace') {
        push({ type: 'text', value });
        continue;
      }

      const type = 'close';
      block = stack.pop();
      block.close = true;

      push({ type, value });
      depth--;

      block = stack[stack.length - 1];
      continue;
    }

    /**
     * Comma: ','
     */

    if (value === CHAR_COMMA && depth > 0) {
      if (block.ranges > 0) {
        block.ranges = 0;
        const open = block.nodes.shift();
        block.nodes = [open, { type: 'text', value: stringify(block) }];
      }

      push({ type: 'comma', value });
      block.commas++;
      continue;
    }

    /**
     * Dot: '.'
     */

    if (value === CHAR_DOT && depth > 0 && block.commas === 0) {
      const siblings = block.nodes;

      if (depth === 0 || siblings.length === 0) {
        push({ type: 'text', value });
        continue;
      }

      if (prev.type === 'dot') {
        block.range = [];
        prev.value += value;
        prev.type = 'range';

        if (block.nodes.length !== 3 && block.nodes.length !== 5) {
          block.invalid = true;
          block.ranges = 0;
          prev.type = 'text';
          continue;
        }

        block.ranges++;
        block.args = [];
        continue;
      }

      if (prev.type === 'range') {
        siblings.pop();

        const before = siblings[siblings.length - 1];
        before.value += prev.value + value;
        prev = before;
        block.ranges--;
        continue;
      }

      push({ type: 'dot', value });
      continue;
    }

    /**
     * Text
     */

    push({ type: 'text', value });
  }

  // Mark imbalanced braces and brackets as invalid
  do {
    block = stack.pop();

    if (block.type !== 'root') {
      block.nodes.forEach(node => {
        if (!node.nodes) {
          if (node.type === 'open') node.isOpen = true;
          if (node.type === 'close') node.isClose = true;
          if (!node.nodes) node.type = 'text';
          node.invalid = true;
        }
      });

      // get the location of the block on parent.nodes (block's siblings)
      const parent = stack[stack.length - 1];
      const index = parent.nodes.indexOf(block);
      // replace the (invalid) block with it's nodes
      parent.nodes.splice(index, 1, ...block.nodes);
    }
  } while (stack.length > 0);

  push({ type: 'eos' });
  return ast;
};

module.exports = parse;


/***/ }),

/***/ 8602:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const utils = __webpack_require__(67494);

module.exports = (ast, options = {}) => {
  const stringify = (node, parent = {}) => {
    const invalidBlock = options.escapeInvalid && utils.isInvalidBrace(parent);
    const invalidNode = node.invalid === true && options.escapeInvalid === true;
    let output = '';

    if (node.value) {
      if ((invalidBlock || invalidNode) && utils.isOpenOrClose(node)) {
        return '\\' + node.value;
      }
      return node.value;
    }

    if (node.value) {
      return node.value;
    }

    if (node.nodes) {
      for (const child of node.nodes) {
        output += stringify(child);
      }
    }
    return output;
  };

  return stringify(ast);
};



/***/ }),

/***/ 67494:
/***/ ((__unused_webpack_module, exports) => {



exports.isInteger = num => {
  if (typeof num === 'number') {
    return Number.isInteger(num);
  }
  if (typeof num === 'string' && num.trim() !== '') {
    return Number.isInteger(Number(num));
  }
  return false;
};

/**
 * Find a node of the given type
 */

exports.find = (node, type) => node.nodes.find(node => node.type === type);

/**
 * Find a node of the given type
 */

exports.exceedsLimit = (min, max, step = 1, limit) => {
  if (limit === false) return false;
  if (!exports.isInteger(min) || !exports.isInteger(max)) return false;
  return ((Number(max) - Number(min)) / Number(step)) >= limit;
};

/**
 * Escape the given node with '\\' before node.value
 */

exports.escapeNode = (block, n = 0, type) => {
  const node = block.nodes[n];
  if (!node) return;

  if ((type && node.type === type) || node.type === 'open' || node.type === 'close') {
    if (node.escaped !== true) {
      node.value = '\\' + node.value;
      node.escaped = true;
    }
  }
};

/**
 * Returns true if the given brace node should be enclosed in literal braces
 */

exports.encloseBrace = node => {
  if (node.type !== 'brace') return false;
  if ((node.commas >> 0 + node.ranges >> 0) === 0) {
    node.invalid = true;
    return true;
  }
  return false;
};

/**
 * Returns true if a brace node is invalid.
 */

exports.isInvalidBrace = block => {
  if (block.type !== 'brace') return false;
  if (block.invalid === true || block.dollar) return true;
  if ((block.commas >> 0 + block.ranges >> 0) === 0) {
    block.invalid = true;
    return true;
  }
  if (block.open !== true || block.close !== true) {
    block.invalid = true;
    return true;
  }
  return false;
};

/**
 * Returns true if a node is an open or close node
 */

exports.isOpenOrClose = node => {
  if (node.type === 'open' || node.type === 'close') {
    return true;
  }
  return node.open === true || node.close === true;
};

/**
 * Reduce an array of text nodes.
 */

exports.reduce = nodes => nodes.reduce((acc, node) => {
  if (node.type === 'text') acc.push(node.value);
  if (node.type === 'range') node.type = 'text';
  return acc;
}, []);

/**
 * Flatten an array
 */

exports.flatten = (...args) => {
  const result = [];

  const flat = arr => {
    for (let i = 0; i < arr.length; i++) {
      const ele = arr[i];

      if (Array.isArray(ele)) {
        flat(ele);
        continue;
      }

      if (ele !== undefined) {
        result.push(ele);
      }
    }
    return result;
  };

  flat(args);
  return result;
};


/***/ }),

/***/ 80197:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


const taskManager = __webpack_require__(90876);
const async_1 = __webpack_require__(40836);
const stream_1 = __webpack_require__(47526);
const sync_1 = __webpack_require__(41933);
const settings_1 = __webpack_require__(27048);
const utils = __webpack_require__(77463);
async function FastGlob(source, options) {
    assertPatternsInput(source);
    const works = getWorks(source, async_1.default, options);
    const result = await Promise.all(works);
    return utils.array.flatten(result);
}
// https://github.com/typescript-eslint/typescript-eslint/issues/60
// eslint-disable-next-line no-redeclare
(function (FastGlob) {
    FastGlob.glob = FastGlob;
    FastGlob.globSync = sync;
    FastGlob.globStream = stream;
    FastGlob.async = FastGlob;
    function sync(source, options) {
        assertPatternsInput(source);
        const works = getWorks(source, sync_1.default, options);
        return utils.array.flatten(works);
    }
    FastGlob.sync = sync;
    function stream(source, options) {
        assertPatternsInput(source);
        const works = getWorks(source, stream_1.default, options);
        /**
         * The stream returned by the provider cannot work with an asynchronous iterator.
         * To support asynchronous iterators, regardless of the number of tasks, we always multiplex streams.
         * This affects performance (+25%). I don't see best solution right now.
         */
        return utils.stream.merge(works);
    }
    FastGlob.stream = stream;
    function generateTasks(source, options) {
        assertPatternsInput(source);
        const patterns = [].concat(source);
        const settings = new settings_1.default(options);
        return taskManager.generate(patterns, settings);
    }
    FastGlob.generateTasks = generateTasks;
    function isDynamicPattern(source, options) {
        assertPatternsInput(source);
        const settings = new settings_1.default(options);
        return utils.pattern.isDynamicPattern(source, settings);
    }
    FastGlob.isDynamicPattern = isDynamicPattern;
    function escapePath(source) {
        assertPatternsInput(source);
        return utils.path.escape(source);
    }
    FastGlob.escapePath = escapePath;
    function convertPathToPattern(source) {
        assertPatternsInput(source);
        return utils.path.convertPathToPattern(source);
    }
    FastGlob.convertPathToPattern = convertPathToPattern;
    let posix;
    (function (posix) {
        function escapePath(source) {
            assertPatternsInput(source);
            return utils.path.escapePosixPath(source);
        }
        posix.escapePath = escapePath;
        function convertPathToPattern(source) {
            assertPatternsInput(source);
            return utils.path.convertPosixPathToPattern(source);
        }
        posix.convertPathToPattern = convertPathToPattern;
    })(posix = FastGlob.posix || (FastGlob.posix = {}));
    let win32;
    (function (win32) {
        function escapePath(source) {
            assertPatternsInput(source);
            return utils.path.escapeWindowsPath(source);
        }
        win32.escapePath = escapePath;
        function convertPathToPattern(source) {
            assertPatternsInput(source);
            return utils.path.convertWindowsPathToPattern(source);
        }
        win32.convertPathToPattern = convertPathToPattern;
    })(win32 = FastGlob.win32 || (FastGlob.win32 = {}));
})(FastGlob || (FastGlob = {}));
function getWorks(source, _Provider, options) {
    const patterns = [].concat(source);
    const settings = new settings_1.default(options);
    const tasks = taskManager.generate(patterns, settings);
    const provider = new _Provider(settings);
    return tasks.map(provider.read, provider);
}
function assertPatternsInput(input) {
    const source = [].concat(input);
    const isValidSource = source.every((item) => utils.string.isString(item) && !utils.string.isEmpty(item));
    if (!isValidSource) {
        throw new TypeError('Patterns must be a string (non empty) or an array of strings');
    }
}
module.exports = FastGlob;


/***/ }),

/***/ 90876:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.convertPatternGroupToTask = exports.convertPatternGroupsToTasks = exports.groupPatternsByBaseDirectory = exports.getNegativePatternsAsPositive = exports.getPositivePatterns = exports.convertPatternsToTasks = exports.generate = void 0;
const utils = __webpack_require__(77463);
function generate(input, settings) {
    const patterns = processPatterns(input, settings);
    const ignore = processPatterns(settings.ignore, settings);
    const positivePatterns = getPositivePatterns(patterns);
    const negativePatterns = getNegativePatternsAsPositive(patterns, ignore);
    const staticPatterns = positivePatterns.filter((pattern) => utils.pattern.isStaticPattern(pattern, settings));
    const dynamicPatterns = positivePatterns.filter((pattern) => utils.pattern.isDynamicPattern(pattern, settings));
    const staticTasks = convertPatternsToTasks(staticPatterns, negativePatterns, /* dynamic */ false);
    const dynamicTasks = convertPatternsToTasks(dynamicPatterns, negativePatterns, /* dynamic */ true);
    return staticTasks.concat(dynamicTasks);
}
exports.generate = generate;
function processPatterns(input, settings) {
    let patterns = input;
    /**
     * The original pattern like `{,*,**,a/*}` can lead to problems checking the depth when matching entry
     * and some problems with the micromatch package (see fast-glob issues: #365, #394).
     *
     * To solve this problem, we expand all patterns containing brace expansion. This can lead to a slight slowdown
     * in matching in the case of a large set of patterns after expansion.
     */
    if (settings.braceExpansion) {
        patterns = utils.pattern.expandPatternsWithBraceExpansion(patterns);
    }
    /**
     * If the `baseNameMatch` option is enabled, we must add globstar to patterns, so that they can be used
     * at any nesting level.
     *
     * We do this here, because otherwise we have to complicate the filtering logic. For example, we need to change
     * the pattern in the filter before creating a regular expression. There is no need to change the patterns
     * in the application. Only on the input.
     */
    if (settings.baseNameMatch) {
        patterns = patterns.map((pattern) => pattern.includes('/') ? pattern : `**/${pattern}`);
    }
    /**
     * This method also removes duplicate slashes that may have been in the pattern or formed as a result of expansion.
     */
    return patterns.map((pattern) => utils.pattern.removeDuplicateSlashes(pattern));
}
/**
 * Returns tasks grouped by basic pattern directories.
 *
 * Patterns that can be found inside (`./`) and outside (`../`) the current directory are handled separately.
 * This is necessary because directory traversal starts at the base directory and goes deeper.
 */
function convertPatternsToTasks(positive, negative, dynamic) {
    const tasks = [];
    const patternsOutsideCurrentDirectory = utils.pattern.getPatternsOutsideCurrentDirectory(positive);
    const patternsInsideCurrentDirectory = utils.pattern.getPatternsInsideCurrentDirectory(positive);
    const outsideCurrentDirectoryGroup = groupPatternsByBaseDirectory(patternsOutsideCurrentDirectory);
    const insideCurrentDirectoryGroup = groupPatternsByBaseDirectory(patternsInsideCurrentDirectory);
    tasks.push(...convertPatternGroupsToTasks(outsideCurrentDirectoryGroup, negative, dynamic));
    /*
     * For the sake of reducing future accesses to the file system, we merge all tasks within the current directory
     * into a global task, if at least one pattern refers to the root (`.`). In this case, the global task covers the rest.
     */
    if ('.' in insideCurrentDirectoryGroup) {
        tasks.push(convertPatternGroupToTask('.', patternsInsideCurrentDirectory, negative, dynamic));
    }
    else {
        tasks.push(...convertPatternGroupsToTasks(insideCurrentDirectoryGroup, negative, dynamic));
    }
    return tasks;
}
exports.convertPatternsToTasks = convertPatternsToTasks;
function getPositivePatterns(patterns) {
    return utils.pattern.getPositivePatterns(patterns);
}
exports.getPositivePatterns = getPositivePatterns;
function getNegativePatternsAsPositive(patterns, ignore) {
    const negative = utils.pattern.getNegativePatterns(patterns).concat(ignore);
    const positive = negative.map(utils.pattern.convertToPositivePattern);
    return positive;
}
exports.getNegativePatternsAsPositive = getNegativePatternsAsPositive;
function groupPatternsByBaseDirectory(patterns) {
    const group = {};
    return patterns.reduce((collection, pattern) => {
        const base = utils.pattern.getBaseDirectory(pattern);
        if (base in collection) {
            collection[base].push(pattern);
        }
        else {
            collection[base] = [pattern];
        }
        return collection;
    }, group);
}
exports.groupPatternsByBaseDirectory = groupPatternsByBaseDirectory;
function convertPatternGroupsToTasks(positive, negative, dynamic) {
    return Object.keys(positive).map((base) => {
        return convertPatternGroupToTask(base, positive[base], negative, dynamic);
    });
}
exports.convertPatternGroupsToTasks = convertPatternGroupsToTasks;
function convertPatternGroupToTask(base, positive, negative, dynamic) {
    return {
        dynamic,
        positive,
        negative,
        base,
        patterns: [].concat(positive, negative.map(utils.pattern.convertToNegativePattern))
    };
}
exports.convertPatternGroupToTask = convertPatternGroupToTask;


/***/ }),

/***/ 40836:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const async_1 = __webpack_require__(79118);
const provider_1 = __webpack_require__(38555);
class ProviderAsync extends provider_1.default {
    constructor() {
        super(...arguments);
        this._reader = new async_1.default(this._settings);
    }
    async read(task) {
        const root = this._getRootDirectory(task);
        const options = this._getReaderOptions(task);
        const entries = await this.api(root, task, options);
        return entries.map((entry) => options.transform(entry));
    }
    api(root, task, options) {
        if (task.dynamic) {
            return this._reader.dynamic(root, options);
        }
        return this._reader.static(task.patterns, options);
    }
}
exports["default"] = ProviderAsync;


/***/ }),

/***/ 34872:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const utils = __webpack_require__(77463);
const partial_1 = __webpack_require__(6703);
class DeepFilter {
    constructor(_settings, _micromatchOptions) {
        this._settings = _settings;
        this._micromatchOptions = _micromatchOptions;
    }
    getFilter(basePath, positive, negative) {
        const matcher = this._getMatcher(positive);
        const negativeRe = this._getNegativePatternsRe(negative);
        return (entry) => this._filter(basePath, entry, matcher, negativeRe);
    }
    _getMatcher(patterns) {
        return new partial_1.default(patterns, this._settings, this._micromatchOptions);
    }
    _getNegativePatternsRe(patterns) {
        const affectDepthOfReadingPatterns = patterns.filter(utils.pattern.isAffectDepthOfReadingPattern);
        return utils.pattern.convertPatternsToRe(affectDepthOfReadingPatterns, this._micromatchOptions);
    }
    _filter(basePath, entry, matcher, negativeRe) {
        if (this._isSkippedByDeep(basePath, entry.path)) {
            return false;
        }
        if (this._isSkippedSymbolicLink(entry)) {
            return false;
        }
        const filepath = utils.path.removeLeadingDotSegment(entry.path);
        if (this._isSkippedByPositivePatterns(filepath, matcher)) {
            return false;
        }
        return this._isSkippedByNegativePatterns(filepath, negativeRe);
    }
    _isSkippedByDeep(basePath, entryPath) {
        /**
         * Avoid unnecessary depth calculations when it doesn't matter.
         */
        if (this._settings.deep === Infinity) {
            return false;
        }
        return this._getEntryLevel(basePath, entryPath) >= this._settings.deep;
    }
    _getEntryLevel(basePath, entryPath) {
        const entryPathDepth = entryPath.split('/').length;
        if (basePath === '') {
            return entryPathDepth;
        }
        const basePathDepth = basePath.split('/').length;
        return entryPathDepth - basePathDepth;
    }
    _isSkippedSymbolicLink(entry) {
        return !this._settings.followSymbolicLinks && entry.dirent.isSymbolicLink();
    }
    _isSkippedByPositivePatterns(entryPath, matcher) {
        return !this._settings.baseNameMatch && !matcher.match(entryPath);
    }
    _isSkippedByNegativePatterns(entryPath, patternsRe) {
        return !utils.pattern.matchAny(entryPath, patternsRe);
    }
}
exports["default"] = DeepFilter;


/***/ }),

/***/ 8244:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const utils = __webpack_require__(77463);
class EntryFilter {
    constructor(_settings, _micromatchOptions) {
        this._settings = _settings;
        this._micromatchOptions = _micromatchOptions;
        this.index = new Map();
    }
    getFilter(positive, negative) {
        const [absoluteNegative, relativeNegative] = utils.pattern.partitionAbsoluteAndRelative(negative);
        const patterns = {
            positive: {
                all: utils.pattern.convertPatternsToRe(positive, this._micromatchOptions)
            },
            negative: {
                absolute: utils.pattern.convertPatternsToRe(absoluteNegative, Object.assign(Object.assign({}, this._micromatchOptions), { dot: true })),
                relative: utils.pattern.convertPatternsToRe(relativeNegative, Object.assign(Object.assign({}, this._micromatchOptions), { dot: true }))
            }
        };
        return (entry) => this._filter(entry, patterns);
    }
    _filter(entry, patterns) {
        const filepath = utils.path.removeLeadingDotSegment(entry.path);
        if (this._settings.unique && this._isDuplicateEntry(filepath)) {
            return false;
        }
        if (this._onlyFileFilter(entry) || this._onlyDirectoryFilter(entry)) {
            return false;
        }
        const isMatched = this._isMatchToPatternsSet(filepath, patterns, entry.dirent.isDirectory());
        if (this._settings.unique && isMatched) {
            this._createIndexRecord(filepath);
        }
        return isMatched;
    }
    _isDuplicateEntry(filepath) {
        return this.index.has(filepath);
    }
    _createIndexRecord(filepath) {
        this.index.set(filepath, undefined);
    }
    _onlyFileFilter(entry) {
        return this._settings.onlyFiles && !entry.dirent.isFile();
    }
    _onlyDirectoryFilter(entry) {
        return this._settings.onlyDirectories && !entry.dirent.isDirectory();
    }
    _isMatchToPatternsSet(filepath, patterns, isDirectory) {
        const isMatched = this._isMatchToPatterns(filepath, patterns.positive.all, isDirectory);
        if (!isMatched) {
            return false;
        }
        const isMatchedByRelativeNegative = this._isMatchToPatterns(filepath, patterns.negative.relative, isDirectory);
        if (isMatchedByRelativeNegative) {
            return false;
        }
        const isMatchedByAbsoluteNegative = this._isMatchToAbsoluteNegative(filepath, patterns.negative.absolute, isDirectory);
        if (isMatchedByAbsoluteNegative) {
            return false;
        }
        return true;
    }
    _isMatchToAbsoluteNegative(filepath, patternsRe, isDirectory) {
        if (patternsRe.length === 0) {
            return false;
        }
        const fullpath = utils.path.makeAbsolute(this._settings.cwd, filepath);
        return this._isMatchToPatterns(fullpath, patternsRe, isDirectory);
    }
    _isMatchToPatterns(filepath, patternsRe, isDirectory) {
        if (patternsRe.length === 0) {
            return false;
        }
        // Trying to match files and directories by patterns.
        const isMatched = utils.pattern.matchAny(filepath, patternsRe);
        // A pattern with a trailling slash can be used for directory matching.
        // To apply such pattern, we need to add a tralling slash to the path.
        if (!isMatched && isDirectory) {
            return utils.pattern.matchAny(filepath + '/', patternsRe);
        }
        return isMatched;
    }
}
exports["default"] = EntryFilter;


/***/ }),

/***/ 83030:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const utils = __webpack_require__(77463);
class ErrorFilter {
    constructor(_settings) {
        this._settings = _settings;
    }
    getFilter() {
        return (error) => this._isNonFatalError(error);
    }
    _isNonFatalError(error) {
        return utils.errno.isEnoentCodeError(error) || this._settings.suppressErrors;
    }
}
exports["default"] = ErrorFilter;


/***/ }),

/***/ 83264:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const utils = __webpack_require__(77463);
class Matcher {
    constructor(_patterns, _settings, _micromatchOptions) {
        this._patterns = _patterns;
        this._settings = _settings;
        this._micromatchOptions = _micromatchOptions;
        this._storage = [];
        this._fillStorage();
    }
    _fillStorage() {
        for (const pattern of this._patterns) {
            const segments = this._getPatternSegments(pattern);
            const sections = this._splitSegmentsIntoSections(segments);
            this._storage.push({
                complete: sections.length <= 1,
                pattern,
                segments,
                sections
            });
        }
    }
    _getPatternSegments(pattern) {
        const parts = utils.pattern.getPatternParts(pattern, this._micromatchOptions);
        return parts.map((part) => {
            const dynamic = utils.pattern.isDynamicPattern(part, this._settings);
            if (!dynamic) {
                return {
                    dynamic: false,
                    pattern: part
                };
            }
            return {
                dynamic: true,
                pattern: part,
                patternRe: utils.pattern.makeRe(part, this._micromatchOptions)
            };
        });
    }
    _splitSegmentsIntoSections(segments) {
        return utils.array.splitWhen(segments, (segment) => segment.dynamic && utils.pattern.hasGlobStar(segment.pattern));
    }
}
exports["default"] = Matcher;


/***/ }),

/***/ 6703:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const matcher_1 = __webpack_require__(83264);
class PartialMatcher extends matcher_1.default {
    match(filepath) {
        const parts = filepath.split('/');
        const levels = parts.length;
        const patterns = this._storage.filter((info) => !info.complete || info.segments.length > levels);
        for (const pattern of patterns) {
            const section = pattern.sections[0];
            /**
             * In this case, the pattern has a globstar and we must read all directories unconditionally,
             * but only if the level has reached the end of the first group.
             *
             * fixtures/{a,b}/**
             *  ^ true/false  ^ always true
            */
            if (!pattern.complete && levels > section.length) {
                return true;
            }
            const match = parts.every((part, index) => {
                const segment = pattern.segments[index];
                if (segment.dynamic && segment.patternRe.test(part)) {
                    return true;
                }
                if (!segment.dynamic && segment.pattern === part) {
                    return true;
                }
                return false;
            });
            if (match) {
                return true;
            }
        }
        return false;
    }
}
exports["default"] = PartialMatcher;


/***/ }),

/***/ 38555:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const path = __webpack_require__(16928);
const deep_1 = __webpack_require__(34872);
const entry_1 = __webpack_require__(8244);
const error_1 = __webpack_require__(83030);
const entry_2 = __webpack_require__(95197);
class Provider {
    constructor(_settings) {
        this._settings = _settings;
        this.errorFilter = new error_1.default(this._settings);
        this.entryFilter = new entry_1.default(this._settings, this._getMicromatchOptions());
        this.deepFilter = new deep_1.default(this._settings, this._getMicromatchOptions());
        this.entryTransformer = new entry_2.default(this._settings);
    }
    _getRootDirectory(task) {
        return path.resolve(this._settings.cwd, task.base);
    }
    _getReaderOptions(task) {
        const basePath = task.base === '.' ? '' : task.base;
        return {
            basePath,
            pathSegmentSeparator: '/',
            concurrency: this._settings.concurrency,
            deepFilter: this.deepFilter.getFilter(basePath, task.positive, task.negative),
            entryFilter: this.entryFilter.getFilter(task.positive, task.negative),
            errorFilter: this.errorFilter.getFilter(),
            followSymbolicLinks: this._settings.followSymbolicLinks,
            fs: this._settings.fs,
            stats: this._settings.stats,
            throwErrorOnBrokenSymbolicLink: this._settings.throwErrorOnBrokenSymbolicLink,
            transform: this.entryTransformer.getTransformer()
        };
    }
    _getMicromatchOptions() {
        return {
            dot: this._settings.dot,
            matchBase: this._settings.baseNameMatch,
            nobrace: !this._settings.braceExpansion,
            nocase: !this._settings.caseSensitiveMatch,
            noext: !this._settings.extglob,
            noglobstar: !this._settings.globstar,
            posix: true,
            strictSlashes: false
        };
    }
}
exports["default"] = Provider;


/***/ }),

/***/ 47526:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const stream_1 = __webpack_require__(2203);
const stream_2 = __webpack_require__(28256);
const provider_1 = __webpack_require__(38555);
class ProviderStream extends provider_1.default {
    constructor() {
        super(...arguments);
        this._reader = new stream_2.default(this._settings);
    }
    read(task) {
        const root = this._getRootDirectory(task);
        const options = this._getReaderOptions(task);
        const source = this.api(root, task, options);
        const destination = new stream_1.Readable({ objectMode: true, read: () => { } });
        source
            .once('error', (error) => destination.emit('error', error))
            .on('data', (entry) => destination.emit('data', options.transform(entry)))
            .once('end', () => destination.emit('end'));
        destination
            .once('close', () => source.destroy());
        return destination;
    }
    api(root, task, options) {
        if (task.dynamic) {
            return this._reader.dynamic(root, options);
        }
        return this._reader.static(task.patterns, options);
    }
}
exports["default"] = ProviderStream;


/***/ }),

/***/ 41933:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const sync_1 = __webpack_require__(28411);
const provider_1 = __webpack_require__(38555);
class ProviderSync extends provider_1.default {
    constructor() {
        super(...arguments);
        this._reader = new sync_1.default(this._settings);
    }
    read(task) {
        const root = this._getRootDirectory(task);
        const options = this._getReaderOptions(task);
        const entries = this.api(root, task, options);
        return entries.map(options.transform);
    }
    api(root, task, options) {
        if (task.dynamic) {
            return this._reader.dynamic(root, options);
        }
        return this._reader.static(task.patterns, options);
    }
}
exports["default"] = ProviderSync;


/***/ }),

/***/ 95197:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const utils = __webpack_require__(77463);
class EntryTransformer {
    constructor(_settings) {
        this._settings = _settings;
    }
    getTransformer() {
        return (entry) => this._transform(entry);
    }
    _transform(entry) {
        let filepath = entry.path;
        if (this._settings.absolute) {
            filepath = utils.path.makeAbsolute(this._settings.cwd, filepath);
            filepath = utils.path.unixify(filepath);
        }
        if (this._settings.markDirectories && entry.dirent.isDirectory()) {
            filepath += '/';
        }
        if (!this._settings.objectMode) {
            return filepath;
        }
        return Object.assign(Object.assign({}, entry), { path: filepath });
    }
}
exports["default"] = EntryTransformer;


/***/ }),

/***/ 79118:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const fsWalk = __webpack_require__(77669);
const reader_1 = __webpack_require__(61443);
const stream_1 = __webpack_require__(28256);
class ReaderAsync extends reader_1.default {
    constructor() {
        super(...arguments);
        this._walkAsync = fsWalk.walk;
        this._readerStream = new stream_1.default(this._settings);
    }
    dynamic(root, options) {
        return new Promise((resolve, reject) => {
            this._walkAsync(root, options, (error, entries) => {
                if (error === null) {
                    resolve(entries);
                }
                else {
                    reject(error);
                }
            });
        });
    }
    async static(patterns, options) {
        const entries = [];
        const stream = this._readerStream.static(patterns, options);
        // After #235, replace it with an asynchronous iterator.
        return new Promise((resolve, reject) => {
            stream.once('error', reject);
            stream.on('data', (entry) => entries.push(entry));
            stream.once('end', () => resolve(entries));
        });
    }
}
exports["default"] = ReaderAsync;


/***/ }),

/***/ 61443:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const path = __webpack_require__(16928);
const fsStat = __webpack_require__(61113);
const utils = __webpack_require__(77463);
class Reader {
    constructor(_settings) {
        this._settings = _settings;
        this._fsStatSettings = new fsStat.Settings({
            followSymbolicLink: this._settings.followSymbolicLinks,
            fs: this._settings.fs,
            throwErrorOnBrokenSymbolicLink: this._settings.followSymbolicLinks
        });
    }
    _getFullEntryPath(filepath) {
        return path.resolve(this._settings.cwd, filepath);
    }
    _makeEntry(stats, pattern) {
        const entry = {
            name: pattern,
            path: pattern,
            dirent: utils.fs.createDirentFromStats(pattern, stats)
        };
        if (this._settings.stats) {
            entry.stats = stats;
        }
        return entry;
    }
    _isFatalError(error) {
        return !utils.errno.isEnoentCodeError(error) && !this._settings.suppressErrors;
    }
}
exports["default"] = Reader;


/***/ }),

/***/ 28256:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const stream_1 = __webpack_require__(2203);
const fsStat = __webpack_require__(61113);
const fsWalk = __webpack_require__(77669);
const reader_1 = __webpack_require__(61443);
class ReaderStream extends reader_1.default {
    constructor() {
        super(...arguments);
        this._walkStream = fsWalk.walkStream;
        this._stat = fsStat.stat;
    }
    dynamic(root, options) {
        return this._walkStream(root, options);
    }
    static(patterns, options) {
        const filepaths = patterns.map(this._getFullEntryPath, this);
        const stream = new stream_1.PassThrough({ objectMode: true });
        stream._write = (index, _enc, done) => {
            return this._getEntry(filepaths[index], patterns[index], options)
                .then((entry) => {
                if (entry !== null && options.entryFilter(entry)) {
                    stream.push(entry);
                }
                if (index === filepaths.length - 1) {
                    stream.end();
                }
                done();
            })
                .catch(done);
        };
        for (let i = 0; i < filepaths.length; i++) {
            stream.write(i);
        }
        return stream;
    }
    _getEntry(filepath, pattern, options) {
        return this._getStat(filepath)
            .then((stats) => this._makeEntry(stats, pattern))
            .catch((error) => {
            if (options.errorFilter(error)) {
                return null;
            }
            throw error;
        });
    }
    _getStat(filepath) {
        return new Promise((resolve, reject) => {
            this._stat(filepath, this._fsStatSettings, (error, stats) => {
                return error === null ? resolve(stats) : reject(error);
            });
        });
    }
}
exports["default"] = ReaderStream;


/***/ }),

/***/ 28411:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const fsStat = __webpack_require__(61113);
const fsWalk = __webpack_require__(77669);
const reader_1 = __webpack_require__(61443);
class ReaderSync extends reader_1.default {
    constructor() {
        super(...arguments);
        this._walkSync = fsWalk.walkSync;
        this._statSync = fsStat.statSync;
    }
    dynamic(root, options) {
        return this._walkSync(root, options);
    }
    static(patterns, options) {
        const entries = [];
        for (const pattern of patterns) {
            const filepath = this._getFullEntryPath(pattern);
            const entry = this._getEntry(filepath, pattern, options);
            if (entry === null || !options.entryFilter(entry)) {
                continue;
            }
            entries.push(entry);
        }
        return entries;
    }
    _getEntry(filepath, pattern, options) {
        try {
            const stats = this._getStat(filepath);
            return this._makeEntry(stats, pattern);
        }
        catch (error) {
            if (options.errorFilter(error)) {
                return null;
            }
            throw error;
        }
    }
    _getStat(filepath) {
        return this._statSync(filepath, this._fsStatSettings);
    }
}
exports["default"] = ReaderSync;


/***/ }),

/***/ 27048:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DEFAULT_FILE_SYSTEM_ADAPTER = void 0;
const fs = __webpack_require__(79896);
const os = __webpack_require__(70857);
/**
 * The `os.cpus` method can return zero. We expect the number of cores to be greater than zero.
 * https://github.com/nodejs/node/blob/7faeddf23a98c53896f8b574a6e66589e8fb1eb8/lib/os.js#L106-L107
 */
const CPU_COUNT = Math.max(os.cpus().length, 1);
exports.DEFAULT_FILE_SYSTEM_ADAPTER = {
    lstat: fs.lstat,
    lstatSync: fs.lstatSync,
    stat: fs.stat,
    statSync: fs.statSync,
    readdir: fs.readdir,
    readdirSync: fs.readdirSync
};
class Settings {
    constructor(_options = {}) {
        this._options = _options;
        this.absolute = this._getValue(this._options.absolute, false);
        this.baseNameMatch = this._getValue(this._options.baseNameMatch, false);
        this.braceExpansion = this._getValue(this._options.braceExpansion, true);
        this.caseSensitiveMatch = this._getValue(this._options.caseSensitiveMatch, true);
        this.concurrency = this._getValue(this._options.concurrency, CPU_COUNT);
        this.cwd = this._getValue(this._options.cwd, process.cwd());
        this.deep = this._getValue(this._options.deep, Infinity);
        this.dot = this._getValue(this._options.dot, false);
        this.extglob = this._getValue(this._options.extglob, true);
        this.followSymbolicLinks = this._getValue(this._options.followSymbolicLinks, true);
        this.fs = this._getFileSystemMethods(this._options.fs);
        this.globstar = this._getValue(this._options.globstar, true);
        this.ignore = this._getValue(this._options.ignore, []);
        this.markDirectories = this._getValue(this._options.markDirectories, false);
        this.objectMode = this._getValue(this._options.objectMode, false);
        this.onlyDirectories = this._getValue(this._options.onlyDirectories, false);
        this.onlyFiles = this._getValue(this._options.onlyFiles, true);
        this.stats = this._getValue(this._options.stats, false);
        this.suppressErrors = this._getValue(this._options.suppressErrors, false);
        this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, false);
        this.unique = this._getValue(this._options.unique, true);
        if (this.onlyDirectories) {
            this.onlyFiles = false;
        }
        if (this.stats) {
            this.objectMode = true;
        }
        // Remove the cast to the array in the next major (#404).
        this.ignore = [].concat(this.ignore);
    }
    _getValue(option, value) {
        return option === undefined ? value : option;
    }
    _getFileSystemMethods(methods = {}) {
        return Object.assign(Object.assign({}, exports.DEFAULT_FILE_SYSTEM_ADAPTER), methods);
    }
}
exports["default"] = Settings;


/***/ }),

/***/ 36850:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.splitWhen = exports.flatten = void 0;
function flatten(items) {
    return items.reduce((collection, item) => [].concat(collection, item), []);
}
exports.flatten = flatten;
function splitWhen(items, predicate) {
    const result = [[]];
    let groupIndex = 0;
    for (const item of items) {
        if (predicate(item)) {
            groupIndex++;
            result[groupIndex] = [];
        }
        else {
            result[groupIndex].push(item);
        }
    }
    return result;
}
exports.splitWhen = splitWhen;


/***/ }),

/***/ 47119:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isEnoentCodeError = void 0;
function isEnoentCodeError(error) {
    return error.code === 'ENOENT';
}
exports.isEnoentCodeError = isEnoentCodeError;


/***/ }),

/***/ 70268:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createDirentFromStats = void 0;
class DirentFromStats {
    constructor(name, stats) {
        this.name = name;
        this.isBlockDevice = stats.isBlockDevice.bind(stats);
        this.isCharacterDevice = stats.isCharacterDevice.bind(stats);
        this.isDirectory = stats.isDirectory.bind(stats);
        this.isFIFO = stats.isFIFO.bind(stats);
        this.isFile = stats.isFile.bind(stats);
        this.isSocket = stats.isSocket.bind(stats);
        this.isSymbolicLink = stats.isSymbolicLink.bind(stats);
    }
}
function createDirentFromStats(name, stats) {
    return new DirentFromStats(name, stats);
}
exports.createDirentFromStats = createDirentFromStats;


/***/ }),

/***/ 77463:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.string = exports.stream = exports.pattern = exports.path = exports.fs = exports.errno = exports.array = void 0;
const array = __webpack_require__(36850);
exports.array = array;
const errno = __webpack_require__(47119);
exports.errno = errno;
const fs = __webpack_require__(70268);
exports.fs = fs;
const path = __webpack_require__(95720);
exports.path = path;
const pattern = __webpack_require__(42673);
exports.pattern = pattern;
const stream = __webpack_require__(82931);
exports.stream = stream;
const string = __webpack_require__(48950);
exports.string = string;


/***/ }),

/***/ 95720:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.convertPosixPathToPattern = exports.convertWindowsPathToPattern = exports.convertPathToPattern = exports.escapePosixPath = exports.escapeWindowsPath = exports.escape = exports.removeLeadingDotSegment = exports.makeAbsolute = exports.unixify = void 0;
const os = __webpack_require__(70857);
const path = __webpack_require__(16928);
const IS_WINDOWS_PLATFORM = os.platform() === 'win32';
const LEADING_DOT_SEGMENT_CHARACTERS_COUNT = 2; // ./ or .\\
/**
 * All non-escaped special characters.
 * Posix: ()*?[]{|}, !+@ before (, ! at the beginning, \\ before non-special characters.
 * Windows: (){}[], !+@ before (, ! at the beginning.
 */
const POSIX_UNESCAPED_GLOB_SYMBOLS_RE = /(\\?)([()*?[\]{|}]|^!|[!+@](?=\()|\\(?![!()*+?@[\]{|}]))/g;
const WINDOWS_UNESCAPED_GLOB_SYMBOLS_RE = /(\\?)([()[\]{}]|^!|[!+@](?=\())/g;
/**
 * The device path (\\.\ or \\?\).
 * https://learn.microsoft.com/en-us/dotnet/standard/io/file-path-formats#dos-device-paths
 */
const DOS_DEVICE_PATH_RE = /^\\\\([.?])/;
/**
 * All backslashes except those escaping special characters.
 * Windows: !()+@{}
 * https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#naming-conventions
 */
const WINDOWS_BACKSLASHES_RE = /\\(?![!()+@[\]{}])/g;
/**
 * Designed to work only with simple paths: `dir\\file`.
 */
function unixify(filepath) {
    return filepath.replace(/\\/g, '/');
}
exports.unixify = unixify;
function makeAbsolute(cwd, filepath) {
    return path.resolve(cwd, filepath);
}
exports.makeAbsolute = makeAbsolute;
function removeLeadingDotSegment(entry) {
    // We do not use `startsWith` because this is 10x slower than current implementation for some cases.
    // eslint-disable-next-line @typescript-eslint/prefer-string-starts-ends-with
    if (entry.charAt(0) === '.') {
        const secondCharactery = entry.charAt(1);
        if (secondCharactery === '/' || secondCharactery === '\\') {
            return entry.slice(LEADING_DOT_SEGMENT_CHARACTERS_COUNT);
        }
    }
    return entry;
}
exports.removeLeadingDotSegment = removeLeadingDotSegment;
exports.escape = IS_WINDOWS_PLATFORM ? escapeWindowsPath : escapePosixPath;
function escapeWindowsPath(pattern) {
    return pattern.replace(WINDOWS_UNESCAPED_GLOB_SYMBOLS_RE, '\\$2');
}
exports.escapeWindowsPath = escapeWindowsPath;
function escapePosixPath(pattern) {
    return pattern.replace(POSIX_UNESCAPED_GLOB_SYMBOLS_RE, '\\$2');
}
exports.escapePosixPath = escapePosixPath;
exports.convertPathToPattern = IS_WINDOWS_PLATFORM ? convertWindowsPathToPattern : convertPosixPathToPattern;
function convertWindowsPathToPattern(filepath) {
    return escapeWindowsPath(filepath)
        .replace(DOS_DEVICE_PATH_RE, '//$1')
        .replace(WINDOWS_BACKSLASHES_RE, '/');
}
exports.convertWindowsPathToPattern = convertWindowsPathToPattern;
function convertPosixPathToPattern(filepath) {
    return escapePosixPath(filepath);
}
exports.convertPosixPathToPattern = convertPosixPathToPattern;


/***/ }),

/***/ 42673:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isAbsolute = exports.partitionAbsoluteAndRelative = exports.removeDuplicateSlashes = exports.matchAny = exports.convertPatternsToRe = exports.makeRe = exports.getPatternParts = exports.expandBraceExpansion = exports.expandPatternsWithBraceExpansion = exports.isAffectDepthOfReadingPattern = exports.endsWithSlashGlobStar = exports.hasGlobStar = exports.getBaseDirectory = exports.isPatternRelatedToParentDirectory = exports.getPatternsOutsideCurrentDirectory = exports.getPatternsInsideCurrentDirectory = exports.getPositivePatterns = exports.getNegativePatterns = exports.isPositivePattern = exports.isNegativePattern = exports.convertToNegativePattern = exports.convertToPositivePattern = exports.isDynamicPattern = exports.isStaticPattern = void 0;
const path = __webpack_require__(16928);
const globParent = __webpack_require__(71511);
const micromatch = __webpack_require__(13095);
const GLOBSTAR = '**';
const ESCAPE_SYMBOL = '\\';
const COMMON_GLOB_SYMBOLS_RE = /[*?]|^!/;
const REGEX_CHARACTER_CLASS_SYMBOLS_RE = /\[[^[]*]/;
const REGEX_GROUP_SYMBOLS_RE = /(?:^|[^!*+?@])\([^(]*\|[^|]*\)/;
const GLOB_EXTENSION_SYMBOLS_RE = /[!*+?@]\([^(]*\)/;
const BRACE_EXPANSION_SEPARATORS_RE = /,|\.\./;
/**
 * Matches a sequence of two or more consecutive slashes, excluding the first two slashes at the beginning of the string.
 * The latter is due to the presence of the device path at the beginning of the UNC path.
 */
const DOUBLE_SLASH_RE = /(?!^)\/{2,}/g;
function isStaticPattern(pattern, options = {}) {
    return !isDynamicPattern(pattern, options);
}
exports.isStaticPattern = isStaticPattern;
function isDynamicPattern(pattern, options = {}) {
    /**
     * A special case with an empty string is necessary for matching patterns that start with a forward slash.
     * An empty string cannot be a dynamic pattern.
     * For example, the pattern `/lib/*` will be spread into parts: '', 'lib', '*'.
     */
    if (pattern === '') {
        return false;
    }
    /**
     * When the `caseSensitiveMatch` option is disabled, all patterns must be marked as dynamic, because we cannot check
     * filepath directly (without read directory).
     */
    if (options.caseSensitiveMatch === false || pattern.includes(ESCAPE_SYMBOL)) {
        return true;
    }
    if (COMMON_GLOB_SYMBOLS_RE.test(pattern) || REGEX_CHARACTER_CLASS_SYMBOLS_RE.test(pattern) || REGEX_GROUP_SYMBOLS_RE.test(pattern)) {
        return true;
    }
    if (options.extglob !== false && GLOB_EXTENSION_SYMBOLS_RE.test(pattern)) {
        return true;
    }
    if (options.braceExpansion !== false && hasBraceExpansion(pattern)) {
        return true;
    }
    return false;
}
exports.isDynamicPattern = isDynamicPattern;
function hasBraceExpansion(pattern) {
    const openingBraceIndex = pattern.indexOf('{');
    if (openingBraceIndex === -1) {
        return false;
    }
    const closingBraceIndex = pattern.indexOf('}', openingBraceIndex + 1);
    if (closingBraceIndex === -1) {
        return false;
    }
    const braceContent = pattern.slice(openingBraceIndex, closingBraceIndex);
    return BRACE_EXPANSION_SEPARATORS_RE.test(braceContent);
}
function convertToPositivePattern(pattern) {
    return isNegativePattern(pattern) ? pattern.slice(1) : pattern;
}
exports.convertToPositivePattern = convertToPositivePattern;
function convertToNegativePattern(pattern) {
    return '!' + pattern;
}
exports.convertToNegativePattern = convertToNegativePattern;
function isNegativePattern(pattern) {
    return pattern.startsWith('!') && pattern[1] !== '(';
}
exports.isNegativePattern = isNegativePattern;
function isPositivePattern(pattern) {
    return !isNegativePattern(pattern);
}
exports.isPositivePattern = isPositivePattern;
function getNegativePatterns(patterns) {
    return patterns.filter(isNegativePattern);
}
exports.getNegativePatterns = getNegativePatterns;
function getPositivePatterns(patterns) {
    return patterns.filter(isPositivePattern);
}
exports.getPositivePatterns = getPositivePatterns;
/**
 * Returns patterns that can be applied inside the current directory.
 *
 * @example
 * // ['./*', '*', 'a/*']
 * getPatternsInsideCurrentDirectory(['./*', '*', 'a/*', '../*', './../*'])
 */
function getPatternsInsideCurrentDirectory(patterns) {
    return patterns.filter((pattern) => !isPatternRelatedToParentDirectory(pattern));
}
exports.getPatternsInsideCurrentDirectory = getPatternsInsideCurrentDirectory;
/**
 * Returns patterns to be expanded relative to (outside) the current directory.
 *
 * @example
 * // ['../*', './../*']
 * getPatternsInsideCurrentDirectory(['./*', '*', 'a/*', '../*', './../*'])
 */
function getPatternsOutsideCurrentDirectory(patterns) {
    return patterns.filter(isPatternRelatedToParentDirectory);
}
exports.getPatternsOutsideCurrentDirectory = getPatternsOutsideCurrentDirectory;
function isPatternRelatedToParentDirectory(pattern) {
    return pattern.startsWith('..') || pattern.startsWith('./..');
}
exports.isPatternRelatedToParentDirectory = isPatternRelatedToParentDirectory;
function getBaseDirectory(pattern) {
    return globParent(pattern, { flipBackslashes: false });
}
exports.getBaseDirectory = getBaseDirectory;
function hasGlobStar(pattern) {
    return pattern.includes(GLOBSTAR);
}
exports.hasGlobStar = hasGlobStar;
function endsWithSlashGlobStar(pattern) {
    return pattern.endsWith('/' + GLOBSTAR);
}
exports.endsWithSlashGlobStar = endsWithSlashGlobStar;
function isAffectDepthOfReadingPattern(pattern) {
    const basename = path.basename(pattern);
    return endsWithSlashGlobStar(pattern) || isStaticPattern(basename);
}
exports.isAffectDepthOfReadingPattern = isAffectDepthOfReadingPattern;
function expandPatternsWithBraceExpansion(patterns) {
    return patterns.reduce((collection, pattern) => {
        return collection.concat(expandBraceExpansion(pattern));
    }, []);
}
exports.expandPatternsWithBraceExpansion = expandPatternsWithBraceExpansion;
function expandBraceExpansion(pattern) {
    const patterns = micromatch.braces(pattern, { expand: true, nodupes: true, keepEscaping: true });
    /**
     * Sort the patterns by length so that the same depth patterns are processed side by side.
     * `a/{b,}/{c,}/*` – `['a///*', 'a/b//*', 'a//c/*', 'a/b/c/*']`
     */
    patterns.sort((a, b) => a.length - b.length);
    /**
     * Micromatch can return an empty string in the case of patterns like `{a,}`.
     */
    return patterns.filter((pattern) => pattern !== '');
}
exports.expandBraceExpansion = expandBraceExpansion;
function getPatternParts(pattern, options) {
    let { parts } = micromatch.scan(pattern, Object.assign(Object.assign({}, options), { parts: true }));
    /**
     * The scan method returns an empty array in some cases.
     * See micromatch/picomatch#58 for more details.
     */
    if (parts.length === 0) {
        parts = [pattern];
    }
    /**
     * The scan method does not return an empty part for the pattern with a forward slash.
     * This is another part of micromatch/picomatch#58.
     */
    if (parts[0].startsWith('/')) {
        parts[0] = parts[0].slice(1);
        parts.unshift('');
    }
    return parts;
}
exports.getPatternParts = getPatternParts;
function makeRe(pattern, options) {
    return micromatch.makeRe(pattern, options);
}
exports.makeRe = makeRe;
function convertPatternsToRe(patterns, options) {
    return patterns.map((pattern) => makeRe(pattern, options));
}
exports.convertPatternsToRe = convertPatternsToRe;
function matchAny(entry, patternsRe) {
    return patternsRe.some((patternRe) => patternRe.test(entry));
}
exports.matchAny = matchAny;
/**
 * This package only works with forward slashes as a path separator.
 * Because of this, we cannot use the standard `path.normalize` method, because on Windows platform it will use of backslashes.
 */
function removeDuplicateSlashes(pattern) {
    return pattern.replace(DOUBLE_SLASH_RE, '/');
}
exports.removeDuplicateSlashes = removeDuplicateSlashes;
function partitionAbsoluteAndRelative(patterns) {
    const absolute = [];
    const relative = [];
    for (const pattern of patterns) {
        if (isAbsolute(pattern)) {
            absolute.push(pattern);
        }
        else {
            relative.push(pattern);
        }
    }
    return [absolute, relative];
}
exports.partitionAbsoluteAndRelative = partitionAbsoluteAndRelative;
function isAbsolute(pattern) {
    return path.isAbsolute(pattern);
}
exports.isAbsolute = isAbsolute;


/***/ }),

/***/ 82931:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.merge = void 0;
const merge2 = __webpack_require__(43987);
function merge(streams) {
    const mergedStream = merge2(streams);
    streams.forEach((stream) => {
        stream.once('error', (error) => mergedStream.emit('error', error));
    });
    mergedStream.once('close', () => propagateCloseEventToSources(streams));
    mergedStream.once('end', () => propagateCloseEventToSources(streams));
    return mergedStream;
}
exports.merge = merge;
function propagateCloseEventToSources(streams) {
    streams.forEach((stream) => stream.emit('close'));
}


/***/ }),

/***/ 48950:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isEmpty = exports.isString = void 0;
function isString(input) {
    return typeof input === 'string';
}
exports.isString = isString;
function isEmpty(input) {
    return input === '';
}
exports.isEmpty = isEmpty;


/***/ }),

/***/ 56198:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*!
 * fill-range <https://github.com/jonschlinkert/fill-range>
 *
 * Copyright (c) 2014-present, Jon Schlinkert.
 * Licensed under the MIT License.
 */



const util = __webpack_require__(39023);
const toRegexRange = __webpack_require__(29947);

const isObject = val => val !== null && typeof val === 'object' && !Array.isArray(val);

const transform = toNumber => {
  return value => toNumber === true ? Number(value) : String(value);
};

const isValidValue = value => {
  return typeof value === 'number' || (typeof value === 'string' && value !== '');
};

const isNumber = num => Number.isInteger(+num);

const zeros = input => {
  let value = `${input}`;
  let index = -1;
  if (value[0] === '-') value = value.slice(1);
  if (value === '0') return false;
  while (value[++index] === '0');
  return index > 0;
};

const stringify = (start, end, options) => {
  if (typeof start === 'string' || typeof end === 'string') {
    return true;
  }
  return options.stringify === true;
};

const pad = (input, maxLength, toNumber) => {
  if (maxLength > 0) {
    let dash = input[0] === '-' ? '-' : '';
    if (dash) input = input.slice(1);
    input = (dash + input.padStart(dash ? maxLength - 1 : maxLength, '0'));
  }
  if (toNumber === false) {
    return String(input);
  }
  return input;
};

const toMaxLen = (input, maxLength) => {
  let negative = input[0] === '-' ? '-' : '';
  if (negative) {
    input = input.slice(1);
    maxLength--;
  }
  while (input.length < maxLength) input = '0' + input;
  return negative ? ('-' + input) : input;
};

const toSequence = (parts, options, maxLen) => {
  parts.negatives.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  parts.positives.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

  let prefix = options.capture ? '' : '?:';
  let positives = '';
  let negatives = '';
  let result;

  if (parts.positives.length) {
    positives = parts.positives.map(v => toMaxLen(String(v), maxLen)).join('|');
  }

  if (parts.negatives.length) {
    negatives = `-(${prefix}${parts.negatives.map(v => toMaxLen(String(v), maxLen)).join('|')})`;
  }

  if (positives && negatives) {
    result = `${positives}|${negatives}`;
  } else {
    result = positives || negatives;
  }

  if (options.wrap) {
    return `(${prefix}${result})`;
  }

  return result;
};

const toRange = (a, b, isNumbers, options) => {
  if (isNumbers) {
    return toRegexRange(a, b, { wrap: false, ...options });
  }

  let start = String.fromCharCode(a);
  if (a === b) return start;

  let stop = String.fromCharCode(b);
  return `[${start}-${stop}]`;
};

const toRegex = (start, end, options) => {
  if (Array.isArray(start)) {
    let wrap = options.wrap === true;
    let prefix = options.capture ? '' : '?:';
    return wrap ? `(${prefix}${start.join('|')})` : start.join('|');
  }
  return toRegexRange(start, end, options);
};

const rangeError = (...args) => {
  return new RangeError('Invalid range arguments: ' + util.inspect(...args));
};

const invalidRange = (start, end, options) => {
  if (options.strictRanges === true) throw rangeError([start, end]);
  return [];
};

const invalidStep = (step, options) => {
  if (options.strictRanges === true) {
    throw new TypeError(`Expected step "${step}" to be a number`);
  }
  return [];
};

const fillNumbers = (start, end, step = 1, options = {}) => {
  let a = Number(start);
  let b = Number(end);

  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    if (options.strictRanges === true) throw rangeError([start, end]);
    return [];
  }

  // fix negative zero
  if (a === 0) a = 0;
  if (b === 0) b = 0;

  let descending = a > b;
  let startString = String(start);
  let endString = String(end);
  let stepString = String(step);
  step = Math.max(Math.abs(step), 1);

  let padded = zeros(startString) || zeros(endString) || zeros(stepString);
  let maxLen = padded ? Math.max(startString.length, endString.length, stepString.length) : 0;
  let toNumber = padded === false && stringify(start, end, options) === false;
  let format = options.transform || transform(toNumber);

  if (options.toRegex && step === 1) {
    return toRange(toMaxLen(start, maxLen), toMaxLen(end, maxLen), true, options);
  }

  let parts = { negatives: [], positives: [] };
  let push = num => parts[num < 0 ? 'negatives' : 'positives'].push(Math.abs(num));
  let range = [];
  let index = 0;

  while (descending ? a >= b : a <= b) {
    if (options.toRegex === true && step > 1) {
      push(a);
    } else {
      range.push(pad(format(a, index), maxLen, toNumber));
    }
    a = descending ? a - step : a + step;
    index++;
  }

  if (options.toRegex === true) {
    return step > 1
      ? toSequence(parts, options, maxLen)
      : toRegex(range, null, { wrap: false, ...options });
  }

  return range;
};

const fillLetters = (start, end, step = 1, options = {}) => {
  if ((!isNumber(start) && start.length > 1) || (!isNumber(end) && end.length > 1)) {
    return invalidRange(start, end, options);
  }

  let format = options.transform || (val => String.fromCharCode(val));
  let a = `${start}`.charCodeAt(0);
  let b = `${end}`.charCodeAt(0);

  let descending = a > b;
  let min = Math.min(a, b);
  let max = Math.max(a, b);

  if (options.toRegex && step === 1) {
    return toRange(min, max, false, options);
  }

  let range = [];
  let index = 0;

  while (descending ? a >= b : a <= b) {
    range.push(format(a, index));
    a = descending ? a - step : a + step;
    index++;
  }

  if (options.toRegex === true) {
    return toRegex(range, null, { wrap: false, options });
  }

  return range;
};

const fill = (start, end, step, options = {}) => {
  if (end == null && isValidValue(start)) {
    return [start];
  }

  if (!isValidValue(start) || !isValidValue(end)) {
    return invalidRange(start, end, options);
  }

  if (typeof step === 'function') {
    return fill(start, end, 1, { transform: step });
  }

  if (isObject(step)) {
    return fill(start, end, 0, step);
  }

  let opts = { ...options };
  if (opts.capture === true) opts.wrap = true;
  step = step || opts.step || 1;

  if (!isNumber(step)) {
    if (step != null && !isObject(step)) return invalidStep(step, opts);
    return fill(start, end, 1, step);
  }

  if (isNumber(start) && isNumber(end)) {
    return fillNumbers(start, end, step, opts);
  }

  return fillLetters(start, end, Math.max(Math.abs(step), 1), opts);
};

module.exports = fill;


/***/ }),

/***/ 71511:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var isGlob = __webpack_require__(76722);
var pathPosixDirname = (__webpack_require__(16928).posix).dirname;
var isWin32 = (__webpack_require__(70857).platform)() === 'win32';

var slash = '/';
var backslash = /\\/g;
var enclosure = /[\{\[].*[\}\]]$/;
var globby = /(^|[^\\])([\{\[]|\([^\)]+$)/;
var escaped = /\\([\!\*\?\|\[\]\(\)\{\}])/g;

/**
 * @param {string} str
 * @param {Object} opts
 * @param {boolean} [opts.flipBackslashes=true]
 * @returns {string}
 */
module.exports = function globParent(str, opts) {
  var options = Object.assign({ flipBackslashes: true }, opts);

  // flip windows path separators
  if (options.flipBackslashes && isWin32 && str.indexOf(slash) < 0) {
    str = str.replace(backslash, slash);
  }

  // special case for strings ending in enclosure containing path separator
  if (enclosure.test(str)) {
    str += slash;
  }

  // preserves full path in case of trailing path separator
  str += 'a';

  // remove path parts that are globby
  do {
    str = pathPosixDirname(str);
  } while (isGlob(str) || globby.test(str));

  // remove escape chars and return result
  return str.replace(escaped, '$1');
};


/***/ }),

/***/ 95677:
/***/ ((module) => {

/*!
 * is-extglob <https://github.com/jonschlinkert/is-extglob>
 *
 * Copyright (c) 2014-2016, Jon Schlinkert.
 * Licensed under the MIT License.
 */

module.exports = function isExtglob(str) {
  if (typeof str !== 'string' || str === '') {
    return false;
  }

  var match;
  while ((match = /(\\).|([@?!+*]\(.*\))/g.exec(str))) {
    if (match[2]) return true;
    str = str.slice(match.index + match[0].length);
  }

  return false;
};


/***/ }),

/***/ 76722:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*!
 * is-glob <https://github.com/jonschlinkert/is-glob>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */

var isExtglob = __webpack_require__(95677);
var chars = { '{': '}', '(': ')', '[': ']'};
var strictCheck = function(str) {
  if (str[0] === '!') {
    return true;
  }
  var index = 0;
  var pipeIndex = -2;
  var closeSquareIndex = -2;
  var closeCurlyIndex = -2;
  var closeParenIndex = -2;
  var backSlashIndex = -2;
  while (index < str.length) {
    if (str[index] === '*') {
      return true;
    }

    if (str[index + 1] === '?' && /[\].+)]/.test(str[index])) {
      return true;
    }

    if (closeSquareIndex !== -1 && str[index] === '[' && str[index + 1] !== ']') {
      if (closeSquareIndex < index) {
        closeSquareIndex = str.indexOf(']', index);
      }
      if (closeSquareIndex > index) {
        if (backSlashIndex === -1 || backSlashIndex > closeSquareIndex) {
          return true;
        }
        backSlashIndex = str.indexOf('\\', index);
        if (backSlashIndex === -1 || backSlashIndex > closeSquareIndex) {
          return true;
        }
      }
    }

    if (closeCurlyIndex !== -1 && str[index] === '{' && str[index + 1] !== '}') {
      closeCurlyIndex = str.indexOf('}', index);
      if (closeCurlyIndex > index) {
        backSlashIndex = str.indexOf('\\', index);
        if (backSlashIndex === -1 || backSlashIndex > closeCurlyIndex) {
          return true;
        }
      }
    }

    if (closeParenIndex !== -1 && str[index] === '(' && str[index + 1] === '?' && /[:!=]/.test(str[index + 2]) && str[index + 3] !== ')') {
      closeParenIndex = str.indexOf(')', index);
      if (closeParenIndex > index) {
        backSlashIndex = str.indexOf('\\', index);
        if (backSlashIndex === -1 || backSlashIndex > closeParenIndex) {
          return true;
        }
      }
    }

    if (pipeIndex !== -1 && str[index] === '(' && str[index + 1] !== '|') {
      if (pipeIndex < index) {
        pipeIndex = str.indexOf('|', index);
      }
      if (pipeIndex !== -1 && str[pipeIndex + 1] !== ')') {
        closeParenIndex = str.indexOf(')', pipeIndex);
        if (closeParenIndex > pipeIndex) {
          backSlashIndex = str.indexOf('\\', pipeIndex);
          if (backSlashIndex === -1 || backSlashIndex > closeParenIndex) {
            return true;
          }
        }
      }
    }

    if (str[index] === '\\') {
      var open = str[index + 1];
      index += 2;
      var close = chars[open];

      if (close) {
        var n = str.indexOf(close, index);
        if (n !== -1) {
          index = n + 1;
        }
      }

      if (str[index] === '!') {
        return true;
      }
    } else {
      index++;
    }
  }
  return false;
};

var relaxedCheck = function(str) {
  if (str[0] === '!') {
    return true;
  }
  var index = 0;
  while (index < str.length) {
    if (/[*?{}()[\]]/.test(str[index])) {
      return true;
    }

    if (str[index] === '\\') {
      var open = str[index + 1];
      index += 2;
      var close = chars[open];

      if (close) {
        var n = str.indexOf(close, index);
        if (n !== -1) {
          index = n + 1;
        }
      }

      if (str[index] === '!') {
        return true;
      }
    } else {
      index++;
    }
  }
  return false;
};

module.exports = function isGlob(str, options) {
  if (typeof str !== 'string' || str === '') {
    return false;
  }

  if (isExtglob(str)) {
    return true;
  }

  var check = strictCheck;

  // optionally relax check
  if (options && options.strict === false) {
    check = relaxedCheck;
  }

  return check(str);
};


/***/ }),

/***/ 29068:
/***/ ((module) => {

/*!
 * is-number <https://github.com/jonschlinkert/is-number>
 *
 * Copyright (c) 2014-present, Jon Schlinkert.
 * Released under the MIT License.
 */



module.exports = function(num) {
  if (typeof num === 'number') {
    return num - num === 0;
  }
  if (typeof num === 'string' && num.trim() !== '') {
    return Number.isFinite ? Number.isFinite(+num) : isFinite(+num);
  }
  return false;
};


/***/ }),

/***/ 43987:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


/*
 * merge2
 * https://github.com/teambition/merge2
 *
 * Copyright (c) 2014-2020 Teambition
 * Licensed under the MIT license.
 */
const Stream = __webpack_require__(2203)
const PassThrough = Stream.PassThrough
const slice = Array.prototype.slice

module.exports = merge2

function merge2 () {
  const streamsQueue = []
  const args = slice.call(arguments)
  let merging = false
  let options = args[args.length - 1]

  if (options && !Array.isArray(options) && options.pipe == null) {
    args.pop()
  } else {
    options = {}
  }

  const doEnd = options.end !== false
  const doPipeError = options.pipeError === true
  if (options.objectMode == null) {
    options.objectMode = true
  }
  if (options.highWaterMark == null) {
    options.highWaterMark = 64 * 1024
  }
  const mergedStream = PassThrough(options)

  function addStream () {
    for (let i = 0, len = arguments.length; i < len; i++) {
      streamsQueue.push(pauseStreams(arguments[i], options))
    }
    mergeStream()
    return this
  }

  function mergeStream () {
    if (merging) {
      return
    }
    merging = true

    let streams = streamsQueue.shift()
    if (!streams) {
      process.nextTick(endStream)
      return
    }
    if (!Array.isArray(streams)) {
      streams = [streams]
    }

    let pipesCount = streams.length + 1

    function next () {
      if (--pipesCount > 0) {
        return
      }
      merging = false
      mergeStream()
    }

    function pipe (stream) {
      function onend () {
        stream.removeListener('merge2UnpipeEnd', onend)
        stream.removeListener('end', onend)
        if (doPipeError) {
          stream.removeListener('error', onerror)
        }
        next()
      }
      function onerror (err) {
        mergedStream.emit('error', err)
      }
      // skip ended stream
      if (stream._readableState.endEmitted) {
        return next()
      }

      stream.on('merge2UnpipeEnd', onend)
      stream.on('end', onend)

      if (doPipeError) {
        stream.on('error', onerror)
      }

      stream.pipe(mergedStream, { end: false })
      // compatible for old stream
      stream.resume()
    }

    for (let i = 0; i < streams.length; i++) {
      pipe(streams[i])
    }

    next()
  }

  function endStream () {
    merging = false
    // emit 'queueDrain' when all streams merged.
    mergedStream.emit('queueDrain')
    if (doEnd) {
      mergedStream.end()
    }
  }

  mergedStream.setMaxListeners(0)
  mergedStream.add = addStream
  mergedStream.on('unpipe', function (stream) {
    stream.emit('merge2UnpipeEnd')
  })

  if (args.length) {
    addStream.apply(null, args)
  }
  return mergedStream
}

// check and pause streams for pipe.
function pauseStreams (streams, options) {
  if (!Array.isArray(streams)) {
    // Backwards-compat with old-style streams
    if (!streams._readableState && streams.pipe) {
      streams = streams.pipe(PassThrough(options))
    }
    if (!streams._readableState || !streams.pause || !streams.pipe) {
      throw new Error('Only readable stream can be merged.')
    }
    streams.pause()
  } else {
    for (let i = 0, len = streams.length; i < len; i++) {
      streams[i] = pauseStreams(streams[i], options)
    }
  }
  return streams
}


/***/ }),

/***/ 13095:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const util = __webpack_require__(39023);
const braces = __webpack_require__(37227);
const picomatch = __webpack_require__(39623);
const utils = __webpack_require__(98178);

const isEmptyString = v => v === '' || v === './';
const hasBraces = v => {
  const index = v.indexOf('{');
  return index > -1 && v.indexOf('}', index) > -1;
};

/**
 * Returns an array of strings that match one or more glob patterns.
 *
 * ```js
 * const mm = require('micromatch');
 * // mm(list, patterns[, options]);
 *
 * console.log(mm(['a.js', 'a.txt'], ['*.js']));
 * //=> [ 'a.js' ]
 * ```
 * @param {String|Array<string>} `list` List of strings to match.
 * @param {String|Array<string>} `patterns` One or more glob patterns to use for matching.
 * @param {Object} `options` See available [options](#options)
 * @return {Array} Returns an array of matches
 * @summary false
 * @api public
 */

const micromatch = (list, patterns, options) => {
  patterns = [].concat(patterns);
  list = [].concat(list);

  let omit = new Set();
  let keep = new Set();
  let items = new Set();
  let negatives = 0;

  let onResult = state => {
    items.add(state.output);
    if (options && options.onResult) {
      options.onResult(state);
    }
  };

  for (let i = 0; i < patterns.length; i++) {
    let isMatch = picomatch(String(patterns[i]), { ...options, onResult }, true);
    let negated = isMatch.state.negated || isMatch.state.negatedExtglob;
    if (negated) negatives++;

    for (let item of list) {
      let matched = isMatch(item, true);

      let match = negated ? !matched.isMatch : matched.isMatch;
      if (!match) continue;

      if (negated) {
        omit.add(matched.output);
      } else {
        omit.delete(matched.output);
        keep.add(matched.output);
      }
    }
  }

  let result = negatives === patterns.length ? [...items] : [...keep];
  let matches = result.filter(item => !omit.has(item));

  if (options && matches.length === 0) {
    if (options.failglob === true) {
      throw new Error(`No matches found for "${patterns.join(', ')}"`);
    }

    if (options.nonull === true || options.nullglob === true) {
      return options.unescape ? patterns.map(p => p.replace(/\\/g, '')) : patterns;
    }
  }

  return matches;
};

/**
 * Backwards compatibility
 */

micromatch.match = micromatch;

/**
 * Returns a matcher function from the given glob `pattern` and `options`.
 * The returned function takes a string to match as its only argument and returns
 * true if the string is a match.
 *
 * ```js
 * const mm = require('micromatch');
 * // mm.matcher(pattern[, options]);
 *
 * const isMatch = mm.matcher('*.!(*a)');
 * console.log(isMatch('a.a')); //=> false
 * console.log(isMatch('a.b')); //=> true
 * ```
 * @param {String} `pattern` Glob pattern
 * @param {Object} `options`
 * @return {Function} Returns a matcher function.
 * @api public
 */

micromatch.matcher = (pattern, options) => picomatch(pattern, options);

/**
 * Returns true if **any** of the given glob `patterns` match the specified `string`.
 *
 * ```js
 * const mm = require('micromatch');
 * // mm.isMatch(string, patterns[, options]);
 *
 * console.log(mm.isMatch('a.a', ['b.*', '*.a'])); //=> true
 * console.log(mm.isMatch('a.a', 'b.*')); //=> false
 * ```
 * @param {String} `str` The string to test.
 * @param {String|Array} `patterns` One or more glob patterns to use for matching.
 * @param {Object} `[options]` See available [options](#options).
 * @return {Boolean} Returns true if any patterns match `str`
 * @api public
 */

micromatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);

/**
 * Backwards compatibility
 */

micromatch.any = micromatch.isMatch;

/**
 * Returns a list of strings that _**do not match any**_ of the given `patterns`.
 *
 * ```js
 * const mm = require('micromatch');
 * // mm.not(list, patterns[, options]);
 *
 * console.log(mm.not(['a.a', 'b.b', 'c.c'], '*.a'));
 * //=> ['b.b', 'c.c']
 * ```
 * @param {Array} `list` Array of strings to match.
 * @param {String|Array} `patterns` One or more glob pattern to use for matching.
 * @param {Object} `options` See available [options](#options) for changing how matches are performed
 * @return {Array} Returns an array of strings that **do not match** the given patterns.
 * @api public
 */

micromatch.not = (list, patterns, options = {}) => {
  patterns = [].concat(patterns).map(String);
  let result = new Set();
  let items = [];

  let onResult = state => {
    if (options.onResult) options.onResult(state);
    items.push(state.output);
  };

  let matches = new Set(micromatch(list, patterns, { ...options, onResult }));

  for (let item of items) {
    if (!matches.has(item)) {
      result.add(item);
    }
  }
  return [...result];
};

/**
 * Returns true if the given `string` contains the given pattern. Similar
 * to [.isMatch](#isMatch) but the pattern can match any part of the string.
 *
 * ```js
 * var mm = require('micromatch');
 * // mm.contains(string, pattern[, options]);
 *
 * console.log(mm.contains('aa/bb/cc', '*b'));
 * //=> true
 * console.log(mm.contains('aa/bb/cc', '*d'));
 * //=> false
 * ```
 * @param {String} `str` The string to match.
 * @param {String|Array} `patterns` Glob pattern to use for matching.
 * @param {Object} `options` See available [options](#options) for changing how matches are performed
 * @return {Boolean} Returns true if any of the patterns matches any part of `str`.
 * @api public
 */

micromatch.contains = (str, pattern, options) => {
  if (typeof str !== 'string') {
    throw new TypeError(`Expected a string: "${util.inspect(str)}"`);
  }

  if (Array.isArray(pattern)) {
    return pattern.some(p => micromatch.contains(str, p, options));
  }

  if (typeof pattern === 'string') {
    if (isEmptyString(str) || isEmptyString(pattern)) {
      return false;
    }

    if (str.includes(pattern) || (str.startsWith('./') && str.slice(2).includes(pattern))) {
      return true;
    }
  }

  return micromatch.isMatch(str, pattern, { ...options, contains: true });
};

/**
 * Filter the keys of the given object with the given `glob` pattern
 * and `options`. Does not attempt to match nested keys. If you need this feature,
 * use [glob-object][] instead.
 *
 * ```js
 * const mm = require('micromatch');
 * // mm.matchKeys(object, patterns[, options]);
 *
 * const obj = { aa: 'a', ab: 'b', ac: 'c' };
 * console.log(mm.matchKeys(obj, '*b'));
 * //=> { ab: 'b' }
 * ```
 * @param {Object} `object` The object with keys to filter.
 * @param {String|Array} `patterns` One or more glob patterns to use for matching.
 * @param {Object} `options` See available [options](#options) for changing how matches are performed
 * @return {Object} Returns an object with only keys that match the given patterns.
 * @api public
 */

micromatch.matchKeys = (obj, patterns, options) => {
  if (!utils.isObject(obj)) {
    throw new TypeError('Expected the first argument to be an object');
  }
  let keys = micromatch(Object.keys(obj), patterns, options);
  let res = {};
  for (let key of keys) res[key] = obj[key];
  return res;
};

/**
 * Returns true if some of the strings in the given `list` match any of the given glob `patterns`.
 *
 * ```js
 * const mm = require('micromatch');
 * // mm.some(list, patterns[, options]);
 *
 * console.log(mm.some(['foo.js', 'bar.js'], ['*.js', '!foo.js']));
 * // true
 * console.log(mm.some(['foo.js'], ['*.js', '!foo.js']));
 * // false
 * ```
 * @param {String|Array} `list` The string or array of strings to test. Returns as soon as the first match is found.
 * @param {String|Array} `patterns` One or more glob patterns to use for matching.
 * @param {Object} `options` See available [options](#options) for changing how matches are performed
 * @return {Boolean} Returns true if any `patterns` matches any of the strings in `list`
 * @api public
 */

micromatch.some = (list, patterns, options) => {
  let items = [].concat(list);

  for (let pattern of [].concat(patterns)) {
    let isMatch = picomatch(String(pattern), options);
    if (items.some(item => isMatch(item))) {
      return true;
    }
  }
  return false;
};

/**
 * Returns true if every string in the given `list` matches
 * any of the given glob `patterns`.
 *
 * ```js
 * const mm = require('micromatch');
 * // mm.every(list, patterns[, options]);
 *
 * console.log(mm.every('foo.js', ['foo.js']));
 * // true
 * console.log(mm.every(['foo.js', 'bar.js'], ['*.js']));
 * // true
 * console.log(mm.every(['foo.js', 'bar.js'], ['*.js', '!foo.js']));
 * // false
 * console.log(mm.every(['foo.js'], ['*.js', '!foo.js']));
 * // false
 * ```
 * @param {String|Array} `list` The string or array of strings to test.
 * @param {String|Array} `patterns` One or more glob patterns to use for matching.
 * @param {Object} `options` See available [options](#options) for changing how matches are performed
 * @return {Boolean} Returns true if all `patterns` matches all of the strings in `list`
 * @api public
 */

micromatch.every = (list, patterns, options) => {
  let items = [].concat(list);

  for (let pattern of [].concat(patterns)) {
    let isMatch = picomatch(String(pattern), options);
    if (!items.every(item => isMatch(item))) {
      return false;
    }
  }
  return true;
};

/**
 * Returns true if **all** of the given `patterns` match
 * the specified string.
 *
 * ```js
 * const mm = require('micromatch');
 * // mm.all(string, patterns[, options]);
 *
 * console.log(mm.all('foo.js', ['foo.js']));
 * // true
 *
 * console.log(mm.all('foo.js', ['*.js', '!foo.js']));
 * // false
 *
 * console.log(mm.all('foo.js', ['*.js', 'foo.js']));
 * // true
 *
 * console.log(mm.all('foo.js', ['*.js', 'f*', '*o*', '*o.js']));
 * // true
 * ```
 * @param {String|Array} `str` The string to test.
 * @param {String|Array} `patterns` One or more glob patterns to use for matching.
 * @param {Object} `options` See available [options](#options) for changing how matches are performed
 * @return {Boolean} Returns true if any patterns match `str`
 * @api public
 */

micromatch.all = (str, patterns, options) => {
  if (typeof str !== 'string') {
    throw new TypeError(`Expected a string: "${util.inspect(str)}"`);
  }

  return [].concat(patterns).every(p => picomatch(p, options)(str));
};

/**
 * Returns an array of matches captured by `pattern` in `string, or `null` if the pattern did not match.
 *
 * ```js
 * const mm = require('micromatch');
 * // mm.capture(pattern, string[, options]);
 *
 * console.log(mm.capture('test/*.js', 'test/foo.js'));
 * //=> ['foo']
 * console.log(mm.capture('test/*.js', 'foo/bar.css'));
 * //=> null
 * ```
 * @param {String} `glob` Glob pattern to use for matching.
 * @param {String} `input` String to match
 * @param {Object} `options` See available [options](#options) for changing how matches are performed
 * @return {Array|null} Returns an array of captures if the input matches the glob pattern, otherwise `null`.
 * @api public
 */

micromatch.capture = (glob, input, options) => {
  let posix = utils.isWindows(options);
  let regex = picomatch.makeRe(String(glob), { ...options, capture: true });
  let match = regex.exec(posix ? utils.toPosixSlashes(input) : input);

  if (match) {
    return match.slice(1).map(v => v === void 0 ? '' : v);
  }
};

/**
 * Create a regular expression from the given glob `pattern`.
 *
 * ```js
 * const mm = require('micromatch');
 * // mm.makeRe(pattern[, options]);
 *
 * console.log(mm.makeRe('*.js'));
 * //=> /^(?:(\.[\\\/])?(?!\.)(?=.)[^\/]*?\.js)$/
 * ```
 * @param {String} `pattern` A glob pattern to convert to regex.
 * @param {Object} `options`
 * @return {RegExp} Returns a regex created from the given pattern.
 * @api public
 */

micromatch.makeRe = (...args) => picomatch.makeRe(...args);

/**
 * Scan a glob pattern to separate the pattern into segments. Used
 * by the [split](#split) method.
 *
 * ```js
 * const mm = require('micromatch');
 * const state = mm.scan(pattern[, options]);
 * ```
 * @param {String} `pattern`
 * @param {Object} `options`
 * @return {Object} Returns an object with
 * @api public
 */

micromatch.scan = (...args) => picomatch.scan(...args);

/**
 * Parse a glob pattern to create the source string for a regular
 * expression.
 *
 * ```js
 * const mm = require('micromatch');
 * const state = mm.parse(pattern[, options]);
 * ```
 * @param {String} `glob`
 * @param {Object} `options`
 * @return {Object} Returns an object with useful properties and output to be used as regex source string.
 * @api public
 */

micromatch.parse = (patterns, options) => {
  let res = [];
  for (let pattern of [].concat(patterns || [])) {
    for (let str of braces(String(pattern), options)) {
      res.push(picomatch.parse(str, options));
    }
  }
  return res;
};

/**
 * Process the given brace `pattern`.
 *
 * ```js
 * const { braces } = require('micromatch');
 * console.log(braces('foo/{a,b,c}/bar'));
 * //=> [ 'foo/(a|b|c)/bar' ]
 *
 * console.log(braces('foo/{a,b,c}/bar', { expand: true }));
 * //=> [ 'foo/a/bar', 'foo/b/bar', 'foo/c/bar' ]
 * ```
 * @param {String} `pattern` String with brace pattern to process.
 * @param {Object} `options` Any [options](#options) to change how expansion is performed. See the [braces][] library for all available options.
 * @return {Array}
 * @api public
 */

micromatch.braces = (pattern, options) => {
  if (typeof pattern !== 'string') throw new TypeError('Expected a string');
  if ((options && options.nobrace === true) || !hasBraces(pattern)) {
    return [pattern];
  }
  return braces(pattern, options);
};

/**
 * Expand braces
 */

micromatch.braceExpand = (pattern, options) => {
  if (typeof pattern !== 'string') throw new TypeError('Expected a string');
  return micromatch.braces(pattern, { ...options, expand: true });
};

/**
 * Expose micromatch
 */

// exposed for tests
micromatch.hasBraces = hasBraces;
module.exports = micromatch;


/***/ }),

/***/ 39623:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



module.exports = __webpack_require__(62661);


/***/ }),

/***/ 78554:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const path = __webpack_require__(16928);
const WIN_SLASH = '\\\\/';
const WIN_NO_SLASH = `[^${WIN_SLASH}]`;

/**
 * Posix glob regex
 */

const DOT_LITERAL = '\\.';
const PLUS_LITERAL = '\\+';
const QMARK_LITERAL = '\\?';
const SLASH_LITERAL = '\\/';
const ONE_CHAR = '(?=.)';
const QMARK = '[^/]';
const END_ANCHOR = `(?:${SLASH_LITERAL}|$)`;
const START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
const DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
const NO_DOT = `(?!${DOT_LITERAL})`;
const NO_DOTS = `(?!${START_ANCHOR}${DOTS_SLASH})`;
const NO_DOT_SLASH = `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`;
const NO_DOTS_SLASH = `(?!${DOTS_SLASH})`;
const QMARK_NO_DOT = `[^.${SLASH_LITERAL}]`;
const STAR = `${QMARK}*?`;

const POSIX_CHARS = {
  DOT_LITERAL,
  PLUS_LITERAL,
  QMARK_LITERAL,
  SLASH_LITERAL,
  ONE_CHAR,
  QMARK,
  END_ANCHOR,
  DOTS_SLASH,
  NO_DOT,
  NO_DOTS,
  NO_DOT_SLASH,
  NO_DOTS_SLASH,
  QMARK_NO_DOT,
  STAR,
  START_ANCHOR
};

/**
 * Windows glob regex
 */

const WINDOWS_CHARS = {
  ...POSIX_CHARS,

  SLASH_LITERAL: `[${WIN_SLASH}]`,
  QMARK: WIN_NO_SLASH,
  STAR: `${WIN_NO_SLASH}*?`,
  DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$)`,
  NO_DOT: `(?!${DOT_LITERAL})`,
  NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
  NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|$))`,
  NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
  QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
  START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
  END_ANCHOR: `(?:[${WIN_SLASH}]|$)`
};

/**
 * POSIX Bracket Regex
 */

const POSIX_REGEX_SOURCE = {
  alnum: 'a-zA-Z0-9',
  alpha: 'a-zA-Z',
  ascii: '\\x00-\\x7F',
  blank: ' \\t',
  cntrl: '\\x00-\\x1F\\x7F',
  digit: '0-9',
  graph: '\\x21-\\x7E',
  lower: 'a-z',
  print: '\\x20-\\x7E ',
  punct: '\\-!"#$%&\'()\\*+,./:;<=>?@[\\]^_`{|}~',
  space: ' \\t\\r\\n\\v\\f',
  upper: 'A-Z',
  word: 'A-Za-z0-9_',
  xdigit: 'A-Fa-f0-9'
};

module.exports = {
  MAX_LENGTH: 1024 * 64,
  POSIX_REGEX_SOURCE,

  // regular expressions
  REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
  REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
  REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
  REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
  REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
  REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,

  // Replace globs with equivalent patterns to reduce parsing time.
  REPLACEMENTS: {
    '***': '*',
    '**/**': '**',
    '**/**/**': '**'
  },

  // Digits
  CHAR_0: 48, /* 0 */
  CHAR_9: 57, /* 9 */

  // Alphabet chars.
  CHAR_UPPERCASE_A: 65, /* A */
  CHAR_LOWERCASE_A: 97, /* a */
  CHAR_UPPERCASE_Z: 90, /* Z */
  CHAR_LOWERCASE_Z: 122, /* z */

  CHAR_LEFT_PARENTHESES: 40, /* ( */
  CHAR_RIGHT_PARENTHESES: 41, /* ) */

  CHAR_ASTERISK: 42, /* * */

  // Non-alphabetic chars.
  CHAR_AMPERSAND: 38, /* & */
  CHAR_AT: 64, /* @ */
  CHAR_BACKWARD_SLASH: 92, /* \ */
  CHAR_CARRIAGE_RETURN: 13, /* \r */
  CHAR_CIRCUMFLEX_ACCENT: 94, /* ^ */
  CHAR_COLON: 58, /* : */
  CHAR_COMMA: 44, /* , */
  CHAR_DOT: 46, /* . */
  CHAR_DOUBLE_QUOTE: 34, /* " */
  CHAR_EQUAL: 61, /* = */
  CHAR_EXCLAMATION_MARK: 33, /* ! */
  CHAR_FORM_FEED: 12, /* \f */
  CHAR_FORWARD_SLASH: 47, /* / */
  CHAR_GRAVE_ACCENT: 96, /* ` */
  CHAR_HASH: 35, /* # */
  CHAR_HYPHEN_MINUS: 45, /* - */
  CHAR_LEFT_ANGLE_BRACKET: 60, /* < */
  CHAR_LEFT_CURLY_BRACE: 123, /* { */
  CHAR_LEFT_SQUARE_BRACKET: 91, /* [ */
  CHAR_LINE_FEED: 10, /* \n */
  CHAR_NO_BREAK_SPACE: 160, /* \u00A0 */
  CHAR_PERCENT: 37, /* % */
  CHAR_PLUS: 43, /* + */
  CHAR_QUESTION_MARK: 63, /* ? */
  CHAR_RIGHT_ANGLE_BRACKET: 62, /* > */
  CHAR_RIGHT_CURLY_BRACE: 125, /* } */
  CHAR_RIGHT_SQUARE_BRACKET: 93, /* ] */
  CHAR_SEMICOLON: 59, /* ; */
  CHAR_SINGLE_QUOTE: 39, /* ' */
  CHAR_SPACE: 32, /*   */
  CHAR_TAB: 9, /* \t */
  CHAR_UNDERSCORE: 95, /* _ */
  CHAR_VERTICAL_LINE: 124, /* | */
  CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279, /* \uFEFF */

  SEP: path.sep,

  /**
   * Create EXTGLOB_CHARS
   */

  extglobChars(chars) {
    return {
      '!': { type: 'negate', open: '(?:(?!(?:', close: `))${chars.STAR})` },
      '?': { type: 'qmark', open: '(?:', close: ')?' },
      '+': { type: 'plus', open: '(?:', close: ')+' },
      '*': { type: 'star', open: '(?:', close: ')*' },
      '@': { type: 'at', open: '(?:', close: ')' }
    };
  },

  /**
   * Create GLOB_CHARS
   */

  globChars(win32) {
    return win32 === true ? WINDOWS_CHARS : POSIX_CHARS;
  }
};


/***/ }),

/***/ 26064:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const constants = __webpack_require__(78554);
const utils = __webpack_require__(98178);

/**
 * Constants
 */

const {
  MAX_LENGTH,
  POSIX_REGEX_SOURCE,
  REGEX_NON_SPECIAL_CHARS,
  REGEX_SPECIAL_CHARS_BACKREF,
  REPLACEMENTS
} = constants;

/**
 * Helpers
 */

const expandRange = (args, options) => {
  if (typeof options.expandRange === 'function') {
    return options.expandRange(...args, options);
  }

  args.sort();
  const value = `[${args.join('-')}]`;

  try {
    /* eslint-disable-next-line no-new */
    new RegExp(value);
  } catch (ex) {
    return args.map(v => utils.escapeRegex(v)).join('..');
  }

  return value;
};

/**
 * Create the message for a syntax error
 */

const syntaxError = (type, char) => {
  return `Missing ${type}: "${char}" - use "\\\\${char}" to match literal characters`;
};

/**
 * Parse the given input string.
 * @param {String} input
 * @param {Object} options
 * @return {Object}
 */

const parse = (input, options) => {
  if (typeof input !== 'string') {
    throw new TypeError('Expected a string');
  }

  input = REPLACEMENTS[input] || input;

  const opts = { ...options };
  const max = typeof opts.maxLength === 'number' ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;

  let len = input.length;
  if (len > max) {
    throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
  }

  const bos = { type: 'bos', value: '', output: opts.prepend || '' };
  const tokens = [bos];

  const capture = opts.capture ? '' : '?:';
  const win32 = utils.isWindows(options);

  // create constants based on platform, for windows or posix
  const PLATFORM_CHARS = constants.globChars(win32);
  const EXTGLOB_CHARS = constants.extglobChars(PLATFORM_CHARS);

  const {
    DOT_LITERAL,
    PLUS_LITERAL,
    SLASH_LITERAL,
    ONE_CHAR,
    DOTS_SLASH,
    NO_DOT,
    NO_DOT_SLASH,
    NO_DOTS_SLASH,
    QMARK,
    QMARK_NO_DOT,
    STAR,
    START_ANCHOR
  } = PLATFORM_CHARS;

  const globstar = opts => {
    return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
  };

  const nodot = opts.dot ? '' : NO_DOT;
  const qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
  let star = opts.bash === true ? globstar(opts) : STAR;

  if (opts.capture) {
    star = `(${star})`;
  }

  // minimatch options support
  if (typeof opts.noext === 'boolean') {
    opts.noextglob = opts.noext;
  }

  const state = {
    input,
    index: -1,
    start: 0,
    dot: opts.dot === true,
    consumed: '',
    output: '',
    prefix: '',
    backtrack: false,
    negated: false,
    brackets: 0,
    braces: 0,
    parens: 0,
    quotes: 0,
    globstar: false,
    tokens
  };

  input = utils.removePrefix(input, state);
  len = input.length;

  const extglobs = [];
  const braces = [];
  const stack = [];
  let prev = bos;
  let value;

  /**
   * Tokenizing helpers
   */

  const eos = () => state.index === len - 1;
  const peek = state.peek = (n = 1) => input[state.index + n];
  const advance = state.advance = () => input[++state.index] || '';
  const remaining = () => input.slice(state.index + 1);
  const consume = (value = '', num = 0) => {
    state.consumed += value;
    state.index += num;
  };

  const append = token => {
    state.output += token.output != null ? token.output : token.value;
    consume(token.value);
  };

  const negate = () => {
    let count = 1;

    while (peek() === '!' && (peek(2) !== '(' || peek(3) === '?')) {
      advance();
      state.start++;
      count++;
    }

    if (count % 2 === 0) {
      return false;
    }

    state.negated = true;
    state.start++;
    return true;
  };

  const increment = type => {
    state[type]++;
    stack.push(type);
  };

  const decrement = type => {
    state[type]--;
    stack.pop();
  };

  /**
   * Push tokens onto the tokens array. This helper speeds up
   * tokenizing by 1) helping us avoid backtracking as much as possible,
   * and 2) helping us avoid creating extra tokens when consecutive
   * characters are plain text. This improves performance and simplifies
   * lookbehinds.
   */

  const push = tok => {
    if (prev.type === 'globstar') {
      const isBrace = state.braces > 0 && (tok.type === 'comma' || tok.type === 'brace');
      const isExtglob = tok.extglob === true || (extglobs.length && (tok.type === 'pipe' || tok.type === 'paren'));

      if (tok.type !== 'slash' && tok.type !== 'paren' && !isBrace && !isExtglob) {
        state.output = state.output.slice(0, -prev.output.length);
        prev.type = 'star';
        prev.value = '*';
        prev.output = star;
        state.output += prev.output;
      }
    }

    if (extglobs.length && tok.type !== 'paren') {
      extglobs[extglobs.length - 1].inner += tok.value;
    }

    if (tok.value || tok.output) append(tok);
    if (prev && prev.type === 'text' && tok.type === 'text') {
      prev.value += tok.value;
      prev.output = (prev.output || '') + tok.value;
      return;
    }

    tok.prev = prev;
    tokens.push(tok);
    prev = tok;
  };

  const extglobOpen = (type, value) => {
    const token = { ...EXTGLOB_CHARS[value], conditions: 1, inner: '' };

    token.prev = prev;
    token.parens = state.parens;
    token.output = state.output;
    const output = (opts.capture ? '(' : '') + token.open;

    increment('parens');
    push({ type, value, output: state.output ? '' : ONE_CHAR });
    push({ type: 'paren', extglob: true, value: advance(), output });
    extglobs.push(token);
  };

  const extglobClose = token => {
    let output = token.close + (opts.capture ? ')' : '');
    let rest;

    if (token.type === 'negate') {
      let extglobStar = star;

      if (token.inner && token.inner.length > 1 && token.inner.includes('/')) {
        extglobStar = globstar(opts);
      }

      if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) {
        output = token.close = `)$))${extglobStar}`;
      }

      if (token.inner.includes('*') && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) {
        // Any non-magical string (`.ts`) or even nested expression (`.{ts,tsx}`) can follow after the closing parenthesis.
        // In this case, we need to parse the string and use it in the output of the original pattern.
        // Suitable patterns: `/!(*.d).ts`, `/!(*.d).{ts,tsx}`, `**/!(*-dbg).@(js)`.
        //
        // Disabling the `fastpaths` option due to a problem with parsing strings as `.ts` in the pattern like `**/!(*.d).ts`.
        const expression = parse(rest, { ...options, fastpaths: false }).output;

        output = token.close = `)${expression})${extglobStar})`;
      }

      if (token.prev.type === 'bos') {
        state.negatedExtglob = true;
      }
    }

    push({ type: 'paren', extglob: true, value, output });
    decrement('parens');
  };

  /**
   * Fast paths
   */

  if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
    let backslashes = false;

    let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => {
      if (first === '\\') {
        backslashes = true;
        return m;
      }

      if (first === '?') {
        if (esc) {
          return esc + first + (rest ? QMARK.repeat(rest.length) : '');
        }
        if (index === 0) {
          return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : '');
        }
        return QMARK.repeat(chars.length);
      }

      if (first === '.') {
        return DOT_LITERAL.repeat(chars.length);
      }

      if (first === '*') {
        if (esc) {
          return esc + first + (rest ? star : '');
        }
        return star;
      }
      return esc ? m : `\\${m}`;
    });

    if (backslashes === true) {
      if (opts.unescape === true) {
        output = output.replace(/\\/g, '');
      } else {
        output = output.replace(/\\+/g, m => {
          return m.length % 2 === 0 ? '\\\\' : (m ? '\\' : '');
        });
      }
    }

    if (output === input && opts.contains === true) {
      state.output = input;
      return state;
    }

    state.output = utils.wrapOutput(output, state, options);
    return state;
  }

  /**
   * Tokenize input until we reach end-of-string
   */

  while (!eos()) {
    value = advance();

    if (value === '\u0000') {
      continue;
    }

    /**
     * Escaped characters
     */

    if (value === '\\') {
      const next = peek();

      if (next === '/' && opts.bash !== true) {
        continue;
      }

      if (next === '.' || next === ';') {
        continue;
      }

      if (!next) {
        value += '\\';
        push({ type: 'text', value });
        continue;
      }

      // collapse slashes to reduce potential for exploits
      const match = /^\\+/.exec(remaining());
      let slashes = 0;

      if (match && match[0].length > 2) {
        slashes = match[0].length;
        state.index += slashes;
        if (slashes % 2 !== 0) {
          value += '\\';
        }
      }

      if (opts.unescape === true) {
        value = advance();
      } else {
        value += advance();
      }

      if (state.brackets === 0) {
        push({ type: 'text', value });
        continue;
      }
    }

    /**
     * If we're inside a regex character class, continue
     * until we reach the closing bracket.
     */

    if (state.brackets > 0 && (value !== ']' || prev.value === '[' || prev.value === '[^')) {
      if (opts.posix !== false && value === ':') {
        const inner = prev.value.slice(1);
        if (inner.includes('[')) {
          prev.posix = true;

          if (inner.includes(':')) {
            const idx = prev.value.lastIndexOf('[');
            const pre = prev.value.slice(0, idx);
            const rest = prev.value.slice(idx + 2);
            const posix = POSIX_REGEX_SOURCE[rest];
            if (posix) {
              prev.value = pre + posix;
              state.backtrack = true;
              advance();

              if (!bos.output && tokens.indexOf(prev) === 1) {
                bos.output = ONE_CHAR;
              }
              continue;
            }
          }
        }
      }

      if ((value === '[' && peek() !== ':') || (value === '-' && peek() === ']')) {
        value = `\\${value}`;
      }

      if (value === ']' && (prev.value === '[' || prev.value === '[^')) {
        value = `\\${value}`;
      }

      if (opts.posix === true && value === '!' && prev.value === '[') {
        value = '^';
      }

      prev.value += value;
      append({ value });
      continue;
    }

    /**
     * If we're inside a quoted string, continue
     * until we reach the closing double quote.
     */

    if (state.quotes === 1 && value !== '"') {
      value = utils.escapeRegex(value);
      prev.value += value;
      append({ value });
      continue;
    }

    /**
     * Double quotes
     */

    if (value === '"') {
      state.quotes = state.quotes === 1 ? 0 : 1;
      if (opts.keepQuotes === true) {
        push({ type: 'text', value });
      }
      continue;
    }

    /**
     * Parentheses
     */

    if (value === '(') {
      increment('parens');
      push({ type: 'paren', value });
      continue;
    }

    if (value === ')') {
      if (state.parens === 0 && opts.strictBrackets === true) {
        throw new SyntaxError(syntaxError('opening', '('));
      }

      const extglob = extglobs[extglobs.length - 1];
      if (extglob && state.parens === extglob.parens + 1) {
        extglobClose(extglobs.pop());
        continue;
      }

      push({ type: 'paren', value, output: state.parens ? ')' : '\\)' });
      decrement('parens');
      continue;
    }

    /**
     * Square brackets
     */

    if (value === '[') {
      if (opts.nobracket === true || !remaining().includes(']')) {
        if (opts.nobracket !== true && opts.strictBrackets === true) {
          throw new SyntaxError(syntaxError('closing', ']'));
        }

        value = `\\${value}`;
      } else {
        increment('brackets');
      }

      push({ type: 'bracket', value });
      continue;
    }

    if (value === ']') {
      if (opts.nobracket === true || (prev && prev.type === 'bracket' && prev.value.length === 1)) {
        push({ type: 'text', value, output: `\\${value}` });
        continue;
      }

      if (state.brackets === 0) {
        if (opts.strictBrackets === true) {
          throw new SyntaxError(syntaxError('opening', '['));
        }

        push({ type: 'text', value, output: `\\${value}` });
        continue;
      }

      decrement('brackets');

      const prevValue = prev.value.slice(1);
      if (prev.posix !== true && prevValue[0] === '^' && !prevValue.includes('/')) {
        value = `/${value}`;
      }

      prev.value += value;
      append({ value });

      // when literal brackets are explicitly disabled
      // assume we should match with a regex character class
      if (opts.literalBrackets === false || utils.hasRegexChars(prevValue)) {
        continue;
      }

      const escaped = utils.escapeRegex(prev.value);
      state.output = state.output.slice(0, -prev.value.length);

      // when literal brackets are explicitly enabled
      // assume we should escape the brackets to match literal characters
      if (opts.literalBrackets === true) {
        state.output += escaped;
        prev.value = escaped;
        continue;
      }

      // when the user specifies nothing, try to match both
      prev.value = `(${capture}${escaped}|${prev.value})`;
      state.output += prev.value;
      continue;
    }

    /**
     * Braces
     */

    if (value === '{' && opts.nobrace !== true) {
      increment('braces');

      const open = {
        type: 'brace',
        value,
        output: '(',
        outputIndex: state.output.length,
        tokensIndex: state.tokens.length
      };

      braces.push(open);
      push(open);
      continue;
    }

    if (value === '}') {
      const brace = braces[braces.length - 1];

      if (opts.nobrace === true || !brace) {
        push({ type: 'text', value, output: value });
        continue;
      }

      let output = ')';

      if (brace.dots === true) {
        const arr = tokens.slice();
        const range = [];

        for (let i = arr.length - 1; i >= 0; i--) {
          tokens.pop();
          if (arr[i].type === 'brace') {
            break;
          }
          if (arr[i].type !== 'dots') {
            range.unshift(arr[i].value);
          }
        }

        output = expandRange(range, opts);
        state.backtrack = true;
      }

      if (brace.comma !== true && brace.dots !== true) {
        const out = state.output.slice(0, brace.outputIndex);
        const toks = state.tokens.slice(brace.tokensIndex);
        brace.value = brace.output = '\\{';
        value = output = '\\}';
        state.output = out;
        for (const t of toks) {
          state.output += (t.output || t.value);
        }
      }

      push({ type: 'brace', value, output });
      decrement('braces');
      braces.pop();
      continue;
    }

    /**
     * Pipes
     */

    if (value === '|') {
      if (extglobs.length > 0) {
        extglobs[extglobs.length - 1].conditions++;
      }
      push({ type: 'text', value });
      continue;
    }

    /**
     * Commas
     */

    if (value === ',') {
      let output = value;

      const brace = braces[braces.length - 1];
      if (brace && stack[stack.length - 1] === 'braces') {
        brace.comma = true;
        output = '|';
      }

      push({ type: 'comma', value, output });
      continue;
    }

    /**
     * Slashes
     */

    if (value === '/') {
      // if the beginning of the glob is "./", advance the start
      // to the current index, and don't add the "./" characters
      // to the state. This greatly simplifies lookbehinds when
      // checking for BOS characters like "!" and "." (not "./")
      if (prev.type === 'dot' && state.index === state.start + 1) {
        state.start = state.index + 1;
        state.consumed = '';
        state.output = '';
        tokens.pop();
        prev = bos; // reset "prev" to the first token
        continue;
      }

      push({ type: 'slash', value, output: SLASH_LITERAL });
      continue;
    }

    /**
     * Dots
     */

    if (value === '.') {
      if (state.braces > 0 && prev.type === 'dot') {
        if (prev.value === '.') prev.output = DOT_LITERAL;
        const brace = braces[braces.length - 1];
        prev.type = 'dots';
        prev.output += value;
        prev.value += value;
        brace.dots = true;
        continue;
      }

      if ((state.braces + state.parens) === 0 && prev.type !== 'bos' && prev.type !== 'slash') {
        push({ type: 'text', value, output: DOT_LITERAL });
        continue;
      }

      push({ type: 'dot', value, output: DOT_LITERAL });
      continue;
    }

    /**
     * Question marks
     */

    if (value === '?') {
      const isGroup = prev && prev.value === '(';
      if (!isGroup && opts.noextglob !== true && peek() === '(' && peek(2) !== '?') {
        extglobOpen('qmark', value);
        continue;
      }

      if (prev && prev.type === 'paren') {
        const next = peek();
        let output = value;

        if (next === '<' && !utils.supportsLookbehinds()) {
          throw new Error('Node.js v10 or higher is required for regex lookbehinds');
        }

        if ((prev.value === '(' && !/[!=<:]/.test(next)) || (next === '<' && !/<([!=]|\w+>)/.test(remaining()))) {
          output = `\\${value}`;
        }

        push({ type: 'text', value, output });
        continue;
      }

      if (opts.dot !== true && (prev.type === 'slash' || prev.type === 'bos')) {
        push({ type: 'qmark', value, output: QMARK_NO_DOT });
        continue;
      }

      push({ type: 'qmark', value, output: QMARK });
      continue;
    }

    /**
     * Exclamation
     */

    if (value === '!') {
      if (opts.noextglob !== true && peek() === '(') {
        if (peek(2) !== '?' || !/[!=<:]/.test(peek(3))) {
          extglobOpen('negate', value);
          continue;
        }
      }

      if (opts.nonegate !== true && state.index === 0) {
        negate();
        continue;
      }
    }

    /**
     * Plus
     */

    if (value === '+') {
      if (opts.noextglob !== true && peek() === '(' && peek(2) !== '?') {
        extglobOpen('plus', value);
        continue;
      }

      if ((prev && prev.value === '(') || opts.regex === false) {
        push({ type: 'plus', value, output: PLUS_LITERAL });
        continue;
      }

      if ((prev && (prev.type === 'bracket' || prev.type === 'paren' || prev.type === 'brace')) || state.parens > 0) {
        push({ type: 'plus', value });
        continue;
      }

      push({ type: 'plus', value: PLUS_LITERAL });
      continue;
    }

    /**
     * Plain text
     */

    if (value === '@') {
      if (opts.noextglob !== true && peek() === '(' && peek(2) !== '?') {
        push({ type: 'at', extglob: true, value, output: '' });
        continue;
      }

      push({ type: 'text', value });
      continue;
    }

    /**
     * Plain text
     */

    if (value !== '*') {
      if (value === '$' || value === '^') {
        value = `\\${value}`;
      }

      const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
      if (match) {
        value += match[0];
        state.index += match[0].length;
      }

      push({ type: 'text', value });
      continue;
    }

    /**
     * Stars
     */

    if (prev && (prev.type === 'globstar' || prev.star === true)) {
      prev.type = 'star';
      prev.star = true;
      prev.value += value;
      prev.output = star;
      state.backtrack = true;
      state.globstar = true;
      consume(value);
      continue;
    }

    let rest = remaining();
    if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
      extglobOpen('star', value);
      continue;
    }

    if (prev.type === 'star') {
      if (opts.noglobstar === true) {
        consume(value);
        continue;
      }

      const prior = prev.prev;
      const before = prior.prev;
      const isStart = prior.type === 'slash' || prior.type === 'bos';
      const afterStar = before && (before.type === 'star' || before.type === 'globstar');

      if (opts.bash === true && (!isStart || (rest[0] && rest[0] !== '/'))) {
        push({ type: 'star', value, output: '' });
        continue;
      }

      const isBrace = state.braces > 0 && (prior.type === 'comma' || prior.type === 'brace');
      const isExtglob = extglobs.length && (prior.type === 'pipe' || prior.type === 'paren');
      if (!isStart && prior.type !== 'paren' && !isBrace && !isExtglob) {
        push({ type: 'star', value, output: '' });
        continue;
      }

      // strip consecutive `/**/`
      while (rest.slice(0, 3) === '/**') {
        const after = input[state.index + 4];
        if (after && after !== '/') {
          break;
        }
        rest = rest.slice(3);
        consume('/**', 3);
      }

      if (prior.type === 'bos' && eos()) {
        prev.type = 'globstar';
        prev.value += value;
        prev.output = globstar(opts);
        state.output = prev.output;
        state.globstar = true;
        consume(value);
        continue;
      }

      if (prior.type === 'slash' && prior.prev.type !== 'bos' && !afterStar && eos()) {
        state.output = state.output.slice(0, -(prior.output + prev.output).length);
        prior.output = `(?:${prior.output}`;

        prev.type = 'globstar';
        prev.output = globstar(opts) + (opts.strictSlashes ? ')' : '|$)');
        prev.value += value;
        state.globstar = true;
        state.output += prior.output + prev.output;
        consume(value);
        continue;
      }

      if (prior.type === 'slash' && prior.prev.type !== 'bos' && rest[0] === '/') {
        const end = rest[1] !== void 0 ? '|$' : '';

        state.output = state.output.slice(0, -(prior.output + prev.output).length);
        prior.output = `(?:${prior.output}`;

        prev.type = 'globstar';
        prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
        prev.value += value;

        state.output += prior.output + prev.output;
        state.globstar = true;

        consume(value + advance());

        push({ type: 'slash', value: '/', output: '' });
        continue;
      }

      if (prior.type === 'bos' && rest[0] === '/') {
        prev.type = 'globstar';
        prev.value += value;
        prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
        state.output = prev.output;
        state.globstar = true;
        consume(value + advance());
        push({ type: 'slash', value: '/', output: '' });
        continue;
      }

      // remove single star from output
      state.output = state.output.slice(0, -prev.output.length);

      // reset previous token to globstar
      prev.type = 'globstar';
      prev.output = globstar(opts);
      prev.value += value;

      // reset output with globstar
      state.output += prev.output;
      state.globstar = true;
      consume(value);
      continue;
    }

    const token = { type: 'star', value, output: star };

    if (opts.bash === true) {
      token.output = '.*?';
      if (prev.type === 'bos' || prev.type === 'slash') {
        token.output = nodot + token.output;
      }
      push(token);
      continue;
    }

    if (prev && (prev.type === 'bracket' || prev.type === 'paren') && opts.regex === true) {
      token.output = value;
      push(token);
      continue;
    }

    if (state.index === state.start || prev.type === 'slash' || prev.type === 'dot') {
      if (prev.type === 'dot') {
        state.output += NO_DOT_SLASH;
        prev.output += NO_DOT_SLASH;

      } else if (opts.dot === true) {
        state.output += NO_DOTS_SLASH;
        prev.output += NO_DOTS_SLASH;

      } else {
        state.output += nodot;
        prev.output += nodot;
      }

      if (peek() !== '*') {
        state.output += ONE_CHAR;
        prev.output += ONE_CHAR;
      }
    }

    push(token);
  }

  while (state.brackets > 0) {
    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError('closing', ']'));
    state.output = utils.escapeLast(state.output, '[');
    decrement('brackets');
  }

  while (state.parens > 0) {
    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError('closing', ')'));
    state.output = utils.escapeLast(state.output, '(');
    decrement('parens');
  }

  while (state.braces > 0) {
    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError('closing', '}'));
    state.output = utils.escapeLast(state.output, '{');
    decrement('braces');
  }

  if (opts.strictSlashes !== true && (prev.type === 'star' || prev.type === 'bracket')) {
    push({ type: 'maybe_slash', value: '', output: `${SLASH_LITERAL}?` });
  }

  // rebuild the output if we had to backtrack at any point
  if (state.backtrack === true) {
    state.output = '';

    for (const token of state.tokens) {
      state.output += token.output != null ? token.output : token.value;

      if (token.suffix) {
        state.output += token.suffix;
      }
    }
  }

  return state;
};

/**
 * Fast paths for creating regular expressions for common glob patterns.
 * This can significantly speed up processing and has very little downside
 * impact when none of the fast paths match.
 */

parse.fastpaths = (input, options) => {
  const opts = { ...options };
  const max = typeof opts.maxLength === 'number' ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
  const len = input.length;
  if (len > max) {
    throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
  }

  input = REPLACEMENTS[input] || input;
  const win32 = utils.isWindows(options);

  // create constants based on platform, for windows or posix
  const {
    DOT_LITERAL,
    SLASH_LITERAL,
    ONE_CHAR,
    DOTS_SLASH,
    NO_DOT,
    NO_DOTS,
    NO_DOTS_SLASH,
    STAR,
    START_ANCHOR
  } = constants.globChars(win32);

  const nodot = opts.dot ? NO_DOTS : NO_DOT;
  const slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
  const capture = opts.capture ? '' : '?:';
  const state = { negated: false, prefix: '' };
  let star = opts.bash === true ? '.*?' : STAR;

  if (opts.capture) {
    star = `(${star})`;
  }

  const globstar = opts => {
    if (opts.noglobstar === true) return star;
    return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
  };

  const create = str => {
    switch (str) {
      case '*':
        return `${nodot}${ONE_CHAR}${star}`;

      case '.*':
        return `${DOT_LITERAL}${ONE_CHAR}${star}`;

      case '*.*':
        return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;

      case '*/*':
        return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;

      case '**':
        return nodot + globstar(opts);

      case '**/*':
        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;

      case '**/*.*':
        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;

      case '**/.*':
        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;

      default: {
        const match = /^(.*?)\.(\w+)$/.exec(str);
        if (!match) return;

        const source = create(match[1]);
        if (!source) return;

        return source + DOT_LITERAL + match[2];
      }
    }
  };

  const output = utils.removePrefix(input, state);
  let source = create(output);

  if (source && opts.strictSlashes !== true) {
    source += `${SLASH_LITERAL}?`;
  }

  return source;
};

module.exports = parse;


/***/ }),

/***/ 62661:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const path = __webpack_require__(16928);
const scan = __webpack_require__(54870);
const parse = __webpack_require__(26064);
const utils = __webpack_require__(98178);
const constants = __webpack_require__(78554);
const isObject = val => val && typeof val === 'object' && !Array.isArray(val);

/**
 * Creates a matcher function from one or more glob patterns. The
 * returned function takes a string to match as its first argument,
 * and returns true if the string is a match. The returned matcher
 * function also takes a boolean as the second argument that, when true,
 * returns an object with additional information.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch(glob[, options]);
 *
 * const isMatch = picomatch('*.!(*a)');
 * console.log(isMatch('a.a')); //=> false
 * console.log(isMatch('a.b')); //=> true
 * ```
 * @name picomatch
 * @param {String|Array} `globs` One or more glob patterns.
 * @param {Object=} `options`
 * @return {Function=} Returns a matcher function.
 * @api public
 */

const picomatch = (glob, options, returnState = false) => {
  if (Array.isArray(glob)) {
    const fns = glob.map(input => picomatch(input, options, returnState));
    const arrayMatcher = str => {
      for (const isMatch of fns) {
        const state = isMatch(str);
        if (state) return state;
      }
      return false;
    };
    return arrayMatcher;
  }

  const isState = isObject(glob) && glob.tokens && glob.input;

  if (glob === '' || (typeof glob !== 'string' && !isState)) {
    throw new TypeError('Expected pattern to be a non-empty string');
  }

  const opts = options || {};
  const posix = utils.isWindows(options);
  const regex = isState
    ? picomatch.compileRe(glob, options)
    : picomatch.makeRe(glob, options, false, true);

  const state = regex.state;
  delete regex.state;

  let isIgnored = () => false;
  if (opts.ignore) {
    const ignoreOpts = { ...options, ignore: null, onMatch: null, onResult: null };
    isIgnored = picomatch(opts.ignore, ignoreOpts, returnState);
  }

  const matcher = (input, returnObject = false) => {
    const { isMatch, match, output } = picomatch.test(input, regex, options, { glob, posix });
    const result = { glob, state, regex, posix, input, output, match, isMatch };

    if (typeof opts.onResult === 'function') {
      opts.onResult(result);
    }

    if (isMatch === false) {
      result.isMatch = false;
      return returnObject ? result : false;
    }

    if (isIgnored(input)) {
      if (typeof opts.onIgnore === 'function') {
        opts.onIgnore(result);
      }
      result.isMatch = false;
      return returnObject ? result : false;
    }

    if (typeof opts.onMatch === 'function') {
      opts.onMatch(result);
    }
    return returnObject ? result : true;
  };

  if (returnState) {
    matcher.state = state;
  }

  return matcher;
};

/**
 * Test `input` with the given `regex`. This is used by the main
 * `picomatch()` function to test the input string.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.test(input, regex[, options]);
 *
 * console.log(picomatch.test('foo/bar', /^(?:([^/]*?)\/([^/]*?))$/));
 * // { isMatch: true, match: [ 'foo/', 'foo', 'bar' ], output: 'foo/bar' }
 * ```
 * @param {String} `input` String to test.
 * @param {RegExp} `regex`
 * @return {Object} Returns an object with matching info.
 * @api public
 */

picomatch.test = (input, regex, options, { glob, posix } = {}) => {
  if (typeof input !== 'string') {
    throw new TypeError('Expected input to be a string');
  }

  if (input === '') {
    return { isMatch: false, output: '' };
  }

  const opts = options || {};
  const format = opts.format || (posix ? utils.toPosixSlashes : null);
  let match = input === glob;
  let output = (match && format) ? format(input) : input;

  if (match === false) {
    output = format ? format(input) : input;
    match = output === glob;
  }

  if (match === false || opts.capture === true) {
    if (opts.matchBase === true || opts.basename === true) {
      match = picomatch.matchBase(input, regex, options, posix);
    } else {
      match = regex.exec(output);
    }
  }

  return { isMatch: Boolean(match), match, output };
};

/**
 * Match the basename of a filepath.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.matchBase(input, glob[, options]);
 * console.log(picomatch.matchBase('foo/bar.js', '*.js'); // true
 * ```
 * @param {String} `input` String to test.
 * @param {RegExp|String} `glob` Glob pattern or regex created by [.makeRe](#makeRe).
 * @return {Boolean}
 * @api public
 */

picomatch.matchBase = (input, glob, options, posix = utils.isWindows(options)) => {
  const regex = glob instanceof RegExp ? glob : picomatch.makeRe(glob, options);
  return regex.test(path.basename(input));
};

/**
 * Returns true if **any** of the given glob `patterns` match the specified `string`.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.isMatch(string, patterns[, options]);
 *
 * console.log(picomatch.isMatch('a.a', ['b.*', '*.a'])); //=> true
 * console.log(picomatch.isMatch('a.a', 'b.*')); //=> false
 * ```
 * @param {String|Array} str The string to test.
 * @param {String|Array} patterns One or more glob patterns to use for matching.
 * @param {Object} [options] See available [options](#options).
 * @return {Boolean} Returns true if any patterns match `str`
 * @api public
 */

picomatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);

/**
 * Parse a glob pattern to create the source string for a regular
 * expression.
 *
 * ```js
 * const picomatch = require('picomatch');
 * const result = picomatch.parse(pattern[, options]);
 * ```
 * @param {String} `pattern`
 * @param {Object} `options`
 * @return {Object} Returns an object with useful properties and output to be used as a regex source string.
 * @api public
 */

picomatch.parse = (pattern, options) => {
  if (Array.isArray(pattern)) return pattern.map(p => picomatch.parse(p, options));
  return parse(pattern, { ...options, fastpaths: false });
};

/**
 * Scan a glob pattern to separate the pattern into segments.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.scan(input[, options]);
 *
 * const result = picomatch.scan('!./foo/*.js');
 * console.log(result);
 * { prefix: '!./',
 *   input: '!./foo/*.js',
 *   start: 3,
 *   base: 'foo',
 *   glob: '*.js',
 *   isBrace: false,
 *   isBracket: false,
 *   isGlob: true,
 *   isExtglob: false,
 *   isGlobstar: false,
 *   negated: true }
 * ```
 * @param {String} `input` Glob pattern to scan.
 * @param {Object} `options`
 * @return {Object} Returns an object with
 * @api public
 */

picomatch.scan = (input, options) => scan(input, options);

/**
 * Compile a regular expression from the `state` object returned by the
 * [parse()](#parse) method.
 *
 * @param {Object} `state`
 * @param {Object} `options`
 * @param {Boolean} `returnOutput` Intended for implementors, this argument allows you to return the raw output from the parser.
 * @param {Boolean} `returnState` Adds the state to a `state` property on the returned regex. Useful for implementors and debugging.
 * @return {RegExp}
 * @api public
 */

picomatch.compileRe = (state, options, returnOutput = false, returnState = false) => {
  if (returnOutput === true) {
    return state.output;
  }

  const opts = options || {};
  const prepend = opts.contains ? '' : '^';
  const append = opts.contains ? '' : '$';

  let source = `${prepend}(?:${state.output})${append}`;
  if (state && state.negated === true) {
    source = `^(?!${source}).*$`;
  }

  const regex = picomatch.toRegex(source, options);
  if (returnState === true) {
    regex.state = state;
  }

  return regex;
};

/**
 * Create a regular expression from a parsed glob pattern.
 *
 * ```js
 * const picomatch = require('picomatch');
 * const state = picomatch.parse('*.js');
 * // picomatch.compileRe(state[, options]);
 *
 * console.log(picomatch.compileRe(state));
 * //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
 * ```
 * @param {String} `state` The object returned from the `.parse` method.
 * @param {Object} `options`
 * @param {Boolean} `returnOutput` Implementors may use this argument to return the compiled output, instead of a regular expression. This is not exposed on the options to prevent end-users from mutating the result.
 * @param {Boolean} `returnState` Implementors may use this argument to return the state from the parsed glob with the returned regular expression.
 * @return {RegExp} Returns a regex created from the given pattern.
 * @api public
 */

picomatch.makeRe = (input, options = {}, returnOutput = false, returnState = false) => {
  if (!input || typeof input !== 'string') {
    throw new TypeError('Expected a non-empty string');
  }

  let parsed = { negated: false, fastpaths: true };

  if (options.fastpaths !== false && (input[0] === '.' || input[0] === '*')) {
    parsed.output = parse.fastpaths(input, options);
  }

  if (!parsed.output) {
    parsed = parse(input, options);
  }

  return picomatch.compileRe(parsed, options, returnOutput, returnState);
};

/**
 * Create a regular expression from the given regex source string.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.toRegex(source[, options]);
 *
 * const { output } = picomatch.parse('*.js');
 * console.log(picomatch.toRegex(output));
 * //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
 * ```
 * @param {String} `source` Regular expression source string.
 * @param {Object} `options`
 * @return {RegExp}
 * @api public
 */

picomatch.toRegex = (source, options) => {
  try {
    const opts = options || {};
    return new RegExp(source, opts.flags || (opts.nocase ? 'i' : ''));
  } catch (err) {
    if (options && options.debug === true) throw err;
    return /$^/;
  }
};

/**
 * Picomatch constants.
 * @return {Object}
 */

picomatch.constants = constants;

/**
 * Expose "picomatch"
 */

module.exports = picomatch;


/***/ }),

/***/ 54870:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const utils = __webpack_require__(98178);
const {
  CHAR_ASTERISK,             /* * */
  CHAR_AT,                   /* @ */
  CHAR_BACKWARD_SLASH,       /* \ */
  CHAR_COMMA,                /* , */
  CHAR_DOT,                  /* . */
  CHAR_EXCLAMATION_MARK,     /* ! */
  CHAR_FORWARD_SLASH,        /* / */
  CHAR_LEFT_CURLY_BRACE,     /* { */
  CHAR_LEFT_PARENTHESES,     /* ( */
  CHAR_LEFT_SQUARE_BRACKET,  /* [ */
  CHAR_PLUS,                 /* + */
  CHAR_QUESTION_MARK,        /* ? */
  CHAR_RIGHT_CURLY_BRACE,    /* } */
  CHAR_RIGHT_PARENTHESES,    /* ) */
  CHAR_RIGHT_SQUARE_BRACKET  /* ] */
} = __webpack_require__(78554);

const isPathSeparator = code => {
  return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
};

const depth = token => {
  if (token.isPrefix !== true) {
    token.depth = token.isGlobstar ? Infinity : 1;
  }
};

/**
 * Quickly scans a glob pattern and returns an object with a handful of
 * useful properties, like `isGlob`, `path` (the leading non-glob, if it exists),
 * `glob` (the actual pattern), `negated` (true if the path starts with `!` but not
 * with `!(`) and `negatedExtglob` (true if the path starts with `!(`).
 *
 * ```js
 * const pm = require('picomatch');
 * console.log(pm.scan('foo/bar/*.js'));
 * { isGlob: true, input: 'foo/bar/*.js', base: 'foo/bar', glob: '*.js' }
 * ```
 * @param {String} `str`
 * @param {Object} `options`
 * @return {Object} Returns an object with tokens and regex source string.
 * @api public
 */

const scan = (input, options) => {
  const opts = options || {};

  const length = input.length - 1;
  const scanToEnd = opts.parts === true || opts.scanToEnd === true;
  const slashes = [];
  const tokens = [];
  const parts = [];

  let str = input;
  let index = -1;
  let start = 0;
  let lastIndex = 0;
  let isBrace = false;
  let isBracket = false;
  let isGlob = false;
  let isExtglob = false;
  let isGlobstar = false;
  let braceEscaped = false;
  let backslashes = false;
  let negated = false;
  let negatedExtglob = false;
  let finished = false;
  let braces = 0;
  let prev;
  let code;
  let token = { value: '', depth: 0, isGlob: false };

  const eos = () => index >= length;
  const peek = () => str.charCodeAt(index + 1);
  const advance = () => {
    prev = code;
    return str.charCodeAt(++index);
  };

  while (index < length) {
    code = advance();
    let next;

    if (code === CHAR_BACKWARD_SLASH) {
      backslashes = token.backslashes = true;
      code = advance();

      if (code === CHAR_LEFT_CURLY_BRACE) {
        braceEscaped = true;
      }
      continue;
    }

    if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
      braces++;

      while (eos() !== true && (code = advance())) {
        if (code === CHAR_BACKWARD_SLASH) {
          backslashes = token.backslashes = true;
          advance();
          continue;
        }

        if (code === CHAR_LEFT_CURLY_BRACE) {
          braces++;
          continue;
        }

        if (braceEscaped !== true && code === CHAR_DOT && (code = advance()) === CHAR_DOT) {
          isBrace = token.isBrace = true;
          isGlob = token.isGlob = true;
          finished = true;

          if (scanToEnd === true) {
            continue;
          }

          break;
        }

        if (braceEscaped !== true && code === CHAR_COMMA) {
          isBrace = token.isBrace = true;
          isGlob = token.isGlob = true;
          finished = true;

          if (scanToEnd === true) {
            continue;
          }

          break;
        }

        if (code === CHAR_RIGHT_CURLY_BRACE) {
          braces--;

          if (braces === 0) {
            braceEscaped = false;
            isBrace = token.isBrace = true;
            finished = true;
            break;
          }
        }
      }

      if (scanToEnd === true) {
        continue;
      }

      break;
    }

    if (code === CHAR_FORWARD_SLASH) {
      slashes.push(index);
      tokens.push(token);
      token = { value: '', depth: 0, isGlob: false };

      if (finished === true) continue;
      if (prev === CHAR_DOT && index === (start + 1)) {
        start += 2;
        continue;
      }

      lastIndex = index + 1;
      continue;
    }

    if (opts.noext !== true) {
      const isExtglobChar = code === CHAR_PLUS
        || code === CHAR_AT
        || code === CHAR_ASTERISK
        || code === CHAR_QUESTION_MARK
        || code === CHAR_EXCLAMATION_MARK;

      if (isExtglobChar === true && peek() === CHAR_LEFT_PARENTHESES) {
        isGlob = token.isGlob = true;
        isExtglob = token.isExtglob = true;
        finished = true;
        if (code === CHAR_EXCLAMATION_MARK && index === start) {
          negatedExtglob = true;
        }

        if (scanToEnd === true) {
          while (eos() !== true && (code = advance())) {
            if (code === CHAR_BACKWARD_SLASH) {
              backslashes = token.backslashes = true;
              code = advance();
              continue;
            }

            if (code === CHAR_RIGHT_PARENTHESES) {
              isGlob = token.isGlob = true;
              finished = true;
              break;
            }
          }
          continue;
        }
        break;
      }
    }

    if (code === CHAR_ASTERISK) {
      if (prev === CHAR_ASTERISK) isGlobstar = token.isGlobstar = true;
      isGlob = token.isGlob = true;
      finished = true;

      if (scanToEnd === true) {
        continue;
      }
      break;
    }

    if (code === CHAR_QUESTION_MARK) {
      isGlob = token.isGlob = true;
      finished = true;

      if (scanToEnd === true) {
        continue;
      }
      break;
    }

    if (code === CHAR_LEFT_SQUARE_BRACKET) {
      while (eos() !== true && (next = advance())) {
        if (next === CHAR_BACKWARD_SLASH) {
          backslashes = token.backslashes = true;
          advance();
          continue;
        }

        if (next === CHAR_RIGHT_SQUARE_BRACKET) {
          isBracket = token.isBracket = true;
          isGlob = token.isGlob = true;
          finished = true;
          break;
        }
      }

      if (scanToEnd === true) {
        continue;
      }

      break;
    }

    if (opts.nonegate !== true && code === CHAR_EXCLAMATION_MARK && index === start) {
      negated = token.negated = true;
      start++;
      continue;
    }

    if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
      isGlob = token.isGlob = true;

      if (scanToEnd === true) {
        while (eos() !== true && (code = advance())) {
          if (code === CHAR_LEFT_PARENTHESES) {
            backslashes = token.backslashes = true;
            code = advance();
            continue;
          }

          if (code === CHAR_RIGHT_PARENTHESES) {
            finished = true;
            break;
          }
        }
        continue;
      }
      break;
    }

    if (isGlob === true) {
      finished = true;

      if (scanToEnd === true) {
        continue;
      }

      break;
    }
  }

  if (opts.noext === true) {
    isExtglob = false;
    isGlob = false;
  }

  let base = str;
  let prefix = '';
  let glob = '';

  if (start > 0) {
    prefix = str.slice(0, start);
    str = str.slice(start);
    lastIndex -= start;
  }

  if (base && isGlob === true && lastIndex > 0) {
    base = str.slice(0, lastIndex);
    glob = str.slice(lastIndex);
  } else if (isGlob === true) {
    base = '';
    glob = str;
  } else {
    base = str;
  }

  if (base && base !== '' && base !== '/' && base !== str) {
    if (isPathSeparator(base.charCodeAt(base.length - 1))) {
      base = base.slice(0, -1);
    }
  }

  if (opts.unescape === true) {
    if (glob) glob = utils.removeBackslashes(glob);

    if (base && backslashes === true) {
      base = utils.removeBackslashes(base);
    }
  }

  const state = {
    prefix,
    input,
    start,
    base,
    glob,
    isBrace,
    isBracket,
    isGlob,
    isExtglob,
    isGlobstar,
    negated,
    negatedExtglob
  };

  if (opts.tokens === true) {
    state.maxDepth = 0;
    if (!isPathSeparator(code)) {
      tokens.push(token);
    }
    state.tokens = tokens;
  }

  if (opts.parts === true || opts.tokens === true) {
    let prevIndex;

    for (let idx = 0; idx < slashes.length; idx++) {
      const n = prevIndex ? prevIndex + 1 : start;
      const i = slashes[idx];
      const value = input.slice(n, i);
      if (opts.tokens) {
        if (idx === 0 && start !== 0) {
          tokens[idx].isPrefix = true;
          tokens[idx].value = prefix;
        } else {
          tokens[idx].value = value;
        }
        depth(tokens[idx]);
        state.maxDepth += tokens[idx].depth;
      }
      if (idx !== 0 || value !== '') {
        parts.push(value);
      }
      prevIndex = i;
    }

    if (prevIndex && prevIndex + 1 < input.length) {
      const value = input.slice(prevIndex + 1);
      parts.push(value);

      if (opts.tokens) {
        tokens[tokens.length - 1].value = value;
        depth(tokens[tokens.length - 1]);
        state.maxDepth += tokens[tokens.length - 1].depth;
      }
    }

    state.slashes = slashes;
    state.parts = parts;
  }

  return state;
};

module.exports = scan;


/***/ }),

/***/ 98178:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



const path = __webpack_require__(16928);
const win32 = process.platform === 'win32';
const {
  REGEX_BACKSLASH,
  REGEX_REMOVE_BACKSLASH,
  REGEX_SPECIAL_CHARS,
  REGEX_SPECIAL_CHARS_GLOBAL
} = __webpack_require__(78554);

exports.isObject = val => val !== null && typeof val === 'object' && !Array.isArray(val);
exports.hasRegexChars = str => REGEX_SPECIAL_CHARS.test(str);
exports.isRegexChar = str => str.length === 1 && exports.hasRegexChars(str);
exports.escapeRegex = str => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, '\\$1');
exports.toPosixSlashes = str => str.replace(REGEX_BACKSLASH, '/');

exports.removeBackslashes = str => {
  return str.replace(REGEX_REMOVE_BACKSLASH, match => {
    return match === '\\' ? '' : match;
  });
};

exports.supportsLookbehinds = () => {
  const segs = process.version.slice(1).split('.').map(Number);
  if (segs.length === 3 && segs[0] >= 9 || (segs[0] === 8 && segs[1] >= 10)) {
    return true;
  }
  return false;
};

exports.isWindows = options => {
  if (options && typeof options.windows === 'boolean') {
    return options.windows;
  }
  return win32 === true || path.sep === '\\';
};

exports.escapeLast = (input, char, lastIdx) => {
  const idx = input.lastIndexOf(char, lastIdx);
  if (idx === -1) return input;
  if (input[idx - 1] === '\\') return exports.escapeLast(input, char, idx - 1);
  return `${input.slice(0, idx)}\\${input.slice(idx)}`;
};

exports.removePrefix = (input, state = {}) => {
  let output = input;
  if (output.startsWith('./')) {
    output = output.slice(2);
    state.prefix = './';
  }
  return output;
};

exports.wrapOutput = (input, state = {}, options = {}) => {
  const prepend = options.contains ? '' : '^';
  const append = options.contains ? '' : '$';

  let output = `${prepend}(?:${input})${append}`;
  if (state.negated === true) {
    output = `(?:^(?!${output}).*$)`;
  }
  return output;
};


/***/ }),

/***/ 90033:
/***/ ((module) => {

/*! queue-microtask. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
let promise

module.exports = typeof queueMicrotask === 'function'
  ? queueMicrotask.bind(typeof window !== 'undefined' ? window : global)
  // reuse resolved promise, and allocate it lazily
  : cb => (promise || (promise = Promise.resolve()))
    .then(cb)
    .catch(err => setTimeout(() => { throw err }, 0))


/***/ }),

/***/ 12188:
/***/ ((module) => {



function reusify (Constructor) {
  var head = new Constructor()
  var tail = head

  function get () {
    var current = head

    if (current.next) {
      head = current.next
    } else {
      head = new Constructor()
      tail = head
    }

    current.next = null

    return current
  }

  function release (obj) {
    tail.next = obj
    tail = obj
  }

  return {
    get: get,
    release: release
  }
}

module.exports = reusify


/***/ }),

/***/ 67710:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*! run-parallel. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
module.exports = runParallel

const queueMicrotask = __webpack_require__(90033)

function runParallel (tasks, cb) {
  let results, pending, keys
  let isSync = true

  if (Array.isArray(tasks)) {
    results = []
    pending = tasks.length
  } else {
    keys = Object.keys(tasks)
    results = {}
    pending = keys.length
  }

  function done (err) {
    function end () {
      if (cb) cb(err, results)
      cb = null
    }
    if (isSync) queueMicrotask(end)
    else end()
  }

  function each (i, err, result) {
    results[i] = result
    if (--pending === 0 || err) {
      done(err)
    }
  }

  if (!pending) {
    // empty
    done(null)
  } else if (keys) {
    // object
    keys.forEach(function (key) {
      tasks[key](function (err, result) { each(key, err, result) })
    })
  } else {
    // array
    tasks.forEach(function (task, i) {
      task(function (err, result) { each(i, err, result) })
    })
  }

  isSync = false
}


/***/ }),

/***/ 29947:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*!
 * to-regex-range <https://github.com/micromatch/to-regex-range>
 *
 * Copyright (c) 2015-present, Jon Schlinkert.
 * Released under the MIT License.
 */



const isNumber = __webpack_require__(29068);

const toRegexRange = (min, max, options) => {
  if (isNumber(min) === false) {
    throw new TypeError('toRegexRange: expected the first argument to be a number');
  }

  if (max === void 0 || min === max) {
    return String(min);
  }

  if (isNumber(max) === false) {
    throw new TypeError('toRegexRange: expected the second argument to be a number.');
  }

  let opts = { relaxZeros: true, ...options };
  if (typeof opts.strictZeros === 'boolean') {
    opts.relaxZeros = opts.strictZeros === false;
  }

  let relax = String(opts.relaxZeros);
  let shorthand = String(opts.shorthand);
  let capture = String(opts.capture);
  let wrap = String(opts.wrap);
  let cacheKey = min + ':' + max + '=' + relax + shorthand + capture + wrap;

  if (toRegexRange.cache.hasOwnProperty(cacheKey)) {
    return toRegexRange.cache[cacheKey].result;
  }

  let a = Math.min(min, max);
  let b = Math.max(min, max);

  if (Math.abs(a - b) === 1) {
    let result = min + '|' + max;
    if (opts.capture) {
      return `(${result})`;
    }
    if (opts.wrap === false) {
      return result;
    }
    return `(?:${result})`;
  }

  let isPadded = hasPadding(min) || hasPadding(max);
  let state = { min, max, a, b };
  let positives = [];
  let negatives = [];

  if (isPadded) {
    state.isPadded = isPadded;
    state.maxLen = String(state.max).length;
  }

  if (a < 0) {
    let newMin = b < 0 ? Math.abs(b) : 1;
    negatives = splitToPatterns(newMin, Math.abs(a), state, opts);
    a = state.a = 0;
  }

  if (b >= 0) {
    positives = splitToPatterns(a, b, state, opts);
  }

  state.negatives = negatives;
  state.positives = positives;
  state.result = collatePatterns(negatives, positives, opts);

  if (opts.capture === true) {
    state.result = `(${state.result})`;
  } else if (opts.wrap !== false && (positives.length + negatives.length) > 1) {
    state.result = `(?:${state.result})`;
  }

  toRegexRange.cache[cacheKey] = state;
  return state.result;
};

function collatePatterns(neg, pos, options) {
  let onlyNegative = filterPatterns(neg, pos, '-', false, options) || [];
  let onlyPositive = filterPatterns(pos, neg, '', false, options) || [];
  let intersected = filterPatterns(neg, pos, '-?', true, options) || [];
  let subpatterns = onlyNegative.concat(intersected).concat(onlyPositive);
  return subpatterns.join('|');
}

function splitToRanges(min, max) {
  let nines = 1;
  let zeros = 1;

  let stop = countNines(min, nines);
  let stops = new Set([max]);

  while (min <= stop && stop <= max) {
    stops.add(stop);
    nines += 1;
    stop = countNines(min, nines);
  }

  stop = countZeros(max + 1, zeros) - 1;

  while (min < stop && stop <= max) {
    stops.add(stop);
    zeros += 1;
    stop = countZeros(max + 1, zeros) - 1;
  }

  stops = [...stops];
  stops.sort(compare);
  return stops;
}

/**
 * Convert a range to a regex pattern
 * @param {Number} `start`
 * @param {Number} `stop`
 * @return {String}
 */

function rangeToPattern(start, stop, options) {
  if (start === stop) {
    return { pattern: start, count: [], digits: 0 };
  }

  let zipped = zip(start, stop);
  let digits = zipped.length;
  let pattern = '';
  let count = 0;

  for (let i = 0; i < digits; i++) {
    let [startDigit, stopDigit] = zipped[i];

    if (startDigit === stopDigit) {
      pattern += startDigit;

    } else if (startDigit !== '0' || stopDigit !== '9') {
      pattern += toCharacterClass(startDigit, stopDigit, options);

    } else {
      count++;
    }
  }

  if (count) {
    pattern += options.shorthand === true ? '\\d' : '[0-9]';
  }

  return { pattern, count: [count], digits };
}

function splitToPatterns(min, max, tok, options) {
  let ranges = splitToRanges(min, max);
  let tokens = [];
  let start = min;
  let prev;

  for (let i = 0; i < ranges.length; i++) {
    let max = ranges[i];
    let obj = rangeToPattern(String(start), String(max), options);
    let zeros = '';

    if (!tok.isPadded && prev && prev.pattern === obj.pattern) {
      if (prev.count.length > 1) {
        prev.count.pop();
      }

      prev.count.push(obj.count[0]);
      prev.string = prev.pattern + toQuantifier(prev.count);
      start = max + 1;
      continue;
    }

    if (tok.isPadded) {
      zeros = padZeros(max, tok, options);
    }

    obj.string = zeros + obj.pattern + toQuantifier(obj.count);
    tokens.push(obj);
    start = max + 1;
    prev = obj;
  }

  return tokens;
}

function filterPatterns(arr, comparison, prefix, intersection, options) {
  let result = [];

  for (let ele of arr) {
    let { string } = ele;

    // only push if _both_ are negative...
    if (!intersection && !contains(comparison, 'string', string)) {
      result.push(prefix + string);
    }

    // or _both_ are positive
    if (intersection && contains(comparison, 'string', string)) {
      result.push(prefix + string);
    }
  }
  return result;
}

/**
 * Zip strings
 */

function zip(a, b) {
  let arr = [];
  for (let i = 0; i < a.length; i++) arr.push([a[i], b[i]]);
  return arr;
}

function compare(a, b) {
  return a > b ? 1 : b > a ? -1 : 0;
}

function contains(arr, key, val) {
  return arr.some(ele => ele[key] === val);
}

function countNines(min, len) {
  return Number(String(min).slice(0, -len) + '9'.repeat(len));
}

function countZeros(integer, zeros) {
  return integer - (integer % Math.pow(10, zeros));
}

function toQuantifier(digits) {
  let [start = 0, stop = ''] = digits;
  if (stop || start > 1) {
    return `{${start + (stop ? ',' + stop : '')}}`;
  }
  return '';
}

function toCharacterClass(a, b, options) {
  return `[${a}${(b - a === 1) ? '' : '-'}${b}]`;
}

function hasPadding(str) {
  return /^-?(0+)\d/.test(str);
}

function padZeros(value, tok, options) {
  if (!tok.isPadded) {
    return value;
  }

  let diff = Math.abs(tok.maxLen - String(value).length);
  let relax = options.relaxZeros !== false;

  switch (diff) {
    case 0:
      return '';
    case 1:
      return relax ? '0?' : '0';
    case 2:
      return relax ? '0{0,2}' : '00';
    default: {
      return relax ? `0{0,${diff}}` : `0{${diff}}`;
    }
  }
}

/**
 * Cache
 */

toRegexRange.cache = {};
toRegexRange.clearCache = () => (toRegexRange.cache = {});

/**
 * Expose `toRegexRange`
 */

module.exports = toRegexRange;


/***/ }),

/***/ 90975:
/***/ ((module) => {

var __webpack_unused_export__;


const NullObject = function NullObject () { }
NullObject.prototype = Object.create(null)

/**
 * RegExp to match *( ";" parameter ) in RFC 7231 sec 3.1.1.1
 *
 * parameter     = token "=" ( token / quoted-string )
 * token         = 1*tchar
 * tchar         = "!" / "#" / "$" / "%" / "&" / "'" / "*"
 *               / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
 *               / DIGIT / ALPHA
 *               ; any VCHAR, except delimiters
 * quoted-string = DQUOTE *( qdtext / quoted-pair ) DQUOTE
 * qdtext        = HTAB / SP / %x21 / %x23-5B / %x5D-7E / obs-text
 * obs-text      = %x80-FF
 * quoted-pair   = "\" ( HTAB / SP / VCHAR / obs-text )
 */
const paramRE = /; *([!#$%&'*+.^\w`|~-]+)=("(?:[\v\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\v\u0020-\u00ff])*"|[!#$%&'*+.^\w`|~-]+) */gu

/**
 * RegExp to match quoted-pair in RFC 7230 sec 3.2.6
 *
 * quoted-pair = "\" ( HTAB / SP / VCHAR / obs-text )
 * obs-text    = %x80-FF
 */
const quotedPairRE = /\\([\v\u0020-\u00ff])/gu

/**
 * RegExp to match type in RFC 7231 sec 3.1.1.1
 *
 * media-type = type "/" subtype
 * type       = token
 * subtype    = token
 */
const mediaTypeRE = /^[!#$%&'*+.^\w|~-]+\/[!#$%&'*+.^\w|~-]+$/u

// default ContentType to prevent repeated object creation
const defaultContentType = { type: '', parameters: new NullObject() }
Object.freeze(defaultContentType.parameters)
Object.freeze(defaultContentType)

/**
 * Parse media type to object.
 *
 * @param {string|object} header
 * @return {Object}
 * @public
 */

function parse (header) {
  if (typeof header !== 'string') {
    throw new TypeError('argument header is required and must be a string')
  }

  let index = header.indexOf(';')
  const type = index !== -1
    ? header.slice(0, index).trim()
    : header.trim()

  if (mediaTypeRE.test(type) === false) {
    throw new TypeError('invalid media type')
  }

  const result = {
    type: type.toLowerCase(),
    parameters: new NullObject()
  }

  // parse parameters
  if (index === -1) {
    return result
  }

  let key
  let match
  let value

  paramRE.lastIndex = index

  while ((match = paramRE.exec(header))) {
    if (match.index !== index) {
      throw new TypeError('invalid parameter format')
    }

    index += match[0].length
    key = match[1].toLowerCase()
    value = match[2]

    if (value[0] === '"') {
      // remove quotes and escapes
      value = value
        .slice(1, value.length - 1)

      quotedPairRE.test(value) && (value = value.replace(quotedPairRE, '$1'))
    }

    result.parameters[key] = value
  }

  if (index !== header.length) {
    throw new TypeError('invalid parameter format')
  }

  return result
}

function safeParse (header) {
  if (typeof header !== 'string') {
    return defaultContentType
  }

  let index = header.indexOf(';')
  const type = index !== -1
    ? header.slice(0, index).trim()
    : header.trim()

  if (mediaTypeRE.test(type) === false) {
    return defaultContentType
  }

  const result = {
    type: type.toLowerCase(),
    parameters: new NullObject()
  }

  // parse parameters
  if (index === -1) {
    return result
  }

  let key
  let match
  let value

  paramRE.lastIndex = index

  while ((match = paramRE.exec(header))) {
    if (match.index !== index) {
      return defaultContentType
    }

    index += match[0].length
    key = match[1].toLowerCase()
    value = match[2]

    if (value[0] === '"') {
      // remove quotes and escapes
      value = value
        .slice(1, value.length - 1)

      quotedPairRE.test(value) && (value = value.replace(quotedPairRE, '$1'))
    }

    result.parameters[key] = value
  }

  if (index !== header.length) {
    return defaultContentType
  }

  return result
}

__webpack_unused_export__ = { parse, safeParse }
__webpack_unused_export__ = parse
module.exports.xL = safeParse
__webpack_unused_export__ = defaultContentType


/***/ }),

/***/ 65033:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



/* eslint-disable no-var */

var reusify = __webpack_require__(12188)

function fastqueue (context, worker, _concurrency) {
  if (typeof context === 'function') {
    _concurrency = worker
    worker = context
    context = null
  }

  if (!(_concurrency >= 1)) {
    throw new Error('fastqueue concurrency must be equal to or greater than 1')
  }

  var cache = reusify(Task)
  var queueHead = null
  var queueTail = null
  var _running = 0
  var errorHandler = null

  var self = {
    push: push,
    drain: noop,
    saturated: noop,
    pause: pause,
    paused: false,

    get concurrency () {
      return _concurrency
    },
    set concurrency (value) {
      if (!(value >= 1)) {
        throw new Error('fastqueue concurrency must be equal to or greater than 1')
      }
      _concurrency = value

      if (self.paused) return
      for (; queueHead && _running < _concurrency;) {
        _running++
        release()
      }
    },

    running: running,
    resume: resume,
    idle: idle,
    length: length,
    getQueue: getQueue,
    unshift: unshift,
    empty: noop,
    kill: kill,
    killAndDrain: killAndDrain,
    error: error,
    abort: abort
  }

  return self

  function running () {
    return _running
  }

  function pause () {
    self.paused = true
  }

  function length () {
    var current = queueHead
    var counter = 0

    while (current) {
      current = current.next
      counter++
    }

    return counter
  }

  function getQueue () {
    var current = queueHead
    var tasks = []

    while (current) {
      tasks.push(current.value)
      current = current.next
    }

    return tasks
  }

  function resume () {
    if (!self.paused) return
    self.paused = false
    if (queueHead === null) {
      _running++
      release()
      return
    }
    for (; queueHead && _running < _concurrency;) {
      _running++
      release()
    }
  }

  function idle () {
    return _running === 0 && self.length() === 0
  }

  function push (value, done) {
    var current = cache.get()

    current.context = context
    current.release = release
    current.value = value
    current.callback = done || noop
    current.errorHandler = errorHandler

    if (_running >= _concurrency || self.paused) {
      if (queueTail) {
        queueTail.next = current
        queueTail = current
      } else {
        queueHead = current
        queueTail = current
        self.saturated()
      }
    } else {
      _running++
      worker.call(context, current.value, current.worked)
    }
  }

  function unshift (value, done) {
    var current = cache.get()

    current.context = context
    current.release = release
    current.value = value
    current.callback = done || noop
    current.errorHandler = errorHandler

    if (_running >= _concurrency || self.paused) {
      if (queueHead) {
        current.next = queueHead
        queueHead = current
      } else {
        queueHead = current
        queueTail = current
        self.saturated()
      }
    } else {
      _running++
      worker.call(context, current.value, current.worked)
    }
  }

  function release (holder) {
    if (holder) {
      cache.release(holder)
    }
    var next = queueHead
    if (next && _running <= _concurrency) {
      if (!self.paused) {
        if (queueTail === queueHead) {
          queueTail = null
        }
        queueHead = next.next
        next.next = null
        worker.call(context, next.value, next.worked)
        if (queueTail === null) {
          self.empty()
        }
      } else {
        _running--
      }
    } else if (--_running === 0) {
      self.drain()
    }
  }

  function kill () {
    queueHead = null
    queueTail = null
    self.drain = noop
  }

  function killAndDrain () {
    queueHead = null
    queueTail = null
    self.drain()
    self.drain = noop
  }

  function abort () {
    var current = queueHead
    queueHead = null
    queueTail = null

    while (current) {
      var next = current.next
      var callback = current.callback
      var errorHandler = current.errorHandler
      var val = current.value
      var context = current.context

      // Reset the task state
      current.value = null
      current.callback = noop
      current.errorHandler = null

      // Call error handler if present
      if (errorHandler) {
        errorHandler(new Error('abort'), val)
      }

      // Call callback with error
      callback.call(context, new Error('abort'))

      // Release the task back to the pool
      current.release(current)

      current = next
    }

    self.drain = noop
  }

  function error (handler) {
    errorHandler = handler
  }
}

function noop () {}

function Task () {
  this.value = null
  this.callback = noop
  this.next = null
  this.release = noop
  this.context = null
  this.errorHandler = null

  var self = this

  this.worked = function worked (err, result) {
    var callback = self.callback
    var errorHandler = self.errorHandler
    var val = self.value
    self.value = null
    self.callback = noop
    if (self.errorHandler) {
      errorHandler(err, val)
    }
    callback.call(self.context, err, result)
    self.release(self)
  }
}

function queueAsPromised (context, worker, _concurrency) {
  if (typeof context === 'function') {
    _concurrency = worker
    worker = context
    context = null
  }

  function asyncWrapper (arg, cb) {
    worker.call(this, arg)
      .then(function (res) {
        cb(null, res)
      }, cb)
  }

  var queue = fastqueue(context, asyncWrapper, _concurrency)

  var pushCb = queue.push
  var unshiftCb = queue.unshift

  queue.push = push
  queue.unshift = unshift
  queue.drained = drained

  return queue

  function push (value) {
    var p = new Promise(function (resolve, reject) {
      pushCb(value, function (err, result) {
        if (err) {
          reject(err)
          return
        }
        resolve(result)
      })
    })

    // Let's fork the promise chain to
    // make the error bubble up to the user but
    // not lead to a unhandledRejection
    p.catch(noop)

    return p
  }

  function unshift (value) {
    var p = new Promise(function (resolve, reject) {
      unshiftCb(value, function (err, result) {
        if (err) {
          reject(err)
          return
        }
        resolve(result)
      })
    })

    // Let's fork the promise chain to
    // make the error bubble up to the user but
    // not lead to a unhandledRejection
    p.catch(noop)

    return p
  }

  function drained () {
    var p = new Promise(function (resolve) {
      process.nextTick(function () {
        if (queue.idle()) {
          resolve()
        } else {
          var previousDrain = queue.drain
          queue.drain = function () {
            if (typeof previousDrain === 'function') previousDrain()
            resolve()
            queue.drain = previousDrain
          }
        }
      })
    })

    return p
  }
}

module.exports = fastqueue
module.exports.promise = queueAsPromised


/***/ }),

/***/ 86920:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   P: () => (/* binding */ o_)
/* harmony export */ });
/* unused harmony exports unstable_v2_resumeSession, unstable_v2_prompt, unstable_v2_createSession, tool, createSdkMcpServer, HOOK_EVENTS, EXIT_REASONS, AbortError */
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(16928);
/* harmony import */ var url__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(87016);
/* harmony import */ var events__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(24434);
/* harmony import */ var child_process__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(35317);
/* harmony import */ var readline__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(23785);
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(79896);
/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(91943);
/* harmony import */ var os__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(70857);
/* harmony import */ var process__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(932);
/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(76982);
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 0.2.22

// Want to see the unminified source? We're hiring!
// https://job-boards.greenhouse.io/anthropic/jobs/4816199008
var QK=Object.create;var{getPrototypeOf:$K,defineProperty:Y9,getOwnPropertyNames:YK}=Object;var WK=Object.prototype.hasOwnProperty;var K7=(X,Q,$)=>{$=X!=null?QK($K(X)):{};let Y=Q||!X||!X.__esModule?Y9($,"default",{value:X,enumerable:!0}):$;for(let W of YK(X))if(!WK.call(Y,W))Y9(Y,W,{get:()=>X[W],enumerable:!0});return Y};var P=(X,Q)=>()=>(Q||X((Q={exports:{}}).exports,Q),Q.exports);var U7=(X,Q)=>{for(var $ in Q)Y9(X,$,{get:Q[$],enumerable:!0,configurable:!0,set:(Y)=>Q[$]=()=>Y})};var JK=Symbol.dispose||Symbol.for("Symbol.dispose"),GK=Symbol.asyncDispose||Symbol.for("Symbol.asyncDispose"),V7=(X,Q,$)=>{if(Q!=null){if(typeof Q!=="object"&&typeof Q!=="function")throw TypeError('Object expected to be assigned to "using" declaration');var Y;if($)Y=Q[GK];if(Y===void 0)Y=Q[JK];if(typeof Y!=="function")throw TypeError("Object not disposable");X.push([$,Y,Q])}else if($)X.push([$]);return Q},L7=(X,Q,$)=>{var Y=typeof SuppressedError==="function"?SuppressedError:function(G,H,B,z){return z=Error(B),z.name="SuppressedError",z.error=G,z.suppressed=H,z},W=(G)=>Q=$?new Y(G,Q,"An error was suppressed during disposal"):($=!0,G),J=(G)=>{while(G=X.pop())try{var H=G[1]&&G[1].call(G[2]);if(G[0])return Promise.resolve(H).then(J,(B)=>(W(B),J()))}catch(B){W(B)}if($)throw Q};return J()};var hX=P((WG)=>{Object.defineProperty(WG,"__esModule",{value:!0});WG.regexpCode=WG.getEsmExportName=WG.getProperty=WG.safeStringify=WG.stringify=WG.strConcat=WG.addCodeArg=WG.str=WG._=WG.nil=WG._Code=WG.Name=WG.IDENTIFIER=WG._CodeOrName=void 0;class D8{}WG._CodeOrName=D8;WG.IDENTIFIER=/^[a-z$_][a-z$_0-9]*$/i;class f6 extends D8{constructor(X){super();if(!WG.IDENTIFIER.test(X))throw Error("CodeGen: name must be a valid identifier");this.str=X}toString(){return this.str}emptyStr(){return!1}get names(){return{[this.str]:1}}}WG.Name=f6;class s0 extends D8{constructor(X){super();this._items=typeof X==="string"?[X]:X}toString(){return this.str}emptyStr(){if(this._items.length>1)return!1;let X=this._items[0];return X===""||X==='""'}get str(){var X;return(X=this._str)!==null&&X!==void 0?X:this._str=this._items.reduce((Q,$)=>`${Q}${$}`,"")}get names(){var X;return(X=this._names)!==null&&X!==void 0?X:this._names=this._items.reduce((Q,$)=>{if($ instanceof f6)Q[$.str]=(Q[$.str]||0)+1;return Q},{})}}WG._Code=s0;WG.nil=new s0("");function $G(X,...Q){let $=[X[0]],Y=0;while(Y<Q.length)s$($,Q[Y]),$.push(X[++Y]);return new s0($)}WG._=$G;var a$=new s0("+");function YG(X,...Q){let $=[fX(X[0])],Y=0;while(Y<Q.length)$.push(a$),s$($,Q[Y]),$.push(a$,fX(X[++Y]));return qN($),new s0($)}WG.str=YG;function s$(X,Q){if(Q instanceof s0)X.push(...Q._items);else if(Q instanceof f6)X.push(Q);else X.push(ON(Q))}WG.addCodeArg=s$;function qN(X){let Q=1;while(Q<X.length-1){if(X[Q]===a$){let $=FN(X[Q-1],X[Q+1]);if($!==void 0){X.splice(Q-1,3,$);continue}X[Q++]="+"}Q++}}function FN(X,Q){if(Q==='""')return X;if(X==='""')return Q;if(typeof X=="string"){if(Q instanceof f6||X[X.length-1]!=='"')return;if(typeof Q!="string")return`${X.slice(0,-1)}${Q}"`;if(Q[0]==='"')return X.slice(0,-1)+Q.slice(1);return}if(typeof Q=="string"&&Q[0]==='"'&&!(X instanceof f6))return`"${X}${Q.slice(1)}`;return}function NN(X,Q){return Q.emptyStr()?X:X.emptyStr()?Q:YG`${X}${Q}`}WG.strConcat=NN;function ON(X){return typeof X=="number"||typeof X=="boolean"||X===null?X:fX(Array.isArray(X)?X.join(","):X)}function DN(X){return new s0(fX(X))}WG.stringify=DN;function fX(X){return JSON.stringify(X).replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029")}WG.safeStringify=fX;function AN(X){return typeof X=="string"&&WG.IDENTIFIER.test(X)?new s0(`.${X}`):$G`[${X}]`}WG.getProperty=AN;function wN(X){if(typeof X=="string"&&WG.IDENTIFIER.test(X))return new s0(`${X}`);throw Error(`CodeGen: invalid export name: ${X}, use explicit $id name mapping`)}WG.getEsmExportName=wN;function MN(X){return new s0(X.toString())}WG.regexpCode=MN});var $Y=P((BG)=>{Object.defineProperty(BG,"__esModule",{value:!0});BG.ValueScope=BG.ValueScopeName=BG.Scope=BG.varKinds=BG.UsedValueState=void 0;var x0=hX();class GG extends Error{constructor(X){super(`CodeGen: "code" for ${X} not defined`);this.value=X.value}}var w8;(function(X){X[X.Started=0]="Started",X[X.Completed=1]="Completed"})(w8||(BG.UsedValueState=w8={}));BG.varKinds={const:new x0.Name("const"),let:new x0.Name("let"),var:new x0.Name("var")};class XY{constructor({prefixes:X,parent:Q}={}){this._names={},this._prefixes=X,this._parent=Q}toName(X){return X instanceof x0.Name?X:this.name(X)}name(X){return new x0.Name(this._newName(X))}_newName(X){let Q=this._names[X]||this._nameGroup(X);return`${X}${Q.index++}`}_nameGroup(X){var Q,$;if((($=(Q=this._parent)===null||Q===void 0?void 0:Q._prefixes)===null||$===void 0?void 0:$.has(X))||this._prefixes&&!this._prefixes.has(X))throw Error(`CodeGen: prefix "${X}" is not allowed in this scope`);return this._names[X]={prefix:X,index:0}}}BG.Scope=XY;class QY extends x0.Name{constructor(X,Q){super(Q);this.prefix=X}setValue(X,{property:Q,itemIndex:$}){this.value=X,this.scopePath=x0._`.${new x0.Name(Q)}[${$}]`}}BG.ValueScopeName=QY;var _N=x0._`\n`;class HG extends XY{constructor(X){super(X);this._values={},this._scope=X.scope,this.opts={...X,_n:X.lines?_N:x0.nil}}get(){return this._scope}name(X){return new QY(X,this._newName(X))}value(X,Q){var $;if(Q.ref===void 0)throw Error("CodeGen: ref must be passed in value");let Y=this.toName(X),{prefix:W}=Y,J=($=Q.key)!==null&&$!==void 0?$:Q.ref,G=this._values[W];if(G){let z=G.get(J);if(z)return z}else G=this._values[W]=new Map;G.set(J,Y);let H=this._scope[W]||(this._scope[W]=[]),B=H.length;return H[B]=Q.ref,Y.setValue(Q,{property:W,itemIndex:B}),Y}getValue(X,Q){let $=this._values[X];if(!$)return;return $.get(Q)}scopeRefs(X,Q=this._values){return this._reduceValues(Q,($)=>{if($.scopePath===void 0)throw Error(`CodeGen: name "${$}" has no value`);return x0._`${X}${$.scopePath}`})}scopeCode(X=this._values,Q,$){return this._reduceValues(X,(Y)=>{if(Y.value===void 0)throw Error(`CodeGen: name "${Y}" has no value`);return Y.value.code},Q,$)}_reduceValues(X,Q,$={},Y){let W=x0.nil;for(let J in X){let G=X[J];if(!G)continue;let H=$[J]=$[J]||new Map;G.forEach((B)=>{if(H.has(B))return;H.set(B,w8.Started);let z=Q(B);if(z){let K=this.opts.es5?BG.varKinds.var:BG.varKinds.const;W=x0._`${W}${K} ${B} = ${z};${this.opts._n}`}else if(z=Y===null||Y===void 0?void 0:Y(B))W=x0._`${W}${z}${this.opts._n}`;else throw new GG(B);H.set(B,w8.Completed)})}return W}}BG.ValueScope=HG});var c=P((y0)=>{Object.defineProperty(y0,"__esModule",{value:!0});y0.or=y0.and=y0.not=y0.CodeGen=y0.operators=y0.varKinds=y0.ValueScopeName=y0.ValueScope=y0.Scope=y0.Name=y0.regexpCode=y0.stringify=y0.getProperty=y0.nil=y0.strConcat=y0.str=y0._=void 0;var t=hX(),e0=$Y(),l1=hX();Object.defineProperty(y0,"_",{enumerable:!0,get:function(){return l1._}});Object.defineProperty(y0,"str",{enumerable:!0,get:function(){return l1.str}});Object.defineProperty(y0,"strConcat",{enumerable:!0,get:function(){return l1.strConcat}});Object.defineProperty(y0,"nil",{enumerable:!0,get:function(){return l1.nil}});Object.defineProperty(y0,"getProperty",{enumerable:!0,get:function(){return l1.getProperty}});Object.defineProperty(y0,"stringify",{enumerable:!0,get:function(){return l1.stringify}});Object.defineProperty(y0,"regexpCode",{enumerable:!0,get:function(){return l1.regexpCode}});Object.defineProperty(y0,"Name",{enumerable:!0,get:function(){return l1.Name}});var b8=$Y();Object.defineProperty(y0,"Scope",{enumerable:!0,get:function(){return b8.Scope}});Object.defineProperty(y0,"ValueScope",{enumerable:!0,get:function(){return b8.ValueScope}});Object.defineProperty(y0,"ValueScopeName",{enumerable:!0,get:function(){return b8.ValueScopeName}});Object.defineProperty(y0,"varKinds",{enumerable:!0,get:function(){return b8.varKinds}});y0.operators={GT:new t._Code(">"),GTE:new t._Code(">="),LT:new t._Code("<"),LTE:new t._Code("<="),EQ:new t._Code("==="),NEQ:new t._Code("!=="),NOT:new t._Code("!"),OR:new t._Code("||"),AND:new t._Code("&&"),ADD:new t._Code("+")};class m1{optimizeNodes(){return this}optimizeNames(X,Q){return this}}class KG extends m1{constructor(X,Q,$){super();this.varKind=X,this.name=Q,this.rhs=$}render({es5:X,_n:Q}){let $=X?e0.varKinds.var:this.varKind,Y=this.rhs===void 0?"":` = ${this.rhs}`;return`${$} ${this.name}${Y};`+Q}optimizeNames(X,Q){if(!X[this.name.str])return;if(this.rhs)this.rhs=u6(this.rhs,X,Q);return this}get names(){return this.rhs instanceof t._CodeOrName?this.rhs.names:{}}}class JY extends m1{constructor(X,Q,$){super();this.lhs=X,this.rhs=Q,this.sideEffects=$}render({_n:X}){return`${this.lhs} = ${this.rhs};`+X}optimizeNames(X,Q){if(this.lhs instanceof t.Name&&!X[this.lhs.str]&&!this.sideEffects)return;return this.rhs=u6(this.rhs,X,Q),this}get names(){let X=this.lhs instanceof t.Name?{}:{...this.lhs.names};return I8(X,this.rhs)}}class UG extends JY{constructor(X,Q,$,Y){super(X,$,Y);this.op=Q}render({_n:X}){return`${this.lhs} ${this.op}= ${this.rhs};`+X}}class VG extends m1{constructor(X){super();this.label=X,this.names={}}render({_n:X}){return`${this.label}:`+X}}class LG extends m1{constructor(X){super();this.label=X,this.names={}}render({_n:X}){return`break${this.label?` ${this.label}`:""};`+X}}class qG extends m1{constructor(X){super();this.error=X}render({_n:X}){return`throw ${this.error};`+X}get names(){return this.error.names}}class FG extends m1{constructor(X){super();this.code=X}render({_n:X}){return`${this.code};`+X}optimizeNodes(){return`${this.code}`?this:void 0}optimizeNames(X,Q){return this.code=u6(this.code,X,Q),this}get names(){return this.code instanceof t._CodeOrName?this.code.names:{}}}class P8 extends m1{constructor(X=[]){super();this.nodes=X}render(X){return this.nodes.reduce((Q,$)=>Q+$.render(X),"")}optimizeNodes(){let{nodes:X}=this,Q=X.length;while(Q--){let $=X[Q].optimizeNodes();if(Array.isArray($))X.splice(Q,1,...$);else if($)X[Q]=$;else X.splice(Q,1)}return X.length>0?this:void 0}optimizeNames(X,Q){let{nodes:$}=this,Y=$.length;while(Y--){let W=$[Y];if(W.optimizeNames(X,Q))continue;fN(X,W.names),$.splice(Y,1)}return $.length>0?this:void 0}get names(){return this.nodes.reduce((X,Q)=>J6(X,Q.names),{})}}class c1 extends P8{render(X){return"{"+X._n+super.render(X)+"}"+X._n}}class NG extends P8{}class uX extends c1{}uX.kind="else";class j1 extends c1{constructor(X,Q){super(Q);this.condition=X}render(X){let Q=`if(${this.condition})`+super.render(X);if(this.else)Q+="else "+this.else.render(X);return Q}optimizeNodes(){super.optimizeNodes();let X=this.condition;if(X===!0)return this.nodes;let Q=this.else;if(Q){let $=Q.optimizeNodes();Q=this.else=Array.isArray($)?new uX($):$}if(Q){if(X===!1)return Q instanceof j1?Q:Q.nodes;if(this.nodes.length)return this;return new j1(MG(X),Q instanceof j1?[Q]:Q.nodes)}if(X===!1||!this.nodes.length)return;return this}optimizeNames(X,Q){var $;if(this.else=($=this.else)===null||$===void 0?void 0:$.optimizeNames(X,Q),!(super.optimizeNames(X,Q)||this.else))return;return this.condition=u6(this.condition,X,Q),this}get names(){let X=super.names;if(I8(X,this.condition),this.else)J6(X,this.else.names);return X}}j1.kind="if";class h6 extends c1{}h6.kind="for";class OG extends h6{constructor(X){super();this.iteration=X}render(X){return`for(${this.iteration})`+super.render(X)}optimizeNames(X,Q){if(!super.optimizeNames(X,Q))return;return this.iteration=u6(this.iteration,X,Q),this}get names(){return J6(super.names,this.iteration.names)}}class DG extends h6{constructor(X,Q,$,Y){super();this.varKind=X,this.name=Q,this.from=$,this.to=Y}render(X){let Q=X.es5?e0.varKinds.var:this.varKind,{name:$,from:Y,to:W}=this;return`for(${Q} ${$}=${Y}; ${$}<${W}; ${$}++)`+super.render(X)}get names(){let X=I8(super.names,this.from);return I8(X,this.to)}}class YY extends h6{constructor(X,Q,$,Y){super();this.loop=X,this.varKind=Q,this.name=$,this.iterable=Y}render(X){return`for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})`+super.render(X)}optimizeNames(X,Q){if(!super.optimizeNames(X,Q))return;return this.iterable=u6(this.iterable,X,Q),this}get names(){return J6(super.names,this.iterable.names)}}class M8 extends c1{constructor(X,Q,$){super();this.name=X,this.args=Q,this.async=$}render(X){return`${this.async?"async ":""}function ${this.name}(${this.args})`+super.render(X)}}M8.kind="func";class j8 extends P8{render(X){return"return "+super.render(X)}}j8.kind="return";class AG extends c1{render(X){let Q="try"+super.render(X);if(this.catch)Q+=this.catch.render(X);if(this.finally)Q+=this.finally.render(X);return Q}optimizeNodes(){var X,Q;return super.optimizeNodes(),(X=this.catch)===null||X===void 0||X.optimizeNodes(),(Q=this.finally)===null||Q===void 0||Q.optimizeNodes(),this}optimizeNames(X,Q){var $,Y;return super.optimizeNames(X,Q),($=this.catch)===null||$===void 0||$.optimizeNames(X,Q),(Y=this.finally)===null||Y===void 0||Y.optimizeNames(X,Q),this}get names(){let X=super.names;if(this.catch)J6(X,this.catch.names);if(this.finally)J6(X,this.finally.names);return X}}class R8 extends c1{constructor(X){super();this.error=X}render(X){return`catch(${this.error})`+super.render(X)}}R8.kind="catch";class E8 extends c1{render(X){return"finally"+super.render(X)}}E8.kind="finally";class wG{constructor(X,Q={}){this._values={},this._blockStarts=[],this._constants={},this.opts={...Q,_n:Q.lines?`
`:""},this._extScope=X,this._scope=new e0.Scope({parent:X}),this._nodes=[new NG]}toString(){return this._root.render(this.opts)}name(X){return this._scope.name(X)}scopeName(X){return this._extScope.name(X)}scopeValue(X,Q){let $=this._extScope.value(X,Q);return(this._values[$.prefix]||(this._values[$.prefix]=new Set)).add($),$}getScopeValue(X,Q){return this._extScope.getValue(X,Q)}scopeRefs(X){return this._extScope.scopeRefs(X,this._values)}scopeCode(){return this._extScope.scopeCode(this._values)}_def(X,Q,$,Y){let W=this._scope.toName(Q);if($!==void 0&&Y)this._constants[W.str]=$;return this._leafNode(new KG(X,W,$)),W}const(X,Q,$){return this._def(e0.varKinds.const,X,Q,$)}let(X,Q,$){return this._def(e0.varKinds.let,X,Q,$)}var(X,Q,$){return this._def(e0.varKinds.var,X,Q,$)}assign(X,Q,$){return this._leafNode(new JY(X,Q,$))}add(X,Q){return this._leafNode(new UG(X,y0.operators.ADD,Q))}code(X){if(typeof X=="function")X();else if(X!==t.nil)this._leafNode(new FG(X));return this}object(...X){let Q=["{"];for(let[$,Y]of X){if(Q.length>1)Q.push(",");if(Q.push($),$!==Y||this.opts.es5)Q.push(":"),(0,t.addCodeArg)(Q,Y)}return Q.push("}"),new t._Code(Q)}if(X,Q,$){if(this._blockNode(new j1(X)),Q&&$)this.code(Q).else().code($).endIf();else if(Q)this.code(Q).endIf();else if($)throw Error('CodeGen: "else" body without "then" body');return this}elseIf(X){return this._elseNode(new j1(X))}else(){return this._elseNode(new uX)}endIf(){return this._endBlockNode(j1,uX)}_for(X,Q){if(this._blockNode(X),Q)this.code(Q).endFor();return this}for(X,Q){return this._for(new OG(X),Q)}forRange(X,Q,$,Y,W=this.opts.es5?e0.varKinds.var:e0.varKinds.let){let J=this._scope.toName(X);return this._for(new DG(W,J,Q,$),()=>Y(J))}forOf(X,Q,$,Y=e0.varKinds.const){let W=this._scope.toName(X);if(this.opts.es5){let J=Q instanceof t.Name?Q:this.var("_arr",Q);return this.forRange("_i",0,t._`${J}.length`,(G)=>{this.var(W,t._`${J}[${G}]`),$(W)})}return this._for(new YY("of",Y,W,Q),()=>$(W))}forIn(X,Q,$,Y=this.opts.es5?e0.varKinds.var:e0.varKinds.const){if(this.opts.ownProperties)return this.forOf(X,t._`Object.keys(${Q})`,$);let W=this._scope.toName(X);return this._for(new YY("in",Y,W,Q),()=>$(W))}endFor(){return this._endBlockNode(h6)}label(X){return this._leafNode(new VG(X))}break(X){return this._leafNode(new LG(X))}return(X){let Q=new j8;if(this._blockNode(Q),this.code(X),Q.nodes.length!==1)throw Error('CodeGen: "return" should have one node');return this._endBlockNode(j8)}try(X,Q,$){if(!Q&&!$)throw Error('CodeGen: "try" without "catch" and "finally"');let Y=new AG;if(this._blockNode(Y),this.code(X),Q){let W=this.name("e");this._currNode=Y.catch=new R8(W),Q(W)}if($)this._currNode=Y.finally=new E8,this.code($);return this._endBlockNode(R8,E8)}throw(X){return this._leafNode(new qG(X))}block(X,Q){if(this._blockStarts.push(this._nodes.length),X)this.code(X).endBlock(Q);return this}endBlock(X){let Q=this._blockStarts.pop();if(Q===void 0)throw Error("CodeGen: not in self-balancing block");let $=this._nodes.length-Q;if($<0||X!==void 0&&$!==X)throw Error(`CodeGen: wrong number of nodes: ${$} vs ${X} expected`);return this._nodes.length=Q,this}func(X,Q=t.nil,$,Y){if(this._blockNode(new M8(X,Q,$)),Y)this.code(Y).endFunc();return this}endFunc(){return this._endBlockNode(M8)}optimize(X=1){while(X-- >0)this._root.optimizeNodes(),this._root.optimizeNames(this._root.names,this._constants)}_leafNode(X){return this._currNode.nodes.push(X),this}_blockNode(X){this._currNode.nodes.push(X),this._nodes.push(X)}_endBlockNode(X,Q){let $=this._currNode;if($ instanceof X||Q&&$ instanceof Q)return this._nodes.pop(),this;throw Error(`CodeGen: not in block "${Q?`${X.kind}/${Q.kind}`:X.kind}"`)}_elseNode(X){let Q=this._currNode;if(!(Q instanceof j1))throw Error('CodeGen: "else" without "if"');return this._currNode=Q.else=X,this}get _root(){return this._nodes[0]}get _currNode(){let X=this._nodes;return X[X.length-1]}set _currNode(X){let Q=this._nodes;Q[Q.length-1]=X}}y0.CodeGen=wG;function J6(X,Q){for(let $ in Q)X[$]=(X[$]||0)+(Q[$]||0);return X}function I8(X,Q){return Q instanceof t._CodeOrName?J6(X,Q.names):X}function u6(X,Q,$){if(X instanceof t.Name)return Y(X);if(!W(X))return X;return new t._Code(X._items.reduce((J,G)=>{if(G instanceof t.Name)G=Y(G);if(G instanceof t._Code)J.push(...G._items);else J.push(G);return J},[]));function Y(J){let G=$[J.str];if(G===void 0||Q[J.str]!==1)return J;return delete Q[J.str],G}function W(J){return J instanceof t._Code&&J._items.some((G)=>G instanceof t.Name&&Q[G.str]===1&&$[G.str]!==void 0)}}function fN(X,Q){for(let $ in Q)X[$]=(X[$]||0)-(Q[$]||0)}function MG(X){return typeof X=="boolean"||typeof X=="number"||X===null?!X:t._`!${WY(X)}`}y0.not=MG;var hN=jG(y0.operators.AND);function uN(...X){return X.reduce(hN)}y0.and=uN;var lN=jG(y0.operators.OR);function mN(...X){return X.reduce(lN)}y0.or=mN;function jG(X){return(Q,$)=>Q===t.nil?$:$===t.nil?Q:t._`${WY(Q)} ${X} ${WY($)}`}function WY(X){return X instanceof t.Name?X:t._`(${X})`}});var e=P((kG)=>{Object.defineProperty(kG,"__esModule",{value:!0});kG.checkStrictMode=kG.getErrorPath=kG.Type=kG.useFunc=kG.setEvaluated=kG.evaluatedPropsToName=kG.mergeEvaluated=kG.eachItem=kG.unescapeJsonPointer=kG.escapeJsonPointer=kG.escapeFragment=kG.unescapeFragment=kG.schemaRefOrVal=kG.schemaHasRulesButRef=kG.schemaHasRules=kG.checkUnknownRules=kG.alwaysValidSchema=kG.toHash=void 0;var $0=c(),iN=hX();function nN(X){let Q={};for(let $ of X)Q[$]=!0;return Q}kG.toHash=nN;function rN(X,Q){if(typeof Q=="boolean")return Q;if(Object.keys(Q).length===0)return!0;return bG(X,Q),!PG(Q,X.self.RULES.all)}kG.alwaysValidSchema=rN;function bG(X,Q=X.schema){let{opts:$,self:Y}=X;if(!$.strictSchema)return;if(typeof Q==="boolean")return;let W=Y.RULES.keywords;for(let J in Q)if(!W[J])CG(X,`unknown keyword: "${J}"`)}kG.checkUnknownRules=bG;function PG(X,Q){if(typeof X=="boolean")return!X;for(let $ in X)if(Q[$])return!0;return!1}kG.schemaHasRules=PG;function oN(X,Q){if(typeof X=="boolean")return!X;for(let $ in X)if($!=="$ref"&&Q.all[$])return!0;return!1}kG.schemaHasRulesButRef=oN;function tN({topSchemaRef:X,schemaPath:Q},$,Y,W){if(!W){if(typeof $=="number"||typeof $=="boolean")return $;if(typeof $=="string")return $0._`${$}`}return $0._`${X}${Q}${(0,$0.getProperty)(Y)}`}kG.schemaRefOrVal=tN;function aN(X){return SG(decodeURIComponent(X))}kG.unescapeFragment=aN;function sN(X){return encodeURIComponent(HY(X))}kG.escapeFragment=sN;function HY(X){if(typeof X=="number")return`${X}`;return X.replace(/~/g,"~0").replace(/\//g,"~1")}kG.escapeJsonPointer=HY;function SG(X){return X.replace(/~1/g,"/").replace(/~0/g,"~")}kG.unescapeJsonPointer=SG;function eN(X,Q){if(Array.isArray(X))for(let $ of X)Q($);else Q(X)}kG.eachItem=eN;function EG({mergeNames:X,mergeToName:Q,mergeValues:$,resultToName:Y}){return(W,J,G,H)=>{let B=G===void 0?J:G instanceof $0.Name?(J instanceof $0.Name?X(W,J,G):Q(W,J,G),G):J instanceof $0.Name?(Q(W,G,J),J):$(J,G);return H===$0.Name&&!(B instanceof $0.Name)?Y(W,B):B}}kG.mergeEvaluated={props:EG({mergeNames:(X,Q,$)=>X.if($0._`${$} !== true && ${Q} !== undefined`,()=>{X.if($0._`${Q} === true`,()=>X.assign($,!0),()=>X.assign($,$0._`${$} || {}`).code($0._`Object.assign(${$}, ${Q})`))}),mergeToName:(X,Q,$)=>X.if($0._`${$} !== true`,()=>{if(Q===!0)X.assign($,!0);else X.assign($,$0._`${$} || {}`),BY(X,$,Q)}),mergeValues:(X,Q)=>X===!0?!0:{...X,...Q},resultToName:ZG}),items:EG({mergeNames:(X,Q,$)=>X.if($0._`${$} !== true && ${Q} !== undefined`,()=>X.assign($,$0._`${Q} === true ? true : ${$} > ${Q} ? ${$} : ${Q}`)),mergeToName:(X,Q,$)=>X.if($0._`${$} !== true`,()=>X.assign($,Q===!0?!0:$0._`${$} > ${Q} ? ${$} : ${Q}`)),mergeValues:(X,Q)=>X===!0?!0:Math.max(X,Q),resultToName:(X,Q)=>X.var("items",Q)})};function ZG(X,Q){if(Q===!0)return X.var("props",!0);let $=X.var("props",$0._`{}`);if(Q!==void 0)BY(X,$,Q);return $}kG.evaluatedPropsToName=ZG;function BY(X,Q,$){Object.keys($).forEach((Y)=>X.assign($0._`${Q}${(0,$0.getProperty)(Y)}`,!0))}kG.setEvaluated=BY;var IG={};function XO(X,Q){return X.scopeValue("func",{ref:Q,code:IG[Q.code]||(IG[Q.code]=new iN._Code(Q.code))})}kG.useFunc=XO;var GY;(function(X){X[X.Num=0]="Num",X[X.Str=1]="Str"})(GY||(kG.Type=GY={}));function QO(X,Q,$){if(X instanceof $0.Name){let Y=Q===GY.Num;return $?Y?$0._`"[" + ${X} + "]"`:$0._`"['" + ${X} + "']"`:Y?$0._`"/" + ${X}`:$0._`"/" + ${X}.replace(/~/g, "~0").replace(/\\//g, "~1")`}return $?(0,$0.getProperty)(X).toString():"/"+HY(X)}kG.getErrorPath=QO;function CG(X,Q,$=X.opts.strictSchema){if(!$)return;if(Q=`strict mode: ${Q}`,$===!0)throw Error(Q);X.self.logger.warn(Q)}kG.checkStrictMode=CG});var R1=P((TG)=>{Object.defineProperty(TG,"__esModule",{value:!0});var P0=c(),AO={data:new P0.Name("data"),valCxt:new P0.Name("valCxt"),instancePath:new P0.Name("instancePath"),parentData:new P0.Name("parentData"),parentDataProperty:new P0.Name("parentDataProperty"),rootData:new P0.Name("rootData"),dynamicAnchors:new P0.Name("dynamicAnchors"),vErrors:new P0.Name("vErrors"),errors:new P0.Name("errors"),this:new P0.Name("this"),self:new P0.Name("self"),scope:new P0.Name("scope"),json:new P0.Name("json"),jsonPos:new P0.Name("jsonPos"),jsonLen:new P0.Name("jsonLen"),jsonPart:new P0.Name("jsonPart")};TG.default=AO});var lX=P((gG)=>{Object.defineProperty(gG,"__esModule",{value:!0});gG.extendErrors=gG.resetErrorsCount=gG.reportExtraError=gG.reportError=gG.keyword$DataError=gG.keywordError=void 0;var a=c(),Z8=e(),v0=R1();gG.keywordError={message:({keyword:X})=>a.str`must pass "${X}" keyword validation`};gG.keyword$DataError={message:({keyword:X,schemaType:Q})=>Q?a.str`"${X}" keyword must be ${Q} ($data)`:a.str`"${X}" keyword is invalid ($data)`};function MO(X,Q=gG.keywordError,$,Y){let{it:W}=X,{gen:J,compositeRule:G,allErrors:H}=W,B=yG(X,Q,$);if(Y!==null&&Y!==void 0?Y:G||H)_G(J,B);else xG(W,a._`[${B}]`)}gG.reportError=MO;function jO(X,Q=gG.keywordError,$){let{it:Y}=X,{gen:W,compositeRule:J,allErrors:G}=Y,H=yG(X,Q,$);if(_G(W,H),!(J||G))xG(Y,v0.default.vErrors)}gG.reportExtraError=jO;function RO(X,Q){X.assign(v0.default.errors,Q),X.if(a._`${v0.default.vErrors} !== null`,()=>X.if(Q,()=>X.assign(a._`${v0.default.vErrors}.length`,Q),()=>X.assign(v0.default.vErrors,null)))}gG.resetErrorsCount=RO;function EO({gen:X,keyword:Q,schemaValue:$,data:Y,errsCount:W,it:J}){if(W===void 0)throw Error("ajv implementation error");let G=X.name("err");X.forRange("i",W,v0.default.errors,(H)=>{if(X.const(G,a._`${v0.default.vErrors}[${H}]`),X.if(a._`${G}.instancePath === undefined`,()=>X.assign(a._`${G}.instancePath`,(0,a.strConcat)(v0.default.instancePath,J.errorPath))),X.assign(a._`${G}.schemaPath`,a.str`${J.errSchemaPath}/${Q}`),J.opts.verbose)X.assign(a._`${G}.schema`,$),X.assign(a._`${G}.data`,Y)})}gG.extendErrors=EO;function _G(X,Q){let $=X.const("err",Q);X.if(a._`${v0.default.vErrors} === null`,()=>X.assign(v0.default.vErrors,a._`[${$}]`),a._`${v0.default.vErrors}.push(${$})`),X.code(a._`${v0.default.errors}++`)}function xG(X,Q){let{gen:$,validateName:Y,schemaEnv:W}=X;if(W.$async)$.throw(a._`new ${X.ValidationError}(${Q})`);else $.assign(a._`${Y}.errors`,Q),$.return(!1)}var G6={keyword:new a.Name("keyword"),schemaPath:new a.Name("schemaPath"),params:new a.Name("params"),propertyName:new a.Name("propertyName"),message:new a.Name("message"),schema:new a.Name("schema"),parentSchema:new a.Name("parentSchema")};function yG(X,Q,$){let{createErrors:Y}=X.it;if(Y===!1)return a._`{}`;return IO(X,Q,$)}function IO(X,Q,$={}){let{gen:Y,it:W}=X,J=[bO(W,$),PO(X,$)];return SO(X,Q,J),Y.object(...J)}function bO({errorPath:X},{instancePath:Q}){let $=Q?a.str`${X}${(0,Z8.getErrorPath)(Q,Z8.Type.Str)}`:X;return[v0.default.instancePath,(0,a.strConcat)(v0.default.instancePath,$)]}function PO({keyword:X,it:{errSchemaPath:Q}},{schemaPath:$,parentSchema:Y}){let W=Y?Q:a.str`${Q}/${X}`;if($)W=a.str`${W}${(0,Z8.getErrorPath)($,Z8.Type.Str)}`;return[G6.schemaPath,W]}function SO(X,{params:Q,message:$},Y){let{keyword:W,data:J,schemaValue:G,it:H}=X,{opts:B,propertyName:z,topSchemaRef:K,schemaPath:V}=H;if(Y.push([G6.keyword,W],[G6.params,typeof Q=="function"?Q(X):Q||a._`{}`]),B.messages)Y.push([G6.message,typeof $=="function"?$(X):$]);if(B.verbose)Y.push([G6.schema,G],[G6.parentSchema,a._`${K}${V}`],[v0.default.data,J]);if(z)Y.push([G6.propertyName,z])}});var mG=P((uG)=>{Object.defineProperty(uG,"__esModule",{value:!0});uG.boolOrEmptySchema=uG.topBoolOrEmptySchema=void 0;var TO=lX(),_O=c(),xO=R1(),yO={message:"boolean schema is false"};function gO(X){let{gen:Q,schema:$,validateName:Y}=X;if($===!1)hG(X,!1);else if(typeof $=="object"&&$.$async===!0)Q.return(xO.default.data);else Q.assign(_O._`${Y}.errors`,null),Q.return(!0)}uG.topBoolOrEmptySchema=gO;function fO(X,Q){let{gen:$,schema:Y}=X;if(Y===!1)$.var(Q,!1),hG(X);else $.var(Q,!0)}uG.boolOrEmptySchema=fO;function hG(X,Q){let{gen:$,data:Y}=X,W={gen:$,keyword:"false schema",data:Y,schema:!1,schemaCode:!1,schemaValue:!1,params:{},it:X};(0,TO.reportError)(W,yO,void 0,Q)}});var KY=P((cG)=>{Object.defineProperty(cG,"__esModule",{value:!0});cG.getRules=cG.isJSONType=void 0;var uO=["string","number","integer","boolean","null","object","array"],lO=new Set(uO);function mO(X){return typeof X=="string"&&lO.has(X)}cG.isJSONType=mO;function cO(){let X={number:{type:"number",rules:[]},string:{type:"string",rules:[]},array:{type:"array",rules:[]},object:{type:"object",rules:[]}};return{types:{...X,integer:!0,boolean:!0,null:!0},rules:[{rules:[]},X.number,X.string,X.array,X.object],post:{rules:[]},all:{},keywords:{}}}cG.getRules=cO});var UY=P((nG)=>{Object.defineProperty(nG,"__esModule",{value:!0});nG.shouldUseRule=nG.shouldUseGroup=nG.schemaHasRulesForType=void 0;function dO({schema:X,self:Q},$){let Y=Q.RULES.types[$];return Y&&Y!==!0&&dG(X,Y)}nG.schemaHasRulesForType=dO;function dG(X,Q){return Q.rules.some(($)=>iG(X,$))}nG.shouldUseGroup=dG;function iG(X,Q){var $;return X[Q.keyword]!==void 0||(($=Q.definition.implements)===null||$===void 0?void 0:$.some((Y)=>X[Y]!==void 0))}nG.shouldUseRule=iG});var mX=P((sG)=>{Object.defineProperty(sG,"__esModule",{value:!0});sG.reportTypeError=sG.checkDataTypes=sG.checkDataType=sG.coerceAndCheckDataType=sG.getJSONTypes=sG.getSchemaTypes=sG.DataType=void 0;var rO=KY(),oO=UY(),tO=lX(),m=c(),oG=e(),l6;(function(X){X[X.Correct=0]="Correct",X[X.Wrong=1]="Wrong"})(l6||(sG.DataType=l6={}));function aO(X){let Q=tG(X.type);if(Q.includes("null")){if(X.nullable===!1)throw Error("type: null contradicts nullable: false")}else{if(!Q.length&&X.nullable!==void 0)throw Error('"nullable" cannot be used without "type"');if(X.nullable===!0)Q.push("null")}return Q}sG.getSchemaTypes=aO;function tG(X){let Q=Array.isArray(X)?X:X?[X]:[];if(Q.every(rO.isJSONType))return Q;throw Error("type must be JSONType or JSONType[]: "+Q.join(","))}sG.getJSONTypes=tG;function sO(X,Q){let{gen:$,data:Y,opts:W}=X,J=eO(Q,W.coerceTypes),G=Q.length>0&&!(J.length===0&&Q.length===1&&(0,oO.schemaHasRulesForType)(X,Q[0]));if(G){let H=LY(Q,Y,W.strictNumbers,l6.Wrong);$.if(H,()=>{if(J.length)XD(X,Q,J);else qY(X)})}return G}sG.coerceAndCheckDataType=sO;var aG=new Set(["string","number","integer","boolean","null"]);function eO(X,Q){return Q?X.filter(($)=>aG.has($)||Q==="array"&&$==="array"):[]}function XD(X,Q,$){let{gen:Y,data:W,opts:J}=X,G=Y.let("dataType",m._`typeof ${W}`),H=Y.let("coerced",m._`undefined`);if(J.coerceTypes==="array")Y.if(m._`${G} == 'object' && Array.isArray(${W}) && ${W}.length == 1`,()=>Y.assign(W,m._`${W}[0]`).assign(G,m._`typeof ${W}`).if(LY(Q,W,J.strictNumbers),()=>Y.assign(H,W)));Y.if(m._`${H} !== undefined`);for(let z of $)if(aG.has(z)||z==="array"&&J.coerceTypes==="array")B(z);Y.else(),qY(X),Y.endIf(),Y.if(m._`${H} !== undefined`,()=>{Y.assign(W,H),QD(X,H)});function B(z){switch(z){case"string":Y.elseIf(m._`${G} == "number" || ${G} == "boolean"`).assign(H,m._`"" + ${W}`).elseIf(m._`${W} === null`).assign(H,m._`""`);return;case"number":Y.elseIf(m._`${G} == "boolean" || ${W} === null
              || (${G} == "string" && ${W} && ${W} == +${W})`).assign(H,m._`+${W}`);return;case"integer":Y.elseIf(m._`${G} === "boolean" || ${W} === null
              || (${G} === "string" && ${W} && ${W} == +${W} && !(${W} % 1))`).assign(H,m._`+${W}`);return;case"boolean":Y.elseIf(m._`${W} === "false" || ${W} === 0 || ${W} === null`).assign(H,!1).elseIf(m._`${W} === "true" || ${W} === 1`).assign(H,!0);return;case"null":Y.elseIf(m._`${W} === "" || ${W} === 0 || ${W} === false`),Y.assign(H,null);return;case"array":Y.elseIf(m._`${G} === "string" || ${G} === "number"
              || ${G} === "boolean" || ${W} === null`).assign(H,m._`[${W}]`)}}}function QD({gen:X,parentData:Q,parentDataProperty:$},Y){X.if(m._`${Q} !== undefined`,()=>X.assign(m._`${Q}[${$}]`,Y))}function VY(X,Q,$,Y=l6.Correct){let W=Y===l6.Correct?m.operators.EQ:m.operators.NEQ,J;switch(X){case"null":return m._`${Q} ${W} null`;case"array":J=m._`Array.isArray(${Q})`;break;case"object":J=m._`${Q} && typeof ${Q} == "object" && !Array.isArray(${Q})`;break;case"integer":J=G(m._`!(${Q} % 1) && !isNaN(${Q})`);break;case"number":J=G();break;default:return m._`typeof ${Q} ${W} ${X}`}return Y===l6.Correct?J:(0,m.not)(J);function G(H=m.nil){return(0,m.and)(m._`typeof ${Q} == "number"`,H,$?m._`isFinite(${Q})`:m.nil)}}sG.checkDataType=VY;function LY(X,Q,$,Y){if(X.length===1)return VY(X[0],Q,$,Y);let W,J=(0,oG.toHash)(X);if(J.array&&J.object){let G=m._`typeof ${Q} != "object"`;W=J.null?G:m._`!${Q} || ${G}`,delete J.null,delete J.array,delete J.object}else W=m.nil;if(J.number)delete J.integer;for(let G in J)W=(0,m.and)(W,VY(G,Q,$,Y));return W}sG.checkDataTypes=LY;var $D={message:({schema:X})=>`must be ${X}`,params:({schema:X,schemaValue:Q})=>typeof X=="string"?m._`{type: ${X}}`:m._`{type: ${Q}}`};function qY(X){let Q=YD(X);(0,tO.reportError)(Q,$D)}sG.reportTypeError=qY;function YD(X){let{gen:Q,data:$,schema:Y}=X,W=(0,oG.schemaRefOrVal)(X,Y,"type");return{gen:Q,keyword:"type",data:$,schema:Y.type,schemaCode:W,schemaValue:W,parentSchema:Y,params:{},it:X}}});var Y3=P((Q3)=>{Object.defineProperty(Q3,"__esModule",{value:!0});Q3.assignDefaults=void 0;var m6=c(),KD=e();function UD(X,Q){let{properties:$,items:Y}=X.schema;if(Q==="object"&&$)for(let W in $)X3(X,W,$[W].default);else if(Q==="array"&&Array.isArray(Y))Y.forEach((W,J)=>X3(X,J,W.default))}Q3.assignDefaults=UD;function X3(X,Q,$){let{gen:Y,compositeRule:W,data:J,opts:G}=X;if($===void 0)return;let H=m6._`${J}${(0,m6.getProperty)(Q)}`;if(W){(0,KD.checkStrictMode)(X,`default is ignored for: ${H}`);return}let B=m6._`${H} === undefined`;if(G.useDefaults==="empty")B=m6._`${B} || ${H} === null || ${H} === ""`;Y.if(B,m6._`${H} = ${(0,m6.stringify)($)}`)}});var d0=P((G3)=>{Object.defineProperty(G3,"__esModule",{value:!0});G3.validateUnion=G3.validateArray=G3.usePattern=G3.callValidateCode=G3.schemaProperties=G3.allSchemaProperties=G3.noPropertyInData=G3.propertyInData=G3.isOwnProperty=G3.hasPropFunc=G3.reportMissingProp=G3.checkMissingProp=G3.checkReportMissingProp=void 0;var G0=c(),FY=e(),p1=R1(),VD=e();function LD(X,Q){let{gen:$,data:Y,it:W}=X;$.if(OY($,Y,Q,W.opts.ownProperties),()=>{X.setParams({missingProperty:G0._`${Q}`},!0),X.error()})}G3.checkReportMissingProp=LD;function qD({gen:X,data:Q,it:{opts:$}},Y,W){return(0,G0.or)(...Y.map((J)=>(0,G0.and)(OY(X,Q,J,$.ownProperties),G0._`${W} = ${J}`)))}G3.checkMissingProp=qD;function FD(X,Q){X.setParams({missingProperty:Q},!0),X.error()}G3.reportMissingProp=FD;function W3(X){return X.scopeValue("func",{ref:Object.prototype.hasOwnProperty,code:G0._`Object.prototype.hasOwnProperty`})}G3.hasPropFunc=W3;function NY(X,Q,$){return G0._`${W3(X)}.call(${Q}, ${$})`}G3.isOwnProperty=NY;function ND(X,Q,$,Y){let W=G0._`${Q}${(0,G0.getProperty)($)} !== undefined`;return Y?G0._`${W} && ${NY(X,Q,$)}`:W}G3.propertyInData=ND;function OY(X,Q,$,Y){let W=G0._`${Q}${(0,G0.getProperty)($)} === undefined`;return Y?(0,G0.or)(W,(0,G0.not)(NY(X,Q,$))):W}G3.noPropertyInData=OY;function J3(X){return X?Object.keys(X).filter((Q)=>Q!=="__proto__"):[]}G3.allSchemaProperties=J3;function OD(X,Q){return J3(Q).filter(($)=>!(0,FY.alwaysValidSchema)(X,Q[$]))}G3.schemaProperties=OD;function DD({schemaCode:X,data:Q,it:{gen:$,topSchemaRef:Y,schemaPath:W,errorPath:J},it:G},H,B,z){let K=z?G0._`${X}, ${Q}, ${Y}${W}`:Q,V=[[p1.default.instancePath,(0,G0.strConcat)(p1.default.instancePath,J)],[p1.default.parentData,G.parentData],[p1.default.parentDataProperty,G.parentDataProperty],[p1.default.rootData,p1.default.rootData]];if(G.opts.dynamicRef)V.push([p1.default.dynamicAnchors,p1.default.dynamicAnchors]);let L=G0._`${K}, ${$.object(...V)}`;return B!==G0.nil?G0._`${H}.call(${B}, ${L})`:G0._`${H}(${L})`}G3.callValidateCode=DD;var AD=G0._`new RegExp`;function wD({gen:X,it:{opts:Q}},$){let Y=Q.unicodeRegExp?"u":"",{regExp:W}=Q.code,J=W($,Y);return X.scopeValue("pattern",{key:J.toString(),ref:J,code:G0._`${W.code==="new RegExp"?AD:(0,VD.useFunc)(X,W)}(${$}, ${Y})`})}G3.usePattern=wD;function MD(X){let{gen:Q,data:$,keyword:Y,it:W}=X,J=Q.name("valid");if(W.allErrors){let H=Q.let("valid",!0);return G(()=>Q.assign(H,!1)),H}return Q.var(J,!0),G(()=>Q.break()),J;function G(H){let B=Q.const("len",G0._`${$}.length`);Q.forRange("i",0,B,(z)=>{X.subschema({keyword:Y,dataProp:z,dataPropType:FY.Type.Num},J),Q.if((0,G0.not)(J),H)})}}G3.validateArray=MD;function jD(X){let{gen:Q,schema:$,keyword:Y,it:W}=X;if(!Array.isArray($))throw Error("ajv implementation error");if($.some((B)=>(0,FY.alwaysValidSchema)(W,B))&&!W.opts.unevaluated)return;let G=Q.let("valid",!1),H=Q.name("_valid");Q.block(()=>$.forEach((B,z)=>{let K=X.subschema({keyword:Y,schemaProp:z,compositeRule:!0},H);if(Q.assign(G,G0._`${G} || ${H}`),!X.mergeValidEvaluated(K,H))Q.if((0,G0.not)(G))})),X.result(G,()=>X.reset(),()=>X.error(!0))}G3.validateUnion=jD});var V3=P((K3)=>{Object.defineProperty(K3,"__esModule",{value:!0});K3.validateKeywordUsage=K3.validSchemaType=K3.funcKeywordCode=K3.macroKeywordCode=void 0;var T0=c(),H6=R1(),xD=d0(),yD=lX();function gD(X,Q){let{gen:$,keyword:Y,schema:W,parentSchema:J,it:G}=X,H=Q.macro.call(G.self,W,J,G),B=z3($,Y,H);if(G.opts.validateSchema!==!1)G.self.validateSchema(H,!0);let z=$.name("valid");X.subschema({schema:H,schemaPath:T0.nil,errSchemaPath:`${G.errSchemaPath}/${Y}`,topSchemaRef:B,compositeRule:!0},z),X.pass(z,()=>X.error(!0))}K3.macroKeywordCode=gD;function fD(X,Q){var $;let{gen:Y,keyword:W,schema:J,parentSchema:G,$data:H,it:B}=X;uD(B,Q);let z=!H&&Q.compile?Q.compile.call(B.self,J,G,B):Q.validate,K=z3(Y,W,z),V=Y.let("valid");X.block$data(V,L),X.ok(($=Q.valid)!==null&&$!==void 0?$:V);function L(){if(Q.errors===!1){if(q(),Q.modifying)B3(X);N(()=>X.error())}else{let A=Q.async?U():F();if(Q.modifying)B3(X);N(()=>hD(X,A))}}function U(){let A=Y.let("ruleErrs",null);return Y.try(()=>q(T0._`await `),(M)=>Y.assign(V,!1).if(T0._`${M} instanceof ${B.ValidationError}`,()=>Y.assign(A,T0._`${M}.errors`),()=>Y.throw(M))),A}function F(){let A=T0._`${K}.errors`;return Y.assign(A,null),q(T0.nil),A}function q(A=Q.async?T0._`await `:T0.nil){let M=B.opts.passContext?H6.default.this:H6.default.self,R=!(("compile"in Q)&&!H||Q.schema===!1);Y.assign(V,T0._`${A}${(0,xD.callValidateCode)(X,K,M,R)}`,Q.modifying)}function N(A){var M;Y.if((0,T0.not)((M=Q.valid)!==null&&M!==void 0?M:V),A)}}K3.funcKeywordCode=fD;function B3(X){let{gen:Q,data:$,it:Y}=X;Q.if(Y.parentData,()=>Q.assign($,T0._`${Y.parentData}[${Y.parentDataProperty}]`))}function hD(X,Q){let{gen:$}=X;$.if(T0._`Array.isArray(${Q})`,()=>{$.assign(H6.default.vErrors,T0._`${H6.default.vErrors} === null ? ${Q} : ${H6.default.vErrors}.concat(${Q})`).assign(H6.default.errors,T0._`${H6.default.vErrors}.length`),(0,yD.extendErrors)(X)},()=>X.error())}function uD({schemaEnv:X},Q){if(Q.async&&!X.$async)throw Error("async keyword in sync schema")}function z3(X,Q,$){if($===void 0)throw Error(`keyword "${Q}" failed to compile`);return X.scopeValue("keyword",typeof $=="function"?{ref:$}:{ref:$,code:(0,T0.stringify)($)})}function lD(X,Q,$=!1){return!Q.length||Q.some((Y)=>Y==="array"?Array.isArray(X):Y==="object"?X&&typeof X=="object"&&!Array.isArray(X):typeof X==Y||$&&typeof X>"u")}K3.validSchemaType=lD;function mD({schema:X,opts:Q,self:$,errSchemaPath:Y},W,J){if(Array.isArray(W.keyword)?!W.keyword.includes(J):W.keyword!==J)throw Error("ajv implementation error");let G=W.dependencies;if(G===null||G===void 0?void 0:G.some((H)=>!Object.prototype.hasOwnProperty.call(X,H)))throw Error(`parent schema must have dependencies of ${J}: ${G.join(",")}`);if(W.validateSchema){if(!W.validateSchema(X[J])){let B=`keyword "${J}" value is invalid at path "${Y}": `+$.errorsText(W.validateSchema.errors);if(Q.validateSchema==="log")$.logger.error(B);else throw Error(B)}}}K3.validateKeywordUsage=mD});var N3=P((q3)=>{Object.defineProperty(q3,"__esModule",{value:!0});q3.extendSubschemaMode=q3.extendSubschemaData=q3.getSubschema=void 0;var U1=c(),L3=e();function iD(X,{keyword:Q,schemaProp:$,schema:Y,schemaPath:W,errSchemaPath:J,topSchemaRef:G}){if(Q!==void 0&&Y!==void 0)throw Error('both "keyword" and "schema" passed, only one allowed');if(Q!==void 0){let H=X.schema[Q];return $===void 0?{schema:H,schemaPath:U1._`${X.schemaPath}${(0,U1.getProperty)(Q)}`,errSchemaPath:`${X.errSchemaPath}/${Q}`}:{schema:H[$],schemaPath:U1._`${X.schemaPath}${(0,U1.getProperty)(Q)}${(0,U1.getProperty)($)}`,errSchemaPath:`${X.errSchemaPath}/${Q}/${(0,L3.escapeFragment)($)}`}}if(Y!==void 0){if(W===void 0||J===void 0||G===void 0)throw Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');return{schema:Y,schemaPath:W,topSchemaRef:G,errSchemaPath:J}}throw Error('either "keyword" or "schema" must be passed')}q3.getSubschema=iD;function nD(X,Q,{dataProp:$,dataPropType:Y,data:W,dataTypes:J,propertyName:G}){if(W!==void 0&&$!==void 0)throw Error('both "data" and "dataProp" passed, only one allowed');let{gen:H}=Q;if($!==void 0){let{errorPath:z,dataPathArr:K,opts:V}=Q,L=H.let("data",U1._`${Q.data}${(0,U1.getProperty)($)}`,!0);B(L),X.errorPath=U1.str`${z}${(0,L3.getErrorPath)($,Y,V.jsPropertySyntax)}`,X.parentDataProperty=U1._`${$}`,X.dataPathArr=[...K,X.parentDataProperty]}if(W!==void 0){let z=W instanceof U1.Name?W:H.let("data",W,!0);if(B(z),G!==void 0)X.propertyName=G}if(J)X.dataTypes=J;function B(z){X.data=z,X.dataLevel=Q.dataLevel+1,X.dataTypes=[],Q.definedProperties=new Set,X.parentData=Q.data,X.dataNames=[...Q.dataNames,z]}}q3.extendSubschemaData=nD;function rD(X,{jtdDiscriminator:Q,jtdMetadata:$,compositeRule:Y,createErrors:W,allErrors:J}){if(Y!==void 0)X.compositeRule=Y;if(W!==void 0)X.createErrors=W;if(J!==void 0)X.allErrors=J;X.jtdDiscriminator=Q,X.jtdMetadata=$}q3.extendSubschemaMode=rD});var DY=P((ev,O3)=>{O3.exports=function X(Q,$){if(Q===$)return!0;if(Q&&$&&typeof Q=="object"&&typeof $=="object"){if(Q.constructor!==$.constructor)return!1;var Y,W,J;if(Array.isArray(Q)){if(Y=Q.length,Y!=$.length)return!1;for(W=Y;W--!==0;)if(!X(Q[W],$[W]))return!1;return!0}if(Q.constructor===RegExp)return Q.source===$.source&&Q.flags===$.flags;if(Q.valueOf!==Object.prototype.valueOf)return Q.valueOf()===$.valueOf();if(Q.toString!==Object.prototype.toString)return Q.toString()===$.toString();if(J=Object.keys(Q),Y=J.length,Y!==Object.keys($).length)return!1;for(W=Y;W--!==0;)if(!Object.prototype.hasOwnProperty.call($,J[W]))return!1;for(W=Y;W--!==0;){var G=J[W];if(!X(Q[G],$[G]))return!1}return!0}return Q!==Q&&$!==$}});var A3=P((XT,D3)=>{var d1=D3.exports=function(X,Q,$){if(typeof Q=="function")$=Q,Q={};$=Q.cb||$;var Y=typeof $=="function"?$:$.pre||function(){},W=$.post||function(){};C8(Q,Y,W,X,"",X)};d1.keywords={additionalItems:!0,items:!0,contains:!0,additionalProperties:!0,propertyNames:!0,not:!0,if:!0,then:!0,else:!0};d1.arrayKeywords={items:!0,allOf:!0,anyOf:!0,oneOf:!0};d1.propsKeywords={$defs:!0,definitions:!0,properties:!0,patternProperties:!0,dependencies:!0};d1.skipKeywords={default:!0,enum:!0,const:!0,required:!0,maximum:!0,minimum:!0,exclusiveMaximum:!0,exclusiveMinimum:!0,multipleOf:!0,maxLength:!0,minLength:!0,pattern:!0,format:!0,maxItems:!0,minItems:!0,uniqueItems:!0,maxProperties:!0,minProperties:!0};function C8(X,Q,$,Y,W,J,G,H,B,z){if(Y&&typeof Y=="object"&&!Array.isArray(Y)){Q(Y,W,J,G,H,B,z);for(var K in Y){var V=Y[K];if(Array.isArray(V)){if(K in d1.arrayKeywords)for(var L=0;L<V.length;L++)C8(X,Q,$,V[L],W+"/"+K+"/"+L,J,W,K,Y,L)}else if(K in d1.propsKeywords){if(V&&typeof V=="object")for(var U in V)C8(X,Q,$,V[U],W+"/"+K+"/"+aD(U),J,W,K,Y,U)}else if(K in d1.keywords||X.allKeys&&!(K in d1.skipKeywords))C8(X,Q,$,V,W+"/"+K,J,W,K,Y)}$(Y,W,J,G,H,B,z)}}function aD(X){return X.replace(/~/g,"~0").replace(/\//g,"~1")}});var cX=P((R3)=>{Object.defineProperty(R3,"__esModule",{value:!0});R3.getSchemaRefs=R3.resolveUrl=R3.normalizeId=R3._getFullPath=R3.getFullPath=R3.inlineRef=void 0;var sD=e(),eD=DY(),XA=A3(),QA=new Set(["type","format","pattern","maxLength","minLength","maxProperties","minProperties","maxItems","minItems","maximum","minimum","uniqueItems","multipleOf","required","enum","const"]);function $A(X,Q=!0){if(typeof X=="boolean")return!0;if(Q===!0)return!AY(X);if(!Q)return!1;return w3(X)<=Q}R3.inlineRef=$A;var YA=new Set(["$ref","$recursiveRef","$recursiveAnchor","$dynamicRef","$dynamicAnchor"]);function AY(X){for(let Q in X){if(YA.has(Q))return!0;let $=X[Q];if(Array.isArray($)&&$.some(AY))return!0;if(typeof $=="object"&&AY($))return!0}return!1}function w3(X){let Q=0;for(let $ in X){if($==="$ref")return 1/0;if(Q++,QA.has($))continue;if(typeof X[$]=="object")(0,sD.eachItem)(X[$],(Y)=>Q+=w3(Y));if(Q===1/0)return 1/0}return Q}function M3(X,Q="",$){if($!==!1)Q=c6(Q);let Y=X.parse(Q);return j3(X,Y)}R3.getFullPath=M3;function j3(X,Q){return X.serialize(Q).split("#")[0]+"#"}R3._getFullPath=j3;var WA=/#\/?$/;function c6(X){return X?X.replace(WA,""):""}R3.normalizeId=c6;function JA(X,Q,$){return $=c6($),X.resolve(Q,$)}R3.resolveUrl=JA;var GA=/^[a-z_][-a-z0-9._]*$/i;function HA(X,Q){if(typeof X=="boolean")return{};let{schemaId:$,uriResolver:Y}=this.opts,W=c6(X[$]||Q),J={"":W},G=M3(Y,W,!1),H={},B=new Set;return XA(X,{allKeys:!0},(V,L,U,F)=>{if(F===void 0)return;let q=G+L,N=J[F];if(typeof V[$]=="string")N=A.call(this,V[$]);M.call(this,V.$anchor),M.call(this,V.$dynamicAnchor),J[L]=N;function A(R){let S=this.opts.uriResolver.resolve;if(R=c6(N?S(N,R):R),B.has(R))throw K(R);B.add(R);let C=this.refs[R];if(typeof C=="string")C=this.refs[C];if(typeof C=="object")z(V,C.schema,R);else if(R!==c6(q))if(R[0]==="#")z(V,H[R],R),H[R]=V;else this.refs[R]=q;return R}function M(R){if(typeof R=="string"){if(!GA.test(R))throw Error(`invalid anchor "${R}"`);A.call(this,`#${R}`)}}}),H;function z(V,L,U){if(L!==void 0&&!eD(V,L))throw K(U)}function K(V){return Error(`reference "${V}" resolves to more than one schema`)}}R3.getSchemaRefs=HA});var iX=P((h3)=>{Object.defineProperty(h3,"__esModule",{value:!0});h3.getData=h3.KeywordCxt=h3.validateFunctionCode=void 0;var Z3=mG(),I3=mX(),MY=UY(),k8=mX(),LA=Y3(),dX=V3(),wY=N3(),_=c(),u=R1(),qA=cX(),E1=e(),pX=lX();function FA(X){if(v3(X)){if(T3(X),k3(X)){DA(X);return}}C3(X,()=>(0,Z3.topBoolOrEmptySchema)(X))}h3.validateFunctionCode=FA;function C3({gen:X,validateName:Q,schema:$,schemaEnv:Y,opts:W},J){if(W.code.es5)X.func(Q,_._`${u.default.data}, ${u.default.valCxt}`,Y.$async,()=>{X.code(_._`"use strict"; ${b3($,W)}`),OA(X,W),X.code(J)});else X.func(Q,_._`${u.default.data}, ${NA(W)}`,Y.$async,()=>X.code(b3($,W)).code(J))}function NA(X){return _._`{${u.default.instancePath}="", ${u.default.parentData}, ${u.default.parentDataProperty}, ${u.default.rootData}=${u.default.data}${X.dynamicRef?_._`, ${u.default.dynamicAnchors}={}`:_.nil}}={}`}function OA(X,Q){X.if(u.default.valCxt,()=>{if(X.var(u.default.instancePath,_._`${u.default.valCxt}.${u.default.instancePath}`),X.var(u.default.parentData,_._`${u.default.valCxt}.${u.default.parentData}`),X.var(u.default.parentDataProperty,_._`${u.default.valCxt}.${u.default.parentDataProperty}`),X.var(u.default.rootData,_._`${u.default.valCxt}.${u.default.rootData}`),Q.dynamicRef)X.var(u.default.dynamicAnchors,_._`${u.default.valCxt}.${u.default.dynamicAnchors}`)},()=>{if(X.var(u.default.instancePath,_._`""`),X.var(u.default.parentData,_._`undefined`),X.var(u.default.parentDataProperty,_._`undefined`),X.var(u.default.rootData,u.default.data),Q.dynamicRef)X.var(u.default.dynamicAnchors,_._`{}`)})}function DA(X){let{schema:Q,opts:$,gen:Y}=X;C3(X,()=>{if($.$comment&&Q.$comment)x3(X);if(RA(X),Y.let(u.default.vErrors,null),Y.let(u.default.errors,0),$.unevaluated)AA(X);_3(X),bA(X)});return}function AA(X){let{gen:Q,validateName:$}=X;X.evaluated=Q.const("evaluated",_._`${$}.evaluated`),Q.if(_._`${X.evaluated}.dynamicProps`,()=>Q.assign(_._`${X.evaluated}.props`,_._`undefined`)),Q.if(_._`${X.evaluated}.dynamicItems`,()=>Q.assign(_._`${X.evaluated}.items`,_._`undefined`))}function b3(X,Q){let $=typeof X=="object"&&X[Q.schemaId];return $&&(Q.code.source||Q.code.process)?_._`/*# sourceURL=${$} */`:_.nil}function wA(X,Q){if(v3(X)){if(T3(X),k3(X)){MA(X,Q);return}}(0,Z3.boolOrEmptySchema)(X,Q)}function k3({schema:X,self:Q}){if(typeof X=="boolean")return!X;for(let $ in X)if(Q.RULES.all[$])return!0;return!1}function v3(X){return typeof X.schema!="boolean"}function MA(X,Q){let{schema:$,gen:Y,opts:W}=X;if(W.$comment&&$.$comment)x3(X);EA(X),IA(X);let J=Y.const("_errs",u.default.errors);_3(X,J),Y.var(Q,_._`${J} === ${u.default.errors}`)}function T3(X){(0,E1.checkUnknownRules)(X),jA(X)}function _3(X,Q){if(X.opts.jtd)return P3(X,[],!1,Q);let $=(0,I3.getSchemaTypes)(X.schema),Y=(0,I3.coerceAndCheckDataType)(X,$);P3(X,$,!Y,Q)}function jA(X){let{schema:Q,errSchemaPath:$,opts:Y,self:W}=X;if(Q.$ref&&Y.ignoreKeywordsWithRef&&(0,E1.schemaHasRulesButRef)(Q,W.RULES))W.logger.warn(`$ref: keywords ignored in schema at path "${$}"`)}function RA(X){let{schema:Q,opts:$}=X;if(Q.default!==void 0&&$.useDefaults&&$.strictSchema)(0,E1.checkStrictMode)(X,"default is ignored in the schema root")}function EA(X){let Q=X.schema[X.opts.schemaId];if(Q)X.baseId=(0,qA.resolveUrl)(X.opts.uriResolver,X.baseId,Q)}function IA(X){if(X.schema.$async&&!X.schemaEnv.$async)throw Error("async schema in sync schema")}function x3({gen:X,schemaEnv:Q,schema:$,errSchemaPath:Y,opts:W}){let J=$.$comment;if(W.$comment===!0)X.code(_._`${u.default.self}.logger.log(${J})`);else if(typeof W.$comment=="function"){let G=_.str`${Y}/$comment`,H=X.scopeValue("root",{ref:Q.root});X.code(_._`${u.default.self}.opts.$comment(${J}, ${G}, ${H}.schema)`)}}function bA(X){let{gen:Q,schemaEnv:$,validateName:Y,ValidationError:W,opts:J}=X;if($.$async)Q.if(_._`${u.default.errors} === 0`,()=>Q.return(u.default.data),()=>Q.throw(_._`new ${W}(${u.default.vErrors})`));else{if(Q.assign(_._`${Y}.errors`,u.default.vErrors),J.unevaluated)PA(X);Q.return(_._`${u.default.errors} === 0`)}}function PA({gen:X,evaluated:Q,props:$,items:Y}){if($ instanceof _.Name)X.assign(_._`${Q}.props`,$);if(Y instanceof _.Name)X.assign(_._`${Q}.items`,Y)}function P3(X,Q,$,Y){let{gen:W,schema:J,data:G,allErrors:H,opts:B,self:z}=X,{RULES:K}=z;if(J.$ref&&(B.ignoreKeywordsWithRef||!(0,E1.schemaHasRulesButRef)(J,K))){W.block(()=>g3(X,"$ref",K.all.$ref.definition));return}if(!B.jtd)SA(X,Q);W.block(()=>{for(let L of K.rules)V(L);V(K.post)});function V(L){if(!(0,MY.shouldUseGroup)(J,L))return;if(L.type){if(W.if((0,k8.checkDataType)(L.type,G,B.strictNumbers)),S3(X,L),Q.length===1&&Q[0]===L.type&&$)W.else(),(0,k8.reportTypeError)(X);W.endIf()}else S3(X,L);if(!H)W.if(_._`${u.default.errors} === ${Y||0}`)}}function S3(X,Q){let{gen:$,schema:Y,opts:{useDefaults:W}}=X;if(W)(0,LA.assignDefaults)(X,Q.type);$.block(()=>{for(let J of Q.rules)if((0,MY.shouldUseRule)(Y,J))g3(X,J.keyword,J.definition,Q.type)})}function SA(X,Q){if(X.schemaEnv.meta||!X.opts.strictTypes)return;if(ZA(X,Q),!X.opts.allowUnionTypes)CA(X,Q);kA(X,X.dataTypes)}function ZA(X,Q){if(!Q.length)return;if(!X.dataTypes.length){X.dataTypes=Q;return}Q.forEach(($)=>{if(!y3(X.dataTypes,$))jY(X,`type "${$}" not allowed by context "${X.dataTypes.join(",")}"`)}),TA(X,Q)}function CA(X,Q){if(Q.length>1&&!(Q.length===2&&Q.includes("null")))jY(X,"use allowUnionTypes to allow union type keyword")}function kA(X,Q){let $=X.self.RULES.all;for(let Y in $){let W=$[Y];if(typeof W=="object"&&(0,MY.shouldUseRule)(X.schema,W)){let{type:J}=W.definition;if(J.length&&!J.some((G)=>vA(Q,G)))jY(X,`missing type "${J.join(",")}" for keyword "${Y}"`)}}}function vA(X,Q){return X.includes(Q)||Q==="number"&&X.includes("integer")}function y3(X,Q){return X.includes(Q)||Q==="integer"&&X.includes("number")}function TA(X,Q){let $=[];for(let Y of X.dataTypes)if(y3(Q,Y))$.push(Y);else if(Q.includes("integer")&&Y==="number")$.push("integer");X.dataTypes=$}function jY(X,Q){let $=X.schemaEnv.baseId+X.errSchemaPath;Q+=` at "${$}" (strictTypes)`,(0,E1.checkStrictMode)(X,Q,X.opts.strictTypes)}class RY{constructor(X,Q,$){if((0,dX.validateKeywordUsage)(X,Q,$),this.gen=X.gen,this.allErrors=X.allErrors,this.keyword=$,this.data=X.data,this.schema=X.schema[$],this.$data=Q.$data&&X.opts.$data&&this.schema&&this.schema.$data,this.schemaValue=(0,E1.schemaRefOrVal)(X,this.schema,$,this.$data),this.schemaType=Q.schemaType,this.parentSchema=X.schema,this.params={},this.it=X,this.def=Q,this.$data)this.schemaCode=X.gen.const("vSchema",f3(this.$data,X));else if(this.schemaCode=this.schemaValue,!(0,dX.validSchemaType)(this.schema,Q.schemaType,Q.allowUndefined))throw Error(`${$} value must be ${JSON.stringify(Q.schemaType)}`);if("code"in Q?Q.trackErrors:Q.errors!==!1)this.errsCount=X.gen.const("_errs",u.default.errors)}result(X,Q,$){this.failResult((0,_.not)(X),Q,$)}failResult(X,Q,$){if(this.gen.if(X),$)$();else this.error();if(Q){if(this.gen.else(),Q(),this.allErrors)this.gen.endIf()}else if(this.allErrors)this.gen.endIf();else this.gen.else()}pass(X,Q){this.failResult((0,_.not)(X),void 0,Q)}fail(X){if(X===void 0){if(this.error(),!this.allErrors)this.gen.if(!1);return}if(this.gen.if(X),this.error(),this.allErrors)this.gen.endIf();else this.gen.else()}fail$data(X){if(!this.$data)return this.fail(X);let{schemaCode:Q}=this;this.fail(_._`${Q} !== undefined && (${(0,_.or)(this.invalid$data(),X)})`)}error(X,Q,$){if(Q){this.setParams(Q),this._error(X,$),this.setParams({});return}this._error(X,$)}_error(X,Q){(X?pX.reportExtraError:pX.reportError)(this,this.def.error,Q)}$dataError(){(0,pX.reportError)(this,this.def.$dataError||pX.keyword$DataError)}reset(){if(this.errsCount===void 0)throw Error('add "trackErrors" to keyword definition');(0,pX.resetErrorsCount)(this.gen,this.errsCount)}ok(X){if(!this.allErrors)this.gen.if(X)}setParams(X,Q){if(Q)Object.assign(this.params,X);else this.params=X}block$data(X,Q,$=_.nil){this.gen.block(()=>{this.check$data(X,$),Q()})}check$data(X=_.nil,Q=_.nil){if(!this.$data)return;let{gen:$,schemaCode:Y,schemaType:W,def:J}=this;if($.if((0,_.or)(_._`${Y} === undefined`,Q)),X!==_.nil)$.assign(X,!0);if(W.length||J.validateSchema){if($.elseIf(this.invalid$data()),this.$dataError(),X!==_.nil)$.assign(X,!1)}$.else()}invalid$data(){let{gen:X,schemaCode:Q,schemaType:$,def:Y,it:W}=this;return(0,_.or)(J(),G());function J(){if($.length){if(!(Q instanceof _.Name))throw Error("ajv implementation error");let H=Array.isArray($)?$:[$];return _._`${(0,k8.checkDataTypes)(H,Q,W.opts.strictNumbers,k8.DataType.Wrong)}`}return _.nil}function G(){if(Y.validateSchema){let H=X.scopeValue("validate$data",{ref:Y.validateSchema});return _._`!${H}(${Q})`}return _.nil}}subschema(X,Q){let $=(0,wY.getSubschema)(this.it,X);(0,wY.extendSubschemaData)($,this.it,X),(0,wY.extendSubschemaMode)($,X);let Y={...this.it,...$,items:void 0,props:void 0};return wA(Y,Q),Y}mergeEvaluated(X,Q){let{it:$,gen:Y}=this;if(!$.opts.unevaluated)return;if($.props!==!0&&X.props!==void 0)$.props=E1.mergeEvaluated.props(Y,X.props,$.props,Q);if($.items!==!0&&X.items!==void 0)$.items=E1.mergeEvaluated.items(Y,X.items,$.items,Q)}mergeValidEvaluated(X,Q){let{it:$,gen:Y}=this;if($.opts.unevaluated&&($.props!==!0||$.items!==!0))return Y.if(Q,()=>this.mergeEvaluated(X,_.Name)),!0}}h3.KeywordCxt=RY;function g3(X,Q,$,Y){let W=new RY(X,$,Q);if("code"in $)$.code(W,Y);else if(W.$data&&$.validate)(0,dX.funcKeywordCode)(W,$);else if("macro"in $)(0,dX.macroKeywordCode)(W,$);else if($.compile||$.validate)(0,dX.funcKeywordCode)(W,$)}var _A=/^\/(?:[^~]|~0|~1)*$/,xA=/^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;function f3(X,{dataLevel:Q,dataNames:$,dataPathArr:Y}){let W,J;if(X==="")return u.default.rootData;if(X[0]==="/"){if(!_A.test(X))throw Error(`Invalid JSON-pointer: ${X}`);W=X,J=u.default.rootData}else{let z=xA.exec(X);if(!z)throw Error(`Invalid JSON-pointer: ${X}`);let K=+z[1];if(W=z[2],W==="#"){if(K>=Q)throw Error(B("property/index",K));return Y[Q-K]}if(K>Q)throw Error(B("data",K));if(J=$[Q-K],!W)return J}let G=J,H=W.split("/");for(let z of H)if(z)J=_._`${J}${(0,_.getProperty)((0,E1.unescapeJsonPointer)(z))}`,G=_._`${G} && ${J}`;return G;function B(z,K){return`Cannot access ${z} ${K} levels up, current level is ${Q}`}}h3.getData=f3});var v8=P((m3)=>{Object.defineProperty(m3,"__esModule",{value:!0});class l3 extends Error{constructor(X){super("validation failed");this.errors=X,this.ajv=this.validation=!0}}m3.default=l3});var nX=P((p3)=>{Object.defineProperty(p3,"__esModule",{value:!0});var EY=cX();class c3 extends Error{constructor(X,Q,$,Y){super(Y||`can't resolve reference ${$} from id ${Q}`);this.missingRef=(0,EY.resolveUrl)(X,Q,$),this.missingSchema=(0,EY.normalizeId)((0,EY.getFullPath)(X,this.missingRef))}}p3.default=c3});var _8=P((n3)=>{Object.defineProperty(n3,"__esModule",{value:!0});n3.resolveSchema=n3.getCompilingSchema=n3.resolveRef=n3.compileSchema=n3.SchemaEnv=void 0;var X1=c(),uA=v8(),B6=R1(),Q1=cX(),d3=e(),lA=iX();class rX{constructor(X){var Q;this.refs={},this.dynamicAnchors={};let $;if(typeof X.schema=="object")$=X.schema;this.schema=X.schema,this.schemaId=X.schemaId,this.root=X.root||this,this.baseId=(Q=X.baseId)!==null&&Q!==void 0?Q:(0,Q1.normalizeId)($===null||$===void 0?void 0:$[X.schemaId||"$id"]),this.schemaPath=X.schemaPath,this.localRefs=X.localRefs,this.meta=X.meta,this.$async=$===null||$===void 0?void 0:$.$async,this.refs={}}}n3.SchemaEnv=rX;function bY(X){let Q=i3.call(this,X);if(Q)return Q;let $=(0,Q1.getFullPath)(this.opts.uriResolver,X.root.baseId),{es5:Y,lines:W}=this.opts.code,{ownProperties:J}=this.opts,G=new X1.CodeGen(this.scope,{es5:Y,lines:W,ownProperties:J}),H;if(X.$async)H=G.scopeValue("Error",{ref:uA.default,code:X1._`require("ajv/dist/runtime/validation_error").default`});let B=G.scopeName("validate");X.validateName=B;let z={gen:G,allErrors:this.opts.allErrors,data:B6.default.data,parentData:B6.default.parentData,parentDataProperty:B6.default.parentDataProperty,dataNames:[B6.default.data],dataPathArr:[X1.nil],dataLevel:0,dataTypes:[],definedProperties:new Set,topSchemaRef:G.scopeValue("schema",this.opts.code.source===!0?{ref:X.schema,code:(0,X1.stringify)(X.schema)}:{ref:X.schema}),validateName:B,ValidationError:H,schema:X.schema,schemaEnv:X,rootId:$,baseId:X.baseId||$,schemaPath:X1.nil,errSchemaPath:X.schemaPath||(this.opts.jtd?"":"#"),errorPath:X1._`""`,opts:this.opts,self:this},K;try{this._compilations.add(X),(0,lA.validateFunctionCode)(z),G.optimize(this.opts.code.optimize);let V=G.toString();if(K=`${G.scopeRefs(B6.default.scope)}return ${V}`,this.opts.code.process)K=this.opts.code.process(K,X);let U=Function(`${B6.default.self}`,`${B6.default.scope}`,K)(this,this.scope.get());if(this.scope.value(B,{ref:U}),U.errors=null,U.schema=X.schema,U.schemaEnv=X,X.$async)U.$async=!0;if(this.opts.code.source===!0)U.source={validateName:B,validateCode:V,scopeValues:G._values};if(this.opts.unevaluated){let{props:F,items:q}=z;if(U.evaluated={props:F instanceof X1.Name?void 0:F,items:q instanceof X1.Name?void 0:q,dynamicProps:F instanceof X1.Name,dynamicItems:q instanceof X1.Name},U.source)U.source.evaluated=(0,X1.stringify)(U.evaluated)}return X.validate=U,X}catch(V){if(delete X.validate,delete X.validateName,K)this.logger.error("Error compiling schema, function code:",K);throw V}finally{this._compilations.delete(X)}}n3.compileSchema=bY;function mA(X,Q,$){var Y;$=(0,Q1.resolveUrl)(this.opts.uriResolver,Q,$);let W=X.refs[$];if(W)return W;let J=dA.call(this,X,$);if(J===void 0){let G=(Y=X.localRefs)===null||Y===void 0?void 0:Y[$],{schemaId:H}=this.opts;if(G)J=new rX({schema:G,schemaId:H,root:X,baseId:Q})}if(J===void 0)return;return X.refs[$]=cA.call(this,J)}n3.resolveRef=mA;function cA(X){if((0,Q1.inlineRef)(X.schema,this.opts.inlineRefs))return X.schema;return X.validate?X:bY.call(this,X)}function i3(X){for(let Q of this._compilations)if(pA(Q,X))return Q}n3.getCompilingSchema=i3;function pA(X,Q){return X.schema===Q.schema&&X.root===Q.root&&X.baseId===Q.baseId}function dA(X,Q){let $;while(typeof($=this.refs[Q])=="string")Q=$;return $||this.schemas[Q]||T8.call(this,X,Q)}function T8(X,Q){let $=this.opts.uriResolver.parse(Q),Y=(0,Q1._getFullPath)(this.opts.uriResolver,$),W=(0,Q1.getFullPath)(this.opts.uriResolver,X.baseId,void 0);if(Object.keys(X.schema).length>0&&Y===W)return IY.call(this,$,X);let J=(0,Q1.normalizeId)(Y),G=this.refs[J]||this.schemas[J];if(typeof G=="string"){let H=T8.call(this,X,G);if(typeof(H===null||H===void 0?void 0:H.schema)!=="object")return;return IY.call(this,$,H)}if(typeof(G===null||G===void 0?void 0:G.schema)!=="object")return;if(!G.validate)bY.call(this,G);if(J===(0,Q1.normalizeId)(Q)){let{schema:H}=G,{schemaId:B}=this.opts,z=H[B];if(z)W=(0,Q1.resolveUrl)(this.opts.uriResolver,W,z);return new rX({schema:H,schemaId:B,root:X,baseId:W})}return IY.call(this,$,G)}n3.resolveSchema=T8;var iA=new Set(["properties","patternProperties","enum","dependencies","definitions"]);function IY(X,{baseId:Q,schema:$,root:Y}){var W;if(((W=X.fragment)===null||W===void 0?void 0:W[0])!=="/")return;for(let H of X.fragment.slice(1).split("/")){if(typeof $==="boolean")return;let B=$[(0,d3.unescapeFragment)(H)];if(B===void 0)return;$=B;let z=typeof $==="object"&&$[this.opts.schemaId];if(!iA.has(H)&&z)Q=(0,Q1.resolveUrl)(this.opts.uriResolver,Q,z)}let J;if(typeof $!="boolean"&&$.$ref&&!(0,d3.schemaHasRulesButRef)($,this.RULES)){let H=(0,Q1.resolveUrl)(this.opts.uriResolver,Q,$.$ref);J=T8.call(this,Y,H)}let{schemaId:G}=this.opts;if(J=J||new rX({schema:$,schemaId:G,root:Y,baseId:Q}),J.schema!==J.root.schema)return J;return}});var o3=P((GT,aA)=>{aA.exports={$id:"https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",description:"Meta-schema for $data reference (JSON AnySchema extension proposal)",type:"object",required:["$data"],properties:{$data:{type:"string",anyOf:[{format:"relative-json-pointer"},{format:"json-pointer"}]}},additionalProperties:!1}});var a3=P((HT,t3)=>{var sA={0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,a:10,A:10,b:11,B:11,c:12,C:12,d:13,D:13,e:14,E:14,f:15,F:15};t3.exports={HEX:sA}});var JH=P((BT,WH)=>{var{HEX:eA}=a3(),Xw=/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u;function QH(X){if(YH(X,".")<3)return{host:X,isIPV4:!1};let Q=X.match(Xw)||[],[$]=Q;if($)return{host:$w($,"."),isIPV4:!0};else return{host:X,isIPV4:!1}}function PY(X,Q=!1){let $="",Y=!0;for(let W of X){if(eA[W]===void 0)return;if(W!=="0"&&Y===!0)Y=!1;if(!Y)$+=W}if(Q&&$.length===0)$="0";return $}function Qw(X){let Q=0,$={error:!1,address:"",zone:""},Y=[],W=[],J=!1,G=!1,H=!1;function B(){if(W.length){if(J===!1){let z=PY(W);if(z!==void 0)Y.push(z);else return $.error=!0,!1}W.length=0}return!0}for(let z=0;z<X.length;z++){let K=X[z];if(K==="["||K==="]")continue;if(K===":"){if(G===!0)H=!0;if(!B())break;if(Q++,Y.push(":"),Q>7){$.error=!0;break}if(z-1>=0&&X[z-1]===":")G=!0;continue}else if(K==="%"){if(!B())break;J=!0}else{W.push(K);continue}}if(W.length)if(J)$.zone=W.join("");else if(H)Y.push(W.join(""));else Y.push(PY(W));return $.address=Y.join(""),$}function $H(X){if(YH(X,":")<2)return{host:X,isIPV6:!1};let Q=Qw(X);if(!Q.error){let{address:$,address:Y}=Q;if(Q.zone)$+="%"+Q.zone,Y+="%25"+Q.zone;return{host:$,escapedHost:Y,isIPV6:!0}}else return{host:X,isIPV6:!1}}function $w(X,Q){let $="",Y=!0,W=X.length;for(let J=0;J<W;J++){let G=X[J];if(G==="0"&&Y){if(J+1<=W&&X[J+1]===Q||J+1===W)$+=G,Y=!1}else{if(G===Q)Y=!0;else Y=!1;$+=G}}return $}function YH(X,Q){let $=0;for(let Y=0;Y<X.length;Y++)if(X[Y]===Q)$++;return $}var s3=/^\.\.?\//u,e3=/^\/\.(?:\/|$)/u,XH=/^\/\.\.(?:\/|$)/u,Yw=/^\/?(?:.|\n)*?(?=\/|$)/u;function Ww(X){let Q=[];while(X.length)if(X.match(s3))X=X.replace(s3,"");else if(X.match(e3))X=X.replace(e3,"/");else if(X.match(XH))X=X.replace(XH,"/"),Q.pop();else if(X==="."||X==="..")X="";else{let $=X.match(Yw);if($){let Y=$[0];X=X.slice(Y.length),Q.push(Y)}else throw Error("Unexpected dot segment condition")}return Q.join("")}function Jw(X,Q){let $=Q!==!0?escape:unescape;if(X.scheme!==void 0)X.scheme=$(X.scheme);if(X.userinfo!==void 0)X.userinfo=$(X.userinfo);if(X.host!==void 0)X.host=$(X.host);if(X.path!==void 0)X.path=$(X.path);if(X.query!==void 0)X.query=$(X.query);if(X.fragment!==void 0)X.fragment=$(X.fragment);return X}function Gw(X){let Q=[];if(X.userinfo!==void 0)Q.push(X.userinfo),Q.push("@");if(X.host!==void 0){let $=unescape(X.host),Y=QH($);if(Y.isIPV4)$=Y.host;else{let W=$H(Y.host);if(W.isIPV6===!0)$=`[${W.escapedHost}]`;else $=X.host}Q.push($)}if(typeof X.port==="number"||typeof X.port==="string")Q.push(":"),Q.push(String(X.port));return Q.length?Q.join(""):void 0}WH.exports={recomposeAuthority:Gw,normalizeComponentEncoding:Jw,removeDotSegments:Ww,normalizeIPv4:QH,normalizeIPv6:$H,stringArrayToHexStripped:PY}});var UH=P((zT,KH)=>{var Hw=/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu,Bw=/([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu;function GH(X){return typeof X.secure==="boolean"?X.secure:String(X.scheme).toLowerCase()==="wss"}function HH(X){if(!X.host)X.error=X.error||"HTTP URIs must have a host.";return X}function BH(X){let Q=String(X.scheme).toLowerCase()==="https";if(X.port===(Q?443:80)||X.port==="")X.port=void 0;if(!X.path)X.path="/";return X}function zw(X){return X.secure=GH(X),X.resourceName=(X.path||"/")+(X.query?"?"+X.query:""),X.path=void 0,X.query=void 0,X}function Kw(X){if(X.port===(GH(X)?443:80)||X.port==="")X.port=void 0;if(typeof X.secure==="boolean")X.scheme=X.secure?"wss":"ws",X.secure=void 0;if(X.resourceName){let[Q,$]=X.resourceName.split("?");X.path=Q&&Q!=="/"?Q:void 0,X.query=$,X.resourceName=void 0}return X.fragment=void 0,X}function Uw(X,Q){if(!X.path)return X.error="URN can not be parsed",X;let $=X.path.match(Bw);if($){let Y=Q.scheme||X.scheme||"urn";X.nid=$[1].toLowerCase(),X.nss=$[2];let W=`${Y}:${Q.nid||X.nid}`,J=SY[W];if(X.path=void 0,J)X=J.parse(X,Q)}else X.error=X.error||"URN can not be parsed.";return X}function Vw(X,Q){let $=Q.scheme||X.scheme||"urn",Y=X.nid.toLowerCase(),W=`${$}:${Q.nid||Y}`,J=SY[W];if(J)X=J.serialize(X,Q);let G=X,H=X.nss;return G.path=`${Y||Q.nid}:${H}`,Q.skipEscape=!0,G}function Lw(X,Q){let $=X;if($.uuid=$.nss,$.nss=void 0,!Q.tolerant&&(!$.uuid||!Hw.test($.uuid)))$.error=$.error||"UUID is not valid.";return $}function qw(X){let Q=X;return Q.nss=(X.uuid||"").toLowerCase(),Q}var zH={scheme:"http",domainHost:!0,parse:HH,serialize:BH},Fw={scheme:"https",domainHost:zH.domainHost,parse:HH,serialize:BH},x8={scheme:"ws",domainHost:!0,parse:zw,serialize:Kw},Nw={scheme:"wss",domainHost:x8.domainHost,parse:x8.parse,serialize:x8.serialize},Ow={scheme:"urn",parse:Uw,serialize:Vw,skipNormalize:!0},Dw={scheme:"urn:uuid",parse:Lw,serialize:qw,skipNormalize:!0},SY={http:zH,https:Fw,ws:x8,wss:Nw,urn:Ow,"urn:uuid":Dw};KH.exports=SY});var LH=P((KT,g8)=>{var{normalizeIPv6:Aw,normalizeIPv4:ww,removeDotSegments:oX,recomposeAuthority:Mw,normalizeComponentEncoding:y8}=JH(),ZY=UH();function jw(X,Q){if(typeof X==="string")X=V1(I1(X,Q),Q);else if(typeof X==="object")X=I1(V1(X,Q),Q);return X}function Rw(X,Q,$){let Y=Object.assign({scheme:"null"},$),W=VH(I1(X,Y),I1(Q,Y),Y,!0);return V1(W,{...Y,skipEscape:!0})}function VH(X,Q,$,Y){let W={};if(!Y)X=I1(V1(X,$),$),Q=I1(V1(Q,$),$);if($=$||{},!$.tolerant&&Q.scheme)W.scheme=Q.scheme,W.userinfo=Q.userinfo,W.host=Q.host,W.port=Q.port,W.path=oX(Q.path||""),W.query=Q.query;else{if(Q.userinfo!==void 0||Q.host!==void 0||Q.port!==void 0)W.userinfo=Q.userinfo,W.host=Q.host,W.port=Q.port,W.path=oX(Q.path||""),W.query=Q.query;else{if(!Q.path)if(W.path=X.path,Q.query!==void 0)W.query=Q.query;else W.query=X.query;else{if(Q.path.charAt(0)==="/")W.path=oX(Q.path);else{if((X.userinfo!==void 0||X.host!==void 0||X.port!==void 0)&&!X.path)W.path="/"+Q.path;else if(!X.path)W.path=Q.path;else W.path=X.path.slice(0,X.path.lastIndexOf("/")+1)+Q.path;W.path=oX(W.path)}W.query=Q.query}W.userinfo=X.userinfo,W.host=X.host,W.port=X.port}W.scheme=X.scheme}return W.fragment=Q.fragment,W}function Ew(X,Q,$){if(typeof X==="string")X=unescape(X),X=V1(y8(I1(X,$),!0),{...$,skipEscape:!0});else if(typeof X==="object")X=V1(y8(X,!0),{...$,skipEscape:!0});if(typeof Q==="string")Q=unescape(Q),Q=V1(y8(I1(Q,$),!0),{...$,skipEscape:!0});else if(typeof Q==="object")Q=V1(y8(Q,!0),{...$,skipEscape:!0});return X.toLowerCase()===Q.toLowerCase()}function V1(X,Q){let $={host:X.host,scheme:X.scheme,userinfo:X.userinfo,port:X.port,path:X.path,query:X.query,nid:X.nid,nss:X.nss,uuid:X.uuid,fragment:X.fragment,reference:X.reference,resourceName:X.resourceName,secure:X.secure,error:""},Y=Object.assign({},Q),W=[],J=ZY[(Y.scheme||$.scheme||"").toLowerCase()];if(J&&J.serialize)J.serialize($,Y);if($.path!==void 0)if(!Y.skipEscape){if($.path=escape($.path),$.scheme!==void 0)$.path=$.path.split("%3A").join(":")}else $.path=unescape($.path);if(Y.reference!=="suffix"&&$.scheme)W.push($.scheme,":");let G=Mw($);if(G!==void 0){if(Y.reference!=="suffix")W.push("//");if(W.push(G),$.path&&$.path.charAt(0)!=="/")W.push("/")}if($.path!==void 0){let H=$.path;if(!Y.absolutePath&&(!J||!J.absolutePath))H=oX(H);if(G===void 0)H=H.replace(/^\/\//u,"/%2F");W.push(H)}if($.query!==void 0)W.push("?",$.query);if($.fragment!==void 0)W.push("#",$.fragment);return W.join("")}var Iw=Array.from({length:127},(X,Q)=>/[^!"$&'()*+,\-.;=_`a-z{}~]/u.test(String.fromCharCode(Q)));function bw(X){let Q=0;for(let $=0,Y=X.length;$<Y;++$)if(Q=X.charCodeAt($),Q>126||Iw[Q])return!0;return!1}var Pw=/^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;function I1(X,Q){let $=Object.assign({},Q),Y={scheme:void 0,userinfo:void 0,host:"",port:void 0,path:"",query:void 0,fragment:void 0},W=X.indexOf("%")!==-1,J=!1;if($.reference==="suffix")X=($.scheme?$.scheme+":":"")+"//"+X;let G=X.match(Pw);if(G){if(Y.scheme=G[1],Y.userinfo=G[3],Y.host=G[4],Y.port=parseInt(G[5],10),Y.path=G[6]||"",Y.query=G[7],Y.fragment=G[8],isNaN(Y.port))Y.port=G[5];if(Y.host){let B=ww(Y.host);if(B.isIPV4===!1){let z=Aw(B.host);Y.host=z.host.toLowerCase(),J=z.isIPV6}else Y.host=B.host,J=!0}if(Y.scheme===void 0&&Y.userinfo===void 0&&Y.host===void 0&&Y.port===void 0&&Y.query===void 0&&!Y.path)Y.reference="same-document";else if(Y.scheme===void 0)Y.reference="relative";else if(Y.fragment===void 0)Y.reference="absolute";else Y.reference="uri";if($.reference&&$.reference!=="suffix"&&$.reference!==Y.reference)Y.error=Y.error||"URI is not a "+$.reference+" reference.";let H=ZY[($.scheme||Y.scheme||"").toLowerCase()];if(!$.unicodeSupport&&(!H||!H.unicodeSupport)){if(Y.host&&($.domainHost||H&&H.domainHost)&&J===!1&&bw(Y.host))try{Y.host=URL.domainToASCII(Y.host.toLowerCase())}catch(B){Y.error=Y.error||"Host's domain name can not be converted to ASCII: "+B}}if(!H||H&&!H.skipNormalize){if(W&&Y.scheme!==void 0)Y.scheme=unescape(Y.scheme);if(W&&Y.host!==void 0)Y.host=unescape(Y.host);if(Y.path)Y.path=escape(unescape(Y.path));if(Y.fragment)Y.fragment=encodeURI(decodeURIComponent(Y.fragment))}if(H&&H.parse)H.parse(Y,$)}else Y.error=Y.error||"URI can not be parsed.";return Y}var CY={SCHEMES:ZY,normalize:jw,resolve:Rw,resolveComponents:VH,equal:Ew,serialize:V1,parse:I1};g8.exports=CY;g8.exports.default=CY;g8.exports.fastUri=CY});var NH=P((FH)=>{Object.defineProperty(FH,"__esModule",{value:!0});var qH=LH();qH.code='require("ajv/dist/runtime/uri").default';FH.default=qH});var EH=P((b1)=>{Object.defineProperty(b1,"__esModule",{value:!0});b1.CodeGen=b1.Name=b1.nil=b1.stringify=b1.str=b1._=b1.KeywordCxt=void 0;var Zw=iX();Object.defineProperty(b1,"KeywordCxt",{enumerable:!0,get:function(){return Zw.KeywordCxt}});var p6=c();Object.defineProperty(b1,"_",{enumerable:!0,get:function(){return p6._}});Object.defineProperty(b1,"str",{enumerable:!0,get:function(){return p6.str}});Object.defineProperty(b1,"stringify",{enumerable:!0,get:function(){return p6.stringify}});Object.defineProperty(b1,"nil",{enumerable:!0,get:function(){return p6.nil}});Object.defineProperty(b1,"Name",{enumerable:!0,get:function(){return p6.Name}});Object.defineProperty(b1,"CodeGen",{enumerable:!0,get:function(){return p6.CodeGen}});var Cw=v8(),MH=nX(),kw=KY(),tX=_8(),vw=c(),aX=cX(),f8=mX(),vY=e(),OH=o3(),Tw=NH(),jH=(X,Q)=>new RegExp(X,Q);jH.code="new RegExp";var _w=["removeAdditional","useDefaults","coerceTypes"],xw=new Set(["validate","serialize","parse","wrapper","root","schema","keyword","pattern","formats","validate$data","func","obj","Error"]),yw={errorDataPath:"",format:"`validateFormats: false` can be used instead.",nullable:'"nullable" keyword is supported by default.',jsonPointers:"Deprecated jsPropertySyntax can be used instead.",extendRefs:"Deprecated ignoreKeywordsWithRef can be used instead.",missingRefs:"Pass empty schema with $id that should be ignored to ajv.addSchema.",processCode:"Use option `code: {process: (code, schemaEnv: object) => string}`",sourceCode:"Use option `code: {source: true}`",strictDefaults:"It is default now, see option `strict`.",strictKeywords:"It is default now, see option `strict`.",uniqueItems:'"uniqueItems" keyword is always validated.',unknownFormats:"Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",cache:"Map is used as cache, schema object as key.",serialize:"Map is used as cache, schema object as key.",ajvErrors:"It is default now."},gw={ignoreKeywordsWithRef:"",jsPropertySyntax:"",unicode:'"minLength"/"maxLength" account for unicode characters by default.'},DH=200;function fw(X){var Q,$,Y,W,J,G,H,B,z,K,V,L,U,F,q,N,A,M,R,S,C,K0,U0,s,D0;let q0=X.strict,W1=(Q=X.code)===null||Q===void 0?void 0:Q.optimize,P1=W1===!0||W1===void 0?1:W1||0,U6=(Y=($=X.code)===null||$===void 0?void 0:$.regExp)!==null&&Y!==void 0?Y:jH,d=(W=X.uriResolver)!==null&&W!==void 0?W:Tw.default;return{strictSchema:(G=(J=X.strictSchema)!==null&&J!==void 0?J:q0)!==null&&G!==void 0?G:!0,strictNumbers:(B=(H=X.strictNumbers)!==null&&H!==void 0?H:q0)!==null&&B!==void 0?B:!0,strictTypes:(K=(z=X.strictTypes)!==null&&z!==void 0?z:q0)!==null&&K!==void 0?K:"log",strictTuples:(L=(V=X.strictTuples)!==null&&V!==void 0?V:q0)!==null&&L!==void 0?L:"log",strictRequired:(F=(U=X.strictRequired)!==null&&U!==void 0?U:q0)!==null&&F!==void 0?F:!1,code:X.code?{...X.code,optimize:P1,regExp:U6}:{optimize:P1,regExp:U6},loopRequired:(q=X.loopRequired)!==null&&q!==void 0?q:DH,loopEnum:(N=X.loopEnum)!==null&&N!==void 0?N:DH,meta:(A=X.meta)!==null&&A!==void 0?A:!0,messages:(M=X.messages)!==null&&M!==void 0?M:!0,inlineRefs:(R=X.inlineRefs)!==null&&R!==void 0?R:!0,schemaId:(S=X.schemaId)!==null&&S!==void 0?S:"$id",addUsedSchema:(C=X.addUsedSchema)!==null&&C!==void 0?C:!0,validateSchema:(K0=X.validateSchema)!==null&&K0!==void 0?K0:!0,validateFormats:(U0=X.validateFormats)!==null&&U0!==void 0?U0:!0,unicodeRegExp:(s=X.unicodeRegExp)!==null&&s!==void 0?s:!0,int32range:(D0=X.int32range)!==null&&D0!==void 0?D0:!0,uriResolver:d}}class h8{constructor(X={}){this.schemas={},this.refs={},this.formats={},this._compilations=new Set,this._loading={},this._cache=new Map,X=this.opts={...X,...fw(X)};let{es5:Q,lines:$}=this.opts.code;this.scope=new vw.ValueScope({scope:{},prefixes:xw,es5:Q,lines:$}),this.logger=pw(X.logger);let Y=X.validateFormats;if(X.validateFormats=!1,this.RULES=(0,kw.getRules)(),AH.call(this,yw,X,"NOT SUPPORTED"),AH.call(this,gw,X,"DEPRECATED","warn"),this._metaOpts=mw.call(this),X.formats)uw.call(this);if(this._addVocabularies(),this._addDefaultMetaSchema(),X.keywords)lw.call(this,X.keywords);if(typeof X.meta=="object")this.addMetaSchema(X.meta);hw.call(this),X.validateFormats=Y}_addVocabularies(){this.addKeyword("$async")}_addDefaultMetaSchema(){let{$data:X,meta:Q,schemaId:$}=this.opts,Y=OH;if($==="id")Y={...OH},Y.id=Y.$id,delete Y.$id;if(Q&&X)this.addMetaSchema(Y,Y[$],!1)}defaultMeta(){let{meta:X,schemaId:Q}=this.opts;return this.opts.defaultMeta=typeof X=="object"?X[Q]||X:void 0}validate(X,Q){let $;if(typeof X=="string"){if($=this.getSchema(X),!$)throw Error(`no schema with key or ref "${X}"`)}else $=this.compile(X);let Y=$(Q);if(!("$async"in $))this.errors=$.errors;return Y}compile(X,Q){let $=this._addSchema(X,Q);return $.validate||this._compileSchemaEnv($)}compileAsync(X,Q){if(typeof this.opts.loadSchema!="function")throw Error("options.loadSchema should be a function");let{loadSchema:$}=this.opts;return Y.call(this,X,Q);async function Y(z,K){await W.call(this,z.$schema);let V=this._addSchema(z,K);return V.validate||J.call(this,V)}async function W(z){if(z&&!this.getSchema(z))await Y.call(this,{$ref:z},!0)}async function J(z){try{return this._compileSchemaEnv(z)}catch(K){if(!(K instanceof MH.default))throw K;return G.call(this,K),await H.call(this,K.missingSchema),J.call(this,z)}}function G({missingSchema:z,missingRef:K}){if(this.refs[z])throw Error(`AnySchema ${z} is loaded but ${K} cannot be resolved`)}async function H(z){let K=await B.call(this,z);if(!this.refs[z])await W.call(this,K.$schema);if(!this.refs[z])this.addSchema(K,z,Q)}async function B(z){let K=this._loading[z];if(K)return K;try{return await(this._loading[z]=$(z))}finally{delete this._loading[z]}}}addSchema(X,Q,$,Y=this.opts.validateSchema){if(Array.isArray(X)){for(let J of X)this.addSchema(J,void 0,$,Y);return this}let W;if(typeof X==="object"){let{schemaId:J}=this.opts;if(W=X[J],W!==void 0&&typeof W!="string")throw Error(`schema ${J} must be string`)}return Q=(0,aX.normalizeId)(Q||W),this._checkUnique(Q),this.schemas[Q]=this._addSchema(X,$,Q,Y,!0),this}addMetaSchema(X,Q,$=this.opts.validateSchema){return this.addSchema(X,Q,!0,$),this}validateSchema(X,Q){if(typeof X=="boolean")return!0;let $;if($=X.$schema,$!==void 0&&typeof $!="string")throw Error("$schema must be a string");if($=$||this.opts.defaultMeta||this.defaultMeta(),!$)return this.logger.warn("meta-schema not available"),this.errors=null,!0;let Y=this.validate($,X);if(!Y&&Q){let W="schema is invalid: "+this.errorsText();if(this.opts.validateSchema==="log")this.logger.error(W);else throw Error(W)}return Y}getSchema(X){let Q;while(typeof(Q=wH.call(this,X))=="string")X=Q;if(Q===void 0){let{schemaId:$}=this.opts,Y=new tX.SchemaEnv({schema:{},schemaId:$});if(Q=tX.resolveSchema.call(this,Y,X),!Q)return;this.refs[X]=Q}return Q.validate||this._compileSchemaEnv(Q)}removeSchema(X){if(X instanceof RegExp)return this._removeAllSchemas(this.schemas,X),this._removeAllSchemas(this.refs,X),this;switch(typeof X){case"undefined":return this._removeAllSchemas(this.schemas),this._removeAllSchemas(this.refs),this._cache.clear(),this;case"string":{let Q=wH.call(this,X);if(typeof Q=="object")this._cache.delete(Q.schema);return delete this.schemas[X],delete this.refs[X],this}case"object":{let Q=X;this._cache.delete(Q);let $=X[this.opts.schemaId];if($)$=(0,aX.normalizeId)($),delete this.schemas[$],delete this.refs[$];return this}default:throw Error("ajv.removeSchema: invalid parameter")}}addVocabulary(X){for(let Q of X)this.addKeyword(Q);return this}addKeyword(X,Q){let $;if(typeof X=="string"){if($=X,typeof Q=="object")this.logger.warn("these parameters are deprecated, see docs for addKeyword"),Q.keyword=$}else if(typeof X=="object"&&Q===void 0){if(Q=X,$=Q.keyword,Array.isArray($)&&!$.length)throw Error("addKeywords: keyword must be string or non-empty array")}else throw Error("invalid addKeywords parameters");if(iw.call(this,$,Q),!Q)return(0,vY.eachItem)($,(W)=>kY.call(this,W)),this;rw.call(this,Q);let Y={...Q,type:(0,f8.getJSONTypes)(Q.type),schemaType:(0,f8.getJSONTypes)(Q.schemaType)};return(0,vY.eachItem)($,Y.type.length===0?(W)=>kY.call(this,W,Y):(W)=>Y.type.forEach((J)=>kY.call(this,W,Y,J))),this}getKeyword(X){let Q=this.RULES.all[X];return typeof Q=="object"?Q.definition:!!Q}removeKeyword(X){let{RULES:Q}=this;delete Q.keywords[X],delete Q.all[X];for(let $ of Q.rules){let Y=$.rules.findIndex((W)=>W.keyword===X);if(Y>=0)$.rules.splice(Y,1)}return this}addFormat(X,Q){if(typeof Q=="string")Q=new RegExp(Q);return this.formats[X]=Q,this}errorsText(X=this.errors,{separator:Q=", ",dataVar:$="data"}={}){if(!X||X.length===0)return"No errors";return X.map((Y)=>`${$}${Y.instancePath} ${Y.message}`).reduce((Y,W)=>Y+Q+W)}$dataMetaSchema(X,Q){let $=this.RULES.all;X=JSON.parse(JSON.stringify(X));for(let Y of Q){let W=Y.split("/").slice(1),J=X;for(let G of W)J=J[G];for(let G in $){let H=$[G];if(typeof H!="object")continue;let{$data:B}=H.definition,z=J[G];if(B&&z)J[G]=RH(z)}}return X}_removeAllSchemas(X,Q){for(let $ in X){let Y=X[$];if(!Q||Q.test($)){if(typeof Y=="string")delete X[$];else if(Y&&!Y.meta)this._cache.delete(Y.schema),delete X[$]}}}_addSchema(X,Q,$,Y=this.opts.validateSchema,W=this.opts.addUsedSchema){let J,{schemaId:G}=this.opts;if(typeof X=="object")J=X[G];else if(this.opts.jtd)throw Error("schema must be object");else if(typeof X!="boolean")throw Error("schema must be object or boolean");let H=this._cache.get(X);if(H!==void 0)return H;$=(0,aX.normalizeId)(J||$);let B=aX.getSchemaRefs.call(this,X,$);if(H=new tX.SchemaEnv({schema:X,schemaId:G,meta:Q,baseId:$,localRefs:B}),this._cache.set(H.schema,H),W&&!$.startsWith("#")){if($)this._checkUnique($);this.refs[$]=H}if(Y)this.validateSchema(X,!0);return H}_checkUnique(X){if(this.schemas[X]||this.refs[X])throw Error(`schema with key or id "${X}" already exists`)}_compileSchemaEnv(X){if(X.meta)this._compileMetaSchema(X);else tX.compileSchema.call(this,X);if(!X.validate)throw Error("ajv implementation error");return X.validate}_compileMetaSchema(X){let Q=this.opts;this.opts=this._metaOpts;try{tX.compileSchema.call(this,X)}finally{this.opts=Q}}}h8.ValidationError=Cw.default;h8.MissingRefError=MH.default;b1.default=h8;function AH(X,Q,$,Y="error"){for(let W in X){let J=W;if(J in Q)this.logger[Y](`${$}: option ${W}. ${X[J]}`)}}function wH(X){return X=(0,aX.normalizeId)(X),this.schemas[X]||this.refs[X]}function hw(){let X=this.opts.schemas;if(!X)return;if(Array.isArray(X))this.addSchema(X);else for(let Q in X)this.addSchema(X[Q],Q)}function uw(){for(let X in this.opts.formats){let Q=this.opts.formats[X];if(Q)this.addFormat(X,Q)}}function lw(X){if(Array.isArray(X)){this.addVocabulary(X);return}this.logger.warn("keywords option as map is deprecated, pass array");for(let Q in X){let $=X[Q];if(!$.keyword)$.keyword=Q;this.addKeyword($)}}function mw(){let X={...this.opts};for(let Q of _w)delete X[Q];return X}var cw={log(){},warn(){},error(){}};function pw(X){if(X===!1)return cw;if(X===void 0)return console;if(X.log&&X.warn&&X.error)return X;throw Error("logger must implement log, warn and error methods")}var dw=/^[a-z_$][a-z0-9_$:-]*$/i;function iw(X,Q){let{RULES:$}=this;if((0,vY.eachItem)(X,(Y)=>{if($.keywords[Y])throw Error(`Keyword ${Y} is already defined`);if(!dw.test(Y))throw Error(`Keyword ${Y} has invalid name`)}),!Q)return;if(Q.$data&&!(("code"in Q)||("validate"in Q)))throw Error('$data keyword must have "code" or "validate" function')}function kY(X,Q,$){var Y;let W=Q===null||Q===void 0?void 0:Q.post;if($&&W)throw Error('keyword with "post" flag cannot have "type"');let{RULES:J}=this,G=W?J.post:J.rules.find(({type:B})=>B===$);if(!G)G={type:$,rules:[]},J.rules.push(G);if(J.keywords[X]=!0,!Q)return;let H={keyword:X,definition:{...Q,type:(0,f8.getJSONTypes)(Q.type),schemaType:(0,f8.getJSONTypes)(Q.schemaType)}};if(Q.before)nw.call(this,G,H,Q.before);else G.rules.push(H);J.all[X]=H,(Y=Q.implements)===null||Y===void 0||Y.forEach((B)=>this.addKeyword(B))}function nw(X,Q,$){let Y=X.rules.findIndex((W)=>W.keyword===$);if(Y>=0)X.rules.splice(Y,0,Q);else X.rules.push(Q),this.logger.warn(`rule ${$} is not defined`)}function rw(X){let{metaSchema:Q}=X;if(Q===void 0)return;if(X.$data&&this.opts.$data)Q=RH(Q);X.validateSchema=this.compile(Q,!0)}var ow={$ref:"https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"};function RH(X){return{anyOf:[X,ow]}}});var bH=P((IH)=>{Object.defineProperty(IH,"__esModule",{value:!0});var sw={keyword:"id",code(){throw Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID')}};IH.default=sw});var vH=P((CH)=>{Object.defineProperty(CH,"__esModule",{value:!0});CH.callRef=CH.getValidate=void 0;var XM=nX(),PH=d0(),g0=c(),d6=R1(),SH=_8(),u8=e(),QM={keyword:"$ref",schemaType:"string",code(X){let{gen:Q,schema:$,it:Y}=X,{baseId:W,schemaEnv:J,validateName:G,opts:H,self:B}=Y,{root:z}=J;if(($==="#"||$==="#/")&&W===z.baseId)return V();let K=SH.resolveRef.call(B,z,W,$);if(K===void 0)throw new XM.default(Y.opts.uriResolver,W,$);if(K instanceof SH.SchemaEnv)return L(K);return U(K);function V(){if(J===z)return l8(X,G,J,J.$async);let F=Q.scopeValue("root",{ref:z});return l8(X,g0._`${F}.validate`,z,z.$async)}function L(F){let q=ZH(X,F);l8(X,q,F,F.$async)}function U(F){let q=Q.scopeValue("schema",H.code.source===!0?{ref:F,code:(0,g0.stringify)(F)}:{ref:F}),N=Q.name("valid"),A=X.subschema({schema:F,dataTypes:[],schemaPath:g0.nil,topSchemaRef:q,errSchemaPath:$},N);X.mergeEvaluated(A),X.ok(N)}}};function ZH(X,Q){let{gen:$}=X;return Q.validate?$.scopeValue("validate",{ref:Q.validate}):g0._`${$.scopeValue("wrapper",{ref:Q})}.validate`}CH.getValidate=ZH;function l8(X,Q,$,Y){let{gen:W,it:J}=X,{allErrors:G,schemaEnv:H,opts:B}=J,z=B.passContext?d6.default.this:g0.nil;if(Y)K();else V();function K(){if(!H.$async)throw Error("async schema referenced by sync schema");let F=W.let("valid");W.try(()=>{if(W.code(g0._`await ${(0,PH.callValidateCode)(X,Q,z)}`),U(Q),!G)W.assign(F,!0)},(q)=>{if(W.if(g0._`!(${q} instanceof ${J.ValidationError})`,()=>W.throw(q)),L(q),!G)W.assign(F,!1)}),X.ok(F)}function V(){X.result((0,PH.callValidateCode)(X,Q,z),()=>U(Q),()=>L(Q))}function L(F){let q=g0._`${F}.errors`;W.assign(d6.default.vErrors,g0._`${d6.default.vErrors} === null ? ${q} : ${d6.default.vErrors}.concat(${q})`),W.assign(d6.default.errors,g0._`${d6.default.vErrors}.length`)}function U(F){var q;if(!J.opts.unevaluated)return;let N=(q=$===null||$===void 0?void 0:$.validate)===null||q===void 0?void 0:q.evaluated;if(J.props!==!0)if(N&&!N.dynamicProps){if(N.props!==void 0)J.props=u8.mergeEvaluated.props(W,N.props,J.props)}else{let A=W.var("props",g0._`${F}.evaluated.props`);J.props=u8.mergeEvaluated.props(W,A,J.props,g0.Name)}if(J.items!==!0)if(N&&!N.dynamicItems){if(N.items!==void 0)J.items=u8.mergeEvaluated.items(W,N.items,J.items)}else{let A=W.var("items",g0._`${F}.evaluated.items`);J.items=u8.mergeEvaluated.items(W,A,J.items,g0.Name)}}}CH.callRef=l8;CH.default=QM});var _H=P((TH)=>{Object.defineProperty(TH,"__esModule",{value:!0});var WM=bH(),JM=vH(),GM=["$schema","$id","$defs","$vocabulary",{keyword:"$comment"},"definitions",WM.default,JM.default];TH.default=GM});var yH=P((xH)=>{Object.defineProperty(xH,"__esModule",{value:!0});var m8=c(),i1=m8.operators,c8={maximum:{okStr:"<=",ok:i1.LTE,fail:i1.GT},minimum:{okStr:">=",ok:i1.GTE,fail:i1.LT},exclusiveMaximum:{okStr:"<",ok:i1.LT,fail:i1.GTE},exclusiveMinimum:{okStr:">",ok:i1.GT,fail:i1.LTE}},BM={message:({keyword:X,schemaCode:Q})=>m8.str`must be ${c8[X].okStr} ${Q}`,params:({keyword:X,schemaCode:Q})=>m8._`{comparison: ${c8[X].okStr}, limit: ${Q}}`},zM={keyword:Object.keys(c8),type:"number",schemaType:"number",$data:!0,error:BM,code(X){let{keyword:Q,data:$,schemaCode:Y}=X;X.fail$data(m8._`${$} ${c8[Q].fail} ${Y} || isNaN(${$})`)}};xH.default=zM});var fH=P((gH)=>{Object.defineProperty(gH,"__esModule",{value:!0});var sX=c(),UM={message:({schemaCode:X})=>sX.str`must be multiple of ${X}`,params:({schemaCode:X})=>sX._`{multipleOf: ${X}}`},VM={keyword:"multipleOf",type:"number",schemaType:"number",$data:!0,error:UM,code(X){let{gen:Q,data:$,schemaCode:Y,it:W}=X,J=W.opts.multipleOfPrecision,G=Q.let("res"),H=J?sX._`Math.abs(Math.round(${G}) - ${G}) > 1e-${J}`:sX._`${G} !== parseInt(${G})`;X.fail$data(sX._`(${Y} === 0 || (${G} = ${$}/${Y}, ${H}))`)}};gH.default=VM});var lH=P((uH)=>{Object.defineProperty(uH,"__esModule",{value:!0});function hH(X){let Q=X.length,$=0,Y=0,W;while(Y<Q)if($++,W=X.charCodeAt(Y++),W>=55296&&W<=56319&&Y<Q){if(W=X.charCodeAt(Y),(W&64512)===56320)Y++}return $}uH.default=hH;hH.code='require("ajv/dist/runtime/ucs2length").default'});var cH=P((mH)=>{Object.defineProperty(mH,"__esModule",{value:!0});var z6=c(),FM=e(),NM=lH(),OM={message({keyword:X,schemaCode:Q}){let $=X==="maxLength"?"more":"fewer";return z6.str`must NOT have ${$} than ${Q} characters`},params:({schemaCode:X})=>z6._`{limit: ${X}}`},DM={keyword:["maxLength","minLength"],type:"string",schemaType:"number",$data:!0,error:OM,code(X){let{keyword:Q,data:$,schemaCode:Y,it:W}=X,J=Q==="maxLength"?z6.operators.GT:z6.operators.LT,G=W.opts.unicode===!1?z6._`${$}.length`:z6._`${(0,FM.useFunc)(X.gen,NM.default)}(${$})`;X.fail$data(z6._`${G} ${J} ${Y}`)}};mH.default=DM});var dH=P((pH)=>{Object.defineProperty(pH,"__esModule",{value:!0});var wM=d0(),p8=c(),MM={message:({schemaCode:X})=>p8.str`must match pattern "${X}"`,params:({schemaCode:X})=>p8._`{pattern: ${X}}`},jM={keyword:"pattern",type:"string",schemaType:"string",$data:!0,error:MM,code(X){let{data:Q,$data:$,schema:Y,schemaCode:W,it:J}=X,G=J.opts.unicodeRegExp?"u":"",H=$?p8._`(new RegExp(${W}, ${G}))`:(0,wM.usePattern)(X,Y);X.fail$data(p8._`!${H}.test(${Q})`)}};pH.default=jM});var nH=P((iH)=>{Object.defineProperty(iH,"__esModule",{value:!0});var eX=c(),EM={message({keyword:X,schemaCode:Q}){let $=X==="maxProperties"?"more":"fewer";return eX.str`must NOT have ${$} than ${Q} properties`},params:({schemaCode:X})=>eX._`{limit: ${X}}`},IM={keyword:["maxProperties","minProperties"],type:"object",schemaType:"number",$data:!0,error:EM,code(X){let{keyword:Q,data:$,schemaCode:Y}=X,W=Q==="maxProperties"?eX.operators.GT:eX.operators.LT;X.fail$data(eX._`Object.keys(${$}).length ${W} ${Y}`)}};iH.default=IM});var oH=P((rH)=>{Object.defineProperty(rH,"__esModule",{value:!0});var X4=d0(),Q4=c(),PM=e(),SM={message:({params:{missingProperty:X}})=>Q4.str`must have required property '${X}'`,params:({params:{missingProperty:X}})=>Q4._`{missingProperty: ${X}}`},ZM={keyword:"required",type:"object",schemaType:"array",$data:!0,error:SM,code(X){let{gen:Q,schema:$,schemaCode:Y,data:W,$data:J,it:G}=X,{opts:H}=G;if(!J&&$.length===0)return;let B=$.length>=H.loopRequired;if(G.allErrors)z();else K();if(H.strictRequired){let U=X.parentSchema.properties,{definedProperties:F}=X.it;for(let q of $)if((U===null||U===void 0?void 0:U[q])===void 0&&!F.has(q)){let N=G.schemaEnv.baseId+G.errSchemaPath,A=`required property "${q}" is not defined at "${N}" (strictRequired)`;(0,PM.checkStrictMode)(G,A,G.opts.strictRequired)}}function z(){if(B||J)X.block$data(Q4.nil,V);else for(let U of $)(0,X4.checkReportMissingProp)(X,U)}function K(){let U=Q.let("missing");if(B||J){let F=Q.let("valid",!0);X.block$data(F,()=>L(U,F)),X.ok(F)}else Q.if((0,X4.checkMissingProp)(X,$,U)),(0,X4.reportMissingProp)(X,U),Q.else()}function V(){Q.forOf("prop",Y,(U)=>{X.setParams({missingProperty:U}),Q.if((0,X4.noPropertyInData)(Q,W,U,H.ownProperties),()=>X.error())})}function L(U,F){X.setParams({missingProperty:U}),Q.forOf(U,Y,()=>{Q.assign(F,(0,X4.propertyInData)(Q,W,U,H.ownProperties)),Q.if((0,Q4.not)(F),()=>{X.error(),Q.break()})},Q4.nil)}}};rH.default=ZM});var aH=P((tH)=>{Object.defineProperty(tH,"__esModule",{value:!0});var $4=c(),kM={message({keyword:X,schemaCode:Q}){let $=X==="maxItems"?"more":"fewer";return $4.str`must NOT have ${$} than ${Q} items`},params:({schemaCode:X})=>$4._`{limit: ${X}}`},vM={keyword:["maxItems","minItems"],type:"array",schemaType:"number",$data:!0,error:kM,code(X){let{keyword:Q,data:$,schemaCode:Y}=X,W=Q==="maxItems"?$4.operators.GT:$4.operators.LT;X.fail$data($4._`${$}.length ${W} ${Y}`)}};tH.default=vM});var d8=P((eH)=>{Object.defineProperty(eH,"__esModule",{value:!0});var sH=DY();sH.code='require("ajv/dist/runtime/equal").default';eH.default=sH});var QB=P((XB)=>{Object.defineProperty(XB,"__esModule",{value:!0});var TY=mX(),E0=c(),xM=e(),yM=d8(),gM={message:({params:{i:X,j:Q}})=>E0.str`must NOT have duplicate items (items ## ${Q} and ${X} are identical)`,params:({params:{i:X,j:Q}})=>E0._`{i: ${X}, j: ${Q}}`},fM={keyword:"uniqueItems",type:"array",schemaType:"boolean",$data:!0,error:gM,code(X){let{gen:Q,data:$,$data:Y,schema:W,parentSchema:J,schemaCode:G,it:H}=X;if(!Y&&!W)return;let B=Q.let("valid"),z=J.items?(0,TY.getSchemaTypes)(J.items):[];X.block$data(B,K,E0._`${G} === false`),X.ok(B);function K(){let F=Q.let("i",E0._`${$}.length`),q=Q.let("j");X.setParams({i:F,j:q}),Q.assign(B,!0),Q.if(E0._`${F} > 1`,()=>(V()?L:U)(F,q))}function V(){return z.length>0&&!z.some((F)=>F==="object"||F==="array")}function L(F,q){let N=Q.name("item"),A=(0,TY.checkDataTypes)(z,N,H.opts.strictNumbers,TY.DataType.Wrong),M=Q.const("indices",E0._`{}`);Q.for(E0._`;${F}--;`,()=>{if(Q.let(N,E0._`${$}[${F}]`),Q.if(A,E0._`continue`),z.length>1)Q.if(E0._`typeof ${N} == "string"`,E0._`${N} += "_"`);Q.if(E0._`typeof ${M}[${N}] == "number"`,()=>{Q.assign(q,E0._`${M}[${N}]`),X.error(),Q.assign(B,!1).break()}).code(E0._`${M}[${N}] = ${F}`)})}function U(F,q){let N=(0,xM.useFunc)(Q,yM.default),A=Q.name("outer");Q.label(A).for(E0._`;${F}--;`,()=>Q.for(E0._`${q} = ${F}; ${q}--;`,()=>Q.if(E0._`${N}(${$}[${F}], ${$}[${q}])`,()=>{X.error(),Q.assign(B,!1).break(A)})))}}};XB.default=fM});var YB=P(($B)=>{Object.defineProperty($B,"__esModule",{value:!0});var _Y=c(),uM=e(),lM=d8(),mM={message:"must be equal to constant",params:({schemaCode:X})=>_Y._`{allowedValue: ${X}}`},cM={keyword:"const",$data:!0,error:mM,code(X){let{gen:Q,data:$,$data:Y,schemaCode:W,schema:J}=X;if(Y||J&&typeof J=="object")X.fail$data(_Y._`!${(0,uM.useFunc)(Q,lM.default)}(${$}, ${W})`);else X.fail(_Y._`${J} !== ${$}`)}};$B.default=cM});var JB=P((WB)=>{Object.defineProperty(WB,"__esModule",{value:!0});var Y4=c(),dM=e(),iM=d8(),nM={message:"must be equal to one of the allowed values",params:({schemaCode:X})=>Y4._`{allowedValues: ${X}}`},rM={keyword:"enum",schemaType:"array",$data:!0,error:nM,code(X){let{gen:Q,data:$,$data:Y,schema:W,schemaCode:J,it:G}=X;if(!Y&&W.length===0)throw Error("enum must have non-empty array");let H=W.length>=G.opts.loopEnum,B,z=()=>B!==null&&B!==void 0?B:B=(0,dM.useFunc)(Q,iM.default),K;if(H||Y)K=Q.let("valid"),X.block$data(K,V);else{if(!Array.isArray(W))throw Error("ajv implementation error");let U=Q.const("vSchema",J);K=(0,Y4.or)(...W.map((F,q)=>L(U,q)))}X.pass(K);function V(){Q.assign(K,!1),Q.forOf("v",J,(U)=>Q.if(Y4._`${z()}(${$}, ${U})`,()=>Q.assign(K,!0).break()))}function L(U,F){let q=W[F];return typeof q==="object"&&q!==null?Y4._`${z()}(${$}, ${U}[${F}])`:Y4._`${$} === ${q}`}}};WB.default=rM});var HB=P((GB)=>{Object.defineProperty(GB,"__esModule",{value:!0});var tM=yH(),aM=fH(),sM=cH(),eM=dH(),Xj=nH(),Qj=oH(),$j=aH(),Yj=QB(),Wj=YB(),Jj=JB(),Gj=[tM.default,aM.default,sM.default,eM.default,Xj.default,Qj.default,$j.default,Yj.default,{keyword:"type",schemaType:["string","array"]},{keyword:"nullable",schemaType:"boolean"},Wj.default,Jj.default];GB.default=Gj});var yY=P((zB)=>{Object.defineProperty(zB,"__esModule",{value:!0});zB.validateAdditionalItems=void 0;var K6=c(),xY=e(),Bj={message:({params:{len:X}})=>K6.str`must NOT have more than ${X} items`,params:({params:{len:X}})=>K6._`{limit: ${X}}`},zj={keyword:"additionalItems",type:"array",schemaType:["boolean","object"],before:"uniqueItems",error:Bj,code(X){let{parentSchema:Q,it:$}=X,{items:Y}=Q;if(!Array.isArray(Y)){(0,xY.checkStrictMode)($,'"additionalItems" is ignored when "items" is not an array of schemas');return}BB(X,Y)}};function BB(X,Q){let{gen:$,schema:Y,data:W,keyword:J,it:G}=X;G.items=!0;let H=$.const("len",K6._`${W}.length`);if(Y===!1)X.setParams({len:Q.length}),X.pass(K6._`${H} <= ${Q.length}`);else if(typeof Y=="object"&&!(0,xY.alwaysValidSchema)(G,Y)){let z=$.var("valid",K6._`${H} <= ${Q.length}`);$.if((0,K6.not)(z),()=>B(z)),X.ok(z)}function B(z){$.forRange("i",Q.length,H,(K)=>{if(X.subschema({keyword:J,dataProp:K,dataPropType:xY.Type.Num},z),!G.allErrors)$.if((0,K6.not)(z),()=>$.break())})}}zB.validateAdditionalItems=BB;zB.default=zj});var gY=P((LB)=>{Object.defineProperty(LB,"__esModule",{value:!0});LB.validateTuple=void 0;var UB=c(),i8=e(),Uj=d0(),Vj={keyword:"items",type:"array",schemaType:["object","array","boolean"],before:"uniqueItems",code(X){let{schema:Q,it:$}=X;if(Array.isArray(Q))return VB(X,"additionalItems",Q);if($.items=!0,(0,i8.alwaysValidSchema)($,Q))return;X.ok((0,Uj.validateArray)(X))}};function VB(X,Q,$=X.schema){let{gen:Y,parentSchema:W,data:J,keyword:G,it:H}=X;if(K(W),H.opts.unevaluated&&$.length&&H.items!==!0)H.items=i8.mergeEvaluated.items(Y,$.length,H.items);let B=Y.name("valid"),z=Y.const("len",UB._`${J}.length`);$.forEach((V,L)=>{if((0,i8.alwaysValidSchema)(H,V))return;Y.if(UB._`${z} > ${L}`,()=>X.subschema({keyword:G,schemaProp:L,dataProp:L},B)),X.ok(B)});function K(V){let{opts:L,errSchemaPath:U}=H,F=$.length,q=F===V.minItems&&(F===V.maxItems||V[Q]===!1);if(L.strictTuples&&!q){let N=`"${G}" is ${F}-tuple, but minItems or maxItems/${Q} are not specified or different at path "${U}"`;(0,i8.checkStrictMode)(H,N,L.strictTuples)}}}LB.validateTuple=VB;LB.default=Vj});var NB=P((FB)=>{Object.defineProperty(FB,"__esModule",{value:!0});var qj=gY(),Fj={keyword:"prefixItems",type:"array",schemaType:["array"],before:"uniqueItems",code:(X)=>(0,qj.validateTuple)(X,"items")};FB.default=Fj});var AB=P((DB)=>{Object.defineProperty(DB,"__esModule",{value:!0});var OB=c(),Oj=e(),Dj=d0(),Aj=yY(),wj={message:({params:{len:X}})=>OB.str`must NOT have more than ${X} items`,params:({params:{len:X}})=>OB._`{limit: ${X}}`},Mj={keyword:"items",type:"array",schemaType:["object","boolean"],before:"uniqueItems",error:wj,code(X){let{schema:Q,parentSchema:$,it:Y}=X,{prefixItems:W}=$;if(Y.items=!0,(0,Oj.alwaysValidSchema)(Y,Q))return;if(W)(0,Aj.validateAdditionalItems)(X,W);else X.ok((0,Dj.validateArray)(X))}};DB.default=Mj});var MB=P((wB)=>{Object.defineProperty(wB,"__esModule",{value:!0});var i0=c(),n8=e(),Rj={message:({params:{min:X,max:Q}})=>Q===void 0?i0.str`must contain at least ${X} valid item(s)`:i0.str`must contain at least ${X} and no more than ${Q} valid item(s)`,params:({params:{min:X,max:Q}})=>Q===void 0?i0._`{minContains: ${X}}`:i0._`{minContains: ${X}, maxContains: ${Q}}`},Ej={keyword:"contains",type:"array",schemaType:["object","boolean"],before:"uniqueItems",trackErrors:!0,error:Rj,code(X){let{gen:Q,schema:$,parentSchema:Y,data:W,it:J}=X,G,H,{minContains:B,maxContains:z}=Y;if(J.opts.next)G=B===void 0?1:B,H=z;else G=1;let K=Q.const("len",i0._`${W}.length`);if(X.setParams({min:G,max:H}),H===void 0&&G===0){(0,n8.checkStrictMode)(J,'"minContains" == 0 without "maxContains": "contains" keyword ignored');return}if(H!==void 0&&G>H){(0,n8.checkStrictMode)(J,'"minContains" > "maxContains" is always invalid'),X.fail();return}if((0,n8.alwaysValidSchema)(J,$)){let q=i0._`${K} >= ${G}`;if(H!==void 0)q=i0._`${q} && ${K} <= ${H}`;X.pass(q);return}J.items=!0;let V=Q.name("valid");if(H===void 0&&G===1)U(V,()=>Q.if(V,()=>Q.break()));else if(G===0){if(Q.let(V,!0),H!==void 0)Q.if(i0._`${W}.length > 0`,L)}else Q.let(V,!1),L();X.result(V,()=>X.reset());function L(){let q=Q.name("_valid"),N=Q.let("count",0);U(q,()=>Q.if(q,()=>F(N)))}function U(q,N){Q.forRange("i",0,K,(A)=>{X.subschema({keyword:"contains",dataProp:A,dataPropType:n8.Type.Num,compositeRule:!0},q),N()})}function F(q){if(Q.code(i0._`${q}++`),H===void 0)Q.if(i0._`${q} >= ${G}`,()=>Q.assign(V,!0).break());else if(Q.if(i0._`${q} > ${H}`,()=>Q.assign(V,!1).break()),G===1)Q.assign(V,!0);else Q.if(i0._`${q} >= ${G}`,()=>Q.assign(V,!0))}}};wB.default=Ej});var PB=P((EB)=>{Object.defineProperty(EB,"__esModule",{value:!0});EB.validateSchemaDeps=EB.validatePropertyDeps=EB.error=void 0;var fY=c(),bj=e(),W4=d0();EB.error={message:({params:{property:X,depsCount:Q,deps:$}})=>{let Y=Q===1?"property":"properties";return fY.str`must have ${Y} ${$} when property ${X} is present`},params:({params:{property:X,depsCount:Q,deps:$,missingProperty:Y}})=>fY._`{property: ${X},
    missingProperty: ${Y},
    depsCount: ${Q},
    deps: ${$}}`};var Pj={keyword:"dependencies",type:"object",schemaType:"object",error:EB.error,code(X){let[Q,$]=Sj(X);jB(X,Q),RB(X,$)}};function Sj({schema:X}){let Q={},$={};for(let Y in X){if(Y==="__proto__")continue;let W=Array.isArray(X[Y])?Q:$;W[Y]=X[Y]}return[Q,$]}function jB(X,Q=X.schema){let{gen:$,data:Y,it:W}=X;if(Object.keys(Q).length===0)return;let J=$.let("missing");for(let G in Q){let H=Q[G];if(H.length===0)continue;let B=(0,W4.propertyInData)($,Y,G,W.opts.ownProperties);if(X.setParams({property:G,depsCount:H.length,deps:H.join(", ")}),W.allErrors)$.if(B,()=>{for(let z of H)(0,W4.checkReportMissingProp)(X,z)});else $.if(fY._`${B} && (${(0,W4.checkMissingProp)(X,H,J)})`),(0,W4.reportMissingProp)(X,J),$.else()}}EB.validatePropertyDeps=jB;function RB(X,Q=X.schema){let{gen:$,data:Y,keyword:W,it:J}=X,G=$.name("valid");for(let H in Q){if((0,bj.alwaysValidSchema)(J,Q[H]))continue;$.if((0,W4.propertyInData)($,Y,H,J.opts.ownProperties),()=>{let B=X.subschema({keyword:W,schemaProp:H},G);X.mergeValidEvaluated(B,G)},()=>$.var(G,!0)),X.ok(G)}}EB.validateSchemaDeps=RB;EB.default=Pj});var CB=P((ZB)=>{Object.defineProperty(ZB,"__esModule",{value:!0});var SB=c(),kj=e(),vj={message:"property name must be valid",params:({params:X})=>SB._`{propertyName: ${X.propertyName}}`},Tj={keyword:"propertyNames",type:"object",schemaType:["object","boolean"],error:vj,code(X){let{gen:Q,schema:$,data:Y,it:W}=X;if((0,kj.alwaysValidSchema)(W,$))return;let J=Q.name("valid");Q.forIn("key",Y,(G)=>{X.setParams({propertyName:G}),X.subschema({keyword:"propertyNames",data:G,dataTypes:["string"],propertyName:G,compositeRule:!0},J),Q.if((0,SB.not)(J),()=>{if(X.error(!0),!W.allErrors)Q.break()})}),X.ok(J)}};ZB.default=Tj});var hY=P((kB)=>{Object.defineProperty(kB,"__esModule",{value:!0});var r8=d0(),$1=c(),xj=R1(),o8=e(),yj={message:"must NOT have additional properties",params:({params:X})=>$1._`{additionalProperty: ${X.additionalProperty}}`},gj={keyword:"additionalProperties",type:["object"],schemaType:["boolean","object"],allowUndefined:!0,trackErrors:!0,error:yj,code(X){let{gen:Q,schema:$,parentSchema:Y,data:W,errsCount:J,it:G}=X;if(!J)throw Error("ajv implementation error");let{allErrors:H,opts:B}=G;if(G.props=!0,B.removeAdditional!=="all"&&(0,o8.alwaysValidSchema)(G,$))return;let z=(0,r8.allSchemaProperties)(Y.properties),K=(0,r8.allSchemaProperties)(Y.patternProperties);V(),X.ok($1._`${J} === ${xj.default.errors}`);function V(){Q.forIn("key",W,(N)=>{if(!z.length&&!K.length)F(N);else Q.if(L(N),()=>F(N))})}function L(N){let A;if(z.length>8){let M=(0,o8.schemaRefOrVal)(G,Y.properties,"properties");A=(0,r8.isOwnProperty)(Q,M,N)}else if(z.length)A=(0,$1.or)(...z.map((M)=>$1._`${N} === ${M}`));else A=$1.nil;if(K.length)A=(0,$1.or)(A,...K.map((M)=>$1._`${(0,r8.usePattern)(X,M)}.test(${N})`));return(0,$1.not)(A)}function U(N){Q.code($1._`delete ${W}[${N}]`)}function F(N){if(B.removeAdditional==="all"||B.removeAdditional&&$===!1){U(N);return}if($===!1){if(X.setParams({additionalProperty:N}),X.error(),!H)Q.break();return}if(typeof $=="object"&&!(0,o8.alwaysValidSchema)(G,$)){let A=Q.name("valid");if(B.removeAdditional==="failing")q(N,A,!1),Q.if((0,$1.not)(A),()=>{X.reset(),U(N)});else if(q(N,A),!H)Q.if((0,$1.not)(A),()=>Q.break())}}function q(N,A,M){let R={keyword:"additionalProperties",dataProp:N,dataPropType:o8.Type.Str};if(M===!1)Object.assign(R,{compositeRule:!0,createErrors:!1,allErrors:!1});X.subschema(R,A)}}};kB.default=gj});var xB=P((_B)=>{Object.defineProperty(_B,"__esModule",{value:!0});var hj=iX(),vB=d0(),uY=e(),TB=hY(),uj={keyword:"properties",type:"object",schemaType:"object",code(X){let{gen:Q,schema:$,parentSchema:Y,data:W,it:J}=X;if(J.opts.removeAdditional==="all"&&Y.additionalProperties===void 0)TB.default.code(new hj.KeywordCxt(J,TB.default,"additionalProperties"));let G=(0,vB.allSchemaProperties)($);for(let V of G)J.definedProperties.add(V);if(J.opts.unevaluated&&G.length&&J.props!==!0)J.props=uY.mergeEvaluated.props(Q,(0,uY.toHash)(G),J.props);let H=G.filter((V)=>!(0,uY.alwaysValidSchema)(J,$[V]));if(H.length===0)return;let B=Q.name("valid");for(let V of H){if(z(V))K(V);else{if(Q.if((0,vB.propertyInData)(Q,W,V,J.opts.ownProperties)),K(V),!J.allErrors)Q.else().var(B,!0);Q.endIf()}X.it.definedProperties.add(V),X.ok(B)}function z(V){return J.opts.useDefaults&&!J.compositeRule&&$[V].default!==void 0}function K(V){X.subschema({keyword:"properties",schemaProp:V,dataProp:V},B)}}};_B.default=uj});var uB=P((hB)=>{Object.defineProperty(hB,"__esModule",{value:!0});var yB=d0(),t8=c(),gB=e(),fB=e(),mj={keyword:"patternProperties",type:"object",schemaType:"object",code(X){let{gen:Q,schema:$,data:Y,parentSchema:W,it:J}=X,{opts:G}=J,H=(0,yB.allSchemaProperties)($),B=H.filter((q)=>(0,gB.alwaysValidSchema)(J,$[q]));if(H.length===0||B.length===H.length&&(!J.opts.unevaluated||J.props===!0))return;let z=G.strictSchema&&!G.allowMatchingProperties&&W.properties,K=Q.name("valid");if(J.props!==!0&&!(J.props instanceof t8.Name))J.props=(0,fB.evaluatedPropsToName)(Q,J.props);let{props:V}=J;L();function L(){for(let q of H){if(z)U(q);if(J.allErrors)F(q);else Q.var(K,!0),F(q),Q.if(K)}}function U(q){for(let N in z)if(new RegExp(q).test(N))(0,gB.checkStrictMode)(J,`property ${N} matches pattern ${q} (use allowMatchingProperties)`)}function F(q){Q.forIn("key",Y,(N)=>{Q.if(t8._`${(0,yB.usePattern)(X,q)}.test(${N})`,()=>{let A=B.includes(q);if(!A)X.subschema({keyword:"patternProperties",schemaProp:q,dataProp:N,dataPropType:fB.Type.Str},K);if(J.opts.unevaluated&&V!==!0)Q.assign(t8._`${V}[${N}]`,!0);else if(!A&&!J.allErrors)Q.if((0,t8.not)(K),()=>Q.break())})})}}};hB.default=mj});var mB=P((lB)=>{Object.defineProperty(lB,"__esModule",{value:!0});var pj=e(),dj={keyword:"not",schemaType:["object","boolean"],trackErrors:!0,code(X){let{gen:Q,schema:$,it:Y}=X;if((0,pj.alwaysValidSchema)(Y,$)){X.fail();return}let W=Q.name("valid");X.subschema({keyword:"not",compositeRule:!0,createErrors:!1,allErrors:!1},W),X.failResult(W,()=>X.reset(),()=>X.error())},error:{message:"must NOT be valid"}};lB.default=dj});var pB=P((cB)=>{Object.defineProperty(cB,"__esModule",{value:!0});var nj=d0(),rj={keyword:"anyOf",schemaType:"array",trackErrors:!0,code:nj.validateUnion,error:{message:"must match a schema in anyOf"}};cB.default=rj});var iB=P((dB)=>{Object.defineProperty(dB,"__esModule",{value:!0});var a8=c(),tj=e(),aj={message:"must match exactly one schema in oneOf",params:({params:X})=>a8._`{passingSchemas: ${X.passing}}`},sj={keyword:"oneOf",schemaType:"array",trackErrors:!0,error:aj,code(X){let{gen:Q,schema:$,parentSchema:Y,it:W}=X;if(!Array.isArray($))throw Error("ajv implementation error");if(W.opts.discriminator&&Y.discriminator)return;let J=$,G=Q.let("valid",!1),H=Q.let("passing",null),B=Q.name("_valid");X.setParams({passing:H}),Q.block(z),X.result(G,()=>X.reset(),()=>X.error(!0));function z(){J.forEach((K,V)=>{let L;if((0,tj.alwaysValidSchema)(W,K))Q.var(B,!0);else L=X.subschema({keyword:"oneOf",schemaProp:V,compositeRule:!0},B);if(V>0)Q.if(a8._`${B} && ${G}`).assign(G,!1).assign(H,a8._`[${H}, ${V}]`).else();Q.if(B,()=>{if(Q.assign(G,!0),Q.assign(H,V),L)X.mergeEvaluated(L,a8.Name)})})}}};dB.default=sj});var rB=P((nB)=>{Object.defineProperty(nB,"__esModule",{value:!0});var XR=e(),QR={keyword:"allOf",schemaType:"array",code(X){let{gen:Q,schema:$,it:Y}=X;if(!Array.isArray($))throw Error("ajv implementation error");let W=Q.name("valid");$.forEach((J,G)=>{if((0,XR.alwaysValidSchema)(Y,J))return;let H=X.subschema({keyword:"allOf",schemaProp:G},W);X.ok(W),X.mergeEvaluated(H)})}};nB.default=QR});var sB=P((aB)=>{Object.defineProperty(aB,"__esModule",{value:!0});var s8=c(),tB=e(),YR={message:({params:X})=>s8.str`must match "${X.ifClause}" schema`,params:({params:X})=>s8._`{failingKeyword: ${X.ifClause}}`},WR={keyword:"if",schemaType:["object","boolean"],trackErrors:!0,error:YR,code(X){let{gen:Q,parentSchema:$,it:Y}=X;if($.then===void 0&&$.else===void 0)(0,tB.checkStrictMode)(Y,'"if" without "then" and "else" is ignored');let W=oB(Y,"then"),J=oB(Y,"else");if(!W&&!J)return;let G=Q.let("valid",!0),H=Q.name("_valid");if(B(),X.reset(),W&&J){let K=Q.let("ifClause");X.setParams({ifClause:K}),Q.if(H,z("then",K),z("else",K))}else if(W)Q.if(H,z("then"));else Q.if((0,s8.not)(H),z("else"));X.pass(G,()=>X.error(!0));function B(){let K=X.subschema({keyword:"if",compositeRule:!0,createErrors:!1,allErrors:!1},H);X.mergeEvaluated(K)}function z(K,V){return()=>{let L=X.subschema({keyword:K},H);if(Q.assign(G,H),X.mergeValidEvaluated(L,G),V)Q.assign(V,s8._`${K}`);else X.setParams({ifClause:K})}}}};function oB(X,Q){let $=X.schema[Q];return $!==void 0&&!(0,tB.alwaysValidSchema)(X,$)}aB.default=WR});var Xz=P((eB)=>{Object.defineProperty(eB,"__esModule",{value:!0});var GR=e(),HR={keyword:["then","else"],schemaType:["object","boolean"],code({keyword:X,parentSchema:Q,it:$}){if(Q.if===void 0)(0,GR.checkStrictMode)($,`"${X}" without "if" is ignored`)}};eB.default=HR});var $z=P((Qz)=>{Object.defineProperty(Qz,"__esModule",{value:!0});var zR=yY(),KR=NB(),UR=gY(),VR=AB(),LR=MB(),qR=PB(),FR=CB(),NR=hY(),OR=xB(),DR=uB(),AR=mB(),wR=pB(),MR=iB(),jR=rB(),RR=sB(),ER=Xz();function IR(X=!1){let Q=[AR.default,wR.default,MR.default,jR.default,RR.default,ER.default,FR.default,NR.default,qR.default,OR.default,DR.default];if(X)Q.push(KR.default,VR.default);else Q.push(zR.default,UR.default);return Q.push(LR.default),Q}Qz.default=IR});var Wz=P((Yz)=>{Object.defineProperty(Yz,"__esModule",{value:!0});var L0=c(),PR={message:({schemaCode:X})=>L0.str`must match format "${X}"`,params:({schemaCode:X})=>L0._`{format: ${X}}`},SR={keyword:"format",type:["number","string"],schemaType:"string",$data:!0,error:PR,code(X,Q){let{gen:$,data:Y,$data:W,schema:J,schemaCode:G,it:H}=X,{opts:B,errSchemaPath:z,schemaEnv:K,self:V}=H;if(!B.validateFormats)return;if(W)L();else U();function L(){let F=$.scopeValue("formats",{ref:V.formats,code:B.code.formats}),q=$.const("fDef",L0._`${F}[${G}]`),N=$.let("fType"),A=$.let("format");$.if(L0._`typeof ${q} == "object" && !(${q} instanceof RegExp)`,()=>$.assign(N,L0._`${q}.type || "string"`).assign(A,L0._`${q}.validate`),()=>$.assign(N,L0._`"string"`).assign(A,q)),X.fail$data((0,L0.or)(M(),R()));function M(){if(B.strictSchema===!1)return L0.nil;return L0._`${G} && !${A}`}function R(){let S=K.$async?L0._`(${q}.async ? await ${A}(${Y}) : ${A}(${Y}))`:L0._`${A}(${Y})`,C=L0._`(typeof ${A} == "function" ? ${S} : ${A}.test(${Y}))`;return L0._`${A} && ${A} !== true && ${N} === ${Q} && !${C}`}}function U(){let F=V.formats[J];if(!F){M();return}if(F===!0)return;let[q,N,A]=R(F);if(q===Q)X.pass(S());function M(){if(B.strictSchema===!1){V.logger.warn(C());return}throw Error(C());function C(){return`unknown format "${J}" ignored in schema at path "${z}"`}}function R(C){let K0=C instanceof RegExp?(0,L0.regexpCode)(C):B.code.formats?L0._`${B.code.formats}${(0,L0.getProperty)(J)}`:void 0,U0=$.scopeValue("formats",{key:J,ref:C,code:K0});if(typeof C=="object"&&!(C instanceof RegExp))return[C.type||"string",C.validate,L0._`${U0}.validate`];return["string",C,U0]}function S(){if(typeof F=="object"&&!(F instanceof RegExp)&&F.async){if(!K.$async)throw Error("async format in sync schema");return L0._`await ${A}(${Y})`}return typeof N=="function"?L0._`${A}(${Y})`:L0._`${A}.test(${Y})`}}}};Yz.default=SR});var Gz=P((Jz)=>{Object.defineProperty(Jz,"__esModule",{value:!0});var CR=Wz(),kR=[CR.default];Jz.default=kR});var zz=P((Hz)=>{Object.defineProperty(Hz,"__esModule",{value:!0});Hz.contentVocabulary=Hz.metadataVocabulary=void 0;Hz.metadataVocabulary=["title","description","default","deprecated","readOnly","writeOnly","examples"];Hz.contentVocabulary=["contentMediaType","contentEncoding","contentSchema"]});var Vz=P((Uz)=>{Object.defineProperty(Uz,"__esModule",{value:!0});var _R=_H(),xR=HB(),yR=$z(),gR=Gz(),Kz=zz(),fR=[_R.default,xR.default,(0,yR.default)(),gR.default,Kz.metadataVocabulary,Kz.contentVocabulary];Uz.default=fR});var Nz=P((qz)=>{Object.defineProperty(qz,"__esModule",{value:!0});qz.DiscrError=void 0;var Lz;(function(X){X.Tag="tag",X.Mapping="mapping"})(Lz||(qz.DiscrError=Lz={}))});var Az=P((Dz)=>{Object.defineProperty(Dz,"__esModule",{value:!0});var i6=c(),lY=Nz(),Oz=_8(),uR=nX(),lR=e(),mR={message:({params:{discrError:X,tagName:Q}})=>X===lY.DiscrError.Tag?`tag "${Q}" must be string`:`value of tag "${Q}" must be in oneOf`,params:({params:{discrError:X,tag:Q,tagName:$}})=>i6._`{error: ${X}, tag: ${$}, tagValue: ${Q}}`},cR={keyword:"discriminator",type:"object",schemaType:"object",error:mR,code(X){let{gen:Q,data:$,schema:Y,parentSchema:W,it:J}=X,{oneOf:G}=W;if(!J.opts.discriminator)throw Error("discriminator: requires discriminator option");let H=Y.propertyName;if(typeof H!="string")throw Error("discriminator: requires propertyName");if(Y.mapping)throw Error("discriminator: mapping is not supported");if(!G)throw Error("discriminator: requires oneOf keyword");let B=Q.let("valid",!1),z=Q.const("tag",i6._`${$}${(0,i6.getProperty)(H)}`);Q.if(i6._`typeof ${z} == "string"`,()=>K(),()=>X.error(!1,{discrError:lY.DiscrError.Tag,tag:z,tagName:H})),X.ok(B);function K(){let U=L();Q.if(!1);for(let F in U)Q.elseIf(i6._`${z} === ${F}`),Q.assign(B,V(U[F]));Q.else(),X.error(!1,{discrError:lY.DiscrError.Mapping,tag:z,tagName:H}),Q.endIf()}function V(U){let F=Q.name("valid"),q=X.subschema({keyword:"oneOf",schemaProp:U},F);return X.mergeEvaluated(q,i6.Name),F}function L(){var U;let F={},q=A(W),N=!0;for(let S=0;S<G.length;S++){let C=G[S];if((C===null||C===void 0?void 0:C.$ref)&&!(0,lR.schemaHasRulesButRef)(C,J.self.RULES)){let U0=C.$ref;if(C=Oz.resolveRef.call(J.self,J.schemaEnv.root,J.baseId,U0),C instanceof Oz.SchemaEnv)C=C.schema;if(C===void 0)throw new uR.default(J.opts.uriResolver,J.baseId,U0)}let K0=(U=C===null||C===void 0?void 0:C.properties)===null||U===void 0?void 0:U[H];if(typeof K0!="object")throw Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${H}"`);N=N&&(q||A(C)),M(K0,S)}if(!N)throw Error(`discriminator: "${H}" must be required`);return F;function A({required:S}){return Array.isArray(S)&&S.includes(H)}function M(S,C){if(S.const)R(S.const,C);else if(S.enum)for(let K0 of S.enum)R(K0,C);else throw Error(`discriminator: "properties/${H}" must have "const" or "enum"`)}function R(S,C){if(typeof S!="string"||S in F)throw Error(`discriminator: "${H}" values must be unique strings`);F[S]=C}}}};Dz.default=cR});var wz=P((W_,dR)=>{dR.exports={$schema:"http://json-schema.org/draft-07/schema#",$id:"http://json-schema.org/draft-07/schema#",title:"Core schema meta-schema",definitions:{schemaArray:{type:"array",minItems:1,items:{$ref:"#"}},nonNegativeInteger:{type:"integer",minimum:0},nonNegativeIntegerDefault0:{allOf:[{$ref:"#/definitions/nonNegativeInteger"},{default:0}]},simpleTypes:{enum:["array","boolean","integer","null","number","object","string"]},stringArray:{type:"array",items:{type:"string"},uniqueItems:!0,default:[]}},type:["object","boolean"],properties:{$id:{type:"string",format:"uri-reference"},$schema:{type:"string",format:"uri"},$ref:{type:"string",format:"uri-reference"},$comment:{type:"string"},title:{type:"string"},description:{type:"string"},default:!0,readOnly:{type:"boolean",default:!1},examples:{type:"array",items:!0},multipleOf:{type:"number",exclusiveMinimum:0},maximum:{type:"number"},exclusiveMaximum:{type:"number"},minimum:{type:"number"},exclusiveMinimum:{type:"number"},maxLength:{$ref:"#/definitions/nonNegativeInteger"},minLength:{$ref:"#/definitions/nonNegativeIntegerDefault0"},pattern:{type:"string",format:"regex"},additionalItems:{$ref:"#"},items:{anyOf:[{$ref:"#"},{$ref:"#/definitions/schemaArray"}],default:!0},maxItems:{$ref:"#/definitions/nonNegativeInteger"},minItems:{$ref:"#/definitions/nonNegativeIntegerDefault0"},uniqueItems:{type:"boolean",default:!1},contains:{$ref:"#"},maxProperties:{$ref:"#/definitions/nonNegativeInteger"},minProperties:{$ref:"#/definitions/nonNegativeIntegerDefault0"},required:{$ref:"#/definitions/stringArray"},additionalProperties:{$ref:"#"},definitions:{type:"object",additionalProperties:{$ref:"#"},default:{}},properties:{type:"object",additionalProperties:{$ref:"#"},default:{}},patternProperties:{type:"object",additionalProperties:{$ref:"#"},propertyNames:{format:"regex"},default:{}},dependencies:{type:"object",additionalProperties:{anyOf:[{$ref:"#"},{$ref:"#/definitions/stringArray"}]}},propertyNames:{$ref:"#"},const:!0,enum:{type:"array",items:!0,minItems:1,uniqueItems:!0},type:{anyOf:[{$ref:"#/definitions/simpleTypes"},{type:"array",items:{$ref:"#/definitions/simpleTypes"},minItems:1,uniqueItems:!0}]},format:{type:"string"},contentMediaType:{type:"string"},contentEncoding:{type:"string"},if:{$ref:"#"},then:{$ref:"#"},else:{$ref:"#"},allOf:{$ref:"#/definitions/schemaArray"},anyOf:{$ref:"#/definitions/schemaArray"},oneOf:{$ref:"#/definitions/schemaArray"},not:{$ref:"#"}},default:!0}});var cY=P((f0,mY)=>{Object.defineProperty(f0,"__esModule",{value:!0});f0.MissingRefError=f0.ValidationError=f0.CodeGen=f0.Name=f0.nil=f0.stringify=f0.str=f0._=f0.KeywordCxt=f0.Ajv=void 0;var iR=EH(),nR=Vz(),rR=Az(),Mz=wz(),oR=["/properties"],e8="http://json-schema.org/draft-07/schema";class J4 extends iR.default{_addVocabularies(){if(super._addVocabularies(),nR.default.forEach((X)=>this.addVocabulary(X)),this.opts.discriminator)this.addKeyword(rR.default)}_addDefaultMetaSchema(){if(super._addDefaultMetaSchema(),!this.opts.meta)return;let X=this.opts.$data?this.$dataMetaSchema(Mz,oR):Mz;this.addMetaSchema(X,e8,!1),this.refs["http://json-schema.org/schema"]=e8}defaultMeta(){return this.opts.defaultMeta=super.defaultMeta()||(this.getSchema(e8)?e8:void 0)}}f0.Ajv=J4;mY.exports=f0=J4;mY.exports.Ajv=J4;Object.defineProperty(f0,"__esModule",{value:!0});f0.default=J4;var tR=iX();Object.defineProperty(f0,"KeywordCxt",{enumerable:!0,get:function(){return tR.KeywordCxt}});var n6=c();Object.defineProperty(f0,"_",{enumerable:!0,get:function(){return n6._}});Object.defineProperty(f0,"str",{enumerable:!0,get:function(){return n6.str}});Object.defineProperty(f0,"stringify",{enumerable:!0,get:function(){return n6.stringify}});Object.defineProperty(f0,"nil",{enumerable:!0,get:function(){return n6.nil}});Object.defineProperty(f0,"Name",{enumerable:!0,get:function(){return n6.Name}});Object.defineProperty(f0,"CodeGen",{enumerable:!0,get:function(){return n6.CodeGen}});var aR=v8();Object.defineProperty(f0,"ValidationError",{enumerable:!0,get:function(){return aR.default}});var sR=nX();Object.defineProperty(f0,"MissingRefError",{enumerable:!0,get:function(){return sR.default}})});var kz=P((Zz)=>{Object.defineProperty(Zz,"__esModule",{value:!0});Zz.formatNames=Zz.fastFormats=Zz.fullFormats=void 0;function L1(X,Q){return{validate:X,compare:Q}}Zz.fullFormats={date:L1(Iz,nY),time:L1(dY(!0),rY),"date-time":L1(jz(!0),Pz),"iso-time":L1(dY(),bz),"iso-date-time":L1(jz(),Sz),duration:/^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,uri:GE,"uri-reference":/^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,"uri-template":/^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,url:/^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,email:/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,hostname:/^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,ipv4:/^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,ipv6:/^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,regex:LE,uuid:/^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,"json-pointer":/^(?:\/(?:[^~/]|~0|~1)*)*$/,"json-pointer-uri-fragment":/^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,"relative-json-pointer":/^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,byte:HE,int32:{type:"number",validate:KE},int64:{type:"number",validate:UE},float:{type:"number",validate:Ez},double:{type:"number",validate:Ez},password:!0,binary:!0};Zz.fastFormats={...Zz.fullFormats,date:L1(/^\d\d\d\d-[0-1]\d-[0-3]\d$/,nY),time:L1(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i,rY),"date-time":L1(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i,Pz),"iso-time":L1(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i,bz),"iso-date-time":L1(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i,Sz),uri:/^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,"uri-reference":/^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,email:/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i};Zz.formatNames=Object.keys(Zz.fullFormats);function QE(X){return X%4===0&&(X%100!==0||X%400===0)}var $E=/^(\d\d\d\d)-(\d\d)-(\d\d)$/,YE=[0,31,28,31,30,31,30,31,31,30,31,30,31];function Iz(X){let Q=$E.exec(X);if(!Q)return!1;let $=+Q[1],Y=+Q[2],W=+Q[3];return Y>=1&&Y<=12&&W>=1&&W<=(Y===2&&QE($)?29:YE[Y])}function nY(X,Q){if(!(X&&Q))return;if(X>Q)return 1;if(X<Q)return-1;return 0}var pY=/^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;function dY(X){return function($){let Y=pY.exec($);if(!Y)return!1;let W=+Y[1],J=+Y[2],G=+Y[3],H=Y[4],B=Y[5]==="-"?-1:1,z=+(Y[6]||0),K=+(Y[7]||0);if(z>23||K>59||X&&!H)return!1;if(W<=23&&J<=59&&G<60)return!0;let V=J-K*B,L=W-z*B-(V<0?1:0);return(L===23||L===-1)&&(V===59||V===-1)&&G<61}}function rY(X,Q){if(!(X&&Q))return;let $=new Date("2020-01-01T"+X).valueOf(),Y=new Date("2020-01-01T"+Q).valueOf();if(!($&&Y))return;return $-Y}function bz(X,Q){if(!(X&&Q))return;let $=pY.exec(X),Y=pY.exec(Q);if(!($&&Y))return;if(X=$[1]+$[2]+$[3],Q=Y[1]+Y[2]+Y[3],X>Q)return 1;if(X<Q)return-1;return 0}var iY=/t|\s/i;function jz(X){let Q=dY(X);return function(Y){let W=Y.split(iY);return W.length===2&&Iz(W[0])&&Q(W[1])}}function Pz(X,Q){if(!(X&&Q))return;let $=new Date(X).valueOf(),Y=new Date(Q).valueOf();if(!($&&Y))return;return $-Y}function Sz(X,Q){if(!(X&&Q))return;let[$,Y]=X.split(iY),[W,J]=Q.split(iY),G=nY($,W);if(G===void 0)return;return G||rY(Y,J)}var WE=/\/|:/,JE=/^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;function GE(X){return WE.test(X)&&JE.test(X)}var Rz=/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;function HE(X){return Rz.lastIndex=0,Rz.test(X)}var BE=-2147483648,zE=2147483647;function KE(X){return Number.isInteger(X)&&X<=zE&&X>=BE}function UE(X){return Number.isInteger(X)}function Ez(){return!0}var VE=/[^\\]\\Z/;function LE(X){if(VE.test(X))return!1;try{return new RegExp(X),!0}catch(Q){return!1}}});var Tz=P((vz)=>{Object.defineProperty(vz,"__esModule",{value:!0});vz.formatLimitDefinition=void 0;var FE=cY(),Y1=c(),n1=Y1.operators,X9={formatMaximum:{okStr:"<=",ok:n1.LTE,fail:n1.GT},formatMinimum:{okStr:">=",ok:n1.GTE,fail:n1.LT},formatExclusiveMaximum:{okStr:"<",ok:n1.LT,fail:n1.GTE},formatExclusiveMinimum:{okStr:">",ok:n1.GT,fail:n1.LTE}},NE={message:({keyword:X,schemaCode:Q})=>Y1.str`should be ${X9[X].okStr} ${Q}`,params:({keyword:X,schemaCode:Q})=>Y1._`{comparison: ${X9[X].okStr}, limit: ${Q}}`};vz.formatLimitDefinition={keyword:Object.keys(X9),type:"string",schemaType:"string",$data:!0,error:NE,code(X){let{gen:Q,data:$,schemaCode:Y,keyword:W,it:J}=X,{opts:G,self:H}=J;if(!G.validateFormats)return;let B=new FE.KeywordCxt(J,H.RULES.all.format.definition,"format");if(B.$data)z();else K();function z(){let L=Q.scopeValue("formats",{ref:H.formats,code:G.code.formats}),U=Q.const("fmt",Y1._`${L}[${B.schemaCode}]`);X.fail$data((0,Y1.or)(Y1._`typeof ${U} != "object"`,Y1._`${U} instanceof RegExp`,Y1._`typeof ${U}.compare != "function"`,V(U)))}function K(){let L=B.schema,U=H.formats[L];if(!U||U===!0)return;if(typeof U!="object"||U instanceof RegExp||typeof U.compare!="function")throw Error(`"${W}": format "${L}" does not define "compare" function`);let F=Q.scopeValue("formats",{key:L,ref:U,code:G.code.formats?Y1._`${G.code.formats}${(0,Y1.getProperty)(L)}`:void 0});X.fail$data(V(F))}function V(L){return Y1._`${L}.compare(${$}, ${Y}) ${X9[W].fail} 0`}},dependencies:["format"]};var OE=(X)=>{return X.addKeyword(vz.formatLimitDefinition),X};vz.default=OE});var gz=P((G4,yz)=>{Object.defineProperty(G4,"__esModule",{value:!0});var r6=kz(),AE=Tz(),aY=c(),_z=new aY.Name("fullFormats"),wE=new aY.Name("fastFormats"),sY=(X,Q={keywords:!0})=>{if(Array.isArray(Q))return xz(X,Q,r6.fullFormats,_z),X;let[$,Y]=Q.mode==="fast"?[r6.fastFormats,wE]:[r6.fullFormats,_z],W=Q.formats||r6.formatNames;if(xz(X,W,$,Y),Q.keywords)(0,AE.default)(X);return X};sY.get=(X,Q="full")=>{let Y=(Q==="fast"?r6.fastFormats:r6.fullFormats)[X];if(!Y)throw Error(`Unknown format "${X}"`);return Y};function xz(X,Q,$,Y){var W,J;(W=(J=X.opts.code).formats)!==null&&W!==void 0||(J.formats=aY._`require("ajv-formats/dist/formats").${Y}`);for(let G of Q)X.addFormat(G,$[G])}yz.exports=G4=sY;Object.defineProperty(G4,"__esModule",{value:!0});G4.default=sY});var BK=50;function N6(X=BK){let Q=new AbortController;return (0,events__WEBPACK_IMPORTED_MODULE_2__.setMaxListeners)(X,Q.signal),Q}var zK=typeof global=="object"&&global&&global.Object===Object&&global,q7=zK;var KK=typeof self=="object"&&self&&self.Object===Object&&self,UK=q7||KK||Function("return this")(),O6=UK;var VK=O6.Symbol,D6=VK;var F7=Object.prototype,LK=F7.hasOwnProperty,qK=F7.toString,e6=D6?D6.toStringTag:void 0;function FK(X){var Q=LK.call(X,e6),$=X[e6];try{X[e6]=void 0;var Y=!0}catch(J){}var W=qK.call(X);if(Y)if(Q)X[e6]=$;else delete X[e6];return W}var N7=FK;var NK=Object.prototype,OK=NK.toString;function DK(X){return OK.call(X)}var O7=DK;var AK="[object Null]",wK="[object Undefined]",D7=D6?D6.toStringTag:void 0;function MK(X){if(X==null)return X===void 0?wK:AK;return D7&&D7 in Object(X)?N7(X):O7(X)}var A7=MK;function jK(X){var Q=typeof X;return X!=null&&(Q=="object"||Q=="function")}var z4=jK;var RK="[object AsyncFunction]",EK="[object Function]",IK="[object GeneratorFunction]",bK="[object Proxy]";function PK(X){if(!z4(X))return!1;var Q=A7(X);return Q==EK||Q==IK||Q==RK||Q==bK}var w7=PK;var SK=O6["__core-js_shared__"],K4=SK;var M7=function(){var X=/[^.]+$/.exec(K4&&K4.keys&&K4.keys.IE_PROTO||"");return X?"Symbol(src)_1."+X:""}();function ZK(X){return!!M7&&M7 in X}var j7=ZK;var CK=Function.prototype,kK=CK.toString;function vK(X){if(X!=null){try{return kK.call(X)}catch(Q){}try{return X+""}catch(Q){}}return""}var R7=vK;var TK=/[\\^$.*+?()[\]{}|]/g,_K=/^\[object .+?Constructor\]$/,xK=Function.prototype,yK=Object.prototype,gK=xK.toString,fK=yK.hasOwnProperty,hK=RegExp("^"+gK.call(fK).replace(TK,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$");function uK(X){if(!z4(X)||j7(X))return!1;var Q=w7(X)?hK:_K;return Q.test(R7(X))}var E7=uK;function lK(X,Q){return X==null?void 0:X[Q]}var I7=lK;function mK(X,Q){var $=I7(X,Q);return E7($)?$:void 0}var U4=mK;var cK=U4(Object,"create"),q1=cK;function pK(){this.__data__=q1?q1(null):{},this.size=0}var b7=pK;function dK(X){var Q=this.has(X)&&delete this.__data__[X];return this.size-=Q?1:0,Q}var P7=dK;var iK="__lodash_hash_undefined__",nK=Object.prototype,rK=nK.hasOwnProperty;function oK(X){var Q=this.__data__;if(q1){var $=Q[X];return $===iK?void 0:$}return rK.call(Q,X)?Q[X]:void 0}var S7=oK;var tK=Object.prototype,aK=tK.hasOwnProperty;function sK(X){var Q=this.__data__;return q1?Q[X]!==void 0:aK.call(Q,X)}var Z7=sK;var eK="__lodash_hash_undefined__";function XU(X,Q){var $=this.__data__;return this.size+=this.has(X)?0:1,$[X]=q1&&Q===void 0?eK:Q,this}var C7=XU;function A6(X){var Q=-1,$=X==null?0:X.length;this.clear();while(++Q<$){var Y=X[Q];this.set(Y[0],Y[1])}}A6.prototype.clear=b7;A6.prototype.delete=P7;A6.prototype.get=S7;A6.prototype.has=Z7;A6.prototype.set=C7;var W9=A6;function QU(){this.__data__=[],this.size=0}var k7=QU;function $U(X,Q){return X===Q||X!==X&&Q!==Q}var v7=$U;function YU(X,Q){var $=X.length;while($--)if(v7(X[$][0],Q))return $;return-1}var Z1=YU;var WU=Array.prototype,JU=WU.splice;function GU(X){var Q=this.__data__,$=Z1(Q,X);if($<0)return!1;var Y=Q.length-1;if($==Y)Q.pop();else JU.call(Q,$,1);return--this.size,!0}var T7=GU;function HU(X){var Q=this.__data__,$=Z1(Q,X);return $<0?void 0:Q[$][1]}var _7=HU;function BU(X){return Z1(this.__data__,X)>-1}var x7=BU;function zU(X,Q){var $=this.__data__,Y=Z1($,X);if(Y<0)++this.size,$.push([X,Q]);else $[Y][1]=Q;return this}var y7=zU;function w6(X){var Q=-1,$=X==null?0:X.length;this.clear();while(++Q<$){var Y=X[Q];this.set(Y[0],Y[1])}}w6.prototype.clear=k7;w6.prototype.delete=T7;w6.prototype.get=_7;w6.prototype.has=x7;w6.prototype.set=y7;var g7=w6;var KU=U4(O6,"Map"),f7=KU;function UU(){this.size=0,this.__data__={hash:new W9,map:new(f7||g7),string:new W9}}var h7=UU;function VU(X){var Q=typeof X;return Q=="string"||Q=="number"||Q=="symbol"||Q=="boolean"?X!=="__proto__":X===null}var u7=VU;function LU(X,Q){var $=X.__data__;return u7(Q)?$[typeof Q=="string"?"string":"hash"]:$.map}var C1=LU;function qU(X){var Q=C1(this,X).delete(X);return this.size-=Q?1:0,Q}var l7=qU;function FU(X){return C1(this,X).get(X)}var m7=FU;function NU(X){return C1(this,X).has(X)}var c7=NU;function OU(X,Q){var $=C1(this,X),Y=$.size;return $.set(X,Q),this.size+=$.size==Y?0:1,this}var p7=OU;function M6(X){var Q=-1,$=X==null?0:X.length;this.clear();while(++Q<$){var Y=X[Q];this.set(Y[0],Y[1])}}M6.prototype.clear=h7;M6.prototype.delete=l7;M6.prototype.get=m7;M6.prototype.has=c7;M6.prototype.set=p7;var J9=M6;var DU="Expected a function";function G9(X,Q){if(typeof X!="function"||Q!=null&&typeof Q!="function")throw TypeError(DU);var $=function(){var Y=arguments,W=Q?Q.apply(this,Y):Y[0],J=$.cache;if(J.has(W))return J.get(W);var G=X.apply(this,Y);return $.cache=J.set(W,G)||J,G};return $.cache=new(G9.Cache||J9),$}G9.Cache=J9;var k1=G9;function AU(X,Q){if(X.destroyed)return;X.write(Q)}function d7(X){AU(process.stderr,X)}var i7=k1((X)=>{if(!X||X.trim()==="")return null;let Q=X.split(",").map((J)=>J.trim()).filter(Boolean);if(Q.length===0)return null;let $=Q.some((J)=>J.startsWith("!")),Y=Q.some((J)=>!J.startsWith("!"));if($&&Y)return null;let W=Q.map((J)=>J.replace(/^!/,"").toLowerCase());return{include:$?[]:W,exclude:$?W:[],isExclusive:$}});function wU(X){let Q=[],$=X.match(/^MCP server ["']([^"']+)["']/);if($&&$[1])Q.push("mcp"),Q.push($[1].toLowerCase());else{let J=X.match(/^([^:[]+):/);if(J&&J[1])Q.push(J[1].trim().toLowerCase())}let Y=X.match(/^\[([^\]]+)]/);if(Y&&Y[1])Q.push(Y[1].trim().toLowerCase());if(X.toLowerCase().includes("statsig event:"))Q.push("statsig");let W=X.match(/:\s*([^:]+?)(?:\s+(?:type|mode|status|event))?:/);if(W&&W[1]){let J=W[1].trim().toLowerCase();if(J.length<30&&!J.includes(" "))Q.push(J)}return Array.from(new Set(Q))}function MU(X,Q){if(!Q)return!0;if(X.length===0)return!1;if(Q.isExclusive)return!X.some(($)=>Q.exclude.includes($));else return X.some(($)=>Q.include.includes($))}function n7(X,Q){if(!Q)return!0;let $=wU(X);return MU($,Q)}function V4(){return process.env.CLAUDE_CONFIG_DIR??(0,path__WEBPACK_IMPORTED_MODULE_0__.join)((0,os__WEBPACK_IMPORTED_MODULE_7__.homedir)(),".claude")}function H9(X){if(!X)return!1;if(typeof X==="boolean")return X;let Q=X.toLowerCase().trim();return["1","true","yes","on"].includes(Q)}function r7(X){return{name:X,default:30000,validate:(Q)=>{if(!Q)return{effective:30000,status:"valid"};let $=parseInt(Q,10);if(isNaN($)||$<=0)return{effective:30000,status:"invalid",message:`Invalid value "${Q}" (using default: 30000)`};if($>150000)return{effective:150000,status:"capped",message:`Capped from ${$} to 150000`};return{effective:$,status:"valid"}}}}var o7=r7("BASH_MAX_OUTPUT_LENGTH"),Eb=r7("TASK_MAX_OUTPUT_LENGTH"),t7={name:"CLAUDE_CODE_MAX_OUTPUT_TOKENS",default:32000,validate:(X)=>{if(!X)return{effective:32000,status:"valid"};let Y=parseInt(X,10);if(isNaN(Y)||Y<=0)return{effective:32000,status:"invalid",message:`Invalid value "${X}" (using default: 32000)`};if(Y>64000)return{effective:64000,status:"capped",message:`Capped from ${Y} to 64000`};return{effective:Y,status:"valid"}}};function PU(){let X="";if(typeof process<"u"&&typeof process.cwd==="function")X=(0,fs__WEBPACK_IMPORTED_MODULE_5__.realpathSync)((0,process__WEBPACK_IMPORTED_MODULE_8__.cwd)());return{originalCwd:X,projectRoot:X,totalCostUSD:0,totalAPIDuration:0,totalAPIDurationWithoutRetries:0,totalToolDuration:0,startTime:Date.now(),lastInteractionTime:Date.now(),totalLinesAdded:0,totalLinesRemoved:0,hasUnknownModelCost:!1,cwd:X,modelUsage:{},mainLoopModelOverride:void 0,initialMainLoopModel:null,modelStrings:null,isInteractive:!1,clientType:"cli",sessionIngressToken:void 0,oauthTokenFromFd:void 0,apiKeyFromFd:void 0,flagSettingsPath:void 0,allowedSettingSources:["userSettings","projectSettings","localSettings","flagSettings","policySettings"],meter:null,sessionCounter:null,locCounter:null,prCounter:null,commitCounter:null,costCounter:null,tokenCounter:null,codeEditToolDecisionCounter:null,activeTimeCounter:null,sessionId:(0,crypto__WEBPACK_IMPORTED_MODULE_9__.randomUUID)(),parentSessionId:void 0,loggerProvider:null,eventLogger:null,meterProvider:null,tracerProvider:null,agentColorMap:new Map,agentColorIndex:0,envVarValidators:[o7,t7],lastAPIRequest:null,inMemoryErrorLog:[],inlinePlugins:[],useCoworkPlugins:!1,sessionBypassPermissionsMode:!1,sessionTrustAccepted:!1,sessionPersistenceDisabled:!1,hasExitedPlanMode:!1,needsPlanModeExitAttachment:!1,hasExitedDelegateMode:!1,needsDelegateModeExitAttachment:!1,lspRecommendationShownThisSession:!1,initJsonSchema:null,registeredHooks:null,planSlugCache:new Map,teleportedSessionInfo:null,invokedSkills:new Map,slowOperations:[],sdkBetas:void 0,mainThreadAgentType:void 0,isRemoteMode:!1,additionalDirectoriesForClaudeMd:[],resumedTranscriptPath:null}}var SU=PU();function a7(){return SU.sessionId}function s7({writeFn:X,flushIntervalMs:Q=1000,maxBufferSize:$=100,immediateMode:Y=!1}){let W=[],J=null;function G(){if(J)clearTimeout(J),J=null}function H(){if(W.length===0)return;X(W.join("")),W=[],G()}function B(){if(!J)J=setTimeout(H,Q)}return{write(z){if(Y){X(z);return}if(W.push(z),B(),W.length>=$)H()},flush:H,dispose(){H()}}}var e7=new Set;function XW(X){return e7.add(X),()=>e7.delete(X)}var B9=1/0;function ZU(X){if(X===null)return"null";if(X===void 0)return"undefined";if(Array.isArray(X))return`Array[${X.length}]`;if(typeof X==="object")return`Object{${Object.keys(X).length} keys}`;if(typeof X==="string")return`string(${X.length} chars)`;return typeof X}function QW(X,Q){let $=performance.now();try{return Q()}finally{performance.now()-$>B9}}function Z0(X,Q,$){let Y=ZU(X);return QW(`JSON.stringify(${Y})`,()=>JSON.stringify(X,Q,$))}var L4=(X,Q)=>{let $=typeof X==="string"?X.length:0;return QW(`JSON.parse(${$} chars)`,()=>JSON.parse(X,Q))};var CU=k1(()=>{return H9(process.env.DEBUG)||H9(process.env.DEBUG_SDK)||process.argv.includes("--debug")||process.argv.includes("-d")||YW()||process.argv.some((X)=>X.startsWith("--debug="))||WW()!==null}),kU=k1(()=>{let X=process.argv.find(($)=>$.startsWith("--debug="));if(!X)return null;let Q=X.substring(8);return i7(Q)}),YW=k1(()=>{return process.argv.includes("--debug-to-stderr")||process.argv.includes("-d2e")}),WW=k1(()=>{for(let X=0;X<process.argv.length;X++){let Q=process.argv[X];if(Q.startsWith("--debug-file="))return Q.substring(13);if(Q==="--debug-file"&&X+1<process.argv.length)return process.argv[X+1]}return null});function vU(X){if(typeof process>"u"||typeof process.versions>"u"||typeof process.versions.node>"u")return!1;let Q=kU();return n7(X,Q)}var TU=!1;var q4=null;function _U(){if(!q4)q4=s7({writeFn:(X)=>{let Q=JW();if(!n0().existsSync((0,path__WEBPACK_IMPORTED_MODULE_0__.dirname)(Q)))n0().mkdirSync((0,path__WEBPACK_IMPORTED_MODULE_0__.dirname)(Q));n0().appendFileSync(Q,X),xU()},flushIntervalMs:1000,maxBufferSize:100,immediateMode:CU()}),XW(async()=>q4?.dispose());return q4}function v1(X,{level:Q}={level:"debug"}){if(!vU(X))return;if(TU&&X.includes(`
`))X=Z0(X);let Y=`${new Date().toISOString()} [${Q.toUpperCase()}] ${X.trim()}
`;if(YW()){d7(Y);return}_U().write(Y)}function JW(){return WW()??process.env.CLAUDE_CODE_DEBUG_LOGS_DIR??(0,path__WEBPACK_IMPORTED_MODULE_0__.join)(V4(),"debug",`${a7()}.txt`)}var xU=k1(()=>{if(process.argv[2]==="--ripgrep")return;try{let X=JW(),Q=(0,path__WEBPACK_IMPORTED_MODULE_0__.dirname)(X),$=(0,path__WEBPACK_IMPORTED_MODULE_0__.join)(Q,"latest");if(!n0().existsSync(Q))n0().mkdirSync(Q);if(n0().existsSync($))try{n0().unlinkSync($)}catch{}n0().symlinkSync(X,$)}catch{}});var lU=(/* unused pure expression or super */ null && (!1));function F0(X,Q){let $=performance.now();try{return Q()}finally{performance.now()-$>B9}}var mU={cwd(){return process.cwd()},existsSync(X){return F0(`existsSync(${X})`,()=>fs__WEBPACK_IMPORTED_MODULE_5__.existsSync(X))},async stat(X){return (0,fs_promises__WEBPACK_IMPORTED_MODULE_6__.stat)(X)},async readdir(X){return (0,fs_promises__WEBPACK_IMPORTED_MODULE_6__.readdir)(X,{withFileTypes:!0})},async unlink(X){return (0,fs_promises__WEBPACK_IMPORTED_MODULE_6__.unlink)(X)},async rmdir(X){return (0,fs_promises__WEBPACK_IMPORTED_MODULE_6__.rmdir)(X)},async rm(X,Q){return (0,fs_promises__WEBPACK_IMPORTED_MODULE_6__.rm)(X,Q)},statSync(X){return F0(`statSync(${X})`,()=>fs__WEBPACK_IMPORTED_MODULE_5__.statSync(X))},lstatSync(X){return F0(`lstatSync(${X})`,()=>fs__WEBPACK_IMPORTED_MODULE_5__.lstatSync(X))},readFileSync(X,Q){return F0(`readFileSync(${X})`,()=>fs__WEBPACK_IMPORTED_MODULE_5__.readFileSync(X,{encoding:Q.encoding}))},readFileBytesSync(X){return F0(`readFileBytesSync(${X})`,()=>fs__WEBPACK_IMPORTED_MODULE_5__.readFileSync(X))},readSync(X,Q){return F0(`readSync(${X}, ${Q.length} bytes)`,()=>{let $=void 0;try{$=fs__WEBPACK_IMPORTED_MODULE_5__.openSync(X,"r");let Y=Buffer.alloc(Q.length),W=fs__WEBPACK_IMPORTED_MODULE_5__.readSync($,Y,0,Q.length,0);return{buffer:Y,bytesRead:W}}finally{if($)fs__WEBPACK_IMPORTED_MODULE_5__.closeSync($)}})},appendFileSync(X,Q,$){return F0(`appendFileSync(${X}, ${Q.length} chars)`,()=>{if(!fs__WEBPACK_IMPORTED_MODULE_5__.existsSync(X)&&$?.mode!==void 0){let Y=fs__WEBPACK_IMPORTED_MODULE_5__.openSync(X,"a",$.mode);try{fs__WEBPACK_IMPORTED_MODULE_5__.appendFileSync(Y,Q)}finally{fs__WEBPACK_IMPORTED_MODULE_5__.closeSync(Y)}}else fs__WEBPACK_IMPORTED_MODULE_5__.appendFileSync(X,Q)})},copyFileSync(X,Q){return F0(`copyFileSync(${X} → ${Q})`,()=>fs__WEBPACK_IMPORTED_MODULE_5__.copyFileSync(X,Q))},unlinkSync(X){return F0(`unlinkSync(${X})`,()=>fs__WEBPACK_IMPORTED_MODULE_5__.unlinkSync(X))},renameSync(X,Q){return F0(`renameSync(${X} → ${Q})`,()=>fs__WEBPACK_IMPORTED_MODULE_5__.renameSync(X,Q))},linkSync(X,Q){return F0(`linkSync(${X} → ${Q})`,()=>fs__WEBPACK_IMPORTED_MODULE_5__.linkSync(X,Q))},symlinkSync(X,Q){return F0(`symlinkSync(${X} → ${Q})`,()=>fs__WEBPACK_IMPORTED_MODULE_5__.symlinkSync(X,Q))},readlinkSync(X){return F0(`readlinkSync(${X})`,()=>fs__WEBPACK_IMPORTED_MODULE_5__.readlinkSync(X))},realpathSync(X){return F0(`realpathSync(${X})`,()=>fs__WEBPACK_IMPORTED_MODULE_5__.realpathSync(X))},mkdirSync(X,Q){return F0(`mkdirSync(${X})`,()=>{if(!fs__WEBPACK_IMPORTED_MODULE_5__.existsSync(X)){let $={recursive:!0};if(Q?.mode!==void 0)$.mode=Q.mode;fs__WEBPACK_IMPORTED_MODULE_5__.mkdirSync(X,$)}})},readdirSync(X){return F0(`readdirSync(${X})`,()=>fs__WEBPACK_IMPORTED_MODULE_5__.readdirSync(X,{withFileTypes:!0}))},readdirStringSync(X){return F0(`readdirStringSync(${X})`,()=>fs__WEBPACK_IMPORTED_MODULE_5__.readdirSync(X))},isDirEmptySync(X){return F0(`isDirEmptySync(${X})`,()=>{return this.readdirSync(X).length===0})},rmdirSync(X){return F0(`rmdirSync(${X})`,()=>fs__WEBPACK_IMPORTED_MODULE_5__.rmdirSync(X))},rmSync(X,Q){return F0(`rmSync(${X})`,()=>fs__WEBPACK_IMPORTED_MODULE_5__.rmSync(X,Q))},createWriteStream(X){return fs__WEBPACK_IMPORTED_MODULE_5__.createWriteStream(X)}},cU=mU;function n0(){return cU}var pU=(/* unused pure expression or super */ null && (["PreToolUse","PostToolUse","PostToolUseFailure","Notification","UserPromptSubmit","SessionStart","SessionEnd","Stop","SubagentStart","SubagentStop","PreCompact","PermissionRequest","Setup"])),dU=(/* unused pure expression or super */ null && (["clear","logout","prompt_input_exit","other","bypass_permissions_disabled"]));class F1 extends Error{}function j6(){return process.versions.bun!==void 0}var F4=null,HW=!1;function tU(){if(HW)return F4;if(HW=!0,!process.env.DEBUG_CLAUDE_AGENT_SDK)return null;let X=(0,path__WEBPACK_IMPORTED_MODULE_0__.join)(V4(),"debug");if(F4=(0,path__WEBPACK_IMPORTED_MODULE_0__.join)(X,`sdk-${(0,crypto__WEBPACK_IMPORTED_MODULE_9__.randomUUID)()}.txt`),!(0,fs__WEBPACK_IMPORTED_MODULE_5__.existsSync)(X))(0,fs__WEBPACK_IMPORTED_MODULE_5__.mkdirSync)(X,{recursive:!0});return process.stderr.write(`SDK debug logs: ${F4}
`),F4}function N1(X){let Q=tU();if(!Q)return;let Y=`${new Date().toISOString()} ${X}
`;(0,fs__WEBPACK_IMPORTED_MODULE_5__.appendFileSync)(Q,Y)}function BW(X,Q){let $={...X};if(Q){let Y={sandbox:Q};if($.settings)try{Y={...L4($.settings),sandbox:Q}}catch{}$.settings=Z0(Y)}return $}class XX{options;process;processStdin;processStdout;ready=!1;abortController;exitError;exitListeners=[];processExitHandler;abortHandler;constructor(X){this.options=X;this.abortController=X.abortController||N6(),this.initialize()}getDefaultExecutable(){return j6()?"bun":"node"}spawnLocalProcess(X){let{command:Q,args:$,cwd:Y,env:W,signal:J}=X,G=W.DEBUG_CLAUDE_AGENT_SDK||this.options.stderr?"pipe":"ignore",H=(0,child_process__WEBPACK_IMPORTED_MODULE_3__.spawn)(Q,$,{cwd:Y,stdio:["pipe","pipe",G],signal:J,env:W,windowsHide:!0});if(W.DEBUG_CLAUDE_AGENT_SDK||this.options.stderr)H.stderr.on("data",(z)=>{let K=z.toString();if(N1(K),this.options.stderr)this.options.stderr(K)});return{stdin:H.stdin,stdout:H.stdout,get killed(){return H.killed},get exitCode(){return H.exitCode},kill:H.kill.bind(H),on:H.on.bind(H),once:H.once.bind(H),off:H.off.bind(H)}}initialize(){try{let{additionalDirectories:X=[],agent:Q,betas:$,cwd:Y,executable:W=this.getDefaultExecutable(),executableArgs:J=[],extraArgs:G={},pathToClaudeCodeExecutable:H,env:B={...process.env},maxThinkingTokens:z,maxTurns:K,maxBudgetUsd:V,model:L,fallbackModel:U,jsonSchema:F,permissionMode:q,allowDangerouslySkipPermissions:N,permissionPromptToolName:A,continueConversation:M,resume:R,settingSources:S,allowedTools:C=[],disallowedTools:K0=[],tools:U0,mcpServers:s,strictMcpConfig:D0,canUseTool:q0,includePartialMessages:W1,plugins:P1,sandbox:U6}=this.options,d=["--output-format","stream-json","--verbose","--input-format","stream-json"];if(z!==void 0)d.push("--max-thinking-tokens",z.toString());if(K)d.push("--max-turns",K.toString());if(V!==void 0)d.push("--max-budget-usd",V.toString());if(L)d.push("--model",L);if(Q)d.push("--agent",Q);if($&&$.length>0)d.push("--betas",$.join(","));if(F)d.push("--json-schema",Z0(F));if(B.DEBUG_CLAUDE_AGENT_SDK)d.push("--debug-to-stderr");if(q0){if(A)throw Error("canUseTool callback cannot be used with permissionPromptToolName. Please use one or the other.");d.push("--permission-prompt-tool","stdio")}else if(A)d.push("--permission-prompt-tool",A);if(M)d.push("--continue");if(R)d.push("--resume",R);if(C.length>0)d.push("--allowedTools",C.join(","));if(K0.length>0)d.push("--disallowedTools",K0.join(","));if(U0!==void 0)if(Array.isArray(U0))if(U0.length===0)d.push("--tools","");else d.push("--tools",U0.join(","));else d.push("--tools","default");if(s&&Object.keys(s).length>0)d.push("--mcp-config",Z0({mcpServers:s}));if(S)d.push("--setting-sources",S.join(","));if(D0)d.push("--strict-mcp-config");if(q)d.push("--permission-mode",q);if(N)d.push("--allow-dangerously-skip-permissions");if(U){if(L&&U===L)throw Error("Fallback model cannot be the same as the main model. Please specify a different model for fallbackModel option.");d.push("--fallback-model",U)}if(W1)d.push("--include-partial-messages");for(let S0 of X)d.push("--add-dir",S0);if(P1&&P1.length>0)for(let S0 of P1)if(S0.type==="local")d.push("--plugin-dir",S0.path);else throw Error(`Unsupported plugin type: ${S0.type}`);if(this.options.forkSession)d.push("--fork-session");if(this.options.resumeSessionAt)d.push("--resume-session-at",this.options.resumeSessionAt);if(this.options.persistSession===!1)d.push("--no-session-persistence");let Q9=BW(G??{},U6);for(let[S0,S1]of Object.entries(Q9))if(S1===null)d.push(`--${S0}`);else d.push(`--${S0}`,S1);if(!B.CLAUDE_CODE_ENTRYPOINT)B.CLAUDE_CODE_ENTRYPOINT="sdk-ts";if(delete B.NODE_OPTIONS,B.DEBUG_CLAUDE_AGENT_SDK)B.DEBUG="1";else delete B.DEBUG;let o6=eU(H),V6=o6?H:W,t6=o6?[...J,...d]:[...J,H,...d],a6={command:V6,args:t6,cwd:Y,env:B,signal:this.abortController.signal};if(this.options.spawnClaudeCodeProcess)N1(`Spawning Claude Code (custom): ${V6} ${t6.join(" ")}`),this.process=this.options.spawnClaudeCodeProcess(a6);else{if(!n0().existsSync(H)){let S1=o6?`Claude Code native binary not found at ${H}. Please ensure Claude Code is installed via native installer or specify a valid path with options.pathToClaudeCodeExecutable.`:`Claude Code executable not found at ${H}. Is options.pathToClaudeCodeExecutable set?`;throw ReferenceError(S1)}N1(`Spawning Claude Code: ${V6} ${t6.join(" ")}`),this.process=this.spawnLocalProcess(a6)}this.processStdin=this.process.stdin,this.processStdout=this.process.stdout;let B4=()=>{if(this.process&&!this.process.killed)this.process.kill("SIGTERM")};this.processExitHandler=B4,this.abortHandler=B4,process.on("exit",this.processExitHandler),this.abortController.signal.addEventListener("abort",this.abortHandler),this.process.on("error",(S0)=>{if(this.ready=!1,this.abortController.signal.aborted)this.exitError=new F1("Claude Code process aborted by user");else this.exitError=Error(`Failed to spawn Claude Code process: ${S0.message}`),N1(this.exitError.message)}),this.process.on("exit",(S0,S1)=>{if(this.ready=!1,this.abortController.signal.aborted)this.exitError=new F1("Claude Code process aborted by user");else{let s6=this.getProcessExitError(S0,S1);if(s6)this.exitError=s6,N1(s6.message)}}),this.ready=!0}catch(X){throw this.ready=!1,X}}getProcessExitError(X,Q){if(X!==0&&X!==null)return Error(`Claude Code process exited with code ${X}`);else if(Q)return Error(`Claude Code process terminated by signal ${Q}`);return}write(X){if(this.abortController.signal.aborted)throw new F1("Operation aborted");if(!this.ready||!this.processStdin)throw Error("ProcessTransport is not ready for writing");if(this.process?.killed||this.process?.exitCode!==null)throw Error("Cannot write to terminated process");if(this.exitError)throw Error(`Cannot write to process that exited with error: ${this.exitError.message}`);N1(`[ProcessTransport] Writing to stdin: ${X.substring(0,100)}`);try{if(!this.processStdin.write(X))N1("[ProcessTransport] Write buffer full, data queued")}catch(Q){throw this.ready=!1,Error(`Failed to write to process stdin: ${Q.message}`)}}close(){if(this.processStdin)this.processStdin.end(),this.processStdin=void 0;if(this.abortHandler)this.abortController.signal.removeEventListener("abort",this.abortHandler),this.abortHandler=void 0;for(let{handler:X}of this.exitListeners)this.process?.off("exit",X);if(this.exitListeners=[],this.process&&!this.process.killed)this.process.kill("SIGTERM"),setTimeout(()=>{if(this.process&&!this.process.killed)this.process.kill("SIGKILL")},5000);if(this.ready=!1,this.processExitHandler)process.off("exit",this.processExitHandler),this.processExitHandler=void 0}isReady(){return this.ready}async*readMessages(){if(!this.processStdout)throw Error("ProcessTransport output stream not available");let X=(0,readline__WEBPACK_IMPORTED_MODULE_4__.createInterface)({input:this.processStdout});try{for await(let Q of X)if(Q.trim())try{yield L4(Q)}catch($){throw N1(`Non-JSON stdout: ${Q}`),Error(`CLI output was not valid JSON. This may indicate an error during startup. Output: ${Q.slice(0,200)}${Q.length>200?"...":""}`)}await this.waitForExit()}catch(Q){throw Q}finally{X.close()}}endInput(){if(this.processStdin)this.processStdin.end()}getInputStream(){return this.processStdin}onExit(X){if(!this.process)return()=>{};let Q=($,Y)=>{let W=this.getProcessExitError($,Y);X(W)};return this.process.on("exit",Q),this.exitListeners.push({callback:X,handler:Q}),()=>{if(this.process)this.process.off("exit",Q);let $=this.exitListeners.findIndex((Y)=>Y.handler===Q);if($!==-1)this.exitListeners.splice($,1)}}async waitForExit(){if(!this.process){if(this.exitError)throw this.exitError;return}if(this.process.exitCode!==null||this.process.killed){if(this.exitError)throw this.exitError;return}return new Promise((X,Q)=>{let $=(W,J)=>{if(this.abortController.signal.aborted){Q(new F1("Operation aborted"));return}let G=this.getProcessExitError(W,J);if(G)Q(G);else X()};this.process.once("exit",$);let Y=(W)=>{this.process.off("exit",$),Q(W)};this.process.once("error",Y),this.process.once("exit",()=>{this.process.off("error",Y)})})}}function eU(X){return![".js",".mjs",".tsx",".ts",".jsx"].some(($)=>X.endsWith($))}class QX{returned;queue=[];readResolve;readReject;isDone=!1;hasError;started=!1;constructor(X){this.returned=X}[Symbol.asyncIterator](){if(this.started)throw Error("Stream can only be iterated once");return this.started=!0,this}next(){if(this.queue.length>0)return Promise.resolve({done:!1,value:this.queue.shift()});if(this.isDone)return Promise.resolve({done:!0,value:void 0});if(this.hasError)return Promise.reject(this.hasError);return new Promise((X,Q)=>{this.readResolve=X,this.readReject=Q})}enqueue(X){if(this.readResolve){let Q=this.readResolve;this.readResolve=void 0,this.readReject=void 0,Q({done:!1,value:X})}else this.queue.push(X)}done(){if(this.isDone=!0,this.readResolve){let X=this.readResolve;this.readResolve=void 0,this.readReject=void 0,X({done:!0,value:void 0})}}error(X){if(this.hasError=X,this.readReject){let Q=this.readReject;this.readResolve=void 0,this.readReject=void 0,Q(X)}}return(){if(this.isDone=!0,this.returned)this.returned();return Promise.resolve({done:!0,value:void 0})}}class K9{sendMcpMessage;isClosed=!1;constructor(X){this.sendMcpMessage=X}onclose;onerror;onmessage;async start(){}async send(X){if(this.isClosed)throw Error("Transport is closed");this.sendMcpMessage(X)}async close(){if(this.isClosed)return;this.isClosed=!0,this.onclose?.()}}class $X{transport;isSingleUserTurn;canUseTool;hooks;abortController;jsonSchema;initConfig;pendingControlResponses=new Map;cleanupPerformed=!1;sdkMessages;inputStream=new QX;initialization;cancelControllers=new Map;hookCallbacks=new Map;nextCallbackId=0;sdkMcpTransports=new Map;sdkMcpServerInstances=new Map;pendingMcpResponses=new Map;firstResultReceivedResolve;firstResultReceived=!1;hasBidirectionalNeeds(){return this.sdkMcpTransports.size>0||this.hooks!==void 0&&Object.keys(this.hooks).length>0||this.canUseTool!==void 0}constructor(X,Q,$,Y,W,J=new Map,G,H){this.transport=X;this.isSingleUserTurn=Q;this.canUseTool=$;this.hooks=Y;this.abortController=W;this.jsonSchema=G;this.initConfig=H;for(let[B,z]of J)this.connectSdkMcpServer(B,z);this.sdkMessages=this.readSdkMessages(),this.readMessages(),this.initialization=this.initialize(),this.initialization.catch(()=>{})}setError(X){this.inputStream.error(X)}close(){this.cleanup()}cleanup(X){if(this.cleanupPerformed)return;this.cleanupPerformed=!0;try{this.transport.close(),this.pendingControlResponses.clear(),this.pendingMcpResponses.clear(),this.cancelControllers.clear(),this.hookCallbacks.clear();for(let Q of this.sdkMcpTransports.values())try{Q.close()}catch{}if(this.sdkMcpTransports.clear(),X)this.inputStream.error(X);else this.inputStream.done()}catch(Q){}}next(...[X]){return this.sdkMessages.next(...[X])}return(X){return this.sdkMessages.return(X)}throw(X){return this.sdkMessages.throw(X)}[Symbol.asyncIterator](){return this.sdkMessages}[Symbol.asyncDispose](){return this.sdkMessages[Symbol.asyncDispose]()}async readMessages(){try{for await(let X of this.transport.readMessages()){if(X.type==="control_response"){let Q=this.pendingControlResponses.get(X.response.request_id);if(Q)Q(X.response);continue}else if(X.type==="control_request"){this.handleControlRequest(X);continue}else if(X.type==="control_cancel_request"){this.handleControlCancelRequest(X);continue}else if(X.type==="keep_alive")continue;if(X.type==="result"){if(this.firstResultReceived=!0,this.firstResultReceivedResolve)this.firstResultReceivedResolve();if(this.isSingleUserTurn)v1("[Query.readMessages] First result received for single-turn query, closing stdin"),this.transport.endInput()}this.inputStream.enqueue(X)}if(this.firstResultReceivedResolve)this.firstResultReceivedResolve();this.inputStream.done(),this.cleanup()}catch(X){if(this.firstResultReceivedResolve)this.firstResultReceivedResolve();this.inputStream.error(X),this.cleanup(X)}}async handleControlRequest(X){let Q=new AbortController;this.cancelControllers.set(X.request_id,Q);try{let $=await this.processControlRequest(X,Q.signal),Y={type:"control_response",response:{subtype:"success",request_id:X.request_id,response:$}};await Promise.resolve(this.transport.write(Z0(Y)+`
`))}catch($){let Y={type:"control_response",response:{subtype:"error",request_id:X.request_id,error:$.message||String($)}};await Promise.resolve(this.transport.write(Z0(Y)+`
`))}finally{this.cancelControllers.delete(X.request_id)}}handleControlCancelRequest(X){let Q=this.cancelControllers.get(X.request_id);if(Q)Q.abort(),this.cancelControllers.delete(X.request_id)}async processControlRequest(X,Q){if(X.request.subtype==="can_use_tool"){if(!this.canUseTool)throw Error("canUseTool callback is not provided.");return{...await this.canUseTool(X.request.tool_name,X.request.input,{signal:Q,suggestions:X.request.permission_suggestions,blockedPath:X.request.blocked_path,decisionReason:X.request.decision_reason,toolUseID:X.request.tool_use_id,agentID:X.request.agent_id}),toolUseID:X.request.tool_use_id}}else if(X.request.subtype==="hook_callback")return await this.handleHookCallbacks(X.request.callback_id,X.request.input,X.request.tool_use_id,Q);else if(X.request.subtype==="mcp_message"){let $=X.request,Y=this.sdkMcpTransports.get($.server_name);if(!Y)throw Error(`SDK MCP server not found: ${$.server_name}`);if("method"in $.message&&"id"in $.message&&$.message.id!==null)return{mcp_response:await this.handleMcpControlRequest($.server_name,$,Y)};else{if(Y.onmessage)Y.onmessage($.message);return{mcp_response:{jsonrpc:"2.0",result:{},id:0}}}}throw Error("Unsupported control request subtype: "+X.request.subtype)}async*readSdkMessages(){for await(let X of this.inputStream)yield X}async initialize(){let X;if(this.hooks){X={};for(let[W,J]of Object.entries(this.hooks))if(J.length>0)X[W]=J.map((G)=>{let H=[];for(let B of G.hooks){let z=`hook_${this.nextCallbackId++}`;this.hookCallbacks.set(z,B),H.push(z)}return{matcher:G.matcher,hookCallbackIds:H,timeout:G.timeout}})}let Q=this.sdkMcpTransports.size>0?Array.from(this.sdkMcpTransports.keys()):void 0,$={subtype:"initialize",hooks:X,sdkMcpServers:Q,jsonSchema:this.jsonSchema,systemPrompt:this.initConfig?.systemPrompt,appendSystemPrompt:this.initConfig?.appendSystemPrompt,agents:this.initConfig?.agents};return(await this.request($)).response}async interrupt(){await this.request({subtype:"interrupt"})}async setPermissionMode(X){await this.request({subtype:"set_permission_mode",mode:X})}async setModel(X){await this.request({subtype:"set_model",model:X})}async setMaxThinkingTokens(X){await this.request({subtype:"set_max_thinking_tokens",max_thinking_tokens:X})}async rewindFiles(X,Q){return(await this.request({subtype:"rewind_files",user_message_id:X,dry_run:Q?.dryRun})).response}async processPendingPermissionRequests(X){for(let Q of X)if(Q.request.subtype==="can_use_tool")this.handleControlRequest(Q).catch(()=>{})}request(X){let Q=Math.random().toString(36).substring(2,15),$={request_id:Q,type:"control_request",request:X};return new Promise((Y,W)=>{this.pendingControlResponses.set(Q,(J)=>{if(J.subtype==="success")Y(J);else if(W(Error(J.error)),J.pending_permission_requests)this.processPendingPermissionRequests(J.pending_permission_requests)}),Promise.resolve(this.transport.write(Z0($)+`
`))})}async supportedCommands(){return(await this.initialization).commands}async supportedModels(){return(await this.initialization).models}async reconnectMcpServer(X){await this.request({subtype:"mcp_reconnect",serverName:X})}async toggleMcpServer(X,Q){await this.request({subtype:"mcp_toggle",serverName:X,enabled:Q})}async mcpServerStatus(){return(await this.request({subtype:"mcp_status"})).response.mcpServers}async setMcpServers(X){let Q={},$={};for(let[H,B]of Object.entries(X))if(B.type==="sdk"&&"instance"in B)Q[H]=B.instance;else $[H]=B;let Y=new Set(this.sdkMcpServerInstances.keys()),W=new Set(Object.keys(Q));for(let H of Y)if(!W.has(H))await this.disconnectSdkMcpServer(H);for(let[H,B]of Object.entries(Q))if(!Y.has(H))this.connectSdkMcpServer(H,B);let J={};for(let H of Object.keys(Q))J[H]={type:"sdk",name:H};return(await this.request({subtype:"mcp_set_servers",servers:{...$,...J}})).response}async accountInfo(){return(await this.initialization).account}async streamInput(X){v1("[Query.streamInput] Starting to process input stream");try{let Q=0;for await(let $ of X){if(Q++,v1(`[Query.streamInput] Processing message ${Q}: ${$.type}`),this.abortController?.signal.aborted)break;await Promise.resolve(this.transport.write(Z0($)+`
`))}if(v1(`[Query.streamInput] Finished processing ${Q} messages from input stream`),Q>0&&this.hasBidirectionalNeeds())v1("[Query.streamInput] Has bidirectional needs, waiting for first result"),await this.waitForFirstResult();v1("[Query] Calling transport.endInput() to close stdin to CLI process"),this.transport.endInput()}catch(Q){if(!(Q instanceof F1))throw Q}}waitForFirstResult(){if(this.firstResultReceived)return v1("[Query.waitForFirstResult] Result already received, returning immediately"),Promise.resolve();return new Promise((X)=>{if(this.abortController?.signal.aborted){X();return}this.abortController?.signal.addEventListener("abort",()=>X(),{once:!0}),this.firstResultReceivedResolve=X})}handleHookCallbacks(X,Q,$,Y){let W=this.hookCallbacks.get(X);if(!W)throw Error(`No hook callback found for ID: ${X}`);return W(Q,$,{signal:Y})}connectSdkMcpServer(X,Q){let $=new K9((Y)=>this.sendMcpServerMessageToCli(X,Y));this.sdkMcpTransports.set(X,$),this.sdkMcpServerInstances.set(X,Q),Q.connect($)}async disconnectSdkMcpServer(X){let Q=this.sdkMcpTransports.get(X);if(Q)await Q.close(),this.sdkMcpTransports.delete(X);this.sdkMcpServerInstances.delete(X)}sendMcpServerMessageToCli(X,Q){if("id"in Q&&Q.id!==null&&Q.id!==void 0){let Y=`${X}:${Q.id}`,W=this.pendingMcpResponses.get(Y);if(W){W.resolve(Q),this.pendingMcpResponses.delete(Y);return}}let $={type:"control_request",request_id:(0,crypto__WEBPACK_IMPORTED_MODULE_9__.randomUUID)(),request:{subtype:"mcp_message",server_name:X,message:Q}};this.transport.write(Z0($)+`
`)}handleMcpControlRequest(X,Q,$){let Y="id"in Q.message?Q.message.id:null,W=`${X}:${Y}`;return new Promise((J,G)=>{let H=()=>{this.pendingMcpResponses.delete(W)},B=(K)=>{H(),J(K)},z=(K)=>{H(),G(K)};if(this.pendingMcpResponses.set(W,{resolve:B,reject:z}),$.onmessage)$.onmessage(Q.message);else{H(),G(Error("No message handler registered"));return}})}}class U9{closed=!1;inputStream;query;queryIterator=null;abortController;_sessionId=null;get sessionId(){if(this._sessionId===null)throw Error("Session ID not available until after receiving messages");return this._sessionId}constructor(X){if(X.resume)this._sessionId=X.resume;this.inputStream=new QX;let Q=X.pathToClaudeCodeExecutable;if(!Q){let W=(0,url__WEBPACK_IMPORTED_MODULE_1__.fileURLToPath)(import.meta.url),J=(0,path__WEBPACK_IMPORTED_MODULE_0__.join)(W,"..");Q=(0,path__WEBPACK_IMPORTED_MODULE_0__.join)(J,"cli.js")}let $={...X.env??process.env};if(!$.CLAUDE_CODE_ENTRYPOINT)$.CLAUDE_CODE_ENTRYPOINT="sdk-ts";this.abortController=N6();let Y=new XX({abortController:this.abortController,pathToClaudeCodeExecutable:Q,env:$,executable:X.executable??(j6()?"bun":"node"),executableArgs:X.executableArgs??[],extraArgs:{},maxThinkingTokens:void 0,maxTurns:void 0,maxBudgetUsd:void 0,model:X.model,fallbackModel:void 0,permissionMode:X.permissionMode??"default",allowDangerouslySkipPermissions:!1,continueConversation:!1,resume:X.resume,settingSources:[],allowedTools:X.allowedTools??[],disallowedTools:X.disallowedTools??[],mcpServers:{},strictMcpConfig:!1,canUseTool:!!X.canUseTool,hooks:!!X.hooks,includePartialMessages:!1,forkSession:!1,resumeSessionAt:void 0});this.query=new $X(Y,!1,X.canUseTool,X.hooks,this.abortController,new Map),this.query.streamInput(this.inputStream)}async send(X){if(this.closed)throw Error("Cannot send to closed session");let Q=typeof X==="string"?{type:"user",session_id:"",message:{role:"user",content:[{type:"text",text:X}]},parent_tool_use_id:null}:X;this.inputStream.enqueue(Q)}async*stream(){if(!this.queryIterator)this.queryIterator=this.query[Symbol.asyncIterator]();while(!0){let{value:X,done:Q}=await this.queryIterator.next();if(Q)return;if(X.type==="system"&&X.subtype==="init")this._sessionId=X.session_id;if(yield X,X.type==="result")return}}close(){if(this.closed)return;this.closed=!0,this.inputStream.done(),this.abortController.abort()}async[Symbol.asyncDispose](){this.close()}}function V9(X){return new U9(X)}function KW(X,Q){return new U9({...Q,resume:X})}var n;(function(X){X.assertEqual=(W)=>{};function Q(W){}X.assertIs=Q;function $(W){throw Error()}X.assertNever=$,X.arrayToEnum=(W)=>{let J={};for(let G of W)J[G]=G;return J},X.getValidEnumValues=(W)=>{let J=X.objectKeys(W).filter((H)=>typeof W[W[H]]!=="number"),G={};for(let H of J)G[H]=W[H];return X.objectValues(G)},X.objectValues=(W)=>{return X.objectKeys(W).map(function(J){return W[J]})},X.objectKeys=typeof Object.keys==="function"?(W)=>Object.keys(W):(W)=>{let J=[];for(let G in W)if(Object.prototype.hasOwnProperty.call(W,G))J.push(G);return J},X.find=(W,J)=>{for(let G of W)if(J(G))return G;return},X.isInteger=typeof Number.isInteger==="function"?(W)=>Number.isInteger(W):(W)=>typeof W==="number"&&Number.isFinite(W)&&Math.floor(W)===W;function Y(W,J=" | "){return W.map((G)=>typeof G==="string"?`'${G}'`:G).join(J)}X.joinValues=Y,X.jsonStringifyReplacer=(W,J)=>{if(typeof J==="bigint")return J.toString();return J}})(n||(n={}));var UW;(function(X){X.mergeShapes=(Q,$)=>{return{...Q,...$}}})(UW||(UW={}));var E=n.arrayToEnum(["string","nan","number","integer","float","boolean","date","bigint","symbol","function","undefined","null","array","object","unknown","promise","void","never","map","set"]),O1=(X)=>{switch(typeof X){case"undefined":return E.undefined;case"string":return E.string;case"number":return Number.isNaN(X)?E.nan:E.number;case"boolean":return E.boolean;case"function":return E.function;case"bigint":return E.bigint;case"symbol":return E.symbol;case"object":if(Array.isArray(X))return E.array;if(X===null)return E.null;if(X.then&&typeof X.then==="function"&&X.catch&&typeof X.catch==="function")return E.promise;if(typeof Map<"u"&&X instanceof Map)return E.map;if(typeof Set<"u"&&X instanceof Set)return E.set;if(typeof Date<"u"&&X instanceof Date)return E.date;return E.object;default:return E.unknown}};var w=n.arrayToEnum(["invalid_type","invalid_literal","custom","invalid_union","invalid_union_discriminator","invalid_enum_value","unrecognized_keys","invalid_arguments","invalid_return_type","invalid_date","invalid_string","too_small","too_big","invalid_intersection_types","not_multiple_of","not_finite"]);class h0 extends Error{get errors(){return this.issues}constructor(X){super();this.issues=[],this.addIssue=($)=>{this.issues=[...this.issues,$]},this.addIssues=($=[])=>{this.issues=[...this.issues,...$]};let Q=new.target.prototype;if(Object.setPrototypeOf)Object.setPrototypeOf(this,Q);else this.__proto__=Q;this.name="ZodError",this.issues=X}format(X){let Q=X||function(W){return W.message},$={_errors:[]},Y=(W)=>{for(let J of W.issues)if(J.code==="invalid_union")J.unionErrors.map(Y);else if(J.code==="invalid_return_type")Y(J.returnTypeError);else if(J.code==="invalid_arguments")Y(J.argumentsError);else if(J.path.length===0)$._errors.push(Q(J));else{let G=$,H=0;while(H<J.path.length){let B=J.path[H];if(H!==J.path.length-1)G[B]=G[B]||{_errors:[]};else G[B]=G[B]||{_errors:[]},G[B]._errors.push(Q(J));G=G[B],H++}}};return Y(this),$}static assert(X){if(!(X instanceof h0))throw Error(`Not a ZodError: ${X}`)}toString(){return this.message}get message(){return JSON.stringify(this.issues,n.jsonStringifyReplacer,2)}get isEmpty(){return this.issues.length===0}flatten(X=(Q)=>Q.message){let Q={},$=[];for(let Y of this.issues)if(Y.path.length>0){let W=Y.path[0];Q[W]=Q[W]||[],Q[W].push(X(Y))}else $.push(X(Y));return{formErrors:$,fieldErrors:Q}}get formErrors(){return this.flatten()}}h0.create=(X)=>{return new h0(X)};var $V=(X,Q)=>{let $;switch(X.code){case w.invalid_type:if(X.received===E.undefined)$="Required";else $=`Expected ${X.expected}, received ${X.received}`;break;case w.invalid_literal:$=`Invalid literal value, expected ${JSON.stringify(X.expected,n.jsonStringifyReplacer)}`;break;case w.unrecognized_keys:$=`Unrecognized key(s) in object: ${n.joinValues(X.keys,", ")}`;break;case w.invalid_union:$="Invalid input";break;case w.invalid_union_discriminator:$=`Invalid discriminator value. Expected ${n.joinValues(X.options)}`;break;case w.invalid_enum_value:$=`Invalid enum value. Expected ${n.joinValues(X.options)}, received '${X.received}'`;break;case w.invalid_arguments:$="Invalid function arguments";break;case w.invalid_return_type:$="Invalid function return type";break;case w.invalid_date:$="Invalid date";break;case w.invalid_string:if(typeof X.validation==="object")if("includes"in X.validation){if($=`Invalid input: must include "${X.validation.includes}"`,typeof X.validation.position==="number")$=`${$} at one or more positions greater than or equal to ${X.validation.position}`}else if("startsWith"in X.validation)$=`Invalid input: must start with "${X.validation.startsWith}"`;else if("endsWith"in X.validation)$=`Invalid input: must end with "${X.validation.endsWith}"`;else n.assertNever(X.validation);else if(X.validation!=="regex")$=`Invalid ${X.validation}`;else $="Invalid";break;case w.too_small:if(X.type==="array")$=`Array must contain ${X.exact?"exactly":X.inclusive?"at least":"more than"} ${X.minimum} element(s)`;else if(X.type==="string")$=`String must contain ${X.exact?"exactly":X.inclusive?"at least":"over"} ${X.minimum} character(s)`;else if(X.type==="number")$=`Number must be ${X.exact?"exactly equal to ":X.inclusive?"greater than or equal to ":"greater than "}${X.minimum}`;else if(X.type==="bigint")$=`Number must be ${X.exact?"exactly equal to ":X.inclusive?"greater than or equal to ":"greater than "}${X.minimum}`;else if(X.type==="date")$=`Date must be ${X.exact?"exactly equal to ":X.inclusive?"greater than or equal to ":"greater than "}${new Date(Number(X.minimum))}`;else $="Invalid input";break;case w.too_big:if(X.type==="array")$=`Array must contain ${X.exact?"exactly":X.inclusive?"at most":"less than"} ${X.maximum} element(s)`;else if(X.type==="string")$=`String must contain ${X.exact?"exactly":X.inclusive?"at most":"under"} ${X.maximum} character(s)`;else if(X.type==="number")$=`Number must be ${X.exact?"exactly":X.inclusive?"less than or equal to":"less than"} ${X.maximum}`;else if(X.type==="bigint")$=`BigInt must be ${X.exact?"exactly":X.inclusive?"less than or equal to":"less than"} ${X.maximum}`;else if(X.type==="date")$=`Date must be ${X.exact?"exactly":X.inclusive?"smaller than or equal to":"smaller than"} ${new Date(Number(X.maximum))}`;else $="Invalid input";break;case w.custom:$="Invalid input";break;case w.invalid_intersection_types:$="Intersection results could not be merged";break;case w.not_multiple_of:$=`Number must be a multiple of ${X.multipleOf}`;break;case w.not_finite:$="Number must be finite";break;default:$=Q.defaultError,n.assertNever(X)}return{message:$}},T1=$V;var YV=T1;function YX(){return YV}var N4=(X)=>{let{data:Q,path:$,errorMaps:Y,issueData:W}=X,J=[...$,...W.path||[]],G={...W,path:J};if(W.message!==void 0)return{...W,path:J,message:W.message};let H="",B=Y.filter((z)=>!!z).slice().reverse();for(let z of B)H=z(G,{data:Q,defaultError:H}).message;return{...W,path:J,message:H}};function b(X,Q){let $=YX(),Y=N4({issueData:Q,data:X.data,path:X.path,errorMaps:[X.common.contextualErrorMap,X.schemaErrorMap,$,$===T1?void 0:T1].filter((W)=>!!W)});X.common.issues.push(Y)}class I0{constructor(){this.value="valid"}dirty(){if(this.value==="valid")this.value="dirty"}abort(){if(this.value!=="aborted")this.value="aborted"}static mergeArray(X,Q){let $=[];for(let Y of Q){if(Y.status==="aborted")return g;if(Y.status==="dirty")X.dirty();$.push(Y.value)}return{status:X.value,value:$}}static async mergeObjectAsync(X,Q){let $=[];for(let Y of Q){let W=await Y.key,J=await Y.value;$.push({key:W,value:J})}return I0.mergeObjectSync(X,$)}static mergeObjectSync(X,Q){let $={};for(let Y of Q){let{key:W,value:J}=Y;if(W.status==="aborted")return g;if(J.status==="aborted")return g;if(W.status==="dirty")X.dirty();if(J.status==="dirty")X.dirty();if(W.value!=="__proto__"&&(typeof J.value<"u"||Y.alwaysSet))$[W.value]=J.value}return{status:X.value,value:$}}}var g=Object.freeze({status:"aborted"}),R6=(X)=>({status:"dirty",value:X}),C0=(X)=>({status:"valid",value:X}),L9=(X)=>X.status==="aborted",q9=(X)=>X.status==="dirty",o1=(X)=>X.status==="valid",WX=(X)=>typeof Promise<"u"&&X instanceof Promise;var Z;(function(X){X.errToObj=(Q)=>typeof Q==="string"?{message:Q}:Q||{},X.toString=(Q)=>typeof Q==="string"?Q:Q?.message})(Z||(Z={}));class r0{constructor(X,Q,$,Y){this._cachedPath=[],this.parent=X,this.data=Q,this._path=$,this._key=Y}get path(){if(!this._cachedPath.length)if(Array.isArray(this._key))this._cachedPath.push(...this._path,...this._key);else this._cachedPath.push(...this._path,this._key);return this._cachedPath}}var VW=(X,Q)=>{if(o1(Q))return{success:!0,data:Q.value};else{if(!X.common.issues.length)throw Error("Validation failed but no issues detected.");return{success:!1,get error(){if(this._error)return this._error;let $=new h0(X.common.issues);return this._error=$,this._error}}}};function l(X){if(!X)return{};let{errorMap:Q,invalid_type_error:$,required_error:Y,description:W}=X;if(Q&&($||Y))throw Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);if(Q)return{errorMap:Q,description:W};return{errorMap:(G,H)=>{let{message:B}=X;if(G.code==="invalid_enum_value")return{message:B??H.defaultError};if(typeof H.data>"u")return{message:B??Y??H.defaultError};if(G.code!=="invalid_type")return{message:H.defaultError};return{message:B??$??H.defaultError}},description:W}}class p{get description(){return this._def.description}_getType(X){return O1(X.data)}_getOrReturnCtx(X,Q){return Q||{common:X.parent.common,data:X.data,parsedType:O1(X.data),schemaErrorMap:this._def.errorMap,path:X.path,parent:X.parent}}_processInputParams(X){return{status:new I0,ctx:{common:X.parent.common,data:X.data,parsedType:O1(X.data),schemaErrorMap:this._def.errorMap,path:X.path,parent:X.parent}}}_parseSync(X){let Q=this._parse(X);if(WX(Q))throw Error("Synchronous parse encountered promise.");return Q}_parseAsync(X){let Q=this._parse(X);return Promise.resolve(Q)}parse(X,Q){let $=this.safeParse(X,Q);if($.success)return $.data;throw $.error}safeParse(X,Q){let $={common:{issues:[],async:Q?.async??!1,contextualErrorMap:Q?.errorMap},path:Q?.path||[],schemaErrorMap:this._def.errorMap,parent:null,data:X,parsedType:O1(X)},Y=this._parseSync({data:X,path:$.path,parent:$});return VW($,Y)}"~validate"(X){let Q={common:{issues:[],async:!!this["~standard"].async},path:[],schemaErrorMap:this._def.errorMap,parent:null,data:X,parsedType:O1(X)};if(!this["~standard"].async)try{let $=this._parseSync({data:X,path:[],parent:Q});return o1($)?{value:$.value}:{issues:Q.common.issues}}catch($){if($?.message?.toLowerCase()?.includes("encountered"))this["~standard"].async=!0;Q.common={issues:[],async:!0}}return this._parseAsync({data:X,path:[],parent:Q}).then(($)=>o1($)?{value:$.value}:{issues:Q.common.issues})}async parseAsync(X,Q){let $=await this.safeParseAsync(X,Q);if($.success)return $.data;throw $.error}async safeParseAsync(X,Q){let $={common:{issues:[],contextualErrorMap:Q?.errorMap,async:!0},path:Q?.path||[],schemaErrorMap:this._def.errorMap,parent:null,data:X,parsedType:O1(X)},Y=this._parse({data:X,path:$.path,parent:$}),W=await(WX(Y)?Y:Promise.resolve(Y));return VW($,W)}refine(X,Q){let $=(Y)=>{if(typeof Q==="string"||typeof Q>"u")return{message:Q};else if(typeof Q==="function")return Q(Y);else return Q};return this._refinement((Y,W)=>{let J=X(Y),G=()=>W.addIssue({code:w.custom,...$(Y)});if(typeof Promise<"u"&&J instanceof Promise)return J.then((H)=>{if(!H)return G(),!1;else return!0});if(!J)return G(),!1;else return!0})}refinement(X,Q){return this._refinement(($,Y)=>{if(!X($))return Y.addIssue(typeof Q==="function"?Q($,Y):Q),!1;else return!0})}_refinement(X){return new H1({schema:this,typeName:j.ZodEffects,effect:{type:"refinement",refinement:X}})}superRefine(X){return this._refinement(X)}constructor(X){this.spa=this.safeParseAsync,this._def=X,this.parse=this.parse.bind(this),this.safeParse=this.safeParse.bind(this),this.parseAsync=this.parseAsync.bind(this),this.safeParseAsync=this.safeParseAsync.bind(this),this.spa=this.spa.bind(this),this.refine=this.refine.bind(this),this.refinement=this.refinement.bind(this),this.superRefine=this.superRefine.bind(this),this.optional=this.optional.bind(this),this.nullable=this.nullable.bind(this),this.nullish=this.nullish.bind(this),this.array=this.array.bind(this),this.promise=this.promise.bind(this),this.or=this.or.bind(this),this.and=this.and.bind(this),this.transform=this.transform.bind(this),this.brand=this.brand.bind(this),this.default=this.default.bind(this),this.catch=this.catch.bind(this),this.describe=this.describe.bind(this),this.pipe=this.pipe.bind(this),this.readonly=this.readonly.bind(this),this.isNullable=this.isNullable.bind(this),this.isOptional=this.isOptional.bind(this),this["~standard"]={version:1,vendor:"zod",validate:(Q)=>this["~validate"](Q)}}optional(){return G1.create(this,this._def)}nullable(){return _1.create(this,this._def)}nullish(){return this.nullable().optional()}array(){return J1.create(this)}promise(){return S6.create(this,this._def)}or(X){return zX.create([this,X],this._def)}and(X){return KX.create(this,X,this._def)}transform(X){return new H1({...l(this._def),schema:this,typeName:j.ZodEffects,effect:{type:"transform",transform:X}})}default(X){let Q=typeof X==="function"?X:()=>X;return new qX({...l(this._def),innerType:this,defaultValue:Q,typeName:j.ZodDefault})}brand(){return new D9({typeName:j.ZodBranded,type:this,...l(this._def)})}catch(X){let Q=typeof X==="function"?X:()=>X;return new FX({...l(this._def),innerType:this,catchValue:Q,typeName:j.ZodCatch})}describe(X){return new this.constructor({...this._def,description:X})}pipe(X){return E4.create(this,X)}readonly(){return NX.create(this)}isOptional(){return this.safeParse(void 0).success}isNullable(){return this.safeParse(null).success}}var WV=/^c[^\s-]{8,}$/i,JV=/^[0-9a-z]+$/,GV=/^[0-9A-HJKMNP-TV-Z]{26}$/i,HV=/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i,BV=/^[a-z0-9_-]{21}$/i,zV=/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,KV=/^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/,UV=/^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i,VV="^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$",F9,LV=/^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,qV=/^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,FV=/^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,NV=/^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,OV=/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,DV=/^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,LW="((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))",AV=new RegExp(`^${LW}$`);function qW(X){let Q="[0-5]\\d";if(X.precision)Q=`${Q}\\.\\d{${X.precision}}`;else if(X.precision==null)Q=`${Q}(\\.\\d+)?`;let $=X.precision?"+":"?";return`([01]\\d|2[0-3]):[0-5]\\d(:${Q})${$}`}function wV(X){return new RegExp(`^${qW(X)}$`)}function MV(X){let Q=`${LW}T${qW(X)}`,$=[];if($.push(X.local?"Z?":"Z"),X.offset)$.push("([+-]\\d{2}:?\\d{2})");return Q=`${Q}(${$.join("|")})`,new RegExp(`^${Q}$`)}function jV(X,Q){if((Q==="v4"||!Q)&&LV.test(X))return!0;if((Q==="v6"||!Q)&&FV.test(X))return!0;return!1}function RV(X,Q){if(!zV.test(X))return!1;try{let[$]=X.split(".");if(!$)return!1;let Y=$.replace(/-/g,"+").replace(/_/g,"/").padEnd($.length+(4-$.length%4)%4,"="),W=JSON.parse(atob(Y));if(typeof W!=="object"||W===null)return!1;if("typ"in W&&W?.typ!=="JWT")return!1;if(!W.alg)return!1;if(Q&&W.alg!==Q)return!1;return!0}catch{return!1}}function EV(X,Q){if((Q==="v4"||!Q)&&qV.test(X))return!0;if((Q==="v6"||!Q)&&NV.test(X))return!0;return!1}class A1 extends p{_parse(X){if(this._def.coerce)X.data=String(X.data);if(this._getType(X)!==E.string){let W=this._getOrReturnCtx(X);return b(W,{code:w.invalid_type,expected:E.string,received:W.parsedType}),g}let $=new I0,Y=void 0;for(let W of this._def.checks)if(W.kind==="min"){if(X.data.length<W.value)Y=this._getOrReturnCtx(X,Y),b(Y,{code:w.too_small,minimum:W.value,type:"string",inclusive:!0,exact:!1,message:W.message}),$.dirty()}else if(W.kind==="max"){if(X.data.length>W.value)Y=this._getOrReturnCtx(X,Y),b(Y,{code:w.too_big,maximum:W.value,type:"string",inclusive:!0,exact:!1,message:W.message}),$.dirty()}else if(W.kind==="length"){let J=X.data.length>W.value,G=X.data.length<W.value;if(J||G){if(Y=this._getOrReturnCtx(X,Y),J)b(Y,{code:w.too_big,maximum:W.value,type:"string",inclusive:!0,exact:!0,message:W.message});else if(G)b(Y,{code:w.too_small,minimum:W.value,type:"string",inclusive:!0,exact:!0,message:W.message});$.dirty()}}else if(W.kind==="email"){if(!UV.test(X.data))Y=this._getOrReturnCtx(X,Y),b(Y,{validation:"email",code:w.invalid_string,message:W.message}),$.dirty()}else if(W.kind==="emoji"){if(!F9)F9=new RegExp(VV,"u");if(!F9.test(X.data))Y=this._getOrReturnCtx(X,Y),b(Y,{validation:"emoji",code:w.invalid_string,message:W.message}),$.dirty()}else if(W.kind==="uuid"){if(!HV.test(X.data))Y=this._getOrReturnCtx(X,Y),b(Y,{validation:"uuid",code:w.invalid_string,message:W.message}),$.dirty()}else if(W.kind==="nanoid"){if(!BV.test(X.data))Y=this._getOrReturnCtx(X,Y),b(Y,{validation:"nanoid",code:w.invalid_string,message:W.message}),$.dirty()}else if(W.kind==="cuid"){if(!WV.test(X.data))Y=this._getOrReturnCtx(X,Y),b(Y,{validation:"cuid",code:w.invalid_string,message:W.message}),$.dirty()}else if(W.kind==="cuid2"){if(!JV.test(X.data))Y=this._getOrReturnCtx(X,Y),b(Y,{validation:"cuid2",code:w.invalid_string,message:W.message}),$.dirty()}else if(W.kind==="ulid"){if(!GV.test(X.data))Y=this._getOrReturnCtx(X,Y),b(Y,{validation:"ulid",code:w.invalid_string,message:W.message}),$.dirty()}else if(W.kind==="url")try{new URL(X.data)}catch{Y=this._getOrReturnCtx(X,Y),b(Y,{validation:"url",code:w.invalid_string,message:W.message}),$.dirty()}else if(W.kind==="regex"){if(W.regex.lastIndex=0,!W.regex.test(X.data))Y=this._getOrReturnCtx(X,Y),b(Y,{validation:"regex",code:w.invalid_string,message:W.message}),$.dirty()}else if(W.kind==="trim")X.data=X.data.trim();else if(W.kind==="includes"){if(!X.data.includes(W.value,W.position))Y=this._getOrReturnCtx(X,Y),b(Y,{code:w.invalid_string,validation:{includes:W.value,position:W.position},message:W.message}),$.dirty()}else if(W.kind==="toLowerCase")X.data=X.data.toLowerCase();else if(W.kind==="toUpperCase")X.data=X.data.toUpperCase();else if(W.kind==="startsWith"){if(!X.data.startsWith(W.value))Y=this._getOrReturnCtx(X,Y),b(Y,{code:w.invalid_string,validation:{startsWith:W.value},message:W.message}),$.dirty()}else if(W.kind==="endsWith"){if(!X.data.endsWith(W.value))Y=this._getOrReturnCtx(X,Y),b(Y,{code:w.invalid_string,validation:{endsWith:W.value},message:W.message}),$.dirty()}else if(W.kind==="datetime"){if(!MV(W).test(X.data))Y=this._getOrReturnCtx(X,Y),b(Y,{code:w.invalid_string,validation:"datetime",message:W.message}),$.dirty()}else if(W.kind==="date"){if(!AV.test(X.data))Y=this._getOrReturnCtx(X,Y),b(Y,{code:w.invalid_string,validation:"date",message:W.message}),$.dirty()}else if(W.kind==="time"){if(!wV(W).test(X.data))Y=this._getOrReturnCtx(X,Y),b(Y,{code:w.invalid_string,validation:"time",message:W.message}),$.dirty()}else if(W.kind==="duration"){if(!KV.test(X.data))Y=this._getOrReturnCtx(X,Y),b(Y,{validation:"duration",code:w.invalid_string,message:W.message}),$.dirty()}else if(W.kind==="ip"){if(!jV(X.data,W.version))Y=this._getOrReturnCtx(X,Y),b(Y,{validation:"ip",code:w.invalid_string,message:W.message}),$.dirty()}else if(W.kind==="jwt"){if(!RV(X.data,W.alg))Y=this._getOrReturnCtx(X,Y),b(Y,{validation:"jwt",code:w.invalid_string,message:W.message}),$.dirty()}else if(W.kind==="cidr"){if(!EV(X.data,W.version))Y=this._getOrReturnCtx(X,Y),b(Y,{validation:"cidr",code:w.invalid_string,message:W.message}),$.dirty()}else if(W.kind==="base64"){if(!OV.test(X.data))Y=this._getOrReturnCtx(X,Y),b(Y,{validation:"base64",code:w.invalid_string,message:W.message}),$.dirty()}else if(W.kind==="base64url"){if(!DV.test(X.data))Y=this._getOrReturnCtx(X,Y),b(Y,{validation:"base64url",code:w.invalid_string,message:W.message}),$.dirty()}else n.assertNever(W);return{status:$.value,value:X.data}}_regex(X,Q,$){return this.refinement((Y)=>X.test(Y),{validation:Q,code:w.invalid_string,...Z.errToObj($)})}_addCheck(X){return new A1({...this._def,checks:[...this._def.checks,X]})}email(X){return this._addCheck({kind:"email",...Z.errToObj(X)})}url(X){return this._addCheck({kind:"url",...Z.errToObj(X)})}emoji(X){return this._addCheck({kind:"emoji",...Z.errToObj(X)})}uuid(X){return this._addCheck({kind:"uuid",...Z.errToObj(X)})}nanoid(X){return this._addCheck({kind:"nanoid",...Z.errToObj(X)})}cuid(X){return this._addCheck({kind:"cuid",...Z.errToObj(X)})}cuid2(X){return this._addCheck({kind:"cuid2",...Z.errToObj(X)})}ulid(X){return this._addCheck({kind:"ulid",...Z.errToObj(X)})}base64(X){return this._addCheck({kind:"base64",...Z.errToObj(X)})}base64url(X){return this._addCheck({kind:"base64url",...Z.errToObj(X)})}jwt(X){return this._addCheck({kind:"jwt",...Z.errToObj(X)})}ip(X){return this._addCheck({kind:"ip",...Z.errToObj(X)})}cidr(X){return this._addCheck({kind:"cidr",...Z.errToObj(X)})}datetime(X){if(typeof X==="string")return this._addCheck({kind:"datetime",precision:null,offset:!1,local:!1,message:X});return this._addCheck({kind:"datetime",precision:typeof X?.precision>"u"?null:X?.precision,offset:X?.offset??!1,local:X?.local??!1,...Z.errToObj(X?.message)})}date(X){return this._addCheck({kind:"date",message:X})}time(X){if(typeof X==="string")return this._addCheck({kind:"time",precision:null,message:X});return this._addCheck({kind:"time",precision:typeof X?.precision>"u"?null:X?.precision,...Z.errToObj(X?.message)})}duration(X){return this._addCheck({kind:"duration",...Z.errToObj(X)})}regex(X,Q){return this._addCheck({kind:"regex",regex:X,...Z.errToObj(Q)})}includes(X,Q){return this._addCheck({kind:"includes",value:X,position:Q?.position,...Z.errToObj(Q?.message)})}startsWith(X,Q){return this._addCheck({kind:"startsWith",value:X,...Z.errToObj(Q)})}endsWith(X,Q){return this._addCheck({kind:"endsWith",value:X,...Z.errToObj(Q)})}min(X,Q){return this._addCheck({kind:"min",value:X,...Z.errToObj(Q)})}max(X,Q){return this._addCheck({kind:"max",value:X,...Z.errToObj(Q)})}length(X,Q){return this._addCheck({kind:"length",value:X,...Z.errToObj(Q)})}nonempty(X){return this.min(1,Z.errToObj(X))}trim(){return new A1({...this._def,checks:[...this._def.checks,{kind:"trim"}]})}toLowerCase(){return new A1({...this._def,checks:[...this._def.checks,{kind:"toLowerCase"}]})}toUpperCase(){return new A1({...this._def,checks:[...this._def.checks,{kind:"toUpperCase"}]})}get isDatetime(){return!!this._def.checks.find((X)=>X.kind==="datetime")}get isDate(){return!!this._def.checks.find((X)=>X.kind==="date")}get isTime(){return!!this._def.checks.find((X)=>X.kind==="time")}get isDuration(){return!!this._def.checks.find((X)=>X.kind==="duration")}get isEmail(){return!!this._def.checks.find((X)=>X.kind==="email")}get isURL(){return!!this._def.checks.find((X)=>X.kind==="url")}get isEmoji(){return!!this._def.checks.find((X)=>X.kind==="emoji")}get isUUID(){return!!this._def.checks.find((X)=>X.kind==="uuid")}get isNANOID(){return!!this._def.checks.find((X)=>X.kind==="nanoid")}get isCUID(){return!!this._def.checks.find((X)=>X.kind==="cuid")}get isCUID2(){return!!this._def.checks.find((X)=>X.kind==="cuid2")}get isULID(){return!!this._def.checks.find((X)=>X.kind==="ulid")}get isIP(){return!!this._def.checks.find((X)=>X.kind==="ip")}get isCIDR(){return!!this._def.checks.find((X)=>X.kind==="cidr")}get isBase64(){return!!this._def.checks.find((X)=>X.kind==="base64")}get isBase64url(){return!!this._def.checks.find((X)=>X.kind==="base64url")}get minLength(){let X=null;for(let Q of this._def.checks)if(Q.kind==="min"){if(X===null||Q.value>X)X=Q.value}return X}get maxLength(){let X=null;for(let Q of this._def.checks)if(Q.kind==="max"){if(X===null||Q.value<X)X=Q.value}return X}}A1.create=(X)=>{return new A1({checks:[],typeName:j.ZodString,coerce:X?.coerce??!1,...l(X)})};function IV(X,Q){let $=(X.toString().split(".")[1]||"").length,Y=(Q.toString().split(".")[1]||"").length,W=$>Y?$:Y,J=Number.parseInt(X.toFixed(W).replace(".","")),G=Number.parseInt(Q.toFixed(W).replace(".",""));return J%G/10**W}class I6 extends p{constructor(){super(...arguments);this.min=this.gte,this.max=this.lte,this.step=this.multipleOf}_parse(X){if(this._def.coerce)X.data=Number(X.data);if(this._getType(X)!==E.number){let W=this._getOrReturnCtx(X);return b(W,{code:w.invalid_type,expected:E.number,received:W.parsedType}),g}let $=void 0,Y=new I0;for(let W of this._def.checks)if(W.kind==="int"){if(!n.isInteger(X.data))$=this._getOrReturnCtx(X,$),b($,{code:w.invalid_type,expected:"integer",received:"float",message:W.message}),Y.dirty()}else if(W.kind==="min"){if(W.inclusive?X.data<W.value:X.data<=W.value)$=this._getOrReturnCtx(X,$),b($,{code:w.too_small,minimum:W.value,type:"number",inclusive:W.inclusive,exact:!1,message:W.message}),Y.dirty()}else if(W.kind==="max"){if(W.inclusive?X.data>W.value:X.data>=W.value)$=this._getOrReturnCtx(X,$),b($,{code:w.too_big,maximum:W.value,type:"number",inclusive:W.inclusive,exact:!1,message:W.message}),Y.dirty()}else if(W.kind==="multipleOf"){if(IV(X.data,W.value)!==0)$=this._getOrReturnCtx(X,$),b($,{code:w.not_multiple_of,multipleOf:W.value,message:W.message}),Y.dirty()}else if(W.kind==="finite"){if(!Number.isFinite(X.data))$=this._getOrReturnCtx(X,$),b($,{code:w.not_finite,message:W.message}),Y.dirty()}else n.assertNever(W);return{status:Y.value,value:X.data}}gte(X,Q){return this.setLimit("min",X,!0,Z.toString(Q))}gt(X,Q){return this.setLimit("min",X,!1,Z.toString(Q))}lte(X,Q){return this.setLimit("max",X,!0,Z.toString(Q))}lt(X,Q){return this.setLimit("max",X,!1,Z.toString(Q))}setLimit(X,Q,$,Y){return new I6({...this._def,checks:[...this._def.checks,{kind:X,value:Q,inclusive:$,message:Z.toString(Y)}]})}_addCheck(X){return new I6({...this._def,checks:[...this._def.checks,X]})}int(X){return this._addCheck({kind:"int",message:Z.toString(X)})}positive(X){return this._addCheck({kind:"min",value:0,inclusive:!1,message:Z.toString(X)})}negative(X){return this._addCheck({kind:"max",value:0,inclusive:!1,message:Z.toString(X)})}nonpositive(X){return this._addCheck({kind:"max",value:0,inclusive:!0,message:Z.toString(X)})}nonnegative(X){return this._addCheck({kind:"min",value:0,inclusive:!0,message:Z.toString(X)})}multipleOf(X,Q){return this._addCheck({kind:"multipleOf",value:X,message:Z.toString(Q)})}finite(X){return this._addCheck({kind:"finite",message:Z.toString(X)})}safe(X){return this._addCheck({kind:"min",inclusive:!0,value:Number.MIN_SAFE_INTEGER,message:Z.toString(X)})._addCheck({kind:"max",inclusive:!0,value:Number.MAX_SAFE_INTEGER,message:Z.toString(X)})}get minValue(){let X=null;for(let Q of this._def.checks)if(Q.kind==="min"){if(X===null||Q.value>X)X=Q.value}return X}get maxValue(){let X=null;for(let Q of this._def.checks)if(Q.kind==="max"){if(X===null||Q.value<X)X=Q.value}return X}get isInt(){return!!this._def.checks.find((X)=>X.kind==="int"||X.kind==="multipleOf"&&n.isInteger(X.value))}get isFinite(){let X=null,Q=null;for(let $ of this._def.checks)if($.kind==="finite"||$.kind==="int"||$.kind==="multipleOf")return!0;else if($.kind==="min"){if(Q===null||$.value>Q)Q=$.value}else if($.kind==="max"){if(X===null||$.value<X)X=$.value}return Number.isFinite(Q)&&Number.isFinite(X)}}I6.create=(X)=>{return new I6({checks:[],typeName:j.ZodNumber,coerce:X?.coerce||!1,...l(X)})};class b6 extends p{constructor(){super(...arguments);this.min=this.gte,this.max=this.lte}_parse(X){if(this._def.coerce)try{X.data=BigInt(X.data)}catch{return this._getInvalidInput(X)}if(this._getType(X)!==E.bigint)return this._getInvalidInput(X);let $=void 0,Y=new I0;for(let W of this._def.checks)if(W.kind==="min"){if(W.inclusive?X.data<W.value:X.data<=W.value)$=this._getOrReturnCtx(X,$),b($,{code:w.too_small,type:"bigint",minimum:W.value,inclusive:W.inclusive,message:W.message}),Y.dirty()}else if(W.kind==="max"){if(W.inclusive?X.data>W.value:X.data>=W.value)$=this._getOrReturnCtx(X,$),b($,{code:w.too_big,type:"bigint",maximum:W.value,inclusive:W.inclusive,message:W.message}),Y.dirty()}else if(W.kind==="multipleOf"){if(X.data%W.value!==BigInt(0))$=this._getOrReturnCtx(X,$),b($,{code:w.not_multiple_of,multipleOf:W.value,message:W.message}),Y.dirty()}else n.assertNever(W);return{status:Y.value,value:X.data}}_getInvalidInput(X){let Q=this._getOrReturnCtx(X);return b(Q,{code:w.invalid_type,expected:E.bigint,received:Q.parsedType}),g}gte(X,Q){return this.setLimit("min",X,!0,Z.toString(Q))}gt(X,Q){return this.setLimit("min",X,!1,Z.toString(Q))}lte(X,Q){return this.setLimit("max",X,!0,Z.toString(Q))}lt(X,Q){return this.setLimit("max",X,!1,Z.toString(Q))}setLimit(X,Q,$,Y){return new b6({...this._def,checks:[...this._def.checks,{kind:X,value:Q,inclusive:$,message:Z.toString(Y)}]})}_addCheck(X){return new b6({...this._def,checks:[...this._def.checks,X]})}positive(X){return this._addCheck({kind:"min",value:BigInt(0),inclusive:!1,message:Z.toString(X)})}negative(X){return this._addCheck({kind:"max",value:BigInt(0),inclusive:!1,message:Z.toString(X)})}nonpositive(X){return this._addCheck({kind:"max",value:BigInt(0),inclusive:!0,message:Z.toString(X)})}nonnegative(X){return this._addCheck({kind:"min",value:BigInt(0),inclusive:!0,message:Z.toString(X)})}multipleOf(X,Q){return this._addCheck({kind:"multipleOf",value:X,message:Z.toString(Q)})}get minValue(){let X=null;for(let Q of this._def.checks)if(Q.kind==="min"){if(X===null||Q.value>X)X=Q.value}return X}get maxValue(){let X=null;for(let Q of this._def.checks)if(Q.kind==="max"){if(X===null||Q.value<X)X=Q.value}return X}}b6.create=(X)=>{return new b6({checks:[],typeName:j.ZodBigInt,coerce:X?.coerce??!1,...l(X)})};class O4 extends p{_parse(X){if(this._def.coerce)X.data=Boolean(X.data);if(this._getType(X)!==E.boolean){let $=this._getOrReturnCtx(X);return b($,{code:w.invalid_type,expected:E.boolean,received:$.parsedType}),g}return C0(X.data)}}O4.create=(X)=>{return new O4({typeName:j.ZodBoolean,coerce:X?.coerce||!1,...l(X)})};class GX extends p{_parse(X){if(this._def.coerce)X.data=new Date(X.data);if(this._getType(X)!==E.date){let W=this._getOrReturnCtx(X);return b(W,{code:w.invalid_type,expected:E.date,received:W.parsedType}),g}if(Number.isNaN(X.data.getTime())){let W=this._getOrReturnCtx(X);return b(W,{code:w.invalid_date}),g}let $=new I0,Y=void 0;for(let W of this._def.checks)if(W.kind==="min"){if(X.data.getTime()<W.value)Y=this._getOrReturnCtx(X,Y),b(Y,{code:w.too_small,message:W.message,inclusive:!0,exact:!1,minimum:W.value,type:"date"}),$.dirty()}else if(W.kind==="max"){if(X.data.getTime()>W.value)Y=this._getOrReturnCtx(X,Y),b(Y,{code:w.too_big,message:W.message,inclusive:!0,exact:!1,maximum:W.value,type:"date"}),$.dirty()}else n.assertNever(W);return{status:$.value,value:new Date(X.data.getTime())}}_addCheck(X){return new GX({...this._def,checks:[...this._def.checks,X]})}min(X,Q){return this._addCheck({kind:"min",value:X.getTime(),message:Z.toString(Q)})}max(X,Q){return this._addCheck({kind:"max",value:X.getTime(),message:Z.toString(Q)})}get minDate(){let X=null;for(let Q of this._def.checks)if(Q.kind==="min"){if(X===null||Q.value>X)X=Q.value}return X!=null?new Date(X):null}get maxDate(){let X=null;for(let Q of this._def.checks)if(Q.kind==="max"){if(X===null||Q.value<X)X=Q.value}return X!=null?new Date(X):null}}GX.create=(X)=>{return new GX({checks:[],coerce:X?.coerce||!1,typeName:j.ZodDate,...l(X)})};class D4 extends p{_parse(X){if(this._getType(X)!==E.symbol){let $=this._getOrReturnCtx(X);return b($,{code:w.invalid_type,expected:E.symbol,received:$.parsedType}),g}return C0(X.data)}}D4.create=(X)=>{return new D4({typeName:j.ZodSymbol,...l(X)})};class HX extends p{_parse(X){if(this._getType(X)!==E.undefined){let $=this._getOrReturnCtx(X);return b($,{code:w.invalid_type,expected:E.undefined,received:$.parsedType}),g}return C0(X.data)}}HX.create=(X)=>{return new HX({typeName:j.ZodUndefined,...l(X)})};class BX extends p{_parse(X){if(this._getType(X)!==E.null){let $=this._getOrReturnCtx(X);return b($,{code:w.invalid_type,expected:E.null,received:$.parsedType}),g}return C0(X.data)}}BX.create=(X)=>{return new BX({typeName:j.ZodNull,...l(X)})};class A4 extends p{constructor(){super(...arguments);this._any=!0}_parse(X){return C0(X.data)}}A4.create=(X)=>{return new A4({typeName:j.ZodAny,...l(X)})};class t1 extends p{constructor(){super(...arguments);this._unknown=!0}_parse(X){return C0(X.data)}}t1.create=(X)=>{return new t1({typeName:j.ZodUnknown,...l(X)})};class w1 extends p{_parse(X){let Q=this._getOrReturnCtx(X);return b(Q,{code:w.invalid_type,expected:E.never,received:Q.parsedType}),g}}w1.create=(X)=>{return new w1({typeName:j.ZodNever,...l(X)})};class w4 extends p{_parse(X){if(this._getType(X)!==E.undefined){let $=this._getOrReturnCtx(X);return b($,{code:w.invalid_type,expected:E.void,received:$.parsedType}),g}return C0(X.data)}}w4.create=(X)=>{return new w4({typeName:j.ZodVoid,...l(X)})};class J1 extends p{_parse(X){let{ctx:Q,status:$}=this._processInputParams(X),Y=this._def;if(Q.parsedType!==E.array)return b(Q,{code:w.invalid_type,expected:E.array,received:Q.parsedType}),g;if(Y.exactLength!==null){let J=Q.data.length>Y.exactLength.value,G=Q.data.length<Y.exactLength.value;if(J||G)b(Q,{code:J?w.too_big:w.too_small,minimum:G?Y.exactLength.value:void 0,maximum:J?Y.exactLength.value:void 0,type:"array",inclusive:!0,exact:!0,message:Y.exactLength.message}),$.dirty()}if(Y.minLength!==null){if(Q.data.length<Y.minLength.value)b(Q,{code:w.too_small,minimum:Y.minLength.value,type:"array",inclusive:!0,exact:!1,message:Y.minLength.message}),$.dirty()}if(Y.maxLength!==null){if(Q.data.length>Y.maxLength.value)b(Q,{code:w.too_big,maximum:Y.maxLength.value,type:"array",inclusive:!0,exact:!1,message:Y.maxLength.message}),$.dirty()}if(Q.common.async)return Promise.all([...Q.data].map((J,G)=>{return Y.type._parseAsync(new r0(Q,J,Q.path,G))})).then((J)=>{return I0.mergeArray($,J)});let W=[...Q.data].map((J,G)=>{return Y.type._parseSync(new r0(Q,J,Q.path,G))});return I0.mergeArray($,W)}get element(){return this._def.type}min(X,Q){return new J1({...this._def,minLength:{value:X,message:Z.toString(Q)}})}max(X,Q){return new J1({...this._def,maxLength:{value:X,message:Z.toString(Q)}})}length(X,Q){return new J1({...this._def,exactLength:{value:X,message:Z.toString(Q)}})}nonempty(X){return this.min(1,X)}}J1.create=(X,Q)=>{return new J1({type:X,minLength:null,maxLength:null,exactLength:null,typeName:j.ZodArray,...l(Q)})};function E6(X){if(X instanceof V0){let Q={};for(let $ in X.shape){let Y=X.shape[$];Q[$]=G1.create(E6(Y))}return new V0({...X._def,shape:()=>Q})}else if(X instanceof J1)return new J1({...X._def,type:E6(X.element)});else if(X instanceof G1)return G1.create(E6(X.unwrap()));else if(X instanceof _1)return _1.create(E6(X.unwrap()));else if(X instanceof M1)return M1.create(X.items.map((Q)=>E6(Q)));else return X}class V0 extends p{constructor(){super(...arguments);this._cached=null,this.nonstrict=this.passthrough,this.augment=this.extend}_getCached(){if(this._cached!==null)return this._cached;let X=this._def.shape(),Q=n.objectKeys(X);return this._cached={shape:X,keys:Q},this._cached}_parse(X){if(this._getType(X)!==E.object){let B=this._getOrReturnCtx(X);return b(B,{code:w.invalid_type,expected:E.object,received:B.parsedType}),g}let{status:$,ctx:Y}=this._processInputParams(X),{shape:W,keys:J}=this._getCached(),G=[];if(!(this._def.catchall instanceof w1&&this._def.unknownKeys==="strip")){for(let B in Y.data)if(!J.includes(B))G.push(B)}let H=[];for(let B of J){let z=W[B],K=Y.data[B];H.push({key:{status:"valid",value:B},value:z._parse(new r0(Y,K,Y.path,B)),alwaysSet:B in Y.data})}if(this._def.catchall instanceof w1){let B=this._def.unknownKeys;if(B==="passthrough")for(let z of G)H.push({key:{status:"valid",value:z},value:{status:"valid",value:Y.data[z]}});else if(B==="strict"){if(G.length>0)b(Y,{code:w.unrecognized_keys,keys:G}),$.dirty()}else if(B==="strip");else throw Error("Internal ZodObject error: invalid unknownKeys value.")}else{let B=this._def.catchall;for(let z of G){let K=Y.data[z];H.push({key:{status:"valid",value:z},value:B._parse(new r0(Y,K,Y.path,z)),alwaysSet:z in Y.data})}}if(Y.common.async)return Promise.resolve().then(async()=>{let B=[];for(let z of H){let K=await z.key,V=await z.value;B.push({key:K,value:V,alwaysSet:z.alwaysSet})}return B}).then((B)=>{return I0.mergeObjectSync($,B)});else return I0.mergeObjectSync($,H)}get shape(){return this._def.shape()}strict(X){return Z.errToObj,new V0({...this._def,unknownKeys:"strict",...X!==void 0?{errorMap:(Q,$)=>{let Y=this._def.errorMap?.(Q,$).message??$.defaultError;if(Q.code==="unrecognized_keys")return{message:Z.errToObj(X).message??Y};return{message:Y}}}:{}})}strip(){return new V0({...this._def,unknownKeys:"strip"})}passthrough(){return new V0({...this._def,unknownKeys:"passthrough"})}extend(X){return new V0({...this._def,shape:()=>({...this._def.shape(),...X})})}merge(X){return new V0({unknownKeys:X._def.unknownKeys,catchall:X._def.catchall,shape:()=>({...this._def.shape(),...X._def.shape()}),typeName:j.ZodObject})}setKey(X,Q){return this.augment({[X]:Q})}catchall(X){return new V0({...this._def,catchall:X})}pick(X){let Q={};for(let $ of n.objectKeys(X))if(X[$]&&this.shape[$])Q[$]=this.shape[$];return new V0({...this._def,shape:()=>Q})}omit(X){let Q={};for(let $ of n.objectKeys(this.shape))if(!X[$])Q[$]=this.shape[$];return new V0({...this._def,shape:()=>Q})}deepPartial(){return E6(this)}partial(X){let Q={};for(let $ of n.objectKeys(this.shape)){let Y=this.shape[$];if(X&&!X[$])Q[$]=Y;else Q[$]=Y.optional()}return new V0({...this._def,shape:()=>Q})}required(X){let Q={};for(let $ of n.objectKeys(this.shape))if(X&&!X[$])Q[$]=this.shape[$];else{let W=this.shape[$];while(W instanceof G1)W=W._def.innerType;Q[$]=W}return new V0({...this._def,shape:()=>Q})}keyof(){return FW(n.objectKeys(this.shape))}}V0.create=(X,Q)=>{return new V0({shape:()=>X,unknownKeys:"strip",catchall:w1.create(),typeName:j.ZodObject,...l(Q)})};V0.strictCreate=(X,Q)=>{return new V0({shape:()=>X,unknownKeys:"strict",catchall:w1.create(),typeName:j.ZodObject,...l(Q)})};V0.lazycreate=(X,Q)=>{return new V0({shape:X,unknownKeys:"strip",catchall:w1.create(),typeName:j.ZodObject,...l(Q)})};class zX extends p{_parse(X){let{ctx:Q}=this._processInputParams(X),$=this._def.options;function Y(W){for(let G of W)if(G.result.status==="valid")return G.result;for(let G of W)if(G.result.status==="dirty")return Q.common.issues.push(...G.ctx.common.issues),G.result;let J=W.map((G)=>new h0(G.ctx.common.issues));return b(Q,{code:w.invalid_union,unionErrors:J}),g}if(Q.common.async)return Promise.all($.map(async(W)=>{let J={...Q,common:{...Q.common,issues:[]},parent:null};return{result:await W._parseAsync({data:Q.data,path:Q.path,parent:J}),ctx:J}})).then(Y);else{let W=void 0,J=[];for(let H of $){let B={...Q,common:{...Q.common,issues:[]},parent:null},z=H._parseSync({data:Q.data,path:Q.path,parent:B});if(z.status==="valid")return z;else if(z.status==="dirty"&&!W)W={result:z,ctx:B};if(B.common.issues.length)J.push(B.common.issues)}if(W)return Q.common.issues.push(...W.ctx.common.issues),W.result;let G=J.map((H)=>new h0(H));return b(Q,{code:w.invalid_union,unionErrors:G}),g}}get options(){return this._def.options}}zX.create=(X,Q)=>{return new zX({options:X,typeName:j.ZodUnion,...l(Q)})};var D1=(X)=>{if(X instanceof UX)return D1(X.schema);else if(X instanceof H1)return D1(X.innerType());else if(X instanceof VX)return[X.value];else if(X instanceof a1)return X.options;else if(X instanceof LX)return n.objectValues(X.enum);else if(X instanceof qX)return D1(X._def.innerType);else if(X instanceof HX)return[void 0];else if(X instanceof BX)return[null];else if(X instanceof G1)return[void 0,...D1(X.unwrap())];else if(X instanceof _1)return[null,...D1(X.unwrap())];else if(X instanceof D9)return D1(X.unwrap());else if(X instanceof NX)return D1(X.unwrap());else if(X instanceof FX)return D1(X._def.innerType);else return[]};class O9 extends p{_parse(X){let{ctx:Q}=this._processInputParams(X);if(Q.parsedType!==E.object)return b(Q,{code:w.invalid_type,expected:E.object,received:Q.parsedType}),g;let $=this.discriminator,Y=Q.data[$],W=this.optionsMap.get(Y);if(!W)return b(Q,{code:w.invalid_union_discriminator,options:Array.from(this.optionsMap.keys()),path:[$]}),g;if(Q.common.async)return W._parseAsync({data:Q.data,path:Q.path,parent:Q});else return W._parseSync({data:Q.data,path:Q.path,parent:Q})}get discriminator(){return this._def.discriminator}get options(){return this._def.options}get optionsMap(){return this._def.optionsMap}static create(X,Q,$){let Y=new Map;for(let W of Q){let J=D1(W.shape[X]);if(!J.length)throw Error(`A discriminator value for key \`${X}\` could not be extracted from all schema options`);for(let G of J){if(Y.has(G))throw Error(`Discriminator property ${String(X)} has duplicate value ${String(G)}`);Y.set(G,W)}}return new O9({typeName:j.ZodDiscriminatedUnion,discriminator:X,options:Q,optionsMap:Y,...l($)})}}function N9(X,Q){let $=O1(X),Y=O1(Q);if(X===Q)return{valid:!0,data:X};else if($===E.object&&Y===E.object){let W=n.objectKeys(Q),J=n.objectKeys(X).filter((H)=>W.indexOf(H)!==-1),G={...X,...Q};for(let H of J){let B=N9(X[H],Q[H]);if(!B.valid)return{valid:!1};G[H]=B.data}return{valid:!0,data:G}}else if($===E.array&&Y===E.array){if(X.length!==Q.length)return{valid:!1};let W=[];for(let J=0;J<X.length;J++){let G=X[J],H=Q[J],B=N9(G,H);if(!B.valid)return{valid:!1};W.push(B.data)}return{valid:!0,data:W}}else if($===E.date&&Y===E.date&&+X===+Q)return{valid:!0,data:X};else return{valid:!1}}class KX extends p{_parse(X){let{status:Q,ctx:$}=this._processInputParams(X),Y=(W,J)=>{if(L9(W)||L9(J))return g;let G=N9(W.value,J.value);if(!G.valid)return b($,{code:w.invalid_intersection_types}),g;if(q9(W)||q9(J))Q.dirty();return{status:Q.value,value:G.data}};if($.common.async)return Promise.all([this._def.left._parseAsync({data:$.data,path:$.path,parent:$}),this._def.right._parseAsync({data:$.data,path:$.path,parent:$})]).then(([W,J])=>Y(W,J));else return Y(this._def.left._parseSync({data:$.data,path:$.path,parent:$}),this._def.right._parseSync({data:$.data,path:$.path,parent:$}))}}KX.create=(X,Q,$)=>{return new KX({left:X,right:Q,typeName:j.ZodIntersection,...l($)})};class M1 extends p{_parse(X){let{status:Q,ctx:$}=this._processInputParams(X);if($.parsedType!==E.array)return b($,{code:w.invalid_type,expected:E.array,received:$.parsedType}),g;if($.data.length<this._def.items.length)return b($,{code:w.too_small,minimum:this._def.items.length,inclusive:!0,exact:!1,type:"array"}),g;if(!this._def.rest&&$.data.length>this._def.items.length)b($,{code:w.too_big,maximum:this._def.items.length,inclusive:!0,exact:!1,type:"array"}),Q.dirty();let W=[...$.data].map((J,G)=>{let H=this._def.items[G]||this._def.rest;if(!H)return null;return H._parse(new r0($,J,$.path,G))}).filter((J)=>!!J);if($.common.async)return Promise.all(W).then((J)=>{return I0.mergeArray(Q,J)});else return I0.mergeArray(Q,W)}get items(){return this._def.items}rest(X){return new M1({...this._def,rest:X})}}M1.create=(X,Q)=>{if(!Array.isArray(X))throw Error("You must pass an array of schemas to z.tuple([ ... ])");return new M1({items:X,typeName:j.ZodTuple,rest:null,...l(Q)})};class M4 extends p{get keySchema(){return this._def.keyType}get valueSchema(){return this._def.valueType}_parse(X){let{status:Q,ctx:$}=this._processInputParams(X);if($.parsedType!==E.object)return b($,{code:w.invalid_type,expected:E.object,received:$.parsedType}),g;let Y=[],W=this._def.keyType,J=this._def.valueType;for(let G in $.data)Y.push({key:W._parse(new r0($,G,$.path,G)),value:J._parse(new r0($,$.data[G],$.path,G)),alwaysSet:G in $.data});if($.common.async)return I0.mergeObjectAsync(Q,Y);else return I0.mergeObjectSync(Q,Y)}get element(){return this._def.valueType}static create(X,Q,$){if(Q instanceof p)return new M4({keyType:X,valueType:Q,typeName:j.ZodRecord,...l($)});return new M4({keyType:A1.create(),valueType:X,typeName:j.ZodRecord,...l(Q)})}}class j4 extends p{get keySchema(){return this._def.keyType}get valueSchema(){return this._def.valueType}_parse(X){let{status:Q,ctx:$}=this._processInputParams(X);if($.parsedType!==E.map)return b($,{code:w.invalid_type,expected:E.map,received:$.parsedType}),g;let Y=this._def.keyType,W=this._def.valueType,J=[...$.data.entries()].map(([G,H],B)=>{return{key:Y._parse(new r0($,G,$.path,[B,"key"])),value:W._parse(new r0($,H,$.path,[B,"value"]))}});if($.common.async){let G=new Map;return Promise.resolve().then(async()=>{for(let H of J){let B=await H.key,z=await H.value;if(B.status==="aborted"||z.status==="aborted")return g;if(B.status==="dirty"||z.status==="dirty")Q.dirty();G.set(B.value,z.value)}return{status:Q.value,value:G}})}else{let G=new Map;for(let H of J){let{key:B,value:z}=H;if(B.status==="aborted"||z.status==="aborted")return g;if(B.status==="dirty"||z.status==="dirty")Q.dirty();G.set(B.value,z.value)}return{status:Q.value,value:G}}}}j4.create=(X,Q,$)=>{return new j4({valueType:Q,keyType:X,typeName:j.ZodMap,...l($)})};class P6 extends p{_parse(X){let{status:Q,ctx:$}=this._processInputParams(X);if($.parsedType!==E.set)return b($,{code:w.invalid_type,expected:E.set,received:$.parsedType}),g;let Y=this._def;if(Y.minSize!==null){if($.data.size<Y.minSize.value)b($,{code:w.too_small,minimum:Y.minSize.value,type:"set",inclusive:!0,exact:!1,message:Y.minSize.message}),Q.dirty()}if(Y.maxSize!==null){if($.data.size>Y.maxSize.value)b($,{code:w.too_big,maximum:Y.maxSize.value,type:"set",inclusive:!0,exact:!1,message:Y.maxSize.message}),Q.dirty()}let W=this._def.valueType;function J(H){let B=new Set;for(let z of H){if(z.status==="aborted")return g;if(z.status==="dirty")Q.dirty();B.add(z.value)}return{status:Q.value,value:B}}let G=[...$.data.values()].map((H,B)=>W._parse(new r0($,H,$.path,B)));if($.common.async)return Promise.all(G).then((H)=>J(H));else return J(G)}min(X,Q){return new P6({...this._def,minSize:{value:X,message:Z.toString(Q)}})}max(X,Q){return new P6({...this._def,maxSize:{value:X,message:Z.toString(Q)}})}size(X,Q){return this.min(X,Q).max(X,Q)}nonempty(X){return this.min(1,X)}}P6.create=(X,Q)=>{return new P6({valueType:X,minSize:null,maxSize:null,typeName:j.ZodSet,...l(Q)})};class JX extends p{constructor(){super(...arguments);this.validate=this.implement}_parse(X){let{ctx:Q}=this._processInputParams(X);if(Q.parsedType!==E.function)return b(Q,{code:w.invalid_type,expected:E.function,received:Q.parsedType}),g;function $(G,H){return N4({data:G,path:Q.path,errorMaps:[Q.common.contextualErrorMap,Q.schemaErrorMap,YX(),T1].filter((B)=>!!B),issueData:{code:w.invalid_arguments,argumentsError:H}})}function Y(G,H){return N4({data:G,path:Q.path,errorMaps:[Q.common.contextualErrorMap,Q.schemaErrorMap,YX(),T1].filter((B)=>!!B),issueData:{code:w.invalid_return_type,returnTypeError:H}})}let W={errorMap:Q.common.contextualErrorMap},J=Q.data;if(this._def.returns instanceof S6){let G=this;return C0(async function(...H){let B=new h0([]),z=await G._def.args.parseAsync(H,W).catch((L)=>{throw B.addIssue($(H,L)),B}),K=await Reflect.apply(J,this,z);return await G._def.returns._def.type.parseAsync(K,W).catch((L)=>{throw B.addIssue(Y(K,L)),B})})}else{let G=this;return C0(function(...H){let B=G._def.args.safeParse(H,W);if(!B.success)throw new h0([$(H,B.error)]);let z=Reflect.apply(J,this,B.data),K=G._def.returns.safeParse(z,W);if(!K.success)throw new h0([Y(z,K.error)]);return K.data})}}parameters(){return this._def.args}returnType(){return this._def.returns}args(...X){return new JX({...this._def,args:M1.create(X).rest(t1.create())})}returns(X){return new JX({...this._def,returns:X})}implement(X){return this.parse(X)}strictImplement(X){return this.parse(X)}static create(X,Q,$){return new JX({args:X?X:M1.create([]).rest(t1.create()),returns:Q||t1.create(),typeName:j.ZodFunction,...l($)})}}class UX extends p{get schema(){return this._def.getter()}_parse(X){let{ctx:Q}=this._processInputParams(X);return this._def.getter()._parse({data:Q.data,path:Q.path,parent:Q})}}UX.create=(X,Q)=>{return new UX({getter:X,typeName:j.ZodLazy,...l(Q)})};class VX extends p{_parse(X){if(X.data!==this._def.value){let Q=this._getOrReturnCtx(X);return b(Q,{received:Q.data,code:w.invalid_literal,expected:this._def.value}),g}return{status:"valid",value:X.data}}get value(){return this._def.value}}VX.create=(X,Q)=>{return new VX({value:X,typeName:j.ZodLiteral,...l(Q)})};function FW(X,Q){return new a1({values:X,typeName:j.ZodEnum,...l(Q)})}class a1 extends p{_parse(X){if(typeof X.data!=="string"){let Q=this._getOrReturnCtx(X),$=this._def.values;return b(Q,{expected:n.joinValues($),received:Q.parsedType,code:w.invalid_type}),g}if(!this._cache)this._cache=new Set(this._def.values);if(!this._cache.has(X.data)){let Q=this._getOrReturnCtx(X),$=this._def.values;return b(Q,{received:Q.data,code:w.invalid_enum_value,options:$}),g}return C0(X.data)}get options(){return this._def.values}get enum(){let X={};for(let Q of this._def.values)X[Q]=Q;return X}get Values(){let X={};for(let Q of this._def.values)X[Q]=Q;return X}get Enum(){let X={};for(let Q of this._def.values)X[Q]=Q;return X}extract(X,Q=this._def){return a1.create(X,{...this._def,...Q})}exclude(X,Q=this._def){return a1.create(this.options.filter(($)=>!X.includes($)),{...this._def,...Q})}}a1.create=FW;class LX extends p{_parse(X){let Q=n.getValidEnumValues(this._def.values),$=this._getOrReturnCtx(X);if($.parsedType!==E.string&&$.parsedType!==E.number){let Y=n.objectValues(Q);return b($,{expected:n.joinValues(Y),received:$.parsedType,code:w.invalid_type}),g}if(!this._cache)this._cache=new Set(n.getValidEnumValues(this._def.values));if(!this._cache.has(X.data)){let Y=n.objectValues(Q);return b($,{received:$.data,code:w.invalid_enum_value,options:Y}),g}return C0(X.data)}get enum(){return this._def.values}}LX.create=(X,Q)=>{return new LX({values:X,typeName:j.ZodNativeEnum,...l(Q)})};class S6 extends p{unwrap(){return this._def.type}_parse(X){let{ctx:Q}=this._processInputParams(X);if(Q.parsedType!==E.promise&&Q.common.async===!1)return b(Q,{code:w.invalid_type,expected:E.promise,received:Q.parsedType}),g;let $=Q.parsedType===E.promise?Q.data:Promise.resolve(Q.data);return C0($.then((Y)=>{return this._def.type.parseAsync(Y,{path:Q.path,errorMap:Q.common.contextualErrorMap})}))}}S6.create=(X,Q)=>{return new S6({type:X,typeName:j.ZodPromise,...l(Q)})};class H1 extends p{innerType(){return this._def.schema}sourceType(){return this._def.schema._def.typeName===j.ZodEffects?this._def.schema.sourceType():this._def.schema}_parse(X){let{status:Q,ctx:$}=this._processInputParams(X),Y=this._def.effect||null,W={addIssue:(J)=>{if(b($,J),J.fatal)Q.abort();else Q.dirty()},get path(){return $.path}};if(W.addIssue=W.addIssue.bind(W),Y.type==="preprocess"){let J=Y.transform($.data,W);if($.common.async)return Promise.resolve(J).then(async(G)=>{if(Q.value==="aborted")return g;let H=await this._def.schema._parseAsync({data:G,path:$.path,parent:$});if(H.status==="aborted")return g;if(H.status==="dirty")return R6(H.value);if(Q.value==="dirty")return R6(H.value);return H});else{if(Q.value==="aborted")return g;let G=this._def.schema._parseSync({data:J,path:$.path,parent:$});if(G.status==="aborted")return g;if(G.status==="dirty")return R6(G.value);if(Q.value==="dirty")return R6(G.value);return G}}if(Y.type==="refinement"){let J=(G)=>{let H=Y.refinement(G,W);if($.common.async)return Promise.resolve(H);if(H instanceof Promise)throw Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");return G};if($.common.async===!1){let G=this._def.schema._parseSync({data:$.data,path:$.path,parent:$});if(G.status==="aborted")return g;if(G.status==="dirty")Q.dirty();return J(G.value),{status:Q.value,value:G.value}}else return this._def.schema._parseAsync({data:$.data,path:$.path,parent:$}).then((G)=>{if(G.status==="aborted")return g;if(G.status==="dirty")Q.dirty();return J(G.value).then(()=>{return{status:Q.value,value:G.value}})})}if(Y.type==="transform")if($.common.async===!1){let J=this._def.schema._parseSync({data:$.data,path:$.path,parent:$});if(!o1(J))return g;let G=Y.transform(J.value,W);if(G instanceof Promise)throw Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");return{status:Q.value,value:G}}else return this._def.schema._parseAsync({data:$.data,path:$.path,parent:$}).then((J)=>{if(!o1(J))return g;return Promise.resolve(Y.transform(J.value,W)).then((G)=>({status:Q.value,value:G}))});n.assertNever(Y)}}H1.create=(X,Q,$)=>{return new H1({schema:X,typeName:j.ZodEffects,effect:Q,...l($)})};H1.createWithPreprocess=(X,Q,$)=>{return new H1({schema:Q,effect:{type:"preprocess",transform:X},typeName:j.ZodEffects,...l($)})};class G1 extends p{_parse(X){if(this._getType(X)===E.undefined)return C0(void 0);return this._def.innerType._parse(X)}unwrap(){return this._def.innerType}}G1.create=(X,Q)=>{return new G1({innerType:X,typeName:j.ZodOptional,...l(Q)})};class _1 extends p{_parse(X){if(this._getType(X)===E.null)return C0(null);return this._def.innerType._parse(X)}unwrap(){return this._def.innerType}}_1.create=(X,Q)=>{return new _1({innerType:X,typeName:j.ZodNullable,...l(Q)})};class qX extends p{_parse(X){let{ctx:Q}=this._processInputParams(X),$=Q.data;if(Q.parsedType===E.undefined)$=this._def.defaultValue();return this._def.innerType._parse({data:$,path:Q.path,parent:Q})}removeDefault(){return this._def.innerType}}qX.create=(X,Q)=>{return new qX({innerType:X,typeName:j.ZodDefault,defaultValue:typeof Q.default==="function"?Q.default:()=>Q.default,...l(Q)})};class FX extends p{_parse(X){let{ctx:Q}=this._processInputParams(X),$={...Q,common:{...Q.common,issues:[]}},Y=this._def.innerType._parse({data:$.data,path:$.path,parent:{...$}});if(WX(Y))return Y.then((W)=>{return{status:"valid",value:W.status==="valid"?W.value:this._def.catchValue({get error(){return new h0($.common.issues)},input:$.data})}});else return{status:"valid",value:Y.status==="valid"?Y.value:this._def.catchValue({get error(){return new h0($.common.issues)},input:$.data})}}removeCatch(){return this._def.innerType}}FX.create=(X,Q)=>{return new FX({innerType:X,typeName:j.ZodCatch,catchValue:typeof Q.catch==="function"?Q.catch:()=>Q.catch,...l(Q)})};class R4 extends p{_parse(X){if(this._getType(X)!==E.nan){let $=this._getOrReturnCtx(X);return b($,{code:w.invalid_type,expected:E.nan,received:$.parsedType}),g}return{status:"valid",value:X.data}}}R4.create=(X)=>{return new R4({typeName:j.ZodNaN,...l(X)})};var D2=Symbol("zod_brand");class D9 extends p{_parse(X){let{ctx:Q}=this._processInputParams(X),$=Q.data;return this._def.type._parse({data:$,path:Q.path,parent:Q})}unwrap(){return this._def.type}}class E4 extends p{_parse(X){let{status:Q,ctx:$}=this._processInputParams(X);if($.common.async)return(async()=>{let W=await this._def.in._parseAsync({data:$.data,path:$.path,parent:$});if(W.status==="aborted")return g;if(W.status==="dirty")return Q.dirty(),R6(W.value);else return this._def.out._parseAsync({data:W.value,path:$.path,parent:$})})();else{let Y=this._def.in._parseSync({data:$.data,path:$.path,parent:$});if(Y.status==="aborted")return g;if(Y.status==="dirty")return Q.dirty(),{status:"dirty",value:Y.value};else return this._def.out._parseSync({data:Y.value,path:$.path,parent:$})}}static create(X,Q){return new E4({in:X,out:Q,typeName:j.ZodPipeline})}}class NX extends p{_parse(X){let Q=this._def.innerType._parse(X),$=(Y)=>{if(o1(Y))Y.value=Object.freeze(Y.value);return Y};return WX(Q)?Q.then((Y)=>$(Y)):$(Q)}unwrap(){return this._def.innerType}}NX.create=(X,Q)=>{return new NX({innerType:X,typeName:j.ZodReadonly,...l(Q)})};var A2={object:V0.lazycreate},j;(function(X){X.ZodString="ZodString",X.ZodNumber="ZodNumber",X.ZodNaN="ZodNaN",X.ZodBigInt="ZodBigInt",X.ZodBoolean="ZodBoolean",X.ZodDate="ZodDate",X.ZodSymbol="ZodSymbol",X.ZodUndefined="ZodUndefined",X.ZodNull="ZodNull",X.ZodAny="ZodAny",X.ZodUnknown="ZodUnknown",X.ZodNever="ZodNever",X.ZodVoid="ZodVoid",X.ZodArray="ZodArray",X.ZodObject="ZodObject",X.ZodUnion="ZodUnion",X.ZodDiscriminatedUnion="ZodDiscriminatedUnion",X.ZodIntersection="ZodIntersection",X.ZodTuple="ZodTuple",X.ZodRecord="ZodRecord",X.ZodMap="ZodMap",X.ZodSet="ZodSet",X.ZodFunction="ZodFunction",X.ZodLazy="ZodLazy",X.ZodLiteral="ZodLiteral",X.ZodEnum="ZodEnum",X.ZodEffects="ZodEffects",X.ZodNativeEnum="ZodNativeEnum",X.ZodOptional="ZodOptional",X.ZodNullable="ZodNullable",X.ZodDefault="ZodDefault",X.ZodCatch="ZodCatch",X.ZodPromise="ZodPromise",X.ZodBranded="ZodBranded",X.ZodPipeline="ZodPipeline",X.ZodReadonly="ZodReadonly"})(j||(j={}));var w2=A1.create,M2=I6.create,j2=R4.create,R2=b6.create,E2=O4.create,I2=GX.create,b2=D4.create,P2=HX.create,S2=BX.create,Z2=A4.create,C2=t1.create,k2=w1.create,v2=w4.create,T2=J1.create,NW=V0.create,_2=V0.strictCreate,x2=zX.create,y2=O9.create,g2=KX.create,f2=M1.create,h2=M4.create,u2=j4.create,l2=P6.create,m2=JX.create,c2=UX.create,p2=VX.create,d2=a1.create,i2=LX.create,n2=S6.create,r2=H1.create,o2=G1.create,t2=_1.create,a2=H1.createWithPreprocess,s2=E4.create;var bV=Object.freeze({status:"aborted"});function O(X,Q,$){function Y(H,B){var z;Object.defineProperty(H,"_zod",{value:H._zod??{},enumerable:!1}),(z=H._zod).traits??(z.traits=new Set),H._zod.traits.add(X),Q(H,B);for(let K in G.prototype)if(!(K in H))Object.defineProperty(H,K,{value:G.prototype[K].bind(H)});H._zod.constr=G,H._zod.def=B}let W=$?.Parent??Object;class J extends W{}Object.defineProperty(J,"name",{value:X});function G(H){var B;let z=$?.Parent?new J:this;Y(z,H),(B=z._zod).deferred??(B.deferred=[]);for(let K of z._zod.deferred)K();return z}return Object.defineProperty(G,"init",{value:Y}),Object.defineProperty(G,Symbol.hasInstance,{value:(H)=>{if($?.Parent&&H instanceof $.Parent)return!0;return H?._zod?.traits?.has(X)}}),Object.defineProperty(G,"name",{value:X}),G}var PV=Symbol("zod_brand");class x1 extends Error{constructor(){super("Encountered Promise during synchronous parse. Use .parseAsync() instead.")}}var I4={};function u0(X){if(X)Object.assign(I4,X);return I4}var i={};U7(i,{unwrapMessage:()=>OX,stringifyPrimitive:()=>S4,required:()=>pV,randomString:()=>xV,propertyKeyTypes:()=>E9,promiseAllObject:()=>_V,primitiveTypes:()=>OW,prefixIssues:()=>B1,pick:()=>hV,partial:()=>cV,optionalKeys:()=>I9,omit:()=>uV,numKeys:()=>yV,nullish:()=>wX,normalizeParams:()=>y,merge:()=>mV,jsonStringifyReplacer:()=>w9,joinValues:()=>b4,issue:()=>P9,isPlainObject:()=>C6,isObject:()=>Z6,getSizableOrigin:()=>AW,getParsedType:()=>gV,getLengthableOrigin:()=>jX,getEnumValues:()=>DX,getElementAtPath:()=>TV,floatSafeRemainder:()=>M9,finalizeIssue:()=>o0,extend:()=>lV,escapeRegex:()=>y1,esc:()=>s1,defineLazy:()=>Y0,createTransparentProxy:()=>fV,clone:()=>l0,cleanRegex:()=>MX,cleanEnum:()=>dV,captureStackTrace:()=>P4,cached:()=>AX,assignProp:()=>j9,assertNotEqual:()=>ZV,assertNever:()=>kV,assertIs:()=>CV,assertEqual:()=>SV,assert:()=>vV,allowsEval:()=>R9,aborted:()=>e1,NUMBER_FORMAT_RANGES:()=>b9,Class:()=>wW,BIGINT_FORMAT_RANGES:()=>DW});function SV(X){return X}function ZV(X){return X}function CV(X){}function kV(X){throw Error()}function vV(X){}function DX(X){let Q=Object.values(X).filter((Y)=>typeof Y==="number");return Object.entries(X).filter(([Y,W])=>Q.indexOf(+Y)===-1).map(([Y,W])=>W)}function b4(X,Q="|"){return X.map(($)=>S4($)).join(Q)}function w9(X,Q){if(typeof Q==="bigint")return Q.toString();return Q}function AX(X){return{get value(){{let $=X();return Object.defineProperty(this,"value",{value:$}),$}throw Error("cached value already set")}}}function wX(X){return X===null||X===void 0}function MX(X){let Q=X.startsWith("^")?1:0,$=X.endsWith("$")?X.length-1:X.length;return X.slice(Q,$)}function M9(X,Q){let $=(X.toString().split(".")[1]||"").length,Y=(Q.toString().split(".")[1]||"").length,W=$>Y?$:Y,J=Number.parseInt(X.toFixed(W).replace(".","")),G=Number.parseInt(Q.toFixed(W).replace(".",""));return J%G/10**W}function Y0(X,Q,$){Object.defineProperty(X,Q,{get(){{let W=$();return X[Q]=W,W}throw Error("cached value already set")},set(W){Object.defineProperty(X,Q,{value:W})},configurable:!0})}function j9(X,Q,$){Object.defineProperty(X,Q,{value:$,writable:!0,enumerable:!0,configurable:!0})}function TV(X,Q){if(!Q)return X;return Q.reduce(($,Y)=>$?.[Y],X)}function _V(X){let Q=Object.keys(X),$=Q.map((Y)=>X[Y]);return Promise.all($).then((Y)=>{let W={};for(let J=0;J<Q.length;J++)W[Q[J]]=Y[J];return W})}function xV(X=10){let $="";for(let Y=0;Y<X;Y++)$+="abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random()*26)];return $}function s1(X){return JSON.stringify(X)}var P4=Error.captureStackTrace?Error.captureStackTrace:(...X)=>{};function Z6(X){return typeof X==="object"&&X!==null&&!Array.isArray(X)}var R9=AX(()=>{if(typeof navigator<"u"&&navigator?.userAgent?.includes("Cloudflare"))return!1;try{return new Function(""),!0}catch(X){return!1}});function C6(X){if(Z6(X)===!1)return!1;let Q=X.constructor;if(Q===void 0)return!0;let $=Q.prototype;if(Z6($)===!1)return!1;if(Object.prototype.hasOwnProperty.call($,"isPrototypeOf")===!1)return!1;return!0}function yV(X){let Q=0;for(let $ in X)if(Object.prototype.hasOwnProperty.call(X,$))Q++;return Q}var gV=(X)=>{let Q=typeof X;switch(Q){case"undefined":return"undefined";case"string":return"string";case"number":return Number.isNaN(X)?"nan":"number";case"boolean":return"boolean";case"function":return"function";case"bigint":return"bigint";case"symbol":return"symbol";case"object":if(Array.isArray(X))return"array";if(X===null)return"null";if(X.then&&typeof X.then==="function"&&X.catch&&typeof X.catch==="function")return"promise";if(typeof Map<"u"&&X instanceof Map)return"map";if(typeof Set<"u"&&X instanceof Set)return"set";if(typeof Date<"u"&&X instanceof Date)return"date";if(typeof File<"u"&&X instanceof File)return"file";return"object";default:throw Error(`Unknown data type: ${Q}`)}},E9=new Set(["string","number","symbol"]),OW=new Set(["string","number","bigint","boolean","symbol","undefined"]);function y1(X){return X.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function l0(X,Q,$){let Y=new X._zod.constr(Q??X._zod.def);if(!Q||$?.parent)Y._zod.parent=X;return Y}function y(X){let Q=X;if(!Q)return{};if(typeof Q==="string")return{error:()=>Q};if(Q?.message!==void 0){if(Q?.error!==void 0)throw Error("Cannot specify both `message` and `error` params");Q.error=Q.message}if(delete Q.message,typeof Q.error==="string")return{...Q,error:()=>Q.error};return Q}function fV(X){let Q;return new Proxy({},{get($,Y,W){return Q??(Q=X()),Reflect.get(Q,Y,W)},set($,Y,W,J){return Q??(Q=X()),Reflect.set(Q,Y,W,J)},has($,Y){return Q??(Q=X()),Reflect.has(Q,Y)},deleteProperty($,Y){return Q??(Q=X()),Reflect.deleteProperty(Q,Y)},ownKeys($){return Q??(Q=X()),Reflect.ownKeys(Q)},getOwnPropertyDescriptor($,Y){return Q??(Q=X()),Reflect.getOwnPropertyDescriptor(Q,Y)},defineProperty($,Y,W){return Q??(Q=X()),Reflect.defineProperty(Q,Y,W)}})}function S4(X){if(typeof X==="bigint")return X.toString()+"n";if(typeof X==="string")return`"${X}"`;return`${X}`}function I9(X){return Object.keys(X).filter((Q)=>{return X[Q]._zod.optin==="optional"&&X[Q]._zod.optout==="optional"})}var b9={safeint:[Number.MIN_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],int32:[-2147483648,2147483647],uint32:[0,4294967295],float32:[-340282346638528860000000000000000000000,340282346638528860000000000000000000000],float64:[-Number.MAX_VALUE,Number.MAX_VALUE]},DW={int64:[BigInt("-9223372036854775808"),BigInt("9223372036854775807")],uint64:[BigInt(0),BigInt("18446744073709551615")]};function hV(X,Q){let $={},Y=X._zod.def;for(let W in Q){if(!(W in Y.shape))throw Error(`Unrecognized key: "${W}"`);if(!Q[W])continue;$[W]=Y.shape[W]}return l0(X,{...X._zod.def,shape:$,checks:[]})}function uV(X,Q){let $={...X._zod.def.shape},Y=X._zod.def;for(let W in Q){if(!(W in Y.shape))throw Error(`Unrecognized key: "${W}"`);if(!Q[W])continue;delete $[W]}return l0(X,{...X._zod.def,shape:$,checks:[]})}function lV(X,Q){if(!C6(Q))throw Error("Invalid input to extend: expected a plain object");let $={...X._zod.def,get shape(){let Y={...X._zod.def.shape,...Q};return j9(this,"shape",Y),Y},checks:[]};return l0(X,$)}function mV(X,Q){return l0(X,{...X._zod.def,get shape(){let $={...X._zod.def.shape,...Q._zod.def.shape};return j9(this,"shape",$),$},catchall:Q._zod.def.catchall,checks:[]})}function cV(X,Q,$){let Y=Q._zod.def.shape,W={...Y};if($)for(let J in $){if(!(J in Y))throw Error(`Unrecognized key: "${J}"`);if(!$[J])continue;W[J]=X?new X({type:"optional",innerType:Y[J]}):Y[J]}else for(let J in Y)W[J]=X?new X({type:"optional",innerType:Y[J]}):Y[J];return l0(Q,{...Q._zod.def,shape:W,checks:[]})}function pV(X,Q,$){let Y=Q._zod.def.shape,W={...Y};if($)for(let J in $){if(!(J in W))throw Error(`Unrecognized key: "${J}"`);if(!$[J])continue;W[J]=new X({type:"nonoptional",innerType:Y[J]})}else for(let J in Y)W[J]=new X({type:"nonoptional",innerType:Y[J]});return l0(Q,{...Q._zod.def,shape:W,checks:[]})}function e1(X,Q=0){for(let $=Q;$<X.issues.length;$++)if(X.issues[$]?.continue!==!0)return!0;return!1}function B1(X,Q){return Q.map(($)=>{var Y;return(Y=$).path??(Y.path=[]),$.path.unshift(X),$})}function OX(X){return typeof X==="string"?X:X?.message}function o0(X,Q,$){let Y={...X,path:X.path??[]};if(!X.message){let W=OX(X.inst?._zod.def?.error?.(X))??OX(Q?.error?.(X))??OX($.customError?.(X))??OX($.localeError?.(X))??"Invalid input";Y.message=W}if(delete Y.inst,delete Y.continue,!Q?.reportInput)delete Y.input;return Y}function AW(X){if(X instanceof Set)return"set";if(X instanceof Map)return"map";if(X instanceof File)return"file";return"unknown"}function jX(X){if(Array.isArray(X))return"array";if(typeof X==="string")return"string";return"unknown"}function P9(...X){let[Q,$,Y]=X;if(typeof Q==="string")return{message:Q,code:"custom",input:$,inst:Y};return{...Q}}function dV(X){return Object.entries(X).filter(([Q,$])=>{return Number.isNaN(Number.parseInt(Q,10))}).map((Q)=>Q[1])}class wW{constructor(...X){}}var MW=(X,Q)=>{X.name="$ZodError",Object.defineProperty(X,"_zod",{value:X._zod,enumerable:!1}),Object.defineProperty(X,"issues",{value:Q,enumerable:!1}),Object.defineProperty(X,"message",{get(){return JSON.stringify(Q,w9,2)},enumerable:!0})},Z4=O("$ZodError",MW),RX=O("$ZodError",MW,{Parent:Error});function S9(X,Q=($)=>$.message){let $={},Y=[];for(let W of X.issues)if(W.path.length>0)$[W.path[0]]=$[W.path[0]]||[],$[W.path[0]].push(Q(W));else Y.push(Q(W));return{formErrors:Y,fieldErrors:$}}function Z9(X,Q){let $=Q||function(J){return J.message},Y={_errors:[]},W=(J)=>{for(let G of J.issues)if(G.code==="invalid_union"&&G.errors.length)G.errors.map((H)=>W({issues:H}));else if(G.code==="invalid_key")W({issues:G.issues});else if(G.code==="invalid_element")W({issues:G.issues});else if(G.path.length===0)Y._errors.push($(G));else{let H=Y,B=0;while(B<G.path.length){let z=G.path[B];if(B!==G.path.length-1)H[z]=H[z]||{_errors:[]};else H[z]=H[z]||{_errors:[]},H[z]._errors.push($(G));H=H[z],B++}}};return W(X),Y}var C9=(X)=>(Q,$,Y,W)=>{let J=Y?Object.assign(Y,{async:!1}):{async:!1},G=Q._zod.run({value:$,issues:[]},J);if(G instanceof Promise)throw new x1;if(G.issues.length){let H=new(W?.Err??X)(G.issues.map((B)=>o0(B,J,u0())));throw P4(H,W?.callee),H}return G.value},k9=C9(RX),v9=(X)=>async(Q,$,Y,W)=>{let J=Y?Object.assign(Y,{async:!0}):{async:!0},G=Q._zod.run({value:$,issues:[]},J);if(G instanceof Promise)G=await G;if(G.issues.length){let H=new(W?.Err??X)(G.issues.map((B)=>o0(B,J,u0())));throw P4(H,W?.callee),H}return G.value},T9=v9(RX),_9=(X)=>(Q,$,Y)=>{let W=Y?{...Y,async:!1}:{async:!1},J=Q._zod.run({value:$,issues:[]},W);if(J instanceof Promise)throw new x1;return J.issues.length?{success:!1,error:new(X??Z4)(J.issues.map((G)=>o0(G,W,u0())))}:{success:!0,data:J.value}},X6=_9(RX),x9=(X)=>async(Q,$,Y)=>{let W=Y?Object.assign(Y,{async:!0}):{async:!0},J=Q._zod.run({value:$,issues:[]},W);if(J instanceof Promise)J=await J;return J.issues.length?{success:!1,error:new X(J.issues.map((G)=>o0(G,W,u0())))}:{success:!0,data:J.value}},Q6=x9(RX);var jW=/^[cC][^\s-]{8,}$/,RW=/^[0-9a-z]+$/,EW=/^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/,IW=/^[0-9a-vA-V]{20}$/,bW=/^[A-Za-z0-9]{27}$/,PW=/^[a-zA-Z0-9_-]{21}$/,SW=/^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;var ZW=/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/,y9=(X)=>{if(!X)return/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$/;return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${X}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`)};var CW=/^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;function kW(){return new RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$","u")}var vW=/^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,TW=/^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})$/,_W=/^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/,xW=/^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,yW=/^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/,g9=/^[A-Za-z0-9_-]*$/,gW=/^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+$/;var fW=/^\+(?:[0-9]){6,14}[0-9]$/,hW="(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))",uW=new RegExp(`^${hW}$`);function lW(X){return typeof X.precision==="number"?X.precision===-1?"(?:[01]\\d|2[0-3]):[0-5]\\d":X.precision===0?"(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d":`(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d\\.\\d{${X.precision}}`:"(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?"}function mW(X){return new RegExp(`^${lW(X)}$`)}function cW(X){let Q=lW({precision:X.precision}),$=["Z"];if(X.local)$.push("");if(X.offset)$.push("([+-]\\d{2}:\\d{2})");let Y=`${Q}(?:${$.join("|")})`;return new RegExp(`^${hW}T(?:${Y})$`)}var pW=(X)=>{let Q=X?`[\\s\\S]{${X?.minimum??0},${X?.maximum??""}}`:"[\\s\\S]*";return new RegExp(`^${Q}$`)};var dW=/^\d+$/,iW=/^-?\d+(?:\.\d+)?/i,nW=/true|false/i,rW=/null/i;var oW=/^[^A-Z]*$/,tW=/^[^a-z]*$/;var w0=O("$ZodCheck",(X,Q)=>{var $;X._zod??(X._zod={}),X._zod.def=Q,($=X._zod).onattach??($.onattach=[])}),aW={number:"number",bigint:"bigint",object:"date"},f9=O("$ZodCheckLessThan",(X,Q)=>{w0.init(X,Q);let $=aW[typeof Q.value];X._zod.onattach.push((Y)=>{let W=Y._zod.bag,J=(Q.inclusive?W.maximum:W.exclusiveMaximum)??Number.POSITIVE_INFINITY;if(Q.value<J)if(Q.inclusive)W.maximum=Q.value;else W.exclusiveMaximum=Q.value}),X._zod.check=(Y)=>{if(Q.inclusive?Y.value<=Q.value:Y.value<Q.value)return;Y.issues.push({origin:$,code:"too_big",maximum:Q.value,input:Y.value,inclusive:Q.inclusive,inst:X,continue:!Q.abort})}}),h9=O("$ZodCheckGreaterThan",(X,Q)=>{w0.init(X,Q);let $=aW[typeof Q.value];X._zod.onattach.push((Y)=>{let W=Y._zod.bag,J=(Q.inclusive?W.minimum:W.exclusiveMinimum)??Number.NEGATIVE_INFINITY;if(Q.value>J)if(Q.inclusive)W.minimum=Q.value;else W.exclusiveMinimum=Q.value}),X._zod.check=(Y)=>{if(Q.inclusive?Y.value>=Q.value:Y.value>Q.value)return;Y.issues.push({origin:$,code:"too_small",minimum:Q.value,input:Y.value,inclusive:Q.inclusive,inst:X,continue:!Q.abort})}}),sW=O("$ZodCheckMultipleOf",(X,Q)=>{w0.init(X,Q),X._zod.onattach.push(($)=>{var Y;(Y=$._zod.bag).multipleOf??(Y.multipleOf=Q.value)}),X._zod.check=($)=>{if(typeof $.value!==typeof Q.value)throw Error("Cannot mix number and bigint in multiple_of check.");if(typeof $.value==="bigint"?$.value%Q.value===BigInt(0):M9($.value,Q.value)===0)return;$.issues.push({origin:typeof $.value,code:"not_multiple_of",divisor:Q.value,input:$.value,inst:X,continue:!Q.abort})}}),eW=O("$ZodCheckNumberFormat",(X,Q)=>{w0.init(X,Q),Q.format=Q.format||"float64";let $=Q.format?.includes("int"),Y=$?"int":"number",[W,J]=b9[Q.format];X._zod.onattach.push((G)=>{let H=G._zod.bag;if(H.format=Q.format,H.minimum=W,H.maximum=J,$)H.pattern=dW}),X._zod.check=(G)=>{let H=G.value;if($){if(!Number.isInteger(H)){G.issues.push({expected:Y,format:Q.format,code:"invalid_type",input:H,inst:X});return}if(!Number.isSafeInteger(H)){if(H>0)G.issues.push({input:H,code:"too_big",maximum:Number.MAX_SAFE_INTEGER,note:"Integers must be within the safe integer range.",inst:X,origin:Y,continue:!Q.abort});else G.issues.push({input:H,code:"too_small",minimum:Number.MIN_SAFE_INTEGER,note:"Integers must be within the safe integer range.",inst:X,origin:Y,continue:!Q.abort});return}}if(H<W)G.issues.push({origin:"number",input:H,code:"too_small",minimum:W,inclusive:!0,inst:X,continue:!Q.abort});if(H>J)G.issues.push({origin:"number",input:H,code:"too_big",maximum:J,inst:X})}});var XJ=O("$ZodCheckMaxLength",(X,Q)=>{w0.init(X,Q),X._zod.when=($)=>{let Y=$.value;return!wX(Y)&&Y.length!==void 0},X._zod.onattach.push(($)=>{let Y=$._zod.bag.maximum??Number.POSITIVE_INFINITY;if(Q.maximum<Y)$._zod.bag.maximum=Q.maximum}),X._zod.check=($)=>{let Y=$.value;if(Y.length<=Q.maximum)return;let J=jX(Y);$.issues.push({origin:J,code:"too_big",maximum:Q.maximum,inclusive:!0,input:Y,inst:X,continue:!Q.abort})}}),QJ=O("$ZodCheckMinLength",(X,Q)=>{w0.init(X,Q),X._zod.when=($)=>{let Y=$.value;return!wX(Y)&&Y.length!==void 0},X._zod.onattach.push(($)=>{let Y=$._zod.bag.minimum??Number.NEGATIVE_INFINITY;if(Q.minimum>Y)$._zod.bag.minimum=Q.minimum}),X._zod.check=($)=>{let Y=$.value;if(Y.length>=Q.minimum)return;let J=jX(Y);$.issues.push({origin:J,code:"too_small",minimum:Q.minimum,inclusive:!0,input:Y,inst:X,continue:!Q.abort})}}),$J=O("$ZodCheckLengthEquals",(X,Q)=>{w0.init(X,Q),X._zod.when=($)=>{let Y=$.value;return!wX(Y)&&Y.length!==void 0},X._zod.onattach.push(($)=>{let Y=$._zod.bag;Y.minimum=Q.length,Y.maximum=Q.length,Y.length=Q.length}),X._zod.check=($)=>{let Y=$.value,W=Y.length;if(W===Q.length)return;let J=jX(Y),G=W>Q.length;$.issues.push({origin:J,...G?{code:"too_big",maximum:Q.length}:{code:"too_small",minimum:Q.length},inclusive:!0,exact:!0,input:$.value,inst:X,continue:!Q.abort})}}),EX=O("$ZodCheckStringFormat",(X,Q)=>{var $,Y;if(w0.init(X,Q),X._zod.onattach.push((W)=>{let J=W._zod.bag;if(J.format=Q.format,Q.pattern)J.patterns??(J.patterns=new Set),J.patterns.add(Q.pattern)}),Q.pattern)($=X._zod).check??($.check=(W)=>{if(Q.pattern.lastIndex=0,Q.pattern.test(W.value))return;W.issues.push({origin:"string",code:"invalid_format",format:Q.format,input:W.value,...Q.pattern?{pattern:Q.pattern.toString()}:{},inst:X,continue:!Q.abort})});else(Y=X._zod).check??(Y.check=()=>{})}),YJ=O("$ZodCheckRegex",(X,Q)=>{EX.init(X,Q),X._zod.check=($)=>{if(Q.pattern.lastIndex=0,Q.pattern.test($.value))return;$.issues.push({origin:"string",code:"invalid_format",format:"regex",input:$.value,pattern:Q.pattern.toString(),inst:X,continue:!Q.abort})}}),WJ=O("$ZodCheckLowerCase",(X,Q)=>{Q.pattern??(Q.pattern=oW),EX.init(X,Q)}),JJ=O("$ZodCheckUpperCase",(X,Q)=>{Q.pattern??(Q.pattern=tW),EX.init(X,Q)}),GJ=O("$ZodCheckIncludes",(X,Q)=>{w0.init(X,Q);let $=y1(Q.includes),Y=new RegExp(typeof Q.position==="number"?`^.{${Q.position}}${$}`:$);Q.pattern=Y,X._zod.onattach.push((W)=>{let J=W._zod.bag;J.patterns??(J.patterns=new Set),J.patterns.add(Y)}),X._zod.check=(W)=>{if(W.value.includes(Q.includes,Q.position))return;W.issues.push({origin:"string",code:"invalid_format",format:"includes",includes:Q.includes,input:W.value,inst:X,continue:!Q.abort})}}),HJ=O("$ZodCheckStartsWith",(X,Q)=>{w0.init(X,Q);let $=new RegExp(`^${y1(Q.prefix)}.*`);Q.pattern??(Q.pattern=$),X._zod.onattach.push((Y)=>{let W=Y._zod.bag;W.patterns??(W.patterns=new Set),W.patterns.add($)}),X._zod.check=(Y)=>{if(Y.value.startsWith(Q.prefix))return;Y.issues.push({origin:"string",code:"invalid_format",format:"starts_with",prefix:Q.prefix,input:Y.value,inst:X,continue:!Q.abort})}}),BJ=O("$ZodCheckEndsWith",(X,Q)=>{w0.init(X,Q);let $=new RegExp(`.*${y1(Q.suffix)}$`);Q.pattern??(Q.pattern=$),X._zod.onattach.push((Y)=>{let W=Y._zod.bag;W.patterns??(W.patterns=new Set),W.patterns.add($)}),X._zod.check=(Y)=>{if(Y.value.endsWith(Q.suffix))return;Y.issues.push({origin:"string",code:"invalid_format",format:"ends_with",suffix:Q.suffix,input:Y.value,inst:X,continue:!Q.abort})}});var zJ=O("$ZodCheckOverwrite",(X,Q)=>{w0.init(X,Q),X._zod.check=($)=>{$.value=Q.tx($.value)}});class u9{constructor(X=[]){if(this.content=[],this.indent=0,this)this.args=X}indented(X){this.indent+=1,X(this),this.indent-=1}write(X){if(typeof X==="function"){X(this,{execution:"sync"}),X(this,{execution:"async"});return}let $=X.split(`
`).filter((J)=>J),Y=Math.min(...$.map((J)=>J.length-J.trimStart().length)),W=$.map((J)=>J.slice(Y)).map((J)=>" ".repeat(this.indent*2)+J);for(let J of W)this.content.push(J)}compile(){let X=Function,Q=this?.args,Y=[...(this?.content??[""]).map((W)=>`  ${W}`)];return new X(...Q,Y.join(`
`))}}var UJ={major:4,minor:0,patch:0};var X0=O("$ZodType",(X,Q)=>{var $;X??(X={}),X._zod.def=Q,X._zod.bag=X._zod.bag||{},X._zod.version=UJ;let Y=[...X._zod.def.checks??[]];if(X._zod.traits.has("$ZodCheck"))Y.unshift(X);for(let W of Y)for(let J of W._zod.onattach)J(X);if(Y.length===0)($=X._zod).deferred??($.deferred=[]),X._zod.deferred?.push(()=>{X._zod.run=X._zod.parse});else{let W=(J,G,H)=>{let B=e1(J),z;for(let K of G){if(K._zod.when){if(!K._zod.when(J))continue}else if(B)continue;let V=J.issues.length,L=K._zod.check(J);if(L instanceof Promise&&H?.async===!1)throw new x1;if(z||L instanceof Promise)z=(z??Promise.resolve()).then(async()=>{if(await L,J.issues.length===V)return;if(!B)B=e1(J,V)});else{if(J.issues.length===V)continue;if(!B)B=e1(J,V)}}if(z)return z.then(()=>{return J});return J};X._zod.run=(J,G)=>{let H=X._zod.parse(J,G);if(H instanceof Promise){if(G.async===!1)throw new x1;return H.then((B)=>W(B,Y,G))}return W(H,Y,G)}}X["~standard"]={validate:(W)=>{try{let J=X6(X,W);return J.success?{value:J.data}:{issues:J.error?.issues}}catch(J){return Q6(X,W).then((G)=>G.success?{value:G.data}:{issues:G.error?.issues})}},vendor:"zod",version:1}}),IX=O("$ZodString",(X,Q)=>{X0.init(X,Q),X._zod.pattern=[...X?._zod.bag?.patterns??[]].pop()??pW(X._zod.bag),X._zod.parse=($,Y)=>{if(Q.coerce)try{$.value=String($.value)}catch(W){}if(typeof $.value==="string")return $;return $.issues.push({expected:"string",code:"invalid_type",input:$.value,inst:X}),$}}),W0=O("$ZodStringFormat",(X,Q)=>{EX.init(X,Q),IX.init(X,Q)}),m9=O("$ZodGUID",(X,Q)=>{Q.pattern??(Q.pattern=ZW),W0.init(X,Q)}),c9=O("$ZodUUID",(X,Q)=>{if(Q.version){let Y={v1:1,v2:2,v3:3,v4:4,v5:5,v6:6,v7:7,v8:8}[Q.version];if(Y===void 0)throw Error(`Invalid UUID version: "${Q.version}"`);Q.pattern??(Q.pattern=y9(Y))}else Q.pattern??(Q.pattern=y9());W0.init(X,Q)}),p9=O("$ZodEmail",(X,Q)=>{Q.pattern??(Q.pattern=CW),W0.init(X,Q)}),d9=O("$ZodURL",(X,Q)=>{W0.init(X,Q),X._zod.check=($)=>{try{let Y=$.value,W=new URL(Y),J=W.href;if(Q.hostname){if(Q.hostname.lastIndex=0,!Q.hostname.test(W.hostname))$.issues.push({code:"invalid_format",format:"url",note:"Invalid hostname",pattern:gW.source,input:$.value,inst:X,continue:!Q.abort})}if(Q.protocol){if(Q.protocol.lastIndex=0,!Q.protocol.test(W.protocol.endsWith(":")?W.protocol.slice(0,-1):W.protocol))$.issues.push({code:"invalid_format",format:"url",note:"Invalid protocol",pattern:Q.protocol.source,input:$.value,inst:X,continue:!Q.abort})}if(!Y.endsWith("/")&&J.endsWith("/"))$.value=J.slice(0,-1);else $.value=J;return}catch(Y){$.issues.push({code:"invalid_format",format:"url",input:$.value,inst:X,continue:!Q.abort})}}}),i9=O("$ZodEmoji",(X,Q)=>{Q.pattern??(Q.pattern=kW()),W0.init(X,Q)}),n9=O("$ZodNanoID",(X,Q)=>{Q.pattern??(Q.pattern=PW),W0.init(X,Q)}),r9=O("$ZodCUID",(X,Q)=>{Q.pattern??(Q.pattern=jW),W0.init(X,Q)}),o9=O("$ZodCUID2",(X,Q)=>{Q.pattern??(Q.pattern=RW),W0.init(X,Q)}),t9=O("$ZodULID",(X,Q)=>{Q.pattern??(Q.pattern=EW),W0.init(X,Q)}),a9=O("$ZodXID",(X,Q)=>{Q.pattern??(Q.pattern=IW),W0.init(X,Q)}),s9=O("$ZodKSUID",(X,Q)=>{Q.pattern??(Q.pattern=bW),W0.init(X,Q)}),MJ=O("$ZodISODateTime",(X,Q)=>{Q.pattern??(Q.pattern=cW(Q)),W0.init(X,Q)}),jJ=O("$ZodISODate",(X,Q)=>{Q.pattern??(Q.pattern=uW),W0.init(X,Q)}),RJ=O("$ZodISOTime",(X,Q)=>{Q.pattern??(Q.pattern=mW(Q)),W0.init(X,Q)}),EJ=O("$ZodISODuration",(X,Q)=>{Q.pattern??(Q.pattern=SW),W0.init(X,Q)}),e9=O("$ZodIPv4",(X,Q)=>{Q.pattern??(Q.pattern=vW),W0.init(X,Q),X._zod.onattach.push(($)=>{let Y=$._zod.bag;Y.format="ipv4"})}),XQ=O("$ZodIPv6",(X,Q)=>{Q.pattern??(Q.pattern=TW),W0.init(X,Q),X._zod.onattach.push(($)=>{let Y=$._zod.bag;Y.format="ipv6"}),X._zod.check=($)=>{try{new URL(`http://[${$.value}]`)}catch{$.issues.push({code:"invalid_format",format:"ipv6",input:$.value,inst:X,continue:!Q.abort})}}}),QQ=O("$ZodCIDRv4",(X,Q)=>{Q.pattern??(Q.pattern=_W),W0.init(X,Q)}),$Q=O("$ZodCIDRv6",(X,Q)=>{Q.pattern??(Q.pattern=xW),W0.init(X,Q),X._zod.check=($)=>{let[Y,W]=$.value.split("/");try{if(!W)throw Error();let J=Number(W);if(`${J}`!==W)throw Error();if(J<0||J>128)throw Error();new URL(`http://[${Y}]`)}catch{$.issues.push({code:"invalid_format",format:"cidrv6",input:$.value,inst:X,continue:!Q.abort})}}});function IJ(X){if(X==="")return!0;if(X.length%4!==0)return!1;try{return atob(X),!0}catch{return!1}}var YQ=O("$ZodBase64",(X,Q)=>{Q.pattern??(Q.pattern=yW),W0.init(X,Q),X._zod.onattach.push(($)=>{$._zod.bag.contentEncoding="base64"}),X._zod.check=($)=>{if(IJ($.value))return;$.issues.push({code:"invalid_format",format:"base64",input:$.value,inst:X,continue:!Q.abort})}});function nV(X){if(!g9.test(X))return!1;let Q=X.replace(/[-_]/g,(Y)=>Y==="-"?"+":"/"),$=Q.padEnd(Math.ceil(Q.length/4)*4,"=");return IJ($)}var WQ=O("$ZodBase64URL",(X,Q)=>{Q.pattern??(Q.pattern=g9),W0.init(X,Q),X._zod.onattach.push(($)=>{$._zod.bag.contentEncoding="base64url"}),X._zod.check=($)=>{if(nV($.value))return;$.issues.push({code:"invalid_format",format:"base64url",input:$.value,inst:X,continue:!Q.abort})}}),JQ=O("$ZodE164",(X,Q)=>{Q.pattern??(Q.pattern=fW),W0.init(X,Q)});function rV(X,Q=null){try{let $=X.split(".");if($.length!==3)return!1;let[Y]=$;if(!Y)return!1;let W=JSON.parse(atob(Y));if("typ"in W&&W?.typ!=="JWT")return!1;if(!W.alg)return!1;if(Q&&(!("alg"in W)||W.alg!==Q))return!1;return!0}catch{return!1}}var GQ=O("$ZodJWT",(X,Q)=>{W0.init(X,Q),X._zod.check=($)=>{if(rV($.value,Q.alg))return;$.issues.push({code:"invalid_format",format:"jwt",input:$.value,inst:X,continue:!Q.abort})}});var v4=O("$ZodNumber",(X,Q)=>{X0.init(X,Q),X._zod.pattern=X._zod.bag.pattern??iW,X._zod.parse=($,Y)=>{if(Q.coerce)try{$.value=Number($.value)}catch(G){}let W=$.value;if(typeof W==="number"&&!Number.isNaN(W)&&Number.isFinite(W))return $;let J=typeof W==="number"?Number.isNaN(W)?"NaN":!Number.isFinite(W)?"Infinity":void 0:void 0;return $.issues.push({expected:"number",code:"invalid_type",input:W,inst:X,...J?{received:J}:{}}),$}}),HQ=O("$ZodNumber",(X,Q)=>{eW.init(X,Q),v4.init(X,Q)}),BQ=O("$ZodBoolean",(X,Q)=>{X0.init(X,Q),X._zod.pattern=nW,X._zod.parse=($,Y)=>{if(Q.coerce)try{$.value=Boolean($.value)}catch(J){}let W=$.value;if(typeof W==="boolean")return $;return $.issues.push({expected:"boolean",code:"invalid_type",input:W,inst:X}),$}});var zQ=O("$ZodNull",(X,Q)=>{X0.init(X,Q),X._zod.pattern=rW,X._zod.values=new Set([null]),X._zod.parse=($,Y)=>{let W=$.value;if(W===null)return $;return $.issues.push({expected:"null",code:"invalid_type",input:W,inst:X}),$}});var KQ=O("$ZodUnknown",(X,Q)=>{X0.init(X,Q),X._zod.parse=($)=>$}),UQ=O("$ZodNever",(X,Q)=>{X0.init(X,Q),X._zod.parse=($,Y)=>{return $.issues.push({expected:"never",code:"invalid_type",input:$.value,inst:X}),$}});function VJ(X,Q,$){if(X.issues.length)Q.issues.push(...B1($,X.issues));Q.value[$]=X.value}var VQ=O("$ZodArray",(X,Q)=>{X0.init(X,Q),X._zod.parse=($,Y)=>{let W=$.value;if(!Array.isArray(W))return $.issues.push({expected:"array",code:"invalid_type",input:W,inst:X}),$;$.value=Array(W.length);let J=[];for(let G=0;G<W.length;G++){let H=W[G],B=Q.element._zod.run({value:H,issues:[]},Y);if(B instanceof Promise)J.push(B.then((z)=>VJ(z,$,G)));else VJ(B,$,G)}if(J.length)return Promise.all(J).then(()=>$);return $}});function k4(X,Q,$){if(X.issues.length)Q.issues.push(...B1($,X.issues));Q.value[$]=X.value}function LJ(X,Q,$,Y){if(X.issues.length)if(Y[$]===void 0)if($ in Y)Q.value[$]=void 0;else Q.value[$]=X.value;else Q.issues.push(...B1($,X.issues));else if(X.value===void 0){if($ in Y)Q.value[$]=void 0}else Q.value[$]=X.value}var T4=O("$ZodObject",(X,Q)=>{X0.init(X,Q);let $=AX(()=>{let V=Object.keys(Q.shape);for(let U of V)if(!(Q.shape[U]instanceof X0))throw Error(`Invalid element at key "${U}": expected a Zod schema`);let L=I9(Q.shape);return{shape:Q.shape,keys:V,keySet:new Set(V),numKeys:V.length,optionalKeys:new Set(L)}});Y0(X._zod,"propValues",()=>{let V=Q.shape,L={};for(let U in V){let F=V[U]._zod;if(F.values){L[U]??(L[U]=new Set);for(let q of F.values)L[U].add(q)}}return L});let Y=(V)=>{let L=new u9(["shape","payload","ctx"]),U=$.value,F=(M)=>{let R=s1(M);return`shape[${R}]._zod.run({ value: input[${R}], issues: [] }, ctx)`};L.write("const input = payload.value;");let q=Object.create(null),N=0;for(let M of U.keys)q[M]=`key_${N++}`;L.write("const newResult = {}");for(let M of U.keys)if(U.optionalKeys.has(M)){let R=q[M];L.write(`const ${R} = ${F(M)};`);let S=s1(M);L.write(`
        if (${R}.issues.length) {
          if (input[${S}] === undefined) {
            if (${S} in input) {
              newResult[${S}] = undefined;
            }
          } else {
            payload.issues = payload.issues.concat(
              ${R}.issues.map((iss) => ({
                ...iss,
                path: iss.path ? [${S}, ...iss.path] : [${S}],
              }))
            );
          }
        } else if (${R}.value === undefined) {
          if (${S} in input) newResult[${S}] = undefined;
        } else {
          newResult[${S}] = ${R}.value;
        }
        `)}else{let R=q[M];L.write(`const ${R} = ${F(M)};`),L.write(`
          if (${R}.issues.length) payload.issues = payload.issues.concat(${R}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${s1(M)}, ...iss.path] : [${s1(M)}]
          })));`),L.write(`newResult[${s1(M)}] = ${R}.value`)}L.write("payload.value = newResult;"),L.write("return payload;");let A=L.compile();return(M,R)=>A(V,M,R)},W,J=Z6,G=!I4.jitless,B=G&&R9.value,z=Q.catchall,K;X._zod.parse=(V,L)=>{K??(K=$.value);let U=V.value;if(!J(U))return V.issues.push({expected:"object",code:"invalid_type",input:U,inst:X}),V;let F=[];if(G&&B&&L?.async===!1&&L.jitless!==!0){if(!W)W=Y(Q.shape);V=W(V,L)}else{V.value={};let R=K.shape;for(let S of K.keys){let C=R[S],K0=C._zod.run({value:U[S],issues:[]},L),U0=C._zod.optin==="optional"&&C._zod.optout==="optional";if(K0 instanceof Promise)F.push(K0.then((s)=>U0?LJ(s,V,S,U):k4(s,V,S)));else if(U0)LJ(K0,V,S,U);else k4(K0,V,S)}}if(!z)return F.length?Promise.all(F).then(()=>V):V;let q=[],N=K.keySet,A=z._zod,M=A.def.type;for(let R of Object.keys(U)){if(N.has(R))continue;if(M==="never"){q.push(R);continue}let S=A.run({value:U[R],issues:[]},L);if(S instanceof Promise)F.push(S.then((C)=>k4(C,V,R)));else k4(S,V,R)}if(q.length)V.issues.push({code:"unrecognized_keys",keys:q,input:U,inst:X});if(!F.length)return V;return Promise.all(F).then(()=>{return V})}});function qJ(X,Q,$,Y){for(let W of X)if(W.issues.length===0)return Q.value=W.value,Q;return Q.issues.push({code:"invalid_union",input:Q.value,inst:$,errors:X.map((W)=>W.issues.map((J)=>o0(J,Y,u0())))}),Q}var _4=O("$ZodUnion",(X,Q)=>{X0.init(X,Q),Y0(X._zod,"optin",()=>Q.options.some(($)=>$._zod.optin==="optional")?"optional":void 0),Y0(X._zod,"optout",()=>Q.options.some(($)=>$._zod.optout==="optional")?"optional":void 0),Y0(X._zod,"values",()=>{if(Q.options.every(($)=>$._zod.values))return new Set(Q.options.flatMap(($)=>Array.from($._zod.values)));return}),Y0(X._zod,"pattern",()=>{if(Q.options.every(($)=>$._zod.pattern)){let $=Q.options.map((Y)=>Y._zod.pattern);return new RegExp(`^(${$.map((Y)=>MX(Y.source)).join("|")})$`)}return}),X._zod.parse=($,Y)=>{let W=!1,J=[];for(let G of Q.options){let H=G._zod.run({value:$.value,issues:[]},Y);if(H instanceof Promise)J.push(H),W=!0;else{if(H.issues.length===0)return H;J.push(H)}}if(!W)return qJ(J,$,X,Y);return Promise.all(J).then((G)=>{return qJ(G,$,X,Y)})}}),LQ=O("$ZodDiscriminatedUnion",(X,Q)=>{_4.init(X,Q);let $=X._zod.parse;Y0(X._zod,"propValues",()=>{let W={};for(let J of Q.options){let G=J._zod.propValues;if(!G||Object.keys(G).length===0)throw Error(`Invalid discriminated union option at index "${Q.options.indexOf(J)}"`);for(let[H,B]of Object.entries(G)){if(!W[H])W[H]=new Set;for(let z of B)W[H].add(z)}}return W});let Y=AX(()=>{let W=Q.options,J=new Map;for(let G of W){let H=G._zod.propValues[Q.discriminator];if(!H||H.size===0)throw Error(`Invalid discriminated union option at index "${Q.options.indexOf(G)}"`);for(let B of H){if(J.has(B))throw Error(`Duplicate discriminator value "${String(B)}"`);J.set(B,G)}}return J});X._zod.parse=(W,J)=>{let G=W.value;if(!Z6(G))return W.issues.push({code:"invalid_type",expected:"object",input:G,inst:X}),W;let H=Y.value.get(G?.[Q.discriminator]);if(H)return H._zod.run(W,J);if(Q.unionFallback)return $(W,J);return W.issues.push({code:"invalid_union",errors:[],note:"No matching discriminator",input:G,path:[Q.discriminator],inst:X}),W}}),qQ=O("$ZodIntersection",(X,Q)=>{X0.init(X,Q),X._zod.parse=($,Y)=>{let W=$.value,J=Q.left._zod.run({value:W,issues:[]},Y),G=Q.right._zod.run({value:W,issues:[]},Y);if(J instanceof Promise||G instanceof Promise)return Promise.all([J,G]).then(([B,z])=>{return FJ($,B,z)});return FJ($,J,G)}});function l9(X,Q){if(X===Q)return{valid:!0,data:X};if(X instanceof Date&&Q instanceof Date&&+X===+Q)return{valid:!0,data:X};if(C6(X)&&C6(Q)){let $=Object.keys(Q),Y=Object.keys(X).filter((J)=>$.indexOf(J)!==-1),W={...X,...Q};for(let J of Y){let G=l9(X[J],Q[J]);if(!G.valid)return{valid:!1,mergeErrorPath:[J,...G.mergeErrorPath]};W[J]=G.data}return{valid:!0,data:W}}if(Array.isArray(X)&&Array.isArray(Q)){if(X.length!==Q.length)return{valid:!1,mergeErrorPath:[]};let $=[];for(let Y=0;Y<X.length;Y++){let W=X[Y],J=Q[Y],G=l9(W,J);if(!G.valid)return{valid:!1,mergeErrorPath:[Y,...G.mergeErrorPath]};$.push(G.data)}return{valid:!0,data:$}}return{valid:!1,mergeErrorPath:[]}}function FJ(X,Q,$){if(Q.issues.length)X.issues.push(...Q.issues);if($.issues.length)X.issues.push(...$.issues);if(e1(X))return X;let Y=l9(Q.value,$.value);if(!Y.valid)throw Error(`Unmergable intersection. Error path: ${JSON.stringify(Y.mergeErrorPath)}`);return X.value=Y.data,X}var FQ=O("$ZodRecord",(X,Q)=>{X0.init(X,Q),X._zod.parse=($,Y)=>{let W=$.value;if(!C6(W))return $.issues.push({expected:"record",code:"invalid_type",input:W,inst:X}),$;let J=[];if(Q.keyType._zod.values){let G=Q.keyType._zod.values;$.value={};for(let B of G)if(typeof B==="string"||typeof B==="number"||typeof B==="symbol"){let z=Q.valueType._zod.run({value:W[B],issues:[]},Y);if(z instanceof Promise)J.push(z.then((K)=>{if(K.issues.length)$.issues.push(...B1(B,K.issues));$.value[B]=K.value}));else{if(z.issues.length)$.issues.push(...B1(B,z.issues));$.value[B]=z.value}}let H;for(let B in W)if(!G.has(B))H=H??[],H.push(B);if(H&&H.length>0)$.issues.push({code:"unrecognized_keys",input:W,inst:X,keys:H})}else{$.value={};for(let G of Reflect.ownKeys(W)){if(G==="__proto__")continue;let H=Q.keyType._zod.run({value:G,issues:[]},Y);if(H instanceof Promise)throw Error("Async schemas not supported in object keys currently");if(H.issues.length){$.issues.push({origin:"record",code:"invalid_key",issues:H.issues.map((z)=>o0(z,Y,u0())),input:G,path:[G],inst:X}),$.value[H.value]=H.value;continue}let B=Q.valueType._zod.run({value:W[G],issues:[]},Y);if(B instanceof Promise)J.push(B.then((z)=>{if(z.issues.length)$.issues.push(...B1(G,z.issues));$.value[H.value]=z.value}));else{if(B.issues.length)$.issues.push(...B1(G,B.issues));$.value[H.value]=B.value}}}if(J.length)return Promise.all(J).then(()=>$);return $}});var NQ=O("$ZodEnum",(X,Q)=>{X0.init(X,Q);let $=DX(Q.entries);X._zod.values=new Set($),X._zod.pattern=new RegExp(`^(${$.filter((Y)=>E9.has(typeof Y)).map((Y)=>typeof Y==="string"?y1(Y):Y.toString()).join("|")})$`),X._zod.parse=(Y,W)=>{let J=Y.value;if(X._zod.values.has(J))return Y;return Y.issues.push({code:"invalid_value",values:$,input:J,inst:X}),Y}}),OQ=O("$ZodLiteral",(X,Q)=>{X0.init(X,Q),X._zod.values=new Set(Q.values),X._zod.pattern=new RegExp(`^(${Q.values.map(($)=>typeof $==="string"?y1($):$?$.toString():String($)).join("|")})$`),X._zod.parse=($,Y)=>{let W=$.value;if(X._zod.values.has(W))return $;return $.issues.push({code:"invalid_value",values:Q.values,input:W,inst:X}),$}});var DQ=O("$ZodTransform",(X,Q)=>{X0.init(X,Q),X._zod.parse=($,Y)=>{let W=Q.transform($.value,$);if(Y.async)return(W instanceof Promise?W:Promise.resolve(W)).then((G)=>{return $.value=G,$});if(W instanceof Promise)throw new x1;return $.value=W,$}}),AQ=O("$ZodOptional",(X,Q)=>{X0.init(X,Q),X._zod.optin="optional",X._zod.optout="optional",Y0(X._zod,"values",()=>{return Q.innerType._zod.values?new Set([...Q.innerType._zod.values,void 0]):void 0}),Y0(X._zod,"pattern",()=>{let $=Q.innerType._zod.pattern;return $?new RegExp(`^(${MX($.source)})?$`):void 0}),X._zod.parse=($,Y)=>{if(Q.innerType._zod.optin==="optional")return Q.innerType._zod.run($,Y);if($.value===void 0)return $;return Q.innerType._zod.run($,Y)}}),wQ=O("$ZodNullable",(X,Q)=>{X0.init(X,Q),Y0(X._zod,"optin",()=>Q.innerType._zod.optin),Y0(X._zod,"optout",()=>Q.innerType._zod.optout),Y0(X._zod,"pattern",()=>{let $=Q.innerType._zod.pattern;return $?new RegExp(`^(${MX($.source)}|null)$`):void 0}),Y0(X._zod,"values",()=>{return Q.innerType._zod.values?new Set([...Q.innerType._zod.values,null]):void 0}),X._zod.parse=($,Y)=>{if($.value===null)return $;return Q.innerType._zod.run($,Y)}}),MQ=O("$ZodDefault",(X,Q)=>{X0.init(X,Q),X._zod.optin="optional",Y0(X._zod,"values",()=>Q.innerType._zod.values),X._zod.parse=($,Y)=>{if($.value===void 0)return $.value=Q.defaultValue,$;let W=Q.innerType._zod.run($,Y);if(W instanceof Promise)return W.then((J)=>NJ(J,Q));return NJ(W,Q)}});function NJ(X,Q){if(X.value===void 0)X.value=Q.defaultValue;return X}var jQ=O("$ZodPrefault",(X,Q)=>{X0.init(X,Q),X._zod.optin="optional",Y0(X._zod,"values",()=>Q.innerType._zod.values),X._zod.parse=($,Y)=>{if($.value===void 0)$.value=Q.defaultValue;return Q.innerType._zod.run($,Y)}}),RQ=O("$ZodNonOptional",(X,Q)=>{X0.init(X,Q),Y0(X._zod,"values",()=>{let $=Q.innerType._zod.values;return $?new Set([...$].filter((Y)=>Y!==void 0)):void 0}),X._zod.parse=($,Y)=>{let W=Q.innerType._zod.run($,Y);if(W instanceof Promise)return W.then((J)=>OJ(J,X));return OJ(W,X)}});function OJ(X,Q){if(!X.issues.length&&X.value===void 0)X.issues.push({code:"invalid_type",expected:"nonoptional",input:X.value,inst:Q});return X}var EQ=O("$ZodCatch",(X,Q)=>{X0.init(X,Q),X._zod.optin="optional",Y0(X._zod,"optout",()=>Q.innerType._zod.optout),Y0(X._zod,"values",()=>Q.innerType._zod.values),X._zod.parse=($,Y)=>{let W=Q.innerType._zod.run($,Y);if(W instanceof Promise)return W.then((J)=>{if($.value=J.value,J.issues.length)$.value=Q.catchValue({...$,error:{issues:J.issues.map((G)=>o0(G,Y,u0()))},input:$.value}),$.issues=[];return $});if($.value=W.value,W.issues.length)$.value=Q.catchValue({...$,error:{issues:W.issues.map((J)=>o0(J,Y,u0()))},input:$.value}),$.issues=[];return $}});var IQ=O("$ZodPipe",(X,Q)=>{X0.init(X,Q),Y0(X._zod,"values",()=>Q.in._zod.values),Y0(X._zod,"optin",()=>Q.in._zod.optin),Y0(X._zod,"optout",()=>Q.out._zod.optout),X._zod.parse=($,Y)=>{let W=Q.in._zod.run($,Y);if(W instanceof Promise)return W.then((J)=>DJ(J,Q,Y));return DJ(W,Q,Y)}});function DJ(X,Q,$){if(e1(X))return X;return Q.out._zod.run({value:X.value,issues:X.issues},$)}var bQ=O("$ZodReadonly",(X,Q)=>{X0.init(X,Q),Y0(X._zod,"propValues",()=>Q.innerType._zod.propValues),Y0(X._zod,"values",()=>Q.innerType._zod.values),Y0(X._zod,"optin",()=>Q.innerType._zod.optin),Y0(X._zod,"optout",()=>Q.innerType._zod.optout),X._zod.parse=($,Y)=>{let W=Q.innerType._zod.run($,Y);if(W instanceof Promise)return W.then(AJ);return AJ(W)}});function AJ(X){return X.value=Object.freeze(X.value),X}var PQ=O("$ZodCustom",(X,Q)=>{w0.init(X,Q),X0.init(X,Q),X._zod.parse=($,Y)=>{return $},X._zod.check=($)=>{let Y=$.value,W=Q.fn(Y);if(W instanceof Promise)return W.then((J)=>wJ(J,$,Y,X));wJ(W,$,Y,X);return}});function wJ(X,Q,$,Y){if(!X){let W={code:"custom",input:$,inst:Y,path:[...Y._zod.def.path??[]],continue:!Y._zod.def.abort};if(Y._zod.def.params)W.params=Y._zod.def.params;Q.issues.push(P9(W))}}var oV=(X)=>{let Q=typeof X;switch(Q){case"number":return Number.isNaN(X)?"NaN":"number";case"object":{if(Array.isArray(X))return"array";if(X===null)return"null";if(Object.getPrototypeOf(X)!==Object.prototype&&X.constructor)return X.constructor.name}}return Q},tV=()=>{let X={string:{unit:"characters",verb:"to have"},file:{unit:"bytes",verb:"to have"},array:{unit:"items",verb:"to have"},set:{unit:"items",verb:"to have"}};function Q(Y){return X[Y]??null}let $={regex:"input",email:"email address",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO datetime",date:"ISO date",time:"ISO time",duration:"ISO duration",ipv4:"IPv4 address",ipv6:"IPv6 address",cidrv4:"IPv4 range",cidrv6:"IPv6 range",base64:"base64-encoded string",base64url:"base64url-encoded string",json_string:"JSON string",e164:"E.164 number",jwt:"JWT",template_literal:"input"};return(Y)=>{switch(Y.code){case"invalid_type":return`Invalid input: expected ${Y.expected}, received ${oV(Y.input)}`;case"invalid_value":if(Y.values.length===1)return`Invalid input: expected ${S4(Y.values[0])}`;return`Invalid option: expected one of ${b4(Y.values,"|")}`;case"too_big":{let W=Y.inclusive?"<=":"<",J=Q(Y.origin);if(J)return`Too big: expected ${Y.origin??"value"} to have ${W}${Y.maximum.toString()} ${J.unit??"elements"}`;return`Too big: expected ${Y.origin??"value"} to be ${W}${Y.maximum.toString()}`}case"too_small":{let W=Y.inclusive?">=":">",J=Q(Y.origin);if(J)return`Too small: expected ${Y.origin} to have ${W}${Y.minimum.toString()} ${J.unit}`;return`Too small: expected ${Y.origin} to be ${W}${Y.minimum.toString()}`}case"invalid_format":{let W=Y;if(W.format==="starts_with")return`Invalid string: must start with "${W.prefix}"`;if(W.format==="ends_with")return`Invalid string: must end with "${W.suffix}"`;if(W.format==="includes")return`Invalid string: must include "${W.includes}"`;if(W.format==="regex")return`Invalid string: must match pattern ${W.pattern}`;return`Invalid ${$[W.format]??Y.format}`}case"not_multiple_of":return`Invalid number: must be a multiple of ${Y.divisor}`;case"unrecognized_keys":return`Unrecognized key${Y.keys.length>1?"s":""}: ${b4(Y.keys,", ")}`;case"invalid_key":return`Invalid key in ${Y.origin}`;case"invalid_union":return"Invalid input";case"invalid_element":return`Invalid value in ${Y.origin}`;default:return"Invalid input"}}};function SQ(){return{localeError:tV()}}var aV=Symbol("ZodOutput"),sV=Symbol("ZodInput");class x4{constructor(){this._map=new WeakMap,this._idmap=new Map}add(X,...Q){let $=Q[0];if(this._map.set(X,$),$&&typeof $==="object"&&"id"in $){if(this._idmap.has($.id))throw Error(`ID ${$.id} already exists in the registry`);this._idmap.set($.id,X)}return this}remove(X){return this._map.delete(X),this}get(X){let Q=X._zod.parent;if(Q){let $={...this.get(Q)??{}};return delete $.id,{...$,...this._map.get(X)}}return this._map.get(X)}has(X){return this._map.has(X)}}function bJ(){return new x4}var g1=bJ();function ZQ(X,Q){return new X({type:"string",...y(Q)})}function CQ(X,Q){return new X({type:"string",format:"email",check:"string_format",abort:!1,...y(Q)})}function y4(X,Q){return new X({type:"string",format:"guid",check:"string_format",abort:!1,...y(Q)})}function kQ(X,Q){return new X({type:"string",format:"uuid",check:"string_format",abort:!1,...y(Q)})}function vQ(X,Q){return new X({type:"string",format:"uuid",check:"string_format",abort:!1,version:"v4",...y(Q)})}function TQ(X,Q){return new X({type:"string",format:"uuid",check:"string_format",abort:!1,version:"v6",...y(Q)})}function _Q(X,Q){return new X({type:"string",format:"uuid",check:"string_format",abort:!1,version:"v7",...y(Q)})}function xQ(X,Q){return new X({type:"string",format:"url",check:"string_format",abort:!1,...y(Q)})}function yQ(X,Q){return new X({type:"string",format:"emoji",check:"string_format",abort:!1,...y(Q)})}function gQ(X,Q){return new X({type:"string",format:"nanoid",check:"string_format",abort:!1,...y(Q)})}function fQ(X,Q){return new X({type:"string",format:"cuid",check:"string_format",abort:!1,...y(Q)})}function hQ(X,Q){return new X({type:"string",format:"cuid2",check:"string_format",abort:!1,...y(Q)})}function uQ(X,Q){return new X({type:"string",format:"ulid",check:"string_format",abort:!1,...y(Q)})}function lQ(X,Q){return new X({type:"string",format:"xid",check:"string_format",abort:!1,...y(Q)})}function mQ(X,Q){return new X({type:"string",format:"ksuid",check:"string_format",abort:!1,...y(Q)})}function cQ(X,Q){return new X({type:"string",format:"ipv4",check:"string_format",abort:!1,...y(Q)})}function pQ(X,Q){return new X({type:"string",format:"ipv6",check:"string_format",abort:!1,...y(Q)})}function dQ(X,Q){return new X({type:"string",format:"cidrv4",check:"string_format",abort:!1,...y(Q)})}function iQ(X,Q){return new X({type:"string",format:"cidrv6",check:"string_format",abort:!1,...y(Q)})}function nQ(X,Q){return new X({type:"string",format:"base64",check:"string_format",abort:!1,...y(Q)})}function rQ(X,Q){return new X({type:"string",format:"base64url",check:"string_format",abort:!1,...y(Q)})}function oQ(X,Q){return new X({type:"string",format:"e164",check:"string_format",abort:!1,...y(Q)})}function tQ(X,Q){return new X({type:"string",format:"jwt",check:"string_format",abort:!1,...y(Q)})}function PJ(X,Q){return new X({type:"string",format:"datetime",check:"string_format",offset:!1,local:!1,precision:null,...y(Q)})}function SJ(X,Q){return new X({type:"string",format:"date",check:"string_format",...y(Q)})}function ZJ(X,Q){return new X({type:"string",format:"time",check:"string_format",precision:null,...y(Q)})}function CJ(X,Q){return new X({type:"string",format:"duration",check:"string_format",...y(Q)})}function aQ(X,Q){return new X({type:"number",checks:[],...y(Q)})}function sQ(X,Q){return new X({type:"number",check:"number_format",abort:!1,format:"safeint",...y(Q)})}function eQ(X,Q){return new X({type:"boolean",...y(Q)})}function X$(X,Q){return new X({type:"null",...y(Q)})}function Q$(X){return new X({type:"unknown"})}function $$(X,Q){return new X({type:"never",...y(Q)})}function g4(X,Q){return new f9({check:"less_than",...y(Q),value:X,inclusive:!1})}function bX(X,Q){return new f9({check:"less_than",...y(Q),value:X,inclusive:!0})}function f4(X,Q){return new h9({check:"greater_than",...y(Q),value:X,inclusive:!1})}function PX(X,Q){return new h9({check:"greater_than",...y(Q),value:X,inclusive:!0})}function h4(X,Q){return new sW({check:"multiple_of",...y(Q),value:X})}function u4(X,Q){return new XJ({check:"max_length",...y(Q),maximum:X})}function k6(X,Q){return new QJ({check:"min_length",...y(Q),minimum:X})}function l4(X,Q){return new $J({check:"length_equals",...y(Q),length:X})}function Y$(X,Q){return new YJ({check:"string_format",format:"regex",...y(Q),pattern:X})}function W$(X){return new WJ({check:"string_format",format:"lowercase",...y(X)})}function J$(X){return new JJ({check:"string_format",format:"uppercase",...y(X)})}function G$(X,Q){return new GJ({check:"string_format",format:"includes",...y(Q),includes:X})}function H$(X,Q){return new HJ({check:"string_format",format:"starts_with",...y(Q),prefix:X})}function B$(X,Q){return new BJ({check:"string_format",format:"ends_with",...y(Q),suffix:X})}function $6(X){return new zJ({check:"overwrite",tx:X})}function z$(X){return $6((Q)=>Q.normalize(X))}function K$(){return $6((X)=>X.trim())}function U$(){return $6((X)=>X.toLowerCase())}function V$(){return $6((X)=>X.toUpperCase())}function kJ(X,Q,$){return new X({type:"array",element:Q,...y($)})}function L$(X,Q,$){let Y=y($);return Y.abort??(Y.abort=!0),new X({type:"custom",check:"custom",fn:Q,...Y})}function q$(X,Q,$){return new X({type:"custom",check:"custom",fn:Q,...y($)})}class F${constructor(X){this.counter=0,this.metadataRegistry=X?.metadata??g1,this.target=X?.target??"draft-2020-12",this.unrepresentable=X?.unrepresentable??"throw",this.override=X?.override??(()=>{}),this.io=X?.io??"output",this.seen=new Map}process(X,Q={path:[],schemaPath:[]}){var $;let Y=X._zod.def,W={guid:"uuid",url:"uri",datetime:"date-time",json_string:"json-string",regex:""},J=this.seen.get(X);if(J){if(J.count++,Q.schemaPath.includes(X))J.cycle=Q.path;return J.schema}let G={schema:{},count:1,cycle:void 0,path:Q.path};this.seen.set(X,G);let H=X._zod.toJSONSchema?.();if(H)G.schema=H;else{let K={...Q,schemaPath:[...Q.schemaPath,X],path:Q.path},V=X._zod.parent;if(V)G.ref=V,this.process(V,K),this.seen.get(V).isParent=!0;else{let L=G.schema;switch(Y.type){case"string":{let U=L;U.type="string";let{minimum:F,maximum:q,format:N,patterns:A,contentEncoding:M}=X._zod.bag;if(typeof F==="number")U.minLength=F;if(typeof q==="number")U.maxLength=q;if(N){if(U.format=W[N]??N,U.format==="")delete U.format}if(M)U.contentEncoding=M;if(A&&A.size>0){let R=[...A];if(R.length===1)U.pattern=R[0].source;else if(R.length>1)G.schema.allOf=[...R.map((S)=>({...this.target==="draft-7"?{type:"string"}:{},pattern:S.source}))]}break}case"number":{let U=L,{minimum:F,maximum:q,format:N,multipleOf:A,exclusiveMaximum:M,exclusiveMinimum:R}=X._zod.bag;if(typeof N==="string"&&N.includes("int"))U.type="integer";else U.type="number";if(typeof R==="number")U.exclusiveMinimum=R;if(typeof F==="number"){if(U.minimum=F,typeof R==="number")if(R>=F)delete U.minimum;else delete U.exclusiveMinimum}if(typeof M==="number")U.exclusiveMaximum=M;if(typeof q==="number"){if(U.maximum=q,typeof M==="number")if(M<=q)delete U.maximum;else delete U.exclusiveMaximum}if(typeof A==="number")U.multipleOf=A;break}case"boolean":{let U=L;U.type="boolean";break}case"bigint":{if(this.unrepresentable==="throw")throw Error("BigInt cannot be represented in JSON Schema");break}case"symbol":{if(this.unrepresentable==="throw")throw Error("Symbols cannot be represented in JSON Schema");break}case"null":{L.type="null";break}case"any":break;case"unknown":break;case"undefined":case"never":{L.not={};break}case"void":{if(this.unrepresentable==="throw")throw Error("Void cannot be represented in JSON Schema");break}case"date":{if(this.unrepresentable==="throw")throw Error("Date cannot be represented in JSON Schema");break}case"array":{let U=L,{minimum:F,maximum:q}=X._zod.bag;if(typeof F==="number")U.minItems=F;if(typeof q==="number")U.maxItems=q;U.type="array",U.items=this.process(Y.element,{...K,path:[...K.path,"items"]});break}case"object":{let U=L;U.type="object",U.properties={};let F=Y.shape;for(let A in F)U.properties[A]=this.process(F[A],{...K,path:[...K.path,"properties",A]});let q=new Set(Object.keys(F)),N=new Set([...q].filter((A)=>{let M=Y.shape[A]._zod;if(this.io==="input")return M.optin===void 0;else return M.optout===void 0}));if(N.size>0)U.required=Array.from(N);if(Y.catchall?._zod.def.type==="never")U.additionalProperties=!1;else if(!Y.catchall){if(this.io==="output")U.additionalProperties=!1}else if(Y.catchall)U.additionalProperties=this.process(Y.catchall,{...K,path:[...K.path,"additionalProperties"]});break}case"union":{let U=L;U.anyOf=Y.options.map((F,q)=>this.process(F,{...K,path:[...K.path,"anyOf",q]}));break}case"intersection":{let U=L,F=this.process(Y.left,{...K,path:[...K.path,"allOf",0]}),q=this.process(Y.right,{...K,path:[...K.path,"allOf",1]}),N=(M)=>("allOf"in M)&&Object.keys(M).length===1,A=[...N(F)?F.allOf:[F],...N(q)?q.allOf:[q]];U.allOf=A;break}case"tuple":{let U=L;U.type="array";let F=Y.items.map((A,M)=>this.process(A,{...K,path:[...K.path,"prefixItems",M]}));if(this.target==="draft-2020-12")U.prefixItems=F;else U.items=F;if(Y.rest){let A=this.process(Y.rest,{...K,path:[...K.path,"items"]});if(this.target==="draft-2020-12")U.items=A;else U.additionalItems=A}if(Y.rest)U.items=this.process(Y.rest,{...K,path:[...K.path,"items"]});let{minimum:q,maximum:N}=X._zod.bag;if(typeof q==="number")U.minItems=q;if(typeof N==="number")U.maxItems=N;break}case"record":{let U=L;U.type="object",U.propertyNames=this.process(Y.keyType,{...K,path:[...K.path,"propertyNames"]}),U.additionalProperties=this.process(Y.valueType,{...K,path:[...K.path,"additionalProperties"]});break}case"map":{if(this.unrepresentable==="throw")throw Error("Map cannot be represented in JSON Schema");break}case"set":{if(this.unrepresentable==="throw")throw Error("Set cannot be represented in JSON Schema");break}case"enum":{let U=L,F=DX(Y.entries);if(F.every((q)=>typeof q==="number"))U.type="number";if(F.every((q)=>typeof q==="string"))U.type="string";U.enum=F;break}case"literal":{let U=L,F=[];for(let q of Y.values)if(q===void 0){if(this.unrepresentable==="throw")throw Error("Literal `undefined` cannot be represented in JSON Schema")}else if(typeof q==="bigint")if(this.unrepresentable==="throw")throw Error("BigInt literals cannot be represented in JSON Schema");else F.push(Number(q));else F.push(q);if(F.length===0);else if(F.length===1){let q=F[0];U.type=q===null?"null":typeof q,U.const=q}else{if(F.every((q)=>typeof q==="number"))U.type="number";if(F.every((q)=>typeof q==="string"))U.type="string";if(F.every((q)=>typeof q==="boolean"))U.type="string";if(F.every((q)=>q===null))U.type="null";U.enum=F}break}case"file":{let U=L,F={type:"string",format:"binary",contentEncoding:"binary"},{minimum:q,maximum:N,mime:A}=X._zod.bag;if(q!==void 0)F.minLength=q;if(N!==void 0)F.maxLength=N;if(A)if(A.length===1)F.contentMediaType=A[0],Object.assign(U,F);else U.anyOf=A.map((M)=>{return{...F,contentMediaType:M}});else Object.assign(U,F);break}case"transform":{if(this.unrepresentable==="throw")throw Error("Transforms cannot be represented in JSON Schema");break}case"nullable":{let U=this.process(Y.innerType,K);L.anyOf=[U,{type:"null"}];break}case"nonoptional":{this.process(Y.innerType,K),G.ref=Y.innerType;break}case"success":{let U=L;U.type="boolean";break}case"default":{this.process(Y.innerType,K),G.ref=Y.innerType,L.default=JSON.parse(JSON.stringify(Y.defaultValue));break}case"prefault":{if(this.process(Y.innerType,K),G.ref=Y.innerType,this.io==="input")L._prefault=JSON.parse(JSON.stringify(Y.defaultValue));break}case"catch":{this.process(Y.innerType,K),G.ref=Y.innerType;let U;try{U=Y.catchValue(void 0)}catch{throw Error("Dynamic catch values are not supported in JSON Schema")}L.default=U;break}case"nan":{if(this.unrepresentable==="throw")throw Error("NaN cannot be represented in JSON Schema");break}case"template_literal":{let U=L,F=X._zod.pattern;if(!F)throw Error("Pattern not found in template literal");U.type="string",U.pattern=F.source;break}case"pipe":{let U=this.io==="input"?Y.in._zod.def.type==="transform"?Y.out:Y.in:Y.out;this.process(U,K),G.ref=U;break}case"readonly":{this.process(Y.innerType,K),G.ref=Y.innerType,L.readOnly=!0;break}case"promise":{this.process(Y.innerType,K),G.ref=Y.innerType;break}case"optional":{this.process(Y.innerType,K),G.ref=Y.innerType;break}case"lazy":{let U=X._zod.innerType;this.process(U,K),G.ref=U;break}case"custom":{if(this.unrepresentable==="throw")throw Error("Custom types cannot be represented in JSON Schema");break}default:}}}let B=this.metadataRegistry.get(X);if(B)Object.assign(G.schema,B);if(this.io==="input"&&A0(X))delete G.schema.examples,delete G.schema.default;if(this.io==="input"&&G.schema._prefault)($=G.schema).default??($.default=G.schema._prefault);return delete G.schema._prefault,this.seen.get(X).schema}emit(X,Q){let $={cycles:Q?.cycles??"ref",reused:Q?.reused??"inline",external:Q?.external??void 0},Y=this.seen.get(X);if(!Y)throw Error("Unprocessed schema. This is a bug in Zod.");let W=(z)=>{let K=this.target==="draft-2020-12"?"$defs":"definitions";if($.external){let F=$.external.registry.get(z[0])?.id;if(F)return{ref:$.external.uri(F)};let q=z[1].defId??z[1].schema.id??`schema${this.counter++}`;return z[1].defId=q,{defId:q,ref:`${$.external.uri("__shared")}#/${K}/${q}`}}if(z[1]===Y)return{ref:"#"};let L=`${"#"}/${K}/`,U=z[1].schema.id??`__schema${this.counter++}`;return{defId:U,ref:L+U}},J=(z)=>{if(z[1].schema.$ref)return;let K=z[1],{ref:V,defId:L}=W(z);if(K.def={...K.schema},L)K.defId=L;let U=K.schema;for(let F in U)delete U[F];U.$ref=V};for(let z of this.seen.entries()){let K=z[1];if(X===z[0]){J(z);continue}if($.external){let L=$.external.registry.get(z[0])?.id;if(X!==z[0]&&L){J(z);continue}}if(this.metadataRegistry.get(z[0])?.id){J(z);continue}if(K.cycle){if($.cycles==="throw")throw Error(`Cycle detected: #/${K.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);else if($.cycles==="ref")J(z);continue}if(K.count>1){if($.reused==="ref"){J(z);continue}}}let G=(z,K)=>{let V=this.seen.get(z),L=V.def??V.schema,U={...L};if(V.ref===null)return;let F=V.ref;if(V.ref=null,F){G(F,K);let q=this.seen.get(F).schema;if(q.$ref&&K.target==="draft-7")L.allOf=L.allOf??[],L.allOf.push(q);else Object.assign(L,q),Object.assign(L,U)}if(!V.isParent)this.override({zodSchema:z,jsonSchema:L,path:V.path??[]})};for(let z of[...this.seen.entries()].reverse())G(z[0],{target:this.target});let H={};if(this.target==="draft-2020-12")H.$schema="https://json-schema.org/draft/2020-12/schema";else if(this.target==="draft-7")H.$schema="http://json-schema.org/draft-07/schema#";else console.warn(`Invalid target: ${this.target}`);Object.assign(H,Y.def);let B=$.external?.defs??{};for(let z of this.seen.entries()){let K=z[1];if(K.def&&K.defId)B[K.defId]=K.def}if(!$.external&&Object.keys(B).length>0)if(this.target==="draft-2020-12")H.$defs=B;else H.definitions=B;try{return JSON.parse(JSON.stringify(H))}catch(z){throw Error("Error converting schema to JSON.")}}}function N$(X,Q){if(X instanceof x4){let Y=new F$(Q),W={};for(let H of X._idmap.entries()){let[B,z]=H;Y.process(z)}let J={},G={registry:X,uri:Q?.uri||((H)=>H),defs:W};for(let H of X._idmap.entries()){let[B,z]=H;J[B]=Y.emit(z,{...Q,external:G})}if(Object.keys(W).length>0){let H=Y.target==="draft-2020-12"?"$defs":"definitions";J.__shared={[H]:W}}return{schemas:J}}let $=new F$(Q);return $.process(X),$.emit(X,Q)}function A0(X,Q){let $=Q??{seen:new Set};if($.seen.has(X))return!1;$.seen.add(X);let W=X._zod.def;switch(W.type){case"string":case"number":case"bigint":case"boolean":case"date":case"symbol":case"undefined":case"null":case"any":case"unknown":case"never":case"void":case"literal":case"enum":case"nan":case"file":case"template_literal":return!1;case"array":return A0(W.element,$);case"object":{for(let J in W.shape)if(A0(W.shape[J],$))return!0;return!1}case"union":{for(let J of W.options)if(A0(J,$))return!0;return!1}case"intersection":return A0(W.left,$)||A0(W.right,$);case"tuple":{for(let J of W.items)if(A0(J,$))return!0;if(W.rest&&A0(W.rest,$))return!0;return!1}case"record":return A0(W.keyType,$)||A0(W.valueType,$);case"map":return A0(W.keyType,$)||A0(W.valueType,$);case"set":return A0(W.valueType,$);case"promise":case"optional":case"nonoptional":case"nullable":case"readonly":return A0(W.innerType,$);case"lazy":return A0(W.getter(),$);case"default":return A0(W.innerType,$);case"prefault":return A0(W.innerType,$);case"custom":return!1;case"transform":return!0;case"pipe":return A0(W.in,$)||A0(W.out,$);case"success":return!1;case"catch":return!1;default:}throw Error(`Unknown schema type: ${W.type}`)}var TL=O("ZodMiniType",(X,Q)=>{if(!X._zod)throw Error("Uninitialized schema in ZodMiniType.");X0.init(X,Q),X.def=Q,X.parse=($,Y)=>k9(X,$,Y,{callee:X.parse}),X.safeParse=($,Y)=>X6(X,$,Y),X.parseAsync=async($,Y)=>T9(X,$,Y,{callee:X.parseAsync}),X.safeParseAsync=async($,Y)=>Q6(X,$,Y),X.check=(...$)=>{return X.clone({...Q,checks:[...Q.checks??[],...$.map((Y)=>typeof Y==="function"?{_zod:{check:Y,def:{check:"custom"},onattach:[]}}:Y)]})},X.clone=($,Y)=>l0(X,$,Y),X.brand=()=>X,X.register=($,Y)=>{return $.add(X,Y),X}});var _L=O("ZodMiniObject",(X,Q)=>{T4.init(X,Q),TL.init(X,Q),i.defineLazy(X,"shape",()=>Q.shape)});function O$(X,Q){let $={type:"object",get shape(){return i.assignProp(this,"shape",{...X}),this.shape},...i.normalizeParams(Q)};return new _L($)}function m0(X){return!!X._zod}function v6(X){let Q=Object.values(X);if(Q.length===0)return O$({});let $=Q.every(m0),Y=Q.every((W)=>!m0(W));if($)return O$(X);if(Y)return NW(X);throw Error("Mixed Zod versions detected in object shape.")}function f1(X,Q){if(m0(X))return X6(X,Q);return X.safeParse(Q)}async function m4(X,Q){if(m0(X))return await Q6(X,Q);return await X.safeParseAsync(Q)}function h1(X){var Q,$;if(!X)return;let Y;if(m0(X))Y=($=(Q=X._zod)===null||Q===void 0?void 0:Q.def)===null||$===void 0?void 0:$.shape;else Y=X.shape;if(!Y)return;if(typeof Y==="function")try{return Y()}catch(W){return}return Y}function T6(X){var Q;if(!X)return;if(typeof X==="object"){let $=X,Y=X;if(!$._def&&!Y._zod){let W=Object.values(X);if(W.length>0&&W.every((J)=>typeof J==="object"&&J!==null&&(J._def!==void 0||J._zod!==void 0||typeof J.parse==="function")))return v6(X)}}if(m0(X)){let Y=(Q=X._zod)===null||Q===void 0?void 0:Q.def;if(Y&&(Y.type==="object"||Y.shape!==void 0))return X}else if(X.shape!==void 0)return X;return}function c4(X){if(X&&typeof X==="object"){if("message"in X&&typeof X.message==="string")return X.message;if("issues"in X&&Array.isArray(X.issues)&&X.issues.length>0){let Q=X.issues[0];if(Q&&typeof Q==="object"&&"message"in Q)return String(Q.message)}try{return JSON.stringify(X)}catch(Q){return String(X)}}return String(X)}function TJ(X){var Q,$,Y,W;if(m0(X))return($=(Q=X._zod)===null||Q===void 0?void 0:Q.def)===null||$===void 0?void 0:$.description;let J=X;return(Y=X.description)!==null&&Y!==void 0?Y:(W=J._def)===null||W===void 0?void 0:W.description}function _J(X){var Q,$,Y;if(m0(X))return(($=(Q=X._zod)===null||Q===void 0?void 0:Q.def)===null||$===void 0?void 0:$.type)==="optional";let W=X;if(typeof X.isOptional==="function")return X.isOptional();return((Y=W._def)===null||Y===void 0?void 0:Y.typeName)==="ZodOptional"}function p4(X){var Q;if(m0(X)){let G=(Q=X._zod)===null||Q===void 0?void 0:Q.def;if(G){if(G.value!==void 0)return G.value;if(Array.isArray(G.values)&&G.values.length>0)return G.values[0]}}let Y=X._def;if(Y){if(Y.value!==void 0)return Y.value;if(Array.isArray(Y.values)&&Y.values.length>0)return Y.values[0]}let W=X.value;if(W!==void 0)return W;return}var SX={};U7(SX,{time:()=>w$,duration:()=>M$,datetime:()=>D$,date:()=>A$,ZodISOTime:()=>gJ,ZodISODuration:()=>fJ,ZodISODateTime:()=>xJ,ZodISODate:()=>yJ});var xJ=O("ZodISODateTime",(X,Q)=>{MJ.init(X,Q),H0.init(X,Q)});function D$(X){return PJ(xJ,X)}var yJ=O("ZodISODate",(X,Q)=>{jJ.init(X,Q),H0.init(X,Q)});function A$(X){return SJ(yJ,X)}var gJ=O("ZodISOTime",(X,Q)=>{RJ.init(X,Q),H0.init(X,Q)});function w$(X){return ZJ(gJ,X)}var fJ=O("ZodISODuration",(X,Q)=>{EJ.init(X,Q),H0.init(X,Q)});function M$(X){return CJ(fJ,X)}var hJ=(X,Q)=>{Z4.init(X,Q),X.name="ZodError",Object.defineProperties(X,{format:{value:($)=>Z9(X,$)},flatten:{value:($)=>S9(X,$)},addIssue:{value:($)=>X.issues.push($)},addIssues:{value:($)=>X.issues.push(...$)},isEmpty:{get(){return X.issues.length===0}}})},WZ=O("ZodError",hJ),ZX=O("ZodError",hJ,{Parent:Error});var uJ=C9(ZX),lJ=v9(ZX),mJ=_9(ZX),cJ=x9(ZX);var z0=O("ZodType",(X,Q)=>{return X0.init(X,Q),X.def=Q,Object.defineProperty(X,"_def",{value:Q}),X.check=(...$)=>{return X.clone({...Q,checks:[...Q.checks??[],...$.map((Y)=>typeof Y==="function"?{_zod:{check:Y,def:{check:"custom"},onattach:[]}}:Y)]})},X.clone=($,Y)=>l0(X,$,Y),X.brand=()=>X,X.register=($,Y)=>{return $.add(X,Y),X},X.parse=($,Y)=>uJ(X,$,Y,{callee:X.parse}),X.safeParse=($,Y)=>mJ(X,$,Y),X.parseAsync=async($,Y)=>lJ(X,$,Y,{callee:X.parseAsync}),X.safeParseAsync=async($,Y)=>cJ(X,$,Y),X.spa=X.safeParseAsync,X.refine=($,Y)=>X.check(kq($,Y)),X.superRefine=($)=>X.check(vq($)),X.overwrite=($)=>X.check($6($)),X.optional=()=>v(X),X.nullable=()=>iJ(X),X.nullish=()=>v(iJ(X)),X.nonoptional=($)=>Eq(X,$),X.array=()=>r(X),X.or=($)=>J0([X,$]),X.and=($)=>i4(X,$),X.transform=($)=>R$(X,aJ($)),X.default=($)=>Mq(X,$),X.prefault=($)=>Rq(X,$),X.catch=($)=>bq(X,$),X.pipe=($)=>R$(X,$),X.readonly=()=>Zq(X),X.describe=($)=>{let Y=X.clone();return g1.add(Y,{description:$}),Y},Object.defineProperty(X,"description",{get(){return g1.get(X)?.description},configurable:!0}),X.meta=(...$)=>{if($.length===0)return g1.get(X);let Y=X.clone();return g1.add(Y,$[0]),Y},X.isOptional=()=>X.safeParse(void 0).success,X.isNullable=()=>X.safeParse(null).success,X}),nJ=O("_ZodString",(X,Q)=>{IX.init(X,Q),z0.init(X,Q);let $=X._zod.bag;X.format=$.format??null,X.minLength=$.minimum??null,X.maxLength=$.maximum??null,X.regex=(...Y)=>X.check(Y$(...Y)),X.includes=(...Y)=>X.check(G$(...Y)),X.startsWith=(...Y)=>X.check(H$(...Y)),X.endsWith=(...Y)=>X.check(B$(...Y)),X.min=(...Y)=>X.check(k6(...Y)),X.max=(...Y)=>X.check(u4(...Y)),X.length=(...Y)=>X.check(l4(...Y)),X.nonempty=(...Y)=>X.check(k6(1,...Y)),X.lowercase=(Y)=>X.check(W$(Y)),X.uppercase=(Y)=>X.check(J$(Y)),X.trim=()=>X.check(K$()),X.normalize=(...Y)=>X.check(z$(...Y)),X.toLowerCase=()=>X.check(U$()),X.toUpperCase=()=>X.check(V$())}),cL=O("ZodString",(X,Q)=>{IX.init(X,Q),nJ.init(X,Q),X.email=($)=>X.check(CQ(pL,$)),X.url=($)=>X.check(xQ(dL,$)),X.jwt=($)=>X.check(tQ(Gq,$)),X.emoji=($)=>X.check(yQ(iL,$)),X.guid=($)=>X.check(y4(pJ,$)),X.uuid=($)=>X.check(kQ(d4,$)),X.uuidv4=($)=>X.check(vQ(d4,$)),X.uuidv6=($)=>X.check(TQ(d4,$)),X.uuidv7=($)=>X.check(_Q(d4,$)),X.nanoid=($)=>X.check(gQ(nL,$)),X.guid=($)=>X.check(y4(pJ,$)),X.cuid=($)=>X.check(fQ(rL,$)),X.cuid2=($)=>X.check(hQ(oL,$)),X.ulid=($)=>X.check(uQ(tL,$)),X.base64=($)=>X.check(nQ(Yq,$)),X.base64url=($)=>X.check(rQ(Wq,$)),X.xid=($)=>X.check(lQ(aL,$)),X.ksuid=($)=>X.check(mQ(sL,$)),X.ipv4=($)=>X.check(cQ(eL,$)),X.ipv6=($)=>X.check(pQ(Xq,$)),X.cidrv4=($)=>X.check(dQ(Qq,$)),X.cidrv6=($)=>X.check(iQ($q,$)),X.e164=($)=>X.check(oQ(Jq,$)),X.datetime=($)=>X.check(D$($)),X.date=($)=>X.check(A$($)),X.time=($)=>X.check(w$($)),X.duration=($)=>X.check(M$($))});function D(X){return ZQ(cL,X)}var H0=O("ZodStringFormat",(X,Q)=>{W0.init(X,Q),nJ.init(X,Q)}),pL=O("ZodEmail",(X,Q)=>{p9.init(X,Q),H0.init(X,Q)});var pJ=O("ZodGUID",(X,Q)=>{m9.init(X,Q),H0.init(X,Q)});var d4=O("ZodUUID",(X,Q)=>{c9.init(X,Q),H0.init(X,Q)});var dL=O("ZodURL",(X,Q)=>{d9.init(X,Q),H0.init(X,Q)});var iL=O("ZodEmoji",(X,Q)=>{i9.init(X,Q),H0.init(X,Q)});var nL=O("ZodNanoID",(X,Q)=>{n9.init(X,Q),H0.init(X,Q)});var rL=O("ZodCUID",(X,Q)=>{r9.init(X,Q),H0.init(X,Q)});var oL=O("ZodCUID2",(X,Q)=>{o9.init(X,Q),H0.init(X,Q)});var tL=O("ZodULID",(X,Q)=>{t9.init(X,Q),H0.init(X,Q)});var aL=O("ZodXID",(X,Q)=>{a9.init(X,Q),H0.init(X,Q)});var sL=O("ZodKSUID",(X,Q)=>{s9.init(X,Q),H0.init(X,Q)});var eL=O("ZodIPv4",(X,Q)=>{e9.init(X,Q),H0.init(X,Q)});var Xq=O("ZodIPv6",(X,Q)=>{XQ.init(X,Q),H0.init(X,Q)});var Qq=O("ZodCIDRv4",(X,Q)=>{QQ.init(X,Q),H0.init(X,Q)});var $q=O("ZodCIDRv6",(X,Q)=>{$Q.init(X,Q),H0.init(X,Q)});var Yq=O("ZodBase64",(X,Q)=>{YQ.init(X,Q),H0.init(X,Q)});var Wq=O("ZodBase64URL",(X,Q)=>{WQ.init(X,Q),H0.init(X,Q)});var Jq=O("ZodE164",(X,Q)=>{JQ.init(X,Q),H0.init(X,Q)});var Gq=O("ZodJWT",(X,Q)=>{GQ.init(X,Q),H0.init(X,Q)});var rJ=O("ZodNumber",(X,Q)=>{v4.init(X,Q),z0.init(X,Q),X.gt=(Y,W)=>X.check(f4(Y,W)),X.gte=(Y,W)=>X.check(PX(Y,W)),X.min=(Y,W)=>X.check(PX(Y,W)),X.lt=(Y,W)=>X.check(g4(Y,W)),X.lte=(Y,W)=>X.check(bX(Y,W)),X.max=(Y,W)=>X.check(bX(Y,W)),X.int=(Y)=>X.check(dJ(Y)),X.safe=(Y)=>X.check(dJ(Y)),X.positive=(Y)=>X.check(f4(0,Y)),X.nonnegative=(Y)=>X.check(PX(0,Y)),X.negative=(Y)=>X.check(g4(0,Y)),X.nonpositive=(Y)=>X.check(bX(0,Y)),X.multipleOf=(Y,W)=>X.check(h4(Y,W)),X.step=(Y,W)=>X.check(h4(Y,W)),X.finite=()=>X;let $=X._zod.bag;X.minValue=Math.max($.minimum??Number.NEGATIVE_INFINITY,$.exclusiveMinimum??Number.NEGATIVE_INFINITY)??null,X.maxValue=Math.min($.maximum??Number.POSITIVE_INFINITY,$.exclusiveMaximum??Number.POSITIVE_INFINITY)??null,X.isInt=($.format??"").includes("int")||Number.isSafeInteger($.multipleOf??0.5),X.isFinite=!0,X.format=$.format??null});function Q0(X){return aQ(rJ,X)}var Hq=O("ZodNumberFormat",(X,Q)=>{HQ.init(X,Q),rJ.init(X,Q)});function dJ(X){return sQ(Hq,X)}var Bq=O("ZodBoolean",(X,Q)=>{BQ.init(X,Q),z0.init(X,Q)});function M0(X){return eQ(Bq,X)}var zq=O("ZodNull",(X,Q)=>{zQ.init(X,Q),z0.init(X,Q)});function E$(X){return X$(zq,X)}var Kq=O("ZodUnknown",(X,Q)=>{KQ.init(X,Q),z0.init(X,Q)});function N0(){return Q$(Kq)}var Uq=O("ZodNever",(X,Q)=>{UQ.init(X,Q),z0.init(X,Q)});function Vq(X){return $$(Uq,X)}var Lq=O("ZodArray",(X,Q)=>{VQ.init(X,Q),z0.init(X,Q),X.element=Q.element,X.min=($,Y)=>X.check(k6($,Y)),X.nonempty=($)=>X.check(k6(1,$)),X.max=($,Y)=>X.check(u4($,Y)),X.length=($,Y)=>X.check(l4($,Y)),X.unwrap=()=>X.element});function r(X,Q){return kJ(Lq,X,Q)}var oJ=O("ZodObject",(X,Q)=>{T4.init(X,Q),z0.init(X,Q),i.defineLazy(X,"shape",()=>Q.shape),X.keyof=()=>j0(Object.keys(X._zod.def.shape)),X.catchall=($)=>X.clone({...X._zod.def,catchall:$}),X.passthrough=()=>X.clone({...X._zod.def,catchall:N0()}),X.loose=()=>X.clone({...X._zod.def,catchall:N0()}),X.strict=()=>X.clone({...X._zod.def,catchall:Vq()}),X.strip=()=>X.clone({...X._zod.def,catchall:void 0}),X.extend=($)=>{return i.extend(X,$)},X.merge=($)=>i.merge(X,$),X.pick=($)=>i.pick(X,$),X.omit=($)=>i.omit(X,$),X.partial=(...$)=>i.partial(sJ,X,$[0]),X.required=(...$)=>i.required(eJ,X,$[0])});function I(X,Q){let $={type:"object",get shape(){return i.assignProp(this,"shape",{...X}),this.shape},...i.normalizeParams(Q)};return new oJ($)}function c0(X,Q){return new oJ({type:"object",get shape(){return i.assignProp(this,"shape",{...X}),this.shape},catchall:N0(),...i.normalizeParams(Q)})}var tJ=O("ZodUnion",(X,Q)=>{_4.init(X,Q),z0.init(X,Q),X.options=Q.options});function J0(X,Q){return new tJ({type:"union",options:X,...i.normalizeParams(Q)})}var qq=O("ZodDiscriminatedUnion",(X,Q)=>{tJ.init(X,Q),LQ.init(X,Q)});function I$(X,Q,$){return new qq({type:"union",options:Q,discriminator:X,...i.normalizeParams($)})}var Fq=O("ZodIntersection",(X,Q)=>{qQ.init(X,Q),z0.init(X,Q)});function i4(X,Q){return new Fq({type:"intersection",left:X,right:Q})}var Nq=O("ZodRecord",(X,Q)=>{FQ.init(X,Q),z0.init(X,Q),X.keyType=Q.keyType,X.valueType=Q.valueType});function O0(X,Q,$){return new Nq({type:"record",keyType:X,valueType:Q,...i.normalizeParams($)})}var j$=O("ZodEnum",(X,Q)=>{NQ.init(X,Q),z0.init(X,Q),X.enum=Q.entries,X.options=Object.values(Q.entries);let $=new Set(Object.keys(Q.entries));X.extract=(Y,W)=>{let J={};for(let G of Y)if($.has(G))J[G]=Q.entries[G];else throw Error(`Key ${G} not found in enum`);return new j$({...Q,checks:[],...i.normalizeParams(W),entries:J})},X.exclude=(Y,W)=>{let J={...Q.entries};for(let G of Y)if($.has(G))delete J[G];else throw Error(`Key ${G} not found in enum`);return new j$({...Q,checks:[],...i.normalizeParams(W),entries:J})}});function j0(X,Q){let $=Array.isArray(X)?Object.fromEntries(X.map((Y)=>[Y,Y])):X;return new j$({type:"enum",entries:$,...i.normalizeParams(Q)})}var Oq=O("ZodLiteral",(X,Q)=>{OQ.init(X,Q),z0.init(X,Q),X.values=new Set(Q.values),Object.defineProperty(X,"value",{get(){if(Q.values.length>1)throw Error("This schema contains multiple valid literal values. Use `.values` instead.");return Q.values[0]}})});function T(X,Q){return new Oq({type:"literal",values:Array.isArray(X)?X:[X],...i.normalizeParams(Q)})}var Dq=O("ZodTransform",(X,Q)=>{DQ.init(X,Q),z0.init(X,Q),X._zod.parse=($,Y)=>{$.addIssue=(J)=>{if(typeof J==="string")$.issues.push(i.issue(J,$.value,Q));else{let G=J;if(G.fatal)G.continue=!1;G.code??(G.code="custom"),G.input??(G.input=$.value),G.inst??(G.inst=X),G.continue??(G.continue=!0),$.issues.push(i.issue(G))}};let W=Q.transform($.value,$);if(W instanceof Promise)return W.then((J)=>{return $.value=J,$});return $.value=W,$}});function aJ(X){return new Dq({type:"transform",transform:X})}var sJ=O("ZodOptional",(X,Q)=>{AQ.init(X,Q),z0.init(X,Q),X.unwrap=()=>X._zod.def.innerType});function v(X){return new sJ({type:"optional",innerType:X})}var Aq=O("ZodNullable",(X,Q)=>{wQ.init(X,Q),z0.init(X,Q),X.unwrap=()=>X._zod.def.innerType});function iJ(X){return new Aq({type:"nullable",innerType:X})}var wq=O("ZodDefault",(X,Q)=>{MQ.init(X,Q),z0.init(X,Q),X.unwrap=()=>X._zod.def.innerType,X.removeDefault=X.unwrap});function Mq(X,Q){return new wq({type:"default",innerType:X,get defaultValue(){return typeof Q==="function"?Q():Q}})}var jq=O("ZodPrefault",(X,Q)=>{jQ.init(X,Q),z0.init(X,Q),X.unwrap=()=>X._zod.def.innerType});function Rq(X,Q){return new jq({type:"prefault",innerType:X,get defaultValue(){return typeof Q==="function"?Q():Q}})}var eJ=O("ZodNonOptional",(X,Q)=>{RQ.init(X,Q),z0.init(X,Q),X.unwrap=()=>X._zod.def.innerType});function Eq(X,Q){return new eJ({type:"nonoptional",innerType:X,...i.normalizeParams(Q)})}var Iq=O("ZodCatch",(X,Q)=>{EQ.init(X,Q),z0.init(X,Q),X.unwrap=()=>X._zod.def.innerType,X.removeCatch=X.unwrap});function bq(X,Q){return new Iq({type:"catch",innerType:X,catchValue:typeof Q==="function"?Q:()=>Q})}var Pq=O("ZodPipe",(X,Q)=>{IQ.init(X,Q),z0.init(X,Q),X.in=Q.in,X.out=Q.out});function R$(X,Q){return new Pq({type:"pipe",in:X,out:Q})}var Sq=O("ZodReadonly",(X,Q)=>{bQ.init(X,Q),z0.init(X,Q)});function Zq(X){return new Sq({type:"readonly",innerType:X})}var X5=O("ZodCustom",(X,Q)=>{PQ.init(X,Q),z0.init(X,Q)});function Cq(X,Q){let $=new w0({check:"custom",...i.normalizeParams(Q)});return $._zod.check=X,$}function Q5(X,Q){return L$(X5,X??(()=>!0),Q)}function kq(X,Q={}){return q$(X5,X,Q)}function vq(X,Q){let $=Cq((Y)=>{return Y.addIssue=(W)=>{if(typeof W==="string")Y.issues.push(i.issue(W,Y.value,$._zod.def));else{let J=W;if(J.fatal)J.continue=!1;J.code??(J.code="custom"),J.input??(J.input=Y.value),J.inst??(J.inst=$),J.continue??(J.continue=!$._zod.def.abort),Y.issues.push(i.issue(J))}},X(Y.value,Y)},Q);return $}function b$(X,Q){return R$(aJ(X),Q)}u0(SQ());var P$="2025-11-25";var $5=[P$,"2025-06-18","2025-03-26","2024-11-05","2024-10-07"],K1="io.modelcontextprotocol/related-task",r4="2.0",z1=Q5((X)=>X!==null&&(typeof X==="object"||typeof X==="function")),Y5=J0([D(),Q0().int()]),W5=D(),Tq=c0({ttl:J0([Q0(),E$()]).optional(),pollInterval:Q0().optional()}),S$=c0({taskId:D()}),_q=c0({progressToken:Y5.optional(),[K1]:S$.optional()}),_0=c0({task:Tq.optional(),_meta:_q.optional()}),R0=I({method:D(),params:_0.optional()}),W6=c0({_meta:I({[K1]:v(S$)}).passthrough().optional()}),p0=I({method:D(),params:W6.optional()}),b0=c0({_meta:c0({[K1]:S$.optional()}).optional()}),o4=J0([D(),Q0().int()]),J5=I({jsonrpc:T(r4),id:o4,...R0.shape}).strict(),Z$=(X)=>J5.safeParse(X).success,G5=I({jsonrpc:T(r4),...p0.shape}).strict(),H5=(X)=>G5.safeParse(X).success,B5=I({jsonrpc:T(r4),id:o4,result:b0}).strict(),CX=(X)=>B5.safeParse(X).success,x;(function(X){X[X.ConnectionClosed=-32000]="ConnectionClosed",X[X.RequestTimeout=-32001]="RequestTimeout",X[X.ParseError=-32700]="ParseError",X[X.InvalidRequest=-32600]="InvalidRequest",X[X.MethodNotFound=-32601]="MethodNotFound",X[X.InvalidParams=-32602]="InvalidParams",X[X.InternalError=-32603]="InternalError",X[X.UrlElicitationRequired=-32042]="UrlElicitationRequired"})(x||(x={}));var z5=I({jsonrpc:T(r4),id:o4,error:I({code:Q0().int(),message:D(),data:v(N0())})}).strict(),K5=(X)=>z5.safeParse(X).success,DZ=J0([J5,G5,B5,z5]),t4=b0.strict(),xq=W6.extend({requestId:o4,reason:D().optional()}),a4=p0.extend({method:T("notifications/cancelled"),params:xq}),yq=I({src:D(),mimeType:D().optional(),sizes:r(D()).optional()}),kX=I({icons:r(yq).optional()}),_6=I({name:D(),title:D().optional()}),U5=_6.extend({..._6.shape,...kX.shape,version:D(),websiteUrl:D().optional()}),gq=i4(I({applyDefaults:M0().optional()}),O0(D(),N0())),fq=b$((X)=>{if(X&&typeof X==="object"&&!Array.isArray(X)){if(Object.keys(X).length===0)return{form:{}}}return X},i4(I({form:gq.optional(),url:z1.optional()}),O0(D(),N0()).optional())),hq=I({list:v(I({}).passthrough()),cancel:v(I({}).passthrough()),requests:v(I({sampling:v(I({createMessage:v(I({}).passthrough())}).passthrough()),elicitation:v(I({create:v(I({}).passthrough())}).passthrough())}).passthrough())}).passthrough(),uq=I({list:v(I({}).passthrough()),cancel:v(I({}).passthrough()),requests:v(I({tools:v(I({call:v(I({}).passthrough())}).passthrough())}).passthrough())}).passthrough(),lq=I({experimental:O0(D(),z1).optional(),sampling:I({context:z1.optional(),tools:z1.optional()}).optional(),elicitation:fq.optional(),roots:I({listChanged:M0().optional()}).optional(),tasks:v(hq)}),mq=_0.extend({protocolVersion:D(),capabilities:lq,clientInfo:U5}),C$=R0.extend({method:T("initialize"),params:mq});var cq=I({experimental:O0(D(),z1).optional(),logging:z1.optional(),completions:z1.optional(),prompts:v(I({listChanged:v(M0())})),resources:I({subscribe:M0().optional(),listChanged:M0().optional()}).optional(),tools:I({listChanged:M0().optional()}).optional(),tasks:v(uq)}).passthrough(),pq=b0.extend({protocolVersion:D(),capabilities:cq,serverInfo:U5,instructions:D().optional()}),k$=p0.extend({method:T("notifications/initialized")});var s4=R0.extend({method:T("ping")}),dq=I({progress:Q0(),total:v(Q0()),message:v(D())}),iq=I({...W6.shape,...dq.shape,progressToken:Y5}),e4=p0.extend({method:T("notifications/progress"),params:iq}),nq=_0.extend({cursor:W5.optional()}),vX=R0.extend({params:nq.optional()}),TX=b0.extend({nextCursor:v(W5)}),_X=I({taskId:D(),status:j0(["working","input_required","completed","failed","cancelled"]),ttl:J0([Q0(),E$()]),createdAt:D(),lastUpdatedAt:D(),pollInterval:v(Q0()),statusMessage:v(D())}),x6=b0.extend({task:_X}),rq=W6.merge(_X),xX=p0.extend({method:T("notifications/tasks/status"),params:rq}),X8=R0.extend({method:T("tasks/get"),params:_0.extend({taskId:D()})}),Q8=b0.merge(_X),$8=R0.extend({method:T("tasks/result"),params:_0.extend({taskId:D()})}),Y8=vX.extend({method:T("tasks/list")}),W8=TX.extend({tasks:r(_X)}),V5=R0.extend({method:T("tasks/cancel"),params:_0.extend({taskId:D()})}),L5=b0.merge(_X),q5=I({uri:D(),mimeType:v(D()),_meta:O0(D(),N0()).optional()}),F5=q5.extend({text:D()}),v$=D().refine((X)=>{try{return atob(X),!0}catch(Q){return!1}},{message:"Invalid Base64 string"}),N5=q5.extend({blob:v$}),y6=I({audience:r(j0(["user","assistant"])).optional(),priority:Q0().min(0).max(1).optional(),lastModified:SX.datetime({offset:!0}).optional()}),O5=I({..._6.shape,...kX.shape,uri:D(),description:v(D()),mimeType:v(D()),annotations:y6.optional(),_meta:v(c0({}))}),oq=I({..._6.shape,...kX.shape,uriTemplate:D(),description:v(D()),mimeType:v(D()),annotations:y6.optional(),_meta:v(c0({}))}),J8=vX.extend({method:T("resources/list")}),tq=TX.extend({resources:r(O5)}),G8=vX.extend({method:T("resources/templates/list")}),aq=TX.extend({resourceTemplates:r(oq)}),T$=_0.extend({uri:D()}),sq=T$,H8=R0.extend({method:T("resources/read"),params:sq}),eq=b0.extend({contents:r(J0([F5,N5]))}),XF=p0.extend({method:T("notifications/resources/list_changed")}),QF=T$,$F=R0.extend({method:T("resources/subscribe"),params:QF}),YF=T$,WF=R0.extend({method:T("resources/unsubscribe"),params:YF}),JF=W6.extend({uri:D()}),GF=p0.extend({method:T("notifications/resources/updated"),params:JF}),HF=I({name:D(),description:v(D()),required:v(M0())}),BF=I({..._6.shape,...kX.shape,description:v(D()),arguments:v(r(HF)),_meta:v(c0({}))}),B8=vX.extend({method:T("prompts/list")}),zF=TX.extend({prompts:r(BF)}),KF=_0.extend({name:D(),arguments:O0(D(),D()).optional()}),z8=R0.extend({method:T("prompts/get"),params:KF}),_$=I({type:T("text"),text:D(),annotations:y6.optional(),_meta:O0(D(),N0()).optional()}),x$=I({type:T("image"),data:v$,mimeType:D(),annotations:y6.optional(),_meta:O0(D(),N0()).optional()}),y$=I({type:T("audio"),data:v$,mimeType:D(),annotations:y6.optional(),_meta:O0(D(),N0()).optional()}),UF=I({type:T("tool_use"),name:D(),id:D(),input:I({}).passthrough(),_meta:v(I({}).passthrough())}).passthrough(),VF=I({type:T("resource"),resource:J0([F5,N5]),annotations:y6.optional(),_meta:O0(D(),N0()).optional()}),LF=O5.extend({type:T("resource_link")}),g$=J0([_$,x$,y$,LF,VF]),qF=I({role:j0(["user","assistant"]),content:g$}),FF=b0.extend({description:v(D()),messages:r(qF)}),NF=p0.extend({method:T("notifications/prompts/list_changed")}),OF=I({title:D().optional(),readOnlyHint:M0().optional(),destructiveHint:M0().optional(),idempotentHint:M0().optional(),openWorldHint:M0().optional()}),DF=I({taskSupport:j0(["required","optional","forbidden"]).optional()}),D5=I({..._6.shape,...kX.shape,description:D().optional(),inputSchema:I({type:T("object"),properties:O0(D(),z1).optional(),required:r(D()).optional()}).catchall(N0()),outputSchema:I({type:T("object"),properties:O0(D(),z1).optional(),required:r(D()).optional()}).catchall(N0()).optional(),annotations:v(OF),execution:v(DF),_meta:O0(D(),N0()).optional()}),K8=vX.extend({method:T("tools/list")}),AF=TX.extend({tools:r(D5)}),U8=b0.extend({content:r(g$).default([]),structuredContent:O0(D(),N0()).optional(),isError:v(M0())}),AZ=U8.or(b0.extend({toolResult:N0()})),wF=_0.extend({name:D(),arguments:v(O0(D(),N0()))}),g6=R0.extend({method:T("tools/call"),params:wF}),MF=p0.extend({method:T("notifications/tools/list_changed")}),yX=j0(["debug","info","notice","warning","error","critical","alert","emergency"]),jF=_0.extend({level:yX}),f$=R0.extend({method:T("logging/setLevel"),params:jF}),RF=W6.extend({level:yX,logger:D().optional(),data:N0()}),EF=p0.extend({method:T("notifications/message"),params:RF}),IF=I({name:D().optional()}),bF=I({hints:v(r(IF)),costPriority:v(Q0().min(0).max(1)),speedPriority:v(Q0().min(0).max(1)),intelligencePriority:v(Q0().min(0).max(1))}),PF=I({mode:v(j0(["auto","required","none"]))}),SF=I({type:T("tool_result"),toolUseId:D().describe("The unique identifier for the corresponding tool call."),content:r(g$).default([]),structuredContent:I({}).passthrough().optional(),isError:v(M0()),_meta:v(I({}).passthrough())}).passthrough(),ZF=I$("type",[_$,x$,y$]),n4=I$("type",[_$,x$,y$,UF,SF]),CF=I({role:j0(["user","assistant"]),content:J0([n4,r(n4)]),_meta:v(I({}).passthrough())}).passthrough(),kF=_0.extend({messages:r(CF),modelPreferences:bF.optional(),systemPrompt:D().optional(),includeContext:j0(["none","thisServer","allServers"]).optional(),temperature:Q0().optional(),maxTokens:Q0().int(),stopSequences:r(D()).optional(),metadata:z1.optional(),tools:v(r(D5)),toolChoice:v(PF)}),vF=R0.extend({method:T("sampling/createMessage"),params:kF}),h$=b0.extend({model:D(),stopReason:v(j0(["endTurn","stopSequence","maxTokens"]).or(D())),role:j0(["user","assistant"]),content:ZF}),u$=b0.extend({model:D(),stopReason:v(j0(["endTurn","stopSequence","maxTokens","toolUse"]).or(D())),role:j0(["user","assistant"]),content:J0([n4,r(n4)])}),TF=I({type:T("boolean"),title:D().optional(),description:D().optional(),default:M0().optional()}),_F=I({type:T("string"),title:D().optional(),description:D().optional(),minLength:Q0().optional(),maxLength:Q0().optional(),format:j0(["email","uri","date","date-time"]).optional(),default:D().optional()}),xF=I({type:j0(["number","integer"]),title:D().optional(),description:D().optional(),minimum:Q0().optional(),maximum:Q0().optional(),default:Q0().optional()}),yF=I({type:T("string"),title:D().optional(),description:D().optional(),enum:r(D()),default:D().optional()}),gF=I({type:T("string"),title:D().optional(),description:D().optional(),oneOf:r(I({const:D(),title:D()})),default:D().optional()}),fF=I({type:T("string"),title:D().optional(),description:D().optional(),enum:r(D()),enumNames:r(D()).optional(),default:D().optional()}),hF=J0([yF,gF]),uF=I({type:T("array"),title:D().optional(),description:D().optional(),minItems:Q0().optional(),maxItems:Q0().optional(),items:I({type:T("string"),enum:r(D())}),default:r(D()).optional()}),lF=I({type:T("array"),title:D().optional(),description:D().optional(),minItems:Q0().optional(),maxItems:Q0().optional(),items:I({anyOf:r(I({const:D(),title:D()}))}),default:r(D()).optional()}),mF=J0([uF,lF]),cF=J0([fF,hF,mF]),pF=J0([cF,TF,_F,xF]),dF=_0.extend({mode:T("form").optional(),message:D(),requestedSchema:I({type:T("object"),properties:O0(D(),pF),required:r(D()).optional()})}),iF=_0.extend({mode:T("url"),message:D(),elicitationId:D(),url:D().url()}),nF=J0([dF,iF]),rF=R0.extend({method:T("elicitation/create"),params:nF}),oF=W6.extend({elicitationId:D()}),tF=p0.extend({method:T("notifications/elicitation/complete"),params:oF}),V8=b0.extend({action:j0(["accept","decline","cancel"]),content:b$((X)=>X===null?void 0:X,O0(D(),J0([D(),Q0(),M0(),r(D())])).optional())}),aF=I({type:T("ref/resource"),uri:D()});var sF=I({type:T("ref/prompt"),name:D()}),eF=_0.extend({ref:J0([sF,aF]),argument:I({name:D(),value:D()}),context:I({arguments:O0(D(),D()).optional()}).optional()}),L8=R0.extend({method:T("completion/complete"),params:eF});function A5(X){if(X.params.ref.type!=="ref/prompt")throw TypeError(`Expected CompleteRequestPrompt, but got ${X.params.ref.type}`)}function w5(X){if(X.params.ref.type!=="ref/resource")throw TypeError(`Expected CompleteRequestResourceTemplate, but got ${X.params.ref.type}`)}var XN=b0.extend({completion:c0({values:r(D()).max(100),total:v(Q0().int()),hasMore:v(M0())})}),QN=I({uri:D().startsWith("file://"),name:D().optional(),_meta:O0(D(),N0()).optional()}),$N=R0.extend({method:T("roots/list")}),l$=b0.extend({roots:r(QN)}),YN=p0.extend({method:T("notifications/roots/list_changed")}),wZ=J0([s4,C$,L8,f$,z8,B8,J8,G8,H8,$F,WF,g6,K8,X8,$8,Y8]),MZ=J0([a4,e4,k$,YN,xX]),jZ=J0([t4,h$,u$,V8,l$,Q8,W8,x6]),RZ=J0([s4,vF,rF,$N,X8,$8,Y8]),EZ=J0([a4,e4,EF,GF,XF,MF,NF,xX,tF]),IZ=J0([t4,pq,XN,FF,zF,tq,aq,eq,U8,AF,Q8,W8,x6]);class k extends Error{constructor(X,Q,$){super(`MCP error ${X}: ${Q}`);this.code=X,this.data=$,this.name="McpError"}static fromError(X,Q,$){if(X===x.UrlElicitationRequired&&$){let Y=$;if(Y.elicitations)return new M5(Y.elicitations,Q)}return new k(X,Q,$)}}class M5 extends k{constructor(X,Q=`URL elicitation${X.length>1?"s":""} required`){super(x.UrlElicitationRequired,Q,{elicitations:X})}get elicitations(){var X,Q;return(Q=(X=this.data)===null||X===void 0?void 0:X.elicitations)!==null&&Q!==void 0?Q:[]}}function u1(X){return X==="completed"||X==="failed"||X==="cancelled"}var R5=Symbol("Let zodToJsonSchema decide on which parser to use");var j5={name:void 0,$refStrategy:"root",basePath:["#"],effectStrategy:"input",pipeStrategy:"all",dateStrategy:"format:date-time",mapStrategy:"entries",removeAdditionalStrategy:"passthrough",allowedAdditionalProperties:!0,rejectedAdditionalProperties:!1,definitionPath:"definitions",target:"jsonSchema7",strictUnions:!1,definitions:{},errorMessages:!1,markdownDescription:!1,patternStrategy:"escape",applyRegexFlags:!1,emailStrategy:"format:email",base64Strategy:"contentEncoding:base64",nameStrategy:"ref",openAiAnyTypeName:"OpenAiAnyType"},E5=(X)=>typeof X==="string"?{...j5,name:X}:{...j5,...X};var I5=(X)=>{let Q=E5(X),$=Q.name!==void 0?[...Q.basePath,Q.definitionPath,Q.name]:Q.basePath;return{...Q,flags:{hasReferencedOpenAiAnyType:!1},currentPath:$,propertyPath:void 0,seen:new Map(Object.entries(Q.definitions).map(([Y,W])=>[W._def,{def:W._def,path:[...Q.basePath,Q.definitionPath,Y],jsonSchema:void 0}]))}};function m$(X,Q,$,Y){if(!Y?.errorMessages)return;if($)X.errorMessage={...X.errorMessage,[Q]:$}}function o(X,Q,$,Y,W){X[Q]=$,m$(X,Q,Y,W)}var q8=(X,Q)=>{let $=0;for(;$<X.length&&$<Q.length;$++)if(X[$]!==Q[$])break;return[(X.length-$).toString(),...Q.slice($)].join("/")};function B0(X){if(X.target!=="openAi")return{};let Q=[...X.basePath,X.definitionPath,X.openAiAnyTypeName];return X.flags.hasReferencedOpenAiAnyType=!0,{$ref:X.$refStrategy==="relative"?q8(Q,X.currentPath):Q.join("/")}}function b5(X,Q){let $={type:"array"};if(X.type?._def&&X.type?._def?.typeName!==j.ZodAny)$.items=f(X.type._def,{...Q,currentPath:[...Q.currentPath,"items"]});if(X.minLength)o($,"minItems",X.minLength.value,X.minLength.message,Q);if(X.maxLength)o($,"maxItems",X.maxLength.value,X.maxLength.message,Q);if(X.exactLength)o($,"minItems",X.exactLength.value,X.exactLength.message,Q),o($,"maxItems",X.exactLength.value,X.exactLength.message,Q);return $}function P5(X,Q){let $={type:"integer",format:"int64"};if(!X.checks)return $;for(let Y of X.checks)switch(Y.kind){case"min":if(Q.target==="jsonSchema7")if(Y.inclusive)o($,"minimum",Y.value,Y.message,Q);else o($,"exclusiveMinimum",Y.value,Y.message,Q);else{if(!Y.inclusive)$.exclusiveMinimum=!0;o($,"minimum",Y.value,Y.message,Q)}break;case"max":if(Q.target==="jsonSchema7")if(Y.inclusive)o($,"maximum",Y.value,Y.message,Q);else o($,"exclusiveMaximum",Y.value,Y.message,Q);else{if(!Y.inclusive)$.exclusiveMaximum=!0;o($,"maximum",Y.value,Y.message,Q)}break;case"multipleOf":o($,"multipleOf",Y.value,Y.message,Q);break}return $}function S5(){return{type:"boolean"}}function F8(X,Q){return f(X.type._def,Q)}var Z5=(X,Q)=>{return f(X.innerType._def,Q)};function c$(X,Q,$){let Y=$??Q.dateStrategy;if(Array.isArray(Y))return{anyOf:Y.map((W,J)=>c$(X,Q,W))};switch(Y){case"string":case"format:date-time":return{type:"string",format:"date-time"};case"format:date":return{type:"string",format:"date"};case"integer":return WN(X,Q)}}var WN=(X,Q)=>{let $={type:"integer",format:"unix-time"};if(Q.target==="openApi3")return $;for(let Y of X.checks)switch(Y.kind){case"min":o($,"minimum",Y.value,Y.message,Q);break;case"max":o($,"maximum",Y.value,Y.message,Q);break}return $};function C5(X,Q){return{...f(X.innerType._def,Q),default:X.defaultValue()}}function k5(X,Q){return Q.effectStrategy==="input"?f(X.schema._def,Q):B0(Q)}function v5(X){return{type:"string",enum:Array.from(X.values)}}var JN=(X)=>{if("type"in X&&X.type==="string")return!1;return"allOf"in X};function T5(X,Q){let $=[f(X.left._def,{...Q,currentPath:[...Q.currentPath,"allOf","0"]}),f(X.right._def,{...Q,currentPath:[...Q.currentPath,"allOf","1"]})].filter((J)=>!!J),Y=Q.target==="jsonSchema2019-09"?{unevaluatedProperties:!1}:void 0,W=[];return $.forEach((J)=>{if(JN(J)){if(W.push(...J.allOf),J.unevaluatedProperties===void 0)Y=void 0}else{let G=J;if("additionalProperties"in J&&J.additionalProperties===!1){let{additionalProperties:H,...B}=J;G=B}else Y=void 0;W.push(G)}}),W.length?{allOf:W,...Y}:void 0}function _5(X,Q){let $=typeof X.value;if($!=="bigint"&&$!=="number"&&$!=="boolean"&&$!=="string")return{type:Array.isArray(X.value)?"array":"object"};if(Q.target==="openApi3")return{type:$==="bigint"?"integer":$,enum:[X.value]};return{type:$==="bigint"?"integer":$,const:X.value}}var p$=void 0,t0={cuid:/^[cC][^\s-]{8,}$/,cuid2:/^[0-9a-z]+$/,ulid:/^[0-9A-HJKMNP-TV-Z]{26}$/,email:/^(?!\.)(?!.*\.\.)([a-zA-Z0-9_'+\-\.]*)[a-zA-Z0-9_+-]@([a-zA-Z0-9][a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,}$/,emoji:()=>{if(p$===void 0)p$=RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$","u");return p$},uuid:/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,ipv4:/^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,ipv4Cidr:/^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,ipv6:/^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/,ipv6Cidr:/^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,base64:/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,base64url:/^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,nanoid:/^[a-zA-Z0-9_-]{21}$/,jwt:/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/};function N8(X,Q){let $={type:"string"};if(X.checks)for(let Y of X.checks)switch(Y.kind){case"min":o($,"minLength",typeof $.minLength==="number"?Math.max($.minLength,Y.value):Y.value,Y.message,Q);break;case"max":o($,"maxLength",typeof $.maxLength==="number"?Math.min($.maxLength,Y.value):Y.value,Y.message,Q);break;case"email":switch(Q.emailStrategy){case"format:email":a0($,"email",Y.message,Q);break;case"format:idn-email":a0($,"idn-email",Y.message,Q);break;case"pattern:zod":k0($,t0.email,Y.message,Q);break}break;case"url":a0($,"uri",Y.message,Q);break;case"uuid":a0($,"uuid",Y.message,Q);break;case"regex":k0($,Y.regex,Y.message,Q);break;case"cuid":k0($,t0.cuid,Y.message,Q);break;case"cuid2":k0($,t0.cuid2,Y.message,Q);break;case"startsWith":k0($,RegExp(`^${d$(Y.value,Q)}`),Y.message,Q);break;case"endsWith":k0($,RegExp(`${d$(Y.value,Q)}$`),Y.message,Q);break;case"datetime":a0($,"date-time",Y.message,Q);break;case"date":a0($,"date",Y.message,Q);break;case"time":a0($,"time",Y.message,Q);break;case"duration":a0($,"duration",Y.message,Q);break;case"length":o($,"minLength",typeof $.minLength==="number"?Math.max($.minLength,Y.value):Y.value,Y.message,Q),o($,"maxLength",typeof $.maxLength==="number"?Math.min($.maxLength,Y.value):Y.value,Y.message,Q);break;case"includes":{k0($,RegExp(d$(Y.value,Q)),Y.message,Q);break}case"ip":{if(Y.version!=="v6")a0($,"ipv4",Y.message,Q);if(Y.version!=="v4")a0($,"ipv6",Y.message,Q);break}case"base64url":k0($,t0.base64url,Y.message,Q);break;case"jwt":k0($,t0.jwt,Y.message,Q);break;case"cidr":{if(Y.version!=="v6")k0($,t0.ipv4Cidr,Y.message,Q);if(Y.version!=="v4")k0($,t0.ipv6Cidr,Y.message,Q);break}case"emoji":k0($,t0.emoji(),Y.message,Q);break;case"ulid":{k0($,t0.ulid,Y.message,Q);break}case"base64":{switch(Q.base64Strategy){case"format:binary":{a0($,"binary",Y.message,Q);break}case"contentEncoding:base64":{o($,"contentEncoding","base64",Y.message,Q);break}case"pattern:zod":{k0($,t0.base64,Y.message,Q);break}}break}case"nanoid":k0($,t0.nanoid,Y.message,Q);case"toLowerCase":case"toUpperCase":case"trim":break;default:((W)=>{})(Y)}return $}function d$(X,Q){return Q.patternStrategy==="escape"?HN(X):X}var GN=new Set("ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789");function HN(X){let Q="";for(let $=0;$<X.length;$++){if(!GN.has(X[$]))Q+="\\";Q+=X[$]}return Q}function a0(X,Q,$,Y){if(X.format||X.anyOf?.some((W)=>W.format)){if(!X.anyOf)X.anyOf=[];if(X.format){if(X.anyOf.push({format:X.format,...X.errorMessage&&Y.errorMessages&&{errorMessage:{format:X.errorMessage.format}}}),delete X.format,X.errorMessage){if(delete X.errorMessage.format,Object.keys(X.errorMessage).length===0)delete X.errorMessage}}X.anyOf.push({format:Q,...$&&Y.errorMessages&&{errorMessage:{format:$}}})}else o(X,"format",Q,$,Y)}function k0(X,Q,$,Y){if(X.pattern||X.allOf?.some((W)=>W.pattern)){if(!X.allOf)X.allOf=[];if(X.pattern){if(X.allOf.push({pattern:X.pattern,...X.errorMessage&&Y.errorMessages&&{errorMessage:{pattern:X.errorMessage.pattern}}}),delete X.pattern,X.errorMessage){if(delete X.errorMessage.pattern,Object.keys(X.errorMessage).length===0)delete X.errorMessage}}X.allOf.push({pattern:x5(Q,Y),...$&&Y.errorMessages&&{errorMessage:{pattern:$}}})}else o(X,"pattern",x5(Q,Y),$,Y)}function x5(X,Q){if(!Q.applyRegexFlags||!X.flags)return X.source;let $={i:X.flags.includes("i"),m:X.flags.includes("m"),s:X.flags.includes("s")},Y=$.i?X.source.toLowerCase():X.source,W="",J=!1,G=!1,H=!1;for(let B=0;B<Y.length;B++){if(J){W+=Y[B],J=!1;continue}if($.i){if(G){if(Y[B].match(/[a-z]/)){if(H)W+=Y[B],W+=`${Y[B-2]}-${Y[B]}`.toUpperCase(),H=!1;else if(Y[B+1]==="-"&&Y[B+2]?.match(/[a-z]/))W+=Y[B],H=!0;else W+=`${Y[B]}${Y[B].toUpperCase()}`;continue}}else if(Y[B].match(/[a-z]/)){W+=`[${Y[B]}${Y[B].toUpperCase()}]`;continue}}if($.m){if(Y[B]==="^"){W+=`(^|(?<=[\r
]))`;continue}else if(Y[B]==="$"){W+=`($|(?=[\r
]))`;continue}}if($.s&&Y[B]==="."){W+=G?`${Y[B]}\r
`:`[${Y[B]}\r
]`;continue}if(W+=Y[B],Y[B]==="\\")J=!0;else if(G&&Y[B]==="]")G=!1;else if(!G&&Y[B]==="[")G=!0}try{new RegExp(W)}catch{return console.warn(`Could not convert regex pattern at ${Q.currentPath.join("/")} to a flag-independent form! Falling back to the flag-ignorant source`),X.source}return W}function O8(X,Q){if(Q.target==="openAi")console.warn("Warning: OpenAI may not support records in schemas! Try an array of key-value pairs instead.");if(Q.target==="openApi3"&&X.keyType?._def.typeName===j.ZodEnum)return{type:"object",required:X.keyType._def.values,properties:X.keyType._def.values.reduce((Y,W)=>({...Y,[W]:f(X.valueType._def,{...Q,currentPath:[...Q.currentPath,"properties",W]})??B0(Q)}),{}),additionalProperties:Q.rejectedAdditionalProperties};let $={type:"object",additionalProperties:f(X.valueType._def,{...Q,currentPath:[...Q.currentPath,"additionalProperties"]})??Q.allowedAdditionalProperties};if(Q.target==="openApi3")return $;if(X.keyType?._def.typeName===j.ZodString&&X.keyType._def.checks?.length){let{type:Y,...W}=N8(X.keyType._def,Q);return{...$,propertyNames:W}}else if(X.keyType?._def.typeName===j.ZodEnum)return{...$,propertyNames:{enum:X.keyType._def.values}};else if(X.keyType?._def.typeName===j.ZodBranded&&X.keyType._def.type._def.typeName===j.ZodString&&X.keyType._def.type._def.checks?.length){let{type:Y,...W}=F8(X.keyType._def,Q);return{...$,propertyNames:W}}return $}function y5(X,Q){if(Q.mapStrategy==="record")return O8(X,Q);let $=f(X.keyType._def,{...Q,currentPath:[...Q.currentPath,"items","items","0"]})||B0(Q),Y=f(X.valueType._def,{...Q,currentPath:[...Q.currentPath,"items","items","1"]})||B0(Q);return{type:"array",maxItems:125,items:{type:"array",items:[$,Y],minItems:2,maxItems:2}}}function g5(X){let Q=X.values,Y=Object.keys(X.values).filter((J)=>{return typeof Q[Q[J]]!=="number"}).map((J)=>Q[J]),W=Array.from(new Set(Y.map((J)=>typeof J)));return{type:W.length===1?W[0]==="string"?"string":"number":["string","number"],enum:Y}}function f5(X){return X.target==="openAi"?void 0:{not:B0({...X,currentPath:[...X.currentPath,"not"]})}}function h5(X){return X.target==="openApi3"?{enum:["null"],nullable:!0}:{type:"null"}}var gX={ZodString:"string",ZodNumber:"number",ZodBigInt:"integer",ZodBoolean:"boolean",ZodNull:"null"};function l5(X,Q){if(Q.target==="openApi3")return u5(X,Q);let $=X.options instanceof Map?Array.from(X.options.values()):X.options;if($.every((Y)=>(Y._def.typeName in gX)&&(!Y._def.checks||!Y._def.checks.length))){let Y=$.reduce((W,J)=>{let G=gX[J._def.typeName];return G&&!W.includes(G)?[...W,G]:W},[]);return{type:Y.length>1?Y:Y[0]}}else if($.every((Y)=>Y._def.typeName==="ZodLiteral"&&!Y.description)){let Y=$.reduce((W,J)=>{let G=typeof J._def.value;switch(G){case"string":case"number":case"boolean":return[...W,G];case"bigint":return[...W,"integer"];case"object":if(J._def.value===null)return[...W,"null"];case"symbol":case"undefined":case"function":default:return W}},[]);if(Y.length===$.length){let W=Y.filter((J,G,H)=>H.indexOf(J)===G);return{type:W.length>1?W:W[0],enum:$.reduce((J,G)=>{return J.includes(G._def.value)?J:[...J,G._def.value]},[])}}}else if($.every((Y)=>Y._def.typeName==="ZodEnum"))return{type:"string",enum:$.reduce((Y,W)=>[...Y,...W._def.values.filter((J)=>!Y.includes(J))],[])};return u5(X,Q)}var u5=(X,Q)=>{let $=(X.options instanceof Map?Array.from(X.options.values()):X.options).map((Y,W)=>f(Y._def,{...Q,currentPath:[...Q.currentPath,"anyOf",`${W}`]})).filter((Y)=>!!Y&&(!Q.strictUnions||typeof Y==="object"&&Object.keys(Y).length>0));return $.length?{anyOf:$}:void 0};function m5(X,Q){if(["ZodString","ZodNumber","ZodBigInt","ZodBoolean","ZodNull"].includes(X.innerType._def.typeName)&&(!X.innerType._def.checks||!X.innerType._def.checks.length)){if(Q.target==="openApi3")return{type:gX[X.innerType._def.typeName],nullable:!0};return{type:[gX[X.innerType._def.typeName],"null"]}}if(Q.target==="openApi3"){let Y=f(X.innerType._def,{...Q,currentPath:[...Q.currentPath]});if(Y&&"$ref"in Y)return{allOf:[Y],nullable:!0};return Y&&{...Y,nullable:!0}}let $=f(X.innerType._def,{...Q,currentPath:[...Q.currentPath,"anyOf","0"]});return $&&{anyOf:[$,{type:"null"}]}}function c5(X,Q){let $={type:"number"};if(!X.checks)return $;for(let Y of X.checks)switch(Y.kind){case"int":$.type="integer",m$($,"type",Y.message,Q);break;case"min":if(Q.target==="jsonSchema7")if(Y.inclusive)o($,"minimum",Y.value,Y.message,Q);else o($,"exclusiveMinimum",Y.value,Y.message,Q);else{if(!Y.inclusive)$.exclusiveMinimum=!0;o($,"minimum",Y.value,Y.message,Q)}break;case"max":if(Q.target==="jsonSchema7")if(Y.inclusive)o($,"maximum",Y.value,Y.message,Q);else o($,"exclusiveMaximum",Y.value,Y.message,Q);else{if(!Y.inclusive)$.exclusiveMaximum=!0;o($,"maximum",Y.value,Y.message,Q)}break;case"multipleOf":o($,"multipleOf",Y.value,Y.message,Q);break}return $}function p5(X,Q){let $=Q.target==="openAi",Y={type:"object",properties:{}},W=[],J=X.shape();for(let H in J){let B=J[H];if(B===void 0||B._def===void 0)continue;let z=zN(B);if(z&&$){if(B._def.typeName==="ZodOptional")B=B._def.innerType;if(!B.isNullable())B=B.nullable();z=!1}let K=f(B._def,{...Q,currentPath:[...Q.currentPath,"properties",H],propertyPath:[...Q.currentPath,"properties",H]});if(K===void 0)continue;if(Y.properties[H]=K,!z)W.push(H)}if(W.length)Y.required=W;let G=BN(X,Q);if(G!==void 0)Y.additionalProperties=G;return Y}function BN(X,Q){if(X.catchall._def.typeName!=="ZodNever")return f(X.catchall._def,{...Q,currentPath:[...Q.currentPath,"additionalProperties"]});switch(X.unknownKeys){case"passthrough":return Q.allowedAdditionalProperties;case"strict":return Q.rejectedAdditionalProperties;case"strip":return Q.removeAdditionalStrategy==="strict"?Q.allowedAdditionalProperties:Q.rejectedAdditionalProperties}}function zN(X){try{return X.isOptional()}catch{return!0}}var d5=(X,Q)=>{if(Q.currentPath.toString()===Q.propertyPath?.toString())return f(X.innerType._def,Q);let $=f(X.innerType._def,{...Q,currentPath:[...Q.currentPath,"anyOf","1"]});return $?{anyOf:[{not:B0(Q)},$]}:B0(Q)};var i5=(X,Q)=>{if(Q.pipeStrategy==="input")return f(X.in._def,Q);else if(Q.pipeStrategy==="output")return f(X.out._def,Q);let $=f(X.in._def,{...Q,currentPath:[...Q.currentPath,"allOf","0"]}),Y=f(X.out._def,{...Q,currentPath:[...Q.currentPath,"allOf",$?"1":"0"]});return{allOf:[$,Y].filter((W)=>W!==void 0)}};function n5(X,Q){return f(X.type._def,Q)}function r5(X,Q){let Y={type:"array",uniqueItems:!0,items:f(X.valueType._def,{...Q,currentPath:[...Q.currentPath,"items"]})};if(X.minSize)o(Y,"minItems",X.minSize.value,X.minSize.message,Q);if(X.maxSize)o(Y,"maxItems",X.maxSize.value,X.maxSize.message,Q);return Y}function o5(X,Q){if(X.rest)return{type:"array",minItems:X.items.length,items:X.items.map(($,Y)=>f($._def,{...Q,currentPath:[...Q.currentPath,"items",`${Y}`]})).reduce(($,Y)=>Y===void 0?$:[...$,Y],[]),additionalItems:f(X.rest._def,{...Q,currentPath:[...Q.currentPath,"additionalItems"]})};else return{type:"array",minItems:X.items.length,maxItems:X.items.length,items:X.items.map(($,Y)=>f($._def,{...Q,currentPath:[...Q.currentPath,"items",`${Y}`]})).reduce(($,Y)=>Y===void 0?$:[...$,Y],[])}}function t5(X){return{not:B0(X)}}function a5(X){return B0(X)}var s5=(X,Q)=>{return f(X.innerType._def,Q)};var e5=(X,Q,$)=>{switch(Q){case j.ZodString:return N8(X,$);case j.ZodNumber:return c5(X,$);case j.ZodObject:return p5(X,$);case j.ZodBigInt:return P5(X,$);case j.ZodBoolean:return S5();case j.ZodDate:return c$(X,$);case j.ZodUndefined:return t5($);case j.ZodNull:return h5($);case j.ZodArray:return b5(X,$);case j.ZodUnion:case j.ZodDiscriminatedUnion:return l5(X,$);case j.ZodIntersection:return T5(X,$);case j.ZodTuple:return o5(X,$);case j.ZodRecord:return O8(X,$);case j.ZodLiteral:return _5(X,$);case j.ZodEnum:return v5(X);case j.ZodNativeEnum:return g5(X);case j.ZodNullable:return m5(X,$);case j.ZodOptional:return d5(X,$);case j.ZodMap:return y5(X,$);case j.ZodSet:return r5(X,$);case j.ZodLazy:return()=>X.getter()._def;case j.ZodPromise:return n5(X,$);case j.ZodNaN:case j.ZodNever:return f5($);case j.ZodEffects:return k5(X,$);case j.ZodAny:return B0($);case j.ZodUnknown:return a5($);case j.ZodDefault:return C5(X,$);case j.ZodBranded:return F8(X,$);case j.ZodReadonly:return s5(X,$);case j.ZodCatch:return Z5(X,$);case j.ZodPipeline:return i5(X,$);case j.ZodFunction:case j.ZodVoid:case j.ZodSymbol:return;default:return((Y)=>{return})(Q)}};function f(X,Q,$=!1){let Y=Q.seen.get(X);if(Q.override){let H=Q.override?.(X,Q,Y,$);if(H!==R5)return H}if(Y&&!$){let H=KN(Y,Q);if(H!==void 0)return H}let W={def:X,path:Q.currentPath,jsonSchema:void 0};Q.seen.set(X,W);let J=e5(X,X.typeName,Q),G=typeof J==="function"?f(J(),Q):J;if(G)UN(X,Q,G);if(Q.postProcess){let H=Q.postProcess(G,X,Q);return W.jsonSchema=G,H}return W.jsonSchema=G,G}var KN=(X,Q)=>{switch(Q.$refStrategy){case"root":return{$ref:X.path.join("/")};case"relative":return{$ref:q8(Q.currentPath,X.path)};case"none":case"seen":{if(X.path.length<Q.currentPath.length&&X.path.every(($,Y)=>Q.currentPath[Y]===$))return console.warn(`Recursive reference detected at ${Q.currentPath.join("/")}! Defaulting to any`),B0(Q);return Q.$refStrategy==="seen"?B0(Q):void 0}}},UN=(X,Q,$)=>{if(X.description){if($.description=X.description,Q.markdownDescription)$.markdownDescription=X.description}return $};var i$=(X,Q)=>{let $=I5(Q),Y=typeof Q==="object"&&Q.definitions?Object.entries(Q.definitions).reduce((B,[z,K])=>({...B,[z]:f(K._def,{...$,currentPath:[...$.basePath,$.definitionPath,z]},!0)??B0($)}),{}):void 0,W=typeof Q==="string"?Q:Q?.nameStrategy==="title"?void 0:Q?.name,J=f(X._def,W===void 0?$:{...$,currentPath:[...$.basePath,$.definitionPath,W]},!1)??B0($),G=typeof Q==="object"&&Q.name!==void 0&&Q.nameStrategy==="title"?Q.name:void 0;if(G!==void 0)J.title=G;if($.flags.hasReferencedOpenAiAnyType){if(!Y)Y={};if(!Y[$.openAiAnyTypeName])Y[$.openAiAnyTypeName]={type:["string","number","integer","boolean","array","null"],items:{$ref:$.$refStrategy==="relative"?"1":[...$.basePath,$.definitionPath,$.openAiAnyTypeName].join("/")}}}let H=W===void 0?Y?{...J,[$.definitionPath]:Y}:J:{$ref:[...$.$refStrategy==="relative"?[]:$.basePath,$.definitionPath,W].join("/"),[$.definitionPath]:{...Y,[W]:J}};if($.target==="jsonSchema7")H.$schema="http://json-schema.org/draft-07/schema#";else if($.target==="jsonSchema2019-09"||$.target==="openAi")H.$schema="https://json-schema.org/draft/2019-09/schema#";if($.target==="openAi"&&(("anyOf"in H)||("oneOf"in H)||("allOf"in H)||("type"in H)&&Array.isArray(H.type)))console.warn("Warning: OpenAI may not support schemas with unions as roots! Try wrapping it in an object property.");return H};function VN(X){if(!X)return"draft-7";if(X==="jsonSchema7"||X==="draft-7")return"draft-7";if(X==="jsonSchema2019-09"||X==="draft-2020-12")return"draft-2020-12";return"draft-7"}function n$(X,Q){var $,Y,W;if(m0(X))return N$(X,{target:VN(Q===null||Q===void 0?void 0:Q.target),io:($=Q===null||Q===void 0?void 0:Q.pipeStrategy)!==null&&$!==void 0?$:"input"});return i$(X,{strictUnions:(Y=Q===null||Q===void 0?void 0:Q.strictUnions)!==null&&Y!==void 0?Y:!0,pipeStrategy:(W=Q===null||Q===void 0?void 0:Q.pipeStrategy)!==null&&W!==void 0?W:"input"})}function r$(X){let Q=h1(X),$=Q===null||Q===void 0?void 0:Q.method;if(!$)throw Error("Schema is missing a method literal");let Y=p4($);if(typeof Y!=="string")throw Error("Schema method literal must be a string");return Y}function o$(X,Q){let $=f1(X,Q);if(!$.success)throw $.error;return $.data}var LN=60000;class t${constructor(X){if(this._options=X,this._requestMessageId=0,this._requestHandlers=new Map,this._requestHandlerAbortControllers=new Map,this._notificationHandlers=new Map,this._responseHandlers=new Map,this._progressHandlers=new Map,this._timeoutInfo=new Map,this._pendingDebouncedNotifications=new Set,this._taskProgressTokens=new Map,this._requestResolvers=new Map,this.setNotificationHandler(a4,(Q)=>{this._oncancel(Q)}),this.setNotificationHandler(e4,(Q)=>{this._onprogress(Q)}),this.setRequestHandler(s4,(Q)=>({})),this._taskStore=X===null||X===void 0?void 0:X.taskStore,this._taskMessageQueue=X===null||X===void 0?void 0:X.taskMessageQueue,this._taskStore)this.setRequestHandler(X8,async(Q,$)=>{let Y=await this._taskStore.getTask(Q.params.taskId,$.sessionId);if(!Y)throw new k(x.InvalidParams,"Failed to retrieve task: Task not found");return{...Y}}),this.setRequestHandler($8,async(Q,$)=>{let Y=async()=>{var W;let J=Q.params.taskId;if(this._taskMessageQueue){let H;while(H=await this._taskMessageQueue.dequeue(J,$.sessionId)){if(H.type==="response"||H.type==="error"){let B=H.message,z=B.id,K=this._requestResolvers.get(z);if(K)if(this._requestResolvers.delete(z),H.type==="response")K(B);else{let V=B,L=new k(V.error.code,V.error.message,V.error.data);K(L)}else{let V=H.type==="response"?"Response":"Error";this._onerror(Error(`${V} handler missing for request ${z}`))}continue}await((W=this._transport)===null||W===void 0?void 0:W.send(H.message,{relatedRequestId:$.requestId}))}}let G=await this._taskStore.getTask(J,$.sessionId);if(!G)throw new k(x.InvalidParams,`Task not found: ${J}`);if(!u1(G.status))return await this._waitForTaskUpdate(J,$.signal),await Y();if(u1(G.status)){let H=await this._taskStore.getTaskResult(J,$.sessionId);return this._clearTaskQueue(J),{...H,_meta:{...H._meta,[K1]:{taskId:J}}}}return await Y()};return await Y()}),this.setRequestHandler(Y8,async(Q,$)=>{var Y;try{let{tasks:W,nextCursor:J}=await this._taskStore.listTasks((Y=Q.params)===null||Y===void 0?void 0:Y.cursor,$.sessionId);return{tasks:W,nextCursor:J,_meta:{}}}catch(W){throw new k(x.InvalidParams,`Failed to list tasks: ${W instanceof Error?W.message:String(W)}`)}}),this.setRequestHandler(V5,async(Q,$)=>{try{let Y=await this._taskStore.getTask(Q.params.taskId,$.sessionId);if(!Y)throw new k(x.InvalidParams,`Task not found: ${Q.params.taskId}`);if(u1(Y.status))throw new k(x.InvalidParams,`Cannot cancel task in terminal status: ${Y.status}`);await this._taskStore.updateTaskStatus(Q.params.taskId,"cancelled","Client cancelled task execution.",$.sessionId),this._clearTaskQueue(Q.params.taskId);let W=await this._taskStore.getTask(Q.params.taskId,$.sessionId);if(!W)throw new k(x.InvalidParams,`Task not found after cancellation: ${Q.params.taskId}`);return{_meta:{},...W}}catch(Y){if(Y instanceof k)throw Y;throw new k(x.InvalidRequest,`Failed to cancel task: ${Y instanceof Error?Y.message:String(Y)}`)}})}async _oncancel(X){let Q=this._requestHandlerAbortControllers.get(X.params.requestId);Q===null||Q===void 0||Q.abort(X.params.reason)}_setupTimeout(X,Q,$,Y,W=!1){this._timeoutInfo.set(X,{timeoutId:setTimeout(Y,Q),startTime:Date.now(),timeout:Q,maxTotalTimeout:$,resetTimeoutOnProgress:W,onTimeout:Y})}_resetTimeout(X){let Q=this._timeoutInfo.get(X);if(!Q)return!1;let $=Date.now()-Q.startTime;if(Q.maxTotalTimeout&&$>=Q.maxTotalTimeout)throw this._timeoutInfo.delete(X),k.fromError(x.RequestTimeout,"Maximum total timeout exceeded",{maxTotalTimeout:Q.maxTotalTimeout,totalElapsed:$});return clearTimeout(Q.timeoutId),Q.timeoutId=setTimeout(Q.onTimeout,Q.timeout),!0}_cleanupTimeout(X){let Q=this._timeoutInfo.get(X);if(Q)clearTimeout(Q.timeoutId),this._timeoutInfo.delete(X)}async connect(X){var Q,$,Y;this._transport=X;let W=(Q=this.transport)===null||Q===void 0?void 0:Q.onclose;this._transport.onclose=()=>{W===null||W===void 0||W(),this._onclose()};let J=($=this.transport)===null||$===void 0?void 0:$.onerror;this._transport.onerror=(H)=>{J===null||J===void 0||J(H),this._onerror(H)};let G=(Y=this._transport)===null||Y===void 0?void 0:Y.onmessage;this._transport.onmessage=(H,B)=>{if(G===null||G===void 0||G(H,B),CX(H)||K5(H))this._onresponse(H);else if(Z$(H))this._onrequest(H,B);else if(H5(H))this._onnotification(H);else this._onerror(Error(`Unknown message type: ${JSON.stringify(H)}`))},await this._transport.start()}_onclose(){var X;let Q=this._responseHandlers;this._responseHandlers=new Map,this._progressHandlers.clear(),this._taskProgressTokens.clear(),this._pendingDebouncedNotifications.clear();let $=k.fromError(x.ConnectionClosed,"Connection closed");this._transport=void 0,(X=this.onclose)===null||X===void 0||X.call(this);for(let Y of Q.values())Y($)}_onerror(X){var Q;(Q=this.onerror)===null||Q===void 0||Q.call(this,X)}_onnotification(X){var Q;let $=(Q=this._notificationHandlers.get(X.method))!==null&&Q!==void 0?Q:this.fallbackNotificationHandler;if($===void 0)return;Promise.resolve().then(()=>$(X)).catch((Y)=>this._onerror(Error(`Uncaught error in notification handler: ${Y}`)))}_onrequest(X,Q){var $,Y,W,J,G,H;let B=($=this._requestHandlers.get(X.method))!==null&&$!==void 0?$:this.fallbackRequestHandler,z=this._transport,K=(J=(W=(Y=X.params)===null||Y===void 0?void 0:Y._meta)===null||W===void 0?void 0:W[K1])===null||J===void 0?void 0:J.taskId;if(B===void 0){let q={jsonrpc:"2.0",id:X.id,error:{code:x.MethodNotFound,message:"Method not found"}};if(K&&this._taskMessageQueue)this._enqueueTaskMessage(K,{type:"error",message:q,timestamp:Date.now()},z===null||z===void 0?void 0:z.sessionId).catch((N)=>this._onerror(Error(`Failed to enqueue error response: ${N}`)));else z===null||z===void 0||z.send(q).catch((N)=>this._onerror(Error(`Failed to send an error response: ${N}`)));return}let V=new AbortController;this._requestHandlerAbortControllers.set(X.id,V);let L=(G=X.params)===null||G===void 0?void 0:G.task,U=this._taskStore?this.requestTaskStore(X,z===null||z===void 0?void 0:z.sessionId):void 0,F={signal:V.signal,sessionId:z===null||z===void 0?void 0:z.sessionId,_meta:(H=X.params)===null||H===void 0?void 0:H._meta,sendNotification:async(q)=>{let N={relatedRequestId:X.id};if(K)N.relatedTask={taskId:K};await this.notification(q,N)},sendRequest:async(q,N,A)=>{var M,R;let S={...A,relatedRequestId:X.id};if(K&&!S.relatedTask)S.relatedTask={taskId:K};let C=(R=(M=S.relatedTask)===null||M===void 0?void 0:M.taskId)!==null&&R!==void 0?R:K;if(C&&U)await U.updateTaskStatus(C,"input_required");return await this.request(q,N,S)},authInfo:Q===null||Q===void 0?void 0:Q.authInfo,requestId:X.id,requestInfo:Q===null||Q===void 0?void 0:Q.requestInfo,taskId:K,taskStore:U,taskRequestedTtl:L===null||L===void 0?void 0:L.ttl,closeSSEStream:Q===null||Q===void 0?void 0:Q.closeSSEStream,closeStandaloneSSEStream:Q===null||Q===void 0?void 0:Q.closeStandaloneSSEStream};Promise.resolve().then(()=>{if(L)this.assertTaskHandlerCapability(X.method)}).then(()=>B(X,F)).then(async(q)=>{if(V.signal.aborted)return;let N={result:q,jsonrpc:"2.0",id:X.id};if(K&&this._taskMessageQueue)await this._enqueueTaskMessage(K,{type:"response",message:N,timestamp:Date.now()},z===null||z===void 0?void 0:z.sessionId);else await(z===null||z===void 0?void 0:z.send(N))},async(q)=>{var N;if(V.signal.aborted)return;let A={jsonrpc:"2.0",id:X.id,error:{code:Number.isSafeInteger(q.code)?q.code:x.InternalError,message:(N=q.message)!==null&&N!==void 0?N:"Internal error",...q.data!==void 0&&{data:q.data}}};if(K&&this._taskMessageQueue)await this._enqueueTaskMessage(K,{type:"error",message:A,timestamp:Date.now()},z===null||z===void 0?void 0:z.sessionId);else await(z===null||z===void 0?void 0:z.send(A))}).catch((q)=>this._onerror(Error(`Failed to send response: ${q}`))).finally(()=>{this._requestHandlerAbortControllers.delete(X.id)})}_onprogress(X){let{progressToken:Q,...$}=X.params,Y=Number(Q),W=this._progressHandlers.get(Y);if(!W){this._onerror(Error(`Received a progress notification for an unknown token: ${JSON.stringify(X)}`));return}let J=this._responseHandlers.get(Y),G=this._timeoutInfo.get(Y);if(G&&J&&G.resetTimeoutOnProgress)try{this._resetTimeout(Y)}catch(H){this._responseHandlers.delete(Y),this._progressHandlers.delete(Y),this._cleanupTimeout(Y),J(H);return}W($)}_onresponse(X){let Q=Number(X.id),$=this._requestResolvers.get(Q);if($){if(this._requestResolvers.delete(Q),CX(X))$(X);else{let J=new k(X.error.code,X.error.message,X.error.data);$(J)}return}let Y=this._responseHandlers.get(Q);if(Y===void 0){this._onerror(Error(`Received a response for an unknown message ID: ${JSON.stringify(X)}`));return}this._responseHandlers.delete(Q),this._cleanupTimeout(Q);let W=!1;if(CX(X)&&X.result&&typeof X.result==="object"){let J=X.result;if(J.task&&typeof J.task==="object"){let G=J.task;if(typeof G.taskId==="string")W=!0,this._taskProgressTokens.set(G.taskId,Q)}}if(!W)this._progressHandlers.delete(Q);if(CX(X))Y(X);else{let J=k.fromError(X.error.code,X.error.message,X.error.data);Y(J)}}get transport(){return this._transport}async close(){var X;await((X=this._transport)===null||X===void 0?void 0:X.close())}async*requestStream(X,Q,$){var Y,W,J,G;let{task:H}=$!==null&&$!==void 0?$:{};if(!H){try{yield{type:"result",result:await this.request(X,Q,$)}}catch(z){yield{type:"error",error:z instanceof k?z:new k(x.InternalError,String(z))}}return}let B;try{let z=await this.request(X,x6,$);if(z.task)B=z.task.taskId,yield{type:"taskCreated",task:z.task};else throw new k(x.InternalError,"Task creation did not return a task");while(!0){let K=await this.getTask({taskId:B},$);if(yield{type:"taskStatus",task:K},u1(K.status)){if(K.status==="completed")yield{type:"result",result:await this.getTaskResult({taskId:B},Q,$)};else if(K.status==="failed")yield{type:"error",error:new k(x.InternalError,`Task ${B} failed`)};else if(K.status==="cancelled")yield{type:"error",error:new k(x.InternalError,`Task ${B} was cancelled`)};return}if(K.status==="input_required"){yield{type:"result",result:await this.getTaskResult({taskId:B},Q,$)};return}let V=(J=(Y=K.pollInterval)!==null&&Y!==void 0?Y:(W=this._options)===null||W===void 0?void 0:W.defaultTaskPollInterval)!==null&&J!==void 0?J:1000;await new Promise((L)=>setTimeout(L,V)),(G=$===null||$===void 0?void 0:$.signal)===null||G===void 0||G.throwIfAborted()}}catch(z){yield{type:"error",error:z instanceof k?z:new k(x.InternalError,String(z))}}}request(X,Q,$){let{relatedRequestId:Y,resumptionToken:W,onresumptiontoken:J,task:G,relatedTask:H}=$!==null&&$!==void 0?$:{};return new Promise((B,z)=>{var K,V,L,U,F,q,N;let A=(s)=>{z(s)};if(!this._transport){A(Error("Not connected"));return}if(((K=this._options)===null||K===void 0?void 0:K.enforceStrictCapabilities)===!0)try{if(this.assertCapabilityForMethod(X.method),G)this.assertTaskCapability(X.method)}catch(s){A(s);return}(V=$===null||$===void 0?void 0:$.signal)===null||V===void 0||V.throwIfAborted();let M=this._requestMessageId++,R={...X,jsonrpc:"2.0",id:M};if($===null||$===void 0?void 0:$.onprogress)this._progressHandlers.set(M,$.onprogress),R.params={...X.params,_meta:{...((L=X.params)===null||L===void 0?void 0:L._meta)||{},progressToken:M}};if(G)R.params={...R.params,task:G};if(H)R.params={...R.params,_meta:{...((U=R.params)===null||U===void 0?void 0:U._meta)||{},[K1]:H}};let S=(s)=>{var D0;this._responseHandlers.delete(M),this._progressHandlers.delete(M),this._cleanupTimeout(M),(D0=this._transport)===null||D0===void 0||D0.send({jsonrpc:"2.0",method:"notifications/cancelled",params:{requestId:M,reason:String(s)}},{relatedRequestId:Y,resumptionToken:W,onresumptiontoken:J}).catch((W1)=>this._onerror(Error(`Failed to send cancellation: ${W1}`)));let q0=s instanceof k?s:new k(x.RequestTimeout,String(s));z(q0)};this._responseHandlers.set(M,(s)=>{var D0;if((D0=$===null||$===void 0?void 0:$.signal)===null||D0===void 0?void 0:D0.aborted)return;if(s instanceof Error)return z(s);try{let q0=f1(Q,s.result);if(!q0.success)z(q0.error);else B(q0.data)}catch(q0){z(q0)}}),(F=$===null||$===void 0?void 0:$.signal)===null||F===void 0||F.addEventListener("abort",()=>{var s;S((s=$===null||$===void 0?void 0:$.signal)===null||s===void 0?void 0:s.reason)});let C=(q=$===null||$===void 0?void 0:$.timeout)!==null&&q!==void 0?q:LN,K0=()=>S(k.fromError(x.RequestTimeout,"Request timed out",{timeout:C}));this._setupTimeout(M,C,$===null||$===void 0?void 0:$.maxTotalTimeout,K0,(N=$===null||$===void 0?void 0:$.resetTimeoutOnProgress)!==null&&N!==void 0?N:!1);let U0=H===null||H===void 0?void 0:H.taskId;if(U0){let s=(D0)=>{let q0=this._responseHandlers.get(M);if(q0)q0(D0);else this._onerror(Error(`Response handler missing for side-channeled request ${M}`))};this._requestResolvers.set(M,s),this._enqueueTaskMessage(U0,{type:"request",message:R,timestamp:Date.now()}).catch((D0)=>{this._cleanupTimeout(M),z(D0)})}else this._transport.send(R,{relatedRequestId:Y,resumptionToken:W,onresumptiontoken:J}).catch((s)=>{this._cleanupTimeout(M),z(s)})})}async getTask(X,Q){return this.request({method:"tasks/get",params:X},Q8,Q)}async getTaskResult(X,Q,$){return this.request({method:"tasks/result",params:X},Q,$)}async listTasks(X,Q){return this.request({method:"tasks/list",params:X},W8,Q)}async cancelTask(X,Q){return this.request({method:"tasks/cancel",params:X},L5,Q)}async notification(X,Q){var $,Y,W,J,G;if(!this._transport)throw Error("Not connected");this.assertNotificationCapability(X.method);let H=($=Q===null||Q===void 0?void 0:Q.relatedTask)===null||$===void 0?void 0:$.taskId;if(H){let V={...X,jsonrpc:"2.0",params:{...X.params,_meta:{...((Y=X.params)===null||Y===void 0?void 0:Y._meta)||{},[K1]:Q.relatedTask}}};await this._enqueueTaskMessage(H,{type:"notification",message:V,timestamp:Date.now()});return}if(((J=(W=this._options)===null||W===void 0?void 0:W.debouncedNotificationMethods)!==null&&J!==void 0?J:[]).includes(X.method)&&!X.params&&!(Q===null||Q===void 0?void 0:Q.relatedRequestId)&&!(Q===null||Q===void 0?void 0:Q.relatedTask)){if(this._pendingDebouncedNotifications.has(X.method))return;this._pendingDebouncedNotifications.add(X.method),Promise.resolve().then(()=>{var V,L;if(this._pendingDebouncedNotifications.delete(X.method),!this._transport)return;let U={...X,jsonrpc:"2.0"};if(Q===null||Q===void 0?void 0:Q.relatedTask)U={...U,params:{...U.params,_meta:{...((V=U.params)===null||V===void 0?void 0:V._meta)||{},[K1]:Q.relatedTask}}};(L=this._transport)===null||L===void 0||L.send(U,Q).catch((F)=>this._onerror(F))});return}let K={...X,jsonrpc:"2.0"};if(Q===null||Q===void 0?void 0:Q.relatedTask)K={...K,params:{...K.params,_meta:{...((G=K.params)===null||G===void 0?void 0:G._meta)||{},[K1]:Q.relatedTask}}};await this._transport.send(K,Q)}setRequestHandler(X,Q){let $=r$(X);this.assertRequestHandlerCapability($),this._requestHandlers.set($,(Y,W)=>{let J=o$(X,Y);return Promise.resolve(Q(J,W))})}removeRequestHandler(X){this._requestHandlers.delete(X)}assertCanSetRequestHandler(X){if(this._requestHandlers.has(X))throw Error(`A request handler for ${X} already exists, which would be overridden`)}setNotificationHandler(X,Q){let $=r$(X);this._notificationHandlers.set($,(Y)=>{let W=o$(X,Y);return Promise.resolve(Q(W))})}removeNotificationHandler(X){this._notificationHandlers.delete(X)}_cleanupTaskProgressHandler(X){let Q=this._taskProgressTokens.get(X);if(Q!==void 0)this._progressHandlers.delete(Q),this._taskProgressTokens.delete(X)}async _enqueueTaskMessage(X,Q,$){var Y;if(!this._taskStore||!this._taskMessageQueue)throw Error("Cannot enqueue task message: taskStore and taskMessageQueue are not configured");let W=(Y=this._options)===null||Y===void 0?void 0:Y.maxTaskQueueSize;await this._taskMessageQueue.enqueue(X,Q,$,W)}async _clearTaskQueue(X,Q){if(this._taskMessageQueue){let $=await this._taskMessageQueue.dequeueAll(X,Q);for(let Y of $)if(Y.type==="request"&&Z$(Y.message)){let W=Y.message.id,J=this._requestResolvers.get(W);if(J)J(new k(x.InternalError,"Task cancelled or completed")),this._requestResolvers.delete(W);else this._onerror(Error(`Resolver missing for request ${W} during task ${X} cleanup`))}}}async _waitForTaskUpdate(X,Q){var $,Y,W;let J=(Y=($=this._options)===null||$===void 0?void 0:$.defaultTaskPollInterval)!==null&&Y!==void 0?Y:1000;try{let G=await((W=this._taskStore)===null||W===void 0?void 0:W.getTask(X));if(G===null||G===void 0?void 0:G.pollInterval)J=G.pollInterval}catch(G){}return new Promise((G,H)=>{if(Q.aborted){H(new k(x.InvalidRequest,"Request cancelled"));return}let B=setTimeout(G,J);Q.addEventListener("abort",()=>{clearTimeout(B),H(new k(x.InvalidRequest,"Request cancelled"))},{once:!0})})}requestTaskStore(X,Q){let $=this._taskStore;if(!$)throw Error("No task store configured");return{createTask:async(Y)=>{if(!X)throw Error("No request provided");return await $.createTask(Y,X.id,{method:X.method,params:X.params},Q)},getTask:async(Y)=>{let W=await $.getTask(Y,Q);if(!W)throw new k(x.InvalidParams,"Failed to retrieve task: Task not found");return W},storeTaskResult:async(Y,W,J)=>{await $.storeTaskResult(Y,W,J,Q);let G=await $.getTask(Y,Q);if(G){let H=xX.parse({method:"notifications/tasks/status",params:G});if(await this.notification(H),u1(G.status))this._cleanupTaskProgressHandler(Y)}},getTaskResult:(Y)=>{return $.getTaskResult(Y,Q)},updateTaskStatus:async(Y,W,J)=>{let G=await $.getTask(Y,Q);if(!G)throw new k(x.InvalidParams,`Task "${Y}" not found - it may have been cleaned up`);if(u1(G.status))throw new k(x.InvalidParams,`Cannot update task "${Y}" from terminal status "${G.status}" to "${W}". Terminal states (completed, failed, cancelled) cannot transition to other states.`);await $.updateTaskStatus(Y,W,J,Q);let H=await $.getTask(Y,Q);if(H){let B=xX.parse({method:"notifications/tasks/status",params:H});if(await this.notification(B),u1(H.status))this._cleanupTaskProgressHandler(Y)}},listTasks:(Y)=>{return $.listTasks(Y,Q)}}}}function XG(X){return X!==null&&typeof X==="object"&&!Array.isArray(X)}function QG(X,Q){let $={...X};for(let Y in Q){let W=Y,J=Q[W];if(J===void 0)continue;let G=$[W];if(XG(G)&&XG(J))$[W]={...G,...J};else $[W]=J}return $}var fz=K7(cY(),1),hz=K7(gz(),1);function ME(){let X=new fz.Ajv({strict:!1,validateFormats:!0,validateSchema:!1,allErrors:!0});return hz.default(X),X}class eY{constructor(X){this._ajv=X!==null&&X!==void 0?X:ME()}getValidator(X){var Q;let $="$id"in X&&typeof X.$id==="string"?(Q=this._ajv.getSchema(X.$id))!==null&&Q!==void 0?Q:this._ajv.compile(X):this._ajv.compile(X);return(Y)=>{if($(Y))return{valid:!0,data:Y,errorMessage:void 0};else return{valid:!1,data:void 0,errorMessage:this._ajv.errorsText($.errors)}}}}class X7{constructor(X){this._server=X}requestStream(X,Q,$){return this._server.requestStream(X,Q,$)}async getTask(X,Q){return this._server.getTask({taskId:X},Q)}async getTaskResult(X,Q,$){return this._server.getTaskResult({taskId:X},Q,$)}async listTasks(X,Q){return this._server.listTasks(X?{cursor:X}:void 0,Q)}async cancelTask(X,Q){return this._server.cancelTask({taskId:X},Q)}}function uz(X,Q,$){var Y;if(!X)throw Error(`${$} does not support task creation (required for ${Q})`);switch(Q){case"tools/call":if(!((Y=X.tools)===null||Y===void 0?void 0:Y.call))throw Error(`${$} does not support task creation for tools/call (required for ${Q})`);break;default:break}}function lz(X,Q,$){var Y,W;if(!X)throw Error(`${$} does not support task creation (required for ${Q})`);switch(Q){case"sampling/createMessage":if(!((Y=X.sampling)===null||Y===void 0?void 0:Y.createMessage))throw Error(`${$} does not support task creation for sampling/createMessage (required for ${Q})`);break;case"elicitation/create":if(!((W=X.elicitation)===null||W===void 0?void 0:W.create))throw Error(`${$} does not support task creation for elicitation/create (required for ${Q})`);break;default:break}}class Q7 extends t${constructor(X,Q){var $,Y;super(Q);if(this._serverInfo=X,this._loggingLevels=new Map,this.LOG_LEVEL_SEVERITY=new Map(yX.options.map((W,J)=>[W,J])),this.isMessageIgnored=(W,J)=>{let G=this._loggingLevels.get(J);return G?this.LOG_LEVEL_SEVERITY.get(W)<this.LOG_LEVEL_SEVERITY.get(G):!1},this._capabilities=($=Q===null||Q===void 0?void 0:Q.capabilities)!==null&&$!==void 0?$:{},this._instructions=Q===null||Q===void 0?void 0:Q.instructions,this._jsonSchemaValidator=(Y=Q===null||Q===void 0?void 0:Q.jsonSchemaValidator)!==null&&Y!==void 0?Y:new eY,this.setRequestHandler(C$,(W)=>this._oninitialize(W)),this.setNotificationHandler(k$,()=>{var W;return(W=this.oninitialized)===null||W===void 0?void 0:W.call(this)}),this._capabilities.logging)this.setRequestHandler(f$,async(W,J)=>{var G;let H=J.sessionId||((G=J.requestInfo)===null||G===void 0?void 0:G.headers["mcp-session-id"])||void 0,{level:B}=W.params,z=yX.safeParse(B);if(z.success)this._loggingLevels.set(H,z.data);return{}})}get experimental(){if(!this._experimental)this._experimental={tasks:new X7(this)};return this._experimental}registerCapabilities(X){if(this.transport)throw Error("Cannot register capabilities after connecting to transport");this._capabilities=QG(this._capabilities,X)}setRequestHandler(X,Q){var $,Y,W;let J=h1(X),G=J===null||J===void 0?void 0:J.method;if(!G)throw Error("Schema is missing a method literal");let H;if(m0(G)){let z=G,K=($=z._zod)===null||$===void 0?void 0:$.def;H=(Y=K===null||K===void 0?void 0:K.value)!==null&&Y!==void 0?Y:z.value}else{let z=G,K=z._def;H=(W=K===null||K===void 0?void 0:K.value)!==null&&W!==void 0?W:z.value}if(typeof H!=="string")throw Error("Schema method literal must be a string");if(H==="tools/call"){let z=async(K,V)=>{let L=f1(g6,K);if(!L.success){let N=L.error instanceof Error?L.error.message:String(L.error);throw new k(x.InvalidParams,`Invalid tools/call request: ${N}`)}let{params:U}=L.data,F=await Promise.resolve(Q(K,V));if(U.task){let N=f1(x6,F);if(!N.success){let A=N.error instanceof Error?N.error.message:String(N.error);throw new k(x.InvalidParams,`Invalid task creation result: ${A}`)}return N.data}let q=f1(U8,F);if(!q.success){let N=q.error instanceof Error?q.error.message:String(q.error);throw new k(x.InvalidParams,`Invalid tools/call result: ${N}`)}return q.data};return super.setRequestHandler(X,z)}return super.setRequestHandler(X,Q)}assertCapabilityForMethod(X){var Q,$,Y;switch(X){case"sampling/createMessage":if(!((Q=this._clientCapabilities)===null||Q===void 0?void 0:Q.sampling))throw Error(`Client does not support sampling (required for ${X})`);break;case"elicitation/create":if(!(($=this._clientCapabilities)===null||$===void 0?void 0:$.elicitation))throw Error(`Client does not support elicitation (required for ${X})`);break;case"roots/list":if(!((Y=this._clientCapabilities)===null||Y===void 0?void 0:Y.roots))throw Error(`Client does not support listing roots (required for ${X})`);break;case"ping":break}}assertNotificationCapability(X){var Q,$;switch(X){case"notifications/message":if(!this._capabilities.logging)throw Error(`Server does not support logging (required for ${X})`);break;case"notifications/resources/updated":case"notifications/resources/list_changed":if(!this._capabilities.resources)throw Error(`Server does not support notifying about resources (required for ${X})`);break;case"notifications/tools/list_changed":if(!this._capabilities.tools)throw Error(`Server does not support notifying of tool list changes (required for ${X})`);break;case"notifications/prompts/list_changed":if(!this._capabilities.prompts)throw Error(`Server does not support notifying of prompt list changes (required for ${X})`);break;case"notifications/elicitation/complete":if(!(($=(Q=this._clientCapabilities)===null||Q===void 0?void 0:Q.elicitation)===null||$===void 0?void 0:$.url))throw Error(`Client does not support URL elicitation (required for ${X})`);break;case"notifications/cancelled":break;case"notifications/progress":break}}assertRequestHandlerCapability(X){if(!this._capabilities)return;switch(X){case"completion/complete":if(!this._capabilities.completions)throw Error(`Server does not support completions (required for ${X})`);break;case"logging/setLevel":if(!this._capabilities.logging)throw Error(`Server does not support logging (required for ${X})`);break;case"prompts/get":case"prompts/list":if(!this._capabilities.prompts)throw Error(`Server does not support prompts (required for ${X})`);break;case"resources/list":case"resources/templates/list":case"resources/read":if(!this._capabilities.resources)throw Error(`Server does not support resources (required for ${X})`);break;case"tools/call":case"tools/list":if(!this._capabilities.tools)throw Error(`Server does not support tools (required for ${X})`);break;case"tasks/get":case"tasks/list":case"tasks/result":case"tasks/cancel":if(!this._capabilities.tasks)throw Error(`Server does not support tasks capability (required for ${X})`);break;case"ping":case"initialize":break}}assertTaskCapability(X){var Q,$;lz(($=(Q=this._clientCapabilities)===null||Q===void 0?void 0:Q.tasks)===null||$===void 0?void 0:$.requests,X,"Client")}assertTaskHandlerCapability(X){var Q;if(!this._capabilities)return;uz((Q=this._capabilities.tasks)===null||Q===void 0?void 0:Q.requests,X,"Server")}async _oninitialize(X){let Q=X.params.protocolVersion;return this._clientCapabilities=X.params.capabilities,this._clientVersion=X.params.clientInfo,{protocolVersion:$5.includes(Q)?Q:P$,capabilities:this.getCapabilities(),serverInfo:this._serverInfo,...this._instructions&&{instructions:this._instructions}}}getClientCapabilities(){return this._clientCapabilities}getClientVersion(){return this._clientVersion}getCapabilities(){return this._capabilities}async ping(){return this.request({method:"ping"},t4)}async createMessage(X,Q){var $,Y;if(X.tools||X.toolChoice){if(!((Y=($=this._clientCapabilities)===null||$===void 0?void 0:$.sampling)===null||Y===void 0?void 0:Y.tools))throw Error("Client does not support sampling tools capability.")}if(X.messages.length>0){let W=X.messages[X.messages.length-1],J=Array.isArray(W.content)?W.content:[W.content],G=J.some((K)=>K.type==="tool_result"),H=X.messages.length>1?X.messages[X.messages.length-2]:void 0,B=H?Array.isArray(H.content)?H.content:[H.content]:[],z=B.some((K)=>K.type==="tool_use");if(G){if(J.some((K)=>K.type!=="tool_result"))throw Error("The last message must contain only tool_result content if any is present");if(!z)throw Error("tool_result blocks are not matching any tool_use from the previous message")}if(z){let K=new Set(B.filter((L)=>L.type==="tool_use").map((L)=>L.id)),V=new Set(J.filter((L)=>L.type==="tool_result").map((L)=>L.toolUseId));if(K.size!==V.size||![...K].every((L)=>V.has(L)))throw Error("ids of tool_result blocks and tool_use blocks from previous message do not match")}}if(X.tools)return this.request({method:"sampling/createMessage",params:X},u$,Q);return this.request({method:"sampling/createMessage",params:X},h$,Q)}async elicitInput(X,Q){var $,Y,W,J,G;switch(($=X.mode)!==null&&$!==void 0?$:"form"){case"url":{if(!((W=(Y=this._clientCapabilities)===null||Y===void 0?void 0:Y.elicitation)===null||W===void 0?void 0:W.url))throw Error("Client does not support url elicitation.");let B=X;return this.request({method:"elicitation/create",params:B},V8,Q)}case"form":{if(!((G=(J=this._clientCapabilities)===null||J===void 0?void 0:J.elicitation)===null||G===void 0?void 0:G.form))throw Error("Client does not support form elicitation.");let B=X.mode==="form"?X:{...X,mode:"form"},z=await this.request({method:"elicitation/create",params:B},V8,Q);if(z.action==="accept"&&z.content&&B.requestedSchema)try{let V=this._jsonSchemaValidator.getValidator(B.requestedSchema)(z.content);if(!V.valid)throw new k(x.InvalidParams,`Elicitation response content does not match requested schema: ${V.errorMessage}`)}catch(K){if(K instanceof k)throw K;throw new k(x.InternalError,`Error validating elicitation response: ${K instanceof Error?K.message:String(K)}`)}return z}}}createElicitationCompletionNotifier(X,Q){var $,Y;if(!((Y=($=this._clientCapabilities)===null||$===void 0?void 0:$.elicitation)===null||Y===void 0?void 0:Y.url))throw Error("Client does not support URL elicitation (required for notifications/elicitation/complete)");return()=>this.notification({method:"notifications/elicitation/complete",params:{elicitationId:X}},Q)}async listRoots(X,Q){return this.request({method:"roots/list",params:X},l$,Q)}async sendLoggingMessage(X,Q){if(this._capabilities.logging){if(!this.isMessageIgnored(X.level,Q))return this.notification({method:"notifications/message",params:X})}}async sendResourceUpdated(X){return this.notification({method:"notifications/resources/updated",params:X})}async sendResourceListChanged(){return this.notification({method:"notifications/resources/list_changed"})}async sendToolListChanged(){return this.notification({method:"notifications/tools/list_changed"})}async sendPromptListChanged(){return this.notification({method:"notifications/prompts/list_changed"})}}var cz=Symbol.for("mcp.completable");function pz(X){return!!X&&typeof X==="object"&&cz in X}function dz(X){let Q=X[cz];return Q===null||Q===void 0?void 0:Q.complete}var mz;(function(X){X.Completable="McpCompletable"})(mz||(mz={}));var jE=/^[A-Za-z0-9._-]{1,128}$/;function RE(X){let Q=[];if(X.length===0)return{isValid:!1,warnings:["Tool name cannot be empty"]};if(X.length>128)return{isValid:!1,warnings:[`Tool name exceeds maximum length of 128 characters (current: ${X.length})`]};if(X.includes(" "))Q.push("Tool name contains spaces, which may cause parsing issues");if(X.includes(","))Q.push("Tool name contains commas, which may cause parsing issues");if(X.startsWith("-")||X.endsWith("-"))Q.push("Tool name starts or ends with a dash, which may cause parsing issues in some contexts");if(X.startsWith(".")||X.endsWith("."))Q.push("Tool name starts or ends with a dot, which may cause parsing issues in some contexts");if(!jE.test(X)){let $=X.split("").filter((Y)=>!/[A-Za-z0-9._-]/.test(Y)).filter((Y,W,J)=>J.indexOf(Y)===W);return Q.push(`Tool name contains invalid characters: ${$.map((Y)=>`"${Y}"`).join(", ")}`,"Allowed characters are: A-Z, a-z, 0-9, underscore (_), dash (-), and dot (.)"),{isValid:!1,warnings:Q}}return{isValid:!0,warnings:Q}}function EE(X,Q){if(Q.length>0){console.warn(`Tool name validation warning for "${X}":`);for(let $ of Q)console.warn(`  - ${$}`);console.warn("Tool registration will proceed, but this may cause compatibility issues."),console.warn("Consider updating the tool name to conform to the MCP tool naming standard."),console.warn("See SEP: Specify Format for Tool Names (https://github.com/modelcontextprotocol/modelcontextprotocol/issues/986) for more details.")}}function $7(X){let Q=RE(X);return EE(X,Q.warnings),Q.isValid}class Y7{constructor(X){this._mcpServer=X}registerToolTask(X,Q,$){let Y={taskSupport:"required",...Q.execution};if(Y.taskSupport==="forbidden")throw Error(`Cannot register task-based tool '${X}' with taskSupport 'forbidden'. Use registerTool() instead.`);return this._mcpServer._createRegisteredTool(X,Q.title,Q.description,Q.inputSchema,Q.outputSchema,Q.annotations,Y,Q._meta,$)}}class J7{constructor(X,Q){this._registeredResources={},this._registeredResourceTemplates={},this._registeredTools={},this._registeredPrompts={},this._toolHandlersInitialized=!1,this._completionHandlerInitialized=!1,this._resourceHandlersInitialized=!1,this._promptHandlersInitialized=!1,this.server=new Q7(X,Q)}get experimental(){if(!this._experimental)this._experimental={tasks:new Y7(this)};return this._experimental}async connect(X){return await this.server.connect(X)}async close(){await this.server.close()}setToolRequestHandlers(){if(this._toolHandlersInitialized)return;this.server.assertCanSetRequestHandler(r1(K8)),this.server.assertCanSetRequestHandler(r1(g6)),this.server.registerCapabilities({tools:{listChanged:!0}}),this.server.setRequestHandler(K8,()=>({tools:Object.entries(this._registeredTools).filter(([,X])=>X.enabled).map(([X,Q])=>{let $={name:X,title:Q.title,description:Q.description,inputSchema:(()=>{let Y=T6(Q.inputSchema);return Y?n$(Y,{strictUnions:!0,pipeStrategy:"input"}):IE})(),annotations:Q.annotations,execution:Q.execution,_meta:Q._meta};if(Q.outputSchema){let Y=T6(Q.outputSchema);if(Y)$.outputSchema=n$(Y,{strictUnions:!0,pipeStrategy:"output"})}return $})})),this.server.setRequestHandler(g6,async(X,Q)=>{var $;try{let Y=this._registeredTools[X.params.name];if(!Y)throw new k(x.InvalidParams,`Tool ${X.params.name} not found`);if(!Y.enabled)throw new k(x.InvalidParams,`Tool ${X.params.name} disabled`);let W=!!X.params.task,J=($=Y.execution)===null||$===void 0?void 0:$.taskSupport,G="createTask"in Y.handler;if((J==="required"||J==="optional")&&!G)throw new k(x.InternalError,`Tool ${X.params.name} has taskSupport '${J}' but was not registered with registerToolTask`);if(J==="required"&&!W)throw new k(x.MethodNotFound,`Tool ${X.params.name} requires task augmentation (taskSupport: 'required')`);if(J==="optional"&&!W&&G)return await this.handleAutomaticTaskPolling(Y,X,Q);let H=await this.validateToolInput(Y,X.params.arguments,X.params.name),B=await this.executeToolHandler(Y,H,Q);if(W)return B;return await this.validateToolOutput(Y,B,X.params.name),B}catch(Y){if(Y instanceof k){if(Y.code===x.UrlElicitationRequired)throw Y}return this.createToolError(Y instanceof Error?Y.message:String(Y))}}),this._toolHandlersInitialized=!0}createToolError(X){return{content:[{type:"text",text:X}],isError:!0}}async validateToolInput(X,Q,$){if(!X.inputSchema)return;let Y=T6(X.inputSchema),W=Y!==null&&Y!==void 0?Y:X.inputSchema,J=await m4(W,Q);if(!J.success){let G="error"in J?J.error:"Unknown error",H=c4(G);throw new k(x.InvalidParams,`Input validation error: Invalid arguments for tool ${$}: ${H}`)}return J.data}async validateToolOutput(X,Q,$){if(!X.outputSchema)return;if(!("content"in Q))return;if(Q.isError)return;if(!Q.structuredContent)throw new k(x.InvalidParams,`Output validation error: Tool ${$} has an output schema but no structured content was provided`);let Y=T6(X.outputSchema),W=await m4(Y,Q.structuredContent);if(!W.success){let J="error"in W?W.error:"Unknown error",G=c4(J);throw new k(x.InvalidParams,`Output validation error: Invalid structured content for tool ${$}: ${G}`)}}async executeToolHandler(X,Q,$){let Y=X.handler;if("createTask"in Y){if(!$.taskStore)throw Error("No task store provided.");let J={...$,taskStore:$.taskStore};if(X.inputSchema)return await Promise.resolve(Y.createTask(Q,J));else return await Promise.resolve(Y.createTask(J))}if(X.inputSchema)return await Promise.resolve(Y(Q,$));else return await Promise.resolve(Y($))}async handleAutomaticTaskPolling(X,Q,$){var Y;if(!$.taskStore)throw Error("No task store provided for task-capable tool.");let W=await this.validateToolInput(X,Q.params.arguments,Q.params.name),J=X.handler,G={...$,taskStore:$.taskStore},H=W?await Promise.resolve(J.createTask(W,G)):await Promise.resolve(J.createTask(G)),B=H.task.taskId,z=H.task,K=(Y=z.pollInterval)!==null&&Y!==void 0?Y:5000;while(z.status!=="completed"&&z.status!=="failed"&&z.status!=="cancelled"){await new Promise((L)=>setTimeout(L,K));let V=await $.taskStore.getTask(B);if(!V)throw new k(x.InternalError,`Task ${B} not found during polling`);z=V}return await $.taskStore.getTaskResult(B)}setCompletionRequestHandler(){if(this._completionHandlerInitialized)return;this.server.assertCanSetRequestHandler(r1(L8)),this.server.registerCapabilities({completions:{}}),this.server.setRequestHandler(L8,async(X)=>{switch(X.params.ref.type){case"ref/prompt":return A5(X),this.handlePromptCompletion(X,X.params.ref);case"ref/resource":return w5(X),this.handleResourceCompletion(X,X.params.ref);default:throw new k(x.InvalidParams,`Invalid completion reference: ${X.params.ref}`)}}),this._completionHandlerInitialized=!0}async handlePromptCompletion(X,Q){let $=this._registeredPrompts[Q.name];if(!$)throw new k(x.InvalidParams,`Prompt ${Q.name} not found`);if(!$.enabled)throw new k(x.InvalidParams,`Prompt ${Q.name} disabled`);if(!$.argsSchema)return H4;let Y=h1($.argsSchema),W=Y===null||Y===void 0?void 0:Y[X.params.argument.name];if(!pz(W))return H4;let J=dz(W);if(!J)return H4;let G=await J(X.params.argument.value,X.params.context);return nz(G)}async handleResourceCompletion(X,Q){let $=Object.values(this._registeredResourceTemplates).find((J)=>J.resourceTemplate.uriTemplate.toString()===Q.uri);if(!$){if(this._registeredResources[Q.uri])return H4;throw new k(x.InvalidParams,`Resource template ${X.params.ref.uri} not found`)}let Y=$.resourceTemplate.completeCallback(X.params.argument.name);if(!Y)return H4;let W=await Y(X.params.argument.value,X.params.context);return nz(W)}setResourceRequestHandlers(){if(this._resourceHandlersInitialized)return;this.server.assertCanSetRequestHandler(r1(J8)),this.server.assertCanSetRequestHandler(r1(G8)),this.server.assertCanSetRequestHandler(r1(H8)),this.server.registerCapabilities({resources:{listChanged:!0}}),this.server.setRequestHandler(J8,async(X,Q)=>{let $=Object.entries(this._registeredResources).filter(([W,J])=>J.enabled).map(([W,J])=>({uri:W,name:J.name,...J.metadata})),Y=[];for(let W of Object.values(this._registeredResourceTemplates)){if(!W.resourceTemplate.listCallback)continue;let J=await W.resourceTemplate.listCallback(Q);for(let G of J.resources)Y.push({...W.metadata,...G})}return{resources:[...$,...Y]}}),this.server.setRequestHandler(G8,async()=>{return{resourceTemplates:Object.entries(this._registeredResourceTemplates).map(([Q,$])=>({name:Q,uriTemplate:$.resourceTemplate.uriTemplate.toString(),...$.metadata}))}}),this.server.setRequestHandler(H8,async(X,Q)=>{let $=new URL(X.params.uri),Y=this._registeredResources[$.toString()];if(Y){if(!Y.enabled)throw new k(x.InvalidParams,`Resource ${$} disabled`);return Y.readCallback($,Q)}for(let W of Object.values(this._registeredResourceTemplates)){let J=W.resourceTemplate.uriTemplate.match($.toString());if(J)return W.readCallback($,J,Q)}throw new k(x.InvalidParams,`Resource ${$} not found`)}),this.setCompletionRequestHandler(),this._resourceHandlersInitialized=!0}setPromptRequestHandlers(){if(this._promptHandlersInitialized)return;this.server.assertCanSetRequestHandler(r1(B8)),this.server.assertCanSetRequestHandler(r1(z8)),this.server.registerCapabilities({prompts:{listChanged:!0}}),this.server.setRequestHandler(B8,()=>({prompts:Object.entries(this._registeredPrompts).filter(([,X])=>X.enabled).map(([X,Q])=>{return{name:X,title:Q.title,description:Q.description,arguments:Q.argsSchema?PE(Q.argsSchema):void 0}})})),this.server.setRequestHandler(z8,async(X,Q)=>{let $=this._registeredPrompts[X.params.name];if(!$)throw new k(x.InvalidParams,`Prompt ${X.params.name} not found`);if(!$.enabled)throw new k(x.InvalidParams,`Prompt ${X.params.name} disabled`);if($.argsSchema){let Y=T6($.argsSchema),W=await m4(Y,X.params.arguments);if(!W.success){let H="error"in W?W.error:"Unknown error",B=c4(H);throw new k(x.InvalidParams,`Invalid arguments for prompt ${X.params.name}: ${B}`)}let J=W.data,G=$.callback;return await Promise.resolve(G(J,Q))}else{let Y=$.callback;return await Promise.resolve(Y(Q))}}),this.setCompletionRequestHandler(),this._promptHandlersInitialized=!0}resource(X,Q,...$){let Y;if(typeof $[0]==="object")Y=$.shift();let W=$[0];if(typeof Q==="string"){if(this._registeredResources[Q])throw Error(`Resource ${Q} is already registered`);let J=this._createRegisteredResource(X,void 0,Q,Y,W);return this.setResourceRequestHandlers(),this.sendResourceListChanged(),J}else{if(this._registeredResourceTemplates[X])throw Error(`Resource template ${X} is already registered`);let J=this._createRegisteredResourceTemplate(X,void 0,Q,Y,W);return this.setResourceRequestHandlers(),this.sendResourceListChanged(),J}}registerResource(X,Q,$,Y){if(typeof Q==="string"){if(this._registeredResources[Q])throw Error(`Resource ${Q} is already registered`);let W=this._createRegisteredResource(X,$.title,Q,$,Y);return this.setResourceRequestHandlers(),this.sendResourceListChanged(),W}else{if(this._registeredResourceTemplates[X])throw Error(`Resource template ${X} is already registered`);let W=this._createRegisteredResourceTemplate(X,$.title,Q,$,Y);return this.setResourceRequestHandlers(),this.sendResourceListChanged(),W}}_createRegisteredResource(X,Q,$,Y,W){let J={name:X,title:Q,metadata:Y,readCallback:W,enabled:!0,disable:()=>J.update({enabled:!1}),enable:()=>J.update({enabled:!0}),remove:()=>J.update({uri:null}),update:(G)=>{if(typeof G.uri<"u"&&G.uri!==$){if(delete this._registeredResources[$],G.uri)this._registeredResources[G.uri]=J}if(typeof G.name<"u")J.name=G.name;if(typeof G.title<"u")J.title=G.title;if(typeof G.metadata<"u")J.metadata=G.metadata;if(typeof G.callback<"u")J.readCallback=G.callback;if(typeof G.enabled<"u")J.enabled=G.enabled;this.sendResourceListChanged()}};return this._registeredResources[$]=J,J}_createRegisteredResourceTemplate(X,Q,$,Y,W){let J={resourceTemplate:$,title:Q,metadata:Y,readCallback:W,enabled:!0,disable:()=>J.update({enabled:!1}),enable:()=>J.update({enabled:!0}),remove:()=>J.update({name:null}),update:(G)=>{if(typeof G.name<"u"&&G.name!==X){if(delete this._registeredResourceTemplates[X],G.name)this._registeredResourceTemplates[G.name]=J}if(typeof G.title<"u")J.title=G.title;if(typeof G.template<"u")J.resourceTemplate=G.template;if(typeof G.metadata<"u")J.metadata=G.metadata;if(typeof G.callback<"u")J.readCallback=G.callback;if(typeof G.enabled<"u")J.enabled=G.enabled;this.sendResourceListChanged()}};return this._registeredResourceTemplates[X]=J,J}_createRegisteredPrompt(X,Q,$,Y,W){let J={title:Q,description:$,argsSchema:Y===void 0?void 0:v6(Y),callback:W,enabled:!0,disable:()=>J.update({enabled:!1}),enable:()=>J.update({enabled:!0}),remove:()=>J.update({name:null}),update:(G)=>{if(typeof G.name<"u"&&G.name!==X){if(delete this._registeredPrompts[X],G.name)this._registeredPrompts[G.name]=J}if(typeof G.title<"u")J.title=G.title;if(typeof G.description<"u")J.description=G.description;if(typeof G.argsSchema<"u")J.argsSchema=v6(G.argsSchema);if(typeof G.callback<"u")J.callback=G.callback;if(typeof G.enabled<"u")J.enabled=G.enabled;this.sendPromptListChanged()}};return this._registeredPrompts[X]=J,J}_createRegisteredTool(X,Q,$,Y,W,J,G,H,B){$7(X);let z={title:Q,description:$,inputSchema:iz(Y),outputSchema:iz(W),annotations:J,execution:G,_meta:H,handler:B,enabled:!0,disable:()=>z.update({enabled:!1}),enable:()=>z.update({enabled:!0}),remove:()=>z.update({name:null}),update:(K)=>{if(typeof K.name<"u"&&K.name!==X){if(typeof K.name==="string")$7(K.name);if(delete this._registeredTools[X],K.name)this._registeredTools[K.name]=z}if(typeof K.title<"u")z.title=K.title;if(typeof K.description<"u")z.description=K.description;if(typeof K.paramsSchema<"u")z.inputSchema=v6(K.paramsSchema);if(typeof K.callback<"u")z.handler=K.callback;if(typeof K.annotations<"u")z.annotations=K.annotations;if(typeof K._meta<"u")z._meta=K._meta;if(typeof K.enabled<"u")z.enabled=K.enabled;this.sendToolListChanged()}};return this._registeredTools[X]=z,this.setToolRequestHandlers(),this.sendToolListChanged(),z}tool(X,...Q){if(this._registeredTools[X])throw Error(`Tool ${X} is already registered`);let $,Y,W,J;if(typeof Q[0]==="string")$=Q.shift();if(Q.length>1){let H=Q[0];if(W7(H)){if(Y=Q.shift(),Q.length>1&&typeof Q[0]==="object"&&Q[0]!==null&&!W7(Q[0]))J=Q.shift()}else if(typeof H==="object"&&H!==null)J=Q.shift()}let G=Q[0];return this._createRegisteredTool(X,void 0,$,Y,W,J,{taskSupport:"forbidden"},void 0,G)}registerTool(X,Q,$){if(this._registeredTools[X])throw Error(`Tool ${X} is already registered`);let{title:Y,description:W,inputSchema:J,outputSchema:G,annotations:H,_meta:B}=Q;return this._createRegisteredTool(X,Y,W,J,G,H,{taskSupport:"forbidden"},B,$)}prompt(X,...Q){if(this._registeredPrompts[X])throw Error(`Prompt ${X} is already registered`);let $;if(typeof Q[0]==="string")$=Q.shift();let Y;if(Q.length>1)Y=Q.shift();let W=Q[0],J=this._createRegisteredPrompt(X,void 0,$,Y,W);return this.setPromptRequestHandlers(),this.sendPromptListChanged(),J}registerPrompt(X,Q,$){if(this._registeredPrompts[X])throw Error(`Prompt ${X} is already registered`);let{title:Y,description:W,argsSchema:J}=Q,G=this._createRegisteredPrompt(X,Y,W,J,$);return this.setPromptRequestHandlers(),this.sendPromptListChanged(),G}isConnected(){return this.server.transport!==void 0}async sendLoggingMessage(X,Q){return this.server.sendLoggingMessage(X,Q)}sendResourceListChanged(){if(this.isConnected())this.server.sendResourceListChanged()}sendToolListChanged(){if(this.isConnected())this.server.sendToolListChanged()}sendPromptListChanged(){if(this.isConnected())this.server.sendPromptListChanged()}}var IE={type:"object",properties:{}};function rz(X){return X!==null&&typeof X==="object"&&"parse"in X&&typeof X.parse==="function"&&"safeParse"in X&&typeof X.safeParse==="function"}function bE(X){return"_def"in X||"_zod"in X||rz(X)}function W7(X){if(typeof X!=="object"||X===null)return!1;if(bE(X))return!1;if(Object.keys(X).length===0)return!0;return Object.values(X).some(rz)}function iz(X){if(!X)return;if(W7(X))return v6(X);return X}function PE(X){let Q=h1(X);if(!Q)return[];return Object.entries(Q).map(([$,Y])=>{let W=TJ(Y),J=_J(Y);return{name:$,description:W,required:!J}})}function r1(X){let Q=h1(X),$=Q===null||Q===void 0?void 0:Q.method;if(!$)throw Error("Schema is missing a method literal");let Y=p4($);if(typeof Y==="string")return Y;throw Error("Schema method literal must be a string")}function nz(X){return{completion:{values:X.slice(0,100),total:X.length,hasMore:X.length>100}}}var H4={completion:{values:[],hasMore:!1}};function SE(X,Q,$,Y){return{name:X,description:Q,inputSchema:$,handler:Y}}function ZE(X){let Q=new J7({name:X.name,version:X.version??"1.0.0"},{capabilities:{tools:X.tools?{}:void 0}});if(X.tools)X.tools.forEach(($)=>{Q.tool($.name,$.description,$.inputSchema,$.handler)});return{type:"sdk",name:X.name,instance:Q}}function o_({prompt:X,options:Q}){let{systemPrompt:$,settingSources:Y,sandbox:W,...J}=Q??{},G,H;if($===void 0)G="";else if(typeof $==="string")G=$;else if($.type==="preset")H=$.append;let B=J.pathToClaudeCodeExecutable;if(!B){let q6=(0,url__WEBPACK_IMPORTED_MODULE_1__.fileURLToPath)(import.meta.url),F6=(0,path__WEBPACK_IMPORTED_MODULE_0__.join)(q6,"..");B=(0,path__WEBPACK_IMPORTED_MODULE_0__.join)(F6,"cli.js")}process.env.CLAUDE_AGENT_SDK_VERSION="0.2.22";let{abortController:z=N6(),additionalDirectories:K=[],agent:V,agents:L,allowedTools:U=[],betas:F,canUseTool:q,continue:N,cwd:A,disallowedTools:M=[],tools:R,env:S,executable:C=j6()?"bun":"node",executableArgs:K0=[],extraArgs:U0={},fallbackModel:s,enableFileCheckpointing:D0,forkSession:q0,hooks:W1,includePartialMessages:P1,persistSession:U6,maxThinkingTokens:d,maxTurns:Q9,maxBudgetUsd:o6,mcpServers:V6,model:t6,outputFormat:a6,permissionMode:B4="default",allowDangerouslySkipPermissions:S0=!1,permissionPromptToolName:S1,plugins:s6,resume:tz,resumeSessionAt:az,stderr:sz,strictMcpConfig:ez}=J,G7=a6?.type==="json_schema"?a6.schema:void 0,L6=S;if(!L6)L6={...process.env};if(!L6.CLAUDE_CODE_ENTRYPOINT)L6.CLAUDE_CODE_ENTRYPOINT="sdk-ts";if(D0)L6.CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING="true";if(!B)throw Error("pathToClaudeCodeExecutable is required");let $9={},H7=new Map;if(V6)for(let[q6,F6]of Object.entries(V6))if(F6.type==="sdk"&&"instance"in F6)H7.set(q6,F6.instance),$9[q6]={type:"sdk",name:q6};else $9[q6]=F6;let XK=typeof X==="string",B7=new XX({abortController:z,additionalDirectories:K,agent:V,betas:F,cwd:A,executable:C,executableArgs:K0,extraArgs:U0,pathToClaudeCodeExecutable:B,env:L6,forkSession:q0,stderr:sz,maxThinkingTokens:d,maxTurns:Q9,maxBudgetUsd:o6,model:t6,fallbackModel:s,jsonSchema:G7,permissionMode:B4,allowDangerouslySkipPermissions:S0,permissionPromptToolName:S1,continueConversation:N,resume:tz,resumeSessionAt:az,settingSources:Y??[],allowedTools:U,disallowedTools:M,tools:R,mcpServers:$9,strictMcpConfig:ez,canUseTool:!!q,hooks:!!W1,includePartialMessages:P1,persistSession:U6,plugins:s6,sandbox:W,spawnClaudeCodeProcess:J.spawnClaudeCodeProcess}),z7=new $X(B7,XK,q,W1,z,H7,G7,{systemPrompt:G,appendSystemPrompt:H,agents:L});if(typeof X==="string")B7.write(Z0({type:"user",session_id:"",message:{role:"user",content:[{type:"text",text:X}]},parent_tool_use_id:null})+`
`);else z7.streamInput(X);return z7}function t_(X){return V9(X)}function a_(X,Q){return KW(X,Q)}async function s_(X,Q){let Y=[];try{const $=V7(Y,V9(Q),1);await $.send(X);for await(let B of $.stream())if(B.type==="result")return B;throw Error("Session ended without result message")}catch(W){var J=W,G=1}finally{var H=L7(Y,J,G);H&&await H}}


/***/ }),

/***/ 37623:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  E: () => (/* binding */ dist_src_Octokit)
});

;// CONCATENATED MODULE: ./node_modules/.pnpm/universal-user-agent@7.0.3/node_modules/universal-user-agent/index.js
function getUserAgent() {
  if (typeof navigator === "object" && "userAgent" in navigator) {
    return navigator.userAgent;
  }

  if (typeof process === "object" && process.version !== undefined) {
    return `Node.js/${process.version.substr(1)} (${process.platform}; ${
      process.arch
    })`;
  }

  return "<environment undetectable>";
}

;// CONCATENATED MODULE: ./node_modules/.pnpm/before-after-hook@4.0.0/node_modules/before-after-hook/lib/register.js
// @ts-check

function register(state, name, method, options) {
  if (typeof method !== "function") {
    throw new Error("method for before hook must be a function");
  }

  if (!options) {
    options = {};
  }

  if (Array.isArray(name)) {
    return name.reverse().reduce((callback, name) => {
      return register.bind(null, state, name, callback, options);
    }, method)();
  }

  return Promise.resolve().then(() => {
    if (!state.registry[name]) {
      return method(options);
    }

    return state.registry[name].reduce((method, registered) => {
      return registered.hook.bind(null, method, options);
    }, method)();
  });
}

;// CONCATENATED MODULE: ./node_modules/.pnpm/before-after-hook@4.0.0/node_modules/before-after-hook/lib/add.js
// @ts-check

function addHook(state, kind, name, hook) {
  const orig = hook;
  if (!state.registry[name]) {
    state.registry[name] = [];
  }

  if (kind === "before") {
    hook = (method, options) => {
      return Promise.resolve()
        .then(orig.bind(null, options))
        .then(method.bind(null, options));
    };
  }

  if (kind === "after") {
    hook = (method, options) => {
      let result;
      return Promise.resolve()
        .then(method.bind(null, options))
        .then((result_) => {
          result = result_;
          return orig(result, options);
        })
        .then(() => {
          return result;
        });
    };
  }

  if (kind === "error") {
    hook = (method, options) => {
      return Promise.resolve()
        .then(method.bind(null, options))
        .catch((error) => {
          return orig(error, options);
        });
    };
  }

  state.registry[name].push({
    hook: hook,
    orig: orig,
  });
}

;// CONCATENATED MODULE: ./node_modules/.pnpm/before-after-hook@4.0.0/node_modules/before-after-hook/lib/remove.js
// @ts-check

function removeHook(state, name, method) {
  if (!state.registry[name]) {
    return;
  }

  const index = state.registry[name]
    .map((registered) => {
      return registered.orig;
    })
    .indexOf(method);

  if (index === -1) {
    return;
  }

  state.registry[name].splice(index, 1);
}

;// CONCATENATED MODULE: ./node_modules/.pnpm/before-after-hook@4.0.0/node_modules/before-after-hook/index.js
// @ts-check





// bind with array of arguments: https://stackoverflow.com/a/21792913
const bind = Function.bind;
const bindable = bind.bind(bind);

function bindApi(hook, state, name) {
  const removeHookRef = bindable(removeHook, null).apply(
    null,
    name ? [state, name] : [state]
  );
  hook.api = { remove: removeHookRef };
  hook.remove = removeHookRef;
  ["before", "error", "after", "wrap"].forEach((kind) => {
    const args = name ? [state, kind, name] : [state, kind];
    hook[kind] = hook.api[kind] = bindable(addHook, null).apply(null, args);
  });
}

function Singular() {
  const singularHookName = Symbol("Singular");
  const singularHookState = {
    registry: {},
  };
  const singularHook = register.bind(null, singularHookState, singularHookName);
  bindApi(singularHook, singularHookState, singularHookName);
  return singularHook;
}

function Collection() {
  const state = {
    registry: {},
  };

  const hook = register.bind(null, state);
  bindApi(hook, state);

  return hook;
}

/* harmony default export */ const before_after_hook = ({ Singular, Collection });

;// CONCATENATED MODULE: ./node_modules/.pnpm/@octokit+endpoint@11.0.2/node_modules/@octokit/endpoint/dist-bundle/index.js
// pkg/dist-src/defaults.js


// pkg/dist-src/version.js
var VERSION = "0.0.0-development";

// pkg/dist-src/defaults.js
var userAgent = `octokit-endpoint.js/${VERSION} ${getUserAgent()}`;
var DEFAULTS = {
  method: "GET",
  baseUrl: "https://api.github.com",
  headers: {
    accept: "application/vnd.github.v3+json",
    "user-agent": userAgent
  },
  mediaType: {
    format: ""
  }
};

// pkg/dist-src/util/lowercase-keys.js
function lowercaseKeys(object) {
  if (!object) {
    return {};
  }
  return Object.keys(object).reduce((newObj, key) => {
    newObj[key.toLowerCase()] = object[key];
    return newObj;
  }, {});
}

// pkg/dist-src/util/is-plain-object.js
function isPlainObject(value) {
  if (typeof value !== "object" || value === null) return false;
  if (Object.prototype.toString.call(value) !== "[object Object]") return false;
  const proto = Object.getPrototypeOf(value);
  if (proto === null) return true;
  const Ctor = Object.prototype.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  return typeof Ctor === "function" && Ctor instanceof Ctor && Function.prototype.call(Ctor) === Function.prototype.call(value);
}

// pkg/dist-src/util/merge-deep.js
function mergeDeep(defaults, options) {
  const result = Object.assign({}, defaults);
  Object.keys(options).forEach((key) => {
    if (isPlainObject(options[key])) {
      if (!(key in defaults)) Object.assign(result, { [key]: options[key] });
      else result[key] = mergeDeep(defaults[key], options[key]);
    } else {
      Object.assign(result, { [key]: options[key] });
    }
  });
  return result;
}

// pkg/dist-src/util/remove-undefined-properties.js
function removeUndefinedProperties(obj) {
  for (const key in obj) {
    if (obj[key] === void 0) {
      delete obj[key];
    }
  }
  return obj;
}

// pkg/dist-src/merge.js
function merge(defaults, route, options) {
  if (typeof route === "string") {
    let [method, url] = route.split(" ");
    options = Object.assign(url ? { method, url } : { url: method }, options);
  } else {
    options = Object.assign({}, route);
  }
  options.headers = lowercaseKeys(options.headers);
  removeUndefinedProperties(options);
  removeUndefinedProperties(options.headers);
  const mergedOptions = mergeDeep(defaults || {}, options);
  if (options.url === "/graphql") {
    if (defaults && defaults.mediaType.previews?.length) {
      mergedOptions.mediaType.previews = defaults.mediaType.previews.filter(
        (preview) => !mergedOptions.mediaType.previews.includes(preview)
      ).concat(mergedOptions.mediaType.previews);
    }
    mergedOptions.mediaType.previews = (mergedOptions.mediaType.previews || []).map((preview) => preview.replace(/-preview/, ""));
  }
  return mergedOptions;
}

// pkg/dist-src/util/add-query-parameters.js
function addQueryParameters(url, parameters) {
  const separator = /\?/.test(url) ? "&" : "?";
  const names = Object.keys(parameters);
  if (names.length === 0) {
    return url;
  }
  return url + separator + names.map((name) => {
    if (name === "q") {
      return "q=" + parameters.q.split("+").map(encodeURIComponent).join("+");
    }
    return `${name}=${encodeURIComponent(parameters[name])}`;
  }).join("&");
}

// pkg/dist-src/util/extract-url-variable-names.js
var urlVariableRegex = /\{[^{}}]+\}/g;
function removeNonChars(variableName) {
  return variableName.replace(/(?:^\W+)|(?:(?<!\W)\W+$)/g, "").split(/,/);
}
function extractUrlVariableNames(url) {
  const matches = url.match(urlVariableRegex);
  if (!matches) {
    return [];
  }
  return matches.map(removeNonChars).reduce((a, b) => a.concat(b), []);
}

// pkg/dist-src/util/omit.js
function omit(object, keysToOmit) {
  const result = { __proto__: null };
  for (const key of Object.keys(object)) {
    if (keysToOmit.indexOf(key) === -1) {
      result[key] = object[key];
    }
  }
  return result;
}

// pkg/dist-src/util/url-template.js
function encodeReserved(str) {
  return str.split(/(%[0-9A-Fa-f]{2})/g).map(function(part) {
    if (!/%[0-9A-Fa-f]/.test(part)) {
      part = encodeURI(part).replace(/%5B/g, "[").replace(/%5D/g, "]");
    }
    return part;
  }).join("");
}
function encodeUnreserved(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return "%" + c.charCodeAt(0).toString(16).toUpperCase();
  });
}
function encodeValue(operator, value, key) {
  value = operator === "+" || operator === "#" ? encodeReserved(value) : encodeUnreserved(value);
  if (key) {
    return encodeUnreserved(key) + "=" + value;
  } else {
    return value;
  }
}
function isDefined(value) {
  return value !== void 0 && value !== null;
}
function isKeyOperator(operator) {
  return operator === ";" || operator === "&" || operator === "?";
}
function getValues(context, operator, key, modifier) {
  var value = context[key], result = [];
  if (isDefined(value) && value !== "") {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      value = value.toString();
      if (modifier && modifier !== "*") {
        value = value.substring(0, parseInt(modifier, 10));
      }
      result.push(
        encodeValue(operator, value, isKeyOperator(operator) ? key : "")
      );
    } else {
      if (modifier === "*") {
        if (Array.isArray(value)) {
          value.filter(isDefined).forEach(function(value2) {
            result.push(
              encodeValue(operator, value2, isKeyOperator(operator) ? key : "")
            );
          });
        } else {
          Object.keys(value).forEach(function(k) {
            if (isDefined(value[k])) {
              result.push(encodeValue(operator, value[k], k));
            }
          });
        }
      } else {
        const tmp = [];
        if (Array.isArray(value)) {
          value.filter(isDefined).forEach(function(value2) {
            tmp.push(encodeValue(operator, value2));
          });
        } else {
          Object.keys(value).forEach(function(k) {
            if (isDefined(value[k])) {
              tmp.push(encodeUnreserved(k));
              tmp.push(encodeValue(operator, value[k].toString()));
            }
          });
        }
        if (isKeyOperator(operator)) {
          result.push(encodeUnreserved(key) + "=" + tmp.join(","));
        } else if (tmp.length !== 0) {
          result.push(tmp.join(","));
        }
      }
    }
  } else {
    if (operator === ";") {
      if (isDefined(value)) {
        result.push(encodeUnreserved(key));
      }
    } else if (value === "" && (operator === "&" || operator === "?")) {
      result.push(encodeUnreserved(key) + "=");
    } else if (value === "") {
      result.push("");
    }
  }
  return result;
}
function parseUrl(template) {
  return {
    expand: expand.bind(null, template)
  };
}
function expand(template, context) {
  var operators = ["+", "#", ".", "/", ";", "?", "&"];
  template = template.replace(
    /\{([^\{\}]+)\}|([^\{\}]+)/g,
    function(_, expression, literal) {
      if (expression) {
        let operator = "";
        const values = [];
        if (operators.indexOf(expression.charAt(0)) !== -1) {
          operator = expression.charAt(0);
          expression = expression.substr(1);
        }
        expression.split(/,/g).forEach(function(variable) {
          var tmp = /([^:\*]*)(?::(\d+)|(\*))?/.exec(variable);
          values.push(getValues(context, operator, tmp[1], tmp[2] || tmp[3]));
        });
        if (operator && operator !== "+") {
          var separator = ",";
          if (operator === "?") {
            separator = "&";
          } else if (operator !== "#") {
            separator = operator;
          }
          return (values.length !== 0 ? operator : "") + values.join(separator);
        } else {
          return values.join(",");
        }
      } else {
        return encodeReserved(literal);
      }
    }
  );
  if (template === "/") {
    return template;
  } else {
    return template.replace(/\/$/, "");
  }
}

// pkg/dist-src/parse.js
function parse(options) {
  let method = options.method.toUpperCase();
  let url = (options.url || "/").replace(/:([a-z]\w+)/g, "{$1}");
  let headers = Object.assign({}, options.headers);
  let body;
  let parameters = omit(options, [
    "method",
    "baseUrl",
    "url",
    "headers",
    "request",
    "mediaType"
  ]);
  const urlVariableNames = extractUrlVariableNames(url);
  url = parseUrl(url).expand(parameters);
  if (!/^http/.test(url)) {
    url = options.baseUrl + url;
  }
  const omittedParameters = Object.keys(options).filter((option) => urlVariableNames.includes(option)).concat("baseUrl");
  const remainingParameters = omit(parameters, omittedParameters);
  const isBinaryRequest = /application\/octet-stream/i.test(headers.accept);
  if (!isBinaryRequest) {
    if (options.mediaType.format) {
      headers.accept = headers.accept.split(/,/).map(
        (format) => format.replace(
          /application\/vnd(\.\w+)(\.v3)?(\.\w+)?(\+json)?$/,
          `application/vnd$1$2.${options.mediaType.format}`
        )
      ).join(",");
    }
    if (url.endsWith("/graphql")) {
      if (options.mediaType.previews?.length) {
        const previewsFromAcceptHeader = headers.accept.match(/(?<![\w-])[\w-]+(?=-preview)/g) || [];
        headers.accept = previewsFromAcceptHeader.concat(options.mediaType.previews).map((preview) => {
          const format = options.mediaType.format ? `.${options.mediaType.format}` : "+json";
          return `application/vnd.github.${preview}-preview${format}`;
        }).join(",");
      }
    }
  }
  if (["GET", "HEAD"].includes(method)) {
    url = addQueryParameters(url, remainingParameters);
  } else {
    if ("data" in remainingParameters) {
      body = remainingParameters.data;
    } else {
      if (Object.keys(remainingParameters).length) {
        body = remainingParameters;
      }
    }
  }
  if (!headers["content-type"] && typeof body !== "undefined") {
    headers["content-type"] = "application/json; charset=utf-8";
  }
  if (["PATCH", "PUT"].includes(method) && typeof body === "undefined") {
    body = "";
  }
  return Object.assign(
    { method, url, headers },
    typeof body !== "undefined" ? { body } : null,
    options.request ? { request: options.request } : null
  );
}

// pkg/dist-src/endpoint-with-defaults.js
function endpointWithDefaults(defaults, route, options) {
  return parse(merge(defaults, route, options));
}

// pkg/dist-src/with-defaults.js
function withDefaults(oldDefaults, newDefaults) {
  const DEFAULTS2 = merge(oldDefaults, newDefaults);
  const endpoint2 = endpointWithDefaults.bind(null, DEFAULTS2);
  return Object.assign(endpoint2, {
    DEFAULTS: DEFAULTS2,
    defaults: withDefaults.bind(null, DEFAULTS2),
    merge: merge.bind(null, DEFAULTS2),
    parse
  });
}

// pkg/dist-src/index.js
var endpoint = withDefaults(null, DEFAULTS);


// EXTERNAL MODULE: ./node_modules/.pnpm/fast-content-type-parse@3.0.0/node_modules/fast-content-type-parse/index.js
var fast_content_type_parse = __webpack_require__(90975);
;// CONCATENATED MODULE: ./node_modules/.pnpm/@octokit+request-error@7.1.0/node_modules/@octokit/request-error/dist-src/index.js
class RequestError extends Error {
  name;
  /**
   * http status code
   */
  status;
  /**
   * Request options that lead to the error.
   */
  request;
  /**
   * Response object if a response was received
   */
  response;
  constructor(message, statusCode, options) {
    super(message, { cause: options.cause });
    this.name = "HttpError";
    this.status = Number.parseInt(statusCode);
    if (Number.isNaN(this.status)) {
      this.status = 0;
    }
    /* v8 ignore else -- @preserve -- Bug with vitest coverage where it sees an else branch that doesn't exist */
    if ("response" in options) {
      this.response = options.response;
    }
    const requestCopy = Object.assign({}, options.request);
    if (options.request.headers.authorization) {
      requestCopy.headers = Object.assign({}, options.request.headers, {
        authorization: options.request.headers.authorization.replace(
          /(?<! ) .*$/,
          " [REDACTED]"
        )
      });
    }
    requestCopy.url = requestCopy.url.replace(/\bclient_secret=\w+/g, "client_secret=[REDACTED]").replace(/\baccess_token=\w+/g, "access_token=[REDACTED]");
    this.request = requestCopy;
  }
}


;// CONCATENATED MODULE: ./node_modules/.pnpm/@octokit+request@10.0.7/node_modules/@octokit/request/dist-bundle/index.js
// pkg/dist-src/index.js


// pkg/dist-src/defaults.js


// pkg/dist-src/version.js
var dist_bundle_VERSION = "10.0.7";

// pkg/dist-src/defaults.js
var defaults_default = {
  headers: {
    "user-agent": `octokit-request.js/${dist_bundle_VERSION} ${getUserAgent()}`
  }
};

// pkg/dist-src/fetch-wrapper.js


// pkg/dist-src/is-plain-object.js
function dist_bundle_isPlainObject(value) {
  if (typeof value !== "object" || value === null) return false;
  if (Object.prototype.toString.call(value) !== "[object Object]") return false;
  const proto = Object.getPrototypeOf(value);
  if (proto === null) return true;
  const Ctor = Object.prototype.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  return typeof Ctor === "function" && Ctor instanceof Ctor && Function.prototype.call(Ctor) === Function.prototype.call(value);
}

// pkg/dist-src/fetch-wrapper.js

var noop = () => "";
async function fetchWrapper(requestOptions) {
  const fetch = requestOptions.request?.fetch || globalThis.fetch;
  if (!fetch) {
    throw new Error(
      "fetch is not set. Please pass a fetch implementation as new Octokit({ request: { fetch }}). Learn more at https://github.com/octokit/octokit.js/#fetch-missing"
    );
  }
  const log = requestOptions.request?.log || console;
  const parseSuccessResponseBody = requestOptions.request?.parseSuccessResponseBody !== false;
  const body = dist_bundle_isPlainObject(requestOptions.body) || Array.isArray(requestOptions.body) ? JSON.stringify(requestOptions.body) : requestOptions.body;
  const requestHeaders = Object.fromEntries(
    Object.entries(requestOptions.headers).map(([name, value]) => [
      name,
      String(value)
    ])
  );
  let fetchResponse;
  try {
    fetchResponse = await fetch(requestOptions.url, {
      method: requestOptions.method,
      body,
      redirect: requestOptions.request?.redirect,
      headers: requestHeaders,
      signal: requestOptions.request?.signal,
      // duplex must be set if request.body is ReadableStream or Async Iterables.
      // See https://fetch.spec.whatwg.org/#dom-requestinit-duplex.
      ...requestOptions.body && { duplex: "half" }
    });
  } catch (error) {
    let message = "Unknown Error";
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        error.status = 500;
        throw error;
      }
      message = error.message;
      if (error.name === "TypeError" && "cause" in error) {
        if (error.cause instanceof Error) {
          message = error.cause.message;
        } else if (typeof error.cause === "string") {
          message = error.cause;
        }
      }
    }
    const requestError = new RequestError(message, 500, {
      request: requestOptions
    });
    requestError.cause = error;
    throw requestError;
  }
  const status = fetchResponse.status;
  const url = fetchResponse.url;
  const responseHeaders = {};
  for (const [key, value] of fetchResponse.headers) {
    responseHeaders[key] = value;
  }
  const octokitResponse = {
    url,
    status,
    headers: responseHeaders,
    data: ""
  };
  if ("deprecation" in responseHeaders) {
    const matches = responseHeaders.link && responseHeaders.link.match(/<([^<>]+)>; rel="deprecation"/);
    const deprecationLink = matches && matches.pop();
    log.warn(
      `[@octokit/request] "${requestOptions.method} ${requestOptions.url}" is deprecated. It is scheduled to be removed on ${responseHeaders.sunset}${deprecationLink ? `. See ${deprecationLink}` : ""}`
    );
  }
  if (status === 204 || status === 205) {
    return octokitResponse;
  }
  if (requestOptions.method === "HEAD") {
    if (status < 400) {
      return octokitResponse;
    }
    throw new RequestError(fetchResponse.statusText, status, {
      response: octokitResponse,
      request: requestOptions
    });
  }
  if (status === 304) {
    octokitResponse.data = await getResponseData(fetchResponse);
    throw new RequestError("Not modified", status, {
      response: octokitResponse,
      request: requestOptions
    });
  }
  if (status >= 400) {
    octokitResponse.data = await getResponseData(fetchResponse);
    throw new RequestError(toErrorMessage(octokitResponse.data), status, {
      response: octokitResponse,
      request: requestOptions
    });
  }
  octokitResponse.data = parseSuccessResponseBody ? await getResponseData(fetchResponse) : fetchResponse.body;
  return octokitResponse;
}
async function getResponseData(response) {
  const contentType = response.headers.get("content-type");
  if (!contentType) {
    return response.text().catch(noop);
  }
  const mimetype = (0,fast_content_type_parse/* safeParse */.xL)(contentType);
  if (isJSONResponse(mimetype)) {
    let text = "";
    try {
      text = await response.text();
      return JSON.parse(text);
    } catch (err) {
      return text;
    }
  } else if (mimetype.type.startsWith("text/") || mimetype.parameters.charset?.toLowerCase() === "utf-8") {
    return response.text().catch(noop);
  } else {
    return response.arrayBuffer().catch(
      /* v8 ignore next -- @preserve */
      () => new ArrayBuffer(0)
    );
  }
}
function isJSONResponse(mimetype) {
  return mimetype.type === "application/json" || mimetype.type === "application/scim+json";
}
function toErrorMessage(data) {
  if (typeof data === "string") {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return "Unknown error";
  }
  if ("message" in data) {
    const suffix = "documentation_url" in data ? ` - ${data.documentation_url}` : "";
    return Array.isArray(data.errors) ? `${data.message}: ${data.errors.map((v) => JSON.stringify(v)).join(", ")}${suffix}` : `${data.message}${suffix}`;
  }
  return `Unknown error: ${JSON.stringify(data)}`;
}

// pkg/dist-src/with-defaults.js
function dist_bundle_withDefaults(oldEndpoint, newDefaults) {
  const endpoint2 = oldEndpoint.defaults(newDefaults);
  const newApi = function(route, parameters) {
    const endpointOptions = endpoint2.merge(route, parameters);
    if (!endpointOptions.request || !endpointOptions.request.hook) {
      return fetchWrapper(endpoint2.parse(endpointOptions));
    }
    const request2 = (route2, parameters2) => {
      return fetchWrapper(
        endpoint2.parse(endpoint2.merge(route2, parameters2))
      );
    };
    Object.assign(request2, {
      endpoint: endpoint2,
      defaults: dist_bundle_withDefaults.bind(null, endpoint2)
    });
    return endpointOptions.request.hook(request2, endpointOptions);
  };
  return Object.assign(newApi, {
    endpoint: endpoint2,
    defaults: dist_bundle_withDefaults.bind(null, endpoint2)
  });
}

// pkg/dist-src/index.js
var request = dist_bundle_withDefaults(endpoint, defaults_default);

/* v8 ignore next -- @preserve */
/* v8 ignore else -- @preserve */

;// CONCATENATED MODULE: ./node_modules/.pnpm/@octokit+graphql@9.0.3/node_modules/@octokit/graphql/dist-bundle/index.js
// pkg/dist-src/index.js



// pkg/dist-src/version.js
var graphql_dist_bundle_VERSION = "0.0.0-development";

// pkg/dist-src/with-defaults.js


// pkg/dist-src/graphql.js


// pkg/dist-src/error.js
function _buildMessageForResponseErrors(data) {
  return `Request failed due to following response errors:
` + data.errors.map((e) => ` - ${e.message}`).join("\n");
}
var GraphqlResponseError = class extends Error {
  constructor(request2, headers, response) {
    super(_buildMessageForResponseErrors(response));
    this.request = request2;
    this.headers = headers;
    this.response = response;
    this.errors = response.errors;
    this.data = response.data;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  name = "GraphqlResponseError";
  errors;
  data;
};

// pkg/dist-src/graphql.js
var NON_VARIABLE_OPTIONS = [
  "method",
  "baseUrl",
  "url",
  "headers",
  "request",
  "query",
  "mediaType",
  "operationName"
];
var FORBIDDEN_VARIABLE_OPTIONS = ["query", "method", "url"];
var GHES_V3_SUFFIX_REGEX = /\/api\/v3\/?$/;
function graphql(request2, query, options) {
  if (options) {
    if (typeof query === "string" && "query" in options) {
      return Promise.reject(
        new Error(`[@octokit/graphql] "query" cannot be used as variable name`)
      );
    }
    for (const key in options) {
      if (!FORBIDDEN_VARIABLE_OPTIONS.includes(key)) continue;
      return Promise.reject(
        new Error(
          `[@octokit/graphql] "${key}" cannot be used as variable name`
        )
      );
    }
  }
  const parsedOptions = typeof query === "string" ? Object.assign({ query }, options) : query;
  const requestOptions = Object.keys(
    parsedOptions
  ).reduce((result, key) => {
    if (NON_VARIABLE_OPTIONS.includes(key)) {
      result[key] = parsedOptions[key];
      return result;
    }
    if (!result.variables) {
      result.variables = {};
    }
    result.variables[key] = parsedOptions[key];
    return result;
  }, {});
  const baseUrl = parsedOptions.baseUrl || request2.endpoint.DEFAULTS.baseUrl;
  if (GHES_V3_SUFFIX_REGEX.test(baseUrl)) {
    requestOptions.url = baseUrl.replace(GHES_V3_SUFFIX_REGEX, "/api/graphql");
  }
  return request2(requestOptions).then((response) => {
    if (response.data.errors) {
      const headers = {};
      for (const key of Object.keys(response.headers)) {
        headers[key] = response.headers[key];
      }
      throw new GraphqlResponseError(
        requestOptions,
        headers,
        response.data
      );
    }
    return response.data.data;
  });
}

// pkg/dist-src/with-defaults.js
function graphql_dist_bundle_withDefaults(request2, newDefaults) {
  const newRequest = request2.defaults(newDefaults);
  const newApi = (query, options) => {
    return graphql(newRequest, query, options);
  };
  return Object.assign(newApi, {
    defaults: graphql_dist_bundle_withDefaults.bind(null, newRequest),
    endpoint: newRequest.endpoint
  });
}

// pkg/dist-src/index.js
var graphql2 = graphql_dist_bundle_withDefaults(request, {
  headers: {
    "user-agent": `octokit-graphql.js/${graphql_dist_bundle_VERSION} ${getUserAgent()}`
  },
  method: "POST",
  url: "/graphql"
});
function withCustomRequest(customRequest) {
  return graphql_dist_bundle_withDefaults(customRequest, {
    method: "POST",
    url: "/graphql"
  });
}


;// CONCATENATED MODULE: ./node_modules/.pnpm/@octokit+auth-token@6.0.0/node_modules/@octokit/auth-token/dist-bundle/index.js
// pkg/dist-src/is-jwt.js
var b64url = "(?:[a-zA-Z0-9_-]+)";
var sep = "\\.";
var jwtRE = new RegExp(`^${b64url}${sep}${b64url}${sep}${b64url}$`);
var isJWT = jwtRE.test.bind(jwtRE);

// pkg/dist-src/auth.js
async function auth(token) {
  const isApp = isJWT(token);
  const isInstallation = token.startsWith("v1.") || token.startsWith("ghs_");
  const isUserToServer = token.startsWith("ghu_");
  const tokenType = isApp ? "app" : isInstallation ? "installation" : isUserToServer ? "user-to-server" : "oauth";
  return {
    type: "token",
    token,
    tokenType
  };
}

// pkg/dist-src/with-authorization-prefix.js
function withAuthorizationPrefix(token) {
  if (token.split(/\./).length === 3) {
    return `bearer ${token}`;
  }
  return `token ${token}`;
}

// pkg/dist-src/hook.js
async function hook(token, request, route, parameters) {
  const endpoint = request.endpoint.merge(
    route,
    parameters
  );
  endpoint.headers.authorization = withAuthorizationPrefix(token);
  return request(endpoint);
}

// pkg/dist-src/index.js
var createTokenAuth = function createTokenAuth2(token) {
  if (!token) {
    throw new Error("[@octokit/auth-token] No token passed to createTokenAuth");
  }
  if (typeof token !== "string") {
    throw new Error(
      "[@octokit/auth-token] Token passed to createTokenAuth is not a string"
    );
  }
  token = token.replace(/^(token|bearer) +/i, "");
  return Object.assign(auth.bind(null, token), {
    hook: hook.bind(null, token)
  });
};


;// CONCATENATED MODULE: ./node_modules/.pnpm/@octokit+core@7.0.6/node_modules/@octokit/core/dist-src/version.js
const version_VERSION = "7.0.6";


;// CONCATENATED MODULE: ./node_modules/.pnpm/@octokit+core@7.0.6/node_modules/@octokit/core/dist-src/index.js






const dist_src_noop = () => {
};
const consoleWarn = console.warn.bind(console);
const consoleError = console.error.bind(console);
function createLogger(logger = {}) {
  if (typeof logger.debug !== "function") {
    logger.debug = dist_src_noop;
  }
  if (typeof logger.info !== "function") {
    logger.info = dist_src_noop;
  }
  if (typeof logger.warn !== "function") {
    logger.warn = consoleWarn;
  }
  if (typeof logger.error !== "function") {
    logger.error = consoleError;
  }
  return logger;
}
const userAgentTrail = `octokit-core.js/${version_VERSION} ${getUserAgent()}`;
class Octokit {
  static VERSION = version_VERSION;
  static defaults(defaults) {
    const OctokitWithDefaults = class extends this {
      constructor(...args) {
        const options = args[0] || {};
        if (typeof defaults === "function") {
          super(defaults(options));
          return;
        }
        super(
          Object.assign(
            {},
            defaults,
            options,
            options.userAgent && defaults.userAgent ? {
              userAgent: `${options.userAgent} ${defaults.userAgent}`
            } : null
          )
        );
      }
    };
    return OctokitWithDefaults;
  }
  static plugins = [];
  /**
   * Attach a plugin (or many) to your Octokit instance.
   *
   * @example
   * const API = Octokit.plugin(plugin1, plugin2, plugin3, ...)
   */
  static plugin(...newPlugins) {
    const currentPlugins = this.plugins;
    const NewOctokit = class extends this {
      static plugins = currentPlugins.concat(
        newPlugins.filter((plugin) => !currentPlugins.includes(plugin))
      );
    };
    return NewOctokit;
  }
  constructor(options = {}) {
    const hook = new before_after_hook.Collection();
    const requestDefaults = {
      baseUrl: request.endpoint.DEFAULTS.baseUrl,
      headers: {},
      request: Object.assign({}, options.request, {
        // @ts-ignore internal usage only, no need to type
        hook: hook.bind(null, "request")
      }),
      mediaType: {
        previews: [],
        format: ""
      }
    };
    requestDefaults.headers["user-agent"] = options.userAgent ? `${options.userAgent} ${userAgentTrail}` : userAgentTrail;
    if (options.baseUrl) {
      requestDefaults.baseUrl = options.baseUrl;
    }
    if (options.previews) {
      requestDefaults.mediaType.previews = options.previews;
    }
    if (options.timeZone) {
      requestDefaults.headers["time-zone"] = options.timeZone;
    }
    this.request = request.defaults(requestDefaults);
    this.graphql = withCustomRequest(this.request).defaults(requestDefaults);
    this.log = createLogger(options.log);
    this.hook = hook;
    if (!options.authStrategy) {
      if (!options.auth) {
        this.auth = async () => ({
          type: "unauthenticated"
        });
      } else {
        const auth = createTokenAuth(options.auth);
        hook.wrap("request", auth.hook);
        this.auth = auth;
      }
    } else {
      const { authStrategy, ...otherOptions } = options;
      const auth = authStrategy(
        Object.assign(
          {
            request: this.request,
            log: this.log,
            // we pass the current octokit instance as well as its constructor options
            // to allow for authentication strategies that return a new octokit instance
            // that shares the same internal state as the current one. The original
            // requirement for this was the "event-octokit" authentication strategy
            // of https://github.com/probot/octokit-auth-probot.
            octokit: this,
            octokitOptions: otherOptions
          },
          options.auth
        )
      );
      hook.wrap("request", auth.hook);
      this.auth = auth;
    }
    const classConstructor = this.constructor;
    for (let i = 0; i < classConstructor.plugins.length; ++i) {
      Object.assign(this, classConstructor.plugins[i](this, options));
    }
  }
  // assigned during constructor
  request;
  graphql;
  log;
  hook;
  // TODO: type `octokit.auth` based on passed options.authStrategy
  auth;
}


;// CONCATENATED MODULE: ./node_modules/.pnpm/@octokit+plugin-request-log@6.0.0_@octokit+core@7.0.6/node_modules/@octokit/plugin-request-log/dist-src/version.js
const dist_src_version_VERSION = "6.0.0";


;// CONCATENATED MODULE: ./node_modules/.pnpm/@octokit+plugin-request-log@6.0.0_@octokit+core@7.0.6/node_modules/@octokit/plugin-request-log/dist-src/index.js

function requestLog(octokit) {
  octokit.hook.wrap("request", (request, options) => {
    octokit.log.debug("request", options);
    const start = Date.now();
    const requestOptions = octokit.request.endpoint.parse(options);
    const path = requestOptions.url.replace(options.baseUrl, "");
    return request(options).then((response) => {
      const requestId = response.headers["x-github-request-id"];
      octokit.log.info(
        `${requestOptions.method} ${path} - ${response.status} with id ${requestId} in ${Date.now() - start}ms`
      );
      return response;
    }).catch((error) => {
      const requestId = error.response?.headers["x-github-request-id"] || "UNKNOWN";
      octokit.log.error(
        `${requestOptions.method} ${path} - ${error.status} with id ${requestId} in ${Date.now() - start}ms`
      );
      throw error;
    });
  });
}
requestLog.VERSION = dist_src_version_VERSION;


;// CONCATENATED MODULE: ./node_modules/.pnpm/@octokit+plugin-paginate-rest@14.0.0_@octokit+core@7.0.6/node_modules/@octokit/plugin-paginate-rest/dist-bundle/index.js
// pkg/dist-src/version.js
var plugin_paginate_rest_dist_bundle_VERSION = "0.0.0-development";

// pkg/dist-src/normalize-paginated-list-response.js
function normalizePaginatedListResponse(response) {
  if (!response.data) {
    return {
      ...response,
      data: []
    };
  }
  const responseNeedsNormalization = ("total_count" in response.data || "total_commits" in response.data) && !("url" in response.data);
  if (!responseNeedsNormalization) return response;
  const incompleteResults = response.data.incomplete_results;
  const repositorySelection = response.data.repository_selection;
  const totalCount = response.data.total_count;
  const totalCommits = response.data.total_commits;
  delete response.data.incomplete_results;
  delete response.data.repository_selection;
  delete response.data.total_count;
  delete response.data.total_commits;
  const namespaceKey = Object.keys(response.data)[0];
  const data = response.data[namespaceKey];
  response.data = data;
  if (typeof incompleteResults !== "undefined") {
    response.data.incomplete_results = incompleteResults;
  }
  if (typeof repositorySelection !== "undefined") {
    response.data.repository_selection = repositorySelection;
  }
  response.data.total_count = totalCount;
  response.data.total_commits = totalCommits;
  return response;
}

// pkg/dist-src/iterator.js
function iterator(octokit, route, parameters) {
  const options = typeof route === "function" ? route.endpoint(parameters) : octokit.request.endpoint(route, parameters);
  const requestMethod = typeof route === "function" ? route : octokit.request;
  const method = options.method;
  const headers = options.headers;
  let url = options.url;
  return {
    [Symbol.asyncIterator]: () => ({
      async next() {
        if (!url) return { done: true };
        try {
          const response = await requestMethod({ method, url, headers });
          const normalizedResponse = normalizePaginatedListResponse(response);
          url = ((normalizedResponse.headers.link || "").match(
            /<([^<>]+)>;\s*rel="next"/
          ) || [])[1];
          if (!url && "total_commits" in normalizedResponse.data) {
            const parsedUrl = new URL(normalizedResponse.url);
            const params = parsedUrl.searchParams;
            const page = parseInt(params.get("page") || "1", 10);
            const per_page = parseInt(params.get("per_page") || "250", 10);
            if (page * per_page < normalizedResponse.data.total_commits) {
              params.set("page", String(page + 1));
              url = parsedUrl.toString();
            }
          }
          return { value: normalizedResponse };
        } catch (error) {
          if (error.status !== 409) throw error;
          url = "";
          return {
            value: {
              status: 200,
              headers: {},
              data: []
            }
          };
        }
      }
    })
  };
}

// pkg/dist-src/paginate.js
function paginate(octokit, route, parameters, mapFn) {
  if (typeof parameters === "function") {
    mapFn = parameters;
    parameters = void 0;
  }
  return gather(
    octokit,
    [],
    iterator(octokit, route, parameters)[Symbol.asyncIterator](),
    mapFn
  );
}
function gather(octokit, results, iterator2, mapFn) {
  return iterator2.next().then((result) => {
    if (result.done) {
      return results;
    }
    let earlyExit = false;
    function done() {
      earlyExit = true;
    }
    results = results.concat(
      mapFn ? mapFn(result.value, done) : result.value.data
    );
    if (earlyExit) {
      return results;
    }
    return gather(octokit, results, iterator2, mapFn);
  });
}

// pkg/dist-src/compose-paginate.js
var composePaginateRest = Object.assign(paginate, {
  iterator
});

// pkg/dist-src/generated/paginating-endpoints.js
var paginatingEndpoints = (/* unused pure expression or super */ null && ([
  "GET /advisories",
  "GET /app/hook/deliveries",
  "GET /app/installation-requests",
  "GET /app/installations",
  "GET /assignments/{assignment_id}/accepted_assignments",
  "GET /classrooms",
  "GET /classrooms/{classroom_id}/assignments",
  "GET /enterprises/{enterprise}/code-security/configurations",
  "GET /enterprises/{enterprise}/code-security/configurations/{configuration_id}/repositories",
  "GET /enterprises/{enterprise}/dependabot/alerts",
  "GET /enterprises/{enterprise}/teams",
  "GET /enterprises/{enterprise}/teams/{enterprise-team}/memberships",
  "GET /enterprises/{enterprise}/teams/{enterprise-team}/organizations",
  "GET /events",
  "GET /gists",
  "GET /gists/public",
  "GET /gists/starred",
  "GET /gists/{gist_id}/comments",
  "GET /gists/{gist_id}/commits",
  "GET /gists/{gist_id}/forks",
  "GET /installation/repositories",
  "GET /issues",
  "GET /licenses",
  "GET /marketplace_listing/plans",
  "GET /marketplace_listing/plans/{plan_id}/accounts",
  "GET /marketplace_listing/stubbed/plans",
  "GET /marketplace_listing/stubbed/plans/{plan_id}/accounts",
  "GET /networks/{owner}/{repo}/events",
  "GET /notifications",
  "GET /organizations",
  "GET /organizations/{org}/dependabot/repository-access",
  "GET /orgs/{org}/actions/cache/usage-by-repository",
  "GET /orgs/{org}/actions/hosted-runners",
  "GET /orgs/{org}/actions/permissions/repositories",
  "GET /orgs/{org}/actions/permissions/self-hosted-runners/repositories",
  "GET /orgs/{org}/actions/runner-groups",
  "GET /orgs/{org}/actions/runner-groups/{runner_group_id}/hosted-runners",
  "GET /orgs/{org}/actions/runner-groups/{runner_group_id}/repositories",
  "GET /orgs/{org}/actions/runner-groups/{runner_group_id}/runners",
  "GET /orgs/{org}/actions/runners",
  "GET /orgs/{org}/actions/secrets",
  "GET /orgs/{org}/actions/secrets/{secret_name}/repositories",
  "GET /orgs/{org}/actions/variables",
  "GET /orgs/{org}/actions/variables/{name}/repositories",
  "GET /orgs/{org}/attestations/repositories",
  "GET /orgs/{org}/attestations/{subject_digest}",
  "GET /orgs/{org}/blocks",
  "GET /orgs/{org}/campaigns",
  "GET /orgs/{org}/code-scanning/alerts",
  "GET /orgs/{org}/code-security/configurations",
  "GET /orgs/{org}/code-security/configurations/{configuration_id}/repositories",
  "GET /orgs/{org}/codespaces",
  "GET /orgs/{org}/codespaces/secrets",
  "GET /orgs/{org}/codespaces/secrets/{secret_name}/repositories",
  "GET /orgs/{org}/copilot/billing/seats",
  "GET /orgs/{org}/copilot/metrics",
  "GET /orgs/{org}/dependabot/alerts",
  "GET /orgs/{org}/dependabot/secrets",
  "GET /orgs/{org}/dependabot/secrets/{secret_name}/repositories",
  "GET /orgs/{org}/events",
  "GET /orgs/{org}/failed_invitations",
  "GET /orgs/{org}/hooks",
  "GET /orgs/{org}/hooks/{hook_id}/deliveries",
  "GET /orgs/{org}/insights/api/route-stats/{actor_type}/{actor_id}",
  "GET /orgs/{org}/insights/api/subject-stats",
  "GET /orgs/{org}/insights/api/user-stats/{user_id}",
  "GET /orgs/{org}/installations",
  "GET /orgs/{org}/invitations",
  "GET /orgs/{org}/invitations/{invitation_id}/teams",
  "GET /orgs/{org}/issues",
  "GET /orgs/{org}/members",
  "GET /orgs/{org}/members/{username}/codespaces",
  "GET /orgs/{org}/migrations",
  "GET /orgs/{org}/migrations/{migration_id}/repositories",
  "GET /orgs/{org}/organization-roles/{role_id}/teams",
  "GET /orgs/{org}/organization-roles/{role_id}/users",
  "GET /orgs/{org}/outside_collaborators",
  "GET /orgs/{org}/packages",
  "GET /orgs/{org}/packages/{package_type}/{package_name}/versions",
  "GET /orgs/{org}/personal-access-token-requests",
  "GET /orgs/{org}/personal-access-token-requests/{pat_request_id}/repositories",
  "GET /orgs/{org}/personal-access-tokens",
  "GET /orgs/{org}/personal-access-tokens/{pat_id}/repositories",
  "GET /orgs/{org}/private-registries",
  "GET /orgs/{org}/projects",
  "GET /orgs/{org}/projectsV2",
  "GET /orgs/{org}/projectsV2/{project_number}/fields",
  "GET /orgs/{org}/projectsV2/{project_number}/items",
  "GET /orgs/{org}/properties/values",
  "GET /orgs/{org}/public_members",
  "GET /orgs/{org}/repos",
  "GET /orgs/{org}/rulesets",
  "GET /orgs/{org}/rulesets/rule-suites",
  "GET /orgs/{org}/rulesets/{ruleset_id}/history",
  "GET /orgs/{org}/secret-scanning/alerts",
  "GET /orgs/{org}/security-advisories",
  "GET /orgs/{org}/settings/immutable-releases/repositories",
  "GET /orgs/{org}/settings/network-configurations",
  "GET /orgs/{org}/team/{team_slug}/copilot/metrics",
  "GET /orgs/{org}/teams",
  "GET /orgs/{org}/teams/{team_slug}/discussions",
  "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments",
  "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions",
  "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions",
  "GET /orgs/{org}/teams/{team_slug}/invitations",
  "GET /orgs/{org}/teams/{team_slug}/members",
  "GET /orgs/{org}/teams/{team_slug}/projects",
  "GET /orgs/{org}/teams/{team_slug}/repos",
  "GET /orgs/{org}/teams/{team_slug}/teams",
  "GET /projects/{project_id}/collaborators",
  "GET /repos/{owner}/{repo}/actions/artifacts",
  "GET /repos/{owner}/{repo}/actions/caches",
  "GET /repos/{owner}/{repo}/actions/organization-secrets",
  "GET /repos/{owner}/{repo}/actions/organization-variables",
  "GET /repos/{owner}/{repo}/actions/runners",
  "GET /repos/{owner}/{repo}/actions/runs",
  "GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts",
  "GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs",
  "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
  "GET /repos/{owner}/{repo}/actions/secrets",
  "GET /repos/{owner}/{repo}/actions/variables",
  "GET /repos/{owner}/{repo}/actions/workflows",
  "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs",
  "GET /repos/{owner}/{repo}/activity",
  "GET /repos/{owner}/{repo}/assignees",
  "GET /repos/{owner}/{repo}/attestations/{subject_digest}",
  "GET /repos/{owner}/{repo}/branches",
  "GET /repos/{owner}/{repo}/check-runs/{check_run_id}/annotations",
  "GET /repos/{owner}/{repo}/check-suites/{check_suite_id}/check-runs",
  "GET /repos/{owner}/{repo}/code-scanning/alerts",
  "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances",
  "GET /repos/{owner}/{repo}/code-scanning/analyses",
  "GET /repos/{owner}/{repo}/codespaces",
  "GET /repos/{owner}/{repo}/codespaces/devcontainers",
  "GET /repos/{owner}/{repo}/codespaces/secrets",
  "GET /repos/{owner}/{repo}/collaborators",
  "GET /repos/{owner}/{repo}/comments",
  "GET /repos/{owner}/{repo}/comments/{comment_id}/reactions",
  "GET /repos/{owner}/{repo}/commits",
  "GET /repos/{owner}/{repo}/commits/{commit_sha}/comments",
  "GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls",
  "GET /repos/{owner}/{repo}/commits/{ref}/check-runs",
  "GET /repos/{owner}/{repo}/commits/{ref}/check-suites",
  "GET /repos/{owner}/{repo}/commits/{ref}/status",
  "GET /repos/{owner}/{repo}/commits/{ref}/statuses",
  "GET /repos/{owner}/{repo}/compare/{basehead}",
  "GET /repos/{owner}/{repo}/compare/{base}...{head}",
  "GET /repos/{owner}/{repo}/contributors",
  "GET /repos/{owner}/{repo}/dependabot/alerts",
  "GET /repos/{owner}/{repo}/dependabot/secrets",
  "GET /repos/{owner}/{repo}/deployments",
  "GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses",
  "GET /repos/{owner}/{repo}/environments",
  "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies",
  "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/apps",
  "GET /repos/{owner}/{repo}/environments/{environment_name}/secrets",
  "GET /repos/{owner}/{repo}/environments/{environment_name}/variables",
  "GET /repos/{owner}/{repo}/events",
  "GET /repos/{owner}/{repo}/forks",
  "GET /repos/{owner}/{repo}/hooks",
  "GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries",
  "GET /repos/{owner}/{repo}/invitations",
  "GET /repos/{owner}/{repo}/issues",
  "GET /repos/{owner}/{repo}/issues/comments",
  "GET /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions",
  "GET /repos/{owner}/{repo}/issues/events",
  "GET /repos/{owner}/{repo}/issues/{issue_number}/comments",
  "GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by",
  "GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocking",
  "GET /repos/{owner}/{repo}/issues/{issue_number}/events",
  "GET /repos/{owner}/{repo}/issues/{issue_number}/labels",
  "GET /repos/{owner}/{repo}/issues/{issue_number}/reactions",
  "GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues",
  "GET /repos/{owner}/{repo}/issues/{issue_number}/timeline",
  "GET /repos/{owner}/{repo}/keys",
  "GET /repos/{owner}/{repo}/labels",
  "GET /repos/{owner}/{repo}/milestones",
  "GET /repos/{owner}/{repo}/milestones/{milestone_number}/labels",
  "GET /repos/{owner}/{repo}/notifications",
  "GET /repos/{owner}/{repo}/pages/builds",
  "GET /repos/{owner}/{repo}/projects",
  "GET /repos/{owner}/{repo}/pulls",
  "GET /repos/{owner}/{repo}/pulls/comments",
  "GET /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions",
  "GET /repos/{owner}/{repo}/pulls/{pull_number}/comments",
  "GET /repos/{owner}/{repo}/pulls/{pull_number}/commits",
  "GET /repos/{owner}/{repo}/pulls/{pull_number}/files",
  "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews",
  "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments",
  "GET /repos/{owner}/{repo}/releases",
  "GET /repos/{owner}/{repo}/releases/{release_id}/assets",
  "GET /repos/{owner}/{repo}/releases/{release_id}/reactions",
  "GET /repos/{owner}/{repo}/rules/branches/{branch}",
  "GET /repos/{owner}/{repo}/rulesets",
  "GET /repos/{owner}/{repo}/rulesets/rule-suites",
  "GET /repos/{owner}/{repo}/rulesets/{ruleset_id}/history",
  "GET /repos/{owner}/{repo}/secret-scanning/alerts",
  "GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}/locations",
  "GET /repos/{owner}/{repo}/security-advisories",
  "GET /repos/{owner}/{repo}/stargazers",
  "GET /repos/{owner}/{repo}/subscribers",
  "GET /repos/{owner}/{repo}/tags",
  "GET /repos/{owner}/{repo}/teams",
  "GET /repos/{owner}/{repo}/topics",
  "GET /repositories",
  "GET /search/code",
  "GET /search/commits",
  "GET /search/issues",
  "GET /search/labels",
  "GET /search/repositories",
  "GET /search/topics",
  "GET /search/users",
  "GET /teams/{team_id}/discussions",
  "GET /teams/{team_id}/discussions/{discussion_number}/comments",
  "GET /teams/{team_id}/discussions/{discussion_number}/comments/{comment_number}/reactions",
  "GET /teams/{team_id}/discussions/{discussion_number}/reactions",
  "GET /teams/{team_id}/invitations",
  "GET /teams/{team_id}/members",
  "GET /teams/{team_id}/projects",
  "GET /teams/{team_id}/repos",
  "GET /teams/{team_id}/teams",
  "GET /user/blocks",
  "GET /user/codespaces",
  "GET /user/codespaces/secrets",
  "GET /user/emails",
  "GET /user/followers",
  "GET /user/following",
  "GET /user/gpg_keys",
  "GET /user/installations",
  "GET /user/installations/{installation_id}/repositories",
  "GET /user/issues",
  "GET /user/keys",
  "GET /user/marketplace_purchases",
  "GET /user/marketplace_purchases/stubbed",
  "GET /user/memberships/orgs",
  "GET /user/migrations",
  "GET /user/migrations/{migration_id}/repositories",
  "GET /user/orgs",
  "GET /user/packages",
  "GET /user/packages/{package_type}/{package_name}/versions",
  "GET /user/public_emails",
  "GET /user/repos",
  "GET /user/repository_invitations",
  "GET /user/social_accounts",
  "GET /user/ssh_signing_keys",
  "GET /user/starred",
  "GET /user/subscriptions",
  "GET /user/teams",
  "GET /users",
  "GET /users/{username}/attestations/{subject_digest}",
  "GET /users/{username}/events",
  "GET /users/{username}/events/orgs/{org}",
  "GET /users/{username}/events/public",
  "GET /users/{username}/followers",
  "GET /users/{username}/following",
  "GET /users/{username}/gists",
  "GET /users/{username}/gpg_keys",
  "GET /users/{username}/keys",
  "GET /users/{username}/orgs",
  "GET /users/{username}/packages",
  "GET /users/{username}/projects",
  "GET /users/{username}/projectsV2",
  "GET /users/{username}/projectsV2/{project_number}/fields",
  "GET /users/{username}/projectsV2/{project_number}/items",
  "GET /users/{username}/received_events",
  "GET /users/{username}/received_events/public",
  "GET /users/{username}/repos",
  "GET /users/{username}/social_accounts",
  "GET /users/{username}/ssh_signing_keys",
  "GET /users/{username}/starred",
  "GET /users/{username}/subscriptions"
]));

// pkg/dist-src/paginating-endpoints.js
function isPaginatingEndpoint(arg) {
  if (typeof arg === "string") {
    return paginatingEndpoints.includes(arg);
  } else {
    return false;
  }
}

// pkg/dist-src/index.js
function paginateRest(octokit) {
  return {
    paginate: Object.assign(paginate.bind(null, octokit), {
      iterator: iterator.bind(null, octokit)
    })
  };
}
paginateRest.VERSION = plugin_paginate_rest_dist_bundle_VERSION;


;// CONCATENATED MODULE: ./node_modules/.pnpm/@octokit+plugin-rest-endpoint-methods@17.0.0_@octokit+core@7.0.6/node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/version.js
const plugin_rest_endpoint_methods_dist_src_version_VERSION = "17.0.0";

//# sourceMappingURL=version.js.map

;// CONCATENATED MODULE: ./node_modules/.pnpm/@octokit+plugin-rest-endpoint-methods@17.0.0_@octokit+core@7.0.6/node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/generated/endpoints.js
const Endpoints = {
  actions: {
    addCustomLabelsToSelfHostedRunnerForOrg: [
      "POST /orgs/{org}/actions/runners/{runner_id}/labels"
    ],
    addCustomLabelsToSelfHostedRunnerForRepo: [
      "POST /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"
    ],
    addRepoAccessToSelfHostedRunnerGroupInOrg: [
      "PUT /orgs/{org}/actions/runner-groups/{runner_group_id}/repositories/{repository_id}"
    ],
    addSelectedRepoToOrgSecret: [
      "PUT /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}"
    ],
    addSelectedRepoToOrgVariable: [
      "PUT /orgs/{org}/actions/variables/{name}/repositories/{repository_id}"
    ],
    approveWorkflowRun: [
      "POST /repos/{owner}/{repo}/actions/runs/{run_id}/approve"
    ],
    cancelWorkflowRun: [
      "POST /repos/{owner}/{repo}/actions/runs/{run_id}/cancel"
    ],
    createEnvironmentVariable: [
      "POST /repos/{owner}/{repo}/environments/{environment_name}/variables"
    ],
    createHostedRunnerForOrg: ["POST /orgs/{org}/actions/hosted-runners"],
    createOrUpdateEnvironmentSecret: [
      "PUT /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}"
    ],
    createOrUpdateOrgSecret: ["PUT /orgs/{org}/actions/secrets/{secret_name}"],
    createOrUpdateRepoSecret: [
      "PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}"
    ],
    createOrgVariable: ["POST /orgs/{org}/actions/variables"],
    createRegistrationTokenForOrg: [
      "POST /orgs/{org}/actions/runners/registration-token"
    ],
    createRegistrationTokenForRepo: [
      "POST /repos/{owner}/{repo}/actions/runners/registration-token"
    ],
    createRemoveTokenForOrg: ["POST /orgs/{org}/actions/runners/remove-token"],
    createRemoveTokenForRepo: [
      "POST /repos/{owner}/{repo}/actions/runners/remove-token"
    ],
    createRepoVariable: ["POST /repos/{owner}/{repo}/actions/variables"],
    createWorkflowDispatch: [
      "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches"
    ],
    deleteActionsCacheById: [
      "DELETE /repos/{owner}/{repo}/actions/caches/{cache_id}"
    ],
    deleteActionsCacheByKey: [
      "DELETE /repos/{owner}/{repo}/actions/caches{?key,ref}"
    ],
    deleteArtifact: [
      "DELETE /repos/{owner}/{repo}/actions/artifacts/{artifact_id}"
    ],
    deleteCustomImageFromOrg: [
      "DELETE /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}"
    ],
    deleteCustomImageVersionFromOrg: [
      "DELETE /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}/versions/{version}"
    ],
    deleteEnvironmentSecret: [
      "DELETE /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}"
    ],
    deleteEnvironmentVariable: [
      "DELETE /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}"
    ],
    deleteHostedRunnerForOrg: [
      "DELETE /orgs/{org}/actions/hosted-runners/{hosted_runner_id}"
    ],
    deleteOrgSecret: ["DELETE /orgs/{org}/actions/secrets/{secret_name}"],
    deleteOrgVariable: ["DELETE /orgs/{org}/actions/variables/{name}"],
    deleteRepoSecret: [
      "DELETE /repos/{owner}/{repo}/actions/secrets/{secret_name}"
    ],
    deleteRepoVariable: [
      "DELETE /repos/{owner}/{repo}/actions/variables/{name}"
    ],
    deleteSelfHostedRunnerFromOrg: [
      "DELETE /orgs/{org}/actions/runners/{runner_id}"
    ],
    deleteSelfHostedRunnerFromRepo: [
      "DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}"
    ],
    deleteWorkflowRun: ["DELETE /repos/{owner}/{repo}/actions/runs/{run_id}"],
    deleteWorkflowRunLogs: [
      "DELETE /repos/{owner}/{repo}/actions/runs/{run_id}/logs"
    ],
    disableSelectedRepositoryGithubActionsOrganization: [
      "DELETE /orgs/{org}/actions/permissions/repositories/{repository_id}"
    ],
    disableWorkflow: [
      "PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable"
    ],
    downloadArtifact: [
      "GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}"
    ],
    downloadJobLogsForWorkflowRun: [
      "GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs"
    ],
    downloadWorkflowRunAttemptLogs: [
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/logs"
    ],
    downloadWorkflowRunLogs: [
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs"
    ],
    enableSelectedRepositoryGithubActionsOrganization: [
      "PUT /orgs/{org}/actions/permissions/repositories/{repository_id}"
    ],
    enableWorkflow: [
      "PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable"
    ],
    forceCancelWorkflowRun: [
      "POST /repos/{owner}/{repo}/actions/runs/{run_id}/force-cancel"
    ],
    generateRunnerJitconfigForOrg: [
      "POST /orgs/{org}/actions/runners/generate-jitconfig"
    ],
    generateRunnerJitconfigForRepo: [
      "POST /repos/{owner}/{repo}/actions/runners/generate-jitconfig"
    ],
    getActionsCacheList: ["GET /repos/{owner}/{repo}/actions/caches"],
    getActionsCacheUsage: ["GET /repos/{owner}/{repo}/actions/cache/usage"],
    getActionsCacheUsageByRepoForOrg: [
      "GET /orgs/{org}/actions/cache/usage-by-repository"
    ],
    getActionsCacheUsageForOrg: ["GET /orgs/{org}/actions/cache/usage"],
    getAllowedActionsOrganization: [
      "GET /orgs/{org}/actions/permissions/selected-actions"
    ],
    getAllowedActionsRepository: [
      "GET /repos/{owner}/{repo}/actions/permissions/selected-actions"
    ],
    getArtifact: ["GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}"],
    getCustomImageForOrg: [
      "GET /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}"
    ],
    getCustomImageVersionForOrg: [
      "GET /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}/versions/{version}"
    ],
    getCustomOidcSubClaimForRepo: [
      "GET /repos/{owner}/{repo}/actions/oidc/customization/sub"
    ],
    getEnvironmentPublicKey: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/secrets/public-key"
    ],
    getEnvironmentSecret: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}"
    ],
    getEnvironmentVariable: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}"
    ],
    getGithubActionsDefaultWorkflowPermissionsOrganization: [
      "GET /orgs/{org}/actions/permissions/workflow"
    ],
    getGithubActionsDefaultWorkflowPermissionsRepository: [
      "GET /repos/{owner}/{repo}/actions/permissions/workflow"
    ],
    getGithubActionsPermissionsOrganization: [
      "GET /orgs/{org}/actions/permissions"
    ],
    getGithubActionsPermissionsRepository: [
      "GET /repos/{owner}/{repo}/actions/permissions"
    ],
    getHostedRunnerForOrg: [
      "GET /orgs/{org}/actions/hosted-runners/{hosted_runner_id}"
    ],
    getHostedRunnersGithubOwnedImagesForOrg: [
      "GET /orgs/{org}/actions/hosted-runners/images/github-owned"
    ],
    getHostedRunnersLimitsForOrg: [
      "GET /orgs/{org}/actions/hosted-runners/limits"
    ],
    getHostedRunnersMachineSpecsForOrg: [
      "GET /orgs/{org}/actions/hosted-runners/machine-sizes"
    ],
    getHostedRunnersPartnerImagesForOrg: [
      "GET /orgs/{org}/actions/hosted-runners/images/partner"
    ],
    getHostedRunnersPlatformsForOrg: [
      "GET /orgs/{org}/actions/hosted-runners/platforms"
    ],
    getJobForWorkflowRun: ["GET /repos/{owner}/{repo}/actions/jobs/{job_id}"],
    getOrgPublicKey: ["GET /orgs/{org}/actions/secrets/public-key"],
    getOrgSecret: ["GET /orgs/{org}/actions/secrets/{secret_name}"],
    getOrgVariable: ["GET /orgs/{org}/actions/variables/{name}"],
    getPendingDeploymentsForRun: [
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments"
    ],
    getRepoPermissions: [
      "GET /repos/{owner}/{repo}/actions/permissions",
      {},
      { renamed: ["actions", "getGithubActionsPermissionsRepository"] }
    ],
    getRepoPublicKey: ["GET /repos/{owner}/{repo}/actions/secrets/public-key"],
    getRepoSecret: ["GET /repos/{owner}/{repo}/actions/secrets/{secret_name}"],
    getRepoVariable: ["GET /repos/{owner}/{repo}/actions/variables/{name}"],
    getReviewsForRun: [
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/approvals"
    ],
    getSelfHostedRunnerForOrg: ["GET /orgs/{org}/actions/runners/{runner_id}"],
    getSelfHostedRunnerForRepo: [
      "GET /repos/{owner}/{repo}/actions/runners/{runner_id}"
    ],
    getWorkflow: ["GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}"],
    getWorkflowAccessToRepository: [
      "GET /repos/{owner}/{repo}/actions/permissions/access"
    ],
    getWorkflowRun: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}"],
    getWorkflowRunAttempt: [
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}"
    ],
    getWorkflowRunUsage: [
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/timing"
    ],
    getWorkflowUsage: [
      "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/timing"
    ],
    listArtifactsForRepo: ["GET /repos/{owner}/{repo}/actions/artifacts"],
    listCustomImageVersionsForOrg: [
      "GET /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}/versions"
    ],
    listCustomImagesForOrg: [
      "GET /orgs/{org}/actions/hosted-runners/images/custom"
    ],
    listEnvironmentSecrets: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/secrets"
    ],
    listEnvironmentVariables: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/variables"
    ],
    listGithubHostedRunnersInGroupForOrg: [
      "GET /orgs/{org}/actions/runner-groups/{runner_group_id}/hosted-runners"
    ],
    listHostedRunnersForOrg: ["GET /orgs/{org}/actions/hosted-runners"],
    listJobsForWorkflowRun: [
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs"
    ],
    listJobsForWorkflowRunAttempt: [
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs"
    ],
    listLabelsForSelfHostedRunnerForOrg: [
      "GET /orgs/{org}/actions/runners/{runner_id}/labels"
    ],
    listLabelsForSelfHostedRunnerForRepo: [
      "GET /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"
    ],
    listOrgSecrets: ["GET /orgs/{org}/actions/secrets"],
    listOrgVariables: ["GET /orgs/{org}/actions/variables"],
    listRepoOrganizationSecrets: [
      "GET /repos/{owner}/{repo}/actions/organization-secrets"
    ],
    listRepoOrganizationVariables: [
      "GET /repos/{owner}/{repo}/actions/organization-variables"
    ],
    listRepoSecrets: ["GET /repos/{owner}/{repo}/actions/secrets"],
    listRepoVariables: ["GET /repos/{owner}/{repo}/actions/variables"],
    listRepoWorkflows: ["GET /repos/{owner}/{repo}/actions/workflows"],
    listRunnerApplicationsForOrg: ["GET /orgs/{org}/actions/runners/downloads"],
    listRunnerApplicationsForRepo: [
      "GET /repos/{owner}/{repo}/actions/runners/downloads"
    ],
    listSelectedReposForOrgSecret: [
      "GET /orgs/{org}/actions/secrets/{secret_name}/repositories"
    ],
    listSelectedReposForOrgVariable: [
      "GET /orgs/{org}/actions/variables/{name}/repositories"
    ],
    listSelectedRepositoriesEnabledGithubActionsOrganization: [
      "GET /orgs/{org}/actions/permissions/repositories"
    ],
    listSelfHostedRunnersForOrg: ["GET /orgs/{org}/actions/runners"],
    listSelfHostedRunnersForRepo: ["GET /repos/{owner}/{repo}/actions/runners"],
    listWorkflowRunArtifacts: [
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts"
    ],
    listWorkflowRuns: [
      "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs"
    ],
    listWorkflowRunsForRepo: ["GET /repos/{owner}/{repo}/actions/runs"],
    reRunJobForWorkflowRun: [
      "POST /repos/{owner}/{repo}/actions/jobs/{job_id}/rerun"
    ],
    reRunWorkflow: ["POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun"],
    reRunWorkflowFailedJobs: [
      "POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun-failed-jobs"
    ],
    removeAllCustomLabelsFromSelfHostedRunnerForOrg: [
      "DELETE /orgs/{org}/actions/runners/{runner_id}/labels"
    ],
    removeAllCustomLabelsFromSelfHostedRunnerForRepo: [
      "DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"
    ],
    removeCustomLabelFromSelfHostedRunnerForOrg: [
      "DELETE /orgs/{org}/actions/runners/{runner_id}/labels/{name}"
    ],
    removeCustomLabelFromSelfHostedRunnerForRepo: [
      "DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}/labels/{name}"
    ],
    removeSelectedRepoFromOrgSecret: [
      "DELETE /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}"
    ],
    removeSelectedRepoFromOrgVariable: [
      "DELETE /orgs/{org}/actions/variables/{name}/repositories/{repository_id}"
    ],
    reviewCustomGatesForRun: [
      "POST /repos/{owner}/{repo}/actions/runs/{run_id}/deployment_protection_rule"
    ],
    reviewPendingDeploymentsForRun: [
      "POST /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments"
    ],
    setAllowedActionsOrganization: [
      "PUT /orgs/{org}/actions/permissions/selected-actions"
    ],
    setAllowedActionsRepository: [
      "PUT /repos/{owner}/{repo}/actions/permissions/selected-actions"
    ],
    setCustomLabelsForSelfHostedRunnerForOrg: [
      "PUT /orgs/{org}/actions/runners/{runner_id}/labels"
    ],
    setCustomLabelsForSelfHostedRunnerForRepo: [
      "PUT /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"
    ],
    setCustomOidcSubClaimForRepo: [
      "PUT /repos/{owner}/{repo}/actions/oidc/customization/sub"
    ],
    setGithubActionsDefaultWorkflowPermissionsOrganization: [
      "PUT /orgs/{org}/actions/permissions/workflow"
    ],
    setGithubActionsDefaultWorkflowPermissionsRepository: [
      "PUT /repos/{owner}/{repo}/actions/permissions/workflow"
    ],
    setGithubActionsPermissionsOrganization: [
      "PUT /orgs/{org}/actions/permissions"
    ],
    setGithubActionsPermissionsRepository: [
      "PUT /repos/{owner}/{repo}/actions/permissions"
    ],
    setSelectedReposForOrgSecret: [
      "PUT /orgs/{org}/actions/secrets/{secret_name}/repositories"
    ],
    setSelectedReposForOrgVariable: [
      "PUT /orgs/{org}/actions/variables/{name}/repositories"
    ],
    setSelectedRepositoriesEnabledGithubActionsOrganization: [
      "PUT /orgs/{org}/actions/permissions/repositories"
    ],
    setWorkflowAccessToRepository: [
      "PUT /repos/{owner}/{repo}/actions/permissions/access"
    ],
    updateEnvironmentVariable: [
      "PATCH /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}"
    ],
    updateHostedRunnerForOrg: [
      "PATCH /orgs/{org}/actions/hosted-runners/{hosted_runner_id}"
    ],
    updateOrgVariable: ["PATCH /orgs/{org}/actions/variables/{name}"],
    updateRepoVariable: [
      "PATCH /repos/{owner}/{repo}/actions/variables/{name}"
    ]
  },
  activity: {
    checkRepoIsStarredByAuthenticatedUser: ["GET /user/starred/{owner}/{repo}"],
    deleteRepoSubscription: ["DELETE /repos/{owner}/{repo}/subscription"],
    deleteThreadSubscription: [
      "DELETE /notifications/threads/{thread_id}/subscription"
    ],
    getFeeds: ["GET /feeds"],
    getRepoSubscription: ["GET /repos/{owner}/{repo}/subscription"],
    getThread: ["GET /notifications/threads/{thread_id}"],
    getThreadSubscriptionForAuthenticatedUser: [
      "GET /notifications/threads/{thread_id}/subscription"
    ],
    listEventsForAuthenticatedUser: ["GET /users/{username}/events"],
    listNotificationsForAuthenticatedUser: ["GET /notifications"],
    listOrgEventsForAuthenticatedUser: [
      "GET /users/{username}/events/orgs/{org}"
    ],
    listPublicEvents: ["GET /events"],
    listPublicEventsForRepoNetwork: ["GET /networks/{owner}/{repo}/events"],
    listPublicEventsForUser: ["GET /users/{username}/events/public"],
    listPublicOrgEvents: ["GET /orgs/{org}/events"],
    listReceivedEventsForUser: ["GET /users/{username}/received_events"],
    listReceivedPublicEventsForUser: [
      "GET /users/{username}/received_events/public"
    ],
    listRepoEvents: ["GET /repos/{owner}/{repo}/events"],
    listRepoNotificationsForAuthenticatedUser: [
      "GET /repos/{owner}/{repo}/notifications"
    ],
    listReposStarredByAuthenticatedUser: ["GET /user/starred"],
    listReposStarredByUser: ["GET /users/{username}/starred"],
    listReposWatchedByUser: ["GET /users/{username}/subscriptions"],
    listStargazersForRepo: ["GET /repos/{owner}/{repo}/stargazers"],
    listWatchedReposForAuthenticatedUser: ["GET /user/subscriptions"],
    listWatchersForRepo: ["GET /repos/{owner}/{repo}/subscribers"],
    markNotificationsAsRead: ["PUT /notifications"],
    markRepoNotificationsAsRead: ["PUT /repos/{owner}/{repo}/notifications"],
    markThreadAsDone: ["DELETE /notifications/threads/{thread_id}"],
    markThreadAsRead: ["PATCH /notifications/threads/{thread_id}"],
    setRepoSubscription: ["PUT /repos/{owner}/{repo}/subscription"],
    setThreadSubscription: [
      "PUT /notifications/threads/{thread_id}/subscription"
    ],
    starRepoForAuthenticatedUser: ["PUT /user/starred/{owner}/{repo}"],
    unstarRepoForAuthenticatedUser: ["DELETE /user/starred/{owner}/{repo}"]
  },
  apps: {
    addRepoToInstallation: [
      "PUT /user/installations/{installation_id}/repositories/{repository_id}",
      {},
      { renamed: ["apps", "addRepoToInstallationForAuthenticatedUser"] }
    ],
    addRepoToInstallationForAuthenticatedUser: [
      "PUT /user/installations/{installation_id}/repositories/{repository_id}"
    ],
    checkToken: ["POST /applications/{client_id}/token"],
    createFromManifest: ["POST /app-manifests/{code}/conversions"],
    createInstallationAccessToken: [
      "POST /app/installations/{installation_id}/access_tokens"
    ],
    deleteAuthorization: ["DELETE /applications/{client_id}/grant"],
    deleteInstallation: ["DELETE /app/installations/{installation_id}"],
    deleteToken: ["DELETE /applications/{client_id}/token"],
    getAuthenticated: ["GET /app"],
    getBySlug: ["GET /apps/{app_slug}"],
    getInstallation: ["GET /app/installations/{installation_id}"],
    getOrgInstallation: ["GET /orgs/{org}/installation"],
    getRepoInstallation: ["GET /repos/{owner}/{repo}/installation"],
    getSubscriptionPlanForAccount: [
      "GET /marketplace_listing/accounts/{account_id}"
    ],
    getSubscriptionPlanForAccountStubbed: [
      "GET /marketplace_listing/stubbed/accounts/{account_id}"
    ],
    getUserInstallation: ["GET /users/{username}/installation"],
    getWebhookConfigForApp: ["GET /app/hook/config"],
    getWebhookDelivery: ["GET /app/hook/deliveries/{delivery_id}"],
    listAccountsForPlan: ["GET /marketplace_listing/plans/{plan_id}/accounts"],
    listAccountsForPlanStubbed: [
      "GET /marketplace_listing/stubbed/plans/{plan_id}/accounts"
    ],
    listInstallationReposForAuthenticatedUser: [
      "GET /user/installations/{installation_id}/repositories"
    ],
    listInstallationRequestsForAuthenticatedApp: [
      "GET /app/installation-requests"
    ],
    listInstallations: ["GET /app/installations"],
    listInstallationsForAuthenticatedUser: ["GET /user/installations"],
    listPlans: ["GET /marketplace_listing/plans"],
    listPlansStubbed: ["GET /marketplace_listing/stubbed/plans"],
    listReposAccessibleToInstallation: ["GET /installation/repositories"],
    listSubscriptionsForAuthenticatedUser: ["GET /user/marketplace_purchases"],
    listSubscriptionsForAuthenticatedUserStubbed: [
      "GET /user/marketplace_purchases/stubbed"
    ],
    listWebhookDeliveries: ["GET /app/hook/deliveries"],
    redeliverWebhookDelivery: [
      "POST /app/hook/deliveries/{delivery_id}/attempts"
    ],
    removeRepoFromInstallation: [
      "DELETE /user/installations/{installation_id}/repositories/{repository_id}",
      {},
      { renamed: ["apps", "removeRepoFromInstallationForAuthenticatedUser"] }
    ],
    removeRepoFromInstallationForAuthenticatedUser: [
      "DELETE /user/installations/{installation_id}/repositories/{repository_id}"
    ],
    resetToken: ["PATCH /applications/{client_id}/token"],
    revokeInstallationAccessToken: ["DELETE /installation/token"],
    scopeToken: ["POST /applications/{client_id}/token/scoped"],
    suspendInstallation: ["PUT /app/installations/{installation_id}/suspended"],
    unsuspendInstallation: [
      "DELETE /app/installations/{installation_id}/suspended"
    ],
    updateWebhookConfigForApp: ["PATCH /app/hook/config"]
  },
  billing: {
    getGithubActionsBillingOrg: ["GET /orgs/{org}/settings/billing/actions"],
    getGithubActionsBillingUser: [
      "GET /users/{username}/settings/billing/actions"
    ],
    getGithubBillingPremiumRequestUsageReportOrg: [
      "GET /organizations/{org}/settings/billing/premium_request/usage"
    ],
    getGithubBillingPremiumRequestUsageReportUser: [
      "GET /users/{username}/settings/billing/premium_request/usage"
    ],
    getGithubBillingUsageReportOrg: [
      "GET /organizations/{org}/settings/billing/usage"
    ],
    getGithubBillingUsageReportUser: [
      "GET /users/{username}/settings/billing/usage"
    ],
    getGithubPackagesBillingOrg: ["GET /orgs/{org}/settings/billing/packages"],
    getGithubPackagesBillingUser: [
      "GET /users/{username}/settings/billing/packages"
    ],
    getSharedStorageBillingOrg: [
      "GET /orgs/{org}/settings/billing/shared-storage"
    ],
    getSharedStorageBillingUser: [
      "GET /users/{username}/settings/billing/shared-storage"
    ]
  },
  campaigns: {
    createCampaign: ["POST /orgs/{org}/campaigns"],
    deleteCampaign: ["DELETE /orgs/{org}/campaigns/{campaign_number}"],
    getCampaignSummary: ["GET /orgs/{org}/campaigns/{campaign_number}"],
    listOrgCampaigns: ["GET /orgs/{org}/campaigns"],
    updateCampaign: ["PATCH /orgs/{org}/campaigns/{campaign_number}"]
  },
  checks: {
    create: ["POST /repos/{owner}/{repo}/check-runs"],
    createSuite: ["POST /repos/{owner}/{repo}/check-suites"],
    get: ["GET /repos/{owner}/{repo}/check-runs/{check_run_id}"],
    getSuite: ["GET /repos/{owner}/{repo}/check-suites/{check_suite_id}"],
    listAnnotations: [
      "GET /repos/{owner}/{repo}/check-runs/{check_run_id}/annotations"
    ],
    listForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/check-runs"],
    listForSuite: [
      "GET /repos/{owner}/{repo}/check-suites/{check_suite_id}/check-runs"
    ],
    listSuitesForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/check-suites"],
    rerequestRun: [
      "POST /repos/{owner}/{repo}/check-runs/{check_run_id}/rerequest"
    ],
    rerequestSuite: [
      "POST /repos/{owner}/{repo}/check-suites/{check_suite_id}/rerequest"
    ],
    setSuitesPreferences: [
      "PATCH /repos/{owner}/{repo}/check-suites/preferences"
    ],
    update: ["PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}"]
  },
  codeScanning: {
    commitAutofix: [
      "POST /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix/commits"
    ],
    createAutofix: [
      "POST /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix"
    ],
    createVariantAnalysis: [
      "POST /repos/{owner}/{repo}/code-scanning/codeql/variant-analyses"
    ],
    deleteAnalysis: [
      "DELETE /repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}{?confirm_delete}"
    ],
    deleteCodeqlDatabase: [
      "DELETE /repos/{owner}/{repo}/code-scanning/codeql/databases/{language}"
    ],
    getAlert: [
      "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}",
      {},
      { renamedParameters: { alert_id: "alert_number" } }
    ],
    getAnalysis: [
      "GET /repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}"
    ],
    getAutofix: [
      "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix"
    ],
    getCodeqlDatabase: [
      "GET /repos/{owner}/{repo}/code-scanning/codeql/databases/{language}"
    ],
    getDefaultSetup: ["GET /repos/{owner}/{repo}/code-scanning/default-setup"],
    getSarif: ["GET /repos/{owner}/{repo}/code-scanning/sarifs/{sarif_id}"],
    getVariantAnalysis: [
      "GET /repos/{owner}/{repo}/code-scanning/codeql/variant-analyses/{codeql_variant_analysis_id}"
    ],
    getVariantAnalysisRepoTask: [
      "GET /repos/{owner}/{repo}/code-scanning/codeql/variant-analyses/{codeql_variant_analysis_id}/repos/{repo_owner}/{repo_name}"
    ],
    listAlertInstances: [
      "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances"
    ],
    listAlertsForOrg: ["GET /orgs/{org}/code-scanning/alerts"],
    listAlertsForRepo: ["GET /repos/{owner}/{repo}/code-scanning/alerts"],
    listAlertsInstances: [
      "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances",
      {},
      { renamed: ["codeScanning", "listAlertInstances"] }
    ],
    listCodeqlDatabases: [
      "GET /repos/{owner}/{repo}/code-scanning/codeql/databases"
    ],
    listRecentAnalyses: ["GET /repos/{owner}/{repo}/code-scanning/analyses"],
    updateAlert: [
      "PATCH /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}"
    ],
    updateDefaultSetup: [
      "PATCH /repos/{owner}/{repo}/code-scanning/default-setup"
    ],
    uploadSarif: ["POST /repos/{owner}/{repo}/code-scanning/sarifs"]
  },
  codeSecurity: {
    attachConfiguration: [
      "POST /orgs/{org}/code-security/configurations/{configuration_id}/attach"
    ],
    attachEnterpriseConfiguration: [
      "POST /enterprises/{enterprise}/code-security/configurations/{configuration_id}/attach"
    ],
    createConfiguration: ["POST /orgs/{org}/code-security/configurations"],
    createConfigurationForEnterprise: [
      "POST /enterprises/{enterprise}/code-security/configurations"
    ],
    deleteConfiguration: [
      "DELETE /orgs/{org}/code-security/configurations/{configuration_id}"
    ],
    deleteConfigurationForEnterprise: [
      "DELETE /enterprises/{enterprise}/code-security/configurations/{configuration_id}"
    ],
    detachConfiguration: [
      "DELETE /orgs/{org}/code-security/configurations/detach"
    ],
    getConfiguration: [
      "GET /orgs/{org}/code-security/configurations/{configuration_id}"
    ],
    getConfigurationForRepository: [
      "GET /repos/{owner}/{repo}/code-security-configuration"
    ],
    getConfigurationsForEnterprise: [
      "GET /enterprises/{enterprise}/code-security/configurations"
    ],
    getConfigurationsForOrg: ["GET /orgs/{org}/code-security/configurations"],
    getDefaultConfigurations: [
      "GET /orgs/{org}/code-security/configurations/defaults"
    ],
    getDefaultConfigurationsForEnterprise: [
      "GET /enterprises/{enterprise}/code-security/configurations/defaults"
    ],
    getRepositoriesForConfiguration: [
      "GET /orgs/{org}/code-security/configurations/{configuration_id}/repositories"
    ],
    getRepositoriesForEnterpriseConfiguration: [
      "GET /enterprises/{enterprise}/code-security/configurations/{configuration_id}/repositories"
    ],
    getSingleConfigurationForEnterprise: [
      "GET /enterprises/{enterprise}/code-security/configurations/{configuration_id}"
    ],
    setConfigurationAsDefault: [
      "PUT /orgs/{org}/code-security/configurations/{configuration_id}/defaults"
    ],
    setConfigurationAsDefaultForEnterprise: [
      "PUT /enterprises/{enterprise}/code-security/configurations/{configuration_id}/defaults"
    ],
    updateConfiguration: [
      "PATCH /orgs/{org}/code-security/configurations/{configuration_id}"
    ],
    updateEnterpriseConfiguration: [
      "PATCH /enterprises/{enterprise}/code-security/configurations/{configuration_id}"
    ]
  },
  codesOfConduct: {
    getAllCodesOfConduct: ["GET /codes_of_conduct"],
    getConductCode: ["GET /codes_of_conduct/{key}"]
  },
  codespaces: {
    addRepositoryForSecretForAuthenticatedUser: [
      "PUT /user/codespaces/secrets/{secret_name}/repositories/{repository_id}"
    ],
    addSelectedRepoToOrgSecret: [
      "PUT /orgs/{org}/codespaces/secrets/{secret_name}/repositories/{repository_id}"
    ],
    checkPermissionsForDevcontainer: [
      "GET /repos/{owner}/{repo}/codespaces/permissions_check"
    ],
    codespaceMachinesForAuthenticatedUser: [
      "GET /user/codespaces/{codespace_name}/machines"
    ],
    createForAuthenticatedUser: ["POST /user/codespaces"],
    createOrUpdateOrgSecret: [
      "PUT /orgs/{org}/codespaces/secrets/{secret_name}"
    ],
    createOrUpdateRepoSecret: [
      "PUT /repos/{owner}/{repo}/codespaces/secrets/{secret_name}"
    ],
    createOrUpdateSecretForAuthenticatedUser: [
      "PUT /user/codespaces/secrets/{secret_name}"
    ],
    createWithPrForAuthenticatedUser: [
      "POST /repos/{owner}/{repo}/pulls/{pull_number}/codespaces"
    ],
    createWithRepoForAuthenticatedUser: [
      "POST /repos/{owner}/{repo}/codespaces"
    ],
    deleteForAuthenticatedUser: ["DELETE /user/codespaces/{codespace_name}"],
    deleteFromOrganization: [
      "DELETE /orgs/{org}/members/{username}/codespaces/{codespace_name}"
    ],
    deleteOrgSecret: ["DELETE /orgs/{org}/codespaces/secrets/{secret_name}"],
    deleteRepoSecret: [
      "DELETE /repos/{owner}/{repo}/codespaces/secrets/{secret_name}"
    ],
    deleteSecretForAuthenticatedUser: [
      "DELETE /user/codespaces/secrets/{secret_name}"
    ],
    exportForAuthenticatedUser: [
      "POST /user/codespaces/{codespace_name}/exports"
    ],
    getCodespacesForUserInOrg: [
      "GET /orgs/{org}/members/{username}/codespaces"
    ],
    getExportDetailsForAuthenticatedUser: [
      "GET /user/codespaces/{codespace_name}/exports/{export_id}"
    ],
    getForAuthenticatedUser: ["GET /user/codespaces/{codespace_name}"],
    getOrgPublicKey: ["GET /orgs/{org}/codespaces/secrets/public-key"],
    getOrgSecret: ["GET /orgs/{org}/codespaces/secrets/{secret_name}"],
    getPublicKeyForAuthenticatedUser: [
      "GET /user/codespaces/secrets/public-key"
    ],
    getRepoPublicKey: [
      "GET /repos/{owner}/{repo}/codespaces/secrets/public-key"
    ],
    getRepoSecret: [
      "GET /repos/{owner}/{repo}/codespaces/secrets/{secret_name}"
    ],
    getSecretForAuthenticatedUser: [
      "GET /user/codespaces/secrets/{secret_name}"
    ],
    listDevcontainersInRepositoryForAuthenticatedUser: [
      "GET /repos/{owner}/{repo}/codespaces/devcontainers"
    ],
    listForAuthenticatedUser: ["GET /user/codespaces"],
    listInOrganization: [
      "GET /orgs/{org}/codespaces",
      {},
      { renamedParameters: { org_id: "org" } }
    ],
    listInRepositoryForAuthenticatedUser: [
      "GET /repos/{owner}/{repo}/codespaces"
    ],
    listOrgSecrets: ["GET /orgs/{org}/codespaces/secrets"],
    listRepoSecrets: ["GET /repos/{owner}/{repo}/codespaces/secrets"],
    listRepositoriesForSecretForAuthenticatedUser: [
      "GET /user/codespaces/secrets/{secret_name}/repositories"
    ],
    listSecretsForAuthenticatedUser: ["GET /user/codespaces/secrets"],
    listSelectedReposForOrgSecret: [
      "GET /orgs/{org}/codespaces/secrets/{secret_name}/repositories"
    ],
    preFlightWithRepoForAuthenticatedUser: [
      "GET /repos/{owner}/{repo}/codespaces/new"
    ],
    publishForAuthenticatedUser: [
      "POST /user/codespaces/{codespace_name}/publish"
    ],
    removeRepositoryForSecretForAuthenticatedUser: [
      "DELETE /user/codespaces/secrets/{secret_name}/repositories/{repository_id}"
    ],
    removeSelectedRepoFromOrgSecret: [
      "DELETE /orgs/{org}/codespaces/secrets/{secret_name}/repositories/{repository_id}"
    ],
    repoMachinesForAuthenticatedUser: [
      "GET /repos/{owner}/{repo}/codespaces/machines"
    ],
    setRepositoriesForSecretForAuthenticatedUser: [
      "PUT /user/codespaces/secrets/{secret_name}/repositories"
    ],
    setSelectedReposForOrgSecret: [
      "PUT /orgs/{org}/codespaces/secrets/{secret_name}/repositories"
    ],
    startForAuthenticatedUser: ["POST /user/codespaces/{codespace_name}/start"],
    stopForAuthenticatedUser: ["POST /user/codespaces/{codespace_name}/stop"],
    stopInOrganization: [
      "POST /orgs/{org}/members/{username}/codespaces/{codespace_name}/stop"
    ],
    updateForAuthenticatedUser: ["PATCH /user/codespaces/{codespace_name}"]
  },
  copilot: {
    addCopilotSeatsForTeams: [
      "POST /orgs/{org}/copilot/billing/selected_teams"
    ],
    addCopilotSeatsForUsers: [
      "POST /orgs/{org}/copilot/billing/selected_users"
    ],
    cancelCopilotSeatAssignmentForTeams: [
      "DELETE /orgs/{org}/copilot/billing/selected_teams"
    ],
    cancelCopilotSeatAssignmentForUsers: [
      "DELETE /orgs/{org}/copilot/billing/selected_users"
    ],
    copilotMetricsForOrganization: ["GET /orgs/{org}/copilot/metrics"],
    copilotMetricsForTeam: ["GET /orgs/{org}/team/{team_slug}/copilot/metrics"],
    getCopilotOrganizationDetails: ["GET /orgs/{org}/copilot/billing"],
    getCopilotSeatDetailsForUser: [
      "GET /orgs/{org}/members/{username}/copilot"
    ],
    listCopilotSeats: ["GET /orgs/{org}/copilot/billing/seats"]
  },
  credentials: { revoke: ["POST /credentials/revoke"] },
  dependabot: {
    addSelectedRepoToOrgSecret: [
      "PUT /orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}"
    ],
    createOrUpdateOrgSecret: [
      "PUT /orgs/{org}/dependabot/secrets/{secret_name}"
    ],
    createOrUpdateRepoSecret: [
      "PUT /repos/{owner}/{repo}/dependabot/secrets/{secret_name}"
    ],
    deleteOrgSecret: ["DELETE /orgs/{org}/dependabot/secrets/{secret_name}"],
    deleteRepoSecret: [
      "DELETE /repos/{owner}/{repo}/dependabot/secrets/{secret_name}"
    ],
    getAlert: ["GET /repos/{owner}/{repo}/dependabot/alerts/{alert_number}"],
    getOrgPublicKey: ["GET /orgs/{org}/dependabot/secrets/public-key"],
    getOrgSecret: ["GET /orgs/{org}/dependabot/secrets/{secret_name}"],
    getRepoPublicKey: [
      "GET /repos/{owner}/{repo}/dependabot/secrets/public-key"
    ],
    getRepoSecret: [
      "GET /repos/{owner}/{repo}/dependabot/secrets/{secret_name}"
    ],
    listAlertsForEnterprise: [
      "GET /enterprises/{enterprise}/dependabot/alerts"
    ],
    listAlertsForOrg: ["GET /orgs/{org}/dependabot/alerts"],
    listAlertsForRepo: ["GET /repos/{owner}/{repo}/dependabot/alerts"],
    listOrgSecrets: ["GET /orgs/{org}/dependabot/secrets"],
    listRepoSecrets: ["GET /repos/{owner}/{repo}/dependabot/secrets"],
    listSelectedReposForOrgSecret: [
      "GET /orgs/{org}/dependabot/secrets/{secret_name}/repositories"
    ],
    removeSelectedRepoFromOrgSecret: [
      "DELETE /orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}"
    ],
    repositoryAccessForOrg: [
      "GET /organizations/{org}/dependabot/repository-access"
    ],
    setRepositoryAccessDefaultLevel: [
      "PUT /organizations/{org}/dependabot/repository-access/default-level"
    ],
    setSelectedReposForOrgSecret: [
      "PUT /orgs/{org}/dependabot/secrets/{secret_name}/repositories"
    ],
    updateAlert: [
      "PATCH /repos/{owner}/{repo}/dependabot/alerts/{alert_number}"
    ],
    updateRepositoryAccessForOrg: [
      "PATCH /organizations/{org}/dependabot/repository-access"
    ]
  },
  dependencyGraph: {
    createRepositorySnapshot: [
      "POST /repos/{owner}/{repo}/dependency-graph/snapshots"
    ],
    diffRange: [
      "GET /repos/{owner}/{repo}/dependency-graph/compare/{basehead}"
    ],
    exportSbom: ["GET /repos/{owner}/{repo}/dependency-graph/sbom"]
  },
  emojis: { get: ["GET /emojis"] },
  enterpriseTeamMemberships: {
    add: [
      "PUT /enterprises/{enterprise}/teams/{enterprise-team}/memberships/{username}"
    ],
    bulkAdd: [
      "POST /enterprises/{enterprise}/teams/{enterprise-team}/memberships/add"
    ],
    bulkRemove: [
      "POST /enterprises/{enterprise}/teams/{enterprise-team}/memberships/remove"
    ],
    get: [
      "GET /enterprises/{enterprise}/teams/{enterprise-team}/memberships/{username}"
    ],
    list: ["GET /enterprises/{enterprise}/teams/{enterprise-team}/memberships"],
    remove: [
      "DELETE /enterprises/{enterprise}/teams/{enterprise-team}/memberships/{username}"
    ]
  },
  enterpriseTeamOrganizations: {
    add: [
      "PUT /enterprises/{enterprise}/teams/{enterprise-team}/organizations/{org}"
    ],
    bulkAdd: [
      "POST /enterprises/{enterprise}/teams/{enterprise-team}/organizations/add"
    ],
    bulkRemove: [
      "POST /enterprises/{enterprise}/teams/{enterprise-team}/organizations/remove"
    ],
    delete: [
      "DELETE /enterprises/{enterprise}/teams/{enterprise-team}/organizations/{org}"
    ],
    getAssignment: [
      "GET /enterprises/{enterprise}/teams/{enterprise-team}/organizations/{org}"
    ],
    getAssignments: [
      "GET /enterprises/{enterprise}/teams/{enterprise-team}/organizations"
    ]
  },
  enterpriseTeams: {
    create: ["POST /enterprises/{enterprise}/teams"],
    delete: ["DELETE /enterprises/{enterprise}/teams/{team_slug}"],
    get: ["GET /enterprises/{enterprise}/teams/{team_slug}"],
    list: ["GET /enterprises/{enterprise}/teams"],
    update: ["PATCH /enterprises/{enterprise}/teams/{team_slug}"]
  },
  gists: {
    checkIsStarred: ["GET /gists/{gist_id}/star"],
    create: ["POST /gists"],
    createComment: ["POST /gists/{gist_id}/comments"],
    delete: ["DELETE /gists/{gist_id}"],
    deleteComment: ["DELETE /gists/{gist_id}/comments/{comment_id}"],
    fork: ["POST /gists/{gist_id}/forks"],
    get: ["GET /gists/{gist_id}"],
    getComment: ["GET /gists/{gist_id}/comments/{comment_id}"],
    getRevision: ["GET /gists/{gist_id}/{sha}"],
    list: ["GET /gists"],
    listComments: ["GET /gists/{gist_id}/comments"],
    listCommits: ["GET /gists/{gist_id}/commits"],
    listForUser: ["GET /users/{username}/gists"],
    listForks: ["GET /gists/{gist_id}/forks"],
    listPublic: ["GET /gists/public"],
    listStarred: ["GET /gists/starred"],
    star: ["PUT /gists/{gist_id}/star"],
    unstar: ["DELETE /gists/{gist_id}/star"],
    update: ["PATCH /gists/{gist_id}"],
    updateComment: ["PATCH /gists/{gist_id}/comments/{comment_id}"]
  },
  git: {
    createBlob: ["POST /repos/{owner}/{repo}/git/blobs"],
    createCommit: ["POST /repos/{owner}/{repo}/git/commits"],
    createRef: ["POST /repos/{owner}/{repo}/git/refs"],
    createTag: ["POST /repos/{owner}/{repo}/git/tags"],
    createTree: ["POST /repos/{owner}/{repo}/git/trees"],
    deleteRef: ["DELETE /repos/{owner}/{repo}/git/refs/{ref}"],
    getBlob: ["GET /repos/{owner}/{repo}/git/blobs/{file_sha}"],
    getCommit: ["GET /repos/{owner}/{repo}/git/commits/{commit_sha}"],
    getRef: ["GET /repos/{owner}/{repo}/git/ref/{ref}"],
    getTag: ["GET /repos/{owner}/{repo}/git/tags/{tag_sha}"],
    getTree: ["GET /repos/{owner}/{repo}/git/trees/{tree_sha}"],
    listMatchingRefs: ["GET /repos/{owner}/{repo}/git/matching-refs/{ref}"],
    updateRef: ["PATCH /repos/{owner}/{repo}/git/refs/{ref}"]
  },
  gitignore: {
    getAllTemplates: ["GET /gitignore/templates"],
    getTemplate: ["GET /gitignore/templates/{name}"]
  },
  hostedCompute: {
    createNetworkConfigurationForOrg: [
      "POST /orgs/{org}/settings/network-configurations"
    ],
    deleteNetworkConfigurationFromOrg: [
      "DELETE /orgs/{org}/settings/network-configurations/{network_configuration_id}"
    ],
    getNetworkConfigurationForOrg: [
      "GET /orgs/{org}/settings/network-configurations/{network_configuration_id}"
    ],
    getNetworkSettingsForOrg: [
      "GET /orgs/{org}/settings/network-settings/{network_settings_id}"
    ],
    listNetworkConfigurationsForOrg: [
      "GET /orgs/{org}/settings/network-configurations"
    ],
    updateNetworkConfigurationForOrg: [
      "PATCH /orgs/{org}/settings/network-configurations/{network_configuration_id}"
    ]
  },
  interactions: {
    getRestrictionsForAuthenticatedUser: ["GET /user/interaction-limits"],
    getRestrictionsForOrg: ["GET /orgs/{org}/interaction-limits"],
    getRestrictionsForRepo: ["GET /repos/{owner}/{repo}/interaction-limits"],
    getRestrictionsForYourPublicRepos: [
      "GET /user/interaction-limits",
      {},
      { renamed: ["interactions", "getRestrictionsForAuthenticatedUser"] }
    ],
    removeRestrictionsForAuthenticatedUser: ["DELETE /user/interaction-limits"],
    removeRestrictionsForOrg: ["DELETE /orgs/{org}/interaction-limits"],
    removeRestrictionsForRepo: [
      "DELETE /repos/{owner}/{repo}/interaction-limits"
    ],
    removeRestrictionsForYourPublicRepos: [
      "DELETE /user/interaction-limits",
      {},
      { renamed: ["interactions", "removeRestrictionsForAuthenticatedUser"] }
    ],
    setRestrictionsForAuthenticatedUser: ["PUT /user/interaction-limits"],
    setRestrictionsForOrg: ["PUT /orgs/{org}/interaction-limits"],
    setRestrictionsForRepo: ["PUT /repos/{owner}/{repo}/interaction-limits"],
    setRestrictionsForYourPublicRepos: [
      "PUT /user/interaction-limits",
      {},
      { renamed: ["interactions", "setRestrictionsForAuthenticatedUser"] }
    ]
  },
  issues: {
    addAssignees: [
      "POST /repos/{owner}/{repo}/issues/{issue_number}/assignees"
    ],
    addBlockedByDependency: [
      "POST /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by"
    ],
    addLabels: ["POST /repos/{owner}/{repo}/issues/{issue_number}/labels"],
    addSubIssue: [
      "POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues"
    ],
    checkUserCanBeAssigned: ["GET /repos/{owner}/{repo}/assignees/{assignee}"],
    checkUserCanBeAssignedToIssue: [
      "GET /repos/{owner}/{repo}/issues/{issue_number}/assignees/{assignee}"
    ],
    create: ["POST /repos/{owner}/{repo}/issues"],
    createComment: [
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments"
    ],
    createLabel: ["POST /repos/{owner}/{repo}/labels"],
    createMilestone: ["POST /repos/{owner}/{repo}/milestones"],
    deleteComment: [
      "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}"
    ],
    deleteLabel: ["DELETE /repos/{owner}/{repo}/labels/{name}"],
    deleteMilestone: [
      "DELETE /repos/{owner}/{repo}/milestones/{milestone_number}"
    ],
    get: ["GET /repos/{owner}/{repo}/issues/{issue_number}"],
    getComment: ["GET /repos/{owner}/{repo}/issues/comments/{comment_id}"],
    getEvent: ["GET /repos/{owner}/{repo}/issues/events/{event_id}"],
    getLabel: ["GET /repos/{owner}/{repo}/labels/{name}"],
    getMilestone: ["GET /repos/{owner}/{repo}/milestones/{milestone_number}"],
    getParent: ["GET /repos/{owner}/{repo}/issues/{issue_number}/parent"],
    list: ["GET /issues"],
    listAssignees: ["GET /repos/{owner}/{repo}/assignees"],
    listComments: ["GET /repos/{owner}/{repo}/issues/{issue_number}/comments"],
    listCommentsForRepo: ["GET /repos/{owner}/{repo}/issues/comments"],
    listDependenciesBlockedBy: [
      "GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by"
    ],
    listDependenciesBlocking: [
      "GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocking"
    ],
    listEvents: ["GET /repos/{owner}/{repo}/issues/{issue_number}/events"],
    listEventsForRepo: ["GET /repos/{owner}/{repo}/issues/events"],
    listEventsForTimeline: [
      "GET /repos/{owner}/{repo}/issues/{issue_number}/timeline"
    ],
    listForAuthenticatedUser: ["GET /user/issues"],
    listForOrg: ["GET /orgs/{org}/issues"],
    listForRepo: ["GET /repos/{owner}/{repo}/issues"],
    listLabelsForMilestone: [
      "GET /repos/{owner}/{repo}/milestones/{milestone_number}/labels"
    ],
    listLabelsForRepo: ["GET /repos/{owner}/{repo}/labels"],
    listLabelsOnIssue: [
      "GET /repos/{owner}/{repo}/issues/{issue_number}/labels"
    ],
    listMilestones: ["GET /repos/{owner}/{repo}/milestones"],
    listSubIssues: [
      "GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues"
    ],
    lock: ["PUT /repos/{owner}/{repo}/issues/{issue_number}/lock"],
    removeAllLabels: [
      "DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels"
    ],
    removeAssignees: [
      "DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees"
    ],
    removeDependencyBlockedBy: [
      "DELETE /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by/{issue_id}"
    ],
    removeLabel: [
      "DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}"
    ],
    removeSubIssue: [
      "DELETE /repos/{owner}/{repo}/issues/{issue_number}/sub_issue"
    ],
    reprioritizeSubIssue: [
      "PATCH /repos/{owner}/{repo}/issues/{issue_number}/sub_issues/priority"
    ],
    setLabels: ["PUT /repos/{owner}/{repo}/issues/{issue_number}/labels"],
    unlock: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/lock"],
    update: ["PATCH /repos/{owner}/{repo}/issues/{issue_number}"],
    updateComment: ["PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}"],
    updateLabel: ["PATCH /repos/{owner}/{repo}/labels/{name}"],
    updateMilestone: [
      "PATCH /repos/{owner}/{repo}/milestones/{milestone_number}"
    ]
  },
  licenses: {
    get: ["GET /licenses/{license}"],
    getAllCommonlyUsed: ["GET /licenses"],
    getForRepo: ["GET /repos/{owner}/{repo}/license"]
  },
  markdown: {
    render: ["POST /markdown"],
    renderRaw: [
      "POST /markdown/raw",
      { headers: { "content-type": "text/plain; charset=utf-8" } }
    ]
  },
  meta: {
    get: ["GET /meta"],
    getAllVersions: ["GET /versions"],
    getOctocat: ["GET /octocat"],
    getZen: ["GET /zen"],
    root: ["GET /"]
  },
  migrations: {
    deleteArchiveForAuthenticatedUser: [
      "DELETE /user/migrations/{migration_id}/archive"
    ],
    deleteArchiveForOrg: [
      "DELETE /orgs/{org}/migrations/{migration_id}/archive"
    ],
    downloadArchiveForOrg: [
      "GET /orgs/{org}/migrations/{migration_id}/archive"
    ],
    getArchiveForAuthenticatedUser: [
      "GET /user/migrations/{migration_id}/archive"
    ],
    getStatusForAuthenticatedUser: ["GET /user/migrations/{migration_id}"],
    getStatusForOrg: ["GET /orgs/{org}/migrations/{migration_id}"],
    listForAuthenticatedUser: ["GET /user/migrations"],
    listForOrg: ["GET /orgs/{org}/migrations"],
    listReposForAuthenticatedUser: [
      "GET /user/migrations/{migration_id}/repositories"
    ],
    listReposForOrg: ["GET /orgs/{org}/migrations/{migration_id}/repositories"],
    listReposForUser: [
      "GET /user/migrations/{migration_id}/repositories",
      {},
      { renamed: ["migrations", "listReposForAuthenticatedUser"] }
    ],
    startForAuthenticatedUser: ["POST /user/migrations"],
    startForOrg: ["POST /orgs/{org}/migrations"],
    unlockRepoForAuthenticatedUser: [
      "DELETE /user/migrations/{migration_id}/repos/{repo_name}/lock"
    ],
    unlockRepoForOrg: [
      "DELETE /orgs/{org}/migrations/{migration_id}/repos/{repo_name}/lock"
    ]
  },
  oidc: {
    getOidcCustomSubTemplateForOrg: [
      "GET /orgs/{org}/actions/oidc/customization/sub"
    ],
    updateOidcCustomSubTemplateForOrg: [
      "PUT /orgs/{org}/actions/oidc/customization/sub"
    ]
  },
  orgs: {
    addSecurityManagerTeam: [
      "PUT /orgs/{org}/security-managers/teams/{team_slug}",
      {},
      {
        deprecated: "octokit.rest.orgs.addSecurityManagerTeam() is deprecated, see https://docs.github.com/rest/orgs/security-managers#add-a-security-manager-team"
      }
    ],
    assignTeamToOrgRole: [
      "PUT /orgs/{org}/organization-roles/teams/{team_slug}/{role_id}"
    ],
    assignUserToOrgRole: [
      "PUT /orgs/{org}/organization-roles/users/{username}/{role_id}"
    ],
    blockUser: ["PUT /orgs/{org}/blocks/{username}"],
    cancelInvitation: ["DELETE /orgs/{org}/invitations/{invitation_id}"],
    checkBlockedUser: ["GET /orgs/{org}/blocks/{username}"],
    checkMembershipForUser: ["GET /orgs/{org}/members/{username}"],
    checkPublicMembershipForUser: ["GET /orgs/{org}/public_members/{username}"],
    convertMemberToOutsideCollaborator: [
      "PUT /orgs/{org}/outside_collaborators/{username}"
    ],
    createArtifactStorageRecord: [
      "POST /orgs/{org}/artifacts/metadata/storage-record"
    ],
    createInvitation: ["POST /orgs/{org}/invitations"],
    createIssueType: ["POST /orgs/{org}/issue-types"],
    createWebhook: ["POST /orgs/{org}/hooks"],
    customPropertiesForOrgsCreateOrUpdateOrganizationValues: [
      "PATCH /organizations/{org}/org-properties/values"
    ],
    customPropertiesForOrgsGetOrganizationValues: [
      "GET /organizations/{org}/org-properties/values"
    ],
    customPropertiesForReposCreateOrUpdateOrganizationDefinition: [
      "PUT /orgs/{org}/properties/schema/{custom_property_name}"
    ],
    customPropertiesForReposCreateOrUpdateOrganizationDefinitions: [
      "PATCH /orgs/{org}/properties/schema"
    ],
    customPropertiesForReposCreateOrUpdateOrganizationValues: [
      "PATCH /orgs/{org}/properties/values"
    ],
    customPropertiesForReposDeleteOrganizationDefinition: [
      "DELETE /orgs/{org}/properties/schema/{custom_property_name}"
    ],
    customPropertiesForReposGetOrganizationDefinition: [
      "GET /orgs/{org}/properties/schema/{custom_property_name}"
    ],
    customPropertiesForReposGetOrganizationDefinitions: [
      "GET /orgs/{org}/properties/schema"
    ],
    customPropertiesForReposGetOrganizationValues: [
      "GET /orgs/{org}/properties/values"
    ],
    delete: ["DELETE /orgs/{org}"],
    deleteAttestationsBulk: ["POST /orgs/{org}/attestations/delete-request"],
    deleteAttestationsById: [
      "DELETE /orgs/{org}/attestations/{attestation_id}"
    ],
    deleteAttestationsBySubjectDigest: [
      "DELETE /orgs/{org}/attestations/digest/{subject_digest}"
    ],
    deleteIssueType: ["DELETE /orgs/{org}/issue-types/{issue_type_id}"],
    deleteWebhook: ["DELETE /orgs/{org}/hooks/{hook_id}"],
    disableSelectedRepositoryImmutableReleasesOrganization: [
      "DELETE /orgs/{org}/settings/immutable-releases/repositories/{repository_id}"
    ],
    enableSelectedRepositoryImmutableReleasesOrganization: [
      "PUT /orgs/{org}/settings/immutable-releases/repositories/{repository_id}"
    ],
    get: ["GET /orgs/{org}"],
    getImmutableReleasesSettings: [
      "GET /orgs/{org}/settings/immutable-releases"
    ],
    getImmutableReleasesSettingsRepositories: [
      "GET /orgs/{org}/settings/immutable-releases/repositories"
    ],
    getMembershipForAuthenticatedUser: ["GET /user/memberships/orgs/{org}"],
    getMembershipForUser: ["GET /orgs/{org}/memberships/{username}"],
    getOrgRole: ["GET /orgs/{org}/organization-roles/{role_id}"],
    getOrgRulesetHistory: ["GET /orgs/{org}/rulesets/{ruleset_id}/history"],
    getOrgRulesetVersion: [
      "GET /orgs/{org}/rulesets/{ruleset_id}/history/{version_id}"
    ],
    getWebhook: ["GET /orgs/{org}/hooks/{hook_id}"],
    getWebhookConfigForOrg: ["GET /orgs/{org}/hooks/{hook_id}/config"],
    getWebhookDelivery: [
      "GET /orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}"
    ],
    list: ["GET /organizations"],
    listAppInstallations: ["GET /orgs/{org}/installations"],
    listArtifactStorageRecords: [
      "GET /orgs/{org}/artifacts/{subject_digest}/metadata/storage-records"
    ],
    listAttestationRepositories: ["GET /orgs/{org}/attestations/repositories"],
    listAttestations: ["GET /orgs/{org}/attestations/{subject_digest}"],
    listAttestationsBulk: [
      "POST /orgs/{org}/attestations/bulk-list{?per_page,before,after}"
    ],
    listBlockedUsers: ["GET /orgs/{org}/blocks"],
    listFailedInvitations: ["GET /orgs/{org}/failed_invitations"],
    listForAuthenticatedUser: ["GET /user/orgs"],
    listForUser: ["GET /users/{username}/orgs"],
    listInvitationTeams: ["GET /orgs/{org}/invitations/{invitation_id}/teams"],
    listIssueTypes: ["GET /orgs/{org}/issue-types"],
    listMembers: ["GET /orgs/{org}/members"],
    listMembershipsForAuthenticatedUser: ["GET /user/memberships/orgs"],
    listOrgRoleTeams: ["GET /orgs/{org}/organization-roles/{role_id}/teams"],
    listOrgRoleUsers: ["GET /orgs/{org}/organization-roles/{role_id}/users"],
    listOrgRoles: ["GET /orgs/{org}/organization-roles"],
    listOrganizationFineGrainedPermissions: [
      "GET /orgs/{org}/organization-fine-grained-permissions"
    ],
    listOutsideCollaborators: ["GET /orgs/{org}/outside_collaborators"],
    listPatGrantRepositories: [
      "GET /orgs/{org}/personal-access-tokens/{pat_id}/repositories"
    ],
    listPatGrantRequestRepositories: [
      "GET /orgs/{org}/personal-access-token-requests/{pat_request_id}/repositories"
    ],
    listPatGrantRequests: ["GET /orgs/{org}/personal-access-token-requests"],
    listPatGrants: ["GET /orgs/{org}/personal-access-tokens"],
    listPendingInvitations: ["GET /orgs/{org}/invitations"],
    listPublicMembers: ["GET /orgs/{org}/public_members"],
    listSecurityManagerTeams: [
      "GET /orgs/{org}/security-managers",
      {},
      {
        deprecated: "octokit.rest.orgs.listSecurityManagerTeams() is deprecated, see https://docs.github.com/rest/orgs/security-managers#list-security-manager-teams"
      }
    ],
    listWebhookDeliveries: ["GET /orgs/{org}/hooks/{hook_id}/deliveries"],
    listWebhooks: ["GET /orgs/{org}/hooks"],
    pingWebhook: ["POST /orgs/{org}/hooks/{hook_id}/pings"],
    redeliverWebhookDelivery: [
      "POST /orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}/attempts"
    ],
    removeMember: ["DELETE /orgs/{org}/members/{username}"],
    removeMembershipForUser: ["DELETE /orgs/{org}/memberships/{username}"],
    removeOutsideCollaborator: [
      "DELETE /orgs/{org}/outside_collaborators/{username}"
    ],
    removePublicMembershipForAuthenticatedUser: [
      "DELETE /orgs/{org}/public_members/{username}"
    ],
    removeSecurityManagerTeam: [
      "DELETE /orgs/{org}/security-managers/teams/{team_slug}",
      {},
      {
        deprecated: "octokit.rest.orgs.removeSecurityManagerTeam() is deprecated, see https://docs.github.com/rest/orgs/security-managers#remove-a-security-manager-team"
      }
    ],
    reviewPatGrantRequest: [
      "POST /orgs/{org}/personal-access-token-requests/{pat_request_id}"
    ],
    reviewPatGrantRequestsInBulk: [
      "POST /orgs/{org}/personal-access-token-requests"
    ],
    revokeAllOrgRolesTeam: [
      "DELETE /orgs/{org}/organization-roles/teams/{team_slug}"
    ],
    revokeAllOrgRolesUser: [
      "DELETE /orgs/{org}/organization-roles/users/{username}"
    ],
    revokeOrgRoleTeam: [
      "DELETE /orgs/{org}/organization-roles/teams/{team_slug}/{role_id}"
    ],
    revokeOrgRoleUser: [
      "DELETE /orgs/{org}/organization-roles/users/{username}/{role_id}"
    ],
    setImmutableReleasesSettings: [
      "PUT /orgs/{org}/settings/immutable-releases"
    ],
    setImmutableReleasesSettingsRepositories: [
      "PUT /orgs/{org}/settings/immutable-releases/repositories"
    ],
    setMembershipForUser: ["PUT /orgs/{org}/memberships/{username}"],
    setPublicMembershipForAuthenticatedUser: [
      "PUT /orgs/{org}/public_members/{username}"
    ],
    unblockUser: ["DELETE /orgs/{org}/blocks/{username}"],
    update: ["PATCH /orgs/{org}"],
    updateIssueType: ["PUT /orgs/{org}/issue-types/{issue_type_id}"],
    updateMembershipForAuthenticatedUser: [
      "PATCH /user/memberships/orgs/{org}"
    ],
    updatePatAccess: ["POST /orgs/{org}/personal-access-tokens/{pat_id}"],
    updatePatAccesses: ["POST /orgs/{org}/personal-access-tokens"],
    updateWebhook: ["PATCH /orgs/{org}/hooks/{hook_id}"],
    updateWebhookConfigForOrg: ["PATCH /orgs/{org}/hooks/{hook_id}/config"]
  },
  packages: {
    deletePackageForAuthenticatedUser: [
      "DELETE /user/packages/{package_type}/{package_name}"
    ],
    deletePackageForOrg: [
      "DELETE /orgs/{org}/packages/{package_type}/{package_name}"
    ],
    deletePackageForUser: [
      "DELETE /users/{username}/packages/{package_type}/{package_name}"
    ],
    deletePackageVersionForAuthenticatedUser: [
      "DELETE /user/packages/{package_type}/{package_name}/versions/{package_version_id}"
    ],
    deletePackageVersionForOrg: [
      "DELETE /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}"
    ],
    deletePackageVersionForUser: [
      "DELETE /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}"
    ],
    getAllPackageVersionsForAPackageOwnedByAnOrg: [
      "GET /orgs/{org}/packages/{package_type}/{package_name}/versions",
      {},
      { renamed: ["packages", "getAllPackageVersionsForPackageOwnedByOrg"] }
    ],
    getAllPackageVersionsForAPackageOwnedByTheAuthenticatedUser: [
      "GET /user/packages/{package_type}/{package_name}/versions",
      {},
      {
        renamed: [
          "packages",
          "getAllPackageVersionsForPackageOwnedByAuthenticatedUser"
        ]
      }
    ],
    getAllPackageVersionsForPackageOwnedByAuthenticatedUser: [
      "GET /user/packages/{package_type}/{package_name}/versions"
    ],
    getAllPackageVersionsForPackageOwnedByOrg: [
      "GET /orgs/{org}/packages/{package_type}/{package_name}/versions"
    ],
    getAllPackageVersionsForPackageOwnedByUser: [
      "GET /users/{username}/packages/{package_type}/{package_name}/versions"
    ],
    getPackageForAuthenticatedUser: [
      "GET /user/packages/{package_type}/{package_name}"
    ],
    getPackageForOrganization: [
      "GET /orgs/{org}/packages/{package_type}/{package_name}"
    ],
    getPackageForUser: [
      "GET /users/{username}/packages/{package_type}/{package_name}"
    ],
    getPackageVersionForAuthenticatedUser: [
      "GET /user/packages/{package_type}/{package_name}/versions/{package_version_id}"
    ],
    getPackageVersionForOrganization: [
      "GET /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}"
    ],
    getPackageVersionForUser: [
      "GET /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}"
    ],
    listDockerMigrationConflictingPackagesForAuthenticatedUser: [
      "GET /user/docker/conflicts"
    ],
    listDockerMigrationConflictingPackagesForOrganization: [
      "GET /orgs/{org}/docker/conflicts"
    ],
    listDockerMigrationConflictingPackagesForUser: [
      "GET /users/{username}/docker/conflicts"
    ],
    listPackagesForAuthenticatedUser: ["GET /user/packages"],
    listPackagesForOrganization: ["GET /orgs/{org}/packages"],
    listPackagesForUser: ["GET /users/{username}/packages"],
    restorePackageForAuthenticatedUser: [
      "POST /user/packages/{package_type}/{package_name}/restore{?token}"
    ],
    restorePackageForOrg: [
      "POST /orgs/{org}/packages/{package_type}/{package_name}/restore{?token}"
    ],
    restorePackageForUser: [
      "POST /users/{username}/packages/{package_type}/{package_name}/restore{?token}"
    ],
    restorePackageVersionForAuthenticatedUser: [
      "POST /user/packages/{package_type}/{package_name}/versions/{package_version_id}/restore"
    ],
    restorePackageVersionForOrg: [
      "POST /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore"
    ],
    restorePackageVersionForUser: [
      "POST /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore"
    ]
  },
  privateRegistries: {
    createOrgPrivateRegistry: ["POST /orgs/{org}/private-registries"],
    deleteOrgPrivateRegistry: [
      "DELETE /orgs/{org}/private-registries/{secret_name}"
    ],
    getOrgPrivateRegistry: ["GET /orgs/{org}/private-registries/{secret_name}"],
    getOrgPublicKey: ["GET /orgs/{org}/private-registries/public-key"],
    listOrgPrivateRegistries: ["GET /orgs/{org}/private-registries"],
    updateOrgPrivateRegistry: [
      "PATCH /orgs/{org}/private-registries/{secret_name}"
    ]
  },
  projects: {
    addItemForOrg: ["POST /orgs/{org}/projectsV2/{project_number}/items"],
    addItemForUser: [
      "POST /users/{username}/projectsV2/{project_number}/items"
    ],
    deleteItemForOrg: [
      "DELETE /orgs/{org}/projectsV2/{project_number}/items/{item_id}"
    ],
    deleteItemForUser: [
      "DELETE /users/{username}/projectsV2/{project_number}/items/{item_id}"
    ],
    getFieldForOrg: [
      "GET /orgs/{org}/projectsV2/{project_number}/fields/{field_id}"
    ],
    getFieldForUser: [
      "GET /users/{username}/projectsV2/{project_number}/fields/{field_id}"
    ],
    getForOrg: ["GET /orgs/{org}/projectsV2/{project_number}"],
    getForUser: ["GET /users/{username}/projectsV2/{project_number}"],
    getOrgItem: ["GET /orgs/{org}/projectsV2/{project_number}/items/{item_id}"],
    getUserItem: [
      "GET /users/{username}/projectsV2/{project_number}/items/{item_id}"
    ],
    listFieldsForOrg: ["GET /orgs/{org}/projectsV2/{project_number}/fields"],
    listFieldsForUser: [
      "GET /users/{username}/projectsV2/{project_number}/fields"
    ],
    listForOrg: ["GET /orgs/{org}/projectsV2"],
    listForUser: ["GET /users/{username}/projectsV2"],
    listItemsForOrg: ["GET /orgs/{org}/projectsV2/{project_number}/items"],
    listItemsForUser: [
      "GET /users/{username}/projectsV2/{project_number}/items"
    ],
    updateItemForOrg: [
      "PATCH /orgs/{org}/projectsV2/{project_number}/items/{item_id}"
    ],
    updateItemForUser: [
      "PATCH /users/{username}/projectsV2/{project_number}/items/{item_id}"
    ]
  },
  pulls: {
    checkIfMerged: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/merge"],
    create: ["POST /repos/{owner}/{repo}/pulls"],
    createReplyForReviewComment: [
      "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies"
    ],
    createReview: ["POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews"],
    createReviewComment: [
      "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments"
    ],
    deletePendingReview: [
      "DELETE /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}"
    ],
    deleteReviewComment: [
      "DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}"
    ],
    dismissReview: [
      "PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/dismissals"
    ],
    get: ["GET /repos/{owner}/{repo}/pulls/{pull_number}"],
    getReview: [
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}"
    ],
    getReviewComment: ["GET /repos/{owner}/{repo}/pulls/comments/{comment_id}"],
    list: ["GET /repos/{owner}/{repo}/pulls"],
    listCommentsForReview: [
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments"
    ],
    listCommits: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/commits"],
    listFiles: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/files"],
    listRequestedReviewers: [
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"
    ],
    listReviewComments: [
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/comments"
    ],
    listReviewCommentsForRepo: ["GET /repos/{owner}/{repo}/pulls/comments"],
    listReviews: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews"],
    merge: ["PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge"],
    removeRequestedReviewers: [
      "DELETE /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"
    ],
    requestReviewers: [
      "POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"
    ],
    submitReview: [
      "POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/events"
    ],
    update: ["PATCH /repos/{owner}/{repo}/pulls/{pull_number}"],
    updateBranch: [
      "PUT /repos/{owner}/{repo}/pulls/{pull_number}/update-branch"
    ],
    updateReview: [
      "PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}"
    ],
    updateReviewComment: [
      "PATCH /repos/{owner}/{repo}/pulls/comments/{comment_id}"
    ]
  },
  rateLimit: { get: ["GET /rate_limit"] },
  reactions: {
    createForCommitComment: [
      "POST /repos/{owner}/{repo}/comments/{comment_id}/reactions"
    ],
    createForIssue: [
      "POST /repos/{owner}/{repo}/issues/{issue_number}/reactions"
    ],
    createForIssueComment: [
      "POST /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions"
    ],
    createForPullRequestReviewComment: [
      "POST /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions"
    ],
    createForRelease: [
      "POST /repos/{owner}/{repo}/releases/{release_id}/reactions"
    ],
    createForTeamDiscussionCommentInOrg: [
      "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions"
    ],
    createForTeamDiscussionInOrg: [
      "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions"
    ],
    deleteForCommitComment: [
      "DELETE /repos/{owner}/{repo}/comments/{comment_id}/reactions/{reaction_id}"
    ],
    deleteForIssue: [
      "DELETE /repos/{owner}/{repo}/issues/{issue_number}/reactions/{reaction_id}"
    ],
    deleteForIssueComment: [
      "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions/{reaction_id}"
    ],
    deleteForPullRequestComment: [
      "DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions/{reaction_id}"
    ],
    deleteForRelease: [
      "DELETE /repos/{owner}/{repo}/releases/{release_id}/reactions/{reaction_id}"
    ],
    deleteForTeamDiscussion: [
      "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions/{reaction_id}"
    ],
    deleteForTeamDiscussionComment: [
      "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions/{reaction_id}"
    ],
    listForCommitComment: [
      "GET /repos/{owner}/{repo}/comments/{comment_id}/reactions"
    ],
    listForIssue: ["GET /repos/{owner}/{repo}/issues/{issue_number}/reactions"],
    listForIssueComment: [
      "GET /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions"
    ],
    listForPullRequestReviewComment: [
      "GET /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions"
    ],
    listForRelease: [
      "GET /repos/{owner}/{repo}/releases/{release_id}/reactions"
    ],
    listForTeamDiscussionCommentInOrg: [
      "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions"
    ],
    listForTeamDiscussionInOrg: [
      "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions"
    ]
  },
  repos: {
    acceptInvitation: [
      "PATCH /user/repository_invitations/{invitation_id}",
      {},
      { renamed: ["repos", "acceptInvitationForAuthenticatedUser"] }
    ],
    acceptInvitationForAuthenticatedUser: [
      "PATCH /user/repository_invitations/{invitation_id}"
    ],
    addAppAccessRestrictions: [
      "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
      {},
      { mapToData: "apps" }
    ],
    addCollaborator: ["PUT /repos/{owner}/{repo}/collaborators/{username}"],
    addStatusCheckContexts: [
      "POST /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
      {},
      { mapToData: "contexts" }
    ],
    addTeamAccessRestrictions: [
      "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
      {},
      { mapToData: "teams" }
    ],
    addUserAccessRestrictions: [
      "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
      {},
      { mapToData: "users" }
    ],
    cancelPagesDeployment: [
      "POST /repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}/cancel"
    ],
    checkAutomatedSecurityFixes: [
      "GET /repos/{owner}/{repo}/automated-security-fixes"
    ],
    checkCollaborator: ["GET /repos/{owner}/{repo}/collaborators/{username}"],
    checkImmutableReleases: ["GET /repos/{owner}/{repo}/immutable-releases"],
    checkPrivateVulnerabilityReporting: [
      "GET /repos/{owner}/{repo}/private-vulnerability-reporting"
    ],
    checkVulnerabilityAlerts: [
      "GET /repos/{owner}/{repo}/vulnerability-alerts"
    ],
    codeownersErrors: ["GET /repos/{owner}/{repo}/codeowners/errors"],
    compareCommits: ["GET /repos/{owner}/{repo}/compare/{base}...{head}"],
    compareCommitsWithBasehead: [
      "GET /repos/{owner}/{repo}/compare/{basehead}"
    ],
    createAttestation: ["POST /repos/{owner}/{repo}/attestations"],
    createAutolink: ["POST /repos/{owner}/{repo}/autolinks"],
    createCommitComment: [
      "POST /repos/{owner}/{repo}/commits/{commit_sha}/comments"
    ],
    createCommitSignatureProtection: [
      "POST /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures"
    ],
    createCommitStatus: ["POST /repos/{owner}/{repo}/statuses/{sha}"],
    createDeployKey: ["POST /repos/{owner}/{repo}/keys"],
    createDeployment: ["POST /repos/{owner}/{repo}/deployments"],
    createDeploymentBranchPolicy: [
      "POST /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies"
    ],
    createDeploymentProtectionRule: [
      "POST /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules"
    ],
    createDeploymentStatus: [
      "POST /repos/{owner}/{repo}/deployments/{deployment_id}/statuses"
    ],
    createDispatchEvent: ["POST /repos/{owner}/{repo}/dispatches"],
    createForAuthenticatedUser: ["POST /user/repos"],
    createFork: ["POST /repos/{owner}/{repo}/forks"],
    createInOrg: ["POST /orgs/{org}/repos"],
    createOrUpdateEnvironment: [
      "PUT /repos/{owner}/{repo}/environments/{environment_name}"
    ],
    createOrUpdateFileContents: ["PUT /repos/{owner}/{repo}/contents/{path}"],
    createOrgRuleset: ["POST /orgs/{org}/rulesets"],
    createPagesDeployment: ["POST /repos/{owner}/{repo}/pages/deployments"],
    createPagesSite: ["POST /repos/{owner}/{repo}/pages"],
    createRelease: ["POST /repos/{owner}/{repo}/releases"],
    createRepoRuleset: ["POST /repos/{owner}/{repo}/rulesets"],
    createUsingTemplate: [
      "POST /repos/{template_owner}/{template_repo}/generate"
    ],
    createWebhook: ["POST /repos/{owner}/{repo}/hooks"],
    customPropertiesForReposCreateOrUpdateRepositoryValues: [
      "PATCH /repos/{owner}/{repo}/properties/values"
    ],
    customPropertiesForReposGetRepositoryValues: [
      "GET /repos/{owner}/{repo}/properties/values"
    ],
    declineInvitation: [
      "DELETE /user/repository_invitations/{invitation_id}",
      {},
      { renamed: ["repos", "declineInvitationForAuthenticatedUser"] }
    ],
    declineInvitationForAuthenticatedUser: [
      "DELETE /user/repository_invitations/{invitation_id}"
    ],
    delete: ["DELETE /repos/{owner}/{repo}"],
    deleteAccessRestrictions: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions"
    ],
    deleteAdminBranchProtection: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins"
    ],
    deleteAnEnvironment: [
      "DELETE /repos/{owner}/{repo}/environments/{environment_name}"
    ],
    deleteAutolink: ["DELETE /repos/{owner}/{repo}/autolinks/{autolink_id}"],
    deleteBranchProtection: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection"
    ],
    deleteCommitComment: ["DELETE /repos/{owner}/{repo}/comments/{comment_id}"],
    deleteCommitSignatureProtection: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures"
    ],
    deleteDeployKey: ["DELETE /repos/{owner}/{repo}/keys/{key_id}"],
    deleteDeployment: [
      "DELETE /repos/{owner}/{repo}/deployments/{deployment_id}"
    ],
    deleteDeploymentBranchPolicy: [
      "DELETE /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}"
    ],
    deleteFile: ["DELETE /repos/{owner}/{repo}/contents/{path}"],
    deleteInvitation: [
      "DELETE /repos/{owner}/{repo}/invitations/{invitation_id}"
    ],
    deleteOrgRuleset: ["DELETE /orgs/{org}/rulesets/{ruleset_id}"],
    deletePagesSite: ["DELETE /repos/{owner}/{repo}/pages"],
    deletePullRequestReviewProtection: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews"
    ],
    deleteRelease: ["DELETE /repos/{owner}/{repo}/releases/{release_id}"],
    deleteReleaseAsset: [
      "DELETE /repos/{owner}/{repo}/releases/assets/{asset_id}"
    ],
    deleteRepoRuleset: ["DELETE /repos/{owner}/{repo}/rulesets/{ruleset_id}"],
    deleteWebhook: ["DELETE /repos/{owner}/{repo}/hooks/{hook_id}"],
    disableAutomatedSecurityFixes: [
      "DELETE /repos/{owner}/{repo}/automated-security-fixes"
    ],
    disableDeploymentProtectionRule: [
      "DELETE /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}"
    ],
    disableImmutableReleases: [
      "DELETE /repos/{owner}/{repo}/immutable-releases"
    ],
    disablePrivateVulnerabilityReporting: [
      "DELETE /repos/{owner}/{repo}/private-vulnerability-reporting"
    ],
    disableVulnerabilityAlerts: [
      "DELETE /repos/{owner}/{repo}/vulnerability-alerts"
    ],
    downloadArchive: [
      "GET /repos/{owner}/{repo}/zipball/{ref}",
      {},
      { renamed: ["repos", "downloadZipballArchive"] }
    ],
    downloadTarballArchive: ["GET /repos/{owner}/{repo}/tarball/{ref}"],
    downloadZipballArchive: ["GET /repos/{owner}/{repo}/zipball/{ref}"],
    enableAutomatedSecurityFixes: [
      "PUT /repos/{owner}/{repo}/automated-security-fixes"
    ],
    enableImmutableReleases: ["PUT /repos/{owner}/{repo}/immutable-releases"],
    enablePrivateVulnerabilityReporting: [
      "PUT /repos/{owner}/{repo}/private-vulnerability-reporting"
    ],
    enableVulnerabilityAlerts: [
      "PUT /repos/{owner}/{repo}/vulnerability-alerts"
    ],
    generateReleaseNotes: [
      "POST /repos/{owner}/{repo}/releases/generate-notes"
    ],
    get: ["GET /repos/{owner}/{repo}"],
    getAccessRestrictions: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions"
    ],
    getAdminBranchProtection: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins"
    ],
    getAllDeploymentProtectionRules: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules"
    ],
    getAllEnvironments: ["GET /repos/{owner}/{repo}/environments"],
    getAllStatusCheckContexts: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts"
    ],
    getAllTopics: ["GET /repos/{owner}/{repo}/topics"],
    getAppsWithAccessToProtectedBranch: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps"
    ],
    getAutolink: ["GET /repos/{owner}/{repo}/autolinks/{autolink_id}"],
    getBranch: ["GET /repos/{owner}/{repo}/branches/{branch}"],
    getBranchProtection: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection"
    ],
    getBranchRules: ["GET /repos/{owner}/{repo}/rules/branches/{branch}"],
    getClones: ["GET /repos/{owner}/{repo}/traffic/clones"],
    getCodeFrequencyStats: ["GET /repos/{owner}/{repo}/stats/code_frequency"],
    getCollaboratorPermissionLevel: [
      "GET /repos/{owner}/{repo}/collaborators/{username}/permission"
    ],
    getCombinedStatusForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/status"],
    getCommit: ["GET /repos/{owner}/{repo}/commits/{ref}"],
    getCommitActivityStats: ["GET /repos/{owner}/{repo}/stats/commit_activity"],
    getCommitComment: ["GET /repos/{owner}/{repo}/comments/{comment_id}"],
    getCommitSignatureProtection: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures"
    ],
    getCommunityProfileMetrics: ["GET /repos/{owner}/{repo}/community/profile"],
    getContent: ["GET /repos/{owner}/{repo}/contents/{path}"],
    getContributorsStats: ["GET /repos/{owner}/{repo}/stats/contributors"],
    getCustomDeploymentProtectionRule: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}"
    ],
    getDeployKey: ["GET /repos/{owner}/{repo}/keys/{key_id}"],
    getDeployment: ["GET /repos/{owner}/{repo}/deployments/{deployment_id}"],
    getDeploymentBranchPolicy: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}"
    ],
    getDeploymentStatus: [
      "GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses/{status_id}"
    ],
    getEnvironment: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}"
    ],
    getLatestPagesBuild: ["GET /repos/{owner}/{repo}/pages/builds/latest"],
    getLatestRelease: ["GET /repos/{owner}/{repo}/releases/latest"],
    getOrgRuleSuite: ["GET /orgs/{org}/rulesets/rule-suites/{rule_suite_id}"],
    getOrgRuleSuites: ["GET /orgs/{org}/rulesets/rule-suites"],
    getOrgRuleset: ["GET /orgs/{org}/rulesets/{ruleset_id}"],
    getOrgRulesets: ["GET /orgs/{org}/rulesets"],
    getPages: ["GET /repos/{owner}/{repo}/pages"],
    getPagesBuild: ["GET /repos/{owner}/{repo}/pages/builds/{build_id}"],
    getPagesDeployment: [
      "GET /repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}"
    ],
    getPagesHealthCheck: ["GET /repos/{owner}/{repo}/pages/health"],
    getParticipationStats: ["GET /repos/{owner}/{repo}/stats/participation"],
    getPullRequestReviewProtection: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews"
    ],
    getPunchCardStats: ["GET /repos/{owner}/{repo}/stats/punch_card"],
    getReadme: ["GET /repos/{owner}/{repo}/readme"],
    getReadmeInDirectory: ["GET /repos/{owner}/{repo}/readme/{dir}"],
    getRelease: ["GET /repos/{owner}/{repo}/releases/{release_id}"],
    getReleaseAsset: ["GET /repos/{owner}/{repo}/releases/assets/{asset_id}"],
    getReleaseByTag: ["GET /repos/{owner}/{repo}/releases/tags/{tag}"],
    getRepoRuleSuite: [
      "GET /repos/{owner}/{repo}/rulesets/rule-suites/{rule_suite_id}"
    ],
    getRepoRuleSuites: ["GET /repos/{owner}/{repo}/rulesets/rule-suites"],
    getRepoRuleset: ["GET /repos/{owner}/{repo}/rulesets/{ruleset_id}"],
    getRepoRulesetHistory: [
      "GET /repos/{owner}/{repo}/rulesets/{ruleset_id}/history"
    ],
    getRepoRulesetVersion: [
      "GET /repos/{owner}/{repo}/rulesets/{ruleset_id}/history/{version_id}"
    ],
    getRepoRulesets: ["GET /repos/{owner}/{repo}/rulesets"],
    getStatusChecksProtection: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks"
    ],
    getTeamsWithAccessToProtectedBranch: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams"
    ],
    getTopPaths: ["GET /repos/{owner}/{repo}/traffic/popular/paths"],
    getTopReferrers: ["GET /repos/{owner}/{repo}/traffic/popular/referrers"],
    getUsersWithAccessToProtectedBranch: [
      "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users"
    ],
    getViews: ["GET /repos/{owner}/{repo}/traffic/views"],
    getWebhook: ["GET /repos/{owner}/{repo}/hooks/{hook_id}"],
    getWebhookConfigForRepo: [
      "GET /repos/{owner}/{repo}/hooks/{hook_id}/config"
    ],
    getWebhookDelivery: [
      "GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}"
    ],
    listActivities: ["GET /repos/{owner}/{repo}/activity"],
    listAttestations: [
      "GET /repos/{owner}/{repo}/attestations/{subject_digest}"
    ],
    listAutolinks: ["GET /repos/{owner}/{repo}/autolinks"],
    listBranches: ["GET /repos/{owner}/{repo}/branches"],
    listBranchesForHeadCommit: [
      "GET /repos/{owner}/{repo}/commits/{commit_sha}/branches-where-head"
    ],
    listCollaborators: ["GET /repos/{owner}/{repo}/collaborators"],
    listCommentsForCommit: [
      "GET /repos/{owner}/{repo}/commits/{commit_sha}/comments"
    ],
    listCommitCommentsForRepo: ["GET /repos/{owner}/{repo}/comments"],
    listCommitStatusesForRef: [
      "GET /repos/{owner}/{repo}/commits/{ref}/statuses"
    ],
    listCommits: ["GET /repos/{owner}/{repo}/commits"],
    listContributors: ["GET /repos/{owner}/{repo}/contributors"],
    listCustomDeploymentRuleIntegrations: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/apps"
    ],
    listDeployKeys: ["GET /repos/{owner}/{repo}/keys"],
    listDeploymentBranchPolicies: [
      "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies"
    ],
    listDeploymentStatuses: [
      "GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses"
    ],
    listDeployments: ["GET /repos/{owner}/{repo}/deployments"],
    listForAuthenticatedUser: ["GET /user/repos"],
    listForOrg: ["GET /orgs/{org}/repos"],
    listForUser: ["GET /users/{username}/repos"],
    listForks: ["GET /repos/{owner}/{repo}/forks"],
    listInvitations: ["GET /repos/{owner}/{repo}/invitations"],
    listInvitationsForAuthenticatedUser: ["GET /user/repository_invitations"],
    listLanguages: ["GET /repos/{owner}/{repo}/languages"],
    listPagesBuilds: ["GET /repos/{owner}/{repo}/pages/builds"],
    listPublic: ["GET /repositories"],
    listPullRequestsAssociatedWithCommit: [
      "GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls"
    ],
    listReleaseAssets: [
      "GET /repos/{owner}/{repo}/releases/{release_id}/assets"
    ],
    listReleases: ["GET /repos/{owner}/{repo}/releases"],
    listTags: ["GET /repos/{owner}/{repo}/tags"],
    listTeams: ["GET /repos/{owner}/{repo}/teams"],
    listWebhookDeliveries: [
      "GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries"
    ],
    listWebhooks: ["GET /repos/{owner}/{repo}/hooks"],
    merge: ["POST /repos/{owner}/{repo}/merges"],
    mergeUpstream: ["POST /repos/{owner}/{repo}/merge-upstream"],
    pingWebhook: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/pings"],
    redeliverWebhookDelivery: [
      "POST /repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}/attempts"
    ],
    removeAppAccessRestrictions: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
      {},
      { mapToData: "apps" }
    ],
    removeCollaborator: [
      "DELETE /repos/{owner}/{repo}/collaborators/{username}"
    ],
    removeStatusCheckContexts: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
      {},
      { mapToData: "contexts" }
    ],
    removeStatusCheckProtection: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks"
    ],
    removeTeamAccessRestrictions: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
      {},
      { mapToData: "teams" }
    ],
    removeUserAccessRestrictions: [
      "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
      {},
      { mapToData: "users" }
    ],
    renameBranch: ["POST /repos/{owner}/{repo}/branches/{branch}/rename"],
    replaceAllTopics: ["PUT /repos/{owner}/{repo}/topics"],
    requestPagesBuild: ["POST /repos/{owner}/{repo}/pages/builds"],
    setAdminBranchProtection: [
      "POST /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins"
    ],
    setAppAccessRestrictions: [
      "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
      {},
      { mapToData: "apps" }
    ],
    setStatusCheckContexts: [
      "PUT /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
      {},
      { mapToData: "contexts" }
    ],
    setTeamAccessRestrictions: [
      "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
      {},
      { mapToData: "teams" }
    ],
    setUserAccessRestrictions: [
      "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
      {},
      { mapToData: "users" }
    ],
    testPushWebhook: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/tests"],
    transfer: ["POST /repos/{owner}/{repo}/transfer"],
    update: ["PATCH /repos/{owner}/{repo}"],
    updateBranchProtection: [
      "PUT /repos/{owner}/{repo}/branches/{branch}/protection"
    ],
    updateCommitComment: ["PATCH /repos/{owner}/{repo}/comments/{comment_id}"],
    updateDeploymentBranchPolicy: [
      "PUT /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}"
    ],
    updateInformationAboutPagesSite: ["PUT /repos/{owner}/{repo}/pages"],
    updateInvitation: [
      "PATCH /repos/{owner}/{repo}/invitations/{invitation_id}"
    ],
    updateOrgRuleset: ["PUT /orgs/{org}/rulesets/{ruleset_id}"],
    updatePullRequestReviewProtection: [
      "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews"
    ],
    updateRelease: ["PATCH /repos/{owner}/{repo}/releases/{release_id}"],
    updateReleaseAsset: [
      "PATCH /repos/{owner}/{repo}/releases/assets/{asset_id}"
    ],
    updateRepoRuleset: ["PUT /repos/{owner}/{repo}/rulesets/{ruleset_id}"],
    updateStatusCheckPotection: [
      "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks",
      {},
      { renamed: ["repos", "updateStatusCheckProtection"] }
    ],
    updateStatusCheckProtection: [
      "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks"
    ],
    updateWebhook: ["PATCH /repos/{owner}/{repo}/hooks/{hook_id}"],
    updateWebhookConfigForRepo: [
      "PATCH /repos/{owner}/{repo}/hooks/{hook_id}/config"
    ],
    uploadReleaseAsset: [
      "POST /repos/{owner}/{repo}/releases/{release_id}/assets{?name,label}",
      { baseUrl: "https://uploads.github.com" }
    ]
  },
  search: {
    code: ["GET /search/code"],
    commits: ["GET /search/commits"],
    issuesAndPullRequests: ["GET /search/issues"],
    labels: ["GET /search/labels"],
    repos: ["GET /search/repositories"],
    topics: ["GET /search/topics"],
    users: ["GET /search/users"]
  },
  secretScanning: {
    createPushProtectionBypass: [
      "POST /repos/{owner}/{repo}/secret-scanning/push-protection-bypasses"
    ],
    getAlert: [
      "GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}"
    ],
    getScanHistory: ["GET /repos/{owner}/{repo}/secret-scanning/scan-history"],
    listAlertsForOrg: ["GET /orgs/{org}/secret-scanning/alerts"],
    listAlertsForRepo: ["GET /repos/{owner}/{repo}/secret-scanning/alerts"],
    listLocationsForAlert: [
      "GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}/locations"
    ],
    listOrgPatternConfigs: [
      "GET /orgs/{org}/secret-scanning/pattern-configurations"
    ],
    updateAlert: [
      "PATCH /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}"
    ],
    updateOrgPatternConfigs: [
      "PATCH /orgs/{org}/secret-scanning/pattern-configurations"
    ]
  },
  securityAdvisories: {
    createFork: [
      "POST /repos/{owner}/{repo}/security-advisories/{ghsa_id}/forks"
    ],
    createPrivateVulnerabilityReport: [
      "POST /repos/{owner}/{repo}/security-advisories/reports"
    ],
    createRepositoryAdvisory: [
      "POST /repos/{owner}/{repo}/security-advisories"
    ],
    createRepositoryAdvisoryCveRequest: [
      "POST /repos/{owner}/{repo}/security-advisories/{ghsa_id}/cve"
    ],
    getGlobalAdvisory: ["GET /advisories/{ghsa_id}"],
    getRepositoryAdvisory: [
      "GET /repos/{owner}/{repo}/security-advisories/{ghsa_id}"
    ],
    listGlobalAdvisories: ["GET /advisories"],
    listOrgRepositoryAdvisories: ["GET /orgs/{org}/security-advisories"],
    listRepositoryAdvisories: ["GET /repos/{owner}/{repo}/security-advisories"],
    updateRepositoryAdvisory: [
      "PATCH /repos/{owner}/{repo}/security-advisories/{ghsa_id}"
    ]
  },
  teams: {
    addOrUpdateMembershipForUserInOrg: [
      "PUT /orgs/{org}/teams/{team_slug}/memberships/{username}"
    ],
    addOrUpdateRepoPermissionsInOrg: [
      "PUT /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}"
    ],
    checkPermissionsForRepoInOrg: [
      "GET /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}"
    ],
    create: ["POST /orgs/{org}/teams"],
    createDiscussionCommentInOrg: [
      "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments"
    ],
    createDiscussionInOrg: ["POST /orgs/{org}/teams/{team_slug}/discussions"],
    deleteDiscussionCommentInOrg: [
      "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}"
    ],
    deleteDiscussionInOrg: [
      "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}"
    ],
    deleteInOrg: ["DELETE /orgs/{org}/teams/{team_slug}"],
    getByName: ["GET /orgs/{org}/teams/{team_slug}"],
    getDiscussionCommentInOrg: [
      "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}"
    ],
    getDiscussionInOrg: [
      "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}"
    ],
    getMembershipForUserInOrg: [
      "GET /orgs/{org}/teams/{team_slug}/memberships/{username}"
    ],
    list: ["GET /orgs/{org}/teams"],
    listChildInOrg: ["GET /orgs/{org}/teams/{team_slug}/teams"],
    listDiscussionCommentsInOrg: [
      "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments"
    ],
    listDiscussionsInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions"],
    listForAuthenticatedUser: ["GET /user/teams"],
    listMembersInOrg: ["GET /orgs/{org}/teams/{team_slug}/members"],
    listPendingInvitationsInOrg: [
      "GET /orgs/{org}/teams/{team_slug}/invitations"
    ],
    listReposInOrg: ["GET /orgs/{org}/teams/{team_slug}/repos"],
    removeMembershipForUserInOrg: [
      "DELETE /orgs/{org}/teams/{team_slug}/memberships/{username}"
    ],
    removeRepoInOrg: [
      "DELETE /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}"
    ],
    updateDiscussionCommentInOrg: [
      "PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}"
    ],
    updateDiscussionInOrg: [
      "PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}"
    ],
    updateInOrg: ["PATCH /orgs/{org}/teams/{team_slug}"]
  },
  users: {
    addEmailForAuthenticated: [
      "POST /user/emails",
      {},
      { renamed: ["users", "addEmailForAuthenticatedUser"] }
    ],
    addEmailForAuthenticatedUser: ["POST /user/emails"],
    addSocialAccountForAuthenticatedUser: ["POST /user/social_accounts"],
    block: ["PUT /user/blocks/{username}"],
    checkBlocked: ["GET /user/blocks/{username}"],
    checkFollowingForUser: ["GET /users/{username}/following/{target_user}"],
    checkPersonIsFollowedByAuthenticated: ["GET /user/following/{username}"],
    createGpgKeyForAuthenticated: [
      "POST /user/gpg_keys",
      {},
      { renamed: ["users", "createGpgKeyForAuthenticatedUser"] }
    ],
    createGpgKeyForAuthenticatedUser: ["POST /user/gpg_keys"],
    createPublicSshKeyForAuthenticated: [
      "POST /user/keys",
      {},
      { renamed: ["users", "createPublicSshKeyForAuthenticatedUser"] }
    ],
    createPublicSshKeyForAuthenticatedUser: ["POST /user/keys"],
    createSshSigningKeyForAuthenticatedUser: ["POST /user/ssh_signing_keys"],
    deleteAttestationsBulk: [
      "POST /users/{username}/attestations/delete-request"
    ],
    deleteAttestationsById: [
      "DELETE /users/{username}/attestations/{attestation_id}"
    ],
    deleteAttestationsBySubjectDigest: [
      "DELETE /users/{username}/attestations/digest/{subject_digest}"
    ],
    deleteEmailForAuthenticated: [
      "DELETE /user/emails",
      {},
      { renamed: ["users", "deleteEmailForAuthenticatedUser"] }
    ],
    deleteEmailForAuthenticatedUser: ["DELETE /user/emails"],
    deleteGpgKeyForAuthenticated: [
      "DELETE /user/gpg_keys/{gpg_key_id}",
      {},
      { renamed: ["users", "deleteGpgKeyForAuthenticatedUser"] }
    ],
    deleteGpgKeyForAuthenticatedUser: ["DELETE /user/gpg_keys/{gpg_key_id}"],
    deletePublicSshKeyForAuthenticated: [
      "DELETE /user/keys/{key_id}",
      {},
      { renamed: ["users", "deletePublicSshKeyForAuthenticatedUser"] }
    ],
    deletePublicSshKeyForAuthenticatedUser: ["DELETE /user/keys/{key_id}"],
    deleteSocialAccountForAuthenticatedUser: ["DELETE /user/social_accounts"],
    deleteSshSigningKeyForAuthenticatedUser: [
      "DELETE /user/ssh_signing_keys/{ssh_signing_key_id}"
    ],
    follow: ["PUT /user/following/{username}"],
    getAuthenticated: ["GET /user"],
    getById: ["GET /user/{account_id}"],
    getByUsername: ["GET /users/{username}"],
    getContextForUser: ["GET /users/{username}/hovercard"],
    getGpgKeyForAuthenticated: [
      "GET /user/gpg_keys/{gpg_key_id}",
      {},
      { renamed: ["users", "getGpgKeyForAuthenticatedUser"] }
    ],
    getGpgKeyForAuthenticatedUser: ["GET /user/gpg_keys/{gpg_key_id}"],
    getPublicSshKeyForAuthenticated: [
      "GET /user/keys/{key_id}",
      {},
      { renamed: ["users", "getPublicSshKeyForAuthenticatedUser"] }
    ],
    getPublicSshKeyForAuthenticatedUser: ["GET /user/keys/{key_id}"],
    getSshSigningKeyForAuthenticatedUser: [
      "GET /user/ssh_signing_keys/{ssh_signing_key_id}"
    ],
    list: ["GET /users"],
    listAttestations: ["GET /users/{username}/attestations/{subject_digest}"],
    listAttestationsBulk: [
      "POST /users/{username}/attestations/bulk-list{?per_page,before,after}"
    ],
    listBlockedByAuthenticated: [
      "GET /user/blocks",
      {},
      { renamed: ["users", "listBlockedByAuthenticatedUser"] }
    ],
    listBlockedByAuthenticatedUser: ["GET /user/blocks"],
    listEmailsForAuthenticated: [
      "GET /user/emails",
      {},
      { renamed: ["users", "listEmailsForAuthenticatedUser"] }
    ],
    listEmailsForAuthenticatedUser: ["GET /user/emails"],
    listFollowedByAuthenticated: [
      "GET /user/following",
      {},
      { renamed: ["users", "listFollowedByAuthenticatedUser"] }
    ],
    listFollowedByAuthenticatedUser: ["GET /user/following"],
    listFollowersForAuthenticatedUser: ["GET /user/followers"],
    listFollowersForUser: ["GET /users/{username}/followers"],
    listFollowingForUser: ["GET /users/{username}/following"],
    listGpgKeysForAuthenticated: [
      "GET /user/gpg_keys",
      {},
      { renamed: ["users", "listGpgKeysForAuthenticatedUser"] }
    ],
    listGpgKeysForAuthenticatedUser: ["GET /user/gpg_keys"],
    listGpgKeysForUser: ["GET /users/{username}/gpg_keys"],
    listPublicEmailsForAuthenticated: [
      "GET /user/public_emails",
      {},
      { renamed: ["users", "listPublicEmailsForAuthenticatedUser"] }
    ],
    listPublicEmailsForAuthenticatedUser: ["GET /user/public_emails"],
    listPublicKeysForUser: ["GET /users/{username}/keys"],
    listPublicSshKeysForAuthenticated: [
      "GET /user/keys",
      {},
      { renamed: ["users", "listPublicSshKeysForAuthenticatedUser"] }
    ],
    listPublicSshKeysForAuthenticatedUser: ["GET /user/keys"],
    listSocialAccountsForAuthenticatedUser: ["GET /user/social_accounts"],
    listSocialAccountsForUser: ["GET /users/{username}/social_accounts"],
    listSshSigningKeysForAuthenticatedUser: ["GET /user/ssh_signing_keys"],
    listSshSigningKeysForUser: ["GET /users/{username}/ssh_signing_keys"],
    setPrimaryEmailVisibilityForAuthenticated: [
      "PATCH /user/email/visibility",
      {},
      { renamed: ["users", "setPrimaryEmailVisibilityForAuthenticatedUser"] }
    ],
    setPrimaryEmailVisibilityForAuthenticatedUser: [
      "PATCH /user/email/visibility"
    ],
    unblock: ["DELETE /user/blocks/{username}"],
    unfollow: ["DELETE /user/following/{username}"],
    updateAuthenticated: ["PATCH /user"]
  }
};
var endpoints_default = Endpoints;

//# sourceMappingURL=endpoints.js.map

;// CONCATENATED MODULE: ./node_modules/.pnpm/@octokit+plugin-rest-endpoint-methods@17.0.0_@octokit+core@7.0.6/node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/endpoints-to-methods.js

const endpointMethodsMap = /* @__PURE__ */ new Map();
for (const [scope, endpoints] of Object.entries(endpoints_default)) {
  for (const [methodName, endpoint] of Object.entries(endpoints)) {
    const [route, defaults, decorations] = endpoint;
    const [method, url] = route.split(/ /);
    const endpointDefaults = Object.assign(
      {
        method,
        url
      },
      defaults
    );
    if (!endpointMethodsMap.has(scope)) {
      endpointMethodsMap.set(scope, /* @__PURE__ */ new Map());
    }
    endpointMethodsMap.get(scope).set(methodName, {
      scope,
      methodName,
      endpointDefaults,
      decorations
    });
  }
}
const handler = {
  has({ scope }, methodName) {
    return endpointMethodsMap.get(scope).has(methodName);
  },
  getOwnPropertyDescriptor(target, methodName) {
    return {
      value: this.get(target, methodName),
      // ensures method is in the cache
      configurable: true,
      writable: true,
      enumerable: true
    };
  },
  defineProperty(target, methodName, descriptor) {
    Object.defineProperty(target.cache, methodName, descriptor);
    return true;
  },
  deleteProperty(target, methodName) {
    delete target.cache[methodName];
    return true;
  },
  ownKeys({ scope }) {
    return [...endpointMethodsMap.get(scope).keys()];
  },
  set(target, methodName, value) {
    return target.cache[methodName] = value;
  },
  get({ octokit, scope, cache }, methodName) {
    if (cache[methodName]) {
      return cache[methodName];
    }
    const method = endpointMethodsMap.get(scope).get(methodName);
    if (!method) {
      return void 0;
    }
    const { endpointDefaults, decorations } = method;
    if (decorations) {
      cache[methodName] = decorate(
        octokit,
        scope,
        methodName,
        endpointDefaults,
        decorations
      );
    } else {
      cache[methodName] = octokit.request.defaults(endpointDefaults);
    }
    return cache[methodName];
  }
};
function endpointsToMethods(octokit) {
  const newMethods = {};
  for (const scope of endpointMethodsMap.keys()) {
    newMethods[scope] = new Proxy({ octokit, scope, cache: {} }, handler);
  }
  return newMethods;
}
function decorate(octokit, scope, methodName, defaults, decorations) {
  const requestWithDefaults = octokit.request.defaults(defaults);
  function withDecorations(...args) {
    let options = requestWithDefaults.endpoint.merge(...args);
    if (decorations.mapToData) {
      options = Object.assign({}, options, {
        data: options[decorations.mapToData],
        [decorations.mapToData]: void 0
      });
      return requestWithDefaults(options);
    }
    if (decorations.renamed) {
      const [newScope, newMethodName] = decorations.renamed;
      octokit.log.warn(
        `octokit.${scope}.${methodName}() has been renamed to octokit.${newScope}.${newMethodName}()`
      );
    }
    if (decorations.deprecated) {
      octokit.log.warn(decorations.deprecated);
    }
    if (decorations.renamedParameters) {
      const options2 = requestWithDefaults.endpoint.merge(...args);
      for (const [name, alias] of Object.entries(
        decorations.renamedParameters
      )) {
        if (name in options2) {
          octokit.log.warn(
            `"${name}" parameter is deprecated for "octokit.${scope}.${methodName}()". Use "${alias}" instead`
          );
          if (!(alias in options2)) {
            options2[alias] = options2[name];
          }
          delete options2[name];
        }
      }
      return requestWithDefaults(options2);
    }
    return requestWithDefaults(...args);
  }
  return Object.assign(withDecorations, requestWithDefaults);
}

//# sourceMappingURL=endpoints-to-methods.js.map

;// CONCATENATED MODULE: ./node_modules/.pnpm/@octokit+plugin-rest-endpoint-methods@17.0.0_@octokit+core@7.0.6/node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/index.js


function restEndpointMethods(octokit) {
  const api = endpointsToMethods(octokit);
  return {
    rest: api
  };
}
restEndpointMethods.VERSION = plugin_rest_endpoint_methods_dist_src_version_VERSION;
function legacyRestEndpointMethods(octokit) {
  const api = endpointsToMethods(octokit);
  return {
    ...api,
    rest: api
  };
}
legacyRestEndpointMethods.VERSION = plugin_rest_endpoint_methods_dist_src_version_VERSION;

//# sourceMappingURL=index.js.map

;// CONCATENATED MODULE: ./node_modules/.pnpm/@octokit+rest@22.0.1/node_modules/@octokit/rest/dist-src/version.js
const rest_dist_src_version_VERSION = "22.0.1";


;// CONCATENATED MODULE: ./node_modules/.pnpm/@octokit+rest@22.0.1/node_modules/@octokit/rest/dist-src/index.js





const dist_src_Octokit = Octokit.plugin(requestLog, legacyRestEndpointMethods, paginateRest).defaults(
  {
    userAgent: `octokit-rest.js/${rest_dist_src_version_VERSION}`
  }
);



/***/ }),

/***/ 45639:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  S2: () => (/* reexport */ GitNameSafetyError),
  lY: () => (/* reexport */ ParseSourceError),
  ai: () => (/* reexport */ SkillLoadError),
  vJ: () => (/* reexport */ cache_ensureCached),
  h3: () => (/* reexport */ loader_loadSkillMd),
  PJ: () => (/* reexport */ resolver_parseSource),
  Av: () => (/* reexport */ validateGitNameSafety)
});

// UNUSED EXPORTS: CacheError, ExecError, GITHUB_HTTPS_URL, GITHUB_SSH_URL, GITLAB_HTTPS_URL, GITLAB_SSH_URL, GitError, LocalSourceError, ResolveError, TOOL_NAMES, TrustError, VALID_SKILL_NAME, applyDefaultRepositorySource, clone, copyDir, discoverAllSkills, discoverSkill, ensureWellKnownCached, exec, extractDomain, fetchAndReset, fetchRef, headCommit, isExplicitSourceSpecifier, isGitRepo, isSourceExcluded, isToolName, normalizeSource, parseOwnerRepoShorthand, resolveLocalSource, resolveSkill, resolveWildcardSkills, sanitizeCacheKey, sourcesMatch, stripLeadingAt, stripTrailingSlashes, validateCacheKey, validateTrustedSource

// EXTERNAL MODULE: external "node:fs/promises"
var promises_ = __webpack_require__(51455);
// EXTERNAL MODULE: ./node_modules/.pnpm/yaml@2.8.3/node_modules/yaml/dist/index.js
var dist = __webpack_require__(57538);
;// CONCATENATED MODULE: ./node_modules/.pnpm/@sentry+dotagents-lib@1.16.1/node_modules/@sentry/dotagents-lib/dist/skills/tool-name.js
/**
 * Closed set of well-known agent tool names. The list tracks Claude Code's
 * tool inventory, which is the de-facto agentskills.io standard.
 *
 * Hosts that want a stricter set layer their own validation on top
 * (e.g. `z.enum(TOOL_NAMES).refine(...)` to disallow `Bash`).
 * Hosts that need an open set use `string[]` directly and do their own typing.
 */
const TOOL_NAMES = [
    "Read",
    "Write",
    "Edit",
    "Bash",
    "Glob",
    "Grep",
    "WebFetch",
    "WebSearch",
];
const TOOL_NAME_SET = new Set(TOOL_NAMES);
function isToolName(value) {
    return typeof value === "string" && TOOL_NAME_SET.has(value);
}
//# sourceMappingURL=tool-name.js.map
;// CONCATENATED MODULE: ./node_modules/.pnpm/@sentry+dotagents-lib@1.16.1/node_modules/@sentry/dotagents-lib/dist/skills/loader.js



class SkillLoadError extends Error {
    constructor(message) {
        super(message);
        this.name = "SkillLoadError";
    }
}
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
/**
 * Parse a SKILL.md file and extract YAML frontmatter.
 * Returns the parsed metadata (name, description, plus any extra fields).
 */
async function loader_loadSkillMd(filePath, opts) {
    let content;
    try {
        content = await (0,promises_.readFile)(filePath, "utf-8");
    }
    catch {
        throw new SkillLoadError(`SKILL.md not found: ${filePath}`);
    }
    const match = FRONTMATTER_RE.exec(content);
    if (!match?.[1]) {
        throw new SkillLoadError(`No YAML frontmatter in ${filePath}`);
    }
    let parsed;
    try {
        parsed = (0,dist/* parse */.qg)(match[1]);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new SkillLoadError(`Invalid YAML frontmatter in ${filePath}: ${message}`);
    }
    if (!isPlainObject(parsed)) {
        throw new SkillLoadError(`Frontmatter must be a YAML object: ${filePath}`);
    }
    const meta = parsed;
    if (typeof meta["name"] !== "string" || !meta["name"]) {
        throw new SkillLoadError(`Missing 'name' in SKILL.md frontmatter: ${filePath}`);
    }
    if (typeof meta["description"] !== "string" || !meta["description"]) {
        throw new SkillLoadError(`Missing 'description' in SKILL.md frontmatter: ${filePath}`);
    }
    const allowedTools = parseAllowedTools(meta["allowed-tools"], opts?.onWarning);
    if (allowedTools !== undefined) {
        meta["allowedTools"] = allowedTools;
    }
    return meta;
}
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
 * Parse the `allowed-tools` frontmatter field into `ToolName[]`.
 *
 * The agentskills.io spec defines this as a space-delimited string, but with
 * a real YAML parser, frontmatter authors can also use YAML's native list
 * syntax (`- Read\n  - Grep` or `[Read, Grep]`) which parses to a JS array.
 * Both shapes are accepted.
 *
 * Unknown tokens are reported via `onWarning` and dropped. When the field is
 * present but every token is unrecognized, returns an empty array (rather
 * than `undefined`) so authorization gates can distinguish "field declared
 * but values not understood" from "no restriction declared at all" — the
 * latter is treated as unrestricted by most hosts.
 *
 * Returns `undefined` only when the field is genuinely absent or shaped in
 * a way the lib can't interpret (e.g. an object).
 */
function parseAllowedTools(raw, onWarning) {
    if (raw === undefined || raw === null) {
        return undefined;
    }
    // Track whether the field was declared as an array specifically. An empty
    // array is "deny all" (explicit signal); an empty/whitespace string is more
    // likely a typo and we treat it as absent.
    let tokens;
    let isArrayForm = false;
    if (typeof raw === "string") {
        tokens = raw.split(/\s+/).filter(Boolean);
    }
    else if (Array.isArray(raw)) {
        isArrayForm = true;
        tokens = [];
        for (const entry of raw) {
            if (typeof entry === "string" && entry.trim().length > 0) {
                tokens.push(entry.trim());
            }
            else {
                onWarning?.(`allowed-tools: skipping non-string entry ${JSON.stringify(entry)}`);
            }
        }
    }
    else {
        onWarning?.(`allowed-tools must be a string or array, got ${typeof raw}; ignoring`);
        return undefined;
    }
    // Empty/whitespace string: treat as absent (likely a typo).
    // Empty array: deliberate "deny all" — preserve the empty signal.
    if (tokens.length === 0) {
        return isArrayForm ? [] : undefined;
    }
    const accepted = [];
    for (const token of tokens) {
        if (isToolName(token)) {
            accepted.push(token);
        }
        else {
            onWarning?.(`allowed-tools: unknown tool '${token}' (ignored)`);
        }
    }
    // Declared-but-no-recognized-tokens stays distinct from field-absent.
    return accepted;
}
//# sourceMappingURL=loader.js.map
// EXTERNAL MODULE: external "node:path"
var external_node_path_ = __webpack_require__(76760);
// EXTERNAL MODULE: external "node:fs"
var external_node_fs_ = __webpack_require__(73024);
;// CONCATENATED MODULE: ./node_modules/.pnpm/@sentry+dotagents-lib@1.16.1/node_modules/@sentry/dotagents-lib/dist/skills/discovery.js




/**
 * Conventional directories to scan for skills, in priority order.
 * The root dir (".") is scanned flat (direct children only) to avoid
 * walking the entire repo. Other dirs are scanned recursively to handle
 * categorized layouts like skills/.curated/<name>/.
 *
 * Lib default is the canonical agentskills.io layout (`skills/`). Hosts
 * with their own conventions (e.g. dotagents' `.agents/skills/`, Claude
 * Code's `.claude/skills/`) pass them via the `scanDirs` option.
 */
const ROOT_SCAN_DIR = ".";
const DEFAULT_RECURSIVE_SCAN_DIRS = (/* unused pure expression or super */ null && (["skills"]));
const DEFAULT_MARKER_FILE = "SKILL.md";
/**
 * Recursively walk a directory tree finding all directories that contain the marker file.
 * Stops descending into a directory once the marker is found (skill dirs are leaf nodes).
 */
async function walkSkillDirs(baseDir, markerFile, relPrefix = "") {
    if (!existsSync(baseDir)) {
        return [];
    }
    let entries;
    try {
        entries = await readdir(baseDir, { withFileTypes: true });
    }
    catch {
        return [];
    }
    const direct = [];
    const nested = [];
    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue;
        }
        const absPath = join(baseDir, entry.name);
        const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
        if (existsSync(join(absPath, markerFile))) {
            // This is a skill directory — collect it and don't descend further
            direct.push({ absPath, relPath });
        }
        else {
            // Not a skill — recurse into it to find nested skills
            const children = await walkSkillDirs(absPath, markerFile, relPath);
            nested.push(...children);
        }
    }
    // Direct children first, then nested — shallower matches have priority
    return [...direct, ...nested];
}
/** All scan dirs in priority order, with their scan mode. */
function buildScanDirs(opts) {
    const recursive = opts?.scanDirs ?? DEFAULT_RECURSIVE_SCAN_DIRS;
    return [
        { dir: ROOT_SCAN_DIR, recursive: false },
        ...recursive.map((dir) => ({ dir, recursive: true })),
    ];
}
/**
 * List skill directories within a scan dir.
 * Root dir is scanned flat; other dirs are walked recursively.
 */
async function listSkillDirs(repoDir, scanDir, recursive, markerFile) {
    const absDir = join(repoDir, scanDir);
    if (recursive) {
        return walkSkillDirs(absDir, markerFile);
    }
    // Flat scan: only direct children with the marker file
    if (!existsSync(absDir)) {
        return [];
    }
    let entries;
    try {
        entries = await readdir(absDir, { withFileTypes: true });
    }
    catch {
        return [];
    }
    const results = [];
    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue;
        }
        const absPath = join(absDir, entry.name);
        if (existsSync(join(absPath, markerFile))) {
            results.push({ absPath, relPath: entry.name });
        }
    }
    // Check if the root directory itself is a skill (single-skill repo pattern)
    if (scanDir === ROOT_SCAN_DIR && existsSync(join(absDir, markerFile))) {
        results.push({ absPath: absDir, relPath: "." });
    }
    return results;
}
/**
 * Discover a specific skill by name within a repo directory.
 * Scans conventional directories in priority order, recursing into
 * subdirectories until the marker file is found.
 */
async function discovery_discoverSkill(repoDir, skillName, opts) {
    const markerFile = opts?.markerFile ?? DEFAULT_MARKER_FILE;
    for (const { dir: scanDir, recursive } of buildScanDirs(opts)) {
        const skillDirs = await listSkillDirs(repoDir, scanDir, recursive, markerFile);
        // Within each scan dir: prefer dir-name match, fall back to frontmatter match
        let dirNameMatch = null;
        let frontmatterMatch = null;
        for (const { absPath, relPath } of skillDirs) {
            const dirName = relPath.split("/").pop();
            const fullRelPath = scanDir === ROOT_SCAN_DIR ? relPath : `${scanDir}/${relPath}`;
            try {
                const meta = await loadSkillMd(join(absPath, markerFile));
                if (!dirNameMatch && dirName === skillName) {
                    dirNameMatch = { path: fullRelPath, meta };
                }
                else if (!frontmatterMatch && meta.name === skillName) {
                    frontmatterMatch = { path: fullRelPath, meta };
                }
            }
            catch {
                // Skip skills with invalid SKILL.md
            }
        }
        // Any match in this scan dir wins over later scan dirs
        if (dirNameMatch) {
            return dirNameMatch;
        }
        if (frontmatterMatch) {
            return frontmatterMatch;
        }
    }
    // Marketplace format hardcodes SKILL.md — it's a SKILL-specific distribution
    // convention, not a generic catalog.
    const marketplaceSkill = await tryMarketplaceFormat(repoDir, skillName);
    if (marketplaceSkill) {
        return marketplaceSkill;
    }
    return null;
}
/**
 * Discover all skills in a repo.
 * Scans conventional directories recursively and returns everything found.
 */
async function discovery_discoverAllSkills(repoDir, opts) {
    const markerFile = opts?.markerFile ?? DEFAULT_MARKER_FILE;
    const found = new Map();
    for (const { dir: scanDir, recursive } of buildScanDirs(opts)) {
        const skillDirs = await listSkillDirs(repoDir, scanDir, recursive, markerFile);
        for (const { absPath, relPath } of skillDirs) {
            try {
                const meta = await loadSkillMd(join(absPath, markerFile));
                // First match wins (higher priority scan dirs are checked first)
                if (found.has(meta.name)) {
                    continue;
                }
                const fullRelPath = scanDir === ROOT_SCAN_DIR ? relPath : `${scanDir}/${relPath}`;
                found.set(meta.name, { path: fullRelPath, meta });
            }
            catch {
                // Skip skills with invalid SKILL.md
            }
        }
    }
    // Marketplace format hardcodes SKILL.md (see discoverSkill).
    const marketplaceSkills = await scanMarketplaceFormat(repoDir);
    for (const skill of marketplaceSkills) {
        if (!found.has(skill.meta.name)) {
            found.set(skill.meta.name, skill);
        }
    }
    return [...found.values()];
}
async function scanMarketplaceFormat(repoDir) {
    const pluginsDir = join(repoDir, ".claude-plugin");
    if (!existsSync(pluginsDir)) {
        return [];
    }
    const pluginsDirPath = join(repoDir, "plugins");
    if (!existsSync(pluginsDirPath)) {
        return [];
    }
    let plugins;
    try {
        plugins = await readdir(pluginsDirPath, { withFileTypes: true });
    }
    catch {
        return [];
    }
    const results = [];
    for (const plugin of plugins) {
        if (!plugin.isDirectory()) {
            continue;
        }
        const skillsDir = join(pluginsDirPath, plugin.name, "skills");
        if (!existsSync(skillsDir)) {
            continue;
        }
        let skillEntries;
        try {
            skillEntries = await readdir(skillsDir, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of skillEntries) {
            if (!entry.isDirectory()) {
                continue;
            }
            const skillMdPath = join(skillsDir, entry.name, "SKILL.md");
            if (!existsSync(skillMdPath)) {
                continue;
            }
            try {
                const meta = await loadSkillMd(skillMdPath);
                results.push({
                    path: `plugins/${plugin.name}/skills/${entry.name}`,
                    meta,
                });
            }
            catch {
                // Skip invalid
            }
        }
    }
    return results;
}
async function tryMarketplaceFormat(repoDir, skillName) {
    const pluginsDir = join(repoDir, ".claude-plugin");
    if (!existsSync(pluginsDir)) {
        return null;
    }
    // Scan plugins/*/skills/<name>/SKILL.md
    const pluginsDirPath = join(repoDir, "plugins");
    if (!existsSync(pluginsDirPath)) {
        return null;
    }
    let plugins;
    try {
        plugins = await readdir(pluginsDirPath, { withFileTypes: true });
    }
    catch {
        return null;
    }
    for (const plugin of plugins) {
        if (!plugin.isDirectory()) {
            continue;
        }
        const skillMdPath = join(pluginsDirPath, plugin.name, "skills", skillName, "SKILL.md");
        if (!existsSync(skillMdPath)) {
            continue;
        }
        try {
            const meta = await loadSkillMd(skillMdPath);
            return { path: `plugins/${plugin.name}/skills/${skillName}`, meta };
        }
        catch {
            // Skip skills with invalid SKILL.md
        }
    }
    return null;
}
//# sourceMappingURL=discovery.js.map
;// CONCATENATED MODULE: ./node_modules/.pnpm/@sentry+dotagents-lib@1.16.1/node_modules/@sentry/dotagents-lib/dist/sources/repository-source.js
/** GitHub HTTPS URL pattern — owner/repo must start with alphanumeric (no dash prefix). */
const GITHUB_HTTPS_URL = /^https?:\/\/github\.com\/([a-zA-Z0-9][^/]*)\/([a-zA-Z0-9][^/@]*?)(?:\.git)?(?:\/)?(?:@(.+))?$/;
/** GitHub SSH URL pattern — owner/repo must start with alphanumeric (no dash prefix). */
const GITHUB_SSH_URL = /^git@github\.com:([a-zA-Z0-9][^/]*)\/([a-zA-Z0-9][^/@]*?)(?:\.git)?(?:@(.+))?$/;
/** GitLab HTTPS URL pattern — supports nested groups/subgroups. */
const GITLAB_HTTPS_URL = /^https?:\/\/gitlab\.com\/([a-zA-Z0-9][^@]*?)\/([a-zA-Z0-9][^/@]*?)(?:\.git)?(?:\/)?(?:@(.+))?$/;
/** GitLab SSH URL pattern — supports nested groups/subgroups. */
const GITLAB_SSH_URL = /^git@gitlab\.com:([a-zA-Z0-9][^@]*?)\/([a-zA-Z0-9][^/@]*?)(?:\.git)?(?:@(.+))?$/;
//# sourceMappingURL=repository-source.js.map
// EXTERNAL MODULE: external "node:child_process"
var external_node_child_process_ = __webpack_require__(31421);
;// CONCATENATED MODULE: ./node_modules/.pnpm/@sentry+dotagents-lib@1.16.1/node_modules/@sentry/dotagents-lib/dist/utils/exec.js

class ExecError extends Error {
    exitCode;
    stderr;
    constructor(message, exitCode, stderr) {
        super(message);
        this.exitCode = exitCode;
        this.stderr = stderr;
        this.name = "ExecError";
    }
}
/**
 * Run a command and return stdout/stderr.
 * Non-interactive: sets GIT_TERMINAL_PROMPT=0 for git commands.
 */
const DEFAULT_TIMEOUT_MS = 60_000; // 60 seconds
function exec(cmd, args, opts) {
    return new Promise((resolve, reject) => {
        const env = {
            ...process.env,
            // Prevent git from prompting for credentials
            GIT_TERMINAL_PROMPT: "0",
            // Prevent git from asking for SSH key passphrases
            GIT_SSH_COMMAND: "ssh -o BatchMode=yes",
            ...opts?.env,
        };
        (0,external_node_child_process_.execFile)(cmd, args, { cwd: opts?.cwd, env, maxBuffer: 50 * 1024 * 1024, timeout: opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS }, (err, stdout, stderr) => {
            if (err) {
                const code = "code" in err ? err.code : null;
                reject(new ExecError(`${cmd} ${args.join(" ")} failed: ${stderr.trim() || err.message}`, code, stderr));
                return;
            }
            resolve({ stdout, stderr });
        });
    });
}
//# sourceMappingURL=exec.js.map
;// CONCATENATED MODULE: ./node_modules/.pnpm/@sentry+dotagents-lib@1.16.1/node_modules/@sentry/dotagents-lib/dist/sources/git.js


function toSshCloneUrl(url) {
    const hostedMatch = url.match(/^https?:\/\/(github\.com|gitlab\.com)\/(.+)$/i);
    if (!hostedMatch) {
        return undefined;
    }
    const host = hostedMatch[1];
    const rawPath = hostedMatch[2];
    let path = rawPath;
    while (path.endsWith("/")) {
        path = path.slice(0, -1);
    }
    return `git@${host.toLowerCase()}:${path.endsWith(".git") ? path : `${path}.git`}`;
}
class GitError extends Error {
    details;
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = "GitError";
    }
}
/** Hex-only string of 7-40 chars — looks like a commit SHA. */
const SHA_LIKE = /^[0-9a-f]{7,40}$/i;
/**
 * Clone a repo with --depth=1 into the given directory.
 * If ref is provided, clones that specific ref.
 *
 * Commit SHAs can't be passed to `git clone --branch`, so for SHA-like refs
 * we clone the default branch first, then fetch the specific commit.
 */
async function clone(url, dest, ref) {
    const isSha = ref && SHA_LIKE.test(ref);
    const args = ["clone", "--depth=1"];
    if (ref && !isSha) {
        args.push("--branch", ref);
    }
    args.push("--", url, dest);
    try {
        await exec("git", args);
    }
    catch (err) {
        if (err instanceof ExecError) {
            const stderr = err.stderr;
            const sshUrl = toSshCloneUrl(url);
            if (sshUrl &&
                (/terminal prompts disabled/i.test(stderr) ||
                    /could not read Username/i.test(stderr))) {
                throw new GitError(`Failed to clone ${url}: authentication required.`, { kind: "auth-required", url, sshUrl, stderr });
            }
            throw new GitError(`Failed to clone ${url}: ${stderr}`, {
                kind: "other",
                url,
                stderr,
            });
        }
        throw err;
    }
    // For SHA refs, fetch the specific commit after the initial clone
    if (isSha) {
        await fetchRef(dest, ref);
    }
}
/**
 * Fetch latest and reset to origin's HEAD. For updating unpinned repos.
 */
async function fetchAndReset(repoDir) {
    try {
        await exec("git", ["fetch", "--force", "--depth=1", "--", "origin"], { cwd: repoDir });
        await exec("git", ["reset", "--hard", "FETCH_HEAD"], { cwd: repoDir });
    }
    catch (err) {
        if (err instanceof ExecError) {
            throw new GitError(`Failed to update ${repoDir}: ${err.stderr}`);
        }
        throw err;
    }
}
/**
 * Fetch a specific ref and checkout.
 */
async function fetchRef(repoDir, ref) {
    try {
        await exec("git", ["fetch", "--force", "--depth=1", "--", "origin", ref], {
            cwd: repoDir,
        });
        await exec("git", ["checkout", "FETCH_HEAD"], { cwd: repoDir });
    }
    catch (err) {
        if (err instanceof ExecError) {
            throw new GitError(`Failed to fetch ref ${ref} in ${repoDir}: ${err.stderr}`);
        }
        throw err;
    }
}
/**
 * Get the current HEAD commit SHA (full 40 chars).
 */
async function headCommit(repoDir) {
    const { stdout } = await exec("git", ["rev-parse", "HEAD"], { cwd: repoDir });
    return stdout.trim();
}
/**
 * Get the committer date of HEAD as a Date.
 * Uses committer date (not author date) to reflect when the commit landed on the branch,
 * which aligns with "release age" semantics (survives cherry-picks and merges).
 */
async function headCommitDate(repoDir) {
    const { stdout } = await exec("git", ["log", "-1", "--format=%cI", "HEAD"], { cwd: repoDir });
    return new Date(stdout.trim());
}
/**
 * Find the newest commit on the current branch whose committer date is at least
 * `minAgeMinutes` minutes old. Unshallows the repo to search full history.
 *
 * Returns the SHA, or `null` if no qualifying commit exists (repo is younger
 * than the threshold).
 */
async function findCommitOlderThan(repoDir, minAgeMinutes) {
    const cutoff = new Date(Date.now() - minAgeMinutes * 60 * 1000);
    const iso = cutoff.toISOString();
    // Unshallow to get full history — needed to find commits older than the cutoff.
    // Only called when HEAD is too new, so the extra fetch is acceptable.
    try {
        await exec("git", ["fetch", "--force", "--unshallow", "--", "origin"], { cwd: repoDir });
    }
    catch (err) {
        if (!(err instanceof ExecError)) {
            throw err;
        }
        // --unshallow fails on a complete (non-shallow) repository — that's fine
        if (!/unshallow on a complete repository/i.test(err.stderr)) {
            throw new GitError(`Failed to fetch history for age gate: ${err.stderr}`);
        }
    }
    // Find the newest commit at or before the cutoff.
    // Use HEAD (not FETCH_HEAD) — after the prior fetchAndReset, HEAD is at the
    // latest commit and --unshallow made full history available behind it.
    const { stdout } = await exec("git", ["log", "--format=%H", "--before", iso, "-1", "HEAD"], { cwd: repoDir });
    const sha = stdout.trim();
    return sha || null;
}
/**
 * Checkout a local ref (commit, branch, tag). No fetch — the ref must already exist locally.
 */
async function checkout(repoDir, ref) {
    try {
        await exec("git", ["checkout", ref], { cwd: repoDir });
    }
    catch (err) {
        if (err instanceof ExecError) {
            throw new GitError(`Failed to checkout ${ref} in ${repoDir}: ${err.stderr}`);
        }
        throw err;
    }
}
/**
 * Check if a directory is a git repository.
 */
function isGitRepo(dir) {
    return (0,external_node_fs_.existsSync)(`${dir}/.git`);
}
//# sourceMappingURL=git.js.map
;// CONCATENATED MODULE: ./node_modules/.pnpm/@sentry+dotagents-lib@1.16.1/node_modules/@sentry/dotagents-lib/dist/sources/cache.js



class CacheError extends Error {
    constructor(message) {
        super(message);
        this.name = "CacheError";
    }
}
/**
 * Derive a safe relative cache-key from a clone URL.
 *
 * Strips schemes, leading slashes (so `file:///abs/path` and `/abs/path`
 * both land under `<stateDir>/abs/path/`), and `.git` suffixes. Drops `.`
 * and `..` segments to keep the result inside the cache root.
 *
 * Callers that build a cacheKey from a hosted owner/repo (e.g. GitHub) can
 * skip this and use the parsed values directly.
 */
function cache_sanitizeCacheKey(url) {
    const stripped = url
        .replace(/^[a-z]+:\/\//i, "")
        .replace(/^\/+/, "")
        .replace(/\.git$/, "");
    const segments = stripped
        .split("/")
        .filter((seg) => seg !== "" && seg !== "." && seg !== "..");
    return segments.join("/");
}
/**
 * Reject `cacheKey` values that would let `path.join(stateDir, cacheKey)`
 * resolve outside `stateDir`.
 *
 * The cacheKey is derived from URL paths or owner/repo strings, which can
 * contain `..` if a caller pipes through a malicious source spec. Without
 * this guard, a cacheKey like `evil.com/../../etc` would let `git clone`
 * write into arbitrary filesystem locations.
 */
function cache_validateCacheKey(cacheKey) {
    if (!cacheKey) {
        throw new CacheError("cacheKey must be a non-empty string");
    }
    if (cacheKey.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(cacheKey)) {
        throw new CacheError(`cacheKey must be a relative path, got "${cacheKey}"`);
    }
    if (cacheKey.includes("\\")) {
        throw new CacheError(`cacheKey may not contain backslashes, got "${cacheKey}"`);
    }
    for (const segment of cacheKey.split("/")) {
        if (segment === "" || segment === "." || segment === "..") {
            throw new CacheError(`cacheKey may not contain "${segment}" segments, got "${cacheKey}"`);
        }
    }
}
const cacheLocks = new Map();
async function withCacheLock(key, fn) {
    const previous = cacheLocks.get(key) ?? Promise.resolve();
    let release;
    const current = new Promise((resolve) => {
        release = resolve;
    });
    const next = previous.catch(() => { }).then(() => current);
    cacheLocks.set(key, next);
    await previous.catch(() => { });
    try {
        return await fn();
    }
    finally {
        release();
        if (cacheLocks.get(key) === next) {
            cacheLocks.delete(key);
        }
    }
}
/**
 * Get or populate the global cache for a git source.
 *
 * Always fetches the latest from the remote when a cached clone exists.
 * A shallow `git fetch --depth=1` is essentially free when already at
 * the latest commit, so there is no TTL — callers always get fresh state.
 *
 * The caller MUST supply the cache root directory (`stateDir`); the lib
 * does not impose a default. Hosts typically resolve this from their own
 * convention (e.g. `~/.local/<host>/`) plus an optional env var override.
 *
 * Cache layout:  `<stateDir>/<cacheKey>/`  -- shallow clone
 */
async function cache_ensureCached(opts) {
    cache_validateCacheKey(opts.cacheKey);
    const repoDir = (0,external_node_path_.join)(opts.stateDir, opts.cacheKey);
    return withCacheLock(repoDir, async () => {
        if (isGitRepo(repoDir)) {
            if (opts.ref) {
                await fetchRef(repoDir, opts.ref);
            }
            else {
                await fetchAndReset(repoDir);
            }
        }
        else {
            // Remove an interrupted or stale non-git cache dir before cloning.
            await (0,promises_.rm)(repoDir, { recursive: true, force: true });
            await (0,promises_.mkdir)((0,external_node_path_.join)(opts.stateDir, opts.cacheKey, ".."), { recursive: true });
            await clone(opts.url, repoDir, opts.ref);
        }
        // Age gate: reject or resolve to an older commit when HEAD is too new
        if (opts.minimumReleaseAge) {
            const age = minutesOld(await headCommitDate(repoDir));
            if (age < opts.minimumReleaseAge) {
                if (opts.ref) {
                    // Pinned skill — can't resolve to a different commit, just reject
                    throw new CacheError(`ref "${opts.ref}" is ${Math.floor(age)} minutes old, minimum_release_age requires ${opts.minimumReleaseAge}`);
                }
                const older = await findCommitOlderThan(repoDir, opts.minimumReleaseAge);
                if (!older) {
                    throw new CacheError(`minimum_release_age is ${opts.minimumReleaseAge} minutes but no commit that old exists in ${opts.cacheKey}`);
                }
                await checkout(repoDir, older);
            }
        }
        const commit = await headCommit(repoDir);
        return { repoDir, commit };
    });
}
function minutesOld(date) {
    return (Date.now() - date.getTime()) / (60 * 1000);
}
//# sourceMappingURL=cache.js.map
;// CONCATENATED MODULE: ./node_modules/.pnpm/@sentry+dotagents-lib@1.16.1/node_modules/@sentry/dotagents-lib/dist/utils/fs.js


/**
 * Copy a directory recursively, excluding .git/.
 * Removes destination first if it exists.
 */
async function copyDir(src, dest) {
    await rm(dest, { recursive: true, force: true });
    await cp(src, dest, {
        recursive: true,
        filter: (source) => basename(source) !== ".git",
    });
}
/** Strip trailing `/` characters from a string. */
function fs_stripTrailingSlashes(s) {
    let end = s.length;
    while (end > 0 && s[end - 1] === "/") {
        end--;
    }
    return end === s.length ? s : s.slice(0, end);
}
//# sourceMappingURL=fs.js.map
;// CONCATENATED MODULE: ./node_modules/.pnpm/@sentry+dotagents-lib@1.16.1/node_modules/@sentry/dotagents-lib/dist/sources/wellknown.js





/** Skill names must be safe path segments: alphanumeric, dots, hyphens, underscores. */
const SAFE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
/** Check that a file path is safe: no traversal (..), no absolute paths, each segment is safe. */
function isSafeFilePath(filePath) {
    if (!filePath || filePath.startsWith("/")) {
        return false;
    }
    return filePath.split("/").every((seg) => seg.length > 0 && seg !== ".." && seg !== "." && SAFE_NAME.test(seg));
}
const DEFAULT_TTL_MS = (/* unused pure expression or super */ null && (24 * 60 * 60 * 1000)); // 24 hours
const FETCH_TIMEOUT_MS = 10_000;
const MARKER_FILE = ".well-known-fetched";
/**
 * Fetch the well-known skills index from a base URL.
 * Returns the parsed index or null on failure (404, network error, invalid JSON).
 */
async function fetchWellKnownIndex(baseUrl) {
    const indexUrl = `${stripTrailingSlashes(baseUrl)}/.well-known/skills/index.json`;
    try {
        const response = await fetch(indexUrl, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!response.ok) {
            return null;
        }
        const data = (await response.json());
        if (!isValidIndex(data)) {
            return null;
        }
        return data;
    }
    catch {
        return null;
    }
}
function isValidIndex(data) {
    if (!data || typeof data !== "object") {
        return false;
    }
    const obj = data;
    if (!Array.isArray(obj["skills"])) {
        return false;
    }
    return obj["skills"].every((s) => {
        if (!s || typeof s !== "object") {
            return false;
        }
        const entry = s;
        return (typeof entry["name"] === "string" &&
            Array.isArray(entry["files"]) &&
            entry["files"].every((f) => typeof f === "string"));
    });
}
/**
 * Ensure skills from a well-known HTTP source are cached locally.
 *
 * The caller MUST supply the cache root directory (`stateDir`); the lib
 * does not impose a default.
 *
 * Cache layout:  `<stateDir>/<cacheKey>/<skillName>/SKILL.md`
 *
 * Uses a TTL-based marker file for freshness. On fetch failure with
 * existing cache, returns stale cache (same offline behavior as git).
 */
async function wellknown_ensureWellKnownCached(opts) {
    validateCacheKey(opts.cacheKey);
    const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;
    const cacheDir = join(opts.stateDir, opts.cacheKey);
    if (existsSync(cacheDir) && !(await isStale(cacheDir, ttl))) {
        return { cacheDir };
    }
    const baseUrl = stripTrailingSlashes(opts.url);
    const index = await fetchWellKnownIndex(baseUrl);
    if (!index) {
        // Fetch failed — use stale cache if available
        if (existsSync(cacheDir)) {
            return { cacheDir };
        }
        return null;
    }
    // Download all skill files into cache
    await mkdir(cacheDir, { recursive: true });
    // Remove old skill directories that are no longer in the index
    const currentSkills = new Set(index.skills.map((s) => s.name));
    try {
        const entries = await readdir(cacheDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && !currentSkills.has(entry.name)) {
                await rm(join(cacheDir, entry.name), { recursive: true, force: true });
            }
        }
    }
    catch {
        // Ignore readdir failures
    }
    for (const skill of index.skills) {
        // Validate skill name to prevent path traversal from untrusted index
        if (!SAFE_NAME.test(skill.name)) {
            continue;
        }
        const skillDir = join(cacheDir, skill.name);
        await mkdir(skillDir, { recursive: true });
        for (const file of skill.files) {
            // Validate file path to prevent traversal (allows subdirectories)
            if (!isSafeFilePath(file)) {
                continue;
            }
            const fileUrl = `${baseUrl}/.well-known/skills/${skill.name}/${file}`;
            try {
                const response = await fetch(fileUrl, {
                    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
                });
                if (!response.ok) {
                    continue;
                }
                const content = await response.text();
                const filePath = join(skillDir, file);
                // Ensure parent directory exists for nested files (e.g. prompts/base.md)
                const parentDir = join(filePath, "..");
                await mkdir(parentDir, { recursive: true });
                await writeFile(filePath, content, "utf-8");
            }
            catch {
                // Skip files that fail to download
            }
        }
    }
    // Write marker file with current timestamp
    await writeFile(join(cacheDir, MARKER_FILE), Date.now().toString(), "utf-8");
    return { cacheDir };
}
async function isStale(cacheDir, ttlMs) {
    try {
        const markerPath = join(cacheDir, MARKER_FILE);
        const s = await stat(markerPath);
        return Date.now() - s.mtimeMs > ttlMs;
    }
    catch {
        return true;
    }
}
//# sourceMappingURL=wellknown.js.map
;// CONCATENATED MODULE: ./node_modules/.pnpm/@sentry+dotagents-lib@1.16.1/node_modules/@sentry/dotagents-lib/dist/sources/local.js


class LocalSourceError extends Error {
    constructor(message) {
        super(message);
        this.name = "LocalSourceError";
    }
}
/**
 * Resolve a path: source to an absolute directory.
 * The path is relative to the project root.
 */
async function local_resolveLocalSource(projectRoot, relativePath) {
    const absRoot = resolve(projectRoot);
    const absPath = resolve(projectRoot, relativePath);
    // Prevent path traversal outside the project root
    if (!absPath.startsWith(`${absRoot}/`) && absPath !== absRoot) {
        throw new LocalSourceError(`Local source "${relativePath}" resolves outside project root`);
    }
    let s;
    try {
        s = await stat(absPath);
    }
    catch {
        throw new LocalSourceError(`Local source not found: ${absPath}`);
    }
    if (!s.isDirectory()) {
        throw new LocalSourceError(`Local source is not a directory: ${absPath}`);
    }
    return absPath;
}
//# sourceMappingURL=local.js.map
;// CONCATENATED MODULE: ./node_modules/.pnpm/@sentry+dotagents-lib@1.16.1/node_modules/@sentry/dotagents-lib/dist/trust/validator.js

class TrustError extends Error {
    details;
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = "TrustError";
    }
}
/**
 * Extract domain from a git URL.
 *
 * Supports:
 *   https://host.com/...  → host.com
 *   ssh://host.com/...    → host.com
 *   git://host.com/...    → host.com
 *   git@host.com:...      → host.com
 *   file:///...           → (no domain)
 */
function extractDomain(url) {
    // git@host.com:owner/repo.git
    const scpMatch = url.match(/^[a-z]+@([^:]+):/);
    if (scpMatch) {
        return scpMatch[1];
    }
    // https://host.com/..., ssh://host.com/..., git://host.com/...
    try {
        const parsed = new URL(url);
        // Use host (includes port) instead of hostname (strips port)
        if (parsed.host) {
            return parsed.host;
        }
    }
    catch {
        // Not a valid URL — no domain
    }
    return undefined;
}
/**
 * Extract domain + path from a git URL, stripping .git suffix and trailing slashes.
 *
 * Used for prefix-matching against `git_domains` entries that may include path components
 * (e.g., `gitlab.com/owner/group`).
 *
 * Examples:
 *   https://gitlab.com/owner/group/repo.git → gitlab.com/owner/group/repo
 *   git@gitlab.com:owner/group/repo.git     → gitlab.com/owner/group/repo
 *   https://gitlab.com                      → gitlab.com
 */
/** Normalize path segments, resolving `.` and `..` to prevent traversal bypasses. */
function normalizePath(raw) {
    const segments = [];
    for (const seg of raw.split("/")) {
        if (seg === "" || seg === ".") {
            continue;
        }
        if (seg === "..") {
            segments.pop();
        }
        else {
            segments.push(seg);
        }
    }
    return segments.join("/");
}
function extractDomainPath(url) {
    // SCP-style: git@host.com:path
    const scpMatch = url.match(/^[a-z]+@([^:]+):(.+)$/);
    if (scpMatch) {
        const host = scpMatch[1];
        const path = normalizePath(scpMatch[2].replace(/\.git$/i, ""));
        return path ? `${host}/${path}` : host;
    }
    try {
        const parsed = new URL(url);
        if (!parsed.host) {
            return undefined;
        }
        const path = normalizePath(parsed.pathname.replace(/\.git$/i, ""));
        return path ? `${parsed.host}/${path}` : parsed.host;
    }
    catch {
        return undefined;
    }
}
function formatAllowed(trust) {
    const parts = [];
    if (trust.github_orgs.length > 0) {
        parts.push(`orgs: ${trust.github_orgs.join(", ")}`);
    }
    if (trust.github_repos.length > 0) {
        parts.push(`repos: ${trust.github_repos.join(", ")}`);
    }
    if (trust.git_domains.length > 0) {
        parts.push(`domains: ${trust.git_domains.join(", ")}`);
    }
    return parts.length > 0 ? parts.join("; ") : "none";
}
/**
 * Validate that a source specifier is allowed by the trust configuration.
 *
 * - No trust config → allow all (backward compat)
 * - allow_all = true → allow all
 * - Local path: sources → always allowed
 * - Otherwise → must match at least one rule (org, repo, or domain)
 */
function validator_validateTrustedSource(source, trust) {
    // No trust config → allow everything
    if (!trust) {
        return;
    }
    // Explicit opt-out
    if (trust.allow_all) {
        return;
    }
    const parsed = parseSource(source);
    // Local sources are always allowed
    if (parsed.type === "local") {
        return;
    }
    if (parsed.type === "github") {
        const owner = parsed.owner.toLowerCase();
        const repo = `${owner}/${parsed.repo.toLowerCase()}`;
        if (trust.github_orgs.some((o) => o.toLowerCase() === owner)) {
            return;
        }
        if (trust.github_repos.some((r) => r.toLowerCase() === repo)) {
            return;
        }
        throw new TrustError(`Source "${source}" is not trusted. Allowed sources: ${formatAllowed(trust)}.`, {
            source,
            kind: "github",
            owner: parsed.owner,
            repo: parsed.repo,
            allowed: trust,
        });
    }
    if (parsed.type === "git" || parsed.type === "well-known") {
        const domainPath = extractDomainPath(parsed.url)?.toLowerCase();
        if (domainPath && trust.git_domains.some((d) => {
            const entry = d.toLowerCase();
            return domainPath === entry || domainPath.startsWith(`${entry}/`);
        })) {
            return;
        }
        const domain = extractDomain(parsed.url)?.toLowerCase();
        throw new TrustError(`Source "${source}" is not trusted. Allowed sources: ${formatAllowed(trust)}.`, {
            source,
            kind: parsed.type,
            domain,
            allowed: trust,
        });
    }
}
//# sourceMappingURL=validator.js.map
;// CONCATENATED MODULE: ./node_modules/.pnpm/@sentry+dotagents-lib@1.16.1/node_modules/@sentry/dotagents-lib/dist/skills/resolver.js









class ResolveError extends Error {
    constructor(message) {
        super(message);
        this.name = "ResolveError";
    }
}
class ParseSourceError extends Error {
    kind;
    constructor(message, kind) {
        super(message);
        this.name = "ParseSourceError";
        this.kind = kind;
    }
}
function isExplicitSourceSpecifier(specifier) {
    return (specifier.startsWith("path:") ||
        specifier.startsWith("git:") ||
        specifier.startsWith("http://") ||
        specifier.startsWith("https://") ||
        specifier.startsWith("git@"));
}
/** Strip a leading `@` from npm-style scoped specifiers (e.g. `@owner/repo` → `owner/repo`). */
function stripLeadingAt(specifier) {
    return specifier.startsWith("@") ? specifier.slice(1) : specifier;
}
function parseOwnerRepoShorthand(specifier) {
    if (isExplicitSourceSpecifier(specifier)) {
        return undefined;
    }
    const stripped = stripLeadingAt(specifier);
    const atIdx = stripped.indexOf("@");
    const base = atIdx >= 0 ? stripped.slice(0, atIdx) : stripped;
    const ref = atIdx >= 0 ? stripped.slice(atIdx + 1) : undefined;
    // Empty SHA after `@` is malformed shorthand, not a valid no-pin parse.
    if (atIdx >= 0 && ref === "") {
        return undefined;
    }
    const parts = base.split("/");
    if (parts.length !== 2) {
        return undefined;
    }
    const [owner, repo] = parts;
    if (!owner || !repo || owner.startsWith("-") || repo.startsWith("-")) {
        return undefined;
    }
    return { owner, repo, ref };
}
/**
 * Expand owner/repo shorthand according to defaultRepositorySource.
 * Returns input unchanged for explicit sources or non-shorthand values.
 *
 * When defaultRepositorySource is "gitlab", also handles multi-slash paths
 * (e.g., `group/subgroup/repo`) since GitLab supports nested groups.
 */
function applyDefaultRepositorySource(specifier, defaultRepositorySource = "github") {
    if (isExplicitSourceSpecifier(specifier)) {
        return specifier;
    }
    const shorthand = parseOwnerRepoShorthand(specifier);
    if (shorthand) {
        const host = defaultRepositorySource === "gitlab" ? "gitlab.com" : "github.com";
        const refSuffix = shorthand.ref ? `@${shorthand.ref}` : "";
        return `https://${host}/${shorthand.owner}/${shorthand.repo}${refSuffix}`;
    }
    // Multi-slash GitLab path: group/subgroup/repo[@ref]
    if (defaultRepositorySource === "gitlab") {
        const stripped = stripLeadingAt(specifier);
        const atIdx = stripped.indexOf("@");
        const base = atIdx >= 0 ? stripped.slice(0, atIdx) : stripped;
        const ref = atIdx >= 0 ? stripped.slice(atIdx + 1) : undefined;
        const parts = base.split("/");
        if (parts.length >= 3 && parts.every((p) => p && !p.startsWith("-"))) {
            const refSuffix = ref ? `@${ref}` : "";
            return `https://gitlab.com/${base}${refSuffix}`;
        }
    }
    return specifier;
}
/**
 * Parse a source string into its components.
 */
function resolver_parseSource(source) {
    if (source.startsWith("path:")) {
        return { type: "local", path: source.slice(5) };
    }
    if (source.startsWith("git:")) {
        return { type: "git", url: source.slice(4) };
    }
    // GitHub HTTPS or SSH URL
    const githubUrlMatch = source.match(GITHUB_HTTPS_URL) || source.match(GITHUB_SSH_URL);
    if (githubUrlMatch) {
        const [, owner, repo, ref] = githubUrlMatch;
        // Strip @ref suffix using known ref length, upgrade http:// to https:// (no-op for SSH URLs)
        const withoutRef = ref ? source.slice(0, -(ref.length + 1)) : source;
        const cloneUrl = withoutRef.replace(/^http:\/\//i, "https://");
        return {
            type: "github",
            owner,
            repo,
            ref,
            url: `https://github.com/${owner}/${repo}.git`,
            cloneUrl,
        };
    }
    // GitLab HTTPS or SSH URL
    const gitlabUrlMatch = source.match(GITLAB_HTTPS_URL) || source.match(GITLAB_SSH_URL);
    if (gitlabUrlMatch) {
        const [, owner, repo, ref] = gitlabUrlMatch;
        // Strip @ref suffix using known ref length, upgrade http:// to https:// (no-op for SSH URLs)
        const withoutRef = ref ? source.slice(0, -(ref.length + 1)) : source;
        const cloneUrl = withoutRef.replace(/^http:\/\//i, "https://");
        return {
            type: "git",
            owner,
            repo,
            ref,
            url: `https://gitlab.com/${owner}/${repo}.git`,
            cloneUrl,
        };
    }
    // Bare HTTPS URL not matching GitHub/GitLab — candidate for well-known
    // Only HTTPS — http:// is rejected to prevent MITM attacks
    if (/^https:\/\//i.test(source)) {
        return { type: "well-known", url: fs_stripTrailingSlashes(source) };
    }
    // owner/repo or owner/repo@ref — shorthand, no cloneUrl
    const stripped = stripLeadingAt(source);
    const atIdx = stripped.indexOf("@");
    const base = atIdx === -1 ? stripped : stripped.slice(0, atIdx);
    const ref = atIdx === -1 ? undefined : stripped.slice(atIdx + 1);
    // Empty SHA after `@` was previously returning `ref: ''` which downstream
    // code treats as no-pin. Throw instead so a typo doesn't silently fall back
    // to the tip of the default branch.
    if (atIdx >= 0 && ref === "") {
        throw new ParseSourceError(`Invalid source: ${source} (empty SHA after @)`, "empty-sha");
    }
    const parts = base.split("/");
    // Multi-segment shorthand silently dropped trailing segments. Throw so
    // `owner/repo/nested` doesn't resolve as `owner/repo` against the user's
    // intent. (GitLab nested groups go through applyDefaultRepositorySource
    // first and arrive here as URL form, not shorthand.)
    if (parts.length > 2) {
        throw new ParseSourceError(`Invalid source: ${source} (multi-segment shorthand; use a full URL for nested groups)`, "multi-segment-shorthand");
    }
    const [owner, repo] = parts;
    return {
        type: "github",
        owner,
        repo,
        ref,
        url: `https://github.com/${owner}/${repo}.git`,
    };
}
/**
 * Normalize hosted sources to canonical owner/repo form for comparison/dedup.
 *
 * Best-effort: malformed inputs that `parseSource` rejects are returned as-is
 * so dedup and comparison paths don't crash on stale or hand-edited config.
 * Real install/add paths still call `parseSource` directly and surface the
 * error to the user.
 */
function normalizeSource(source) {
    let parsed;
    try {
        parsed = resolver_parseSource(source);
    }
    catch (err) {
        if (err instanceof ParseSourceError) {
            return source;
        }
        throw err;
    }
    if (parsed.type === "well-known" && parsed.url) {
        // Normalize: strip trailing slash, lowercase hostname
        try {
            const u = new URL(parsed.url);
            return `${u.protocol}//${u.host.toLowerCase()}${stripTrailingSlashes(u.pathname)}`;
        }
        catch {
            return source;
        }
    }
    if (parsed.owner && parsed.repo) {
        return `${parsed.owner}/${parsed.repo}`;
    }
    return source;
}
/** Build a cache key for a well-known URL (e.g. "wellknown/cli.sentry.dev/path"). */
function wellKnownCacheKey(baseUrl) {
    const u = new URL(baseUrl);
    return `wellknown/${u.host.toLowerCase()}${stripTrailingSlashes(u.pathname)}`;
}
/** Compare two source strings for equivalence (normalizes hosted URLs to owner/repo). */
function sourcesMatch(a, b) {
    return normalizeSource(a) === normalizeSource(b);
}
async function resolveSkill(skillName, dep, opts) {
    const sourceForResolve = applyDefaultRepositorySource(dep.source, opts.defaultRepositorySource);
    // Validate the EXPANDED source so that owner/repo shorthand under a non-default
    // host (e.g. defaultRepositorySource: "gitlab") is checked against the actual
    // clone URL, not the shorthand's implicit github.com mapping.
    if (opts.trust) {
        validateTrustedSource(sourceForResolve, opts.trust);
    }
    const parsed = resolver_parseSource(sourceForResolve);
    if (parsed.type === "local") {
        const projectRoot = opts.projectRoot || process.cwd();
        const skillDir = await resolveLocalSource(projectRoot, parsed.path);
        return { type: "local", source: dep.source, skillDir };
    }
    if (parsed.type === "well-known") {
        const baseUrl = parsed.url;
        const cached = await ensureWellKnownCached({
            stateDir: opts.stateDir,
            url: baseUrl,
            cacheKey: wellKnownCacheKey(baseUrl),
            ttlMs: opts.ttlMs,
        });
        if (!cached) {
            throw new ResolveError(`No skills found at ${baseUrl}. If this is a git repository, use the git: prefix: git:${baseUrl}`);
        }
        const discovered = await discoverSkill(cached.cacheDir, skillName, { scanDirs: opts.scanDirs });
        if (!discovered) {
            throw new ResolveError(`Skill "${skillName}" not found in ${dep.source}. ` +
                `Tried conventional directories. Use the 'path' field to specify the location explicitly.`);
        }
        return {
            type: "well-known",
            source: dep.source,
            resolvedUrl: baseUrl,
            skillDir: join(cached.cacheDir, discovered.path),
        };
    }
    // Git source (GitHub or generic git)
    const url = parsed.url;
    const cloneUrl = parsed.cloneUrl ?? url;
    const ref = dep.ref ?? parsed.ref;
    const cacheKey = parsed.type === "github"
        ? `${parsed.owner}/${parsed.repo}`
        : sanitizeCacheKey(url);
    const excluded = isSourceExcluded(dep.source, opts.minimumReleaseAgeExclude);
    const cached = await ensureCached({
        stateDir: opts.stateDir,
        url: cloneUrl,
        cacheKey,
        ref,
        minimumReleaseAge: excluded ? undefined : opts.minimumReleaseAge,
    });
    // Discover the skill within the repo
    let discovered;
    if (dep.path) {
        // Explicit path override — load directly
        const meta = await loadSkillMd(join(cached.repoDir, dep.path, "SKILL.md"));
        discovered = { path: dep.path, meta };
    }
    else {
        discovered = await discoverSkill(cached.repoDir, skillName, { scanDirs: opts.scanDirs });
    }
    if (!discovered) {
        throw new ResolveError(`Skill "${skillName}" not found in ${dep.source}. ` +
            `Tried conventional directories. Use the 'path' field to specify the location explicitly.`);
    }
    return {
        type: "git",
        source: dep.source,
        resolvedUrl: cloneUrl,
        resolvedPath: discovered.path,
        resolvedRef: ref,
        commit: cached.commit,
        skillDir: join(cached.repoDir, discovered.path),
    };
}
/** Skill names must be safe for use in file paths. */
const VALID_SKILL_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
/**
 * Resolve a wildcard dependency: discover all skills from a source and return them.
 * Excludes are filtered out. Skill names are validated to prevent path traversal.
 */
async function resolveWildcardSkills(dep, opts) {
    const sourceForResolve = applyDefaultRepositorySource(dep.source, opts.defaultRepositorySource);
    // See note on resolveSkill: validate the expanded source so shorthand under a
    // non-default host can't bypass the policy.
    if (opts.trust) {
        validateTrustedSource(sourceForResolve, opts.trust);
    }
    const parsed = resolver_parseSource(sourceForResolve);
    const excludeSet = new Set(dep.exclude);
    if (parsed.type === "local") {
        const projectRoot = opts.projectRoot || process.cwd();
        const skillDir = await resolveLocalSource(projectRoot, parsed.path);
        const discovered = await discoverAllSkills(skillDir, { scanDirs: opts.scanDirs });
        return discovered
            .filter((d) => !excludeSet.has(d.meta.name) && VALID_SKILL_NAME.test(d.meta.name))
            .map((d) => ({
            name: d.meta.name,
            resolved: {
                type: "local",
                source: dep.source,
                skillDir: join(skillDir, d.path),
            },
        }));
    }
    if (parsed.type === "well-known") {
        const baseUrl = parsed.url;
        const cached = await ensureWellKnownCached({
            stateDir: opts.stateDir,
            url: baseUrl,
            cacheKey: wellKnownCacheKey(baseUrl),
            ttlMs: opts.ttlMs,
        });
        if (!cached) {
            return [];
        }
        const discovered = await discoverAllSkills(cached.cacheDir, { scanDirs: opts.scanDirs });
        return discovered
            .filter((d) => !excludeSet.has(d.meta.name) && VALID_SKILL_NAME.test(d.meta.name))
            .map((d) => ({
            name: d.meta.name,
            resolved: {
                type: "well-known",
                source: dep.source,
                resolvedUrl: baseUrl,
                skillDir: join(cached.cacheDir, d.path),
            },
        }));
    }
    // Git source
    const url = parsed.url;
    const cloneUrl = parsed.cloneUrl ?? url;
    const ref = dep.ref ?? parsed.ref;
    const cacheKey = parsed.type === "github"
        ? `${parsed.owner}/${parsed.repo}`
        : sanitizeCacheKey(url);
    const excluded = isSourceExcluded(dep.source, opts.minimumReleaseAgeExclude);
    const cached = await ensureCached({
        stateDir: opts.stateDir,
        url: cloneUrl,
        cacheKey,
        ref,
        minimumReleaseAge: excluded ? undefined : opts.minimumReleaseAge,
    });
    const discovered = await discoverAllSkills(cached.repoDir, { scanDirs: opts.scanDirs });
    return discovered
        .filter((d) => !excludeSet.has(d.meta.name) && VALID_SKILL_NAME.test(d.meta.name))
        .map((d) => ({
        name: d.meta.name,
        resolved: {
            type: "git",
            source: dep.source,
            resolvedUrl: cloneUrl,
            resolvedPath: d.path,
            resolvedRef: ref,
            commit: cached.commit,
            skillDir: join(cached.repoDir, d.path),
        },
    }));
}
/**
 * Check if a source string matches any pattern in the exclude list.
 * Patterns: "org" matches "org/anything", "org/repo" is exact match,
 * "org/*" matches "org/anything" (explicit wildcard).
 */
function isSourceExcluded(source, exclude) {
    if (!exclude?.length) {
        return false;
    }
    const normalized = source.replace(/^git:/, "");
    for (const raw of exclude) {
        const pattern = raw.replace(/^git:/, "");
        if (pattern.includes("/") && !pattern.endsWith("/*")) {
            // Exact org/repo match
            if (normalized === pattern) {
                return true;
            }
        }
        else {
            // Bare org ("myorg") or wildcard ("myorg/*") — both match as prefix
            const prefix = pattern.replace(/\/\*$/, "");
            if (normalized.startsWith(`${prefix}/`)) {
                return true;
            }
        }
    }
    return false;
}
//# sourceMappingURL=resolver.js.map
;// CONCATENATED MODULE: ./node_modules/.pnpm/@sentry+dotagents-lib@1.16.1/node_modules/@sentry/dotagents-lib/dist/sources/name-safety.js
class GitNameSafetyError extends Error {
    field;
    reason;
    constructor(field, reason, message) {
        super(message);
        this.name = "GitNameSafetyError";
        this.field = field;
        this.reason = reason;
    }
}
/**
 * Owner / repo / ref segments must start with an alphanumeric and contain
 * only alphanumerics, dots, hyphens, and underscores. Matches GitHub's
 * username/repo character rules.
 */
const SAFE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
/**
 * Validate that owner/repo/ref values are safe to splice into a git command
 * and into filesystem paths. Throws `GitNameSafetyError` on the first violation.
 *
 * `parseSource` does not call this automatically — parse and validate stay
 * separable so callers that need the looser parse (e.g. `normalizeSource`
 * for dedup comparisons) aren't forced through the strict gate.
 *
 * `owner` is validated segment-by-segment so GitLab nested groups
 * (`group/subgroup`) pass when each segment is independently safe.
 */
function validateGitNameSafety(input) {
    if (input.owner !== undefined) {
        for (const segment of input.owner.split("/")) {
            validateSegment("owner", segment);
        }
    }
    if (input.repo !== undefined) {
        validateSegment("repo", input.repo);
    }
    if (input.ref !== undefined) {
        validateSegment("ref", input.ref);
    }
}
function validateSegment(field, value) {
    if (value.startsWith("-")) {
        throw new GitNameSafetyError(field, "leading-dash", `${field} cannot start with '-' (would inject a git flag): ${JSON.stringify(value)}`);
    }
    // Reject any consecutive-dot pattern. The exact `.` and `..` cases are the
    // common ones, but `foo..bar`, `..foo`, etc. would also bypass directory
    // boundaries when joined into a filesystem path.
    if (value === "." || value.includes("..")) {
        throw new GitNameSafetyError(field, "traversal", `${field} contains a path-traversal pattern: ${JSON.stringify(value)}`);
    }
    if (!SAFE_NAME_PATTERN.test(value)) {
        throw new GitNameSafetyError(field, "invalid-characters", `${field} contains invalid characters: ${JSON.stringify(value)}`);
    }
}
//# sourceMappingURL=name-safety.js.map
;// CONCATENATED MODULE: ./node_modules/.pnpm/@sentry+dotagents-lib@1.16.1/node_modules/@sentry/dotagents-lib/dist/index.js
// SKILL.md loading

// Tool name vocabulary (allowed-tools frontmatter)

// Skill discovery

// Source-string grammar + resolution

// Sources / cache




// Source-host primitives

// Trust

// Git name safety

// General-purpose utilities used by callers


//# sourceMappingURL=index.js.map

/***/ }),

/***/ 87969:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  Ay: () => (/* binding */ node_modules_figures)
});

// UNUSED EXPORTS: fallbackSymbols, mainSymbols, replaceSymbols

// EXTERNAL MODULE: external "node:process"
var external_node_process_ = __webpack_require__(1708);
;// CONCATENATED MODULE: ./node_modules/.pnpm/is-unicode-supported@2.1.0/node_modules/is-unicode-supported/index.js


function isUnicodeSupported() {
	const {env} = external_node_process_;
	const {TERM, TERM_PROGRAM} = env;

	if (external_node_process_.platform !== 'win32') {
		return TERM !== 'linux'; // Linux console (kernel)
	}

	return Boolean(env.WT_SESSION) // Windows Terminal
		|| Boolean(env.TERMINUS_SUBLIME) // Terminus (<0.2.27)
		|| env.ConEmuTask === '{cmd::Cmder}' // ConEmu and cmder
		|| TERM_PROGRAM === 'Terminus-Sublime'
		|| TERM_PROGRAM === 'vscode'
		|| TERM === 'xterm-256color'
		|| TERM === 'alacritty'
		|| TERM === 'rxvt-unicode'
		|| TERM === 'rxvt-unicode-256color'
		|| env.TERMINAL_EMULATOR === 'JetBrains-JediTerm';
}

;// CONCATENATED MODULE: ./node_modules/.pnpm/figures@6.1.0/node_modules/figures/index.js


const common = {
	circleQuestionMark: '(?)',
	questionMarkPrefix: '(?)',
	square: '█',
	squareDarkShade: '▓',
	squareMediumShade: '▒',
	squareLightShade: '░',
	squareTop: '▀',
	squareBottom: '▄',
	squareLeft: '▌',
	squareRight: '▐',
	squareCenter: '■',
	bullet: '●',
	dot: '․',
	ellipsis: '…',
	pointerSmall: '›',
	triangleUp: '▲',
	triangleUpSmall: '▴',
	triangleDown: '▼',
	triangleDownSmall: '▾',
	triangleLeftSmall: '◂',
	triangleRightSmall: '▸',
	home: '⌂',
	heart: '♥',
	musicNote: '♪',
	musicNoteBeamed: '♫',
	arrowUp: '↑',
	arrowDown: '↓',
	arrowLeft: '←',
	arrowRight: '→',
	arrowLeftRight: '↔',
	arrowUpDown: '↕',
	almostEqual: '≈',
	notEqual: '≠',
	lessOrEqual: '≤',
	greaterOrEqual: '≥',
	identical: '≡',
	infinity: '∞',
	subscriptZero: '₀',
	subscriptOne: '₁',
	subscriptTwo: '₂',
	subscriptThree: '₃',
	subscriptFour: '₄',
	subscriptFive: '₅',
	subscriptSix: '₆',
	subscriptSeven: '₇',
	subscriptEight: '₈',
	subscriptNine: '₉',
	oneHalf: '½',
	oneThird: '⅓',
	oneQuarter: '¼',
	oneFifth: '⅕',
	oneSixth: '⅙',
	oneEighth: '⅛',
	twoThirds: '⅔',
	twoFifths: '⅖',
	threeQuarters: '¾',
	threeFifths: '⅗',
	threeEighths: '⅜',
	fourFifths: '⅘',
	fiveSixths: '⅚',
	fiveEighths: '⅝',
	sevenEighths: '⅞',
	line: '─',
	lineBold: '━',
	lineDouble: '═',
	lineDashed0: '┄',
	lineDashed1: '┅',
	lineDashed2: '┈',
	lineDashed3: '┉',
	lineDashed4: '╌',
	lineDashed5: '╍',
	lineDashed6: '╴',
	lineDashed7: '╶',
	lineDashed8: '╸',
	lineDashed9: '╺',
	lineDashed10: '╼',
	lineDashed11: '╾',
	lineDashed12: '−',
	lineDashed13: '–',
	lineDashed14: '‐',
	lineDashed15: '⁃',
	lineVertical: '│',
	lineVerticalBold: '┃',
	lineVerticalDouble: '║',
	lineVerticalDashed0: '┆',
	lineVerticalDashed1: '┇',
	lineVerticalDashed2: '┊',
	lineVerticalDashed3: '┋',
	lineVerticalDashed4: '╎',
	lineVerticalDashed5: '╏',
	lineVerticalDashed6: '╵',
	lineVerticalDashed7: '╷',
	lineVerticalDashed8: '╹',
	lineVerticalDashed9: '╻',
	lineVerticalDashed10: '╽',
	lineVerticalDashed11: '╿',
	lineDownLeft: '┐',
	lineDownLeftArc: '╮',
	lineDownBoldLeftBold: '┓',
	lineDownBoldLeft: '┒',
	lineDownLeftBold: '┑',
	lineDownDoubleLeftDouble: '╗',
	lineDownDoubleLeft: '╖',
	lineDownLeftDouble: '╕',
	lineDownRight: '┌',
	lineDownRightArc: '╭',
	lineDownBoldRightBold: '┏',
	lineDownBoldRight: '┎',
	lineDownRightBold: '┍',
	lineDownDoubleRightDouble: '╔',
	lineDownDoubleRight: '╓',
	lineDownRightDouble: '╒',
	lineUpLeft: '┘',
	lineUpLeftArc: '╯',
	lineUpBoldLeftBold: '┛',
	lineUpBoldLeft: '┚',
	lineUpLeftBold: '┙',
	lineUpDoubleLeftDouble: '╝',
	lineUpDoubleLeft: '╜',
	lineUpLeftDouble: '╛',
	lineUpRight: '└',
	lineUpRightArc: '╰',
	lineUpBoldRightBold: '┗',
	lineUpBoldRight: '┖',
	lineUpRightBold: '┕',
	lineUpDoubleRightDouble: '╚',
	lineUpDoubleRight: '╙',
	lineUpRightDouble: '╘',
	lineUpDownLeft: '┤',
	lineUpBoldDownBoldLeftBold: '┫',
	lineUpBoldDownBoldLeft: '┨',
	lineUpDownLeftBold: '┥',
	lineUpBoldDownLeftBold: '┩',
	lineUpDownBoldLeftBold: '┪',
	lineUpDownBoldLeft: '┧',
	lineUpBoldDownLeft: '┦',
	lineUpDoubleDownDoubleLeftDouble: '╣',
	lineUpDoubleDownDoubleLeft: '╢',
	lineUpDownLeftDouble: '╡',
	lineUpDownRight: '├',
	lineUpBoldDownBoldRightBold: '┣',
	lineUpBoldDownBoldRight: '┠',
	lineUpDownRightBold: '┝',
	lineUpBoldDownRightBold: '┡',
	lineUpDownBoldRightBold: '┢',
	lineUpDownBoldRight: '┟',
	lineUpBoldDownRight: '┞',
	lineUpDoubleDownDoubleRightDouble: '╠',
	lineUpDoubleDownDoubleRight: '╟',
	lineUpDownRightDouble: '╞',
	lineDownLeftRight: '┬',
	lineDownBoldLeftBoldRightBold: '┳',
	lineDownLeftBoldRightBold: '┯',
	lineDownBoldLeftRight: '┰',
	lineDownBoldLeftBoldRight: '┱',
	lineDownBoldLeftRightBold: '┲',
	lineDownLeftRightBold: '┮',
	lineDownLeftBoldRight: '┭',
	lineDownDoubleLeftDoubleRightDouble: '╦',
	lineDownDoubleLeftRight: '╥',
	lineDownLeftDoubleRightDouble: '╤',
	lineUpLeftRight: '┴',
	lineUpBoldLeftBoldRightBold: '┻',
	lineUpLeftBoldRightBold: '┷',
	lineUpBoldLeftRight: '┸',
	lineUpBoldLeftBoldRight: '┹',
	lineUpBoldLeftRightBold: '┺',
	lineUpLeftRightBold: '┶',
	lineUpLeftBoldRight: '┵',
	lineUpDoubleLeftDoubleRightDouble: '╩',
	lineUpDoubleLeftRight: '╨',
	lineUpLeftDoubleRightDouble: '╧',
	lineUpDownLeftRight: '┼',
	lineUpBoldDownBoldLeftBoldRightBold: '╋',
	lineUpDownBoldLeftBoldRightBold: '╈',
	lineUpBoldDownLeftBoldRightBold: '╇',
	lineUpBoldDownBoldLeftRightBold: '╊',
	lineUpBoldDownBoldLeftBoldRight: '╉',
	lineUpBoldDownLeftRight: '╀',
	lineUpDownBoldLeftRight: '╁',
	lineUpDownLeftBoldRight: '┽',
	lineUpDownLeftRightBold: '┾',
	lineUpBoldDownBoldLeftRight: '╂',
	lineUpDownLeftBoldRightBold: '┿',
	lineUpBoldDownLeftBoldRight: '╃',
	lineUpBoldDownLeftRightBold: '╄',
	lineUpDownBoldLeftBoldRight: '╅',
	lineUpDownBoldLeftRightBold: '╆',
	lineUpDoubleDownDoubleLeftDoubleRightDouble: '╬',
	lineUpDoubleDownDoubleLeftRight: '╫',
	lineUpDownLeftDoubleRightDouble: '╪',
	lineCross: '╳',
	lineBackslash: '╲',
	lineSlash: '╱',
};

const specialMainSymbols = {
	tick: '✔',
	info: 'ℹ',
	warning: '⚠',
	cross: '✘',
	squareSmall: '◻',
	squareSmallFilled: '◼',
	circle: '◯',
	circleFilled: '◉',
	circleDotted: '◌',
	circleDouble: '◎',
	circleCircle: 'ⓞ',
	circleCross: 'ⓧ',
	circlePipe: 'Ⓘ',
	radioOn: '◉',
	radioOff: '◯',
	checkboxOn: '☒',
	checkboxOff: '☐',
	checkboxCircleOn: 'ⓧ',
	checkboxCircleOff: 'Ⓘ',
	pointer: '❯',
	triangleUpOutline: '△',
	triangleLeft: '◀',
	triangleRight: '▶',
	lozenge: '◆',
	lozengeOutline: '◇',
	hamburger: '☰',
	smiley: '㋡',
	mustache: '෴',
	star: '★',
	play: '▶',
	nodejs: '⬢',
	oneSeventh: '⅐',
	oneNinth: '⅑',
	oneTenth: '⅒',
};

const specialFallbackSymbols = {
	tick: '√',
	info: 'i',
	warning: '‼',
	cross: '×',
	squareSmall: '□',
	squareSmallFilled: '■',
	circle: '( )',
	circleFilled: '(*)',
	circleDotted: '( )',
	circleDouble: '( )',
	circleCircle: '(○)',
	circleCross: '(×)',
	circlePipe: '(│)',
	radioOn: '(*)',
	radioOff: '( )',
	checkboxOn: '[×]',
	checkboxOff: '[ ]',
	checkboxCircleOn: '(×)',
	checkboxCircleOff: '( )',
	pointer: '>',
	triangleUpOutline: '∆',
	triangleLeft: '◄',
	triangleRight: '►',
	lozenge: '♦',
	lozengeOutline: '◊',
	hamburger: '≡',
	smiley: '☺',
	mustache: '┌─┐',
	star: '✶',
	play: '►',
	nodejs: '♦',
	oneSeventh: '1/7',
	oneNinth: '1/9',
	oneTenth: '1/10',
};

const mainSymbols = {...common, ...specialMainSymbols};
const fallbackSymbols = {...common, ...specialFallbackSymbols};

const shouldUseMain = isUnicodeSupported();
const figures = shouldUseMain ? mainSymbols : fallbackSymbols;
/* harmony default export */ const node_modules_figures = (figures);

const replacements = Object.entries(specialMainSymbols);

// On terminals which do not support Unicode symbols, substitute them to other symbols
const replaceSymbols = (string, {useFallback = !shouldUseMain} = {}) => {
	if (useFallback) {
		for (const [key, mainSymbol] of replacements) {
			string = string.replaceAll(mainSymbol, fallbackSymbols[key]);
		}
	}

	return string;
};


/***/ }),

/***/ 85326:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   d_: () => (/* binding */ customAlphabet)
/* harmony export */ });
/* unused harmony exports random, customRandom, nanoid */
/* harmony import */ var node_crypto__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(77598);



const POOL_SIZE_MULTIPLIER = 128
let pool, poolOffset
function fillPool(bytes) {
  if (!pool || pool.length < bytes) {
    pool = Buffer.allocUnsafe(bytes * POOL_SIZE_MULTIPLIER)
    node_crypto__WEBPACK_IMPORTED_MODULE_0__.webcrypto.getRandomValues(pool)
    poolOffset = 0
  } else if (poolOffset + bytes > pool.length) {
    node_crypto__WEBPACK_IMPORTED_MODULE_0__.webcrypto.getRandomValues(pool)
    poolOffset = 0
  }
  poolOffset += bytes
}
function random(bytes) {
  fillPool((bytes |= 0))
  return pool.subarray(poolOffset - bytes, poolOffset)
}
function customRandom(alphabet, defaultSize, getRandom) {
  let mask = (2 << (31 - Math.clz32((alphabet.length - 1) | 1))) - 1
  let step = Math.ceil((1.6 * mask * defaultSize) / alphabet.length)
  return (size = defaultSize) => {
    if (!size) return ''
    let id = ''
    while (true) {
      let bytes = getRandom(step)
      let i = step
      while (i--) {
        id += alphabet[bytes[i] & mask] || ''
        if (id.length >= size) return id
      }
    }
  }
}
function customAlphabet(alphabet, size = 21) {
  return customRandom(alphabet, size, random)
}
function nanoid(size = 21) {
  fillPool((size |= 0))
  let id = ''
  for (let i = poolOffset - size; i < poolOffset; i++) {
    id += scopedUrlAlphabet[pool[i] & 63]
  }
  return id
}


/***/ }),

/***/ 52923:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  qg: () => (/* reexport */ parse)
});

// UNUSED EXPORTS: TomlDate, TomlError, default, stringify

;// CONCATENATED MODULE: ./node_modules/.pnpm/smol-toml@1.6.0/node_modules/smol-toml/dist/error.js
/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
function getLineColFromPtr(string, ptr) {
    let lines = string.slice(0, ptr).split(/\r\n|\n|\r/g);
    return [lines.length, lines.pop().length + 1];
}
function makeCodeBlock(string, line, column) {
    let lines = string.split(/\r\n|\n|\r/g);
    let codeblock = '';
    let numberLen = (Math.log10(line + 1) | 0) + 1;
    for (let i = line - 1; i <= line + 1; i++) {
        let l = lines[i - 1];
        if (!l)
            continue;
        codeblock += i.toString().padEnd(numberLen, ' ');
        codeblock += ':  ';
        codeblock += l;
        codeblock += '\n';
        if (i === line) {
            codeblock += ' '.repeat(numberLen + column + 2);
            codeblock += '^\n';
        }
    }
    return codeblock;
}
class TomlError extends Error {
    line;
    column;
    codeblock;
    constructor(message, options) {
        const [line, column] = getLineColFromPtr(options.toml, options.ptr);
        const codeblock = makeCodeBlock(options.toml, line, column);
        super(`Invalid TOML document: ${message}\n\n${codeblock}`, options);
        this.line = line;
        this.column = column;
        this.codeblock = codeblock;
    }
}

;// CONCATENATED MODULE: ./node_modules/.pnpm/smol-toml@1.6.0/node_modules/smol-toml/dist/util.js
/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

function isEscaped(str, ptr) {
    let i = 0;
    while (str[ptr - ++i] === '\\')
        ;
    return --i && (i % 2);
}
function indexOfNewline(str, start = 0, end = str.length) {
    let idx = str.indexOf('\n', start);
    if (str[idx - 1] === '\r')
        idx--;
    return idx <= end ? idx : -1;
}
function skipComment(str, ptr) {
    for (let i = ptr; i < str.length; i++) {
        let c = str[i];
        if (c === '\n')
            return i;
        if (c === '\r' && str[i + 1] === '\n')
            return i + 1;
        if ((c < '\x20' && c !== '\t') || c === '\x7f') {
            throw new TomlError('control characters are not allowed in comments', {
                toml: str,
                ptr: ptr,
            });
        }
    }
    return str.length;
}
function skipVoid(str, ptr, banNewLines, banComments) {
    let c;
    while ((c = str[ptr]) === ' ' || c === '\t' || (!banNewLines && (c === '\n' || c === '\r' && str[ptr + 1] === '\n')))
        ptr++;
    return banComments || c !== '#'
        ? ptr
        : skipVoid(str, skipComment(str, ptr), banNewLines);
}
function skipUntil(str, ptr, sep, end, banNewLines = false) {
    if (!end) {
        ptr = indexOfNewline(str, ptr);
        return ptr < 0 ? str.length : ptr;
    }
    for (let i = ptr; i < str.length; i++) {
        let c = str[i];
        if (c === '#') {
            i = indexOfNewline(str, i);
        }
        else if (c === sep) {
            return i + 1;
        }
        else if (c === end || (banNewLines && (c === '\n' || (c === '\r' && str[i + 1] === '\n')))) {
            return i;
        }
    }
    throw new TomlError('cannot find end of structure', {
        toml: str,
        ptr: ptr
    });
}
function getStringEnd(str, seek) {
    let first = str[seek];
    let target = first === str[seek + 1] && str[seek + 1] === str[seek + 2]
        ? str.slice(seek, seek + 3)
        : first;
    seek += target.length - 1;
    do
        seek = str.indexOf(target, ++seek);
    while (seek > -1 && first !== "'" && isEscaped(str, seek));
    if (seek > -1) {
        seek += target.length;
        if (target.length > 1) {
            if (str[seek] === first)
                seek++;
            if (str[seek] === first)
                seek++;
        }
    }
    return seek;
}

;// CONCATENATED MODULE: ./node_modules/.pnpm/smol-toml@1.6.0/node_modules/smol-toml/dist/date.js
/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
let DATE_TIME_RE = /^(\d{4}-\d{2}-\d{2})?[T ]?(?:(\d{2}):\d{2}(?::\d{2}(?:\.\d+)?)?)?(Z|[-+]\d{2}:\d{2})?$/i;
class TomlDate extends Date {
    #hasDate = false;
    #hasTime = false;
    #offset = null;
    constructor(date) {
        let hasDate = true;
        let hasTime = true;
        let offset = 'Z';
        if (typeof date === 'string') {
            let match = date.match(DATE_TIME_RE);
            if (match) {
                if (!match[1]) {
                    hasDate = false;
                    date = `0000-01-01T${date}`;
                }
                hasTime = !!match[2];
                // Make sure to use T instead of a space. Breaks in case of extreme values otherwise.
                hasTime && date[10] === ' ' && (date = date.replace(' ', 'T'));
                // Do not allow rollover hours.
                if (match[2] && +match[2] > 23) {
                    date = '';
                }
                else {
                    offset = match[3] || null;
                    date = date.toUpperCase();
                    if (!offset && hasTime)
                        date += 'Z';
                }
            }
            else {
                date = '';
            }
        }
        super(date);
        if (!isNaN(this.getTime())) {
            this.#hasDate = hasDate;
            this.#hasTime = hasTime;
            this.#offset = offset;
        }
    }
    isDateTime() {
        return this.#hasDate && this.#hasTime;
    }
    isLocal() {
        return !this.#hasDate || !this.#hasTime || !this.#offset;
    }
    isDate() {
        return this.#hasDate && !this.#hasTime;
    }
    isTime() {
        return this.#hasTime && !this.#hasDate;
    }
    isValid() {
        return this.#hasDate || this.#hasTime;
    }
    toISOString() {
        let iso = super.toISOString();
        // Local Date
        if (this.isDate())
            return iso.slice(0, 10);
        // Local Time
        if (this.isTime())
            return iso.slice(11, 23);
        // Local DateTime
        if (this.#offset === null)
            return iso.slice(0, -1);
        // Offset DateTime
        if (this.#offset === 'Z')
            return iso;
        // This part is quite annoying: JS strips the original timezone from the ISO string representation
        // Instead of using a "modified" date and "Z", we restore the representation "as authored"
        let offset = (+(this.#offset.slice(1, 3)) * 60) + +(this.#offset.slice(4, 6));
        offset = this.#offset[0] === '-' ? offset : -offset;
        let offsetDate = new Date(this.getTime() - (offset * 60e3));
        return offsetDate.toISOString().slice(0, -1) + this.#offset;
    }
    static wrapAsOffsetDateTime(jsDate, offset = 'Z') {
        let date = new TomlDate(jsDate);
        date.#offset = offset;
        return date;
    }
    static wrapAsLocalDateTime(jsDate) {
        let date = new TomlDate(jsDate);
        date.#offset = null;
        return date;
    }
    static wrapAsLocalDate(jsDate) {
        let date = new TomlDate(jsDate);
        date.#hasTime = false;
        date.#offset = null;
        return date;
    }
    static wrapAsLocalTime(jsDate) {
        let date = new TomlDate(jsDate);
        date.#hasDate = false;
        date.#offset = null;
        return date;
    }
}

;// CONCATENATED MODULE: ./node_modules/.pnpm/smol-toml@1.6.0/node_modules/smol-toml/dist/primitive.js
/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */



let INT_REGEX = /^((0x[0-9a-fA-F](_?[0-9a-fA-F])*)|(([+-]|0[ob])?\d(_?\d)*))$/;
let FLOAT_REGEX = /^[+-]?\d(_?\d)*(\.\d(_?\d)*)?([eE][+-]?\d(_?\d)*)?$/;
let LEADING_ZERO = /^[+-]?0[0-9_]/;
let ESCAPE_REGEX = /^[0-9a-f]{2,8}$/i;
let ESC_MAP = {
    b: '\b',
    t: '\t',
    n: '\n',
    f: '\f',
    r: '\r',
    e: '\x1b',
    '"': '"',
    '\\': '\\',
};
function parseString(str, ptr = 0, endPtr = str.length) {
    let isLiteral = str[ptr] === '\'';
    let isMultiline = str[ptr++] === str[ptr] && str[ptr] === str[ptr + 1];
    if (isMultiline) {
        endPtr -= 2;
        if (str[ptr += 2] === '\r')
            ptr++;
        if (str[ptr] === '\n')
            ptr++;
    }
    let tmp = 0;
    let isEscape;
    let parsed = '';
    let sliceStart = ptr;
    while (ptr < endPtr - 1) {
        let c = str[ptr++];
        if (c === '\n' || (c === '\r' && str[ptr] === '\n')) {
            if (!isMultiline) {
                throw new TomlError('newlines are not allowed in strings', {
                    toml: str,
                    ptr: ptr - 1,
                });
            }
        }
        else if ((c < '\x20' && c !== '\t') || c === '\x7f') {
            throw new TomlError('control characters are not allowed in strings', {
                toml: str,
                ptr: ptr - 1,
            });
        }
        if (isEscape) {
            isEscape = false;
            if (c === 'x' || c === 'u' || c === 'U') {
                // Unicode escape
                let code = str.slice(ptr, (ptr += (c === 'x' ? 2 : c === 'u' ? 4 : 8)));
                if (!ESCAPE_REGEX.test(code)) {
                    throw new TomlError('invalid unicode escape', {
                        toml: str,
                        ptr: tmp,
                    });
                }
                try {
                    parsed += String.fromCodePoint(parseInt(code, 16));
                }
                catch {
                    throw new TomlError('invalid unicode escape', {
                        toml: str,
                        ptr: tmp,
                    });
                }
            }
            else if (isMultiline && (c === '\n' || c === ' ' || c === '\t' || c === '\r')) {
                // Multiline escape
                ptr = skipVoid(str, ptr - 1, true);
                if (str[ptr] !== '\n' && str[ptr] !== '\r') {
                    throw new TomlError('invalid escape: only line-ending whitespace may be escaped', {
                        toml: str,
                        ptr: tmp,
                    });
                }
                ptr = skipVoid(str, ptr);
            }
            else if (c in ESC_MAP) {
                // Classic escape
                parsed += ESC_MAP[c];
            }
            else {
                throw new TomlError('unrecognized escape sequence', {
                    toml: str,
                    ptr: tmp,
                });
            }
            sliceStart = ptr;
        }
        else if (!isLiteral && c === '\\') {
            tmp = ptr - 1;
            isEscape = true;
            parsed += str.slice(sliceStart, tmp);
        }
    }
    return parsed + str.slice(sliceStart, endPtr - 1);
}
function parseValue(value, toml, ptr, integersAsBigInt) {
    // Constant values
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    if (value === '-inf')
        return -Infinity;
    if (value === 'inf' || value === '+inf')
        return Infinity;
    if (value === 'nan' || value === '+nan' || value === '-nan')
        return NaN;
    // Avoid FP representation of -0
    if (value === '-0')
        return integersAsBigInt ? 0n : 0;
    // Numbers
    let isInt = INT_REGEX.test(value);
    if (isInt || FLOAT_REGEX.test(value)) {
        if (LEADING_ZERO.test(value)) {
            throw new TomlError('leading zeroes are not allowed', {
                toml: toml,
                ptr: ptr,
            });
        }
        value = value.replace(/_/g, '');
        let numeric = +value;
        if (isNaN(numeric)) {
            throw new TomlError('invalid number', {
                toml: toml,
                ptr: ptr,
            });
        }
        if (isInt) {
            if ((isInt = !Number.isSafeInteger(numeric)) && !integersAsBigInt) {
                throw new TomlError('integer value cannot be represented losslessly', {
                    toml: toml,
                    ptr: ptr,
                });
            }
            if (isInt || integersAsBigInt === true)
                numeric = BigInt(value);
        }
        return numeric;
    }
    const date = new TomlDate(value);
    if (!date.isValid()) {
        throw new TomlError('invalid value', {
            toml: toml,
            ptr: ptr,
        });
    }
    return date;
}

;// CONCATENATED MODULE: ./node_modules/.pnpm/smol-toml@1.6.0/node_modules/smol-toml/dist/extract.js
/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */




function sliceAndTrimEndOf(str, startPtr, endPtr) {
    let value = str.slice(startPtr, endPtr);
    let commentIdx = value.indexOf('#');
    if (commentIdx > -1) {
        // The call to skipComment allows to "validate" the comment
        // (absence of control characters)
        skipComment(str, commentIdx);
        value = value.slice(0, commentIdx);
    }
    return [value.trimEnd(), commentIdx];
}
function extractValue(str, ptr, end, depth, integersAsBigInt) {
    if (depth === 0) {
        throw new TomlError('document contains excessively nested structures. aborting.', {
            toml: str,
            ptr: ptr
        });
    }
    let c = str[ptr];
    if (c === '[' || c === '{') {
        let [value, endPtr] = c === '['
            ? parseArray(str, ptr, depth, integersAsBigInt)
            : parseInlineTable(str, ptr, depth, integersAsBigInt);
        if (end) {
            endPtr = skipVoid(str, endPtr);
            if (str[endPtr] === ',')
                endPtr++;
            else if (str[endPtr] !== end) {
                throw new TomlError('expected comma or end of structure', {
                    toml: str,
                    ptr: endPtr,
                });
            }
        }
        return [value, endPtr];
    }
    let endPtr;
    if (c === '"' || c === "'") {
        endPtr = getStringEnd(str, ptr);
        let parsed = parseString(str, ptr, endPtr);
        if (end) {
            endPtr = skipVoid(str, endPtr);
            if (str[endPtr] && str[endPtr] !== ',' && str[endPtr] !== end && str[endPtr] !== '\n' && str[endPtr] !== '\r') {
                throw new TomlError('unexpected character encountered', {
                    toml: str,
                    ptr: endPtr,
                });
            }
            endPtr += (+(str[endPtr] === ','));
        }
        return [parsed, endPtr];
    }
    endPtr = skipUntil(str, ptr, ',', end);
    let slice = sliceAndTrimEndOf(str, ptr, endPtr - (+(str[endPtr - 1] === ',')));
    if (!slice[0]) {
        throw new TomlError('incomplete key-value declaration: no value specified', {
            toml: str,
            ptr: ptr
        });
    }
    if (end && slice[1] > -1) {
        endPtr = skipVoid(str, ptr + slice[1]);
        endPtr += +(str[endPtr] === ',');
    }
    return [
        parseValue(slice[0], str, ptr, integersAsBigInt),
        endPtr,
    ];
}

;// CONCATENATED MODULE: ./node_modules/.pnpm/smol-toml@1.6.0/node_modules/smol-toml/dist/struct.js
/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */




let KEY_PART_RE = /^[a-zA-Z0-9-_]+[ \t]*$/;
function parseKey(str, ptr, end = '=') {
    let dot = ptr - 1;
    let parsed = [];
    let endPtr = str.indexOf(end, ptr);
    if (endPtr < 0) {
        throw new TomlError('incomplete key-value: cannot find end of key', {
            toml: str,
            ptr: ptr,
        });
    }
    do {
        let c = str[ptr = ++dot];
        // If it's whitespace, ignore
        if (c !== ' ' && c !== '\t') {
            // If it's a string
            if (c === '"' || c === '\'') {
                if (c === str[ptr + 1] && c === str[ptr + 2]) {
                    throw new TomlError('multiline strings are not allowed in keys', {
                        toml: str,
                        ptr: ptr,
                    });
                }
                let eos = getStringEnd(str, ptr);
                if (eos < 0) {
                    throw new TomlError('unfinished string encountered', {
                        toml: str,
                        ptr: ptr,
                    });
                }
                dot = str.indexOf('.', eos);
                let strEnd = str.slice(eos, dot < 0 || dot > endPtr ? endPtr : dot);
                let newLine = indexOfNewline(strEnd);
                if (newLine > -1) {
                    throw new TomlError('newlines are not allowed in keys', {
                        toml: str,
                        ptr: ptr + dot + newLine,
                    });
                }
                if (strEnd.trimStart()) {
                    throw new TomlError('found extra tokens after the string part', {
                        toml: str,
                        ptr: eos,
                    });
                }
                if (endPtr < eos) {
                    endPtr = str.indexOf(end, eos);
                    if (endPtr < 0) {
                        throw new TomlError('incomplete key-value: cannot find end of key', {
                            toml: str,
                            ptr: ptr,
                        });
                    }
                }
                parsed.push(parseString(str, ptr, eos));
            }
            else {
                // Normal raw key part consumption and validation
                dot = str.indexOf('.', ptr);
                let part = str.slice(ptr, dot < 0 || dot > endPtr ? endPtr : dot);
                if (!KEY_PART_RE.test(part)) {
                    throw new TomlError('only letter, numbers, dashes and underscores are allowed in keys', {
                        toml: str,
                        ptr: ptr,
                    });
                }
                parsed.push(part.trimEnd());
            }
        }
        // Until there's no more dot
    } while (dot + 1 && dot < endPtr);
    return [parsed, skipVoid(str, endPtr + 1, true, true)];
}
function parseInlineTable(str, ptr, depth, integersAsBigInt) {
    let res = {};
    let seen = new Set();
    let c;
    ptr++;
    while ((c = str[ptr++]) !== '}' && c) {
        if (c === ',') {
            throw new TomlError('expected value, found comma', {
                toml: str,
                ptr: ptr - 1,
            });
        }
        else if (c === '#')
            ptr = skipComment(str, ptr);
        else if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') {
            let k;
            let t = res;
            let hasOwn = false;
            let [key, keyEndPtr] = parseKey(str, ptr - 1);
            for (let i = 0; i < key.length; i++) {
                if (i)
                    t = hasOwn ? t[k] : (t[k] = {});
                k = key[i];
                if ((hasOwn = Object.hasOwn(t, k)) && (typeof t[k] !== 'object' || seen.has(t[k]))) {
                    throw new TomlError('trying to redefine an already defined value', {
                        toml: str,
                        ptr: ptr,
                    });
                }
                if (!hasOwn && k === '__proto__') {
                    Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
                }
            }
            if (hasOwn) {
                throw new TomlError('trying to redefine an already defined value', {
                    toml: str,
                    ptr: ptr,
                });
            }
            let [value, valueEndPtr] = extractValue(str, keyEndPtr, '}', depth - 1, integersAsBigInt);
            seen.add(value);
            t[k] = value;
            ptr = valueEndPtr;
        }
    }
    if (!c) {
        throw new TomlError('unfinished table encountered', {
            toml: str,
            ptr: ptr,
        });
    }
    return [res, ptr];
}
function parseArray(str, ptr, depth, integersAsBigInt) {
    let res = [];
    let c;
    ptr++;
    while ((c = str[ptr++]) !== ']' && c) {
        if (c === ',') {
            throw new TomlError('expected value, found comma', {
                toml: str,
                ptr: ptr - 1,
            });
        }
        else if (c === '#')
            ptr = skipComment(str, ptr);
        else if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') {
            let e = extractValue(str, ptr - 1, ']', depth - 1, integersAsBigInt);
            res.push(e[0]);
            ptr = e[1];
        }
    }
    if (!c) {
        throw new TomlError('unfinished array encountered', {
            toml: str,
            ptr: ptr,
        });
    }
    return [res, ptr];
}

;// CONCATENATED MODULE: ./node_modules/.pnpm/smol-toml@1.6.0/node_modules/smol-toml/dist/parse.js
/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */




function peekTable(key, table, meta, type) {
    let t = table;
    let m = meta;
    let k;
    let hasOwn = false;
    let state;
    for (let i = 0; i < key.length; i++) {
        if (i) {
            t = hasOwn ? t[k] : (t[k] = {});
            m = (state = m[k]).c;
            if (type === 0 /* Type.DOTTED */ && (state.t === 1 /* Type.EXPLICIT */ || state.t === 2 /* Type.ARRAY */)) {
                return null;
            }
            if (state.t === 2 /* Type.ARRAY */) {
                let l = t.length - 1;
                t = t[l];
                m = m[l].c;
            }
        }
        k = key[i];
        if ((hasOwn = Object.hasOwn(t, k)) && m[k]?.t === 0 /* Type.DOTTED */ && m[k]?.d) {
            return null;
        }
        if (!hasOwn) {
            if (k === '__proto__') {
                Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
                Object.defineProperty(m, k, { enumerable: true, configurable: true, writable: true });
            }
            m[k] = {
                t: i < key.length - 1 && type === 2 /* Type.ARRAY */
                    ? 3 /* Type.ARRAY_DOTTED */
                    : type,
                d: false,
                i: 0,
                c: {},
            };
        }
    }
    state = m[k];
    if (state.t !== type && !(type === 1 /* Type.EXPLICIT */ && state.t === 3 /* Type.ARRAY_DOTTED */)) {
        // Bad key type!
        return null;
    }
    if (type === 2 /* Type.ARRAY */) {
        if (!state.d) {
            state.d = true;
            t[k] = [];
        }
        t[k].push(t = {});
        state.c[state.i++] = (state = { t: 1 /* Type.EXPLICIT */, d: false, i: 0, c: {} });
    }
    if (state.d) {
        // Redefining a table!
        return null;
    }
    state.d = true;
    if (type === 1 /* Type.EXPLICIT */) {
        t = hasOwn ? t[k] : (t[k] = {});
    }
    else if (type === 0 /* Type.DOTTED */ && hasOwn) {
        return null;
    }
    return [k, t, state.c];
}
function parse(toml, { maxDepth = 1000, integersAsBigInt } = {}) {
    let res = {};
    let meta = {};
    let tbl = res;
    let m = meta;
    for (let ptr = skipVoid(toml, 0); ptr < toml.length;) {
        if (toml[ptr] === '[') {
            let isTableArray = toml[++ptr] === '[';
            let k = parseKey(toml, ptr += +isTableArray, ']');
            if (isTableArray) {
                if (toml[k[1] - 1] !== ']') {
                    throw new TomlError('expected end of table declaration', {
                        toml: toml,
                        ptr: k[1] - 1,
                    });
                }
                k[1]++;
            }
            let p = peekTable(k[0], res, meta, isTableArray ? 2 /* Type.ARRAY */ : 1 /* Type.EXPLICIT */);
            if (!p) {
                throw new TomlError('trying to redefine an already defined table or value', {
                    toml: toml,
                    ptr: ptr,
                });
            }
            m = p[2];
            tbl = p[1];
            ptr = k[1];
        }
        else {
            let k = parseKey(toml, ptr);
            let p = peekTable(k[0], tbl, m, 0 /* Type.DOTTED */);
            if (!p) {
                throw new TomlError('trying to redefine an already defined table or value', {
                    toml: toml,
                    ptr: ptr,
                });
            }
            let v = extractValue(toml, k[1], void 0, maxDepth, integersAsBigInt);
            p[1][p[0]] = v[0];
            ptr = v[1];
        }
        ptr = skipVoid(toml, ptr, true);
        if (toml[ptr] && toml[ptr] !== '\n' && toml[ptr] !== '\r') {
            throw new TomlError('each key-value declaration must be followed by an end-of-line', {
                toml: toml,
                ptr: ptr
            });
        }
        ptr = skipVoid(toml, ptr);
    }
    return res;
}

;// CONCATENATED MODULE: ./node_modules/.pnpm/smol-toml@1.6.0/node_modules/smol-toml/dist/stringify.js
/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
let BARE_KEY = /^[a-z0-9-_]+$/i;
function extendedTypeOf(obj) {
    let type = typeof obj;
    if (type === 'object') {
        if (Array.isArray(obj))
            return 'array';
        if (obj instanceof Date)
            return 'date';
    }
    return type;
}
function isArrayOfTables(obj) {
    for (let i = 0; i < obj.length; i++) {
        if (extendedTypeOf(obj[i]) !== 'object')
            return false;
    }
    return obj.length != 0;
}
function formatString(s) {
    return JSON.stringify(s).replace(/\x7f/g, '\\u007f');
}
function stringifyValue(val, type, depth, numberAsFloat) {
    if (depth === 0) {
        throw new Error('Could not stringify the object: maximum object depth exceeded');
    }
    if (type === 'number') {
        if (isNaN(val))
            return 'nan';
        if (val === Infinity)
            return 'inf';
        if (val === -Infinity)
            return '-inf';
        if (numberAsFloat && Number.isInteger(val))
            return val.toFixed(1);
        return val.toString();
    }
    if (type === 'bigint' || type === 'boolean') {
        return val.toString();
    }
    if (type === 'string') {
        return formatString(val);
    }
    if (type === 'date') {
        if (isNaN(val.getTime())) {
            throw new TypeError('cannot serialize invalid date');
        }
        return val.toISOString();
    }
    if (type === 'object') {
        return stringifyInlineTable(val, depth, numberAsFloat);
    }
    if (type === 'array') {
        return stringifyArray(val, depth, numberAsFloat);
    }
}
function stringifyInlineTable(obj, depth, numberAsFloat) {
    let keys = Object.keys(obj);
    if (keys.length === 0)
        return '{}';
    let res = '{ ';
    for (let i = 0; i < keys.length; i++) {
        let k = keys[i];
        if (i)
            res += ', ';
        res += BARE_KEY.test(k) ? k : formatString(k);
        res += ' = ';
        res += stringifyValue(obj[k], extendedTypeOf(obj[k]), depth - 1, numberAsFloat);
    }
    return res + ' }';
}
function stringifyArray(array, depth, numberAsFloat) {
    if (array.length === 0)
        return '[]';
    let res = '[ ';
    for (let i = 0; i < array.length; i++) {
        if (i)
            res += ', ';
        if (array[i] === null || array[i] === void 0) {
            throw new TypeError('arrays cannot contain null or undefined values');
        }
        res += stringifyValue(array[i], extendedTypeOf(array[i]), depth - 1, numberAsFloat);
    }
    return res + ' ]';
}
function stringifyArrayTable(array, key, depth, numberAsFloat) {
    if (depth === 0) {
        throw new Error('Could not stringify the object: maximum object depth exceeded');
    }
    let res = '';
    for (let i = 0; i < array.length; i++) {
        res += `${res && '\n'}[[${key}]]\n`;
        res += stringifyTable(0, array[i], key, depth, numberAsFloat);
    }
    return res;
}
function stringifyTable(tableKey, obj, prefix, depth, numberAsFloat) {
    if (depth === 0) {
        throw new Error('Could not stringify the object: maximum object depth exceeded');
    }
    let preamble = '';
    let tables = '';
    let keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
        let k = keys[i];
        if (obj[k] !== null && obj[k] !== void 0) {
            let type = extendedTypeOf(obj[k]);
            if (type === 'symbol' || type === 'function') {
                throw new TypeError(`cannot serialize values of type '${type}'`);
            }
            let key = BARE_KEY.test(k) ? k : formatString(k);
            if (type === 'array' && isArrayOfTables(obj[k])) {
                tables += (tables && '\n') + stringifyArrayTable(obj[k], prefix ? `${prefix}.${key}` : key, depth - 1, numberAsFloat);
            }
            else if (type === 'object') {
                let tblKey = prefix ? `${prefix}.${key}` : key;
                tables += (tables && '\n') + stringifyTable(tblKey, obj[k], tblKey, depth - 1, numberAsFloat);
            }
            else {
                preamble += key;
                preamble += ' = ';
                preamble += stringifyValue(obj[k], type, depth, numberAsFloat);
                preamble += '\n';
            }
        }
    }
    if (tableKey && (preamble || !tables)) // Create table only if necessary
        preamble = preamble ? `[${tableKey}]\n${preamble}` : `[${tableKey}]`;
    return preamble && tables
        ? `${preamble}\n${tables}`
        : preamble || tables;
}
function stringify(obj, { maxDepth = 1000, numbersAsFloat = false } = {}) {
    if (extendedTypeOf(obj) !== 'object') {
        throw new TypeError('stringify can only be called with an object');
    }
    let str = stringifyTable(0, obj, '', maxDepth, numbersAsFloat);
    if (str[str.length - 1] !== '\n')
        return str + '\n';
    return str;
}

;// CONCATENATED MODULE: ./node_modules/.pnpm/smol-toml@1.6.0/node_modules/smol-toml/dist/index.js
/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */




/* harmony default export */ const dist = ({ parse: parse, stringify: stringify, TomlDate: TomlDate, TomlError: TomlError });



/***/ })

};
