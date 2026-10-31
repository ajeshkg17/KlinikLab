> **PAUSED HISTORICAL UE5.8.4 EXPLORATION (31 October 2026):** The owner has switched to **Godot 4.7.2** for the next source-derived native local KlinikLab render. This SR1B Unreal guide is retained only to document original failed runs and diagnostic screenshots, **not as the next PC instruction or an accepted visual/GPU gate**. Read [SR1C_GODOT_LOCAL_CLINICAL_RENDER.md](./SR1C_GODOT_LOCAL_CLINICAL_RENDER.md) and the newest [PHASE_ROADMAP.md](./PHASE_ROADMAP.md) first. Unity Hub without a completed Unity Editor installation is a backup option; Quest/streaming remains deferred.

# SR1B — FIRST local native Unreal render of KlinikLab clinical app content

**Priority (31 October 2026): LOCAL KLINIKLAB ON OWNER RTX 5060 FIRST. Pixel Streaming 2, WebRTC, Quest 2 and other network work are blocked until this local gate is independently accepted.**

**Evidence state at creation:** source exporter regression tested; isolated Unreal 5.8 project, Python native level builder and PowerShell source-pinned workstation runner implemented in source. **No local clinical Unreal editor execution, native clinical screenshot or dedicated-GPU process trace has been observed by the development assistant in this chat.** No screenshot may be fabricated or substituted with browser/IWER pixels. Previous blank Unreal GPU/NVENC smoke evidence and its original failed reports remain separately preserved.

## 31 October 2026 — owner-PC first true clinical viewport rejected; geometry and GPU collector correction

**Preserve original owner screenshot and collector failure:** exact source SHA `d5371fe051bbca83e380e44fd3465dffe0718058`, evidence `C:\klab-sr1b-clinical-d5371fe0-20261031-183117`, capture `C:\klab-sr1b-clinical-d5371fe0-20261031-183117\Captures\capture-20261031-183402-3886844`; report `clinical-capture-report.json`, original `unreal-clinical-viewport.png`. This is a **1920×1080 authentic Unreal HighResShot**, directly inspected by the assistant. It contains black background, grid, bright/reversed text and **two small Unreal actor billboard icons depicting tooth silhouettes**, but no identifiable 3D tooth surface in the viewport. Do **not** confuse the icon graphic with source-derived rendered tooth polygons. The native map successfully saved/reloaded its two labelled Actors and five source-exact procedural tissue sections each, preserving 14,856/14,936 source submissions, but that is **not pixel evidence**. Stage 3 `Collect` failed before actual process-GPU proof with `utilizationPercent is not valid`.

**Visibility/placement hypothesis (not yet experimentally confirmed):** The script submitted procedural sections and validated flags but did not verify their registered world bounds, position relative to their intended actor, or actual editor camera framing. A new source-bounds gate derives per-tissue min/max directly from original OBJ faces; the builder sets an explicit world position for each procedural component (so a plain dynamically assembled Actor with uncertain root attachment cannot accidentally leave it at world origin), explicitly enables scene-component visibility, obtains `unreal.SystemLibrary.get_component_bounds`, and rejects zero/implausibly displaced native world bounds. The same required checks run before and after reloading the saved native level, and Stage 1 PowerShell refuses a status pass if any tissue lacks them. Two teeth are positioned closer for stronger visual discrimination, preserving native source counts/material identities. **The actual root cause (transform versus registration versus material/viewport framing) remains pending next UE5.8.4 run**; do not declare it fixed merely because the code is new.

**Viewport framing:** After a successful NEW Stage 1 and native `-Mode Open`, invoke the pinned `visual-qa/sr1b-frame-clinical-viewport.py` **in the already-running Unreal Editor Python console**, e.g. the Unreal command `py "C:/<fresh-worktree>/visual-qa/sr1b-frame-clinical-viewport.py"`. The script requires both exact actor names, five sections per tooth, nonzero component bounds, then sets the active viewport camera explicitly to the comparative tooth view, FOV 73, real-time and Game View to hide editor sprites. Capture a **new true native HighResShot 1920x1080**. Do not claim proof unless one can independently see two 3D teeth and the AFTER state differs from BEFORE.

