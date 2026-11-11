#!/usr/bin/env node
/**
 * Builds the static marketing site into site/dist.
 *
 * The source in site/ is plain HTML/CSS. This script copies it together with
 * the self-hosted Geist fonts, the designed social art and the real product
 * captures, then generates the web-manifest icons.
 */
import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'site');
const out = path.join(source, 'dist');
const art = path.join(root, 'docs', 'art');

async function copy(sourcePath, targetPath) {
  await cp(sourcePath, targetPath, { recursive: true });
}

async function sizeOf(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) total += await sizeOf(full);
    else total += (await stat(full)).size;
  }
  return total;
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

// 1. The site itself, minus the build output.
for (const entry of await readdir(source, { withFileTypes: true })) {
  if (entry.name === 'dist') continue;
  await copy(path.join(source, entry.name), path.join(out, entry.name));
}

// 2. Self-hosted fonts.
await mkdir(path.join(out, 'fonts'), { recursive: true });
for (const file of ['Geist-Variable.woff2', 'GeistMono-Variable.woff2', 'GeistPixel-Square.woff2', 'OFL.txt']) {
  await copy(path.join(root, 'public', 'fonts', file), path.join(out, 'fonts', file));
}

// 3. Social art at the exact store and social sizes.
await mkdir(path.join(out, 'social'), { recursive: true });
for (const file of await readdir(path.join(art, 'social'))) {
  await copy(path.join(art, 'social', file), path.join(out, 'social', file));
}
await copy(path.join(art, 'promo-440x280.png'), path.join(out, 'social', 'promo-440x280.png'));

// 4. Real captures and share cards.
await mkdir(path.join(out, 'assets', 'cards'), { recursive: true });
await copy(path.join(art, 'source', 'hud-typing.png'), path.join(out, 'assets', 'hud-typing.png'));
await copy(
  path.join(art, 'source', 'hud-typing@2x.png'),
  path.join(out, 'assets', 'hud-typing@2x.png'),
);
await copy(path.join(art, 'source', 'hud-typing.webp'), path.join(out, 'assets', 'hud-typing.webp'));
await copy(
  path.join(art, 'source', 'hud-typing@2x.webp'),
  path.join(out, 'assets', 'hud-typing@2x.webp'),
);
await copy(path.join(art, 'hud-2048.png'), path.join(out, 'assets', 'hud-in-chat.png'));
await copy(path.join(art, 'hud-receipt.png'), path.join(out, 'assets', 'receipt.png'));
await copy(path.join(art, 'store-1280x800.png'), path.join(out, 'assets', 'store-1280x800.png'));
await copy(path.join(art, 'share', 'fastfingaz-landscape.png'), path.join(out, 'assets', 'cards', 'landscape.png'));
await copy(path.join(art, 'share', 'fastfingaz-square.png'), path.join(out, 'assets', 'cards', 'square.png'));
await copy(path.join(art, 'share', 'fastfingaz-story.png'), path.join(out, 'assets', 'cards', 'story.png'));

// Small WebP previews for the on-page format examples. The full-size PNGs
// remain the download/source assets; the preview is displayed at 140–340px.
for (const [sourceName, targetName, width] of [
  ['landscape.png', 'landscape-preview.webp', 960],
  ['square.png', 'square-preview.webp', 640],
  ['story.png', 'story-preview.webp', 360],
]) {
  await sharp(path.join(out, 'assets', 'cards', sourceName))
    .resize({ width })
    .webp({ quality: 82 })
    .toFile(path.join(out, 'assets', 'cards', targetName));
}

// 5. Icon set. The staged Pixel F PNGs are the source; do not upscale the
// 128px icon, because the maskable and Apple touch art have their own margins.
for (const [sourceName, targetName] of [
  ['icon-16.png', 'icon-16.png'],
  ['icon-32.png', 'icon-32.png'],
  ['icon-48.png', 'icon-48.png'],
  ['icon-128.png', 'icon-128.png'],
  ['icon-192.png', 'icon-192.png'],
  ['icon-512.png', 'icon-512.png'],
  ['icon-180.png', 'apple-touch-icon.png'],
  ['maskable-192.png', 'maskable-192.png'],
  ['maskable-512.png', 'maskable-512.png'],
]) {
  await copy(
    path.join(root, 'docs', 'brand', 'fastfingaz', sourceName),
    path.join(out, targetName),
  );
}

// 6. A tiny build note for the deploy log.
await writeFile(
  path.join(out, 'build.txt'),
  `fastfingaz site build\nbuilt: ${new Date().toISOString()}\nsource: site/\n`,
  'utf8',
);

const bytes = await sizeOf(out);
console.log(`site/dist ready: ${(bytes / 1024).toFixed(1)} KB`);
console.log('deploy with: npx wrangler pages deploy site/dist --project-name fastfingaz');
