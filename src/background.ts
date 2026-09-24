import { TOGGLE, type ToggleMessage } from './shared/messages';

// Toolbar icon click: ask the tab to show or hide the panel.
chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return;
  const message: ToggleMessage = { type: TOGGLE };
  chrome.tabs.sendMessage(tab.id, message).catch(() => {
    // Not a Facebook tab, or one opened before the extension was installed.
  });
});
