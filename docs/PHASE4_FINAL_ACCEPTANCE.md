# Phase 4 final acceptance and hosting review

Review date: 2026-10-08. Project: E:\Waste2WattAI. Profile: waste2watt-dev.
Region: us-east-1. Non-root waste2watt-developer identity was reverified in
account 415150458314. Final stabilization deployed only the explicitly approved
API Lambda logging code update. No resources or IAM permissions were added.

## Current final-review status (2026-10-08)

Phase 4 is **complete for its approved scope**. The user confirms all ten physical Android tests
below passed. The user has also confirmed hosted signup, receipt of the Cognito
verification email, email confirmation, and login using the verified account.
The approved logging fix is deployed and verified. The failure-queue alarm remains
active with an explained expected backlog. Phase 5 has not started.

User-confirmed Android manual tests (all passed):

1. Responsive mobile layout.
2. Navigation buttons.
3. Camera opening.
4. Camera permissions.
5. Photo preview.
6. Gallery selection.
7. Image upload.
8. Quantity and location persistence.
9. Scan history.
10. Expected `ANALYSIS_NOT_IMPLEMENTED` status.

This list records the user's manual results; they were not independently repeated
on the physical device during this review.

Hosted authentication results (user-confirmed manual tests):

- New-user signup: passed.
- Cognito verification email received: passed.
- Email confirmation: passed.
- Login with the verified account: passed.

No passwords, verification codes, or tokens were shared in chat.

### OTP deliverability follow-up (2026-10-10)

The user reports that verification codes are delivered to Spam/Junk. Signup and
verification remain functionally successful, but inbox placement is not accepted.
The signup page now includes Spam/Junk guidance and accurately explains that
Cognito currently uses its shared sender. Read-only checks found no verified SES
sender identity and SES production access is still disabled; the account has no
Route 53 hosted zone. No AWS email or DNS settings were changed. A custom sender
cannot be configured until the owner provides a domain they control, DNS access,
and intended From/Reply-To addresses. SES production access will also be required
for a custom sender to mail arbitrary signup addresses. Until then, OTP delivery
quality remains an acceptance blocker.

The API logger now routes successful status codes to INFO and error responses to
ERROR while serializing only request ID, route, status, and safe error code. Tests
cover severity routing, structured field retention, request correlation, and the
absence of request payload/exception text in logs. The API handler's authorization,
response, ownership, and redaction behavior is unchanged. The API stack reached
`UPDATE_COMPLETE` after the authorized code-only deployment.

Validation passed: `npm run check` completed with 64 tests (26 API/shared,
16 infrastructure, 20 web, 2 Python), typechecks, lint, formatting, and production
build. `npm run synth --workspace @waste2watt/infra` succeeded. Vite emitted two
existing upstream Zod annotation warnings but built successfully.

The intended non-root identity was verified. All five CloudFormation stacks are
in successful states: API/Auth/Data/Pipeline `UPDATE_COMPLETE`, Observability
`CREATE_COMPLETE`. The Amplify website returned HTTP 200. A fresh read-only CDK
diff with the deployed origin is now zero for all five stacks. The pre-deployment
diff contained only the existing API Lambda code asset, with no additions,
deletions, replacements, IAM changes or unrelated changes.

Live authenticated hosted `GET /scans` requests returned 200 and logged at INFO
with request IDs `E7HHvissoAMEbGg=` and `E7HMYiZcIAMEb6g=`. One synthetic direct
invocation of the deployed API Lambda lacking identity returned 401 `UNAUTHORIZED`
and logged at ERROR with request ID `phase4-logging-unauthorized-probe`. No server
fault was deliberately induced. The inspected records contain only request ID,
route, status and safe error code; no credentials, tokens, request bodies or
exception secrets appeared. Dashboard/history worked; the newly verified user's
history correctly displayed an empty state. Browser console warnings/errors were
absent. No new scan or image was created during stabilization.

The existing failure-queue backlog alarm remains ALARM. Read-only diagnostics
found ten failed executions on 2026-10-08, from 14:09:05 to 16:59:28 IST. Every
history showed `Phase3NotImplemented` then `AnalysisFailed`; no other failure code,
timeout or abort appeared in the reviewed execution list. Execution input/output
was excluded from the final history review. Earlier executions at 15:20–15:36
overlap integration/hosted testing; those at 16:58–16:59 are consistent with the
user's testing period. Exact file/user attribution was not attempted.

The pipeline sends a caught failure directly to SQS and also sends the terminal
execution status via EventBridge to the same queue. Ten failures and twenty
messages match those two paths; consumers must deduplicate by execution ARN.
Queue depth grew from 2 to 14 during earlier testing and to 20 around 17:00 IST,
then stayed at 20 through the reviewed metrics and current attribute read. The
queue has 20 visible and zero in-flight messages; sent-message metrics total 20
in the reviewed interval, with no later sends in the available points. Because
raw queue bodies were not read, per-message attribution remains an inference
from configuration, histories and aggregate metrics.

