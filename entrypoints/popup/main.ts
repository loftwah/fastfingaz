import { serialFromId } from '../../shared/brand';
import { GITHUB_URL } from '../../shared/constants';
import {
  formatClock,
  formatDate,
  formatDuration,
  formatRelative,
  formatWpm,
  formatWords,
  pluralize,
} from '../../shared/format';
import { aggregate, dailyBuckets, dayKey, emptyHistory, idleReadout } from '../../shared/metrics';
import {
  CARD_FORMATS,
  cardBlob,
  cardFileName,
  cardSummary,
  copyCardImage,
  downloadCard,
  ensureCardFonts,
  renderCard,
  type CardContext,
  type CardFormat,
} from '../../shared/share-card';
import { loadHistory, loadSessions, loadSettings, saveSettings } from '../../shared/storage';
import type { HistorySummary, SessionRecord } from '../../shared/types';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Thinktype popup: missing #${id}`);
  return el as T;
};

let sessions: SessionRecord[] = [];
let history: HistorySummary = emptyHistory();
let showHud = true;
let selectedId: string | null = null;
let selectedFormat: CardFormat = 'landscape';
let detailToken = 0;
let toastTimer: number | null = null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pluralSessions(count: number): string {
  return pluralize(count, 'session').toUpperCase();
}

function renderHudToggle(): void {
  const button = $('toggle-hud');
  button.setAttribute('aria-pressed', String(showHud));
  button.setAttribute(
    'aria-label',
    showHud ? 'HUD is visible. Hide it.' : 'HUD is hidden. Show it.',
  );
  $('hud-toggle-label').textContent = showHud ? 'HIDE HUD' : 'SHOW HUD';
}

async function refreshHudToggle(): Promise<void> {
  showHud = (await loadSettings()).showHud;
  renderHudToggle();
}

function renderMain(): void {
  const today = sessions.filter((session) => dayKey(session.startedAt) === dayKey(Date.now()));
  const stats = aggregate(today);
  const drafts = today.filter((session) => session.resumed).length;

  $('today-think').textContent = stats.sessions ? formatWpm(stats.thinkWpm) : '—';
  $('today-flow').textContent = stats.sessions ? formatWpm(stats.flowWpm) : '—';
  $('today-count').textContent = stats.sessions
    ? `${pluralSessions(stats.sessions)}${drafts ? ` / ${drafts} DRAFT` : ''}`
    : 'NO SESSIONS';

  $('today-summary').textContent = stats.sessions
    ? `${formatWords(stats.words)} words / ${formatDuration(stats.activeMs)} hands-on${
        stats.consistency ? ` / ${Math.round(stats.consistency)}% steady` : ''
      }`
    : 'No readings yet today. Open ChatGPT and write something you actually care about.';

  renderBaseline();
  renderChart();
  renderSessions();
}

function renderBaseline(): void {
  const idle = idleReadout(history);
  $('base-last').textContent = idle.last ? formatWpm(idle.last) : '—';
  $('base-best').textContent = idle.best ? formatWpm(idle.best) : '—';
  $('base-avg').textContent = idle.avg ? formatWpm(idle.avg) : '—';
  $('baseline-count').textContent = history.totals.recorded
    ? `${history.totals.recorded} READINGS / ${history.totals.drafts} DRAFTS`
    : 'NO READINGS';
}

function renderChart(): void {
  const buckets = dailyBuckets(sessions, 14);
  const withData = buckets.filter((bucket) => bucket.sessions > 0);
  const average = withData.length
    ? withData.reduce((sum, bucket) => sum + bucket.thinkWpm, 0) / withData.length
    : 0;
  $('chart-note').textContent = withData.length ? `${formatWpm(average)} AVG` : '';

  const width = 336;
  const height = 64;
  const gap = 6;
  const barWidth = (width - gap * 13) / 14;
  const todayKey = dayKey(Date.now());
  const max = Math.max(20, ...buckets.map((bucket) => bucket.thinkWpm));

  const bars = buckets
    .map((bucket, index) => {
      const barHeight =
        bucket.thinkWpm > 0 ? Math.max(2, (bucket.thinkWpm / max) * (height - 18)) : 1;
      const x = index * (barWidth + gap);
      const y = height - 10 - barHeight;
      const title = `${formatDate(bucket.date)} / ${pluralSessions(
        bucket.sessions,
      )} / ${formatWpm(bucket.thinkWpm)} THINK WPM`;
      return `<rect class="bar${bucket.key === todayKey ? ' today' : ''}" x="${x.toFixed(
        1,
      )}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(
        1,
      )}"><title>${escapeHtml(title)}</title></rect>`;
    })
    .join('');

  $('chart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Think WPM over the last 14 days">${bars}<line class="base" x1="0" y1="${
    height - 9
  }" x2="${width}" y2="${height - 9}"/></svg>`;
}

