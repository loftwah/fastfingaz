import { defineBackground } from 'wxt/utils/define-background';
import { STORAGE_KEYS } from '../shared/constants';
import { aggregate, dayKey } from '../shared/metrics';
import { loadSessions, loadSettings } from '../shared/storage';

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

  chrome.runtime.onMessage.addListener((message: unknown) => {
    if (
      typeof message === 'object' &&
      message !== null &&
      (message as { type?: string }).type === 'session-saved'
    ) {
      void updateBadge();
    }
    return false;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEYS.settings]) void updateBadge();
  });

  chrome.commands.onCommand.addListener((command) => {
    const type =
      command === 'toggle-hud' ? 'toggle-hud' : command === 'pause-run' ? 'pause-run' : null;
    if (!type) return;
    void (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      try {
        await chrome.tabs.sendMessage(tab.id, { type });
      } catch {
        // Not a ChatGPT tab, or the content script is not ready yet.
      }
    })();
  });
});
