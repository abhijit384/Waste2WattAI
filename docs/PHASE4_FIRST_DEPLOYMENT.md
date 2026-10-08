# Phase 4 first development deployment

Completed 2026-10-08 under explicit user authorization. Only account
`415150458314`, profile `waste2watt-dev` and region `us-east-1` were used from
`E:\Waste2WattAI`. STS was reverified as
`arn:aws:iam::415150458314:user/waste2watt-developer` immediately before execution.
Credential/role environment overrides were cleared; profile and both region
variables were checked. Bootstrap was not rerun. Existing Git changes were preserved.

## Predeployment validation

`git status --short` confirmed existing modified/untracked Phase 4 work.
`npm run check` passed typecheck, lint, formatting, all 59 tests (21 Node, two
Python, 16 CDK and 20 frontend) and all workspace builds. An initial invocation
stopped on passing Python diagnostics because PowerShell treated native stderr
as fatal; the corrected invocation passed.

Fresh synthesis with lookups disabled passed. `cdk list` discovered exactly the
five dev stack names below. Fresh template hashes matched the reviewed templates.
Fresh template-only diff showed 61 resource additions, zero modification/deletion
entries and no replacements. No forbidden expensive resource, public storage or
unexpected IAM change was found. Existing CDKToolkit remained CREATE_COMPLETE,
version 32, with termination protection. Lambda concurrency remained 10, shared
without development reservations.

## Deployment and outputs

Executed from `infra` using the project-pinned CLI:

```powershell
node ../node_modules/aws-cdk/bin/cdk deploy Waste2WattDataStack-dev Waste2WattAuthStack-dev Waste2WattApiStack-dev Waste2WattPipelineStack-dev Waste2WattObservabilityStack-dev --profile waste2watt-dev --region us-east-1 --lookups false -c stage=dev -c region=us-east-1 -c frontendOrigin=http://localhost:5173 --require-approval broadening --concurrency 1 --outputs-file E:/Waste2WattAI/.deployment/cdk-outputs.json
```

CDK deployed in valid dependency order: Auth, Data, Pipeline, API, Observability.
Normal security prompts were preserved. Pipeline and API permissions matched the
reviewed baseline and were accepted under explicit deployment authorization.
`--require-approval never` was not used. Deployment exited zero.

| Stack                            | Status          | Resources |
| -------------------------------- | --------------- | --------- |
| Waste2WattDataStack-dev          | CREATE_COMPLETE | 5         |
| Waste2WattAuthStack-dev          | CREATE_COMPLETE | 4         |
| Waste2WattApiStack-dev           | CREATE_COMPLETE | 27        |
| Waste2WattPipelineStack-dev      | CREATE_COMPLETE | 18        |
| Waste2WattObservabilityStack-dev | CREATE_COMPLETE | 7         |

All 61 resources independently verified complete. No failed stack events or
unexpected resources were found. The final read-only CDK diff reports zero stacks
with differences; this is a template comparison, not a full live drift audit.

API: `https://c2ntcib53m.execute-api.us-east-1.amazonaws.com`.
Cognito pool: `us-east-1_yeSnElyWb`. Public client: `6bm90i6dleurqgrieurnanfvr`.
Required outputs, exports and inventory remain locally in ignored
`.deployment/cdk-outputs.json` and `.deployment/deployed-resources.json`.

## Live service and security verification

- Cognito: email sign-in, deletion-protected pool, public SRP client without
  secret, token revocation. Live plan is ESSENTIALS; dev MFA is optional.
- API Gateway: nine JWT/scope-protected application routes and exact localhost
  CORS. Missing/invalid tokens return 401; ID token use is rejected with 403.
  Configured throttles remain 10 requests/second with burst 20.
- S3: all public-access blocks enabled, AES256 managed encryption, versioning,
  TLS-only policy and native EventBridge notifications. Actual-object unsigned
  GET and unsigned listing return 403.
  Unsigned S3 preflight allows the exact localhost origin and rejects an
  untrusted origin with 403 and no allow-origin header.
- DynamoDB: three ACTIVE on-demand tables with deletion protection and PITR.
- Lambda: three active ARM64 Node.js 22 functions, no reserved concurrency.
  Runtime roles grant no IAM administration, Bedrock or SageMaker actions.
  Scoped data access and previously reviewed wildcard logging permissions remain.
