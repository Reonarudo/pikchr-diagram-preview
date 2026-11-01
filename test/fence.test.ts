// The DOM each pikchr block gets: pikchr-markdown-preview's test/markdown.test.ts, ported from
// HTML strings to built nodes. Tests about delegating other fences, VS Code's scroll sync and its
// highlighter are gone with the markdown-it rule; Obsidian routes blocks by language itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { RenderResult } from '@reonarudo/pikchr-renderer';
import { buildFence, fenceKey, isSourceView, setView, showError, showLoading } from '../src/fence';
import { document, fence, rendering } from './helpers';

/** What the library emits, and what the slot holds once the natural width is set from the viewBox. */
const OUTPUT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" class="pikchr"></svg>';
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" class="pikchr" width="10"></svg>';
const success: RenderResult = { status: 'success', output: OUTPUT, notes: [] };

const LUCIDE = 'xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const ICON_CODE = `<svg ${LUCIDE} class="svg-icon lucide-code-2 pikchr-icon-code">` +
  '<path d="m18 16 4-4-4-4"></path><path d="m6 8-4 4 4 4"></path><path d="m14.5 4-5 16"></path></svg>';
const ICON_GRAPH = `<svg ${LUCIDE} class="svg-icon lucide-network pikchr-icon-graph">` +
  '<rect x="16" y="16" width="6" height="6" rx="1"></rect><rect x="2" y="16" width="6" height="6" rx="1"></rect><rect x="9" y="2" width="6" height="6" rx="1"></rect>' +
  '<path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"></path><path d="M12 12V8"></path></svg>';
const TOGGLE = `<button class="pikchr-toggle clickable-icon" type="button" aria-pressed="false" aria-label="Show source">${ICON_CODE}${ICON_GRAPH}</button>`;

// The DOM contract, asserted exactly once, here.
test('every block is wrapped: toggle first, rendering slot, then the source <pre>', () => {
  assert.equal(fence('pikchr', 'box', success).outerHTML,
    `<div class="pikchr-fence" data-fence-key="${fenceKey('box')}">${TOGGLE}` +
    `<div class="pikchr-rendering">${SVG}</div>` +
    '<pre><code class="language-pikchr">box</code></pre></div>');
});

test('the fence key is FNV-1a of the exact body', () => {
  assert.equal(fenceKey('box\n'), 'c078b228');
  assert.equal(fenceKey(''), '811c9dc5');
  assert.equal(fenceKey('box \n'), '87a252d4');
});

test('the source view is the body as text, never markup', () => {
  const wrapper = fence('pikchr', '<img src=x onerror=alert(1)>', success);
  assert.equal(wrapper.querySelector('pre > code')!.textContent, '<img src=x onerror=alert(1)>');
  assert.equal(wrapper.querySelectorAll('img').length, 0);
});

test('setView flips the wrapper, the button state and its name, and back', () => {
  const wrapper = fence('pikchr', 'box', success);
  const button = wrapper.querySelector('button')!;
  setView(wrapper, true);
  assert.equal(wrapper.getAttribute('data-view'), 'source');
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(button.getAttribute('aria-label'), 'Show diagram');
  assert.equal(isSourceView(wrapper), true);
  setView(wrapper, false);
  assert.equal(wrapper.hasAttribute('data-view'), false);
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  assert.equal(button.getAttribute('aria-label'), 'Show source');
});

test('the loading line and error cards sit in the rendering slot', () => {
  const parts = buildFence(document.createElement('div'), 'box', fenceKey('box'));
  showLoading(parts.rendering);
  assert.equal(rendering(parts.wrapper), '<p class="pikchr-loading" role="status">Rendering pikchr diagram…</p>');
  showError(parts.rendering, 'Pikchr is unavailable: x');
  assert.equal(rendering(parts.wrapper), '<div class="pikchr-error" role="alert"><pre>Pikchr is unavailable: x</pre></div>');
});

test('a failure renders an error card with its fence-relative position, escaped', () => {
  const wrapper = fence('pikchr {caption="Not shown"}', 'box\nnonsense',
    { status: 'failure', message: 'unknown object "<img src=x>"', line: 2, column: 5 });
  assert.equal(rendering(wrapper),
    '<div class="pikchr-error" role="alert"><pre>Pikchr error at line 2, column 5: unknown object "&lt;img src=x&gt;"</pre></div>');
  assert.equal(wrapper.querySelectorAll('img, figcaption').length, 0);
});

