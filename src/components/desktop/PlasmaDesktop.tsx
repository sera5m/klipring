import { useEffect, useState, type ReactNode } from "react";
import { FileCode2, Folder, Settings2, SquareTerminal, Trash2 } from "lucide-react";
import { Kate } from "@/components/apps/Kate";
import { Konsole } from "@/components/apps/Konsole";
import { Settings } from "@/components/apps/Settings";
import { PlasmaPanel } from "@/components/desktop/PlasmaPanel";
import { PlasmaWindow } from "@/components/desktop/PlasmaWindow";
import { RadialClipboard } from "@/components/radial/RadialClipboard";
import { useKlipHotkeys } from "@/hooks/use-klip-hotkeys";
import { previewShort } from "@/lib/clipboard/format";
import { useClipboardStore } from "@/lib/clipboard/store";
import { pasteClip } from "@/lib/clipboard/actions";
import { useDesktopStore, type AppId, type Win } from "@/lib/desktop/store";
import { cn } from "@/lib/utils";

export function PlasmaDesktop() {
  useKlipHotkeys();
  const windows = useDesktopStore((s) => s.windows);
  const notices = useDesktopStore((s) => s.notices);
  const dismissNotice = useDesktopStore((s) => s.dismissNotice);
  const zTop = useDesktopStore((s) => s.zTop);
  const openApp = useDesktopStore((s) => s.openApp);
  const openWheel = useDesktopStore((s) => s.openWheel);
  const setKickoff = useDesktopStore((s) => s.setKickoff);
  const notify = useDesktopStore((s) => s.notify);
  const items = useClipboardStore((s) => s.items);
  const wheelOpen = useDesktopStore((s) => s.wheel.open);

  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [noteHidden, setNoteHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (!cancelled) useClipboardStore.getState().setHydrated(true);
    };
    void Promise.resolve(useClipboardStore.persist.rehydrate()).then(finish, finish);
    const boot = window.setTimeout(() => {
      const desk = useDesktopStore.getState();
      if (!desk.wheel.open) {
        desk.openWheel("latch", window.innerWidth * 0.55, window.innerHeight * 0.42);
      }
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(boot);
    };
  }, []);

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-desktop text-fg">
      <Wallpaper />

      <div
        className="absolute inset-0 bottom-12"
        onContextMenu={(e) => {
          e.preventDefault();
          setKickoff(false);
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        onPointerDown={() => setKickoff(false)}
      />

      <DesktopIcons
        onOpen={openApp}
        onTrash={() => notify("Trash", "Trash is empty.")}
      />

      {!noteHidden ? (
        <aside className="absolute top-6 right-4 z-20 w-56 rounded-md border border-black/10 bg-note p-3 text-note-fg shadow-window sm:w-64">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide uppercase">KlipRing</p>
            <button
              type="button"
              aria-label="Dismiss note"
              className="text-sm leading-none"
              onClick={() => setNoteHidden(true)}
            >
              ×
            </button>
          </div>
          <ul className="space-y-1.5 text-xs leading-5">
            <li>Hold Ctrl+V — wheel on cursor</li>
            <li>Hover a slice (or scroll / 1–9)</li>
            <li>Release V — paste once</li>
            <li>Del — drop slot</li>
            <li>Middle-click — open in Kate</li>
            <li>Ctrl+V then S — save .txt</li>
          </ul>
        </aside>
      ) : null}

      {windows.map((win) => (
        <PlasmaWindow
          key={win.id}
          win={win}
          focused={win.z === zTop && !win.minimized}
          icon={appIcon(win.app)}
        >
          <ClientApp win={win} />
        </PlasmaWindow>
      ))}

      {menu ? (
        <DesktopMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onPasteRecent={() => {
            if (items[0]) pasteClip(0);
          }}
          onOpen={openApp}
          onWheel={() => openWheel("latch", menu.x, menu.y)}
        />
      ) : null}

      <div className="pointer-events-none absolute right-3 bottom-16 z-50 flex w-72 max-w-[calc(100%-1.5rem)] flex-col gap-2">
        {notices.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => dismissNotice(n.id)}
            className="notice-enter pointer-events-auto rounded-md border border-border bg-panel/95 p-3 text-left shadow-window"
          >
            <p className="text-sm font-medium">{n.title}</p>
            <p className="truncate text-xs text-fg-muted">{n.body}</p>
          </button>
        ))}
      </div>

      {!wheelOpen ? (
        <button
          type="button"
          className="absolute bottom-16 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-panel/90 px-4 py-2 text-sm shadow-window sm:hidden"
          onClick={() =>
            openWheel("latch", window.innerWidth / 2, window.innerHeight / 2 - 40)
          }
        >
          Open clip ring
        </button>
      ) : null}

      <RadialClipboard />
      <PlasmaPanel />
    </div>
  );
}

