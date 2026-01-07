/**
 * Game UI - Rendering, DOM manipulation, and event handling
 * Depends on engine.js for game logic
 *
 * 3 zones: A - X - B
 * Card-based combat system
 */

// ============================================================================
// CARD HELPERS
// ============================================================================

/**
 * Get the card type class and label based on requires
 */
function getCardTypeInfo(card) {
  if (!card.requires) {
    return { typeClass: 'card-basic', typeLabel: 'Basic', colorClass: 'type-basic' };
  }
  // Use first requirement for styling
  const firstReq = card.requires.split(',')[0].trim();
  const typeMap = {
    melee: { typeClass: 'card-melee', typeLabel: 'Melee', colorClass: 'type-melee' },
    ranged: { typeClass: 'card-ranged', typeLabel: 'Ranged', colorClass: 'type-ranged' },
    magic: { typeClass: 'card-magic', typeLabel: 'Magic', colorClass: 'type-magic' },
    physical: { typeClass: 'card-physical', typeLabel: 'Physical', colorClass: 'type-physical' }
  };
  return typeMap[firstReq] || { typeClass: 'card-basic', typeLabel: card.requires, colorClass: 'type-basic' };
}

/**
 * Format card description by replacing {effect} templates with calculated values
 * @param {Object} card - The card definition
 * @param {Object} unit - The unit playing the card (for bonus calculation)
 * @returns {string} Formatted description with actual values
 */
function formatCardDescription(card, unit) {
  const bonus = unit?.auras?.bonus || 0;

  return card.description.replace(/\{(\w+)\}/g, (match, effect) => {
    const baseValue = card.effects[effect] || 0;

    // Bonus applies to damage and heal
    if (effect === 'damage' || effect === 'heal') {
      return Math.max(0, baseValue + bonus);
    }

    return baseValue;
  });
}

/**
 * Generate HTML for a game card
 */
function renderCardHTML(card, keyNum, options = {}) {
  const { extraClasses = '', dataAttr = '', count = 0, unit = null } = options;
  const typeInfo = getCardTypeInfo(card);
  const countAttr = count > 1 ? `data-count="${count}"` : '';
  const description = formatCardDescription(card, unit);

  return `
    <div class="card ${typeInfo.typeClass} ${extraClasses}" ${dataAttr} ${countAttr}>
      <div class="card-key">${keyNum}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-type ${typeInfo.colorClass}">${typeInfo.typeLabel}</div>
      <div class="card-desc">${description}</div>
    </div>
  `;
}

// ============================================================================
// RENDERING
// ============================================================================

