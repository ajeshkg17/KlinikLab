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
