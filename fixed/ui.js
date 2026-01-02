/**
 * Game UI - Rendering, DOM manipulation, and event handling
 * Depends on engine.js for game logic
 *
 * Fixed position zones: AR, AM, BM, BR
 * Units are assigned at start and never move
 */

// ============================================================================
// RENDERING
// ============================================================================

function createZones() {
  const gridEl = document.getElementById('grid');
  gridEl.innerHTML = '';
  gridEl.className = 'zones-container';

  for (let zone = 0; zone < NUM_ZONES; zone++) {
    const zoneEl = document.createElement('div');
    zoneEl.className = 'zone';
    zoneEl.dataset.zone = zone;

    // Add zone label with name
    const label = document.createElement('div');
    label.className = 'zone-label';
    label.textContent = ZONE_NAMES[zone];
    zoneEl.appendChild(label);

    // Container for units
    const unitsContainer = document.createElement('div');
    unitsContainer.className = 'zone-units';
    zoneEl.appendChild(unitsContainer);

    gridEl.appendChild(zoneEl);
  }
}

function renderUnits() {
  // Clear all units from zones
  document.querySelectorAll('.zone-units').forEach(container => {
    container.innerHTML = '';
  });

  // Group units by zone
  for (let zone = 0; zone < NUM_ZONES; zone++) {
    const unitsInZone = getUnitsInZone(zone);
    const container = document.querySelector(`.zone[data-zone="${zone}"] .zone-units`);
    if (!container) continue;

    unitsInZone.forEach(unit => {
      const unitWrapper = document.createElement('div');
      unitWrapper.className = `unit-wrapper ${unit.team}`;
      unitWrapper.dataset.unitId = unit.id;

      // Taunt duration indicator (shows if this unit applies taunt on melee)
      if (unit.tauntDuration > 0) {
        const tauntEl = document.createElement('div');
        tauntEl.className = 'taunt-indicator';
        tauntEl.innerHTML = TAUNT_SHIELD_SVG;
        unitWrapper.appendChild(tauntEl);
      }

      // Unit sprite
      const el = document.createElement('div');
      el.className = `entity ${unit.team}`;
      el.id = unit.id;
      el.innerHTML = UNIT_SVGS[unit.type];
      unitWrapper.appendChild(el);

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
      unitWrapper.appendChild(hpContainer);

      // Unit name label
      const nameLabel = document.createElement('div');
      nameLabel.className = 'unit-name';
      nameLabel.textContent = unit.name;
      unitWrapper.appendChild(nameLabel);

      // Taunted status indicator (shows when unit is under taunt effect)
      if (isTaunted(unit)) {
        const tauntedEl = document.createElement('div');
        tauntedEl.className = 'taunted-indicator';
        const taunters = getActiveTaunters(unit);
        const tauntInfo = unit.tauntedBy.map(e => {
          const taunter = gameState.units.find(u => u.id === e.taunterId);
          return taunter ? `${taunter.name} (${e.duration})` : `??? (${e.duration})`;
        }).join(', ');
        tauntedEl.textContent = '⚔️';
        tauntedEl.title = `Taunted by: ${tauntInfo}`;
        unitWrapper.appendChild(tauntedEl);
      }

      container.appendChild(unitWrapper);

      // Hover events
      unitWrapper.addEventListener('mouseenter', () => showUnitInfo(unit));
      unitWrapper.addEventListener('mouseleave', () => showUnitInfo(null));
    });
  }

  highlightCurrentUnit();
}

function highlightCurrentUnit() {
  // Remove previous highlights
  document.querySelectorAll('.unit-wrapper').forEach(el => {
    el.classList.remove('active-unit');
  });

  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;

  const unitWrapper = document.querySelector(`.unit-wrapper[data-unit-id="${currentUnit.id}"]`);
  if (unitWrapper) {
    unitWrapper.classList.add('active-unit');
  }
}

