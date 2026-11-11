# Thinktype v0.3.2 — the orb moves

The collapsed WPM orb is now a first-class object: drag it, resize it, and it remembers.

## What changed

- **Drag the orb.** The collapsed orb is now a drag handle. Move it anywhere in the viewport; the
  position persists across reloads and chats. A click still expands it.
- **Resize the orb.** A corner grip resizes it from **44px to 104px**. Drag the grip, or focus it and
  use the arrow keys (hold Shift for 8px steps). The size persists.
- **Reset control.** Settings now has **Reset orb size** next to **Reset HUD position**.
- The full HUD still drags by its header and auto-fits the conversation gutter. The resize grip is
  for the minimized orb; the full panel keeps its fixed 680px frame and 360/286/142 widths.

## Details

- Orb text scales with the diameter, so the WPM reading stays readable at both ends.
- The orb keeps its position when you expand and collapse it again.
- The resize grip is a small orange corner bracket, visible on the orb and keyboard-focusable.
- Pointer dragging uses capture, so it keeps tracking if the cursor leaves the orb.
- No new permissions, no network code. 47 tests.

## Install

Use the `unpacked` folder at the same path, or the zip below. Reload Thinktype in
`chrome://extensions`, then refresh ChatGPT. The version should read **0.3.2**.

Full method: https://thinktype.loftwah.com/metrics
Privacy: https://thinktype.loftwah.com/privacy
