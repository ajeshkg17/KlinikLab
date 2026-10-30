# WebXR emulator + Playwright baseline and development phases

## Read before using
The receiving chat is **Continue Program Development**. Its current work is on `integration/single-chat-validation-2026-10-30`, last reported validated commit `4a563659`, with 114 app tests, 8 QA helper tests, 62 Chromium checks, 16 FSP exercises, no uncaught browser errors or asset failures. These are that chat's reports, not this harness run. Preserve its work and do not start from hosted main.

The installed Chrome Immersive Web Emulator was activated on http://127.0.0.1:8787/. The local tester observed the VR tutorial, both controller panels, right-controller disconnect/reconnect, VR exit and re-entry. This was a real installed-extension UI check. It was run against **main 428d6b2d8fadd881d74d587bcaff3279da489949**, not the new integration branch.

## Repeatable Playwright test
`smoke.mjs` uses Playwright 1.57.0 with Meta IWER 2.7.0 and the genuine `metaQuest2` device profile, injected BEFORE application scripts in an isolated temporary Chrome context. It does not mock navigator.xr or forge session results. It uses IWER's documented `installRuntime({forceInstall:true})` option because normal desktop Chrome exposes navigator.xr but has no connected headset. This override is strictly inside the isolated test context; never add it to a production build or real Quest page.

This harness tests the same emulator runtime family, not the installed extension's toolbar. The installed extension was tested separately as described above. No private user Chrome profile or remote debugging port is required.

### Setup and run
Copy/cherry-pick **only test-support/webxr-test/** onto the intended integration/test branch; do not replace newer application sources with this main-based tooling branch.

Start an isolated copy of the intended build on a free loopback port, with sync/restart automation disabled for that copy. Record its full commit SHA. Example server commands in PowerShell from that isolated checkout:

```powershell
$env:PORT='8790'
node server/server.mjs
```

In another terminal:
```powershell
npm.cmd ci --prefix test-support/webxr-test --no-audit --no-fund
$env:KLINIKLAB_URL='http://127.0.0.1:8790/'
node test-support/webxr-test/smoke.mjs
```

Requires installed Google Chrome; the script launches headed Chrome via channel:'chrome'. Keep its window usable and avoid concurrent browser/GPU tests. Dependencies are pinned in the lockfile. A cloud runner without installed Chrome needs an explicitly documented alternative launch setup; report inability honestly rather than claiming a local-PC run.

The script writes output/playwright/webxr-smoke/result.json and local PNG evidence. It exits nonzero on failure and closes its own browser in finally. Do not upload screenshots automatically or download visual-feedback. Add exact build SHA, browser version and run environment to future evidence; this initial script reports origin but does not independently identify the server's Git checkout.

### Baseline result: 30 October 2026
Tested on this PC, headed Chrome, main 428d6b2d8fadd881d74d587bcaff3279da489949. All six checks passed:
1. VR button enabled with the Quest 2 profile.
2. Application entered a real IWER immersive WebXR session.
3. Both handed input sources and 120 XR frames observed.
4. selectstart/selectend and squeezestart/squeezeend observed for both hands after emulator input.
5. Right-controller disconnect/reconnect updated session input sources.
6. App exited and re-entered VR.

No page errors or failed requests observed. Both controller profiles included oculus-touch-v3, oculus-touch and generic-trigger-squeeze-thumbstick. Stationary emulator viewer position delta was 0 m over 120 samples, with mean interval ~17.7 ms on this PC. These values are NOT Quest 2 frame timings, NOT a test of rendered world/camera stability and NOT proof the user's reported vibration is fixed. Inputs reaching the session do not by themselves prove the correct application action occurred; extend assertions for application behavior as features are implemented.

## Phased work: run one phase at a time

### Phase 0 - Integrated emulator baseline
Read existing chat and code; preserve current integration work. Incorporate/adapt this harness into the intended integration branch without modifying hosted main. Run real IWER/Playwright checks on that exact build and report revision, setup, commands, results, errors and remaining limits. Add application-level assertions/instrumentation as needed rather than replace the runtime with stubs. Do not proceed to feature phases until this baseline works or a specific blocker is reported.

### Phase 1 - Quest 2 controllers
Show recognizable left/right Quest 2 Touch controller models in the actual WebXR scene with verified input-profile/button mapping, correct grip/aim alignment and handedness. Use license-compatible models or clearly labelled schematic geometry, not proprietary assets of uncertain provenance. Keep UI rays and tool actions consistent. Test mappings and disconnection/recovery. Do not confuse emulator overlay controller drawings with in-app controller models.

### Phase 2 - VR vibration/stability
Reproduce the user's vibrating-view issue. Inspect render-loop ownership, duplicate animation loops, repeated camera/reference-space transforms, recentering, timing, tracking recovery and expensive asset work. Measure stationary rendered camera/world transforms over many frames and controlled movement; do not infer stability from screenshots alone or smooth the head pose blindly. Preserve physical motion responsiveness. Use headset evidence where needed and distinguish desktop emulation from hardware performance.

### Phase 3 - Table tool pickup
Implement a deliberate grip-to-pick-up / release-to-return-or-place flow for distinct table tools. Support either hand, stable held-tool offset, visible hover/selection, switching and no accidental double ownership. Keep trigger actions separate from grip pickup. Test pickup/release/switch/recovery and prevent unintended cutting during UI use, tracking loss or disconnect.

### Phase 4 - Tool catalog
Create an accessible in-VR catalog listing available instruments with name, purpose and clear selection feedback. Selecting makes the tool available at a table slot or in the chosen hand through a consistent interaction. Keep navigation readable, avoid uncontrolled spawning and provide return/reset controls. Retain desktop access where appropriate. Test catalog-to-table/hand flow, both hands and repeated use.

### Phase 5 - Combined regression and Quest acceptance
Run the established desktop/mobile tests plus phased XR checks. Verify controller visuals, tool interaction, catalog and stability together on a known revision. Actual Quest 2 acceptance is separate: readability, correct left/right controllers, realistic reach, motion stability, comfort and performance. Report any hardware tests not performed. Prepare a reviewable change; follow existing publishing/merge authorization.

## Phase reporting contract
At each phase end, report: phase number, branch/full SHA, implemented behavior, test command and results, evidence, remaining issues, and COMPLETE or BLOCKED. Stop and wait for the next phase request. The local coordination chat will request the next phase only when your current turn is finished and you explicitly report completion; never interrupt active work. No deleted worker chats should be contacted.

Sources:
- https://meta-quest.github.io/immersive-web-emulation-runtime/getting-started.html
- https://github.com/meta-quest/immersive-web-emulator
