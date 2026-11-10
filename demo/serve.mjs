import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT || 4173);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://localhost:${port}`);
  const pathname = decodeURIComponent(url.pathname === '/' ? '/demo/preview.html' : url.pathname);
  const file = path.join(root, pathname);

  if (!file.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
    response.writeHead(200, {
      'content-type': types[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

server.listen(port, () => {
  console.log(`\nThinktype preview: http://localhost:${port}/demo/preview.html`);
  console.log(`Share card:        http://localhost:${port}/demo/card.html`);
  console.log(`HUD close-up:      http://localhost:${port}/demo/hud.html`);
  console.log(`Popup:             http://localhost:${port}/dist/popup/popup.html`);
  console.log(`Options:           http://localhost:${port}/dist/options/options.html\n`);
});
