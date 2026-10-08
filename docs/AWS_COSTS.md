# AWS costs and safeguards

Updated: 2026-10-08 · Account `415150458314` · `us-east-1`

## Budget boundary

The authorized cumulative additional gross-spend ceiling for the completion work is **USD 20**. It is an operational stop limit, not an AWS billing cap. Promotional credits do not reduce gross usage and must not be treated as permission to exceed the ceiling. The account was observed on the Paid plan with a credit balance of `$136.59` at the time of the read-only check.

Existing budgets observed read-only:

| Budget                         |    Amount | Note                                                                      |
| ------------------------------ | --------: | ------------------------------------------------------------------------- |
| AWS HACKATHON                  | $65/month | Existing alert configuration includes actual 85% and 100%, forecast 100%. |
| My Monthly Cost Budget         | $40/month | Existing account budget.                                                  |
| My Monthly Cost Budget__claude | $60/month | Existing account budget.                                                  |
| amazon ml challenge            | $30/month | Existing account budget.                                                  |

No new project-scoped `$5/$10/$15/$20` notification set was configured or verified. AWS budget notifications are alerts, not spend enforcement. No account billing/payment changes were made.

## Phase 5B Stage 1 usage

The Phase 5 infrastructure uses existing serverless resources plus an analysis Lambda, Step Functions transitions, an alarm, custom CloudWatch metric filters, log storage, private S3 operations and existing DynamoDB tables. These may incur usage and, for alarms/custom metrics/log ingestion, recurring or volume-based charges even with Bedrock disabled. The analysis Lambda has 512 MB memory and 60-second timeout; the dedicated log group retains one month. The post-repair HealthCheck is bounded and did not invoke Bedrock. One separate text-only Nova Lite authorization probe was rejected with `Operation not allowed` before returning a completion or token-usage metadata; no successful inference or usage is recorded.

Two bounded controlled disabled-inference uploads were submitted through the existing API, private S3 upload, EventBridge, Step Functions, Lambda, DynamoDB and CloudWatch. The first failed because the disabled feature-flag choice followed the analysis Lambda invocation; the second completed the explicit unavailable path. Their exact charges are not measured; ordinary API, transition, storage and logging charges remain possible. The queue count changed from 20 to 22 during the first test and stayed 22 after the second. No message body was read or queue operation performed.

## Explicitly absent

No NAT Gateway, EC2, RDS, EKS, SageMaker job/endpoint, provisioned Bedrock throughput, historical backfill, load testing, marketplace subscription, or successful paid Bedrock inference was created or used. No SQS messages were purged, deleted, redriven, or replayed. The bounded text-only request was rejected with `Operation not allowed`; do not repeat invocation attempts as an authorization probe.

## Cost checkpoints before later work

Before any new paid operation, check gross account usage against the cumulative `$20` ceiling, estimate duration and service charges, set bounded invocation/job limits, verify quotas and confirm cleanup behavior. Stop before any operation with unbounded or materially uncertain cost. Temporary ML compute must have a bounded shutdown plan and be removed after authorized testing. Budget alerts do not stop charges. Recheck public model/service pricing immediately before live model tests; rates and account eligibility can change.
