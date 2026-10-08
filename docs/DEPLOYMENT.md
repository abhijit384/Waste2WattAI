# Local development and deployment boundaries

Nothing is deployed. No bootstrap, deployment, console changes or AWS account
mutations are authorized. Local installation, tests, bundles and synth are permitted.

## Run locally

Use Node 24/npm 11/Python 3.12+ from E:\Waste2WattAI:

```powershell
npm ci --ignore-scripts
npm run dev
```

Vite serves the landing page without AWS values; auth/application routes display
a clear configuration screen. There is no fake authentication backend.
For real integration after an explicitly authorized future deployment, create
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

| Setting         | Context        | Environment         | Default               |
| --------------- | -------------- | ------------------- | --------------------- |
| stage           | stage          | W2W_STAGE           | dev                   |
| region          | region         | W2W_REGION          | us-east-1             |
| frontend origin | frontendOrigin | W2W_FRONTEND_ORIGIN | http://localhost:5173 |

Context takes precedence. Stages are dev, staging and prod. Origins must be
exact HTTPS origins without wildcard/path/credentials; dev also accepts HTTP
loopback. Set the origin to the browser's actual localhost or 127.0.0.1 origin
before future deployment; these are distinct for CORS.

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

Live Cognito/S3/API integration tests require an explicitly authorized deployed
environment and are not claimed here. Before production analysis, implement
content inspection, malware policy, version idempotency, failure reconciliation,
bounded AI calls, approved evidence-backed factors and result persistence.
The current analysis stub deliberately fails and will produce failure alarms.
