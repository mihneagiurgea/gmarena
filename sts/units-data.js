/**
 * Unit Definitions
 *
 * This file contains all unit stats. Edit this file to add/modify units.
 * The game engine will read from UNIT_DATA to build units.
 *
 * UNIT STRUCTURE:
 * {
 *   type: string,              // Unique identifier (matches key in sprites.js UNIT_SVGS)
 *   maxHp: number,             // Maximum health points
 *   attackRange: 'melee' | 'ranged',  // Attack range type
 *   attackType: 'physical' | 'magic', // Attack damage type
 *   damage: number,            // Base damage dealt
 * }
 */

const UNIT_DATA = [
  // ============================================================================
  // PLAYER UNITS
  // ============================================================================

  {
    type: 'warrior',
    maxHp: 90,
    attackRange: 'melee',
    attackType: 'physical',
    damage: 20
  },

  {
    type: 'archer',
    maxHp: 70,
    attackRange: 'ranged',
    attackType: 'physical',
    damage: 15
  },

  {
    type: 'mage',
    maxHp: 50,
    attackRange: 'ranged',
    attackType: 'magic',
    damage: 20
  },

  // ============================================================================
  // ENEMY UNITS
  // ============================================================================

  {
    type: 'orc',
    maxHp: 110,
    attackRange: 'melee',
    attackType: 'physical',
    damage: 25
  },

  {
    type: 'goblin',
    maxHp: 50,
    attackRange: 'ranged',
    attackType: 'physical',
    damage: 10
  }
];

// Build UNIT_STATS object from UNIT_DATA array for engine compatibility
const UNIT_STATS = {};
UNIT_DATA.forEach(unit => {
  UNIT_STATS[unit.type] = {
    maxHp: unit.maxHp,
    attackRange: unit.attackRange,
    attackType: unit.attackType,
    damage: unit.damage
  };
});
