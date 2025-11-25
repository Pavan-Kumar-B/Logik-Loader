// src/js/config/config.js

const CONFIG = {
  SYSTEM: {
    TARGET_WINDOW_NAME: "easyXDM_default",
    STORAGE_KEY_DEBUG: "cptu_debug_mode",
    SHOW_DEBUG_CONTROL: false,
    MAINTENANCE_MODE: false,
  },
  TIMING: {
    DEBOUNCE_DELAY_MS: 500,
    DISCOVERY_MAX_ATTEMPTS: 20,
    DISCOVERY_RETRY_DELAY_MS: 1000,
    UI_FEEDBACK_DURATION_MS: 2000,
    DRAFT_BTN_OBSERVER_TIMEOUT: 10000,
  },
  API: {
    BASE_POST_TARGET: "/c",
    QUERY_PARAM_SAVE: "?save=true",
    PATCH_REGEX_STRING: "\\/c\\/[a-f0-9-]+$",
  },
  SELECTORS: {
    OUTER_DOM: {
      PAGE_UPDATE_BUTTON: 'input[type="submit"][value="Update"]',
      PRODUCT_ID_INPUT: "#productID",
      HEADER_FORM: "#inputs",
      HEADER_INPUTS: "#inputs input, #inputs select",
      TARGET_IFRAME: "#root iframe",
      HEADER_FIELDS_KEEP_ENABLED: ["productID", "flightPath"],
    },
    INNER_DOM: {
      QUOTE_BUTTON: "#ReturnButton",
      DRAFT_BUTTON_ID: "cptu-draft-btn-inner",
    },
  },
  MESSAGES: {
    LOAD_HANDLER_SCRIPT: "LOAD_HANDLER_SCRIPT",
    HANDLER_READY: "CPTU_HANDLER_READY",
    SESSION_STARTED: "CPTU_SESSION_STARTED",
    ARM_PAYLOAD: "CPTU_ARM_PAYLOAD",
    POST_SUCCESSFUL: "CPTU_POST_SUCCESSFUL",
    POST_FAILED: "CPTU_POST_FAILED",
    SAVE_SUCCESSFUL: "CPTU_SAVE_SUCCESSFUL",
    DRAFT_REQUESTED: "CPTU_DRAFT_REQUESTED",
    DRAFT_READY: "CPTU_DRAFT_READY",
  },
  UI: {
    TITLES: {
      PANEL_MAIN: "Logik Loader",
      PANEL_COMPLETE: "Session Complete",
      PANEL_PREVIOUS: "Previous Session",
      PANEL_READY: "Ready for New Session",
      MODAL_CONFIRM: "Logik Loader",
      MODAL_PROMPT: "Save Draft",
      MODAL_DOWNLOAD: "Download Session",
    },
    BUTTONS: {
      OPEN_PANEL: "Loader",
      DRAFT_LABEL: "Draft",
      DRAFT_TOOLTIP: "Save session as a draft JSON file",
      SIDEBAR_DRAFT: "Save as Draft",
      CONFIRM_OK: "OK",
      CONFIRM_CANCEL: "Cancel",
      COPY_FEEDBACK: "Copied!",
      RESET_SESSION: "Start New Configuration",
      DOWNLOAD_SESSION: "Download Session Data",
    },
    STATUS: {
      WAITING: "Waiting for valid JSON & Product ID...",
      FETCHING: "Fetching draft data...",
      FETCHING_SESSION: "Fetching session data...",
      PARSING: "Processing JSON...",
      LOADING_FILE: "Reading file...",
      INITIALIZING: "Initializing Session...",
      ARMED: "✅ Payload Armed. Ready to Update.",
      SUCCESS_HTML:
        "✅ Session Active. Input locked.<br>Proceed to 'Quote' action in the app.",
      FINAL_SAVED_HEADER: "Configuration Saved!",
      FINAL_SAVED_SUBTEXT: "Session saved successfully.",
      OVERLAY_RESET_INSTRUCT: "Here is your previous ID.",
      OVERLAY_NEW_INSTRUCT:
        "Update the payload in the Loader panel and click 'Update' to start.",
      OVERLAY_INIT_MSG: "Initializing Session...",
    },
    ERRORS: {
      GENERIC_FAIL: "❌ Logik Loader failed to initialize.",
      CRITICAL_INIT: "❌ Critical Initialization Error. Check Console.",
      HANDLER_FAIL: "❌ Could not find target frame. Please refresh.",
      INVALID_FILE: "❌ Invalid file. Please use a .json file.",
      FILE_READ_FAIL: "❌ Error reading file.",
      FETCH_FAIL: "❌ Failed to fetch draft.",
      NO_UUID: "Could not save draft. The session UUID is not available.",
      PAYLOAD_FAIL_HTML: "❌ <strong>Payload Failed to Load</strong>",
      MAINTENANCE_MSG:
        "⚠️ Extension is currently disabled for maintenance by the administrator.",
    },
    PROMPTS: {
      DISABLE_WARNING:
        "Disabling the Logik Loader will require a page refresh to reset the configuration.\n\nAre you sure you want to continue?",
      CONFIRM_RESET:
        "Are you sure you want to start a new configuration?\n\nAny unsaved progress in the current session will be lost.",
      DRAFT_NAME_LABEL: "Please enter a name for this draft session:",
      DOWNLOAD_NAME_LABEL: "Please enter a name for this session file:",
      DRAFT_NAME_PLACEHOLDER: "Enter session name",
      DRAFT_DEFAULT_PREFIX: "draft-session-",
    },
    PLACEHOLDERS: {
      TEXTAREA:
        "Paste payload, drag & drop a .json file, or use the import link.\n\nThe JSON must contain a &quot;fields&quot; array.",
    },
    DEV: {
      NO_SESSION: "No active session",
      NO_UUID_TO_COPY: "Logik Loader: No UUID to copy.",
      UUID_COPIED: "Logik Loader: UUID copied to clipboard.",
      EXPOSED_MSG: "Developer helpers exposed: CPTU.getSessionUUID()",
    },
  },
  ASSETS: {
    LOGO_PATH: "src/assets/logo.png",
    COPY_ICON_SVG: `<svg viewBox="0 0 24 24" fill="currentColor" width="18px" height="18px" style="pointer-events: none;"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path></svg>`,
    LOADER_HTML: `<div class="cptu-loader-container"><div class="cptu-loader-dot"></div><div class="cptu-loader-dot"></div><div class="cptu-loader-dot"></div></div>`,
  },
};
Object.freeze(CONFIG);
