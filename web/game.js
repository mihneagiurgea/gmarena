/**
 * Grid-based Game Arena
 * 3 rows x 5 columns
 * Multiple units per team
 */

const GRID_ROWS = 3;
const GRID_COLS = 5;

// ============================================================================
// SVG TEMPLATES
// ============================================================================

const UNIT_SVGS = {
  warrior: `
<svg viewBox="0 0 100 100" class="unit-svg">
  <ellipse cx="50" cy="95" rx="20" ry="5" fill="rgba(0,0,0,0.3)"/>
  <path d="M42 70 L38 90 L42 90 L45 75" fill="#5a6070" stroke="#3a4050" stroke-width="1"/>
  <path d="M58 70 L62 90 L58 90 L55 75" fill="#5a6070" stroke="#3a4050" stroke-width="1"/>
  <path d="M36 88 L44 88 L44 92 L34 92 Z" fill="#4a4a4a" stroke="#333" stroke-width="1"/>
  <path d="M56 88 L64 88 L66 92 L56 92 Z" fill="#4a4a4a" stroke="#333" stroke-width="1"/>
  <path d="M38 45 L35 70 L65 70 L62 45 Z" fill="#7a8090" stroke="#5a6070" stroke-width="1"/>
  <path d="M42 48 L50 52 L58 48 L58 65 L50 68 L42 65 Z" fill="#8a90a0" stroke="#6a7080" stroke-width="1"/>
  <line x1="50" y1="48" x2="50" y2="68" stroke="#6a7080" stroke-width="1"/>
  <ellipse cx="36" cy="46" rx="8" ry="6" fill="#6a7080" stroke="#4a5060" stroke-width="1"/>
  <ellipse cx="64" cy="46" rx="8" ry="6" fill="#6a7080" stroke="#4a5060" stroke-width="1"/>
  <path d="M28 46 L24 65 L28 65 L32 50" fill="#5a6070" stroke="#3a4050" stroke-width="1"/>
  <path d="M12 42 L12 68 L26 75 L26 38 Z" fill="#4a7ac7" stroke="#2a4a87" stroke-width="2"/>
  <path d="M17 50 L19 55 L24 55 L20 59 L22 65 L17 61 L12 65 L14 59 L10 55 L15 55 Z" fill="#ffd700" stroke="#b8960b" stroke-width="0.5"/>
  <line x1="26" y1="40" x2="26" y2="73" stroke="#6a9ae7" stroke-width="1"/>
  <path d="M72 46 L78 38 L74 36 L68 44" fill="#5a6070" stroke="#3a4050" stroke-width="1"/>
  <rect x="76" y="8" width="4" height="35" fill="#c0c0c0" stroke="#888" stroke-width="1"/>
  <path d="M76 8 L78 2 L80 8 Z" fill="#d0d0d0" stroke="#888" stroke-width="0.5"/>
  <rect x="72" y="42" width="12" height="4" rx="1" fill="#8b7355" stroke="#5a4a35" stroke-width="1"/>
  <rect x="77" y="46" width="2" height="8" fill="#6b4423" stroke="#4a3020" stroke-width="0.5"/>
  <circle cx="78" cy="56" r="3" fill="#ffd700" stroke="#b8960b" stroke-width="0.5"/>
  <rect x="44" y="38" width="12" height="6" rx="2" fill="#6a7080" stroke="#4a5060" stroke-width="1"/>
  <path d="M38 20 Q38 8 50 8 Q62 8 62 20 L62 38 L38 38 Z" fill="#6a7080" stroke="#4a5060" stroke-width="1"/>
  <path d="M40 22 L60 22 L58 32 L42 32 Z" fill="#2a2a3a" stroke="#4a5060" stroke-width="1"/>
  <line x1="44" y1="26" x2="56" y2="26" stroke="#1a1a2a" stroke-width="2"/>
  <line x1="44" y1="30" x2="56" y2="30" stroke="#1a1a2a" stroke-width="1"/>
  <path d="M50 8 L50 2 L54 6 L50 8" fill="#cc3333" stroke="#aa2222" stroke-width="0.5"/>
  <line x1="50" y1="8" x2="50" y2="20" stroke="#5a6070" stroke-width="2"/>
</svg>`,

  mage: `
<svg viewBox="0 0 100 100" class="unit-svg">
  <ellipse cx="50" cy="95" rx="18" ry="5" fill="rgba(0,0,0,0.3)"/>
  <!-- Robe bottom -->
  <path d="M35 55 L30 92 L70 92 L65 55 Z" fill="#4a3080" stroke="#2a1860" stroke-width="1"/>
  <!-- Robe folds -->
  <line x1="42" y1="60" x2="38" y2="90" stroke="#3a2070" stroke-width="1"/>
  <line x1="50" y1="58" x2="50" y2="90" stroke="#3a2070" stroke-width="1"/>
  <line x1="58" y1="60" x2="62" y2="90" stroke="#3a2070" stroke-width="1"/>
  <!-- Robe top -->
  <path d="M38 40 L35 58 L65 58 L62 40 Z" fill="#5a40a0" stroke="#3a2080" stroke-width="1"/>
  <!-- Belt/sash -->
  <path d="M36 54 L64 54 L63 58 L37 58 Z" fill="#ffd700" stroke="#b8960b" stroke-width="1"/>
  <!-- Left arm (holding staff) -->
  <path d="M35 42 L22 55 L26 58 L38 46" fill="#5a40a0" stroke="#3a2080" stroke-width="1"/>
  <!-- Hand -->
  <circle cx="24" cy="56" r="4" fill="#e8c4a0" stroke="#c0a080" stroke-width="1"/>
  <!-- Staff -->
  <rect x="20" y="10" width="3" height="75" rx="1" fill="#5a4030" stroke="#3a2a20" stroke-width="1"/>
  <!-- Staff orb -->
  <circle cx="21.5" cy="10" r="8" fill="#7070ff" stroke="#4040cc" stroke-width="1"/>
  <!-- Staff orb glow -->
  <circle cx="21.5" cy="10" r="5" fill="#a0a0ff" opacity="0.6"/>
  <circle cx="19" cy="8" r="2" fill="#ffffff" opacity="0.8"/>
  <!-- Right arm -->
  <path d="M65 42 L72 52 L68 55 L62 46" fill="#5a40a0" stroke="#3a2080" stroke-width="1"/>
  <!-- Shoulders -->
  <ellipse cx="38" cy="42" rx="6" ry="4" fill="#5a40a0" stroke="#3a2080" stroke-width="1"/>
  <ellipse cx="62" cy="42" rx="6" ry="4" fill="#5a40a0" stroke="#3a2080" stroke-width="1"/>
  <!-- Hood -->
  <path d="M36 18 Q36 8 50 6 Q64 8 64 18 L64 38 L36 38 Z" fill="#4a3080" stroke="#2a1860" stroke-width="1"/>
  <!-- Face (inside hood) -->
  <ellipse cx="50" cy="28" rx="10" ry="12" fill="#e8c4a0" stroke="#c0a080" stroke-width="1"/>
  <!-- Eyes -->
  <ellipse cx="46" cy="26" rx="2" ry="1.5" fill="#2a2a4a"/>
  <ellipse cx="54" cy="26" rx="2" ry="1.5" fill="#2a2a4a"/>
  <!-- Nose -->
  <path d="M49 28 L50 32 L51 28" fill="none" stroke="#c0a080" stroke-width="1"/>
  <!-- Beard -->
  <path d="M44 34 Q50 42 56 34" fill="#888888" stroke="#666666" stroke-width="1"/>
  <path d="M48 36 L50 48 L52 36" fill="#888888" stroke="#666666" stroke-width="0.5"/>
</svg>`,

  archer: `
<svg viewBox="0 0 100 100" class="unit-svg">
  <ellipse cx="50" cy="95" rx="18" ry="5" fill="rgba(0,0,0,0.3)"/>
  <!-- Legs -->
  <path d="M44 65 L42 88 L46 88 L47 68" fill="#5a4a3a" stroke="#3a2a1a" stroke-width="1"/>
  <path d="M56 65 L58 88 L54 88 L53 68" fill="#5a4a3a" stroke="#3a2a1a" stroke-width="1"/>
  <!-- Boots -->
  <path d="M40 86 L48 86 L48 92 L38 92 Z" fill="#3a3a3a" stroke="#2a2a2a" stroke-width="1"/>
  <path d="M52 86 L60 86 L62 92 L52 92 Z" fill="#3a3a3a" stroke="#2a2a2a" stroke-width="1"/>
  <!-- Leather tunic -->
  <path d="M40 42 L38 68 L62 68 L60 42 Z" fill="#6a5a4a" stroke="#4a3a2a" stroke-width="1"/>
  <!-- Tunic details -->
  <line x1="50" y1="44" x2="50" y2="66" stroke="#5a4a3a" stroke-width="1"/>
  <path d="M42 46 L50 50 L58 46" fill="none" stroke="#5a4a3a" stroke-width="1"/>
  <!-- Belt with quiver strap -->
  <rect x="38" y="58" width="24" height="4" fill="#4a3a2a" stroke="#2a1a0a" stroke-width="1"/>
  <line x1="55" y1="42" x2="62" y2="62" stroke="#4a3a2a" stroke-width="3"/>
  <!-- Quiver on back -->
  <rect x="62" y="35" width="8" height="30" rx="2" fill="#5a4a3a" stroke="#3a2a1a" stroke-width="1"/>
  <!-- Arrows in quiver -->
  <line x1="64" y1="32" x2="64" y2="38" stroke="#8a7a6a" stroke-width="1"/>
  <line x1="66" y1="30" x2="66" y2="38" stroke="#8a7a6a" stroke-width="1"/>
  <line x1="68" y1="33" x2="68" y2="38" stroke="#8a7a6a" stroke-width="1"/>
  <!-- Arrow feathers -->
  <path d="M63 32 L64 30 L65 32" fill="#cc3333" stroke="none"/>
  <path d="M65 30 L66 28 L67 30" fill="#cc3333" stroke="none"/>
  <path d="M67 33 L68 31 L69 33" fill="#cc3333" stroke="none"/>
  <!-- Left arm (holding bow) -->
  <path d="M32 44 L20 52 L24 56 L36 48" fill="#6a5a4a" stroke="#4a3a2a" stroke-width="1"/>
  <!-- Bow -->
  <path d="M12 30 Q8 50 12 70" fill="none" stroke="#5a4030" stroke-width="3"/>
  <path d="M12 30 Q16 50 12 70" fill="none" stroke="#3a2a20" stroke-width="1"/>
  <!-- Bowstring -->
  <line x1="12" y1="30" x2="12" y2="70" stroke="#aaa" stroke-width="1"/>
  <!-- Right arm (drawing) -->
  <path d="M68 44 L76 38 L72 34 L64 40" fill="#6a5a4a" stroke="#4a3a2a" stroke-width="1"/>
  <!-- Shoulders -->
  <ellipse cx="38" cy="44" rx="6" ry="4" fill="#6a5a4a" stroke="#4a3a2a" stroke-width="1"/>
  <ellipse cx="62" cy="44" rx="6" ry="4" fill="#6a5a4a" stroke="#4a3a2a" stroke-width="1"/>
  <!-- Hood/cowl -->
  <path d="M38 20 Q38 10 50 10 Q62 10 62 20 L62 40 L38 40 Z" fill="#5a5a4a" stroke="#3a3a2a" stroke-width="1"/>
  <!-- Face -->
  <ellipse cx="50" cy="28" rx="9" ry="11" fill="#e8c4a0" stroke="#c0a080" stroke-width="1"/>
  <!-- Eyes -->
  <ellipse cx="46" cy="26" rx="2" ry="1.5" fill="#2a4a2a"/>
  <ellipse cx="54" cy="26" rx="2" ry="1.5" fill="#2a4a2a"/>
  <!-- Eyebrows -->
  <path d="M44 24 L48 23" stroke="#5a4a3a" stroke-width="1" fill="none"/>
  <path d="M52 23 L56 24" stroke="#5a4a3a" stroke-width="1" fill="none"/>
  <!-- Nose -->
  <path d="M49 27 L50 31 L51 27" fill="none" stroke="#c0a080" stroke-width="1"/>
  <!-- Slight smirk -->
  <path d="M47 33 Q50 35 53 33" fill="none" stroke="#a08060" stroke-width="1"/>
</svg>`,

  orc: `
<svg viewBox="0 0 100 100" class="unit-svg">
  <ellipse cx="50" cy="95" rx="22" ry="6" fill="rgba(0,0,0,0.3)"/>
  <path d="M40 68 L36 90 L42 90 L46 72" fill="#5a7a4a" stroke="#3a5a2a" stroke-width="1"/>
  <path d="M60 68 L64 90 L58 90 L54 72" fill="#5a7a4a" stroke="#3a5a2a" stroke-width="1"/>
  <path d="M34 86 L44 86 L46 94 L32 94 Z" fill="#4a3a2a" stroke="#2a2015" stroke-width="1"/>
  <path d="M56 86 L66 86 L68 94 L54 94 Z" fill="#4a3a2a" stroke="#2a2015" stroke-width="1"/>
  <path d="M34 86 Q38 84 44 86" stroke="#6a5a4a" stroke-width="2" fill="none"/>
  <path d="M56 86 Q60 84 66 86" stroke="#6a5a4a" stroke-width="2" fill="none"/>
  <path d="M34 44 L30 70 L70 70 L66 44 Z" fill="#5a7a4a" stroke="#3a5a2a" stroke-width="1"/>
  <path d="M38 44 L36 60 L64 60 L62 44 Z" fill="#5a5a5a" stroke="#3a3a3a" stroke-width="1"/>
  <path d="M42 46 L50 50 L58 46 L56 58 L50 60 L44 58 Z" fill="#6a6a6a" stroke="#4a4a4a" stroke-width="1"/>
  <line x1="40" y1="44" x2="36" y2="70" stroke="#4a3a2a" stroke-width="2"/>
  <line x1="60" y1="44" x2="64" y2="70" stroke="#4a3a2a" stroke-width="2"/>
  <rect x="32" y="62" width="36" height="5" fill="#4a3a2a" stroke="#2a2015" stroke-width="1"/>
  <rect x="46" y="62" width="8" height="5" fill="#8b7355" stroke="#5a4a35" stroke-width="1"/>
  <path d="M28 46 L18 60 L24 62 L32 50" fill="#5a7a4a" stroke="#3a5a2a" stroke-width="1"/>
  <path d="M72 46 L82 60 L76 62 L68 50" fill="#5a7a4a" stroke="#3a5a2a" stroke-width="1"/>
  <path d="M18 60 L22 78 L28 76 L24 62" fill="#5a7a4a" stroke="#3a5a2a" stroke-width="1"/>
  <path d="M82 60 L78 78 L72 76 L76 62" fill="#5a7a4a" stroke="#3a5a2a" stroke-width="1"/>
  <ellipse cx="30" cy="46" rx="7" ry="5" fill="#4a3a2a" stroke="#2a2015" stroke-width="1"/>
  <ellipse cx="70" cy="46" rx="7" ry="5" fill="#4a3a2a" stroke="#2a2015" stroke-width="1"/>
  <path d="M26 42 L24 36 L28 42" fill="#6a6a6a" stroke="#4a4a4a" stroke-width="0.5"/>
  <path d="M74 42 L76 36 L72 42" fill="#6a6a6a" stroke="#4a4a4a" stroke-width="0.5"/>
  <rect x="23" y="20" width="4" height="58" rx="1" fill="#5a4030" stroke="#3a2a20" stroke-width="1" transform="rotate(-15 25 50)"/>
  <path d="M10 10 Q0 20 8 30 L20 25 L20 15 Z" fill="#6a6a6a" stroke="#4a4a4a" stroke-width="1.5" transform="rotate(-15 15 20)"/>
  <path d="M8 12 Q-2 20 6 28" stroke="#8a8a8a" stroke-width="2" fill="none" transform="rotate(-15 15 20)"/>
  <path d="M30 10 Q40 20 32 30 L20 25 L20 15 Z" fill="#6a6a6a" stroke="#4a4a4a" stroke-width="1.5" transform="rotate(-15 25 20)"/>
  <path d="M32 12 Q42 20 34 28" stroke="#8a8a8a" stroke-width="2" fill="none" transform="rotate(-15 25 20)"/>
  <path d="M42 38 L42 44 L58 44 L58 38" fill="#5a7a4a" stroke="#3a5a2a" stroke-width="1"/>
  <ellipse cx="50" cy="28" rx="14" ry="16" fill="#5a7a4a" stroke="#3a5a2a" stroke-width="1"/>
  <path d="M38 24 Q50 20 62 24" stroke="#4a6a3a" stroke-width="3" fill="none"/>
  <ellipse cx="44" cy="26" rx="3" ry="2" fill="#aa2020"/>
  <ellipse cx="56" cy="26" rx="3" ry="2" fill="#aa2020"/>
  <circle cx="44" cy="26" r="1" fill="#ffff00"/>
  <circle cx="56" cy="26" r="1" fill="#ffff00"/>
  <path d="M48 28 L50 34 L52 28" fill="#4a6a3a" stroke="#3a5a2a" stroke-width="1"/>
  <path d="M44 36 Q50 40 56 36" stroke="#3a5a2a" stroke-width="2" fill="none"/>
  <path d="M42 36 L40 30 L44 34" fill="#eeeecc" stroke="#ccccaa" stroke-width="0.5"/>
  <path d="M58 36 L60 30 L56 34" fill="#eeeecc" stroke="#ccccaa" stroke-width="0.5"/>
  <path d="M36 24 L28 18 L34 28" fill="#5a7a4a" stroke="#3a5a2a" stroke-width="1"/>
  <path d="M64 24 L72 18 L66 28" fill="#5a7a4a" stroke="#3a5a2a" stroke-width="1"/>
  <line x1="38" y1="20" x2="42" y2="32" stroke="#8a2020" stroke-width="1.5"/>
  <line x1="62" y1="20" x2="58" y2="32" stroke="#8a2020" stroke-width="1.5"/>
</svg>`
};

