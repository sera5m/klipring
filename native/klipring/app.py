from __future__ import annotations

import sys
import time
from pathlib import Path

from PySide6.QtCore import QObject, QStandardPaths, Qt, QTimer, Slot
from PySide6.QtDBus import QDBusConnection, QDBusMessage
from PySide6.QtGui import QAction, QGuiApplication, QIcon
from PySide6.QtWidgets import (
    QApplication,
    QFileDialog,
    QMenu,
    QMessageBox,
    QSystemTrayIcon,
)

from . import APP_ID, APP_NAME, __version__
from .buffer import ClipboardBuffer
from .geometry import DEFAULT_CAPACITY
from .overlay import Overlay
from .paste import open_in_editor, save_to_file, send_ctrl_v, set_clipboard_qt


def data_dir() -> Path:
    root = QStandardPaths.writableLocation(QStandardPaths.StandardLocation.AppDataLocation)
    path = Path(root)
    path.mkdir(parents=True, exist_ok=True)
    return path


class Bridge(QObject):
    def __init__(self, app: "KlipRingApp") -> None:
        super().__init__()
        self._app = app

    @Slot()
    def Show(self) -> None:
        self._app.show_overlay()

    @Slot()
    def Hide(self) -> None:
        self._app.overlay.dismiss(False)

    @Slot()
    def Toggle(self) -> None:
        if self._app.overlay.isVisible():
            self._app.overlay.dismiss(False)
        else:
            self._app.show_overlay()


class KlipRingApp:
    def __init__(self) -> None:
        self.buffer = ClipboardBuffer(data_dir() / "buffer.json", DEFAULT_CAPACITY)
        self.buffer.load()
        self.overlay = Overlay(
            self.buffer,
            on_paste=self.paste_index,
            on_drop=self.drop_index,
            on_open=self.open_index,
            on_save=self.save_index,
        )
        self.bridge = Bridge(self)
        self._mute_clip = False
        clip = QGuiApplication.clipboard()
        clip.dataChanged.connect(self._on_clipboard)
        self.tray = self._make_tray()
        self._register_dbus()
        self._maybe_register_shortcut()

    def _register_dbus(self) -> None:
        bus = QDBusConnection.sessionBus()
        if not bus.isConnected():
            return
        bus.registerObject(
            "/App",
            self.bridge,
            QDBusConnection.RegisterOption.ExportAllSlots,
        )
        bus.registerService(APP_ID)

    def show_overlay(self) -> None:
        self.overlay.popup()

    def paste_index(self, index: int) -> None:
        if not (0 <= index < len(self.buffer.items)):
            return
        text = self.buffer.items[index].text
        self._mute_clip = True
        self.buffer.mute(True)
        set_clipboard_qt(text)
        QTimer.singleShot(40, lambda: self._finish_paste(text))

    def _finish_paste(self, _text: str) -> None:
        send_ctrl_v()
        self.buffer.mute(False)
        QTimer.singleShot(200, lambda: setattr(self, "_mute_clip", False))
        self._notify("Pasted", "Clip sent to the focused window.")

    def drop_index(self, index: int) -> int:
        nxt = self.buffer.remove_at(index)
        self._notify("Removed", "Slot dropped from the buffer.")
        self._refresh_tray()
        return nxt

    def open_index(self, index: int) -> None:
        if not (0 <= index < len(self.buffer.items)):
            return
        item = self.buffer.items[index]
        open_in_editor(item.text, f"clip-{int(item.copied_at)}.txt")
        self._notify("Opened", "Kate / default editor.")

    def save_index(self, index: int) -> None:
        if not (0 <= index < len(self.buffer.items)):
            return
        item = self.buffer.items[index]
        dest, _ = QFileDialog.getSaveFileName(
            None, "Save clip", str(Path.home() / "clip.txt"), "Text (*.txt)"
        )
        if dest:
            save_to_file(item.text, Path(dest))
            self._notify("Saved", dest)

    def _on_clipboard(self) -> None:
        if self._mute_clip or self.overlay.isVisible():
            return
        text = QGuiApplication.clipboard().text()
        if text:
            self.buffer.push(text)
            self._refresh_tray()

    def _make_tray(self) -> QSystemTrayIcon:
        icon = QIcon.fromTheme("edit-paste", QIcon.fromTheme("klipring"))
        tray = QSystemTrayIcon(icon)
        tray.setToolTip(APP_NAME)
        menu = QMenu()
        show = QAction("Open clip ring", menu)
        show.triggered.connect(self.show_overlay)
        menu.addAction(show)
        for cap in (8, 20, 36, 56):
            act = QAction(f"Capacity {cap}", menu)
            act.triggered.connect(lambda _=False, c=cap: self._set_cap(c))
            menu.addAction(act)
        menu.addSeparator()
        quit_act = QAction("Quit", menu)
        quit_act.triggered.connect(QApplication.instance().quit)
        menu.addAction(quit_act)
        tray.setContextMenu(menu)
        tray.activated.connect(self._tray_click)
        tray.show()
        self._refresh_tray()
        return tray

    def _tray_click(self, reason: QSystemTrayIcon.ActivationReason) -> None:
        if reason == QSystemTrayIcon.ActivationReason.Trigger:
            self.show_overlay()

    def _set_cap(self, n: int) -> None:
        self.buffer.set_capacity(n)
        self._notify("Capacity", f"{n} slots")
        self._refresh_tray()

    def _refresh_tray(self) -> None:
        n = len(self.buffer.items)
        self.tray.setToolTip(f"{APP_NAME} — {n}/{self.buffer.capacity}")

    def _notify(self, title: str, body: str) -> None:
        self.tray.showMessage(title, body, QSystemTrayIcon.MessageIcon.Information, 2200)

    def _maybe_register_shortcut(self) -> None:
        marker = data_dir() / "shortcut-registered"
        if marker.exists():
            return
        try:
            from subprocess import run

            run(
                [
                    "kwriteconfig6",
                    "--file",
                    "kglobalshortcutsrc",
                    "--group",
                    "klipring-show.desktop",
                    "--key",
                    "_k_friendly_name",
                    "KlipRing",
                ],
                check=False,
                timeout=2,
            )
            run(
                [
                    "kwriteconfig6",
                    "--file",
                    "kglobalshortcutsrc",
                    "--group",
                    "klipring-show.desktop",
                    "--key",
                    "_launch",
                    "Ctrl+V,none,Show KlipRing",
                ],
                check=False,
                timeout=2,
            )
            marker.write_text(str(time.time()), encoding="utf-8")
        except OSError:
            return


