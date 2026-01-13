import express from 'express';
import { appointmentCancel, appointmentComplete, appointmentsDoctor, doctorDashboard, doctorList, doctorProfile, loginDoctor, updateDoctorProfile } from '../controllers/doctorController.js';
// 1. IMPORT THE NEW CONTROLLER FUNCTIONS
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
       
export default doctorRouter;