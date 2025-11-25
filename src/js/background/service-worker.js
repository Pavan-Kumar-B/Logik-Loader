// src/js/background/service-worker.js

/**
 * @fileoverview Background Service Worker.
 * Locates the target iframe and loads the handler script.
 */

try {
	importScripts("../config/config.js", "../utils/logger.js");
} catch (e) {
	console.error("Logik Loader (SW): Failed to import dependencies", e);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Initialize logger preferences (async) when SW starts up
logger.init();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	const LOAD_ACTION =
		typeof CONFIG !== "undefined"
			? CONFIG.MESSAGES.LOAD_HANDLER_SCRIPT
			: "LOAD_HANDLER_SCRIPT";

	if (message.action === LOAD_ACTION && sender.tab?.id) {
		// --- KILL SWITCH CHECK ---
		if (CONFIG.SYSTEM.MAINTENANCE_MODE) {
			logger.warn("Maintenance mode active. Halting handler load.");
			sendResponse({
				success: false,
				maintenance: true,
				error: CONFIG.UI.ERRORS.MAINTENANCE_MSG,
			});
			return false;
		}

		const tabId = sender.tab.id;
		const targetName = CONFIG.SYSTEM.TARGET_WINDOW_NAME;

		(async () => {
			try {
				const success = await findAndLoadHandler(tabId, targetName);
				sendResponse({ success: success });
			} catch (error) {
				logger.error(`Error for tab ${tabId}:`, error);
				sendResponse({ success: false, error: error.message });
			}
		})();

		return true; // Keep channel open for async response
	}
	return false;
});

async function findAndLoadHandler(tabId, targetName) {
	const MAX_ATTEMPTS = CONFIG.TIMING.DISCOVERY_MAX_ATTEMPTS;
	const RETRY_DELAY = CONFIG.TIMING.DISCOVERY_RETRY_DELAY_MS;

	// Prepare configuration to embed in the Main World
	const configPayload = {
		MESSAGES: CONFIG.MESSAGES,
		SELECTORS: CONFIG.SELECTORS.INNER_DOM,
		API: CONFIG.API,
		UI: CONFIG.UI,
		DEBUG: logger.isEnabled,
	};

	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			// 1. Discovery
			const discoveryResults = await chrome.scripting.executeScript({
				target: { tabId: tabId, allFrames: true },
				func: (nameToFind) => window.name.startsWith(nameToFind),
				args: [targetName],
			});

			if (!discoveryResults || !Array.isArray(discoveryResults)) {
				await sleep(RETRY_DELAY);
				continue;
			}

			const targetFrame = discoveryResults.find(
				(result) => result.result === true
			);

			if (targetFrame) {
				const targetFrameId = targetFrame.frameId;

				// 2. Inject Configuration (Directly into Main World)
				// No <script> tag created -> No CSP violation.
				await chrome.scripting.executeScript({
					target: { tabId: tabId, frameIds: [targetFrameId] },
					world: "MAIN",
					func: (data) => {
						window.__CPTU_ENV__ = data;
					},
					args: [configPayload],
				});

				// 3. Execute Handler Logic (Directly into Main World)
				// We execute the file content directly.
				await chrome.scripting.executeScript({
					target: { tabId: tabId, frameIds: [targetFrameId] },
					world: "MAIN",
					files: ["src/js/handler/handler.js"],
				});

				logger.info(`Handler executed in frame ${targetFrameId}.`);
				return true;
			}
		} catch (e) {
			if (e.message && e.message.includes("No tab with id")) return false;
			// Specific check for frame issues
			if (e.message.includes("frame")) {
				logger.warn(`Frame access issue on attempt ${attempt}: ${e.message}`);
			}
		}

		await sleep(RETRY_DELAY);
	}
	logger.error("Failed to find target frame after max attempts.");
	return false;
}
