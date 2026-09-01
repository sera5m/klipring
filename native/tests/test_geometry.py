import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from klipring.geometry import (
    hit_index_at,
    locate,
    ring_count_for,
    slots_on_ring,
    start_index_of_ring,
)


class GeometryTest(unittest.TestCase):
    def test_slots(self) -> None:
        self.assertEqual(slots_on_ring(0), 8)
        self.assertEqual(slots_on_ring(1), 12)
        self.assertEqual(slots_on_ring(2), 16)
        self.assertEqual(slots_on_ring(3), 20)

    def test_capacity_rings(self) -> None:
        self.assertEqual(start_index_of_ring(0), 0)
        self.assertEqual(start_index_of_ring(1), 8)
        self.assertEqual(start_index_of_ring(2), 20)
        self.assertEqual(ring_count_for(8), 1)
        self.assertEqual(ring_count_for(9), 2)
        self.assertEqual(ring_count_for(20), 2)
        self.assertEqual(ring_count_for(21), 3)

    def test_locate(self) -> None:
        self.assertEqual(locate(0), (0, 0, 8))
        self.assertEqual(locate(7), (0, 7, 8))
        self.assertEqual(locate(8), (1, 0, 12))

    def test_hit_north(self) -> None:
        inner, thick, gap = 124.0, 140.0, 36.0
        mid = inner + thick / 2
        self.assertEqual(hit_index_at(0, -mid, 8, inner, thick, gap), 0)
        self.assertEqual(hit_index_at(mid, 0, 8, inner, thick, gap), 2)


if __name__ == "__main__":
    unittest.main()
