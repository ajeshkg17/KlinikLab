# SR14 — unique owner-PC real exported-app watcher job09

**Queue state:** GitHub integration PR-gated, NOT yet a workstation render or accepted GPU evidence. Only the merged source commit from the queued JSON is eligible.

| Property | Exact approved value |
|---|---|
| Unique job | `pc-godot-exported-20261101-cc0-job09-ed3239` |
| Source Git SHA | `ed3239c85a499205bf76b13395dc54c87b8ffe75` |
| Export workflow run | [41304091271](https://github.com/ajeshkg17/KlinikLab/actions/runs/41304091271) — completed SUCCESS |
| GitHub artifact ID | `13082771261` |
| Exact ZIP artifact name | `KlinikLab-Windows-x64-ed3239c85a499205bf76b13395dc54c87b8ffe75` |
| ZIP bytes (GitHub) | 43,762,728 |
| Worker contract | schema 8, `sr14-native-exported-cc0-six-case` |
| Required GPU | Windows non-headless Vulkan Forward+, native EXE PID correlated with NVIDIA RTX 5060 DXGI LUID |
| Foreground | Strictly forbidden; use *separate private WinSta0 desktop*, no SwitchDesktop, no F12 |
| Images | Original unedited `kliniklab-exported-cc0-environment.png` and `kliniklab-exported-fdi36-practical.png` |

The repository's current `visual-qa/jobs/godot-current.json` holds this exact schema-8 request. **Historical job08 is preserved without mutation** at `visual-qa/jobs/godot-job08-original.json`; old job07 ledger, files and metadata are never reused. The original exact FDI16 geometry SHA `f4d4d415...` still applies only to the historical source job.

## Owner-PC helper execution requirements

1. Update the **single** installed `KlinikLab-Godot-PC-Watcher` scheduled task from its old exact worker Git SHA to the fresh merged integration branch SHA that contains schema8. The old worker cannot understand schema8. Do not start two workers. Preserve its private-desktop and secure noninteractive Git Credential Manager configuration; do not expose any token.
2. Run `node visual-qa/godot-worker.mjs --validate` from the exact new watcher checkout, then allow the existing private `--watch` loop to consume **job09 once**. The watcher selects the *exact* completed Windows x64 GitHub Actions artifact for `ed3239...`, verifies the exported `KlinikLab.exe` SHA256 against `SHA256SUMS.txt`, and runs the exported embedded-PCK capture script **without recompiling or launching the Godot editor**.
3. The Windows collector `visual-qa/sr1x-capture-native-exported-app-pc.ps1` uses `Start-KLPrivateDesktopExportedApp` to create the no-foreground private desktop. It records the actual EXE PID, collects **one persistent PDH GPU Engine 3D query**, verifies >=3 positive independent time periods for the same PID and the physical RTX 5060 DXGI LUID, and verifies both source-image PNG dimensions and SHA256.
4. Publish only original immutable output bytes to the unique `visual-feedback/runs/pc-godot-pc-godot-exported-20261101-cc0-job09-ed3239-ed3239c85a499205bf76b13395dc54c87b8ffe75/` branch folder through the built-in worker. Its `godot-job-result.json` must remain **EVIDENCE_INCOMPLETE** unless all provenance, screenshot and GPU process checks pass. Even a full telemetry report stays **NOT_ACCEPTED_PENDING_INDEPENDENT_PIXEL_REVIEW** until the development chat retrieves and visually inspects those original PNG bytes itself.
5. Post the exact GitHub evidence URL, image SHA256, Godot PID, DXGI LUID and any blockers on issue [#44](https://github.com/ajeshkg17/KlinikLab/issues/44). Do not rerun or overwrite attempted job IDs if the private desktop, data or GPU checks fail.

**No manual GUI, local foreground screenshots, F12, headless renderer or generic Godot scene preview substitutes for this actual exported EXE test.** The user-facing app is educational, CC0 environment is a static visual prototype, and clinical claims remain unverified.
