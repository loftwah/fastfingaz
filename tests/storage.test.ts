import { afterEach, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../shared/constants';
import { computeStats } from '../shared/metrics';
import { writeSession } from '../shared/storage';
import type { SessionRecord } from '../shared/types';

function session(id: string, text: string): SessionRecord {
  return {
    ...computeStats({
      startedAt: 0,
      endedAt: 5000,
      keyTimes: [],
      insertedChars: text.length,
      deletedChars: 0,
      pastedChars: 0,
      finalText: text,
      prefilledChars: 0,
      ime: false,
      undoCount: 0,
      replacementCount: 0,
      pauseIntervals: [],
    }),
    id,
    v: 1,
    startedAt: 0,
    endedAt: 5000,
    host: 'chatgpt.com',
    text,
  };
}

afterEach(() => vi.unstubAllGlobals());

it.each(['Resource::kQuotaBytes quota exceeded', 'QUOTA_BYTES quota exceeded'])(
  'keeps the reading and previously stored text after %s',
  async (error) => {
    const existing = session('old', 'A previously saved prompt.');
    const record = session('new', 'A new prompt that exceeds the remaining storage quota.');
    const set = vi.fn().mockRejectedValueOnce(new Error(error)).mockResolvedValueOnce(undefined);
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
    expect(result).toMatchObject({ textOmitted: true });
    const saved: SessionRecord[] = set.mock.lastCall![0][STORAGE_KEYS.sessions];
    expect(saved.find(({ id }) => id === 'old')).toEqual(existing);
    expect(saved.find(({ id }) => id === 'new')).not.toHaveProperty('text');
  },
);

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
