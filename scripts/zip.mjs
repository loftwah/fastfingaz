import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
const out = path.join(process.cwd(), `thinktype-${pkg.version}.zip`);

try {
  rmSync(out);
} catch {
  // Nothing to replace.
}

execFileSync('zip', ['-r', out, '.', '-x', '.DS_Store', '*.map'], {
  cwd: path.join(process.cwd(), 'dist'),
  stdio: 'inherit',
});

console.log(`\nWrote ${path.relative(process.cwd(), out)}`);
