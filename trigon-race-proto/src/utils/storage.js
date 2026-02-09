// Storage abstraction - uses localStorage only (no database)

// Helper to show user-friendly error messages
export function showError(message, error = null) {
  console.error(message, error)
  // Create a visible error notification
  const errorDiv = document.createElement('div')
  errorDiv.className = 'alert alert-error'
  errorDiv.style.position = 'fixed'
  errorDiv.style.top = '20px'
  errorDiv.style.right = '20px'
  errorDiv.style.zIndex = '10000'
  errorDiv.style.maxWidth = '400px'
  errorDiv.style.padding = '1rem'
  errorDiv.textContent = message
  document.body.appendChild(errorDiv)
  
  setTimeout(() => {
    errorDiv.remove()
  }, 5000)
}

export function showSuccess(message) {
  const successDiv = document.createElement('div')
  successDiv.className = 'alert alert-success'
  successDiv.style.position = 'fixed'
  successDiv.style.top = '20px'
  successDiv.style.right = '20px'
  successDiv.style.zIndex = '10000'
  successDiv.style.maxWidth = '400px'
  successDiv.style.padding = '1rem'
  successDiv.textContent = message
  document.body.appendChild(successDiv)
  
  setTimeout(() => {
    successDiv.remove()
  }, 3000)
}

// Sessions storage
export const sessionsStorage = {
  getAll() {
    const stored = localStorage.getItem('sessions')
    return Promise.resolve(stored ? JSON.parse(stored) : [])
  },

  create(session) {
    const sessions = this.getAllLocal()
    const newSession = {
      ...session,
      id: 'local_' + Date.now() + '_' + Math.random().toString(36).substring(7),
      created_at: new Date().toISOString()
    }
    sessions.unshift(newSession)
    localStorage.setItem('sessions', JSON.stringify(sessions))
    showSuccess('Sitzung erfolgreich erstellt!')
    return Promise.resolve(newSession)
  },

  getAllLocal() {
    const stored = localStorage.getItem('sessions')
    return stored ? JSON.parse(stored) : []
  },

  update(id, updates) {
    const sessions = this.getAllLocal()
    const index = sessions.findIndex(s => s.id === id)
    if (index >= 0) {
      sessions[index] = { ...sessions[index], ...updates }
      localStorage.setItem('sessions', JSON.stringify(sessions))
      return Promise.resolve(sessions[index])
    }
    return Promise.resolve(null)
  },

  findByCode(joinCode) {
    const sessions = this.getAllLocal()
    return Promise.resolve(sessions.find(s => s.join_code === joinCode.toUpperCase()) || null)
  }
}

// Teams storage
export const teamsStorage = {
  create(team) {
    const teams = this.getAllLocal()
    const newTeam = {
      ...team,
      id: 'team_' + Date.now() + '_' + Math.random().toString(36).substring(7)
    }
    teams.push(newTeam)
    localStorage.setItem('teams', JSON.stringify(teams))
    return Promise.resolve(newTeam)
  },

  getAllLocal() {
    const stored = localStorage.getItem('teams')
    return stored ? JSON.parse(stored) : []
  }
}

// Students storage
export const studentsStorage = {
  create(student) {
    const students = this.getAllLocal()
    const newStudent = {
      ...student,
      id: 'student_' + Date.now() + '_' + Math.random().toString(36).substring(7)
    }
    students.push(newStudent)
    localStorage.setItem('students', JSON.stringify(students))
    return Promise.resolve(newStudent)
  },

  getAllLocal() {
    const stored = localStorage.getItem('students')
    return stored ? JSON.parse(stored) : []
  }
}

// Research data storage
export const researchStorage = {
  recordAttempt(data) {
    const attempts = JSON.parse(localStorage.getItem('research_attempts') || '[]')
    attempts.push({ ...data, timestamp: new Date().toISOString() })
    localStorage.setItem('research_attempts', JSON.stringify(attempts))
  },

  recordProgression(data) {
    const progressions = JSON.parse(localStorage.getItem('research_progressions') || '[]')
    progressions.push({ ...data, timestamp: new Date().toISOString() })
    localStorage.setItem('research_progressions', JSON.stringify(progressions))
  },

  recordCompletion(data) {
    const completions = JSON.parse(localStorage.getItem('research_completions') || '[]')
    const existing = completions.findIndex(c => 
      c.session_id === data.session_id &&
      c.anonymous_student_id === data.anonymous_student_id &&
      c.game_type === data.game_type &&
      c.level === data.level
    )
    if (existing >= 0) {
      completions[existing] = { ...data, timestamp: new Date().toISOString() }
    } else {
      completions.push({ ...data, timestamp: new Date().toISOString() })
    }
    localStorage.setItem('research_completions', JSON.stringify(completions))
  },

  recordOutcome(data) {
    const outcomes = JSON.parse(localStorage.getItem('research_outcomes') || '[]')
    const existing = outcomes.findIndex(o =>
      o.session_id === data.session_id &&
      o.anonymous_student_id === data.anonymous_student_id &&
      o.game_type === data.game_type
    )
    if (existing >= 0) {
      outcomes[existing] = { ...data, timestamp: new Date().toISOString() }
    } else {
      outcomes.push({ ...data, timestamp: new Date().toISOString() })
    }
    localStorage.setItem('research_outcomes', JSON.stringify(outcomes))
  },

  async exportData(sessionId) {
    const attempts = JSON.parse(localStorage.getItem('research_attempts') || '[]')
      .filter(a => a.session_id === sessionId)
    const progressions = JSON.parse(localStorage.getItem('research_progressions') || '[]')
      .filter(p => p.session_id === sessionId)
    const completions = JSON.parse(localStorage.getItem('research_completions') || '[]')
      .filter(c => c.session_id === sessionId)
    const outcomes = JSON.parse(localStorage.getItem('research_outcomes') || '[]')
      .filter(o => o.session_id === sessionId)

    return {
      session_id: sessionId,
      exported_at: new Date().toISOString(),
      triangle_attempts: attempts,
      qr_progression: progressions,
      level_completions: completions,
      session_outcomes: outcomes
    }
  }
}
