# Pikchr Diagram Preview

Draw diagrams in your notes with [Pikchr](https://pikchr.org), a small language for technical
diagrams. Write a `pikchr` code block and the diagram appears in its place, in Reading view and
Live Preview, on desktop and mobile.

~~~markdown
```pikchr
arrow right 200% "Markdown" "Source"
box rad 10px "Markdown" "Formatter" "(markdown.c)" fit
arrow right 200% "HTML+SVG" "Output"
arrow <-> down 70% from last box.s
box same "Pikchr" "Formatter" "(pikchr.c)" fit
```
~~~

## Features

- Diagrams in Reading view, Live Preview, embedded notes, hover previews, Canvas cards and
  exported PDFs.
- Captions, alignment and alt text for each diagram.
- A button to see a diagram's code without leaving Reading view.
- Follows your theme: diagrams stay readable in dark themes.
- Works offline. Nothing to install besides the plugin.

## Install

1. In Obsidian, open **Settings → Community plugins** and turn off **Restricted mode** if it's on.
2. Select **Browse**, search for **Pikchr Diagram Preview**, then select **Install** and **Enable**.

To install by hand instead, download `main.js`, `manifest.json` and `styles.css` from the
[latest release](https://github.com/Reonarudo/pikchr-diagram-preview/releases/latest) into
`<your vault>/.obsidian/plugins/pikchr-diagram-preview/`, then enable the plugin.

## Writing diagrams

Put Pikchr code in a code block tagged `pikchr`. The [Pikchr user manual](https://pikchr.org/home/doc/trunk/doc/userman.md)
explains the language. Text written with `print` appears above the diagram.

### Captions and other options

Add options in braces after `pikchr`:

~~~markdown
```pikchr {caption="Figure 1: The formatter" align="center" alt="Two boxes joined by arrows"}
box "Markdown" fit
arrow
box "HTML" fit
```
~~~

| Option | What it does |
| --- | --- |
| `caption` | Text shown under the diagram. |
| `align` | `left`, `center` or `right`. |
| `alt` | A description read aloud by screen readers. |
| `class` | A CSS class, for styling the diagram with a CSS snippet. |

Put each value in quotes. Values are plain text, not Markdown. If an option is misspelled, it's
ignored and the diagram still appears.

## Viewing the code

- **Reading view:** hover over a diagram and select the **</>** button in its corner to see the
  code. Select it again to see the diagram. Obsidian remembers which diagrams you switched, even
  after a restart. **Show every diagram in this note** in the command palette switches them all
  back.
- **Live Preview:** select Obsidian's own **Edit this block** button, just as for a Mermaid
  diagram.
- **Phones and tablets:** the button is always visible.

## Dark and light themes

Diagrams follow your theme. In a dark theme, lines and text are lightened just enough to read,
filled shapes are darkened, and colours keep their hue. In a light theme, diagrams appear on a
white card with their exact colours.

To always show the exact colours on a white card, turn off **Follow dark themes** in the plugin's
settings.

## Settings

| Setting | What it does |
| --- | --- |
| **Render time limit** | How long a diagram may take before it's shown as an error. 3 seconds by default, from 0.5 to 60. |
| **Follow dark themes** | On by default. Turn off to keep every diagram on a white card. |
| **Debug logging** | Writes ignored options to the developer console, to help find a typo. |

## Commands

| Command | What it does |
| --- | --- |
| **Show every diagram in this note** | Switches every block in the note back from code to diagram. |
| **Restart renderer** | Starts the diagram engine afresh and redraws open notes. |

## When something goes wrong

- **A mistake in the code:** the error and its line and column within the block appear in place
  of the diagram. Fix the code and the diagram comes back.
- **"Took longer than…":** the diagram hit the **Render time limit**. Simplify it, or raise the
  limit in settings.
- **Large blocks:** a block may hold up to 64,000 characters.

## Privacy

Diagrams are drawn on your device, inside Obsidian. The plugin doesn't connect to the internet,
doesn't collect any data, and doesn't read or write any files.

## Credits

Diagrams are drawn by [Pikchr](https://pikchr.org), created by D. Richard Hipp. The licenses of
the software built into this plugin are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Released under the [MIT License](LICENSE). To build or change the plugin, see
[DEVELOPMENT.md](DEVELOPMENT.md).
