// What kind of Facebook page the tab shows, and its name. Pure functions of their inputs.

/**
 * - `main`: a profile's main (Posts) tab, where the feed request can be captured
 * - `reels`: a profile's Reels tab
 * - `tab`: another profile tab (Photos, About…) or a single post on a profile
 * - `none`: not a profile (home feed, groups, Watch, search…)
 */
export type PageKind = 'main' | 'reels' | 'tab' | 'none';

/** First path segments that are Facebook features, not profiles. */
const NOT_PROFILES = new Set([
  'ads', 'bookmarks', 'business', 'checkpoint', 'dialog', 'events', 'feeds', 'friends', 'fundraisers',
  'games', 'gaming', 'groups', 'hashtag', 'help', 'home.php', 'jobs', 'l.php', 'latest', 'live', 'login',
  'marketplace', 'media', 'memories', 'messages', 'news', 'notifications', 'offers', 'pages', 'permalink.php',
  'photo', 'photo.php', 'photos', 'plugins', 'policies', 'privacy', 'reel', 'reels', 'saved', 'search',
  'settings', 'share', 'sharer.php', 'stories', 'story.php', 'video', 'videos', 'watch', 'weather',
]); // prettier-ignore

const MAIN_TABS = new Set(['', 'posts', 'timeline']);

export function pageKind(href: string): PageKind {
  const url = new URL(href);
  const segments = url.pathname
    .split('/')
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  const first = segments[0] ?? '';
  const sk = url.searchParams.get('sk');
  let tab: string;
  let extra: boolean;

  if (first === 'profile.php') {
    // /profile.php?id=123[&sk=tab]
    if (!url.searchParams.get('id')) return 'none';
    tab = sk ?? '';
    extra = segments.length > 1;
  } else if (first === 'people' && segments.length >= 3) {
    // /people/Name/123/[tab]
    tab = sk ?? segments[3] ?? '';
    extra = segments.length > 4;
  } else if (first && !NOT_PROFILES.has(first) && !first.endsWith('.php')) {
    // /username/[tab]; /username/posts/123 is a single post
    tab = sk ?? segments[1] ?? '';
    extra = segments.length > 2;
  } else {
    return 'none';
  }

  if (tab === 'reels_tab' || tab === 'reels') return 'reels';
  return MAIN_TABS.has(tab) && !extra ? 'main' : 'tab';
}

const stripBidiMarks = (text: string | null | undefined): string =>
  (text ?? '').replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim();

/**
 * The page's name. The tab title is often just "(3) Facebook", so this prefers the profile
 * picture's accessible label (the first labelled svg in the main column), which is the name
 * in any interface language.
 */
export function pageName(doc: Document): string {
  const avatar = stripBidiMarks(
    doc.querySelector('[role="main"] svg[aria-label]')?.getAttribute('aria-label'),
  );
  if (avatar) return avatar;
  const title = stripBidiMarks(doc.title)
    .replace(/^\(\d+\)\s*/, '')
    .replace(/\s*\|\s*Facebook\s*$/i, '')
    .trim();
  return title && title.toLowerCase() !== 'facebook' ? title : '';
}
