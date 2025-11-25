// src/js/utils/logger.js

/**
 * @fileoverview Robust logging utility.
 * Wraps console methods to ensure logs only appear when allowed.
 * Automatically detects the calling file to provide context in logs.
 */

class Logger {
    constructor() {
        this._debugEnabled = false;
    }

    /**
     * Initialize the logger by reading preference from storage.
     * @returns {Promise<void>}
     */
    async init() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const result = await chrome.storage.local.get(CONFIG.SYSTEM.STORAGE_KEY_DEBUG);
                this._debugEnabled = !!result[CONFIG.SYSTEM.STORAGE_KEY_DEBUG];
                // Use internal console here to avoid recursion during init
                if (this._debugEnabled) {
                    console.log(`%c[Logik Loader][logger.js]: Logger initialized. Debug mode: ON`, 'color: #0078d7; font-weight: bold;');
                }
            }
        } catch (e) {
            console.error("Logik Loader: Failed to init logger preference.", e);
        }
    }

    /**
     * Enable or disable logging dynamically.
     * @param {boolean} isEnabled 
     */
    setEnabled(isEnabled) {
        this._debugEnabled = isEnabled;
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ [CONFIG.SYSTEM.STORAGE_KEY_DEBUG]: isEnabled });
        }
        console.log(`[Logik Loader] Debug mode set to: ${isEnabled}`);
    }

    get isEnabled() {
        return this._debugEnabled;
    }

    /**
     * Helper to extract the filename of the caller from the stack trace.
     * @private
     */
    _getCallerTag() {
        try {
            const stack = new Error().stack;
            if (!stack) return '';

            const lines = stack.split('\n');
            // Iterate to find the first line that isn't this logger file
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].includes('logger.js')) {
                    // Regex to extract filename (e.g., controller.js) from path
                    const match = lines[i].match(/([a-zA-Z0-9_-]+\.js):/);
                    if (match && match[1]) {
                        return `[${match[1]}]`;
                    }
                }
            }
        } catch (e) {
            return '';
        }
        return '';
    }

    /**
     * Log info message if debug is enabled.
     */
    log(...args) {
        if (this._debugEnabled) {
            const tag = this._getCallerTag();
            console.log(`%c[Logik Loader]${tag}:`, 'color: #0078d7; font-weight: bold;', ...args);
        }
    }

    /**
     * Log info (alias).
     */
    info(...args) {
        this.log(...args);
    }

    /**
     * Log warning if debug is enabled.
     */
    warn(...args) {
        if (this._debugEnabled) {
            const tag = this._getCallerTag();
            console.warn(`%c[Logik Loader WARN]${tag}:`, 'color: #f7b231; font-weight: bold;', ...args);
        }
    }

    /**
     * Log error. Always logs, but adds tag and styling if debug is on.
     */
    error(...args) {
        if (this._debugEnabled) {
            const tag = this._getCallerTag();
            console.error(`%c[Logik Loader ERROR]${tag}:`, 'color: #d93025; font-weight: bold;', ...args);
        } else {
            // Production log (cleaner, relying on browser's own stack trace)
            console.error("[Logik Loader ERROR]:", ...args);
        }
    }

    /**
     * Start a collapsed group.
     */
    group(label) {
        if (this._debugEnabled) {
            const tag = this._getCallerTag();
            console.groupCollapsed(`%c[Logik Loader]${tag}: ${label}`, 'color: #555; font-weight: bold;');
        }
    }

    /**
     * End the current group.
     */
    groupEnd() {
        if (this._debugEnabled) {
            console.groupEnd();
        }
    }
}

// Export a singleton instance
const logger = new Logger();