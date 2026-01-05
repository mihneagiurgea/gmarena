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
 * @param {Object} options - Optional parameters
 * @param {boolean} options.isAdvanceAttack - True if this is an advance attack (applies penalty)
 * @returns {string} Formatted description with actual values
 */
function formatCardDescription(card, unit, options = {}) {
  const { isAdvanceAttack: advanceAttack = false } = options;
  const bonus = unit?.auras?.bonus || 0;
  const penalty = advanceAttack ? ADVANCE_ATTACK_PENALTY : 0;

  return card.description.replace(/\{(\w+)\}/g, (match, effect) => {
    const baseValue = card.effects[effect] || 0;

    // Bonus applies to damage and heal (minus penalty for advance attacks)
    if (effect === 'damage' || effect === 'heal') {
      const effectiveBonus = bonus - penalty;
      return Math.max(0, baseValue + effectiveBonus);
    }

    return baseValue;
  });
}

/**
 * Generate HTML for a game card
 */
function renderCardHTML(card, keyNum, options = {}) {
  const { extraClasses = '', dataAttr = '', count = 0, unit = null, isAdvanceAttack = false } = options;
  const typeInfo = getCardTypeInfo(card);
  const countAttr = count > 1 ? `data-count="${count}"` : '';
  const description = formatCardDescription(card, unit, { isAdvanceAttack });

  // Add advance indicator for attack cards when advancing
  const advanceLabel = isAdvanceAttack ? '<div class="card-advance-label">Advance</div>' : '';

  return `
    <div class="card ${typeInfo.typeClass} ${extraClasses}" ${dataAttr} ${countAttr}>
      <div class="card-key">${keyNum}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-type ${typeInfo.colorClass}">${typeInfo.typeLabel}</div>
      ${advanceLabel}
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
    const unitCanAdvance = canAdvance(currentUnit);

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
      const advanceAttack = unitCanAdvance && isAttackCard(card);

      // Check if card has valid targets
      let hasValidTargets = true;
      if (canPlay && advanceAttack) {
        const { targets } = getAdvanceAttackTargets(currentUnit);
        hasValidTargets = targets.length > 0;
      }

      const extraClasses = (!canPlay || (advanceAttack && !hasValidTargets)) ? 'unplayable-card' : '';

      html += renderCardHTML(card, keyNum, {
        extraClasses,
        dataAttr: `data-card-index="${cardIndices[cardId]}"`,
        count,
        unit: currentUnit,
        isAdvanceAttack: advanceAttack
      });
      keyNum++;
    }

    html += '</div>';

    // Right section: Advance option (if available) and End Turn
    html += '<div class="hand-end-turn">';

    // Show Advance option on the right if available (key: A)
    if (unitCanAdvance) {
      html += `
        <div class="card advance-option" data-action="advance">
          <div class="card-key">A</div>
          <div class="card-name">Advance</div>
          <div class="card-desc">Move to Zone X</div>
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
  }
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

  // Advance action (key: A)
  const advanceCard = handEl.querySelector('[data-action="advance"]');
  if (advanceCard) {
    advanceCard.addEventListener('click', executeAdvance);
  }

  // Skip turn
  const skipCard = handEl.querySelector('[data-action="skip"]');
  if (skipCard) {
    skipCard.addEventListener('click', executeSkip);
  }
}

/**
 * Execute advance action (move to zone X without playing a card)
 */
function executeAdvance() {
  const currentUnit = getCurrentUnit();
  if (!currentUnit || !canAdvance(currentUnit)) return;

  addLogEntry(`${currentUnit.name} advances to Zone X!`, currentUnit.team);
  advanceUnit(currentUnit);
  endTurn();
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
  if (isTaunted(unit)) {
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
    addLogEntry(`${currentUnit.name} cannot play ${card.name}!`, 'neutral');
    return;
  }

  // Check if this is an advance attack
  const advanceAttack = isAdvanceAttack(currentUnit, card);

  // Get valid targets based on card's target type
  const { targets, mustAttackTaunters } = getValidCardTargets(currentUnit, card);

  // Self-targeting cards execute immediately
  if (card.target === 'self') {
    gameState.selectedCard = cardId;
    gameState.isAdvanceAttack = false;
    executeCardOnTarget(0); // Target is self (index 0)
    return;
  }

  if (targets.length === 0) {
    addLogEntry('No valid targets!', 'neutral');
    return;
  }

  gameState.phase = 'targeting';
  gameState.selectedCard = cardId;
  gameState.validTargets = targets;
  gameState.isAdvanceAttack = advanceAttack;

  if (advanceAttack) {
    addLogEntry(`${currentUnit.name} will advance and attack with -${ADVANCE_ATTACK_PENALTY} penalty.`, 'neutral');
  } else if (mustAttackTaunters) {
    addLogEntry(`${currentUnit.name} is taunted! Must attack taunter.`, 'neutral');
  }

  highlightTargets();
  renderHand();
}

