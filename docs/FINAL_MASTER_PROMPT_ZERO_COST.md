# WASTE2WATT AI — FINAL MASTER PROMPT

## CRITICAL ZERO-COST EXTERNAL AI OVERRIDE — 2026-10-09

This rule supersedes any conflicting provider, testing, spending, or deployment instruction elsewhere in this plan. External AI inference must cost exactly USD 0. Bedrock stays the primary provider only when authorized under existing AWS spending rules. The current external model sequence is Gemini 3.6 Flash, Groq Qwen 3.8 27B, OpenRouter Dots3-Note Preview `:free`, then Gemini 3.5 Flash. Each requires exact-model support, confirmed free account/non-billable safeguards, and external-data consent; remaining quota need not be pre-queried. xAI Grok remains disabled unless an independently verified zero-cost API entitlement is found. There is no paid external testing allowance.

Current documented review:

- Google documents stable vision and structured-output support for `gemini-3.6-flash` and `gemini-3.5-flash`, with zero Standard Free Tier token pricing. This account's billing tier, eligibility and quotas are unverified.
- Groq documents vision and JSON Schema support for `qwen/qwen3.8-27b`, but its Developer tier has nonzero token prices. Do not use unless this account is verified Free-tier-only with the exact model entitlement/quota and no paid request path.
- OpenRouter's exact `dots-studio/dots-3-note-preview:free` vision model is publicly listed at zero prompt/completion price with structured-output support and a December 31, 2026 sunset. This account's eligibility and quota are unverified.
- xAI's public API is token-priced; no permanent free API entitlement was found. Set status to SKIPPED_NO_FREE_MODEL.
- None of these providers is currently verified usable for this account. No provider key is configured in the local process/user/machine environment and no model smoke test has been made.

The original attachment contained plaintext third-party API keys. They are redacted from this project copy, must be treated as exposed, and must be revoked/rotated. Never reuse them or place replacement keys in chat, source, frontend variables, tests or logs.

All external model adapters must call the local fail-closed policy gate with fresh zero-price catalog data, account free eligibility, a free-only billing check, quota status and explicit external-processing consent. Unknown or nonzero price, missing key, stale metadata, exhausted quota, absent consent, timeout ambiguity or provider unavailability means skip that provider; if none qualify, return ANALYSIS_UNAVAILABLE. Never route to an unrestricted model alias or paid base model. No model invocation, external key setup, AWS deployment, billing change or resource creation is authorized by this plan update alone.

## Complete Development, Multi-Provider AI, AWS Deployment and Hackathon Submission

You are the Principal Software Engineer, AWS Cloud Architect, AI/ML Engineer, AI Agent Engineer, DevOps Engineer, Security Engineer, QA Engineer, Sustainability Researcher and Product Designer responsible for completing **Waste2Watt AI**.

This is the final comprehensive engineering instruction.

Your mission is to finish the existing project, implement a production-quality four-provider AI fallback system, integrate real waste image recognition, complete all achievable remaining phases, deploy verified functionality and prepare a credible AWS hackathon submission.

**DO NOT REBUILD THE PROJECT FROM SCRATCH.**

**DO NOT STOP AFTER WRITING A PLAN. ACTUALLY IMPLEMENT, TEST AND DEPLOY.**

Work autonomously through routine engineering tasks. Request intervention only for genuine external blockers, unbounded expenses, destructive changes or actions outside the authorization below.

---

# 1. PROJECT INFORMATION

Project: Waste2Watt AI

Tagline: Turning Waste Intelligence into Energy Decisions

Project directory:

`E:\Waste2WattAI`

GitHub:

`https://github.com/abhijit384/Waste2WattAI`

Main branch: `main`

Live application:

`https://main.d1kq8pn2nvv063.amplifyapp.com`

API Gateway:

`https://c2ntcib53m.execute-api.us-east-1.amazonaws.com`

AWS profile: `waste2watt-dev`

AWS account: `415150458314`

AWS region: `us-east-1`

Environment: `dev`

Use the existing non-root `waste2watt-developer` identity.

Never deploy to another AWS account.

Keep the repository, datasets, Python environments, caches, checkpoints and training outputs on E: wherever possible.

---

# 2. ACTUAL CURRENT PROJECT STATUS

The application already has:

