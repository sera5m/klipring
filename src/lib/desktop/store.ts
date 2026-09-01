import { create } from "zustand";

export type AppId = "kate" | "konsole" | "settings";

export type Win = {
  id: string;
  app: AppId;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  payload?: { text?: string; fileName?: string };
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  bornAt: number;
};

export type WheelMode = "hold" | "latch";

export type WheelState = {
  open: boolean;
  mode: WheelMode;
  originX: number;
  originY: number;
  selected: number;
  ctrlDown: boolean;
  vDown: boolean;
};

type DesktopState = {
  windows: Win[];
  zTop: number;
  kickoff: boolean;
  notices: Notice[];
  wheel: WheelState;
  pointer: { x: number; y: number };
  setPointer: (x: number, y: number) => void;
  setKickoff: (v: boolean) => void;
  focus: (id: string) => void;
  move: (id: string, x: number, y: number) => void;
  resize: (id: string, w: number, h: number) => void;
  toggleMin: (id: string) => void;
  toggleMax: (id: string) => void;
  close: (id: string) => void;
  openApp: (app: AppId, payload?: Win["payload"]) => string;
  notify: (title: string, body: string) => void;
  dismissNotice: (id: string) => void;
  openWheel: (mode: WheelMode, x: number, y: number) => void;
  closeWheel: () => void;
  setSelected: (index: number) => void;
  setMod: (partial: Partial<Pick<WheelState, "ctrlDown" | "vDown">>) => void;
};

let zSeq = 12;
let winSeq = 3;
let noteSeq = 1;

const INITIAL_WINDOWS: Win[] = [
  {
    id: "win-kate",
    app: "kate",
    title: "welcome.md — Kate",
    x: 108,
    y: 44,
    w: 560,
    h: 440,
    z: 12,
    minimized: false,
    maximized: false,
    payload: { fileName: "welcome.md" },
  },
  {
    id: "win-konsole",
    app: "konsole",
    title: "user@archlinux: ~ — Konsole",
    x: 500,
    y: 250,
    w: 520,
    h: 340,
    z: 11,
    minimized: false,
    maximized: false,
  },
];

export const useDesktopStore = create<DesktopState>((set, get) => ({
  windows: INITIAL_WINDOWS,
  zTop: 12,
  kickoff: false,
  notices: [],
  pointer: { x: 640, y: 360 },
  wheel: {
    open: false,
    mode: "hold",
    originX: 640,
    originY: 360,
    selected: 0,
    ctrlDown: false,
    vDown: false,
  },
  setPointer: (x, y) => set({ pointer: { x, y } }),
  setKickoff: (v) => set({ kickoff: v }),
  focus: (id) =>
    set((s) => {
      const z = ++zSeq;
      return {
        zTop: z,
        kickoff: false,
        windows: s.windows.map((w) =>
          w.id === id ? { ...w, z, minimized: false } : w,
        ),
      };
    }),
  move: (id, x, y) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    })),
  resize: (id, w, h) =>
    set((s) => ({
      windows: s.windows.map((win) =>
        win.id === id ? { ...win, w: Math.max(320, w), h: Math.max(200, h) } : win,
      ),
    })),
  toggleMin: (id) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, minimized: !w.minimized, maximized: w.minimized ? w.maximized : false } : w,
      ),
    })),
  toggleMax: (id) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, maximized: !w.maximized, minimized: false } : w,
      ),
    })),
  close: (id) =>
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),
  openApp: (app, payload) => {
    const existing = get().windows.find(
      (w) => w.app === app && app !== "kate" && !payload,
    );
    if (existing && !payload) {
      get().focus(existing.id);
      return existing.id;
    }
    const z = ++zSeq;
    const id = `win-${app}-${++winSeq}`;
    const titles: Record<AppId, string> = {
      kate: payload?.fileName ? `${payload.fileName} — Kate` : "Untitled — Kate",
      konsole: "user@archlinux: ~ — Konsole",
      settings: "KlipRing — System Settings",
    };
    const layout: Record<AppId, Pick<Win, "x" | "y" | "w" | "h">> = {
      kate: { x: 72, y: 48, w: 580, h: 480 },
      konsole: { x: 200, y: 140, w: 540, h: 360 },
      settings: { x: 160, y: 80, w: 480, h: 420 },
    };
    const win: Win = {
      id,
      app,
      title: titles[app],
      ...layout[app],
      z,
      minimized: false,
      maximized: false,
      payload,
    };
    set((s) => ({ windows: [...s.windows, win], zTop: z, kickoff: false }));
    return id;
  },
  notify: (title, body) => {
    const id = `note-${++noteSeq}`;
    set((s) => ({
      notices: [...s.notices.slice(-4), { id, title, body, bornAt: Date.now() }],
    }));
    window.setTimeout(() => {
      get().dismissNotice(id);
    }, 3200);
  },
  dismissNotice: (id) =>
    set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
  openWheel: (mode, x, y) =>
    set((s) => ({
      kickoff: false,
      wheel: {
        ...s.wheel,
        open: true,
        mode,
        originX: x,
        originY: y,
        selected: 0,
      },
    })),
  closeWheel: () =>
    set((s) => ({
      wheel: { ...s.wheel, open: false, vDown: false },
    })),
  setSelected: (index) =>
    set((s) => ({ wheel: { ...s.wheel, selected: Math.max(0, index) } })),
  setMod: (partial) =>
    set((s) => ({ wheel: { ...s.wheel, ...partial } })),
}));
