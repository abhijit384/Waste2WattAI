# Phase 4 final acceptance and hosting review

Review date: 2026-10-08. Project: E:\Waste2WattAI. Profile: waste2watt-dev.
Region: us-east-1. Non-root waste2watt-developer identity was reverified in
account 415150458314. This review made no AWS infrastructure modifications,
deployments, resource creation, billing changes or model invocations.

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
