# Project verification ledger

Updated 2026-10-08 for the local Phase 6–8 continuation. No AWS resource, account setting, or queue operation was performed in this continuation; Bedrock remains disabled. Phase 4 signup, email confirmation, authentication, mobile upload and history outcomes were user-confirmed in [final acceptance](PHASE4_FINAL_ACCEPTANCE.md).

The final `npm run check` passed: 35 TypeScript, 33 Python, 18 CDK, and 24 frontend tests (110 total); typechecks, ESLint, Prettier, Ruff, workspace builds, and frontend production build passed. The in-sandbox Vitest attempt was blocked by Windows Vite `EPERM` resolving project realpaths before tests started; the full check was rerun outside the sandbox and passed. Only upstream Zod `@__PURE__` comment-position warnings remain in the production bundle.

The local ML baseline trained/evaluated on 977 cleaned images from a rights-reviewed 989-file CC BY 4.0 release. Its held-out source-group test reached 45.38% accuracy and 28.15% macro-F1 across four supported classes; Glass had no test examples. It is not production-ready or connected to hosted scans. Digital Twin/dashboard analytics, cited-input scenario math, responsive pages, deterministic agent tool contracts, and the demo guide are local changes. New pages have automated component tests, but no new physical Android run or hosted browser acceptance of these un-deployed changes is claimed. Local CDK synthesis passed, and a fresh guarded diff (Phase 5 analysis included, inference disabled, exact Amplify origin) found zero differences across all five deployed stacks. No AWS resource change or model invocation occurred. See [model report](PHASE6_LOCAL_MODEL_REPORT.md) and [completion tracker](FINAL_COMPLETION_TRACKER.md).

Historical Phase 3/4/SSO details follow; they are not current deployment instructions. See [new account review](PHASE4_NEW_ACCOUNT_REVIEW.md) for the original account-scope record.

## Historical Phase 3 verification

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

## Phase 5B Stage 1 pre-deployment gate — 2026-10-08

The complete `npm run check` passed: typechecks, lint, formatting, Ruff, builds and 100 tests (31 Node/API/shared, 29 Python, 17 CDK, 23 frontend). Production Vite build passed with two nonfatal upstream Zod annotation warnings. Opt-in CDK synthesis passed for account 415150458314, us-east-1, analysis enabled, and inference disabled. The guarded fresh AWS diff verified the non-root `waste2watt-developer` IAM user and found differences only in Data, API and Pipeline; Auth and Observability are unchanged. Data contains two exports for existing DailyMetrics. API contains an existing Lambda code asset update. Pipeline has the seven reviewed additions plus existing ScanStatus code/environment, invoke policy, and state-machine updates. No replacements/deletions appear; the exact-model permission is scoped to `bedrock:InvokeModel` on the Nova Lite ARN. The disabled workflow routes an intentional `ANALYSIS_UNAVAILABLE` outcome around the SQS failure path.

**Deployment stopped at the user's material-diff gate.** The disabled workflow/ScanStatus additions materially extend the previously reviewed Phase 5A diff. No CloudFormation change set or deployment was started, no live resources were altered, no Bedrock model was invoked, and no SQS messages/attributes were read or changed. Linux Python 3.12 x86_64 package contents and configured handler/runtime/memory/timeout were inspected locally only; Lambda startup and role permissions remain unverified in AWS. CloudFormation state, post-deploy logs, live API/history/upload health, and final five-stack zero-diff are pending a new approval for the revised diff.

## Phase 5B Stage 1 deployment and startup gate — 2026-10-08

After explicit approval of the revised diff, `npm run check` passed again with 100 tests and all typechecks, lint, formatting, Ruff and builds. Opt-in synthesis and the guarded fresh diff matched the approved Data/API/Pipeline scope. The three stacks deployed in dependency order and reached `UPDATE_COMPLETE`; Auth and Observability were unchanged. The immediate post-deployment guarded diff across all five stacks reported zero differences. The new Lambda is Active, Python 3.12/x86_64, 512 MB, 60 seconds, and both it and ScanStatus have `AI_INFERENCE_ENABLED=false`. Its live role has the reviewed exact-model Bedrock grant and scoped S3, DynamoDB and log permissions. The deployed Step Functions definition has the explicit disabled branch and no inference retry.

