# Phase 5B Stage 1 deployment report

Report date: 2026-10-08. Account `415150458314`, region `us-east-1`, profile `waste2watt-dev`.

**Outcome: Phase 5B Stage 1 is deployed and disabled-inference acceptance passed.** The analysis Lambda passes a safe non-inference health check. A fresh uploaded scan followed the disabled branch, the Step Functions execution succeeded, and the hosted history page displays `ANALYSIS_UNAVAILABLE` without an analysis result. Inference remains disabled; no Bedrock model invocation occurred.

## Pre-deployment gate

The guarded STS check confirmed the non-root `arn:aws:iam::415150458314:user/waste2watt-developer` identity and intended region/account. STS does not establish MFA. The pre-deploy `npm run check` passed 100 tests; after adding the workflow-order regression test, the complete suite passed 101 tests: 31 TypeScript/API/shared, 29 Python, 18 infrastructure, 23 frontend. Opt-in CDK synthesis passed with `W2W_PHASE5_ANALYSIS=true` and `W2W_PHASE5_INFERENCE_ENABLED=false`.

The fresh diff matched the revised approval: Data added two exports of the existing DailyMetrics table; API updated the existing Lambda code asset; Pipeline added exactly seven resources (analysis log group, scoped role/policy, Python Lambda, error alarm, two token metric filters) and updated the existing ScanStatus code/environment, state-machine invoke policy, and state-machine definition. Auth and Observability had no differences. No resource replacement, deletion, unrelated infrastructure, expensive compute, or broader model permission appeared.

## Deployment and live configuration

Data, API, then Pipeline were deployed individually, with an identity check and the inference flag set to false for each deployment. CloudFormation reports `UPDATE_COMPLETE` for those three stacks. Auth remains `UPDATE_COMPLETE`; Observability remains `CREATE_COMPLETE`. The immediately following guarded five-stack CDK diff found **zero differences**.

The deployed analysis Lambda is Active with successful configuration update, Python 3.12, Linux x86_64, handler `waste2watt_analysis.runtime.handler`, 512 MB, and a 60-second timeout. Both the analysis Lambda and ScanStatus Lambda have `AI_INFERENCE_ENABLED=false`. The deployed Step Functions definition starts at `Phase5UploadValidation`; its false flag branch routes to `Phase5MarkAnalysisUnavailable` and a `Succeed` state. Its Bedrock task has no retry. The role's live inline policy grants only `bedrock:InvokeModel` on `arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0`, `s3:GetObject`/`s3:GetObjectVersion` on the existing bucket's `private/*`, `dynamodb:GetItem`/`dynamodb:UpdateItem` on the existing scan/metrics tables, and log-stream writes in the dedicated log group.

## Startup failure and deployed repair

One explicit non-inference `HealthCheck` invoke returned Lambda `FunctionError: Unhandled`. The handler did not initialize. The response and dedicated CloudWatch startup log show `TypeError: 'default' is an invalid keyword argument for typevar()` while importing `referencing.typing` through `jsonschema`. The staged artifact lacked `typing_extensions`, which `referencing==0.37.0` requires on Python versions below 3.13. The package was prepared on a Python 3.14 host for a Python 3.12 target; the conditional dependency was omitted. The log shows only runtime stack traces and no credentials, tokens, request bodies or images.

Locally, `typing-extensions==4.16.0` was pinned explicitly and `prepare-analysis.ps1` was changed to use `--ignore-installed` and fail if `typing_extensions.py` is absent. The package rebuilt successfully with Python 3.12 Linux x86_64 wheels, including CPython 3.12 Pillow and `rpds` binaries. The user then explicitly authorized this isolated Pipeline Lambda code-asset repair. The Pipeline stack reached `UPDATE_COMPLETE` at 2026-10-08T14:09:47Z. The analysis Lambda is Active, and a safe one-time `HealthCheck` invocation returned status 200 with `{"status":"READY","inferenceEnabled":false}` and no `FunctionError`. Its fresh cold-start log contains no import/runtime error. The final guarded five-stack CDK diff reports zero differences.

## Live acceptance and queue safety

The hosted HTTPS session remained authenticated. The first controlled upload exposed a workflow-ordering bug: `Phase5ValidateImage` ran before the `analysisEnabled` Choice, so the disabled Lambda gate raised `ANALYSIS_UNAVAILABLE`; the failure handler ended the execution as `AnalysisFailed`. A sanitized CloudWatch log confirmed the error. The queue's approximate visible count rose from 20 to 22 during that test; no messages were read, deleted, purged, redriven, or replayed.

The correction moves the existing inference Choice immediately after authenticated upload validation and before `Phase5ValidateImage`. The fresh CDK diff contained only the existing Pipeline state-machine definition. After that Pipeline-only deployment, a second controlled upload produced a `SUCCEEDED` Step Functions execution through `Phase5UploadValidation` → `AnalysisInferenceEnabled` → `Phase5MarkAnalysisUnavailable` → `AnalysisUnavailableAsExpected`. SQS remained at 22 visible, zero delayed and zero in-flight. API logs show the create, upload URL, status polling and history routes returning 2xx at INFO severity, without request bodies or credentials. The old in-memory frontend initially rejected the history payload because its schema was stale. A secret-scanned frontend/shared-schema commit (`2e9598d`) was pushed to private `main`; Amplify job 3 SUCCEEDED. A fresh authenticated tab loaded `/history` and showed the new scan as FAILED with “Analysis is unavailable. No result was generated”; the browser console had no errors. The first failed scan was not replayed.

Before the controlled scans, the queue had 20 visible messages. The first scan added two failure reports as the disabled-ordering bug reached the failure handler; the approximate visible count became 22. After the fix, the second scan completed the disabled branch and the count remained 22 (zero delayed, zero in-flight). No message body was read; no message was purged, deleted, replayed or redriven. The successful second upload verifies the intended disabled path.

## Bedrock authorization and cost

Read-only availability checks report region, agreement and entitlement `AVAILABLE`, but `authorizationStatus=NOT_AUTHORIZED` for Nova Lite, Nova Pro and Nova 2 Lite. The developer IAM simulator allows the exact Nova Lite `InvokeModel` action; the developer IAM user has a pre-existing `AdministratorAccess` attachment. The Bedrock model-access console states that manual access activation is retired and serverless models activate on first invocation. One bounded text-only Nova Lite `Converse` request (maximum 16 output tokens, no user image) returned `ValidationException: Operation not allowed`, with no output or usage metadata. No model-access, IAM, Marketplace, or account setting was changed. This remains an external authorization blocker; runtime invocation must remain disabled.

The deployments and single safe Lambda diagnostic can incur ordinary CloudFormation asset storage, Lambda, CloudWatch, alarm/custom metric and Step Functions costs. The new log group has one-month retention. No provisioned throughput, SageMaker endpoint/training, historical backfill, load test or model inference was used. Actual model token spend was zero for this Stage 1 run. Existing budget and billing settings were not changed.

## Next gate

Stage 1 disabled-inference acceptance is complete. Before another live inference request, clarify why Bedrock returns `NOT_AUTHORIZED`/`Operation not allowed`; do not add broad IAM permissions, purchase a Marketplace subscription or try more providers as a workaround. The deployed five-stack CDK diff was zero after the workflow fix.