**Windows GPU Engine collector correction:** Former `Measure-Object utilizationPercent -Maximum` evaluated an array of `[ordered]` hashtables, causing `utilizationPercent is not valid`. The collector now stores matched Windows GPU Engine PID/engtype_3D cooked values as typed `[pscustomobject]` rows, computes max/sufficient positive count with explicit finite-number checks, and writes `gpuCounterDiagnostics` with sampling count, PID-instance matches, invalid readings, optional OS counter error and block reasons. A missing `Get-Counter` provider, invalid counter instance, zero or insufficient positive readings always leaves `processSpecificGPUActivityCorroborated=false` and `status=EVIDENCE_INCOMPLETE`. Nvidia/NVENC preflight or screenshot hashes do not substitute for evidence tied to the actual editor PID. Physical GPU adapter LUID and individual pixel content still need independent review.

**Acceptance unchanged:** Source/mock CI cannot verify native raster. Only a fresh native screenshot with **visible actual clinical geometry** and valid process-specific RTX 5060 GPU evidence can clear the local Unreal gate. Pixel Streaming 2, Quest and clinical signoff remain **pending**.

## 31 October 2026 — saved-level reload actor-label validator fix

**Preserved failed owner-PC run:** exact functional source `2238259e827b3e82480558bdfac96903d4bd306a`, detached worktree `C:\klab-sr1b-worktree-2238259e-20261031-182449`, immutable evidence `C:\klab-sr1b-clinical-2238259e-20261031-182449`. Original report `C:\klab-sr1b-clinical-2238259e-20261031-182449\unreal-clinical-level-build.json`; original UE log `C:\klab-sr1b-clinical-2238259e-20261031-182449\Project\Saved\Logs\KlinikLab_SR1B_Local.log`. UE5.8.4 **confirmed both before/after original imported material instances preserved their verified two-sided overrides**, all five source tissues per state submitted exactly **14,856 before / 14,936 after** source triangles to visible native `ProceduralMeshComponent` sections, and the native `.umap` saved. It then stopped during post-save load with `Reloaded native clinical scene lost either tooth actor` (old importer line 422); **no native clinical screenshot or process GPU trace** exists from this run. Do not treat the old diagnostic viewport as accepted native KlinikLab evidence.

**Precise source bug diagnosed:** The old reload code used `if a.get_actor_label() in expected_actors` where `expected_actors` was the mapping `{'before':'KL_FDI16_BEFORE_SOURCE_MESH', 'after':'KL_FDI16_AFTER_SIMULATED_CUT_SOURCE_MESH'}`. In Python, containment in that dict checks KEYS (`before`/`after`), not actual label VALUES. The code discarded both correctly labelled actors before validating the scene. This is a real source/validation error, **not evidence that Unreal actually dropped either actor**.

**Correction:** Use a pure `sr1b_reload_contract.py` to find both complete exact expected label VALUES, distinct native Actor-class paths, and precisely five procedural sections with the original material interface and visible flag per tooth. Collect an actual Unreal inventory `beforeReload` and `afterReload`: `EditorActorSubsystem.get_all_level_actors` (UE5.8 supported API) plus `EditorLevelLibrary.get_all_level_actors` as a diagnostic/fallback; record both API counts/errors, the selected API, **every actual actor label/name/class/path**, component class/name, procedural tissue tags, section count/visibility and material name/path. Save in `unreal-clinical-level-build.json.nativeActorReloadDiagnostics` BEFORE any failing actor-contract exception. A changed/suffixed label, duplicate, wrong Actor class, missing source tooth, wrong material, missing procedural section or post-reload mismatch is **still a strict failure**. Only the faulty label-key filter changes; no source geometry counts or tissue mappings are relaxed.

**Focused regressions:** `tests/sr1b_reload_contract_test.py` simulates the exact failing dictionary-key filter, confirms actual expected label values, tests each mismatch (missing/suffixed/duplicate labels, wrong class/path, absent sections, incorrect tissue tags, materials, visibility), runs the REAL verifier function against mock save/load inventories, and checks failure retains the actual `afterReload` actor inventory for diagnosis. `tests/sr1b_local_native_project.test.mjs` executes the focused suite in CI. **Native UE5.8.4 execution on a fresh owner-PC SHA remains necessary.**

