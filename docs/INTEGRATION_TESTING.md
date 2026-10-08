# Real integration verification

Phase 4 browser acceptance initially found a real tester's history/upload requests failing
with "Please sign in again." because strict RFC UUID validation rejects their
Cognito subject. The approved API/status fix and branded email template are now
deployed; see [limited update results](PHASE4_LIMITED_UPDATE.md). Public browser
checks pass; 15 real authenticated browser checks now pass for the affected user,
including JPEG upload, owned history and rejection of another real user's scan. See
[hosting readiness](PHASE4_HOSTING_READINESS.md) for the current matrix, prepared
Lambda/email changes and Amplify approval gate. The SDK evidence below predates
this finding and must not be treated as proof that all Cognito users work.

The authorized first development deployment completed on 2026-10-08; all five
stacks are CREATE_COMPLETE. STS verified the exact non-root waste2watt-developer
IAM user in account 415150458314. Dev concurrency is 10.
Live SDK tests passed email confirmation/recovery, SRP sign-in/out, authorization,
owned scans, foreign-owner fixture isolation, constrained PNG upload and genuine
S3/EventBridge/Step Functions failure persistence. See PHASE4_FIRST_DEPLOYMENT.md.
The user confirmed normal history hard-refresh, PNG/WebP uploads, context/progress,
failure/history display, signup/verification, logout/login, recovery/reset,
keyboard navigation and narrow signed-in layouts work. Actual phone capture and
hosted-domain acceptance are deferred. See [final acceptance](PHASE4_FINAL_ACCEPTANCE.md).
The full browser checklist below remains an acceptance plan. Matrix results record
live SDK/request checks where performed, with fixture and pattern-scan limitations
stated. They do not claim completed browser tests.
Local tests are separate evidence, never proof of live AWS success. Run only in the
authorized waste2watt-dev/us-east-1 environment after reviewed deployment. Record UTC
timestamps/status codes/opaque IDs locally under .deployment. Never record passwords,
JWTs, Authorization headers, signed POST fields, image content or mailbox codes.
Use harmless real test images owned by the tester.

## Authentication and scan path

1. Generate .env.local from actual outputs; run npm run dev. Open
   http://localhost:5173/auth; verify signup screen. Open /dashboard anonymously
   in a fresh browser profile: expect auth redirect and no scan data.
2. Register A with a controlled real mailbox/strong password. Confirm using emailed
   code in normal UI; wrong code must fail. Sign in. Do not use admin confirmation.
3. Reload /dashboard and /history: verify session restoration. Sign out and verify
   protected routes redirect; sign back in. Record no cookie/token values.
4. On /scan choose a small valid JPEG, enter kg and submit. Observe POST /scans:
   201 CREATED plus scanId. Do not export HAR files; they contain sensitive headers.
5. Inspect the exact deployed WasteScans item with A's Cognito sub and scanId as
   keys using authorized console/read-only CLI. Verify owner/user identity,
   quantity/timestamps/status. Do not export unrelated rows.
6. Observe upload-url 200: signed policy binds server-generated
   private/{sub}/{scanId}/{uuid}.jpg, exact MIME/byte count, AES256 and five-minute
   expiry. Inspect in memory only; credentials must not enter reports.
7. Observe multipart S3 POST 204. Authorized Head of exact key/version must match
   type/length/encryption. Repeat in separate scans with valid PNG and WebP images.
8. Inspect ImageCreated rule matched events/invocations and configured target.
   Confirm genuine S3 Object Created input with matching bucket/key/version in
   Step Functions execution history. Metrics may arrive late. A manually started
   execution does not prove S3/EventBridge delivery.
9. Confirm ValidateImage succeeds; ClassifyWaste throws Phase3NotImplemented;
   MarkScanFailed persists FAILED/ANALYSIS_NOT_IMPLEMENTED; RecordAnalysisFailure
   sends diagnostics; AnalysisFailed ends execution FAILED. Later AI/metrics stages
   must not run. Terminal event also updates status/queue; duplicates are expected.
10. Verify DynamoDB terminal status and frontend failure text agree. UPLOADED and
    PROCESSING can be too fast to see individually. No COMPLETED, classification,
    carbon or energy values should appear. Refresh history and the owned scan.
11. Register/confirm B in an isolated browser profile and create B's scan. GET /scans
    for each user must show only its records, including pagination. Own get is 200.

## Live security matrix

For authenticated negative requests, use the browser Network panel's Edit and
Resend on the corresponding actual request, retaining current Authorization only
inside the browser. Never copy tokens into shell/chat/notes/screenshots. If the
browser does not support this, a developer must execute equivalent requests with
tokens only in process memory; keep those tests pending until performed.

| Check                     | Operation                                                 | Expected                                | Live result                            |
| ------------------------- | --------------------------------------------------------- | --------------------------------------- | -------------------------------------- |
| Anonymous API             | GET /scans, remove Authorization                          | 401                                     | Pass 401                               |
| Invalid JWT               | GET /scans, Bearer invalid-test-token                     | 401                                     | Pass 401                               |
| Foreign get               | A GET /scans/{B-id}                                       | 404, same as missing ID                 | Pass 404 against another real user     |
| Foreign upload            | A POST /scans/{B-id}/upload-url, valid body               | 404, no policy                          | Pass 404 against another real user     |
| Unsupported MIME          | Own CREATED scan, upload-url image/gif                    | 400                                     | Pass 400                               |
| Too large                 | Own CREATED scan, upload-url sizeBytes 10485761           | 400, no policy                          | Pass 400                               |
| API key injection         | Add objectKey/key/ownerId to upload-url JSON              | 400                                     | Pass 400                               |
| Signed key tamper         | Edit S3 form key, keep signature/policy                   | 403, no foreign object                  | Pass 403                               |
| Signed size mismatch      | File larger than exact signed length                      | S3 rejection                            | Pass 400                               |
| Anonymous S3 GET          | Unsigned HTTPS GET actual uploaded key                    | 403 AccessDenied                        | Pass 403 actual PNG                    |
| Anonymous S3 LIST         | Unsigned bucket GET ?list-type=2                          | 403 AccessDenied                        | Pass 403                               |
| Unexpected CORS origin    | API OPTIONS from https://untrusted.example                | No allow-origin for it                  | Pass API and S3                        |
| Allowed origins           | API/S3 preflight from localhost and actual Amplify origin | Exact origin, never *                   | Pass localhost API/S3; hosting pending |
| API role tables           | Inspect deployed attached/inline IAM policies             | Only scans/GSI, no AI/unrelated tables  | Pass deployed IAM inspection           |
| Sensitive logging         | Inspect test-interval API/access/pipeline logs locally    | No JWT/Authorization/signatures/secrets | Pass bounded pattern scan              |
| Configured frontend build | Inspect dist before publishing                            | No secrets/private keys/JWT/env files   | Pass bounded pattern scan              |

Unsigned S3 checks must use no AWS signing. A CORS error or wrong-key 404 is not
proof of actual-object privacy. MIME checks verify declared metadata only; disguised
content/malware inspection remains deferred. Exact signed length prevents larger
S3 uploads when bypassing the frontend. GSI listing is eventually consistent;
retry boundedly before declaring recent rows missing.

## Evidence and completion

Record safe request IDs, test interval/status codes, exact-item status, execution
stage outcomes and log findings locally. Mark each row Pass, Fail or Not run with
a reason. Repeat auth/upload/ownership/hard-refresh/CORS from actual Amplify URL.
Inspect CloudWatch per TROUBLESHOOTING.md. Genuine observed results are required;
docs, unit tests, a build or synthetic pipeline execution do not satisfy this gate.
