import express from "express";
import { addDoctor , allDoctors, loginAdmin, appointmentAdmin, appointmentCancel, adminDashboard} from "../controllers/adminController.js"; //handles logic for adding doctor
import upload from "../middlewares/multer.js";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { changeAvailability } from "../controllers/doctorController.js";

const adminRouter = express.Router();

adminRouter.post('/add-doctor', verifyToken, authorizeRoles('admin'), upload.single("image"), addDoctor); //Uses multer middleware to handle file uploads, specifically allowing a single file with the field name "image".
//addDoctor → This is the controller function that processes the request after the file has been uploaded.
//Role check is centralized through verifyToken + authorizeRoles('admin').
adminRouter.post('/login' , loginAdmin);
adminRouter.post('/all-doctors' , verifyToken, authorizeRoles('admin'), allDoctors);
adminRouter.post('/change-availability' , verifyToken, authorizeRoles('admin'), changeAvailability);
adminRouter.get('/appointments' , verifyToken, authorizeRoles('admin'), appointmentAdmin);
adminRouter.post('/cancel-appointment' , verifyToken, authorizeRoles('admin'), appointmentCancel);
adminRouter.get('/dashboard' , verifyToken, authorizeRoles('admin'), adminDashboard);

export default adminRouter;