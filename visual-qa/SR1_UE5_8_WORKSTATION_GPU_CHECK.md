# SR1 UE 5.8 workstation GPU-render check — NOT Pixel Streaming

**Status: UE 5.8 files reportedly installed on the owner PC, NOT verified by running the editor here.** User/PC inspection found a ToolComplete marker, populated \`Engine\`, \`FeaturePacks\`, \`Templates\` and an \`UnrealEditor.exe\` file of **513,464 bytes**, last written around 14:23 on 2026-10-31. No editor process and no coworker-workspace \`.uproject\` were present at that observation. The file's presence is not proof of successful launch or GPU rasterization. This note records user-supplied observation, not a local tool result.

The repository now contains an **SR1 minimal project descriptor** at \`visual-qa/ue5_8-gpu-probe/KlinikLab_SR1_GPUProbe.uproject\` and project configuration. This descriptor is **not** a created UE binary map, built prototype or rendered test. It provides a pinned \`.uproject\` for the Editor to open using the built-in \`/Engine/Maps/Templates/Template_Default\` example map. If UE cannot load that built-in map, create/save a level through the editor; never substitute browser WebGL imagery. This GPU smoke project does **not** contain VRPawn, dental anatomy or Pixel Streaming 2. The actual VR prototype remains a **separate UE5 Virtual Reality template project** created through Epic's Project Browser.

## Actual PC execution — three steps

Run from the repository checkout **on the Windows workstation desktop**, not in GitHub Actions. Engine location may differ; adjust \`-EngineRoot\`. An exact Git commit is recorded and the \`visual-qa/evidence-local/\` folder is ignored by Git.

\`\`\`powershell
$sha = (git rev-parse HEAD).Trim()
$run = "visual-qa/evidence-local/ue58-render-$([DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'))"
# No GPU operation yet: inspect reported engine installation and .uproject.
& .\visual-qa\sr1-unreal-render-check.ps1 -Mode Inspect -ExpectedSha $sha -EvidenceDir "$run-inspect"

# Actual PC-only GPU + NVENC preflight followed by UnrealEditor.exe launch.
# This requires Node, FFmpeg with h264_nvenc, NVIDIA driver and interactive Windows desktop.
& .\visual-qa\sr1-unreal-render-check.ps1 -Mode Launch -ExpectedSha $sha -GpuIndex 0 -EvidenceDir "$run"

# In the running Unreal Editor, open a visible lit test level (the engine's
# Template_Default map is preconfigured), and take a real native screenshot.
# In a PIE / standalone game viewport, use the console: HighResShot 1920x1080
# or use the editor viewport's High Resolution Screenshot tool.
# After doing so, collect actual RHI log and image metadata:
& .\visual-qa\sr1-unreal-render-check.ps1 -Mode Collect -ExpectedSha $sha -EvidenceDir "$run"
\`\`\`

The script verifies the real installed \`Engine\Build\Build.version\` is **5.8**, \`UnrealEditor.exe\`, \`Templates\` and \`FeaturePacks\`, verifies the checked-out project descriptor and SHA, and invokes the existing dedicated **NVIDIA GPU + actual H.264 NVENC** preflight. It will not launch if the hardware preflight fails. It starts the real Editor with \`-d3d12\`, never \`-nullrhi\`. The operator captures a screenshot into the project's \`Saved\Screenshots\Windows\` via Unreal's own \`HighResShot\` or screenshot tool; the script records the original image SHA and chosen D3D12 NVIDIA-adapter log evidence where present. It never claims those alone prove GPU occupancy, video streaming or satisfactory quality; process-level GPU engine/encoder traces and independent pixel review are the next acceptance step. The original project and screenshot data remain on the workstation.

## Failure or missing prerequisites

- \`ENGINE_EXECUTABLE_MISSING\`: check the actual installation path and executable.
- \`ENGINE_PRESENT_PROJECT_MISSING\`: sync the repository scaffold or point \`-ProjectPath\` to a genuine UE 5.8-created \`.uproject\`. Do not claim the VR template exists.
- Preflight fails: **hard stop**, no CPU, integrated-GPU, software encoder or lower quality fallback.
- \`UE_GPU_RENDER_EVIDENCE_INCOMPLETE\`: editor process, selected dedicated D3D12 adapter log, or a genuine rendered screenshot is missing; inspect the actual UE log, add a visible lit level, and run collection again.
- \`UE_GPU_RHI_AND_SCREENSHOT_FOUND_INDEPENDENT_REVIEW_PENDING\`: file hashes and RHI lines exist but manual screenshot inspection and process GPU-engine attribution are required before approving even the non-VR render check.

## Evidence boundary and next UE5 Pixel Streaming 2 gate

This is **workstation local Unreal Editor GPU rendering** only. It does **not** prove a dedicated-GPU **server-side stream**, hardware encoding by the Unreal process, correct stereo projection, headset decoding, secure WebRTC, or clinical anatomy. Epic's [Unreal command-line documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/command-line-arguments-in-unreal-engine), [Project Browser guidance](https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-a-new-project-in-unreal-engine), and [HighResShot instructions](https://dev.epicgames.com/documentation/en-us/unreal-engine/taking-screenshots-in-unreal-engine) describe these native UE paths. Once verified, create **a separate proper Virtual Reality template project**, enable Pixel Streaming 2, disable OpenXR for Epic's experimental VR-stream workflow, compile VRPawn and then perform the secure Quest 2 protocol tests documented in \`SR1_UE5_PS2_VR_PROTOTYPE.md\`. Never treat IWER or browser-generated frames as evidence for this step.

## New actual UE58_RenderSmokeTest project (2026-10-31 workstation report)

The owner PC now has `C:\Users\ajesh\OneDrive\Documents\Unreal Projects\UE58_RenderSmokeTest`. Its blank project reportedly loads OpenWorld, initializes D3D12/path-tracing shader pipelines and remains responsive. This is stronger than mere installation, but it is **still not a captured rendered viewport or a verified dedicated GPU**. Use the following non-invasive attach command rather than launching another editor:

```powershell
$sha=(git rev-parse HEAD).Trim()
$run="visual-qa/evidence-local/ue58-attach-$([DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'))"
.\visual-qa\sr1-check-existing-unreal.ps1 -ProjectDirectory 'C:\Users\ajesh\OneDrive\Documents\Unreal Projects\UE58_RenderSmokeTest' -ExpectedSha $sha -GpuIndex 0 -EvidenceDir $run
```

First, in the running Unreal Editor, take a genuine native screenshot of the **visible lit OpenWorld scene** using `HighResShot 1920x1080` (or High Resolution Screenshot tool). The attach script searches for one `.uproject`, does not start a new editor, copies latest `Saved\Logs\*.log` and `Saved\Screenshots\Windows\*.png`, computes their hashes, checks whether a running editor command line names that project, and separately runs the exact-source NVIDIA/NVENC preflight (not Unreal encoding). It writes `unreal-attach-report.json` and native originals to a **new ignored** evidence directory. If no screenshot, clear D3D12 selected-adapter evidence or NVENC is present, the report remains **EVIDENCE_INCOMPLETE**. If no GPU is NVIDIA or FFmpeg NVENC is unavailable, **fail closed**, not a CPU or low-quality fallback. Process GPU-engine attribution and personal pixel review still need actual workstation evidence. Nothing here claims Pixel Streaming, VRPawn, or physical Quest 2 validation.
