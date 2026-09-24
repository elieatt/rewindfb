// Watches Facebook's own GraphQL requests and keeps the latest posts-feed request.
// Its body carries everything a request needs (doc_id, the fb_dtsg token, variables),
// so searches replay it with different dates instead of building requests from scratch.

import { FEED_QUERY } from './constants';
import { sleep } from './util';

/** fetch from before the hook, for the extension's own requests. */
export const pageFetch: typeof fetch = window.fetch.bind(window);

export const currentPath = (): string => location.pathname + location.search;

let captured: { body: string; path: string } | null = null;

/** The captured feed request body, if it was captured on the current page. */
export function feedTemplate(): string | null {
  return captured?.path === currentPath() ? captured.body : null;
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}

function consider(url: unknown, body: unknown, onCapture: () => void): void {
  if (!String(url).includes('/api/graphql')) return;
  const text = body instanceof URLSearchParams ? body.toString() : body;
  if (typeof text !== 'string' || !text.includes(FEED_QUERY)) return;
  captured = { body: text, path: currentPath() };
  onCapture();
}

/**
 * Hooks XMLHttpRequest and fetch. Must run at document_start, before Facebook's scripts
 * keep their own references to these functions.
 */
export function installCapture(onCapture: () => void): void {
  // The originals are always called with the request as `this` (Reflect.apply / call below).
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { open, send } = XMLHttpRequest.prototype;
  const urls = new WeakMap<XMLHttpRequest, unknown>();

  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: unknown[]) {
    urls.set(this, args[1]);
    Reflect.apply(open, this, args);
  };

  XMLHttpRequest.prototype.send = function (
    this: XMLHttpRequest,
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    try {
      consider(urls.get(this), body, onCapture);
    } catch {
      // Never let the hook break Facebook's own request.
    }
    send.call(this, body);
  };

  window.fetch = (input, init) => {
    try {
      consider(urlOf(input), init?.body, onCapture);
    } catch {
      // As above.
    }
    return pageFetch(input, init);
  };
}

/**
 * Facebook sends the feed request when the profile is scrolled near the end of what is loaded.
 * Jumps to the bottom, nudging up and back down if nothing fires, until it is captured.
 */
export async function waitForFeedTemplate(isStopped: () => boolean): Promise<string | null> {
  if (feedTemplate()) return feedTemplate();
  const scrollY = window.scrollY;
  for (let i = 0; i < 15 && !feedTemplate() && !isStopped(); i++) {
    if (i % 3 === 2) {
      window.scrollBy(0, -1200);
      await sleep(400);
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await sleep(1200);
  }
  window.scrollTo(0, scrollY);
  return feedTemplate();
}
