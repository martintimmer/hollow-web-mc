#!/usr/bin/env python3
"""Validate the generated catalog manifest and preview contract."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[2]


def load(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-previews", action="store_true")
    args = parser.parse_args()
    manifest_path = ROOT / "public" / "catalog" / "runtime-manifest.json"
    manifest = load(manifest_path)
    entries = manifest.get("entries")
    errors: list[str] = []
    if manifest.get("schemaVersion") != 1:
        errors.append("unsupported schemaVersion")
    if not isinstance(entries, list):
        errors.append("entries is not a list")
        entries = []

    ids = []
    for row in entries:
        numeric_id = row.get("id") if isinstance(row, dict) else None
        if not isinstance(numeric_id, int) or numeric_id <= 0:
            errors.append(f"invalid ID: {numeric_id!r}")
            continue
        ids.append(numeric_id)
        if not str(row.get("name", "")).strip():
            errors.append(f"ID {numeric_id} has no name")
        if row.get("kind") in ("block", "custom-asset"):
            images = row.get("images")
            if not isinstance(images, dict):
                errors.append(f"ID {numeric_id} has no images object")
                continue
            for view in ("inventory", "held", "placed"):
                value = images.get(view)
                if not isinstance(value, str) or not value:
                    errors.append(f"ID {numeric_id} missing {view} image")
                elif urlparse(value).scheme == "" and args.require_previews:
                    image_path = ROOT / "public" / value.lstrip("/")
                    if not image_path.is_file() or image_path.stat().st_size == 0:
                        errors.append(f"ID {numeric_id} missing preview file: {image_path}")

    if len(ids) != len(set(ids)):
        errors.append("duplicate numeric IDs")
    counts = manifest.get("counts", {})
    expected = {
        "total": len(entries),
        "standard": sum(row.get("source") == "registry" for row in entries),
        "customAssets": sum(row.get("source") == "custom-asset" for row in entries),
        "placeable": sum(row.get("kind") in ("block", "custom-asset") for row in entries),
        "items": sum(row.get("kind") == "item" for row in entries),
    }
    for key, value in expected.items():
        if counts.get(key) != value:
            errors.append(f"counts.{key}={counts.get(key)!r}, expected {value}")
    if errors:
        print("catalog check: FAIL")
        print("\n".join(f"- {error}" for error in errors))
        return 1
    print(f"catalog check: PASS ({len(entries)} entries, {counts.get('customAssets', 0)} custom)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
