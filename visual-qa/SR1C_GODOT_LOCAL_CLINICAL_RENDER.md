> **Job06 (31 Oct 2026):** Prepared a native Godot clinic-workspace prototype with the exact production FDI16 source, not the full KlinikLab browser application's workflow port. Corrected Windows PDH error handling with rejected-row diagnostics and strict RTX5060 LUID/PID evidence thresholds; new unique `pc-godot-clinic-20261031-job06` request remains unexecuted by the owner PC until an updated worker runs. See the newest `SR1C_GODOT_PC_WATCHER.md` section. All original job01–job05 files remain immutable; GPU/pixels/Quest/clinical acceptance pending.

> **New supported remote job mechanism:** GitHub `visual-qa/jobs/godot-current.json` and separate `visual-qa/godot-worker.mjs` provide source-SHA-pinned native Godot launch/capture/GPU diagnostics on the actual owner Windows PC **only when the PC watcher is started in an unlocked interactive session**. The existing XR watcher cannot execute this job. Read [SR1C_GODOT_PC_WATCHER.md](./SR1C_GODOT_PC_WATCHER.md) for startup and the `visual-feedback/GODOT_PC_LATEST.md` publication gate. Until the PC publishes original PNG/results, the new job is only a queued request, not a successful render.

# SR1C Godot 4.7.2: Native KlinikLab local first, Quest later

**Binding engine decision, 31 October 2026:** Godot 4.7.2 is the immediate native render engine. Unity Hub has no confirmed Editor installation and Unity remains a fallback. Unreal 5.8.4 is PAUSED exploration, not visually accepted. Preserve the entire history of original Unreal evidence.

## Status / strict sequence

Godot Project Manager is currently open on the owner RTX 5060 PC. A separate Dundee upper-left first-molar FBX has been headlessly imported in the independent sandbox:

    C:\Users\ajesh\OneDrive\study and learn\coworker\output\kliniklab-engine-bakeoff

**No Godot-rendered scene, GPU process trace or full KlinikLab application is accepted** merely from headless import.

1. SR1C-0: display the **Dundee LEFT molar FBX** in an actual native Godot game window as an IMPORT SMOKE TEST only; separately verify source attribution and license before any redistribution; NEVER relabel it as right FDI16.
2. SR1C-1: display the original production **RIGHT FDI16** before and after simulated cut as two distinct native Godot objects, with exactly five source tissues per state and source triangle parity. This native scene is a bounded clinical **education slice**, not the entire browser application or clinically calibrated anatomy.
3. SR1C-2: inspect original native pixels independently; verify actual Godot game process, Vulkan Forward+, dedicated RTX 5060 renderer and process-correlated GPU 3D evidence. Missing counters stay evidence-incomplete.
4. SR2+ only later: quality/assets and instruments, dedicated workstation encoding/WebRTC/secure LAN, full stereo controller/pose + physical Quest 2. Godot has no drop-in Epic Pixel Streaming 2.

## Immediate GUI smoke in the EXISTING Godot Project Manager

1. Select the existing Godot sandbox project under the bakeoff path above and click Edit. Locate the previously imported Dundee .fbx in FileSystem; inspect its imported MeshInstance3D descendants. A headless import success without visible triangles is not a render.
2. Create **Scene > New Scene > 3D Scene** (Node3D root), rename Dundee_Left_Molar_ImportSmoke. Drag the imported FBX scene from FileSystem under that root. Select it, move the mouse over the 3D viewport, press **F** to focus; examine actual triangles and Scale in Inspector.
3. Add a DirectionalLight3D under the root and angle toward the tooth. Add Camera3D and frame the model. Use Camera Preview; adjust its Position/Rotation or align the camera to a suitable editor view, making sure the game camera genuinely points at the model.
4. Save as dundee_left_molar_import_smoke.tscn, use **F6** (Run Current Scene). Look for an actual colored/lit molar in the native game window. If blank/black, inspect camera, lights, model scale, visibility and Godot Output. Screenshot the live game window, identify it explicitly as a Dundee **import-only smoke**, record Godot PID, and keep the evidence outside the repository. This does not prove the native source FDI16 pair or license.
5. Do not delete or overwrite the Dundee sandbox when testing the separate project below.

Godot 4.3+ uses ufbx for normal FBX imports; source: https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_3d_scenes/available_formats.html

## Source-exact native FDI16 scene: owner PowerShell

This is a DIFFERENT Godot project and a new unique evidence run. Use the complete exact SHA from the successful integration source commit. Do not use the old UE worktree or evidence folder. From PowerShell:

