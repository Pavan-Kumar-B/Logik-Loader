# Contributing to Logik Loader

Thank you for your interest in contributing to Logik Loader! We welcome improvements, bug fixes, and new features.

## How to Contribute

1.  **Fork the repository** and clone it to your local machine.
2.  **Create a new branch** for your feature or fix (`git checkout -b feature/amazing-feature`).
3.  **Make your changes**.
4.  **Commit your changes** with descriptive commit messages.
5.  **Push to your branch** and submit a **Pull Request (PR)**.

## Coding Standards & Architecture

To keep the codebase clean and production-ready, please adhere to the following rules:

- **No Hardcoding:** Do not put string literals, selectors, or messages in logic files. Define them in `src/js/config/config.js`.
- **Modular Design:** Keep logic separated:
  - `ui-manager.js`: Only touches the DOM.
  - `controller.js`: Handles logic and events.
  - `handler.js`: Only runs inside the iframe.
- **Logging:** Use the `logger` utility, not `console.log`.

## Reporting Bugs

Please use the **Issues** tab to report bugs. Include:

- Browser Version
- Steps to Reproduce
- Screenshots (if applicable)
