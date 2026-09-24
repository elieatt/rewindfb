// The date searches. They only use afterTime/beforeTime filters, so finding the oldest items
// costs a few dozen requests instead of paging through a page's whole history.

import { DAY, FB_START, HOUR, REEL_WORKERS, REQUEST_DELAY, WINDOW } from './constants';
import type { FeedClient } from './feed/client';
import { formatDate, formatTime } from './format';
import type { Job } from './job';
import { notify, type PageView } from './state';
import type { ItemMap, Kind, Step } from './types';
import { errorMessage, nowSec } from './util';

/** Page id -> time just after the page's first post, reused by later searches. */
const firstPostCache = new Map<string, number>();

const step = (title: string): Step => ({ title, status: 'pending', detail: '', value: null });

export function searchSteps(kind: Kind, count: number, from: number): Step[] {
  const findStart = step(
    from === FB_START
      ? 'Find the date of the first post'
      : `Find the first post on or after ${formatDate(from)}`,
  );
  return kind === 'posts'
    ? [findStart, step(`Collect ${count} posts`)]
    : [findStart, step('Find the first reel'), step(`Collect ${count} reels`)];
}

/**
 * Binary searches `beforeTime` for the first post made at or after `from`; with FB_START,
 * the page's very first post. Also jumps over quiet months or years.
 * Returns a time at most an hour after that post.
 */
async function findStart(job: Job, feed: FeedClient, from: number): Promise<number> {
  const { pageId } = job.view;
  const known = firstPostCache.get(pageId);
  if (known !== undefined && from <= known - HOUR) {
    job.setStep(0, { status: 'done', value: 1, detail: `Around ${formatDate(known)} (remembered)` });
    return known;
  }

  job.setStep(0, { status: 'active', value: 0, detail: 'Checking for posts…' });
  const after = from === FB_START ? null : from;
  let lo = from;
  let hi = nowSec();
  if (!(await feed.page(after, hi)).hasItems) {
    throw new Error(
      after === null
        ? 'This page has no posts the tool can see.'
        : `This page has no posts on or after ${formatDate(from)}.`,
    );
  }

  const total = Math.ceil(Math.log2(Math.max(2, (hi - lo) / HOUR)));
  for (let i = 1; hi - lo > HOUR; i++) {
    const mid = Math.floor((lo + hi) / 2);
    if ((await feed.page(after, mid)).hasItems) hi = mid;
    else lo = mid;
    job.setStep(0, {
      value: Math.min(1, i / total),
      detail: `Between ${formatDate(lo)} and ${formatDate(hi)}`,
    });
    await job.pause(REQUEST_DELAY);
  }

  const since = after === null ? '' : ` on or after ${formatDate(from)}`;
  job.log(`First post${since} is just before ${formatDate(hi)}, ${formatTime(hi)}`);
  job.setStep(0, { status: 'done', value: 1, detail: `Around ${formatDate(hi)}` });
  if (after === null) firstPostCache.set(pageId, hi);
  return hi;
}

/** Where reading starts: a day before the found post, but never before `from`. */
const readingStart = (found: number, from: number): number => Math.max(from, found - DAY);

type Report = (value: number, detail: string) => void;

const stepReport =
  (job: Job, index: number): Report =>
  (value, detail) => {
    job.setStep(index, { status: 'active', value, detail });
  };

/**
 * Reads windows forward from `start` until `items` holds `target` items or reading reaches today.
 * Each window is read completely, so `items` is complete and in time order up to job.nextAt;
 * that is what lets "Next N" continue exactly where the list ended.
 */
async function collectForward(
  job: Job,
  feed: FeedClient,
  start: number,
  items: ItemMap,
  kind: Kind,
  report: Report,
): Promise<void> {
  const end = nowSec();
  const base = items.size;
  const want = job.target - base;
  job.collected = items;
  job.nextAt = start;
  report(0, 'Starting…');
  while (items.size < job.target && job.nextAt < end) {
    const windowStart = job.nextAt;
    const [posts, reels] = kind === 'posts' ? [items, null] : [null, items];
    await feed.readWindow(windowStart, windowStart + WINDOW, posts, reels);
    job.nextAt = windowStart + WINDOW;
    const got = Math.min(items.size, job.target) - base;
    report(Math.min(1, got / want), `${got} of ${want} · through ${formatDate(Math.min(job.nextAt, end))}`);
  }
  job.reachedEnd = job.nextAt >= end;
}

export async function findPosts(job: Job, feed: FeedClient, from: number): Promise<void> {
  const found = await findStart(job, feed, from);
  const items: ItemMap = new Map();
  await collectForward(job, feed, readingStart(found, from), items, 'posts', stepReport(job, 1));
  job.setStep(1, { status: 'done', value: 1, detail: `${Math.min(items.size, job.target)} found` });
}

export async function findReels(job: Job, feed: FeedClient, from: number): Promise<void> {
  const found = await findStart(job, feed, from);
  const firstWindow = await findFirstReelWindow(job, feed, readingStart(found, from), from);
  const items: ItemMap = new Map();
  await collectForward(job, feed, firstWindow, items, 'reels', stepReport(job, 2));
  job.setStep(2, { status: 'done', value: 1, detail: `${Math.min(items.size, job.target)} found` });
}

/** Start of the earliest window that contains a reel, checking REEL_WORKERS windows at a time. */
async function findFirstReelWindow(job: Job, feed: FeedClient, start: number, from: number): Promise<number> {
  const end = nowSec();
  job.setStep(1, { status: 'active', value: 0, detail: 'Checking 2-week windows…' });
  let next = start;
  let best = Infinity;
  let reached = start;
  let failure: unknown = null;

  const worker = async (): Promise<void> => {
    try {
      // Windows later than a found reel can't hold the first one.
      while (next < end && next < best) {
        const windowStart = next;
        next += WINDOW;
        const reels: ItemMap = new Map();
        await feed.readWindow(windowStart, windowStart + WINDOW, null, reels, () => reels.size > 0);
        if (reels.size) best = Math.min(best, windowStart);
        reached = Math.max(reached, windowStart + WINDOW);
        if (best === Infinity) {
          job.setStep(1, {
            value: Math.min(1, (reached - start) / (end - start)),
            detail: `No reels through ${formatDate(Math.min(reached, end))}`,
          });
        }
      }
    } catch (error) {
      failure ??= error;
      job.stopped = true; // stops the other workers too
    }
  };
  await Promise.all(Array.from({ length: REEL_WORKERS }, worker));

  if (failure !== null) throw failure instanceof Error ? failure : new Error(errorMessage(failure));
  if (best === Infinity) {
    throw new Error(
      from === FB_START
        ? 'No reels found in this page’s feed.'
        : `No reels found on or after ${formatDate(from)}.`,
    );
  }
  const between = `Between ${formatDate(best)} and ${formatDate(best + WINDOW)}`;
  job.log(`First reel is ${between.toLowerCase()}`);
  job.setStep(1, { status: 'done', value: 1, detail: between });
  return best;
}

/** "Next N": continues reading from where the view's list ended. */
export async function continueForward(job: Job, feed: FeedClient, view: PageView): Promise<void> {
  if (!view.items) return;
  await collectForward(job, feed, view.nextAt, view.items, view.kind, (value, detail) => {
    view.moreProgress = { value, detail };
    notify();
  });
}
