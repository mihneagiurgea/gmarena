import unittest
from dataclasses import dataclass
from typing import List, Optional
from minimax import GameState, minimax

@dataclass(frozen=True)
class NimState:
    """
    A simple Nim game state: a pile of tokens.
    Players can take 1 or 2 tokens.
    Last player to take a token wins (normal play).
    So if it's your turn and tokens=0, you lost (previous player took last).
    Wait, standard definition: last player to move wins.
    So if tokens=0, game is over. The player whose turn it is has no moves.
    If we evaluate from perspective of player about to move:
    - If tokens=0, I lost. Score: -1000.
    - If I can force opponent to lose, I win. Score: +1000.
    """
    tokens: int
    is_max_player_turn: bool

    def is_over(self) -> bool:
        return self.tokens == 0

    def possible_moves(self) -> List[int]:
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
    
    # Simple evaluation:
    # If game over:
    #   If it was max player's turn and tokens=0, max player has no moves -> Max Lost.
    #   But wait, minimax calls heuristic on leaf nodes.
    #   If depth=0 and not over, return 0 (unknown).
    
    if state.is_over():
        # If it is Max's turn and game is over, Max lost.
        if state.is_max_player_turn:
            return -1000
        else:
            return 1000
    
    return 0

class TestMinimax(unittest.TestCase):
    def test_nim_game_win_in_one(self):
        # 1 token left, Max's turn. Max takes 1 -> 0 tokens (Min's turn).
        # Min has no moves -> Min loses -> Max wins.
        start_state = NimState(tokens=1, is_max_player_turn=True)
        score, move = minimax(start_state, nim_heuristic, depth=10, is_maximizing=True)
        self.assertEqual(move, 1)
        self.assertEqual(score, 1000)

    def test_nim_game_win_in_two(self):
        # 2 tokens left, Max's turn. Max takes 2 -> 0 tokens. Max wins.
        start_state = NimState(tokens=2, is_max_player_turn=True)
        score, move = minimax(start_state, nim_heuristic, depth=10, is_maximizing=True)
        self.assertEqual(move, 2)
        self.assertEqual(score, 1000)

    def test_nim_game_force_win(self):
        # 3 tokens. Max takes 1 -> 2 tokens (Min's turn).
        # Min takes 1 -> 1 token (Max's turn) -> Max takes 1 -> Win.
        # Min takes 2 -> 0 tokens (Max's turn) -> Max Lost.
        # Wait, if Min takes 2, 0 tokens left, Max has no moves.
        # So from 2 tokens, Min can win?
        # Let's trace:
        # Start: 3 (Max).
        #   Opt 1: Take 1 -> 2 (Min).
        #       Min takes 1 -> 1 (Max). Max takes 1 -> 0 (Min). Min Lost. Max Wins.
        #       Min takes 2 -> 0 (Max). Max Lost. Min Wins.
        #       Min will choose to take 2. So Max taking 1 leads to Loss.
        #   Opt 2: Take 2 -> 1 (Min).
        #       Min takes 1 -> 0 (Max). Max Lost. Min Wins.
        # So 3 is a losing position for Max if Min plays optimally.
        
        start_state = NimState(tokens=3, is_max_player_turn=True)
        score, move = minimax(start_state, nim_heuristic, depth=10, is_maximizing=True)
        self.assertEqual(score, -1000) # Max should lose

    def test_nim_game_winning_4(self):
        # 4 tokens.
        # Max takes 1 -> 3 (Min). 3 is losing for player to move (Min). So Max wins.
        start_state = NimState(tokens=4, is_max_player_turn=True)
        score, move = minimax(start_state, nim_heuristic, depth=10, is_maximizing=True)
        self.assertEqual(score, 1000)
        self.assertEqual(move, 1)

if __name__ == '__main__':
    unittest.main()
