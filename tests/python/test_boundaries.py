"""Placeholder services must never return fabricated results."""

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
for relative in ("packages/shared/python", "services/analysis/src", "services/agent/src"):
    sys.path.insert(0, str(ROOT / relative))

from waste2watt_agent.service import PlaceholderDecisionAgent  # noqa: E402
from waste2watt_analysis.service import PlaceholderAnalysisService  # noqa: E402


class BoundaryTests(unittest.TestCase):
    def test_analysis_is_explicitly_unimplemented(self):
        with self.assertRaises(NotImplementedError):
            PlaceholderAnalysisService().analyze(
                {"analysisId": "analysis-test", "sampleId": "sample-test", "ownerId": "owner-test"}
            )

    def test_agent_is_explicitly_unimplemented(self):
        with self.assertRaises(NotImplementedError):
            PlaceholderDecisionAgent().decide(
                {"analysisId": "analysis-test", "ownerId": "owner-test", "question": "Evaluate"}
            )
