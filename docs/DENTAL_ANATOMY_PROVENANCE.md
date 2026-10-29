# KlinikLab dental anatomy: asset and geometry audit

Date: 2026-10-29 · Workstream: 3D Dental Anatomy · Status: engineering audit, **not clinical validation**

## Provenance matrix

| Assets | Source and license | Changes / usage | Anatomical evidence level |
| --- | --- | --- | --- |
| `assets/dundee/maxillary_*.glb` (8), `assets/dundee/mandibular_*.glb` (8) | University of Dundee School of Dentistry, CC BY 4.0, via [sameralseedbth-Dental/dental-3d-models commit 4f0ffb6](https://github.com/sameralseedbth-Dental/dental-3d-models/commit/4f0ffb651998a4641ddf45c7632ea236cc164fcb). The [original Dundee collection](https://sketchfab.com/DundeeDental/collections/permanent-teeth-4c0d0548c40c463c8cdceb6e0d08df7f) and [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) are credited in `assets/dundee/README.md`. | Bundled binaries are described there as copied without edits; `real-dental-scene.js` clips each mesh to an illustrative crown (47% of the imported height), recenters/rescales it, and mirrors the left tooth to the contralateral quadrant. The full surface remains available in the optional tooth atlas. | Licensed external tooth surfaces; neither CT provenance nor independent clinical accuracy has been established. Crop boundaries are **open**, not claimed watertight. |
| `babylon-anatomy.js`: `crownData` | Original KlinikLab mathematical procedural shapes; no third-party scan or model. | Four stylized crown classes (incisor/canine/premolar/molar), two arches; quality parameter changes sampling. | Synthetic teaching proxies, with no patient anatomy. |
| `babylon-anatomy.js`: `gingivaData` | Original parametric interpolation along 16 cervical sites per arch. | Spline mesh, interdental papillae and stitched end caps. | Synthetic soft-tissue proxy, not a segmentation or measured geometry. |
| `babylon-anatomy.js`: `jawData` | Original spline alveolar support geometry. | Closed smooth tube, not derived from CT/CBCT or scans. | Synthetic alveolar proxy, **not** an anatomical mandible/maxilla. |
| `dental-appearance.js` | Original deterministic vertex colours and lighting presets. | Stylized enamel/gingiva gradients. | Not biological or spectral reflectance measurements. |
| `assets/draco/*` | Draco runtime, Apache-2.0 (local LICENSE). | Local decoding dependency. | No anatomy. |

The upstream `mandible.glb` is intentionally **excluded** because the original mandible was identified in the existing source note as CC BY-NC, not CC BY. **Do not bundle it.** Verify per-asset author/license and intended use against primary source records before any separate distribution. No unlicensed files were introduced in this workstream.

## Individual licensed tooth asset inventory

All paths below are under `assets/dundee/` (and mirrored to `public/assets/dundee/`). Each is attributed as Dundee School of Dentistry CC BY 4.0 through the same immediate-source commit recorded above; runtime display-only cropping/scaling/mirroring is described in the transformation contract below.

| File | Original left-side FDI | Mirrored right-side FDI |
| --- | --- | --- |
| `maxillary_left_central_incisor.glb` | 21 | 11 |
| `maxillary_lateral_incisor.glb` | 22 | 12 |
| `maxillary_canine.glb` | 23 | 13 |
| `maxillary_first_premolar.glb` | 24 | 14 |
| `maxillary_second_premolar.glb` | 25 | 15 |
| `maxillary_first_molar.glb` | 26 | 16 |
| `maxillary_second_molar.glb` | 27 | 17 |
| `maxillary_third_molar.glb` | 28 | 18 |
| `mandibular_left_central_incisor.glb` | 31 | 41 |
| `mandibular_left_lateral_incisor.glb` | 32 | 42 |
| `mandibular_left_canine.glb` | 33 | 43 |
| `mandibular_first_premolar.glb` | 34 | 44 |
| `mandibular_left_second_premolar.glb` | 35 | 45 |
| `mandibular_first_molar.glb` | 36 | 46 |
| `mandibular_second_molar.glb` | 37 | 47 |
| `mandibular_third_molar.glb` | 38 | 48 |

## FDI and transformation contract

The eight maxillary files are **21–28** and the eight mandibular files **31–38** (left-sided source set). `real-dental-scene.js` reuses them for **11–18** and **41–48** by display-only mirroring. The resulting 32 FDI IDs stay attached to legacy picking, selection and cutting meshes, which are not altered by this workstream. See `PAIRS`, `STYLE`, `archPlacement`, and `sync`.

For main-scene display, `cropMesh` uses a Y-plane at 47% of the source's height (from its upper or lower occlusal side); transformed crown dimensions are normalized to generic style-specific height and width. They are **not calibrated millimetres**, and the resulting arch contacts are illustrative. The full imported tooth models are used only in the atlas. Model hashes/mesh licenses must be independently rechecked against upstream releases if the third-party binaries change.

## Surface QA and numerical units

`KlinikRealMesh.surfaceDistance(A,B)` calculates the minimum of 3D triangle-pair distances, including edge/face intersection tests. `KlinikRealMesh.measureArchSurfaces(layer)` selects up to **48 triangles per displayed crown**, transforms them into world coordinates and reports all **30 adjacent-pair** distances in uncalibrated **KlinikLab scene units (not mm)**. `KlinikRealTeeth.surfaceDiagnostics` is populated once when all 32 Dundee-derived crown instances are visible on the desktop.

A result of zero with `intersectsSampledTriangles=true` means *the sampled facets intersect*, **not** a measured volume penetration depth. A positive sampled distance is an **upper bound** on the true minimum distance (unsampled facets might be closer). A sampled non-contact cannot establish absence of collisions, occlusal adequacy, periodontal attachment or clinical accuracy. The legacy `archPlacement().diagnostics` remains an explicitly labeled **bounding ellipse estimate**, not surface data.

## Work still needing clinical or visual verification

- Dental specialist review of morphology (including roots, occlusal cusp patterns, right/left mapping and jaw soft tissue).
- Workstation captures: frontal, occlusal, oblique, upper-only and lower-only, before/after. No screenshots or headset testing are asserted here.
- Full mesh-mesh collision and signed penetration testing requires well-defined closed tooth volumes; cropped Dundee surfaces are open.
- Mobile/Quest LOD/render cost checks and in-headset verification are outstanding. The new proximity calculation runs only once for an entirely visible licensed **desktop** arch and never mutates the WebXR scene.

## Regression commands

```sh
node --test tests/babylon_anatomy.test.cjs tests/phase4_jaw.test.cjs tests/real_scene_qa.cjs
node --check babylon-anatomy.js
node --check real-dental-scene.js
cmp babylon-anatomy.js public/babylon-anatomy.js
cmp real-dental-scene.js public/real-dental-scene.js
python3 build_standalone.py
git diff --exit-code -- KlinikLab_DesktopXR_Standalone.html
```

The standalone bundle is generated from public mirrors. It is a collision-prone shared output: coordinate its final merge with the coordinator and other concurrent workstreams.