function renderSessions(): void {
  const list = $('sessions');
  const recent = sessions.slice(0, 8);
  $('recent-count').textContent = sessions.length ? `${sessions.length} TOTAL` : '';
  $('empty').hidden = sessions.length > 0;
  list.hidden = recent.length === 0;

  list.innerHTML = recent
    .map((session) => {
      const badges: string[] = [];
      if (session.resumed) badges.push('<span class="badge">DRAFT</span>');
      if (session.pasteRatio >= 0.5) badges.push('<span class="badge">PASTED</span>');
      if (session.ime) badges.push('<span class="badge">IME</span>');
      if (session.id === history.best.sessionId) badges.push('<span class="badge">BEST</span>');
      const badge = badges.join('');
      return `
        <li>
          <button class="row" data-id="${session.id}">
            <span class="row-serial">${serialFromId(session.id)}</span>
            <span class="row-wpm">${formatWpm(session.wpm.think)}<em>WPM</em></span>
            <span class="row-mid">
              <b>${formatWords(session.words)} words ${badge}</b>
              <span class="row-meta">${formatClock(session.wallMs)} / ${Math.round(
                session.confidence * 100,
              )}% SIGNAL</span>
            </span>
            <span class="row-when">${escapeHtml(formatRelative(session.startedAt))}</span>
          </button>
        </li>`;
    })
    .join('');
}

function statRows(session: SessionRecord): Array<[string, string]> {
  return [
    ['PEAK BURST', `${formatWpm(session.wpm.peak)} WPM`],
    [
      'CONSISTENCY',
      session.consistency > 0 ? `${Math.round(session.consistency)}%` : 'NOT ENOUGH DATA',
    ],
    ['CORRECTIONS', `${session.correctionRate.toFixed(1)}% OF EDITS`],
    [
      'THINKING PAUSES',
      session.pauses.count
        ? `${pluralize(session.pauses.count, 'pause').toUpperCase()} / ${(
            session.pauses.medianMs / 1000
          ).toFixed(1)}S MEDIAN`
        : 'NONE',
    ],
    ['HANDS-ON TIME', formatClock(session.activeMs)],
    ['MANUAL PAUSE', session.manualPauseMs ? formatClock(session.manualPauseMs) : 'NONE'],
    [
      'SENT AT',
      new Date(session.endedAt)
        .toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })
        .toUpperCase(),
    ],
    ['CHARACTERS', formatWords(session.chars)],
    ['SIGNAL', `${Math.round(session.confidence * 100)}%`],
  ];
}

function detailNote(session: SessionRecord): string {
  if (session.resumed) {
    return 'This reading resumed a draft that was already in the composer. It is kept as a draft and excluded from your best and averages.';
  }
  if (session.pasteRatio >= 0.5) {
    return 'Most of this message was pasted. Paste-dominated runs are not recorded as normal readings.';
  }
  if (session.ime) {
    return session.confidence >= 0.85
      ? 'This reading used an input method. The signal was strong enough to count, but treat the hands-on cadence as approximate.'
      : 'This reading used an input method. It counts toward your averages but is excluded from your best.';
  }
  if (session.confidence < 0.6) {
    return 'Low signal: some text was replaced by autocorrect or typed with an input method. Treat these numbers as approximate.';
  }
  return 'Measured locally from keystrokes in the ChatGPT composer. Only numbers are stored — never your words.';
}

function cardContext(): CardContext {
  return {
    bestThinkWpm: history.best.thinkWpm,
    bestFlowWpm: history.best.flowWpm,
    bestPeakWpm: history.best.peakWpm,
    avgThinkWpm: history.rolling.thinkWpm,
    avgFlowWpm: history.rolling.flowWpm,
  };
}

async function openDetail(id: string): Promise<void> {
  const session = sessions.find((item) => item.id === id);
  if (!session) return;
  selectedId = id;
  selectedFormat = 'landscape';

  $('view-main').hidden = true;
  $('view-detail').hidden = false;
  $('detail-serial').textContent = `NO. ${serialFromId(session.id)}`;
  $('detail-date').textContent = formatDate(session.startedAt).toUpperCase();
  $('detail-think').textContent = formatWpm(session.wpm.think);
  $('detail-flow').textContent = formatWpm(session.wpm.flow);
  $('detail-best').hidden = session.id !== history.best.sessionId;

  $('detail-stats').innerHTML = statRows(session)
    .map(
      ([label, value]) =>
        `<div class="stat"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`,
    )
    .join('');

  $('detail-note').textContent = detailNote(session);
  renderFormatTabs();
  window.scrollTo({ top: 0 });
  await renderDetailPreview();
}

function renderFormatTabs(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-format]').forEach((button) => {
    button.setAttribute('aria-selected', String(button.dataset.format === selectedFormat));
  });
}

