"""Read the live clipboard. On Plasma Wayland Qt's QClipboard often keeps the
first copy forever, so wl-paste / Klipper are the source of truth."""

from __future__ import annotations

import shutil
import subprocess
import time
from pathlib import Path

from PySide6.QtCore import QUrl
from PySide6.QtGui import QClipboard, QGuiApplication

from .buffer import ClipboardItem


def snapshot(clip: QClipboard | None = None) -> ClipboardItem | None:
    return snapshot_wl() or snapshot_klipper() or snapshot_qt(clip)


def snapshot_wl() -> ClipboardItem | None:
    if not shutil.which("wl-paste"):
        return None
    uris = _wl_paste(["-n", "--type", "text/uri-list"])
    if uris.strip():
        urls = []
        for line in uris.splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                urls.append(QUrl(line if ":" in line[:8] else Path(line).resolve().as_uri()))
        urls = [u for u in urls if u.isValid()]
        if urls:
            return _from_urls(urls)
    text = _wl_paste(["-n"])
    if text:
        return _text_item(text)
    primary = _wl_paste(["-n", "-p"])
    if primary:
        return _text_item(primary)
    return None


def snapshot_klipper() -> ClipboardItem | None:
    try:
        from PySide6.QtDBus import QDBusConnection, QDBusInterface

        iface = QDBusInterface(
            "org.kde.klipper",
            "/klipper",
            "org.kde.klipper.klipper",
            QDBusConnection.sessionBus(),
        )
        if not iface.isValid():
            return None
        reply = iface.call("getClipboardContents")
        args = reply.arguments() if reply is not None else []
        text = str(args[0]) if args else ""
        if text:
            return _text_item(text)
    except Exception:
        return None
    return None


def snapshot_qt(clip: QClipboard | None = None) -> ClipboardItem | None:
    clip = clip or QGuiApplication.clipboard()
    try:
        md = clip.mimeData()
    except Exception:
        return None
    if md is None:
        return None
    urls = [u for u in md.urls() if u.isValid()] if md.hasUrls() else []
    if urls:
        return _from_urls(urls)
    text = md.text() if md.hasText() else ""
    if text:
        return _text_item(text)
    return None


def _text_item(text: str) -> ClipboardItem:
    return ClipboardItem(
        text=text,
        copied_at=time.time(),
        kind="text",
        signature="text:" + text,
    )


def _wl_paste(args: list[str]) -> str:
    try:
        r = subprocess.run(
            ["wl-paste", *args],
            capture_output=True,
            timeout=0.3,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return ""
    if r.returncode != 0:
        return ""
    return r.stdout.decode("utf-8", "replace")


def _from_urls(urls: list[QUrl]) -> ClipboardItem:
    uris = [u.toString() for u in urls]
    locals_ = [Path(u.toLocalFile()) for u in urls if u.toLocalFile()]
    lines = [u.toLocalFile() or u.toString() for u in urls]
    text = "\n".join(lines)
    if len(uris) > 1:
        kind = "files"
    elif locals_ and locals_[0].is_dir():
        kind = "directory"
    else:
        kind = "file"
    return ClipboardItem(
        text=text,
        copied_at=time.time(),
        kind=kind,
        uris=uris,
        signature="uri:" + "\n".join(uris),
    )
