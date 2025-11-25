// src/js/content/entry.js

/**
 * @fileoverview Entry Point for the Content Script.
 * Bootstraps the application sequence.
 */

(async function bootstrap() {
    await logger.init();

    logger.group("Logik Loader Bootstrap");
    
    const initSequence = async () => {
        try {
            logger.info("DOM Ready. Starting initialization sequence...");

            if (CONFIG.SYSTEM.MAINTENANCE_MODE) {
                logger.warn("System is in Maintenance Mode. Aborting startup.");
                logger.groupEnd();
                return;
            }

            if (typeof stateManager !== 'undefined') {
                stateManager.init();
            } else {
                throw new Error("StateManager not loaded.");
            }

            if (typeof uiManager !== 'undefined') {
                uiManager.init();
            } else {
                throw new Error("UIManager not loaded.");
            }

            if (typeof window.controller !== 'undefined') {
                window.controller.init();
            } else {
                throw new Error("Controller not loaded.");
            }

            logger.info("Initialization sequence complete.");

        } catch (error) {
            logger.error("Fatal Bootstrap Error:", error);
            if (typeof uiManager !== 'undefined') {
                uiManager.setStatus(CONFIG.UI.ERRORS.CRITICAL_INIT, "red");
            }
        } finally {
            logger.groupEnd();
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSequence);
    } else {
        initSequence();
    }

})();