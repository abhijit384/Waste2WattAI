# Local development and deployment boundaries

The explicitly approved first development deployment completed with waste2watt-dev in us-east-1.
STS verified arn:aws:iam::415150458314:user/waste2watt-developer on 2026-10-08.
The guard requires this exact IAM user; STS does not establish MFA.
CDKToolkit reached CREATE_COMPLETE with termination protection and bootstrap version 32.
All five application stacks reached CREATE_COMPLETE; the final read-only diff has zero changes.
Hosting and further infrastructure changes require separate authorization;
previous accounts are forbidden. Lambda concurrency is 10; development templates
omit reservations and share that capacity. Staging/production retain reservations
and require a separate quota review. No quota increase was requested.
See PHASE4_FIRST_DEPLOYMENT.md, PHASE4_BOOTSTRAP.md and INTEGRATION_TESTING.md for current status.

## Deployment sequence

```powershell
git status --short
npm run check
npm run synth --workspace @waste2watt/infra -- -c stage=dev -c region=us-east-1
git diff --check
.\scripts\aws-dev.ps1 -Action Identity
$expectedDeploymentAccount = Read-Host 'Intended account ID (local only)'
.\scripts\aws-dev.ps1 -Action BootstrapStatus -ExpectedAccountId $expectedDeploymentAccount
```

The guard fixes profile/region/dev names, verifies STS, suppresses account/ARN
display and rejects root/account mismatches, including any account other than
415150458314, before further AWS actions. STS alone does not prove MFA. Bootstrap
status is CREATE_COMPLETE for default CDKToolkit; access denied/network failure would not prove absence. Compare
CDKToolkit version with infra/cdk.out requirements before deploying.

Bootstrap was explicitly approved and executed with the following configuration.
This records the completed operation; do not rerun it without fresh authorization:

```powershell
$env:CDK_HOME = 'E:\Waste2WattAI\infra\.cdk'
$env:CDK_DISABLE_VERSION_CHECK = '1'
$env:AWS_PROFILE = 'waste2watt-dev'
$env:AWS_DEFAULT_REGION = 'us-east-1'
$env:AWS_REGION = 'us-east-1'
$env:AWS_EC2_METADATA_DISABLED = 'true'
.\node_modules\.bin\cdk.cmd bootstrap --show-template
# Revalidate immediately before the target command:
.\scripts\aws-dev.ps1 -Action Identity -ExpectedAccountId $expectedDeploymentAccount
if (!$?) { throw 'Identity validation failed' }
.\node_modules\.bin\cdk.cmd bootstrap "aws://$expectedDeploymentAccount/us-east-1" --profile waste2watt-dev --region us-east-1 --termination-protection --bootstrap-kms-key-id AWS_MANAGED_KEY --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

Default bootstrap creates asset S3/ECR storage, SSM metadata and publishing/deploy
roles, including a CloudFormation execution role with AdministratorAccess. Review
this separately from application IAM; stop if unexpected. An approved scoped
execution policy can be supplied with --cloudformation-execution-policies. Do not
add cross-account trust or casually upgrade/change shared bootstrap policies.
See [AWS bootstrap security](https://docs.aws.amazon.com/cdk/v2/guide/best-practices-security.html).

After identity/bootstrap checks, run full diff. Stop for unexpected deletion,
replacement, public storage, IAM escalation, EC2/NAT/RDS/EKS/ECS, SageMaker endpoints
or Bedrock capacity. The review helper uses --method template to avoid creating
change sets or publishing assets before approval. The installed CLI ignores --all
for diff, so the helper explicitly names all five stacks. It compares every stack; existing
resource replacement detail is conservative. Local assertions do not replace diff.

```powershell
.\scripts\aws-dev.ps1 -Action Diff -ExpectedAccountId $expectedDeploymentAccount
# Historical deployment example. The first deployment is complete; do not rerun without authorization.
Set-Location E:\Waste2WattAI\infra
..\node_modules\.bin\cdk.cmd deploy Waste2WattDataStack-dev Waste2WattAuthStack-dev Waste2WattApiStack-dev Waste2WattPipelineStack-dev Waste2WattObservabilityStack-dev --profile waste2watt-dev --region us-east-1 --lookups false -c stage=dev -c region=us-east-1 --require-approval broadening --concurrency 1 --outputs-file ../.deployment/cdk-outputs.json
Set-Location E:\Waste2WattAI
node scripts/configure-frontend.mjs
npm run dev
```

The prepared deploy command preserves CDK dependencies: Data/Auth before API,
Data before Pipeline, API/Pipeline before Observability. Create ignored .deployment
before an approved deployment. The command uses --require-approval broadening and
saves outputs there; never bypass unreviewed IAM with
--require-approval never. The frontend helper validates actual dev outputs and
writes only four public settings to ignored apps/web/.env.local. Do not substitute
synth tokens or publish account-bearing output ARNs. Real outputs and local public frontend configuration were obtained during the approved deployment.

## Amplify Hosting

No Git remote exists and no Amplify app/URL was created. A Git-connected deployment
requires an intended repository and authorized provider connection; do not publish
source or invent a connection. Current manual static-hosting steps:

1. Generate .env.local from real outputs, then npm run build. Inspect apps/web/dist
   for credentials/private keys/JWTs. Only public configuration belongs in assets.
2. ZIP the **contents** of apps/web/dist with index.html at ZIP root. Store ZIP under
   ignored .deployment; omit source, environment files, outputs and user uploads.
3. In Amplify Console in us-east-1 choose Create new app / Deploy without Git,
   name waste2watt-dev-web and upload the ZIP. Record its actual HTTPS origin.
4. Configure 200 SPA rewrite to /index.html for app routes, preserving asset paths.
   Test hard refresh /auth, /dashboard, /history. See [AWS rewrite examples](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html).
5. Add HSTS, nosniff, CSP/frame-ancestors headers. Allow same-origin scripts,
   necessary inline styles/blob previews and connections only to actual Cognito,
   API and signed S3 endpoints. Verify auth/upload against the final CSP.
6. Set W2W_FRONTEND_ORIGINS to JSON containing localhost and exact hosted origin;
   rerun check/synth. Helper Diff accepts -HostedOrigin $hostedDeploymentOrigin.
   Expect only Data CORS, Auth callback/logout and API CORS changes; stop otherwise.
   Redeploy necessary changes after review. CDK skips unchanged Pipeline/Observability.
   Preserve that hosted origin in subsequent deployments.
7. Repeat INTEGRATION_TESTING.md from the actual URL. Landing-page success alone
   does not prove authentication/upload/pipeline integration.

Manual hosting uploads built assets: configure values before building. See
[AWS manual deployment](https://docs.aws.amazon.com/amplify/latest/userguide/manual-deploys.html).
Never make the image bucket public; Amplify manages hosting separately.

## Safe teardown

Teardown is not authorized by this request. For future explicit teardown approval:
verify non-root account/profile/region, inventory and back up data, stop traffic,
remove only this project's Amplify app, then destroy Observability, API/Pipeline,
Auth and Data in reverse dependency order. Retain policies preserve bucket,
tables, pool, queue and logs plus ongoing costs; stack deletion does not empty
storage. Table/pool deletion protection persists. Disabling protection, deleting
retained data or emptying versioned S3 needs separate explicit approval and exact
resource checks. Never delete shared CDKToolkit or unrelated resources.

## Run locally

Use Node 24/npm 11/Python 3.12+ from E:\Waste2WattAI:

```powershell
npm ci --ignore-scripts
npm run dev
```

Vite serves the landing page without AWS values; auth/application routes display
a clear configuration screen. There is no fake authentication backend.
For real integration after the authorized deployment succeeds, create
apps/web/.env.local with real values:

| Vite variable                    | Source                  |
| -------------------------------- | ----------------------- |
| VITE_AWS_REGION                  | Deployment region       |
| VITE_COGNITO_USER_POOL_ID        | UserPoolId output       |
| VITE_COGNITO_USER_POOL_CLIENT_ID | UserPoolClientId output |
| VITE_API_URL                     | ApiUrl output, HTTPS    |

Restart Vite after edits. Pool region must match VITE_AWS_REGION.
Runtime parsing rejects absent/malformed settings, credential-bearing URLs and
invalid endpoint protocols. Never place secrets or access keys in VITE_* values.
The root .env.example is a reference, not automatically loaded by backend/CDK.

## Verify and synthesize

```powershell
npm run build
npm run typecheck
npm run lint
npm run format:check
npm test
npm run synth --workspace @waste2watt/infra
```

The helper builds infra and invokes installed cdk synth --lookups false. It
sets CDK_HOME to infra/.cdk, disables version-check network calls and EC2 metadata
discovery, and uses local esbuild without Docker. Assemblies are in infra/cdk.out;
test assemblies are in infra/cdk.test.out. SDK adapters are bundled but never
invoke AWS during synthesis.

Equivalent direct command after building:

```powershell
Set-Location E:\Waste2WattAI\infra
$env:CDK_HOME = 'E:\Waste2WattAI\infra\.cdk'
$env:CDK_DISABLE_VERSION_CHECK = '1'
$env:AWS_EC2_METADATA_DISABLED = 'true'
..\node_modules\.bin\cdk.cmd synth --lookups false
```

## Infrastructure configuration

| Setting         | Context         | Environment          | Default               |
| --------------- | --------------- | -------------------- | --------------------- |
| stage           | stage           | W2W_STAGE            | dev                   |
| region          | region          | W2W_REGION           | us-east-1             |
| frontend origin | frontendOrigin  | W2W_FRONTEND_ORIGIN  | http://localhost:5173 |
| allowed origins | frontendOrigins | W2W_FRONTEND_ORIGINS | primary origin only   |

Context takes precedence. Stages are dev, staging and prod. Origins must be
exact HTTPS origins without wildcard/path/credentials; dev also accepts HTTP
loopback. Set the origin to the browser's actual localhost or 127.0.0.1 origin
before deployment; these are distinct for CORS. Allowed origins accept a JSON
array of 1..10 exact origins including the primary origin. API/S3 CORS and Cognito
callback/logout URLs share it. Helper environment JSON avoids Windows native
quote stripping; do not add a persistent overriding frontendOrigins context.

Lambda env WASTE_SCANS_TABLE, IMAGE_BUCKET and COGNITO_CLIENT_ID is injected by
CDK; AWS_REGION and temporary role credentials come from Lambda, never frontend.
AWS SDK v3 uses the role/default provider chain with bounded attempts.

## Outputs and future gates

Outputs remain ApiUrl, UserPoolId, UserPoolClientId, ImageBucketName,
WasteScansTableName, DailyMetricsTableName, RecoveryFactorsTableName and
StateMachineArn. Additional outputs are LoginDomainUrl and AnalysisFailureQueueUrl.
Synthesis may show CloudFormation tokens, not usable deployed endpoints.

Data/Auth production stacks have termination protection. Tables, bucket, pool,
queue and log groups retain their data; table/pool deletion protection is enabled.
Review account, region, quotas, costs, IAM, generated names, email delivery,
Cognito recovery/MFA, retention and cleanup before requesting deployment.
Frontend hosting remains separate and should provide HTTPS, CSP, security headers
and SPA route fallback. Native authentication uses SRP; no hosted redirect is
required in Phase 3.

Live Cognito/S3/API integration tests require the authorized deployed environment
and are not claimed here. Before production analysis, implement
content inspection, malware policy, version idempotency, failure reconciliation,
bounded AI calls, approved evidence-backed factors and result persistence.
The current analysis stub deliberately fails and will produce failure alarms.
