import { describe, expect, it } from 'vitest';
import { formatDate, formatTime, plural, timeAgo, utcOffsetLabel } from '../src/content/format';

const JAN_17_2023 = Date.UTC(2023, 0, 17, 14, 43) / 1000;

describe('format', () => {
  it('formats dates and times', () => {
    expect(formatDate(JAN_17_2023)).toBe('Jan 17, 2023');
    expect(formatTime(JAN_17_2023)).toBe('2:43 PM');
  });

  it('pluralizes', () => {
    expect(plural(1, 'post')).toBe('1 post');
    expect(plural(3, 'post')).toBe('3 posts');
  });

  it('describes how long ago', () => {
    const now = new Date(Date.UTC(2026, 8, 23));
    expect(timeAgo(JAN_17_2023, now)).toBe('3 years, 8 months ago');
    expect(timeAgo(Date.UTC(2025, 8, 23) / 1000, now)).toBe('1 year ago');
    expect(timeAgo(Date.UTC(2026, 8, 11) / 1000, now)).toBe('12 days ago');
    expect(timeAgo(Date.UTC(2026, 8, 22, 20) / 1000, now)).toBe('today');
  });

  it('labels UTC offsets', () => {
    expect(utcOffsetLabel(180)).toBe('UTC+3');
    expect(utcOffsetLabel(0)).toBe('UTC+0');
    expect(utcOffsetLabel(-330)).toBe('UTC−5:30');
  });
});
