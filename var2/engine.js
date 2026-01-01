/**
 * Game Engine - Core game logic and state management
 * No DOM dependencies - pure game logic
 *
 * Zone-based positioning: 5 zones (0-4) arranged horizontally
 * - Player team starts in zone 0 (leftmost)
 * - Opponent team starts in zone 4 (rightmost)
 */

const NUM_ZONES = 5;

// ============================================================================
// GAME STATE
// ============================================================================

/**
 * @typedef {Object} Unit
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {'player' | 'opponent'} team
 * @property {number} zone - Zone index (0-4)
 * @property {number} hp
 * @property {number} maxHp
 * @property {number} ac
 * @property {number} sr
 * @property {number} wc
 * @property {number|null} meleeDamage
 * @property {number|null} rangedDamage
 * @property {string[]} spells
 * @property {boolean} taunt
 */

/** @type {Object} */
const gameState = {
  turn: 1,
  units: [],
  turnOrder: [],
  currentUnitIndex: 0,
  menuState: 'main', // 'main', 'melee', 'ranged', 'spell'
  validTargets: [],
  selectedSpell: null,
  playerControlsBoth: false // Set to true to control both teams (for testing)
};

// ============================================================================
// UNIT CREATION
// ============================================================================

/**
 * Create a unit with stats from UNIT_STATS
 */
function createUnit(id, name, type, team) {
  const stats = UNIT_STATS[type];
  return {
    id,
    name,
    type,
    team,
    zone: null,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    ac: stats.ac,
    sr: stats.sr,
    wc: stats.wc,
    meleeDamage: stats.meleeDamage,
    rangedDamage: stats.rangedDamage,
    spells: [...stats.spells],
    taunt: stats.taunt || false
  };
}

/**
 * Create initial units for the game
 * Player units start in zone 0, opponent units in zone 4
 * @returns {Unit[]}
 */
