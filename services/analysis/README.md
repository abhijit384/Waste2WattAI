# Analysis service

Phase 5A contains a server-only Python Bedrock Converse adapter, safe image preprocessing,
strict classification validation, deterministic recovery/impact functions and owned-scan
persistence. It is prepared locally, not deployed. Inference defaults off.

Real multimodal adapters are implemented for Gemini 3.6 Flash, Groq Qwen 3.8 27B,
OpenRouter Dots `:free`, and Gemini 3.5 Flash, in that fallback order after the
separately gated Bedrock primary. They use bounded HTTPS requests and the shared
classification schema. The scan form now submits the external-processing flag by
default and shows a processing notice; this does not override the backend's
fail-closed provider eligibility or zero-cost checks. The owner confirmed the three
external accounts are on free plans and rotated the keys stored in the ignored
backend `.env.local`; values are never reported. A bounded local test fell through
Gemini 3.6 (timeout), Groq (HTTP 403), and Dots (invalid schema) before Gemini 3.5
returned a valid structured result. Remaining quota is not pre-queried; quota/model
errors can fall through to the next eligible free model.

For local configuration, preserve `.env.local` in this directory and use `.env.example`
as the template for missing flags. It is ignored by Git and loaded by the local Python
handler without printing values. The deployed Lambda uses the `EXTERNAL_AI_SECRET_ARN`
Secrets Manager reference and does not read this local file. Set free/non-billable
account confirmations only after checking those account settings. See
[the provider policy](../../docs/AI_PROVIDER_FREE_ONLY.md).

CDK keeps paid inference and Bedrock disabled. Production free-only settings and the
private runtime secret are part of the authorized deployment currently being
prepared; until deployment and a production check complete, the live backend must be
treated as not configured for external-provider fallback.

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
