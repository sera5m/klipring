"""Put the clip on the system clipboard and emit a real Ctrl+V to the focused app."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path


def set_clipboard_qt(text: str) -> None:
    from PySide6.QtGui import QGuiApplication

    QGuiApplication.clipboard().setText(text)
    try:
        subprocess.run(["wl-copy"], input=text.encode("utf-8"), check=False, timeout=1)
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        pass


def send_ctrl_v() -> bool:
    env = os.environ.get("XDG_SESSION_TYPE", "").lower()
    if shutil.which("wtype"):
        r = subprocess.run(
            ["wtype", "-M", "ctrl", "v", "-m", "ctrl"],
            check=False,
            timeout=2,
        )
        return r.returncode == 0
    if shutil.which("ydotool"):
        r = subprocess.run(
            ["ydotool", "key", "29:1", "47:1", "47:0", "29:0"],
            check=False,
            timeout=2,
        )
        return r.returncode == 0
    if env != "wayland" and shutil.which("xdotool"):
        r = subprocess.run(["xdotool", "key", "--clearmodifiers", "ctrl+v"], check=False, timeout=2)
        return r.returncode == 0
    return False


def open_in_editor(text: str, name: str = "clip.txt") -> None:
    tmp = Path(tempfile.gettempdir()) / "klipring"
    tmp.mkdir(parents=True, exist_ok=True)
    path = tmp / name
    path.write_text(text, encoding="utf-8")
    for cmd in (("kate", "--", str(path)), ("xdg-open", str(path))):
        if shutil.which(cmd[0]):
            subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return


def save_to_file(text: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text, encoding="utf-8")
