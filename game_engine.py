import json
import math
import random
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict

# --- Data Classes ---

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
class Unit:
    uid: int
    unit_type: UnitType
    player_id: int
    position: Tuple[int, int]
    current_health: int
    
    @property
    def name(self):
        return self.unit_type.name
    
    @property
    def is_alive(self):
        return self.current_health > 0

# --- Game Engine ---

class GameEngine:
    def __init__(self, fixtures_path: str = "fixtures.json"):
        self.grid_width = 17
        self.grid_height = 24
        self.units: Dict[int, Unit] = {}
        self.grid: Dict[Tuple[int, int], int] = {} # (x, y) -> unit_uid
        self.spells: Dict[str, Spell] = {}
        self.unit_types: Dict[str, UnitType] = {}
        self.next_uid = 1
        self.turn_order: List[int] = []
        self.current_turn_index = 0
        
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

    def initialize_game(self):
        # Player 1 (Top)
        p1_units = ["Warrior", "Mage", "Battlemage"]
        for i, u_name in enumerate(p1_units):
            pos = (2 + i * 4, 2) # Simple initial placement
            self.add_unit(u_name, 1, pos)
            
        # Player 2 (Bottom)
        p2_units = ["Warrior", "Mage", "Battlemage"]
        for i, u_name in enumerate(p2_units):
            pos = (2 + i * 4, 21) # Simple initial placement
            self.add_unit(u_name, 2, pos)
            
        self.turn_order = list(self.units.keys())
        # Simple initiative: random shuffle
        random.shuffle(self.turn_order)
        print(f"Game Initialized. Turn Order: {self.turn_order}")

    def add_unit(self, type_name: str, player_id: int, position: Tuple[int, int]):
        if position in self.grid:
            raise ValueError(f"Position {position} is already occupied.")
        
        u_type = self.unit_types[type_name]
        unit = Unit(
            uid=self.next_uid,
            unit_type=u_type,
            player_id=player_id,
            position=position,
            current_health=u_type.health
        )
        self.units[unit.uid] = unit
        self.grid[position] = unit.uid
        self.next_uid += 1

    def get_current_unit(self) -> Optional[Unit]:
        if not self.turn_order:
            return None
        uid = self.turn_order[self.current_turn_index]
        return self.units.get(uid)

    def next_turn(self):
        # Skip dead units
        original_index = self.current_turn_index
        while True:
            self.current_turn_index = (self.current_turn_index + 1) % len(self.turn_order)
            uid = self.turn_order[self.current_turn_index]
            if self.units[uid].is_alive:
                break
            if self.current_turn_index == original_index:
                # All units dead? Should be handled by game over check
                break
        print(f"Next turn: {self.get_current_unit().name} (ID: {self.get_current_unit().uid})")

    def calculate_distance(self, p1: Tuple[int, int], p2: Tuple[int, int]) -> int:
        dx = abs(p1[0] - p2[0])
        dy = abs(p1[1] - p2[1])
        diag = min(dx, dy)
        straight = max(dx, dy) - diag
        # 1 for straight, 1.5 for diagonal (floor(1.5 * diag) = diag + diag//2)
        return straight + diag + (diag // 2)

    def is_valid_move(self, unit: Unit, target_pos: Tuple[int, int], max_dist: int) -> bool:
        if not (0 <= target_pos[0] < self.grid_width and 0 <= target_pos[1] < self.grid_height):
            return False
        if target_pos in self.grid and self.grid[target_pos] != unit.uid:
            return False # Occupied
        
        dist = self.calculate_distance(unit.position, target_pos)
        return dist <= max_dist

    def move(self, unit: Unit, target_pos: Tuple[int, int]):
        if not self.is_valid_move(unit, target_pos, unit.unit_type.speed * 2):
            print(f"Invalid move for {unit.name} to {target_pos}")
            return False
        
        del self.grid[unit.position]
        unit.position = target_pos
        self.grid[target_pos] = unit.uid
        print(f"{unit.name} moved to {target_pos}")
        return True

    def attack(self, attacker: Unit, target: Unit, penalty_wc: int = 0):
        dist = self.calculate_distance(attacker.position, target.position)
        if dist > 1:
            print(f"Target out of range for attack (dist: {dist})")
            return False
        
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
        return True

    def charge(self, attacker: Unit, move_target_pos: Tuple[int, int], attack_target: Unit):
        # Charge: Move up to Speed (not 2x Speed) then Attack with -4 WC
        if not self.is_valid_move(attacker, move_target_pos, attacker.unit_type.speed):
             print(f"Invalid charge move for {attacker.name} to {move_target_pos}")
             return False
        
        # Execute move
        del self.grid[attacker.position]
        attacker.position = move_target_pos
        self.grid[move_target_pos] = attacker.uid
        print(f"{attacker.name} charged to {move_target_pos}")
        
        # Execute attack
        return self.attack(attacker, attack_target, penalty_wc=4)

    def cast_spell(self, attacker: Unit, spell_name: str, target: Unit):
        if spell_name not in attacker.unit_type.spells:
            print(f"{attacker.name} does not know spell {spell_name}")
            return False
        
        spell = self.spells[spell_name]
        dist = self.calculate_distance(attacker.position, target.position)
        
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
        return True

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
            
        target = min(enemies, key=lambda u: game.calculate_distance(current_unit.position, u.position))
        dist = game.calculate_distance(current_unit.position, target.position)
        
        print(f"\n--- Turn: {current_unit.name} (P{current_unit.player_id}) ---")
        
        # Try to cast spell if available and in range
        if current_unit.unit_type.spells:
            spell_name = current_unit.unit_type.spells[0]
            game.cast_spell(current_unit, spell_name, target)
        # Else if adjacent, attack
        elif dist == 1:
            game.attack(current_unit, target)
        # Else move towards target
        else:
            # Simple move logic: move 1 step closer in x or y
            dx = target.position[0] - current_unit.position[0]
            dy = target.position[1] - current_unit.position[1]
            
            step_x = 1 if dx > 0 else -1 if dx < 0 else 0
            step_y = 1 if dy > 0 else -1 if dy < 0 else 0
            
            new_pos = (current_unit.position[0] + step_x, current_unit.position[1] + step_y)
            if game.is_valid_move(current_unit, new_pos, current_unit.unit_type.speed):
                game.move(current_unit, new_pos)
            else:
                print("Blocked or out of moves.")

        if game.check_game_over():
            break
            
        game.next_turn()
