import { test } from 'node:test';
import assert from 'node:assert/strict';
import { locate, scanFences } from '../src/info';

test('finds pikchr fences with their line, info string and body', () => {
  const text = '# T\n\n```pikchr {caption="c"}\nbox\narrow\n```\n\ntext\n\n~~~pikchr\ncircle\n~~~\n';
  assert.deepEqual(scanFences(text, 'pikchr'), [
    { line: 2, info: 'pikchr {caption="c"}', body: 'box\narrow' },
    { line: 9, info: 'pikchr', body: 'circle' }
  ]);
});

test('only the first word of the info string names the language, as in Obsidian', () => {
  const text = '```Pikchr\na\n```\n```pikchr2\nb\n```\n```pikchr extra\nc\n```\n``` pikchr\nd\n```';
  assert.deepEqual(scanFences(text, 'pikchr').map((f) => f.body), ['c', 'd']);
});

test('a pikchr fence quoted inside another fence is not a fence', () => {
  const text = '````markdown\n```pikchr\nbox\n```\n````\n\n```pikchr\nreal\n```';
  assert.deepEqual(scanFences(text, 'pikchr').map((f) => f.body), ['real']);
});

test('a closing fence must use the same character and be at least as long', () => {
  const text = '````pikchr\nbox\n```\n~~~~\n````\n';
  assert.deepEqual(scanFences(text, 'pikchr'), [{ line: 0, info: 'pikchr', body: 'box\n```\n~~~~' }]);
});

test('a backtick fence whose info contains a backtick is not a fence', () => {
  assert.deepEqual(scanFences('```pikchr `x`\nbox\n```', 'pikchr'), []);
});

test('an unclosed fence runs to the end of the note', () => {
  assert.deepEqual(scanFences('```pikchr\nbox\narrow', 'pikchr'), [{ line: 0, info: 'pikchr', body: 'box\narrow' }]);
});

test('fences in blockquotes and list items lose their container prefix', () => {
  const quoted = '> ```pikchr {alt="q"}\n> box\n> ```\n';
  assert.deepEqual(scanFences(quoted, 'pikchr'), [{ line: 0, info: 'pikchr {alt="q"}', body: 'box' }]);
  const nested = '- item\n\n    ```pikchr\n    box\n      indented\n    ```\n';
  assert.deepEqual(scanFences(nested, 'pikchr'), [{ line: 2, info: 'pikchr', body: 'box\n  indented' }]);
  // Leaving the blockquote closes the fence.
  assert.deepEqual(scanFences('> ```pikchr\n> box\nafter', 'pikchr'), [{ line: 0, info: 'pikchr', body: 'box' }]);
});

test('CRLF line endings are handled', () => {
  assert.deepEqual(scanFences('```pikchr\r\nbox\r\n```\r\n', 'pikchr'), [{ line: 0, info: 'pikchr', body: 'box' }]);
});

test('locate picks the fence in the section, or the matching body when a section holds several', () => {
  const fences = scanFences('```pikchr\na\n```\n- x\n  ```pikchr\n  b\n  ```\n- y\n  ```pikchr\n  c\n  ```\n', 'pikchr');
  assert.equal(locate(fences, 0, 2, 'a'), 0);
  assert.equal(locate(fences, 3, 10, 'c\n'), 2);
  assert.equal(locate(fences, 3, 10, 'b'), 1);
  // No body matches: the first in range.
  assert.equal(locate(fences, 3, 10, 'zzz'), 1);
  assert.equal(locate(fences, 20, 30, 'a'), -1);
});
