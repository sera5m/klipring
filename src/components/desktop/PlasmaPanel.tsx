import { useEffect, useState, type ReactNode } from "react";
import {
  Clipboard,
  Folder,
  Settings2,
  SquareTerminal,
  FileCode2,
  Wifi,
  Volume2,
  ChevronUp,
} from "lucide-react";
import { useClipboardStore } from "@/lib/clipboard/store";
import { useDesktopStore, type AppId } from "@/lib/desktop/store";
import { cn } from "@/lib/utils";

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!now) return <span className="tabular-nums text-fg">--:--</span>;
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const day = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return (
    <span className="flex flex-col items-end leading-tight">
      <span className="text-2xs text-fg-muted">{day}</span>
      <span className="text-sm font-medium tabular-nums">
        {hh}:{mm}
      </span>
    </span>
  );
}

export function PlasmaPanel() {
  const windows = useDesktopStore((s) => s.windows);
  const focus = useDesktopStore((s) => s.focus);
  const toggleMin = useDesktopStore((s) => s.toggleMin);
  const kickoff = useDesktopStore((s) => s.kickoff);
  const setKickoff = useDesktopStore((s) => s.setKickoff);
  const openApp = useDesktopStore((s) => s.openApp);
  const openWheel = useDesktopStore((s) => s.openWheel);
  const wheelOpen = useDesktopStore((s) => s.wheel.open);
  const zTop = useDesktopStore((s) => s.zTop);
  const count = useClipboardStore((s) => s.items.length);

  const focused = windows.reduce<(typeof windows)[number] | null>((best, w) => {
    if (w.minimized) return best;
    if (!best || w.z > best.z) return w;
    return best;
  }, null);

  const launch = (app: AppId) => {
    setKickoff(false);
    openApp(app);
  };

  return (
    <>
      {kickoff ? (
        <div className="absolute bottom-14 left-2 z-50 w-64 overflow-hidden rounded-lg border border-border bg-panel/95 shadow-window">
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs text-fg-subtle">Applications</p>
            <p className="text-sm font-semibold">KlipRing</p>
          </div>
          <nav className="flex flex-col p-1">
            <KickItem icon={<FileCode2 className="size-4" />} label="Kate" onClick={() => launch("kate")} />
            <KickItem
              icon={<SquareTerminal className="size-4" />}
              label="Konsole"
              onClick={() => launch("konsole")}
            />
            <KickItem
              icon={<Settings2 className="size-4" />}
              label="KlipRing Settings"
              onClick={() => launch("settings")}
            />
          </nav>
        </div>
      ) : null}

      <footer className="plasma-panel absolute inset-x-0 bottom-0 z-40 flex h-12 items-center gap-1 px-2">
        <button
          type="button"
          aria-label="Application launcher"
          onClick={() => setKickoff(!kickoff)}
          className={cn(
            "grid size-9 place-items-center rounded-md text-plasma transition-colors duration-150",
            kickoff ? "bg-plasma/20" : "hover:bg-fg/10",
          )}
        >
          <MenuMark />
        </button>

        <div className="mx-1 h-6 w-px bg-border" />

        <Pinned icon={<FileCode2 className="size-4" />} label="Kate" onClick={() => launch("kate")} />
        <Pinned icon={<SquareTerminal className="size-4" />} label="Konsole" onClick={() => launch("konsole")} />
        <Pinned icon={<Folder className="size-4" />} label="Settings" onClick={() => launch("settings")} />

        <div className="mx-1 h-6 w-px bg-border" />

        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {windows.map((w) => (
            <button
              key={w.id}
              type="button"
              data-active={focused?.id === w.id && !w.minimized}
              className="task-btn max-w-44 truncate rounded-md px-2 py-1.5 text-left text-xs text-fg hover:bg-fg/10"
              onClick={() => {
                if (w.z === zTop && !w.minimized) toggleMin(w.id);
                else focus(w.id);
              }}
            >
              {w.title.replace(/ — .*$/, "")}
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-label="Open clipboard ring"
          onClick={() => {
            if (wheelOpen) {
              useDesktopStore.getState().closeWheel();
              return;
            }
            openWheel("latch", window.innerWidth / 2, window.innerHeight / 2 - 24);
          }}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-fg hover:bg-fg/10"
        >
          <Clipboard className="size-4 text-ring" />
          <span className="font-mono tabular-nums">{count}</span>
        </button>
        <span className="hidden items-center gap-2 px-1 text-fg-muted sm:flex">
          <ChevronUp className="size-3.5" />
          <Wifi className="size-3.5" />
          <Volume2 className="size-3.5" />
        </span>
        <div className="px-2">
          <Clock />
        </div>
      </footer>
    </>
  );
}

function Pinned({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-md text-fg hover:bg-fg/10"
    >
      {icon}
    </button>
  );
}

function KickItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-plasma/20"
    >
      <span className="text-plasma">{icon}</span>
      {label}
    </button>
  );
}

function MenuMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
      <circle cx="6.5" cy="6.5" r="2.1" />
      <circle cx="17.5" cy="6.5" r="2.1" />
      <circle cx="6.5" cy="17.5" r="2.1" />
      <circle cx="17.5" cy="17.5" r="2.1" />
    </svg>
  );
}
