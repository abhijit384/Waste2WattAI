# Waste2Watt AI

**Turning Waste Intelligence into Energy Decisions.**

Phase 4 prepares deployment and integration of the Phase 3 application: Cognito
authentication, private image uploads, owner-scoped scan APIs and status polling.
The current review targets only waste2watt-dev in us-east-1. STS verified
the waste2watt-developer IAM user in the intended account 415150458314.
CDKToolkit bootstrap completed with termination protection and version 32.
Development reservations are removed for the concurrency quota of 10.
All five dev application stacks reached CREATE_COMPLETE; the final diff has no changes.
Live sign-in, owned scan/upload and expected unfinished-analysis failure checks passed.
Local frontend configuration was generated; browser acceptance checks remain.
See docs/PHASE4_FIRST_DEPLOYMENT.md and docs/INTEGRATION_TESTING.md.
Previous accounts are forbidden. Amplify Hosting awaits separate review and approval.
AI analysis intentionally fails
until implemented; no classifications, recovery factors, or sustainability
estimates are fabricated.

| Path              | Responsibility                                                              |
| ----------------- | --------------------------------------------------------------------------- |
| apps/web          | React/Vite/TypeScript/Tailwind application and Amplify Cognito UI           |
| services/api      | Node TypeScript scan API, SDK v3 persistence/upload adapters, status worker |
| services/analysis | Deferred Python analysis boundary                                           |
| services/agent    | Deferred Python Strands/Bedrock advisor boundary                            |
| ml                | Deferred SageMaker AI workflows                                             |
| infra             | Five CDK v2 stacks and infrastructure assertions                            |
| packages/shared   | Zod scan contracts and legacy AI contracts                                  |
| data              | Data policy; no seeded factors                                              |
| docs              | Architecture, API, deployment, phase reports and verification               |
| tests             | Node and Python service tests; frontend tests live with web source          |

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
