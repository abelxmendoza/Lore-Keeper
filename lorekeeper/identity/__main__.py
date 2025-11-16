"""CLI entrypoint for the IdentityEngine."""
from __future__ import annotations

from ..timeline_manager import TimelineManager
from .identity_engine import IdentityEngine
from .identity_templates import render_markdown_profile


def main() -> None:
    manager = TimelineManager()
    engine = IdentityEngine(saga_engine=None, timeline_manager=manager, character_graph=None, tagdict={})

    events = manager.get_events()
    versions = engine.infer_identity_versions(events)
    emotions = engine.compute_emotional_slope(events)
    behaviors = engine.detect_behavior_patterns(events)
    shifts = engine.extract_shift_events(events)
    motifs = engine.derive_core_motifs(events)

    montage = " | ".join(b.get("title", "") for b in shifts[:5]) if shifts else None
    profile = render_markdown_profile(versions, emotions, behaviors, shifts, motifs, montage=montage)
    print(profile)


if __name__ == "__main__":
    main()
