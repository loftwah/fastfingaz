import { defineContentScript } from 'wxt/utils/define-content-script';
import { STORAGE_KEYS } from '../shared/constants';
import { isNewBest } from '../shared/metrics';
import {
  appendSession,
  clearLiveSnapshot,
  loadHistory,
  loadLiveSnapshot,
  loadSessions,
  loadSettings,
  onSettingsChanged,
  saveLiveSnapshot,
  saveSettings,
} from '../shared/storage';
import type { HistorySummary, SessionRecord, Settings } from '../shared/types';
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
  let history: HistorySummary = await loadHistory();
  let sessions: SessionRecord[] = await loadSessions();

  let currentEl: HTMLElement | null = null;
  let tracker: ComposerTracker | null = null;

  const overlay = new Overlay({
    collapsed: settings.hudCollapsed,
    pos: settings.hudPos,
    fontFacesCss: CONTENT_FONT_FACES,
    getComposerRect: () => currentEl?.getBoundingClientRect() ?? null,
    getMainRect: () => document.querySelector('main')?.getBoundingClientRect() ?? null,
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
  overlay.setHistory(history);
  overlay.setSessions(sessions);

  const syncVisibility = (): void => {
    overlay.setVisible(settings.showHud && !!currentEl?.isConnected);
  };

  const handleSession = async (record: SessionRecord): Promise<void> => {
    const previous = history;
    const newBest = isNewBest(record, previous.best);
    const firstReading = previous.totals.recorded === 0;

    try {
      await appendSession(record);
      history = await loadHistory();
      sessions = await loadSessions();
      overlay.setHistory(history);
      overlay.setSessions(sessions);
      overlay.showReceipt(record, { newBest, firstReading, history });
      await clearLiveSnapshot();
    } catch (error) {
      console.warn('[thinktype] could not save session', error);
      // Still show the receipt: the number is real even when storage fails.
      overlay.showReceipt(record, { newBest, firstReading, history: previous });
    }

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
      overlay.refreshPosition();
      syncVisibility();
      return;
    }
    tracker?.destroy();
    currentEl = el;
    tracker = new ComposerTracker(el, settings, { onSession: handleSession });
    if (!settings.hudPos) overlay.setPosition(null);
    overlay.refreshPosition();
    syncVisibility();
  };

  ensureComposer();

  // A tab reload cannot restore the in-progress keystroke clock. Show the last
  // snapshot from chrome.storage.session, clearly marked as paused and never
  // recorded, so a stale number is not passed off as a live run.
  const paused = await loadLiveSnapshot();
  if (paused) overlay.setPaused(paused);

  let lastSnapshotAt = 0;
  let hadLiveSnapshot = false;
  const scanTimer = window.setInterval(ensureComposer, 1200);
  const uiTimer = window.setInterval(() => {
    const live = tracker ? tracker.liveStats() : EMPTY_LIVE;
    overlay.update(live);
    if (live.active) {
      hadLiveSnapshot = true;
      if (Date.now() - lastSnapshotAt < 1000) return;
      const snapshot = tracker?.snapshot();
      if (snapshot) {
        lastSnapshotAt = Date.now();
        void saveLiveSnapshot(snapshot);
      }
    } else if (hadLiveSnapshot) {
      hadLiveSnapshot = false;
      void clearLiveSnapshot();
    }
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
    overlay.setCollapsed(next.hudCollapsed, false);
    overlay.setPosition(next.hudPos);
    syncVisibility();
  });

  const onStorage = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ): void => {
    if (
      area !== 'local' ||
      (!changes[STORAGE_KEYS.history] && !changes[STORAGE_KEYS.sessions])
    ) {
      return;
    }
    void Promise.all([loadHistory(), loadSessions()]).then(([nextHistory, nextSessions]) => {
      history = nextHistory;
      sessions = nextSessions;
      overlay.setHistory(nextHistory);
      overlay.setSessions(nextSessions);
      overlay.refreshPosition();
    });
  };
  chrome.storage.onChanged.addListener(onStorage);

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
    chrome.storage.onChanged.removeListener(onStorage);
    tracker?.destroy();
    overlay.destroy();
    window.__thinktype = false;
  });
}
