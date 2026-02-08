chrome.action.onClicked.addListener(() => {
  const url = chrome.runtime.getURL("app.html");
  chrome.tabs.create({ url });
});
