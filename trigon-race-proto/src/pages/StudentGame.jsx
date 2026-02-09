import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionsStorage, showError } from '../utils/storage'
import TriangleMatchingGame from '../components/games/TriangleMatchingGame'
import QRProgressionGame from '../components/games/QRProgressionGame'

export default function StudentGame() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [studentData, setStudentData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSession()
  }, [sessionId])

  const loadSession = async () => {
    try {
      // Try to load from localStorage first (for local sessions)
      const stored = localStorage.getItem('student_session')
      if (stored) {
        const student = JSON.parse(stored)
        if (student.sessionId === sessionId) {
          // Try to load session from storage
          const allSessions = await sessionsStorage.getAll()
          const sessionData = allSessions.find(s => s.id === sessionId)
          
          if (sessionData) {
            if (sessionData.status !== 'active') {
              throw new Error(`Session is ${sessionData.status}. Please wait for the teacher to start it.`)
            }
            setSession(sessionData)
            setStudentData(student)
            setLoading(false)
            return
          }
        }
      }

      // If not found, redirect to join
      throw new Error('Sitzung nicht gefunden. Bitte trete der Sitzung zuerst bei.')
    } catch (err) {
      setError(err.message)
      showError(err.message)
      setLoading(false)
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

  if (error) {
    return (
      <div className="container container-sm">
        <div className="panel">
          <div className="alert alert-error">
            {error}
          </div>
          <button className="btn" onClick={() => navigate('/student/join')}>
            Zur Beitrittsseite
          </button>
        </div>
      </div>
    )
  }

  if (!session || !studentData) {
    return null
  }

  return (
    <div className="container">
      {session.game_type === 'team_triangle' && (
        <TriangleMatchingGame
          session={session}
          studentData={studentData}
        />
      )}
      {session.game_type === 'individual_qr' && (
        <QRProgressionGame
          session={session}
          studentData={studentData}
        />
      )}
    </div>
  )
}
