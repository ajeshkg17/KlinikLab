# KlinikLab — LAN GPU renderer, stereo streaming and remote-input architecture

> **Binding sequence (31 October 2026):** Build and independently validate a native **LOCAL** KlinikLab FDI16 clinical source-derived Unreal render on the owner GPU **before** beginning the LAN server transport/Pixel Streaming/Quest receiver work. This document is an architecture destination, not current implementation status. First local gate and workstation commands: [SR1B_LOCAL_KLINIKLAB_RENDER.md](./SR1B_LOCAL_KLINIKLAB_RENDER.md). Blank Unreal smoke evidence does not close this gate.


**Status (31 October 2026): design and feasibility assessment only. No server-side GPU frames, streaming transport, headset decoder, or remote XR control endpoint has been implemented or validated.** This is the requested architecture target and does NOT describe the current application. Do not mislabel the existing Playwright/IWER screenshots as server-rendered evidence.

## 1. Evidence-backed audit of the current implementation

| Execution location | Checked-in entry/source | What actually happens |
| --- | --- | --- |
| Node.js workstation process | `server/server.mjs` | `node:http.createServer`, static file/API routing, `/api/health`, `/api/ai` for optional Gemini. No GPU context, renderer, hardware video encoder, XR stream publisher, WebRTC peer, or returned controller-event processing. The checked-in server binds `127.0.0.1`; Tailscale HTTPS can expose the files to authorized peers, but does **not** move rendering to the server. Other LAN deployment paths must be independently inspected. |
| Desktop browser | `index.html` → `engine.js` (`DentalScene`) | The **browser canvas** creates `webgl2`/`webgl`, compiles vertex/fragment shaders, uploads vertex buffers and calls `gl.drawArrays` under `requestAnimationFrame`. CPU voxel meshing and simulated cuts are also browser JavaScript (`volumetric-lab.js`, `xr-procedure.js`); desktop optional Babylon and fallback are also browser-side. |
| Quest Browser, current immersive path | `engine.js` `enterVR`, `xrFrame` | `navigator.xr.requestSession('immersive-vr')`, `new XRWebGLLayer(session, this.gl)`, `session.requestAnimationFrame`; browser-side code obtains head/hand poses, ray/hit tests and calls `this.draw(view.transform.inverse.matrix,view.projectionMatrix)` for each eye into the device's local XR framebuffer. The Quest **runs the renderer** on this path. |
| Owner-PC Playwright/IWER testing | `test-support/webxr-test/smoke.mjs`, `visual-qa/xr-worker.mjs` | IWER emulates Quest pose/input inside **owner-PC Chrome**. The same browser WebGL draws to XR eye buffers, which are read with `gl.readPixels` and published as PNGs. Running on a PC GPU means PC **browser** rendering, not the Node file server rendering. It is not a physical Quest test. |
| Deployment note | `README.md` | Already correctly says the present Quest WebXR renderer runs on the headset and local PC hosting does not offload the GPU. |

**Audit limits:** This records checked-in source, not an instrumentation trace from the user's particular LAN computer. A reverse proxy, separate desktop host or external cloud platform may provide files or other features, but there is no checked-in proof of an existing server GPU/video path. Do not infer GPU allocation or server render timing from HTTP response speed.

## 2. Architectural target and uncompromising browser/headset boundary

```text
        HEADSET / BROWSER = TRACKING + INPUT + DECODING/PRESENTATION
 WebXR pose/inputs  ─────── encrypted authenticated low-latency data ─────┐
 decoded stereo/video ◄──── encrypted RTP/WebRTC video and timing ──────┐  │
 (no tooth mesh/shaders or simulation executed in viewer)                │  │
             local decode/compositor/pose reprojection still required    │  │
                                                                        │  │
                TRUSTED LAN GPU WORKSTATION / SERVER                     │  │
 authoritative case/FDI state  ◄────────────────────────────────────────┘  │
 controller events/pose seq  ◄─────────────────────────────────────────────┘
 tooth model + cutting + ray collision + scene geometry + stereo camera
 dedicated GPU renderer → low-latency hardware encoder → WebRTC media
 synchronization: frameId, inputSeq, predicted display timestamp, pose id
```

**Precise interpretation of 'display/input only':** The browser/headset must not run application scene meshes, shader lighting, tooth-voxel meshing or treatment simulation. The viewer still **must** decode video, provide head/controller tracking, and hand decoded image planes to the platform display compositor; some limited device-side copy/reprojection may be unavoidable under WebXR. If the requirement literally prohibits all graphics/compositor work on the Quest, standard immersive WebXR cannot meet that requirement. Evaluate a native Quest streaming receiver (OpenXR/OS vendor runtime + video decoder) as an explicitly separate option if browser APIs cannot supply immersive 6DoF streaming safely. Never silently keep client-side rendering and call it server-rendered.

