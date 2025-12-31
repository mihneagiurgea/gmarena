/**
 * Grid-based Game Arena
 * 3 rows x 5 columns
 * Multiple units per team with combat
 */

const GRID_ROWS = 3;
const GRID_COLS = 5;

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
 * @property {number} hp
 * @property {number} maxHp
 * @property {number} ac
 * @property {number} sr
 * @property {number} wc
 * @property {number|null} meleeDamage
 * @property {number|null} rangedDamage
 * @property {string[]} spells
 */

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

/**
 * Create a unit with stats
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
    spells: [...stats.spells]
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
// GAME STATE
// ============================================================================

/** @type {Object} */
const gameState = {
  turn: 1,
  units: [],
  turnOrder: [],
  currentUnitIndex: 0,
  menuState: 'main', // 'main', 'move', 'melee', 'ranged', 'spell'
  validMoves: [],
  validTargets: [],
  selectedSpell: null
};

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
 * Show roll result popup
 */
function showRollResult(roll, hit, critical, damage = 0) {
  // Remove any existing popup
  const existing = document.querySelector('.roll-result');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.className = 'roll-result';

  let resultType, resultText;
  if (roll === 1) {
    resultType = 'miss';
    resultText = 'Critical Miss!';
  } else if (roll === 20 || critical) {
    resultType = 'critical';
    resultText = 'Critical Hit!';
  } else if (hit) {
    resultType = 'hit';
    resultText = 'Hit!';
  } else {
    resultType = 'miss';
    resultText = 'Miss!';
  }

  popup.classList.add(resultType);

  let damageHtml = '';
  if (hit && damage > 0) {
    damageHtml = `<span class="roll-damage">${damage} damage</span>`;
  }

  popup.innerHTML = `
    <span class="roll-number">${roll}</span>
    <span class="roll-text">${resultText}</span>
    ${damageHtml}
  `;

  document.body.appendChild(popup);

  // Remove after animation
  setTimeout(() => popup.remove(), 1600);
}

/**
 * Perform a melee attack
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
 */
function removeDeadUnits() {
  const deadUnits = gameState.units.filter(u => u.hp <= 0);
  deadUnits.forEach(unit => {
    addLogEntry(`${unit.name} has fallen!`, unit.team);
    // Remove from turn order
    gameState.turnOrder = gameState.turnOrder.filter(id => id !== unit.id);
    // Adjust current index if needed
    const deadIndex = gameState.turnOrder.indexOf(unit.id);
    if (deadIndex !== -1 && deadIndex < gameState.currentUnitIndex) {
      gameState.currentUnitIndex--;
    }
  });
  gameState.units = gameState.units.filter(u => u.hp > 0);
}

/**
 * Check if game is over
 */
