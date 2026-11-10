import type {
  Aggregate,
  DailyBucket,
  HistoryAverage,
  HistoryBest,
  HistoryLast,
  HistorySummary,
  RawSession,
  SessionRecord,
  SessionStats,
} from './types';

/** The standard "word" used by typing tools: five characters, spaces included. */
export const CHARS_PER_WORD = 5;

/**
 * Recording gates. A session must clear all of these before it is written to
 * history. The user's minimum-character setting is applied on top.
 */
export const MIN_RECORD_WALL_MS = 3000;
export const MIN_RECORD_WORDS = 1;
export const MIN_RECORD_CONFIDENCE = 0.5;
export const MAX_PASTE_RATIO = 0.5;

/** Eligibility is stricter than recording: tiny outliers never move a baseline. */
export const MIN_ELIGIBLE_WALL_MS = 3000;
export const MIN_ELIGIBLE_CHARS = 16;
export const MIN_BEST_CONFIDENCE = 0.55;

/** An IME run can set a best only when the observed-key signal is strong. */
export const IME_BEST_MIN_CONFIDENCE = 0.85;

/** The rolling baseline is the last 20 eligible sessions, not all of them. */
export const ROLLING_WINDOW = 20;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function wpmFrom(chars: number, ms: number): number {
  if (!Number.isFinite(chars) || !Number.isFinite(ms) || ms <= 0) return 0;
  return chars / CHARS_PER_WORD / (ms / 60_000);
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1]! + sorted[mid]!) / 2;
  return sorted[mid]!;
}

/**
 * Wall time, minus the thinking gaps. Each gap is capped rather than dropped so
 * a long pause still costs something without swallowing the session.
 */
export function computeActiveMs(
  keys: number[],
  startedAt: number,
  endedAt: number,
  idleThresholdMs: number,
): number {
  let active = 0;
  let prev = startedAt;
  for (const t of keys) {
    if (t > prev) active += Math.min(t - prev, idleThresholdMs);
    prev = Math.max(prev, t);
  }
  if (endedAt > prev) active += Math.min(endedAt - prev, idleThresholdMs);
  return active;
}

/** Best N-second burst, measured against the real span of the window. */
export function peakWpm(keys: number[], windowMs = 5000, minSpanMs = 1500): number {
  if (keys.length < 2) return 0;
  let best = 0;
  let j = 1;
  for (let i = 0; i < keys.length; i++) {
    j = Math.max(j, i + 1);
    while (j < keys.length && keys[j]! - keys[i]! <= windowMs) j++;
    const span = keys[j - 1]! - keys[i]!;
    const count = j - i;
    if (span >= minSpanMs && count >= 5) best = Math.max(best, wpmFrom(count, span));
  }
  return best;
}

/** Rolling WPM over the last `windowMs`, for the live HUD. */
export function rollingWpm(keys: number[], now: number, windowMs = 5000): number {
  let count = 0;
  for (let i = keys.length - 1; i >= 0; i--) {
    if (keys[i]! < now - windowMs) break;
    count++;
  }
  return wpmFrom(count, windowMs);
}

/**
 * A downsample-friendly WPM series. Each sample is a rolling 4-bucket window,
 * so the sparkline reads as "how fast was I moving here", not raw char counts.
 */
export function buildSeries(
  keys: number[],
  startedAt: number,
  endedAt: number,
  maxPoints = 64,
): number[] {
  const duration = endedAt - startedAt;
  if (!keys.length || duration <= 0) return [];
  const bucketMs = Math.max(250, Math.min(1000, duration / maxPoints));
  const n = Math.min(maxPoints, Math.max(1, Math.ceil(duration / bucketMs)));
  const counts = new Array<number>(n).fill(0);

  for (const t of keys) {
    if (t < startedAt || t > endedAt) continue;
    const idx = Math.min(n - 1, Math.floor((t - startedAt) / bucketMs));
    counts[idx]! += 1;
  }

  const windowBuckets = 4;
  const series: number[] = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let buckets = 0;
    for (let j = Math.max(0, i - windowBuckets + 1); j <= i; j++) {
      sum += counts[j]!;
      buckets++;
    }
    series.push(Math.round(wpmFrom(sum, buckets * bucketMs) * 10) / 10);
  }
  return series;
}

