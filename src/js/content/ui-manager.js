// src/js/content/ui-manager.js

class UIManager {
  constructor() {
    this._elements = {};
    this._originalFavicon = null;
    this._originalTitle = null;
  }

  init() {
    logger.info("UIManager: Creating UI elements...");
    this._createPanel();
    this._createOverlay();
    this._createModals();
    this._createFloatingButton();
    this._cacheElements();
    this._initDragLogic();
    window.addEventListener("resize", () => this._handleWindowResize());
  }

  getElements() {
    if (!this._elements.pageUpdateButton) {
      this._elements.pageUpdateButton = Utils.getElement(
        CONFIG.SELECTORS.OUTER_DOM.PAGE_UPDATE_BUTTON
      );
    }
    if (!this._elements.productIdInput) {
      this._elements.productIdInput = Utils.getElement(
        CONFIG.SELECTORS.OUTER_DOM.PRODUCT_ID_INPUT
      );
    }
    return this._elements;
  }

  _createFloatingButton() {
    const btn = document.createElement("button");
    btn.id = "cptu-btn";

    const logoPath = chrome.runtime.getURL(CONFIG.ASSETS.LOGO_PATH);
    const img = document.createElement("img");
    img.src = logoPath;
    img.alt = CONFIG.UI.BUTTONS.OPEN_PANEL;

    btn.appendChild(img);
    btn.title = CONFIG.UI.TITLES.PANEL_MAIN;

    document.body.appendChild(btn);
  }

  _createPanel() {
    const debugHtml = CONFIG.SYSTEM.SHOW_DEBUG_CONTROL
      ? `
            <label title="Enable debug logging" class="cptu-control-label">Debug</label>
            <label class="cptu-switch">
              <input type="checkbox" id="cptu-debug-toggle">
              <span class="cptu-slider"></span>
            </label>`
      : "";

    // NEW: Get logo path for header
    const logoPath = chrome.runtime.getURL(CONFIG.ASSETS.LOGO_PATH);

    const panel = document.createElement("div");
    panel.id = "cptu-panel";
    panel.innerHTML = `
            <div id="cptu-header">
                <div style="display:flex; align-items:center;">
                    <img src="${logoPath}" style="height: 34px; width: auto; margin-right: 8px;" alt="Logo">
                    <span class="cptu-title">${CONFIG.UI.TITLES.PANEL_MAIN}</span>
                </div>
                <div class="cptu-controls">
                    ${debugHtml}
                    <label class="cptu-control-label">Enable</label>
                    <label class="cptu-switch" title="Toggle Extension">
                        <input type="checkbox" id="cptu-enable-toggle">
                        <span class="cptu-slider"></span>
                    </label>
                    <button id="cptu-close-btn" title="Close">×</button>
                </div>
            </div>
            <div id="cptu-panel-body" style="display: none;">
                <div id="cptu-content">
                    <div class="cptu-textarea-wrapper">
                        <textarea id="jsonInput" placeholder="${CONFIG.UI.PLACEHOLDERS.TEXTAREA}"></textarea>
                        <div class="cptu-drop-overlay">Drop to Load</div>
                        <label for="cptu-file-input" class="cptu-import-label">Import from File</label>
                        <input type="file" id="cptu-file-input" accept=".json" style="display: none;"/>
                    </div>
                    <div id="status-light" class="cptu-status-box">${CONFIG.ASSETS.LOADER_HTML}</div>
                    <button id="cptu-sidebar-draft-btn" class="cptu-sidebar-button" style="display: none;" title="${CONFIG.UI.BUTTONS.DRAFT_TOOLTIP}">
                        ${CONFIG.UI.BUTTONS.SIDEBAR_DRAFT}
                    </button>
                </div>
            </div>`;
    document.body.appendChild(panel);
    this._setupFileDragVisuals(panel);
  }

