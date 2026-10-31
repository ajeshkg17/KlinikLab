# KlinikLab — FDI 16 procedure evidence and clinical-review rubric

**Scope:** Six-frame stereo demonstration of an educational, simulated occlusal preparation on the maxillary right first molar (FDI 16). The actor is scripted IWER XR controller input; the source is a simplified signed-field tooth model. This is neither a dentist-performed procedure nor validation of real clinical treatment.

## Evidence identity and chain of custody

A review can begin only after one **successful, unique, exact-SHA** PC job produces all six original binocular XR images, the complete procedure manifest and the worker's standard ten-shot XR suite. The exact commit and job ID must agree across job request, manifest, retained worker result, gallery and every published file. Each original PNG SHA-256 must match its manifest; frame counters must increase, and eye count must equal two. A decoded-video preview is supplementary verification media, never original XR proof.

Reviewers must mark *not assessable* rather than pass when a required image, eye, pose, timestamp, clinical feature or result is absent. Generated design concepts are excluded from this audit.

## Six consecutive educational checkpoints

| Step | Requested evidence | Functional minimum | Dental review (pending) |
| --- | --- | --- | --- |
| P01 — Select | Original XR left/right image, FDI 16 selected, educational mode visible | Selection is FDI 16; no prior cut | FDI notation and orientation are correct; correct tooth class |
| P02 — Baseline | Untreated occlusal surface, both eyes and stable camera | Cut count zero; source identity recorded | Cusps/fossa/fissures and upper-right molar representation plausible |
| P03 — Aim | Tracked right-hand target ray terminates on tooth | **Live** XRFrame ray cast intersects a visible surface and is not GUI-occluded | Approach direction and putative working end are understandable and do not imply a physically impossible hand/tool technique |
| P04 — Cut | Same-camera post-action stereo capture | Real app trigger event changes solid `bur` record and cavity geometry | Removed area and cavity shape are educationally coherent; no claims of clinically calibrated depth |
| P05 — Review | Actual post-cut stereo images and saved state | Difference from P02 is nonzero in **both** eyes; no unrelated FDI tooth changed | Remaining tissue, surrounding enamel, and visibility of the prepared site are plausible |
| P06 — Return | FDI 16 selected again after FDI 36 | Cut state survives the FDI 16→36→16 switch | Persistence supports training sequence; geometry shows the same cavity |

## Visual and procedural acceptance

1. **Binocular visibility:** In each step, the intended target and working context must be visible in both stereo halves; identify clipping, occlusion, mismatched eye geometry, missing UI labels and unreadable text separately. A functional check cannot override visible defects.
2. **Controlled comparison:** P02 and P04 must keep the same viewer-eye transforms, field of view, tooth placement and material settings. The pixel-difference metric needs independently verified images, not only a numeric threshold. Controller appearance may change, so anatomical region-of-interest differences should be inspected rather than relying solely on whole-frame changes.
3. **Actual action:** Confirm that a real IWER tracked target-ray `selectstart` and the app's `xrPrep.cut` code path produced a saved cut. Reject manually replaced/cropped/generated frames as original evidence.
4. **Clinical caveat:** The simulated removal radius, force, speed, load, tissue boundaries and endpoint are not calibrated to physical units or patient outcomes. Do not label the sequence an accurate caries excavation, verified cavity design or completed composite restoration.
5. **Video:** A short WebM may consist of a timed sequence of real application XR stills; this must be clearly disclosed and must not be described as a continuously filmed dentist or continuously animated drilling action. Verify media decode, duration, image dimensions, nonblank content, visibly distinct stages and correlation with the six original captures. A full Playwright recording includes harness setup and may not show a real XR compositor.
6. **Hardware and human factors:** IWER desktop success is not physical Meta Quest 2 acceptance. Physical display/readability, hand ergonomics, tool motion and interaction comfort require a separate headset experiment.
7. **Professional review:** At least one qualified dental clinician reviews anatomical geometry, instrument suitability, visual sequence, isolation assumptions, hand orientation, preparation rationale and clinical-education phrasing; record specific corrections rather than giving blanket approval.

## Reviewer record — complete only after reviewing the actual files

| Field | Reviewer entry |
| --- | --- |
| Unique job ID | Pending |
| Tested exact source SHA | Pending |
| Manifest / six PNG hashes checked | Pending |
| Original two-eye screenshots personally inspected | Pending |
| Short WebM decoded and sampled | Pending |
| Recorded before/after viewer transforms | Pending |
| Tooth/FDI/anatomy verdict | Not assessed |
| Instrument/target ray verdict | Not assessed |
| Cut/cavity educational coherence | Not assessed |
| Patient safety / treatment claims | Not assessed — nonclinical demonstration |
| Clinician name / credentials / review date | Pending qualified clinician |
| Findings / required corrections | Pending |
| Physical Quest 2 test / reviewer / date | Pending |
| Overall result | **PENDING — no clinical acceptance** |

**Status rule:** Source CI and test-harness functional success permit publishing an *educational prototype*. They do not establish expert validation. Only fill this record using a tested and personally inspected six-frame run.

## Engineering observation after job10 (31 October 2026) — NOT dental signoff

- Job: `pc-xr-procedure-fdi16-20261031-10`; exact source: `49f921f0a09983ac27d89d8df0c5dec67c9fb5f5`; owner-PC browser/IWER renderer (no server GPU).
- Six original published two-eye PNGs manually inspected in both eye halves; all six SHA-256 values independently recomputed from returned PNG binaries and matched the manifest. Selected FDI remains 16. A single saved app cut changes the original mesh and produces a small visible central occlusal cavity in both eyes; reported changed pixels `[1233,1197]` at RGB L1 >55. Switch-back after FDI 36 preserves the shown cavity.
- Three isolated close-up views (`02/04/06`) have a dark background while `01/03/05` use the clinic view; screenshots communicate a simplified app operation but **do not** establish a dentist's continuous hand/tool movement. Clipped peripheral text in the wider images remains a defect; relative anatomical/cavity plausibility and instrument realism need a qualified clinician.
- Short 52,329-byte WebM browser decoder **failed**; decoded preview absent; do not accept video playback. Full viewport WebM 1,848,615 bytes not independently decoded, and no continuous motion claim is justified.
- Medical/dental reviewer, physical Quest2 test, true LAN server rendering and streaming, and real-world force/handpiece calibration: **all pending**. This engineering inspection does not fill the professional review fields or establish any clinical correctness.
