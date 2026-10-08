# Phase 3 verification

Local verification on 2026-10-08 in E:\Waste2WattAI. Nothing was deployed.

## Results

| Check                        | Result                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| npm install --ignore-scripts | Passed; required Amplify, SDK v3, Zod and frontend test dependencies installed               |
| npm ls --depth=0             | Passed; workspace dependencies resolved                                                      |
| npm run build                | Passed: shared, API, infrastructure and production frontend                                  |
| npm run typecheck            | Passed: workspaces, service tests and CDK tests                                              |
| npm run lint                 | Passed with zero warnings                                                                    |
| npm run format:check         | Passed                                                                                       |
| npm test                     | Passed: 19 Node + 2 Python + 13 CDK + 20 frontend = 54 tests                                 |
| npm run check                | Passed: complete verification chain                                                          |
| cdk synth --lookups false    | Passed through infrastructure synth helper; five local stack assemblies                      |
| git diff --check             | Passed                                                                                       |
| Local browser rendering      | Desktop landing, exact 390px mobile landing and explicit auth configuration screen inspected |

The frontend is split into the application and lazy Cognito form chunks. Vite
reports two upstream Zod pure-comment annotation notices; these comments are
removed by Rollup and do not fail compilation. CDK prints its informational
unconfigured feature-flag message. esbuild marks SDK bundle sizes; assets remain
within Lambda packaging limits. npm installation reported upstream peer override
notices; the installed dependency tree has no missing/invalid direct packages.

## Coverage

Node tests cover JWT identity, client/scope validation, creation, trusted optional
organization identity, strict body validation, ownership, MIME/size rejection,
server keys, upload retries/terminal guards, safe errors, real SDK POST policy
constraints, descending owner-index Query, bound cursors, consistent reads,
processing/failure persistence and duplicate metadata events. AWS sends use
injected test doubles; presigning uses test-only credentials without network calls.

Frontend tests cover configuration, protected routing, file boundaries, loading,
empty/error/retry states, recent scan metadata, camera enhancement, direct upload
failure recovery, polling to honest development failure, response validation,
Bearer access token usage, future shells and error boundaries. They do not claim
real Cognito sign-in or real S3 upload success.

CDK assertions cover bucket privacy/encryption/ownership/CORS/lifecycle, three
tables and existing owner GSI, Cognito/MFA, nine JWT routes, scan-only IAM, all six
workflow boundaries, upload and terminal EventBridge rules, status persistence,
DLQ, logs/alarms, outputs and local configuration. Python boundaries remain unchanged.

## Synthesized cloud assembly

| Stack                            | CloudFormation resources |
| -------------------------------- | ------------------------ |
| Waste2WattDataStack-dev          | 5                        |
| Waste2WattAuthStack-dev          | 4                        |
| Waste2WattApiStack-dev           | 27                       |
| Waste2WattPipelineStack-dev      | 18                       |
| Waste2WattObservabilityStack-dev | 7                        |
| Total                            | 61                       |

Counts include roles, policies, routes, integrations and invocation permissions;
they describe templates, not live resources. All eight required outputs remain
present. Core definitions include one private bucket, three tables, Cognito pool
and public client, HTTP API with nine routes and JWT authorizer, three Lambdas,
one Standard state machine, two EventBridge rules, one failure queue, five explicit
log groups and seven alarms.

## Visual evidence and limits

[Desktop landing](screenshots/phase3-landing-desktop.png),
[mobile landing](screenshots/phase3-landing-mobile.png) and
[unconfigured authentication](screenshots/phase3-auth-configuration.png) are local
Chrome captures. The exact 390px viewport reports document width 390px, with no
horizontal overflow. Optional node tests/preview.mjs reproduces captures while
Vite runs on 127.0.0.1:5173; it requires Windows Chrome and uses a project-local
browser profile. It does not bypass app authentication.

All dependencies, caches, generated bundles/assemblies, browser profiles and
screenshots stay in this repository. No bootstrap, deployment, AWS write,
console change, real image upload, Bedrock invocation, SageMaker endpoint/job,
Strands invocation, factor seed or recovery calculation was performed.
Live cloud integration, production hosting and scientific validity remain deferred.
