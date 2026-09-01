import { useEffect, useRef, useState } from "react";
import { insertAtCaret, registerEditor, setFocusedEditor } from "@/lib/desktop/editors";

const BANNER = `       /\\
      /  \\      user@archlinux
     /\\   \\     os     Arch Linux
    /      \\    host   KlipRing
   /   ,,   \\   kernel 6.10.3-arch1-1
  /   |  |  -\\  de     Plasma 6
 /_-''    ''-_\\ wm     KWin (Wayland)

user@archlinux ~ $ pacman -Q plasma-workspace
plasma-workspace 6.1.4-1
user@archlinux ~ $ echo $XDG_CURRENT_DESKTOP
KDE`;

type Props = { windowId: string };

export function Konsole({ windowId }: Props) {
  const [log, setLog] = useState(BANNER);
  const [line, setLine] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return registerEditor({
      id: windowId,
      focus: () => inputRef.current?.focus(),
      insert: (text) => {
        const el = inputRef.current;
        if (!el) {
          setLine((s) => s + text);
          return;
        }
        insertAtCaret(el, text);
        setLine(el.value);
      },
    });
  }, [windowId]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [log, line]);

  const run = () => {
    const cmd = line.trim();
    if (!cmd) {
      setLog((l) => `${l}\n`);
      setLine("");
      return;
    }
    if (cmd === "clear") {
      setLog("");
      setLine("");
      return;
    }
    let out = "";
    if (cmd === "help" || cmd === "klip") {
      out =
        "KlipRing: hold Ctrl+V for the radial clipboard. scroll / 1-9 / arrows to pick. release V to paste.";
    } else if (cmd.startsWith("echo ")) {
      out = cmd.slice(5);
    } else if (cmd === "pwd") {
      out = "/home/user";
    } else if (cmd === "ls") {
      out = "Documents  Downloads  notes  welcome.md";
    } else if (cmd === "neofetch") {
      out = BANNER.split("user@archlinux ~ $")[0]?.trim() ?? "";
    } else {
      out = `bash: ${cmd.split(" ")[0]}: command not found`;
    }
    setLog((l) => `${l}\nuser@archlinux ~ $ ${cmd}\n${out}`);
    setLine("");
  };

  return (
    <div
      className="konsole-screen flex h-full flex-col font-mono text-xs"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex h-7 shrink-0 items-center gap-2 border-b border-border px-2 text-fg-muted">
        <span className="size-2.5 rounded-full bg-danger/80" />
        <span className="size-2.5 rounded-full bg-fg/25" />
        <span className="size-2.5 rounded-full bg-ok/80" />
        <span className="ml-2">~/ — fish</span>
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto px-3 py-2 leading-5">
        <pre className="whitespace-pre-wrap">{log}</pre>
        <form
          className="flex"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <span className="shrink-0 text-plasma">user@archlinux ~ $&nbsp;</span>
          <input
            ref={inputRef}
            value={line}
            aria-label="Terminal input"
            suppressHydrationWarning
            onChange={(e) => setLine(e.target.value)}
            onFocus={() => setFocusedEditor(windowId)}
            onBlur={() => setFocusedEditor(null)}
            className="min-w-0 flex-1 bg-transparent text-fg outline-none"
            autoComplete="off"
            spellCheck={false}
          />
        </form>
      </div>
    </div>
  );
}
