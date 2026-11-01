# SR27 — bounded read-only watcher observation and historical publication reconciliation

Source: issue #44 comment 6559320641 (exact SR26 probe SHA 7d48d465c1bebc7725dded32fecf2db74f2e3f55).
Existing task Ready, pinned old worker 033fb0520212fe696df02bf2a0c5aca12ad3e848; live Node --watch PID 49344 owns its UTC-Z lease (process/lease clock gap approximately 54 ms). Job12 and job13 are published/consumed yet lack local ledger terminal records.

## Safety boundary

The watcher polls every 10 seconds. Even repeated read-only observations without child processes cannot prevent a new poll or capture after the observation. A live verified lease is **active ownership**, not retirement clearance. Never equate Task Scheduler Ready with stopped process. Any inability to enumerate processes, missing creation times, PID reuse, unreadable ledger, unknown descendant or racing evidence must fail closed.

Do not stop/kill/restart/repoint the task or processes, mutate/archive/delete lease or ledger, fetch Git state in the watcher checkout, queue a job, or replay consumed job12/job13. Both SR27 tools have taskRefreshAuthorized=false and never clear taskRefreshSafetyHold.

## Run only from a separately staged clean checkout pinned to the exact SHA in the future issue #44 handoff

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File visual-qa/sr27-ownerpc-observe-only.ps1 -ObservationSeconds 12
    node visual-qa/sr27-reconcile-consumed-readonly.mjs

Both are strictly local and read-only; only sanitized JSON goes to issue #44. Never publish raw local paths, command lines, credentials, patient data, or private files.

### Bounded watcher observation

The observer takes a snapshot, waits 12 seconds (covers at least one nominal watcher poll), and takes another. It compares task action/SHA, exact UTC lease, live Node identity/time, recursively classified PID-and-creation-checked children, all potentially related Godot processes, active ledger entries and local evidence modification markers. Classification:

- NO_CAPTURE_OBSERVED_IN_BOUNDED_WINDOW__NOT_QUIESCENCE_PROOF: no activity seen in two snapshots, but **hold remains**.
- CAPTURE_ACTIVITY_OR_UNKNOWN_PROCESS_OBSERVED__HOLD: a child, unrelated potentially relevant process, nonterminal ledger entry, or evidence modification was seen; **hold remains**.
- UNVERIFIED_OR_CHANGED_STATE__FAIL_CLOSED: identity/reading/race uncertainty; **hold remains**.

None constitutes a safe stop-the-world barrier; a transient child or new job can escape a snapshot. No script or source-level CI can by itself authorize a transition while the old watcher is alive.

### Historical publication reconciliation (no replay)

Independently verified remote originals on the visual-feedback branch:

| Job | Exact source SHA | Published CC0 environment PNG SHA256 | Published FDI36 PNG SHA256 |
| --- | --- | --- | --- |
| 12 | 678f92e28dd3a1e1bb98c4d94e58028eefa5d9ec | 727e59e4fefe2218a2049351bd102219eca0cc6e8dea9a4766fd98f14a794c27 | ebc470d22e89389ecf62abb29a24b8a012876d5c978ce7c2bf1963e704812d9d |
| 13 | 6a077fc8781d9b51ea34a751986a0187cd163764 | ca293976cd82d9d5d5c8896f613d26ecee52c604171ffd6ef94f5a5ccd1fc29b | 992ae15501235f9c77e55e83061080b865cc3c9fb69d9b127f3cd85879b9e301 |

Both original published job reports use worker 033fb0520212fe696df02bf2a0c5aca12ad3e848. The offline probe verifies local original PNG bytes against those pinned public anchors, app source/worker, native report stage=completed, six cases and FDI36, and separately checks whether the local ledger has a terminal entry. It performs **no network calls**; these published anchors must be independently rechecked by the development chat if remote state changes.

HISTORICAL_REMOTE_PUBLICATIONS_WITH_LOCAL_LEDGER_GAP__NO_REPLAY means local originals match the previously published hashes but ledger state is still unresolved. A ledger entry may not be invented. Any wrong/missing data or an executing/publish-pending ledger record fails closed. Neither historical publication nor capture/GPU evidence implies visual UX, clinical, Quest or new-source acceptance.

## Future safety gate — separate approval required

Before any task/process transition, issue #44 must document an approved method to prevent new polls during transition, attest no active/pending capture/publish activity, preserve the exact consumed originals and ledger, and confirm the prior process has exited before altering **the one existing task**. The current live lease prevents satisfying that gate. No job14 until the subsequent single-watcher transition is separately cleared and the final integration SHA has its own passing CI and exact Windows export. A previous Windows export run 41312977132 / artifact 13085733644 belongs only to source 13836e47f31785d844e747c7ffb7070530a588db.