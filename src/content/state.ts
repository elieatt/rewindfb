// What the panel shows for each page, the viewer's saved choices, and change notifications.

import { DEFAULT_COUNT, FB_START, MAX_COUNT } from './constants';
import type { ItemMap, Kind, LogEntry, Progress, Row, StartMode, Step } from './types';

export type Phase = 'idle' | 'running' | 'done' | 'stopped' | 'error';

/** One Facebook page's search and results. Kept per page path while the tab is open. */
export interface PageView {
  phase: Phase;
  kind: Kind;
  /** How many items were asked for; "Next N" loads this many more. */
  count: number;
  /** Search start in Unix seconds; FB_START means the page's first post. */
  from: number;
  name: string;
  pageId: string;
  /** The captured feed request the search replays. */
  template: string;
  steps: Step[];
  /** Everything collected so far, by id. */
  items: ItemMap | null;
  /** `items` as rows, oldest first. The first `shown` are listed. */
  all: Row[];
  shown: number;
  /** Every window before this time has been read completely. */
  nextAt: number;
  /** Reading reached today. */
  reachedEnd: boolean;
  loadingMore: boolean;
  moreProgress: Progress | null;
  moreError: string | null;
  error: string | null;
  stats: { requests: number; seconds: number } | null;
  log: LogEntry[];
  logOpen: boolean;
  /** Where the panel should scroll on its next render: the "more" row or a row index. */
  reveal: 'more' | number | null;
}

function createView(): PageView {
  return {
    phase: 'idle',
    kind: 'posts',
    count: DEFAULT_COUNT,
    from: FB_START,
    name: '',
    pageId: '',
    template: '',
    steps: [],
    items: null,
    all: [],
    shown: 0,
    nextAt: 0,
    reachedEnd: false,
    loadingMore: false,
    moreProgress: null,
    moreError: null,
    error: null,
    stats: null,
    log: [],
    logOpen: false,
    reveal: null,
  };
}

const views = new Map<string, PageView>();

export function getView(path: string): PageView {
  let view = views.get(path);
  if (!view) {
    view = createView();
    views.set(path, view);
  }
  return view;
}

/** Starts a fresh view for `path`. A new object, so nothing cached for the old one is reused. */
export function replaceView(path: string, fields: Partial<PageView>): PageView {
  const view = { ...createView(), ...fields };
  views.set(path, view);
  return view;
}

export function clearView(path: string): void {
  views.delete(path);
  notify();
}

export const shownRows = (view: PageView): Row[] => view.all.slice(0, view.shown);

/** Everything up to today is read and already listed. */
export const isExhausted = (view: PageView): boolean => view.reachedEnd && view.shown >= view.all.length;

// ---------------------------------------------------------------- change notifications

const listeners = new Set<() => void>();

export function subscribe(listener: () => void): void {
  listeners.add(listener);
}

export function notify(): void {
  for (const listener of listeners) listener();
}

// ---------------------------------------------------------------- saved choices

export interface Prefs {
  kind: Kind;
  count: number;
  start: StartMode;
  /** YYYY-MM-DD, or '' */
  date: string;
}

const PREFS_KEY = 'rewind-prefs';

function loadPrefs(): Prefs {
  const defaults: Prefs = { kind: 'posts', count: DEFAULT_COUNT, start: 'first', date: '' };
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null');
    if (typeof saved !== 'object' || saved === null) return defaults;
    const { kind, count, start, date } = saved as Partial<Record<keyof Prefs, unknown>>;
    return {
      kind: kind === 'reels' ? 'reels' : 'posts',
      count:
        Number.isInteger(count) && Number(count) >= 1 && Number(count) <= MAX_COUNT
          ? Number(count)
          : DEFAULT_COUNT,
      start: start === 'date' ? 'date' : 'first',
      date: typeof date === 'string' ? date : '',
    };
  } catch {
    // Storage can be blocked or hold something unreadable; start from defaults.
    return defaults;
  }
}

/** The viewer's last choices. Change them with updatePrefs(). */
export const prefs: Readonly<Prefs> = loadPrefs();

export function updatePrefs(changes: Partial<Prefs>): void {
  Object.assign(prefs, changes);
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Not saved; the choice still applies for this page load.
  }
}
