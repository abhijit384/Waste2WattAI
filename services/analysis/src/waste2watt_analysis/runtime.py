"""Server-only, feature-gated analysis tasks. No client is created at import time."""

import json
import os
import re
from datetime import UTC, datetime
from decimal import Decimal

from botocore.exceptions import BotoCoreError, ClientError

from .external_ai_policy import bedrock_inference_allowed, external_ai_enabled
from .external_config import load_local_provider_environment, load_provider_credentials
from .intelligence import CATALOG_VERSION, AnalysisFailure, impact, recovery, validate
from .vision import MAX_IMAGE_BYTES, MODEL_ID, analyze, preprocess


def verify_context(event, bucket, scan):
    try:
        detail = event["detail"]
        key = detail["object"]["key"]
        match = re.fullmatch(
            r"private/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/"
            r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/"
            r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|webp)",
            key,
        )
        if (
            event["source"] != "aws.s3"
            or event["detail-type"] != "Object Created"
            or detail["bucket"]["name"] != bucket
            or not match
        ):
            raise ValueError()
        owner, scan_id = match[1], match[2]
        if (
            any(scan.get(field) != owner for field in ("ownerId", "userId"))
            or scan.get("scanId") != scan_id
            or scan.get("objectKey") != key
        ):
            raise ValueError()
        if isinstance(scan["quantityKg"], bool):
            raise ValueError()
        quantity = float(scan["quantityKg"])
        if not 0 < quantity <= 1_000_000:
            raise ValueError()
        return owner, scan_id, key
    except (KeyError, TypeError, ValueError):
        raise AnalysisFailure("PROCESSING_FAILED") from None


