# Dundee dental surface models — third-party asset notice

**Attribution:** 3D tooth models © University of Dundee, School of Dentistry. Published under Creative Commons Attribution (CC BY 4.0). Original models and their licenses: https://sketchfab.com/DundeeDental/collections/permanent-teeth-4c0d0548c40c463c8cdceb6e0d08df7f and https://creativecommons.org/licenses/by/4.0/ .

**GLB conversions / immediate source:** https://github.com/sameralseedbth-Dental/dental-3d-models (optimized, compressed GLB files; the source repository credits the Dundee School of Dentistry). This project mirrors 16 permanent-tooth GLBs from that repository, unchanged as binary. When viewing the models in KlinikLab, retain the visible Dundee author credit, license, provenance and source link. If you republish the models elsewhere, retain this notice and the author/license link.

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

The source GLBs contain compressed geometry (`KHR_draco_mesh_compression`) and embedded image textures. The optional atlas loads Babylon.js plus its glTF loader from Babylon's official learning CDN and may download a Draco decoder from that same CDN. A network connection is currently required on first use, but the 16 GLBs are **served from KlinikLab locally**, not fetched from external model sites. The default offline exercises continue to work if optional atlas loading fails. For a production application, pin/self-host the loader and decoder.

Separate licensing for code and meshes: the CC BY terms attach to the tooth mesh assets and modified renderings; independent application code retains its own license. No patient-identifying image files or private data were copied.