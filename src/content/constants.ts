/** Facebook's posts-feed query. Unlike the Reels tab query, it accepts afterTime/beforeTime. */
export const FEED_QUERY = 'ProfileCometTimelineFeedRefetchQuery';

/** The day Facebook launched, in Unix seconds; nothing on it can be older. */
export const FB_START = Date.UTC(2004, 1, 4) / 1000;

export const HOUR = 3600;
export const DAY = 86_400;

/** The feed is read in date windows of this size, oldest first. */
export const WINDOW = 14 * DAY;

/** Pause between sequential requests, in ms. */
export const REQUEST_DELAY = 300;

/** Windows checked in parallel while looking for the first reel. */
export const REEL_WORKERS = 4;

/** Safety limit on pages read from a single window. */
export const MAX_PAGES_PER_WINDOW = 150;

/** A failed request is retried this many times, waiting RETRY_STEP_MS longer each time. */
export const MAX_RETRIES = 3;
export const RETRY_STEP_MS = 10_000;

export const DEFAULT_COUNT = 15;
export const MAX_COUNT = 500;

/** Reel searches of at least this many show a "can take several minutes" note. */
export const LARGE_REEL_COUNT = 100;