The one safe `HealthCheck` invocation returned `FunctionError: Unhandled` before handler startup. CloudWatch shows `TypeError: 'default' is an invalid keyword argument for typevar()` in `referencing.typing`. The Python 3.12 package lacked `typing_extensions`, a conditional `referencing` dependency that the Python 3.14 packaging host omitted. Locally, the dependency was pinned explicitly and the packaging script now ignores host-installed packages and checks for `typing_extensions.py`; the Linux package rebuilt successfully. The fresh diff after that local fix shows only the new analysis Lambda code asset in Pipeline. It has not been redeployed. A new upload was withheld to avoid triggering a known failure and adding an intentional test message to SQS.

The first controlled upload failed at `Phase5ValidateImage`: the disabled Lambda guard raised `ANALYSIS_UNAVAILABLE` before the later Choice could run. Sanitized CloudWatch logs confirmed the code. The approximate failure-queue count rose from 20 to 22; no bodies were read and no messages were otherwise changed. A reviewed local fix moved the existing `analysisEnabled` Choice immediately after `Phase5UploadValidation`, before invoking the analysis Lambda. The regression test asserts this order and the controlled unavailable target. Full `npm run check` passed with 101 tests (31 TypeScript/API/shared, 29 Python, 18 CDK, 23 frontend), plus workspace builds, lint, formatting and Ruff. Opt-in synth passed. The fresh guarded diff showed only the existing Pipeline state-machine `DefinitionString`; other four stacks had zero differences, with no IAM/resource changes. Pipeline reached `UPDATE_COMPLETE` at 2026-10-08T14:33:56Z. HealthCheck returned READY with inference false. A second controlled upload succeeded through `Phase5MarkAnalysisUnavailable` and `AnalysisUnavailableAsExpected`; SQS remained 22 visible, zero delayed and zero in-flight. No Bedrock call occurred.

The second upload's history request returned HTTP 200 from the API, but the existing in-memory frontend initially rejected the response schema. API logs show scan creation, upload URL, status polls and history returning 2xx at INFO. A six-file frontend/shared-schema commit (`2e9598d`) passed a secret-pattern scan and was pushed normally to verified private GitHub `main`; remote main was confirmed at that commit. Amplify job 3 SUCCEEDED. A fresh authenticated `/history` tab shows the second scan as FAILED with `ANALYSIS_UNAVAILABLE` and no analysis result; browser console errors are empty. The first failed scan was not replayed; the queue count remains 22, and no message was read, removed or replayed. Stage 1 disabled-inference acceptance passed. See [the Stage 1 deployment report](PHASE5_STAGE1_DEPLOYMENT.md).

## Phase 5 final stabilization recheck — 2026-10-08

The final `npm run check` passed with the existing project Ruff executable added to the process PATH from `E:\Waste2WattAI\.venv\Scripts`: TypeScript checks, ESLint, Prettier, Ruff, 31 TypeScript/API/shared tests, 29 Python tests, 18 CDK tests, 23 frontend tests, and all workspace production builds. The frontend Vite build emitted two non-fatal upstream Zod annotation warnings. Opt-in CDK synthesis passed with analysis configured and inference disabled. A guarded fresh read-only diff verified `waste2watt-developer` in account `415150458314`, preserved the exact Amplify HTTPS origin, and reported zero differences for Data, Auth, API, Pipeline and Observability. No AWS deployment occurred in this recheck.

Read-only Bedrock availability reports `NOT_AUTHORIZED` for Nova Lite, Nova Pro and Nova 2 Lite, while region, agreement and entitlement are available. IAM simulation allows `bedrock:InvokeModel` for the developer identity; the deployed runtime role remains scoped to the exact Nova Lite ARN. The AWS console says the manual model-access page is retired. One bounded text-only Nova Lite request was rejected with `ValidationException: Operation not allowed`, with no output or usage metadata. No permissions, account settings or Marketplace agreements were changed; both runtime flags remain false. This is a live inference blocker, and no classification accuracy is claimed.
