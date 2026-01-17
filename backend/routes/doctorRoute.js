import express from 'express';
import { appointmentCancel, appointmentComplete, appointmentsDoctor, doctorDashboard, doctorList, doctorProfile, loginDoctor, updateDoctorProfile, nextPatient, markAbsent, getDoctorStatus, startOPD } from '../controllers/doctorController.js';
import { getPendingReports, verifyReport } from '../controllers/authorizeController.js';
import authDoctor from '../middlewares/authDoctor.js';

const doctorRouter = express.Router();

doctorRouter.get('/list' , doctorList);
doctorRouter.post('/login' , loginDoctor);
doctorRouter.get('/appointments' , authDoctor , appointmentsDoctor);
doctorRouter.post('/complete-appointment' , authDoctor,appointmentComplete);
doctorRouter.post('/cancel-appointment' , authDoctor , appointmentCancel);
doctorRouter.get('/dashboard' , authDoctor , doctorDashboard);
doctorRouter.get('/profile' , authDoctor , doctorProfile);
doctorRouter.post('/update-profile' , authDoctor , updateDoctorProfile);
doctorRouter.post('/verification-requests', authDoctor, getPendingReports); 
doctorRouter.post('/send-advice', authDoctor, verifyReport); 
doctorRouter.post('/next-patient', authDoctor, nextPatient);
doctorRouter.post('/mark-absent', authDoctor, markAbsent);
doctorRouter.post('/start-opd', authDoctor, startOPD);
doctorRouter.post('/status', getDoctorStatus);  // Public - no auth needed for users to see queue status
       
export default doctorRouter;