# Analysis service

Phase 5A contains a server-only Python Bedrock Converse adapter, safe image preprocessing,
strict classification validation, deterministic recovery/impact functions and owned-scan
persistence. It is prepared locally, not deployed. Inference defaults off.

The active wire contract is generated `schemas.json`, exported from shared TypeScript
Zod schemas by `node scripts/export-analysis-schema.ts`. Python validates this same
contract rather than using the older Phase 1 `AnalysisRequest`/`AnalysisResult` types.
`service.py` retains only the explicit legacy placeholder for boundary compatibility;
it is not part of the Phase 5 workflow. SageMaker and agents remain deferred.

Install pinned runtime dependencies and Ruff into the project `.venv` using
`requirements-dev.txt`, with pip cache on E:. Run Python unittest and Ruff from that
environment. `scripts/prepare-analysis.ps1` prepares Linux Python 3.12 x86_64 wheels
inside `infra/.analysis-package` for opt-in local CDK synthesis. Include the project
`.venv/Scripts` in PATH for `npm run check`.

See [model review](../../docs/PHASE5_BEDROCK.md), [scientific factors](../../docs/PHASE5_SCIENTIFIC_FACTORS.md),
[cost review](../../docs/PHASE5_COST_REVIEW.md) and [deployment gates](../../docs/PHASE5_DEPLOYMENT_PLAN.md).
