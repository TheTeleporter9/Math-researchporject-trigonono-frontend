import React, { useState } from 'react'
import { initialGameState } from './GameState'
import TeacherView from './components/TeacherView'
import StudentView from './components/StudentView'

export default function App() {
  const [state, setState] = useState(() => {
    const s = JSON.parse(JSON.stringify(initialGameState))
    s.progress = {}
    return s
  })
  const [view, setView] = useState('teacher')

  return (
    <div className="app">
      <div className="grid-overlay" />
      <header>
        <h1>Trigon Race — Frontend-Demo</h1>
        <div className="view-switch">
          <button className="btn secondary" onClick={() => setView('teacher')}>Lehrer-Ansicht</button>
          <button className="btn" onClick={() => setView('student')}>Schüler-Ansicht</button>
        </div>
      </header>
      <main>
        {view === 'teacher' ? (
          <TeacherView state={state} setState={setState} />
        ) : (
          <StudentView state={state} setState={setState} />
        )}
      </main>
      <footer>Prototype - client-side simulation only</footer>
    </div>
  )
}
