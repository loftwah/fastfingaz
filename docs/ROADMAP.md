# Roadmap

## v0.2 — trustworthy numbers

- [x] Vertical, bottom-anchored HUD in the empty gutter beside the conversation
- [x] Full / medium / slim layouts; never covers the composer or last message
- [x] Pause holds the run in THINKING; the live number does not drop to zero
- [x] Idle LAST / BEST / AVG with dashes before the first reading
- [x] Durable best think / flow / peak, last eligible run, weighted 20-session average, all-time average
- [x] Best never regresses; a lower run cannot overwrite a higher one
- [x] Eligibility gates: sent prompts only, minimum characters/time, 50% signal, paste-dominated rejection
- [x] Resumed drafts in a draft bucket; IME best only above 85% signal
- [x] Text-free in-progress snapshot in `chrome.storage.session`, shown as PAUSED / NOT RECORDED
- [x] Three designed share formats: 1200×630, 1080×1080, 1080×1920
- [x] Share sheet in the HUD receipt and popup with format tabs, preview, file size, copy and download
- [x] Share cards at exact social dimensions, rendered locally
- [x] Static marketing site at https://thinktype.loftwah.com on Cloudflare Pages
- [x] SEO: canonical, OG/Twitter tags, JSON-LD, sitemap, robots, 404, favicon, web manifest
- [x] 38 unit tests; green typecheck, tests and production build
- [x] No new manifest permissions

## v0.3 — pause and hold (current)

- [x] Manual pause button in the HUD header and `Alt+Shift+P` shortcut
- [x] Paused time excluded from wall and active time; typing resumes automatically
- [x] Amber/play state and `PAUSED` labels in the header and footer
- [x] 8-second rolling live window and a held number through short gaps
- [x] 42 unit tests (pause intervals, wall/active exclusion, auto-resume)

## v0.4 — calibration and trust

- [ ] Calibrate the idle threshold against Monkeytype runs (see `docs/METRICS.md`)
- [ ] Threshold presets: "fast hands", "balanced", "deep thinking"
- [ ] Better IME accounting: derive characters from final text and composition spans
- [ ] Harden send detection against editor changes (observe the send button state as another signal)
- [ ] Session detail: delete one session, re-open card, copy summary
- [ ] Import an export file (restore history)
- [ ] 30-day view and a weekly recap line
- [ ] Surface metric definitions in the popup (hover/tap)
- [ ] A personal baseline band on the 14-day chart

## v0.5 — shareable by default

- [ ] "This week" recap card with a small trend
- [ ] Optional comparison card: this session vs your baseline
- [ ] Copy a compact text block for posts and DMs
- [ ] Theme lock for cards (paper, ink, transparent)
- [ ] Better empty states and first-run onboarding
- [ ] A real Chrome Web Store submission with five captures

## v0.6 — beyond one host

- [ ] Host adapters: Claude, Gemini, Perplexity
- [ ] Generic contenteditable mode with a manual "track this box" picker
- [ ] Firefox port (WebExtensions with a different manifest)
- [ ] Store listing, privacy policy, screenshots, review notes

## Deliberately not planned

- Accounts, cloud sync, leaderboards
- Sending text or metrics anywhere by default
- "AI coaching" that tells you your writing is bad
- Tracking keystrokes outside the composer
- Storing prompt text without an explicit opt-in
- Purchasing a domain or renaming the product without approval

## Open questions

1. Is think WPM or flow WPM the number people actually want on the toolbar badge?
2. Is "thinking overhead" the right framing, or does it read as a penalty?
3. Does the 2s idle threshold match how long a real thinking pause feels?
4. Should a resumed draft ever be eligible for a separate draft best?
5. Do we need per-keystroke histograms, or is the rolling sparkline enough?
6. Is the slim 142 px HUD at 1440 readable enough, or should it collapse to the orb?
