// Seeded pseudo random numbers. Zero dependencies, fully deterministic.
// Every script in this folder uses these helpers so a rerun on another
// machine produces byte-identical output.

/** mulberry32 -> a small 32 bit PRNG with a decent period for fixtures. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turn a string into a 32 bit seed so streams can be named. */
export function seedFrom(label) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < label.length; i += 1) {
    h ^= label.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** A named independent stream -> item 12 always gets the same draws. */
export function stream(label) {
  return mulberry32(seedFrom(label));
}

export function pick(rng, values) {
  return values[Math.floor(rng() * values.length)];
}

export function intBetween(rng, low, high) {
  return low + Math.floor(rng() * (high - low + 1));
}
