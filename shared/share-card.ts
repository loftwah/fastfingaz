import { BRAND, FONT, serialFromId } from './brand';
import { cardDate, formatClock, formatWpm, formatWords } from './format';
import { thinkRatio } from './metrics';
import type { SessionRecord } from './types';

const W = 1200;
const H = 630;
const SCALE = 2;

const SANS = FONT.sans;
const MONO = FONT.mono;
const PIXEL = FONT.pixel;

function drawTracking(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
  align: 'left' | 'right' = 'left',
): void {
  const chars = [...text];
  const width =
    chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) +
    Math.max(0, chars.length - 1) * tracking;
  let cursor = align === 'right' ? x - width : x;
  for (const ch of chars) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + tracking;
  }
}

function barcode(
  ctx: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  height: number,
): number {
  const seed = `${serialFromId(id)}${id}`;
  let cursor = x;
  for (let i = 0; i < 24; i++) {
    const code = seed.charCodeAt(i % seed.length);
    const width = 1 + (code % 3);
    ctx.fillRect(cursor, y, width, height);
    cursor += width + 3;
  }
  return cursor - x;
}

function tickChart(
  ctx: CanvasRenderingContext2D,
  series: number[],
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const count = 48;
  const gap = 8;
  const barWidth = (width - gap * (count - 1)) / count;
  const values = series.slice(-count);
  const max = Math.max(60, ...values);
  const offset = count - values.length;

  ctx.fillStyle = BRAND.orange;
  for (let i = 0; i < count; i++) {
    const value = i >= offset ? (values[i - offset] ?? 0) : 0;
    const barHeight = value > 0 ? Math.max(2, (value / max) * height) : 1;
    ctx.globalAlpha = value > 0 ? (i >= count - 8 ? 1 : 0.32) : 0.18;
    ctx.fillRect(x + i * (barWidth + gap), y + height - barHeight, barWidth, barHeight);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = BRAND.linePaper;
  ctx.fillRect(x, y + height, width, 1);
}

/**
 * 1200×630 share receipt, rendered at 2×. The card is the product's brand
 * artifact: a printed measurement on warm paper, not a dashboard.
 */
export function renderCard(session: SessionRecord): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.scale(SCALE, SCALE);

  const think = Math.round(session.wpm.think);
  const flow = Math.round(session.wpm.flow);
  const peak = Math.round(session.wpm.peak);
  const signal = Math.round(session.confidence * 100);
  const overhead = Math.round((1 - thinkRatio(session.wpm.flow, session.wpm.think)) * 100);
  const serial = serialFromId(session.id);

  ctx.fillStyle = BRAND.paper;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = BRAND.linePaper;
  ctx.lineWidth = 1;
  ctx.strokeRect(20.5, 20.5, W - 41, H - 41);

  // Header.
  ctx.fillStyle = BRAND.orange;
  const markX = 64;
  const markY = 50;
  const cell = 6;
  const gap = 2;
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(markX + i * (cell + gap), markY, cell, cell);
  }
  const stemX = markX + 2 * (cell + gap);
  for (let row = 1; row <= 3; row++) {
    ctx.fillRect(stemX, markY + row * (cell + gap), cell, cell);
  }

  ctx.fillStyle = BRAND.ink;
  ctx.font = `500 22px ${PIXEL}`;
  drawTracking(ctx, 'THINKTYPE', 112, 84, 0.5);

  ctx.fillStyle = BRAND.ink;
  ctx.font = `500 11px ${MONO}`;
  drawTracking(ctx, `NO. ${serial}`, W - 64, 66, 1.4, 'right');

  ctx.fillStyle = BRAND.mutedPaper;
  ctx.font = `500 10px ${MONO}`;
  drawTracking(ctx, cardDate(session.startedAt), W - 64, 86, 1.8, 'right');

  ctx.fillStyle = BRAND.orange;
  ctx.fillRect(64, 112, W - 128, 6);

  // Hero: think WPM.
  ctx.fillStyle = BRAND.mutedPaper;
  ctx.font = `500 11px ${MONO}`;
  drawTracking(ctx, 'THINK WPM', 64, 166, 3);

  ctx.fillStyle = BRAND.ink;
  ctx.font = `500 196px ${MONO}`;
  const number = formatWpm(think);
  const numberWidth = ctx.measureText(number).width;
  ctx.fillText(number, 58, 338);

  ctx.fillStyle = BRAND.mutedPaper;
  ctx.font = `500 22px ${MONO}`;
  ctx.fillText('WPM', 58 + numberWidth + 20, 334);

  ctx.fillStyle = BRAND.mutedPaper;
  ctx.font = `400 17px ${SANS}`;
  ctx.fillText('Words per minute of finished thought.', 64, 382);

  // Insight block: a black field on the paper.
  const pasteDominant = session.pasteRatio >= 0.5;
  const chipLabel = pasteDominant
    ? 'PASTED / LOW SIGNAL'
    : flow > 0
      ? 'THINKING OVERHEAD'
      : 'LOCAL MEASUREMENT';
  const chipValue = pasteDominant
    ? `${signal}% SIGNAL`
    : flow > 0
      ? `${Math.min(99, Math.max(0, overhead))}%`
      : 'NO SERVER';

  ctx.font = `500 10px ${MONO}`;
  const labelWidth = ctx.measureText(chipLabel).width + chipLabel.length * 1.1;
  ctx.font = `500 12px ${MONO}`;
  const valueWidth = ctx.measureText(chipValue).width;
  const chipWidth = labelWidth + valueWidth + 46;

  ctx.fillStyle = BRAND.ink;
  ctx.fillRect(64, 402, chipWidth, 38);
  ctx.fillStyle = 'rgba(247,245,239,0.62)';
  ctx.font = `500 10px ${MONO}`;
  drawTracking(ctx, chipLabel, 78, 426, 1.1);
  ctx.fillStyle = BRAND.orange;
  ctx.font = `500 12px ${MONO}`;
  ctx.fillText(chipValue, 78 + labelWidth + 18, 426);

  // Cadence chart.
  ctx.fillStyle = BRAND.mutedPaper;
  ctx.font = `500 9px ${MONO}`;
  drawTracking(ctx, 'CADENCE / 5 SEC', 64, 470, 1.6);
  tickChart(ctx, session.series, 64, 484, 576, 54);

  // Right column.
  ctx.fillStyle = BRAND.linePaper;
  ctx.fillRect(700, 150, 1, 292);

  ctx.fillStyle = BRAND.orangeInk;
  ctx.font = `500 11px ${MONO}`;
  drawTracking(ctx, 'FLOW', 736, 166, 3);

  ctx.fillStyle = BRAND.orangeDisplay;
  ctx.font = `500 76px ${MONO}`;
  ctx.fillText(String(flow), 736, 240);

  ctx.fillStyle = BRAND.mutedPaper;
  ctx.font = `500 9px ${MONO}`;
  drawTracking(ctx, 'HANDS-ON CADENCE', 736, 262, 1.4);

  ctx.fillStyle = BRAND.mutedPaper;
  ctx.font = `500 11px ${MONO}`;
  drawTracking(ctx, 'PEAK', 736, 326, 3);

  ctx.fillStyle = BRAND.ink;
  ctx.font = `500 48px ${MONO}`;
  ctx.fillText(String(peak), 736, 376);

  ctx.fillStyle = BRAND.mutedPaper;
  ctx.font = `500 9px ${MONO}`;
  drawTracking(ctx, 'BEST 5 SEC BURST', 736, 398, 1.4);

  const rows: Array<[string, string]> = [
    ['WORDS', formatWords(session.words)],
    ['TIME', formatClock(session.wallMs)],
    ['SIGNAL', `${signal}%`],
  ];
  rows.forEach(([label, value], index) => {
    const top = 440 + index * 32;
    ctx.fillStyle = BRAND.linePaper;
    ctx.fillRect(736, top, W - 64 - 736, 1);
    ctx.fillStyle = BRAND.mutedPaper;
    ctx.font = `500 9px ${MONO}`;
    drawTracking(ctx, label, 736, top + 21, 1.6);
    ctx.fillStyle = index === 2 ? BRAND.orangeInk : BRAND.ink;
    ctx.font = `500 17px ${MONO}`;
    const width = ctx.measureText(value).width;
    ctx.fillText(value, W - 64 - width, top + 22);
  });
  ctx.fillStyle = BRAND.linePaper;
  ctx.fillRect(736, 536, W - 64 - 736, 1);

  // Footer.
  ctx.strokeStyle = BRAND.linePaper;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(64, 574);
  ctx.lineTo(W - 64, 574);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = BRAND.ink;
  const codeWidth = barcode(ctx, session.id, 64, 585, 13);

  ctx.fillStyle = BRAND.mutedPaper;
  ctx.font = `500 9px ${MONO}`;
  drawTracking(ctx, 'COMPOSED IN CHATGPT', 64 + codeWidth + 18, 597, 1.6);
  drawTracking(ctx, 'LOCAL ONLY / NO SERVER', W - 64, 597, 1.6, 'right');

  return canvas;
}

