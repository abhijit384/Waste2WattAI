"""Deterministic, conservative waste recovery and scientific calculations."""

import json
import math
from pathlib import Path
from urllib.parse import urlsplit

from jsonschema import Draft202012Validator, FormatChecker

SCHEMAS = json.loads(Path(__file__).with_name("schemas.json").read_text(encoding="utf-8"))
CATALOG_VERSION = "2026-10-08.1"
# No photograph-category/kg coefficients have passed applicability review yet.
CATALOG = json.loads(Path(__file__).with_name("factor_catalog.json").read_text(encoding="utf-8"))
RECOVERY_FACTORS = tuple(CATALOG["activeFactors"])


class AnalysisFailure(Exception):
    """Safe failure code; never retain provider exception text or image content."""


def validate(value, schema="classification"):
    try:
        Draft202012Validator(SCHEMAS[schema], format_checker=FormatChecker()).validate(value)
    except Exception:
        raise AnalysisFailure("INVALID_MODEL_OUTPUT") from None
    if schema == "classification":
        if value["outcome"] in ("NO_WASTE_DETECTED", "INVALID_IMAGE", "ANALYSIS_UNAVAILABLE"):
            if value["primaryCategory"] is not None:
                raise AnalysisFailure("INVALID_MODEL_OUTPUT")
        elif value["primaryCategory"] is None:
            raise AnalysisFailure("INVALID_MODEL_OUTPUT")
        if value["confidenceBand"] == "LOW" and value["primaryCategory"] is not None:
            value = {**value, "outcome": "LOW_CONFIDENCE", "humanReviewRecommended": True}
        if value["outcome"] == "MULTIPLE_MATERIALS":
            value = {**value, "humanReviewRecommended": True}
    elif schema == "analysis":
        if validate(value["classification"]) != value["classification"]:
            raise AnalysisFailure("INVALID_MODEL_OUTPUT")
        if value["impact"]["energyKwh"] is not None and value["impact"]["energyBasis"] is None:
            raise AnalysisFailure("INVALID_MODEL_OUTPUT")
        if value["impact"]["carbonBenefitKgCo2e"] is not None and not value["impact"]["baseline"]:
            raise AnalysisFailure("INVALID_MODEL_OUTPUT")
        for source in value["impact"]["sources"]:
            url = urlsplit(source["url"])
            if url.scheme != "https" or not url.netloc or url.username or url.password:
                raise AnalysisFailure("INVALID_MODEL_OUTPUT")
    return value


def parse_response(response):
    if not isinstance(response, dict):
        raise AnalysisFailure("INVALID_MODEL_OUTPUT")
    if response.get("stopReason") != "tool_use":
        raise AnalysisFailure("INVALID_MODEL_OUTPUT")
    try:
        blocks = response["output"]["message"]["content"]
        if not isinstance(blocks, list) or any(not isinstance(block, dict) for block in blocks):
            raise ValueError()
        tools = [block["toolUse"] for block in blocks if "toolUse" in block]
        if len(tools) != 1 or tools[0].get("name") != "record_classification":
            raise ValueError()
    except (KeyError, TypeError, ValueError, AttributeError):
        raise AnalysisFailure("INVALID_MODEL_OUTPUT") from None
    # This is a data extraction envelope, never an executable tool.
    return validate(tools[0].get("input"))


def recovery(classification):
    c = validate(classification)
    category = c["primaryCategory"]
    warnings = list(c["safetyConcerns"])
    constraints = ["Verify local facility acceptance and handling rules before acting."]
    options = []
    recommended = None
    explanation = "Human review is required before selecting a recovery pathway."
    hazardous = (
        bool(c["safetyConcerns"]) or category == "E_WASTE" or "E_WASTE" in c["otherMaterials"]
    )
    if hazardous:
        if category == "E_WASTE" or "E_WASTE" in c["otherMaterials"]:
            recommended = "SPECIALIZED_EWASTE_RECYCLING"
            explanation = (
                "Visible electronics require authorized specialist assessment and separation."
            )
        warnings.append(
            "Do not burn, dismantle batteries, or place hazardous items in ordinary waste."
        )
        constraints.append(
            "Use an authorized specialist; photographs cannot establish hazard absence."
        )
    elif c["outcome"] == "CLASSIFIED" and c["confidenceBand"] != "LOW":
        if category == "ORGANIC":
            recommended = "COMPOSTING"
            options = ["ANAEROBIC_DIGESTION"]
            explanation = (
                "Separated organics may support biological treatment after contamination checks."
            )
            constraints.append(
                "Verify biodegradability, feedstock acceptance and contamination first."
            )
        elif category in ("PLASTIC", "PAPER_CARDBOARD", "METAL", "GLASS"):
            recommended = "RECYCLING"
            options = ["REUSE"]
            explanation = (
                "Preserve material value through reuse assessment and accepted material recycling."
            )
            constraints.append(
                "Identify polymer/material grade, cleanliness and recycler acceptance."
            )
        elif category == "TEXTILE":
            recommended = "REUSE"
            options = ["RECYCLING"]
            explanation = (
                "Assess safe reuse before fiber recycling; condition and composition need checking."
            )
    if c["contamination"] != "NONE_VISIBLE":
        constraints.append(
            "Contamination is visible or unknown; verify and separate before treatment."
        )
    if category in ("MIXED", "OTHER") or c["outcome"] == "MULTIPLE_MATERIALS":
        recommended = None
        options = []
        constraints.append("Separate and identify materials; proportions are unknown.")
    if c["outcome"] in ("NO_WASTE_DETECTED", "INVALID_IMAGE", "ANALYSIS_UNAVAILABLE"):
        recommended = None
        options = []
    # WTE and landfill are supported decision options, but a photo cannot establish
    # calorific value, permitted facility/emissions controls or residual eligibility.
    constraints.append(
        "Waste-to-energy requires verified residual feedstock, "
        "calorific value and permitted controls."
    )
    constraints.append(
        "Landfill requires authorized residual disposal after reuse and recovery assessment."
    )
    return {
        "recommendedPathway": recommended,
        "alternativePathways": options,
        "explanation": explanation,
        "eligibilityConstraints": constraints,
        "warnings": warnings,
        "actionable": False,
        "facilityStatus": "UNVERIFIED",
    }


