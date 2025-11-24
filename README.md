# Tab Manager (Chrome extension)

Lightweight Chrome extension to help merge and split tabs between windows using a compact UI.

This extension provides quick actions to merge and split windows and tabs via the packaged UI (`ui.html`).

**Key features**
- Visual UI for viewing windows and selecting tabs to merge or split.
- Drag (marquee) selection and multi-select with Ctrl/Cmd for flexible tab grouping.
- One-click merge/split operations from the UI.

**Works with:** Chrome Manifest V3

**Quick install (developer)**
1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and select the project folder (`extension_movealltabs` inside the repo).
5. The extension icon should appear in the toolbar. click the action icon to open the UI.

**Usage**
-- Click the extension action (toolbar icon) to open the packaged UI (`ui.html`) which shows windows and tabs and supports drag selection for merges/splits. All merge and split operations are performed from this UI.

## Detailed Usage — UI controls, clicks and keys

This section explains how to use the optional packaged UI (`ui.html`) and the meanings of clicks, drag gestures and keyboard shortcuts found in the UI.

- **Open the UI**: Click the extension action (toolbar icon) or open `ui.html` in an extension tab. The UI shows a horizontal list of windows at the top and the tabs of the active window below.

- **Top window tabs (window list)**:
	- Single click: make the clicked window the active window and show its tabs.
	- Ctrl (Windows/Linux) or Cmd (macOS) + click: toggle the selection of all the tabs in the window (adds/removes it from the blue selection).
	- Double-click: switch to that window and select all tabs in it.

- **Tab cards (page cards in the content area)**:
	- Single click: select the clicked tab as the current selection (blue selection). If you click another card without modifiers it replaces the blue selection with that single tab.
	- Ctrl (Windows/Linux) or Cmd (macOS) + click: toggle the selection of that tab (adds/removes it from the blue selection).
	- Close button (✕) on a card: closes that tab immediately.

- **Drag selection (marquee)**:
	- Click and drag inside the tabs area to draw a marquee. Cards that intersect the marquee become selected (blue) temporarily and then become the new blue selection on mouse up.
	- While dragging: hold **Shift** to union the current blue selection with the previous blue selection (i.e., add them). Drag without Shift will replace the current selection with the new selection.

- **Top controls (Merge, Merge All, Split)**:
	- `Merge` (multi-stage):
		1. Stage 1 — Select one or more tabs (blue selection) that you want to mark as the source, then click `Merge`. The selection becomes the **red** selection (source) and `merge` ends Stage 1.
		2. Stage 2 — Select one or more tabs to be the target (blue selection), then click `Merge` again. The target selection becomes **yellow** and `merge` ends Stage 2.
		3. Stage 3 — Click `Merge` again to execute: the extension creates a new window from the first tab in the combined selections (red selection) and moves the remaining tabs (yellow selection) into that new window. After completion the UI refreshes.
		- If you start a merge but decide to cancel, press **Escape** to clear selections and exit merge mode.
	- `Merge All`: merges every other window into the window that currently hosts the UI. This is a one-click operation that moves all tabs from other windows into the target window.
	- `Split`: moves the current blue selection into a newly created window. The first selected tab becomes the initial tab in the new window and any remaining selected tabs are moved into it.

- **Keyboard**:
	- `Escape`: clears all selections (blue/red/yellow) and exits merge mode.

- **Notes and tips**:
	- The UI keeps a lightweight snapshot of windows and only re-renders when something changed; background tab/window events also trigger refreshes.
	- If you click controls but the UI tab moved to another window (for example, you opened or focused another window), the UI attempts to refresh its own window id automatically before performing moves.
	- Alerts will appear if you try to perform actions with no selection (for example, clicking `Split` with no tabs selected).

If you'd like, I can also add a short animated GIF or screenshot to this README showing the marquee selection and the Merge flow — would you like that added?

**Files of interest**
- `manifest.json` — extension metadata and permissions (Manifest V3).
- `background.js` — lightweight background script; the action opens the packaged UI (`ui.html`).
- `ui.html`, `ui.js`, `ui.css` — packaged UI for viewing windows/tabs and doing merges/splits with mouse/keyboard interactions.

**Permissions required**
- `tabs` — to move and query tabs.
- `windows` — to create and manage browser windows.

**Development notes**
- The extension uses event listeners in `background.js` to update the context menus when the focused window changes.
- The UI (`ui.html`) is a simple single-page interface for visual selection; it relies on the `chrome.*` extension APIs available to extension pages.

**Load locally / test**
1. Visit `chrome://extensions/`.
2. Enable Developer Mode.
3. Click `Load unpacked` and select the `extension_movealltabs` folder in this repository.

