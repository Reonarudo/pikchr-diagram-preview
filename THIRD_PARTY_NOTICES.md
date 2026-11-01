# Third-party notices

`main.js` embeds a Web Worker bundle built from the following. Their licenses are reproduced in
full in the renderer package (`node_modules/@reonarudo/pikchr-renderer/licenses/`).

## Pikchr renderer

[pikchr-renderer](https://github.com/Reonarudo/pikchr-renderer) (MIT) supplies the engine, the
interpreter of its output and the SVG sanitizer. It carries the Pikchr diagram compiler by
D. Richard Hipp, from <https://pikchr.org>, compiled to WebAssembly with Emscripten:

- Pikchr is distributed under the Zero-Clause BSD license, copyright (C) 2020-09-01 by
  D. Richard Hipp <drh@sqlite.org>:

  > Permission to use, copy, modify, and/or distribute this software for any purpose with or
  > without fee is hereby granted.

- The Emscripten runtime is available under the MIT and University of Illinois/NCSA licenses.

## xmldom

[`@xmldom/xmldom`](https://github.com/xmldom/xmldom) (MIT), used by the renderer's sanitizer.

## Origin

This plugin is a port of the VS Code extension pikchr-diagram-preview, which began as a fork of
[xuzn/pikchr-markdown-preview](https://github.com/xuzn/pikchr-markdown-preview), MIT licensed,
copyright (c) 2021 xuzn. The original notice is retained in `LICENSE`.
