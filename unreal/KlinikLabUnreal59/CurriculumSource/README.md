# KlinikLab curriculum migration bundle

This folder is a separate, traceable copy of the pinned Godot curriculum source for the UE 5.9 project. The source files are copied byte-for-byte under `GodotSnapshot/`; the Godot project and its learner records are not modified. `Generated/KlinikLabCurriculumRows.csv` is a flat Unreal import handoff: every row carries a stable row name, record kind, source JSON pointer, and the exact source record serialized in `payload_json`.

## Source and coverage

- Source snapshot: `e707c9c32afe5bfda870d137e28a8dc1e7851969`
- Actual app-content.json SHA-256: `99eca9ee002b144170ad56f61707daa8e285c454b5071f308f8ae5e290266b7e`
- Declared source-app SHA-256 field: `2ad804cfa6b09697923a60fc631e5941a00637b9ce888bf64c35c37ba67f6468` (retained as source metadata; it is not asserted to be the JSON file's own hash)
- Cases: 6; training stations: 7; instrument/tool entries: 19
- Practical tasks: 41; quiz items: 25
- Guided pathway steps: 24; FSP/KP case-phase tasks: 16; parity probes: 68
- Editable synthetic case-volume descriptors: 6
- A separate materials inventory is absent from this snapshot; the tool list must not be presented as one.
- Learner library index: 144 items across 8 learner categories; 68 parity probes are separately marked developer-only.

## Integration state

`Generated/ui-locales.json` sets the default interface language to English and supplies German UI strings. The lesson UI has not yet connected a language setting, and clinical lesson text remains in its original wording.

This is a data migration artifact, not yet a runtime course browser. Byte-exact source inputs stay in the project-sidecar `CurriculumSource/GodotSnapshot/`. Raw source JSON and the import CSV are deliberately kept outside UE's `Content` tree; UE's DataTable importer can otherwise mistake a whole source JSON document for a table and request an invalid row struct. The generated catalog, learner browser index, row index, English-default/German-option UI labels, editable-volume descriptors, and six binary volume fields are staged under `Content/KlinikLab/CurriculumRuntime/`, which is configured to be copied beside packaged builds. Runtime JSON text uses the neutral `.klabdata` extension so Unreal treats it as loose staged data instead of auto-importing it as a DataTable. `Generated/curriculum-catalog.json` contains all 212 indexed records and their source payloads. `Generated/curriculum-browser-index.json` groups 144 learner-visible records into eight UI categories and keeps 68 parity probes hidden in a developer-only category. The locale file supplies English-default UI labels plus German UI labels; lesson text itself remains in the source wording. The lesson UI has not yet connected this catalog, language setting, or index. The project enables Epic's `JsonBlueprintUtilities` plugin so a Blueprint can load the catalog after the editor is restarted, but no runtime course browser is connected yet. The CSV remains available in the sidecar for a future deliberate DataTable import with a matching row struct. The installed plugin currently has an UnrealEditor binary only, so standalone game packaging remains unverified; use PIE for now. The existing ultrasonic-scaler lesson is a separate first lesson and is not a substitute for the FSP/KP library. Preserve the source JSON alongside any future UE conversion so field-level provenance remains auditable.

All source content is fictional and synthetic. It is not clinically validated and must not be presented as treatment advice or competency certification. See `Generated/curriculum-bundle-manifest.json` for per-file hashes and status.

## Regenerate

From this project directory run `python Scripts\export_curriculum_bundle.py`. To use a different verified source snapshot, pass `--source <path-to-source-folder>`. The script refuses to replace any changed file in `GodotSnapshot/` or the runtime data folder.