test('a failure without a position names none', () => {
  assert.match(rendering(fence('pikchr', '', { status: 'failure', message: 'empty pikchr diagram' })),
    /<pre>Pikchr error: empty pikchr diagram<\/pre>/);
});

test('timeout and unavailable render as errors', () => {
  assert.match(rendering(fence('pikchr', 'box', { status: 'timeout', budget: 3000 })), /pikchr-error[^]*took longer than 3000 ms/);
  assert.match(rendering(fence('pikchr', 'box', { status: 'unavailable', reason: 'no <engine>' })), /pikchr-error[^]*unavailable: no &lt;engine&gt;/);
});

test('a bare fence emits the diagram with no figure', () => {
  assert.equal(rendering(fence('pikchr', 'box', success)), SVG);
});

test('print notes share the rendering slot, above the diagram, as text', () => {
  const wrapper = fence('pikchr {caption="Cap"}', 'print "x"\nbox', { status: 'success', output: OUTPUT, notes: ['a <b> & c', 'second'] });
  assert.match(rendering(wrapper), /^<div class="pikchr-notes">a &lt;b&gt; &amp; c<br>second<\/div><figure /);
  assert.equal(wrapper.querySelectorAll('b').length, 0);
});

test('alt becomes an accessible name, caption a figure, align a class', () => {
  const html = rendering(fence('pikchr {alt="A box" caption="Figure 1" align="center"}', 'box', success));
  assert.equal(html, `<figure class="pikchr-figure pikchr-align-center"><div role="img" aria-label="A box">${SVG}</div><figcaption>Figure 1</figcaption></figure>`);
});

test('align alone still produces a figure to carry the class', () => {
  assert.equal(rendering(fence('pikchr {align="right"}', 'box', success)), `<figure class="pikchr-figure pikchr-align-right">${SVG}</figure>`);
});

test('class is added to the <svg> root alongside the base class, not to a wrapper', () => {
  assert.equal(rendering(fence('pikchr {class="wide"}', 'box', success)),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" class="pikchr wide" width="10"></svg>');
});

test('a fence class cannot break out of the class attribute', () => {
  const wrapper = fence(`pikchr {class='x" onload="alert(1)"><img src=x onerror=alert(1)>'}`, 'box', success);
  assert.equal(wrapper.querySelectorAll('img').length, 0);
  const svg = wrapper.querySelector('.pikchr-rendering > svg')!;
  assert.equal(svg.getAttribute('onload'), null);
  assert.equal(svg.getAttribute('class'), 'pikchr x" onload="alert(1)"><img src=x onerror=alert(1)>');
});

test('attribute text stays text, including quotes, markup and Markdown', () => {
  const wrapper = fence('pikchr {alt="<img src=x onerror=alert(1)>" caption="**bold** & \\"quoted\\""}', 'box', success);
  assert.equal(wrapper.querySelectorAll('img, strong').length, 0);
  assert.equal(wrapper.querySelector('[role="img"]')!.getAttribute('aria-label'), '<img src=x onerror=alert(1)>');
  assert.equal(wrapper.querySelector('figcaption')!.textContent, '**bold** & "quoted"');
});

test('malformed attributes are ignored and the diagram still renders bare', () => {
  assert.equal(rendering(fence('pikchr {alt="unterminated}', 'box', success)), SVG);
});

test('output that is not a well-formed <svg> becomes an error card, not markup', () => {
  for (const output of ['<img src=x onerror=alert(1)>', '<svg><unclosed></svg>', 'plain text', '<html><body/></html>']) {
    const wrapper = fence('pikchr', 'box', { status: 'success', output, notes: [] });
    assert.match(rendering(wrapper), /^<div class="pikchr-error" role="alert"><pre>Pikchr is unavailable: the renderer returned a diagram that could not be read<\/pre><\/div>$/, output);
  }
});

test('the natural width comes from the viewBox, and a diagram without one gets none', () => {
  const sized = fence('pikchr', 'box', { status: 'success', output: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112.32 76.32" class="pikchr"></svg>', notes: [] });
  assert.equal(sized.querySelector('.pikchr-rendering > svg')!.getAttribute('width'), '112.32');
  const bare = fence('pikchr', 'box', { status: 'success', output: '<svg xmlns="http://www.w3.org/2000/svg" class="pikchr"></svg>', notes: [] });
  assert.equal(bare.querySelector('.pikchr-rendering > svg')!.hasAttribute('width'), false);
});
