import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';

const demoRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: demoRoot,
  publicDir: path.resolve(demoRoot, '../public'),
  server: {
    port: 4173,
    strictPort: true,
    fs: {
      allow: [path.resolve(demoRoot, '..')],
    },
  },
  build: {
    outDir: path.resolve(demoRoot, 'dist'),
    emptyOutDir: true,
  },
});
