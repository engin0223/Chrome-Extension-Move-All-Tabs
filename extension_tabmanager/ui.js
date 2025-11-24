/**
 * Initialize the UI when the DOM content is fully loaded.
 * Loads all windows and tabs, and sets up drag selection handlers.
 */
document.addEventListener('DOMContentLoaded', () => {
  loadWindowsAndTabs();
  attachDragSelectionHandlers();
});

/**
 * Handle keyboard shortcuts for the extension UI.
 * Clears all selections and resets merge mode when Escape is pressed.
 */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    blueSelection = [];
    redSelection = [];
    yellowSelection = [];
    mergeMode = null;
    renderWindowContent();
  }
});

let windowsData = [];
let activeWindowId = null;
let lastSnapshot = null;

/**
 * The windowId where the UI page (ui.html) currently lives. Kept up-to-date
 * by calling `refreshUiWindowId()` before actions that depend on the UI's window.
 */
let uiWindowId = null;

/**
 * Selection state tracking for the three-state merge workflow:
 * - blueSelection: Currently selected tabs (tab IDs)
 * - redSelection: Merge source selection (tab IDs)
 * - yellowSelection: Merge target selection (tab IDs)
 * - mergeMode: null, 'red' (source stage), or 'yellow' (target stage)
 */
let blueSelection = []; // Current selection (tab IDs)
let redSelection = []; // Merge source selection (tab IDs)
let yellowSelection = []; // Merge target selection (tab IDs)
let mergeMode = null; // null, 'red', or 'yellow'

/**
 * Drag selection state for marquee selection:
 * - isDragging: Whether a drag operation is in progress
 * - dragStart: Starting coordinates {x, y} of the drag
 * - marqueeEl: The marquee selection box DOM element
 * - dragWasActive: Flag to suppress click after a drag completes
 */
let isDragging = false;
let dragStart = null;
let marqueeEl = null;
let dragWasActive = false; // suppress click after a drag

/**
 * Loads all open windows and their tabs from Chrome, updates the UI,
 * and attaches control handlers. Implements snapshot-based change detection
 * to avoid unnecessary re-renders.
 * @async
 * @returns {Promise<void>}
 */
async function loadWindowsAndTabs() {
  await refreshUiWindowId();
  try {
    // Get all windows with their tabs
    const windows = await chrome.windows.getAll({ populate: true });
    const sorted = windows.sort((a, b) => a.id - b.id);

    // Create a lightweight snapshot (window id -> ordered tab ids)
    const snapshot = JSON.stringify(sorted.map(w => ({ id: w.id, tabs: w.tabs.map(t => t.id) })));

    // If nothing changed since last snapshot, avoid re-rendering
    if (lastSnapshot === snapshot) {
      return; // no changes
    }
    lastSnapshot = snapshot;

    windowsData = sorted;
    
    if (windowsData.length === 0) {
      showEmptyState();
      return;
    }

    // Set active window to first one if not set
    if (!activeWindowId) {
      activeWindowId = windowsData[0].id;
    }

    renderWindowTabs();
    renderWindowContent();
    attachTopControls();
  } catch (error) {
    console.error('Error loading windows:', error);
  }
}

/**
 * Updates the UI window ID by querying for tabs matching the extension UI URL.
 * This is called before operations to ensure we know which window the UI currently lives in.
 * @async
 * @returns {Promise<number|null>} The window ID of the UI, or null if not found
 */
async function refreshUiWindowId() {

  try {
    // Fallback: find a tab that matches the extension UI URL
    const url = chrome.runtime.getURL('ui.html');
    const tabs = await new Promise(resolve => chrome.tabs.query({ url }, resolve));
    if (tabs && tabs.length) {
      uiWindowId = tabs[0].windowId;
      return uiWindowId;
    }
  } catch (e) {
    // ignore
  }

  return uiWindowId;
}

