# Move All Tabs (Chrome extension)

Lightweight Chrome extension to help merge and split tabs between windows using context menus and a small UI.

This extension provides quick actions to merge all tabs from another window into the current window, or to split a window (move the active tab to a new window or move the other tabs to a new window).

**Key features**
- Merge all tabs from another window into the focused window via a context menu.
- Split the current window: move the active tab to a new window or move all other tabs to a new window.
- Dynamic context menus that update when the focused window changes.
- Optional UI (`ui.html`) for visual window/tab management.

**Works with:** Chrome Manifest V3

**Quick install (developer)**
1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and select the project folder (`extension_movealltabs` inside the repo).
5. The extension icon should appear in the toolbar. Right-click a page or click the action icon to open the UI.

**Usage**
- Right-click in a page (context menus are provided) to open the parent menu "Merge all tabs from another window" and choose one of the listed windows to merge its tabs into the current window.
- Use the "Split window" menu item to move the active tab into a new window, and optionally move the rest to another new window.
- Click the extension action (toolbar icon) to open the packaged UI (`ui.html`) which shows windows and tabs and supports drag selection for merges/splits.

**Files of interest**
- `manifest.json` — extension metadata and permissions (Manifest V3).
- `background.js` — builds context menus and implements merge/split logic using the `chrome.windows` and `chrome.tabs` APIs.
- `content.js` — sends a simple right-click message to the background script to help refresh context/menu state.
- `ui.html`, `ui.js`, `ui.css` — optional packaged UI for viewing windows/tabs and doing merges/splits with mouse/keyboard interactions.

**Permissions required**
- `tabs` — to move and query tabs.
- `windows` — to create and manage browser windows.
- `contextMenus` — to add right-click options.
- `scripting` — used for content/background interactions (declared in `manifest.json`).

**Development notes**
- The extension uses event listeners in `background.js` to update the context menus when the focused window changes.
- The UI (`ui.html`) is a simple single-page interface for visual selection; it relies on the `chrome.*` extension APIs available to extension pages.
- There is an optional `webapp` dev server mention in the previous README; if you have a `webapp` directory and a local dev server, you can run it and point the extension to that URL by editing the background action logic.

**Load locally / test**
1. Visit `chrome://extensions/`.
2. Enable Developer Mode.
3. Click `Load unpacked` and select the `extension_movealltabs` folder in this repository.

**Troubleshooting**
- If a context menu doesn't appear, try reloading the extension on the `chrome://extensions/` page.
- Check the extension background console (Service Worker) for errors via the Extensions page (click "service worker" link under the extension entry).

**Contributing & Ideas**
- Add keyboard shortcuts for merging/splitting windows.
- Provide per-tab selection for merges (more granular than whole-window merges).

**License & Author**
- Author: repository owner
- License: (not specified) — add a `LICENSE` file if you want an explicit license.

---

If you'd like, I can also:
- Add a short Turkish summary at the top.
- Add a `CONTRIBUTING.md` and `LICENSE`.
- Add quick screenshots for the UI.

Updated README to reflect the current code and usage.
