import { ensureCardFonts, CARD_FORMATS, renderCard, type CardFormat } from '../shared/share-card';
import type { CardContext } from '../shared/share-card';
import type { SessionRecord } from '../shared/types';
import { buildHistory } from '../shared/metrics';

const SERIES = [
  52, 58, 64, 71, 76, 82, 88, 91, 86, 79, 72, 68, 74, 81, 87, 92, 95, 90, 84, 78, 70, 64, 58, 66,
  73, 80, 86, 90, 93, 88, 82, 77, 71, 65, 60, 68, 75, 83, 89, 92, 87, 81, 74, 69, 63, 58, 66, 72,
];

const STARTED = new Date(2026, 10, 10, 10, 32, 0).getTime();

const SESSION: SessionRecord = {
  id: 'card-sample-4a2f',
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

const HISTORY = buildHistory([
  SESSION,
  {
    ...SESSION,
    id: 'card-sample-best',
    startedAt: STARTED - 86_400_000,
    endedAt: STARTED - 86_400_000 + 198_000,
    wpm: { think: 74, flow: 88, peak: 112 },
    chars: 1400,
    words: 228,
    wallMs: 198_000,
    activeMs: 160_000,
    confidence: 0.97,
    consistency: 88,
  },
  {
    ...SESSION,
    id: 'card-sample-2',
    startedAt: STARTED - 172_800_000,
    endedAt: STARTED - 172_800_000 + 230_000,
    wpm: { think: 58, flow: 74, peak: 90 },
    chars: 1180,
    words: 194,
    wallMs: 230_000,
    activeMs: 180_000,
    confidence: 0.91,
    consistency: 81,
  },
]);

const CONTEXT: CardContext = {
  bestThinkWpm: HISTORY.best.thinkWpm,
  bestFlowWpm: HISTORY.best.flowWpm,
  bestPeakWpm: HISTORY.best.peakWpm,
  avgThinkWpm: HISTORY.rolling.thinkWpm,
  avgFlowWpm: HISTORY.rolling.flowWpm,
};

async function boot(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const requested = params.get('format');
  const formats: CardFormat[] = requested
    ? [requested as CardFormat]
    : ['landscape', 'square', 'story'];
  if (requested && CARD_FORMATS[requested as CardFormat]) {
    document.body.classList.add('single');
    document.body.style.width = `${CARD_FORMATS[requested as CardFormat].width}px`;
    document.body.style.height = `${CARD_FORMATS[requested as CardFormat].height}px`;
  }

  const stress = params.get('stress') === '1';
  const empty = params.get('empty') === '1';
  const session = stress
    ? {
        ...SESSION,
        id: 'stress-session',
        chars: 12_345,
        words: 4321,
        wallMs: 754_000,
        activeMs: 610_000,
        insertedChars: 12_400,
        wpm: { think: 123, flow: 145, peak: 188 },
        confidence: 1,
        consistency: 100,
      }
    : SESSION;
  const context = empty
    ? {}
    : stress
      ? { bestThinkWpm: 999, bestFlowWpm: 999, avgThinkWpm: 321, avgFlowWpm: 456 }
      : CONTEXT;

  await ensureCardFonts();
  const grid = document.getElementById('grid')!;
  for (const format of formats) {
    const spec = CARD_FORMATS[format];
    const holder = document.createElement('div');
    holder.className = 'card';
    const canvas = renderCard(session, format, context, 1);
    canvas.dataset.format = format;
    canvas.style.maxWidth = requested ? '100%' : format === 'story' ? '360px' : '620px';
    holder.appendChild(canvas);
    if (!requested) {
      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = `${spec.label} / ${spec.width} × ${spec.height}`;
      holder.appendChild(label);
    }
    grid.appendChild(holder);
  }
  document.documentElement.dataset.ready = 'true';
}

void boot();
