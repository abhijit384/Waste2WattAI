# Phase 4 — new account deployment review

Bootstrap and the first five-stack development deployment were subsequently
separately approved and completed. See [current deployment](PHASE4_FIRST_DEPLOYMENT.md) and
[bootstrap completion](PHASE4_BOOTSTRAP.md) for current live status and the fresh
post-bootstrap diff. The review below records the earlier pre-bootstrap state.

## Current review: verified developer profile

Reviewed 2026-10-08. Only `waste2watt-dev` and `us-east-1` were used for AWS
calls during this review. No bootstrap, deployment, change set, asset publication,
quota request, model invocation, data upload or AWS resource change occurred.
The earlier root-profile review below is historical and superseded.

STS returned account `415150458314` and
`arn:aws:iam::415150458314:user/waste2watt-developer`, matching the intended second
account recorded in this project. This is the exact non-root IAM user requested.
IAM GetUser independently confirmed the same ARN and user ID. STS does not prove MFA.
The read-only helper now fixes the developer profile, clears credential/role
environment overrides and requires the exact ARN and account before further actions.
Active deployment, integration and troubleshooting instructions use this profile.
No AWS credential files or persistent shell defaults were changed.

### Readiness results

| Check                         | Result                                                                                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity                      | Correct non-root developer IAM user and second account                                                                                                            |
| Lambda                        | Concurrency 10, unreserved 10, function count 0; Service Quotas confirms 10                                                                                       |
| Dev concurrency configuration | Three Lambdas; no reserved or provisioned concurrency                                                                                                             |
| Local checks                  | `npm run check` passed: typecheck, lint, formatting, 59 tests and all builds                                                                                      |
| Synthesis                     | All five dev stacks passed with `--lookups false` and the developer profile                                                                                       |
| CDK diff                      | Template-only diff passed for all five stacks in 415150458314/us-east-1: 61 resource additions; zero modification, deletion or replacement entries                |
| Existing resources            | CloudFormation lists no stacks; DynamoDB lists no tables; Cognito lists no user pools                                                                             |
| Bootstrap status              | Specific CloudFormation ValidationError: `CDKToolkit` does not exist                                                                                              |
| IAM                           | AdministratorAccess attached; no user boundary reported, inline policies or groups; all 15 sampled bootstrap actions simulated as allowed without missing context |

IAM simulation covered CloudFormation create/read/protection, IAM role creation,
policy attachment/update and PassRole, S3 bucket creation/policy/encryption, ECR
creation/policy, SSM parameter writing and STS AssumeRole. Simulation and policy
inspection are readiness evidence, not proof that every future write will succeed;
organization controls and service-specific constraints were not fully audited.

| Stack         | CloudFormation resources | Scope                                                                        |
| ------------- | ------------------------ | ---------------------------------------------------------------------------- |
| Data          | 5                        | Private versioned S3 bucket/policy and three on-demand DynamoDB tables       |
| Auth          | 4                        | Cognito pool, client, resource server and domain                             |
| API           | 27                       | JWT-protected HTTP API, Lambda, logs and scoped IAM                          |
| Pipeline      | 18                       | Two Lambdas, Step Functions, EventBridge, failure queue, logs and scoped IAM |
| Observability | 7                        | Seven metric alarms without notification actions                             |

The diff's missing bootstrap lookup-role warning falls back to the selected
developer profile in the same verified account; it does not select an old profile.
The first helper attempt stopped because Windows PowerShell treated CDK's
informational stderr message as a fatal error. The helper now checks the native
exit code; the rerun passed. Synthesis reported unconfigured feature flags and
Vite reported dependency annotation warnings; neither caused a check failure.

### Destructive changes, IAM and cost risks

No existing resource is proposed for modification, deletion or replacement.
Bucket, tables, user pool, queue and logs have retain policies; tables and pool
have deletion protection. Dev stacks lack stack termination protection. Future
uploads remain subject to deliberate lifecycle expiry: current private objects
after 30 days, noncurrent versions after seven days. Retention does not erase costs.

