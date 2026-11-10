# Thinktype v0.2.0 — the vertical instrument

The HUD is now a tall instrument anchored to the bottom of the viewport. It lives in the empty gutter
beside the conversation, never over the composer, send button or last message.

## The instrument

- Full 300px, medium 232px and slim 142px layouts, chosen from the space beside the conversation.
- 72–80px primary reading; flow, think, peak, time, words, signal and steady rhythm in the LCD.
- A baseline strip with best think, average think, best flow, average flow, readings and drafts.
- Collapses to the 60px orb and remembers a dragged position; Dock resets it.

## Honest history

- A pause holds the run in THINKING. The live number does not drop to zero.
- Idle shows LAST / BEST / AVG, with dashes before the first reading.
- Durable best think, flow and peak; last eligible run; weighted 20-session average; all-time
  average. A lower run never overwrites a best.
- Only sent prompts are recorded. Minimum time, minimum characters, 50% signal and not
  paste-dominated. Resumed drafts go to a draft bucket and are excluded from best/averages. IME runs
  are excluded from best below 85% signal.
- A text-free in-progress snapshot in `chrome.storage.session` is shown as PAUSED / NOT RECORDED
  after a reload.

## Share cards

- Three designed formats: 1200×630, 1080×1080 and 1080×1920. Nothing is stretched.
- A share sheet in the HUD receipt and the popup: format tabs, live preview, file name, PNG size,
  copy and download.
- The receipt keeps the serial, barcode, cadence bars, best/average and a small NEW BEST stamp.

## Site and checks

- Static site live at https://thinktype.loftwah.com on Cloudflare Pages, with a working HTTPS custom
  domain, OG/Twitter tags, JSON-LD, sitemap, robots, 404 and long-lived asset caching.
- 38 unit tests; typecheck and production build green.
- No new extension permissions. No network code in the extension.

## Install

Download the zip below, unzip it, open `chrome://extensions`, enable Developer mode, choose **Load
unpacked**, and select the folder. Then open `chatgpt.com` and type a real prompt.

This is an early build. The Chrome Web Store listing has not been submitted. The screenshots and
sample readings are sample data, not a benchmark.

Full method: https://thinktype.loftwah.com/metrics
Privacy: https://thinktype.loftwah.com/privacy
