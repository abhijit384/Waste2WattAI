"""Mocked contract tests for real multimodal HTTP provider adapters."""

import json
import sys
import unittest
from pathlib import Path
from threading import Event

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "services/analysis/src"))
from waste2watt_analysis.external_ai_policy import (
    InferenceCancelled,
    PaidUsageDetected,
    ZeroCostNotVerified,
)
from waste2watt_analysis.external_vision import (
    ExternalProviderError,
    GeminiVisionAdapter,
    GroqVisionAdapter,
    HttpJsonResult,
    InvalidProviderResponse,
    OpenRouterDotsVisionAdapter,
    build_adapters,
)

IMAGE = b"\xff\xd8\xffprivate-fixture-bytes"
CLASSIFICATION = {
    "outcome": "CLASSIFIED",
    "primaryCategory": "PLASTIC",
    "otherMaterials": [],
    "description": "A visible plastic container.",
    "confidenceBand": "MEDIUM",
    "contamination": "UNKNOWN",
    "separationConcerns": [],
    "safetyConcerns": [],
    "humanReviewRecommended": False,
    "materialProportions": None,
}


def openai_response(classification=None):
    return {
        "choices": [
            {
                "finish_reason": "stop",
                "message": {"content": json.dumps(classification or CLASSIFICATION)},
            }
        ],
        "usage": {"prompt_tokens": 32, "completion_tokens": 42},
    }


