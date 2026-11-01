// Throwaway spike (plan phase 1): can an Obsidian plugin host the pikchr renderer's
// worker_threads worker and wait on it with Atomics.waitAsync? Every step is recorded in
// results.json beside this file and logged with the [spike] prefix.
'use strict';
const { Plugin, Notice } = require('obsidian');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const HEADER = 12, READY = 0, LENGTH = 1, ENGINE = 2, STARTING = 0, STARTED = 1;

function waited(state, slot, expected, ms) {
  const w = Atomics.waitAsync(state, slot, expected, ms);
  return w.async ? w.value : Promise.resolve(w.value);
}

module.exports = class SpikeWorker extends Plugin {
  async onload() {
    this.workers = [];
    this.results = { startedAt: new Date().toISOString(), steps: [] };
    const dir = path.join(this.app.vault.adapter.getBasePath(), this.manifest.dir);
    this.dir = dir;
    const step = async (name, fn) => {
      const t0 = performance.now();
      let entry;
      try {
        entry = { name, ok: true, value: await fn() };
      } catch (error) {
        entry = { name, ok: false, error: String(error && error.stack || error) };
      }
      entry.ms = Math.round(performance.now() - t0);
      this.results.steps.push(entry);
      console.log('[spike]', JSON.stringify(entry));
      this.flush();
      return entry;
    };

    await step('1 versions and worker_threads', () => {
      const wt = require('node:worker_threads');
      return { node: process.versions.node, electron: process.versions.electron, chrome: process.versions.chrome,
        workerType: typeof wt.Worker, isMainThread: wt.isMainThread, sab: typeof SharedArrayBuffer,
        crossOriginIsolated: globalThis.crossOriginIsolated, waitAsync: typeof Atomics.waitAsync };
    });

    await step('2 eval worker round trip', async () => {
      const { Worker } = require('node:worker_threads');
      const w = new Worker('require("node:worker_threads").parentPort.on("message", (m) => require("node:worker_threads").parentPort.postMessage(m * 2))', { eval: true });
      this.workers.push(w);
      const answer = await new Promise((resolve, reject) => {
        w.once('message', resolve); w.once('error', reject); w.postMessage(21);
        setTimeout(() => reject(new Error('no answer in 5 s')), 5000);
      });
      const code = await w.terminate();
      return { answer, exitCode: code };
    });

    await step('3 Atomics.waitAsync and Atomics.wait on main thread', async () => {
      const { Worker } = require('node:worker_threads');
      const buffer = new SharedArrayBuffer(4);
      const state = new Int32Array(buffer);
      let syncWait;
      try { syncWait = Atomics.wait(state, 0, 0, 1); } catch (e) { syncWait = 'throws: ' + e.message; }
      const w = new Worker('const {workerData}=require("node:worker_threads"); const s=new Int32Array(workerData); setTimeout(()=>{Atomics.store(s,0,1);Atomics.notify(s,0)},200)', { eval: true, workerData: buffer });
      this.workers.push(w);
      const t0 = performance.now();
      const value = await waited(state, 0, 0, 5000);
      const elapsed = Math.round(performance.now() - t0);
      await w.terminate();
      return { syncWait, waitAsync: value, elapsed };
    });

    const pkg = path.join(dir, 'renderer/node_modules/@reonarudo/pikchr-renderer');
    await step('4a require(esm) of the renderer', () => {
      const lib = require(path.join(pkg, 'dist/index.js'));
      return { exports: Object.keys(lib) };
    });
    await step('4b import() of the renderer', async () => {
      const lib = await import(pathToFileURL(path.join(pkg, 'dist/index.js')).href);
      return { exports: Object.keys(lib) };
    });
    await step('4c library createRuntime (async start only)', async () => {
      const lib = require(path.join(pkg, 'dist/index.js'));
      const runtime = await lib.createRuntime();
      let sync;
      try { sync = runtime.render({ source: 'box "hi"' }).status; } catch (e) { sync = 'throws: ' + e.message; }
      await runtime.dispose();
      return { syncRender: sync };
    });

    await step('5 drive dist/worker.js with waitAsync', async () => {
      const { Worker } = require('node:worker_threads');
      const outputBytes = 4 * 1024 * 1024;
      const buffer = new SharedArrayBuffer(HEADER + 2 * outputBytes + 65536);
      const state = new Int32Array(buffer, 0, HEADER / 4);
      const bytes = new Uint8Array(buffer, HEADER);
      const t0 = performance.now();
      const w = new Worker(pathToFileURL(path.join(pkg, 'dist/worker.js')), {
        workerData: { buffer }, env: {}, stdout: true, stderr: true, resourceLimits: { maxOldGenerationSizeMb: 128 }
      });
      this.workers.push(w);
      w.stdout.resume(); w.stderr.resume(); w.on('error', (e) => console.log('[spike] worker error', e));
      const started = await waited(state, ENGINE, STARTING, 10000);
      const startup = Math.round(performance.now() - t0);
      const engine = Atomics.load(state, ENGINE);
      const renders = [];
      for (const source of ['box "hi"', 'circle "a"; arrow; box "b"', 'this is not pikchr']) {
        const t1 = performance.now();
        Atomics.store(state, READY, 0);
        w.postMessage({ source, outputBytes });
        const r = await waited(state, READY, 0, 3000);
        const reply = JSON.parse(new TextDecoder().decode(bytes.slice(0, Atomics.load(state, LENGTH))));
        renders.push({ wait: r, ms: Math.round(performance.now() - t1), status: reply.status,
          head: (reply.output || reply.message || '').slice(0, 80) });
      }
      // Leave this worker alive so unload (step 6) has a live thread to terminate.
      return { started, engineStarted: engine === STARTED, startup, renders };
    });

    await step('7 require cache across reloads', () => ({
      cachedEntries: Object.keys(require.cache).filter((k) => k.includes('pikchr-renderer')).length
    }));

    new Notice('Spike finished: see results.json in the spike-worker folder');
  }

  flush() {
    try { fs.writeFileSync(path.join(this.dir, 'results.json'), JSON.stringify(this.results, null, 2)); } catch (_) {}
  }

  async onunload() {
    const codes = await Promise.all(this.workers.map((w) => w.terminate().catch((e) => String(e))));
    this.results.unload = { at: new Date().toISOString(), terminated: codes.length, codes, memory: process.memoryUsage() };
    console.log('[spike] unload', JSON.stringify(this.results.unload));
    this.flush();
  }
};
