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
const {
  createUnit, applyDamage, resetBlock, executeCardEffects, canPlayCard, hasEffect,
  isAttackCard, canAdvance, canMove, getValidMoveZones, isPinned, applyEffect, gameState,
  isSimpleCard, moveUnit
} = engine;

describe('applyDamage', () => {
  describe('without block or auras', () => {
    test('reduces HP by damage amount', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      const initialHp = unit.hp; // 90

      applyDamage(unit, 20, 'physical');

      assert.strictEqual(unit.hp, initialHp - 20);
    });

    test('unit dies when HP reaches 0', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.hp = 10;

      const died = applyDamage(unit, 10, 'physical');

      assert.strictEqual(died, true);
      assert.strictEqual(unit.hp, 0);
    });

    test('unit dies when damage exceeds HP', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.hp = 10;

      const died = applyDamage(unit, 50, 'physical');

      assert.strictEqual(died, true);
      assert.strictEqual(unit.hp, 0);
    });

    test('unit survives when HP remains positive', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.hp = 50;

      const died = applyDamage(unit, 30, 'physical');

      assert.strictEqual(died, false);
      assert.strictEqual(unit.hp, 20);
    });
  });

  describe('with block', () => {
    test('block absorbs all damage when block >= damage', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.block = 30;
      const initialHp = unit.hp;

      applyDamage(unit, 20, 'physical');

      assert.strictEqual(unit.hp, initialHp); // HP unchanged
      assert.strictEqual(unit.block, 10); // Block reduced
    });

    test('block absorbs partial damage when block < damage', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.hp = 50;
      unit.block = 15;

      applyDamage(unit, 25, 'physical');

      assert.strictEqual(unit.hp, 40); // 50 - (25 - 15) = 40
      assert.strictEqual(unit.block, 0); // Block depleted
    });

    test('unit can die through partial block', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.hp = 10;
      unit.block = 5;

      const died = applyDamage(unit, 20, 'physical');

      assert.strictEqual(died, true);
      assert.strictEqual(unit.hp, 0);
      assert.strictEqual(unit.block, 0);
    });

    test('exact block equals damage leaves 0 block and full HP', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.block = 25;
      const initialHp = unit.hp;

      applyDamage(unit, 25, 'physical');

      assert.strictEqual(unit.hp, initialHp);
      assert.strictEqual(unit.block, 0);
    });
  });

  describe('with auras', () => {
    test('armor reduces physical damage', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.auras.armor = 10;
      unit.hp = 50;

      applyDamage(unit, 25, 'physical');

      assert.strictEqual(unit.hp, 35); // 50 - (25 - 10) = 35
    });

    test('armor does not reduce magic damage', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.auras.armor = 10;
      unit.hp = 50;

      applyDamage(unit, 25, 'magic');

      assert.strictEqual(unit.hp, 25); // 50 - 25 = 25, armor ignored
    });

    test('resistance reduces magic damage', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.auras.resistance = 8;
      unit.hp = 50;

      applyDamage(unit, 20, 'magic');

      assert.strictEqual(unit.hp, 38); // 50 - (20 - 8) = 38
    });

    test('resistance does not reduce physical damage', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.auras.resistance = 8;
      unit.hp = 50;

      applyDamage(unit, 20, 'physical');

      assert.strictEqual(unit.hp, 30); // 50 - 20 = 30, resistance ignored
    });

    test('armor cannot reduce damage below 0', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.auras.armor = 50;
      unit.hp = 100;

      applyDamage(unit, 20, 'physical');

      assert.strictEqual(unit.hp, 100); // No damage taken
    });

    test('auras reduce before block absorbs', () => {
      const unit = createUnit('test', 'Test', 'warrior', 'player');
      unit.auras.armor = 10;
      unit.block = 10;
      unit.hp = 50;

      // 30 damage - 10 armor = 20, then 10 block absorbs, leaving 10 to HP
      applyDamage(unit, 30, 'physical');

      assert.strictEqual(unit.hp, 40);
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
  test('calculates damage as card base + bonus aura', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player'); // +3 bonus aura
    const target = createUnit('t', 'Target', 'orc', 'opponent');
    const card = { name: 'Attack', effects: { damage: 15 }, target: 'enemy' };

    const result = executeCardEffects(warrior, target, card);

    assert.strictEqual(result.damage, 18); // 15 + 3
  });

  test('negative bonus aura reduces damage', () => {
    const goblin = createUnit('g', 'Goblin', 'goblin', 'opponent'); // -2 bonus aura
    const target = createUnit('t', 'Target', 'warrior', 'player');
    const card = { name: 'Attack', effects: { damage: 15 }, target: 'enemy' };

    const result = executeCardEffects(goblin, target, card);

    assert.strictEqual(result.damage, 13); // 15 - 2
  });

  test('applies block to self (self-target card)', () => {
    const unit = createUnit('u', 'Unit', 'warrior', 'player');
    const card = { name: 'Defend', effects: { block: 10 }, target: 'self' };

    executeCardEffects(unit, unit, card);

    assert.strictEqual(unit.block, 10);
  });

  test('applies block to ally (ally-target card)', () => {
    const mage = createUnit('m', 'Mage', 'mage', 'player');
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    const card = { name: 'Magic Shield', effects: { block: 15 }, target: 'ally' };

    executeCardEffects(mage, warrior, card);

    assert.strictEqual(warrior.block, 15); // Block on target, not caster
    assert.strictEqual(mage.block, 0);
  });

  test('block stacks', () => {
    const unit = createUnit('u', 'Unit', 'warrior', 'player');
    unit.block = 5;
    const card = { name: 'Defend', effects: { block: 10 }, target: 'self' };

    executeCardEffects(unit, unit, card);

    assert.strictEqual(unit.block, 15);
  });

  test('heal restores HP (includes caster bonus)', () => {
    const mage = createUnit('m', 'Mage', 'mage', 'player'); // +5 bonus
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    warrior.hp = 50;
    const card = { name: 'Heal', effects: { heal: 15 }, target: 'ally' };

    executeCardEffects(mage, warrior, card);

    assert.strictEqual(warrior.hp, 70); // 50 + 15 + 5 (mage bonus)
  });

  test('heal does not exceed maxHp', () => {
    const mage = createUnit('m', 'Mage', 'mage', 'player'); // +5 bonus
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    warrior.hp = 85; // maxHp is 90
    const card = { name: 'Heal', effects: { heal: 15 }, target: 'ally' };

    executeCardEffects(mage, warrior, card);

    assert.strictEqual(warrior.hp, 90); // Capped at maxHp (would be 85 + 20 = 105)
  });

  test('auraBonus increases target bonus', () => {
    const mage = createUnit('m', 'Mage', 'mage', 'player');
    const archer = createUnit('a', 'Archer', 'archer', 'player'); // 0 bonus
    const buffCard = { name: 'Flaming Blade', effects: { auraBonus: 5 }, target: 'ally' };

    executeCardEffects(mage, archer, buffCard);

    assert.strictEqual(archer.auras.bonus, 5);
  });

  test('auraBonus stacks with existing bonus', () => {
    const mage = createUnit('m', 'Mage', 'mage', 'player');
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player'); // +3 bonus
    const buffCard = { name: 'Flaming Blade', effects: { auraBonus: 5 }, target: 'ally' };

    executeCardEffects(mage, warrior, buffCard);

    assert.strictEqual(warrior.auras.bonus, 8); // 3 (base) + 5 (card)
  });

  test('bonus aura affects heal amount', () => {
    const mage = createUnit('m', 'Mage', 'mage', 'player'); // +5 bonus
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    warrior.hp = 50;
    const healCard = { name: 'Heal', effects: { heal: 10 }, target: 'ally' };

    executeCardEffects(mage, warrior, healCard);

    assert.strictEqual(warrior.hp, 65); // 50 + 10 + 5 (mage's bonus)
  });

  test('taunt aura applies taunt on damage', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player'); // has taunt: 1
    const orc = createUnit('o', 'Orc', 'orc', 'opponent');
    const attackCard = { name: 'Attack', effects: { damage: 15 }, target: 'enemy' };

    executeCardEffects(warrior, orc, attackCard);

    assert.strictEqual(hasEffect(orc, 'taunt'), true);
  });

  test('taunt aura does not apply without damage', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player'); // has taunt: 1
    const ally = createUnit('a', 'Archer', 'archer', 'player');
    const blockCard = { name: 'Defend', effects: { block: 10 }, target: 'self' };

    executeCardEffects(warrior, ally, blockCard);

    assert.strictEqual(hasEffect(ally, 'taunt'), false);
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

describe('isAttackCard', () => {
  test('card with damage is an attack card', () => {
    const card = { name: 'Attack', effects: { damage: 15 }, target: 'enemy' };
    assert.strictEqual(isAttackCard(card), true);
  });

  test('card without damage is not an attack card', () => {
    const defendCard = { name: 'Defend', effects: { block: 10 }, target: 'self' };
    assert.strictEqual(isAttackCard(defendCard), false);
  });

  test('card with zero damage is not an attack card', () => {
    const card = { name: 'Buff', effects: { damage: 0, auraBonus: 5 }, target: 'ally' };
    assert.strictEqual(isAttackCard(card), false);
  });
});

describe('canMove (4-zone diamond layout)', () => {
  // Setup: gameState.units must be set for isPinned check
  function setupGameState(units) {
    gameState.units = units;
  }

  test('player unit in Zone A can move (to X or Y)', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    warrior.zone = 0; // Zone A
    setupGameState([warrior]);
    assert.strictEqual(canMove(warrior), true);
    // Should have 2 valid zones (X and Y)
    assert.deepStrictEqual(getValidMoveZones(warrior), [1, 2]);
  });

  test('player unit in Zone X can move (to A or B)', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    warrior.zone = 1; // Zone X
    setupGameState([warrior]);
    assert.strictEqual(canMove(warrior), true);
    assert.deepStrictEqual(getValidMoveZones(warrior), [0, 3]);
  });

  test('player unit in Zone Y can move (to A or B)', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    warrior.zone = 2; // Zone Y
    setupGameState([warrior]);
    assert.strictEqual(canMove(warrior), true);
    assert.deepStrictEqual(getValidMoveZones(warrior), [0, 3]);
  });

  test('player unit in Zone B can move (to X or Y)', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    warrior.zone = 3; // Zone B
    setupGameState([warrior]);
    assert.strictEqual(canMove(warrior), true);
    assert.deepStrictEqual(getValidMoveZones(warrior), [1, 2]);
  });

  test('opponent unit in Zone B can move (to X or Y)', () => {
    const orc = createUnit('o', 'Orc', 'orc', 'opponent');
    orc.zone = 3; // Zone B
    setupGameState([orc]);
    assert.strictEqual(canMove(orc), true);
  });

  test('opponent unit in Zone A can move (to X or Y)', () => {
    const orc = createUnit('o', 'Orc', 'orc', 'opponent');
    orc.zone = 0; // Zone A
    setupGameState([orc]);
    assert.strictEqual(canMove(orc), true);
  });
});

