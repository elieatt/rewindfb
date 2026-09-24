// Turning results into text for the clipboard or a CSV file. Pure functions.

import { FB_START } from './constants';
import { formatDate, formatTime } from './format';
import type { Kind, Row } from './types';
import { toDateInputValue } from './validation';

/** "1. Jan 17, 2023, 2:43 PM  https://…", one row per line. */
export const linksText = (rows: readonly Row[]): string =>
  rows.map((row, i) => `${i + 1}. ${formatDate(row.t)}, ${formatTime(row.t)}  ${row.url}`).join('\n');

const csvCell = (value: string | number): string => `"${String(value).replace(/"/g, '""')}"`;

export function toCsv(rows: readonly Row[]): string {
  const header = ['#', 'date', 'time', 'utc', 'text', 'url'];
  const lines = rows.map((row, i) =>
    [i + 1, formatDate(row.t), formatTime(row.t), new Date(row.t * 1000).toISOString(), row.text, row.url]
      .map(csvCell)
      .join(','),
  );
  return [header.map(csvCell).join(','), ...lines].join('\r\n');
}

/** "Demo Cars - first 15 reels from 2025-06-01.csv" */
export function csvFileName(pageName: string, count: number, kind: Kind, from: number): string {
  const name = pageName.replace(/[\\/:*?"<>|]+/g, '').trim() || 'page';
  const since = from > FB_START ? ` from ${toDateInputValue(new Date(from * 1000))}` : '';
  return `${name} - first ${count} ${kind}${since}.csv`;
}
