function seededRandom(seed) {
  let state = Math.floor(seed) % 2147483647
  if (state <= 0) state += 2147483646
  return function rng() {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

function calculateAngles(sides) {
  const [a, b, c] = sides
  const angleA = Math.acos(Math.max(-1, Math.min(1, (b * b + c * c - a * a) / (2 * b * c))))
  const angleB = Math.acos(Math.max(-1, Math.min(1, (a * a + c * c - b * b) / (2 * a * c))))
  const angleC = Math.acos(Math.max(-1, Math.min(1, (a * a + b * b - c * c) / (2 * a * b))))
  return [(angleA * 180) / Math.PI, (angleB * 180) / Math.PI, (angleC * 180) / Math.PI]
}

function createTriangle(sides, angles, rotation) {
  const [a, b] = sides
  const [angleA, angleB, angleC] = angles

  const A = { x: 0, y: 0 }
  const B = { x: a, y: 0 }

  const angleARad = (angleA * Math.PI) / 180
  const C = {
    x: b * Math.cos(angleARad),
    y: b * Math.sin(angleARad)
  }

  const angleSum = angleA + angleB + angleC
  if (Math.abs(angleSum - 180) > 1) {
    // Keep going; generation might have tiny float drift
  }

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

function generateVariant(targetSides, targetAngles, angleVariance, sideVariance, rng) {
  const variantSides = targetSides.map(side => {
    const variance = side * sideVariance * (0.5 + rng())
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

function generateTriangleSet(seed, count = 8, config = {}) {
  const { baseSize = 100, angleVariance = 2, sideVariance = 0.02, rotationRange = 360 } = config
  const rng = seededRandom(seed)

  const targetSides = [
    baseSize,
    baseSize * (0.8 + rng() * 0.4),
    baseSize * (0.8 + rng() * 0.4)
  ]
  const targetAngles = calculateAngles(targetSides)

  const triangles = []
  const exactMatch = createTriangle(targetSides, targetAngles, rng() * rotationRange)
  exactMatch.isMatch = true
  triangles.push(exactMatch)

  for (let i = 1; i < count; i++) {
    const variant = generateVariant(targetSides, targetAngles, angleVariance, sideVariance, rng)
    variant.isMatch = false
    variant.rotation = rng() * rotationRange
    triangles.push(variant)
  }

  for (let i = triangles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[triangles[i], triangles[j]] = [triangles[j], triangles[i]]
  }

  return {
    target: triangles.find(t => t.isMatch),
    candidates: triangles,
    seed,
    targetSides,
    targetAngles
  }
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

function measureTriangle(triangle) {
  const [A, B, C] = triangle.vertices
  const sides = [distance(A, B), distance(B, C), distance(C, A)]
  const angles = [angleAt(B, A, C), angleAt(A, B, C), angleAt(A, C, B)]
  return { sides, angles }
}

const seed = Number.parseInt(process.argv[2] ?? '12345', 10)
const count = Number.parseInt(process.argv[3] ?? '8', 10)
const difficulty = (process.argv[4] ?? 'medium').toLowerCase()

const config = {
  baseSize: 100,
  angleVariance: (difficulty === 'easy' ? 3 : difficulty === 'hard' ? 1 : 2),
  sideVariance: (difficulty === 'easy' ? 0.03 : difficulty === 'hard' ? 0.01 : 0.02),
  rotationRange: 360
}

const set = generateTriangleSet(seed, count, config)
const correctIndex = set.candidates.findIndex(t => t.isMatch)
const measured = measureTriangle(set.target)

console.log('Game 1 debug')
console.log(`seed=${seed} difficulty=${difficulty} count=${count}`)
console.log(`correctIndex=${correctIndex} (1-based: ${correctIndex + 1})`)
console.log('targetSides:', set.targetSides.map(s => Number(s.toFixed(2))))
console.log('targetAngles:', set.targetAngles.map(a => Number(a.toFixed(2))))
console.log('targetMeasured:', {
  sides: measured.sides.map(s => Number(s.toFixed(2))),
  angles: measured.angles.map(a => Number(a.toFixed(2)))
})

