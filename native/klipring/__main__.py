from __future__ import annotations

import sys


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv if argv is None else argv)
    if "--show" in argv:
        from .ping import ping_show

        if ping_show():
            return 0
    from .app import run

    return run(argv)


if __name__ == "__main__":
    raise SystemExit(main())