// ============================================================================
// UNIT DEFINITIONS
// ============================================================================

/**
 * @typedef {Object} Unit
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {'player' | 'opponent'} team
 * @property {{row: number, col: number}} position
 */

/**
 * Create initial units for the game
 * @returns {Unit[]}
 */
function createInitialUnits() {
  const playerUnits = [
    { id: 'warrior', name: 'Warrior', type: 'warrior', team: 'player' },
    { id: 'mage', name: 'Mage', type: 'mage', team: 'player' },
    { id: 'archer', name: 'Archer', type: 'archer', team: 'player' }
  ];

  const opponentUnits = [
    { id: 'orc1', name: 'Orc #1', type: 'orc', team: 'opponent' },
    { id: 'orc2', name: 'Orc #2', type: 'orc', team: 'opponent' }
  ];

  // Place units
  placeUnitsInColumn(playerUnits, 0);
  placeUnitsInColumn(opponentUnits, GRID_COLS - 1);

  return [...playerUnits, ...opponentUnits];
}

/**
 * Place units in a column based on count
 * @param {Unit[]} units
 * @param {number} col
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
 * Shuffle array randomly (Fisher-Yates)
 * @param {any[]} array
 * @returns {any[]}
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
// GAME STATE
// ============================================================================

/**
 * @typedef {Object} GameState
 * @property {number} turn
 * @property {Unit[]} units
 * @property {string[]} turnOrder - Array of unit IDs in turn order
 * @property {number} currentUnitIndex
 * @property {'main' | 'move'} menuState
 * @property {{row: number, col: number}[]} validMoves
 */

