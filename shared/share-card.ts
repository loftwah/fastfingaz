import { BRAND, FONT, serialFromId } from './brand';
import { SITE_HOST } from './constants';
import { cardDate, formatClock, formatWpm, formatWords } from './format';
import { thinkRatio } from './metrics';
import type { SessionRecord } from './types';

export type CardFormat = 'landscape' | 'square' | 'story';

export interface CardFormatSpec {
  id: CardFormat;
  label: string;
  short: string;
  width: number;
  height: number;
  suffix: string;
}

export const CARD_FORMATS: Record<CardFormat, CardFormatSpec> = {
  landscape: {
    id: 'landscape',
    label: 'LANDSCAPE / OG',
    short: 'OG',
    width: 1200,
    height: 630,
    suffix: 'og',
  },
  square: {
    id: 'square',
    label: 'SQUARE / INSTAGRAM',
    short: 'SQUARE',
    width: 1080,
    height: 1080,
    suffix: 'square',
  },
  story: {
    id: 'story',
    label: 'STORY / REELS',
    short: 'STORY',
    width: 1080,
    height: 1920,
    suffix: 'story',
  },
};

export interface CardContext {
  bestThinkWpm?: number;
  bestFlowWpm?: number;
  bestPeakWpm?: number;
  avgThinkWpm?: number;
  avgFlowWpm?: number;
  domain?: string;
}

interface CardModel {
  think: number;
  flow: number;
  peak: number;
  signal: number;
  overhead: number;
  consistency: number;
  serial: string;
  date: string;
  words: string;
  time: string;
  best: string;
  avg: string;
  bestFlow: string;
  avgFlow: string;
  domain: string;
  pasteDominant: boolean;
  resumed: boolean;
}

const SANS = FONT.sans;
const MONO = FONT.mono;
const PIXEL = FONT.pixel;

function trackingWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  tracking: number,
): number {
  const chars = [...text];
  return (
    chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) +
    Math.max(0, chars.length - 1) * tracking
  );
}

function drawTracking(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
  align: 'left' | 'right' = 'left',
): void {
  const width = trackingWidth(ctx, text, tracking);
  let cursor = align === 'right' ? x - width : x;
  for (const ch of [...text]) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + tracking;
  }
}

function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking = 1.8,
  color: string = BRAND.mutedPaper,
  align: 'left' | 'right' = 'left',
): void {
  ctx.fillStyle = color;
  ctx.font = `500 10px ${MONO}`;
  drawTracking(ctx, text, x, y, tracking, align);
}

function mark(ctx: CanvasRenderingContext2D, x: number, y: number, cell = 6, gap = 2): void {
  ctx.fillStyle = BRAND.orange;
  for (let i = 0; i < 5; i++) ctx.fillRect(x + i * (cell + gap), y, cell, cell);
  const stemX = x + 2 * (cell + gap);
  for (let row = 1; row <= 3; row++) {
    ctx.fillRect(stemX, y + row * (cell + gap), cell, cell);
  }
}

function barcode(
  ctx: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  height: number,
  count = 24,
): number {
  const seed = `${serialFromId(id)}${id}`;
  let cursor = x;
  for (let i = 0; i < count; i++) {
    const code = seed.charCodeAt(i % seed.length);
    const width = 1 + (code % 3);
    ctx.fillRect(cursor, y, width, height);
    cursor += width + 3;
  }
  return cursor - x;
}

