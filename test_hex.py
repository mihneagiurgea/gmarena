import unittest
import unittest
from hex import HexGrid, Pt

class TestHexGrid(unittest.TestCase):
    def setUp(self):
        self.grid = HexGrid(width=5, height=5)

    def test_initialization(self):
        self.assertEqual(self.grid.width, 5)
        self.assertEqual(self.grid.height, 5)
        self.assertIsNone(self.grid[Pt(0, 0)])
    
    def test_repr(self):
        # Empty grid
        empty_grid = HexGrid(3, 3)
        self.assertEqual(repr(empty_grid), "HexGrid({})")
        
        # Grid with items - should be sorted by (y, x)
        self.grid[Pt(2, 1)] = 10
        self.grid[Pt(0, 0)] = 1
        self.grid[Pt(1, 0)] = 2
        self.grid[Pt(0, 1)] = 3
        
        repr_str = repr(self.grid)
        # Should be sorted: (0,0), (1,0), (0,1), (2,1)
        expected = "HexGrid({(0, 0): 1, (1, 0): 2, (0, 1): 3, (2, 1): 10})"
        self.assertEqual(repr_str, expected)

    def test_set_get_item(self):
        p = Pt(1, 1)
        obj = 1
        self.grid[p] = obj
        self.assertEqual(self.grid[p], obj)
        
        # Test overwrite
        obj2 = 2
        self.grid[p] = obj2
        self.assertEqual(self.grid[p], obj2)

    def test_out_of_bounds_access(self):
        p_out = Pt(10, 10)
        self.assertIsNone(self.grid[p_out])
        
        p_neg = Pt(-1, 0)
        self.assertIsNone(self.grid[p_neg])

    def test_out_of_bounds_assignment(self):
        p_out = Pt(10, 10)
        with self.assertRaises(IndexError):
            self.grid[p_out] = 1

    def test_distance_neighbors_even_row(self):
        # (2, 2) is in an even row (row 2)
        # Neighbors for even row (odd-r):
        # E: (3, 2), W: (1, 2)
        # SE: (2, 3), SW: (1, 3)
        # NE: (2, 1), NW: (1, 1)
        
        center = Pt(2, 2)
        neighbors = [
            Pt(3, 2), Pt(1, 2),
            Pt(2, 3), Pt(1, 3),
            Pt(2, 1), Pt(1, 1)
        ]
        
        for n in neighbors:
            self.assertEqual(self.grid.distance(center, n), 1, f"Distance between {center} and {n} should be 1")

    def test_distance_neighbors_odd_row(self):
        # (2, 3) is in an odd row (row 3)
        # Neighbors for odd row (odd-r):
        # E: (3, 3), W: (1, 3)
        # SE: (3, 4), SW: (2, 4)
        # NE: (3, 2), NW: (2, 2)
        
        center = Pt(2, 3)
        neighbors = [
            Pt(3, 3), Pt(1, 3),
            Pt(3, 4), Pt(2, 4),
            Pt(3, 2), Pt(2, 2)
        ]
        
        for n in neighbors:
            self.assertEqual(self.grid.distance(center, n), 1, f"Distance between {center} and {n} should be 1")

    def test_distance_further(self):
        # (0, 0) to (0, 2)
        # Path: (0,0) -> (0,1) -> (0,2) ?
        # (0,0) neighbors: (0,1) [SE], (-1,1) [SW - invalid x], etc.
        # (0,1) neighbors: (0,2) [SW].
        # So dist should be 2.
        p1 = Pt(0, 0)
        p2 = Pt(0, 2)
        self.assertEqual(self.grid.distance(p1, p2), 2)
        
        # (0, 0) to (1, 1)
        # (0,0) -> (0,1) -> (1,1) [E from 0,1]
        # Dist should be 2.
        p3 = Pt(1, 1)
        self.assertEqual(self.grid.distance(p1, p3), 2)

        self.assertEqual(self.grid.distance(Pt(6, 0), Pt(0, 6)), 9)
        self.assertEqual(self.grid.distance(Pt(6, 0), Pt(6, 6)), 6)
        self.assertEqual(self.grid.distance(Pt(0, 6), Pt(6, 6)), 6)
        self.assertEqual(self.grid.distance(Pt(0, 0), Pt(6, 6)), 9)

    def test_distance_same_point(self):
        p = Pt(3, 3)
        self.assertEqual(self.grid.distance(p, p), 0)

    def test_get_neighbors(self):
        # Even row (2, 2)
        # Expected: (1, 2), (3, 2), (1, 1), (2, 1), (1, 3), (2, 3)
        p = Pt(2, 2)
        neighbors = self.grid.get_neighbors(p)
        expected = {
            Pt(1, 2), Pt(3, 2),
            Pt(1, 1), Pt(2, 1),
            Pt(1, 3), Pt(2, 3)
        }
        self.assertEqual(set(neighbors), expected)
        
        # Odd row (2, 3)
        # Expected: (1, 3), (3, 3), (2, 2), (3, 2), (2, 4), (3, 4)
        p = Pt(2, 3)
        neighbors = self.grid.get_neighbors(p)
        expected = {
            Pt(1, 3), Pt(3, 3),
            Pt(2, 2), Pt(3, 2),
            Pt(2, 4), Pt(3, 4)
        }
        self.assertEqual(set(neighbors), expected)
        
        # Corner (0, 0)
        # Even row.
        # Offsets: (-1, 0) [X], (1, 0), (-1, -1) [X], (0, -1) [X], (-1, 1) [X], (0, 1)
        # Expected: (1, 0), (0, 1)
        p = Pt(0, 0)
        neighbors = self.grid.get_neighbors(p)
        expected = {Pt(1, 0), Pt(0, 1)}
        self.assertEqual(set(neighbors), expected)

    def test_find_path(self):
        # Clear path
        # (0,0) -> (0,2)
        # Path: (0,0) -> (0,1) -> (0,2)
        start = Pt(0, 0)
        goal = Pt(0, 2)
        path = self.grid.find_path(start, goal)
        self.assertIsNotNone(path)
        self.assertEqual(path, [Pt(0, 0), Pt(0, 1), Pt(0, 2)])
        
        # Obstacle
        # Block (0,1). Path should go around.
        # (0,0) neighbors: (1,0), (0,1)[Blocked]
        # (1,0) neighbors: (0,0), (2,0), (1,1), (0,1)[Blocked], ...
        # Path: (0,0) -> (1,0) -> (1,1) -> (1,2) -> (0,2)
        # Length 5 (5 nodes).
        self.grid[Pt(0, 1)] = 99
        path = self.grid.find_path(start, goal)
        self.assertIsNotNone(path)
        self.assertEqual(len(path), 5)
        self.assertEqual(path[0], start)
        self.assertEqual(path[-1], goal)
        self.assertNotIn(Pt(0, 1), path)
        
        # No path (surrounded)
        self.grid[Pt(0, 1)] = 101
        self.grid[Pt(1, 0)] = 102
        # (0,0) only has neighbors (1,0) and (0,1), both blocked.
        path = self.grid.find_path(start, goal)
        self.assertIsNone(path)
        
        # Start == Goal
        path = self.grid.find_path(start, start)
        self.assertEqual(path, [start])
        
        # Goal occupied
        self.grid[goal] = 100
        path = self.grid.find_path(start, goal)
        self.assertIsNone(path)

    def test_get_pt(self):
        p = Pt(1, 1)
        obj = 1
        self.grid[p] = obj
        
        # Test lookup
        self.assertEqual(self.grid.get_pt(obj), p)
        
        # Test missing
        with self.assertRaises(ValueError):
            self.grid.get_pt(999)
            
        # Test move (implicit via setitem)
        p2 = Pt(2, 2)
        self.grid[p2] = obj
        # obj should move from p to p2
        self.assertEqual(self.grid.get_pt(obj), p2)
        self.assertIsNone(self.grid[p]) # Old position should be empty
        self.assertEqual(self.grid[p2], obj)
        
        # Test overwrite
        obj2 = 2
        self.grid[p2] = obj2
        # obj should be removed from grid
        self.assertEqual(self.grid.get_pt(obj2), p2)
        with self.assertRaises(ValueError):
            self.grid.get_pt(obj)
            
        # Test explicit delete
        del self.grid[p2]
        self.assertIsNone(self.grid[p2])
        with self.assertRaises(ValueError):
            self.grid.get_pt(obj2)
            
    def test_type_error(self):
        p = Pt(0, 0)
        with self.assertRaises(TypeError):
            self.grid[p] = "Not an int"
            
    def test_move(self):
        # Place object at (0, 0)
        oid = 1
        start = Pt(0, 0)
        goal = Pt(0, 4)
        self.grid[start] = oid
        
        # Move 2 cells towards goal
        result = self.grid.move(oid, goal, 2)
        self.assertTrue(result)
        self.assertEqual(self.grid.get_pt(oid), Pt(0, 2))
        self.assertIsNone(self.grid[start])
        
        # Move remaining distance
        result = self.grid.move(oid, goal, 10)  # More than needed
        self.assertTrue(result)
        self.assertEqual(self.grid.get_pt(oid), goal)
        
        # Try to move when already at goal
        result = self.grid.move(oid, goal, 5)
        self.assertFalse(result)
        self.assertEqual(self.grid.get_pt(oid), goal)
        
        # Test with obstacle blocking path
        self.grid[Pt(1, 1)] = 2
        self.grid[Pt(2, 2)] = 3
        result = self.grid.move(oid, Pt(3, 3), 5)
        # Should find a path around obstacles
        self.assertTrue(result)
        
        # Test with no valid path (surrounded)
        grid2 = HexGrid(5, 5)
        grid2[Pt(2, 2)] = 10
        # Surround it completely with unique obstacles
        obstacle_id = 100
        for neighbor in grid2.get_neighbors(Pt(2, 2)):
            grid2[neighbor] = obstacle_id
            obstacle_id += 1
        result = grid2.move(10, Pt(0, 0), 5)
        self.assertFalse(result)
        self.assertEqual(grid2.get_pt(10), Pt(2, 2))  # Didn't move
        
        # Test with invalid oid
        with self.assertRaises(ValueError):
            self.grid.move(999, Pt(1, 1), 1)
    
    def test_find_path_adj(self):
        # Test finding path to adjacent cell when goal is occupied
        self.grid[Pt(0, 0)] = 1
        self.grid[Pt(2, 2)] = 2  # Occupied goal
        
        path = self.grid.find_path_adj(Pt(0, 0), Pt(2, 2))
        self.assertIsNotNone(path)
        # Last position should be adjacent to goal
        last_pos = path[-1]
        self.assertIn(Pt(2, 2), self.grid.get_neighbors(last_pos))
        
        # Test when already adjacent
        self.grid[Pt(1, 1)] = 3
        path = self.grid.find_path_adj(Pt(1, 1), Pt(2, 2))
        self.assertEqual(path, [Pt(1, 1)])
        
        # Test when start == goal
        path = self.grid.find_path_adj(Pt(2, 2), Pt(2, 2))
        self.assertEqual(path, [Pt(2, 2)])
        
        # Test with obstacles blocking some adjacent cells
        self.grid[Pt(3, 3)] = 10  # Goal
        # Block some neighbors
        neighbors = self.grid.get_neighbors(Pt(3, 3))
        self.grid[neighbors[0]] = 20
        self.grid[neighbors[1]] = 21
        
        path = self.grid.find_path_adj(Pt(0, 0), Pt(3, 3))
        self.assertIsNotNone(path)
        # Should find path to one of the unblocked neighbors
        last_pos = path[-1]
        self.assertIn(Pt(3, 3), self.grid.get_neighbors(last_pos))
        
        # Test no path (goal completely surrounded and unreachable)
        grid2 = HexGrid(5, 5)
        grid2[Pt(2, 2)] = 99  # Goal
        # Surround goal and its neighbors
        obstacle_id = 100
        for neighbor in grid2.get_neighbors(Pt(2, 2)):
            grid2[neighbor] = obstacle_id
            obstacle_id += 1
            # Also surround each neighbor
            for n2 in grid2.get_neighbors(neighbor):
                if n2 not in grid2._grid:
                    grid2[n2] = obstacle_id
                    obstacle_id += 1
        
        grid2[Pt(0, 0)] = 1
        path = grid2.find_path_adj(Pt(0, 0), Pt(2, 2))
        self.assertIsNone(path)
    
    def test_move_adj(self):
        # Test moving towards an occupied goal
        self.grid[Pt(0, 0)] = 1
        self.grid[Pt(3, 3)] = 2  # Occupied goal
        
        # Move 2 cells towards goal
        result = self.grid.move_adj(1, Pt(3, 3), 2)
        self.assertTrue(result)
        new_pos = self.grid.get_pt(1)
        self.assertNotEqual(new_pos, Pt(0, 0))  # Moved
        
        # Continue moving until adjacent
        for _ in range(10):  # Max iterations to prevent infinite loop
            pos_before = self.grid.get_pt(1)
            result = self.grid.move_adj(1, Pt(3, 3), 2)
            if not result:
                break
            pos_after = self.grid.get_pt(1)
            if pos_before == pos_after:
                break
        
        # Should now be adjacent to goal
        final_pos = self.grid.get_pt(1)
        self.assertIn(Pt(3, 3), self.grid.get_neighbors(final_pos))
        
        # Try to move again - should return False (already adjacent)
        result = self.grid.move_adj(1, Pt(3, 3), 5)
        self.assertFalse(result)
        
        # Test moving towards unoccupied position
        self.grid[Pt(4, 4)] = 3
        result = self.grid.move_adj(3, Pt(0, 0), 3)
        self.assertTrue(result)
        
        # Test with obstacles
        grid2 = HexGrid(7, 7)
        grid2[Pt(0, 0)] = 10
        grid2[Pt(3, 3)] = 99  # Goal
        # Add some obstacles
        grid2[Pt(1, 1)] = 20
        grid2[Pt(2, 2)] = 21
        
        result = grid2.move_adj(10, Pt(3, 3), 2)
        self.assertTrue(result)
        # Should have moved around obstacles
        self.assertNotEqual(grid2.get_pt(10), Pt(0, 0))
        
        # Test with invalid oid
        with self.assertRaises(ValueError):
            self.grid.move_adj(999, Pt(1, 1), 1)


class TestPt(unittest.TestCase):
    def test_add(self):
        p1 = Pt(1, 2)
        p2 = Pt(3, 4)
        result = p1.add(p2)
        self.assertEqual(result, Pt(4, 6))
        
        # Test negative
        p3 = Pt(-1, -1)
        result = p1.add(p3)
        self.assertEqual(result, Pt(0, 1))
    
    def test_str(self):
        p = Pt(3, 5)
        self.assertEqual(str(p), "(3, 5)")
        
        p2 = Pt(-1, 0)
        self.assertEqual(str(p2), "(-1, 0)")

if __name__ == '__main__':
    unittest.main()
