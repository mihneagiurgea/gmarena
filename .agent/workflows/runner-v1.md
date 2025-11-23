---
description: Game Runner
---

In a new file `runner.py`, implement code that simulates an end-to-end game. 

## Runner
The Runner class is parametrized with the following:
 - set of units for each player
 - a heuristic function to use, defaults to game_engine.heuristic_evaluate
 - an int depth to use for the MinimaxSolver, defaults to 3

It then initializes the GameConfig and starts a new game with the 
set of units for each player.

## Simulation
Each turn, use the already implemented MinimaxSolver with the relevant params.
After each action, print out the action along with the new GameState.

## GameState Print
Add a `.print()` method to GameState. It will sort the units by their 
row, column coordinates and print out each of them in order, one per line.

Add a `__repr__()` method to UnitState that will be used in GameState.print.
It will return a string containing the type of the unit, the player_id, the unit_id,
and its current health / total health.