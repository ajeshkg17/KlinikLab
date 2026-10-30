# KlinikLab coordination board

This board is a coordination snapshot, not application code. Repository: ajeshkg17/KlinikLab. Last initialized: 2026-10-29. Verify current GitHub issue, pull request and check status before relying on any snapshot below.

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

- Feature work may proceed independently on the assigned branches; workers do not self-merge or edit the hosted main checkout.
- Integrate reviewed work one PR at a time. The coordinator proposed #13 → #15 → #14; this is a proposal, not a user-approved merge order.
- Do not run shared-PC tests or screenshot jobs concurrently. QA integrated acceptance is held until feature integration, synchronized main, and a coordinator-approved single job are confirmed. Isolated branch checks may run independently.
- Only `main` is automatically synced to and hosted on the PC. The `visual-feedback` branch contains screenshots; do not download them to this PC as part of coordination.
- Do not delete existing screenshots or rewrite their history without user authorization. QA has proposed an eight-image combined run and expiring artifacts; this is a proposal, not an approved policy.
- Preserve generated standalone and root/public consistency during future integration; all three feature PRs touch the standalone artifact. Verify results from the final integrated source.
- No merge, shared test, cleanup or code change is authorized merely by publishing this board.

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