describe('isPinned (taunt blocks movement)', () => {
  function setupGameState(units) {
    gameState.units = units;
  }

  test('unit is pinned when enemy taunter is in same zone', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    warrior.zone = 1; // Zone X
    const orc = createUnit('o', 'Orc', 'orc', 'opponent');
    orc.zone = 1; // Zone X - same zone
    orc.auras = { taunt: 1 }; // Orc has taunt aura
    setupGameState([warrior, orc]);

    // 1 player vs 1 taunter: 1 <= 1, so pinned
    assert.strictEqual(isPinned(warrior), true);
    assert.strictEqual(canMove(warrior), false);
  });

  test('unit is not pinned when outnumbering taunters', () => {
    const warrior1 = createUnit('w1', 'Warrior 1', 'warrior', 'player');
    warrior1.zone = 1;
    const warrior2 = createUnit('w2', 'Warrior 2', 'warrior', 'player');
    warrior2.zone = 1;
    const orc = createUnit('o', 'Orc', 'orc', 'opponent');
    orc.zone = 1;
    orc.auras = { taunt: 1 };
    setupGameState([warrior1, warrior2, orc]);

    // 2 players vs 1 taunter: 2 > 1, so not pinned
    assert.strictEqual(isPinned(warrior1), false);
    assert.strictEqual(canMove(warrior1), true);
  });

  test('unit is not pinned when no taunters in zone', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    warrior.zone = 1;
    const orc = createUnit('o', 'Orc', 'orc', 'opponent');
    orc.zone = 3; // Different zone
    orc.auras = { taunt: 1 };
    setupGameState([warrior, orc]);

    // No taunters in warrior's zone
    assert.strictEqual(isPinned(warrior), false);
    assert.strictEqual(canMove(warrior), true);
  });

  test('enemy without taunt aura does not pin', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    warrior.zone = 1;
    const goblin = createUnit('g', 'Goblin', 'goblin', 'opponent');
    goblin.zone = 1;
    goblin.auras = {}; // No taunt
    setupGameState([warrior, goblin]);

    assert.strictEqual(isPinned(warrior), false);
    assert.strictEqual(canMove(warrior), true);
  });
});

