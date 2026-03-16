import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentJoin from './pages/StudentJoin'
import StudentGame from './pages/StudentGame'
import TestStudentView from './pages/TestStudentView'
import Footer from './components/Footer'

function App() {
  return (
    <div className="app">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/teacher/dashboard" replace />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/test" element={<TestStudentView />} />
          <Route path="/student/join" element={<StudentJoin />} />
          <Route path="/student/game/:sessionId" element={<StudentGame />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </div>
  )
}

export default App
