"""Synthetic-only tests for the local image pipeline; no user or external images."""

import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml/src"))

from waste2watt_ml.pipeline import (  # noqa: E402
    clean_and_split,
    predict_image,
    train_and_evaluate,
)


class LocalMlPipelineTests(unittest.TestCase):
    def test_clean_split_train_and_evaluate_are_reproducible(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as temporary:
            work = Path(temporary)
            raw = work / "raw"
            raw.mkdir()
            source_rows = []
            classes = ["Cardboard", "Glass", "Metal", "Paper", "Plastic"]
            for group_index, group in enumerate(("CWMF", "UHW")):
                for category_index, category in enumerate(classes):
                    folder = raw / category
                    folder.mkdir(exist_ok=True)
                    for index in range(4):
                        file_id = f"{group}-{category}-{index}"
                        path = folder / f"{file_id}.png"
                        shade = (category_index * 40 + index + group_index * 20) % 255
                        Image.new("RGB", (8, 8), (shade, 255 - shade, shade // 2)).save(path)
                        source_rows.append(
                            {
                                "fileId": file_id,
                                "relativePath": path.relative_to(ROOT).as_posix(),
                                "material": category,
                                "siteGroup": group,
                                "sha256": file_id,
                            }
                        )
            (raw / "dataset_manifest.json").write_text(
                json.dumps(
                    {
                        "license": "CC BY 4.0",
                        "imageCount": len(source_rows),
                        "datasetId": "synthetic-test",
                        "version": 1,
                        "attribution": "synthetic test only",
                        "images": source_rows,
                    }
                ),
                encoding="utf-8",
            )
            processed = work / "processed"
            first = clean_and_split(raw, processed)
            second = clean_and_split(raw, processed)
            self.assertEqual(
                [(row["fileId"], row["split"]) for row in first["records"]],
                [(row["fileId"], row["split"]) for row in second["records"]],
            )
            self.assertEqual(first["counts"]["accepted"], 39)
            self.assertEqual(first["counts"]["excluded"], 1)
            self.assertEqual(set(first["counts"]["bySplit"]), {"train", "validation", "test"})
            metrics = train_and_evaluate(first, processed)
            self.assertEqual(metrics["test"]["sampleCount"], 19)
            self.assertEqual(len(metrics["test"]["confusionMatrix"]), 5)
            self.assertTrue((processed / "model.json").is_file())
            self.assertTrue((processed / "evaluation.json").is_file())
            self.assertIn(metrics["selectedK"], (1, 3, 5))
            test_row = next(row for row in first["records"] if row["split"] == "test")
            prediction = predict_image(processed / test_row["path"], processed / "model.json")
            self.assertEqual(prediction["status"], "LOCAL_RESEARCH_PREDICTION")


if __name__ == "__main__":
    unittest.main()
