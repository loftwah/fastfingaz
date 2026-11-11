import { FONT_FACE_CSS } from '../shared/brand';
import { Overlay } from '../content/overlay';
import { ensureCardFonts, renderCard } from '../shared/share-card';
import type { LiveStats, SessionRecord } from '../shared/types';

const SERIES = [
  52, 58, 64, 71, 76, 82, 88, 91, 86, 79, 72, 68, 74, 81, 87, 92, 95, 90, 84, 78, 70, 64, 58, 66,
  73, 80, 86, 90, 93, 88, 82, 77, 71, 65, 60, 68, 75, 83, 89, 92, 87, 81, 74, 69, 63, 58, 66, 72,
];

const STARTED = new Date(2026, 10, 10, 10, 32, 0).getTime();

const SAMPLE: SessionRecord = {
  id: 'demo-session',
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

const LIVE: LiveStats = {
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
  status: 'typing',
  draft: false,
  holding: false,
  series: SERIES.slice(0, 44),
};

function setupOverlay(pos: { x: number; y: number }): Overlay {
  const overlay = new Overlay({
    collapsed: false,
    pos,
    orbSize: 60,
    size: 'auto',
    fontFacesCss: FONT_FACE_CSS,
    onMove: () => undefined,
    onCollapse: () => undefined,
    onOrbSize: () => undefined,
    onHide: () => undefined,
    onPause: () => undefined,
  });
  overlay.mount();
  overlay.update(LIVE);
  return overlay;
}


async function bootDemo(): Promise<void> {
  if (document.getElementById('demo-hud')) setupOverlay({ x: 840, y: 118 });
  if (document.getElementById('hud-stage')) setupOverlay({ x: 32, y: 32 });

  const cardStage = document.getElementById('card-stage');
  const heroCard = document.getElementById('hero-card');
  if (!cardStage && !heroCard) return;

  await ensureCardFonts();
  const canvas = renderCard(SAMPLE);
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  canvas.style.display = 'block';
  (cardStage ?? heroCard)?.replaceChildren(canvas);

}

void bootDemo();
