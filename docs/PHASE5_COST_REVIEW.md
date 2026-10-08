# Phase 5 cost review

Stage 1 infrastructure is deployed with inference disabled. A single authorized text-only Nova Lite `Converse` request was rejected with `ValidationException: Operation not allowed` and returned no model output or usage metadata; no successful inference or token usage was recorded. Standard regional on-demand Nova Lite remains the proposed baseline if access is resolved. No provisioned throughput, always-on ML endpoint, training, model subscription, agent or bulk replay was prepared.

The user approved and deployed the revised three-stack diff, isolated Lambda packaging repair, and existing state-machine definition correction on October 8, 2026. Deployed Lambda, Step Functions transitions, logs, alarm/custom metrics, private S3 uploads and DynamoDB updates can generate usage charges with Bedrock inference disabled. The safe HealthCheck completed successfully. Two bounded user-submitted scans were uploaded: the first exposed the workflow-ordering bug; the second followed the disabled branch successfully. The SQS visible count rose from 20 to 22 during the failed attempt and remained 22 after the successful one. No queue message was inspected. A subsequent text-only authorization probe was rejected before returning inference output or usage; no successful model call occurred. No provisioned throughput, SageMaker endpoint, load test or historical processing occurred.

## Verified published inference rates

AWS's [public us-east-1 Bedrock price list](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrock/current/us-east-1/index.json), published October 6, 2026 and downloaded read-only October 8, confirms standard on-demand Nova Lite **$0.00006 / $0.00024 per 1,000 input/output tokens**, equivalent to **$0.06 / $0.24 per million**. Input SKU QRGWJ3P8FT28EYX2 and output SKU CBZ6A6U7XK8WJ3KA. Recheck current rates before Phase 5B; no live inference was used to measure tokens. The dynamic [pricing page](https://aws.amazon.com/bedrock/pricing/) remains the product reference.

At these rates: cost USD = inputTokens × 0.06 / 1,000,000 + outputTokens × 0.24 / 1,000,000. A planning scenario of 2,000 input and 768 output tokens costs **$0.00030432 per scan**. At 4,000 input and 768 output, it is **$0.00042432**. These are illustrative scenarios, not measured consumption or guaranteed ceilings. Images consume input tokens; JPEG bytes are not token counts. With 50 scans/day for 30 days, the latter scenario is $0.63648 model usage, excluding infrastructure, taxes and future price changes. No USD/INR conversion is assumed.

The same public regional list gives Nova Pro $0.80 input / $3.20 output per million and Nova 2 Lite $0.33 input / $2.75 output per million for standard on-demand regional entries. Neither is cheaper than Nova Lite for this token mix. Haiku 4.5 regional/profile pricing was not resolved from the downloaded list and must be verified before considering it. Task quality for every candidate remains unmeasured; there is no automatic higher-cost fallback.

## Implemented gates

- `AI_INFERENCE_ENABLED=false` in prepared CDK; gate runs before creating SDK clients.
- Configurable global limit 50/day and owner limit 5/day, UTC date, fail closed. A single DynamoDB transaction reserves both counters and the scan invocation marker.
- Maximum one initial inference reservation per scan. Reservations are retained even after timeout/uncertain provider outcome; repeats cannot automatically charge again.
- Input: one image, 10 MiB upload, 20 MP decoded pixels, fresh 1024×1024 JPEG under 3 MB, fixed bounded prompt/schema and no user narrative appended. Provider input token count is not known exactly before invocation; image and text bounds constrain it, without claiming a hard token-price ceiling.
- Output `maxTokens=768`; SDK connect/read timeouts 3/25 seconds, Lambda 60 seconds, workflow five minutes.
- Bedrock SDK `total_max_attempts=1`; inference task has no Step Functions retry. Selected non-inference Lambda service/throttle failures have at most two retries. Limit failures mark scans FAILED with `AI_LIMIT_EXCEEDED`.
- Sanitized usage events, input/output token sum metric filters and one analysis-Lambda error alarm. No raw model text or image logs.

The official [quota reference](https://docs.aws.amazon.com/general/latest/gr/bedrock.html) lists model/region-specific throughput limits. Actual account quotas, available Lambda concurrency and rate readiness still require Phase 5B review; a published default is not this account's confirmed quota. Throttling does not trigger unbounded retries.

## Other costs and limits

The proposed Python Lambda, Standard Step Functions transitions, versioned S3 reads, DynamoDB transactions, log ingestion/storage, two custom token metrics and one alarm have usage or recurring costs. Custom metrics/alarms can cost more than model inference at this small volume; check Free Tier eligibility and current rates before deployment. Existing five stacks, credit/budget safeguards and failure alarm remain authoritative; billing/account settings are untouched. Counters consume a small daily row per owner/global scope in the existing DailyMetrics table; no new table and no historical bulk processing.

Token metrics cannot count charges from a provider timeout or responses rejected before usage logging. Invocation reservations provide a conservative attempt ledger, not an exact invoice. Monitor billing separately under existing safeguards. Feature disablement is a manual server setting requiring its own authorized change; automatic spend response or account modifications are not added.

## External AI zero-cost policy — 2026-10-09

The external-provider allowance is **USD 0**, superseding any earlier proposal for bounded paid external tests. The owner confirmed that the Gemini, Groq and OpenRouter accounts are free-plan accounts, confirmed rotation of the stored keys, and authorized bounded free-quota image analysis. The keys reside only in the ignored backend `.env.local`; values are not displayed or logged. A bounded local image test timed out on Gemini 3.6, received HTTP 403 from Groq, got an invalid schema from Dots, then received a valid structured result from Gemini 3.5 Flash. Quota is not pre-queried; quota/model errors can fall through. xAI Grok remains skipped. No production external-provider analysis has yet been verified. See the [updated provider review](AI_PROVIDER_FREE_ONLY.md).

The CDK inference opt-in remains explicit: when disabled, external provider settings are off; when enabled for the authorized deployment, the exact free-only gates are `EXTERNAL_AI_ENABLED=true`, `EXTERNAL_AI_FREE_ONLY=true`, `EXTERNAL_AI_ALLOW_PAID=false`, `EXTERNAL_AI_PAID_USAGE_ALLOWED=false`, `EXTERNAL_AI_MAX_COST_USD=0`, and `FREE_MODELS_ONLY=true`. Bedrock remains off without separate budget approval. Provider account confirmations and application policy reduce payment risk but are not an external billing cap. These settings do not cap AWS infrastructure charges, which remain under the separate existing AWS spending rules.
