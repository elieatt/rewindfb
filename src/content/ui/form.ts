// The controls at the top of the panel: Posts/Reels, start point, count and Find.
//
// Field errors appear once a field is left or Find is pressed, never while typing,
// and clear as soon as the value is fixed. Find is disabled only while a message says why.

import { FB_START, LARGE_REEL_COUNT } from '../constants';
import { activeJob, currentPageKind, startSearch } from '../controller';
import { formatDate } from '../format';
import type { Job } from '../job';
import { notify, prefs, updatePrefs } from '../state';
import type { Kind, StartMode } from '../types';
import {
  MIN_START_DATE,
  digitsOnly,
  parseCount,
  parseStartDate,
  toDateInputValue,
  type Parsed,
} from '../validation';
import { h } from './dom';

export interface Form {
  element: HTMLElement;
  /** Syncs the controls with the current state. */
  update(): void;
  /** Validates and starts a search, like pressing Find. */
  submit(): void;
  focus(): void;
}

export function createForm(): Form {
  let countError: string | null = null;
  let dateError: string | null = null;

  const segment = (label: string, onClick: () => void): HTMLButtonElement =>
    h('button', { type: 'button', on: { click: onClick } }, label);
  const posts = segment('Posts', () => {
    setKind('posts');
  });
  const reels = segment('Reels', () => {
    setKind('reels');
  });
  const fromFirst = segment('First post', () => {
    setStart('first');
  });
  const fromDate = segment('A date', () => {
    setStart('date');
  });

  const submitOnEnter = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') submit();
  };

  const date = h('input', {
    type: 'date',
    class: 'date',
    min: MIN_START_DATE,
    value: prefs.date,
    'aria-label': 'Start date',
    'aria-describedby': 'rewind-date-msg',
    on: { input: onDateInput, change: onDateInput, blur: onDateBlur, keydown: submitOnEnter },
  });
  const dateMessage = h('div', { class: 'field-msg err', id: 'rewind-date-msg', 'aria-live': 'polite' });
  const dateRow = h('div', {}, date, dateMessage);

  const count = h('input', {
    type: 'text',
    inputmode: 'numeric',
    autocomplete: 'off',
    maxlength: 3,
    value: prefs.count,
    'aria-label': 'How many',
    'aria-describedby': 'rewind-count-msg',
    on: { input: onCountInput, blur: onCountBlur, keydown: submitOnEnter },
  });
  const countBox = h('label', { class: 'num' }, 'First', count);
  const countMessage = h('div', { class: 'field-msg', id: 'rewind-count-msg', 'aria-live': 'polite' });
  const find = h('button', { type: 'button', class: 'primary', on: { click: submit } });

  const element = h(
    'div',
    { class: 'controls' },
    h('div', { class: 'seg', role: 'group', 'aria-label': 'What to find' }, posts, reels),
    h(
      'div',
      { class: 'start' },
      h('span', { class: 'lbl' }, 'Start from'),
      h('div', { class: 'seg small', role: 'group', 'aria-label': 'Start from' }, fromFirst, fromDate),
    ),
    dateRow,
    h('div', {}, h('div', { class: 'run' }, countBox, find), countMessage),
  );

  function parseStart(): Parsed<number> {
    return prefs.start === 'first' ? { ok: true, value: FB_START } : parseStartDate(date.value);
  }

  function validateCount(): Parsed<number> {
    const result = parseCount(count.value);
    countError = result.ok ? null : result.error;
    if (result.ok) updatePrefs({ count: result.value });
    return result;
  }

  function validateDate(): Parsed<number> {
    const result = parseStart();
    dateError = result.ok ? null : result.error;
    return result;
  }

  function onCountInput(): void {
    const clean = digitsOnly(count.value);
    if (clean !== count.value) count.value = clean;
    const result = parseCount(clean);
    if (result.ok) updatePrefs({ count: result.value });
    if (countError) validateCount();
    update();
  }

  function onCountBlur(): void {
    validateCount();
    update();
  }

  function onDateInput(): void {
    updatePrefs({ date: date.value });
    if (dateError) validateDate();
    update();
  }

  function onDateBlur(): void {
    validateDate();
    update();
  }

  function setKind(kind: Kind): void {
    updatePrefs({ kind });
    notify();
  }

  function setStart(start: StartMode): void {
    updatePrefs({ start });
    dateError = null;
    notify();
    if (start === 'date') date.focus();
  }

  function submit(): void {
    if (activeJob() || currentPageKind() !== 'main') {
      update();
      return;
    }
    const start = validateDate();
    const n = validateCount();
    update();
    if (!start.ok) {
      date.focus();
      return;
    }
    if (!n.ok) {
      count.focus();
      return;
    }
    void startSearch({ kind: prefs.kind, count: n.value, from: start.value });
  }

  function update(): void {
    const job = activeJob();
    const busy = job !== null;
    for (const control of [posts, reels, fromFirst, fromDate, date, count]) control.disabled = busy;
    posts.setAttribute('aria-pressed', String(prefs.kind === 'posts'));
    reels.setAttribute('aria-pressed', String(prefs.kind === 'reels'));
    fromFirst.setAttribute('aria-pressed', String(prefs.start === 'first'));
    fromDate.setAttribute('aria-pressed', String(prefs.start === 'date'));

    dateRow.hidden = prefs.start !== 'date';
    date.max = toDateInputValue(new Date());
    showError(date, dateMessage, dateError);

    const n = parseCount(count.value);
    countBox.classList.toggle('invalid', countError !== null);
    count.setAttribute('aria-invalid', String(countError !== null));
    const largeReelSearch = !busy && prefs.kind === 'reels' && n.ok && n.value >= LARGE_REEL_COUNT;
    countMessage.textContent =
      countError ?? (largeReelSearch ? 'Large reel searches can take several minutes.' : '');
    countMessage.classList.toggle('err', countError !== null);
    countMessage.hidden = !countMessage.textContent;

    find.disabled = busy || countError !== null || dateError !== null || currentPageKind() !== 'main';
    find.textContent = findLabel(job, n, parseStart());
  }

  const focus = (): void => {
    find.focus();
  };
  return { element, update, submit, focus };
}

function showError(input: HTMLInputElement, message: HTMLElement, error: string | null): void {
  input.classList.toggle('invalid', error !== null);
  input.setAttribute('aria-invalid', String(error !== null));
  message.textContent = error ?? '';
  message.hidden = error === null;
}

function findLabel(job: Job | null, count: Parsed<number>, start: Parsed<number>): string {
  if (job) return job.more ? 'Loading more…' : 'Searching…';
  if (!count.ok) return `Find ${prefs.kind}`;
  if (prefs.start === 'first') return `Find first ${count.value} ${prefs.kind}`;
  return start.ok
    ? `Find ${count.value} ${prefs.kind} from ${formatDate(start.value)}`
    : `Find ${count.value} ${prefs.kind}`;
}
