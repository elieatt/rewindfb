import { describe, expect, it } from 'vitest';
import { FB_START } from '../src/content/constants';
import { csvFileName, linksText, toCsv } from '../src/content/export';

const JAN_17_2023 = Date.UTC(2023, 0, 17, 14, 43) / 1000;

describe('export', () => {
  const rows = [{ id: '1', t: JAN_17_2023, text: 'Say "hi", ok', url: 'https://www.facebook.com/reel/1' }];

  it('lists links', () => {
    expect(linksText(rows)).toBe('1. Jan 17, 2023, 2:43 PM  https://www.facebook.com/reel/1');
  });

  it('writes CSV with quoted cells', () => {
    expect(toCsv(rows).split('\r\n')).toEqual([
      '"#","date","time","utc","text","url"',
      '"1","Jan 17, 2023","2:43 PM","2023-01-17T14:43:00.000Z","Say ""hi"", ok","https://www.facebook.com/reel/1"',
    ]);
  });

  it('names the CSV file', () => {
    expect(csvFileName('Demo: Cars/Trucks', 15, 'reels', FB_START)).toBe(
      'Demo CarsTrucks - first 15 reels.csv',
    );
    expect(csvFileName('', 5, 'posts', Date.UTC(2025, 5, 1) / 1000)).toBe(
      'page - first 5 posts from 2025-06-01.csv',
    );
  });
});
