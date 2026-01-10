import reportModel from "../models/reportModel.js";
import userModel from "../models/userModel.js"; 
import nodemailer from "nodemailer";

// 1. User Requests Verification
export const requestVerification = async (req, res) => {
  try {
    const { reportId, doctorId } = req.body;

    if (!reportId || !doctorId) {
      return res.status(400).json({ success: false, message: "Missing Report ID or Doctor ID" });
    }

    await reportModel.findByIdAndUpdate(reportId, {
      verificationStatus: "Pending",
      assignedDoctorId: doctorId
    });

    res.json({ success: true, message: "Sent to doctor for authorization." });

  } catch (error) {
    console.error("Request Verification Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Doctor Fetches Pending Reports (For Doctor Panel)
export const getPendingReports = async (req, res) => {
  try {
    const { docId } = req.body; 

    if (!docId) {
      return res.status(400).json({ success: false, message: "Doctor ID is required" });
    }

    // Find pending reports assigned to this doctor, sorted by newest first
    const reports = await reportModel.find({ 
      assignedDoctorId: docId, 
      verificationStatus: "Pending" 
    }).sort({ createdAt: -1 });

    res.json({ success: true, reports });

  } catch (error) {
    console.error("Fetch Reports Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Doctor Verifies & Sends Email
export const verifyReport = async (req, res) => {
  try {
    const { reportId, doctorNotes } = req.body;

    if (!reportId || !doctorNotes) {
        return res.status(400).json({ success: false, message: "Report ID and Doctor Notes are required." });
    }

    // A. Update Database
    const report = await reportModel.findByIdAndUpdate(reportId, {
      verificationStatus: "Verified",
      doctorNotes: doctorNotes, 
      authorizedDate: new Date()
    }, { new: true });

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    // B. Get User Email
    const user = await userModel.findById(report.userId);

    if (!user) {
      return res.json({ success: true, message: "Report verified, but User email not found." });
    }

    // C. Send Email (Nodemailer) - Clean HTML
    const transporter = nodemailer.createTransport({
      service: 'gmail', 
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Medical Report Verified - MediConnect`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669; text-align: center;">MediConnect Verification</h2>
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>Your lab report has been reviewed and authorized by an expert doctor.</p>
            
            <div style="background-color: #f0fdf4; padding: 15px; border-left: 4px solid #059669; margin: 20px 0; border-radius: 4px;">
                <h4 style="margin: 0 0 10px; color: #064e3b;">Doctor's Advice:</h4>
                <p style="margin: 0; font-style: italic; color: #374151;">"${doctorNotes}"</p>
            </div>

            <p>You can view the full authorized report on your dashboard.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #6b7280; text-align: center;">Stay Healthy,<br/>Team MediConnect</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "Report Verified & Patient Notified!" });

  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};