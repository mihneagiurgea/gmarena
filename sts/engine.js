/**
 * Game Engine - Core game logic and state management
 * No DOM dependencies - pure game logic
 *
 * 3 zones: A - X - B
 * - Zone A: Team A starting zone
 * - Zone X: Middle zone (melee combat)
 * - Zone B: Team B starting zone
 *
 * Card-based combat system inspired by Slay the Spire
 */

const NUM_ZONES = 3;

// Zone constants
const ZONES = {
  A: 0,  // Team A start
  X: 1,  // Middle (melee)
  B: 2   // Team B start
};

const ZONE_NAMES = ['A', 'X', 'B'];

// ============================================================================
// CARD DEFINITIONS (built from cards-data.js)
// ============================================================================

// Build CARDS object from CARD_DATA array
const CARDS = {};
CARD_DATA.forEach(card => {
  CARDS[card.id] = card;
});

/**
 * Check if a unit can play a specific card
 */
function canPlayCard(unit, card) {
  if (!card.requires) return true; // Basic card, anyone can play

  // Parse comma-separated requirements
  const requirements = card.requires.split(',').map(r => r.trim());

  for (const req of requirements) {
    if (req === 'melee' && unit.attackRange !== 'melee') return false;
    if (req === 'ranged' && unit.attackRange !== 'ranged') return false;
    if (req === 'physical' && unit.attackType !== 'physical') return false;
    if (req === 'magic' && unit.attackType !== 'magic') return false;
  }

  return true;
}

/**
 * Get cards from hand that the unit can play
 */
function getPlayableCards(unit) {
  const hand = unit.team === 'player' ? gameState.playerHand : gameState.opponentHand;
  return hand.filter(cardId => {
    const card = CARDS[cardId];
    return card && canPlayCard(unit, card);
  });
}

/**
 * Create a deck of cards for a team from DECK_DATA
 * @returns {string[]} Array of card IDs
 */
function createDeck(team) {
  const deckDef = DECK_DATA[team];
  const deck = [];

  for (const [cardId, count] of Object.entries(deckDef)) {
    for (let i = 0; i < count; i++) {
      deck.push(cardId);
    }
  }

  return deck;
}

// ============================================================================
// GAME STATE
// ============================================================================

/**
 * @typedef {Object} Effect
 * @property {string} type - Effect type (e.g., 'taunt')
 * @property {string} sourceId - ID of the unit that applied this effect
 * @property {number} duration - Remaining turns
 */

/**
 * @typedef {Object} Auras
 * @property {number} bonus - Added to damage and heal effects
 * @property {number} armor - Reduces incoming physical damage
 * @property {number} resistance - Reduces incoming magic damage
 * @property {number} taunt - All attacks apply Taunt (X)
 */

/**
 * @typedef {Object} Unit
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {'player' | 'opponent'} team
 * @property {number} zone - Zone index (0-2: A, X, B)
 * @property {number} hp
 * @property {number} maxHp
 * @property {'melee' | 'ranged'} attackRange
 * @property {'physical' | 'magic'} attackType
 * @property {number} block - Current block (absorbs damage, resets each turn)
 * @property {boolean} hasAdvanced - True if melee unit has advanced to X
 * @property {Effect[]} effects - Active effects on this unit
 * @property {Auras} auras - Permanent damage reduction auras
 */

/** @type {Object} */
const gameState = {
  turn: 1,
  units: [],
  turnOrder: [],
  currentUnitIndex: 0,
  phase: 'play', // 'play', 'targeting'
  selectedCard: null,
  validTargets: [],

  // Control settings: 'human' or 'ai'
  playerControl: 'human',
  opponentControl: 'ai',

  // Card state per team
  playerDeck: [],
  playerHand: [],
  opponentDeck: [],
  opponentHand: []
};

// ============================================================================
// UNIT CREATION
// ============================================================================

/**
 * Create a unit with stats from UNIT_DATA
 */
function createUnit(id, name, type, team) {
  const stats = UNIT_DATA[type];
  const unitAuras = stats.auras || {};
  return {
    id,
    name,
    type,
    team,
    zone: null,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    attackRange: stats.attackRange,
    attackType: stats.attackType,
    block: 0,
    hasAdvanced: false,
    effects: [],
    auras: {
      bonus: unitAuras.bonus || 0,
      armor: unitAuras.armor || 0,
      resistance: unitAuras.resistance || 0,
      taunt: unitAuras.taunt || 0
    }
  };
}

/**
 * Check if a unit is melee
 */
function isMeleeUnit(unit) {
  return unit.attackRange === 'melee';
}

