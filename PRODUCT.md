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
floating HUD over the composer. The user writes a prompt, sends it, gets a receipt, optionally
shares a card. History lives in the popup; settings in the options page. No account, no server, no
network calls.

## Capabilities and Constraints

- Chrome MV3: content script, service worker, popup, options page.
- Metrics: think WPM, flow WPM, peak, consistency, correction rate, pauses, signal quality.
- Local storage only; prompt text is not stored unless explicitly enabled.
- A 1200×630 share card is rendered locally on canvas.
- The ChatGPT composer DOM is unstable; selectors need layered fallbacks.
- Paste, autocorrect, undo and IMEs are flagged and lower signal rather than being hidden.
- No real user sessions yet; the measurement defaults still need calibration.
- Current version: 0.1.0.

## Brand Commitments

- Name: **Thinktype**.
- Voice: dry, precise, never scolding. Numbers are a mirror, not a scoreboard.
- Explicitly requested: unique branding with a specific external reference; Vercel's current Geist
  type family; nothing that reads as generic AI design.
- Privacy is a product promise: local-only, text opt-in.
- The share card is the primary brand artifact; the card renderer is the source of truth.
- Artwork is placeholder until replaced; no fabricated customers, benchmarks or testimonials.

## Evidence on Hand

- Working v0.1 code, 27 unit tests, green CI, real screenshots and sample data in `demo/`.
- Live composer attachment verified against ChatGPT's ProseMirror editor.
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
