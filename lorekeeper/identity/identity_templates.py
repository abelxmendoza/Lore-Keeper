"""Templates for rendering identity profiles to different surfaces."""
from __future__ import annotations

import json
from typing import Dict, List, Optional


def render_markdown_profile(
    versions: List[Dict],
    emotions: Dict,
    behaviors: Dict,
    shifts: List[Dict],
    motifs: List[str],
    montage: Optional[str] = None,
) -> str:
    lines = ["# Identity Profile", ""]

    lines.append("## Identity Versions")
    if versions:
        for version in versions:
            lines.append(
                f"- **{version['label']}** ({version['start']}–{version['end']}): "
                f"themes {', '.join(version.get('dominant_tags', []))}; "
                f"activity {version.get('activity_level', 'moderate')}"
            )
    else:
        lines.append("- No versions detected yet.")

    lines.append("\n## Emotional Curve")
    lines.append(
        f"Trend: **{emotions.get('trend', 'stable')}**, stability: {emotions.get('stability', 'unknown')}"
    )

    lines.append("\n## Behavioral Patterns")
    for key, value in behaviors.items():
        if key == "evidence" or key == "top_tags":
            continue
        lines.append(f"- {key.replace('_', ' ').title()}: {'yes' if value else 'no'}")
    if behaviors.get("top_tags"):
        lines.append(f"Top tags: {', '.join(behaviors['top_tags'])}")

    lines.append("\n## Shift Events")
    if shifts:
        for shift in shifts:
            lines.append(f"- {shift['date']}: {shift['title']} ({shift['reason']})")
    else:
        lines.append("- No shift events detected.")

    lines.append("\n## Core Motivations")
    if motifs:
        lines.append("- " + ", ".join(motifs))
    else:
        lines.append("- Pending analysis")

    lines.append("\n## Identity Montage")
    if montage:
        lines.append(montage)
    else:
        lines.append("A fast-cut montage of major breakthroughs and resets.")

    return "\n".join(lines)


def render_mobile_summary(versions: List[Dict], emotions: Dict, motifs: List[str]) -> str:
    latest = versions[-1]["label"] if versions else "current self"
    line_one = (
        f"You are in **{latest}**, with an emotional trend {emotions.get('trend', 'stable')} "
        f"and stability {emotions.get('stability', 'unknown')}."
    )
    line_two = "Core drives: " + ", ".join(motifs or ["discipline", "resilience"])
    return f"{line_one}\n{line_two}"


def render_json_export(
    versions: List[Dict],
    emotions: Dict,
    behaviors: Dict,
    shifts: List[Dict],
    motifs: List[str],
) -> str:
    payload = {
        "versions": versions,
        "emotions": emotions,
        "behaviors": behaviors,
        "shifts": shifts,
        "motifs": motifs,
    }
    return json.dumps(payload, indent=2)
