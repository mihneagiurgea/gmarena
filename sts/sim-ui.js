/**
 * Simulation UI - Browser-based AI vs AI simulation
 */

// ============================================================================
// GAME STATE INITIALIZATION (adapted from simulator.js)
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

function createSimInitialState() {
  const playerUnits = createUnitsFromTypes(TEAM_DATA.player, 'player');
  const opponentUnits = createUnitsFromTypes(TEAM_DATA.opponent, 'opponent');

  playerUnits.forEach(u => u.zone = 0);    // Zone A
  opponentUnits.forEach(u => u.zone = 3);  // Zone B

  const allUnits = [...playerUnits, ...opponentUnits];
  const turnOrder = shuffleArray(allUnits.map(u => u.id));

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
    playerControl: 'ai',
    opponentControl: 'ai',
    playerDeck,
    playerHand: [],
    opponentDeck,
    opponentHand: [],
  };

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

function getCurrentSimUnit(state) {
  if (state.turnOrder.length === 0) return null;
  const unitId = state.turnOrder[state.currentUnitIndex];
  return state.units.find(u => u.id === unitId) || null;
}

function checkSimGameOver(state) {
  const playerAlive = state.units.some(u => u.team === 'player');
  const opponentAlive = state.units.some(u => u.team !== 'player');

  if (!playerAlive) return 'defeat';
  if (!opponentAlive) return 'victory';
  return 'ongoing';
}

function removeSimDeadUnits(state) {
  const deadUnits = state.units.filter(u => u.hp <= 0);
  deadUnits.forEach(unit => {
    const deadIndex = state.turnOrder.indexOf(unit.id);
    state.turnOrder = state.turnOrder.filter(id => id !== unit.id);
    if (deadIndex !== -1 && deadIndex < state.currentUnitIndex) {
      state.currentUnitIndex--;
    }
    state.units.forEach(u => {
      u.effects = u.effects.filter(e => e.sourceId !== unit.id);
    });
  });
  state.units = state.units.filter(u => u.hp > 0);
  return deadUnits;
}

function advanceSimTurn(state) {
  const currentUnit = getCurrentSimUnit(state);
  if (currentUnit) {
    currentUnit.effects.forEach(e => e.duration--);
    currentUnit.effects = currentUnit.effects.filter(e => e.duration > 0);
    currentUnit.block = 0;
  }

  state.currentUnitIndex = (state.currentUnitIndex + 1) % state.turnOrder.length;
  state.turn++;

  const nextUnit = getCurrentSimUnit(state);
  if (nextUnit) {
    drawCardsForTeam(state, nextUnit.team);
  }
}

function playSimCard(state, team, cardIndex) {
  const hand = team === 'player' ? state.playerHand : state.opponentHand;
  const deck = team === 'player' ? state.playerDeck : state.opponentDeck;

  if (cardIndex < 0 || cardIndex >= hand.length) return null;

  const cardId = hand.splice(cardIndex, 1)[0];
  const insertIndex = getRNG().randomInt(deck.length + 1);
  deck.splice(insertIndex, 0, cardId);

  return cardId;
}

/**
 * Run a single simulated game with the given seed
 * @param {number} seed - The RNG seed
 * @returns {{ result: string, turns: number, survivors: number, maxUnits: number, totalHp: number, maxHp: number }} Game result
 */
