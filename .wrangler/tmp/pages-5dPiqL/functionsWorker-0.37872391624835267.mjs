var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../node_modules/.pnpm/@cloudflare+unenv-preset@2._7eea137df83a043b16f60ffcacd6258b/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../node_modules/.pnpm/@cloudflare+unenv-preset@2._7eea137df83a043b16f60ffcacd6258b/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../node_modules/.pnpm/wrangler@4.122.0/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl3) {
    super();
    this.env = impl3.env;
    this.hrtime = impl3.hrtime;
    this.nextTick = impl3.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../node_modules/.pnpm/@cloudflare+unenv-preset@2._7eea137df83a043b16f60ffcacd6258b/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../node_modules/.pnpm/wrangler@4.122.0/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// ../backend/src/platform.mjs
var webcrypto = globalThis.crypto;
var subtle = webcrypto.subtle;
var enc = new TextEncoder();
var dec = new TextDecoder();
function randomUUID() {
  return webcrypto.randomUUID();
}
__name(randomUUID, "randomUUID");
function randomBytes(n) {
  const b = new Uint8Array(n);
  webcrypto.getRandomValues(b);
  return b;
}
__name(randomBytes, "randomBytes");
function toHex(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = "";
  for (const x of b) out += x.toString(16).padStart(2, "0");
  return out;
}
__name(toHex, "toHex");
function toBase64Url(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const x of b) bin += String.fromCharCode(x);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(toBase64Url, "toBase64Url");
function fromBase64Url(str) {
  const s = String(str).replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - s.length % 4) : "";
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
__name(fromBase64Url, "fromBase64Url");
function utf8(str) {
  return enc.encode(String(str));
}
__name(utf8, "utf8");
function fromUtf8(bytes) {
  return dec.decode(bytes);
}
__name(fromUtf8, "fromUtf8");
async function sha256Hex(input) {
  const data = typeof input === "string" ? utf8(input) : input;
  return toHex(await subtle.digest("SHA-256", data));
}
__name(sha256Hex, "sha256Hex");
async function hmacSha256Base64Url(secret, message) {
  const key = await subtle.importKey("raw", utf8(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await subtle.sign("HMAC", key, utf8(message));
  return toBase64Url(sig);
}
__name(hmacSha256Base64Url, "hmacSha256Base64Url");
function timingSafeEqualStr(a, b) {
  const x = String(a || ""), y = String(b || "");
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
__name(timingSafeEqualStr, "timingSafeEqualStr");
async function pbkdf2Hex(password, saltHex, iterations, lengthBytes = 32) {
  const key = await subtle.importKey("raw", utf8(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: utf8(saltHex), iterations },
    key,
    lengthBytes * 8
  );
  return toHex(bits);
}
__name(pbkdf2Hex, "pbkdf2Hex");
function base64ToBytes(b64) {
  const bin = atob(String(b64));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
__name(base64ToBytes, "base64ToBytes");

// ../backend/src/store.mjs
var impl = null;
function setStore(custom) {
  impl = custom;
}
__name(setStore, "setStore");
function current() {
  if (!impl) throw new Error("\u6570\u636E\u5C42\u672A\u521D\u59CB\u5316\uFF1A\u8BF7\u5148\u8C03\u7528 setStore()");
  return impl;
}
__name(current, "current");
async function get(sql, ...params) {
  return current().get(sql, ...params);
}
__name(get, "get");
async function run(sql, ...params) {
  return current().run(sql, ...params);
}
__name(run, "run");
async function all(sql, ...params) {
  return current().all(sql, ...params);
}
__name(all, "all");

// ../backend/src/auth.mjs
var DEFAULT_ITERATIONS = 1e5;
var ITERATIONS = DEFAULT_ITERATIONS;
var SECRET = "";
function configureAuth({ secret, iterations } = {}) {
  if (secret) SECRET = String(secret);
  if (!SECRET) {
    SECRET = toHex(randomBytes(32));
    console.warn("[security] \u672A\u8BBE\u7F6E JWT_SECRET\uFF0C\u672C\u6B21\u8FD0\u884C\u4F7F\u7528\u968F\u673A\u5BC6\u94A5\uFF08\u91CD\u542F\u540E\u767B\u5F55\u6001\u5931\u6548\uFF09");
  }
  const n = Number(iterations);
  if (Number.isFinite(n) && n >= 1e4) ITERATIONS = Math.floor(n);
}
__name(configureAuth, "configureAuth");
async function hashPassword(pw) {
  const salt = toHex(randomBytes(16));
  const hash = await pbkdf2Hex(String(pw), salt, ITERATIONS, 32);
  return "pbkdf2$" + ITERATIONS + "$" + salt + "$" + hash;
}
__name(hashPassword, "hashPassword");
async function verifyPassword(pw, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expect = parts[3];
  if (!iterations || !salt || !expect) return false;
  const calc = await pbkdf2Hex(String(pw), salt, iterations, 32);
  return timingSafeEqualStr(calc, expect);
}
__name(verifyPassword, "verifyPassword");
async function signToken(payload, expiresSec = 3600) {
  const header = toBase64Url(utf8(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = toBase64Url(utf8(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1e3) + expiresSec })));
  const sig = await hmacSha256Base64Url(SECRET, header + "." + body);
  return header + "." + body + "." + sig;
}
__name(signToken, "signToken");
async function verifyToken(token) {
  try {
    const [h, b, s] = String(token || "").split(".");
    if (!h || !b || !s) return null;
    const expect = await hmacSha256Base64Url(SECRET, h + "." + b);
    if (!timingSafeEqualStr(s, expect)) return null;
    const payload = JSON.parse(fromUtf8(fromBase64Url(b)));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1e3)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}
__name(verifyToken, "verifyToken");

// ../backend/src/seed.mjs
function antiFakeCode(id, sellerId, enTitle) {
  let s = 0;
  const seed = id + ":" + sellerId + ":" + (enTitle || "");
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) % 97;
  return "TB-" + String(id).toUpperCase().replace(/[^A-Z0-9]/g, "") + "-" + String(s).padStart(2, "0");
}
__name(antiFakeCode, "antiFakeCode");
async function seedIfEmpty() {
  const row = (await all("SELECT COUNT(*) AS c FROM users"))[0];
  if (row && row.c > 0) return false;
  const now = Date.now();
  const adminId = "u-admin", sellerId = "u-seller", buyerId = "u-buyer", frozenId = "u-frozen";
  await run(
    "INSERT INTO users (id, email, password_hash, role, name, status, email_verified, created_at) VALUES (?,?,?,?,?,?,?,?)",
    adminId,
    "admin@demo.com",
    await hashPassword("admin123"),
    "admin",
    "\u5E73\u53F0\u7BA1\u7406\u5458",
    "active",
    1,
    now
  );
  await run(
    "INSERT INTO users (id, email, password_hash, role, name, status, email_verified, created_at) VALUES (?,?,?,?,?,?,?,?)",
    sellerId,
    "seller@demo.com",
    await hashPassword("seller123"),
    "seller",
    "\u738B\u7ECF\u7406",
    "active",
    1,
    now
  );
  await run(
    "INSERT INTO users (id, email, password_hash, role, name, status, email_verified, created_at) VALUES (?,?,?,?,?,?,?,?)",
    buyerId,
    "buyer@demo.com",
    await hashPassword("buyer123"),
    "buyer",
    "Thomas M\xFCller",
    "active",
    1,
    now
  );
  await run(
    "INSERT INTO users (id, email, password_hash, role, name, status, email_verified, created_at) VALUES (?,?,?,?,?,?,?,?)",
    frozenId,
    "tanaka@tokyo-trading.jp",
    await hashPassword("frozen123"),
    "buyer",
    "\u7530\u4E2D\u4E00\u90CE",
    "frozen",
    1,
    now
  );
  const c1 = randomUUID();
  await run(
    "INSERT INTO companies (id, user_id, name, country, city, license_no, status, created_at) VALUES (?,?,?,?,?,?,?,?)",
    c1,
    sellerId,
    "\u676D\u5DDE\u4E91\u5E06\u673A\u68B0\u6709\u9650\u516C\u53F8",
    "CN",
    "\u676D\u5DDE",
    "LIC-2026-001",
    "approved",
    now
  );
  const products = [
    {
      id: "p1",
      sellerId,
      companyId: c1,
      category: "machinery",
      sub: "laser",
      hsCode: "8456.11",
      country: "CN",
      priceMin: 12800,
      priceMax: 16800,
      moq: 1,
      unit: "set",
      leadTime: 30,
      terms: ["FOB", "CIF"],
      certs: ["CE"],
      srcLang: "zh",
      status: "on",
      en: { title: "3000W Fiber Laser Cutting Machine", description: "CNC fiber laser cutter with exchange table, 3kW, suitable for sheet metal cutting.", features: ["3kW fiber laser", "Exchange table", "CE certified"] },
      zh: { title: "3000W \u5149\u7EA4\u6FC0\u5149\u5207\u5272\u673A", description: "\u6570\u63A7\u5149\u7EA4\u6FC0\u5149\u5207\u5272\u673A\uFF0C\u542B\u4EA4\u6362\u5DE5\u4F5C\u53F0\uFF0C3kW\uFF0C\u9002\u7528\u4E8E\u94A3\u91D1\u5207\u5272\u3002", features: ["3kW \u5149\u7EA4\u6FC0\u5149", "\u4EA4\u6362\u5DE5\u4F5C\u53F0", "CE \u8BA4\u8BC1"] }
    },
    {
      id: "p2",
      sellerId,
      companyId: c1,
      category: "electronics",
      sub: "ev-charging",
      hsCode: "8504.40",
      country: "CN",
      priceMin: 3.2,
      priceMax: 4.8,
      moq: 1e3,
      unit: "pcs",
      leadTime: 15,
      terms: ["FOB", "EXW"],
      certs: ["CE", "RoHS"],
      srcLang: "en",
      status: "on",
      en: { title: "GaN Fast Charger 65W USB-C", description: "65W GaN fast charger with USB-C PD3.0, compact design, CE & RoHS.", features: ["65W GaN", "USB-C PD3.0", "CE & RoHS"] },
      zh: { title: "65W \u6C2E\u5316\u9553\u5FEB\u5145\u5145\u7535\u5668", description: "65W \u6C2E\u5316\u9553\u5FEB\u5145\u5145\u7535\u5668\uFF0CUSB-C PD3.0\uFF0C\u5C0F\u5DE7\u4FBF\u643A\uFF0CCE/RoHS \u8BA4\u8BC1\u3002", features: ["65W \u6C2E\u5316\u9553", "USB-C PD3.0", "CE/RoHS"] }
    },
    {
      id: "p3",
      sellerId,
      companyId: c1,
      category: "textiles",
      sub: "fabric",
      hsCode: "5208.11",
      country: "CN",
      priceMin: 2.8,
      priceMax: 3.6,
      moq: 500,
      unit: "kg",
      leadTime: 20,
      terms: ["FOB"],
      certs: ["GOTS"],
      srcLang: "zh",
      status: "pending",
      en: { title: "Organic Cotton Jersey Fabric", description: "GOTS organic cotton jersey, 180gsm, natural dye options.", features: ["GOTS certified", "180gsm", "Natural dyes"] },
      zh: { title: "\u6709\u673A\u68C9\u9488\u7EC7\u9762\u6599", description: "GOTS \u6709\u673A\u68C9\u9488\u7EC7\u9762\u6599\uFF0C180gsm\uFF0C\u53EF\u9009\u5929\u7136\u67D3\u8272\u3002", features: ["GOTS \u8BA4\u8BC1", "180gsm", "\u5929\u7136\u67D3\u8272"] }
    }
  ];
  for (const p of products) {
    await run(
      "INSERT INTO products (id, seller_id, company_id, category, sub, hs_code, country, price_min, price_max, moq, unit, lead_time, terms, certs, src_lang, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      p.id,
      p.sellerId,
      p.companyId,
      p.category,
      p.sub || "",
      p.hsCode,
      p.country,
      p.priceMin,
      p.priceMax,
      p.moq,
      p.unit,
      p.leadTime,
      JSON.stringify(p.terms),
      JSON.stringify(p.certs),
      p.srcLang,
      p.status,
      now,
      now
    );
    for (const lang of ["en", "zh"]) {
      await run(
        "INSERT INTO product_translations (id, product_id, lang, title, description, features, updated_at) VALUES (?,?,?,?,?,?,?)",
        randomUUID(),
        p.id,
        lang,
        p[lang].title,
        p[lang].description,
        JSON.stringify(p[lang].features),
        now
      );
    }
    await run(
      "INSERT INTO anti_fake_codes (id, product_id, code, batch_no, status, issued_at, verify_count) VALUES (?,?,?,?,?,?,?)",
      randomUUID(),
      p.id,
      antiFakeCode(p.id, p.sellerId, p.en.title),
      "B2026-001",
      "active",
      now,
      0
    );
  }
  const src1 = randomUUID(), src2 = randomUUID();
  await run("INSERT INTO news_sources (id, name, url, region, category, enabled) VALUES (?,?,?,?,?,?)", src1, "\u4E2D\u56FD\u6D77\u5173\u603B\u7F72", "https://www.customs.gov.cn", "CN", "logistics", 1);
  await run("INSERT INTO news_sources (id, name, url, region, category, enabled) VALUES (?,?,?,?,?,?)", src2, "\u6B27\u76DF\u59D4\u5458\u4F1A\u7A0E\u52A1\u4E0E\u6D77\u5173", "https://taxation-customs.ec.europa.eu", "EU", "compliance", 1);
  await run(
    "INSERT INTO news_items (id, source_id, region, category, title_zh, title_en, summary_zh, summary_en, url, published_at, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    "n1",
    src1,
    "CN",
    "logistics",
    "\u6D77\u5173\u63A8\u5E7F\u8DE8\u5883\u7535\u5546\u9000\u8D27\u4FBF\u5229\u5316",
    "Customs improves cross-border e-commerce returns",
    "\u9000\u8FD0\u5546\u54C1\u53EF\u8DE8\u5173\u533A\u9000\u56DE\u3002",
    "Returned goods can cross customs districts.",
    "https://www.customs.gov.cn",
    "2026-08-01",
    "published"
  );
  await run(
    "INSERT INTO news_items (id, source_id, region, category, title_zh, title_en, summary_zh, summary_en, url, published_at, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    "n2",
    src2,
    "EU",
    "compliance",
    "\u6B27\u76DF CBAM \u8FDB\u5165\u6B63\u5F0F\u5B9E\u65BD\u9636\u6BB5",
    "EU CBAM enters definitive phase",
    "\u8FDB\u53E3\u5546\u987B\u6CE8\u518C\u6388\u6743\u7533\u62A5\u4EBA\u3002",
    "Importers must register as authorized declarants.",
    "https://taxation-customs.ec.europa.eu",
    "2026-08-02",
    "published"
  );
  await run(
    "INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,?,?)",
    randomUUID(),
    adminId,
    "system.seed",
    "database",
    "seed",
    "\u521D\u59CB\u5316\u6F14\u793A\u6570\u636E",
    now
  );
  return true;
}
__name(seedIfEmpty, "seedIfEmpty");

// ../backend/src/translate.mjs
var DAILY_QUOTA = Number(process.env.TRANSLATION_DAILY_QUOTA || 5e3);
var cache = /* @__PURE__ */ new Map();
function providerMode() {
  return process.env.TRANSLATION_PROVIDER || "chain";
}
__name(providerMode, "providerMode");
function detectSource(text) {
  return /[\u4e00-\u9fff]/.test(text) ? "zh-CN" : "en";
}
__name(detectSource, "detectSource");
function fetchTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}
__name(fetchTimeout, "fetchTimeout");
async function providerMyMemory(text, target) {
  const url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text.slice(0, 500)) + "&langpair=" + detectSource(text) + "|" + target;
  const r = await fetchTimeout(url, null, 4e3);
  if (!r.ok) throw new Error("MyMemory HTTP " + r.status);
  const j = await r.json();
  const out = j && j.responseData && j.responseData.translatedText;
  if (!out || j.responseStatus !== 200) throw new Error("MyMemory empty");
  return out;
}
__name(providerMyMemory, "providerMyMemory");
async function providerLibre(text, target) {
  const r = await fetchTimeout("https://libretranslate.com/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text.slice(0, 1e3), source: detectSource(text), target, format: "text" })
  }, 3e3);
  if (!r.ok) throw new Error("LibreTranslate HTTP " + r.status);
  const j = await r.json();
  if (!j || !j.translatedText) throw new Error("LibreTranslate empty");
  return j.translatedText;
}
__name(providerLibre, "providerLibre");
function deeplLang(code) {
  const map = {
    "zh-CN": "ZH",
    "zh-TW": "ZH-HANT",
    en: "EN",
    ja: "JA",
    ko: "KO",
    es: "ES",
    fr: "FR",
    de: "DE",
    pt: "PT",
    ru: "RU",
    ar: "AR",
    it: "IT",
    nl: "NL",
    pl: "PL",
    sv: "SV",
    tr: "TR",
    cs: "CS",
    el: "EL",
    uk: "UK",
    id: "ID",
    vi: "VI",
    th: "TH",
    hi: "HI"
  };
  return map[code] || String(code || "").toUpperCase().split("-")[0];
}
__name(deeplLang, "deeplLang");
async function providerDeepL(text, target, source) {
  const key = process.env.DEEPL_API_KEY;
  if (!key) throw new Error("DEEPL_KEY_MISSING");
  const url = process.env.DEEPL_API_URL || "https://api-free.deepl.com/v2/translate";
  const params = new URLSearchParams();
  params.append("text", text);
  params.append("target_lang", deeplLang(target));
  if (source) params.append("source_lang", deeplLang(source));
  const r = await fetchTimeout(url, {
    method: "POST",
    headers: {
      "Authorization": "DeepL-Auth-Key " + key,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  }, 6e3);
  if (!r.ok) throw new Error("DeepL HTTP " + r.status);
  const j = await r.json();
  const out = j && j.translations && j.translations[0] && j.translations[0].text;
  if (!out) throw new Error("DeepL empty");
  return out;
}
__name(providerDeepL, "providerDeepL");
function offlineTranslate(text, target) {
  const s = String(text || "").trim();
  if (!s) return "";
  const t = target === "zh-CN" ? "zh" : target;
  if (t !== "en" && t !== "zh") return s;
  let out = " " + s + " ";
  const pairs = OFFLINE_DICT.slice().sort((a, b) => {
    const la = (t === "en" ? a[0] : a[1]) || "";
    const lb = (t === "en" ? b[0] : b[1]) || "";
    return lb.length - la.length;
  });
  for (const [from, to] of pairs) {
    const src = t === "en" ? from : to;
    const dst = t === "en" ? to : from;
    if (!src) continue;
    out = out.split(src).join(dst);
    out = out.split(src.toLowerCase()).join(dst);
  }
  return out.replace(/\s+/g, " ").trim();
}
__name(offlineTranslate, "offlineTranslate");
function todayKey() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
__name(todayKey, "todayKey");
async function usedChars(userId) {
  const row = await get("SELECT COALESCE(SUM(chars),0) AS c FROM translation_usage WHERE user_id = ? AND day = ?", userId || "guest", todayKey());
  return row ? row.c : 0;
}
__name(usedChars, "usedChars");
function translateError(status, code, message) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}
__name(translateError, "translateError");
async function translateText({ userId, text, target, source }) {
  const s = String(text || "").trim();
  const tgt = String(target || "").trim();
  if (!s || !tgt) throw translateError(400, "VALIDATION", "text/target \u4E3A\u5FC5\u586B");
  if (s.length > 2e3) throw translateError(400, "TEXT_TOO_LONG", "\u5355\u6B21\u7FFB\u8BD1\u6700\u591A 2000 \u5B57\u7B26");
  const cacheKey = s + "|" + tgt;
  if (cache.has(cacheKey)) {
    const hit = cache.get(cacheKey);
    return { text: hit.text, target: tgt, source: source || null, provider: hit.provider, cached: true };
  }
  const uid = userId || "guest";
  if (await usedChars(uid) + s.length > DAILY_QUOTA) {
    throw translateError(429, "QUOTA_EXCEEDED", "\u4ECA\u65E5\u7FFB\u8BD1\u989D\u5EA6\u5DF2\u7528\u5B8C");
  }
  let result = null, provider = "";
  if (providerMode() !== "mock") {
    if (providerMode() === "deepl") {
      if (!process.env.DEEPL_API_KEY) {
        throw translateError(503, "CONFIG_MISSING", "\u672A\u914D\u7F6E DEEPL_API_KEY\uFF08\u8BF7\u5199\u5165 backend/.env\uFF09");
      }
      try {
        result = await providerDeepL(s, tgt, source);
        provider = "deepl";
      } catch (e) {
        throw translateError(502, "TRANSLATE_FAILED", "DeepL \u8C03\u7528\u5931\u8D25\uFF1A" + e.message);
      }
    } else {
      if (process.env.DEEPL_API_KEY) {
        try {
          result = await providerDeepL(s, tgt, source);
          provider = "deepl";
        } catch (e) {
        }
      }
      if (!result) {
        try {
          result = await providerMyMemory(s, tgt);
          provider = "mymemory";
        } catch (e) {
          try {
            result = await providerLibre(s, tgt);
            provider = "libretranslate";
          } catch (e2) {
          }
        }
      }
    }
  }
  if (!result) {
    result = offlineTranslate(s, tgt);
    provider = "offline";
  }
  if (provider !== "offline") cache.set(cacheKey, { text: result, provider });
  await run(
    "INSERT INTO translation_usage (id, user_id, day, chars, created_at) VALUES (?,?,?,?,?)",
    randomUUID(),
    uid,
    todayKey(),
    s.length,
    Date.now()
  );
  return { text: result, target: tgt, source: source || null, provider, cached: false };
}
__name(translateText, "translateText");
var OFFLINE_DICT = [
  ["\u60A8\u597D", "Hello"],
  ["\u4F60\u597D", "Hi"],
  ["\u611F\u8C22", "Thank you"],
  ["\u8C22\u8C22", "Thanks"],
  ["\u8BF7\u62A5\u4EF7", "please quote"],
  ["\u62A5\u4EF7", "quotation"],
  ["\u8BE2\u76D8", "inquiry"],
  ["\u56DE\u590D", "reply"],
  ["\u6570\u91CF", "quantity"],
  ["\u5355\u4EF7", "unit price"],
  ["\u4EF7\u683C", "price"],
  ["\u603B\u4EF7", "total amount"],
  ["\u4EA4\u671F", "lead time"],
  ["\u4EA4\u8D27\u671F", "delivery time"],
  ["\u6837\u54C1", "sample"],
  ["\u8BA4\u8BC1", "certification"],
  ["\u8BC1\u4E66", "certificate"],
  ["\u652F\u4ED8", "payment"],
  ["\u5305\u88C5", "packaging"],
  ["\u53D1\u7968", "invoice"],
  ["\u8BA2\u5355", "order"],
  ["\u6298\u6263", "discount"],
  ["\u53D1\u8D27", "shipment"],
  ["\u5DE5\u5382", "factory"],
  ["\u6E2F\u53E3", "port"],
  ["\u8FD0\u8D39", "freight"],
  ["\u4FDD\u9669", "insurance"],
  ["\u5408\u540C", "contract"],
  ["\u5B9A\u91D1", "deposit"],
  ["\u5C3E\u6B3E", "balance"],
  ["\u4FE1\u7528\u8BC1", "letter of credit (L/C)"],
  ["\u8D28\u91CF", "quality"],
  ["\u89C4\u683C", "specification"],
  ["\u5B9A\u5236", "customized"],
  ["\u539F\u4EA7\u5730", "origin"],
  ["\u6709\u6548\u671F", "validity"],
  ["\u5305\u542B", "including"],
  ["\u9700\u8981", "need"],
  ["\u53EF\u4EE5", "can"],
  ["\u8BF7\u786E\u8BA4", "please confirm"],
  ["\u5230\u8D27", "arrival"],
  ["\u76EE\u7684\u6E2F", "destination port"],
  ["\u88C5\u8FD0\u6E2F", "loading port"],
  ["tariff", "\u5173\u7A0E"],
  ["customs", "\u6D77\u5173"],
  ["compliance", "\u5408\u89C4"],
  ["shipment", "\u53D1\u8D27"],
  ["payment", "\u652F\u4ED8"],
  ["price", "\u4EF7\u683C"],
  ["quantity", "\u6570\u91CF"],
  ["sample", "\u6837\u54C1"],
  ["invoice", "\u53D1\u7968"],
  ["quotation", "\u62A5\u4EF7"],
  ["inquiry", "\u8BE2\u76D8"],
  ["delivery", "\u4EA4\u8D27"],
  ["warehouse", "\u4ED3\u5E93"],
  ["order", "\u8BA2\u5355"],
  ["discount", "\u6298\u6263"],
  ["quality", "\u8D28\u91CF"],
  ["factory", "\u5DE5\u5382"],
  ["please quote", "\u8BF7\u62A5\u4EF7"],
  ["best price", "\u6700\u4F18\u4EF7\u683C"],
  ["lead time", "\u4EA4\u671F"],
  ["packing", "\u5305\u88C5"],
  ["MOQ", "\u8D77\u8BA2\u91CF"],
  ["FOB", "FOB"],
  ["CIF", "CIF"]
];

