// Storage abstraction - backed by the deployable API (with local fallback for debug)

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
const TEACHER_TOKEN_KEY = 'teacher_token'

function apiUrl(path) {
  if (!path.startsWith('/')) path = '/' + path
  return `${API_BASE_URL}${path}`
}

async function apiFetch(path, options = {}) {
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })

  if (res.ok) {
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) return await res.json()
    return await res.text()
  }

  let details = ''
  try {
    const errJson = await res.json()
    details = errJson?.error ? `: ${errJson.error}` : ''
  } catch {
    // ignore
  }
  const err = new Error(`HTTP ${res.status}${details}`)
  err.status = res.status
  throw err
}

export function getTeacherToken() {
  return localStorage.getItem(TEACHER_TOKEN_KEY) || ''
}

export function setTeacherToken(token) {
  localStorage.setItem(TEACHER_TOKEN_KEY, (token || '').trim())
}

// Helper to show user-friendly error messages
export function showError(message, error = null) {
  console.error(message, error)
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

  setTimeout(() => errorDiv.remove(), 5000)
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

  setTimeout(() => successDiv.remove(), 3000)
}

export const sessionsStorage = {
  async getAll() {
    const token = getTeacherToken()
    if (!token) throw new Error('Teacher token missing. Set it in the dashboard.')
    return await apiFetch('/api/teacher/sessions', {
      headers: { 'X-Teacher-Token': token }
    })
  },

  async create({ game_type, config }) {
    const token = getTeacherToken()
    if (!token) throw new Error('Teacher token missing. Set it in the dashboard.')
    return await apiFetch('/api/teacher/sessions', {
      method: 'POST',
      headers: { 'X-Teacher-Token': token },
      body: JSON.stringify({
        gameType: game_type,
        config: config || {}
      })
    })
  },

  async start(sessionId) {
    const token = getTeacherToken()
    if (!token) throw new Error('Teacher token missing. Set it in the dashboard.')
    return await apiFetch(`/api/teacher/sessions/${sessionId}/start`, {
      method: 'POST',
      headers: { 'X-Teacher-Token': token }
    })
  },

  async end(sessionId) {
    const token = getTeacherToken()
    if (!token) throw new Error('Teacher token missing. Set it in the dashboard.')
    return await apiFetch(`/api/teacher/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: { 'X-Teacher-Token': token }
    })
  },

  async exportData(sessionId) {
    const token = getTeacherToken()
    if (!token) throw new Error('Teacher token missing. Set it in the dashboard.')
    return await apiFetch(`/api/teacher/sessions/${sessionId}/export`, {
      headers: { 'X-Teacher-Token': token }
    })
  },

  async getById(sessionId) {
    return await apiFetch(`/api/sessions/${sessionId}`)
  },

  async findByCode(joinCode) {
    return await apiFetch(`/api/sessions/by-code/${encodeURIComponent(joinCode.toUpperCase())}`)
  },

  async join({ joinCode, anonymousId, teamName, displayName }) {
    return await apiFetch('/api/sessions/join', {
      method: 'POST',
      body: JSON.stringify({
        joinCode,
        anonymousId,
        teamName,
        displayName
      })
    })
  },

  async getStudentProgress(sessionId, anonymousId) {
    return await apiFetch(`/api/sessions/${sessionId}/students/${anonymousId}/progress`)
  },

  async setStudentProgress(sessionId, anonymousId, level) {
    return await apiFetch(`/api/sessions/${sessionId}/students/${anonymousId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ level })
    })
  }
}

// Research data storage (posts to backend; also stores locally as a fallback)
export const researchStorage = {
  recordAttempt(data) {
    const attempts = JSON.parse(localStorage.getItem('research_attempts') || '[]')
    attempts.push({ ...data, timestamp: new Date().toISOString() })
    localStorage.setItem('research_attempts', JSON.stringify(attempts))

    apiFetch('/api/triangle/attempts', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: data.session_id,
        teamId: data.team_id,
        anonymousStudentId: data.anonymous_student_id,
        questionId: data.question_id,
        selectedTriangleIndex: data.selected_triangle_index,
        isCorrect: data.is_correct,
        responseTimeMs: data.response_time_ms,
        measurements: data.measurements || {}
      })
    }).catch(() => {})
  },

  recordProgression(data) {
    const progressions = JSON.parse(localStorage.getItem('research_progressions') || '[]')
    progressions.push({ ...data, timestamp: new Date().toISOString() })
    localStorage.setItem('research_progressions', JSON.stringify(progressions))
    // Backend endpoint for QR progression is not implemented in this deployable backend yet.
  },

  recordCompletion(data) {
    const completions = JSON.parse(localStorage.getItem('research_completions') || '[]')
    const existing = completions.findIndex(c =>
      c.session_id === data.session_id &&
      c.anonymous_student_id === data.anonymous_student_id &&
      c.game_type === data.game_type &&
      c.level === data.level
    )
    if (existing >= 0) completions[existing] = { ...data, timestamp: new Date().toISOString() }
    else completions.push({ ...data, timestamp: new Date().toISOString() })
    localStorage.setItem('research_completions', JSON.stringify(completions))

    apiFetch('/api/level-completions', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: data.session_id,
        anonymousStudentId: data.anonymous_student_id,
        teamId: data.team_id,
        gameType: data.game_type,
        level: data.level,
        mistakesCount: data.mistakes_count ?? 0,
        resetCount: data.reset_count ?? 0
      })
    }).catch(() => {})
  },

  recordOutcome(data) {
    const outcomes = JSON.parse(localStorage.getItem('research_outcomes') || '[]')
    const existing = outcomes.findIndex(o =>
      o.session_id === data.session_id &&
      o.anonymous_student_id === data.anonymous_student_id &&
      o.game_type === data.game_type
    )
    if (existing >= 0) outcomes[existing] = { ...data, timestamp: new Date().toISOString() }
    else outcomes.push({ ...data, timestamp: new Date().toISOString() })
    localStorage.setItem('research_outcomes', JSON.stringify(outcomes))

    apiFetch('/api/outcomes', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: data.session_id,
        anonymousStudentId: data.anonymous_student_id,
        teamId: data.team_id,
        gameType: data.game_type,
        finalLevel: data.final_level ?? null,
        totalMistakes: data.total_mistakes ?? 0,
        totalResets: data.total_resets ?? 0
      })
    }).catch(() => {})
  }
}
