// Renders the extension icons from assets/*.svg into public/icons/.
// Usage: npm run icons (only needed after changing the SVGs; the PNGs are committed).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

/** Small sizes use the simplified artwork, whose details stay sharp at toolbar size. */
const sizes = [
  { size: 16, source: 'assets/icon-small.svg' },
  { size: 32, source: 'assets/icon-small.svg' },
  { size: 48, source: 'assets/icon.svg' },
  { size: 128, source: 'assets/icon.svg' },
];

await mkdir('public/icons', { recursive: true });
for (const { size, source } of sizes) {
  const svg = await readFile(source, 'utf8');
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  await writeFile(`public/icons/icon-${size}.png`, png);
  console.log(`public/icons/icon-${size}.png`);
}