Application IAM grants scoped data, invocation and queue access, with expected
wildcard log-delivery permissions. It grants no Bedrock/SageMaker invocation or
IAM administration. No NAT Gateway, EC2, RDS, EKS, SageMaker endpoint, Bedrock
provisioned throughput or always-on compute is proposed.

Bootstrap adds private S3 asset storage, ECR, SSM metadata and five IAM roles.
The reviewed local template has bootstrap version 32. Use termination protection,
`--bootstrap-kms-key-id AWS_MANAGED_KEY` and no extra cross-account trust.
The prepared runbook command explicitly attaches AdministratorAccess to the
CloudFormation execution role; this broad permission must be included in any
approval. A scoped execution policy would require a separate policy review.
See [AWS bootstrap permissions and resources](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping-env.html).

Bootstrap storage/requests can incur charges. Application costs can include
on-demand requests, S3/DynamoDB storage, PITR, logs, alarms and workflow retries.
No new numerical monthly forecast or credit verification is claimed.
Budgets API currently lists cost budgets of USD 40 (`My Monthly Cost Budget`),
USD 60 (`My Monthly Cost Budget__claude`) and USD 30 (`amazon ml challenge`).
Their notifications and filters were not verified; no budget was changed.
Budgets do not establish a hard spending cap. The prior reported credit balance
below remains unverified historical information.

### Decision

**Bootstrap is now technically ready and reasonable to approve for
415150458314/us-east-1 using waste2watt-dev**, with explicit acceptance of the
reviewed broad CloudFormation execution permission and possible storage charges.
No identity, quota or destructive-diff blocker remains for this dev review.
The concurrency quota remains suitable only for limited development use and can
throttle. Bootstrap authorization and application deployment authorization remain
separate. Stop here pending explicit bootstrap authorization; no AWS write is authorized.

Fresh local evidence is saved in ignored `.deployment/dev-profile-check.txt`,
`.deployment/dev-profile-synth.txt`, `.deployment/dev-profile-diff.txt` and
`.deployment/dev-profile-inventory.json`. The full bootstrap command is prepared
in [DEPLOYMENT.md](DEPLOYMENT.md) and has not been executed.

## Historical review: superseded root profile

Review date: 2026-10-08. Project: E:\Waste2WattAI. Only profile
`waste2watt-new` and region `us-east-1` were used for AWS read-only calls.
No bootstrap, deployment, quota request, model invocation, data upload or AWS
resource creation/modification/deletion was performed. Phase 5 has not begun.
Existing uncommitted Phase 4 work was preserved.

## Identity and configuration

`aws sts get-caller-identity --profile waste2watt-new --region us-east-1`
returned account `415150458314`, ARN `arn:aws:iam::415150458314:root`.
**Non-root verification failed.** MFA for the intended developer session was not
verified; STS identity alone does not establish MFA. Correct the profile before
any bootstrap or deployment approval.

The parent environment defaults to `AWS_PROFILE=waste2watt`, the previous profile.
`AWS_DEFAULT_REGION=us-east-1`; `AWS_REGION` was not initially set. The new profile
has no configured region. Existing AWS config/credentials/login-cache paths point
to E:\AWS; no credential files were changed and no secrets were displayed. There
were no AWS access-key/secret/session-token environment variables in the inspected
shell. The config also contains the previous SSO account `858497607763`; no calls
were made using either previous profile. No previous account ID was found in
infrastructure source or active deployment scripts.

The local helper now selects only `waste2watt-new`, sets both region variables,
clears environment credential/role overrides, rejects root and unexpected account
IDs, and permits non-root IAM users or assumed roles. It remains read-only and
does not prove MFA. Active deployment instructions now use the new profile;
previous-account reports are marked historical. Parent shell/profile configuration
was not changed persistently.

## Lambda quota and development adjustment

Lambda GetAccountSettings: concurrency **10**, unreserved **10**, function count
**0**. Service Quotas `L-B99A9384` confirms **10** in `us-east-1`.
The previous templates reserved API=10, status=5 and stub=5, which cannot fit this
account. AWS retains 100 units for unreserved functions when allocating reserved
concurrency; see [AWS concurrency rules](https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html).

