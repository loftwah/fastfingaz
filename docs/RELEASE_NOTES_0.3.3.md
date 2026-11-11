# Thinktype v0.3.3 — dark, and easier to get back

A polish pass: the extension pages now match the HUD, and hiding the HUD no longer hides the way back.

## What changed

- **Dark popup and settings.** The popup and options page are now anodised black with paper text,
  matching the live instrument. Receipts and share cards stay paper.
- **HUD toggle in the popup.** A full-width **HIDE HUD / SHOW HUD** button sits under the header. It
  writes the same `showHud` setting as the HUD's X button and the `Alt+Shift+T` shortcut.
- **OFF badge.** While the HUD is hidden, the toolbar badge reads `OFF` instead of today's WPM. When
  you show it again, the number returns.
- **Contrast fixes.** Chart bars are brighter on black, and the popup scrollbar is dark. No more light
  flash when the popup opens.
- **Regression checks.** Orb drag, orb resize, full-HUD drag, pause, receipt, share sheet and the
  settings page were exercised at 1280, 1600 and 2048 px.

## Scope

Still `chatgpt.com` only. A per-tab opt-in for other text boxes would need `activeTab` + `scripting`
and a generic end-of-run adapter; it is on the roadmap, not in this build.

No new permissions, no network code. 47 tests.

## Install

Use the `unpacked` folder at the same path, or the zip below. Reload Thinktype in
`chrome://extensions`, then refresh ChatGPT. The version should read **0.3.3**.

Full method: https://thinktype.loftwah.com/metrics
Privacy: https://thinktype.loftwah.com/privacy