- React, Vite and TypeScript frontend.
- AWS Amplify hosting.
- Cognito signup, email verification and authentication.
- API Gateway and Lambda.
- Private S3 uploads.
- DynamoDB persistence.
- EventBridge and Step Functions.
- SQS and CloudWatch.
- Scan/history pages.
- Dashboard.
- Digital Waste Twin frontend.
- Deterministic scenario simulator.
- Sustainability Advisor interface.
- Recovery recommendation engine.
- Scientific environmental factor framework.
- Prepared Bedrock Nova Lite integration.
- Basic custom ML dataset pipeline.
- Experimental local waste classifier.
- Test suites and documentation.

The last reported validation passed 110 automated tests.

The last reported Git commit was:

`b042e5b8a8da30ddfb7491341f34b9dcaef32e39`

The application is hosted, but **real AI inference is not yet operational**.

## Known blockers

### Bedrock

Amazon Nova Lite:

`amazon.nova-lite-v1:0`

Bedrock reports:

`NOT_AUTHORIZED`

Actual invocation returned:

`Operation not allowed`

The Lambda runtime permissions and account-level model restrictions require further verification.

Do not repeatedly call the blocked model.

### Existing AI flag

Inference was intentionally disabled.

Inspect the actual deployed settings before changing them.

### Custom classifier

The experimental model achieved approximately:

- Accuracy: 45.38%
- Macro-F1: 28.15%

These results are inadequate for production deployment.

The holdout dataset also has class-coverage limitations.

Do not represent the model as production-ready.

### Scientific estimates

Unverified numeric factors are disabled.

Do not generate fictional energy or carbon numbers.

### SQS

The last reported backlog was 22 messages.

Do not purge, replay or delete them without separate authorization.

### Live acceptance

The newer Digital Twin, Simulator, Advisor and other Phase 7–8 screens still require final user-device acceptance.

Inspect the current repository and deployment state rather than assuming any of the above is unchanged.

---

# 3. PRIMARY OBJECTIVE — MULTI-PROVIDER AI

Implement the following authorization-gated priority:

**1. Amazon Bedrock — Primary**

**2. Google Gemini — First and final external fallback** (`gemini-3.6-flash` first; `gemini-3.5-flash` last)

**3. Groq — next free-tier candidate** (`qwen/qwen3.8-27b`, only if the account Free tier is proven)

**4. OpenRouter — Final fallback** (`dots-studio/dots-3-note-preview:free` only)

xAI Grok is excluded unless its exact free API entitlement is independently verified.

The system must remain functional when any individual AI provider is unavailable.

If Bedrock remains blocked, use Gemini only after exact-model support, account free tier/non-billable state, current zero prices, and explicit external-processing consent are verified; do not block solely because remaining quota cannot be queried.

After Gemini 3.6 fails, try Groq Qwen only if this account has a verified Free-only plan and the exact model is eligible; its Developer-tier token prices are nonzero. Provider quota errors may fall through.

If Groq is unavailable, try only OpenRouter `dots-studio/dots-3-note-preview:free` after zero pricing, account eligibility, and consent are verified. Disable model/provider paid fallbacks. Gemini 3.5 Flash is the final external fallback.

If all providers fail, return an honest unavailable status.

Never fabricate analysis.

---

# 4. SECURE API KEY CONFIGURATION

I have credentials for:

`GEMINI_API_KEY` : [REDACTED — REVOKE AND ROTATE]

`XAI_API_KEY` : [REDACTED — REVOKE AND ROTATE]

`OPENROUTER_API_KEY`: [REDACTED — REVOKE AND ROTATE]

Set up all three providers securely.

## Credential entry

The credentials that appeared in the original attachment have been redacted in this project copy. Treat them as exposed: revoke/rotate them and never reuse them.

Create a PowerShell setup procedure using hidden interactive input to collect the actual keys outside the Codex chat.

Do not require credentials to appear in command arguments, shell history, generated transcripts or repository files.

If locally storing credentials temporarily, use an appropriately protected and Git-ignored file.

Never print, echo, log or repeat a secret.

## Production secrets

Store production credentials in an approved AWS secret store, such as Systems Manager Parameter Store SecureString or Secrets Manager.

Choose a cost-conscious option compatible with the existing architecture.

Use identifiable paths such as:

`/waste2watt/dev/ai/gemini-api-key`

`/waste2watt/dev/ai/xai-api-key`

`/waste2watt/dev/ai/openrouter-api-key`

Never place actual key values in:

- Source code.
- Git commits.
- Frontend bundles.
- Public environment variables.
- CDK templates.
- CloudFormation outputs.
- Logs.
- Test snapshots.
- Documentation.

Grant the WasteIntelligence Lambda least-privilege access to the required secrets.

Cache secrets appropriately within the Lambda execution environment without exposing them.

Support secret rotation.

## Credential checks

Implement safe validation that confirms whether a provider is configured without displaying its key.

Missing credentials should disable that provider gracefully.

Do not crash the entire analysis pipeline because one provider is unconfigured.

At the appropriate setup stage, present the hidden-input PowerShell procedure and continue after credentials are supplied.

---

# 5. AI PROVIDER ARCHITECTURE

Implement a shared provider abstraction.

Suggested structure, adjusted to the existing repository:

- `ai/providers/base.py`
- `ai/providers/bedrock.py`
- `ai/providers/gemini.py`
- `ai/providers/grok.py`
- `ai/providers/openrouter.py`
- `ai/router.py`
- `ai/provider_config.py`
- `ai/provider_errors.py`
- `ai/provider_metrics.py`

Use existing modules where appropriate instead of creating duplicates.

## Common provider contract

Every provider must accept:

- Validated preprocessed image bytes.
- MIME type.
- Waste classification instruction.
- Shared output schema.
- Request correlation ID.
- Timeout and response size limits.

Every provider must return a compatible validated classification.

Provider-specific fields must not leak directly into the application's recovery calculation logic.

## Model selection

Consult current official documentation for each provider.

Choose models that actually support image understanding.

Verify:

- Exact model IDs.
- Input image formats.
- Structured response support.
- API authentication.
- Model availability.
- Rate limits.
- Input/output token pricing.
- Image pricing.
- Request timeouts.
- Data retention and privacy settings.
- Relevant SDK compatibility.

Prefer economical, fast, reliable vision-capable models.

Use current official APIs rather than outdated community examples.

For Gemini, use the supported Google Gen AI API/SDK.

For Groq Qwen, use the documented vision-capable API only under a verified no-payment Free account. xAI Grok stays disabled unless independently verified free.

For OpenRouter, explicitly select a supported vision model and restrict routing to reviewed providers/models rather than an unrestricted automatic model choice.

Keep every model configurable.

Do not hardcode unverified model IDs.

---

# 6. INTELLIGENT FAILOVER ENGINE

Implement production-quality provider routing.

Default order (Bedrock remains controlled by its separate AWS gate; external candidates must pass zero-cost checks):

`bedrock,gemini-3.6-flash,groq-qwen3.8-27b,openrouter-dots-3-note-preview-free,gemini-3.5-flash`

Use configuration such as:

`AI_PROVIDER_ORDER=bedrock,gemini,groq,openrouter`

`AI_VISION_MODEL_ORDER=gemini-3.6-flash,qwen/qwen3.8-27b,dots-studio/dots-3-note-preview:free,gemini-3.5-flash`

`AI_FALLBACK_ENABLED=false` by default; enable only after zero-cost verification.

`AI_INFERENCE_ENABLED=false`

`EXTERNAL_AI_PAID_USAGE_ALLOWED=false`

`EXTERNAL_AI_MAX_COST_USD=0`

`FREE_MODELS_ONLY=true`

`EXTERNAL_AI_ENABLED=false`

However, do not turn inference on until configured-provider security, privacy, cost and integration tests are ready.

## Failover conditions

Try the next exact model only after an explicit pre-inference rejection (such as invalid credentials, authorization denial, or an exhausted free quota), or after a completed response fails strict schema validation:

- Invalid or malformed model response.
- Output failing strict schema validation.

HTTP status codes alone do not prove a request was rejected before inference. Timeouts and ambiguous transport/provider errors abort failover because the request may have been processed. Never retry that image after an ambiguous outcome. For OpenRouter, use one exact `:free` model ID and disable paid provider/model fallbacks.

Do not fall back merely because a valid analysis reports:

- LOW_CONFIDENCE
- MIXED waste.
- Multiple visible materials.
- No waste detected.
- A genuine uncertainty warning.

These are valid classifications or abstentions, not technical failures.

Do not retry an invalid input image against every provider.

## Existing Bedrock restriction

Bedrock currently returns `Operation not allowed`.

Implement an authorization circuit breaker.

Do not send a known-denied Bedrock invocation for every scan.

