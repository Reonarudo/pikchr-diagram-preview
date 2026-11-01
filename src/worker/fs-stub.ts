// The pikchr engine is an Emscripten build for Node with its wasm embedded. Its only `fs` use is
// a file-reading path that never runs when the binary is embedded; this stands in for it.
export function readFileSync(): never {
  throw new Error('there is no file system in the render worker');
}
export default { readFileSync };
