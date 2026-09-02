"""Pointer target + on-screen clamp. Shift only the overflowing axis."""

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


def clamp_axis(value: float, low: float, high: float) -> float:
    """Keep value if it fits; otherwise the nearest in-range point. Never jump to mid."""
    if low > high:
        return (low + high) / 2
    if value < low:
        return low
    if value > high:
        return high
    return value


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
    r = radius + pad
    return (
        clamp_axis(x, left + r, right - r),
        clamp_axis(y, top + r, bottom - r),
    )


def screen_center(left: float, top: float, right: float, bottom: float) -> tuple[float, float]:
    return (left + right) / 2, (top + bottom) / 2
