# Thinktype v0.2.2 — stable dock

A small layout fix on top of the night instrument.

## What changed

- The HUD and baseline rail no longer re-dock while the ChatGPT composer grows with text. The
  instrument stays exactly where it is; the composer gets the room.
- Wider gutter buffers: 32px beside the rail, 24px from the viewport edge for the live panel, and a
  32px reserve in the rail width. The first keystroke cannot slide the composer under the instrument.
- The fixed 680px frame remains: idle, draft, typing, thinking, receipt and share all use the same
  360×680 panel.
- 38 tests, no new permissions, no network code.

## Install

Use the `unpacked` folder at the same path, or replace it with the zip below. If Thinktype is
already loaded, click **Reload** in `chrome://extensions`, then refresh ChatGPT. The version should
read **0.2.2**.

Full method: https://thinktype.loftwah.com/metrics
Privacy: https://thinktype.loftwah.com/privacy
