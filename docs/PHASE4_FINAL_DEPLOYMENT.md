# Phase 4 final deployment and Stage 2 origin integration

Review date: 2026-10-08. Environment: dev, account 415150458314, region
us-east-1. The approved Amplify origin is
`https://main.d1kq8pn2nvv063.amplifyapp.com`.

## Status

Stage 2 is deployed. The existing Data, Auth and API stacks were updated in place
for the exact Amplify origin. All five application stacks have zero remaining CDK
diff. Authenticated dashboard, history, scan upload, session restoration, sign-out
and expected pipeline-failure checks have now passed using three labeled test
images. Hosted signup/email confirmation and all ten physical Android tests are
now user-confirmed passes. The approved logging fix is deployed and verified;
Phase 4 is complete for the approved scope. Phase 5 has not started.

The AWS identity was verified before deployment as the non-root IAM user
`arn:aws:iam::415150458314:user/waste2watt-developer` using profile
`waste2watt-dev` in `us-east-1`. The GitHub repository remains private at
`https://github.com/abhijit384/Waste2WattAI`; the Stage 1 commit on `main` was
`2331c0ea2a825805f0c4ee79476b7b2e405a6f30`.

## Deployment scope and result

The fresh pre-deployment diff contained only these three in-place property updates:

| Stack                     | Existing resource           | Approved update                                                                                                                             |
| ------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Waste2WattDataStack-dev` | Private image bucket        | Add exact HTTPS Amplify origin to S3 POST CORS; retain localhost, `content-type`, `x-amz-*`, `ETag`, encryption and public-access blocking. |
| `Waste2WattAuthStack-dev` | Existing Cognito app client | Add exact `/auth/callback` and `/` logout URLs; retain localhost and existing auth flows.                                                   |
| `Waste2WattApiStack-dev`  | Existing HTTP API           | Add exact HTTPS origin; retain localhost, GET/POST/OPTIONS and authorization/content-type headers.                                          |

No resource was added, deleted, replaced, or granted new IAM permissions. No
unrelated service was deployed. The three reviewed stacks completed successfully:
Data, Auth and API each reported `UPDATE_COMPLETE`. Post-deployment status showed
Pipeline `UPDATE_COMPLETE` and Observability `CREATE_COMPLETE`. A fresh CDK diff
reported zero differences for all five stacks.

## Live origin and security checks

- API Gateway OPTIONS preflight returned 204 with the exact Amplify origin, methods
  GET/POST/OPTIONS and headers authorization/content-type. An unauthenticated GET
  returned the expected 401 and included the exact `Access-Control-Allow-Origin`.
- S3 OPTIONS preflight returned 200 for POST from the exact origin and expected
  `content-type`/`x-amz-*` upload headers. The bucket still allows POST only and
  exposes ETag. Public access block remains fully enabled; default encryption is
  AES256. No S3 object or upload policy was changed by this integration.
- Cognito callback/logout lists contain the exact hosted URLs and retained
  localhost. SRP and refresh auth flows remain enabled; the app uses inline SRP,
  so the callback allowlist does not mean a Hosted UI callback handler exists.
- The HTTPS home and `/auth` pages rendered. A direct unauthenticated `/dashboard`
  navigation redirected to `/auth`, as expected. Authenticated `/dashboard`,
  `/history` and `/scan` loaded directly; history also survived a hard refresh. The deployed SPA rewrite covers
  `/auth`, `/dashboard`, `/scan`, `/history`, `/digital-twin`, `/simulator`,
  `/advisor` and `/settings`.
- The current production artifact contains six files (1,218,578 bytes). Public
  configuration matches deployed outputs; bounded scans found no AWS key/private
  key patterns, environment files, source maps, or localhost backend endpoint.
- Three synthetic, clearly labeled PNG/JPEG/WebP test scans were created through
  the hosted UI at 0.001, 0.002 and 0.003 kg. PNG and JPEG progress reached 100%;
  all three appeared with their source labels and quantities in owner-scoped
  history and reached the expected `FAILED` / `ANALYSIS_NOT_IMPLEMENTED` state
  after the existing EventBridge/Step Functions path ran. No AI result was
  produced. PNG/JPEG were generated as 8×8 test images. The WebP fixture is the
  public-domain Yellow Rose sample linked from [Google's WebP Gallery](https://developers.google.com/speed/webp/gallery2?hl=en).
  These three records and private image objects were retained; nothing was deleted.
- The user signed in directly in the visible browser. A hard refresh of the
  authenticated history page restored the session; sign-out returned to `/auth`,
  and a subsequent `/dashboard` navigation redirected to `/auth`. No password or
  confirmation code was entered in chat. Hosted signup/email confirmation were
  not exercised in this run.
- The API, HTTP access, pipeline, status and Step Functions log groups were
  reviewed after these requests. Step Functions recorded the expected
  `Phase3NotImplemented` failure and terminal `AnalysisFailed`; no unexpected
  access-log integration error appeared. The API Lambda currently emits its
  structured request summary through `console.error`, so successful `GET /scans`
  entries appear at CloudWatch `ERROR` severity with status 200. This pre-existing
  logging-level issue was not changed in the CORS-only deployment. Browser
  console checks after authenticated flows returned no warnings or errors.
- A prior authenticated backend check verified that a different real user's scan
  and upload-policy requests returned 404. This Stage 2 session used one signed-in
  account and did not repeat the second-account flow; Stage 2 did not change API
  authorization or ownership logic.
- An unrelated origin received no API allow-origin header and S3 rejected its
  preflight with 403. S3's public-access block remained fully enabled. No scan or
  upload was created as part of the anonymous preflight checks.

## Hosted frontend configuration

The Amplify app is the existing static WEB app `Waste2WattAI` (`d1kq8pn2nvv063`),
branch `main`, served at
[`https://main.d1kq8pn2nvv063.amplifyapp.com`](https://main.d1kq8pn2nvv063.amplifyapp.com).
The branch is marked `PRODUCTION` in Amplify; latest hosting job 1 is `SUCCEED`.
The app root is `apps/web`; builds use Node 24, npm workspaces, `npm ci`, and
`apps/web/dist`. The production build received only public client configuration:

