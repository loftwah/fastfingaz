# Roadmap

## v0.1 — the instrument (current)

- [x] WXT + Chrome MV3 for `chatgpt.com` and `chat.openai.com`
- [x] Composer discovery with legacy and generic fallbacks
- [x] Think WPM / Flow WPM / Peak / Consistency / Corrections / Pauses / Signal
- [x] Paste, autocorrect, undo and IME awareness
- [x] Floating HUD, collapsed orb, printed receipt, keyboard toggle
- [x] 420px paper HUD with a black LCD and smart docking beside the composer
- [x] Draft-aware sessions: DRAFT state, then measure from the next keystroke
- [x] Local storage and 14-day history
- [x] Share receipt (copy PNG or download) and text summary
- [x] Options: threshold, minimum length, privacy, export, clear
- [x] Instrument brand system: Teenage Engineering reference, Geist Sans/Mono/Pixel, paper + signal orange
- [x] 27 unit tests for the measurement core
- [x] Placeholder brand art and a no-install visual demo

## v0.2 — trustworthy numbers

- [ ] Calibrate the idle threshold against Monkeytype runs (see `docs/METRICS.md`)
- [ ] Personal baseline band: compare a session to *your* last 20, not to a global average
- [ ] Threshold presets: "fast hands", "balanced", "deep thinking"
- [ ] Better IME accounting: derive characters from final text and composition spans
- [ ] Harden send detection against editor changes (observe the send button state as another signal)
- [ ] Session detail: delete one session, re-open card, copy summary
- [ ] Import an export file (restore history)
- [ ] 30-day view and a weekly recap line
- [ ] Surface metric definitions in the popup (hover/tap)

## v0.3 — shareable by default

- [ ] Card formats: 1200×630, 1080×1080, 1080×1920
- [ ] "This week" recap card with a small trend
- [ ] Optional comparison card: this session vs your baseline
- [ ] Copy a compact text block for posts and DMs
- [ ] Theme lock for cards (dark, light, transparent)
- [ ] Better empty states and first-run onboarding

## v0.4 — beyond one host

- [ ] Host adapters: Claude, Gemini, Perplexity
- [ ] Generic contenteditable mode with a manual "track this box" picker
- [ ] Firefox port (WebExtensions with a different manifest)
- [ ] Chrome Web Store listing, privacy policy, screenshots, review notes

## Deliberately not planned

- Accounts, cloud sync, leaderboards
- Sending text or metrics anywhere by default
- "AI coaching" that tells you your writing is bad
- Tracking keystrokes outside the composer
- Storing prompt text without an explicit opt-in

## Open questions

1. Is think WPM or flow WPM the number people actually want on the toolbar badge?
2. Is "thinking overhead" the right framing, or does it read as a penalty?
3. Does the 2s idle threshold match how long a real thinking pause feels?
4. Should a session be saved when a message is sent but the composer was never empty (reply editing)?
5. Do we need per-keystroke histograms, or is the rolling sparkline enough?
