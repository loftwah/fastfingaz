import { DEFAULT_SETTINGS, MAX_SESSIONS, STORAGE_KEYS } from './constants';
import { buildHistory, emptyHistory } from './metrics';
import type { HistorySummary, SessionRecord, Settings } from './types';

function hasStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local;
}

function hasSessionStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.session;
}

export interface LiveSnapshot {
  startedAt: number;
  endedAt: number;
  wallMs: number;
  words: number;
  thinkWpm: number;
  flowWpm: number;
  peakWpm: number;
  consistency: number;
  series: number[];
}

export async function loadSettings(): Promise<Settings> {
  if (!hasStorage()) return { ...DEFAULT_SETTINGS };
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.settings);
    const value = stored[STORAGE_KEYS.settings] as Partial<Settings> | undefined;
    return { ...DEFAULT_SETTINGS, ...(value ?? {}) };
  } catch {
    // Some content-script contexts can be denied storage. Keep the instrument
    // usable in-session with defaults rather than failing to mount.
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch };
  if (hasStorage()) {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.settings]: next });
    } catch {
      // In-session settings still work; persistence is best-effort.
    }
  }
  return next;
}

export async function loadSessions(): Promise<SessionRecord[]> {
  if (!hasStorage()) return [];
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.sessions);
    const value = stored[STORAGE_KEYS.sessions];
    return Array.isArray(value) ? (value as SessionRecord[]) : [];
  } catch {
    return [];
  }
}

export async function loadHistory(): Promise<HistorySummary> {
  if (!hasStorage()) return emptyHistory();
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.history);
    const value = stored[STORAGE_KEYS.history] as HistorySummary | undefined;
    if (!value || value.v !== 1) {
      // First run after upgrading from 0.1: derive a baseline from whatever
      // sessions are already on disk.
      return buildHistory(await loadSessions());
    }
    return value;
  } catch {
    return emptyHistory();
  }
}

let writeQueue: Promise<unknown> = Promise.resolve();

function serialize<T>(job: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(job, job);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function appendSession(record: SessionRecord): Promise<void> {
  return serialize(async () => {
    if (!hasStorage()) return;
    try {
      const sessions = await loadSessions();
      sessions.unshift(record);
      sessions.sort((a, b) => b.endedAt - a.endedAt);
      const kept = sessions.slice(0, MAX_SESSIONS);
      // Merge with the previous summary so a best that falls out of the retained
      // list is still remembered.
      const previous = await loadHistory();
      await chrome.storage.local.set({
        [STORAGE_KEYS.sessions]: kept,
        [STORAGE_KEYS.history]: buildHistory(kept, previous),
      });
    } catch {
      // The receipt still prints; persistence is best-effort.
    }
  });
}

export function deleteSession(id: string): Promise<void> {
  return serialize(async () => {
    if (!hasStorage()) return;
    try {
      const sessions = (await loadSessions()).filter((session) => session.id !== id);
      await chrome.storage.local.set({
        [STORAGE_KEYS.sessions]: sessions,
        [STORAGE_KEYS.history]: buildHistory(sessions),
      });
    } catch {
      // Best-effort.
    }
  });
}

export async function clearSessions(): Promise<void> {
  await serialize(async () => {
    if (!hasStorage()) return;
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.sessions]: [],
        [STORAGE_KEYS.history]: emptyHistory(),
      });
    } catch {
      // Best-effort.
    }
    await clearLiveSnapshot();
  });
}

export async function resetEverything(): Promise<void> {
  if (!hasStorage()) return;
  await chrome.storage.local.clear();
  await clearLiveSnapshot();
}

/** In-progress metrics live in session storage: no prompt text, cleared on reload. */
export async function saveLiveSnapshot(snapshot: LiveSnapshot): Promise<void> {
  if (!hasSessionStorage()) return;
  try {
    await chrome.storage.session.set({ [STORAGE_KEYS.live]: snapshot });
  } catch {
    // Session storage is optional.
  }
}

export async function loadLiveSnapshot(): Promise<LiveSnapshot | null> {
  if (!hasSessionStorage()) return null;
  try {
    const stored = await chrome.storage.session.get(STORAGE_KEYS.live);
    const value = stored[STORAGE_KEYS.live] as LiveSnapshot | undefined;
    if (!value || !Number.isFinite(value.endedAt)) return null;
    // A snapshot older than 30 minutes is a different session, not a pause.
    if (Date.now() - value.endedAt > 30 * 60_000) return null;
    return value;
  } catch {
    return null;
  }
}

export async function clearLiveSnapshot(): Promise<void> {
  if (!hasSessionStorage()) return;
  try {
    await chrome.storage.session.remove(STORAGE_KEYS.live);
  } catch {
    // Session storage is optional.
  }
}

export async function exportAll(): Promise<string> {
  const [settings, sessions, history] = await Promise.all([
    loadSettings(),
    loadSessions(),
    loadHistory(),
  ]);
  return JSON.stringify(
    {
      app: 'thinktype',
      exportedAt: new Date().toISOString(),
      settings,
      history,
      sessions,
    },
    null,
    2,
  );
}

/** Subscribe to setting changes. Returns an unsubscribe function. */
export function onSettingsChanged(callback: (settings: Settings) => void): () => void {
  if (!hasStorage() || !chrome.storage.onChanged) return () => undefined;
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== 'local' || !changes[STORAGE_KEYS.settings]) return;
    void loadSettings().then(callback);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