/** @type {GameState} */
const gameState = {
  turn: 1,
  units: [],
  turnOrder: [],
  currentUnitIndex: 0,
  menuState: 'main',
  validMoves: []
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current active unit
 * @returns {Unit|null}
 */
function getCurrentUnit() {
  const unitId = gameState.turnOrder[gameState.currentUnitIndex];
  return gameState.units.find(u => u.id === unitId) || null;
}

/**
 * Get unit at position
 * @param {number} row
 * @param {number} col
 * @returns {Unit|null}
 */
function getUnitAt(row, col) {
  return gameState.units.find(u => u.position.row === row && u.position.col === col) || null;
}

/**
 * Get cell element at position
 * @param {number} row
 * @param {number} col
 * @returns {HTMLElement|null}
 */
function getCellAt(row, col) {
  return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}

/**
 * Check if position is valid
 * @param {number} row
 * @param {number} col
 * @returns {boolean}
 */
function isValidPosition(row, col) {
  return row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS;
}

/**
 * Check if position is occupied
 * @param {number} row
 * @param {number} col
 * @returns {boolean}
 */
function isOccupied(row, col) {
  return getUnitAt(row, col) !== null;
}

/**
 * Get adjacent cells for a position
 * @param {{row: number, col: number}} pos
 * @returns {{row: number, col: number}[]}
 */
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

/**
 * Get direction name
 * @param {{row: number, col: number}} from
 * @param {{row: number, col: number}} to
 * @returns {string}
 */
function getDirectionName(from, to) {
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  const vertical = dr < 0 ? 'North' : dr > 0 ? 'South' : '';
  const horizontal = dc < 0 ? 'West' : dc > 0 ? 'East' : '';
  return vertical + horizontal || 'Center';
}

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Create the grid
 */
function createGrid() {
  const gridEl = document.getElementById('grid');
  gridEl.innerHTML = '';

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = row;
      cell.dataset.col = col;
      gridEl.appendChild(cell);
    }
  }
}

