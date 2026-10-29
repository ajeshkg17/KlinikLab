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
