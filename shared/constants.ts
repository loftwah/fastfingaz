import type { Settings } from './types';

export const GITHUB_URL = 'https://github.com/loftwah/thinktype';

export const STORAGE_KEYS = {
  settings: 'tt:settings:v1',
  sessions: 'tt:sessions:v1',
} as const;

/** Keep the local history bounded. 500 prompts is months of normal use. */
export const MAX_SESSIONS = 500;

/** Ignore tiny messages: they are conversation, not a typing sample. */
export const MIN_SESSION_MS = 3000;

export const DEFAULT_SETTINGS: Settings = {
  showHud: true,
  hudCollapsed: false,
  hudPos: null,
  theme: 'auto',
  idleThresholdMs: 2000,
  minSessionChars: 32,
  storeText: false,
};

/**
 * Composer selectors, most specific first. ChatGPT has shipped at least three
 * composer implementations; each new one gets added here rather than replacing
 * the old one.
 */
export const COMPOSER_SELECTORS = [
  '[data-composer-markdown][contenteditable="true"]',
  '#prompt-textarea',
  'form .ProseMirror[contenteditable="true"]',
  'textarea[data-testid="prompt-textarea"]',
  'textarea[placeholder*="Message"]',
  'div[contenteditable="true"][role="textbox"]',
];

export const SEND_SELECTORS = ['button[aria-label="Send"]', 'button[data-testid="send-button"]'];
