# Decision agent

Python protocol and explicit unimplemented adapter only. Reserved for Strands Agents
SDK with Amazon Bedrock as the model provider. No agent dependency, model call,
recommendation, or external provider is configured.

# Sustainability agent boundary

`src/waste2watt_agent/tools.py` supplies dependency-free, Strands-compatible Python
module tools (`TOOL_SPEC` plus named function) for an eventual agent. The current tools
are read-only: one summarizes at most 100 scans through an owner-scoped repository,
and one performs explicitly marked scenario arithmetic with user-provided cited inputs.
Neither accepts an owner ID, writes application data, calls a model, or invokes AWS.

The API boundary must first validate the Cognito JWT and provide that verified subject
to `VerifiedPrincipal`; tools are then bound to that subject and repository instance.
The persistence adapter must enforce owner conditions in its own query. Unit tests use
an in-memory reader and do not instantiate a Strands `Agent` or model provider.

The existing `PlaceholderDecisionAgent` remains deliberately unavailable until model
authorization and a separately approved inference phase. The React advisor page is a
deterministic record-based prompt list, not an AI response.
