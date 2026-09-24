import { TOGGLE, isToggleMessage } from './shared/messages';

// Runs in the extension's isolated world. The panel runs in the page's own world, which
// can't receive extension messages, so forward them as a DOM event.
chrome.runtime.onMessage.addListener((message: unknown) => {
  if (isToggleMessage(message)) window.dispatchEvent(new CustomEvent(TOGGLE));
});
