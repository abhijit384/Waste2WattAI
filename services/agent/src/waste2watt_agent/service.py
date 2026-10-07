"""No agent, tools, prompts, or model provider is instantiated."""

from typing import Protocol

from waste2watt_shared import DecisionRequest, DecisionResponse


class DecisionAgent(Protocol):
    def decide(self, request: DecisionRequest) -> DecisionResponse: ...


class PlaceholderDecisionAgent:
    def decide(self, request: DecisionRequest) -> DecisionResponse:
        raise NotImplementedError("Decision agent is not implemented.")
