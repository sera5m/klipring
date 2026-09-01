import {
  DEFAULT_CAPACITY,
  MAX_CAPACITY,
  MIN_CAPACITY,
  ringCountFor,
  slotsOnRing,
} from "@/lib/clipboard/types";
import { useClipboardStore } from "@/lib/clipboard/store";

export function Settings() {
  const capacity = useClipboardStore((s) => s.capacity);
  const ignoreIdentical = useClipboardStore((s) => s.ignoreIdentical);
  const items = useClipboardStore((s) => s.items);
  const setCapacity = useClipboardStore((s) => s.setCapacity);
  const setIgnoreIdentical = useClipboardStore((s) => s.setIgnoreIdentical);
  const clear = useClipboardStore((s) => s.clear);
  const restoreDemo = useClipboardStore((s) => s.restoreDemo);
  const rings = ringCountFor(Math.max(capacity, items.length, 1));
  const layout = Array.from({ length: rings }, (_, r) => slotsOnRing(r)).join(" + ");

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto bg-window p-5 text-sm">
      <header>
        <h3 className="text-base font-semibold text-balance">Clipboard buffer</h3>
        <p className="mt-1 text-fg-muted text-pretty">
          Static slots. Inner ring is 8; each outer ring adds 4 (12, 16, 20). Positions never reflow.
        </p>
      </header>

      <label className="block">
        <div className="mb-2 flex items-center justify-between text-xs font-medium">
          <span>Capacity</span>
          <span className="font-mono text-plasma tabular-nums">
            {capacity} · {rings} ring{rings === 1 ? "" : "s"} ({layout})
          </span>
        </div>
        <input
          type="range"
          min={MIN_CAPACITY}
          max={MAX_CAPACITY}
          step={1}
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-inset accent-plasma"
          aria-label="Clipboard capacity"
        />
        <div className="mt-1 flex justify-between font-mono text-xs text-fg-subtle tabular-nums">
          <span>8</span>
          <span>20</span>
          <span>36</span>
          <span>56</span>
        </div>
      </label>

      <label className="flex items-center justify-between gap-3 rounded-md bg-inset px-3 py-2">
        <span>Ignore identical copies</span>
        <input
          type="checkbox"
          checked={ignoreIdentical}
          onChange={(e) => setIgnoreIdentical(e.target.checked)}
          className="size-4 accent-plasma"
        />
      </label>

      <pre className="overflow-auto rounded-md bg-inset p-3 font-mono text-xs leading-5 text-fg-muted">
        {`struct ClipboardItem {
    uint32_t    age_s;
    std::string text;
};

std::array<ClipboardItem, ${capacity}> buffer;
// ring 0: 8  · ring 1: 12 · ring 2: 16 · ring 3: 20
// most-recent at [0] · angles are static`}
      </pre>

      <div className="mt-auto flex flex-wrap gap-2">
        <button
          type="button"
          onClick={restoreDemo}
          className="rounded-md bg-plasma px-3 py-2 text-sm font-medium text-plasma-fg transition-transform duration-150 active:scale-[0.96]"
        >
          Restore demo clips
        </button>
        <button
          type="button"
          onClick={clear}
          className="rounded-md bg-inset px-3 py-2 text-sm font-medium text-fg transition-transform duration-150 active:scale-[0.96]"
        >
          Clear buffer
        </button>
      </div>
    </div>
  );
}