# AWS Support case draft — Bedrock model authorization

**Status:** Draft for human review; not submitted. No subscription or account-level access change is requested by this agent.

## Subject

Amazon Bedrock Nova Lite invocation in `us-east-1` remains unauthorized despite the runtime role's scoped invoke permission and returned `Operation not allowed`.

## Sanitized case details

- Account: `415150458314`.
- Region: `us-east-1`.
- Model: `amazon.nova-lite-v1:0` (regional foundation model).
- Runtime feature flag: `AI_INFERENCE_ENABLED=false`; no hosted scan invokes the model while disabled.
- Runtime IAM permission: `bedrock:InvokeModel` scoped to `arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0` only.
- A bounded text-only diagnostic previously returned `ValidationException: Operation not allowed`; it returned no model output or usage metadata. No repeated attempts were made.
- Read-only model availability checks reported `NOT_AUTHORIZED`. Developer-user IAM simulation allowed the action, but this does not prove the Lambda role's effective permission or account/service eligibility.
- The developer account is not enrolled in AWS Organizations. No IAM, organization, billing, Marketplace or model-access setting was changed.
- AWS request ID: **not captured in the available diagnostic record**. Do not invent one. If the original CLI/SDK output is recovered, append its request ID and exact UTC timestamp before submitting.
- No AWS credentials, access keys, tokens, passwords, image content or user identifiers beyond the account number are included.

## Questions for AWS Support

1. For account `415150458314`, is on-demand invocation of `amazon.nova-lite-v1:0` currently eligible in `us-east-1`, or is there an account-level trust, eligibility, or service authorization gate that explains `NOT_AUTHORIZED` / `Operation not allowed`?
2. Does the transition away from the Bedrock model-access page require any account action for this existing model, or should first-use access be automatic for this account?
3. Is any additional authorization required beyond a runtime role's `bedrock:InvokeModel` permission on the regional model ARN? Please identify the exact condition or permission without recommending broad managed policies.
4. Does the recorded `ValidationException: Operation not allowed` indicate a model-access restriction or an unsupported request shape? If request metadata is needed, please identify the minimum sanitized fields to supply.

Please do not enable paid inference, subscribe to Marketplace products, change IAM or account settings, or incur charges as part of the investigation. We will seek separate approval before any live paid model test.

## Evidence and references

AWS's [Bedrock API error troubleshooting guide](https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html) says `NotAuthorized` requires checking IAM permissions, role trust, and organizational restrictions and advises contacting Support if unresolved. The account-side checks above did not identify an organizational policy; effective authorization and service-side model eligibility remain unproven. This draft is a diagnostic request, not evidence that account-level access is required.
