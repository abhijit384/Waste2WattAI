# Waste2Watt AI — hackathon submission

**Turning waste intelligence into energy decisions.**

Waste2Watt AI gives organizations a private workflow for recording waste, reviewing material assessments, and exploring recovery decisions with clear evidence and uncertainty. A user signs in, captures or selects a photo, enters an approximate quantity and source, then follows the scan through upload, processing, and owner-scoped history. Dashboard and Digital Twin views summarize recorded scans. A scenario simulator makes cited assumptions explicit, while the sustainability advisor offers deterministic, read-only prompts.

## Live project and demo

- **Website:** [main.d1kq8pn2nvv063.amplifyapp.com](https://main.d1kq8pn2nvv063.amplifyapp.com)
- **Narrated walkthrough:** [Waste2Watt AI demo video](assets/Waste2Watt-AI-Demo.mp4) (2 minutes 52 seconds; covers the home page, sign-in journey, dashboard, a fresh scan, report/history, Digital Twin, simulator, advisor, settings, and AWS architecture)
- **Required YouTube demo link:** upload the included MP4 as an unlisted YouTube video, then paste that YouTube URL into the hackathon form. The file is prepared locally; it has not been published.
- **Pitch and detailed run of show:** [Hackathon pitch](../docs/HACKATHON_PITCH.md)

The video omits passwords and one-time codes. It shows a genuine fresh upload that ended `ANALYSIS_UNAVAILABLE`, followed by a separate earlier stored report. Those are different scans; the older result is not presented as the result of the fresh upload.

## Problem and approach

Waste decisions often start with incomplete records. This project starts by making observations traceable: authenticated ownership, approximate user-entered quantities, private image storage, explicit workflow states, and history. It then provides descriptive analytics and a place to explore source-cited scenarios without blending estimates with measurements.

The product is designed to keep evidence visible. A waste photo alone does not establish composition, contamination, accepted processing route, facility suitability, recoverable energy, or avoided emissions. The site leaves those impacts unestimated unless suitable reviewed factors and a baseline are available.

## Technology and AWS architecture

| Layer                         | Implementation                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| Frontend                      | React, TypeScript, Vite, Tailwind CSS; responsive light/dark interface                             |
| Hosting                       | AWS Amplify Hosting, HTTPS, SPA routing                                                            |
| Authentication                | Amazon Cognito signup, email confirmation, sign-in and session handling                            |
| API                           | API Gateway HTTP API with JWT authorization; Node.js/TypeScript Lambda handlers                    |
| Data and images               | DynamoDB scan records; private, encrypted Amazon S3 uploads using constrained presigned POSTs      |
| Workflow                      | S3 events, EventBridge, AWS Step Functions, Python analysis/status Lambda, SQS failure diagnostics |
| Operations and infrastructure | CloudWatch logs/alarms; AWS CDK v2 in TypeScript                                                   |
| Local research                | Python CPU image baseline, deterministic dataset cleaning/splits/evaluation; no hosted endpoint    |

The browser authenticates with Cognito and calls protected API routes. The API derives ownership from verified identity, stores scan metadata, and returns a constrained upload authorization. The browser uploads directly to private S3. S3 events begin the EventBridge and Step Functions workflow; Lambda validates object ownership and writes scan status to DynamoDB. CloudWatch and the existing SQS failure queue provide operational diagnostics. Five CDK stacks separate data, authentication, API, pipeline, and observability resources.

## Implemented features

- Cognito account creation, email confirmation, sign-in, protected routes, and sign-out.
- Camera capture and photo selection, image preview, upload progress, approximate quantity/source entry, and authenticated scan history.
- Dashboard and Digital Waste Twin summaries based on the signed-in user's stored scans.
- A report page that presents validated available fields and explicit unavailable status.
- A scenario simulator for user-entered, cited inputs, labeled as simulated rather than measured.
- Deterministic, read-only sustainability guidance; profile, theme, FAQ, support, and account controls.
- Sequential, schema-validated analysis adapters with fail-closed free-model and zero-cost checks. Bedrock remains behind its separate AWS authorization gate.
- A reproducible, local research dataset pipeline and CPU baseline report.

## Verification and honest limits

The last recorded complete project validation passed 147 tests across TypeScript, Python, CDK assertions, and frontend tests, plus typechecking, lint, formatting, and production builds. This submission-preparation change is being checked again; the current run result will be recorded in the repository verification notes.

The most recent hosted acceptance record confirms HTTPS page and asset responses, authenticated history, deep-link routing, and no browser console warnings/errors in that session. Signup, verification email, and sign-in were manually confirmed by the project owner. Ten Android checks—including camera, gallery, upload, persistence, and history—were also user-confirmed.

Analysis is not consistently available in production. A schema-validated Gemini response was observed once in sanitized telemetry, but a later fresh scan ended `ANALYSIS_UNAVAILABLE`; provider-specific failure details were not retained for that scan. Amazon Bedrock is not authorized. The local image baseline is research-only: 45.38% held-out accuracy and 28.15% macro-F1 across the classes represented in its source-group holdout; it has no Glass test examples and only four Paper examples. It is not used by hosted scans and is not production-ready.

No energy yield, carbon savings, or classifier reliability is claimed. No Bedrock inference, paid external inference, SageMaker deployment, or backfill is part of this submission. External image processing is disclosed on the scan page and guarded by backend eligibility and zero-cost checks.

## Learning and growth

The project connected frontend identity, least-privilege APIs, direct private uploads, and event-driven status handling. It also made the boundary between a plausible model answer and defensible waste or environmental evidence concrete: uncertainty, rights, ownership, and measured factors need to be part of the product, not hidden behind a confident-looking score.

## Local review

See the root [README](../README.md), [architecture](TECHNICAL_OVERVIEW.md), [verification ledger](../docs/VERIFICATION.md), [completion tracker](../docs/FINAL_COMPLETION_TRACKER.md), [dataset/model report](../docs/PHASE6_LOCAL_MODEL_REPORT.md), and [provider policy](../docs/AI_PROVIDER_FREE_ONLY.md). The repository excludes local environment files, credentials, user uploads, generated datasets, and model artifacts.
