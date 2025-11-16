"""Identity arc extraction engine.

The IdentityEngine synthesizes long-term patterns from the timeline: recurring
behavior loops, emotional trajectories, and the named "versions" the user has
developed across eras. It is intentionally deterministic so that tests can
cover the heuristics even when upstream data changes.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional

from ..event_schema import TimelineEvent


@dataclass
class VersionSlice:
    label: str
    start: str
    end: str
    dominant_tags: List[str]
    sentiment_window: float
    activity_level: str
    breakthroughs: List[str]


def _ema(values: List[float], alpha: float = 0.35) -> List[float]:
    if not values:
        return []
    smoothed = [values[0]]
    for val in values[1:]:
        prev = smoothed[-1]
        smoothed.append(alpha * val + (1 - alpha) * prev)
    return smoothed


class IdentityEngine:
    def __init__(self, saga_engine, timeline_manager, character_graph, tagdict):
        self.saga_engine = saga_engine
        self.timeline_manager = timeline_manager
        self.character_graph = character_graph
        self.tagdict = tagdict or {}

    # Utilities
    def _sentiment_for_event(self, event: TimelineEvent) -> float:
        metadata = event.metadata or {}
        sentiment = metadata.get("sentiment")
        if sentiment is None:
            sentiment = metadata.get("score")
        try:
            return float(sentiment)
        except (TypeError, ValueError):
            return 0.0

    def _load_events(self, events: Optional[Iterable[TimelineEvent]] = None) -> List[TimelineEvent]:
        if events is not None:
            loaded = list(events)
        elif self.timeline_manager:
            loaded = list(self.timeline_manager.get_events())
        else:
            loaded = []
        return sorted(loaded, key=lambda e: e.date)

    def _dominant_theme(self, tag_counter: Counter) -> str:
        priority = [
            ("robotics", {"robotics", "jetson", "ai", "ml"}),
            ("martial", {"bjj", "martial_arts", "fight", "sparring", "karate"}),
            ("founder", {"startup", "founder", "company", "pitch"}),
            ("reaper", {"burnout", "reset", "rebuild", "dark"}),
            ("family", {"family", "brother", "sister", "parents"}),
        ]
        for theme, keys in priority:
            if any(tag_counter.get(tag, 0) > 0 for tag in keys):
                return theme
        if not tag_counter:
            return "core"
        return tag_counter.most_common(1)[0][0]

    def _label_for_theme(self, theme: str, index: int) -> str:
        names = {
            "reaper": "Reaper Genesis",
            "robotics": "Robotics Reloaded",
            "martial": "Shinigami Ascension",
            "founder": "Founder Arc",
            "family": "Family Anchor",
        }
        base = names.get(theme, f"{theme.title()} Arc")
        return f"{base} v{index}"

    # Public surface
    def infer_identity_versions(self, events: Optional[Iterable[TimelineEvent]] = None) -> List[Dict]:
        events = self._load_events(events)
        if not events:
            return []

        # Group by year for stability
        grouped: Dict[str, List[TimelineEvent]] = defaultdict(list)
        for event in events:
            year = event.date[:4]
            grouped[year].append(event)

        years = sorted(grouped.keys())
        activity_counts = [len(grouped[year]) for year in years]
        median_activity = sorted(activity_counts)[len(activity_counts) // 2]

        versions: List[Dict] = []
        prev_theme = None
        prev_sentiment = None
        index = 1

        for year in years:
            year_events = grouped[year]
            tag_counter: Counter = Counter()
            sentiments: List[float] = []
            breakthroughs: List[str] = []

            for event in year_events:
                tag_counter.update(tag.lower() for tag in event.tags)
                sentiments.append(self._sentiment_for_event(event))
                if event.metadata and event.metadata.get("breakthrough"):
                    breakthroughs.append(event.title or event.details)
                if "breakthrough" in [t.lower() for t in event.tags]:
                    breakthroughs.append(event.title or event.details)

            theme = self._dominant_theme(tag_counter)
            smoothed = _ema(sentiments) if sentiments else [0.0]
            sentiment_window = smoothed[-1]
            sentiment_change = 0.0 if prev_sentiment is None else sentiment_window - prev_sentiment

            activity_level = "moderate"
            if len(year_events) > median_activity + 1:
                activity_level = "high"
            elif len(year_events) < max(1, median_activity - 1):
                activity_level = "low"

            needs_new_version = False
            if prev_theme is None or theme != prev_theme:
                needs_new_version = True
            if abs(sentiment_change) > 0.45:
                needs_new_version = True
            if any(tag_counter.get(tag, 0) > 0 for tag in ("burnout", "rebuild")):
                needs_new_version = True

            if needs_new_version:
                label = self._label_for_theme(theme, index)
                versions.append(
                    {
                        "label": label,
                        "start": year,
                        "end": year,
                        "dominant_tags": [t for t, _ in tag_counter.most_common(3)],
                        "sentiment": sentiment_window,
                        "activity_level": activity_level,
                        "breakthroughs": breakthroughs,
                    }
                )
                index += 1
            else:
                current = versions[-1]
                current["end"] = year
                merged_tags = Counter(current.get("dominant_tags", [])) + tag_counter
                current["dominant_tags"] = [t for t, _ in merged_tags.most_common(3)]
                current.setdefault("breakthroughs", []).extend(breakthroughs)
                current["sentiment"] = (current.get("sentiment", 0.0) + sentiment_window) / 2
                current["activity_level"] = activity_level or current.get("activity_level", "moderate")

            prev_theme = theme
            prev_sentiment = sentiment_window

        return versions

    def compute_emotional_slope(self, events: Optional[Iterable[TimelineEvent]] = None) -> Dict:
        events = self._load_events(events)
        if not events:
            return {
                "overall_slope": 0.0,
                "trend": "stable",
                "ema": [],
                "stability": "unknown",
            }

        sentiments = [_ema([self._sentiment_for_event(e)])[0] for e in events]
        ema_series = _ema(sentiments, alpha=0.4)
        slope = ema_series[-1] - ema_series[0]
        trend = "rising" if slope > 0.1 else "falling" if slope < -0.1 else "stable"
        volatility = max(ema_series) - min(ema_series) if ema_series else 0.0
        stability = "stabilized" if volatility < 0.35 else "turbulent"

        return {
            "overall_slope": slope,
            "trend": trend,
            "ema": ema_series,
            "stability": stability,
        }

    def detect_behavior_patterns(self, events: Optional[Iterable[TimelineEvent]] = None) -> Dict:
        events = self._load_events(events)
        tag_counter: Counter = Counter()
        streaks = defaultdict(int)

        for event in events:
            lowered = [t.lower() for t in event.tags]
            tag_counter.update(lowered)
            if any(tag in {"burnout", "rest"} for tag in lowered):
                streaks["reset"] += 1
            if any(tag in {"bjj", "martial_arts", "fight"} for tag in lowered):
                streaks["fight_training"] += 1
            if any(tag in {"robotics", "coding", "build"} for tag in lowered):
                streaks["robotics"] += 1
            if any(tag in {"grind", "focus", "deep_work"} for tag in lowered):
                streaks["grind"] += 1
            if any(tag in {"withdrawal", "solitude", "hermit"} for tag in lowered):
                streaks["withdrawal"] += 1

        patterns = {
            "grind_cycles": streaks.get("grind", 0) >= 2,
            "social_withdrawal": streaks.get("withdrawal", 0) >= 1,
            "fight_training_arcs": streaks.get("fight_training", 0) >= 2,
            "robotics_bursts": streaks.get("robotics", 0) >= 2,
            "burnout_reset_loops": streaks.get("reset", 0) >= 2,
        }
        patterns["evidence"] = dict(streaks)
        patterns["top_tags"] = [t for t, _ in tag_counter.most_common(5)]
        return patterns

    def extract_shift_events(self, events: Optional[Iterable[TimelineEvent]] = None) -> List[Dict]:
        events = self._load_events(events)
        shift_keywords = {
            "job_change": {"job", "promotion", "fired", "career", "role"},
            "relationship": {"relationship", "breakup", "marriage"},
            "fight": {"fight", "tournament", "competition"},
            "win": {"win", "victory", "award"},
            "failure": {"failure", "loss", "setback"},
            "obsession": {"robotics", "jetson", "obsession", "bjj"},
            "relocation": {"moved", "relocation", "city"},
            "philosophy": {"philosophy", "realization", "breakthrough"},
            "betrayal": {"betrayal", "conflict"},
        }

        shift_events: List[Dict] = []
        for event in events:
            lowered_tags = {t.lower() for t in event.tags}
            text = f"{event.title} {event.details}".lower()
            event_type = (event.type or "").lower()
            reasons = []
            for reason, keywords in shift_keywords.items():
                if (
                    event_type == reason
                    or lowered_tags.intersection(keywords)
                    or any(word in text for word in keywords)
                ):
                    reasons.append(reason)
            if reasons:
                shift_events.append(
                    {
                        "date": event.date,
                        "title": event.title,
                        "reason": ",".join(sorted(set(reasons))),
                        "weight": len(reasons),
                    }
                )
        return shift_events

    def derive_core_motifs(self, events: Optional[Iterable[TimelineEvent]] = None) -> List[str]:
        events = self._load_events(events)
        tag_counter: Counter = Counter()
        for event in events:
            tag_counter.update(tag.lower() for tag in event.tags)
            if event.metadata and "cooccurring_tags" in event.metadata:
                tag_counter.update(tag.lower() for tag in event.metadata.get("cooccurring_tags", []))
        for tag, companions in self.tagdict.items():
            tag_counter.update(companions)

        motifs_bank = [
            "discipline",
            "ambition",
            "resilience",
            "family",
            "robotics grind",
            "transformation",
            "honor",
            "self-reinvention",
        ]

        scored = []
        for motif in motifs_bank:
            keywords = motif.split()
            score = sum(tag_counter.get(word, 0) for word in keywords)
            scored.append((score, motif))
        scored.sort(reverse=True)
        return [motif for score, motif in scored if score > 0][:6] or motifs_bank[:3]

    def build_identity_narrative(self, versions, emotions, shifts, motifs) -> str:
        lines = ["Identity Narrative"]
        lines.append("Identity Versions:")
        if versions:
            for version in versions:
                lines.append(
                    f"- {version['label']} ({version['start']}–{version['end']}), sentiment {version['sentiment']:.2f}"
                )
        else:
            lines.append("- No recorded versions yet.")

        lines.append("")
        lines.append(
            f"Emotional curve: {emotions.get('trend', 'stable')} (slope {emotions.get('overall_slope', 0):.2f}),"
            f" {emotions.get('stability', 'unknown')}"
        )
        if shifts:
            lines.append("Shift events:")
            for shift in shifts:
                lines.append(f"- {shift['date']}: {shift['title']} [{shift['reason']}]")
        if motifs:
            lines.append("Core motivations: " + ", ".join(motifs))
        return "\n".join(lines)