Allow safe manual or infrequent rechecking of availability.

If Bedrock later becomes authorized, it should return to first priority automatically after verified testing.

## Duplicate-charge protection

Implement:

- Scan-level idempotency.
- Atomic execution claims.
- One successful provider selection per scan.
- Bounded provider attempts.
- No unbounded retries.
- Circuit breakers.
- Provider timeouts.
- Request cancellation where supported.
- Concurrency controls.
- Per-user and global usage limits.

Limit attempts to at most one initial inference call per configured provider per scan.

Do not attempt providers in parallel by default.

Stop immediately after a successful validated classification.

Record ambiguous provider timeouts carefully: a timed-out request may still have been billed.

Do not automatically repeat scans after unknown outcomes.

---

# 7. WASTE IMAGE CLASSIFICATION

Use the same nine classes across all providers:

1. ORGANIC
2. PLASTIC
3. PAPER_CARDBOARD
4. METAL
5. GLASS
6. TEXTILE
7. E_WASTE
8. MIXED
9. OTHER

Support additional analysis outcomes:

- INVALID_IMAGE
- NO_WASTE_DETECTED
- LOW_CONFIDENCE
- MULTIPLE_MATERIALS
- ANALYSIS_UNAVAILABLE
- PROCESSING_ERROR

For each valid result, provide:

- Primary category.
- Other visible materials.
- Visual description.
- Qualitative confidence.
- Contamination indicators.
- Safety warnings.
- Possible hazardous materials.
- Human-review recommendation.
- Provider used.
- Model identifier.
- Processing timestamp.

Use strict runtime schema validation.

Do not trust raw LLM JSON.

Do not allow an LLM to invent unsupported category values.

Do not calculate waste weight from visual appearance.

The quantity must come from user-entered data.

Do not fabricate material composition percentages.

---

# 8. PRIVACY AND SECURITY

External AI fallback means images can leave AWS and be processed by third-party services.

Implement a clear user-facing privacy disclosure and an explicit external-processing consent choice before sending an image to Gemini, Groq Qwen, OpenRouter, or any later-verified xAI model.

Record the relevant consent decision securely.

If the user does not authorize external processing, do not use external providers.

Fail safely when Bedrock is unavailable and external processing is not permitted.

Before transmission:

- Validate the image.
- Remove EXIF metadata where appropriate.
- Resize/compress safely.
- Minimize unnecessary image information.
- Enforce limits.
- Keep S3 objects private.
- Avoid public presigned image links to external providers.
- Transmit through server-side authenticated API calls.

Review each provider's current policies for retention, model training, logging and regional processing.

Disclose important differences to users.

Never log:

- API keys.
- Raw image bytes.
- User authentication tokens.
- Full sensitive prompts.
- Provider secrets.
- Private user data.

Ensure prompt injection through image content cannot cause arbitrary tool execution.

Preserve Cognito authentication and scan ownership controls.

---

# 9. COST CONTROLS AND AUTHORIZATION

STRICT RULE: ZERO PAID EXTERNAL AI API USAGE.

Set and enforce:

EXTERNAL_AI_PAID_USAGE_ALLOWED=false
EXTERNAL_AI_MAX_COST_USD=0
FREE_MODELS_ONLY=true
EXTERNAL_AI_ENABLED=false by default
AI_INFERENCE_ENABLED=false by default

The existing AWS gross-spending authorization remains separate and does not authorize paid Google, Groq, xAI or OpenRouter inference. Bedrock remains subject to its existing AWS authorization and spending rules; it stays disabled while unauthorized.

Never spend external AI credits or money, including through a model fallback, usage tier, promotional credit, top-up, subscription, grounding/search tool, priority route, cache, batch request, or other billable feature. Do not enable billing, attach a payment method or upgrade an account.

Before any external model call, verify from current official model metadata and the actual account:

- exact model identifier and modality support;
- all input, output, image, request and enabled feature prices are exactly USD 0;
- the account is eligible for the free tier and is configured for free-only billing;
- free quota remains and the provider will reject rather than charge after exhaustion;
- explicit consent covers the provider's current data processing/retention terms.

If any value is missing, stale, contradictory or cannot be verified, disable that provider and continue to another independently verified free provider. If none qualify, return ANALYSIS_UNAVAILABLE. Never call a paid model merely to test whether it works.

