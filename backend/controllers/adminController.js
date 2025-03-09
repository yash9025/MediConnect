import validator from 'validator';
import bcrypt from 'bcrypt';
import { v2 as cloudinary } from 'cloudinary';
import doctorModel from '../models/doctorModel.js';
import jwt from 'jsonwebtoken';
import appointmentModel from '../models/appointmentModel.js';
import userModel from '../models/userModel.js';

//API for adding doctor
const addDoctor = async (req, res) => {

    try {

        const { name, email, password, speciality, degree, experience, about, fees, address } = req.body
        const imageFile = req.file  //the image that will be proceesed by multer is stored in req.file so we are just accesing it and storing in imgeFIle variable

        //checking for all data to add doctor
        if (!name || !email || !password || !degree || !experience || !about || !fees || !address || !imageFile || !speciality) {
            return res.json({ success: false, message: "Missing Details" })
        }

        //validating email format
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "please enter a valid email" })
        }

        //validating strong password
        if (password.length < 8) {
            return res.json({ success: false, message: "please enter a strong password" })
        }

        //hashing doctor password
        const salt = await bcrypt.genSalt(10); //Generates a salt, which is a random string used to strengthen the hash.The number 10 is the salt rounds, meaning bcrypt will apply 10 rounds of processing to make the hash more secure.
        const hashedPassword = await bcrypt.hash(password, salt); //Takes the user's password and the generated salt.Uses bcrypt's hashing algorithm to create a hashed password.

        //uplaod image to cloudinary
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" }); //{ resource_type: "image" } ensures that Cloudinary treats the file as an image (instead of a video or raw file).
        //imageUpload will return image link(URL)
        const imageUrl = imageUpload.secure_url; //secure_url provides the HTTPS link to access the uploaded image on cloudinary.

        /*Example Upload Response from Cloudinary
         {
            "public_id": "sample_image",
            "url": "http://res.cloudinary.com/demo/image/upload/v123456/sample.jpg",
            "secure_url": "https://res.cloudinary.com/demo/image/upload/v123456/sample.jpg",
            "format": "jpg",
            "width": 1024,
            "height": 768,
            "resource_type": "image"
         }
        */

        const doctorData = {
            name,
            email,
            image: imageUrl,
            password: hashedPassword,
            speciality,
            degree,
            experience,
            about,
            fees,
            address: JSON.parse(address),  //will store as object in database
            date: Date.now()
        }

        const newDoctor = new doctorModel(doctorData);
        await newDoctor.save();  //data will be stores in database

        res.json({ success: true, message: "Doctor added successfully" })


    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })

    }
}

//API FOR ADMIN LOGIN
const loginAdmin = async (req, res) => {
    try {

        const { email, password } = req.body;  //getting the user typed email and password from req.body 

        if (email === process.env.ADMIN_EMAIL && password == process.env.ADMIN_PASSWORD) {

            const token = jwt.sign(email + password, process.env.JWT_SECRET);
            res.json({ success: true, token });

        } else {
            res.json({ success: false, message: "Invalid Credentials" });
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });

    }
}


//API to get all doctors list for admin panel
const allDoctors = async (req, res) => {
    try {

        const doctors = await doctorModel.find({}).select('-password') //will remove password property from doctors response
        res.json({ success: true, doctors })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });

    }
}

//API TO GET ALL APPOINTMENTS LIST
const appointmentAdmin = async (req,res) => {
    
    try {
        
        const appointments = await appointmentModel.find({});
        res.json({success:true , appointments})
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

//API FOR APPOINTMENT CANCELLATION
const appointmentCancel = async (req, res) => {

    try {
        const { appointmentId } = req.body;

        const appointmentData = await appointmentModel.findById(appointmentId);

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });

        //releasing doctor slot

        const { docId, slotDate, slotTime } = appointmentData;

        const doctorData = await doctorModel.findById(docId);

        let slots_booked = doctorData.slots_booked;

        slots_booked[slotDate] = slots_booked[slotDate].filter(e => e != slotTime);

        await doctorModel.findByIdAndUpdate(docId, { slots_booked });
        res.json({ success: true, message: "Appointment Cancelled" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

//API TO GET DASHBOARD FOR ADMIN PANEL
const adminDashboard = async (req,res) => {
    
    try {

        const doctors = await doctorModel.find({});
        const users = await userModel.find({});
        const appointments = await appointmentModel.find({});

        const dashData = {
            doctors: doctors.length,
            appointments: appointments.length,
            patients: users.length,
            latestAppointments: appointments.reverse().slice(0,5)
        }

        res.json({success:true,dashData})

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

export { addDoctor, loginAdmin, allDoctors,appointmentAdmin, appointmentCancel, adminDashboard }