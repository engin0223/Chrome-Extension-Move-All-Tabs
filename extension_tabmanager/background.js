// Background: simplified. UI (`ui.html`) now provides all merge/split functionality.
// The action just opens the packaged UI in a new tab when clicked.
/**
 * Handles the extension action button click event.
 * Opens the extension's UI page (ui.html) in a new tab when the user clicks
 * the extension icon in the browser toolbar.
 */
chrome.action.onClicked.addListener(() => {
  const packagedUrl = chrome.runtime.getURL('ui.html');
  chrome.tabs.create({ url: packagedUrl });
});
