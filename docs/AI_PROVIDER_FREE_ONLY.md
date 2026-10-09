# Zero-cost external AI policy and provider integration

Reviewed **2026-10-09** against provider documentation and public model catalogs.
Amazon Bedrock remains the primary provider only when account authorization and a
separate positive inference budget are approved. If Bedrock is disabled or fails,
the external vision fallback order is:

1. Google Gemini `gemini-3.6-flash`
2. Groq `qwen/qwen3.8-27b`
3. OpenRouter `dots-studio/dots-3-note-preview:free`
4. Google Gemini `gemini-3.5-flash`

xAI Grok is not configured. A valid structured result from the first eligible
provider stops the sequence. Provider requests run once each, sequentially, with
bounded image, output, response, and timeout limits. Provider errors and quota
rejections may fall through to the next separately eligible free model. Remaining
quota is not queried as a precondition. No automatic paid upgrade or paid model
fallback is allowed.

## Account configuration status

All three backend key variables now have non-empty values in
`services/analysis/.env.local`; their values were not displayed or tested against
provider APIs. The private file is ignored by Git. The required inference switches,
provider free-account confirmations, and non-billable account settings are missing,
so no provider is currently eligible and no model call or image smoke test was made.
API keys previously included in a prompt are considered exposed and must be
revoked; the locally configured replacements have not yet been independently
validated as rotated credentials.

Keep the existing private file and set the missing safety flags there after
confirming the free account and non-billable settings in the provider dashboards.
Do not overwrite the existing credentials when using
[`services/analysis/.env.example`](../services/analysis/.env.example) as a reference.
The Python runtime loads this ignored file locally, only for
allowlisted names, and never logs values. Existing process environment variables
take precedence. Do not put these credentials in chat, source, tests, or frontend
configuration.

The template defaults all inference off. For a local smoke test, the operator must
explicitly enable the inference and external-provider flags, leave all paid flags
false and the maximum external cost at zero, and confirm the provider's free plan.
The web scan form now submits the external-processing flag as true by default and
displays a notice that eligible free-tier providers may process the image. This UI
setting does not enable inference or bypass any backend provider, account, or
zero-cost checks. No quota lookup is needed; provider quota exhaustion should
return an error and move to the next eligible provider. For a future AWS runtime,
use AWS Secrets Manager and a narrowly scoped secret read permission; that
integration has not been deployed or enabled here.

## Zero-cost enforcement

The runtime fails closed unless all of the following are true:

```text
AI_INFERENCE_ENABLED=true
EXTERNAL_AI_ENABLED=true
EXTERNAL_AI_FREE_ONLY=true
EXTERNAL_AI_ALLOW_PAID=false
EXTERNAL_AI_PAID_USAGE_ALLOWED=false
EXTERNAL_AI_MAX_COST_USD=0
FREE_MODELS_ONLY=true
```

Gemini and Groq additionally require an owner-confirmed free account, an explicit
non-billable setting, and a rotated private key. OpenRouter requires the exact
`:free` model, a confirmed free endpoint, a non-billable account setting, and a
private key. Its request pins the provider, disables provider fallback, requires
parameters, and caps prompt, completion, image, and request price at zero. It asks
for usage accounting and refuses a result if cost is nonzero, missing, or reported
as BYOK. A paid or unverified cost stops the chain. No model is silently substituted.

When external processing is requested, all providers receive the same compressed,
metadata-stripped JPEG. The current web form requests it by default and presents
the processing notice before scan submission. The existing classification schema
is enforced locally; malformed, truncated, refused, unavailable, or schema-invalid
responses are not persisted as successful classifications. These adapters do not
infer mass, material proportions, energy, carbon, hazard absence, or facility
acceptance.

## Provider capability and billing review

| Provider/model            | Public API capability                                       | Public free/billing status                                                                                 | Local account status                                                                              |
| ------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Gemini `gemini-3.6-flash` | Vision input, text output, structured JSON                  | Google documents Standard Free Tier availability; free project eligibility and limits vary.                | Disabled until fresh key and account non-billable state are configured.                           |
| Groq `qwen/qwen3.8-27b`   | Vision input and JSON Schema output                         | Developer pricing is nonzero; only an independently confirmed Groq Free plan can qualify.                  | Disabled until fresh key and Free-plan/non-billable state are configured.                         |
| OpenRouter Dots `:free`   | Vision input, structured output, zero-price candidate route | Exact free model and AtlasCloud endpoint are listed; the model page gives a December 31, 2026 sunset date. | Disabled until fresh key, free-route confirmation, and non-billable account state are configured. |
| Gemini `gemini-3.5-flash` | Vision input, text output, structured JSON                  | Google documents Standard Free Tier availability; free project eligibility and limits vary.                | Disabled until fresh key and account non-billable state are configured.                           |

Published model pricing and availability do not establish the user's account billing
mode. That is why the local switches remain off and no real-image request was
attempted. A free-tier quota cannot be queried without using provider-specific
account access; quota uncertainty alone does not prevent use once the free account
and non-billable conditions are confirmed.

## Verification

Automated tests use mocked transports only. They verify provider order, free-only
gates, image payloads, structured response parsing, OpenRouter zero-cost routing,
the web form's default external-processing flag and disclosure, sequential failover,
output-schema rejection, bounded timeouts, and secret redaction. No provider values
are checked into this repository. No AWS resources were deployed and no live
provider request was made in this validation.

## Official references

- [Gemini 3.6 Flash model capabilities](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash)
- [Gemini 3.5 Flash model capabilities](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash)
- [Gemini API pricing and Standard Free Tier](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini per-project rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [Groq Qwen 3.8 27B model, pricing and modalities](https://console.groq.com/docs/model/qwen/qwen3.8-27b)
- [Groq vision input](https://console.groq.com/docs/vision)
- [Groq structured outputs](https://console.groq.com/docs/structured-outputs)
- [Groq rate limits and Free-to-Developer billing](https://console.groq.com/docs/billing-faqs)
- [OpenRouter Dots3-Note Preview (free) capabilities and sunset](https://openrouter.ai/dots-studio/dots-3-note-preview:free)
- [OpenRouter usage and response cost details](https://openrouter.ai/blog/announcements/smarter-charts-inline-svgs-and-live-usage-accounting/)
- [OpenRouter provider routing controls](https://openrouter.ai/docs/guides/routing/provider-selection)
- [OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs)
