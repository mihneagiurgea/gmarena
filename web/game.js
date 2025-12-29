/**
 * @typedef {Object} GameState
 * @property {number} turn
 * @property {{x: number, y: number}} playerPosition
 * @property {{x: number, y: number}} opponentPosition
 * @property {string[]} log
 */

/** @type {GameState} */
const gameState = {
  turn: 1,
  playerPosition: { x: 30, y: 50 },
  opponentPosition: { x: 70, y: 50 },
  log: ['Game started.']
};

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
  if (actionIndex === 1) {
    addLogEntry(`Turn ${gameState.turn}: Player does nothing.`, 'player');

    // Opponent also does nothing for now
    setTimeout(() => {
      addLogEntry(`Turn ${gameState.turn}: Opponent does nothing.`, 'opponent');
      gameState.turn++;
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

// Initialize
console.log('Game Arena initialized');
