import { describe, expect, it } from 'vitest';
import { MAX_COUNT } from '../src/content/constants';
import { MIN_START_DATE, digitsOnly, parseCount, parseStartDate } from '../src/content/validation';

describe('digitsOnly', () => {
  it('drops everything but digits and keeps at most 3', () => {
    expect(digitsOnly('ab0-x')).toBe('0');
    expect(digitsOnly('1.5e3')).toBe('153');
    expect(digitsOnly('12345')).toBe('123');
  });
});

describe('parseCount', () => {
  it('accepts 1 to MAX_COUNT', () => {
    expect(parseCount('1')).toEqual({ ok: true, value: 1 });
    expect(parseCount(` ${MAX_COUNT} `)).toEqual({ ok: true, value: MAX_COUNT });
  });

  it('asks for a value when empty', () => {
    expect(parseCount('')).toEqual({ ok: false, error: `Enter how many to find (1–${MAX_COUNT}).` });
  });

  it('rejects values out of range', () => {
    for (const input of ['0', String(MAX_COUNT + 1), '750']) {
      expect(parseCount(input)).toEqual({ ok: false, error: `Enter a number from 1 to ${MAX_COUNT}.` });
    }
  });
});

describe('parseStartDate', () => {
  const now = Date.UTC(2026, 8, 23, 12);

  it('returns local midnight in Unix seconds', () => {
    expect(parseStartDate('2024-03-05', now)).toEqual({ ok: true, value: Date.UTC(2024, 2, 5) / 1000 });
  });

  it('accepts the first possible day and today', () => {
    expect(parseStartDate(MIN_START_DATE, now).ok).toBe(true);
    expect(parseStartDate('2026-09-23', now).ok).toBe(true);
  });

  it('rejects empty, malformed, future and pre-Facebook dates', () => {
    expect(parseStartDate('', now)).toEqual({ ok: false, error: 'Pick a start date.' });
    expect(parseStartDate('05/03/2024', now)).toEqual({ ok: false, error: 'Pick a valid date.' });
    expect(parseStartDate('2030-01-01', now)).toEqual({
      ok: false,
      error: 'Pick a date that isn’t in the future.',
    });
    expect(parseStartDate('2003-05-01', now)).toEqual({
      ok: false,
      error: 'Pick a date from Feb 4, 2004 on, when Facebook started.',
    });
  });
});
