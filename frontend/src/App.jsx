import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Doctors from './pages/Doctors';
import Login from './pages/Login';
import About from './pages/About';
import Contact from './pages/Contact';
import MyProfile from './pages/MyProfile';
import MyAppointments from './pages/MyAppointments';
import Appointment from './pages/Appointment';
import { ToastContainer } from 'react-toastify';
import ProtectedRoute from './components/ProtectedRoute';
import PanelLayout from './components/admin/PanelLayout.jsx';
import MainLayout from './components/MainLayout.jsx';
import AdminDashboard from './pages/Admin/Dashboard.jsx';
import AllAppointments from './pages/Admin/AllAppointments.jsx';
import AddDoctor from './pages/Admin/AddDoctor.jsx';
import DoctorList from './pages/Admin/DoctorList.jsx';
import DoctorDashboard from './pages/Doctor/DoctorDashboard.jsx';
import DoctorAppointment from './pages/Doctor/DoctorAppointment.jsx';
import DoctorProfile from './pages/Doctor/DoctorProfile.jsx';
import DoctorReportAnalysis from './pages/Doctor/DoctorReportAnalysis.jsx';
import Unauthorized from './pages/Unauthorized.jsx';

const App = () => {
  return (
    <div>
      <ToastContainer />
      <Routes>
        <Route path="/panel-login" element={<Navigate to="/login" replace />} />

        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/doctors/:speciality" element={<Doctors />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route element={<ProtectedRoute allowedRoles={['patient']} unauthorizedTo="/unauthorized" />}>
            <Route path="/dashboard" element={<Home />} />
            <Route path="/my-profile" element={<MyProfile />} />
            <Route path="/my-appointments" element={<MyAppointments />} />
            <Route path="/appointment/:docId" element={<Appointment />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/login" unauthorizedTo="/unauthorized" />}>
          <Route element={<PanelLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/appointments" element={<AllAppointments />} />
            <Route path="/admin/add-doctor" element={<AddDoctor />} />
            <Route path="/admin/doctors" element={<DoctorList />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['doctor']} redirectTo="/login" unauthorizedTo="/unauthorized" />}>
          <Route element={<PanelLayout />}>
            <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
            <Route path="/doctor/appointments" element={<DoctorAppointment />} />
            <Route path="/doctor/profile" element={<DoctorProfile />} />
            <Route path="/doctor/reports" element={<DoctorReportAnalysis />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