// ../backend/src/storage.mjs
var MAX_FILE_SIZE = 10 * 1024 * 1024;
var UPLOAD_DIR = "";
var ALLOWED = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf"
};
var MAGIC = {
  "image/png": [137, 80, 78, 71, 13, 10, 26, 10],
  "image/jpeg": [255, 216, 255],
  "image/gif": [71, 73, 70, 56],
  "application/pdf": [37, 80, 68, 70]
};
var impl2 = null;
function configureStorage({ maxFileSize, uploadDir, custom } = {}) {
  const n = Number(maxFileSize);
  if (Number.isFinite(n) && n > 0) MAX_FILE_SIZE = n;
  if (uploadDir) UPLOAD_DIR = String(uploadDir);
  if (custom) impl2 = custom;
}
__name(configureStorage, "configureStorage");
function setStorageImpl(custom) {
  impl2 = custom;
}
__name(setStorageImpl, "setStorageImpl");
function current2() {
  if (!impl2) throw new Error("\u6587\u4EF6\u5B58\u50A8\u672A\u521D\u59CB\u5316\uFF08\u8BF7\u5728\u5E73\u53F0\u5165\u53E3\u6CE8\u5165\u5B9E\u73B0\uFF09");
  return impl2;
}
__name(current2, "current");
async function putFile(key, buf) {
  return current2().put(key, buf);
}
__name(putFile, "putFile");
async function getFile(key) {
  return current2().get(key);
}
__name(getFile, "getFile");
function asBytes(buf) {
  if (buf instanceof Uint8Array) return buf;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(buf)) return new Uint8Array(buf);
  if (buf instanceof ArrayBuffer) return new Uint8Array(buf);
  return new Uint8Array(0);
}
__name(asBytes, "asBytes");
function magicMatches(mime, bytes) {
  if (mime === "image/webp") {
    if (bytes.length <= 12) return false;
    const tag = /* @__PURE__ */ __name((o) => String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]), "tag");
    return tag(0) === "RIFF" && tag(8) === "WEBP";
  }
  const sig = MAGIC[mime];
  if (!sig) return false;
  return sig.every((b, i) => bytes[i] === b);
}
__name(magicMatches, "magicMatches");
function validateFile(mime, buf) {
  const bytes = asBytes(buf);
  const size = bytes.length;
  const ext = ALLOWED[mime];
  if (!ext) return { error: { status: 400, code: "UNSUPPORTED_TYPE", message: "\u4EC5\u652F\u6301\u56FE\u7247\u4E0E PDF" } };
  if (size > MAX_FILE_SIZE) return { error: { status: 400, code: "FILE_TOO_LARGE", message: "\u6587\u4EF6\u8D85\u8FC7\u5927\u5C0F\u9650\u5236" } };
  if (!magicMatches(mime, bytes)) return { error: { status: 400, code: "INVALID_FILE", message: "\u6587\u4EF6\u5185\u5BB9\u4E0E\u58F0\u660E\u7C7B\u578B\u4E0D\u7B26" } };
  return { ext };
}
__name(validateFile, "validateFile");

// ../backend/src/mailer.mjs
var transport = null;
var transportName = "mock";
function configureMailer({ custom, name } = {}) {
  if (custom) transport = custom;
  if (name) transportName = name;
}
__name(configureMailer, "configureMailer");
async function sendMail({ to, subject, body }) {
  let status = "sent";
  let detail = null;
  if (transport) {
    try {
      await transport({ to, subject, body });
    } catch (e) {
      status = "failed";
      detail = e.message;
    }
  }
  const id = randomUUID();
  await run(
    "INSERT INTO mail_outbox (id, recipient, subject, body, status, sent_at, created_at) VALUES (?,?,?,?,?,?,?)",
    id,
    to,
    subject || "",
    body || "",
    status,
    Date.now(),
    Date.now()
  );
  console.log("[mail:" + transportName + "] to=" + to + " subject=" + subject + " status=" + status + (detail ? " (" + detail + ")" : ""));
  if (status === "failed") throw new Error("MAIL_FAILED: " + detail);
  return { ok: true, id, transport: transportName, status };
}
__name(sendMail, "sendMail");
async function notifyUser(userId, type, title2, body) {
  await run(
    "INSERT INTO notifications (id, user_id, type, title, body, created_at) VALUES (?,?,?,?,?,?)",
    randomUUID(),
    userId,
    type,
    title2,
    body,
    Date.now()
  );
}
__name(notifyUser, "notifyUser");

