"""Zero-cost provider policy, consent, order, cancellation, and Bedrock gates."""

import io
import json
import sys
import unittest
from contextlib import redirect_stdout
from dataclasses import dataclass
from pathlib import Path
from threading import Event

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "services/analysis/src"))
from waste2watt_analysis.external_ai_policy import (
    FREE_VISION_MODEL_ORDER,
    InferenceCancelled,
    bedrock_inference_allowed,
    eligible_free_models,
    eligible_free_providers,
    external_ai_enabled,
    model_readiness_reason,
    sequential_free_model_call,
)  # noqa: E402

ENVIRONMENT = {
    "AI_INFERENCE_ENABLED": "true",
    "EXTERNAL_AI_ENABLED": "true",
    "EXTERNAL_AI_FREE_ONLY": "true",
    "EXTERNAL_AI_ALLOW_PAID": "false",
    "EXTERNAL_AI_PAID_USAGE_ALLOWED": "false",
    "EXTERNAL_AI_MAX_COST_USD": "0",
    "FREE_MODELS_ONLY": "true",
    "GEMINI_FREE_TIER_CONFIRMED": "true",
    "GEMINI_BILLING_ENABLED": "false",
    "GEMINI_API_KEY": "test-gemini-key",
    "GROQ_FREE_PLAN_CONFIRMED": "true",
    "GROQ_BILLING_ENABLED": "false",
    "GROQ_API_KEY": "test-groq-key",
    "OPENROUTER_FREE_ENDPOINT_CONFIRMED": "true",
    "OPENROUTER_BILLING_ENABLED": "false",
    "OPENROUTER_API_KEY": "test-openrouter-key",
}


def classification(outcome="CLASSIFIED"):
    uncertain = outcome == "LOW_CONFIDENCE"
    return {
        "outcome": outcome,
        "primaryCategory": "PLASTIC" if outcome != "NO_WASTE_DETECTED" else None,
        "otherMaterials": [],
        "description": "A visible plastic container.",
        "confidenceBand": "LOW" if uncertain else "MEDIUM",
        "contamination": "UNKNOWN",
        "separationConcerns": [],
        "safetyConcerns": [],
        "humanReviewRecommended": uncertain,
        "materialProportions": None,
    }


@dataclass
class Result:
    provider: str
    model_id: str
    classification: dict
    status_code: int = 200
    response_time_ms: int = 12


class FakeAdapter:
    def __init__(self, result=None, error=None, on_call=None):
        self.result, self.error, self.on_call = result, error, on_call
        self.calls = 0

    def analyze(self, _image, _cancellation=None):
        self.calls += 1
        if self.on_call:
            self.on_call()
        if self.error:
            raise self.error
        return self.result


