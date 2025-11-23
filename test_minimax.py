import unittest
from dataclasses import dataclass
from typing import List, Optional, Dict, Tuple
from minimax import GameState, MinimaxSolver

@dataclass(frozen=True)
class NimState:
    tokens: int
    is_max_player_turn: bool

    def is_over(self) -> bool:
        return self.tokens == 0

    def get_possible_moves(self) -> List[int]:
        moves = []
        if self.tokens >= 1:
            moves.append(1)
        if self.tokens >= 2:
            moves.append(2)
        return moves

    def apply(self, move: int) -> 'NimState':
        return NimState(self.tokens - move, not self.is_max_player_turn)

def nim_heuristic(state: GameState) -> int:
    if not isinstance(state, NimState):
        return 0
    
    if state.is_over():
        if state.is_max_player_turn:
            return -1000
        else:
            return 1000
    return 0

class TestMinimax(unittest.TestCase):
    def setUp(self):
        self.solver = MinimaxSolver(nim_heuristic)

    def test_nim_game_win_in_one(self):
        start_state = NimState(tokens=1, is_max_player_turn=True)
        score, move = self.solver.solve(start_state, depth=10, is_maximizing=True)
        self.assertEqual(move, 1)
        self.assertEqual(score, 1000)

    def test_nim_game_win_in_two(self):
        start_state = NimState(tokens=2, is_max_player_turn=True)
        score, move = self.solver.solve(start_state, depth=10, is_maximizing=True)
        self.assertEqual(move, 2)
        self.assertEqual(score, 1000)

    def test_nim_game_force_win(self):
        start_state = NimState(tokens=3, is_max_player_turn=True)
        score, move = self.solver.solve(start_state, depth=10, is_maximizing=True)
        self.assertEqual(score, -1000)

    def test_nim_game_winning_4(self):
        start_state = NimState(tokens=4, is_max_player_turn=True)
        score, move = self.solver.solve(start_state, depth=10, is_maximizing=True)
        self.assertEqual(score, 1000)
        self.assertEqual(move, 1)

    def test_transposition_table_usage(self):
        start_state = NimState(tokens=5, is_max_player_turn=True)
        
        # First run: Populate TT
        score1, _ = self.solver.solve(start_state, depth=10, is_maximizing=True)
        
        self.assertTrue(len(self.solver.transposition_table) > 0, "Transposition table should be populated")
        
        # Manually modify a value in TT to verify it's being used
        key = (start_state, 10, True)
        self.assertIn(key, self.solver.transposition_table)
        
        # Poison the cache
        self.solver.transposition_table[key] = 999999
        
        # Second run: Should return poisoned value
        score2, _ = self.solver.solve(start_state, depth=10, is_maximizing=True)
        self.assertEqual(score2, 999999, "Should return value from transposition table")

if __name__ == '__main__':
    unittest.main()