def quantity_in_kg(value, unit):
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
        or value <= 0
    ):
        raise ValueError("Invalid quantity")
    if unit not in ("kg", "g", "metric_tonne", "US_short_ton"):
        raise ValueError("Unsupported unit")
    return value * {"kg": 1, "g": 0.001, "metric_tonne": 1000, "US_short_ton": 907.18474}[unit]


def validate_factor(factor):
    required = (
        "sourceOrganization",
        "publicationTitle",
        "sourceUrl",
        "publicationDate",
        "materialCategory",
        "pathway",
        "unit",
        "lower",
        "typical",
        "upper",
        "assumptions",
        "geography",
        "version",
    )
    if any(name not in factor for name in required):
        raise ValueError("Factor provenance is incomplete")
    if not factor["publicationDate"] or not factor["sourceOrganization"]:
        raise ValueError("Factor publication date and organization required")
    url = urlsplit(factor["sourceUrl"])
    if url.scheme != "https" or not url.netloc or url.username or url.password:
        raise ValueError("Factor source must be public HTTPS")
    for name in ("lower", "upper", "typical"):
        value = factor[name]
        if value is None and name == "typical":
            continue
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
        ):
            raise ValueError("Invalid factor coefficient")
    if factor["lower"] > factor["upper"] or (
        factor["typical"] is not None
        and not factor["lower"] <= factor["typical"] <= factor["upper"]
    ):
        raise ValueError("Invalid factor bounds")


def impact(quantity_kg, category, pathway, geography="IN", baseline=None, factors=RECOVERY_FACTORS):
    quantity_in_kg(quantity_kg, "kg")
    result = {
        "energyKwh": None,
        "energyBasis": None,
        "carbonBenefitKgCo2e": None,
        "baseline": baseline,
        "explanation": "Estimate unavailable — verified conversion factor required.",
        "sources": [],
        "assumptions": [
            "User-supplied mass; material proportions and local facility performance are unknown."
        ],
    }
    applied_units = set()
    for factor in factors:
        validate_factor(factor)
        if (factor["materialCategory"], factor["pathway"], factor["geography"]) != (
            category,
            pathway,
            geography,
        ):
            continue
        # Bounds without a defensible typical coefficient are not a point estimate.
        if factor["typical"] is None:
            continue
        if not factor["lower"] <= factor["typical"] <= factor["upper"]:
            raise ValueError("Invalid factor bounds")
        if factor["unit"] == "kWh/kg":
            result["energyKwh"] = quantity_kg * factor["typical"]
            result["energyBasis"] = factor["energyBasis"]
        elif factor["unit"] == "kgCO2e/kg" and baseline and factor["baseline"] == baseline:
            # The factor is a complete baseline-minus-pathway life-cycle difference.
            # Never add independent electricity/recycling/landfill offsets to it.
            result["carbonBenefitKgCo2e"] = quantity_kg * factor["typical"]
        else:
            continue
        if factor["unit"] in applied_units:
            raise ValueError("Multiple factors would double count the same scenario")
        applied_units.add(factor["unit"])
        result["sources"].append(
            {
                "title": factor["publicationTitle"],
                "url": factor["sourceUrl"],
                "version": factor["version"],
            }
        )
        result["assumptions"].extend(factor["assumptions"])
        result["explanation"] = (
            "Scenario estimate under cited assumptions; "
            "not realized production or measured emissions."
        )
    return result
