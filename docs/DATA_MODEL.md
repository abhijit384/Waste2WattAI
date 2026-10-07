# Data model

These are provisional shared interfaces. No DynamoDB table, S3 bucket, database
migration, dataset, or persistence adapter exists.

| Model                    | Fields / purpose                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `ObjectReference`        | S3 bucket/key and optional version ID; no signed URLs persisted                              |
| `WasteSample`            | Sample ID, owner ID, creation time, object reference, optional measured mass and description |
| `AnalysisRequest`        | Analysis ID, sample ID, owner ID                                                             |
| `AnalysisJob`            | Request identity, state, creation/update times, optional result                              |
| `AnalysisResult`         | Analysis/sample identity, state, estimates, limitations                                      |
| `EnergyEstimate`         | Provisional pathway, nullable kWh/methodology, evidence, limitations                         |
| `EvidenceReference`      | Traceable source ID, URI, version                                                            |
| `DecisionRequest`        | Analysis identity, owner identity, question                                                  |
| `DecisionResponse`       | Analysis identity, summary, evidence, limitations                                            |
| `AnalysisRequestedEvent` | Versioned internal analysis request envelope                                                 |
| `ApiError`               | Explicit unimplemented error code, message, correlation ID                                   |

## Semantics

IDs are opaque strings. Timestamps will use ISO 8601 UTC. Mass uses kilograms and
energy uses kWh as unit labels only; there is no conversion formula or assumed yield.
Absent measured mass means no measurement was provided. `energyKwh: null` means
unknown; zero must never replace missing evidence. Nullable methodology means no
method has been established. Evidence must identify source/version and limitations
must describe relevant uncertainty before any estimate is shown.

States are `queued`, `running`, `completed`, `failed`. They are labels only; transition
rules, partial failures, and retries are deferred. Contract types do not enforce
value ranges, scientific validity, state transitions, or ownership at runtime.

Python mirrors the analysis/decision subset used by its service boundaries. Other
metadata contracts currently live in TypeScript only. JSON schema generation and
cross-language validation should be designed before actual integrations.

## Intended storage

S3 will store source objects and eventual model/data artifacts. DynamoDB will store
owned metadata and analysis state. Candidate access patterns are sample-by-owner,
job-by-owner, and owner-scoped lists. Partition/sort keys, indexes, retention, TTL,
encryption choices, and result storage thresholds are deferred until those access
patterns are confirmed. No table shape is claimed as deployed or final.
