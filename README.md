# KlinikLab DesktopXR — BDS → FSP/KP dental simulator

**29 October 2026 — research prototype.** Desktop HTML front-end, optional local Node.js/Gemini server, Meta Quest 2 WebXR clinic preview. Not a clinical device or official examination assessment.

## Quick start

- Open `KlinikLab_DesktopXR_Standalone.html` directly in a PC browser for **offline** exercises, or run `node server/server.mjs` and visit `http://127.0.0.1:8787` for the server-backed version.
- Use **Clinical imaging & QA** in the header. Six tabs: synthetic radiography; STL/OBJ scan inspection; virtual bur mechanics; Quest capability diagnostics; external clinician review; linked research datasets.
- **3D Präparation** opens the original volumetric cutting engine. Change *virtual* load/rotation/tilt in the mechanics tab, then make a cut. The cut volume and geometry are genuinely recomputed, but the strength/force index is arbitrary and not calibrated to hardware.
- **AI Clinic** optionally uses Gemini through the local server. Set both `GEMINI_API_KEY` and a strong `AI_ACCESS_CODE` in the server environment, not in HTML or git. The server refuses Gemini requests when the API key is configured without an access code. The application works without AI.

## Windows hosting and Quest 2

1. Install Node.js 18+ (Node.js 22 recommended). In PowerShell, from this folder run `node server/server.mjs`.
2. For a private trusted HTTPS tunnel, with Tailscale installed and configured, use `tailscale serve --bg http://127.0.0.1:8787` (check syntax in your installed Tailscale version). It provides a `https://<machine>.<tailnet>.ts.net` URL for authorized peers.
3. Meta Quest Browser needs access to that HTTPS site, and its browser must support `immersive-vr`. The headset must be able to reach the private endpoint. The `Quest diagnostics` tab provides a self-test but is not equivalent to actual hardware QA.
4. The existing Quest immersive clinic uses stereo WebXR with controller ray selection. **An experimental WebXR tooth preparation mode now uses tracked controller rays and the same volumetric solid as the PC cutter.** It is ray-based material removal, not true physical bur–tooth collision, force calibration, or clinically validated handpiece motion. In VR, point at the `VR TOOTH PREP` panel and trigger to enable; hold the trigger on the simulated tooth to cut.

## Experimental XR preparation

- Source: `xr-procedure.js`, loaded after the shared volume and desktop modules; generated into the standalone HTML.
- On the PC: Clinical imaging & QA → Quest diagnostics → **Preview XR tooth mesh on PC** (requires WebGL). Desktop 3D preparation remains available without WebGL.
- In the Quest headset: use the in-scene **VR TOOTH PREP** panel, then controller target ray + trigger to cut. Optional controller vibration is a cue, not haptic force feedback.
- Reset/undo/case changes resynchronize the shared model. Read the learning metrics in desktop `3D Präparation` or the exported report.
- WebXR is rendered on the **Quest 2 headset itself**; hosting HTML on a powerful PC does not offload WebGL/voxel meshing to that PC. Meshing is reduced during held-trigger cuts and restored on trigger release, but headset performance is still unknown.
- Quest 2 VR functionality and haptics **have not been verified on a physical headset**. Automated tests use simulated XR poses and cannot establish headset compatibility.

## Desktop rendering and visual screenshot QA (29 October 2026)

- The browser clinic now uses smoothed procedural crown meshes with incisal, canine, premolar, and molar surface relief and thinner scalloped synthetic gingiva. These are **illustrative models**, not patient anatomy or calibrated scans.
- In `3D Präparation`, the *same editable volumetric solid* is drawn using a GPU-accelerated WebGL overlay when available. Canvas 2D remains the functional fallback if WebGL is blocked or unavailable. Tooth meshing and scoring are still computed by the CPU; the GPU accelerates rasterization and depth-tested display, not clinical physics.
- Desktop rendering is tested through `visual-qa/worker.mjs` on the owner’s local workstation, which runs approved screenshot jobs from `visual-qa/jobs/current.json` and pushes results to the separate `visual-feedback` GitHub branch. The browser worker is isolated from logged-in profiles; avoid placing real patient information in screenshots because the repository is public.
- The local workstation's RTX 5060 does **not** accelerate standalone Meta Quest 2 rendering; headset-specific performance and input require physical testing.
- `python tests/graphics_qa.py` verifies crown triangles, normal vectors, GPU-overlay presence, cutting and cross-section fallback. It does not substitute for the workstation screenshot gallery or Quest testing.

