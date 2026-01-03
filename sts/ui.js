/**
 * Game UI - Rendering, DOM manipulation, and event handling
 * Depends on engine.js for game logic
 *
 * 3 zones: A - X - B
 * Card-based combat system
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
        const tauntInfo = taunters.map(t => t.name).join(', ');
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

function highlightTargets() {
  // Remove target highlights from units
  document.querySelectorAll('.unit-wrapper').forEach(el => {
    el.classList.remove('melee-target', 'ranged-target');
    el.onclick = null;
  });

  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;

  highlightCurrentUnit();

  if (!isPlayerControlled(currentUnit)) return;

  // Only highlight when in targeting phase
  if (gameState.phase === 'targeting' && gameState.validTargets.length > 0) {
    const targetClass = isMeleeUnit(currentUnit) ? 'melee-target' : 'ranged-target';

    gameState.validTargets.forEach((target, index) => {
      const wrapper = document.querySelector(`.unit-wrapper[data-unit-id="${target.id}"]`);
      if (wrapper) {
        wrapper.classList.add(targetClass);
        wrapper.onclick = () => executeCardOnTarget(index);

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

function renderHand() {
  const handEl = document.getElementById('options');
  const currentUnit = getCurrentUnit();

  if (!currentUnit) {
    handEl.innerHTML = '<div class="hand-header">Game Over</div>';
    return;
  }

  // Check if melee unit needs to advance (requires discarding a card)
  if (needsToAdvance(currentUnit)) {
    if (isPlayerControlled(currentUnit)) {
      const hand = getCurrentHand();
      let html = `
        <div class="hand-header">${currentUnit.name} - Discard to Advance</div>
        <div class="advance-message">Choose a card to discard, then advance to Zone X.</div>
      `;

      // Show cards to discard
      hand.forEach((cardId, index) => {
        const card = CARDS[cardId];
        html += `
          <div class="card discard-card" data-discard-index="${index}">
            <div class="card-key">${index + 1}</div>
            <div class="card-name">${card.name}</div>
            <div class="card-desc">Discard</div>
          </div>
        `;
      });

      handEl.innerHTML = html;
      bindDiscardEvents();
    } else {
      handEl.innerHTML = `<div class="hand-header">${currentUnit.name} is advancing...</div>`;
    }
    return;
  }

  if (!isPlayerControlled(currentUnit)) {
    handEl.innerHTML = `<div class="hand-header">${currentUnit.name}'s Turn...</div>`;
    return;
  }

  const hand = getCurrentHand();

  if (gameState.phase === 'play') {
    let html = `<div class="hand-header">${currentUnit.name} - Hand (${ZONE_NAMES[currentUnit.zone]})</div>`;

    // Show cards in hand
    hand.forEach((cardId, index) => {
      const card = CARDS[cardId];
      html += `
        <div class="card" data-card-index="${index}">
          <div class="card-key">${index + 1}</div>
          <div class="card-name">${card.name}</div>
          <div class="card-desc">${card.description}</div>
        </div>
      `;
    });

    // End turn option
    html += `
      <div class="card skip-card" data-action="skip">
        <div class="card-key">E</div>
        <div class="card-name">End Turn</div>
        <div class="card-desc">End turn without playing</div>
      </div>
    `;

    handEl.innerHTML = html;
    bindCardEvents();

  } else if (gameState.phase === 'targeting') {
    const card = CARDS[gameState.selectedCard];
    let html = `<div class="hand-header">${currentUnit.name} - Select Target for ${card.name}</div>`;

    html += `
      <div class="card cancel-card" data-action="cancel">
        <div class="card-key">0</div>
        <div class="card-name">Cancel</div>
        <div class="card-desc">Go back</div>
      </div>
    `;

    gameState.validTargets.forEach((target, index) => {
      html += `
        <div class="card target-card" data-target-index="${index}">
          <div class="card-key">${index + 1}</div>
          <div class="card-name">${target.name}</div>
          <div class="card-desc">${target.hp}/${target.maxHp} HP - Zone ${ZONE_NAMES[target.zone]}</div>
        </div>
      `;
    });

    handEl.innerHTML = html;
    bindTargetEvents();
  }
}

function bindDiscardEvents() {
  const handEl = document.getElementById('options');
  handEl.querySelectorAll('.card[data-discard-index]').forEach(card => {
    card.addEventListener('click', () => {
      const index = parseInt(card.dataset.discardIndex);
      executeAdvanceWithDiscard(index);
    });
  });
}

function bindCardEvents() {
  const handEl = document.getElementById('options');

  // Card selection
  handEl.querySelectorAll('.card[data-card-index]').forEach(card => {
    card.addEventListener('click', () => {
      const index = parseInt(card.dataset.cardIndex);
      selectCard(index);
    });
  });

  // Skip turn
  const skipCard = handEl.querySelector('[data-action="skip"]');
  if (skipCard) {
    skipCard.addEventListener('click', executeSkip);
  }
}

function bindTargetEvents() {
  const handEl = document.getElementById('options');

  // Cancel
  const cancelCard = handEl.querySelector('[data-action="cancel"]');
  if (cancelCard) {
    cancelCard.addEventListener('click', cancelTargeting);
  }

  // Target selection
  handEl.querySelectorAll('.card[data-target-index]').forEach(card => {
    card.addEventListener('click', () => {
      const index = parseInt(card.dataset.targetIndex);
      executeCardOnTarget(index);
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
  statsHtml += `Range: ${unit.attackRange}<br>`;
  statsHtml += `Type: ${unit.attackType}<br>`;
  statsHtml += `Damage: ${unit.damage}<br>`;

  // Show taunt effects on this unit
  if (isTaunted(unit)) {
    const taunters = getActiveTaunters(unit);
    const tauntInfo = taunters.map(t => t.name).join(', ');
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
 * Show damage popup near the target unit
 */
