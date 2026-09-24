import { FB_START, MAX_COUNT } from './constants';
import { formatDate } from './format';

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const pad = (n: number): string => String(n).padStart(2, '0');

/** "2024-03-05" in local time: the value format of <input type="date">. */
export const toDateInputValue = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Earliest date that can be picked: the day Facebook launched. */
export const MIN_START_DATE = toDateInputValue(new Date(FB_START * 1000));

/** What the count field accepts while typing: digits only, at most 3. */
export const digitsOnly = (input: string): string => input.replace(/\D+/g, '').slice(0, 3);

/** How many posts or reels to list. */
export function parseCount(input: string): Parsed<number> {
  const text = input.trim();
  if (!text) return { ok: false, error: `Enter how many to find (1–${MAX_COUNT}).` };
  const count = Number.parseInt(text, 10);
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    return { ok: false, error: `Enter a number from 1 to ${MAX_COUNT}.` };
  }
  return { ok: true, value: count };
}

/** A start date from a date input, as Unix seconds at local midnight. */
export function parseStartDate(input: string, now: number = Date.now()): Parsed<number> {
  if (!input) return { ok: false, error: 'Pick a start date.' };
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) return { ok: false, error: 'Pick a valid date.' };
  const [, year = '', month = '', day = ''] = match;
  const start = new Date(Number(year), Number(month) - 1, Number(day)).getTime();
  if (Number.isNaN(start)) return { ok: false, error: 'Pick a valid date.' };
  if (start > now) return { ok: false, error: 'Pick a date that isn’t in the future.' };
  if (input < MIN_START_DATE) {
    return { ok: false, error: `Pick a date from ${formatDate(FB_START)} on, when Facebook started.` };
  }
  return { ok: true, value: start / 1000 };
}
