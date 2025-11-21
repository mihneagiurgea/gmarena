import json
import math
import random
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict
from enum import Enum, auto

# --- Data Classes ---

@dataclass(frozen=True)
class Position:
    x: int
    y: int

    def distance_to(self, other: 'Position') -> int:
        dx = abs(self.x - other.x)
        dy = abs(self.y - other.y)
        diag = min(dx, dy)
        straight = max(dx, dy) - diag
        # 1 for straight, 1.5 for diagonal (floor(1.5 * diag) = diag + diag//2)
        return straight + diag + (diag // 2)

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
    position: Position
    current_health: int
    
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
    target_pos: Position
    spell_name: Optional[str] = None

# --- Game Configuration ---

class GameConfig:
    def __init__(self, fixtures_path: str = "fixtures.json"):
        self.grid_width = 9
        self.grid_height = 13
        self.spells: Dict[str, Spell] = {}
        self.unit_types: Dict[str, UnitType] = {}
        self._load_fixtures(fixtures_path)

    def _load_fixtures(self, path: str):
        with open(path, 'r') as f:
            data = json.load(f)
        
        for s in data['spells']:
            self.spells[s['name']] = Spell(s['name'], s['damage'], s['range'])
            
        for u in data['units']:
            self.unit_types[u['name']] = UnitType(
                u['name'], u['health'], u['AC'], u['WC'], 
                u['attack_damage'], u['speed'], u['spells']
            )

# --- Game State ---

class GameInstance:
    def __init__(self, config: GameConfig):
        self.config = config
        self.turn_order: List[int] = []
        self.units: Dict[int, UnitInstance] = {}
        self.grid: Dict[Position, int] = {} # Position -> unit_uid
        self.next_p1_uid = 1
        self.next_p2_uid = 2

    def _add_unit(self, type_name: str, player_id: int, position: Position):
        if position in self.grid:
            raise ValueError(f"Position {position} is already occupied.")
        
        u_type = self.config.unit_types[type_name]
        
        if player_id == 1:
            uid = self.next_p1_uid
            self.next_p1_uid += 2
        else:
            uid = self.next_p2_uid
            self.next_p2_uid += 2

        unit = UnitInstance(
            uid=uid,
            unit_type=u_type
        )
        self.units[unit.uid] = unit
        self.grid[position] = unit.uid

    def start_game(self, p1_units: List[str], p2_units: List[str]) -> 'GameState':
        # Player 1 (Top)
        gap = 2
        total_width = len(p1_units) + (len(p1_units) - 1) * gap
        start_x = (self.config.grid_width - total_width) // 2
        
        for i, u_name in enumerate(p1_units):
            x = start_x + i * (1 + gap)
            pos = Position(x, 0)
            self._add_unit(u_name, 1, pos)

        # Player 2 (Bottom)
        total_width_p2 = len(p2_units) + (len(p2_units) - 1) * gap
        start_x_p2 = (self.config.grid_width - total_width_p2) // 2
        y_p2 = self.config.grid_height - 1
        
        for i, u_name in enumerate(p2_units):
            x = start_x_p2 + i * (1 + gap)
            pos = Position(x, y_p2)
            self._add_unit(u_name, 2, pos)

        self.turn_order = list(self.units.keys())
        random.shuffle(self.turn_order)
        print(f"Game Initialized. Turn Order: {self.turn_order}")
        return GameState(self)

class GameState:
    def __init__(self, instance: GameInstance):
        self.instance = instance
        self.grid: Dict[Position, int] = instance.grid.copy()
        self.units: Dict[int, UnitState] = {}
        
        for pos, uid in self.grid.items():
            u_inst = instance.units[uid]
            self.units[uid] = UnitState(u_inst, pos, u_inst.unit_type.health)
            
        self.current_turn_index = 0

    def get_current_unit(self) -> Optional[UnitState]:
        if not self.instance.turn_order:
            return None
        uid = self.instance.turn_order[self.current_turn_index]
        return self.units.get(uid)

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
        print(f"Next turn: {self.get_current_unit().name} (ID: {self.get_current_unit().uid})")

    def is_valid_move(self, unit: UnitState, target_pos: Position, max_dist: int) -> bool:
        if not (0 <= target_pos.x < self.instance.config.grid_width and 0 <= target_pos.y < self.instance.config.grid_height):
            return False
        if target_pos in self.grid and self.grid[target_pos] != unit.uid:
            return False # Occupied
        
        dist = unit.position.distance_to(target_pos)
        return dist <= max_dist

    def execute_move(self, move: GameMove):
        attacker = self.get_current_unit()
        if not attacker:
            raise ValueError("No active unit for turn.")

        if move.move_type == MoveType.MOVE:
            self._move(attacker, move.target_pos)
            return
        
        # For other moves, target_pos must contain a unit
        target_uid = self.grid.get(move.target_pos)
        if target_uid is None:
            raise ValueError(f"No target unit at {move.target_pos}")
        
        target = self.units[target_uid]

        if move.move_type == MoveType.ATTACK:
            self._attack(attacker, target)
            
        elif move.move_type == MoveType.CHARGE:
            # Infer move position: adjacent to target, closest to attacker
            best_pos = self._find_charge_pos(attacker, target)
            if not best_pos:
                raise ValueError(f"No valid charge position near {target.name}")
            self._charge(attacker, best_pos, target)
            
        elif move.move_type == MoveType.CAST_SPELL:
            if move.spell_name is None:
                raise ValueError("Spell name required for CAST_SPELL")
            self._cast_spell(attacker, move.spell_name, target)

        else:
            raise ValueError("Unhandled move_type: " + move)

    def _find_charge_pos(self, attacker: UnitState, target: UnitState) -> Optional[Position]:
        # Find valid move position adjacent to target
        candidates = []
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                if dx == 0 and dy == 0: continue
                pos = Position(target.position.x + dx, target.position.y + dy)
                if self.is_valid_move(attacker, pos, attacker.unit_type.speed):
                    candidates.append(pos)
        
        if not candidates:
            return None
        
        # Pick closest to attacker
        return min(candidates, key=lambda p: attacker.position.distance_to(p))

    def _move(self, unit: UnitState, target_pos: Position):
        if not self.is_valid_move(unit, target_pos, unit.unit_type.speed * 2):
            raise ValueError(f"Invalid move for {unit.name} to {target_pos}")
        
        del self.grid[unit.position]
        unit.position = target_pos
        self.grid[target_pos] = unit.uid
        print(f"{unit.name} moved to {target_pos}")

    def _attack(self, attacker: UnitState, target: UnitState, penalty_wc: int = 0):
        dist = attacker.position.distance_to(target.position)
        if dist > 1:
            raise ValueError(f"Target out of range for attack (dist: {dist})")
        
        roll = random.randint(1, 20)
        hit_chance = roll + attacker.unit_type.wc - penalty_wc
        print(f"{attacker.name} attacks {target.name}. Roll: {roll} + WC {attacker.unit_type.wc} - Pen {penalty_wc} = {hit_chance} vs AC {target.unit_type.ac}")
        
        if hit_chance >= target.unit_type.ac:
            dmg = attacker.unit_type.attack_damage
            target.current_health -= dmg
            print(f"Hit! Dealt {dmg} damage. {target.name} HP: {target.current_health}")
            if not target.is_alive:
                print(f"{target.name} has been defeated!")
                del self.grid[target.position]
        else:
            print("Miss!")

    def _charge(self, attacker: UnitState, move_target_pos: Position, attack_target: UnitState):
        # Charge: Move up to Speed (not 2x Speed) then Attack with -4 WC
        if not self.is_valid_move(attacker, move_target_pos, attacker.unit_type.speed):
             raise ValueError(f"Invalid charge move for {attacker.name} to {move_target_pos}")
        
        # Execute move
        del self.grid[attacker.position]
        attacker.position = move_target_pos
        self.grid[move_target_pos] = attacker.uid
        print(f"{attacker.name} charged to {move_target_pos}")
        
        # Execute attack
        self._attack(attacker, attack_target, penalty_wc=4)

    def _cast_spell(self, attacker: UnitState, spell_name: str, target: UnitState):
        if spell_name not in attacker.unit_type.spells:
            raise ValueError(f"{attacker.name} does not know spell {spell_name}")
        
        spell = self.instance.config.spells[spell_name]
        dist = attacker.position.distance_to(target.position)
        
        difficulty = dist if dist <= spell.range else dist + (dist - spell.range) * 4
        roll = random.randint(1, 20)
        
        print(f"{attacker.name} casts {spell_name} on {target.name}. Dist: {dist}, Diff: {difficulty}. Roll: {roll}")
        
        if roll >= difficulty:
            target.current_health -= spell.damage
            print(f"Spell hit! Dealt {spell.damage} damage. {target.name} HP: {target.current_health}")
            if not target.is_alive:
                print(f"{target.name} has been defeated!")
                del self.grid[target.position]
        else:
            print("Spell failed!")

    def check_game_over(self):
        p1_alive = any(u.is_alive for u in self.units.values() if u.player_id == 1)
        p2_alive = any(u.is_alive for u in self.units.values() if u.player_id == 2)
        
        if not p1_alive:
            print("Player 2 Wins!")
            return True
        if not p2_alive:
            print("Player 1 Wins!")
            return True
        return False

# --- Game Engine ---

class GameEngine:
    def __init__(self, fixtures_path: str = "fixtures.json"):
        self.config = GameConfig(fixtures_path)
        self.instance = GameInstance(self.config)

    def initialize_game(self):
        p1_units = ["Warrior", "Mage", "Battlemage"]
        p2_units = ["Warrior", "Mage", "Battlemage"]
        self.state = self.instance.start_game(p1_units, p2_units)

    # Delegation methods for backward compatibility / ease of use
    def get_current_unit(self) -> Optional[UnitState]:
        return self.state.get_current_unit()

    def next_turn(self):
        self.state.next_turn()

    def is_valid_move(self, unit: UnitState, target_pos: Position, max_dist: int) -> bool:
        return self.state.is_valid_move(unit, target_pos, max_dist)

    def execute_move(self, move: GameMove):
        self.state.execute_move(move)

    def check_game_over(self):
        return self.state.check_game_over()

    @property
    def units(self):
        return self.state.units

    @property
    def grid(self):
        return self.state.grid

# --- Verification Block ---
if __name__ == "__main__":
    game = GameEngine()
    game.initialize_game()
    
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
            
        target = min(enemies, key=lambda u: current_unit.position.distance_to(u.position))
        dist = current_unit.position.distance_to(target.position)
        
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
                
                new_pos = Position(current_unit.position.x + step_x, current_unit.position.y + step_y)
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
