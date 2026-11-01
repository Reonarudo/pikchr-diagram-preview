# Release verification: 0.1.0 (pre-release)

Date: 2026-11-01. Tag `0.1.0` on commit 39542d8. GitHub pre-release:
https://github.com/Reonarudo/pikchr-diagram-preview/releases/tag/0.1.0

## Assets

| File | Bytes | SHA-256 |
| --- | --- | --- |
| `main.js` | 331580 | `6e7bbb33a62741bade34f17ba8ecca4baa4be9e7bbc825eac1426029d62605bd` |
| `manifest.json` | 354 | `9eb9bde6eced1954ff4e52e5f4fd3392b4989fa701760bbcc3f9131846651752` |
| `styles.css` | 4593 | `277f1ff6541c657660db2413263595f98c83480cbcd816a7f1cbc3d72b0af338` |

Desktop only: no (desktop and mobile). Minimum Obsidian version: 1.5.0.

## Checks on the tagged tree

- `npm run lint` (tsc): clean.
- Obsidian's review linter (`eslint-plugin-obsidianmd` 0.4.2, recommended config) on `src/`: no errors, no warnings.
- `npm test`: 82 passed, 0 failed.
- `npm run test:live` against Obsidian 1.14.4: 21 live checks passed.

## The published assets

- Downloaded with `gh release download 0.1.0` into an empty directory; `shasum -a 256 -c SHA256SUMS`: all OK; `main.js`
  byte-identical to the build from the tagged tree.
- Installed into a throwaway vault in Obsidian 1.14.4 with a throwaway profile: blocks draw, with captions, in an embedded
  note (Reading view and Live Preview) and in Canvas text and note cards.

## Not yet verified

- On real phones (iOS, Android) through BRAT.
