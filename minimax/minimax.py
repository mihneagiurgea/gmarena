from typing import Protocol, List, TypeVar, Optional, Callable, Tuple, Dict

# Generic type for a move
GameMove = TypeVar('GameMove')

class GameState(Protocol):
    """
    Protocol defining the interface required for the Minimax algorithm.
    """
    def is_over(self) -> bool:
        """Returns True if the game is over, False otherwise."""
        ...

    def get_possible_moves(self) -> List[GameMove]:
        """Returns a list of possible moves for the current player."""
        ...

    def apply(self, move: GameMove) -> 'GameState':
        """
        Returns a new GameState after applying the specified move.
        This should NOT modify the current state in place.
        """
        ...
    
    def __hash__(self) -> int:
        """Returns a hash of the game state for the transposition table."""
        ...

class MinimaxSolver:
    """
    A class to solve games using the Minimax algorithm with Alpha-Beta pruning
    and a Transposition Table.
    """
    def __init__(self, heuristic_evaluate: Callable[[GameState], int]):
        """
        Args:
            heuristic_evaluate: A function that evaluates a state (-1M to +1M).
        """
        self.heuristic_evaluate = heuristic_evaluate
        self.transposition_table: Dict[Tuple[GameState, int, bool], int] = {}

    def solve(
        self,
        state: GameState,
        depth: int,
        is_maximizing: bool = True
    ) -> Tuple[int, Optional[GameMove]]:
        """
        Public entry point to solve the game state.

        Args:
            state: The current game state.
            depth: Maximum depth to search.
            is_maximizing: True if the current turn is for the maximizing player.

        Returns:
            A tuple (best_score, best_move).
        """
        # We can optionally clear the TT here if we want fresh results per solve call,
        # but keeping it allows for learning across moves in the same game.
        # For now, we keep it persistent within the instance.
        return self._minimax(state, depth, -1_000_001, 1_000_001, is_maximizing)

    def _minimax(
        self,
        state: GameState,
        depth: int,
        alpha: int,
        beta: int,
        is_maximizing: bool
    ) -> Tuple[int, Optional[GameMove]]:
        """
        Internal recursive method implementing Minimax with Alpha-Beta pruning.
        """
        tt_key = (state, depth, is_maximizing)
        if tt_key in self.transposition_table:
            return self.transposition_table[tt_key], None

        if depth == 0 or state.is_over():
            score = self.heuristic_evaluate(state)
            self.transposition_table[tt_key] = score
            return score, None

        best_move = None

        if is_maximizing:
            max_eval = -1_000_001
            for move in state.get_possible_moves():
                new_state = state.apply(move)
                eval_score, _ = self._minimax(new_state, depth - 1, alpha, beta, False)
                
                if eval_score > max_eval:
                    max_eval = eval_score
                    best_move = move
                
                alpha = max(alpha, eval_score)
                if beta <= alpha:
                    break # Beta cut-off
            
            self.transposition_table[tt_key] = max_eval
            return max_eval, best_move
        else:
            min_eval = 1_000_001
            for move in state.get_possible_moves():
                new_state = state.apply(move)
                eval_score, _ = self._minimax(new_state, depth - 1, alpha, beta, True)
                
                if eval_score < min_eval:
                    min_eval = eval_score
                    best_move = move
                
                beta = min(beta, eval_score)
                if beta <= alpha:
                    break # Alpha cut-off
            
            self.transposition_table[tt_key] = min_eval
            return min_eval, best_move
