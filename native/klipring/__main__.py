from __future__ import annotations

import sys


def main(argv: list[str] | None = None) -> int:
    from .app import run

    return run(list(sys.argv if argv is None else argv))


if __name__ == "__main__":
    raise SystemExit(main())
