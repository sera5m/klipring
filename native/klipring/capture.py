"""Read the live system clipboard. Wayland often skips QClipboard.dataChanged,
so we snapshot mime data on a poll as well as on the Qt signal."""

from __future__ import annotations

import time
from pathlib import Path

from PySide6.QtCore import QUrl
from PySide6.QtGui import QClipboard, QGuiApplication

from .buffer import ClipboardItem


def snapshot(clip: QClipboard | None = None) -> ClipboardItem | None:
    clip = clip or QGuiApplication.clipboard()
    md = clip.mimeData()
    if md is None:
        return None

    urls = [u for u in md.urls() if u.isValid()] if md.hasUrls() else []
    if urls:
        return _from_urls(urls)

    text = md.text() if md.hasText() else ""
    if text:
        return ClipboardItem(
            text=text,
            copied_at=time.time(),
            kind="text",
            signature="text:" + text,
        )
    return None


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