## Anatomy and imaging provenance

- Built-in tooth material and cutting geometry are **synthetic, uncalibrated models**, not clinical scans.
- The new synthetic radiographic projection is produced by integrating approximate, arbitrary tissue attenuation through the simulated tooth. It is **not a real radiograph** and does **not** validate X-ray diagnosis.
- Local OBJ/STL import only provides **surface inspection**; it does not extract enamel/dentin/pulp labels from a mesh. Imports stay in the browser; do not use real patient-identifying records.
- The scan viewer requires you to supply files legally: ToothFairy2 (CC BY-SA), ToothFairy3 (CC BY-NC-SA), 3DTeethSeg22 (CC BY-NC-ND), BodyParts3D (CC BY-SA 2.1 Japan) have different rules and some require registration. The code does not bundle these datasets.
- Haptic pulses use an optional WebXR gamepad API and are only *vibration*, not calibrated force feedback.
- Expert review form stores **unverified reviewer assertions**. Human credential verification and independent clinical review must happen outside the app.

## Clinical and engineering references

- SHIBB (Schleswig-Holstein) dental recognition: https://www.schleswig-holstein.de/DE/landesregierung/ministerien-behoerden/SHIBB/Behoerde/05_Gesundheitsberufe/aGesundheitsberufe/Akad.Gesundheitsberufe/Zahnarzt/ZahnarztHauptartikel
- German dental KP practical section ZApprO §110: https://www.gesetze-im-internet.de/zappro/__110.html
- ToothFairy2 imaging and segmentation: https://ditto.ing.unimore.it/toothfairy2/
- ToothFairy3 dataset restrictions: https://toothfairy3.grand-challenge.org/dataset/
- MICCAI 3DTeethSeg22 scan dataset: https://github.com/sergionatans/3DTeethSeg22_challenge
- DENTEX dental panoramic dataset: https://dentex.grand-challenge.org/data/
- BodyParts3D attribution example: https://github.com/organui/teeth-3d
- Web Gamepad haptics limitations: https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator
- Meta Quest Browser haptics incident: https://developers.meta.com/vr/support/investigations/938861405320634/
- VR dental training umbrella review: https://pubmed.ncbi.nlm.nih.gov/41906451/

## Tests

- `python tests/desktop_suite_qa.py`: desktop browser renders all six new tabs, local OBJ import, radiography decision, volumetric bur-response integration, expert-review report, Quest API preflight. Uses Chromium and Playwright.
- `node tests/qa_logic.js`: 42 case–station structural tests.
- `node --test tests/ai.test.mjs`: mock Gemini generation, clinical plan/review, validation and API key handling.
- `python tests/final_browser_qa.py`: existing 3D regression tests across six cases, reset, mesh cut and report export.
- `python tests/xr_workstation_qa.py`: mocked tracked-controller input, shared volumetric removal, blocker, reset and case-switch tests. Not a physical headset test.
- `node --test tests/server_security.test.mjs`: when Gemini is configured, the public Node endpoint rejects requests without `AI_ACCESS_CODE`.

**No licensed dental professional or physical Quest 2 has verified this build.**

## GitHub source publication

