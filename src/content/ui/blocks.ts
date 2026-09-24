// The panel body: idle hints, search progress, results, "Next N" and the activity log.
//
// Blocks are cached and updated in place. The body is re-assembled only when its set of
// blocks changes, so a click never lands on a node that is being replaced.

import { currentPath } from '../capture';
import { FB_START } from '../constants';
import { activeJob, currentPageKind, loadMore, stopActiveJob } from '../controller';
import { csvFileName, linksText, toCsv } from '../export';
import { formatClock, formatDate, formatTime, plural, timeAgo } from '../format';
import type { Job } from '../job';
import { clearView, isExhausted, prefs, shownRows, type PageView } from '../state';
import type { Kind, Row } from '../types';
import { h } from './dom';

const singular = (kind: Kind): string => kind.slice(0, -1); // post / reel

const stopButton = (): HTMLButtonElement =>
  h(
    'button',
    { type: 'button', class: 'secondary', on: { pointerdown: stopActiveJob, click: stopActiveJob } },
    'Stop',
  );

/** Everything under the controls for `view`, in order. `retry` repeats the last search. */
export function bodyBlocks(view: PageView, retry: () => void): HTMLElement[] {
  const job = activeJob();
  const blocks: HTMLElement[] = [];
  if (job && job.view !== view) blocks.push(otherJobBanner(job));
  blocks.push(...stateBlocks(view, job, retry));
  if (view.log.length) blocks.push(logBlock(view));
  return blocks;
}

// ---------------------------------------------------------------- page state

const stateCache = new WeakMap<PageView, { key: string; nodes: HTMLElement[] }>();

function stateBlocks(view: PageView, job: Job | null, retry: () => void): HTMLElement[] {
  if (view.phase === 'running') return job ? [runningBlock(view, job)] : [];
  // Everything but the running view is static, so it is built once per distinct state.
  const key =
    view.phase === 'idle'
      ? ['idle', currentPageKind(), prefs.kind, prefs.start, job !== null].join('|')
      : [view.phase, job !== null, view.shown, view.loadingMore, view.moreError, isExhausted(view)].join('|');
  const cached = stateCache.get(view);
  if (cached?.key === key) return cached.nodes;
  const nodes = buildState(view, job, retry);
  stateCache.set(view, { key, nodes });
  return nodes;
}

function buildState(view: PageView, job: Job | null, retry: () => void): HTMLElement[] {
  const found = shownRows(view).length;
  const partial = (): HTMLElement[] => (found ? resultsBlocks(view, job, true) : []);
  switch (view.phase) {
    case 'done':
      return resultsBlocks(view, job, false);
    case 'stopped':
      return [
        h(
          'div',
          { class: 'note warn' },
          h(
            'div',
            {},
            found
              ? `Stopped. Showing the ${plural(found, singular(view.kind))} found so far.`
              : 'Stopped before anything was found.',
          ),
        ),
        ...partial(),
      ];
    case 'error':
      return [
        h(
          'div',
          { class: 'note err' },
          h('div', {}, view.error ?? ''),
          h(
            'div',
            { class: 'row' },
            h('span'),
            h(
              'button',
              { type: 'button', class: 'secondary', disabled: job !== null, on: { click: retry } },
              'Try again',
            ),
          ),
        ),
        ...partial(),
      ];
    case 'idle':
    case 'running':
      return [idleBlock(job)];
  }
}

function note(tone: 'warn' | 'err', title: string, text: string): HTMLElement {
  return h('div', { class: `note ${tone}` }, h('div', {}, h('b', {}, title), h('div', {}, text)));
}

function idleBlock(job: Job | null): HTMLElement {
  switch (currentPageKind()) {
    case 'none':
      return note(
        'err',
        'No page open.',
        'Go to a Facebook page or profile (for example facebook.com/pagename) to search it.',
      );
    case 'reels':
      return note(
        'warn',
        'You’re on the Reels tab.',
        'Switch to the page’s main Posts tab. The tool reads reels through the page’s feed.',
      );
    case 'tab':
      return note('warn', 'Switch to the Posts tab.', 'The search runs from the page’s main Posts tab.');
    case 'main':
      break;
  }
  if (job)
    return h(
      'div',
      { class: 'empty' },
      'You can search this page when the other search finishes, or stop it.',
    );
  const what =
    prefs.kind === 'posts'
      ? `${prefs.start === 'date' ? 'posts from the date you pick' : 'oldest posts'}, oldest first. Usually under a minute.`
      : `${prefs.start === 'date' ? 'reels from the date you pick' : 'oldest reels'}, oldest first. Can take a few minutes on busy pages.`;
  return h('div', { class: 'empty' }, h('b', {}, 'Ready.'), h('div', {}, `Lists this page’s ${what}`));
}

// ---------------------------------------------------------------- running search

