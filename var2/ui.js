/**
 * Game UI - Rendering, DOM manipulation, and event handling
 * Depends on engine.js for game logic
 */

// ============================================================================
// DOM HELPERS
// ============================================================================

function getCellAt(row, col) {
  return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
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
  document.querySelectorAll('.taunt-indicator').forEach(el => el.remove());
  document.querySelectorAll('.protected-indicator').forEach(el => el.remove());

  gameState.units.forEach(unit => {
    const cell = getCellAt(unit.position.row, unit.position.col);
    if (!cell) return;

    // Add taunt shield watermark behind taunters
    if (unit.taunt) {
      const tauntEl = document.createElement('div');
      tauntEl.className = 'taunt-indicator';
      tauntEl.innerHTML = TAUNT_SHIELD_SVG;
      cell.appendChild(tauntEl);
    }

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
    cell.classList.remove('highlight', 'move-option', 'melee-target', 'ranged-target', 'attack-target', 'active-unit', 'protected-target');
    cell.onclick = null;
    const numEl = cell.querySelector('.cell-number');
    if (numEl) numEl.remove();
  });

  // Remove protected indicators
  document.querySelectorAll('.protected-indicator').forEach(el => el.remove());

  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;

  // Highlight current unit's cell
  const currentCell = getCellAt(currentUnit.position.row, currentUnit.position.col);
  if (currentCell) {
    currentCell.classList.add('active-unit');
  }

  if (!isPlayerControlled(currentUnit)) return;

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

    // Melee targets (adjacent enemies) - respecting Taunt
    if (currentUnit.meleeDamage !== null) {
      const { targets: meleeTargets, protected: protectedUnits } = getValidMeleeTargets(currentUnit);

      // Show valid melee targets
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

      // Show protected units with shield indicator
      protectedUnits.forEach(unit => {
        const cell = getCellAt(unit.position.row, unit.position.col);
        if (cell) {
          cell.classList.add('protected-target');
          // Add protected shield indicator
          const protectedEl = document.createElement('div');
          protectedEl.className = 'protected-indicator';
          protectedEl.innerHTML = PROTECTED_SHIELD_SVG;
          cell.appendChild(protectedEl);
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

  if (!isPlayerControlled(currentUnit)) {
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
      <span class="option-key">0</span>
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
    statsHtml += `Spells: ${spellNames}<br>`;
  }
  if (unit.taunt) statsHtml += `<span style="color: #4a9eff;">Taunt</span>`;

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
  const { targets } = getValidMeleeTargets(currentUnit);
  gameState.validTargets = targets;
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
    const deadUnits = removeDeadUnits();
    deadUnits.forEach(unit => {
      addLogEntry(`${unit.name} has fallen!`, unit.team);
    });
  }

  gameState.menuState = 'main';
  gameState.validTargets = [];
  gameState.selectedSpell = null;

  const gameResult = checkGameOver();
  if (gameResult === 'ongoing') {
    endTurn();
  } else {
    if (gameResult === 'defeat') {
      addLogEntry('DEFEAT! All your units have fallen.', 'neutral');
    } else {
      addLogEntry('VICTORY! All enemies have been defeated!', 'neutral');
    }
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
  if (currentUnit && currentUnit.team === 'opponent' && !gameState.playerControlsBoth) {
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

  // Check for adjacent enemies to melee attack (respecting Taunt)
  if (currentUnit.meleeDamage !== null) {
    const { targets: meleeTargets } = getValidMeleeTargets(currentUnit);
    if (meleeTargets.length > 0) {
      // Attack the lowest HP valid target
      const target = meleeTargets.reduce((a, b) => a.hp < b.hp ? a : b);
      const result = performMeleeAttack(currentUnit, target);

      // Show roll result popup
      showRollResult(result.roll, result.hit, result.critical, result.damage);

      addLogEntry(result.message, 'opponent');

      if (result.hit) {
        applyDamage(target, result.damage);
        const deadUnits = removeDeadUnits();
        deadUnits.forEach(unit => {
          addLogEntry(`${unit.name} has fallen!`, unit.team);
        });
      }

      const gameResult = checkGameOver();
      if (gameResult === 'ongoing') {
        endTurn();
      } else {
        if (gameResult === 'defeat') {
          addLogEntry('DEFEAT! All your units have fallen.', 'neutral');
        } else {
          addLogEntry('VICTORY! All enemies have been defeated!', 'neutral');
        }
        renderUnits();
        renderTurnOrder();
        renderOptions();
      }
      return;
    }
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
      const deadUnits = removeDeadUnits();
      deadUnits.forEach(unit => {
        addLogEntry(`${unit.name} has fallen!`, unit.team);
      });
    }

    const gameResult = checkGameOver();
    if (gameResult === 'ongoing') {
      endTurn();
    } else {
      if (gameResult === 'defeat') {
        addLogEntry('DEFEAT! All your units have fallen.', 'neutral');
      } else {
        addLogEntry('VICTORY! All enemies have been defeated!', 'neutral');
      }
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
  if (!currentUnit || !isPlayerControlled(currentUnit)) return;

  const key = event.key;

  if (gameState.menuState === 'main') {
    if (key === '0') {
      executeWait();
    } else {
      const num = parseInt(key);
      if (!isNaN(num) && num >= 1) {
        const options = document.querySelectorAll('#options .option');
        if (num <= options.length) {
          options[num - 1].click();
        }
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
  if (firstUnit && firstUnit.team === 'opponent' && !gameState.playerControlsBoth) {
    setTimeout(() => runOpponentAI(), 600);
  }

  console.log('Game Arena initialized with combat!');
}

// ============================================================================
// DEBUG UI
// ============================================================================

function initDebugUI() {
  // Log panel toggle
  const logPanel = document.getElementById('log');
  const logToggle = document.getElementById('log-toggle');
  const logHeader = document.querySelector('.log-header');

  if (logToggle && logPanel) {
    logToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      logPanel.classList.toggle('minimized');
      logToggle.textContent = logPanel.classList.contains('minimized') ? '+' : '−';
      logToggle.title = logPanel.classList.contains('minimized') ? 'Expand' : 'Minimize';
    });

    // Also toggle when clicking the header
    logHeader.addEventListener('click', () => {
      logPanel.classList.toggle('minimized');
      logToggle.textContent = logPanel.classList.contains('minimized') ? '+' : '−';
      logToggle.title = logPanel.classList.contains('minimized') ? 'Expand' : 'Minimize';
    });
  }

  // Debug panel toggle
  const debugPanel = document.getElementById('debug-panel');
  const debugToggle = document.getElementById('debug-toggle');
  const debugHeader = document.querySelector('.debug-header');

  if (debugToggle && debugPanel) {
    debugToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      debugPanel.classList.toggle('minimized');
      debugToggle.textContent = debugPanel.classList.contains('minimized') ? '+' : '−';
      debugToggle.title = debugPanel.classList.contains('minimized') ? 'Expand' : 'Minimize';
    });

    debugHeader.addEventListener('click', () => {
      debugPanel.classList.toggle('minimized');
      debugToggle.textContent = debugPanel.classList.contains('minimized') ? '+' : '−';
      debugToggle.title = debugPanel.classList.contains('minimized') ? 'Expand' : 'Minimize';
    });
  }

  // Control both teams checkbox
  const controlBothCheckbox = document.getElementById('debug-control-both');
  if (controlBothCheckbox) {
    // Initialize checkbox state from gameState
    controlBothCheckbox.checked = gameState.playerControlsBoth;

    controlBothCheckbox.addEventListener('change', () => {
      gameState.playerControlsBoth = controlBothCheckbox.checked;
      // Re-render to apply changes immediately
      highlightCells();
      renderOptions();

      // If it's opponent's turn and we just disabled control, trigger AI
      const currentUnit = getCurrentUnit();
      if (currentUnit && currentUnit.team === 'opponent' && !gameState.playerControlsBoth) {
        setTimeout(() => runOpponentAI(), 600);
      }
    });
  }
}

// Start the game
initGame();
initDebugUI();
