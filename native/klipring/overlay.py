from __future__ import annotations

import math
import time
from typing import Callable

from PySide6.QtCore import QPoint, QRectF, Qt, QTimer
from PySide6.QtGui import (
    QColor,
    QCursor,
    QFont,
    QGuiApplication,
    QIcon,
    QKeyEvent,
    QMouseEvent,
    QPainter,
    QPainterPath,
    QPen,
    QRadialGradient,
    QWheelEvent,
)
from PySide6.QtWidgets import QWidget

from .buffer import ClipboardBuffer
from .pointer import clamp_origin
from .geometry import (
    badge_for_index,
    format_age,
    format_kib,
    hit_index_at,
    index_from_digit,
    locate,
    preview,
    ring_count_for,
    slots_on_ring,
    start_index_of_ring,
)


RING = QColor("#9b6dff")
RING_DEEP = QColor("#5b2fd1")
PLASMA = QColor("#3daee9")
FG = QColor("#eff0f1")
MUTED = QColor("#a8b0b4")
GLASS = QColor(22, 18, 32, 150)
CARD = QColor(28, 24, 40, 200)


class Overlay(QWidget):
    def __init__(
        self,
        buffer: ClipboardBuffer,
        on_paste: Callable[[int], None],
        on_drop: Callable[[int], int],
        on_open: Callable[[int], None],
        on_save: Callable[[int], None],
    ) -> None:
        super().__init__(
            None,
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.Tool
            | Qt.WindowType.NoDropShadowWindowHint,
        )
        self.buffer = buffer
        self.on_paste = on_paste
        self.on_drop = on_drop
        self.on_open = on_open
        self.on_save = on_save
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setAttribute(Qt.WidgetAttribute.WA_NoSystemBackground, True)
        self.setMouseTracking(True)
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)
        self.origin = QPoint(0, 0)
        self.target = QPoint(0, 0)
        self.selected = 0
        self.v_down = True
        self.inner = 124.0
        self.thick = 140.0
        self.gap = 36.0
        self._tick = QTimer(self)
        self._tick.setInterval(1000)
        self._tick.timeout.connect(self.update)
        self._chord = QTimer(self)
        self._chord.setInterval(16)
        self._chord.timeout.connect(self._poll_chord)
        self._icons: dict[str, QIcon] = {}
        self._done = False
        self._armed_at = 0.0
        self._saw_ctrl = False

    def popup(self, pos: QPoint | None = None) -> None:
        if self.isVisible():
            return
        raw = pos if pos is not None else QCursor.pos()
        screen = QGuiApplication.screenAt(raw) or QGuiApplication.primaryScreen()
        geo = screen.availableGeometry()
        if not geo.contains(raw):
            geo = screen.geometry()
            if not geo.contains(raw):
                raw = geo.center()
        self._fit_to(geo.width(), geo.height())
        radius = self._max_radius()
        pad = 96
        ox, oy = clamp_origin(
            raw.x(), raw.y(), geo.left(), geo.top(), geo.right(), geo.bottom(), radius, pad=pad
        )
        side = int(2 * (radius + pad) + 8)
        self.target = raw
        self.origin = QPoint(int(ox), int(oy))
        self.selected = 0
        self.v_down = True
        self._done = False
        self._saw_ctrl = False
        self._armed_at = time.monotonic()
        self.setGeometry(int(ox - side / 2), int(oy - side / 2), side, side)
        self._tick.start()
        self._chord.start()
        self.show()
        self.raise_()
        handle = self.windowHandle()
        if handle is not None:
            handle.requestActivate()
        self.setFocus(Qt.FocusReason.ActiveWindowFocusReason)
        self.update()

    def _poll_chord(self) -> None:
        if self._done or not self.isVisible():
            return
        mods = QGuiApplication.queryKeyboardModifiers()
        ctrl = bool(mods & Qt.KeyboardModifier.ControlModifier)
        if ctrl:
            self._saw_ctrl = True
            return
        if self._saw_ctrl and time.monotonic() - self._armed_at > 0.08:
            self.dismiss(True)

    def dismiss(self, paste: bool = False) -> None:
        if self._done:
            return
        self._done = True
        self._tick.stop()
        self._chord.stop()
        self.hide()
        if paste and self.buffer.items:
            idx = max(0, min(self.selected, len(self.buffer.items) - 1))
            self.on_paste(idx)

    def _max_radius(self) -> float:
        n = max(1, len(self.buffer.items))
        rings = ring_count_for(n)
        return self.inner + self.thick + (rings - 1) * (self.thick + self.gap)

    def _fit(self) -> None:
        self._fit_to(self.width() or 800, self.height() or 800)

    def _fit_to(self, width: float, height: float) -> None:
        self.inner = 124.0
        self.thick = 140.0
        self.gap = 36.0
        max_r = self._max_radius()
        budget = min(width, height) / 2 - 28
        scale = min(1.0, budget / (max_r + 8)) if max_r else 1.0
        self.inner = 124.0 * scale
        self.thick = 140.0 * scale
        self.gap = 36.0 * scale

    def _kind_icon(self, kind: str) -> QIcon:
        cached = self._icons.get(kind)
        if cached is not None:
            return cached
        names = {
            "text": ("text-x-generic", "text-plain", "document"),
            "file": ("unknown", "application-x-generic", "text-x-generic"),
            "directory": ("folder", "inode-directory", "folder-open"),
            "files": ("document-multiple", "folder-copy", "edit-copy"),
        }
        icon = QIcon()
        for name in names.get(kind, ("text-x-generic",)):
            ic = QIcon.fromTheme(name)
            if not ic.isNull():
                icon = ic
                break
        if icon.isNull():
            icon = QIcon.fromTheme("edit-paste")
        self._icons[kind] = icon
        return icon

    def _draw_target_arrow(self, p: QPainter, ox: float, oy: float) -> None:
        tx = self.target.x() - self.x()
        ty = self.target.y() - self.y()
        dx = tx - ox
        dy = ty - oy
        dist = math.hypot(dx, dy)
        if dist < 14:
            return
        ang = math.atan2(dy, dx)
        p.save()
        p.translate(ox, oy)
        p.rotate(math.degrees(ang))
        glow = QColor(PLASMA)
        glow.setAlpha(180)
        p.setPen(Qt.PenStyle.NoPen)
        p.setBrush(glow)
        tip = 22
        arrow = QPainterPath()
        arrow.moveTo(tip, 0)
        arrow.lineTo(tip - 16, 7)
        arrow.lineTo(tip - 16, -7)
        arrow.closeSubpath()
        p.drawPath(arrow)
        p.restore()
        p.setPen(QPen(PLASMA, 2))
        p.setBrush(QColor(61, 174, 233, 220))
        p.drawEllipse(QRectF(tx - 3.5, ty - 3.5, 7, 7))

    def paintEvent(self, _event) -> None:
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        items = self.buffer.items
        ox, oy = self.origin.x() - self.x(), self.origin.y() - self.y()
        n = len(items)
        rings = ring_count_for(max(1, n))
        selected = min(self.selected, n - 1) if n else 0

        for r in range(rings):
            outer = self.inner + self.thick + r * (self.thick + self.gap)
            inner_r = outer - self.thick
            band = QPainterPath()
            band.addEllipse(QRectF(ox - outer, oy - outer, outer * 2, outer * 2))
            hole = QPainterPath()
            hole.addEllipse(QRectF(ox - inner_r, oy - inner_r, inner_r * 2, inner_r * 2))
            path = band.subtracted(hole)
            grad = QRadialGradient(ox, oy, outer)
            c = QColor(RING)
            c.setAlpha(70)
            grad.setColorAt(inner_r / outer, QColor(RING_DEEP.red(), RING_DEEP.green(), RING_DEEP.blue(), 50))
            grad.setColorAt(1.0, c)
            p.fillPath(path, grad)

            slots = slots_on_ring(r)
            start = start_index_of_ring(r)
            step = (math.pi * 2) / slots
            pad = min(0.02, step * 0.045)
            for slot in range(slots):
                index = start + slot
                occupied = index < n
                active = occupied and index == selected
                a0 = -math.pi / 2 + slot * step - step / 2 + pad
                a1 = a0 + step - pad * 2
                slice_path = _annular(ox, oy, inner_r + 2, outer - 2, a0, a1)
                if active:
                    fill = QColor("#6fd4f6")
                    fill.setAlpha(220)
                    p.fillPath(slice_path, fill)
                    edge = QPen(QColor("#f2fdff"), 4.6)
                    edge.setJoinStyle(Qt.PenJoinStyle.RoundJoin)
                    p.setPen(edge)
                    p.drawPath(slice_path)
                    p.setPen(QPen(QColor("#3daee9"), 2.0))
                elif occupied:
                    fill = QColor(RING)
                    fill.setAlpha(50)
                    p.fillPath(slice_path, fill)
                    p.setPen(QPen(QColor(155, 109, 255, 160), 1.4))
                else:
                    fill = QColor(RING)
                    fill.setAlpha(20)
                    p.fillPath(slice_path, fill)
                    p.setPen(QPen(QColor(155, 109, 255, 70), 1.0))
                p.drawPath(slice_path)

        now = time.time()
        for i, item in enumerate(items):
            ring, slot, slots = locate(i)
            angle = -math.pi / 2 + slot * ((math.pi * 2) / slots)
            inner_r = self.inner + ring * (self.thick + self.gap)
            ir = inner_r + min(24.0, self.thick * 0.2)
            ix = ox + math.cos(angle) * ir
            iy = oy + math.sin(angle) * ir
            pix = self._kind_icon(item.kind).pixmap(28, 28)
            p.drawPixmap(int(ix - pix.width() / 2), int(iy - pix.height() / 2), pix)

        font = QFont("Noto Sans", 9)
        p.setFont(font)
        for i, item in enumerate(items):
            ring, slot, slots = locate(i)
            radius = self.inner + self.thick / 2 + ring * (self.thick + self.gap)
            angle = -math.pi / 2 + slot * ((math.pi * 2) / slots)
            x = ox + math.cos(angle) * radius
            y = oy + math.sin(angle) * radius
            active = i == selected
            w, h = (196, 78) if active else (132, 52)
            card = QRectF(x - w / 2, y - h / 2, w, h)
            p.setPen(QPen(QColor("#f2fdff") if active else QColor(155, 109, 255, 140), 3.0 if active else 1.5))
            p.setBrush(QColor(88, 58, 140, 245) if active else CARD)
            p.drawRoundedRect(card, 8, 8)
            age = format_age(now - item.copied_at)
            badge = badge_for_index(i)
            meta = _size_label(item)
            p.setPen(FG)
            header = f"{badge}  {meta} · {age}"
            p.drawText(card.adjusted(8, 6, -8, -8), Qt.AlignmentFlag.AlignTop | Qt.AlignmentFlag.AlignLeft, header)
            p.setPen(MUTED if not active else FG)
            body = preview(item.text, 128 if active else 32)
            p.drawText(
                card.adjusted(8, 22, -8, -6),
                Qt.TextFlag.TextWordWrap | Qt.AlignmentFlag.AlignTop,
                body,
            )

        p.setPen(PLASMA)
        p.setFont(QFont("Noto Sans Mono", 10))
        label = f"{selected + 1}/{n}" if n else "0/0"
        p.drawText(
            QRectF(ox - 60, oy - 22, 120, 44),
            Qt.AlignmentFlag.AlignCenter,
            f"{label}\nrelease V to paste" if n else "empty — copy text or a file",
        )
        self._draw_target_arrow(p, ox, oy)
        p.end()

    def keyPressEvent(self, event: QKeyEvent) -> None:
        if event.isAutoRepeat():
            if event.key() == Qt.Key.Key_V:
                event.accept()
            return
        key = event.key()
        items = self.buffer.items
        n = len(items)
        if key in (Qt.Key.Key_Escape,):
            self.dismiss(False)
            return
        if key in (Qt.Key.Key_Return, Qt.Key.Key_Enter):
            self.dismiss(True)
            return
        if key in (Qt.Key.Key_Delete, Qt.Key.Key_Backspace) and n:
            self.selected = self.on_drop(self.selected)
            self.update()
            return
        if key == Qt.Key.Key_S:
            self.on_save(self.selected)
            return
        if key in (Qt.Key.Key_Right, Qt.Key.Key_Down) and n:
            self.selected = (self.selected + 1) % n
            self.update()
            return
        if key in (Qt.Key.Key_Left, Qt.Key.Key_Up) and n:
            self.selected = (self.selected - 1) % n
            self.update()
            return
        text = event.text()
        digit = index_from_digit(text)
        if digit is not None and digit < n:
            self.selected = digit
            self.update()
        event.accept()

    def keyReleaseEvent(self, event: QKeyEvent) -> None:
        if event.isAutoRepeat():
            return
        if event.key() == Qt.Key.Key_V:
            if time.monotonic() - self._armed_at < 0.07:
                return
            self.v_down = False
            self.dismiss(True)
            return
        if event.key() in (Qt.Key.Key_Control, Qt.Key.Key_Meta) and not self.v_down:
            self.dismiss(False)

    def mouseMoveEvent(self, event: QMouseEvent) -> None:
        ox, oy = self.origin.x() - self.x(), self.origin.y() - self.y()
        hit = hit_index_at(
            event.position().x() - ox,
            event.position().y() - oy,
            len(self.buffer.items),
            self.inner,
            self.thick,
            self.gap,
        )
        if hit is not None and hit != self.selected:
            self.selected = hit
            self.update()

    def mousePressEvent(self, event: QMouseEvent) -> None:
        if event.button() == Qt.MouseButton.MiddleButton:
            self.on_open(self.selected)
            self.dismiss(False)
            return
        if event.button() == Qt.MouseButton.LeftButton:
            ox, oy = self.origin.x() - self.x(), self.origin.y() - self.y()
            hit = hit_index_at(
                event.position().x() - ox,
                event.position().y() - oy,
                len(self.buffer.items),
                self.inner,
                self.thick,
                self.gap,
            )
            if hit is None:
                self.dismiss(False)
            else:
                self.selected = hit
                self.dismiss(True)

    def wheelEvent(self, event: QWheelEvent) -> None:
        n = len(self.buffer.items)
        if n <= 0:
            return
        delta = 1 if event.angleDelta().y() < 0 else -1
        self.selected = (self.selected + delta) % n
        self.update()
        event.accept()


