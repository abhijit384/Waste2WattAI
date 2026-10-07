# Deployment and local synthesis

**Nothing is deployed. No AWS account change is authorized in Phase 2.**

AWS CDK v2 TypeScript now defines five stacks. Local builds, tests, asset bundling,
and CloudFormation synthesis are authorized. Bootstrap, deploy, resource creation,
console changes, uploads, training, and model invocation remain prohibited.

## Local validation

From E:\Waste2WattAI:

```powershell
npm ci --ignore-scripts
npm run build
npm run typecheck
npm run lint
npm test
npm run format:check
npm run synth --workspace @waste2watt/infra
```

The synth helper runs the installed CDK CLI with synth --lookups false.
It sets CDK_HOME to infra/.cdk, disables version-check network requests and EC2
metadata discovery, and runs from infra/. CDK notices, version reporting, and context
lookups are disabled in cdk.json. Assemblies/assets stay in infra/cdk.out; test
assemblies stay in infra/cdk.test.out. All caches/artifacts are Git-ignored.
Local esbuild bundles the existing API handler and the pipeline stub without Docker.
There are no SDK clients or resource lookups in the application.

To invoke cdk synth directly from the infrastructure directory, after building:

```powershell
Set-Location E:\Waste2WattAI\infra
$env:CDK_HOME = 'E:\Waste2WattAI\infra\.cdk'
$env:CDK_DISABLE_VERSION_CHECK = '1'
$env:AWS_EC2_METADATA_DISABLED = 'true'
..\node_modules\.bin\cdk.cmd synth --lookups false
```

## Configuration

| Setting         | CDK context    | Environment variable | Default               |
| --------------- | -------------- | -------------------- | --------------------- |
| stage           | stage          | W2W_STAGE            | dev                   |
| region          | region         | W2W_REGION           | us-east-1             |
| frontend origin | frontendOrigin | W2W_FRONTEND_ORIGIN  | http://localhost:5173 |

Context takes precedence. Environment variables must be set in the process;
.env.example is documentation and is not automatically loaded. Origin must be an
exact origin with no path/trailing slash/credentials/wildcard. Non-dev stages require
HTTPS; dev also accepts HTTP localhost or 127.0.0.1. Valid stages are dev, staging,
prod. Region syntax is checked locally; actual service availability must be verified
before any future deployment.

For example, a production configuration can be synthesized locally:

```powershell
npm run synth --workspace @waste2watt/infra -- -c stage=prod -c region=us-east-1 -c frontendOrigin=https://example.com
```

The account remains an AWS::AccountId CloudFormation token; this app does not discover
an account or embed credentials. Future deployment must explicitly verify the target
account/region, bootstrap requirements, regional quotas and model availability,
Cognito email delivery settings, generated names, retention, costs, and IAM.

## Outputs

| Output                   | Stack    |
| ------------------------ | -------- |
| ApiUrl                   | API      |
| UserPoolId               | Auth     |
| UserPoolClientId         | Auth     |
| ImageBucketName          | Data     |
| WasteScansTableName      | Data     |
| DailyMetricsTableName    | Data     |
| RecoveryFactorsTableName | Data     |
| StateMachineArn          | Pipeline |

Additional outputs are LoginDomainUrl and AnalysisFailureQueueUrl. Synthesized
output values may contain CloudFormation tokens; no live URL/resource ID is claimed.

Production Data/Auth stacks have termination protection. The bucket, tables, user pool,
queues and log groups are retained; table/user-pool deletion protection applies to
every stage. Retention is deliberate and will require an approved cleanup plan later.

## Future deployment gates

Phase 3 must implement and test runtime schemas, Cognito ownership, presigned upload
constraints, image validation, duplicate-event handling, bounded AI invocations,
evidenced recovery calculations, persistence, and replay before this becomes a usable
application. Placeholder workflow invocations intentionally fail and trigger alarms.

Review synthesized templates and a proposed account/resource/cost plan before
requesting any deployment authorization. No deployment command is executed or
provided as part of Phase 2 validation.
