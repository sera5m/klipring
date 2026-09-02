"""Put the clip on the system clipboard and inject a paste into the focused app.

KWin does not implement the virtual-keyboard protocol, so wtype always fails
there. Prefer ydotool (uinput) and block KGlobalAccel so Ctrl+V does not reopen us.
"""

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


def send_paste(terminal: bool = False) -> tuple[bool, str]:
    """Inject paste without asking KWin who is focused."""
    _block_global_shortcuts(True)
    try:
        for fn in (
            _ydotool_shift_insert,
            _ydotool_ctrl_shift_v,
            _ydotool_ctrl_v,
            _dotool_paste,
            _wtype_paste,
            _xdotool_paste,
        ):
            ok, how = fn()
            if ok:
                return True, how
        return False, "no injector (install ydotool + ydotoold; KWin has no virtual keyboard)"
    finally:
        _block_global_shortcuts(False)


def send_ctrl_v() -> bool:
    ok, _ = send_paste()
    return ok


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
