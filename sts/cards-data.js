/**
 * Card Definitions
 *
 * This file contains all card data. Edit this file to add/modify cards.
 * The game engine will read from CARD_DATA to build the card system.
 *
 * CARD STRUCTURE:
 * {
 *   id: string,           // Unique identifier (used internally)
 *   name: string,         // Display name
 *   description: string,  // What the card does (shown to player)
 *
 *   // Who can play this card (comma-separated):
 *   // - null or omitted = Basic card (any unit can play)
 *   // - string = Tech card (only units matching requirements)
 *   // Values: 'melee', 'ranged', 'physical', 'magic'
 *   // Examples:
 *   //   requires: null             -> Basic card, any unit
 *   //   requires: 'melee'          -> Tech card, melee units only
 *   //   requires: 'melee, physical' -> Tech card, melee AND physical
 *   requires: null,
 *
 *   // What the card does:
 *   effects: {
 *     damage: number,           // Deal damage (uses unit's damage stat if not specified)
 *     damageMultiplier: number, // Multiply unit's damage (e.g., 1.5 for 150%)
 *     taunt: number,            // Apply Taunt X to target
 *     heal: number,             // Heal target
 *     // ... more effects can be added
 *   },
 *
 *   // Targeting:
 *   target: 'enemy' | 'ally' | 'self' | 'any',  // Who can be targeted
 * }
 */

const CARD_DATA = [
  // ============================================================================
  // BASIC CARDS (no requirements, any unit can play)
  // ============================================================================

  {
    id: 'attack',
    name: 'Attack',
    description: 'Deal damage to target enemy',
    effects: {
      damage: true  // Uses unit's damage stat
    },
    target: 'enemy'
  },

  {
    id: 'defend',
    name: 'Defend',
    description: 'Gain 10 Block',
    effects: {
      block: 10
    },
    target: 'self'
  },

  // ============================================================================
  // TECH CARDS - MELEE
  // ============================================================================

  {
    id: 'shieldBash',
    name: 'Shield Bash',
    description: 'Deal damage and Taunt (2)',
    requires: 'melee',
    effects: {
      damage: true,
      taunt: 2
    },
    target: 'enemy'
  },

  // {
  //   id: 'heavyStrike',
  //   name: 'Heavy Strike',
  //   description: 'Deal 150% damage',
  //   requires: 'melee',
  //   effects: {
  //     damageMultiplier: 1.5
  //   },
  //   target: 'enemy'
  // },

  // ============================================================================
  // TECH CARDS - RANGED
  // ============================================================================

  // {
  //   id: 'powerShot',
  //   name: 'Power Shot',
  //   description: 'Deal 150% damage',
  //   requires: 'ranged',
  //   effects: {
  //     damageMultiplier: 1.5
  //   },
  //   target: 'enemy'
  // },

  // ============================================================================
  // TECH CARDS - MAGIC
  // ============================================================================

  // {
  //   id: 'fireball',
  //   name: 'Fireball',
  //   description: 'Deal 25 magic damage',
  //   requires: 'magic',
  //   effects: {
  //     damage: 25
  //   },
  //   target: 'enemy'
  // },

  // {
  //   id: 'heal',
  //   name: 'Heal',
  //   description: 'Restore 20 HP to an ally',
  //   requires: 'magic',
  //   effects: {
  //     heal: 20
  //   },
  //   target: 'ally'
  // },

  // ============================================================================
  // TECH CARDS - PHYSICAL
  // ============================================================================

  // {
  //   id: 'preciseStrike',
  //   name: 'Precise Strike',
  //   description: 'Deal 120% damage',
  //   requires: 'physical',
  //   effects: {
  //     damageMultiplier: 1.2
  //   },
  //   target: 'enemy'
  // },
];
