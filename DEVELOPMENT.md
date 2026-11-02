# Developing Pikchr Diagram Preview

How the plugin works inside, and how to build, test and release it. For using the plugin, see
[README.md](README.md).

## How it renders

Rendering runs in a Web Worker inside Obsidian, built from
[pikchr-renderer](https://github.com/Reonarudo/pikchr-renderer): Pikchr compiled to
WebAssembly, and an allowlist sanitizer for its SVG. Nothing is downloaded, installed or written
to disk; the worker is embedded in `main.js`.

The worker starts with the first diagram drawn, so a vault without pikchr blocks never loads the
engine. Diagrams also draw in embedded notes, hover previews, Canvas cards and exported PDFs (in
light colours). Settings appear in Obsidian's settings search. On an Obsidian
whose built-in Chromium predates `light-dark()`, diagrams keep the white card in dark themes.

Works on desktop and on Obsidian's mobile apps, where the source button stays visible (there is
no hover to reveal it). Nothing in the plugin needs Node or Electron.

## Development

Requires Node 22 or newer (see `.nvmrc`).

~~~sh
npm ci
npm run lint        # tsc --noEmit
npm test            # node --test: attributes, toggle, scanner, DOM, host, and the real worker bundle
npm run build       # main.js, with the worker bundle embedded
npm run vault       # link this repo into ../test-vault as an enabled plugin
npm run test:live   # a real Obsidian with a throwaway profile and vault, driven over CDP
~~~

`npm run test:live` needs Obsidian installed (`OBSIDIAN_EXECUTABLE` overrides the path); it
prints where it saved light and dark screenshots.

The renderer is pinned to a release tarball in `package.json` (`.npmrc` sets
`allow-remote=root` for npm 12). To take a new release, edit the URL, run `npm install`, check
`src/worker/entry.ts` against the release's `src/worker.ts`, and run the tests.


## Releasing

Push a version tag (`x.y.z`, equal to the version in `manifest.json`). The release workflow in
`.github/workflows/release.yml` checks, tests and builds that commit, attests `main.js`,
`manifest.json` and `styles.css`, and publishes them as the release.
