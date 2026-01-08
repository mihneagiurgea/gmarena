/**
 * Seeded Random Number Generator
 * Uses mulberry32 algorithm for deterministic random numbers
 */

class SeededRandom {
  constructor(seed = null) {
    if (seed === null) {
      seed = Date.now();
    }
    this.initialSeed = seed;
    this.state = seed;
    console.log(`[SeededRandom] Initialized with seed: ${seed}`);
  }

  /**
   * Returns a random float in [0, 1) - like Math.random()
   */
  random() {
    // Mulberry32 PRNG
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  /**
   * Returns a random integer in [0, max)
   */
  randomInt(max) {
    return Math.floor(this.random() * max);
  }

  /**
   * Returns a random integer in [min, max]
   */
  randomRange(min, max) {
    return min + Math.floor(this.random() * (max - min + 1));
  }

  /**
   * Shuffle an array using Fisher-Yates (uses seeded random)
   */
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.randomInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Pick a random element from an array
   */
  pick(array) {
    return array[this.randomInt(array.length)];
  }

  /**
   * Reset to initial seed (for replay)
   */
  reset() {
    this.state = this.initialSeed;
  }

  /**
   * Get the current seed for saving/sharing
   */
  getSeed() {
    return this.initialSeed;
  }
}

// Global RNG instance - will be initialized by ui.js or simulator.js
let rng = null;

function initRNG(seed = null) {
  rng = new SeededRandom(seed);
  return rng;
}

function getRNG() {
  if (!rng) {
    throw new Error('RNG not initialized. Call initRNG(seed) first.');
  }
  return rng;
}