| Variable                           | Value                                                    |
| ---------------------------------- | -------------------------------------------------------- |
| `AMPLIFY_MONOREPO_APP_ROOT`        | `apps/web`                                               |
| `VITE_AWS_REGION`                  | `us-east-1`                                              |
| `VITE_COGNITO_USER_POOL_ID`        | `us-east-1_yeSnElyWb`                                    |
| `VITE_COGNITO_USER_POOL_CLIENT_ID` | `6bm90i6dleurqgrieurnanfvr`                              |
| `VITE_API_URL`                     | `https://c2ntcib53m.execute-api.us-east-1.amazonaws.com` |

These are public identifiers/endpoints; no credentials, keys, passwords, tokens or
secrets belong in VITE settings. The existing security headers and static SPA
rewrite remain configured in Amplify. No backend was provisioned through Amplify.

## Validation

`npm run check` passed with 63 tests: 25 shared/API tests, 16 infrastructure tests,
20 web tests and 2 Python tests. Typechecks, ESLint, Prettier and the production
build passed. Vite reported two upstream Zod annotation warnings and still built
successfully. Local CDK synthesis completed with lookups disabled. The pre-deploy
diff was exactly the three rows above; the post-deploy five-stack diff is empty.

The standard npm check first failed in the restricted sandbox because Vite could
not resolve a test file (`EPERM`); rerunning with project access passed. This was a
local test-runner permission issue, not an application test failure.

## Historical acceptance checklist before final stabilization

The checklist below describes the earlier pending state. Final stabilization is
complete: the user confirmed hosted signup, verification email receipt, email
confirmation, verified-account login and all ten Android tests. The API-only
logging deployment reached UPDATE_COMPLETE; live authenticated GET /scans logged
INFO, and a synthetic direct Lambda request lacking identity returned 401 and
logged ERROR. Request correlation and safe metadata were preserved. No server
fault was deliberately induced. The final five-stack CDK diff is zero.

The complete validation run passed 64 tests plus typechecks, lint, formatting and
production builds; CDK synthesis passed. Authenticated dashboard/history remained
functional and browser console warnings/errors were absent. The SQS alarm is
explained: ten executions show Phase3NotImplemented/AnalysisFailed and the two
existing failure-reporting paths account for a stable twenty-message backlog.
No queue bodies were read or messages modified; retention and alarm settings were
preserved. See [final acceptance](PHASE4_FINAL_ACCEPTANCE.md) for findings and
evidence limits. There are no remaining acceptance blockers in the approved scope.

The user is testing signup and email confirmation directly in the visible browser;
no password, confirmation code or token was requested in chat. The remaining
acceptance items are:

- Record the result of the user-run signup/email-confirmation test. Existing-account
  sign-in, session restoration after hard refresh, sign-out and protected-route
  redirect have passed.
- Verify protected routes, dashboard data, scan creation, quantity/location,
  history, expected `ANALYSIS_NOT_IMPLEMENTED`, and cross-user ownership behavior.
- Verify PNG/JPEG/WebP upload, progress, S3 access denial anonymously and the
  existing EventBridge/pipeline status path. Do not expect analysis to succeed.
- Review CloudWatch logs generated by those requests and check the browser console.
- Check responsive behavior and camera/file selection in a physical Android
  browser over HTTPS. No native framework or Android SDK is needed.

The hosted scan page's camera input has `accept="image/*"` and
`capture="environment"`; its separate picker accepts
`image/jpeg,image/png,image/webp`. The in-app browser did not apply its requested
390×844 viewport override, so this run does not claim a hosted mobile layout pass
or physical camera test. Prior localhost mobile-width acceptance is recorded in
[hosting readiness](PHASE4_HOSTING_READINESS.md).

Current browser-authenticated API, history, PNG/JPEG/WebP uploads, pipeline status,
session restoration, sign-out and protected-route redirect are verified. Hosted
signup/email confirmation and physical-device acceptance remain **unverified**;
the second real-account isolation result is inherited from the earlier backend
test and was not repeated after this CORS-only deployment. Do not describe Phase 4
as fully complete until outstanding checks are recorded. Do not start Phase 5
without separate approval.

## Cost and change control

This integration changed properties on existing resources and created no new
service or cost-bearing resource. Existing S3 versioned storage, DynamoDB PITR,
Lambda/API requests, Step Functions, SQS, CloudWatch and Amplify builds/hosting
remain billable at their configured usage. The hosting budget alerts/credit balance
were not revalidated in this Stage 2 run; use paid-rate assumptions and monitor the
existing documented budget safeguards. No billing or organization setting changed.

Safe local evidence is stored under the ignored `.deployment/` directory, including
the pre-deploy diff, deployment output, post-deploy diff, check output and artifact
scan. No credentials or browser tokens were written to those files.