function showDamagePopup(damage, targetId) {
  // Remove any existing popup
  const existing = document.querySelector('.damage-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.className = 'damage-popup';
  popup.innerHTML = `<span class="damage-number">${damage}</span><span class="damage-text">dmg</span>`;

  // Position near the target unit
  const targetWrapper = document.querySelector(`.unit-wrapper[data-unit-id="${targetId}"]`);
  if (targetWrapper) {
    const rect = targetWrapper.getBoundingClientRect();
    popup.style.left = `${rect.left + rect.width / 2}px`;
    popup.style.top = `${rect.top}px`;
    popup.style.transform = 'translateX(-50%)';
  }

  document.body.appendChild(popup);

  // Remove after animation
  setTimeout(() => popup.remove(), 1000);
}

// ============================================================================
// GAME ACTIONS
// ============================================================================

function executeAdvanceWithDiscard(cardIndex) {
  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;

  // Discard the selected card
  const cardId = playCard(currentUnit.team, cardIndex);
  const card = CARDS[cardId];

  addLogEntry(`${currentUnit.name} discards ${card.name} and advances to Zone X!`, currentUnit.team);
  advanceUnit(currentUnit);

  endTurn();
}

function selectCard(cardIndex) {
  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;

  const hand = getCurrentHand();
  if (cardIndex < 0 || cardIndex >= hand.length) return;

  const cardId = hand[cardIndex];
  const card = CARDS[cardId];

  if (card.requiresTarget) {
    // Get valid targets
    const { targets, mustAttackTaunters } = getValidAttackTargets(currentUnit);

    if (targets.length === 0) {
      addLogEntry('No valid targets!', 'neutral');
      return;
    }

    gameState.phase = 'targeting';
    gameState.selectedCard = cardId;
    gameState.validTargets = targets;

    if (mustAttackTaunters) {
      addLogEntry(`${currentUnit.name} is taunted! Must attack taunter.`, 'neutral');
    }

    highlightTargets();
    renderHand();
  }
}

function cancelTargeting() {
  gameState.phase = 'play';
  gameState.selectedCard = null;
  gameState.validTargets = [];

  // Remove target numbers
  document.querySelectorAll('.target-number').forEach(el => el.remove());

  highlightTargets();
  renderHand();
}

function executeCardOnTarget(targetIndex) {
  if (targetIndex < 0 || targetIndex >= gameState.validTargets.length) return;

  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;

  const target = gameState.validTargets[targetIndex];
  const cardId = gameState.selectedCard;

  // Play the card from hand
  const hand = currentUnit.team === 'player' ? gameState.playerHand : gameState.opponentHand;
  const cardIndex = hand.indexOf(cardId);
  if (cardIndex !== -1) {
    playCard(currentUnit.team, cardIndex);
  }

  // Execute the attack
  const result = performAttack(currentUnit, target);
  addLogEntry(result.message, currentUnit.team);

  // Show damage popup near target
  showDamagePopup(result.damage, target.id);

  // Apply damage
  const died = applyDamage(target, result.damage);
  if (died) {
    const deadUnits = removeDeadUnits();
    deadUnits.forEach(unit => {
      addLogEntry(`${unit.name} has fallen!`, unit.team);
    });
  }

  // Reset state
  gameState.phase = 'play';
  gameState.selectedCard = null;
  gameState.validTargets = [];

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
    renderHand();
  }
}