describe('Weaken and Cripple effects', () => {
  test('Weaken reduces damage by 25%', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player'); // +3 bonus
    const target = createUnit('t', 'Target', 'orc', 'opponent');
    const card = { name: 'Attack', effects: { damage: 15 }, target: 'enemy' };

    // Normal attack: 15 + 3 = 18
    const normalResult = executeCardEffects(warrior, target, card);
    assert.strictEqual(normalResult.damage, 18);

    // Apply Weaken
    applyEffect(warrior, 'weaken', 'test', 1);

    // Weakened attack: (15 + 3) * 0.75 = 13.5 -> 13
    const weakenedResult = executeCardEffects(warrior, target, card);
    assert.strictEqual(weakenedResult.damage, 13);
  });

  test('Cripple reduces damage by 50%', () => {
    const orc = createUnit('o', 'Orc', 'orc', 'opponent'); // +6 bonus
    const target = createUnit('t', 'Target', 'warrior', 'player');
    const card = { name: 'Attack', effects: { damage: 15 }, target: 'enemy' };

    // Normal attack: 15 + 6 = 21
    const normalResult = executeCardEffects(orc, target, card);
    assert.strictEqual(normalResult.damage, 21);

    // Apply Cripple
    applyEffect(orc, 'cripple', 'test', 1);

    // Crippled attack: (15 + 6) * 0.5 = 10.5 -> 10
    const crippledResult = executeCardEffects(orc, target, card);
    assert.strictEqual(crippledResult.damage, 10);
  });

  test('Cripple takes precedence over Weaken', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player'); // +3 bonus
    const target = createUnit('t', 'Target', 'orc', 'opponent');
    const card = { name: 'Attack', effects: { damage: 20 }, target: 'enemy' };

    // Apply both effects
    applyEffect(warrior, 'weaken', 'test', 1);
    applyEffect(warrior, 'cripple', 'test', 1);

    // Base: 20 + 3 = 23, Cripple: 23 * 0.5 = 11.5 -> 11
    const result = executeCardEffects(warrior, target, card);
    assert.strictEqual(result.damage, 11);
  });

  test('Weaken does not affect block', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    const card = { name: 'Defend', effects: { block: 18 }, target: 'self' };

    applyEffect(warrior, 'weaken', 'test', 1);
    executeCardEffects(warrior, warrior, card);
    assert.strictEqual(warrior.block, 18); // Block unchanged
  });

  test('Weaken does not affect heal', () => {
    const mage = createUnit('m', 'Mage', 'mage', 'player'); // +5 bonus
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    warrior.hp = 50;
    const card = { name: 'Heal', effects: { heal: 15 }, target: 'ally' };

    applyEffect(mage, 'weaken', 'test', 1);
    executeCardEffects(mage, warrior, card);
    // Heal: 15 + 5 = 20, not affected by Weaken
    assert.strictEqual(warrior.hp, 70);
  });
});