class ExternalAiPolicyTests(unittest.TestCase):
    def test_external_ai_is_disabled_without_all_zero_cost_flags(self):
        self.assertFalse(external_ai_enabled({}))
        self.assertFalse(external_ai_enabled({**ENVIRONMENT, "EXTERNAL_AI_ENABLED": "false"}))
        self.assertFalse(external_ai_enabled({**ENVIRONMENT, "AI_INFERENCE_ENABLED": "false"}))
        self.assertFalse(external_ai_enabled({**ENVIRONMENT, "EXTERNAL_AI_FREE_ONLY": "false"}))
        self.assertFalse(external_ai_enabled({**ENVIRONMENT, "EXTERNAL_AI_ALLOW_PAID": "true"}))
        self.assertFalse(
            external_ai_enabled({**ENVIRONMENT, "EXTERNAL_AI_PAID_USAGE_ALLOWED": "true"})
        )
        self.assertFalse(external_ai_enabled({**ENVIRONMENT, "FREE_MODELS_ONLY": "false"}))
        self.assertFalse(
            external_ai_enabled(
                {key: value for key, value in ENVIRONMENT.items() if key != "FREE_MODELS_ONLY"}
            )
        )
        self.assertFalse(external_ai_enabled({**ENVIRONMENT, "EXTERNAL_AI_MAX_COST_USD": "0.0001"}))
        self.assertFalse(external_ai_enabled({**ENVIRONMENT, "EXTERNAL_AI_MAX_COST_USD": "NaN"}))
        self.assertTrue(external_ai_enabled(ENVIRONMENT))

    def test_static_provider_order_matches_final_priority(self):
        self.assertEqual(
            tuple((spec.provider, spec.model_id) for spec in FREE_VISION_MODEL_ORDER),
            (
                ("gemini", "gemini-3.6-flash"),
                ("groq", "qwen/qwen3.8-27b"),
                ("openrouter", "dots-studio/dots-3-note-preview:free"),
                ("gemini", "gemini-3.5-flash"),
            ),
        )

    def test_configured_free_models_require_no_live_quota_query(self):
        candidates = eligible_free_models(ENVIRONMENT)
        self.assertEqual(
            tuple(spec.model_id for spec in candidates),
            tuple(spec.model_id for spec in FREE_VISION_MODEL_ORDER),
        )
        self.assertEqual(eligible_free_providers(ENVIRONMENT), ("gemini", "groq", "openrouter"))

    def test_missing_credentials_and_owner_attestation_are_separate_gates(self):
        no_key = {**ENVIRONMENT, "GEMINI_API_KEY": ""}
        self.assertEqual(
            model_readiness_reason(FREE_VISION_MODEL_ORDER[0], no_key), "credentials_required"
        )
        no_attestation = {**ENVIRONMENT, "GROQ_FREE_PLAN_CONFIRMED": "false"}
        self.assertEqual(
            model_readiness_reason(FREE_VISION_MODEL_ORDER[1], no_attestation),
            "owner_free_account_confirmation_missing",
        )

    def test_billable_google_or_groq_accounts_are_fail_closed(self):
        gemini = {**ENVIRONMENT, "GEMINI_BILLING_ENABLED": "true"}
        groq = {**ENVIRONMENT, "GROQ_BILLING_ENABLED": "true"}
        self.assertEqual(
            model_readiness_reason(FREE_VISION_MODEL_ORDER[0], gemini),
            "gemini_billing_state_not_confirmed_nonbillable",
        )
        self.assertEqual(
            model_readiness_reason(FREE_VISION_MODEL_ORDER[1], groq),
            "groq_billing_state_not_confirmed_free_plan",
        )
        self.assertNotIn(
            "gemini-3.6-flash",
            tuple(spec.model_id for spec in eligible_free_models(gemini)),
        )

    def test_openrouter_requires_explicit_free_route_confirmation_and_exact_id(self):
        no_confirmation = {
            **ENVIRONMENT,
            "OPENROUTER_FREE_ENDPOINT_CONFIRMED": "false",
        }
        self.assertEqual(
            model_readiness_reason(FREE_VISION_MODEL_ORDER[2], no_confirmation),
            "owner_free_account_confirmation_missing",
        )
        billable_route = {**ENVIRONMENT, "OPENROUTER_BILLING_ENABLED": "true"}
        self.assertEqual(
            model_readiness_reason(FREE_VISION_MODEL_ORDER[2], billable_route),
            "openrouter_billing_state_not_confirmed_nonbillable",
        )
        self.assertEqual(
            model_readiness_reason(
                type(FREE_VISION_MODEL_ORDER[2])(
                    "openrouter",
                    "dots-studio/dots-3-note-preview",
                    "OPENROUTER_API_KEY",
                    "OPENROUTER_FREE_ENDPOINT_CONFIRMED",
                ),
                ENVIRONMENT,
            ),
            "model_not_allowlisted",
        )

    def test_bedrock_requires_explicit_enablement_and_approved_positive_budget(self):
        self.assertFalse(bedrock_inference_allowed(ENVIRONMENT))
        approved = {
            **ENVIRONMENT,
            "BEDROCK_INFERENCE_ENABLED": "true",
            "BEDROCK_INFERENCE_BUDGET_APPROVED": "true",
            "BEDROCK_INFERENCE_MAX_COST_USD": "1.00",
        }
        self.assertTrue(bedrock_inference_allowed(approved))
        self.assertFalse(
            bedrock_inference_allowed({**approved, "BEDROCK_INFERENCE_MAX_COST_USD": "0"})
        )
        self.assertFalse(
            bedrock_inference_allowed({**approved, "BEDROCK_INFERENCE_BUDGET_APPROVED": "false"})
        )

    def test_no_user_consent_means_no_provider_request(self):
        adapter = FakeAdapter(Result("gemini", "gemini-3.6-flash", classification()))
        adapters = {("gemini", "gemini-3.6-flash"): adapter}
        self.assertIsNone(
            sequential_free_model_call(
                b"jpeg",
                ENVIRONMENT,
                adapters,
                external_processing_consent=False,
            )
        )
        self.assertEqual(adapter.calls, 0)

    def test_provider_failures_fall_through_sequentially_once(self):
        called = []
        adapters = {
            ("gemini", "gemini-3.6-flash"): FakeAdapter(
                error=TimeoutError(), on_call=lambda: called.append("gemini")
            ),
            ("groq", "qwen/qwen3.8-27b"): FakeAdapter(
                error=RuntimeError("429; secret response must not be logged"),
                on_call=lambda: called.append("groq"),
            ),
            ("openrouter", "dots-studio/dots-3-note-preview:free"): FakeAdapter(
                error=RuntimeError("free endpoint temporarily unavailable"),
                on_call=lambda: called.append("openrouter"),
            ),
            ("gemini", "gemini-3.5-flash"): FakeAdapter(
                Result("gemini", "gemini-3.5-flash", classification()),
                on_call=lambda: called.append("gemini-3.5"),
            ),
        }
        output = io.StringIO()
        with redirect_stdout(output):
            result = sequential_free_model_call(
                b"jpeg",
                ENVIRONMENT,
                adapters,
                external_processing_consent=True,
                request_id="request-123",
            )
        self.assertEqual(result.provider, "gemini")
        self.assertEqual(result.model_id, "gemini-3.5-flash")
        self.assertEqual(called, ["gemini", "groq", "openrouter", "gemini-3.5"])
        self.assertEqual(tuple(adapter.calls for adapter in adapters.values()), (1, 1, 1, 1))
        log_events = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual(
            [(event["provider"], event["modelId"]) for event in log_events],
            [
                ("gemini", "gemini-3.6-flash"),
                ("groq", "qwen/qwen3.8-27b"),
                ("openrouter", "dots-studio/dots-3-note-preview:free"),
            ],
        )
        self.assertTrue(all(event["event"] == "ExternalProviderFailure" for event in log_events))
        self.assertTrue(all("durationMs" in event for event in log_events))
        self.assertTrue(all(event["requestId"] == "request-123" for event in log_events))
        self.assertNotIn("secret response", output.getvalue())
        self.assertNotIn("test-gemini-key", output.getvalue())
        self.assertNotIn("test-groq-key", output.getvalue())
        self.assertNotIn("test-openrouter-key", output.getvalue())

    def test_valid_uncertainty_stops_the_chain(self):
        called = []
        adapters = {
            ("gemini", "gemini-3.6-flash"): FakeAdapter(
                Result("gemini", "gemini-3.6-flash", classification("LOW_CONFIDENCE")),
                on_call=lambda: called.append("gemini"),
            ),
            ("groq", "qwen/qwen3.8-27b"): FakeAdapter(
                Result("groq", "qwen/qwen3.8-27b", classification()),
                on_call=lambda: called.append("groq"),
            ),
        }
        result = sequential_free_model_call(
            b"jpeg", ENVIRONMENT, adapters, external_processing_consent=True
        )
        self.assertEqual(result.classification["outcome"], "LOW_CONFIDENCE")
        self.assertEqual(called, ["gemini"])

    def test_invalid_schema_result_advances_to_next_free_model(self):
        called = []
        adapters = {
            ("gemini", "gemini-3.6-flash"): FakeAdapter(
                Result("gemini", "gemini-3.6-flash", {"unexpected": True}),
                on_call=lambda: called.append("gemini"),
            ),
            ("groq", "qwen/qwen3.8-27b"): FakeAdapter(
                Result("groq", "qwen/qwen3.8-27b", classification()),
                on_call=lambda: called.append("groq"),
            ),
        }
        result = sequential_free_model_call(
            b"jpeg", ENVIRONMENT, adapters, external_processing_consent=True
        )
        self.assertEqual(result.provider, "groq")
        self.assertEqual(called, ["gemini", "groq"])

    def test_all_provider_failures_return_unavailable_without_retries(self):
        adapters = {
            ("gemini", "gemini-3.6-flash"): FakeAdapter(error=RuntimeError()),
            ("groq", "qwen/qwen3.8-27b"): FakeAdapter(error=RuntimeError()),
            ("openrouter", "dots-studio/dots-3-note-preview:free"): FakeAdapter(
                error=RuntimeError()
            ),
            ("gemini", "gemini-3.5-flash"): FakeAdapter(error=RuntimeError()),
        }
        self.assertIsNone(
            sequential_free_model_call(
                b"jpeg", ENVIRONMENT, adapters, external_processing_consent=True
            )
        )
        self.assertEqual(tuple(adapter.calls for adapter in adapters.values()), (1, 1, 1, 1))

    def test_cancellation_stops_before_the_next_provider(self):
        cancellation = Event()
        called = []

        def cancel_now():
            cancellation.set()

        adapters = {
            ("gemini", "gemini-3.6-flash"): FakeAdapter(
                error=InferenceCancelled(), on_call=lambda: called.append("gemini")
            ),
            ("groq", "qwen/qwen3.8-27b"): FakeAdapter(
                Result("groq", "qwen/qwen3.8-27b", classification()),
                on_call=lambda: called.append("groq"),
            ),
        }
        # Cancellation raised by an adapter is terminal and never causes failover.
        self.assertIsNone(
            sequential_free_model_call(
                b"jpeg",
                ENVIRONMENT,
                adapters,
                external_processing_consent=True,
                cancellation=cancellation,
            )
        )
        self.assertEqual(called, ["gemini"])
        self.assertEqual(adapters[("groq", "qwen/qwen3.8-27b")].calls, 0)


if __name__ == "__main__":
    unittest.main()
