/**
 * Unit Definitions
 *
 * This file contains all unit stats. Edit this file to add/modify units.
 * The game engine reads from UNIT_DATA to build units.
 *
 * UNIT STRUCTURE:
 * {
 *   maxHp: number,             // Maximum health points
 *   attackRange: 'melee' | 'ranged',  // Attack range type
 *   attackType: 'physical' | 'magic', // Attack damage type
 *   damageBonus: number,       // Bonus added to card's base damage (can be negative)
 * }
 *
 * The key is the unit type (must match key in sprites.js UNIT_SVGS)
 */

const UNIT_DATA = {
  // ============================================================================
  // PLAYER UNITS
  // ============================================================================

  warrior: {
    maxHp: 90,
    attackRange: 'melee',
    attackType: 'physical',
    damageBonus: 5
  },

  archer: {
    maxHp: 70,
    attackRange: 'ranged',
    attackType: 'physical',
    damageBonus: 0
  },

  mage: {
    maxHp: 50,
    attackRange: 'ranged',
    attackType: 'magic',
    damageBonus: 5
  },

  // ============================================================================
  // ENEMY UNITS
  // ============================================================================

  orc: {
    maxHp: 110,
    attackRange: 'melee',
    attackType: 'physical',
    damageBonus: 10
  },

  goblin: {
    maxHp: 50,
    attackRange: 'ranged',
    attackType: 'physical',
    damageBonus: -5
  }
};
