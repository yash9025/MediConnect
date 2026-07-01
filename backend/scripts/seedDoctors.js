import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import doctorModel from '../models/doctorModel.js';
import connectDB from '../config/mongodb.js';

dotenv.config();

// Comprehensive list of specialities from the UI
const specialties = [
  'General physician',
  'Gynecologist',
  'Dermatologist',
  'Pediatricians',
  'Neurologist',
  'Gastroenterologist',
  'Endocrinologist',
  'Hematologist',
  'Cardiologist'
];

// Realistic names for the doctors
const doctorNames = [
  "Dr. Richard James", "Dr. Emily Chen", 
  "Dr. Sarah Mitchell", "Dr. Michael Chang",
  "Dr. David Wilson", "Dr. Priya Sharma",
  "Dr. Robert Taylor", "Dr. Lisa Anderson",
  "Dr. James Martinez", "Dr. Amanda White",
  "Dr. William Thompson", "Dr. Jessica Lee",
  "Dr. Thomas Garcia", "Dr. Rachel Robinson",
  "Dr. Christopher Clark", "Dr. Michelle Rodriguez",
  "Dr. Daniel Lewis", "Dr. Elizabeth Walker"
];

// High-quality generic image URLs
const genericImages = [
  'https://img.freepik.com/free-photo/portrait-successful-mid-adult-doctor-with-crossed-arms_1262-12865.jpg',
  'https://img.freepik.com/free-photo/beautiful-young-female-doctor-looking-camera-office_1301-7807.jpg',
  'https://img.freepik.com/free-photo/woman-doctor-wearing-lab-coat-with-stethoscope-isolated_1303-29791.jpg',
  'https://img.freepik.com/free-photo/expressive-young-woman-posing-studio_176474-66963.jpg',
  'https://img.freepik.com/free-photo/pleased-young-female-doctor-wearing-medical-robe-stethoscope-around-neck-standing-with-closed-posture_409827-254.jpg',
  'https://img.freepik.com/free-photo/smiling-asian-male-doctor-pointing-upwards_1262-18321.jpg',
  'https://img.freepik.com/free-photo/portrait-smiling-male-doctor_171337-1532.jpg',
  'https://img.freepik.com/free-photo/female-doctor-hospital-with-stethoscope_23-2148827775.jpg'
];

const seedDoctors = async () => {
  try {
    await connectDB();
    
    // Optional: uncomment to clear existing doctors before seeding
    // await doctorModel.deleteMany({});
    
    const doctorsToInsert = [];
    let nameIndex = 0;
    
    for (let i = 0; i < specialties.length; i++) {
        // Create 2 doctors per category to ensure good coverage
        for (let j = 0; j < 2; j++) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(`password123`, salt);
            
            const docName = doctorNames[nameIndex % doctorNames.length];
            const emailPrefix = docName.toLowerCase().replace(/[^a-z0-9]/g, '');

            doctorsToInsert.push({
                name: docName,
                email: `${emailPrefix}@mediconnect.com`,
                password: hashedPassword,
                image: genericImages[nameIndex % genericImages.length],
                speciality: specialties[i],
                degree: 'MBBS, MD',
                experience: `${3 + (nameIndex % 15)} Years`,
                about: `${docName} is an experienced ${specialties[i]} dedicated to providing comprehensive and compassionate care. Known for a detail-oriented approach and excellent patient outcomes.`,
                available: true,
                fees: 500 + ((nameIndex % 5) * 100),
                address: {
                    line1: 'MediConnect Health Center',
                    line2: 'Sector 5, Medical District'
                },
                date: Date.now()
            });
            
            nameIndex++;
        }
    }

    const inserted = await doctorModel.insertMany(doctorsToInsert);
    console.log(`✅ Successfully seeded ${inserted.length} doctors with genuine names and all categories!`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding doctors:', error);
    process.exit(1);
  }
};

seedDoctors();
