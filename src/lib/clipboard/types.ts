export const ITEMS_PER_RING = 8;
export const MIN_CAPACITY = 8;
export const MAX_CAPACITY = 32;
export const DEFAULT_CAPACITY = 16;

export type ClipboardItem = {
  id: string;
  text: string;
  /** Epoch ms for live copies. 0 means use seedAgeMs. */
  copiedAt: number;
  /** Stable age for seeded demo clips (avoids SSR mismatch). */
  seedAgeMs?: number;
};

export function ringCountFor(length: number): number {
  if (length <= 0) return 1;
  return Math.ceil(length / ITEMS_PER_RING);
}

export function ringIndexOf(itemIndex: number): number {
  return Math.floor(itemIndex / ITEMS_PER_RING);
}

export function slotOnRing(itemIndex: number): number {
  return itemIndex % ITEMS_PER_RING;
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
