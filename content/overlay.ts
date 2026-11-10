import { ensureDocumentFonts, serialFromId } from '../shared/brand';
import { formatClock, formatWpm, formatWords } from '../shared/format';
import { copyCardImage } from '../shared/share-card';
import type { LiveStats, SessionRecord, ThemeSetting } from '../shared/types';
import css from './overlay.css?inline';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const BAR_COUNT = 38;

export interface OverlayOptions {
  theme: ThemeSetting;
  collapsed: boolean;
  pos: { x: number; y: number } | null;
  fontFacesCss: string;
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
  private bars: HTMLElement[] = [];
  private receipt = {
    think: null as HTMLElement | null,
    flow: null as HTMLElement | null,
    words: null as HTMLElement | null,
    serial: null as HTMLElement | null,
    meta: null as HTMLElement | null,
    barcode: null as HTMLElement | null,
  };
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
    ensureDocumentFonts(options.fontFacesCss);

    this.host = document.createElement('div');
    this.host.id = 'thinktype-hud-host';
    this.host.style.cssText =
      'all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none;';

    const shadow = this.host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${css}</style>
      <div class="hud" data-theme="dark" data-state="idle" data-collapsed="false"
           role="region" aria-label="Thinktype typing stats">
        <div class="topline" aria-hidden="true"><span></span></div>

        <div class="bar">
          <span class="mark" aria-hidden="true"></span>
          <span class="brand">THINKTYPE</span>
          <span class="serial">TT-01</span>
          <span class="spacer"></span>
          <button class="icon" data-act="collapse" aria-label="Collapse Thinktype" title="Collapse">
            <svg viewBox="0 0 12 12" width="11" height="11" fill="none"
                 stroke="currentColor" stroke-width="1.2" stroke-linecap="square"
                 aria-hidden="true"><path d="M2 6h8"/></svg>
          </button>
          <button class="icon" data-act="hide" aria-label="Hide Thinktype" title="Hide (Alt+Shift+T)">
            <svg viewBox="0 0 12 12" width="11" height="11" fill="none"
                 stroke="currentColor" stroke-width="1.2" stroke-linecap="square"
                 aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/></svg>
          </button>
        </div>

        <div class="readout">
          <div class="primary">
            <span class="num" data-wpm>0</span><span class="unit">WPM</span>
            <span class="mode" data-mode>READY</span>
          </div>
          <div class="meta">
            <div><dd data-time>0:00</dd><dt>TIME</dt></div>
            <div><dd data-words>0</dd><dt>WORDS</dt></div>
          </div>
        </div>

        <div class="meter">
          <div class="meter-head"><span>CADENCE</span><span>5 SEC</span></div>
          <div class="bars" data-bars aria-hidden="true"></div>
        </div>

        <div class="foot">
          <span data-status>WAITING</span>
          <span data-pair>THINK — / FLOW —</span>
        </div>

        <section class="receipt" aria-label="Session receipt">
          <div class="r-head">
            <span class="kicker">SESSION PRINTED</span>
            <span class="r-serial" data-r-serial>NO. 0000</span>
          </div>
          <div class="r-nums">
            <div><b data-r-think>0</b><span>THINK</span></div>
            <div><b data-r-flow>0</b><span>FLOW</span></div>
            <div><b data-r-words>0</b><span>WORDS</span></div>
          </div>
          <div class="r-meta" data-r-meta>—</div>
          <div class="r-foot">
            <div class="barcode" data-r-barcode aria-hidden="true"></div>
            <button class="share" data-act="share">COPY RECEIPT</button>
          </div>
        </section>

        <button class="orb" data-act="expand" aria-label="Expand Thinktype">
          <span class="orb-num" data-orb>0</span>
          <span class="orb-unit">WPM</span>
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
    this.receipt = {
      think: pick<HTMLElement>('[data-r-think]'),
      flow: pick<HTMLElement>('[data-r-flow]'),
      words: pick<HTMLElement>('[data-r-words]'),
      serial: pick<HTMLElement>('[data-r-serial]'),
      meta: pick<HTMLElement>('[data-r-meta]'),
      barcode: pick<HTMLElement>('[data-r-barcode]'),
    };
    this.shareButton = pick<HTMLButtonElement>('[data-act="share"]');

