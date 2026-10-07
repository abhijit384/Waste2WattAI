# API boundaries

## Current behavior

`services/api/src/handler.ts` exports an async API Gateway HTTP API Lambda boundary.
It returns status `501`, JSON content type, `cache-control: no-store`, and:

```json
{
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "Waste2Watt API is a scaffold; this operation is not implemented.",
    "requestId": "<API Gateway request ID>"
  }
}
```

No routes are registered. There is no HTTP server, deployed gateway, authentication,
input validation, persistence, upload signing, event publishing, or successful endpoint.
The handler assumes API Gateway's event shape; it is not a public input validator.

## Proposed endpoints — not implemented

| Method | Path                        | Intended purpose                              |
| ------ | --------------------------- | --------------------------------------------- |
| POST   | `/v1/uploads`               | Request an authorized S3 upload URL           |
| POST   | `/v1/samples`               | Register uploaded sample metadata             |
| GET    | `/v1/samples/{sampleId}`    | Read owned sample metadata                    |
| POST   | `/v1/analyses`              | Request asynchronous analysis                 |
| GET    | `/v1/analyses/{analysisId}` | Read owned job state/result                   |
| POST   | `/v1/decisions`             | Request contextual explanation of an analysis |

External payloads/status codes, pagination, upload limits, CORS, and idempotency are
not finalized. Internal `ownerId` values must come from validated identity, not a
client-supplied field. Cognito JWT authorization and runtime schemas must precede
enabling any real route.

## Internal contracts

TypeScript definitions live in `packages/shared/src/index.ts`. Python analysis and
decision wire types live in `packages/shared/python/waste2watt_shared` using the same
camelCase JSON keys. These are compile-time types only.

The proposed EventBridge detail is `AnalysisRequestedEvent` with `schemaVersion: "1"`
and an `AnalysisRequest`. Event source/detail-type, retry policy, dead-letter handling,
and Step Functions input mapping remain unspecified.
