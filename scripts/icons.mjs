import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const sizes = [16, 32, 48, 128];
const outDir = path.join(process.cwd(), 'src/assets/icons');
mkdirSync(outDir, { recursive: true });

const svg = readFileSync(path.join(process.cwd(), 'src/assets/icon.svg'));

for (const size of sizes) {
  const out = path.join(outDir, `icon-${size}.png`);
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile(out);
  console.log(`wrote ${path.relative(process.cwd(), out)}`);
}
