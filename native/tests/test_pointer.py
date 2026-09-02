import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from klipring.pointer import clamp_origin, looks_captured, screen_center, shift_for_extent


class PointerTests(unittest.TestCase):
    def test_enough_room_stays_on_mouse(self):
        ox, oy = clamp_origin(800, 600, 0, 0, 2560, 1440, radius=300, pad=18)
        self.assertEqual((ox, oy), (800, 600))

    def test_bottom_edge_moves_up_by_overflow(self):
        # remaining below = 1440-1400 = 40, extent = 318, shift = 40-318 = -278
        ox, oy = clamp_origin(400, 1400, 0, 0, 2560, 1440, radius=300, pad=18)
        self.assertEqual(ox, 400)
        self.assertEqual(oy, 1400 - (318 - 40))

    def test_only_shifts_overflow_axis(self):
        ox, oy = clamp_origin(400, 10, 0, 0, 2560, 1440, radius=200, pad=20)
        self.assertEqual(ox, 400)
        self.assertEqual(oy, 220)

    def test_shift_formula(self):
        self.assertEqual(shift_for_extent(100, 0, 1000, 50), 100)
        self.assertEqual(shift_for_extent(10, 0, 1000, 50), 50)
        self.assertEqual(shift_for_extent(980, 0, 1000, 50), 950)

    def test_tiny_screen_centers(self):
        ox, oy = clamp_origin(10, 10, 0, 0, 200, 200, radius=300, pad=18)
        self.assertEqual((ox, oy), screen_center(0, 0, 200, 200))

    def test_pointer_lock_zero(self):
        self.assertTrue(looks_captured(0, 0, 800, 600))
        self.assertFalse(looks_captured(0, 0, 10, 10))
        self.assertFalse(looks_captured(800, 600, 810, 590))


if __name__ == "__main__":
    unittest.main()