The threshold of one visible message keeps the alarm active while placeholder
analysis fails and the queue has no cleanup consumer. Retention remains fourteen
days (1,209,600 seconds). No receive, purge, delete, redrive, replay, visibility,
alarm or retention operation was performed. No unexpected processing failure was
found in this bounded review. Future design may separate expected failures from
actionable ones and deduplicate processing; review any change separately. Raising
the threshold merely to hide the backlog is not proposed. Retention need not
change for Phase 4 acceptance. Other reviewed alarms were OK, several based on
missing datapoints treated as non-breaching.

There are no remaining Phase 4 acceptance blockers in the approved scope. The
alarm is explained rather than cleared. Phase 4 closure does not authorize Phase 5
or future queue/infrastructure changes.

## Acceptance results

The user reported "yes passed all. working" for normal PNG/WebP uploads, different
quantity and source/location values, previews, progress, expected analysis failure,
matching history, unsupported files and files over 10 MiB. The user subsequently
reported "working all" for signup/verification, logout/login, password recovery/reset,
session restoration, all navigation pages and keyboard-only use. Credentials and
mailbox codes were entered only in the legitimate localhost authentication UI.
These are manual acceptance results, not newly automated authenticated recordings.

| Test                            | Result               | Evidence / limitation                                                                                                         |
| ------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| PNG / WebP upload               | Pass, manual         | User confirms both normal application flows; JPEG has prior 15-check authenticated recording                                  |
| Desktop selection               | Pass, manual         | File picker is acceptable for this MVP                                                                                        |
| Mobile camera capability        | Pass, implementation | Native image file input requests capture=environment; physical phone test deferred until HTTPS                                |
| Quantity / source-location      | Pass, manual         | User confirms different submitted values and history details; validation also covered locally                                 |
| Progress / upload errors        | Pass                 | User confirms UI; automated tests cover retryable failed upload without false processing success                              |
| Signup / email verification     | Pass, manual         | User confirms genuine email flow; spam placement remains provider-dependent                                                   |
| Login / logout                  | Pass, manual         | User confirms normal account flow                                                                                             |
| Forgot password / reset         | Pass, manual         | User confirms email-based recovery; no codes/passwords exported                                                               |
| Session restoration             | Pass, manual         | User confirms hard-refresh history                                                                                            |
| History / failure display       | Pass                 | Manual pass and prior recorded owned history / FAILED / ANALYSIS_NOT_IMPLEMENTED                                              |
| Desktop / mobile public layouts | Pass, browser        | Real Chrome at 1440 and 390 px; no horizontal overflow                                                                        |
| Signed-in narrow layouts        | Pass, manual         | User confirms dashboard, scan, history and navigation remain usable at narrow width; physical phone test deferred             |
| Keyboard / accessibility        | Pass with limits     | User confirms keyboard use; real Chrome verifies visible skip link/destination; full assistive-technology audit not performed |

An additional read-only query used the previous tester's known owner identity and
the newest 12 records. It did not locate new PNG/WebP records after the review cutoff.
The normal upload passes therefore rely on the user's report; this query does not
independently correlate their exact files/account. No unrelated user rows were queried.
The prior independently verified JPEG/private-object/pipeline evidence is retained.

## Frontend and route review

All nine application pages exist: /, /auth, /dashboard, /scan, /history,
/digital-twin, /simulator, /advisor and /settings. The user confirms navigation.
The three future analysis pages remain honest Phase 5 shells, without generated
classifications or sustainability numbers. /auth/callback is not an implemented
application page and is not used by current inline SRP authentication.

An isolated Chrome session tested the actual production build with a temporary
local Vite preview: 17 checks passed, including all seven anonymous protected-route
redirects, public desktop/mobile layouts, signup/recovery rendering, skip navigation,
unknown-route handling and zero public console errors. The dev server's genuine
localhost API CORS / invalid-JWT check also passed. The preview origin on port 5174
is deliberately not an AWS CORS origin and was not used for authenticated API tests.

The production build contains six files and one HTML entry point. Its public
Cognito/API identifiers match deployed outputs. Credential-pattern and prohibited
file scans found no JWTs, AWS keys, private keys, environment files or source maps.
The local Phase 4 verifier, collector URL and test fixtures are absent. Production
preview requests for the local verifier return the SPA fallback, never its source.
The checks are bounded scans, not a guarantee against every possible secret format.

Controlled configuration, session loading, API errors/retry, upload progress,
unsupported/oversized files and honest unfinished-analysis failure states remain
covered by the local suite. No application code bug was confirmed in this review,
so no frontend/backend implementation or dependencies were changed.

## Hosting preparation and approval sequence

