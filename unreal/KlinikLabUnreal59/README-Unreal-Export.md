# KlinikLab Unreal 5.9 treatment-room export

This is a separate local Unreal Engine 5.9.0 project copied from the installed First Person Blueprint template. The original Godot source and existing test profiles were not modified.

## Transfer scope

- The first-person template supplies its own WASD/mouse movement and arms/body rendering.
- The treatment-room map imports the clinic, chair, and tray as Unreal scene actors and saves their generated static meshes/materials into `Content/KlinikLab/Imported/`. Current headless import recorded 1,241 clinic actors, 16 chair actors, and 6 tray actors; a fresh-process load checks that their mesh references persist.
- The source scene meshes are copied from the local Godot preview based on source SHA `e707c9c32afe5bfda870d137e28a8dc1e7851969`.
- Original CC0 GLB bytes and the deterministic Godot float32-compatible GLBs are preserved under SourceAssets/ with the manifest.
- Godot scripts, the lesson database, scoring, saved progress, and automated trial/video recorder do not convert to Unreal. This export is a new Unreal scene shell, not full application parity.
- A separate source-derived course bundle now stages 212 records from the pinned Godot snapshot, with a learner index for 144 cases, stations, instruments, exercises, quizzes, pathways, and synthetic models. Its 68 parity probes are marked developer-only. It is not yet connected to a runtime UE course browser.
- The source snapshot has 19 instrument/tool records and no independent materials inventory. English-default/German UI labels are generated data; they are not yet connected to a Settings screen. Source lesson wording remains unchanged.
- The decorative clinic and chair are not clinically validated or dimension-calibrated.
- Headless loading/import is not visual QA. The renderer has not been reviewed in an Unreal viewport or Play-in-Editor session.

## Current treatment-room interaction prototype

- The desktop first-person controller uses reduced walking speed (180 cm/s) and keeps the existing WASD/mouse controls.
- Press E for the scaler lesson flow. Picking up the scaler attaches its tagged parts to the first-person skeletal mesh at `HandGrip_R`. With the scaler held, aim at the synthetic target within a short 75 cm view trace and press E to record the process step; the manual target action is gated by F acknowledgements for patient consent, positioning, hand hygiene, sterile storage, and tray preparation. Then aim at the tray and press E to return the tool. This desktop interaction does not track scaler-tip contact or perform treatment. The slow demo preview starts with the scaler attached before its target sweep. These Blueprint changes compile, but the hand/tool appearance and process motion still need a fresh visual Play-in-Editor review.
- Press F while looking at a tagged room station (200 cm trace range) to show its task prompt and record a simulation acknowledgement. Tagged stations cover the patient proxy, chair, hand-hygiene points, instrument tray/scaler, sterile storage, reprocessing station, sharps containers, imaging equipment, operatory lights, and monitor.
- The patient is a generic standing Manny mannequin proxy with a practice marker. F records a role-play reminder to introduce yourself, confirm identity, ask permission, and check comfort. There is no animated conversation, seated patient pose, treatment action, or real patient data.
- Room acknowledgements do not move chairs, lights, cabinets, instruments, or clinical equipment. They are training prompts and progress flags only; this prototype is not clinical guidance or a validated procedure.
- F/E and the current first-person trace/grip path are desktop inputs. Independent Meta Quest 2 hands/controllers, OpenXR input, hand pose/IK, and in-hand tracking are future work and have not been tested.

## Import approach

Unreal Engine 5.9 Interchange imports glTF/GLB scenes into a level. This project uses the `*-float32.glb` files; the original quantized files are retained for provenance. No FBX conversion is required for this export.

See SourceAssets/clinic-manifest-godot.json for asset provenance, hashes, and limitations.

## Unreal MCP (UE 5.9)

UE 5.9 includes Epic's experimental Unreal MCP server. It runs inside the editor at `http://127.0.0.1:8000/mcp` by default; enable the specific toolsets or `All Toolsets` if you connect an MCP client. This working copy has been inspected and edited through the editor MCP; the original scene import also used Unreal's headless Python/Interchange workflow. Epic documents Codex client-config generation in the editor as `ModelContextProtocol.GenerateClientConfig Codex`.

The MCP server has no authentication. Keep it bound to loopback and do not expose it to a network. This project copy's `.uproject` currently enables `AllToolsets` for the editor MCP; keep the server bound to loopback.

## Gemini API rate gate

`Scripts/gemini-rate-limit-proxy.mjs` is an optional local queue for Gemini API requests. It limits routed requests to five per rolling minute. It does not restrict direct Gemini traffic from other applications, so every client using the same Google project must use the proxy to keep the project-wide quota under that limit. See [the rate-gate setup notes](Scripts/README-gemini-rate-limit-proxy.md).

## Godot FSP/KP curriculum migration

The pinned Godot source snapshot is preserved byte-for-byte under `CurriculumSource/GodotSnapshot/` outside the Unreal `Content` tree. `Scripts/export_curriculum_bundle.py` regenerates the immutable source copy, hash manifest, full-payload `Generated/curriculum-catalog.json`, learner browser index, English-default/German-option `Generated/ui-locales.json`, curriculum row index, and Unreal-importable `Generated/KlinikLabCurriculumRows.csv`. It stages only runtime-ready JSON-text `.klabdata` files plus six editable tooth-volume binaries and manifests under `Content/KlinikLab/CurriculumRuntime/`. Raw source JSON and CSV stay in the sidecar so Unreal doesn't interpret them as DataTable imports.

Source snapshot: `e707c9c32afe5bfda870d137e28a8dc1e7851969`. Catalogued records: 6 cases, 7 stations, 19 tool entries, 41 practical tasks, 25 quiz items, 24 pathway steps, 16 FSP/KP case-phase tasks, 68 parity probes, and 6 editable-volume descriptors. The source snapshot has no separate materials inventory. These counts are data coverage, not playable Unreal lessons; a runtime curriculum browser and the remaining interactive workflows are still under development.

`CurriculumSource/Generated/ui-locales.json` sets English as the default interface language and supplies German UI strings. It is data only until a Settings control reads and saves the preference; curriculum text remains in the source language.

The UE project enables Epic's `JsonBlueprintUtilities` plugin and stages `KlinikLab/CurriculumRuntime` as non-UFS files. A Blueprint can load the JSON-text catalog from `Content/KlinikLab/CurriculumRuntime/curriculum-catalog.klabdata` with the plugin's `Load Json from File` node. Restart the editor before using that node so the plugin is loaded. The source is fictional training material and is not clinically validated.

The installed JSON Blueprint Utilities plugin currently has UnrealEditor binaries only; standalone game packaging has not been verified. For the present development build, use Editor Play-in-Editor. Before packaging later, either build the plugin for the game target or convert this content to cooked Unreal data assets and remove the runtime plugin dependency.

Official references: [Unreal MCP in UE 5.9](https://dev.epicgames.com/documentation/unreal-engine/unreal-mcp-in-unreal-editor?application_version=5.9), [Interchange import in UE 5.9](https://dev.epicgames.com/documentation/unreal-engine/importing-assets-using-interchange-in-unreal-engine?lang=en-US), [UE 5.9 First Person template](https://dev.epicgames.com/documentation/unreal-engine/first-person-template-in-unreal-engine).

