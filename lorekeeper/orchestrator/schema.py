"""Shared schema for Lore Orchestrator outputs."""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional


@dataclass
class TimelineContext:
    """Aggregated timeline view (events + arcs + season)."""

    events: List[Any] = field(default_factory=list)
    arcs: List[Any] = field(default_factory=list)
    season: Dict[str, Any] = field(default_factory=dict)


@dataclass
class IdentityContext:
    """Identity + persona snapshot."""

    identity: Dict[str, Any] = field(default_factory=dict)
    persona: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CharacterContext:
    """Character state + relationship graph."""

    character: Dict[str, Any] = field(default_factory=dict)
    relationships: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class ContinuityContext:
    """Continuity canonical facts and conflicts."""

    canonical: List[Dict[str, Any]] = field(default_factory=list)
    conflicts: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class AutopilotContext:
    """Autopilot momentum and guidance signals."""

    daily: Dict[str, Any] = field(default_factory=dict)
    weekly: Dict[str, Any] = field(default_factory=dict)
    momentum: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FabricNeighborhood:
    """Graph neighborhood for a given memory node."""

    memory_id: str
    neighbors: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class HQIResultSchema:
    """Search results coming out of the HQI engine."""

    query: str
    results: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class OrchestratorSummary:
    """Unified payload presented to the UI via the orchestrator."""

    timeline: TimelineContext
    identity: IdentityContext
    continuity: ContinuityContext
    characters: List[CharacterContext] = field(default_factory=list)
    tasks: List[Dict[str, Any]] = field(default_factory=list)
    arcs: List[Any] = field(default_factory=list)
    season: Dict[str, Any] = field(default_factory=dict)
    autopilot: AutopilotContext = field(default_factory=AutopilotContext)
    saga: Dict[str, Any] = field(default_factory=dict)
    hqi: Optional[HQIResultSchema] = None
    fabric: Optional[FabricNeighborhood] = None


def dataclass_to_dict(data: Any) -> Any:
    """Recursively convert dataclasses to dictionaries for JSON responses."""

    if hasattr(data, "__dataclass_fields__"):
        return {key: dataclass_to_dict(value) for key, value in asdict(data).items()}
    if isinstance(data, list):
        return [dataclass_to_dict(item) for item in data]
    if isinstance(data, dict):
        return {key: dataclass_to_dict(value) for key, value in data.items()}
    return data
