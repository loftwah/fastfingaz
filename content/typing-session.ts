import { computeActiveMs } from '../shared/metrics';
import type { RawSession } from '../shared/types';

export type InsertSource = 'type' | 'paste' | 'replacement';

/**
 * The measurement state machine. Deliberately DOM-free so it can be tested
 * without a browser.
 */
export class TypingSession {
  readonly startedAt: number;
  readonly prefilledChars: number;
  private keys: number[] = [];
  private insertedChars = 0;
  private deletedChars = 0;
  private pastedChars = 0;
  private ime = false;
  private undoCount = 0;
  private replacementCount = 0;
  private ended = false;
  private pauseStartedAt: number | null = null;
  private pauseIntervals: Array<{ start: number; end: number }> = [];

  constructor(startedAt: number, prefilledChars = 0) {
    this.startedAt = startedAt;
    this.prefilledChars = Math.max(0, prefilledChars);
  }

  get isEnded(): boolean {
    return this.ended;
  }

  get isPaused(): boolean {
    return this.pauseStartedAt !== null;
  }

  get pausedAt(): number | null {
    return this.pauseStartedAt;
  }

  /** Freeze the measurement clocks until `resume` or the next keystroke. */
  pause(timestamp: number): void {
    if (this.ended || this.pauseStartedAt !== null) return;
    this.pauseStartedAt = timestamp;
  }

  resume(timestamp: number): void {
    if (this.pauseStartedAt === null) return;
    const start = this.pauseStartedAt;
    this.pauseIntervals.push({ start, end: Math.max(start, timestamp) });
    this.pauseStartedAt = null;
  }

  pausedTotal(now: number): number {
    const completed = this.pauseIntervals.reduce((sum, pause) => sum + (pause.end - pause.start), 0);
    const current = this.pauseStartedAt === null ? 0 : Math.max(0, now - this.pauseStartedAt);
    return completed + current;
  }

  private pausedActiveTotal(now: number, idleThresholdMs: number): number {
    const sum = (pause: { start: number; end: number }) =>
      Math.min(Math.max(0, pause.end - pause.start), idleThresholdMs);
    const completed = this.pauseIntervals.reduce((total, pause) => total + sum(pause), 0);
    const current =
      this.pauseStartedAt === null ? 0 : Math.min(Math.max(0, now - this.pauseStartedAt), idleThresholdMs);
    return completed + current;
  }

  get keyTimes(): readonly number[] {
    return this.keys;
  }

  get insertedCount(): number {
    return this.insertedChars;
  }

  get deletedCount(): number {
    return this.deletedChars;
  }

  get pastedCount(): number {
    return this.pastedChars;
  }

  noteKey(timestamp: number): void {
    if (this.ended || !Number.isFinite(timestamp) || timestamp < this.startedAt) return;
    this.resume(timestamp);
    this.keys.push(timestamp);
  }

  noteInsert(timestamp: number, chars: number, source: InsertSource = 'type'): void {
    if (this.ended || !Number.isFinite(chars) || chars <= 0) return;
    this.resume(timestamp);
    this.insertedChars += chars;
    if (source === 'paste') this.pastedChars += chars;
    if (source === 'replacement') this.replacementCount += 1;
    // A paste can begin a session without any keydown at all.
    if (this.keys.length === 0) this.noteKey(timestamp);
  }

  noteDelete(_timestamp: number, chars: number): void {
    if (this.ended || !Number.isFinite(chars) || chars <= 0) return;
    this.deletedChars += chars;
  }

  noteComposition(): void {
    this.ime = true;
  }

  noteUndo(): void {
    this.undoCount += 1;
  }

  noteReplacement(): void {
    this.replacementCount += 1;
  }

  activeMs(now: number, idleThresholdMs: number): number {
    return Math.max(
      0,
      computeActiveMs(this.keys, this.startedAt, now, idleThresholdMs) -
        this.pausedActiveTotal(now, idleThresholdMs),
    );
  }

  finish(endedAt: number, finalText: string): RawSession {
    if (this.pauseStartedAt !== null) this.resume(endedAt);
    this.ended = true;
    return {
      startedAt: this.startedAt,
      endedAt,
      keyTimes: [...this.keys],
      insertedChars: this.insertedChars,
      deletedChars: this.deletedChars,
      pastedChars: this.pastedChars,
      finalText,
      prefilledChars: this.prefilledChars,
      ime: this.ime,
      undoCount: this.undoCount,
      replacementCount: this.replacementCount,
      pauseIntervals: [...this.pauseIntervals],
    };
  }
}
