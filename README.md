# KlipRing

Radial clipboard pie for **KDE Plasma 6** (Wayland) on Arch / EndeavourOS.

Hold **Ctrl+V**. A hollow purple ring opens on the cursor. Hover or click a slice — it pastes once into the window under the pointer.

**Ctrl+C is never stolen.** Copies are watched with `wl-paste` (text, files, folders). Each slice has a type icon; the pie layout does not change.

## Install

```bash
sudo pacman -S --needed git pyside6 qt6-wayland wl-clipboard ydotool
yay -S kdotool          # AUR — places the pie on the cursor
git clone https://github.com/sera5m/klipring.git
cd klipring/native
makepkg -si
systemctl --user enable --now klipring
klipring --bind-shortcut
```

Do not run `klipring` in a foreground terminal (Ctrl+C kills the daemon). Use the user service or tray.

## Use

| Input | Action |
|---|---|
| Ctrl+V | Open pie on cursor |
| Hover / 1–9 / 0 / arrows / scroll | Select a clip |
| Left- or right-click a wedge | Paste that clip and close |
| Enter / release V | Paste the highlighted clip |
| Delete | Drop slot |
| Middle-click | Open in Kate |
| S | Save as `.txt` |
| Esc / click off the ring | Close without pasting |

Inner ring is 8 slots. Outer rings are 12, 16, 20. Most-recent is always slot 1.

Buffer: `~/.local/share/klipring/buffer.json`

## Tray

- Open clip ring
- Capacity 8 / 20 / 36 / 56
- Bind Ctrl+V in KWin
- **Notify on paste** (off by default-toggle)
- Quit

## Notes

- **ydotool** injects the paste. Enable `ydotoold` if your distro ships it.
- **kdotool** is AUR (`yay -S kdotool`), not `pacman -S`.
- Near a screen edge the pie slides inward; paste still clicks the pointer position from **before** the ring opened.
- Firefox/Chrome page inputs usually work. Site chrome (YouTube/Twitter search bars) is inconsistent — that is the browser, not the ring. VS Code, Kate, Konsole are fine.
- If the target would be KlipRing itself, paste is refused (`somehow self is a target`).

## Uninstall leftover state

```bash
systemctl --user disable --now klipring
rm -rf ~/.local/share/klipring ~/.config/klipring
rm -f ~/.local/share/applications/klipring-show.desktop
```
