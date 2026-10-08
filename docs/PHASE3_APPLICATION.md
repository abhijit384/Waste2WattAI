# Phase 3 application foundation

Implemented locally on 2026-10-08. No AWS deployment, account mutations, real
image uploads, model invocations or environmental calculations occurred.

## Authentication and configuration

Amplify Authenticator provides native Cognito SRP sign-up/sign-in, email
confirmation, password recovery/reset and MFA challenges. SDK session restoration
and Hub events feed protected routing and SDK sign-out. Token storage is managed
by Amplify CookieStorage; the application never persists passwords or tokens
itself. Secure cookies on HTTPS and SameSite=Strict are configured. Cookies remain
JavaScript-readable; this does not eliminate XSS risk.

Required frontend variables: VITE_AWS_REGION, VITE_COGNITO_USER_POOL_ID,
VITE_COGNITO_USER_POOL_CLIENT_ID, VITE_API_URL. Vite loads apps/web/.env.local.
Missing values show a controlled developer shell; there are no dummy AWS IDs or
mock authentication services. Auth UI is lazy-loaded.

The HTTP API requires the native Cognito access-token scope and configured
audience. Lambda checks trusted Gateway access claims, client and UUID sub.
Custom OAuth scope definitions remain for future hosted login. Organizational
identity is only accepted from trusted claims; organization membership is deferred.

## Scan and upload flow

1. Choose camera capture (where supported) or a JPEG/PNG/WebP file.
2. Validate nonempty bytes and 10 MiB maximum, then show a local preview.
3. Enter approximate quantity in kg and optional source/location label.
4. POST /scans creates a cryptographic UUID owned by the authenticated sub.
5. POST /scans/{scanId}/upload-url checks ownership and creates a private key.
6. Upload multipart directly to private S3 using five-minute constrained POST fields.
7. Show progress and poll GET /scans/{scanId}, with cancellation and bounded retries.
8. Show real statuses and the honest development failure when analysis is deferred.

The status worker checks object metadata/ownership, updates processing state and
marks the deliberate placeholder failure. Terminal workflow failures also attempt
status persistence. History queries only the owner's existing GSI; details use
owned consistent reads. Returned records omit internal S3 keys.

## Pages

| Route         | Phase 3 behavior                                                      |
| ------------- | --------------------------------------------------------------------- |
| /             | Graphite/emerald landing page with brand/tagline and calls to action  |
| /auth         | Cognito form or explicit developer configuration screen               |
| /dashboard    | Real recent scans; honest unavailable sustainability cards            |
| /scan         | Camera/file preview, kg/source form, secure upload, progress, polling |
| /history      | Newest-first owned scans, pagination, refresh and detail status       |
| /digital-twin | Explicit future product shell                                         |
| /simulator    | Explicit future product shell                                         |
| /advisor      | Explicit future product shell                                         |
| /settings     | Session identity and privacy/configuration information                |

Seven application routes are protected. Navigation is responsive. Forms have
labels, touch targets, focus outlines and text status cues; skeleton, error,
retry and empty states are implemented. No successful AI result is simulated.

## Files created or modified

| Area                | Files                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared              | packages/shared/src/scans.ts (new); src/index.ts; package.json                                                                                                              |
| API                 | services/api/src/scans.ts, aws.ts, status.ts, status-handler.ts (new); handler.ts, package.json, tsconfig.json                                                              |
| Frontend source     | apps/web/src/config.ts, auth.tsx, api.ts, file-validation.ts, components.tsx, pages.tsx, AuthenticatorPanel.tsx, application.test.tsx (new); App.tsx, main.tsx, styles.css  |
| Frontend setup      | apps/web/package.json, vitest.config.ts (new)                                                                                                                               |
| Infrastructure      | infra/src/application.ts; stacks/auth-stack.ts, api-stack.ts, data-stack.ts, pipeline-stack.ts, observability-stack.ts; infra/tests/infrastructure.test.ts; infra/README.md |
| Service tests       | tests/scans.test.ts and tests/preview.mjs (new); tests/api.test.ts, tests/README.md                                                                                         |
| Repository setup    | package.json, package-lock.json, .env.example, AGENTS.md, .gitignore, .prettierignore, eslint.config.js                                                                     |
| Documentation       | README.md; docs/API.md, DATA_MODEL.md, ARCHITECTURE.md, DEPLOYMENT.md, VERIFICATION.md; PHASE3_APPLICATION.md (new); historical PHASE2_INFRASTRUCTURE.md note               |
| Visual verification | docs/screenshots/phase3-landing-desktop.png, phase3-landing-mobile.png, phase3-auth-configuration.png                                                                       |

Generated node_modules, dist files, CDK assemblies/caches, npm cache and local
browser profiles are ignored verification artifacts under this project.

## Security decisions

Strict shared Zod schemas reject client identity and arbitrary keys.
All scan-specific actions enforce ownership. List uses an owner-constrained
Query and validated owner-bound cursor, never table Scan.
S3 public blocking, encryption, TLS, bucket-owner ownership and exact-origin CORS
remain enabled. POST policy binds exact MIME, bytes, server key and encryption.
No permanent image URL or AWS access secret is sent to the browser.
API errors are safe; structured logs exclude JWTs, credentials and sensitive headers.
Roles are scoped to scan resources: no unrelated tables or AI permissions.
Conditional writes prevent stale events from overwriting terminal statuses.

Declared MIME and Head metadata are not image-content validation. Signed POST
credentials are bearer capabilities until expiry and can be reused during that
period. Their narrow policy limits use but does not establish exactly-once ingestion.

## Local checks and intentionally deferred work

Run npm ci --ignore-scripts, npm run dev and npm run check from the root;
npm run synth --workspace @waste2watt/infra synthesizes without lookups.
See [verification](VERIFICATION.md) for actual results and limits.

Phase 4: real classification, Bedrock verification, SageMaker/Strands execution,
approved recovery factors, aggregates/hotspots, twin/simulator/advisor behavior,
signed GET viewing, full upload/version idempotency and replay, magic-byte/malware
checks, abandoned-upload reconciliation, organization membership and production
hosting. Deployment and live cloud acceptance tests need separate authorization.
