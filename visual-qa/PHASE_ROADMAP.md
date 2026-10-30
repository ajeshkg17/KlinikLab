# KlinikLab — clinical-training visual and XR roadmap

## Visual direction and evidence rules
Realistic dental anatomy and treatment actions are the central subject. Use restrained, dark, compact peripheral panels; consistent legible typography; clear **FDI tooth identification**; and minimal visual competition with the workspace. The user-supplied reference is a **directional reference only**, not a license to copy proprietary UI, meshes or assets. Accurate anatomy is a research/development objective until reviewed by a suitably qualified dental expert. Use appropriately licensed, attributable geometry/textures when needed, with provenance recorded. Favor credible materials and controlled lighting over cartoon styling.

GitHub is the source/job/results exchange; **the owner PC watcher renders XR** and uploads commit-pinned stereo captures to the `visual-feedback` gallery. GitHub-hosted CI runs source, unit and build checks only. Each phase needs both **functional** and **visual** evidence. Green IWER tests, desktop visualization, physical Quest 2 usability and clinical/anatomical review are different acceptance categories; never conflate them. If hardware or reviewers are unavailable, mark those items **pending**, and continue independent work.

## Completed foundation — Phases 1–4
Preserve existing anatomy/room infrastructure, VR entry and stereo rendering, centrally visible five-tool tray, controller grip acquisition and release, tip visibility, tracking-loss recovery, and the opt-in top `?` tutorial (closed on entry/re-entry; trigger to open/close; grip cannot reopen). Phase 4 added a five-item named/purpose catalog, both-hand ray selection, explicit RETURN/RESET/CLOSE and single-instance tray behavior. The PC IWER job `pc-xr-phase4-event-sync-20261030-02` at `9afa997e5443d7465473abbbcdf0f5aff9db668d` passed 22 checks and uploaded ten captures; this was **not** a physical Quest 2 test. The follow-up `pc-xr-phase5-catalog-layout-20261030-01` at `68c44b4706690489efc48bf4e54753e7e21716fd` also passed 22 checks, with ten uploaded captures and approximately 17.65 ms mean IWER frame interval. Catalog visual approval and headset acceptance are still separate.

## Phase 5 — current VR presentation and combined regressions
**Deliverables:** Reduce oversized schematic controller silhouettes toward plausible Quest 2 Touch proportions: compact ergonomically recognizable grip, tracking ring, trigger/grip, stick and buttons. Maintain independent `gripSpace` attachment and `targetRaySpace` aiming; avoid controller overlap with held dental working ends. If convincing compact controller shapes cannot be achieved, use **simple controller-driven hand visuals** as the approved fallback, explicitly *not* hand tracking. Finish catalog purpose/action readability, lower-row clearance, tray visibility, top `?` isolation, controller selection and restart/reset flow. Keep the earlier Phase 5 job results as evidence, not proof of the new controller revision.

**Functional acceptance:** Green source/interaction tests plus a new unique pinned owner-PC XR run: both controllers receive input, bilateral grip pickup/release, no double ownership, safe tracking loss, correct ray selection, help hidden on entry/reentry, catalog names/purposes, RETURN/RESET/CLOSE, stable stereo rendering; record mean frame interval separately.

**Visual acceptance:** Human review of both-eye PC gallery captures: recognizable compact controllers, clearly exposed mirror/composite tips, all five initial tray instruments, readable selected FDI/help/catalog text, no panel/toolbar clipping or obstructed working field. Quest 2 physical ergonomics remain pending until executed on headset.

## Phase 6 — realistic proportional anatomy
**Deliverables:** Correct oversized whole-mouth scale; create distinct incisor, canine, premolar and molar shapes with anatomically credible crown taper, cusp/incisal/occlusal surface topology and relative size. Improve gum contours and jaw arches, upper/lower orientation, left/right side and FDI quadrant mapping; improve enamel and gingival optical response. Evaluate licensed reference assets/models where procedural shapes are insufficient and record licenses and attribution. Never label simplified geometry as clinically validated.

**Functional acceptance:** Geometry/FDI mapping tests for representative upper/lower, left/right, anterior and posterior teeth; proportion and jaw-position invariants and separate overview vs magnification transforms.

**Visual acceptance:** Exact-commit owner-PC stereo comparisons of full mouth, anterior and posterior/upper and lower examples, with anatomical references; qualified anatomical review logged separately and pending until performed.

