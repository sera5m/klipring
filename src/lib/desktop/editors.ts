export type EditorHandle = {
  id: string;
  insert: (text: string) => void;
  focus: () => void;
};

const editors = new Map<string, EditorHandle>();
let focusedId: string | null = null;
let lastId: string | null = null;

export function registerEditor(handle: EditorHandle) {
  editors.set(handle.id, handle);
  if (!lastId) lastId = handle.id;
  return () => {
    editors.delete(handle.id);
    if (focusedId === handle.id) focusedId = null;
    if (lastId === handle.id) lastId = [...editors.keys()].at(-1) ?? null;
  };
}

export function setFocusedEditor(id: string | null) {
  focusedId = id;
  if (id) lastId = id;
}

export function pasteIntoEditor(text: string): boolean {
  const id = focusedId ?? lastId;
  if (!id) return false;
  const handle = editors.get(id);
  if (!handle) return false;
  handle.focus();
  handle.insert(text);
  return true;
}

export function insertAtCaret(
  el: HTMLTextAreaElement | HTMLInputElement,
  text: string,
) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);
  const next = before + text + after;
  el.value = next;
  const caret = start + text.length;
  el.setSelectionRange(caret, caret);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function selectedTextFromTarget(target: EventTarget | null): string {
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    if (end > start) return target.value.slice(start, end);
  }
  return window.getSelection()?.toString() ?? "";
}
