from __future__ import annotations

import json
import os
import signal
import shutil
from pathlib import Path

from PySide6.QtCore import QEvent, QObject, QPoint, QProcess, QStandardPaths, Qt, QTimer, QUrl, Slot
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
from .capture import item_from_paths, snapshot
from .focus import (
    activate_window,
    active_window_id,
    focused_window,
    is_browser,
    is_self,
    is_self_target,
    mouse_location,
    pick_paste_target,
    short_label,
    window_at_pointer,
)
from .geometry import DEFAULT_CAPACITY
from .pointer import looks_captured
from .overlay import Overlay
from .paste import click_at, open_clip, save_to_file, send_paste, set_clipboard_item
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
        del token
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

    @Slot(str)
    def CopyPaths(self, blob: str) -> None:
        paths = [p for p in blob.split("\n") if p.strip()]
        self._app.ingest_paths(paths)

    @Slot(str)
    def PasteHere(self, dest: str) -> None:
        self._app.paste_here(dest)


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
        self._wl_primary: QProcess | None = None
        self._saved_ptr = QPoint(-1, -1)
        self._click_cache = QPoint(-1, -1)
        self._focus_hist: list[tuple[str, str]] = []
        self._focus_cand: tuple[str, str] = ("", "")
        self._focus_hits = 0
        self._paste_lock: tuple[str, str] = ("", "")
        self._wait_clip = None
        self._notify_paste = True
        self._load_settings()
        self._ptr = QTimer()
        self._ptr.setInterval(200)
        self._ptr.timeout.connect(self._track_idle)
        clip = QGuiApplication.clipboard()
        clip.dataChanged.connect(self._on_clipboard)
        try:
            clip.changed.connect(lambda *_a: self._on_clipboard())
        except Exception:
            pass
        self._poll = QTimer()
        self._poll.setInterval(400)
        self._poll.timeout.connect(self._poll_clipboard)
        self._poll.start()
        self._ptr.start()
        self._start_watch()
        self.tray: QSystemTrayIcon | None = None
        self.tray = self._make_tray()
        self._refresh_tray()
        self._register_dbus()
        self._maybe_register_shortcut()
        self._ingest_clipboard(force=True)

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

    def _track_idle(self) -> None:
        if self.overlay.isVisible():
            return
        pos = mouse_location(self._last_ptr if self._last_ptr.x() >= 0 else None)
        if pos.x() != 0 or pos.y() != 0:
            self._last_ptr = QPoint(pos)
        self._remember_focus()

    def _remember_focus(self) -> None:
        wid = active_window_id()
        name = focused_window()
        if is_self(name, wid):
            return
        if not wid and not name:
            return
        entry = (wid, name)
        if entry == self._focus_cand:
            self._focus_hits += 1
        else:
            self._focus_cand = entry
            self._focus_hits = 1
        if self._focus_hits < 2:
            return
        if self._focus_hist and self._focus_hist[-1] == entry:
            return
        self._focus_hist.append(entry)
        self._focus_hist = self._focus_hist[-2:]

    def show_overlay(self) -> None:
        if self.overlay.isVisible():
            return
        ptr = self.pointer_target()
        self._click_cache = QPoint(ptr)
        self._saved_ptr = QPoint(ptr)
        self._remember_focus()
        under = window_at_pointer()
        if under[0]:
            self._paste_lock = under
        else:
            live = (active_window_id(), focused_window())
            if live[0] and not is_self(live[1], live[0]):
                self._paste_lock = live
            else:
                self._paste_lock = pick_paste_target(self._focus_hist)
        self._ingest_clipboard(force=True)
        self.overlay.popup(ptr, target=short_label(self._paste_lock[1]))

    def paste_index(self, index: int) -> None:
        if not (0 <= index < len(self.buffer.items)):
            return
        if is_self(self._paste_lock[1], self._paste_lock[0]):
            under = window_at_pointer()
            if under[0] and not is_self(under[1], under[0]):
                self._paste_lock = under
            else:
                self._refuse_self()
                return
        item = self.buffer.items[index]
        self._mute_clip = True
        self.buffer.mute(True)
        set_clipboard_item(item)
        self._wait_clip = item
        QTimer.singleShot(30, lambda: self._wait_clipboard(0))

    def _forget_click_cache(self) -> None:
        self._click_cache = QPoint(-1, -1)
        self._saved_ptr = QPoint(-1, -1)

    def _refuse_self(self) -> None:
        self.buffer.mute(False)
        QTimer.singleShot(250, lambda: setattr(self, "_mute_clip", False))
        QTimer.singleShot(75, self._forget_click_cache)
        self._notify("somehow self is a target", "refused to paste into KlipRing")

    def _self_blocks_paste(self) -> bool:
        under = window_at_pointer()
        return is_self_target(
            self._paste_lock,
            focused_window(),
            active_window_id(),
            under,
        ) or self.overlay.isVisible()

    def _wait_clipboard(self, n: int) -> None:
        if self.overlay.isVisible() and n < 20:
            QTimer.singleShot(30, lambda: self._wait_clipboard(n + 1))
            return
        if self._self_blocks_paste():
            self._refuse_self()
            return
        item = self._wait_clip
        if item is None:
            self._refuse_self()
            return
        snap = snapshot()
        matched = bool(snap) and (
            snap.signature == item.signature
            or snap.text == item.text
            or bool(item.text and snap.text and item.text[:120] == snap.text[:120])
        )
        if not matched and n < 20:
            set_clipboard_item(item)
            QTimer.singleShot(40, lambda: self._wait_clipboard(n + 1))
            return
        self._deliver_paste()

    def _deliver_paste(self) -> None:
        if self._self_blocks_paste():
            self._refuse_self()
            return
        label = self._paste_lock[1]
        if is_browser(label):
            cache = self._click_cache
            if cache.x() >= 0 and cache.y() >= 0:
                click_at(cache.x(), cache.y())
            QTimer.singleShot(70, self._inject_if_not_self)
            return
        target = self._paste_lock[0]
        now_name = focused_window()
        now_id = active_window_id()
        under = window_at_pointer()
        already = bool(target) and (now_id == target or under[0] == target)
        if target and not already and not is_self(now_name, now_id):
            activate_window(target)
        if self._self_blocks_paste():
            self._refuse_self()
            return
        self._inject_paste()

    def _inject_if_not_self(self) -> None:
        if self._self_blocks_paste():
            self._refuse_self()
            return
        self._inject_paste()

    def pointer_target(self) -> QPoint:
        live = mouse_location(self._last_ptr if self._last_ptr.x() >= 0 else None)
        last = self._last_ptr
        if last.x() >= 0 and looks_captured(live.x(), live.y(), last.x(), last.y()):
            return QPoint(last)
        if live.x() != 0 or live.y() != 0:
            self._last_ptr = QPoint(live)
            return live
        if last.x() >= 0:
            return QPoint(last)
        screen = QGuiApplication.primaryScreen()
        return screen.geometry().center() if screen else QPoint(0, 0)

    def _inject_paste(self) -> None:
        ok, how = send_paste(browser=is_browser(self._paste_lock[1]))
        self.buffer.mute(False)
        QTimer.singleShot(250, lambda: setattr(self, "_mute_clip", False))
        QTimer.singleShot(75, self._forget_click_cache)
        if ok:
            self._notify("Pasted", f"into {short_label(self._paste_lock[1])} via {how}")
        else:
            self._notify(
                "Clipboard set — not injected",
                f"{how}\nPress Shift+Insert or Ctrl+Shift+V in the app.",
            )

    def ingest_paths(self, paths: list[str]) -> None:
        item = item_from_paths(paths)
        if item is None:
            return
        self.buffer.push_item(item)
        set_clipboard_item(item)
        self._refresh_tray()
        self._notify("Copied to KlipRing", item.text[:120])

    def paste_here(self, dest: str) -> None:
        dest_p = Path(dest).expanduser()
        if dest_p.is_file():
            dest_p = dest_p.parent
        if not dest_p.is_dir() or not self.buffer.items:
            return
        item = self.buffer.items[0]
        if not item.uris:
            set_clipboard_item(item)
            self._notify("Clipboard set", "Text clip — paste in an editor (Shift+Insert)")
            return
        n = 0
        for uri in item.uris:
            src = Path(QUrl(uri).toLocalFile())
            if not src.exists():
                continue
            target = dest_p / src.name
            try:
                if src.is_dir():
                    shutil.copytree(src, target, dirs_exist_ok=True)
                else:
                    shutil.copy2(src, target)
                n += 1
            except OSError:
                continue
        self._notify("Pasted", f"{n} item(s) → {dest_p}")

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

    def _on_clipboard(self, *_args) -> None:
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
        for proc in (self._wl, self._wl_primary):
            if proc is not None:
                try:
                    proc.kill()
                except Exception:
                    pass
        self._wl = self._spawn_watch([], restart=True)
        self._wl_primary = self._spawn_watch(["-p"], restart=False)

    def _spawn_watch(self, extra: list[str], restart: bool) -> QProcess:
        proc = QProcess()
        proc.setProgram("wl-paste")
        proc.setArguments([*extra, "--watch", "printf", "."])
        proc.readyReadStandardOutput.connect(self._on_clipboard)
        if restart:
            proc.finished.connect(self._restart_watch)
        proc.start()
        return proc

    def _restart_watch(self) -> None:
        if self._stopping:
            return
        QTimer.singleShot(1200, self._start_watch)

    def stop(self) -> None:
        self._stopping = True
        self._poll.stop()
        self._ptr.stop()
        for proc in (self._wl, self._wl_primary):
            if proc is None:
                continue
            try:
                proc.kill()
                proc.waitForFinished(400)
            except Exception:
                pass
        self._wl = None
        self._wl_primary = None

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
        notify = QAction("Notify on paste", menu)
        notify.setCheckable(True)
        notify.setChecked(self._notify_paste)
        notify.toggled.connect(self._set_notify_paste)
        menu.addAction(notify)
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

    def _set_notify_paste(self, on: bool) -> None:
        self._notify_paste = bool(on)
        self._save_settings()

    def _load_settings(self) -> None:
        path = data_dir() / "settings.json"
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return
        self._notify_paste = bool(data.get("notify_paste", True))

    def _save_settings(self) -> None:
        path = data_dir() / "settings.json"
        path.write_text(
            json.dumps({"notify_paste": self._notify_paste}, indent=2) + "\n",
            encoding="utf-8",
        )

    def _notify(self, title: str, body: str) -> None:
        if title == "Pasted" and not self._notify_paste:
            return
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