function checkGameOver() {
  const playerAlive = gameState.units.some(u => u.team === 'player');
  const opponentAlive = gameState.units.some(u => u.team === 'opponent');

  if (!playerAlive) {
    addLogEntry('DEFEAT! All your units have fallen.', 'neutral');
    return true;
  }
  if (!opponentAlive) {
    addLogEntry('VICTORY! All enemies have been defeated!', 'neutral');
    return true;
  }
  return false;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCurrentUnit() {
  if (gameState.turnOrder.length === 0) return null;
  const unitId = gameState.turnOrder[gameState.currentUnitIndex];
  return gameState.units.find(u => u.id === unitId) || null;
}

function getUnitAt(row, col) {
  return gameState.units.find(u => u.position.row === row && u.position.col === col) || null;
}

function getCellAt(row, col) {
  return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
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

// ============================================================================
// RENDERING
// ============================================================================

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

function renderUnits() {
  document.querySelectorAll('.entity').forEach(el => el.remove());
  document.querySelectorAll('.hp-bar-container').forEach(el => el.remove());

  gameState.units.forEach(unit => {
    const cell = getCellAt(unit.position.row, unit.position.col);
    if (!cell) return;

    const el = document.createElement('div');
    el.className = `entity ${unit.team}`;
    el.id = unit.id;
    el.innerHTML = UNIT_SVGS[unit.type];
    cell.appendChild(el);

    // HP bar
    const hpContainer = document.createElement('div');
    hpContainer.className = 'hp-bar-container';
    const hpBar = document.createElement('div');
    hpBar.className = 'hp-bar';
    const hpPercent = (unit.hp / unit.maxHp) * 100;
    hpBar.style.width = `${hpPercent}%`;
    if (hpPercent <= 25) hpBar.classList.add('critical');
    else if (hpPercent <= 50) hpBar.classList.add('low');
    hpContainer.appendChild(hpBar);
    cell.appendChild(hpContainer);

    el.addEventListener('mouseenter', () => showUnitInfo(unit));
    el.addEventListener('mouseleave', () => showUnitInfo(null));
  });
}

function highlightCells() {
  document.querySelectorAll('.cell').forEach(cell => {
    cell.classList.remove('highlight', 'move-option', 'melee-target', 'ranged-target', 'attack-target', 'active-unit');
    cell.onclick = null;
    const numEl = cell.querySelector('.cell-number');
    if (numEl) numEl.remove();
  });

  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;

  // Highlight current unit's cell
  const currentCell = getCellAt(currentUnit.position.row, currentUnit.position.col);
  if (currentCell) {
    currentCell.classList.add('active-unit');
  }

  if (currentUnit.team !== 'player') return;

  if (gameState.menuState === 'main') {
    // Show all available actions directly on the grid

    // Move options (adjacent empty cells)
    const moveOptions = getAdjacentCells(currentUnit.position);
    moveOptions.forEach(p => {
      const cell = getCellAt(p.row, p.col);
      if (cell) {
        cell.classList.add('move-option');
        cell.onclick = () => {
          gameState.validMoves = moveOptions;
          const index = moveOptions.findIndex(m => m.row === p.row && m.col === p.col);
          executeMove(index);
        };
      }
    });

    // Melee targets (adjacent enemies)
    if (currentUnit.meleeDamage !== null) {
      const meleeTargets = getAdjacentEnemies(currentUnit);
      meleeTargets.forEach(target => {
        const cell = getCellAt(target.position.row, target.position.col);
        if (cell) {
          cell.classList.add('melee-target');
          cell.onclick = () => {
            gameState.menuState = 'melee';
            gameState.validTargets = meleeTargets;
            const index = meleeTargets.findIndex(t => t.id === target.id);
            executeAttack(index);
          };
        }
      });
    }

    // Ranged targets (all enemies, but not adjacent ones if we have melee)
    if (currentUnit.rangedDamage !== null) {
      const allEnemies = getAllEnemies(currentUnit);
      const adjacentEnemyIds = getAdjacentEnemies(currentUnit).map(e => e.id);
      allEnemies.forEach(target => {
        const cell = getCellAt(target.position.row, target.position.col);
        if (cell && !adjacentEnemyIds.includes(target.id)) {
          // Only show ranged option for non-adjacent enemies (adjacent ones show melee)
          cell.classList.add('ranged-target');
          cell.onclick = () => {
            gameState.menuState = 'ranged';
            gameState.validTargets = allEnemies;
            const index = allEnemies.findIndex(t => t.id === target.id);
            executeAttack(index);
          };
        } else if (cell && currentUnit.meleeDamage === null) {
          // If no melee, show ranged for adjacent too
          cell.classList.add('ranged-target');
          cell.onclick = () => {
            gameState.menuState = 'ranged';
            gameState.validTargets = allEnemies;
            const index = allEnemies.findIndex(t => t.id === target.id);
            executeAttack(index);
          };
        }
      });
    }
  } else if (gameState.menuState === 'move') {
    gameState.validMoves = getAdjacentCells(currentUnit.position);
    gameState.validMoves.forEach((p, index) => {
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
  } else if (gameState.menuState === 'melee' || gameState.menuState === 'ranged' || gameState.menuState === 'spell') {
    gameState.validTargets.forEach((target, index) => {
      const cell = getCellAt(target.position.row, target.position.col);
      if (cell) {
        // Use appropriate class based on attack type
        const numEl = document.createElement('div');
        if (gameState.menuState === 'melee') {
          cell.classList.add('melee-target');
          numEl.className = 'cell-number melee';
        } else if (gameState.menuState === 'ranged') {
          cell.classList.add('ranged-target');
          numEl.className = 'cell-number ranged';
        } else {
          cell.classList.add('attack-target');
          numEl.className = 'cell-number attack';
        }
        numEl.textContent = index + 1;
        cell.appendChild(numEl);
        cell.onclick = () => executeAttack(index);
      }
    });
  }
}

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

    html += `<div class="turn-order-item ${teamClass} ${isCurrent ? 'current' : ''}" data-unit-id="${unitId}">
      <span class="turn-order-marker">${isCurrent ? '▶' : ''}</span>
      <span class="turn-order-name">${unit.name}</span>
      <span class="turn-order-hp">${unit.hp}/${unit.maxHp}</span>
    </div>`;
  });

  html += '</div>';
  statusContent.innerHTML = html;

  // Add hover events for turn order items
  statusContent.querySelectorAll('.turn-order-item').forEach(item => {
    const unitId = item.dataset.unitId;
    const unit = gameState.units.find(u => u.id === unitId);
    if (unit) {
      item.addEventListener('mouseenter', () => showUnitInfo(unit));
      item.addEventListener('mouseleave', () => showUnitInfo(null));
    }
  });
}

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
    let html = `<div class="options-header">${currentUnit.name} - Actions</div>`;
    let keyIndex = 1;

    html += `<div class="option" data-action="move">
      <span class="option-key">${keyIndex++}</span>
      <span class="option-text">Move</span>
    </div>`;

    // Melee attack option
    if (currentUnit.meleeDamage !== null) {
      const adjacentEnemies = getAdjacentEnemies(currentUnit);
      if (adjacentEnemies.length > 0) {
        html += `<div class="option" data-action="melee">
          <span class="option-key">${keyIndex++}</span>
          <span class="option-text">Melee Attack (${currentUnit.meleeDamage} dmg)</span>
        </div>`;
      }
    }

    // Ranged attack option
    if (currentUnit.rangedDamage !== null) {
      const enemies = getAllEnemies(currentUnit);
      if (enemies.length > 0) {
        html += `<div class="option" data-action="ranged">
          <span class="option-key">${keyIndex++}</span>
          <span class="option-text">Ranged Attack (${currentUnit.rangedDamage} dmg)</span>
        </div>`;
      }
    }

    // Spell options
    currentUnit.spells.forEach(spellId => {
      const spell = SPELLS[spellId];
      html += `<div class="option" data-action="spell-${spellId}">
        <span class="option-key">${keyIndex++}</span>
        <span class="option-text">${spell.name} (${spell.damage} dmg)</span>
      </div>`;
    });

    html += `<div class="option" data-action="wait">
      <span class="option-key">${keyIndex}</span>
      <span class="option-text">Skip turn</span>
    </div>`;

    optionsEl.innerHTML = html;
    bindMainMenuEvents();

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
    bindMoveMenuEvents();

  } else if (gameState.menuState === 'melee' || gameState.menuState === 'ranged' || gameState.menuState === 'spell') {
    const actionName = gameState.menuState === 'melee' ? 'Melee Attack' :
                       gameState.menuState === 'ranged' ? 'Ranged Attack' :
                       SPELLS[gameState.selectedSpell].name;
    let html = `<div class="options-header">${currentUnit.name} - ${actionName} Target</div>`;
    html += `<div class="option" data-action="cancel">
      <span class="option-key">0</span>
      <span class="option-text">Cancel</span>
    </div>`;

    gameState.validTargets.forEach((target, index) => {
      html += `<div class="option attack-option" data-action="attack-${index}">
        <span class="option-key">${index + 1}</span>
        <span class="option-text">${target.name} (${target.hp}/${target.maxHp} HP)</span>
      </div>`;
    });

    optionsEl.innerHTML = html;
    bindAttackMenuEvents();
  }
}