class ExternalVisionAdapterTests(unittest.TestCase):
    def setUp(self):
        self.calls = []

    def transport(self, payload):
        def call(url, headers, body, timeout, cancellation):
            self.calls.append(
                {
                    "url": url,
                    "headers": headers,
                    "body": json.loads(body),
                    "timeout": timeout,
                    "cancellation": cancellation,
                }
            )
            return HttpJsonResult(200, payload, 75)

        return call

    def test_gemini_image_request_uses_json_schema_and_private_header(self):
        payload = {
            "candidates": [
                {
                    "finishReason": "STOP",
                    "content": {"parts": [{"text": json.dumps(CLASSIFICATION)}]},
                }
            ]
        }
        adapter = GeminiVisionAdapter(
            "new-test-key", "gemini-3.6-flash", transport=self.transport(payload)
        )
        result = adapter.analyze(IMAGE)
        request = self.calls[0]
        self.assertEqual(result.classification, CLASSIFICATION)
        self.assertEqual(result.provider, "gemini")
        self.assertEqual(
            request["url"],
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
        )
        self.assertEqual(request["headers"]["x-goog-api-key"], "new-test-key")
        self.assertEqual(
            request["body"]["generationConfig"]["responseMimeType"], "application/json"
        )
        self.assertNotIn("candidateCount", request["body"]["generationConfig"])
        self.assertNotIn("temperature", request["body"]["generationConfig"])
        self.assertEqual(
            request["body"]["contents"][0]["parts"][1]["inline_data"]["mime_type"],
            "image/jpeg",
        )
        self.assertEqual(request["timeout"], 6)
        self.assertNotIn("new-test-key", repr(adapter))

    def test_groq_request_pins_qwen_vision_and_strict_schema(self):
        adapter = GroqVisionAdapter(
            "new-groq-test-key", transport=self.transport(openai_response())
        )
        result = adapter.analyze(IMAGE)
        request = self.calls[0]
        self.assertEqual(result.model_id, "qwen/qwen3.8-27b")
        self.assertEqual(request["body"]["model"], "qwen/qwen3.8-27b")
        self.assertEqual(request["body"]["response_format"]["json_schema"]["strict"], True)
        self.assertEqual(request["body"]["max_completion_tokens"], 768)
        self.assertNotIn("max_tokens", request["body"])
        image_url = request["body"]["messages"][1]["content"][1]["image_url"]["url"]
        self.assertTrue(image_url.startswith("data:image/jpeg;base64,"))
        self.assertEqual(request["headers"]["Authorization"], "Bearer new-groq-test-key")

    def test_openrouter_free_request_has_zero_caps_and_no_fallback_route(self):
        response = openai_response()
        response["usage"]["cost"] = 0
        adapter = OpenRouterDotsVisionAdapter(
            "new-openrouter-test-key", transport=self.transport(response)
        )
        result = adapter.analyze(IMAGE)
        body = self.calls[0]["body"]
        self.assertEqual(result.model_id, "dots-studio/dots-3-note-preview:free")
        self.assertEqual(body["model"], "dots-studio/dots-3-note-preview:free")
        self.assertEqual(
            body["provider"],
            {
                "only": ["atlas-cloud/fp8"],
                "allow_fallbacks": False,
                "require_parameters": True,
                "max_price": {"prompt": 0, "completion": 0, "image": 0, "request": 0},
                "data_collection": "deny",
            },
        )
        self.assertEqual(body["usage"], {"include": True})
        self.assertNotIn("models", body)

    def test_nonzero_openrouter_reported_cost_is_terminal(self):
        response = openai_response()
        response["usage"]["cost"] = 0.0001
        adapter = OpenRouterDotsVisionAdapter("mock-key", transport=self.transport(response))
        with self.assertRaises(PaidUsageDetected):
            adapter.analyze(IMAGE)

    def test_openrouter_requires_verified_zero_cost_and_no_byok_usage(self):
        for usage in (
            {"prompt_tokens": 1},
            {"cost": None},
            {"cost": 0, "is_byok": True},
        ):
            response = openai_response()
            response["usage"] = usage
            adapter = OpenRouterDotsVisionAdapter("mock-key", transport=self.transport(response))
            with self.subTest(usage=usage), self.assertRaises(ZeroCostNotVerified):
                adapter.analyze(IMAGE)

    def test_missing_key_stops_before_transport(self):
        adapter = GroqVisionAdapter(None, transport=self.transport(openai_response()))
        with self.assertRaises(ExternalProviderError):
            adapter.analyze(IMAGE)
        self.assertEqual(self.calls, [])

    def test_invalid_empty_and_unavailable_model_responses_are_rejected(self):
        invalid_payloads = (
            {"choices": []},
            {"choices": [{"finish_reason": "length", "message": {"content": "{}"}}]},
            {"choices": [{"finish_reason": "stop", "message": {"content": "not-json"}}]},
            openai_response({**CLASSIFICATION, "primaryCategory": "UNSUPPORTED"}),
            openai_response(
                {**CLASSIFICATION, "outcome": "ANALYSIS_UNAVAILABLE", "primaryCategory": None}
            ),
        )
        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                adapter = GroqVisionAdapter("mock-key", transport=self.transport(payload))
                with self.assertRaises(InvalidProviderResponse):
                    adapter.analyze(IMAGE)

    def test_gemini_rejects_truncated_or_empty_generation(self):
        payloads = (
            {"candidates": []},
            {
                "candidates": [
                    {"finishReason": "MAX_TOKENS", "content": {"parts": [{"text": "{}"}]}}
                ]
            },
            {"candidates": [{"finishReason": "STOP", "content": {"parts": []}}]},
        )
        for payload in payloads:
            with self.subTest(payload=payload):
                adapter = GeminiVisionAdapter(
                    "mock-key", "gemini-3.6-flash", transport=self.transport(payload)
                )
                with self.assertRaises(InvalidProviderResponse):
                    adapter.analyze(IMAGE)

    def test_cancellation_and_timeout_are_bounded(self):
        cancellation = Event()
        cancellation.set()
        adapter = GroqVisionAdapter("mock-key", transport=self.transport(openai_response()))
        with self.assertRaises(InferenceCancelled):
            adapter.analyze(IMAGE, cancellation)
        self.assertEqual(self.calls, [])

        def timed_out(*_args):
            raise TimeoutError("must never leak")

        adapter = GroqVisionAdapter("mock-key", transport=timed_out, timeout_seconds=4)
        with self.assertRaises(Exception) as captured:
            adapter.analyze(IMAGE)
        self.assertNotIn("must never leak", str(captured.exception))

    def test_adapter_constructor_rejects_unapproved_gemini_models_and_long_timeouts(self):
        accepted = GeminiVisionAdapter(
            "mock-key",
            "gemini-3.5-flash",
            transport=self.transport(
                {
                    "candidates": [
                        {
                            "finishReason": "STOP",
                            "content": {"parts": [{"text": json.dumps(CLASSIFICATION)}]},
                        }
                    ]
                }
            ),
        )
        self.assertEqual(accepted.model_id, "gemini-3.5-flash")
        with self.assertRaises(ValueError):
            GeminiVisionAdapter("mock-key", "gemini-3.4-flash")
        with self.assertRaises(ValueError):
            GroqVisionAdapter("mock-key", timeout_seconds=60)

    def test_factory_only_creates_adapters_for_present_credentials(self):
        self.assertEqual(build_adapters({}), {})
        adapters = build_adapters({"GEMINI_API_KEY": "mock-key"})
        self.assertEqual(
            tuple(adapters),
            (("gemini", "gemini-3.6-flash"), ("gemini", "gemini-3.5-flash")),
        )


if __name__ == "__main__":
    unittest.main()