describe('isSimpleCard', () => {
  test('damage-only card is simple', () => {
    const card = { name: 'Attack', effects: { damage: 15 }, target: 'enemy' };
    assert.strictEqual(isSimpleCard(card), true);
  });

  test('block-only card is simple', () => {
    const card = { name: 'Defend', effects: { block: 10 }, target: 'self' };
    assert.strictEqual(isSimpleCard(card), true);
  });

  test('damage+taunt card is NOT simple', () => {
    const card = { name: 'Shield Bash', effects: { damage: 10, taunt: 2 }, target: 'enemy' };
    assert.strictEqual(isSimpleCard(card), false);
  });

  test('damage+block card is NOT simple', () => {
    const card = { name: 'Strike and Guard', effects: { damage: 10, block: 5 }, target: 'enemy' };
    assert.strictEqual(isSimpleCard(card), false);
  });

  test('heal card is NOT simple', () => {
    const card = { name: 'Heal', effects: { heal: 15 }, target: 'ally' };
    assert.strictEqual(isSimpleCard(card), false);
  });

  test('auraBonus card is NOT simple', () => {
    const card = { name: 'Empower', effects: { auraBonus: 3 }, target: 'ally' };
    assert.strictEqual(isSimpleCard(card), false);
  });

  test('card with no effects is NOT simple', () => {
    const card = { name: 'Nothing', target: 'self' };
    assert.strictEqual(isSimpleCard(card), false);
  });
});

