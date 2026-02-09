import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateAnonymousId } from '../utils/session'
import { sessionsStorage, teamsStorage, studentsStorage, showError, showSuccess } from '../utils/storage'
import QRCode from 'qrcode'

export default function StudentJoin() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const autoJoinAttempted = useRef(false)

  const handleJoin = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault()
    }
    if (!joinCode) return
    
    setError('')
    setLoading(true)

    try {
      // Find session by join code
      const session = await sessionsStorage.findByCode(joinCode)

      if (!session) {
        throw new Error('Sitzung nicht gefunden. Bitte überprüfen Sie den Beitrittscode.')
      }

      if (session.status !== 'active') {
        const statusText = session.status === 'waiting' ? 'wartend' : 'beendet'
        throw new Error(`Die Sitzung ist ${statusText}. Bitte warten Sie, bis der Lehrer die Sitzung startet.`)
      }

      const anonymousId = generateAnonymousId()

      if (session.game_type === 'team_triangle') {
        // Create or join team
        const team = await teamsStorage.create({
          session_id: session.id,
          team_name: teamName || `Team ${anonymousId.substring(0, 6)}`,
          anonymous_id: anonymousId
        })

        // Store session info
        localStorage.setItem('student_session', JSON.stringify({
          sessionId: session.id,
          anonymousId,
          teamId: team.id,
          gameType: session.game_type
        }))
      } else {
        // Individual game
        const student = await studentsStorage.create({
          session_id: session.id,
          anonymous_id: anonymousId
        })

        localStorage.setItem('student_session', JSON.stringify({
          sessionId: session.id,
          anonymousId,
          gameType: session.game_type
        }))
      }

      showSuccess('Erfolgreich der Sitzung beigetreten!')
      navigate(`/student/game/${session.id}`)
    } catch (err) {
      const errorMsg = err.message || 'Fehler beim Beitreten zur Sitzung. Bitte versuchen Sie es erneut.'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleQRScan = async () => {
    // Generate QR code for join link
    const joinUrl = `${window.location.origin}/student/join?code=${joinCode}`
    try {
      const dataUrl = await QRCode.toDataURL(joinUrl)
      setQrDataUrl(dataUrl)
    } catch (err) {
      console.error('Fehler beim Generieren des QR-Codes:', err)
    }
  }

  // Check for code in URL params and auto-join if session is active
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code && !joinCode) {
      setJoinCode(code)
    }
  }, [])

  // Auto-join when code is set and auto param is present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const autoJoin = params.get('auto') === 'true'
    if (joinCode && autoJoin && !autoJoinAttempted.current) {
      autoJoinAttempted.current = true
      setTimeout(() => {
        handleJoin({ preventDefault: () => {} })
      }, 1000)
    }
  }, [joinCode])

  return (
    <div className="container container-sm">
      <div className="header">
        <div className="header-content">
          <h1>Sitzung beitreten</h1>
        </div>
      </div>

      <div className="panel">
        <h2>Beitrittscode eingeben</h2>
        <p className="text-muted">
          Ihr Lehrer wird Ihnen einen 6-stelligen Beitrittscode geben, um der Sitzung beizutreten.
        </p>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin}>
          <div className="form-group">
            <label className="form-label">Beitrittscode</label>
            <input
              type="text"
              className="form-input"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength="6"
              required
              style={{ textTransform: 'uppercase', fontSize: '1.5rem', letterSpacing: '0.5rem', textAlign: 'center' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Teamname (für Team-Spiele)</label>
            <input
              type="text"
              className="form-input"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Optional - wird automatisch generiert, wenn leer gelassen"
            />
          </div>

          <button
            type="submit"
            className="btn"
            disabled={loading}
          >
            {loading ? <span className="loading" /> : 'Sitzung beitreten'}
          </button>
        </form>

        {joinCode && (
          <div className="mt-3">
            <button className="btn btn-secondary btn-sm" onClick={handleQRScan}>
              QR-Code anzeigen
            </button>
            {qrDataUrl && (
              <div className="mt-2 text-center">
                <img src={qrDataUrl} alt="Beitritts QR-Code" style={{ maxWidth: '200px' }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
