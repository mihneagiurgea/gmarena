import unittest
from hex import Pt, SquareGrid

class TestPosition(unittest.TestCase):
    def setUp(self):
        self.grid = SquareGrid(10, 10)

    def test_distance_zero(self):
        p1 = Pt(0, 0)
        p2 = Pt(0, 0)
        self.assertEqual(self.grid.distance(p1, p2), 0)

    def test_distance_horizontal(self):
        p1 = Pt(0, 0)
        p2 = Pt(5, 0)
        self.assertEqual(self.grid.distance(p1, p2), 5)

    def test_distance_vertical(self):
        p1 = Pt(0, 0)
        p2 = Pt(0, 3)
        self.assertEqual(self.grid.distance(p1, p2), 3)

    def test_distance_diagonal_simple(self):
        # Formula implemented: straight + diag + (diag // 2)
        
        # 1 step diagonal: diag=1, straight=0. dist = 0 + 1 + 0 = 1
        p1 = Pt(0, 0)
        p2 = Pt(1, 1)
        self.assertEqual(self.grid.distance(p1, p2), 1)

    def test_distance_diagonal_two_steps(self):
        p1 = Pt(0, 0)
        p2 = Pt(2, 2)
        self.assertEqual(self.grid.distance(p1, p2), 3)

    def test_distance_mixed(self):
        # dx=2, dy=1. diag=1, straight=1.
        # dist = 1 + 1 + (1//2) = 2
        p1 = Pt(0, 0)
        p2 = Pt(2, 1)
        self.assertEqual(self.grid.distance(p1, p2), 2)

    def test_distance_mixed_complex(self):
        # dx=5, dy=2. diag=2, straight=3.
        # dist = 3 + 2 + (2//2) = 6
        p1 = Pt(0, 0)
        p2 = Pt(5, 2)
        self.assertEqual(self.grid.distance(p1, p2), 6)

if __name__ == '__main__':
    unittest.main()
