import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from klipring.pointer import clamp_origin, looks_captured, screen_center


class PointerTests(unittest.TestCase):
    def test_bottom_edge_moves_up(self):
        ox, oy = clamp_origin(400, 1400, 0, 0, 2560, 1440, radius=300, pad=18)
        self.assertLessEqual(oy + 300 + 18, 1440)
        self.assertGreaterEqual(oy - 300 - 18, 0)
        self.assertEqual(ox, 400)

    def test_only_shifts_overflow_axis(self):
        ox, oy = clamp_origin(400, 10, 0, 0, 2560, 1440, radius=200, pad=20)
        self.assertEqual(ox, 400)
        self.assertEqual(oy, 220)

    def test_tiny_screen_centers(self):
        ox, oy = clamp_origin(10, 10, 0, 0, 200, 200, radius=300, pad=18)
        self.assertEqual((ox, oy), screen_center(0, 0, 200, 200))

    def test_pointer_lock_zero(self):
        self.assertTrue(looks_captured(0, 0, 800, 600))
        self.assertFalse(looks_captured(0, 0, 10, 10))
        self.assertFalse(looks_captured(800, 600, 810, 590))


if __name__ == "__main__":
    unittest.main()
