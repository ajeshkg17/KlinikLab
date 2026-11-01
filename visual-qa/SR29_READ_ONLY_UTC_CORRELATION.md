# SR29 — UTC process-start correlation correction (read-only)

Owner report [issue #44 comment 6559703468](https://github.com/ajeshkg17/KlinikLab/issues/44#issuecomment-6559703468) from SR28 source 30108be18c2ce23094258b4b93c7a2ee9bd8519a confirmed a matching task-owner login, exact old Node watcher and process-owner SID, and a readable lease with literal UTC `2026-11-01T12:56:29.736Z`. Process creation was `2026-11-01T12:56:29.6817300Z`. SR28 incorrectly obtained **-3599.946 s** by casting the already-UTC process creation string back to `[datetime]` before subtracting. SR27 separately obtained the correct **+0.054 s**.

## Fix and regression

The pure `visual-qa/sr29-utc-correlation.ps1` helper strictly requires an explicit `Z` or `+/-HH:MM` timezone on **both** timestamps, parses both as `DateTimeOffset` with invariant `RoundtripKind`, then subtracts **both UTC instants**. The caller `sr28-owner-identity-readonly.ps1` uses this helper, returning `leaseStartDeltaSeconds=0.054`, `leasePidWorkerIdentityVerified=true` when every other identity guard remains satisfied, and `leaseClockComparedExplicitUtcInstants=true`. A failed optional lease hash is still recorded as `HASH_WriteErrorException` and **never clears any hold**.

The `tests/sr29_utc_correlation_windows.ps1` regression runs on actual Windows PowerShell 5.1 and PowerShell 7 in CI. It asserts exact 54.27 ms from original timestamps, equivalent explicit +01:00 representations (including mixed Z and +01), a genuine negative one-hour mismatch fails identity, offset-less/malformed dates reject, and the SR28 caller no longer casts UTC strings through `[datetime]`. Node source tests independently guard these contracts. This verifies clock arithmetic only; it is NOT a Windows native app/GPU test and does not read or change the owner PC.

## Handoff / safety

From an independent detached checkout pinned to the **new exact merged integration SHA provided in issue #44**, under the already-existing scheduled-task owner's interactive login, run the **existing identity diagnostic only**, not watcher --watch/--once or any task action:

    powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File visual-qa/sr28-owner-identity-readonly.ps1

Sanitize output: `currentLoginMatchesTaskPrincipal`, `matchingExactWatcherProcessCount`, `matchingWatcherProcesses[].processOwnerMatchesTaskPrincipal`, `leaseStartedAt`, `leaseRawReadable`, `leaseHashReadable`, `leaseReadErrorStages`, `leaseStartDeltaSeconds`, `leaseClockComparedExplicitUtcInstants`, `leasePidWorkerIdentityVerified`, `classification`, `taskRefreshSafetyHold`, `taskRefreshAuthorized`. Do not expose SIDs, account names, raw command lines, private paths or credentials.

**No repeated bounded observer is required to prove clock correctness.** Prior SR27 already confirmed live watcher ownership **and observed unknown descendants / a PowerShell child**; it classified the observation **UNVERIFIED_OR_CHANGED_STATE__FAIL_CLOSED**. Neither corrected clock identity nor a quiet interval certifies quiescence. **taskRefreshSafetyHold=true**; do not stop/restart/kill/repoint the sole task, change processes, lease/ledger/evidence, permissions, queue job14 or replay jobs12/job13. Both consumed historical publications remain externally corroborated with local ledger gap, descriptive no-replay/no-repair status only.