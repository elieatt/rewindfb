// Reading Facebook's feed responses. Pure functions, no network.
//
// A response is several JSON objects, one per line, roughly one feed story per line.
// Matching per line ties each post or reel id to that story's own creation_time.

import type { ItemMap, Kind, Row } from '../types';

export interface FeedPage {
  raw: string;
  /** Whether the page holds any story at all. */
  hasItems: boolean;
  endCursor: string | null;
  hasNextPage: boolean;
}

export function parseFeedPage(text: string): FeedPage {
  const lastCursor = [...text.matchAll(/"end_cursor":"([^"]*)"/g)].at(-1)?.[1];
  return {
    raw: text,
    hasItems: /"creation_time":\d+/.test(text),
    endCursor: lastCursor || null, // an empty cursor means none
    hasNextPage: text.includes('"has_next_page":true'),
  };
}

/** The `variables` object of a captured feed request body. */
export function feedVariables(template: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(new URLSearchParams(template).get('variables') ?? '{}');
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** The profile id a captured feed request is for. */
export function feedProfileId(template: string): string {
  const { id } = feedVariables(template);
  return typeof id === 'string' ? id : '';
}

/** The first line of a story's text, collapsed to one line. */
export function messageSnippet(line: string): string {
  const match = /"message":\{[^{}]*?"text":"((?:[^"\\]|\\.)*)"/.exec(line);
  if (!match?.[1]) return '';
  try {
    return (JSON.parse(`"${match[1]}"`) as string).replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

function keepEarliest(items: ItemMap, id: string, t: number, line: string): void {
  const previous = items.get(id);
  if (previous && previous.t <= t) return;
  // Keep text found earlier; an item's first appearance may lack it.
  items.set(id, { t, text: previous?.text || messageSnippet(line) });
}

/** Adds the posts and/or reels in a response to the given maps, keeping each item's earliest time. */
export function collectItems(raw: string, posts: ItemMap | null, reels: ItemMap | null): void {
  for (const line of raw.split('\n')) {
    const times = [...line.matchAll(/"creation_time":(\d+)/g)].map((m) => Number(m[1]));
    if (!times.length) continue;
    const t = Math.min(...times);
    if (posts) {
      const id = /"post_id":"(\d+)"/.exec(line)?.[1];
      if (id) keepEarliest(posts, id, t, line);
    }
    if (reels) {
      const ids = new Set([...line.matchAll(/reel\\?\/(\d{6,})/g)].flatMap((m) => (m[1] ? [m[1]] : [])));
      for (const id of ids) keepEarliest(reels, id, t, line);
    }
  }
}

/** Items as rows with links, oldest first. */
export function toRows(items: ItemMap, kind: Kind, pageId: string): Row[] {
  const url =
    kind === 'posts'
      ? (id: string) => `https://www.facebook.com/${pageId}/posts/${id}`
      : (id: string) => `https://www.facebook.com/reel/${id}`;
  return [...items]
    .sort(([, a], [, b]) => a.t - b.t)
    .map(([id, item]) => ({ id, t: item.t, text: item.text, url: url(id) }));
}
