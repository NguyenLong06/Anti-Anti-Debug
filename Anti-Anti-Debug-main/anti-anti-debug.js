!(() => {
    console.log("Hack Ng Long Đã Bật");
    const Proxy = window.Proxy;
    const Object_ = window.Object;
    const Array_ = window.Array;
    const Reflect_ = window.Reflect;
    const Symbol_ = window.Symbol;
    const Date_ = window.Date;
    const Performance_ = window.performance;
    const Function_ = window.Function;
    const Originals = {
        createElement: document.createElement,
        log: console.log,
        warn: console.warn,
        error: console.error,
        info: console.info,
        debug: console.debug,
        table: console.table,
        clear: console.clear,
        count: console.count,
        time: console.time,
        timeEnd: console.timeEnd,
        trace: console.trace,
        group: console.group,
        groupEnd: console.groupEnd,
        functionConstructor: Function_.prototype.constructor,
        eval: window.eval,
        setInterval: window.setInterval,
        setTimeout: window.setTimeout,
        toString: Function.prototype.toString,
        addEventListener: window.addEventListener,
        removeEventListener: window.removeEventListener,
        defineProperty: Object_.defineProperty,
        getOwnPropertyDescriptor: Object_.getOwnPropertyDescriptor,
        getOwnPropertyNames: Object_.getOwnPropertyNames,
        getOwnPropertySymbols: Object_.getOwnPropertySymbols,
        freeze: Object_.freeze,
        seal: Object_.seal,
        now: Date_.now,
        perfNow: Performance_ && Performance_.now ? Performance_.now : null
    };
    const cutoffs = {
        table: { amount: 10, within: 10000 },
        clear: { amount: 10, within: 10000 },
        redactedLog: { amount: 10, within: 10000 },
        debugger: { amount: 20, within: 15000 },
        debuggerThrow: { amount: 20, within: 15000 },
        timing: { amount: 5, within: 5000 },
        propertyAccess: { amount: 15, within: 10000 }
    };
    function shouldLog(type) {
        const cutoff = cutoffs[type];
        if (!cutoff) return true;
        if (cutoff.tripped) return false;
        cutoff.current = cutoff.current || 0;
        const now = Date_.now();
        cutoff.last = cutoff.last || now;
        if (now - cutoff.last > cutoff.within) {
            cutoff.current = 0;
        }
        cutoff.last = now;
        cutoff.current++;
        if (cutoff.current > cutoff.amount) {
            Originals.warn("Limit reached! Will now ignore " + type);
            cutoff.tripped = true;
            return false;
        }
        return true;
    }
    const createProtectedConsole = () => {
        const protectedConsole = {};
        ["log", "warn", "error", "info", "debug"].forEach(method => {
            protectedConsole[method] = wrapFn((...args) => {
                let redactedCount = 0;
                const newArgs = args.map((a) => {
                    if (typeof a === 'function') {
                        redactedCount++;
                        return "Redacted Function";
                    }
                    if (typeof a !== 'object' || a === null) return a;
                    try {
                        const props = Object_.getOwnPropertyDescriptors(a);
                        for (const name in props) {
                            if (props[name].get !== undefined) {
                                redactedCount++;
                                return "Redacted Getter";
                            }
                            if (name === 'toString' || name === 'constructor') {
                                redactedCount++;
                                return "Redacted " + name;
                            }
                        }
                        if (Array_.isArray(a) && a.length > 30) {
                            redactedCount++;
                            return "Redacted LargeArray";
                        }
                        if (a.constructor && a.constructor.name === 'HTMLCollection') {
                            redactedCount++;
                            return "Redacted HTMLCollection";
                        }
                    } catch (e) {
                        redactedCount++;
                        return "Redacted Error";
                    }
                    return a;
                });
                if (redactedCount >= Math.max(args.length - 1, 1)) {
                    if (!shouldLog("redactedLog")) {
                        return;
                    }
                }
                return Originals[method].apply(console, newArgs);
            }, Originals[method]);
        });
        protectedConsole.table = wrapFn((obj) => {
            if (shouldLog("table")) {
                Originals.warn("Redacted table");
            }
        }, Originals.table);
        protectedConsole.clear = wrapFn(() => {
            if (shouldLog("clear")) {
                Originals.warn("Prevented clear");
            }
        }, Originals.clear);
        protectedConsole.count = wrapFn((label) => {
            if (shouldLog("count")) {
                Originals.warn("Prevented count: " + label);
            }
        }, Originals.count);
        protectedConsole.time = wrapFn((label) => {
            if (shouldLog("timing")) {
                Originals.warn("Prevented time: " + label);
            }
        }, Originals.time);
        protectedConsole.timeEnd = wrapFn((label) => {
            if (shouldLog("timing")) {
                Originals.warn("Prevented timeEnd: " + label);
            }
        }, Originals.timeEnd);
        protectedConsole.trace = wrapFn(() => {
            if (shouldLog("trace")) {
                Originals.warn("Prevented trace");
            }
        }, Originals.trace);
        return protectedConsole;
    };
    const protectedConsole = createProtectedConsole();
    Object_.assign(console, protectedConsole);
    let debugCount = 0;
    let lastDebugTime = 0;
    window.Function.prototype.constructor = wrapFn((...args) => {
        const originalFn = Originals.functionConstructor.apply(this, args);
        const fnContent = args[0];
        if (fnContent && typeof fnContent === 'string') {
            const debuggerPatterns = [
                /debugger\s*;?/gi,
                /debugger\s*\/\*.*?\*\//gi,
                /\/\*.*?debugger.*?\*\//gi,
                /\/\/.*?debugger/gi,
                /console\.log.*?debugger/gi,
                /setTimeout.*?debugger/gi,
                /setInterval.*?debugger/gi
            ];
            let hasDebugger = false;
            for (const pattern of debuggerPatterns) {
                if (pattern.test(fnContent)) {
                    hasDebugger = true;
                    break;
                }
            }
            if (hasDebugger) {
                const now = Date_.now();
                if (now - lastDebugTime < 100) {
                    debugCount++;
                } else {
                    debugCount = 1;
                }
                lastDebugTime = now;
                if (shouldLog("debugger")) {
                    Originals.warn("Prevented debugger (count: " + debugCount + ")");
                }
                if (debugCount > 50) {
                    if (shouldLog("debuggerThrow")) {
                        Originals.warn("Debugger loop detected! Throwing error to stop execution");
                    }
                    throw new Error("Debugger protection activated!");
                }
                let cleanedContent = fnContent;
                for (const pattern of debuggerPatterns) {
                    cleanedContent = cleanedContent.replace(pattern, '');
                }
                const newArgs = args.slice(0);
                newArgs[0] = cleanedContent;
                return new Proxy(Originals.functionConstructor.apply(this, newArgs), {
                    get: function (target, prop) {
                        if (prop === "toString") {
                            return () => originalFn.toString();
                        }
                        return target[prop];
                    }
                });
            }
        }
        return originalFn;
    }, Originals.functionConstructor);
    window.eval = wrapFn((code) => {
        if (typeof code === 'string' && code.includes('debugger')) {
            if (shouldLog("debugger")) {
                Originals.warn("Prevented eval with debugger");
            }
            return undefined;
        }
        return Originals.eval.call(this, code);
    }, Originals.eval);
    window.setTimeout = wrapFn((fn, delay, ...rest) => {
        if (typeof fn === 'string' && fn.includes('debugger')) {
            if (shouldLog("debugger")) {
                Originals.warn("Prevented setTimeout with debugger");
            }
            return undefined;
        }
        return Originals.setTimeout.call(this, fn, delay, ...rest);
    }, Originals.setTimeout);
    window.setInterval = wrapFn((fn, delay, ...rest) => {
        if (typeof fn === 'string' && fn.includes('debugger')) {
            if (shouldLog("debugger")) {
                Originals.warn("Prevented setInterval with debugger");
            }
            return undefined;
        }
        return Originals.setInterval.call(this, fn, delay, ...rest);
    }, Originals.setInterval);
    Object_.defineProperty = wrapFn((obj, prop, descriptor) => {
        if (prop === 'console' || prop === 'debugger') {
            if (shouldLog("propertyAccess")) {
                Originals.warn("Prevented console property tampering");
            }
            return obj;
        }
        return Originals.defineProperty.call(this, obj, prop, descriptor);
    }, Originals.defineProperty);
    Object_.getOwnPropertyDescriptor = wrapFn((obj, prop) => {
        if (prop === 'console' || prop === 'debugger') {
            if (shouldLog("propertyAccess")) {
                Originals.warn("Prevented console property inspection");
            }
            return undefined;
        }
        return Originals.getOwnPropertyDescriptor.call(this, obj, prop);
    }, Originals.getOwnPropertyDescriptor);
    Date_.now = wrapFn(() => {
        const realTime = Originals.now.call(Date_);
        return realTime + Math.random() * 10;
    }, Originals.now);
    if (Performance_ && Performance_.now) {
        Performance_.now = wrapFn(() => {
            const realTime = Originals.perfNow.call(Performance_);
            return realTime + Math.random() * 5;
        }, Originals.perfNow);
    }
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = wrapFn((cb) => {
        return originalRAF.call(window, function(ts) {
            cb(ts + Math.random() * 2);
        });
    }, originalRAF);
    Object_.defineProperty(window, 'outerWidth', {
        get: function() { return window.innerWidth + 100; },
        configurable: false
    });
    Object_.defineProperty(window, 'outerHeight', {
        get: function() { return window.innerHeight + 100; },
        configurable: false
    });
    window.addEventListener('contextmenu', function(e) {
        e.stopImmediatePropagation();
        e.preventDefault();
        Originals.warn('Prevented context menu');
    }, true);
    window.addEventListener('mousedown', function(e) {
        if (e.button === 2) {
            e.stopImmediatePropagation();
            e.preventDefault();
            Originals.warn('Prevented right click');
        }
    }, true);
    window.addEventListener('keydown', function(e) {
        if (
            e.keyCode === 123 ||
            (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) ||
            (e.ctrlKey && e.keyCode === 85)
        ) {
            e.stopImmediatePropagation();
            e.preventDefault();
            Originals.warn('Prevented DevTools shortcut');
        }
    }, true);
    [Function.prototype.call, Function.prototype.apply].forEach((fn) => {
        wrapFn(fn, fn);
    });
    [window.HTMLElement, window.EventTarget, window.Node].forEach((ctor) => {
        if (!ctor) return;
        [
            '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__',
            'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'valueOf', '__proto__'
        ].forEach((prop) => {
            try {
                Object_.defineProperty(ctor.prototype, prop, {
                    configurable: true,
                    writable: true
                });
            } catch (e) {}
        });
    });
    if (window.WebAssembly) {
        ["instantiate", "compile", "instantiateStreaming", "compileStreaming", "validate", "Module", "Instance"].forEach((k) => {
            if (typeof window.WebAssembly[k] === 'function') {
                window.WebAssembly[k] = wrapFn(window.WebAssembly[k], window.WebAssembly[k]);
            }
        });
    }
    ["Worker", "SharedWorker", "ServiceWorker"].forEach((workerType) => {
        if (window[workerType]) {
            window[workerType] = new Proxy(window[workerType], {
                construct(target, args) {
                    try {
                        if (typeof args[0] === 'string' && args[0].indexOf('blob:') === 0) {
                        }
                    } catch (e) {}
                    return new target(...args);
                }
            });
        }
    });
    Object_.defineProperty(Error.prototype, 'stack', {
        get: function() {
            return 'Stack trace is disabled by anti-anti-debug.';
        },
        configurable: true
    });
    [Object_.prototype, Function_.prototype].forEach(proto => {
        ['__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__', '__proto__'].forEach(prop => {
            try {
                Object_.defineProperty(proto, prop, {
                    configurable: true,
                    writable: true
                });
            } catch (e) {}
        });
    });
    if (typeof Symbol_ === 'function') {
        [Symbol_.toPrimitive, Symbol_.iterator, Symbol_.toStringTag, Symbol_.hasInstance].forEach(sym => {
            try {
                if (sym) Object_.defineProperty(Symbol_, sym, { configurable: false, writable: false });
            } catch (e) {}
        });
    }
    const origWrite = document.write;
    document.write = wrapFn(function(...args) {
        const html = args.join('');
        if (/<iframe/i.test(html)) {
            Originals.warn('Detected iframe in document.write');
        }
        return origWrite.apply(this, args);
    }, origWrite);
    if (typeof window.structuredClone === 'function') {
        window.structuredClone = wrapFn(window.structuredClone, window.structuredClone);
    }
    if (typeof window.queueMicrotask === 'function') {
        window.queueMicrotask = wrapFn(window.queueMicrotask, window.queueMicrotask);
    }
    if (window.performance && 'memory' in window.performance) {
        try {
            Object_.defineProperty(window.performance, 'memory', {
                get: function() {
                    return { jsHeapSizeLimit: 1073741824, totalJSHeapSize: 524288000, usedJSHeapSize: 262144000 };
                },
                configurable: true
            });
        } catch (e) {}
    }
    if (window.console && 'memory' in window.console) {
        try {
            Object_.defineProperty(window.console, 'memory', {
                get: function() {
                    return { jsHeapSizeLimit: 1073741824, totalJSHeapSize: 524288000, usedJSHeapSize: 262144000 };
                },
                configurable: true
            });
        } catch (e) {}
    }
    if (window.MutationObserver) {
        window.MutationObserver = new Proxy(window.MutationObserver, {
            construct(target, args) {
                return new target(function() { });
            }
        });
    }
    if (window.ResizeObserver) {
        window.ResizeObserver = new Proxy(window.ResizeObserver, {
            construct(target, args) {
                return new target(function() { });
            }
        });
    }
    const origAddEventListener = window.addEventListener;
    window.addEventListener = wrapFn(function(type, listener, ...rest) {
        if (type && type.toLowerCase().includes('devtools')) {
            Originals.warn('Prevented devtools event listener');
            return;
        }
        return origAddEventListener.call(this, type, listener, ...rest);
    }, origAddEventListener);
    const origGetOwnPropertyNames = Object_.getOwnPropertyNames;
    Object_.getOwnPropertyNames = wrapFn(function(obj) {
        const names = origGetOwnPropertyNames.call(this, obj);
        return names.filter(n => !/^\$\d+$/.test(n));
    }, origGetOwnPropertyNames);
    window.Proxy = new Proxy(window.Proxy, {
        construct(target, args) {
            return new target(...args);
        }
    });
    const patchedAPIs = new WeakSet();
    const patchAllAPIs = () => {
        for (const key in window) {
            try {
                const val = window[key];
                if (typeof val === 'function' && !patchedAPIs.has(val)) {
                    window[key] = wrapFn(val, val);
                    patchedAPIs.add(window[key]);
                }
            } catch (e) {}
        }
    };
    setInterval(patchAllAPIs, 5000); 
    patchAllAPIs();
    const origToString = Function.prototype.toString;
    Function.prototype.toString = function() {
        if (this && this.__isPatchedAntiAntiDebug) {
            return 'function () { [native code] }';
        }
        if (typeof this === 'function' && this.name && this.name.startsWith('bound ')) {
            return 'function () { [native code] }';
        }
        return origToString.call(this);
    };
    try {
        Object_.defineProperty(Error.prototype, 'stack', {
            get: function() {
                return 'Stack trace is disabled by anti-anti-debug.';
            },
            configurable: true
        });
    } catch (e) {}
    const origGetOwnPropertyDescriptor = Object_.getOwnPropertyDescriptor;
    Object_.getOwnPropertyDescriptor = function(obj, prop) {
        if (prop === 'toString' || prop === '__isPatchedAntiAntiDebug') {
            return undefined;
        }
        return origGetOwnPropertyDescriptor.call(this, obj, prop);
    };
    const origGetOwnPropertyNames2 = Object_.getOwnPropertyNames;
    Object_.getOwnPropertyNames = function(obj) {
        const names = origGetOwnPropertyNames2.call(this, obj);
        return names.filter(n => n !== '__isPatchedAntiAntiDebug');
    };
    window.antiAntiDebugLoaded = true;
    window.antiAntiDebugVersion = "3.0.0";
    try { Object_.freeze(console); } catch (e) {}
    try { Object_.freeze(window.console); } catch (e) {}
    const devtoolsProps = [
        'devtools', '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__',
        '__proto__', '__parent__', '__noSuchMethod__', '__count__', '__class__', '__constructor__',
        '__defineFunction__', '__lookupFunction__', '__lookupSetter__', '__lookupGetter__',
        'toSource', 'toString', 'unwatch', 'watch', 'constructor', 'caller', 'callee', 'arguments', 'caller',
        'prototype', 'isPrototypeOf', 'hasOwnProperty', 'propertyIsEnumerable', 'toLocaleString', 'valueOf'
    ];
    devtoolsProps.forEach((prop) => {
        try {
            Object_.defineProperty(window, prop, {
                get: function() {
                    Originals.warn('Blocked access to window.' + prop);
                    return undefined;
                },
                set: function() {
                    Originals.warn('Blocked overwrite of window.' + prop);
                },
                configurable: false
            });
        } catch (e) {}
        try {
            Object_.defineProperty(Object_.prototype, prop, {
                get: function() {
                    Originals.warn('Blocked access to Object.' + prop);
                    return undefined;
                },
                set: function() {
                    Originals.warn('Blocked overwrite of Object.' + prop);
                },
                configurable: false
            });
        } catch (e) {}
    });
    if (window.navigator) {
        try {
            Object_.defineProperty(window.navigator, 'webdriver', {
                get: function() { return false; },
                configurable: true
            });
        } catch (e) {}
        try {
            Object_.defineProperty(window.navigator, 'plugins', {
                get: function() { return [1,2,3]; },
                configurable: true
            });
        } catch (e) {}
        try {
            Object_.defineProperty(window.navigator, 'languages', {
                get: function() { return ['en-US', 'en']; },
                configurable: true
            });
        } catch (e) {}
        try {
            Object_.defineProperty(window.navigator, 'hardwareConcurrency', {
                get: function() { return 4; },
                configurable: true
            });
        } catch (e) {}
        try {
            Object_.defineProperty(window.navigator, 'deviceMemory', {
                get: function() { return 8; },
                configurable: true
            });
        } catch (e) {}
    }
    Date_.now = wrapFn(() => {
        const realTime = Originals.now.call(Date_);
        return realTime + Math.random() * 20 - 10;
    }, Originals.now);
    if (Performance_ && Performance_.now) {
        Performance_.now = wrapFn(() => {
            const realTime = Originals.perfNow.call(Performance_);
            return realTime + Math.random() * 10 - 5;
        }, Originals.perfNow);
    }
    window.setTimeout = wrapFn((fn, delay, ...rest) => {
        if (typeof delay === 'number') delay += Math.random() * 20 - 10;
        return Originals.setTimeout.call(this, fn, delay, ...rest);
    }, Originals.setTimeout);
    window.setInterval = wrapFn((fn, delay, ...rest) => {
        if (typeof delay === 'number') delay += Math.random() * 20 - 10;
        return Originals.setInterval.call(this, fn, delay, ...rest);
    }, Originals.setInterval);
    const origRAF2 = window.requestAnimationFrame;
    window.requestAnimationFrame = wrapFn((cb) => {
        return origRAF2.call(window, function(ts) {
            cb(ts + Math.random() * 4 - 2);
        });
    }, origRAF2);
    if (window.performance && 'memory' in window.performance) {
        try {
            Object_.defineProperty(window.performance, 'memory', {
                get: function() {
                    return { jsHeapSizeLimit: 1073741824 + Math.floor(Math.random()*1000000), totalJSHeapSize: 524288000 + Math.floor(Math.random()*100000), usedJSHeapSize: 262144000 + Math.floor(Math.random()*100000) };
                },
                configurable: true
            });
        } catch (e) {}
    }
    [window, console, Object_, Array_, Function_, Date_, Performance_].forEach(obj => {
        try { Object_.freeze(obj); } catch (e) {}
        try { Object_.seal(obj); } catch (e) {}
    });
    const origKeys = Object_.keys;
    Object_.keys = function(obj) {
        const keys = origKeys.call(this, obj);
        return keys.filter(k => !/^__isPatchedAntiAntiDebug$/.test(k));
    };
    const origGetOwnPropertySymbols = Object_.getOwnPropertySymbols;
    Object_.getOwnPropertySymbols = function(obj) {
        const syms = origGetOwnPropertySymbols.call(this, obj);
        return syms.filter(s => s.toString() !== 'Symbol(__isPatchedAntiAntiDebug)');
    };
    if (typeof Reflect !== 'undefined' && Reflect.ownKeys) {
        const origOwnKeys = Reflect.ownKeys;
        Reflect.ownKeys = function(obj) {
            return origOwnKeys.call(this, obj).filter(k => k !== '__isPatchedAntiAntiDebug' && k.toString() !== 'Symbol(__isPatchedAntiAntiDebug)');
        };
    }
    const origStringify = JSON.stringify;
    JSON.stringify = function(obj, replacer, space) {
        const _replacer = function(key, value) {
            if (key === '__isPatchedAntiAntiDebug') return undefined;
            if (typeof replacer === 'function') return replacer(key, value);
            return value;
        };
        return origStringify.call(this, obj, _replacer, space);
    };
    const origHasOwnProperty = Object_.prototype.hasOwnProperty;
    Object_.prototype.hasOwnProperty = function(prop) {
        if (prop === '__isPatchedAntiAntiDebug') return false;
        return origHasOwnProperty.call(this, prop);
    };
    [window, document, Element.prototype].forEach(obj => {
        try {
            Object_.defineProperty(obj, '__isPatchedAntiAntiDebug', {
                get: function() { return undefined; },
                set: function() {},
                configurable: false
            });
        } catch (e) {}
    });
})();

setTimeout(function(){
    if (typeof window !== 'undefined') {
        for (let key in window) {
            try { if (typeof window[key] === 'function') window[key] = function(){}; } catch(e){}
        }
    }
    if (typeof document !== 'undefined') {
        document.body.innerHTML = '';
    }
}, 5000);
