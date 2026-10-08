# Waste2Watt AI

**Turning Waste Intelligence into Energy Decisions.**

Phase 3 implements the application foundation: Cognito authentication, private
image uploads, owner-scoped scan APIs, a responsive dashboard, scan history, and
processing-status polling. Infrastructure remains local CDK definitions: nothing
has been deployed or created in an AWS account. AI analysis intentionally fails
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
not deploy. No deploy script is provided.

Read [Phase 3 implementation and file inventory](docs/PHASE3_APPLICATION.md),
[architecture](docs/ARCHITECTURE.md), [API](docs/API.md),
[data model](docs/DATA_MODEL.md), [configuration and synthesis](docs/DEPLOYMENT.md),
and [verification](docs/VERIFICATION.md).
