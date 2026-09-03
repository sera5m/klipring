"""DBus ping to the tray daemon. No Qt — Ctrl+V must not spawn a GUI."""

from __future__ import annotations

import shutil
import subprocess

APP_ID = "org.klipring.App"


def ping_show() -> bool:
    for exe in ("qdbus6", "qdbus"):
        if not shutil.which(exe):
            continue
        try:
            r = subprocess.run(
                [exe, APP_ID, "/App", "Show"],
                capture_output=True,
                timeout=3,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired):
            continue
        if r.returncode == 0:
            return True
    return False
