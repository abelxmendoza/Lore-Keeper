"""Lore Orchestrator: unified data layer for UI components."""
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional

from .schema import (
    AutopilotContext,
    CharacterContext,
    ContinuityContext,
    FabricNeighborhood,
    HQIResultSchema,
    IdentityContext,
    OrchestratorSummary,
    TimelineContext,
    dataclass_to_dict,
)


class LoreOrchestrator:
    """Facade that aggregates signals from every engine into a single API."""

    def __init__(
        self,
        timeline_engine: Any = None,
        memory_fabric: Any = None,
        hqi_engine: Any = None,
        arc_engine: Any = None,
        season_engine: Any = None,
        identity_engine: Any = None,
        persona_engine: Any = None,
        character_engine: Any = None,
        task_engine: Any = None,
        continuity_engine: Any = None,
        autopilot_engine: Any = None,
        saga_engine: Any = None,
    ) -> None:
        self.timeline_engine = timeline_engine
        self.memory_fabric = memory_fabric
        self.hqi_engine = hqi_engine
        self.arc_engine = arc_engine
        self.season_engine = season_engine
        self.identity_engine = identity_engine
        self.persona_engine = persona_engine
        self.character_engine = character_engine
        self.task_engine = task_engine
        self.continuity_engine = continuity_engine
        self.autopilot_engine = autopilot_engine
        self.saga_engine = saga_engine

    # ------------------------------------------------------------------
    # Public API consumed by UI
    # ------------------------------------------------------------------
    def get_summary(self) -> Dict[str, Any]:
        """Return the entire orchestrated snapshot as a JSON-friendly dict."""

        timeline = self.get_timeline_context()
        identity = self.get_identity_context()
        continuity = self.get_continuity_state()
        autopilot = self.get_autopilot_context()
        saga = self.get_saga_context()
        arc = self.get_arc_context()

        characters: List[CharacterContext] = []
        if hasattr(self.character_engine, "list_characters"):
            characters = [
                self.get_character_context(char.get("id") or char.get("character_id") or idx)
                for idx, char in enumerate(self.character_engine.list_characters())
            ]

        tasks = self._safe_call(self.task_engine, "list_tasks", default=[])

        summary = OrchestratorSummary(
            timeline=timeline,
            identity=identity,
            continuity=continuity,
            characters=characters,
            tasks=tasks,
            arcs=arc.arcs,
            season=arc.season,
            autopilot=autopilot,
            saga=saga,
        )
        return dataclass_to_dict(summary)

    def get_timeline_context(self) -> TimelineContext:
        events = self._safe_call(self.timeline_engine, "list_events", default=[])
        arcs = self._safe_call(self.arc_engine, "get_arcs", default=[])
        season = self._safe_call(self.season_engine, "get_current_season", default={})
        return TimelineContext(events=events, arcs=arcs, season=season)

    def get_character_context(self, character_id: Any) -> CharacterContext:
        character = self._safe_call(
            self.character_engine, "get_character", default={}, args=(character_id,)
        )
        relationships = self._safe_call(
            self.character_engine, "get_relationships", default=[], args=(character_id,)
        )
        return CharacterContext(character=character, relationships=relationships)

    def get_identity_context(self) -> IdentityContext:
        identity_state = self._safe_call(self.identity_engine, "get_identity_state", default={})
        persona_state = self._safe_call(self.persona_engine, "get_persona_state", default={})
        return IdentityContext(identity=identity_state, persona=persona_state)

    def get_continuity_state(self) -> ContinuityContext:
        canonical = self._safe_call(self.continuity_engine, "get_canonical_facts", default=[])
        conflicts = self._safe_call(self.continuity_engine, "get_conflicts", default=[])
        return ContinuityContext(canonical=canonical, conflicts=conflicts)

    def get_saga_context(self) -> Dict[str, Any]:
        saga = self._safe_call(self.saga_engine, "get_saga", default={})
        return saga or {}

    def get_arc_context(self) -> TimelineContext:
        arcs = self._safe_call(self.arc_engine, "get_arcs", default=[])
        season = self._safe_call(self.season_engine, "get_current_season", default={})
        events = self._safe_call(self.timeline_engine, "list_events", default=[])
        return TimelineContext(events=events, arcs=arcs, season=season)

    def get_autopilot_context(self) -> AutopilotContext:
        daily = self._safe_call(self.autopilot_engine, "get_daily_signals", default={})
        weekly = self._safe_call(self.autopilot_engine, "get_weekly_signals", default={})
        momentum = self._safe_call(self.task_engine, "get_momentum", default={})
        return AutopilotContext(daily=daily, weekly=weekly, momentum=momentum)

    def get_fabric_neighbors(self, memory_id: str) -> FabricNeighborhood:
        neighbors: List[Dict[str, Any]] = []
        if hasattr(self.memory_fabric, "neighbors"):
            neighbors = [self._node_to_dict(node) for node in self.memory_fabric.neighbors(memory_id)]
        return FabricNeighborhood(memory_id=memory_id, neighbors=neighbors)

    def get_hqi_search_results(self, query: str) -> HQIResultSchema:
        results: Iterable[Any] = []
        if hasattr(self.hqi_engine, "search_by_text"):
            results = self.hqi_engine.search_by_text(query)
        elif hasattr(self.hqi_engine, "search"):
            results = self.hqi_engine.search(query)
        normalized = [self._result_to_dict(result) for result in results]
        return HQIResultSchema(query=query, results=normalized)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _safe_call(
        self, engine: Any, method: str, default: Any, args: Optional[tuple] = None
    ) -> Any:
        if engine is None:
            return default
        func = getattr(engine, method, None)
        if not callable(func):
            return default
        args = args or tuple()
        try:
            return func(*args)
        except Exception:
            return default

    def _node_to_dict(self, node: Any) -> Dict[str, Any]:
        if hasattr(node, "__dict__"):
            return dict(node.__dict__)
        if isinstance(node, dict):
            return node
        return {"value": node}

    def _result_to_dict(self, result: Any) -> Dict[str, Any]:
        if isinstance(result, dict):
            return result
        if hasattr(result, "__dict__"):
            return dict(result.__dict__)
        return {"result": result}
