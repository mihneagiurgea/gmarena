from dataclasses import dataclass, field
from typing import Optional, Any, Dict, Tuple, List
import heapq

@dataclass(frozen=True)
class Pt:
    x: int
    y: int

class SquareGrid:
    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height

    def distance(self, p1: Pt, p2: Pt) -> int:
        dx = abs(p1.x - p2.x)
        dy = abs(p1.y - p2.y)
        diag = min(dx, dy)
        straight = max(dx, dy) - diag
        # 1 for straight, 1.5 for diagonal (floor(1.5 * diag) = diag + diag//2)
        return straight + diag + (diag // 2)

class HexGrid:
    """Hex grid for game board, using odd-r offset coordinates, as per 
    https://www.redblobgames.com/grids/hexagons/
    """
    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height
        self._grid: Dict[Pt, Any] = {}

    def _to_cube(self, p: Pt) -> Tuple[int, int, int]:
        # Convert odd-r offset coordinates to cube coordinates
        # q = x - (y - (y&1)) / 2
        # r = y
        # s = -q - r
        q = p.x - (p.y - (p.y & 1)) // 2
        r = p.y
        s = -q - r
        return (q, r, s)

    def distance(self, p1: Pt, p2: Pt) -> int:
        q1, r1, s1 = self._to_cube(p1)
        q2, r2, s2 = self._to_cube(p2)
        return (abs(q1 - q2) + abs(r1 - r2) + abs(s1 - s2)) // 2

    def __setitem__(self, pos: Pt, obj: Any):
        if not (0 <= pos.x < self.width and 0 <= pos.y < self.height):
            raise IndexError(f"Position {pos} is out of bounds (Width: {self.width}, Height: {self.height})")
        self._grid[pos] = obj

    def __getitem__(self, pos: Pt) -> Optional[Any]:
        if not (0 <= pos.x < self.width and 0 <= pos.y < self.height):
            return None
        return self._grid.get(pos)

    def get_neighbors(self, pos: Pt) -> List[Pt]:
        neighbors = []
        x, y = pos.x, pos.y
        
        if y % 2 == 0:
            offsets = [(-1, 0), (1, 0), (-1, -1), (0, -1), (-1, 1), (0, 1)]
        else:
            offsets = [(-1, 0), (1, 0), (0, -1), (1, -1), (0, 1), (1, 1)]
            
        for dx, dy in offsets:
            nx, ny = x + dx, y + dy
            if 0 <= nx < self.width and 0 <= ny < self.height:
                neighbors.append(Pt(nx, ny))
                
        return neighbors

    def find_path(self, start: Pt, goal: Pt) -> Optional[List[Pt]]:
        if start == goal:
            return [start]
        
        # If goal is occupied or out of bounds (handled by get_neighbors logic implicitly, but good to check), return None
        if goal in self._grid:
            return None
            
        # Priority queue for A*: (f_score, count, current_node)
        # We use a counter to break ties so Position doesn't need to be comparable
        count = 0
        open_set = [(0, count, start)]
        came_from: Dict[Pt, Pt] = {}
        
        g_score: Dict[Pt, int] = {start: 0}
        f_score: Dict[Pt, int] = {start: self.distance(start, goal)}
        
        open_set_hash = {start} # To check membership in O(1)
        
        while open_set:
            current = heapq.heappop(open_set)[2]
            open_set_hash.discard(current)
            
            if current == goal:
                return self._reconstruct_path(came_from, current)
            
            for neighbor in self.get_neighbors(current):
                # Check if neighbor is occupied (obstacle)
                # We treat all objects in grid as obstacles
                if neighbor in self._grid and neighbor != goal:
                    continue
                
                tentative_g_score = g_score[current] + 1 # cost is always 1
                
                if tentative_g_score < g_score.get(neighbor, float('inf')):
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g_score
                    f = tentative_g_score + self.distance(neighbor, goal)
                    f_score[neighbor] = f
                    
                    if neighbor not in open_set_hash:
                        count += 1
                        heapq.heappush(open_set, (f, count, neighbor))
                        open_set_hash.add(neighbor)
                        
        return None

    def _reconstruct_path(self, came_from: Dict[Pt, Pt], current: Pt) -> List[Pt]:
        total_path = [current]
        while current in came_from:
            current = came_from[current]
            total_path.append(current)
        return total_path[::-1]
