"""Fetch the author-collected CC BY 4.0 release from Mendeley Data."""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import os
import re
import threading
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DATASET_ID = "h5pxbsdz4m"
VERSION = 1
ATTRIBUTION = (
    "Alves, João (2026), Recyclable Waste Image Dataset, Mendeley Data, V1, "
    "doi:10.17632/h5pxbsdz4m.1, CC BY 4.0. Only author-collected images are included."
)
BASE = "https://data.mendeley.com/public-api/datasets"
MAX_BYTES = 1_800_000_000
LOCK = threading.Lock()
COMPLETED = 0


def _get_json(url: str) -> Any:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.mendeley-public-dataset.1+json",
            "User-Agent": "Waste2WattAI-LocalDatasetPrep/1.0",
        },
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _safe_component(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", value).strip("._") or "image"


def build_manifest() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    snapshot = _get_json(f"{BASE}/{DATASET_ID}/snapshot/{VERSION}")
    if snapshot.get("id") != DATASET_ID or snapshot.get("version") != VERSION:
        raise RuntimeError("Unexpected dataset identity or version")
    if snapshot.get("licence", {}).get("short_name") != "CC BY 4.0":
        raise RuntimeError("Dataset license changed; refusing download")
    if "Only the images collected by the author are included" not in snapshot.get(
        "description", ""
    ):
        raise RuntimeError("Author-collected-only provenance changed; refusing download")

    folders = _get_json(f"{BASE}/{DATASET_ID}/folders/{VERSION}")
    materials = {"Cardboard", "Glass", "Metal", "Paper", "Plastic"}
    images: list[dict[str, Any]] = []
    for folder in folders:
        material = folder.get("name")
        if material not in materials:
            continue
        url = f"{BASE}/{DATASET_ID}/files?" + urllib.parse.urlencode(
            {
                "folder_id": folder["id"],
                "version": VERSION,
                "$start": 0,
                "$limit": 1000,
            }
        )
        for item in _get_json(url):
            filename = str(item.get("filename", ""))
            details = item.get("content_details", {})
            if Path(filename).suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                continue
            size = item.get("size")
            digest = details.get("sha256_hash")
            file_id = item.get("id")
            if (
                not isinstance(size, int)
                or size <= 0
                or size > 100_000_000
                or not isinstance(digest, str)
                or not re.fullmatch(r"[0-9a-f]{64}", digest)
                or not isinstance(file_id, str)
            ):
                raise RuntimeError(f"Invalid publisher metadata for {filename!r}")
            images.append(
                {
                    "datasetId": DATASET_ID,
                    "version": VERSION,
                    "fileId": file_id,
                    "filename": filename,
                    "material": material,
                    "siteGroup": "CWMF" if filename.startswith("CWMF_") else "UHW",
                    "sizeBytes": size,
                    "sha256": digest,
                    "downloadUrl": (
                        f"https://data.mendeley.com/public-files/datasets/{DATASET_ID}/"
                        f"files/{file_id}/file_downloaded"
                    ),
                }
            )
    if not images or sum(row["sizeBytes"] for row in images) > MAX_BYTES:
        raise RuntimeError("Dataset file list is empty or exceeds the local size guard")
    # Avoid accidental collisions while keeping the original file names in metadata.
    seen: set[tuple[str, str]] = set()
    for row in images:
        key = (row["material"], row["filename"])
        if key in seen:
            row["filename"] = f"{row['fileId']}_{row['filename']}"
        seen.add(key)
    return snapshot, sorted(images, key=lambda row: (row["material"], row["filename"]))


def download_one(row: dict[str, Any], destination: Path) -> dict[str, Any]:
    global COMPLETED
    class_dir = destination / _safe_component(row["material"])
    class_dir.mkdir(parents=True, exist_ok=True)
    target = class_dir / _safe_component(row["filename"])
    if target.exists() and target.stat().st_size == row["sizeBytes"]:
        if _sha256(target) == row["sha256"]:
            return {**row, "relativePath": target.relative_to(ROOT).as_posix(), "cached": True}
    partial = target.with_suffix(target.suffix + ".part")
    request = urllib.request.Request(
        row["downloadUrl"],
        headers={"User-Agent": "Waste2WattAI-LocalDatasetPrep/1.0"},
    )
    digest = hashlib.sha256()
    count = 0
    try:
        with urllib.request.urlopen(request, timeout=120) as response, partial.open("wb") as out:
            content_length = response.headers.get("Content-Length")
            if content_length and int(content_length) != row["sizeBytes"]:
                raise RuntimeError(f"Publisher size mismatch for {row['filename']}")
            while block := response.read(1024 * 1024):
                count += len(block)
                if count > row["sizeBytes"] or count > 100_000_000:
                    raise RuntimeError(f"Download exceeded declared size for {row['filename']}")
                digest.update(block)
                out.write(block)
        if count != row["sizeBytes"] or digest.hexdigest() != row["sha256"]:
            raise RuntimeError(f"Publisher checksum mismatch for {row['filename']}")
        os.replace(partial, target)
    finally:
        partial.unlink(missing_ok=True)
    with LOCK:
        COMPLETED += 1
        if COMPLETED % 50 == 0:
            print(f"Verified {COMPLETED} image files", flush=True)
    return {**row, "relativePath": target.relative_to(ROOT).as_posix(), "cached": False}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()
    if not 1 <= args.workers <= 6:
        parser.error("--workers must be between 1 and 6")
    snapshot, rows = build_manifest()
    total = sum(row["sizeBytes"] for row in rows)
    print(
        f"Dataset {DATASET_ID} v{VERSION}: {len(rows)} image files, "
        f"{total} bytes, license {snapshot['licence']['short_name']}",
        flush=True,
    )
    target = ROOT / "data" / "raw" / "recyclable-waste-mendeley-v1"
    target.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = [executor.submit(download_one, row, target) for row in rows]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())
    results.sort(key=lambda row: (row["material"], row["filename"]))
    manifest = {
        "datasetId": DATASET_ID,
        "version": VERSION,
        "doi": snapshot["doi"],
        "title": snapshot["name"],
        "license": snapshot["licence"]["short_name"],
        "attribution": ATTRIBUTION,
        "sourceUrl": f"https://data.mendeley.com/datasets/{DATASET_ID}/{VERSION}",
        "classes": sorted({row["material"] for row in results}),
        "imageCount": len(results),
        "totalBytes": total,
        "images": [
            {key: value for key, value in row.items() if key != "downloadUrl"} for row in results
        ],
    }
    (target / "dataset_manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (target / "ATTRIBUTION.txt").write_text(
        f"{ATTRIBUTION}\n{manifest['sourceUrl']}\n"
        "https://creativecommons.org/licenses/by/4.0/\n"
        "Technical transformations: files are decoded and resized for training; "
        "source originals remain unmodified.\n",
        encoding="utf-8",
    )
    print(f"Downloaded and verified {len(results)} images to {target}", flush=True)


if __name__ == "__main__":
    main()
