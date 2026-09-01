import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_CAPACITY, MAX_CAPACITY, MIN_CAPACITY, type ClipboardItem } from "./types";
import { SEED_ITEMS } from "./seed";

type ClipboardState = {
  items: ClipboardItem[];
  capacity: number;
  ignoreIdentical: boolean;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  push: (text: string) => ClipboardItem | null;
  removeAt: (index: number) => number;
  setCapacity: (n: number) => void;
  setIgnoreIdentical: (v: boolean) => void;
  clear: () => void;
  restoreDemo: () => void;
};

function clampCapacity(n: number): number {
  return Math.min(MAX_CAPACITY, Math.max(MIN_CAPACITY, Math.round(n)));
}

function trimToCapacity(items: ClipboardItem[], capacity: number): ClipboardItem[] {
  return items.length > capacity ? items.slice(0, capacity) : items;
}

export const useClipboardStore = create<ClipboardState>()(
  persist(
    (set, get) => ({
      items: SEED_ITEMS,
      capacity: DEFAULT_CAPACITY,
      ignoreIdentical: true,
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      push: (raw) => {
        const text = raw.replace(/\u0000/g, "");
        if (!text) return null;
        const { items, capacity, ignoreIdentical } = get();
        if (ignoreIdentical && items[0]?.text === text) {
          const next = { ...items[0], copiedAt: Date.now(), seedAgeMs: undefined };
          set({ items: [next, ...items.slice(1)] });
          return next;
        }
        const item: ClipboardItem = {
          id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          text,
          copiedAt: Date.now(),
        };
        const withoutDup = ignoreIdentical ? items.filter((c) => c.text !== text) : items;
        set({ items: trimToCapacity([item, ...withoutDup], capacity) });
        return item;
      },
      removeAt: (index) => {
        const { items } = get();
        if (index < 0 || index >= items.length) return index;
        const next = items.filter((_, i) => i !== index);
        set({ items: next });
        if (next.length === 0) return 0;
        return Math.min(index, next.length - 1);
      },
      setCapacity: (n) => {
        const capacity = clampCapacity(n);
        set((s) => ({ capacity, items: trimToCapacity(s.items, capacity) }));
      },
      setIgnoreIdentical: (v) => set({ ignoreIdentical: v }),
      clear: () => set({ items: [] }),
      restoreDemo: () => set({ items: SEED_ITEMS, capacity: DEFAULT_CAPACITY }),
    }),
    {
      name: "klipring-buffer",
      skipHydration: true,
      partialize: (s) => ({
        items: s.items,
        capacity: s.capacity,
        ignoreIdentical: s.ignoreIdentical,
      }),
    },
  ),
);
