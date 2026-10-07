# Waste2Watt AI

**Turning Waste Intelligence into Energy Decisions.**

An AWS-native hackathon project. This repository is a scaffold: shared contracts,
service interfaces, tool configuration, and documentation. The frontend displays
project status, the API always returns HTTP 501, and Python adapters raise
`NotImplementedError`. There is no complete application, AWS integration, deployed
resource, model, recommendation, or sustainability calculation.

## Repository

| Path                | Responsibility                                                 |
| ------------------- | -------------------------------------------------------------- |
| `apps/web`          | React + Vite + TypeScript, Tailwind CSS, static scaffold page  |
| `services/api`      | Node.js + TypeScript Lambda HTTP boundary and repository ports |
| `services/analysis` | Python analysis protocol and placeholder adapter               |
| `services/agent`    | Python decision protocol; reserved for Strands Agents SDK      |
| `ml`                | Python package boundary; reserved for SageMaker AI workflows   |
| `infra`             | Future AWS CDK v2 TypeScript configuration interface only      |
| `packages/shared`   | TypeScript domain interfaces and Python wire contracts         |
| `data`              | Data policy and empty raw/processed directories                |
| `docs`              | Architecture, proposed API, data model, deployment policy      |
| `tests`             | Node and Python boundary tests                                 |

## Local setup

Use Node.js 24.x, npm 11.x, and Python 3.12+. Tested tool versions are recorded in
`docs/VERIFICATION.md`. Run commands from `E:\Waste2WattAI`:

```powershell
npm ci
npm run check
npm run dev
```

`npm ci` installs only the locked frontend and development toolchain. npm cache is
configured inside the repository. No AWS credentials or environment values are
required. `npm run dev` serves the static scaffold page on localhost. Vite environment
files, if eventually needed, belong under `apps/web`; root `.env.example` documents
the future integration values and is not automatically loaded by backend services.

## Commands

| Command                | Purpose                                                                |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm run build`        | Build shared declarations, Lambda boundary, infra interfaces, frontend |
| `npm run typecheck`    | Build shared declarations and check all TS workspaces and TS tests     |
| `npm run lint`         | ESLint for TypeScript and JavaScript                                   |
| `npm run format`       | Prettier for supported source/config/docs files                        |
| `npm run format:check` | Check Prettier formatting                                              |
| `npm test`             | Node boundary test and standard-library Python tests                   |
| `npm run check`        | Typecheck, lint, formatting check, tests, and builds                   |

Python runtime dependencies are empty. Python linting/formatting is configured with
Ruff in `pyproject.toml`; Prettier does not format Python. To use the optional Python
development tool locally:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install --cache-dir .npm-cache/pip -r requirements-dev.txt
.\.venv\Scripts\python -m ruff check .
.\.venv\Scripts\python -m ruff format --check .
```

Python source directories are not packaged for deployment yet. Unit tests add their
local import paths explicitly; deployment packaging will be designed later.

## Planned AWS stack

Cognito, S3, API Gateway, Lambda, DynamoDB, EventBridge, Step Functions, Amazon
Bedrock, Amazon SageMaker AI, Strands Agents SDK, CloudWatch, and AWS CDK v2.
Dependencies and adapters for these services are deferred until implementation.

No deployment, bootstrap, synthesis, AWS resource creation, dataset upload, or model
invocation is part of this scaffold. See [architecture](docs/ARCHITECTURE.md),
[API](docs/API.md), [data model](docs/DATA_MODEL.md), and
[deployment policy](docs/DEPLOYMENT.md).

Frontend configuration follows the [Vite guide](https://vite.dev/guide/) and
[Tailwind Vite integration](https://tailwindcss.com/docs/installation/using-vite).
ESLint uses the [typescript-eslint flat configuration](https://typescript-eslint.io/getting-started/).