**Next Stage 1:** Use a fresh unique SHA-pinned detached worktree and evidence directory; run `-Mode Build` ONLY. The next report should have `nativeActorReloadDiagnostics.beforeReload`, `afterReload`, and `bothToothActorsAndTenTissueSectionsValidated=true` if successful; `nativeProceduralReloadedSections` has both states with five tissue entries. If it fails, share the full report and original log, especially the enumerated actor label/class/component inventory; preserve all earlier run folders. After a clean build only, perform `Open` and `Collect` plus actual native HighResShot pixels and process-specific RTX 5060 GPU engine proof. **SR1B NOT ACCEPTED, Quest/streaming deferred.**

## 31 October 2026 — MaterialInstanceConstant API failure / source fix

**New preserved owner-PC Stage 1 failure:** The exact functional revision `0f27a7e0e7179ef30a507e8bc0251749d6bbbad1` ran in a fresh isolated clinical workspace. Failed evidence is retained unchanged at `C:\klab-sr1b-clinical-0f27a7e0-20261031-181005\unreal-clinical-level-build.json`. UE **5.8.4** raised `MaterialInstanceConstant: Failed to find property 'two_sided' for attribute 'two_sided' on 'MaterialInstanceConstant'` in `import_native_materials_only` (old builder line 323). The failure happened **before clinical level creation or procedural geometry submission**. The old Unreal screenshot is **diagnostic context only**, not an accepted current KlinikLab native clinical image.

**Actual Unreal material-API correction:** The imported tissue material is usually an `unreal.MaterialInstanceConstant`, *not* a base `unreal.Material`. The `MaterialInstanceConstant` class does not expose `get_editor_property('two_sided')` directly. `visual-qa/sr1b_native_material_contract.py` now applies `get_editor_property('base_property_overrides')` to the existing original imported MIC; explicitly sets `override_two_sided=True` and `two_sided=True` on that **MaterialInstanceBasePropertyOverrides struct**; assigns the struct back to the MIC; calls `unreal.MaterialEditingLibrary.update_material_instance`; saves the original MIC asset and checks override values and unchanged original name/path. Genuine base `Material` still uses its direct two-sided property. Unknown material types, wrong `KL_<tissue>` identities, missing/readback-failed flags or failed asset saves remain **fatal**; no generic fallback material or wrong-tissue identity is permitted. Five separate original tissue interfaces remain bound to five exact-source procedural sections for **both** before and after FDI16 states.

**Focused regression:** `tests/sr1b_native_material_contract_test.py`, launched through `tests/sr1b_local_native_project.test.mjs`, mocks UE's observed exact exception on direct MIC `two_sided` lookup and covers five original material identities, correct base/instance APIs, explicit override readback, parent-material isolation, failed asset saves and unrecognized types. Source CI exercises this test; **native UE5.8.4 run with this change is still required**.

**Next owner action:** Use the latest independently validated **new full SHA** reported with this fix, in a **fresh unique detached worktree and fresh unique run directory**, Stage 1 `Build` only. If it fails, retain `unreal-clinical-level-build.json`, Unreal log, imported materials and original source manifest; report exact first UE Python exception. Only a successful Stage 1 and then original native HighResShot plus matched editor PID GPU evidence can advance the gate. Quest and streaming are deferred.

## 31 October 2026 — 5.8.4 confirmed StaticMesh reduction; new procedural render path

**Preserved failed owner-PC run:** `C:\klab-sr1b-clinical-57801f1c-20261031-174525` on exact `57801f1c7f84cc8e561cac8fc99045cb14d8f6b5`. Native UE5.8.4 successfully retained **10,320 enamel source MeshDescription triangles** but reduced its StaticMesh render LOD0 to **6,724**, unchanged after the conservative import-build flags; the direct StaticMesh reconstruction still lost faces and produced **6,721**. The build failed before a genuine clinical render image or GPU process trace. Neither previous failed reports nor viewport diagnostics are accepted outputs or modified.

**Binding correction:** The selected native clinical renderer is now the UE **ProceduralMeshComponent** plugin (enabled explicitly in the SR1B isolated `.uproject`). The imported StaticMesh LODs are used **only** for identifying their original materials and recording the observed loss. A strict parser validates the original source-pinned OBJ face stream and each tissue count. A separate CPU buffer contract maps **every original OBJ triangle** directly to three vertex positions, one normal per vertex, and three consecutive indices, with no weld/mesh simplifier or StaticMesh LOD rebuild. Two distinct labelled actors are created, each with one native procedural component for every tissue; the original `KL_enamel`, `KL_dentin`, `KL_pulp`, `KL_cementum`, `KL_caries` material interfaces are assigned separately and forced two-sided. Fail closed on lost/mixed material slots, source manifest/hash mismatch, invalid/zero-area vertices, indices not exactly 3× source triangles, absent sections/materials or a native level that does not reload with five sections per tooth.