Development templates now omit all three reservations. Other stages retain their
existing caps and require separate quota review. No provisioned concurrency is
configured. Authentication, ownership, IAM, upload constraints and API throttling
(10 requests/second, burst 20) remain. Ten shared executions are suitable for
limited development tests, with possible throttling and contention between API
and pipeline functions. This is not evidence of production capacity. No quota
increase was requested.

## Verification

`npm run check` passed: typecheck, zero-warning lint, formatting, all 59 tests
(21 Node, two Python, 16 CDK and 20 frontend), and all four workspace builds.
`cdk synth --lookups false` passed for all five dev stacks. Vite emitted dependency
comment-annotation warnings but built successfully. An initial typecheck caught
an explicit-undefined optional CDK property;
the implementation now omits the property in dev using a conditional spread.
The PowerShell deployment helper parses successfully.

CDK diff uses `--method template` because the default diff method can create
CloudFormation change sets and publish assets. This review prohibits AWS writes.
The installed CLI does not support `--all` for diff; explicit names ensure all five
stacks are covered. Both requested diff and explicit-five-stack diff passed:
61 additions, no deletions or replacements, five new stacks in account
415150458314/us-east-1. Missing lookup-role warnings fell back to the same new
profile; no previous account was queried. Template mode offers conservative
replacement analysis. The initial diff used the freshly generated dev test
assembly; the final diff against `infra/cdk.out` also passed with exactly 61
additions and no deletion/replacement entries. Full diff evidence is saved in
ignored `.deployment/new-account-final-diff.txt`.

## Bootstrap and resource inventory

`DescribeStacks(CDKToolkit)` returned a specific does-not-exist ValidationError.
Default bootstrap is required before deployment with the existing synthesizer;
the templates require deployment/assets bootstrap version 6 or later, and lookup
role metadata requires version 8. Use the reviewed current bootstrap template
rather than an obsolete version. No bootstrap was performed.
Bootstrap would add private asset S3 storage, ECR repository, SSM version metadata,
and deployment/publishing/lookup/CloudFormation IAM roles. Its default execution
policy is `AdministratorAccess`; that requires separate explicit review. Prefer a
reviewed scoped execution policy and `--bootstrap-kms-key-id AWS_MANAGED_KEY`, no
cross-account trust, and termination protection. Do not enable Organizations or
IAM Identity Center.

Application inventory: five stacks and 61 CloudFormation resources.

| Stack         | Main resources                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Data          | Private versioned S3 bucket and policy; three on-demand DynamoDB tables; WasteScans owner index                         |
| Auth          | Cognito user pool, public client, resource server and managed domain                                                    |
| API           | HTTP API, JWT authorizer, nine authenticated routes, one ARM64 Node Lambda and two log groups                           |
| Pipeline      | Two ARM64 Node Lambdas, Standard Step Functions workflow, two EventBridge rules, SQS failure queue and three log groups |
| Observability | Seven standard metric alarms                                                                                            |

The inventory also includes IAM roles/policies, Lambda invoke permissions and queue
policy. Frontend hosting is separate and is not created by these five stacks.

## Security and deletion findings

- S3 blocks all public access, enforces TLS, uses S3-managed AES256 encryption and
  bucket-owner-enforced ownership. API/S3/Cognito origins are exact, without wildcards.
- API routes use Cognito JWT audience/issuer and scope checks. Scan ownership derives
  from validated identity; signed POSTs constrain private key, MIME type, exact size,
  encryption and five-minute expiry. Content inspection remains deferred.
- API IAM permits scoped WasteScans item operations, owner-index Query and private
  S3 PutObject. Status IAM permits scoped item reads/updates and private object reads.
  No model invocation or IAM administration privileges exist in application roles.
- Expected broad logging permissions remain: Lambda's managed basic execution policy
  permits Logs operations on `*`; Step Functions log-delivery operations use `*`.
  Bootstrap's proposed AdministratorAccess is separate from runtime permissions.