Source is maintained in [ajeshkg17/KlinikLab](https://github.com/ajeshkg17/KlinikLab) (currently public). Never commit real patient data, API keys, or restricted dental scans.
## Experimental Babylon.js desktop preview (29 October 2026)

- **No Unity/Blender installation is needed.** With the Node server running, open the **3D clinic** view and click **✨ Babylon** to switch to an opt-in Babylon.js PBR-lit desktop preview. Click again to return to the original renderer.
- The preview reuses the original jaw transforms, camera and selection controls, but now generates **higher-resolution synthetic crown meshes** (incisor edge, canine cusp, two-cusp premolar and four-cusp molar) and lower-profile scalloped gingival collars. It adds PBR enamel roughness/clearcoat and studio lighting. These shapes are **procedural illustrations, not scan-derived or clinically validated anatomy**, and do not change cutting physics.
- On first use the preview fetches `https://cdn.babylonjs.com/babylon.js` from the official Babylon learning CDN (internet required). The CDN is suitable for this prototype, **not production**; a later release should vendor a pinned, self-hosted library. The optional HDR environment was tested but disabled after failing to initialize in workstation QA; it is not loaded. The script is requested only when the Babylon button is clicked; default HTML and offline exercises remain available without it. Do not use the preview with confidential patient data.
- Existing built-in WebGL **continues to handle desktop picking and Meta Quest WebXR**. The Babylon canvas is a display-only desktop layer; headset performance/functionality is not established by desktop screenshots. Re-enable Classic for immersive Quest use.
- The visual QA worker approves only that exact CDN URL, inside its isolated unsigned-in browser, and records `babylon.mode`, scene mesh count, and frame count for screenshot checks.
- Compare the original Babylon render at `visual-feedback/runs/babylon-pbr-2026-10-29-07/` with the **5/5 successful** enhanced anatomy reviews at `visual-feedback/runs/babylon-anatomy-v2-2026-10-29-01/` and `visual-feedback/runs/babylon-anatomy-v3-2026-10-29-01/`. Geometry passes `node --test tests/babylon_anatomy.test.cjs`. Visible occlusal anatomy and gingiva remain schematic; Blender/scan-derived licensed assets would be needed for genuinely realistic detail.

## Licensed Dundee tooth atlas — actual GLB surfaces (29 October 2026)

- In the browser-hosted KlinikLab (`node server/server.mjs` or the static `public/` build), click **🦷 Real tooth atlas** beside the existing 3D clinic controls. This opens a separate, display-only Babylon.js study viewer. Choose 16 upper/lower left permanent-tooth models (FDI 21–28, 31–38); drag to rotate, scroll to zoom, or use **↕ Flip**.
- Original author: **University of Dundee, School of Dentistry**, CC BY 4.0. These 16 optimized GLB conversions come from [sameralseedbth-Dental/dental-3d-models](https://github.com/sameralseedbth-Dental/dental-3d-models). The [full model attribution and exclusions](assets/dundee/README.md) must be preserved; no mandible or restricted model is included. The models are more anatomically grounded than the procedural demo, but their *optimized* geometry is low resolution (e.g. first molar ~976 triangles), not photorealistic and not clinically validated.
- To inspect a properly licensed **higher-resolution** tooth, click **Import GLB…** in the atlas and select a `.glb` file on your computer (up to 50 MB). The file stays in your browser, is not transmitted to Gemini/GitHub and carries its own license. Download the original high-resolution model from its [Dundee Sketchfab source](https://sketchfab.com/DundeeDental/collections/permanent-teeth-4c0d0548c40c463c8cdceb6e0d08df7f) under the provider's download terms. The file must be GLB; other formats require conversion.
- Babylon.js and its glTF loader currently use the official Babylon learning CDN on first use. Draco decompression is now **self-hosted**, with the pinned Google Draco source and Apache-2.0 license under [`assets/draco`](assets/draco/README.md). App exercises and existing WebXR remain unchanged.
- This viewer does **not** substitute for an enamel/dentin/pulp segmentation or a drillable voxel model. FDI numbers follow the left-side source labels. Babylon atlas screenshots, when available, are written by the user's existing Playwright worker to the separate `visual-feedback` branch. Full headset testing and professional anatomical review are still required.

## Licensed tooth surfaces in the MAIN 3D scene (29 October 2026)

- Open KlinikLab with `node server/server.mjs` (or deploy the static `public/` folder), select **Teeth**, then click **🦷 Real teeth**. The Babylon display-only renderer now loads **16 locally bundled University of Dundee CC BY 4.0 anatomical tooth models** from `assets/dundee/`, mirrors/positions them as **32 permanent teeth**, and replaces the visible synthetic crown meshes in the primary 3D arches. The atlas remains available separately for inspecting complete teeth and roots.
- The 16 GLBs load through the existing self-hosted Draco decoder with at most four concurrent decodes; each model has a procedural fallback. The renderer preserves source tooth IDs, case selection, drag-orbit, zoom and the original canvas pointer picking. Click **Real teeth** again to switch back. No Unity installation is needed.
- **This does not replace the preparation voxel model or the standalone Quest WebXR renderer.** The visible Dundee surface is cut to a crown-length region and fitted to the existing illustrative arch: this is approximate placement, not an orthodontic articulation, complete gingiva/bone reconstruction, or clinically calibrated drilling. No internal enamel, dentin or pulp labels exist in these GLBs.
- The bundled assets are **decimated for real-time use**, so the scene is more anatomically informed but not yet photorealistic. Licensed high-resolution teeth, a reconstructed jaw/gingiva, richer PBR texture/IBL and clinician review are future work. The optional Babylon + GLB loader uses the official learning CDN, so browser internet access is needed for the first use.
- To verify: `node --test tests/real_scene_qa.cjs` (source mapping, geometry trimming and orientation); workstation screenshots and load diagnostics are on the `visual-feedback` branch under `runs/real-dental-arches-v1-2026-10-29-01/` and successor reviews. Source/author/license attributions remain available in the separate tooth atlas and the above provenance section.

## Phase 2 — coherent arch display and gingiva (29 October 2026)

- `babylon-anatomy.js` now derives a per-FDI placement map from the original 32 source-crown meshes; the original WebGL hit targets and Quest 2 renderer are not modified. It makes a small medial correction to the central incisors and a bounded spacing relaxation along each quadrant. These are **display corrections**, not clinically calibrated tooth movement.
- The Babylon desktop preview and Dundee crown layer share that placement map. Gingival geometry is generated from the same 16 ordered crown sites per arch, with interdental papilla peaks between teeth, rootward attached tissue and closed posterior ends. The gum was flattened after an initial screenshot review found a visibly oversized tube.
- Each arch has a single indexed gingival mesh with **5,786 vertices and 11,568 triangles**. The implementation reports approximate crown contact gaps, large gaps, and possible overlaps; these use bounding ellipses and are not surface-to-surface clinical contact tests.
- Six geometry regression tests cover crown topology, FDI registration, closed gingival topology, papilla location, and bounded spacing corrections. `.github/workflows/phase2-geometry.yml` additionally checks the source/public mirrors and verifies the regenerated standalone HTML.
- **Final Phase 2 workstation screenshot QA:** [6/6 views passed](https://github.com/ajeshkg17/KlinikLab/tree/visual-feedback/runs/phase2-final-2026-10-29-04) after flattening (frontal, occlusal, oblique, lateral, upper only, lower only), with 16/16 Dundee GLBs, 32 crown instances, no asset or renderer failures, and 32 registered FDI placements. The source mesh has 11,572 gingival vertices and 23,136 triangles across both arches. [The separate FDI interaction audit](https://github.com/ajeshkg17/KlinikLab/tree/visual-feedback/runs/phase2-fdi-2026-10-29-05) also passed: 32/32 tooth-selection controls worked in Babylon mode, with zero failures.
- This remains **synthetic educational anatomy**. No patient or professional clinical validation of occlusion, periodontal tissues, enamel contacts or dental preparation accuracy is claimed. The existing low-LOD Dundee crown approximations and mirroring are still limitations.

## Phase 3 — enamel, gingiva and direct-light appearance (29 October 2026)

- The optional desktop Babylon preview now uses the local `dental-appearance.js` module for deterministic, bounded RGBA vertex palettes. Crown color varies gently between warmer cervical and brighter occlusal/incisal enamel; gingiva has a crest-to-attached-tissue tone gradient. **These are illustrative color rules, not measured tooth reflectance or calibrated biological optics.**
- The 32 Dundee-derived display crowns and the procedural fallback crowns share a single non-metallic PBR enamel model, while gingiva uses a rougher surface with restrained sheen. **Lighting: Balanced / Studio** switches reversible direct-light profiles without importing HDR environment maps or external textures.
- These visual changes are **desktop display-only**: original WebGL picking, FDI controls, the preparation voxel engine, and the separate Quest WebXR path are not modified. The preview still downloads Babylon.js and its GLB loader from the official learning CDN on first use. The standalone HTML contains local appearance JavaScript, not Dundee GLB assets.
- `node --test tests/phase3_appearance.test.cjs tests/babylon_anatomy.test.cjs tests/real_scene_qa.cjs` covers appearance profiles, real source mesh kinds, screenshot UI toggle behavior, Phase 2 geometry and GLB mapping. The `.github/workflows/phase3-materials.yml` workflow adds script syntax, mirror comparison, standalone reproducibility and local HTTP server smoke checks. **18 regression checks passed in a separate isolated JavaScript harness**; this does not imply a completed GitHub Actions run.
- **Visual acceptance completed:** the [8/8 full Phase 3 workstation captures](https://github.com/ajeshkg17/KlinikLab/tree/visual-feedback/runs/phase3-materials-final-2026-10-29-03) passed for Balanced/Studio modes, with 18 colorized procedural templates and all 32 Dundee crown instances. The following [5/5 gingival color refinement captures](https://github.com/ajeshkg17/KlinikLab/tree/visual-feedback/runs/phase3-gingiva-final-2026-10-29-04) also passed, with no browser or model-loading errors. A final [32/32 FDI interaction audit in Studio mode](https://github.com/ajeshkg17/KlinikLab/tree/visual-feedback/runs/phase3-fdi-final-2026-10-29-05) passed with zero selection failures.
- This is an **educational graphics prototype**. The Dundee-derived meshes remain low-resolution and can exhibit simplified contours and cropping planes. Clinically calibrated enamel translucency, verified softbox illumination, reconstructed periodontal anatomy, physical Quest 2 testing and qualified clinician review are outside Phase 3.


## Phase 4 — optional jaw support and fine procedural crown detail (29 October 2026)

- The desktop Babylon view adds **Teeth: Dundee / Teeth: Fine model**. The Dundee setting retains the same 16 optimized University of Dundee CC BY 4.0 source GLBs, mirrored into 32 permanent teeth. **Fine model** switches to higher-tessellation, explicitly *synthetic* crown surfaces (7,617 vertices / 15,120 triangles per procedural template, compared with 3,169 / 6,264 before). Higher polygon density is **not** higher clinical or scan accuracy.
- A separate **Jaw support: Off / On** control shows two watertight, closed, synthetic alveolar ridge meshes built around the Phase 2 FDI placement sites: 5,786 vertices and 11,568 triangles per ridge. This is a simple spatial teaching proxy, **not a reconstructed mandible, maxilla, cortical/trabecular bone segmentation, or patient CT**. Off is the default so tooth anatomy is unobscured.
- All 32 FDI tooth IDs, pick targets, original cutting volume and separate Quest WebXR pipeline remain unchanged. Jaw support and fine-crown switching affect only the optional Babylon desktop overlay; no physics or diagnostic claim is attached.
- We deliberately do **not** bundle the University of Dundee `mandible.glb`: the corresponding original mandibular model is CC BY-NC, unlike the included CC BY tooth models. We also do not claim that re-tessellating low-resolution Dundee meshes restores missing morphology. Original genuinely higher-resolution scans must be obtained/licensed from their rights holders and separately reviewed.
- Test with `node --test tests/phase4_jaw.test.cjs tests/babylon_anatomy.test.cjs tests/phase3_appearance.test.cjs tests/real_scene_qa.cjs`; the workflow `.github/workflows/phase4-jaw.yml` verifies source mirrors and regenerated standalone. **23 geometry/interaction tests passed in the isolated JavaScript harness**. The initial [8/8 workstation technical views](https://github.com/ajeshkg17/KlinikLab/tree/visual-feedback/runs/phase4-jaw-fixed-2026-10-29-02) established correct toggling of Dundee/fine models and optional jaw geometry; a visually oversized bone proxy was subsequently reduced and the [5/5 refined jaw views](https://github.com/ajeshkg17/KlinikLab/tree/visual-feedback/runs/phase4-jaw-refined-2026-10-29-03) passed, including **32/32 FDI selections in fine-crown mode**. These are engineering checks, **not clinician assessment**. Actual dental morphology review and physical Quest 2 headset QA remain unverified.


## Phase 5 — FDI-linked tooth tissue explorer (29 October 2026)

- The **Tooth layers · Schnittbild** control opens a lightweight, accessible educational longitudinal-section panel in the main 3D simulator. The existing FDI odontogram (all **32 permanent teeth**) determines the currently displayed tooth profile: incisor, canine, premolar, or molar, including jaw and side. The view also follows new teeth selected on the original scene canvas.
- Layer buttons distinguish **enamel / Zahnschmelz, dentin / Zahnbein, pulp / Pulpa, cementum / Wurzelzement**, and **periodontal ligament / Desmodont**, with short explanatory notes. The diagrams are deterministic local SVG with no external assets or patient data.
- **Focus selected tooth: On / Off** visually de-emphasizes other crowns only in the opt-in Babylon desktop renderer (including the licensed Dundee surface display and synthetic procedural fallback); all source hit targets, clinical case scoring, preparation geometry and the Quest WebXR renderer remain unaffected. The effect resets when the panel closes.
- The diagrams are **schematic educational illustrations**. Root branching, pulp anatomy, canal counts, periodontal dimensions and tissue thicknesses are not extracted from the Dundee GLBs, derived from a radiograph, or anatomically calibrated. Do not use these illustrations for diagnosis, endodontic planning, operative depth measurement, or assessment of dental preparations.
- \`node --test tests/phase5_structures.test.cjs\` verifies FDI classification, complete local SVG layer coverage, accessibly toggled panel and focus controls, secure server script serving and correct load ordering. \`.github/workflows/phase5-structures.yml\` adds prior-phase regressions, source mirror checks, a real localhost HTTP smoke check and standalone reproducibility. **Five targeted Phase 5 tests passed** in an isolated JavaScript harness. The [workstation acceptance run](https://github.com/ajeshkg17/KlinikLab/tree/visual-feedback/runs/phase5-structures-2026-10-29-01) passed **5/5 scenes**, covering incisor/enamel, molar/pulp, focused molar, premolar/dentin, and **32/32 FDI selection controls**. Browser QA is not a clinical accuracy or Quest 2 hardware test.


## Phase 6 — FDI anatomy self-assessment (29 October 2026)

- Adds **Practice anatomy · 10 questions** inside the existing Phase 5 **Tooth layers · Schnittbild** explorer. Starting practice snapshots the selected permanent FDI tooth; a user without a valid selected FDI tooth must select one before beginning. A second panel occupies the same part of the scene and returns to the anatomy explorer on **Back to anatomy**.
- Each deterministic offline session presents **five tissue questions** (enamel, dentin, pulp, cementum, periodontal ligament) and **five FDI-specific questions** (tooth class, jaw, side, functional crown morphology and permanent quadrant). Answers are four distinct options, immediately scored and followed by an explanatory rationale. Skips and repeated responses are rejected; **Next**, **Finish practice**, and **Restart** are explicitly controlled.
- The score is **correct answers out of ten** for the current session. It is never written to localStorage, submitted to the Gemini service, tracked as a clinical assessment, or combined with the simulator's existing FSP/practical case scores. The question bank is generated locally from Phase 5 FDI descriptors, without downloadable assets.
- The module is `dental-practice.js`, with mirrored `public/dental-practice.js` and a static allowlist entry in the local Node server. The generated standalone HTML includes the practice UI. `tests/phase6_practice.test.cjs` covers 32 FDI-to-question mappings, invalid input, repeat/skip prevention, correct/wrong feedback, completion, restart, panel restoration, and script-loading isolation.
- These short quizzes rehearse **basic permanent-dentition nomenclature**. They do **not** assess anatomical scan interpretation, dental treatment competence, patient safety, German licensure or real FSP examination readiness. Full desktop/Quest validation and clinician review are separate from unit testing.
- **Acceptance evidence:** [7/7 initial workstation quiz scenarios](https://github.com/ajeshkg17/KlinikLab/tree/visual-feedback/runs/phase6-practice-2026-10-29-01) passed (wrong/right answers, next, completion, restart, back, and 32/32 FDI selections). Visual inspection identified stale answer choices on completion; after correction, the [3/3 final screenshots](https://github.com/ajeshkg17/KlinikLab/tree/visual-feedback/runs/phase6-practice-final-2026-10-29-02) passed and verified the cleaned completion screen and 32/32 FDI interactions. **Eight targeted Phase 6 regression tests** passed in an isolated JavaScript harness. This does not imply physical Quest testing or a completed GitHub Actions run.



## Built-in interactive tutorial (29 October 2026)

- Click **? Tutorial** in the main header to start the integrated **10-step guided tour**. The former Guide alert has been replaced with a readable on-screen lesson card, an outlined target, progress indicator, **Next**, **Back**, and **Skip tour** controls. **Escape** closes the tour, and left/right arrow keys navigate it. Reopening starts at the welcome step.
- The tour introduces case/station navigation, 3D orbit/zoom, view controls, permanent FDI odontogram, instrument selection, the tooth-layer explorer, the 10-question anatomy practice, the clinical task panel, and the separate Quest VR entry point. It includes warnings that educational models, radiographs and quiz scores are not clinical/diagnostic evaluations.
- The tour never clicks a treatment tool or question, changes an FDI selection, saves data, resets progress, or starts VR. It is launched manually, works on desktop/mobile, uses static local text without network calls, and is bundled inside the portable standalone HTML.
- Source: `app-tutorial.js` mirrored to `public/app-tutorial.js`. Regression tests in `tests/app_tutorial.test.cjs` cover all steps, keyboard/dismissal, mobile sidebar fallback, focus restoration and local-server integration. `.github/workflows/tutorial.yml` additionally checks syntax, script mirrors, localhost availability and the standalone HTML build.
- **Acceptance:** Six focused tutorial regression tests passed in an isolated JavaScript harness. The [seven-scene workstation browser run](https://github.com/ajeshkg17/KlinikLab/tree/visual-feedback/runs/tutorial-acceptance-2026-10-29-01) passed with no errors, covering the welcome panel, scene controls, FDI navigation, anatomy guidance, Back, final VR explanation and Skip. The final wording was updated to match the Tutorial button after visual review. No physical Quest or clinical validation is implied.


## Quest 2 comfort sizing and in-headset controller tutorial (29 October 2026)

- **Compact VR objects:** In immersive WebXR only, the anatomy table, teeth and instrument tray are scaled to **78%** of their desktop-scene dimensions. The tall lesson board and its labeled answers are reduced to **68%** of their original dimensions (2.35 m board height → approximately **1.60 m**). Ray-selection centers and radii are transformed with the visible geometry. These changes are automatically and exactly reversed on exiting VR; the physical tracking origin, room/walls, desktop camera, and XR bur are unscaled.
- **Native headset tutorial:** The separate, locally generated `xr-guide.js` makes a five-page 3D tutorial in the immersive scene, rather than attempting to display desktop HTML panels inside the headset. It **opens automatically on VR entry**. Either Quest 2 controller **index trigger** selects the in-world NEXT, BACK, and CLOSE targets. Either **grip (WebXR squeeze)** reopens the tutorial; a persistent **VR HELP / GRIP** in-world button provides another route. The tutorial explains the controller ray, lesson selection, tooth/tool selection, optional XR tooth prep (hold trigger to cut, release to stop), and the Quest system menu for leaving immersive VR. No thumbstick navigation, unsupported hand-tracking feature, or measured drilling precision is claimed.
- **Safety:** While the guide is visible, controller selection is consumed by the tutorial and ongoing virtual cuts are paused. This prevents accidental treatment attempts while reading. It is not a substitute for a correctly configured Quest 2 Guardian/boundary or real-world supervision.
- **Testing:** `node --test tests/quest2_vr_guide.test.cjs` checks tutorial navigation, grip reopen, selection blocking, reversible world transforms and pick targets, plus XR event ordering and local server integration. CI `.github/workflows/quest2-tutorial.yml` tests syntax, mirrors, HTTP serving and reproducible standalone HTML. **Mocked controller tests cannot establish real Quest 2 comfort, reachability, text legibility, refresh rate or tracking behavior. Physical Quest 2 headset verification is required before headset acceptance.**
