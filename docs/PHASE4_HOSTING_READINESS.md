# Phase 4 browser acceptance and Amplify Hosting readiness

Review date: 2026-10-08. Project: E:\Waste2WattAI. Target: waste2watt-dev,
us-east-1. Amplify Hosting has not been created or deployed. No resources or test
data were deleted. Bedrock, SageMaker and Phase 5 remain deferred.

## Decision

Hosting preparation and local acceptance are ready for **staged hackathon hosting
deployment approval**. All 63 automated tests, production artifacts, synthesis and
the zero-difference read-only five-stack diff passed. The user confirms the remaining
desktop account, PNG/WebP, context, progress/error, history, keyboard and narrow
layout checks work. Actual phone capture and future hosted-domain HTTPS/CORS/SPA
acceptance are deferred until approved hosting. No Amplify or origin update was made.
See [final acceptance](PHASE4_FINAL_ACCEPTANCE.md) and
[limited update results](PHASE4_LIMITED_UPDATE.md) for evidence and its limits.

The frontend is running at http://localhost:5173 using the existing npm run dev
configuration. Use localhost: 127.0.0.1 is a different origin and is not currently
allowed by the deployed API/S3 CORS rules. Public identifiers were generated into
ignored apps/web/.env.local from deployment outputs. No passwords, mailbox codes,
tokens or signed upload fields were written into project files during this work.

## Browser acceptance results

Public tests used genuine Chrome in an isolated profile at 1440px and 390px widths,
with the real AWS configuration. No authentication bypass, sample scan injection
or simulated business success was used. The interactive browser tool failed to
initialize, so the existing project headless Chrome approach was used. Desktop
camera behavior and normal history/scan retesting were reported by the user.
The tester also ran a same-origin verifier using the genuine Cognito session; all
15 authenticated checks passed on 2026-10-08 at 09:53 UTC.

| Requested test            | Result                    | Evidence / remaining action                                                                                                           |
| ------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Landing                | Pass                      | Desktop/mobile render; no horizontal overflow                                                                                         |
| 2. Signup                 | Pass, manual              | User confirms genuine signup through legitimate authentication UI                                                                     |
| 3. Email confirmation     | Pass, manual              | User confirms verification; prior spam placement remains delivery-dependent                                                           |
| 4. Login/logout           | Pass, manual              | User confirms logout/login after update                                                                                               |
| 5. Session restoration    | Pass, user report         | User confirmed normal history hard-refresh works after update                                                                         |
| 6. Protected routes       | Pass, anonymous           | /dashboard, /scan, /history, /settings redirect to /auth; authenticated redirect-back needs retest                                    |
| 7. Password recovery      | Pass, manual              | User confirms genuine email-based forgot-password/reset flow                                                                          |
| 8. Dashboard              | Pass, manual              | User confirms navigation and narrow-width usability; genuine listing also passes                                                      |
| 9. Waste photo upload     | Pass, JPEG                | Real browser upload 204; user confirms normal scan flow works; sign-in error resolved                                                 |
| 10. Camera/file selection | Pass, MVP; phone deferred | Desktop picker accepted; native capture=environment requests rear camera; actual phone deferred until HTTPS                           |
| 11. PNG/JPEG/WebP         | Pass                      | PNG/WebP normal UI confirmed by user; prior independently recorded real JPEG and PNG SDK evidence retained                            |
| 12. Maximum file size     | Pass, manual/API          | User confirms unsupported and >10 MiB file rejection; authenticated metadata rejection 400 also verified                              |
| 13. Quantity/location     | Pass, manual              | User confirms different quantity and source/location submissions and history details; boundary validation covered locally             |
| 14. Upload progress       | Pass                      | User confirms normal progress; prior real JPEG verifier transfer reached 100%; retry/error states covered locally                     |
| 15. History               | Pass                      | Authenticated owned history 200; user confirms normal history and refresh work                                                        |
| 16. Processing/failure    | Pass                      | Exact JPEG scan FAILED/ANALYSIS_NOT_IMPLEMENTED; genuine S3 event execution verified                                                  |
| 17. Responsive layouts    | Pass locally              | Real Chrome public desktop/mobile widths; user confirms narrow signed-in dashboard/scan/history/navigation usability                  |
| 18. Console errors        | Pass, public pages        | Missing favicon fixed; zero public UI errors afterward. Intentional invalid-JWT request logs an expected 401                          |
| 19. Keyboard              | Pass with limits          | User confirms keyboard-only navigation; Chrome skip link and destination pass; comprehensive assistive-technology audit not performed |
| 20. Loading/error states  | Pass with limits          | User confirms file validation and failure states; controlled loading, config, API retry and upload errors covered locally             |