/**
 * Render all units on the grid
 */
function renderUnits() {
  // Clear existing units
  document.querySelectorAll('.entity').forEach(el => el.remove());

  gameState.units.forEach(unit => {
    const cell = getCellAt(unit.position.row, unit.position.col);
    if (!cell) return;

    const el = document.createElement('div');
    el.className = `entity ${unit.team}`;
    el.id = unit.id;
    el.innerHTML = UNIT_SVGS[unit.type];
    cell.appendChild(el);

    el.addEventListener('mouseenter', () => showUnitInfo(unit));
    el.addEventListener('mouseleave', () => showUnitInfo(null));
  });
}

/**
 * Highlight cells for current unit
 */
function highlightCells() {
  // Clear all highlights
  document.querySelectorAll('.cell').forEach(cell => {
    cell.classList.remove('highlight', 'move-option');
    cell.onclick = null;
    const numEl = cell.querySelector('.cell-number');
    if (numEl) numEl.remove();
  });

  const currentUnit = getCurrentUnit();
  if (!currentUnit || currentUnit.team !== 'player') return;

  const adjacent = getAdjacentCells(currentUnit.position);

  if (gameState.menuState === 'main') {
    adjacent.forEach(p => {
      const cell = getCellAt(p.row, p.col);
      if (cell) cell.classList.add('highlight');
    });
  } else if (gameState.menuState === 'move') {
    gameState.validMoves = adjacent;
    adjacent.forEach((p, index) => {
      const cell = getCellAt(p.row, p.col);
      if (cell) {
        cell.classList.add('move-option');
        const numEl = document.createElement('div');
        numEl.className = 'cell-number';
        numEl.textContent = index + 1;
        cell.appendChild(numEl);
        cell.onclick = () => executeMove(index);
      }
    });
  }
}

