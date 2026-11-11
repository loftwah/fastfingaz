# Thinktype v0.3.1 — the live number tells the truth

A live-counter fix, not a new measurement model.

## What changed

- The big live number now uses the last **eight seconds of actual typing**. A gap longer than the
  thinking threshold is not typing time, so it is skipped instead of averaged into the window. The
  number holds while you choose the next word.
- Fixed the bleed: the reading is recomputed only when a key lands. The 250 ms UI tick can no longer
  slide it down while the clock runs.
- A run shorter than eight seconds is no longer divided by a full eight seconds. A three-second burst
  reads as a three-second burst.
- Manual pauses are removed from the live window entirely.
- The idle big number is labelled **LAST THINK**, so it is not mistaken for a typing score.

## What did not change

- **Think WPM** still includes every pause, re-read and rewrite. That is the finished-thought score.
- **Flow WPM** still charges the clamped thinking gap. It is the fair comparison with a typing test.
- **Peak** is still your best five-second burst, and the closest thing to a Monkeytype sprint.
- No new permissions, no network code. 47 tests.

## Why 130 on Monkeytype can be 100 here

Monkeytype gives you the words and a short timer, so its WPM is sustained transcription. Thinktype
gives you a blank composer. A 130 WPM typing test and a 100 WPM flow score are both true: one is
transcription, the other is composition. Compare **Flow** and **Peak**, not **Think**.

## Install

Use the `unpacked` folder at the same path, or the zip below. Reload Thinktype in
`chrome://extensions`, then refresh ChatGPT. The version should read **0.3.1**.

Full method: https://thinktype.loftwah.com/metrics
Privacy: https://thinktype.loftwah.com/privacy