function bindMainMenuEvents() {
  const optionsEl = document.getElementById('options');
  optionsEl.querySelectorAll('.option').forEach(opt => {
    opt.addEventListener('click', () => {
      const action = opt.dataset.action;
      if (action === 'move') enterMoveMode();
      else if (action === 'melee') enterMeleeMode();
      else if (action === 'ranged') enterRangedMode();
      else if (action.startsWith('spell-')) {
        const spellId = action.replace('spell-', '');
        enterSpellMode(spellId);
      }
      else if (action === 'wait') executeWait();
    });
  });
}

function bindMoveMenuEvents() {
  const optionsEl = document.getElementById('options');
  optionsEl.querySelectorAll('.option').forEach(opt => {
    opt.addEventListener('click', () => {
      const action = opt.dataset.action;
      if (action === 'cancel') exitToMainMenu();
      else if (action.startsWith('move-')) {
        const index = parseInt(action.split('-')[1]);
        executeMove(index);
      }
    });
  });
}

function bindAttackMenuEvents() {
  const optionsEl = document.getElementById('options');
  optionsEl.querySelectorAll('.option').forEach(opt => {
    opt.addEventListener('click', () => {
      const action = opt.dataset.action;
      if (action === 'cancel') exitToMainMenu();
      else if (action.startsWith('attack-')) {
        const index = parseInt(action.split('-')[1]);
        executeAttack(index);
      }
    });
  });
}

