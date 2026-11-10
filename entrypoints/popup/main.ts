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
import { aggregate, dailyBuckets, dayKey } from '../../shared/metrics';
import {
  cardSummary,
  copyCardImage,
  downloadCard,
  ensureCardFonts,
  renderCard,
} from '../../shared/share-card';
import { loadSessions, loadSettings } from '../../shared/storage';
import type { SessionRecord, Settings } from '../../shared/types';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Thinktype popup: missing #${id}`);
  return el as T;
};

const media = window.matchMedia('(prefers-color-scheme: dark)');

let settings: Settings | null = null;
let sessions: SessionRecord[] = [];
let selectedId: string | null = null;
let toastTimer: number | null = null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function applyTheme(): void {
  const setting = settings?.theme ?? 'auto';
  const resolved = setting === 'auto' ? (media.matches ? 'dark' : 'light') : setting;
  document.documentElement.dataset.theme = resolved;
}

function pluralSessions(count: number): string {
  return pluralize(count, 'session').toUpperCase();
}

function renderMain(): void {
  const today = sessions.filter((session) => dayKey(session.startedAt) === dayKey(Date.now()));
  const stats = aggregate(today);

  $('today-think').textContent = stats.sessions ? formatWpm(stats.thinkWpm) : '—';
  $('today-flow').textContent = stats.sessions ? formatWpm(stats.flowWpm) : '—';
  $('today-count').textContent = today.length ? pluralSessions(today.length) : 'NO SESSIONS';

  $('today-summary').textContent = stats.sessions
    ? `${formatWords(stats.words)} words / ${formatDuration(stats.activeMs)} hands-on${
        stats.consistency ? ` / ${Math.round(stats.consistency)}% steady` : ''
      }`
    : 'No readings yet today. Open ChatGPT and write something you actually care about.';

  renderChart();
  renderSessions();
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
      const badge = session.pasteRatio >= 0.5 ? '<span class="badge">PASTED</span>' : '';
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
  if (session.pasteRatio >= 0.5) {
    return 'Most of this message was pasted. It is saved for completeness but excluded from your averages.';
  }
  if (session.confidence < 0.6) {
    return 'Low signal: some text was pasted, replaced by autocorrect, or typed with an input method. Treat these numbers as approximate.';
  }
  return 'Measured locally from keystrokes in the ChatGPT composer. Only numbers are stored — never your words.';
}

async function openDetail(id: string): Promise<void> {
  const session = sessions.find((item) => item.id === id);
  if (!session) return;
  selectedId = id;

  $('view-main').hidden = true;
  $('view-detail').hidden = false;
  $('detail-serial').textContent = `NO. ${serialFromId(session.id)}`;
  $('detail-date').textContent = formatDate(session.startedAt).toUpperCase();
  $('detail-think').textContent = formatWpm(session.wpm.think);
  $('detail-flow').textContent = formatWpm(session.wpm.flow);

  $('detail-stats').innerHTML = statRows(session)
    .map(
      ([label, value]) =>
        `<div class="stat"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`,
    )
    .join('');

  $('detail-note').textContent = detailNote(session);
  window.scrollTo({ top: 0 });

  await ensureCardFonts();
  if (selectedId !== id) return;
  const preview = $('card-preview');
  preview.replaceChildren();
  const canvas = renderCard(session);
  canvas.setAttribute('aria-label', 'Share receipt preview');
  preview.appendChild(canvas);
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

  $('copy-image').addEventListener('click', async () => {
    const session = currentSession();
    if (!session) return;
    const button = $('copy-image') as HTMLButtonElement;
    button.disabled = true;
    try {
      const result = await copyCardImage(session);
      toast(result === 'copied' ? 'RECEIPT COPIED TO CLIPBOARD' : 'RECEIPT DOWNLOADED');
    } catch {
      toast('COULD NOT CREATE THE RECEIPT');
    } finally {
      button.disabled = false;
    }
  });

  $('download-image').addEventListener('click', async () => {
    const session = currentSession();
    if (!session) return;
    try {
      await downloadCard(session);
      toast('RECEIPT DOWNLOADED');
    } catch {
      toast('COULD NOT CREATE THE RECEIPT');
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

  media.addEventListener('change', applyTheme);

  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area !== 'local') return;
    void refresh();
  });
}

async function refresh(): Promise<void> {
  settings = await loadSettings();
  sessions = await loadSessions();
  applyTheme();
  if (selectedId) {
    if (sessions.some((session) => session.id === selectedId)) void openDetail(selectedId);
    else showMain();
  } else {
    renderMain();
  }
}

async function init(): Promise<void> {
  settings = await loadSettings();
  sessions = await loadSessions();
  applyTheme();
  $('version').textContent = `V${chrome.runtime.getManifest().version}`;
  bind();
  renderMain();
}

void init();
