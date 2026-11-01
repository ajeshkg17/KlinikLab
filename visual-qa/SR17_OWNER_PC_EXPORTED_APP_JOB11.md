# SR17 — unique actual exported-app owner-PC watcher request job11

**Exact exported source SHA:** `a33c31a9e1c364463f96c29a6004a7e625cd4e89` (PR #64 merged after 11/11 CI checks).

**Windows export:** GitHub Actions run **41307826872**, conclusion success; artifact **13083573933**, name `KlinikLab-Windows-x64-a33c31a9e1c364463f96c29a6004a7e625cd4e89` (~47.9 MB).

**One unique schema8 watcher job:** `pc-godot-exported-20261101-cc0-job11-a33c31`, pinned to exactly that SHA and immutable export artifact.

The approved owner-PC helper on [issue #44](https://github.com/ajeshkg17/KlinikLab/issues/44) must ensure a **single** scheduled `KlinikLab-Godot-PC-Watcher` instance, refreshed to this queue/integration HEAD before processing job11, using its existing private WinSta0 desktop. It should run exactly once and never rerun consumed job07/08/09/10. Preserve historical original job10 as `visual-qa/jobs/godot-job10-original.json`, with its EVIDENCE_INCOMPLETE published results untouched. **Do not** launch the app manually, capture foreground screenshots or substitute headless/old image bytes.

This is the first job running the actual exported EXE with the **fixed embedded app-owned screenshot hook**, enabled by the strictly opt-in argument `-- --kliniklab-exported-pc-capture` rather than the old ignored `--script res://exported-app-capture.gd`. The watcher must verify SHA256SUMS.txt for EXE, **all** RAW-SOURCE-SHA256SUMS.txt entries for portable OBJ/MTL, source and Godot-compatible CC0 GLBs before launch, correct source manifest, and then generate original PNGs and `native-exported-app-result.json` through the EXE's embedded PCK. Keep raw sidecars together with the EXE.

Required two **new** native originals: `kliniklab-exported-cc0-environment.png` and `kliniklab-exported-fdi36-practical.png` (expected 1600x900, source-image SHA checked). The app report must show six cases, FDI36 endodontic practical, the approved CC0 clinic with >=20 mesh instances, Vulkan Forward+ / NVIDIA RTX 5060, plus correct source SHA and capture identity. Independently publish original evidence: EXE/PCK exact provenance, collector PID, same-PID valid positive 3D PDH samples in >=3 distinct time periods matching NVIDIA RTX 5060 DXGI LUID, and original logs. Development must **download and inspect the actual PNG bytes and GPU evidence** before accepting visual results. CI/headless, PDH alone or log alone are not visual acceptance.

Owner-PC helper should comment on issue #44 with exact job ID, queue SHA, watcher SHA, artifact and one-attempt result, and any local task/PDH/ledger blockers. Incomplete result must remain immutable and needs a new unique job ID after a source fix, never a replay.

Educational fictional anatomy; no clinical accuracy, calibrated instrument force, Quest or headset acceptance.
