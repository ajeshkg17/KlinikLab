# KlinikLab quality assurance: coverage and release readiness

**Workstream:** QA / integration, 29 October 2026. **Baseline:** `origin/main` commit `428d6b2d8fadd881d74d587bcaff3279da489949` at branch creation.

KlinikLab is a dental education **research prototype**, not an approved dental device, clinical assessment, or official FSP/KP certification platform. A passing automation run does not imply clinical validity or physical Quest compatibility.

## Evidence categories (never conflate)

| Category | What counts | Baseline evidence | Release status |
| --- | --- | --- | --- |
| Unit / deterministic DOM mock | Node tests and VM stubs | Existing `tests/*.test.cjs`, `tests/*.test.mjs`, `tests/real_scene_qa.cjs` | Covered for the specific assertions only |
| Desktop browser | Real Chromium interaction, local HTTP, screenshots and console/network diagnostics | Existing `visual-feedback` screenshot manifests; separate CI browser test when available | Partial; record browser and GPU configuration |
| Mocked XR | Simulated controller poses, `KlinikXRGuide`, scale restoration | `tests/quest2_vr_guide.test.cjs` and desktop guide preview | Covered as mocks; **not headset tested** |
| Physical Quest 2 | In-headset observations with device, browser/build, repeatable steps and recorded measurements | None established | **Unverified: blocking for hardware-compatibility claims** |
| Clinician review | Named, qualified reviewer + review scope + signed result + version of content | None independently verified | **Unverified: blocking for clinical accuracy claims** |

## Requirement-to-test matrix

