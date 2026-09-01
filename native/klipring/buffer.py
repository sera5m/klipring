"""
struct ClipboardItem { uint32_t age_s; std::string text; };
std::array<ClipboardItem, N> buffer;  // most-recent at [0]
"""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path

from .geometry import DEFAULT_CAPACITY, MAX_CAPACITY, MIN_CAPACITY


@dataclass
class ClipboardItem:
    text: str
    copied_at: float  # epoch seconds


class ClipboardBuffer:
    def __init__(self, path: Path, capacity: int = DEFAULT_CAPACITY) -> None:
        self.path = path
        self.capacity = _clamp_capacity(capacity)
        self.ignore_identical = True
        self.items: list[ClipboardItem] = []
        self._mute = False

    def mute(self, on: bool = True) -> None:
        self._mute = on

    def push(self, text: str) -> ClipboardItem | None:
        if self._mute:
            return None
        text = text or ""
        if not text:
            return None
        if self.ignore_identical and self.items and self.items[0].text == text:
            self.items[0].copied_at = time.time()
            self.save()
            return self.items[0]
        item = ClipboardItem(text=text, copied_at=time.time())
        self.items.insert(0, item)
        self.items = self.items[: self.capacity]
        self.save()
        return item

    def remove_at(self, index: int) -> int:
        if 0 <= index < len(self.items):
            del self.items[index]
            self.save()
        if not self.items:
            return 0
        return min(index, len(self.items) - 1)

    def set_capacity(self, n: int) -> None:
        self.capacity = _clamp_capacity(n)
        self.items = self.items[: self.capacity]
        self.save()

    def clear(self) -> None:
        self.items = []
        self.save()

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "capacity": self.capacity,
            "ignore_identical": self.ignore_identical,
            "items": [asdict(i) for i in self.items],
        }
        self.path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def load(self) -> None:
        if not self.path.exists():
            return
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return
        self.capacity = _clamp_capacity(int(data.get("capacity", self.capacity)))
        self.ignore_identical = bool(data.get("ignore_identical", True))
        items = []
        for raw in data.get("items", []):
            text = str(raw.get("text", ""))
            if not text:
                continue
            items.append(
                ClipboardItem(text=text, copied_at=float(raw.get("copied_at", time.time())))
            )
        self.items = items[: self.capacity]


def _clamp_capacity(n: int) -> int:
    return max(MIN_CAPACITY, min(MAX_CAPACITY, int(n)))
