/**
 * GameState - Manages all game state and provides helper methods
 *
 * Encapsulates:
 * - Turn tracking
 * - Unit management
 * - Turn order
 * - Phase management
 * - Card/deck state per team
 * - Control settings (human/ai)
 */

class GameState {
  constructor() {
    this.reset();
  }

  /**
   * Reset game state to initial values
   */
  reset() {
    this.turn = 1;
    this.units = [];
    this.turnOrder = [];
    this.currentUnitIndex = 0;
    this.phase = 'play'; // 'play', 'targeting', 'moving'
    this.selectedCard = null;
    this.validTargets = [];
    this.validMoveZones = [];

    // Control settings: 'human' or 'ai'
    this.playerControl = 'human';
    this.opponentControl = 'ai';

    // Card state per team
    this.playerDeck = [];
    this.playerHand = [];
    this.opponentDeck = [];
    this.opponentHand = [];
  }

  // ===========================================================================
  // UNIT ACCESSORS
  // ===========================================================================

  /**
   * Get the current unit (whose turn it is)
   * @returns {Object|null}
   */
  getCurrentUnit() {
    if (this.turnOrder.length === 0) return null;
    const unitId = this.turnOrder[this.currentUnitIndex];
    return this.units.find(u => u.id === unitId) || null;
  }

  /**
   * Get unit by ID
   * @param {string} id
   * @returns {Object|null}
   */
  getUnit(id) {
    return this.units.find(u => u.id === id) || null;
  }

  /**
   * Get all units of a team
   * @param {string} team - 'player' or 'opponent'
   * @returns {Object[]}
   */
  getTeamUnits(team) {
    return this.units.filter(u => u.team === team);
  }

  /**
   * Get all enemies of a unit
   * @param {Object} unit
   * @returns {Object[]}
   */
  getEnemies(unit) {
    return this.units.filter(u => u.team !== unit.team);
  }

  /**
   * Get all allies of a unit (excluding self)
   * @param {Object} unit
   * @returns {Object[]}
   */
  getAllies(unit) {
    return this.units.filter(u => u.team === unit.team && u.id !== unit.id);
  }

  /**
   * Check if any units of a team are alive
   * @param {string} team
   * @returns {boolean}
   */
  hasAliveUnits(team) {
    return this.units.some(u => u.team === team);
  }

  // ===========================================================================
  // DECK/HAND ACCESSORS
  // ===========================================================================

  /**
   * Get deck for a team
   * @param {string} team
   * @returns {string[]}
   */
  getDeck(team) {
    return team === 'player' ? this.playerDeck : this.opponentDeck;
  }

  /**
   * Get hand for a team
   * @param {string} team
   * @returns {string[]}
   */
  getHand(team) {
    return team === 'player' ? this.playerHand : this.opponentHand;
  }

  /**
   * Get current unit's hand
   * @returns {string[]}
   */
  getCurrentHand() {
    const unit = this.getCurrentUnit();
    if (!unit) return [];
    return this.getHand(unit.team);
  }

  // ===========================================================================
  // CONTROL HELPERS
  // ===========================================================================

  /**
   * Check if a unit is controlled by a human
   * @param {Object} unit
   * @returns {boolean}
   */
  isHumanControlled(unit) {
    if (!unit) return false;
    if (unit.team === 'player') {
      return this.playerControl === 'human';
    } else {
      return this.opponentControl === 'human';
    }
  }

  /**
   * Check if a unit is controlled by AI
   * @param {Object} unit
   * @returns {boolean}
   */
  isAIControlled(unit) {
    return !this.isHumanControlled(unit);
  }

  // ===========================================================================
  // TURN MANAGEMENT
  // ===========================================================================

  /**
   * Advance to the next unit's turn
   */
  advanceToNextUnit() {
    this.currentUnitIndex++;
    if (this.currentUnitIndex >= this.turnOrder.length) {
      this.currentUnitIndex = 0;
      this.turn++;
    }
  }

  // ===========================================================================
  // UNIT REMOVAL
  // ===========================================================================

  /**
   * Remove a unit from the game (when it dies)
   * @param {string} unitId
   */
  removeUnit(unitId) {
    const deadIndex = this.turnOrder.indexOf(unitId);
    this.turnOrder = this.turnOrder.filter(id => id !== unitId);

    // Adjust current index if needed
    if (deadIndex !== -1 && deadIndex < this.currentUnitIndex) {
      this.currentUnitIndex--;
    }

    this.units = this.units.filter(u => u.id !== unitId);
  }

  /**
   * Get dead units (hp <= 0)
   * @returns {Object[]}
   */
  getDeadUnits() {
    return this.units.filter(u => u.hp <= 0);
  }

  // ===========================================================================
  // GAME STATUS
  // ===========================================================================

  /**
   * Check game over status
   * @returns {'ongoing' | 'victory' | 'defeat'}
   */
  checkGameOver() {
    const playerAlive = this.hasAliveUnits('player');
    const opponentAlive = this.hasAliveUnits('opponent');

    if (!playerAlive) return 'defeat';
    if (!opponentAlive) return 'victory';
    return 'ongoing';
  }

  // ===========================================================================
  // PHASE MANAGEMENT
  // ===========================================================================

  /**
   * Enter play phase
   */
  enterPlayPhase() {
    this.phase = 'play';
    this.selectedCard = null;
    this.validTargets = [];
    this.validMoveZones = [];
  }

  /**
   * Enter targeting phase
   * @param {string} cardId
   * @param {Object[]} targets
   */
  enterTargetingPhase(cardId, targets) {
    this.phase = 'targeting';
    this.selectedCard = cardId;
    this.validTargets = targets;
  }

  /**
   * Enter moving phase
   * @param {number[]} moveZones
   */
  enterMovingPhase(moveZones) {
    this.phase = 'moving';
    this.validMoveZones = moveZones;
  }
}
