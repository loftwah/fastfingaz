import { aggregate, dayKey } from './shared/metrics';
import { loadSessions } from './shared/storage';

const action = chrome.action as typeof chrome.action & {
  setBadgeTextColor?: (details: { color: string }) => Promise<void>;
};

/** The toolbar badge shows today's think WPM. No badge before the first session. */
async function updateBadge(): Promise<void> {
  try {
    const sessions = await loadSessions();
    const today = dayKey(Date.now());
    const stats = aggregate(sessions.filter((session) => dayKey(session.startedAt) === today));
    const text = stats.sessions > 0 ? String(Math.round(stats.thinkWpm)) : '';
    await chrome.action.setBadgeText({ text });
    if (text) {
      await chrome.action.setBadgeBackgroundColor({ color: '#c9f75b' });
      await action.setBadgeTextColor?.({ color: '#0a0b0d' });
    }
  } catch (error) {
    console.warn('[thinktype] badge update failed', error);
  }
}

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

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'toggle-hud') return;
  void (async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'toggle-hud' });
    } catch {
      // Not a ChatGPT tab, or the content script is not ready yet.
    }
  })();
});
