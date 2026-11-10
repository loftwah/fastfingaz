import { cardDate, formatClock, formatWpm, formatWords } from './format';
import { thinkRatio } from './metrics';
import type { SessionRecord } from './types';

const W = 1200;
const H = 630;
const SCALE = 2;

const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Helvetica, Arial, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

const LIME = '#c9f75b';
const TEAL = '#5eead4';
const VIOLET = '#9b8cff';
const AMBER = '#fbbf24';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fillGradientText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  baseline: number,
  size: number,
  font: string,
  from: string,
  to: string,
): number {
  ctx.save();
  ctx.font = font;
  const width = ctx.measureText(text).width;
  const gradient = ctx.createLinearGradient(x, baseline - size, x + width, baseline);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  ctx.fillStyle = gradient;
  ctx.fillText(text, x, baseline);
  ctx.restore();
  return width;
}

function drawTracking(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
  align: 'left' | 'right' | 'center' = 'left',
): void {
  const chars = [...text];
  const width =
    chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) +
    Math.max(0, chars.length - 1) * tracking;
  let cursor = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
  for (const ch of chars) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + tracking;
  }
}

function sparkPath(
  series: number[],
  x: number,
  y: number,
  w: number,
  h: number,
  max: number,
): { line: Path2D; lastX: number; lastY: number } {
  const line = new Path2D();
  if (series.length === 0) {
    line.moveTo(x, y + h);
    line.lineTo(x + w, y + h);
    return { line, lastX: x + w, lastY: y + h };
  }
  const points = series.map((value, index) => ({
    x: x + (series.length === 1 ? 0 : (index / (series.length - 1)) * w),
    y: y + h - Math.min(1, value / max) * h,
  }));
  line.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const cur = points[i]!;
    const midX = (prev.x + cur.x) / 2;
    line.bezierCurveTo(midX, prev.y, midX, cur.y, cur.x, cur.y);
  }
  const last = points[points.length - 1]!;
  return { line, lastX: last.x, lastY: last.y };
}

/**
 * 1200×630 share card, rendered at 2×. Dark-only by design: it is the brand.
 */
