import type { ClipboardItem } from "./types";

export function clipAgeMs(item: ClipboardItem, now: number): number {
  if (item.copiedAt > 0) {
    if (now <= 0) return 0;
    return Math.max(0, now - item.copiedAt);
  }
  return item.seedAgeMs ?? 0;
}

/** Age as s / m / h / d. */
export function formatAge(ageMs: number): string {
  const s = Math.max(0, Math.floor(ageMs / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** Size in KiB from UTF-8 byte length. */
export function formatKib(text: string): string {
  const kib = byteLength(text) / 1024;
  if (kib < 0.01) return `${kib.toFixed(3)} KiB`;
  if (kib < 10) return `${kib.toFixed(2)} KiB`;
  if (kib < 100) return `${kib.toFixed(1)} KiB`;
  return `${Math.round(kib)} KiB`;
}

export function preview128(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 128) return normalized;
  return `${normalized.slice(0, 128)}`;
}

export function previewShort(text: string, max = 36): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

export function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function clipFilename(item: ClipboardItem, now = Date.now()): string {
  const t = item.copiedAt > 0 ? item.copiedAt : now;
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `clip-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.txt`;
}
