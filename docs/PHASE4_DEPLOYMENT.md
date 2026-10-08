# Phase 4 deployment report

Current first deployment: [successful five-stack deployment and live verification](PHASE4_FIRST_DEPLOYMENT.md).
All five stacks are CREATE_COMPLETE in 415150458314/us-east-1 using waste2watt-dev.
The final read-only diff has zero differences. Hosting remains deferred.

**Historical previous-account report below. Never execute its previous-profile commands.**
Current status: [new account review](PHASE4_NEW_ACCOUNT_REVIEW.md).

Run date: 2026-10-08. Target: intended waste2watt-sso account, us-east-1. Account ID and
caller ARN are omitted. **Deployment awaits approval and quota resolution.** The
resumed waste2watt-sso identity is a verified STS assumed role. The old root profile
is forbidden. Default CDKToolkit and /cdk-bootstrap/hnb659fds/version are absent.
No bootstrap, deployment, upload or account modification has occurred.

## SSO review findings

The requested cdk diff --all completed and covered five stacks, but the installed
CLI warns that --all is unsupported for diff. A follow-up uses all five explicit
stack names. Both use --method template to avoid change-set creation/asset uploads
before approval. Expected missing lookup-role warnings fall back to the verified
SSO credentials in the same account. Local review artifacts are ignored under
.deployment on E:; no account ID is included in this report.

The proposed application is 61 additions across five new stacks: no replacements
or deletions, no public S3 grant, no EC2/NAT/RDS/EKS/SageMaker/Bedrock resource. API
and status roles access only scans and private S3 objects. Existing Lambda managed
logging policy AWSLambdaBasicExecutionRole grants three Logs actions on Resource
"*"; Step Functions delivery also needs unscoped Logs management actions. These
are baseline logging permissions, not new table/AI escalation. See
[AWS managed policy](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaBasicExecutionRole.html).

**Blocker:** Lambda AccountLimit.ConcurrentExecutions and UnreservedConcurrentExecutions
are both 10. Templates reserve API=10, status=5 and stub=5 (total 20). AWS requires
100 unreserved capacity when reserving concurrency. Current templates cannot deploy
with this quota. Retaining reservations requires at least 120 total concurrency
if no other reservations exist. No quota request or reservation change was made.
See [AWS concurrency rules](https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html).

The locally rendered bootstrap template adds private asset S3, ECR, SSM and IAM
roles. Its default execution role has AdministratorAccess and its lookup role has
ReadOnlyAccess. Proposed command explicitly selects AWS_MANAGED_KEY to avoid a
customer-managed KMS key charge, enables termination protection and adds no external
trust. Approve bootstrap IAM separately from application runtime IAM. A scoped
execution policy would need further design/review; none was invented or created.

## Deployment plan before AWS changes

1. Finish local checks/synth/security assertions and inspect generated IAM/resources.
2. Resolve Lambda quota versus reservations; revalidate waste2watt-sso assumed role.
3. Obtain explicit approval for required bootstrap and its reviewed IAM in us-east-1.
4. Run/review full CDK diff; stop for unexpected destructive, public or costly changes.
5. After separate explicit deployment approval, deploy Data/Auth, API/Pipeline,
   then Observability through CDK dependencies.
6. Capture outputs, configure frontend and test two real users/three image formats.
7. Host with Amplify, add its exact origin, review/redeploy CORS, repeat hosted checks
   and inspect CloudWatch. Do not begin Phase 5.

## Stack inventory

| Stack                            | Dependencies  | Deployed this run |
| -------------------------------- | ------------- | ----------------- |
| Waste2WattDataStack-dev          | none          | No                |
| Waste2WattAuthStack-dev          | none          | No                |
| Waste2WattApiStack-dev           | Data, Auth    | No                |
| Waste2WattPipelineStack-dev      | Data          | No                |
| Waste2WattObservabilityStack-dev | API, Pipeline | No                |

Expected templates contain Cognito pool/public client/domain/resource server,
HTTP API and nine JWT routes, three Lambdas, three DynamoDB tables, one private
versioned S3 bucket, two EventBridge rules, one Standard state machine, SQS failure
queue, five explicit log groups and seven alarms: 61 CloudFormation resources.
Bootstrap adds separate deployment support resources; its local template was
reviewed, but no bootstrap stack exists and none has been created.

## Completion status

| Requested evidence                         | Status                                                    |
| ------------------------------------------ | --------------------------------------------------------- |
| Identity                                   | SSO assumed-role verification passed                      |
| Bootstrap, remote diff                     | Bootstrap absent; full read-only diff passed              |
| Live services / deployed stacks            | None deployed; diff shows five new project stacks         |
| Eight CloudFormation outputs               | Not obtained                                              |
| Local frontend real connection             | Not configured; real outputs unavailable                  |
| Cognito signup/confirmation/signin/session | Not run live; checklist prepared                          |
| Scan API / DynamoDB records                | Not run live; local tests available                       |
| JPEG/PNG/WebP S3 uploads                   | Not run live                                              |
| EventBridge delivery                       | Not observed live                                         |
| Step Functions execution                   | Not started; deliberate FAILED path documented            |
| Ownership / security                       | Local tests/assertions only; live results pending         |
| Amplify URL                                | Not created; no Git remote; manual hosting steps prepared |
| CloudWatch logs/errors                     | Templates verified; live logs not inspected               |
| Local verification                         | Final recorded results in VERIFICATION.md                 |

## Changes and limitations

Added root/account/profile/region guards, validated output-to-env conversion, ignored
deployment artifacts and multiple exact origins shared by API, S3 and Cognito.
Added tests for CORS, expensive resources, public grants and config conversion.
Placeholder identifier Phase3NotImplemented remains for the existing failure
contract; its message now describes deferred AI without a stale roadmap claim.
No analysis, factors, agent, model or fake successful operation was implemented.

Real email confirmation requires mailbox owners; do not bypass it administratively.
Passwords/JWTs/user uploads must not enter committed evidence. Unexecuted live
checks cannot be marked successful based on unit tests or documentation.

## Cost risk

No new AWS spend was introduced by this run. Application templates have no EC2,
NAT, RDS, EKS, SageMaker endpoint or Bedrock capacity. Expected charges include
Cognito active users/features, API requests, Lambda requests/duration, DynamoDB
reads/writes/storage/PITR, S3 requests/version storage, EventBridge events, Step
Functions transitions, SQS requests, CloudWatch ingestion/storage/alarms and Amplify
builds/hosting/storage/transfer. Retention, PITR and alarms can have ongoing charges
at low traffic. Bootstrap S3/ECR storage may also cost money. No dollar estimate
is claimed without live inventory; review billing after deployment.

Phase 5 is blocked on quota resolution, approved deployment, live integration/security evidence and
a verified hosted URL. Phase 5 has not begun.
