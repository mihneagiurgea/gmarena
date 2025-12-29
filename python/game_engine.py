import json
import math
import random
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict
from enum import Enum, auto

# --- Data Classes ---

from hex import Pt, HexGrid

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
class UnitState:
    state: 'GameState'  # Reference to game state
    uid: int
    current_health: int

    def __repr__(self):
        symbol = "♔" if self.player_id == 1 else "♚"
        name_with_id = f"{self.unit_type.name}#{self.uid} {symbol}"
        if not self.is_alive:
            return f"{name_with_id:12} {symbol}: DEAD"
        pos = self.state.grid.get_pt(self.uid)
        return f"{name_with_id:12} at {pos}: {self.current_health}/{self.unit_type.health}hp"
    
    @property
    def is_alive(self):
        return self.current_health > 0
        
    @property
    def player_id(self):
        return 1 if self.uid % 2 != 0 else 2
        
    @property
    def unit_type(self) -> UnitType:
        return self.state.instance.units[self.uid]
        
    @property
    def name(self):
        return self.unit_type.name
    
    @property
    def position(self) -> Pt:
        """Get position from the grid using reverse lookup"""
        return self.state.grid.get_pt(self.uid)

class MoveType(Enum):
    MOVE = auto()
    ATTACK = auto()
    CHARGE = auto()
    CAST_SPELL = auto()

class RollResult(Enum):
    MISS = auto()
    HIT = auto()
    CRIT = auto()

@dataclass
class GameMove:
    move_type: MoveType
    target_pos: Pt
    spell_name: Optional[str] = None
    
    def __str__(self):
        if self.move_type == MoveType.MOVE:
            return f"Move to {self.target_pos}"
        elif self.move_type == MoveType.ATTACK:
            return f"Attack {self.target_pos}"
        elif self.move_type == MoveType.CHARGE:
            return f"Charge {self.target_pos}"
        elif self.move_type == MoveType.CAST_SPELL:
            return f"Cast {self.spell_name} at {self.target_pos}"
        return f"{self.move_type.name} {self.target_pos}"

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

class Roll:

    def roll(self, bonus: int, difficulty: int) -> RollResult:
        r = random.randint(1, 20)
        
        threshold = difficulty - bonus
        if r == 20:
            # Natural 20 is always a hit.
            res = RollResult.CRIT
        elif r == 1:
            # Natural 1 is always a miss.
            res = RollResult.MISS
        else:
            if r >= threshold:
                res = RollResult.HIT
            else:
                res = RollResult.MISS
        
        self.last_probability = self._calculate_probability(res, threshold)
        return res

    def _calculate_probability(self, result: RollResult, threshold: int) -> float:
        # P(Crit) = 0.05
        if result == RollResult.CRIT:
            return 0.05
            
        # Count hits in 2..19
        # r >= threshold
        # Valid r in [2, 19]
        # Hits are r in [max(2, threshold), 19]
        lower = max(2, threshold)
        upper = 19
        
        hits = 0
        if lower <= upper:
            hits = upper - lower + 1
            
        p_hit = hits / 20.0
        
        if result == RollResult.HIT:
            return p_hit
            
        # P(Miss) = 1.0 - P(Crit) - P(Hit)
        return (19 - hits) / 20.0

class FixedRoll(Roll):
    def __init__(self, result: RollResult):
        super().__init__()
        self.fixed_result = result
        
    def roll(self, bonus: int, difficulty: int) -> RollResult:
        self.last_probability = self._calculate_probability(self.fixed_result, difficulty - bonus)
        return self.fixed_result

# --- Game Instance ---

class GameInstance:
    def __init__(self, config: GameConfig):
        self.config = config
        self.turn_order: List[int] = []
        self.units: Dict[int, UnitType] = {} # unit_uid -> UnitType

    def start_game(self, p1_units: List[str], p2_units: List[str]) -> 'GameState':
        grid = HexGrid(self.config.grid_width, self.config.grid_height)

        # Player 1 (Top)
        gap = 2
        total_width = len(p1_units) + (len(p1_units) - 1) * gap
        start_x = (self.config.grid_width - total_width) // 2
        
        uid = 1
        for i, type_name in enumerate(p1_units):
            x = start_x + i * (1 + gap)
            pos = Pt(x, 0)

            self.units[uid] = self.config.unit_types[type_name]
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
            
            self.units[uid] = self.config.unit_types[type_name]
            grid[pos] = uid

            uid += 2

        self.turn_order = list(self.units.keys())
        random.shuffle(self.turn_order)
        print(f"Game Initialized. Turn Order: {self.turn_order}")
        return GameState(self, grid)

