#!/usr/bin/env python3
r"""Read-only verification CLI for KlinikLab staged Unreal curriculum runtime data.

Validates synchronization and integrity between ``CurriculumSource/Generated``
and ``Content/KlinikLab/CurriculumRuntime`` without modifying any project files.

Checks performed:
  1. Project layout presence (``CurriculumSource/Generated`` and
     ``Content/KlinikLab/CurriculumRuntime``).
  2. Generated JSON to staged ``.klabdata`` synchronization: parses both files
     as UTF-8 JSON and confirms byte-for-byte identity for catalog, browser
     index, bundle manifest, row index, and UI locales.
  3. Bundle manifest ``generatedArtifacts`` verification: checks expected
     generated files, exact byte sizes, and SHA-256 digests on disk.
  4. Staged FDI volumetric manifest discovery and schema validation for the
     expected FDI set (11, 16, 26, 36, 46, 48) with unique IDs and filenames.
  5. Staged FDI binary volume validation: verifies adjacent ``.bin`` filename,
     SHA-256 (``fieldSHA256``), and byte size (``sampleCount * len(channels) * 4``
     for 4-byte IEEE 754 float32).
  6. Learner-visible and developer-only record totals against bundle manifest
     and browser index schema declarations.
  7. Internal consistency of record counts, unique IDs, metadata alignment
     across catalog/row-index/browser-index, volume record links, and UI
     locale coverage.

Usage:
  python Scripts/verify_curriculum_runtime.py
  python Scripts/verify_curriculum_runtime.py --project-root "C:\path\to\project"
  python Scripts/verify_curriculum_runtime.py --json
  python Scripts/verify_curriculum_runtime.py --project-root . --json

Exit codes:
  0  All checks passed.
  1  One or more checks failed or required files were invalid/missing.
"""

from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import sys
from typing import Any


EXPECTED_STAGED_JSON_PAIRS: tuple[tuple[str, str], ...] = (
    ("curriculum-catalog", "curriculum-catalog.json"),
    ("curriculum-browser-index", "curriculum-browser-index.json"),
    ("curriculum-bundle-manifest", "curriculum-bundle-manifest.json"),
    ("curriculum-row-index", "curriculum-row-index.json"),
    ("ui-locales", "ui-locales.json"),
)

EXPECTED_GENERATED_ARTIFACTS: frozenset[str] = frozenset(
    {
        "KlinikLabCurriculumRows.csv",
        "curriculum-row-index.json",
        "curriculum-catalog.json",
        "curriculum-browser-index.json",
        "ui-locales.json",
    }
)

EXPECTED_FDI_CODES: tuple[str, ...] = ("11", "16", "26", "36", "46", "48")
FLOAT32_BYTES = 4
HASH_CHUNK_SIZE = 65536


def _is_int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _sha256_and_size_file(path: Path) -> tuple[str, int]:
    digest = hashlib.sha256()
    total_bytes = 0
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(HASH_CHUNK_SIZE)
            if not chunk:
                break
            digest.update(chunk)
            total_bytes += len(chunk)
    return digest.hexdigest(), total_bytes


def _is_within_directory(candidate: Path, base_dir: Path) -> bool:
    try:
        candidate.resolve().relative_to(base_dir.resolve())
        return True
    except ValueError:
        return False


def _make_check(
    name: str,
    passed: bool,
    message: str,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "name": name,
        "status": "PASS" if passed else "FAIL",
        "passed": passed,
        "message": message,
        "details": details or {},
    }


def _check_project_paths(
    project_root: Path,
    generated_dir: Path,
    runtime_dir: Path,
) -> dict[str, Any]:
    missing: list[str] = []
    if not project_root.is_dir():
        missing.append(f"project root directory not found: {project_root}")
    if not generated_dir.is_dir():
        missing.append(f"generated curriculum directory not found: {generated_dir}")
    if not runtime_dir.is_dir():
        missing.append(f"staged runtime directory not found: {runtime_dir}")

    if missing:
        return _make_check(
            "project_paths",
            False,
            "; ".join(missing),
            {
                "projectRoot": str(project_root),
                "generatedDir": str(generated_dir),
                "runtimeDir": str(runtime_dir),
                "errors": missing,
            },
        )

    return _make_check(
        "project_paths",
        True,
        "Generated and staged runtime directories exist.",
        {
            "projectRoot": str(project_root),
            "generatedDir": str(generated_dir),
            "runtimeDir": str(runtime_dir),
        },
    )


