// Bundles src/worker/entry.ts for a browser Worker and returns its source, which build.mjs embeds
// in main.js. The renderer package's interpreter, sanitizer and Emscripten engine are reached
// through `#renderer/...`, since its public `exports` name only the Node entry point.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(join(root, 'package.json'));
export const rendererDir = dirname(require.resolve('@reonarudo/pikchr-renderer/package.json'));

const renderer = {
  name: 'renderer-files',
  setup(context) {
    context.onResolve({ filter: /^#renderer\// }, (args) => ({ path: join(rendererDir, args.path.slice('#renderer/'.length)) }));
  }
};

export async function bundleWorker({ minify = true } = {}) {
  const result = await build({
    absWorkingDir: root,
    entryPoints: ['src/worker/entry.ts'],
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    target: 'chrome120',
    minify,
    legalComments: 'none',
    alias: { 'node:fs': './src/worker/fs-stub.ts' },
    inject: ['src/worker/node-globals.ts'],
    plugins: [renderer],
    logLevel: 'warning'
  });
  return result.outputFiles[0].text;
}
