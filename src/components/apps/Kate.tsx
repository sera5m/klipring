import { useEffect, useRef, useState } from "react";
import { insertAtCaret, registerEditor, setFocusedEditor } from "@/lib/desktop/editors";

const WELCOME = `# Welcome to KlipRing

A Plasma-style radial clipboard lives on this desktop.

1. Select any of this text
2. Press Ctrl+C — the clip lands at slot 1 (most recent)
3. Hold Ctrl+V — a hollow purple wheel opens on the cursor
4. Scroll, press 1–9 / 0, or use arrows to walk the ring
5. Release V (or Enter) to paste into this editor

Delete / Backspace drops the highlighted slot.
Middle-click a slot to open it in a new Kate window.
Hold Ctrl+V and press S to save the slot as a .txt file.

Capacity defaults to 20 (inner 8, outer 12). Open Settings to resize the buffer.
`;

type Props = {
  windowId: string;
  initialText?: string;
  fileName?: string;
};

export function Kate({ windowId, initialText, fileName }: Props) {
  const [value, setValue] = useState(initialText ?? WELCOME);
  const [caret, setCaret] = useState({ line: 1, col: 1 });
  const ref = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return registerEditor({
      id: windowId,
      focus: () => ref.current?.focus(),
      insert: (text) => {
        const el = ref.current;
        if (!el) return;
        insertAtCaret(el, text);
        setValue(el.value);
        updateCaret(el);
      },
    });
  }, [windowId]);

  const updateCaret = (el: HTMLTextAreaElement) => {
    const pos = el.selectionStart ?? 0;
    const upto = el.value.slice(0, pos);
    const line = upto.split("\n").length;
    const col = pos - (upto.lastIndexOf("\n") + 1) + 1;
    setCaret({ line, col });
  };

  const lines = value.split("\n");
  const lineCount = Math.max(lines.length, 1);

  return (
    <div className="flex h-full flex-col bg-window">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border px-2 text-xs">
        <span className="rounded-sm bg-inset px-2 py-1 text-fg">{fileName ?? "welcome.md"}</span>
        <span className="text-fg-subtle">UTF-8</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div
          ref={gutterRef}
          className="kate-gutter w-10 shrink-0 overflow-hidden py-2 pr-2 text-right font-mono text-xs leading-5 select-none"
          aria-hidden
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={ref}
          value={value}
          spellCheck={false}
          aria-label={fileName ?? "Kate editor"}
          suppressHydrationWarning
          onScroll={(e) => {
            if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
          }}
          onChange={(e) => {
            setValue(e.target.value);
            updateCaret(e.target);
          }}
          onSelect={(e) => updateCaret(e.currentTarget)}
          onFocus={() => setFocusedEditor(windowId)}
          onBlur={() => setFocusedEditor(null)}
          className="min-h-0 flex-1 resize-none bg-transparent px-2 py-2 font-mono text-xs leading-5 text-fg outline-none"
        />
      </div>
      <div className="flex h-6 shrink-0 items-center justify-between border-t border-border px-3 font-mono text-xs text-fg-muted tabular-nums">
        <span>INS</span>
        <span>
          Ln {caret.line}, Col {caret.col}
        </span>
        <span>{value.length} chars</span>
      </div>
    </div>
  );
}
