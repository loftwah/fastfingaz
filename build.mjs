import * as esbuild from 'esbuild';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const flags = new Set(process.argv.slice(2));
const watch = flags.has('--watch');
const demoOnly = flags.has('--demo');

const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));

const base = {
  bundle: true,
  sourcemap: true,
  target: ['chrome116'],
  logLevel: 'info',
  legalComments: 'none',
  loader: { '.css': 'text' },
};

async function copyStatic() {
  await mkdir(dist, { recursive: true });

  const manifest = JSON.parse(await readFile('src/manifest.json', 'utf8'));
  manifest.version = pkg.version;
  await writeFile(path.join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  await cp('src/assets/icons', path.join(dist, 'icons'), { recursive: true });
  await cp('src/popup/popup.html', path.join(dist, 'popup/popup.html'));
  await cp('src/popup/popup.css', path.join(dist, 'popup/popup.css'));
  await cp('src/options/options.html', path.join(dist, 'options/options.html'));
  await cp('src/options/options.css', path.join(dist, 'options/options.css'));
}

const extensionBuilds = [
  {
    entryPoints: ['src/content/index.ts'],
    outfile: path.join(dist, 'content.js'),
    format: 'iife',
  },
  {
    entryPoints: ['src/background.ts'],
    outfile: path.join(dist, 'background.js'),
    format: 'iife',
  },
  {
    entryPoints: ['src/popup/popup.ts'],
    outfile: path.join(dist, 'popup/popup.js'),
    format: 'iife',
  },
  {
    entryPoints: ['src/options/options.ts'],
    outfile: path.join(dist, 'options/options.js'),
    format: 'iife',
  },
];

async function buildExtension() {
  await copyStatic();
  if (watch) {
    const contexts = await Promise.all(
      extensionBuilds.map((opts) => esbuild.context({ ...base, ...opts })),
    );
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log('\nWatching for changes. Reload dist/ in chrome://extensions.\n');
    return;
  }
  await Promise.all(extensionBuilds.map((opts) => esbuild.build({ ...base, ...opts })));
  console.log(`\nBuilt Thinktype ${pkg.version} -> dist/\n`);
}

async function buildDemo() {
  await mkdir(path.join(root, 'demo/dist'), { recursive: true });
  const opts = {
    ...base,
    entryPoints: ['demo/preview.ts'],
    outfile: path.join(root, 'demo/dist/preview.js'),
    format: 'iife',
    sourcemap: true,
  };
  if (watch) {
    const ctx = await esbuild.context(opts);
    await ctx.watch();
  } else {
    await esbuild.build(opts);
    console.log('\nBuilt demo -> demo/dist/preview.js\n');
  }
}

if (demoOnly) {
  await buildDemo();
} else {
  await buildExtension();
  if (watch) await buildDemo();
}
