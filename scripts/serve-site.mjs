#!/usr/bin/env node
/** A dependency-free static server for site/dist, with Pages-style pretty URLs. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'site', 'dist');
const port = Number(process.env.PORT || 4174);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

async function resolveFile(urlPath) {
  const safe = path.posix.normalize('/' + urlPath.replace(/^\/+/, '')).replace(/\/$/, '');
  const candidates = [];

  if (safe === '/' || safe === '') candidates.push('index.html');
  else {
    candidates.push(safe.replace(/^[/\\]/, ''));
    if (!path.extname(safe)) {
      candidates.push(`${safe.replace(/^[/\\]/, '')}.html`);
      candidates.push(path.join(safe.replace(/^[/\\]/, ''), 'index.html'));
    }
  }

  for (const candidate of candidates) {
    const full = path.join(root, candidate);
    if (!full.startsWith(root + path.sep)) continue;
    try {
      const info = await stat(full);
      if (info.isFile()) return full;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

createServer(async (req, res) => {
  const url = req.url || '/';
  let pathname;
  try {
    pathname = decodeURIComponent(url.split('?')[0]);
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  const file = await resolveFile(pathname);
  const body = file && await readFile(file).catch(() => null);
  if (!body) {
    const notFound = await readFile(path.join(root, '404.html')).catch(() => null);
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(notFound || 'Not found');
    return;
  }
  res.writeHead(200, {
    'content-type': MIME[path.extname(file)] || 'application/octet-stream',
    'cache-control': 'no-cache',
    'x-content-type-options': 'nosniff',
  });
  res.end(body);
}).listen(port, '127.0.0.1', () => {
  console.log(`fastfingaz site: http://127.0.0.1:${port}`);
});
