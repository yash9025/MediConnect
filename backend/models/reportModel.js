import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  patientName: { type: String },
  pdfUrl: { type: String }, 
  
  // AI Data
  aiAnalysis: { type: Object }, // The Gemini Result

  // NEW: Authorization Fields
  verificationStatus: { 
    type: String, 
    enum: ["Not Requested", "Pending", "Verified"], 
    default: "Not Requested" 
  },
  assignedDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'doctor', default: null },
  doctorNotes: { type: String, default: "" }, // The precaution/advice
  authorizedDate: { type: Date }

}, { timestamps: true });

const reportModel = mongoose.models.report || mongoose.model("report", reportSchema);
export default reportModel;