The app currently has desktop, Quest-WebXR, and standalone/bundled variants. New server-render mode must be explicit and separately tested, without turning existing IWER evidence into putative remote frames.

## 3. Research findings and limitations — validate on actual Quest

- **Meta Quest Browser** supports hosted immersive WebXR, and recommends runtime feature detection. Meta documents video formats/hardware decoding and WebXR Media Layers (including streamed `<video>` elements) as efficient video-display routes. This is proof of *capability categories*, not proof that a browser can display arbitrary low-latency **6DoF per-eye perspective frames** with correct asynchronous timewarp or depth reprojection. Probe `navigator.xr`, `XRMediaBinding`/`XRWebGLBinding`, media capabilities, codec support and decoded-video integration on a **physical Quest 2**; a desktop IWER test cannot certify it.
- Standard `XRWebGLLayer` is tied to **a local WebGL framebuffer**; it does not directly accept remote encoded video as a server-side replacement. WebXR Layers / Media Layers may reduce local graphics work but their projection, stereo packing, depth/motion vectors, asynchronous timewarp and real 6DoF compatibility must be tested on the target Quest Browser release. A video cylinder/180/360 layer can be a spatially displayed movie without providing real interactive, parallax-correct 6DoF remote-rendering.
- **WebRTC** is a sensible first transport candidate: secure encrypted video (DTLS-SRTP), SCTP/DTLS data channels, congestion estimates, statistics and peer connectivity. It does not guarantee low latency; hardware encoder API, WebRTC stack, codec profile and direct LAN ICE candidate selection depend on deployment. Start with H.264 hardware encoder and detect/measure Quest decoding support; negotiate alternatives rather than assuming VP8/AV1 performance.
- **LAN HTTPS is not optional for standard immersive WebXR.** A loopback URL may count as secure on the same machine, but `http://192.168.x.x` on a different headset is not inherently a secure origin. Use a trusted HTTPS endpoint with a valid certificate, `wss://` signaling, and WebRTC encryption. Never disable TLS checks or require a public internet relay by default. Bind a dedicated authenticated LAN server intentionally (the current file server is loopback-only); limit firewall scope and keep pairing short-lived.
- Maintain server authoritative case, instrument ownership, persistent cut records and action ordering; unreliable/latest-only high-rate pose messages and **reliable, ordered and acknowledged** discrete select/grip/reset/cut event edges. Each event must carry a sessionId, input sequence, handedness, tracked pose/coordinate frame, reference-space version, monotonic time and action state; reject stale, duplicated, spoofed, disconnected and out-of-order actions. Do not send patient data to external services.

**Official primary references (checked 2026-10-31):**
- Meta Quest Browser overview and WebXR feature detection: https://developers.meta.com/vr/documentation/web/ and https://developers.meta.com/vr/documentation/web/browser-specs/
- Meta browser codec/video support and WebXR media layers: https://developers.meta.com/vr/documentation/web/browser-video/ and https://developers.meta.com/vr/documentation/web/webxr-layers/
- W3C WebXR device/layer framebuffer contract: https://www.w3.org/TR/webxr/
- MDN WebXR secure-context and XRWebGLLayer notes: https://developer.mozilla.org/en-US/docs/Web/API/XRWebGLLayer and https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts
- WebRTC security baseline: https://www.rfc-editor.org/rfc/rfc8827.html

## 4. Proposed LAN transport and authoritative event protocol (not implemented)

**Signaling:** HTTPS/WSS, paired one-user local session. Authenticate initial pairing, server identity and transport; issue short-lived permission-scoped session tokens and protect signaling against replay/cross-origin requests. Negotiate actual browser/Quest codecs and WebXR layer support. Explicitly exclude external patient records.

**Pose/input uplink:** send `sessionId`, `seq`, `monotonicTimeNs`, `estimatedDisplayTimeNs`, `referenceSpaceId`, `headPose`, `left/right gripPose`, `targetRayPose`, tracking valid flags, gamepad button analog states and edge messages. Define handedness, units (metres, right-handed transform convention), quaternion format and controller action ownership; server returns authoritative ACKs for grip, release, select, reset, undo. Send high-rate pose states unordered/latest-only when appropriate, but never lose a critical button-up/release event. Expire disconnected sessions and release stuck tools. Privacy-minimize telemetry.

