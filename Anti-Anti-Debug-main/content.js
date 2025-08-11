(function() {
    'use strict';
    
    const injectAntiDebug = () => {
        chrome.storage.local.get(['aad_enabled', 'aad_aggressive'], (result) => {
            if (result.aad_enabled !== false) {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('anti-anti-debug.js');
                script.type = 'text/javascript';
                
                const head = document.head || document.documentElement;
                head.appendChild(script);
                script.remove();
                
                if (result.aad_aggressive) {
                    setTimeout(() => {
                        if (!window.antiAntiDebugLoaded) {
                            const inlineScript = document.createElement('script');
                            inlineScript.textContent = `
                                console.log("Hack Ng Long Đã Bật - Aggressive Mode");
                                window.antiAntiDebugLoaded = true;
                            `;
                            head.appendChild(inlineScript);
                            inlineScript.remove();
                        }
                    }, 200);
                }
            }
        });
    };
    
    const setupMutationObserver = () => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName === 'SCRIPT' && node.src && node.src.includes('debugger')) {
                                node.remove();
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    };
    
    const overrideConsole = () => {
        if (window.console && !window.console._overridden) {
            const originalLog = console.log;
            const originalWarn = console.warn;
            
            console.log = function(...args) {
                if (args.some(arg => typeof arg === 'string' && arg.includes('debugger'))) {
                    return;
                }
                return originalLog.apply(console, args);
            };
            
            console.warn = function(...args) {
                if (args.some(arg => typeof arg === 'string' && arg.includes('debugger'))) {
                    return;
                }
                return originalWarn.apply(console, args);
            };
            
            console._overridden = true;
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectAntiDebug();
            setupMutationObserver();
            overrideConsole();
        });
    } else {
        injectAntiDebug();
        setupMutationObserver();
        overrideConsole();
    }
    
    let lastInjectTime = 0;
    const INJECT_COOLDOWN = 5000;
    
    function forceInjectAntiDebug() {
        const now = Date.now();
        if (!window.antiAntiDebugLoaded && now - lastInjectTime > INJECT_COOLDOWN) {
            lastInjectTime = now;
            injectAntiDebug();
        }
    }
   
    [document.head, document.body, document.documentElement].forEach((target) => {
        if (!target) return;
        const observer = new MutationObserver(() => {
            setTimeout(forceInjectAntiDebug, 1);
        });
        observer.observe(target, { childList: true, subtree: true });
    });
})();