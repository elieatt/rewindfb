export type Kind = 'posts' | 'reels';

/** Search from the page's first post, or from a chosen date. */
export type StartMode = 'first' | 'date';

/** A post or reel found in the feed. `t` is its creation time in Unix seconds. */
export interface Item {
  t: number;
  text: string;
}

/** Items by post or reel id. */
export type ItemMap = Map<string, Item>;

/** An item ready to list, oldest first. */
export interface Row extends Item {
  id: string;
  url: string;
}

export type StepStatus = 'pending' | 'active' | 'done';

export interface Step {
  title: string;
  status: StepStatus;
  detail: string;
  /** Progress from 0 to 1, or null when there is no bar to show. */
  value: number | null;
}

export interface Progress {
  value: number;
  detail: string;
}

export interface LogEntry {
  /** Epoch milliseconds. */
  t: number;
  message: string;
}
