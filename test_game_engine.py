import unittest
from game_engine import Position

class TestPosition(unittest.TestCase):
    def test_distance_zero(self):
        p1 = Position(0, 0)
        p2 = Position(0, 0)
        self.assertEqual(p1.distance_to(p2), 0)

    def test_distance_horizontal(self):
        p1 = Position(0, 0)
        p2 = Position(5, 0)
        self.assertEqual(p1.distance_to(p2), 5)

    def test_distance_vertical(self):
        p1 = Position(0, 0)
        p2 = Position(0, 3)
        self.assertEqual(p1.distance_to(p2), 3)

    def test_distance_diagonal_simple(self):
        # 1 diagonal step = 1.5 -> floor(1.5) = 1
        # Wait, the rule is: 1st diag is 1, 2nd is 2 (total 3 for 2 steps), etc.
        # Formula implemented: straight + diag + (diag // 2)
        
        # 1 step diagonal: diag=1, straight=0. dist = 0 + 1 + 0 = 1
        p1 = Position(0, 0)
        p2 = Position(1, 1)
        self.assertEqual(p1.distance_to(p2), 1)

    def test_distance_diagonal_two_steps(self):
        # 2 steps diagonal: diag=2, straight=0. dist = 0 + 2 + (2//2) = 3
        p1 = Position(0, 0)
        p2 = Position(2, 2)
        self.assertEqual(p1.distance_to(p2), 3)

    def test_distance_mixed(self):
        # 2 right, 1 up.
        # dx=2, dy=1. diag=1, straight=1.
        # dist = 1 + 1 + (1//2) = 2
        p1 = Position(0, 0)
        p2 = Position(2, 1)
        self.assertEqual(p1.distance_to(p2), 2)

    def test_distance_mixed_complex(self):
        # 5 right, 2 up.
        # dx=5, dy=2. diag=2, straight=3.
        # dist = 3 + 2 + (2//2) = 6
        p1 = Position(0, 0)
        p2 = Position(5, 2)
        self.assertEqual(p1.distance_to(p2), 6)

if __name__ == '__main__':
    unittest.main()
