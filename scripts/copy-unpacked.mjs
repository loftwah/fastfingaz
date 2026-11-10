import { cp, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const candidates = ['.output/chrome-mv3', '.output/chrome-mv3-dev'];
const dest = path.resolve('unpacked');

let source = null;
for (const candidate of candidates) {
  try {
    await stat(path.resolve(candidate, 'manifest.json'));
    source = path.resolve(candidate);
    break;
  } catch {
    // Try the next build.
  }
}

if (!source) {
  console.error(
    'No build found. Run `npm run build` (production) or `npm run dev` (development) first.',
  );
  process.exit(1);
}

await rm(dest, { recursive: true, force: true });
await cp(source, dest, { recursive: true });
console.log(`Copied ${path.relative(process.cwd(), source)} -> unpacked/`);
console.log('Load the `unpacked` folder in chrome://extensions (Developer mode).');
