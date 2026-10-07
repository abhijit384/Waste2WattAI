# Tests

Root npm test runs one Node API boundary test, two Python unittest boundary tests,
and infrastructure assertions from infra/tests/infrastructure.test.ts.

Node 24 uses its native test runner/type stripping. Python has no runtime test
dependencies. CDK assertions synthesize local templates and verify storage security,
table keys, Cognito code flow/scopes, all nine JWT-protected routes, all six workflow
stages, EventBridge wiring, DLQ, logs/alarms, constrained IAM, outputs, configuration,
and explicit worker failure. Artifacts remain inside infra/cdk.test.out.

Tests verify infrastructure definitions and placeholders. They do not deploy resources,
make model calls, validate real cloud integrations, or fabricate business results.
