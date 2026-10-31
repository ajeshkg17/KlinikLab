# KlinikLab — reproducible FDI16 actual-app XR procedure capture

**Status:** Implementation and source CI only until an owner-PC run succeeds. These are **not AI-generated storyboard frames**. The actor is Playwright driving a genuine Meta IWER `metaQuest2` controller within the test application, not a filmed dentist, patient, or physical headset.

## Supported clinical-education scope

The app currently provides a simplified, uncalibrated signed-field molar and WebXR preparation cut. This storyboard documents **FDI 16, maxillary right first molar, occlusal preparation**. It does not claim to model a complete caries diagnosis, safe excavation endpoint, restorative bonding, composite layering or curing. A dentist must review anatomical accuracy, instrumentation, motion, removal depth and educational statements before any clinical approval.

## Checkpoints (fresh real stereo XR eye framebuffers)

| Step | File | Actual application state |
| --- | --- | --- |
| 01 | `01-select-fdi16.png` | Enter XR preparation and select FDI16; current tooth context |
| 02 | `02-precut.png` | Untreated molar, fixed stereo view |
| 03 | `03-aim.png` | Aim genuine tracked IWER right-hand controller target ray at crown |
| 04 | `04-cut.png` | Actual application cut triggered by tracked IWER index trigger; same viewer as 02 |
| 05 | `05-postcut.png` | Review saved cut in app |
| 06 | `06-switchback.png` | Switch FDI16→36→16; verify the same cut persists |

Strict checks: all six PNGs are generated from **new** left/right XR framebuffer draws, the selected FDI remains 16, XR session and procedure mode are active, frame IDs strictly increase, cut count increases only on application procedure action, before/after images differ by over 120 RGB L1>55 pixels **in each eye**, and saved cuts survive a tooth selection round trip.

## PC invocation (opt-in, isolated local source checkout)

Run only at a **full exact pinned integration SHA**, using a **new** `fdi16-*` ID each time. Use a dedicated loopback server and the regular Playwright/IWER setup:

```powershell
$sha = (git rev-parse HEAD).Trim()
# Verify this is the exact intended tested checkout; do not run against a drifting branch.
if ($sha -notmatch '^[0-9a-f]{40}$') { throw 'Not an exact commit' }
npm.cmd ci --prefix test-support/webxr-test --no-audit --no-fund
$env:PORT = '8891'
# In a separate terminal, start: node server/server.mjs
$env:KLINIKLAB_URL = 'http://127.0.0.1:8891/'
$env:KLINIKLAB_BUILD_SHA = $sha
$env:KLINIKLAB_PROCEDURE_CAPTURE = '1'
$env:KLINIKLAB_PROCEDURE_RUN_ID = 'fdi16-my-unique-run-01'
node test-support/webxr-test/smoke.mjs
```

**Preferred worker route:** after the owner-PC watcher has been **explicitly refreshed to this source**, create a **new unique job** using the existing `quest2-phase3` suite and ten safe captures, plus the bounded boolean `"procedureCapture": true`; the job ID must start `pc-xr-procedure-`. Do not set this on a job processed by an older running worker, which rejects unknown fields. The updated worker sets the two opt-in environment variables, retains the six step images and optional video, and publishes them as **sidecars** alongside the original ten unmodified images. Do **not** reuse any processed job IDs, and do not assume a PC watcher restarted without its own heartbeat. Existing `PC_XR_LATEST.md`, ledger at-most-once semantics and default suite are preserved.

## Artifact paths and acceptance

Local directory: `output/playwright/webxr-smoke/procedure/<run-id>/`. Required: six numbered PNGs, `procedure-manifest.json` with exact source/frame IDs and per-image SHA-256, and `storyboard.md`. Optional: `video/actual-app-playwright.webm` and `video/video-check.json`. A video may be a timed presentation of **actual** stereo XR frames created while the Playwright harness controls the app, but must be disclosed as **step-by-step framebuffer playback, not continuous dentist hand motion**. A browser video showing a blank XR surface is rejected. A decoder must verify video duration/resolution, sampled nonblank content and distinct procedure stages; file existence is insufficient.

Owner-PC published path (only after confirmed upload): `visual-feedback/runs/pc-xr-<job-id>-<exact-commit>/procedure/<run-id>/` including the storyboard, stills and video if present. AI-generated concepts belong outside this evidence directory. Review the exact PNG pixels from both stereo eyes **personally**; comparison by metadata/hash alone is not visual acceptance. The final clinical gate requires a named qualified dental reviewer, date, checked source/sequence, anatomical and instrumentation findings, and either signed approval or listed corrections. Hardware Quest2 is a separate open gate.
