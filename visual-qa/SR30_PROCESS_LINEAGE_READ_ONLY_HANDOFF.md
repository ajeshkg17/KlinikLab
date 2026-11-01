# SR30 — owner-context single-snapshot read-only watcher child lineage

Basis: [issue #44 report 6559892449](https://github.com/ajeshkg17/KlinikLab/issues/44#issuecomment-6559892449) successfully confirms original lease/process owner from exact SR29 source 44fa693317d13a1949d7fc035c8fa9b934f0cdcc. The watcher is live, UTC start delta +0.054s, while optional Get-FileHash fails with HASH_WriteErrorException. Previous owner-context SR27 bounded snapshots observed unknown/related descendants, including a PowerShell child. **Neither a failed lease hash nor process-child absence can prove quiescence.**

## Source-based explanation of potential child processes

The task action remains pinned to old worker SHA `033fb0520212fe696df02bf2a0c5aca12ad3e848`. Its existing 10-second watcher `tick()` calls a **synchronous Windows PowerShell Get-FileHash preflight** (`verifyChildHashModule()`), then a Git fetch and other Git commands; separate credentials and publisher checks can invoke Git helpers. Thus a short-lived PowerShell, Git, credential-helper or console-host child might result from ordinary polling and is **not in itself evidence of app capture**. It is also NOT proof capture is absent or will not start later. The worker's separate native export/capture paths can spawn PowerShell and Godot/EXE processes. Process category is a hint, not authority for transition.

## A single next safe diagnostic

From a **separate clean detached checkout** at the *new exact merge SHA* supplied in issue #44 after SR30 CI, in the already-existing scheduled-task owner's interactive login:

    powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File visual-qa/sr30-ownerpc-process-lineage-readonly.ps1

This is a single read-only CIM process snapshot. It rechecks the current SID versus the scheduled-task principal, requires the one existing Ready task to remain pinned to the exact old worker SHA, finds the exact old Node `--watch` command and checks that process owner SID. It follows only the watcher process's parent/child PID links, rejects creation times preceding the parent using explicit UTC offsets, and classifies each child by **safe basename category**: `powershell`, `git`, `git_helper`, `node`, `console_host`, `godot_or_exported_app` or `other`. It never prints the command line, user identity, SID or absolute path. Every unknown name, implausible lineage or inaccessible process-owner SID is unverified, not accepted.

The script **does not** read/hash the live lease, read or write the ledger, inspect evidence bytes, call Git/network, launch processes, start/stop or repoint the task, change permissions or poll the watcher. It requests **one** snapshot rather than repeating SR27 bounded intervals. Process inventory may miss short-lived children between observations or detached native processes; it is **never a stop-the-world barrier**.

Output `NO_DESCENDANTS_AT_THIS_INSTANT__NOT_QUIESCENCE` or `POLLING_OR_OTHER_KNOWN_HELPERS_OBSERVED__NOT_QUIESCENCE` is *observational only*. `UNVERIFIED_OR_UNKNOWN_DESCENDANTS__HOLD`, `NATIVE_APP_DESCENDANT_OBSERVED__HOLD`, or any owner/identity/error failure also preserve the hold. The output always asserts `taskRefreshSafetyHold=true`, `taskRefreshAuthorized=false`, `quiescenceCertified=false`, `ledgerRepairAuthorized=false`. Source-only CI exercises the category and timestamp rules on WinPS5.1 and PS7 without using the owner's task.

## Historical publications and transition boundary

Already consumed job12 and job13 original local PNGs and exact source/worker/capture fields match independently published anchors. Both have missing local terminal ledger entries. Their issue-only disposition remains `REMOTE_PUBLISHED_ORIGINALS_CORROBORATED__LOCAL_LEDGER_GAP__NO_REPLAY__NO_REPAIR`. Never synthesize ledger entries or replay consumed IDs. Job14 remains unqueued.

**NO operational transition is granted.** Do not stop/kill/restart/repoint the one task, alter its action checkout, modify/archive/delete lease, change ledger/heartbeat/evidence, permissions or access controls, or queue new captures. A separate approved process that prevents further watcher polls, establishes no active/pending capture, and preserves original evidence is required before any future controlled transition. The new read-only diagnostic cannot satisfy that future gate alone.