/**
 * Check if a unit is ranged
 */
function isRangedUnit(unit) {
  return unit.attackRange === 'ranged';
}

/**
 * Create units from an array of types, generating unique ids and names
 * @param {string[]} types - Array of unit type strings
 * @param {string} team - Team name ('player' or 'opponent')
 * @returns {Unit[]}
 */
function createUnitsFromTypes(types, team) {
  // Count occurrences of each type
  const typeCounts = {};
  types.forEach(type => {
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  // Track current index for each type
  const typeIndex = {};

  return types.map(type => {
    const count = typeCounts[type];
    typeIndex[type] = (typeIndex[type] || 0) + 1;
    const idx = typeIndex[type];

    // Capitalize first letter for name
    const baseName = type.charAt(0).toUpperCase() + type.slice(1);

    // If multiple of same type, add number suffix
    const id = count > 1 ? `${type}${idx}` : type;
    const name = count > 1 ? `${baseName} #${idx}` : baseName;

    return createUnit(id, name, type, team);
  });
}

/**
 * Create initial units for the game from TEAM_DATA
 * All Team A units start in zone A, all Team B units start in zone B
 * @returns {Unit[]}
 */
function createInitialUnits() {
  const playerUnits = createUnitsFromTypes(TEAM_DATA.player, 'player');
  const opponentUnits = createUnitsFromTypes(TEAM_DATA.opponent, 'opponent');

  // All player units start in zone A
  playerUnits.forEach(unit => {
    unit.zone = ZONES.A;
  });

  // All opponent units start in zone B
  opponentUnits.forEach(unit => {
    unit.zone = ZONES.B;
  });

  return [...playerUnits, ...opponentUnits];
}

// ============================================================================
// DECK/CARD FUNCTIONS
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

/**
 * Draw cards for a team up to hand limit (5)
 */
function drawCards(team) {
  const handLimit = 5;
  const deck = team === 'player' ? gameState.playerDeck : gameState.opponentDeck;
  const hand = team === 'player' ? gameState.playerHand : gameState.opponentHand;

  while (hand.length < handLimit && deck.length > 0) {
    const card = deck.pop();
    hand.push(card);
  }
}

/**
 * Play a card from hand and shuffle it back into the deck
 */
function playCard(team, cardIndex) {
  const hand = team === 'player' ? gameState.playerHand : gameState.opponentHand;
  const deck = team === 'player' ? gameState.playerDeck : gameState.opponentDeck;

  if (cardIndex < 0 || cardIndex >= hand.length) return null;

  const cardId = hand.splice(cardIndex, 1)[0];

  // Shuffle the card back into the deck
  const insertIndex = Math.floor(Math.random() * (deck.length + 1));
  deck.splice(insertIndex, 0, cardId);

  return cardId;
}

/**
 * Get current team's hand
 */
function getCurrentHand() {
  const unit = getCurrentUnit();
  if (!unit) return [];
  return unit.team === 'player' ? gameState.playerHand : gameState.opponentHand;
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
 * Get adjacent zones for a given zone
 * A ↔ X ↔ B
 */
function getAdjacentZones(zone) {
  if (zone === ZONES.A) return [ZONES.X];
  if (zone === ZONES.X) return [ZONES.A, ZONES.B];
  if (zone === ZONES.B) return [ZONES.X];
  return [];
}

/**
 * Check if two zones are adjacent
 */
function areZonesAdjacent(zone1, zone2) {
  return getAdjacentZones(zone1).includes(zone2);
}

// ============================================================================
// EFFECT SYSTEM
// ============================================================================

/**
 * Check if a unit has an effect of a specific type
 */
function hasEffect(unit, effectType) {
  return unit.effects.some(e => e.type === effectType);
}

/**
 * Get all effects of a specific type on a unit
 */
function getEffects(unit, effectType) {
  return unit.effects.filter(e => e.type === effectType);
}

/**
 * Check if a unit is taunted
 */
function isTaunted(unit) {
  return hasEffect(unit, 'taunt');
}

/**
 * Get the taunters that this unit must attack (if any)
 * Returns only taunters that are still alive
 */
function getActiveTaunters(unit) {
  const tauntEffects = getEffects(unit, 'taunt');
  if (tauntEffects.length === 0) return [];

  return tauntEffects
    .map(effect => gameState.units.find(u => u.id === effect.sourceId))
    .filter(taunter => taunter && taunter.hp > 0);
}

/**
 * Apply an effect to a unit
 */
function applyEffect(unit, effectType, sourceId, duration) {
  if (duration <= 0) return;

  // Check if already has this effect from this source
  const existingEffect = unit.effects.find(e => e.type === effectType && e.sourceId === sourceId);
  if (existingEffect) {
    // Refresh duration if new is longer
    existingEffect.duration = Math.max(existingEffect.duration, duration);
  } else {
    unit.effects.push({ type: effectType, sourceId, duration });
  }
}

/**
 * Decrement all effect durations at end of unit's turn and remove expired effects
 */
function decrementEffects(unit) {
  unit.effects.forEach(effect => {
    effect.duration--;
  });
  unit.effects = unit.effects.filter(effect => effect.duration > 0);
}

/**
 * Remove all effects from a specific source (called when source dies)
 */
function removeEffectsFromSource(sourceId) {
  gameState.units.forEach(unit => {
    unit.effects = unit.effects.filter(e => e.sourceId !== sourceId);
  });
}

// ============================================================================
// COMBAT SYSTEM
// ============================================================================

/**
 * Check if a card is an attack card (deals damage)
 */
function isAttackCard(card) {
  return card.effects.damage > 0;
}

/**
 * Execute a card's effects
 * @param {Unit} attacker - The unit playing the card
 * @param {Unit} target - The target unit
 * @param {Object} card - The card being played
 * @returns {{damage: number, message: string, effects: string[]}}
 */
function executeCardEffects(attacker, target, card) {
  const result = {
    damage: 0,
    message: '',
    effects: []
  };

  const messages = [];

  // Calculate damage: card base damage + unit's bonus aura
  if (card.effects.damage) {
    const baseDamage = Math.max(0, card.effects.damage + (attacker.auras.bonus || 0));

    // Apply Weaken (25% reduction) or Cripple (50% reduction)
    // Cripple takes precedence if both are present
    let damageMultiplier = 1.0;
    if (hasEffect(attacker, 'cripple')) {
      damageMultiplier = 0.5;
    } else if (hasEffect(attacker, 'weaken')) {
      damageMultiplier = 0.75;
    }

    result.damage = Math.floor(baseDamage * damageMultiplier);
  }

  // Build effect tags for message
  const effects = [];

  // Apply taunt effect (from card or attacker's aura when dealing damage)
  const cardTaunt = card.effects.taunt || 0;
  const auraTaunt = (result.damage > 0 && attacker.auras.taunt) ? attacker.auras.taunt : 0;
  const totalTaunt = Math.max(cardTaunt, auraTaunt);

  if (totalTaunt > 0) {
    applyEffect(target, 'taunt', attacker.id, totalTaunt);
    result.effects.push(`Taunt (${totalTaunt})`);
    effects.push(`Taunt ${totalTaunt}`);
  }

  // Apply block to target (for self/ally targeting cards)
  if (card.effects.block) {
    target.block += card.effects.block;
    result.effects.push(`+${card.effects.block} Block`);
  }

  // Apply heal (includes caster's bonus aura)
  let healAmount = 0;
  if (card.effects.heal) {
    const baseHeal = card.effects.heal + (attacker.auras.bonus || 0);
    healAmount = Math.min(baseHeal, target.maxHp - target.hp);
    target.hp += healAmount;
    result.effects.push(`+${healAmount} HP`);
  }

  // Apply bonus aura
  if (card.effects.auraBonus) {
    target.auras.bonus += card.effects.auraBonus;
    result.effects.push(`+${card.effects.auraBonus} Bonus`);
  }

  // Build concise message
  const effectStr = effects.length > 0 ? ` [${effects.join(', ')}]` : '';

  if (result.damage > 0) {
    result.message = `${attacker.name} hits ${target.name} for ${result.damage}${effectStr}`;
  } else if (card.effects.block) {
    result.message = `${target.name} blocks ${card.effects.block}`;
  } else if (card.effects.heal) {
    result.message = `${target.name} heals ${healAmount}`;
  } else if (card.effects.auraBonus) {
    result.message = `${target.name} gains +${card.effects.auraBonus} bonus`;
  } else {
    result.message = `${attacker.name} plays ${card.name}`;
  }

  return result;
}

/**
 * Apply damage to a unit (auras reduce, then block absorbs)
 * @param {Unit} unit - The unit receiving damage
 * @param {number} damage - The raw damage amount
 * @param {'physical' | 'magic'} attackType - The type of damage (for aura reduction)
 * @returns {boolean} True if unit died
 */
function applyDamage(unit, damage, attackType) {
  // Auras reduce damage first
  if (attackType === 'physical' && unit.auras.armor > 0) {
    damage = Math.max(0, damage - unit.auras.armor);
  } else if (attackType === 'magic' && unit.auras.resistance > 0) {
    damage = Math.max(0, damage - unit.auras.resistance);
  }

  // Block absorbs remaining damage
  if (unit.block > 0) {
    if (unit.block >= damage) {
      unit.block -= damage;
      return false; // All damage blocked
    } else {
      damage -= unit.block;
      unit.block = 0;
    }
  }

  unit.hp -= damage;
  if (unit.hp <= 0) {
    unit.hp = 0;
    return true; // Unit died
  }
  return false;
}

/**
 * Reset block at start of unit's turn
 */
function resetBlock(unit) {
  unit.block = 0;
}

/**
 * Remove dead units from game
 * @returns {Unit[]} Array of units that were removed
 */
function removeDeadUnits() {
  const deadUnits = gameState.units.filter(u => u.hp <= 0);
  deadUnits.forEach(unit => {
    // Remove from turn order
    const deadIndex = gameState.turnOrder.indexOf(unit.id);
    gameState.turnOrder = gameState.turnOrder.filter(id => id !== unit.id);
    // Adjust current index if needed
    if (deadIndex !== -1 && deadIndex < gameState.currentUnitIndex) {
      gameState.currentUnitIndex--;
    }
    // Remove any effects this unit had applied
    removeEffectsFromSource(unit.id);
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
// TARGETING
// ============================================================================

/**
 * Get valid attack targets for a unit
 *
 * Rules:
 * - If taunted, must attack one of the taunters
 * - Ranged: can attack any enemy in any zone
 * - Melee: can attack enemies in same zone or adjacent zone
 */
function getValidAttackTargets(unit) {
  const activeTaunters = getActiveTaunters(unit);

  // If taunted, can only attack taunters
  if (activeTaunters.length > 0) {
    return { targets: activeTaunters, mustAttackTaunters: true };
  }

  const enemies = gameState.units.filter(u => u.team !== unit.team);

  if (isRangedUnit(unit)) {
    // Ranged can attack any enemy
    return { targets: enemies, mustAttackTaunters: false };
  } else {
    // Melee can attack same zone or adjacent zone
    const validZones = [unit.zone, ...getAdjacentZones(unit.zone)];
    const validEnemies = enemies.filter(e => validZones.includes(e.zone));
    return { targets: validEnemies, mustAttackTaunters: false };
  }
}

/**
 * Get all enemies
 */
function getAllEnemies(unit) {
  return gameState.units.filter(u => u.team !== unit.team);
}

/**
 * Get all allies (excluding self)
 */
function getAllAllies(unit) {
  return gameState.units.filter(u => u.team === unit.team && u.id !== unit.id);
}

/**
 * Get valid targets for a card based on its target type
 * @returns {{targets: Unit[], mustAttackTaunters: boolean}}
 */
function getValidCardTargets(unit, card) {
  const targetType = card.target || 'enemy';

  if (targetType === 'self') {
    return { targets: [unit], mustAttackTaunters: false };
  }

  if (targetType === 'ally') {
    return { targets: getAllAllies(unit), mustAttackTaunters: false };
  }

  if (targetType === 'any') {
    return { targets: gameState.units, mustAttackTaunters: false };
  }

  // Default: enemy targeting (respects taunt and range)
  return getValidAttackTargets(unit);
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
  if (unit.team === 'player') {
    return gameState.playerControl === 'human';
  } else {
    return gameState.opponentControl === 'human';
  }
}

/**
 * Check if unit can advance toward the enemy zone
 * Player: can advance if not at Zone B (zone < 2)
 * Opponent: can advance if not at Zone A (zone > 0)
 */
function canAdvance(unit) {
  if (unit.team === 'player') {
    return unit.zone < ZONES.B;
  } else {
    return unit.zone > ZONES.A;
  }
}

/**
 * Get the zone a unit will move to when advancing
 * Player: zone++ (A→X→B)
 * Opponent: zone-- (B→X→A)
 */
function getAdvanceTargetZone(unit) {
  if (unit.team === 'player') {
    return unit.zone + 1;
  } else {
    return unit.zone - 1;
  }
}

/**
 * Advance a unit toward the enemy zone and apply Weaken (1)
 * Player: A -> X -> B
 * Opponent: B -> X -> A
 */
function advanceUnit(unit) {
  if (canAdvance(unit)) {
    unit.zone = getAdvanceTargetZone(unit);
    // Apply Weaken (1) - self-inflicted, expires at end of turn
    applyEffect(unit, 'weaken', unit.id, 1);
  }
}
