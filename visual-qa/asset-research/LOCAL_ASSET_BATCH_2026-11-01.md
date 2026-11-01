# Owner-PC asset batch inventory — 1 November 2026

This catalog records candidate assets that have already been downloaded into the owner-PC review workspace. It is an acquisition inventory, not a claim that every file is suitable, clinically validated, or cleared for redistribution.

Local root:
`C:\\Users\\ajesh\\OneDrive\\study and learn\\coworker\\output\\kliniklab-engine-bakeoff\\shared-assets\\asset-candidates`

The public repository remains unchanged in visibility. The full downloaded source archives and extracted files have **not** been copied into this public repository. Continue with the locally available copies for inspection and app integration only where the governing terms permit. Do not treat personal use or private GitHub as a substitute for the asset's license. Preserve original provenance and checksums.

| Candidate batch | Local content and verified acquisition | Use in KlinikLab | GitHub binary status |
|---|---|---|---|
| 3DAssets.dev Dental Practice and Surgery | 54 individual GLB files, 3,193,436 bytes of model payload; local source manifest and per-file download index. Pack page states CC0 1.0. | Complete modular clinic environment: operatory, chair, lights, cabinets, reception, sterilization and instruments. Scene assets only; app behavior, colliders and clinical workflow are separate. | Not copied into this batch's public repository update. Individual source/manifest remains available locally for selection. |
| Mendeley 97c3pf8h2h v1 | ZIP 109,573,420 bytes; SHA-256 `EB151C2217EF20F7B75A85952C07BADC525CC0FD7615D40C207E357D89ED00E7`; extracted 30 STL, 30 IGES and 31 SCDOC files. | Lower jaw, cortical/cancellous bone, teeth and periodontal ligament candidate. | Local only; publication decision pending. |
| Mendeley xjsx7nfhj8 v1 | ZIP 109,300,897 bytes; SHA-256 `1ED0773CF3124AD26656FC92C39B95A240FBD5C72634B279C696090D94193462`; nested archive extracted to 30 STL, 30 IGES and 31 SCDOC files. | Second lower-jaw bone/tooth/PDL candidate. | Local only; publication decision pending. |
| Figshare 24591537 v1 | ZIP 171,418,488 bytes; SHA-256 `B65D9F1C13CD6758B18D4BB7630763390285460CCB262BAF765EDC329DE4EC46`; six STEP solids extracted. | Immature molar, pulp/PDL and appliance example; not a full dentition. | Local only; publication decision pending. |
| 3Dentes CBCT atlas | Source ZIP 22,670,661 bytes; SHA-256 `8856084C7742045EA73D877392965E9F7F5021340CCAE1AFF15E764678844509`; extracted repository includes 180 STL files. | 28 individually selectable teeth plus internal pulp, PDL, jaws/gingiva and nerve structures; no third molars. | Local only; apply its noncommercial attribution terms before any redistribution. |
| Z-Anatomy | Source ZIP 86,734,957 bytes; SHA-256 `E029688545627BD0214B269E1063143ABB580AAD72B2C2445D6D8A9A0D9DA736`; extracted atlas includes a Blender project. | Broader head/neck context; tooth-level FDI mapping and component provenance need review. | Local only; mixed-source/provenance review pending. |
| Zenodo DentalEmergencyModel | 14 downloaded source files: five BLEND and nine STL; downloaded payload about 354 MB. | Trauma/splint examples for selected anterior teeth. | Local only; formal license identifier was blank in the source metadata. |
| NIH 3D entries 902 and 3003 | Previously downloaded source models with owner-PC Blender previews. | Scan/jaw visual references; one is fragmented, the other is a combined arch rather than FDI-separated treatment anatomy. | Local only; no binary publication until its item permissions are resolved. |
| University of Dundee dental GLBs | Existing 16-tooth surface set already in KlinikLab, with repository attribution data. | Surface morphology baseline for incisor/canine/premolar/molar comparisons. | Already in repository; retain existing attribution and source provenance. |
| Dental Scope (online candidate) | All-32-tooth layered anatomy explorer identified; source files not downloaded in this batch. | Reference for enamel, dentin, cementum, PDL, pulp and canals across upper/lower dentition; internal proportions are simplified educational geometry. | Not downloaded or uploaded. |

Embodi3D was not acquired: the source site returned its JavaScript/cookie gate. No sign-in or bypass was attempted. Sketchfab sign-in-only candidates are also not included as downloaded assets.

## Next development use

1. Start by assembling the 54-piece clinic environment as the native app's room/equipment setting.
2. Treat this environment as scene content, not as the complete training application. Case/station navigation, instrument interaction, procedure state, explanations, persistence, and accessibility remain app code.
3. Compare the already-downloaded anatomical candidates in Blender. Keep separate files/layers for bone, teeth and tissues where present; record which FDI teeth and structures each actually contains.
4. Use Dental Scope as a source reference, not as a downloaded asset. It describes all 32 teeth and internal tissue layers, but its own page says the inside proportions are simplified and it is not for clinical decisions.
5. Keep each asset's original license, attribution, source URL/version, SHA-256, transformations, visual status, FDI coverage and clinical-review status alongside the asset.
6. Do not copy license-pending binaries or derived previews into the public repository. Publish a binary only when its specific source terms permit the intended redistribution and all required attribution/share-alike conditions are preserved. Do not change repository visibility.

**Acceptance boundary:** acquisition and a Blender render demonstrate that a file is available/importable and visually inspectable. They do not establish anatomical accuracy, full app behavior, or clinical suitability.