  _createOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "cptu-iframe-overlay";
    overlay.style.display = "none";
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      const btn = e.target.closest(".cptu-copy-icon-btn");
      if (btn && btn.dataset.uuid) {
        Utils.copyToClipboard(btn.dataset.uuid).then(() => {
          this._showCopyFeedback(btn);
        });
        return;
      }
      if (e.target.id === "cptu-overlay-reset-btn") {
        if (window.controller && window.controller.handleSoftReset) {
          window.controller.handleSoftReset(true);
        }
      }
      if (e.target.id === "cptu-overlay-download-btn") {
        if (window.controller && window.controller.handleDraftRequest) {
          window.controller.handleDraftRequest("download");
        }
      }
    });
  }

  _createModals() {
    const confirm = document.createElement("div");
    confirm.id = "cptu-confirm-overlay";
    confirm.style.display = "none";
    confirm.innerHTML = `
            <div id="cptu-confirm-box">
                <div id="cptu-confirm-title">${CONFIG.UI.TITLES.MODAL_CONFIRM}</div>
                <p id="cptu-confirm-message"></p>
                <div id="cptu-confirm-buttons">
                    <button id="cptu-confirm-cancel" class="cptu-confirm-btn">${CONFIG.UI.BUTTONS.CONFIRM_CANCEL}</button>
                    <button id="cptu-confirm-ok" class="cptu-confirm-btn cptu-btn-primary">${CONFIG.UI.BUTTONS.CONFIRM_OK}</button>
                </div>
            </div>`;
    document.body.appendChild(confirm);

    const prompt = document.createElement("div");
    prompt.id = "cptu-prompt-overlay";
    prompt.style.display = "none";
    prompt.innerHTML = `
            <div id="cptu-prompt-box">
                <div id="cptu-prompt-title">${CONFIG.UI.TITLES.MODAL_PROMPT}</div>
                <p id="cptu-prompt-message">${CONFIG.UI.PROMPTS.DRAFT_NAME_LABEL}</p>
                <input type="text" id="cptu-prompt-input" placeholder="${CONFIG.UI.PROMPTS.DRAFT_NAME_PLACEHOLDER}"/>
                <div id="cptu-prompt-buttons">
                    <button id="cptu-prompt-cancel" class="cptu-confirm-btn">${CONFIG.UI.BUTTONS.CONFIRM_CANCEL}</button>
                    <button id="cptu-prompt-ok" class="cptu-confirm-btn cptu-btn-primary">${CONFIG.UI.BUTTONS.CONFIRM_OK}</button>
                </div>
            </div>`;
    document.body.appendChild(prompt);
  }

  _cacheElements() {
    const q = (sel) => Utils.getElement(sel);
    this._elements = {
      panel: q("#cptu-panel"),
      panelHeader: q("#cptu-header"),
      panelBody: q("#cptu-panel-body"),
      panelTitle: q("#cptu-header .cptu-title"),
      btn: q("#cptu-btn"),
      closeBtn: q("#cptu-close-btn"),
      enableToggle: q("#cptu-enable-toggle"),
      debugToggle: q("#cptu-debug-toggle"),
      textareaWrapper: q(".cptu-textarea-wrapper"),
      textarea: q("#jsonInput"),
      fileInput: q("#cptu-file-input"),
      statusLight: q("#status-light"),
      sidebarDraftButton: q("#cptu-sidebar-draft-btn"),
      iframeOverlay: q("#cptu-iframe-overlay"),
      confirmModal: q("#cptu-confirm-overlay"),
      promptModal: q("#cptu-prompt-overlay"),
      pageUpdateButton: q(CONFIG.SELECTORS.OUTER_DOM.PAGE_UPDATE_BUTTON),
      productIdInput: q(CONFIG.SELECTORS.OUTER_DOM.PRODUCT_ID_INPUT),
    };
    if (this._elements.debugToggle) {
      this._elements.debugToggle.checked = logger.isEnabled;
      this._elements.debugToggle.addEventListener("change", (e) =>
        logger.setEnabled(e.target.checked)
      );
    }
  }

  _initDragLogic() {
    if (!this._elements.panelHeader) return;
    const onMouseDown = (e) => {
      if (e.button !== 0 || e.target.closest("button, label, input")) return;
      stateManager.panelDrag.isDragging = true;
      stateManager.panelDrag.offsetX =
        e.clientX - this._elements.panel.offsetLeft;
      stateManager.panelDrag.offsetY =
        e.clientY - this._elements.panel.offsetTop;
    };
    const onMouseUp = () => {
      stateManager.panelDrag.isDragging = false;
    };
    const onMouseMove = (e) => {
      if (!stateManager.panelDrag.isDragging || !this._elements.panel) return;
      e.preventDefault();
      this._elements.panel.style.left = `${
        e.clientX - stateManager.panelDrag.offsetX
      }px`;
      this._elements.panel.style.top = `${
        e.clientY - stateManager.panelDrag.offsetY
      }px`;
    };
    this._elements.panelHeader.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);
  }

  _setupFileDragVisuals(panel) {
    const textarea = panel.querySelector("#jsonInput");
    const wrapper = panel.querySelector(".cptu-textarea-wrapper");
    if (!textarea || !wrapper) return;
    ["dragenter", "dragover"].forEach((evt) => {
      textarea.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        wrapper.classList.add("drag-over");
      });
    });
    ["dragleave"].forEach((evt) => {
      textarea.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        wrapper.classList.remove("drag-over");
      });
    });
  }

  setDragVisualState(active) {
    const wrapper = this._elements.panel?.querySelector(
      ".cptu-textarea-wrapper"
    );
    if (wrapper) {
      if (active) wrapper.classList.add("drag-over");
      else wrapper.classList.remove("drag-over");
    }
  }

  openPanel() {
    if (this._elements.panel) this._elements.panel.classList.add("open");
  }
  closePanel() {
    if (this._elements.panel) {
      this._elements.panel.classList.remove("open");
      this._elements.panel.style.removeProperty("top");
      this._elements.panel.style.removeProperty("left");
    }
  }

  togglePanelContent(show) {
    if (this._elements.panelBody)
      this._elements.panelBody.style.display = show ? "flex" : "none";
    if (!show) {
      this.setDraftButtonsVisible(false);
      this.setStatus("");
    }
  }

  toggleTextarea(visible) {
    if (this._elements.textareaWrapper) {
      this._elements.textareaWrapper.style.display = visible ? "flex" : "none";
    }
  }

  updatePageTitle(isEnabled) {
    if (isEnabled) {
      const logoUrl = chrome.runtime.getURL(CONFIG.ASSETS.LOGO_PATH);
      const title = CONFIG.UI.TITLES.PANEL_MAIN;

      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }

      document.title = title;
      link.href = logoUrl;
    }
  }

  setStatus(message, color = "black", isHtml = false) {
    const el = this._elements.statusLight;
    if (!el) return;
    if (isHtml) el.innerHTML = message;
    else el.textContent = message;
    el.style.color = color;
    el.className = "cptu-status-box";
  }

  setDraftButtonsVisible(visible) {
    const display = visible ? "block" : "none";
    if (this._elements.sidebarDraftButton)
      this._elements.sidebarDraftButton.style.display = display;
  }

  hideOverlay() {
    if (this._elements.iframeOverlay)
      this._elements.iframeOverlay.style.display = "none";
  }

  resetForNewSession(showOverlay = false, showUuid = false) {
    if (this._elements.panelTitle)
      this._elements.panelTitle.textContent = CONFIG.UI.TITLES.PANEL_MAIN;

    this.setDraftButtonsVisible(false);
    this.toggleTextarea(true);
    if (this._elements.textarea) this._elements.textarea.value = "";
    this.setStatus(CONFIG.UI.STATUS.WAITING, "black");

    this.toggleHeaderInputs(true, true);

    const overlay = this._elements.iframeOverlay;
    if (overlay) {
      if (showOverlay) {
        const lastUUID = stateManager.sessionUUID;
        let uuidHtml = "";
        let titleText = CONFIG.UI.TITLES.PANEL_READY;

        if (showUuid && lastUUID) {
          titleText = CONFIG.UI.TITLES.PANEL_PREVIOUS;
          uuidHtml = `
                    <div id="cptu-overlay-uuid-container">
                        <span id="cptu-overlay-uuid">${lastUUID}</span>
                        <button class="cptu-copy-icon-btn" data-uuid="${lastUUID}">${CONFIG.ASSETS.COPY_ICON_SVG}</button>
                    </div>
                    <p style="font-size:0.8em; margin-top:5px; color:#ccc;">${CONFIG.UI.STATUS.OVERLAY_RESET_INSTRUCT}</p>`;
        }

        overlay.innerHTML = `
                    <div id="cptu-overlay-content">
                        <div style="font-size:1.2em; font-weight:bold; margin-bottom:10px;">${titleText}</div>
                        ${uuidHtml}
                        <div id="cptu-overlay-subtext" style="margin-top:15px; font-size:1em;">${CONFIG.UI.STATUS.OVERLAY_NEW_INSTRUCT}</div>
                    </div>`;
        overlay.style.display = "flex";
        this._handleWindowResize();
      } else {
        overlay.style.display = "none";
      }
    }
    stateManager.resetSession();
  }

  toggleHeaderInputs(disabled, allowExceptions = false) {
    const inputs = document.querySelectorAll(
      CONFIG.SELECTORS.OUTER_DOM.HEADER_INPUTS
    );
    inputs.forEach((el) => (el.disabled = disabled));
    if (disabled && allowExceptions) {
      CONFIG.SELECTORS.OUTER_DOM.HEADER_FIELDS_KEEP_ENABLED.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.disabled = false;
      });
    }
    if (!disabled) {
      CONFIG.SELECTORS.OUTER_DOM.HEADER_FIELDS_KEEP_ENABLED.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.disabled = false;
      });
    }
  }

  showAlert(message) {
    window.alert(message);
  }

  showInitializingState() {
    this.toggleTextarea(false);
    this.toggleHeaderInputs(true, false);
    const statusEl = this._elements.statusLight;
    statusEl.className = "cptu-status-box cptu-status-final";
    statusEl.innerHTML = `
            <div class="cptu-status-header" style="margin-bottom:10px;">${CONFIG.ASSETS.LOADER_HTML}</div>
            <p class="cptu-status-footer" style="margin-bottom:15px;">${CONFIG.UI.STATUS.INITIALIZING}</p>
        `;
    const overlay = this._elements.iframeOverlay;
    if (overlay) {
      overlay.style.display = "flex";
      overlay.innerHTML = `
                <div id="cptu-overlay-content">
                    <div style="margin-bottom:15px;">${CONFIG.ASSETS.LOADER_HTML}</div>
                    <div id="cptu-overlay-subtext" style="font-size:1.1em;">${CONFIG.UI.STATUS.OVERLAY_INIT_MSG}</div>
                </div>`;
      this._handleWindowResize();
    }
  }

  showActiveSessionState() {
    this.toggleTextarea(false);
    this.toggleHeaderInputs(true, false);
    if (this._elements.sidebarDraftButton)
      this._elements.sidebarDraftButton.style.display = "none";

    const statusEl = this._elements.statusLight;
    statusEl.className = "cptu-status-box cptu-status-final";
    statusEl.innerHTML = `
            <div class="cptu-status-header" style="margin-bottom:10px;">${CONFIG.UI.STATUS.SUCCESS_HTML}</div>
            <div style="display:flex; flex-direction:column; gap:8px; margin-top:15px;">
                <button id="cptu-reset-btn" class="cptu-internal-btn">${CONFIG.UI.BUTTONS.RESET_SESSION}</button>
                <button id="cptu-internal-draft-btn" class="cptu-internal-btn">${CONFIG.UI.BUTTONS.SIDEBAR_DRAFT}</button>
            </div>
        `;

    const resetBtn = statusEl.querySelector("#cptu-reset-btn");
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (window.controller && window.controller.handleSoftReset)
          window.controller.handleSoftReset(false);
      };
    }

    const draftBtn = statusEl.querySelector("#cptu-internal-draft-btn");
    if (draftBtn) {
      draftBtn.onclick = () => {
        if (window.controller && window.controller.handleDraftRequest)
          window.controller.handleDraftRequest("draft");
      };
    }
    this.hideOverlay();
  }

  handlePostError(status, responseText) {
    let details = responseText || "(No response body)";
    try {
      details =
        JSON.parse(responseText).message ||
        JSON.stringify(JSON.parse(responseText), null, 2);
    } catch (e) {}
    const html = `${CONFIG.UI.ERRORS.PAYLOAD_FAIL_HTML}<br><small>Status: ${status}</small><div class="cptu-error-details">${details}</div>`;
    this.setStatus(html, "red", true);
    this.toggleHeaderInputs(true, true);
    this.toggleTextarea(true);
    this.hideOverlay();
  }

  handleSaveSuccess(uuid) {
    if (this._elements.panelTitle)
      this._elements.panelTitle.textContent = CONFIG.UI.TITLES.PANEL_COMPLETE;

    const statusEl = this._elements.statusLight;
    statusEl.innerHTML = `
            <div class="cptu-status-header"><strong>${CONFIG.UI.STATUS.FINAL_SAVED_HEADER}</strong></div>
            <div class="cptu-uuid-block">
                <span>${uuid}</span>
                <button class="cptu-copy-icon-btn" data-uuid="${uuid}">${CONFIG.ASSETS.COPY_ICON_SVG}</button>
            </div>
            <p class="cptu-status-footer">${CONFIG.UI.STATUS.FINAL_SAVED_SUBTEXT}</p>
            <div style="display:flex; flex-direction:column; gap:8px; margin-top:15px;">
                <button id="cptu-reset-btn" class="cptu-internal-btn">${CONFIG.UI.BUTTONS.RESET_SESSION}</button>
                <button id="cptu-download-btn" class="cptu-internal-btn">${CONFIG.UI.BUTTONS.DOWNLOAD_SESSION}</button>
            </div>
        `;

    const copyBtn = statusEl.querySelector(".cptu-copy-icon-btn");
    if (copyBtn)
      copyBtn.onclick = () =>
        Utils.copyToClipboard(uuid).then(() => this._showCopyFeedback(copyBtn));

    const resetBtn = statusEl.querySelector("#cptu-reset-btn");
    if (resetBtn)
      resetBtn.onclick = () => window.controller.handleSoftReset(true);

    const downloadBtn = statusEl.querySelector("#cptu-download-btn");
    if (downloadBtn)
      downloadBtn.onclick = () =>
        window.controller.handleDraftRequest("download");

    const overlay = this._elements.iframeOverlay;
    if (overlay) {
      overlay.innerHTML = `
                <div id="cptu-overlay-content">
                    ${CONFIG.UI.TITLES.PANEL_COMPLETE}
                    <div id="cptu-overlay-uuid-container">
                        <span id="cptu-overlay-uuid">${uuid}</span>
                        <button class="cptu-copy-icon-btn" data-uuid="${uuid}">${CONFIG.ASSETS.COPY_ICON_SVG}</button>
                    </div>
                    <div id="cptu-overlay-subtext">${CONFIG.UI.STATUS.FINAL_SAVED_SUBTEXT}</div>
                    <div style="display:flex; gap:10px; justify-content:center;">
                        <button id="cptu-overlay-reset-btn" class="cptu-overlay-btn">${CONFIG.UI.BUTTONS.RESET_SESSION}</button>
                        <button id="cptu-overlay-download-btn" class="cptu-overlay-btn">${CONFIG.UI.BUTTONS.DOWNLOAD_SESSION}</button>
                    </div>
                </div>`;
      overlay.style.display = "flex";
      this._handleWindowResize();
    }
    this.togglePanelContent(true);
  }

  _handleWindowResize() {
    const overlay = this._elements.iframeOverlay;
    if (overlay && overlay.style.display === "flex") {
      const target = Utils.getElement(CONFIG.SELECTORS.OUTER_DOM.TARGET_IFRAME);
      if (target) {
        const rect = target.getBoundingClientRect();
        overlay.style.top = `${rect.top}px`;
        overlay.style.left = `${rect.left}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
      }
    }
  }

  _showCopyFeedback(btnElement) {
    if (!btnElement) return;
    const original = btnElement.innerHTML;
    btnElement.innerHTML = `<span style="font-size:10px;">${CONFIG.UI.BUTTONS.COPY_FEEDBACK}</span>`;
    setTimeout(() => {
      btnElement.innerHTML = original;
    }, CONFIG.TIMING.UI_FEEDBACK_DURATION_MS);
  }

  showConfirmationModal(message) {
    return new Promise((resolve) => {
      const modal = this._elements.confirmModal;
      if (!modal) return resolve(false);
      const msgEl = modal.querySelector("#cptu-confirm-message");
      const okBtn = modal.querySelector("#cptu-confirm-ok");
      const cancelBtn = modal.querySelector("#cptu-confirm-cancel");
      if (msgEl) msgEl.textContent = message;
      const cleanup = () => {
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        modal.style.display = "none";
      };
      okBtn.onclick = () => {
        cleanup();
        resolve(true);
      };
      cancelBtn.onclick = () => {
        cleanup();
        resolve(false);
      };
      modal.style.display = "flex";
    });
  }

  showNamePrompt(jsonData, defaultUuid, context = "draft") {
    const modal = this._elements.promptModal;
    if (!modal) return;

    const titleEl = modal.querySelector("#cptu-prompt-title");
    const msgEl = modal.querySelector("#cptu-prompt-message");
    const input = modal.querySelector("#cptu-prompt-input");
    const okBtn = modal.querySelector("#cptu-prompt-ok");
    const cancelBtn = modal.querySelector("#cptu-prompt-cancel");

    if (context === "download") {
      titleEl.textContent = CONFIG.UI.TITLES.MODAL_DOWNLOAD;
      msgEl.textContent = CONFIG.UI.PROMPTS.DOWNLOAD_NAME_LABEL;
    } else {
      titleEl.textContent = CONFIG.UI.TITLES.MODAL_PROMPT;
      msgEl.textContent = CONFIG.UI.PROMPTS.DRAFT_NAME_LABEL;
    }

    input.value = `${CONFIG.UI.PROMPTS.DRAFT_DEFAULT_PREFIX}${defaultUuid}`;
    input.style.border = "";

    const cleanup = () => {
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      modal.style.display = "none";
    };
    okBtn.onclick = () => {
      const name = input.value.trim();
      if (name) {
        const filename = `${name}-${defaultUuid}.json`;
        Utils.downloadJson(jsonData, filename);
        cleanup();
      } else {
        input.style.border = "1px solid red";
      }
    };
    cancelBtn.onclick = cleanup;
    modal.style.display = "flex";
    input.focus();
    input.select();
  }
}

const uiManager = new UIManager();
