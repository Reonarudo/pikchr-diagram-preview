import type { RenderResult } from '@reonarudo/pikchr-renderer';
import type { Reply, Request, Started, WorkerMessage } from './protocol';

/**
 * The render host: pikchr-renderer's `createRuntime`, ported from a blocking Node worker to an
 * asynchronous browser Worker (docs/adr/0001-runtime-host.md). Options, limits, defaults and the
 * wording of every result are the library's; what changed is that `render` returns a promise and
 * the worker answers by message.
 */

/** What the host needs from a worker; a browser `Worker` satisfies it, and so does the test adapter. */
export interface WorkerLike {
  onmessage: ((event: { data: WorkerMessage }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  postMessage(message: Request): void;
  terminate(): void;
}

export interface HostOptions {
  /** Milliseconds per render; default 3000. */
  timeout?: number;
  /** Milliseconds per engine start; default 10000. */
  startupTimeout?: number;
  limits?: {
    /** Whole fence body, in string length; default 64000. */
    sourceChars?: number;
    /** Success output, in UTF-8 bytes; default 4 MiB. */
    outputBytes?: number;
  };
}

export interface Host {
  /** Renders are queued and run one at a time on one worker. */
  render(source: string): Promise<RenderResult>;
  /** Stops the worker; a render still waiting settles as unavailable. */
  dispose(): void;
}

/** A host-wide option: absent for its default, else a finite positive number. */
function option(value: unknown, name: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${name} must be a finite positive number`);
  }
  return value;
}

interface Engine {
  worker: WorkerLike;
  started: Promise<Started>;
  pending: Map<number, (reply: Reply | undefined) => void>;
  /** Settle `started` now; a later answer from the worker is ignored. */
  abandon(): void;
}

const STOPPED: RenderResult = { status: 'unavailable', reason: 'the renderer was stopped' };

export function createHost(spawnWorker: () => WorkerLike, options: HostOptions = {}): Host {
  const timeout = option(options.timeout, 'timeout', 3000);
  const startupTimeout = option(options.startupTimeout, 'startupTimeout', 10000);
  const sourceChars = option(options.limits?.sourceChars, 'limits.sourceChars', 64000);
  const outputBytes = option(options.limits?.outputBytes, 'limits.outputBytes', 4 * 1024 * 1024);

  let current: Engine | undefined;
  let disposed = false;
  let nextId = 0;
  let queue: Promise<unknown> = Promise.resolve();

  const spawn = (): Engine => {
    const worker = spawnWorker();
    const pending = new Map<number, (reply: Reply | undefined) => void>();
    let abandon = (): void => {};
    const started = new Promise<Started>((resolve) => {
      abandon = () => {
        clearTimeout(timer);
        resolve({ type: 'failed', reason: 'the renderer was stopped' });
      };
      const timer = setTimeout(
        () => resolve({ type: 'failed', reason: `pikchr did not start within ${startupTimeout} ms` }),
        startupTimeout
      );
      worker.onmessage = ({ data }) => {
        if (data.type === 'reply') {
          pending.get(data.id)?.(data);
          return;
        }
        clearTimeout(timer);
        resolve(data);
      };
    });
    // A crash surfaces to the waiting render as a timeout, as in the library.
    worker.onerror = () => {};
    current = { worker, started, abandon, pending };
    return current;
  };

  /** Terminate this engine; renders still waiting on it settle as unavailable. */
  const stop = (engine: Engine): void => {
    // A render still waiting for this engine to start is not kept waiting for the start-up limit.
    engine.abandon();
    engine.worker.terminate();
    for (const settle of engine.pending.values()) settle(undefined);
    engine.pending.clear();
    if (current === engine) current = undefined;
  };

  const attempt = async (source: string): Promise<RenderResult> => {
    if (disposed) return STOPPED;
    const engine = current ?? spawn();
    const started = await engine.started;
    if (disposed) return STOPPED;
    if (started.type === 'failed') {
      stop(engine);
      return { status: 'unavailable', reason: started.reason };
    }
    const id = ++nextId;
    let timedOut = false;
    const reply = await new Promise<Reply | undefined>((resolve) => {
      const timer = setTimeout(() => {
        timedOut = true;
        engine.pending.delete(id);
        resolve(undefined);
      }, timeout);
      engine.pending.set(id, (answer) => {
        clearTimeout(timer);
        engine.pending.delete(id);
        resolve(answer);
      });
      engine.worker.postMessage({ id, source, outputBytes });
    });
    if (timedOut) {
      stop(engine);
      return { status: 'timeout', budget: timeout };
    }
    if (!reply) return STOPPED;
    if (reply.discard) stop(engine);
    return reply.result;
  };

  // Start the first engine now, so the first fence does not wait for it.
  spawn();

  return {
    render(source) {
      if (typeof source !== 'string') throw new TypeError('render() takes a string');
      if (source.length > sourceChars) {
        return Promise.resolve({ status: 'failure', message: `pikchr source exceeds the ${sourceChars}-character limit` });
      }
      const result = queue.then(() => attempt(source));
      queue = result.catch(() => {});
      return result;
    },
    dispose() {
      disposed = true;
      if (current) stop(current);
    }
  };
}
