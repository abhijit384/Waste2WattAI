"""Deterministic cleaning, leakage-aware grouping and lightweight k-NN model."""

from __future__ import annotations

import hashlib
import json
import math
import random
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps

from .features import DESCRIPTOR_VERSION, extract_features

SPLIT_SEED = "waste2watt-phase6-2026-01"
SPLITS = ("train", "validation", "test")
MATERIALS = ("Cardboard", "Glass", "Metal", "Paper", "Plastic")


def clean_and_split(raw_dir: Path, processed_dir: Path) -> dict[str, Any]:
    raw_root = raw_dir.resolve()
    source = json.loads((raw_dir / "dataset_manifest.json").read_text(encoding="utf-8"))
    if source.get("license") != "CC BY 4.0" or source.get("imageCount", 0) <= 0:
        raise ValueError("A reviewed, attributed source dataset is required")
    records: list[dict[str, Any]] = []
    invalid: list[dict[str, str]] = []
    for row in source["images"]:
        label = row["material"]
        if label not in MATERIALS:
            invalid.append({"fileId": row["fileId"], "reason": "unsupported_label"})
            continue
        try:
            path = Path(row["relativePath"])
            if not path.is_absolute():
                path = Path(__file__).resolve().parents[3] / path
            path = path.resolve()
            path.relative_to(raw_root)
            with Image.open(path) as image:
                image.verify()
            with Image.open(path) as image:
                cleaned = ImageOps.exif_transpose(image).convert("RGB")
                cleaned.thumbnail((512, 512), Image.Resampling.LANCZOS)
                safe_name = hashlib.sha256(row["fileId"].encode()).hexdigest()
                output = processed_dir / "images" / label / f"{safe_name}.jpg"
                output.parent.mkdir(parents=True, exist_ok=True)
                cleaned.save(output, format="JPEG", quality=90, optimize=True)
            sha256 = _sha256(output)
            records.append(
                {
                    "fileId": row["fileId"],
                    "material": label,
                    "siteGroup": row["siteGroup"],
                    "sourceSha256": row["sha256"],
                    "cleanSha256": sha256,
                    "path": output.relative_to(processed_dir).as_posix(),
                    "source": "Mendeley h5pxbsdz4m v1",
                }
            )
        except (OSError, ValueError, Image.DecompressionBombError) as error:
            invalid.append({"fileId": row["fileId"], "reason": type(error).__name__})

    # Exact duplicate bytes with conflicting labels are excluded rather than guessed.
    by_hash: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in records:
        by_hash[row["cleanSha256"]].append(row)
    clean_records: list[dict[str, Any]] = []
    duplicates: list[dict[str, Any]] = []
    for group in by_hash.values():
        labels = {row["material"] for row in group}
        if len(labels) > 1:
            duplicates.extend(
                {"fileId": row["fileId"], "reason": "duplicate_conflicting_labels"} for row in group
            )
            continue
        group.sort(key=lambda row: row["fileId"])
        clean_records.append(group[0])
        duplicates.extend(
            {"fileId": row["fileId"], "reason": "exact_duplicate"} for row in group[1:]
        )

    source_counts = Counter(row["siteGroup"] for row in clean_records)
    if len(source_counts) < 2:
        raise ValueError("At least two publisher source groups are required for a held-out test")
    held_out_group = min(source_counts, key=lambda group: (source_counts[group], group))
    train_validation: list[dict[str, Any]] = []
    for row in clean_records:
        row["split"] = "test" if row["siteGroup"] == held_out_group else "train"
        if row["split"] != "test":
            train_validation.append(row)

    buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in train_validation:
        buckets[row["material"]].append(row)
    for key, bucket in buckets.items():
        rng = random.Random(f"{SPLIT_SEED}:{key}")
        bucket.sort(key=lambda row: hashlib.sha256(row["fileId"].encode()).hexdigest())
        rng.shuffle(bucket)
        n = len(bucket)
        n_validation = max(1, round(n * 0.15)) if n >= 4 else 0
        validation_start = n - n_validation
        for index, row in enumerate(bucket):
            row["split"] = "train" if index < validation_start else "validation"

    output = {
        "sourceDatasetId": source["datasetId"],
        "sourceVersion": source["version"],
        "license": source["license"],
        "attribution": source["attribution"],
        "seed": SPLIT_SEED,
        "splitMethod": (
            f"publisher source group {held_out_group!r} held out entirely for test; "
            "remaining images deterministically stratified by material into train/validation; "
            "exact decoded duplicates removed"
        ),
        "limitations": [
            "Only five labeled material classes are represented.",
            "Validation splits may contain related views because session IDs were not published.",
            "The release has fewer files than its stated 1,000-image total.",
        ],
        "counts": {
            "accepted": len(clean_records),
            "excluded": len(invalid) + len(duplicates),
            "invalid": invalid,
            "duplicates": duplicates,
            "bySplit": dict(Counter(row["split"] for row in clean_records)),
            "byClass": {
                split: dict(
                    Counter(row["material"] for row in clean_records if row["split"] == split)
                )
                for split in SPLITS
            },
        },
        "records": sorted(clean_records, key=lambda row: (row["split"], row["fileId"])),
    }
    processed_dir.mkdir(parents=True, exist_ok=True)
    (processed_dir / "dataset.json").write_text(
        json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return output


def train_and_evaluate(
    dataset: dict[str, Any], processed_dir: Path, candidates: tuple[int, ...] = (1, 3, 5)
) -> dict[str, Any]:
    if not candidates or any(k < 1 or k % 2 == 0 for k in candidates):
        raise ValueError("k candidates must be positive odd numbers")
    rows = dataset["records"]
    train = [row for row in rows if row["split"] == "train"]
    validation = [row for row in rows if row["split"] == "validation"]
    test = [row for row in rows if row["split"] == "test"]
    if not train or not test or not validation:
        raise ValueError("Training, validation, and test data are all required")

    feature_cache: dict[str, list[float]] = {}
    for row in rows:
        feature_cache[row["fileId"]] = extract_features(processed_dir / row["path"])
    trainable_candidates = sorted({k for k in candidates if k <= len(train)})
    if not trainable_candidates:
        raise ValueError("No k candidate fits the training split")
    model = {
        "modelType": "k_nearest_neighbors",
        "modelVersion": "1.0.0",
        "descriptorVersion": DESCRIPTOR_VERSION,
        "k": trainable_candidates[0],
        "distance": "euclidean_on_normalized_color_and_luminance_features",
        "labels": list(MATERIALS),
        "trainingRows": [
            {"label": row["material"], "features": feature_cache[row["fileId"]]} for row in train
        ],
        "sourceDataset": "Mendeley Data h5pxbsdz4m version 1, CC BY 4.0",
        "attribution": dataset["attribution"],
    }
    candidate_metrics = []
    for candidate in trainable_candidates:
        trial_model = {**model, "k": candidate}
        predictions = [
            _predict_one(feature_cache[row["fileId"]], trial_model) for row in validation
        ]
        candidate_metrics.append((candidate, _metrics(validation, predictions)))
    selected_k, validation_metrics = max(
        candidate_metrics, key=lambda item: (item[1]["macroF1"], -item[0])
    )
    model["k"] = selected_k
    test_predictions = [_predict_one(feature_cache[row["fileId"]], model) for row in test]
    evaluation = {
        "dataset": dataset["sourceDatasetId"],
        "seed": dataset["seed"],
        "splitCounts": dataset["counts"]["bySplit"],
        "validation": validation_metrics,
        "selectedK": selected_k,
        "selectionMetric": "validation_macro_f1",
        "candidateValidationMacroF1": {
            str(candidate): metrics["macroF1"] for candidate, metrics in candidate_metrics
        },
        "test": _metrics(test, test_predictions),
        "classLabels": list(MATERIALS),
        "limitations": [
            "Results describe only the held-out split of this small author-collected dataset.",
            "The data are not representative of all waste streams or locations.",
            "Paper and cardboard map to one coarse application category.",
            "This model is not deployed and must not be used to report sustainability impacts.",
        ],
    }
    model["validationMetrics"] = evaluation["validation"]
    (processed_dir / "model.json").write_text(
        json.dumps(model, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (processed_dir / "evaluation.json").write_text(
        json.dumps(evaluation, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return evaluation


def predict_image(image_path: Path, model_path: Path) -> dict[str, Any]:
    model = json.loads(model_path.read_text(encoding="utf-8"))
    if model.get("descriptorVersion") != DESCRIPTOR_VERSION:
        raise ValueError("Unsupported descriptor version")
    return _predict_one(extract_features(image_path), model)


def _predict_one(feature: list[float], model: dict[str, Any]) -> dict[str, Any]:
    neighbors: list[tuple[float, str]] = []
    for row in model["trainingRows"]:
        distance = math.sqrt(
            sum((a - b) ** 2 for a, b in zip(feature, row["features"], strict=True))
        )
        neighbors.append((distance, row["label"]))
    nearest = sorted(neighbors)[: model["k"]]
    votes = Counter(label for _, label in nearest)
    best = sorted(
        votes, key=lambda label: (-votes[label], min(d for d, item in nearest if item == label))
    )[0]
    distances = sorted(distance for distance, _ in nearest)
    return {
        "label": best,
        "status": "LOCAL_RESEARCH_PREDICTION",
        "nearestDistance": round(distances[0], 6),
        "limitations": ["Experimental local-only model; not used by hosted scans."],
    }


def _metrics(rows: list[dict[str, Any]], predictions: list[dict[str, Any]]) -> dict[str, Any]:
    matrix = {label: {column: 0 for column in MATERIALS} for label in MATERIALS}
    for row, prediction in zip(rows, predictions, strict=True):
        matrix[row["material"]][prediction["label"]] += 1
    precision: dict[str, float] = {}
    recall: dict[str, float] = {}
    f1: dict[str, float] = {}
    support: dict[str, int] = {}
    for label in MATERIALS:
        support[label] = sum(matrix[label].values())
        tp = matrix[label][label]
        fp = sum(matrix[actual][label] for actual in MATERIALS if actual != label)
        fn = sum(matrix[label][predicted] for predicted in MATERIALS if predicted != label)
        precision[label] = tp / (tp + fp) if tp + fp else 0.0
        recall[label] = tp / (tp + fn) if tp + fn else 0.0
        f1[label] = (
            2 * precision[label] * recall[label] / (precision[label] + recall[label])
            if precision[label] + recall[label]
            else 0.0
        )
    count = len(rows)
    correct = sum(matrix[label][label] for label in MATERIALS)
    represented = [label for label in MATERIALS if support[label] > 0]
    return {
        "sampleCount": count,
        "accuracy": correct / count if count else 0.0,
        "macroAveraging": "classes_with_true_test_support",
        "representedClasses": represented,
        "unrepresentedClasses": [label for label in MATERIALS if support[label] == 0],
        "macroPrecision": (
            sum(precision[label] for label in represented) / len(represented)
            if represented
            else 0.0
        ),
        "macroRecall": (
            sum(recall[label] for label in represented) / len(represented) if represented else 0.0
        ),
        "macroF1": (
            sum(f1[label] for label in represented) / len(represented) if represented else 0.0
        ),
        "perClass": {
            label: {
                "support": support[label],
                "precision": precision[label] if support[label] else None,
                "recall": recall[label] if support[label] else None,
                "f1": f1[label] if support[label] else None,
            }
            for label in MATERIALS
        },
        "confusionMatrix": matrix,
    }


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()