- Bucket, tables, user pool, queue and logs retain data. Tables and pool have deletion
  protection. Development stack termination protection is not enabled. Retained
  resources may keep incurring charges after stack deletion.
- Dev S3 lifecycle expires current private uploads after 30 days and noncurrent
  versions after seven days; this is intentional data deletion and must suit test data.
- The seven alarms have no notification actions. They report state in CloudWatch but
  do not email anyone. Pipeline stubs deliberately fail; failure alarms are expected.
- No NAT Gateway, EC2, RDS, EKS, SageMaker endpoint, Bedrock provisioned throughput,
  customer-managed KMS key, Organizations or Identity Center resource is proposed.

## Costs and credit protection

The user reports a Paid plan and **$116.59** promotional credit balance. The balance,
expiry and eligible-service list were not independently verified. Credits cover
only designated eligible services and exclude some charges; see [AWS credit terms](https://aws.amazon.com/awscredits/).

Seven standard alarm metrics have a gross full-month list-price estimate of
**$0.70**, calculated locally from seven times $0.10, before any applicable free
tier/credits. See [CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/).
This is only the alarm component, not the total monthly bill.

| Service                            | Potential charges                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| Cognito                            | Active users/features and email delivery beyond applicable allowances                  |
| HTTP API / Lambda                  | Requests, execution duration and applicable transfer                                   |
| DynamoDB                           | On-demand reads/writes including GSI, table/index storage and PITR on all three tables |
| S3                                 | Requests, versioned object storage and applicable transfer                             |
| EventBridge / Step Functions / SQS | Billable event types, workflow transitions including retries, queue requests           |
| CloudWatch                         | Log ingestion/storage, alarms and optional future notification charges                 |
| Bootstrap                          | S3 asset requests/storage and ECR image storage if used                                |
| Future hosting                     | Amplify builds, hosting storage and transfer; no hosting is created in this review     |

There is no always-on compute in the application templates. Storage, PITR and alarms
can cost money with little traffic. A complete dollar forecast requires active-user
counts, request/execution volumes, durations, retained bytes and transfer; no hard
spend cap exists. On-demand DynamoDB does not imply provisioned free-tier request
allowances; see [DynamoDB pricing](https://aws.amazon.com/dynamodb/pricing/).

Recommended, not enabled: a $5 monthly gross-cost budget excluding credits/refunds,
actual alerts at $1/$3/$5 and a forecast alert at $5; separately track net cash
charges and credit expiry/eligibility in Billing. Keep existing API throttles,
bounded retries, upload limits, log retention and S3 lifecycle. Consider notification
targets for critical alarms and DynamoDB on-demand maximum throughput limits after
review. Avoid paid commitments and AI/hosting additions during this stage. Budget
notifications can lag and do not stop resources; see [AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html).

## Readiness and exact next actions

1. Correct `waste2watt-new` to the intended non-root IAM developer MFA session in
   account 415150458314. Do not use previous profiles or print credentials.
2. Set the new profile's region to `us-east-1` and remove the old default from the
   deployment shell. Re-run STS and `scripts/aws-dev.ps1 -Action Identity` and verify
   MFA through session provenance; STS alone is insufficient.
3. Re-run the guarded BootstrapStatus and Diff with
   `-ExpectedAccountId 415150458314`. Review bootstrap execution permissions,
   lifecycle deletion and credits/alerts with the user.
4. Obtain explicit bootstrap approval. Only then bootstrap this account/region
   using reviewed IAM and managed-key settings. Re-run full read-only diff.
5. Obtain separate explicit deployment approval. Deploy the reviewed dev stacks
   in dependency order: Data/Auth, API/Pipeline, then Observability.
6. After authorized deployment, capture outputs and run the existing real integration
   checklist. Hosting requires its own approved work. Do not begin Phase 5.

**Deployment is blocked on the incorrect root profile, required bootstrap and
explicit approvals. Local review cannot establish live integration success.**
