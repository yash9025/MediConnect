import express from 'express';
import { getProfile, loginUser, registerUser, updateProfile, bookAppointment, listAppointment, cancelAppointment, paymentRazorpay, verifyRazorpay, getAppointmentStatus } from '../controllers/userController.js';
import { requestVerification } from '../controllers/authorizeController.js'; 
import authUser from '../middlewares/authUser.js';
import upload from '../middlewares/multer.js';

const userRouter = express.Router();

userRouter.post('/register' , registerUser);
userRouter.post('/login' , loginUser);
userRouter.get('/get-profile' ,authUser, getProfile);
userRouter.post('/update-profile',upload.single('image'), authUser,updateProfile);
userRouter.post('/book-appointment', authUser,bookAppointment);
userRouter.get('/appointments', authUser,listAppointment);
userRouter.post('/cancel-appointment', authUser,cancelAppointment);
userRouter.post('/payment-razorpay', authUser,paymentRazorpay);
userRouter.post('/verifyrazorpay', authUser,verifyRazorpay);
userRouter.post('/authorize-doc', authUser, requestVerification);
userRouter.post('/get-status', authUser, getAppointmentStatus);

export default userRouter;