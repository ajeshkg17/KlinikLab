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
