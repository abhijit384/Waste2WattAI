"""Python wire contracts. Keep JSON field names aligned with shared TypeScript types."""

from typing import Literal, TypedDict


class AnalysisRequest(TypedDict):
    analysisId: str
    sampleId: str
    ownerId: str


class EvidenceReference(TypedDict):
    sourceId: str
    uri: str
    version: str


class EnergyEstimate(TypedDict):
    pathway: Literal["anaerobic-digestion", "combustion", "gasification", "pyrolysis"]
    energyKwh: float | None
    methodology: str | None
    evidence: list[EvidenceReference]
    limitations: list[str]


class AnalysisResult(TypedDict):
    analysisId: str
    sampleId: str
    status: Literal["queued", "running", "completed", "failed"]
    estimates: list[EnergyEstimate]
    limitations: list[str]


class DecisionRequest(TypedDict):
    analysisId: str
    ownerId: str
    question: str


class DecisionResponse(TypedDict):
    analysisId: str
    summary: str
    evidence: list[EvidenceReference]
    limitations: list[str]
