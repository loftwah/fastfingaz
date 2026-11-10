import { DEFAULT_SETTINGS, MAX_SESSIONS, STORAGE_KEYS } from './constants';
import type { SessionRecord, Settings } from './types';

function hasStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local;
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
    await chrome.storage.local.set({
      [STORAGE_KEYS.sessions]: sessions.slice(0, MAX_SESSIONS),
    });
  });
}

export function deleteSession(id: string): Promise<void> {
  return serialize(async () => {
    const sessions = await loadSessions();
    await chrome.storage.local.set({
      [STORAGE_KEYS.sessions]: sessions.filter((s) => s.id !== id),
    });
  });
}

export async function clearSessions(): Promise<void> {
  await serialize(async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.sessions]: [] });
  });
}

export async function resetEverything(): Promise<void> {
  if (!hasStorage()) return;
  await chrome.storage.local.clear();
}

export async function exportAll(): Promise<string> {
  const [settings, sessions] = await Promise.all([loadSettings(), loadSessions()]);
  return JSON.stringify(
    {
      app: 'thinktype',
      exportedAt: new Date().toISOString(),
      settings,
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
