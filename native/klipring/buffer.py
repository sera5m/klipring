"""
struct ClipboardItem { uint32_t age_s; std::string text; std::string kind; };
std::array<ClipboardItem, N> buffer;  // most-recent at [0]
"""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path

from .geometry import DEFAULT_CAPACITY, MAX_CAPACITY, MIN_CAPACITY

Kind = str  # text | file | directory | files


@dataclass
class ClipboardItem:
    text: str
    copied_at: float
    kind: Kind = "text"
    uris: list[str] = field(default_factory=list)
    signature: str = ""


class ClipboardBuffer:
    def __init__(self, path: Path, capacity: int = DEFAULT_CAPACITY) -> None:
        self.path = path
        self.capacity = _clamp_capacity(capacity)
        self.ignore_identical = True
        self.items: list[ClipboardItem] = []
        self._mute = False

    def mute(self, on: bool = True) -> None:
        self._mute = on

    def push_item(self, item: ClipboardItem) -> ClipboardItem | None:
        if self._mute:
            return None
        if not item.text and not item.uris:
            return None
        if not item.signature:
            item.signature = item.kind + ":" + (item.uris[0] if item.uris else item.text)
        if self.ignore_identical and self.items and self.items[0].signature == item.signature:
            self.items[0].copied_at = time.time()
            self.save()
            return self.items[0]
        self.items.insert(0, item)
        self.items = self.items[: self.capacity]
        self.save()
        return item

    def push(self, text: str) -> ClipboardItem | None:
        text = text or ""
        if not text:
            return None
        return self.push_item(
            ClipboardItem(text=text, copied_at=time.time(), kind="text", signature="text:" + text)
        )

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
        self.path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
        slots = self.path.parent / "slots"
        slots.mkdir(parents=True, exist_ok=True)
        for old in slots.iterdir():
            if old.is_file():
                old.unlink()
        for i, item in enumerate(self.items, 1):
            (slots / str(i)).write_text(item.text, encoding="utf-8")

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
            uris = [str(u) for u in raw.get("uris", []) if u]
            if not text and not uris:
                continue
            kind = str(raw.get("kind", "text") or "text")
            items.append(
                ClipboardItem(
                    text=text or "\n".join(uris),
                    copied_at=float(raw.get("copied_at", time.time())),
                    kind=kind,
                    uris=uris,
                    signature=str(raw.get("signature") or f"{kind}:{text[:80]}"),
                )
            )
        self.items = items[: self.capacity]


def _clamp_capacity(n: int) -> int:
    return max(MIN_CAPACITY, min(MAX_CAPACITY, int(n)))
