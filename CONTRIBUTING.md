# Contributing to Thinktype

Thanks for taking a look. This is a small, privacy-first instrument; the most valuable contributions
are careful measurement work, UI polish, and resilience against ChatGPT changes.

## Setup

```bash
npm install
npm run dev
```

`npm run dev` starts WXT and launches Chrome with the extension loaded. For a production build, run
`npm run build`, then load `.output/chrome-mv3` as an unpacked extension.

`npm run demo` serves the real HUD and share-receipt components with sample data at
`http://localhost:4173` — useful for visual work without reloading the extension.

## Where things live

- `shared/metrics.ts` — all WPM, consistency, pause and aggregation math. Pure functions.
- `content/typing-session.ts` — the DOM-free measurement state machine.
- `content/tracker.ts` — translates real DOM events into that state machine.
- `content/composer.ts` — finds the composer and reads its text.
- `content/overlay.ts` + `overlay.css` — the HUD (shadow DOM, no framework).
- `content/font-faces.ts` — data-URI fonts for the page context (ChatGPT's CSP blocks extension
  font URLs).
- `shared/share-card.ts` — the 1200×630 canvas receipt.
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
- [ ] Pause for 5 seconds. The status switches to THINKING; live WPM returns to 0.
- [ ] Send the message. The receipt prints with think/flow/words/signal.
- [ ] Press **Copy receipt**. Clipboard image or download fallback works.
- [ ] Open the popup. Today, chart and recent sessions update; detail renders a receipt.
- [ ] Toggle the HUD with `Alt+Shift+T`; reload and confirm the setting persists.
- [ ] Switch auto/dark/paper in options; HUD and popup follow.
- [ ] Paste a whole message and send. It is flagged low-signal and excluded from averages.
- [ ] Try a narrow window (≈1024px) and drag the HUD; it stays on screen.
- [ ] `npm run typecheck && npm test && npm run build` passes.

## Pull requests

Keep PRs focused. Include the user-visible effect, the measurement impact, and how you tested it. If
a selector changed because ChatGPT shipped a new composer, include the DOM shape in the description.

## Privacy reports

If you find a path where prompt text leaves the browser, or is stored while the setting is off, treat
it as a bug and open an issue immediately. There is no telemetry to disable; there should never be a
place for it to go.
