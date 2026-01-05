/**
 * AI Engine - Minimax with Alpha-Beta Pruning + Heuristic Evaluation
 *
 * This AI is designed to work with any cards, units, or game changes.
 * It evaluates game states based on effects, not specific card knowledge.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const AI_CONFIG = {
  // Search depth (higher = stronger but slower)
  maxDepth: 3,

  // Evaluation weights (tune these for different playstyles)
  weights: {
    // HP-related
    allyHp: 1.0,
    enemyHp: -1.0,
    allyDead: -100,
    enemyDead: 100,

    // Damage potential
    allyDamageBonus: 2.0,
    enemyDamageBonus: -2.0,

    // Defensive stats
    allyBlock: 0.5,
    allyArmor: 3.0,
    allyResistance: 3.0,

    // Effects
    enemyTaunted: 5.0,      // Good if enemy is taunted to us
    allyTaunted: -5.0,      // Bad if our unit is taunted

    // Focus fire bonus (prefer finishing off low HP enemies)
    focusFireBonus: 10.0,

    // Card advantage (having more playable options)
    cardInHand: 0.5,

    // Zone positioning (critical for melee units)
    meleeCanAttack: 8.0,     // Bonus when melee unit has enemies in range
    meleeNoTargets: -15.0,   // Penalty when melee unit has no valid targets
  },

  // Debug mode - logs evaluation details
  debug: false,
};

// ============================================================================
// GAME STATE CLONING
// ============================================================================

/**
 * Deep clone the game state for simulation
 */
function cloneGameState(state) {
  return {
    turn: state.turn,
    units: state.units.map(u => ({
      ...u,
      effects: u.effects.map(e => ({ ...e })),
      auras: { ...u.auras },
    })),
    turnOrder: [...state.turnOrder],
    currentUnitIndex: state.currentUnitIndex,
    phase: state.phase,
    selectedCard: state.selectedCard,
    validTargets: [...state.validTargets],
    playerControlsBoth: state.playerControlsBoth,
    playerDeck: [...state.playerDeck],
    playerHand: [...state.playerHand],
    opponentDeck: [...state.opponentDeck],
    opponentHand: [...state.opponentHand],
  };
}

// ============================================================================
// MOVE GENERATION
// ============================================================================

/**
 * @typedef {Object} Move
 * @property {'play' | 'skip' | 'advance' | 'advanceAndPlay'} type
 * @property {string} [cardId] - Card to play
 * @property {number} [cardIndex] - Index in hand
 * @property {string} [targetId] - Target unit ID
 */

/**
 * Check if unit can advance toward the enemy zone
 * Player: can advance if not at Zone B (zone < 2)
 * Opponent: can advance if not at Zone A (zone > 0)
 */
function aiCanAdvance(unit) {
  if (unit.team === 'player') {
    return unit.zone < 2; // Zone B = 2
  } else {
    return unit.zone > 0; // Zone A = 0
  }
}

/**
 * Get the zone a unit will move to when advancing
 */
function aiGetAdvanceTargetZone(unit) {
  if (unit.team === 'player') {
    return unit.zone + 1;
  } else {
    return unit.zone - 1;
  }
}

/**
 * Generate all possible moves for the current unit
 * @param {Object} state - Game state
 * @param {Object} currentUnit - Current unit taking turn
 * @param {Object} CARDS - Card definitions
 * @returns {Move[]}
 */
