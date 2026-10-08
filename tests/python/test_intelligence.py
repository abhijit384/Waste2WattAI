"""Offline regression tests; no AWS client is created or inference invoked."""

import io
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from botocore.exceptions import ClientError
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "services/analysis/src"))
from waste2watt_analysis.intelligence import (  # noqa: E402
    AnalysisFailure,
    impact,
    parse_response,
    quantity_in_kg,
    recovery,
    validate,
)
from waste2watt_analysis.runtime import AnalysisRuntime, handler, verify_context  # noqa: E402
from waste2watt_analysis.vision import MODEL_ID, analyze, preprocess  # noqa: E402


def classification(category="ORGANIC", **overrides):
    return {
        "outcome": "CLASSIFIED",
        "primaryCategory": category,
        "otherMaterials": [],
        "description": "Visible material",
        "confidenceBand": "HIGH",
        "contamination": "UNKNOWN",
        "separationConcerns": [],
        "safetyConcerns": [],
        "humanReviewRecommended": False,
        "materialProportions": None,
        **overrides,
    }


def response(value):
    return {
        "stopReason": "tool_use",
        "output": {
            "message": {"content": [{"toolUse": {"name": "record_classification", "input": value}}]}
        },
        "usage": {"inputTokens": 800, "outputTokens": 150},
    }


def image_data(format="PNG"):
    stream = io.BytesIO()
    Image.new("RGB", (12, 12), "green").save(stream, format=format)
    return stream.getvalue()