/**
 * Render turn order in status section
 */
function renderTurnOrder() {
  const statusContent = document.querySelector('.status-content');

  let html = `
    <div class="status-row">
      <span class="status-label">Turn</span>
      <span class="status-value" id="turn-display">${gameState.turn}</span>
    </div>
  `;

  html += '<div class="turn-order">';
  html += '<div class="turn-order-label">Turn Order</div>';

  gameState.turnOrder.forEach((unitId, index) => {
    const unit = gameState.units.find(u => u.id === unitId);
    if (!unit) return;

    const isCurrent = index === gameState.currentUnitIndex;
    const teamClass = unit.team;

    html += `<div class="turn-order-item ${teamClass} ${isCurrent ? 'current' : ''}">
      <span class="turn-order-marker">${isCurrent ? '▶' : ''}</span>
      <span class="turn-order-name">${unit.name}</span>
    </div>`;
  });

  html += '</div>';

  statusContent.innerHTML = html;
}

/**
 * Render options menu
 */
function renderOptions() {
  const optionsEl = document.getElementById('options');
  const currentUnit = getCurrentUnit();

  if (!currentUnit) {
    optionsEl.innerHTML = '<div class="options-header">Game Over</div>';
    return;
  }

  if (currentUnit.team !== 'player') {
    optionsEl.innerHTML = `<div class="options-header">${currentUnit.name}'s Turn...</div>`;
    return;
  }

  if (gameState.menuState === 'main') {
    optionsEl.innerHTML = `
      <div class="options-header">${currentUnit.name} - Actions</div>
      <div class="option" data-action="move">
        <span class="option-key">1</span>
        <span class="option-text">Move</span>
      </div>
      <div class="option" data-action="wait">
        <span class="option-key">2</span>
        <span class="option-text">Wait</span>
      </div>
    `;

    optionsEl.querySelectorAll('.option').forEach(opt => {
      opt.addEventListener('click', () => {
        const action = opt.dataset.action;
        if (action === 'move') enterMoveMode();
        else if (action === 'wait') executeWait();
      });
    });
  } else if (gameState.menuState === 'move') {
    let html = `<div class="options-header">${currentUnit.name} - Select destination</div>`;
    html += `<div class="option" data-action="cancel">
      <span class="option-key">0</span>
      <span class="option-text">Cancel</span>
    </div>`;

    gameState.validMoves.forEach((pos, index) => {
      const dirName = getDirectionName(currentUnit.position, pos);
      html += `<div class="option" data-action="move-${index}">
        <span class="option-key">${index + 1}</span>
        <span class="option-text">${dirName}</span>
      </div>`;
    });

    optionsEl.innerHTML = html;

    optionsEl.querySelectorAll('.option').forEach(opt => {
      opt.addEventListener('click', () => {
        const action = opt.dataset.action;
        if (action === 'cancel') exitMoveMode();
        else if (action.startsWith('move-')) {
          const index = parseInt(action.split('-')[1]);
          executeMove(index);
        }
      });
    });
  }
}

