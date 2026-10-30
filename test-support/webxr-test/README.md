# Reproducible Playwright/IWER Quest 2 emulator harness

**Status:** Phase 3 functional tests completed at integration SHA `891a0a4cf7e7d11fe2c783dc0d487e3d90599cb4` on GitHub Xvfb (14/14 checks), but the hosted screenshot gallery included duplicate frames. Later capture code requests fresh **XR eye framebuffer** pixels. **The new eye-capture path is pending local Windows/Chrome verification.** No physical Quest 2 hardware acceptance has occurred.

This is the pinned Playwright 1.57 / genuine Meta IWER 2.7 `metaQuest2` harness. It runs against a specific integration commit in an isolated local server and Chrome profile. `smoke.mjs` keeps strict 120 valid XR poses, at least 120 actual rendered frames, stereo view/world model stability checks, trigger/squeeze, disconnect/reconnect, exit/reentry, and Phase 3 controller pickup/return interaction checks. Its Phase 3 screenshot checkpoints run only when relevant states are reached. Screenshot readback errors fail instead of being called valid visuals.

## Recommended workflow: owner-PC agent

Follow [the single-chat PC XR worker guide](../../visual-qa/README.md) and the bounded [XR job request](../../visual-qa/jobs/xr-current.json). GitHub stores declarative jobs and published results; the owner's PC runs Chrome/IWER and uploads to `visual-feedback`. Job IDs are executed at most once by the local ledger and pinned to the explicitly requested full commit SHA.

## Optional manual smoke

At an isolated source checkout, start `PORT=8891 node server/server.mjs` in a separate terminal (PowerShell: set `$env:PORT='8891'`). Install the pinned dependencies:

```powershell
npm.cmd ci --prefix test-support/webxr-test --no-audit --no-fund
$env:KLINIKLAB_URL='http://127.0.0.1:8891/'
$env:KLINIKLAB_BUILD_SHA=(git rev-parse HEAD)
node test-support/webxr-test/smoke.mjs
```

Environment: `KLINIKLAB_XR_DEADLINE_MS` defaults to 45000, bounded 15000–120000; `KLINIKLAB_XR_GRAPHICS` defaults to native Chrome graphics, optionally `software`; `KLINIKLAB_XR_PERF_THRESHOLD_MS` is advisory, not a functional pass condition.

The harness writes `output/playwright/webxr-smoke/result.json` and PNG screenshots. Do not silently reuse or download earlier evidence. The `visual-feedback` gallery must identify exact SHA, emulator environment and duplicate frames. On WebXR readback limitations, preserve failures and seek local validation; do not claim physical headset performance.

Previous Phase 0/1/2 evidence, including Linux timeout investigations and successful Windows results, remains in Git history and the coordination board. These historical records are useful for unresolved performance/visual differences but are not current run instructions. Phase 4 tool catalog has not begun.
