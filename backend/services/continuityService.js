import reportModel from "../models/reportModel.js";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import { connection as redisClient } from "../config/redis.js";

/**
 * Finds if the patient has an established attending doctor for this specialty.
 * Uses a 24-hr Redis cache to eliminate redundant MongoDB lookups.
 * 
 * Hierarchy of Trust:
 * 1. Redis Cache (Fastest)
 * 2. Most recent VERIFIED report assigned to a doctor (Highest Clinical Trust, No Expiry)
 * 3. Most recent COMPLETED appointment within the last 180 days (Continuity Window)
 */
export const getAttendingDoctor = async (userId, targetSpecialty) => {
  if (!userId || !targetSpecialty) return null;

  const normalizedSpecialty = targetSpecialty.toLowerCase().trim();
  // Key format: attending_doc:{userId}:{specialty}
  const cacheKey = `attending_doc:${userId}:${normalizedSpecialty}`;

  // 1. FAST PATH: Check Redis cache (sub-1ms for active sessions)
  try {
    const cachedDocId = await redisClient.get(cacheKey);
    if (cachedDocId) {
      const doctor = await doctorModel.findById(cachedDocId).select("-password");
      if (doctor && doctor.available) return doctor;
    }
  } catch (err) {
    console.warn("[ContinuityCache] Redis cache miss/error:", err.message);
  }

  // 2. HIGHEST TRUST: The doctor who verified their previous baseline report
  // (NO DATE EXPIRATION: If Dr. Sharma verified their baseline report, she remains their doctor)
  const lastVerifiedReport = await reportModel
    .findOne({
      userId,
      verificationStatus: "Verified",
      assignedDoctorId: { $ne: null }
    })
    .sort({ authorizedDate: -1, createdAt: -1 })
    .populate("assignedDoctorId");

  if (
    lastVerifiedReport?.assignedDoctorId &&
    lastVerifiedReport.assignedDoctorId.speciality?.toLowerCase() === normalizedSpecialty &&
    lastVerifiedReport.assignedDoctorId.available
  ) {
    const doc = lastVerifiedReport.assignedDoctorId;
    // Re-populate Redis for the next 24 hours while user is actively reviewing reports
    redisClient.set(cacheKey, String(doc._id), "EX", 86400).catch(() => {});
    return doc;
  }

  // 3. SECONDARY TRUST: Completed appointments within 180 days (6 Months)
  const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);
  const lastAppointment = await appointmentModel
    .findOne({
      userId,
      isCompleted: true,
      date: { $gte: sixMonthsAgo } 
    })
    .sort({ date: -1 });

  if (lastAppointment?.docId) {
    const doc = await doctorModel.findById(lastAppointment.docId);
    if (doc && doc.speciality?.toLowerCase() === normalizedSpecialty && doc.available) {
      redisClient.set(cacheKey, String(doc._id), "EX", 86400).catch(() => {});
      return doc;
    }
  }

  // No continuity match found
  return null;
};
