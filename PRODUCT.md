# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

WXT (user-selected) with TypeScript and Vite. Vanilla DOM/CSS for the UI; no React/Vue. Tests with
Vitest. The extension targets Chrome MV3 first.

## Users

Primary: Dean and knowledge workers/developers who think by writing, use ChatGPT every day, and want
an honest measure of how fast original thought becomes text — not a typing test. Secondary: people
who compare progress with friends and want a card worth sharing.

## Product Purpose

Thinktype measures how fast a finished thought becomes text inside ChatGPT. It separates thinking
time from hands-on typing time, keeps every number local, and turns each sent prompt into a
shareable receipt. Success is a stable personal baseline the user can trust and explain, not a
scoreboard.

## Positioning

Typing tests measure transcription: the sentence already exists. Thinktype has no target text, so it
measures original composition where the thinking happens. Its two clocks — think WPM and flow WPM —
plus an explicit signal score make the gap between thought and hands visible. A competitor can copy
a WPM counter; it cannot truthfully copy the pause model, the local-only posture, and the
composition context together.

## Operating Context

Installed as an unpacked Chrome MV3 extension (Web Store later). Lives inside `chatgpt.com`, with a
tall, bottom-anchored HUD in the empty gutter beside the conversation. The user writes a prompt,
sends it, gets a receipt, optionally shares one of three card formats. History and the personal
baseline live in the popup; settings in the options page. No account, no server, no network calls.

## Capabilities and Constraints

- Chrome MV3: content script, service worker, popup, options page.
- Metrics: think WPM, flow WPM, peak, consistency, correction rate, pauses, signal quality.
- Durable history: best think/flow/peak, last eligible run, weighted 20-session average, all-time
  average, draft bucket. A lower run never overwrites a best.
- Pause is not a reset: the live number holds in THINKING; idle shows LAST / BEST / AVG with dashes
  before the first reading.
- Eligibility: sent prompts only, minimum characters and wall time, 50% signal, paste-dominated
  rejection, resumed drafts excluded from best/average, IME best only above 85% signal.
- Local storage only; prompt text is not stored unless explicitly enabled. In-progress snapshots
  use `chrome.storage.session` and contain no text.
- Three share cards — 1200×630, 1080×1080, 1080×1920 — are rendered locally on canvas, with a share
  sheet in the HUD and popup.
- The ChatGPT composer DOM is unstable; selectors need layered fallbacks.
- Paste, autocorrect, undo and IMEs are flagged and lower signal rather than being hidden.
- No real user sessions yet; the measurement defaults still need calibration.
- Marketing site live at https://thinktype.loftwah.com on Cloudflare Pages.
- Current version: 0.3.1.

## Brand Commitments

- Name: **Thinktype**. Domain: **thinktype.loftwah.com**. Do not rename or buy a domain without
  explicit approval; see `docs/NAMES.md` for the screened alternatives.
- Voice: dry, precise, never scolding. Numbers are a mirror, not a scoreboard.
- Explicitly requested: unique branding with a specific external reference; Vercel's current Geist
  type family; nothing that reads as generic AI design.
- Privacy is a product promise: local-only, text opt-in.
- The share card is the primary brand artifact; the card renderer is the source of truth.
- Artwork is placeholder until replaced; no fabricated customers, benchmarks or testimonials.

## Evidence on Hand

- Working v0.2 code, 38 unit tests, green CI, real screenshots and sample data in `demo/`.
- Live composer attachment verified against ChatGPT's ProseMirror editor.
- Marketing site live at https://thinktype.loftwah.com with OG art, sitemap and privacy policy.
- No real sessions, testimonials, press or store reviews. Do not invent them.

## Product Principles

1. Measure composition, not transcription.
2. Separate thought from hands; never hide the pause.
3. Be honest about signal quality.
4. Local by default; text is opt-in.
5. A mirror, not a scoreboard.

## Accessibility & Inclusion

Keyboard toggle for the HUD, focus-visible controls, reduced-motion support, and readable contrast on
paper surfaces. No specific WCAG level has been confirmed.
