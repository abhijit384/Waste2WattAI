# Waste2Watt infrastructure

Five AWS CDK v2 TypeScript stacks define Data, Auth, API, Pipeline and Observability.
Nothing is deployed. Phase 3 wires real scan APIs, private POST uploads and status
persistence; AI analysis remains a deliberate failure boundary.

```powershell
npm run check
npm run synth --workspace @waste2watt/infra
```

Run from the repository root. The helper invokes local cdk synth --lookups false,
keeps cache in infra/.cdk and assemblies in infra/cdk.out. Test artifacts remain
in infra/cdk.test.out. No Docker, account lookup, bootstrap or deployment is required.
See [deployment configuration](../docs/DEPLOYMENT.md),
[Phase 3 decisions](../docs/PHASE3_APPLICATION.md) and
[historical Phase 2 report](../docs/PHASE2_INFRASTRUCTURE.md).
