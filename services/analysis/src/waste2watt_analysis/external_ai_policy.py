"""Fail-closed model selection for the explicitly free external AI path.

This module separates static model eligibility, owner account-tier confirmation,
credential presence, and runtime provider failures. It deliberately does not make
per-request quota queries: free quotas are enforced by each provider, and quota
errors move the single request to the next independently configured free model.
"""

from collections.abc import Mapping
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from threading import Event
from typing import Protocol


@dataclass(frozen=True)
class ModelSpec:
    provider: str
    model_id: str
    credential_env: str
    free_account_confirmation_env: str


FREE_VISION_MODEL_ORDER = (
    ModelSpec(
        "gemini",
        "gemini-3.6-flash",
        "GEMINI_API_KEY",
        "GEMINI_FREE_TIER_CONFIRMED",
    ),
    ModelSpec("groq", "qwen/qwen3.8-27b", "GROQ_API_KEY", "GROQ_FREE_PLAN_CONFIRMED"),
    ModelSpec(
        "openrouter",
        "dots-studio/dots-3-note-preview:free",
        "OPENROUTER_API_KEY",
        "OPENROUTER_FREE_ENDPOINT_CONFIRMED",
    ),
    ModelSpec(
        "gemini",
        "gemini-3.5-flash",
        "GEMINI_API_KEY",
        "GEMINI_FREE_TIER_CONFIRMED",
    ),
)


class VisionAdapter(Protocol):
    def analyze(self, image: bytes, cancellation: Event | None = None): ...


class InferenceCancelled(Exception):
    """The caller cancelled before accepting a provider result."""


class PaidUsageDetected(Exception):
    """A provider reported a nonzero usage charge; stop all further requests."""


class ZeroCostNotVerified(Exception):
    """A provider response did not prove that the request was free; stop routing."""


def external_ai_enabled(environment: Mapping[str, str]) -> bool:
    """Require an explicit feature switch and the exact zero-cost environment."""

    if _flag(environment, "AI_INFERENCE_ENABLED") is not True:
        return False
    if _flag(environment, "EXTERNAL_AI_ENABLED") is not True:
        return False
    if _flag(environment, "EXTERNAL_AI_FREE_ONLY") is not True:
        return False
    if _flag(environment, "EXTERNAL_AI_ALLOW_PAID") is not False:
        return False
    if _flag(environment, "EXTERNAL_AI_PAID_USAGE_ALLOWED") is not False:
        return False
    if _flag(environment, "FREE_MODELS_ONLY") is not True:
        return False
    try:
        maximum_cost = Decimal(str(environment.get("EXTERNAL_AI_MAX_COST_USD", "")))
    except (InvalidOperation, ValueError):
        return False
    return maximum_cost.is_finite() and maximum_cost == Decimal("0")


def bedrock_inference_allowed(environment: Mapping[str, str]) -> bool:
    """Bedrock is opt-in only with an explicit budget approval and positive cap."""

    if _flag(environment, "AI_INFERENCE_ENABLED") is not True:
        return False
    if _flag(environment, "BEDROCK_INFERENCE_ENABLED") is not True:
        return False
    if _flag(environment, "BEDROCK_INFERENCE_BUDGET_APPROVED") is not True:
        return False
    try:
        maximum_cost = Decimal(str(environment.get("BEDROCK_INFERENCE_MAX_COST_USD", "")))
    except (InvalidOperation, ValueError):
        return False
    return maximum_cost.is_finite() and maximum_cost > 0


def model_readiness_reason(spec: ModelSpec, environment: Mapping[str, str]) -> str | None:
    """Explain why one static free model is not currently callable.

    Free account/plan confirmation is an owner-controlled configuration value.
    Credentials are checked separately. This never claims that a remaining quota
    was queried or that a provider API key itself proves free-tier entitlement.
    """

    if (spec.provider, spec.model_id) not in {
        (entry.provider, entry.model_id) for entry in FREE_VISION_MODEL_ORDER
    }:
        return "model_not_allowlisted"
    if not external_ai_enabled(environment):
        return "zero_cost_feature_policy_not_enabled"
    if _flag(environment, spec.free_account_confirmation_env) is not True:
        return "owner_free_account_confirmation_missing"
    if spec.provider == "gemini" and _flag(environment, "GEMINI_BILLING_ENABLED") is not False:
        return "gemini_billing_state_not_confirmed_nonbillable"
    if spec.provider == "groq" and _flag(environment, "GROQ_BILLING_ENABLED") is not False:
        return "groq_billing_state_not_confirmed_free_plan"
    if (
        spec.provider == "openrouter"
        and _flag(environment, "OPENROUTER_BILLING_ENABLED") is not False
    ):
        return "openrouter_billing_state_not_confirmed_nonbillable"
    credential = environment.get(spec.credential_env)
    if not isinstance(credential, str) or not credential.strip():
        return "credentials_required"
    if spec.provider == "openrouter" and spec.model_id != "dots-studio/dots-3-note-preview:free":
        return "openrouter_model_must_use_exact_free_variant"
    return None


def eligible_free_models(environment: Mapping[str, str]) -> tuple[ModelSpec, ...]:
    """Return configured, owner-confirmed models in the prescribed call order."""

    return tuple(
        spec
        for spec in FREE_VISION_MODEL_ORDER
        if model_readiness_reason(spec, environment) is None
    )


def eligible_free_providers(environment: Mapping[str, str]) -> tuple[str, ...]:
    """Return distinct eligible provider names in priority order."""

    return tuple(dict.fromkeys(spec.provider for spec in eligible_free_models(environment)))


def sequential_free_model_call(
    image: bytes,
    environment: Mapping[str, str],
    adapters: Mapping[tuple[str, str], VisionAdapter],
    *,
    external_processing_consent: bool,
    cancellation: Event | None = None,
):
    """Run one request at a time, returning the first schema-valid result.

    Provider HTTP, quota, unavailable-model, network and timeout failures advance
    to the next independently eligible model. Cancellation aborts the chain. A
    valid uncertain classification is still a valid result and stops failover.
    """

    if external_processing_consent is not True or not external_ai_enabled(environment):
        return None
    for spec in eligible_free_models(environment):
        if cancellation is not None and cancellation.is_set():
            return None
        adapter = adapters.get((spec.provider, spec.model_id))
        if adapter is None:
            continue
        try:
            result = adapter.analyze(image, cancellation)
        except InferenceCancelled:
            return None
        except PaidUsageDetected:
            return None
        except ZeroCostNotVerified:
            return None
        except Exception:
            # Provider exception bodies are deliberately neither inspected nor logged.
            continue
        if cancellation is not None and cancellation.is_set():
            return None
        if result is None or not getattr(result, "classification", None):
            continue
        try:
            from .intelligence import AnalysisFailure, validate

            classification = validate(result.classification)
        except (AnalysisFailure, AttributeError, TypeError):
            continue
        result.classification = classification
        return result
    return None


def _flag(environment: Mapping[str, str], name: str) -> bool | None:
    value = environment.get(name)
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower()
    if normalized == "true":
        return True
    if normalized == "false":
        return False
    return None
