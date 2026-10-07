# Phase 2 infrastructure

AWS CDK v2 TypeScript defines infrastructure locally. Nothing is deployed or
bootstrapped. No AWS account change, upload, model call, endpoint, factor seed,
conversion, or application business logic is implemented.

## Defined resources

| Stack         | Resources                                                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Data          | Private versioned image bucket and TLS policy; WasteScans, DailyMetrics, RecoveryFactors tables; owner/time scan GSI                   |
| Auth          | Cognito pool, public web client, resource server/access scope, login domain                                                            |
| API           | HTTP API, default stage, JWT authorizer, nine routes, bundled existing Lambda placeholder, execution/invocation permissions            |
| Pipeline      | Standard state machine, six Task states, shared worker stub, encrypted SQS failure queue, two EventBridge rules, scoped roles/policies |
| Observability | Six alarms: API Lambda errors, worker errors, execution failures/timeouts, queue backlog, upload-rule delivery failures                |

Four explicit retained log groups use 30-day retention: API Lambda, HTTP access,
pipeline Lambda, and workflow errors. Log groups live with their producer stacks,
avoiding a circular dependency. CDK cross-stack references flow Auth → API,
Data → Pipeline, and API/Pipeline → Observability. The default EventBridge bus is reused.
No alarm subscribers/actions or frontend hosting resources are defined.

## Security decisions

- S3 blocks public access, enforces bucket ownership and TLS, uses AES256 server-side
  encryption, and allows browser PUT CORS from only the configured frontend origin.
- Demo uploads/ expire after 30 days; noncurrent versions expire after 7 days and
  incomplete multipart uploads after 1 day. Production keeps current versions and
  expires noncurrent versions in 30 days. The bucket is always retained.
- Tables use PAY_PER_REQUEST, AWS-managed encryption, PITR, deletion protection,
  and retention. The pool also has deletion protection/retention. Production
  Data/Auth stacks additionally have termination protection.
- Cognito verifies email and requires passwords of at least 12 characters with all
  four character categories. TOTP MFA is optional in dev/staging and required in
  prod. The public code-flow client has no secret and supports token revocation.
  Phase 3 frontend must implement PKCE. Every application route requires the pool
  JWT issuer, web-client audience, and waste2watt-api/access scope.
- Origins reject wildcards, credentials, paths, and trailing slashes. HTTPS is
  mandatory outside dev; dev permits HTTP localhost/127.0.0.1.
- Placeholder roles only write their own logs. No S3, DynamoDB, Bedrock, SageMaker,
  or SQS permissions are granted to Lambda. The workflow may invoke only its
  worker and send to its one queue. EventBridge may start only this workflow;
  its queue send policies are restricted to the specific source rules.
- API access logs omit tokens, bodies and signed URLs. Workflow logs exclude
  execution data; Standard execution history and DLQ records still contain metadata
  and errors, so operator access must be restricted before deployment.

## Exact wildcard exceptions

No application execution policy grants wildcard Allow actions. Unit tests check
that account-wide Allow resources are limited to required logging control actions.

| Location              | Wildcard                                | Reason                                                                                                                                                                                                                                       |
| --------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow log delivery | Resource *                              | logs:CreateLogDelivery, GetLogDelivery, UpdateLogDelivery, DeleteLogDelivery, ListLogDeliveries, PutResourcePolicy, DescribeResourcePolicies, DescribeLogGroups require unscoped delivery configuration; no other account-wide Allow actions |
| Lambda log writes     | Explicit log group ARN stream suffix *  | Dynamic execution streams; only CreateLogStream/PutLogEvents within the function's group                                                                                                                                                     |
| Workflow invocation   | Specific worker ARN qualifier suffix :* | CDK invocation grant covers that function's versions/aliases, not unrelated functions                                                                                                                                                        |
| API Lambda permission | Execute-API ARN stage/method suffixes   | Invocation is bound to this HTTP API and its route pattern; concrete request stage/method ARNs are not known at synthesis                                                                                                                    |
| S3 TLS policy         | Deny s3:_, object ARN /_, Principal *   | Reject insecure access for every operation/principal on this bucket and its objects; grants no access                                                                                                                                        |
| SQS TLS policy        | Deny sqs:*, Principal *                 | Reject insecure operations on this one queue; grants no access                                                                                                                                                                               |