function showUnitInfo(unit) {
  const unitInfo = document.getElementById('unit-info');

  if (!unit) {
    unitInfo.innerHTML = '<div class="unit-info-placeholder">Hover over a unit to see details</div>';
    return;
  }

  let statsHtml = `HP: ${unit.hp}/${unit.maxHp}<br>`;
  statsHtml += `AC: ${unit.ac} | SR: ${unit.sr}<br>`;
  if (unit.meleeDamage !== null) statsHtml += `Melee: WC ${unit.wc}, ${unit.meleeDamage} dmg<br>`;
  if (unit.rangedDamage !== null) statsHtml += `Ranged: ${unit.rangedDamage} dmg<br>`;
  if (unit.spells.length > 0) {
    const spellNames = unit.spells.map(s => SPELLS[s].name).join(', ');
    statsHtml += `Spells: ${spellNames}`;
  }

  unitInfo.innerHTML = `
    <div class="unit-info-content">
      <div class="unit-info-title ${unit.team}">${unit.name}</div>
      <div class="unit-info-stats">${statsHtml}</div>
    </div>
  `;
}

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

function enterMeleeMode() {
  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;
  gameState.menuState = 'melee';
  gameState.validTargets = getAdjacentEnemies(currentUnit);
  highlightCells();
  renderOptions();
}

function enterRangedMode() {
  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;
  gameState.menuState = 'ranged';
  gameState.validTargets = getAllEnemies(currentUnit);
  highlightCells();
  renderOptions();
}

function enterSpellMode(spellId) {
  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;
  gameState.menuState = 'spell';
  gameState.selectedSpell = spellId;
  // For offensive spells, target enemies
  gameState.validTargets = getAllEnemies(currentUnit);
  highlightCells();
  renderOptions();
}