| ID | Requirement | Automated coverage | Evidence and remaining gap |
| --- | --- | --- | --- |
| Q-01 | All 32 permanent FDI values, arch, side and quadrant | `tests/phase6_practice.test.cjs` 32-tooth bank assertions; `visual-qa/worker.mjs` `validateFDI` action | Browser interaction evidence depends on a completed capture/job; clinician mapping review outstanding |
| Q-02 | Anatomy shape and selection | `tests/babylon_anatomy.test.cjs`, `tests/real_scene_qa.cjs`, `tests/phase3_appearance.test.cjs`, `tests/phase4_jaw.test.cjs`, `tests/phase5_structures.test.cjs` | Structural/visual tests are not anatomy validation on actual scans |
| Q-03 | Ten-question quiz, valid options, score, restart, close | `tests/phase6_practice.test.cjs` for all 32 FDI question sets and lifecycle | Real browser walkthrough required to verify overlay behavior and readability |
| Q-04 | Guided tutorial step order, next/back/finish/Escape/mobile | `tests/app_tutorial.test.cjs`; `visual-feedback/runs/tutorial-acceptance-2026-10-29-01` desktop screenshots (7/7) | Keyboard tab order, focus visibility and screen-reader review remain incomplete |
| Q-05 | XR tutorial controller select/grip, obstruction, exit cleanup | `tests/quest2_vr_guide.test.cjs`; desktop preview `visual-feedback/runs/quest2-vr-preview-2026-10-29-02` (4/4) | Physical Quest 2 controllers, comfort, eye view, tracking and haptics unverified |
| Q-06 | FSP/KP workflow / local AI API controls | `tests/qa_logic.js` 6 cases × 7 stations; `tests/ai.test.mjs`; `tests/server_security.test.mjs` | Not official German examination scoring; clinical expert review needed |
| Q-07 | All mirrored static modules in sync | `python3 scripts/qa_gate.py static` hashes all matching root/public HTML/JS/CSS | Baseline: 24 identical pairs; failures block CI |
| Q-08 | Syntax of local JavaScript modules and worker | `python3 scripts/qa_gate.py static`, excluding vendored Draco code | Vendor supply-chain verification separate |
| Q-09 | HTTP delivery and restricted paths | `python3 scripts/qa_gate.py http`; existing server security test | Local-only gate, not HTTPS tunnel or headset network path |
| Q-10 | Standalone reproducibility | `python3 scripts/qa_gate.py bundle` runs generator twice + byte comparison + git diff | Fails if committed standalone does not match source |
| Q-11 | Visual/accessibility, responsive and occlusion | Chromium FDI keyboard Enter, tutorial Arrow keys/Escape/focus return, quiz keyboard Enter, panel hit-testing, duplicate IDs, ARIA targets and visible controls; DOM scoring in `visual-qa/qa-metrics.mjs` | **Known blocker:** duplicate `#vl-title` on desktop and mobile ([issue #16](https://github.com/ajeshkg17/KlinikLab/issues/16)); other advisory checks still run. Browser assertions are not screen-reader certification. |
| Q-12 | Vulnerable third-party dependencies | `npm audit --prefix visual-qa --omit=dev --audit-level=high` in QA workflow | Audits declared npm packages, not CDN-loaded browser libraries or OS runtime |
| Q-13 | Performance and asset failures | Three repeat page-load-to-FDI samples, median/p95, local/external request failures, candidate-image SHA-256, failure screenshots | CI software-renderer timings are not headset FPS/latency; 20s failsafe is not a performance-service-level objective |

## Reproduce QA locally

From repository root, with Node.js 22 and Python 3:

```sh
node --test tests/*.test.cjs tests/*.test.mjs tests/real_scene_qa.cjs
node tests/qa_logic.js
node --test visual-qa/tests/*.test.mjs
python3 scripts/qa_gate.py static
python3 scripts/qa_gate.py http
python3 scripts/qa_gate.py bundle
npm install --prefix visual-qa --no-audit --no-fund
node visual-qa/ci-browser.mjs
```

The `ci-browser.mjs` suite uses an installed Playwright Chromium browser and produces artifacts in `visual-qa/ci-artifacts/`. Install it using `cd visual-qa && npx playwright install chromium` if needed. Never upload patient data.

**Screenshot baseline governance:** `visual-qa/baselines/manifest.json` is initially empty. The comparator treats such images as candidate evidence (`NO_APPROVED_BASELINE`), not successful comparisons. When baselines are approved, the approval registry must match the reference PNG's SHA-256, source run, reviewer, browser major version and viewport; unregistered PNGs are refused. See `visual-qa/baselines/README.md`. This still requires human pixel-diff review.

## Risk register

| Risk | Severity | Gate / owner |
| --- | --- | --- |
| No physical Quest 2 regression with measured input latency, frame stability and session teardown | **Blocking** for hardware release or compatibility claims | VR developer + device tester |
| No independent clinician sign-off on FDI accuracy, anatomy, exam content and safe clinical wording | **Blocking** for clinical accuracy claims | Clinical reviewer |
| GPU/WebGL/browser and CDN dependencies differ across Chrome, mobile and Quest Browser | High | Browser CI and supported-browser matrix; log renderer, GPU, asset failures |
| Duplicate `vl-title` DOM IDs on desktop/mobile | **Blocking QA defect** | [Issue #16](https://github.com/ajeshkg17/KlinikLab/issues/16); feature-owner investigation; QA deliberately reports failure, not suppressed |
| Screenshot green despite inaccessible focus order or occluded controls | High | A11y checks, keyboard interaction, viewport metrics; independent manual keyboard/screen-reader check |
| Standalone HTML silently out of date after feature merge | High | Byte-identical generator check, required PR status |
| Source/public script drift | High | Complete mirror inventory, not selective module lists |
| Live screenshot worker depends on a local Windows machine being online | Medium | Desktop capture evidence is not a guaranteed GitHub-hosted gate |
| Dependency vulnerabilities / unpinned browser CDN | Medium | npm audit + separate vendor provenance review |

## Integration and release sign-off

- [ ] Node tests, syntax, mirror checks, HTTP smoke, dependency audit and standalone checks pass on proposed merge commit.
- [ ] Resolve or explicitly disposition [QA defect #16](https://github.com/ajeshkg17/KlinikLab/issues/16) with feature owner; no silent QA exception.
- [ ] Chromium desktop and mobile browser QA artifacts inspected; visual changes reviewed against approved baselines or explicitly labelled **no baseline**.
- [ ] Blocking regressions resolved with exact reproduction case, environment, logs and screenshot.
- [ ] Physical Quest 2 checklist executed and signed off separately if any hardware support is claimed.
- [ ] Dental clinician content review signed off separately if any clinical accuracy is claimed.
- [ ] Coordinator reviews conflicts with the three feature workstreams and merges the PR; the QA workstream does **not** merge to main.

### Physical Quest 2 manual verification protocol (NOT YET PERFORMED)

Record device firmware, Quest Browser version, commit SHA, secure origin, session start/end, controller tracking, trigger vs grip behavior, tutorial visibility in *both* eyes, readable panel distance, occlusion, FDI targeting, cutting on/off behavior, scale restored on exit/re-entry, reset and cleanup. Measure test duration and FPS distribution (at least median and low-percentile), missed target events, unexpected exits, temperature/battery observations; attach timestamped media and failures.

### Clinician review protocol (NOT YET PERFORMED)

A qualified dentist must review all 32 permanent FDI placements/names, anatomy layers, quiz answer keys and rationales, six case workflows, radiography disclaimers, procedural safety language and pedagogical scope. Attach reviewer credentials, date, specific commit, resolved issues, and signed decision. A user-entered reviewer assertion is not independent validation.

### Evidence observed at baseline

- GitHub Actions: all seven existing named phase/tutorial workflows concluded **success** on baseline commit (29 Oct 2026). That success is limited to those workflows.
- `visual-feedback/runs/tutorial-acceptance-2026-10-29-01/manifest.json`: seven successful desktop screenshots, `headsetTested=false`, `clinicalValidation=false`.
- `visual-feedback/runs/quest2-vr-preview-2026-10-29-02/manifest.json`: four successful desktop XR **mock preview** screenshots, `headsetTested=false`, `clinicalValidation=false`.

No result above demonstrates a physical headset test or verified patient/clinical safety.


### QA extension after the initial handoff (29 October 2026)

The second iteration adds automated keyboard interactions for the FDI chart and anatomy quiz, tutorial ArrowLeft/ArrowRight/Escape and focus return, panel centre-point hit-tests, a desktop/mobile DOM accessibility audit, three repeated software-Chromium ready-time measurements (median/p95), and preservation of failure screenshots. Exact per-run numbers are stored in the `qa-chromium-evidence/report.json` artifact.

The new audit uncovered a duplicate `vl-title` ID on **both desktop and mobile**. This is an observed issue, not a physical-headset or clinical failure. It has been reported to the feature owner via [issue #16](https://github.com/ajeshkg17/KlinikLab/issues/16). The audit records a failed QA check but continues with the remainder of the suite so further regressions remain visible. Release acceptance requires resolving or explicitly reviewing this blocker; QA must not conceal it by approving a defective screenshot baseline.