/**
 * Renders the window tabs list on the left sidebar, computing selection state
 * for each window and attaching click/double-click event handlers.
 * Single click switches the active window, ctrl+click toggles all tabs in the window,
 * and double-click selects all tabs in the window.
 * @returns {void}
 */
function renderWindowTabs() {
  const tabsList = document.getElementById('windowTabsList');
  tabsList.innerHTML = '';

  windowsData.forEach(windowData => {
    const tab = document.createElement('button');
    // compute classes based on active state and whether every tab in the window
    // is selected in a particular color
    const classes = ['window-tab'];
    if (windowData.id === activeWindowId) classes.push('active');
    const tabIds = windowData.tabs.map(t => t.id);
    if (tabIds.length > 0) {
      if (tabIds.every(id => redSelection.includes(id))) {
        classes.push('selected-red');
      } else if (tabIds.every(id => yellowSelection.includes(id))) {
        classes.push('selected-yellow');
      } else if (tabIds.every(id => blueSelection.includes(id))) {
        classes.push('selected-blue');
      }
    }
    tab.className = classes.join(' ');
    
    
    const icon = document.createElement('span');
    icon.className = 'window-tab-icon';
    icon.textContent = '📁';
    
    const label = document.createElement('span');
    label.className = 'window-tab-label';
    label.textContent = `Window ${windowData.id} (${windowData.tabs.length})`;
    
    tab.appendChild(icon);
    tab.appendChild(label);
    
    let clickTimer = null;

    tab.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey) {
        toggleAllTabsInWindow(windowData.id);
        // ensure UI updates to reflect the new selection state
        renderWindowTabs();
        renderWindowContent();
      } else {
        activeWindowId = windowData.id;
        renderWindowTabs();
        renderWindowContent();
      }
    });

    tab.addEventListener('dblclick', () => {
      activeWindowId = windowData.id;
      selectAllTabsInWindow(windowData.id);
      renderWindowTabs();
      renderWindowContent();
    });
    
    tabsList.appendChild(tab);
  });
  // ensure controls reflect active window
  attachTopControls();
}

/**
 * Attaches the top control buttons (merge, merge all, split) and defines their click handlers.
 * These buttons manage the three-stage merge workflow and split functionality.
 * @returns {void}
 */
