# Changelog

## 0.1.0 (unreleased)

First version, ported from the VS Code extension
[pikchr-diagram-preview](https://github.com/Reonarudo/pikchr-markdown-preview) 0.3.0.

- `pikchr` code blocks render as diagrams in Reading view and Live Preview.
- Attribute blocks on the fence: `alt`, `caption`, `align`, `class`.
- In Reading view, a button on every block flips it between the diagram and its source. It looks
  and sits like Obsidian's own "Edit this block" button and appears on hover. Flips are
  remembered per note, follow renames, and apply in every Reading view of the note.
- In Live Preview the block always shows its diagram, and Obsidian's own "Edit this block"
  button opens it for editing, as for Mermaid.
- Errors, `print` notes, time-outs and the 64 000-character limit behave as in the VS Code
  extension.
- Rendering runs in a Web Worker inside Obsidian, from pikchr-renderer 1.0.0's engine and
  sanitizer; no Node install is needed.
- Diagrams follow dark themes as Mermaid's do: each colour gets a dark-theme counterpart by its
  role (lines and text lightened only as needed, filled shapes darkened, hues kept), switching
  with the theme without a re-render; a setting keeps them on a white card instead.
- Settings: render time limit, following dark themes, debug logging; listed in Obsidian's settings
  search (1.13 and later).
- The renderer starts with the first diagram drawn, not when Obsidian starts.
- Diagrams draw in embedded notes, hover previews, Canvas and PDF export, and are built with
  Obsidian's DOM helpers, so pop-out windows get their own elements.
- On an Obsidian whose Chromium lacks `light-dark()`, diagrams keep their white card.
- Commands: restart the renderer; show every diagram in the current note.
