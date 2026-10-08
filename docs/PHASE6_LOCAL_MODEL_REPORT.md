# Phase 6 local image baseline report

**Run date:** 2026-10-08
**Execution:** local CPU in the E: project virtual environment; no AWS job, endpoint, upload or model call.
**Artifacts:** ignored under `data/processed/recyclable-waste-mendeley-v1/`.

## Data and rights

The run uses João Alves's author-collected _Recyclable Waste Image Dataset_, Mendeley Data V1, DOI `10.17632/h5pxbsdz4m.1`, publisher-listed CC BY 4.0. The publisher API listed 989 JPEG files totaling 1,707,541,468 bytes, although the release description says 1,000 images. All 989 were downloaded with declared size and SHA-256 verification. Attribution and provenance are saved alongside the ignored raw manifest. The intake excluded no invalid decodes; cleaning retained 977 and removed 12 exact duplicate decoded images. No labels were synthesized or class-balanced by duplication.

Publisher source groups were CWMF (250 files) and UHW (739). The smaller CWMF group was held out entirely for test. The remaining group was deterministically stratified by material into train and validation with seed `waste2watt-phase6-2026-01`:

| Split               | Images | Composition                                              |
| ------------------- | -----: | -------------------------------------------------------- |
| Train               |    620 | Cardboard 258, Glass 42, Metal 64, Paper 78, Plastic 178 |
| Validation          |    108 | Cardboard 45, Glass 7, Metal 11, Paper 14, Plastic 31    |
| Test (CWMF holdout) |    249 | Cardboard 126, Glass 0, Metal 15, Paper 4, Plastic 104   |

## Model and evaluation

The CPU baseline is a 3-nearest-neighbor classifier using normalized 16-bin RGB histograms, a 16×16 grayscale thumbnail and an 8×8 difference hash. `k` was selected from 1, 3 and 5 on validation macro-F1. The model is intentionally simple, explainable as a distance/vote baseline, and small enough to run locally. Predictions carry `LOCAL_RESEARCH_PREDICTION`; they are not wired to scan persistence or the hosted product.

| Split                    | Accuracy | Macro precision | Macro recall | Macro-F1 |
| ------------------------ | -------: | --------------: | -----------: | -------: |
| Validation (108)         |   41.67% |          31.81% |       31.50% |   30.73% |
| Held-out CWMF test (249) |   45.38% |          29.93% |       31.49% |   28.15% |

Test macro metrics average only classes with true test support. The holdout contains no Glass examples and just four Paper examples; Glass metrics are null, not zero-filled. This is incomplete class coverage and makes the aggregate score unsuitable as a complete five-class estimate. The modest measured performance does not support production use.

## Limits and next work

The release contains only five coarse material labels and is strongly imbalanced. Its source groups are not equivalent to a broad field evaluation, and session/photographer identifiers are not supplied. Validation may contain related views. Photos do not prove composition, contamination, hazard absence, facility acceptance, recoverable energy or emissions benefit. Paper and cardboard remain separate dataset classes; there is no unsupported label mapping into the production nine-category API.

TrashNet++ is excluded because its stated downstream license is not backed by verifiable original-creator provenance. Original TrashNet's code license does not establish rights to its images. RealWaste is excluded pending clarification of conflicting license claims. TACO remains a per-image rights-audit candidate; no files were downloaded.

No SageMaker resources were created. No trained artifact, raw image, or per-image prediction is committed. A later model effort should acquire a rights-cleared, representative group-held-out field dataset, improve the visual model, define a stable mapping to the API contract, add calibration/human review, and beat an explicit baseline across supported classes before deployment is considered.
