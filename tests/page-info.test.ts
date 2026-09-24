import { describe, expect, it } from 'vitest';
import { pageKind, type PageKind } from '../src/content/page-info';

const cases: [string, PageKind][] = [
  ['https://www.facebook.com/', 'none'],
  ['https://www.facebook.com/?sk=h_chr', 'none'],
  ['https://www.facebook.com/watch/?v=1', 'none'],
  ['https://www.facebook.com/groups/123/', 'none'],
  ['https://www.facebook.com/search/top?q=cars', 'none'],
  ['https://www.facebook.com/marketplace/', 'none'],
  ['https://www.facebook.com/reel/123456', 'none'],
  ['https://www.facebook.com/permalink.php?story_fbid=1&id=2', 'none'],
  ['https://www.facebook.com/photo/?fbid=1', 'none'],
  ['https://www.facebook.com/profile.php', 'none'],
  ['https://www.facebook.com/profile.php?id=100012345678901', 'main'],
  ['https://www.facebook.com/profile.php?id=100012345678901&sk=reels_tab', 'reels'],
  ['https://www.facebook.com/profile.php?id=100012345678901&sk=photos', 'tab'],
  ['https://www.facebook.com/cocacola', 'main'],
  ['https://www.facebook.com/cocacola/', 'main'],
  ['https://www.facebook.com/CocaCola/posts/', 'main'],
  ['https://www.facebook.com/cocacola/reels/', 'reels'],
  ['https://www.facebook.com/cocacola/about', 'tab'],
  ['https://www.facebook.com/cocacola/posts/12345', 'tab'],
  ['https://www.facebook.com/people/Some-Name/100012345/', 'main'],
  ['https://www.facebook.com/people/Some-Name/100012345/?sk=reels_tab', 'reels'],
];

describe('pageKind', () => {
  it.each(cases)('%s is %s', (url, kind) => {
    expect(pageKind(url)).toBe(kind);
  });
});
