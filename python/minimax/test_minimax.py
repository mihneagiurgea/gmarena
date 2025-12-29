import unittest
from dataclasses import dataclass
from typing import List, Optional, Dict, Tuple
from minimax.minimax import GameState, MinimaxSolver

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

    def apply(self, move: int) -> List[Tuple['NimState', float]]:
        # Deterministic game: return single outcome with probability 1.0
        return [(NimState(self.tokens - move, not self.is_max_player_turn), 1.0)]

def nim_heuristic(state: GameState) -> float:
    if not isinstance(state, NimState):
        return 0.0
    
    if state.is_over():
        if state.is_max_player_turn:
            return -1000.0
        else:
            return 1000.0
    return 0.0

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

@dataclass(frozen=True)
class CoinFlipState:
    """A simple non-deterministic game where moves have probabilistic outcomes."""
    score: int
    moves_left: int
    
    def is_over(self) -> bool:
        return self.moves_left == 0
    
    def get_possible_moves(self) -> List[str]:
        if self.moves_left > 0:
            return ["flip"]
        return []
    
    def apply(self, move: str) -> List[Tuple['CoinFlipState', float]]:
        """Flip a coin: 50% chance of +10, 50% chance of -5"""
        if move == "flip":
            return [
                (CoinFlipState(self.score + 10, self.moves_left - 1), 0.5),
                (CoinFlipState(self.score - 5, self.moves_left - 1), 0.5)
            ]
        return [(self, 1.0)]

def coin_flip_heuristic(state: GameState) -> float:
    if isinstance(state, CoinFlipState):
        return float(state.score)
    return 0.0

class TestExpectimax(unittest.TestCase):
    def test_coin_flip_expected_value(self):
        """Test that Expectimax correctly calculates expected values."""
        solver = MinimaxSolver(coin_flip_heuristic)
        
        # Start with score 0, 1 flip left
        # Expected value: 0.5 * 10 + 0.5 * (-5) = 5 - 2.5 = 2.5
        start_state = CoinFlipState(score=0, moves_left=1)
        score, move = solver.solve(start_state, depth=10, is_maximizing=True)
        
        self.assertEqual(move, "flip")
        self.assertAlmostEqual(score, 2.5, places=5)
    
    def test_coin_flip_multiple_flips(self):
        """Test with multiple flips."""
        solver = MinimaxSolver(coin_flip_heuristic)
        
        # 2 flips: Expected value = 2.5 + 2.5 = 5.0
        start_state = CoinFlipState(score=0, moves_left=2)
        score, move = solver.solve(start_state, depth=10, is_maximizing=True)
        
        self.assertEqual(move, "flip")
        self.assertAlmostEqual(score, 5.0, places=5)

if __name__ == '__main__':
    unittest.main()
