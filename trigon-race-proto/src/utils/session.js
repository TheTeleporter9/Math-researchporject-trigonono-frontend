// Session management utilities

export function generateJoinCode() {
  // Generate a 6-character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing chars
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function generateAnonymousId() {
  // Generate a unique anonymous identifier
  return 'anon_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function getSessionFromStorage() {
  const stored = localStorage.getItem('current_session')
  return stored ? JSON.parse(stored) : null
}

export function saveSessionToStorage(session) {
  localStorage.setItem('current_session', JSON.stringify(session))
}

export function clearSessionFromStorage() {
  localStorage.removeItem('current_session')
}