/** Monkeytype-ish consistency: 100 minus the coefficient of variation. */
export function consistencyScore(keys: number[], idleThresholdMs: number): number {
  if (keys.length < 5) return 0;
  const intervals: number[] = [];
  for (let i = 1; i < keys.length; i++) {
    const dt = keys[i]! - keys[i - 1]!;
    if (dt > 0 && dt <= idleThresholdMs) intervals.push(dt);
  }
  if (intervals.length < 4) return 0;
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  if (mean <= 0) return 0;
  const variance =
    intervals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / intervals.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.round(clamp(100 * (1 - cv), 0, 100) * 10) / 10;
}

export function pauseStats(
  keys: number[],
  startedAt: number,
  endedAt: number,
  idleThresholdMs: number,
): { count: number; medianMs: number; longestMs: number } {
  const gaps: number[] = [];
  let prev = startedAt;
  for (const t of keys) {
    if (t - prev > idleThresholdMs) gaps.push(t - prev);
    prev = t;
  }
  if (endedAt - prev > idleThresholdMs) gaps.push(endedAt - prev);
  return {
    count: gaps.length,
    medianMs: Math.round(median(gaps)),
    longestMs: Math.round(gaps.length ? Math.max(...gaps) : 0),
  };
}

export function computeStats(raw: RawSession, idleThresholdMs = 2000): SessionStats {
  const keys = raw.keyTimes.filter(Number.isFinite).sort((a, b) => a - b);
  const pauseIntervals = raw.pauseIntervals ?? [];
  const manualPauseMs = pauseIntervals.reduce(
    (sum, pause) => sum + Math.max(0, pause.end - pause.start),
    0,
  );
  const pausedActiveMs = pauseIntervals.reduce(
    (sum, pause) => sum + Math.min(Math.max(0, pause.end - pause.start), idleThresholdMs),
    0,
  );
  const wallMs = Math.max(0, raw.endedAt - raw.startedAt - manualPauseMs);
  const activeMs = Math.max(
    0,
    computeActiveMs(keys, raw.startedAt, raw.endedAt, idleThresholdMs) - pausedActiveMs,
  );
  const finalText = raw.finalText ?? '';
  const chars = finalText.length;
  const words = countWords(finalText);

  const insertedChars = Math.max(0, raw.insertedChars);
  const deletedChars = Math.max(0, raw.deletedChars);
  const pastedChars = clamp(raw.pastedChars, 0, insertedChars);
  const prefilledChars = clamp(raw.prefilledChars ?? 0, 0, chars);
  const resumed = prefilledChars > 0;
  // A resumed draft's wall clock only covers the text typed after tracking began.
  const charsForWpm = resumed ? insertedChars : chars;

  const correctionRate =
    insertedChars + deletedChars > 0 ? (deletedChars / (insertedChars + deletedChars)) * 100 : 0;

  // How much of the final text can we honestly attribute to keys we saw?
  const netTyped = Math.max(0, insertedChars - deletedChars - pastedChars);
  const attributableChars = Math.max(1, chars - prefilledChars);
  let confidence = chars > 0 ? clamp(netTyped / attributableChars, 0, 1) : 0;
  if (resumed) confidence *= 0.8;
  if (pastedChars > 0) confidence *= 0.55;
  if (raw.ime) confidence *= 0.75;
  if (raw.undoCount > 0) confidence *= 0.92;
  if (raw.replacementCount > 0) confidence *= 0.97;

  return {
    wallMs,
    activeMs,
    chars,
    words,
    wpm: {
      think: wpmFrom(charsForWpm, wallMs),
      flow: wpmFrom(insertedChars, activeMs),
      peak: peakWpm(keys),
    },
    consistency: consistencyScore(keys, idleThresholdMs),
    correctionRate: Math.round(correctionRate * 10) / 10,
    pauses: pauseStats(keys, raw.startedAt, raw.endedAt, idleThresholdMs),
    insertedChars,
    deletedChars,
    pastedChars,
    pasteRatio: pastedChars / Math.max(1, chars),
    confidence: Math.round(clamp(confidence, 0.05, 1) * 100) / 100,
    resumed,
    ime: raw.ime,
    manualPauseMs,
    series: buildSeries(keys, raw.startedAt, raw.endedAt),
  };
}

