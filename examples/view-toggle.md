# The view toggle

In Reading view, hovering a `pikchr` code block below shows a button in its top corner that flips
it between the diagram and the block's source. In Live Preview the same corner holds Obsidian's
own "Edit this block" button, as for Mermaid. This note is the fixture for `npm run test:live` and the
document for the manual checklist: open it in Reading view and in Live Preview, in a light and
a dark theme.

## 1. A plain fence

```pikchr
box "source" fit
arrow "parse"
box "layout" fit
arrow "render"
box "preview" fit
```

## 2. Captioned, centred: the button stays at the column edge

```pikchr {caption="Figure 1: a small state machine" align="center"}
I: circle "idle" fit
arrow "start" above
R: circle "running" fit
arrow "error" above
F: circle "failed" fit
arrow from F.s down 0.4 then left until even with I then to I.s "reset" below
```

## 3. Right-aligned with alt: the card sits under the button

```pikchr {alt="a box and a circle" align="right"}
box "a"
arrow
circle "b"
```

## 4. Error card: the source view shows the body alone

```pikchr
box "broken"
nonsense here
```

## 5. Long lines and a tall body: horizontal scroll, height jump

```pikchr
boxwid = 1.4in
B1: box "parse" fit fill 0xf0f4ff color 0x334466 thickness 1.2px rad 6px "a very long label line that runs well past the width of the preview column so the source view scrolls sideways" small
arrow down from B1.s
B2: box "check" fit
arrow down
B3: box "layout" fit
arrow down
B4: box "paint" fit
arrow down
B5: box "sanitize" fit
arrow down
B6: box "cache" fit
arrow down
B7: box "preview" fit
arrow down
B8: box "reader" fit
```

## 6. Two identical bodies: flip the second one only, then edit this heading

```pikchr
box "x"
arrow
box "y"
```

```pikchr
box "x"
arrow
box "y"
```

## 7. An ordinary fence: no toggle, Obsidian's own copy button

```json
{ "compare": "Obsidian's copy button on hover, no view toggle" }
```

## 8. In a list item and a callout: attributes still apply

- A list item holding a diagram:

    ```pikchr {caption="Inside a list item"}
    box "listed" fit
    ```

> [!note] A callout
> ```pikchr {caption="Inside a callout" align="center"}
> circle "quoted" fit
> ```

## 9. Quirks: `print` notes share the rendering slot and hide with it

```pikchr
print "a note written by print, shown above the diagram"
box "noted" fit
```

`print` output is a `pikchr-notes` block above the diagram, inside the rendering slot, so it
hides in source view together with the diagram. A diagram that exceeds the time limit shows a
timeout card, which the toggle treats like any error card.
