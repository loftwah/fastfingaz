import { MIN_SESSION_MS } from '../shared/constants';
import {
  buildSeries,
  computeStats,
  consistencyScore,
  countWords,
  peakWpm,
  rollingWpm,
  shouldRecord,
  wpmFrom,
} from '../shared/metrics';
import type { LiveSnapshot } from '../shared/storage';
import type { LiveStats, SessionRecord, Settings } from '../shared/types';
import { SCHEMA_VERSION } from '../shared/types';
import { getComposerText, isSendControl, selectionLength } from './composer';
import { TypingSession } from './typing-session';

export const EMPTY_LIVE: LiveStats = {
  active: false,
  wpm: 0,
  thinkWpm: 0,
  flowWpm: 0,
  peakWpm: 0,
  consistency: 0,
  signal: 0,
  words: 0,
  ms: 0,
  activeMs: 0,
  status: 'idle',
  draft: false,
  holding: false,
  series: [],
};

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `tt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface TrackerEvents {
  onSession: (session: SessionRecord) => void;
}

/**
 * DOM adapter around TypingSession. It only listens; it never intercepts or
 * modifies keystrokes.
 */
export class ComposerTracker {
  private session: TypingSession | null = null;
  private pendingSend: { at: number; text: string } | null = null;
  private settings: Settings;
  private ime = false;
  private lastKeyAt = 0;
  private lastNonEmpty = '';
  /** Last measured cadence. Updated only when a new key lands, never by the clock. */
  private heldWpm = 0;
  private heldKeyCount = 0;
  private pollTimer: number | null = null;
  private clearTimer: number | null = null;
  private listeners: Array<() => void> = [];
  private observer: MutationObserver;
  private destroyed = false;

  constructor(
    private readonly el: HTMLElement,
    settings: Settings,
    private readonly events: TrackerEvents,
  ) {
    this.settings = settings;
    this.observer = new MutationObserver(() => this.handleDomChange());
    this.attach();
  }

  updateSettings(settings: Settings): void {
    this.settings = settings;
  }

  liveStats(): LiveStats {
    if (!this.session || this.session.isEnded) {
      const text = this.text();
      return {
        ...EMPTY_LIVE,
        draft: text.trim().length > 0,
        words: countWords(text),
      };
    }

    const paused = this.session.isPaused;
    const now = paused ? (this.session.pausedAt ?? performance.now()) : performance.now();
    const threshold = this.settings.idleThresholdMs;
    const text = getComposerText(this.el);
    const keys = [...this.session.keyTimes];
    const wallMs = Math.max(0, now - this.session.startedAt - this.session.pausedTotal(now));
    const activeMs = Math.max(1, this.session.activeMs(now, threshold));
    const sinceKey = now - this.lastKeyAt;
    const active = !paused && sinceKey <= Math.max(1800, threshold);

    // Recompute the held reading only when a new key has landed. Running this
    // on every 250 ms UI tick let the clock bleed the number down while the
    // user was thinking, which is exactly what the hold is meant to prevent.
    if (!paused && keys.length > this.heldKeyCount) {
      this.heldKeyCount = keys.length;
      this.heldWpm = rollingWpm(
        keys,
        this.lastKeyAt,
        8000,
        threshold,
        this.session.getPauseIntervals(),
      );
    }

    const flow = wpmFrom(this.session.insertedCount, activeMs);

    // A resumed draft measures the characters typed after tracking began.
    const thinkSource =
      this.session.prefilledChars > 0 ? this.session.insertedCount : text.length;
    const think = wpmFrom(thinkSource, Math.max(1, wallMs));
    const attributable = Math.max(1, text.length - this.session.prefilledChars);
    const netTyped = Math.max(
      0,
      this.session.insertedCount - this.session.deletedCount - this.session.pastedCount,
    );

    return {
      active: true,
      wpm: this.heldWpm,
      thinkWpm: think,
      flowWpm: flow,
      peakWpm: peakWpm(keys),
      consistency: consistencyScore(keys, threshold),
      signal: Math.min(1, netTyped / attributable),
      words: countWords(text),
      ms: wallMs,
      activeMs,
      status: paused ? 'paused' : active ? 'typing' : 'thinking',
      draft: false,
      holding: !paused && !active,
      series: buildSeries(keys, this.session.startedAt, now),
    };
  }

  /** Manual pause/resume. Typing resumes automatically. */
  togglePause(): boolean {
    if (!this.session || this.session.isEnded) return false;
    if (this.session.isPaused) this.session.resume(performance.now());
    else this.session.pause(performance.now());
    return true;
  }

  /** A text-free snapshot for chrome.storage.session. */
  snapshot(): LiveSnapshot | null {
    if (!this.session || this.session.isEnded) return null;
    const live = this.liveStats();
    return {
      startedAt: Date.now() - live.ms,
      endedAt: Date.now(),
      wallMs: live.ms,
      words: live.words,
      thinkWpm: live.thinkWpm,
      flowWpm: live.flowWpm,
      peakWpm: live.peakWpm,
      consistency: live.consistency,
      series: live.series,
    };
  }

  destroy(): void {
    this.destroyed = true;
    this.observer.disconnect();
    this.clearTimers();
    for (const remove of this.listeners) remove();
    this.listeners = [];
  }

  private attach(): void {
    const keydown = (event: Event) => this.handleKeyDown(event as KeyboardEvent);
    const beforeinput = (event: Event) => this.handleBeforeInput(event as InputEvent);
    const paste = (event: Event) => this.handlePaste(event as ClipboardEvent);
    const input = () => this.handleDomChange();
    const compositionStart = () => {
      this.ime = true;
      this.session?.noteComposition();
    };
    const compositionEnd = () => {
      this.ime = false;
    };
    const sendClick = (event: Event) => {
      if (isSendControl(event.target)) this.armSend(performance.now());
    };

    this.el.addEventListener('keydown', keydown, true);
    this.el.addEventListener('beforeinput', beforeinput, true);
    this.el.addEventListener('paste', paste, true);
    this.el.addEventListener('input', input, true);
    this.el.addEventListener('compositionstart', compositionStart, true);
    this.el.addEventListener('compositionend', compositionEnd, true);
    document.addEventListener('click', sendClick, true);

    this.listeners.push(
      () => this.el.removeEventListener('keydown', keydown, true),
      () => this.el.removeEventListener('beforeinput', beforeinput, true),
      () => this.el.removeEventListener('paste', paste, true),
      () => this.el.removeEventListener('input', input, true),
      () => this.el.removeEventListener('compositionstart', compositionStart, true),
      () => this.el.removeEventListener('compositionend', compositionEnd, true),
      () => document.removeEventListener('click', sendClick, true),
    );

    this.observer.observe(this.el, { subtree: true, childList: true, characterData: true });
  }

  private text(): string {
    return getComposerText(this.el);
  }

  private isEmpty(): boolean {
    return this.text().trim() === '';
  }

  /** Only start on a genuinely empty composer: editing a saved draft is not a run. */
  private begin(now: number): boolean {
    if (this.session) return true;
    const text = this.text();
    this.session = new TypingSession(now, text.length);
    this.ime = false;
    this.lastNonEmpty = text.trim() ? text : '';
    this.lastKeyAt = now;
    this.heldWpm = 0;
    this.heldKeyCount = 0;
    return true;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.destroyed || event.isComposing || this.ime) return;

    const now = performance.now();
    const key = event.key;
    const printable =
      key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey && !event.isComposing;
    const editing = printable || key === 'Backspace' || key === 'Delete';

    if (editing) {
      if (!this.session && !this.begin(now)) return;
      this.session?.noteKey(now);
      this.lastKeyAt = now;
    }

    if (key === 'Enter' && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey) {
      this.armSend(now);
    }
  }

  private handleBeforeInput(event: InputEvent): void {
    if (this.destroyed) return;
    const type = event.inputType || '';
    const now = performance.now();
    const data = event.data ?? '';

    if (type.startsWith('insert') && !type.startsWith('insertFrom')) {
      if (!this.session && !this.begin(now)) return;
      if (type === 'insertCompositionText') {
        this.session?.noteComposition();
      }
      const chars = data.length || 1;
      this.session?.noteInsert(
        now,
        chars,
        type === 'insertReplacementText' ? 'replacement' : 'type',
      );
      this.lastKeyAt = now;
      return;
    }

    if (type === 'insertFromDrop' || type === 'insertFromYank') {
      if (!this.session && !this.begin(now)) return;
      this.session?.noteInsert(now, data.length || 1, 'paste');
      this.lastKeyAt = now;
      return;
    }

    if (type.startsWith('delete')) {
      if (!this.session) return;
      this.session.noteDelete(now, Math.max(1, selectionLength(this.el)));
      this.lastKeyAt = now;
      return;
    }

    if (type === 'historyUndo' || type === 'historyRedo') {
      this.session?.noteUndo();
    }
  }

  private handlePaste(event: ClipboardEvent): void {
    if (this.destroyed) return;
    const text = event.clipboardData?.getData('text') ?? '';
    if (!text) return;
    const now = performance.now();
    if (!this.session && !this.begin(now)) return;
    this.session?.noteInsert(now, text.length, 'paste');
    this.lastKeyAt = now;
  }

  private handleDomChange(): void {
    if (this.destroyed) return;
    const text = this.text();
    if (text.trim()) {
      this.lastNonEmpty = text;
      if (this.clearTimer) {
        window.clearTimeout(this.clearTimer);
        this.clearTimer = null;
      }
    }

    if (this.pendingSend && !text.trim()) {
      this.finalize();
      return;
    }

    if (!text.trim() && this.session && !this.pendingSend) {
      if (this.clearTimer) window.clearTimeout(this.clearTimer);
      this.clearTimer = window.setTimeout(() => {
        if (!this.pendingSend && this.isEmpty()) this.reset();
      }, 1200);
    }
  }

  private armSend(at: number): void {
    if (!this.session) return;
    const live = this.text();
    const text = live.trim() ? live : this.lastNonEmpty;
    if (!text.trim()) return;
    this.pendingSend = { at, text };
    this.pollForSend(at);
  }

  private pollForSend(armedAt: number): void {
    if (this.pollTimer) window.clearTimeout(this.pollTimer);
    const tick = () => {
      const pending = this.pendingSend;
      if (!pending || pending.at !== armedAt) return;
      if (!this.text().trim()) {
        this.finalize();
        return;
      }
      if (performance.now() - armedAt > 4000) {
        this.pendingSend = null;
        return;
      }
      this.pollTimer = window.setTimeout(tick, 50);
    };
    this.pollTimer = window.setTimeout(tick, 50);
  }

  private finalize(): void {
    const session = this.session;
    const pending = this.pendingSend;
    if (!session || !pending) return;

    const raw = session.finish(pending.at, pending.text);
    this.session = null;
    this.pendingSend = null;
    this.lastNonEmpty = '';
    this.heldWpm = 0;
    this.heldKeyCount = 0;
    this.clearTimers();

    const stats = computeStats(raw, this.settings.idleThresholdMs);
    if (
      !shouldRecord({
        wallMs: stats.wallMs,
        chars: stats.chars,
        words: stats.words,
        confidence: stats.confidence,
        pasteRatio: stats.pasteRatio,
        minChars: this.settings.minSessionChars,
        minWallMs: MIN_SESSION_MS,
      })
    ) {
      return;
    }

    const endedAt = Date.now();
    const record: SessionRecord = {
      ...stats,
      id: makeId(),
      v: SCHEMA_VERSION,
      startedAt: endedAt - stats.wallMs,
      endedAt,
      host: location.host,
      ...(this.settings.storeText ? { text: pending.text } : {}),
    };

    this.events.onSession(record);
  }

  private reset(): void {
    this.session = null;
    this.pendingSend = null;
    this.lastNonEmpty = '';
    this.heldWpm = 0;
    this.heldKeyCount = 0;
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.pollTimer) {
      window.clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.clearTimer) {
      window.clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
  }
}
