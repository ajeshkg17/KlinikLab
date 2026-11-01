# Reviewed CC0 dental clinic visual assets (separate from clinical anatomy)

**Source / creator:** [3D Assets — Dental Practice and Surgery](https://3dassets.dev/packs/dental-practice-and-surgery), by **3D Assets**, with AI assistance reported by the publisher (Claude Opus 5). Individual source GLBs are served by the publisher on immutable, versioned CDN endpoints.

**License:** [Creative Commons CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/), confirmed on the [publisher pack](https://3dassets.dev/packs/dental-practice-and-surgery), [instrument tray item](https://3dassets.dev/assets/dental-practice-and-surgery-instrument-tray-33b4d81c) and [site distribution documentation](https://3dassets.dev/docs). CC0 allows use, adaptation and redistribution, including public source repositories. Attribution not required; preserve this notice for provenance and responsible use.

These are **visual placeholder/reference assets**, not accurate clinical apparatus, not clinically calibrated, and not the complete interactive KlinikLab application. **No FDI tooth anatomy** is supplied; source-derived FDI16 from KlinikLab is a separate pipeline. Do not represent these as validated dental instruments or patient anatomy.

## Exact original source bytes

| Stored filename | Publisher v1 endpoint | Original SHA-256 (verified in real GitHub runner) | Original bytes |
| --- | --- | --- | ---: |
| `instrument-tray-v1.glb` | https://cdn.3dassets.dev/assets/34383/v1/model.glb | `63e3396b7ccd5c5227a8464473b25acb2cf79e5797ac7518b16f16c8f6228036` | 30,452 |
| `whole-clinic-starter-v1.glb` | https://cdn.3dassets.dev/assets/34423/v1/model.glb | `9af6dd52d96bf94d50eda63ee888db975fadabb230a5dcd2ff98a11a518db77a` | 1,177,948 |

**Integrity:** The download worker refuses unexpected source URL/version, Git binary format, original byte size or a mismatched SHA-256. It publishes binary assets to this directory only with those exact checks and leaves the source bytes unchanged. Do not overwrite existing source assets or update the pinned hashes to accommodate publisher changes without a fresh review.

## Actual Blender visual review (independent original pixels)

- Native headless **Blender 4.0.2, Cycles CPU**, run [41292878372/1](https://github.com/ajeshkg17/KlinikLab/actions/runs/41292878372), code SHA `e99cea92c7903894c4364d69577c0be4c1c87692`.
- [Immutable reviewed original PNGs and source hashes](https://github.com/ajeshkg17/KlinikLab/blob/visual-feedback/runs/asset-research-cc0-dental-blender-e99cea92c790-run41292878372-attempt1/README.md).
- The assistant **retrieved the GitHub Actions ZIP, checked all four original PNG hashes, and opened all four original 1200×800 PNGs**. The earlier run `41292601531` is independently marked **visually rejected due to extreme overexposure**; it is preserved unchanged.
- **Instrument tray:** visually acceptable **as a static background prop** only. Four imported mesh objects, **728 triangles**, publisher dimensions 0.28 × 0.039 × 0.213 m; Blender world bounds [0.28, 0.212995, 0.039445] in Z-up. Mirror, probe and tweezers are recognizable but blocky, with **three unexplained cylindrical tabs protruding through one side**; instrument separation, handle/grip accuracy, collision geometry and clinical realism **not accepted**. Blender cleanup: determine what the protrusions represent; separate/correct tool components and liner; check scale, normals and material noise; re-review before a manipulable instrument workflow.
- **Whole-clinic starter:** **visually useful as a stylized operatory/reception layout candidate**. Multiple treatment rooms, chairs, working surfaces, cabinets and waiting seating are distinguishable from both angles. Blender imports **1,042 mesh-object instances; 121,536 instanced triangles**, bounding box [16.002399, 14.074177, 2.76123] m. Publisher states **46,988 triangles** for the starter; these are **not yet reconciled** with Blender's per-object instance-summed triangle count, so don't treat them as equivalent metrics. Scene includes schematic, low-detail dental equipment; no interactive case/station workflow, photorealism or accessibility/clinical dimensions verified. Blender cleanup: count unique mesh datablocks separately from instances; segment operatory stations into components, simplify scene hierarchy, add colliders/pivots/LOD, and check examination-light ergonomics and tray positioning.
- Both assets: **license/provenance verified; original bytes verified; Blender rendered; direct pixels inspected. Clinical status: NOT VALIDATED.** Neither has enamel/dentin/pulp segmentation, patient-level validity, or independent dentist sign-off.

No rendering-screen grabs or copyright-unclear NIH models are contained here. The public copy of these exact **CC0** GLBs is permitted by the publisher's terms; unrelated NC or license-ambiguous models remain outside this folder. Any future use in the app should carry a visible educational-prototype label and retain user access to source/license provenance.

## Reference labels

`LICENSE_ACCEPTED_CC0` · `SOURCE_HASH_VERIFIED` · `NATIVE_BLENDER_PIXELS_INSPECTED` · `VISUAL_PROTOTYPE_ONLY` · `CLINICAL_NOT_VALIDATED` · `FDI_NOT_APPLICABLE`.
