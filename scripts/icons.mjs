import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const sizes = [16, 32, 48, 128];
const outDir = path.join(process.cwd(), 'public/icon');
mkdirSync(outDir, { recursive: true });

const svg = readFileSync(path.join(process.cwd(), 'assets/icon.svg'));

for (const size of sizes) {
  const out = path.join(outDir, `${size}.png`);
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile(out);
  console.log(`wrote ${path.relative(process.cwd(), out)}`);
}