class IntelligenceTests(unittest.TestCase):
    def test_all_categories_validate(self):
        for category in (
            "ORGANIC",
            "PLASTIC",
            "PAPER_CARDBOARD",
            "METAL",
            "GLASS",
            "TEXTILE",
            "E_WASTE",
            "MIXED",
            "OTHER",
        ):
            self.assertEqual(validate(classification(category))["primaryCategory"], category)

    def test_unknown_category_and_extra_fields_rejected(self):
        for value in (
            classification("BATTERY"),
            classification(weight=3),
            {"outcome": "CLASSIFIED"},
        ):
            with self.assertRaisesRegex(AnalysisFailure, "INVALID_MODEL_OUTPUT"):
                validate(value)

    def test_converse_tool_envelope_validation(self):
        self.assertEqual(parse_response(response(classification()))["primaryCategory"], "ORGANIC")
        for value in (
            {},
            {"stopReason": "max_tokens"},
            {
                "stopReason": "end_turn",
                "output": {"message": {"content": [{"text": "run command"}]}},
            },
        ):
            with self.assertRaises(AnalysisFailure):
                parse_response(value)

    def test_no_waste_and_unavailable_are_explicit(self):
        for outcome in ("NO_WASTE_DETECTED", "INVALID_IMAGE", "ANALYSIS_UNAVAILABLE"):
            c = classification(None, outcome=outcome)
            self.assertIsNone(recovery(c)["recommendedPathway"])
            with self.assertRaises(AnalysisFailure):
                validate(classification(outcome=outcome))

    def test_low_confidence_requires_review(self):
        c = validate(classification(confidenceBand="LOW"))
        self.assertTrue(c["humanReviewRecommended"])
        self.assertEqual(c["outcome"], "LOW_CONFIDENCE")
        self.assertIsNone(recovery(c)["recommendedPathway"])

    def test_mixed_materials_require_separation(self):
        result = recovery(
            classification(
                "MIXED", outcome="MULTIPLE_MATERIALS", otherMaterials=["GLASS", "PLASTIC"]
            )
        )
        self.assertIsNone(result["recommendedPathway"])
        self.assertFalse(result["actionable"])

    def test_ewaste_and_battery_safety(self):
        for c in (
            classification("E_WASTE"),
            classification("PLASTIC", otherMaterials=["E_WASTE"]),
            classification("METAL", safetyConcerns=["Possible battery"]),
        ):
            r = recovery(c)
            self.assertNotIn("WASTE_TO_ENERGY", r["alternativePathways"])
            self.assertNotEqual(r["recommendedPathway"], "WASTE_TO_ENERGY")
            self.assertTrue(r["warnings"])

    def test_material_compatibility_and_unverified_facilities(self):
        for category in ("PLASTIC", "METAL", "GLASS", "PAPER_CARDBOARD"):
            r = recovery(classification(category))
            self.assertEqual(r["recommendedPathway"], "RECYCLING")
            self.assertNotIn("COMPOSTING", r["alternativePathways"])
            self.assertFalse(r["actionable"])
        self.assertEqual(recovery(classification("TEXTILE"))["recommendedPathway"], "REUSE")

    def test_unknown_coefficients_stay_null(self):
        result = impact(2, "ORGANIC", "COMPOSTING")
        self.assertIsNone(result["energyKwh"])
        self.assertIsNone(result["carbonBenefitKgCo2e"])
        self.assertEqual(result["sources"], [])

    def test_units_and_invalid_quantity(self):
        self.assertEqual(quantity_in_kg(1000, "g"), 1)
        self.assertEqual(quantity_in_kg(1, "metric_tonne"), 1000)
        self.assertEqual(quantity_in_kg(1, "US_short_ton"), 907.18474)
        for value, unit in ((True, "kg"), (-1, "kg"), (float("nan"), "kg"), (1, "ton")):
            with self.assertRaises(ValueError):
                quantity_in_kg(value, unit)

    def test_carbon_requires_matching_geography_and_baseline(self):
        # Test-only coefficients; never part of the scientific production catalog.
        factor = {
            "materialCategory": "METAL",
            "pathway": "RECYCLING",
            "geography": "TEST",
            "typical": 2,
            "lower": 1,
            "upper": 3,
            "unit": "kgCO2e/kg",
            "baseline": "TEST_BASELINE",
            "publicationTitle": "Synthetic test fixture",
            "sourceOrganization": "Test only",
            "publicationDate": "2026-10-08",
            "sourceUrl": "https://example.org/test",
            "version": "test-only",
            "assumptions": [],
        }
        self.assertIsNone(impact(3, "METAL", "RECYCLING", factors=[factor])["carbonBenefitKgCo2e"])
        self.assertIsNone(
            impact(3, "METAL", "RECYCLING", "TEST", "wrong", [factor])["carbonBenefitKgCo2e"]
        )
        self.assertEqual(
            impact(3, "METAL", "RECYCLING", "TEST", "TEST_BASELINE", [factor])[
                "carbonBenefitKgCo2e"
            ],
            6,
        )

    def test_supported_images_decode_resize_and_strip_metadata(self):
        for format, mime in (("PNG", "image/png"), ("JPEG", "image/jpeg"), ("WEBP", "image/webp")):
            result = preprocess(image_data(format), mime)
            with Image.open(io.BytesIO(result)) as image:
                self.assertEqual(image.format, "JPEG")
                self.assertLessEqual(max(image.size), 1024)
                self.assertFalse(image.getexif())

    def test_invalid_signature_corruption_and_size(self):
        for data, mime in (
            (b"secret text", "image/png"),
            (image_data(), "image/jpeg"),
            (b"\x89PNG\r\n\x1a\nbroken", "image/png"),
            (b"x" * (10 * 1024 * 1024 + 1), "image/png"),
        ):
            with self.assertRaisesRegex(AnalysisFailure, "INVALID_IMAGE"):
                preprocess(data, mime)

    def test_one_bounded_sdk_request_with_mock(self):
        client = Mock()
        client.converse.return_value = response(classification())
        c, usage = analyze(client, preprocess(image_data(), "image/png"))
        self.assertEqual(c["primaryCategory"], "ORGANIC")
        self.assertEqual(usage["outputTokens"], 150)
        self.assertEqual(client.converse.call_count, 1)
        self.assertEqual(client.converse.call_args.kwargs["modelId"], MODEL_ID)
        self.assertEqual(client.converse.call_args.kwargs["inferenceConfig"]["maxTokens"], 768)

    def test_no_provider_retry_on_throttling(self):
        client = Mock()
        client.converse.side_effect = TimeoutError("test failure")
        with self.assertRaises(TimeoutError):
            analyze(client, b"image-test")
        self.assertEqual(client.converse.call_count, 1)

    def test_feature_flag_prevents_client_creation(self):
        with (
            patch.dict("os.environ", {"AI_INFERENCE_ENABLED": "false"}),
            patch("boto3.Session") as session,
        ):
            with self.assertRaisesRegex(AnalysisFailure, "ANALYSIS_UNAVAILABLE"):
                handler({}, None)
            session.assert_not_called()

    def test_health_check_imports_handler_without_clients_or_inference(self):
        with (
            patch.dict("os.environ", {"AI_INFERENCE_ENABLED": "false"}),
            patch("boto3.Session") as session,
        ):
            self.assertEqual(
                handler({"action": "HealthCheck"}, None),
                {"status": "READY", "inferenceEnabled": False},
            )
            session.assert_not_called()

    def test_ownership_object_binding_and_quantity(self):
        owner, scan_id = (
            "11111111-1111-4111-8111-111111111111",
            "22222222-2222-4222-8222-222222222222",
        )
        key = f"private/{owner}/{scan_id}/{'33333333-3333-4333-8333-333333333333'}.png"
        e = {
            "source": "aws.s3",
            "detail-type": "Object Created",
            "detail": {"bucket": {"name": "private-test"}, "object": {"key": key}},
        }
        scan = {
            "ownerId": owner,
            "userId": owner,
            "scanId": scan_id,
            "objectKey": key,
            "quantityKg": 1,
        }
        self.assertEqual(verify_context(e, "private-test", scan)[2], key)
        for field in ("ownerId", "userId", "objectKey"):
            bad = {**scan, field: "wrong"}
            with self.assertRaises(AnalysisFailure):
                verify_context(e, "private-test", bad)

    def test_terminal_scan_does_not_invoke(self):
        owner, scan_id = (
            "11111111-1111-4111-8111-111111111111",
            "22222222-2222-4222-8222-222222222222",
        )
        key = f"private/{owner}/{scan_id}/{'33333333-3333-4333-8333-333333333333'}.png"
        e = {
            "source": "aws.s3",
            "detail-type": "Object Created",
            "detail": {"bucket": {"name": "private-test"}, "object": {"key": key}},
        }
        table, bedrock = Mock(), Mock()
        table.get_item.return_value = {
            "Item": {
                "ownerId": owner,
                "userId": owner,
                "scanId": scan_id,
                "objectKey": key,
                "quantityKg": 1,
                "status": "FAILED",
            }
        }
        runtime = AnalysisRuntime(table, "metrics", Mock(), Mock(), bedrock, "private-test", True)
        self.assertEqual(runtime.task("AnalyzeWithBedrock", e, "execution-test"), {"ignored": True})
        bedrock.converse.assert_not_called()

    def test_budget_reservation_is_atomic_with_scan_marker(self):
        client, table = Mock(), Mock()
        table.name = "scans"
        runtime = AnalysisRuntime(table, "metrics", client, Mock(), Mock(), "private-test", True)
        runtime.reserve(
            {"ownerId": "owner-test", "scanId": "scan-test"},
            "execution-test",
            "2026-10-08T00:00:00Z",
        )
        items = client.transact_write_items.call_args.kwargs["TransactItems"]
        self.assertEqual(len(items), 3)
        self.assertIn(
            "attribute_not_exists(invocationReserved)", items[0]["Update"]["ConditionExpression"]
        )
        self.assertEqual(items[1]["Update"]["ExpressionAttributeValues"][":limit"], {"N": "50"})
        self.assertEqual(items[2]["Update"]["ExpressionAttributeValues"][":limit"], {"N": "5"})

    def workflow(self):
        owner = "11111111-1111-4111-8111-111111111111"
        scan_id = "22222222-2222-4222-8222-222222222222"
        key = f"private/{owner}/{scan_id}/33333333-3333-4333-8333-333333333333.png"
        data = image_data()
        event = {
            "source": "aws.s3",
            "detail-type": "Object Created",
            "detail": {
                "bucket": {"name": "private-test"},
                "object": {"key": key, "version-id": "v1"},
            },
        }
        record = {
            "ownerId": owner,
            "userId": owner,
            "scanId": scan_id,
            "objectKey": key,
            "quantityKg": 2,
            "contentType": "image/png",
            "sizeBytes": len(data),
            "status": "PROCESSING",
        }
        table, dynamo, s3, bedrock = Mock(), Mock(), Mock(), Mock()
        table.name = "scans"
        table.get_item.side_effect = lambda **kwargs: {"Item": dict(record)}

        class Conditional(ClientError):
            pass

        class Canceled(ClientError):
            pass

        table.meta.client.exceptions.ConditionalCheckFailedException = Conditional
        dynamo.exceptions.TransactionCanceledException = Canceled

        def update(**kwargs):
            values = kwargs["ExpressionAttributeValues"]
            execution = values[":execution"]
            if (
                record["status"] != "PROCESSING"
                or record.get("analysisExecution", execution) != execution
            ):
                raise Conditional(
                    {"Error": {"Code": "ConditionalCheckFailedException"}}, "UpdateItem"
                )
            expression = kwargs["UpdateExpression"]
            assignments = expression.removeprefix("SET ").split(" REMOVE ")[0].split(", ")
            names = kwargs.get("ExpressionAttributeNames", {})
            for assignment in assignments:
                name, value = assignment.split(" = ")
                record[names.get(name, name)] = values[value]
            if " REMOVE " in expression:
                for name in expression.split(" REMOVE ")[1].split(", "):
                    record.pop(name, None)

        table.update_item.side_effect = update

        def reserve(**kwargs):
            if record.get("invocationReserved"):
                raise Canceled(
                    {"Error": {"Code": "TransactionCanceledException"}}, "TransactWriteItems"
                )
            record["invocationReserved"] = True

        dynamo.transact_write_items.side_effect = reserve
        s3.get_object.side_effect = lambda **kwargs: {
            "Body": io.BytesIO(data),
            "ContentLength": len(data),
            "ContentType": "image/png",
        }
        bedrock.converse.return_value = response(classification())
        runtime = AnalysisRuntime(table, "metrics", dynamo, s3, bedrock, "private-test", True)
        return runtime, event, record, bedrock, dynamo

    def test_complete_workflow_persists_validated_analysis_and_ignores_replay(self):
        runtime, event, record, bedrock, _ = self.workflow()
        for action in (
            "ValidateImage",
            "ValidateImage",
            "AnalyzeWithBedrock",
            "AnalyzeWithBedrock",
            "ValidateClassification",
            "EvaluateRecoveryPathways",
            "CalculateEnvironmentalImpact",
            "PersistAnalysis",
            "UpdateScanStatus",
        ):
            runtime.task(action, event, "execution-test")
        self.assertEqual(record["status"], "COMPLETED")
        self.assertEqual(float(record["analysis"]["quantityKg"]), 2)
        self.assertIsNone(record["analysis"]["impact"]["energyKwh"])
        self.assertNotIn("pendingClassification", record)
        self.assertEqual(bedrock.converse.call_count, 1)
        self.assertEqual(runtime.task("ValidateImage", event, "duplicate-test"), {"ignored": True})
        self.assertEqual(bedrock.converse.call_count, 1)

    def test_other_execution_cannot_take_claim_or_charge(self):
        runtime, event, _, bedrock, dynamo = self.workflow()
        runtime.task("ValidateImage", event, "execution-test")
        self.assertEqual(runtime.task("ValidateImage", event, "other-execution"), {"ignored": True})
        dynamo.transact_write_items.assert_not_called()
        bedrock.converse.assert_not_called()

    def test_invalid_response_and_provider_failure_persist_failure_without_secrets(self):
        for provider_failure in (False, True):
            runtime, event, record, bedrock, _ = self.workflow()
            runtime.task("ValidateImage", event, "execution-test")
            if provider_failure:
                bedrock.converse.side_effect = ClientError(
                    {"Error": {"Code": "ThrottlingException", "Message": "secret-provider-text"}},
                    "Converse",
                )
            else:
                bedrock.converse.return_value = response({"invalid": True})
            with self.assertRaises(AnalysisFailure) as raised:
                runtime.task("AnalyzeWithBedrock", event, "execution-test")
            self.assertNotIn("secret-provider-text", str(raised.exception))
            self.assertEqual(record["status"], "FAILED")
            self.assertEqual(
                record["failureCode"],
                "ANALYSIS_UNAVAILABLE" if provider_failure else "INVALID_MODEL_OUTPUT",
            )
            self.assertEqual(bedrock.converse.call_count, 1)
            self.assertTrue(runtime.task("AnalyzeWithBedrock", event, "retry-test")["ignored"])

    def test_budget_rejection_never_calls_bedrock(self):
        runtime, event, record, bedrock, dynamo = self.workflow()
        runtime.task("ValidateImage", event, "execution-test")
        dynamo.transact_write_items.side_effect = dynamo.exceptions.TransactionCanceledException(
            {"Error": {"Code": "TransactionCanceledException"}}, "TransactWriteItems"
        )
        with self.assertRaisesRegex(AnalysisFailure, "AI_LIMIT_EXCEEDED"):
            runtime.task("AnalyzeWithBedrock", event, "execution-test")
        self.assertEqual(record["failureCode"], "AI_LIMIT_EXCEEDED")
        bedrock.converse.assert_not_called()

    def test_unsupported_pathway_and_unproven_coefficients(self):
        self.assertIsNone(impact(2, "GLASS", "WASTE_TO_ENERGY")["energyKwh"])
        with self.assertRaisesRegex(ValueError, "provenance"):
            impact(2, "ORGANIC", "COMPOSTING", factors=[{"typical": 3}])

    def test_energy_basis_and_duplicate_factors_do_not_double_count(self):
        factor = {
            "sourceOrganization": "Test only",
            "publicationTitle": "Synthetic fixture",
            "sourceUrl": "https://example.org/test",
            "publicationDate": "2026-10-08",
            "materialCategory": "ORGANIC",
            "pathway": "ANAEROBIC_DIGESTION",
            "unit": "kWh/kg",
            "lower": 1,
            "typical": 2,
            "upper": 3,
            "assumptions": ["Synthetic, not an actual plant"],
            "geography": "TEST",
            "version": "test-only",
            "energyBasis": "NET_OUTPUT",
        }
        result = impact(3, "ORGANIC", "ANAEROBIC_DIGESTION", "TEST", factors=[factor])
        self.assertEqual(result["energyKwh"], 6)
        self.assertEqual(result["energyBasis"], "NET_OUTPUT")
        self.assertIsNone(result["carbonBenefitKgCo2e"])
        with self.assertRaisesRegex(ValueError, "double count"):
            impact(3, "ORGANIC", "ANAEROBIC_DIGESTION", "TEST", factors=[factor, factor])

    def test_partial_persistence_failure_never_reports_completed_or_reinvokes(self):
        runtime, event, record, bedrock, _ = self.workflow()
        for action in (
            "ValidateImage",
            "AnalyzeWithBedrock",
            "ValidateClassification",
            "EvaluateRecoveryPathways",
            "CalculateEnvironmentalImpact",
        ):
            runtime.task(action, event, "execution-test")
        original = runtime.scans.update_item.side_effect

        def fail_persist(**kwargs):
            if kwargs["UpdateExpression"] == "SET analysis = :a":
                raise ClientError({"Error": {"Code": "InternalServerError"}}, "UpdateItem")
            return original(**kwargs)

        runtime.scans.update_item.side_effect = fail_persist
        with self.assertRaisesRegex(AnalysisFailure, "ANALYSIS_UNAVAILABLE"):
            runtime.task("PersistAnalysis", event, "execution-test")
        self.assertEqual(record["status"], "FAILED")
        self.assertNotIn("analysis", record)
        self.assertTrue(runtime.task("AnalyzeWithBedrock", event, "replay-test")["ignored"])
        self.assertEqual(bedrock.converse.call_count, 1)
