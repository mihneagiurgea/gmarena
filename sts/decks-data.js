/**
 * Deck Definitions
 *
 * Define the starting deck for each team.
 * Format: { cardId: count, ... }
 *
 * Card IDs must match those defined in cards-data.js
 */

const DECK_DATA = {
  player: {
    attack: 6,
    defend: 4,
    shieldBash: 5
  },

  opponent: {
    attack: 10,
  }
};
