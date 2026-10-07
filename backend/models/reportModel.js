import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    patientName: { type: String },
    pdfUrl: { type: String },

    // AI Data
    aiAnalysis: { type: Object }, // The Gemini Result
    biomarkers: [{
      name: String,       
      value: Number,      
      unit: String,       
      refRange: String,   
      status: String      
    }],
    previousReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "report",
      default: null,
    },

    // Authorization Fields
    verificationStatus: {
      type: String,
      enum: ["Not Requested", "Pending", "Verified"],
      default: "Not Requested",
    },
    assignedDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "doctor",
      default: null,
    },
    doctorNotes: { type: String, default: "" }, // The precaution/advice
    authorizedDate: { type: Date },
    
    // DPDP Phase 2 & 4 Fields
    dpdpConsent: {
      consentGiven: { type: Boolean, default: false },
      timestamp: { type: Date },
      version: { type: String },
      ipAddress: { type: String }
    },
    isRevoked: { type: Boolean, default: false }, // For Section 12 Right to Erasure
    retentionLockUntil: { type: Date, default: null }, // For NMC 3-Year Statutory Hold
  },
  { timestamps: true }
);

const reportModel =
  mongoose.models.report || mongoose.model("report", reportSchema);
export default reportModel;