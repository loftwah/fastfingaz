import { Overlay } from '../src/content/overlay';
import { renderCard } from '../src/shared/share-card';
import type { LiveStats, SessionRecord } from '../src/shared/types';

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
  ime: false,
  series: SERIES,
};

const LIVE: LiveStats = {
  active: true,
  wpm: 78,
  thinkWpm: 63,
  flowWpm: 78,
  words: 96,
  ms: 112_000,
  status: 'typing',
  series: SERIES.slice(0, 44),
};

function setupOverlay(pos: { x: number; y: number }): Overlay {
  const overlay = new Overlay({
    theme: 'dark',
    collapsed: false,
    pos,
    onMove: () => undefined,
    onCollapse: () => undefined,
    onHide: () => undefined,
  });
  overlay.mount();
  overlay.update(LIVE);
  return overlay;
}

const hero = document.getElementById('demo-hud');
if (hero) setupOverlay({ x: 860, y: 118 });

const hudStage = document.getElementById('hud-stage');
if (hudStage) setupOverlay({ x: 32, y: 32 });

const paintCard = (container: HTMLElement) => {
  const canvas = renderCard(SAMPLE);
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  canvas.style.display = 'block';
  container.replaceChildren(canvas);
};

const cardStage = document.getElementById('card-stage');
if (cardStage) paintCard(cardStage);

const heroCard = document.getElementById('hero-card');
if (heroCard) paintCard(heroCard);

declare global {
  interface Window {
    thinktypeDemo: { sample: SessionRecord; live: LiveStats };
  }
}

window.thinktypeDemo = { sample: SAMPLE, live: LIVE };
