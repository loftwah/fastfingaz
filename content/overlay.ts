import { ensureDocumentFonts, serialFromId } from '../shared/brand';
import { formatClock, formatRelative, formatWpm, formatWords } from '../shared/format';
import { dailyBuckets, dayKey, emptyHistory, idleReadout } from '../shared/metrics';
import {
  CARD_FORMATS,
  cardBlob,
  cardFileName,
  copyCardImage,
  downloadCard,
  renderCard,
  type CardContext,
  type CardFormat,
} from '../shared/share-card';
import type { LiveSnapshot } from '../shared/storage';
import type { HistorySummary, HudSize, LiveStats, SessionRecord } from '../shared/types';
import css from './overlay.css?inline';

const BAR_COUNT = 38;
const DASH = '—';
const MIN_ORB_SIZE = 44;
const MAX_ORB_SIZE = 104;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const EMPTY: LiveStats = {
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

export interface OverlayOptions {
  collapsed: boolean;
  pos: { x: number; y: number } | null;
  /** Collapsed orb diameter in CSS pixels. */
  orbSize: number;
  /** Manual panel size; auto fits the gutter. */
  size: HudSize;
  fontFacesCss: string;
  getComposerRect?: () => DOMRect | null;
  /** The host's main content rect. Its left edge is the sidebar width. */
  getMainRect?: () => DOMRect | null;
  onMove: (pos: { x: number; y: number } | null) => void;
  onCollapse: (collapsed: boolean) => void;
  onOrbSize: (size: number) => void;
  onHide: () => void;
  onPause: () => void;
}

export interface ReceiptMeta {
  newBest: boolean;
  firstReading: boolean;
  history: HistorySummary;
}

export class Overlay {
  private host: HTMLDivElement;
  private hud: HTMLDivElement;
  private frame: HTMLDivElement;
  private rail: HTMLElement;
  private railLast: HTMLElement;
  private railBest: HTMLElement;
  private railAvg: HTMLElement;
  private railBarsEl: HTMLElement;
  private railRows: HTMLElement;
  private railCount: HTMLElement;
  private railBestFlow: HTMLElement;
  private railAvgFlow: HTMLElement;
  private railReadings: HTMLElement;
  private railBars: HTMLElement[] = [];
  private sessions: SessionRecord[] = [];
  private bar: HTMLDivElement;
  private pauseButton: HTMLButtonElement;
  private orb: HTMLButtonElement;
  private orbResizeHandle: HTMLButtonElement;
  private num: HTMLElement;
  private unit: HTMLElement;
  private orbNum: HTMLElement;
  private time: HTMLElement;
  private words: HTMLElement;
  private signal: HTMLElement;
  private mode: HTMLElement;
  private status: HTMLElement;
  private pair: HTMLElement;
  private flow: HTMLElement;
  private think: HTMLElement;
  private peak: HTMLElement;
  private best: HTMLElement;
  private avg: HTMLElement;
  private bestFlow: HTMLElement;
  private avgFlow: HTMLElement;
  private readings: HTMLElement;
  private drafts: HTMLElement;
  private totals: HTMLElement;
  private steady: HTMLElement;
  private barsEl: HTMLElement;
  private bars: HTMLElement[] = [];
  private stamp: HTMLElement;
  private rBarsEl: HTMLElement;
  private rBars: HTMLElement[] = [];
  private rOverhead: HTMLElement;
  private shareFile: HTMLElement;
  private shareSpec: HTMLElement;
  private shareSize: HTMLElement;
  private sharePreview: HTMLElement;
  private shareStatus: HTMLElement;
  private tabButtons: HTMLButtonElement[] = [];
  private receipt = {
    think: null as HTMLElement | null,
    flow: null as HTMLElement | null,
    peak: null as HTMLElement | null,
    words: null as HTMLElement | null,
    time: null as HTMLElement | null,
    signal: null as HTMLElement | null,
    best: null as HTMLElement | null,
    avg: null as HTMLElement | null,
    steady: null as HTMLElement | null,
    serial: null as HTMLElement | null,
    note: null as HTMLElement | null,
    barcode: null as HTMLElement | null,
    kicker: null as HTMLElement | null,
  };

  private options: OverlayOptions;
  private collapsed: boolean;
  private customPos: { x: number; y: number } | null;
  private orbSize: number;
  private size: HudSize;
  private drag: { dx: number; dy: number } | null = null;
  private orbDrag: {
    dx: number;
    dy: number;
    startX: number;
    startY: number;
  } | null = null;
  private orbMoved = false;
  private orbResize: { startX: number; startY: number; startSize: number } | null = null;
  private suppressClick = false;
  private panel: 'dashboard' | 'receipt' | 'share' = 'dashboard';
  private receiptUntil = 0;
  private receiptTimer: number | null = null;
  private lastSession: SessionRecord | null = null;
  private history: HistorySummary = emptyHistory();
  private lastLive: LiveStats = EMPTY;
  private paused: LiveSnapshot | null = null;
  private shareFormat: CardFormat = 'landscape';
  private shareToken = 0;
  private resizeObserver: ResizeObserver | null = null;
  private resizeFrame = 0;

  constructor(options: OverlayOptions) {
    this.options = options;
    this.collapsed = options.collapsed;
    this.orbSize = clamp(
      Number.isFinite(options.orbSize) ? options.orbSize : 60,
      MIN_ORB_SIZE,
      MAX_ORB_SIZE,
    );
    this.size = options.size;
    this.customPos = options.pos;
    ensureDocumentFonts(options.fontFacesCss);

    this.host = document.createElement('div');
    this.host.id = 'fastfingaz-hud-host';
    this.host.style.cssText =
      'all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none;';

    const shadow = this.host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${css}</style>
      <div class="hud" data-state="idle" data-panel="dashboard" data-collapsed="false" data-size="full"
           role="region" aria-label="Fastfingaz typing instrument">
        <div class="topline" aria-hidden="true"><span></span></div>

        <div class="bar">
          <span class="mark" aria-hidden="true"></span>
          <span class="brand">FASTFINGAZ</span>
          <span class="serial">FF-02</span>
          <span class="spacer"></span>
          <button class="icon pause-icon" data-act="pause" aria-label="Pause measurement (Alt+Shift+P)" title="Pause measurement (Alt+Shift+P)">
            <svg class="pause-glyph" viewBox="0 0 12 12" width="12" height="12" fill="none"
                 stroke="currentColor" stroke-width="1.6" stroke-linecap="square"
                 aria-hidden="true"><path d="M3.5 2v8M8.5 2v8"/></svg>
            <svg class="play-glyph" viewBox="0 0 12 12" width="12" height="12" fill="currentColor"
                 aria-hidden="true"><path d="M3.5 2.2l6 3.8-6 3.8z"/></svg>
          </button>
          <button class="icon" data-act="dock" aria-label="Dock Fastfingaz to the bottom" title="Dock to the bottom">
            <svg viewBox="0 0 12 12" width="12" height="12" fill="none"
                 stroke="currentColor" stroke-width="1.2" stroke-linecap="square"
                 aria-hidden="true"><path d="M6 1.5v6M3.5 5.5L6 8l2.5-2.5M1.5 10.5h9"/></svg>
          </button>
          <button class="icon" data-act="collapse" aria-label="Collapse Fastfingaz" title="Collapse">
            <svg viewBox="0 0 12 12" width="12" height="12" fill="none"
                 stroke="currentColor" stroke-width="1.2" stroke-linecap="square"
                 aria-hidden="true"><path d="M2 6h8"/></svg>
          </button>
          <button class="icon" data-act="hide" aria-label="Hide Fastfingaz" title="Hide (Alt+Shift+T)">
            <svg viewBox="0 0 12 12" width="12" height="12" fill="none"
                 stroke="currentColor" stroke-width="1.2" stroke-linecap="square"
                 aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/></svg>
          </button>
        </div>

        <div class="frame">
        <div class="dashboard">
          <div class="display">
            <div class="readout">
              <div class="primary">
                <span class="num" data-wpm>${DASH}</span><span class="unit">WPM</span>
                <span class="mode" data-mode>NO READINGS</span>
              </div>
              <div class="meta">
                <div><dd data-time>${DASH}</dd><dt>TIME</dt></div>
                <div><dd data-words>0</dd><dt>WORDS</dt></div>
                <div><dd data-signal>${DASH}</dd><dt>SIGNAL</dt></div>
                <div><dd data-steady>${DASH}</dd><dt>STEADY</dt></div>
              </div>
            </div>

            <div class="meter">
              <div class="meter-head"><span>CADENCE</span><span>5 SEC / 38 BARS</span></div>
              <div class="bars" data-bars aria-hidden="true"></div>
            </div>

            <div class="readings" aria-label="Live readings">
              <div class="reading"><span data-flow>${DASH}</span><em>FLOW</em></div>
              <div class="reading"><span data-think>${DASH}</span><em>THINK</em></div>
              <div class="reading"><span data-peak>${DASH}</span><em>PEAK</em></div>
            </div>
          </div>

          <div class="paper-strip" aria-label="Personal baseline">
            <div class="paper-head">
              <span>BASELINE</span>
              <span data-totals>NO READINGS</span>
            </div>
            <div class="paper-grid">
              <div class="paper-stat"><span data-best>${DASH}</span><em>BEST THINK</em></div>
              <div class="paper-stat"><span data-avg>${DASH}</span><em>AVG THINK<span class="only-full"> / 20</span></em></div>
              <div class="paper-stat"><span data-best-flow>${DASH}</span><em>BEST FLOW</em></div>
              <div class="paper-stat"><span data-avg-flow>${DASH}</span><em>AVG FLOW<span class="only-full"> / 20</span></em></div>
              <div class="paper-stat"><span data-readings>${DASH}</span><em>READINGS</em></div>
              <div class="paper-stat"><span data-drafts>${DASH}</span><em>DRAFTS</em></div>
            </div>
          </div>

          <div class="foot">
            <span data-status>READY</span>
            <span data-pair>TYPE IN CHATGPT TO START</span>
          </div>
        </div>

        <section class="receipt" aria-label="Session receipt" aria-live="polite">
          <span class="stamp" data-r-stamp hidden>NEW BEST</span>
          <div class="r-head">
            <span class="kicker" data-r-kicker>SESSION PRINTED</span>
            <span class="r-serial" data-r-serial>NO. 0000</span>
          </div>
          <div class="r-nums">
            <div><b data-r-think>0</b><span>THINK WPM</span></div>
            <div><b data-r-flow>0</b><span>FLOW WPM</span></div>
            <div><b data-r-peak>0</b><span>PEAK</span></div>
          </div>
          <div class="r-spec">
            <div><span>WORDS</span><b data-r-words>0</b></div>
            <div><span>TIME</span><b data-r-time>0:00</b></div>
            <div><span>SIGNAL</span><b data-r-signal>—</b></div>
            <div><span>BEST</span><b data-r-best>—</b></div>
            <div><span>AVG / 20</span><b data-r-avg>—</b></div>
            <div><span>STEADY</span><b data-r-steady>—</b></div>
          </div>
          <div class="r-cadence">
            <div class="r-cadence-head">
              <span>CADENCE / 5 SEC</span>
              <span data-r-overhead>—</span>
            </div>
            <div class="r-bars" data-r-bars aria-hidden="true"></div>
          </div>
          <div class="r-note" data-r-note>LOCAL ONLY / NO SERVER</div>
          <div class="r-foot">
            <div class="barcode" data-r-barcode aria-hidden="true"></div>
            <div class="r-actions">
              <button class="share" data-act="share">SHARE CARD</button>
              <button class="share ghost" data-act="dismiss">DONE</button>
            </div>
          </div>
        </section>

        <section class="sheet" aria-label="Share card">
          <div class="s-head">
            <span>SHARE RECEIPT</span>
            <span data-s-spec>OG / 1200×630</span>
          </div>
          <div class="s-tabs" role="tablist" aria-label="Card format">
            ${Object.values(CARD_FORMATS)
              .map(
                (spec) =>
                  `<button role="tab" data-format="${spec.id}" aria-selected="${spec.id === 'landscape'}">${spec.short}</button>`,
              )
              .join('')}
          </div>
          <div class="s-preview" data-s-preview></div>
          <div class="s-meta">
            <span class="s-file" data-s-file>fastfingaz.png</span>
            <span class="s-meta-right">
              <span data-s-size>RENDERING…</span>
              <span class="s-status" data-s-status></span>
            </span>
          </div>
          <div class="s-actions">
            <button class="share" data-act="copy-card">COPY IMAGE</button>
            <button class="share ghost" data-act="download-card">DOWNLOAD</button>
            <button class="share ghost" data-act="close-share">BACK</button>
          </div>
          <p class="s-note">Drawn on this machine. No upload.</p>
        </section>
        </div>

        <button class="orb" data-act="expand" aria-label="Expand Fastfingaz" title="Drag to move, click to expand">
          <span class="orb-num" data-orb>${DASH}</span>
          <span class="orb-unit">WPM</span>
        </button>
        <button class="orb-resize" data-act="orb-resize" aria-label="Resize Fastfingaz orb"
                title="Drag to resize, or use the arrow keys"></button>
      </div>

      <aside class="rail" data-visible="false" aria-label="Fastfingaz baseline log">
        <div class="rail-top">
          <span class="mark" aria-hidden="true"></span>
          <span class="rail-brand">BASELINE</span>
          <span class="rail-serial">FF-02 / LOG</span>
        </div>
        <div class="rail-rule" aria-hidden="true"></div>
        <div class="rail-stats">
          <div><span data-rail-last>${DASH}</span><em>LAST</em></div>
          <div><span data-rail-best>${DASH}</span><em>BEST</em></div>
          <div><span data-rail-avg>${DASH}</span><em>AVG / 20</em></div>
        </div>
        <div class="rail-chart">
          <div class="rail-chart-head"><span>14 DAYS</span><span>THINK WPM</span></div>
          <div class="rail-bars" data-rail-bars aria-hidden="true"></div>
        </div>
        <div class="rail-spec">
          <div><span>BEST FLOW</span><b data-rail-best-flow>${DASH}</b></div>
          <div><span>AVG FLOW / 20</span><b data-rail-avg-flow>${DASH}</b></div>
          <div><span>READINGS / DRAFTS</span><b data-rail-readings>${DASH}</b></div>
        </div>
        <div class="rail-log">
          <div class="rail-log-head"><span>RECENT</span><span data-rail-count>NO READINGS</span></div>
          <div class="rail-rows" data-rail-rows></div>
        </div>
        <div class="rail-foot"><span>LOCAL ONLY</span><span>NO SERVER</span></div>
      </aside>
    `;

    const pick = <T extends Element>(selector: string): T => {
      const el = shadow.querySelector<T>(selector);
      if (!el) throw new Error(`Fastfingaz overlay: missing ${selector}`);
      return el;
    };

    this.hud = pick<HTMLDivElement>('.hud');
    this.frame = pick<HTMLDivElement>('.frame');
    this.rail = pick<HTMLElement>('.rail');
    this.railLast = pick<HTMLElement>('[data-rail-last]');
    this.railBest = pick<HTMLElement>('[data-rail-best]');
    this.railAvg = pick<HTMLElement>('[data-rail-avg]');
    this.railBarsEl = pick<HTMLElement>('[data-rail-bars]');
    this.railRows = pick<HTMLElement>('[data-rail-rows]');
    this.railCount = pick<HTMLElement>('[data-rail-count]');
    this.railBestFlow = pick<HTMLElement>('[data-rail-best-flow]');
    this.railAvgFlow = pick<HTMLElement>('[data-rail-avg-flow]');
    this.railReadings = pick<HTMLElement>('[data-rail-readings]');
    this.bar = pick<HTMLDivElement>('.bar');
    this.pauseButton = pick<HTMLButtonElement>('[data-act="pause"]');
    this.num = pick<HTMLElement>('[data-wpm]');
    this.unit = pick<HTMLElement>('.unit');
    this.orbNum = pick<HTMLElement>('[data-orb]');
    this.orb = pick<HTMLButtonElement>('.orb');
    this.orbResizeHandle = pick<HTMLButtonElement>('.orb-resize');
    this.time = pick<HTMLElement>('[data-time]');
    this.words = pick<HTMLElement>('[data-words]');
    this.signal = pick<HTMLElement>('[data-signal]');
    this.mode = pick<HTMLElement>('[data-mode]');
    this.status = pick<HTMLElement>('[data-status]');
    this.pair = pick<HTMLElement>('[data-pair]');
    this.flow = pick<HTMLElement>('[data-flow]');
    this.think = pick<HTMLElement>('[data-think]');
    this.peak = pick<HTMLElement>('[data-peak]');
    this.best = pick<HTMLElement>('[data-best]');
    this.avg = pick<HTMLElement>('[data-avg]');
    this.bestFlow = pick<HTMLElement>('[data-best-flow]');
    this.avgFlow = pick<HTMLElement>('[data-avg-flow]');
    this.readings = pick<HTMLElement>('[data-readings]');
    this.drafts = pick<HTMLElement>('[data-drafts]');
    this.totals = pick<HTMLElement>('[data-totals]');
    this.steady = pick<HTMLElement>('[data-steady]');
    this.barsEl = pick<HTMLElement>('[data-bars]');
    this.stamp = pick<HTMLElement>('[data-r-stamp]');
    this.rBarsEl = pick<HTMLElement>('[data-r-bars]');
    this.rOverhead = pick<HTMLElement>('[data-r-overhead]');
    this.shareFile = pick<HTMLElement>('[data-s-file]');
    this.shareSpec = pick<HTMLElement>('[data-s-spec]');
    this.shareSize = pick<HTMLElement>('[data-s-size]');
    this.sharePreview = pick<HTMLElement>('[data-s-preview]');
    this.shareStatus = pick<HTMLElement>('[data-s-status]');
    this.tabButtons = [...shadow.querySelectorAll<HTMLButtonElement>('[data-format]')];
    this.receipt = {
      think: pick<HTMLElement>('[data-r-think]'),
      flow: pick<HTMLElement>('[data-r-flow]'),
      peak: pick<HTMLElement>('[data-r-peak]'),
      words: pick<HTMLElement>('[data-r-words]'),
      time: pick<HTMLElement>('[data-r-time]'),
      signal: pick<HTMLElement>('[data-r-signal]'),
      best: pick<HTMLElement>('[data-r-best]'),
      avg: pick<HTMLElement>('[data-r-avg]'),
      steady: pick<HTMLElement>('[data-r-steady]'),
      serial: pick<HTMLElement>('[data-r-serial]'),
      note: pick<HTMLElement>('[data-r-note]'),
      barcode: pick<HTMLElement>('[data-r-barcode]'),
      kicker: pick<HTMLElement>('[data-r-kicker]'),
    };

    for (let i = 0; i < BAR_COUNT; i++) {
      const el = document.createElement('span');
      this.barsEl.appendChild(el);
      this.bars.push(el);
    }

    for (let i = 0; i < 14; i++) {
      const el = document.createElement('span');
      this.railBarsEl.appendChild(el);
      this.railBars.push(el);
    }

    for (let i = 0; i < 48; i++) {
      const el = document.createElement('span');
      this.rBarsEl.appendChild(el);
      this.rBars.push(el);
    }

    this.setCollapsed(options.collapsed, false);
    this.bind();
    this.update(EMPTY);
  }

  mount(): void {
    document.documentElement.appendChild(this.host);
    this.applyPosition();
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeFrame) return;
      this.resizeFrame = requestAnimationFrame(() => {
        this.resizeFrame = 0;
        this.applyPosition();
      });
    });
    this.resizeObserver.observe(this.hud);
  }

  destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    this.resizeObserver?.disconnect();
    if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame);
    if (this.receiptTimer) window.clearTimeout(this.receiptTimer);
    this.host.remove();
  }

  setVisible(visible: boolean): void {
    this.host.style.display = visible ? 'block' : 'none';
  }

  setHistory(history: HistorySummary): void {
    this.history = history;
    if (this.panel === 'dashboard') this.renderDashboard(this.lastLive);
    this.renderRail();
  }

  setSessions(sessions: SessionRecord[]): void {
    this.sessions = sessions;
    this.renderRail();
  }

  setPaused(snapshot: LiveSnapshot | null): void {
    this.paused = snapshot;
    if (this.panel === 'dashboard') this.renderDashboard(this.lastLive);
  }

  setPosition(pos: { x: number; y: number } | null): void {
    this.customPos = pos;
    this.applyPosition();
  }

  setOrbSize(size: number): void {
    if (!Number.isFinite(size)) return;
    this.orbSize = clamp(Math.round(size), MIN_ORB_SIZE, MAX_ORB_SIZE);
    this.applyPosition();
  }

  setSize(size: HudSize): void {
    this.size = size;
    this.applyPosition();
  }

  setCollapsed(collapsed: boolean, notify = true): void {
    this.collapsed = collapsed;
    this.hud.dataset.collapsed = String(collapsed);
    this.applyPosition();
    if (notify) this.options.onCollapse(collapsed);
  }

  update(live: LiveStats): void {
    this.lastLive = live;
    if (live.active) this.paused = null;

    if (this.panel !== 'dashboard') {
      if (!live.active) return;
      this.panel = 'dashboard';
      this.hud.dataset.panel = 'dashboard';
      this.hud.dataset.state = live.status;
      this.hud.classList.remove('has-receipt');
      this.receiptUntil = 0;
      if (this.receiptTimer) {
        window.clearTimeout(this.receiptTimer);
        this.receiptTimer = null;
      }
    }

    this.renderDashboard(live);
  }

  showReceipt(session: SessionRecord, meta: ReceiptMeta): void {
    this.lastSession = session;
    this.history = meta.history;
    this.paused = null;
    const serial = serialFromId(session.id);

    if (this.receipt.kicker) {
      this.receipt.kicker.textContent = session.resumed ? 'DRAFT PRINTED' : 'SESSION PRINTED';
    }
    if (this.receipt.think) this.receipt.think.textContent = formatWpm(session.wpm.think);
    if (this.receipt.flow) this.receipt.flow.textContent = formatWpm(session.wpm.flow);
    if (this.receipt.peak) this.receipt.peak.textContent = formatWpm(session.wpm.peak);
    if (this.receipt.words) this.receipt.words.textContent = formatWords(session.words);
    if (this.receipt.time) this.receipt.time.textContent = formatClock(session.wallMs);
    if (this.receipt.signal) {
      this.receipt.signal.textContent = session.pasteRatio >= 0.5 ? 'LOW' : `${Math.round(
        session.confidence * 100,
      )}%`;
    }
    if (this.receipt.best) {
      this.receipt.best.textContent =
        meta.history.best.thinkWpm > 0 ? formatWpm(meta.history.best.thinkWpm) : DASH;
    }
    if (this.receipt.avg) {
      this.receipt.avg.textContent =
        meta.history.rolling.sessions > 0 ? formatWpm(meta.history.rolling.thinkWpm) : DASH;
    }
    if (this.receipt.steady) {
      this.receipt.steady.textContent = session.consistency > 0 ? `${Math.round(session.consistency)}%` : DASH;
    }
    if (this.receipt.serial) this.receipt.serial.textContent = `NO. ${serial}`;
    if (this.rOverhead) {
      const overhead =
        session.wpm.flow > 0
          ? Math.max(0, Math.round((1 - session.wpm.think / session.wpm.flow) * 100))
          : 0;
      this.rOverhead.textContent = `${overhead}% OVERHEAD`;
    }
    this.renderReceiptBars(session.series);
    if (this.receipt.note) this.receipt.note.textContent = this.receiptNote(session);
    if (this.receipt.barcode) {
      this.receipt.barcode.replaceChildren(...this.barcodeBars(session.id));
    }

    if (meta.firstReading) {
      this.stamp.hidden = false;
      this.stamp.textContent = 'FIRST READING';
    } else if (meta.newBest) {
      this.stamp.hidden = false;
      this.stamp.textContent = 'NEW BEST';
    } else {
      this.stamp.hidden = true;
    }

    this.panel = 'receipt';
    this.hud.dataset.panel = 'receipt';
    this.hud.dataset.state = 'receipt';
    this.hud.classList.toggle('has-receipt', this.collapsed);
    this.receiptUntil = Date.now() + 30_000;
    if (this.receiptTimer) window.clearTimeout(this.receiptTimer);
    this.receiptTimer = window.setTimeout(() => this.clearReceipt(), 30_000);
    this.applyPosition();
  }

  private receiptNote(session: SessionRecord): string {
    if (session.pasteRatio >= 0.5) return 'PASTED / LOW SIGNAL / EXCLUDED FROM AVERAGES';
    if (session.resumed) return 'DRAFT RESUME / EXCLUDED FROM BEST + AVERAGES';
    if (session.ime) return 'IME READING / APPROXIMATE';
    if (session.confidence < 0.6) return 'LOW SIGNAL / TREAT AS APPROXIMATE';
    return 'LOCAL ONLY / NO SERVER';
  }

  private clearReceipt(): void {
    this.receiptUntil = 0;
    if (this.receiptTimer) {
      window.clearTimeout(this.receiptTimer);
      this.receiptTimer = null;
    }
    this.panel = 'dashboard';
    this.hud.dataset.panel = 'dashboard';
    this.hud.classList.remove('has-receipt');
    this.hud.dataset.state = 'idle';
    this.stamp.hidden = true;
    this.renderDashboard(this.lastLive);
    this.applyPosition();
  }

  private renderDashboard(live: LiveStats): void {
    const state = live.active
      ? live.status
      : live.draft
        ? 'draft'
        : this.paused
          ? 'paused'
          : 'idle';
    this.hud.dataset.state = state;

    const pausedNow = live.active && live.status === 'paused';
    this.pauseButton.disabled = !live.active;
    const pauseLabel = pausedNow
      ? 'Resume measurement (Alt+Shift+P)'
      : 'Pause measurement (Alt+Shift+P)';
    this.pauseButton.setAttribute('aria-label', pauseLabel);
    this.pauseButton.title = pauseLabel;

    const last = this.history.last;
    const idle = idleReadout(this.history);
    const read = (value: number | null | undefined) =>
      value !== null && value !== undefined && value > 0 ? formatWpm(value) : DASH;
    const percent = (value: number | null | undefined) =>
      value !== null && value !== undefined && value > 0 ? `${Math.round(value)}%` : DASH;
    const signal = (value: number | null | undefined) =>
      value !== null && value !== undefined && value > 0 ? `${Math.round(value * 100)}%` : DASH;

    let primary = DASH;
    let mode = 'NO READINGS';
    let status = 'IDLE';
    let pair = this.history.totals.recorded
      ? `${this.history.totals.recorded} READINGS / ${this.history.totals.drafts} DRAFTS`
      : 'TYPE IN CHATGPT TO START';
    let flowValue = DASH;
    let thinkValue = DASH;
    let peakValue = DASH;
    let timeValue = DASH;
    let wordsValue = this.history.last ? formatWords(this.history.last.words) : DASH;
    let signalValue = DASH;
    let steadyValue = DASH;
    let series: number[] = [];
    let thinking = false;

    if (live.active) {
      if (live.status === 'paused') {
        primary = formatWpm(live.wpm);
        mode = 'PAUSED';
        status = 'PAUSED';
        pair = 'CLOCKS FROZEN / ALT+SHIFT+P TO RESUME';
        flowValue = read(live.flowWpm);
        thinkValue = read(live.thinkWpm);
        peakValue = read(live.peakWpm);
        timeValue = formatClock(live.ms);
        wordsValue = formatWords(live.words);
        signalValue = signal(live.signal);
        steadyValue = percent(live.consistency);
        series = live.series;
      } else {
        primary = formatWpm(live.wpm);
        mode = live.status === 'thinking' ? 'THINKING' : 'LIVE FLOW';
        status = live.status === 'thinking' ? 'THINKING' : 'TYPING';
        pair =
          live.status === 'thinking'
            ? 'PAUSE HELD / NOT A RESET'
            : 'NOT SAVED UNTIL SENT';
        flowValue = read(live.flowWpm);
        thinkValue = read(live.thinkWpm);
        peakValue = read(live.peakWpm);
        timeValue = formatClock(live.ms);
        wordsValue = formatWords(live.words);
        signalValue = signal(live.signal);
        steadyValue = percent(live.consistency);
        series = live.series;
        thinking = live.status === 'thinking';
      }
    } else if (live.draft) {
      mode = 'DRAFT';
      status = 'TYPE TO MEASURE';
      pair = 'EARLIER TEXT NOT COUNTED';
      wordsValue = formatWords(live.words);
    } else if (this.paused) {
      primary = read(this.paused.flowWpm);
      mode = 'PAUSED';
      status = 'NOT RECORDED';
      pair = 'TAB RELOADED / START AGAIN';
      flowValue = read(this.paused.flowWpm);
      thinkValue = read(this.paused.thinkWpm);
      peakValue = read(this.paused.peakWpm);
      timeValue = formatClock(this.paused.wallMs);
      wordsValue = formatWords(this.paused.words);
      steadyValue = percent(this.paused.consistency);
      series = this.paused.series;
    } else if (last) {
      primary = read(idle.last);
      mode = 'LAST THINK';
      status = 'IDLE';
      flowValue = read(last.flowWpm);
      thinkValue = read(last.thinkWpm);
      peakValue = read(last.peakWpm);
      timeValue = formatClock(last.wallMs);
      wordsValue = formatWords(last.words);
      signalValue = signal(last.confidence);
      steadyValue = percent(last.consistency);
    }

    this.num.textContent = primary;
    this.num.dataset.digits = String(primary.replace(/\D/g, '').length || 1);
    this.num.classList.toggle('is-empty', primary === DASH);
    this.unit.hidden = primary === DASH;
    this.orbNum.textContent =
      primary === DASH ? (live.active ? '0' : DASH) : primary;
    this.mode.textContent = mode;
    this.status.textContent = status;
    this.pair.textContent = pair;
    this.time.textContent = timeValue;
    this.words.textContent = wordsValue;
    this.signal.textContent = signalValue;
    this.flow.textContent = flowValue;
    this.think.textContent = thinkValue;
    this.peak.textContent = peakValue;
    this.best.textContent = read(idle.best);
    this.avg.textContent = read(idle.avg);
    this.bestFlow.textContent = read(this.history.best.flowWpm);
    this.avgFlow.textContent = read(this.history.rolling.flowWpm);
    this.readings.textContent = this.history.totals.recorded
      ? String(this.history.totals.recorded)
      : DASH;
    this.drafts.textContent = this.history.totals.recorded
      ? String(this.history.totals.drafts)
      : DASH;
    this.totals.textContent = this.history.totals.recorded
      ? `${this.history.totals.recorded} READINGS / ${this.history.totals.drafts} DRAFTS`
      : 'NO READINGS';
    this.steady.textContent = steadyValue;
    this.renderBars(series, thinking);
  }

  private renderRail(): void {
    if (!this.railLast) return;
    const idle = idleReadout(this.history);
    const read = (value: number | null) => (value && value > 0 ? formatWpm(value) : DASH);
    this.railLast.textContent = read(idle.last);
    this.railBest.textContent = read(idle.best);
    this.railAvg.textContent = read(idle.avg);
    this.railCount.textContent = this.history.totals.recorded
      ? `${this.history.totals.recorded} READINGS`
      : 'NO READINGS';
    this.railBestFlow.textContent =
      this.history.best.flowWpm > 0 ? formatWpm(this.history.best.flowWpm) : DASH;
    this.railAvgFlow.textContent =
      this.history.rolling.sessions > 0 ? formatWpm(this.history.rolling.flowWpm) : DASH;
    this.railReadings.textContent = this.history.totals.recorded
      ? `${this.history.totals.recorded} / ${this.history.totals.drafts}`
      : DASH;

    const buckets = dailyBuckets(this.sessions, 14);
    const max = Math.max(20, ...buckets.map((bucket) => bucket.thinkWpm));
    const today = dayKey(Date.now());
    buckets.forEach((bucket, index) => {
      const el = this.railBars[index];
      if (!el) return;
      const height = bucket.thinkWpm > 0 ? Math.max(2, Math.round((bucket.thinkWpm / max) * 54)) : 2;
      el.style.height = `${height}px`;
      el.style.opacity = bucket.thinkWpm > 0 ? (bucket.key === today ? '1' : '0.42') : '0.16';
    });

    const recent = this.sessions
      .filter((session) => !session.resumed && session.pasteRatio < 0.5)
      .slice(0, 4);
    this.railRows.replaceChildren();
    if (!recent.length) {
      const empty = document.createElement('div');
      empty.className = 'rail-empty';
      empty.textContent = 'NO READINGS YET';
      this.railRows.appendChild(empty);
      return;
    }
    for (const session of recent) {
      const row = document.createElement('div');
      row.className = 'rail-row';
      const serial = document.createElement('span');
      serial.className = 'rail-row-serial';
      serial.textContent = serialFromId(session.id);
      const think = document.createElement('b');
      think.textContent = formatWpm(session.wpm.think);
      const unit = document.createElement('em');
      unit.textContent = 'THINK';
      const flow = document.createElement('span');
      flow.className = 'rail-row-flow';
      flow.textContent = `${formatWpm(session.wpm.flow)} FLOW`;
      const when = document.createElement('span');
      when.className = 'rail-row-when';
      when.textContent = formatRelative(session.startedAt);
      row.append(serial, think, unit, flow, when);
      this.railRows.appendChild(row);
    }
  }

  private barcodeBars(id: string): HTMLElement[] {
    const seed = `${serialFromId(id)}${id}`;
    const bars: HTMLElement[] = [];
    for (let i = 0; i < 30; i++) {
      const code = seed.charCodeAt(i % seed.length);
      const bar = document.createElement('span');
      bar.style.width = `${1 + (code % 3)}px`;
      bar.style.opacity = code % 2 === 0 ? '0.9' : '0.45';
      bars.push(bar);
    }
    return bars;
  }

  private renderReceiptBars(series: number[]): void {
    const values = series.slice(-48);
    const max = Math.max(60, ...values);
    const offset = 48 - values.length;
    for (let i = 0; i < this.rBars.length; i++) {
      const el = this.rBars[i]!;
      const index = i - offset;
      const value = index >= 0 ? (values[index] ?? 0) : 0;
      const height = value > 0 ? Math.max(2, Math.round((value / max) * 54)) : 1;
      el.style.height = `${height}px`;
      el.style.opacity = value > 0 ? (i >= 40 ? '1' : '0.38') : '0.16';
    }
  }

  private renderBars(series: number[], thinking: boolean): void {
    const values = series.slice(-BAR_COUNT);
    const max = Math.max(60, ...values);
    const dim = thinking ? 0.5 : 1;
    for (let i = 0; i < this.bars.length; i++) {
      const el = this.bars[i]!;
      const index = i - (BAR_COUNT - values.length);
      const value = index >= 0 ? (values[index] ?? 0) : 0;
      const height = value > 0 ? Math.max(2, Math.round((value / max) * 44)) : 1;
      el.style.height = `${height}px`;
      const front = index >= values.length - 9 && value > 0;
      const opacity = value > 0 ? (front ? 1 : 0.42) : 0.14;
      el.style.opacity = String(opacity * dim);
    }
  }

  private cardContext(): CardContext {
    return {
      bestThinkWpm: this.history.best.thinkWpm,
      bestFlowWpm: this.history.best.flowWpm,
      bestPeakWpm: this.history.best.peakWpm,
      avgThinkWpm: this.history.rolling.thinkWpm,
      avgFlowWpm: this.history.rolling.flowWpm,
    };
  }

  private async openShare(): Promise<void> {
    if (!this.lastSession) return;
    this.panel = 'share';
    this.hud.dataset.panel = 'share';
    this.hud.dataset.state = 'share';
    this.shareFormat = 'landscape';
    this.shareStatus.textContent = '';
    this.renderShareTabs();
    this.applyPosition();
    await this.renderShare();
  }

  private renderShareTabs(): void {
    for (const button of this.tabButtons) {
      button.setAttribute('aria-selected', String(button.dataset.format === this.shareFormat));
    }
  }

  private async renderShare(): Promise<void> {
    const session = this.lastSession;
    if (!session) return;
    const spec = CARD_FORMATS[this.shareFormat];
    const token = ++this.shareToken;
    this.renderShareTabs();
    this.shareSpec.textContent = `${spec.short} / ${spec.width}×${spec.height}`;
    this.shareFile.textContent = cardFileName(session, this.shareFormat);
    this.shareSize.textContent = 'RENDERING…';

    const canvas = renderCard(session, this.shareFormat, this.cardContext(), 1);
    canvas.style.display = 'block';
    canvas.style.width = 'auto';
    canvas.style.height = 'auto';
    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = '100%';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute(
      'aria-label',
      `${spec.label} receipt preview, ${spec.width} by ${spec.height} pixels`,
    );
    this.sharePreview.replaceChildren(canvas);

    try {
      const blob = await cardBlob(session, this.shareFormat, this.cardContext());
      if (token !== this.shareToken) return;
      const kb = Math.max(1, Math.round(blob.size / 1024));
      this.shareSize.textContent = `${kb} KB`;
    } catch {
      if (token !== this.shareToken) return;
      this.shareSize.textContent = 'PNG';
    }
  }

  private async copyShare(): Promise<void> {
    const session = this.lastSession;
    if (!session) return;
    this.shareStatus.textContent = 'COPYING…';
    try {
      const result = await copyCardImage(session, this.shareFormat, this.cardContext());
      this.shareStatus.textContent = result === 'copied' ? 'COPIED' : 'DOWNLOADED';
    } catch {
      this.shareStatus.textContent = 'COPY FAILED';
    }
  }

  private async downloadShare(): Promise<void> {
    const session = this.lastSession;
    if (!session) return;
    this.shareStatus.textContent = 'SAVING…';
    try {
      await downloadCard(session, this.shareFormat, this.cardContext());
      this.shareStatus.textContent = 'SAVED';
    } catch {
      this.shareStatus.textContent = 'SAVE FAILED';
    }
  }

  /**
   * The instrument lives in the true gutter between the sidebar and the
   * conversation. The live panel takes the right gutter; when it fits, a
   * baseline log takes the left gutter too. No gutter means the orb, never a
   * panel over the sidebar or the messages.
   */
  private dockMetrics(): {
    width: number;
    side: 'left' | 'right';
    railWidth: number;
    railVisible: boolean;
    orb: boolean;
  } {
    const composer = this.options.getComposerRect?.();
    const main = this.options.getMainRect?.();
    const viewportWidth = window.innerWidth;
    const sidebarWidth = main && main.left > 1 ? main.left : 0;
    const leftGap = composer
      ? Math.max(0, composer.left - sidebarWidth)
      : viewportWidth - sidebarWidth;
    const rightGap = composer ? viewportWidth - composer.right : viewportWidth;
    const target = 360;
    const minWidth = 140;

    if (this.collapsed) {
      return {
        width: this.orbSize,
        side: rightGap >= leftGap ? 'right' : 'left',
        railWidth: 0,
        railVisible: false,
        orb: true,
      };
    }

    if (this.size !== 'auto') {
      const target = this.size === 'small' ? 142 : this.size === 'medium' ? 286 : 360;
      // A manual size intentionally ignores the gutter. The user chose it;
      // keep it on-screen, but do not silently shrink it to the gutter.
      return {
        width: Math.min(target, Math.max(120, viewportWidth - 16)),
        side: rightGap >= leftGap ? 'right' : 'left',
        railWidth: 0,
        railVisible: false,
        orb: false,
      };
    }

    const side = rightGap >= leftGap ? 'right' : 'left';
    const gap = side === 'right' ? rightGap : leftGap;
    if (gap >= minWidth + 20) {
      const width = clamp(minWidth, gap - 32, target);
      const railVisible = !this.customPos && side === 'right' && leftGap >= 300;
      const railWidth = railVisible ? clamp(240, leftGap - 40, 320) : 0;
      return { width, side, railWidth, railVisible, orb: false };
    }

    // No usable gutter: keep the instrument out of the way as the orb.
    return {
      width: this.orbSize,
      side: rightGap >= leftGap ? 'right' : 'left',
      railWidth: 0,
      railVisible: false,
      orb: true,
    };
  }

  refreshPosition(): void {
    this.applyPosition();
  }

  private applyPosition(): void {
    if (!this.hud.isConnected) return;
    const metrics = this.dockMetrics();
    const width = metrics.width;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 16;
    const orbFit = metrics.orb;
    const height = orbFit ? this.orbSize : Math.min(680, viewportHeight - 32);
    this.hud.style.setProperty('--tt-w', `${width}px`);
    this.hud.style.setProperty('--tt-h', `${height}px`);
    this.hud.dataset.fit = orbFit ? 'orb' : 'panel';
    this.hud.dataset.size = orbFit
      ? 'orb'
      : width >= 300
        ? 'full'
        : width >= 210
          ? 'medium'
          : width > 80
            ? 'slim'
            : 'orb';

    const main = this.options.getMainRect?.();
    const sidebarWidth = main && main.left > 1 ? main.left : 0;
    let x = margin;
    let y = viewportHeight - height - margin;

    if (this.customPos) {
      x = this.customPos.x;
      y = this.customPos.y;
      this.hud.dataset.anchor = 'custom';
    } else if (this.collapsed) {
      x = metrics.side === 'right' ? viewportWidth - width - 24 : sidebarWidth + margin;
      y = viewportHeight - height - margin;
      this.hud.dataset.anchor = 'bottom';
    } else if (metrics.side === 'right') {
      x = viewportWidth - width - 24;
      y = viewportHeight - height - margin;
      this.hud.dataset.anchor = 'bottom';
    } else {
      x = sidebarWidth + margin;
      y = viewportHeight - height - margin;
      this.hud.dataset.anchor = 'bottom';
    }

    x = clamp(x, 8, Math.max(8, viewportWidth - width - 8));
    y = clamp(y, 8, Math.max(8, viewportHeight - height - 8));
    this.hud.style.setProperty('--tt-x', `${Math.round(x)}px`);
    this.hud.style.setProperty('--tt-y', `${Math.round(y)}px`);

    const composer = this.options.getComposerRect?.();
    const showRail = metrics.railVisible && !!composer && !this.collapsed && !this.customPos;
    if (showRail && composer) {
      const railWidth = metrics.railWidth;
      const railX = Math.max(sidebarWidth + 8, composer.left - railWidth - 32);
      this.rail.style.setProperty('--tt-rail-w', `${railWidth}px`);
      this.rail.style.setProperty('--tt-rail-x', `${Math.round(railX)}px`);
      this.rail.style.setProperty('--tt-rail-y', `${Math.round(y)}px`);
      this.rail.style.setProperty('--tt-h', `${height}px`);
    }
    this.rail.dataset.visible = String(showRail);
  }

  private resetDock(): void {
    this.customPos = null;
    this.options.onMove(null);
    this.applyPosition();
    this.pair.textContent = 'DOCKED TO THE BOTTOM';
  }

  private handleResize = (): void => {
    this.applyPosition();
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
    this.customPos = {
      x: event.clientX - this.drag.dx,
      y: event.clientY - this.drag.dy,
    };
    this.applyPosition();
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.drag) return;
    this.drag = null;
    this.hud.classList.remove('dragging');
    if (this.bar.hasPointerCapture(event.pointerId)) {
      this.bar.releasePointerCapture(event.pointerId);
    }
    this.applyPosition();
    if (this.customPos) this.options.onMove(this.customPos);
  };

  /** A collapsed orb has no header, so the orb face is the drag handle. */
  private handleOrbPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const rect = this.hud.getBoundingClientRect();
    this.orbDrag = {
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
    };
    this.orbMoved = false;
    this.suppressClick = false;
    this.orb.setPointerCapture(event.pointerId);
  };

  private handleOrbPointerMove = (event: PointerEvent): void => {
    const drag = this.orbDrag;
    if (!drag) return;
    if (
      !this.orbMoved &&
      Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4
    ) {
      return;
    }
    this.orbMoved = true;
    this.hud.classList.add('dragging');
    this.customPos = {
      x: event.clientX - drag.dx,
      y: event.clientY - drag.dy,
    };
    this.applyPosition();
  };

  private handleOrbPointerUp = (event: PointerEvent): void => {
    if (!this.orbDrag) return;
    const moved = this.orbMoved;
    this.orbDrag = null;
    this.orbMoved = false;
    this.hud.classList.remove('dragging');
    if (this.orb.hasPointerCapture(event.pointerId)) {
      this.orb.releasePointerCapture(event.pointerId);
    }
    if (moved) {
      this.suppressClick = true;
      // A click normally follows pointerup. If it does not (release outside),
      // clear the guard so the next real click still expands the orb.
      window.setTimeout(() => {
        this.suppressClick = false;
      }, 250);
      if (this.customPos) this.options.onMove(this.customPos);
    }
  };

  private handleResizePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.orbResize = {
      startX: event.clientX,
      startY: event.clientY,
      startSize: this.orbSize,
    };
    this.orbResizeHandle.setPointerCapture(event.pointerId);
    this.hud.classList.add('resizing');
    event.preventDefault();
    event.stopPropagation();
  };

  private handleResizePointerMove = (event: PointerEvent): void => {
    const resize = this.orbResize;
    if (!resize) return;
    const delta = Math.max(event.clientX - resize.startX, event.clientY - resize.startY);
    this.setOrbSize(resize.startSize + delta);
  };

  private handleResizePointerUp = (event: PointerEvent): void => {
    if (!this.orbResize) return;
    this.orbResize = null;
    this.hud.classList.remove('resizing');
    if (this.orbResizeHandle.hasPointerCapture(event.pointerId)) {
      this.orbResizeHandle.releasePointerCapture(event.pointerId);
    }
    this.options.onOrbSize(this.orbSize);
  };

  private handleResizeKeyDown = (event: KeyboardEvent): void => {
    const step = event.shiftKey ? 8 : 4;
    let next = this.orbSize;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next += step;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next -= step;
    else return;
    event.preventDefault();
    event.stopPropagation();
    this.setOrbSize(next);
    this.options.onOrbSize(this.orbSize);
  };

  private bind(): void {
    window.addEventListener('resize', this.handleResize);
    this.bar.addEventListener('pointerdown', this.handlePointerDown);
    this.bar.addEventListener('pointermove', this.handlePointerMove);
    this.bar.addEventListener('pointerup', this.handlePointerUp);
    this.bar.addEventListener('pointercancel', this.handlePointerUp);

    this.orb.addEventListener('pointerdown', this.handleOrbPointerDown);
    this.orb.addEventListener('pointermove', this.handleOrbPointerMove);
    this.orb.addEventListener('pointerup', this.handleOrbPointerUp);
    this.orb.addEventListener('pointercancel', this.handleOrbPointerUp);

    this.orbResizeHandle.addEventListener('pointerdown', this.handleResizePointerDown);
    this.orbResizeHandle.addEventListener('pointermove', this.handleResizePointerMove);
    this.orbResizeHandle.addEventListener('pointerup', this.handleResizePointerUp);
    this.orbResizeHandle.addEventListener('pointercancel', this.handleResizePointerUp);
    this.orbResizeHandle.addEventListener('keydown', this.handleResizeKeyDown);

    this.hud.addEventListener('click', (event) => {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      const target = event.target as Element | null;
      const format = target?.closest<HTMLElement>('[data-format]')?.dataset.format;
      if (format) {
        this.shareFormat = format as CardFormat;
        this.shareStatus.textContent = '';
        void this.renderShare();
        return;
      }

      const action = target?.closest<HTMLElement>('[data-act]')?.dataset.act;
      if (!action) return;

      if (action === 'pause') this.options.onPause();
      if (action === 'collapse') this.setCollapsed(true);
      if (action === 'expand') {
        this.setCollapsed(false);
        if (this.panel === 'receipt') this.hud.dataset.state = 'receipt';
        if (this.panel === 'share') this.hud.dataset.state = 'share';
        this.applyPosition();
      }
      if (action === 'hide') {
        this.setVisible(false);
        this.options.onHide();
      }
      if (action === 'dock') this.resetDock();
      if (action === 'share') void this.openShare();
      if (action === 'dismiss') this.clearReceipt();
      if (action === 'close-share') {
        this.panel = 'receipt';
        this.hud.dataset.panel = 'receipt';
        this.hud.dataset.state = 'receipt';
        this.applyPosition();
      }
      if (action === 'copy-card') void this.copyShare();
      if (action === 'download-card') void this.downloadShare();
    });

    this.hud.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (this.panel === 'share') {
        this.panel = 'receipt';
        this.hud.dataset.panel = 'receipt';
        this.hud.dataset.state = 'receipt';
        this.applyPosition();
      } else if (this.panel === 'receipt') {
        this.clearReceipt();
      }
    });
  }
}
