import unittest
from game_engine import Position
from hex import HexGrid

class TestHexGrid(unittest.TestCase):
    def setUp(self):
        self.grid = HexGrid(width=5, height=5)

    def test_initialization(self):
        self.assertEqual(self.grid.width, 5)
        self.assertEqual(self.grid.height, 5)
        self.assertIsNone(self.grid[Position(0, 0)])

    def test_set_get_item(self):
        p = Position(1, 1)
        obj = "Unit"
        self.grid[p] = obj
        self.assertEqual(self.grid[p], obj)
        
        # Test overwrite
        obj2 = "Unit2"
        self.grid[p] = obj2
        self.assertEqual(self.grid[p], obj2)

    def test_out_of_bounds_access(self):
        p_out = Position(10, 10)
        self.assertIsNone(self.grid[p_out])
        
        p_neg = Position(-1, 0)
        self.assertIsNone(self.grid[p_neg])

    def test_out_of_bounds_assignment(self):
        p_out = Position(10, 10)
        with self.assertRaises(IndexError):
            self.grid[p_out] = "Fail"

    def test_distance_neighbors_even_row(self):
        # (2, 2) is in an even row (row 2)
        # Neighbors for even row (odd-r):
        # E: (3, 2), W: (1, 2)
        # SE: (2, 3), SW: (1, 3)
        # NE: (2, 1), NW: (1, 1)
        
        center = Position(2, 2)
        neighbors = [
            Position(3, 2), Position(1, 2),
            Position(2, 3), Position(1, 3),
            Position(2, 1), Position(1, 1)
        ]
        
        for n in neighbors:
            self.assertEqual(self.grid.distance(center, n), 1, f"Distance between {center} and {n} should be 1")

    def test_distance_neighbors_odd_row(self):
        # (2, 3) is in an odd row (row 3)
        # Neighbors for odd row (odd-r):
        # E: (3, 3), W: (1, 3)
        # SE: (3, 4), SW: (2, 4)
        # NE: (3, 2), NW: (2, 2)
        
        center = Position(2, 3)
        neighbors = [
            Position(3, 3), Position(1, 3),
            Position(3, 4), Position(2, 4),
            Position(3, 2), Position(2, 2)
        ]
        
        for n in neighbors:
            self.assertEqual(self.grid.distance(center, n), 1, f"Distance between {center} and {n} should be 1")

    def test_distance_further(self):
        # (0, 0) to (0, 2)
        # Path: (0,0) -> (0,1) -> (0,2) ?
        # (0,0) neighbors: (0,1) [SE], (-1,1) [SW - invalid x], etc.
        # (0,1) neighbors: (0,2) [SW].
        # So dist should be 2.
        p1 = Position(0, 0)
        p2 = Position(0, 2)
        self.assertEqual(self.grid.distance(p1, p2), 2)
        
        # (0, 0) to (1, 1)
        # (0,0) -> (0,1) -> (1,1) [E from 0,1]
        # Dist should be 2.
        p3 = Position(1, 1)
        self.assertEqual(self.grid.distance(p1, p3), 2)

        self.assertEqual(self.grid.distance(Position(6, 0), Position(0, 6)), 9)
        self.assertEqual(self.grid.distance(Position(6, 0), Position(6, 6)), 6)
        self.assertEqual(self.grid.distance(Position(0, 6), Position(6, 6)), 6)
        self.assertEqual(self.grid.distance(Position(0, 0), Position(6, 6)), 9)

    def test_distance_same_point(self):
        p = Position(3, 3)
        self.assertEqual(self.grid.distance(p, p), 0)

    def test_get_neighbors(self):
        # Even row (2, 2)
        # Expected: (1, 2), (3, 2), (1, 1), (2, 1), (1, 3), (2, 3)
        p = Position(2, 2)
        neighbors = self.grid.get_neighbors(p)
        expected = {
            Position(1, 2), Position(3, 2),
            Position(1, 1), Position(2, 1),
            Position(1, 3), Position(2, 3)
        }
        self.assertEqual(set(neighbors), expected)
        
        # Odd row (2, 3)
        # Expected: (1, 3), (3, 3), (2, 2), (3, 2), (2, 4), (3, 4)
        p = Position(2, 3)
        neighbors = self.grid.get_neighbors(p)
        expected = {
            Position(1, 3), Position(3, 3),
            Position(2, 2), Position(3, 2),
            Position(2, 4), Position(3, 4)
        }
        self.assertEqual(set(neighbors), expected)
        
        # Corner (0, 0)
        # Even row.
        # Offsets: (-1, 0) [X], (1, 0), (-1, -1) [X], (0, -1) [X], (-1, 1) [X], (0, 1)
        # Expected: (1, 0), (0, 1)
        p = Position(0, 0)
        neighbors = self.grid.get_neighbors(p)
        expected = {Position(1, 0), Position(0, 1)}
        self.assertEqual(set(neighbors), expected)

    def test_find_path(self):
        # Clear path
        # (0,0) -> (0,2)
        # Path: (0,0) -> (0,1) -> (0,2)
        start = Position(0, 0)
        goal = Position(0, 2)
        path = self.grid.find_path(start, goal)
        self.assertIsNotNone(path)
        self.assertEqual(path, [Position(0, 0), Position(0, 1), Position(0, 2)])
        
        # Obstacle
        # Block (0,1). Path should go around.
        # (0,0) neighbors: (1,0), (0,1)[Blocked]
        # (1,0) neighbors: (0,0), (2,0), (1,1), (0,1)[Blocked], ...
        # Path: (0,0) -> (1,0) -> (1,1) -> (1,2) -> (0,2)
        # Length 5 (5 nodes).
        self.grid[Position(0, 1)] = "Obstacle"
        path = self.grid.find_path(start, goal)
        self.assertIsNotNone(path)
        self.assertEqual(len(path), 5)
        self.assertEqual(path[0], start)
        self.assertEqual(path[-1], goal)
        self.assertNotIn(Position(0, 1), path)
        
        # No path (surrounded)
        self.grid[Position(1, 0)] = "Obstacle"
        # (0,0) only has neighbors (1,0) and (0,1), both blocked.
        path = self.grid.find_path(start, goal)
        self.assertIsNone(path)
        
        # Start == Goal
        path = self.grid.find_path(start, start)
        self.assertEqual(path, [start])
        
        # Goal occupied
        self.grid[goal] = "Unit"
        path = self.grid.find_path(start, goal)
        self.assertIsNone(path)

if __name__ == '__main__':
    unittest.main()
