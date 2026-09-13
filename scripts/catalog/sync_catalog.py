#!/usr/bin/env python3
"""Build the browser-readable blocks catalog manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
PUBLIC_CATALOG = ROOT / "public" / "catalog"
MANIFEST_PATH = PUBLIC_CATALOG / "runtime-manifest.json"
REPORT_PATH = PUBLIC_CATALOG / "catalog-change-report.json"
RENDERER_VERSION = "catalog-preview-v1"


def read_json(path: Path, fallback: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return fallback


def stable_hash(value: Any) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return "sha256:" + hashlib.sha256(raw).hexdigest()


def atomic_write(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def fetch_custom_assets(base_url: str) -> list[dict[str, Any]]:
    candidates = [base_url]
    if "5450" in base_url:
        candidates.append("http://127.0.0.1:5400")
    for b in candidates:
        url = b.rstrip("/") + "/api/custom-assets"
        try:
            with urllib.request.urlopen(url, timeout=8) as response:
                payload = json.loads(response.read().decode("utf-8"))
            assets = payload.get("assets", []) if isinstance(payload, dict) else []
            if isinstance(assets, list) and assets:
                return assets
        except (OSError, urllib.error.URLError, json.JSONDecodeError):
            continue
    return []


def kb_status(kb: dict[str, Any], name: str) -> dict[str, Any] | None:
    lowered = name.lower()
    for key, entry in kb.items():
        if not key.startswith("blocks/") or not isinstance(entry, dict):
            continue
        title = str(entry.get("title", "")).lower()
        if title and (lowered == title or title in lowered or lowered in title):
            return {"path": entry.get("path"), "status": entry.get("status")}
    return None


def standard_rows(registry: list[dict[str, Any]], shapes: dict[str, Any], kb: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for source in registry:
        if not isinstance(source, dict):
            continue
        numeric_id = int(source.get("id", 0))
        if numeric_id <= 0:
            continue
        row = dict(source)
        row["id"] = numeric_id
        row["kind"] = "item" if not any(key in row for key in ("side", "top")) else "block"
        row["source"] = "registry"
        row["shape"] = shapes.get(str(numeric_id), "item" if row["kind"] == "item" else "cube")
        row["kb"] = kb_status(kb, str(row.get("name", "")))
        row["images"] = {
            "inventory": f"/catalog/previews/{numeric_id}/inventory.png",
            "held": f"/catalog/previews/{numeric_id}/held.png",
            "placed": f"/catalog/previews/{numeric_id}/placed.png",
        }
        row["sourceFingerprint"] = stable_hash({
            "renderer": RENDERER_VERSION,
            "row": {key: row.get(key) for key in (
                "id", "name", "category", "side", "top", "bottom", "solid", "trans",
                "stair", "slab", "fence", "glow", "itemTexture", "textureFiles",
            )},
            "shape": row["shape"],
        })
        rows.append(row)
    return rows


def custom_rows(assets: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for asset in assets:
        numeric_id = int(asset.get("id", 0))
        if numeric_id <= 0:
            continue
        placement = asset.get("placement") if isinstance(asset.get("placement"), dict) else {}
        row = {
            "id": numeric_id,
            "name": str(asset.get("name") or asset.get("prompt") or f"Imported asset {numeric_id}"),
            "prompt": str(asset.get("prompt") or ""),
            "category": "decoration",
            "kind": "custom-asset",
            "source": "custom-asset",
            "shape": "3d",
            "customAssetId": numeric_id,
            "filename": asset.get("filename"),
            "mimeType": asset.get("mimeType"),
            "size": asset.get("size"),
            "dimensions": asset.get("dimensions"),
            "triangles": asset.get("triangles"),
            "placement": {
                "width": int(placement.get("width", 1)),
                "height": int(placement.get("height", 1)),
                "scale": int(placement.get("scale", 100)),
            },
            "images": {
                "inventory": f"/catalog/previews/{numeric_id}/inventory.png",
                "held": f"/catalog/previews/{numeric_id}/held.png",
                "placed": f"/catalog/previews/{numeric_id}/placed.png",
            },
        }
        row["sourceFingerprint"] = stable_hash({"renderer": RENDERER_VERSION, "row": row})
        rows.append(row)
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=os.environ.get("CATALOG_BASE_URL", "http://127.0.0.1:5450"))
    parser.add_argument("--allow-missing-api", action="store_true")
    args = parser.parse_args()

    registry = read_json(ROOT / "catalog" / "completeRegistry.json", [])
    shapes = read_json(ROOT / "catalog" / "block-shapes.json", {})
    kb = read_json(ROOT / "kb" / "index.json", {})
    old = read_json(MANIFEST_PATH, {})
    assets = fetch_custom_assets(args.base_url)
    if not assets and not args.allow_missing_api:
        print(f"catalog sync: custom asset API unavailable or empty at {args.base_url}; continuing with registry only")

    rows = standard_rows(registry if isinstance(registry, list) else [], shapes if isinstance(shapes, dict) else {}, kb if isinstance(kb, dict) else {})
    rows.extend(custom_rows(assets))
    rows.sort(key=lambda row: int(row["id"]))

    ids = [row["id"] for row in rows]
    if len(ids) != len(set(ids)):
        raise SystemExit("catalog sync: duplicate numeric IDs detected")

    standard_count = sum(row["source"] == "registry" for row in rows)
    custom_count = sum(row["source"] == "custom-asset" for row in rows)
    placeable_count = sum(row["kind"] == "block" or row["kind"] == "custom-asset" for row in rows)
    item_count = len(rows) - placeable_count
    revision = stable_hash([row["sourceFingerprint"] for row in rows])
    previous_rows = {int(row["id"]): row for row in old.get("entries", [])} if isinstance(old, dict) else {}
    current_rows = {int(row["id"]): row for row in rows}
    changed = sorted([numeric_id for numeric_id, row in current_rows.items() if previous_rows.get(numeric_id, {}).get("sourceFingerprint") != row["sourceFingerprint"]])
    removed = sorted([numeric_id for numeric_id in previous_rows if numeric_id not in current_rows])

    manifest = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "catalogRevision": revision,
        "rendererVersion": RENDERER_VERSION,
        "counts": {"total": len(rows), "standard": standard_count, "placeable": placeable_count, "items": item_count, "customAssets": custom_count},
        "entries": rows,
    }
    report = {
        "generatedAt": manifest["generatedAt"],
        "catalogRevision": revision,
        "changedIds": changed,
        "removedIds": removed,
        "changedCount": len(changed),
        "removedCount": len(removed),
    }
    atomic_write(MANIFEST_PATH, manifest)
    atomic_write(REPORT_PATH, report)
    print(f"catalog sync: {len(rows)} entries, {custom_count} custom, {len(changed)} changed, {len(removed)} removed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
