from typing import Protocol, List, TypeVar, Optional, Callable, Tuple

# Generic type for a move
GameMove = TypeVar('GameMove')

class GameState(Protocol):
    """
    Protocol defining the interface required for the Minimax algorithm.
    """
    def is_over(self) -> bool:
        """Returns True if the game is over, False otherwise."""
        ...

    def possible_moves(self) -> List[GameMove]:
        """Returns a list of possible moves for the current player."""
        ...

    def apply(self, move: GameMove) -> 'GameState':
        """
        Returns a new GameState after applying the specified move.
        This should NOT modify the current state in place.
        """
        ...

def minimax(
    state: GameState,
    heuristic_evaluate: Callable[[GameState], int],
    depth: int,
    alpha: int = -1_000_001,
    beta: int = 1_000_001,
    is_maximizing: bool = True
) -> Tuple[int, Optional[GameMove]]:
    """
    Implements the Minimax algorithm with Alpha-Beta pruning.

    Args:
        state: The current game state.
        heuristic_evaluate: A function that evaluates a state (-1M to +1M).
        depth: Maximum depth to search.
        alpha: The best value that the maximizer currently can guarantee at this level or above.
        beta: The best value that the minimizer currently can guarantee at this level or above.
        is_maximizing: True if the current turn is for the maximizing player.

    Returns:
        A tuple (best_score, best_move).
    """
    if depth == 0 or state.is_over():
        return heuristic_evaluate(state), None

    best_move = None

    if is_maximizing:
        max_eval = -1_000_001
        for move in state.possible_moves():
            new_state = state.apply(move)
            eval_score, _ = minimax(new_state, heuristic_evaluate, depth - 1, alpha, beta, False)
            
            if eval_score > max_eval:
                max_eval = eval_score
                best_move = move
            
            alpha = max(alpha, eval_score)
            if beta <= alpha:
                break # Beta cut-off
        return max_eval, best_move
    else:
        min_eval = 1_000_001
        for move in state.possible_moves():
            new_state = state.apply(move)
            eval_score, _ = minimax(new_state, heuristic_evaluate, depth - 1, alpha, beta, True)
            
            if eval_score < min_eval:
                min_eval = eval_score
                best_move = move
            
            beta = min(beta, eval_score)
            if beta <= alpha:
                break # Alpha cut-off
        return min_eval, best_move
