# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GM Arena is a turn-based tactical combat game with two implementations:
- **Web UI (var1/)**: Browser-based game with a 3x5 grid, vanilla JavaScript
- **Python engine (python/)**: Hex-grid based game engine with minimax AI

## Web UI Architecture (var1/)

The web game uses a clear separation between game logic and UI:

- **units.js**: Unit definitions (SVG sprites, stats like HP/AC/WC, spells)
- **engine.js**: Pure game logic with no DOM dependencies
  - Game state management
  - Combat system (d20 rolls, melee/ranged attacks, spells)
  - Helper functions for position/adjacency calculations
  - Taunt mechanic (forces melee attackers to target taunters)
- **ui.js**: All DOM manipulation and event handling
  - Rendering (grid, units, HP bars, turn order)
  - Mouse/keyboard input handling
  - Opponent AI (simple: melee adjacent → ranged → move toward player)
  - Debug UI panel

**Load order**: `units.js` → `engine.js` → `ui.js`

**Key game mechanics**:
- D20 combat: WC + d20 vs AC for hits, d20 vs SR for spells
- Critical hits on natural 20 (1.5x damage), critical miss on 1
- Taunt: Adjacent enemies must attack units with taunt property

## Python Engine Architecture (python/)

- **game_engine.py**: Core game logic with hex grid, uses dataclasses
- **hex.py**: Hex coordinate system and grid implementation
- **minimax/**: AI implementation using minimax algorithm
- **runner.py**: Game simulation runner

### Running Tests (Python)

```bash
cd python
python -m pytest test_game_engine.py
python -m pytest test_hex.py
python -m pytest test_heuristic.py
python -m pytest test_roll.py
```

## Local Development (Web)

Open `index.html` in browser or serve from root. The landing page links to variant folders.

Debug mode: Check "Control both teams" in the Debug panel to manually control opponent units.
