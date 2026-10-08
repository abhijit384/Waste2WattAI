# Data model

No tables or buckets have been deployed or seeded.

| Table           | Partition key         | Sort key                    | Access pattern                  |
| --------------- | --------------------- | --------------------------- | ------------------------------- |
| WasteScans      | ownerId (String)      | scanId (String)             | Owned exact lookup/update       |
| DailyMetrics    | ownerId (String)      | metricDate (UTC YYYY-MM-DD) | Future owner/day aggregates     |
| RecoveryFactors | materialType (String) | factorVersion (String)      | Future evidenced version lookup |

All tables retain PAY_PER_REQUEST, AWS-managed encryption, PITR, deletion
protection and RETAIN. No TTL or seed rows are added. DailyMetrics and
RecoveryFactors are unchanged from Phase 2.

## WasteScans

Phase 3 reuses the existing OwnerCreatedAt GSI: ownerId partition,
createdAtScanId sort key, ALL projection. No replacement or new index is necessary.
ownerId is the authenticated Cognito sub, identical to the public userId.
createdAtScanId is ISO-UTC#scanId, providing stable newest-first ordering.

Persisted fields:

| Field                   | Semantics                                                      |
| ----------------------- | -------------------------------------------------------------- |
| scanId                  | Server-generated UUID                                          |
| ownerId / userId        | Trusted Cognito sub; owner partition                           |
| organizationId          | Optional trusted identity claim, never request body            |
| status                  | CREATED, UPLOADING, UPLOADED, PROCESSING, COMPLETED, FAILED    |
| createdAt / updatedAt   | ISO 8601 UTC                                                   |
| createdAtScanId         | Internal GSI sort key                                          |
| quantityKg / unit       | Positive approximate user input, unit kg                       |
| sourceLabel             | Optional bounded source/location label                         |
| objectKey               | Server-generated private key, internal only                    |
| contentType / sizeBytes | Validated upload declaration                                   |
| failureCode             | ANALYSIS_NOT_IMPLEMENTED, UPLOAD_REJECTED or PROCESSING_FAILED |

Create is conditional on a missing owned key. Upload preparation conditionally
matches current status and object key. Status updates conditionally match the
same object key and permitted predecessor states; terminal states are preserved.
Exact reads use ConsistentRead. History uses descending owner-index Query,
with owner-bound validated pagination; it is eventually consistent.

API response schemas strip storage-only fields. No presigned credentials are
persisted. Image versions are used for event metadata checks but are not yet
persisted as a durable processing/version idempotency key.

## Image storage

Objects use private/{userSub}/{scanId}/{serverUUID}.{jpg|png|webp}.
The bucket is versioned, private, bucket-owner enforced, AES256 encrypted,
public-access blocked and TLS-only. Exact-origin CORS permits POST. Presigned
POSTs constrain key, MIME, exact declared bytes and encryption for five minutes.

Dev/staging current private/ uploads expire after 30 days, noncurrent versions
after 7 days, incomplete multipart uploads after 1 day. Production retains
current images and expires noncurrent versions after 30 days. The bucket is
retained. Lifecycle deletion is asynchronous and metadata may outlive images.

No raw permanent image URL is returned. A future view endpoint can check
ownership then issue a short-lived signed GET with a separately scoped read
permission. The current API role has upload permission only.

## Scientific semantics and deferred storage

Approximate mass is not validated waste composition, analyzed mass, diversion,
energy or emissions savings. Unknown estimates remain absent/null, never
manufactured zero values. RecoveryFactors must eventually hold traceable source,
version, units, effective date, methodology, applicability bounds and approval
state. No environmental conversion constants or records are supplied.

Daily aggregates, organization tenancy, result schemas, version deduplication
and approved recovery calculations remain Phase 4 work. Phase 3 shared scan
contracts use Zod runtime validation; legacy Python AI wire contracts are still
deferred type hints.
