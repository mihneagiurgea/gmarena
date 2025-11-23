from typing import Protocol, List, TypeVar, Optional, Callable, Tuple, Dict

# Generic type for a move
GameMove = TypeVar('GameMove')

class GameState(Protocol):
    """
    Protocol defining the interface required for the Minimax/Expectimax algorithm.
    """
    def is_over(self) -> bool:
        """Returns True if the game is over, False otherwise."""
        ...

    def get_possible_moves(self) -> List[GameMove]:
        """Returns a list of possible moves for the current player."""
        ...

    def apply(self, move: GameMove) -> List[Tuple['GameState', float]]:
        """
        Returns a list of possible resulting GameStates with their probabilities.
        Each tuple is (resulting_state, probability).
        Probabilities should sum to 1.0.
        
        For deterministic games, return [(new_state, 1.0)].
        """
        ...
    
    def __hash__(self) -> int:
        """Returns a hash of the game state for the transposition table."""
        ...

class MinimaxSolver:
    """
    A solver for games using Minimax/Expectimax algorithm with Alpha-Beta pruning
    and a Transposition Table. Handles both deterministic and non-deterministic games.
    """
    def __init__(self, heuristic_evaluate: Callable[[GameState], float]):
        """
        Args:
            heuristic_evaluate: A function that evaluates a state (-1M to +1M).
        """
        self.heuristic_evaluate = heuristic_evaluate
        self.transposition_table: Dict[Tuple[GameState, int, bool], float] = {}

    def solve(
        self,
        state: GameState,
        depth: int,
        is_maximizing: bool = True
    ) -> Tuple[float, Optional[GameMove]]:
        """
        Public entry point to solve the game state.

        Args:
            state: The current game state.
            depth: Maximum depth to search.
            is_maximizing: True if the current turn is for the maximizing player.

        Returns:
            A tuple (best_score, best_move).
        """
        return self._expectimax(state, depth, -1_000_001, 1_000_001, is_maximizing)

    def _expectimax(
        self,
        state: GameState,
        depth: int,
        alpha: float,
        beta: float,
        is_maximizing: bool
    ) -> Tuple[float, Optional[GameMove]]:
        """
        Internal recursive method implementing Expectimax with Alpha-Beta pruning.
        Handles probabilistic outcomes from apply().
        """
        tt_key = (state, depth, is_maximizing)
        if tt_key in self.transposition_table:
            return self.transposition_table[tt_key], None

        if depth == 0 or state.is_over():
            score = float(self.heuristic_evaluate(state))
            self.transposition_table[tt_key] = score
            return score, None

        best_move: Optional[GameMove] = None

        if is_maximizing:
            max_eval = -1_000_001.0
            for move in state.get_possible_moves():
                # Get all possible outcomes with probabilities
                outcomes = state.apply(move)
                
                # Calculate expected value over all outcomes
                expected_value = 0.0
                for new_state, probability in outcomes:
                    eval_score, _ = self._expectimax(new_state, depth - 1, alpha, beta, False)
                    expected_value += probability * eval_score
                
                if expected_value > max_eval:
                    max_eval = expected_value
                    best_move = move
                
                alpha = max(alpha, expected_value)
                if beta <= alpha:
                    break  # Beta cut-off
            
            self.transposition_table[tt_key] = max_eval
            return max_eval, best_move
        else:
            min_eval = 1_000_001.0
            for move in state.get_possible_moves():
                # Get all possible outcomes with probabilities
                outcomes = state.apply(move)
                
                # Calculate expected value over all outcomes
                expected_value = 0.0
                for new_state, probability in outcomes:
                    eval_score, _ = self._expectimax(new_state, depth - 1, alpha, beta, True)
                    expected_value += probability * eval_score
                
                if expected_value < min_eval:
                    min_eval = expected_value
                    best_move = move
                
                beta = min(beta, expected_value)
                if beta <= alpha:
                    break  # Alpha cut-off
            
            self.transposition_table[tt_key] = min_eval
            return min_eval, best_move
