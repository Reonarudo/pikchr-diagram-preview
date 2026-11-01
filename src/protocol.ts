import type { RenderResult } from '@reonarudo/pikchr-renderer';

/**
 * Messages between the plugin and its render worker (docs/adr/0001-runtime-host.md).
 *
 * pikchr-renderer's own worker answers through a SharedArrayBuffer so its host can block with
 * `Atomics.wait`. Obsidian renders code blocks asynchronously, so this worker answers with plain
 * messages instead: no shared memory, no cross-origin isolation requirement.
 */

/** The plugin asks for one fence. */
export interface Request {
  id: number;
  source: string;
  outputBytes: number;
}

/** The worker's first message, once: its engine started, or why it did not. */
export type Started = { type: 'started' } | { type: 'failed'; reason: string };

/** The worker's answer to one request, and whether its engine must not be used again. */
export interface Reply {
  type: 'reply';
  id: number;
  result: RenderResult;
  discard?: true;
}

export type WorkerMessage = Started | Reply;
