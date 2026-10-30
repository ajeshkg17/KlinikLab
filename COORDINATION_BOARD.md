# KlinikLab coordination board

This board is a coordination snapshot, not application code. Repository: ajeshkg17/KlinikLab. Last initialized: 2026-10-29. Verify current GitHub issue, pull request and check status before relying on any snapshot below.

## Single-chat continuation — 30 October 2026

**Current directive:** The user retired the prior worker chats and asked for development to
continue within one conversation. The old multi-chat assignments below are retained as
historical handoff records; they are not active requests to contact or wake workers.
Do not schedule worker tasks, run shared-PC screenshot jobs, change hosted main, or
merge without the usual review and authorization.

GitHub baseline reverified on 30 Oct: `main` at `428d6b2`; all six PRs #12, #13,
#14, #15, #17 and #18 remain open and unmerged. The source integration preview remains
`3208102`, with the same six recorded feature heads. Created isolated
`integration/single-chat-validation-2026-10-30` from that preview;
its new source-only CI and Chromium DOM smoke scripts do not operate the office PC,
emulator, physical Quest or screenshot worker, and do not deploy the application.
The first source CI job passed; its Chromium job did not start the app because the
GitHub runner switched to unsupported Ubuntu 26.04 for Playwright 1.57.
Pinned the validation workflow to Ubuntu 24.04. **Fresh successful run**
[41022747499](https://github.com/ajeshkg17/KlinikLab/actions/runs/41022747499)
on commit `2bf5d849135494bd9a02d3767e81f337f879cdc2` completed both
jobs: 114/114 application Node tests, 8/8 helper tests, 25 root/public
mirrors, 66 JS syntax checks, 22 HTTP assets and two binaries, and
byte-identical regenerated standalone. Isolated real Chromium 143 executed
49/49 checks successfully, including all 16 fictional FSP/KP exercises,
32-FDI selection, video/volume heading coexistence, score invalidation
and focus restoration. Zero local asset failures or uncaught page errors;
no screenshots were created. This **does not** validate a Quest headset,
the local Chrome emulator, clinical accuracy or hosted main.

Physical Quest 2, installed Chrome Immersive Web Emulator and independent clinical/
German-language review remain unverified. Local browser connection was unavailable
in the receiving conversation. Do not treat GitHub Chromium as XR acceptance.

## Current coordinator

The user appointed the local chat **Sync GitHub updates to this PC** as coordinator on 2026-10-30. The previous coordinator's automatic continuation schedule has been stopped. Let any already-running turn finish without interruption; its existing branches, PRs and updates remain part of the handoff. Future coordination decisions and worker wakeups belong to this local chat. The local chat's role is coordination; application-code edits and merges are outside this handoff.

## How to communicate

- Coordinator owns edits to this file on the `coordination-board` branch. Read the latest version and its blob SHA immediately before updating it; use a conditional update and retry after rereading if another edit wins. Keep existing messages intact.
- Workers post updates and questions as comments on their assigned GitHub issue. Include workstream, current branch and commit, PR, status, tests, blockers and the next action. The coordinator reads those comments and records decisions and links here; workers read this board before starting a new action.
- GitHub does not automatically deliver updates to ChatGPT chats. A participant must actively check this board and its issue; do not claim messages were read or acknowledged without evidence. A board update alone does not wake or notify another chat.
- Never interrupt a chat while it is working. Wait until its current turn is complete before asking it to check the board or its issue. If completion is unclear, wait.
- This repository and board are public: do not post credentials, patient information, private files or sensitive personal data.

## Workstreams

| Workstream | Assigned issue | PR | Branch |
|---|---|---|---|
| Quest 2 VR | [#8](https://github.com/ajeshkg17/KlinikLab/issues/8) | [#13](https://github.com/ajeshkg17/KlinikLab/pull/13) | `feature/quest2-vr-ux` |
| Dental anatomy | [#9](https://github.com/ajeshkg17/KlinikLab/issues/9) | [#15](https://github.com/ajeshkg17/KlinikLab/pull/15) | `feature/dental-anatomy` |
| FSP/KP training | [#10](https://github.com/ajeshkg17/KlinikLab/issues/10) | [#14](https://github.com/ajeshkg17/KlinikLab/pull/14) | `feature/fsp-kp-training` |
| Quality assurance | [#11](https://github.com/ajeshkg17/KlinikLab/issues/11) | [#12](https://github.com/ajeshkg17/KlinikLab/pull/12) | `feature/qa-automation` |

All four workers have acknowledged their individual issues. The coordinator should recheck issue comments and current PR heads; an acknowledgement is a point-in-time report, not proof of continuous availability.

## Shared rules

- User limit (2026-10-30): at most **two active workers** at any time. Check live status before each sequential assignment; unclear status occupies a slot. Never interrupt a running chat. Queue additional workers until capacity is available.

- Feature work may proceed independently on the assigned branches; workers do not self-merge or edit the hosted main checkout.
- Integrate reviewed work one PR at a time. The coordinator proposed #13 → #15 → #14; this is a proposal, not a user-approved merge order.
- Do not run shared-PC tests or screenshot jobs concurrently. QA integrated acceptance is held until feature integration, synchronized main, and a coordinator-approved single job are confirmed. Isolated branch checks may run independently.
- Only `main` is automatically synced to and hosted on the PC. The `visual-feedback` branch contains screenshots; do not download them to this PC as part of coordination.
- Do not delete existing screenshots or rewrite their history without user authorization. QA has proposed an eight-image combined run and expiring artifacts; this is a proposal, not an approved policy.
- Preserve generated standalone and root/public consistency during future integration; all three feature PRs touch the standalone artifact. Verify results from the final integrated source.
- No merge, shared test, cleanup or code change is authorized merely by publishing this board.

## Current review and assignments — 30 October 2026

This section is the latest ownership snapshot; older handoff statements and log entries below remain historical evidence. Role assignments do not imply GitHub assignees or notification delivery.

| Workstream / gate | Verified state | Active responsibility / next action |
|---|---|---|
| Quest #8 / #13 | Chat 1 re-acknowledged at [06:32 UTC](https://github.com/ajeshkg17/KlinikLab/issues/8#issuecomment-6516565300); head ba2e343 unchanged, open, 7/7 checks pass | Coordinator owns further engineering and #18; worker handoff remains waiting, no new worker task |
| Anatomy #9 / #15 | Last worker ACK 29 Oct; d5257a5, draft, 7/7 checks pass | Coordinator owns source/integration review; specialist anatomy and valid visual baseline remain pending |
| FSP/KP #10 / #14 | Last worker ACK 29 Oct; d910d3d, draft, 9/9 checks pass; four cases now present | Coordinator owns code review and four-case acceptance planning; qualified dental/German review has no completed sign-off |
| QA #11 / #12 | Last worker plan 29 Oct; 98fbfba, draft, 8 passing checks / 1 Chromium failure | Coordinator owns engineering evidence and plan reconciliation; shared acceptance remains held, no worker execution assignment |
| Duplicate ID #16 / #17 | e363a63, draft fix; not deployed, #16 remains open | Coordinator owns fix/integration; real integrated DOM verification pending; duplicate volume initialization was not the confirmed cause |
| VR follow-up #18 | 5db5737, draft; 7/7 current CI, 54 targeted local tests | Coordinator implemented capability/button race fix; next review source readiness and preserve worker branch |
| Combined preview | 3208102; 114 local application tests; source-only rehearsal | Coordinator maintains preview and report; main remains 428d6b2, no deployment |
| Hardware / content sign-offs | No physical Quest, emulator, clinician or German-language sign-off | Remain unverified; do not assign completed status to mocks or desktop reports |

No new worker work is requested. Do not interrupt active chats. Original workstream issues remain the communication channels. All feature PRs remain unmerged; merge order is still a proposal. QA, screenshot and retention holds remain in force.

## Current handoff and decisions

- The coordinator reported #13, #14 and #15 unmerged, and QA #12 draft. Verify actual current states and checks.
- Duplicate DOM ID [#16](https://github.com/ajeshkg17/KlinikLab/issues/16) was reported as causing QA checks to fail; assign an owner through the coordination process and verify a fix with appropriate review. No fix has been performed by the board setup.
- Anatomy visual baseline, actual Quest 2 testing, and clinical/language review remain separate unverified gates.
- Coordinator: review the latest acknowledgments, establish the integration proposal and outstanding approvals, and record the next decision here. Workers: report progress on your assigned issue and link relevant evidence.

## Decision and message log

- 2026-10-29 — Board established from the user's instructions and the coordinator's reported state. Existing issues remain the append-only message channels; this file is the coordinator-maintained index. No code or hosted application change was made.

- 2026-10-29 — Coordinator ACK: read this board and adopted its communication and non-interruption rules. This chat is the coordinator, not a worker assigned to issues #8–#11; coordinator progress and decisions will be indexed here, with workstream-specific discussion on the relevant existing issue. No other chat was interrupted or asked to switch tasks. Next action: read latest issue updates and reverify PR heads/checks before integration decisions. Proposed integration order and retention policy remain proposals; no merge, shared QA job, screenshot download or cleanup was authorized or executed by this acknowledgment.

- 2026-10-29 — Coordinator continuation: re-read issues #8–#11, their latest acknowledgments, and PR head checks. `main` remains `428d6b2`; #13 `ba2e343` open/non-draft (7/7 checks pass), #15 `d5257a5` draft (7/7 pass), #14 `d910d3d` draft (9/9 pass), #12 `98fbfba` draft (8 checks pass, Chromium fails). No new worker acknowledgments were inferred and no chats were interrupted. FSP's old rubric failure is superseded by passing head CI; lexical-negation review remains open. QA's current plan covers only cases 36/48: update acceptance coverage to all four current FSP cases (36/48/46/16) when QA is authorized.
- 2026-10-29 — Coordinator took ownership of #16 on a separate fix branch, preserving all workstream branches. Confirmed collision between volume and video headings named `vl-title`; not duplicate volume initialization. [Draft PR #17](https://github.com/ajeshkg17/KlinikLab/pull/17), `fix/video-guide-heading-16` at `e363a63`, renames the video heading/lookup/ARIA reference, synchronizes its mirror, regenerates standalone and adds a DOM regression. [Progress report on #16](https://github.com/ajeshkg17/KlinikLab/issues/16#issuecomment-6509901754). Local targeted tests 15/15 pass; full suite 58/60, with the two pre-existing stale screenshot/attribution assertions handled in QA #12. CI pending observation; #16 remains open, fix not merged. Next decision: review #17 and feature PRs, resolve draft/content/hardware gates and obtain any necessary merge approval before changing hosted main. Sequential integrated QA, eight-image budget, and retention/cleanup remain unapproved; no shared jobs or screenshot downloads/deletions performed.

- 2026-10-29 — #17 CI follow-up: all seven existing GitHub Actions checks pass on `e363a63`. The new heading DOM regression passed locally; do not imply existing workflow selection executed it. Shared browser verification and merge remain pending. No change to QA hold or other chats.

- 2026-10-30 — User directed coordinator to continue VR work independently, without assigning more worker work or interrupting active chats. Local Chrome/Immersive Web Emulator is inaccessible: no connected local-browser control capability is exposed in this session; cloud browsing would not test the PC installation. Emulator and physical Quest 2 remain NOT TESTED. Required access: supported connection to the PC Chrome/profile with emulator and its controls/DevTools; an explicitly isolated intended-build preview because PC auto-hosts main only. No worker or shared checkout was changed.
- 2026-10-30 — Coordinator reproduced a session-end-during-startup race on #13 head `ba2e343`. Separate [draft PR #18](https://github.com/ajeshkg17/KlinikLab/pull/18), `fix/xr-startup-lifecycle` at `6edb856`, adds guards after graphics/reference-space waits, two lifecycle regressions, CI inclusion, public mirror and rebuilt standalone. Both new tests fail before / pass after; 34/34 targeted local mocked tests pass. PR is stacked against feature/quest2-vr-ux for focused review only; do not merge into worker branch, reconcile/retarget after authorized #13 integration. CI pending observation. Progress posted on #8. No emulator claims, screenshots, shared QA jobs, merges or cleanup; all existing holds preserved.

- 2026-10-30 — #18 CI observed: all seven current checks pass at `6edb856`, including Quest workflow with the new startup lifecycle tests. Emulator access blocker and all shared-PC/integration holds unchanged.

- 2026-10-30 — User authorized continuing without emulator. Coordinator extended existing draft #18 on fix/xr-startup-lifecycle to `48e260948c22051c72c6dd51265d4110bd2eb9e8`: release held trigger on controller disconnect, stop initial/repeated cuts while session hidden/visible-blurred, require fresh press after recovery. Four input regressions fail before / pass after; total targeted local tests 38/38 pass. Source/public and standalone regenerated; new tests included in Quest CI. Current-head CI pending observation. Posted progress on #8. No worker actions requested; no shared-PC/browser/emulator/headset testing, merges or screenshot changes. Existing integration and QA holds remain.

- 2026-10-30 — #18 current head `48e2609`: all 7 GitHub Actions checks observed successful, including Quest regression workflow selecting 38 tests. Mocked checks only; emulator and physical headset untested, integration/shared-PC hold unchanged.

- 2026-10-30 — Coordinator continued independent development in draft #18, head `714c94a8fbbcd800fd5501015dcb5ce42eb0e333`: scoped trigger/grip/release events to active XR session, rejected mismatched input frames, and paused held input immediately on visibilitychange without waiting for another frame. Three new regressions fail before / pass after; total targeted local mocked tests 41/41 pass. Root/public and standalone synchronized; current-head CI pending observation. Progress posted on #8. No worker requests, interrupts, shared-PC/emulator/headset tests, screenshots, merges or cleanup; holds unchanged.

- 2026-10-30 — #18 head `714c94a`: all 7 current GitHub Actions checks observed successful. Quest workflow includes the 41 targeted tests. Emulator/physical headset and integrated PC acceptance remain untested; no merge performed.

- 2026-10-30 — Coordinator prepared and published `integration/coordinator-preview` at `60f75c477c3037f6835d2ef78ac4151a57d86541`, combining #13 ba2e343, #15 d5257a5, #14 d910d3d, #12 98fbfba, #17 e363a63 and #18 714c94a without altering originals or main. [Verification report](https://github.com/ajeshkg17/KlinikLab/blob/integration/coordinator-preview/docs/COORDINATOR_INTEGRATION_PREVIEW.md). All 101 application tests, 8 existing QA helper tests, 42 scenario templates, 25 mirrors, 64 syntax checks, 22 local HTTP assets + 2 binaries/restricted paths, and deterministic twice-rebuilt standalone passed in coordinator environment. Source merges including anatomy/QA test overlap were clean. No browser/screenshot/worker jobs executed. No PR opened for preview, to avoid automatic screenshot workflow; no dispatch or main merge. Progress posted on #11, no worker requests/interruptions. This is a source integration rehearsal, not hosted-main QA or release acceptance; clinical/language/anatomy, emulator/headset and authorized integration gates remain.

- 2026-10-30 — Coordinator updated #18 to `00a105372930f50dec83aaa5038ce9ed240ac0f6`: tracking-loss cleanup clears lastCut, pose-query failures pause input without stopping XR loop, and ended/replaced sessions receive no further frame scheduling. Three new regressions fail before/pass after; 44 targeted tests and all 7 current CI checks pass. Refreshed integration/coordinator-preview to `c6c8c6e638c8586fb3c0f4962f3aab42b9f9d26d`; 104/104 application tests, 25 mirrors, 64 syntax checks and deterministic standalone rebuild pass locally. Verification report updated. Progress posted on #8; no worker requests/interrupts or main changes. Browser/emulator/headset, shared-PC/screenshot jobs and clinical review remain unperformed; existing holds remain.

- 2026-10-30 — Coordinator added VR control progress/retry feedback in #18 head `2dec24df102f67dbf2dff0e515b3904dedf5e08a`: Starting/Leaving states, duplicate-click guard, accurate exit toast, retry recovery and unsupported-renderer explanation. Shared app.js/public/app.js changes explicitly flagged. Five control tests pass; 49 targeted tests and all 7 current CI checks pass. Combined preview updated to `ed0d7d919c3a20f7670a6174bbb03e0f627ba14b`; 109 application tests, 25 mirrors, 65 syntax checks and deterministic standalone generation pass locally. Progress on #8. No worker requests/interrupts, browser/emulator/headset/shared-PC jobs, screenshots or main changes; existing review/QA holds remain.

- 2026-10-30 — User transferred coordination to the local chat. Previous coordinator wakeup schedule deleted; any current turn is allowed to finish. Two-hour checks now run here. Board and worker issue updates reviewed; browser/emulator/headset acceptance remains pending. No application code edits, merges or shared test jobs performed during transfer.

- 2026-10-30 — Reviewed all four issue threads and PR discussions/heads/checks. New worker evidence: Chat 1 ACK at 06:32 UTC, branch unchanged; no newer anatomy/FSP/QA worker reports found. Feature checks #13 7/7, #15 7/7, #14 9/9 pass; #12 8 pass/1 Chromium fail remains on original QA branch. Refreshed current role assignments and posted passive status comments on #8/#9/#10/#11/#16; coordinator owns next engineering, workers retain waiting handoffs, no new worker tasks or interruptions. #16 remains coordinator-owned, implementation present in #17/preview but real DOM verification pending.
- 2026-10-30 — Continued code work in #18 head `5db573751d26b2ab9cfcee226042110d772a2b8c`: renderer/security-aware capability checks, stale-result protection, pending-button guard and active-session exit availability. Five new regressions fail before/pass after; 54 targeted tests and 7/7 current CI pass. Combined preview `32081021249eae2cc9cfef8d72885ca0d1e2319d`: 114 application tests, 25 mirrors, 65 syntax checks and deterministic standalone pass. Updated existing QA document with four FSP cases × four tasks as plan only. No shared acceptance tests created/executed, browser/emulator/headset/PC jobs, screenshots, main merges or cleanup. User merge decisions and clinical/hardware/QA gates remain pending.

- 2026-10-30 — Quest VR and anatomy continuation requests delivered. FSP/KP and QA requests were blocked by approval review after the user set a two-worker limit; these remain queued. Two-hour local coordination schedule updated to enforce capacity before every send.

- 2026-10-30 — Single-chat mobile continuation: Rechecked `main=428d6b2` and unchanged `visual-feedback`; these refs do not prove the PC worker is active. On isolated `integration/single-chat-validation-2026-10-30`, fresh Chromium mobile testing initially revealed that the FSP trigger was not actionably clickable at 390px despite having a nonzero bounding rectangle. Added a narrow-screen fixed FSP entry style to `fsp-kp-training.js`, its public mirror, and regenerated standalone; strengthened the mobile test with explicit hit-target and viewport assertions. Final successful source + Chromium run [41024811682](https://github.com/ajeshkg17/KlinikLab/actions/runs/41024811682) at `4a563659`: 114 application tests, 8 helper tests, static/HTTP/standalone gates and **62 real Chromium assertions** (all 16 FSP exercises plus mobile case/feedback navigation) pass, no local asset or page errors. A previous mobile test had intermittent click timeouts; this successful run does not establish broad device repeatability. No `main` change, PC job, worker restart, or XR hardware testing occurred.

### Phase 0 confirmed Windows baseline and Phase 1 (30 October 2026)
- **User-confirmed Phase 0:** An isolated detached Windows preview at integrated SHA `2d74f45e6de44324514b55a2e8b47d3405fd9e01`, on `http://127.0.0.1:8790/`, ran the imported Playwright 1.57.0 + real Meta IWER 2.7.0 `metaQuest2` smoke with software-WebGL flags. Reported exit code 0, **six of six checks passed**, both controllers and 120 viewer-pose frames, both hands' select/squeeze events, right disconnect/reconnect, exit/reentry, zero page errors and failed requests. Emulated stationary pose delta 0 m, mean frame interval **111.205 ms** in software rendering. This is **user-reported Windows evidence**, not a test independently run by this chat; neither physical headset acceptance nor vibration/performance validation. The GitHub Xvfb 120-frame timeout did not reproduce on Windows; its cause is unconfirmed. The user scheduled the local isolated server to pause at 10:08 Berlin time. Do not restart it.
- **Phase 1 implementation** in `integration/single-chat-validation-2026-10-30`: independent source `gripSpace` for original schematic, handed left/right Quest Touch-like 3D geometry; `targetRaySpace` for the aiming ray; standard WebXR gamepad indices trigger 0, squeeze 1, thumbstick 3, primary 4, secondary 5; lost-tracking/disconnect clearing. Only local geometry, no proprietary controller model files. Synchronized root/public/standalone. Tests added/adapted for source mapping, frame pose behavior and loss of tracking. No PC automation, deleted worker, Phase 2+ work, hosted main change, or physical Quest 2 test.
