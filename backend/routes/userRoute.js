import express from 'express';
import { getProfile, loginUser, registerUser, updateProfile, bookAppointment, listAppointment, cancelAppointment, paymentRazorpay, verifyRazorpay, getAppointmentStatus } from '../controllers/userController.js';
import { requestVerification } from '../controllers/authorizeController.js'; 
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import upload from '../middlewares/multer.js';

const userRouter = express.Router();

userRouter.post('/register' , registerUser);
userRouter.post('/login' , loginUser);
userRouter.get('/get-profile' , verifyToken, authorizeRoles('patient'), getProfile);
userRouter.post('/update-profile', upload.single('image'), verifyToken, authorizeRoles('patient'), updateProfile);
userRouter.post('/book-appointment', verifyToken, authorizeRoles('patient'), bookAppointment);
userRouter.get('/appointments', verifyToken, authorizeRoles('patient'), listAppointment);
userRouter.post('/cancel-appointment', verifyToken, authorizeRoles('patient'), cancelAppointment);
userRouter.post('/payment-razorpay', verifyToken, authorizeRoles('patient'), paymentRazorpay);
userRouter.post('/verifyrazorpay', verifyToken, authorizeRoles('patient'), verifyRazorpay);
userRouter.post('/authorize-doc', verifyToken, authorizeRoles('patient'), requestVerification);
userRouter.post('/get-status', verifyToken, authorizeRoles('patient'), getAppointmentStatus);

export default userRouter;