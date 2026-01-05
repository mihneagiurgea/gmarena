/**
 * Game Simulator - Runs AI vs AI battles
 *
 * Usage: node simulator.js [numGames] [--verbose]
 *
 * Example:
 *   node simulator.js 100
 *   node simulator.js 50 --verbose
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// LOAD GAME FILES
// ============================================================================

function loadFile(filename) {
  return fs.readFileSync(path.join(__dirname, filename), 'utf8');
}

function loadGame() {
  const dataCode = loadFile('data.js');
  const engineCode = loadFile('engine.js');
  const aiCode = loadFile('ai.js');

  const wrappedCode = `
    ${dataCode}
    ${engineCode}
    ${aiCode}
    return {
      UNIT_DATA, CARD_DATA, DECK_DATA, TEAM_DATA, CARDS,
      createUnit, applyDamage, resetBlock, executeCardEffects,
      canPlayCard, getValidCardTargets, applyEffect, hasEffect,
      shuffleArray, createDeck, drawCards,
      getBestMove, setAIConfig, getAIConfig,
    };
  `;

  const fn = new Function(wrappedCode);
  return fn();
}

const game = loadGame();
const {
  UNIT_DATA, CARD_DATA, DECK_DATA, TEAM_DATA, CARDS,
  createUnit, applyDamage, executeCardEffects,
  canPlayCard, getValidCardTargets, applyEffect,
  shuffleArray, createDeck, drawCards,
  getBestMove, setAIConfig,
} = game;

// ============================================================================
// GAME STATE INITIALIZATION
// ============================================================================

function createUnitsFromTypes(types, team) {
  const typeCounts = {};
  types.forEach(type => {
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  const typeIndex = {};

  return types.map(type => {
    const count = typeCounts[type];
    typeIndex[type] = (typeIndex[type] || 0) + 1;
    const idx = typeIndex[type];

    const baseName = type.charAt(0).toUpperCase() + type.slice(1);
    const id = count > 1 ? `${type}${idx}` : type;
    const name = count > 1 ? `${baseName} #${idx}` : baseName;

    return createUnit(id, name, type, team);
  });
}

function createInitialState() {
  // Create units from TEAM_DATA
  const playerUnits = createUnitsFromTypes(TEAM_DATA.player, 'player');
  const opponentUnits = createUnitsFromTypes(TEAM_DATA.opponent, 'opponent');

  // Set zones
  playerUnits.forEach(u => u.zone = 0);    // Zone A
  opponentUnits.forEach(u => u.zone = 2);  // Zone B

  const allUnits = [...playerUnits, ...opponentUnits];

  // Randomize turn order
  const turnOrder = shuffleArray(allUnits.map(u => u.id));

  // Create decks
  const playerDeck = shuffleArray(createDeck('player'));
  const opponentDeck = shuffleArray(createDeck('opponent'));

  const state = {
    turn: 1,
    units: allUnits,
    turnOrder,
    currentUnitIndex: 0,
    phase: 'play',
    selectedCard: null,
    validTargets: [],
    playerControlsBoth: false,
    playerDeck,
    playerHand: [],
    opponentDeck,
    opponentHand: [],
  };

  // Draw initial hands
  drawCardsForTeam(state, 'player');
  drawCardsForTeam(state, 'opponent');

  return state;
}

function drawCardsForTeam(state, team) {
  const hand = team === 'player' ? state.playerHand : state.opponentHand;
  const deck = team === 'player' ? state.playerDeck : state.opponentDeck;
  const handLimit = 5;

  while (hand.length < handLimit && deck.length > 0) {
    hand.push(deck.pop());
  }
}

// ============================================================================
// GAME SIMULATION
// ============================================================================

function getCurrentUnit(state) {
  if (state.turnOrder.length === 0) return null;
  const unitId = state.turnOrder[state.currentUnitIndex];
  return state.units.find(u => u.id === unitId) || null;
}

function checkGameOver(state) {
  const playerAlive = state.units.some(u => u.team === 'player');
  const opponentAlive = state.units.some(u => u.team !== 'player');

  if (!playerAlive) return 'defeat';
  if (!opponentAlive) return 'victory';
  return 'ongoing';
}

function removeDeadUnits(state) {
  const deadUnits = state.units.filter(u => u.hp <= 0);
  deadUnits.forEach(unit => {
    const deadIndex = state.turnOrder.indexOf(unit.id);
    state.turnOrder = state.turnOrder.filter(id => id !== unit.id);
    if (deadIndex !== -1 && deadIndex < state.currentUnitIndex) {
      state.currentUnitIndex--;
    }
    // Remove effects from this source
    state.units.forEach(u => {
      u.effects = u.effects.filter(e => e.sourceId !== unit.id);
    });
  });
  state.units = state.units.filter(u => u.hp > 0);
  return deadUnits;
}

function advanceTurn(state) {
  const currentUnit = getCurrentUnit(state);
  if (currentUnit) {
    // Decrement effects
    currentUnit.effects.forEach(e => e.duration--);
    currentUnit.effects = currentUnit.effects.filter(e => e.duration > 0);
    // Reset block
    currentUnit.block = 0;
  }

  // Move to next unit
  state.currentUnitIndex = (state.currentUnitIndex + 1) % state.turnOrder.length;
  state.turn++;

  // Draw cards for next unit's team
  const nextUnit = getCurrentUnit(state);
  if (nextUnit) {
    drawCardsForTeam(state, nextUnit.team);
  }
}

function playCard(state, team, cardIndex) {
  const hand = team === 'player' ? state.playerHand : state.opponentHand;
  const deck = team === 'player' ? state.playerDeck : state.opponentDeck;

  if (cardIndex < 0 || cardIndex >= hand.length) return null;

  const cardId = hand.splice(cardIndex, 1)[0];
  // Shuffle back into deck
  const insertIndex = Math.floor(Math.random() * (deck.length + 1));
  deck.splice(insertIndex, 0, cardId);

  return cardId;
}

function simulateGame(verbose = false) {
  const state = createInitialState();
  const maxTurns = 200; // Prevent infinite loops

  const gameFns = {
    CARDS,
    canPlayCard,
    getValidCardTargets: (unit, card) => {
      // Simplified getValidCardTargets for simulation
      const targetType = card.target || 'enemy';

      if (targetType === 'self') {
        return { targets: [unit], mustAttackTaunters: false };
      }

      if (targetType === 'ally') {
        const allies = state.units.filter(u => u.team === unit.team && u.id !== unit.id);
        return { targets: allies, mustAttackTaunters: false };
      }

      if (targetType === 'enemy') {
        // Check taunt
        const tauntEffects = unit.effects.filter(e => e.type === 'taunt');
        if (tauntEffects.length > 0) {
          const taunters = tauntEffects
            .map(e => state.units.find(u => u.id === e.sourceId))
            .filter(u => u && u.hp > 0);
          if (taunters.length > 0) {
            return { targets: taunters, mustAttackTaunters: true };
          }
        }

        const enemies = state.units.filter(u => u.team !== unit.team);
        // For melee, check zones (simplified - all in zone 1 after advance)
        if (unit.attackRange === 'melee') {
          const validZones = [unit.zone, unit.zone - 1, unit.zone + 1].filter(z => z >= 0 && z <= 2);
          return { targets: enemies.filter(e => validZones.includes(e.zone)), mustAttackTaunters: false };
        }
        return { targets: enemies, mustAttackTaunters: false };
      }

      return { targets: state.units, mustAttackTaunters: false };
    },
    executeCardEffects,
    applyDamage,
    applyEffect,
  };

  while (state.turn < maxTurns) {
    const currentUnit = getCurrentUnit(state);
    if (!currentUnit) break;

    const result = checkGameOver(state);
    if (result !== 'ongoing') {
      if (verbose) {
        console.log(`Game over after ${state.turn} turns: ${result}`);
      }
      return result;
    }

    // Get AI move
    const move = getBestMove(state, gameFns);

    if (verbose) {
      console.log(`Turn ${state.turn}: ${currentUnit.name} (${currentUnit.team})`);
    }

    if (move.type === 'skip') {
      if (verbose) console.log(`  -> Skips turn`);
      advanceTurn(state);
      continue;
    }

    if (move.type === 'advance') {
      const nextZone = currentUnit.team === 'player' ? currentUnit.zone + 1 : currentUnit.zone - 1;
      if (verbose) console.log(`  -> Advances to Zone ${['A', 'X', 'B'][nextZone]} and is Weakened`);
      currentUnit.zone = nextZone;
      // Apply Weaken (1)
      applyEffect(currentUnit, 'weaken', currentUnit.id, 1);
      advanceTurn(state);
      continue;
    }

    // Handle advanceAndPlay: advance first, then play card
    if (move.type === 'advanceAndPlay') {
      const nextZone = currentUnit.team === 'player' ? currentUnit.zone + 1 : currentUnit.zone - 1;
      if (verbose) console.log(`  -> Advances to Zone ${['A', 'X', 'B'][nextZone]} and is Weakened`);
      currentUnit.zone = nextZone;
      applyEffect(currentUnit, 'weaken', currentUnit.id, 1);
      // Fall through to card execution below
    }

    // Execute move (play or advanceAndPlay)
    const card = CARDS[move.cardId];
    const target = state.units.find(u => u.id === move.targetId);

    if (!card || !target) {
      advanceTurn(state);
      continue;
    }

    // Find and play card
    const hand = currentUnit.team === 'player' ? state.playerHand : state.opponentHand;
    const cardIndex = hand.indexOf(move.cardId);
    if (cardIndex === -1) {
      advanceTurn(state);
      continue;
    }

    playCard(state, currentUnit.team, cardIndex);

    // Execute effects
    const effectResult = executeCardEffects(currentUnit, target, card);

    if (verbose) {
      console.log(`  -> ${card.name} on ${target.name}: ${effectResult.message}`);
    }

    // Apply damage
    if (effectResult.damage > 0) {
      const died = applyDamage(target, effectResult.damage, currentUnit.attackType);
      if (died) {
        const deadUnits = removeDeadUnits(state);
        if (verbose) {
          deadUnits.forEach(u => console.log(`  -> ${u.name} has fallen!`));
        }
      }
    }

    // Check game over after damage
    const afterResult = checkGameOver(state);
    if (afterResult !== 'ongoing') {
      if (verbose) {
        console.log(`Game over after ${state.turn} turns: ${afterResult}`);
      }
      return afterResult;
    }

    advanceTurn(state);
  }

  // If we hit max turns, count remaining HP
  const playerHp = state.units.filter(u => u.team === 'player').reduce((sum, u) => sum + u.hp, 0);
  const opponentHp = state.units.filter(u => u.team !== 'player').reduce((sum, u) => sum + u.hp, 0);

  if (verbose) {
    console.log(`Game timed out at ${maxTurns} turns. Player HP: ${playerHp}, Opponent HP: ${opponentHp}`);
  }

  return playerHp > opponentHp ? 'victory' : 'defeat';
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const numGames = parseInt(args.find(a => !a.startsWith('-')) || '100', 10);
  const verbose = args.includes('--verbose') || args.includes('-v');

  console.log('='.repeat(60));
  console.log('GAME SIMULATOR - AI vs AI');
  console.log('='.repeat(60));
  console.log(`Running ${numGames} games...`);
  console.log();

  // Optionally reduce AI depth for faster simulation
  if (!verbose) {
    setAIConfig({ maxDepth: 2 }); // Faster for bulk simulation
  }

  const results = { victory: 0, defeat: 0 };
  const startTime = Date.now();

  for (let i = 0; i < numGames; i++) {
    if (verbose) {
      console.log(`\n--- Game ${i + 1} ---`);
    } else if ((i + 1) % 10 === 0) {
      process.stdout.write(`\rProgress: ${i + 1}/${numGames}`);
    }

    const result = simulateGame(verbose);
    results[result]++;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n');
  console.log('='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));
  console.log(`Games played:    ${numGames}`);
  console.log(`Time elapsed:    ${elapsed}s`);
  console.log(`Avg per game:    ${(elapsed / numGames * 1000).toFixed(0)}ms`);
  console.log();
  console.log(`Player wins:     ${results.victory} (${(results.victory / numGames * 100).toFixed(1)}%)`);
  console.log(`Opponent wins:   ${results.defeat} (${(results.defeat / numGames * 100).toFixed(1)}%)`);
  console.log('='.repeat(60));
}

main();
