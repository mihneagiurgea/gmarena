import game_engine
from minimax.minimax import MinimaxSolver
from typing import List, Optional

class Runner:
    def __init__(self, p1_units: List[str], p2_units: List[str], heuristic_func=None, depth: int = 3):
        self.p1_units = p1_units
        self.p2_units = p2_units
        self.heuristic_func = heuristic_func if heuristic_func else game_engine.heuristic_evaluate
        self.depth = depth
        
        self.config = game_engine.GameConfig()
        self.instance = game_engine.GameInstance(self.config)
        self.game = self.instance.start_game(p1_units, p2_units)
        self.solver = MinimaxSolver(self.heuristic_func)

    def simulate(self):
        turn = 1
        while not self.game.is_over():
            current_unit = self.game.get_current_unit()
            
            print(f"\n--- Turn {turn}: {current_unit.name} (P{current_unit.player_id} ID:{current_unit.uid}) ---")
            
            # Determine maximizing player. 
            # Heuristic returns (P1 score - P2 score).
            # So P1 maximizes, P2 minimizes.
            is_maximizing = (current_unit.player_id == 1)
            
            score, move = self.solver.solve(self.game, self.depth, is_maximizing)
            
            assert move is not None, "No valid moves found."

            print(f"Action: {move}")
            self.game.execute_move(move)
            self.game.print()
            
            if self.game.check_game_over():
                break
            
            turn += 1

if __name__ == "__main__":
    # Example usage
    runner = Runner(
        p1_units=["Warrior", "Mage"],
        p2_units=["Warrior", "Mage"],
        depth=3
    )
    runner.simulate()
