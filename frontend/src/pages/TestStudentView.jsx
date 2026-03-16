import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sessionsStorage } from '../utils/storage'

/**
 * Quick test page for testing student experience
 * Creates a test session and redirects to student join
 */
export default function TestStudentView() {
  const navigate = useNavigate()
  const [gameType, setGameType] = useState('team_triangle')
  const [loading, setLoading] = useState(false)

  const handleCreateTestSession = async () => {
    setLoading(true)
    const config = {
      duration_minutes: 30,
      difficulty: 'medium',
      num_triangles: 8,
      num_questions: 10,
      max_level: 5
    }

    try {
      const session = await sessionsStorage.create({
        game_type: gameType,
        config: config
      })
      await sessionsStorage.start(session.id)

      // Redirect to student join with code
      navigate(`/student/join?code=${session.joinCode || session.join_code}&auto=true`)
    } catch (err) {
      alert('Fehler: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container container-sm">
      <div className="header">
        <div className="header-content">
          <h1>Schüleransicht testen</h1>
        </div>
      </div>

      <div className="panel">
        <h2>Schnelltest</h2>
        <p className="text-muted">
          Erstelle eine Test-Sitzung und erlebe die Schüleransicht. Dies erstellt eine aktive Sitzung
          und tritt dir automatisch als Schüler bei.
        </p>

        <div className="form-group">
          <label className="form-label">Spieltyp</label>
          <select
            className="form-select"
            value={gameType}
            onChange={(e) => setGameType(e.target.value)}
          >
            <option value="team_triangle">Team-basierte Dreieck-Zuordnung</option>
            <option value="individual_qr">Individuelles QR-Code-Spiel</option>
          </select>
        </div>

        <button
          className="btn"
          onClick={handleCreateTestSession}
          disabled={loading}
        >
          {loading ? 'Erstelle...' : 'Test-Sitzung starten'}
        </button>

        <div className="mt-3">
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            <strong>Tipp:</strong> Du kannst auch bestehende Sitzungen vom Lehrer-Dashboard testen,
            indem du auf "Schüleransicht testen" bei einer aktiven Sitzung klickst.
          </p>
        </div>
      </div>
    </div>
  )
}