/** Should this run be written to local history at all? */
export interface RecordGate {
  wallMs: number;
  chars: number;
  words: number;
  confidence: number;
  pasteRatio: number;
  /** The user's minimum message length. */
  minChars: number;
  minWallMs?: number;
}

export function shouldRecord(gate: RecordGate): boolean {
  return (
    Number.isFinite(gate.wallMs) &&
    gate.wallMs >= (gate.minWallMs ?? MIN_RECORD_WALL_MS) &&
    Number.isFinite(gate.chars) &&
    gate.chars >= Math.max(0, gate.minChars) &&
    gate.chars >= MIN_ELIGIBLE_CHARS &&
    gate.words >= MIN_RECORD_WORDS &&
    gate.confidence >= MIN_RECORD_CONFIDENCE &&
    gate.pasteRatio < MAX_PASTE_RATIO
  );
}

/**
 * A session that can move the baseline. Resumed drafts are deliberately kept
 * in the record but excluded here: their wall clock only measures the tail of
 * the message, so they are not comparable with a full run.
 */
export function isEligible(session: SessionRecord): boolean {
  return (
    !session.resumed &&
    session.wallMs >= MIN_ELIGIBLE_WALL_MS &&
    session.chars >= MIN_ELIGIBLE_CHARS &&
    session.words >= MIN_RECORD_WORDS &&
    session.pasteRatio < MAX_PASTE_RATIO &&
    session.confidence >= MIN_RECORD_CONFIDENCE
  );
}

/** A best must clear the normal gate and, for IME, a much higher signal bar. */
export function isBestEligible(session: SessionRecord): boolean {
  if (!isEligible(session)) return false;
  if (session.confidence < MIN_BEST_CONFIDENCE) return false;
  if (session.ime && session.confidence < IME_BEST_MIN_CONFIDENCE) return false;
  return true;
}

export function emptyHistoryAverage(): HistoryAverage {
  return { sessions: 0, chars: 0, wallMs: 0, activeMs: 0, thinkWpm: 0, flowWpm: 0 };
}

export function emptyHistory(): HistorySummary {
  return {
    v: 1,
    updatedAt: 0,
    best: { thinkWpm: 0, flowWpm: 0, peakWpm: 0, sessionId: null, at: null },
    last: null,
    rolling: emptyHistoryAverage(),
    allTime: emptyHistoryAverage(),
    totals: { recorded: 0, drafts: 0 },
  };
}

function summarize(sessions: SessionRecord[]): HistoryAverage {
  if (!sessions.length) return emptyHistoryAverage();
  const sum = (pick: (s: SessionRecord) => number) => sessions.reduce((a, s) => a + pick(s), 0);
  const chars = sum((s) => s.chars);
  const activeMs = sum((s) => s.activeMs);
  const wallMs = sum((s) => s.wallMs);
  return {
    sessions: sessions.length,
    chars,
    wallMs,
    activeMs,
    thinkWpm: wpmFrom(chars, wallMs),
    flowWpm: wpmFrom(sum((s) => s.insertedChars), activeMs),
  };
}

export function aggregate(sessions: SessionRecord[]): Aggregate {
  const eligible = sessions.filter(isEligible);
  if (!eligible.length) {
    return {
      sessions: 0,
      words: 0,
      chars: 0,
      activeMs: 0,
      thinkWpm: 0,
      flowWpm: 0,
      consistency: 0,
    };
  }

  const average = summarize(eligible);
  const sum = (pick: (s: SessionRecord) => number) => eligible.reduce((a, s) => a + pick(s), 0);
  const withConsistency = eligible.filter((s) => s.consistency > 0);
  const consistency = withConsistency.length
    ? withConsistency.reduce((a, s) => a + s.consistency, 0) / withConsistency.length
    : 0;

  return {
    sessions: eligible.length,
    words: sum((s) => s.words),
    chars: average.chars,
    activeMs: average.activeMs,
    thinkWpm: average.thinkWpm,
    flowWpm: average.flowWpm,
    consistency: Math.round(consistency * 10) / 10,
  };
}

