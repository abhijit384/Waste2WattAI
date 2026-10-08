"""Prepare the local approved dataset, train, and produce held-out metrics."""

from pathlib import Path

from waste2watt_ml.pipeline import clean_and_split, train_and_evaluate

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw" / "recyclable-waste-mendeley-v1"
PROCESSED = ROOT / "data" / "processed" / "recyclable-waste-mendeley-v1"


def main() -> None:
    manifest = clean_and_split(RAW, PROCESSED)
    metrics = train_and_evaluate(manifest, PROCESSED)
    evaluation_summary = {
        "source": metrics["dataset"],
        "selectedK": metrics["selectedK"],
        "validation": {
            "sampleCount": metrics["validation"]["sampleCount"],
            "accuracy": metrics["validation"]["accuracy"],
            "macroF1": metrics["validation"]["macroF1"],
        },
        "test": {
            "sampleCount": metrics["test"]["sampleCount"],
            "accuracy": metrics["test"]["accuracy"],
            "macroPrecision": metrics["test"]["macroPrecision"],
            "macroRecall": metrics["test"]["macroRecall"],
            "macroF1": metrics["test"]["macroF1"],
            "representedClasses": metrics["test"]["representedClasses"],
            "unrepresentedClasses": metrics["test"]["unrepresentedClasses"],
        },
        "artifacts": ["dataset.json", "model.json", "evaluation.json"],
    }
    print(
        {
            "preparation": {
                "accepted": manifest["counts"]["accepted"],
                "excluded": manifest["counts"]["excluded"],
                "invalid": len(manifest["counts"]["invalid"]),
                "bySplit": manifest["counts"]["bySplit"],
                "byClass": manifest["counts"]["byClass"],
            },
            "evaluation": evaluation_summary,
        },
        flush=True,
    )


if __name__ == "__main__":
    main()
