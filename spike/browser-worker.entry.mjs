// Spike only (docs/spike-worker-threads.md): <renderer> stood for the installed
// @reonarudo/pikchr-renderer package directory. Browser-Worker port of pikchr-renderer's dist/worker.js: same shared-buffer protocol, but the
// buffer arrives in the first message instead of workerData, and replies go through self.
import { interpret } from '<renderer>/dist/interpret.js';
import load from '<renderer>/vendor/pikchr/pikchr.cjs';
const HEADER = 12, READY = 0, LENGTH = 1, ENGINE = 2, STARTED = 1, FAILED = 2;
let state, bytes;
function write(text) {
  const encoded = new TextEncoder().encode(text);
  if (encoded.length > bytes.length) throw new RangeError('reply exceeds the shared buffer');
  bytes.set(encoded); Atomics.store(state, LENGTH, encoded.length);
}
function reply(result) {
  try { write(JSON.stringify(result)); } catch { write(JSON.stringify({ status: 'failure', message: 'pikchr output is too large to return' })); }
  Atomics.store(state, READY, 1); Atomics.notify(state, READY);
}
function run(engine, source) {
  const size = engine.lengthBytesUTF8(source) + 1;
  const text = engine._malloc(size), dims = engine._malloc(8);
  try {
    engine.stringToUTF8(source, text, size);
    const result = engine._pikchr(text, 0, 1, dims, dims + 4);
    const output = engine.UTF8ToString(result); const width = engine.getValue(dims, 'i32');
    engine._free(result); return { text: output, width };
  } finally { engine._free(text); engine._free(dims); }
}
self.onmessage = (first) => {
  const buffer = first.data.buffer;
  state = new Int32Array(buffer, 0, HEADER / 4); bytes = new Uint8Array(buffer, HEADER);
  load().then((engine) => {
    self.onmessage = ({ data: { source, outputBytes } }) => {
      let raw;
      try { raw = run(engine, source); } catch (e) { reply({ status: 'failure', message: 'pikchr stopped unexpectedly', discard: true }); return; }
      reply(interpret(raw.text, raw.width, source, outputBytes));
    };
    Atomics.store(state, ENGINE, STARTED); Atomics.notify(state, ENGINE); self.postMessage('started');
  }, (e) => { write('pikchr could not start: ' + e); Atomics.store(state, ENGINE, FAILED); Atomics.notify(state, ENGINE); self.postMessage('failed'); });
};
