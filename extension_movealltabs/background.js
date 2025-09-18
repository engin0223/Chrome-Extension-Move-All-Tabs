function buildMenu(currentWindowId) {
  chrome.contextMenus.removeAll(() => {
    // Parent menu for merging
    chrome.contextMenus.create({
      id: "mergeWindowsParent",
      title: "Merge all tabs from another window",
      contexts: ["all"]
    });

    // List all windows except current/focused one
    chrome.windows.getAll({ populate: true }, (windows) => {
      windows.forEach(win => {
        if (win.tabs.length === 0 || win.id === currentWindowId) return;

        const firstTabTitle = win.tabs[0].title.substring(0, 50);
        chrome.contextMenus.create({
          id: `mergeWindow-${win.id}`,
          parentId: "mergeWindowsParent",
          title: `${firstTabTitle} (${win.tabs.length} tabs)`,
          contexts: ["all"]
        });
      });
    });

    // New menu item to split current window
    chrome.contextMenus.create({
      id: "splitWindow",
      title: "Split window (current tab → new window)",
      contexts: ["all"]
    });
  });
}

// Track focused window
let lastFocusedWindowId = null;
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    lastFocusedWindowId = windowId;
    buildMenu(lastFocusedWindowId);
  }
});

// Initial build
chrome.runtime.onInstalled.addListener(() => {
  chrome.windows.getCurrent((w) => buildMenu(w.id));
});

// Handle menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const targetWindowId = tab.windowId;

  if (info.menuItemId.startsWith("mergeWindow-")) {
    const sourceWindowId = parseInt(info.menuItemId.replace("mergeWindow-", ""), 10);
    if (sourceWindowId === targetWindowId) return;

    chrome.windows.get(sourceWindowId, { populate: true }, (sourceWin) => {
      sourceWin.tabs.forEach(t => {
        chrome.tabs.move(t.id, { windowId: targetWindowId, index: -1 });
      });
    });
  }

  else if (info.menuItemId === "splitWindow") {
    chrome.windows.get(targetWindowId, { populate: true }, async (win) => {
      const tabs = win.tabs;
      if (!tabs || tabs.length < 2) return;

      const clickedTabId = tab.id;
      const otherTabIds = tabs.filter(t => t.id !== clickedTabId).map(t => t.id);

      // Step 1: Create a new window with all other tabs, minimized first
      function createWindowWithTabs(tabIds, state = "minimized") {
        return new Promise((resolve) => {
          chrome.windows.create({ tabId: tabIds[0], state }, (win) => {
            if (tabIds.length > 1) {
              chrome.tabs.move(tabIds.slice(1), { windowId: win.id, index: -1 }, () => resolve(win));
            } else {
              resolve(win);
            }
          });
        });
      }

      const secondWindow = await createWindowWithTabs(otherTabIds, "minimized");

      // Step 2: Move the clicked tab to a new window but keep original size
      chrome.windows.create({ 
        tabId: clickedTabId,
        state: win.state // keep the original window state (fullscreen, normal, etc.)
      });

      // Optional: maximize second window after creation
      chrome.windows.update(secondWindow.id, { state: "maximized"});
    });
  }
});
