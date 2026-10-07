# Deployment policy

**Nothing is deployed. Do not create AWS resources during this phase.**

The application is intended to be AWS-native. Infrastructure implementation will use
AWS CDK v2 TypeScript. This repository currently has no CDK dependencies, app, stacks,
constructs, `cdk.json`, CloudFormation templates, resource names, account IDs, or
deployment scripts. Build outputs are local artifacts, not deployment bundles.

`npm run check` performs local validation without AWS credentials, AWS SDK calls,
resource provisioning, synthesis, bootstrap, deployment, or model invocation.
API TypeScript output is not yet packaged as a Lambda zip, and Python service source
directories are not deployment packages. The Vite `dist` directory is not hosted.

## Future implementation gates

After explicit authorization for infrastructure work:

1. Agree on AWS account, region, environment isolation, and spending limits.
2. Confirm datasets, model access, evidenced scientific methods, and evaluation criteria.
3. Design least-privilege IAM, Cognito ownership checks, S3 access, encryption,
   retention, retries/idempotency, and CloudWatch observability.
4. Add only the required SDK/CDK/Strands/ML packages, then build service adapters
   and deployment artifacts with tests.
5. Define CDK resources and review local synthesis and resource/cost implications.
6. Obtain explicit authorization before bootstrap, resource creation, deployment,
   data upload, model invocation, or training.

Do not run AWS provisioning commands as part of scaffold verification. Do not place
credentials in `.env.example` or any `VITE_*` setting. Future credentials should use
approved temporary AWS authentication; client-visible settings must contain only
public configuration.
