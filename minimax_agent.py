import math
import random
from typing import Optional
from game_engine import GameState, GameMove, MoveType, UnitState

class MinimaxAgent:
    def __init__(self, player_id: int, depth: int = 3):
        self.player_id = player_id
        self.depth = depth

    def get_best_move(self, state: GameState) -> Optional[GameMove]:
        best_move = None
        best_value = -math.inf
        alpha = -math.inf
        beta = math.inf
        
        # Generate possible moves for the current unit (which must be ours)
        moves = state.get_possible_moves(self.player_id)
        
        # Optimization: Sort moves?
        # For now, shuffle to add variety if scores are equal
        random.shuffle(moves)
        
        for move in moves:
            new_state = state.clone()
            try:
                new_state.execute_move(move)
                new_state.next_turn()
                
                value = self.minimax(new_state, self.depth - 1, alpha, beta)
                
                if value > best_value:
                    best_value = value
                    best_move = move
                
                alpha = max(alpha, value)
                if beta <= alpha:
                    break
            except ValueError:
                continue
                
        return best_move

    def minimax(self, state: GameState, depth: int, alpha: float, beta: float) -> float:
        if depth == 0 or state.check_game_over():
            return self.evaluate(state)
            
        current_unit = state.get_current_unit()
        if not current_unit:
            # Should not happen unless game over, but handle gracefully
            return self.evaluate(state)
            
        is_maximizing = (current_unit.player_id == self.player_id)
        
        moves = state.get_possible_moves(current_unit.player_id)
        if not moves:
            # No moves possible (e.g. blocked), pass turn
            new_state = state.clone()
            new_state.next_turn()
            return self.minimax(new_state, depth, alpha, beta)
            
        if is_maximizing:
            max_eval = -math.inf
            for move in moves:
                new_state = state.clone()
                try:
                    new_state.execute_move(move)
                    new_state.next_turn()
                    eval_val = self.minimax(new_state, depth - 1, alpha, beta)
                    max_eval = max(max_eval, eval_val)
                    alpha = max(alpha, eval_val)
                    if beta <= alpha:
                        break
                except ValueError:
                    continue
            return max_eval
        else:
            min_eval = math.inf
            for move in moves:
                new_state = state.clone()
                try:
                    new_state.execute_move(move)
                    new_state.next_turn()
                    eval_val = self.minimax(new_state, depth - 1, alpha, beta)
                    min_eval = min(min_eval, eval_val)
                    beta = min(beta, eval_val)
                    if beta <= alpha:
                        break
                except ValueError:
                    continue
            return min_eval

    def evaluate(self, state: GameState) -> float:
        # Simple heuristic: Sum of HP of my units - Sum of HP of enemy units
        my_hp = sum(u.current_health for u in state.units.values() if u.player_id == self.player_id and u.is_alive)
        enemy_hp = sum(u.current_health for u in state.units.values() if u.player_id != self.player_id and u.is_alive)
        
        # Add small bonus for number of alive units
        my_count = sum(1 for u in state.units.values() if u.player_id == self.player_id and u.is_alive)
        enemy_count = sum(1 for u in state.units.values() if u.player_id != self.player_id and u.is_alive)
        
        score = (my_hp - enemy_hp) + (my_count - enemy_count) * 10
        return score
