import React, { useState, useEffect, useRef } from 'react'
import { Stage, Layer, Circle, Line, Text } from 'react-konva'
import confetti from 'canvas-confetti'
import { distance, angleAt, validateSSS, validateSAS, approxEqual } from '../GameState'

export default function StudentView({ state, setState }) {
  const level = state.levels[state.currentLevelIndex]
  const [levelInput, setLevelInput] = useState(state.currentLevelIndex + 1)
  const [points, setPoints] = useState([
    { x: 100, y: 100 },
    { x: 240, y: 120 },
    { x: 180, y: 240 }
  ])
  const [flash, setFlash] = useState(null)
  const [previousAttempt, setPreviousAttempt] = useState(null)
  const stageRef = useRef()
  const dragOsc = useRef(null)
  const audioCtx = useRef(null)

  useEffect(() => {
    // reset points when level changes
    setPreviousAttempt(null)
    setPoints([
      { x: 120, y: 120 },
      { x: 260, y: 120 },
      { x: 190, y: 260 }
    ])
  }, [state.currentLevelIndex])

  function updatePoint(i, pos) {
    const next = points.slice()
    next[i] = pos
    setPoints(next)
  }

  function startDragHum() {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)()
      const ctx = audioCtx.current
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = 120
      g.gain.value = 0.0001
      o.connect(g)
      g.connect(ctx.destination)
      o.start()
      g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.02)
      dragOsc.current = { o, g, ctx }
    } catch (e) {
      dragOsc.current = null
    }
  }

  function stopDragHum() {
    try {
      if (dragOsc.current) {
        const { o, g, ctx } = dragOsc.current
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05)
        setTimeout(() => o.stop(), 80)
      }
    } catch (e) {}
    dragOsc.current = null
  }

  function computeMeasurements(pts = points) {
    const A = pts[0]
    const B = pts[1]
    const C = pts[2]
    const sAB = distance(A, B)
    const sBC = distance(B, C)
    const sCA = distance(C, A)
    const angA = angleAt(B, A, C)
    const angB = angleAt(A, B, C)
    const angC = angleAt(A, C, B)
    return {
      sides: [sAB, sBC, sCA],
      angles: [angA, angB, angC]
    }
  }

  function sideMatches(sides, targets, pct = 0.01) {
    // return boolean array for each side matching any target (greedy match)
    const used = new Array(targets.length).fill(false)
    const matches = [false, false, false]
    for (let i = 0; i < sides.length; i++) {
      let best = -1
      for (let j = 0; j < targets.length; j++) {
        if (used[j]) continue
        if (approxEqual(sides[i], targets[j], pct)) {
          best = j
          break
        }
      }
      if (best >= 0) {
        matches[i] = true
        used[best] = true
      }
    }
    return matches
  }

  function onSubmit() {
    const { sides, angles } = computeMeasurements()
    const pct = 0.01
    let ok = false
    // record previous attempt for ghost guide
    setPreviousAttempt(points.map((p) => ({ ...p })))

      // use level-specific tolerance if provided, otherwise default to 2%
      const tol = (level.pct || 0.02)
      if (level.type === 'SSS') {
        ok = validateSSS(sides, level.targets, tol)
      } else if (level.type === 'SAS') {
      const sAB = sides[0]
      const sBC = sides[1]
      const angB = angles[1]
        ok = validateSAS([sAB, sBC], angB, level.targets, tol)
    } else if (level.type === 'ASA') {
      const angA = angles[0]
      const side = sides[2]
      const angC = angles[2]
      ok = (
        Math.abs(angA - level.targets[0]) / level.targets[0] <= pct &&
        Math.abs(side - level.targets[1]) / level.targets[1] <= pct &&
        Math.abs(angC - level.targets[2]) / level.targets[2] <= pct
      )
    } else if (level.type === 'AUDIT') {
      // simple audit acceptance: check close to targets
      const t = level.targets
      ok = Math.abs(sides[0] - t.sideA) < 0.6 && Math.abs(angles[1] - t.angleB) < 2 && Math.abs(sides[1] - t.sideB) < 0.6
    }

    if (ok) {
      setFlash('green')
      confetti({ spread: 80, particleCount: 120, colors: ['#00ffd5', '#00ffb3', '#00d4ff'] })
      playTone(880, 0.2)
      setTimeout(() => setFlash(null), 700)
        const at = state.currentLevelIndex
        if (at < state.levels.length - 1) {
          const nextIndex = at + 1
          const next = { ...state, currentLevelIndex: nextIndex }
          next.progress = { ...state.progress, ['Team You']: nextIndex }
          setState(next)
        } else {
          // already at final level, keep as completed
          const next = { ...state }
          next.progress = { ...state.progress, ['Team You']: state.levels.length - 1 }
          setState(next)
        }
    } else {
      // glitch and reset to level 1
      setFlash('red')
      playTone(100, 0.28)
      // neon explosion to accentuate failure
      confetti({ spread: 120, particleCount: 60, colors: ['#ff3d3d', '#ff7b7b'] })
      setTimeout(() => setFlash(null), 900)
      setTimeout(() => {
        const next = { ...state, currentLevelIndex: 0 }
        next.progress = { ...state.progress, ['Team You']: 0 }
        setState(next)
      }, 900)
    }
  }

  function nextLevelManual() {
    const nextIndex = Math.min(state.currentLevelIndex + 1, state.levels.length - 1)
    const next = { ...state, currentLevelIndex: nextIndex }
    next.progress = { ...state.progress, ['Team You']: nextIndex }
    setState(next)
    setLevelInput(nextIndex + 1)
  }

  function prevLevelManual() {
    const prevIndex = Math.max(state.currentLevelIndex - 1, 0)
    const next = { ...state, currentLevelIndex: prevIndex }
    next.progress = { ...state.progress, ['Team You']: prevIndex }
    setState(next)
    setLevelInput(prevIndex + 1)
  }

  function goToLevelManual() {
    let idx = parseInt(levelInput, 10) - 1
    if (Number.isNaN(idx)) idx = state.currentLevelIndex
    idx = Math.max(0, Math.min(idx, state.levels.length - 1))
    const next = { ...state, currentLevelIndex: idx }
    next.progress = { ...state.progress, ['Team You']: idx }
    setState(next)
    setLevelInput(idx + 1)
  }

  useEffect(() => {
    setLevelInput(state.currentLevelIndex + 1)
  }, [state.currentLevelIndex])

  function playTone(freq, dur) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const o = ctx.createOscillator()
      o.frequency.value = freq
      o.type = 'sine'
      const g = ctx.createGain()
      o.connect(g)
      g.connect(ctx.destination)
      o.start()
      g.gain.setValueAtTime(0.001, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
      setTimeout(() => { o.stop() }, dur * 1000 + 50)
    } catch (e) {
      // ignore
    }
  }

  const meas = computeMeasurements()
  // side correctness flags for display
  const sideFlags = level.type === 'SSS' ? sideMatches(meas.sides, level.targets || [], 0.01) : [false, false, false]

  // compute a gentle reference triangle from targets (scaled to current canvas)
  function computeReference() {
    const avgCurrent = (meas.sides[0] + meas.sides[1] + meas.sides[2]) / 3
    let avgTarget = 1
    if (level.type === 'SSS') avgTarget = (level.targets[0] + level.targets[1] + level.targets[2]) / 3
    else if (level.type === 'SAS') avgTarget = (level.targets[0] + level.targets[2]) / 2
    else if (level.type === 'AUDIT') avgTarget = (level.targets.sideA + level.targets.sideB) / 2
    const scale = avgTarget > 0 ? avgCurrent / avgTarget : 18
    const cx = 280
    const cy = 200
    if (level.type === 'SSS') {
      const [a, b, c] = level.targets.map((t) => t * scale)
      const A = { x: cx - a / 2, y: cy }
      const B = { x: A.x + a, y: A.y }
      const x = (a * a + c * c - b * b) / (2 * a)
      const y = Math.sqrt(Math.max(0, c * c - x * x))
      const C = { x: A.x + x, y: A.y - y }
      return [A, B, C]
    }
    if (level.type === 'SAS') {
      const [sideA, angDeg, sideB] = level.targets
      const sA = sideA * scale
      const sB = sideB * scale
      const theta = (angDeg * Math.PI) / 180
      const B = { x: cx, y: cy }
      const A = { x: B.x - sA, y: B.y }
      const C = { x: B.x + Math.cos(theta) * sB, y: B.y + Math.sin(theta) * sB }
      return [A, B, C]
    }
    if (level.type === 'AUDIT') {
      const t = level.targets
      const sA = t.sideA * scale
      const sB = t.sideB * scale
      const theta = (t.angleB * Math.PI) / 180
      const B = { x: cx, y: cy }
      const A = { x: B.x - sA, y: B.y }
      const C = { x: B.x + Math.cos(theta) * sB, y: B.y + Math.sin(theta) * sB }
      return [A, B, C]
    }
    // ASA fallback: center triangle
    return [
      { x: cx - 60, y: cy - 20 },
      { x: cx + 60, y: cy - 20 },
      { x: cx, y: cy + 90 }
    ]
  }

  const reference = computeReference()

  // Smoothly animate points to a target configuration (suave autosolve)
  function autosolveSuave() {
    const ref = reference
    const duration = 700
    const start = performance.now()
    const from = points.map((p) => ({ ...p }))
    function step(ts) {
      const t = Math.min(1, (ts - start) / duration)
      const ease = t * (2 - t)
      const next = from.map((p, i) => ({ x: p.x + (ref[i].x - p.x) * ease, y: p.y + (ref[i].y - p.y) * ease }))
      setPoints(next)
      if (t < 1) requestAnimationFrame(step)
      else {
        // finalize and optionally mark progress
        setPreviousAttempt(from)
      }
    }
    requestAnimationFrame(step)
  }

  return (
    <div className="panel student">
      <h2>Werkstatt - Studententeam</h2>
      <div className="challenge">
        <strong>Ziel:</strong> {level.label} ({level.type})
      </div>

      <div className={`canvas-wrap ${flash === 'green' ? 'flash-green' : ''} ${flash === 'red' ? 'flash-red' : ''}`}>
        <Stage width={560} height={420} ref={stageRef} className="stage">
          <Layer>
            {/* reference guide */}
            {reference && (
              <Line
                points={[reference[0].x, reference[0].y, reference[1].x, reference[1].y, reference[2].x, reference[2].y, reference[0].x, reference[0].y]}
                stroke="#00ffb3"
                strokeWidth={2}
                closed
                dash={[6, 6]}
                opacity={0.14}
              />
            )}

            {/* main triangle */}
            <Line
              points={[points[0].x, points[0].y, points[1].x, points[1].y, points[2].x, points[2].y, points[0].x, points[0].y]}
              stroke="#00d4ff"
              strokeWidth={4}
              closed
              shadowColor="#00ffd5"
              shadowBlur={18}
            />

            {/* draggable glowing vertex handles (drawn before labels so labels appear on top) */}
            {[0, 1, 2].map((i) => (
              <Circle
                key={i}
                x={points[i].x}
                y={points[i].y}
                radius={12}
                fill="#001822"
                stroke="#00ffd5"
                strokeWidth={3}
                shadowColor="#00ffd5"
                shadowBlur={16}
                draggable
                onDragStart={() => startDragHum()}
                onDragEnd={(e) => { stopDragHum(); updatePoint(i, { x: e.target.x(), y: e.target.y() }) }}
                onDragMove={(e) => updatePoint(i, { x: e.target.x(), y: e.target.y() })}
              />
            ))}

            {/* side length labels (mode-aware) placed after circles so they are on top */}
            <Text
              x={Math.min(points[0].x, points[1].x)}
              y={(points[0].y + points[1].y) / 2 - 28}
              text={`${meas.sides[0].toFixed(1)}`}
              fontSize={14}
              fill={sideFlags[0] ? '#7fff9e' : '#a6e7ff'}
            />
            {level.type !== 'SAS' && (
              <Text
                x={Math.min(points[1].x, points[2].x)}
                y={(points[1].y + points[2].y) / 2 - 28}
                text={`${meas.sides[1].toFixed(1)}`}
                fontSize={14}
                fill={sideFlags[1] ? '#7fff9e' : '#a6e7ff'}
              />
            )}
            {level.type !== 'SAS' && (
              <Text
                x={Math.min(points[2].x, points[0].x)}
                y={(points[2].y + points[0].y) / 2 + 8}
                text={`${meas.sides[2].toFixed(1)}`}
                fontSize={14}
                fill={sideFlags[2] ? '#7fff9e' : '#a6e7ff'}
              />
            )}

            {/* angle labels (hidden in SSS mode) */}
            {level.type !== 'SSS' && (
              <>
                <Text x={points[0].x + 8} y={points[0].y - 24} text={`${meas.angles[0].toFixed(0)}°`} fontSize={13} fill="#9fefff" />
                <Text x={points[1].x + 8} y={points[1].y - 24} text={`${meas.angles[1].toFixed(0)}°`} fontSize={13} fill="#9fefff" />
                <Text x={points[2].x + 8} y={points[2].y - 24} text={`${meas.angles[2].toFixed(0)}°`} fontSize={13} fill="#9fefff" />
              </>
            )}
          </Layer>
        </Stage>
      </div>

      <div className="measurements" style={{ marginTop: 10 }}>
        <div className="measurement-badge">Seiten: {meas.sides.map((s) => s.toFixed(2)).join(' , ')}</div>
        {level.type !== 'SSS' && <div className="measurement-badge" style={{ marginLeft: 8 }}>Winkel: {meas.angles.map((a) => a.toFixed(1)).join('° , ')}°</div>}
      </div>

      <div className="submit-area" style={{ marginTop: 10 }}>
        <button className="btn" onClick={onSubmit}>KONSTRUKTION ABSENDEN</button>
        <button className="btn secondary" onClick={autosolveSuave} style={{ marginLeft: 10 }}>Autosolve Suave</button>
      </div>

      <div className="level-controls" style={{ marginTop: 12 }}>
        <strong>Stufe:</strong> {state.currentLevelIndex + 1} / {state.levels.length}
        <div style={{ marginTop: 8 }}>
          <button className="btn secondary" onClick={prevLevelManual} style={{ marginRight: 8 }}>Vorherige Stufe</button>
          <input
            type="number"
            min={1}
            max={state.levels.length}
            value={levelInput}
            onChange={(e) => setLevelInput(e.target.value)}
            style={{ width: 64, marginRight: 8 }}
          />
          <button className="btn secondary" onClick={goToLevelManual}>Gehe</button>
        </div>
      </div>
    </div>
  )
}