function createZones() {
  const gridEl = document.getElementById('grid');
  gridEl.innerHTML = '';
  gridEl.className = 'zones-container';

  // Add lanes between connected zones
  const lanes = ['a-x', 'a-y', 'x-b', 'y-b'];
  lanes.forEach(conn => {
    const lane = document.createElement('div');
    lane.className = `zone-lane ${conn}`;
    gridEl.appendChild(lane);
  });

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

      // Block indicator
      if (unit.block > 0) {
        const blockEl = document.createElement('div');
        blockEl.className = 'block-indicator';
        blockEl.textContent = unit.block;
        blockEl.title = `Block: ${unit.block}`;
        unitWrapper.appendChild(blockEl);
      }

      // Taunted status indicator (shows when unit is under taunt effect)
      if (hasEffect(unit, 'taunt')) {
        const tauntedEl = document.createElement('div');
        tauntedEl.className = 'taunted-indicator';
        const taunters = getActiveTaunters(unit);
        const tauntInfo = taunters.map(t => t.name).join(', ');
        tauntedEl.textContent = '⚔️';
        tauntedEl.title = `Taunted by: ${tauntInfo}`;
        unitWrapper.appendChild(tauntedEl);
      }

      // Pinned indicator (shows when unit can't move due to taunt)
      if (isPinned(unit)) {
        unitWrapper.classList.add('pinned');
        unitWrapper.title = 'Pinned by enemy taunters';
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


  if (!isPlayerControlled(currentUnit)) {
    // Show player's hand but disabled during opponent's turn
    const playerHand = gameState.playerHand;

    // Group cards by ID and count duplicates
    const cardCounts = {};
    playerHand.forEach(cardId => {
      cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
    });

    let html = '<div class="hand-cards">';
    let keyNum = 1;

    for (const [cardId, count] of Object.entries(cardCounts)) {
      const card = CARDS[cardId];
      html += renderCardHTML(card, keyNum, {
        extraClasses: 'disabled-card',
        count
      });
      keyNum++;
    }

    html += '</div>';
    html += `<div class="hand-end-turn">
      <div class="card skip-card disabled-card">
        <div class="card-key">E</div>
        <div class="card-name">End Turn</div>
      </div>
    </div>`;

    handEl.innerHTML = html;
    return;
  }

  const hand = getCurrentHand();

  if (gameState.phase === 'play') {
    const unitCanMove = canMove(currentUnit);

    // Group cards by ID and count duplicates
    const cardCounts = {};
    const cardIndices = {}; // Store first index of each card type
    hand.forEach((cardId, index) => {
      if (!cardCounts[cardId]) {
        cardCounts[cardId] = 0;
        cardIndices[cardId] = index;
      }
      cardCounts[cardId]++;
    });

    let html = '<div class="hand-cards">';
    let keyNum = 1;

    // Show collapsed cards with count
    for (const [cardId, count] of Object.entries(cardCounts)) {
      const card = CARDS[cardId];
      const canPlay = canPlayCard(currentUnit, card);
      const extraClasses = !canPlay ? 'unplayable-card' : '';

      html += renderCardHTML(card, keyNum, {
        extraClasses,
        dataAttr: `data-card-index="${cardIndices[cardId]}"`,
        count,
        unit: currentUnit
      });
      keyNum++;
    }

    html += '</div>';

    // Right section: Advance option (if available) and End Turn
    html += '<div class="hand-end-turn">';

    // Show Move option on the right if available (key: M)
    if (unitCanMove) {
      html += `
        <div class="card advance-option" data-action="move">
          <div class="card-key">M</div>
          <div class="card-name">Move</div>
          <div class="card-desc">Move to adjacent zone [Weakened]</div>
        </div>
      `;
    }

    html += `
        <div class="card skip-card" data-action="skip">
          <div class="card-key">E</div>
          <div class="card-name">End Turn</div>
        </div>
      </div>
    `;

    handEl.innerHTML = html;
    bindCardEvents();

  } else if (gameState.phase === 'targeting') {
    let html = '<div class="hand-cards">';

    gameState.validTargets.forEach((target, index) => {
      html += `
        <div class="card target-card" data-target-index="${index}">
          <div class="card-key">${index + 1}</div>
          <div class="card-name">${target.name}</div>
          <div class="card-type type-basic">${target.team === 'player' ? 'Ally' : 'Enemy'}</div>
          <div class="card-desc">${target.hp}/${target.maxHp} HP</div>
        </div>
      `;
    });

    html += '</div>';

    html += `
      <div class="hand-end-turn">
        <div class="card cancel-card" data-action="cancel">
          <div class="card-key">Esc</div>
          <div class="card-name">Cancel</div>
        </div>
      </div>
    `;

    handEl.innerHTML = html;
    bindTargetEvents();

  } else if (gameState.phase === 'moving') {
    // Show zone selection for move
    let html = '<div class="hand-cards">';

    gameState.validMoveZones.forEach((zoneId, index) => {
      const zoneName = ZONE_NAMES[zoneId];
      html += `
        <div class="card target-card" data-zone-id="${zoneId}">
          <div class="card-key">${index + 1}</div>
          <div class="card-name">Zone ${zoneName}</div>
          <div class="card-desc">Move here</div>
        </div>
      `;
    });

    html += '</div>';

    html += `
      <div class="hand-end-turn">
        <div class="card cancel-card" data-action="cancel-move">
          <div class="card-key">Esc</div>
          <div class="card-name">Cancel</div>
        </div>
      </div>
    `;

    handEl.innerHTML = html;
    bindMoveEvents();
  }
}

function bindMoveEvents() {
  const handEl = document.getElementById('options');

  // Zone selection
  handEl.querySelectorAll('.card[data-zone-id]').forEach(card => {
    card.addEventListener('click', () => {
      const zoneId = parseInt(card.dataset.zoneId);
      executeMove(zoneId);
    });
  });

  // Cancel
  const cancelCard = handEl.querySelector('[data-action="cancel-move"]');
  if (cancelCard) {
    cancelCard.addEventListener('click', cancelMove);
  }
}

function cancelMove() {
  gameState.phase = 'play';
  gameState.validMoveZones = [];

  // Clear zone highlights
  document.querySelectorAll('.zone.move-target').forEach(z => {
    z.classList.remove('move-target');
    z.onclick = null;
  });

  renderHand();
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

  // Move action (key: M)
  const moveCard = handEl.querySelector('[data-action="move"]');
  if (moveCard) {
    moveCard.addEventListener('click', enterMovePhase);
  }

  // Skip turn
  const skipCard = handEl.querySelector('[data-action="skip"]');
  if (skipCard) {
    skipCard.addEventListener('click', executeSkip);
  }
}

/**
 * Enter move phase - show zone selection UI
 */
function enterMovePhase() {
  const currentUnit = getCurrentUnit();
  if (!currentUnit || !canMove(currentUnit)) return;

  gameState.phase = 'moving';
  gameState.validMoveZones = getValidMoveZones(currentUnit);
  renderHand();
  highlightMoveZones();
}

/**
 * Highlight valid move destination zones
 */
function highlightMoveZones() {
  // Clear previous highlights
  document.querySelectorAll('.zone.move-target').forEach(z => {
    z.classList.remove('move-target');
    z.onclick = null;
  });

  if (gameState.phase !== 'moving') return;

  gameState.validMoveZones.forEach(zoneId => {
    const zoneEl = document.querySelector(`.zone[data-zone="${zoneId}"]`);
    if (zoneEl) {
      zoneEl.classList.add('move-target');
      zoneEl.onclick = () => executeMove(zoneId);
    }
  });
}

/**
 * Execute move to a specific zone
 */
function executeMove(targetZone) {
  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;

  const zoneName = ZONE_NAMES[targetZone];
  addLogEntry(`${currentUnit.name} → Zone ${zoneName} [Fatigued]`, currentUnit.team);
  moveUnit(currentUnit, targetZone);

  // Clear move phase
  gameState.phase = 'play';
  gameState.validMoveZones = [];

  // Clear zone highlights
  document.querySelectorAll('.zone.move-target').forEach(z => {
    z.classList.remove('move-target');
    z.onclick = null;
  });

  // Move does NOT end turn - unit can still play Simple cards while Fatigued
  renderUnits();
  renderHand();
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
  if (unit.block > 0) {
    statsHtml += `<span style="color: #60a5fa;">Block: ${unit.block}</span><br>`;
  }
  statsHtml += `Zone: ${ZONE_NAMES[unit.zone]}<br>`;
  statsHtml += `Range: ${unit.attackRange}<br>`;
  statsHtml += `Type: ${unit.attackType}<br>`;
  statsHtml += `Damage Bonus: ${unit.damageBonus >= 0 ? '+' : ''}${unit.damageBonus}<br>`;

  // Show taunt effects on this unit with duration
  if (hasEffect(unit, 'taunt')) {
    const tauntEffects = getEffects(unit, 'taunt');
    const tauntInfo = tauntEffects.map(e => {
      const taunter = gameState.units.find(u => u.id === e.sourceId);
      return taunter ? `${taunter.name} (${e.duration})` : null;
    }).filter(Boolean).join(', ');
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
 * Show game over banner (victory or defeat)
 */
function showGameOverBanner(isVictory) {
  const banner = document.createElement('div');
  banner.className = `game-over-banner ${isVictory ? 'victory' : 'defeat'}`;
  banner.innerHTML = `
    <div class="banner-text">${isVictory ? 'Victory!' : 'Defeat'}</div>
    <div class="banner-subtext">${isVictory ? 'All enemies have been defeated!' : 'All your units have fallen.'}</div>
  `;
  document.body.appendChild(banner);
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
  setTimeout(() => popup.remove(), 1150);
}

// ============================================================================
// GAME ACTIONS
// ============================================================================

function selectCard(cardIndex) {
  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;

  const hand = getCurrentHand();
  if (cardIndex < 0 || cardIndex >= hand.length) return;

  const cardId = hand[cardIndex];
  const card = CARDS[cardId];

  // Check if unit can play this card
  if (!canPlayCard(currentUnit, card)) {
    addLogEntry(`${currentUnit.name} can't play ${card.name}`, 'neutral');
    return;
  }

  // Get valid targets based on card's target type
  const { targets, mustAttackTaunters } = getValidCardTargets(currentUnit, card);

  // Self-targeting cards execute immediately
  if (card.target === 'self') {
    gameState.selectedCard = cardId;
    executeCardOnTarget(0); // Target is self (index 0)
    return;
  }

  if (targets.length === 0) {
    addLogEntry('No valid targets', 'neutral');
    return;
  }

  gameState.phase = 'targeting';
  gameState.selectedCard = cardId;
  gameState.validTargets = targets;

  if (mustAttackTaunters) {
    addLogEntry(`${currentUnit.name} must attack taunter`, 'neutral');
  }

  highlightTargets();
  renderHand();
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
  const currentUnit = getCurrentUnit();
  if (!currentUnit) return;

  const cardId = gameState.selectedCard;
  const card = CARDS[cardId];

  // For self-targeting, get the target directly
  let target;
  if (card.target === 'self') {
    target = currentUnit;
  } else {
    if (targetIndex < 0 || targetIndex >= gameState.validTargets.length) return;
    target = gameState.validTargets[targetIndex];
  }

  // Play the card from hand
  const hand = currentUnit.team === 'player' ? gameState.playerHand : gameState.opponentHand;
  const cardIndex = hand.indexOf(cardId);
  if (cardIndex !== -1) {
    playCard(currentUnit.team, cardIndex);
  }

  // Execute card effects
  const result = executeCardEffects(currentUnit, target, card);
  addLogEntry(result.message, currentUnit.team);

  // Show damage popup near target if damage was dealt
  if (result.damage > 0) {
    showDamagePopup(result.damage, target.id);

    // Apply damage (pass attacker's attackType for aura reduction)
    const died = applyDamage(target, result.damage, currentUnit.attackType);
    if (died) {
      const deadUnits = removeDeadUnits();
      deadUnits.forEach(unit => {
        addLogEntry(`${unit.name} falls!`, unit.team);
      });
    }
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
    const isVictory = gameResult === 'victory';
    addLogEntry(isVictory ? 'VICTORY!' : 'DEFEAT!', 'neutral');
    showGameOverBanner(isVictory);
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

  // Reset block for the new current unit (block doesn't persist between turns)
  const currentUnit = getCurrentUnit();
  if (currentUnit) {
    resetBlock(currentUnit);
  }

  renderUnits();
  highlightTargets();
  renderTurnOrder();
  renderHand();

  // Trigger AI if current unit is AI-controlled
  if (currentUnit && !isPlayerControlled(currentUnit)) {
    setTimeout(() => runAI(), 850);
  }
}

// ============================================================================
// AI CONTROL
// ============================================================================

function runAI() {
  const currentUnit = getCurrentUnit();
  if (!currentUnit || isPlayerControlled(currentUnit)) return;

  const team = currentUnit.team;

  // Use the Minimax AI to get the best move
  const gameFns = {
    CARDS,
    canPlayCard,
    getValidCardTargets,
    executeCardEffects,
    applyDamage,
    applyEffect,
  };

  const move = getBestMove(gameState, gameFns);

  if (move.type === 'skip') {
    addLogEntry(`${currentUnit.name} passes`, team);
    endTurn();
    return;
  }

  if (move.type === 'move') {
    const zoneName = ZONE_NAMES[move.targetZone];
    addLogEntry(`${currentUnit.name} → Zone ${zoneName} [Fatigued]`, team);
    moveUnit(currentUnit, move.targetZone);
    // Move does NOT end turn - AI can still play Simple cards while Fatigued
    renderUnits();
    renderHand();
    setTimeout(() => runAI(), 500);
    return;
  }

  // Handle moveAndPlay: move first, then play a Simple card
  if (move.type === 'moveAndPlay') {
    const zoneName = ZONE_NAMES[move.targetZone];
    addLogEntry(`${currentUnit.name} → Zone ${zoneName} [Fatigued]`, team);
    moveUnit(currentUnit, move.targetZone);
    renderUnits();
    // Continue to play the Simple card below
  }

  // Play the card
  const card = CARDS[move.cardId];
  const target = gameState.units.find(u => u.id === move.targetId);

  if (!card || !target) {
    addLogEntry(`${currentUnit.name} passes`, team);
    endTurn();
    return;
  }

  // Find card index in hand
  const hand = team === 'player' ? gameState.playerHand : gameState.opponentHand;
  const cardIndex = hand.indexOf(move.cardId);
  if (cardIndex === -1) {
    addLogEntry(`${currentUnit.name} passes`, team);
    endTurn();
    return;
  }

  // Play the card from hand
  playCard(team, cardIndex);

  // Execute card effects
  const result = executeCardEffects(currentUnit, target, card);
  addLogEntry(result.message, team);

  // Show damage popup near target if damage was dealt
  if (result.damage > 0) {
    showDamagePopup(result.damage, target.id);

    // Apply damage (pass attacker's attackType for aura reduction)
    const died = applyDamage(target, result.damage, currentUnit.attackType);
    if (died) {
      const deadUnits = removeDeadUnits();
      deadUnits.forEach(unit => {
        addLogEntry(`${unit.name} falls!`, unit.team);
      });
    }
  }

  const gameResult = checkGameOver();
  if (gameResult === 'ongoing') {
    endTurn();
  } else {
    const isVictory = gameResult === 'victory';
    addLogEntry(isVictory ? 'VICTORY!' : 'DEFEAT!', 'neutral');
    showGameOverBanner(isVictory);
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

  if (gameState.phase === 'play') {
    if (key === 'e' || key === 'E') {
      executeSkip();
    } else if (key === 'm' || key === 'M') {
      // Move action
      if (canMove(currentUnit)) {
        enterMovePhase();
      }
    } else {
      const num = parseInt(key);
      if (!isNaN(num) && num >= 1) {
        // Get collapsed card indices
        const hand = getCurrentHand();
        const cardIndices = {};
        hand.forEach((cardId, index) => {
          if (!(cardId in cardIndices)) {
            cardIndices[cardId] = index;
          }
        });
        const indices = Object.values(cardIndices);
        if (num <= indices.length) {
          selectCard(indices[num - 1]);
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
  } else if (gameState.phase === 'moving') {
    if (key === 'Escape') {
      cancelMove();
    } else {
      const num = parseInt(key);
      if (!isNaN(num) && num >= 1) {
        if (num <= gameState.validMoveZones.length) {
          executeMove(gameState.validMoveZones[num - 1]);
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

  // Initialize decks from DECK_DATA
  gameState.playerDeck = shuffleArray(createDeck('player'));
  gameState.opponentDeck = shuffleArray(createDeck('opponent'));
  gameState.playerHand = [];
  gameState.opponentHand = [];

  // Draw initial hands
  drawCards('player');
  drawCards('opponent');

  createZones();
  renderUnits();
  highlightTargets();
  renderTurnOrder();
  renderHand();

  addLogEntry('Game started. Fight!');

  // If first unit is AI-controlled, start AI
  const firstUnit = getCurrentUnit();
  if (firstUnit && !isPlayerControlled(firstUnit)) {
    setTimeout(() => runAI(), 850);
  }

  console.log('GM Arena (StS variant) initialized!');
}

// ============================================================================
// OPTIONS UI
// ============================================================================

function initOptionsUI() {
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

  // Options panel toggle
  const optionsPanel = document.getElementById('options-panel');
  const optionsToggle = document.getElementById('options-toggle');
  const optionsHeader = document.querySelector('.options-header');

  if (optionsToggle && optionsPanel) {
    optionsToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      optionsPanel.classList.toggle('minimized');
      optionsToggle.textContent = optionsPanel.classList.contains('minimized') ? '+' : '−';
      optionsToggle.title = optionsPanel.classList.contains('minimized') ? 'Expand' : 'Minimize';
    });

    optionsHeader.addEventListener('click', () => {
      optionsPanel.classList.toggle('minimized');
      optionsToggle.textContent = optionsPanel.classList.contains('minimized') ? '+' : '−';
      optionsToggle.title = optionsPanel.classList.contains('minimized') ? 'Expand' : 'Minimize';
    });
  }

  // Player control toggle
  const playerControl = document.getElementById('player-control');
  if (playerControl) {
    playerControl.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        playerControl.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameState.playerControl = btn.dataset.value;
        onControlChanged();
      });
    });
  }

  // Opponent control toggle
  const opponentControl = document.getElementById('opponent-control');
  if (opponentControl) {
    opponentControl.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        opponentControl.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameState.opponentControl = btn.dataset.value;
        onControlChanged();
      });
    });
  }
}

function onControlChanged() {
  // Re-render to apply changes immediately
  highlightTargets();
  renderHand();

  // If current unit is now AI-controlled, trigger AI
  const currentUnit = getCurrentUnit();
  if (currentUnit && !isPlayerControlled(currentUnit)) {
    setTimeout(() => runAI(), 500);
  }
}

// Start the game
initGame();
initOptionsUI();