    const bars = pick<HTMLElement>('[data-bars]');
    for (let i = 0; i < BAR_COUNT; i++) {
      const el = document.createElement('span');
      bars.appendChild(el);
      this.bars.push(el);
    }

    this.pos = options.pos ?? this.defaultPosition();
    this.applyTheme(options.theme);
    this.setCollapsed(options.collapsed, false);
    this.bind();
    this.applyPosition(this.pos, false);
    this.update(EMPTY);
  }

  mount(): void {
    document.documentElement.appendChild(this.host);
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
      this.mode.textContent = 'THINKING';
      this.status.textContent = 'THINKING';
    } else if (live.status === 'typing' && live.active) {
      this.mode.textContent = 'LIVE FLOW';
      this.status.textContent = 'TYPING';
    } else {
      this.mode.textContent = 'READY';
      this.status.textContent = 'WAITING';
    }

    this.pair.textContent =
      live.active && live.words > 0 && live.ms > 1200
        ? `THINK ${formatWpm(live.thinkWpm)} / FLOW ${formatWpm(live.flowWpm)}`
        : 'THINK — / FLOW —';

    this.renderBars(live.active ? live.series : [], live.status === 'thinking');
  }

  showReceipt(session: SessionRecord): void {
    this.lastSession = session;
    const serial = serialFromId(session.id);
    if (this.receipt.think) this.receipt.think.textContent = formatWpm(session.wpm.think);
    if (this.receipt.flow) this.receipt.flow.textContent = formatWpm(session.wpm.flow);
    if (this.receipt.words) this.receipt.words.textContent = formatWords(session.words);
    if (this.receipt.serial) this.receipt.serial.textContent = `NO. ${serial}`;
    if (this.receipt.meta) {
      this.receipt.meta.textContent = `${formatClock(session.wallMs)} / ${Math.round(
        session.confidence * 100,
      )}% SIGNAL`;
    }
    if (this.receipt.barcode) {
      this.receipt.barcode.replaceChildren(...this.barcodeBars(session.id));
    }
    if (this.shareButton) {
      this.shareButton.textContent = 'COPY RECEIPT';
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

  private barcodeBars(id: string): HTMLElement[] {
    const seed = `${serialFromId(id)}${id}`;
    const bars: HTMLElement[] = [];
    for (let i = 0; i < 28; i++) {
      const code = seed.charCodeAt(i % seed.length);
      const bar = document.createElement('span');
      bar.style.width = `${1 + (code % 3)}px`;
      bar.style.opacity = code % 2 === 0 ? '0.9' : '0.45';
      bars.push(bar);
    }
    return bars;
  }

  private renderBars(series: number[], thinking: boolean): void {
    const values = series.slice(-BAR_COUNT);
    const max = Math.max(60, ...values);
    const dim = thinking ? 0.45 : 1;
    for (let i = 0; i < this.bars.length; i++) {
      const el = this.bars[i]!;
      const index = i - (BAR_COUNT - values.length);
      const value = index >= 0 ? (values[index] ?? 0) : 0;
      const height = value > 0 ? Math.max(2, Math.round((value / max) * 26)) : 1;
      el.style.height = `${height}px`;
      const front = index >= values.length - 9 && value > 0;
      const opacity = value > 0 ? (front ? 1 : 0.55) : 0.18;
      el.style.opacity = String(opacity * dim);
    }
  }

  private defaultPosition(): { x: number; y: number } {
    const width = this.collapsed ? 56 : 320;
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
    const width = collapsed ? 56 : this.hud.offsetWidth || 320;
    const height = collapsed ? 56 : this.hud.offsetHeight || 180;
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
    button.textContent = 'PRINTING…';
    try {
      const result = await copyCardImage(this.lastSession);
      button.textContent = result === 'copied' ? 'COPIED' : 'SAVED';
    } catch {
      button.textContent = 'TRY AGAIN';
    }
    window.setTimeout(() => {
      button.textContent = 'COPY RECEIPT';
      button.disabled = false;
    }, 1800);
  }
}
