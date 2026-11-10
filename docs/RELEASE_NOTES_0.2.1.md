# Thinktype v0.2.1 — the night instrument

A layout correction, not a feature release. The instrument is now dark, one fixed size, and uses the
real side gutters.

## What changed

- **Anodised black housing.** The live HUD is a black instrument with a black LCD, hairline rules and
  signal orange data. Paper is reserved for the receipt, popup, options page and share cards.
- **One fixed 680px frame.** Idle, draft, typing, thinking, receipt and share no longer change the
  panel size. Only the content changes.
- **Side-gutter layout.** The live instrument sits in the right gutter at 360px (2048), 286px
  (1728) or 142px (1440). At 1280 with the sidebar open there is no true gutter, so it stays a 60px
  orb instead of covering the sidebar.
- **Baseline rail.** When the left gutter is at least 300px, a companion rail shows LAST / BEST / AVG,
  a 14-day think WPM chart, best/avg flow, readings/drafts and the last four readings.
- **Bigger primary.** 120px at full width, 100px medium, 72px slim. Three-digit values scale down
  rather than clip.
- **Receipt.** The paper receipt now includes a cadence chart and fits inside the same dark frame.
- **No new permissions, no network code.** 38 tests; typecheck and build green.

## Install

Download the zip below, unzip it, open `chrome://extensions`, enable Developer mode, choose **Load
unpacked**, and select the folder that contains `manifest.json`. If Thinktype is already loaded,
replace it with the new folder and refresh ChatGPT.

Full method: https://thinktype.loftwah.com/metrics
Privacy: https://thinktype.loftwah.com/privacy
