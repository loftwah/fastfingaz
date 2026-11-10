# Thinktype v0.3.0 — pause and hold

A manual pause, a slower live number, and the stable dark instrument from 0.2.2.

## Pause

- A pause button sits in the HUD header, next to the dock/collapse controls.
- **Alt+Shift+P** toggles pause/resume from anywhere in the browser.
- While paused: the big number and all readings hold, the header shows `PAUSED`, the pause button
  becomes an orange play button, and the footer says `CLOCKS FROZEN / ALT+SHIFT+P TO RESUME`.
- The wall and active clocks stop. The paused interval is excluded from the final session; a manual
  pause is a declared break, not a reset, and it never creates a receipt on its own.
- Typing resumes automatically. The pause remains available in THINKING and DRAFT once a run exists.
- The extension records the manual pause time on the session (`manualPauseMs`) so it is auditable in
  the export.

## Hold

- The live number is held through short gaps instead of bleeding down with the rolling window.
- The rolling WPM window is 8 seconds; automatic THINKING waits 1.8 seconds.
- Flow/think/peak and the cadence meter still show the real run; the big number is a held live
  reading, not a fabricated score.

## Unchanged

- Dark fixed 680px instrument, side-gutter layout and baseline rail from 0.2.2.
- No new permissions, no network code. 42 tests.

## Install

Use the `unpacked` folder at the same path, or the zip below. Reload Thinktype in
`chrome://extensions`, then refresh ChatGPT. The version should read **0.3.0**.

Full method: https://thinktype.loftwah.com/metrics
Privacy: https://thinktype.loftwah.com/privacy
