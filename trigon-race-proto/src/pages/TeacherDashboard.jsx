import React, { useState, useEffect } from 'react'
import { generateJoinCode } from '../utils/session'
import { sessionsStorage, researchStorage, showError, showSuccess } from '../utils/storage'

export default function TeacherDashboard() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSession, setNewSession] = useState({
    game_type: 'team_triangle',
    duration_minutes: 30,
    difficulty: 'medium',
    num_triangles: 8,
    num_questions: 10,
    max_level: 5
  })

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const data = await sessionsStorage.getAll()
      setSessions(data)
    } catch (err) {
      showError('Fehler beim Laden der Sitzungen: ' + err.message)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSession = async () => {
    try {
      const joinCode = generateJoinCode()
      const config = {
        duration_minutes: newSession.duration_minutes,
        difficulty: newSession.difficulty,
        num_triangles: newSession.num_triangles,
        num_questions: newSession.num_questions,
        max_level: newSession.max_level
      }

      const data = await sessionsStorage.create({
        teacher_id: null,
        join_code: joinCode,
        game_type: newSession.game_type,
        config: config,
        status: 'waiting'
      })

      setShowCreateModal(false)
      setNewSession({
        game_type: 'team_triangle',
        duration_minutes: 30,
        difficulty: 'medium',
        num_triangles: 8,
        num_questions: 10,
        max_level: 5
      })
      loadSessions()
    } catch (err) {
      showError('Fehler beim Erstellen der Sitzung: ' + err.message)
    }
  }

  const handleStartSession = async (sessionId) => {
    try {
      await sessionsStorage.update(sessionId, {
        status: 'active',
        started_at: new Date().toISOString()
      })
      showSuccess('Sitzung gestartet!')
      loadSessions()
    } catch (err) {
      showError('Fehler beim Starten der Sitzung: ' + err.message)
    }
  }

  const handleEndSession = async (sessionId) => {
    try {
      await sessionsStorage.update(sessionId, {
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      showSuccess('Sitzung beendet!')
      loadSessions()
    } catch (err) {
      showError('Fehler beim Beenden der Sitzung: ' + err.message)
    }
  }

  const handleTestStudentView = async (gameType = 'team_triangle') => {
    try {
      const joinCode = generateJoinCode()
      const config = {
        duration_minutes: 30,
        difficulty: 'medium',
        num_triangles: 8,
        num_questions: 10,
        max_level: 5
      }

      const data = await sessionsStorage.create({
        teacher_id: null,
        join_code: joinCode,
        game_type: gameType,
        config: config,
        status: 'active'
      })

      // Open student join page with code pre-filled
      const joinUrl = `/student/join?code=${joinCode}`
      window.open(joinUrl, '_blank')
      
      loadSessions()
    } catch (err) {
      showError('Fehler beim Erstellen der Test-Sitzung: ' + err.message)
    }
  }

  const handleTestExistingSession = (session) => {
    // Open student join page with existing session code
    const joinUrl = `/student/join?code=${session.join_code}`
    window.open(joinUrl, '_blank')
  }

  const handleExportData = async (sessionId) => {
    try {
      const exportData = await researchStorage.exportData(sessionId)
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `session_${sessionId}_${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      showSuccess('Daten erfolgreich exportiert!')
    } catch (err) {
      showError('Fehler beim Exportieren der Daten: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="flex-center" style={{ minHeight: '50vh' }}>
          <div className="loading" style={{ width: '2rem', height: '2rem' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <div className="header-content">
          <h1>Lehrer-Dashboard</h1>
        </div>
      </div>

      <div className="flex-between mb-3">
        <h2>Sitzungen</h2>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => handleTestStudentView('team_triangle')} title="Schnelltest: Erstellt und öffnet das Dreieck-Zuordnungsspiel">
            🧪 Dreieck-Spiel testen
          </button>
          <button className="btn btn-secondary" onClick={() => handleTestStudentView('individual_qr')} title="Schnelltest: Erstellt und öffnet das QR-Code-Spiel">
            🧪 QR-Spiel testen
          </button>
          <button className="btn" onClick={() => setShowCreateModal(true)}>
            Neue Sitzung erstellen
          </button>
        </div>
      </div>

      {showCreateModal && (
        <div className="panel">
          <h3>Neue Sitzung erstellen</h3>
          <div className="form-group">
            <label className="form-label">Spieltyp</label>
            <select
              className="form-select"
              value={newSession.game_type}
              onChange={(e) => setNewSession({ ...newSession, game_type: e.target.value })}
            >
              <option value="team_triangle">Team-basierte Dreieck-Zuordnung</option>
              <option value="individual_qr">Individuelles QR-Code-Spiel</option>
            </select>
          </div>

          {newSession.game_type === 'team_triangle' && (
            <>
              <div className="form-group">
                <label className="form-label">Dauer (Minuten)</label>
                <input
                  type="number"
                  className="form-input"
                  value={newSession.duration_minutes}
                  onChange={(e) => setNewSession({ ...newSession, duration_minutes: parseInt(e.target.value) })}
                  min="5"
                  max="120"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Anzahl der Dreiecke</label>
                <input
                  type="number"
                  className="form-input"
                  value={newSession.num_triangles}
                  onChange={(e) => setNewSession({ ...newSession, num_triangles: parseInt(e.target.value) })}
                  min="6"
                  max="12"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Schwierigkeit</label>
                <select
                  className="form-select"
                  value={newSession.difficulty}
                  onChange={(e) => setNewSession({ ...newSession, difficulty: e.target.value })}
                >
                  <option value="easy">Einfach</option>
                  <option value="medium">Mittel</option>
                  <option value="hard">Schwer</option>
                </select>
              </div>
            </>
          )}

          {newSession.game_type === 'individual_qr' && (
            <>
              <div className="form-group">
                <label className="form-label">Dauer (Minuten)</label>
                <input
                  type="number"
                  className="form-input"
                  value={newSession.duration_minutes}
                  onChange={(e) => setNewSession({ ...newSession, duration_minutes: parseInt(e.target.value) })}
                  min="5"
                  max="120"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Anzahl der Fragen pro Stufe</label>
                <input
                  type="number"
                  className="form-input"
                  value={newSession.num_questions}
                  onChange={(e) => setNewSession({ ...newSession, num_questions: parseInt(e.target.value) })}
                  min="5"
                  max="20"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Maximale Stufe</label>
                <input
                  type="number"
                  className="form-input"
                  value={newSession.max_level}
                  onChange={(e) => setNewSession({ ...newSession, max_level: parseInt(e.target.value) })}
                  min="1"
                  max="10"
                />
              </div>
            </>
          )}

          <div className="flex gap-2">
            <button className="btn" onClick={handleCreateSession}>
              Sitzung erstellen
            </button>
            <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-2">
        {sessions.map(session => (
          <div key={session.id} className="panel">
            <div className="flex-between mb-2">
              <h3>{session.game_type === 'team_triangle' ? 'Dreieck-Zuordnung' : 'QR-Code-Spiel'}</h3>
              <span className={`badge ${session.status === 'active' ? 'badge-success' : session.status === 'ended' ? 'badge-error' : ''}`}>
                {session.status === 'waiting' ? 'Wartend' : session.status === 'active' ? 'Aktiv' : 'Beendet'}
              </span>
            </div>
            <p className="text-muted mb-2">
              Beitrittscode: <strong>{session.join_code}</strong>
            </p>
            <p className="text-muted mb-2">
              Erstellt: {new Date(session.created_at).toLocaleString('de-DE')}
            </p>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {session.status === 'waiting' && (
                <button className="btn btn-sm" onClick={() => handleStartSession(session.id)}>
                  Sitzung starten
                </button>
              )}
              {session.status === 'active' && (
                <>
                  <button className="btn btn-error btn-sm" onClick={() => handleEndSession(session.id)}>
                    Sitzung beenden
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleTestExistingSession(session)}>
                    Schüleransicht testen
                  </button>
                </>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => handleTestExistingSession(session)}>
                Beitritt testen
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleExportData(session.id)}>
                Daten exportieren
              </button>
            </div>
          </div>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="panel text-center">
          <p className="text-muted">Noch keine Sitzungen. Erstellen Sie Ihre erste Sitzung, um zu beginnen.</p>
        </div>
      )}
    </div>
  )
}
