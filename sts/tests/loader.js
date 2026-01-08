/**
 * Test loader - loads game files for testing
 */
const fs = require('fs');
const path = require('path');

function loadFile(filename) {
  return fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
}

function loadData() {
  const code = loadFile('data.js');

  const wrappedCode = `
    ${code}
    return { UNIT_DATA, CARD_DATA, DECK_DATA };
  `;

  const fn = new Function(wrappedCode);
  return fn();
}

function loadEngine() {
  const dataCode = loadFile('data.js');
  const randomCode = loadFile('random.js');
  const zonesCode = loadFile('zones.js');
  const gamestateCode = loadFile('gamestate.js');
  const engineCode = loadFile('engine.js');

  const wrappedCode = `
    ${dataCode}
    ${randomCode}
    initRNG(12345); // Fixed seed for deterministic tests
    ${zonesCode}
    ${gamestateCode}
    ${engineCode}
    return {
      UNIT_DATA, CARD_DATA, DECK_DATA,
      createUnit, applyDamage, resetBlock, executeCardEffects,
      isMeleeUnit, isRangedUnit, canPlayCard, hasEffect,
      isAttackCard, canAdvance, canMove, getValidMoveZones, isPinned,
      applyEffect, gameState, isSimpleCard, moveUnit,
      ZONES, ZONE_NAMES, NUM_ZONES, ZoneUtils, GameState,
      SeededRandom, initRNG, getRNG
    };
  `;

  const fn = new Function(wrappedCode);
  return fn();
}

function loadEngineWithAI() {
  const dataCode = loadFile('data.js');
  const randomCode = loadFile('random.js');
  const zonesCode = loadFile('zones.js');
  const gamestateCode = loadFile('gamestate.js');
  const engineCode = loadFile('engine.js');
  const aiCode = loadFile('ai.js');

  const wrappedCode = `
    ${dataCode}
    ${randomCode}
    initRNG(12345); // Fixed seed for deterministic tests
    ${zonesCode}
    ${gamestateCode}
    ${engineCode}
    ${aiCode}
    return {
      UNIT_DATA, CARD_DATA, DECK_DATA, CARDS,
      createUnit, applyDamage, resetBlock, executeCardEffects,
      isMeleeUnit, isRangedUnit, canPlayCard, hasEffect,
      isAttackCard, canAdvance, canMove, getValidMoveZones, isPinned,
      applyEffect, gameState, isSimpleCard, moveUnit, getValidCardTargets,
      generateMoves, getBestMove,
      ZONES, ZONE_NAMES, NUM_ZONES, ZoneUtils, GameState,
      SeededRandom, initRNG, getRNG
    };
  `;

  const fn = new Function(wrappedCode);
  return fn();
}

module.exports = { loadData, loadEngine, loadEngineWithAI };