Required Step Functions logging wildcards are explained in the
[AWS logging documentation](https://docs.aws.amazon.com/step-functions/latest/dg/cw-logs.html).
HTTP API access-log activation needs future deployment-role log-delivery permissions
described by [AWS](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging.html).
No bootstrap/deployment roles are defined or created in this phase.

## Safe pipeline and failure handling

ValidateImage → ClassifyWaste → VerifyWithBedrock → RecoveryEngine → PersistResult
→ UpdateDailyMetrics are six Lambda Tasks backed by one stub that always throws
Phase3NotImplemented. Bounded service-error retries do not retry this deliberate
error. Each task catches failure, sends a diagnostic to SQS, and ends in Fail. A
final guard sends unexpected stub success to the same failure path. No source image
is read and no scan or metric is written.

The upload rule matches this bucket and uploads/ only. It retries target delivery
twice, for at most 24 hours, and uses the queue as its delivery DLQ. A second rule
forwards workflow FAILED/TIMED_OUT/ABORTED status events, including execution-level
failures that cannot enter a task catch. Caught failures can therefore create both
a diagnostic and a status-event message. Queue consumers must identify the different
message shapes and deduplicate by execution ARN. There is no consumer/automatic redrive.

S3/EventBridge delivery is not exactly once. Durable object-version idempotency,
scan/owner correlation, replay and transactional metric updates are deferred.
DLQ/status-event delivery is not a replacement for a business job ledger.

## Configuration and outputs

Defaults: dev, us-east-1, http://localhost:5173. CDK context overrides W2W environment
variables. Production requires an explicit HTTPS origin. Account remains an
AWS::AccountId token; no secrets/account IDs are stored. See [DEPLOYMENT.md](DEPLOYMENT.md).

Required outputs: ApiUrl, UserPoolId, UserPoolClientId, ImageBucketName,
WasteScansTableName, DailyMetricsTableName, RecoveryFactorsTableName, StateMachineArn.
Additional outputs: LoginDomainUrl, AnalysisFailureQueueUrl.

## File inventory

Created under infra/: cdk.json; src/app.ts; src/application.ts; src/paths.ts;
src/synth.ts; src/lambda/pipeline-handler.ts; five src/stacks/*-stack.ts files;
tests/infrastructure.test.ts; tsconfig.test.json. Created this document.

Modified infra/package.json, infra/tsconfig.json, infra/src/config.ts, infra/README.md;
root package.json, package-lock.json, AGENTS.md, .env.example, .gitignore,
.prettierignore, eslint.config.js, README.md, tests/README.md; and docs/ARCHITECTURE.md,
docs/API.md, docs/DATA_MODEL.md, docs/DEPLOYMENT.md, docs/VERIFICATION.md.

All dependencies, caches, build/test outputs and synthesized templates stay inside
E:\Waste2WattAI and are ignored where appropriate. No application runtime source
outside infra/ was modified.

## Phase 3 deferred

Frontend sign-in/PKCE and hosting; real handlers and runtime validation; owner checks;
constrained presigned URLs; image validation; Python classification; Bedrock/SageMaker;
Strands agent/tools; approved factor ingestion; science-backed recovery calculations;
idempotent persistence/metrics; queue replay; cost budgets; alarm actions; runtime
integration tests; and explicit authorization for future deployment.

No numeric recovery factors, model accuracy, emissions savings, or environmental
benefits are fabricated. See [verification results](VERIFICATION.md).
