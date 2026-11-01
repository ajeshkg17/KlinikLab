# SR28 — wrong-login owner identity and historical publication disposition

Owner report: issue #44 comment 6559533784. SR27 source 61d2b7897003123317e187f049a459cb2326ff05 produced currentLoginMatchesTaskPrincipal=false and LEASE_WriteErrorException; its 17.7-second two-sample interval is NOT owner-context quiescence proof. The most recent valid owner-context evidence remains SR26 issue comment 6559320641: live Node watcher PID 49344, exact script --watch and lease 2026-11-01T12:56:29.736Z, ~54 ms after process creation. Actual status must not be inferred from stale snapshots.

## Safe identity investigation (not a watcher operation)

Use a separate checkout at the exact current integration SHA supplied in the issue handoff. First, under the EXISTING current shell, run:

    powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File visual-qa/sr28-owner-identity-readonly.ps1

It reads the scheduled task principal and current Windows token SIDs (compares them without printing either SID), attempts to inspect only exact matching Node --watch process owner SID via read-only Win32_Process.GetOwnerSid, and reports local-profile root equality. It refuses to read the owner's lease or ledger if the login SID does not equal the task principal SID. It never asks for credentials, starts/changes a task, invokes Godot, launches the watcher, or modifies any file.

If the result is WRONG_LOGIN_NO_OWNER_LEASE_READ_ATTEMPT__HOLD: use an **already-existing interactive Windows session of the scheduled-task owner account** and a **separate detached checkout** at the handoff SHA. You may open the read-only diagnostic there. Do not use new/scheduled tasks, a run-as helper, elevation tricks, remote automation, impersonation, credential sharing or changes to the pinned worker action. If you cannot safely obtain a login matching the task principal, report that fact and STOP; the previous owner-context SR26 evidence and refresh hold remain governing. An administrator/nonowner read of process metadata is an *alternative inventory only*, not owner-context quiescence.

When the SR28 identity probe reports currentLoginMatchesTaskPrincipal=true, inspect staged lease read errors. Metadata, Get-Content raw, JSON token parsing and Get-FileHash are each independently caught so a file-share/ACL exception no longer conceals the actual failing stage. A Get-FileHash error alone may be a sharing/access issue: no attempt to bypass sharing, change permissions, take ownership, close handles or copy/change the lock is allowed. Never infer a dead watcher from lease access failure.

Only after this exact login/root preflight passes, the existing SR27 bounded observer may be run under the matching owner session:

    powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File visual-qa/sr27-ownerpc-observe-only.ps1 -ObservationSeconds 12

SR28 updates the SR27 observer to return immediately with OWNER_CONTEXT_NOT_VERIFIED__NO_LEASE_READ_NO_OBSERVATION__HOLD under wrong login rather than polling another profile's root. The live watcher continues 10-second polls, so even no child seen in either owner-context snapshot is NOT a quiescence certificate or permission to change the task/process.

Only share sanitized JSON: currentLoginMatchesTaskPrincipal, processOwnerMatchesTaskPrincipal, processInventoryCompleted, taskWorkerSha, leaseInspectionAttempted, leaseRawReadable, leaseRawTimestampPreserved, leaseHashReadable, leaseReadErrorStages, classification, taskRefreshSafetyHold, and absence of owner-context observation as applicable. Do not publish usernames, SIDs, raw process command lines, file paths, credentials or private logs.

## Explicit two-job historical publication disposition

The read-only SR27 offline reconciliation from issue #44 comment 6559533784 already verified both consumed job12 and job13: original LOCAL PNG SHA256 bytes match the independently retrieved visual-feedback anchors and original source/worker/FDI36/six-case capture records. Both LOCAL terminal ledger entries are missing, with localEvidenceAndLedgerReconciled=false. The correct descriptive state is:

    REMOTE_PUBLISHED_ORIGINALS_CORROBORATED__LOCAL_LEDGER_GAP__NO_REPLAY__NO_REPAIR

This is a **historical analytical disposition** on GitHub issue #44 and in the offline probe output. It is NOT a ledger value, NOT a reconstructed completion, NOT approval to backfill history, NOT proof no job was attempted, and NOT a new owner-PC result. No rerun or renaming of consumed jobs. The remote published job-result status is NOT_ACCEPTED_PENDING_INDEPENDENT_PIXEL_REVIEW; do not retroactively mark the UX, GPU, clinical or Quest aspects accepted.

Do not alter the local ledger, heartbeat, published branch, capture folders, lease, scheduled task or old watcher. Future ledger policy may only change after separate issue-level review and explicit authorization based on immutable original evidence, job ID/source hashes and activity gate. The absence of ledger entries is currently quarantined as a known permanent provenance gap in the operational record, not something a diagnostic tool can 'fix'.

## Release transition gate

taskRefreshSafetyHold=true. The new probe is a permission/owner-context diagnostic, NOT a 'release idle watcher' mechanism. Any future operational transition requires separately approved task/poll freezing, no active capture/publish, live-owner process termination verification and preservation of originals under one-task ownership before any change. No job14 and no source-replay until that gate exists and clears.