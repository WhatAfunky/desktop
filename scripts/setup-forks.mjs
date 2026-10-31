// The editor is built from local forks of scratch-gui and scratch-vm (see webpack.config.cjs).
// scratch-gui normally generates some files in its prepublish step; the copy npm installed in
// node_modules already ran it, so copy those outputs into the fork instead of downloading again.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const installedGui = path.join(root, 'node_modules/scratch-gui');
const forkGui = path.resolve(process.env.SCRATCH_GUI || path.join(root, '../scratch-gui'));
const forkVm = path.resolve(process.env.SCRATCH_VM || path.join(root, '../scratch-vm'));

for (const fork of [forkGui, forkVm]) {
  if (!fs.existsSync(path.join(fork, 'package.json'))) {
    console.error(`Missing fork: ${fork}`);
    process.exit(1);
  }
}

for (const generated of ['src/generated', 'static/microbit']) {
  const from = path.join(installedGui, generated);
  const to = path.join(forkGui, generated);
  fs.cpSync(from, to, {recursive: true});
  console.log(`Copied ${generated} -> ${to}`);
}
