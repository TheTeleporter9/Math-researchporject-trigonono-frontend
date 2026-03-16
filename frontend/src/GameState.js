export const initialGameState = {
  currentLevelIndex: 0,
  levels: [
    { type: 'SSS', targets: [5, 7, 9], label: 'Sides 5, 7, 9' },
    { type: 'SAS', targets: [6, 45, 8], label: 'Side 6, Angle 45°, Side 8' },
    { type: 'ASA', targets: [50, 7, 60], label: 'Angle 50°, Side 7, Angle 60°' },
    // Demo/Audit level for frontend-only validation checks
    { type: 'AUDIT', label: 'Audit: SAS static check', targets: { sideA: 6, angleB: 45, sideB: 8 }, auditCorrect: 0 }
  ],
  fakePlayers: ['Team Alpha', 'Team Beta'],
  // progress maps player name -> completed level index (0 means at start)
  progress: {},
  pin: '1234',
  hosting: false
}

export function distance(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

export function angleAt(a, b, c) {
  // angle at point b between ba and bc
  const v1 = { x: a.x - b.x, y: a.y - b.y }
  const v2 = { x: c.x - b.x, y: c.y - b.y }
  const dot = v1.x * v2.x + v1.y * v2.y
  const mag1 = Math.hypot(v1.x, v1.y)
  const mag2 = Math.hypot(v2.x, v2.y)
  if (mag1 === 0 || mag2 === 0) return 0
  const cos = Math.min(1, Math.max(-1, dot / (mag1 * mag2)))
  return (Math.acos(cos) * 180) / Math.PI
}

export function approxEqual(a, b, pct = 0.01) {
  if (b === 0) return Math.abs(a) < 1e-6
  return Math.abs(a - b) / Math.abs(b) <= pct
}

export function validateSSS(sides, targets, pct = 0.01) {
  // sides: [s1, s2, s3] unordered; targets: [t1,t2,t3]
  const sortedS = [...sides].sort((x, y) => x - y)
  const sortedT = [...targets].sort((x, y) => x - y)
  return (
    approxEqual(sortedS[0], sortedT[0], pct) &&
    approxEqual(sortedS[1], sortedT[1], pct) &&
    approxEqual(sortedS[2], sortedT[2], pct)
  )
}

export function validateSAS(sides, angleDeg, targets, pct = 0.01) {
  // Expect targets: [side1, angleDeg, side2] where angle is between side1 and side2
  const [tA, tAng, tB] = targets
  return (
    approxEqual(sides[0], tA, pct) &&
    approxEqual(angleDeg, tAng, pct) &&
    approxEqual(sides[1], tB, pct)
  )
}