function cadence(
  ctx: CanvasRenderingContext2D,
  series: number[],
  x: number,
  y: number,
  width: number,
  height: number,
  count: number,
  gap: number,
): void {
  const barWidth = (width - gap * (count - 1)) / count;
  const values = series.slice(-count);
  const max = Math.max(60, ...values);
  const offset = count - values.length;

  ctx.fillStyle = BRAND.orange;
  for (let i = 0; i < count; i++) {
    const value = i >= offset ? (values[i - offset] ?? 0) : 0;
    const barHeight = value > 0 ? Math.max(2, (value / max) * height) : 1;
    ctx.globalAlpha = value > 0 ? (i >= count - 8 ? 1 : 0.3) : 0.16;
    ctx.fillRect(x + i * (barWidth + gap), y + height - barHeight, barWidth, barHeight);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = BRAND.linePaper;
  ctx.fillRect(x, y + height, width, 1);
}

function chip(
  ctx: CanvasRenderingContext2D,
  model: CardModel,
  x: number,
  y: number,
  height: number,
): void {
  const chipLabel = model.pasteDominant
    ? 'PASTED / LOW SIGNAL'
    : model.resumed
      ? 'DRAFT RESUME'
      : model.flow > 0
        ? 'THINKING OVERHEAD'
        : 'LOCAL MEASUREMENT';
  const chipValue = model.pasteDominant
    ? `${model.signal}% SIGNAL`
    : model.resumed
      ? `${model.signal}% SIGNAL`
      : model.flow > 0
        ? `${model.overhead}%`
        : 'NO SERVER';

  ctx.font = `500 10px ${MONO}`;
  const labelWidth = trackingWidth(ctx, chipLabel, 1.1);
  ctx.font = `500 12px ${MONO}`;
  const valueWidth = ctx.measureText(chipValue).width;
  const width = labelWidth + valueWidth + 46;

  ctx.fillStyle = BRAND.ink;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = 'rgba(247,245,239,0.62)';
  ctx.font = `500 10px ${MONO}`;
  drawTracking(ctx, chipLabel, x + 14, y + height / 2 + 4, 1.1);
  ctx.fillStyle = BRAND.orange;
  ctx.font = `500 12px ${MONO}`;
  ctx.fillText(chipValue, x + 14 + labelWidth + 18, y + height / 2 + 4);
}

function model(session: SessionRecord, context: CardContext = {}): CardModel {
  const think = Math.round(session.wpm.think);
  const flow = Math.round(session.wpm.flow);
  return {
    think,
    flow,
    peak: Math.round(session.wpm.peak),
    signal: Math.round(session.confidence * 100),
    overhead: Math.min(
      99,
      Math.max(0, Math.round((1 - thinkRatio(session.wpm.flow, session.wpm.think)) * 100)),
    ),
    consistency: Math.round(session.consistency),
    serial: serialFromId(session.id),
    date: cardDate(session.startedAt),
    words: formatWords(session.words),
    time: formatClock(session.wallMs),
    best: context.bestThinkWpm && context.bestThinkWpm > 0
      ? formatWpm(context.bestThinkWpm)
      : '—',
    avg: context.avgThinkWpm && context.avgThinkWpm > 0
      ? formatWpm(context.avgThinkWpm)
      : '—',
    bestFlow: context.bestFlowWpm && context.bestFlowWpm > 0
      ? formatWpm(context.bestFlowWpm)
      : '—',
    avgFlow: context.avgFlowWpm && context.avgFlowWpm > 0
      ? formatWpm(context.avgFlowWpm)
      : '—',
    domain: context.domain ?? SITE_HOST,
    pasteDominant: session.pasteRatio >= 0.5,
    resumed: session.resumed,
  };
}

interface Sheet {
  width: number;
  height: number;
  margin: number;
  ruleY: number;
}

function header(
  ctx: CanvasRenderingContext2D,
  sheet: Sheet,
  card: CardModel,
  opts: { ruleHeight: number; wordmarkSize: number; markSize: number },
): void {
  const { width, margin } = sheet;
  mark(ctx, margin, 48, opts.markSize, Math.round(opts.markSize / 3));
  ctx.fillStyle = BRAND.ink;
  ctx.font = `500 ${opts.wordmarkSize}px ${PIXEL}`;
  drawTracking(ctx, 'THINKTYPE', margin + 48, 82, 0.5);

  ctx.fillStyle = BRAND.ink;
  ctx.font = `500 11px ${MONO}`;
  drawTracking(ctx, `NO. ${card.serial}`, width - margin, 64, 1.4, 'right');

  ctx.fillStyle = BRAND.mutedPaper;
  ctx.font = `500 10px ${MONO}`;
  drawTracking(ctx, card.date, width - margin, 84, 1.8, 'right');

  ctx.fillStyle = BRAND.orange;
  ctx.fillRect(margin, sheet.ruleY, width - margin * 2, opts.ruleHeight);
}

function footer(
  ctx: CanvasRenderingContext2D,
  sheet: Sheet,
  card: CardModel,
  sessionId: string,
  y: number,
): void {
  const { width, margin } = sheet;
  ctx.strokeStyle = BRAND.linePaper;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(width - margin, y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = BRAND.ink;
  const codeWidth = barcode(ctx, sessionId, margin, y + 11, 13);

  ctx.fillStyle = BRAND.mutedPaper;
  ctx.font = `500 9px ${MONO}`;
  drawTracking(ctx, 'COMPOSED IN CHATGPT', margin + codeWidth + 18, y + 23, 1.6);
  drawTracking(ctx, card.domain.toUpperCase(), width - margin, y + 23, 1.6, 'right');
}

function stat(
  ctx: CanvasRenderingContext2D,
  title: string,
  value: string,
  x: number,
  y: number,
  size: number,
  opts: {
    color?: string;
    labelColor?: string;
    mutedColor?: string;
    align?: 'left' | 'right';
  } = {},
): void {
  const align = opts.align ?? 'left';
  label(ctx, title, x, y, 1.6, opts.labelColor ?? BRAND.mutedPaper, align);
  if (value === '—') {
    ctx.fillStyle = opts.mutedColor ?? BRAND.mutedPaper;
    ctx.font = `500 ${Math.round(size * 0.5)}px ${MONO}`;
    ctx.fillText(value, x, y + size * 0.7);
    return;
  }
  ctx.fillStyle = opts.color ?? BRAND.ink;
  ctx.font = `500 ${size}px ${MONO}`;
  ctx.fillText(value, x, y + size * 0.92);
}

function blockValue(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  if (value === '—') {
    ctx.fillStyle = BRAND.mutedDark;
    ctx.font = `500 ${Math.round(size * 0.5)}px ${MONO}`;
    ctx.fillText(value, x, y);
    return;
  }
  ctx.fillStyle = color;
  ctx.font = `500 ${size}px ${MONO}`;
  ctx.fillText(value, x, y);
}

function landscape(ctx: CanvasRenderingContext2D, session: SessionRecord, card: CardModel): void {
  const sheet: Sheet = { width: 1200, height: 630, margin: 64, ruleY: 112 };
  ctx.fillStyle = BRAND.paper;
  ctx.fillRect(0, 0, sheet.width, sheet.height);

  ctx.strokeStyle = BRAND.linePaper;
  ctx.lineWidth = 1;
  ctx.strokeRect(20.5, 20.5, sheet.width - 41, sheet.height - 41);

  header(ctx, sheet, card, { ruleHeight: 6, wordmarkSize: 22, markSize: 6 });

  label(ctx, 'THINK WPM', 64, 166, 3);
  ctx.fillStyle = BRAND.ink;
  ctx.font = `500 196px ${MONO}`;
  const number = formatWpm(card.think);
  const numberWidth = ctx.measureText(number).width;
  ctx.fillText(number, 58, 338);
  ctx.fillStyle = BRAND.mutedPaper;
  ctx.font = `500 22px ${MONO}`;
  ctx.fillText('WPM', 58 + numberWidth + 20, 334);

  ctx.fillStyle = BRAND.mutedPaper;
  ctx.font = `400 17px ${SANS}`;
  ctx.fillText('Words per minute of finished thought.', 64, 382);

  chip(ctx, card, 64, 402, 38);

  label(ctx, 'CADENCE / 5 SEC', 64, 470, 1.6);
  cadence(ctx, session.series, 64, 484, 576, 54, 48, 8);

  ctx.fillStyle = BRAND.linePaper;
  ctx.fillRect(700, 150, 1, 350);

  label(ctx, 'FLOW', 736, 166, 3, BRAND.orangeInk);
  ctx.fillStyle = BRAND.orangeDisplay;
  ctx.font = `500 76px ${MONO}`;
  ctx.fillText(formatWpm(card.flow), 736, 240);
  label(ctx, 'HANDS-ON CADENCE', 736, 262, 1.4);

  label(ctx, 'PEAK', 736, 312, 3);
  ctx.fillStyle = BRAND.ink;
  ctx.font = `500 52px ${MONO}`;
  ctx.fillText(formatWpm(card.peak), 736, 370);
  label(ctx, 'BEST 5 SEC BURST', 736, 392, 1.4);

  stat(ctx, 'BEST THINK', card.best, 736, 432, 34, { labelColor: BRAND.orangeInk });
  stat(ctx, 'AVG / 20', card.avg, 900, 432, 34, { labelColor: BRAND.orangeInk });

  const specs: Array<[string, string]> = [
    ['WORDS', card.words],
    ['TIME', card.time],
    ['SIGNAL', `${card.signal}%`],
  ];
  specs.forEach(([title, value], index) => {
    const x = 736 + index * 124;
    label(ctx, title, x, 522, 1.6);
    ctx.fillStyle = index === 2 ? BRAND.orangeInk : BRAND.ink;
    ctx.font = `500 18px ${MONO}`;
    ctx.fillText(value, x, 548);
  });

  footer(ctx, sheet, card, session.id, 574);
}

function square(ctx: CanvasRenderingContext2D, session: SessionRecord, card: CardModel): void {
  const sheet: Sheet = { width: 1080, height: 1080, margin: 72, ruleY: 124 };
  ctx.fillStyle = BRAND.paper;
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  ctx.strokeStyle = BRAND.linePaper;
  ctx.lineWidth = 1;
  ctx.strokeRect(20.5, 20.5, sheet.width - 41, sheet.height - 41);

  header(ctx, sheet, card, { ruleHeight: 8, wordmarkSize: 24, markSize: 7 });

  label(ctx, 'THINK WPM', 72, 210, 3.4);
  ctx.fillStyle = BRAND.ink;
  ctx.font = `500 300px ${MONO}`;
  const number = formatWpm(card.think);
  const numberWidth = ctx.measureText(number).width;
  ctx.fillText(number, 66, 444);
  ctx.fillStyle = BRAND.mutedPaper;
  ctx.font = `500 28px ${MONO}`;
  ctx.fillText('WPM', 66 + numberWidth + 26, 438);

  ctx.fillStyle = BRAND.mutedPaper;
  ctx.font = `400 20px ${SANS}`;
  ctx.fillText('Words per minute of finished thought.', 72, 500);

  chip(ctx, card, 72, 528, 44);

  label(ctx, 'CADENCE / 5 SEC', 72, 620, 1.8);
  cadence(ctx, session.series, 72, 640, 936, 120, 64, 6);

  const readingY = 830;
  const columns = [72, 396, 720];
  const readings: Array<[string, string, string]> = [
    ['FLOW WPM', formatWpm(card.flow), BRAND.orangeDisplay],
    ['PEAK WPM', formatWpm(card.peak), BRAND.ink],
    ['BEST WPM', card.best, BRAND.ink],
  ];
  readings.forEach(([title, value, color], index) => {
    stat(ctx, title, value, columns[index]!, readingY, 74, { color });
  });

  const secondY = 960;
  const second: Array<[string, string]> = [
    ['AVG / 20', card.avg],
    ['WORDS', card.words],
    ['SIGNAL', `${card.signal}%`],
  ];
  second.forEach(([title, value], index) => {
    stat(ctx, title, value, columns[index]!, secondY, 34, {
      color: index === 2 ? BRAND.orangeInk : BRAND.ink,
    });
  });

  footer(ctx, sheet, card, session.id, 1002);
}

function story(ctx: CanvasRenderingContext2D, session: SessionRecord, card: CardModel): void {
  const sheet: Sheet = { width: 1080, height: 1920, margin: 84, ruleY: 146 };
  ctx.fillStyle = BRAND.paper;
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  ctx.strokeStyle = BRAND.linePaper;
  ctx.lineWidth = 1;
  ctx.strokeRect(20.5, 20.5, sheet.width - 41, sheet.height - 41);

  header(ctx, sheet, card, { ruleHeight: 9, wordmarkSize: 26, markSize: 8 });

  label(ctx, 'THINK WPM', 84, 246, 3.8);
  ctx.fillStyle = BRAND.ink;
  ctx.font = `500 380px ${MONO}`;
  const number = formatWpm(card.think);
  const numberWidth = ctx.measureText(number).width;
  ctx.fillText(number, 76, 548);
  ctx.fillStyle = BRAND.mutedPaper;
  ctx.font = `500 32px ${MONO}`;
  ctx.fillText('WPM', 76 + numberWidth + 30, 538);

  ctx.fillStyle = BRAND.mutedPaper;
  ctx.font = `400 23px ${SANS}`;
  ctx.fillText('Words per minute of finished thought.', 84, 616);

  chip(ctx, card, 84, 654, 52);

  label(ctx, 'CADENCE / 5 SEC', 84, 780, 2);
  cadence(ctx, session.series, 84, 802, 912, 170, 64, 8);

  ctx.fillStyle = BRAND.ink;
  ctx.fillRect(84, 1040, 912, 300);
  ctx.fillStyle = BRAND.orange;
  ctx.fillRect(84, 1040, 8, 300);

  const blockColumns = [120, 420, 720];
  const blockStats: Array<[string, string, string]> = [
    ['FLOW WPM', formatWpm(card.flow), BRAND.orange],
    ['PEAK WPM', formatWpm(card.peak), BRAND.white],
    ['BEST WPM', card.best, BRAND.white],
  ];
  blockStats.forEach(([title, value, color], index) => {
    const x = blockColumns[index]!;
    ctx.fillStyle = BRAND.mutedDark;
    ctx.font = `500 10px ${MONO}`;
    drawTracking(ctx, title, x, 1102, 1.8);
    blockValue(ctx, value, x, 1208, 92, color);
  });
  ctx.fillStyle = BRAND.mutedDark;
  ctx.font = `400 14px ${SANS}`;
  ctx.fillText('One finished thought, measured from first keystroke to send.', 120, 1292);

  const rowOne = 1400;
  const statsOne: Array<[string, string]> = [
    ['BEST FLOW', card.bestFlow],
    ['AVG THINK / 20', card.avg],
    ['AVG FLOW / 20', card.avgFlow],
  ];
  const colOne = [84, 396, 708];
  statsOne.forEach(([title, value], index) => {
    stat(ctx, title, value, colOne[index]!, rowOne, 42, {
      color: index === 0 ? BRAND.ink : BRAND.ink,
    });
  });

  ctx.fillStyle = BRAND.linePaper;
  ctx.fillRect(84, 1490, 912, 1);

  const rowTwo = 1526;
  const statsTwo: Array<[string, string]> = [
    ['WORDS', card.words],
    ['TIME', card.time],
    ['SIGNAL', `${card.signal}%`],
  ];
  statsTwo.forEach(([title, value], index) => {
    stat(ctx, title, value, colOne[index]!, rowTwo, 40, {
      color: index === 2 ? BRAND.orangeInk : BRAND.ink,
    });
  });

  ctx.fillStyle = BRAND.mutedPaper;
  ctx.font = `500 10px ${MONO}`;
  drawTracking(ctx, 'A PAUSE IS COUNTED AS THINKING, NOT A RESET.', 84, 1660, 1.8);
  drawTracking(ctx, `${card.consistency}% STEADY RHYTHM`, 996, 1660, 1.8, 'right');

  footer(ctx, sheet, card, session.id, 1770);
}

/**
 * A designed receipt for one of three social formats. Every layout is drawn at
 * its own dimensions; nothing is stretched.
 */
export function renderCard(
  session: SessionRecord,
  format: CardFormat = 'landscape',
  context: CardContext = {},
  scale = 2,
): HTMLCanvasElement {
  const spec = CARD_FORMATS[format];
  const canvas = document.createElement('canvas');
  canvas.width = spec.width * scale;
  canvas.height = spec.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.scale(scale, scale);

  const card = model(session, context);
  if (format === 'square') square(ctx, session, card);
  else if (format === 'story') story(ctx, session, card);
  else landscape(ctx, session, card);

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

export async function cardBlob(
  session: SessionRecord,
  format: CardFormat = 'landscape',
  context: CardContext = {},
): Promise<Blob> {
  await ensureCardFonts();
  // Export at the exact social dimensions, not a retina multiple.
  const canvas = renderCard(session, format, context, 1);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not encode card'));
    }, 'image/png');
  });
}

