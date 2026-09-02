"""Snap the wheel to the mouse; nudge only by how much the disk would clip."""

from __future__ import annotations

import math


def looks_captured(x: int, y: int, last_x: int, last_y: int) -> bool:
    """True when the compositor reports a bogus 0,0 (or teleport) under pointer lock."""
    dist = math.hypot(x - last_x, y - last_y)
    if x == 0 and y == 0 and dist > 96:
        return True
    if dist > 2400:
        return True
    return False


def shift_for_extent(mouse: float, low: float, high: float, radius: float) -> float:
    """Move mouse along one axis so [mouse-radius, mouse+radius] stays in [low, high].

    shift = radius - remaining_pixels on a short edge (0 if there is room).
    If both edges are short (disk wider than the screen), the two shifts
    cancel toward the mid-point — still the minimum total clip.
    """
    remain_before = mouse - low
    remain_after = high - mouse
    if remain_before >= radius and remain_after >= radius:
        return mouse
    if (high - low) < 2 * radius:
        return (low + high) / 2
    if remain_before < radius:
        return mouse + (radius - remain_before)
    return mouse - (radius - remain_after)


def clamp_origin(
    x: float,
    y: float,
    left: float,
    top: float,
    right: float,
    bottom: float,
    radius: float,
    pad: float = 18,
) -> tuple[float, float]:
    extent = radius + pad
    return (
        shift_for_extent(x, left, right, extent),
        shift_for_extent(y, top, bottom, extent),
    )


def screen_center(left: float, top: float, right: float, bottom: float) -> tuple[float, float]:
    return (left + right) / 2, (top + bottom) / 2