function generateMoves(state, currentUnit, CARDS, canPlayCard, getValidCardTargets) {
  const moves = [];
  const hand = currentUnit.team === 'player' ? state.playerHand : state.opponentHand;

  // Get unique cards in hand (we only need to consider each card type once)
  const seenCards = new Set();

  for (let i = 0; i < hand.length; i++) {
    const cardId = hand[i];
    if (seenCards.has(cardId)) continue;
    seenCards.add(cardId);

    const card = CARDS[cardId];
    if (!card || !canPlayCard(currentUnit, card)) continue;

    const { targets } = getValidCardTargets(currentUnit, card);
    for (const target of targets) {
      moves.push({
        type: 'play',
        cardId,
        cardIndex: i,
        targetId: target.id,
      });
    }
  }

  // Add advance move and "advance + card" compound moves if unit can advance
  if (aiCanAdvance(currentUnit)) {
    // Simple advance (just move, no card play)
    moves.push({ type: 'advance' });

    // Generate compound moves: advance first, then play a card
    // This simulates the real game where advance doesn't end turn
    const advancedUnit = { ...currentUnit, zone: aiGetAdvanceTargetZone(currentUnit) };
    const seenCardsAfterAdvance = new Set();

    for (let i = 0; i < hand.length; i++) {
      const cardId = hand[i];
      if (seenCardsAfterAdvance.has(cardId)) continue;
      seenCardsAfterAdvance.add(cardId);

      const card = CARDS[cardId];
      if (!card || !canPlayCard(advancedUnit, card)) continue;

      // Get targets from the advanced position
      const { targets } = getValidCardTargets(advancedUnit, card);
      for (const target of targets) {
        moves.push({
          type: 'advanceAndPlay',
          cardId,
          cardIndex: i,
          targetId: target.id,
        });
      }
    }
  }

  // Always can skip turn
  moves.push({ type: 'skip' });

  return moves;
}

// ============================================================================
// MOVE APPLICATION
// ============================================================================

/**
 * Advance a unit toward the enemy zone and apply Weaken (1)
 */
function aiAdvanceUnit(unit, applyEffect) {
  if (aiCanAdvance(unit)) {
    unit.zone = aiGetAdvanceTargetZone(unit);
    // Apply Weaken (1) - self-inflicted
    applyEffect(unit, 'weaken', unit.id, 1);
  }
}

/**
 * Apply a move to a cloned game state
 * Returns the new state after the move
 */
function applyMove(state, move, CARDS, executeCardEffects, applyDamage, applyEffect) {
  const currentUnit = state.units.find(
    u => u.id === state.turnOrder[state.currentUnitIndex]
  );

  if (!currentUnit) return state;

  if (move.type === 'skip') {
    // Just advance turn
    advanceTurn(state);
    return state;
  }

  if (move.type === 'advance') {
    // Advance to next zone and apply Weaken, then end turn
    aiAdvanceUnit(currentUnit, applyEffect);
    advanceTurn(state);
    return state;
  }

  if (move.type === 'advanceAndPlay') {
    // Advance first (applies Weaken), then play a card
    aiAdvanceUnit(currentUnit, applyEffect);
    // Fall through to play card logic below
  }

  // Play card
  const card = CARDS[move.cardId];
  const target = state.units.find(u => u.id === move.targetId);

  if (!card || !target) {
    advanceTurn(state);
    return state;
  }

  // Execute card effects
  const result = executeCardEffects(currentUnit, target, card);

  // Apply damage if any
  if (result.damage > 0) {
    const died = applyDamage(target, result.damage, currentUnit.attackType);
    if (died) {
      // Remove dead unit
      state.units = state.units.filter(u => u.id !== target.id);
      state.turnOrder = state.turnOrder.filter(id => id !== target.id);
      // Adjust current index if needed
      const deadIndex = state.turnOrder.indexOf(target.id);
      if (deadIndex !== -1 && deadIndex < state.currentUnitIndex) {
        state.currentUnitIndex--;
      }
    }
  }

  // Remove card from hand and shuffle back to deck
  const hand = currentUnit.team === 'player' ? state.playerHand : state.opponentHand;
  const deck = currentUnit.team === 'player' ? state.playerDeck : state.opponentDeck;
  const cardIndex = hand.indexOf(move.cardId);
  if (cardIndex !== -1) {
    hand.splice(cardIndex, 1);
    deck.push(move.cardId);
  }

  advanceTurn(state);
  return state;
}

/**
 * Advance to next turn
 */
