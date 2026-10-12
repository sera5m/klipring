"""Put the clip on the system clipboard and inject a paste into the focused app.

KWin does not implement the virtual-keyboard protocol, so wtype always fails
there. Prefer ydotool (uinput) and block KGlobalAccel so Ctrl+V does not reopen us.
"""

from __future__ import annotations

import html
import os
import shutil
import subprocess
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path

from .buffer import ClipboardItem

_IMAGE_MIME = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
}


_KEEP_TYPES = (
    "text/plain",
    "text/plain;charset=utf-8",
    "text/html",
    "text/uri-list",
    "image/png",
    "image/jpeg",
    "image/webp",
    "UTF8_STRING",
    "TEXT",
)


@dataclass
class ClipboardHold:
    """What was on the clipboard before we borrowed it for a paste."""

    text: str = ""
    html: str = ""
    uris: list[str] = field(default_factory=list)
    blobs: dict[str, bytes] = field(default_factory=dict)

    @property
    def empty(self) -> bool:
        return not self.text and not self.html and not self.uris and not self.blobs


def capture_clipboard() -> ClipboardHold:
    """Snapshot the live clipboard so a Firefox paste can be undone."""
    hold = ClipboardHold()
    try:
        from PySide6.QtCore import QUrl
        from PySide6.QtGui import QGuiApplication

        md = QGuiApplication.clipboard().mimeData()
        if md is not None:
            if md.hasText():
                hold.text = md.text() or ""
            if md.hasHtml():
                hold.html = md.html() or ""
            if md.hasUrls():
                hold.uris = [u.toString() for u in md.urls() if u.isValid()]
    except Exception:
        pass
    if not shutil.which("wl-paste"):
        return hold
    listed = _wl_paste_text(["--list-types"])
    types = [t.strip() for t in listed.splitlines() if t.strip()]
    for mime in types:
        if mime not in _KEEP_TYPES and not mime.startswith("image/"):
            continue
        raw = _wl_paste_bytes(["-n", "--type", mime])
        if raw:
            hold.blobs[mime] = raw
            if mime.startswith("text/plain") and not hold.text:
                hold.text = raw.decode("utf-8", "replace")
    return hold


def restore_clipboard(hold: ClipboardHold | None) -> None:
    """Put the borrowed clipboard back. No-op if there was nothing to restore."""
    if hold is None or hold.empty:
        return
    from PySide6.QtCore import QByteArray, QMimeData, QUrl
    from PySide6.QtGui import QGuiApplication

    md = QMimeData()
    if hold.uris:
        md.setUrls([QUrl(u) for u in hold.uris])
    if hold.text:
        md.setText(hold.text)
    if hold.html:
        md.setHtml(hold.html)
    for mime, raw in hold.blobs.items():
        if mime.startswith("text/") or mime in {"TEXT", "UTF8_STRING"}:
            continue
        md.setData(mime, QByteArray(raw))
    QGuiApplication.clipboard().setMimeData(md)
    blob = _primary_blob(hold)
    if blob is not None:
        _offer(blob[0], blob[1])


def _primary_blob(hold: ClipboardHold) -> tuple[str, bytes] | None:
    for mime in ("image/png", "image/jpeg", "image/webp", "text/uri-list", "text/plain"):
        raw = hold.blobs.get(mime)
        if raw:
            return mime, raw
    if hold.uris:
        return "text/uri-list", ("\n".join(hold.uris) + "\n").encode("utf-8")
    if hold.text:
        return "text/plain", hold.text.encode("utf-8")
    return None


def _wl_paste_text(args: list[str]) -> str:
    raw = _wl_paste_bytes(args)
    return raw.decode("utf-8", "replace") if raw else ""