/**
 * Show unit info on hover
 * @param {Unit|null} unit
 */
function showUnitInfo(unit) {
  const unitInfo = document.getElementById('unit-info');

  if (!unit) {
    unitInfo.innerHTML = '<div class="unit-info-placeholder">Hover over a unit to see details</div>';
    return;
  }

  unitInfo.innerHTML = `
    <div class="unit-info-content">
      <div class="unit-info-title ${unit.team}">${unit.name}</div>
      <div class="unit-info-stats">
        Type: ${unit.type.charAt(0).toUpperCase() + unit.type.slice(1)}<br>
        Team: ${unit.team === 'player' ? 'Player' : 'Opponent'}<br>
        Position: (${unit.position.row}, ${unit.position.col})
      </div>
    </div>
  `;
}

/**
 * Add log entry
 * @param {string} message
 * @param {'neutral' | 'player' | 'opponent'} type
 */
function addLogEntry(message, type = 'neutral') {
  const logEntries = document.getElementById('log-entries');
  const entry = document.createElement('div');
  entry.className = 'log-entry';

  if (type === 'player') entry.classList.add('player-action');
  else if (type === 'opponent') entry.classList.add('opponent-action');

  entry.textContent = message;
  logEntries.appendChild(entry);
  logEntries.scrollTop = logEntries.scrollHeight;
}

