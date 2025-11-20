---
description: Implement MinMax Algorithm, V1
---

Implement, in a separate Python file, the Minimax Algorithm with Alpha-Beta Pruning. 

The algorithm should take as input the following:
 - an instance of a GameState class; this class has these 3 methods: 
    - is_over() -> bool, returns whetehr the game is over or not
    - possible_moves() -> list[GameMove], returns the list of possible moves for the current player
    - apply(move: GameMove) -> GameState, returns a new GameState after applying specified move
 - a function heuristic_evaluate(state: GameState) -> int, returns an evaluation of a game state, 
   as a number between -1,000,000 and +1,000,000
 - depth: int, maximum depth of the algorithm
   