# Rewind for Facebook

A Chrome extension that lists the **first posts or reels of any Facebook page**, oldest first,
or everything **from a date you pick**, in seconds instead of hours of scrolling.

> Not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc.

## Features

- **First N posts or reels** of a page, oldest first, with dates, text and links.
- **Start from a date:** list what a page posted from any day on.
- **Next N:** keep going forward from where the list ended, until today.
- Stop at any time and keep what was found. Copy the links or download a CSV.
- Works in Facebook's light and dark themes and with any interface language.

## Install

Rewind isn't on the Chrome Web Store yet. To install it from source:

```sh
npm install
npm run build
```

Then open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and choose
the `dist` folder. Reload any Facebook tab that was already open.

## Use

1. Open a Facebook page's main profile (its Posts tab).
2. Click the Rewind icon in the toolbar to open the panel. Esc closes it.
3. Choose **Posts** or **Reels**, and whether to start from the page's **first post** or **a date**.
4. Set how many and press **Find**. Click a result to open it; **Next N** continues the list.

Results stay with each page while the tab is open. A running search keeps going if you open
another page, and its results wait on the page it started from.

## How it works

Facebook's posts feed is loaded by an internal GraphQL query, `ProfileCometTimelineFeedRefetchQuery`.
It accepts `afterTime` and `beforeTime` filters that the website never uses. Rewind captures the
page's own feed request, then replays it with different dates:

1. **Find the start.** Binary search `beforeTime` for the first post (on or after the chosen date).
   This takes about 18 requests, however long the page's history is.
2. **Read forward.** Read the feed in 2-week windows from there, oldest first, until N items are found.
3. **Reels** are found in the same feed. Rewind first checks 2-week windows, 4 at a time, for the
   earliest one that contains a reel, then reads forward from there.

Every window is read completely, so the results are complete and in order up to where reading
stopped. That is what lets **Next N** continue exactly where the list ended.

## Privacy

Rewind collects nothing: no server, no analytics, no tracking. See the [privacy policy](PRIVACY.md).

## Limits

- Reels are found through the page's feed. A reel that was only ever posted to the Reels tab is missed.
- It relies on Facebook internals (the query and its variables), which can change without notice.
- Many fast requests can make Facebook limit your account for a while. Rewind pauses between
  requests and retries slowly, but very large searches can still hit the limit.

## Development

Requires Node.js 20 or later.

| Command          | What it does                                             |
| ---------------- | -------------------------------------------------------- |
| `npm run build`  | Build the extension into `dist/`                         |
| `npm run watch`  | Rebuild on every change (then reload it in Chrome)       |
| `npm test`       | Run the unit tests                                       |
| `npm run check`  | Type-check, lint, check formatting and test, as CI would |
| `npm run format` | Format everything with Prettier                          |
| `npm run icons`  | Render `public/icons/` from `assets/*.svg`               |

### Project layout

```
assets/icon.svg           Icon artwork (icon-small.svg: simplified for 16 and 32 px)
scripts/icons.mjs         Renders the icon PNGs
public/                   Manifest and icons, copied into dist/
src/background.ts         Toolbar click
src/bridge.ts             Forwards the click into the page
src/shared/messages.ts    Message name shared by both sides
src/content/              Runs inside Facebook's page ("MAIN" world)
  index.ts                Entry point
  capture.ts              Captures Facebook's feed request
  feed/parse.ts           Reads feed responses (pure)
  feed/client.ts          Sends feed requests, with retries
  search.ts               The date searches
  job.ts                  A running search: stop, pause, progress
  controller.ts           Starts searches and "Next N", saves results
  state.ts                Per-page state, saved choices, change events
  page-info.ts            Which kind of Facebook page is open (pure)
  validation.ts           Form rules (pure)
  format.ts, export.ts    Dates, text and CSV (pure)
  ui/                     The panel
tests/                    Unit tests for the pure modules
```

The panel is built with plain DOM calls inside a shadow root. Facebook enforces Trusted Types,
so the code never uses `innerHTML`. The built files are not minified, so anyone can read exactly
what runs.

## License

Copyright (C) 2026 Elie Attieh.

This program is free software: you can redistribute it and/or modify it under the terms of the
GNU General Public License as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version. See [LICENSE](LICENSE).