**Quantitative contract:**
- BEFORE original procedural source stream: enamel **10,320**, dentin **112**, pulp **207**, cementum **4,105**, caries **112** = **14,856**.
- AFTER original procedural source stream: enamel **10,308**, dentin **205**, pulp **207**, cementum **4,105**, caries **111** = **14,936**.
- `nativeProceduralSourceTrianglesSubmitted.before/after` MUST equal 14,856/14,936; `nativeProceduralSections.<state>.<tissue>.proceduralIndicesSubmitted` MUST equal three times the original per-tissue count. `nativeProceduralReloadedSections` must confirm **both** separately labelled actors and each correctly named, visible, material-bound procedural section after saving and reloading the actual `.umap`.
- `importedTrianglesLOD0` and `importStageDiagnostics` record the observed **lossy imported StaticMesh** only and are NEVER used to claim procedural parity.
- The public Python ProceduralMeshComponent API exposes the section count/visibility but not the raw **post-reload internal triangle index buffer**. Accordingly `savedProceduralTriangleIndexReadbackVerified=false` is deliberately retained; do not claim post-reload byte-for-byte topology confirmation or a native GPU raster based solely on the submitted buffer. The first authentic HighResShot and process-specific RTX GPU evidence must still be personally inspected.
- Native `ProceduralMeshComponent` and SubobjectDataSubsystem Python actor-instance component creation are **untested on the exact owner UE5.8.4 build until the next unique Stage 1 run**. If UE refuses to create/serialize or reload the procedural components, preserve the exception and do **not** substitute reduced StaticMeshes.

**Next owner-PC action:** Pin the latest fully green integration SHA in a **new** detached worktree and a **new** unique evidence directory, run Stage 1 `Build`. Inspect `unreal-clinical-level-build.json`: `status=NATIVE_LEVEL_CREATED_PENDING_GPU_AND_PIXEL_EVIDENCE`, `renderPath=NATIVE_PROCEDURAL_MESH_EXACT_OBJ_FACE_INDEX_BUFFERS`, full source-index counts and reload reports. If it fails, return the exact `errors`/traceback; do not run Open/Collect or reuse an earlier run. Quest/Pixel Streaming remains blocked.

## Actual KlinikLab content, not an Unreal blank scene

The clinically-labelled slice is generated directly from production `volumetric-lab.js`:
- `ToothSolid('molar','16')`, upper-right first molar educational model.
- Existing production `VoxelMesher.build(solid,false,24)` for two states.
- **Before:** no bur cuts. **After:** same tooth with one deterministic simulated spherical cut, center `[0,1.01,0]`, radius `0.22` **unscaled model units**.
- Production tissue group names `enamel`, `dentin`, `pulp`, `cementum`, `caries`; material palette is educational color approximation.
- Case archetype `molar` / procedure `restoration`, labelled `FDI16 MOD COMPOSITE`. The native scene includes two separate named tooth actors, before/after text, an uncalibrated notice, two lights and a camera.
- Native OBJ geometry is from actual source production mesher and exporter retains `model x,y,z → UE OBJ x,z,y` with reversed winding; **10 displayed cm per normalized model unit is only a visibility/enlargement choice**, not clinical tooth scale.
- No private or real patient data, third-party Dundee model, browser screenshot or JS WebGL rendering imported into the native project.

**What has not been ported:** the complete KlinikLab web UI, real-time cutting, controller input, treatment state mutation, physics, anatomy textures, clinically calibrated depths, and the rest of the dental room. This is a first _native clinically-identified scene slice_, not a finished migration or interactive clinical simulator. Do not overstate it.

## 31 October 2026 Stage 1 owner-PC result and multi-material import correction

