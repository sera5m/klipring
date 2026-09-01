import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  badgeForIndex,
  hitIndexAt,
  locateOnWheel,
  ringCountFor,
  slotsOnRing,
  startIndexOfRing,
} from "@/lib/clipboard/types";
import { clipAgeMs, formatAge, formatKib, preview128, previewShort } from "@/lib/clipboard/format";
import { openClipInKate, pasteClip, saveClip } from "@/lib/clipboard/actions";
import { useClipboardStore } from "@/lib/clipboard/store";
import { useDesktopStore } from "@/lib/desktop/store";
import { cn } from "@/lib/utils";

function useNow(active: boolean) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

function layout(count: number, originX: number, originY: number, vw: number, vh: number) {
  const rings = Math.max(1, ringCountFor(count));
  const mobile = vw < 640;
  const inner = mobile ? 70 : 124;
  const thick = mobile ? 92 : 140;
  const gap = mobile ? 18 : 36;
  const maxR = inner + thick + (rings - 1) * (thick + gap);
  const size = (maxR + thick * 0.15) * 2 + 8;
  const fitW = vw - (mobile ? 12 : 24);
  const fitH = vh - (mobile ? 150 : 96);
  const scale = Math.min(1, fitW / size, fitH / size);
  const visual = size * scale;
  const pad = visual / 2 + 8;
  const cx = Math.min(Math.max(originX, pad), vw - pad);
  const cy = Math.min(Math.max(originY, pad + 8), vh - 64 - pad);
  return { rings, inner, thick, gap, maxR, cx, cy, mobile, size, scale };
}

function annularSector(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  a0: number,
  a1: number,
) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const x0o = cx + Math.cos(a0) * rOuter;
  const y0o = cy + Math.sin(a0) * rOuter;
  const x1o = cx + Math.cos(a1) * rOuter;
  const y1o = cy + Math.sin(a1) * rOuter;
  const x1i = cx + Math.cos(a1) * rInner;
  const y1i = cy + Math.sin(a1) * rInner;
  const x0i = cx + Math.cos(a0) * rInner;
  const y0i = cy + Math.sin(a0) * rInner;
  return `M ${x0o} ${y0o} A ${rOuter} ${rOuter} 0 ${large} 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${rInner} ${rInner} 0 ${large} 0 ${x0i} ${y0i} Z`;
}

