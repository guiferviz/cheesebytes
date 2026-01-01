/**
 * Creates a pseudo-random number generator based on the Mulberry32 algorithm.
 * 
 * @param seed A 32-bit integer seed.
 * @returns A function that returns a floating-point number in the range [0, 1) when called.
 * 
 * @example
 * const rng = mulberry32(12345);
 * const n1 = rng(); // e.g. 0.789123
 * const n2 = rng(); // next pseudo-random number
 */
export function mulberry32(seed: number): () => number {
  return (): number => {
    seed = (seed + 0x6d2b79f5) | 0;

    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
