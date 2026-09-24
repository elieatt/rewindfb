// The floating panel: shown and hidden from the toolbar icon, re-rendered on every change.

import { TOGGLE } from '../../shared/messages';
import { currentPath } from '../capture';
import { activeJob, currentPageKind } from '../controller';
import { utcOffsetLabel } from '../format';
import { pageName } from '../page-info';
import { getView, subscribe, type PageView } from '../state';
import { bodyBlocks, updateMoreProgress } from './blocks';
import { h } from './dom';
import { createForm, type Form } from './form';
import { PANEL_CSS } from './styles';

interface Panel {
  host: HTMLElement;
  form: Form;
  pageLabel: HTMLElement;
  body: HTMLElement;
  footer: HTMLElement;
}

let panel: Panel | null = null;
let lastPath = '';
let lastDark = false;

export function setUpPanel(): void {
  window.addEventListener(TOGGLE, toggle);
  subscribe(scheduleRender);
  // Facebook changes pages without reloading, switches themes, and draws the page name late.
  setInterval(tick, 500);
}

const isOpen = (): boolean => panel !== null && panel.host.style.display !== 'none';

function toggle(): void {
  if (!panel) panel = buildPanel();
  else panel.host.style.display = isOpen() ? 'none' : '';
  if (isOpen()) {
    render();
    panel.form.focus();
  }
}

function buildPanel(): Panel {
  const host = h('div', { id: 'rewind-host' });
  const root = host.attachShadow({ mode: 'open' });
  const form = createForm();
  const pageLabel = h('div', { class: 'page' });
  const body = h('div', { class: 'body', 'aria-live': 'polite' });
  const footer = h('footer');
  const close = h(
    'button',
    { type: 'button', class: 'icon-btn', title: 'Close (Esc)', 'aria-label': 'Close' },
    '✕',
  );
  close.addEventListener('click', toggle);

  const dialog = h(
    'div',
    { class: 'panel', dir: 'ltr', role: 'dialog', 'aria-label': 'Rewind' },
    h('header', {}, h('div', { class: 'titles' }, h('h1', {}, 'Rewind'), pageLabel), close),
    form.element,
    body,
    footer,
  );
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') toggle();
  });

  root.append(h('style', {}, PANEL_CSS), dialog);
  document.documentElement.append(host);
  return { host, form, pageLabel, body, footer };
}

let renderQueued = false;

function scheduleRender(): void {
  if (renderQueued) return;
  renderQueued = true;
  setTimeout(() => {
    renderQueued = false;
    render();
  }, 80);
}

function tick(): void {
  if (!panel || !isOpen()) return;
  if (activeJob() || currentPath() !== lastPath || isDarkTheme() !== lastDark) {
    render();
    return;
  }
  const name = headerName(getView(currentPath()));
  if (panel.pageLabel.textContent !== name) panel.pageLabel.textContent = name;
}

function render(): void {
  if (!panel || !isOpen()) return;
  const { host, form, pageLabel, body, footer } = panel;
  lastDark = isDarkTheme();
  lastPath = currentPath();
  host.dataset.theme = lastDark ? 'dark' : 'light';

  const view = getView(lastPath);
  pageLabel.textContent = headerName(view);
  form.update();

  const blocks = bodyBlocks(view, () => {
    form.submit();
  });
  const current = [...body.children];
  if (current.length !== blocks.length || current.some((node, i) => node !== blocks[i])) {
    body.replaceChildren(...blocks);
  }
  updateMoreProgress(view);
  reveal(body, view);
  footer.textContent = `Times in your time zone (${utcOffsetLabel()}). Reels are found through the page’s feed.`;
}

/** Scrolls the body to what the last action asked to show. */
function reveal(body: HTMLElement, view: PageView): void {
  if (view.reveal === null) return;
  const bodyBox = body.getBoundingClientRect();
  if (view.reveal === 'more') {
    // Keep the loading row of "Next N" in sight.
    const more = body.querySelector('.more');
    if (more) body.scrollTop += Math.max(0, more.getBoundingClientRect().bottom - bodyBox.bottom + 8);
  } else {
    // Bring the first new result to the top.
    const item = body.querySelectorAll('.list li')[view.reveal];
    if (item) body.scrollTop += item.getBoundingClientRect().top - bodyBox.top - 8;
  }
  view.reveal = null;
}

function headerName(view: PageView): string {
  if (currentPageKind() === 'none') return 'No page open';
  const name = pageName(document) || view.name;
  if (name && view.phase !== 'running') view.name = name;
  return name || 'Loading page name…';
}

function isDarkTheme(): boolean {
  const classes = document.documentElement.classList;
  if (classes.contains('__fb-dark-mode')) return true;
  if (classes.contains('__fb-light-mode')) return false;
  return matchMedia('(prefers-color-scheme: dark)').matches;
}
