import { describe, expect, it } from 'vitest';
import type { RawSession, SessionRecord } from '../shared/types';
import {
  aggregate,
  computeStats,
  countWords,
  dailyBuckets,
  dayKey,
  isEligible,
  median,
  thinkRatio,
  wpmFrom,
} from '../shared/metrics';

function raw(overrides: Partial<RawSession> = {}): RawSession {
  return {
    startedAt: 0,
    endedAt: 60_000,
    keyTimes: [],
    insertedChars: 100,
    deletedChars: 0,
    pastedChars: 0,
    finalText: 'a'.repeat(100),
    prefilledChars: 0,
    ime: false,
    undoCount: 0,
    replacementCount: 0,
    ...overrides,
  };
}

function record(overrides: Partial<SessionRecord> = {}): SessionRecord {
  const base = computeStats(raw({ keyTimes: [0, 500, 1000] }));
  return {
    ...base,
    id: 'test',
    v: 1,
    startedAt: Date.now() - 60_000,
    endedAt: Date.now(),
    host: 'chatgpt.com',
    ...overrides,
  };
}

describe('wpmFrom', () => {
  it('uses the standard five-character word', () => {
    expect(wpmFrom(100, 60_000)).toBe(20);
    expect(wpmFrom(250, 60_000)).toBe(50);
    expect(wpmFrom(100, 0)).toBe(0);
  });
});

