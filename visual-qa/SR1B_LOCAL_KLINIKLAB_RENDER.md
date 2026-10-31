# SR1B — FIRST local native Unreal render of KlinikLab clinical app content

**Priority (31 October 2026): LOCAL KLINIKLAB ON OWNER RTX 5060 FIRST. Pixel Streaming 2, WebRTC, Quest 2 and other network work are blocked until this local gate is independently accepted.**

**Evidence state at creation:** source exporter regression tested; isolated Unreal 5.8 project, Python native level builder and PowerShell source-pinned workstation runner implemented in source. **No local clinical Unreal editor execution, native clinical screenshot or dedicated-GPU process trace has been observed by the development assistant in this chat.** No screenshot may be fabricated or substituted with browser/IWER pixels. Previous blank Unreal GPU/NVENC smoke evidence and its original failed reports remain separately preserved.

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
  clinical-editor-open.json
  Captures/capture-<unique>/
    clinical-capture-report.json
    unreal-clinical-native.log
    unreal-clinical-viewport.png
    nvenc-preflight.json
    gpu-engine-3d-pid-samples.json
```

## Acceptance — no shortcut

A source commit / regression pass validates exporter logic **only**. First workstation confirmation must establish: exact source SHA, known FDI16 case and two non-identical source meshes; successfully imported native Unreal `.uasset` and saved map; fresh original native Editor screenshot and hash; matching UE 5.8.4 project process / exe / log / D3D12 NVIDIA chosen adapter; nonzero `GPU Engine\engtype_3D` performance samples tied to the **specific active clinical UnrealEditor PID**. The OS GPU counter's **LUID → physical RTX 5060 adapter association** is independently pending unless explicitly mapped. The collector must not accept a 12-frame standalone FFmpeg NVENC test as evidence that the Unreal process rendered, encoded or streamed any frame.

**Independent visual signoff:** inspect the actual PNG pixels at original resolution, verify two rendered distinct FDI16 shapes, a visibly different occlusal cut, clinical labels, lighting/geometry and no blank default-map scene. Compare original file hashes and output source; the collector's PNG metadata/signature alone does not prove visual correctness. Clinical anatomy and calibration require later qualified review.

**Decision:** SR1B stays `NOT_ACCEPTED` if the project fails to import, screenshot shows blank/incorrect geometry, only CPU/WebGL evidence is available, process GPU raster trace is absent, PID/LUID mapping remains unresolved without other comparable authoritative evidence, or original pixels are uninspected. Record precise blocker; fix only the failed layer, using a new unique capture/build run as appropriate. Do **not** enable Pixel Streaming or Quest until this local KlinikLab content gate passes. Existing Phase9 WebXR work remains separate and unchanged.

## Preserved earlier blank-project evidence (never relabel as clinical)

Original `6895ae70` and `45beb893` SR1 workstation evidence remain under their owner-PC paths. Read-only adapter reanalysis of the preserved log (SHA-256 `3923f2e115a651597893e3d95c9d5c9a0755cf8c4a0a00ac322b2a75c9596e67`) observed chosen adapter 0, RTX 5060, `D3D12_INDEX_MAPPED_TO_MATCHING_NVIDIA_GPU`, no blockers. Derived reanalysis JSON SHA-256 `a1ca8d73ba0b2d57a9c666925257877059537dc89a41d7aaf2ed6d55c43cd65c`. The original `EVIDENCE_INCOMPLETE` report is unchanged. This is not new native clinical-app or runtime GPU-engine utilization evidence.
