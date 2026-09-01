/** Inner ring is 8; each outer ring adds 4 slots: 8, 12, 16, 20. */
export const INNER_RING_SLOTS = 8;
export const RING_SLOT_STEP = 4;
export const MIN_CAPACITY = 8;
export const MAX_CAPACITY = 56;
export const DEFAULT_CAPACITY = 20;

export type ClipboardItem = {
  id: string;
  text: string;
  /** Epoch ms for live copies. 0 means use seedAgeMs. */
  copiedAt: number;
  /** Stable age for seeded demo clips (avoids SSR mismatch). */
  seedAgeMs?: number;
};

export function slotsOnRing(ring: number): number {
  return INNER_RING_SLOTS + RING_SLOT_STEP * Math.max(0, ring);
}

/** Cumulative slots in rings [0, ring). 8, 20, 36, 56… */
export function startIndexOfRing(ring: number): number {
  const n = Math.max(0, ring);
  return 2 * n * (n + 3);
}

export function ringCountFor(length: number): number {
  if (length <= 0) return 1;
  let ring = 0;
  let filled = 0;
  while (filled < length) {
    filled += slotsOnRing(ring);
    ring += 1;
  }
  return ring;
}

export function locateOnWheel(itemIndex: number): {
  ring: number;
  slot: number;
  slots: number;
} {
  let remaining = Math.max(0, itemIndex);
  let ring = 0;
  for (;;) {
    const slots = slotsOnRing(ring);
    if (remaining < slots) return { ring, slot: remaining, slots };
    remaining -= slots;
    ring += 1;
  }
}

export function ringIndexOf(itemIndex: number): number {
  return locateOnWheel(itemIndex).ring;
}

export function slotOnRing(itemIndex: number): number {
  return locateOnWheel(itemIndex).slot;
}

/** Number-row mapping: 1–9 → items 1–9 (index 0–8), 0 → item 10 (index 9). */
export function indexFromDigitKey(digit: string): number | null {
  if (digit.length !== 1 || digit < "0" || digit > "9") return null;
  if (digit === "0") return 9;
  return Number(digit) - 1;
}

export function badgeForIndex(index: number): string | null {
  if (index < 0 || index > 9) return null;
  if (index === 9) return "0";
  return String(index + 1);
}