describe('Fatigued effect', () => {
  function setupGameState(units) {
    gameState.units = units;
  }

  test('Fatigued reduces damage by 25% (same as Weaken)', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player'); // +3 bonus
    const target = createUnit('t', 'Target', 'orc', 'opponent');
    const card = { name: 'Attack', effects: { damage: 15 }, target: 'enemy' };

    // Apply Fatigued
    applyEffect(warrior, 'fatigued', 'test', 1);

    // Fatigued attack: (15 + 3) * 0.75 = 13.5 -> 13
    const result = executeCardEffects(warrior, target, card);
    assert.strictEqual(result.damage, 13);
  });

  test('Fatigued unit CAN play simple damage card', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    const simpleCard = { name: 'Attack', effects: { damage: 15 }, target: 'enemy' };

    applyEffect(warrior, 'fatigued', 'test', 1);

    assert.strictEqual(canPlayCard(warrior, simpleCard), true);
  });

  test('Fatigued unit CAN play simple block card', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    const defendCard = { name: 'Defend', effects: { block: 10 }, target: 'self' };

    applyEffect(warrior, 'fatigued', 'test', 1);

    assert.strictEqual(canPlayCard(warrior, defendCard), true);
  });

  test('Fatigued unit CANNOT play damage+taunt card', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    const shieldBash = { name: 'Shield Bash', effects: { damage: 10, taunt: 2 }, requires: 'melee', target: 'enemy' };

    applyEffect(warrior, 'fatigued', 'test', 1);

    assert.strictEqual(canPlayCard(warrior, shieldBash), false);
  });

  test('Fatigued unit CANNOT play auraBonus card', () => {
    const mage = createUnit('m', 'Mage', 'mage', 'player');
    const empowerCard = { name: 'Empower', effects: { auraBonus: 3 }, target: 'ally' };

    applyEffect(mage, 'fatigued', 'test', 1);

    assert.strictEqual(canPlayCard(mage, empowerCard), false);
  });

  test('Fatigued unit CANNOT move', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    warrior.zone = 0; // Zone A
    setupGameState([warrior]);

    // Without fatigued, unit can move
    assert.strictEqual(canMove(warrior), true);

    // Apply fatigued
    applyEffect(warrior, 'fatigued', 'test', 1);

    // With fatigued, unit cannot move
    assert.strictEqual(canMove(warrior), false);
  });

  test('moveUnit applies Fatigued (not Weaken)', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    warrior.zone = 0; // Zone A
    setupGameState([warrior]);

    // Move to zone X
    moveUnit(warrior, 1);

    assert.strictEqual(warrior.zone, 1);
    assert.strictEqual(hasEffect(warrior, 'fatigued'), true);
    assert.strictEqual(hasEffect(warrior, 'weaken'), false);
  });

  test('Cripple takes precedence over Fatigued', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player'); // +3 bonus
    const target = createUnit('t', 'Target', 'orc', 'opponent');
    const card = { name: 'Attack', effects: { damage: 20 }, target: 'enemy' };

    // Apply both effects
    applyEffect(warrior, 'fatigued', 'test', 1);
    applyEffect(warrior, 'cripple', 'test', 1);

    // Base: 20 + 3 = 23, Cripple: 23 * 0.5 = 11.5 -> 11
    const result = executeCardEffects(warrior, target, card);
    assert.strictEqual(result.damage, 11);
  });
});
