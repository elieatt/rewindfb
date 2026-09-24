// Display formatting. The panel is in English, so dates use one fixed locale;
// times are in the viewer's time zone.

const LOCALE = 'en-US';

/** "Jan 17, 2023" from Unix seconds. */
export const formatDate = (t: number): string =>
  new Date(t * 1000).toLocaleDateString(LOCALE, { month: 'short', day: 'numeric', year: 'numeric' });

/** "2:43 PM" from Unix seconds. */
export const formatTime = (t: number): string =>
  new Date(t * 1000).toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });

/** "02:43:07 PM" from epoch milliseconds, for the activity log. */
export const formatClock = (ms: number): string =>
  new Date(ms).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "3 years, 8 months ago", "12 days ago" or "today". */
export function timeAgo(t: number, now: Date = new Date()): string {
  const then = new Date(t * 1000);
  let months = (now.getFullYear() - then.getFullYear()) * 12 + now.getMonth() - then.getMonth();
  if (now.getDate() < then.getDate()) months--;
  if (months < 1) {
    const days = Math.floor((now.getTime() / 1000 - t) / 86_400);
    return days < 1 ? 'today' : `${plural(days, 'day')} ago`;
  }
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years) parts.push(plural(years, 'year'));
  if (rest) parts.push(plural(rest, 'month'));
  return `${parts.join(', ')} ago`;
}

/** "UTC+3" or "UTC−5:30" for an offset in minutes east of UTC (default: this browser's). */
export function utcOffsetLabel(offsetMinutes: number = -new Date().getTimezoneOffset()): string {
  const abs = Math.abs(offsetMinutes);
  const minutes = abs % 60 ? `:${String(abs % 60).padStart(2, '0')}` : '';
  return `UTC${offsetMinutes < 0 ? '−' : '+'}${Math.floor(abs / 60)}${minutes}`;
}