class AnalysisRuntime:
    def __init__(
        self,
        scans,
        metrics,
        dynamodb,
        s3,
        bedrock,
        bucket,
        enabled=False,
        daily_limit=50,
        user_limit=5,
        external_analyzer=None,
        bedrock_enabled=True,
    ):
        self.scans, self.metrics, self.dynamodb = scans, metrics, dynamodb
        self.s3, self.bedrock, self.bucket = s3, bedrock, bucket
        self.enabled, self.daily_limit, self.user_limit = enabled, daily_limit, user_limit
        self.external_analyzer = external_analyzer
        self.bedrock_enabled = bedrock_enabled
        if (
            any(
                isinstance(limit, bool) or not isinstance(limit, int) or limit < 1
                for limit in (daily_limit, user_limit)
            )
            or user_limit > daily_limit
        ):
            raise AnalysisFailure("ANALYSIS_UNAVAILABLE")

    def update(self, key, execution, expression, names, values):
        self.scans.update_item(
            Key=key,
            UpdateExpression=expression,
            ConditionExpression="analysisExecution = :execution AND #status = :processing",
            ExpressionAttributeNames={"#status": "status", **names},
            ExpressionAttributeValues={
                ":execution": execution,
                ":processing": "PROCESSING",
                **values,
            },
        )

    def reserve(self, key, execution, now):
        day = now[:10]

        def counter(owner, limit):
            return {
                "Update": {
                    "TableName": self.metrics,
                    "Key": {"ownerId": {"S": owner}, "metricDate": {"S": "AI#" + day}},
                    "UpdateExpression": "ADD invocations :one",
                    "ConditionExpression": (
                        "attribute_not_exists(invocations) OR invocations < :limit"
                    ),
                    "ExpressionAttributeValues": {":one": {"N": "1"}, ":limit": {"N": str(limit)}},
                }
            }

        # Scan marker and both limits are committed atomically. Failed/uncertain calls
        # retain the marker; no retry can charge the same scan again automatically.
        self.dynamodb.transact_write_items(
            TransactItems=[
                {
                    "Update": {
                        "TableName": self.scans.name,
                        "Key": {name: {"S": value} for name, value in key.items()},
                        "UpdateExpression": "SET invocationReserved = :true",
                        "ConditionExpression": (
                            "analysisExecution = :execution AND #status = :processing "
                            "AND attribute_not_exists(invocationReserved)"
                        ),
                        "ExpressionAttributeNames": {"#status": "status"},
                        "ExpressionAttributeValues": {
                            ":execution": {"S": execution},
                            ":processing": {"S": "PROCESSING"},
                            ":true": {"BOOL": True},
                        },
                    }
                },
                counter("AI#GLOBAL", self.daily_limit),
                counter(key["ownerId"], self.user_limit),
            ]
        )

    def fail(self, key, execution, code, now):
        try:
            self.update(
                key,
                execution,
                "SET #status = :failed, failureCode = :code, updatedAt = :now",
                {},
                {":failed": "FAILED", ":code": code, ":now": now},
            )
        except ClientError:
            pass  # Existing terminal status/claim wins; never overwrite another execution.

    def task(self, action, event, execution):
        if not self.enabled:
            raise AnalysisFailure("ANALYSIS_UNAVAILABLE")
        if not execution or not isinstance(execution, str) or len(execution) > 256:
            raise AnalysisFailure("PROCESSING_FAILED")
        try:
            key_path = event["detail"]["object"]["key"].split("/")
            key = {"ownerId": key_path[1], "scanId": key_path[2]}
            scan = self.scans.get_item(Key=key, ConsistentRead=True).get("Item", {})
            _, _, object_key = verify_context(event, self.bucket, scan)
            if scan.get("status") in ("COMPLETED", "FAILED"):
                return {"ignored": True}
            now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
            if action == "ValidateImage":
                try:
                    self.scans.update_item(
                        Key=key,
                        UpdateExpression="SET analysisExecution = :execution",
                        ConditionExpression=(
                            "(attribute_not_exists(analysisExecution) OR "
                            "analysisExecution = :execution) AND #status = :processing"
                        ),
                        ExpressionAttributeNames={"#status": "status"},
                        ExpressionAttributeValues={
                            ":execution": execution,
                            ":processing": "PROCESSING",
                        },
                    )
                except self.scans.meta.client.exceptions.ConditionalCheckFailedException:
                    return {"ignored": True}
                self.image(event, scan, object_key)
            elif scan.get("analysisExecution") != execution:
                raise AnalysisFailure("PROCESSING_FAILED")
            elif action == "AnalyzeWithBedrock":
                if scan.get("pendingClassification"):
                    return {"status": "PROCESSING"}
                try:
                    self.reserve(key, execution, now)
                except self.dynamodb.exceptions.TransactionCanceledException:
                    raise AnalysisFailure("AI_LIMIT_EXCEEDED") from None
                clean_image = self.image(event, scan, object_key)
                selected_model = MODEL_ID
                selected_provider = "bedrock"
                usage = {}
                classification = None
                bedrock_failure_code = None
                if self.bedrock_enabled and self.bedrock is not None:
                    try:
                        classification, usage = analyze(self.bedrock, clean_image)
                    except AnalysisFailure as failure:
                        bedrock_failure_code = str(failure)
                    except Exception:
                        # One Bedrock attempt only. A denied or failed call proceeds
                        # to the independently gated free-provider sequence below.
                        classification = None
                if classification is None:
                    if (
                        self.external_analyzer is None
                        or scan.get("externalProcessingConsent") is not True
                    ):
                        if bedrock_failure_code == "INVALID_MODEL_OUTPUT":
                            raise AnalysisFailure(bedrock_failure_code)
                        raise AnalysisFailure("ANALYSIS_UNAVAILABLE")
                    external_result = self.external_analyzer(clean_image, True)
                    if external_result is None:
                        raise AnalysisFailure("ANALYSIS_UNAVAILABLE")
                    classification = validate(external_result.classification)
                    selected_model = external_result.model_id
                    selected_provider = external_result.provider
                    print(
                        json.dumps(
                            {
                                "event": "ExternalAiUsage",
                                "executionArn": execution,
                                "provider": selected_provider,
                                "modelId": selected_model,
                                "httpStatus": external_result.status_code,
                                "responseTimeMs": external_result.response_time_ms,
                            }
                        )
                    )
                else:
                    print(
                        json.dumps(
                            {
                                "event": "BedrockUsage",
                                "executionArn": execution,
                                "inputTokens": usage.get("inputTokens", 0),
                                "outputTokens": usage.get("outputTokens", 0),
                            }
                        )
                    )
                self.update(
                    key,
                    execution,
                    "SET pendingClassification = :c, pendingModelId = :model, "
                    "pendingModelVersion = :version",
                    {},
                    {
                        ":c": classification,
                        ":model": selected_model,
                        ":version": (
                            selected_model
                            if selected_provider == "bedrock"
                            else f"{selected_provider}:{selected_model}"
                        ),
                    },
                )
                # No image, model text, user identity, or provider exception is logged.
            elif action == "ValidateClassification":
                validate(scan["pendingClassification"])
            elif action == "EvaluateRecoveryPathways":
                self.update(
                    key,
                    execution,
                    "SET pendingRecovery = :r",
                    {},
                    {":r": recovery(scan["pendingClassification"])},
                )
            elif action == "CalculateEnvironmentalImpact":
                result = impact(
                    float(scan["quantityKg"]),
                    scan["pendingClassification"]["primaryCategory"],
                    scan["pendingRecovery"]["recommendedPathway"],
                )
                self.update(key, execution, "SET pendingImpact = :i", {}, {":i": result})
            elif action == "PersistAnalysis":
                result = validate(
                    {
                        "schemaVersion": "1",
                        "classification": scan["pendingClassification"],
                        "recovery": scan["pendingRecovery"],
                        "impact": scan["pendingImpact"],
                        "modelId": scan["pendingModelId"],
                        "modelVersion": scan["pendingModelVersion"],
                        "processedAt": now,
                        "quantityKg": float(scan["quantityKg"]),
                        "factorCatalogVersion": CATALOG_VERSION,
                    },
                    "analysis",
                )
                if result["classification"]["outcome"] in ("INVALID_IMAGE", "ANALYSIS_UNAVAILABLE"):
                    raise AnalysisFailure(result["classification"]["outcome"])
                self.update(
                    key,
                    execution,
                    "SET analysis = :a",
                    {},
                    {":a": json.loads(json.dumps(result), parse_float=Decimal)},
                )
            elif action == "UpdateScanStatus":
                validate(json.loads(json.dumps(scan["analysis"], default=float)), "analysis")
                self.update(
                    key,
                    execution,
                    "SET #status = :complete, updatedAt = :now "
                    "REMOVE pendingClassification, pendingRecovery, pendingImpact, "
                    "pendingModelId, pendingModelVersion",
                    {},
                    {":complete": "COMPLETED", ":now": now},
                )
            else:
                raise AnalysisFailure("PROCESSING_FAILED")
            return {"status": "COMPLETED" if action == "UpdateScanStatus" else "PROCESSING"}
        except AnalysisFailure as failure:
            if "now" in locals() and (
                scan.get("analysisExecution") == execution or action == "ValidateImage"
            ):
                self.fail(key, execution, str(failure), now)
            raise
        except (ClientError, BotoCoreError, KeyError, TypeError, ValueError):
            if "now" in locals():
                self.fail(key, execution, "ANALYSIS_UNAVAILABLE", now)
            raise AnalysisFailure("ANALYSIS_UNAVAILABLE") from None

    def image(self, event, scan, object_key):
        args = {"Bucket": self.bucket, "Key": object_key}
        version = event["detail"]["object"].get("version-id")
        if not version:
            raise AnalysisFailure("INVALID_IMAGE")
        response = self.s3.get_object(**args, VersionId=version)
        stream = response["Body"]
        try:
            if response.get("ContentLength") != scan.get("sizeBytes") or response.get(
                "ContentType"
            ) != scan.get("contentType"):
                raise AnalysisFailure("INVALID_IMAGE")
            data = stream.read(MAX_IMAGE_BYTES + 1)
        finally:
            stream.close()
        return preprocess(data, scan["contentType"])


