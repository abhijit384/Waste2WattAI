# Waste2Watt AI

**Turning Waste Intelligence into Energy Decisions.**

Waste2Watt AI is an AWS-hosted waste capture and evidence workflow. The live frontend
is [Amplify hosted](https://main.d1kq8pn2nvv063.amplifyapp.com); its backend uses
Cognito, private S3, API Gateway, Lambda, DynamoDB, EventBridge, Step Functions, SQS
and CloudWatch. Authentication, owner-scoped history, constrained uploads, and the
user-confirmed Android acceptance checks are documented.

The analysis workflow supports Bedrock behind its AWS authorization gate and
sequential external-provider adapters behind strict zero-cost checks. Bedrock remains
unauthorized. Hosted provider results have been inconsistent: a validated Gemini
response was observed once, while a later scan ended `ANALYSIS_UNAVAILABLE`. The
application does not promise that every scan will receive a classification. Energy
and carbon impact remain unestimated without reviewed conversion factors and a
baseline. The scan page discloses external image processing. Paid external inference
and unverified providers are blocked. See the [provider policy](docs/AI_PROVIDER_FREE_ONLY.md)
and [completion tracker](docs/FINAL_COMPLETION_TRACKER.md).

Dashboard and Digital Twin values summarize authenticated scan records. The scenario
calculator labels user-entered, cited-input arithmetic as simulated; the sustainability
advisor is deterministic and read-only. Submission materials and the narrated demo
are in [submission/](submission/README.md).

| Path              | Responsibility                                                                 |
| ----------------- | ------------------------------------------------------------------------------ |
| apps/web          | React/Vite/TypeScript/Tailwind application and Amplify Cognito UI              |
| services/api      | Node TypeScript scan API, SDK v3 persistence/upload adapters, status worker    |
| services/analysis | Python analysis worker, schema validation, and guarded model-provider adapters |
| services/agent    | Read-only owner-bound Strands-compatible tool modules; no model invocation     |
| ml                | Local licensed dataset pipeline and CPU baseline training/evaluation           |
| infra             | Five CDK v2 stacks and infrastructure assertions                               |
| packages/shared   | Zod scan contracts and legacy AI contracts                                     |
| data              | Data policy; no seeded factors                                                 |
| docs              | Architecture, API, deployment, phase reports and verification                  |
| submission        | Hackathon overview, architecture, limitations and narrated demo video          |
| tests             | Node and Python service tests; frontend tests live with web source             |

## Local development

Use Node 24.x, npm 11.x and Python 3.12+. From E:\Waste2WattAI:

```powershell
npm ci --ignore-scripts
npm run dev
```

The landing page and an explicit developer configuration screen work without
AWS credentials or deployment. Authentication and scan operations require real
deployed services; there is no fake authentication backend.

Create apps/web/.env.local inside this repository with the four blank VITE_*
settings from [.env.example](.env.example), filled with real deployment outputs.
Vite reads that workspace file, not the root example. Restart Vite after changing
configuration. These are public identifiers and a URL, never AWS secrets.

```powershell
npm run build
npm run typecheck
npm run lint
npm run format:check
npm test
npm run synth --workspace @waste2watt/infra
```

npm run check runs all checks and builds. npm test includes Node, Python, CDK
assertions and frontend Vitest tests. npm run format applies Prettier.
Local caches, generated assets, browser profiles and cloud assemblies are ignored
and remain inside this project. Synthesis disables AWS context lookups and does
not deploy. The guarded scripts/aws-dev.ps1 fixes the new profile and region,
requires the exact waste2watt-developer IAM user and rejects other identities. It supports only
identity, bootstrap status and full template diff, with no deploy action.
scripts/configure-frontend.mjs converts actual CDK outputs into ignored local config.

Read [Phase 3 implementation and file inventory](docs/PHASE3_APPLICATION.md),
[architecture](docs/ARCHITECTURE.md), [API](docs/API.md),
[data model](docs/DATA_MODEL.md), [configuration and synthesis](docs/DEPLOYMENT.md),
and [verification](docs/VERIFICATION.md). See the current
[Phase 4 new account review](docs/PHASE4_NEW_ACCOUNT_REVIEW.md),
[integration checklist](docs/INTEGRATION_TESTING.md), and
[troubleshooting guide](docs/TROUBLESHOOTING.md) before live testing.
