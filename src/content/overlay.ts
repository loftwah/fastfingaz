import { formatClock, formatWpm, formatWords } from '../shared/format';
import { copyCardImage } from '../shared/share-card';
import type { SessionRecord, ThemeSetting, LiveStats } from '../shared/types';
import css from './overlay.css';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export interface OverlayOptions {
  theme: ThemeSetting;
  collapsed: boolean;
  pos: { x: number; y: number } | null;
  onMove: (pos: { x: number; y: number }) => void;
  onCollapse: (collapsed: boolean) => void;
  onHide: () => void;
}

function detectPageTheme(): 'dark' | 'light' {
  const root = document.documentElement;
  if (root.classList.contains('dark')) return 'dark';
  const parse = (value: string): number | null => {
    const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
    if (!match) return null;
    const alpha = match[4] === undefined ? 1 : Number(match[4]);
    if (alpha === 0) return null;
    const [r, g, b] = [Number(match[1]), Number(match[2]), Number(match[3])];
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };
  const bodyLum = parse(getComputedStyle(document.body).backgroundColor);
  const rootLum = parse(getComputedStyle(root).backgroundColor);
  const lum = bodyLum ?? rootLum;
  if (lum !== null) return lum < 0.5 ? 'dark' : 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(setting: ThemeSetting): 'dark' | 'light' {
  return setting === 'auto' ? detectPageTheme() : setting;
}

function sparkPaths(series: number[], width = 272, height = 34): { line: string; area: string } {
  if (series.length < 2) {
    const flat = `M0,${height - 1} L${width},${height - 1}`;
    return { line: flat, area: `${flat} L${width},${height} L0,${height} Z` };
  }
  const max = Math.max(60, ...series);
  const points = series.map((value, index) => ({
    x: (index / (series.length - 1)) * width,
    y: height - 3 - Math.min(1, value / max) * (height - 6),
  }));

  let line = `M${points[0]!.x.toFixed(1)},${points[0]!.y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const cur = points[i]!;
    const midX = (prev.x + cur.x) / 2;
    line += ` C${midX.toFixed(1)},${prev.y.toFixed(1)} ${midX.toFixed(1)},${cur.y.toFixed(
      1,
    )} ${cur.x.toFixed(1)},${cur.y.toFixed(1)}`;
  }
  return { line, area: `${line} L${width},${height} L0,${height} Z` };
}

const EMPTY: LiveStats = {
  active: false,
  wpm: 0,
  thinkWpm: 0,
  flowWpm: 0,
  words: 0,
  ms: 0,
  status: 'idle',
  series: [],
};

export class Overlay {
  private host: HTMLDivElement;
  private hud: HTMLDivElement;
  private bar: HTMLDivElement;
  private num: HTMLElement;
  private orbNum: HTMLElement;
  private time: HTMLElement;
  private words: HTMLElement;
  private mode: HTMLElement;
  private status: HTMLElement;
  private pair: HTMLElement;
  private line: SVGPathElement;
  private area: SVGPathElement;
  private receipt: {
    think: HTMLElement;
    flow: HTMLElement;
    words: HTMLElement;
    meta: HTMLElement;
  } | null = null;
  private shareButton: HTMLButtonElement | null = null;

  private options: OverlayOptions;
  private pos: { x: number; y: number };
  private collapsed: boolean;
  private drag: { dx: number; dy: number } | null = null;
  private receiptUntil = 0;
  private receiptTimer: number | null = null;
  private lastSession: SessionRecord | null = null;

  constructor(options: OverlayOptions) {
    this.options = options;
    this.collapsed = options.collapsed;

    this.host = document.createElement('div');
    this.host.id = 'thinktype-hud-host';
    this.host.style.cssText =
      'all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none;';

    const shadow = this.host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${css}</style>
      <div class="hud" data-theme="dark" data-state="idle" data-collapsed="false"
           role="region" aria-label="Thinktype typing stats">
        <div class="bar">
          <span class="dot"></span>
          <span class="brand">Thinktype</span>
          <span class="spacer"></span>
          <button class="icon" data-act="collapse" aria-label="Collapse Thinktype" title="Collapse">
            <svg viewBox="0 0 12 12" width="11" height="11" fill="none"
                 stroke="currentColor" stroke-width="1.4" stroke-linecap="round"
                 stroke-linejoin="round" aria-hidden="true"><path d="M2 4.5 6 8.5 10 4.5"/></svg>
          </button>
          <button class="icon" data-act="hide" aria-label="Hide Thinktype" title="Hide (Alt+Shift+T)">
            <svg viewBox="0 0 12 12" width="11" height="11" fill="none"
                 stroke="currentColor" stroke-width="1.4" stroke-linecap="round"
                 aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6"/></svg>
          </button>
        </div>

        <div class="readout">
          <div>
            <span class="num" data-wpm>0</span><span class="unit">wpm</span>
            <span class="mode" data-mode>ready</span>
          </div>
          <div class="meta">
            <div><dd data-time>0:00</dd><dt>time</dt></div>
            <div><dd data-words>0</dd><dt>words</dt></div>
          </div>
        </div>

        <svg class="spark" viewBox="0 0 272 34" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="tt-spark-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#c9f75b"/>
              <stop offset="1" stop-color="#5eead4"/>
            </linearGradient>
            <linearGradient id="tt-spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="rgba(201,247,91,.28)"/>
              <stop offset="1" stop-color="rgba(201,247,91,0)"/>
            </linearGradient>
          </defs>
          <path class="area" d=""/>
          <path class="line" d=""/>
        </svg>

        <div class="foot">
          <span data-status>waiting for input</span>
          <span data-pair>think — · flow —</span>
        </div>

        <section class="receipt" aria-label="Session result">
          <div class="receipt-top">
            <span class="kicker">Session saved</span>
          </div>
          <div class="r-nums">
            <div><b data-r-think>0</b><span>think wpm</span></div>
            <div><b data-r-flow>0</b><span>flow wpm</span></div>
            <div><b data-r-words>0</b><span>words</span></div>
          </div>
          <div class="r-foot">
            <span class="r-meta" data-r-meta>—</span>
            <button class="share" data-act="share">Copy card</button>
          </div>
        </section>

        <button class="orb" data-act="expand" aria-label="Expand Thinktype">
          <span class="orb-num" data-orb>0</span>
          <span class="orb-unit">wpm</span>
        </button>
      </div>
    `;

    const pick = <T extends Element>(selector: string): T => {
      const el = shadow.querySelector<T>(selector);
      if (!el) throw new Error(`Thinktype overlay: missing ${selector}`);
      return el;
    };

    this.hud = pick<HTMLDivElement>('.hud');
    this.bar = pick<HTMLDivElement>('.bar');
    this.num = pick<HTMLElement>('[data-wpm]');
    this.orbNum = pick<HTMLElement>('[data-orb]');
    this.time = pick<HTMLElement>('[data-time]');
    this.words = pick<HTMLElement>('[data-words]');
    this.mode = pick<HTMLElement>('[data-mode]');
    this.status = pick<HTMLElement>('[data-status]');
    this.pair = pick<HTMLElement>('[data-pair]');
    this.line = pick<SVGPathElement>('.spark .line');
    this.area = pick<SVGPathElement>('.spark .area');
    this.receipt = {
      think: pick<HTMLElement>('[data-r-think]'),
      flow: pick<HTMLElement>('[data-r-flow]'),
      words: pick<HTMLElement>('[data-r-words]'),
      meta: pick<HTMLElement>('[data-r-meta]'),
    };
    this.shareButton = pick<HTMLButtonElement>('[data-act="share"]');

    this.pos = options.pos ?? this.defaultPosition();
    this.applyTheme(options.theme);
    this.setCollapsed(options.collapsed, false);
    this.bind();
    this.applyPosition(this.pos, false);
    this.update(EMPTY);
  }

  mount(): void {
    document.documentElement.appendChild(this.host);
    // Measure once mounted so default/clamped positions use the real box.
    this.applyPosition(this.pos, false);
  }

  destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    this.host.remove();
  }

  setVisible(visible: boolean): void {
    this.host.style.display = visible ? 'block' : 'none';
  }

  setTheme(setting: ThemeSetting): void {
    this.applyTheme(setting);
  }

  setPosition(pos: { x: number; y: number } | null): void {
    this.applyPosition(pos ?? this.defaultPosition(), false);
  }

  setCollapsed(collapsed: boolean, notify = true): void {
    this.collapsed = collapsed;
    this.hud.dataset.collapsed = String(collapsed);
    this.applyPosition(this.pos, false);
    if (notify) this.options.onCollapse(collapsed);
  }

  update(live: LiveStats): void {
    if (this.receiptUntil > Date.now()) {
      if (!live.active) return;
      this.clearReceipt();
    }

    const state = live.active ? live.status : 'idle';
    this.hud.dataset.state = state;

    this.num.textContent = formatWpm(live.active ? live.wpm : 0);
    this.orbNum.textContent = formatWpm(live.active ? live.wpm : 0);
    this.time.textContent = formatClock(live.active ? live.ms : 0);
    this.words.textContent = formatWords(live.active ? live.words : 0);

    if (live.status === 'thinking' && live.active) {
      this.mode.textContent = 'live flow';
      this.status.textContent = 'thinking';
    } else if (live.status === 'typing' && live.active) {
      this.mode.textContent = 'live flow';
      this.status.textContent = 'typing';
    } else {
      this.mode.textContent = 'ready';
      this.status.textContent = 'waiting for input';
    }

    this.pair.textContent =
      live.active && live.words > 0 && live.ms > 1200
        ? `think ${formatWpm(live.thinkWpm)} · flow ${formatWpm(live.flowWpm)}`
        : 'think — · flow —';

    const { line, area } = sparkPaths(live.active ? live.series : []);
    this.line.setAttribute('d', line);
    this.area.setAttribute('d', area);
  }

  showReceipt(session: SessionRecord): void {
    this.lastSession = session;
    if (this.receipt) {
      this.receipt.think.textContent = formatWpm(session.wpm.think);
      this.receipt.flow.textContent = formatWpm(session.wpm.flow);
      this.receipt.words.textContent = formatWords(session.words);
      this.receipt.meta.textContent = `${formatClock(session.wallMs)} · ${Math.round(
        session.confidence * 100,
      )}% signal`;
    }
    if (this.shareButton) {
      this.shareButton.textContent = 'Copy card';
      this.shareButton.disabled = false;
    }
    this.hud.dataset.state = 'receipt';
    this.receiptUntil = Date.now() + 20_000;
    this.hud.classList.toggle('has-receipt', this.collapsed);
    if (this.receiptTimer) window.clearTimeout(this.receiptTimer);
    this.receiptTimer = window.setTimeout(() => this.clearReceipt(), 20_000);
  }

  private clearReceipt(): void {
    this.receiptUntil = 0;
    if (this.receiptTimer) {
      window.clearTimeout(this.receiptTimer);
      this.receiptTimer = null;
    }
    this.hud.classList.remove('has-receipt');
    if (this.hud.dataset.state === 'receipt') this.hud.dataset.state = 'idle';
    this.update(EMPTY);
  }

  private defaultPosition(): { x: number; y: number } {
    const width = this.collapsed ? 58 : 300;
    return {
      x: Math.max(12, window.innerWidth - width - 24),
      y: 84,
    };
  }

  private applyTheme(setting: ThemeSetting): void {
    const resolved = resolveTheme(setting);
    if (this.hud.dataset.theme !== resolved) this.hud.dataset.theme = resolved;
  }

  private applyPosition(pos: { x: number; y: number }, persist: boolean): void {
    const collapsed = this.hud.dataset.collapsed === 'true';
    const width = collapsed ? 58 : this.hud.offsetWidth || 300;
    const height = collapsed ? 58 : this.hud.offsetHeight || 150;
    const x = clamp(pos.x, 8, Math.max(8, window.innerWidth - width - 8));
    const y = clamp(pos.y, 8, Math.max(8, window.innerHeight - height - 8));
    this.pos = { x, y };
    this.hud.style.setProperty('--tt-x', `${Math.round(x)}px`);
    this.hud.style.setProperty('--tt-y', `${Math.round(y)}px`);
    if (persist) this.options.onMove(this.pos);
  }

  private handleResize = (): void => {
    this.applyPosition(this.pos, false);
  };

  private handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    if ((event.target as Element | null)?.closest('button')) return;
    const rect = this.hud.getBoundingClientRect();
    this.drag = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    this.hud.classList.add('dragging');
    this.bar.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.drag) return;
    this.applyPosition(
      { x: event.clientX - this.drag.dx, y: event.clientY - this.drag.dy },
      false,
    );
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.drag) return;
    this.drag = null;
    this.hud.classList.remove('dragging');
    if (this.bar.hasPointerCapture(event.pointerId)) {
      this.bar.releasePointerCapture(event.pointerId);
    }
    this.applyPosition(this.pos, true);
  };

  private bind(): void {
    window.addEventListener('resize', this.handleResize);
    this.bar.addEventListener('pointerdown', this.handlePointerDown);
    this.bar.addEventListener('pointermove', this.handlePointerMove);
    this.bar.addEventListener('pointerup', this.handlePointerUp);
    this.bar.addEventListener('pointercancel', this.handlePointerUp);

    this.hud.addEventListener('click', (event) => {
      const target = event.target as Element | null;
      const action = target?.closest<HTMLElement>('[data-act]')?.dataset.act;
      if (!action) return;

      if (action === 'collapse') this.setCollapsed(true);
      if (action === 'expand') {
        this.setCollapsed(false);
        if (this.receiptUntil > Date.now()) this.hud.dataset.state = 'receipt';
      }
      if (action === 'hide') {
        this.setVisible(false);
        this.options.onHide();
      }
      if (action === 'share') void this.share();
    });
  }

  private async share(): Promise<void> {
    if (!this.lastSession || !this.shareButton) return;
    const button = this.shareButton;
    button.disabled = true;
    button.textContent = 'Saving…';
    try {
      const result = await copyCardImage(this.lastSession);
      button.textContent = result === 'copied' ? 'Copied ✓' : 'Downloaded ✓';
    } catch {
      button.textContent = 'Try again';
    }
    window.setTimeout(() => {
      button.textContent = 'Copy card';
      button.disabled = false;
    }, 1800);
  }
}