**Historical failed run, retained unchanged:** The owner workstation ran an isolated Stage 1 build at exact `c23c85a7956a284546509a1b3a5fc8ede6c94594` in `C:\klab-sr1b-clinical-c23c85a7-20261031-1650`. Actual production source exported **14,856 before / 14,936 after** triangles, OBJ/MTL and source manifest. The Unreal OBJ importer split each tissue `g`/`usemtl` section into **five StaticMesh assets** (enamel, dentin, pulp, cementum, caries) plus native material assets. The old Unreal script incorrectly required exactly one StaticMesh and stopped before saving a level. **There is no accepted clinical map, screenshot or GPU trace for this run.** Original failed log/build report must not be overwritten, deleted or retroactively marked successful.

**Corrected native assembly contract:** The importer now expects one native StaticMesh per **nonempty source tissue group**, and records actual `StaticMaterial` material-interface/slot names, native asset path, and Unreal LOD0 triangle counts. The pure `sr1b_section_contract.py` rejects unexpected/missing/duplicate groups, mismatched material interfaces, individually wrong triangle counts (including cancelling +N/-N errors), and wrong aggregate count. Each FDI16 state is a *logical tooth actor assembly*: the `KL_FDI16_BEFORE_SOURCE_MESH` or `KL_FDI16_AFTER_SIMULATED_CUT_SOURCE_MESH` root StaticMeshActor carries the enamel section; other material StaticMeshActors are attached beneath that root at the same original coordinates. This is **one manipulable labelled tooth root with attached children**, not a silently merged single StaticMesh or an editable one-actor/five-component Blueprint. The build report explicitly includes `importedMaterialSections`, `actorHierarchy` and `importedTrianglesLOD0` per state. Native project hashes include **all imported tissue `.uasset` files**; no section may disappear during import or level assembly.

**Next owner-PC build:** Always use the latest explicitly validated integration SHA in a **new detached worktree and new unique SR1B evidence root**. Do **not** reuse `C:\klab-sr1b-clinical-c23c85a7-20261031-1650`. Stage 1 `Build` requires its new report to show `status=NATIVE_LEVEL_CREATED_PENDING_GPU_AND_PIXEL_EVIDENCE`, exactly five tissue identities for each state when all source counts are nonzero, and aggregate LOD0 counts **14,856 / 14,936** for this source fixture. If Unreal names/slots differ, retain its exact `observed` rows and failing report; do not disable the provenance requirement. **Only after Stage 1 succeeds** launch the native editor for a genuine HighResShot and collect PID-specific GPU work in Stages 2–3. Even Stage 3 success means independent screenshot-pixel review remains required; Quest remains deferred.

## 31 October 2026 — observed native LOD0 losses and strict source-triangle repair

**Preserve failed run:** The next owner-PC run used exactly `54e3e06bc253d75a1136fed81243050db4a8e495` and `C:\klab-sr1b-clinical-54e3e06b-20261031-1700`. Five tissue meshes and all five material interfaces were correctly imported, but Unreal's OBJ import/render build delivered **enamel 6,724 versus 10,320 source faces**, and **cementum 3,116 versus 4,105 source faces** for the *before* tooth; the previously strict section gate correctly failed before level creation. The complete failed report/log is retained unchanged. **Do not use this failed run as native dental-render evidence.**

**Quantitative source geometry audit:** An additional regression parsed the *actual exported* source-derived OBJ face coordinates and found **zero exact-zero-area triangles and zero exact duplicate unordered triangles** in both the before and after states. Minimum doubled triangle area was approximately `9.30e-7 cm²` (enamel) and `8.83e-7 cm²` (cementum), with only **two** faces in each group below `1e-6 cm²`. The observed **3,596 enamel + 989 cementum = 4,585** deleted native LOD0 faces cannot be explained by a corpus of 4,585 exactly degenerate source OBJ faces. The specific UE-stage mechanism — OBJ translator versus static mesh build/weld, source mesh description retention, precision threshold or material-import optimization — is **not yet determined**; neither automatic optimization nor a source-mesh flaw should be claimed conclusively without native diagnostics.

