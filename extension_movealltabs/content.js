document.addEventListener("contextmenu", () => {
  chrome.runtime.sendMessage({ type: "RIGHT_CLICK" });
});
