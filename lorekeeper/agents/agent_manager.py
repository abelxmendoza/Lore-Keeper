from __future__ import annotations

"""Common agent interfaces for LoreKeeper."""

from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseAgent(ABC):
    """Minimal abstract base agent."""

    name: str
    description: str

    @abstractmethod
    def run(self, *args: Any, **kwargs: Any) -> Dict[str, Any]:
        """Execute the agent and return a structured response."""
        raise NotImplementedError
