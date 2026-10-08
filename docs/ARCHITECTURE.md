# Architecture

Waste2Watt AI remains AWS-native. Phase 3 adds a real application foundation to
the five locally synthesized CDK stacks. No AWS resources have been created.

```mermaid
flowchart LR
  Web[React / Vite frontend] --> Cognito[Cognito with Amplify Auth]
  Web -->|Access JWT| API[HTTP API JWT authorizer]
  API --> Handler[Scan Lambda]
  Handler --> Scans[DynamoDB WasteScans]
  Handler -->|Signed POST policy| Web
  Web -->|Private multipart upload| S3[Private S3]
  S3 --> EB[EventBridge ObjectCreated]
  EB --> SF[Step Functions]
  SF --> Status[Scan status Lambda]
  Status --> Scans
  Status -->|Head metadata| S3
  SF --> Stub[Deferred analysis stub]
  Stub --> Failure[Persist FAILED and SQS diagnostics]
```

## Stack boundaries

Data owns the private versioned bucket and three retained/PITR DynamoDB tables.
Auth owns the email Cognito pool, public SRP-capable client, resource server and
future hosted-login domain. API references Auth and Data, owning nine protected
routes, scan Lambda and access logs. Pipeline references Data, owning the status
worker, deliberate analysis stub, six intended task boundaries, EventBridge rules,
state machine and failure queue. Observability references API/Pipeline and
defines seven alarms. Strong export/import references avoid dependency cycles.

The existing OwnerCreatedAt index already supports user history, so no table
redesign was required. Other tables are unchanged.

## Authentication

Amplify Auth and its managed Authenticator implement sign-up, email confirmation,
sign-in, forgot/reset password and applicable MFA challenges. The provider
restores sessions through SDK APIs and Auth Hub events; protected routes show a
loading state and redirect anonymous users to /auth, preserving a safe destination.
Sign-out uses the SDK. No password or token is manually persisted.

Amplify owns CookieStorage with SameSite=Strict and Secure on HTTPS. Local HTTP
loopback uses non-Secure cookies for development. These browser-managed cookies
are JavaScript-readable, not HttpOnly: hosting must harden against XSS and use
HTTPS, CSP and secure headers in a future hosting phase. This is not a server
session/BFF design.

Native SRP access tokens use aws.cognito.signin.user.admin; HTTP API requires
that scope and the configured client audience. Lambda independently checks
access token_use/client_id and derives identity from trusted Gateway claims.
The existing custom OAuth resource scope is retained for a future hosted-login
flow. The client also permits the reserved scope in a future code flow. See
[AWS Cognito authentication flows](https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flows-public-server-side.html)
and [Amplify token storage](https://docs.amplify.aws/react/build-a-backend/auth/concepts/tokens-and-credentials/).

## Upload and status flow

The browser validates MIME/size, previews a local blob and collects approximate
kg plus an optional source label. It creates an owned scan, obtains constrained
credentials, and POSTs the image directly to S3 with progress reporting.
No image passes through API Gateway. Keys are generated on the server.
XHR requests can be aborted; polling is bounded, cancels on unmount and supports
manual refresh after stopping.

S3 events match this bucket and private/ prefix. ValidateImage now verifies
ownership/key and version-specific metadata and persists UPLOADED/PROCESSING.
It performs no image-content or malware inspection. ClassifyWaste still
deliberately throws. The catch marks FAILED before diagnostic queue delivery.
The remaining intended VerifyWithBedrock, RecoveryEngine, PersistResult and
UpdateDailyMetrics tasks retain safe placeholders and cannot produce results.
A final guard prevents false success. Terminal state-machine failure events
also reach the failure queue and status updater.

Conditional writes protect terminal statuses against duplicate events. They are
not complete exactly-once processing; full image-version idempotency, recovery
and reconciliation are deferred. No Bedrock, SageMaker or agent invocation occurs.

## Frontend and operational boundaries

Public landing and Cognito auth pages accompany seven protected pages:
dashboard, scan, history, digital twin, simulator, advisor and settings.
The UI uses graphite/emerald styling, semantic HTML, keyboard focus, text statuses,
mobile layouts, reduced-motion handling, loading/error/empty states and an error
boundary. Metrics honestly say Available after analysis. Future product pages
are explicit shells. Missing real AWS configuration yields a developer screen,
not mock accounts or data.

API IAM permits only WasteScans Get/Put/Update, Query on its specific GSI and
PutObject under private/*. The status role permits scan Get/Update and private
GetObject/GetObjectVersion because HeadObject requires these actions. No API or
status role can use unrelated tables or AI services. Prefix wildcards cover
server-generated object IDs; CloudWatch delivery APIs that do not support
resource scoping remain documented in the Phase 2 report.

CloudWatch logs retain 30 days and exclude execution data, JWTs and sensitive
headers. Existing Lambda, HTTP API, state-machine, throttling and queue alarms
are supplemented by status-worker errors. Notification destinations, deployment,
frontend hosting, scientific factors and AI execution remain deferred.
