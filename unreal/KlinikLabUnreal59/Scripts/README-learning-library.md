# Unreal learning library

`Content/KlinikLab/Teaching/UI/WBP_LearningLibrary` is a separate scrollable screen opened from the existing lesson menu. The original lesson panel and its `M`/`E` controls remain in place.

The screen is generated from the learner-facing `curriculum-browser-index.klabdata` snapshot. It shows the 144 visible records in eight categories and excludes the 68 developer-only parity probes. Titles and source pointers are retained; the search-text fields are not copied into the UI. Catalog rows are explicitly marked **Catalog only**. They are not playable procedures.

The separate **Playable now** section is limited to the two existing UE exercises: ultrasonic scaler setup and the periodontal marker exercise. The exercise buttons route to the maps that already contain those lessons. The library itself does not add clinical actions or competency claims.

The UI labels are English. Course titles remain in their source language. This screen does not yet persist a language preference or translate course content; those need a real Settings flow.

## Regenerate the source manifest

From the Unreal project folder, run:

```powershell
python Scripts/prepare_learning_library_manifest.py
```

The script validates the learner-item count and unique IDs, then writes `Saved/CodexTakeover/learning-library/manifest.json`. After the source index changes, regenerate the UMG rows from that manifest and recompile `WBP_LearningLibrary` in the Unreal editor.

## Current scope

Only the two existing UE teaching exercises have interactive procedures. The remaining catalog entries are reference records for future work. The source snapshot is fictional educational material and is not clinically validated.

## Implemented menu route (2026-11-15)

- Press `M` to open the lesson menu, then choose **Learning library · 144 topics**.
- **Play: Ultrasonic scaler setup** opens `/Game/KlinikLab/Maps/TreatmentRoom`.
- **Play: Periodontal marker exercise** opens `/Game/KlinikLab/Maps/TreatmentRoom_PerioMarkerExercise`.
- **Return to the lesson** closes the library overlay without resetting the lesson underneath it.
- Both Widget Blueprints compile in Unreal Engine 5.9.0, and the editor reported no dirty content packages after saving.

This is a catalog and navigation slice, not 144 playable lessons. A live PIE click-through and visual review still need a separate run; no screenshots were captured.
