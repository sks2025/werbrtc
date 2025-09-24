
import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import Signup from './components/Signup'
import DoctorDashboard from './components/DoctorDashboard'
import PatientJoin from './components/PatientJoin'
import VideoCall from './components/VideoCall'
import AdminLogin from './components/AdminLogin'
import AdminProtectedRoute from './components/AdminProtectedRoute'
import { AdminProvider } from './contexts/AdminContext'
import './App.css'
function App() {

  return (
    <AdminProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route 
              path="/signup" 
              element={
                <AdminProtectedRoute>
                  <Signup />
                </AdminProtectedRoute>
              } 
            />
            <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
            <Route path="/patient-join/:roomId" element={<PatientJoin />} />
            <Route path="/video-call/:roomId" element={<VideoCall />} />
          </Routes>
      </BrowserRouter>
    </AdminProvider>
  )
}

export default App
