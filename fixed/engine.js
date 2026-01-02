/**
 * Game Engine - Core game logic and state management
 * No DOM dependencies - pure game logic
 *
 * Fixed position zones: 4 zones arranged horizontally
 * - AR (0): Team A Ranged
 * - AM (1): Team A Melee
 * - BM (2): Team B Melee
 * - BR (3): Team B Ranged
 * Units are assigned at game start and never move.
 */

const NUM_ZONES = 4;

// Zone constants
const ZONES = {
  AR: 0,  // Player Ranged
  AM: 1,  // Player Melee
  BM: 2,  // Opponent Melee
  BR: 3   // Opponent Ranged
};

const ZONE_NAMES = ['AR', 'AM', 'BM', 'BR'];

// ============================================================================
// GAME STATE
// ============================================================================

/**
 * @typedef {Object} TauntEffect
 * @property {string} taunterId - ID of the unit that applied taunt
 * @property {number} duration - Remaining turns
 */

/**
 * @typedef {Object} Unit
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {'player' | 'opponent'} team
 * @property {number} zone - Zone index (0-3: AR, AM, BM, BR)
 * @property {number} hp
 * @property {number} maxHp
 * @property {number} ac
 * @property {number} sr
 * @property {number} wc
 * @property {number|null} meleeDamage
 * @property {number|null} rangedDamage
 * @property {string[]} spells
 * @property {number} tauntDuration - How many turns of taunt this unit applies on melee hit
 * @property {TauntEffect[]} tauntedBy - Active taunt effects on this unit
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
    tauntDuration: stats.tauntDuration || 0,
    tauntedBy: []  // Active taunt effects: [{taunterId, duration}]
  };
}

/**
 * Determine if a unit is ranged (has ranged attack or spells but no melee)
 */
function isRangedUnit(unit) {
  return unit.meleeDamage === null && (unit.rangedDamage !== null || unit.spells.length > 0);
}

/**
 * Determine if a unit is melee
 */
function isMeleeUnit(unit) {
  return unit.meleeDamage !== null;
}

/**
 * Create initial units for the game
 * Units are placed based on type:
 * - Player ranged → AR (zone 0)
 * - Player melee → AM (zone 1)
 * - Opponent melee → BM (zone 2)
 * - Opponent ranged → BR (zone 3)
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

  // Place player units by type
  playerUnits.forEach(unit => {
    unit.zone = isRangedUnit(unit) ? ZONES.AR : ZONES.AM;
  });

  // Place opponent units by type
  opponentUnits.forEach(unit => {
    unit.zone = isRangedUnit(unit) ? ZONES.BR : ZONES.BM;
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
 * Get all units in a specific zone
 */
function getUnitsInZone(zone) {
  return gameState.units.filter(u => u.zone === zone);
}

/**
 * Get the adjacent melee zone for a given zone
 * AM ↔ BM are adjacent for melee attacks
 */
function getAdjacentMeleeZone(zone) {
  if (zone === ZONES.AM) return ZONES.BM;
  if (zone === ZONES.BM) return ZONES.AM;
  return null; // Ranged zones have no adjacent melee zone
}

/**
 * Get the enemy ranged zone for a given team
 */
function getEnemyRangedZone(team) {
  return team === 'player' ? ZONES.BR : ZONES.AR;
}

/**
 * Check if a unit has any active taunt effects
 */
function isTaunted(unit) {
  return unit.tauntedBy && unit.tauntedBy.length > 0;
}

/**
 * Get the taunters that this unit must attack (if any)
 * Returns only taunters that are still alive
 */
function getActiveTaunters(unit) {
  if (!unit.tauntedBy || unit.tauntedBy.length === 0) return [];

  return unit.tauntedBy
    .map(effect => gameState.units.find(u => u.id === effect.taunterId))
    .filter(taunter => taunter && taunter.hp > 0);
}

/**
 * Apply taunt effect from attacker to defender
 */
function applyTaunt(attacker, defender, duration) {
  if (duration <= 0) return;

  // Check if already taunted by this attacker
  const existingEffect = defender.tauntedBy.find(e => e.taunterId === attacker.id);
  if (existingEffect) {
    // Refresh duration if new is longer
    existingEffect.duration = Math.max(existingEffect.duration, duration);
  } else {
    defender.tauntedBy.push({ taunterId: attacker.id, duration });
  }
}

/**
 * Decrement taunt durations at end of unit's turn and remove expired taunts
 */
function decrementTaunts(unit) {
  if (!unit.tauntedBy) return;

  unit.tauntedBy.forEach(effect => {
    effect.duration--;
  });

  // Remove expired taunts
  unit.tauntedBy = unit.tauntedBy.filter(effect => effect.duration > 0);
}

/**
 * Remove all taunt effects from a specific taunter (called when taunter dies)
 */
function removeTaunterEffects(taunterId) {
  gameState.units.forEach(unit => {
    if (unit.tauntedBy) {
      unit.tauntedBy = unit.tauntedBy.filter(e => e.taunterId !== taunterId);
    }
  });
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
 * If hit and attacker has tauntDuration > 0, applies Taunt X to defender
 * @returns {{roll: number, hit: boolean, critical: boolean, damage: number, tauntApplied: number, message: string}}
 */
function performMeleeAttack(attacker, defender) {
  const roll = rollD20();
  let result = { roll, hit: false, critical: false, damage: 0, tauntApplied: 0, message: '' };

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

  // Apply Taunt X on hit if attacker has tauntDuration
  if (result.hit && attacker.tauntDuration > 0) {
    applyTaunt(attacker, defender, attacker.tauntDuration);
    result.tauntApplied = attacker.tauntDuration;
    result.message += ` ${defender.name} is Taunted ${attacker.tauntDuration}!`;
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
    // Remove any taunt effects this unit had applied
    removeTaunterEffects(unit.id);
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
 * Get valid melee targets for a unit
 *
 * Rules:
 * - Melee units (in AM or BM) can attack adjacent enemy zone (AM↔BM)
 * - If taunted, can ONLY attack taunters (may include enemies in ranged zone)
 * - If not taunted, can attack any enemy in adjacent melee zone
 */
function getValidMeleeTargets(unit) {
  // Must have melee capability
  if (unit.meleeDamage === null) {
    return { targets: [], protected: [], mustAttackTaunters: false };
  }

  const activeTaunters = getActiveTaunters(unit);

  // If taunted, can only attack taunters
  if (activeTaunters.length > 0) {
    return { targets: activeTaunters, protected: [], mustAttackTaunters: true };
  }

  // Not taunted: can attack enemies in adjacent melee zone
  const adjacentZone = getAdjacentMeleeZone(unit.zone);
  if (adjacentZone === null) {
    // Unit is in a ranged zone - can't melee attack (shouldn't have melee anyway)
    return { targets: [], protected: [], mustAttackTaunters: false };
  }

  const enemiesInAdjacentZone = getUnitsInZone(adjacentZone);
  return { targets: enemiesInAdjacentZone, protected: [], mustAttackTaunters: false };
}

/**
 * Get all enemies (for ranged attacks and spells)
 */
function getAllEnemies(unit) {
  return gameState.units.filter(u => u.team !== unit.team);
}