function executeSkip() {
  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;
  addLogEntry(`${currentUnit.name} ends their turn.`, currentUnit.team);
  endTurn();
}

function endTurn() {
  // Decrement effects for the unit that just acted
  const prevUnit = getCurrentUnit();
  if (prevUnit) {
    decrementEffects(prevUnit);
  }

  // Draw cards for this team
  if (prevUnit) {
    drawCards(prevUnit.team);
  }

  gameState.currentUnitIndex++;

  if (gameState.currentUnitIndex >= gameState.turnOrder.length) {
    gameState.currentUnitIndex = 0;
    gameState.turn++;
  }

  renderUnits();
  highlightTargets();
  renderTurnOrder();
  renderHand();

  const currentUnit = getCurrentUnit();

  // Handle melee units needing to advance (must discard a card)
  if (currentUnit && needsToAdvance(currentUnit)) {
    if (!isPlayerControlled(currentUnit)) {
      // AI auto-advances by discarding first card
      setTimeout(() => {
        const hand = currentUnit.team === 'player' ? gameState.playerHand : gameState.opponentHand;
        if (hand.length > 0) {
          const cardId = playCard(currentUnit.team, 0);
          const card = CARDS[cardId];
          addLogEntry(`${currentUnit.name} discards ${card.name} and advances to Zone X!`, currentUnit.team);
        } else {
          addLogEntry(`${currentUnit.name} advances to Zone X!`, currentUnit.team);
        }
        advanceUnit(currentUnit);
        endTurn();
      }, 600);
    }
    return;
  }

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

  const hand = gameState.opponentHand;
  if (hand.length === 0) {
    addLogEntry(`${currentUnit.name} has no cards!`, 'opponent');
    endTurn();
    return;
  }

  const { targets } = getValidAttackTargets(currentUnit);
  if (targets.length === 0) {
    addLogEntry(`${currentUnit.name} skips (no targets).`, 'opponent');
    endTurn();
    return;
  }

  // Play the first card (Attack) on the lowest HP target
  const target = targets.reduce((a, b) => a.hp < b.hp ? a : b);

  // Play a card from hand
  const cardId = playCard('opponent', 0);
  if (!cardId) {
    endTurn();
    return;
  }

  // Execute the attack
  const result = performAttack(currentUnit, target);
  addLogEntry(result.message, 'opponent');

  // Show damage popup near target
  showDamagePopup(result.damage, target.id);

  // Apply damage
  const died = applyDamage(target, result.damage);
  if (died) {
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
    renderHand();
  }
}

// ============================================================================
// KEYBOARD CONTROLS
// ============================================================================

