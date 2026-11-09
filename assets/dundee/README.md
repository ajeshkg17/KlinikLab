# Dundee dental surface models — third-party asset notice

**Attribution:** 3D tooth models © University of Dundee, School of Dentistry. Published under Creative Commons Attribution (CC BY 4.0). Original models and their licenses: https://sketchfab.com/DundeeDental/collections/permanent-teeth-4c0d0548c40c463c8cdceb6e0d08df7f and https://creativecommons.org/licenses/by/4.0/ .

**GLB conversions / immediate source:** https://github.com/sameralseedbth-Dental/dental-3d-models at commit [`4f0ffb651998a4641ddf45c7632ea236cc164fcb`](https://github.com/sameralseedbth-Dental/dental-3d-models/commit/4f0ffb651998a4641ddf45c7632ea236cc164fcb) (optimized, Draco-compressed/512px WebP GLB files; the source repository credits the Dundee School of Dentistry). This project mirrors 16 permanent-tooth GLBs from that repository, unchanged as binary. When viewing the models in KlinikLab, retain the visible Dundee author credit, license, provenance and source link. If you republish the models elsewhere, retain this notice and the author/license link.

**What changed in KlinikLab:** Files were copied byte-for-byte into `assets/dundee/`; Babylon.js loads and re-centers a selected model for study, adjusts PBR lighting, and allows orbit/zoom. No model geometry was changed during mirroring. The immediate-source distributor converted/compressed the original models, so these GLBs have fewer triangles than the original high-resolution Sketchfab works. Higher-resolution originals may require downloading from Sketchfab under its applicable terms.

**Permanent left-side surface set (16 files):**

| Maxillary (FDI) | Mandibular (FDI) |
| --- | --- |
| `maxillary_left_central_incisor.glb` (21) | `mandibular_left_central_incisor.glb` (31) |
| `maxillary_lateral_incisor.glb` (22) | `mandibular_left_lateral_incisor.glb` (32) |
| `maxillary_canine.glb` (23) | `mandibular_left_canine.glb` (33) |
| `maxillary_first_premolar.glb` (24) | `mandibular_first_premolar.glb` (34) |
| `maxillary_second_premolar.glb` (25) | `mandibular_left_second_premolar.glb` (35) |
| `maxillary_first_molar.glb` (26) | `mandibular_first_molar.glb` (36) |
| `maxillary_second_molar.glb` (27) | `mandibular_second_molar.glb` (37) |
| `maxillary_third_molar.glb` (28) | `mandibular_third_molar.glb` (38) |

The `mandible.glb` file in the immediate-source repository is **not** included: its corresponding original University of Dundee Sketchfab **mandible** is licensed **CC BY-NC**, not CC BY. These 16 tooth files must not be conflated with a whole-jaw CT segmentation.

## Clinical and rendering limitations

The models are external tooth **surface meshes only**. They do not supply separately labeled enamel, dentin, pulp, caries, bone, or a calibrated patient-specific drilling volume. Individual tooth geometry may be mirrored or placed into a training arch only with explicit disclosure that arrangement is illustrative. Their root morphology and tooth positioning should be reviewed by a qualified dentist before use as anatomical teaching standards. They are not validated for diagnosis, endodontic planning, fabrication, or assessment of preparation quality.

The GLBs contain compressed geometry (`KHR_draco_mesh_compression`) and embedded image textures. The optional atlas downloads Babylon.js and its glTF loader from the official learning CDN when first used. **Draco decoders are bundled and served locally** under `assets/draco/` (Apache-2.0). The 16 GLBs are served locally by KlinikLab, never fetched from external model sites. The default offline exercises remain usable when the optional atlas is unavailable. For a production build, pin/self-host Babylon itself as well. The atlas also accepts a local `.glb` selected in the browser (maximum 50 MB), which is never uploaded to the server or GitHub.

Separate licensing for code and meshes: the CC BY terms attach to the tooth mesh assets and modified renderings; independent application code retains its own license. No patient-identifying image files or private data were copied.

## Native Godot FDI 36 reference (SR40)

The first native practical-station surface reference is mandibular_first_molar.glb (permanent mandibular left first molar, FDI 36). The local binary is byte-identical to the pinned immediate-source Git blob 73e9f3029d770c6b4052ebbaba708283de4c47fd at upstream commit 4f0ffb651998a4641ddf45c7632ea236cc164fcb. The Godot build converts its Draco-compressed geometry into a stock-importable GLB while retaining the original source as a separately SHA-verified sidecar. The conversion removes the embedded WebP texture and uses a neutral surface material; original vertex geometry, indices and node transforms are retained.

At runtime it is shown only in the FDI 36 endodontic practical station, beside (not in place of) the separately source-derived editable synthetic working volume. The runtime UI credits the University of Dundee and identifies the CC BY 4.0 licence. If the original source sidecar or imported model is missing, the native app displays a labelled missing-asset marker.

**Scope remains limited:** this is a surface-only tooth reference. It does not contain enamel/dentin/pulp/caries labels, pulp chamber/canal geometry, a patient-specific scan, or a calibrated drilling volume. Its morphology and orientation have not received qualified anatomy review and it is not validated for diagnosis, endodontic planning, or preparation assessment. No native visual/GPU acceptance is implied by headless import tests.

## Native chair extraction teaching fixture — FDI 35 / 36 / 37

The isolated native Godot chair extraction now uses three **distinct, source-verified left mandibular** exterior models from the Dundee-derived bundle:

- **FDI 35:** `mandibular_left_second_premolar.glb` — left second premolar; original Git blob `892db94359877442300a6eac7a496dc85cdcaf98`.
- **FDI 36:** `mandibular_first_molar.glb` — left first molar; original Git blob `73e9f3029d770c6b4052ebbaba708283de4c47fd`.
- **FDI 37:** `mandibular_second_molar.glb` — left second molar; original Git blob `947e90e80a7adb1d30f9cd09e84c9eacc8fc03f0`.

The source bytes remain unchanged as `.glb.source` sidecars; the runtime meshes are deterministic Draco-decoded training GLBs with source texture preserved, and both source and converted files have independently checked SHA256 sidecars/manifests. The imported original textures must be **512×512 pixels**. The neighbour runtime loader checks FDI-specific blob identity, bundle attribution and licence, imported texture size, nonempty mesh, and exact build SHA. The visual positions, gaps and scale are explicitly **illustrative**—not a measured articulation or a clinically reviewed arch.

The extraction gum, three scalloped marginal collars and exposed FDI36 socket bowl are **synthetic computer-generated teaching geometry**; they are not a Dundee gingival or jaw scan, nor validated anatomical tissue. The socket appears only after the central tooth is released and is hidden again on restart. It is a visible state cue and does not alter forceps contact physics, ray targets, adjacent-tooth safety checks or scoring.

**Attribution for all three surface meshes and original textures:** 3D tooth models © University of Dundee, School of Dentistry, CC BY 4.0. Source collection: https://sketchfab.com/DundeeDental/collections/permanent-teeth-4c0d0548c40c463c8cdceb6e0d08df7f . Licence: https://creativecommons.org/licenses/by/4.0/ . Immediate conversion source repository: https://github.com/sameralseedbth-Dental/dental-3d-models at `4f0ffb651998a4641ddf45c7632ea236cc164fcb`.

The already-present historical FDI36 **neutral reference** remains a separate texture-free path. This chair training surface does not add an editable tooth tissue volume; geometry, root orientation, gum margins and overall clinical correctness still require dentist review and independent real-GPU visual acceptance.
