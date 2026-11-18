import { expect, it } from 'vitest';
import { TypingSession } from '../content/typing-session';
import {
  buildHistory,
  buildSeries,
  compressCadence,
  computeStats,
  rollingWpm,
  shouldRecord,
} from '../shared/metrics';
import type { SessionRecord } from '../shared/types';

it('holds the live pace through a long thinking gap', () => {
  const keys = [0, 100, 200, 300, 400, 500];
  expect(rollingWpm(keys, 500, 8000, 2000)).toBe(120);
  expect(rollingWpm(keys, 30_000, 8000, 2000)).toBe(120);
});

it('excludes a manual pause from live and finished timing', () => {
  const session = new TypingSession(0);
  session.noteKey(0);
  session.noteKey(1000);
  session.noteInsert(1000, 50);
  session.pause(2000);
  expect(session.activeMs(12_000, 2000)).toBe(2000);
  session.noteKey(12_000);
  expect(session.isPaused).toBe(false);
  session.noteKey(60_000);
  session.noteInsert(60_000, 50);

  const stats = computeStats(session.finish(60_000, 'a'.repeat(100)), 2000);
  expect(stats).toMatchObject({ manualPauseMs: 10_000, wallMs: 50_000, activeMs: 4000 });
  expect(stats.wpm.think).toBeCloseTo(24);
});

it('records a qualifying prompt and rejects short, pasted or low-signal readings', () => {
  const prompt = { wallMs: 10_000, chars: 40, words: 8, confidence: 0.9, pasteRatio: 0, minChars: 20 };
  expect(shouldRecord(prompt)).toBe(true);
  expect(shouldRecord({ ...prompt, wallMs: 2000 })).toBe(false);
  expect(shouldRecord({ ...prompt, chars: 10, minChars: 0 })).toBe(false);
  expect(shouldRecord({ ...prompt, pasteRatio: 0.5 })).toBe(false);
  expect(shouldRecord({ ...prompt, confidence: 0.4 })).toBe(false);
});

function reading(
  id: string,
  text: string,
  startedAt: number,
  endedAt: number,
  prefilledChars = 0,
): SessionRecord {
  const session = new TypingSession(startedAt, prefilledChars);
  session.noteInsert(startedAt, text.length - prefilledChars);
  return {
    ...computeStats(session.finish(endedAt, text)),
    id,
    v: 1,
    startedAt,
    endedAt,
    host: 'chatgpt.com',
  };
}

it('weights the baseline by time and excludes resumed drafts', () => {
  const short = reading('short', 'a'.repeat(100), 0, 60_000);
  const long = reading('long', 'a'.repeat(300), 60_000, 180_000);
  const draft = reading('draft', 'a'.repeat(140), 180_000, 184_000, 100);
  const history = buildHistory([short, long, draft]);

  expect(draft.wpm.think).toBe(120);
  expect(history.rolling.sessions).toBe(2);
  expect(history.rolling.thinkWpm).toBeCloseTo(26.67);
  expect(history.last?.id).toBe('long');
  expect(history.best.sessionId).toBe('long');
});

it('preserves a personal best after its session has been trimmed', () => {
  const best = reading('best', 'a'.repeat(100), 0, 10_000);
  const slower = reading('slower', 'a'.repeat(100), 10_000, 70_000);
  expect(buildHistory([slower], buildHistory([best])).best).toMatchObject({
    thinkWpm: 120,
    sessionId: 'best',
  });
});

it('keeps long-session cadence from both ends of the receipt', () => {
  const series = buildSeries([0, 120_000, 239_999], 0, 240_000);
  const bars = compressCadence(series, 48);
  expect(bars).toHaveLength(48);
  expect(bars[0]).toBeGreaterThan(0);
  expect(bars[24]).toBeGreaterThan(0);
  expect(bars[47]).toBeGreaterThan(0);
});
