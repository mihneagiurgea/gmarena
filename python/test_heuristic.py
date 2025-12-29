import unittest
from game_engine import GameInstance, GameConfig, GameState, UnitType, Spell, heuristic_evaluate
from hex import Pt, HexGrid

class TestHeuristic(unittest.TestCase):
    def setUp(self):
        # Load real config but overwrite for predictable testing
        self.config = GameConfig()
        
        # Define test units
        self.config.unit_types = {
            "Warrior": UnitType("Warrior", health=100, ac=10, wc=0, attack_damage=10, speed=3, spells=[]),
            "Mage": UnitType("Mage", health=50, ac=8, wc=0, attack_damage=5, speed=3, spells=["Fireball"])
        }
        
        # Define test spells
        self.config.spells = {
            "Fireball": Spell("Fireball", damage=20, range=5)
        }
        
        self.instance = GameInstance(self.config)
        
    def test_heuristic_basic(self):
        # P1: Warrior (100 HP, 10 Dmg) -> Score = 100 * 10 = 1000
        # P2: Mage (50 HP, Max(5, 20) Dmg) -> Score = 50 * 20 = 1000
        # Result should be 1000 - 1000 = 0
        
        self.instance.units = {1: self.config.unit_types["Warrior"], 2: self.config.unit_types["Mage"]}
        self.instance.turn_order = [1, 2]
        
        grid = HexGrid(self.config.grid_width, self.config.grid_height)
        grid[Pt(0, 0)] = 1
        grid[Pt(7, 7)] = 2
        
        state = GameState(self.instance, grid)
        
        score = heuristic_evaluate(state)
        self.assertEqual(score, 0)
        
    def test_heuristic_p1_advantage(self):
        # P1: Warrior (100 HP) -> 1000
        # P2: Mage (10 HP) -> 10 * 20 = 200
        # Result: 1000 - 200 = 800
        
        self.instance.units = {1: self.config.unit_types["Warrior"], 2: self.config.unit_types["Mage"]}
        self.instance.turn_order = [1, 2]
        
        grid = HexGrid(self.config.grid_width, self.config.grid_height)
        grid[Pt(0, 0)] = 1
        grid[Pt(7, 7)] = 2
        
        state = GameState(self.instance, grid)
        # Manually set health in state
        state.units[2].current_health = 10
        
        score = heuristic_evaluate(state)
        self.assertEqual(score, 800)

    def test_heuristic_p2_advantage(self):
        # P1: Warrior (10 HP) -> 10 * 10 = 100
        # P2: Mage (50 HP) -> 50 * 20 = 1000
        # Result: 100 - 1000 = -900
        
        self.instance.units = {1: self.config.unit_types["Warrior"], 2: self.config.unit_types["Mage"]}
        self.instance.turn_order = [1, 2]
        
        grid = HexGrid(self.config.grid_width, self.config.grid_height)
        grid[Pt(0, 0)] = 1
        grid[Pt(7, 7)] = 2
        
        state = GameState(self.instance, grid)
        state.units[1].current_health = 10
        
        score = heuristic_evaluate(state)
        self.assertEqual(score, -900)

    def test_solver_integration(self):
        from minimax.minimax import MinimaxSolver
        from unittest.mock import patch
        
        self.instance.units = {1: self.config.unit_types["Warrior"], 2: self.config.unit_types["Mage"]}
        self.instance.turn_order = [1, 2]
        
        grid = HexGrid(self.config.grid_width, self.config.grid_height)
        grid[Pt(0, 0)] = 1
        grid[Pt(0, 1)] = 2 # Adjacent, so they can attack
        
        state = GameState(self.instance, grid)
        
        solver = MinimaxSolver(heuristic_evaluate)
        
        # Run solver for depth 1
        # P1 (Warrior) turn. Can attack P2 (Mage).
        # Warrior Dmg 10. Mage HP 50 -> 40.
        # New Score: 100*10 - 40*20 = 1000 - 800 = 200.
        # Initial Score: 100*10 - 50*20 = 1000 - 1000 = 0.
        # Maximizing -> Should choose Attack (Score 200 > 0).
        
        # Force random.randint to return 20 to ensure hits
        with patch('random.randint', return_value=20):
            score, move = solver.solve(state, depth=1, is_maximizing=True)
        
        self.assertIsNotNone(move)
        # We expect positive score for P1
        self.assertGreater(score, 0)

if __name__ == '__main__':
    unittest.main()
