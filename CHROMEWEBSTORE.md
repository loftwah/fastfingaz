# Chrome Web Store Listing — Thinktype

> Last Updated: 2026-11-11

## Store Listing

**Extension Name** [REQUIRED]

Thinktype — real typing speed

**Short Description** [REQUIRED]

Measure your real typing speed while composing in ChatGPT. Think WPM, flow WPM, printed receipts. Local-only.

**Detailed Description** [REQUIRED]

Thinktype measures how fast you compose your own words in ChatGPT — not how fast you can copy a sentence from a typing test.

Every prompt gives you two readings. Think WPM is the whole message, thinking pauses included. Flow WPM is your hands-only cadence: the speed you type when the words are already there. The gap between them is the interesting part.

Key features:
• A floating HUD while you type, with live WPM, time, words and a five-second cadence meter
• A printed receipt after every sent prompt: think WPM, flow WPM, words, signal quality and a serial
• A share card you can copy or download, generated locally on your machine
• A 14-day history and session detail view in the popup
• Controls for your thinking threshold, minimum message length, HUD position and privacy

How to use it:
1. Install Thinktype and open chatgpt.com.
2. Start a new chat and type a real prompt. The HUD docks beside the composer.
3. Send the message. Thinktype prints a receipt.
4. Choose Copy receipt to put the share card on your clipboard, or open the popup for your history.

Privacy:
Thinktype has no server, no account and no analytics. Your prompt text is not stored by default; the optional Store text setting keeps it on this machine only. Your typing metrics live in Chrome's local extension storage and never leave the browser unless you export them yourself.

If you find a bug or have an idea, open an issue at https://github.com/loftwah/thinktype/issues.

**Category** [REQUIRED]

Productivity

**Single Purpose** [REQUIRED]

Measures typing speed and composition statistics while the user writes prompts in ChatGPT and stores the results locally.

**Primary Language** [REQUIRED]

English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
| --- | --- | --- | --- |
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `public/icon/128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 | ✅ Ready (placeholder composition) | `docs/art/store-1280x800.png` |
| Screenshot 2 [RECOMMENDED] | 1280×800 | ⬜ Not created | |
| Screenshot 3 [RECOMMENDED] | 1280×800 | ⬜ Not created | |
| Screenshot 4 | 1280×800 | ⬜ Not created | |
| Screenshot 5 | 1280×800 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | |

### Screenshot Notes

- **Screenshot 1:** the HUD beside the ChatGPT composer with a real prompt, plus the share receipt.
- **Screenshot 2:** the printed receipt close-up with think/flow/words and the signal row.
- **Screenshot 3:** the popup showing today's numbers, the 14-day chart and recent sessions.
- **Screenshot 4:** the settings sheet with the measurement threshold and privacy section.
- **Screenshot 5:** the draft state (`DRAFT / TYPE TO MEASURE`) to explain resuming an existing draft.

## Permissions Justification

| Permission | Type | Justification |
| --- | --- | --- |
| `storage` | permissions | Saves your settings and local session history (WPM, word counts, timings) in Chrome's extension storage. Nothing is sent off-device. |
| `clipboardWrite` | permissions | Copies the locally rendered share receipt image to your clipboard when you click **Copy receipt**. It is only used on that click. |
| `https://chatgpt.com/*` | host_permissions | Injects the floating HUD and reads the ChatGPT composer to measure the prompt you are writing. It does not read other tabs or other sites. |
| `https://chat.openai.com/*` | host_permissions | Legacy ChatGPT domain. The site redirects to chatgpt.com, but the HUD must still attach for users on the old domain. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No. Data is processed locally and never transmitted off-device. Prompt text is not stored unless the user enables **Store the text of sent prompts**.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
| --- | --- | --- | --- | --- |
| Personally identifiable info | No | No | — | No |
| Health info | No | No | — | No |
| Financial info | No | No | — | No |
| Authentication info | No | No | — | No |
| Personal communications | No | No | — | No |
| Location | No | No | — | No |
| Web history | No | No | — | No |
| User activity | Local only | No | Typing timings and WPM are stored in `chrome.storage.local` for your history. | No |
| Website content | Local only | No | The ChatGPT composer text is read locally to calculate the readings. It is not stored unless the optional text setting is on. | No |

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [REQUIRED]

https://github.com/loftwah/thinktype/blob/main/docs/PRIVACY.md

## Distribution

**Visibility**: Public
**Regions**: All regions

## Developer Info

**Publisher Name** [REQUIRED]

Dean Lofts

**Contact Email** [REQUIRED]

dean@deanlofts.xyz

**Support URL / Email** [RECOMMENDED]

https://github.com/loftwah/thinktype/issues

**Homepage URL** [RECOMMENDED]

https://github.com/loftwah/thinktype

## Version History

| Version | Date | Changes | Status |
| --- | --- | --- | --- |
| 0.1.1 | 2026-11-11 | Draft-aware sessions, larger paper HUD with black LCD, smart docking beside the composer, removed the theme setting (reports are always paper), 27 tests | Draft |
| 0.1.0 | 2026-11-10 | Initial local-first typing measurement extension, HUD, receipts, history, settings | Draft |

## Review Notes

### Known Issues / Limitations

- IME input (Chinese, Japanese, etc.) is flagged as approximate and lowers the signal score.
- Editing an existing draft is measured from the next keystroke; earlier text is not counted in the WPM.
- ChatGPT UI changes can break composer detection until the selector fallbacks are updated.
- The share card is generated locally at 1200×630; no image service is used.
- The 1280×800 store screenshot is a placeholder composition; replace with real captures before submission.

### Rejection History

None yet.
