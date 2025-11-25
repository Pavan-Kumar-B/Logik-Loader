// src/js/content/state-manager.js

/**
 * @fileoverview State Management Module.
 * Holds the runtime data (UUIDs, Flags, Iframe References).
 */

class StateManager {
    constructor() {
        this._logikIframeWindow = null;
        this._handlerLoaded = false;
        this._sessionUUID = null;
        
        this.panelDrag = {
            isDragging: false,
            offsetX: 0,
            offsetY: 0
        };
    }

    init() {
        this._exposeDeveloperHelpers();
        logger.info("StateManager initialized.");
    }

    // --- Getters ---

    get isHandlerLoaded() { return this._handlerLoaded; }
    get isHandlerReady() { return this._handlerLoaded && this._logikIframeWindow !== null; }
    get iframeWindow() { return this._logikIframeWindow; }
    get sessionUUID() { return this._sessionUUID; }

    // --- Setters & Actions ---

    setHandlerReady(sourceWindow) {
        this._logikIframeWindow = sourceWindow;
        this._handlerLoaded = true;
        logger.info("State: Handler marked as READY.");
    }

    setSessionUUID(uuid) {
        this._sessionUUID = uuid;
        logger.info(`State: Session UUID set to ${uuid}`);
    }

    resetSession() {
        this._sessionUUID = null;
        logger.info("State: Session data reset.");
    }

    sendMessageToHandler(type, payload = {}) {
        if (this.isHandlerReady) {
            this._logikIframeWindow.postMessage(
                { type: type, payload: payload },
                window.location.origin
            );
        } else {
            logger.warn("State: Cannot send message. Handler not ready.");
        }
    }

    _exposeDeveloperHelpers() {
        try {
            window.CPTU = window.CPTU || {};
            
            window.CPTU.getSessionUUID = () => {
                return this._sessionUUID || CONFIG.UI.DEV.NO_SESSION;
            };

            window.CPTU.copySessionUUID = async () => {
                if (!this._sessionUUID) {
                    console.warn(CONFIG.UI.DEV.NO_UUID_TO_COPY);
                    return false;
                }
                const success = await Utils.copyToClipboard(this._sessionUUID);
                if (success) console.log(CONFIG.UI.DEV.UUID_COPIED);
                return success;
            };

            logger.info(CONFIG.UI.DEV.EXPOSED_MSG);
        } catch (e) {
            logger.error("Failed to expose developer helpers", e);
        }
    }
}

const stateManager = new StateManager();