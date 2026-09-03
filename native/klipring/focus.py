"""Focused window + pointer, via KWin/kdotool when Qt is lying."""

from __future__ import annotations

import os
import re
import shutil
import subprocess
from pathlib import Path

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


def is_self(label: str, window_id: str = "") -> bool:
    blob = f"{label} {window_id}".lower()
    return "klipring" in blob or "klip-ring" in blob


def pick_paste_target(history: list[tuple[str, str]]) -> tuple[str, str]:
    """Last non-self window, then the one before that. Never KlipRing."""
    for wid, name in reversed(history):
        if wid and not is_self(name, wid):
            return wid, name
    for wid, name in reversed(history):
        if name and not is_self(name, wid):
            return wid, name
    return "", ""


GAMES = (
    "steam",
    "gamescope",
    "wine",
    "lutris",
    "heroic",
    "minecraft",
    "unreal",
    "unity",
    "dota",
    "cs2",
    "hl2",
    "gamescope",
    "org.freedesktop.impl.portal",
)


def looks_exclusive(label: str, window_id: str = "") -> bool:
    """True for fullscreen / game-like surfaces we must not overlay."""
    blob = (label or "").lower()
    if any(g in blob for g in GAMES):
        return True
    geo = ""
    if window_id:
        geo = _cmd(["kdotool", "getwindowgeometry", window_id])
    if not geo:
        return False
    nums = [int(n) for n in re.findall(r"\d+", geo)]
    if len(nums) < 2:
        return False
    w, h = nums[-2], nums[-1]
    try:
        from PySide6.QtGui import QGuiApplication

        screen = QGuiApplication.primaryScreen()
        if screen is None:
            return False
        sg = screen.geometry()
        return w >= sg.width() - 8 and h >= sg.height() - 8
    except Exception:
        return w >= 1800 and h >= 1000


def mouse_location(fallback=None):
    from PySide6.QtCore import QPoint
    from PySide6.QtGui import QCursor

    qt = QCursor.pos()
    raw = _cmd(["kdotool", "getmouselocation", "--shell"]) or _cmd(["kdotool", "getmouselocation"])
    parsed = parse_xy(raw)
    if parsed is not None:
        pt = QPoint(parsed[0], parsed[1])
        if _looks_swapped(pt, qt):
            pt = qt
        if not _is_origin(pt):
            return pt
    if not _is_origin(qt):
        return qt
    if fallback is not None and not _is_origin(fallback):
        return QPoint(fallback)
    return qt if not _is_origin(qt) else (QPoint(fallback) if fallback is not None else qt)


def _is_origin(p: QPoint) -> bool:
    return p.x() == 0 and p.y() == 0


def _looks_swapped(a: QPoint, b: QPoint) -> bool:
    return a.x() == b.y() and a.y() == b.x() and a.x() != a.y() and abs(a.x()) > 8


def activate_window(window_id: str) -> bool:
    if not window_id or is_self(window_id):
        return False
    _cmd(["kdotool", "windowactivate", window_id])
    _cmd(["kdotool", "windowactivate", "--sync", window_id])
    return True


def move_owned_window(token: str, x: int, y: int, cached_id: str = "") -> str:
    """Move the window whose title is exactly `token`. Never search by class.

    Returns the verified id to cache, or "" if nothing was moved.
    """
    exe = _resolve("kdotool")
    if not exe or not token:
        return ""
    wid = cached_id.strip()
    if wid and _window_title(exe, wid) != token:
        wid = ""
    if not wid:
        wid = _find_id_by_exact_title(exe, token)
    if not wid:
        return ""
    if _window_title(exe, wid) != token:
        return ""
    active = _cmd([exe, "getactivewindow"], timeout=0.8)
    if active and active == wid and _window_title(exe, active) != token:
        return ""
    _cmd([exe, "windowmove", wid, str(int(x)), str(int(y))], timeout=1.0)
    if _window_title(exe, wid) != token:
        return ""
    return wid


def _window_title(exe: str, wid: str) -> str:
    return _cmd([exe, "getwindowname", wid], timeout=0.8)


def _find_id_by_exact_title(exe: str, token: str) -> str:
    pattern = f"^{re.escape(token)}$"
    blob = _cmd([exe, "search", "--name", pattern], timeout=1.0)
    for cand in blob.split():
        if cand and _window_title(exe, cand) == token:
            return cand
    return ""


def parse_xy(raw: str) -> tuple[int, int] | None:
    """Read labeled x/y only. Never assume the first two numbers (kdotool may print Y first)."""
    if not raw:
        return None
    xm = re.search(r"(?:^|[\s,;])x[:\s=]+(-?\d+)", raw, re.I | re.M)
    ym = re.search(r"(?:^|[\s,;])y[:\s=]+(-?\d+)", raw, re.I | re.M)
    if xm and ym:
        return int(xm.group(1)), int(ym.group(1))
    xm = re.search(r"^X=([-\d]+)\s*$", raw, re.M)
    ym = re.search(r"^Y=([-\d]+)\s*$", raw, re.M)
    if xm and ym:
        return int(xm.group(1)), int(ym.group(1))
    return None


def _resolve(name: str) -> str:
    found = shutil.which(name)
    if found:
        return found
    extra = os.environ.get("PATH", "")
    for folder in (
        "/usr/bin",
        "/usr/local/bin",
        str(Path.home() / ".local" / "bin"),
        str(Path.home() / ".cargo" / "bin"),
    ):
        cand = Path(folder) / name
        if cand.is_file() and os.access(cand, os.X_OK):
            return str(cand)
        if folder not in extra:
            hit = shutil.which(name, path=folder)
            if hit:
                return hit
    return ""


def _cmd(args: list[str], timeout: float = 0.6) -> str:
    exe = _resolve(args[0]) if args else ""
    if not exe:
        return ""
    try:
        r = subprocess.run(
            [exe, *args[1:]], capture_output=True, timeout=timeout, check=False
        )
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
