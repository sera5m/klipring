"""Read the live clipboard. On Plasma Wayland Qt's QClipboard often keeps the
first copy forever, so wl-paste / Klipper are the source of truth.
"""

from __future__ import annotations

import hashlib
import shutil
import subprocess
import time
from pathlib import Path

from PySide6.QtCore import QUrl
from PySide6.QtGui import QClipboard, QGuiApplication

from .buffer import ClipboardItem
from .htmltext import html_to_text

_IMAGE_TYPES = (
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/bmp",
)
_TEXT_TYPES = ("text/plain", "text/plain;charset=utf-8", "TEXT", "UTF8_STRING")
_EXT = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/bmp": "bmp",
}


def snapshot(clip: QClipboard | None = None) -> ClipboardItem | None:
    return snapshot_wl() or snapshot_klipper() or snapshot_qt(clip)


def snapshot_wl() -> ClipboardItem | None:
    if not shutil.which("wl-paste"):
        return None
    types = set(_wl_paste(["--list-types"]).split())
    uris = _wl_paste(["-n", "--type", "text/uri-list"]) if "text/uri-list" in types else ""
    if uris.strip():
        urls = []
        for line in uris.splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                urls.append(QUrl(line if ":" in line[:8] else Path(line).resolve().as_uri()))
        urls = [u for u in urls if u.isValid()]
        if urls:
            return _from_urls(urls)
    image = _image_item(types)
    if image is not None:
        return image
    text = ""
    for mime in _TEXT_TYPES:
        if not types or mime in types:
            text = _wl_paste(["-n", "--type", mime])
            if text:
                break
    if not text and (not types or "text/html" in types):
        html = _wl_paste(["-n", "--type", "text/html"])
        if html.strip():
            text = html_to_text(html)
    if text and not _looks_like_image(text):
        return _text_item(text)
    primary = _wl_paste(["-n", "-p"])
    if primary and not _looks_like_image(primary):
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
        if text and not _looks_like_image(text):
            return _text_item(text)
    except Exception:
        return None
    return None


def snapshot_qt(clip: QClipboard | None = None) -> ClipboardItem | None:
    clip = clip or QGuiApplication.clipboard()
    try:
        modes = [QClipboard.Mode.Clipboard, QClipboard.Mode.Selection]
    except Exception:
        modes = [QClipboard.Mode.Clipboard]
    for mode in modes:
        try:
            md = clip.mimeData(mode)
        except Exception:
            continue
        if md is None:
            continue
        urls = [u for u in md.urls() if u.isValid()] if md.hasUrls() else []
        if urls:
            return _from_urls(urls)
        if md.hasImage():
            image = _qt_image(md)
            if image is not None:
                return image
        text = md.text() if md.hasText() else ""
        if not text and md.hasHtml():
            text = html_to_text(md.html())
        if text and not _looks_like_image(text):
            return _text_item(text)
    return None


def _text_item(text: str) -> ClipboardItem:
    return ClipboardItem(
        text=text,
        copied_at=time.time(),
        kind="text",
        signature="text:" + text,
    )


def _image_item(types: set[str]) -> ClipboardItem | None:
    mime = next((m for m in _IMAGE_TYPES if m in types), None)
    if mime is None:
        return None
    raw = _wl_paste_bytes(["-n", "--type", mime])
    if not _magic_ok(raw):
        return None
    return _store_image(raw, mime)


def _qt_image(md) -> ClipboardItem | None:
    try:
        image = md.imageData()
    except Exception:
        return None
    if image is None or getattr(image, "isNull", lambda: True)():
        return None
    from PySide6.QtCore import QBuffer, QIODevice

    buf = QBuffer()
    buf.open(QIODevice.OpenModeFlag.WriteOnly)
    if not image.save(buf, "PNG"):
        return None
    return _store_image(bytes(buf.data()), "image/png")


def _store_image(raw: bytes, mime: str) -> ClipboardItem:
    digest = hashlib.sha256(raw).hexdigest()[:16]
    root = Path.home() / ".local/share/klipring/images"
    root.mkdir(parents=True, exist_ok=True)
    path = root / f"{digest}.{_EXT.get(mime, 'bin')}"
    if not path.exists():
        path.write_bytes(raw)
    uri = path.resolve().as_uri()
    return ClipboardItem(
        text=f"{path.name} ({len(raw)} bytes)",
        copied_at=time.time(),
        kind="file",
        uris=[uri],
        signature="image:" + mime + ":" + digest,
    )


def _looks_like_image(text: str) -> bool:
    head = text[:16]
    return "\ufffd" in head and ("PNG" in head or "JFIF" in head or "GIF" in head)


def _magic_ok(raw: bytes) -> bool:
    return raw.startswith((b"\x89PNG\r\n\x1a\n", b"\xff\xd8\xff", b"GIF8", b"RIFF", b"BM"))


def _wl_paste(args: list[str]) -> str:
    raw = _wl_paste_bytes(args)
    if not raw:
        return ""
    return raw.decode("utf-8", "replace")


def _wl_paste_bytes(args: list[str]) -> bytes:
    try:
        r = subprocess.run(
            ["wl-paste", *args],
            capture_output=True,
            timeout=1.5,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return b""
    if r.returncode != 0:
        return b""
    return r.stdout


def item_from_paths(paths: list[str]) -> ClipboardItem | None:
    urls: list[QUrl] = []
    for raw in paths:
        path = Path(raw).expanduser()
        try:
            path = path.resolve()
        except OSError:
            continue
        if path.exists():
            urls.append(QUrl.fromLocalFile(str(path)))
    if not urls:
        return None
    return _from_urls(urls)


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
