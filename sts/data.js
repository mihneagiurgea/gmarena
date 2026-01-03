/**
 * Game Data - Units, Cards, and Decks
 *
 * This file contains all game data definitions.
 */

// ============================================================================
// UNITS
// ============================================================================
//
// UNIT STRUCTURE:
// {
//   maxHp: number,             // Maximum health points
//   attackRange: 'melee' | 'ranged',  // Attack range type
//   attackType: 'physical' | 'magic', // Attack damage type
//   damageBonus: number,       // Bonus added to card's base damage (can be negative)
// }
//
// The key is the unit type (must match key in sprites.js UNIT_SVGS)

const UNIT_DATA = {
  // Player units
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

  // Enemy units
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

// ============================================================================
// CARDS
// ============================================================================
//
// CARD STRUCTURE:
// {
//   id: string,           // Unique identifier (used internally)
//   name: string,         // Display name
//   description: string,  // What the card does (shown to player)
//   requires: null | string,  // null = Basic card, string = Tech card requirements
//                             // Values: 'melee', 'ranged', 'physical', 'magic' (comma-separated)
//   effects: {
//     damage: number,     // Base damage (unit's damageBonus is added)
//     taunt: number,      // Apply Taunt X to target
//     heal: number,       // Heal target
//     block: number,      // Gain block
//   },
//   target: 'enemy' | 'ally' | 'self' | 'any',
// }

const CARD_DATA = [
  // Basic cards (any unit can play)
  {
    id: 'attack',
    name: 'Attack',
    description: 'Deal 15 damage',
    effects: { damage: 15 },
    target: 'enemy'
  },

  {
    id: 'defend',
    name: 'Defend',
    description: 'Gain 10 Block',
    effects: { block: 10 },
    target: 'self'
  },

  // Tech cards - Melee
  {
    id: 'shieldBash',
    name: 'Shield Bash',
    description: 'Deal 10 damage and Taunt (2)',
    requires: 'melee',
    effects: { damage: 10, taunt: 2 },
    target: 'enemy'
  },
];

// ============================================================================
// DECKS
// ============================================================================
//
// Define starting deck for each team.
// Format: { cardId: count, ... }
// Card IDs must match those defined in CARD_DATA above.

const DECK_DATA = {
  player: {
    attack: 6,
    defend: 4,
    shieldBash: 5
  },

  opponent: {
    attack: 10
  }
};
