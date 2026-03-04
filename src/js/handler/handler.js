// src/js/handler/handler.js

/**
 * @fileoverview Inner Logic Handler.
 * Loaded into the Logik Iframe by the Service Worker.
 *
 * CONFIGURATION:
 * Reads `window.__CPTU_ENV__` to access centralized configuration.
 * Includes robust local fallbacks to prevent crashes if injection fails.
 */

(function () {
	if (window.CPTU_HANDLER_ACTIVE) {
		return;
	}
    window.CPTU_HANDLER_ACTIVE = true;

	// --- Load Configuration from Environment ---
    const ENV = window.__CPTU_ENV__ || {};

	// 1. Messages Fallback
    const MESSAGES = ENV.MESSAGES || {
        HANDLER_READY: "CPTU_HANDLER_READY",
        ARM_PAYLOAD: "CPTU_ARM_PAYLOAD",
        SESSION_STARTED: "CPTU_SESSION_STARTED",
        POST_SUCCESSFUL: "CPTU_POST_SUCCESSFUL",
        POST_FAILED: "CPTU_POST_FAILED",
        SAVE_SUCCESSFUL: "CPTU_SAVE_SUCCESSFUL",
        DRAFT_REQUESTED: "CPTU_DRAFT_REQUESTED",
        DRAFT_READY: "CPTU_DRAFT_READY",
    };

	// 2. Selectors Fallback
    const SELECTORS = ENV.SELECTORS || {
        QUOTE_BUTTON: "#ReturnButton",
        DRAFT_BUTTON_ID: "cptu-draft-btn-inner",
    };

	// 3. API Fallback
    const API = ENV.API || {
        BASE_POST_TARGET: "/c",
        QUERY_PARAM_SAVE: "?save=true",
        PATCH_REGEX_STRING: "\\/c\\/[a-f0-9-]+$",
    };

	// 4. UI Fallback
    const UI = ENV.UI || {
        BUTTONS: {
            DRAFT_LABEL: "Draft",
            DRAFT_TOOLTIP: "Save session as a draft JSON file",
        },
    };

	// Reconstruct Regex
    const PATCH_REGEX = new RegExp(
        API.PATCH_REGEX_STRING || "\\/c\\/[a-f0-9-]+$",
        "i"
    );

	// --- Internal Logger ---
	// Robust check for debug flag
    const DEBUG_ENABLED = !!ENV.DEBUG;

    const log = {
        info: (...args) => {
            if (DEBUG_ENABLED)
                console.log(`%c[Logik Loader Handler]:`, "color: #0078d7", ...args);
        },
        warn: (...args) => {
            if (DEBUG_ENABLED)
                console.warn(`%c[Logik Loader Handler]:`, "color: #f7b231", ...args);
        },
        error: (...args) => {
			// Always log errors, style if debug on
            if (DEBUG_ENABLED)
                console.error(
                    `%c[Logik Loader Handler ERROR]:`,
                    "color: #d93025",
                    ...args
                );
            else console.error("[Logik Loader Handler ERROR]:", ...args);
        },
    };

	// --- State Variables ---
    let PARENT_ORIGIN = null;
    let payloadToLoad = null;
    let originalUserInputPayload = null;
    let originalUserInputFieldsFlat = [];
    let originalFieldMap = new Map();
    let mismatchMsgMap = new Map();

    const CUSTOM_ICON_URL =
        "https://cdn-icons-png.flaticon.com/512/10480/10480193.png";

    function getFieldKey(field) {
        if (!field) return null;
        if (field.variableName && field.set && typeof field.index !== "undefined") {
            return `${field.variableName}|${field.set}|${field.index}`;
        }
        return field.uniqueName || field.variableName || null;
    }

    function mismatchKeyFromField(field) {
        return (
            getFieldKey(field) ||
            `${field?.variableName || ""}|${field?.set || ""}|${field?.index ?? ""}`
        );
    }

    function areValuesEqual(val1, val2) {
        const isNil = (v) => v === null || v === undefined;

        if ((isNil(val1) && val2 === "") || (isNil(val2) && val1 === "")) return true;
        if (isNil(val1) && isNil(val2)) return true;

        const toBool = (v) => {
            if (v === true || v === false) return v;
            if (typeof v === "string") {
                const s = v.trim().toLowerCase();
                if (s === "true") return true;
                if (s === "false") return false;
            }
            return undefined;
        };

        const b1 = toBool(val1);
        const b2 = toBool(val2);
        if (b1 !== undefined && b2 !== undefined) return b1 === b2;

        const toNum = (v) => {
            if (typeof v === "number") return v;
            if (typeof v === "string") {
                const s = v.trim();
                if (s !== "" && !isNaN(Number(s))) return Number(s);
            }
            return undefined;
        };

        const n1 = toNum(val1);
        const n2 = toNum(val2);
        if (n1 !== undefined && n2 !== undefined) return n1 === n2;

        if (Array.isArray(val1) && Array.isArray(val2)) {
            return JSON.stringify(val1) === JSON.stringify(val2);
        }

        if (typeof val1 === "string" && typeof val2 === "string") {
            const d1 = new Date(val1);
            const d2 = new Date(val2);
            if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
				return (
					d1.toISOString().split("T")[0] === d2.toISOString().split("T")[0]
				);
            }
        }

        // eslint-disable-next-line eqeqeq
        return val1 == val2;
    }

    function formatValueForDisplay(val) {
        if (typeof val === "string") {
            const d = new Date(val);
            if (!isNaN(d.getTime()) && val.includes("-")) {
                try {
                    return d.toISOString().split("T")[0];
                } catch (e) {
                    return val;
                }
            }
        }
        return val;
    }

    function isFieldLike(obj) {
        return (
            obj &&
            typeof obj === "object" &&
            typeof obj.variableName === "string" &&
            "value" in obj
        );
    }

    function isContainerField(obj) {
        return !!(obj && obj.rows && Array.isArray(obj.rows.content));
    }

    function extractLeafFieldsFast(input, opts = {}) {
        const { maxNodes = 20000 } = opts;

        const out = [];
        const stack = [input];
        const seen = new WeakSet();
        let visited = 0;

        while (stack.length) {
            const node = stack.pop();
            if (!node) continue;

            if (Array.isArray(node)) {
                for (let i = 0; i < node.length; i++) stack.push(node[i]);
                continue;
            }

            if (typeof node !== "object") continue;
            if (visited++ > maxNodes) break;

            if (seen.has(node)) continue;
            seen.add(node);

            if (isFieldLike(node) && !isContainerField(node)) out.push(node);

            if (Array.isArray(node.fields)) {
                for (let i = 0; i < node.fields.length; i++) stack.push(node.fields[i]);
            }

            if (node.rows && Array.isArray(node.rows.content)) {
                const content = node.rows.content;
                for (let i = 0; i < content.length; i++) {
                    const row = content[i];
                    if (row && Array.isArray(row.fields)) {
                        for (let j = 0; j < row.fields.length; j++) stack.push(row.fields[j]);
                    } else {
                        stack.push(row);
                    }
                }
            }
        }

        return out;
    }

    function extractLeafFieldsSmart(input) {
        const fast = extractLeafFieldsFast(input);
        if (fast.length) return fast;

        if (input && typeof input === "object") {
            if (input.fields) {
                const f = extractLeafFieldsFast(input.fields);
                if (f.length) return f;
            }
            if (input.payload) {
                const p = extractLeafFieldsFast(input.payload);
                if (p.length) return p;
            }
            if (input.data) {
                const d = extractLeafFieldsFast(input.data);
                if (d.length) return d;
            }
        }

        return fast;
    }

    function buildDiffMessage(originalField, serverField) {
        const displayValue = formatValueForDisplay(originalField.value);

        const msg = {
            message: `Old Value : ${displayValue}`,
            type: "custom",
            error: false,
            target: serverField.variableName,
            targetType: "field",
            field: serverField.variableName,
            color: "#ef641fff",
            icon: CUSTOM_ICON_URL,
            _cptuKey: mismatchKeyFromField(serverField),
        };

        if (Object.prototype.hasOwnProperty.call(serverField, "index")) msg.index = serverField.index;
        if (Object.prototype.hasOwnProperty.call(serverField, "set")) msg.set = serverField.set;

        return msg;
    }

    function generateDiffMessages(userInputFields, serverResponseFields) {
        const diffs = [];
        if (!Array.isArray(userInputFields) || !Array.isArray(serverResponseFields)) return diffs;

        const serverMap = new Map();
        for (const f of serverResponseFields) {
            const key = getFieldKey(f);
            if (key) serverMap.set(key, f);
        }

        for (const userField of userInputFields) {
            const key = getFieldKey(userField);
            if (!key) continue;

            const serverField = serverMap.get(key);
            if (serverField && !areValuesEqual(userField.value, serverField.value)) {
                diffs.push(buildDiffMessage(userField, serverField));
            }
        }

        return diffs;
    }

	// --- Inner UI Manager ---

    const DraftButtonManager = {
        animationInterval: null,

        resetButton() {
            const btn = document.getElementById(SELECTORS.DRAFT_BUTTON_ID);
            if (!btn) return;

            clearInterval(this.animationInterval);
            this.animationInterval = null;

            btn.textContent =
                UI.BUTTONS && UI.BUTTONS.DRAFT_LABEL ? UI.BUTTONS.DRAFT_LABEL : "Draft";
            btn.disabled = false;
            btn.classList.remove("slds-is-loading");
        },

        removeButton() {
            const btn = document.getElementById(SELECTORS.DRAFT_BUTTON_ID);
            if (btn) {
                btn.remove();
                log.info("Draft button removed (Quote clicked).");
            }
        },

        createButton() {
			// Prevent duplicate button creation
            if (document.getElementById(SELECTORS.DRAFT_BUTTON_ID)) return;

			// Find the Return/Quote button
            const quoteBtn = document.querySelector(SELECTORS.QUOTE_BUTTON);
			if (!quoteBtn) {
				console.warn(
					"DraftButtonManager: Quote/Return button not found for selector:",
					SELECTORS.QUOTE_BUTTON
				);
				return;
			}

			// Create the Draft button
            const btn = document.createElement("button");
            btn.id = SELECTORS.DRAFT_BUTTON_ID;
            btn.type = "button";
            btn.className = "slds-button slds-button_brand header-button";
            btn.style.margin = "0 0.5rem";
            btn.style.padding = "0 0.5rem";
            btn.style.minWidth = "90px";
            btn.style.fontWeight = "600";

			// Label & tooltip
            btn.textContent =
                UI.BUTTONS && UI.BUTTONS.DRAFT_LABEL ? UI.BUTTONS.DRAFT_LABEL : "Draft";
            btn.title =
                UI.BUTTONS && UI.BUTTONS.DRAFT_TOOLTIP
                    ? UI.BUTTONS.DRAFT_TOOLTIP
                    : "Save Draft";
            btn.setAttribute("aria-label", btn.title);

			// Click handler with loading animation
            btn.onclick = (e) => {
                e.preventDefault();
                if (!PARENT_ORIGIN) {
                    alert("Logik Loader: Parent connection lost.");
                    return;
                }

				// Start loading animation
				btn.disabled = true;
                btn.classList.add("slds-is-loading");

                let dots = 0;
                btn.textContent = "Drafting";
                this.animationInterval = setInterval(() => {
                    dots = (dots + 1) % 4;
                    btn.textContent = "Drafting" + ".".repeat(dots);
                }, 400);

                window.parent.postMessage({ type: MESSAGES.DRAFT_REQUESTED }, PARENT_ORIGIN);
            };

            quoteBtn.parentNode.insertBefore(btn, quoteBtn);
        },

        initObserver() {
            const observer = new MutationObserver((mutations, obs) => {
                const quoteBtn = document.querySelector(SELECTORS.QUOTE_BUTTON);
                if (!quoteBtn) return;

                this.createButton();
                quoteBtn.addEventListener("click", () => this.removeButton());
                obs.disconnect();
            });

            observer.observe(document.body, { childList: true, subtree: true });

			// Safety timeout to avoid leaking observers
            setTimeout(() => observer.disconnect(), 10000);
        },
    };

	// --- Message Listener ---

    window.addEventListener("message", (event) => {
        if (!PARENT_ORIGIN && event.data?.type === MESSAGES.ARM_PAYLOAD) {
            PARENT_ORIGIN = event.origin;
        }
        if (PARENT_ORIGIN && event.origin !== PARENT_ORIGIN) return;

        if (event.data?.type === MESSAGES.ARM_PAYLOAD && event.data.payload) {
            const { fullPayload, productId } = event.data.payload;

            payloadToLoad = {
                ...fullPayload,
                fields: fullPayload?.fields,
                productId: productId ?? fullPayload?.productId,
                sessionContext: { stateful: true },
            };

            originalUserInputPayload = JSON.parse(JSON.stringify(payloadToLoad));
            originalUserInputFieldsFlat = extractLeafFieldsSmart(originalUserInputPayload);

            originalFieldMap = new Map();
            for (const f of originalUserInputFieldsFlat) {
                const k = getFieldKey(f);
                if (k) originalFieldMap.set(k, f);
            }

            mismatchMsgMap = new Map();
            log.info("Payload armed. Cached leaf fields:", originalUserInputFieldsFlat.length);
        }

        if (event.data?.type === MESSAGES.DRAFT_READY) {
            DraftButtonManager.resetButton();
        }
    });

	// --- Init ---
    try {
        window.parent.postMessage({ type: MESSAGES.HANDLER_READY }, "*");
    } catch (e) {
        log.error("Handshake failed.", e);
    }

	// --- XHR Augmentation ---

    if (!XMLHttpRequest.prototype.send.isEnhanced) {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url) {
            this._cptu_data = { method, url };
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function (body) {
            const { method, url } = this._cptu_data || {};

			// 1. Process Initial POST
            if (
                payloadToLoad &&
                url?.includes(API.BASE_POST_TARGET) &&
                method?.toUpperCase() === "POST"
            ) {
                const newBody = JSON.stringify(payloadToLoad);
                payloadToLoad = null;

                this.addEventListener("load", function () {
                    if (this.status >= 200 && this.status < 300) {
                        try {
                            const res = JSON.parse(this.responseText);

                            if (originalUserInputPayload) {
                                const serverFieldsFlat = extractLeafFieldsSmart(res.fields || res);
                                const diffs = generateDiffMessages(
                                    originalUserInputFieldsFlat,
                                    serverFieldsFlat
                                );

                                mismatchMsgMap = new Map();
                                for (const msg of diffs) {
                                    if (msg && msg._cptuKey) mismatchMsgMap.set(msg._cptuKey, msg);
                                }

                                if (diffs.length > 0) {
                                    res.messages = (res.messages || []).concat(diffs);
                                }
                            }

                            const newText = JSON.stringify(res);
                            Object.defineProperty(this, "responseText", { value: newText });
                            Object.defineProperty(this, "response", { value: newText });

                            if (PARENT_ORIGIN) {
                                window.parent.postMessage(
                                    { type: MESSAGES.POST_SUCCESSFUL },
                                    PARENT_ORIGIN
                                );
                                if (res.uuid) {
                                    window.parent.postMessage(
                                        { type: MESSAGES.SESSION_STARTED, uuid: res.uuid },
                                        PARENT_ORIGIN
                                    );
                                }
                            }

                            DraftButtonManager.initObserver();
                        } catch (e) {
                            log.error("Error processing POST response.", e);
                        }
                    } else if (PARENT_ORIGIN) {
                        window.parent.postMessage(
                            {
                                type: MESSAGES.POST_FAILED,
                                status: this.status,
                                responseText: this.responseText,
                            },
                            PARENT_ORIGIN
                        );
                    }
                });

                return originalSend.apply(this, [newBody]);
            }

			// 2. Process Interactive PATCH
            const isInteractivePatch =
                method?.toUpperCase() === "PATCH" && PATCH_REGEX.test(url);

            if (isInteractivePatch) {
                let parsedBody = {};
                try {
                    parsedBody = JSON.parse(body || "{}");
                } catch (e) {
                    parsedBody = {};
                }

                const userInputDelta = extractLeafFieldsSmart(parsedBody);

                this.addEventListener("load", function () {
                    if (this.status >= 200 && this.status < 300) {
                        try {
                            const res = JSON.parse(this.responseText);
                            const serverDelta = extractLeafFieldsSmart(res.fields || res);

                            const upsertMismatch = (field) => {
                                const key = getFieldKey(field);
                                if (!key) return;

                                const orig = originalFieldMap.get(key);
                                if (!orig) return;

                                const mKey = mismatchKeyFromField(field);

                                if (!areValuesEqual(field.value, orig.value)) {
                                    mismatchMsgMap.set(mKey, buildDiffMessage(orig, field));
                                } else {
                                    mismatchMsgMap.delete(mKey);
                                }
                            };

                            for (const f of userInputDelta) upsertMismatch(f);
                            for (const f of serverDelta) upsertMismatch(f);

                            const baseMsgs = (res.messages || []).filter(
                                (m) =>
                                    !(
                                        m &&
                                        m.type === "custom" &&
                                        (m.icon === CUSTOM_ICON_URL || m._cptuKey)
                                    )
                            );

                            res.messages = baseMsgs.concat(Array.from(mismatchMsgMap.values()));

                            const newText = JSON.stringify(res);
                            Object.defineProperty(this, "responseText", { value: newText });
                            Object.defineProperty(this, "response", { value: newText });
                        } catch (e) {
                            log.error("Error processing PATCH response.", e);
                        }
                    }
                });

                return originalSend.apply(this, arguments);
            }

			// 3. Process Save PATCH
            if (
                url?.includes(API.QUERY_PARAM_SAVE) &&
                method?.toUpperCase() === "PATCH"
            ) {
                this.addEventListener("load", function () {
                    if (this.status >= 200 && this.status < 300) {
                        try {
                            const res = JSON.parse(this.responseText);
                            if (res.uuid && PARENT_ORIGIN) {
                                window.parent.postMessage(
                                    { type: MESSAGES.SAVE_SUCCESSFUL, uuid: res.uuid },
                                    PARENT_ORIGIN
                                );
                            }
                        } catch (e) {
                            log.error("Error processing SAVE PATCH response.", e);
                        }
                    }
                });
                return originalSend.apply(this, arguments);
            }

            return originalSend.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send.isEnhanced = true;
        log.info("XHR Augmented.");
    }
})();