function createInitialUnits() {
  const playerUnits = [
    createUnit('warrior', 'Warrior', 'warrior', 'player'),
    createUnit('mage', 'Mage', 'mage', 'player'),
    createUnit('archer', 'Archer', 'archer', 'player')
  ];

  const opponentUnits = [
    createUnit('orc1', 'Orc #1', 'orc', 'opponent'),
    createUnit('orc2', 'Orc #2', 'orc', 'opponent'),
    createUnit('goblin1', 'Goblin', 'goblin', 'opponent')
  ];

  // Place player units in zone 0
  playerUnits.forEach(unit => {
    unit.zone = 0;
  });

  // Place opponent units in zone 4
  opponentUnits.forEach(unit => {
    unit.zone = NUM_ZONES - 1;
  });

  return [...playerUnits, ...opponentUnits];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Shuffle array randomly (Fisher-Yates)
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ============================================================================
// ZONE HELPER FUNCTIONS
// ============================================================================

/**
 * Get distance between two units (difference in zone indices)
 */
function getDistance(unit1, unit2) {
  return Math.abs(unit1.zone - unit2.zone);
}

/**
 * Get all units in a specific zone
 */
function getUnitsInZone(zone) {
  return gameState.units.filter(u => u.zone === zone);
}

/**
 * Get all enemy units in the same zone as the given unit
 */
function getEnemiesInSameZone(unit) {
  return gameState.units.filter(u => u.zone === unit.zone && u.team !== unit.team);
}

/**
 * Get all allied units in the same zone as the given unit (excluding self)
 */
function getAlliesInSameZone(unit) {
  return gameState.units.filter(u => u.zone === unit.zone && u.team === unit.team && u.id !== unit.id);
}

/**
 * Count units with Taunt from a specific team in a zone
 */
function countTauntersInZone(zone, team) {
  return gameState.units.filter(u => u.zone === zone && u.team === team && u.taunt).length;
}

/**
 * Count all units from a specific team in a zone
 */
function countUnitsInZone(zone, team) {
  return gameState.units.filter(u => u.zone === zone && u.team === team).length;
}

/**
 * Check if a unit can move forward
 * Forward means: player team moves right (increasing zone), opponent moves left (decreasing zone)
 * A unit can move forward only if Num(self team) > Taunt(enemy team) in current zone
 */
function canMoveForward(unit) {
  const forwardZone = unit.team === 'player' ? unit.zone + 1 : unit.zone - 1;

  // Check if forward zone exists
  if (forwardZone < 0 || forwardZone >= NUM_ZONES) {
    return false;
  }

  // Check Taunt mechanic in current zone
  const enemyTeam = unit.team === 'player' ? 'opponent' : 'player';
  const enemyTaunters = countTauntersInZone(unit.zone, enemyTeam);
  const ownUnits = countUnitsInZone(unit.zone, unit.team);

  // Can move forward if ownUnits > enemyTaunters
  return ownUnits > enemyTaunters;
}

/**
 * Check if a unit can move backward
 * Backward means: player team moves left (decreasing zone), opponent moves right (increasing zone)
 * Units can always move backward (no Taunt restriction)
 */
function canMoveBackward(unit) {
  const backwardZone = unit.team === 'player' ? unit.zone - 1 : unit.zone + 1;

  // Check if backward zone exists
  return backwardZone >= 0 && backwardZone < NUM_ZONES;
}

/**
 * Get the forward zone index for a unit
 */
function getForwardZone(unit) {
  return unit.team === 'player' ? unit.zone + 1 : unit.zone - 1;
}

/**
 * Get the backward zone index for a unit
 */
function getBackwardZone(unit) {
  return unit.team === 'player' ? unit.zone - 1 : unit.zone + 1;
}

/**
 * Check if a unit is blocked from moving forward specifically due to Taunt
 * (not because they're at the edge of the map)
 */
function isTaunted(unit) {
  const forwardZone = unit.team === 'player' ? unit.zone + 1 : unit.zone - 1;

  // If at edge, not taunted - just can't move further
  if (forwardZone < 0 || forwardZone >= NUM_ZONES) {
    return false;
  }

  // Check if blocked by taunt
  const enemyTeam = unit.team === 'player' ? 'opponent' : 'player';
  const enemyTaunters = countTauntersInZone(unit.zone, enemyTeam);
  const ownUnits = countUnitsInZone(unit.zone, unit.team);

  // Taunted if there are enemy taunters and we can't outnumber them
  return enemyTaunters > 0 && ownUnits <= enemyTaunters;
}

// ============================================================================
// COMBAT SYSTEM
// ============================================================================

/**
 * Roll a d20
 */
function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * Perform a melee attack
 * @returns {{roll: number, hit: boolean, critical: boolean, damage: number, message: string}}
 */
function performMeleeAttack(attacker, defender) {
  const roll = rollD20();
  let result = { roll, hit: false, critical: false, damage: 0, message: '' };

  if (roll === 1) {
    result.message = `${attacker.name} rolls ${roll} - Critical Miss!`;
  } else if (roll === 20) {
    result.hit = true;
    result.critical = true;
    result.damage = Math.floor(attacker.meleeDamage * 1.5);
    result.message = `${attacker.name} rolls ${roll} - Critical Hit! Deals ${result.damage} damage to ${defender.name}!`;
  } else {
    const attackValue = attacker.wc + roll;
    if (attackValue >= defender.ac) {
      result.hit = true;
      result.damage = attacker.meleeDamage;
      result.message = `${attacker.name} rolls ${roll} (${attackValue} vs AC ${defender.ac}) - Hit! Deals ${result.damage} damage to ${defender.name}.`;
    } else {
      result.message = `${attacker.name} rolls ${roll} (${attackValue} vs AC ${defender.ac}) - Miss!`;
    }
  }

  return result;
}

/**
 * Perform a ranged attack
 * @returns {{roll: number, hit: boolean, critical: boolean, damage: number, message: string}}
 */
function performRangedAttack(attacker, defender) {
  const roll = rollD20();
  let result = { roll, hit: false, critical: false, damage: 0, message: '' };

  if (roll === 1) {
    result.message = `${attacker.name} rolls ${roll} - Critical Miss!`;
  } else if (roll === 20) {
    result.hit = true;
    result.critical = true;
    result.damage = Math.floor(attacker.rangedDamage * 1.5);
    result.message = `${attacker.name} rolls ${roll} - Critical Hit! Deals ${result.damage} damage to ${defender.name}!`;
  } else {
    const attackValue = attacker.wc + roll;
    if (attackValue >= defender.ac) {
      result.hit = true;
      result.damage = attacker.rangedDamage;
      result.message = `${attacker.name} rolls ${roll} (${attackValue} vs AC ${defender.ac}) - Hit! Deals ${result.damage} damage to ${defender.name}.`;
    } else {
      result.message = `${attacker.name} rolls ${roll} (${attackValue} vs AC ${defender.ac}) - Miss!`;
    }
  }

  return result;
}

/**
 * Cast a spell
 * @returns {{roll: number, hit: boolean, critical: boolean, damage: number, message: string}}
 */
function castSpell(caster, target, spellId) {
  const spell = SPELLS[spellId];
  const roll = rollD20();
  let result = { roll, hit: false, critical: false, damage: 0, message: '' };

  // Offensive spell against enemy
  if (spell.type === 'offensive' && caster.team !== target.team) {
    if (roll === 1) {
      result.message = `${caster.name} casts ${spell.name}, rolls ${roll} - Critical Miss!`;
    } else if (roll === 20) {
      result.hit = true;
      result.critical = true;
      result.damage = Math.floor(spell.damage * 1.5);
      result.message = `${caster.name} casts ${spell.name}, rolls ${roll} - Critical Hit! Deals ${result.damage} damage to ${target.name}!`;
    } else {
      if (roll >= target.sr) {
        result.hit = true;
        result.damage = spell.damage;
        result.message = `${caster.name} casts ${spell.name}, rolls ${roll} (vs SR ${target.sr}) - Hit! Deals ${result.damage} damage to ${target.name}.`;
      } else {
        result.message = `${caster.name} casts ${spell.name}, rolls ${roll} (vs SR ${target.sr}) - Resisted!`;
      }
    }
  }

  return result;
}

/**
 * Apply damage to a unit
 * @returns {boolean} True if unit died
 */
function applyDamage(unit, damage) {
  unit.hp -= damage;
  if (unit.hp <= 0) {
    unit.hp = 0;
    return true; // Unit died
  }
  return false;
}

/**
 * Remove dead units from game
 * @returns {Unit[]} Array of units that were removed
 */
function removeDeadUnits() {
  const deadUnits = gameState.units.filter(u => u.hp <= 0);
  deadUnits.forEach(unit => {
    // Remove from turn order
    gameState.turnOrder = gameState.turnOrder.filter(id => id !== unit.id);
    // Adjust current index if needed
    const deadIndex = gameState.turnOrder.indexOf(unit.id);
    if (deadIndex !== -1 && deadIndex < gameState.currentUnitIndex) {
      gameState.currentUnitIndex--;
    }
  });
  gameState.units = gameState.units.filter(u => u.hp > 0);
  return deadUnits;
}

/**
 * Check if game is over
 * @returns {'ongoing' | 'victory' | 'defeat'}
 */
function checkGameOver() {
  const playerAlive = gameState.units.some(u => u.team === 'player');
  const opponentAlive = gameState.units.some(u => u.team === 'opponent');

  if (!playerAlive) return 'defeat';
  if (!opponentAlive) return 'victory';
  return 'ongoing';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCurrentUnit() {
  if (gameState.turnOrder.length === 0) return null;
  const unitId = gameState.turnOrder[gameState.currentUnitIndex];
  return gameState.units.find(u => u.id === unitId) || null;
}

/**
 * Check if a unit is controlled by the player
 */
function isPlayerControlled(unit) {
  if (!unit) return false;
  return unit.team === 'player' || gameState.playerControlsBoth;
}

/**
 * Get valid melee targets, respecting Taunt
 * Melee attacks can only target units in the same zone (distance = 0)
 * If any enemy in the zone has Taunt, only taunters can be targeted
 */
function getValidMeleeTargets(unit) {
  const enemiesInZone = getEnemiesInSameZone(unit);
  const taunters = enemiesInZone.filter(e => e.taunt);

  // If there are taunters, only they can be targeted
  if (taunters.length > 0) {
    return { targets: taunters, protected: enemiesInZone.filter(e => !e.taunt) };
  }

  return { targets: enemiesInZone, protected: [] };
}

/**
 * Get all enemies (for ranged attacks and spells)
 */
function getAllEnemies(unit) {
  return gameState.units.filter(u => u.team !== unit.team);
}
