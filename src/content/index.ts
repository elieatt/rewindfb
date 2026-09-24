// Entry point of the script that runs inside Facebook's page (the "MAIN" world), at document_start.

import { installCapture } from './capture';
import { notify } from './state';
import { setUpPanel } from './ui/panel';

declare global {
  interface Window {
    __rewind?: true;
  }
}

// Never install twice in the same page.
if (!window.__rewind) {
  window.__rewind = true;
  installCapture(notify);
  setUpPanel();
}
