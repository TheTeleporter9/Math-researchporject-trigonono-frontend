import React, { useState, useEffect, useRef } from 'react'
import { Stage, Layer, Line, Circle, Text } from 'react-konva'
import { researchStorage, showSuccess, showError } from '../../utils/storage'
import { generateTriangleSet, measureTriangle } from '../../utils/triangleGenerator'
import { generateSeed } from '../../utils/random'

export default function TriangleMatchingGame({ session, studentData }) {
  const [triangleSet, setTriangleSet] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [mistakes, setMistakes] = useState(0)
  const [currentLevel, setCurrentLevel] = useState(1)
  const [timeRemaining, setTimeRemaining] = useState((session?.config?.duration_minutes || 30) * 60)
  const [gameEnded, setGameEnded] = useState(false)
  const [measurements, setMeasurements] = useState({})
  const measurementStartTime = useRef(null)

  useEffect(() => {
    // Initialize game
    if (!session || !session.config) {
      showError('Sitzungskonfiguration fehlt')
      return
    }
    
    const seed = generateSeed() + currentLevel * 1000 // Different seed per level
    const config = {
      baseSize: 100,
      angleVariance: (session.config.difficulty === 'easy' ? 3 : session.config.difficulty === 'hard' ? 1 : 2),
      sideVariance: (session.config.difficulty === 'easy' ? 0.03 : session.config.difficulty === 'hard' ? 0.01 : 0.02),
      rotationRange: 360
    }
    try {
      const set = generateTriangleSet(seed, session.config.num_triangles || 8, config)
      setTriangleSet(set)
      measurementStartTime.current = Date.now()
    } catch (err) {
      showError('Fehler beim Generieren der Dreiecke: ' + err.message)
      console.error(err)
    }
  }, [session, currentLevel])

  useEffect(() => {
    // Timer countdown
    if (gameEnded) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setGameEnded(true)
          endGame()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [gameEnded])

  const handleTriangleSelect = async (index) => {
    if (gameEnded || selectedIndex !== null) return

    setSelectedIndex(index)
    const triangle = triangleSet.candidates[index]
    const isCorrect = triangle.isMatch

    const responseTime = Date.now() - measurementStartTime.current

    // Record attempt (non-blocking)
    researchStorage.recordAttempt({
      session_id: session.id,
      team_id: studentData.teamId,
      anonymous_student_id: studentData.anonymousId,
      question_id: `level_${currentLevel}_round_${Date.now()}`,
      selected_triangle_index: index,
      is_correct: isCorrect,
      response_time_ms: responseTime,
      measurements: measurements[index] || {}
    })

    if (isCorrect) {
      // Correct! Advance to next level
      showSuccess(`Richtig! Stufe ${currentLevel} abgeschlossen!`)
      
      researchStorage.recordCompletion({
        session_id: session.id,
        anonymous_student_id: studentData.anonymousId,
        team_id: studentData.teamId,
        game_type: 'team_triangle',
        level: currentLevel,
        mistakes_count: mistakes,
        reset_count: 0
      })

      setTimeout(() => {
        setCurrentLevel(prev => prev + 1)
        setSelectedIndex(null)
        setMeasurements({})
        measurementStartTime.current = Date.now()
      }, 2000)
    } else {
      // Wrong! Reset to level 1
      showError('Falsch! Zurücksetzen auf Stufe 1.')
      setMistakes(prev => prev + 1)
      setTimeout(() => {
        setCurrentLevel(1)
        setSelectedIndex(null)
        setMeasurements({})
        measurementStartTime.current = Date.now()
      }, 2500)
    }
  }

  const endGame = async () => {
    // Record final outcome
    researchStorage.recordOutcome({
      session_id: session.id,
      anonymous_student_id: studentData.anonymousId,
      team_id: studentData.teamId,
      game_type: 'team_triangle',
      final_level: currentLevel,
      total_mistakes: mistakes,
      total_resets: mistakes
    })
    showSuccess('Spiel beendet! Endstufe: ' + currentLevel + ', Fehler: ' + mistakes)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!triangleSet) {
    return (
      <div className="flex-center" style={{ minHeight: '50vh' }}>
        <div className="loading" style={{ width: '2rem', height: '2rem' }} />
      </div>
    )
  }

  const target = triangleSet.target
  const candidates = triangleSet.candidates

  return (
    <div>
      <div className="header">
        <div className="header-content">
          <h1>Dreieck-Zuordnungsspiel</h1>
          <div className="flex gap-2">
            <span className="badge">Stufe: {currentLevel}</span>
            <span className="badge badge-error">Fehler: {mistakes}</span>
            <span className="badge">Zeit: {formatTime(timeRemaining)}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Finde das passende Dreieck</h2>
        <p className="text-muted">
          Miss das Referenzdreieck unten, dann finde die exakte Übereinstimmung unter den Kandidaten.
          Verwende die Messwerkzeuge, um Seitenlängen und Winkel zu vergleichen.
        </p>

        {gameEnded && (
          <div className="alert alert-info">
            <h3>Spiel beendet</h3>
            <p>Endstufe: {currentLevel}</p>
            <p>Gesamtfehler: {mistakes}</p>
          </div>
        )}

        {/* Reference Triangle */}
        <div className="mb-4">
          <h3>Referenzdreieck</h3>
          <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '2px solid #dee2e6' }}>
            <TriangleDisplay
              triangle={target}
              size={300}
              label="Referenz"
              onMeasure={(meas) => {
                // Store measurements for reference
              }}
            />
          </div>
        </div>

        {/* Candidate Triangles */}
        <div>
          <h3>Kandidatendreiecke</h3>
          <p className="text-muted mb-3">
            Klicke auf das Dreieck, das genau mit der Referenz übereinstimmt.
          </p>
          <div className="grid grid-3">
            {candidates.map((triangle, index) => (
              <div
                key={index}
                onClick={() => handleTriangleSelect(index)}
                style={{
                  cursor: gameEnded ? 'not-allowed' : 'pointer',
                  padding: '1rem',
                  border: selectedIndex === index
                    ? '3px solid #0066cc'
                    : '2px solid #dee2e6',
                  borderRadius: '8px',
                  background: selectedIndex === index ? '#e6f2ff' : '#ffffff',
                  opacity: gameEnded ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <TriangleDisplay
                  triangle={triangle}
                  size={200}
                  label={`Dreieck ${index + 1}`}
                  onMeasure={(meas) => {
                    setMeasurements(prev => ({
                      ...prev,
                      [index]: meas
                    }))
                  }}
                />
                {selectedIndex === index && (
                  <div className="mt-2 text-center">
                    {triangle.isMatch ? (
                      <span className="badge badge-success">Richtig!</span>
                    ) : (
                      <span className="badge badge-error">Falsch - Zurücksetzen auf Stufe 1</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TriangleDisplay({ triangle, size, label, onMeasure }) {
  const stageRef = useRef(null)
  const [measurements, setMeasurements] = useState(null)

  useEffect(() => {
    if (triangle) {
      const meas = measureTriangle(triangle)
      setMeasurements(meas)
      if (onMeasure) {
        onMeasure(meas)
      }
    }
  }, [triangle, onMeasure])

  if (!triangle || !measurements) {
    return <div>Loading...</div>
  }

  // Scale triangle to fit in display area
  const vertices = triangle.vertices
  const minX = Math.min(...vertices.map(v => v.x))
  const minY = Math.min(...vertices.map(v => v.y))
  const maxX = Math.max(...vertices.map(v => v.x))
  const maxY = Math.max(...vertices.map(v => v.y))
  const width = maxX - minX
  const height = maxY - minY
  const scale = Math.min(size / (width + 20), size / (height + 20))
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  const scaledVertices = vertices.map(v => ({
    x: (v.x - centerX) * scale + size / 2,
    y: (v.y - centerY) * scale + size / 2
  }))

  return (
    <div>
      <div className="text-center mb-2">
        <strong>{label}</strong>
      </div>
      <Stage width={size} height={size} ref={stageRef}>
        <Layer>
          <Line
            points={[
              scaledVertices[0].x, scaledVertices[0].y,
              scaledVertices[1].x, scaledVertices[1].y,
              scaledVertices[2].x, scaledVertices[2].y,
              scaledVertices[0].x, scaledVertices[0].y
            ]}
            stroke="#212529"
            strokeWidth={2}
            closed
          />
          {/* Side length labels */}
          <Text
            x={(scaledVertices[0].x + scaledVertices[1].x) / 2 - 15}
            y={(scaledVertices[0].y + scaledVertices[1].y) / 2 - 10}
            text={measurements.sides[0].toFixed(1)}
            fontSize={12}
            fill="#495057"
          />
          <Text
            x={(scaledVertices[1].x + scaledVertices[2].x) / 2 - 15}
            y={(scaledVertices[1].y + scaledVertices[2].y) / 2 - 10}
            text={measurements.sides[1].toFixed(1)}
            fontSize={12}
            fill="#495057"
          />
          <Text
            x={(scaledVertices[2].x + scaledVertices[0].x) / 2 - 15}
            y={(scaledVertices[2].y + scaledVertices[0].y) / 2 + 15}
            text={measurements.sides[2].toFixed(1)}
            fontSize={12}
            fill="#495057"
          />
          {/* Angle labels */}
          <Text
            x={scaledVertices[0].x + 5}
            y={scaledVertices[0].y - 5}
            text={`${measurements.angles[0].toFixed(0)}°`}
            fontSize={11}
            fill="#6c757d"
          />
          <Text
            x={scaledVertices[1].x + 5}
            y={scaledVertices[1].y - 5}
            text={`${measurements.angles[1].toFixed(0)}°`}
            fontSize={11}
            fill="#6c757d"
          />
          <Text
            x={scaledVertices[2].x + 5}
            y={scaledVertices[2].y - 5}
            text={`${measurements.angles[2].toFixed(0)}°`}
            fontSize={11}
            fill="#6c757d"
          />
        </Layer>
      </Stage>
      <div className="text-center mt-2" style={{ fontSize: '0.875rem', color: '#6c757d' }}>
        Seiten: {measurements.sides.map(s => s.toFixed(1)).join(', ')} | 
        Winkel: {measurements.angles.map(a => a.toFixed(0)).join('°, ')}°
      </div>
    </div>
  )
}
