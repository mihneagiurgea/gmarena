# Task

Write Python code that can simulate the following game rules. The code should be self-contained and should not require any external dependencies.

Do not focus on any user interface.

# GM Arena

## Game Rules

GM is a 2-player turn-based game where each player has a set of units positioned on a 2D grid. Each turn, one unit takes its turn and can either move, attack or use a special ability. The game ends when one player has no more units left.

### Grid 
The grid is a 2D array of cells of size 17 x 24, each cell can contain zero or one unit. 

Initially all units start on opposing sides of the grid, with the player 1 units on the top and player 2 units on the bottom.

The distance between two cells is an integer value representing the shortest path between them, using horizontal and vertical movement as cost 1 and diagonal movement as cost 1.5. To account for the cost of movement being an integer,
the first diagonal movement counts as 1 cell, the next one as 2 cells and so on.

Two cells are considered adjacent if their distance is 1.

### Unit

A Unit has the following integer attributes:
- Health
- Armor Class (AC)
- Weapon Class (WC)
- Attack Damage
- Speed 
- Zero or more Spells

### Actions

A unit can perform one of the following actions during its turn:
- Move: move up to 2 x Speed cells
- Attack: attack an enemy unit in an adjacent cell; see rules below for resolving an Attack
- Charge: move up to Speed cells, using same rules as "Move" action; then 
make an Attack action but with a -4 WC penalty
- Cast a Spell: each Spell has different rules for casting it

### Attacking
The attack is resolved as follows:
- Roll d20: generate a random number between 1 and 20
- If d20 + WC >= AC, then the attack hits and deals damage equal to Attack Damage
to the target unit
- Otherwise, the attack misses and deals no damage

### Casting a Spell
A Spell has the following integer attributes:
- Damage
- Range

A spell can be cast against another unit any any distance.

The spell is resolved as follows:
- Compute the distance between the caster and the target unit
- Difficulty = if distance <= Range then distance, else distance + (distance - Range) * 4
- Roll d20: generate a random number between 1 and 20
- If d20 >= Difficulty, then the spell succeeds and deals Damage to the target unit.
- Otherwise, the spell fails and has no effect.

## GM Units & Spells

The available units and spells are defined in the `fixtures.json` file.


