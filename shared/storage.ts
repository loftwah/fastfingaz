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
  const stored = await chrome.storage.local.get(STORAGE_KEYS.settings);
  const value = stored[STORAGE_KEYS.settings] as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...(value ?? {}) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch };
  if (hasStorage()) {
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: next });
  }
  return next;
}

export async function loadSessions(): Promise<SessionRecord[]> {
  if (!hasStorage()) return [];
  const stored = await chrome.storage.local.get(STORAGE_KEYS.sessions);
  const value = stored[STORAGE_KEYS.sessions];
  return Array.isArray(value) ? (value as SessionRecord[]) : [];
}

export async function loadHistory(): Promise<HistorySummary> {
  if (!hasStorage()) return emptyHistory();
  const stored = await chrome.storage.local.get(STORAGE_KEYS.history);
  const value = stored[STORAGE_KEYS.history] as HistorySummary | undefined;
  if (!value || value.v !== 1) {
    // First run after upgrading from 0.1: derive a baseline from whatever
    // sessions are already on disk.
    return buildHistory(await loadSessions());
  }
  return value;
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
  });
}

export function deleteSession(id: string): Promise<void> {
  return serialize(async () => {
    const sessions = (await loadSessions()).filter((session) => session.id !== id);
    await chrome.storage.local.set({
      [STORAGE_KEYS.sessions]: sessions,
      [STORAGE_KEYS.history]: buildHistory(sessions),
    });
  });
}

export async function clearSessions(): Promise<void> {
  await serialize(async () => {
    await chrome.storage.local.set({
      [STORAGE_KEYS.sessions]: [],
      [STORAGE_KEYS.history]: emptyHistory(),
    });
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
  await chrome.storage.session.set({ [STORAGE_KEYS.live]: snapshot });
}

export async function loadLiveSnapshot(): Promise<LiveSnapshot | null> {
  if (!hasSessionStorage()) return null;
  const stored = await chrome.storage.session.get(STORAGE_KEYS.live);
  const value = stored[STORAGE_KEYS.live] as LiveSnapshot | undefined;
  if (!value || !Number.isFinite(value.endedAt)) return null;
  // A snapshot older than 30 minutes is a different session, not a pause.
  if (Date.now() - value.endedAt > 30 * 60_000) return null;
  return value;
}

export async function clearLiveSnapshot(): Promise<void> {
  if (!hasSessionStorage()) return;
  await chrome.storage.session.remove(STORAGE_KEYS.live);
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
