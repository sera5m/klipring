import { clipFilename, downloadTextFile, previewShort } from "./format";
import { useClipboardStore } from "./store";
import { pasteIntoEditor } from "@/lib/desktop/editors";
import { useDesktopStore } from "@/lib/desktop/store";

export function pasteClip(index: number) {
  const { items } = useClipboardStore.getState();
  const item = items[index];
  const desk = useDesktopStore.getState();
  if (!item) {
    desk.notify("Buffer empty", "Copy something first.");
    desk.closeWheel();
    return;
  }
  const ok = pasteIntoEditor(item.text);
  void navigator.clipboard?.writeText(item.text).catch(() => {});
  if (!ok) {
    desk.openApp("kate", { text: item.text, fileName: clipFilename(item) });
  }
  desk.notify("Pasted", previewShort(item.text, 48));
  desk.closeWheel();
}

export function saveClip(index: number) {
  const { items } = useClipboardStore.getState();
  const item = items[index];
  if (!item) return;
  const name = clipFilename(item);
  downloadTextFile(name, item.text);
  useDesktopStore.getState().notify("Saved", name);
}

export function openClipInKate(index: number) {
  const { items } = useClipboardStore.getState();
  const item = items[index];
  if (!item) return;
  const name = clipFilename(item);
  useDesktopStore.getState().openApp("kate", { text: item.text, fileName: name });
  useDesktopStore.getState().notify("Opened in Kate", name);
  useDesktopStore.getState().closeWheel();
}

export function dropClip(index: number): number {
  const next = useClipboardStore.getState().removeAt(index);
  useDesktopStore.getState().notify("Removed", "Slot dropped from the buffer.");
  return next;
}
