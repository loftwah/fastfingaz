import { requestWorker, saveSettings } from '../../shared/messages';
import { STORAGE_KEYS } from '../../shared/constants';
import { MIN_ELIGIBLE_CHARS } from '../../shared/metrics';
import { exportAll, loadSettings } from '../../shared/storage';
import type { Settings } from '../../shared/types';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Fastfingaz options: missing #${id}`);
  return el as T;
};

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
  const idle = $('idle') as HTMLInputElement;
  idle.value = String(next.idleThresholdMs);
  $('idle-value').textContent = `${(next.idleThresholdMs / 1000).toFixed(1)}s`;

  const minChars = $('minchars') as HTMLInputElement;
  minChars.min = String(MIN_ELIGIBLE_CHARS);
  minChars.value = String(Math.max(MIN_ELIGIBLE_CHARS, next.minSessionChars));
  ($('show-hud') as HTMLInputElement).checked = next.showHud;
  ($('show-rail') as HTMLInputElement).checked = next.showRail;
  ($('store-text') as HTMLInputElement).checked = next.storeText;
}

async function persist(patch: Partial<Settings>, success?: string): Promise<void> {
  try {
    await saveSettings(patch);
    if (success) toast(success);
  } catch {
    paint(await loadSettings());
    toast('COULD NOT SAVE SETTINGS');
  }
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
    const value = Math.max(MIN_ELIGIBLE_CHARS, Math.min(200, Math.round(minChars.valueAsNumber || 0)));
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
    void persist({ hudPos: null }, 'HUD POSITION RESET');
  });

  $('reset-orb').addEventListener('click', () => {
    void persist({ hudOrbSize: 60 }, 'ORB SIZE RESET');
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
    try {
      await requestWorker({ type: 'clear-sessions' });
      toast('ALL SESSIONS CLEARED');
    } catch {
      toast('COULD NOT CLEAR SESSIONS');
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (!changes[STORAGE_KEYS.settings]) return;
    void loadSettings().then((next) => {
      paint(next);
    });
  });
}

async function init(): Promise<void> {
  paint(await loadSettings());
  const version = chrome.runtime.getManifest().version;
  $('version').textContent = version;
  $('version-line').textContent = version;
  bind();
}

void init();
