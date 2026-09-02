"""Put the clip on the system clipboard and emit a real Ctrl+V to the focused app."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from .buffer import ClipboardItem


def set_clipboard_item(item: ClipboardItem) -> None:
    from PySide6.QtCore import QByteArray, QMimeData, QUrl
    from PySide6.QtGui import QGuiApplication

    md = QMimeData()
    if item.uris:
        urls = [QUrl(u) for u in item.uris]
        md.setUrls(urls)
        listed = "\n".join(item.uris)
        md.setText("\n".join(_local_or_uri(u) for u in item.uris))
        md.setData(
            "x-special/gnome-copied-files",
            QByteArray(("copy\n" + listed).encode("utf-8")),
        )
        md.setData("text/uri-list", QByteArray(("\r\n".join(item.uris) + "\r\n").encode("utf-8")))
    else:
        md.setText(item.text)
    QGuiApplication.clipboard().setMimeData(md)
    _wl_copy(item)


def set_clipboard_qt(text: str) -> None:
    from PySide6.QtGui import QGuiApplication

    QGuiApplication.clipboard().setText(text)
    try:
        subprocess.run(["wl-copy"], input=text.encode("utf-8"), check=False, timeout=1)
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        pass


def _wl_copy(item: ClipboardItem) -> None:
    if not shutil.which("wl-copy"):
        return
    try:
        if item.uris:
            payload = ("\n".join(item.uris) + "\n").encode("utf-8")
            subprocess.run(
                ["wl-copy", "--type", "text/uri-list"],
                input=payload,
                check=False,
                timeout=1,
            )
        else:
            subprocess.run(["wl-copy"], input=item.text.encode("utf-8"), check=False, timeout=1)
    except (OSError, subprocess.TimeoutExpired):
        pass


def _local_or_uri(uri: str) -> str:
    from PySide6.QtCore import QUrl

    local = QUrl(uri).toLocalFile()
    return local or uri


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


def open_clip(item: ClipboardItem, name: str = "clip.txt") -> None:
    if item.uris:
        from PySide6.QtCore import QUrl

        target = QUrl(item.uris[0]).toLocalFile() or item.uris[0]
        if shutil.which("xdg-open"):
            subprocess.Popen(
                ["xdg-open", target], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            return
    tmp = Path(tempfile.gettempdir()) / "klipring"
    tmp.mkdir(parents=True, exist_ok=True)
    path = tmp / name
    path.write_text(item.text, encoding="utf-8")
    for cmd in (("kate", "--", str(path)), ("xdg-open", str(path))):
        if shutil.which(cmd[0]):
            subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return


def open_in_editor(text: str, name: str = "clip.txt") -> None:
    open_clip(ClipboardItem(text=text, copied_at=0, kind="text"), name)


def save_to_file(text: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text, encoding="utf-8")
