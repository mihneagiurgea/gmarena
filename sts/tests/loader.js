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
  const engineCode = loadFile('engine.js');

  const wrappedCode = `
    ${dataCode}
    ${engineCode}
    return {
      UNIT_DATA, CARD_DATA, DECK_DATA,
      createUnit, applyDamage, resetBlock, executeCardEffects,
      isMeleeUnit, isRangedUnit, canPlayCard, hasEffect,
      isAttackCard, canAdvance, canMove, getValidMoveZones, isPinned,
      applyEffect, gameState, isSimpleCard, moveUnit
    };
  `;

  const fn = new Function(wrappedCode);
  return fn();
}

function loadEngineWithAI() {
  const dataCode = loadFile('data.js');
  const engineCode = loadFile('engine.js');
  const aiCode = loadFile('ai.js');

  const wrappedCode = `
    ${dataCode}
    ${engineCode}
    ${aiCode}
    return {
      UNIT_DATA, CARD_DATA, DECK_DATA, CARDS,
      createUnit, applyDamage, resetBlock, executeCardEffects,
      isMeleeUnit, isRangedUnit, canPlayCard, hasEffect,
      isAttackCard, canAdvance, canMove, getValidMoveZones, isPinned,
      applyEffect, gameState, isSimpleCard, moveUnit, getValidCardTargets,
      generateMoves, getBestMove
    };
  `;

  const fn = new Function(wrappedCode);
  return fn();
}

module.exports = { loadData, loadEngine, loadEngineWithAI };
