# Minimax Algorithm Implementation Plan

## Objective
Implement a Minimax algorithm with Alpha-Beta pruning to allow an AI agent to play the Hex Game against a human or another AI.

## 1. Prerequisites & Refactoring
- [x] Refactor `GameState` to be copyable/clonable.
    - *Note*: We need to ensure we can simulate moves without affecting the actual game state.
    - **Action**: Add a `clone()` method to `GameState`.
- [x] Implement Move Generation.
    - **Action**: Add `get_possible_moves(player_id)` to `GameState`.
    - This should return a list of `GameMove` objects for all units of the given player.
    - *Optimization*: Prune obviously bad moves (e.g., moving back and forth) if branching factor is too high.

## 2. Heuristic Evaluation
- [x] Create an evaluation function `evaluate(state: GameState, player_id: int) -> float`.
Factors to consider:
- **Material**: Sum of HP of own units vs enemy units.
- **Unit Count**: Number of alive units.
- **Positioning**:
    - Distance to enemies (aggressive vs defensive).
    - Control of key areas (if any).
- **Threats**: Can an enemy kill a unit next turn?

## 3. Minimax Implementation
- [x] Create a `MinimaxAgent` class.
- **Method**: `get_best_move(state: GameState, depth: int) -> GameMove`
- **Algorithm**:
    - Recursive Minimax with Alpha-Beta Pruning.
    - **Max Depth**: Configurable (start with 3).
    - **Transposition Table** (Optional, for V2): Cache states to avoid re-evaluating.

## 4. Integration
- [x] Create a script `run_ai_game.py` to pit AI vs AI or AI vs Random.
- Update `GameEngine` to support an external agent driving the turns.

## 5. Verification
- [x] Test AI against a "Random Mover" bot. AI should win consistently.
- Test AI against a "Greedy Attacker" bot.
