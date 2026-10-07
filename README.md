# Waste2Watt AI

**Turning Waste Intelligence into Energy Decisions.**

AWS-native hackathon project with a Phase 1 scaffold and Phase 2 AWS CDK v2
infrastructure definitions. Nothing is deployed. The React page is static, API
handlers return HTTP 501, and analysis/agent adapters are unimplemented. No models,
energy calculations, recovery factors, or environmental benefit claims are supplied.

| Path              | Responsibility                                                           |
| ----------------- | ------------------------------------------------------------------------ |
| apps/web          | React/Vite/TypeScript + Tailwind scaffold page; hosting is separate      |
| services/api      | Existing Node TypeScript HTTP 501 Lambda boundary and repository ports   |
| services/analysis | Python analysis protocol and placeholder                                 |
| services/agent    | Python decision protocol; reserved for Strands with Bedrock              |
| ml                | Python boundary for future SageMaker AI workflows                        |
| infra             | CDK v2 Data/Auth/API/Pipeline/Observability stacks and assertions        |
| packages/shared   | TypeScript models and Python wire contracts                              |
| data              | Data policy and empty raw/processed directories                          |
| docs              | Architecture, API, data model, infrastructure decisions and verification |
| tests             | Node and Python service boundary tests                                   |

## Local setup and checks

Use Node 24.x, npm 11.x, Python 3.12+. From E:\Waste2WattAI:

```powershell
npm ci --ignore-scripts
npm run check
npm run synth --workspace @waste2watt/infra
npm run dev
```

No credentials or AWS resources are required. npm caches, Python environment,
CDK cache, bundles and cloud assemblies are kept inside this project and ignored.
The synth helper runs local cdk synth with context lookups disabled. No deploy script exists.

| Command                                     | Purpose                                                    |
| ------------------------------------------- | ---------------------------------------------------------- |
| npm run build                               | Compile shared/API/infra TypeScript and build the frontend |
| npm run typecheck                           | Check workspaces, service tests and infrastructure tests   |
| npm run lint                                | ESLint for TypeScript/JavaScript                           |
| npm run format / format:check               | Prettier formatting / verification                         |
| npm test                                    | Node, Python and CDK assertion tests                       |
| npm run check                               | Typecheck, lint, formatting, tests and builds              |
| npm run synth --workspace @waste2watt/infra | Build infra and synthesize five stacks locally             |

Python runtime dependencies are empty. Optional Python lint/format tools use Ruff:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install --cache-dir .npm-cache/pip -r requirements-dev.txt
.\.venv\Scripts\python -m ruff check .
.\.venv\Scripts\python -m ruff format --check .
```

Python service packaging is deferred. Unit tests set their local import paths.
.env.example documents future settings; environment files are not automatically
loaded by infrastructure/backend code. Never put secrets in VITE_* settings.

## Phase 2 boundaries

Infrastructure defines Cognito, private image storage, DynamoDB, JWT-protected HTTP
API routes, the image EventBridge/Step Functions pipeline, failure queue and CloudWatch
observability. AWS SDK v3 is deferred until runtime adapters actually call AWS.
The safe workflow stub always fails and records diagnostics. No Bedrock calls,
SageMaker endpoints, Strands agent execution, data uploads or deployment occurred.

Read [architecture](docs/ARCHITECTURE.md), [API](docs/API.md),
[data model](docs/DATA_MODEL.md), [local synthesis](docs/DEPLOYMENT.md),
[Phase 2 decisions/file inventory](docs/PHASE2_INFRASTRUCTURE.md), and
[verification](docs/VERIFICATION.md).

Frontend configuration follows the [Vite guide](https://vite.dev/guide/) and
[Tailwind Vite integration](https://tailwindcss.com/docs/installation/using-vite).
ESLint follows [typescript-eslint flat configuration](https://typescript-eslint.io/getting-started/).
