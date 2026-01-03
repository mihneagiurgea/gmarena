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
 * @property {number} damage
 * @property {number} block - Current block (absorbs damage, resets each turn)
 * @property {boolean} hasAdvanced - True if melee unit has advanced to X
 * @property {Effect[]} effects - Active effects on this unit
 */

/** @type {Object} */
const gameState = {
  turn: 1,
  units: [],
  turnOrder: [],
  currentUnitIndex: 0,
  phase: 'play', // 'play', 'targeting', 'advancing'
  selectedCard: null,
  validTargets: [],
  playerControlsBoth: false,

  // Card state per team
  playerDeck: [],
  playerHand: [],
  playerGraveyard: [],
  opponentDeck: [],
  opponentHand: [],
  opponentGraveyard: []
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
    attackRange: stats.attackRange,
    attackType: stats.attackType,
    damage: stats.damage,
    block: 0,
    hasAdvanced: false,
    effects: []
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
 * Create initial units for the game
 * All Team A units start in zone A, all Team B units start in zone B
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
  const graveyard = team === 'player' ? gameState.playerGraveyard : gameState.opponentGraveyard;

  while (hand.length < handLimit) {
    // If deck is empty, shuffle graveyard into deck
    if (deck.length === 0) {
      if (graveyard.length === 0) {
        break; // No cards left anywhere
      }
      // Move all graveyard cards to deck and shuffle
      const reshuffled = shuffleArray([...graveyard]);
      if (team === 'player') {
        gameState.playerDeck.push(...reshuffled);
        gameState.playerGraveyard = [];
      } else {
        gameState.opponentDeck.push(...reshuffled);
        gameState.opponentGraveyard = [];
      }
    }

    // Draw a card
    const deckRef = team === 'player' ? gameState.playerDeck : gameState.opponentDeck;
    if (deckRef.length > 0) {
      const card = deckRef.pop();
      if (team === 'player') {
        gameState.playerHand.push(card);
      } else {
        gameState.opponentHand.push(card);
      }
    }
  }
}

/**
 * Play a card from hand to graveyard
 */
function playCard(team, cardIndex) {
  const hand = team === 'player' ? gameState.playerHand : gameState.opponentHand;
  const graveyard = team === 'player' ? gameState.playerGraveyard : gameState.opponentGraveyard;

  if (cardIndex < 0 || cardIndex >= hand.length) return null;

  const cardId = hand.splice(cardIndex, 1)[0];
  graveyard.push(cardId);

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
 * Execute a card's effects
 * @returns {{damage: number, message: string, effects: string[]}}
 */
function executeCardEffects(attacker, target, card) {
  const result = {
    damage: 0,
    message: '',
    effects: []
  };

  const messages = [];

  // Calculate damage
  if (card.effects.damage) {
    if (card.effects.damage === true) {
      // Use unit's damage stat
      result.damage = attacker.damage;
    } else {
      // Use fixed damage value
      result.damage = card.effects.damage;
    }
  }

  // Apply damage multiplier
  if (card.effects.damageMultiplier) {
    result.damage = Math.floor(attacker.damage * card.effects.damageMultiplier);
  }

  // Build message for damage
  if (result.damage > 0) {
    messages.push(`${attacker.name} uses ${card.name} on ${target.name} for ${result.damage} damage`);
  }

  // Apply taunt effect
  if (card.effects.taunt) {
    applyEffect(target, 'taunt', attacker.id, card.effects.taunt);
    result.effects.push(`Taunt (${card.effects.taunt})`);
    messages.push(`${target.name} is taunted for ${card.effects.taunt} turns`);
  }

  // Apply block to self
  if (card.effects.block) {
    attacker.block += card.effects.block;
    result.effects.push(`+${card.effects.block} Block`);
    messages.push(`${attacker.name} gains ${card.effects.block} Block`);
  }

  // Apply heal
  if (card.effects.heal) {
    const healAmount = Math.min(card.effects.heal, target.maxHp - target.hp);
    target.hp += healAmount;
    result.effects.push(`+${healAmount} HP`);
    messages.push(`${target.name} heals for ${healAmount} HP`);
  }

  result.message = messages.join('. ') + '!';

  return result;
}

/**
 * Apply damage to a unit (block absorbs first)
 * @returns {boolean} True if unit died
 */
function applyDamage(unit, damage) {
  // Block absorbs damage first
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
  return unit.team === 'player' || gameState.playerControlsBoth;
}

/**
 * Check if current unit needs to advance (melee, first turn, not in X)
 */
function needsToAdvance(unit) {
  return isMeleeUnit(unit) && !unit.hasAdvanced && unit.zone !== ZONES.X;
}

/**
 * Advance a melee unit to zone X
 */
function advanceUnit(unit) {
  unit.zone = ZONES.X;
  unit.hasAdvanced = true;
}
