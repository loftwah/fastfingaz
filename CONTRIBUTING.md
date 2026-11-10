# Contributing to Thinktype

Thanks for taking a look. This is a small, privacy-first instrument; the most valuable contributions
are careful measurement work, UI polish, and resilience against ChatGPT changes.

## Setup

```bash
npm install
npm run typecheck
npm test
npm run build
```

Load `dist/` as an unpacked extension in `chrome://extensions` (Developer mode on), then open
[chatgpt.com](https://chatgpt.com).

`npm run demo` serves the real HUD and share-card components with sample data at
`http://localhost:4173` — useful for visual work without reloading the extension.

## Where things live

- `src/shared/metrics.ts` — all WPM, consistency, pause and aggregation math. Pure functions.
- `src/content/typing-session.ts` — the DOM-free measurement state machine.
- `src/content/tracker.ts` — translates real DOM events into that state machine.
- `src/content/composer.ts` — finds the composer and reads its text.
- `src/content/overlay.ts` + `.css` — the HUD (shadow DOM, no framework).
- `src/shared/share-card.ts` — the 1200×630 canvas card.
- `src/popup/`, `src/options/` — vanilla TS, one entry point each.

## Rules of the house

1. **No network code.** The extension must keep working with the network disabled. Do not add a
   `fetch`, a remote font, an analytics SDK, or a permission that is not strictly local.
2. **Text is opt-in.** Never store prompt text unless `settings.storeText` is true. Never log it.
3. **Never intercept typing.** Listeners are passive. Do not `preventDefault`, rewrite, or replay
   keystrokes.
4. **Measurement changes need tests.** If you touch `metrics.ts` or `typing-session.ts`, add a case
   that would have failed before.
5. **No new permissions without an issue first.** `storage` and `clipboardWrite` should be enough.

## Style

- TypeScript strict mode, `verbatimModuleSyntax`.
- Small modules and explicit names. Comments explain *why*, not *what*.
- UI stays dependency-free: system fonts, no component framework, no CSS reset library.
- Match the existing palette and type rules in `docs/DESIGN.md`.
- Prettier: `npm run format`.

## Manual test checklist

Before opening a PR that touches the content script or UI:

- [ ] Load unpacked, open a new ChatGPT chat, type 30+ characters. HUD shows live WPM, timer, words.
- [ ] Pause for 5 seconds. Status switches to thinking; live WPM returns to 0.
- [ ] Send the message. Receipt appears with think/flow/words/signal.
- [ ] Press **Copy card**. Clipboard image or download fallback works.
- [ ] Open the popup. Today's numbers, chart and recent list update; detail view renders a card.
- [ ] Toggle the HUD with `Alt+Shift+T`; reload the page and confirm the setting persists.
- [ ] Toggle theme auto/dark/light in options; HUD and popup follow.
- [ ] Paste a whole message and send. It is flagged low-signal, not counted in averages.
- [ ] Try a narrow window (≈1024px) and drag the HUD; it stays on screen.
- [ ] `npm run typecheck && npm test && npm run build` passes.

## Pull requests

Keep PRs focused. Include the user-visible effect, the measurement impact, and how you tested it. If
a selector changed because ChatGPT shipped a new composer, include the DOM shape in the description.

## Privacy reports

If you find a path where prompt text leaves the browser, or is stored while the setting is off, treat
it as a bug and open an issue immediately. There is no telemetry to disable; there should never be a
place for it to go.