def _already_running_show() -> bool:
    bus = QDBusConnection.sessionBus()
    if not bus.isConnected():
        return False
    iface = bus.interface()
    if iface is None:
        return False
    registered = iface.isServiceRegistered(APP_ID)
    if hasattr(registered, "value") and not registered.value():
        return False
    if registered is False:
        return False
    msg = QDBusMessage.createMethodCall(APP_ID, "/App", "", "Show")
    bus.call(msg)
    return True


def run(argv: list[str]) -> int:
    QApplication.setApplicationName(APP_NAME)
    QApplication.setOrganizationName("klipring")
    QApplication.setDesktopFileName("klipring")
    qapp = QApplication(argv)
    qapp.setQuitOnLastWindowClosed(False)
    qapp.setApplicationVersion(__version__)

    show_only = "--show" in argv
    if show_only and _already_running_show():
        return 0

    taken = False
    try:
        iface = QDBusConnection.sessionBus().interface()
        taken = bool(iface and iface.isServiceRegistered(APP_ID).value())
    except Exception:
        taken = False
    if taken:
        if show_only:
            _already_running_show()
            return 0
        QMessageBox.information(None, APP_NAME, "KlipRing is already running in the tray.")
        return 0

    host = KlipRingApp()
    if show_only:
        QTimer.singleShot(50, host.show_overlay)
    else:
        host._notify(APP_NAME, "Clipboard ring is in the tray. Hold Ctrl+V after binding the shortcut.")
    return qapp.exec()