// ============================================================================
// GAME ACTIONS
// ============================================================================

function enterMoveMode() {
  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;

  gameState.menuState = 'move';
  gameState.validMoves = getAdjacentCells(currentUnit.position);
  highlightCells();
  renderOptions();
}

function exitMoveMode() {
  gameState.menuState = 'main';
  gameState.validMoves = [];
  highlightCells();
  renderOptions();
}

function executeMove(index) {
  if (index < 0 || index >= gameState.validMoves.length) return;

  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;

  const newPos = gameState.validMoves[index];
  const oldPos = { ...currentUnit.position };
  currentUnit.position = newPos;

  const dirName = getDirectionName(oldPos, newPos);
  addLogEntry(`${currentUnit.name} moves ${dirName}.`, currentUnit.team);

  gameState.menuState = 'main';
  gameState.validMoves = [];

  endTurn();
}

function executeWait() {
  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;

  addLogEntry(`${currentUnit.name} waits.`, currentUnit.team);
  endTurn();
}

function endTurn() {
  gameState.currentUnitIndex++;

  // Check if we've gone through all units
  if (gameState.currentUnitIndex >= gameState.turnOrder.length) {
    gameState.currentUnitIndex = 0;
    gameState.turn++;
  }

  renderUnits();
  highlightCells();
  renderTurnOrder();
  renderOptions();

  // If it's opponent's turn, run AI
  const currentUnit = getCurrentUnit();
  if (currentUnit && currentUnit.team === 'opponent') {
    setTimeout(() => runOpponentAI(), 500);
  }
}

