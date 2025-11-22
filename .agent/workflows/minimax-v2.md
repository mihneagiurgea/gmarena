---
description: Implement the Minimax heuristic
---

Read the minimax.py and game_engine.py files.

- Implement the MinimaxSolver heuristic_evaluate function, described below.
- Make sure that the game_engine.py:GameState implements the `class GameState(Protocol)`
- Write some test for this MinimaxSolver with the new heuristic.

## Heuristic Evaluation
 - The score of a GameState is always a number between -1_000_000 and +1_000_000, equal to the score of the current player's - the score of the other player.
 - The score of the current player will be the sum of each unit.
 - The score of a unit is the unit's current health multiplied by its "threat score".
 - A unit's "threat score" is the maximum of its attack damage and the damage of its highest spell. 