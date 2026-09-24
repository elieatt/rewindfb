/** Message (background -> bridge) and DOM event (bridge -> page) that shows or hides the panel. */
export const TOGGLE = 'rewind-toggle';

export interface ToggleMessage {
  type: typeof TOGGLE;
}

export const isToggleMessage = (message: unknown): message is ToggleMessage =>
  typeof message === 'object' && message !== null && (message as { type?: unknown }).type === TOGGLE;
