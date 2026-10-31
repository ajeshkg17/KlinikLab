# SR1 small Quest 2 prototype — Unreal Engine Pixel Streaming 2 VR

**Status: NOT BUILT OR RUN.** This guide is a controlled engineering experiment, not an installed UE project, downloaded dental scene, operational LAN streaming server, or headset acceptance. The existing KlinikLab browser/IWER test screenshots remain **legacy client-rendered evidence**.

## Why this first, and what is not allowed

Test a single high-quality VR template scene on the LAN workstation before porting KlinikLab's tooth/room renderer. The workstation and Quest 2 share a **Wi-Fi 7 router**, but do not assume Quest 2 negotiates Wi-Fi 7; record the actual device association and link conditions. The server must use a **dedicated GPU with working hardware encoding**. No integrated-GPU, CPU render, software encoder, silent video/software fallback or low-detail preset is acceptable. If the workstation cannot meet the agreed high-quality and latency budget, **stop and upgrade/tune the server path**, not the dental geometry quality.

Epic's VR Pixel Streaming 2 recipe is explicitly **experimental**, may change or be removed, and is not a production promise. Read the instructions for the exact UE version used:
- https://dev.epicgames.com/documentation/en-us/unreal-engine/experimental-pixel-streaming-features
- https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-pixel-streaming-in-unreal-engine
- https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-pixel-streaming-reference
- Version-paired signalling/frontend: https://github.com/EpicGames/PixelStreamingInfrastructure

**Current UE 5.8 installation observation:** Engine files and UnrealEditor.exe were reported present on the owner PC as of 2026-10-31 ~14:23, but no local Unreal process, dedicated GPU render, or VR template project has been verified. For the first real RHI launch, start with [the separate non-VR GPU smoke project and Windows collector](./SR1_UE5_8_WORKSTATION_GPU_CHECK.md). Do not mistake that descriptor for a VR template or Pixel Streaming 2 app.

## Step 0 — preflight (workstation only; this does not start Unreal)

From a trusted exact Git checkout with **Node.js 22+, NVIDIA GPU driver and an FFmpeg build containing h264_nvenc**:

```powershell
$commit = (git rev-parse HEAD).Trim()
node visual-qa/sr1-dedicated-gpu-preflight.mjs "--expected-sha=$commit" "--output=visual-qa/evidence-local/sr1-gpu-preflight.json"
```

If multiple dedicated NVIDIA GPUs are listed, select the correct one explicitly with `--gpu-index=N`. A failure exit code is a hard stop. The tool queries NVIDIA driver/name/VRAM and performs an **actual 12-frame NVENC H.264 test**; it does not render dental assets, verify the Unreal process's GPU/encoder usage, or measure Quest streaming. This first practical preflight implements the NVIDIA/NVENC path, **not** a fallback to other vendors or CPUs. Support for other dedicated GPUs requires a separately proven hardware-encoder implementation and test gate. `visual-qa/evidence-local/` is local-only and should not be committed; record a sanitized GPU/driver/encoder manifest when sharing results.

## Step 1 — pinned VR-template UE experiment

1. Pin the actual Unreal Engine **minor/patch version**, host OS/build, NVIDIA GPU/VRAM and driver. Select the **matching version branch/release** of Epic's PixelStreamingInfrastructure; don't mix an arbitrary master branch with the installed engine. Record exact source/tag hashes.
2. Create a **new UE5 Virtual Reality template** project outside the KlinikLab web renderer. **Enable Pixel Streaming 2, disable OpenXR on the server as Epic's VR workflow directs**, restart editor, compile VRPawn. Follow any version-specific VR-template cleanup directed by Epic. This is an experiment, not permission to delete the existing KlinikLab WebXR path.
3. For initial signalling on the same workstation, Epic documents `-PixelStreamingURL=ws://127.0.0.1:8888 -PixelStreamingEnableHMD` (and an example `-ResY=1080`). That local `ws://127.0.0.1` connection is **between server processes only**. The Quest-facing frontend must be served over a **trusted HTTPS origin**; negotiate secure encrypted WebRTC media/data. Do not expose the loopback signalling port to the internet or use a self-signed certificate that the Quest treats as untrusted. Treat Epic's resolution example as documentation, **not** acceptance of a lower visual quality tier.
4. Use a simple **non-dental depth/parallax scene** for the first test: high-contrast named LEFT and RIGHT eye checks, 3 rigid cuboids placed at three measured distances, a marked floor grid, and distinct red/blue hand/controller markers. Do **not** add photoreal dental assets or migrate volumetric cuts until the basic server→Quest stereoscopy and Quest→server controller path are proven.
5. Record both eyes from a **physical Quest 2**, and prove head translation actually changes perspective/parallax in **the streamed server renders**, not just that a stereo 360 video appears. Check controller trigger/grip and correct handedness, reconnect after tracking loss/Wi-Fi interruptions, and confirm UE is the process doing GPU rendering while the Quest browser only decodes/displays video plus handles device tracking/input.

## Step 2 — hardware/video security and performance evidence

