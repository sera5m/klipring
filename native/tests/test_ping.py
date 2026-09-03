import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from klipring.ping import ping_show


class PingTests(unittest.TestCase):
    def test_ping_returns_bool(self):
        self.assertIsInstance(ping_show(), bool)


if __name__ == "__main__":
    unittest.main()
