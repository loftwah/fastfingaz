import type { LiveSnapshot, SavedSession } from './storage';
import type { SessionRecord, Settings } from './types';

export type WorkerMessage =
  | { type: 'save-settings'; patch: Partial<Settings> }
  | { type: 'save-session'; record: SessionRecord }
  | { type: 'clear-sessions' }
  | { type: 'save-snapshot'; snapshot: LiveSnapshot | null }
  | { type: 'load-snapshot' };

export type WorkerReply<T> = { ok: true; data: T } | { ok: false };

export async function requestWorker<T = void>(message: WorkerMessage): Promise<T> {
  const reply = (await chrome.runtime.sendMessage(message)) as WorkerReply<T> | undefined;
  if (!reply?.ok) throw new Error('Fastfingaz storage request failed');
  return reply.data;
}

export function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  return requestWorker<Settings>({ type: 'save-settings', patch });
}

export function appendSession(record: SessionRecord): Promise<SavedSession> {
  return requestWorker<SavedSession>({ type: 'save-session', record });
}
