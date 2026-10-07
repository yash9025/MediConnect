import reportModel from "../models/reportModel.js";
import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";
import fs from "fs";

/**
 * Handles DPDP Section 12 Right to Erasure / Revocation of Consent
 */
export const requestDataErasure = async (req, res) => {
  try {
    const userId = req.body.userId; 
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    // 1. Check for Active Prescriptions (NMC 3-Year Statutory Hold)
    const recentAppointments = await appointmentModel.find({
      userId,
      isCompleted: true,
      date: { $gte: threeYearsAgo.getTime() }
    });

    const hasLegalHold = recentAppointments.length > 0;

    // 2. Erase or Pseudonymize Reports
    const userReports = await reportModel.find({ userId });

    for (const report of userReports) {
      // Physically delete PDF file from disk (if exists)
      if (report.pdfUrl && fs.existsSync(report.pdfUrl)) {
        try { fs.unlinkSync(report.pdfUrl); } catch (e) { console.error("File delete error", e); }
      }

      if (!hasLegalHold) {
        // Complete Hard Erasure (No Doctor Consultation ever conducted)
        await reportModel.findByIdAndDelete(report._id);
      } else {
        // Statutory Hold: Anonymize & Lock
        report.isRevoked = true;
        report.revokedAt = new Date();
        report.pdfUrl = null; // Raw file destroyed
        report.patientName = "ANONYMIZED_PATIENT";
        report.aiAnalysis = null; // Vector RAG data scrubbed
        report.biomarkers = [];
        
        // Retain only clinical doctor note until statutory expiry
        report.retentionLockUntil = new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000);
        await report.save();
      }
    }

    // Erase or Lock User Account
    if (!hasLegalHold) {
        await userModel.findByIdAndDelete(userId);
    } else {
        await userModel.findByIdAndUpdate(userId, {
            name: "ANONYMIZED",
            email: `erased_${userId}@erased.local`,
            phone: "0000000000",
            address: {},
            dob: "1970-01-01"
        });
    }

    return res.json({
      success: true,
      message: hasLegalHold
        ? "Personal data & report files scrubbed. Clinical doctor notes archived under NMC 3-year statutory compliance."
        : "All personal health data and blood report records have been permanently erased.",
      legalHoldApplied: hasLegalHold,
    });
  } catch (error) {
    console.error("Erasure Error:", error);
    return res.status(500).json({ success: false, message: "Erasure failed" });
  }
};
