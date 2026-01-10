import doctorModel from "../models/doctorModel.js";

/**
 * Finds available doctors in the DB based on the AI's recommended speciality.
 * @param {string} speciality - The specialist type returned by AI (e.g., "Cardiologist")
 * @returns {Promise<Array>} - List of doctor objects
 */
export const findMatchingDoctors = async (speciality) => {
  try {
    // If AI says "External Referral", we can't match internal doctors
    if (!speciality || speciality === "External Referral") {
      return [];
    }

    // Query your Doctor Collection
    // We strictly filter by 'available: true'
    const doctors = await doctorModel.find({ 
      speciality: speciality, 
      available: true 
    }).select("-password"); // Never return passwords!

    return doctors;

  } catch (error) {
    console.error("Error finding doctors:", error);
    return []; // Return empty array so the app doesn't crash
  }
};