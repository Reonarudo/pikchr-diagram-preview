// The render worker, bundled for a browser Worker by scripts/worker-bundle.mjs and embedded in
// main.js. A port of pikchr-renderer's dist/worker.js: the same engine calls and the same
// `interpret` (which sanitizes the SVG), answering over postMessage instead of shared memory.
import { interpret } from '#renderer/dist/interpret.js';
import load from '#renderer/vendor/pikchr/pikchr.cjs';
import type { Reply, Request, Started } from '../protocol';

interface Engine {
  _pikchr(text: number, cls: number, flags: number, width: number, height: number): number;
  _malloc(size: number): number;
  _free(pointer: number): void;
  getValue(pointer: number, type: 'i32'): number;
  UTF8ToString(pointer: number): string;
  stringToUTF8(text: string, pointer: number, size: number): void;
  lengthBytesUTF8(text: string): number;
}

interface Scope {
  onmessage: ((event: { data: Request }) => void) | null;
  postMessage(message: Started | Reply): void;
}
const scope = self as unknown as Scope;

const PIKCHR_PLAINTEXT_ERRORS = 1;

/**
 * Run pikchr on one source, exactly as pikchr-renderer's worker does: the source is copied into
 * wasm memory with malloc, and the result is freed after reading. `zClass` is always NULL.
 */
function run(engine: Engine, source: string): { text: string; width: number } {
  const size = engine.lengthBytesUTF8(source) + 1;
  const text = engine._malloc(size);
  const dimensions = engine._malloc(8);
  try {
    engine.stringToUTF8(source, text, size);
    const result = engine._pikchr(text, 0, PIKCHR_PLAINTEXT_ERRORS, dimensions, dimensions + 4);
    const output = engine.UTF8ToString(result);
    const width = engine.getValue(dimensions, 'i32');
    engine._free(result);
    return { text: output, width };
  } finally {
    engine._free(text);
    engine._free(dimensions);
  }
}

(load as () => Promise<Engine>)().then((engine) => {
  scope.onmessage = ({ data: { id, source, outputBytes } }) => {
    let raw: { text: string; width: number };
    try {
      raw = run(engine, source);
    } catch (error) {
      // An abort leaves the instance unusable; the plugin discards this worker.
      const oom = error instanceof Error && /OOM/.test(error.message);
      const message = oom ? 'pikchr ran out of memory' : 'pikchr stopped unexpectedly';
      scope.postMessage({ type: 'reply', id, result: { status: 'failure', message }, discard: true });
      return;
    }
    scope.postMessage({ type: 'reply', id, result: interpret(raw.text, raw.width, source, outputBytes) });
  };
  scope.postMessage({ type: 'started' });
}, () => {
  // The error would name bundle internals; the reason stays plain.
  scope.postMessage({ type: 'failed', reason: 'pikchr could not start' });
});