export function RadialClipboard() {
  const wheel = useDesktopStore((s) => s.wheel);
  const items = useClipboardStore((s) => s.items);
  const setSelected = useDesktopStore((s) => s.setSelected);
  const closeWheel = useDesktopStore((s) => s.closeWheel);
  const now = useNow(wheel.open);
  const [vp, setVp] = useState({ w: 1280, h: 800 });

  useEffect(() => {
    const measure = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const geo = useMemo(
    () => layout(Math.max(items.length, 1), wheel.originX, wheel.originY, vp.w, vp.h),
    [items.length, wheel.originX, wheel.originY, vp.w, vp.h],
  );

  if (!wheel.open || typeof document === "undefined") return null;

  const selected = items.length ? Math.min(wheel.selected, items.length - 1) : 0;
  const selectedItem = items[selected];
  const size = geo.size;

  const hoverSelect = (clientX: number, clientY: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dx = ((clientX - rect.left) / rect.width) * size - size / 2;
    const dy = ((clientY - rect.top) / rect.height) * size - size / 2;
    const hit = hitIndexAt(dx, dy, items.length, geo.inner, geo.thick, geo.gap);
    if (hit != null) setSelected(hit);
  };

  const content = (
    <div className="pointer-events-none fixed inset-0 z-[80]" role="presentation">
      {wheel.mode === "latch" ? (
        <div
          className="pointer-events-auto absolute inset-0"
          onClick={() => closeWheel()}
          aria-hidden
        />
      ) : null}

      <div
        className="pointer-events-auto wheel-enter absolute"
        role="listbox"
        aria-label="Clipboard ring"
        aria-activedescendant={selectedItem ? `clip-${selectedItem.id}` : undefined}
        onPointerMove={(e) => hoverSelect(e.clientX, e.clientY, e.currentTarget)}
        style={{
          left: geo.cx - (size * geo.scale) / 2,
          top: geo.cy - (size * geo.scale) / 2,
          width: size,
          height: size,
          transform: `scale(${geo.scale})`,
          transformOrigin: "top left",
        }}
      >
        {Array.from({ length: geo.rings }, (_, r) => {
          const outer = geo.inner + geo.thick + r * (geo.thick + geo.gap);
          const innerR = outer - geo.thick;
          const dim = outer * 2;
          const mask = `radial-gradient(circle, transparent ${((innerR / outer) * 100).toFixed(2)}%, #000 ${((innerR / outer) * 100 + 0.4).toFixed(2)}%)`;
          return (
            <div
              key={r}
              className="ring-band pointer-events-none absolute rounded-full"
              style={{
                width: dim,
                height: dim,
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                WebkitMaskImage: mask,
                maskImage: mask,
              }}
            />
          );
        })}

        <svg className="absolute inset-0" viewBox={`0 0 ${size} ${size}`} aria-hidden>
          {Array.from({ length: geo.rings }, (_, r) => {
            const slots = slotsOnRing(r);
            const start = startIndexOfRing(r);
            const rOuter = geo.inner + geo.thick + r * (geo.thick + geo.gap);
            const rInner = rOuter - geo.thick;
            const cx = size / 2;
            const cy = size / 2;
            const step = (Math.PI * 2) / slots;
            const pad = Math.min(0.02, step * 0.045);
            return Array.from({ length: slots }, (__, slot) => {
              const index = start + slot;
              const occupied = index < items.length;
              const active = occupied && index === selected;
              const a0 = -Math.PI / 2 + slot * step - step / 2 + pad;
              const a1 = a0 + step - pad * 2;
              const state = active ? "active" : occupied ? "full" : "empty";
              return (
                <path
                  key={`${r}-${slot}`}
                  d={annularSector(cx, cy, rInner + 1.5, rOuter - 1.5, a0, a1)}
                  className="ring-slice"
                  data-state={state}
                  onPointerEnter={() => {
                    if (occupied) setSelected(index);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!occupied) return;
                    setSelected(index);
                    if (wheel.mode === "latch") pasteClip(index);
                  }}
                />
              );
            });
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-0.5 text-center">
            <span className="font-mono text-xs text-plasma tabular-nums">
              {items.length ? `${selected + 1}/${items.length}` : "0/0"}
            </span>
            <span className="max-w-32 text-2xs leading-tight text-fg-muted">
              {wheel.mode === "hold" ? "hover a slice · release V" : "hover · click to paste"}
            </span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="glass-card pointer-events-none absolute top-1/2 left-1/2 w-48 -translate-x-1/2 translate-y-10 rounded-md px-3 py-2 text-center text-xs text-fg-muted">
            Buffer empty. Copy something first.
          </div>
        ) : null}

        {items.map((item, i) => {
          const { ring: r, slot, slots } = locateOnWheel(i);
          const radius = geo.inner + geo.thick / 2 + r * (geo.thick + geo.gap);
          const angle = -Math.PI / 2 + slot * ((Math.PI * 2) / slots);
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const active = i === selected;
          const badge = badgeForIndex(i);
          const age = formatAge(clipAgeMs(item, now || Date.now()));
          return (
            <div
              key={item.id}
              id={`clip-${item.id}`}
              role="option"
              aria-selected={active}
              className={cn(
                "glass-card pointer-events-none absolute rounded-md px-2 py-1.5 text-left transition-[transform,opacity,border-color] duration-150 ease-out",
                active ? "glass-card-active z-10" : "z-0 opacity-90",
              )}
              style={{
                width: active ? (geo.mobile ? 156 : 196) : geo.mobile ? 112 : 132,
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${active ? 1.05 : 1})`,
              }}
            >
              <div className="flex items-center gap-1.5">
                {badge ? (
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full font-mono text-2xs font-semibold tabular-nums",
                      active ? "bg-plasma text-plasma-fg" : "bg-fg/10 text-fg-muted",
                    )}
                  >
                    {badge}
                  </span>
                ) : (
                  <span className="grid size-5 shrink-0 place-items-center font-mono text-2xs text-fg-subtle tabular-nums">
                    {i + 1}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate font-mono text-2xs text-fg-subtle tabular-nums">
                  {formatKib(item.text)} · {age}
                </span>
              </div>
              <p
                className={cn(
                  "mt-1 font-sans text-fg",
                  active ? "line-clamp-4 text-xs leading-4" : "truncate text-xs leading-4",
                )}
              >
                {active ? preview128(item.text) : previewShort(item.text, geo.mobile ? 22 : 32)}
              </p>
            </div>
          );
        })}
      </div>

      {selectedItem ? (
        <div className="pointer-events-auto absolute inset-x-0 bottom-16 z-[81] mx-auto w-full max-w-xl px-3">
          <div className="glass-card flex flex-wrap items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-fg-muted">
            <span className="hidden sm:inline">Release V to paste</span>
            <span>Del drop</span>
            <span>MMB Kate</span>
            <span>S save</span>
            <button
              type="button"
              className="rounded-sm bg-plasma px-2 py-1 font-medium text-plasma-fg"
              onClick={() => pasteClip(selected)}
            >
              Paste
            </button>
            <button
              type="button"
              className="rounded-sm bg-fg/10 px-2 py-1"
              onClick={() => saveClip(selected)}
            >
              Save
            </button>
            <button
              type="button"
              className="rounded-sm bg-fg/10 px-2 py-1"
              onClick={() => openClipInKate(selected)}
            >
              Open
            </button>
            <button type="button" className="rounded-sm px-2 py-1" onClick={() => closeWheel()}>
              Esc
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  return createPortal(content, document.body);
}
