// src/js/utils/common.js

/**
 * @fileoverview Shared utility functions for DOM manipulation, timing, and I/O.
 * Contains the Critical Fix for "White Screen" memory issues (debounce).
 */

const Utils = {
	/**
	 * Delays the execution of a function until a certain amount of time has passed.
	 * @param {Function} func
	 * @param {number} wait
	 * @returns {Function}
	 */
	debounce(func, wait) {
		let timeout;
		return function (...args) {
			const context = this;
			clearTimeout(timeout);
			timeout = setTimeout(() => {
				func.apply(context, args);
			}, wait);
		};
	},

	getElement(selector, context = document) {
		if (!selector) return null;
		return context.querySelector(selector);
	},

	sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	},

	async copyToClipboard(text) {
		if (!navigator.clipboard) return false;
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch (err) {
			logger.error("Copy failed", err);
			return false;
		}
	},

	downloadJson(data, filename) {
		try {
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			setTimeout(() => {
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
			}, 0);
		} catch (error) {
			logger.error("Download failed", error);
		}
	},

	/**
	 * Validates JSON string and enforces 'fields' array structure.
	 * Returns a normalized payload object if valid, null otherwise.
	 */
	validatePayload(jsonString, productId) {
		if (!jsonString || !productId) return null;

		try {
			const parsed = JSON.parse(jsonString.trim());

			// Strict Schema Check
			if (parsed && Array.isArray(parsed.fields)) {
				// We only care about the fields array.
				// We discard other root properties to keep the payload clean.
				return {
					fullPayload: { fields: parsed.fields },
					productId: productId,
				};
			} else {
				// Valid JSON, but missing required structure
				logger.warn("Validation Failed: JSON missing 'fields' array.");
				return null;
			}
		} catch (e) {
			// Invalid JSON syntax
			return null;
		}
	},
};