function attachTopControls() {
  const controls = document.getElementById('windowControls');
  if (!controls) return;
  const mergeBtn = document.getElementById('mergeBtn');
  const mergeAllBtn = document.getElementById('mergeAllBtn');
  const splitBtn = document.getElementById('splitBtn');
  controls.setAttribute('aria-hidden', 'false');
  
  mergeBtn.onclick = async () => {
    // Ensure we know which window the UI currently lives in (may have moved)
    await refreshUiWindowId();
    if (blueSelection.length === 0 && mergeMode !== 'yellow') {
      alert('No tabs selected');
      return;
    }

    if (mergeMode === null) {
      // Stage 1: Mark blue selection as red (source)
      redSelection = [...blueSelection];
      blueSelection = [];
      mergeMode = 'red';
      renderWindowContent();
    } else if (mergeMode === 'red') {
      // Stage 2: Mark current selection as yellow (target)
      yellowSelection = [...blueSelection];
      blueSelection = [];
      mergeMode = 'yellow';
      renderWindowContent();

      if (yellowSelection.length === 0) {
        alert('No target tabs selected');
        mergeMode = 'red';
        renderWindowContent();
        return;
      }
    } else if (mergeMode === 'yellow') {

      try {
        // Combine both lists
        const combined = [...redSelection, ...yellowSelection];

        // Create new window using the first tab
        const firstTabId = combined[0];
        const newWin = await new Promise((resolve) => {
          chrome.windows.create({ tabId: firstTabId, state: 'normal' }, (w) => resolve(w));
        });

        // Move all other tabs to that new window
        const remaining = combined.slice(1);
        if (remaining.length > 0) {
          await chrome.tabs.move(remaining, { windowId: newWin.id, index: -1 });
        }

        mergeMode = null;
        redSelection = [];
        yellowSelection = [];
        loadWindowsAndTabs();
      } catch (err) {
        console.error('Merge failed:', err);
        alert('Merge failed');
        mergeMode = null;
        redSelection = [];
        yellowSelection = [];
        renderWindowContent();
      }
    }

  };

  mergeAllBtn.onclick = async () => {
    // Refresh UI window id so we merge into the window that currently hosts the UI
    await refreshUiWindowId();
    const targetWindowId = uiWindowId || activeWindowId || (windowsData[0] && windowsData[0].id);
    if (!targetWindowId) return alert('No target window to merge into');
    try {
      // Merge each window into the target (sequentially)
      for (const win of windowsData) {
        if (win.id === targetWindowId) continue;
        await mergeFromWindow(targetWindowId, win.id);
      }
      loadWindowsAndTabs();
    } catch (err) {
      console.error('Merge All failed:', err);
      alert('Merge All failed');
    }
  };

  splitBtn.onclick = async () => {
    // Ensure UI window id is up-to-date (UI tab might have moved)
    await refreshUiWindowId();
    if (blueSelection.length === 0) {
      alert('No tabs selected');
      return;
    }
    try {
      // Take all blue selected tabs
      const tabsToMove = [...blueSelection];
      // Create new window with first tab
      const firstTabId = tabsToMove.shift();
      const newWin = await new Promise(resolve => {
        chrome.windows.create({ tabId: firstTabId, state: 'normal' }, w => resolve(w));
      });
      // Move remaining tabs to new window
      if (tabsToMove.length > 0) {
        await chrome.tabs.move(tabsToMove, { windowId: newWin.id, index: -1 });
      }
      // Clear selection
      blueSelection = [];
      renderWindowContent();
      loadWindowsAndTabs();
    } catch (err) {
      console.error('Split failed:', err);
      alert('Split failed');
    }
  };
}

/**
 * Finds the window ID that contains any of the given tab IDs.
 * @param {number[]} tabIds - Array of tab IDs to search for
 * @returns {number|null} The window ID containing one of the tabs, or null if not found
 */
function getWindowIdForTabs(tabIds) {
  for (const win of windowsData) {
    for (const tab of win.tabs) {
      if (tabIds.includes(tab.id)) {
        return win.id;
      }
    }
  }
  return null;
}

/**
 * Merges all tabs from a source window into a target window.
 * Moves all tabs from the source to the end of the target and focuses the target.
 * @async
 * @param {number} targetWindowId - The window to merge tabs into
 * @param {number} sourceWindowId - The window to move tabs from
 * @returns {Promise<void>}
 */
async function mergeFromWindow(targetWindowId, sourceWindowId) {
  if (sourceWindowId === targetWindowId) return;
  const source = await chrome.windows.get(sourceWindowId, { populate: true });
  const tabIds = source.tabs.map(t => t.id).filter(Boolean);
  if (tabIds.length === 0) return;
  // Move all tabs to end of target window
  await chrome.tabs.move(tabIds, { windowId: targetWindowId, index: -1 });
  // Optional: focus the target window after merge
  await chrome.windows.update(targetWindowId, { focused: true });
}

/**
 * Splits tabs from the current window into a new window based on the specified option.
 * Supports moving either the other (non-active) tabs to a new window or the active tab to a new window.
 * @async
 * @param {number} windowId - The window ID to split
 * @param {string} [option='others-to-new'] - Split strategy: 'others-to-new' (keep active) or 'active-to-new' (move active)
 * @returns {Promise<void>}
 */