/**
 * Simple opponent AI
 */
function runOpponentAI() {
  const currentUnit = getCurrentUnit();
  if (!currentUnit || currentUnit.team !== 'player') {
    // Find closest player unit
    const playerUnits = gameState.units.filter(u => u.team === 'player');
    if (playerUnits.length === 0) {
      addLogEntry(`${currentUnit.name} waits.`, 'opponent');
      endTurn();
      return;
    }

    const adjacent = getAdjacentCells(currentUnit.position);

    if (adjacent.length > 0) {
      // Find cell closest to any player unit
      let bestMove = adjacent[0];
      let bestDist = Infinity;

      adjacent.forEach(pos => {
        playerUnits.forEach(player => {
          const dist = Math.abs(pos.row - player.position.row) + Math.abs(pos.col - player.position.col);
          if (dist < bestDist) {
            bestDist = dist;
            bestMove = pos;
          }
        });
      });

      const oldPos = { ...currentUnit.position };
      currentUnit.position = bestMove;
      const dirName = getDirectionName(oldPos, bestMove);
      addLogEntry(`${currentUnit.name} moves ${dirName}.`, 'opponent');
    } else {
      addLogEntry(`${currentUnit.name} waits.`, 'opponent');
    }

    endTurn();
  }
}

// ============================================================================
// KEYBOARD CONTROLS
// ============================================================================

document.addEventListener('keydown', (event) => {
  const currentUnit = getCurrentUnit();
  if (!currentUnit || currentUnit.team !== 'player') return;

  const key = event.key;

  if (gameState.menuState === 'main') {
    if (key === '1') enterMoveMode();
    else if (key === '2') executeWait();
  } else if (gameState.menuState === 'move') {
    if (key === '0' || key === 'Escape') exitMoveMode();
    else {
      const num = parseInt(key);
      if (num >= 1 && num <= gameState.validMoves.length) {
        executeMove(num - 1);
      }
    }
  }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

function initGame() {
  // Create units
  gameState.units = createInitialUnits();

  // Create random turn order
  const allUnitIds = gameState.units.map(u => u.id);
  gameState.turnOrder = shuffleArray(allUnitIds);
  gameState.currentUnitIndex = 0;

  // Render
  createGrid();
  renderUnits();
  highlightCells();
  renderTurnOrder();
  renderOptions();

  addLogEntry('Game started.');

  // If first unit is opponent, run AI
  const firstUnit = getCurrentUnit();
  if (firstUnit && firstUnit.team === 'opponent') {
    setTimeout(() => runOpponentAI(), 500);
  }

  console.log('Game Arena initialized');
}

initGame();
