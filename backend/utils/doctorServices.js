import doctorModel from "../models/doctorModel.js";

export const findMatchingDoctors = async (speciality) => {
  try {
    // Return early if speciality is undefined or explicitly external
    if (!speciality || speciality === "External Referral") {
      return [];
    }

    // Perform case-insensitive search for available doctors
    const doctors = await doctorModel.find({ 
      speciality: { $regex: new RegExp(`^${speciality}$`, 'i') }, 
      available: true 
    }).select("name email image speciality degree experience about fees address slots_booked");
    
    console.log(`[INFO] Found ${doctors.length} doctors for speciality: ${speciality}`);

    return doctors;

  } catch (error) {
    console.error("[ERROR] Failed to query doctors:", error.message);
    return []; 
  }
};