Fifteen automated public/browser checks passed. This is not fifteen completed
end-to-end account/upload scenarios. Safe summaries and screenshots are local in
.deployment/phase4-browser-results.json and .tmp/phase4-screenshots. Account
flows require direct user interaction; never export HAR files or copy tokens.

Post-update authenticated verification passed: valid non-RFC subject accepted;
owned create/read/history 201/200; anonymous and invalid JWT 401; another real
user's scan read/upload-policy 404; invalid MIME, oversized metadata and arbitrary
key injection 400; JPEG S3 upload 204; expected terminal failure persisted. Exact
AWS record/object/execution and 173 CloudWatch events were inspected read-only.
No unexpected runtime errors or credential patterns were found in that interval.

The user subsequently confirmed signup/confirmation/logout/recovery, browser
PNG/WebP, unsupported/oversized selection, quantity/location submission, signed-in
narrow layouts and keyboard navigation work. Physical phone capture and future
hosted-domain behavior remain deferred; a full accessibility audit is not claimed.
Tokens remained in browser memory; no credentials or signed fields were exported.

## Bugs and improvements prepared

1. **Cognito subject rejection:** z.uuid() required RFC UUID variant bits. Read-only
   inspection found a confirmed account with a non-RFC variant. AWS explicitly
   documents that Cognito sub values do not conform to a specific RFC UUID format.
   A shared cognitoSubjectSchema now validates only the lowercase hexadecimal
   8-4-4-4-12 shape in trusted claims, scan userId, pagination ownerId and pipeline
   status ownerId. Server-generated scan/upload UUID validation stays strict.
   Access-token type/client/scope checks and ownership checks remain enforced.
   Regression tests cover acceptance, malformed IDs, cross-owner rejection,
   pagination and terminal failure persistence. The approved fix is now deployed;
   real post-update non-RFC subject, upload, status and history checks passed.
2. **Authentication contrast:** inactive signup tab and password visibility control
   were too dark on the dark panel; corrected and visually inspected.
3. **Favicon:** added an SVG based on the existing brand mark, resolving public
   browser 404 errors.
4. **Camera wording:** clarified that phones may offer camera capture and desktops
   open a file picker. No desktop webcam preview was implemented.
