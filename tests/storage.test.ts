import { afterEach, expect, it, vi } from 'vitest';
import { TypingSession } from '../content/typing-session';
import { STORAGE_KEYS } from '../shared/constants';
import { computeStats } from '../shared/metrics';
import { writeSession } from '../shared/storage';
import type { SessionRecord } from '../shared/types';

function session(id: string, text: string): SessionRecord {
  const typing = new TypingSession(0);
  typing.noteInsert(0, text.length);
  return {
    ...computeStats(typing.finish(5000, text)),
    id,
    v: 1,
    startedAt: 0,
    endedAt: 5000,
    host: 'chatgpt.com',
    text,
  };
}

afterEach(() => vi.unstubAllGlobals());

it('keeps prompt text out of storage by default', async () => {
  const set = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('chrome', { storage: { local: { get: async () => ({}), set } } });
  await writeSession(session('new', 'A qualifying test prompt.'));
  const [saved] = set.mock.lastCall![0][STORAGE_KEYS.sessions];
  expect(saved).toMatchObject({ id: 'new' });
  expect(saved).not.toHaveProperty('text');
});

it('preserves the reading and previously saved text when Chrome storage fills up', async () => {
  const existing = session('old', 'A previously saved prompt.');
  const record = session('new', 'A new prompt that exceeds the remaining storage quota.');
  const set = vi
    .fn()
    .mockRejectedValueOnce(new Error('Resource::kQuotaBytes quota exceeded'))
    .mockResolvedValueOnce(undefined);
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async () => ({
          [STORAGE_KEYS.sessions]: [existing],
          [STORAGE_KEYS.settings]: { storeText: true },
        }),
        set,
      },
    },
  });

  const result = await writeSession(record);
  expect(result.textOmitted).toBe(true);
  const saved: SessionRecord[] = set.mock.lastCall![0][STORAGE_KEYS.sessions];
  expect(saved).toContainEqual(existing);
  const latest = saved.find(({ id }) => id === 'new');
  expect(latest).toMatchObject({ wpm: record.wpm });
  expect(latest).not.toHaveProperty('text');
});

it('reports a general storage failure without retrying as a quota failure', async () => {
  const set = vi.fn().mockRejectedValue(new Error('Storage is unavailable'));
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async () => ({ [STORAGE_KEYS.settings]: { storeText: true } }),
        set,
      },
    },
  });
  await expect(writeSession(session('new', 'A qualifying test prompt.'))).rejects.toThrow(
    'unavailable',
  );
  expect(set).toHaveBeenCalledTimes(1);
});