_runtime = None


def handler(event, context):
    global _runtime
    if isinstance(event, dict) and event.get("action") == "HealthCheck":
        return {
            "status": "READY",
            "inferenceEnabled": os.environ.get("AI_INFERENCE_ENABLED") == "true",
        }
    load_local_provider_environment()
    # Gate precedes client construction, even when invoked accidentally.
    if os.environ.get("AI_INFERENCE_ENABLED") != "true":
        raise AnalysisFailure("ANALYSIS_UNAVAILABLE")
    if _runtime is None:
        import boto3
        from botocore.config import Config

        from .external_vision import analyze_with_free_providers

        config = Config(connect_timeout=3, read_timeout=25, retries={"total_max_attempts": 1})
        session = boto3.Session(region_name="us-east-1")
        bedrock_enabled = bedrock_inference_allowed(os.environ)
        external_enabled = external_ai_enabled(os.environ)
        provider_environment = dict(os.environ)
        secret_id = os.environ.get("EXTERNAL_AI_SECRET_ARN")
        if external_enabled and secret_id:
            secrets_config = Config(
                connect_timeout=3,
                read_timeout=5,
                retries={"total_max_attempts": 1},
            )
            provider_environment.update(
                load_provider_credentials(
                    session.client("secretsmanager", config=secrets_config), secret_id
                )
            )
        _runtime = AnalysisRuntime(
            session.resource("dynamodb", config=config).Table(os.environ["WASTE_SCANS_TABLE"]),
            os.environ["DAILY_METRICS_TABLE"],
            session.client("dynamodb", config=config),
            session.client("s3", config=config),
            session.client("bedrock-runtime", config=config) if bedrock_enabled else None,
            os.environ["IMAGE_BUCKET"],
            True,
            int(os.environ.get("AI_DAILY_LIMIT", "50")),
            int(os.environ.get("AI_USER_DAILY_LIMIT", "5")),
            (
                lambda image, consent: analyze_with_free_providers(
                    image,
                    provider_environment,
                    external_processing_consent=consent,
                )
                if external_enabled
                else None
            ),
            bedrock_enabled,
        )
    try:
        return _runtime.task(event["action"], event["event"], event["executionArn"])
    except AnalysisFailure as failure:
        print(json.dumps({"requestId": context.aws_request_id, "errorCode": str(failure)}))
        raise AnalysisFailure(str(failure)) from None