Retain local limits, idempotency, timeouts, bounded attempts and the AI kill switch. These are defense-in-depth and do not replace exact zero-price verification. Do not create always-on GPU infrastructure, paid SageMaker endpoints, unexpected NAT gateways or new AWS resources without separate authorization.

# 10. INTEGRATE WITH THE EXISTING AWS PIPELINE

Preserve the existing architecture.

Expected workflow:

User Upload
→ Private S3
→ EventBridge
→ Step Functions
→ Image Validation
→ AI Provider Router
→ Classification Validation
→ Deterministic Recovery Engine
→ Scientific Calculation Engine
→ DynamoDB Persistence
→ Frontend Results

Do not bypass established authorization or upload security.

Review the existing Step Functions definition.

Use the smallest infrastructure changes required.

Avoid adding unnecessary AWS services.

Use existing Lambda functions where technically reasonable.

Keep the disabled-inference workflow working as a safe fallback.

If no provider is available, persist the correct unavailable state instead of showing an invented result.

Distinguish a genuinely failed scan from an intentionally disabled scan.

Ensure the existing failure queue does not grow because of expected disabled-provider conditions.

---

# 11. RECOVERY RECOMMENDATIONS

Preserve and enhance the existing deterministic decision engine.

Support:

- REUSE
- RECYCLING
- COMPOSTING
- ANAEROBIC_DIGESTION
- WASTE_TO_ENERGY
- SPECIALIZED_EWASTE_RECYCLING
- LANDFILL

Evaluate material compatibility, contamination, safety, recovery potential, facility requirements and other relevant constraints.

Return:

- Recommended method.
- Explanation.
- Alternatives.
- Safety warnings.
- Facility requirements.
- Confidence and limitations.

Do not automatically prioritize incineration over appropriate recycling.

Do not recommend ordinary disposal or combustion for hazardous e-waste or batteries.

Keep numerical environmental calculations independent of provider-generated claims.

---

# 12. SCIENTIFIC ENERGY AND CARBON CALCULATIONS

Complete the scientifically defensible energy/carbon estimator.

Use authoritative evidence, including official Indian sources, EPA WARM and peer-reviewed research where relevant.

Every admitted numeric factor must include:

- Source organization.
- Original publication.
- URL.
- Material and pathway.
- Units.
- Geographic applicability.
- Baseline.
- Assumptions.
- Factor version.
- Uncertainty bounds where supported.

Calculate only what the evidence supports.

Distinguish:

- Theoretical energy potential.
- Gross energy output.
- Usable electricity.
- Useful heat.
- Net energy.
- Real generated energy.

Avoid double counting carbon offsets.

When no defensible factor exists, show:

"Estimate unavailable — verified conversion factor required."

Never invent kWh or CO2e numbers merely to improve the presentation.

---

# 13. PHASE 6 — IMPROVE THE CUSTOM ML CLASSIFIER

The existing CPU baseline has weak performance.

Do not use it for production classification yet.

Inspect the dataset manifest and evaluation report.

Use only datasets with adequately established image-use rights.

Preserve the already verified Mendeley dataset and attribution requirements.

Continue researching additional compatible datasets.

Do not assume a GitHub repository's software license automatically covers every image.

Improve:

- Dataset quality.
- Class balance.
- Label mapping.
- Duplicate detection.
- Source-group splitting.
- Train/validation/test coverage.
- Augmentation.
- Transfer-learning architecture.
- Hyperparameter selection.
- Calibration or abstention policy.
- Real-world validation.

Try MobileNetV3 or EfficientNet architectures as appropriate.

Prefer local training first.

Record actual:

- Accuracy.
- Macro F1.
- Per-class precision/recall.
- Confusion matrix.
- Sample counts.
- Dataset limitations.
- Model latency.

Do not claim a production-ready model unless justified by representative independent evaluation.

Keep the multi-provider vision API as the primary functional classification path while the custom classifier remains experimental.

Prepare SageMaker integration if useful and financially justified.

Do not run unnecessary paid training jobs.

---

# 14. PHASE 7 — SUSTAINABILITY AI AGENT

Build a genuinely functional Sustainability Advisor.

Use the Strands Agents SDK where its supported model interfaces permit the selected providers.

Verify current SDK model-provider compatibility instead of assuming all APIs share the same interface.

Separate text-agent model routing from image-classification routing.

Preferred provider order remains, but skip every provider that has not passed the USD 0 model/account/quota/consent gate:

