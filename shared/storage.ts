import { DEFAULT_SETTINGS, MAX_SESSIONS, STORAGE_KEYS } from './constants';
import { buildHistory, emptyHistory, isNewBest } from './metrics';
import type { HistorySummary, LiveStatus, SessionRecord, Settings } from './types';

function hasStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local;
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
  /** Current held live reading. Optional for snapshots written before 0.3.4. */
  wpm?: number;
  status?: LiveStatus;
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

/** Mutations are serialized in the service worker, across all extension contexts. */
export function writeSettings(patch: Partial<Settings>): Promise<Settings> {
  return serialize(async () => {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.settings);
    const next = { ...DEFAULT_SETTINGS, ...stored[STORAGE_KEYS.settings], ...patch };
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: next });
    return next;
  });
}

export interface SavedSession {
  newBest: boolean;
  firstReading: boolean;
  history: HistorySummary;
  textOmitted: boolean;
}

export function writeSession(record: SessionRecord): Promise<SavedSession> {
  return serialize(async () => {
    const stored = await chrome.storage.local.get([
      STORAGE_KEYS.sessions,
      STORAGE_KEYS.history,
      STORAGE_KEYS.settings,
    ]);
    const saved: SessionRecord[] = Array.isArray(stored[STORAGE_KEYS.sessions])
      ? stored[STORAGE_KEYS.sessions]
      : [];
    const previous: HistorySummary =
      stored[STORAGE_KEYS.history]?.v === 1 ? stored[STORAGE_KEYS.history] : buildHistory(saved);
    const { text, ...metrics } = record;
    const keepText = stored[STORAGE_KEYS.settings]?.storeText === true && text !== undefined;
    const kept = [metrics, ...saved.filter((session) => session.id !== record.id)]
      .sort((a, b) => b.endedAt - a.endedAt)
      .slice(0, MAX_SESSIONS);
    const history = buildHistory(kept, previous);
    const index = keepText ? kept.indexOf(metrics) : -1;
    if (index >= 0) kept[index] = record;
    const changes = { [STORAGE_KEYS.sessions]: kept, [STORAGE_KEYS.history]: history };
    let textOmitted = false;
    try {
      await chrome.storage.local.set(changes);
    } catch (error) {
      if (
        index < 0 ||
        !(error instanceof Error) ||
        (error.name !== 'QuotaExceededError' && !/\b(?:QUOTA_BYTES|kQuotaBytes)\b/.test(error.message))
      ) {
        throw error;
      }
      kept[index] = metrics;
      await chrome.storage.local.set(changes);
      textOmitted = true;
    }
    return {
      newBest: isNewBest(record, previous.best),
      firstReading: previous.totals.recorded === 0,
      history,
      textOmitted,
    };
  });
}

export function clearSavedSessions(): Promise<void> {
  return serialize(async () => {
    await chrome.storage.local.set({
      [STORAGE_KEYS.sessions]: [],
      [STORAGE_KEYS.history]: emptyHistory(),
    });
    try {
      const snapshots = await chrome.storage.session.get(null);
      const keys = Object.keys(snapshots).filter((key) =>
        key === STORAGE_KEYS.live || key.startsWith(`${STORAGE_KEYS.live}:`),
      );
      if (keys.length) await chrome.storage.session.remove(keys);
    } catch {
      // Ephemeral cleanup should not report a failed history deletion.
    }
  });
}

function snapshotKey(tabId: number): string {
  return `${STORAGE_KEYS.live}:${tabId}`;
}

/** The worker keeps text-free snapshots scoped to one tab in trusted storage. */
export function writeLiveSnapshot(
  tabId: number,
  snapshot: LiveSnapshot | null,
  page = '',
): Promise<void> {
  return serialize(async () => {
    const key = snapshotKey(tabId);
    if (snapshot) await chrome.storage.session.set({ [key]: { page, snapshot } });
    else await chrome.storage.session.remove(key);
  });
}

export async function readLiveSnapshot(tabId: number, page: string): Promise<LiveSnapshot | null> {
  const key = snapshotKey(tabId);
  const stored = await chrome.storage.session.get(key);
  const entry = stored[key] as { page: string; snapshot: LiveSnapshot } | undefined;
  if (entry?.page !== page || !Number.isFinite(entry.snapshot?.endedAt)) return null;
  return Date.now() - entry.snapshot.endedAt <= 30 * 60_000 ? entry.snapshot : null;
}

export async function exportAll(): Promise<string> {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.settings,
    STORAGE_KEYS.sessions,
    STORAGE_KEYS.history,
  ]);
  const settings: Settings = { ...DEFAULT_SETTINGS, ...stored[STORAGE_KEYS.settings] };
  const sessions: SessionRecord[] = Array.isArray(stored[STORAGE_KEYS.sessions])
    ? stored[STORAGE_KEYS.sessions]
    : [];
  const history: HistorySummary =
    stored[STORAGE_KEYS.history]?.v === 1 ? stored[STORAGE_KEYS.history] : buildHistory(sessions);
  return JSON.stringify(
    {
      app: 'fastfingaz',
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
    callback({ ...DEFAULT_SETTINGS, ...changes[STORAGE_KEYS.settings].newValue });
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
