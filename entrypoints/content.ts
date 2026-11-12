import { defineContentScript } from 'wxt/utils/define-content-script';
import { STORAGE_KEYS } from '../shared/constants';
import { appendSession, requestWorker, saveSettings } from '../shared/messages';
import { loadHistory, loadSessions, loadSettings, onSettingsChanged } from '../shared/storage';
import type { LiveSnapshot } from '../shared/storage';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import type { HistorySummary, SessionRecord, Settings } from '../shared/types';
import { findComposer } from '../content/composer';
import { CONTENT_FONT_FACES } from '../content/font-faces';
import { Overlay } from '../content/overlay';
import { ComposerTracker, EMPTY_LIVE } from '../content/tracker';

declare global {
  interface Window {
    __fastfingaz?: boolean;
  }
}

export default defineContentScript({
  matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
  runAt: 'document_idle',
  async main(ctx) {
    if (window.top !== window || window.__fastfingaz) return;
    window.__fastfingaz = true;
    await boot(ctx);
  },
});

async function boot(ctx: ContentScriptContext): Promise<void> {
  let settings: Settings = await loadSettings();
  let history: HistorySummary = await loadHistory();
  const sessions = await loadSessions();
  if (ctx.isInvalid) return;

  let currentEl: HTMLElement | null = null;
  let tracker: ComposerTracker | null = null;
  const persist = (patch: Partial<Settings>): void => {
    void saveSettings(patch).catch(() => console.warn('[fastfingaz] could not save settings'));
  };
  const saveSnapshot = (snapshot: LiveSnapshot | null): void => {
    void requestWorker({ type: 'save-snapshot', snapshot }).catch(() => undefined);
  };

  const overlay = new Overlay({
    collapsed: settings.hudCollapsed,
    pos: settings.hudPos,
    orbSize: settings.hudOrbSize,
    size: settings.hudSize,
    showRail: settings.showRail,
    fontFacesCss: CONTENT_FONT_FACES,
    getComposerRect: () => currentEl?.getBoundingClientRect() ?? null,
    getMainRect: () => document.querySelector('main')?.getBoundingClientRect() ?? null,
    onMove: (pos) => {
      settings = { ...settings, hudPos: pos };
      persist({ hudPos: pos });
    },
    onOrbSize: (size) => {
      settings = { ...settings, hudOrbSize: size };
      persist({ hudOrbSize: size });
    },

    onCollapse: (collapsed) => {
      settings = { ...settings, hudCollapsed: collapsed };
      persist({ hudCollapsed: collapsed });
    },
    onHide: () => {
      settings = { ...settings, showHud: false };
      persist({ showHud: false });
    },
    onPause: () => {
      tracker?.togglePause();
    },
  });
  overlay.mount();
  overlay.setHistory(history);
  overlay.setSessions(sessions);

  let composerVisible = false;
  const syncVisibility = (): void => {
    overlay.setVisible(settings.showHud && composerVisible && !!currentEl?.isConnected);
  };

  const handleSession = async (record: SessionRecord): Promise<void> => {
    try {
      const saved = await appendSession(record);
      overlay.showReceipt(record, saved);
    } catch {
      console.warn('[fastfingaz] could not save session');
      overlay.showReceipt(record, { newBest: false, firstReading: false, history });
    }
  };

  let lastSidebarWidth = document.querySelector('main')?.getBoundingClientRect().left ?? 0;
  const ensureComposer = (): void => {
    const mainLeft = document.querySelector('main')?.getBoundingClientRect().left ?? 0;
    if (Math.abs(mainLeft - lastSidebarWidth) > 2) {
      // The sidebar opened or closed. Re-dock, but do not chase the composer
      // as it grows with text; that would make the instrument jump mid-sentence.
      lastSidebarWidth = mainLeft;
      overlay.refreshPosition();
    }
    const el = findComposer();
    composerVisible = !!el;
    if (!el) {
      if (currentEl && !currentEl.isConnected) {
        tracker?.destroy();
        tracker = null;
        currentEl = null;
      }
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
    if (!settings.hudPos) overlay.setPosition(null);
    overlay.refreshPosition();
    syncVisibility();
  };

  ensureComposer();

  // A reload can show the last reading, but it cannot restore the keystroke clock.
  const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (navigation?.type === 'reload') {
    void requestWorker<LiveSnapshot | null>({ type: 'load-snapshot' })
      .then((snapshot) => {
        if (!ctx.isInvalid && !tracker?.hasRun) overlay.setPaused(snapshot);
      })
      .catch(() => undefined);
  } else {
    saveSnapshot(null);
  }

  let lastSnapshotAt = 0;
  let hadLiveSnapshot = false;
  const scanTimer = window.setInterval(ensureComposer, 1200);
  ctx.addEventListener(window, 'wxt:locationchange', ensureComposer);
  const uiTimer = window.setInterval(() => {
    const live = tracker ? tracker.liveStats() : EMPTY_LIVE;
    overlay.update(live);
    if (live.active) {
      if (hadLiveSnapshot && Date.now() - lastSnapshotAt < 1000) return;
      const snapshot = tracker?.snapshot(live);
      if (snapshot) {
        hadLiveSnapshot = true;
        lastSnapshotAt = snapshot.endedAt;
        saveSnapshot(snapshot);
      }
    } else if (hadLiveSnapshot) {
      hadLiveSnapshot = false;
      saveSnapshot(null);
    }
  }, 250);

  const unsubscribe = onSettingsChanged((next) => {
    settings = next;
    tracker?.updateSettings(next);
    overlay.setCollapsed(next.hudCollapsed, false);
    overlay.setPosition(next.hudPos);
    overlay.setOrbSize(next.hudOrbSize);
    overlay.setSize(next.hudSize);
    overlay.setShowRail(next.showRail);
    overlay.refreshPosition();
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
      overlay.setHistory(nextHistory);
      overlay.setSessions(nextSessions);
      overlay.refreshPosition();
    });
  };
  chrome.storage.onChanged.addListener(onStorage);

  const onMessage = (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: LiveSnapshot | null) => void,
  ): void => {
    if (sender.id !== chrome.runtime.id || typeof message !== 'object' || message === null) return;
    const type = (message as { type?: string }).type;
    if (type === 'toggle-hud') persist({ showHud: !settings.showHud });
    if (type === 'pause-run') tracker?.togglePause();
    if (type === 'live-run') sendResponse(tracker?.snapshot() ?? null);
  };
  chrome.runtime.onMessage.addListener(onMessage);

  ctx.onInvalidated(() => {
    window.clearInterval(scanTimer);
    window.clearInterval(uiTimer);
    unsubscribe();
    chrome.storage.onChanged.removeListener(onStorage);
    chrome.runtime.onMessage.removeListener(onMessage);
    tracker?.destroy();
    overlay.destroy();
    window.__fastfingaz = false;
  });
}