export async function ensureCardFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load(`500 100px ${MONO}`),
    document.fonts.load(`400 20px ${SANS}`),
    document.fonts.load(`500 20px ${PIXEL}`),
  ]);
}

export async function cardBlob(session: SessionRecord): Promise<Blob> {
  await ensureCardFonts();
  const canvas = renderCard(session);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not encode card'));
    }, 'image/png');
  });
}

function fileName(session: SessionRecord): string {
  const d = new Date(session.startedAt);
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
  return `thinktype-${stamp}-${Math.round(session.wpm.think)}wpm.png`;
}

export async function downloadCard(session: SessionRecord): Promise<void> {
  await ensureCardFonts();
  const canvas = renderCard(session);
  const link = document.createElement('a');
  link.download = fileName(session);
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function copyCardImage(session: SessionRecord): Promise<'copied' | 'downloaded'> {
  const blob = await cardBlob(session);
  try {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      throw new Error('Clipboard images unsupported');
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return 'copied';
  } catch {
    await downloadCard(session);
    return 'downloaded';
  }
}

export function cardSummary(session: SessionRecord): string {
  const overhead = Math.round((1 - thinkRatio(session.wpm.flow, session.wpm.think)) * 100);
  return [
    `thinktype — ${cardDate(session.startedAt)} — NO. ${serialFromId(session.id)}`,
    `${formatWpm(session.wpm.think)} think wpm / ${formatWpm(session.wpm.flow)} flow wpm / ${formatWords(
      session.words,
    )} words`,
    `${formatClock(session.wallMs)} / ${Math.round(session.confidence * 100)}% signal / ${Math.max(
      0,
      overhead,
    )}% thinking overhead`,
  ].join('\n');
}