5. **Phase labels:** analysis placeholders now say Phase 5.
6. **Email appearance:** prepared subject "Waste2Watt AI - your verification code"
   and a short branded body containing the Cognito {####} placeholder, instructions
   to enter the code only on the requesting page, and a warning against sharing it.
   No code values or new sender identities are stored.

The deployed email configuration is COGNITO_DEFAULT with the approved branded
subject/body now applied. Its default sender is no-reply@verificationemail.com. The user
reports spam-folder delivery; template branding does **not** guarantee inbox
placement. For stronger sender identity, separately approve an owned domain and
Amazon SES verified identity in us-east-1, DKIM, aligned SPF/DMARC, any needed SES
production access, and Cognito sender configuration. SES/domain/DNS/IAM changes
and associated charges are outside this preparation and have not been performed.
For this demo, the recipient can mark the expected message as not spam themselves.

## Security verification

| Control                 | Result and limitation                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JWT authorization       | PASS: real Cognito session with non-RFC subject returns owned API data; anonymous and invalid JWT requests return 401.                                                    |
| Cross-user ownership    | PASS: owned listing/read and real different-user scan GET/upload-policy rejection (404); ownership remains derived from validated claims.                                 |
| Private S3              | Fresh read-only checks: all four public-access blocks true, bucket policy IsPublic false; unsigned GET of the actual existing uploaded object 403                         |
| Arbitrary keys          | PASS: authenticated arbitrary key injection rejected 400; generated signed policy binds owner/scan prefix; prior actual S3 key tamper rejected 403.                       |
| Invalid/oversized files | PASS for metadata: real image/gif and >10 MiB requests rejected 400. Browser physical large-file selection and disguised image content remain limitations.                |
| Sensitive logging       | Fresh bounded scan of five API/access/pipeline log groups found no JWT/access-key/private-key/bearer patterns. Not a proof about every historical log or arbitrary secret |
| Frontend secrets        | Configured production artifacts scanned for credential patterns and prohibited env/credential files; no matches. Four VITE values are public identifiers only             |

Content checks currently validate declared MIME and actual object metadata, not
image decoding or malware. A disguised file with accepted MIME and matching size
is not guaranteed to be rejected. This is a documented limitation, not a claim
that all invalid image content is detected. CORS is a browser policy, not ownership
authorization. Browser-managed cookies are JavaScript-readable; do not describe
them as HttpOnly. On HTTPS, existing cookie configuration uses Secure and SameSite=Strict.

## Amplify build preparation

Root amplify.yml uses the npm-workspace monorepo format:

- appRoot: apps/web; set AMPLIFY_MONOREPO_APP_ROOT=apps/web in Amplify.
- frontend.buildPath: /; install from the repository root using the lockfile.
- Use the AL2023 Standard build image; explicitly select Node 24 with nvm.
  Project engines require Node >=24 <25 and npm >=11 <12. Local versions verified:
  Node 24.16.0, npm 11.13.0. Check npm 11 in the initial Amplify build log.
- npm ci --cache .npm-cache --prefer-offline; cache only .npm-cache.
- Validate the four public environment variables before building. Missing/invalid
  values, incorrect monorepo root, wrong region/API host or extra VITE variables
  fail the hosting build without logging values.
- Build @waste2watt/shared, then @waste2watt/web. No backend build/deploy command
  exists in this hosting specification.
- Publish only apps/web/dist and its files. No .env, source maps, Lambda assets,
  deployment outputs or repository root artifacts belong in the hosting upload.
- Vite injects environment variables during the build; changing them requires a
  rebuild. Local development still has a controlled missing-configuration screen.

Public Amplify environment values, checked against current deployment outputs:

| Variable                         | Value                                                  |
| -------------------------------- | ------------------------------------------------------ |
| AMPLIFY_MONOREPO_APP_ROOT        | apps/web                                               |
| VITE_AWS_REGION                  | us-east-1                                              |
| VITE_COGNITO_USER_POOL_ID        | us-east-1_yeSnElyWb                                    |
| VITE_COGNITO_USER_POOL_CLIENT_ID | 6bm90i6dleurqgrieurnanfvr                              |
| VITE_API_URL                     | https://c2ntcib53m.execute-api.us-east-1.amazonaws.com |

Never place AWS keys, passwords, client secrets, JWTs or signed upload policies in
VITE variables. The app client has no secret. Build-time AWS credentials are not
required for this static frontend; do not attach a broad backend deployment role.

docs/amplify-rewrites.json is the proposed Amplify customRules configuration: a
200 rewrite to /index.html for SPA navigation, with static asset extensions
excluded. Install it in the future Amplify app's redirect/rewrite settings; merely
committing the JSON does not activate it. Route and asset matching was checked
locally. After hosting, hard-refresh /dashboard, /scan and /history and verify that
JS/CSS/SVG/WebP assets have their correct content types, not HTML fallback content.

Root customHttp.yml uses applications/appRoot monorepo syntax and prepares HSTS,
nosniff, frame denial, referrer policy and a permissions policy that permits local
camera usage. Amplify supplies managed HTTPS and public SSL certificates. Use the
default amplifyapp.com domain for the demo; verify HTTPS and headers after hosting.
No custom domain, DNS or certificate resources have been created. These hosting
headers do not alter API or S3 response headers.

## Future origin and infrastructure changes

The current allowed origin is exactly http://localhost:5173. Once the actual
branch domain is known, use its exact HTTPS origin with no trailing slash and keep
localhost only while needed. Do not use *.amplifyapp.com or wildcard CORS.

Existing frontendOrigins configuration feeds API Gateway CORS, S3 POST CORS and
Cognito callback/logout URLs. A future review should include:

- Data stack: S3 allowed origins (POST, content-type/x-amz-* remain constrained).
- API stack: HTTP API allowed origins (GET/POST/OPTIONS, authorization/content-type).
- Auth stack: callback/logout URL allowlists for the future origin. Current inline
  SRP sign-in does not use Hosted UI OAuth callbacks; the app does not implement
  /auth/callback, so do not claim Hosted UI acceptance.
- Verify OPTIONS and actual authenticated requests/uploads from the hosted domain,
  and confirm an unrelated origin receives no allow-origin response.

Prepare a new read-only diff with scripts/aws-dev.ps1 -Action Diff and the actual
HostedOrigin before requesting deployment approval. The CORS origin changes have
not been made because the Amplify domain does not exist yet.

The present bug-fix diff requires API Lambda code and pipeline ScanStatus Lambda
code updates. The email improvement adds a Cognito verification-message template
update in the existing Auth stack. No resource replacement, deletion, new service,
IAM change or Phase 5 implementation is intended. All require explicit deployment
approval. They were subsequently explicitly approved and successfully deployed;
the post-update diff has zero differences. No Amplify or CORS change was deployed.

## Cost review

AWS prices checked on 2026-10-08, USD before taxes:

| Item                         | Published rate                                       |
| ---------------------------- | ---------------------------------------------------- |
| Standard build minutes       | $0.01/minute                                         |
| Large / XLarge build minutes | $0.025 / $0.10 per minute; unnecessary for this demo |
| CDN storage                  | $0.023/GB-month; recurring while retained            |
| Data transfer served         | $0.15/GB                                             |
| Public SSL certificates      | Included                                             |

Illustrative monthly usage: 20 builds at 5 minutes = 100 minutes, 1 GB of retained
artifacts and 5 GB served. Script-calculated charges are $1.00 for builds,
$0.023 for storage and $0.75 for transfer: **$1.773 (about $1.77/month)** before
any free allowance or credit. This is an Amplify-only scenario, not measured usage
or a total AWS bill. The current static build is approximately 1.22 MB uncompressed;
the 1 GB storage scenario leaves room for retained deployments and future assets.

The pricing page lists eligible allowances of 1,000 Standard build minutes, 5 GB
storage and 15 GB served/month. It also explains that customers joining from
2025-07-15 use the newer Free Tier credit program (up to $200; free plan six months,
credits expire within 12 months). Account-specific eligibility, remaining credits
and consumed allowances were not verified. Budget using paid rates; do not assume
this new account receives both legacy allowances and credits.

Recommend one static WEB app and one branch on Standard AL2023, default HTTPS
domain, npm download caching, and intentional builds with automatic branch/PR
previews disabled. No SSR/WEB_COMPUTE, WAF add-on, custom domain or new backend is
needed. WAF adds $15/app/month plus WAF usage. Failed/repeated builds, previews,
artifact retention, bot traffic/downloads, expired credits, domain registration
and optional email delivery can increase costs. Existing API Gateway, Cognito,
S3 upload/storage/versioning, Lambda, DynamoDB/PITR, Step Functions, SQS and
CloudWatch remain separately billable. Polling and repeated uploads generate
backend activity. No new hosting resource, budget or billing setting was created in this review.

## Local validation and evidence

- npm run check: passed with 63 tests (25 Node, 2 Python, 16 infrastructure,
  20 frontend), typechecks, ESLint, Prettier and builds. Repeated after final edits.
- Ruff check and format --check: passed, seven Python files already formatted.
- Local CDK synth with --lookups false: passed for five stacks, workspace-local output.
- Guarded CDK diff uses --method template (read-only; no change set creation).
- Hosting config guard, YAML parse, SPA rule/asset checks, configured artifact
  pattern scan and unsigned actual-object GET: passed.
- Vite reports two upstream Zod pure-comment annotation warnings; production build
  succeeds. No dependency was added to suppress them.

Safe ignored reports: .deployment/phase4-check.txt, phase4-synth.txt,
phase4-readonly-diff.txt, phase4-browser-results.json, phase4-security-results.json
and phase4-hosting-validation.json. Current final evidence is linked from
[final acceptance](PHASE4_FINAL_ACCEPTANCE.md). The bounded log scan and public browser checks
must not be represented as complete authenticated acceptance.

## Sources

- [Amplify monorepo configuration](https://docs.aws.amazon.com/amplify/latest/userguide/monorepo-configuration.html)
- [Node versions and AL2023](https://docs.aws.amazon.com/amplify/latest/userguide/troubleshooting-general.html)
- [SPA redirects and rewrites](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html)
- [Monorepo header syntax](https://docs.aws.amazon.com/amplify/latest/userguide/custom-header-YAML-format.html)
- [Amplify pricing](https://aws.amazon.com/amplify/pricing/)
- [Cognito subject format](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html)
- [Cognito email configuration](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html)
- [SES email authentication](https://docs.aws.amazon.com/ses/latest/dg/email-authentication-methods.html)
