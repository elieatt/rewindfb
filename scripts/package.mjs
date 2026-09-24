// Zips dist/ for upload to the Chrome Web Store or Edge Add-ons.
// Usage: npm run package (builds first).
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { zipSync } from 'fflate';

const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8'));

async function filesIn(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => (entry.isDirectory() ? filesIn(join(dir, entry.name)) : [join(dir, entry.name)])),
  );
  return nested.flat();
}

const files = {};
for (const path of await filesIn('dist')) {
  // Zip paths always use forward slashes, whatever the OS.
  files[relative('dist', path).replaceAll('\\', '/')] = await readFile(path);
}

const name = `rewind-for-facebook-${manifest.version}.zip`;
await writeFile(name, zipSync(files, { level: 9 }));
console.log(`${name}: ${Object.keys(files).length} files`);
