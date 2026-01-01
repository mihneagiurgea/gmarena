/**
 * Game Engine - Core game logic and state management
 * No DOM dependencies - pure game logic
 */

const GRID_ROWS = 3;
const GRID_COLS = 5;

// ============================================================================
// GAME STATE
// ============================================================================

/**
 * @typedef {Object} Unit
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {'player' | 'opponent'} team
 * @property {{row: number, col: number}} position
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
  menuState: 'main', // 'main', 'move', 'melee', 'ranged', 'spell'
  validMoves: [],
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
    position: null,
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
 * Place units in a column based on count
 */
function placeUnitsInColumn(units, col) {
  const count = units.length;
  if (count === 1) {
    units[0].position = { row: 1, col };
  } else if (count === 2) {
    units[0].position = { row: 0, col };
    units[1].position = { row: 2, col };
  } else if (count === 3) {
    units[0].position = { row: 0, col };
    units[1].position = { row: 1, col };
    units[2].position = { row: 2, col };
  }
}

/**
 * Create initial units for the game
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

  placeUnitsInColumn(playerUnits, 0);
  placeUnitsInColumn(opponentUnits, GRID_COLS - 1);

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

function getUnitAt(row, col) {
  return gameState.units.find(u => u.position.row === row && u.position.col === col) || null;
}

function isValidPosition(row, col) {
  return row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS;
}

function isOccupied(row, col) {
  return getUnitAt(row, col) !== null;
}

function getAdjacentCells(pos) {
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  return directions
    .map(([dr, dc]) => ({ row: pos.row + dr, col: pos.col + dc }))
    .filter(p => isValidPosition(p.row, p.col) && !isOccupied(p.row, p.col));
}

function getAdjacentEnemies(unit) {
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  return directions
    .map(([dr, dc]) => getUnitAt(unit.position.row + dr, unit.position.col + dc))
    .filter(u => u !== null && u.team !== unit.team);
}

/**
 * Get valid melee targets, respecting Taunt
 * If any adjacent enemy has Taunt, only taunters can be targeted
 */
function getValidMeleeTargets(unit) {
  const adjacentEnemies = getAdjacentEnemies(unit);
  const taunters = adjacentEnemies.filter(e => e.taunt);

  // If there are taunters, only they can be targeted
  if (taunters.length > 0) {
    return { targets: taunters, protected: adjacentEnemies.filter(e => !e.taunt) };
  }

  return { targets: adjacentEnemies, protected: [] };
}

function getAllEnemies(unit) {
  return gameState.units.filter(u => u.team !== unit.team);
}

function getDirectionName(from, to) {
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  const vertical = dr < 0 ? 'North' : dr > 0 ? 'South' : '';
  const horizontal = dc < 0 ? 'West' : dc > 0 ? 'East' : '';
  return vertical + horizontal || 'Center';
}
