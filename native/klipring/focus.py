"""Best-effort name of the focused window on Plasma/KWin."""

from __future__ import annotations

import shutil
import subprocess


def focused_window() -> str:
    for fn in (_kdotool, _kwin_query, _kwin_active_output):
        name = fn()
        if name:
            return name
    return "unknown window (KWin didn't say)"


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
