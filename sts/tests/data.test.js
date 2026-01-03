/**
 * Data validation tests
 *
 * Validates structure and cross-references across data files.
 * Run with: node --test data/tests/
 */
const { test, describe } = require('node:test');
const assert = require('node:assert');
const { loadData } = require('./loader');

const data = loadData();
const { UNIT_DATA, CARD_DATA, DECK_DATA } = data;

// Valid enum values
const VALID_ATTACK_RANGE = ['melee', 'ranged'];
const VALID_ATTACK_TYPE = ['physical', 'magic'];
const VALID_TARGET = ['enemy', 'ally', 'self', 'any'];
const VALID_REQUIRES = ['melee', 'ranged', 'physical', 'magic'];

// Build card lookup for cross-reference checks
const cardIds = new Set(CARD_DATA.map(c => c.id));

describe('units-data.js', () => {
  test('UNIT_DATA is defined', () => {
    assert.ok(UNIT_DATA, 'UNIT_DATA should be defined');
    assert.ok(typeof UNIT_DATA === 'object', 'UNIT_DATA should be an object');
  });

  for (const [type, unit] of Object.entries(UNIT_DATA)) {
    describe(`unit: ${type}`, () => {
      test('has valid maxHp', () => {
        assert.ok(typeof unit.maxHp === 'number', 'maxHp should be a number');
        assert.ok(unit.maxHp > 0, 'maxHp should be positive');
      });

      test('has valid attackRange', () => {
        assert.ok(
          VALID_ATTACK_RANGE.includes(unit.attackRange),
          `attackRange should be one of: ${VALID_ATTACK_RANGE.join(', ')}`
        );
      });

      test('has valid attackType', () => {
        assert.ok(
          VALID_ATTACK_TYPE.includes(unit.attackType),
          `attackType should be one of: ${VALID_ATTACK_TYPE.join(', ')}`
        );
      });

      test('has valid damageBonus', () => {
        assert.ok(typeof unit.damageBonus === 'number', 'damageBonus should be a number');
      });
    });
  }
});

describe('cards-data.js', () => {
  test('CARD_DATA is defined', () => {
    assert.ok(CARD_DATA, 'CARD_DATA should be defined');
    assert.ok(Array.isArray(CARD_DATA), 'CARD_DATA should be an array');
  });

  test('card IDs are unique', () => {
    const ids = CARD_DATA.map(c => c.id);
    const uniqueIds = new Set(ids);
    assert.strictEqual(ids.length, uniqueIds.size, 'All card IDs should be unique');
  });

  for (const card of CARD_DATA) {
    describe(`card: ${card.id}`, () => {
      test('has required fields', () => {
        assert.ok(typeof card.id === 'string', 'id should be a string');
        assert.ok(typeof card.name === 'string', 'name should be a string');
        assert.ok(typeof card.description === 'string', 'description should be a string');
      });

      test('has valid target', () => {
        const target = card.target || 'enemy';
        assert.ok(
          VALID_TARGET.includes(target),
          `target should be one of: ${VALID_TARGET.join(', ')}`
        );
      });

      test('has effects object', () => {
        assert.ok(typeof card.effects === 'object', 'effects should be an object');
      });

      if (card.requires) {
        test('has valid requires', () => {
          const reqs = card.requires.split(',').map(r => r.trim());
          for (const req of reqs) {
            assert.ok(
              VALID_REQUIRES.includes(req),
              `requires "${req}" should be one of: ${VALID_REQUIRES.join(', ')}`
            );
          }
        });
      }
    });
  }
});

describe('decks-data.js', () => {
  test('DECK_DATA is defined', () => {
    assert.ok(DECK_DATA, 'DECK_DATA should be defined');
    assert.ok(typeof DECK_DATA === 'object', 'DECK_DATA should be an object');
  });

  for (const [team, deck] of Object.entries(DECK_DATA)) {
    describe(`deck: ${team}`, () => {
      test('is not empty', () => {
        assert.ok(Object.keys(deck).length > 0, 'deck should not be empty');
      });

      for (const [cardId, count] of Object.entries(deck)) {
        test(`card "${cardId}" exists in CARD_DATA`, () => {
          assert.ok(cardIds.has(cardId), `card "${cardId}" not found in CARD_DATA`);
        });

        test(`card "${cardId}" has valid count`, () => {
          assert.ok(typeof count === 'number', 'count should be a number');
          assert.ok(count > 0, 'count should be positive');
          assert.ok(Number.isInteger(count), 'count should be an integer');
        });
      }
    });
  }
});
