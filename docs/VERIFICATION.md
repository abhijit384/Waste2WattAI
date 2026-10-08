# Phase 3 verification

Current Phase 4 verification: all five explicitly approved dev stacks reached
CREATE_COMPLETE in 415150458314/us-east-1 using waste2watt-dev. The full local check
passed all 59 tests/builds, live SDK integration passed the real constrained PNG
upload and expected FAILED/ANALYSIS_NOT_IMPLEMENTED persistence, and the final
read-only diff has no changes. Browser UI, second confirmed user and JPEG/WebP
checks remain pending. See [current deployment and verification](PHASE4_FIRST_DEPLOYMENT.md)
for security findings, costs, evidence and limits. Hosting and Phase 5 remain deferred.

The SSO results below are historical previous-account evidence, not current
deployment instructions. See [new account review](PHASE4_NEW_ACCOUNT_REVIEW.md).

Historical Phase 3 verification and previous-account Phase 4 verification on 2026-10-08
in E:\Waste2WattAI. No AWS changes occurred in either recorded run.

## Phase 4 SSO resume

Only waste2watt-sso/us-east-1 is permitted. STS verified an assumed role, not root.
CDKToolkit DescribeStacks returned does-not-exist and the default bootstrap version
SSM parameter returned ParameterNotFound. Local tests/check/build and offline synth
passed again. Full read-only diff covered five stacks: 61 additions, no deletion
or replacement. Installed CLI ignored requested --all for diff, so the follow-up
used all five explicit stack names. Template mode avoids change sets/asset uploads;
expected missing bootstrap lookup-role warnings use the same verified SSO identity.

Lambda quota inspection found concurrency=10/unreserved=10 versus configured
reservations=20; this is a deployment blocker. No bootstrap, deploy, quota request,
model call or upload was performed. Explicit user approval is required before any
bootstrap/deployment. Old root identity remains forbidden.

The rendered bootstrap template and full diff are ignored under .deployment.
Existing AWSLambdaBasicExecutionRole grants three Logs actions with Resource '*';
this baseline managed policy is additional to inline Step Functions log-delivery
wildcards. There is no broad DynamoDB/S3/AI runtime grant. Bootstrap's proposed
AdministratorAccess execution role requires explicit review/approval.

## Phase 4 local results

| Check                                  | Result                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| Initial git status                     | Clean before changes                                                           |
| Baseline npm run check                 | Passed: 54 tests plus typecheck/lint/format/build                              |
| Final npm run check                    | Passed: 21 Node + 2 Python + 15 CDK + 20 frontend = 58 tests                   |
| npm run build                          | Passed: shared, API, infrastructure and frontend                               |
| npm run typecheck                      | Passed across workspaces and test contracts                                    |
| npm run lint                           | Passed, zero warnings                                                          |
| npm run format:check                   | Passed                                                                         |
| cdk synth --lookups false              | Passed before/following modifications, five dev stacks                         |
| CDK security assertions                | Passed; scoped runtime access, privacy, no AI/expensive compute/public grants  |
| Multiple-origin assertions             | Passed; localhost plus exact HTTPS origin in API/S3/Cognito                    |
| Output helper tests                    | Passed; only four public values, malformed/injected/foreign endpoints rejected |
| PowerShell syntax                      | Passed                                                                         |
| Deployment guard checks                | Historical guard checks passed; updated SSO guard checks recorded below        |
| Source/frontend secret-pattern scan    | Passed for current unconfigured build; not a configured hosted-build audit     |
| Ignore verification                    | .env.local and .deployment outputs are ignored                                 |
| git diff --check                       | Passed                                                                         |
| Real STS                               | SSO assumed role verified; account and ARN withheld                            |
| Bootstrap/diff/deploy/live integration | Bootstrap absent; full diff passed; deploy/live tests pending                  |
| Amplify/live CloudWatch                | Not run; no URL obtained                                                       |

The first ad hoc guard-test attempt had incorrect PowerShell mock scope and did
not model a root response; it failed. Correcting the mock scope produced the three
passing checks above without altering the guard. Live STS rejection is independent
evidence; no real AWS call occurred during mock tests.

No new dependencies, access keys, JWTs, real environment values, uploaded data or
AI resources were added. Existing Zod annotation notices, SDK bundle size notices
and CDK feature-flag information remain nonfatal. CDK IAM wildcard exceptions are
the existing documented logging permissions and private-object/function ARN
suffixes, not broad table/AI grants. Deployed-role verification remains pending.

Full status: [Phase 4](PHASE4_DEPLOYMENT.md). Precise live checks:
[integration](INTEGRATION_TESTING.md). Phase 4 is blocked and Phase 5 has not begun.

## Historical Phase 3 results

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

Updated SSO helper: five mocked checks passed (root rejected, IAM user rejected,
wrong account rejected, assumed role accepted, Deploy action unavailable). Each
mocked call also verified waste2watt-sso/us-east-1; no real AWS calls occurred.