The existing amplify.yml is ready for the static npm-workspaces frontend:
appRoot apps/web, buildPath /, Node 24 / npm 11, root npm ci, public-config guard,
shared build followed by web build, and artifacts apps/web/dist. Use an AL2023
Standard build instance, one demo branch and no backend deployment role or commands.
The root customHttp.yml supplies security headers; docs/amplify-rewrites.json
supplies the SPA 200 rewrite with static asset exclusions. Those settings still
need to be installed and verified in the future Amplify application.

Only these public environment variables are required:

| Variable                         | Value                                                  |
| -------------------------------- | ------------------------------------------------------ |
| AMPLIFY_MONOREPO_APP_ROOT        | apps/web                                               |
| VITE_AWS_REGION                  | us-east-1                                              |
| VITE_COGNITO_USER_POOL_ID        | us-east-1_yeSnElyWb                                    |
| VITE_COGNITO_USER_POOL_CLIENT_ID | 6bm90i6dleurqgrieurnanfvr                              |
| VITE_API_URL                     | https://c2ntcib53m.execute-api.us-east-1.amazonaws.com |

S3 credentials and bucket policies are not frontend environment variables. The
authenticated API supplies an expiring POST policy with an owner-bound key,
MIME type, exact byte count and encryption. The public Cognito client has no secret.
HTTPS enables Secure cookies and managed public SSL; cookies remain JavaScript-readable.

No future Amplify domain is guessed. After explicit hosting approval, obtain the
actual branch domain and prepare a read-only diff using:
scripts/aws-dev.ps1 -Action Diff -ExpectedAccountId 415150458314 -HostedOrigin
followed by that exact HTTPS origin (no path/trailing slash/wildcard). Review Data
stack S3 POST CORS, API stack HTTP API CORS and Auth callback/logout allowlists.
Request explicit approval for that concrete infrastructure diff before applying it.

Live Cognito client allowlists currently contain http://localhost:5173/auth/callback
and http://localhost:5173/ respectively, with code OAuth allowed and token revocation
enabled. Current inline SRP flows do not use these OAuth redirects. Adding future
allowlist entries does not implement a Hosted UI callback handler. Preserve existing
settings; do not issue a partial update-user-pool-client command that resets fields.

After approved hosting/origin updates, verify HTTPS, headers, deep-link reloads,
static MIME types, hosted authentication/uploads, exact-origin positive/negative
CORS and physical phone rear-camera/file selection. Local acceptance does not
prove these future hosted-domain behaviors.

## Incremental cost protection

Rates were rechecked against [AWS Amplify pricing](https://aws.amazon.com/amplify/pricing/):
Standard builds $0.01/minute; CDN storage $0.023/GB-month; transfer $0.15/GB.
A script-calculated example of 100 build minutes, 1 GB retained and 5 GB served is
$1.773, about $1.77/month before tax or applicable allowances. This is an estimate,
not a spending cap or an inspection of this account's bill.

The pricing page lists eligible allowances of 1,000 Standard build minutes,
5 GB storage and 15 GB transfer during the applicable free period, and the newer
credit program for eligible accounts created from July 15, 2025. Actual account
eligibility/remaining credits were not verified; assume paid rates when planning.
Use the default Amplify domain, static hosting, one branch, Standard builds and
only deliberate deployments. Avoid preview branches, large builds, SSR, WAF,
custom domains and additional services for this demo. Rebuilds, retained artifacts,
traffic and the existing separately billed backend can increase spending.
No budget, Cost Explorer query, billing setting or paid hosting resource was created.

## Final verification and stop point

- npm run check passed: all 63 repository tests, typechecks, ESLint, Prettier and
  shared/API/infrastructure/frontend production builds.
- Workspace-local Ruff check and format verification passed.
- CDK synth with lookups disabled passed for five stacks.
- Read-only CDK diff used template mode, with zero differences across all five stacks.
- Deployed-resource verification passed for 61 existing resources; public Cognito,
  JWT scopes, private S3, ownership and deferred AI infrastructure remain intact.
- Hosting YAML, headers, SPA routing, missing-config rejection, artifact exclusions
  and deployed public identifiers passed local validation.

The static frontend and Amplify configuration are ready for a staged hackathon
hosting deployment review. All requested local manual flows were reported working;
phone capture and hosted-domain validation are explicitly deferred. This is not a
completed production AI service: analysis remains ANALYSIS_NOT_IMPLEMENTED.
STOP: Amplify and CORS deployment require explicit approval. Phase 5 remains deferred.

Safe ignored evidence resides in .deployment/phase4-final-acceptance-check.txt,
phase4-final-synth.txt, phase4-final-readonly-diff.txt,
phase4-final-production-browser.json, phase4-final-resource-check.txt,
phase4-final-artifact-review.json, phase4-final-format-verification.json and
phase4-hosting-validation.json. No secrets or image content were exported.

Camera reference: [W3C HTML Media Capture](https://www.w3.org/TR/html-media-capture/).
Monorepo reference: [AWS Amplify monorepos](https://docs.aws.amazon.com/amplify/latest/userguide/monorepo-configuration.html).
