# Release verification: 0.1.2

Date: 2026-11-01. Tag `0.1.2` on commit 9ef054a, built and published by the release workflow:
https://github.com/Reonarudo/pikchr-diagram-preview/actions/runs/41310096741

## Assets

| File | Bytes | SHA-256 | Attestation |
| --- | --- | --- | --- |
| `main.js` | 331580 | `6e7bbb33a62741bade34f17ba8ecca4baa4be9e7bbc825eac1426029d62605bd` | verified with `gh attestation verify` |
| `manifest.json` | 355 | `ab1a8fe8ffed84ba2f6512a110ea8a8a2d14281c609fe64301cbe2258adea1c0` | verified with `gh attestation verify` |
| `styles.css` | 4593 | `277f1ff6541c657660db2413263595f98c83480cbcd816a7f1cbc3d72b0af338` | verified with `gh attestation verify` |

The release carries only these three files.

## Checks

- In the workflow: tag matches `manifest.json` and `versions.json`; `npm ci`; `tsc --noEmit`; `npm test`
  (82 passed, 0 failed); `npm run build`.
- Downloaded assets installed in a throwaway vault in Obsidian 1.14.4: blocks draw in an embedded note (Reading view and
  Live Preview) and in Canvas text and note cards.
- `main.js` differs from 0.1.1 only in the embedded copy of this repository's `LICENSE`, which lost a trailing
  sentence so GitHub recognises it as MIT.