function highlightZones() {
  // Remove target highlights from units
  document.querySelectorAll('.unit-wrapper').forEach(el => {
    el.classList.remove('melee-target', 'ranged-target', 'spell-target', 'protected-target');
    el.onclick = null;
  });

  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;

  highlightCurrentUnit();

  if (!isPlayerControlled(currentUnit)) return;

  if (gameState.menuState === 'main') {
    // Highlight melee targets (adjacent zone or taunters)
    if (currentUnit.meleeDamage !== null) {
      const { targets: meleeTargets, mustAttackTaunters } = getValidMeleeTargets(currentUnit);

      meleeTargets.forEach(target => {
        const wrapper = document.querySelector(`.unit-wrapper[data-unit-id="${target.id}"]`);
        if (wrapper) {
          wrapper.classList.add('melee-target');
          wrapper.onclick = () => {
            gameState.menuState = 'melee';
            gameState.validTargets = meleeTargets;
            const index = meleeTargets.findIndex(t => t.id === target.id);
            executeAttack(index);
          };
        }
      });
    }

    // Highlight ranged targets (all enemies)
    if (currentUnit.rangedDamage !== null) {
      const allEnemies = getAllEnemies(currentUnit);

      allEnemies.forEach(target => {
        const wrapper = document.querySelector(`.unit-wrapper[data-unit-id="${target.id}"]`);
        if (wrapper && !wrapper.classList.contains('melee-target')) {
          wrapper.classList.add('ranged-target');
          wrapper.onclick = () => {
            gameState.menuState = 'ranged';
            gameState.validTargets = allEnemies;
            const index = allEnemies.findIndex(t => t.id === target.id);
            executeAttack(index);
          };
        }
      });
    }

    // Highlight spell targets (all enemies)
    if (currentUnit.spells.length > 0) {
      const allEnemies = getAllEnemies(currentUnit);
      allEnemies.forEach(target => {
        const wrapper = document.querySelector(`.unit-wrapper[data-unit-id="${target.id}"]`);
        if (wrapper && !wrapper.classList.contains('melee-target') && !wrapper.classList.contains('ranged-target')) {
          wrapper.classList.add('spell-target');
        }
      });
    }

  } else if (gameState.menuState === 'melee' || gameState.menuState === 'ranged' || gameState.menuState === 'spell') {
    // Highlight valid targets with numbers
    gameState.validTargets.forEach((target, index) => {
      const wrapper = document.querySelector(`.unit-wrapper[data-unit-id="${target.id}"]`);
      if (wrapper) {
        const className = gameState.menuState === 'melee' ? 'melee-target' :
                          gameState.menuState === 'ranged' ? 'ranged-target' : 'spell-target';
        wrapper.classList.add(className);
        wrapper.onclick = () => executeAttack(index);

        // Add number indicator
        let numEl = wrapper.querySelector('.target-number');
        if (!numEl) {
          numEl = document.createElement('div');
          numEl.className = 'target-number';
          wrapper.appendChild(numEl);
        }
        numEl.textContent = index + 1;
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
      <span class="turn-order-zone">${ZONE_NAMES[unit.zone]}</span>
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
    let html = `<div class="options-header">${currentUnit.name} - Actions (${ZONE_NAMES[currentUnit.zone]})</div>`;
    let keyIndex = 1;

    // Melee attack option
    if (currentUnit.meleeDamage !== null) {
      const { targets: meleeTargets, mustAttackTaunters } = getValidMeleeTargets(currentUnit);
      if (meleeTargets.length > 0) {
        const tauntNote = mustAttackTaunters ? ' [TAUNTED]' : '';
        const tauntInfo = currentUnit.tauntDuration > 0 ? `, Taunt ${currentUnit.tauntDuration}` : '';
        html += `<div class="option" data-action="melee">
          <span class="option-key">${keyIndex++}</span>
          <span class="option-text">Melee Attack (${currentUnit.meleeDamage} dmg${tauntInfo})${tauntNote}</span>
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
        <span class="option-text">${target.name} (${target.hp}/${target.maxHp} HP) - ${ZONE_NAMES[target.zone]}</span>
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
      if (action === 'melee') enterMeleeMode();
      else if (action === 'ranged') enterRangedMode();
      else if (action.startsWith('spell-')) {
        const spellId = action.replace('spell-', '');
        enterSpellMode(spellId);
      }
      else if (action === 'wait') executeWait();
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
  statsHtml += `Zone: ${ZONE_NAMES[unit.zone]}<br>`;
  statsHtml += `AC: ${unit.ac} | SR: ${unit.sr}<br>`;
  if (unit.meleeDamage !== null) {
    const tauntInfo = unit.tauntDuration > 0 ? ` + Taunt ${unit.tauntDuration}` : '';
    statsHtml += `Melee: WC ${unit.wc}, ${unit.meleeDamage} dmg${tauntInfo}<br>`;
  }
  if (unit.rangedDamage !== null) statsHtml += `Ranged: ${unit.rangedDamage} dmg<br>`;
  if (unit.spells.length > 0) {
    const spellNames = unit.spells.map(s => SPELLS[s].name).join(', ');
    statsHtml += `Spells: ${spellNames}<br>`;
  }
  // Show taunt effects on this unit
  if (unit.tauntedBy && unit.tauntedBy.length > 0) {
    const tauntInfo = unit.tauntedBy.map(e => {
      const taunter = gameState.units.find(u => u.id === e.taunterId);
      return taunter ? `${taunter.name} (${e.duration})` : `??? (${e.duration})`;
    }).join(', ');
    statsHtml += `<span style="color: #ef4444;">Taunted by: ${tauntInfo}</span>`;
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

function enterMeleeMode() {
  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;
  gameState.menuState = 'melee';
  const { targets } = getValidMeleeTargets(currentUnit);
  gameState.validTargets = targets;
  highlightZones();
  renderOptions();
}

function enterRangedMode() {
  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;
  gameState.menuState = 'ranged';
  gameState.validTargets = getAllEnemies(currentUnit);
  highlightZones();
  renderOptions();
}

function enterSpellMode(spellId) {
  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;
  gameState.menuState = 'spell';
  gameState.selectedSpell = spellId;
  // For offensive spells, target enemies
  gameState.validTargets = getAllEnemies(currentUnit);
  highlightZones();
  renderOptions();
}

function exitToMainMenu() {
  gameState.menuState = 'main';
  gameState.validTargets = [];
  gameState.selectedSpell = null;

  // Remove target numbers
  document.querySelectorAll('.target-number').forEach(el => el.remove());

  highlightZones();
  renderOptions();
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

  // Remove target numbers
  document.querySelectorAll('.target-number').forEach(el => el.remove());

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
  // Decrement taunt durations for the unit that just acted
  const prevUnit = getCurrentUnit();
  if (prevUnit) {
    decrementTaunts(prevUnit);
  }

  gameState.currentUnitIndex++;

  if (gameState.currentUnitIndex >= gameState.turnOrder.length) {
    gameState.currentUnitIndex = 0;
    gameState.turn++;
  }

  renderUnits();
  highlightZones();
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

  // Check for melee targets (adjacent zone or taunters)
  if (currentUnit.meleeDamage !== null) {
    const { targets: meleeTargets } = getValidMeleeTargets(currentUnit);
    if (meleeTargets.length > 0) {
      // Attack the lowest HP valid target
      const target = meleeTargets.reduce((a, b) => a.hp < b.hp ? a : b);
      gameState.menuState = 'melee';
      gameState.validTargets = meleeTargets;
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

      gameState.menuState = 'main';
      gameState.validTargets = [];

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
    gameState.menuState = 'ranged';
    gameState.validTargets = playerUnits;
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

    gameState.menuState = 'main';
    gameState.validTargets = [];

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

  // Can't do anything, wait
  addLogEntry(`${currentUnit.name} waits.`, 'opponent');
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
        if ((gameState.menuState === 'melee' || gameState.menuState === 'ranged' || gameState.menuState === 'spell')
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

  createZones();
  renderUnits();
  highlightZones();
  renderTurnOrder();
  renderOptions();

  addLogEntry('Game started. Fight!');

  const firstUnit = getCurrentUnit();
  if (firstUnit && firstUnit.team === 'opponent' && !gameState.playerControlsBoth) {
    setTimeout(() => runOpponentAI(), 600);
  }

  console.log('GM Arena (Fixed positions variant) initialized!');
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
      highlightZones();
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
