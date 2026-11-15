#!/usr/bin/env python3
"""Create the learner-facing Unreal library manifest from the pinned index."""

from __future__ import annotations

import json
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_INDEX = (
    PROJECT_ROOT
    / "Content"
    / "KlinikLab"
    / "CurriculumRuntime"
    / "curriculum-browser-index.klabdata"
)
OUTPUT = (
    PROJECT_ROOT
    / "Saved"
    / "CodexTakeover"
    / "learning-library"
    / "manifest.json"
)

CATEGORY_TITLES = {
    "cases": "Cases",
    "stations": "Learning stations",
    "instruments": "Instruments and tools",
    "practical_tasks": "Practical tasks",
    "knowledge_checks": "Knowledge checks",
    "guided_pathways": "Guided pathways",
    "fsp_kp_practice": "FSP/KP practice",
    "synthetic_models": "Synthetic models",
}


def build_manifest() -> dict:
    index = json.loads(SOURCE_INDEX.read_text(encoding="utf-8"))
    visible_categories = []
    items = []

    for category in index.get("categories", []):
        if category.get("audience") != "learner" or not category.get(
            "defaultVisible", False
        ):
            continue

        category_id = category["id"]
        category_title = CATEGORY_TITLES.get(category_id)
        if not category_title:
            raise ValueError(f"No English UI label is defined for {category_id!r}")

        category_items = category.get("items", [])
        visible_categories.append(
            {"id": category_id, "title": category_title, "count": len(category_items)}
        )
        for item in category_items:
            items.append(
                {
                    "id": item["id"],
                    "category": category_id,
                    "categoryTitle": category_title,
                    "title": item["title"],
                    "status": "catalog_only",
                    "sourceFile": item.get("sourceFile", ""),
                    "sourcePointer": item.get("sourcePointer", ""),
                }
            )

    expected_visible = index.get("summary", {}).get("learnerVisibleItems")
    expected_hidden = index.get("summary", {}).get("developerOnlyParityProbes")
    ids = [item["id"] for item in items]
    if len(items) != expected_visible:
        raise ValueError(f"Learner item count changed: expected {expected_visible}, got {len(items)}")
    if len(ids) != len(set(ids)):
        raise ValueError("The learner index contains duplicate item IDs")

    return {
        "formatVersion": 1,
        "kind": "KLINIKLAB_UNREAL_LEARNING_LIBRARY_MANIFEST",
        "sourceSnapshotGitSHA": index.get("sourceSnapshotGitSHA", ""),
        "learnerVisibleItems": len(items),
        "excludedDeveloperOnlyParityProbes": expected_hidden,
        "categories": visible_categories,
        "items": items,
    }


def main() -> None:
    manifest = build_manifest()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"Wrote {len(manifest['items'])} learner records in "
        f"{len(manifest['categories'])} categories to {OUTPUT}"
    )


if __name__ == "__main__":
    main()
