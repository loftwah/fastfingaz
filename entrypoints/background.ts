import { defineBackground } from 'wxt/utils/define-background';
import { STORAGE_KEYS } from '../shared/constants';
import { aggregate, dayKey } from '../shared/metrics';
import type { WorkerMessage, WorkerReply } from '../shared/messages';
import {
  clearSavedSessions,
  loadSessions,
  loadSettings,
  readLiveSnapshot,
  writeLiveSnapshot,
  writeSession,
  writeSettings,
} from '../shared/storage';

const action = chrome.action as typeof chrome.action & {
  setBadgeTextColor?: (details: { color: string }) => Promise<void>;
};

/** The toolbar badge shows today's think WPM. No badge before the first session. */
async function updateBadge(): Promise<void> {
  try {
    const settings = await loadSettings();
    if (!settings.showHud) {
      await chrome.action.setBadgeText({ text: 'OFF' });
      await chrome.action.setBadgeBackgroundColor({ color: '#3a3731' });
      await action.setBadgeTextColor?.({ color: '#f7f5ef' });
      return;
    }
    const sessions = await loadSessions();
    const today = dayKey(Date.now());
    const stats = aggregate(sessions.filter((session) => dayKey(session.startedAt) === today));
    const text = stats.sessions > 0 ? String(Math.round(stats.thinkWpm)) : '';
    await chrome.action.setBadgeText({ text });
    if (text) {
      await chrome.action.setBadgeBackgroundColor({ color: '#ff4d00' });
      await action.setBadgeTextColor?.({ color: '#0a0a0a' });
    }
  } catch (error) {
    console.warn('[fastfingaz] badge update failed', error);
  }
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    void updateBadge();
  });

  chrome.runtime.onStartup.addListener(() => {
    void updateBadge();
  });

  chrome.runtime.onMessage.addListener((message: WorkerMessage, sender, sendResponse) => {
    if (!message || sender.id !== chrome.runtime.id) return false;
    const tabId = sender.tab?.id;
    const fromComposer =
      tabId !== undefined &&
      sender.frameId === 0 &&
      /^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(sender.url ?? '');
    const fromExtensionPage = sender.url?.startsWith(chrome.runtime.getURL('')) ?? false;
    const page = sender.url?.split(/[?#]/, 1)[0] ?? '';
    let job: Promise<unknown>;
    switch (message.type) {
      case 'save-settings':
        if (!fromComposer && !fromExtensionPage) return false;
        job = writeSettings(message.patch);
        break;
      case 'save-session':
        if (!fromComposer) return false;
        job = writeSession(message.record);
        break;
      case 'clear-sessions':
        if (!fromExtensionPage) return false;
        job = clearSavedSessions();
        break;
      case 'save-snapshot':
        if (!fromComposer) return false;
        job = writeLiveSnapshot(tabId, message.snapshot, page);
        break;
      case 'load-snapshot':
        if (!fromComposer) return false;
        job = readLiveSnapshot(tabId, page);
        break;
      default:
        return false;
    }

    void (async () => {
      let response: WorkerReply<unknown>;
      try {
        response = { ok: true, data: await job };
      } catch {
        response = { ok: false };
      }
      sendResponse(response);
    })();
    return true;
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    void writeLiveSnapshot(tabId, null).catch(() => undefined);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes[STORAGE_KEYS.settings] || changes[STORAGE_KEYS.sessions])) {
      void updateBadge();
    }
  });

  chrome.commands.onCommand.addListener((command) => {
    const type =
      command === 'toggle-hud' ? 'toggle-hud' : command === 'pause-run' ? 'pause-run' : null;
    if (!type) return;
    void (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id !== undefined) await chrome.tabs.sendMessage(tab.id, { type });
      } catch {
        // Not a ChatGPT tab, or the content script is not ready yet.
      }
    })();
  });
});
