from game_engine import GameEngine, MoveType, GameMove
from minimax_agent import MinimaxAgent
import random

def run_game():
    game = GameEngine()
    game.initialize_game()
    
    # Player 1: Minimax Agent
    agent_p1 = MinimaxAgent(player_id=1, depth=2)
    
    # Player 2: Random Mover
    # We'll implement random logic in the loop
    
    max_turns = 50
    turn_count = 0
    
    while turn_count < max_turns:
        current_unit = game.get_current_unit()
        if not current_unit:
            break
            
        print(f"\n--- Turn {turn_count}: {current_unit.name} (P{current_unit.player_id}, ID: {current_unit.uid}) ---")
        
        if current_unit.player_id == 1:
            # Minimax Agent
            print("AI Thinking...")
            move = agent_p1.get_best_move(game.state)
            if move:
                print(f"AI chose: {move}")
                try:
                    game.execute_move(move)
                except ValueError as e:
                    print(f"AI Invalid Move: {e}")
            else:
                print("AI has no moves.")
        else:
            # Random Player
            moves = game.state.get_possible_moves(2)
            if moves:
                move = random.choice(moves)
                print(f"Random chose: {move}")
                try:
                    game.execute_move(move)
                except ValueError as e:
                    print(f"Random Invalid Move: {e}")
            else:
                print("Random has no moves.")
                
        if game.check_game_over():
            break
            
        game.next_turn()
        turn_count += 1

if __name__ == "__main__":
    run_game()
