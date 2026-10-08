# Local image research pipeline

This folder contains a reproducible CPU-only baseline pipeline. It does not provision
SageMaker, make AWS calls, or supply scan classifications to the hosted application.
Raw licensed images and derived weights/manifests remain ignored under `data/raw`
and `data/processed` on E:.

After dataset download, run from the repository root in PowerShell:

```powershell
$env:PYTHONPATH = "ml/src"
& .\.venv\Scripts\python.exe -B ml\scripts\prepare_and_train.py
```

The script verifies source attribution/license metadata, applies EXIF orientation,
resizes decoded RGB images, hashes cleaned files, removes exact duplicates (and
conflicting-label duplicates), creates seeded class/source-group stratified train,
validation and test splits, trains a 3-nearest-neighbor visual baseline, and writes
`dataset.json`, `model.json` and held-out `evaluation.json` into the ignored processed
directory. A local-only prediction helper is available through
`waste2watt_ml.pipeline.predict_image`; its result status is
`LOCAL_RESEARCH_PREDICTION` and must not be presented as a verified scan result.

The baseline uses normalized RGB histograms, a grayscale thumbnail and a difference
hash. It is intended as an executable end-to-end benchmark, not as a competitive or
production-grade vision model. It has only five material classes, lacks organic,
textile and e-waste labels, and its public release does not expose capture-session
identifiers. A held-out score on these source images does not establish field accuracy.