function exitToMainMenu() {
  gameState.menuState = 'main';
  gameState.validMoves = [];
  gameState.validTargets = [];
  gameState.selectedSpell = null;
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

function executeAttack(index) {
  if (index < 0 || index >= gameState.validTargets.length) return;
  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;

  const target = gameState.validTargets[index];
  let result;

  if (gameState.menuState === 'melee') {
    result = performMeleeAttack(currentUnit, target);
  } else if (gameState.menuState === 'ranged') {
    result = performRangedAttack(currentUnit, target);
  } else if (gameState.menuState === 'spell') {
    result = castSpell(currentUnit, target, gameState.selectedSpell);
  }

  // Show roll result popup
  showRollResult(result.roll, result.hit, result.critical, result.damage);

  addLogEntry(result.message, currentUnit.team);

  if (result.hit) {
    applyDamage(target, result.damage);
    removeDeadUnits();
  }

  gameState.menuState = 'main';
  gameState.validTargets = [];
  gameState.selectedSpell = null;

  if (!checkGameOver()) {
    endTurn();
  } else {
    renderUnits();
    renderTurnOrder();
    renderOptions();
  }
}

function executeWait() {
  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;
  addLogEntry(`${currentUnit.name} waits.`, currentUnit.team);
  endTurn();
}

function endTurn() {
  gameState.currentUnitIndex++;

  if (gameState.currentUnitIndex >= gameState.turnOrder.length) {
    gameState.currentUnitIndex = 0;
    gameState.turn++;
  }

  renderUnits();
  highlightCells();
  renderTurnOrder();
  renderOptions();

  const currentUnit = getCurrentUnit();
  if (currentUnit && currentUnit.team === 'opponent') {
    setTimeout(() => runOpponentAI(), 600);
  }
}

// ============================================================================
// OPPONENT AI
// ============================================================================

function runOpponentAI() {
  const currentUnit = getCurrentUnit();
  if (!currentUnit || currentUnit.team === 'player') return;

  const playerUnits = gameState.units.filter(u => u.team === 'player');
  if (playerUnits.length === 0) {
    executeWait();
    return;
  }

  // Check for adjacent enemies to melee attack
  const adjacentEnemies = getAdjacentEnemies(currentUnit);
  if (adjacentEnemies.length > 0 && currentUnit.meleeDamage !== null) {
    // Attack the lowest HP enemy
    const target = adjacentEnemies.reduce((a, b) => a.hp < b.hp ? a : b);
    const result = performMeleeAttack(currentUnit, target);

    // Show roll result popup
    showRollResult(result.roll, result.hit, result.critical, result.damage);

    addLogEntry(result.message, 'opponent');

    if (result.hit) {
      applyDamage(target, result.damage);
      removeDeadUnits();
    }

    if (!checkGameOver()) {
      endTurn();
    } else {
      renderUnits();
      renderTurnOrder();
      renderOptions();
    }
    return;
  }

  // Use ranged attack if available
  if (currentUnit.rangedDamage !== null && playerUnits.length > 0) {
    // Target the lowest HP enemy
    const target = playerUnits.reduce((a, b) => a.hp < b.hp ? a : b);
    const result = performRangedAttack(currentUnit, target);

    // Show roll result popup
    showRollResult(result.roll, result.hit, result.critical, result.damage);

    addLogEntry(result.message, 'opponent');

    if (result.hit) {
      applyDamage(target, result.damage);
      removeDeadUnits();
    }

    if (!checkGameOver()) {
      endTurn();
    } else {
      renderUnits();
      renderTurnOrder();
      renderOptions();
    }
    return;
  }

  // Move towards closest player unit
  const adjacent = getAdjacentCells(currentUnit.position);
  if (adjacent.length > 0) {
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

// ============================================================================
// KEYBOARD CONTROLS
// ============================================================================

document.addEventListener('keydown', (event) => {
  const currentUnit = getCurrentUnit();
  if (!currentUnit || currentUnit.team !== 'player') return;

  const key = event.key;

  if (gameState.menuState === 'main') {
    const num = parseInt(key);
    if (!isNaN(num) && num >= 1) {
      const options = document.querySelectorAll('#options .option');
      if (num <= options.length) {
        options[num - 1].click();
      }
    }
  } else {
    if (key === '0' || key === 'Escape') {
      exitToMainMenu();
    } else {
      const num = parseInt(key);
      if (!isNaN(num) && num >= 1) {
        if (gameState.menuState === 'move' && num <= gameState.validMoves.length) {
          executeMove(num - 1);
        } else if ((gameState.menuState === 'melee' || gameState.menuState === 'ranged' || gameState.menuState === 'spell')
                   && num <= gameState.validTargets.length) {
          executeAttack(num - 1);
        }
      }
    }
  }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

function initGame() {
  gameState.units = createInitialUnits();
  const allUnitIds = gameState.units.map(u => u.id);
  gameState.turnOrder = shuffleArray(allUnitIds);
  gameState.currentUnitIndex = 0;

  createGrid();
  renderUnits();
  highlightCells();
  renderTurnOrder();
  renderOptions();

  addLogEntry('Game started. Fight!');

  const firstUnit = getCurrentUnit();
  if (firstUnit && firstUnit.team === 'opponent') {
    setTimeout(() => runOpponentAI(), 600);
  }

  console.log('Game Arena initialized with combat!');
}

initGame();
