class UltimateAntiAntiDebug {
    constructor() {
        this.elements = {
            mainToggle: document.getElementById('main-toggle'),
            aggressiveToggle: document.getElementById('aggressive-toggle'),
            stealthToggle: document.getElementById('stealth-toggle'),
            logsToggle: document.getElementById('logs-toggle'),
            reloadBtn: document.getElementById('reload-btn'),
            testBtn: document.getElementById('test-btn'),
            status: document.getElementById('status')
        };
        
        this.init();
    }
    
    async init() {
        await this.loadSettings();
        this.bindEvents();
        this.updateStatus();
    }
    
    async loadSettings() {
        try {
            const result = await this.getSettings();
            this.elements.mainToggle.checked = result.aad_enabled !== false;
            this.elements.aggressiveToggle.checked = result.aad_aggressive !== false;
            this.elements.stealthToggle.checked = result.aad_stealth === true;
            this.elements.logsToggle.checked = result.aad_logs !== false;
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }
    
    async getSettings() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
                resolve(response || {});
            });
        });
    }
    
    async saveSettings(settings) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ 
                action: 'updateSettings', 
                settings: settings 
            }, (response) => {
                resolve(response);
            });
        });
    }
    
    bindEvents() {
        this.elements.mainToggle.addEventListener('change', () => {
            this.saveSettings({ aad_enabled: this.elements.mainToggle.checked });
            this.updateStatus();
        });
        
        this.elements.aggressiveToggle.addEventListener('change', () => {
            this.saveSettings({ aad_aggressive: this.elements.aggressiveToggle.checked });
        });
        
        this.elements.stealthToggle.addEventListener('change', () => {
            this.saveSettings({ aad_stealth: this.elements.stealthToggle.checked });
        });
        
        this.elements.logsToggle.addEventListener('change', () => {
            this.saveSettings({ aad_logs: this.elements.logsToggle.checked });
        });
        
        this.elements.reloadBtn.addEventListener('click', () => {
            this.reloadTab();
        });
        
        this.elements.testBtn.addEventListener('click', () => {
            this.testProtection();
        });
        // Thêm nút Force Reinjection
        const forceBtn = document.getElementById('force-reinject-btn');
        if (forceBtn) {
            forceBtn.addEventListener('click', () => {
                this.forceReinject();
            });
        }
    }
    
    async reloadTab() {
        try {
            await new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: 'reloadTab' }, resolve);
            });
            this.showStatus('Tab reloaded successfully!', 'success');
        } catch (error) {
            this.showStatus('Failed to reload tab', 'error');
        }
    }
    
    async testProtection() {
        this.showStatus('Testing protection...', 'info');
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const tests = {
                        consoleOverride: typeof console.log === 'function',
                        debuggerBlocked: (() => {
                            try {
                                eval('debugger');
                                return false;
                            } catch (e) {
                                return true;
                            }
                        })(),
                        antiDebugLoaded: window.antiAntiDebugLoaded === true
                    };
                    
                    return {
                        success: tests.consoleOverride && tests.debuggerBlocked && tests.antiDebugLoaded,
                        tests: tests
                    };
                }
            });
            
            const testResult = result[0]?.result;
            
            if (testResult?.success) {
                this.showStatus('✅ Protection is working perfectly!', 'success');
            } else {
                this.showStatus('⚠️ Some protections may not be active', 'warning');
            }
        } catch (error) {
            this.showStatus('❌ Test failed', 'error');
        }
    }
    
    updateStatus() {
        const isEnabled = this.elements.mainToggle.checked;
        const statusEl = this.elements.status;
        
        if (isEnabled) {
            statusEl.textContent = '🛡️ Protection Active';
            statusEl.className = 'status active';
        } else {
            statusEl.textContent = '❌ Protection Disabled';
            statusEl.className = 'status inactive';
        }
    }
    
    showStatus(message, type = 'info') {
        const statusEl = this.elements.status;
        statusEl.textContent = message;
        
        statusEl.className = `status ${type}`;
        
        setTimeout(() => {
            this.updateStatus();
        }, 3000);
    }

    // --- Nâng cấp: Thêm nút Force Reinjection và kiểm tra khả năng ẩn mình ---
    async forceReinject() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['injector.js']
            });
            this.showStatus('Force reinjection done!', 'success');
        } catch (error) {
            this.showStatus('Force reinjection failed', 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new UltimateAntiAntiDebug();
}); 