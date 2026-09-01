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

/**
 * Hit-test a point in wheel-local coords (origin at centre, y down).
 * Slot 0 sits at 12 o’clock; wedges are static.
 */
export function hitIndexAt(
  dx: number,
  dy: number,
  itemCount: number,
  inner: number,
  thick: number,
  gap: number,
): number | null {
  if (itemCount <= 0) return null;
  const dist = Math.hypot(dx, dy);
  const rings = ringCountFor(itemCount);
  for (let r = 0; r < rings; r++) {
    const outer = inner + thick + r * (thick + gap);
    const innerR = outer - thick;
    if (dist < innerR || dist > outer) continue;
    const slots = slotsOnRing(r);
    let fromNorth = Math.atan2(dx, -dy);
    if (fromNorth < 0) fromNorth += Math.PI * 2;
    const step = (Math.PI * 2) / slots;
    const slot =
      Math.floor(((fromNorth + step / 2) % (Math.PI * 2)) / step) % slots;
    const index = startIndexOfRing(r) + slot;
    return index < itemCount ? index : null;
  }
  return null;
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