async function splitCurrentWindow(windowId, option = 'others-to-new') {
  // option: 'others-to-new' (keep active in original), 'active-to-new' (move active to new)
  const win = await chrome.windows.get(windowId, { populate: true });
  if (!win || !win.tabs || win.tabs.length <= 1) return alert('Not enough tabs to split');
  const activeTab = win.tabs.find(t => t.active) || win.tabs[0];

  if (option === 'others-to-new') {
    const otherTabIds = win.tabs.filter(t => t.id !== activeTab.id).map(t => t.id);
    // create new window with other tabs
    const firstId = otherTabIds.shift();
    const newWin = await new Promise((resolve) => {
      chrome.windows.create({ tabId: firstId, state: 'normal' }, (w) => resolve(w));
    });
    if (otherTabIds.length) {
      await chrome.tabs.move(otherTabIds, { windowId: newWin.id, index: -1 });
    }
    await chrome.windows.update(newWin.id, { focused: true });
  } else if (option === 'active-to-new') {
    await chrome.windows.create({ tabId: activeTab.id, state: 'normal' });
  }
  loadWindowsAndTabs();
}

/**
 * Opens a modal dialog for choosing how to split the active window.
 * Provides options to move other tabs to a new window or move the active tab to a new window.
 * @returns {void}
 */
