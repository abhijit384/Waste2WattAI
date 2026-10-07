"""No model invocation or energy conversion is implemented."""

from typing import Protocol

from waste2watt_shared import AnalysisRequest, AnalysisResult


class AnalysisService(Protocol):
    def analyze(self, request: AnalysisRequest) -> AnalysisResult: ...


class PlaceholderAnalysisService:
    def analyze(self, request: AnalysisRequest) -> AnalysisResult:
        raise NotImplementedError("Waste analysis is not implemented.")