function advanceTurn(state) {
  // Decrement effects on current unit
  const currentUnit = state.units.find(
    u => u.id === state.turnOrder[state.currentUnitIndex]
  );
  if (currentUnit) {
    currentUnit.effects.forEach(e => e.duration--);
    currentUnit.effects = currentUnit.effects.filter(e => e.duration > 0);
    currentUnit.block = 0; // Reset block
  }

  // Move to next unit
  state.currentUnitIndex = (state.currentUnitIndex + 1) % state.turnOrder.length;
  state.turn++;

  // Draw cards for next unit's team
  const nextUnit = state.units.find(
    u => u.id === state.turnOrder[state.currentUnitIndex]
  );
  if (nextUnit) {
    drawCardsForTeam(state, nextUnit.team);
  }
}

/**
 * Draw cards up to hand limit
 */
function drawCardsForTeam(state, team) {
  const hand = team === 'player' ? state.playerHand : state.opponentHand;
  const deck = team === 'player' ? state.playerDeck : state.opponentDeck;
  const handLimit = 5;

  while (hand.length < handLimit && deck.length > 0) {
    const idx = Math.floor(Math.random() * deck.length);
    hand.push(deck.splice(idx, 1)[0]);
  }
}

// ============================================================================
// EVALUATION FUNCTION
// ============================================================================

/**
 * Evaluate a game state from the perspective of 'team'
 * Higher score = better for that team
 */
function evaluateState(state, team) {
  const w = AI_CONFIG.weights;
  let score = 0;

  const allies = state.units.filter(u => u.team === team);
  const enemies = state.units.filter(u => u.team !== team);

  // Terminal states
  if (allies.length === 0) return -10000; // We lost
  if (enemies.length === 0) return 10000;  // We won

  // HP evaluation
  for (const ally of allies) {
    score += ally.hp * w.allyHp;
    score += (ally.auras.bonus || 0) * w.allyDamageBonus;
    score += ally.block * w.allyBlock;
    score += (ally.auras.armor || 0) * w.allyArmor;
    score += (ally.auras.resistance || 0) * w.allyResistance;

    // Check if ally is taunted
    if (ally.effects.some(e => e.type === 'taunt')) {
      score += w.allyTaunted;
    }

    // Zone positioning for melee units
    if (ally.attackRange === 'melee') {
      const validZones = [ally.zone, ally.zone - 1, ally.zone + 1].filter(z => z >= 0 && z <= 2);
      const hasTargetsInRange = enemies.some(e => validZones.includes(e.zone));
      if (hasTargetsInRange) {
        score += w.meleeCanAttack;
      } else {
        score += w.meleeNoTargets;
      }
    }
  }

  for (const enemy of enemies) {
    score += enemy.hp * w.enemyHp;
    score += (enemy.auras.bonus || 0) * w.enemyDamageBonus;

    // Check if enemy is taunted to one of our units
    const tauntedToUs = enemy.effects.some(e =>
      e.type === 'taunt' && allies.some(a => a.id === e.sourceId)
    );
    if (tauntedToUs) {
      score += w.enemyTaunted;
    }

    // Focus fire bonus - reward having enemies at low HP
    if (enemy.hp < enemy.maxHp * 0.3) {
      score += w.focusFireBonus * (1 - enemy.hp / enemy.maxHp);
    }

    // Bonus when enemy melee units can't reach us (they're stuck)
    if (enemy.attackRange === 'melee') {
      const enemyValidZones = [enemy.zone, enemy.zone - 1, enemy.zone + 1].filter(z => z >= 0 && z <= 2);
      const enemyHasTargets = allies.some(a => enemyValidZones.includes(a.zone));
      if (!enemyHasTargets) {
        score += w.meleeCanAttack; // Enemy is stuck, good for us
      }
    }
  }

  // Card advantage
  const hand = team === 'player' ? state.playerHand : state.opponentHand;
  score += hand.length * w.cardInHand;

  return score;
}

// ============================================================================
// MINIMAX WITH ALPHA-BETA PRUNING
// ============================================================================

/**
 * Minimax with alpha-beta pruning
 * @param {Object} state - Current game state
 * @param {number} depth - Remaining search depth
 * @param {number} alpha - Best score for maximizer
 * @param {number} beta - Best score for minimizer
 * @param {boolean} isMaximizing - True if maximizing player's turn
 * @param {string} aiTeam - The team the AI is playing for
 * @param {Object} gameFns - Game functions (CARDS, canPlayCard, etc.)
 * @returns {{score: number, move: Move|null}}
 */