Bedrock → Gemini 3.6 Flash → Groq Qwen 3.8 27B → OpenRouter Dots `:free` → Gemini 3.5 Flash.

xAI Grok stays excluded unless a permanent free API entitlement is independently verified.

The agent should answer questions grounded in authorized waste records.

Example questions:

"How can our campus reduce waste?"

"Why did plastic waste increase?"

"Which waste type has the highest recoverable energy?"

"Compare composting and anaerobic digestion."

"What would happen if we diverted 70% of organic waste?"

"Which collection location needs attention?"

Implement secure tools for:

- Waste summaries.
- Category breakdowns.
- Waste trends.
- Hotspot analysis.
- Recovery comparison.
- Scenario simulation.
- Scientific factor lookup.
- Analysis explanation.

Enforce user/organization access control on every tool call.

Keep tools read-only by default.

Do not provide unrestricted DynamoDB or AWS access.

Prevent the LLM from inventing organizational history or scientific numbers.

Apply timeouts, tool-call limits and cost limits.

If live agent inference cannot be enabled, keep the deterministic tool layer operational and clearly disclose the agent's unavailable status.

---

# 15. DIGITAL WASTE TWIN

Complete the existing Digital Waste Twin with authorized real data.

Show:

- Total recorded waste.
- Category distribution.
- Location-wise waste.
- Daily trends.
- Weekly trends.
- Monthly trends.
- Recovery recommendations.
- Potential landfill diversion.
- Estimated energy where supported.
- Carbon impact where supported.
- Sustainability insights.

Clearly distinguish:

**ACTUAL RECORDED DATA**

**USER-ENTERED QUANTITIES**

**SCIENTIFIC ESTIMATES**

**SIMULATED SCENARIOS**

Never represent potential recovery as energy actually generated.

Do not fabricate data to make charts look full.

Support useful empty states.

Preserve user privacy and organization isolation.

---

# 16. SCENARIO SIMULATOR

Complete the interactive recovery simulator.

Inputs:

- Waste category.
- Quantity.
- Current pathway.
- Alternative pathway.
- Diversion percentage.
- Facility assumptions.

Outputs:

- Proposed recovery strategy.
- Diversion amount.
- Energy potential where supportable.
- Carbon comparison where supportable.
- Source-backed assumptions.
- Scientific limitations.

Make every form and control functional.

Use deterministic calculation functions rather than invented LLM figures.

Keep the UI responsive on mobile.

---

# 17. FINAL FRONTEND QUALITY

Preserve the premium climate-tech design.

Improve where necessary:

- Modern dark graphite styling.
- Emerald accent colors.
- Subtle glass effects.
- Refined gradients.
- Professional typography.
- Smooth microinteractions.
- High-quality dashboard cards.
- Accessible status notifications.
- Responsive charts.
- Clear loading states.
- Clear errors and recovery actions.

Do not sacrifice usability for animation.

All buttons, dropdowns, filters and navigation controls must actually work.

For successful scans, display:

- Uploaded image.
- AI waste classification.
- Provider used.
- Confidence band.
- Recovery recommendation.
- Environmental estimates when justified.
- Safety warnings.
- Scan history record.

For failed scans, show a clear reason and safe next steps.

Do not leak technical exceptions or credentials into the browser.

---

# 18. ANDROID AND DESKTOP SUPPORT

Verify the existing responsive web application for:

- Android Chrome.
- Desktop Chrome.
- HTTPS.
- Camera capture.
- Gallery access.
- Image preview.
- Upload.
- Processing status.
- History.
- Classification results.
- Digital Twin.
- Simulator.
- Advisor.
- Settings.
- Navigation.
- Authentication.

Keep the application hardware-free.

Do not introduce ESP32 or physical sensor dependencies.

Perform automated browser checks where tooling permits.

Do not claim physical Android manual acceptance unless the user actually performs it.

Prepare a short manual acceptance checklist for any remaining device-only checks.

---

# 19. AWS DEPLOYMENT AND GITHUB

Preserve the existing private repository.

Do not force-push.

Do not overwrite unrelated work.

Do not commit secrets, training datasets or oversized model checkpoints.

Before each deployment:

