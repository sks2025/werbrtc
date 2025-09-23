
import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import Signup from './components/Signup'
import DoctorDashboard from './components/DoctorDashboard'
import PatientJoin from './components/PatientJoin'
import VideoCall from './components/VideoCall'
import './App.css'
function App() {

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
           {/* <Route path="/" element={<Navigate to="/login/:token" replace />} />
          <Route path="/login/:token" element={<Login />} /> */}
           {/* <Route path="/" element={<Navigate to="/login/:accesstoken" replace />} />
          <Route path="/login/:accesstoken" element={<Login />} /> */}
          <Route path="/signup" element={<Signup />} />
          <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
          <Route path="/patient-join/:roomId" element={<PatientJoin />} />
          <Route path="/video-call/:roomId" element={<VideoCall />} />
        </Routes>
    </BrowserRouter>
  )
}

export default App
