# Unity source-only experiment for KlinikLab (separate from Godot)

**Status:** experimental code only; native Unity execution on the owner PC has **NOT** yet been observed. The normal Godot watcher and the immutable job07 `EVIDENCE_INCOMPLETE` archive remain untouched.

This experiment reuses the original source at exact Git SHA `f4d4d4151851a08342def08d9f2e461f5f5e7109` using `visual-qa/sr1-local-kliniklab-export.mjs`, not a hand-modeled tooth. It verifies the two FDI16 states contain 14,856 and 14,936 triangles, five original tissue groups, all original OBJ/MTL SHA-256 hashes, and that Unity's importer retains both triangle totals. The Unity Editor script generates a new `Assets/Scenes/KlinikLab_FDI16_SourcePreview.unity` with separate before/cut source meshes and simple camera/lighting.

To run locally in **PowerShell**, from a checkout of this experimental branch:

```powershell
& .\visual-qa\run-unity-source-probe.ps1 -RepositoryPath (Get-Location).Path
```

If Unity Hub has more than one Editor or Unity is installed elsewhere, supply `-UnityExe 'C:\Program Files\Unity\Hub\Editor\<installed-version>\Editor\Unity.exe'`. The script does **not** run when an existing Unity Editor process is active. It creates a unique output folder under `%LOCALAPPDATA%\KlinikLabUnityProbe\<timestamp>-<random>`, an exact original source Git worktree, freshly exported source mesh/manifest, a fresh Unity project, full Unity Editor source-import logs, and `unity-source-only-result.json`. Failed runs and logs are **retained**, never silently reused or overwritten.

The source-only run uses Unity's documented `-batchmode -nographics -quit -createProject` and `-executeMethod` arguments. `-nographics` means **no GPU device is initialized**: a successful result proves source geometry importer and saved scene, **not** native rendering, DirectX/NVIDIA process attribution, visible pixels, clinical accuracy, full KlinikLab migration, Quest/XR compatibility or application feature parity. An independently verified rendering job would require a new unique ID and separately designed evidence collection.

The CI workflow on GitHub runs parser and source-export checks but **cannot** prove the owner PC's Unity installation. No existing Godot job or prior evidence is touched or rerendered.

## SR1I — whole-clinic native rendering on the owner PC

This extension builds a **whole dental operatory scene**, including a room/wall display, chair/headrest/arms, overhead procedure lamp, instrument tray and instruments, two preparation podiums with the source-exact FDI16 original before and simulated cut, and panels representing the six original training cases and seven stations. This is **scene coverage**, not a complete migration of KlinikLab clinical logic, drill physics, AI, patient workflows, anatomy atlas, Quest controls or grading.

**Two-stage bounded test.** First run the existing `run-unity-source-probe.ps1` to generate one unique `%LOCALAPPDATA%\KlinikLabUnityProbe\<timestamp>-<uuid>` folder with successfully validated source import. Then invoke `run-unity-clinic-render-pc.ps1 -SourceProbeRun <that exact folder> -RepositoryPath <experiment checkout>` (and `-UnityExe` if needed). This second stage creates its own uniquely named `%LOCALAPPDATA%\KlinikLabUnityClinic\<timestamp>-<uuid>\Captures` directory; it never writes into the Godot watcher, its ledger, existing job IDs, or `visual-feedback`.

**Rendering evidence:** The only GPU stage runs Unity Editor with `-batchmode -quit -force-d3d11` (**not** `-nographics`) on a **new private WinSta0 desktop**. It never switches to that desktop or activates the visible screen. The in-Editor camera creates a real `RenderTexture` and uses `Camera.Render`, `ReadPixels`, `EncodeToPNG` for three original 1600x900 images: `unity-whole-clinic-overview.png`, `unity-whole-clinic-angled.png`, and `unity-fdi16-cut-occlusal.png`. A forty-second camera orbit generates recurring 3D render work. The owner-PC collector starts a persistent 34×1 Hz Windows `GPU Engine(*)\Utilization Percentage` query, filters rows for **the actual Unity PID**, valid 3D status/finite counters/distinct timestamps, independently enumerates DXGI adapters, and matches positive Unity-PID engine LUID against the RTX 5060's LUID. The native Unity device must independently identify D3D11/NVIDIA RTX5060 and five distinct valid, positive process+adapter periods; otherwise the report must be `EVIDENCE_INCOMPLETE`, even if PNGs exist. Source hashes, six cases/seven stations, FDI16 14856/14936 triangles and PNG file digests must pass. No acceptance of native pixels without separate direct review.

**Expected local files:** `unity-whole-clinic-native-report.json` (Unity self-report), `unity-gpu-pdh.json` (actual 1 Hz samples/DXGI), `unity-owner-pc-result.json` (external corroboration status), original PNGs, `unity-native-private-desktop.log`, and the separate case metadata manifest. Failed attempts are retained and may never be reused or overwritten. There is no automatic remote GitHub publication of these images: the locally generated evidence must be reviewed before it is treated as success. Do not claim GPU acceptance just because Unity names the RTX 5060 or the process rendered pixels.

**Important limitations:** Unity Hub installation alone does not prove Editor or license availability. The GPU renderer can fail in a private desktop or under Unity batch mode; fail closed without a foreground fallback. The source-only and full-clinic stages may need a fresh unique run after fixing actual Windows/Unity errors. The hosted Windows CI parses scripts and audits invariants; it does **not** execute Unity Editor or produce pixels.
