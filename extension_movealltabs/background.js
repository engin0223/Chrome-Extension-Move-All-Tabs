// Background: simplified. UI (`ui.html`) now provides all merge/split functionality.
// The action just opens the packaged UI in a new tab when clicked.
chrome.action.onClicked.addListener(() => {
  const packagedUrl = chrome.runtime.getURL('ui.html');
  chrome.tabs.create({ url: packagedUrl });
});