def _check_staged_json_pairs(
    generated_dir: Path,
    runtime_dir: Path,
) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    checks: list[dict[str, Any]] = []
    parsed_docs: dict[str, dict[str, Any]] = {}

    for stem, json_filename in EXPECTED_STAGED_JSON_PAIRS:
        klab_filename = f"{stem}.klabdata"
        gen_path = generated_dir / json_filename
        staged_path = runtime_dir / klab_filename
        check_name = f"staged_sync.{stem}"

        if not gen_path.is_file():
            checks.append(
                _make_check(
                    check_name,
                    False,
                    f"Missing generated file: {gen_path}",
                    {"generatedPath": str(gen_path), "stagedPath": str(staged_path)},
                )
            )
            continue

        if not staged_path.is_file():
            checks.append(
                _make_check(
                    check_name,
                    False,
                    f"Missing staged .klabdata copy: {staged_path}",
                    {"generatedPath": str(gen_path), "stagedPath": str(staged_path)},
                )
            )
            continue

        try:
            gen_bytes = gen_path.read_bytes()
            staged_bytes = staged_path.read_bytes()
        except OSError as exc:
            checks.append(
                _make_check(
                    check_name,
                    False,
                    f"Failed to read file bytes: {exc}",
                    {"generatedPath": str(gen_path), "stagedPath": str(staged_path)},
                )
            )
            continue

        try:
            gen_obj = json.loads(gen_bytes.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            checks.append(
                _make_check(
                    check_name,
                    False,
                    f"Generated file {json_filename} is not valid UTF-8 JSON: {exc}",
                    {"generatedPath": str(gen_path)},
                )
            )
            continue

        try:
            staged_obj = json.loads(staged_bytes.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            checks.append(
                _make_check(
                    check_name,
                    False,
                    f"Staged file {klab_filename} is not valid UTF-8 JSON: {exc}",
                    {"stagedPath": str(staged_path)},
                )
            )
            continue

        if not isinstance(gen_obj, dict) or not isinstance(staged_obj, dict):
            checks.append(
                _make_check(
                    check_name,
                    False,
                    f"Expected JSON object in {json_filename} and {klab_filename}.",
                    {
                        "generatedType": type(gen_obj).__name__,
                        "stagedType": type(staged_obj).__name__,
                    },
                )
            )
            continue

        parsed_docs[stem] = gen_obj

        if gen_bytes != staged_bytes:
            checks.append(
                _make_check(
                    check_name,
                    False,
                    f"Byte mismatch between {json_filename} and {klab_filename}.",
                    {
                        "generatedPath": str(gen_path),
                        "stagedPath": str(staged_path),
                        "generatedBytes": len(gen_bytes),
                        "stagedBytes": len(staged_bytes),
                        "generatedSHA256": _sha256_bytes(gen_bytes),
                        "stagedSHA256": _sha256_bytes(staged_bytes),
                    },
                )
            )
            continue

        checks.append(
            _make_check(
                check_name,
                True,
                f"{json_filename} and {klab_filename} parse cleanly and are byte-identical ({len(gen_bytes)} bytes).",
                {
                    "bytes": len(gen_bytes),
                    "sha256": _sha256_bytes(gen_bytes),
                },
            )
        )

    return checks, parsed_docs


def _check_generated_artifacts(
    bundle_manifest: dict[str, Any] | None,
    generated_dir: Path,
) -> dict[str, Any]:
    check_name = "bundle_manifest.generated_artifacts"
    if bundle_manifest is None:
        return _make_check(
            check_name,
            False,
            "Cannot validate generatedArtifacts because curriculum-bundle-manifest.json failed to load.",
        )

    errors: list[str] = []
    if bundle_manifest.get("kind") != "KLINIKLAB_GODOT_CURRICULUM_SOURCE_BUNDLE":
        errors.append(
            f"Unexpected bundle manifest kind: {bundle_manifest.get('kind')!r}"
        )
    if bundle_manifest.get("formatVersion") != 1:
        errors.append(
            f"Unexpected bundle manifest formatVersion: {bundle_manifest.get('formatVersion')!r}"
        )

    artifacts = bundle_manifest.get("generatedArtifacts")
    if not isinstance(artifacts, list) or not artifacts:
        errors.append("generatedArtifacts must be a non-empty list.")
        return _make_check(check_name, False, "; ".join(errors), {"errors": errors})

    declared_files: list[str] = []
    verified: list[dict[str, Any]] = []

    for index, entry in enumerate(artifacts):
        if not isinstance(entry, dict):
            errors.append(f"generatedArtifacts[{index}] is not an object.")
            continue

        rel_name = entry.get("file")
        expected_bytes = entry.get("bytes")
        expected_sha = entry.get("sha256")

        if not isinstance(rel_name, str) or not rel_name.strip():
            errors.append(f"generatedArtifacts[{index}].file is missing or invalid.")
            continue
        if not _is_int(expected_bytes) or expected_bytes < 0:
            errors.append(
                f"generatedArtifacts[{index}] ({rel_name}) has invalid bytes declaration: {expected_bytes!r}"
            )
            continue
        if not isinstance(expected_sha, str) or len(expected_sha) != 64:
            errors.append(
                f"generatedArtifacts[{index}] ({rel_name}) has invalid sha256 declaration: {expected_sha!r}"
            )
            continue

        declared_files.append(rel_name)
        target_path = generated_dir / rel_name
        if not _is_within_directory(target_path, generated_dir):
            errors.append(
                f"generatedArtifacts[{index}] path escapes generated directory: {rel_name}"
            )
            continue
        if not target_path.is_file():
            errors.append(f"Declared generated artifact missing on disk: {target_path}")
            continue

        try:
            actual_sha, actual_bytes = _sha256_and_size_file(target_path)
        except OSError as exc:
            errors.append(f"Failed reading {target_path}: {exc}")
            continue

        if actual_bytes != expected_bytes:
            errors.append(
                f"{rel_name} size mismatch: expected {expected_bytes} bytes, got {actual_bytes} bytes."
            )
        if actual_sha != expected_sha.lower():
            errors.append(
                f"{rel_name} SHA-256 mismatch: expected {expected_sha.lower()}, got {actual_sha}."
            )

        verified.append(
            {
                "file": rel_name,
                "expectedBytes": expected_bytes,
                "actualBytes": actual_bytes,
                "sha256Match": actual_sha == expected_sha.lower(),
            }
        )

    dup_files = [name for name, count in Counter(declared_files).items() if count > 1]
    if dup_files:
        errors.append(f"Duplicate generatedArtifacts entries: {sorted(dup_files)}")

    missing_expected = sorted(EXPECTED_GENERATED_ARTIFACTS - set(declared_files))
    if missing_expected:
        errors.append(
            f"Missing expected files in generatedArtifacts: {missing_expected}"
        )

    if errors:
        return _make_check(
            check_name,
            False,
            f"Generated artifact manifest validation failed ({len(errors)} issue(s)).",
            {"errors": errors, "artifacts": verified},
        )

    return _make_check(
        check_name,
        True,
        f"All {len(verified)} generatedArtifacts match declared sizes and SHA-256 digests.",
        {"artifacts": verified},
    )


def _check_staged_volumes(
    runtime_dir: Path,
) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    checks: list[dict[str, Any]] = []
    parsed_manifests: dict[str, dict[str, Any]] = {}
    expected_fdi_set = set(EXPECTED_FDI_CODES)

    if not runtime_dir.is_dir():
        checks.append(
            _make_check(
                "staged_volumes.manifests",
                False,
                f"Staged runtime directory not found: {runtime_dir}",
            )
        )
        for fdi in EXPECTED_FDI_CODES:
            checks.append(
                _make_check(
                    f"staged_volume.fdi{fdi}",
                    False,
                    f"Cannot verify FDI {fdi} volume because staged runtime directory is missing.",
                )
            )
        return checks, parsed_manifests

    discovered_paths = sorted(runtime_dir.glob("fdi*-volume-field-manifest.klabdata"))
    expected_manifest_names = {
        f"fdi{fdi}-volume-field-manifest.klabdata" for fdi in EXPECTED_FDI_CODES
    }
    discovered_names = {path.name for path in discovered_paths}

    manifest_errors: list[str] = []
    missing_manifests = sorted(expected_manifest_names - discovered_names)
    unexpected_manifests = sorted(discovered_names - expected_manifest_names)
    if missing_manifests:
        manifest_errors.append(
            f"Missing staged FDI volume manifest(s): {missing_manifests}"
        )
    if unexpected_manifests:
        manifest_errors.append(
            f"Unexpected staged FDI volume manifest(s): {unexpected_manifests}"
        )

    seen_fdis: list[str] = []
    seen_case_ids: list[str] = []
    seen_bin_files: list[str] = []

    for manifest_path in discovered_paths:
        try:
            raw_text = manifest_path.read_text(encoding="utf-8")
            manifest = json.loads(raw_text)
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            manifest_errors.append(
                f"Failed to parse {manifest_path.name} as UTF-8 JSON: {exc}"
            )
            continue

        if not isinstance(manifest, dict):
            manifest_errors.append(f"{manifest_path.name} does not contain a JSON object.")
            continue

        fdi = manifest.get("fdi")
        case_id = manifest.get("caseId")
        bin_file = manifest.get("file")

        if not isinstance(fdi, str) or not fdi.strip():
            manifest_errors.append(f"{manifest_path.name} has missing/invalid 'fdi'.")
            continue
        seen_fdis.append(fdi)

        expected_manifest_for_fdi = f"fdi{fdi}-volume-field-manifest.klabdata"
        if manifest_path.name != expected_manifest_for_fdi:
            manifest_errors.append(
                f"{manifest_path.name} declares fdi={fdi!r}; expected filename {expected_manifest_for_fdi}."
            )

        if not isinstance(case_id, str) or not case_id.strip():
            manifest_errors.append(f"{manifest_path.name} has missing/invalid 'caseId'.")
        else:
            seen_case_ids.append(case_id)

        if not isinstance(bin_file, str) or not bin_file.strip():
            manifest_errors.append(f"{manifest_path.name} has missing/invalid 'file'.")
        else:
            seen_bin_files.append(bin_file)
            expected_bin = f"fdi{fdi}-volume-field.bin"
            if bin_file != expected_bin:
                manifest_errors.append(
                    f"{manifest_path.name} declares file={bin_file!r}; expected {expected_bin!r}."
                )

        if fdi in parsed_manifests:
            manifest_errors.append(f"Duplicate FDI {fdi!r} across volume manifests.")
        else:
            parsed_manifests[fdi] = manifest

    dup_fdis = sorted(fdi for fdi, count in Counter(seen_fdis).items() if count > 1)
    dup_cases = sorted(cid for cid, count in Counter(seen_case_ids).items() if count > 1)
    dup_bins = sorted(fn for fn, count in Counter(seen_bin_files).items() if count > 1)
    if dup_fdis:
        manifest_errors.append(f"Duplicate FDI IDs: {dup_fdis}")
    if dup_cases:
        manifest_errors.append(f"Duplicate caseIds across volume manifests: {dup_cases}")
    if dup_bins:
        manifest_errors.append(f"Duplicate binary filenames across volume manifests: {dup_bins}")

    actual_fdi_set = set(seen_fdis)
    if actual_fdi_set != expected_fdi_set:
        manifest_errors.append(
            f"FDI set mismatch: expected {sorted(expected_fdi_set)}, got {sorted(actual_fdi_set)}."
        )

    if manifest_errors:
        checks.append(
            _make_check(
                "staged_volumes.manifests",
                False,
                f"Staged FDI manifest validation failed ({len(manifest_errors)} issue(s)).",
                {
                    "expectedFdis": list(EXPECTED_FDI_CODES),
                    "discoveredManifests": [p.name for p in discovered_paths],
                    "errors": manifest_errors,
                },
            )
        )
    else:
        checks.append(
            _make_check(
                "staged_volumes.manifests",
                True,
                f"All 6 staged FDI volume manifests present with unique IDs for FDIs {','.join(EXPECTED_FDI_CODES)}.",
                {
                    "fdis": sorted(actual_fdi_set),
                    "caseIds": sorted(seen_case_ids),
                    "manifests": [p.name for p in discovered_paths],
                },
            )
        )

    for fdi in EXPECTED_FDI_CODES:
        check_name = f"staged_volume.fdi{fdi}"
        manifest = parsed_manifests.get(fdi)
        if manifest is None:
            checks.append(
                _make_check(
                    check_name,
                    False,
                    f"Missing or unparseable staged manifest for FDI {fdi}.",
                    {"expectedManifest": f"fdi{fdi}-volume-field-manifest.klabdata"},
                )
            )
            continue

        vol_errors: list[str] = []
        bin_name = manifest.get("file")
        expected_bin_name = f"fdi{fdi}-volume-field.bin"
        if bin_name != expected_bin_name:
            vol_errors.append(
                f"Manifest file field {bin_name!r} does not match expected {expected_bin_name!r}."
            )

        sample_count = manifest.get("sampleCount")
        if not _is_int(sample_count) or sample_count <= 0:
            vol_errors.append(f"Invalid sampleCount: {sample_count!r}")

        channels = manifest.get("channels")
        if (
            not isinstance(channels, list)
            or not channels
            or not all(isinstance(ch, str) and ch.strip() for ch in channels)
        ):
            vol_errors.append(f"Invalid channels list: {channels!r}")

        layout = manifest.get("layout", "")
        if isinstance(layout, str) and layout and "float32" not in layout.lower():
            vol_errors.append(f"Unexpected layout {layout!r}; expected float32.")

        field_sha = manifest.get("fieldSHA256")
        if not isinstance(field_sha, str) or len(field_sha) != 64:
            vol_errors.append(f"Invalid fieldSHA256: {field_sha!r}")

        if not isinstance(bin_name, str) or not bin_name.strip():
            checks.append(
                _make_check(
                    check_name,
                    False,
                    f"Manifest for FDI {fdi} lacks a valid binary filename.",
                    {"errors": vol_errors},
                )
            )
            continue

        bin_path = runtime_dir / bin_name
        if not _is_within_directory(bin_path, runtime_dir):
            vol_errors.append(f"Binary path escapes runtime directory: {bin_name}")
        elif not bin_path.is_file():
            vol_errors.append(f"Missing adjacent binary volume file: {bin_path}")
        else:
            try:
                actual_sha, actual_bytes = _sha256_and_size_file(bin_path)
            except OSError as exc:
                vol_errors.append(f"Failed reading {bin_path}: {exc}")
            else:
                if _is_int(sample_count) and sample_count > 0 and isinstance(channels, list) and channels:
                    expected_bytes = sample_count * len(channels) * FLOAT32_BYTES
                    if actual_bytes != expected_bytes:
                        vol_errors.append(
                            f"Size mismatch for {bin_name}: expected {expected_bytes} bytes "
                            f"({sample_count} samples * {len(channels)} channels * {FLOAT32_BYTES} bytes), "
                            f"got {actual_bytes} bytes."
                        )
                if isinstance(field_sha, str) and len(field_sha) == 64:
                    if actual_sha != field_sha.lower():
                        vol_errors.append(
                            f"SHA-256 mismatch for {bin_name}: expected {field_sha.lower()}, got {actual_sha}."
                        )

                if not vol_errors:
                    checks.append(
                        _make_check(
                            check_name,
                            True,
                            f"{bin_name} validated ({actual_bytes} bytes, {sample_count}x{len(channels)} float32, SHA-256 ok).",
                            {
                                "fdi": fdi,
                                "caseId": manifest.get("caseId"),
                                "file": bin_name,
                                "bytes": actual_bytes,
                                "sampleCount": sample_count,
                                "channelCount": len(channels),
                                "fieldSHA256": actual_sha,
                            },
                        )
                    )
                    continue

        checks.append(
            _make_check(
                check_name,
                False,
                f"FDI {fdi} volume validation failed ({len(vol_errors)} issue(s)).",
                {"fdi": fdi, "file": bin_name, "errors": vol_errors},
            )
        )

    return checks, parsed_manifests


def _check_schema_totals(
    bundle_manifest: dict[str, Any] | None,
    browser_index: dict[str, Any] | None,
) -> dict[str, Any]:
    check_name = "schema_totals.learner_and_developer"
    if bundle_manifest is None or browser_index is None:
        return _make_check(
            check_name,
            False,
            "Cannot validate learner/developer totals because bundle manifest or browser index failed to load.",
        )

    errors: list[str] = []

    coverage = bundle_manifest.get("catalogCoverage")
    total_records = bundle_manifest.get("totalRecords")
    materials_catalog = bundle_manifest.get("materialsCatalog")

    if not isinstance(coverage, dict) or not all(
        isinstance(k, str) and _is_int(v) and v >= 0 for k, v in coverage.items()
    ):
        errors.append("curriculum-bundle-manifest.json catalogCoverage is missing or invalid.")
        coverage = {}

    if not _is_int(total_records) or total_records < 0:
        errors.append(f"curriculum-bundle-manifest.json totalRecords is invalid: {total_records!r}")
        total_records = None

    if coverage and total_records is not None and sum(coverage.values()) != total_records:
        errors.append(
            f"Bundle catalogCoverage sum ({sum(coverage.values())}) != totalRecords ({total_records})."
        )

    materials_count = None
    if not isinstance(materials_catalog, dict) or not _is_int(materials_catalog.get("count")):
        errors.append("curriculum-bundle-manifest.json materialsCatalog.count is missing or invalid.")
    else:
        materials_count = materials_catalog["count"]

    if browser_index.get("kind") != "KLINIKLAB_LEARNING_LIBRARY_INDEX":
        errors.append(f"Unexpected browser index kind: {browser_index.get('kind')!r}")

    summary = browser_index.get("summary")
    if not isinstance(summary, dict):
        errors.append("curriculum-browser-index.json summary is missing or invalid.")
        summary = {}

    declared_learner = summary.get("learnerVisibleItems")
    declared_dev = summary.get("developerOnlyParityProbes")
    declared_materials = summary.get("materialsInventoryItems")

    for field_name, val in (
        ("summary.learnerVisibleItems", declared_learner),
        ("summary.developerOnlyParityProbes", declared_dev),
        ("summary.materialsInventoryItems", declared_materials),
    ):
        if not _is_int(val) or val < 0:
            errors.append(f"curriculum-browser-index.json {field_name} is invalid: {val!r}")

    if (
        materials_count is not None
        and _is_int(declared_materials)
        and declared_materials != materials_count
    ):
        errors.append(
            f"Browser index materialsInventoryItems ({declared_materials}) != "
            f"bundle manifest materialsCatalog.count ({materials_count})."
        )

    categories = browser_index.get("categories")
    if not isinstance(categories, list) or not categories:
        errors.append("curriculum-browser-index.json categories must be a non-empty list.")
        categories = []

    actual_learner_count = 0
    actual_dev_count = 0
    category_ids: list[str] = []
    category_summary: list[dict[str, Any]] = []

    for idx, cat in enumerate(categories):
        if not isinstance(cat, dict):
            errors.append(f"categories[{idx}] is not an object.")
            continue

        cat_id = cat.get("id")
        audience = cat.get("audience")
        default_visible = cat.get("defaultVisible")
        declared_count = cat.get("count")
        items = cat.get("items")

        if not isinstance(cat_id, str) or not cat_id.strip():
            errors.append(f"categories[{idx}] has missing/invalid id.")
        else:
            category_ids.append(cat_id)

        if not _is_int(declared_count) or declared_count < 0:
            errors.append(f"Category {cat_id!r} has invalid count: {declared_count!r}")
        if not isinstance(items, list):
            errors.append(f"Category {cat_id!r} items must be a list.")
            continue

        if _is_int(declared_count) and len(items) != declared_count:
            errors.append(
                f"Category {cat_id!r} count ({declared_count}) != len(items) ({len(items)})."
            )

        item_kinds = {
            item.get("recordKind") for item in items if isinstance(item, dict)
        }
        if audience == "learner":
            if default_visible is not True:
                errors.append(
                    f"Learner category {cat_id!r} must have defaultVisible=true, got {default_visible!r}."
                )
            if "parity_probe" in item_kinds:
                errors.append(
                    f"Learner category {cat_id!r} contains developer-only parity_probe records."
                )
            actual_learner_count += len(items)
        elif audience == "developer":
            if default_visible is not False:
                errors.append(
                    f"Developer category {cat_id!r} must have defaultVisible=false, got {default_visible!r}."
                )
            non_parity = sorted(k for k in item_kinds if k != "parity_probe")
            if non_parity:
                errors.append(
                    f"Developer category {cat_id!r} contains non-parity_probe kinds: {non_parity}."
                )
            actual_dev_count += len(items)
        else:
            errors.append(
                f"Category {cat_id!r} has unexpected audience {audience!r}; expected 'learner' or 'developer'."
            )

        category_summary.append(
            {
                "id": cat_id,
                "audience": audience,
                "defaultVisible": default_visible,
                "count": len(items),
            }
        )

    dup_cats = sorted(cid for cid, count in Counter(category_ids).items() if count > 1)
    if dup_cats:
        errors.append(f"Duplicate category IDs in browser index: {dup_cats}")

    if _is_int(declared_learner) and actual_learner_count != declared_learner:
        errors.append(
            f"Learner-visible items sum ({actual_learner_count}) != summary.learnerVisibleItems ({declared_learner})."
        )
    if _is_int(declared_dev) and actual_dev_count != declared_dev:
        errors.append(
            f"Developer-only items sum ({actual_dev_count}) != summary.developerOnlyParityProbes ({declared_dev})."
        )

    bundle_parity = coverage.get("parity_probe")
    if bundle_parity is not None and _is_int(declared_dev) and declared_dev != bundle_parity:
        errors.append(
            f"Browser index developerOnlyParityProbes ({declared_dev}) != "
            f"bundle catalogCoverage.parity_probe ({bundle_parity})."
        )

    if (
        total_records is not None
        and bundle_parity is not None
        and _is_int(declared_learner)
        and declared_learner != (total_records - bundle_parity)
    ):
        errors.append(
            f"Browser index learnerVisibleItems ({declared_learner}) != "
            f"bundle totalRecords - parity_probe ({total_records - bundle_parity})."
        )

    if (
        total_records is not None
        and (actual_learner_count + actual_dev_count) != total_records
    ):
        errors.append(
            f"Browser index total items ({actual_learner_count + actual_dev_count}) != "
            f"bundle totalRecords ({total_records})."
        )

    if errors:
        return _make_check(
            check_name,
            False,
            f"Learner/developer schema totals check failed ({len(errors)} issue(s)).",
            {"errors": errors, "categories": category_summary},
        )

    return _make_check(
        check_name,
        True,
        f"Learner-visible ({actual_learner_count}) and developer-only ({actual_dev_count}) "
        f"totals match bundle ({total_records}) and index schemas.",
        {
            "learnerVisibleItems": actual_learner_count,
            "developerOnlyParityProbes": actual_dev_count,
            "totalRecords": total_records,
            "materialsInventoryItems": declared_materials,
            "categories": category_summary,
        },
    )


def _record_signature(
    rec_id: str,
    kind: Any,
    case_id: Any,
    phase_id: Any,
    title: Any,
    source_file: Any,
    source_pointer: Any,
) -> tuple[str, Any, Any, Any, Any, Any, Any]:
    return (rec_id, kind, case_id, phase_id, title, source_file, source_pointer)


def _check_internal_consistency(
    parsed_docs: dict[str, dict[str, Any]],
    volume_manifests: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    check_name = "internal_consistency.counts_and_ids"
    required_docs = (
        "curriculum-bundle-manifest",
        "curriculum-catalog",
        "curriculum-row-index",
        "curriculum-browser-index",
        "ui-locales",
    )
    missing_docs = [name for name in required_docs if name not in parsed_docs]
    if missing_docs:
        return _make_check(
            check_name,
            False,
            f"Cannot verify internal consistency; missing parsed JSON docs: {missing_docs}",
        )

    bundle = parsed_docs["curriculum-bundle-manifest"]
    catalog = parsed_docs["curriculum-catalog"]
    row_index = parsed_docs["curriculum-row-index"]
    browser_index = parsed_docs["curriculum-browser-index"]
    locales = parsed_docs["ui-locales"]

    errors: list[str] = []

    if catalog.get("kind") != "KLINIKLAB_UNREAL_CURRICULUM_CATALOG":
        errors.append(f"Unexpected catalog kind: {catalog.get('kind')!r}")
    if row_index.get("kind") != "KLINIKLAB_CURRICULUM_ROW_INDEX":
        errors.append(f"Unexpected row-index kind: {row_index.get('kind')!r}")
    if locales.get("kind") != "KLINIKLAB_UI_LOCALIZATION":
        errors.append(f"Unexpected ui-locales kind: {locales.get('kind')!r}")

    expected_sha = bundle.get("sourceSnapshotGitSHA")
    if not isinstance(expected_sha, str) or not expected_sha.strip():
        errors.append("Bundle manifest sourceSnapshotGitSHA is missing or invalid.")
    else:
        for doc_name, doc in (
            ("curriculum-catalog", catalog),
            ("curriculum-row-index", row_index),
            ("curriculum-browser-index", browser_index),
        ):
            if doc.get("sourceSnapshotGitSHA") != expected_sha:
                errors.append(
                    f"{doc_name} sourceSnapshotGitSHA ({doc.get('sourceSnapshotGitSHA')!r}) != "
                    f"bundle ({expected_sha!r})."
                )
        for fdi, vol_manifest in sorted(volume_manifests.items()):
            if vol_manifest.get("sourceGitSHA") != expected_sha:
                errors.append(
                    f"fdi{fdi}-volume-field-manifest.klabdata sourceGitSHA "
                    f"({vol_manifest.get('sourceGitSHA')!r}) != bundle ({expected_sha!r})."
                )

    coverage = bundle.get("catalogCoverage")
    if not isinstance(coverage, dict):
        errors.append("Bundle catalogCoverage missing.")
        coverage = {}

    if catalog.get("recordCounts") != coverage:
        errors.append("curriculum-catalog.json recordCounts does not match bundle catalogCoverage.")
    if row_index.get("recordCounts") != coverage:
        errors.append("curriculum-row-index.json recordCounts does not match bundle catalogCoverage.")

    # Catalog records
    catalog_records = catalog.get("records")
    catalog_map: dict[str, tuple[Any, ...]] = {}
    catalog_kind_counts: Counter[str] = Counter()
    catalog_volumes: dict[str, dict[str, Any]] = {}

    if not isinstance(catalog_records, list):
        errors.append("curriculum-catalog.json records must be a list.")
    else:
        seen_ids: list[str] = []
        for idx, rec in enumerate(catalog_records):
            if not isinstance(rec, dict):
                errors.append(f"catalog.records[{idx}] is not an object.")
                continue
            rec_id = rec.get("id")
            rec_kind = rec.get("recordKind")
            if not isinstance(rec_id, str) or not rec_id.strip():
                errors.append(f"catalog.records[{idx}] has missing/empty id.")
                continue
            seen_ids.append(rec_id)
            if isinstance(rec_kind, str):
                catalog_kind_counts[rec_kind] += 1
            catalog_map[rec_id] = _record_signature(
                rec_id,
                rec_kind,
                rec.get("caseId"),
                rec.get("phaseId"),
                rec.get("title"),
                rec.get("sourceFile"),
                rec.get("sourcePointer"),
            )
            if rec_kind == "editable_case_volume":
                payload = rec.get("payload")
                if isinstance(payload, dict) and isinstance(payload.get("fdi"), str):
                    catalog_volumes[payload["fdi"]] = {
                        "caseId": rec.get("caseId"),
                        "payload": payload,
                    }

        dup_cat_ids = sorted(rid for rid, cnt in Counter(seen_ids).items() if cnt > 1)
        if dup_cat_ids:
            errors.append(f"Duplicate IDs in curriculum-catalog.json: {dup_cat_ids[:10]}")

        if dict(catalog_kind_counts) != coverage:
            errors.append(
                f"Actual recordKind counts in catalog ({dict(catalog_kind_counts)}) != "
                f"bundle catalogCoverage ({coverage})."
            )

    # Row-index records
    row_records = row_index.get("records")
    row_map: dict[str, tuple[Any, ...]] = {}
    row_kind_counts: Counter[str] = Counter()

    if not isinstance(row_records, list):
        errors.append("curriculum-row-index.json records must be a list.")
    else:
        seen_row_names: list[str] = []
        for idx, rec in enumerate(row_records):
            if not isinstance(rec, dict):
                errors.append(f"row_index.records[{idx}] is not an object.")
                continue
            row_name = rec.get("row_name")
            rec_kind = rec.get("record_kind")
            if not isinstance(row_name, str) or not row_name.strip():
                errors.append(f"row_index.records[{idx}] has missing/empty row_name.")
                continue
            seen_row_names.append(row_name)
            if isinstance(rec_kind, str):
                row_kind_counts[rec_kind] += 1
            row_map[row_name] = _record_signature(
                row_name,
                rec_kind,
                rec.get("case_id"),
                rec.get("phase_id"),
                rec.get("title"),
                rec.get("source_file"),
                rec.get("source_pointer"),
            )

        dup_row_ids = sorted(rid for rid, cnt in Counter(seen_row_names).items() if cnt > 1)
        if dup_row_ids:
            errors.append(f"Duplicate row_name IDs in curriculum-row-index.json: {dup_row_ids[:10]}")

        if dict(row_kind_counts) != coverage:
            errors.append(
                f"Actual record_kind counts in row index ({dict(row_kind_counts)}) != "
                f"bundle catalogCoverage ({coverage})."
            )

    # Browser-index items
    browser_map: dict[str, tuple[Any, ...]] = {}
    browser_kind_counts: Counter[str] = Counter()
    categories = browser_index.get("categories")
    category_title_keys: list[str] = []

    if isinstance(categories, list):
        seen_browser_ids: list[str] = []
        for cat in categories:
            if not isinstance(cat, dict):
                continue
            title_key = cat.get("titleKey")
            if isinstance(title_key, str) and title_key.strip():
                category_title_keys.append(title_key)
            else:
                errors.append(f"Browser category {cat.get('id')!r} missing valid titleKey.")
            items = cat.get("items")
            if not isinstance(items, list):
                continue
            for item in items:
                if not isinstance(item, dict):
                    errors.append(f"Non-object item in browser category {cat.get('id')!r}.")
                    continue
                item_id = item.get("id")
                item_kind = item.get("recordKind")
                if not isinstance(item_id, str) or not item_id.strip():
                    errors.append(f"Missing/empty item id in browser category {cat.get('id')!r}.")
                    continue
                seen_browser_ids.append(item_id)
                if isinstance(item_kind, str):
                    browser_kind_counts[item_kind] += 1
                browser_map[item_id] = _record_signature(
                    item_id,
                    item_kind,
                    item.get("caseId"),
                    item.get("phaseId"),
                    item.get("title"),
                    item.get("sourceFile"),
                    item.get("sourcePointer"),
                )

        dup_browser_ids = sorted(
            rid for rid, cnt in Counter(seen_browser_ids).items() if cnt > 1
        )
        if dup_browser_ids:
            errors.append(
                f"Duplicate item IDs in curriculum-browser-index.json: {dup_browser_ids[:10]}"
            )

        if dict(browser_kind_counts) != coverage:
            errors.append(
                f"Actual recordKind counts in browser index ({dict(browser_kind_counts)}) != "
                f"bundle catalogCoverage ({coverage})."
            )

    # Cross-file ID set and record metadata consistency
    if catalog_map and row_map:
        only_cat = sorted(set(catalog_map) - set(row_map))
        only_row = sorted(set(row_map) - set(catalog_map))
        if only_cat or only_row:
            errors.append(
                f"ID mismatch between catalog and row index (only in catalog: {only_cat[:5]}, only in row index: {only_row[:5]})."
            )
        else:
            mismatched = [
                rid for rid in catalog_map if catalog_map[rid] != row_map[rid]
            ]
            if mismatched:
                errors.append(
                    f"Metadata mismatch between catalog and row index for IDs: {mismatched[:5]}"
                )

    if catalog_map and browser_map:
        only_cat = sorted(set(catalog_map) - set(browser_map))
        only_browser = sorted(set(browser_map) - set(catalog_map))
        if only_cat or only_browser:
            errors.append(
                f"ID mismatch between catalog and browser index (only in catalog: {only_cat[:5]}, only in browser index: {only_browser[:5]})."
            )
        else:
            mismatched = [
                rid for rid in catalog_map if catalog_map[rid] != browser_map[rid]
            ]
            if mismatched:
                errors.append(
                    f"Metadata mismatch between catalog and browser index for IDs: {mismatched[:5]}"
                )

    # Editable case volume records vs staged volume manifests
    if set(catalog_volumes) != set(EXPECTED_FDI_CODES):
        errors.append(
            f"Catalog editable_case_volume FDIs {sorted(catalog_volumes)} != expected {list(EXPECTED_FDI_CODES)}."
        )
    else:
        for fdi in EXPECTED_FDI_CODES:
            vol_manifest = volume_manifests.get(fdi)
            if vol_manifest is None:
                continue
            cat_entry = catalog_volumes[fdi]
            payload = cat_entry["payload"]
            if cat_entry["caseId"] != vol_manifest.get("caseId"):
                errors.append(
                    f"FDI {fdi} caseId mismatch: catalog {cat_entry['caseId']!r} != manifest {vol_manifest.get('caseId')!r}."
                )
            if payload.get("file") != vol_manifest.get("file"):
                errors.append(
                    f"FDI {fdi} file mismatch: catalog {payload.get('file')!r} != manifest {vol_manifest.get('file')!r}."
                )
            if payload.get("sha256") != vol_manifest.get("fieldSHA256"):
                errors.append(
                    f"FDI {fdi} sha256 mismatch: catalog {payload.get('sha256')!r} != manifest {vol_manifest.get('fieldSHA256')!r}."
                )
            if (
                "toothClass" in vol_manifest
                and payload.get("toothClass") != vol_manifest.get("toothClass")
            ):
                errors.append(
                    f"FDI {fdi} toothClass mismatch: catalog {payload.get('toothClass')!r} != manifest {vol_manifest.get('toothClass')!r}."
                )

    # UI locales consistency
    locale_langs_raw = locales.get("supportedLanguages")
    locale_lang_ids: list[str] = []
    if not isinstance(locale_langs_raw, list) or not locale_langs_raw:
        errors.append("ui-locales.json supportedLanguages must be a non-empty list.")
    else:
        for entry in locale_langs_raw:
            if isinstance(entry, dict) and isinstance(entry.get("id"), str) and entry["id"].strip():
                locale_lang_ids.append(entry["id"])
            else:
                errors.append(f"Invalid supportedLanguages entry in ui-locales.json: {entry!r}")

    if locales.get("defaultLanguage") != browser_index.get("defaultLanguage"):
        errors.append(
            f"defaultLanguage mismatch: ui-locales ({locales.get('defaultLanguage')!r}) != "
            f"browser index ({browser_index.get('defaultLanguage')!r})."
        )
    if locale_lang_ids and browser_index.get("supportedLanguages") != locale_lang_ids:
        errors.append(
            f"supportedLanguages mismatch: ui-locales ({locale_lang_ids}) != "
            f"browser index ({browser_index.get('supportedLanguages')!r})."
        )

    strings_map = locales.get("strings")
    if not isinstance(strings_map, dict) or not strings_map:
        errors.append("ui-locales.json strings must be a non-empty object.")
    else:
        missing_title_keys = sorted(
            key for key in set(category_title_keys) if key not in strings_map
        )
        if missing_title_keys:
            errors.append(
                f"Browser category titleKey(s) missing from ui-locales.json: {missing_title_keys}"
            )
        for str_key, translations in strings_map.items():
            if not isinstance(translations, dict):
                errors.append(f"ui-locales.json strings[{str_key!r}] must be an object.")
                continue
            for lang_id in locale_lang_ids:
                val = translations.get(lang_id)
                if not isinstance(val, str) or not val.strip():
                    errors.append(
                        f"ui-locales.json strings[{str_key!r}] missing non-empty text for language {lang_id!r}."
                    )

    if errors:
        return _make_check(
            check_name,
            False,
            f"Internal consistency validation failed ({len(errors)} issue(s)).",
            {"errors": errors},
        )

    return _make_check(
        check_name,
        True,
        f"All {len(catalog_map)} IDs, counts, snapshot SHAs ({expected_sha[:12]}), "
        f"volume links, and UI locales are internally consistent.",
        {
            "recordCount": len(catalog_map),
            "sourceSnapshotGitSHA": expected_sha,
            "supportedLanguages": locale_lang_ids,
            "localeKeys": len(strings_map) if isinstance(strings_map, dict) else 0,
        },
    )


def run_verification(project_root: Path) -> dict[str, Any]:
    resolved_root = project_root.resolve()
    generated_dir = resolved_root / "CurriculumSource" / "Generated"
    runtime_dir = resolved_root / "Content" / "KlinikLab" / "CurriculumRuntime"

    checks: list[dict[str, Any]] = []
    checks.append(_check_project_paths(resolved_root, generated_dir, runtime_dir))

    pair_checks, parsed_docs = _check_staged_json_pairs(generated_dir, runtime_dir)
    checks.extend(pair_checks)

    bundle_manifest = parsed_docs.get("curriculum-bundle-manifest")
    browser_index = parsed_docs.get("curriculum-browser-index")

    checks.append(_check_generated_artifacts(bundle_manifest, generated_dir))

    volume_checks, volume_manifests = _check_staged_volumes(runtime_dir)
    checks.extend(volume_checks)

    checks.append(_check_schema_totals(bundle_manifest, browser_index))
    checks.append(_check_internal_consistency(parsed_docs, volume_manifests))

    passed_count = sum(1 for c in checks if c["passed"])
    failed_count = len(checks) - passed_count
    overall_passed = failed_count == 0

    return {
        "status": "PASS" if overall_passed else "FAIL",
        "passed": overall_passed,
        "projectRoot": str(resolved_root),
        "summary": {
            "totalChecks": len(checks),
            "passedChecks": passed_count,
            "failedChecks": failed_count,
        },
        "checks": checks,
    }


def _print_human_report(report: dict[str, Any]) -> None:
    print(f"Project root: {report['projectRoot']}")
    for check in report["checks"]:
        print(f"[{check['status']}] {check['name']}: {check['message']}")
        if not check["passed"]:
            details = check.get("details") or {}
            errors = details.get("errors")
            if isinstance(errors, list):
                for err in errors:
                    print(f"       - {err}")
            elif details:
                for key, value in details.items():
                    print(f"       {key}: {value}")
    summary = report["summary"]
    print(
        f"Result: {report['status']} "
        f"({summary['passedChecks']}/{summary['totalChecks']} checks passed, "
        f"{summary['failedChecks']} failed)"
    )


def _build_arg_parser() -> argparse.ArgumentParser:
    default_root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(
        description=(
            "Read-only verification of KlinikLab generated curriculum data "
            "and staged Unreal runtime .klabdata / binary volume artifacts."
        )
    )
    parser.add_argument(
        "--project-root",
        type=Path,
        default=default_root,
        help=f"Unreal project root directory (default: {default_root})",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print machine-readable JSON report instead of human-readable text.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_arg_parser()
    args = parser.parse_args(argv)
    report = run_verification(args.project_root)

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        _print_human_report(report)

    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
