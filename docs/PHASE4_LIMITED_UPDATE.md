# Phase 4 limited AWS update

Date: 2026-10-08. Authorized target: waste2watt-dev, us-east-1, account 415150458314. The user explicitly approved only the API Cognito subject fix,
pipeline ScanStatus fix and prepared Cognito verification-email template.

## Deployment result

The approved deployment completed successfully. CloudFormation confirms:

| Stack                            | Status                     |
| -------------------------------- | -------------------------- |
| Waste2WattAuthStack-dev          | UPDATE_COMPLETE            |
| Waste2WattApiStack-dev           | UPDATE_COMPLETE            |
| Waste2WattPipelineStack-dev      | UPDATE_COMPLETE            |
| Waste2WattDataStack-dev          | CREATE_COMPLETE, unchanged |
| Waste2WattObservabilityStack-dev | CREATE_COMPLETE, unchanged |

The exact non-root waste2watt-developer IAM identity in the approved account was
verified before review and immediately before deployment. Region was explicitly
us-east-1. Profile/region were pinned; environment credential and role overrides
were removed from the deployment process. No credential files were read or written.

Pre-deployment npm run check passed with 63 tests, typechecks, ESLint, formatting
and production builds. Fresh CDK synthesis disabled lookups. A read-only template
diff reviewed all five stacks, and a recursive comparison against live templates
allowed only eight property/asset fields across the approved three stacks.
No IAM, resource additions/deletions, replacements, public-access changes or new
services were present. JWT issuer/audience/type/scope and ownership protections
were preserved.

An initial synthesis into a different output directory changed the asset hash of
the unimplemented pipeline placeholder. The scope guard rejected that assembly;
it was never deployed. Re-synthesis at the existing infra/cdk.out path removed the
extra change. The resulting assembly was copied for deployment and its bytes
verified against recorded SHA-256 hashes immediately beforehand.

CDK deployed only the three approved stacks with --exclusively, from the reviewed
assembly, using normal CloudFormation deployment. No bootstrap, hotswap, Amplify,
SES identity, model invocation or Phase 5 implementation occurred. Existing user
data was preserved. The deliberately failing analysis placeholder was unchanged.
Post-deployment read-only diff has **zero differences across all five stacks**.

## Applied behavior

The API now accepts Cognito subject IDs with the correct hexadecimal GUID shape
without requiring RFC UUID version/variant bits. This schema is shared by trusted
identity extraction, scan user IDs, owner-bound pagination and pipeline status
persistence. Server-generated scan IDs remain strictly validated UUIDs.

The Cognito verification-email subject is now "Waste2Watt AI - your verification
code", with branded instructions and the {####} code placeholder. Read-only
describe-user-pool verified that this template is live. The sender remains
COGNITO_DEFAULT; no SES or DNS configuration was changed. Actual email delivery,
inbox placement and appearance still require recipient verification. Branding
does not guarantee that mailbox providers will stop treating a message as spam.

## Post-deployment verification

- Full npm run check passed again: 25 Node, 2 Python, 16 CDK and 20 frontend tests
  (63 total), plus typechecks, lint, formatting and production builds.
- Ruff check and format --check passed; seven Python files already formatted.
- Read-only resource verification passed: all five stacks complete, 61 existing
  resources, three active ARM64 Lambdas, public SRP app client without a secret,
  nine JWT/scope-protected routes, exact localhost CORS, private encrypted S3,
  protected DynamoDB/PITR, active Step Functions and EventBridge, scoped runtime IAM.
- Fresh unauthenticated and invalid-JWT GET /scans requests returned 401.
- Read-only follow-up verified the exact DynamoDB record, encrypted JPEG metadata,
  unsigned object GET rejection (403) and matching genuine S3/EventBridge execution.
  ValidateImage, ClassifyWaste, MarkScanFailed and RecordAnalysisFailure ran;
  deferred AI stages did not run and no classification/energy/carbon data exists.
- Five CloudWatch log groups contained 173 events in the reviewed interval.
  The bounded inspection found zero unexpected runtime errors and zero sensitive
  credential patterns. The deliberate unfinished-analysis failure is expected;
  this pattern check is not a comprehensive audit of all historical logs.

Authenticated live verification **passed all 15 checks** on 2026-10-08 at
09:53:36–09:53:47 UTC with the tester's real non-RFC Cognito subject and JPEG.
The user also confirmed normal history hard-refresh and scan upload now work;
the previous "Please sign in again." error is resolved. The browser
automation runtime failed to initialize, so the tester ran a local verifier.
No password, token, email code or saved
credential was requested through chat or extracted from the user's browser.

A temporary localhost verifier is available at:
http://localhost:5173/@fs/E:/Waste2WattAI/.tmp/phase4-live.html

The user signed in through the normal /auth page, selected a harmless owned image,
and started the approved checks. The verifier uses the browser's real Cognito session
and existing frontend API/upload client. Tokens and signed POST fields remain in
browser memory. A loopback-only collector accepts the exact localhost origin and
saves only allowlisted statuses, booleans, MIME type and opaque record identifiers
under ignored .deployment paths. It never accepts or records passwords or tokens.

The verifier checks authenticated listing/ownership, anonymous and invalid-JWT
rejection, real foreign scan read/upload rejection using a prior different user's
scan, owned creation/read, MIME/size/key injection rejection, constrained S3 upload,
progress completion, terminal FAILED/ANALYSIS_NOT_IMPLEMENTED and owned history.
It confirmed that the user's subject has a non-RFC variant without exporting tokens.
Real foreign scan GET and upload-policy requests returned 404; own creation/read
returned 201/200. Invalid MIME, oversized metadata and arbitrary key injection
returned 400. The constrained JPEG upload returned 204 and progress reached 100%.
Owned history returned 200 and terminal status was FAILED/ANALYSIS_NOT_IMPLEMENTED.

Also retest the normal application history and scan pages, hard-refresh/session
restoration, each image format, mobile camera and email delivery. Successful local
tests, template inspection and deployment do not replace those live checks.

## Remaining blockers and stop point

The approved authentication and pipeline fixes have passed real authenticated
creation/upload/processing/history and cross-user rejection checks. Complete
signup/confirmation/logout/recovery UI sequences, browser PNG/WebP, signed-in
mobile layouts, full keyboard traversal and physical phone camera capture remain
manual acceptance work. On desktop, the current photo control opens a file picker;
a live webcam preview is not implemented. Email inbox placement still needs
recipient verification; the default Cognito sender remains unchanged.

Amplify Hosting remains undeployed and is not yet ready for deployment approval.
Its existing preparation and future CORS-origin changes are documented in
[hosting readiness](PHASE4_HOSTING_READINESS.md). Bedrock, SageMaker, Organizations,
IAM Identity Center and Phase 5 remain untouched. No user data was deleted.

Safe local evidence: .deployment/phase4-update-pre-check.txt,
phase4-update-pre-synth.txt, phase4-update-pre-diff.txt,
phase4-update-scope-review.json, phase4-update-deploy.txt,
phase4-update-post-diff.txt, phase4-update-post-check.txt,
phase4-update-resource-verification.json and phase4-update-evidence.json.
Browser-run reports, when produced, use phase4-update-live-*.json. These files are
ignored and remain inside E:\Waste2WattAI.
