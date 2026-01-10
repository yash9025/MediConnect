import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Doctors from './pages/Doctors'
import Login from './pages/Login'
import About from './pages/About'
import Contact from './pages/Contact'
import MyProfile from './pages/MyProfile'
import MyAppointments from './pages/MyAppointments'
import Appointment from './pages/Appointment'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { ToastContainer } from 'react-toastify'
import ChatWidget from "./components/ChatWidget"

import { useAnalysis } from "./context/AnalysisContext"
import AnalyzingOverlay from "./components/AnalyzingOverlay"
import AnalysisOverlay from "./components/AnalysisOverlay"

const App = () => {
  // 🔑 STEP-5: consume global analysis state
  const { loading } = useAnalysis()

  return (
    <div>
      {/* 🔥 Loading screen */}
      {loading && <AnalyzingOverlay />}

      {/* 🔥 AI Analysis Result Overlay */}
      <AnalysisOverlay />

      <ToastContainer />
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/doctors/:speciality" element={<Doctors />} />
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/my-profile" element={<MyProfile />} />
        <Route path="/my-appointments" element={<MyAppointments />} />
        <Route path="/appointment/:docId" element={<Appointment />} />
      </Routes>

      <Footer />

      {/* 🔥 Floating chatbot (global) */}
      <ChatWidget />
    </div>
  )
}

export default App
