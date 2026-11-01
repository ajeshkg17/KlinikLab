# SR1J — Godot and Unreal native whole-clinic comparisons

Experimental only: no owner-PC rendering has been verified. Both engines reproduce a schematic dental operatory (room, chair, instruments, lighting, case display, training stations) with original FDI16 before/cut geometry. This is NOT the complete KlinikLab application. Neither experiment touches the existing Godot watcher, published job07, previous evidence, Quest, or network.

The original exact source SHA is f4d4d4151851a08342def08d9f2e461f5f5e7109. Production FDI16 source meshes contain 14,856 before and 14,936 after-cut triangles and five tissues each. Six synthetic teaching cases and seven stations are source-exported from app.js. FDI36 metadata must never be represented using FDI16 geometry.

## Godot 4.7.2 — unique private Vulkan render
The independently invoked run-godot-whole-clinic-pc.ps1 creates a new ID and original source worktree under LOCALAPPDATA/KlinikLabEngineComparison, uses the already tested private-desktop capture collector with SceneMode=clinic-cases, and samples actual Godot-PID 3D GPU activity using one 34-sample 1Hz PDH query and RTX5060 DXGI LUID. Two ORIGINAL native PNGs (front and angled/occlusal) are emitted by Godot itself over a 42s orbit. Source topology and case/station transition are checked. Old job07 is NEVER queued or rerendered.

Run PowerShell from a detached checkout of the exact experiment SHA:

    powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File .\visual-qa\run-godot-whole-clinic-pc.ps1 -RepositoryPath . -GodotExe "C:\path\to\godot_v4.7.2-stable_win64.exe"

## Unreal Engine 5.8 — preserved procedural mesh and native D3D12 images
The script run-unreal-whole-clinic-pc.ps1 has two separate modes. Prepare creates a NEW immutable source-derived Unreal project using existing source-exact SR1B importer, which bypasses the experimentally observed lossy Unreal StaticMesh import with ten five-tissue saved ProceduralMeshComponent sections. It duplicates the source level to /Game/Maps/L_KlinikLab_WholeClinic and places built-in UE room, chair, lamp, tray, display, case and station actors. It saves and reloads that native level, rechecking the original procedural sections.

Render can only operate ONCE for each prepared run; an atomic CreateNew marker prevents reuse after any crash. It launches actual UnrealEditor.exe -d3d12 on a new PRIVATE WinSta0 desktop, without foreground activation. A native UE Editor Python callback requests 3 original camera HighResShot images over a 42s orbit. A one-query 34x1s persistent Windows PDH trace filters actual Unreal process PID, valid 3D engine samples and matched RTX5060 DXGI LUID, and checks native D3D12 RTX log plus original PNG SHA256. Any missing image or GPU proof yields EVIDENCE_INCOMPLETE, never invented acceptance.

Example PowerShell from detached experiment checkout:

    $id = 'unreal-clinic-'+[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid().ToString('N').Substring(0,10)
    $run = Join-Path (Join-Path $env:LOCALAPPDATA 'KlinikLabEngineComparison') $id
    powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File .\visual-qa\run-unreal-whole-clinic-pc.ps1 -Mode Prepare -RepositoryPath . -EvidenceDir $run
    if ($LASTEXITCODE -ne 0) { throw 'Prepare failed; use a fresh run after repairing' }
    powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File .\visual-qa\run-unreal-whole-clinic-pc.ps1 -Mode Render -RepositoryPath . -EvidenceDir $run

Unreal default EngineRoot: C:\Program Files\Epic Games\UE_5.8. An installed real UE5.8 Editor is mandatory. Unreal Editor Python camera capture has not yet been verified on the owner-PC; if it fails, keep logs and use a NEW run after a code fix. No manual screenshots are requested.

## Immutable publication and direct pixel review
The publication-only publish-whole-clinic-comparison-pc.ps1 accepts -Engine Godot or Unreal with -EvidenceDir (the original run) and -RepositoryPath (the detached experiment checkout). It verifies native original PNG SHA256, engine report identities and scope limits; it copies approved original images/JSON to unique visual-feedback/runs/engine-compare-<id> folders. It updates GODOT_COMPARISON_LATEST.md or UNREAL_PC_LATEST.md but NEVER GODOT_PC_LATEST.md. Git push is non-force. The assistant can inspect these uploaded original PNG bytes directly via the GitHub connector without the user taking screenshots.

Hosted Windows CI checks actual PowerShell 5.1/7 parse, Python syntax and source/safety contracts ONLY. No CI GPU or native pixels. The projects are schematic educational room prototypes, not complete KlinikLab, clinically calibrated teeth, patient workflows, physical Quest, or accepted image review. Never rerun any existing job ID, including job07.