def _dbus_call(method: str, *args: object) -> bool:
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
    msg = QDBusMessage.createMethodCall(APP_ID, "/App", "", method)
    if args:
        msg.setArguments(list(args))
    bus.call(msg)
    return True


def _already_running_show() -> bool:
    return _dbus_call("Show")


def run(argv: list[str]) -> int:
    os.environ.pop("XDG_ACTIVATION_TOKEN", None)
    os.environ.pop("DESKTOP_STARTUP_ID", None)
    QApplication.setApplicationName(APP_NAME)
    QApplication.setOrganizationName("klipring")
    QApplication.setDesktopFileName("klipring")
    qapp = QApplication([argv[0]])
    qapp.setQuitOnLastWindowClosed(False)
    qapp.setApplicationVersion(__version__)

    show_only = "--show" in argv
    bind_only = "--bind-shortcut" in argv
    copy_paths: list[str] = []
    if "--copy" in argv:
        copy_paths = [a for a in argv[argv.index("--copy") + 1 :] if not a.startswith("-")]
    paste_dest = ""
    if "--paste-here" in argv:
        rest = argv[argv.index("--paste-here") + 1 :]
        paste_dest = rest[0] if rest else ""

    if bind_only:
        chord = bind_shortcut(DEFAULT_CHORD)
        print(f"Registered {chord} via KGlobalAccel (no sudo).")
        print("System Settings → Keyboard → Shortcuts → KlipRing if it does not fire yet.")
        return 0
    if show_only and _already_running_show():
        return 0
    if copy_paths and _dbus_call("CopyPaths", "\n".join(copy_paths)):
        return 0
    if paste_dest and _dbus_call("PasteHere", paste_dest):
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

    if copy_paths:
        QTimer.singleShot(0, lambda: host.ingest_paths(copy_paths))
    if paste_dest:
        QTimer.singleShot(0, lambda: host.paste_here(paste_dest))
    if show_only:
        QTimer.singleShot(50, host.show_overlay)
    elif not copy_paths and not paste_dest:
        host._notify(APP_NAME, "In the tray. Bind Ctrl+V via the tray menu or: klipring --bind-shortcut")
    try:
        return qapp.exec()
    except KeyboardInterrupt:
        host.stop()
        return 0