**Corrective import path:** With exact SHA-256-verified OBJ/MTL and tissue manifest, the builder now:
1. Imports the same source OBJ into five named Unreal StaticMesh material sections and records **prebuild native render LOD0** and, if available through UE5.8 Python, the **native StaticMesh source MeshDescription triangle count**.
2. Explicitly sets `remove_degenerates=false`, `use_mikk_t_space=false`, `generate_lightmap_u_vs=false` and `build_reversed_index_buffer=false` using UE `StaticMeshEditorSubsystem` LOD build settings. It saves each mesh and records the effective settings and **postbuild** LOD0 face count. If this is enough to preserve source geometry, no reconstruction is needed.
3. **If valid source triangles remain lost**, bypasses the lossy OBJ triangulation/build route for only that material by constructing a genuine native UE `StaticMeshDescription` directly from the **original, hashed, verified OBJ face stream**. It requires each input triangle to be a finite, indexed, nondegenerate face with the exact `KL_<tissue>` label and exact manifest per-material count; creates one native triangle for each input source face; builds/saves that same native StaticMesh asset without synthesizing, merging or reducing faces. It **still requires exact native render LOD0 parity** after saving. This route is new and must be validated on the owner UE5.8 runtime, not inferred from Python mock tests.
4. Keeps strict five-interface and **per-material + aggregate** LOD0 parity for both before and after. The build report retains `importStageDiagnostics.before/after`, `sourceMeshDescriptionTriangles`, `renderLOD0Before`, `renderLOD0After`, `renderLOD0Saved`, build flags, and `directSourceMeshDescriptionReconstruction` when used. If Unreal still drops geometry, the script fails with original diagnostics instead of silently lowering expected counts.

**Regression evidence:** CI now executes a pure source OBJ parser that refuses bad indices, unexpected materials, nonfinite or degenerate faces, a mocked native `StaticMeshDescription` path that reconstructs precisely **10,320 enamel** and **4,105 cementum** source triangles and rejects simulated native loss, plus the *actual owner-PC failed import count fixture* (before 14,856 expected, 10,271 observed). These are source/mock tests, **not proof UE5.8's native Python rebuild API will retain geometry**.

**Next gate:** Run a new unique `Build` at the next pinned passing commit. Inspect the exact build report. If it succeeds, first inspect the actual two tooth actor hierarchy, uncut/cut crown morphology, material interfaces and image; then run `Open`/`Collect` for a native HighResShot plus process GPU engine trace. If it fails, return `importStageDiagnostics` and the exact exception without relaxing the LOD/source material gate. Quest/Pixel Streaming remains strictly deferred.

## Run locally — clean revision and unique evidence

Use a fresh detached worktree with the **latest validated integration commit**, without modifying the existing root checkout or the blank-project runs. PowerShell runs from the new worktree root. It requires the already-installed Unreal **5.8.4**, NVIDIA/FFmpeg, Node 22+, and the Python Editor Script Plugin enabled in the separate checked-in `.uproject`. This method follows Epic's official [UE5.8 Python editor scripting](https://dev.epicgames.com/documentation/unreal-engine/scripting-the-unreal-editor-using-python) and [LevelEditorSubsystem](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/LevelEditorSubsystem) mechanisms.

```powershell
$repo='C:\Users\ajesh\OneDrive\study and learn\coworker\KlinikLab'
git -C $repo fetch origin integration/single-chat-validation-2026-10-30
if($LASTEXITCODE -ne 0){throw 'Git fetch failed'}
$sha=(git -C $repo rev-parse origin/integration/single-chat-validation-2026-10-30).Trim()
$worktree="C:\klab-sr1b-worktree-$($sha.Substring(0,8))-$([DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'))"
git -C $repo worktree add --detach $worktree $sha
if($LASTEXITCODE -ne 0){throw 'Unable to make detached clinical build worktree'}
Push-Location $worktree
$run="C:\klab-sr1b-clinical-$($sha.Substring(0,8))-$([DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'))"

# Stage 1: generate production-source OBJ/MTL, import into a separate UE editor
# project and SAVE /Game/Maps/L_KlinikLab_FDI16; does NOT pass visual gate.
& .\visual-qa\sr1b-run-local-kliniklab.ps1 -Mode Build -ExpectedSha $sha -EvidenceDir $run
if($LASTEXITCODE -ne 0){throw "Build failed; inspect UE log and retained run $run"}

# Stage 2: open that isolated genuine native Unreal project (no browser).
& .\visual-qa\sr1b-run-local-kliniklab.ps1 -Mode Open -ExpectedSha $sha -EvidenceDir $run
if($LASTEXITCODE -ne 0){throw 'Clinical editor launch failed'}
```

