# KlipRing

Radial clipboard pie for **KDE Plasma 6** on Arch / EndeavourOS.

Hold **Ctrl+V** (a KWin global shortcut, not a mouse grab). A hollow purple ring opens on the cursor. Hover a slice, click it or press Enter — it pastes **once** into the focused window.

**Ctrl+C is never stolen.** Copies are watched from the system clipboard the same way Klipper does. If you run `klipring` in a terminal, Ctrl+C is SIGINT — use the tray/autostart instead.

Copies of **text, files, and folders** are watched (not only Qt text). Each slice gets a type icon (document / file / folder). The pie layout is unchanged.

On a dual-monitor Plasma/Wayland box the ring stays on the active screen: if you invoke it near the bottom it slides up, a small hub arrow points at the real cursor, and a captured/0,0 pointer falls back to the last real mouse position (or the screen center).

This is the native daemon (`native/`). The web UI in `src/` is a browser prototype, not what you install.

## Install on EndeavourOS / Arch

```bash
sudo pacman -S --needed git pyside6 qt6-wayland wtype
git clone https://github.com/sera5m/klipring.git
cd klipring/native
makepkg -si
```

Then:

```bash
klipring
```

A tray icon appears. Log out/in and it autostarts.

### Bind Ctrl+V (KWin, no sudo)

EndeavourOS/Plasma binds chords through **KGlobalAccel**, not by grabbing the pointer.

```bash
klipring --bind-shortcut
```

That writes `~/.local/share/applications/klipring-show.desktop` and `~/.config/kglobalshortcutsrc`, then runs `kbuildsycoca6`. Confirm under **System Settings → Keyboard → Shortcuts → KlipRing**.

Ctrl+V at that layer *replaces* in-app paste (that's the point of the wheel). Leave it as Meta+Shift+V in those settings if you want normal Ctrl+V paste kept.

Install `wtype` so selecting a slice can inject Ctrl+V into the window you were in:

```bash
sudo pacman -S wtype
```

### Submit to AUR (optional)

You need an [AUR account](https://aur.archlinux.org) and SSH key.

```bash
git clone ssh://aur@aur.archlinux.org/klipring.git aur-klipring
cp native/PKGBUILD native/klipring.install LICENSE aur-klipring/
cd aur-klipring
makepkg --printsrcinfo > .SRCINFO
git add PKGBUILD .SRCINFO klipring.install
git commit -m "Initial import: klipring 0.1.0"
git push
```

Then `yay -S klipring`.

Until that push, install from the GitHub clone with `makepkg -si` as above.

## Use

| Input | Action |
|---|---|
| Ctrl+V (KWin shortcut) | Open pie on cursor |
| Hover a wedge | Select that clip |
| Click a wedge / Enter | Paste once |
| Scroll / arrows / 1–9 / 0 | Walk slots |
| Release V (if the overlay has focus) | Paste once |
| Delete | Drop slot |
| Middle-click | Open in Kate |
| S | Save as .txt |
| Esc | Close without pasting |

Inner ring is 8 slots. Outer rings are 12, 16, 20. Positions never reflow.

Buffer lives in `~/.local/share/klipring/buffer.json`.

## Tray

Right-click the tray icon to set capacity (8 / 20 / 36 / 56) or quit.
