import React, { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { researchStorage, showSuccess, showError } from '../../utils/storage'
import { generateIncompleteQR, answerToCellPosition, renderIncompleteQR, isQRComplete } from '../../utils/qrCode'
import { generateSeed } from '../../utils/random'

export default function QRProgressionGame({ session, studentData }) {
  const [currentLevel, setCurrentLevel] = useState(1)
  const [qrData, setQrData] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [filledCells, setFilledCells] = useState(new Set())
  const [timeRemaining, setTimeRemaining] = useState((session?.config?.duration_minutes || 30) * 60)
  const [gameEnded, setGameEnded] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const canvasRef = useRef(null)
  const qrCodeScannerRef = useRef(null)

  useEffect(() => {
    initializeLevel()
  }, [currentLevel])

  useEffect(() => {
    if (qrData && canvasRef.current) {
      const qrWithFilled = { ...qrData, filledCells }
      renderIncompleteQR(qrWithFilled, canvasRef.current, 8)
    }
  }, [qrData, filledCells])

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

  const initializeLevel = async () => {
    if (!session || !session.config) {
      showError('Sitzungskonfiguration fehlt')
      return
    }
    
    try {
      const seed = generateSeed() + currentLevel * 1000
      const levelData = `LEVEL_${currentLevel}_${studentData.anonymousId}_${seed}`
      
      // Generate incomplete QR code
      const qr = await generateIncompleteQR(levelData, 10, seed)
      setQrData(qr)
      setFilledCells(new Set())

      // Generate questions for this level
      const levelQuestions = generateQuestionsForLevel(currentLevel, session.config.num_questions || 10)
      setQuestions(levelQuestions)
      setCurrentQuestionIndex(0)
      setAnswers({})
    } catch (err) {
      showError('Fehler beim Initialisieren der Stufe: ' + err.message)
      console.error(err)
    }
  }

  const generateQuestionsForLevel = (level, count) => {
    const questions = []
    for (let i = 0; i < count; i++) {
      const questionId = `level_${level}_q_${i}`
      // Generate geometry/measurement questions
      const question = generateGeometryQuestion(level, questionId)
      questions.push(question)
    }
    return questions
  }

  const generateGeometryQuestion = (level, questionId) => {
    // Simple geometry questions that increase in difficulty
    const baseValue = 10 + level * 5
    const a = Math.floor(Math.random() * baseValue) + baseValue
    const b = Math.floor(Math.random() * baseValue) + baseValue
    const angle = Math.floor(Math.random() * 60) + 30

    const questionTypes = [
      {
        type: 'triangle_area',
        question: `Wie groß ist die Fläche eines Dreiecks mit Grundseite ${a} und Höhe ${b}?`,
        correctAnswer: String(Math.round((a * b) / 2)),
        options: [
          String(Math.round((a * b) / 2)),
          String(a * b),
          String(a + b),
          String(Math.round((a * b) / 3))
        ]
      },
      {
        type: 'angle_sum',
        question: `Zwei Winkel in einem Dreieck sind ${angle}° und ${angle + 20}°. Wie groß ist der dritte Winkel?`,
        correctAnswer: String(180 - angle - (angle + 20)),
        options: [
          String(180 - angle - (angle + 20)),
          String(180 - angle),
          String(angle + 20),
          String(90)
        ]
      },
      {
        type: 'perimeter',
        question: `Wie groß ist der Umfang eines Dreiecks mit den Seiten ${a}, ${b} und ${a + b - 5}?`,
        correctAnswer: String(a + b + (a + b - 5)),
        options: [
          String(a + b + (a + b - 5)),
          String(a * b),
          String((a + b) * 2),
          String(a + b)
        ]
      }
    ]

    const selected = questionTypes[Math.floor(Math.random() * questionTypes.length)]
    return {
      id: questionId,
      ...selected
    }
  }

  const handleAnswer = (questionId, answer) => {
    const newAnswers = { ...answers, [questionId]: answer }
    setAnswers(newAnswers)

    // Map answer to QR cell position
    if (qrData) {
      const cellPos = answerToCellPosition(questionId, answer, qrData.size)
      const newFilledCells = new Set(filledCells)
      newFilledCells.add(cellPos)
      setFilledCells(newFilledCells)

      // Record progression
      const question = questions.find(q => q.id === questionId)
      const startTime = Date.now() - 5000 // Approximate response time
      researchStorage.recordProgression({
        session_id: session.id,
        anonymous_student_id: studentData.anonymousId,
        level: currentLevel,
        question_id: questionId,
        selected_answer: answer,
        qr_cell_position: cellPos,
        response_time_ms: Date.now() - startTime
      })
    }

    // Move to next question
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handleScanQR = async () => {
    setShowScanner(true)
    const scanner = new Html5Qrcode('qr-reader')
    
    scanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      (decodedText) => {
        scanner.stop()
        setShowScanner(false)
        
        // Check if QR code matches expected data
        const expectedData = `LEVEL_${currentLevel}_${studentData.anonymousId}_`
        if (decodedText.startsWith(expectedData)) {
          setScanResult('success')
          showSuccess(`Stufe ${currentLevel} abgeschlossen!`)
          
          // Record level completion
          researchStorage.recordCompletion({
            session_id: session.id,
            anonymous_student_id: studentData.anonymousId,
            game_type: 'individual_qr',
            level: currentLevel,
            mistakes_count: 0,
            reset_count: 0
          })

          // Advance to next level
          setTimeout(() => {
            if (currentLevel < (session.config.max_level || 5)) {
              setCurrentLevel(prev => prev + 1)
              setScanResult(null)
            } else {
              endGame()
            }
          }, 2000)
        } else {
          setScanResult('error')
          showError('QR-Code-Scan fehlgeschlagen. Bitte beantworte die Fragen erneut.')
          setTimeout(() => {
            setScanResult(null)
            // Level must be repeated - reset questions
            initializeLevel()
          }, 2500)
        }
      },
      (errorMessage) => {
        // Ignore scan errors
      }
    )

    qrCodeScannerRef.current = scanner
  }

  const endGame = async () => {
    researchStorage.recordOutcome({
      session_id: session.id,
      anonymous_student_id: studentData.anonymousId,
      game_type: 'individual_qr',
      final_level: currentLevel,
      total_mistakes: 0,
      total_resets: 0
    })
    showSuccess('Spiel beendet! Endstufe: ' + currentLevel)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const currentQuestion = questions[currentQuestionIndex]
  const allQuestionsAnswered = currentQuestionIndex >= questions.length - 1 && answers[currentQuestion?.id]

  return (
    <div>
      <div className="header">
        <div className="header-content">
          <h1>QR-Code-Spiel</h1>
          <div className="flex gap-2">
            <span className="badge">Stufe: {currentLevel}</span>
            <span className="badge">Zeit: {formatTime(timeRemaining)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Questions Panel */}
        <div className="panel">
          <h2>Fragen</h2>
          <p className="text-muted">
            Beantworte die Geometriefragen. Jede Antwort füllt eine Zelle in deinem QR-Code.
          </p>

          {currentQuestion && (
            <div className="mb-3">
              <div className="mb-2">
                <strong>Frage {currentQuestionIndex + 1} von {questions.length}</strong>
              </div>
              <div className="mb-3">
                <p>{currentQuestion.question}</p>
              </div>
              <div className="grid grid-2">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    className={`btn ${answers[currentQuestion.id] === option ? 'btn-success' : 'btn-secondary'}`}
                    onClick={() => handleAnswer(currentQuestion.id, option)}
                    disabled={!!answers[currentQuestion.id]}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {allQuestionsAnswered && (
            <div className="alert alert-info">
              <p>Alle Fragen beantwortet! Scanne deinen QR-Code, um die Stufe abzuschließen.</p>
              <button className="btn mt-2" onClick={handleScanQR}>
                QR-Code scannen
              </button>
            </div>
          )}

          {scanResult === 'success' && (
            <div className="alert alert-success">
              <p>QR-Code erfolgreich gescannt! Stufe {currentLevel} abgeschlossen!</p>
            </div>
          )}

          {scanResult === 'error' && (
            <div className="alert alert-error">
              <p>QR-Code-Scan fehlgeschlagen. Bitte beantworte die Fragen erneut.</p>
            </div>
          )}
        </div>

        {/* QR Code Panel */}
        <div className="panel">
          <h2>Dein QR-Code</h2>
          <p className="text-muted">
            Fülle Zellen, indem du Fragen richtig beantwortest. Scanne, wenn fertig.
          </p>
          <div className="flex-center">
            <canvas ref={canvasRef} style={{ border: '2px solid #dee2e6', borderRadius: '8px' }} />
          </div>
          <div className="text-center mt-2">
            <p className="text-muted">
              Gefüllt: {filledCells.size} / {qrData?.missingPositions.length || 0} Zellen
            </p>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="panel" style={{ maxWidth: '500px' }}>
            <h3>QR-Code scannen</h3>
            <div id="qr-reader" style={{ width: '100%' }} />
            <button className="btn btn-secondary mt-2" onClick={() => {
              if (qrCodeScannerRef.current) {
                qrCodeScannerRef.current.stop()
              }
              setShowScanner(false)
            }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {gameEnded && (
        <div className="panel">
          <div className="alert alert-info">
            <h3>Spiel beendet</h3>
            <p>Endstufe: {currentLevel}</p>
          </div>
        </div>
      )}
    </div>
  )
}
