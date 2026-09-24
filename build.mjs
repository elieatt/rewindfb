// Bundles the extension into dist/, which is the folder to load in Chrome.
// Usage: node build.mjs [--watch]
import { cp, mkdir, rm } from 'node:fs/promises';
import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: {
    // Runs in Facebook's page. Content scripts can't load modules, so everything is bundled into one file.
    main: 'src/content/index.ts',
    bridge: 'src/bridge.ts',
    background: 'src/background.ts',
  },
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  target: 'chrome111', // first version with "world": "MAIN" content scripts
  // Left readable on purpose: store reviewers and users can read exactly what runs.
  minify: false,
  legalComments: 'none',
  sourcemap: watch ? 'inline' : false,
  logLevel: 'info',
};

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });

if (watch) {
  const context = await esbuild.context(options);
  await context.watch();
} else {
  await esbuild.build(options);
}
