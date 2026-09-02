"""Focused window + pointer, via KWin/kdotool when Qt is lying."""

from __future__ import annotations

import re
import shutil
import subprocess

from PySide6.QtCore import QPoint
from PySide6.QtGui import QCursor

TERMINALS = (
    "konsole",
    "org.kde.konsole",
    "yakuake",
    "kitty",
    "alacritty",
    "wezterm",
    "foot",
    "terminator",
    "tilix",
    "xfce4-terminal",
    "gnome-terminal",
    "kgx",
    "ptyxis",
    "xterm",
    "urxvt",
    "rxvt",
    "qterminal",
    "ghostty",
    "contour",
    "blackbox",
    "hyper",
)


def focused_window() -> str:
    for fn in (_kdotool, _kwin_query, _kwin_active_output):
        name = fn()
        if name:
            return name
    return "unknown window (KWin didn't say)"


def active_window_id() -> str:
    return _cmd(["kdotool", "getactivewindow"])


def is_terminal(label: str) -> bool:
    blob = (label or "").lower()
    return any(t in blob for t in TERMINALS)


def mouse_location(fallback: QPoint | None = None) -> QPoint:
    raw = _cmd(["kdotool", "getmouselocation"])
    parsed = _parse_xy(raw)
    if parsed is not None:
        return parsed
    if fallback is not None and (fallback.x() > 0 or fallback.y() > 0):
        return QPoint(fallback)
    return QCursor.pos()


def activate_window(window_id: str) -> bool:
    if not window_id:
        return False
    out = _cmd(["kdotool", "windowactivate", window_id])
    return True if window_id else bool(out) or True


def restore_pointer(pos: QPoint) -> str:
    QCursor.setPos(pos)
    if shutil.which("kdotool"):
        _cmd(["kdotool", "mousemove", str(pos.x()), str(pos.y())])
        _cmd(["kdotool", "mousemove", "--sync", str(pos.x()), str(pos.y())])
    if shutil.which("ydotool"):
        for args in (
            ["ydotool", "mousemove", "--absolute", str(pos.x()), str(pos.y())],
            ["ydotool", "mousemove", "-a", str(pos.x()), str(pos.y())],
        ):
            try:
                r = subprocess.run(args, check=False, timeout=1, capture_output=True)
                if r.returncode == 0:
                    return "warp"
            except (OSError, subprocess.TimeoutExpired):
                pass
    return "qt"


def _parse_xy(raw: str) -> QPoint | None:
    if not raw:
        return None
    m = re.search(r"x[:\s=]+(-?\d+)\D+y[:\s=]+(-?\d+)", raw, re.I)
    if m:
        return QPoint(int(m.group(1)), int(m.group(2)))
    nums = re.findall(r"-?\d+", raw)
    if len(nums) >= 2:
        return QPoint(int(nums[0]), int(nums[1]))
    return None


def _cmd(args: list[str]) -> str:
    if not shutil.which(args[0]):
        return ""
    try:
        r = subprocess.run(args, capture_output=True, timeout=0.4, check=False)
    except (OSError, subprocess.TimeoutExpired):
        return ""
    return (r.stdout or b"").decode("utf-8", "replace").strip()


def _kdotool() -> str:
    title = _cmd(["kdotool", "getactivewindow", "getwindowname"])
    klass = _cmd(["kdotool", "getactivewindow", "getwindowclassname"])
    if title and klass:
        return f"{title} ({klass})"
    return title or klass


def _kwin_query() -> str:
    raw = _cmd(["qdbus6", "org.kde.KWin", "/KWin", "org.kde.KWin.queryWindowInfo"])
    if not raw:
        raw = _cmd(["qdbus", "org.kde.KWin", "/KWin", "org.kde.KWin.queryWindowInfo"])
    if not raw:
        return ""
    caption = resource = ""
    for line in raw.splitlines():
        lower = line.lower()
        if "caption" in lower and ":" in line:
            caption = line.split(":", 1)[-1].strip()
        if "resourceclass" in lower.replace(" ", "") and ":" in line:
            resource = line.split(":", 1)[-1].strip()
    if caption and resource:
        return f"{caption} ({resource})"
    return caption or resource


def _kwin_active_output() -> str:
    out = _cmd(["qdbus6", "org.kde.KWin", "/KWin", "org.kde.KWin.activeOutputName"])
    if not out:
        out = _cmd(["qdbus", "org.kde.KWin", "/KWin", "org.kde.KWin.activeOutputName"])
    return f"output {out}" if out else ""