def _wl_paste_bytes(args: list[str]) -> bytes:
    if not shutil.which("wl-paste"):
        return b""
    try:
        r = subprocess.run(
            ["wl-paste", *args],
            capture_output=True,
            timeout=0.8,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return b""
    return r.stdout if r.returncode == 0 else b""


def paste_swapped(item: ClipboardItem, browser: bool = False) -> tuple[bool, str]:
    """Borrow the clipboard, paste the ring item, then put the original back.

    Firefox on Wayland reads the clipboard it already held when Ctrl+V arrives
    unless the offer is swapped in first and left alone until the key is done.
    """
    previous = capture_clipboard()
    set_clipboard_item(item)
    time.sleep(0.08 if browser else 0.03)
    ok, how = send_paste(browser=browser)
    time.sleep(0.12 if browser else 0.05)
    restore_clipboard(previous)
    return ok, how


def set_clipboard_item(item: ClipboardItem) -> None:
    from PySide6.QtCore import QByteArray, QMimeData, QUrl
    from PySide6.QtGui import QGuiApplication

    md = QMimeData()
    image = _image_bytes(item)
    if image is not None:
        mime, raw, path = image
        md.setUrls([QUrl.fromLocalFile(str(path))])
        md.setText(str(path))
        md.setData(mime, QByteArray(raw))
    elif item.uris:
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
        md.setHtml(
            "<meta charset='utf-8'><pre>" + html.escape(item.text) + "</pre>"
        )
    QGuiApplication.clipboard().setMimeData(md)
    _wl_copy(item)


def _wl_copy(item: ClipboardItem) -> None:
    if not shutil.which("wl-copy"):
        return
    image = _image_bytes(item)
    if image is not None:
        mime, raw, _path = image
        _offer(mime, raw)
        return
    payload = (
        ("\n".join(item.uris) + "\n").encode("utf-8")
        if item.uris
        else item.text.encode("utf-8")
    )
    mime = "text/uri-list" if item.uris else "text/plain"
    _offer(mime, payload)


def _image_bytes(item: ClipboardItem) -> tuple[str, bytes, Path] | None:
    if not item.uris:
        return None
    from PySide6.QtCore import QUrl

    path = Path(QUrl(item.uris[0]).toLocalFile())
    mime = _IMAGE_MIME.get(path.suffix.lower())
    if mime is None or not path.is_file():
        return None
    try:
        raw = path.read_bytes()
    except OSError:
        return None
    if not raw:
        return None
    return mime, raw, path


def _offer(mime: str, payload: bytes) -> None:
    try:
        subprocess.run(["wl-copy", "--clear"], check=False, timeout=1, capture_output=True)
        for extra in ([], ["-p"]):
            subprocess.run(
                ["wl-copy", *extra, "--type", mime],
                input=payload,
                check=False,
                timeout=1,
            )
    except (OSError, subprocess.TimeoutExpired):
        pass


def _local_or_uri(uri: str) -> str:
    from PySide6.QtCore import QUrl

    local = QUrl(uri).toLocalFile()
    return local or uri


def send_paste(terminal: bool = False, browser: bool = False) -> tuple[bool, str]:
    """Inject paste. Browsers must use Ctrl+V — Shift+Insert hits PRIMARY / last page copy."""
    _block_global_shortcuts(True)
    try:
        if browser:
            fns = (_ydotool_ctrl_v, _ydotool_ctrl_shift_v)
        elif terminal:
            fns = (_ydotool_ctrl_shift_v, _ydotool_ctrl_v, _ydotool_shift_insert)
        else:
            fns = (
                _ydotool_shift_insert,
                _ydotool_ctrl_shift_v,
                _ydotool_ctrl_v,
                _dotool_paste,
                _wtype_paste,
                _xdotool_paste,
            )
        for fn in fns:
            ok, how = fn()
            if ok:
                return True, how
        return False, "no injector (install ydotool + ydotoold; KWin has no virtual keyboard)"
    finally:
        _block_global_shortcuts(False)


def click_at(x: int, y: int) -> bool:
    """Move to a cached screen point, then left-click. Used after the pie has slid."""
    if x < 0 or y < 0:
        return False
    sx, sy = str(int(x)), str(int(y))
    moved = False
    for args in (
        ["ydotool", "mousemove", "--absolute", sx, sy],
        ["ydotool", "mousemove", "-a", sx, sy],
        ["ydotool", "mousemove", "--", sx, sy],
    ):
        r = _run(args)
        if _ok(r):
            moved = True
            break
    if not moved:
        return False
    return refocus_caret()


def refocus_caret() -> bool:
    """Left-click where the pointer already is."""
    for args in (
        ["ydotool", "click", "0xC0"],
        ["ydotool", "click", "left"],
    ):
        r = _run(args)
        if _ok(r):
            return True
    return False


def _block_global_shortcuts(on: bool) -> None:
    try:
        from PySide6.QtDBus import QDBusConnection, QDBusMessage

        msg = QDBusMessage.createMethodCall(
            "org.kde.kglobalaccel",
            "/kglobalaccel",
            "org.kde.KGlobalAccel",
            "blockGlobalShortcuts",
        )
        msg.setArguments([bool(on)])
        QDBusConnection.sessionBus().call(msg)
    except Exception:
        pass


def _ok(r: subprocess.CompletedProcess[bytes] | None) -> bool:
    return r is not None and r.returncode == 0


def _run(args: list[str]) -> subprocess.CompletedProcess[bytes] | None:
    if not shutil.which(args[0]):
        return None
    try:
        return subprocess.run(args, check=False, timeout=2, capture_output=True)
    except (OSError, subprocess.TimeoutExpired):
        return None


def _ydotool_ctrl_shift_v() -> tuple[bool, str]:
    r = _run(["ydotool", "key", "29:1", "42:1", "47:1", "47:0", "42:0", "29:0"])
    if _ok(r):
        return True, "ydotool Ctrl+Shift+V"
    r = _run(["ydotool", "key", "ctrl+shift+v"])
    if _ok(r):
        return True, "ydotool Ctrl+Shift+V"
    return False, ""


def _ydotool_shift_insert() -> tuple[bool, str]:
    r = _run(["ydotool", "key", "42:1", "110:1", "110:0", "42:0"])
    if _ok(r):
        return True, "ydotool Shift+Insert"
    r = _run(["ydotool", "key", "Shift+Insert"])
    if _ok(r):
        return True, "ydotool Shift+Insert"
    return False, ""


def _ydotool_ctrl_v() -> tuple[bool, str]:
    r = _run(["ydotool", "key", "29:1", "47:1", "47:0", "29:0"])
    if _ok(r):
        return True, "ydotool Ctrl+V"
    r = _run(["ydotool", "key", "ctrl+v"])
    if _ok(r):
        return True, "ydotool Ctrl+V"
    return False, ""


def _dotool_paste() -> tuple[bool, str]:
    if not shutil.which("dotool"):
        return False, ""
    try:
        r = subprocess.run(
            ["dotool"],
            input=b"key shift+insert\n",
            check=False,
            timeout=2,
            capture_output=True,
        )
        if r.returncode == 0:
            return True, "dotool Shift+Insert"
    except (OSError, subprocess.TimeoutExpired):
        pass
    return False, ""


def _wtype_paste() -> tuple[bool, str]:
    r = _run(["wtype", "-M", "shift", "-k", "insert", "-m", "shift"])
    if _ok(r):
        return True, "wtype Shift+Insert"
    return False, ""


def _xdotool_paste() -> tuple[bool, str]:
    if os.environ.get("XDG_SESSION_TYPE", "").lower() == "wayland":
        return False, ""
    r = _run(["xdotool", "key", "--clearmodifiers", "shift+Insert"])
    if _ok(r):
        return True, "xdotool Shift+Insert"
    return False, ""


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
