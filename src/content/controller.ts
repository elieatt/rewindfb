// Starts searches and "Next N", one at a time, and saves what they find into the page's view.

import { currentPath, feedTemplate, waitForFeedTemplate } from './capture';
import { FeedClient } from './feed/client';
import { feedProfileId, toRows } from './feed/parse';
import { Job, StopError } from './job';
import { pageKind, pageName, type PageKind } from './page-info';
import { continueForward, findPosts, findReels, searchSteps } from './search';
import { notify, replaceView, type PageView } from './state';
import type { Kind } from './types';
import { errorMessage } from './util';

let current: Job | null = null;

export const activeJob = (): Job | null => current;

export function stopActiveJob(): void {
  current?.stop();
}

/** Like pageKind(), but a page whose feed request was captured is a main profile tab whatever its URL. */
export const currentPageKind = (): PageKind => (feedTemplate() ? 'main' : pageKind(location.href));

export interface SearchRequest {
  kind: Kind;
  count: number;
  /** Unix seconds; FB_START means the page's first post. */
  from: number;
}

export async function startSearch({ kind, count, from }: SearchRequest): Promise<void> {
  if (current || currentPageKind() !== 'main') return;
  const path = currentPath();
  const view = replaceView(path, {
    phase: 'running',
    kind,
    count,
    from,
    name: pageName(document),
    steps: searchSteps(kind, count, from),
  });
  const job = new Job(path, view, count, false);
  current = job;
  notify();

  try {
    if (!feedTemplate()) job.setStep(0, { status: 'active', detail: 'Connecting to the page feed…' });
    const template = await waitForFeedTemplate(() => job.stopped);
    job.checkStopped();
    if (!template) {
      throw new Error(
        currentPageKind() === 'reels'
          ? 'You’re on the Reels tab. Open the page’s main Posts tab, then try again.'
          : 'Couldn’t connect to this page’s feed. Open the page’s main profile (Posts tab), then try again.',
      );
    }
    view.template = template;
    view.pageId = feedProfileId(template);
    view.name = pageName(document) || view.name;
    const feed = new FeedClient(template, job);
    await (kind === 'posts' ? findPosts(job, feed, from) : findReels(job, feed, from));
    view.phase = 'done';
  } catch (error) {
    if (error instanceof StopError) {
      view.phase = 'stopped';
    } else {
      view.phase = 'error';
      view.error = errorMessage(error);
      job.log(`Error: ${view.error}`);
    }
  } finally {
    saveProgress(job);
    current = null;
    notify();
  }
}

/** Lists the next `view.count` items after the current list. */
export async function loadMore(view: PageView): Promise<void> {
  if (current || view.phase !== 'done' || !view.items) return;
  const first = view.shown;
  const target = first + view.count;
  view.moreError = null;

  // Already collected (a window often yields extra items), or nothing left to read.
  if (view.all.length >= target || view.reachedEnd) {
    view.shown = Math.min(target, view.all.length);
    view.reveal = first;
    notify();
    return;
  }

  const job = new Job(currentPath(), view, target, true);
  current = job;
  view.loadingMore = true;
  view.reveal = 'more';
  notify();

  try {
    await continueForward(job, new FeedClient(view.template, job), view);
  } catch (error) {
    if (!(error instanceof StopError)) {
      view.moreError = errorMessage(error);
      job.log(`Error: ${view.moreError}`);
    }
  } finally {
    saveProgress(job);
    job.log(`Loaded ${view.shown - first} more ${view.kind}`);
    view.loadingMore = false;
    view.moreProgress = null;
    view.reveal = first;
    current = null;
    notify();
  }
}

/** Copies what a job collected (kept even if it stopped or failed) into its view. */
function saveProgress(job: Job): void {
  const { view } = job;
  view.stats =
    job.more && view.stats
      ? { requests: view.stats.requests + job.requests, seconds: view.stats.seconds + job.seconds }
      : { requests: job.requests, seconds: job.seconds };
  if (!job.collected) return;
  view.items = job.collected;
  view.nextAt = job.nextAt;
  view.reachedEnd = job.reachedEnd;
  view.all = toRows(view.items, view.kind, view.pageId);
  view.shown = Math.min(view.all.length, job.target);
}