async function renderDetailPreview(): Promise<void> {
  const session = currentSession();
  if (!session) return;
  const token = ++detailToken;
  const spec = CARD_FORMATS[selectedFormat];
  $('card-file').textContent = cardFileName(session, selectedFormat);
  $('card-size').textContent = 'RENDERING…';

  await ensureCardFonts();
  if (token !== detailToken) return;

  const preview = $('card-preview');
  preview.replaceChildren();
  const canvas = renderCard(session, selectedFormat, cardContext(), 1);
  canvas.style.display = 'block';
  canvas.style.width = 'auto';
  canvas.style.height = 'auto';
  canvas.style.maxWidth = '100%';
  canvas.style.maxHeight = '300px';
  canvas.setAttribute(
    'aria-label',
    `Share receipt preview, ${spec.width} by ${spec.height} pixels`,
  );
  preview.appendChild(canvas);

  try {
    const blob = await cardBlob(session, selectedFormat, cardContext());
    if (token !== detailToken) return;
    $('card-size').textContent = `${spec.width}×${spec.height} / ${Math.max(
      1,
      Math.round(blob.size / 1024),
    )} KB`;
  } catch {
    if (token !== detailToken) return;
    $('card-size').textContent = `${spec.width}×${spec.height}`;
  }
}

function showMain(): void {
  selectedId = null;
  $('view-detail').hidden = true;
  $('view-main').hidden = false;
  renderMain();
}

function toast(message: string): void {
  const el = $('toast');
  el.textContent = message;
  el.hidden = false;
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el.hidden = true;
  }, 2200);
}

function currentSession(): SessionRecord | null {
  return sessions.find((session) => session.id === selectedId) ?? null;
}

function bind(): void {
  $('toggle-hud').addEventListener('click', async () => {
    showHud = !showHud;
    renderHudToggle();
    await saveSettings({ showHud });
    if (!showHud) {
      toast('HUD HIDDEN — ALT+SHIFT+T TO SHOW');
      return;
    }
    let onChatGpt = false;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      onChatGpt = !!tab?.url && /^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(tab.url);
    } catch {
      // The active tab may be a restricted page.
    }
    toast(onChatGpt ? 'HUD SHOWN' : 'OPEN CHATGPT TO SEE THE HUD');
  });

  $('open-options').addEventListener('click', () => {
    void chrome.runtime.openOptionsPage();
  });

  $('github').addEventListener('click', (event) => {
    event.preventDefault();
    void chrome.tabs.create({ url: GITHUB_URL });
  });

  const openChatGpt = () => {
    void chrome.tabs.create({ url: 'https://chatgpt.com/' });
    window.close();
  };
  $('open-chatgpt').addEventListener('click', openChatGpt);
  $('empty-cta').addEventListener('click', openChatGpt);
  $('back').addEventListener('click', showMain);

  $('sessions').addEventListener('click', (event) => {
    const row = (event.target as Element | null)?.closest<HTMLElement>('[data-id]');
    if (row?.dataset.id) void openDetail(row.dataset.id);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-format]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedFormat = (button.dataset.format as CardFormat) ?? 'landscape';
      renderFormatTabs();
      void renderDetailPreview();
    });
  });

  $('copy-image').addEventListener('click', async () => {
    const session = currentSession();
    if (!session) return;
    const button = $('copy-image') as HTMLButtonElement;
    button.disabled = true;
    try {
      const result = await copyCardImage(session, selectedFormat, cardContext());
      toast(result === 'copied' ? 'CARD COPIED TO CLIPBOARD' : 'CARD DOWNLOADED');
    } catch {
      toast('COULD NOT CREATE THE CARD');
    } finally {
      button.disabled = false;
    }
  });

  $('download-image').addEventListener('click', async () => {
    const session = currentSession();
    if (!session) return;
    try {
      await downloadCard(session, selectedFormat, cardContext());
      toast('CARD DOWNLOADED');
    } catch {
      toast('COULD NOT CREATE THE CARD');
    }
  });

  $('copy-text').addEventListener('click', async () => {
    const session = currentSession();
    if (!session) return;
    try {
      await navigator.clipboard.writeText(cardSummary(session));
      toast('SUMMARY COPIED');
    } catch {
      toast('COULD NOT COPY SUMMARY');
    }
  });

  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area !== 'local') return;
    void refresh();
  });
}

async function refresh(): Promise<void> {
  [sessions, history] = await Promise.all([loadSessions(), loadHistory()]);
  await refreshHudToggle();
  if (selectedId) {
    if (sessions.some((session) => session.id === selectedId)) void openDetail(selectedId);
    else showMain();
  } else {
    renderMain();
  }
}

async function init(): Promise<void> {
  [sessions, history] = await Promise.all([loadSessions(), loadHistory()]);
  showHud = (await loadSettings()).showHud;
  $('version').textContent = `V${chrome.runtime.getManifest().version}`;
  bind();
  renderMain();
  renderHudToggle();
}

void init();
