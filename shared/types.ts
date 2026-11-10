/**
 * Thinktype data model.
 *
 * Everything here is intentionally plain JSON: it goes into chrome.storage.local,
 * can be exported, and never needs a server.
 */

export const SCHEMA_VERSION = 1;

export interface Settings {
  /** Show the floating HUD on ChatGPT. Tracking continues when hidden. */
  showHud: boolean;
  /** HUD rendered as the little orb instead of the full card. */
  hudCollapsed: boolean;
  /** Last dragged position, in CSS pixels from the viewport's top-left. */
  hudPos: { x: number; y: number } | null;
  /** Gaps longer than this are treated as thinking, not typing. */
  idleThresholdMs: number;
  /** Sessions shorter than this are discarded. */
  minSessionChars: number;
  /** Off by default. When on, the composed prompt is stored locally. */
  storeText: boolean;
}

/** Everything measured about one composed prompt. */
export interface SessionStats {
  /** First keystroke to send. Includes thinking time. */
  wallMs: number;
  /** Wall time with gaps over the idle threshold clamped. "Hands-on" time. */
  activeMs: number;
  /** Characters in the final, sent message. */
  chars: number;
  /** Whitespace-delimited words in the final message. */
  words: number;
  wpm: {
    /** Finished thought: final chars over wall time. */
    think: number;
    /** Typing cadence: inserted chars over active time. */
    flow: number;
    /** Best 5s burst. */
    peak: number;
  };
  /** 0-100, rhythm steadiness from inter-key intervals. */
  consistency: number;
  /** Deleted chars as a percentage of all edit keystrokes. */
  correctionRate: number;
  pauses: {
    count: number;
    medianMs: number;
    longestMs: number;
  };
  insertedChars: number;
  deletedChars: number;
  pastedChars: number;
  /** pastedChars / max(1, chars). Above ~0.5 the run is not a typing sample. */
  pasteRatio: number;
  /** 0-1 estimate of how much of the final text is attributable to observed keys. */
  confidence: number;
  /** True when the session resumed text that already existed in the composer. */
  resumed: boolean;
  ime: boolean;
  /** Rolling WPM samples for sparklines. Downsampled. */
  series: number[];
}

export interface SessionRecord extends SessionStats {
  id: string;
  v: typeof SCHEMA_VERSION;
  /** Epoch milliseconds. */
  startedAt: number;
  endedAt: number;
  host: string;
  /** Only present when settings.storeText is on. */
  text?: string;
}

/** Raw event data handed to the metrics engine. */
export interface RawSession {
  startedAt: number;
  endedAt: number;
  /** performance.now() timestamps for editing keys. */
  keyTimes: number[];
  insertedChars: number;
  deletedChars: number;
  pastedChars: number;
  finalText: string;
  /** Text already in the composer when tracking began (a resumed draft). */
  prefilledChars: number;
  ime: boolean;
  undoCount: number;
  replacementCount: number;
}

export interface DailyBucket {
  key: string;
  /** Local midnight, epoch ms. */
  date: number;
  sessions: number;
  words: number;
  thinkWpm: number;
  flowWpm: number;
  activeMs: number;
}

export interface Aggregate {
  /** Number of eligible sessions (paste-dominated runs excluded). */
  sessions: number;
  words: number;
  chars: number;
  activeMs: number;
  thinkWpm: number;
  flowWpm: number;
  consistency: number;
}

export type LiveStatus = 'idle' | 'typing' | 'thinking';

export interface LiveStats {
  active: boolean;
  wpm: number;
  thinkWpm: number;
  flowWpm: number;
  words: number;
  ms: number;
  status: LiveStatus;
  /** A draft exists but tracking has not started yet. */
  draft: boolean;
  series: number[];
}