- **Hardware:** record dedicated GPU model/VRAM/driver; process-specific GPU raster activity in the UE process plus encoder-engine utilization during streaming (e.g. Windows Task Manager per-process GPU engine or vendor tooling); hardware encoder negotiated in actual WebRTC session and no `libx264` fallback.
- **Transport:** trusted HTTPS frontend, local ICE candidates as appropriate, encrypted media (DTLS-SRTP), authenticated pairing, no external cloud relay needed on normal LAN, tested controller-data round trip; report any constraints in browser/Quest compatibility.
- **Stereo:** unambiguous left/right identity, perspective-correct head translation along x/y/z, near/far occlusion and at least two tracked controller actions. A flat or 180/360 movie fails.
- **Timing:** capture source pose/event timestamp, server GPU render, encode, network jitter/loss, decode, display-frame age, p50/p95/p99, dropped/stale frames; test a 10-minute stationary session and moving head/hand session. Proposed targets in architecture doc (72 Hz cadence, p95 input-to-display <50 ms) are experimental, **not achieved**.
- **Quality:** record actual Quest resolution, stereo source resolution, rate/bitrate/codec, text readability, artifacting, GPU/VRAM utilization. Do not reduce dental asset detail or silently change to a CPU encoder to meet timing.
- **Fail closed:** absent dedicated GPU, encoder failure, XR media layer incompatibility, incorrect eye order, broken head pose reprojection, unsafe network exposure or sustained discomfort means **NO-GO** for that receiver/engine combination. Evaluate a native Quest receiver separately if Quest Browser is insufficient.

## Prototype evidence and go/no-go

Store locally under `visual-qa/evidence-local/sr1-ue5-ps2-vr-<unique-run>/`:
`preflight.json`, `prototype-manifest.json`, `server-gpu-encoder-trace`, `webrtc-stats`, `quest-capabilities`, `stereo-left-right`, `input-ack-log`, `latency-percentiles`, `security-checklist`, and headset-viewer notes. Manifest must name exact engine, infrastructure version, workstation GPU/encoder, Quest Browser/firmware, link characteristics, test hashes and PASS/FAIL/NOT_ASSESSED per gate. No raw patient data or secrets in git. Use `visual-qa/SR1_PROTOTYPE_RESULT_TEMPLATE.json` as starting schema; **all validations default false**.

Go to full asset/dental migration only after a physical Quest 2 run demonstrates secure working 6DoF server-rendered stereo, server-owned scene state, hardware encode, correct controller round trip, repeatable measured latency and a recorded quality/comfort decision. Otherwise stop and document the failed feature and alternative. Approval to design a prototype is not evidence it exists.

## Dental asset provenance after this gate

Online photoreal dental models are **not automatically licensed**, and appearance does not guarantee anatomy. Track URL, original creator, source-specific license terms, modification/redistribution permission, version/download snapshot, content hash, units/scale, texture maps, triangle counts, provenance of reprocessed GLBs, and a clinician's pending assessment in `visual-qa/dental-asset-register.json`. The Dundee School of Dentistry maxillary first molar is a useful **source-verifiable candidate** already referenced in KlinikLab, but the selected model is a left molar, not a clinically verified FDI16 right-molar mesh. Do not adopt it as an FDI16 reference by relabelling, and do not use a third-party asset with unclear terms as an approved commercial asset.


## Offline evidence integrity gate — CI-testable, no hardware assertion

Before giving any physical Quest 2 SR1 run to a human reviewer, copy the template into a **unique local run directory**, fill real measured data, set `status` to `CAPTURED`, and provide files for each required `evidence` key. A `sha256-manifest.json` is a JSON object of `{"schemaVersion":1,"files":{"left.png":"<64-hex SHA256>",...}}`. Compute hashes from original bytes; do not manufacture screenshots or create fake success values.

```powershell
node visual-qa/sr1-evidence-gate.mjs visual-qa/evidence-local/sr1-ue5-ps2-vr-<run>/prototype-manifest.json visual-qa/evidence-local/sr1-ue5-ps2-vr-<run>/
```

The tool blocks a NOT_RUN template, invalid/missing files, mismatched hashes, unsafe paths, absent dedicated GPU or H.264 hardware encode, software/quality fallback, missing real Quest/latency fields and unsupported stereo/input claims. A consistent record returns `READY_FOR_PHYSICAL_HUMAN_REVIEW`, **not** automated PASS, hardware validation, UE prototype completion or authority to migrate. A tampered video/PNG cannot be used merely by editing the manifest. A forged internally consistent bundle still needs independent physical review of the real Quest experience, workstation process traces, transport, comfort and license records. These tests use labelled artificial fixtures only.

**Cross-binding:** The validator reads the real `preflight.json` bytes and requires `passed:true`, the same exact source commit, GPU name/VRAM/driver and an actual `h264_nvenc` success claim as the SR1 run manifest. It rejects identical left/right PNGs, even if their hashes match a self-reported index. These tests still prove only local file consistency; signed/independent physical evidence and the clinician/comfort decision are separate.