export function renderCard(session: SessionRecord): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.scale(SCALE, SCALE);

  // Background and atmosphere.
  ctx.fillStyle = '#07080a';
  ctx.fillRect(0, 0, W, H);

  const glow = (x: number, y: number, r: number, inner: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, inner);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(1020, 20, 620, 'rgba(155,140,255,0.18)');
  glow(80, 650, 600, 'rgba(201,247,91,0.10)');
  glow(660, 700, 520, 'rgba(94,234,212,0.07)');

  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  for (let x = 24; x < W; x += 26) {
    for (let y = 24; y < H; y += 26) ctx.fillRect(x, y, 1.2, 1.2);
  }

  roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 28);
  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Header.
  const markGradient = ctx.createLinearGradient(60, 48, 96, 84);
  markGradient.addColorStop(0, '#e2ff9a');
  markGradient.addColorStop(1, TEAL);
  ctx.fillStyle = markGradient;
  roundRect(ctx, 68.5, 46, 9, 34, 4.5);
  ctx.fill();
  roundRect(ctx, 60, 46, 26, 9, 4.5);
  ctx.fill();

  ctx.fillStyle = 'rgba(244,246,248,0.92)';
  ctx.font = `600 24px ${SANS}`;
  ctx.fillText('thinktype', 106, 76);

  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.font = `500 12px ${MONO}`;
  drawTracking(ctx, cardDate(session.startedAt), W - 64, 74, 2.2, 'right');

  if (session.pasteRatio >= 0.5) {
    ctx.fillStyle = 'rgba(251,191,36,0.12)';
    roundRect(ctx, W - 244, 92, 180, 30, 15);
    ctx.fill();
    ctx.fillStyle = AMBER;
    ctx.font = `600 11px ${MONO}`;
    drawTracking(ctx, 'PASTED · LOW SIGNAL', W - 154, 112, 1.4, 'center');
  }

  // Hero number: think WPM.
  const think = Math.round(session.wpm.think);
  const flow = Math.round(session.wpm.flow);
  const peak = Math.round(session.wpm.peak);
  const overhead = Math.round((1 - thinkRatio(session.wpm.flow, session.wpm.think)) * 100);
  const signal = Math.round(session.confidence * 100);

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `600 13px ${SANS}`;
  drawTracking(ctx, 'THINK WPM', 64, 190, 3);

  const numberWidth = fillGradientText(
    ctx,
    formatWpm(think),
    60,
    344,
    172,
    `600 172px ${MONO}`,
    '#e6ffa8',
    TEAL,
  );

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `500 30px ${SANS}`;
  ctx.fillText('wpm', 60 + numberWidth + 22, 342);

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `400 19px ${SANS}`;
  ctx.fillText('words per minute of finished thought', 64, 390);

  // Insight chip.
  const pasteDominant = session.pasteRatio >= 0.5;
  const chipText = pasteDominant
    ? `pasted draft · ${signal}% signal`
    : flow > 0
      ? `${Math.min(99, Math.max(0, overhead))}% thinking overhead`
      : 'local-only measurement';
  ctx.font = `500 15px ${SANS}`;
  const chipWidth = ctx.measureText(chipText).width + 58;
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  roundRect(ctx, 64, 416, chipWidth, 42, 21);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.stroke();
  ctx.fillStyle = pasteDominant ? AMBER : VIOLET;
  ctx.beginPath();
  ctx.arc(88, 437, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.fillText(chipText, 104, 442);

  // Sparkline.
  const sparkX = 64;
  const sparkY = 476;
  const sparkW = 576;
  const sparkH = 58;
  const max = Math.max(60, ...session.series);
  const { line, lastX, lastY } = sparkPath(
    session.series,
    sparkX,
    sparkY,
    sparkW,
    sparkH,
    max,
  );

  ctx.save();
  const area = new Path2D(line);
  area.lineTo(lastX, sparkY + sparkH);
  area.lineTo(sparkX, sparkY + sparkH);
  area.closePath();
  const areaFill = ctx.createLinearGradient(0, sparkY, 0, sparkY + sparkH);
  areaFill.addColorStop(0, 'rgba(201,247,91,0.20)');
  areaFill.addColorStop(1, 'rgba(201,247,91,0)');
  ctx.fillStyle = areaFill;
  ctx.fill(area);

  ctx.strokeStyle = LIME;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(201,247,91,0.45)';
  ctx.shadowBlur = 16;
  ctx.stroke(line);
  ctx.restore();

  ctx.fillStyle = LIME;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.font = `500 10px ${MONO}`;
  drawTracking(ctx, 'CADENCE', sparkX, sparkY + sparkH + 20, 2);

  // Divider and right column.
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(704, 164);
  ctx.lineTo(704, 448);
  ctx.stroke();

  const colX = 744;

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `600 12px ${SANS}`;
  drawTracking(ctx, 'FLOW', colX, 190, 3);

  ctx.fillStyle = LIME;
  ctx.font = `500 78px ${MONO}`;
  ctx.fillText(String(flow), colX, 264);

  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.font = `400 14px ${SANS}`;
  ctx.fillText('cadence with hands on keys', colX, 292);

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `600 12px ${SANS}`;
  drawTracking(ctx, 'PEAK', colX, 344, 3);

  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.font = `500 52px ${MONO}`;
  ctx.fillText(String(peak), colX, 400);

  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.font = `400 14px ${SANS}`;
  ctx.fillText('best 5s burst', colX, 424);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(colX, 452);
  ctx.lineTo(W - 64, 452);
  ctx.stroke();

  const stats: Array<[string, string]> = [
    ['WORDS', formatWords(session.words)],
    ['TIME', formatClock(session.wallMs)],
    ['SIGNAL', `${signal}%`],
  ];
  stats.forEach(([label, value], index) => {
    const x = colX + index * 142;
    ctx.fillStyle = 'rgba(255,255,255,0.86)';
    ctx.font = `500 26px ${MONO}`;
    ctx.fillText(value, x, 497);
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.font = `600 10px ${SANS}`;
    drawTracking(ctx, label, x, 519, 2);
  });

  // Footer.
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.moveTo(64, 574);
  ctx.lineTo(W - 64, 574);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.34)';
  ctx.font = `400 13px ${SANS}`;
  ctx.fillText('Composed in ChatGPT', 64, 600);

  ctx.fillStyle = 'rgba(201,247,91,0.75)';
  ctx.font = `600 13px ${SANS}`;
  const url = 'github.com/loftwah/thinktype';
  const urlWidth = ctx.measureText(url).width;
  ctx.fillText(url, W - 64 - urlWidth, 600);
  ctx.fillStyle = 'rgba(255,255,255,0.34)';
  const brand = 'thinktype  ';
  ctx.fillText(brand, W - 64 - urlWidth - ctx.measureText(brand).width, 600);

  return canvas;
}

export function cardBlob(session: SessionRecord): Promise<Blob> {
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

export function downloadCard(session: SessionRecord): void {
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
    downloadCard(session);
    return 'downloaded';
  }
}

export function cardSummary(session: SessionRecord): string {
  const overhead = Math.round((1 - thinkRatio(session.wpm.flow, session.wpm.think)) * 100);
  return [
    `thinktype — ${cardDate(session.startedAt)}`,
    `${formatWpm(session.wpm.think)} think wpm · ${formatWpm(session.wpm.flow)} flow wpm · ${formatWords(
      session.words,
    )} words`,
    `${formatClock(session.wallMs)} · ${Math.round(session.confidence * 100)}% signal · ${Math.max(
      0,
      overhead,
    )}% thinking overhead`,
  ].join('\n');
}