function runSimulatedGame(seed) {
  initRNG(seed);

  const state = createSimInitialState();
  const maxTurns = 200;

  // Track initial team stats
  const initialStats = {
    player: {
      units: state.units.filter(u => u.team === 'player').length,
      maxHp: state.units.filter(u => u.team === 'player').reduce((sum, u) => sum + u.maxHp, 0)
    },
    opponent: {
      units: state.units.filter(u => u.team === 'opponent').length,
      maxHp: state.units.filter(u => u.team === 'opponent').reduce((sum, u) => sum + u.maxHp, 0)
    }
  };

  // Helper to get winner stats
  function getWinnerStats(result) {
    const winnerTeam = result === 'victory' ? 'player' : 'opponent';
    const survivors = state.units.filter(u => u.team === winnerTeam);
    return {
      survivors: survivors.length,
      maxUnits: initialStats[winnerTeam].units,
      totalHp: survivors.reduce((sum, u) => sum + u.hp, 0),
      maxHp: initialStats[winnerTeam].maxHp
    };
  }

  const gameFns = {
    CARDS,
    canPlayCard,
    getValidCardTargets: (unit, card) => {
      const targetType = card.target || 'enemy';

      if (targetType === 'self') {
        return { targets: [unit], mustAttackTaunters: false };
      }

      if (targetType === 'ally') {
        const allies = state.units.filter(u => u.team === unit.team && u.id !== unit.id);
        return { targets: allies, mustAttackTaunters: false };
      }

      if (targetType === 'enemy') {
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
        if (unit.attackRange === 'melee') {
          return { targets: enemies.filter(e => e.zone === unit.zone), mustAttackTaunters: false };
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
    const currentUnit = getCurrentSimUnit(state);
    if (!currentUnit) break;

    const result = checkSimGameOver(state);
    if (result !== 'ongoing') {
      const stats = getWinnerStats(result);
      return { result, turns: state.turn, ...stats };
    }

    const move = getBestMove(state, gameFns);

    if (move.type === 'skip') {
      advanceSimTurn(state);
      continue;
    }

    if (move.type === 'move') {
      currentUnit.zone = move.targetZone;
      applyEffect(currentUnit, 'fatigued', currentUnit.id, 1);
      advanceSimTurn(state);
      continue;
    }

    if (move.type === 'moveAndPlay') {
      currentUnit.zone = move.targetZone;
      applyEffect(currentUnit, 'fatigued', currentUnit.id, 1);
    }

    const card = CARDS[move.cardId];
    const target = state.units.find(u => u.id === move.targetId);

    if (!card || !target) {
      advanceSimTurn(state);
      continue;
    }

    const hand = currentUnit.team === 'player' ? state.playerHand : state.opponentHand;
    const cardIndex = hand.indexOf(move.cardId);
    if (cardIndex === -1) {
      advanceSimTurn(state);
      continue;
    }

    playSimCard(state, currentUnit.team, cardIndex);
    const effectResult = executeCardEffects(currentUnit, target, card);

    if (effectResult.damage > 0) {
      const died = applyDamage(target, effectResult.damage, currentUnit.attackType);
      if (died) {
        removeSimDeadUnits(state);
      }
    }

    const afterResult = checkSimGameOver(state);
    if (afterResult !== 'ongoing') {
      const stats = getWinnerStats(afterResult);
      return { result: afterResult, turns: state.turn, ...stats };
    }

    advanceSimTurn(state);
  }

  // Timeout - determine winner by remaining HP
  const playerHp = state.units.filter(u => u.team === 'player').reduce((sum, u) => sum + u.hp, 0);
  const opponentHp = state.units.filter(u => u.team !== 'player').reduce((sum, u) => sum + u.hp, 0);
  const result = playerHp > opponentHp ? 'victory' : 'defeat';
  const stats = getWinnerStats(result);

  return {
    result,
    turns: maxTurns,
    ...stats
  };
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================

let isRunning = false;

function updateProgress(current, total) {
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const percent = Math.round((current / total) * 100);

  progressBar.style.width = `${percent}%`;
  progressText.textContent = `${current} / ${total}`;
}

function displayResults(results, numGames) {
  const resultsSection = document.getElementById('results-section');
  const aggregateResults = document.getElementById('aggregate-results');
  const playerWinsList = document.getElementById('player-wins-list');
  const opponentWinsList = document.getElementById('opponent-wins-list');

  // Calculate stats
  const playerWins = results.player.length;
  const opponentWins = results.opponent.length;
  const playerPercent = ((playerWins / numGames) * 100).toFixed(1);
  const opponentPercent = ((opponentWins / numGames) * 100).toFixed(1);
  const avgTurns = (results.totalTurns / numGames).toFixed(1);

  // Display aggregate results
  aggregateResults.innerHTML = `
    <div class="stat-row">
      <span class="stat-label">Games played:</span>
      <span class="stat-value">${numGames}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Player wins:</span>
      <span class="stat-value player-color">${playerWins} (${playerPercent}%)</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Opponent wins:</span>
      <span class="stat-value opponent-color">${opponentWins} (${opponentPercent}%)</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Avg turns/game:</span>
      <span class="stat-value">${avgTurns}</span>
    </div>
  `;

  // Display first 5 player wins
  playerWinsList.innerHTML = '';
  const playerGames = results.player.slice(0, 5);
  if (playerGames.length === 0) {
    playerWinsList.innerHTML = '<div class="no-wins">No wins</div>';
  } else {
    playerGames.forEach(game => {
      const item = document.createElement('div');
      item.className = 'seed-item';
      item.innerHTML = `
        <span class="seed-number">Game #${game.gameNum}</span>
        <span class="game-summary">${game.survivors}/${game.maxUnits} units, ${game.totalHp}/${game.maxHp} HP</span>
        <a href="index.html?seed=${game.seed}&player=ai&opponent=ai" class="play-link">Play</a>
      `;
      playerWinsList.appendChild(item);
    });
  }

  // Display first 5 opponent wins
  opponentWinsList.innerHTML = '';
  const opponentGames = results.opponent.slice(0, 5);
  if (opponentGames.length === 0) {
    opponentWinsList.innerHTML = '<div class="no-wins">No wins</div>';
  } else {
    opponentGames.forEach(game => {
      const item = document.createElement('div');
      item.className = 'seed-item';
      item.innerHTML = `
        <span class="seed-number">Game #${game.gameNum}</span>
        <span class="game-summary">${game.survivors}/${game.maxUnits} units, ${game.totalHp}/${game.maxHp} HP</span>
        <a href="index.html?seed=${game.seed}&player=ai&opponent=ai" class="play-link">Play</a>
      `;
      opponentWinsList.appendChild(item);
    });
  }

  resultsSection.classList.remove('hidden');
}

async function runSimulation() {
  if (isRunning) return;

  const numGamesInput = document.getElementById('num-games');
  const numGames = parseInt(numGamesInput.value, 10) || 50;

  if (numGames < 1 || numGames > 1000) {
    alert('Please enter a number between 1 and 1000');
    return;
  }

  isRunning = true;
  const runButton = document.getElementById('run-button');
  runButton.disabled = true;
  runButton.textContent = 'Running...';

  const progressSection = document.getElementById('progress-section');
  const resultsSection = document.getElementById('results-section');

  progressSection.classList.remove('hidden');
  resultsSection.classList.add('hidden');

  // Set AI config for faster simulation
  setAIConfig({ maxDepth: 2 });

  // Seed offset: K = timestamp % 10000, seeds run from K+1 to K+N
  const seedOffset = Date.now() % 10000;

  const results = {
    player: [],
    opponent: [],
    totalTurns: 0
  };

  // Run simulations with yielding to UI
  for (let gameNum = 1; gameNum <= numGames; gameNum++) {
    const seed = seedOffset + gameNum;
    const gameResult = runSimulatedGame(seed);

    const gameInfo = {
      gameNum,
      seed,
      survivors: gameResult.survivors,
      maxUnits: gameResult.maxUnits,
      totalHp: gameResult.totalHp,
      maxHp: gameResult.maxHp
    };

    if (gameResult.result === 'victory') {
      results.player.push(gameInfo);
    } else {
      results.opponent.push(gameInfo);
    }
    results.totalTurns += gameResult.turns;

    // Update progress every game (or batch for large runs)
    if (gameNum % Math.max(1, Math.floor(numGames / 100)) === 0 || gameNum === numGames) {
      updateProgress(gameNum, numGames);
      // Yield to UI to prevent freezing
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  displayResults(results, numGames);

  isRunning = false;
  runButton.disabled = false;
  runButton.textContent = 'Run Simulation';
}

function initSimulation() {
  const runButton = document.getElementById('run-button');
  runButton.addEventListener('click', runSimulation);

  // Allow Enter key in input
  const numGamesInput = document.getElementById('num-games');
  numGamesInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      runSimulation();
    }
  });
}

// Initialize when DOM is ready
initSimulation();
