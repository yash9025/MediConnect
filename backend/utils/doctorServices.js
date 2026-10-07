import doctorModel from "../models/doctorModel.js";

export const findMatchingDoctors = async (speciality) => {
  try {
    // Return early if speciality is undefined or explicitly external
    if (!speciality || speciality === "External Referral") {
      return [];
    }

    // Create a fuzzy regex by stripping common suffixes like "ist", "y", "ies"
    const rootWord = speciality.replace(/(ist|y|ies)$/i, '');
    
    // Perform case-insensitive search for available doctors
    const doctors = await doctorModel.find({ 
      speciality: { $regex: new RegExp(rootWord, 'i') }, 
      available: true 
    }).select("name email image speciality degree experience about fees address slots_booked available");
    
    console.log(`[INFO] Found ${doctors.length} doctors for speciality: ${speciality}`);

    return doctors;

  } catch (error) {
    console.error("[ERROR] Failed to query doctors:", error.message);
    return []; 
  }
};