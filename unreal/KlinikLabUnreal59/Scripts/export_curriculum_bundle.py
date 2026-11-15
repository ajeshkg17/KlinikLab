#!/usr/bin/env python3
"""Stage the pinned Godot FSP/KP lesson source beside the UE project.

This keeps the original Godot snapshot untouched, creates an Unreal-importable
flat CSV index, and records hashes/counts so future UE assets can be traced back
to their source records. It does not fabricate lessons or claim runtime parity.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_DIR = PROJECT_DIR.parent / "KlinikLab-Treatment-Room-Render-20261113" / "source"
TARGET_DIR = PROJECT_DIR / "CurriculumSource"
SOURCE_COPY_DIR = TARGET_DIR / "GodotSnapshot"
GENERATED_DIR = TARGET_DIR / "Generated"
RUNTIME_SOURCE_DIR = PROJECT_DIR / "Content" / "KlinikLab" / "CurriculumSource"
RUNTIME_DATA_DIR = PROJECT_DIR / "Content" / "KlinikLab" / "CurriculumRuntime"
RUNTIME_SOURCE_SUFFIXES = {".json", ".bin", ".txt"}
CSV_COLUMNS = (
    "row_name",
    "record_kind",
    "case_id",
    "phase_id",
    "title",
    "source_file",
    "source_pointer",
    "payload_json",
)

UI_LOCALIZATION = {
    "formatVersion": 1,
    "kind": "KLINIKLAB_UI_LOCALIZATION",
    "defaultLanguage": "en",
    "supportedLanguages": [
        {"id": "en", "label": "English"},
        {"id": "de", "label": "Deutsch"},
    ],
    "contentTextPolicy": "preserve_source_wording; no automatic translation of clinical lesson text",
    "strings": {
        "settings.language": {"en": "Interface language", "de": "Anzeigesprache"},
        "settings.english_default": {"en": "English (default)", "de": "Englisch (Standard)"},
        "settings.german": {"en": "German", "de": "Deutsch"},
        "catalog.title": {"en": "Learning library", "de": "Lernbibliothek"},
        "catalog.search": {"en": "Search lessons, cases, and instruments", "de": "Lektionen, Fälle und Instrumente suchen"},
        "catalog.all_cases": {"en": "All cases", "de": "Alle Fälle"},
        "catalog.all_stations": {"en": "All stations", "de": "Alle Stationen"},
        "catalog.case_studies": {"en": "Cases", "de": "Fälle"},
        "catalog.stations": {"en": "Training stations", "de": "Trainingsstationen"},
        "catalog.tools": {"en": "Instruments", "de": "Instrumente"},
        "catalog.practice": {"en": "Practical tasks", "de": "Praktische Aufgaben"},
        "catalog.quizzes": {"en": "Knowledge checks", "de": "Wissensfragen"},
        "catalog.pathways": {"en": "Guided pathways", "de": "Geführte Lernpfade"},
        "catalog.fsp_kp": {"en": "FSP/KP case practice", "de": "FSP/KP-Fallübungen"},
        "catalog.models": {"en": "Synthetic case models", "de": "Synthetische Fallmodelle"},
        "catalog.developer_parity": {"en": "Developer parity checks", "de": "Entwickler-Paritätsprüfungen"},
        "catalog.results": {"en": "Results", "de": "Ergebnisse"},
        "catalog.no_results": {"en": "No matching learning items.", "de": "Keine passenden Lerninhalte gefunden."},
        "catalog.source_reference": {"en": "Source reference", "de": "Quellenverweis"},
        "catalog.source_wording_notice": {
            "en": "Some learning text remains in its source language.",
            "de": "Einige Lerntexte bleiben in ihrer Ausgangssprache.",
        },
        "notice.simulation_only": {
            "en": "Fictional simulation material; not clinical guidance or competency assessment.",
            "de": "Fiktives Simulationsmaterial; keine klinische Anleitung oder Kompetenzbewertung.",
        },
        "lesson.start": {"en": "Start lesson", "de": "Lektion starten"},
        "lesson.restart": {"en": "Restart", "de": "Neu starten"},
        "lesson.exit": {"en": "Exit lesson", "de": "Lektion beenden"},
        "lesson.objective": {"en": "Objective", "de": "Lernziel"},
        "lesson.current_step": {"en": "Current step", "de": "Aktueller Schritt"},
        "lesson.feedback": {"en": "Feedback", "de": "Rückmeldung"},
        "lesson.score": {"en": "Score", "de": "Punktestand"},
        "interaction.pickup": {"en": "Pick up", "de": "Aufnehmen"},
        "interaction.return": {"en": "Return to tray", "de": "Auf das Tablett zurücklegen"},
        "interaction.verify": {"en": "Verify", "de": "Überprüfen"},
        "interaction.wrong_target": {
            "en": "Aim at the assigned target and try again.",
            "de": "Zielen Sie auf das vorgegebene Ziel und versuchen Sie es erneut.",
        },
        "interaction.wrong_tool": {
            "en": "Choose the requested instrument and try again.",
            "de": "Wählen Sie das geforderte Instrument und versuchen Sie es erneut.",
        },
        "interaction.already_completed": {
            "en": "This step is already complete.",
            "de": "Dieser Schritt ist bereits abgeschlossen.",
        },
    },
}


BROWSER_CATEGORIES = (
    ("cases", "catalog.case_studies", ("case",)),
    ("stations", "catalog.stations", ("station",)),
    ("instruments", "catalog.tools", ("tool",)),
    ("practical_tasks", "catalog.practice", ("practical_task",)),
    ("knowledge_checks", "catalog.quizzes", ("quiz",)),
    ("guided_pathways", "catalog.pathways", ("pathway_step",)),
    ("fsp_kp_practice", "catalog.fsp_kp", ("fsp_kp_phase",)),
    ("synthetic_models", "catalog.models", ("editable_case_volume",)),
    ("developer_parity", "catalog.developer_parity", ("parity_probe",)),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def json_file(path: Path) -> Any:
    with path.open("r", encoding="utf-8-sig") as stream:
        return json.load(stream)


def json_text(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def slug(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_]+", "_", value).strip("_").lower()


def record(
    row_name: str,
    kind: str,
    source_file: str,
    pointer: str,
    payload: Any,
    *,
    case_id: str = "",
    phase_id: str = "",
    title: str = "",
) -> dict[str, str]:
    return {
        "row_name": slug(row_name),
        "record_kind": kind,
        "case_id": case_id,
        "phase_id": phase_id,
        "title": title,
        "source_file": source_file,
        "source_pointer": pointer,
        "payload_json": json_text(payload),
    }


def collect_records(source: Path, data: dict[str, Any]) -> list[dict[str, str]]:
    app = data["app-content.json"]
    pathways = data["clinical-pathways.json"]
    fsp = data["fsp-kp.json"]
    volumes = data["editable-case-volumes.json"]
    rows: list[dict[str, str]] = []
    for case_index, case in enumerate(app["cases"]):
        case_id = case["id"]
        rows.append(record(f"case_{case_id}", "case", "app-content.json", f"/cases/{case_index}", case,
                           case_id=case_id, title=case.get("title", case_id)))

    for index, station in enumerate(app["stations"]):
        station_id = station["id"]
        rows.append(record(f"station_{station_id}", "station", "app-content.json", f"/stations/{index}", station,
                           title=station.get("title", station_id)))

    for index, tool in enumerate(app["tools"]):
        tool_id = tool["id"]
        rows.append(record(f"tool_{tool_id}", "tool", "app-content.json", f"/tools/{index}", tool,
                           title=tool.get("english", tool.get("german", tool_id))))

    for case_index, task_group in enumerate(app["practical"]):
        case_id = app["cases"][case_index]["id"]
        for task_index, task in enumerate(task_group):
            rows.append(record(f"practical_{case_id}_{task_index + 1:02d}", "practical_task",
                               "app-content.json", f"/practical/{case_index}/{task_index}", task,
                               case_id=case_id, title=task.get("title", "")))

    for quiz_group, quiz_items in app["quiz"].items():
        for quiz_index, quiz in enumerate(quiz_items):
            rows.append(record(f"quiz_{quiz_group}_{quiz_index + 1:02d}", "quiz",
                               "app-content.json", f"/quiz/{quiz_group}/{quiz_index}", quiz,
                               phase_id=quiz_group, title=quiz.get("title", quiz.get("prompt", ""))))

    for case_id, pathway in pathways["cases"].items():
        for step_index, step in enumerate(pathway["procedure"]):
            title = step.get("title", step.get("name", "")) if isinstance(step, dict) else str(step)
            rows.append(record(f"pathway_{case_id}_{step_index + 1:02d}", "pathway_step",
                               "clinical-pathways.json", f"/cases/{case_id}/procedure/{step_index}", step,
                               case_id=case_id, title=title))

    phase_ids = list(fsp["phaseOrder"])
    for case_id, case in fsp["cases"].items():
        tasks = case.get("tasks", {})
        for phase_id in phase_ids:
            if phase_id not in tasks:
                raise ValueError(f"Missing FSP/KP phase {phase_id!r} for case {case_id!r}")
            phase_task = tasks[phase_id]
            rows.append(record(f"fsp_{case_id}_{phase_id}", "fsp_kp_phase",
                               "fsp-kp.json", f"/cases/{case_id}/tasks/{phase_id}", phase_task,
                               case_id=case_id, phase_id=phase_id,
                               title=f"{case.get('title', case_id)} · {phase_id}"))

    for index, probe in enumerate(fsp["parityProbes"]):
        case_id = probe["caseId"]
        phase_id = probe["phase"]
        rows.append(record(f"parity_{case_id}_{phase_id}_{index + 1:03d}", "parity_probe",
                           "fsp-kp.json", f"/parityProbes/{index}", probe,
                           case_id=case_id, phase_id=phase_id,
                           title=f"{case_id} · {phase_id} probe {index + 1}"))

    for case_id in volumes["caseOrder"]:
        volume = volumes["cases"][case_id]
        rows.append(record(f"volume_{case_id}", "editable_case_volume",
                           "editable-case-volumes.json", f"/cases/{case_id}", volume,
                           case_id=case_id, title=f"FDI {volume['fdi']} editable volume"))

    if len(app["cases"]) != len(app["practical"]):
        raise ValueError("Case and practical-task arrays are out of alignment")
    if len({row["row_name"] for row in rows}) != len(rows):
        raise ValueError("Generated Unreal row names are not unique")
    return rows


def counts(rows: list[dict[str, str]]) -> dict[str, int]:
    result: dict[str, int] = {}
    for row in rows:
        kind = row["record_kind"]
        result[kind] = result.get(kind, 0) + 1
    return dict(sorted(result.items()))


def searchable_strings(value: Any) -> list[str]:
    """Collect short source labels for filtering without translating source text."""
    found: list[str] = []

    def visit(item: Any) -> None:
        if isinstance(item, dict):
            for child in item.values():
                visit(child)
        elif isinstance(item, list):
            for child in item:
                visit(child)
        elif isinstance(item, str) and item.strip() and len(item) <= 180:
            found.append(item.strip())

    visit(value)
    return list(dict.fromkeys(found))


def build_browser_index(rows: list[dict[str, str]], pin: str, source_data: dict[str, Any]) -> dict[str, Any]:
    """Create the learner-facing category/search index used by the UE browser."""
    by_kind: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        payload = json.loads(row["payload_json"])
        item = {
            "id": row["row_name"],
            "recordKind": row["record_kind"],
            "caseId": row["case_id"],
            "phaseId": row["phase_id"],
            "title": row["title"],
            "searchText": " ".join(dict.fromkeys([
                row["row_name"], row["record_kind"], row["case_id"], row["phase_id"],
                row["title"], *searchable_strings(payload),
            ])).strip(),
            "sourceFile": row["source_file"],
            "sourcePointer": row["source_pointer"],
        }
        if row["record_kind"] == "tool":
            item["titleEnglish"] = payload.get("english", row["title"])
            item["titleGerman"] = payload.get("german", "")
        by_kind.setdefault(row["record_kind"], []).append(item)

    categories = []
    learner_ids: list[str] = []
    developer_ids: list[str] = []
    for category_id, title_key, kinds in BROWSER_CATEGORIES:
        items = [item for kind in kinds for item in by_kind.get(kind, [])]
        is_developer = category_id == "developer_parity"
        if is_developer:
            developer_ids.extend(item["id"] for item in items)
        else:
            learner_ids.extend(item["id"] for item in items)
        categories.append({
            "id": category_id,
            "titleKey": title_key,
            "audience": "developer" if is_developer else "learner",
            "defaultVisible": not is_developer,
            "count": len(items),
            "items": items,
        })

    return {
        "formatVersion": 1,
        "kind": "KLINIKLAB_LEARNING_LIBRARY_INDEX",
        "sourceSnapshotGitSHA": pin,
        "defaultLanguage": UI_LOCALIZATION["defaultLanguage"],
        "supportedLanguages": [entry["id"] for entry in UI_LOCALIZATION["supportedLanguages"]],
        "clinicalAssessmentValidated": bool(source_data["app-content.json"].get("clinicalAssessmentValidated", False)),
        "contentTextPolicy": UI_LOCALIZATION["contentTextPolicy"],
        "summary": {
            "learnerVisibleItems": len(learner_ids),
            "developerOnlyParityProbes": len(developer_ids),
            "materialsInventoryItems": 0,
        },
        "categories": categories,
        "limitations": [
            "The index is staged data; the Unreal runtime browser is not connected yet.",
            "Only the 19 source instrument records are listed; no separate materials inventory exists in the pinned source.",
            "All records are fictional training content and do not establish clinical competency.",
        ],
    }


def write_generated(path: Path, content: str | bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = content.encode("utf-8") if isinstance(content, str) else content
    fd, temporary = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def mirror_runtime_file(src: Path, dest: Path) -> None:
    """Stage JSON/binary data for packaged loose-file loading, without OBJ import."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        if sha256(dest) != sha256(src):
            raise FileExistsError(f"Refusing to overwrite changed runtime data file: {dest}")
    else:
        shutil.copy2(src, dest)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE_DIR,
                        help="Godot source snapshot's source directory")
    args = parser.parse_args()
    source = args.source.resolve()
    if not source.is_dir():
        raise FileNotFoundError(f"Curriculum source folder not found: {source}")

    source_files = sorted(path for path in source.iterdir() if path.is_file())
    if not source_files:
        raise ValueError(f"No source files found in {source}")
    source_map = {path.name: json_file(path) for path in source_files if path.suffix.lower() == ".json"}
    required = {"expected-sha.txt", "app-content.json", "clinical-pathways.json",
                "fsp-kp.json", "editable-case-volumes.json"}
    missing = sorted(required - {path.name for path in source_files})
    if missing:
        raise ValueError(f"Source snapshot is missing required files: {', '.join(missing)}")

    pin = (source / "expected-sha.txt").read_text(encoding="utf-8-sig").strip()
    app = source_map["app-content.json"]
    if app.get("sourceGitSHA") != pin:
        raise ValueError("app-content.json sourceGitSHA does not match expected-sha.txt")

    data = source_map
    rows = collect_records(source, data)
    row_counts = counts(rows)
    if row_counts.get("case") != 6 or row_counts.get("practical_task") != 41:
        raise ValueError(f"Unexpected case/practical counts: {row_counts}")
    if row_counts.get("fsp_kp_phase") != 16 or row_counts.get("parity_probe") != 68:
        raise ValueError(f"Unexpected FSP/KP counts: {row_counts}")

    # Source copies are immutable from this tool: a changed destination file is
    # preserved and reported rather than silently overwritten.
    for src in source_files:
        dest = SOURCE_COPY_DIR / src.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists():
            if sha256(dest) != sha256(src):
                raise FileExistsError(f"Refusing to overwrite changed source copy: {dest}")
        else:
            shutil.copy2(src, dest)

    file_manifest = [
        {"file": path.name, "bytes": path.stat().st_size, "sha256": sha256(path)}
        for path in source_files
    ]
    manifest = {
        "formatVersion": 1,
        "kind": "KLINIKLAB_GODOT_CURRICULUM_SOURCE_BUNDLE",
        "sourceSnapshotGitSHA": pin,
        "sourceAppSHA256": sha256(source / "app-content.json"),
        "declaredSourceAppSHA256": app.get("sourceAppSHA256"),
        "sourcePathAtExport": str(source),
        "clinicalAssessmentValidated": bool(app.get("clinicalAssessmentValidated", False)),
        "clinicalReviewPending": bool(data["fsp-kp.json"].get("clinicalReviewPending", True)),
        "catalogCoverage": row_counts,
        "totalRecords": len(rows),
        "materialsCatalog": {
            "status": "not_separately_present_in_pinned_snapshot",
            "count": 0,
            "note": "The source has an instrument/tool list, but no standalone materials inventory."
        },
        "files": file_manifest,
        "runtimeIntegration": "loose .klabdata JSON staged; curriculum browser not yet wired",
    }
    index = {
        "formatVersion": 1,
        "kind": "KLINIKLAB_CURRICULUM_ROW_INDEX",
        "sourceSnapshotGitSHA": pin,
        "rowSchema": list(CSV_COLUMNS),
        "records": [
            {key: row[key] for key in CSV_COLUMNS if key != "payload_json"}
            for row in rows
        ],
        "recordCounts": row_counts,
        "limitations": [
            "Fictional training content only; not clinical guidance or a competency assessment.",
            "The source bundle and CSV are not yet loaded by the Unreal runtime.",
            "No standalone materials inventory is present in this source snapshot.",
        ],
    }
    catalog = {
        "formatVersion": 1,
        "kind": "KLINIKLAB_UNREAL_CURRICULUM_CATALOG",
        "sourceSnapshotGitSHA": pin,
        "recordCounts": row_counts,
        "records": [
            {
                "id": row["row_name"],
                "recordKind": row["record_kind"],
                "caseId": row["case_id"],
                "phaseId": row["phase_id"],
                "title": row["title"],
                "sourceFile": row["source_file"],
                "sourcePointer": row["source_pointer"],
                "payload": json.loads(row["payload_json"]),
            }
            for row in rows
        ],
        "limitations": [
            "Fictional training content only; not clinical guidance or a competency assessment.",
            "A runtime course browser has not yet been connected to this catalog.",
            "No standalone materials inventory is present in this source snapshot.",
        ],
    }
    browser_index = build_browser_index(rows, pin, data)

    from io import StringIO
    output = StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=CSV_COLUMNS, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    generated_contents = {
        "KlinikLabCurriculumRows.csv": output.getvalue(),
        "curriculum-row-index.json": json.dumps(index, ensure_ascii=False, indent=2) + "\n",
        "curriculum-catalog.json": json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
        "curriculum-browser-index.json": json.dumps(browser_index, ensure_ascii=False, indent=2) + "\n",
        "ui-locales.json": json.dumps(UI_LOCALIZATION, ensure_ascii=False, indent=2) + "\n",
    }
    manifest["generatedArtifacts"] = [
        {
            "file": name,
            "bytes": len(contents.encode("utf-8")),
            "sha256": hashlib.sha256(contents.encode("utf-8")).hexdigest(),
        }
        for name, contents in generated_contents.items()
    ]
    for name, contents in generated_contents.items():
        write_generated(GENERATED_DIR / name, contents)
    write_generated(GENERATED_DIR / "curriculum-bundle-manifest.json",
                    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")

    readme = f"""# KlinikLab curriculum migration bundle

This folder is a separate, traceable copy of the pinned Godot curriculum source for the UE 5.9 project. The source files are copied byte-for-byte under `GodotSnapshot/`; the Godot project and its learner records are not modified. `Generated/KlinikLabCurriculumRows.csv` is a flat Unreal import handoff: every row carries a stable row name, record kind, source JSON pointer, and the exact source record serialized in `payload_json`.

## Source and coverage

- Source snapshot: `{pin}`
- Actual app-content.json SHA-256: `{manifest['sourceAppSHA256']}`
- Declared source-app SHA-256 field: `{manifest['declaredSourceAppSHA256']}` (retained as source metadata; it is not asserted to be the JSON file's own hash)
- Cases: {row_counts.get('case', 0)}; training stations: {row_counts.get('station', 0)}; instrument/tool entries: {row_counts.get('tool', 0)}
- Practical tasks: {row_counts.get('practical_task', 0)}; quiz items: {row_counts.get('quiz', 0)}
- Guided pathway steps: {row_counts.get('pathway_step', 0)}; FSP/KP case-phase tasks: {row_counts.get('fsp_kp_phase', 0)}; parity probes: {row_counts.get('parity_probe', 0)}
- Editable synthetic case-volume descriptors: {row_counts.get('editable_case_volume', 0)}
- A separate materials inventory is absent from this snapshot; the tool list must not be presented as one.
- Learner library index: {browser_index['summary']['learnerVisibleItems']} items across {len(BROWSER_CATEGORIES) - 1} learner categories; {browser_index['summary']['developerOnlyParityProbes']} parity probes are separately marked developer-only.

## Integration state

`Generated/ui-locales.json` sets the default interface language to English and supplies German UI strings. The lesson UI has not yet connected a language setting, and clinical lesson text remains in its original wording.

This is a data migration artifact, not yet a runtime course browser. Byte-exact source inputs stay in the project-sidecar `CurriculumSource/GodotSnapshot/`. Raw source JSON and the import CSV are deliberately kept outside UE's `Content` tree; UE's DataTable importer can otherwise mistake a whole source JSON document for a table and request an invalid row struct. The generated catalog, learner browser index, row index, English-default/German-option UI labels, editable-volume descriptors, and six binary volume fields are staged under `Content/KlinikLab/CurriculumRuntime/`, which is configured to be copied beside packaged builds. Runtime JSON text uses the neutral `.klabdata` extension so Unreal treats it as loose staged data instead of auto-importing it as a DataTable. `Generated/curriculum-catalog.json` contains all 212 indexed records and their source payloads. `Generated/curriculum-browser-index.json` groups 144 learner-visible records into eight UI categories and keeps 68 parity probes hidden in a developer-only category. The locale file supplies English-default UI labels plus German UI labels; lesson text itself remains in the source wording. The lesson UI has not yet connected this catalog, language setting, or index. The project enables Epic's `JsonBlueprintUtilities` plugin so a Blueprint can load the catalog after the editor is restarted, but no runtime course browser is connected yet. The CSV remains available in the sidecar for a future deliberate DataTable import with a matching row struct. The installed plugin currently has an UnrealEditor binary only, so standalone game packaging remains unverified; use PIE for now. The existing ultrasonic-scaler lesson is a separate first lesson and is not a substitute for the FSP/KP library. Preserve the source JSON alongside any future UE conversion so field-level provenance remains auditable.

All source content is fictional and synthetic. It is not clinically validated and must not be presented as treatment advice or competency certification. See `Generated/curriculum-bundle-manifest.json` for per-file hashes and status.

## Regenerate

From this project directory run `python Scripts\\export_curriculum_bundle.py`. To use a different verified source snapshot, pass `--source <path-to-source-folder>`. The script refuses to replace any changed file in `GodotSnapshot/` or the runtime data folder.
"""
    write_generated(TARGET_DIR / "README.md", readme)

    runtime_volume_sources = [path for path in SOURCE_COPY_DIR.iterdir()
                              if path.is_file() and (path.name.endswith("-volume-field.bin")
                              or path.name.endswith("-volume-field-manifest.json"))]
    runtime_generated = [path for path in GENERATED_DIR.iterdir()
                         if path.is_file() and path.suffix.lower() == ".json"]
    source_mirrors = [path for path in SOURCE_COPY_DIR.iterdir()
                      if path.is_file() and path.suffix.lower() in RUNTIME_SOURCE_SUFFIXES]
    generated_mirrors = [path for path in GENERATED_DIR.iterdir()
                         if path.is_file() and path.suffix.lower() in {".json", ".csv"}]
    for src in source_mirrors + generated_mirrors:
        dest = RUNTIME_SOURCE_DIR / src.name
        if dest.exists():
            if sha256(dest) != sha256(src):
                raise FileExistsError(f"Refusing to remove changed data mirror from UE Content: {dest}")
            dest.unlink()
    for src in runtime_volume_sources:
        dest_name = src.name if src.suffix.lower() == ".bin" else src.stem + ".klabdata"
        dest = RUNTIME_DATA_DIR / dest_name
        mirror_runtime_file(src, dest)
        if src.suffix.lower() == ".json":
            old_runtime_copy = RUNTIME_DATA_DIR / src.name
            if old_runtime_copy.exists():
                if sha256(old_runtime_copy) != sha256(src):
                    raise FileExistsError(f"Refusing to remove changed volume manifest copy: {old_runtime_copy}")
                old_runtime_copy.unlink()
    for src in runtime_generated:
        dest = RUNTIME_DATA_DIR / (src.stem + ".klabdata")
        mirror_runtime_file(src, dest)
    for src in GENERATED_DIR.iterdir():
        if not src.is_file() or src.suffix.lower() not in {".json", ".csv"}:
            continue
        old_runtime_copy = RUNTIME_DATA_DIR / src.name
        if old_runtime_copy.exists():
            if sha256(old_runtime_copy) != sha256(src):
                raise FileExistsError(f"Refusing to remove changed imported-format runtime copy: {old_runtime_copy}")
            old_runtime_copy.unlink()
    print(json.dumps({
        "project": str(PROJECT_DIR),
        "sourceSnapshotGitSHA": pin,
        "target": str(TARGET_DIR),
        "sourceFilesCopied": len(source_files),
        "sourceFilesMirroredIntoContent": 0,
        "sourceFilesPreservedInSidecar": len(source_files),
        "runtimeVolumeFilesStaged": len(runtime_volume_sources),
        "runtimeGeneratedFilesStaged": len(runtime_generated),
        "runtimeTextExtension": ".klabdata",
        "runtimeDataPath": str(RUNTIME_DATA_DIR),
        "totalRecords": len(rows),
        "recordCounts": row_counts,
        "runtimeFilesStaged": True,
        "runtimeCurriculumBrowserIntegrated": False,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # keep failure concise for CI/editor terminals
        print(f"Curriculum bundle export failed: {error}", file=sys.stderr)
        raise SystemExit(1)