document.addEventListener('keydown', (event) => {
  const currentUnit = getCurrentUnit();
  if (!currentUnit || !isPlayerControlled(currentUnit)) return;

  const key = event.key;

  // Handle advance phase (discard a card)
  if (needsToAdvance(currentUnit)) {
    const num = parseInt(key);
    if (!isNaN(num) && num >= 1) {
      const hand = getCurrentHand();
      if (num <= hand.length) {
        executeAdvanceWithDiscard(num - 1);
      }
    }
    return;
  }

  if (gameState.phase === 'play') {
    if (key === 'e' || key === 'E') {
      executeSkip();
    } else {
      const num = parseInt(key);
      if (!isNaN(num) && num >= 1) {
        const hand = getCurrentHand();
        if (num <= hand.length) {
          selectCard(num - 1);
        }
      }
    }
  } else if (gameState.phase === 'targeting') {
    if (key === 'Escape') {
      cancelTargeting();
    } else {
      const num = parseInt(key);
      if (!isNaN(num) && num >= 1) {
        if (num <= gameState.validTargets.length) {
          executeCardOnTarget(num - 1);
        }
      }
    }
  }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

function initGame() {
  // Initialize units
  gameState.units = createInitialUnits();
  const allUnitIds = gameState.units.map(u => u.id);
  gameState.turnOrder = shuffleArray(allUnitIds);
  gameState.currentUnitIndex = 0;

  // Initialize decks
  gameState.playerDeck = shuffleArray(createDeck());
  gameState.opponentDeck = shuffleArray(createDeck());
  gameState.playerHand = [];
  gameState.opponentHand = [];
  gameState.playerGraveyard = [];
  gameState.opponentGraveyard = [];

  // Draw initial hands
  drawCards('player');
  drawCards('opponent');

  createZones();
  renderUnits();
  highlightTargets();
  renderTurnOrder();
  renderHand();

  addLogEntry('Game started. Fight!');

  const firstUnit = getCurrentUnit();

  // Handle melee units needing to advance on first turn (must discard a card)
  if (firstUnit && needsToAdvance(firstUnit)) {
    if (!isPlayerControlled(firstUnit)) {
      setTimeout(() => {
        const hand = firstUnit.team === 'player' ? gameState.playerHand : gameState.opponentHand;
        if (hand.length > 0) {
          const cardId = playCard(firstUnit.team, 0);
          const card = CARDS[cardId];
          addLogEntry(`${firstUnit.name} discards ${card.name} and advances to Zone X!`, firstUnit.team);
        } else {
          addLogEntry(`${firstUnit.name} advances to Zone X!`, firstUnit.team);
        }
        advanceUnit(firstUnit);
        endTurn();
      }, 600);
    }
    return;
  }

  if (firstUnit && firstUnit.team === 'opponent' && !gameState.playerControlsBoth) {
    setTimeout(() => runOpponentAI(), 600);
  }

  console.log('GM Arena (StS variant) initialized!');
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
      highlightTargets();
      renderHand();

      // If it's opponent's turn and we just disabled control, trigger AI
      const currentUnit = getCurrentUnit();

      if (currentUnit && needsToAdvance(currentUnit) && !gameState.playerControlsBoth) {
        setTimeout(() => {
          const hand = currentUnit.team === 'player' ? gameState.playerHand : gameState.opponentHand;
          if (hand.length > 0) {
            const cardId = playCard(currentUnit.team, 0);
            const card = CARDS[cardId];
            addLogEntry(`${currentUnit.name} discards ${card.name} and advances to Zone X!`, currentUnit.team);
          } else {
            addLogEntry(`${currentUnit.name} advances to Zone X!`, currentUnit.team);
          }
          advanceUnit(currentUnit);
          endTurn();
        }, 600);
        return;
      }

      if (currentUnit && currentUnit.team === 'opponent' && !gameState.playerControlsBoth) {
        setTimeout(() => runOpponentAI(), 600);
      }
    });
  }
}

// Start the game
initGame();
initDebugUI();