function ClientApp({ win }: { win: Win }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div className="h-full bg-window" />;
  return <AppBody win={win} />;
}

function AppBody({ win }: { win: Win }) {
  if (win.app === "kate") {
    return (
      <Kate windowId={win.id} initialText={win.payload?.text} fileName={win.payload?.fileName} />
    );
  }
  if (win.app === "konsole") return <Konsole windowId={win.id} />;
  return <Settings />;
}

function appIcon(app: AppId): ReactNode {
  if (app === "kate") return <FileCode2 className="size-3.5" />;
  if (app === "konsole") return <SquareTerminal className="size-3.5" />;
  return <Settings2 className="size-3.5" />;
}

function Wallpaper() {
  const [failed, setFailed] = useState(false);
  return (
    <div className="absolute inset-0 bg-desktop">
      {failed ? (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,#2a3340,transparent_55%),linear-gradient(#12161c,#1a2230_55%,#3a2a24)]" />
      ) : (
        <img
          src="/wallpaper.jpg"
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
      <div className="absolute inset-0 bg-desktop/20" />
    </div>
  );
}

function DesktopIcons({
  onOpen,
  onTrash,
}: {
  onOpen: (app: AppId) => void;
  onTrash: () => void;
}) {
  return (
    <div className="absolute top-6 left-4 z-10 flex flex-col gap-4">
      <DeskIcon
        label="Kate"
        onClick={() => onOpen("kate")}
        icon={<FileCode2 className="size-7 text-plasma" />}
      />
      <DeskIcon
        label="Konsole"
        onClick={() => onOpen("konsole")}
        icon={<SquareTerminal className="size-7 text-ok" />}
      />
      <DeskIcon
        label="Settings"
        onClick={() => onOpen("settings")}
        icon={<Settings2 className="size-7 text-fg-muted" />}
      />
      <DeskIcon
        label="Home"
        onClick={() => onOpen("kate")}
        icon={<Folder className="size-7 text-plasma" />}
      />
      <DeskIcon label="Trash" onClick={onTrash} icon={<Trash2 className="size-7 text-fg-subtle" />} />
    </div>
  );
}

function DeskIcon({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="desktop-icon flex w-20 flex-col items-center gap-1">
      <span className="grid size-12 place-items-center rounded-lg bg-desktop/50 shadow-sm backdrop-blur-sm">
        {icon}
      </span>
      <span className="desktop-icon-label rounded-sm px-1 text-center text-xs text-fg drop-shadow">
        {label}
      </span>
    </button>
  );
}

function DesktopMenu({
  x,
  y,
  onClose,
  onPasteRecent,
  onOpen,
  onWheel,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onPasteRecent: () => void;
  onOpen: (app: AppId) => void;
  onWheel: () => void;
}) {
  const recent = useClipboardStore((s) => s.items[0]);
  return (
    <div
      className="absolute z-50 min-w-48 overflow-hidden rounded-md border border-border bg-panel py-1 text-sm shadow-window"
      style={{ left: x, top: y }}
      onClick={onClose}
    >
      <MenuRow
        label={recent ? `Paste “${previewShort(recent.text, 22)}”` : "Paste"}
        onClick={onPasteRecent}
        disabled={!recent}
      />
      <MenuRow label="Open clip ring" onClick={onWheel} />
      <div className="my-1 h-px bg-border" />
      <MenuRow label="Kate" onClick={() => onOpen("kate")} />
      <MenuRow label="Konsole" onClick={() => onOpen("konsole")} />
      <MenuRow label="Settings" onClick={() => onOpen("settings")} />
    </div>
  );
}

function MenuRow({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "block w-full px-3 py-1.5 text-left hover:bg-plasma/25",
        disabled && "opacity-40",
      )}
    >
      {label}
    </button>
  );
}
