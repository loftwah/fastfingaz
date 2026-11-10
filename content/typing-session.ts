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

  constructor(startedAt: number, prefilledChars = 0) {
    this.startedAt = startedAt;
    this.prefilledChars = Math.max(0, prefilledChars);
  }

  get isEnded(): boolean {
    return this.ended;
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
    this.keys.push(timestamp);
  }

  noteInsert(timestamp: number, chars: number, source: InsertSource = 'type'): void {
    if (this.ended || !Number.isFinite(chars) || chars <= 0) return;
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
    return computeActiveMs(this.keys, this.startedAt, now, idleThresholdMs);
  }

  finish(endedAt: number, finalText: string): RawSession {
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
    };
  }
}
