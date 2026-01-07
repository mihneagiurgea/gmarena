/**
 * Zone System - Diamond layout zone management
 *
 * Layout:
 *       [X]
 *      /   \
 *   [A]     [B]
 *      \   /
 *       [Y]
 *
 * - Zone A: Team A starting zone (left)
 * - Zone B: Team B starting zone (right)
 * - Zone X: Top lane
 * - Zone Y: Bottom lane
 *
 * Connectivity: A↔X, A↔Y, X↔B, Y↔B
 */

// Zone constants
const ZONES = {
  A: 0,  // Team A start (left)
  X: 1,  // Top lane
  Y: 2,  // Bottom lane
  B: 3   // Team B start (right)
};

const ZONE_NAMES = ['A', 'X', 'Y', 'B'];
const NUM_ZONES = 4;

/**
 * Zone utility class for zone-related calculations
 * All methods are static and take units array as parameter for flexibility
 */
class ZoneUtils {
  /**
   * Get adjacent zones for a given zone (diamond layout)
   * @param {number} zone - Zone index
   * @returns {number[]} Array of adjacent zone indices
   */
  static getAdjacentZones(zone) {
    if (zone === ZONES.A) return [ZONES.X, ZONES.Y];
    if (zone === ZONES.X) return [ZONES.A, ZONES.B];
    if (zone === ZONES.Y) return [ZONES.A, ZONES.B];
    if (zone === ZONES.B) return [ZONES.X, ZONES.Y];
    return [];
  }

  /**
   * Check if two zones are adjacent
   * @param {number} zone1 - First zone index
   * @param {number} zone2 - Second zone index
   * @returns {boolean}
   */
  static areAdjacent(zone1, zone2) {
    return ZoneUtils.getAdjacentZones(zone1).includes(zone2);
  }

  /**
   * Get all units in a specific zone
   * @param {Object[]} units - Array of unit objects
   * @param {number} zone - Zone index
   * @returns {Object[]} Units in the zone
   */
  static getUnitsInZone(units, zone) {
    return units.filter(u => u.zone === zone);
  }

  /**
   * Count units of a specific team in a zone
   * @param {Object[]} units - Array of unit objects
   * @param {number} zone - Zone index
   * @param {string} team - Team identifier
   * @returns {number}
   */
  static getTeamCount(units, zone, team) {
    return units.filter(u => u.zone === zone && u.team === team).length;
  }

  /**
   * Count enemy units with taunt aura in a zone
   * @param {Object[]} units - Array of unit objects
   * @param {number} zone - Zone index
   * @param {string} team - The team checking (counts enemies with taunt)
   * @returns {number}
   */
  static getTauntCount(units, zone, team) {
    return units.filter(u =>
      u.zone === zone &&
      u.team !== team &&
      u.auras && u.auras.taunt > 0
    ).length;
  }

  /**
   * Check if a unit is pinned in its current zone
   * Pinned if: teamCount <= enemy taunt count in same zone
   * @param {Object[]} units - Array of unit objects
   * @param {Object} unit - The unit to check
   * @returns {boolean}
   */
  static isPinned(units, unit) {
    const teamCount = ZoneUtils.getTeamCount(units, unit.zone, unit.team);
    const tauntCount = ZoneUtils.getTauntCount(units, unit.zone, unit.team);
    return teamCount <= tauntCount;
  }

  /**
   * Get valid zones a unit can move to
   * Returns empty array if pinned
   * @param {Object[]} units - Array of unit objects
   * @param {Object} unit - The unit to check
   * @returns {number[]} Array of valid zone indices
   */
  static getValidMoveZones(units, unit) {
    if (ZoneUtils.isPinned(units, unit)) return [];
    return ZoneUtils.getAdjacentZones(unit.zone);
  }

  /**
   * Check if unit can move (has valid move zones and not fatigued)
   * @param {Object[]} units - Array of unit objects
   * @param {Object} unit - The unit to check
   * @param {Function} hasEffect - Function to check if unit has an effect
   * @returns {boolean}
   */
  static canMove(units, unit, hasEffect) {
    if (hasEffect(unit, 'fatigued')) return false;
    return ZoneUtils.getValidMoveZones(units, unit).length > 0;
  }

  /**
   * Get zone name from index
   * @param {number} zone - Zone index
   * @returns {string} Zone name
   */
  static getZoneName(zone) {
    return ZONE_NAMES[zone] || '?';
  }
}
