import { ensureDocumentFonts, serialFromId } from '../shared/brand';
import { formatClock, formatWpm, formatWords } from '../shared/format';
import { copyCardImage } from '../shared/share-card';
import type { LiveStats, SessionRecord } from '../shared/types';
import css from './overlay.css?inline';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const BAR_COUNT = 38;

export interface OverlayOptions {
  collapsed: boolean;
  pos: { x: number; y: number } | null;
  fontFacesCss: string;
  getComposerRect?: () => DOMRect | null;
  onMove: (pos: { x: number; y: number }) => void;
  onCollapse: (collapsed: boolean) => void;
  onHide: () => void;
}

const EMPTY: LiveStats = {
  active: false,
  wpm: 0,
  thinkWpm: 0,
  flowWpm: 0,
  words: 0,
  ms: 0,
  status: 'idle',
  draft: false,
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
    kicker: null as HTMLElement | null,
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
      <div class="hud" data-state="idle" data-collapsed="false"
           role="region" aria-label="Thinktype typing stats">
        <div class="topline" aria-hidden="true"><span></span></div>

        <div class="bar">
          <span class="mark" aria-hidden="true"></span>
          <span class="brand">THINKTYPE</span>
          <span class="serial">TT-01</span>
          <span class="spacer"></span>
          <button class="icon" data-act="collapse" aria-label="Collapse Thinktype" title="Collapse">
            <svg viewBox="0 0 12 12" width="12" height="12" fill="none"
                 stroke="currentColor" stroke-width="1.2" stroke-linecap="square"
                 aria-hidden="true"><path d="M2 6h8"/></svg>
          </button>
          <button class="icon" data-act="hide" aria-label="Hide Thinktype" title="Hide (Alt+Shift+T)">
            <svg viewBox="0 0 12 12" width="12" height="12" fill="none"
                 stroke="currentColor" stroke-width="1.2" stroke-linecap="square"
                 aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/></svg>
          </button>
        </div>

        <div class="display">
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
        </div>

        <div class="foot">
          <span data-status>WAITING</span>
          <span data-pair>THINK — / FLOW —</span>
        </div>

        <section class="receipt" aria-label="Session receipt">
          <div class="r-head">
            <span class="kicker" data-r-kicker>SESSION PRINTED</span>
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
      kicker: pick<HTMLElement>('[data-r-kicker]'),
    };
    this.shareButton = pick<HTMLButtonElement>('[data-act="share"]');

    const bars = pick<HTMLElement>('[data-bars]');
    for (let i = 0; i < BAR_COUNT; i++) {
      const el = document.createElement('span');
      bars.appendChild(el);
      this.bars.push(el);
    }

    this.pos = options.pos ?? this.defaultPosition();
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

    const state = live.active ? live.status : live.draft ? 'draft' : 'idle';
    this.hud.dataset.state = state;

    this.num.textContent = formatWpm(live.active ? live.wpm : 0);
    this.orbNum.textContent = formatWpm(live.active ? live.wpm : 0);
    this.time.textContent = formatClock(live.active ? live.ms : 0);
    this.words.textContent = formatWords(live.words);

    if (live.draft && !live.active) {
      this.mode.textContent = 'DRAFT';
      this.status.textContent = 'TYPE TO MEASURE';
      this.pair.textContent = 'THINK — / FLOW —';
    } else if (live.status === 'thinking' && live.active) {
      this.mode.textContent = 'THINKING';
      this.status.textContent = 'THINKING';
      this.pair.textContent = `THINK ${formatWpm(live.thinkWpm)} / FLOW ${formatWpm(live.flowWpm)}`;
    } else if (live.status === 'typing' && live.active) {
      this.mode.textContent = 'LIVE FLOW';
      this.status.textContent = 'TYPING';
      this.pair.textContent = `THINK ${formatWpm(live.thinkWpm)} / FLOW ${formatWpm(live.flowWpm)}`;
    } else {
      this.mode.textContent = 'READY';
      this.status.textContent = 'WAITING';
      this.pair.textContent = 'THINK — / FLOW —';
    }

    this.renderBars(live.active ? live.series : [], live.status === 'thinking');
  }

  showReceipt(session: SessionRecord): void {
    this.lastSession = session;
    const serial = serialFromId(session.id);
    if (this.receipt.kicker) {
      this.receipt.kicker.textContent = session.resumed ? 'DRAFT PRINTED' : 'SESSION PRINTED';
    }
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
      const height = value > 0 ? Math.max(2, Math.round((value / max) * 38)) : 1;
      el.style.height = `${height}px`;
      const front = index >= values.length - 9 && value > 0;
      const opacity = value > 0 ? (front ? 1 : 0.55) : 0.18;
      el.style.opacity = String(opacity * dim);
    }
  }

  private defaultPosition(): { x: number; y: number } {
    const width = this.collapsed ? 60 : 420;
    const height = this.collapsed ? 60 : 270;
    const gap = 16;
    const composer = this.options.getComposerRect?.();
    if (composer) {
      if (window.innerWidth - composer.right >= width + gap) {
        return {
          x: window.innerWidth - width - gap,
          y: clamp(
            Math.min(window.innerHeight - height - gap, composer.bottom - height),
            gap,
            window.innerHeight - height - gap,
          ),
        };
      }
      if (composer.top >= height + gap) {
        return {
          x: clamp(composer.right - width, gap, window.innerWidth - width - gap),
          y: composer.top - height - gap,
        };
      }
    }
    return {
      x: Math.max(gap, window.innerWidth - width - 24),
      y: Math.max(gap, window.innerHeight - height - 24),
    };
  }

  private applyPosition(pos: { x: number; y: number }, persist: boolean): void {
    const collapsed = this.hud.dataset.collapsed === 'true';
    const width = collapsed ? 60 : this.hud.offsetWidth || 420;
    const height = collapsed ? 60 : this.hud.offsetHeight || 270;
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