1. Verify account and region.
2. Run project checks.
3. Run CDK synthesis.
4. Run fresh CDK diff.
5. Check IAM policies.
6. Check resource costs.
7. Check destructive changes.
8. Deploy only relevant resources.
9. Verify CloudFormation completion.
10. Verify Lambda startup.
11. Verify CloudWatch.
12. Verify API functionality.
13. Verify end-to-end behavior.
14. Confirm final CDK diff.

Routine, non-destructive project deployments within the existing standing authorization and spending limits may proceed.

Stop before destructive changes, broad IAM escalation, unrelated account changes, unbounded costs or operations requiring provider-level human authorization.

Keep production inference disabled until the secrets, external data-processing consent and bounded live-testing controls are in place.

After those gates pass, conduct a small authorized live test and only then enable controlled production inference.

For frontend changes, push reviewed commits to the authorized private `main` branch and verify Amplify deployment.

---

# 20. TESTING AND QUALITY ASSURANCE

Preserve all previously passing tests.

Add automated tests for:

- Bedrock adapter.
- Gemini adapter.
- Grok adapter.
- OpenRouter adapter.
- Correct fallback order.
- Missing API keys.
- Authorization errors.
- Timeouts.
- HTTP 429 and 5xx errors.
- Invalid AI response schemas.
- Valid low-confidence classifications.
- Provider circuit breakers.
- Idempotent scan processing.
- Duplicate billing prevention.
- Daily usage limits.
- Spending limit enforcement.
- External-processing consent.
- Cross-user authorization.
- Private S3 access.
- Recovery recommendations.
- Scientific estimation.
- Agent tool authorization.
- Scenario simulation.
- Frontend loading/failure states.
- Mobile responsive layouts.

Use mocks for ordinary automated provider tests.

Use only a small number of bounded real provider calls for final acceptance.

Run:

`npm run check`

Run applicable Python tests, Ruff, TypeScript checks, formatting, production builds and CDK synthesis.

Fix real errors rather than removing failing tests.

Record actual test totals.

Do not claim live tests passed when they were mocked.

---

# 21. EXISTING SQS BACKLOG

There are approximately 22 historical messages in the failure queue.

These originated during earlier development.

Do not automatically purge, replay, delete or alter those messages.

Verify new successful scans and intentional unavailable states do not incorrectly increase the backlog.

Document any proposed cleanup separately.

Do not disable alarms merely to hide operational failures.

---

# 22. FINAL HACKATHON SUBMISSION

Prepare Waste2Watt AI for:

**Environment Hacks AWS Hackathon — Track 03: Waste & Energy**

Create or update:

- README.md
- Architecture documentation.
- AWS service inventory.
- API documentation.
- Data model.
- Multi-provider AI architecture.
- AI fallback documentation.
- External API privacy disclosures.
- Model evaluation report.
- Dataset manifest.
- Scientific methodology.
- AWS and external API cost documentation.
- Security review.
- Testing report.
- Deployment guide.
- Demo guide.
- Hackathon submission write-up.

Prepare a compelling project story.

Emphasize:

**Waste2Watt AI does more than classify garbage. It converts visual waste observations into explainable recovery decisions, evidence-based environmental estimates and actionable sustainability intelligence.**

Document the role of AWS clearly.

Explain how AWS services host, secure and orchestrate the application even when an external AI provider handles vision recognition.

Do not claim that Gemini, Groq Qwen or xAI Grok is an AWS-native model.

Do not claim custom ML accuracy is higher than measured.

Do not invent environmental benefits.

Prepare a 3–5 minute demo covering:

1. Open the live website.
2. Sign in.
3. Capture or upload waste.
4. Enter quantity.
5. Show real AI image recognition.
6. Display which provider handled the request.
7. Explain the recommended recovery pathway.
8. Show scientifically defensible estimates or limitations.
9. Open the Digital Waste Twin.
10. Run a scenario simulation.
11. Ask the Sustainability Advisor for an improvement recommendation.
12. Explain the AWS architecture.

Use real results when available.

Clearly label demo data and simulated outcomes.

---

# 23. COMPLETION TRACKER

Maintain:

`docs/FINAL_COMPLETION_TRACKER.md`

Track:

- Completed features.
- Failed features.
- Deployment history.
- Test results.
- Bedrock authorization status.
- Provider integration results.
- Model availability.
- External API requirements.
- Secret configuration status.
- Scientific-factor status.
- AWS and external spending estimates.
- Remaining user acceptance tests.
- Hackathon readiness.

Do not mark a component COMPLETE merely because the page renders.

