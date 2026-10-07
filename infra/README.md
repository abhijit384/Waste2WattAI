# Waste2Watt infrastructure

AWS CDK v2 TypeScript defines five stacks: Data, Auth, API, Pipeline, and Observability.
Nothing is deployed. See [Phase 2 decisions](../docs/PHASE2_INFRASTRUCTURE.md).

From the repository root:

```powershell
npm run build
npm run typecheck
npm run lint
npm test
npm run synth --workspace @waste2watt/infra
```

The synth helper invokes the local `cdk synth --lookups false`, keeps the CDK
cache in `infra/.cdk`, and writes assemblies to `infra/cdk.out`. Unit-test artifacts
are in `infra/cdk.test.out`. All are ignored. No Docker, AWS account lookup, deployment,
or bootstrap is required. Override settings with CDK context or W2W environment
variables; see [deployment documentation](../docs/DEPLOYMENT.md).
