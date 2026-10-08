"""Local contract/security checks for the Strands-compatible read-only tools."""

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "services/agent/src"))

from waste2watt_agent.tools import (  # noqa: E402
    VerifiedPrincipal,
    bind_read_only_tools,
)


class MemoryReader:
    def __init__(self):
        self.owners = []

    def list_for_owner(self, owner_id, *, limit):
        self.owners.append((owner_id, limit))
        return [
            {"status": "FAILED", "quantityKg": 2.5, "failureCode": "ANALYSIS_UNAVAILABLE"},
            {"status": "UPLOADED", "quantityKg": 1.0},
        ]


class SustainabilityToolTests(unittest.TestCase):
    def test_tools_are_owner_bound_read_only_strands_modules(self):
        owner_id = "10000000-0000-4000-8000-000000000002"
        reader = MemoryReader()
        summary, scenario = bind_read_only_tools(
            VerifiedPrincipal(owner_id, token_verified=True), reader
        )
        self.assertEqual(summary.TOOL_SPEC["name"], "get_owner_scan_summary")
        self.assertEqual(scenario.TOOL_SPEC["name"], "calculate_cited_scenario")
        self.assertNotIn("ownerId", str(summary.TOOL_SPEC))
        response = summary.get_owner_scan_summary({"toolUseId": "safe-test", "input": {}})
        self.assertEqual(
            json.loads(response["content"][0]["text"])["approximateMassKg"],
            3.5,
        )
        self.assertEqual(reader.owners, [(owner_id, 100)])

    def test_unverified_principals_are_rejected_before_tool_construction(self):
        with self.assertRaises(PermissionError):
            bind_read_only_tools(
                VerifiedPrincipal("10000000-0000-4000-8000-000000000002", False),
                MemoryReader(),
            )

    def test_scenario_tool_cites_and_marks_results_as_simulated(self):
        _, scenario = bind_read_only_tools(
            VerifiedPrincipal("10000000-0000-4000-8000-000000000002", True),
            MemoryReader(),
        )
        inputs = {
            "quantityKg": 2,
            "currentDisposalPathway": "LANDFILL",
            "diversionPercent": 50,
            "pathway": "ANAEROBIC_DIGESTION",
            "lowerKwhPerKg": 0.1,
            "typicalKwhPerKg": 0.2,
            "upperKwhPerKg": 0.3,
            "energyBasis": "NET_OUTPUT",
            "evidenceUrl": "https://example.org/study",
            "evidenceVersion": "Table 4",
        }
        response = scenario.calculate_cited_scenario(
            {"toolUseId": "scenario-test", "input": inputs}
        )
        output = json.loads(response["content"][0]["text"])
        self.assertEqual(output["typicalKwh"], 0.2)
        self.assertEqual(output["divertedMassKg"], 1)
        self.assertEqual(output["status"], "SIMULATED")
        self.assertFalse(output["verified"])
        inputs["evidenceUrl"] = "http://example.org/study"
        with self.assertRaises(ValueError):
            scenario.calculate_cited_scenario({"input": inputs})


if __name__ == "__main__":
    unittest.main()
