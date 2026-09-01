import { useEffect } from "react";
import { indexFromDigitKey } from "@/lib/clipboard/types";
import { dropClip, openClipInKate, pasteClip, saveClip } from "@/lib/clipboard/actions";
import { selectedTextFromTarget } from "@/lib/desktop/editors";
import { useClipboardStore } from "@/lib/clipboard/store";
import { useDesktopStore } from "@/lib/desktop/store";
import { previewShort } from "@/lib/clipboard/format";

function isMod(e: KeyboardEvent) {
  return e.ctrlKey || e.metaKey;
}

function stepIndex(current: number, delta: number, length: number): number {
  if (length <= 0) return 0;
  return (current + delta + length * 8) % length;
}

function arrowDelta(key: string): number | null {
  if (key === "ArrowRight" || key === "ArrowDown") return 1;
  if (key === "ArrowLeft" || key === "ArrowUp") return -1;
  return null;
}

export function useKlipHotkeys() {
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      useDesktopStore.getState().setPointer(e.clientX, e.clientY);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const desk = useDesktopStore.getState();
      const clip = useClipboardStore.getState();
      const { wheel } = desk;

      if (e.key === "Control" || e.key === "Meta") {
        desk.setMod({ ctrlDown: true });
      }

      const mod = isMod(e);
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const isV = key === "v" || e.code === "KeyV";

      // Swallow Ctrl+V entirely — including auto-repeat — so the browser
      // does not keep pasting while the chord is held.
      if (mod && isV) {
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return;
        desk.setMod({ ctrlDown: true, vDown: true });
        if (!wheel.open) {
          const { x, y } = useDesktopStore.getState().pointer;
          desk.openWheel("hold", x, y);
        }
        return;
      }

      if (!wheel.open) {
        if (key === "Escape") desk.setKickoff(false);
        return;
      }

      if (key === "Escape") {
        e.preventDefault();
        desk.closeWheel();
        return;
      }

      if (key === "Enter") {
        e.preventDefault();
        if (!e.repeat) pasteClip(wheel.selected);
        return;
      }

      if (key === "Backspace" || key === "Delete") {
        e.preventDefault();
        desk.setSelected(dropClip(wheel.selected));
        return;
      }

      if ((mod || wheel.mode === "latch") && key === "s") {
        e.preventDefault();
        saveClip(wheel.selected);
        return;
      }

      const digitIndex = indexFromDigitKey(e.key);
      if (digitIndex != null) {
        e.preventDefault();
        if (digitIndex < clip.items.length) desk.setSelected(digitIndex);
        return;
      }

      const delta = arrowDelta(key);
      if (delta != null) {
        e.preventDefault();
        desk.setSelected(stepIndex(wheel.selected, delta, clip.items.length));
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const desk = useDesktopStore.getState();
      const { wheel } = desk;
      if (e.key === "Control" || e.key === "Meta") {
        desk.setMod({ ctrlDown: false });
        if (wheel.open && wheel.mode === "hold" && !wheel.vDown) {
          desk.closeWheel();
        }
        return;
      }
      if (e.key === "v" || e.key === "V" || e.code === "KeyV") {
        e.preventDefault();
        e.stopPropagation();
        const shouldPaste = wheel.open && wheel.mode === "hold" && wheel.vDown;
        desk.setMod({ vDown: false });
        if (shouldPaste) pasteClip(wheel.selected);
      }
    };

    const onWheel = (e: WheelEvent) => {
      const desk = useDesktopStore.getState();
      if (!desk.wheel.open) return;
      e.preventDefault();
      const len = useClipboardStore.getState().items.length;
      const dir = e.deltaY > 0 ? 1 : -1;
      desk.setSelected(stepIndex(desk.wheel.selected, dir, len));
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1 && useDesktopStore.getState().wheel.open) {
        e.preventDefault();
      }
    };

    const onAux = (e: MouseEvent) => {
      const desk = useDesktopStore.getState();
      if (!desk.wheel.open || e.button !== 1) return;
      e.preventDefault();
      openClipInKate(desk.wheel.selected);
    };

    const onCopy = () => {
      const text =
        selectedTextFromTarget(document.activeElement) || window.getSelection()?.toString() || "";
      if (!text) return;
      const item = useClipboardStore.getState().push(text);
      if (item) useDesktopStore.getState().notify("Copied", previewShort(item.text, 48));
    };

    const onPaste = (e: ClipboardEvent) => {
      if (!useDesktopStore.getState().wheel.open) return;
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("auxclick", onAux, true);
    document.addEventListener("copy", onCopy, true);
    document.addEventListener("paste", onPaste, true);

    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("wheel", onWheel, true);
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("auxclick", onAux, true);
      document.removeEventListener("copy", onCopy, true);
      document.removeEventListener("paste", onPaste, true);
    };
  }, []);
}
