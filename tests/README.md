# Tests

npm test runs 19 Node API/SDK/status tests, 2 Python boundary tests, 13 CDK
assertions and 20 frontend Vitest tests. Shared contracts build first.

Node tests verify trusted JWT identity, strict input, owned create/read/list,
MIME/size limits, server keys, retry state, safe errors, actual SDK POST policy
generation and owner-index Query/cursor behavior. AWS client sends are test
doubles; presigning uses test-only credentials locally without network calls.
Status tests cover owned metadata matching, terminal failures and duplicates.

CDK tests synthesize locally to infra/cdk.test.out and assert bucket privacy,
encryption/CORS/lifecycle, table keys/GSI/PITR, Cognito configuration, JWT routes,
pipeline/status/failure wiring, queue/logs/alarms and scan-only IAM.
Frontend tests cover configuration, protected routing, file validation and
important loading/error/empty/status/product shell states using isolated fixtures.

Tests do not deploy, invoke models or validate live AWS integration. Test fixtures
are not an application fake authentication backend or fabricated AI results.