~~~powershell
$repo='C:\Users\ajesh\OneDrive\study and learn\coworker\KlinikLab'
$sha='<PASTE_NEW_EXACT_40_CHARACTER_SHA_FROM_CHAT>'
git -C $repo fetch origin integration/single-chat-validation-2026-10-30
if($LASTEXITCODE -ne 0){throw 'Git fetch failed'}
$stamp=[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')
$worktree="C:\klab-sr1c-godot-worktree-$($sha.Substring(0,8))-$stamp"
$run="C:\klab-sr1c-godot-native-$($sha.Substring(0,8))-$stamp"
git -C $repo worktree add --detach $worktree $sha
if($LASTEXITCODE -ne 0){throw 'Worktree creation failed'}
& "$worktree\visual-qa\sr1c-build-godot-local.ps1" -ExpectedSha $sha -EvidenceDir $run
if($LASTEXITCODE -ne 0){throw "Godot source preparation failed: $run"}
Write-Host "Import Godot project at: $run\Project\project.godot"
~~~

The preparation runner checks exact SHA, output uniqueness, original manifest hashes and per-tissue source counts, copies the source files and Godot scene/scripts and writes godot-source-prepare.json. It NEVER claims a rendered image or GPU pass.

| Original material | BEFORE | AFTER simulated cut |
| --- | ---: | ---: |
| Enamel | 10,320 | 10,308 |
| Dentin | 112 | 205 |
| Pulp | 207 | 207 |
| Cementum | 4,105 | 4,105 |
| Caries | 112 | 111 |
| **Total source triangles** | **14,856** | **14,936** |

The project main.gd reads original verified source OBJ triangle streams with (x,y,z) exported Z-up -> Godot (x,z,-y) Y-up transform, uses an ArrayMesh and MeshInstance3D per tissue, checks each group has 3 indices/face, uses distinct educational two-sided material colors, sets a scene camera/light and the correct BEFORE/AFTER visual identity. The source has no Dundee asset. Correct source submission is not evidence of actual drawn pixels.

### In Godot 4.7.2 GUI for source-derived clinic scene

1. Return to Project Manager. Choose Import, browse to the NEW $run\Project\project.godot and Import & Edit. Verify the window project title is **KlinikLab SR1C Native Godot FDI16**. Do not confuse with the existing Dundee project.
2. Wait for asset scanning/import. Open main.tscn and press **F5** (Run Project). Expect an actual native 1600x900 window with readable labels, before/after FDI16 objects side by side. An expectation is not a result. If the script throws, send the exact Output/Debugger line and original log.
3. Verify BOTH tooth 3D bodies, distinguishing simulated cut, color groups and lack of camera clipping. With the Godot GAME window focused, press **F12** to write an actual original PNG under $run\Captures. The same folder should contain native-source-submission.json. Its status must be NATIVE_GODOT_SCENE_SUBMITTED_PENDING_PIXEL_AND_GPU, which is **not acceptance**.
4. Record the screenshot path, full SHA, scene output, Godot game PID and actual renderer. The running method should be Forward+ and Vulkan. If engine falls back to Compatibility/OpenGL, the script blocks rather than silently reducing quality. Godot editor/game processes must not be confused.
5. Request independent inspection of original PNG pixels and actual process GPU evidence. An invalid/missing Windows GPU Engine counter is EVIDENCE_INCOMPLETE, not a substitute pass. The source project does not automatically claim to validate the actual RTX adapter or process GPU utilization.

Godot docs: https://docs.godotengine.org/en/4.7/classes/class_arraymesh.html and https://docs.godotengine.org/en/stable/tutorials/rendering/viewports.html

## Rejected UE evidence, retained without changing it

- Original UE source 57801f1c7f84cc8e561cac8fc99045cb14d8f6b5 at C:\klab-sr1b-clinical-57801f1c-20261031-174525 retained enamel source MeshDescription 10,320 but native StaticMesh LOD0 dropped to 6,724 then direct reconstructed 6,721.
- UE 0f27a7e... at C:\klab-sr1b-clinical-0f27a7e0-20261031-181005 failed on unsupported MaterialInstanceConstant two_sided property.
- UE 2238259e... at C:\klab-sr1b-clinical-2238259e-20261031-182449 preserved original two-sided tissue interfaces and full procedural source buffer count; a faulty actor-label validation blocked reload.
- UE d5371fe051bbca83e380e44fd3465dffe0718058 under C:\klab-sr1b-clinical-d5371fe0-20261031-183117 saved/reloaded ten sections, but real personally inspected 1920x1080 HighResShot contained reversed/overbright labels, editor icons and black floor grid, **no recognizable 3D tooth**, while Godot-unrelated Windows GPU collector failed before process evidence. This is native Unreal diagnostic context, not accepted clinical content.
- Browser/Meta IWER screenshots are client-side source QA and do not prove Godot or server rendering.

SR1C remains unaccepted until a real native source-derived Godot image and matched process GPU evidence exist. Quest streaming remains deferred.
