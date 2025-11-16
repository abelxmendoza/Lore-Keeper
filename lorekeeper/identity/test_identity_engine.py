"""Tests for IdentityEngine and template rendering."""
from __future__ import annotations

import unittest

from ..event_schema import TimelineEvent
from .identity_engine import IdentityEngine
from .identity_templates import render_json_export, render_markdown_profile, render_mobile_summary


class DummyTimelineManager:
    def __init__(self, events):
        self._events = events

    def get_events(self, **_kwargs):
        return list(self._events)


class IdentityEngineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.events = [
            TimelineEvent(
                date="2021-03-01",
                title="Built first bot",
                type="project",
                details="Jetson nano prototype",
                tags=["robotics", "build"],
                metadata={"sentiment": 0.2, "breakthrough": True},
            ),
            TimelineEvent(
                date="2021-08-10",
                title="Tournament grind",
                type="training",
                details="Hard prep",
                tags=["bjj", "grind"],
                metadata={"sentiment": 0.4},
            ),
            TimelineEvent(
                date="2022-01-05",
                title="Burnout wall",
                type="reflection",
                details="Needed a reset",
                tags=["burnout", "withdrawal"],
                metadata={"sentiment": -0.2},
            ),
            TimelineEvent(
                date="2022-07-15",
                title="Reset and rebuild",
                type="reflection",
                details="Back to discipline",
                tags=["reset", "discipline"],
                metadata={"sentiment": 0.1, "breakthrough": True},
            ),
            TimelineEvent(
                date="2023-02-20",
                title="Founded robotics lab",
                type="job_change",
                details="Built new company",
                tags=["founder", "robotics"],
                metadata={"sentiment": 0.8, "cooccurring_tags": ["ambition"]},
            ),
            TimelineEvent(
                date="2023-05-01",
                title="BJJ gold",
                type="fight",
                details="Won finals",
                tags=["win", "bjj"],
                metadata={"sentiment": 0.9},
            ),
        ]
        self.engine = IdentityEngine(
            saga_engine=None,
            timeline_manager=DummyTimelineManager(self.events),
            character_graph=None,
            tagdict={"robotics": ["discipline", "ambition"]},
        )

    def test_version_clustering(self) -> None:
        versions = self.engine.infer_identity_versions()
        self.assertGreaterEqual(len(versions), 2)
        labels = [v["label"] for v in versions]
        self.assertTrue(any(label.startswith("Robotics Reloaded") for label in labels))
        self.assertTrue(any(label.startswith("Reaper Genesis") for label in labels))

    def test_emotional_slope(self) -> None:
        emotions = self.engine.compute_emotional_slope()
        self.assertEqual(emotions["trend"], "rising")
        self.assertIn(emotions["stability"], {"stabilized", "turbulent"})
        self.assertAlmostEqual(emotions["ema"][0], 0.2, places=2)

    def test_shift_detection(self) -> None:
        shifts = self.engine.extract_shift_events()
        reasons = {shift["reason"] for shift in shifts}
        self.assertIn("job_change", ",".join(reasons))
        self.assertIn("fight", ",".join(reasons))

    def test_motif_extraction(self) -> None:
        motifs = self.engine.derive_core_motifs()
        self.assertIn("discipline", motifs)
        self.assertIn("robotics grind", motifs)

    def test_narrative_generation(self) -> None:
        versions = self.engine.infer_identity_versions()
        emotions = self.engine.compute_emotional_slope()
        shifts = self.engine.extract_shift_events()
        motifs = self.engine.derive_core_motifs()
        narrative = self.engine.build_identity_narrative(versions, emotions, shifts, motifs)
        self.assertIn("Identity Versions", narrative)
        self.assertIn("Emotional curve", narrative)

    def test_templates_render(self) -> None:
        versions = self.engine.infer_identity_versions()
        emotions = self.engine.compute_emotional_slope()
        behaviors = self.engine.detect_behavior_patterns()
        shifts = self.engine.extract_shift_events()
        motifs = self.engine.derive_core_motifs()

        markdown = render_markdown_profile(versions, emotions, behaviors, shifts, motifs, montage="clip")
        self.assertIn("Identity Profile", markdown)
        self.assertIn("Shift Events", markdown)

        mobile = render_mobile_summary(versions, emotions, motifs)
        self.assertIn("Core drives", mobile)

        json_export = render_json_export(versions, emotions, behaviors, shifts, motifs)
        self.assertIn("versions", json_export)
        self.assertIn("motifs", json_export)


if __name__ == "__main__":
    unittest.main()
