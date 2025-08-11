(function() {
    'use strict';
    
    const injectScript = (src) => {
        const script = document.createElement('script');
        script.src = src;
        script.type = 'text/javascript';
        (document.head || document.documentElement).appendChild(script);
        script.remove();
    };
    
    const injectInline = (code) => {
        const script = document.createElement('script');
        script.textContent = code;
        (document.head || document.documentElement).appendChild(script);
        script.remove();
    };
    
    const injectMultiple = () => {
        try {
            injectScript(chrome.runtime.getURL('anti-anti-debug.js'));
        } catch (e) {
            injectInline(`
                console.log("Hack Ng Long Đã Bật");
                window.antiAntiDebugLoaded = true;
            `);
        }
    };
    
    let lastInjectTime = 0;
    const INJECT_COOLDOWN = 5000;
   
    function forceInjectAntiDebug() {
        const now = Date.now();
        if (!window.antiAntiDebugLoaded && now - lastInjectTime > INJECT_COOLDOWN) {
            lastInjectTime = now;
            injectMultiple();
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