# Pikchr Diagram Preview

Renders [Pikchr](https://pikchr.org) code blocks as diagrams in Obsidian, in Reading view and
Live Preview. A port of the VS Code extension of the same name.

## Usage

~~~markdown
```pikchr
arrow right 200% "Markdown" "Source"
box rad 10px "Markdown" "Formatter" "(markdown.c)" fit
arrow right 200% "HTML+SVG" "Output"
arrow <-> down 70% from last box.s
box same "Pikchr" "Formatter" "(pikchr.c)" fit
```
~~~

## Fence attributes

A `pikchr` fence may carry an attribute block:

~~~markdown
```pikchr {alt="Sine curve" caption="Figure 1: Sine wave" align="center"}
box "hi"
```
~~~

- `alt`: an accessible name, for readers using assistive technology.
- `caption`: plain text shown beneath the diagram.
- `align`: `left`, `center` or `right`.
- `class`: an extra CSS class on the `<svg>`, alongside the built-in `pikchr` class.

Values must be quoted, with single or double quotes; a backslash escapes a matching quote or a
backslash. Values are plain text, never Markdown or HTML. Anything unrecognised is ignored and
the diagram still renders; turn on **Debug logging** in the plugin's settings to see what was
ignored in the developer console.

Attributes are read from the note's text. Where Obsidian renders a block without its note (some
embeds and exports), the diagram renders bare.

## Viewing the source

The plugin follows Obsidian's own handling of Mermaid diagrams:

- **Live Preview:** hovering a diagram shows Obsidian's **Edit this block** button in its top
  corner, which opens the code block for editing, as for Mermaid. Live Preview always shows the
  diagram.
- **Reading view:** hovering a diagram shows a button of the same look in the same corner,
  **Show source**, which flips the block to its source text; **Show diagram** flips it back. A
  flipped block stays flipped across re-renders, reopening the note and restarting Obsidian, and
  in every Reading view of the note. Two blocks with the same body are told apart by their order.
  **Show every diagram in this note** in the command palette flips them all back.

## Errors and limits

A block that pikchr rejects shows the error, with its line and column within the block, in
place of the diagram. `print` output appears as text above the diagram. Each diagram has three
seconds to render (adjustable in settings, from half a second to a minute) and a
64 000-character source limit.

Diagrams follow the theme, as Mermaid diagrams do. In a dark theme they sit on the page in
dark-theme colours: lines and text are lightened only as far as needed to read, filled shapes are
darkened, and hues are kept, so colours that already read on a dark page stay as they are. In a
light theme they sit on a white card with their exact colours. To keep every diagram on a white
card, turn off **Follow dark themes** in the plugin's settings.

## How it renders

Rendering runs in a Web Worker inside Obsidian, built from
[pikchr-renderer](https://github.com/Reonarudo/pikchr-renderer): Pikchr compiled to
WebAssembly, and an allowlist sanitizer for its SVG. Nothing is downloaded, installed or written
to disk; the worker is embedded in `main.js`.

The worker starts with the first diagram drawn, so a vault without pikchr blocks never loads the
engine. Diagrams also draw in embedded notes, hover previews, Canvas cards and exported PDFs (in
light colours). Settings appear in Obsidian's settings search on 1.13 and later. On an Obsidian
whose built-in Chromium predates `light-dark()`, diagrams keep the white card in dark themes.

Works on desktop and on Obsidian's mobile apps, where the source button stays visible (there is
no hover to reveal it). Nothing in the plugin needs Node or Electron.

## Development

Requires Node 22 or newer (see `.nvmrc`).

~~~sh
npm ci
npm run lint        # tsc --noEmit
npm test            # node --test: attributes, toggle, scanner, DOM, host, and the real worker bundle
npm run build       # main.js, with the worker bundle embedded
npm run vault       # link this repo into ../test-vault as an enabled plugin
npm run test:live   # a real Obsidian with a throwaway profile and vault, driven over CDP
~~~

`npm run test:live` needs Obsidian installed (`OBSIDIAN_EXECUTABLE` overrides the path); it
prints where it saved light and dark screenshots.

The renderer is pinned to a release tarball in `package.json` (`.npmrc` sets
`allow-remote=root` for npm 12). To take a new release, edit the URL, run `npm install`, check
`src/worker/entry.ts` against the release's `src/worker.ts`, and run the tests.

## Credits

Diagram rendering is done by [Pikchr](https://pikchr.org) by D. Richard Hipp. The VS Code
extension this ports was originally created by
[xuzn](https://github.com/xuzn/pikchr-markdown-preview).
