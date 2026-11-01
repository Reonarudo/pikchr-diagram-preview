# Release verification: 0.1.3

Date: 2026-11-01. Tag `0.1.3` on commit 09dac55, built and published by the release workflow:
https://github.com/Reonarudo/pikchr-diagram-preview/actions/runs/41311528996

## Assets

| File | Bytes | SHA-256 | Attestation |
| --- | --- | --- | --- |
| `main.js` | 330478 | `7c8043ba3969392e741ee21d9b221a98417caccaa414543436b8dacdb2ef9f86` | verified with `gh attestation verify` |
| `manifest.json` | 355 | `8e4123712f965e69fd08dd9b7565ec2c7384aa89321b566326338fb8cd2b55ff` | verified with `gh attestation verify` |
| `styles.css` | 4593 | `277f1ff6541c657660db2413263595f98c83480cbcd816a7f1cbc3d72b0af338` | verified with `gh attestation verify` |

## Checks

- In the workflow: tag matches `manifest.json` and `versions.json`; `npm ci`; `tsc --noEmit`; `npm test` (82 passed,
  0 failed); `npm run build`.
- Obsidian's review linter on `src/`: no findings. No `display()` method and no `!important` remain, the two
  community directory warnings on 0.1.2.
- `npm run test:live` against Obsidian 1.14.4 on the tagged tree: all checks passed.
- Downloaded assets installed in a throwaway vault in Obsidian 1.14.4: blocks draw in an embedded note.
