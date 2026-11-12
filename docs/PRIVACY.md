# Fastfingaz Privacy Policy

**Effective date:** 12 November 2026

**Published at:** https://fastfingaz.loftwah.com/privacy

Fastfingaz is a Chrome extension that measures how fast you compose text in ChatGPT. This policy
explains what it does with your data. The short version: everything stays in your browser.

## What Fastfingaz processes

- **Composer text.** When you are on `chatgpt.com` or `chat.openai.com`, Fastfingaz reads the text in
  the ChatGPT composer so it can calculate word counts, WPM, pauses and signal quality. This happens
  locally on your machine.
- **Typing metrics.** It records timings, WPM, word counts, corrections and related stats for prompts
  you send. These are stored in `chrome.storage.local` in your browser.
- **In-progress snapshots.** While a run is active, a short-lived, text-free snapshot of its numbers
  is kept in `chrome.storage.session` with the tab and ChatGPT page path. It lets the same page in
  that tab show `PAUSED / NOT RECORDED` after a reload. It is cleared when the run ends or the tab
  closes and never enters history.
- **Your settings.** Your threshold, minimum length, HUD position and privacy choices are stored in
  the same local extension storage.

By default, Fastfingaz does **not** store the text of your prompts. If you turn on **Store the text of
sent prompts**, that text is stored locally with the session and included in your export when
Chrome has room. If the new prompt text would exceed the storage quota, Fastfingaz tries to save
the metrics alone and tells you on the receipt. Turning off text storage applies to future
readings. **Clear all sessions** removes previously stored text along with the history.

## What Fastfingaz does not do

- No server, account, analytics, telemetry or remote logging.
- No prompt text, metrics or settings are transmitted off your device.
- No data is sold, rented or shared with third parties.
- No advertising or tracking code.
- No reading of tabs or sites other than the ChatGPT domains listed in the extension manifest.

## Permissions

| Permission | Why it exists |
| --- | --- |
| `storage` | Save your settings and local session history. |
| `clipboardWrite` | Copy the share receipt image to your clipboard when you click **Copy receipt**. |
| `https://chatgpt.com/*` | Attach the HUD and read the ChatGPT composer so typing can be measured. |
| `https://chat.openai.com/*` | Legacy ChatGPT domain, which redirects to chatgpt.com. |

## Retention and deletion

Your data stays in Chrome's local extension storage until you remove it. Open Fastfingaz's settings and
choose **Clear all sessions** to delete your history, or **Export data** to take a copy first.
Uninstalling the extension removes its local storage.

## Security

Fastfingaz has no backend to secure. The extension runs inside Chrome's extension sandbox and only
requests the permissions listed above. The optional stored text is protected by Chrome's extension
storage, not by a separate encryption layer.

## Children

Fastfingaz is a general-purpose productivity tool and is not directed at children under 13. It does not
knowingly collect personal information from anyone.

## Changes

If this policy changes, the effective date above will be updated and the change will be visible in the
public repository. Continued use after a change means you accept the updated policy.

## Contact

Questions or concerns: open an issue at
[github.com/loftwah/fastfingaz/issues](https://github.com/loftwah/fastfingaz/issues) or email
[dean@deanlofts.xyz](mailto:dean@deanlofts.xyz).