describe('countWords / median', () => {
  it('counts whitespace-delimited words', () => {
    expect(countWords('  one two\nthree  ')).toBe(3);
    expect(countWords('')).toBe(0);
  });

  it('handles even and odd medians', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe('computeStats', () => {
  it('separates finished-thought speed from hands-on speed', () => {
    const stats = computeStats(raw({ keyTimes: [0, 500, 1000] }));

    // 100 chars in 60s of wall time.
    expect(stats.wpm.think).toBeCloseTo(20, 5);
    // Flow uses inserted chars over active time, so verify the relationship.
    expect(stats.wpm.flow).toBeCloseTo(wpmFrom(100, stats.activeMs), 5);
    expect(stats.activeMs).toBeLessThan(stats.wallMs);
    expect(stats.chars).toBe(100);
  });

  it('clamps thinking gaps when computing active time', () => {
    const stats = computeStats(
      raw({ startedAt: 0, endedAt: 10_000, keyTimes: [0, 1000, 10_000] }),
      2000,
    );
    // 1s + capped 2s + no trailing gap
    expect(stats.activeMs).toBe(3000);
  });

  it('counts pauses longer than the threshold', () => {
    const stats = computeStats(
      raw({ startedAt: 0, endedAt: 5200, keyTimes: [0, 100, 200, 5200], finalText: 'hello world' }),
      2000,
    );
    expect(stats.pauses.count).toBe(1);
    expect(stats.pauses.longestMs).toBe(5000);
    expect(stats.pauses.medianMs).toBe(5000);
  });

  it('scores an even rhythm at 100 consistency', () => {
    const keys = Array.from({ length: 21 }, (_, index) => index * 100);
    const stats = computeStats(raw({ startedAt: 0, endedAt: 2000, keyTimes: keys }));
    expect(stats.consistency).toBe(100);
  });

  it('finds a peak burst', () => {
    const keys = Array.from({ length: 21 }, (_, index) => index * 100);
    const stats = computeStats(raw({ startedAt: 0, endedAt: 2000, keyTimes: keys }));
    // 21 keys over a 2s span = (21 / 5) / (2 / 60) = 126 wpm
    expect(stats.wpm.peak).toBeGreaterThan(120);
    expect(stats.wpm.peak).toBeLessThan(132);
  });

  it('reports a correction rate from edits', () => {
    const stats = computeStats(raw({ insertedChars: 100, deletedChars: 10 }));
    expect(stats.correctionRate).toBeCloseTo((10 / 110) * 100, 1);
  });

  it('drops confidence when text was pasted', () => {
    const stats = computeStats(
      raw({ insertedChars: 100, pastedChars: 100, finalText: 'a'.repeat(100) }),
    );
    expect(stats.pasteRatio).toBe(1);
    expect(stats.confidence).toBeLessThan(0.2);
    expect(isEligible(record({ pasteRatio: 1 }))).toBe(false);
  });

  it('reduces confidence for input methods and undo', () => {
    const clean = computeStats(raw({}));
    const messy = computeStats(raw({ ime: true, undoCount: 2, replacementCount: 1 }));
    expect(messy.confidence).toBeLessThan(clean.confidence);
  });

  it('measures only the typed portion when resuming a draft', () => {
    const stats = computeStats(
      raw({
        startedAt: 0,
        endedAt: 30_000,
        keyTimes: [0, 1000, 2000],
        prefilledChars: 100,
        finalText: 'a'.repeat(150),
        insertedChars: 50,
      }),
    );
    expect(stats.resumed).toBe(true);
    expect(stats.chars).toBe(150);
    // 50 characters over 30 seconds = 20 WPM.
    expect(stats.wpm.think).toBeCloseTo(20, 5);
    expect(stats.confidence).toBeLessThan(0.95);
  });

  it('builds a bounded, non-negative series', () => {
    const keys = Array.from({ length: 200 }, (_, index) => index * 300);
    const stats = computeStats(raw({ startedAt: 0, endedAt: 60_000, keyTimes: keys }));
    expect(stats.series.length).toBeGreaterThan(2);
    expect(stats.series.length).toBeLessThanOrEqual(64);
    expect(stats.series.every((value) => value >= 0)).toBe(true);
  });
});

describe('aggregate', () => {
  it('weights by measured time and excludes paste-dominated runs', () => {
    const a = record({
      chars: 100,
      insertedChars: 100,
      wallMs: 60_000,
      activeMs: 20_000,
      words: 20,
      wpm: { think: 20, flow: 60, peak: 70 },
      consistency: 80,
    });
    const pasted = record({ pasteRatio: 1, chars: 200, words: 40 });

    const stats = aggregate([a, pasted]);
    expect(stats.sessions).toBe(1);
    expect(stats.thinkWpm).toBeCloseTo(20, 5);
    expect(stats.flowWpm).toBeCloseTo(60, 5);
    expect(stats.words).toBe(20);
    expect(stats.consistency).toBe(80);
  });

  it('uses the typed portion for resumed drafts in aggregates', () => {
    const resumed = record({
      chars: 150,
      insertedChars: 50,
      resumed: true,
      wallMs: 30_000,
      activeMs: 30_000,
      words: 25,
      wpm: { think: 20, flow: 10, peak: 20 },
    });
    const stats = aggregate([resumed]);
    expect(stats.thinkWpm).toBeCloseTo(20, 5);
  });

  it('returns zeros with no sessions', () => {
    expect(aggregate([])).toEqual({
      sessions: 0,
      words: 0,
      chars: 0,
      activeMs: 0,
      thinkWpm: 0,
      flowWpm: 0,
      consistency: 0,
    });
  });
});

describe('calendar buckets', () => {
  it('keys days in local time', () => {
    const noon = new Date(2026, 10, 10, 12, 0, 0).getTime();
    expect(dayKey(noon)).toBe('2026-11-10');
  });

  it('returns the requested window, oldest first, ending today', () => {
    const now = new Date(2026, 10, 10, 12, 0, 0).getTime();
    const buckets = dailyBuckets([], 14, now);
    expect(buckets).toHaveLength(14);
    expect(buckets[0]!.key).toBe('2026-10-28');
    expect(buckets[13]!.key).toBe('2026-11-10');
    expect(buckets.every((bucket) => bucket.sessions === 0)).toBe(true);
  });

  it('places sessions in their local day', () => {
    const now = new Date(2026, 10, 10, 12, 0, 0).getTime();
    const today = record({ startedAt: new Date(2026, 10, 10, 9, 0, 0).getTime() });
    const buckets = dailyBuckets([today], 3, now);
    expect(buckets[2]!.sessions).toBe(1);
    expect(buckets[2]!.words).toBe(today.words);
  });
});

describe('thinkRatio', () => {
  it('is the share of flow speed that survived thinking', () => {
    expect(thinkRatio(80, 40)).toBe(0.5);
    expect(thinkRatio(0, 40)).toBe(0);
    expect(thinkRatio(40, 80)).toBe(1);
  });
});
