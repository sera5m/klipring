import { i as __toESM } from "../_runtime.mjs";
import { R as require_react, l as require_react_dom, y as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Trash2, c as Settings2, d as FileCode2, f as Clipboard, l as Minus, n as Wifi, o as Square, p as ChevronUp, r as Volume2, s as SquareTerminal, t as X, u as Folder } from "../_libs/lucide-react.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BPuMvDvu.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_react_dom = require_react_dom();
var editors = /* @__PURE__ */ new Map();
var focusedId = null;
var lastId = null;
function registerEditor(handle) {
	editors.set(handle.id, handle);
	if (!lastId) lastId = handle.id;
	return () => {
		editors.delete(handle.id);
		if (focusedId === handle.id) focusedId = null;
		if (lastId === handle.id) lastId = [...editors.keys()].at(-1) ?? null;
	};
}
function setFocusedEditor(id) {
	focusedId = id;
	if (id) lastId = id;
}
function pasteIntoEditor(text) {
	const id = focusedId ?? lastId;
	if (!id) return false;
	const handle = editors.get(id);
	if (!handle) return false;
	handle.focus();
	handle.insert(text);
	return true;
}
function insertAtCaret(el, text) {
	const start = el.selectionStart ?? el.value.length;
	const end = el.selectionEnd ?? el.value.length;
	const before = el.value.slice(0, start);
	const after = el.value.slice(end);
	el.value = before + text + after;
	const caret = start + text.length;
	el.setSelectionRange(caret, caret);
	el.dispatchEvent(new Event("input", { bubbles: true }));
}
function selectedTextFromTarget(target) {
	if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
		const start = target.selectionStart ?? 0;
		const end = target.selectionEnd ?? 0;
		if (end > start) return target.value.slice(start, end);
	}
	return window.getSelection()?.toString() ?? "";
}
var WELCOME = `# Welcome to KlipRing

A Plasma-style radial clipboard lives on this desktop.

1. Select any of this text
2. Press Ctrl+C — the clip lands at slot 1 (most recent)
3. Hold Ctrl+V — a hollow purple wheel opens on the cursor
4. Scroll, press 1–9 / 0, or use arrows to walk the ring
5. Release V (or Enter) to paste into this editor

Delete / Backspace drops the highlighted slot.
Middle-click a slot to open it in a new Kate window.
Hold Ctrl+V and press S to save the slot as a .txt file.

Capacity defaults to 16 (two rings of 8). Open Settings to resize the buffer.
`;
function Kate({ windowId, initialText, fileName }) {
	const [value, setValue] = (0, import_react.useState)(initialText ?? WELCOME);
	const [caret, setCaret] = (0, import_react.useState)({
		line: 1,
		col: 1
	});
	const ref = (0, import_react.useRef)(null);
	const gutterRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		return registerEditor({
			id: windowId,
			focus: () => ref.current?.focus(),
			insert: (text) => {
				const el = ref.current;
				if (!el) return;
				insertAtCaret(el, text);
				setValue(el.value);
				updateCaret(el);
			}
		});
	}, [windowId]);
	const updateCaret = (el) => {
		const pos = el.selectionStart ?? 0;
		const upto = el.value.slice(0, pos);
		const line = upto.split("\n").length;
		const col = pos - (upto.lastIndexOf("\n") + 1) + 1;
		setCaret({
			line,
			col
		});
	};
	const lines = value.split("\n");
	const lineCount = Math.max(lines.length, 1);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col bg-window",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex h-8 shrink-0 items-center gap-2 border-b border-border px-2 text-xs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "rounded-sm bg-inset px-2 py-1 text-fg",
					children: fileName ?? "welcome.md"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-fg-subtle",
					children: "UTF-8"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					ref: gutterRef,
					className: "kate-gutter w-10 shrink-0 overflow-hidden py-2 pr-2 text-right font-mono text-xs leading-5 select-none",
					"aria-hidden": true,
					children: Array.from({ length: lineCount }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: i + 1 }, i))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					ref,
					value,
					spellCheck: false,
					"aria-label": fileName ?? "Kate editor",
					suppressHydrationWarning: true,
					onScroll: (e) => {
						if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
					},
					onChange: (e) => {
						setValue(e.target.value);
						updateCaret(e.target);
					},
					onSelect: (e) => updateCaret(e.currentTarget),
					onFocus: () => setFocusedEditor(windowId),
					onBlur: () => setFocusedEditor(null),
					className: "min-h-0 flex-1 resize-none bg-transparent px-2 py-2 font-mono text-xs leading-5 text-fg outline-none"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex h-6 shrink-0 items-center justify-between border-t border-border px-3 font-mono text-xs text-fg-muted tabular-nums",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "INS" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						"Ln ",
						caret.line,
						", Col ",
						caret.col
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [value.length, " chars"] })
				]
			})
		]
	});
}
var BANNER = `       /\\
      /  \\      user@archlinux
     /\\   \\     os     Arch Linux
    /      \\    host   KlipRing
   /   ,,   \\   kernel 6.10.3-arch1-1
  /   |  |  -\\  de     Plasma 6
 /_-''    ''-_\\ wm     KWin (Wayland)

user@archlinux ~ $ pacman -Q plasma-workspace
plasma-workspace 6.1.4-1
user@archlinux ~ $ echo $XDG_CURRENT_DESKTOP
KDE`;
function Konsole({ windowId }) {
	const [log, setLog] = (0, import_react.useState)(BANNER);
	const [line, setLine] = (0, import_react.useState)("");
	const inputRef = (0, import_react.useRef)(null);
	const scroller = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		return registerEditor({
			id: windowId,
			focus: () => inputRef.current?.focus(),
			insert: (text) => {
				const el = inputRef.current;
				if (!el) {
					setLine((s) => s + text);
					return;
				}
				insertAtCaret(el, text);
				setLine(el.value);
			}
		});
	}, [windowId]);
	(0, import_react.useEffect)(() => {
		scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
	}, [log, line]);
	const run = () => {
		const cmd = line.trim();
		if (!cmd) {
			setLog((l) => `${l}\n`);
			setLine("");
			return;
		}
		if (cmd === "clear") {
			setLog("");
			setLine("");
			return;
		}
		let out = "";
		if (cmd === "help" || cmd === "klip") out = "KlipRing: hold Ctrl+V for the radial clipboard. scroll / 1-9 / arrows to pick. release V to paste.";
		else if (cmd.startsWith("echo ")) out = cmd.slice(5);
		else if (cmd === "pwd") out = "/home/user";
		else if (cmd === "ls") out = "Documents  Downloads  notes  welcome.md";
		else if (cmd === "neofetch") out = BANNER.split("user@archlinux ~ $")[0]?.trim() ?? "";
		else out = `bash: ${cmd.split(" ")[0]}: command not found`;
		setLog((l) => `${l}\nuser@archlinux ~ $ ${cmd}\n${out}`);
		setLine("");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "konsole-screen flex h-full flex-col font-mono text-xs",
		onClick: () => inputRef.current?.focus(),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex h-7 shrink-0 items-center gap-2 border-b border-border px-2 text-fg-muted",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-2.5 rounded-full bg-danger/80" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-2.5 rounded-full bg-fg/25" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-2.5 rounded-full bg-ok/80" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "ml-2",
					children: "~/ — fish"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			ref: scroller,
			className: "min-h-0 flex-1 overflow-auto px-3 py-2 leading-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "whitespace-pre-wrap",
				children: log
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex",
				onSubmit: (e) => {
					e.preventDefault();
					run();
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "shrink-0 text-plasma",
					children: "user@archlinux ~ $\xA0"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					ref: inputRef,
					value: line,
					"aria-label": "Terminal input",
					suppressHydrationWarning: true,
					onChange: (e) => setLine(e.target.value),
					onFocus: () => setFocusedEditor(windowId),
					onBlur: () => setFocusedEditor(null),
					className: "min-w-0 flex-1 bg-transparent text-fg outline-none",
					autoComplete: "off",
					spellCheck: false
				})]
			})]
		})]
	});
}
function ringCountFor(length) {
	if (length <= 0) return 1;
	return Math.ceil(length / 8);
}
function ringIndexOf(itemIndex) {
	return Math.floor(itemIndex / 8);
}
function slotOnRing(itemIndex) {
	return itemIndex % 8;
}
/** Number-row mapping: 1–9 → items 1–9 (index 0–8), 0 → item 10 (index 9). */
function indexFromDigitKey(digit) {
	if (digit.length !== 1 || digit < "0" || digit > "9") return null;
	if (digit === "0") return 9;
	return Number(digit) - 1;
}
function badgeForIndex(index) {
	if (index < 0 || index > 9) return null;
	if (index === 9) return "0";
	return String(index + 1);
}
var SEED_ITEMS = [
	{
		id: "clip-seed-01",
		copiedAt: 0,
		seedAgeMs: 7e3,
		text: "sudo pacman -Syu"
	},
	{
		id: "clip-seed-02",
		copiedAt: 0,
		seedAgeMs: 28e3,
		text: "sudo pacman -S plasma-workspace kdeplasma-addons kwalletmanager spectacle"
	},
	{
		id: "clip-seed-03",
		copiedAt: 0,
		seedAgeMs: 95e3,
		text: "ssh aur@aur.archlinux.org"
	},
	{
		id: "clip-seed-04",
		copiedAt: 0,
		seedAgeMs: 36e4,
		text: `import QtQuick
import org.kde.kirigami as Kirigami

Kirigami.ApplicationWindow {
    title: "KlipRing"
    pageStack.initialPage: Kirigami.Page {
        title: "Clipboard"
    }
}`
	},
	{
		id: "clip-seed-05",
		copiedAt: 0,
		seedAgeMs: 132e4,
		text: "kwriteconfig6 --file kwinrc --group ModifierOnlyShortcuts --key Meta \"org.kde.kglobalaccel,/component/kwin,org.kde.kglobalaccel.Component,invokeShortcut,Overview\""
	},
	{
		id: "clip-seed-06",
		copiedAt: 0,
		seedAgeMs: 348e4,
		text: "Hold Ctrl+V to open the radial clipboard at the cursor. Scroll the wheel to walk the ring, or press 1–9 / 0 for slots 1–10. Release V to paste the highlighted clip into the focused editor."
	},
	{
		id: "clip-seed-07",
		copiedAt: 0,
		seedAgeMs: 108e5,
		text: "git clone git@github.com:user/dotfiles.git ~/.dotfiles && cd ~/.dotfiles && stow kde"
	},
	{
		id: "clip-seed-08",
		copiedAt: 0,
		seedAgeMs: 324e5,
		text: `hardware:
  monitors:
    - name: DP-1
      mode: 2560x1440@144
      scale: 1
    - name: HDMI-A-1
      mode: 1920x1080@60
      position: 2560,0`
	},
	{
		id: "clip-seed-09",
		copiedAt: 0,
		seedAgeMs: 936e5,
		text: `kwin_wayland[1842]: qt.qpa.wayland: Wayland does not support QWindow::requestActivate()
plasmashell[1904]: file:///usr/share/plasma/plasmoids/org.kde.plasma.clipboard/contents/ui/ClipboardPage.qml:42: TypeError`
	},
	{
		id: "clip-seed-10",
		copiedAt: 0,
		seedAgeMs: 2592e5,
		text: "The clipboard is not a graveyard of forgotten strings. It is a ring. What you copied last sits at the crown; older voices wait on the outer orbit."
	}
];
function clampCapacity(n) {
	return Math.min(32, Math.max(8, Math.round(n)));
}
function trimToCapacity(items, capacity) {
	return items.length > capacity ? items.slice(0, capacity) : items;
}
var useClipboardStore = create()(persist((set, get) => ({
	items: SEED_ITEMS,
	capacity: 16,
	ignoreIdentical: true,
	hydrated: false,
	setHydrated: (v) => set({ hydrated: v }),
	push: (raw) => {
		const text = raw.replace(/\u0000/g, "");
		if (!text) return null;
		const { items, capacity, ignoreIdentical } = get();
		if (ignoreIdentical && items[0]?.text === text) {
			const next = {
				...items[0],
				copiedAt: Date.now(),
				seedAgeMs: void 0
			};
			set({ items: [next, ...items.slice(1)] });
			return next;
		}
		const item = {
			id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			text,
			copiedAt: Date.now()
		};
		set({ items: trimToCapacity([item, ...ignoreIdentical ? items.filter((c) => c.text !== text) : items], capacity) });
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
		set((s) => ({
			capacity,
			items: trimToCapacity(s.items, capacity)
		}));
	},
	setIgnoreIdentical: (v) => set({ ignoreIdentical: v }),
	clear: () => set({ items: [] }),
	restoreDemo: () => set({
		items: SEED_ITEMS,
		capacity: 16
	})
}), {
	name: "klipring-buffer",
	skipHydration: true,
	partialize: (s) => ({
		items: s.items,
		capacity: s.capacity,
		ignoreIdentical: s.ignoreIdentical
	})
}));
function Settings() {
	const capacity = useClipboardStore((s) => s.capacity);
	const ignoreIdentical = useClipboardStore((s) => s.ignoreIdentical);
	const items = useClipboardStore((s) => s.items);
	const setCapacity = useClipboardStore((s) => s.setCapacity);
	const setIgnoreIdentical = useClipboardStore((s) => s.setIgnoreIdentical);
	const clear = useClipboardStore((s) => s.clear);
	const restoreDemo = useClipboardStore((s) => s.restoreDemo);
	const rings = Math.max(1, Math.ceil(Math.max(capacity, items.length) / 8));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col gap-4 overflow-auto bg-window p-5 text-sm",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-base font-semibold text-balance",
				children: "Clipboard buffer"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-fg-muted text-pretty",
				children: "Most-recent clip sits at index 0. Length above 8 adds an outer ring."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-2 flex items-center justify-between text-xs font-medium",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Capacity" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-mono text-plasma tabular-nums",
							children: [
								capacity,
								" slots · ",
								rings,
								" ring",
								rings === 1 ? "" : "s"
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "range",
						min: 8,
						max: 32,
						step: 1,
						value: capacity,
						onChange: (e) => setCapacity(Number(e.target.value)),
						className: "h-2 w-full cursor-pointer appearance-none rounded-full bg-inset accent-plasma",
						"aria-label": "Clipboard capacity"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1 flex justify-between font-mono text-xs text-fg-subtle tabular-nums",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: 8 }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: 16 }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: 32 })
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex items-center justify-between gap-3 rounded-md bg-inset px-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Ignore identical copies" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: ignoreIdentical,
					onChange: (e) => setIgnoreIdentical(e.target.checked),
					className: "size-4 accent-plasma"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "overflow-auto rounded-md bg-inset p-3 font-mono text-xs leading-5 text-fg-muted",
				children: `struct ClipboardItem {
    uint32_t    age_s;
    std::string text;
};

std::array<ClipboardItem, ${capacity}> buffer;
// mutable · most-recent at [0]
// extra ring when size > 8`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-auto flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: restoreDemo,
					className: "rounded-md bg-plasma px-3 py-2 text-sm font-medium text-plasma-fg transition-transform duration-150 active:scale-[0.96]",
					children: "Restore demo clips"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: clear,
					className: "rounded-md bg-inset px-3 py-2 text-sm font-medium text-fg transition-transform duration-150 active:scale-[0.96]",
					children: "Clear buffer"
				})]
			})
		]
	});
}
var zSeq = 12;
var winSeq = 3;
var noteSeq = 1;
var INITIAL_WINDOWS = [{
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
	payload: { fileName: "welcome.md" }
}, {
	id: "win-konsole",
	app: "konsole",
	title: "user@archlinux: ~ — Konsole",
	x: 500,
	y: 250,
	w: 520,
	h: 340,
	z: 11,
	minimized: false,
	maximized: false
}];
var useDesktopStore = create((set, get) => ({
	windows: INITIAL_WINDOWS,
	zTop: 12,
	kickoff: false,
	notices: [],
	pointer: {
		x: 640,
		y: 360
	},
	wheel: {
		open: false,
		mode: "hold",
		originX: 640,
		originY: 360,
		selected: 0,
		ctrlDown: false,
		vDown: false
	},
	setPointer: (x, y) => set({ pointer: {
		x,
		y
	} }),
	setKickoff: (v) => set({ kickoff: v }),
	focus: (id) => set((s) => {
		const z = ++zSeq;
		return {
			zTop: z,
			kickoff: false,
			windows: s.windows.map((w) => w.id === id ? {
				...w,
				z,
				minimized: false
			} : w)
		};
	}),
	move: (id, x, y) => set((s) => ({ windows: s.windows.map((w) => w.id === id ? {
		...w,
		x,
		y
	} : w) })),
	resize: (id, w, h) => set((s) => ({ windows: s.windows.map((win) => win.id === id ? {
		...win,
		w: Math.max(320, w),
		h: Math.max(200, h)
	} : win) })),
	toggleMin: (id) => set((s) => ({ windows: s.windows.map((w) => w.id === id ? {
		...w,
		minimized: !w.minimized,
		maximized: w.minimized ? w.maximized : false
	} : w) })),
	toggleMax: (id) => set((s) => ({ windows: s.windows.map((w) => w.id === id ? {
		...w,
		maximized: !w.maximized,
		minimized: false
	} : w) })),
	close: (id) => set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),
	openApp: (app, payload) => {
		const existing = get().windows.find((w) => w.app === app && app !== "kate" && !payload);
		if (existing && !payload) {
			get().focus(existing.id);
			return existing.id;
		}
		const z = ++zSeq;
		const id = `win-${app}-${++winSeq}`;
		const win = {
			id,
			app,
			title: {
				kate: payload?.fileName ? `${payload.fileName} — Kate` : "Untitled — Kate",
				konsole: "user@archlinux: ~ — Konsole",
				settings: "KlipRing — System Settings"
			}[app],
			...{
				kate: {
					x: 72,
					y: 48,
					w: 580,
					h: 480
				},
				konsole: {
					x: 200,
					y: 140,
					w: 540,
					h: 360
				},
				settings: {
					x: 160,
					y: 80,
					w: 480,
					h: 420
				}
			}[app],
			z,
			minimized: false,
			maximized: false,
			payload
		};
		set((s) => ({
			windows: [...s.windows, win],
			zTop: z,
			kickoff: false
		}));
		return id;
	},
	notify: (title, body) => {
		const id = `note-${++noteSeq}`;
		set((s) => ({ notices: [...s.notices.slice(-4), {
			id,
			title,
			body,
			bornAt: Date.now()
		}] }));
		window.setTimeout(() => {
			get().dismissNotice(id);
		}, 3200);
	},
	dismissNotice: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
	openWheel: (mode, x, y) => set((s) => ({
		kickoff: false,
		wheel: {
			...s.wheel,
			open: true,
			mode,
			originX: x,
			originY: y,
			selected: 0
		}
	})),
	closeWheel: () => set((s) => ({ wheel: {
		...s.wheel,
		open: false,
		vDown: false
	} })),
	setSelected: (index) => set((s) => ({ wheel: {
		...s.wheel,
		selected: Math.max(0, index)
	} })),
	setMod: (partial) => set((s) => ({ wheel: {
		...s.wheel,
		...partial
	} }))
}));
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function Clock() {
	const [now, setNow] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		setNow(/* @__PURE__ */ new Date());
		const id = window.setInterval(() => setNow(/* @__PURE__ */ new Date()), 1e3);
		return () => window.clearInterval(id);
	}, []);
	if (!now) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "tabular-nums text-fg",
		children: "--:--"
	});
	const hh = String(now.getHours()).padStart(2, "0");
	const mm = String(now.getMinutes()).padStart(2, "0");
	const day = now.toLocaleDateString(void 0, {
		weekday: "short",
		month: "short",
		day: "numeric"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "flex flex-col items-end leading-tight",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-2xs text-fg-muted",
			children: day
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "text-sm font-medium tabular-nums",
			children: [
				hh,
				":",
				mm
			]
		})]
	});
}
function PlasmaPanel() {
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
	const focused = windows.reduce((best, w) => {
		if (w.minimized) return best;
		if (!best || w.z > best.z) return w;
		return best;
	}, null);
	const launch = (app) => {
		setKickoff(false);
		openApp(app);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [kickoff ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute bottom-14 left-2 z-50 w-64 overflow-hidden rounded-lg border border-border bg-panel/95 shadow-window",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "border-b border-border px-3 py-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-fg-subtle",
				children: "Applications"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-semibold",
				children: "KlipRing"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
			className: "flex flex-col p-1",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KickItem, {
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileCode2, { className: "size-4" }),
					label: "Kate",
					onClick: () => launch("kate")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KickItem, {
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareTerminal, { className: "size-4" }),
					label: "Konsole",
					onClick: () => launch("konsole")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KickItem, {
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, { className: "size-4" }),
					label: "KlipRing Settings",
					onClick: () => launch("settings")
				})
			]
		})]
	}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
		className: "plasma-panel absolute inset-x-0 bottom-0 z-40 flex h-12 items-center gap-1 px-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": "Application launcher",
				onClick: () => setKickoff(!kickoff),
				className: cn("grid size-9 place-items-center rounded-md text-plasma transition-colors duration-150", kickoff ? "bg-plasma/20" : "hover:bg-fg/10"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuMark, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-1 h-6 w-px bg-border" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pinned, {
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileCode2, { className: "size-4" }),
				label: "Kate",
				onClick: () => launch("kate")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pinned, {
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareTerminal, { className: "size-4" }),
				label: "Konsole",
				onClick: () => launch("konsole")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pinned, {
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Folder, { className: "size-4" }),
				label: "Settings",
				onClick: () => launch("settings")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-1 h-6 w-px bg-border" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex min-w-0 flex-1 items-center gap-1 overflow-x-auto",
				children: windows.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					"data-active": focused?.id === w.id && !w.minimized,
					className: "task-btn max-w-44 truncate rounded-md px-2 py-1.5 text-left text-xs text-fg hover:bg-fg/10",
					onClick: () => {
						if (w.z === zTop && !w.minimized) toggleMin(w.id);
						else focus(w.id);
					},
					children: w.title.replace(/ — .*$/, "")
				}, w.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				"aria-label": "Open clipboard ring",
				onClick: () => {
					if (wheelOpen) {
						useDesktopStore.getState().closeWheel();
						return;
					}
					openWheel("latch", window.innerWidth / 2, window.innerHeight / 2 - 24);
				},
				className: "flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-fg hover:bg-fg/10",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clipboard, { className: "size-4 text-ring" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono tabular-nums",
					children: count
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "hidden items-center gap-2 px-1 text-fg-muted sm:flex",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "size-3.5" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wifi, { className: "size-3.5" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-3.5" })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "px-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, {})
			})
		]
	})] });
}
function Pinned({ icon, label, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-label": label,
		onClick,
		className: "grid size-9 place-items-center rounded-md text-fg hover:bg-fg/10",
		children: icon
	});
}
function KickItem({ icon, label, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: "flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-plasma/20",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-plasma",
			children: icon
		}), label]
	});
}
function MenuMark() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 24 24",
		className: "size-6",
		fill: "currentColor",
		"aria-hidden": true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "6.5",
				cy: "6.5",
				r: "2.1"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "17.5",
				cy: "6.5",
				r: "2.1"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "6.5",
				cy: "17.5",
				r: "2.1"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "17.5",
				cy: "17.5",
				r: "2.1"
			})
		]
	});
}
function PlasmaWindow({ win, focused, children, icon }) {
	const focus = useDesktopStore((s) => s.focus);
	const move = useDesktopStore((s) => s.move);
	const resize = useDesktopStore((s) => s.resize);
	const toggleMin = useDesktopStore((s) => s.toggleMin);
	const toggleMax = useDesktopStore((s) => s.toggleMax);
	const close = useDesktopStore((s) => s.close);
	const drag = (0, import_react.useRef)(null);
	const grow = (0, import_react.useRef)(null);
	if (win.minimized) return null;
	const onDragStart = (e) => {
		if (win.maximized) return;
		if (e.target.closest("button")) return;
		e.preventDefault();
		focus(win.id);
		e.currentTarget.setPointerCapture(e.pointerId);
		drag.current = {
			ox: e.clientX,
			oy: e.clientY,
			x: win.x,
			y: win.y
		};
	};
	const onDragMove = (e) => {
		if (!drag.current) return;
		const dx = e.clientX - drag.current.ox;
		const dy = e.clientY - drag.current.oy;
		move(win.id, drag.current.x + dx, Math.max(0, drag.current.y + dy));
	};
	const onDragEnd = () => {
		drag.current = null;
	};
	const onGrowStart = (e) => {
		if (win.maximized) return;
		e.stopPropagation();
		e.preventDefault();
		focus(win.id);
		e.currentTarget.setPointerCapture(e.pointerId);
		grow.current = {
			x: e.clientX,
			y: e.clientY,
			w: win.w,
			h: win.h
		};
	};
	const onGrowMove = (e) => {
		if (!grow.current) return;
		resize(win.id, grow.current.w + (e.clientX - grow.current.x), grow.current.h + (e.clientY - grow.current.y));
	};
	const onGrowEnd = () => {
		grow.current = null;
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		role: "dialog",
		"aria-label": win.title,
		onPointerDown: () => focus(win.id),
		className: cn("plasma-window absolute flex flex-col overflow-hidden rounded-lg", focused ? "opacity-100" : "opacity-95 max-sm:hidden"),
		style: {
			zIndex: win.z,
			left: win.maximized ? 8 : win.x,
			top: win.maximized ? 8 : win.y,
			width: win.maximized ? "calc(100% - 16px)" : win.w,
			height: win.maximized ? "calc(100% - 72px)" : win.h
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "plasma-titlebar flex h-9 shrink-0 items-center gap-2 px-2 select-none",
				onPointerDown: onDragStart,
				onPointerMove: onDragMove,
				onPointerUp: onDragEnd,
				onPointerCancel: onDragEnd,
				onDoubleClick: () => toggleMax(win.id),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "grid size-5 place-items-center text-plasma",
						children: icon
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "min-w-0 flex-1 truncate text-sm font-medium text-fg",
						children: win.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChromeBtn, {
								label: "Minimize",
								onClick: () => toggleMin(win.id),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, {
									className: "size-3.5",
									strokeWidth: 2.2
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChromeBtn, {
								label: "Maximize",
								onClick: () => toggleMax(win.id),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, {
									className: "size-3",
									strokeWidth: 2.2
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChromeBtn, {
								label: "Close",
								danger: true,
								onClick: () => close(win.id),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
									className: "size-3.5",
									strokeWidth: 2.2
								})
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "relative min-h-0 flex-1",
				children
			}),
			!win.maximized ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute right-0 bottom-0 size-4 cursor-nwse-resize",
				onPointerDown: onGrowStart,
				onPointerMove: onGrowMove,
				onPointerUp: onGrowEnd,
				"aria-hidden": true
			}) : null
		]
	});
}
function ChromeBtn({ children, onClick, label, danger }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-label": label,
		onClick,
		className: cn("grid size-6 place-items-center rounded-sm text-fg-muted transition-colors duration-150", danger ? "hover:bg-danger hover:text-fg" : "hover:bg-fg/10 hover:text-fg"),
		children
	});
}
function clipAgeMs(item, now) {
	if (item.copiedAt > 0) {
		if (now <= 0) return 0;
		return Math.max(0, now - item.copiedAt);
	}
	return item.seedAgeMs ?? 0;
}
/** Age as s / m / h / d. */
function formatAge(ageMs) {
	const s = Math.max(0, Math.floor(ageMs / 1e3));
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h`;
	return `${Math.floor(h / 24)}d`;
}
function byteLength(text) {
	return new TextEncoder().encode(text).length;
}
/** Size in KiB from UTF-8 byte length. */
function formatKib(text) {
	const kib = byteLength(text) / 1024;
	if (kib < .01) return `${kib.toFixed(3)} KiB`;
	if (kib < 10) return `${kib.toFixed(2)} KiB`;
	if (kib < 100) return `${kib.toFixed(1)} KiB`;
	return `${Math.round(kib)} KiB`;
}
function preview128(text) {
	const normalized = text.replace(/\s+/g, " ").trim();
	if (normalized.length <= 128) return normalized;
	return `${normalized.slice(0, 128)}`;
}
function previewShort(text, max = 36) {
	const normalized = text.replace(/\s+/g, " ").trim();
	if (normalized.length <= max) return normalized;
	return `${normalized.slice(0, max - 1)}…`;
}
function downloadTextFile(filename, text) {
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
function clipFilename(item, now = Date.now()) {
	const t = item.copiedAt > 0 ? item.copiedAt : now;
	const d = new Date(t);
	const pad = (n) => String(n).padStart(2, "0");
	return `clip-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.txt`;
}
function pasteClip(index) {
	const { items } = useClipboardStore.getState();
	const item = items[index];
	const desk = useDesktopStore.getState();
	if (!item) {
		desk.notify("Buffer empty", "Copy something first.");
		desk.closeWheel();
		return;
	}
	const ok = pasteIntoEditor(item.text);
	navigator.clipboard?.writeText(item.text).catch(() => {});
	if (!ok) desk.openApp("kate", {
		text: item.text,
		fileName: clipFilename(item)
	});
	desk.notify("Pasted", previewShort(item.text, 48));
	desk.closeWheel();
}
function saveClip(index) {
	const { items } = useClipboardStore.getState();
	const item = items[index];
	if (!item) return;
	const name = clipFilename(item);
	downloadTextFile(name, item.text);
	useDesktopStore.getState().notify("Saved", name);
}
function openClipInKate(index) {
	const { items } = useClipboardStore.getState();
	const item = items[index];
	if (!item) return;
	const name = clipFilename(item);
	useDesktopStore.getState().openApp("kate", {
		text: item.text,
		fileName: name
	});
	useDesktopStore.getState().notify("Opened in Kate", name);
	useDesktopStore.getState().closeWheel();
}
function dropClip(index) {
	const next = useClipboardStore.getState().removeAt(index);
	useDesktopStore.getState().notify("Removed", "Slot dropped from the buffer.");
	return next;
}
function useNow(active) {
	const [now, setNow] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		if (!active) return;
		setNow(Date.now());
		const id = window.setInterval(() => setNow(Date.now()), 1e3);
		return () => window.clearInterval(id);
	}, [active]);
	return now;
}
function layout(count, originX, originY, vw, vh) {
	const rings = Math.max(1, ringCountFor(count));
	const mobile = vw < 640;
	const inner = mobile ? 70 : 124;
	const thick = mobile ? 92 : 140;
	const gap = mobile ? 18 : 36;
	const maxR = inner + thick + (rings - 1) * (thick + gap);
	const size = (maxR + thick * .15) * 2 + 8;
	const fitW = vw - (mobile ? 12 : 24);
	const fitH = vh - (mobile ? 150 : 96);
	const scale = Math.min(1, fitW / size, fitH / size);
	const pad = size * scale / 2 + 8;
	return {
		rings,
		inner,
		thick,
		gap,
		maxR,
		cx: Math.min(Math.max(originX, pad), vw - pad),
		cy: Math.min(Math.max(originY, pad + 8), vh - 64 - pad),
		mobile,
		size,
		scale
	};
}
function RadialClipboard() {
	const wheel = useDesktopStore((s) => s.wheel);
	const items = useClipboardStore((s) => s.items);
	const setSelected = useDesktopStore((s) => s.setSelected);
	const closeWheel = useDesktopStore((s) => s.closeWheel);
	const now = useNow(wheel.open);
	const [vp, setVp] = (0, import_react.useState)({
		w: 1280,
		h: 800
	});
	(0, import_react.useEffect)(() => {
		const measure = () => setVp({
			w: window.innerWidth,
			h: window.innerHeight
		});
		measure();
		window.addEventListener("resize", measure);
		return () => window.removeEventListener("resize", measure);
	}, []);
	const geo = (0, import_react.useMemo)(() => layout(Math.max(items.length, 1), wheel.originX, wheel.originY, vp.w, vp.h), [
		items.length,
		wheel.originX,
		wheel.originY,
		vp.w,
		vp.h
	]);
	if (!wheel.open || typeof document === "undefined") return null;
	const selected = items.length ? Math.min(wheel.selected, items.length - 1) : 0;
	const selectedItem = items[selected];
	const size = geo.size;
	const content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none fixed inset-0 z-[80]",
		role: "presentation",
		children: [
			wheel.mode === "latch" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-auto absolute inset-0",
				onClick: () => closeWheel(),
				"aria-hidden": true
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-auto wheel-enter absolute",
				role: "listbox",
				"aria-label": "Clipboard ring",
				"aria-activedescendant": selectedItem ? `clip-${selectedItem.id}` : void 0,
				style: {
					left: geo.cx - size * geo.scale / 2,
					top: geo.cy - size * geo.scale / 2,
					width: size,
					height: size,
					transform: `scale(${geo.scale})`,
					transformOrigin: "top left"
				},
				children: [
					Array.from({ length: geo.rings }, (_, r) => {
						const outer = geo.inner + geo.thick + r * (geo.thick + geo.gap);
						const innerR = outer - geo.thick;
						const dim = outer * 2;
						const mask = `radial-gradient(circle, transparent ${(innerR / outer * 100).toFixed(2)}%, #000 ${(innerR / outer * 100 + .4).toFixed(2)}%)`;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ring-band pointer-events-none absolute rounded-full",
							style: {
								width: dim,
								height: dim,
								left: "50%",
								top: "50%",
								transform: "translate(-50%, -50%)",
								WebkitMaskImage: mask,
								maskImage: mask
							}
						}, r);
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
						className: "pointer-events-none absolute inset-0",
						viewBox: `0 0 ${size} ${size}`,
						"aria-hidden": true,
						children: items.length > 0 ? (() => {
							const r = ringIndexOf(selected);
							const slot = slotOnRing(selected);
							const outer = geo.inner + geo.thick / 2 + r * (geo.thick + geo.gap);
							const cx = size / 2;
							const cy = size / 2;
							const start = -Math.PI / 2 + slot * (Math.PI * 2 / 8) - Math.PI / 8;
							const end = start + Math.PI * 2 / 8;
							const d = `M ${cx + Math.cos(start) * outer} ${cy + Math.sin(start) * outer} A ${outer} ${outer} 0 0 1 ${cx + Math.cos(end) * outer} ${cy + Math.sin(end) * outer}`;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								d,
								fill: "none",
								stroke: "var(--color-plasma)",
								strokeWidth: geo.mobile ? 4 : 5,
								strokeLinecap: "round"
							});
						})() : null
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "pointer-events-none absolute inset-0 grid place-items-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col items-center gap-0.5 text-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-xs text-plasma tabular-nums",
								children: items.length ? `${selected + 1}/${items.length}` : "0/0"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "max-w-28 text-2xs leading-tight text-fg-muted",
								children: wheel.mode === "hold" ? "release V to paste" : "Enter or tap to paste"
							})]
						})
					}),
					items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "glass-card pointer-events-none absolute top-1/2 left-1/2 w-48 -translate-x-1/2 translate-y-10 rounded-md px-3 py-2 text-center text-xs text-fg-muted",
						children: "Buffer empty. Copy something first."
					}) : null,
					items.map((item, i) => {
						const r = ringIndexOf(i);
						const slot = slotOnRing(i);
						const radius = geo.inner + geo.thick / 2 + r * (geo.thick + geo.gap);
						const angle = -Math.PI / 2 + slot * (Math.PI * 2 / 8);
						const x = Math.cos(angle) * radius;
						const y = Math.sin(angle) * radius;
						const active = i === selected;
						const badge = badgeForIndex(i);
						const age = formatAge(clipAgeMs(item, now || Date.now()));
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							id: `clip-${item.id}`,
							type: "button",
							role: "option",
							"aria-selected": active,
							onPointerDown: (e) => {
								e.preventDefault();
								e.stopPropagation();
								setSelected(i);
							},
							onClick: (e) => {
								e.preventDefault();
								e.stopPropagation();
								if (active || wheel.mode === "latch") pasteClip(i);
								else setSelected(i);
							},
							onDoubleClick: (e) => {
								e.preventDefault();
								pasteClip(i);
							},
							className: cn("glass-card absolute rounded-md px-2 py-1.5 text-left transition-[transform,opacity,border-color] duration-150 ease-out", active ? "glass-card-active z-10" : "z-0 opacity-90"),
							style: {
								width: active ? geo.mobile ? 156 : 196 : geo.mobile ? 112 : 132,
								left: "50%",
								top: "50%",
								transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${active ? 1.05 : 1})`
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5",
								children: [badge ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: cn("grid size-5 shrink-0 place-items-center rounded-full font-mono text-2xs font-semibold tabular-nums", active ? "bg-plasma text-plasma-fg" : "bg-fg/10 text-fg-muted"),
									children: badge
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "grid size-5 shrink-0 place-items-center font-mono text-2xs text-fg-subtle tabular-nums",
									children: i + 1
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "min-w-0 flex-1 truncate font-mono text-2xs text-fg-subtle tabular-nums",
									children: [
										formatKib(item.text),
										" · ",
										age
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: cn("mt-1 font-sans text-fg", active ? "line-clamp-4 text-xs leading-4" : "truncate text-xs leading-4"),
								children: active ? preview128(item.text) : previewShort(item.text, geo.mobile ? 22 : 32)
							})]
						}, item.id);
					})
				]
			}),
			selectedItem ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-auto absolute inset-x-0 bottom-16 z-[81] mx-auto w-full max-w-xl px-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "glass-card flex flex-wrap items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-fg-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "hidden sm:inline",
							children: "Enter paste"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Del drop" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "MMB Kate" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "S save" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "rounded-sm bg-plasma px-2 py-1 font-medium text-plasma-fg",
							onClick: () => pasteClip(selected),
							children: "Paste"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "rounded-sm bg-fg/10 px-2 py-1",
							onClick: () => saveClip(selected),
							children: "Save"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "rounded-sm bg-fg/10 px-2 py-1",
							onClick: () => openClipInKate(selected),
							children: "Open"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "rounded-sm px-2 py-1",
							onClick: () => closeWheel(),
							children: "Esc"
						})
					]
				})
			}) : null
		]
	});
	return (0, import_react_dom.createPortal)(content, document.body);
}
function isMod(e) {
	return e.ctrlKey || e.metaKey;
}
function stepIndex(current, delta, length) {
	if (length <= 0) return 0;
	return (current + delta + length * 8) % length;
}
function arrowDelta(key) {
	if (key === "ArrowRight" || key === "ArrowDown") return 1;
	if (key === "ArrowLeft" || key === "ArrowUp") return -1;
	return null;
}
function useKlipHotkeys() {
	(0, import_react.useEffect)(() => {
		const onPointer = (e) => {
			useDesktopStore.getState().setPointer(e.clientX, e.clientY);
		};
		const onKeyDown = (e) => {
			const desk = useDesktopStore.getState();
			const clip = useClipboardStore.getState();
			const { wheel } = desk;
			if (e.key === "Control" || e.key === "Meta") desk.setMod({ ctrlDown: true });
			const mod = isMod(e);
			const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
			if (mod && key === "v" && !e.repeat) {
				e.preventDefault();
				e.stopPropagation();
				desk.setMod({
					ctrlDown: true,
					vDown: true
				});
				if (!wheel.open) {
					const { x, y } = useDesktopStore.getState().pointer;
					desk.openWheel("hold", x, y);
				}
				return;
			}
			if (!wheel.open) {
				if (key === "Escape") desk.setKickoff(false);
				return;
			}
			if (key === "Escape") {
				e.preventDefault();
				desk.closeWheel();
				return;
			}
			if (key === "Enter") {
				e.preventDefault();
				pasteClip(wheel.selected);
				return;
			}
			if (key === "Backspace" || key === "Delete") {
				e.preventDefault();
				desk.setSelected(dropClip(wheel.selected));
				return;
			}
			if ((mod || wheel.mode === "latch") && key === "s") {
				e.preventDefault();
				saveClip(wheel.selected);
				return;
			}
			const digitIndex = indexFromDigitKey(e.key);
			if (digitIndex != null) {
				e.preventDefault();
				if (digitIndex < clip.items.length) desk.setSelected(digitIndex);
				return;
			}
			const delta = arrowDelta(key);
			if (delta != null) {
				e.preventDefault();
				desk.setSelected(stepIndex(wheel.selected, delta, clip.items.length));
			}
		};
		const onKeyUp = (e) => {
			const desk = useDesktopStore.getState();
			const { wheel } = desk;
			if (e.key === "Control" || e.key === "Meta") {
				desk.setMod({ ctrlDown: false });
				if (wheel.open && wheel.mode === "hold" && !wheel.vDown) desk.closeWheel();
				return;
			}
			if (e.key === "v" || e.key === "V") {
				desk.setMod({ vDown: false });
				if (wheel.open && wheel.mode === "hold") {
					e.preventDefault();
					pasteClip(wheel.selected);
				}
			}
		};
		const onWheel = (e) => {
			const desk = useDesktopStore.getState();
			if (!desk.wheel.open) return;
			e.preventDefault();
			const len = useClipboardStore.getState().items.length;
			const dir = e.deltaY > 0 ? 1 : -1;
			desk.setSelected(stepIndex(desk.wheel.selected, dir, len));
		};
		const onMouseDown = (e) => {
			if (e.button === 1 && useDesktopStore.getState().wheel.open) e.preventDefault();
		};
		const onAux = (e) => {
			const desk = useDesktopStore.getState();
			if (!desk.wheel.open || e.button !== 1) return;
			e.preventDefault();
			openClipInKate(desk.wheel.selected);
		};
		const onCopy = () => {
			const text = selectedTextFromTarget(document.activeElement) || window.getSelection()?.toString() || "";
			if (!text) return;
			const item = useClipboardStore.getState().push(text);
			if (item) useDesktopStore.getState().notify("Copied", previewShort(item.text, 48));
		};
		window.addEventListener("pointermove", onPointer, { passive: true });
		window.addEventListener("keydown", onKeyDown, true);
		window.addEventListener("keyup", onKeyUp, true);
		window.addEventListener("wheel", onWheel, {
			passive: false,
			capture: true
		});
		window.addEventListener("mousedown", onMouseDown, true);
		window.addEventListener("auxclick", onAux, true);
		document.addEventListener("copy", onCopy, true);
		return () => {
			window.removeEventListener("pointermove", onPointer);
			window.removeEventListener("keydown", onKeyDown, true);
			window.removeEventListener("keyup", onKeyUp, true);
			window.removeEventListener("wheel", onWheel, true);
			window.removeEventListener("mousedown", onMouseDown, true);
			window.removeEventListener("auxclick", onAux, true);
			document.removeEventListener("copy", onCopy, true);
		};
	}, []);
}
function PlasmaDesktop() {
	useKlipHotkeys();
	const windows = useDesktopStore((s) => s.windows);
	const notices = useDesktopStore((s) => s.notices);
	const dismissNotice = useDesktopStore((s) => s.dismissNotice);
	const zTop = useDesktopStore((s) => s.zTop);
	const openApp = useDesktopStore((s) => s.openApp);
	const openWheel = useDesktopStore((s) => s.openWheel);
	const setKickoff = useDesktopStore((s) => s.setKickoff);
	const notify = useDesktopStore((s) => s.notify);
	const items = useClipboardStore((s) => s.items);
	const wheelOpen = useDesktopStore((s) => s.wheel.open);
	const [menu, setMenu] = (0, import_react.useState)(null);
	const [noteHidden, setNoteHidden] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		const finish = () => {
			if (!cancelled) useClipboardStore.getState().setHydrated(true);
		};
		Promise.resolve(useClipboardStore.persist.rehydrate()).then(finish, finish);
		const boot = window.setTimeout(() => {
			const desk = useDesktopStore.getState();
			if (!desk.wheel.open) desk.openWheel("latch", window.innerWidth * .55, window.innerHeight * .42);
		}, 450);
		return () => {
			cancelled = true;
			window.clearTimeout(boot);
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const close = () => setMenu(null);
		window.addEventListener("click", close);
		return () => window.removeEventListener("click", close);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-dvh w-full overflow-hidden bg-desktop text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wallpaper, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 bottom-12",
				onContextMenu: (e) => {
					e.preventDefault();
					setKickoff(false);
					setMenu({
						x: e.clientX,
						y: e.clientY
					});
				},
				onPointerDown: () => setKickoff(false)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DesktopIcons, {
				onOpen: openApp,
				onTrash: () => notify("Trash", "Trash is empty.")
			}),
			!noteHidden ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "absolute top-6 right-4 z-20 w-56 rounded-md border border-black/10 bg-note p-3 text-note-fg shadow-window sm:w-64",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-2 flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-semibold tracking-wide uppercase",
						children: "KlipRing"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "Dismiss note",
						className: "text-sm leading-none",
						onClick: () => setNoteHidden(true),
						children: "×"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "space-y-1.5 text-xs leading-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Hold Ctrl+V — wheel on cursor" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Scroll / 1–9 / 0 / arrows" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Release V or Enter — paste" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Del — drop slot" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Middle-click — open in Kate" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Ctrl+V then S — save .txt" })
					]
				})]
			}) : null,
			windows.map((win) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlasmaWindow, {
				win,
				focused: win.z === zTop && !win.minimized,
				icon: appIcon(win.app),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientApp, { win })
			}, win.id)),
			menu ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DesktopMenu, {
				x: menu.x,
				y: menu.y,
				onClose: () => setMenu(null),
				onPasteRecent: () => {
					if (items[0]) pasteClip(0);
				},
				onOpen: openApp,
				onWheel: () => openWheel("latch", menu.x, menu.y)
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute right-3 bottom-16 z-50 flex w-72 max-w-[calc(100%-1.5rem)] flex-col gap-2",
				children: notices.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => dismissNotice(n.id),
					className: "notice-enter pointer-events-auto rounded-md border border-border bg-panel/95 p-3 text-left shadow-window",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium",
						children: n.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "truncate text-xs text-fg-muted",
						children: n.body
					})]
				}, n.id))
			}),
			!wheelOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "absolute bottom-16 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-panel/90 px-4 py-2 text-sm shadow-window sm:hidden",
				onClick: () => openWheel("latch", window.innerWidth / 2, window.innerHeight / 2 - 40),
				children: "Open clip ring"
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadialClipboard, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlasmaPanel, {})
		]
	});
}
function ClientApp({ win }) {
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => setReady(true), []);
	if (!ready) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-full bg-window" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppBody, { win });
}
function AppBody({ win }) {
	if (win.app === "kate") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kate, {
		windowId: win.id,
		initialText: win.payload?.text,
		fileName: win.payload?.fileName
	});
	if (win.app === "konsole") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Konsole, { windowId: win.id });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, {});
}
function appIcon(app) {
	if (app === "kate") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileCode2, { className: "size-3.5" });
	if (app === "konsole") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareTerminal, { className: "size-3.5" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, { className: "size-3.5" });
}
function Wallpaper() {
	const [failed, setFailed] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-0 bg-desktop",
		children: [failed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,#2a3340,transparent_55%),linear-gradient(#12161c,#1a2230_55%,#3a2a24)]" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: "/wallpaper.jpg",
			alt: "",
			className: "h-full w-full object-cover",
			onError: () => setFailed(true)
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-desktop/20" })]
	});
}
function DesktopIcons({ onOpen, onTrash }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute top-6 left-4 z-10 flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeskIcon, {
				label: "Kate",
				onClick: () => onOpen("kate"),
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileCode2, { className: "size-7 text-plasma" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeskIcon, {
				label: "Konsole",
				onClick: () => onOpen("konsole"),
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareTerminal, { className: "size-7 text-ok" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeskIcon, {
				label: "Settings",
				onClick: () => onOpen("settings"),
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, { className: "size-7 text-fg-muted" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeskIcon, {
				label: "Home",
				onClick: () => onOpen("kate"),
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Folder, { className: "size-7 text-plasma" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeskIcon, {
				label: "Trash",
				onClick: onTrash,
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-7 text-fg-subtle" })
			})
		]
	});
}
function DeskIcon({ label, icon, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: "desktop-icon flex w-20 flex-col items-center gap-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "grid size-12 place-items-center rounded-lg bg-desktop/50 shadow-sm backdrop-blur-sm",
			children: icon
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "desktop-icon-label rounded-sm px-1 text-center text-xs text-fg drop-shadow",
			children: label
		})]
	});
}
function DesktopMenu({ x, y, onClose, onPasteRecent, onOpen, onWheel }) {
	const recent = useClipboardStore((s) => s.items[0]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute z-50 min-w-48 overflow-hidden rounded-md border border-border bg-panel py-1 text-sm shadow-window",
		style: {
			left: x,
			top: y
		},
		onClick: onClose,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuRow, {
				label: recent ? `Paste “${previewShort(recent.text, 22)}”` : "Paste",
				onClick: onPasteRecent,
				disabled: !recent
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuRow, {
				label: "Open clip ring",
				onClick: onWheel
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "my-1 h-px bg-border" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuRow, {
				label: "Kate",
				onClick: () => onOpen("kate")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuRow, {
				label: "Konsole",
				onClick: () => onOpen("konsole")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuRow, {
				label: "Settings",
				onClick: () => onOpen("settings")
			})
		]
	});
}
function MenuRow({ label, onClick, disabled }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		disabled,
		onClick,
		className: cn("block w-full px-3 py-1.5 text-left hover:bg-plasma/25", disabled && "opacity-40"),
		children: label
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlasmaDesktop, {});
}
//#endregion
export { Home as component };
