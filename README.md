# KlipRing

Radial clipboard pie for **KDE Plasma 6** on Arch / EndeavourOS.

Hold **Ctrl+V**. A hollow purple ring opens on the cursor. Hover a slice, release **V**, it pastes **once** into the focused window.

This is the native daemon (`native/`). The web UI in `src/` is a browser prototype, not what you install.

## Install on EndeavourOS / Arch

```bash
sudo pacman -S --needed git python-pyside6 qt6-wayland wtype
git clone https://github.com/sera5m/klipring.git
cd klipring/native
makepkg -si
```

Then:

```bash
klipring
```

A tray icon appears. Log out/in and it autostarts.

### Bind Ctrl+V

Wayland will not let a random app steal Ctrl+V. KWin has to hand it over:

1. **System Settings → Keyboard → Shortcuts**
2. Find **KlipRing** / “Show KlipRing”
3. Set it to **Ctrl+V**
4. First launch also tries `kwriteconfig6` for you — if Plasma rejects it, set it by hand

Install `wtype` so release-V can inject Ctrl+V into the window you were in:

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
| Hold Ctrl+V | Open pie on cursor |
| Hover a wedge | Select that clip |
| Scroll / arrows / 1–9 / 0 | Walk slots |
| Release V / Enter | Paste once |
| Delete | Drop slot |
| Middle-click | Open in Kate |
| S | Save as .txt |
| Esc | Close without pasting |

Inner ring is 8 slots. Outer rings are 12, 16, 20. Positions never reflow.

Buffer lives in `~/.local/share/klipring/buffer.json`.

## Tray

Right-click the tray icon to set capacity (8 / 20 / 36 / 56) or quit.
