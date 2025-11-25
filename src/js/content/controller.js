// src/js/content/controller.js

/**
 * @fileoverview Main Logic Controller.
 * Orchestrates interactions between UI, State, and Inner Handler.
 */

class Controller {
	constructor() {
		this.handleWindowMessage = this.handleWindowMessage.bind(this);
		this.handleEnableToggle = this.handleEnableToggle.bind(this);
		this.handlePageUpdateClick = this.handlePageUpdateClick.bind(this);
		this.handleDraftRequest = this.handleDraftRequest.bind(this);
		this.handleDrop = this.handleDrop.bind(this);
		this.validateAndArm = this.validateAndArm.bind(this);
		this.handleSoftReset = this.handleSoftReset.bind(this);

		this.debouncedValidate = Utils.debounce(
			this.validateAndArm,
			CONFIG.TIMING.DEBOUNCE_DELAY_MS
		);
	}

	init() {
		logger.group("Controller Initialization");

		if (CONFIG.SYSTEM.MAINTENANCE_MODE) {
			logger.warn("Maintenance mode active. Aborting initialization.");
			uiManager.setStatus(CONFIG.UI.ERRORS.MAINTENANCE_MSG, "red");
			const els = uiManager.getElements();
			if (els.enableToggle) els.enableToggle.disabled = true;
			logger.groupEnd();
			return;
		}

		window.addEventListener("message", this.handleWindowMessage);

		const elements = uiManager.getElements();

		if (elements.enableToggle) {
			elements.enableToggle.addEventListener("change", this.handleEnableToggle);
		}

		if (elements.btn) {
			elements.btn.onclick = () => uiManager.openPanel();
		}

		if (elements.closeBtn) {
			elements.closeBtn.onclick = () => uiManager.closePanel();
		}

		if (elements.sidebarDraftButton) {
			elements.sidebarDraftButton.onclick = this.handleDraftRequest;
		}

		if (elements.pageUpdateButton) {
			elements.pageUpdateButton.addEventListener(
				"click",
				this.handlePageUpdateClick
			);
		}

		logger.info("Controller initialized. Waiting for user input.");
		logger.groupEnd();
	}

	/**
	 * Helper to check if extension is active.
	 */
	_isEnabled() {
		const els = uiManager.getElements();
		return els.enableToggle && els.enableToggle.checked;
	}

	async handleEnableToggle(event) {
		const isEnabled = event.target.checked;
		uiManager.updatePageTitle(isEnabled);

		if (isEnabled) {
			logger.info("Extension Enabled. Starting activation...");
			uiManager.togglePanelContent(true);
			uiManager.toggleHeaderInputs(true, true);

			this._bindInputListeners(true);

			if (!stateManager.isHandlerLoaded) {
				uiManager.showInitializingState();

				chrome.runtime.sendMessage(
					{
						action: CONFIG.MESSAGES.LOAD_HANDLER_SCRIPT,
						targetName: CONFIG.SYSTEM.TARGET_WINDOW_NAME,
					},
					(response) => {
						if (chrome.runtime.lastError) {
							const msg = chrome.runtime.lastError.message;
							if (msg.includes("message channel closed")) {
								logger.warn("Message channel closed during load. Ignoring.");
								return;
							}
							logger.error("Communication error:", msg);
							uiManager.setStatus(CONFIG.UI.ERRORS.GENERIC_FAIL, "red");
							return;
						}

						if (response && response.maintenance) {
							logger.warn(
								"Service Worker refused connection (Maintenance Mode)."
							);
							uiManager.setStatus(CONFIG.UI.ERRORS.MAINTENANCE_MSG, "red");
							event.target.checked = false;
							this.handleEnableToggle({ target: { checked: false } });
							return;
						}

						if (!response || !response.success) {
							logger.error("Background script failed to load handler.");
							uiManager.setStatus(CONFIG.UI.ERRORS.HANDLER_FAIL, "red");
						} else {
							logger.info("Handler load initiated via Background Script.");
						}
					}
				);
			} else {
				this.validateAndArm();
				uiManager.resetForNewSession(true, false);
			}
		} else {
			if (stateManager.isHandlerLoaded) {
				const confirmed = await uiManager.showConfirmationModal(
					CONFIG.UI.PROMPTS.DISABLE_WARNING
				);
				if (confirmed) {
					window.location.reload();
				} else {
					event.target.checked = true;
					uiManager.updatePageTitle(true);
				}
			} else {
				uiManager.togglePanelContent(false);
				uiManager.toggleHeaderInputs(false);
				this._bindInputListeners(false);
				uiManager.hideOverlay();
			}
		}
	}

