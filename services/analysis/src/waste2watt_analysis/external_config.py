"""Load only approved local provider settings from an ignored backend env file."""

import json
import os
import re
from collections.abc import Iterable, MutableMapping
from pathlib import Path

from botocore.exceptions import BotoCoreError, ClientError

PRIVATE_ENV_KEYS = frozenset(
    {
        "AI_INFERENCE_ENABLED",
        "EXTERNAL_AI_ENABLED",
        "EXTERNAL_AI_FREE_ONLY",
        "EXTERNAL_AI_ALLOW_PAID",
        "EXTERNAL_AI_PAID_USAGE_ALLOWED",
        "EXTERNAL_AI_MAX_COST_USD",
        "FREE_MODELS_ONLY",
        "GEMINI_API_KEY",
        "GEMINI_FREE_TIER_CONFIRMED",
        "GEMINI_BILLING_ENABLED",
        "GROQ_API_KEY",
        "GROQ_FREE_PLAN_CONFIRMED",
        "GROQ_BILLING_ENABLED",
        "OPENROUTER_API_KEY",
        "OPENROUTER_FREE_ENDPOINT_CONFIRMED",
        "OPENROUTER_BILLING_ENABLED",
        "BEDROCK_INFERENCE_ENABLED",
        "BEDROCK_INFERENCE_BUDGET_APPROVED",
        "BEDROCK_INFERENCE_MAX_COST_USD",
    }
)
PROVIDER_API_KEY_NAMES = frozenset({"GEMINI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY"})
_ASSIGNMENT = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$")


def parse_private_environment(
    lines: Iterable[str], environment: MutableMapping[str, str]
) -> tuple[str, ...]:
    """Load allowlisted assignments without shell evaluation or value logging.

    Existing non-empty process values win. The return value contains variable
    names only, allowing callers and tests to report configuration presence safely.
    """

    loaded = []
    for line in lines:
        candidate = line.strip()
        if not candidate or candidate.startswith("#"):
            continue
        if candidate.startswith("export "):
            candidate = candidate[7:].lstrip()
        match = _ASSIGNMENT.fullmatch(candidate)
        if match is None:
            continue
        name, value = match.groups()
        if name not in PRIVATE_ENV_KEYS:
            continue
        value = _unquote(value.strip())
        if not value or environment.get(name, "").strip():
            continue
        environment[name] = value
        loaded.append(name)
    return tuple(loaded)


def load_local_provider_environment(environment: MutableMapping[str, str] | None = None):
    """Load `services/analysis/.env.local` in local runs only.

    Lambda receives settings through its runtime environment/secret integration;
    this file is never read in AWS. It is ignored by the repository's `.env.*`
    rule and intentionally contains provider keys only in private local setups.
    """

    target = os.environ if environment is None else environment
    if target.get("AWS_LAMBDA_FUNCTION_NAME"):
        return ()
    path = Path(__file__).resolve().parents[2] / ".env.local"
    try:
        with path.open(encoding="utf-8") as private_file:
            return parse_private_environment(private_file, target)
    except FileNotFoundError:
        return ()


def parse_provider_secret(secret_string: str) -> dict[str, str]:
    """Extract only non-empty provider keys from a JSON secret value."""

    try:
        payload = json.loads(secret_string)
    except (TypeError, json.JSONDecodeError):
        return {}
    if not isinstance(payload, dict):
        return {}
    return {
        name: value.strip()
        for name in PROVIDER_API_KEY_NAMES
        if isinstance((value := payload.get(name)), str) and value.strip()
    }


def load_provider_credentials(secrets_client, secret_id: str | None) -> dict[str, str]:
    """Read the provider-key secret once per Lambda environment, failing closed."""

    if not isinstance(secret_id, str) or not secret_id.strip():
        return {}
    try:
        response = secrets_client.get_secret_value(SecretId=secret_id)
    except (BotoCoreError, ClientError):
        return {}
    secret_string = response.get("SecretString")
    if not isinstance(secret_string, str):
        return {}
    return parse_provider_secret(secret_string)


def _unquote(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
        return value[1:-1]
    if " #" in value:
        return value.split(" #", 1)[0].rstrip()
    return value
