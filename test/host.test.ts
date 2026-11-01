// The host's behaviour against scripted workers: start-up, timeouts, a discarded engine, the
// queue, limits and dispose. The real worker is exercised in worker.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { RenderResult } from '@reonarudo/pikchr-renderer';
import { createHost, type WorkerLike } from '../src/host';
import type { Reply, Request, WorkerMessage } from '../src/protocol';

type Answer = Omit<Reply, 'type' | 'id'> | 'hang';
interface Script {
  start?: 'ok' | 'fail' | 'silent';
  answer?: (source: string) => Answer;
}

/** Workers that start and answer as scripted, recording what they were asked and whether they were stopped. */
function workers(script: Script = {}) {
  const spawned: { requests: Request[]; terminated: boolean }[] = [];
  const spawn = (): WorkerLike => {
    const record = { requests: [] as Request[], terminated: false };
    spawned.push(record);
    const worker: WorkerLike = {
      onmessage: null,
      onerror: null,
      postMessage(request) {
        record.requests.push(request);
        const answer = (script.answer ?? ((source) => ({ result: { status: 'success', output: `<svg>${source}</svg>`, notes: [] } })))(request.source);
        if (answer === 'hang') return;
        setTimeout(() => { if (!record.terminated) send({ type: 'reply', id: request.id, ...answer }); }, 1);
      },
      terminate() { record.terminated = true; }
    };
    const send = (message: WorkerMessage) => worker.onmessage?.({ data: message });
    const start = script.start ?? 'ok';
    if (start !== 'silent') setTimeout(() => send(start === 'ok' ? { type: 'started' } : { type: 'failed', reason: 'pikchr could not start' }), 1);
    return worker;
  };
  return { spawn, spawned };
}

test('renders through the worker, starting one engine eagerly', async () => {
  const { spawn, spawned } = workers();
  const host = createHost(spawn);
  assert.equal(spawned.length, 1);
  assert.deepEqual(await host.render('box'), { status: 'success', output: '<svg>box</svg>', notes: [] });
  assert.equal(spawned[0]!.requests[0]!.outputBytes, 4 * 1024 * 1024);
  host.dispose();
});

test('renders run one at a time, in order', async () => {
  let active = 0;
  let most = 0;
  const { spawn } = workers({
    answer: (source) => {
      active++;
      most = Math.max(most, active);
      setTimeout(() => { active--; }, 1);
      return { result: { status: 'success', output: source, notes: [] } };
    }
  });
  const host = createHost(spawn);
  const sources = Array.from({ length: 10 }, (_, i) => `box "${i}"`);
  const results = await Promise.all(sources.map((source) => host.render(source)));
  assert.deepEqual(results.map((result) => result.status === 'success' && result.output), sources);
  assert.equal(most, 1);
  host.dispose();
});

test('a render past the budget times out, stops the worker, and the next render starts a fresh one', async () => {
  const { spawn, spawned } = workers({ answer: (source) => source === 'slow' ? 'hang' : { result: { status: 'success', output: 'ok', notes: [] } } });
  const host = createHost(spawn, { timeout: 200 });
  assert.deepEqual(await host.render('slow'), { status: 'timeout', budget: 200 });
  assert.equal(spawned[0]!.terminated, true);
  assert.equal((await host.render('fast')).status, 'success');
  assert.equal(spawned.length, 2);
  host.dispose();
});

test('a reply marked discard is returned, and its engine is not used again', async () => {
  const { spawn, spawned } = workers({ answer: (source) => source === 'boom'
    ? { result: { status: 'failure', message: 'pikchr stopped unexpectedly' }, discard: true }
    : { result: { status: 'success', output: 'ok', notes: [] } } });
  const host = createHost(spawn);
  assert.deepEqual(await host.render('boom'), { status: 'failure', message: 'pikchr stopped unexpectedly' });
  assert.equal(spawned[0]!.terminated, true);
  assert.equal((await host.render('box')).status, 'success');
  assert.equal(spawned.length, 2);
  host.dispose();
});

test('an engine that fails or never starts makes the render unavailable, and is retried next time', async () => {
  const failing = workers({ start: 'fail' });
  const host = createHost(failing.spawn);
  assert.deepEqual(await host.render('box'), { status: 'unavailable', reason: 'pikchr could not start' });
  assert.equal(failing.spawned[0]!.terminated, true);
  await host.render('box');
  assert.equal(failing.spawned.length, 2);
  host.dispose();

  const silent = workers({ start: 'silent' });
  const stuck = createHost(silent.spawn, { startupTimeout: 20 });
  assert.deepEqual(await stuck.render('box'), { status: 'unavailable', reason: 'pikchr did not start within 20 ms' });
  stuck.dispose();
});

test('the source limit is checked before the worker sees the source', async () => {
  const { spawn, spawned } = workers();
  const host = createHost(spawn, { limits: { sourceChars: 5 } });
  assert.deepEqual(await host.render('box "long"'), { status: 'failure', message: 'pikchr source exceeds the 5-character limit' });
  assert.equal(spawned[0]!.requests.length, 0);
  assert.equal((await host.render('box')).status, 'success');
  host.dispose();
});

test('dispose stops the worker and settles renders in flight and queued as unavailable', async () => {
  const { spawn, spawned } = workers({ answer: () => 'hang' });
  const host = createHost(spawn, { timeout: 60000 });
  const pending: Promise<RenderResult>[] = [host.render('a'), host.render('b')];
  await new Promise((resolve) => setTimeout(resolve, 10));
  host.dispose();
  const stopped = { status: 'unavailable', reason: 'the renderer was stopped' };
  assert.deepEqual(await Promise.all(pending), [stopped, stopped]);
  assert.equal(spawned[0]!.terminated, true);
  assert.deepEqual(await host.render('c'), stopped);
  assert.equal(spawned.length, 1);
});

test('options are validated as the library validates them', () => {
  const { spawn } = workers();
  for (const options of [{ timeout: 0 }, { timeout: Number.NaN }, { startupTimeout: -1 }, { limits: { sourceChars: Infinity } }, { limits: { outputBytes: 0 } }]) {
    assert.throws(() => createHost(spawn, options), TypeError, JSON.stringify(options));
  }
  const host = createHost(spawn);
  assert.throws(() => host.render(42 as unknown as string), TypeError);
  host.dispose();
});

test('dispose releases a render still waiting for the engine to start', async () => {
  const { spawn } = workers({ start: 'silent' });
  const host = createHost(spawn, { startupTimeout: 60000 });
  const pending = host.render('box');
  await new Promise((resolve) => setTimeout(resolve, 10));
  const began = Date.now();
  host.dispose();
  assert.deepEqual(await pending, { status: 'unavailable', reason: 'the renderer was stopped' });
  assert.ok(Date.now() - began < 1000);
});
