import { pageFetch } from '../capture';
import { MAX_PAGES_PER_WINDOW, MAX_RETRIES, REQUEST_DELAY, RETRY_STEP_MS } from '../constants';
import type { ItemMap } from '../types';
import { collectItems, feedVariables, parseFeedPage, type FeedPage } from './parse';

/** How a running search observes and controls requests. */
export interface RequestControl {
  /** Throws if the search was stopped. */
  checkStopped(): void;
  /** Waits, ending early (by throwing) if the search is stopped. */
  pause(ms: number): Promise<void>;
  onRequest(): void;
  /** A message while retrying after a failure, null once requests succeed again. */
  onRetry(message: string | null): void;
}

/** Replays a captured feed request with date filters. */
export class FeedClient {
  private readonly variables: Record<string, unknown>;

  constructor(
    private readonly template: string,
    private readonly control: RequestControl,
  ) {
    this.variables = feedVariables(template);
  }

  /** One page of the feed, limited to stories made between `after` (or the beginning) and `before`. */
  async page(after: number | null, before: number, cursor: string | null = null): Promise<FeedPage> {
    const body = new URLSearchParams(this.template);
    body.set(
      'variables',
      JSON.stringify({
        ...this.variables,
        cursor,
        afterTime: after,
        beforeTime: before,
        omitPinnedPost: true,
      }),
    );
    for (let attempt = 0; ; attempt++) {
      this.control.checkStopped();
      const text = await this.post(body);
      if (text !== null) {
        this.control.onRetry(null);
        return parseFeedPage(text);
      }
      if (attempt >= MAX_RETRIES) {
        throw new Error(
          'Facebook stopped answering. It is probably limiting requests. Wait a few minutes, then try again.',
        );
      }
      const wait = RETRY_STEP_MS * (attempt + 1);
      this.control.onRetry(`Facebook is slowing down. Retrying in ${wait / 1000} s…`);
      await this.control.pause(wait);
    }
  }

  /**
   * Reads every page between `after` and `before` into `posts` and/or `reels`.
   * `stopWhen` can end it early, e.g. as soon as one reel is found.
   */
  async readWindow(
    after: number,
    before: number,
    posts: ItemMap | null,
    reels: ItemMap | null,
    stopWhen: () => boolean = () => false,
  ): Promise<void> {
    let cursor: string | null = null;
    for (let i = 0; i < MAX_PAGES_PER_WINDOW; i++) {
      const page = await this.page(after, before, cursor);
      collectItems(page.raw, posts, reels);
      if (stopWhen() || !page.hasNextPage || !page.endCursor || !page.hasItems) return;
      cursor = page.endCursor;
      await this.control.pause(REQUEST_DELAY);
    }
  }

  /** The response text, or null if the request failed or Facebook returned an error. */
  private async post(body: URLSearchParams): Promise<string | null> {
    try {
      const response = await pageFetch('/api/graphql/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const text = await response.text();
      this.control.onRequest();
      return response.ok && text.includes('"data"') ? text : null;
    } catch {
      return null;
    }
  }
}
