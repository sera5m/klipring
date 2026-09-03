"""Ctrl+V is a KWin command shortcut that *pings* the tray daemon.

The daemon (klipring) stays in the tray and watches the clipboard.
The shortcut runs `klipring --show`, which is a DBus Show() with no Qt window.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

DESKTOP_ID = "klipring-show.desktop"
FRIENDLY = "KlipRing"
DEFAULT_CHORD = "Ctrl+V"
ALT_CHORD = "Meta+Shift+V"

_DESKTOP_BODY = """[Desktop Entry]
Type=Application
Name=KlipRing
Comment=Show the KlipRing clipboard pie
Exec=klipring --show
Icon=klipring
Terminal=false
NoDisplay=true
StartupNotify=false
X-KDE-GlobalAccel-CommandShortcut=true
X-KDE-Shortcuts={chord}
Actions=Show;

[Desktop Action Show]
Name=Show KlipRing
Exec=klipring --show
"""


def bind_shortcut(chord: str = DEFAULT_CHORD) -> str:
    """Write user-level KGlobalAccel entries and ask Plasma to reload them."""
    apps = Path.home() / ".local/share/applications"
    apps.mkdir(parents=True, exist_ok=True)
    desktop = apps / DESKTOP_ID
    desktop.write_text(_DESKTOP_BODY.format(chord=chord), encoding="utf-8")

    _kwrite(["--group", DESKTOP_ID, "--key", "_k_friendly_name", FRIENDLY])
    _kwrite(["--group", DESKTOP_ID, "--key", "_launch", f"{chord},none,Show KlipRing"])
    # Plasma 6 also reads nested [services][id] groups
    _kwrite(
        [
            "--group",
            "services",
            "--group",
            DESKTOP_ID,
            "--key",
            "_launch",
            f"{chord},none,Show KlipRing",
        ]
    )

    for cmd in (
        ["kbuildsycoca6"],
        ["qdbus6", "org.kde.kglobalaccel", "/kglobalaccel", "org.kde.KGlobalAccel.reloadConfig"],
        ["qdbus", "org.kde.kglobalaccel", "/kglobalaccel", "org.kde.KGlobalAccel.reloadConfig"],
    ):
        if shutil.which(cmd[0]):
            subprocess.run(cmd, check=False, timeout=4, capture_output=True)

    return chord


def _kwrite(args: list[str]) -> None:
    exe = shutil.which("kwriteconfig6") or shutil.which("kwriteconfig5")
    if not exe:
        return
    subprocess.run(
        [exe, "--file", "kglobalshortcutsrc", *args],
        check=False,
        timeout=2,
        capture_output=True,
    )
