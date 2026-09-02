"""Pointer target + on-screen clamp. Multi-monitor / pointer-lock safe."""

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
    min_x = left + r
    max_x = right - r
    min_y = top + r
    max_y = bottom - r
    if min_x > max_x:
        cx = (left + right) / 2
    else:
        cx = min(max(x, min_x), max_x)
    if min_y > max_y:
        cy = (top + bottom) / 2
    else:
        cy = min(max(y, min_y), max_y)
    return cx, cy


def screen_center(left: float, top: float, right: float, bottom: float) -> tuple[float, float]:
    return (left + right) / 2, (top + bottom) / 2
