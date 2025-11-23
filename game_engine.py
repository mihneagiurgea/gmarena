import json
import math
import random
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict
from enum import Enum, auto

# --- Data Classes ---

from hex import Pt, SquareGrid

@dataclass
class Spell:
    name: str
    damage: int
    range: int

@dataclass
class UnitType:
    name: str
    health: int
    ac: int
    wc: int
    attack_damage: int
    speed: int
    spells: List[str]

@dataclass
class UnitInstance:
    uid: int
    unit_type: UnitType
    
    @property
    def player_id(self):
        return 1 if self.uid % 2 != 0 else 2
    
    @property
    def name(self):
        return self.unit_type.name

@dataclass
class UnitState:
    unit_instance: UnitInstance
    position: Pt
    current_health: int

    def __repr__(self):
        return f"{self.unit_type.name} (P{self.player_id} ID:{self.uid}): {self.current_health}/{self.unit_type.health}"
    
    @property
    def is_alive(self):
        return self.current_health > 0

    @property
    def uid(self):
        return self.unit_instance.uid
        
    @property
    def player_id(self):
        return self.unit_instance.player_id
        
    @property
    def unit_type(self):
        return self.unit_instance.unit_type
        
    @property
    def name(self):
        return self.unit_instance.name

class MoveType(Enum):
    MOVE = auto()
    ATTACK = auto()
    CHARGE = auto()
    CAST_SPELL = auto()

@dataclass
class GameMove:
    move_type: MoveType
    target_pos: Pt
    spell_name: Optional[str] = None

# --- Game Configuration ---

class GameConfig:
    def __init__(self, config_path: str = "config.json"):
        with open(config_path, 'r') as f:
            data = json.load(f)

        self.grid_width = data['grid']['width']
        self.grid_height = data['grid']['height']
        
        self.spells: Dict[str, Spell] = {}
        for s in data['spells']:
            self.spells[s['name']] = Spell(s['name'], s['damage'], s['range'])
            
        self.unit_types: Dict[str, UnitType] = {}
        for u in data['units']:
            self.unit_types[u['name']] = UnitType(
                u['name'], u['health'], u['AC'], u['WC'], 
                u['attack_damage'], u['speed'], u['spells']
            )

# --- Game Instance ---

class GameInstance:
    def __init__(self, config: GameConfig):
        self.config = config
        self.turn_order: List[int] = []
        self.units: Dict[int, UnitInstance] = {} # unit_uid -> UnitInstance

    def start_game(self, p1_units: List[str], p2_units: List[str]) -> 'GameState':
        grid: Dict[Pt, int] = {} # Position -> unit_uid

        # Player 1 (Top)
        gap = 2
        total_width = len(p1_units) + (len(p1_units) - 1) * gap
        start_x = (self.config.grid_width - total_width) // 2
        
        uid = 1
        for i, type_name in enumerate(p1_units):
            x = start_x + i * (1 + gap)
            pos = Pt(x, 0)

            self.units[uid] = UnitInstance(
                uid=uid,
                unit_type=self.config.unit_types[type_name]
            )
            grid[pos] = uid

            uid += 2

        # Player 2 (Bottom)
        total_width_p2 = len(p2_units) + (len(p2_units) - 1) * gap
        start_x_p2 = (self.config.grid_width - total_width_p2) // 2
        y_p2 = self.config.grid_height - 1
        
        uid = 2
        for i, type_name in enumerate(p2_units):
            x = start_x_p2 + i * (1 + gap)
            pos = Pt(x, y_p2)
            
            self.units[uid] = UnitInstance(
                uid=uid,
                unit_type=self.config.unit_types[type_name]
            )
            grid[pos] = uid

            uid += 2

        self.turn_order = list(self.units.keys())
        random.shuffle(self.turn_order)
        print(f"Game Initialized. Turn Order: {self.turn_order}")
        return GameState(self, grid)

