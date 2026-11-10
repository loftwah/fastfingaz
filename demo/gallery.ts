import { FONT_FACE_CSS } from '../shared/brand';
import { Overlay } from '../content/overlay';
import { buildHistory, emptyHistory } from '../shared/metrics';
import type { HistorySummary, LiveStats, SessionRecord } from '../shared/types';

const SERIES = [
  52, 58, 64, 71, 76, 82, 88, 91, 86, 79, 72, 68, 74, 81, 87, 92, 95, 90, 84, 78, 70, 64, 58, 66,
  73, 80, 86, 90, 93, 88, 82, 77, 71, 65, 60, 68, 75, 83, 89, 92, 87, 81, 74, 69, 63, 58, 66, 72,
];

const STARTED = new Date(2026, 10, 10, 10, 32, 0).getTime();

const SESSION: SessionRecord = {
  id: 'gallery-session',
  v: 1,
  startedAt: STARTED,
  endedAt: STARTED + 252_000,
  host: 'chatgpt.com',
  wallMs: 252_000,
  activeMs: 198_000,
  chars: 1300,
  words: 212,
  wpm: { think: 61.9, flow: 78, peak: 96 },
  consistency: 84,
  correctionRate: 4.5,
  pauses: { count: 3, medianMs: 4800, longestMs: 12_400 },
  insertedChars: 1287,
  deletedChars: 60,
  pastedChars: 0,
  pasteRatio: 0,
  confidence: 0.94,
  resumed: false,
  ime: false,
  manualPauseMs: 0,
  series: SERIES,
};

function sampleSessions(): SessionRecord[] {
  return [
    SESSION,
    {
      ...SESSION,
      id: 'gallery-2',
      startedAt: STARTED - 86_400_000,
      endedAt: STARTED - 86_400_000 + 198_000,
      wpm: { think: 58, flow: 74, peak: 90 },
      chars: 1180,
      words: 194,
      wallMs: 198_000,
      activeMs: 160_000,
      confidence: 0.91,
      consistency: 81,
    },
    {
      ...SESSION,
      id: 'gallery-3',
      startedAt: STARTED - 172_800_000,
      endedAt: STARTED - 172_800_000 + 230_000,
      wpm: { think: 74, flow: 88, peak: 112 },
      chars: 1400,
      words: 228,
      wallMs: 230_000,
      activeMs: 182_000,
      confidence: 0.97,
      consistency: 88,
    },
    {
      ...SESSION,
      id: 'gallery-draft',
      startedAt: STARTED - 259_200_000,
      endedAt: STARTED - 259_200_000 + 120_000,
      resumed: true,
      wpm: { think: 44, flow: 61, peak: 78 },
      confidence: 0.72,
      words: 104,
      chars: 640,
      wallMs: 120_000,
      activeMs: 104_000,
    },
  ];
}

function historySample(): HistorySummary {
  return buildHistory(sampleSessions());
}

function blankHistory(): HistorySummary {
  return emptyHistory();
}

function liveFor(state: string): LiveStats {
  const base: LiveStats = {
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

  if (state === 'typing' || state === 'thinking' || state === 'paused') {
    return {
      ...base,
      active: true,
      wpm: 78,
      thinkWpm: 63,
      flowWpm: 78,
      peakWpm: 96,
      consistency: 84,
      signal: 0.94,
      words: 96,
      ms: 112_000,
      activeMs: 94_000,
      status: state === 'paused' ? 'paused' : state === 'thinking' ? 'thinking' : 'typing',
      holding: state === 'thinking',
      series: SERIES.slice(0, 44),
    };
  }

  if (state === 'draft') {
    return { ...base, draft: true, words: 42 };
  }

  return base;
}

async function boot(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const state = params.get('state') ?? 'typing';
  const sidebar = document.getElementById('sidebar');
  if (params.get('sidebar') === '0') sidebar?.classList.add('hidden');
  if (params.get('wide') === '1') {
    document.getElementById('thread')?.classList.add('wide');
    document.getElementById('composer')?.classList.add('wide');
  }
  if (params.get('chatgpt') === '1') {
    const composer = document.getElementById('composer');
    const thread = document.getElementById('thread');
    if (composer) composer.style.width = '880px';
    if (thread) thread.style.width = '880px';
  }
  const pageLabel = document.getElementById('page-label')!;
  pageLabel.textContent = `GALLERY / ${state.toUpperCase()}`;
  if (params.get('label') === '0') pageLabel.hidden = true;

  const history = state === 'empty' ? blankHistory() : historySample();
  const composer = document.getElementById('composer')!;
  const overlay = new Overlay({
    collapsed: false,
    pos: null,
    fontFacesCss: FONT_FACE_CSS,
    getComposerRect: () => composer.getBoundingClientRect(),
    getMainRect: () => document.querySelector('main')?.getBoundingClientRect() ?? null,
    onMove: () => undefined,
    onCollapse: () => undefined,
    onHide: () => undefined,
    onPause: () => undefined,
  });
  overlay.mount();
  overlay.setHistory(history);
  overlay.setSessions(state === 'empty' ? [] : sampleSessions());

  if (state === 'receipt' || state === 'receipt-draft' || state === 'share') {
    const session =
      state === 'receipt-draft'
        ? {
            ...SESSION,
            id: 'gallery-draft-print',
            resumed: true,
            confidence: 0.72,
            wpm: { think: 44, flow: 61, peak: 78 },
          }
        : SESSION;
    overlay.showReceipt(session, {
      newBest: state === 'receipt',
      firstReading: false,
      history,
    });
    if (state === 'share') {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const host = document.getElementById('thinktype-hud-host');
      host?.shadowRoot?.querySelector<HTMLButtonElement>('[data-act="share"]')?.click();
    }
  } else {
    const live = liveFor(state);
    const wpm = Number(params.get('wpm'));
    if (live.active && Number.isFinite(wpm) && wpm > 0) live.wpm = wpm;
    overlay.update(live);
  }

  document.documentElement.dataset.ready = 'true';
}

void boot();
