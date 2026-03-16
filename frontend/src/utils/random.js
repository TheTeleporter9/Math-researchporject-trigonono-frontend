// Seeded random number generator for deterministic generation

export function seededRandom(seed) {
  let value = seed
  return function() {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

export function generateSeed() {
  return Math.floor(Math.random() * 1000000)
}