class GameState:
    def __init__(self, instance: GameInstance, grid: Dict[Pt, int]):
        self.instance = instance
        self.grid: Dict[Pt, int] = grid # Position -> unit_uid
        self.units: Dict[int, UnitState] = {}
        self.square_grid = SquareGrid(instance.config.grid_width, instance.config.grid_height)
        
        for pos, uid in self.grid.items():
            u_inst = instance.units[uid]
            self.units[uid] = UnitState(u_inst, pos, u_inst.unit_type.health)
            
        self.current_turn_index = 0

    def print(self):
        sorted_units = sorted(self.units.values(), key=lambda u: (u.position.y, u.position.x))
        for unit in sorted_units:
            print(unit)

    def get_current_unit(self) -> UnitState:
        uid = self.instance.turn_order[self.current_turn_index]
        return self.units[uid]

    def clone(self) -> 'GameState':
        new_state = GameState(self.instance, self.grid.copy())
        new_state.units = {uid: UnitState(u.unit_instance, u.position, u.current_health) for uid, u in self.units.items()}
        new_state.current_turn_index = self.current_turn_index
        return new_state

    def get_possible_moves(self) -> List[GameMove]:
        moves = []
        
        # The current turn system enforces turn order. 
        # So we should only generate moves for the current unit if we are strictly following turn order.
        current_unit = self.get_current_unit()
            
        # Generate moves for current_unit
        u = current_unit
        player_id = u.player_id
        
        # 1. Move
        # Optimization: Don't iterate every single pixel, but BFS/flood fill for reachable tiles?
        # For small grid, iteration is fine.
        for x in range(self.instance.config.grid_width):
            for y in range(self.instance.config.grid_height):
                pos = Pt(x, y)
                if self.is_valid_move(u, pos, u.unit_type.speed * 2):
                    moves.append(GameMove(MoveType.MOVE, target_pos=pos))
                    
        # 2. Attack
        # Find all enemies in range
        enemies = [e for e in self.units.values() if e.player_id != player_id and e.is_alive]
        for e in enemies:
            dist = self.square_grid.distance(u.position, e.position)
            if dist <= 1:
                moves.append(GameMove(MoveType.ATTACK, target_pos=e.position))
                
        # 3. Charge
        # Move + Attack. Target must be reachable with speed (not 2x) and then adjacent.
        # We can iterate enemies and check if we can charge them.
        for e in enemies:
            charge_pos = self._find_charge_pos(u, e)
            if charge_pos:
                moves.append(GameMove(MoveType.CHARGE, target_pos=e.position))
                
        # 4. Spells
        for spell_name in u.unit_type.spells:
            spell = self.instance.config.spells[spell_name]
            # Spells usually have range.
            for e in enemies:
                dist = self.square_grid.distance(u.position, e.position)
                # Check if in range? The cast_spell logic calculates difficulty based on range, 
                # but doesn't strictly forbid out of range (just harder).
                # But maybe we should limit to reasonable range?
                # For now, let's allow all enemies as targets.
                moves.append(GameMove(MoveType.CAST_SPELL, target_pos=e.position, spell_name=spell_name))
                
        return moves

    def next_turn(self):
        # Skip dead units
        original_index = self.current_turn_index
        while True:
            self.current_turn_index = (self.current_turn_index + 1) % len(self.instance.turn_order)
            uid = self.instance.turn_order[self.current_turn_index]
            if self.units[uid].is_alive:
                break
            if self.current_turn_index == original_index:
                # All units dead? Should be handled by game over check
                break

    def is_valid_move(self, unit: UnitState, target_pos: Pt, max_dist: int) -> bool:
        if not (0 <= target_pos.x < self.instance.config.grid_width and 0 <= target_pos.y < self.instance.config.grid_height):
            return False
        if target_pos in self.grid and self.grid[target_pos] != unit.uid:
            return False # Occupied
        
        dist = self.square_grid.distance(unit.position, target_pos)
        return dist <= max_dist

    def execute_move(self, move: GameMove):
        attacker = self.get_current_unit()
        if not attacker:
            raise ValueError("No active unit for turn.")

        if move.move_type == MoveType.MOVE:
            self._move(attacker, move.target_pos)
            return
        
        # For other moves, target_pos must contain a unit
        if move.target_pos not in self.grid:
            raise ValueError(f"No unit at target position {move.target_pos}")
        target_uid = self.grid[move.target_pos]
        target = self.units[target_uid]

        if move.move_type == MoveType.ATTACK:
            self._attack(attacker, target)
        elif move.move_type == MoveType.CHARGE:
            # Find best charge position
            best_pos = self._find_charge_pos(attacker, target)
            if not best_pos:
                raise ValueError("No valid charge position found.")
            self._charge(attacker, best_pos, target)
        elif move.move_type == MoveType.CAST_SPELL:
            if not move.spell_name:
                raise ValueError("Spell name required for CAST_SPELL move.")
            self._cast_spell(attacker, move.spell_name, target)

        else:
            raise ValueError("Unhandled move_type: " + move)

    def _find_charge_pos(self, attacker: UnitState, target: UnitState) -> Optional[Pt]:
        # Find valid move position adjacent to target
        candidates = []
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                if dx == 0 and dy == 0: continue
                pos = Pt(target.position.x + dx, target.position.y + dy)
                if self.is_valid_move(attacker, pos, attacker.unit_type.speed):
                    candidates.append(pos)
        
        if not candidates:
            return None
        
        # Pick closest to attacker
        return min(candidates, key=lambda p: self.square_grid.distance(attacker.position, p))

    def _move(self, unit: UnitState, target_pos: Pt):
        if not self.is_valid_move(unit, target_pos, unit.unit_type.speed * 2):
            raise ValueError(f"Invalid move for {unit.name} to {target_pos}")
        
        del self.grid[unit.position]
        unit.position = target_pos
        self.grid[target_pos] = unit.uid

    def _attack(self, attacker: UnitState, target: UnitState, penalty_wc: int = 0):
        dist = self.square_grid.distance(attacker.position, target.position)
        if dist > 1:
            raise ValueError(f"Target out of range for attack (dist: {dist})")
        
        roll = random.randint(1, 20)
        hit_chance = roll + attacker.unit_type.wc - penalty_wc
        
        if hit_chance >= target.unit_type.ac:
            dmg = attacker.unit_type.attack_damage
            target.current_health -= dmg
            if not target.is_alive:
                del self.grid[target.position]

    def _charge(self, attacker: UnitState, move_target_pos: Pt, attack_target: UnitState):
        # Charge: Move up to Speed (not 2x Speed) then Attack with -4 WC
        if not self.is_valid_move(attacker, move_target_pos, attacker.unit_type.speed):
             raise ValueError(f"Invalid charge move for {attacker.name} to {move_target_pos}")
        
        # Execute move
        del self.grid[attacker.position]
        attacker.position = move_target_pos
        self.grid[move_target_pos] = attacker.uid
        
        # Execute attack
        self._attack(attacker, attack_target, penalty_wc=4)

    def _cast_spell(self, attacker: UnitState, spell_name: str, target: UnitState):
        if spell_name not in attacker.unit_type.spells:
            raise ValueError(f"{attacker.name} does not know spell {spell_name}")
        
        spell = self.instance.config.spells[spell_name]
        dist = self.square_grid.distance(attacker.position, target.position)
        
        difficulty = dist if dist <= spell.range else dist + (dist - spell.range) * 4
        roll = random.randint(1, 20)
        
        if roll >= difficulty:
            target.current_health -= spell.damage
            if not target.is_alive:
                del self.grid[target.position]

    def check_game_over(self) -> bool:
        p1_alive = any(u.is_alive for u in self.units.values() if u.player_id == 1)
        p2_alive = any(u.is_alive for u in self.units.values() if u.player_id == 2)
        
        if not p1_alive:
            return True
        if not p2_alive:
            return True
        return False

    # --- Minimax Protocol Implementation ---

    def is_over(self) -> bool:
        return self.check_game_over()

    def apply(self, move: GameMove) -> List[Tuple['GameState', float]]:
        new_state = self.clone()
        new_state.execute_move(move)
        new_state.next_turn()
        # Deterministic game: return single outcome with probability 1.0
        return [(new_state, 1.0)]

    def __hash__(self) -> int:
        # Hash based on unit states and turn index
        unit_data = []
        for uid in sorted(self.units.keys()):
            u = self.units[uid]
            unit_data.append((uid, u.position.x, u.position.y, u.current_health))
        return hash((self.current_turn_index, tuple(unit_data)))