function minimax(state, depth, alpha, beta, isMaximizing, aiTeam, gameFns) {
  const { CARDS, canPlayCard, getValidCardTargets, executeCardEffects, applyDamage, applyEffect } = gameFns;

  // Terminal conditions
  const allies = state.units.filter(u => u.team === aiTeam);
  const enemies = state.units.filter(u => u.team !== aiTeam);

  if (allies.length === 0) return { score: -10000 + (AI_CONFIG.maxDepth - depth), move: null };
  if (enemies.length === 0) return { score: 10000 - (AI_CONFIG.maxDepth - depth), move: null };
  if (depth === 0) return { score: evaluateState(state, aiTeam), move: null };

  const currentUnit = state.units.find(
    u => u.id === state.turnOrder[state.currentUnitIndex]
  );

  if (!currentUnit) return { score: evaluateState(state, aiTeam), move: null };

  const isAiTurn = currentUnit.team === aiTeam;
  const moves = generateMoves(state, currentUnit, CARDS, canPlayCard, getValidCardTargets);

  if (moves.length === 0) {
    return { score: evaluateState(state, aiTeam), move: null };
  }

  let bestMove = moves[0];

  if (isMaximizing) {
    let maxScore = -Infinity;

    for (const move of moves) {
      const newState = cloneGameState(state);
      applyMove(newState, move, CARDS, executeCardEffects, applyDamage, applyEffect);

      const { score } = minimax(
        newState, depth - 1, alpha, beta,
        !isAiTurn, // Next turn might be opponent
        aiTeam, gameFns
      );

      if (score > maxScore) {
        maxScore = score;
        bestMove = move;
      }

      alpha = Math.max(alpha, score);
      if (beta <= alpha) break; // Prune
    }

    return { score: maxScore, move: bestMove };
  } else {
    let minScore = Infinity;

    for (const move of moves) {
      const newState = cloneGameState(state);
      applyMove(newState, move, CARDS, executeCardEffects, applyDamage, applyEffect);

      const { score } = minimax(
        newState, depth - 1, alpha, beta,
        isAiTurn, // Next turn might be AI again
        aiTeam, gameFns
      );

      if (score < minScore) {
        minScore = score;
        bestMove = move;
      }

      beta = Math.min(beta, score);
      if (beta <= alpha) break; // Prune
    }

    return { score: minScore, move: bestMove };
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get the best move for the current AI unit
 * @param {Object} gameState - Current game state
 * @param {Object} gameFns - Object containing game functions:
 *   - CARDS: Card definitions
 *   - canPlayCard: Function to check if unit can play card
 *   - getValidCardTargets: Function to get valid targets
 *   - executeCardEffects: Function to execute card effects
 *   - applyDamage: Function to apply damage
 *   - applyEffect: Function to apply effects
 * @returns {Move} The best move to make
 */
function getBestMove(gameState, gameFns) {
  const currentUnit = gameState.units.find(
    u => u.id === gameState.turnOrder[gameState.currentUnitIndex]
  );

  if (!currentUnit) return { type: 'skip' };

  const state = cloneGameState(gameState);
  const aiTeam = currentUnit.team;

  const startTime = Date.now();

  const { score, move } = minimax(
    state,
    AI_CONFIG.maxDepth,
    -Infinity,
    Infinity,
    true, // AI is maximizing
    aiTeam,
    gameFns
  );

  if (AI_CONFIG.debug) {
    console.log(`AI (${aiTeam}) evaluated in ${Date.now() - startTime}ms, score: ${score}`, move);
  }

  return move || { type: 'skip' };
}

/**
 * Set AI configuration
 */
function setAIConfig(config) {
  Object.assign(AI_CONFIG, config);
}

/**
 * Get current AI configuration
 */
function getAIConfig() {
  return { ...AI_CONFIG };
}
