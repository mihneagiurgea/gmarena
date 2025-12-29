/**
 * @typedef {Object} GameState
 * @property {number} turn
 * @property {'player' | 'opponent'} activePlayer
 * @property {{x: number, y: number}} playerPosition
 * @property {{x: number, y: number}} opponentPosition
 * @property {string[]} log
 */

/** @type {GameState} */
const gameState = {
  turn: 1,
  activePlayer: 'player',
  playerPosition: { x: 30, y: 50 },
  opponentPosition: { x: 70, y: 50 },
  log: ['Game started.']
};

/**
 * Update the status display
 */
function updateStatusDisplay() {
  document.getElementById('turn-display').textContent = gameState.turn;
  document.getElementById('active-player-display').textContent =
    gameState.activePlayer === 'player' ? 'Player' : 'Opponent';
}

/**
 * Show unit info on hover
 * @param {'player' | 'opponent' | null} unitType
 */
function showUnitInfo(unitType) {
  const unitInfo = document.getElementById('unit-info');

  if (!unitType) {
    unitInfo.innerHTML = '<div class="unit-info-placeholder">Hover over a unit to see details</div>';
    return;
  }

  const title = unitType === 'player' ? 'Player' : 'Opponent';
  unitInfo.innerHTML = `
    <div class="unit-info-content">
      <div class="unit-info-title ${unitType}">${title}</div>
      <div class="unit-info-stats">To be implemented</div>
    </div>
  `;
}

/**
 * Add an entry to the action log
 * @param {string} message
 * @param {'neutral' | 'player' | 'opponent'} type
 */
function addLogEntry(message, type = 'neutral') {
  const logEntries = document.getElementById('log-entries');
  const entry = document.createElement('div');
  entry.className = 'log-entry';

  if (type === 'player') {
    entry.classList.add('player-action');
  } else if (type === 'opponent') {
    entry.classList.add('opponent-action');
  }

  entry.textContent = message;
  logEntries.appendChild(entry);
  logEntries.scrollTop = logEntries.scrollHeight;

  gameState.log.push(message);
}

/**
 * Handle player action selection
 * @param {number} actionIndex
 */
function handleAction(actionIndex) {
  if (gameState.activePlayer !== 'player') return;

  if (actionIndex === 1) {
    addLogEntry(`Turn ${gameState.turn}: Player does nothing.`, 'player');
    gameState.activePlayer = 'opponent';
    updateStatusDisplay();

    // Opponent also does nothing for now
    setTimeout(() => {
      addLogEntry(`Turn ${gameState.turn}: Opponent does nothing.`, 'opponent');
      gameState.turn++;
      gameState.activePlayer = 'player';
      updateStatusDisplay();
    }, 500);
  }
}

// Keyboard controls
document.addEventListener('keydown', (event) => {
  if (event.key === '1') {
    handleAction(1);
  }
});

// Click controls
document.querySelectorAll('.option').forEach((option, index) => {
  option.addEventListener('click', () => {
    handleAction(index + 1);
  });
});

// Unit hover controls
document.getElementById('player').addEventListener('mouseenter', () => {
  showUnitInfo('player');
});

document.getElementById('opponent').addEventListener('mouseenter', () => {
  showUnitInfo('opponent');
});

document.querySelectorAll('.entity').forEach((entity) => {
  entity.addEventListener('mouseleave', () => {
    showUnitInfo(null);
  });
});

// Initialize
console.log('Game Arena initialized');