def heuristic_evaluate(state: GameState) -> float:
    """
    Evaluates the game state for the Minimax algorithm.
    Returns: Score of Player 1 - Score of Player 2.
    Score = Sum(Unit Health * Threat Score)
    Threat Score = Max(Attack Damage, Max Spell Damage)
    """
    p1_score = 0
    p2_score = 0
    
    for u in state.units.values():
        if not u.is_alive:
            continue
            
        # Calculate threat score
        max_spell_dmg = 0
        if u.unit_type.spells:
            for s_name in u.unit_type.spells:
                if s_name in state.instance.config.spells:
                    s = state.instance.config.spells[s_name]
                    max_spell_dmg = max(max_spell_dmg, s.damage)
        
        threat = max(u.unit_type.attack_damage, max_spell_dmg)
        unit_score = u.current_health * threat
        
        if u.player_id == 1:
            p1_score += unit_score
        else:
            p2_score += unit_score
            
    return float(p1_score - p2_score)

# --- Verification Block ---
if __name__ == "__main__":
    config = GameConfig()
    instance = GameInstance(config)
    
    # Initialize one of each unit type for both players
    unit_types = list(config.unit_types.keys())
    p1_units = unit_types
    p2_units = unit_types
    
    game = instance.start_game(p1_units, p2_units)
    
    # Simulate a few turns
    for _ in range(5):
        current_unit = game.get_current_unit()
        if not current_unit or not current_unit.is_alive:
            game.next_turn()
            continue
            
        # Simple AI: Find nearest enemy
        enemies = [u for u in game.units.values() if u.player_id != current_unit.player_id and u.is_alive]
        if not enemies:
            break
            
        target = min(enemies, key=lambda u: game.square_grid.distance(current_unit.position, u.position))
        dist = game.square_grid.distance(current_unit.position, target.position)
        
        print(f"\n--- Turn: {current_unit.name} (P{current_unit.player_id}) ---")
        
        # Try to cast spell if available and in range
        try:
            if current_unit.unit_type.spells:
                spell_name = current_unit.unit_type.spells[0]
                move = GameMove(MoveType.CAST_SPELL, target_pos=target.position, spell_name=spell_name)
                game.execute_move(move)
            # Else if adjacent, attack
            elif dist == 1:
                move = GameMove(MoveType.ATTACK, target_pos=target.position)
                game.execute_move(move)
            # Else move towards target
            else:
                # Simple move logic: move 1 step closer in x or y
                dx = target.position.x - current_unit.position.x
                dy = target.position.y - current_unit.position.y
                
                step_x = 1 if dx > 0 else -1 if dx < 0 else 0
                step_y = 1 if dy > 0 else -1 if dy < 0 else 0
                
                new_pos = Pt(current_unit.position.x + step_x, current_unit.position.y + step_y)
                if game.is_valid_move(current_unit, new_pos, current_unit.unit_type.speed):
                    move = GameMove(MoveType.MOVE, target_pos=new_pos)
                    game.execute_move(move)
                else:
                    print("Blocked or out of moves.")
        except ValueError as e:
            print(f"Move failed: {e}")

        if game.check_game_over():
            break
            
        game.next_turn()
