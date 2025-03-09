import express from "express";
import { addDoctor , allDoctors, loginAdmin, appointmentAdmin, appointmentCancel, adminDashboard} from "../controllers/adminController.js"; //handles logic for adding doctor
import upload from "../middlewares/multer.js";
import authAdmin from "../middlewares/authAdmin.js";
import { changeAvailability } from "../controllers/doctorController.js";

const adminRouter = express.Router();

adminRouter.post('/add-doctor',authAdmin,upload.single("image"),addDoctor); //Uses multer middleware to handle file uploads, specifically allowing a single file with the field name "image".
//addDoctor → This is the controller function that processes the request after the file has been uploaded.
//we have added authadmin middleware as it will check if user is admin login then only he can add doctor
adminRouter.post('/login' , loginAdmin);
adminRouter.post('/all-doctors' ,authAdmin ,allDoctors);
adminRouter.post('/change-availability' ,authAdmin ,changeAvailability);
adminRouter.get('/appointments' ,authAdmin ,appointmentAdmin);
adminRouter.post('/cancel-appointment' ,authAdmin ,appointmentCancel);
adminRouter.get('/dashboard' ,authAdmin ,adminDashboard);

export default adminRouter;