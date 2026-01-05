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
//   auras: {                   // Permanent auras (all optional)
//     bonus: number,           // Added to damage and heal effects
//     armor: number,           // Reduces incoming physical damage
//     resistance: number,      // Reduces incoming magic damage
//     taunt: number,           // All attacks apply Taunt (X)
//   }
// }
//
// The key is the unit type (must match key in sprites.js UNIT_SVGS)

const UNIT_DATA = {
  // Player units
  warrior: {
    maxHp: 90,
    attackRange: 'melee',
    attackType: 'physical',
    auras: { bonus: 3, taunt: 1 }
  },

  archer: {
    maxHp: 70,
    attackRange: 'ranged',
    attackType: 'physical'
  },

  mage: {
    maxHp: 50,
    attackRange: 'ranged',
    attackType: 'magic',
    auras: { bonus: 5 }
  },

  // Enemy units
  orc: {
    maxHp: 110,
    attackRange: 'melee',
    attackType: 'physical',
    auras: { bonus: 6 }
  },

  goblin: {
    maxHp: 50,
    attackRange: 'ranged',
    attackType: 'physical',
    auras: { bonus: -2 }
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
//     damage: number,     // Base damage (unit's bonus aura is added)
//     taunt: number,      // Apply Taunt X to target
//     heal: number,       // Heal target (unit's bonus aura is added)
//     block: number,      // Gain block
//     auraBonus: number,  // Grant permanent bonus aura to target
//   },
//   target: 'enemy' | 'ally' | 'self' | 'any',
// }

const CARD_DATA = [
  // Basic cards (any unit can play)
  {
    id: 'attack',
    name: 'Attack',
    description: 'Deal {damage} damage',
    effects: { damage: 15 },
    target: 'enemy'
  },

  {
    id: 'defend',
    name: 'Defend',
    description: 'Gain {block} Block',
    effects: { block: 18 },
    target: 'self'
  },

  // Tech cards - Melee
  {
    id: 'shieldBash',
    name: 'Shield Bash',
    description: 'Deal {damage} damage and Taunt ({taunt})',
    requires: 'melee',
    effects: { damage: 10, taunt: 2 },
    target: 'enemy'
  },

  // Tech cards - Magic
  {
    id: 'fireball',
    name: 'Fireball',
    description: 'Deal {damage} damage',
    requires: 'magic',
    effects: { damage: 20 },
    target: 'enemy'
  },
  {
    id: 'heal',
    name: 'Heal',
    description: 'Heal {heal} HP',
    requires: 'magic',
    effects: { heal: 15 },
    target: 'ally'
  },
  {
    id: 'magicShield',
    name: 'Magic Shield',
    description: 'Gain {block} Block',
    requires: 'magic',
    effects: { block: 20 },
    target: 'ally'
  },
  {
    id: 'flamingBlade',
    name: 'Flaming Blade',
    description: 'Grant +{auraBonus} bonus',
    requires: 'magic',
    effects: { auraBonus: 6 },
    target: 'ally'
  }
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
    attack: 5,
    defend: 4,
    shieldBash: 2,
    fireball: 1,
    heal: 1,
    magicShield: 1,
    flamingBlade: 1,
  },

  opponent: {
    attack: 10
  }
};

// ============================================================================
// TEAMS
// ============================================================================
//
// Define starting team compositions as arrays of unit types.
// Unit types must match keys in UNIT_DATA.
// IDs and names are auto-generated (e.g., ['orc', 'orc'] -> Orc #1, Orc #2)

const TEAM_DATA = {
  player: ['warrior', 'mage', 'mage'],
  opponent: ['orc', 'orc', 'goblin']
};