function lastFrom(session: SessionRecord): HistoryLast {
  return {
    id: session.id,
    thinkWpm: session.wpm.think,
    flowWpm: session.wpm.flow,
    peakWpm: session.wpm.peak,
    words: session.words,
    wallMs: session.wallMs,
    confidence: session.confidence,
    consistency: session.consistency,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
  };
}

/**
 * Derive the durable baseline. When `previous` is supplied, its best values
 * are merged by maximum, so trimming an old session out of the retained list
 * can never lower a personal best.
 */
export function buildHistory(
  sessions: SessionRecord[],
  previous: HistorySummary = emptyHistory(),
): HistorySummary {
  const ordered = [...sessions].sort((a, b) => b.endedAt - a.endedAt);
  const eligible = ordered.filter(isEligible);
  const bestEligible = eligible.filter(isBestEligible);

  const bestSession = bestEligible.reduce<SessionRecord | null>(
    (best, session) => (!best || session.wpm.think > best.wpm.think ? session : best),
    null,
  );
  const previousBest = previous.best;
  const computedBest: HistoryBest = {
    thinkWpm: bestSession?.wpm.think ?? 0,
    flowWpm: bestEligible.reduce((max, session) => Math.max(max, session.wpm.flow), 0),
    peakWpm: bestEligible.reduce((max, session) => Math.max(max, session.wpm.peak), 0),
    sessionId: bestSession?.id ?? null,
    at: bestSession?.startedAt ?? null,
  };

  const best: HistoryBest =
    computedBest.thinkWpm >= previousBest.thinkWpm
      ? {
          ...computedBest,
          flowWpm: Math.max(computedBest.flowWpm, previousBest.flowWpm),
          peakWpm: Math.max(computedBest.peakWpm, previousBest.peakWpm),
        }
      : {
          ...previousBest,
          flowWpm: Math.max(computedBest.flowWpm, previousBest.flowWpm),
          peakWpm: Math.max(computedBest.peakWpm, previousBest.peakWpm),
        };

  return {
    v: 1,
    updatedAt: Date.now(),
    best,
    last: eligible.length ? lastFrom(eligible[0]!) : null,
    rolling: summarize(eligible.slice(0, ROLLING_WINDOW)),
    allTime: summarize(eligible),
    totals: {
      recorded: ordered.length,
      drafts: ordered.filter((session) => session.resumed).length,
    },
  };
}

export interface IdleReadout {
  last: number | null;
  best: number | null;
  avg: number | null;
}

/** Null means "no reading yet" and renders as a dash, never as zero. */
export function idleReadout(history: HistorySummary): IdleReadout {
  return {
    last: history.last && history.last.thinkWpm > 0 ? history.last.thinkWpm : null,
    best: history.best.thinkWpm > 0 ? history.best.thinkWpm : null,
    avg: history.rolling.sessions > 0 && history.rolling.thinkWpm > 0
      ? history.rolling.thinkWpm
      : null,
  };
}

/** A new best is only possible for a best-eligible run that beats the old one. */
export function isNewBest(session: SessionRecord, previousBest: HistoryBest): boolean {
  return isBestEligible(session) && session.wpm.think > previousBest.thinkWpm;
}

export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function startOfLocalDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Last `days` calendar days, oldest first, including empty days. */
export function dailyBuckets(
  sessions: SessionRecord[],
  days: number,
  now = Date.now(),
): DailyBucket[] {
  const byDay = new Map<string, SessionRecord[]>();
  for (const s of sessions) {
    const key = dayKey(s.startedAt);
    const list = byDay.get(key);
    if (list) list.push(s);
    else byDay.set(key, [s]);
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const buckets: DailyBucket[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dayKey(d.getTime());
    const agg = aggregate(byDay.get(key) ?? []);
    buckets.push({
      key,
      date: d.getTime(),
      sessions: agg.sessions,
      words: agg.words,
      thinkWpm: agg.thinkWpm,
      flowWpm: agg.flowWpm,
      activeMs: agg.activeMs,
    });
  }
  return buckets;
}

/** Share of raw flow speed that survived actual thinking. 0-1. */
export function thinkRatio(flowWpm: number, thinkWpm: number): number {
  if (flowWpm <= 0) return 0;
  return clamp(thinkWpm / flowWpm, 0, 1);
}
