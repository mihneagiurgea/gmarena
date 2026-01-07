/**
 * AI tests
 *
 * Tests for AI move generation logic.
 * Run with: node --test tests/
 */
const { test, describe } = require('node:test');
const assert = require('node:assert');
const { loadEngineWithAI } = require('./loader');

const game = loadEngineWithAI();
const {
  CARDS, createUnit, applyEffect, gameState, canPlayCard, getValidCardTargets,
  generateMoves
} = game;

describe('AI generateMoves', () => {
  function setupGameState(units, playerHand = [], opponentHand = []) {
    gameState.units = units;
    gameState.turnOrder = units.map(u => u.id);
    gameState.currentUnitIndex = 0;
    gameState.playerHand = playerHand;
    gameState.opponentHand = opponentHand;
  }

  test('Fatigued unit should NOT have move actions generated', () => {
    const orc = createUnit('o', 'Orc', 'orc', 'opponent');
    orc.zone = 1; // Zone X
    setupGameState([orc], [], ['attack', 'attack']);

    // Without Fatigued, should have move actions
    const movesBeforeFatigue = generateMoves(
      gameState, orc, CARDS, canPlayCard, getValidCardTargets
    );
    const moveActionsBeforeFatigue = movesBeforeFatigue.filter(m => m.type === 'move');
    assert.ok(moveActionsBeforeFatigue.length > 0, 'Should have move actions before Fatigued');

    // Apply Fatigued
    applyEffect(orc, 'fatigued', orc.id, 1);

    // With Fatigued, should NOT have move actions
    const movesAfterFatigue = generateMoves(
      gameState, orc, CARDS, canPlayCard, getValidCardTargets
    );
    const moveActionsAfterFatigue = movesAfterFatigue.filter(m => m.type === 'move');
    assert.strictEqual(moveActionsAfterFatigue.length, 0, 'Should NOT have move actions when Fatigued');
  });

  test('Fatigued unit should NOT have moveAndPlay actions generated', () => {
    const orc = createUnit('o', 'Orc', 'orc', 'opponent');
    orc.zone = 1; // Zone X
    const mage = createUnit('m', 'Mage', 'mage', 'player');
    mage.zone = 0; // Zone A - adjacent to X
    setupGameState([orc, mage], [], ['attack', 'attack']);

    // Apply Fatigued
    applyEffect(orc, 'fatigued', orc.id, 1);

    // With Fatigued, should NOT have moveAndPlay actions
    const moves = generateMoves(
      gameState, orc, CARDS, canPlayCard, getValidCardTargets
    );
    const moveAndPlayActions = moves.filter(m => m.type === 'moveAndPlay');
    assert.strictEqual(moveAndPlayActions.length, 0, 'Should NOT have moveAndPlay actions when Fatigued');
  });

  test('Fatigued unit CAN still play Simple cards (no move)', () => {
    const orc = createUnit('o', 'Orc', 'orc', 'opponent');
    orc.zone = 1; // Zone X
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    warrior.zone = 1; // Zone X - same zone for melee attack
    setupGameState([orc, warrior], [], ['attack', 'defend']);

    // Apply Fatigued
    applyEffect(orc, 'fatigued', orc.id, 1);

    // Should still have 'play' actions for Simple cards
    const moves = generateMoves(
      gameState, orc, CARDS, canPlayCard, getValidCardTargets
    );
    const playActions = moves.filter(m => m.type === 'play');
    assert.ok(playActions.length > 0, 'Should still be able to play Simple cards when Fatigued');
  });

  test('Non-Fatigued unit CAN have move actions generated', () => {
    const orc = createUnit('o', 'Orc', 'orc', 'opponent');
    orc.zone = 3; // Zone B
    setupGameState([orc], [], ['attack']);

    // Without Fatigued, should have move actions to X and Y
    const moves = generateMoves(
      gameState, orc, CARDS, canPlayCard, getValidCardTargets
    );
    const moveActions = moves.filter(m => m.type === 'move');
    assert.strictEqual(moveActions.length, 2, 'Should have 2 move actions (to X and Y) from Zone B');
  });
});
