# Dental anatomy visual QA gate — workstream 02

29 October 2026. **This is a capture checklist, not evidence of a passed visual or clinical gate.**

## Prior workstation screenshots are not valid morphology proof

The [real-dental-arches-v3 capture manifest](https://github.com/ajeshkg17/KlinikLab/blob/visual-feedback/runs/real-dental-arches-v3-2026-10-29-01/manifest.json) has two desktop screenshots (frontal and occlusal) at 2026-10-29 14:59:43 UTC. Both captures were saved successfully, but both reported:

- Babylon error: **B is not defined**
- Babylon renderer mode: **classic**
- Licensed tooth assets loaded: **16**
- 32 crown instances created, **0 visible licensed instances**

This is historical evidence of a display failure, **not** proof that Dundee crown surfaces rendered correctly. The [older v2 capture](https://github.com/ajeshkg17/KlinikLab/blob/visual-feedback/runs/real-dental-arches-v2-2026-10-29-01/manifest.json) also reports the same Babylon error.

## Independent review of the feature branch

The current local visual worker reads its job queue on **main**, not on feature/dental-anatomy. The coordinator or QA owner must capture a feature-branch build from a separate isolated checkout or staging environment before merging, without overwriting the shared main-branch job queue.

Recommended workstation views at a fixed viewport (e.g. 1600 × 1000), with consistent crown source and lighting:

1. Frontal view of all 32 FDI teeth: tooth order, midline, incisal contour, excessive spacing, apparent bite.
2. Upper-arch occlusal view: four-cusp procedural fallback and gingival papillae.
3. Lower-arch occlusal view: five-cusp procedural fallback and proximal spacing.
4. Left and right oblique views: mirrored FDI orientation and interarch projection.
5. Separate maxillary and mandibular views: synthetic jaw ridge, crown truncation, detached gingival/bone bands.
6. Procedural crown quality 0 versus quality 2: preserve anatomical category while recording mesh budgets.

Some views may require manual isolation or developer-only quality selection; the existing worker has no arbitrary scripting facility. Do not invent controls or claim captures that were not taken.

## Quantitative browser diagnostics after visible licensed render

Read the global KlinikRealTeeth state in the browser developer console. Require visibleInstances = 32, surfaceDiagnostics.pairs length = 30, and surfaceDiagnostics.opposingPairs length = 16, with finite numeric results and no unavailable entries. Report sampled facet intersections separately from projected vertical clearance. Babylon loader errors must be empty.

The signed projected vertical clearance is minimum upper crown Y minus maximum opposing lower crown Y. Negative projection is **not necessarily a mesh intersection** because X/Z separation may remain; a sampled positive separation is **not proof of no contact**. Values are in uncalibrated KlinikLab scene units, not millimetres.

## Local regression commands

~~~sh
node --test tests/babylon_anatomy.test.cjs tests/phase4_jaw.test.cjs tests/real_scene_qa.cjs
node --check babylon-anatomy.js
node --check real-dental-scene.js
cmp babylon-anatomy.js public/babylon-anatomy.js
cmp real-dental-scene.js public/real-dental-scene.js
python3 build_standalone.py
git diff --exit-code -- KlinikLab_DesktopXR_Standalone.html
~~~

Attach the tested Git commit SHA, actual screenshot URLs, visual worker manifest, browser error state and comparison notes to PR #15. Physical Quest 2 testing, licensed biological root geometry and specialist clinical validation remain unverified.