**Render/downlink:** per-eye camera computed from exactly identified head pose prediction; `serverFrameId`, `sourceInputSeq`, `serverStateRevision`, `viewProjectionId`, server render start/finish, encode start/finish, frame timestamp and stereo left/right orientation/packing. Separate video from low-rate state/diagnostics channel. Do not claim an XR frame matches an input without matching IDs. Provide a frozen-frame/reconnect state, operator quit and safe release on video or input timeout.

**Candidate stack for feasibility comparison (no commitment):** server-owned renderer using a GPU-capable process (headless GPU Chromium/EGL/WebGPU/native engine evaluated for reliable hardware acceleration), stereo offscreen textures, hardware encode via available workstation GPU, LAN WebRTC video and data channel, headset `<video>` + verified WebXR media layer if it correctly maps eye views. Benchmark an alternative native Quest receive/compositor if WebXR cannot meet geometric and motion-to-photon requirements. Do not simply move existing JavaScript WebGL to Node: current `engine.js` requires DOM, browser GL and XRSession and `server/server.mjs` has none of these.

## 5. Performance budget and measurement plan

These are **proposed experiment thresholds**, not measured values or medical comfort certification. Frame intervals alone are not end-to-end latency. For example 72 Hz is ~13.89 ms per display refresh and 90 Hz ~11.11 ms; the uplink, simulation, render, encode, network, jitter buffer, decode and compositor can span several refresh periods.

**User's LAN baseline:** The workstation/server and Quest 2 are on the same Wi-Fi 7 router. This is a favorable starting point for a local stream. The router's Wi-Fi 7 capability does not by itself establish the Quest's negotiated radio mode, link quality or low latency; record the actual association, signal, throughput, loss, jitter and end-to-end pose-to-display measurements on this setup.

**Rendering hardware policy:** A dedicated supported GPU and hardware encoder on the server are requirements, not optional accelerators. No integrated-graphics/CPU-rendering fallback and no low-end asset-quality tier will be maintained. Record the actual prototype workstation GPU model and VRAM in the test manifest; define measured high-quality scene budgets against that target, and require a stronger workstation if photoreal assets do not fit without degrading the intended experience.

Measure separately on real LAN and physical Quest 2: pose event timestamp → server arrival; authoritative response; server GPU render; GPU→encoder transfer; encoder; RTP network time/jitter/loss; jitter-buffer queue; hardware decode; local compositor; decoded-frame age at display; real photon/display timing where externally instrumented. Correlate clocks or use roundtrip + known offsets; `RTCStatsReport` alone does not equal true photon latency. Report median, p95, p99 and worst case with 72/90 Hz, stereo resolution and codec/bitrate, stationary and rapid 6DoF head/controller trajectories, congestion and network interruptions. Track stale frame age, dropped/misaligned stereo pairs, view-pose mismatch, motion sickness symptoms, latency following button press and reliable button-up recovery.

**Initial gate proposals to negotiate with headset users:** sustained 72 Hz equivalent frame delivery if Quest selects 72 Hz, p95 end-to-end input→display latency target <50 ms in controlled LAN, no persistent >100 ms tails under the target environment, <1% missed/stale frames over a ten-minute stable session, no wrong-eye swaps/eye mismatch, bounded pose age and immediate safe stop/release on tracking loss. These targets are provisional and ambitious; no value has been achieved or approved. If the browser path cannot meet comfort/safety or stereo correctness, stop browser deployment and test native receiver; do not paper over latency by weakening tests.

## 6. Strict phased gates and acceptance

### SR0 — Audit current render location / evidence isolation (first; now source-audited)
Deliver code-path table + reproducible source test asserting: no GPU renderer in Node server; current WebGL draw on client; XRWebGLLayer and per-eye draw on client; IWER gl.readPixels in owner-PC Chrome. Separate the already accepted browser/IWER visual feedback from future LAN streaming tests.
**Pass:** documented source-level location and separate artifact labels. **Open:** runtime GPU trace on actual LAN deployment, hardware headset inspection. Do not infer true LAN binding from user's physical network setup.

