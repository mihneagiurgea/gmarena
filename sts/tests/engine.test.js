/**
 * Engine tests
 *
 * Tests for game engine logic.
 * Run with: node --test tests/
 */
const { test, describe } = require('node:test');
const assert = require('node:assert');
const { loadEngine } = require('./loader');

const engine = loadEngine();
const { createUnit, applyDamage, resetBlock, executeCardEffects, canPlayCard } = engine;

describe('applyDamage', () => {
  describe('without block', () => {
    test('reduces HP by damage amount', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      const initialHp = unit.hp; // 90

      applyDamage(unit, 20);

      assert.strictEqual(unit.hp, initialHp - 20);
    });

    test('unit dies when HP reaches 0', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.hp = 10;

      const died = applyDamage(unit, 10);

      assert.strictEqual(died, true);
      assert.strictEqual(unit.hp, 0);
    });

    test('unit dies when damage exceeds HP', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.hp = 10;

      const died = applyDamage(unit, 50);

      assert.strictEqual(died, true);
      assert.strictEqual(unit.hp, 0);
    });

    test('unit survives when HP remains positive', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.hp = 50;

      const died = applyDamage(unit, 30);

      assert.strictEqual(died, false);
      assert.strictEqual(unit.hp, 20);
    });
  });

  describe('with block', () => {
    test('block absorbs all damage when block >= damage', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.block = 30;
      const initialHp = unit.hp;

      applyDamage(unit, 20);

      assert.strictEqual(unit.hp, initialHp); // HP unchanged
      assert.strictEqual(unit.block, 10); // Block reduced
    });

    test('block absorbs partial damage when block < damage', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.hp = 50;
      unit.block = 15;

      applyDamage(unit, 25);

      assert.strictEqual(unit.hp, 40); // 50 - (25 - 15) = 40
      assert.strictEqual(unit.block, 0); // Block depleted
    });

    test('unit can die through partial block', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.hp = 10;
      unit.block = 5;

      const died = applyDamage(unit, 20);

      assert.strictEqual(died, true);
      assert.strictEqual(unit.hp, 0);
      assert.strictEqual(unit.block, 0);
    });

    test('exact block equals damage leaves 0 block and full HP', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.block = 25;
      const initialHp = unit.hp;

      applyDamage(unit, 25);

      assert.strictEqual(unit.hp, initialHp);
      assert.strictEqual(unit.block, 0);
    });
  });
});

describe('resetBlock', () => {
  test('sets block to 0', () => {
    const unit = createUnit('test', 'Test', 'warrior', 'player');
    unit.block = 50;

    resetBlock(unit);

    assert.strictEqual(unit.block, 0);
  });
});

describe('executeCardEffects', () => {
  test('calculates damage as card base + unit bonus', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player'); // +5 bonus
    const target = createUnit('t', 'Target', 'orc', 'opponent');
    const card = { name: 'Attack', effects: { damage: 15 }, target: 'enemy' };

    const result = executeCardEffects(warrior, target, card);

    assert.strictEqual(result.damage, 20); // 15 + 5
  });

  test('negative damage bonus reduces damage', () => {
    const goblin = createUnit('g', 'Goblin', 'goblin', 'opponent'); // -5 bonus
    const target = createUnit('t', 'Target', 'warrior', 'player');
    const card = { name: 'Attack', effects: { damage: 15 }, target: 'enemy' };

    const result = executeCardEffects(goblin, target, card);

    assert.strictEqual(result.damage, 10); // 15 - 5
  });

  test('applies block to attacker', () => {
    const unit = createUnit('u', 'Unit', 'warrior', 'player');
    const card = { name: 'Defend', effects: { block: 10 }, target: 'self' };

    executeCardEffects(unit, unit, card);

    assert.strictEqual(unit.block, 10);
  });

  test('block stacks', () => {
    const unit = createUnit('u', 'Unit', 'warrior', 'player');
    unit.block = 5;
    const card = { name: 'Defend', effects: { block: 10 }, target: 'self' };

    executeCardEffects(unit, unit, card);

    assert.strictEqual(unit.block, 15);
  });
});

describe('canPlayCard', () => {
  test('any unit can play basic card (no requires)', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    const mage = createUnit('m', 'Mage', 'mage', 'player');
    const card = { id: 'attack', effects: { damage: 15 } };

    assert.strictEqual(canPlayCard(warrior, card), true);
    assert.strictEqual(canPlayCard(mage, card), true);
  });

  test('melee unit can play melee card', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    const card = { id: 'shieldBash', requires: 'melee', effects: { damage: 10 } };

    assert.strictEqual(canPlayCard(warrior, card), true);
  });

  test('ranged unit cannot play melee card', () => {
    const archer = createUnit('a', 'Archer', 'archer', 'player');
    const card = { id: 'shieldBash', requires: 'melee', effects: { damage: 10 } };

    assert.strictEqual(canPlayCard(archer, card), false);
  });

  test('magic unit can play magic card', () => {
    const mage = createUnit('m', 'Mage', 'mage', 'player');
    const card = { id: 'fireball', requires: 'magic', effects: { damage: 25 } };

    assert.strictEqual(canPlayCard(mage, card), true);
  });

  test('physical unit cannot play magic card', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    const card = { id: 'fireball', requires: 'magic', effects: { damage: 25 } };

    assert.strictEqual(canPlayCard(warrior, card), false);
  });
});
