/**
 * Game UI - Rendering, DOM manipulation, and event handling
 * Depends on engine.js for game logic
 *
 * Zone-based UI: 5 zones arranged horizontally
 * Units within a zone are stacked vertically
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

    // Add zone label
    const label = document.createElement('div');
    label.className = 'zone-label';
    label.textContent = `Zone ${zone}`;
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

      // Taunt indicator behind unit
      if (unit.taunt) {
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

      // Taunted indicator (shown on hover when unit can't move forward due to taunt)
      if (isTaunted(unit)) {
        const tauntedEl = document.createElement('div');
        tauntedEl.className = 'taunted-indicator';
        tauntedEl.textContent = '🚫';
        tauntedEl.title = 'Blocked by Taunt - need more allies in this zone to advance';
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
  // Remove previous highlights from zones
  document.querySelectorAll('.zone').forEach(zone => {
    zone.classList.remove('move-forward-target', 'move-backward-target', 'melee-zone', 'taunt-blocked', 'arrow-left', 'arrow-right');
    zone.onclick = null;
    zone.title = '';
  });

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
    // Determine arrow directions based on team
    // Player: forward = right, backward = left
    // Opponent: forward = left, backward = right
    const forwardArrow = currentUnit.team === 'player' ? 'arrow-right' : 'arrow-left';
    const backwardArrow = currentUnit.team === 'player' ? 'arrow-left' : 'arrow-right';

    // Highlight zones for movement
    if (canMoveForward(currentUnit)) {
      const forwardZone = getForwardZone(currentUnit);
      const zoneEl = document.querySelector(`.zone[data-zone="${forwardZone}"]`);
      if (zoneEl) {
        zoneEl.classList.add('move-forward-target', forwardArrow);
        zoneEl.onclick = () => executeMoveForward();
      }
    } else if (isTaunted(currentUnit)) {
      // Show blocked indicator on forward zone
      const forwardZone = getForwardZone(currentUnit);
      const zoneEl = document.querySelector(`.zone[data-zone="${forwardZone}"]`);
      if (zoneEl) {
        zoneEl.classList.add('taunt-blocked');
        zoneEl.title = 'Blocked by Taunt - need more allies in this zone to advance';
      }
    }

    if (canMoveBackward(currentUnit)) {
      const backwardZone = getBackwardZone(currentUnit);
      const zoneEl = document.querySelector(`.zone[data-zone="${backwardZone}"]`);
      if (zoneEl) {
        zoneEl.classList.add('move-backward-target', backwardArrow);
        zoneEl.onclick = () => executeMoveBackward();
      }
    }

    // Highlight melee targets in same zone
    if (currentUnit.meleeDamage !== null) {
      const { targets: meleeTargets, protected: protectedUnits } = getValidMeleeTargets(currentUnit);

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

      protectedUnits.forEach(target => {
        const wrapper = document.querySelector(`.unit-wrapper[data-unit-id="${target.id}"]`);
        if (wrapper) {
          wrapper.classList.add('protected-target');
        }
      });
    }

    // Highlight ranged targets (all enemies not in same zone, or all if no melee)
    if (currentUnit.rangedDamage !== null) {
      const allEnemies = getAllEnemies(currentUnit);
      const enemiesInSameZone = getEnemiesInSameZone(currentUnit);

      allEnemies.forEach(target => {
        const wrapper = document.querySelector(`.unit-wrapper[data-unit-id="${target.id}"]`);
        if (wrapper) {
          // If enemy is in same zone and we have melee, don't show ranged option
          const isInSameZone = enemiesInSameZone.some(e => e.id === target.id);
          if (!isInSameZone || currentUnit.meleeDamage === null) {
            if (!wrapper.classList.contains('melee-target')) {
              wrapper.classList.add('ranged-target');
              wrapper.onclick = () => {
                gameState.menuState = 'ranged';
                gameState.validTargets = allEnemies;
                const index = allEnemies.findIndex(t => t.id === target.id);
                executeAttack(index);
              };
            }
          }
        }
      });
    }

    // Highlight spell targets
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
      <span class="turn-order-zone">Z${unit.zone}</span>
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
    let html = `<div class="options-header">${currentUnit.name} - Actions (Zone ${currentUnit.zone})</div>`;
    let keyIndex = 1;

    // Move Forward option
    if (canMoveForward(currentUnit)) {
      html += `<div class="option" data-action="move-forward">
        <span class="option-key">${keyIndex++}</span>
        <span class="option-text">Move Forward → Zone ${getForwardZone(currentUnit)}</span>
      </div>`;
    }

    // Move Backward option
    if (canMoveBackward(currentUnit)) {
      html += `<div class="option" data-action="move-backward">
        <span class="option-key">${keyIndex++}</span>
        <span class="option-text">Move Backward → Zone ${getBackwardZone(currentUnit)}</span>
      </div>`;
    }

    // Melee attack option (only if enemies in same zone)
    if (currentUnit.meleeDamage !== null) {
      const { targets: meleeTargets } = getValidMeleeTargets(currentUnit);
      if (meleeTargets.length > 0) {
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
      const distance = getDistance(currentUnit, target);
      html += `<div class="option attack-option" data-action="attack-${index}">
        <span class="option-key">${index + 1}</span>
        <span class="option-text">${target.name} (${target.hp}/${target.maxHp} HP) - ${distance === 0 ? 'Same zone' : `${distance} zone${distance > 1 ? 's' : ''} away`}</span>
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
      if (action === 'move-forward') executeMoveForward();
      else if (action === 'move-backward') executeMoveBackward();
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
  statsHtml += `Zone: ${unit.zone}<br>`;
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

function executeMoveForward() {
  const currentUnit = getCurrentUnit();
  if (!currentUnit || !canMoveForward(currentUnit)) return;

  const oldZone = currentUnit.zone;
  const newZone = getForwardZone(currentUnit);
  currentUnit.zone = newZone;

  addLogEntry(`${currentUnit.name} advances from Zone ${oldZone} to Zone ${newZone}.`, currentUnit.team);

  gameState.menuState = 'main';
  endTurn();
}

function executeMoveBackward() {
  const currentUnit = getCurrentUnit();
  if (!currentUnit || !canMoveBackward(currentUnit)) return;

  const oldZone = currentUnit.zone;
  const newZone = getBackwardZone(currentUnit);
  currentUnit.zone = newZone;

  addLogEntry(`${currentUnit.name} retreats from Zone ${oldZone} to Zone ${newZone}.`, currentUnit.team);

  gameState.menuState = 'main';
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

  // Check for enemies in same zone to melee attack (respecting Taunt)
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

  // Use ranged attack if available and no melee targets
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

  // Try to move forward towards player units
  if (canMoveForward(currentUnit)) {
    const oldZone = currentUnit.zone;
    currentUnit.zone = getForwardZone(currentUnit);
    addLogEntry(`${currentUnit.name} advances from Zone ${oldZone} to Zone ${currentUnit.zone}.`, 'opponent');
    endTurn();
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

  console.log('GM Arena (Zones variant) initialized!');
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
