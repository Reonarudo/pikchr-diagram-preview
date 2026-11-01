// Modules that exist only at build time (scripts/worker-bundle.mjs and scripts/build.mjs).

/** The render worker's bundled source, embedded as a string. */
declare module 'virtual:render-worker' {
  const source: string;
  export default source;
}

/** Files inside the installed pikchr-renderer package, outside its public `exports`. */
declare module '#renderer/dist/interpret.js' {
  import type { RenderResult } from '@reonarudo/pikchr-renderer';
  export function interpret(text: string, width: number, source: string, outputBytes: number): RenderResult;
}
declare module '#renderer/vendor/pikchr/pikchr.cjs' {
  const load: () => Promise<unknown>;
  export default load;
}
