"""Static ring layout: inner 8, then +4 per orbit (12, 16, 20)."""

from __future__ import annotations

import math

INNER_RING_SLOTS = 8
RING_SLOT_STEP = 4
MIN_CAPACITY = 8
MAX_CAPACITY = 56
DEFAULT_CAPACITY = 20


def slots_on_ring(ring: int) -> int:
    return INNER_RING_SLOTS + RING_SLOT_STEP * max(0, ring)


def start_index_of_ring(ring: int) -> int:
    n = max(0, ring)
    return 2 * n * (n + 3)


def ring_count_for(length: int) -> int:
    if length <= 0:
        return 1
    ring = 0
    filled = 0
    while filled < length:
        filled += slots_on_ring(ring)
        ring += 1
    return ring


def locate(index: int) -> tuple[int, int, int]:
    remaining = max(0, index)
    ring = 0
    while True:
        slots = slots_on_ring(ring)
        if remaining < slots:
            return ring, remaining, slots
        remaining -= slots
        ring += 1


def hit_index_at(
    dx: float,
    dy: float,
    item_count: int,
    inner: float,
    thick: float,
    gap: float,
) -> int | None:
    if item_count <= 0:
        return None
    dist = math.hypot(dx, dy)
    rings = ring_count_for(item_count)
    for r in range(rings):
        outer = inner + thick + r * (thick + gap)
        inner_r = outer - thick
        if dist < inner_r or dist > outer:
            continue
        slots = slots_on_ring(r)
        from_north = math.atan2(dx, -dy)
        if from_north < 0:
            from_north += math.pi * 2
        step = (math.pi * 2) / slots
        slot = int(((from_north + step / 2) % (math.pi * 2)) / step) % slots
        index = start_index_of_ring(r) + slot
        return index if index < item_count else None
    return None


def index_from_digit(key: str) -> int | None:
    if len(key) != 1 or key < "0" or key > "9":
        return None
    if key == "0":
        return 9
    return int(key) - 1


def badge_for_index(index: int) -> str:
    if 0 <= index <= 8:
        return str(index + 1)
    if index == 9:
        return "0"
    return str(index + 1)


def format_age(age_s: float) -> str:
    s = max(0, int(age_s))
    if s < 60:
        return f"{s}s"
    m = s // 60
    if m < 60:
        return f"{m}m"
    h = m // 60
    if h < 24:
        return f"{h}h"
    return f"{h // 24}d"


def format_kib(text: str) -> str:
    kib = len(text.encode("utf-8")) / 1024
    if kib < 0.01:
        return f"{kib:.3f} KiB"
    if kib < 10:
        return f"{kib:.2f} KiB"
    if kib < 100:
        return f"{kib:.1f} KiB"
    return f"{round(kib)} KiB"


def preview(text: str, n: int = 128) -> str:
    normalized = " ".join(text.split())
    return normalized if len(normalized) <= n else normalized[:n]