**Phase 6 evidence update (2026-10-30):** Owner-PC job `pc-xr-phase6-gaze-large-20261030-07` at `2f445a27d4d7ac2d9906a0750ba850eeff8397b9` passed 25/25 emulator checks. The monitor independently reviewed both actual stereo PNG halves: complete upper/lower arches are centered, margins are clear, and individual crowns and gingival contours are visible. This closes the *specific framing/visibility* gate only. Procedural shapes remain simplified; expert dental-anatomy assessment, professional realism, occlusal fidelity and physical Quest 2 acceptance remain **pending**.

**Phase 7 incremental status (2026-10-30):** FDI 11/13/14/16/36/46 now drive differentiated procedural treatment solids with separate browser-local per-FDI cut records. Owner-PC job01 `pc-xr-phase7-fdi-saved-state-20261030-01` at `e25046ebe34412972a5d523555095dc8dd5b3359` passed 26/26 checks, ten standard captures, and six locally retained stereo FDI diagnostic images. Monitor must inspect those exact local images to assess readability and anatomy. A subsequent job02 separately exercises an actual preparation-cut selection round trip and persistence. These are educational surrogates, not clinical anatomy verification. The optional capture diagnostics are locally retained and not in the ten-image published gallery; do not claim published six-image proof until worker schema is upgraded.

## Phase 7 — selected-tooth fidelity and persistent treatment state
**Deliverables:** Enlarged treatment tooth changes to the selected **FDI tooth**, its arch/side and distinctive morphology. Keep per-FDI preparation/restoration state persistent across overview, magnified detail, navigation and re-selection. Explicit magnification applies to detail only, without deforming normal whole-mouth dimensions.

**Functional acceptance:** Selection-to-mesh mapping and per-FDI state round trips; no cross-tooth state leakage; representative upper/lower and anterior/posterior switches retain treatment state and correct orientation.

**Visual acceptance:** Pinned owner-PC stereo captures of multiple FDI selections, before/after treatment and overview/detail return, demonstrating morphologic changes and persistent treatment markings. Dental review remains separately pending.

## Phase 8 — professional clinical interface
**Deliverables:** Consistent typography, compact peripheral panels/actions, restrained dark palette, prominent selected FDI information and readable contextual descriptions. Help appears on demand; reduce competing menus, large overlays and irrelevant decorations. Keep teeth, instrument tip and treatment field visually central; derive layout principles rather than copying reference imagery or proprietary UI.

**Functional acceptance:** Input accessibility with both controllers, correct selection/control focus, tooltip/help state, FDI updates, menu reset and no accidental treatment actions.

**Visual acceptance:** Owner-PC stereo captures in overview, detail, catalog and help states checking legibility, clipping, hierarchy and focus; practical user review recorded separately.

## Phase 9 — clinical scene, materials and lighting
**Deliverables:** Focused and credible treatment workspace; plausible instrument proportions and silhouettes, softer shading, enamel/gingiva surface distinction, contact and depth cues. Remove cartoon/decorative distractions; retain just enough room context for orientation. Tune for Quest rendering performance and comfort without sacrificing essential readable details.

**Functional acceptance:** Material/mesh loading, bounded graphics cost, stereo stability, interaction and tool-state regression plus performance measurements explicitly separated from pass/fail behavior.

**Visual acceptance:** Same-camera owner-PC stereo before/after captures of tooth surfaces, gum contact, hand-held tools, catalog and room; visible improvement with no occlusion/readability regressions.

## Phase 10 — integrated acceptance and evidence review
**Deliverables:** Combined end-to-end regression suite and evidence index comparing whole-mouth overview, distinct selected FDI teeth, persisted treatment details, hand-held instruments and all panels. Prepare physical Quest 2 test instructions, accessibility/readability checklist, and a separate anatomical-review record.

**Functional acceptance:** Exact-revision PC watcher suite for both hands, catalog/help, FDI selection/state, tracking/re-entry, deterministic geometry, session stability; report render performance separately.

**Visual acceptance:** Human-reviewed stereo PC gallery of required scenes with explicit pass/fail notes; **physical Quest 2 usability, on-headset comfort and expert anatomical correctness must remain pending unless actually tested and documented**. Do not halt independent software work solely because hardware access is absent.

## Execution discipline
Progress sequentially with the earliest eligible issue (currently compact-controller Phase 5 polish), repair source regressions, publish unique commit-pinned PC jobs, then inspect the resulting gallery. Do not reissue an already completed job ID. Never assert that the watcher is running without recent heartbeat/ack or that hardware/clinical sign-off exists without actual evidence.
