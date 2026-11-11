import { clearSessions, exportAll, loadSettings, saveSettings } from '../../shared/storage';
import type { Settings } from '../../shared/types';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Fastfingaz options: missing #${id}`);
  return el as T;
};

let settings: Settings | null = null;
let toastTimer: number | null = null;
let sliderTimer: number | null = null;

function toast(message: string): void {
  const el = $('toast');
  el.textContent = message;
  el.hidden = false;
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el.hidden = true;
  }, 2400);
}

function paint(next: Settings): void {
  settings = next;
  const idle = $('idle') as HTMLInputElement;
  idle.value = String(next.idleThresholdMs);
  $('idle-value').textContent = `${(next.idleThresholdMs / 1000).toFixed(1)}s`;

  ($('minchars') as HTMLInputElement).value = String(next.minSessionChars);
  ($('show-hud') as HTMLInputElement).checked = next.showHud;
  ($('show-rail') as HTMLInputElement).checked = next.showRail;
  ($('store-text') as HTMLInputElement).checked = next.storeText;
}

async function persist(patch: Partial<Settings>): Promise<void> {
  settings = await saveSettings(patch);
}

function bind(): void {
  const idle = $('idle') as HTMLInputElement;
  idle.addEventListener('input', () => {
    const value = Number(idle.value);
    $('idle-value').textContent = `${(value / 1000).toFixed(1)}s`;
    if (sliderTimer) window.clearTimeout(sliderTimer);
    sliderTimer = window.setTimeout(() => {
      void persist({ idleThresholdMs: value });
    }, 200);
  });

  const minChars = $('minchars') as HTMLInputElement;
  minChars.addEventListener('change', () => {
    const value = Math.max(0, Math.min(200, Math.round(Number(minChars.value) || 0)));
    minChars.value = String(value);
    void persist({ minSessionChars: value });
  });

  ($('show-hud') as HTMLInputElement).addEventListener('change', (event) => {
    void persist({ showHud: (event.target as HTMLInputElement).checked });
  });

  ($('show-rail') as HTMLInputElement).addEventListener('change', (event) => {
    void persist({ showRail: (event.target as HTMLInputElement).checked });
  });

  ($('store-text') as HTMLInputElement).addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;
    if (
      input.checked &&
      !window.confirm(
        'Store the text of prompts you send, locally on this machine? Exports will include your words.',
      )
    ) {
      input.checked = false;
      return;
    }
    void persist({ storeText: input.checked });
  });

  $('reset-pos').addEventListener('click', () => {
    void persist({ hudPos: null }).then(() => toast('HUD POSITION RESET'));
  });

  $('reset-orb').addEventListener('click', () => {
    void persist({ hudOrbSize: 60 }).then(() => toast('ORB SIZE RESET'));
  });

  $('export').addEventListener('click', async () => {
    try {
      const json = await exportAll();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fastfingaz-export-${date}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast('EXPORT DOWNLOADED');
    } catch {
      toast('EXPORT FAILED');
    }
  });

  $('clear').addEventListener('click', async () => {
    if (!window.confirm('Delete every saved session? This cannot be undone.')) return;
    await clearSessions();
    toast('ALL SESSIONS CLEARED');
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (!Object.keys(changes).some((key) => key.startsWith('tt:'))) return;
    void loadSettings().then((next) => {
      paint(next);
    });
  });
}

async function init(): Promise<void> {
  settings = await loadSettings();
  paint(settings);
  const version = chrome.runtime.getManifest().version;
  $('version').textContent = version;
  $('version-line').textContent = version;
  bind();
}

void init();