interface RunningUi {
  job: Job;
  root: HTMLElement;
  meta: HTMLElement;
  steps: { item: HTMLElement; dot: HTMLElement; detail: HTMLElement; bar: HTMLElement; fill: HTMLElement }[];
}
let runningUi: RunningUi | null = null;

/** Built once per search; afterwards only its text and bar widths change. */
function runningBlock(view: PageView, job: Job): HTMLElement {
  if (runningUi?.job !== job) {
    const steps = view.steps.map((step, i) => {
      const dot = h('span', { class: 'dot' });
      const detail = h('div', { class: 'd' });
      const fill = h('i');
      const bar = h('div', { class: 'bar' }, fill);
      const item = h(
        'li',
        { class: 'step' },
        dot,
        h('div', {}, h('div', { class: 't' }, `${i + 1}. ${step.title}`), detail, bar),
      );
      return { item, dot, detail, bar, fill };
    });
    const meta = h('span');
    const root = h(
      'div',
      { class: 'running' },
      h(
        'ol',
        { class: 'steps' },
        steps.map((s) => s.item),
      ),
      h('div', { class: 'runfoot' }, meta, stopButton()),
    );
    runningUi = { job, root, meta, steps };
  }

  view.steps.forEach((step, i) => {
    const ui = runningUi?.steps[i];
    if (!ui) return;
    ui.item.dataset.status = step.status;
    ui.dot.textContent = step.status === 'done' ? '✓' : '';
    ui.detail.textContent = step.status === 'active' && job.retrying ? job.retrying : step.detail;
    ui.detail.hidden = !ui.detail.textContent;
    ui.bar.hidden = !(step.status === 'active' && step.value !== null);
    ui.fill.style.width = `${Math.round((step.value ?? 0) * 100)}%`;
  });
  runningUi.meta.textContent = job.stopped
    ? 'Stopping…'
    : `${job.seconds} s · ${plural(job.requests, 'request')}`;
  return runningUi.root;
}

// ---------------------------------------------------------------- search on another page

let banner: { root: HTMLElement; title: HTMLElement; detail: HTMLElement } | null = null;

function otherJobBanner(job: Job): HTMLElement {
  if (!banner) {
    const title = h('b');
    const detail = h('div', { class: 'sub' });
    const root = h(
      'div',
      { class: 'note info' },
      h('div', {}, title, detail),
      h(
        'div',
        { class: 'row' },
        h('span', { class: 'sub' }, 'Results will be waiting on that page.'),
        stopButton(),
      ),
    );
    banner = { root, title, detail };
  }
  const { view } = job;
  const name = view.name || 'another page';
  if (job.more) {
    banner.title.textContent = `Loading more ${view.kind} on ${name}`;
    banner.detail.textContent = job.retrying ?? view.moreProgress?.detail ?? 'Starting…';
  } else {
    const active = view.steps.find((step) => step.status === 'active');
    banner.title.textContent = `Still searching ${name}`;
    banner.detail.textContent = active ? `${active.title}: ${job.retrying ?? active.detail}` : 'Starting…';
  }
  return banner.root;
}

// ---------------------------------------------------------------- results

function resultsBlocks(view: PageView, job: Job | null, partial: boolean): HTMLElement[] {
  const rows = shownRows(view);
  const first = rows[0];
  if (!first) {
    return [
      h(
        'div',
        { class: 'empty' },
        h('b', {}, `No ${view.kind} found.`),
        h(
          'div',
          {},
          view.kind === 'reels' ? 'This page has no reels in its feed.' : 'This page has no visible posts.',
        ),
      ),
    ];
  }

  const blocks: HTMLElement[] = [];
  if (!partial) blocks.push(summaryBlock(view, first, rows.length));
  blocks.push(
    h(
      'ol',
      { class: 'list' },
      rows.map((row, i) => resultItem(row, i, view.kind)),
    ),
  );
  if (!partial) blocks.push(moreBlock(view, job));

  const copy = h('button', { type: 'button', class: 'secondary' }, 'Copy links');
  copy.addEventListener('click', () => {
    void copyLinks(rows, copy);
  });
  const download = h('button', { type: 'button', class: 'secondary' }, 'Download CSV');
  download.addEventListener('click', () => {
    downloadCsv(view, rows, download);
  });
  const clear = h('button', { type: 'button', class: 'secondary', disabled: view.loadingMore }, 'Clear');
  clear.addEventListener('click', () => {
    clearView(currentPath());
  });
  blocks.push(h('div', { class: 'actions' }, copy, download, clear));
  return blocks;
}

function summaryBlock(view: PageView, first: Row, count: number): HTMLElement {
  const noun = singular(view.kind);
  const since = view.from > FB_START;
  const complete = isExhausted(view) ? (since ? ' (all up to today)' : ' (all the page has)') : '';
  const stats = view.stats ? ` · ${view.stats.seconds} s · ${plural(view.stats.requests, 'request')}` : '';
  return h(
    'div',
    { class: 'summary' },
    h('div', { class: 'eyebrow' }, since ? `First ${noun} since ${formatDate(view.from)}` : `First ${noun}`),
    h('div', { class: 'big' }, formatDate(first.t)),
    h('div', { class: 'sub' }, `${formatTime(first.t)} · ${timeAgo(first.t)}`),
    h('div', { class: 'meta' }, `${plural(count, noun)}${complete}${stats}`),
  );
}