class GameState:
    def __init__(self, instance: GameInstance, grid: HexGrid):
        self.instance = instance
        self.grid: HexGrid = grid
        self.units: Dict[int, UnitState] = {}
        
        # Create UnitState for each unit in the grid
        for pos, uid in grid.items():
            unit_type = instance.units[uid]
            self.units[uid] = UnitState(self, uid, unit_type.health)
            
        self.current_turn_index = 0

    def print(self):
        alive_units = [u for u in self.units.values() if u.is_alive]
        sorted_units = sorted(alive_units, key=lambda u: (u.position.y, u.position.x))
        for unit in sorted_units:
            print(unit)

    def get_current_unit(self) -> UnitState:
        uid = self.instance.turn_order[self.current_turn_index]
        return self.units[uid]

    def clone(self) -> 'GameState':
        new_state = GameState.__new__(GameState)
        new_state.instance = self.instance
        # Clone the HexGrid
        new_state.grid = self.grid.clone()
        new_state.units = {uid: UnitState(new_state, uid, u.current_health) for uid, u in self.units.items()}
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
        
        # 1. Move - only towards enemies that are not already adjacent
        enemies = [e for e in self.units.values() if e.player_id != player_id and e.is_alive]
        
        for enemy in enemies:
            # Skip if already adjacent (can attack instead)
            if self.grid.distance(u.position, enemy.position) <= 1:
                continue
                
            # Find path to adjacent cell of enemy
            path = self.grid.find_path_adj(u.position, enemy.position)
            
            if path and len(path) > 1:  # path includes start position
                # Generate moves along the path up to speed * 2
                max_dist = u.unit_type.speed * 2
                # path[0] is start, so we want path[min(max_dist, len(path) - 1)]
                target_index = min(max_dist, len(path) - 1)
                target_pos = path[target_index]
                # Only add move if target position is not occupied by another unit
                if self.grid[target_pos] is None or self.grid[target_pos] == u.uid:
                    moves.append(GameMove(MoveType.MOVE, target_pos=target_pos))
                    
        # 2. Attack
        # Find all enemies in range
        enemies = [e for e in self.units.values() if e.player_id != player_id and e.is_alive]
        for e in enemies:
            dist = self.grid.distance(u.position, e.position)
            if dist <= 1:
                moves.append(GameMove(MoveType.ATTACK, target_pos=e.position))
                
        # 3. Charge
        # Move + Attack. Target must be reachable with speed (not 2x) and then adjacent.
        # We can iterate enemies and check if we can charge them.
        for e in enemies:
            path = self.grid.find_path_adj(u.position, e.position)
            # path includes start position, so len(path)-1 is the number of steps
            if path and len(path) > 1 and len(path) - 1 <= u.unit_type.speed:
                # Use the last position in the path (adjacent to enemy)
                charge_pos = path[-1]
                # Verify the charge position is adjacent to enemy
                if self.grid.distance(charge_pos, e.position) == 1:
                    moves.append(GameMove(MoveType.CHARGE, target_pos=e.position))
                
        # 4. Spells
        for spell_name in u.unit_type.spells:
            spell = self.instance.config.spells[spell_name]
            # Spells usually have range.
            for e in enemies:
                dist = self.grid.distance(u.position, e.position)
                # Check if in range? The cast_spell logic calculates difficulty based on range, 
                # but doesn't strictly forbid out of range (just harder).
                # But maybe we should limit to reasonable range?
                # For now, let's allow all enemies as targets.
                moves.append(GameMove(MoveType.CAST_SPELL, target_pos=e.position, spell_name=spell_name))
                
        return moves

    def _next_turn(self):
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
        if not self.grid.is_in_bounds(target_pos):
            return False
        target_uid = self.grid[target_pos]
        if target_uid is not None and target_uid != unit.uid:
            return False  # Occupied by another unit
        
        dist = self.grid.distance(unit.position, target_pos)
        return dist <= max_dist

    def execute_move(self, move: GameMove, roll: 'Roll'):
        attacker = self.get_current_unit()
        if not attacker:
            raise ValueError("No active unit for turn.")

        if move.move_type == MoveType.MOVE:
            self._move(attacker, move.target_pos)
        elif move.move_type == MoveType.ATTACK:
            # For other moves, target_pos must contain a unit
            target_uid = self.grid[move.target_pos]
            if target_uid is None:
                raise ValueError(f"No unit at target position {move.target_pos}")
            target = self.units[target_uid]
            self._attack(attacker, target, roll)
        elif move.move_type == MoveType.CHARGE:
            # For other moves, target_pos must contain a unit
            target_uid = self.grid[move.target_pos]
            if target_uid is None:
                raise ValueError(f"No unit at target position {move.target_pos}")
            target = self.units[target_uid]
            # Find best charge position using pathfinding
            path = self.grid.find_path_adj(attacker.position, target.position)
            # path includes start position, so len(path)-1 is the number of steps
            if not path or len(path) <= 1:
                raise ValueError("No valid charge position found.")
            if len(path) - 1 > attacker.unit_type.speed:
                raise ValueError(f"Target too far for charge (distance: {len(path)-1}, speed: {attacker.unit_type.speed})")
            # Use the last position in the path (adjacent to target)
            best_pos = path[-1]
            self._charge(attacker, best_pos, target, roll)
        elif move.move_type == MoveType.CAST_SPELL:
            # For other moves, target_pos must contain a unit
            target_uid = self.grid[move.target_pos]
            if target_uid is None:
                raise ValueError(f"No unit at target position {move.target_pos}")
            target = self.units[target_uid]
            if not move.spell_name:
                raise ValueError("Spell name required for CAST_SPELL move.")
            self._cast_spell(attacker, move.spell_name, target, roll)
        else:
            raise ValueError("Unhandled move_type: " + str(move.move_type))
        
        # Advance to next turn after executing move
        self._next_turn()



    def _apply_damage(self, base_damage: int, target: UnitState, rr: RollResult):
        """Apply damage based on roll result and remove unit if dead."""
        if rr == RollResult.CRIT:
            target.current_health -= base_damage * 2
        elif rr == RollResult.HIT:
            target.current_health -= base_damage
        
        if not target.is_alive:
            target_pos = self.grid.get_pt(target.uid)
            del self.grid[target_pos]

    def _move(self, unit: UnitState, target_pos: Pt):
        if not self.is_valid_move(unit, target_pos, unit.unit_type.speed * 2):
            raise ValueError(f"Invalid move for {unit} to {target_pos}")
        
        old_pos = self.grid.get_pt(unit.uid)
        del self.grid[old_pos]
        self.grid[target_pos] = unit.uid

    def _charge(self, attacker: UnitState, move_target_pos: Pt, attack_target: UnitState, roll: 'Roll'):
        # Charge: Move up to Speed (not 2x Speed) then Attack with -4 WC
        if not self.is_valid_move(attacker, move_target_pos, attacker.unit_type.speed):
             raise ValueError(f"Invalid charge move for {attacker.name} to {move_target_pos}")
        
        # Execute move
        old_pos = self.grid.get_pt(attacker.uid)
        del self.grid[old_pos]
        self.grid[move_target_pos] = attacker.uid
        
        # Execute attack
        self._attack(attacker, attack_target, roll, penalty_wc=4)

    def _attack(self, attacker: UnitState, target: UnitState, roll: 'Roll', penalty_wc: int = 0):
        dist = self.grid.distance(attacker.position, target.position)
        if dist > 1:
            raise ValueError(f"Target out of range for attack (dist: {dist})")
        
        bonus = attacker.unit_type.wc - penalty_wc
        difficulty = target.unit_type.ac
        res = roll.roll(bonus, difficulty)
        
        self._apply_damage(attacker.unit_type.attack_damage, target, res)

    def _cast_spell(self, attacker: UnitState, spell_name: str, target: UnitState, roll: 'Roll'):
        if spell_name not in attacker.unit_type.spells:
            raise ValueError(f"{attacker.name} does not know spell {spell_name}")
        
        spell = self.instance.config.spells[spell_name]
        dist = self.grid.distance(attacker.position, target.position)
        
        difficulty = dist if dist <= spell.range else dist + (dist - spell.range) * 4
        res = roll.roll(0, difficulty)
        
        self._apply_damage(spell.damage, target, res)

    # --- Minimax Protocol Implementation ---

    def is_over(self) -> bool:
        p1_alive = any(u.is_alive for u in self.units.values() if u.player_id == 1)
        p2_alive = any(u.is_alive for u in self.units.values() if u.player_id == 2)
        return not p1_alive or not p2_alive

    def apply(self, move: GameMove) -> List[Tuple['GameState', float]]:
        if move.move_type == MoveType.MOVE:
            new_state = self.clone()
            new_state.execute_move(move, FixedRoll(RollResult.HIT))
            return [(new_state, 1.0)]
            
        outcomes = []
        for res in RollResult:
            fr = FixedRoll(res)
            new_state = self.clone()
            try:
                new_state.execute_move(move, fr)
                prob = fr.last_probability
                if prob > 0:
                    outcomes.append((new_state, prob))
            except ValueError:
                pass
        assert sum(prob for _, prob in outcomes) == 1.0, "Probabilities do not sum to 1."
        return outcomes

    def __hash__(self) -> int:
        # Hash based on unit states and turn index
        unit_data: List[Tuple] = []
        for uid in sorted(self.units.keys()):
            u = self.units[uid]
            if u.is_alive:
                unit_data.append((uid, u.position.x, u.position.y, u.current_health))
            else:
                unit_data.append((uid, "DEAD"))
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