// ../backend/src/app.mjs
function createApp({ env: env2 = {}, deps = {} } = {}) {
  const ENV = env2;
  const wsBroadcast = typeof deps.wsBroadcast === "function" ? deps.wsBroadcast : () => {
  };
  configureAuth({ secret: ENV.JWT_SECRET, iterations: ENV.PBKDF2_ITERATIONS });
  const NEWS_FEEDS = [
    { url: "https://www.wto.org/english/news_e/news_e.rss", name: "WTO News", region: "global", category: "policy" },
    { url: "https://taxation-customs.ec.europa.eu/en/rss-feeds", name: "EU Taxation & Customs", region: "EU", category: "compliance" },
    { url: "https://www.customs.gov.cn/customs/302249/302274/index.html", name: "\u4E2D\u56FD\u6D77\u5173\u603B\u7F72", region: "CN", category: "logistics" }
  ];
  function parseRss(xml) {
    const out = [];
    const re = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g;
    let m;
    while (m = re.exec(xml)) {
      const blk = m[1];
      const title2 = /<title[^>]*>([\s\S]*?)<\/title>/.exec(blk);
      const link = /<link[^>]*href="([^"]+)"[^>]*>/.exec(blk) || /<link>([\s\S]*?)<\/link>/.exec(blk);
      const pub = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(blk) || /<published>([\s\S]*?)<\/published>/.exec(blk) || /<updated>([\s\S]*?)<\/updated>/.exec(blk);
      if (!title2 || !link) continue;
      out.push({
        title: title2[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
        url: (link[1] || link[2] || "").trim(),
        publishedAt: pub ? pub[1].trim() : (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    return out;
  }
  __name(parseRss, "parseRss");
  async function refreshNewsFeeds(actorId) {
    let added = 0, failed = 0;
    for (const feed of NEWS_FEEDS) {
      try {
        const resp = await fetch(feed.url, { signal: AbortSignal.timeout(12e3), headers: { "User-Agent": "BeanBeanMouse/1.0" } });
        if (!resp.ok) {
          failed++;
          continue;
        }
        const xml = await resp.text();
        const items = parseRss(xml);
        let src = await get("SELECT * FROM news_sources WHERE name = ?", feed.name);
        if (!src) {
          const sid = randomUUID();
          await run(
            "INSERT INTO news_sources (id, name, url, region, category, enabled) VALUES (?,?,?,?,?,?)",
            sid,
            feed.name,
            feed.url,
            feed.region,
            feed.category,
            1
          );
          src = await get("SELECT * FROM news_sources WHERE id = ?", sid);
        }
        for (const it of items.slice(0, 10)) {
          if (!it.url || await get("SELECT id FROM news_items WHERE url = ?", it.url)) continue;
          await run(
            "INSERT INTO news_items (id, source_id, region, category, title_zh, title_en, summary_zh, summary_en, url, published_at, updated_at, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            randomUUID(),
            src.id,
            feed.region,
            feed.category,
            it.title,
            it.title,
            "",
            "",
            it.url,
            it.publishedAt,
            Date.now(),
            "published"
          );
          added++;
        }
      } catch (e) {
        failed++;
        console.error("[news.refresh] " + feed.name + ": " + e.message);
      }
    }
    await audit(actorId, "news.refresh", "news", "", "added=" + added + " failed=" + failed + (actorId ? "" : " (auto)"));
    return { added, failed, note: "RSS \u6293\u53D6\u4E3A\u5C3D\u529B\u800C\u4E3A\uFF0C\u5931\u8D25\u4E0D\u5F71\u54CD\u73B0\u6709\u8D44\u8BAF" };
  }
  __name(refreshNewsFeeds, "refreshNewsFeeds");
  const NEWS_AUTO_REFRESH = ENV.NODE_ENV !== "test" && String(ENV.NEWS_AUTO_REFRESH || "1") !== "0";
  const NEWS_AUTO_REFRESH_MS = Math.max(60 * 1e3, Number(ENV.NEWS_AUTO_REFRESH_MS) || 6 * 3600 * 1e3);
  const newsAutoState = {
    enabled: NEWS_AUTO_REFRESH,
    intervalMs: NEWS_AUTO_REFRESH_MS,
    lastRunAt: null,
    nextRunAt: NEWS_AUTO_REFRESH ? Date.now() + NEWS_AUTO_REFRESH_MS : null,
    running: false
  };
  function startNewsAutoRefresh() {
    if (!NEWS_AUTO_REFRESH) return;
    const t = setInterval(async () => {
      if (newsAutoState.running) return;
      newsAutoState.running = true;
      try {
        const r = await refreshNewsFeeds(null);
        newsAutoState.lastRunAt = Date.now();
        console.log("[news.auto] refresh done added=" + r.added + " failed=" + r.failed);
      } catch (e) {
        console.error("[news.auto] refresh failed: " + e.message);
      } finally {
        newsAutoState.running = false;
        newsAutoState.nextRunAt = Date.now() + NEWS_AUTO_REFRESH_MS;
      }
    }, NEWS_AUTO_REFRESH_MS);
    t.unref();
  }
  __name(startNewsAutoRefresh, "startNewsAutoRefresh");
  async function ensureInsuranceProviders() {
    const n = (await all("SELECT COUNT(*) AS c FROM insurance_providers"))[0].c;
    if (n > 0) return;
    const now = Date.now();
    const defaults = [
      {
        name: "\u8C46\u8C46\u9F20\u62A4\u822A\u8BA1\u5212\uFF08\u5E73\u53F0\u8BD5\u70B9\uFF09",
        region: "GLOBAL",
        sort: 1,
        enabled: 1,
        tiers: {
          basic: { label: "\u57FA\u7840\u4FDD\u969C", rate: 5e-3, minPremium: 3, coverage: "\u8FD0\u8F93\u9014\u4E2D\u610F\u5916\u635F\u574F\uFF08\u514D\u8D54 20%\uFF0C\u6700\u9AD8\u8D54\u507F\u8BA2\u5355\u91D1\u989D\uFF09" },
          standard: { label: "\u6807\u51C6\u4FDD\u969C", rate: 0.01, minPremium: 5, coverage: "\u635F\u574F / \u706D\u5931 + \u5EF6\u8BEF\u8865\u8D34\uFF08\u514D\u8D54 10%\uFF09" },
          premium: { label: "\u5C0A\u4EAB\u4FDD\u969C", rate: 0.015, minPremium: 10, coverage: "\u5168\u635F / \u635F\u574F / \u5EF6\u8BEF + \u5173\u7A0E\u635F\u5931\uFF08\u514D\u8D54 5%\uFF09" }
        }
      },
      { name: "\u5408\u4F5C\u4FDD\u9669\u5546 A\uFF08\u63A5\u5165\u6D3D\u8C08\u4E2D\uFF09", region: "GLOBAL", sort: 2, enabled: 0, tiers: {} },
      { name: "\u5408\u4F5C\u4FDD\u9669\u5546 B\uFF08\u63A5\u5165\u6D3D\u8C08\u4E2D\uFF09", region: "GLOBAL", sort: 3, enabled: 0, tiers: {} }
    ];
    for (const d of defaults) {
      await run(
        "INSERT INTO insurance_providers (id, name, region, tiers, enabled, sort, created_at) VALUES (?,?,?,?,?,?,?)",
        randomUUID(),
        d.name,
        d.region,
        JSON.stringify(d.tiers),
        d.enabled,
        d.sort,
        now
      );
    }
  }
  __name(ensureInsuranceProviders, "ensureInsuranceProviders");
  const loginAttempts = /* @__PURE__ */ new Map();
  const LOGIN_LIMIT = Number(ENV.LOGIN_LIMIT || 10);
  function loginRateLimit(ip) {
    const now = Date.now();
    const win = 60 * 1e3;
    const rec = loginAttempts.get(ip) || { count: 0, resetAt: now + win };
    if (now > rec.resetAt) {
      rec.count = 0;
      rec.resetAt = now + win;
    }
    rec.count++;
    loginAttempts.set(ip, rec);
    return rec.count;
  }
  __name(loginRateLimit, "loginRateLimit");
  const registerAttempts = /* @__PURE__ */ new Map();
  const REGISTER_LIMIT = Number(ENV.REGISTER_LIMIT || 5);
  async function registerRateLimit(ip) {
    const now = Date.now();
    const win = 60 * 1e3;
    const rec = registerAttempts.get(ip) || { count: 0, resetAt: now + win };
    if (now > rec.resetAt) {
      rec.count = 0;
      rec.resetAt = now + win;
    }
    rec.count++;
    registerAttempts.set(ip, rec);
    return rec.count;
  }
  __name(registerRateLimit, "registerRateLimit");
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  async function sha256(s) {
    return await sha256Hex(s);
  }
  __name(sha256, "sha256");
  async function newEmailToken(userId) {
    const token = toHex(randomBytes(24));
    await run(
      "INSERT INTO email_tokens (id, user_id, token_hash, purpose, expires_at, created_at) VALUES (?,?,?,?,?,?)",
      randomUUID(),
      userId,
      await sha256(token),
      "verify_email",
      Date.now() + 24 * 3600 * 1e3,
      Date.now()
    );
    return token;
  }
  __name(newEmailToken, "newEmailToken");
  async function sendVerifyEmail(userId, email) {
    const token = await newEmailToken(userId);
    const appUrl = ENV.APP_URL || "https://beanbeanmouse.com";
    const link = appUrl + "/#/verify-email?token=" + token;
    await sendMail({
      to: email,
      subject: "[BeanBeanMouse] \u8BF7\u9A8C\u8BC1\u60A8\u7684\u90AE\u7BB1",
      body: "\u6B22\u8FCE\u6CE8\u518C BeanBeanMouse\uFF01\u8BF7\u70B9\u51FB\u4EE5\u4E0B\u94FE\u63A5\u5B8C\u6210\u90AE\u7BB1\u9A8C\u8BC1\uFF0824 \u5C0F\u65F6\u5185\u6709\u6548\uFF09\uFF1A\n\n" + link + "\n\n\u5982\u975E\u672C\u4EBA\u64CD\u4F5C\uFF0C\u8BF7\u5FFD\u7565\u672C\u90AE\u4EF6\u3002"
    });
    return link;
  }
  __name(sendVerifyEmail, "sendVerifyEmail");
  const CORS_ORIGIN = ENV.ALLOWED_ORIGINS ? ENV.ALLOWED_ORIGINS.split(",")[0].trim() : "*";
  if (!ENV.ALLOWED_ORIGINS) {
    console.warn("[security] ALLOWED_ORIGINS \u672A\u914D\u7F6E\uFF0CCORS \u4F7F\u7528 *\uFF08\u4EC5\u5EFA\u8BAE\u5F00\u53D1/\u6F14\u793A\uFF1B\u751F\u4EA7\u8BF7\u914D\u7F6E\u767D\u540D\u5355\uFF09");
  }
  const CORS = {
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
  const SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'"
  };
  function send2(res, status, data) {
    const body = data === void 0 ? "" : JSON.stringify(data);
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...CORS, ...SECURITY_HEADERS });
    res.end(body);
  }
  __name(send2, "send");
  function sendBytes(res, status, buf, contentType, extraHeaders = {}) {
    res.writeHead(status, {
      "Content-Type": contentType,
      "Content-Length": buf.length,
      "Cache-Control": "private, max-age=3600",
      ...CORS,
      ...SECURITY_HEADERS,
      ...extraHeaders
    });
    res.end(buf);
  }
  __name(sendBytes, "sendBytes");
  function fail(res, status, code, message) {
    send2(res, status, { error: code, message });
  }
  __name(fail, "fail");
  async function rawText(req) {
    if (typeof req.__rawText === "string") return req.__rawText;
    if (typeof req.text === "function") return await req.text();
    return "";
  }
  __name(rawText, "rawText");
  async function rawBuffer(req) {
    if (req.__rawBuf) return req.__rawBuf;
    if (typeof req.arrayBuffer === "function") return new Uint8Array(await req.arrayBuffer());
    return new Uint8Array(0);
  }
  __name(rawBuffer, "rawBuffer");
  async function readBody(req) {
    const text = await rawText(req);
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error("INVALID_JSON");
    }
  }
  __name(readBody, "readBody");
  async function readRawBody(req) {
    return await rawBuffer(req);
  }
  __name(readRawBody, "readRawBody");
  function parseMultipart(body, boundary) {
    const delim = Buffer.from("--" + boundary);
    const parts = [];
    let pos = 0;
    for (; ; ) {
      const start = body.indexOf(delim, pos);
      if (start === -1) break;
      const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), start + delim.length);
      if (headerEnd === -1) break;
      const headerText = body.slice(start + delim.length + 2, headerEnd).toString("utf8");
      const contentStart = headerEnd + 4;
      const nextDelim = body.indexOf(Buffer.from("\r\n--" + boundary), contentStart);
      if (nextDelim === -1) break;
      const name = /name="([^"]+)"/.exec(headerText);
      const filename = /filename="([^"]*)"/.exec(headerText);
      parts.push({
        name: name ? name[1] : "",
        filename: filename ? filename[1] : "",
        contentType: /content-type:\s*([^\r\n]+)/i.exec(headerText)?.[1]?.trim() || "application/octet-stream",
        content: body.slice(contentStart, nextDelim)
      });
      pos = nextDelim + 2;
    }
    return parts;
  }
  __name(parseMultipart, "parseMultipart");
  function pageParams(q) {
    const page = Math.max(1, parseInt(q.get("page") || "1", 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(q.get("size") || "20", 10) || 20));
    return { page, size };
  }
  __name(pageParams, "pageParams");
  function paginate(list, q) {
    const { page, size } = pageParams(q);
    const total = list.length;
    return { items: list.slice((page - 1) * size, page * size), total, page, size };
  }
  __name(paginate, "paginate");
  async function currentUser(req) {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : "";
    const payload = await verifyToken(token);
    if (!payload || !payload.uid) return null;
    return await get("SELECT * FROM users WHERE id = ?", payload.uid) || null;
  }
  __name(currentUser, "currentUser");
  async function requireAuth(res, req, roles) {
    const u = await currentUser(req);
    if (!u) {
      fail(res, 401, "UNAUTHORIZED", "\u8BF7\u5148\u767B\u5F55");
      return null;
    }
    if (roles && !roles.includes(u.role)) {
      fail(res, 403, "FORBIDDEN", "\u6743\u9650\u4E0D\u8DB3");
      return null;
    }
    return u;
  }
  __name(requireAuth, "requireAuth");
  function publicUser(u) {
    return u ? { id: u.id, email: u.email, role: u.role, name: u.name, status: u.status } : null;
  }
  __name(publicUser, "publicUser");
  async function audit(actor, action, targetType, targetId, detail) {
    await run(
      "INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,?,?)",
      randomUUID(),
      actor || null,
      action,
      targetType || null,
      targetId || null,
      detail || "",
      Date.now()
    );
  }
  __name(audit, "audit");
  function safeJson(s, fallback) {
    try {
      return JSON.parse(s);
    } catch (e) {
      return fallback;
    }
  }
  __name(safeJson, "safeJson");
  function toNum(v, dft) {
    const n = Number(v);
    return Number.isFinite(n) ? n : dft;
  }
  __name(toNum, "toNum");
  async function productView(row) {
    const trs = await all("SELECT * FROM product_translations WHERE product_id = ?", row.id);
    const translations = {};
    for (const t of trs) {
      translations[t.lang] = {
        title: t.title,
        description: t.description,
        features: safeJson(t.features, [])
      };
    }
    const code = await get("SELECT code FROM anti_fake_codes WHERE product_id = ?", row.id);
    const promo = await get("SELECT id FROM promotion_requests WHERE product_id = ? AND status = ?", row.id, "approved");
    return {
      ...row,
      terms: safeJson(row.terms, []),
      certs: safeJson(row.certs, []),
      translations,
      antiFakeCode: code ? code.code : null,
      promoted: !!promo
    };
  }
  __name(productView, "productView");
  async function orderView(o) {
    const tips = await all("SELECT * FROM tips WHERE order_id = ? ORDER BY created_at DESC", o.id);
    const shipments = await Promise.all((await all("SELECT * FROM shipments WHERE order_id = ? ORDER BY created_at ASC", o.id)).map(shipmentView));
    const evidence = await all("SELECT * FROM evidence_records WHERE order_id = ? ORDER BY chain_index ASC", o.id);
    const buyer = o.buyer_id ? await get("SELECT id, name, email FROM users WHERE id = ?", o.buyer_id) : null;
    const seller = o.seller_id ? await get("SELECT id, name, email FROM users WHERE id = ?", o.seller_id) : null;
    return { ...o, buyer, seller, tips, shipments, evidence, evidenceVerified: await verifyEvidenceChain(o.id).valid };
  }
  __name(orderView, "orderView");
  async function shipmentView(s) {
    const events = await all("SELECT * FROM shipment_events WHERE shipment_id = ? ORDER BY event_time ASC, created_at ASC", s.id);
    return { ...s, events };
  }
  __name(shipmentView, "shipmentView");
  function evidencePayload(kind, refId, snapshot, actorId, at) {
    return { kind: String(kind || "").slice(0, 32), refId: refId || null, snapshot: snapshot || {}, actorId: actorId || null, at };
  }
  __name(evidencePayload, "evidencePayload");
  async function lastEvidence(orderId) {
    return await get("SELECT * FROM evidence_records WHERE order_id = ? ORDER BY chain_index DESC LIMIT 1", orderId);
  }
  __name(lastEvidence, "lastEvidence");
  async function addEvidence(orderId, actorId, kind, refId, snapshot) {
    const prev = await lastEvidence(orderId);
    const prevHash = prev ? prev.content_hash : "GENESIS";
    const chainIndex = prev ? prev.chain_index + 1 : 0;
    const at = Date.now();
    const payload = evidencePayload(kind, refId, snapshot, actorId, at);
    const contentHash = await sha256(prevHash + "|" + chainIndex + "|" + JSON.stringify(payload));
    await run(
      "INSERT INTO evidence_records (id, order_id, actor_id, kind, ref_id, snapshot, content_hash, prev_hash, chain_index, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      randomUUID(),
      orderId,
      actorId || null,
      payload.kind,
      payload.refId,
      JSON.stringify(payload.snapshot),
      contentHash,
      prevHash,
      chainIndex,
      at
    );
    return await get("SELECT * FROM evidence_records WHERE order_id = ? ORDER BY chain_index DESC LIMIT 1", orderId);
  }
  __name(addEvidence, "addEvidence");
  async function verifyEvidenceChain(orderId) {
    const rows = await all("SELECT * FROM evidence_records WHERE order_id = ? ORDER BY chain_index ASC", orderId);
    let prevHash = "GENESIS";
    const broken = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const payload = evidencePayload(r.kind, r.ref_id, safeJson(r.snapshot, {}), r.actor_id, r.created_at);
      const expect = await sha256(prevHash + "|" + i + "|" + JSON.stringify(payload));
      if (expect !== r.content_hash) broken.push(r.id);
      prevHash = r.content_hash;
    }
    return { total: rows.length, valid: broken.length === 0, broken };
  }
  __name(verifyEvidenceChain, "verifyEvidenceChain");
  const EXPORT_ITEMS = ["customs-reg", "fx-account", "tax-rebate", "export-license", "inspection", "co-qualification", "dangerous-goods"];
  const CARD_TEMPLATES = [
    { id: "classic-gold", zh: "\u7ECF\u5178\u6696\u91D1", en: "Classic Gold", swatch: "linear-gradient(135deg,#FFF6E0,#FBEBC9)" },
    { id: "luxe-ink", zh: "\u4F4E\u8C03\u5962\u534E", en: "Luxe Ink", swatch: "linear-gradient(135deg,#20242E,#14171E)" },
    { id: "minimal-white", zh: "\u7B80\u7EA6\u7559\u767D", en: "Minimal White", swatch: "linear-gradient(135deg,#FFFFFF,#F2F2F2)" },
    { id: "modern-blue", zh: "\u73B0\u4EE3\u79D1\u6280", en: "Modern Tech", swatch: "linear-gradient(135deg,#123060,#0A1730)" },
    { id: "oriental-ink", zh: "\u4E1C\u65B9\u96C5\u97F5", en: "Oriental Ink", swatch: "linear-gradient(135deg,#F7F1E3,#EAE0C8)" }
  ];
  const SANCTION_KEYWORDS = [
    "military",
    "defense",
    "defence",
    "missile",
    "nuclear",
    "chemical weapon",
    "bioweapon",
    "drone",
    "night vision",
    "radar",
    "explosive",
    "arms",
    "ammunition",
    "military-grade",
    "\u519B\u4E8B",
    "\u5BFC\u5F39",
    "\u6838\u6B66\u5668",
    "\u751F\u5316\u6B66\u5668",
    "\u65E0\u4EBA\u673A",
    "\u591C\u89C6",
    "\u96F7\u8FBE",
    "\u70B8\u836F",
    "\u5F39\u836F",
    "\u6B66\u5668\u7EA7",
    "\u519B\u8B66"
  ];
  async function verifyTurnstile(token) {
    const secret = ENV.TURNSTILE_SECRET || "";
    if (!secret) return { ok: true, disabled: true };
    if (!token) return { ok: false, error: ["missing-input-response"] };
    try {
      const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, response: String(token) })
      });
      const j = await r.json();
      return { ok: !!j.success, error: j["error-codes"] || [] };
    } catch (e) {
      return { ok: false, error: ["network-error"] };
    }
  }
  __name(verifyTurnstile, "verifyTurnstile");
  function watermarkSvg(buf, name) {
    try {
      let svg = buf.toString("utf8");
      if (!/<\s*svg/i.test(svg)) return buf;
      const safe = String(name || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
      const text = '<text x="50%" y="50%" fill="rgba(120,110,90,0.16)" font-size="24" font-family="Georgia,serif" text-anchor="middle" transform="rotate(-30 50% 50%)">BeanBeanMouse \xB7 ' + safe + "</text>";
      if (/<svg[^>]*>/i.test(svg)) svg = svg.replace(/<svg([^>]*)>/i, "<svg$1>" + text);
      return Buffer.from(svg, "utf8");
    } catch (e) {
      return buf;
    }
  }
  __name(watermarkSvg, "watermarkSvg");
  async function route(m, segs, q, req, res) {
    const [a, b, c, d, e] = segs;
    if (a === "auth") {
      if (m === "POST" && b === "register") {
        const ip = req.socket.remoteAddress || "unknown";
        if (await registerRateLimit(ip) > REGISTER_LIMIT) return fail(res, 429, "TOO_MANY_ATTEMPTS", "\u6CE8\u518C\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5");
        const body = await readBody(req);
        if (String(body.homepage || "").trim() !== "") {
          return fail(res, 400, "BOT_DETECTED", "\u68C0\u6D4B\u5230\u5F02\u5E38\u6CE8\u518C\u884C\u4E3A");
        }
        const ts = await verifyTurnstile(body.turnstileToken);
        if (!ts.ok) return fail(res, 400, "TURNSTILE_FAILED", "\u4EBA\u673A\u9A8C\u8BC1\u672A\u901A\u8FC7\uFF0C\u8BF7\u91CD\u8BD5");
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");
        const role = body.role;
        const name = String(body.name || "").trim();
        if (!EMAIL_RE.test(email)) return fail(res, 400, "VALIDATION", "\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E");
        if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
          return fail(res, 400, "VALIDATION", "\u5BC6\u7801\u81F3\u5C11 8 \u4F4D\uFF0C\u4E14\u9700\u540C\u65F6\u5305\u542B\u5B57\u6BCD\u548C\u6570\u5B57");
        }
        if (!["buyer", "seller"].includes(role)) return fail(res, 400, "VALIDATION", "\u89D2\u8272\u5FC5\u987B\u662F buyer \u6216 seller");
        if (!name || name.length > 80) return fail(res, 400, "VALIDATION", "\u59D3\u540D\u4E3A\u5FC5\u586B\u4E14\u4E0D\u8D85\u8FC7 80 \u5B57\u7B26");
        const companyData = role === "seller" ? {
          name: String(body.companyName || "").trim(),
          country: String(body.country || "").trim(),
          city: String(body.city || "").trim(),
          licenseNo: String(body.licenseNo || "").trim(),
          registrationNo: String(body.registrationNo || "").trim(),
          website: String(body.companyWebsite || "").trim(),
          contact: String(body.contact || "").trim(),
          businessScope: String(body.businessScope || "").trim()
        } : null;
        if (companyData && (!companyData.name || !companyData.country)) {
          return fail(res, 400, "VALIDATION", "\u5356\u5BB6\u6CE8\u518C\u9700\u586B\u5199\u771F\u5B9E\u516C\u53F8/\u5DE5\u5382\u540D\u79F0\u4E0E\u6240\u5728\u56FD\u5BB6");
        }
        if (await get("SELECT id FROM users WHERE email = ?", email)) {
          return fail(res, 409, "EMAIL_EXISTS", "\u90AE\u7BB1\u5DF2\u5B58\u5728");
        }
        const id = randomUUID();
        await run(
          "INSERT INTO users (id, email, password_hash, role, name, status, email_verified, created_at) VALUES (?,?,?,?,?,?,?,?)",
          id,
          email,
          await hashPassword(password),
          role,
          name,
          "active",
          0,
          Date.now()
        );
        if (companyData) {
          await run(
            "INSERT INTO companies (id, user_id, name, country, city, license_no, registration_no, website, contact, business_scope, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            randomUUID(),
            id,
            companyData.name,
            companyData.country,
            companyData.city,
            companyData.licenseNo,
            companyData.registrationNo,
            companyData.website,
            companyData.contact,
            companyData.businessScope,
            "pending",
            Date.now()
          );
        }
        const u = await get("SELECT * FROM users WHERE id = ?", id);
        await audit(id, "auth.register", "user", id, email);
        await sendVerifyEmail(id, email);
        return send2(res, 201, { user: publicUser(u), emailVerified: false, message: "\u6CE8\u518C\u6210\u529F\uFF0C\u8BF7\u67E5\u6536\u90AE\u7BB1\u5B8C\u6210\u9A8C\u8BC1\uFF0824 \u5C0F\u65F6\u5185\u6709\u6548\uFF09" });
      }
      if (m === "POST" && b === "login") {
        const ip = req.socket.remoteAddress || "unknown";
        if (loginRateLimit(ip) > LOGIN_LIMIT) return fail(res, 429, "TOO_MANY_ATTEMPTS", "\u5C1D\u8BD5\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5");
        const body = await readBody(req);
        const email = String(body.email || "").trim().toLowerCase();
        const u = await get("SELECT * FROM users WHERE email = ?", email);
        if (!u || !await verifyPassword(body.password, u.password_hash)) {
          return fail(res, 401, "INVALID_CREDENTIALS", "\u8D26\u53F7\u6216\u5BC6\u7801\u9519\u8BEF");
        }
        if (u.status === "frozen") return fail(res, 401, "ACCOUNT_FROZEN", "\u8D26\u53F7\u5DF2\u88AB\u51BB\u7ED3");
        if (!u.email_verified) return fail(res, 403, "VERIFY_EMAIL_REQUIRED", "\u8BF7\u5148\u9A8C\u8BC1\u90AE\u7BB1\u518D\u767B\u5F55");
        await run("UPDATE users SET last_login_at = ? WHERE id = ?", Date.now(), u.id);
        return send2(res, 200, { token: await signToken({ uid: u.id, role: u.role }), user: publicUser(u) });
      }
      if (m === "POST" && b === "verify-email") {
        const body = await readBody(req);
        const token = String(body.token || "").trim();
        if (!token) return fail(res, 400, "VALIDATION", "\u7F3A\u5C11\u9A8C\u8BC1\u4EE4\u724C");
        const row = await get("SELECT * FROM email_tokens WHERE token_hash = ? AND purpose = ?", await sha256(token), "verify_email");
        if (!row || row.used_at) return fail(res, 400, "INVALID_TOKEN", "\u9A8C\u8BC1\u94FE\u63A5\u65E0\u6548\u6216\u5DF2\u4F7F\u7528");
        if (row.expires_at < Date.now()) return fail(res, 400, "TOKEN_EXPIRED", "\u9A8C\u8BC1\u94FE\u63A5\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u53D1\u9001");
        await run("UPDATE email_tokens SET used_at = ? WHERE id = ?", Date.now(), row.id);
        await run("UPDATE users SET email_verified = 1 WHERE id = ?", row.user_id);
        await audit(row.user_id, "auth.verify-email", "user", row.user_id, "");
        const u = await get("SELECT * FROM users WHERE id = ?", row.user_id);
        return send2(res, 200, { ok: true, user: publicUser(u) });
      }
      if (m === "POST" && b === "resend-verification") {
        const ip = req.socket.remoteAddress || "unknown";
        if (await registerRateLimit(ip) > 3) return fail(res, 429, "TOO_MANY_ATTEMPTS", "\u53D1\u9001\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5");
        const body = await readBody(req);
        const email = String(body.email || "").trim().toLowerCase();
        const u = await get("SELECT * FROM users WHERE email = ?", email);
        if (u && !u.email_verified) await sendVerifyEmail(u.id, u.email);
        return send2(res, 200, { ok: true, message: "\u5982\u8BE5\u90AE\u7BB1\u5DF2\u6CE8\u518C\u4E14\u672A\u9A8C\u8BC1\uFF0C\u9A8C\u8BC1\u90AE\u4EF6\u5DF2\u91CD\u65B0\u53D1\u9001" });
      }
      if (m === "POST" && b === "refresh") {
        const u = await requireAuth(res, req);
        if (!u) return;
        return send2(res, 200, { token: await signToken({ uid: u.id, role: u.role }) });
      }
      if (m === "GET" && b === "me") {
        const u = await requireAuth(res, req);
        if (!u) return;
        return send2(res, 200, publicUser(u));
      }
      if (m === "POST" && b === "logout") return send2(res, 200, { ok: true });
    }
    if (a === "companies") {
      if (m === "POST" && !b) {
        const u = await requireAuth(res, req, ["seller"]);
        if (!u) return;
        const body = await readBody(req);
        const name = String(body.name || "").trim();
        const country = String(body.country || "").trim();
        if (!name || !country) return fail(res, 400, "VALIDATION", "\u516C\u53F8/\u5DE5\u5382\u540D\u79F0\u4E0E\u6240\u5728\u56FD\u5BB6\u4E3A\u5FC5\u586B");
        const exist = await get("SELECT * FROM companies WHERE user_id = ?", u.id);
        if (exist) {
          await run(
            "UPDATE companies SET name=?, country=?, city=?, license_no=?, registration_no=?, website=?, contact=?, business_scope=?, status=?, reject_reason=NULL WHERE id=?",
            name,
            country,
            String(body.city || "").trim(),
            String(body.licenseNo || "").trim(),
            String(body.registrationNo || "").trim(),
            String(body.website || "").trim(),
            String(body.contact || "").trim(),
            String(body.businessScope || "").trim(),
            "pending",
            exist.id
          );
          await audit(u.id, "company.apply", "company", exist.id, name);
          return send2(res, 200, await get("SELECT * FROM companies WHERE id = ?", exist.id));
        }
        const id = randomUUID();
        await run(
          "INSERT INTO companies (id, user_id, name, country, city, license_no, registration_no, website, contact, business_scope, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          id,
          u.id,
          name,
          country,
          String(body.city || "").trim(),
          String(body.licenseNo || "").trim(),
          String(body.registrationNo || "").trim(),
          String(body.website || "").trim(),
          String(body.contact || "").trim(),
          String(body.businessScope || "").trim(),
          "pending",
          Date.now()
        );
        await audit(u.id, "company.apply", "company", id, name);
        return send2(res, 201, await get("SELECT * FROM companies WHERE id = ?", id));
      }
      if (b === "mine" && m === "GET") {
        const u = await requireAuth(res, req, ["seller"]);
        if (!u) return;
        return send2(res, 200, await get("SELECT * FROM companies WHERE user_id = ?", u.id) || null);
      }
      if (!b && m === "GET") {
        const u = await requireAuth(res, req, ["admin"]);
        if (!u) return;
        const status = q.get("status") || "";
        let rows = await all("SELECT * FROM companies ORDER BY created_at DESC");
        if (status) rows = rows.filter((co) => co.status === status);
        return send2(res, 200, paginate(rows, q));
      }
      if (b && c === "verify" && m === "PUT") {
        const u = await requireAuth(res, req, ["admin"]);
        if (!u) return;
        const body = await readBody(req);
        const co = await get("SELECT * FROM companies WHERE user_id = ?", b);
        if (!co) return fail(res, 404, "NOT_FOUND", "\u4F01\u4E1A\u4E0D\u5B58\u5728");
        if (body.action === "approve") {
          await run("UPDATE companies SET status = ?, verified_at = ?, reject_reason = NULL WHERE id = ?", "approved", Date.now(), co.id);
          await audit(u.id, "company.approve", "company", co.id, co.name);
          const owner = await get("SELECT * FROM users WHERE id = ?", co.user_id);
          if (owner) await notifyUser(owner.id, "company", "\u4F01\u4E1A\u8BA4\u8BC1\u5DF2\u901A\u8FC7", "\u60A8\u7684\u516C\u53F8/\u5DE5\u5382\u8D44\u6599\u5DF2\u5BA1\u6838\u901A\u8FC7\uFF0C\u73B0\u5728\u53EF\u4EE5\u53D1\u5E03\u4EA7\u54C1\u3002");
          return send2(res, 200, await get("SELECT * FROM companies WHERE id = ?", co.id));
        }
        if (body.action === "reject") {
          const reason = String(body.reason || "\u8D44\u6599\u672A\u901A\u8FC7\u5BA1\u6838").slice(0, 300);
          await run("UPDATE companies SET status = ?, reject_reason = ?, verified_at = NULL WHERE id = ?", "rejected", reason, co.id);
          await audit(u.id, "company.reject", "company", co.id, reason);
          const owner = await get("SELECT * FROM users WHERE id = ?", co.user_id);
          if (owner) await notifyUser(owner.id, "company", "\u4F01\u4E1A\u8BA4\u8BC1\u672A\u901A\u8FC7", "\u539F\u56E0\uFF1A" + reason + "\u3002\u8BF7\u4FEE\u6B63\u8D44\u6599\u540E\u91CD\u65B0\u63D0\u4EA4\u3002");
          return send2(res, 200, await get("SELECT * FROM companies WHERE id = ?", co.id));
        }
        return fail(res, 400, "INVALID_ACTION", "action \u5FC5\u987B\u662F approve \u6216 reject");
      }
    }
    if (a === "products") {
      if (m === "GET" && !b) {
        const kw = (q.get("kw") || "").toLowerCase();
        const cat = q.get("cat") || "";
        const origin = q.get("origin") || "";
        const min = q.get("min") != null ? +q.get("min") : null;
        const max = q.get("max") != null ? +q.get("max") : null;
        let list = await all("SELECT * FROM products WHERE status = ?", "on");
        if (cat) list = list.filter((p) => p.category === cat);
        if (origin) list = list.filter((p) => p.country === origin);
        if (min != null || max != null) {
          list = list.filter((p) => (min == null || p.price_max >= min) && (max == null || p.price_min <= max));
        }
        if (kw) {
          const ids = new Set((await all("SELECT product_id FROM product_translations WHERE title LIKE ? OR description LIKE ?", "%" + kw + "%", "%" + kw + "%")).map((r) => r.product_id));
          list = list.filter((p) => ids.has(p.id));
        }
        return send2(res, 200, paginate(await Promise.all(list.map(productView)), q));
      }
      if (m === "POST" && !b) {
        const u = await requireAuth(res, req, ["seller", "admin"]);
        if (!u) return;
        if (u.role === "seller") {
          const co = await get("SELECT * FROM companies WHERE user_id = ?", u.id);
          if (!co || co.status !== "approved") {
            return fail(res, 403, "COMPANY_NOT_VERIFIED", "\u8BF7\u5148\u63D0\u4EA4\u516C\u53F8/\u5DE5\u5382\u8D44\u6599\u5E76\u901A\u8FC7\u5E73\u53F0\u5BA1\u6838\u540E\u518D\u53D1\u5E03\u4EA7\u54C1");
          }
        }
        const body = await readBody(req);
        const trs = body.translations || {};
        if (!body.category || !body.country || !trs.en || !trs.zh) {
          return fail(res, 400, "VALIDATION", "category/country/translations(en,zh) \u4E3A\u5FC5\u586B");
        }
        const id = randomUUID();
        const now = Date.now();
        const company = await get("SELECT id FROM companies WHERE user_id = ?", u.id);
        const priceMin = toNum(body.priceMin, 0);
        const priceMax = toNum(body.priceMax, 0);
        const moq = Math.max(1, Math.round(toNum(body.moq, 1)));
        const leadTime = Math.max(1, Math.round(toNum(body.leadTime, 15)));
        if (!(priceMin >= 0) || !(priceMax >= priceMin)) {
          return fail(res, 400, "VALIDATION", "\u4EF7\u683C\u533A\u95F4\u4E0D\u5408\u6CD5");
        }
        await run(
          "INSERT INTO products (id, seller_id, company_id, category, sub, hs_code, country, price_min, price_max, moq, unit, lead_time, terms, certs, src_lang, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          id,
          u.id,
          company ? company.id : null,
          body.category,
          String(body.sub || "").slice(0, 40),
          body.hsCode || "",
          body.country,
          priceMin,
          priceMax,
          moq,
          body.unit || "pcs",
          leadTime,
          JSON.stringify(body.terms || []),
          JSON.stringify(body.certs || []),
          body.srcLang || "en",
          "pending",
          now,
          now
        );
        for (const lang of Object.keys(trs)) {
          await run(
            "INSERT INTO product_translations (id, product_id, lang, title, description, features, updated_at) VALUES (?,?,?,?,?,?,?)",
            randomUUID(),
            id,
            lang,
            trs[lang].title || "",
            trs[lang].description || "",
            JSON.stringify(trs[lang].features || []),
            now
          );
        }
        const enTitle = trs.en && trs.en.title || "";
        await run(
          "INSERT INTO anti_fake_codes (id, product_id, code, batch_no, status, issued_at, verify_count) VALUES (?,?,?,?,?,?,?)",
          randomUUID(),
          id,
          antiFakeCode(id, u.id, enTitle),
          "B" + (/* @__PURE__ */ new Date()).getFullYear(),
          "active",
          now,
          0
        );
        await audit(u.id, "product.create", "product", id, enTitle);
        return send2(res, 201, await productView(await get("SELECT * FROM products WHERE id = ?", id)));
      }
      if (b && m === "GET") {
        const p = await get("SELECT * FROM products WHERE id = ?", b);
        if (!p) return fail(res, 404, "NOT_FOUND", "\u4EA7\u54C1\u4E0D\u5B58\u5728");
        return send2(res, 200, await productView(p));
      }
      if (b && c === "review" && m === "POST") {
        const u = await requireAuth(res, req, ["admin"]);
        if (!u) return;
        const body = await readBody(req);
        const p = await get("SELECT * FROM products WHERE id = ?", b);
        if (!p) return fail(res, 404, "NOT_FOUND", "\u4EA7\u54C1\u4E0D\u5B58\u5728");
        if (body.action === "approve") {
          await run("UPDATE products SET status = ?, reject_reason = NULL, updated_at = ? WHERE id = ?", "on", Date.now(), b);
          await audit(u.id, "product.approve", "product", b, p.id);
        } else if (body.action === "reject") {
          await run("UPDATE products SET status = ?, reject_reason = ?, updated_at = ? WHERE id = ?", "rejected", String(body.reason || "\u9A73\u56DE"), Date.now(), b);
          await audit(u.id, "product.reject", "product", b, String(body.reason || ""));
        } else {
          return fail(res, 400, "INVALID_ACTION", "action \u5FC5\u987B\u662F approve \u6216 reject");
        }
        return send2(res, 200, await productView(await get("SELECT * FROM products WHERE id = ?", b)));
      }
      if (b && c === "status" && m === "POST") {
        const u = await requireAuth(res, req);
        if (!u) return;
        const p = await get("SELECT * FROM products WHERE id = ?", b);
        if (!p) return fail(res, 404, "NOT_FOUND", "\u4EA7\u54C1\u4E0D\u5B58\u5728");
        if (p.seller_id !== u.id && u.role !== "admin") return fail(res, 403, "FORBIDDEN", "\u53EA\u80FD\u64CD\u4F5C\u81EA\u5DF1\u7684\u4EA7\u54C1");
        const body = await readBody(req);
        if (!["on", "off"].includes(body.status)) return fail(res, 400, "INVALID_STATUS", "status \u5FC5\u987B\u662F on \u6216 off");
        await run("UPDATE products SET status = ?, updated_at = ? WHERE id = ?", body.status, Date.now(), b);
        await audit(u.id, "product.status", "product", b, body.status);
        return send2(res, 200, await productView(await get("SELECT * FROM products WHERE id = ?", b)));
      }
      if (b && m === "PUT") {
        const u = await requireAuth(res, req);
        if (!u) return;
        const p = await get("SELECT * FROM products WHERE id = ?", b);
        if (!p) return fail(res, 404, "NOT_FOUND", "\u4EA7\u54C1\u4E0D\u5B58\u5728");
        if (p.seller_id !== u.id && u.role !== "admin") return fail(res, 403, "FORBIDDEN", "\u53EA\u80FD\u7F16\u8F91\u81EA\u5DF1\u7684\u4EA7\u54C1");
        const body = await readBody(req);
        const priceMin = body.priceMin != null ? toNum(body.priceMin, p.price_min) : p.price_min;
        const priceMax = body.priceMax != null ? toNum(body.priceMax, p.price_max) : p.price_max;
        const moq = body.moq != null ? Math.max(1, Math.round(toNum(body.moq, p.moq))) : p.moq;
        const leadTime = body.leadTime != null ? Math.max(1, Math.round(toNum(body.leadTime, p.lead_time))) : p.lead_time;
        if (!(priceMin >= 0) || !(priceMax >= priceMin)) {
          return fail(res, 400, "VALIDATION", "\u4EF7\u683C\u533A\u95F4\u4E0D\u5408\u6CD5");
        }
        await run(
          "UPDATE products SET category = ?, sub = ?, hs_code = ?, country = ?, price_min = ?, price_max = ?, moq = ?, unit = ?, lead_time = ?, terms = ?, certs = ?, src_lang = ?, status = ?, updated_at = ? WHERE id = ?",
          body.category || p.category,
          body.sub != null ? String(body.sub).slice(0, 40) : p.sub,
          body.hsCode != null ? body.hsCode : p.hs_code,
          body.country || p.country,
          priceMin,
          priceMax,
          moq,
          body.unit || p.unit,
          leadTime,
          JSON.stringify(body.terms || safeJson(p.terms, [])),
          JSON.stringify(body.certs || safeJson(p.certs, [])),
          body.srcLang || p.src_lang,
          "pending",
          Date.now(),
          b
        );
        if (body.translations) {
          for (const lang of Object.keys(body.translations)) {
            const tr = body.translations[lang];
            const exists = await get("SELECT id FROM product_translations WHERE product_id = ? AND lang = ?", b, lang);
            if (exists) {
              await run(
                "UPDATE product_translations SET title = ?, description = ?, features = ?, updated_at = ? WHERE id = ?",
                tr.title || "",
                tr.description || "",
                JSON.stringify(tr.features || []),
                Date.now(),
                exists.id
              );
            } else {
              await run(
                "INSERT INTO product_translations (id, product_id, lang, title, description, features, updated_at) VALUES (?,?,?,?,?,?,?)",
                randomUUID(),
                b,
                lang,
                tr.title || "",
                tr.description || "",
                JSON.stringify(tr.features || []),
                Date.now()
              );
            }
          }
        }
        await audit(u.id, "product.update", "product", b, "");
        return send2(res, 200, await productView(await get("SELECT * FROM products WHERE id = ?", b)));
      }
    }
    if (a === "inquiries") {
      if (m === "GET" && !b) {
        const u = await requireAuth(res, req);
        if (!u) return;
        let rows;
        if (u.role === "seller") {
          rows = await all("SELECT i.* FROM inquiries i JOIN products p ON p.id = i.product_id WHERE p.seller_id = ? ORDER BY i.created_at DESC", u.id);
        } else if (u.role === "admin") {
          rows = await all("SELECT * FROM inquiries ORDER BY created_at DESC");
        } else {
          rows = await all("SELECT * FROM inquiries WHERE buyer_id = ? ORDER BY created_at DESC", u.id);
        }
        return send2(res, 200, rows);
      }
      if (m === "POST" && !b) {
        const body = await readBody(req);
        const u = await currentUser(req);
        const p = body.productId ? await get("SELECT * FROM products WHERE id = ?", body.productId) : null;
        const qty = toNum(body.qty, 0);
        if (!p || !(qty >= 1) || !body.message) return fail(res, 400, "VALIDATION", "productId/qty/message \u4E3A\u5FC5\u586B\u4E14 qty \u987B\u4E3A\u6B63\u6574\u6570");
        const id = randomUUID();
        await run(
          "INSERT INTO inquiries (id, product_id, buyer_id, qty, unit, payment_term, message, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
          id,
          p.id,
          u ? u.id : null,
          qty,
          body.unit || "pcs",
          body.payment || null,
          body.message,
          "new",
          Date.now()
        );
        await audit(u ? u.id : null, "inquiry.create", "inquiry", id, body.message.slice(0, 80));
        const seller = await get("SELECT * FROM users WHERE id = ?", p.seller_id);
        if (seller) {
          await notifyUser(seller.id, "inquiry", "\u6536\u5230\u65B0\u8BE2\u76D8", "\u4EA7\u54C1 " + body.productId + " \u6536\u5230\u65B0\u8BE2\u76D8\uFF1A" + String(body.message).slice(0, 120));
          try {
            await sendMail({ to: seller.email, subject: "[BeanBeanMouse] \u6536\u5230\u65B0\u8BE2\u76D8", body: String(body.message) });
          } catch (e2) {
            console.error("\u90AE\u4EF6\u53D1\u9001\u5931\u8D25\uFF08\u4E0D\u5F71\u54CD\u8BE2\u76D8\uFF09:", e2.message);
          }
        }
        return send2(res, 201, await get("SELECT * FROM inquiries WHERE id = ?", id));
      }
      if (b && c === "quote" && m === "POST") {
        const u = await requireAuth(res, req);
        if (!u) return;
        const i = await get("SELECT * FROM inquiries WHERE id = ?", b);
        if (!i) return fail(res, 404, "NOT_FOUND", "\u8BE2\u76D8\u4E0D\u5B58\u5728");
        const p = await get("SELECT * FROM products WHERE id = ?", i.product_id);
        if (p.seller_id !== u.id && u.role !== "admin") return fail(res, 403, "FORBIDDEN", "\u53EA\u80FD\u56DE\u590D\u81EA\u5DF1\u4EA7\u54C1\u7684\u8BE2\u76D8");
        const body = await readBody(req);
        if (body.price == null || !body.incoterm) return fail(res, 400, "VALIDATION", "price/incoterm \u4E3A\u5FC5\u586B");
        const price = toNum(body.price, NaN);
        const validity = Math.max(1, Math.round(toNum(body.validity, 15)));
        const leadTime = Math.max(1, Math.round(toNum(body.leadTime, 15)));
        if (!(price >= 0)) return fail(res, 400, "VALIDATION", "\u62A5\u4EF7\u91D1\u989D\u4E0D\u5408\u6CD5");
        await run(
          "INSERT INTO quotes (id, inquiry_id, price, incoterm, payment_term, validity_days, lead_time, note, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
          randomUUID(),
          b,
          price,
          body.incoterm,
          body.payment || "T/T",
          validity,
          leadTime,
          body.note || null,
          Date.now()
        );
        await run("UPDATE inquiries SET status = ? WHERE id = ?", "quoted", b);
        await audit(u.id, "inquiry.quote", "inquiry", b, String(body.price));
        const buyer = i.buyer_id ? await get("SELECT * FROM users WHERE id = ?", i.buyer_id) : null;
        if (buyer) {
          await notifyUser(buyer.id, "quote", "\u6536\u5230\u4F9B\u5E94\u5546\u62A5\u4EF7", "\u60A8\u7684\u8BE2\u76D8\u5DF2\u6536\u5230\u62A5\u4EF7\uFF1A" + body.incoterm + " " + body.price);
          try {
            await sendMail({ to: buyer.email, subject: "[BeanBeanMouse] \u60A8\u6536\u5230\u65B0\u7684\u62A5\u4EF7", body: "\u8BE2\u76D8 " + b + " \u7684\u65B0\u62A5\u4EF7\uFF1A" + body.incoterm + " " + body.price });
          } catch (e2) {
            console.error("\u90AE\u4EF6\u53D1\u9001\u5931\u8D25\uFF08\u4E0D\u5F71\u54CD\u62A5\u4EF7\uFF09:", e2.message);
          }
        }
        return send2(res, 200, await get("SELECT * FROM inquiries WHERE id = ?", b));
      }
    }
    if (a === "orders") {
      if (m === "POST" && !b) {
        const u = await requireAuth(res, req, ["buyer", "admin"]);
        if (!u) return;
        const body = await readBody(req);
        const inq = await get("SELECT * FROM inquiries WHERE id = ?", body.inquiryId);
        if (!inq) return fail(res, 404, "NOT_FOUND", "\u8BE2\u76D8\u4E0D\u5B58\u5728");
        const product = await get("SELECT * FROM products WHERE id = ?", inq.product_id);
        if (!product) return fail(res, 404, "NOT_FOUND", "\u4EA7\u54C1\u4E0D\u5B58\u5728");
        if (u.role !== "admin" && inq.buyer_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u53EA\u80FD\u57FA\u4E8E\u81EA\u5DF1\u7684\u8BE2\u76D8\u521B\u5EFA\u8BA2\u5355");
        const quote = await get("SELECT * FROM quotes WHERE inquiry_id = ? ORDER BY created_at DESC", inq.id);
        const total = body.total != null ? Number(body.total) : quote ? Number(quote.price) : NaN;
        if (!(total > 0)) return fail(res, 400, "VALIDATION", "\u9700\u8981\u6709\u6548\u7684\u6210\u4EA4\u91D1\u989D\uFF08\u8BF7\u5148\u62A5\u4EF7\u6216\u4F20\u5165 total\uFF09");
        const id = randomUUID();
        await run(
          "INSERT INTO orders (id, inquiry_id, quote_id, buyer_id, seller_id, status, total, currency, updated_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
          id,
          inq.id,
          quote ? quote.id : null,
          inq.buyer_id,
          product.seller_id,
          "created",
          total,
          body.currency || "USD",
          Date.now(),
          Date.now()
        );
        await audit(u.id, "order.create", "order", id, String(total));
        const seller = await get("SELECT * FROM users WHERE id = ?", product.seller_id);
        if (seller) await notifyUser(seller.id, "order", "\u6536\u5230\u65B0\u8BA2\u5355", "\u8BA2\u5355\u91D1\u989D " + (body.currency || "USD") + " " + total);
        await addEvidence(id, u.id, "order_create", id, { total, currency: body.currency || "USD", inquiryId: inq.id });
        return send2(res, 201, await orderView(await get("SELECT * FROM orders WHERE id = ?", id)));
      }
      if (!b && m === "GET") {
        const u = await requireAuth(res, req);
        if (!u) return;
        let rows;
        if (u.role === "admin") rows = await all("SELECT * FROM orders ORDER BY created_at DESC");
        else rows = await all("SELECT * FROM orders WHERE buyer_id = ? OR seller_id = ? ORDER BY created_at DESC", u.id, u.id);
        return send2(res, 200, paginate(rows, q));
      }
      if (b && !c && m === "GET") {
        const u = await requireAuth(res, req);
        if (!u) return;
        const o = await get("SELECT * FROM orders WHERE id = ?", b);
        if (!o) return fail(res, 404, "NOT_FOUND", "\u8BA2\u5355\u4E0D\u5B58\u5728");
        if (u.role !== "admin" && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u65E0\u6743\u67E5\u770B\u8BE5\u8BA2\u5355");
        return send2(res, 200, await orderView(o));
      }
      if (b && c === "confirm-receipt" && m === "POST") {
        const u = await requireAuth(res, req, ["buyer", "admin"]);
        if (!u) return;
        const o = await get("SELECT * FROM orders WHERE id = ?", b);
        if (!o) return fail(res, 404, "NOT_FOUND", "\u8BA2\u5355\u4E0D\u5B58\u5728");
        if (u.role !== "admin" && o.buyer_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u53EA\u6709\u4E70\u5BB6\u53EF\u4EE5\u786E\u8BA4\u7B7E\u6536");
        if (o.status !== "created") return fail(res, 400, "INVALID_STATUS", "\u8BA2\u5355\u5F53\u524D\u72B6\u6001\u4E0D\u53EF\u786E\u8BA4\u7B7E\u6536");
        await run("UPDATE orders SET status = ?, receipt_confirmed_at = ?, updated_at = ? WHERE id = ?", "complete", Date.now(), Date.now(), b);
        await audit(u.id, "order.receipt", "order", b, "\u4EA4\u6613\u8FBE\u6210");
        await addEvidence(b, u.id, "receipt_confirmed", b, { status: "complete" });
        const seller = await get("SELECT * FROM users WHERE id = ?", o.seller_id);
        if (seller) await notifyUser(seller.id, "order", "\u4E70\u5BB6\u5DF2\u786E\u8BA4\u7B7E\u6536", "\u8BA2\u5355 " + b + " \u4EA4\u6613\u8FBE\u6210\u3002");
        return send2(res, 200, await orderView(await get("SELECT * FROM orders WHERE id = ?", b)));
      }
      if (b && c === "cancel" && m === "POST") {
        const u = await requireAuth(res, req);
        if (!u) return;
        const o = await get("SELECT * FROM orders WHERE id = ?", b);
        if (!o) return fail(res, 404, "NOT_FOUND", "\u8BA2\u5355\u4E0D\u5B58\u5728");
        if (u.role !== "admin" && o.buyer_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u53EA\u6709\u4E70\u5BB6\u53EF\u4EE5\u53D6\u6D88\u8BA2\u5355");
        if (o.status !== "created") return fail(res, 400, "INVALID_STATUS", "\u8BA2\u5355\u5F53\u524D\u72B6\u6001\u4E0D\u53EF\u53D6\u6D88");
        await run("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?", "cancelled", Date.now(), b);
        await audit(u.id, "order.cancel", "order", b, "");
        return send2(res, 200, await orderView(await get("SELECT * FROM orders WHERE id = ?", b)));
      }
      if (b && c === "tips" && !d && m === "POST") {
        const u = await requireAuth(res, req);
        if (!u) return;
        const o = await get("SELECT * FROM orders WHERE id = ?", b);
        if (!o) return fail(res, 404, "NOT_FOUND", "\u8BA2\u5355\u4E0D\u5B58\u5728");
        if (u.role !== "admin" && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u65E0\u6743\u64CD\u4F5C\u8BE5\u8BA2\u5355");
        if (o.status !== "complete") return fail(res, 400, "ORDER_NOT_COMPLETE", "\u4EA4\u6613\u8FBE\u6210\u540E\u624D\u80FD\u6253\u8D4F");
        const body = await readBody(req);
        const amount = Number(body.amount);
        if (!(amount > 0) || amount > 1e4) return fail(res, 400, "VALIDATION", "\u6253\u8D4F\u91D1\u989D\u9700\u5728 0 \u5230 10000 \u4E4B\u95F4");
        const to = u.id === o.buyer_id ? o.seller_id : o.buyer_id;
        const id = randomUUID();
        await run(
          "INSERT INTO tips (id, order_id, from_user_id, to_user_id, amount, currency, note, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
          id,
          b,
          u.id,
          to,
          amount,
          o.currency || "USD",
          String(body.note || "").slice(0, 200),
          "active",
          Date.now()
        );
        await audit(u.id, "tip.create", "tip", id, String(amount));
        await addEvidence(b, u.id, "tip_create", id, { amount, currency: o.currency || "USD", note: String(body.note || "").slice(0, 200) });
        const recipient = await get("SELECT * FROM users WHERE id = ?", to);
        if (recipient) await notifyUser(recipient.id, "tip", "\u6536\u5230\u5C0F\u8D39\u6253\u8D4F", "\u8BA2\u5355 " + b + " \u6536\u5230\u6253\u8D4F " + (o.currency || "USD") + " " + amount);
        return send2(res, 201, await get("SELECT * FROM tips WHERE id = ?", id));
      }
      if (b && c === "tips" && !d && m === "GET") {
        const u = await requireAuth(res, req);
        if (!u) return;
        const o = await get("SELECT * FROM orders WHERE id = ?", b);
        if (!o) return fail(res, 404, "NOT_FOUND", "\u8BA2\u5355\u4E0D\u5B58\u5728");
        if (u.role !== "admin" && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u65E0\u6743\u67E5\u770B\u8BE5\u8BA2\u5355");
        return send2(res, 200, await all("SELECT * FROM tips WHERE order_id = ? ORDER BY created_at DESC", b));
      }
      if (b && c === "tips" && d && e === "cancel" && m === "POST") {
        const u = await requireAuth(res, req);
        if (!u) return;
        const tip = await get("SELECT * FROM tips WHERE id = ?", d);
        if (!tip) return fail(res, 404, "NOT_FOUND", "\u6253\u8D4F\u8BB0\u5F55\u4E0D\u5B58\u5728");
        if (u.role !== "admin" && tip.from_user_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u53EA\u6709\u6253\u8D4F\u65B9\u53EF\u53D6\u6D88");
        if (tip.status !== "active") return fail(res, 400, "INVALID_STATUS", "\u8BE5\u6253\u8D4F\u5DF2\u4E0D\u53EF\u53D6\u6D88");
        await run("UPDATE tips SET status = ?, cancelled_at = ? WHERE id = ?", "cancelled", Date.now(), d);
        await audit(u.id, "tip.cancel", "tip", d, "");
        await addEvidence(b, u.id, "tip_cancel", d, {});
        return send2(res, 200, await get("SELECT * FROM tips WHERE id = ?", d));
      }
      if (b && c === "shipments" && !d && m === "POST") {
        const u = await requireAuth(res, req, ["seller", "admin"]);
        if (!u) return;
        const o = await get("SELECT * FROM orders WHERE id = ?", b);
        if (!o) return fail(res, 404, "NOT_FOUND", "\u8BA2\u5355\u4E0D\u5B58\u5728");
        if (u.role !== "admin" && o.seller_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u53EA\u6709\u5356\u5BB6\u53EF\u4EE5\u521B\u5EFA\u7269\u6D41\u5355");
        if (o.status !== "created" && o.status !== "complete") return fail(res, 400, "INVALID_STATUS", "\u8BA2\u5355\u5F53\u524D\u72B6\u6001\u4E0D\u53EF\u521B\u5EFA\u7269\u6D41\u5355");
        const body = await readBody(req);
        const sid = randomUUID();
        const now = Date.now();
        const origin = String(body.origin || "").slice(0, 120);
        const destination = String(body.destination || "").slice(0, 120);
        const mode = ["land", "sea", "air"].includes(body.mode) ? body.mode : "land";
        await run(
          "INSERT INTO shipments (id, order_id, carrier, tracking_no, mode, status, origin, destination, current_location, etd, eta, remark, created_by, updated_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          sid,
          b,
          String(body.carrier || "").slice(0, 80),
          String(body.trackingNo || "").slice(0, 80),
          mode,
          "processing",
          origin,
          destination,
          origin,
          body.etd || null,
          body.eta || null,
          String(body.remark || "").slice(0, 500),
          u.id,
          now,
          now
        );
        await run(
          "INSERT INTO shipment_events (id, shipment_id, status, location, note, event_time, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)",
          randomUUID(),
          sid,
          "processing",
          origin,
          "\u7269\u6D41\u5355\u5DF2\u521B\u5EFA\uFF0C\u7B49\u5F85\u5356\u5BB6\u53D1\u8D27",
          now,
          u.id,
          now
        );
        await audit(u.id, "shipment.create", "shipment", sid, "order=" + b);
        await addEvidence(b, u.id, "shipment_create", sid, { carrier: String(body.carrier || ""), trackingNo: String(body.trackingNo || "") });
        const buyer = o.buyer_id ? await get("SELECT * FROM users WHERE id = ?", o.buyer_id) : null;
        if (buyer) await notifyUser(buyer.id, "shipment", "\u7269\u6D41\u4FE1\u606F\u5DF2\u521B\u5EFA", "\u8BA2\u5355 " + b + " \u5DF2\u521B\u5EFA\u7269\u6D41\u5355\uFF0C\u53EF\u67E5\u770B\u5B9E\u65F6\u8DDF\u8FDB");
        return send2(res, 201, await shipmentView(await get("SELECT * FROM shipments WHERE id = ?", sid)));
      }
      if (b && c === "shipments" && !d && m === "GET") {
        const u = await requireAuth(res, req);
        if (!u) return;
        const o = await get("SELECT * FROM orders WHERE id = ?", b);
        if (!o) return fail(res, 404, "NOT_FOUND", "\u8BA2\u5355\u4E0D\u5B58\u5728");
        if (u.role !== "admin" && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u65E0\u6743\u67E5\u770B\u8BE5\u8BA2\u5355");
        return send2(res, 200, await Promise.all((await all("SELECT * FROM shipments WHERE order_id = ? ORDER BY created_at ASC", b)).map(shipmentView)));
      }
      if (b && c === "shipments" && d && e === "events" && m === "POST") {
        const u = await requireAuth(res, req, ["seller", "admin"]);
        if (!u) return;
        const s = await get("SELECT * FROM shipments WHERE id = ?", d);
        if (!s) return fail(res, 404, "NOT_FOUND", "\u7269\u6D41\u5355\u4E0D\u5B58\u5728");
        const o = await get("SELECT * FROM orders WHERE id = ?", s.order_id);
        if (u.role !== "admin" && o.seller_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u53EA\u6709\u5356\u5BB6\u53EF\u4EE5\u66F4\u65B0\u7269\u6D41");
        const body = await readBody(req);
        const allowed = ["processing", "packed", "shipped", "in_transit", "customs", "out_for_delivery", "delivered", "exception"];
        const status = String(body.status || "").toLowerCase();
        if (!allowed.includes(status)) return fail(res, 400, "INVALID_STATUS", "status \u4E0D\u5408\u6CD5");
        const now = Date.now();
        const location = String(body.location || s.current_location || "").slice(0, 120);
        await run(
          "INSERT INTO shipment_events (id, shipment_id, status, location, note, event_time, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)",
          randomUUID(),
          d,
          status,
          location,
          String(body.note || "").slice(0, 500),
          body.eventTime || now,
          u.id,
          now
        );
        await run("UPDATE shipments SET status = ?, current_location = ?, updated_at = ? WHERE id = ?", status, location, now, d);
        await audit(u.id, "shipment.event", "shipment", d, status + " @ " + location);
        await addEvidence(s.order_id, u.id, "shipment_event", d, { status, location, note: String(body.note || "").slice(0, 500) });
        return send2(res, 200, await shipmentView(await get("SELECT * FROM shipments WHERE id = ?", d)));
      }
    }
    if (a === "conversations" && c === "messages") {
      if (m === "GET") {
        const u = await requireAuth(res, req);
        if (!u) return;
        const conv = await get("SELECT * FROM conversations WHERE id = ?", b);
        if (conv && conv.buyer_id !== u.id && conv.seller_id !== u.id && u.role !== "admin") {
          return fail(res, 403, "FORBIDDEN", "\u65E0\u6743\u67E5\u770B\u8BE5\u4F1A\u8BDD");
        }
        return send2(res, 200, conv ? await all("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", b) : []);
      }
      if (m === "POST") {
        const u = await requireAuth(res, req);
        if (!u) return;
        const body = await readBody(req);
        if (!body.text) return fail(res, 400, "VALIDATION", "text \u4E3A\u5FC5\u586B");
        let conv = await get("SELECT * FROM conversations WHERE id = ?", b);
        if (!conv) {
          await run("INSERT INTO conversations (id, buyer_id, seller_id, created_at) VALUES (?,?,?,?)", b, u.id, u.id, Date.now());
        }
        const id = randomUUID();
        await run(
          "INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES (?,?,?,?,?)",
          id,
          b,
          u.id,
          body.text,
          Date.now()
        );
        const created = await get("SELECT * FROM messages WHERE id = ?", id);
        wsBroadcast(b, { type: "message", id, conversationId: b, senderId: u.id, text: body.text, createdAt: created.created_at });
        return send2(res, 201, created);
      }
    }
    if (a === "conversations" && c === "read") {
      const u = await requireAuth(res, req);
      if (!u) return;
      const conv = await get("SELECT * FROM conversations WHERE id = ?", b);
      if (conv && conv.buyer_id !== u.id && conv.seller_id !== u.id && u.role !== "admin") {
        return fail(res, 403, "FORBIDDEN", "\u65E0\u6743\u64CD\u4F5C\u8BE5\u4F1A\u8BDD");
      }
      if (m === "GET") {
        const rows = await all("SELECT user_id, last_read_at FROM conversation_reads WHERE conversation_id = ?", b);
        return send2(res, 200, { conversationId: b, readers: rows.map((r) => ({ userId: r.user_id, lastReadAt: r.last_read_at })) });
      }
      if (m === "POST") {
        const body = await readBody(req);
        const lastReadAt = body.lastReadAt ? Number(body.lastReadAt) : Date.now();
        await run(
          "INSERT INTO conversation_reads (conversation_id, user_id, last_read_at) VALUES (?,?,?) ON CONFLICT(conversation_id, user_id) DO UPDATE SET last_read_at = excluded.last_read_at",
          b,
          u.id,
          lastReadAt
        );
        wsBroadcast(b, { type: "read", conversationId: b, userId: u.id, lastReadAt });
        return send2(res, 200, { conversationId: b, userId: u.id, lastReadAt });
      }
    }
    if (a === "translate" && m === "POST") {
      const body = await readBody(req);
      const u = await currentUser(req);
      try {
        const out = await translateText({ userId: u ? u.id : null, text: body.text, target: body.target, source: body.source });
        return send2(res, 200, out);
      } catch (e2) {
        if (e2 && e2.code) return fail(res, e2.status || 400, e2.code, e2.message);
        throw e2;
      }
    }
    if (a === "anti-fake" && b === "verify" && m === "POST") {
      const body = await readBody(req);
      const code = String(body.code || "").trim().toUpperCase();
      const row = await get("SELECT * FROM anti_fake_codes WHERE code = ?", code);
      if (!row || row.status !== "active") return fail(res, 404, "CODE_NOT_FOUND", "\u9632\u4F2A\u7801\u4E0D\u5B58\u5728\u6216\u5DF2\u4F5C\u5E9F");
      await run("UPDATE anti_fake_codes SET last_verified_at = ?, verify_count = verify_count + 1 WHERE id = ?", Date.now(), row.id);
      return send2(res, 200, { genuine: true, code: row.code, productId: row.product_id, verifiedAt: (/* @__PURE__ */ new Date()).toISOString() });
    }
    if (a === "news") {
      if (m === "GET" && !b) {
        const cat = q.get("cat") || "";
        const region = q.get("region") || "";
        let rows = await all(
          "SELECT n.*, s.name AS source_name, s.url AS source_url FROM news_items n LEFT JOIN news_sources s ON s.id = n.source_id WHERE n.status = ?",
          "published"
        );
        if (cat) rows = rows.filter((n) => n.category === cat);
        if (region) rows = rows.filter((n) => n.region === region);
        rows.sort((x, y) => String(y.published_at || "").localeCompare(String(x.published_at || "")));
        const updatedAt = rows.reduce((mx, n) => {
          const t = n.updated_at || Date.parse(n.published_at || "") || 0;
          return Math.max(mx, t);
        }, 0) || Date.now();
        const page = paginate(rows, q);
        return send2(res, 200, { ...page, updatedAt });
      }
      if (b === "sources" && m === "GET") {
        return send2(res, 200, await all("SELECT * FROM news_sources WHERE enabled = 1"));
      }
      if (m === "POST" && !b) {
        const u = await requireAuth(res, req, ["admin"]);
        if (!u) return;
        const body = await readBody(req);
        const title2 = String(body.title || "").trim();
        const url = String(body.url || "").trim();
        if (!title2 || !/^https?:\/\//.test(url)) return fail(res, 400, "VALIDATION", "title \u4E0E\u5408\u6CD5 url \u4E3A\u5FC5\u586B");
        let parsedUrl;
        try {
          parsedUrl = new URL(url);
        } catch (e2) {
          return fail(res, 400, "VALIDATION", "url \u683C\u5F0F\u4E0D\u6B63\u786E");
        }
        const sourceName = String(body.sourceName || "").trim() || parsedUrl.hostname;
        let source = await get("SELECT * FROM news_sources WHERE name = ?", sourceName);
        if (!source) {
          const sid = randomUUID();
          await run(
            "INSERT INTO news_sources (id, name, url, region, category, enabled) VALUES (?,?,?,?,?,?)",
            sid,
            sourceName,
            parsedUrl.origin,
            body.region || "global",
            body.category || "general",
            1
          );
          source = await get("SELECT * FROM news_sources WHERE id = ?", sid);
        }
        const id = randomUUID();
        await run(
          "INSERT INTO news_items (id, source_id, region, category, title_zh, title_en, summary_zh, summary_en, url, published_at, updated_at, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          id,
          source.id,
          body.region || "global",
          body.category || "general",
          body.titleZh || title2,
          body.titleEn || title2,
          body.summaryZh || "",
          body.summaryEn || "",
          url,
          body.publishedAt || (/* @__PURE__ */ new Date()).toISOString(),
          Date.now(),
          "published"
        );
        await audit(u.id, "news.create", "news", id, title2);
        return send2(res, 201, await get("SELECT * FROM news_items WHERE id = ?", id));
      }
      if (b === "auto" && m === "GET") {
        const u = await requireAuth(res, req, ["admin"]);
        if (!u) return;
        return send2(res, 200, newsAutoState);
      }
      if (b === "refresh" && m === "POST") {
        const u = await requireAuth(res, req, ["admin"]);
        if (!u) return;
        return send2(res, 200, await refreshNewsFeeds(u.id));
      }
    }
    if (a === "insurances") {
      await ensureInsuranceProviders();
      if (m === "GET" && b === "providers") {
        return send2(res, 200, await all("SELECT * FROM insurance_providers ORDER BY sort"));
      }
      if (m === "GET" && !b) {
        const u = await requireAuth(res, req);
        if (!u) return;
        return send2(res, 200, await all("SELECT * FROM insurances WHERE user_id = ? ORDER BY created_at DESC", u.id));
      }
      if (m === "POST" && !b) {
        const u = await requireAuth(res, req, ["buyer"]);
        if (!u) return;
        const body = await readBody(req);
        const orderId = String(body.orderId || "").trim();
        const providerId = String(body.providerId || "").trim();
        const tier = String(body.tier || "").trim();
        const order = await get("SELECT * FROM orders WHERE id = ?", orderId);
        if (!order || order.buyer_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u53EA\u80FD\u4E3A\u672C\u4EBA\u8BA2\u5355\u6295\u4FDD");
        if (!["created", "complete"].includes(order.status)) return fail(res, 400, "VALIDATION", "\u5F53\u524D\u8BA2\u5355\u72B6\u6001\u4E0D\u652F\u6301\u6295\u4FDD");
        const exist = await get("SELECT * FROM insurances WHERE order_id = ? AND status = 'active'", orderId);
        if (exist) return fail(res, 400, "DUPLICATE", "\u8BE5\u8BA2\u5355\u5DF2\u6709\u751F\u6548\u4E2D\u7684\u4FDD\u9669");
        const prov = await get("SELECT * FROM insurance_providers WHERE id = ? AND enabled = 1", providerId);
        if (!prov) return fail(res, 404, "NOT_FOUND", "\u4FDD\u9669\u5546\u4E0D\u5B58\u5728\u6216\u6682\u672A\u5F00\u653E");
        const t = safeJson(prov.tiers, {})[tier];
        if (!t) return fail(res, 400, "VALIDATION", "\u65E0\u6548\u7684\u4FDD\u969C\u6863\u4F4D");
        const total = toNum(order.total, 0);
        const premium = Math.max(toNum(t.minPremium, 3), Math.round(total * toNum(t.rate, 0.01) * 100) / 100);
        const id = randomUUID();
        await run(
          "INSERT INTO insurances (id, order_id, user_id, provider_id, provider_name, tier, tier_label, premium, currency, coverage, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
          id,
          orderId,
          u.id,
          prov.id,
          prov.name,
          tier,
          String(t.label || tier),
          premium,
          order.currency || "USD",
          String(t.coverage || ""),
          "active",
          Date.now(),
          Date.now()
        );
        await audit(u.id, "insurance.create", "insurance", id, "order=" + orderId + " tier=" + tier);
        await notifyUser(
          order.seller_id,
          "insurance",
          "\u4E70\u5BB6\u5DF2\u4E3A\u8BA2\u5355\u6295\u4FDD",
          "\u8BA2\u5355 " + orderId + " \u5DF2\u6295\u4FDD\uFF08" + prov.name + " \xB7 " + String(t.label || tier) + "\uFF09\uFF0C\u8BF7\u77E5\u6089\u3002"
        );
        return send2(res, 201, await get("SELECT * FROM insurances WHERE id = ?", id));
      }
      if (m === "GET" && b) {
        const u = await requireAuth(res, req);
        if (!u) return;
        const row = await get("SELECT * FROM insurances WHERE id = ?", b);
        if (!row) return fail(res, 404, "NOT_FOUND", "\u4FDD\u5355\u4E0D\u5B58\u5728");
        const order = await get("SELECT * FROM orders WHERE id = ?", row.order_id);
        if (!order || order.buyer_id !== u.id && order.seller_id !== u.id && u.role !== "admin") {
          return fail(res, 403, "FORBIDDEN", "\u65E0\u6743\u67E5\u770B\u8BE5\u4FDD\u5355");
        }
        return send2(res, 200, row);
      }
      if (m === "POST" && c === "cancel") {
        const u = await requireAuth(res, req, ["buyer"]);
        if (!u) return;
        const row = await get("SELECT * FROM insurances WHERE id = ?", b);
        if (!row || row.user_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u53EA\u80FD\u53D6\u6D88\u672C\u4EBA\u6295\u4FDD");
        if (row.status !== "active") return fail(res, 400, "INVALID_STATUS", "\u4FDD\u5355\u72B6\u6001\u4E0D\u53EF\u53D6\u6D88");
        await run("UPDATE insurances SET status = ?, updated_at = ? WHERE id = ?", "cancelled", Date.now(), b);
        await audit(u.id, "insurance.cancel", "insurance", b, "order=" + row.order_id);
        return send2(res, 200, await get("SELECT * FROM insurances WHERE id = ?", b));
      }
    }
    if (a === "contracts") {
      if (m === "POST" && b === "custody") {
        const u = await requireAuth(res, req);
        if (!u) return;
        const body = await readBody(req);
        const orderId = String(body.orderId || "").trim();
        const draftText = String(body.draftText || "").trim();
        if (!orderId || !draftText) return fail(res, 400, "VALIDATION", "\u8BA2\u5355\u4E0E\u5408\u540C\u6587\u672C\u4E3A\u5FC5\u586B");
        const order = await get("SELECT * FROM orders WHERE id = ?", orderId);
        if (!order || order.buyer_id !== u.id && order.seller_id !== u.id) {
          return fail(res, 403, "FORBIDDEN", "\u4EC5\u8BA2\u5355\u53CC\u65B9\u53EF\u7533\u8BF7\u5408\u540C\u4FDD\u7BA1");
        }
        const exist = await get("SELECT * FROM contract_custodies WHERE order_id = ?", orderId);
        if (exist) return send2(res, 200, exist);
        const id = randomUUID();
        const expiresAt = Date.now() + 30 * 24 * 3600 * 1e3;
        await run(
          "INSERT INTO contract_custodies (id, order_id, user_id, draft_text, contract_hash, status, expires_at, created_at) VALUES (?,?,?,?,?,?,?,?)",
          id,
          orderId,
          u.id,
          draftText,
          await sha256(draftText),
          "active",
          expiresAt,
          Date.now()
        );
        await audit(u.id, "contract.custody", "contract", id, "order=" + orderId + " keep=30d");
        return send2(res, 201, await get("SELECT * FROM contract_custodies WHERE id = ?", id));
      }
      if (m === "GET" && !b) {
        const u = await requireAuth(res, req);
        if (!u) return;
        return send2(res, 200, await all("SELECT * FROM contract_custodies WHERE user_id = ? ORDER BY created_at DESC", u.id));
      }
      if (m === "GET" && b) {
        const u = await requireAuth(res, req);
        if (!u) return;
        const row = await get("SELECT * FROM contract_custodies WHERE id = ?", b);
        if (!row) return fail(res, 404, "NOT_FOUND", "\u4FDD\u7BA1\u8BB0\u5F55\u4E0D\u5B58\u5728");
        const order = await get("SELECT * FROM orders WHERE id = ?", row.order_id);
        if (!order || order.buyer_id !== u.id && order.seller_id !== u.id && u.role !== "admin") {
          return fail(res, 403, "FORBIDDEN", "\u65E0\u6743\u67E5\u770B\u8BE5\u4FDD\u7BA1\u8BB0\u5F55");
        }
        return send2(res, 200, row);
      }
    }
    if (a === "notifications" && m === "GET") {
      const u = await requireAuth(res, req);
      if (!u) return;
      return send2(res, 200, await all("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC", u.id));
    }
    if (a === "category-requests") {
      if (m === "POST" && !b) {
        const u = await requireAuth(res, req);
        if (!u) return;
        const body = await readBody(req);
        const name = String(body.name || "").trim();
        if (!name || name.length > 120) return fail(res, 400, "VALIDATION", "\u54C1\u7C7B\u540D\u79F0\u4E3A\u5FC5\u586B\u4E14\u4E0D\u8D85\u8FC7 120 \u5B57\u7B26");
        const markets = Array.isArray(body.targetMarkets) ? body.targetMarkets.map(String).slice(0, 20) : [];
        const id = randomUUID();
        await run(
          "INSERT INTO category_requests (id, user_id, name, description, target_markets, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
          id,
          u.id,
          name,
          String(body.description || "").slice(0, 1e3),
          JSON.stringify(markets),
          "new",
          Date.now(),
          Date.now()
        );
        await audit(u.id, "category.request", "category_request", id, name);
        return send2(res, 201, await get("SELECT * FROM category_requests WHERE id = ?", id));
      }
      if (!b && m === "GET") {
        const u = await requireAuth(res, req);
        if (!u) return;
        let rows;
        if (u.role === "admin") rows = await all("SELECT * FROM category_requests ORDER BY created_at DESC");
        else rows = await all("SELECT * FROM category_requests WHERE user_id = ? ORDER BY created_at DESC", u.id);
        return send2(res, 200, paginate(rows, q));
      }
      if (b && c === "status" && m === "POST") {
        const u = await requireAuth(res, req, ["admin"]);
        if (!u) return;
        const body = await readBody(req);
        const r = await get("SELECT * FROM category_requests WHERE id = ?", b);
        if (!r) return fail(res, 404, "NOT_FOUND", "\u54C1\u7C7B\u9700\u6C42\u4E0D\u5B58\u5728");
        if (!["invited", "done"].includes(body.status)) return fail(res, 400, "INVALID_STATUS", "status \u5FC5\u987B\u662F invited \u6216 done");
        await run("UPDATE category_requests SET status = ?, note = ?, updated_at = ? WHERE id = ?", body.status, String(body.note || "").slice(0, 300), Date.now(), b);
        await audit(u.id, "category." + body.status, "category_request", b, String(body.note || ""));
        const owner = r.user_id ? await get("SELECT * FROM users WHERE id = ?", r.user_id) : null;
        if (owner) {
          await notifyUser(
            owner.id,
            "category",
            "\u54C1\u7C7B\u9700\u6C42\u6709\u8FDB\u5C55",
            body.status === "invited" ? "\u5E73\u53F0\u6B63\u5728\u4E3A\u60A8\u9080\u8BF7\u8BE5\u54C1\u7C7B\u7684\u4F9B\u5E94\u5546\u5165\u9A7B\u3002" : "\u60A8\u7684\u54C1\u7C7B\u9700\u6C42\u5DF2\u5B8C\u6210\u5904\u7406\u3002"
          );
        }
        return send2(res, 200, await get("SELECT * FROM category_requests WHERE id = ?", b));
      }
    }
    if (a === "files") {
      if (m === "POST") {
        const u = await requireAuth(res, req);
        if (!u) return;
        const ctype = String(req.headers["content-type"] || "");
        let filename = "", mime = "", data = null;
        if (ctype.startsWith("multipart/form-data")) {
          const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ctype);
          if (!boundary) return fail(res, 400, "INVALID_MULTIPART", "\u7F3A\u5C11 boundary");
          const raw = await readRawBody(req);
          const parts = parseMultipart(raw, boundary[1] || boundary[2]);
          const filePart = parts.find((p) => p.filename);
          if (!filePart) return fail(res, 400, "VALIDATION", "\u7F3A\u5C11\u6587\u4EF6\u5B57\u6BB5");
          filename = filePart.filename;
          mime = filePart.contentType;
          data = filePart.content;
        } else {
          const body = await readBody(req);
          if (!body.data || !body.mime) return fail(res, 400, "VALIDATION", "JSON \u4E0A\u4F20\u9700\u8981 data(base64)/mime");
          filename = body.filename || "upload";
          mime = body.mime;
          data = base64ToBytes(body.data);
        }
        const { ext, error: error3 } = validateFile(mime, data);
        if (error3) return fail(res, error3.status, error3.code, error3.message);
        const id = randomUUID();
        const key = id + "." + ext;
        try {
          await putFile(key, data);
        } catch (e2) {
          console.error("[storage] put failed: " + (e2 && e2.message));
          return fail(res, 503, "STORAGE_UNAVAILABLE", "\u6587\u4EF6\u5B58\u50A8\u6682\u4E0D\u53EF\u7528\uFF08\u5BF9\u8C61\u5B58\u50A8\u672A\u542F\u7528\uFF09\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458");
        }
        await run(
          "INSERT INTO files (id, owner_id, bucket_key, mime, size, status, created_at) VALUES (?,?,?,?,?,?,?)",
          id,
          u.id,
          key,
          mime,
          data.length,
          "active",
          Date.now()
        );
        await audit(u.id, "file.upload", "file", id, filename);
        return send2(res, 201, { id, filename, mime, size: data.length, url: "/files/" + id });
      }
      if (b && m === "GET") {
        const row = await get("SELECT * FROM files WHERE id = ?", b);
        if (!row) return fail(res, 404, "NOT_FOUND", "\u6587\u4EF6\u4E0D\u5B58\u5728");
        let buf;
        try {
          buf = await getFile(row.bucket_key);
        } catch (e2) {
          console.error("[storage] get failed: " + (e2 && e2.message));
          return fail(res, 503, "STORAGE_UNAVAILABLE", "\u6587\u4EF6\u5B58\u50A8\u6682\u4E0D\u53EF\u7528");
        }
        if (!buf) return fail(res, 404, "NOT_FOUND", "\u6587\u4EF6\u4E0D\u5B58\u5728");
        const wm = q.get("watermark") ? String(q.get("watermark")).slice(0, 80) : "";
        if (wm && /svg/i.test(row.mime)) buf = watermarkSvg(buf, wm);
        return sendBytes(res, 200, buf, row.mime, { "Content-Disposition": "inline" });
      }
    }
    if (a === "evidence") {
      if (m === "POST" && !b) {
        const u = await requireAuth(res, req);
        if (!u) return;
        const body = await readBody(req);
        const o = await get("SELECT * FROM orders WHERE id = ?", body.orderId);
        if (!o) return fail(res, 404, "NOT_FOUND", "\u8BA2\u5355\u4E0D\u5B58\u5728");
        if (u.role !== "admin" && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u65E0\u6743\u64CD\u4F5C\u8BE5\u8BA2\u5355");
        const kind = String(body.kind || "manual").slice(0, 32);
        const snapshot = typeof body.snapshot === "object" && body.snapshot !== null ? body.snapshot : {};
        const rec = await addEvidence(o.id, u.id, kind, body.refId ? String(body.refId).slice(0, 64) : null, snapshot);
        await audit(u.id, "evidence.create", "evidence", rec.id, kind);
        return send2(res, 201, rec);
      }
      if (m === "GET" && !b) {
        const u = await requireAuth(res, req);
        if (!u) return;
        const orderId = String(q.get("orderId") || "");
        const o = await get("SELECT * FROM orders WHERE id = ?", orderId);
        if (!o) return fail(res, 404, "NOT_FOUND", "\u8BA2\u5355\u4E0D\u5B58\u5728");
        if (u.role !== "admin" && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u65E0\u6743\u67E5\u770B\u8BE5\u8BA2\u5355");
        const items = await all("SELECT * FROM evidence_records WHERE order_id = ? ORDER BY chain_index ASC", orderId);
        const v = await verifyEvidenceChain(orderId);
        return send2(res, 200, { orderId, total: items.length, verified: v.valid, broken: v.broken, items });
      }
      if (b && c === "verify" && m === "POST") {
        const u = await requireAuth(res, req);
        if (!u) return;
        const rec = await get("SELECT * FROM evidence_records WHERE id = ?", b);
        if (!rec) return fail(res, 404, "NOT_FOUND", "\u5B58\u8BC1\u8BB0\u5F55\u4E0D\u5B58\u5728");
        const o = await get("SELECT * FROM orders WHERE id = ?", rec.order_id);
        if (u.role !== "admin" && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u65E0\u6743\u67E5\u770B\u8BE5\u8BA2\u5355");
        const v = await verifyEvidenceChain(rec.order_id);
        return send2(res, 200, { id: rec.id, orderId: rec.order_id, chainValid: v.valid, total: v.total, broken: v.broken });
      }
    }
    if (a === "promotions") {
      if (m === "POST" && !b) {
        const u = await requireAuth(res, req, ["seller", "admin"]);
        if (!u) return;
        const body = await readBody(req);
        const p = await get("SELECT * FROM products WHERE id = ?", body.productId);
        if (!p) return fail(res, 404, "NOT_FOUND", "\u4EA7\u54C1\u4E0D\u5B58\u5728");
        if (u.role !== "admin" && p.seller_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u53EA\u80FD\u63A8\u5E7F\u81EA\u5DF1\u7684\u4EA7\u54C1");
        const days = Math.max(1, Math.min(90, Math.round(toNum(body.days, 7))));
        const id = randomUUID();
        await run(
          "INSERT INTO promotion_requests (id, product_id, seller_id, days, budget, note, status, created_at) VALUES (?,?,?,?,?,?,?,?)",
          id,
          p.id,
          u.id,
          days,
          String(body.budget || "basic").slice(0, 40),
          String(body.note || "").slice(0, 300),
          "pending",
          Date.now()
        );
        await audit(u.id, "promotion.request", "promotion", id, "product=" + p.id);
        return send2(res, 201, await get("SELECT * FROM promotion_requests WHERE id = ?", id));
      }
      if (m === "GET" && !b) {
        const u = await requireAuth(res, req, ["seller", "admin"]);
        if (!u) return;
        const rows = u.role === "admin" ? await all("SELECT * FROM promotion_requests ORDER BY created_at DESC") : await all("SELECT * FROM promotion_requests WHERE seller_id = ? ORDER BY created_at DESC", u.id);
        return send2(res, 200, paginate(rows, q));
      }
      if (b && c === "review" && m === "POST") {
        const u = await requireAuth(res, req, ["admin"]);
        if (!u) return;
        const body = await readBody(req);
        const pr = await get("SELECT * FROM promotion_requests WHERE id = ?", b);
        if (!pr) return fail(res, 404, "NOT_FOUND", "\u63A8\u5E7F\u7533\u8BF7\u4E0D\u5B58\u5728");
        if (body.action === "approve") {
          await run("UPDATE promotion_requests SET status = ?, reject_reason = NULL, reviewed_at = ? WHERE id = ?", "approved", Date.now(), b);
          await audit(u.id, "promotion.approve", "promotion", b, "");
        } else if (body.action === "reject") {
          await run("UPDATE promotion_requests SET status = ?, reject_reason = ?, reviewed_at = ? WHERE id = ?", "rejected", String(body.reason || "\u4E0D\u7B26\u5408\u63A8\u5E7F\u8981\u6C42").slice(0, 300), Date.now(), b);
          await audit(u.id, "promotion.reject", "promotion", b, String(body.reason || ""));
        } else {
          return fail(res, 400, "INVALID_ACTION", "action \u5FC5\u987B\u662F approve \u6216 reject");
        }
        return send2(res, 200, await get("SELECT * FROM promotion_requests WHERE id = ?", b));
      }
    }
    if (a === "admin") {
      if (b === "overview" && m === "GET") {
        const u = await requireAuth(res, req, ["admin"]);
        if (!u) return;
        return send2(res, 200, {
          products: (await get("SELECT COUNT(*) AS c FROM products")).c,
          pendingReviews: (await get("SELECT COUNT(*) AS c FROM products WHERE status = ?", "pending")).c,
          inquiries: (await get("SELECT COUNT(*) AS c FROM inquiries")).c,
          users: (await get("SELECT COUNT(*) AS c FROM users")).c,
          companies: (await get("SELECT COUNT(*) AS c FROM companies")).c,
          pendingCompanies: (await get("SELECT COUNT(*) AS c FROM companies WHERE status = ?", "pending")).c,
          orders: (await get("SELECT COUNT(*) AS c FROM orders")).c,
          tips: (await get("SELECT COUNT(*) AS c FROM tips WHERE status = ?", "active")).c,
          evidence: (await get("SELECT COUNT(*) AS c FROM evidence_records")).c,
          shipments: (await get("SELECT COUNT(*) AS c FROM shipments")).c,
          pendingPromotions: (await get("SELECT COUNT(*) AS c FROM promotion_requests WHERE status = ?", "pending")).c,
          categoryRequests: (await get("SELECT COUNT(*) AS c FROM category_requests")).c,
          insurances: (await get("SELECT COUNT(*) AS c FROM insurances")).c,
          contracts: (await get("SELECT COUNT(*) AS c FROM contract_custodies")).c
        });
      }
      if (b === "logs" && m === "GET") {
        const u = await requireAuth(res, req, ["admin"]);
        if (!u) return;
        return send2(res, 200, paginate(await all("SELECT * FROM audit_logs ORDER BY created_at DESC"), q));
      }
    }
    if (a === "profile") {
      const u = await requireAuth(res, req);
      if (!u) return;
      const p = await get("SELECT * FROM profiles WHERE user_id = ?", u.id) || null;
      if (m === "GET") {
        const fields = {
          name: u.name || "",
          accountType: p ? p.account_type : "company",
          jobTitle: p ? p.job_title : "",
          company: p ? p.company : "",
          country: p ? p.country : "",
          contact: p ? p.contact : u.email || "",
          bio: p ? p.bio : "",
          bizName: p ? p.biz_name : ""
        };
        const keys = ["name", "accountType", "jobTitle", "company", "country", "contact", "bio"];
        const completeness = Math.round(keys.filter((k) => String(fields[k] || "").trim()).length / keys.length * 100);
        return send2(res, 200, { userId: u.id, fields, card: p ? p.business_card : "", cardName: p ? p.business_card_name : "", completeness });
      }
      if (m === "PUT") {
        const body = await readBody(req);
        const accountType = body.accountType === "individual" ? "individual" : p ? p.account_type : "company";
        const vals = {
          account_type: accountType,
          job_title: String(body.jobTitle != null ? body.jobTitle : p ? p.job_title : "").slice(0, 120),
          company: String(body.company != null ? body.company : p ? p.company : "").slice(0, 200),
          country: String(body.country != null ? body.country : p ? p.country : "").slice(0, 40),
          contact: String(body.contact != null ? body.contact : p ? p.contact : "").slice(0, 200),
          bio: String(body.bio != null ? body.bio : p ? p.bio : "").slice(0, 1e3),
          biz_name: String(body.bizName != null ? body.bizName : p ? p.biz_name : "").slice(0, 200),
          business_card: body.businessCard === null ? "" : String(body.businessCard != null ? body.businessCard : p ? p.business_card : "").slice(0, 2e6),
          business_card_name: body.businessCard === null ? "" : String(body.businessCardName != null ? body.businessCardName : p ? p.business_card_name : "").slice(0, 200)
        };
        if (p) {
          await run(
            "UPDATE profiles SET account_type=?, job_title=?, company=?, country=?, contact=?, bio=?, biz_name=?, business_card=?, business_card_name=?, updated_at=? WHERE user_id=?",
            vals.account_type,
            vals.job_title,
            vals.company,
            vals.country,
            vals.contact,
            vals.bio,
            vals.biz_name,
            vals.business_card,
            vals.business_card_name,
            Date.now(),
            u.id
          );
        } else {
          await run(
            "INSERT INTO profiles (user_id, account_type, job_title, company, country, contact, bio, biz_name, business_card, business_card_name, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            u.id,
            vals.account_type,
            vals.job_title,
            vals.company,
            vals.country,
            vals.contact,
            vals.bio,
            vals.biz_name,
            vals.business_card,
            vals.business_card_name,
            Date.now()
          );
        }
        return send2(res, 200, { ok: true });
      }
    }
    if (a === "suggestions") {
      const u = await requireAuth(res, req);
      if (!u) return;
      if (b === void 0 && m === "GET") {
        const rows = u.role === "admin" ? await all("SELECT * FROM suggestions ORDER BY updated_at DESC") : await all("SELECT * FROM suggestions WHERE user_id = ? ORDER BY updated_at DESC", u.id);
        return send2(res, 200, paginate(rows, q));
      }
      if (b === void 0 && m === "POST") {
        const body = await readBody(req);
        const content = String(body.content || "").trim();
        if (!content) return fail(res, 400, "VALIDATION", "\u5EFA\u8BAE\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A");
        const id = randomUUID();
        await run(
          "INSERT INTO suggestions (id, user_id, type, content, contact, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
          id,
          u.id,
          String(body.type || "other").slice(0, 20),
          content.slice(0, 2e3),
          String(body.contact || "").slice(0, 200),
          "new",
          Date.now(),
          Date.now()
        );
        return send2(res, 201, await get("SELECT * FROM suggestions WHERE id = ?", id));
      }
      if (b && c === "status" && m === "POST") {
        const admin = await requireAuth(res, req, ["admin"]);
        if (!admin) return;
        const rec = await get("SELECT * FROM suggestions WHERE id = ?", b);
        if (!rec) return fail(res, 404, "NOT_FOUND", "\u5EFA\u8BAE\u4E0D\u5B58\u5728");
        const body = await readBody(req);
        if (!["new", "seen", "done"].includes(body.status)) return fail(res, 400, "VALIDATION", "\u72B6\u6001\u975E\u6CD5");
        await run("UPDATE suggestions SET status = ?, updated_at = ? WHERE id = ?", body.status, Date.now(), b);
        return send2(res, 200, await get("SELECT * FROM suggestions WHERE id = ?", b));
      }
    }
    if (a === "after-sales") {
      const u = await requireAuth(res, req);
      if (!u) return;
      if (b === void 0 && m === "GET") {
        const rows = u.role === "admin" ? await all("SELECT * FROM after_sales ORDER BY updated_at DESC") : u.role === "seller" ? await all("SELECT * FROM after_sales WHERE seller_id = ? ORDER BY updated_at DESC", u.id) : await all("SELECT * FROM after_sales WHERE buyer_id = ? ORDER BY updated_at DESC", u.id);
        return send2(res, 200, paginate(rows, q));
      }
      if (b === void 0 && m === "POST") {
        const body = await readBody(req);
        const o = await get("SELECT * FROM orders WHERE id = ?", body.orderId);
        if (!o) return fail(res, 404, "NOT_FOUND", "\u8BA2\u5355\u4E0D\u5B58\u5728");
        if (o.buyer_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u53EA\u80FD\u5BF9\u672C\u4EBA\u8BA2\u5355\u7533\u8BF7\u552E\u540E");
        if (!["created", "complete"].includes(o.status)) return fail(res, 400, "INVALID_STATUS", "\u5F53\u524D\u8BA2\u5355\u72B6\u6001\u4E0D\u53EF\u7533\u8BF7\u552E\u540E");
        const desc = String(body.description || "").trim();
        if (!desc) return fail(res, 400, "VALIDATION", "\u8BF7\u63CF\u8FF0\u95EE\u9898");
        const dispute = !!body.dispute;
        const id = randomUUID();
        await run(
          "INSERT INTO after_sales (id, order_id, buyer_id, seller_id, type, description, resolution, status, dispute, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
          id,
          o.id,
          u.id,
          o.seller_id,
          String(body.type || "other").slice(0, 40),
          desc.slice(0, 1e3),
          String(body.resolution || "").slice(0, 500),
          dispute ? "arbitrating" : "new",
          dispute ? 1 : 0,
          Date.now(),
          Date.now()
        );
        await addEvidence(o.id, u.id, dispute ? "dispute_open" : "after_sales_create", id, { type: body.type || "other", description: desc.slice(0, 200) });
        return send2(res, 201, await get("SELECT * FROM after_sales WHERE id = ?", id));
      }
      if (b && c === "respond" && m === "POST") {
        const rec = await get("SELECT * FROM after_sales WHERE id = ?", b);
        if (!rec) return fail(res, 404, "NOT_FOUND", "\u552E\u540E\u8BB0\u5F55\u4E0D\u5B58\u5728");
        if (rec.seller_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u4EC5\u5356\u5BB6\u53EF\u56DE\u590D");
        if (!["new", "responded"].includes(rec.status)) return fail(res, 400, "INVALID_STATUS", "\u5F53\u524D\u72B6\u6001\u4E0D\u53EF\u56DE\u590D");
        const body = await readBody(req);
        const action = body.action === "accept" ? "accept" : "reject";
        const reply = String(body.reply || "").slice(0, 600);
        await run(
          "UPDATE after_sales SET seller_reply = ?, seller_action = ?, status = ?, updated_at = ? WHERE id = ?",
          reply,
          action,
          action === "accept" ? "resolved" : "responded",
          Date.now(),
          b
        );
        await addEvidence(rec.order_id, u.id, "after_sales_reply", b, { action, reply: reply.slice(0, 200) });
        return send2(res, 200, await get("SELECT * FROM after_sales WHERE id = ?", b));
      }
      if (b && c === "escalate" && m === "POST") {
        const rec = await get("SELECT * FROM after_sales WHERE id = ?", b);
        if (!rec) return fail(res, 404, "NOT_FOUND", "\u552E\u540E\u8BB0\u5F55\u4E0D\u5B58\u5728");
        if (rec.buyer_id !== u.id && rec.seller_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u65E0\u6743\u64CD\u4F5C");
        if (!["new", "responded"].includes(rec.status)) return fail(res, 400, "INVALID_STATUS", "\u5F53\u524D\u72B6\u6001\u4E0D\u53EF\u5347\u7EA7");
        await run("UPDATE after_sales SET status = ?, dispute = 1, updated_at = ? WHERE id = ?", "arbitrating", Date.now(), b);
        await addEvidence(rec.order_id, u.id, "dispute_open", b, { escalate: true });
        return send2(res, 200, await get("SELECT * FROM after_sales WHERE id = ?", b));
      }
      if (b && c === "arbitrate" && m === "POST") {
        const admin = await requireAuth(res, req, ["admin"]);
        if (!admin) return;
        const rec = await get("SELECT * FROM after_sales WHERE id = ?", b);
        if (!rec) return fail(res, 404, "NOT_FOUND", "\u552E\u540E\u8BB0\u5F55\u4E0D\u5B58\u5728");
        if (rec.status !== "arbitrating") return fail(res, 400, "INVALID_STATUS", "\u4EC5\u4EF2\u88C1\u4E2D\u7684\u6848\u4EF6\u53EF\u88C1\u51B3");
        const body = await readBody(req);
        if (!["buyer", "seller", "compromise"].includes(body.ruling)) return fail(res, 400, "VALIDATION", "\u88C1\u51B3\u7ED3\u679C\u975E\u6CD5");
        await run(
          "UPDATE after_sales SET ruling = ?, ruling_note = ?, status = ?, updated_at = ? WHERE id = ?",
          body.ruling,
          String(body.note || "").slice(0, 600),
          "resolved",
          Date.now(),
          b
        );
        await addEvidence(rec.order_id, admin.id, "after_sales_ruling", b, { ruling: body.ruling });
        return send2(res, 200, await get("SELECT * FROM after_sales WHERE id = ?", b));
      }
    }
    if (a === "orders" && b && c === "documents") {
      const u = await requireAuth(res, req);
      if (!u) return;
      const o = await get("SELECT * FROM orders WHERE id = ?", b);
      if (!o) return fail(res, 404, "NOT_FOUND", "\u8BA2\u5355\u4E0D\u5B58\u5728");
      if (u.role !== "admin" && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, "FORBIDDEN", "\u65E0\u6743\u67E5\u770B\u8BE5\u8BA2\u5355");
      if (m === "GET") {
        return send2(res, 200, { orderId: b, items: await all("SELECT * FROM order_documents WHERE order_id = ? ORDER BY created_at ASC", b) });
      }
      if (m === "POST") {
        const body = await readBody(req);
        if (!["CI", "PL", "CO", "BL"].includes(body.type)) return fail(res, 400, "VALIDATION", "\u5355\u636E\u7C7B\u578B\u975E\u6CD5");
        await run(
          "INSERT OR IGNORE INTO order_documents (id, order_id, doc_type, created_by, created_at) VALUES (?,?,?,?,?)",
          randomUUID(),
          b,
          body.type,
          u.id,
          Date.now()
        );
        await addEvidence(b, u.id, "document_generated", body.type, { docType: body.type });
        return send2(res, 201, { orderId: b, items: await all("SELECT * FROM order_documents WHERE order_id = ? ORDER BY created_at ASC", b) });
      }
    }
    if (a === "exports" && b === "readiness") {
      const u = await requireAuth(res, req);
      if (!u) return;
      const sid = c || u.id;
      if (m === "GET") {
        const doneMap = Object.fromEntries((await all("SELECT item_id, done FROM export_readiness WHERE seller_id = ?", sid)).map((r) => [r.item_id, !!r.done]));
        const items = EXPORT_ITEMS.map((id) => ({ id, done: !!doneMap[id] }));
        const done = items.filter((i) => i.done).length;
        return send2(res, 200, { sellerId: sid, score: items.length ? Math.round(done / items.length * 100) : 0, coreDone: done, coreTotal: items.length, items });
      }
      if (m === "PUT") {
        const body = await readBody(req);
        if (!EXPORT_ITEMS.includes(body.itemId)) return fail(res, 400, "VALIDATION", "\u6E05\u5355\u9879\u975E\u6CD5");
        await run(
          "INSERT INTO export_readiness (seller_id, item_id, done, updated_at) VALUES (?,?,?,?) ON CONFLICT(seller_id, item_id) DO UPDATE SET done = excluded.done, updated_at = excluded.updated_at",
          sid,
          body.itemId,
          body.done ? 1 : 0,
          Date.now()
        );
        const doneMap = Object.fromEntries((await all("SELECT item_id, done FROM export_readiness WHERE seller_id = ?", sid)).map((r) => [r.item_id, !!r.done]));
        const items = EXPORT_ITEMS.map((id) => ({ id, done: !!doneMap[id] }));
        const done = items.filter((i) => i.done).length;
        return send2(res, 200, { sellerId: sid, score: items.length ? Math.round(done / items.length * 100) : 0, coreDone: done, coreTotal: items.length, items });
      }
    }
    if (a === "card-templates" && m === "GET") {
      return send2(res, 200, CARD_TEMPLATES);
    }
    if (a === "compliance" && b === "screen" && m === "POST") {
      const body = await readBody(req);
      const text = String(body.text || "");
      const lower = text.toLowerCase();
      const hits = SANCTION_KEYWORDS.filter((k) => lower.includes(String(k).toLowerCase()));
      return send2(res, 200, { text, hits, clean: hits.length === 0, note: "keyword screening" });
    }
    if (a === "logistics" && b === "estimate" && m === "POST") {
      const body = await readBody(req);
      const w = Math.max(0, Number(body.weight) || 0);
      const v = Math.max(0, Number(body.volume) || 0);
      const mode = ["sea", "air", "land", "courier"].includes(body.mode) ? body.mode : "sea";
      const chargeable = Math.max(w / 1e3, v || 0);
      let lo = 0, hi = 0;
      if (mode === "sea") {
        if (body.container === "20GP") {
          lo = 900;
          hi = 2200;
        } else if (body.container === "40GP" || body.container === "40HQ") {
          lo = 1500;
          hi = 4200;
        } else {
          lo = Math.round(chargeable * 55);
          hi = Math.round(chargeable * 120 + 60);
        }
      } else if (mode === "air") {
        lo = Math.round(chargeable * 340);
        hi = Math.round(chargeable * 620);
      } else if (mode === "land") {
        lo = Math.round(chargeable * 130);
        hi = Math.round(chargeable * 280);
      } else {
        lo = Math.max(18, Math.round(chargeable * 700));
        hi = Math.max(35, Math.round(chargeable * 1300));
      }
      return send2(res, 200, {
        mode,
        currency: "USD",
        lo: Math.max(0, lo),
        hi: Math.max(lo, hi),
        weight: w,
        volume: v,
        chargeable,
        container: body.container || "LCL",
        origin: String(body.origin || "").trim(),
        destination: String(body.destination || "").trim(),
        note: "demo estimate only"
      });
    }
    if (a === "verify-turnstile" && m === "POST") {
      const body = await readBody(req);
      return send2(res, 200, await verifyTurnstile(body.token));
    }
    return fail(res, 404, "NOT_FOUND", "\u63A5\u53E3\u4E0D\u5B58\u5728");
  }
  __name(route, "route");
  let seedPromise = null;
  async function handle({ method, pathname, query, req, res }) {
    const m = String(method || "GET").toUpperCase();
    if (m === "OPTIONS") {
      res.writeHead(204, CORS);
      res.end("");
      return;
    }
    try {
      if (!seedPromise) {
        seedPromise = ENV.SEED_DEMO === "0" ? Promise.resolve(false) : Promise.resolve().then(() => seedIfEmpty());
      }
      await seedPromise;
      const segs = String(pathname || "/").split("/").filter(Boolean);
      await route(m, segs, query, req, res);
    } catch (e) {
      if (e && e.message === "INVALID_JSON") return fail(res, 400, "INVALID_JSON", "\u8BF7\u6C42\u4F53\u4E0D\u662F\u5408\u6CD5 JSON");
      console.error("[api] " + (e && e.stack ? e.stack : e));
      if (res.headersSent) {
        try {
          res.end("");
        } catch (err) {
        }
        return;
      }
      return fail(res, 500, "INTERNAL", "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF");
    }
  }
  __name(handle, "handle");
  return { handle, route, ENV, refreshNewsFeeds };
}
__name(createApp, "createApp");

// ../backend/src/db-d1.mjs
function makeD1Store(DB) {
  const clean = /* @__PURE__ */ __name((params) => params.map((v) => {
    if (v === void 0) return null;
    if (typeof v === "boolean") return v ? 1 : 0;
    if (typeof v === "bigint") return Number(v);
    return v;
  }), "clean");
  return {
    async all(sql, ...params) {
      const r = await DB.prepare(sql).bind(...clean(params)).all();
      return r && r.results || [];
    },
    async get(sql, ...params) {
      const r = await DB.prepare(sql).bind(...clean(params)).first();
      return r === void 0 ? null : r;
    },
    async run(sql, ...params) {
      return await DB.prepare(sql).bind(...clean(params)).run();
    }
  };
}
__name(makeD1Store, "makeD1Store");

// ../backend/src/storage-r2.mjs
function makeR2Storage(bucket) {
  return {
    async put(key, buf) {
      const body = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
      await bucket.put(key, body);
      return true;
    },
    async get(key) {
      const obj = await bucket.get(key);
      if (!obj) return null;
      return new Uint8Array(await obj.arrayBuffer());
    },
    async del(key) {
      await bucket.delete(key);
      return true;
    }
  };
}
__name(makeR2Storage, "makeR2Storage");
function makeDisabledStorage() {
  const fail = /* @__PURE__ */ __name(() => {
    throw new Error("\u6587\u4EF6\u5B58\u50A8\u672A\u914D\u7F6E\uFF08\u8BF7\u5728 wrangler.jsonc \u7ED1\u5B9A R2 \u6876\uFF09");
  }, "fail");
  return { put: fail, get: /* @__PURE__ */ __name(async () => null, "get"), del: /* @__PURE__ */ __name(async () => false, "del") };
}
__name(makeDisabledStorage, "makeDisabledStorage");

// api/[[path]].js
var appPromise = null;
function getApp(env2) {
  if (!appPromise) {
    appPromise = Promise.resolve().then(() => {
      if (env2.DB) setStore(makeD1Store(env2.DB));
      configureStorage({ maxFileSize: env2.MAX_FILE_SIZE });
      setStorageImpl(env2.FILES ? makeR2Storage(env2.FILES) : makeDisabledStorage());
      configureMailer({ name: env2.MAIL_TRANSPORT || "mock", custom: mailTransport(env2) });
      return createApp({ env: env2, deps: {} });
    });
  }
  return appPromise;
}
__name(getApp, "getApp");
function mailTransport(env2) {
  const mode = env2.MAIL_TRANSPORT || "mock";
  if (mode !== "http") return void 0;
  return async ({ to, subject, body }) => {
    if (!env2.MAIL_API_URL || !env2.MAIL_API_KEY) throw new Error("MAIL_API_URL / MAIL_API_KEY \u672A\u914D\u7F6E");
    const r = await fetch(env2.MAIL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + env2.MAIL_API_KEY },
      body: JSON.stringify({ from: env2.MAIL_FROM, to, subject, text: body })
    });
    if (!r.ok) throw new Error("MAIL_HTTP_" + r.status);
  };
}
__name(mailTransport, "mailTransport");
async function onRequest(context2) {
  const { request, env: env2, params } = context2;
  const app = await getApp(env2);
  const url = new URL(request.url);
  const segs = Array.isArray(params.path) ? params.path : params.path ? [params.path] : [];
  const headers = {};
  for (const [k, v] of request.headers) headers[k.toLowerCase()] = v;
  let bodyPromise = null;
  const bodyBuffer = /* @__PURE__ */ __name(() => bodyPromise || (bodyPromise = request.arrayBuffer().then((b) => new Uint8Array(b))), "bodyBuffer");
  const req = {
    method: request.method,
    headers,
    socket: {
      remoteAddress: request.headers.get("CF-Connecting-IP") || (headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown"
    },
    arrayBuffer: bodyBuffer,
    text: /* @__PURE__ */ __name(() => bodyBuffer().then((b) => new TextDecoder().decode(b)), "text")
  };
  const res = {
    status: 200,
    headers: {},
    body: "",
    headersSent: false,
    writeHead(status, extra) {
      this.status = status;
      if (extra) for (const [k, v] of Object.entries(extra)) this.headers[k] = String(v);
      this.headersSent = true;
    },
    end(body) {
      if (body !== void 0) this.body = body;
      this.headersSent = true;
    }
  };
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  await app.handle({
    method: request.method,
    pathname: "/" + segs.join("/"),
    query: url.searchParams,
    req: hasBody ? req : { ...req, text: /* @__PURE__ */ __name(async () => "", "text"), arrayBuffer: /* @__PURE__ */ __name(async () => new Uint8Array(0), "arrayBuffer") },
    res
  });
  const out = res.body;
  if (out instanceof Uint8Array || out instanceof ArrayBuffer) {
    return new Response(out, { status: res.status, headers: res.headers });
  }
  return new Response(typeof out === "string" ? out : String(out || ""), {
    status: res.status,
    headers: res.headers
  });
}
__name(onRequest, "onRequest");

// ../.wrangler/tmp/pages-5dPiqL/functionsRoutes-0.3695827203026345.mjs
var routes = [
  {
    routePath: "/api/:path*",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  }
];

// ../node_modules/.pnpm/path-to-regexp@6.3.0/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count3 = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count3--;
          if (count3 === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count3++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count3)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/.pnpm/wrangler@4.122.0/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env2, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context2 = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env: env2,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context2);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env2["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error3) {
      if (isFailOpen) {
        const response = await env2["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error3;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../node_modules/.pnpm/wrangler@4.122.0/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../node_modules/.pnpm/wrangler@4.122.0/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    const body = JSON.stringify(error3);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-kz25SS/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../node_modules/.pnpm/wrangler@4.122.0/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-kz25SS/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.37872391624835267.mjs.map