	_bindInputListeners(bind) {
		const elements = uiManager.getElements();
		if (bind) {
			if (elements.textarea) {
				elements.textarea.addEventListener("input", this.debouncedValidate);
				elements.textarea.addEventListener("drop", this.handleDrop);
			}
			if (elements.productIdInput) {
				elements.productIdInput.addEventListener("input", this.validateAndArm);
			}
			if (elements.fileInput) {
				elements.fileInput.addEventListener("change", (e) =>
					this._handleFileImport(e)
				);
			}
		} else {
			if (elements.textarea) {
				elements.textarea.removeEventListener("input", this.debouncedValidate);
				elements.textarea.removeEventListener("drop", this.handleDrop);
			}
			if (elements.productIdInput) {
				elements.productIdInput.removeEventListener(
					"input",
					this.validateAndArm
				);
			}
		}
	}

	_handleFileImport(event) {
		if (!this._isEnabled()) return;
		const file = event.target?.files?.[0];
		this._processFile(file);
		event.target.value = "";
	}

	handleDrop(event) {
		if (!this._isEnabled()) return;
		event.preventDefault();
		event.stopPropagation();
		uiManager.setDragVisualState(false);
		const file = event.dataTransfer?.files?.[0];
		this._processFile(file);
	}

	_processFile(file) {
		if (!file) return;

		if (
			file.type &&
			!file.type.match("application/json") &&
			!file.name.endsWith(".json")
		) {
			uiManager.setStatus(CONFIG.UI.ERRORS.INVALID_FILE, "red");
			return;
		}

		uiManager.setStatus(
			CONFIG.UI.STATUS.LOADING_FILE + " " + CONFIG.ASSETS.LOADER_HTML,
			"black",
			true
		);

		setTimeout(() => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const text = e.target?.result;

				uiManager.setStatus(
					CONFIG.UI.STATUS.PARSING + " " + CONFIG.ASSETS.LOADER_HTML,
					"blue",
					true
				);

				setTimeout(() => {
					try {
						const els = uiManager.getElements();
						const rawObj = JSON.parse(text);

						if (rawObj && Array.isArray(rawObj.fields)) {
							const cleanObj = { fields: rawObj.fields };
							if (els.textarea)
								els.textarea.value = JSON.stringify(cleanObj, null, 2);
							this.validateAndArm(cleanObj);
							logger.info(`Loaded and cleaned file: ${file.name}`);
						} else {
							if (els.textarea) els.textarea.value = text;
							this.validateAndArm(rawObj);
						}
					} catch (parseError) {
						logger.error("File parse error", parseError);
						uiManager.setStatus("❌ Error parsing JSON file.", "red");
					}
				}, 50);
			};
			reader.onerror = () =>
				uiManager.setStatus(CONFIG.UI.ERRORS.FILE_READ_FAIL, "red");
			reader.readAsText(file);
		}, 50);
	}

	validateAndArm(directData = null) {
		if (!this._isEnabled()) return;

		const els = uiManager.getElements();
		const productId = els.productIdInput?.value;
		let validPayload = null;

		const isDirectPayload =
			directData &&
			typeof directData === "object" &&
			Array.isArray(directData.fields);

		if (isDirectPayload) {
			if (productId) {
				validPayload = { fullPayload: directData, productId: productId };
				this._finalizeValidation(validPayload);
			} else {
				this._finalizeValidation(null);
			}
			return;
		}

		const jsonString = els.textarea?.value;
		if (!jsonString || !jsonString.trim()) {
			this._finalizeValidation(null);
			return;
		}

		uiManager.setStatus(
			CONFIG.UI.STATUS.PARSING + " " + CONFIG.ASSETS.LOADER_HTML,
			"blue",
			true
		);

		setTimeout(() => {
			try {
				const rawParsed = JSON.parse(jsonString);
				if (rawParsed && Array.isArray(rawParsed.fields)) {
					const keys = Object.keys(rawParsed);
					const isClean = keys.length === 1 && keys[0] === "fields";

					if (!isClean) {
						const cleanObj = { fields: rawParsed.fields };
						if (els.textarea)
							els.textarea.value = JSON.stringify(cleanObj, null, 2);
						const payload = Utils.validatePayload(
							JSON.stringify(cleanObj),
							productId
						);
						this._finalizeValidation(payload);
						return;
					}
				}
			} catch (e) {}

			const payload = Utils.validatePayload(jsonString, productId);
			this._finalizeValidation(payload);
		}, 50);
	}

	_finalizeValidation(validPayload) {
		const els = uiManager.getElements();

		if (validPayload) {
			if (stateManager.isHandlerReady) {
				stateManager.sendMessageToHandler(
					CONFIG.MESSAGES.ARM_PAYLOAD,
					validPayload
				);
				if (els.pageUpdateButton) els.pageUpdateButton.disabled = false;
				uiManager.setStatus(CONFIG.UI.STATUS.ARMED, "green");
				logger.info("Payload valid and armed.");
			} else {
				uiManager.setStatus(
					CONFIG.UI.STATUS.WAITING + " (Handler not ready)",
					"orange"
				);
			}
		} else {
			if (els.pageUpdateButton) els.pageUpdateButton.disabled = true;
			if (els.enableToggle?.checked) {
				uiManager.setStatus(CONFIG.UI.STATUS.WAITING);
			}
		}
	}

	handlePageUpdateClick() {
		if (!this._isEnabled()) return;

		logger.info("Main Update clicked. Locking UI.");

		const els = uiManager.getElements();
		const jsonString = els.textarea?.value;
		const productId = els.productIdInput?.value;
		const payload = Utils.validatePayload(jsonString, productId);

		if (payload && stateManager.isHandlerReady) {
			stateManager.sendMessageToHandler(CONFIG.MESSAGES.ARM_PAYLOAD, payload);
		}

		if (els.textarea) els.textarea.value = "";

		uiManager.showInitializingState();

		stateManager.resetSession();
	}

	async handleSoftReset(isSaved = false) {
		if (!this._isEnabled()) return;

		logger.info(`User requested Soft Reset (Saved: ${isSaved}).`);

		if (!isSaved) {
			const confirmed = await uiManager.showConfirmationModal(
				CONFIG.UI.PROMPTS.CONFIRM_RESET
			);
			if (!confirmed) return;
			uiManager.resetForNewSession(true, false);
		} else {
			uiManager.resetForNewSession(true, true);
		}
		this.validateAndArm();
	}

	async handleDraftRequest(context = "draft") {
		if (!this._isEnabled()) return;

		const uuid = stateManager.sessionUUID;
		if (!uuid) {
			uiManager.showAlert(CONFIG.UI.ERRORS.NO_UUID);
			return;
		}

		const loadingText =
			context === "download"
				? CONFIG.UI.STATUS.FETCHING_SESSION
				: CONFIG.UI.STATUS.FETCHING;
		uiManager.setStatus(
			`${loadingText} ${CONFIG.ASSETS.LOADER_HTML}`,
			"blue",
			true
		);

		const apiUrl = `${window.location.origin}/c/${uuid}`;

		try {
			const response = await fetch(apiUrl);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			const data = await response.json();
			logger.info("Draft data fetched. Prompting user.");

			if (context === "download") {
				uiManager.handleSaveSuccess(uuid);
			} else {
				uiManager.showActiveSessionState();
			}

			uiManager.showNamePrompt(data, uuid, context);
		} catch (error) {
			logger.error("Draft fetch failed:", error);
			uiManager.setStatus(CONFIG.UI.ERRORS.FETCH_FAIL, "red");
		} finally {
			if (stateManager.isHandlerReady) {
				stateManager.sendMessageToHandler(CONFIG.MESSAGES.DRAFT_READY);
			}
		}
	}

	handleWindowMessage(event) {
		if (!this._isEnabled()) return;

		if (event.origin !== window.location.origin) return;

		if (stateManager.isHandlerLoaded && stateManager.iframeWindow) {
			if (event.source !== stateManager.iframeWindow) return;
		}

		const { type, uuid, status, responseText } = event.data;

		if (!Object.values(CONFIG.MESSAGES).includes(type)) return;

		logger.group(`Received: ${type}`);

		switch (type) {
			case CONFIG.MESSAGES.HANDLER_READY:
				stateManager.setHandlerReady(event.source);
				this.validateAndArm();

				uiManager.resetForNewSession(true, false);
				break;

			case CONFIG.MESSAGES.SESSION_STARTED:
				stateManager.setSessionUUID(uuid);
				break;

			case CONFIG.MESSAGES.POST_SUCCESSFUL:
				uiManager.showActiveSessionState();
				if (uiManager.getElements().pageUpdateButton) {
					uiManager.getElements().pageUpdateButton.disabled = true;
				}
				break;

			case CONFIG.MESSAGES.POST_FAILED:
				uiManager.handlePostError(status, responseText);
				if (uiManager.getElements().pageUpdateButton) {
					uiManager.getElements().pageUpdateButton.disabled = false;
				}
				break;

			case CONFIG.MESSAGES.SAVE_SUCCESSFUL:
				uiManager.handleSaveSuccess(uuid);
				break;

			case CONFIG.MESSAGES.DRAFT_REQUESTED:
				logger.info("Inner Draft Button clicked.");
				this.handleDraftRequest("draft");
				break;
		}

		logger.groupEnd();
	}
}

window.controller = new Controller();
