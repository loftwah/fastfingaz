import { describe, expect, it } from 'vitest';
import type { RawSession, SessionRecord } from '../shared/types';
import {
  aggregate,
  buildHistory,
  computeStats,
  countWords,
  dailyBuckets,
  dayKey,
  emptyHistory,
  idleReadout,
  isBestEligible,
  isEligible,
  isNewBest,
  median,
  rollingWpm,
  shouldRecord,
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
    pauseIntervals: [],
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

describe('rollingWpm', () => {
  it('uses the typing span of a young run instead of the full window', () => {
    const keys = [0, 100, 200, 300, 400, 500];
    // Five 100 ms intervals = 120 WPM. An eight-second denominator would
    // have reported 7.5 WPM for the same burst.
    expect(rollingWpm(keys, 500, 8000, 2000)).toBeCloseTo(wpmFrom(5, 500), 5);
  });

  it('uses a full eight-second window once the run is old enough', () => {
    const keys = Array.from({ length: 101 }, (_, i) => i * 100);
    expect(rollingWpm(keys, 10_000, 8000, 2000)).toBeCloseTo(wpmFrom(80, 8000), 5);
  });

  it('skips a long think gap and keeps the typing cadence', () => {
    const keys = Array.from({ length: 21 }, (_, i) => i * 100);
    // The 30 s gap is not typing time. The 2 s of typing before it still is.
    expect(rollingWpm(keys, 32_000, 8000, 2000)).toBeCloseTo(wpmFrom(20, 2000), 5);
  });

  it('does not decay just because the clock advanced', () => {
    const keys = [0, 100, 200, 300, 400, 500];
    expect(rollingWpm(keys, 5000, 8000, 2000)).toBeCloseTo(
      rollingWpm(keys, 500, 8000, 2000),
      5,
    );
  });

  it('removes an explicit manual pause from the window', () => {
    const keys = [0, 100, 200, 300, 10_000, 10_100, 10_200, 10_300, 10_400, 10_500];
    const pauses = [{ start: 400, end: 10_000 }];
    // 800 ms of real typing across the pause, eight intervals.
    expect(rollingWpm(keys, 10_500, 8000, 2000, pauses)).toBeCloseTo(
      wpmFrom(8, 800),
      5,
    );
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

  it('excludes explicit manual pauses from wall and active time', () => {
    const stats = computeStats(
      raw({
        startedAt: 0,
        endedAt: 60_000,
        keyTimes: [0, 1000, 60_000],
        pauseIntervals: [{ start: 2000, end: 12_000 }],
      }),
      2000,
    );
    expect(stats.manualPauseMs).toBe(10_000);
    expect(stats.wallMs).toBe(50_000);
    expect(stats.activeMs).toBe(3000);
    expect(stats.wpm.think).toBeCloseTo(24, 5);
    expect(stats.pauses).toEqual({ count: 1, medianMs: 49_000, longestMs: 49_000 });
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

  it('excludes resumed drafts from best and averages', () => {
    const resumed = record({
      chars: 150,
      insertedChars: 50,
      resumed: true,
      wallMs: 30_000,
      activeMs: 30_000,
      words: 25,
      wpm: { think: 20, flow: 10, peak: 20 },
    });
    expect(isEligible(resumed)).toBe(false);
    expect(aggregate([resumed]).sessions).toBe(0);
  });

  it('weights the average by characters and time, not by session mean', () => {
    const short = record({
      chars: 100,
      insertedChars: 100,
      wallMs: 60_000,
      activeMs: 60_000,
      words: 20,
      wpm: { think: 20, flow: 20, peak: 30 },
    });
    const long = record({
      chars: 300,
      insertedChars: 300,
      wallMs: 120_000,
      activeMs: 120_000,
      words: 60,
      wpm: { think: 50, flow: 50, peak: 70 },
    });
    const stats = aggregate([short, long]);
    // (100 + 300) chars / 5 / 3 minutes = 26.67, not (20 + 50) / 2 = 35.
    expect(stats.thinkWpm).toBeCloseTo(26.666, 2);
    expect(stats.flowWpm).toBeCloseTo(26.666, 2);
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

describe('record gates and eligibility', () => {
  const gate = {
    wallMs: 10_000,
    chars: 40,
    words: 8,
    confidence: 0.9,
    pasteRatio: 0,
    minChars: 20,
  };

  it('records a normal sent prompt', () => {
    expect(shouldRecord(gate)).toBe(true);
  });

  it('rejects tiny, quick, pasted and low-signal runs', () => {
    expect(shouldRecord({ ...gate, wallMs: 2000 })).toBe(false);
    expect(shouldRecord({ ...gate, chars: 10 })).toBe(false);
    expect(shouldRecord({ ...gate, chars: 10, minChars: 0 })).toBe(false);
    expect(shouldRecord({ ...gate, pasteRatio: 0.6 })).toBe(false);
    expect(shouldRecord({ ...gate, confidence: 0.4 })).toBe(false);
    expect(shouldRecord({ ...gate, words: 0 })).toBe(false);
  });

  it('excludes drafts, paste-dominated runs and weak signal from averages', () => {
    expect(isEligible(record())).toBe(true);
    expect(isEligible(record({ resumed: true }))).toBe(false);
    expect(isEligible(record({ pasteRatio: 0.6 }))).toBe(false);
    expect(isEligible(record({ confidence: 0.4 }))).toBe(false);
    expect(isEligible(record({ wallMs: 2000 }))).toBe(false);
  });

  it('allows an IME average only above the signal floor, and a best only above the high bar', () => {
    const approximate = record({ ime: true, confidence: 0.75 });
    expect(isEligible(approximate)).toBe(true);
    expect(isBestEligible(approximate)).toBe(false);
    expect(isBestEligible(record({ ime: true, confidence: 0.9 }))).toBe(true);
  });
});

describe('history', () => {
  function session(
    overrides: Partial<SessionRecord> & { think: number; at: number },
  ): SessionRecord {
    const { think, at, ...rest } = overrides;
    return record({
      startedAt: at,
      endedAt: at + 60_000,
      chars: 100,
      insertedChars: 100,
      wallMs: 60_000,
      activeMs: 60_000,
      words: 20,
      consistency: 80,
      confidence: 0.94,
      pasteRatio: 0,
      resumed: false,
      ime: false,
      wpm: { think, flow: think + 10, peak: think + 20 },
      ...rest,
    });
  }

  it('never lowers a best when a slower run is appended', () => {
    const fast = session({ id: 'fast', think: 70, at: 1_000 });
    const slow = session({ id: 'slow', think: 40, at: 2_000 });
    const history = buildHistory([slow, fast]);
    expect(history.best.thinkWpm).toBe(70);
    expect(history.best.sessionId).toBe('fast');
  });

  it('keeps a previous best even when its session is no longer retained', () => {
    const previous = buildHistory([session({ id: 'old', think: 90, at: 1_000 })]);
    const current = buildHistory([session({ id: 'new', think: 40, at: 2_000 })], previous);
    expect(current.best.thinkWpm).toBe(90);
    expect(current.best.sessionId).toBe('old');
  });

  it('keeps the last eligible run when a newer draft was recorded', () => {
    const normal = session({ id: 'run', think: 60, at: 1_000 });
    const draft = session({ id: 'draft', think: 80, at: 2_000, resumed: true });
    const history = buildHistory([draft, normal]);
    expect(history.last?.id).toBe('run');
    expect(history.totals.recorded).toBe(2);
    expect(history.totals.drafts).toBe(1);
  });

  it('uses a weighted rolling window for the last 20 eligible runs', () => {
    const sessions = Array.from({ length: 25 }, (_, index) =>
      session({
        id: `s${index}`,
        think: 20 + index,
        at: index * 1000,
        chars: 100 + index * 10,
        wallMs: 60_000,
      }),
    );
    const history = buildHistory(sessions);
    expect(history.rolling.sessions).toBe(20);
    expect(history.allTime.sessions).toBe(25);
    // The last 20 sessions are s5..s24, with 150..340 chars.
    const chars = sessions.slice(5).reduce((sum, item) => sum + item.chars, 0);
    const wall = sessions.slice(5).reduce((sum, item) => sum + item.wallMs, 0);
    expect(history.rolling.thinkWpm).toBeCloseTo(wpmFrom(chars, wall), 5);
  });

  it('marks a new best only for an eligible, higher run', () => {
    const previous = buildHistory([session({ id: 'best', think: 90, at: 1_000 })]).best;
    expect(isNewBest(session({ id: 'lower', think: 80, at: 2_000 }), previous)).toBe(false);
    expect(isNewBest(session({ id: 'higher', think: 95, at: 2_000 }), previous)).toBe(true);
    expect(isNewBest(session({ id: 'draft', think: 99, at: 2_000, resumed: true }), previous)).toBe(
      false,
    );
    expect(isNewBest(session({ id: 'ime', think: 99, at: 2_000, ime: true, confidence: 0.75 }), previous)).toBe(
      false,
    );
  });

  it('shows dashes rather than zero when there is no history', () => {
    expect(idleReadout(emptyHistory())).toEqual({ last: null, best: null, avg: null });
    const history = buildHistory([session({ id: 'one', think: 63, at: 1_000 })]);
    // The summary average is weighted from 100 chars / 60s, not copied from wpm.think.
    expect(idleReadout(history)).toEqual({ last: 63, best: 63, avg: 20 });
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
