import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from klipring.focus import is_self, parse_xy


class FocusTests(unittest.TestCase):
    def test_parse_xy_labeled(self):
        self.assertEqual(parse_xy("x:2000 y:200 screen:0 window:9"), (2000, 200))

    def test_parse_xy_y_first(self):
        self.assertEqual(parse_xy("y:200 x:2000"), (2000, 200))

    def test_parse_xy_shell(self):
        self.assertEqual(parse_xy("X=2000\nY=200\nSCREEN=0\n"), (2000, 200))

    def test_parse_xy_unlabeled_ignored(self):
        self.assertIsNone(parse_xy("200 2000"))

    def test_is_self(self):
        self.assertTrue(is_self("KlipRing"))
        self.assertTrue(is_self("python3", "klipring"))
        self.assertFalse(is_self("Kate", "12345"))
        self.assertFalse(is_self("Konsole", "org.kde.konsole"))


if __name__ == "__main__":
    unittest.main()
