// The embedded worker bundle, built exactly as main.js embeds it, run under Node through the
// plugin's host. A small prelude gives the bundle the `self` a browser Worker would have. These
// pin the plugin's assumptions about the library's output; rendering itself is pikchr-renderer's
// to test.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { bundleWorker } from '../scripts/worker-bundle.mjs';
import { createHost, type Host, type WorkerLike } from '../src/host';
import { describe } from '../src/fence';
import { fence } from './helpers';

const PRELUDE = `
const { parentPort } = require('node:worker_threads');
globalThis.self = {
  postMessage: (message) => parentPort.postMessage(message),
  set onmessage(handler) {
    parentPort.removeAllListeners('message');
    if (handler) parentPort.on('message', (data) => handler({ data }));
  }
};
`;

let source: string;
let host: Host;
const spawned: Worker[] = [];

function spawn(): WorkerLike {
  const worker = new Worker(PRELUDE + source, { eval: true });
  spawned.push(worker);
  const like: WorkerLike = {
    onmessage: null,
    onerror: null,
    postMessage: (message) => worker.postMessage(message),
    terminate: () => void worker.terminate()
  };
  worker.on('message', (data) => like.onmessage?.({ data }));
  worker.on('error', (error) => like.onerror?.(error));
  return like;
}

before(async () => {
  source = await bundleWorker();
  host = createHost(spawn);
});
after(() => host.dispose());

test('the bundle carries no Node module imports', () => {
  assert.doesNotMatch(source, /require\(["']node:|from["']node:/);
});

test('a diagram renders as one sanitized <svg class="pikchr"> with a viewBox', async () => {
  const result = await host.render('box "hi"');
  assert.equal(result.status, 'success');
  if (result.status !== 'success') return;
  const root = /^<svg [^>]*>/.exec(result.output)![0];
  assert.match(root, /\sclass="pikchr"/);
  assert.match(root, /\sviewBox="[^"]+"/);
  assert.doesNotMatch(root, /\swidth=|\sheight=/);
});

test('the fence class reaches the root of the library output, as text', async () => {
  const wrapper = fence(`pikchr {class='wide"><img src=x>'}`, 'box', await host.render('box'));
  assert.equal(wrapper.querySelector('.pikchr-rendering > svg')!.getAttribute('class'), 'pikchr wide"><img src=x>');
  assert.equal(wrapper.querySelectorAll('img').length, 0);
});

test('author text in a pikchr error or print output stays text', async () => {
  for (const body of [
    'box "<img src=x onerror=alert(1)>" bogus',
    'box\n<script>alert(1)</script>',
    'define m {box "<img src=x>" bogus}\nm',
    'print "<img src=x onerror=alert(1)>"\nbox'
  ]) {
    const wrapper = fence('pikchr', body, await host.render(body));
    assert.equal(wrapper.querySelectorAll('.pikchr-rendering img, .pikchr-rendering script').length, 0, body);
  }
});

test('print output arrives as notes', async () => {
  const result = await host.render('print "note"\nbox');
  assert.equal(result.status === 'success' && result.notes.join('|'), 'note');
});

test('a syntax error is reported with its line', async () => {
  const result = await host.render('box\nnonsense here');
  if (result.status === 'success') assert.fail('expected a failure');
  assert.equal(result.status, 'failure');
  assert.match(describe(result), /^Pikchr error at line 2, column \d+: syntax error/);
});

test('ten concurrent renders each get their own diagram', async () => {
  const bodies = Array.from({ length: 10 }, (_, i) => `box "n${i}"`);
  const results = await Promise.all(bodies.map((body) => host.render(body)));
  results.forEach((result, i) => {
    assert.equal(result.status, 'success');
    assert.match(result.status === 'success' ? result.output : '', new RegExp(`>n${i}<`));
  });
});

test('an empty diagram is a failure, not an empty image', async () => {
  assert.equal((await host.render('')).status, 'failure');
});
