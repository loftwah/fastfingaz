<div align="center">
  <img src="docs/art/hero.png" alt="Thinktype — your real typing speed, while you're actually thinking" width="100%" />
</div>

<h1 align="center">thinktype</h1>

<p align="center"><strong>Your real typing speed, while you're actually thinking.</strong></p>

<p align="center">
  Chrome (Manifest V3) · local-only · <a href="docs/METRICS.md">how the metrics work</a> ·
  <a href="CONTRIBUTING.md">contributing</a>
</p>

A Chrome extension for ChatGPT that measures how fast you compose your own words. It watches the
composer locally, separates typing from thinking, and turns each prompt into a shareable stat card.

Typing tests measure transcription: you copy a sentence that is already on screen. That number says
very little about writing original thought. Thinktype measures the thing you actually care about —
how quickly a finished idea becomes text — and shows you both clocks:

- **Think WPM** — the whole message, thinking pauses included.
- **Flow WPM** — your hands-only cadence when the words are already there.

The gap between them is the interesting part.

## What it measures

| Metric | Definition |
| --- | --- |
| **Think WPM** | Final characters ÷ 5 ÷ wall-clock minutes. From first keystroke to send. This is your finished-thought speed. |
| **Flow WPM** | Inserted characters ÷ 5 ÷ active minutes. Gaps over your idle threshold are clamped out. This is your hands. |
| **Peak** | Best 5-second burst in the session. |
| **Consistency** | 100 minus the coefficient of variation of inter-key intervals (0–100, Monkeytype-style). |
| **Correction rate** | Deleted characters as a share of all edit keystrokes. |
| **Thinking overhead** | `1 − think/flow`, shown on the share card. The share of your raw cadence that thinking consumed. |
| **Signal** | How much of the final text is attributable to observed keystrokes. Drops with paste, autocorrect, undo and IMEs. |
| **Pauses** | Gaps over the idle threshold, with a median and longest. |

There is no target text, so "accuracy" is not a meaningful metric here. Correction rate plus signal
quality is the honest replacement. [docs/METRICS.md](docs/METRICS.md) has the formulas and the
reasoning.

## Install (developer build)

```bash
git clone https://github.com/loftwah/thinktype.git
cd thinktype
npm install
npm run build
```

Then:

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select the `dist/` folder.
4. Open [chatgpt.com](https://chatgpt.com), start a new chat, and type a real prompt.

The HUD appears in the top-right. Send the message to get a receipt with **Copy card**. Toggle the
HUD any time with <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd>.

## Screenshots

<p align="center">
  <img src="docs/art/hud.png" alt="Thinktype HUD while typing" width="420" />
  <img src="docs/art/share-card.png" alt="Thinktype share card" width="680" />
</p>

The artwork in `docs/art/` is placeholder brand material; see [docs/art/README.md](docs/art/README.md)
for sizes and what to replace. The card itself is generated on your machine by the extension — no
template service.

## How it works

- A content script finds the ChatGPT composer (`div.ProseMirror[data-composer-markdown]`, with
  fallbacks for older textareas and generic editables).
- It listens to `keydown`, `beforeinput`, `paste` and input events. It never intercepts, blocks or
  rewrites a keystroke.
- On send — Enter or the send button, followed by the composer clearing — it computes stats from the
  final text plus the keystroke timings.
- Only metrics are written to `chrome.storage.local`. There is no network code in the extension.
- The HUD lives in a closed-off shadow root. The share card is drawn with Canvas.

Sending a message is the only "confirm" action: drafts you delete are discarded. Sessions shorter
than the minimum length are ignored.

## Privacy

- No server, no account, no analytics.
- Prompt text is **not stored** by default.
- Stored: WPM numbers, word counts, timings, confidence, timestamp, hostname.
- Optional: enable **Store the text of sent prompts** in settings. It stays in local storage and is
  included in your export.
- Export or clear everything from the options page.

## Project layout

```text
src/
  background.ts          service worker: badge + keyboard command
  content/
    composer.ts          resilient composer discovery and text extraction
    tracker.ts           DOM adapter: keystrokes -> sessions
    typing-session.ts    pure measurement state machine (tested)
    overlay.ts/.css      floating HUD in a shadow root
    index.ts             content-script bootstrap
  popup/                 history, chart, share-card detail
  options/               measurement, HUD, privacy settings
  shared/
    metrics.ts           pure WPM / consistency / pause math (tested)
    share-card.ts        1200x630 canvas card
    storage.ts           chrome.storage.local helpers
    types.ts             data model
tests/                   24 unit tests for the state machine and metrics
demo/                    visual preview without installing the extension
docs/                    metrics, design, roadmap, placeholder art
```

## Development

```bash
npm run dev        # esbuild watch
npm run typecheck  # tsc --noEmit
npm test           # vitest
npm run build      # dist/
npm run demo       # visual preview at localhost:4173
npm run zip        # Chrome Web Store zip
```

The `demo/` pages render the real HUD and share-card code with sample data, so UI work does not
require loading the extension. `npm run typecheck && npm test && npm run build` is the full check.

## Limitations (v0.1)

- ChatGPT ships UI changes often. Selectors have layered fallbacks, but a redesign can still break
  attachment until the selector list is updated.
- IME input (Chinese, Japanese, etc.) is flagged and lowers the signal score; keystroke counts are
  approximate there.
- Typing into an existing draft is not counted. Start from an empty composer.
- Autocorrect, undo and paste lower confidence rather than pretending to be precise.
- Chrome only for now. The measurement core is host-agnostic; more hosts are on the roadmap.

## Roadmap

Short version: calibrate thresholds against real sessions, add a personal baseline, weekly recaps,
better IME handling, and then other chat UIs. Full list in [docs/ROADMAP.md](docs/ROADMAP.md).

## License

MIT © Dean Lofts. See [LICENSE](LICENSE).
