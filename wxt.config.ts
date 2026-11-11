import { defineConfig } from 'wxt';

/**
 * Fastfingaz — a local-only typing instrument for ChatGPT.
 *
 * WXT owns the manifest and the build; this file only records what the
 * extension needs from Chrome. Icons live in public/icon and are picked up by
 * convention.
 */
export default defineConfig({
  manifestVersion: 3,
  manifest: {
    name: 'Fastfingaz — real typing speed',
    short_name: 'Fastfingaz',
    description:
      'Measure your real typing speed while you think out loud with ChatGPT. Think WPM, flow WPM, shareable receipts. All local.',
    permissions: ['storage', 'clipboardWrite'],
    host_permissions: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
    minimum_chrome_version: '116',
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    action: {
      default_title: 'Fastfingaz',
    },
    options_ui: {
      open_in_tab: true,
    },
    commands: {
      'toggle-hud': {
        suggested_key: {
          default: 'Alt+Shift+T',
        },
        description: 'Show or hide the Fastfingaz HUD',
      },
      'pause-run': {
        suggested_key: {
          default: 'Alt+Shift+P',
        },
        description: 'Pause or resume the Fastfingaz run',
      },
    },
  },
});