**In the native editor:** load `/Game/Maps/L_KlinikLab_FDI16` if needed. Confirm both source-imported FDI16 meshes exist with labels and an actual cut. Switch to **Lit**, pilot/focus `KL_NATIVE_CAMERA_FDI16_COMPARISON` or frame both meshes from a non-clipping oblique view, and take a real **HighResShot 1920x1080** in the Unreal Editor viewport. Do not submit a Windows desktop screenshot, Chrome/WebGL image, an Epic template level or a copied blank-project screenshot. Do not open a cloud signalling socket. Keep the clinical editor running and visibly rendering, moving the camera gently while GPU 3D counters are sampled.

```powershell
# Stage 3: collect a *new capture subfolder*, hashes, exact project-PID
# GPU Engine (3D) counter samples, actual log + native HighResShot.
& .\visual-qa\sr1b-run-local-kliniklab.ps1 -Mode Collect -ExpectedSha $sha -EvidenceDir $run
$code=$LASTEXITCODE
Write-Host "Native clinical collector exit code: $code"
Write-Host "Original clinical evidence: $run"
Pop-Location
```

Expected output under the untouched unique run directory:
```text
<run>/
  Export/
    fdi16-before.obj
    fdi16-after-cut.obj
    kliniklab-fdi16.mtl
    kliniklab-export-manifest.json
  Project/
    KlinikLab_SR1B_Local.uproject
    Config/...
    Content/Maps/L_KlinikLab_FDI16.umap
    Content/KlinikLab/NativeMeshes/*.uasset
    Saved/Logs/*.log
    Saved/Screenshots/WindowsEditor/*.png
  unreal-clinical-level-build.json
  native-level-file-hashes.json
  clinical-editor-open.json
  Captures/capture-<unique>/
    clinical-capture-report.json
    unreal-clinical-native.log
    unreal-clinical-viewport.png
    nvenc-preflight.json
    gpu-engine-3d-pid-samples.json
```

## Acceptance — no shortcut

A source commit / regression pass validates exporter logic **only**. First workstation confirmation must establish: exact source SHA, known FDI16 case and two non-identical source meshes; successfully imported native Unreal `.uasset` with LOD0 triangle counts identical to exported topology, hashed `.uasset` and saved map; fresh original native Editor screenshot and hash; matching UE 5.8.4 project process / exe / log / D3D12 NVIDIA chosen adapter; nonzero `GPU Engine\engtype_3D` performance samples tied to the **specific active clinical UnrealEditor PID**. The OS GPU counter's **LUID → physical RTX 5060 adapter association** is independently pending unless explicitly mapped. The collector must not accept a 12-frame standalone FFmpeg NVENC test as evidence that the Unreal process rendered, encoded or streamed any frame.

**Independent visual signoff:** inspect the actual PNG pixels at original resolution, verify two rendered distinct FDI16 shapes, a visibly different occlusal cut, clinical labels, lighting/geometry and no blank default-map scene. Compare original file hashes and output source; the collector's PNG metadata/signature alone does not prove visual correctness. Clinical anatomy and calibration require later qualified review.

**Decision:** SR1B stays `NOT_ACCEPTED` if the project fails to import, screenshot shows blank/incorrect geometry, only CPU/WebGL evidence is available, process GPU raster trace is absent, PID/LUID mapping remains unresolved without other comparable authoritative evidence, or original pixels are uninspected. Record precise blocker; fix only the failed layer, using a new unique capture/build run as appropriate. Do **not** enable Pixel Streaming or Quest until this local KlinikLab content gate passes. Existing Phase9 WebXR work remains separate and unchanged.

## Preserved earlier blank-project evidence (never relabel as clinical)

Original `6895ae70` and `45beb893` SR1 workstation evidence remain under their owner-PC paths. Read-only adapter reanalysis of the preserved log (SHA-256 `3923f2e115a651597893e3d95c9d5c9a0755cf8c4a0a00ac322b2a75c9596e67`) observed chosen adapter 0, RTX 5060, `D3D12_INDEX_MAPPED_TO_MATCHING_NVIDIA_GPU`, no blockers. Derived reanalysis JSON SHA-256 `a1ca8d73ba0b2d57a9c666925257877059537dc89a41d7aaf2ed6d55c43cd65c`. The original `EVIDENCE_INCOMPLETE` report is unchanged. This is not new native clinical-app or runtime GPU-engine utilization evidence.