Completion requires functional behavior and appropriate verification.

---

# 24. EXECUTION ORDER — DO THIS AUTOMATICALLY

Follow this order:

1. Inspect repository and current AWS state.
2. Verify the latest deployment.
3. Implement the shared AI provider abstraction.
4. Implement Bedrock adapter and authorization circuit breaker.
5. Verify Gemini 3.6/3.5 Free-tier account/model/quota eligibility; only then implement and mock-test the free adapters.
6. Verify Groq Qwen's Free-tier entitlement, current limits and paid-billing lockout; otherwise leave it disabled. Keep xAI Grok `SKIPPED_NO_FREE_MODEL` unless a genuinely free API entitlement is independently confirmed.
7. Verify OpenRouter `dots-studio/dots-3-note-preview:free`, account quota and paid-fallback lockout; only then implement its free adapter.
8. Create secure API key configuration procedure.
9. Implement privacy disclosure and consent.
10. Implement provider failover, rate limits and cost protections.
11. Run mock tests.
12. Configure secrets securely when supplied.
13. Prepare and review minimal AWS CDK changes.
14. Do not deploy backend changes without separate explicit AWS authorization.
15. Make a real provider call only after current zero-cost, account, quota, privacy-consent and external-data checks pass.
16. Keep inference disabled unless the selected provider is attested zero-cost; never enable paid fallback.
17. Verify real uploaded-image classification.
18. Verify recovery recommendations and persistence.
19. Update Scan and History.
20. Complete supported environmental estimates.
21. Improve the experimental classifier.
22. Complete the Digital Waste Twin.
23. Connect the Sustainability Advisor to a working provider.
24. Complete the Simulator and analytics.
25. Finish frontend polish and accessibility.
26. Run complete automated and browser testing.
27. Deploy final reviewed updates.
28. Prepare the hackathon demo.
29. Finish documentation.
30. Produce the final completion report.

Continue independent local work while awaiting essential external permissions or credentials.

Do not stop merely because Bedrock remains unauthorized.

---

# 25. FINAL COMPLETION REPORT

When finished, provide:

1. Final live website URL.
2. GitHub branch and commit.
3. AWS deployment status.
4. Bedrock availability.
5. Gemini integration status.
6. Groq Qwen integration status.
7. OpenRouter integration status.
8. xAI Grok status and evidence for remaining disabled or qualifying as genuinely free.
9. Actual provider priority and fallback behavior.
10. Real image recognition results.
11. Provider cost and usage results.
12. Recovery engine status.
13. Scientific factors enabled.
14. Custom model metrics.
15. Sustainability Agent status.
16. Digital Waste Twin status.
17. Simulator status.
18. Final automated test totals.
19. Browser acceptance results.
20. Physical Android tests still needed.
21. Security findings.
22. Remaining operational risks.
23. Hackathon submission readiness.

Clearly distinguish:

- Fully verified.
- Implemented but unverified.
- Experimental.
- Blocked.
- Deferred.

Never invent successful deployment, model accuracy, scientific estimates or acceptance results.

---

# FINAL DIRECTIVE

**COMPLETE WASTE2WATT AI USING MULTI-PROVIDER ARTIFICIAL INTELLIGENCE.**

Priority:

**Amazon Bedrock (only when separately authorized) → Gemini 3.6 Flash → Groq Qwen 3.8 27B (verified Free account only) → OpenRouter Dots `:free` → Gemini 3.5 Flash**

xAI Grok is skipped unless an independently verified free API entitlement is available.

Bedrock remains preferred whenever genuinely authorized.

While Bedrock is blocked, use only the first external vision provider independently verified to cost USD 0 for this account and quota; otherwise return ANALYSIS_UNAVAILABLE.

Preserve AWS as the secure application infrastructure.

Use real provider responses.

Use deterministic recovery calculations.

Respect scientific uncertainty.

Control costs and protect credentials.

Finish all achievable requirements across Phases 5–8.

Deploy verified functionality.

Make the frontend polished and functional on desktop and Android.

Prepare a complete, honest and compelling hackathon submission.

Do not repeatedly ask for new engineering instructions.

Only pause when credentials must be entered securely, provider consent or authentication is required, budget exposure cannot be bounded, destructive actions are proposed or a genuinely external blocker prevents further progress.

Otherwise continue engineering until the project reaches its maximum safely achievable completion state.
