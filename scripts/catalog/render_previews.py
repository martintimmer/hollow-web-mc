#!/usr/bin/env python3
"""Prepare changed catalog preview jobs for the browser renderer.

The actual three.js rendering is intentionally performed by the browser-facing
catalog renderer so it uses the same materials and geometry as the game.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[2]
CATALOG_DIR = ROOT / "public" / "catalog"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--write-job", action="store_true")
    parser.add_argument("--base-url", default="http://127.0.0.1:5450")
    parser.add_argument("--prepare-only", action="store_true")
    args = parser.parse_args()
    manifest_path = CATALOG_DIR / "runtime-manifest.json"
    report_path = CATALOG_DIR / "catalog-change-report.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    report = json.loads(report_path.read_text(encoding="utf-8"))
    ids = [int(row["id"]) for row in manifest.get("entries", [])] if args.all else [int(value) for value in report.get("changedIds", [])]
    job = {
        "schemaVersion": 1,
        "rendererVersion": manifest.get("rendererVersion"),
        "catalogRevision": manifest.get("catalogRevision"),
        "ids": ids,
        "views": ["inventory", "held", "placed"],
        "outputRoot": "/catalog/previews",
    }
    job_path = CATALOG_DIR / "preview-job.json"
    job_path.write_text(json.dumps(job, indent=2) + "\n", encoding="utf-8")
    print(f"preview jobs: {len(ids)} IDs queued")
    if args.write_job or args.prepare_only or not ids:
        return 0
    command = [
        "node",
        str(ROOT / "scripts" / "catalog" / "render_previews.mjs"),
        "--base-url", args.base_url,
        "--job", str(job_path),
    ]
    subprocess.run(command, cwd=ROOT, check=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
