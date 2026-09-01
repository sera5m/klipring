import type { ClipboardItem } from "./types";

export const SEED_ITEMS: ClipboardItem[] = [
  {
    id: "clip-seed-01",
    copiedAt: 0,
    seedAgeMs: 7_000,
    text: "sudo pacman -Syu",
  },
  {
    id: "clip-seed-02",
    copiedAt: 0,
    seedAgeMs: 28_000,
    text: "sudo pacman -S plasma-workspace kdeplasma-addons kwalletmanager spectacle",
  },
  {
    id: "clip-seed-03",
    copiedAt: 0,
    seedAgeMs: 95_000,
    text: "ssh aur@aur.archlinux.org",
  },
  {
    id: "clip-seed-04",
    copiedAt: 0,
    seedAgeMs: 6 * 60_000,
    text: `import QtQuick
import org.kde.kirigami as Kirigami

Kirigami.ApplicationWindow {
    title: "KlipRing"
    pageStack.initialPage: Kirigami.Page {
        title: "Clipboard"
    }
}`,
  },
  {
    id: "clip-seed-05",
    copiedAt: 0,
    seedAgeMs: 22 * 60_000,
    text: "kwriteconfig6 --file kwinrc --group ModifierOnlyShortcuts --key Meta \"org.kde.kglobalaccel,/component/kwin,org.kde.kglobalaccel.Component,invokeShortcut,Overview\"",
  },
  {
    id: "clip-seed-06",
    copiedAt: 0,
    seedAgeMs: 58 * 60_000,
    text: "Hold Ctrl+V to open the radial clipboard at the cursor. Scroll the wheel to walk the ring, or press 1–9 / 0 for slots 1–10. Release V to paste the highlighted clip into the focused editor.",
  },
  {
    id: "clip-seed-07",
    copiedAt: 0,
    seedAgeMs: 3 * 3600_000,
    text: "git clone git@github.com:user/dotfiles.git ~/.dotfiles && cd ~/.dotfiles && stow kde",
  },
  {
    id: "clip-seed-08",
    copiedAt: 0,
    seedAgeMs: 9 * 3600_000,
    text: `hardware:
  monitors:
    - name: DP-1
      mode: 2560x1440@144
      scale: 1
    - name: HDMI-A-1
      mode: 1920x1080@60
      position: 2560,0`,
  },
  {
    id: "clip-seed-09",
    copiedAt: 0,
    seedAgeMs: 26 * 3600_000,
    text: `kwin_wayland[1842]: qt.qpa.wayland: Wayland does not support QWindow::requestActivate()
plasmashell[1904]: file:///usr/share/plasma/plasmoids/org.kde.plasma.clipboard/contents/ui/ClipboardPage.qml:42: TypeError`,
  },
  {
    id: "clip-seed-10",
    copiedAt: 0,
    seedAgeMs: 3 * 86400_000,
    text: "The clipboard is not a graveyard of forgotten strings. It is a ring. What you copied last sits at the crown; older voices wait on the outer orbit.",
  },
  {
    id: "clip-seed-11",
    copiedAt: 0,
    seedAgeMs: 5 * 86400_000,
    text: "alias clip='wl-paste && echo' # dump the current clipboard",
  },
  {
    id: "clip-seed-12",
    copiedAt: 0,
    seedAgeMs: 8 * 86400_000,
    text: "std::array<ClipboardItem, 20> buffer; // inner 8, outer 12",
  },
];
