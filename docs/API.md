# API

## Defined routes

Phase 2 defines these HTTP API routes, all protected by the same Cognito JWT
authorizer and the required waste2watt-api/access scope. All integrate with the
existing services/api/src/handler.ts. Nothing is deployed.

| Method | Route                      | Future behavior                               |
| ------ | -------------------------- | --------------------------------------------- |
| POST   | /scans                     | Register an owned scan                        |
| POST   | /scans/{scanId}/upload-url | Create a presigned S3 image upload URL        |
| GET    | /scans                     | List owned scans by creation time             |
| GET    | /scans/{scanId}            | Read an owned scan and its analysis           |
| GET    | /dashboard                 | Read owner-scoped daily metrics               |
| GET    | /dashboard/hotspots        | Read owner-scoped hotspot aggregates          |
| POST   | /simulate                  | Compare evidenced recovery options            |
| POST   | /agent/chat                | Ask the future Strands/Bedrock decision agent |
| GET    | /recovery-factors          | Read versioned approved factors               |

These paths supersede Phase 1's proposed /v1 paths. Payloads, pagination, validation,
idempotency keys, upload restrictions, and successful status codes remain deferred.

## Current Lambda response

Every authorized invocation returns HTTP 501, JSON content type, no-store cache
control, and this explicit error. It does not read or write storage.

```json
{
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "Waste2Watt API is a scaffold; this operation is not implemented.",
    "requestId": "<API Gateway request ID>"
  }
}
```

After a future deployment, API Gateway will reject missing/invalid JWTs and tokens
without the required access scope before invoking Lambda. JWT issuer is the user
pool URL; audience is the public web client's ID. Requiring the custom scope helps
ensure that access tokens, rather than ID tokens, authorize API calls.
The public client uses authorization-code flow; the future frontend must use PKCE
and request openid, email, profile, and waste2watt-api/access. No client secret exists.

The hosted login callback is frontendOrigin/auth/callback; logout returns to
frontendOrigin/. CORS permits only the configured frontend origin, GET/POST/OPTIONS,
and authorization/content-type headers. Browser preflight is handled by HTTP API CORS
and is not an application route. Stage throttling is 10 requests/second with burst 20.

Runtime owner checks still need implementation: ownerId must be derived from Cognito
sub and used in all repository keys. JWT validation alone does not implement row ownership.

## Internal pipeline input

The image pipeline consumes native S3 EventBridge Object Created events, with bucket
name and object key in detail.bucket.name and detail.object.key. Keys must start with
uploads/. Later presigned keys should use uploads/{ownerId}/{scanId}/{opaqueName}.
Metadata-to-scan verification, object version checks, content validation, and duplicate
event handling are deferred. The Phase 1 AnalysisRequestedEvent contract is not wired
to a custom event bus in Phase 2.

See [data model](DATA_MODEL.md) for storage keys and [deployment](DEPLOYMENT.md) for
configuration and outputs.