- EventBridge: both rules enabled with targets; genuine S3 delivery observed.
- Step Functions: active Standard workflow, error logging without execution data,
  bounded retries and unfinished-analysis guard.
- CloudWatch: seven alarms present; notification actions remain unconfigured.
  Expected stub failures may produce error/failure alarms.

Content/malware inspection remains deferred. Declared MIME and size do not prove
content safety. Stateful resources retain data; tables/pool have deletion
protection, while dev application stacks lack termination protection. Private
uploads expire after 30 days and noncurrent versions after seven days. Verification
did not silently change these reviewed settings.

## Low-volume integration results

One real user registered through the deployed public client and proved mailbox
ownership with normal confirmation. A wrong code was rejected. The first test
process exited while waiting for stdin, losing its in-memory temporary password.
The resumed run completed normal email password recovery, SRP sign-in and sign-out,
without administrative confirmation or password override. The completed run
exited zero. Passwords, codes, JWTs and signed POST fields were not saved to reports
or evidence files; session tokens stayed in memory.

Owned scan creation returned 201; list/get returned 200. A separately seeded,
clearly labeled foreign-owner fixture exists in DynamoDB. The signed-in user
received 404 for both get and upload-policy requests for it. This tests the
existing foreign-owner boundary, not a second confirmed user's browser flow.
Unsupported MIME, oversized input and owner/key injection returned 400. Signed
key tampering returned 403; signed size mismatch returned 400.

One tiny valid PNG uploaded via signed POST returned 204. The policy bound owner
and scan prefix, MIME, exact byte count and AES256; HeadObject confirmed metadata.
The genuine S3 event reached EventBridge and Step Functions without manually
starting the workflow. Entered stages were ValidateImage, ClassifyWaste,
MarkScanFailed and RecordAnalysisFailure. Execution ended FAILED. API and the
exact DynamoDB record both showed `FAILED / ANALYSIS_NOT_IMPLEMENTED`. Later AI
stages were not entered and no fabricated analysis values appeared. The encrypted
failure queue held two diagnostics messages, consistent with workflow and
terminal-event reporting. Deferred dashboard API returned explicit 501
NOT_IMPLEMENTED.

All five test-interval log groups were scanned in memory for JWT, access-key,
private-key and Authorization/Bearer patterns with no matches. This bounded scan
does not prove absence of every possible sensitive string.
`scripts/configure-frontend.mjs` generated ignored `apps/web/.env.local` with only
four public settings. Its configured frontend build passed; the five output files
had no credential-pattern matches or environment/credential files.

Remaining acceptance checks: browser UI sign-up/sign-in, protected-route redirects,
hard-refresh/cookie restoration, a second confirmed user's full flow, JPEG/WebP
uploads and hosted-origin checks. No Amplify Hosting was created or published.

Retained test artifacts: one confirmed account, one tiny PNG, one owned failed
scan, one foreign-owner fixture and queue diagnostics. Both rows explicitly
identify test fixtures and make no real waste/sustainability claim. The test
password existed only in memory; use normal password recovery to access the
account later. No broad cleanup/deletion was performed.

## Costs and authorization boundaries

No EC2, NAT Gateway, RDS, EKS, SageMaker endpoint, provisioned Bedrock throughput,
customer-managed KMS key, Organizations or Identity Center resource was created.
No paid service outside the reviewed five stacks was added. Bootstrap storage
remains from the earlier authorized operation. No model was invoked; Phase 5
did not begin.

Seven standard alarm metrics have a gross full-month list-price estimate of
USD 0.70, calculated locally as seven times USD 0.10 before allowances/credits and
proration. See [CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/).
This excludes all other charges. Actual accrued charges have not yet been verified
and billing can lag. Variable costs include Cognito ESSENTIALS users, API/Lambda
requests/execution, DynamoDB requests/storage/PITR, versioned S3 storage/requests,
workflow/event/queue usage, logs and asset storage. No total monthly forecast or
credit coverage is claimed.

Evidence remains ignored under `.deployment`: `first-deploy-check.txt`,
`first-deploy-synth.txt`, `first-deploy-list.txt`, `first-deploy-diff.txt`,
`pre-deploy-reviewed-hashes.json`, `resource-verification.json`,
`live-integration-results.json`, `test-evidence-verification.json`,
`configured-frontend-build.txt`, `post-deploy-diff.txt`, outputs and inventory.

Stop here. Hosting requires separate review and authorization. Further
infrastructure changes and Phase 5 are not authorized by this completed deployment.
