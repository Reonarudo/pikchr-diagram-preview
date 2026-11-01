# 0001: Render in a browser Worker built from the renderer's worker code

Status: accepted, 2026-10-31.

## Context

pikchr-renderer is a Node library: `createRuntime()` starts a `node:worker_threads` Worker and
`render()` blocks on it with `Atomics.wait`. The VS Code extension calls it from a synchronous
markdown-it rule. An Obsidian plugin runs on the window's main thread of Electron's renderer
process. The spike (docs/spike-worker-threads.md) measured, in Obsidian 1.14.4 (Electron 43.7.7,
Node 24.21.0):

- `worker_threads` loads but cannot create a Worker ("The V8 platform used by this instance of
  Node does not support creating Workers"), so the library's runtime cannot start.
- `ELECTRON_RUN_AS_NODE` is fused off, so the plugin cannot fork Obsidian as a Node host.
- A browser `Worker` started from a blob URL runs an esbuild bundle of the renderer's worker
  code: engine start 76 ms, renders under 5 ms.

The alternatives were a system Node 22+ spawned as a host process (every user must install Node)
and adding a browser entry to each renderer package (six renderer releases before any plugin).
The user chose the browser Worker bundle, built by the plugin.

## Decision

- `src/worker/entry.ts` ports the renderer's `dist/worker.js`: the same engine calls and the
  same `interpret` (and through it the sanitizer), imported from the installed package.
  `scripts/worker-bundle.mjs` bundles it with esbuild for the browser; the engine's dead Node
  paths (`fs`, `__dirname`, `process.argv`) are stubbed. `scripts/build.mjs` embeds the bundle in
  `main.js` as a string, started from a blob URL.
- The worker answers with `postMessage` instead of the library's SharedArrayBuffer protocol:
  rendering is asynchronous in Obsidian, so the shared buffer bought nothing, and dropping it
  removes the need for SharedArrayBuffer and `Atomics.waitAsync`.
- `src/host.ts` ports `createRuntime` with the library's option validation, defaults (3 s per
  render, 10 s start-up, 64 000 characters, 4 MiB output), wording and recovery (terminate on
  timeout or a discarded engine, fresh worker on the next render). Renders are queued, one at a
  time, on one worker.
- The renderer package stays untouched and is still the dependency, pinned to its release
  tarball; its version in `package.json` decides the engine and sanitizer that ship.

## Consequences

- No Node, no files written, nothing extracted: `main.js`, `manifest.json` and `styles.css` are
  the whole plugin, as Obsidian's community install expects.
- A browser Worker has no heap cap like `resourceLimits`; a runaway render is stopped only by
  the time limit. pikchr's wasm memory is fixed at build time, which bounds it.
- The plugin's worker entry must be kept in step with the renderer's `worker.ts` when the
  renderer changes; `test/worker.test.ts` runs the embedded bundle against the real engine.
- `isDesktopOnly` stays `true` until the plugin is tried on mobile, although nothing in it
  needs Node or Electron.
