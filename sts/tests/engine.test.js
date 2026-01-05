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
  isAttackCard, canAdvance, ADVANCE_ATTACK_PENALTY
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

describe('canAdvance', () => {
  test('melee unit in starting zone can advance', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    warrior.zone = 0; // Zone A (player starting zone)
    warrior.hasAdvanced = false;
    assert.strictEqual(canAdvance(warrior), true);
  });

  test('melee unit that has already advanced cannot advance again', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    warrior.zone = 1; // Zone X
    warrior.hasAdvanced = true;
    assert.strictEqual(canAdvance(warrior), false);
  });

  test('melee unit in zone X cannot advance', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    warrior.zone = 1; // Zone X
    warrior.hasAdvanced = false;
    assert.strictEqual(canAdvance(warrior), false);
  });

  test('ranged unit cannot advance', () => {
    const archer = createUnit('a', 'Archer', 'archer', 'player');
    archer.zone = 0; // Zone A
    archer.hasAdvanced = false;
    assert.strictEqual(canAdvance(archer), false);
  });

  test('opponent melee unit in zone B can advance', () => {
    const orc = createUnit('o', 'Orc', 'orc', 'opponent');
    orc.zone = 2; // Zone B (opponent starting zone)
    orc.hasAdvanced = false;
    assert.strictEqual(canAdvance(orc), true);
  });
});

describe('advance attack penalty', () => {
  test('ADVANCE_ATTACK_PENALTY is 3', () => {
    assert.strictEqual(ADVANCE_ATTACK_PENALTY, 3);
  });

  test('executeCardEffects applies bonus penalty to damage', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player'); // +3 bonus
    const target = createUnit('t', 'Target', 'orc', 'opponent');
    const card = { name: 'Attack', effects: { damage: 15 }, target: 'enemy' };

    // Normal attack: 15 + 3 = 18
    const normalResult = executeCardEffects(warrior, target, card);
    assert.strictEqual(normalResult.damage, 18);

    // Advance attack: 15 + 3 - 3 = 15
    const advanceResult = executeCardEffects(warrior, target, card, { bonusPenalty: 3 });
    assert.strictEqual(advanceResult.damage, 15);
  });

  test('bonus penalty reduces damage by penalty amount', () => {
    const orc = createUnit('o', 'Orc', 'orc', 'opponent'); // +6 bonus
    const target = createUnit('t', 'Target', 'warrior', 'player');
    const card = { name: 'Attack', effects: { damage: 15 }, target: 'enemy' };

    // Normal attack: 15 + 6 = 21
    const normalResult = executeCardEffects(orc, target, card);
    assert.strictEqual(normalResult.damage, 21);

    // Advance attack: 15 + 6 - 3 = 18
    const advanceResult = executeCardEffects(orc, target, card, { bonusPenalty: ADVANCE_ATTACK_PENALTY });
    assert.strictEqual(advanceResult.damage, 18);
  });

  test('bonus penalty can make damage lower than base', () => {
    const goblin = createUnit('g', 'Goblin', 'goblin', 'opponent'); // -2 bonus
    const target = createUnit('t', 'Target', 'warrior', 'player');
    const card = { name: 'Attack', effects: { damage: 15 }, target: 'enemy' };

    // Normal attack: 15 - 2 = 13
    const normalResult = executeCardEffects(goblin, target, card);
    assert.strictEqual(normalResult.damage, 13);

    // Advance attack: 15 - 2 - 3 = 10
    const advanceResult = executeCardEffects(goblin, target, card, { bonusPenalty: ADVANCE_ATTACK_PENALTY });
    assert.strictEqual(advanceResult.damage, 10);
  });

  test('bonus penalty does not reduce damage below 0', () => {
    const goblin = createUnit('g', 'Goblin', 'goblin', 'opponent'); // -2 bonus
    const target = createUnit('t', 'Target', 'warrior', 'player');
    const card = { name: 'Weak Attack', effects: { damage: 3 }, target: 'enemy' };

    // Normal attack: 3 - 2 = 1
    const normalResult = executeCardEffects(goblin, target, card);
    assert.strictEqual(normalResult.damage, 1);

    // Advance attack: 3 - 2 - 3 = -2 -> clamped to 0
    const advanceResult = executeCardEffects(goblin, target, card, { bonusPenalty: ADVANCE_ATTACK_PENALTY });
    assert.strictEqual(advanceResult.damage, 0);
  });

  test('bonus penalty does not affect non-damage effects', () => {
    const warrior = createUnit('w', 'Warrior', 'warrior', 'player');
    const card = { name: 'Defend', effects: { block: 18 }, target: 'self' };

    executeCardEffects(warrior, warrior, card, { bonusPenalty: ADVANCE_ATTACK_PENALTY });
    assert.strictEqual(warrior.block, 18); // Block unchanged by penalty
  });
});