### SR1 — Quest receiver feasibility and transport/security spike (no app migration)
Capture physical Quest Browser version, `isSecureContext`, `navigator.xr`, `XRMediaBinding`/`XRWebGLBinding`, `MediaCapabilities.decodingInfo`, WebRTC RTCPeerConnection and DataChannel and reliable video layer stereo presentation. Compare a static **server-generated stereo test scene** versus native receiver fallback; validate actual per-eye images, parallax during translation, near/far motion, rapid rotation, timewarp behavior, secure HTTPS pairing and hand tracking access.
**Engine candidate:** Evaluate Unreal Engine 5 Pixel Streaming 2 VR first. Epic documents server-rendered WebRTC output with browser input, and a VR headset workflow; however, VR Pixel Streaming is currently described in Epic's experimental-features documentation. Prototype only until real Quest 2 streaming, controller input, stereo/6DoF, latency and reconnection are proven. Source: [UE Pixel Streaming in VR](https://dev.epicgames.com/documentation/unreal-engine/experimental-pixel-streaming-features?lang=en-US) and [Pixel Streaming overview](https://dev.epicgames.com/documentation/unreal-engine/overview-of-pixel-streaming-in-unreal-engine).

**SR1 next concrete experiment:** Pin the exact Unreal Engine build and matching Epic PixelStreamingInfrastructure version; run the fail-closed NVIDIA/NVENC workstation gate `visual-qa/sr1-dedicated-gpu-preflight.mjs`, then follow `visual-qa/SR1_UE5_PS2_VR_PROTOTYPE.md` for a non-dental UE5 VR template with 3 depth landmarks, left/right-eye identity, tracked bilateral controller input, secure LAN stream and measured hardware encode. Record `visual-qa/SR1_PROTOTYPE_RESULT_TEMPLATE.json` (all acceptance false by default). The Quest 2 and PC share a Wi-Fi 7 router but the negotiated Quest radio rate and latency are NOT known. Unreal's experimental VR workflow explicitly enables Pixel Streaming 2 and disables OpenXR in the host VR template; verify version-specific behavior instead of assuming the normal standalone VR configuration.

**Go/no-go:** demonstrably functioning authenticated HTTPS/DTLS-SRTP video + input path and correct 6DoF stereo on physical Quest 2. No geometry rendering on client. If blocked, document unsupported API/codec/reprojection and choose native Quest approach or reject remote VR browser branch.

**Owner-PC install observation (2026-10-31):** The UE 5.8 installation files, including UnrealEditor.exe and templates, are reportedly present. The actual editor/GPU render has not been run or inspected from this development session, and the coworker workspace had no .uproject. `visual-qa/ue5_8-gpu-probe/` provides only a starter non-VR project descriptor to open the real workstation editor; `visual-qa/sr1-unreal-render-check.ps1` records source-pinned NVIDIA NVENC preflight, native UE D3D12 RHI log and native screenshot information, with automatic acceptance prohibited. See `SR1_UE5_8_WORKSTATION_GPU_CHECK.md`. A proper VR template/Pixel Streaming 2 project and Quest 2 experiment remain unbuilt.

**SR1 blank Unreal project now running (2026-10-31, owner-PC report; not independently inspected here):** The separate project at `C:\Users\ajesh\OneDrive\Documents\Unreal Projects\UE58_RenderSmokeTest` was created as a blank UE5.8 project. Its native log reportedly loads `OpenWorld` and initializes `D3D12`/path-tracing shader pipelines, and the editor remains responsive. This advances the status from "no .uproject/process" to **blank Unreal project present, editor alive and D3D12 initialization reported**. It does **NOT** verify a native rendered viewport PNG, actual selected discrete GPU, NVENC, real Unreal GPU utilization, Pixel Streaming 2, a KlinikLab Unreal scene, or Quest display. New non-invasive `visual-qa/sr1-check-existing-unreal.ps1` attaches to this actual external project, runs source-pinned NVIDIA/NVENC preflight, copies a native log/screenshot with hashes into a unique ignored evidence dir, and records process-identity/adapter evidence without launching a second editor or declaring GPU success. Instructions: `visual-qa/SR1_UE5_8_WORKSTATION_GPU_CHECK.md`. **PC run not performed in ChatGPT.**

### SR2 — Server simulation & headless GPU output
Create separate server runtime process and headless stereo GPU renderer, migrate selected tooth/FDI state, procedural meshing, tool hit tests and ownership to server. Render two eye textures using explicit pose matrices. Add deterministic server tick and scene-state revision IDs, GPU timing capture and server-to-video tests.

