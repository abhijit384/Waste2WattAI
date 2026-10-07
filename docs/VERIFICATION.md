# Verification

Local Phase 2 verification on 2026-10-08 in E:\Waste2WattAI. Nothing was deployed.

## Toolchain

Node.js 24.16.0; npm 11.13.0; Python 3.14.6; TypeScript 5.9.3.
AWS CDK library 2.272.0; CDK CLI 2.1144.0; Constructs 10.8.1; esbuild 0.25.12.
Exact npm resolutions are recorded in package-lock.json.

## Results

| Check                                       | Result                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| npm install --ignore-scripts                | Passed; required CDK/Constructs/esbuild dependencies installed locally     |
| npm run build                               | Passed for shared, API, infra and web                                      |
| npm run typecheck                           | Passed for workspaces, service tests and infrastructure tests              |
| npm run lint                                | Passed, zero warnings                                                      |
| npm run format:check                        | Passed                                                                     |
| npm test                                    | Passed: 1 Node API test, 2 Python tests, 13 CDK/configuration/worker tests |
| cdk synth --lookups false from infra        | Passed; all five stack templates emitted locally                           |
| npm run synth --workspace @waste2watt/infra | Passed; helper invokes the same local synthesis command                    |
| git diff --check                            | Passed                                                                     |

Infrastructure tests cover private/encrypted storage, lifecycle/CORS, all three table
keys/PITR/billing, Cognito code flow and scope, all nine JWT-authorized routes,
state-machine stages/catches/failure guard, upload and terminal-failure EventBridge
wiring, encrypted/TLS-protected DLQ, logs/alarms, IAM wildcard constraints, outputs,
configuration validation, explicit placeholder failure, and production retention/MFA.

## Cloud assembly inspection

CloudFormation definitions are in infra/cdk.out:

| Stack                            | Defined resources |
| -------------------------------- | ----------------- |
| Waste2WattDataStack-dev          | 5                 |
| Waste2WattAuthStack-dev          | 4                 |
| Waste2WattApiStack-dev           | 26                |
| Waste2WattPipelineStack-dev      | 13                |
| Waste2WattObservabilityStack-dev | 6                 |
| Total                            | 54                |

These counts include policies, roles, invocation permissions, integrations and
routes. They are definitions, not live resources. Required outputs were verified
by CDK assertions and template inspection.

## Confirmed corrections

Cognito OAuth scopes are synthesized as a resource-server reference joined with
/access; the test now checks this intrinsic expression and the server identifier.
The installed CLI no longer accepts --all for synth; it was removed because synth
already emits all stack assemblies. Cross-stack reference strength is explicitly
pinned to strong, retaining producer-protecting export/import behavior.

The CLI's message about 80 unconfigured feature flags is informational. Library/CLI
versions are pinned, and the deliberate cross-stack reference mode is configured;
there were no final synthesis errors or construct warnings.

## Limits and confinement

Tests and asset bundling write inside infra/cdk.test.out. Synthesis writes inside
infra/cdk.out, and the CDK helper keeps its cache inside infra/.cdk. npm/pip caches,
node_modules, the Python environment and build outputs remain inside the repository.

No bootstrap, deployment, CloudFormation write, console change, image upload,
Bedrock call, SageMaker endpoint/job, Strands invocation, dataset seed, or recovery
calculation was performed. No real AWS integration/security control is claimed as
runtime-validated. Browser interaction, load tests and scientific validity are deferred.

Phase 1's one Node/two Python tests still pass. Its earlier Ruff checks passed;
Python runtime sources were unchanged in Phase 2. No AI/ML runtime dependency was installed.
