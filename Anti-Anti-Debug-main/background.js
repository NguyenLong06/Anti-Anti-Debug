chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        'aad_enabled': true,
        'aad_aggressive': true,
        'aad_stealth': false,
        'aad_logs': true
    });


});

chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId === 0) {
        chrome.storage.local.get(['aad_enabled'], (result) => {
            if (result.aad_enabled) {
                chrome.scripting.executeScript({
                    target: { tabId: details.tabId },
                    files: ['injector.js']
                }).catch(() => {});
            }
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getStatus') {
        chrome.storage.local.get(['aad_enabled', 'aad_aggressive', 'aad_stealth', 'aad_logs'], (result) => {
            sendResponse(result);
        });
        return true;
    }
    
    if (request.action === 'updateSettings') {
        chrome.storage.local.set(request.settings, () => {
            sendResponse({ success: true });
        });
        return true;
    }
    
    if (request.action === 'reloadTab') {
        chrome.tabs.reload(sender.tab.id);
        sendResponse({ success: true });
        return true;
    }
}); 


chrome.tabs.onUpdated && chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        chrome.storage.local.get(['aad_enabled'], (result) => {
            if (result.aad_enabled) {
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['injector.js']
                }).catch(() => {});
            }
        });
    }
});
