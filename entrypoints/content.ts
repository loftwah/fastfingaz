import { defineContentScript } from 'wxt/utils/define-content-script';
import {
  appendSession,
  loadSettings,
  onSettingsChanged,
  saveSettings,
} from '../shared/storage';
import type { SessionRecord, Settings } from '../shared/types';
import { findComposer } from '../content/composer';
import { CONTENT_FONT_FACES } from '../content/font-faces';
import { Overlay } from '../content/overlay';
import { ComposerTracker, EMPTY_LIVE } from '../content/tracker';

declare global {
  interface Window {
    __thinktype?: boolean;
  }
}

export default defineContentScript({
  matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
  runAt: 'document_idle',
  async main() {
    if (window.top !== window || window.__thinktype) return;
    window.__thinktype = true;
    await boot();
  },
});

async function boot(): Promise<void> {
  let settings: Settings = await loadSettings();

  const overlay = new Overlay({
    theme: settings.theme,
    collapsed: settings.hudCollapsed,
    pos: settings.hudPos,
    fontFacesCss: CONTENT_FONT_FACES,
    onMove: (pos) => {
      settings = { ...settings, hudPos: pos };
      void saveSettings({ hudPos: pos });
    },
    onCollapse: (collapsed) => {
      settings = { ...settings, hudCollapsed: collapsed };
      void saveSettings({ hudCollapsed: collapsed });
    },
    onHide: () => {
      settings = { ...settings, showHud: false };
      void saveSettings({ showHud: false });
    },
  });
  overlay.mount();

  let currentEl: HTMLElement | null = null;
  let tracker: ComposerTracker | null = null;

  const syncVisibility = (): void => {
    overlay.setVisible(settings.showHud && !!currentEl?.isConnected);
  };

  const handleSession = (record: SessionRecord): void => {
    void appendSession(record).catch((error) => {
      console.warn('[thinktype] could not save session', error);
    });
    overlay.showReceipt(record);
    try {
      void chrome.runtime.sendMessage({ type: 'session-saved' }).catch(() => undefined);
    } catch {
      // Extension was reloaded; the page keeps working until refresh.
    }
  };

  const ensureComposer = (): void => {
    const el = findComposer();
    if (!el) {
      syncVisibility();
      return;
    }
    if (el === currentEl && tracker && el.isConnected) {
      syncVisibility();
      return;
    }
    tracker?.destroy();
    currentEl = el;
    tracker = new ComposerTracker(el, settings, { onSession: handleSession });
    syncVisibility();
  };

  ensureComposer();

  const scanTimer = window.setInterval(ensureComposer, 1200);
  const uiTimer = window.setInterval(() => {
    overlay.update(tracker ? tracker.liveStats() : EMPTY_LIVE);
    overlay.setTheme(settings.theme);
  }, 250);

  let lastUrl = location.href;
  const urlTimer = window.setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      ensureComposer();
    }
  }, 1000);

  const unsubscribe = onSettingsChanged((next) => {
    settings = next;
    tracker?.updateSettings(next);
    overlay.setTheme(next.theme);
    overlay.setCollapsed(next.hudCollapsed, false);
    overlay.setPosition(next.hudPos);
    syncVisibility();
  });

  chrome.runtime.onMessage.addListener((message: unknown) => {
    if (
      typeof message === 'object' &&
      message !== null &&
      (message as { type?: string }).type === 'toggle-hud'
    ) {
      void saveSettings({ showHud: !settings.showHud });
    }
  });

  window.addEventListener('pagehide', () => {
    window.clearInterval(scanTimer);
    window.clearInterval(uiTimer);
    window.clearInterval(urlTimer);
    unsubscribe();
    tracker?.destroy();
    overlay.destroy();
    window.__thinktype = false;
  });
}