function resultItem(row: Row, index: number, kind: Kind): HTMLElement {
  const noun = singular(kind);
  const text = row.text
    ? h('div', { class: 'text', dir: 'auto' }, row.text)
    : h('div', { class: 'text none' }, kind === 'reels' ? `Reel ${row.id}` : 'No text');
  return h(
    'li',
    {},
    h(
      'a',
      { class: 'item', href: row.url, target: '_blank', rel: 'noopener', title: `Open ${noun} in a new tab` },
      h('span', { class: 'idx' }, String(index + 1)),
      h(
        'div',
        {},
        h('div', { class: 'when' }, h('b', {}, formatDate(row.t)), h('span', {}, ` · ${formatTime(row.t)}`)),
        text,
      ),
      h('span', { class: 'open', 'aria-hidden': 'true' }, '↗'),
    ),
  );
}

// ---------------------------------------------------------------- "Next N"

const moreCache = new WeakMap<PageView, { title: HTMLElement; detail: HTMLElement; fill: HTMLElement }>();

/** Under the list: the "Next N" button, its progress while loading, or the end-of-feed note. */
function moreBlock(view: PageView, job: Job | null): HTMLElement {
  if (view.loadingMore) {
    const title = h('b');
    const detail = h('div', { class: 'sub' });
    const fill = h('i');
    moreCache.set(view, { title, detail, fill });
    const root = h(
      'div',
      { class: 'more' },
      h('div', { class: 'more-head' }, title, stopButton()),
      detail,
      h('div', { class: 'bar' }, fill),
    );
    updateMoreProgress(view);
    return root;
  }

  const error = view.moreError ? h('div', { class: 'note err' }, h('div', {}, view.moreError)) : null;
  if (isExhausted(view)) return h('div', { class: 'more end' }, error, 'That’s everything up to today.');

  const last = view.all[view.shown - 1];
  // Once reading reached today, the number left is known exactly.
  const next = view.reachedEnd ? Math.min(view.count, view.all.length - view.shown) : view.count;
  const label = view.moreError ? 'Try again' : `Next ${next} ${next === 1 ? singular(view.kind) : view.kind}`;
  const button = h('button', { type: 'button', class: 'next', disabled: job !== null }, label);
  button.addEventListener('click', () => {
    void loadMore(view);
  });
  return h(
    'div',
    { class: 'more' },
    error,
    button,
    last ? h('div', { class: 'hint' }, `Continues after ${formatDate(last.t)}, ${formatTime(last.t)}`) : null,
  );
}

/** Updates the loading row of "Next N" in place. */
export function updateMoreProgress(view: PageView): void {
  const ui = moreCache.get(view);
  if (!view.loadingMore || !ui) return;
  const job = activeJob();
  ui.title.textContent = `Loading ${view.kind} ${view.shown + 1}–${view.shown + view.count}…`;
  ui.detail.textContent =
    (job?.view === view ? job.retrying : null) ?? view.moreProgress?.detail ?? 'Starting…';
  ui.fill.style.width = `${Math.round((view.moreProgress?.value ?? 0) * 100)}%`;
}

// ---------------------------------------------------------------- activity log

const logCache = new WeakMap<PageView, { length: number; node: HTMLElement }>();

function logBlock(view: PageView): HTMLElement {
  const cached = logCache.get(view);
  if (cached?.length === view.log.length) return cached.node;
  const details = h(
    'details',
    { open: view.logOpen },
    h('summary', {}, `Activity (${view.log.length})`),
    h(
      'ul',
      { class: 'log' },
      view.log.map((entry) => h('li', {}, h('time', {}, formatClock(entry.t)), entry.message)),
    ),
  );
  details.addEventListener('toggle', () => {
    view.logOpen = details.open;
  });
  logCache.set(view, { length: view.log.length, node: details });
  return details;
}

// ---------------------------------------------------------------- export

async function copyLinks(rows: readonly Row[], button: HTMLButtonElement): Promise<void> {
  const label = button.textContent;
  try {
    await navigator.clipboard.writeText(linksText(rows));
    button.textContent = 'Copied ✓';
  } catch {
    button.textContent = 'Copy failed';
  }
  setTimeout(() => {
    button.textContent = label;
  }, 1500);
}

function downloadCsv(view: PageView, rows: readonly Row[], near: HTMLElement): void {
  // The byte-order mark makes Excel read Arabic and other non-Latin text correctly.
  const blob = new Blob(['\uFEFF', toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = h('a', {
    href: url,
    download: csvFileName(view.name || view.pageId, rows.length, view.kind, view.from),
  });
  near.after(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 2000);
}
