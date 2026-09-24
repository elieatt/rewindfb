// Panel styles, scoped to the panel's shadow root. Colors follow Facebook's light or dark theme
// through the host's data-theme attribute.

export const PANEL_CSS = `
:host { all: initial; }
:host {
  --bg: #ffffff; --fg: #1c1e21; --muted: #65676b; --faint: #8a8d91;
  --line: #e4e6eb; --soft: #f0f2f5; --hover: #f2f3f5;
  --accent: #1877f2; --accent-fg: #ffffff; --accent-soft: #e7f0fd;
  --ok: #31a24c; --warn-bg: #fff4e0; --warn-fg: #8a5300;
  --err-bg: #fde8e8; --err-fg: #b42318; --shadow: 0 12px 32px rgba(0,0,0,.18), 0 2px 6px rgba(0,0,0,.08);
}
:host([data-theme="dark"]) {
  --bg: #242526; --fg: #e4e6eb; --muted: #b0b3b8; --faint: #8a8d91;
  --line: #3a3b3c; --soft: #3a3b3c; --hover: #313233;
  --accent: #2d88ff; --accent-fg: #ffffff; --accent-soft: #263951;
  --ok: #45bd62; --warn-bg: #3d2e12; --warn-fg: #f0c674;
  --err-bg: #4a1f1f; --err-fg: #ffb4ab; --shadow: 0 12px 32px rgba(0,0,0,.5);
}
* { box-sizing: border-box; }
.panel { position: fixed; top: 64px; right: 16px; z-index: 2147483647;
  width: 380px; max-width: calc(100vw - 32px); max-height: calc(100vh - 80px);
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--bg); color: var(--fg); border: 1px solid var(--line); border-radius: 12px;
  box-shadow: var(--shadow); font: 13px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
button { font: inherit; color: inherit; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

header { display: flex; align-items: center; gap: 10px; padding: 12px 12px 10px 16px; }
header .titles { flex: 1; min-width: 0; }
header h1 { margin: 0; font-size: 15px; font-weight: 700; }
header .page { color: var(--muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.icon-btn { width: 30px; height: 30px; border-radius: 50%; border: 0; background: var(--soft);
  display: grid; place-items: center; cursor: pointer; font-size: 16px; line-height: 1; }
.icon-btn:hover { filter: brightness(.95); }

.controls { padding: 0 16px 14px; display: grid; gap: 10px; border-bottom: 1px solid var(--line); }
.seg { display: grid; grid-template-columns: 1fr 1fr; background: var(--soft); border-radius: 8px; padding: 3px; }
.seg button { border: 0; background: transparent; padding: 6px 0; border-radius: 6px; cursor: pointer; font-weight: 600; color: var(--muted); }
.seg button[aria-pressed="true"] { background: var(--bg); color: var(--fg); box-shadow: 0 1px 2px rgba(0,0,0,.15); }
.run { display: flex; gap: 8px; align-items: stretch; }
.num { display: flex; align-items: center; gap: 6px; background: var(--soft); border-radius: 8px; padding: 0 4px 0 10px; color: var(--muted); }
.num.invalid, .date.invalid { box-shadow: inset 0 0 0 2px var(--err-fg); }
.start { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: center; }
.start .lbl { color: var(--muted); font-size: 12px; font-weight: 600; }
.seg.small button { padding: 4px 0; font-size: 12px; }
.date { width: 100%; border: 0; border-radius: 8px; background: var(--soft); color: var(--fg);
  font: inherit; font-weight: 600; padding: 7px 10px; color-scheme: light; }
:host([data-theme="dark"]) .date { color-scheme: dark; }
.field-msg { margin-top: 6px; font-size: 12px; color: var(--muted); }
.field-msg.err { color: var(--err-fg); }
.num input { width: 40px; border: 0; background: transparent; color: var(--fg); font: inherit; font-weight: 600; padding: 7px 4px; }
.primary { flex: 1; border: 0; border-radius: 8px; background: var(--accent); color: var(--accent-fg);
  font-weight: 600; padding: 8px 12px; cursor: pointer; }
.primary:hover { filter: brightness(1.05); }
.secondary { border: 0; border-radius: 8px; background: var(--soft); font-weight: 600; padding: 7px 12px; cursor: pointer; }
.secondary:hover { filter: brightness(.96); }
button:disabled { opacity: .5; cursor: default; filter: none; }

.body { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 14px 16px; }
.body > * + * { margin-top: 12px; }
.empty { color: var(--muted); display: grid; gap: 4px; }
.empty b { color: var(--fg); }
.note { border-radius: 8px; padding: 10px 12px; display: grid; gap: 8px; }
.note.warn { background: var(--warn-bg); color: var(--warn-fg); }
.note.err { background: var(--err-bg); color: var(--err-fg); }
.note.info { background: var(--accent-soft); }
.note .row { display: flex; gap: 8px; align-items: center; justify-content: space-between; }

.steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.step { display: grid; grid-template-columns: 20px 1fr; gap: 10px; }
.dot { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--line); display: grid; place-items: center;
  font-size: 11px; font-weight: 700; color: var(--accent-fg); }
.step[data-status="active"] .dot { border-color: var(--accent); animation: pulse 1.4s ease-in-out infinite; }
.step[data-status="done"] .dot { background: var(--ok); border-color: var(--ok); }
.step[data-status="pending"] { color: var(--faint); }
.step .t { font-weight: 600; }
.step .d { color: var(--muted); font-size: 12px; }
.bar { height: 4px; background: var(--soft); border-radius: 2px; overflow: hidden; margin-top: 6px; }
.bar i { display: block; height: 100%; background: var(--accent); transition: width .3s; }
.running { display: grid; gap: 14px; }
.runfoot { display: flex; justify-content: space-between; align-items: center; color: var(--muted); font-size: 12px; }
@keyframes pulse { 50% { box-shadow: 0 0 0 4px var(--accent-soft); } }
@media (prefers-reduced-motion: reduce) { .step .dot { animation: none !important; } .bar i { transition: none; } }

.summary { background: var(--soft); border-radius: 10px; padding: 12px 14px; }
.eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.big { font-size: 20px; font-weight: 700; margin-top: 2px; }
.sub { color: var(--muted); }
.meta { color: var(--faint); font-size: 12px; margin-top: 6px; }

.list { list-style: none; margin: 0; padding: 0; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.list li + li { border-top: 1px solid var(--line); }
.item { display: grid; grid-template-columns: 28px 1fr 16px; gap: 8px; padding: 9px 12px; color: inherit; text-decoration: none; align-items: start; }
.item:hover { background: var(--hover); }
.idx { width: 24px; height: 24px; border-radius: 50%; background: var(--soft); display: grid; place-items: center;
  font-size: 11px; font-weight: 700; color: var(--muted); }
.list li:first-child .idx { background: var(--accent); color: var(--accent-fg); }
.when b { font-weight: 600; }
.when span { color: var(--muted); }
.text { color: var(--muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; unicode-bidi: plaintext; text-align: left; }
.text.none { color: var(--faint); font-style: italic; }
.open { color: var(--faint); padding-top: 3px; }
.item:hover .open { color: var(--accent); }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.more { display: grid; gap: 6px; }
.more-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.more .bar { margin-top: 0; }
.more.end { color: var(--muted); font-size: 12px; text-align: center; padding: 4px 0; }
.next { width: 100%; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-weight: 600;
  border: 1px solid var(--accent); background: var(--accent-soft); color: var(--accent); }
.next:hover { filter: brightness(1.05); }
.hint { color: var(--faint); font-size: 12px; text-align: center; }

details { border-top: 1px solid var(--line); padding-top: 10px; }
summary { cursor: pointer; color: var(--muted); font-size: 12px; font-weight: 600; }
.log { margin: 8px 0 0; padding: 0; list-style: none; font: 11.5px/1.5 ui-monospace, Consolas, monospace; color: var(--muted); max-height: 140px; overflow: auto; }
.log time { color: var(--faint); margin-right: 8px; }

footer { padding: 8px 16px; border-top: 1px solid var(--line); color: var(--faint); font-size: 11.5px; }
`;
