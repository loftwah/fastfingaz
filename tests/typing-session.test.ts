import { describe, expect, it } from 'vitest';
import { TypingSession } from '../content/typing-session';

describe('TypingSession', () => {
  it('records keys and inserts, then produces a raw session', () => {
    const session = new TypingSession(1000);
    session.noteKey(1000);
    session.noteInsert(1010, 1);
    session.noteKey(1120);
    session.noteInsert(1130, 1);
    session.noteDelete(1200, 1);

    const raw = session.finish(5000, 'hi');

    expect(raw.startedAt).toBe(1000);
    expect(raw.endedAt).toBe(5000);
    expect(raw.keyTimes).toEqual([1000, 1120]);
    expect(raw.insertedChars).toBe(2);
    expect(raw.deletedChars).toBe(1);
    expect(raw.finalText).toBe('hi');
  });

  it('creates a key sample for paste-only sessions', () => {
    const session = new TypingSession(500);
    session.noteInsert(510, 40, 'paste');
    const raw = session.finish(3000, 'x'.repeat(40));
    expect(raw.keyTimes).toHaveLength(1);
    expect(raw.pastedChars).toBe(40);
  });

  it('tracks pasted characters separately from typed ones', () => {
    const session = new TypingSession(0);
    session.noteInsert(10, 10);
    session.noteInsert(20, 5);
    session.noteInsert(30, 7, 'paste');
    const raw = session.finish(1000, 'abcdefghij');
    expect(raw.insertedChars).toBe(22);
    expect(raw.pastedChars).toBe(7);
  });

  it('flags IME, undo and replacement events for confidence scoring', () => {
    const session = new TypingSession(0);
    session.noteComposition();
    session.noteUndo();
    session.noteReplacement();
    session.noteInsert(10, 2, 'replacement');

    const raw = session.finish(1000, 'ok');
    expect(raw.ime).toBe(true);
    expect(raw.undoCount).toBe(1);
    expect(raw.replacementCount).toBe(2);
  });

  it('ignores events before the start or after finishing', () => {
    const session = new TypingSession(100);
    session.noteKey(50);
    session.noteInsert(150, -1);
    session.noteDelete(150, 0);
    session.finish(200, '');

    session.noteKey(300);
    session.noteInsert(310, 5);
    const raw = session.finish(400, 'later');

    expect(raw.keyTimes).toEqual([]);
    expect(raw.insertedChars).toBe(0);
  });

  it('records the prefilled draft length', () => {
    const session = new TypingSession(0, 42);
    const raw = session.finish(1000, 'a'.repeat(50));
    expect(raw.prefilledChars).toBe(42);
  });

  it('computes active time with the idle threshold', () => {
    const session = new TypingSession(0);
    session.noteKey(0);
    session.noteKey(1000);
    session.noteKey(10_000);
    expect(session.activeMs(10_000, 2000)).toBe(3000);
  });

  it('freezes the clocks during a manual pause and records the interval', () => {
    const session = new TypingSession(0);
    session.noteKey(0);
    session.noteInsert(100, 20);
    session.pause(1000);
    expect(session.isPaused).toBe(true);
    expect(session.pausedTotal(4000)).toBe(3000);
    expect(session.activeMs(4000, 2000)).toBe(1000);
    session.resume(4000);
    session.noteKey(4100);
    session.noteInsert(4200, 20);

    expect(session.activeMs(5000, 2000)).toBe(2000);
    const raw = session.finish(5000, 'a'.repeat(40));
    expect(raw.pauseIntervals).toEqual([{ start: 1000, end: 4000 }]);
  });

  it('resumes automatically on the next keystroke', () => {
    const session = new TypingSession(0);
    session.noteKey(0);
    session.pause(1000);
    session.noteKey(3000);
    expect(session.isPaused).toBe(false);
    const raw = session.finish(4000, 'ok');
    expect(raw.pauseIntervals).toEqual([{ start: 1000, end: 3000 }]);
  });

  it('closes an open pause when the run is finished', () => {
    const session = new TypingSession(0);
    session.noteKey(0);
    session.pause(1000);
    const raw = session.finish(3500, 'ok');
    expect(raw.pauseIntervals).toEqual([{ start: 1000, end: 3500 }]);
  });
});
