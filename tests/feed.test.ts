import { describe, expect, it } from 'vitest';
import {
  collectItems,
  feedProfileId,
  messageSnippet,
  parseFeedPage,
  toRows,
} from '../src/content/feed/parse';
import type { ItemMap } from '../src/content/types';

/** One feed story as Facebook sends it: a JSON object on its own line, with escaped slashes. */
const story = (postId: string, t: number, text: string, reelId?: string): string =>
  JSON.stringify({
    data: {
      node: {
        post_id: postId,
        creation_time: t,
        message: { text },
        url: reelId ? `https://www.facebook.com/reel/${reelId}` : '',
      },
    },
  }).replace(/\//g, '\\/');

const pageInfo = (cursor: string, hasNext: boolean): string =>
  JSON.stringify({ data: { page_info: { end_cursor: cursor, has_next_page: hasNext } } });

describe('parseFeedPage', () => {
  it('reads the last cursor and whether more pages exist', () => {
    const page = parseFeedPage([story('1', 100, 'a'), pageInfo('abc', true)].join('\n'));
    expect(page).toMatchObject({ hasItems: true, endCursor: 'abc', hasNextPage: true });
  });

  it('handles an empty page', () => {
    const page = parseFeedPage(pageInfo('', false));
    expect(page).toMatchObject({ hasItems: false, endCursor: null, hasNextPage: false });
  });
});

describe('collectItems', () => {
  const raw = [
    story('11', 300, 'Third'),
    story('10', 100, 'First\nline two', '900000001'),
    story('12', 200, ''),
    pageInfo('c', false),
  ].join('\n');

  it('collects posts with their own time and text', () => {
    const posts: ItemMap = new Map();
    collectItems(raw, posts, null);
    expect([...posts]).toEqual([
      ['11', { t: 300, text: 'Third' }],
      ['10', { t: 100, text: 'First line two' }],
      ['12', { t: 200, text: '' }],
    ]);
  });

  it('collects only stories that link a reel', () => {
    const reels: ItemMap = new Map();
    collectItems(raw, null, reels);
    expect([...reels]).toEqual([['900000001', { t: 100, text: 'First line two' }]]);
  });

  it('keeps the earliest time when an item appears twice', () => {
    const posts: ItemMap = new Map();
    collectItems(story('10', 500, 'later'), posts, null);
    collectItems(story('10', 100, 'earlier'), posts, null);
    expect(posts.get('10')).toEqual({ t: 100, text: 'later' });
  });
});

describe('messageSnippet', () => {
  it('decodes escapes and collapses whitespace', () => {
    expect(messageSnippet(story('1', 1, 'سيارة  للبيع\n"مستعملة"'))).toBe('سيارة للبيع "مستعملة"');
  });

  it('is empty without a message', () => {
    expect(messageSnippet('{"post_id":"1"}')).toBe('');
  });
});

describe('feedProfileId', () => {
  it('reads the id from a captured request body', () => {
    const body = new URLSearchParams({ doc_id: '1', variables: JSON.stringify({ id: '100012345678901' }) });
    expect(feedProfileId(body.toString())).toBe('100012345678901');
  });

  it('is empty for an unreadable body', () => {
    expect(feedProfileId('variables=%7Bbroken')).toBe('');
  });
});

describe('toRows', () => {
  it('sorts oldest first and builds links', () => {
    const items: ItemMap = new Map([
      ['2', { t: 200, text: 'b' }],
      ['1', { t: 100, text: 'a' }],
    ]);
    expect(toRows(items, 'posts', 'PAGE').map((r) => r.url)).toEqual([
      'https://www.facebook.com/PAGE/posts/1',
      'https://www.facebook.com/PAGE/posts/2',
    ]);
    expect(toRows(items, 'reels', 'PAGE')[0]?.url).toBe('https://www.facebook.com/reel/1');
  });
});
