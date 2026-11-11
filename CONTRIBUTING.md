# Contributing to Fastfingaz

Thanks for taking a look. This is a small, privacy-first instrument; the most valuable contributions
are careful measurement work, UI polish, and resilience against ChatGPT changes.

## Setup

```bash
npm install
npm run dev
```

`npm run dev` starts WXT and launches Chrome with the extension loaded. For a production build, run
`npm run build`, then `npm run unpacked` to copy it into the visible `unpacked/` folder and load that
in `chrome://extensions`.

`npm run demo` serves the real HUD and share-receipt components with sample data at
`http://localhost:4173` — useful for visual work without reloading the extension. Useful pages:
`gallery.html` (the HUD over a mock conversation), `cards.html` (the three share formats) and
`artboards.html` (marketing art). Query parameters are documented in `AGENTS.md`.

## Where things live

- `shared/metrics.ts` — all WPM, consistency, pause and aggregation math. Pure functions.
- `content/typing-session.ts` — the DOM-free measurement state machine.
- `content/tracker.ts` — translates real DOM events into that state machine.
- `content/composer.ts` — finds the composer and reads its text.
- `content/overlay.ts` + `overlay.css` — the HUD (shadow DOM, no framework).
- `content/font-faces.ts` — data-URI fonts for the page context (ChatGPT's CSP blocks extension
  font URLs).
- `shared/share-card.ts` — the three canvas receipts (1200×630, 1080×1080, 1080×1920) and the
  shared drawing helpers.
- `shared/brand.ts` — palette, type, serials.
- `entrypoints/popup/`, `entrypoints/options/` — vanilla TS, one entrypoint each.
- `entrypoints/content.ts`, `entrypoints/background.ts` — WXT entrypoints.
- `wxt.config.ts` — manifest and permissions.

## Rules of the house

1. **No network code.** The extension must keep working with the network disabled. Do not add a
   `fetch`, a remote font, an analytics SDK, or a permission that is not strictly local.
2. **Text is opt-in.** Never store prompt text unless `settings.storeText` is true. Never log it.
3. **Never intercept typing.** Listeners are passive. Do not `preventDefault`, rewrite, or replay
   keystrokes.
4. **Measurement changes need tests.** If you touch `metrics.ts` or `typing-session.ts`, add a case
   that would have failed before.
5. **No new permissions without an issue first.** `storage` and `clipboardWrite` should be enough.
6. **Stay inside the visual world.** Read `DESIGN.md` before UI work. No gradients, glass,
   glows, or a second accent colour.

## Style

- TypeScript strict mode, `verbatimModuleSyntax`.
- Small modules and explicit names. Comments explain *why*, not *what*.
- UI stays dependency-free: system fonts, no component framework, no CSS reset library.
- Self-hosted Geist only. Any new face needs a written reason and an OFL-compatible licence.
- Prettier: `npm run format`.

## Manual test checklist

Before opening a PR that touches the content script or UI:

- [ ] `npm run dev` loads the extension in Chrome.
- [ ] Open a new ChatGPT chat and type 30+ characters. The HUD shows live WPM, timer and words.
- [ ] Pause for 5 seconds. The status switches to THINKING and the live number **holds**; it does not
  snap to zero.
- [ ] Send the message. The receipt prints with think/flow/peak/words/signal and a NEW BEST stamp only
  when it actually beats the stored best.
- [ ] Open **Share card**. The three formats render, the file size appears, and copy/download work.
- [ ] Open the popup. Today, baseline, chart and recent sessions update; detail renders all three
  formats.
- [ ] Toggle the HUD with `Alt+Shift+T`; reload and confirm the setting persists.
- [ ] Reload the tab mid-run. The HUD shows PAUSED / NOT RECORDED, never a fake live run.
- [ ] Paste a whole message and send. It is rejected or flagged low-signal and excluded from averages.
- [ ] Try 1280, 1440, 1728 and 2048 widths. The HUD stays in the side gutter, never covers the composer
  or the last message, and remains readable at full / medium / slim widths.
- [ ] `npm run typecheck && npm test && npm run build` passes.
- [ ] `npm run site:build` passes and `PORT=4319 npm run site:serve` loads the home, privacy, metrics,
  changelog and 404 pages.

## Pull requests

Keep PRs focused. Include the user-visible effect, the measurement impact, and how you tested it. If
a selector changed because ChatGPT shipped a new composer, include the DOM shape in the description.

## Privacy reports

If you find a path where prompt text leaves the browser, or is stored while the setting is off, treat
it as a bug and open an issue immediately. There is no telemetry to disable; there should never be a
place for it to go.
