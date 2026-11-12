# Fastfingaz v0.4.2

- The popup reads the active ChatGPT tab. A reload can show that tab's last reading as paused.
- Settings and session writes share one queue. Sending prompts in two tabs preserves both records.
- The worker checks the current text opt-in before saving each record.
- Manual breaks are removed from a gap before the idle cap is applied.
- Editing after a failed send cancels the pending send. Clearing the editor after that edit does not print a receipt.
- Clearing history updates the toolbar badge.
- The extension uses the same four manifest permission entries and runs locally.

Download the Chrome ZIP, unzip it, then load the folder from `chrome://extensions` with Developer mode enabled.
