import React, { useEffect, useRef, useState } from 'react'

export default function TeacherView({ state, setState }) {
  const { fakePlayers, pin, levels, currentLevelIndex, progress } = state
  const [levelInput, setLevelInput] = useState(currentLevelIndex + 1)

  useEffect(() => {
    setLevelInput(state.currentLevelIndex + 1)
  }, [state.currentLevelIndex])

  function addBot() {
    const name = 'Bot ' + Math.floor(Math.random() * 900 + 100)
    const next = { ...state, fakePlayers: [...fakePlayers, name] }
    next.progress = { ...state.progress, [name]: 0 }
    setState(next)
  }

  function startGame() {
    const next = { ...state, hosting: true }
    // initialize progress for players
    const prog = { ...(next.progress || {}) }
    ;[...next.fakePlayers, 'Team You'].forEach((p) => {
      if (!(p in prog)) prog[p] = 0
    })
    next.progress = prog
    setState(next)
  }

  function advanceLevel() {
    const nextIndex = Math.min(state.currentLevelIndex + 1, state.levels.length - 1)
    const next = { ...state, currentLevelIndex: nextIndex }
    const prog = { ...(next.progress || {}) }
    ;[...next.fakePlayers, 'Team You'].forEach((p) => {
      prog[p] = Math.max(prog[p] || 0, nextIndex)
    })
    next.progress = prog
    setState(next)
    setLevelInput(nextIndex + 1)
  }

  function setLevelManual() {
    let idx = parseInt(levelInput, 10) - 1
    if (Number.isNaN(idx)) idx = state.currentLevelIndex
    idx = Math.max(0, Math.min(idx, state.levels.length - 1))
    const next = { ...state, currentLevelIndex: idx }
    const prog = { ...(next.progress || {}) }
    ;[...next.fakePlayers, 'Team You'].forEach((p) => {
      prog[p] = Math.max(prog[p] || 0, idx)
    })
    next.progress = prog
    setState(next)
    setLevelInput(idx + 1)
  }

  // simple auto-advance for bots
  useEffect(() => {
    if (!state.hosting) return
    const t = setInterval(() => {
      const next = { ...state, progress: { ...state.progress } }
      state.fakePlayers.forEach((p, i) => {
        if (Math.random() < 0.25) {
          next.progress[p] = Math.min((next.progress[p] || 0) + 1, levels.length - 1)
        }
      })
      setState(next)
    }, 2500)
    return () => clearInterval(t)
  }, [state.hosting])

  const trackWidth = 600
  const players = [...state.fakePlayers, 'Team You']
  const trackHeight = Math.max(140, players.length * 40)

  return (
    <div className="panel teacher">
      <h2>Lehrer-Dashboard</h2>
      <div className="lobby">
        <button className="btn" onClick={() => setState({ ...state, hosting: true })}>Spiel hosten</button>
        <div className="qr-and-pin">
          <div className="fake-qr">QR</div>
          <div className="pin">PIN: {pin}</div>
        </div>
        <div className="join-controls">
          <button className="btn secondary" onClick={addBot}>Bot hinzufügen</button>
          <button className="btn" onClick={startGame}>Spiel starten</button>
          <div style={{ display: 'inline-block', marginLeft: 12 }}>
          <button className="btn" onClick={advanceLevel} style={{ marginRight: 8 }}>Nächste Stufe</button>
          <input
            type="number"
            min={1}
            max={levels.length}
            value={levelInput}
            onChange={(e) => setLevelInput(e.target.value)}
            style={{ width: 64, marginRight: 8 }}
          />
          <button className="btn secondary" onClick={setLevelManual}>Stufe setzen</button>
          </div>
        </div>
        <div className="players">
          <strong>Spieler:</strong>
          <ul>
            {fakePlayers.map((p) => (
              <li key={p}>{p === 'Team You' ? 'Dein Team' : p}</li>
            ))}
            <li>{'Dein Team'}</li>
          </ul>
        </div>
      </div>

      {state.hosting && (
        <div className="race-dashboard">
          <h3>Race Track</h3>
          <div className="track" style={{ width: trackWidth + 40, height: trackHeight }}>
              <div className="finish">🏁</div>
              {players.map((p, i) => {
                const prog = (state.progress && state.progress[p]) || 0
                const step = prog / Math.max(1, levels.length)
                const x = 20 + step * trackWidth
                const top = 12 + i * 36
                return (
                  <div key={p} className="runner" style={{ left: x, top }}>
                    <div className="icon">🚗</div>
                    <div className="label">{p === 'Team You' ? 'Dein Team' : p}</div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
