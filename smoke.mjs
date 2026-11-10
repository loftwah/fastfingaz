import { chromium } from 'playwright-core';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dist = path.resolve('dist');
const executablePath = `${os.homedir()}/Library/Caches/ms-playwright/chromium-1254/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const profile = mkdtempSync(path.join(os.tmpdir(), 'tt-profile-'));

const context = await chromium.launchPersistentContext(profile, {
  executablePath,
  headless: true,
  args: [
    `--disable-extensions-except=${dist}`,
    `--load-extension=${dist}`,
    '--no-first-run',
    '--no-default-browser-check',
  ],
});

const errors = [];
context.on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)));

let worker = context.serviceWorkers()[0];
if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 20000 });
const id = new URL(worker.url()).host;
console.log('extension id:', id);

const popup = await context.newPage();
await popup.goto(`chrome-extension://${id}/popup/popup.html`);
await popup.waitForTimeout(600);
console.log(
  'popup:',
  await popup.evaluate(() => ({
    title: document.title,
    think: document.getElementById('today-think')?.textContent,
    emptyVisible: !document.getElementById('empty')?.hidden,
    version: document.getElementById('version')?.textContent,
  })),
);

const options = await context.newPage();
await options.goto(`chrome-extension://${id}/options/options.html`);
await options.waitForTimeout(500);
console.log(
  'options:',
  await options.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    idle: document.getElementById('idle-value')?.textContent,
    version: document.getElementById('version')?.textContent,
  })),
);
await options.selectOption('#theme', 'light');
await options.waitForTimeout(500);
console.log(
  'settings round-trip:',
  await options.evaluate(async () => {
    const result = await chrome.storage.local.get('tt:settings:v1');
    return result['tt:settings:v1']?.theme;
  }),
);

const page = await context.newPage();
await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(6000);
const chat = await page.evaluate(() => ({
  url: location.href,
  hud: !!document.getElementById('thinktype-hud-host'),
  composer: !!document.querySelector('div.ProseMirror, textarea'),
  title: document.title,
}));
console.log('chatgpt:', chat);

if (chat.composer) {
  const composer = page.locator('div.ProseMirror, textarea').first();
  await composer.click();
  await page.keyboard.type('testing thinktype in a real extension build', { delay: 40 });
  await page.waitForTimeout(700);
  console.log(
    'hud:',
    await page.evaluate(() => {
      const root = document.getElementById('thinktype-hud-host')?.shadowRoot;
      return {
        state: root?.querySelector('.hud')?.getAttribute('data-state'),
        wpm: root?.querySelector('[data-wpm]')?.textContent,
        words: root?.querySelector('[data-words]')?.textContent,
      };
    }),
  );
  await page.keyboard.press('Meta+a');
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(1500);
}

console.log('page errors:', errors);
await page.screenshot({ path: '/private/tmp/thinktype-extension.png' });
await context.close();
