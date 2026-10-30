# Phase 6 anatomy increment — 30 October 2026

## Source and reproducibility
- Tested source commit: `bfc11bbaf607c12e20546e25322b7412c1d282aa`.
- Request: `pc-xr-phase6-gingiva-final-20261030-03`, deliberately pinned to this full source commit. The request-commit itself is `7be50c47d5409e40b0090be2fb72773ff0c31aed`.
- Gallery: https://github.com/ajeshkg17/KlinikLab/blob/visual-feedback/runs/pc-xr-pc-xr-phase6-gingiva-final-20261030-03-bfc11bbaf607c12e20546e25322b7412c1d282aa/README.md

## Implemented
- World-space schematic arch is uniformly scaled by `0.055` around `[0,1.545,-1.78]`, including crowns, gingiva, caries labels, positions and FDI hit targets. Dental instruments and XR controllers do not change size.
- Approximate crown widths become about 10 mm for an upper central incisor, 6–7 mm for lower incisors, and ~11 mm for molars; full arch span is approximately 8 cm. These are **procedural educational approximations**, not clinical measurements, licensed tooth reconstructions, occlusion analysis or patient data.
- Explicit, reversible `8×` teaching magnification (distinct from normal arch dimensions), with a desktop toggle.
- Upper/lower molar distinction (four/five cusp relief), buccolingual premolar cusp asymmetry, narrower mandibular incisors, improved interdental papilla crownward orientation and cervical collar taper.
- Root/public/standalone runtime mirrors synchronized; no changes to tray instrument transforms, grip ownership, controller mapping, or help/catalog inputs.

## Evidence
- Lightweight source/build CI passed on source commit.
- Owner-PC headset **emulator** job passed 22 functional checks, created ten fresh stereo captures (including `01-room-table-unobstructed.png` for normal overview, and `05-mirror-release-return.png` after explicit 8x teaching magnification). Mean frame interval: approximately 17.57 ms; performance is advisory.
- The `10-tool-catalog-closed.png` hash matches `08-help-closed-after-close.png`; this may be the same reached closed scene and must not be mistaken for an automatically proven visual difference.
- No independent pixel-level anatomy rating was recorded by the development agent. The gallery should be manually inspected for perceived crown details, visible papillae, clipping, and both-eye readability.

## Pending / Phase 7 dependency
- Physical Quest 2 ergonomics/comfort and expert anatomical review are **not tested or accepted**.
- The enlarged XR preparation volume currently uses a fixed teaching shape associated with `volLab.caseKey`, rather than anatomy selected by arbitrary FDI number. Next: FDI-to-shape mapping, per-FDI treatment persistence, and selection switching tests. Keep display magnification separate from natural dimensions.