**Photorealistic asset work:** Evaluate high-detail dental models and PBR textures available online, including commercial libraries and open repositories, for tooth morphology, gingiva, instruments and the clinical environment. Before adoption, verify that the license permits the intended app use, modification, and redistribution; record the source URL, creator, exact license, attribution, modifications, units/scale, and known anatomy limits in an asset register. Do not use scraped or license-unclear files. Prefer clean, correctly scaled topology and supported texture maps. Server rendering permits richer assets than Quest-side rasterization, but assets still consume server GPU memory, render time, storage/bandwidth and video bitrate. Test representative high-detail assets in the streamed stereo pipeline. If required quality does not meet measured workstation GPU/stream budgets, report NO-GO and improve the GPU, encoder, transport or scene implementation; do NOT switch to a lower-detail asset tier or reduce anatomy/material quality as an automatic fallback. A qualified dental reviewer must separately approve clinical anatomy; photorealistic appearance alone is not clinical accuracy.

**Pass:** GPU-side frame content and sample cut verified on server, no browser mesh/shape processing, accurate two-eye geometry and persistence. A dedicated supported GPU and hardware encoder are mandatory: the target mode must fail clearly if they are unavailable and must not silently fall back to CPU rendering or a lower-detail mode. Test high-detail, license-cleared assets on the actual workstation. Adopted assets have verified license/provenance and suitable scale, and their detailed appearance is reviewed in the actual server-rendered stream.

### SR3 — Video encode + transport + viewer presentation
Encode synchronized stereo frames using negotiated Quest-hardware-decodable format; stream over authenticated WebRTC. Browser only decodes and presents via a confirmed XR media/layer mechanism (or explicitly switch to native receiver). Handle ICE LAN candidate selection, throughput/codec tuning, frame pacing, anti-stale-frame queue. Record frame-id source and decoder metrics.
**Pass:** true streamed left/right frames, no eye swaps, original rendered-remote frame manifest/hash and matched displayed source metadata; record latency distribution, session encryption and lower-complexity viewer trace. IWER screenshot tests are NOT evidence.

### SR4 — Bidirectional controls, server authority and safety
Forward tracked head/controller poses and input edges to server; perform server-side ray hits, cuts, tool ownership and case navigation. Mirror only state/acks back. Include replay/order checks, disconnect, timeouts, invalid tracking, frame/pose divergence and secure ownership of multiple viewers. No duplicated actions or held tool after disconnect.
**Pass:** exact server-state changes acknowledged once, visible in future streamed frames, with deterministic input/log replay and failure-mode tests; no client clinical simulation or unauthorized state changes.

### SR5 — Hardware latency, comfort and reliability evaluation
On actual Quest 2 + configured LAN workstation/GPU, run 10-minute stationary and moving sessions under nominal/congested Wi-Fi, 6DoF translation, fast rotation, bilateral tool use, headset re-entry, Wi-Fi drop/reconnect. Capture p50/p95/p99 end-to-end budgets and verified stereoscopy. Require independent human comfort review; distinguish hardware latency from emulator timing.
**Pass:** measured targets approved in advance, no severe frame staleness, stereo mismatch or stuck controls. If targets not met, tune/re-evaluate native client and do **not** ship browser VR mode as remotely rendered.

### SR6 — Migration, controlled rollout and evidence
Expose explicit mutually exclusive `local-browser-render (legacy)` versus `lan-server-stream (new)` modes in deployment/config and artifacts. In new mode, fail closed when transport is unavailable: no silent local scene WebGL fallback masquerading as streamed frames. Maintain standard existing CI/IWER tests as **legacy regression**, plus separate remote worker/hardware-stream artifact set (record server renderer/encoder/GPU, session, true source frame, decoder, input/ACK timeline, network metrics and user observation). Manual qualified dental review remains an independent gate.
**Pass:** production staging on local secured network with verified client no-mesh render, reproducible streamed evidence and documented rollback. Do not promote until SR1–SR5 pass.

## 7. Risks and decisions pending

- Remote-rendered **stereo video** without suitable depth+pose reprojection may feel wrong when the user moves between server render and presentation. An equirect/180/360 video layer is NOT automatically equivalent to perspective 6DoF VR.
- High throughput vs low latency: LAN Wi-Fi bandwidth, Quest decoder queue, GPU encoder latency and video frame pacing can dominate performance independently of server GPU capability.
- Browser-side decoding/compositing remains necessary and is not 'local scene rendering'. If zero local graphics processing is interpreted strictly, WebXR Browser cannot satisfy it.
- Trusted LAN transport needs certificate identity and headset trust; localhost and a plain private-IP URL are not equivalent.
- Some WebXR media layer features or codec combinations may work on one Quest Browser build but not Quest 2; demand runtime feature probes and version-logged device trials.
- Continuing local XR procedure evidence is useful to preserve interaction/anatomy regression and **must remain separately labelled legacy local browser/IWER evidence** until a new remote pipeline exists.
