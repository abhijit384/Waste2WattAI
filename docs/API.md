# API

HTTP API application routes require a Cognito access token in the Authorization
Bearer header. API Gateway checks issuer, audience, expiry and the
aws.cognito.signin.user.admin scope. The Lambda additionally checks token_use,
client_id and a UUID sub from trusted authorizer claims. It never decodes an
unverified header as identity or accepts userId/ownerId from a request.

The native Amplify SRP flow produces this Cognito scope, rather than the custom
OAuth scope defined for future hosted login. See
[AWS native authentication flow scope behavior](https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flows-public-server-side.html).
All nine routes remain JWT protected. CORS admits only configured exact frontend
origins: localhost by default, plus the actual Amplify origin when available.
Responses use cache-control: no-store. Live endpoint verification is pending the
non-root credential gate; see INTEGRATION_TESTING.md.

## Implemented scan routes

| Route                           | Input                                      | Response                        |
| ------------------------------- | ------------------------------------------ | ------------------------------- |
| POST /scans                     | quantityKg, unit: kg, optional sourceLabel | 201: scanId, status: CREATED    |
| POST /scans/{scanId}/upload-url | contentType, sizeBytes                     | 200: url, fields, expiresAt     |
| GET /scans?limit=20&cursor=...  | limit 1..50; optional opaque cursor        | 200: items, optional nextCursor |
| GET /scans/{scanId}             | UUID scanId                                | 200: WasteScan                  |

Create and upload bodies are strict shared Zod schemas. JSON body length is
bounded at 4096 characters; base64 bodies and extra fields are rejected.
quantityKg must be finite, positive and at most 1,000,000; it is user-entered
approximate mass, not a measured result. sourceLabel is optional, trimmed, and
1..80 characters.

Creation uses a server-generated cryptographic UUID and persists the Cognito sub,
timestamps and CREATED status. organizationId is recorded only if a trusted
custom:organizationId claim is available. The current Cognito configuration does
not provision organizational membership or custom access-token enrichment.

Upload MIME types are image/jpeg, image/png and image/webp. sizeBytes must be
an integer from 1 through 10,485,760 (10 MiB, the configured 10 MB limit).
The server checks ownership and state before signing. It generates the object key;
the request cannot specify a filename, owner or S3 key.

The response is a five-minute presigned POST, not a permanent object URL. Submit
a multipart FormData POST to url, appending every fields entry, then file last.
Do not manually set the multipart Content-Type header. The policy binds the
exact key, declared MIME type, exact declared file size, AES256 encryption and
204 success status. Credentials in the signing fields are short-lived signed
upload material, never bucket access secrets.

Requesting credentials conditionally persists UPLOADING and object metadata
before returning. A retry can reuse the same key only with identical MIME and
size while UPLOADING. Later states return 409. A signed POST remains replayable
until expiration; full event/image-version idempotency is deferred.

List uses Query on OwnerCreatedAt with an exact owner partition and descending
creation order. No table Scan is used. The bounded base64url cursor is validated
and bound to the current user, including on later pages. The GSI is eventually
consistent; exact get uses a consistent owner-scoped GetItem. A foreign or
missing scan produces the same 404. Internal ownerId/index fields and objectKey
are omitted from scan responses.

WasteScan includes scanId, userId, optional organizationId, status, createdAt,
updatedAt, quantityKg, unit, optional sourceLabel/contentType/sizeBytes/failureCode.
It does not include AI results or permanent S3 URLs.

## Processing states

CREATED -> UPLOADING -> UPLOADED -> PROCESSING -> FAILED.

S3 ObjectCreated drives the workflow. The status worker matches the private key
and database record, checks version-specific object metadata, and persists upload
and processing status. These transitions may occur too quickly to be observed
individually. Placeholder analysis deliberately fails with
ANALYSIS_NOT_IMPLEMENTED. FAILED and COMPLETED are terminal; no code in Phase 3
generates COMPLETED or a classification.

UPLOAD_REJECTED denotes metadata mismatch; PROCESSING_FAILED denotes another
processing failure. Terminal workflow failures also attempt a persisted FAILED
status. EventBridge delivery is best effort and DLQs/alarms capture failures;
status reconciliation and replay tooling are deferred.

## Errors and deferred routes

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Check the request fields, image type, and size.",
    "requestId": "request-correlation-id"
  }
}
```

Expected statuses: 400 invalid request/cursor, 401 missing or inappropriate
identity, 404 unavailable owned scan, 409 upload state conflict, 500 unexpected
service failure, 503 unavailable runtime configuration. Gateway authentication
errors can use its own response format. No stack traces or AWS exception details
are returned. Logs contain correlation ID, route, status and safe error code;
JWTs, headers, labels and upload credentials are not logged.

GET /dashboard, GET /dashboard/hotspots, POST /simulate, POST /agent/chat and
GET /recovery-factors retain honest 501 boundaries. The UI dashboard derives
recent scan metadata from GET /scans; it does not call an invented metrics API.
