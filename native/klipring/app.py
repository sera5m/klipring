from __future__ import annotations

import os
import signal
import shutil
from pathlib import Path

from PySide6.QtCore import QEvent, QObject, QPoint, QProcess, QStandardPaths, Qt, QTimer, Slot
from PySide6.QtDBus import QDBusConnection, QDBusMessage
from PySide6.QtGui import QAction, QCursor, QGuiApplication, QIcon
from PySide6.QtWidgets import (
    QApplication,
    QFileDialog,
    QMenu,
    QMessageBox,
    QSystemTrayIcon,
)

from . import APP_ID, APP_NAME, __version__
from .buffer import ClipboardBuffer
from .capture import snapshot
from .geometry import DEFAULT_CAPACITY
from .overlay import Overlay
from .paste import open_clip, save_to_file, send_ctrl_v, set_clipboard_item
from .pointer import looks_captured, screen_center
from .shortcuts import DEFAULT_CHORD, bind_shortcut


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

    @Slot(str)
    def ShowActivated(self, token: str) -> None:
        if token:
            os.environ["XDG_ACTIVATION_TOKEN"] = token
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


class KeyFilter(QObject):
    """Catch V-up even if the overlay lost the Wayland keyboard grab."""

    def __init__(self, overlay: Overlay) -> None:
        super().__init__()
        self.overlay = overlay

    def eventFilter(self, _obj, event) -> bool:  # noqa: ANN001
        if not self.overlay.isVisible():
            return False
        if event.type() == QEvent.Type.KeyRelease and not event.isAutoRepeat():
            if event.key() == Qt.Key.Key_V:
                self.overlay.dismiss(True)
                return True
        return False


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
        self._last_sig = ""
        self._ingesting = False
        self._stopping = False
        self._last_ptr = QPoint(-1, -1)
        self._wl: QProcess | None = None
        clip = QGuiApplication.clipboard()
        clip.dataChanged.connect(self._on_clipboard)
        self._poll = QTimer()
        self._poll.setInterval(2000)
        self._poll.timeout.connect(self._poll_clipboard)
        self._poll.start()
        self._ptr = QTimer()
        self._ptr.setInterval(40)
        self._ptr.timeout.connect(self._track_pointer)
        self._ptr.start()
        self._start_watch()
        self.tray: QSystemTrayIcon | None = None
        self.tray = self._make_tray()
        self._refresh_tray()
        self._register_dbus()
        self._maybe_register_shortcut()
        self._ingest_clipboard(force=True)
        self._track_pointer()

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

    def _track_pointer(self) -> None:
        pos = QCursor.pos()
        if self._last_ptr.x() < 0:
            self._last_ptr = QPoint(pos)
            return
        if looks_captured(pos.x(), pos.y(), self._last_ptr.x(), self._last_ptr.y()):
            return
        self._last_ptr = QPoint(pos)

    def pointer_target(self) -> QPoint:
        pos = QCursor.pos()
        last = self._last_ptr
        if last.x() >= 0 and looks_captured(pos.x(), pos.y(), last.x(), last.y()):
            pos = QPoint(last)
        screen = QGuiApplication.screenAt(pos)
        if screen is None and last.x() >= 0:
            screen = QGuiApplication.screenAt(last)
            if screen is not None:
                pos = QPoint(last)
        if screen is None:
            screen = QGuiApplication.primaryScreen()
            geo = screen.availableGeometry()
            cx, cy = screen_center(geo.left(), geo.top(), geo.right(), geo.bottom())
            return QPoint(int(cx), int(cy))
        return pos

    def show_overlay(self) -> None:
        if self.overlay.isVisible():
            return
        self._ingest_clipboard(force=True)
        self.overlay.popup(self.pointer_target())

    def paste_index(self, index: int) -> None:
        if not (0 <= index < len(self.buffer.items)):
            return
        item = self.buffer.items[index]
        self._mute_clip = True
        self.buffer.mute(True)
        set_clipboard_item(item)
        QTimer.singleShot(120, lambda: self._finish_paste(item.text))

    def _finish_paste(self, _text: str) -> None:
        send_ctrl_v()
        self.buffer.mute(False)
        QTimer.singleShot(250, lambda: setattr(self, "_mute_clip", False))
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
        open_clip(item, f"clip-{int(item.copied_at)}.txt")
        self._notify("Opened", "Kate / file manager.")

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
        self._ingest_clipboard()

    def _poll_clipboard(self) -> None:
        try:
            self._ingest_clipboard()
        except KeyboardInterrupt:
            QApplication.instance().quit()
        except Exception:
            return

    def _ingest_clipboard(self, force: bool = False) -> None:
        if self._mute_clip or self._ingesting:
            return
        if not force and self.overlay.isVisible():
            return
        self._ingesting = True
        try:
            item = snapshot()
        except Exception:
            item = None
        finally:
            self._ingesting = False
        if item is None:
            return
        if item.signature == self._last_sig:
            return
        self._last_sig = item.signature
        if self.buffer.push_item(item):
            self._refresh_tray()

    def _start_watch(self) -> None:
        if self._stopping or not shutil.which("wl-paste"):
            return
        if self._wl is not None:
            try:
                self._wl.kill()
            except Exception:
                pass
        proc = QProcess()
        proc.setProgram("wl-paste")
        proc.setArguments(["--watch", "printf", "."])
        proc.readyReadStandardOutput.connect(self._on_clipboard)
        proc.finished.connect(self._restart_watch)
        proc.start()
        self._wl = proc

    def _restart_watch(self) -> None:
        if self._stopping:
            return
        QTimer.singleShot(1000, self._start_watch)

    def stop(self) -> None:
        self._stopping = True
        self._poll.stop()
        self._ptr.stop()
        if self._wl is not None:
            self._wl.kill()

    def _make_tray(self) -> QSystemTrayIcon:
        icon_path = Path("/usr/share/icons/hicolor/scalable/apps/klipring.svg")
        icon = QIcon(str(icon_path)) if icon_path.exists() else QIcon.fromTheme("edit-paste")
        if icon.isNull():
            icon = QIcon.fromTheme("klipper")
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
        bind = QAction(f"Bind {DEFAULT_CHORD} in KWin", menu)
        bind.triggered.connect(self._bind_shortcut)
        menu.addAction(bind)
        menu.addSeparator()
        quit_act = QAction("Quit", menu)
        quit_act.triggered.connect(QApplication.instance().quit)
        menu.addAction(quit_act)
        tray.setContextMenu(menu)
        tray.activated.connect(self._tray_click)
        tray.show()
        return tray

    def _tray_click(self, reason: QSystemTrayIcon.ActivationReason) -> None:
        if reason == QSystemTrayIcon.ActivationReason.Trigger:
            self.show_overlay()

    def _set_cap(self, n: int) -> None:
        self.buffer.set_capacity(n)
        self._notify("Capacity", f"{n} slots")
        self._refresh_tray()

    def _refresh_tray(self) -> None:
        if self.tray is None:
            return
        n = len(self.buffer.items)
        self.tray.setToolTip(f"{APP_NAME} — {n}/{self.buffer.capacity}")

    def _notify(self, title: str, body: str) -> None:
        if self.tray is None:
            return
        self.tray.showMessage(title, body, QSystemTrayIcon.MessageIcon.Information, 2200)

    def _maybe_register_shortcut(self) -> None:
        marker = data_dir() / "shortcut-registered"
        if marker.exists():
            return
        chord = bind_shortcut(DEFAULT_CHORD)
        marker.write_text(chord, encoding="utf-8")

    def _bind_shortcut(self) -> None:
        chord = bind_shortcut(DEFAULT_CHORD)
        self._notify("Shortcut", f"{chord} registered in KWin. Check System Settings → Shortcuts → KlipRing.")


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
    token = os.environ.get("XDG_ACTIVATION_TOKEN", "")
    if token:
        msg = QDBusMessage.createMethodCall(APP_ID, "/App", "", "ShowActivated")
        msg.setArguments([token])
    else:
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
    bind_only = "--bind-shortcut" in argv
    if bind_only:
        chord = bind_shortcut(DEFAULT_CHORD)
        print(f"Registered {chord} via KGlobalAccel (no sudo).")
        print("System Settings → Keyboard → Shortcuts → KlipRing if it does not fire yet.")
        return 0
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
    filt = KeyFilter(host.overlay)
    qapp.installEventFilter(filt)
    qapp.aboutToQuit.connect(host.stop)

    def _stop(*_args) -> None:
        host.stop()
        qapp.quit()

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)
    beat = QTimer()
    beat.setInterval(200)
    beat.timeout.connect(lambda: None)
    beat.start()

    if show_only:
        QTimer.singleShot(50, host.show_overlay)
    else:
        host._notify(APP_NAME, "In the tray. Bind Ctrl+V via the tray menu or: klipring --bind-shortcut")
    try:
        return qapp.exec()
    except KeyboardInterrupt:
        host.stop()
        return 0
