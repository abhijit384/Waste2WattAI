# Data model

## Phase 2 storage definitions

No tables or buckets are deployed or seeded. CDK defines retained, encrypted resources.

| Table           | Partition key         | Sort key                            | Access pattern                            |
| --------------- | --------------------- | ----------------------------------- | ----------------------------------------- |
| WasteScans      | ownerId (String)      | scanId (String)                     | Exact owner-scoped scan lookup/update     |
| DailyMetrics    | ownerId (String)      | metricDate (String, UTC YYYY-MM-DD) | Owner-scoped dashboard range queries      |
| RecoveryFactors | materialType (String) | factorVersion (String)              | Versioned factor lookup by waste material |

Physical table names are waste2watt-{stage}-WasteScans, waste2watt-{stage}-DailyMetrics,
and waste2watt-{stage}-RecoveryFactors. The WasteScans OwnerCreatedAt GSI uses ownerId
as partition key and createdAtScanId as sort key, with ALL projection. The future
createdAtScanId format is ISO8601-UTC#scanId so time-ordered pagination has a stable
tie-breaker. No Scan API is required for these access patterns.

All tables use PAY_PER_REQUEST, AWS-managed encryption, point-in-time recovery,
deletion protection, and RETAIN for removal/replacement. TTL is deliberately omitted:
metadata/approved factors must not silently expire with demo image uploads.

## Intended item semantics (Phase 3)

WasteScans will store source bucket/key/version, creation time, status, measured
mass where available, evidenced results, and limitations. ownerId comes from
validated Cognito sub. scanId is the API-facing identifier; existing shared
WasteSample.sampleId and analysis contracts remain unchanged pending service design.

DailyMetrics will store owner-scoped per-day measured/validated aggregates, including
bounded hotspot/material breakdowns. Both dashboard endpoints query this table for
the authenticated owner and requested date range. Large or high-cardinality hotspot
data will require a separate design before implementation; no global cross-owner
location index or fabricated aggregates are defined.

RecoveryFactors will store source URI, source/version, units, effective date,
methodology, applicability bounds, and approval state. factorVersion should be a
sortable effectiveAt#version identifier. The service must select an approved,
applicable version rather than assuming the latest row is valid. No seed rows,
numeric factors, sustainability conversion constants, or defaults are included.

## Image object storage

The private versioned S3 bucket has bucket-owner enforced ownership, AES256
server-side encryption, public-access blocking, and a TLS-only policy. Future keys
follow uploads/{ownerId}/{scanId}/{opaqueName}. No presigned URL is persisted.
CORS allows PUT from only frontendOrigin, content-type and x-amz-* headers, and ETag
exposure. The upload-signing handler remains HTTP 501 and has no S3 grant.

In dev/staging, uploads/ current versions expire after 30 days, noncurrent versions
after 7 days, and incomplete multipart uploads after 1 day. In prod, current versions
do not expire automatically; noncurrent versions expire after 30 days. The bucket
is retained in every stage. Lifecycle deletion is asynchronous; deleting current
versions in a versioned bucket may first create a delete marker. Metadata may therefore
outlive images and Phase 3 must expose image availability separately.

## Shared contracts and scientific semantics

Existing TypeScript interfaces remain in packages/shared/src/index.ts; Python
analysis/decision wire types remain in packages/shared/python/waste2watt_shared.
They are type hints, not runtime validators or final persistence schemas.

IDs are opaque; timestamps are ISO 8601 UTC. Mass is labeled in kilograms and energy
in kWh; no conversion is implemented. An absent measurement means unknown. A null
energy estimate means unknown, never zero. Evidence must identify traceable sources
and versions; methods, applicability, uncertainty, and limitations must be established
before estimates are produced. No model accuracy or environmental benefit is claimed.
