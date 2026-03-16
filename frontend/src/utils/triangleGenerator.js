// Triangle generation utilities for Game 1: Team-Based Triangle Matching

import { seededRandom } from './random'

/**
 * Generate triangles for matching game
 * @param {number} seed - Random seed for deterministic generation
 * @param {number} count - Number of candidate triangles to generate
 * @param {Object} config - Configuration options
 * @returns {Array} Array of triangles with one exact match
 */
export function generateTriangleSet(seed, count = 8, config = {}) {
  const {
    baseSize = 100,
    angleVariance = 2, // degrees
    sideVariance = 0.02, // 2% variance
    rotationRange = 360
  } = config

  const rng = seededRandom(seed)
  
  // Generate target triangle (SSS - Side-Side-Side)
  const targetSides = [
    baseSize,
    baseSize * (0.8 + rng() * 0.4), // 80-120% of base
    baseSize * (0.8 + rng() * 0.4)
  ]
  
  // Calculate target angles using law of cosines
  const targetAngles = calculateAngles(targetSides)
  
  const triangles = []
  
  // Generate exact match (will be rotated randomly)
  const exactMatch = createTriangle(targetSides, targetAngles, rng() * rotationRange)
  exactMatch.isMatch = true
  triangles.push(exactMatch)
  
  // Generate similar but incorrect triangles
  for (let i = 1; i < count; i++) {
    const variant = generateVariant(targetSides, targetAngles, angleVariance, sideVariance, rng)
    variant.isMatch = false
    variant.rotation = rng() * rotationRange
    triangles.push(variant)
  }
  
  // Shuffle triangles
  for (let i = triangles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [triangles[i], triangles[j]] = [triangles[j], triangles[i]]
  }
  
  return {
    target: triangles.find(t => t.isMatch),
    candidates: triangles,
    seed,
    targetSides,
    targetAngles
  }
}

function generateVariant(targetSides, targetAngles, angleVariance, sideVariance, rng) {
  // Create a variant that's close but not exact
  const variantSides = targetSides.map(side => {
    const variance = side * sideVariance * (0.5 + rng()) // 0.5x to 1.5x of variance
    const sign = rng() < 0.5 ? -1 : 1
    return side + sign * variance
  })
  
  const variantAngles = targetAngles.map(angle => {
    const variance = angleVariance * (0.5 + rng())
    const sign = rng() < 0.5 ? -1 : 1
    return angle + sign * variance
  })
  
  return createTriangle(variantSides, variantAngles, 0)
}

function createTriangle(sides, angles, rotation) {
  // Create triangle vertices from sides and angles
  const [a, b, c] = sides
  const [angleA, angleB, angleC] = angles
  
  // Start with point A at origin
  const A = { x: 0, y: 0 }
  // Point B is along x-axis at distance a (side between A and B)
  const B = { x: a, y: 0 }
  
  // Calculate point C using law of cosines
  // Side c is opposite angle C, side b is opposite angle B
  // We know angle A, so we can place C relative to A
  const angleARad = (angleA * Math.PI) / 180
  const angleBRad = (angleB * Math.PI) / 180
  
  // Use law of cosines to find coordinates of C
  // C is at distance b from A, at angle angleA from the x-axis
  // But we need to account for the fact that side c connects B to C
  // So we use the angle at A and side b to place C
  const C = {
    x: b * Math.cos(angleARad),
    y: b * Math.sin(angleARad)
  }
  
  // Verify triangle is valid (sum of angles should be ~180)
  const angleSum = angleA + angleB + angleC
  if (Math.abs(angleSum - 180) > 1) {
    // Adjust if needed
    console.warn('Triangle angles don\'t sum to 180:', angleSum)
  }
  
  // Rotate triangle around its center
  const centerX = (A.x + B.x + C.x) / 3
  const centerY = (A.y + B.y + C.y) / 3
  const rotationRad = (rotation * Math.PI) / 180
  
  const rotatePoint = (p) => {
    const dx = p.x - centerX
    const dy = p.y - centerY
    return {
      x: centerX + dx * Math.cos(rotationRad) - dy * Math.sin(rotationRad),
      y: centerY + dx * Math.sin(rotationRad) + dy * Math.cos(rotationRad)
    }
  }
  
  return {
    vertices: [rotatePoint(A), rotatePoint(B), rotatePoint(C)],
    sides: [...sides],
    angles: [...angles],
    rotation,
    isMatch: false
  }
}

function calculateAngles(sides) {
  const [a, b, c] = sides
  // Law of cosines: cos(A) = (b² + c² - a²) / (2bc)
  const angleA = Math.acos(Math.max(-1, Math.min(1, (b * b + c * c - a * a) / (2 * b * c))))
  const angleB = Math.acos(Math.max(-1, Math.min(1, (a * a + c * c - b * b) / (2 * a * c))))
  const angleC = Math.acos(Math.max(-1, Math.min(1, (a * a + b * b - c * c) / (2 * a * b))))
  
  return [
    (angleA * 180) / Math.PI,
    (angleB * 180) / Math.PI,
    (angleC * 180) / Math.PI
  ]
}

export function measureTriangle(triangle) {
  const [A, B, C] = triangle.vertices
  const sides = [
    distance(A, B),
    distance(B, C),
    distance(C, A)
  ]
  const angles = [
    angleAt(B, A, C),
    angleAt(A, B, C),
    angleAt(A, C, B)
  ]
  return { sides, angles }
}

function distance(p1, p2) {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

function angleAt(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y }
  const v2 = { x: c.x - b.x, y: c.y - b.y }
  const dot = v1.x * v2.x + v1.y * v2.y
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)
  if (mag1 === 0 || mag2 === 0) return 0
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)))
  return (Math.acos(cos) * 180) / Math.PI
}