def _annular(cx: float, cy: float, r_in: float, r_out: float, a0: float, a1: float) -> QPainterPath:
    path = QPainterPath()
    steps = max(10, int(abs(a1 - a0) / 0.06))
    path.moveTo(cx + math.cos(a0) * r_out, cy + math.sin(a0) * r_out)
    for i in range(1, steps + 1):
        t = a0 + (a1 - a0) * i / steps
        path.lineTo(cx + math.cos(t) * r_out, cy + math.sin(t) * r_out)
    path.lineTo(cx + math.cos(a1) * r_in, cy + math.sin(a1) * r_in)
    for i in range(1, steps + 1):
        t = a1 - (a1 - a0) * i / steps
        path.lineTo(cx + math.cos(t) * r_in, cy + math.sin(t) * r_in)
    path.closeSubpath()
    return path


def _size_label(item) -> str:
    if getattr(item, "kind", "text") == "files":
        return f"{len(item.uris)} items"
    if getattr(item, "kind", "") == "directory":
        return "folder"
    if getattr(item, "kind", "") == "file" and getattr(item, "uris", None):
        from pathlib import Path

        from PySide6.QtCore import QUrl

        path = Path(QUrl(item.uris[0]).toLocalFile())
        try:
            if path.is_file():
                return _kib(path.stat().st_size)
        except OSError:
            return "file"
        return "file"
    return format_kib(item.text)


def _kib(n: int) -> str:
    kib = n / 1024
    if kib < 0.01:
        return f"{kib:.3f} KiB"
    if kib < 10:
        return f"{kib:.2f} KiB"
    if kib < 100:
        return f"{kib:.1f} KiB"
    return f"{round(kib)} KiB"
