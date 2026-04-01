import express from 'express';
import { appointmentCancel, appointmentComplete, appointmentsDoctor, doctorDashboard, doctorList, doctorProfile, loginDoctor, updateDoctorProfile, nextPatient, markAbsent, getDoctorStatus, startOPD } from '../controllers/doctorController.js';
import { getPendingReports, verifyReport } from '../controllers/authorizeController.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const doctorRouter = express.Router();

doctorRouter.get('/list' , doctorList);
doctorRouter.post('/login' , loginDoctor);
doctorRouter.get('/appointments' , verifyToken, authorizeRoles('doctor'), appointmentsDoctor);
doctorRouter.post('/complete-appointment' , verifyToken, authorizeRoles('doctor'), appointmentComplete);
doctorRouter.post('/cancel-appointment' , verifyToken, authorizeRoles('doctor'), appointmentCancel);
doctorRouter.get('/dashboard' , verifyToken, authorizeRoles('doctor'), doctorDashboard);
doctorRouter.get('/profile' , verifyToken, authorizeRoles('doctor'), doctorProfile);
doctorRouter.post('/update-profile' , verifyToken, authorizeRoles('doctor'), updateDoctorProfile);
doctorRouter.post('/verification-requests', verifyToken, authorizeRoles('doctor'), getPendingReports); 
doctorRouter.post('/send-advice', verifyToken, authorizeRoles('doctor'), verifyReport); 
doctorRouter.post('/next-patient', verifyToken, authorizeRoles('doctor'), nextPatient);
doctorRouter.post('/mark-absent', verifyToken, authorizeRoles('doctor'), markAbsent);
doctorRouter.post('/start-opd', verifyToken, authorizeRoles('doctor'), startOPD);
doctorRouter.post('/status', getDoctorStatus);  // Public - no auth needed for users to see queue status
       
export default doctorRouter;