export function cardFileName(session: SessionRecord, format: CardFormat = 'landscape'): string {
  const d = new Date(session.startedAt);
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
  const spec = CARD_FORMATS[format];
  return `thinktype-${stamp}-${formatWpm(session.wpm.think)}wpm-${spec.suffix}.png`;
}

export async function downloadCard(
  session: SessionRecord,
  format: CardFormat = 'landscape',
  context: CardContext = {},
): Promise<void> {
  await ensureCardFonts();
  const canvas = renderCard(session, format, context, 1);
  const link = document.createElement('a');
  link.download = cardFileName(session, format);
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function copyCardImage(
  session: SessionRecord,
  format: CardFormat = 'landscape',
  context: CardContext = {},
): Promise<'copied' | 'downloaded'> {
  const blob = await cardBlob(session, format, context);
  try {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      throw new Error('Clipboard images unsupported');
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return 'copied';
  } catch {
    await downloadCard(session, format, context);
    return 'downloaded';
  }
}

export function cardSummary(session: SessionRecord): string {
  const overhead = Math.round((1 - thinkRatio(session.wpm.flow, session.wpm.think)) * 100);
  return [
    `${SITE_HOST} — ${cardDate(session.startedAt)} — NO. ${serialFromId(session.id)}`,
    `${formatWpm(session.wpm.think)} think wpm / ${formatWpm(
      session.wpm.flow,
    )} flow wpm / ${formatWords(session.words)} words`,
    `${formatClock(session.wallMs)} / ${Math.round(session.confidence * 100)}% signal / ${Math.max(
      0,
      overhead,
    )}% thinking overhead${session.resumed ? ' / draft resume' : ''}`,
  ].join('\n');
}
