import { useRef, type PointerEvent, type ReactNode } from "react";
import { Minus, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDesktopStore, type Win } from "@/lib/desktop/store";

type Props = {
  win: Win;
  focused: boolean;
  children: ReactNode;
  icon?: ReactNode;
};

export function PlasmaWindow({ win, focused, children, icon }: Props) {
  const focus = useDesktopStore((s) => s.focus);
  const move = useDesktopStore((s) => s.move);
  const resize = useDesktopStore((s) => s.resize);
  const toggleMin = useDesktopStore((s) => s.toggleMin);
  const toggleMax = useDesktopStore((s) => s.toggleMax);
  const close = useDesktopStore((s) => s.close);
  const drag = useRef<{ ox: number; oy: number; x: number; y: number } | null>(null);
  const grow = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  if (win.minimized) return null;

  const onDragStart = (e: PointerEvent<HTMLDivElement>) => {
    if (win.maximized) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    focus(win.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { ox: e.clientX, oy: e.clientY, x: win.x, y: win.y };
  };

  const onDragMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.ox;
    const dy = e.clientY - drag.current.oy;
    move(win.id, drag.current.x + dx, Math.max(0, drag.current.y + dy));
  };

  const onDragEnd = () => {
    drag.current = null;
  };

  const onGrowStart = (e: PointerEvent<HTMLDivElement>) => {
    if (win.maximized) return;
    e.stopPropagation();
    e.preventDefault();
    focus(win.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    grow.current = { x: e.clientX, y: e.clientY, w: win.w, h: win.h };
  };

  const onGrowMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!grow.current) return;
    resize(
      win.id,
      grow.current.w + (e.clientX - grow.current.x),
      grow.current.h + (e.clientY - grow.current.y),
    );
  };

  const onGrowEnd = () => {
    grow.current = null;
  };

  return (
    <section
      role="dialog"
      aria-label={win.title}
      onPointerDown={() => focus(win.id)}
      className={cn(
        "plasma-window absolute flex flex-col overflow-hidden rounded-lg",
        focused ? "opacity-100" : "opacity-95 max-sm:hidden",
      )}
      style={{
        zIndex: win.z,
        left: win.maximized ? 8 : win.x,
        top: win.maximized ? 8 : win.y,
        width: win.maximized ? "calc(100% - 16px)" : win.w,
        height: win.maximized ? "calc(100% - 72px)" : win.h,
      }}
    >
      <div
        className="plasma-titlebar flex h-9 shrink-0 items-center gap-2 px-2 select-none"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        onDoubleClick={() => toggleMax(win.id)}
      >
        <span className="grid size-5 place-items-center text-plasma">{icon}</span>
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{win.title}</h2>
        <div className="flex items-center gap-1">
          <ChromeBtn label="Minimize" onClick={() => toggleMin(win.id)}>
            <Minus className="size-3.5" strokeWidth={2.2} />
          </ChromeBtn>
          <ChromeBtn label="Maximize" onClick={() => toggleMax(win.id)}>
            <Square className="size-3" strokeWidth={2.2} />
          </ChromeBtn>
          <ChromeBtn label="Close" danger onClick={() => close(win.id)}>
            <X className="size-3.5" strokeWidth={2.2} />
          </ChromeBtn>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
      {!win.maximized ? (
        <div
          className="absolute right-0 bottom-0 size-4 cursor-nwse-resize"
          onPointerDown={onGrowStart}
          onPointerMove={onGrowMove}
          onPointerUp={onGrowEnd}
          aria-hidden
        />
      ) : null}
    </section>
  );
}

function ChromeBtn({
  children,
  onClick,
  label,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid size-6 place-items-center rounded-sm text-fg-muted transition-colors duration-150",
        danger ? "hover:bg-danger hover:text-fg" : "hover:bg-fg/10 hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