function openModalSplit() {
  const modalRoot = document.getElementById('modalRoot');
  modalRoot.innerHTML = '';
  modalRoot.classList.add('active');

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <h3>Split Window ${activeWindowId}</h3>
    <div style="font-size:12px;color:#aaa">Choose how to split this window</div>
    <div style="margin-top:10px">
      <button id="optKeepActive" class="btn primary">Move other tabs to new window</button>
      <button id="optMoveActive" class="btn ghost">Move active tab to new window</button>
    </div>
    <div class="modal-actions">
      <button id="cancelSplit" class="btn ghost">Cancel</button>
    </div>
  `;

  modalRoot.appendChild(modal);

  document.getElementById('optKeepActive').onclick = async () => { await splitCurrentWindow(activeWindowId, 'others-to-new'); closeModal(); };
  document.getElementById('optMoveActive').onclick = async () => { await splitCurrentWindow(activeWindowId, 'active-to-new'); closeModal(); };
  document.getElementById('cancelSplit').onclick = () => closeModal();
}

/**
 * Opens a generic modal dialog with a title, list of items, and a selection callback.
 * Used to display options to the user and handle their choice.
 * @param {string} title - The title to display in the modal
 * @param {Array<{id: string, label: string}>} items - Array of selectable items with id and label
 * @param {Function} onSelect - Callback function called with the selected item's id
 * @returns {void}
 */
function openModal(title, items, onSelect) {
  const modalRoot = document.getElementById('modalRoot');
  modalRoot.innerHTML = '';
  modalRoot.classList.add('active');

  const modal = document.createElement('div');
  modal.className = 'modal';
  const titleEl = document.createElement('h3');
  titleEl.textContent = title;
  modal.appendChild(titleEl);

  const list = document.createElement('div');
  list.className = 'modal-list';
  items.forEach(it => {
    const btn = document.createElement('button');
    btn.textContent = it.label;
    btn.onclick = () => onSelect(it.id);
    list.appendChild(btn);
  });
  modal.appendChild(list);

  const actions = document.createElement('div');
  actions.className = 'modal-actions';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn ghost';
  closeBtn.textContent = 'Close';
  closeBtn.onclick = () => closeModal();
  actions.appendChild(closeBtn);
  modal.appendChild(actions);

  modalRoot.appendChild(modal);
}

/**
 * Closes the currently open modal dialog by removing the active class and clearing its content.
 * @returns {void}
 */
function closeModal() {
  const modalRoot = document.getElementById('modalRoot');
  modalRoot.classList.remove('active');
  modalRoot.innerHTML = '';
}

/**
 * Renders the main content area with all tabs from the active window.
 * Creates page cards for each tab and updates the window tabs sidebar to reflect current selections.
 * Shows an empty state if the active window has no tabs.
 * @returns {void}
 */
function renderWindowContent() {
  const contentArea = document.getElementById('windowContent');
  const currentWindow = windowsData.find(w => w.id === activeWindowId);
  
  if (!currentWindow || currentWindow.tabs.length === 0) {
    contentArea.innerHTML = '<div class="empty-state">No tabs in this window</div>';
    contentArea.classList.remove('active');
    // keep window tabs in sync when content is empty
    renderWindowTabs();
    return;
  }

  contentArea.innerHTML = '';
  contentArea.classList.add('active');

  currentWindow.tabs.forEach(tab => {
    const card = createPageCard(tab, currentWindow.id);
    contentArea.appendChild(card);
  });

  // ensure the window tabs bar updates highlights to reflect current selections
  renderWindowTabs();
}

/**
 * Creates a DOM element representing a single tab (page card) with favicon, title, URL, and close button.
 * Attaches click handlers for selection and drag-to-select functionality.
 * @param {Object} tab - The tab object from Chrome's tabs API
 * @param {number} tab.id - The unique tab ID
 * @param {string} tab.title - The page title
 * @param {string} tab.url - The page URL
 * @param {string} [tab.favIconUrl] - The favicon URL
 * @param {number} windowId - The window ID this tab belongs to
 * @returns {HTMLElement} The created page card DOM element
 */
function createPageCard(tab, windowId) {
  const card = document.createElement('div');
  card.className = 'page-card';
  card.dataset.tabId = tab.id;
  card.dataset.windowId = windowId;

  const header = document.createElement('div');
  header.className = 'page-card-header';

  // Favicon
  const favicon = document.createElement('img');
  favicon.className = 'page-card-favicon';
  favicon.src = tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="%23999"/></svg>';
  favicon.onerror = () => {
    favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="%23999"/></svg>';
  };

  // Title
  const titleSpan = document.createElement('span');
  titleSpan.className = 'page-card-title';
  titleSpan.title = tab.title;
  titleSpan.textContent = tab.title || 'Untitled';

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'page-card-close-btn';
  closeBtn.innerHTML = '✕';
  closeBtn.title = 'Close tab';
  closeBtn.addEventListener('click', async (e) => {
    e.stopPropagation(); // Prevent card selection when closing
    try {
      await chrome.tabs.remove(tab.id);
      card.style.opacity = '0';
      card.style.transform = 'scale(0.9)';
      setTimeout(() => {
        card.remove();
        // Check if window is empty
        if (document.querySelectorAll('.page-card').length === 0) {
          loadWindowsAndTabs();
        }
      }, 200);
    } catch (error) {
      console.error('Error closing tab:', error);
    }
  });

  header.appendChild(favicon);
  header.appendChild(titleSpan);
  header.appendChild(closeBtn);

  // Content
  const content = document.createElement('div');
  content.className = 'page-card-content';
  
  const urlSpan = document.createElement('span');
  urlSpan.className = 'page-url';
  urlSpan.title = tab.url;
  urlSpan.textContent = tab.url || 'about:blank';
  content.appendChild(urlSpan);

  card.appendChild(header);
  card.appendChild(content);

  // Selection click handlers
  card.addEventListener('click', (e) => {
    if (!redSelection.includes(tab.id) && !yellowSelection.includes(tab.id)) {
      // If a drag just happened, suppress the click
      if (dragWasActive) { dragWasActive = false; return; }
      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd+click: toggle selection in current mode
        toggleTabSelection(tab.id);
      } else {
        // Regular click: start new blue selection
        blueSelection = [tab.id];
      }
    }
  });

  // Update visual state
  updateCardSelectionState(card, tab.id);

  return card;
}

/**
 * Updates the visual selection state of a page card (tab).
 * Removes or adds selection classes (selected-red, selected-yellow, selected-blue) and badges.
 * @param {HTMLElement} card - The page card DOM element to update
 * @param {number} tabId - The tab ID corresponding to the card
 * @returns {void}
 */
function updateCardSelectionState(card, tabId) {
  let badge = card.querySelector('.selection-badge');
  if (badge) badge.remove();

  if (redSelection.includes(tabId)) {
    card.classList.add('selected-red');
    badge = document.createElement('div');
    badge.className = 'selection-badge';
    badge.textContent = 'selected';
    card.appendChild(badge);
  } else if (yellowSelection.includes(tabId)) {
    card.classList.add('selected-yellow');
    badge = document.createElement('div');
    badge.className = 'selection-badge';
    badge.textContent = 'selected';
    card.appendChild(badge);
  } else if (blueSelection.includes(tabId)) {
    card.classList.add('selected-blue');
  }
}

/**
 * Toggles a tab's inclusion in the blue selection (current selection state).
 * @param {number} tabId - The tab ID to toggle
 * @returns {void}
 */
function toggleTabSelection(tabId) {
  if (blueSelection.includes(tabId)) {
    blueSelection = blueSelection.filter(id => id !== tabId);
  } else {
    blueSelection.push(tabId);
  }
}

/**
 * Selects all tabs in a given window by adding them to the blue selection.
 * Updates the UI to reflect the selection changes.
 * @param {number} windowId - The window ID whose tabs should be selected
 * @returns {void}
 */
function selectAllTabsInWindow(windowId) {
  const window = windowsData.find(w => w.id === windowId);
  if (window) {
    blueSelection = [...blueSelection, ...window.tabs.map(t => t.id)];
    // update UI so top-level window tabs reflect the selection
    renderWindowTabs();
    renderWindowContent();
  }
}

/**
 * Toggles the selection state of all tabs in a window.
 * If all tabs are already selected, deselects them; otherwise, selects all.
 * Updates both the window tabs bar and main content area.
 * @param {number} windowId - The window ID whose tabs should be toggled
 * @returns {void}
 */
function toggleAllTabsInWindow(windowId) {
  const window = windowsData.find(w => w.id === windowId);
  if (!window) return;

  const tabIds = window.tabs.map(t => t.id);

  // Check if all tabs for this window are already selected
  const allSelected = tabIds.every(id => blueSelection.includes(id));

  if (allSelected) {
    // Remove all of the window's tabs from blueSelection
    blueSelection = blueSelection.filter(id => !tabIds.includes(id));
  } else {
    // Add only the tabs that are NOT yet in blueSelection
    tabIds.forEach(id => {
      if (!blueSelection.includes(id)) {
        blueSelection.push(id);
      }
    });
  }

  renderWindowTabs();
  renderWindowContent();
}


/**
 * Determines if two rectangles intersect using axis-aligned bounding box collision detection.
 * @param {Object} a - First rectangle {left, right, top, bottom}
 * @param {Object} b - Second rectangle {left, right, top, bottom}
 * @returns {boolean} True if the rectangles intersect, false otherwise
 */
function rectsIntersect(a, b) {
  return !(a.left > b.right || a.right < b.left || a.top > b.bottom || a.bottom < b.top);
}

/**
 * Attaches mousedown, mousemove, mouseup, and mouseleave handlers to enable marquee (drag-to-select) functionality.
 * Allows users to click and drag to create a selection rectangle that selects all cards within it.
 * Handles shift and ctrl modifiers for union and replace selection modes.
 * @returns {void}
 */
function attachDragSelectionHandlers() {
  const container = document.getElementById('windowContent');
  if (!container) return;

  container.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // left button only
    // don't start drag when clicking on controls inside cards
    if (e.target.closest('.page-card-close-btn')) return;
    isDragging = true;
    dragWasActive = false;
    dragStart = { x: e.clientX, y: e.clientY };

    marqueeEl = document.createElement('div');
    marqueeEl.className = 'marquee';
    marqueeEl.style.left = '0px';
    marqueeEl.style.top = '0px';
    marqueeEl.style.width = '0px';
    marqueeEl.style.height = '0px';
    container.appendChild(marqueeEl);

    e.preventDefault();
  });

  container.addEventListener('mousemove', (e) => {
    if (!isDragging || !marqueeEl) return;
    dragWasActive = true;
    const rect = container.getBoundingClientRect();
    const x1 = Math.min(dragStart.x, e.clientX);
    const y1 = Math.min(dragStart.y, e.clientY);
    const x2 = Math.max(dragStart.x, e.clientX);
    const y2 = Math.max(dragStart.y, e.clientY);

    const left = x1 - rect.left;
    const top = y1 - rect.top;
    const width = x2 - x1;
    const height = y2 - y1;

    marqueeEl.style.left = `${left}px`;
    marqueeEl.style.top = `${top}px`;
    marqueeEl.style.width = `${width}px`;
    marqueeEl.style.height = `${height}px`;

    // compute intersection with cards and highlight temporarily
    const marqueeClient = { left: x1, top: y1, right: x2, bottom: y2 };
    const cards = Array.from(container.querySelectorAll('.page-card'));
    cards.forEach(card => {
      const r = card.getBoundingClientRect();
      if (rectsIntersect(marqueeClient, r)) {
        card.classList.add('selected-blue');
      } else {
        // only remove if not in permanent selection
        const id = Number(card.dataset.tabId);
        if (!blueSelection.includes(id) && !redSelection.includes(id) && !yellowSelection.includes(id)) {
          card.classList.remove('selected-blue');
        }
      }
    });
  });

  function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    const rect = container.getBoundingClientRect();
    const x1 = Math.min(dragStart.x, e.clientX);
    const y1 = Math.min(dragStart.y, e.clientY);
    const x2 = Math.max(dragStart.x, e.clientX);
    const y2 = Math.max(dragStart.y, e.clientY);
    const marqueeClient = { left: x1, top: y1, right: x2, bottom: y2 };

    const cards = Array.from(container.querySelectorAll('.page-card'));
    const selectedIds = [];
    cards.forEach(card => {
      const r = card.getBoundingClientRect();
      if (rectsIntersect(marqueeClient, r)) {
        selectedIds.push(Number(card.dataset.tabId));
      }
      // remove temporary visual (will be re-rendered properly below)
      card.classList.remove('selected-blue');
    });

    if (selectedIds.length) {
      if (e.shiftKey || e.metaKey) {
        // union
        blueSelection = Array.from(new Set([...blueSelection, ...selectedIds]));
      } else if (!e.ctrlKey){
        // replace
        blueSelection = selectedIds;
      }
    } else if (!dragWasActive) {
      // It was a click with no drag — do nothing here, click handlers will handle it
    }

    // cleanup marquee
    if (marqueeEl && marqueeEl.parentNode) marqueeEl.parentNode.removeChild(marqueeEl);
    marqueeEl = null;

    // small timeout to allow click suppression
    setTimeout(() => {
      dragWasActive = false;
      renderWindowContent();
    }, 0);
  }

  container.addEventListener('mouseup', (e) => endDrag(e));
  container.addEventListener('mouseleave', (e) => endDrag(e));
}

/**
 * Displays an empty state UI when there are no windows or no tabs in the active window.
 * Clears both the window tabs list and content area.
 * @returns {void}
 */
function showEmptyState() {
  const tabsList = document.getElementById('windowTabsList');
  const contentArea = document.getElementById('windowContent');
  
  tabsList.innerHTML = '';
  contentArea.innerHTML = '<div class="empty-state">No windows available</div>';
  contentArea.classList.remove('active');
}

// Listen for changes in tabs
chrome.tabs.onCreated.addListener(() => {
  loadWindowsAndTabs();
});

chrome.tabs.onRemoved.addListener(() => {
  loadWindowsAndTabs();
});

chrome.tabs.onMoved.addListener(() => {
  loadWindowsAndTabs();
});

chrome.windows.onCreated.addListener(() => {
  loadWindowsAndTabs();
});

chrome.windows.onRemoved.addListener(() => {
  loadWindowsAndTabs();
});

// Refresh every 2 seconds to show updated data
// Removed polling: UI updates are driven by tab/window events and snapshot diffs

