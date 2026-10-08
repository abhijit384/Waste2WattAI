"""Legacy Phase 1 service boundary, retained for compatibility tests.

Phase 5 uses runtime.py and generated schemas.json aligned with shared TypeScript.
This old request/result interface is not used for owned scans or AI inference.
"""

from typing import Protocol

from waste2watt_shared import AnalysisRequest, AnalysisResult


class AnalysisService(Protocol):
    def analyze(self, request: AnalysisRequest) -> AnalysisResult: ...


class PlaceholderAnalysisService:
    def analyze(self, request: AnalysisRequest) -> AnalysisResult:
        raise NotImplementedError("Waste analysis is not implemented.")