function cancelTargeting() {
  gameState.phase = 'play';
  gameState.selectedCard = null;
  gameState.validTargets = [];
  gameState.isAdvanceAttack = false;

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
  const advanceAttack = gameState.isAdvanceAttack;

  // For self-targeting, get the target directly
  let target;
  if (card.target === 'self') {
    target = currentUnit;
  } else {
    if (targetIndex < 0 || targetIndex >= gameState.validTargets.length) return;
    target = gameState.validTargets[targetIndex];
  }

  // If this is an advance attack, advance first
  if (advanceAttack) {
    addLogEntry(`${currentUnit.name} advances to Zone X!`, currentUnit.team);
    advanceUnit(currentUnit);
  }

  // Play the card from hand
  const hand = currentUnit.team === 'player' ? gameState.playerHand : gameState.opponentHand;
  const cardIndex = hand.indexOf(cardId);
  if (cardIndex !== -1) {
    playCard(currentUnit.team, cardIndex);
  }

  // Execute card effects (with penalty if advance attack)
  const options = advanceAttack ? { bonusPenalty: ADVANCE_ATTACK_PENALTY } : {};
  const result = executeCardEffects(currentUnit, target, card, options);
  addLogEntry(result.message, currentUnit.team);

  // Show damage popup near target if damage was dealt
  if (result.damage > 0) {
    showDamagePopup(result.damage, target.id);

    // Apply damage (pass attacker's attackType for aura reduction)
    const died = applyDamage(target, result.damage, currentUnit.attackType);
    if (died) {
      const deadUnits = removeDeadUnits();
      deadUnits.forEach(unit => {
        addLogEntry(`${unit.name} has fallen!`, unit.team);
      });
    }
  }

  // Reset state
  gameState.phase = 'play';
  gameState.selectedCard = null;
  gameState.validTargets = [];
  gameState.isAdvanceAttack = false;

  // Remove target numbers
  document.querySelectorAll('.target-number').forEach(el => el.remove());

  const gameResult = checkGameOver();
  if (gameResult === 'ongoing') {
    endTurn();
  } else {
    const isVictory = gameResult === 'victory';
    addLogEntry(isVictory ? 'VICTORY! All enemies have been defeated!' : 'DEFEAT! All your units have fallen.', 'neutral');
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

  if (currentUnit && currentUnit.team === 'opponent' && !gameState.playerControlsBoth) {
    setTimeout(() => runOpponentAI(), 850);
  }
}

// ============================================================================
// OPPONENT AI
// ============================================================================

function runOpponentAI() {
  const currentUnit = getCurrentUnit();
  if (!currentUnit || currentUnit.team === 'player') return;

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
    addLogEntry(`${currentUnit.name} ends their turn.`, 'opponent');
    endTurn();
    return;
  }

  if (move.type === 'advance') {
    addLogEntry(`${currentUnit.name} advances to Zone X!`, 'opponent');
    advanceUnit(currentUnit);
    endTurn();
    return;
  }

  // Play the card
  const card = CARDS[move.cardId];
  const target = gameState.units.find(u => u.id === move.targetId);

  if (!card || !target) {
    addLogEntry(`${currentUnit.name} ends their turn.`, 'opponent');
    endTurn();
    return;
  }

  // Find card index in hand
  const hand = gameState.opponentHand;
  const cardIndex = hand.indexOf(move.cardId);
  if (cardIndex === -1) {
    addLogEntry(`${currentUnit.name} ends their turn.`, 'opponent');
    endTurn();
    return;
  }

  // If this is an advance attack, advance first
  if (move.isAdvanceAttack) {
    addLogEntry(`${currentUnit.name} advances to Zone X!`, 'opponent');
    advanceUnit(currentUnit);
  }

  // Play the card from hand
  playCard('opponent', cardIndex);

  // Execute card effects (with penalty if advance attack)
  const options = move.isAdvanceAttack ? { bonusPenalty: ADVANCE_ATTACK_PENALTY } : {};
  const result = executeCardEffects(currentUnit, target, card, options);
  addLogEntry(result.message, 'opponent');

  // Show damage popup near target if damage was dealt
  if (result.damage > 0) {
    showDamagePopup(result.damage, target.id);

    // Apply damage (pass attacker's attackType for aura reduction)
    const died = applyDamage(target, result.damage, currentUnit.attackType);
    if (died) {
      const deadUnits = removeDeadUnits();
      deadUnits.forEach(unit => {
        addLogEntry(`${unit.name} has fallen!`, unit.team);
      });
    }
  }

  const gameResult = checkGameOver();
  if (gameResult === 'ongoing') {
    endTurn();
  } else {
    const isVictory = gameResult === 'victory';
    addLogEntry(isVictory ? 'VICTORY! All enemies have been defeated!' : 'DEFEAT! All your units have fallen.', 'neutral');
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
    } else if (key === 'a' || key === 'A') {
      // Advance action (for melee units in starting zone)
      if (canAdvance(currentUnit)) {
        executeAdvance();
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

  const firstUnit = getCurrentUnit();
  if (firstUnit && firstUnit.team === 'opponent' && !gameState.playerControlsBoth) {
    setTimeout(() => runOpponentAI(), 850);
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
      if (currentUnit && currentUnit.team === 'opponent' && !gameState.playerControlsBoth) {
        setTimeout(() => runOpponentAI(), 850);
      }
    });
  }
}

// Start the game
initGame();
initDebugUI();
