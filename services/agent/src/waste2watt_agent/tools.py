"""Read-only Strands-compatible tools bound to a validated Cognito owner."""

from __future__ import annotations

import json
from dataclasses import dataclass
from types import ModuleType
from typing import Any, Protocol
from uuid import UUID


class OwnedScanReader(Protocol):
    """Repository whose queries always constrain rows by the supplied owner."""

    def list_for_owner(self, owner_id: str, *, limit: int) -> list[dict[str, Any]]: ...


@dataclass(frozen=True)
class VerifiedPrincipal:
    """Identity populated only after Cognito JWT verification by the API boundary."""

    subject_id: str
    token_verified: bool


def _validated_owner(principal: VerifiedPrincipal) -> str:
    if principal.token_verified is not True:
        raise PermissionError("A validated Cognito identity is required")
    try:
        return str(UUID(principal.subject_id))
    except (ValueError, TypeError, AttributeError) as error:
        raise PermissionError("The validated identity has no valid subject") from error


def bind_read_only_tools(
    principal: VerifiedPrincipal, scan_reader: OwnedScanReader
) -> tuple[ModuleType, ModuleType]:
    """Return Strands module tools closed over one authenticated owner's reader."""

    owner_id = _validated_owner(principal)
    if not callable(getattr(scan_reader, "list_for_owner", None)):
        raise TypeError("A read-only owner-scoped scan reader is required")

    summary_tool = ModuleType("get_owner_scan_summary")
    summary_tool.TOOL_SPEC = {
        "name": "get_owner_scan_summary",
        "description": (
            "Read a compact summary of the signed-in user's scans. Values are descriptive; "
            "recorded quantities are user-entered approximations, never measured impact."
        ),
        "inputSchema": {
            "json": {"type": "object", "properties": {}, "additionalProperties": False}
        },
    }

    def get_owner_scan_summary(tool: dict[str, Any], **kwargs: Any) -> dict[str, Any]:
        del kwargs
        rows = scan_reader.list_for_owner(owner_id, limit=100)
        if len(rows) > 100:
            raise ValueError("The repository exceeded the summary row limit")
        statuses: dict[str, int] = {}
        approximate_mass_kg = 0.0
        analysis_unavailable = 0
        for row in rows:
            status = str(row.get("status", "UNKNOWN"))
            statuses[status] = statuses.get(status, 0) + 1
            quantity = row.get("quantityKg")
            if isinstance(quantity, (int, float)) and not isinstance(quantity, bool):
                if quantity >= 0 and quantity < 1_000_000:
                    approximate_mass_kg += quantity
            if row.get("failureCode") == "ANALYSIS_UNAVAILABLE":
                analysis_unavailable += 1
        result = {
            "classification": "RECORDED_SUMMARY",
            "rowCount": len(rows),
            "approximateMassKg": approximate_mass_kg,
            "massSource": "USER_ENTERED_APPROXIMATION",
            "statusCounts": statuses,
            "analysisUnavailable": analysis_unavailable,
            "energyAndCarbon": "UNAVAILABLE_WITHOUT_COMPLETE_CITED_ANALYSIS",
        }
        return {
            "toolUseId": str(tool.get("toolUseId", "local-test")),
            "status": "success",
            "content": [{"text": json.dumps(result, separators=(",", ":"))}],
        }

    summary_tool.get_owner_scan_summary = get_owner_scan_summary

    scenario_tool = ModuleType("calculate_cited_scenario")
    scenario_tool.TOOL_SPEC = {
        "name": "calculate_cited_scenario",
        "description": (
            "Multiply user-entered quantity and factor bounds. This returns a simulation, "
            "not measured, verified, or recommended output."
        ),
        "inputSchema": {
            "json": {
                "type": "object",
                "properties": {
                    "quantityKg": {"type": "number", "exclusiveMinimum": 0, "maximum": 1_000_000},
                    "currentDisposalPathway": {
                        "type": "string",
                        "enum": ["LANDFILL", "RECYCLING", "COMPOSTING", "OTHER"],
                    },
                    "diversionPercent": {"type": "number", "minimum": 0, "maximum": 100},
                    "pathway": {
                        "type": "string",
                        "enum": [
                            "ANAEROBIC_DIGESTION",
                            "COMBUSTION",
                            "GASIFICATION",
                            "PYROLYSIS",
                        ],
                    },
                    "lowerKwhPerKg": {"type": "number", "exclusiveMinimum": 0},
                    "typicalKwhPerKg": {"type": "number", "exclusiveMinimum": 0},
                    "upperKwhPerKg": {"type": "number", "exclusiveMinimum": 0},
                    "energyBasis": {
                        "type": "string",
                        "enum": [
                            "THEORETICAL_POTENTIAL",
                            "GROSS_OUTPUT",
                            "USABLE_ELECTRICITY",
                            "USEFUL_HEAT",
                            "NET_OUTPUT",
                        ],
                    },
                    "evidenceUrl": {"type": "string", "format": "uri"},
                    "evidenceVersion": {"type": "string", "minLength": 1},
                },
                "required": [
                    "quantityKg",
                    "currentDisposalPathway",
                    "diversionPercent",
                    "pathway",
                    "lowerKwhPerKg",
                    "typicalKwhPerKg",
                    "upperKwhPerKg",
                    "energyBasis",
                    "evidenceUrl",
                    "evidenceVersion",
                ],
                "additionalProperties": False,
            }
        },
    }

    def calculate_cited_scenario(tool: dict[str, Any], **kwargs: Any) -> dict[str, Any]:
        del kwargs
        values = tool.get("input", {})
        required = {
            "quantityKg",
            "currentDisposalPathway",
            "diversionPercent",
            "pathway",
            "lowerKwhPerKg",
            "typicalKwhPerKg",
            "upperKwhPerKg",
            "energyBasis",
            "evidenceUrl",
            "evidenceVersion",
        }
        if not isinstance(values, dict) or set(values) != required:
            raise ValueError("Scenario inputs do not match the declared schema")
        quantity = _positive_number(values["quantityKg"], "quantityKg")
        if quantity > 1_000_000:
            raise ValueError("quantityKg exceeds the supported limit")
        current_path = str(values["currentDisposalPathway"])
        if current_path not in {"LANDFILL", "RECYCLING", "COMPOSTING", "OTHER"}:
            raise ValueError("Unsupported current disposal pathway")
        diversion = _bounded_number(values["diversionPercent"], "diversionPercent", 0, 100)
        lower = _positive_number(values["lowerKwhPerKg"], "lowerKwhPerKg")
        typical = _positive_number(values["typicalKwhPerKg"], "typicalKwhPerKg")
        upper = _positive_number(values["upperKwhPerKg"], "upperKwhPerKg")
        if not lower <= typical <= upper:
            raise ValueError("Factor bounds must contain the typical value")
        pathway = str(values["pathway"])
        if pathway not in {
            "ANAEROBIC_DIGESTION",
            "COMBUSTION",
            "GASIFICATION",
            "PYROLYSIS",
        }:
            raise ValueError("Unsupported scenario pathway")
        from urllib.parse import urlparse

        parsed = urlparse(str(values["evidenceUrl"]))
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError("Evidence must use a public HTTPS URL")
        basis = str(values["energyBasis"]).strip()
        if basis not in {
            "THEORETICAL_POTENTIAL",
            "GROSS_OUTPUT",
            "USABLE_ELECTRICITY",
            "USEFUL_HEAT",
            "NET_OUTPUT",
        }:
            raise ValueError("Unsupported energy basis")
        version = str(values["evidenceVersion"]).strip()
        if not basis or not version:
            raise ValueError("Energy basis and evidence version are required")
        diverted_mass = quantity * diversion / 100
        result = {
            "status": "SIMULATED",
            "quantityKg": quantity,
            "currentDisposalPathway": current_path,
            "diversionPercent": diversion,
            "divertedMassKg": diverted_mass,
            "remainingMassKg": quantity - diverted_mass,
            "pathway": pathway,
            "energyBasis": basis,
            "lowerKwh": diverted_mass * lower,
            "typicalKwh": diverted_mass * typical,
            "upperKwh": diverted_mass * upper,
            "evidenceUrl": str(values["evidenceUrl"]),
            "evidenceVersion": version,
            "verified": False,
            "carbonBenefit": "UNAVAILABLE",
            "facilityAcceptance": "UNVERIFIED",
            "limitations": [
                "Uses user-entered factors; cited source scope has not been independently checked.",
                "Facility efficiency, contamination, transport, and acceptance are not modeled.",
                "Do not treat as guaranteed output or operational advice.",
            ],
        }
        if not all(result[key] < float("inf") for key in ("lowerKwh", "typicalKwh", "upperKwh")):
            raise ValueError("Scenario output exceeds the supported numeric range")
        return {
            "toolUseId": str(tool.get("toolUseId", "local-test")),
            "status": "success",
            "content": [{"text": json.dumps(result, separators=(",", ":"))}],
        }

    scenario_tool.calculate_cited_scenario = calculate_cited_scenario
    return summary_tool, scenario_tool


def _positive_number(value: Any, name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be a number")
    if value <= 0 or value != value or value in (float("inf"), float("-inf")):
        raise ValueError(f"{name} must be finite and greater than zero")
    return float(value)


def _bounded_number(value: Any, name: str, minimum: float, maximum: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be a number")
    if value < minimum or value > maximum or value != value:
        raise ValueError(f"{name} must be between {minimum} and {maximum}")
    if value in (float("inf"), float("-inf")):
        raise ValueError(f"{name} must be finite")
    return float(value)
