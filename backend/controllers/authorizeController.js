import reportModel from "../models/reportModel.js";
import userModel from "../models/userModel.js";
import nodemailer from "nodemailer";

// 1. User Requests Verification
const requestVerification = async (req, res) => {
  try {
    const { reportId, doctorId } = req.body;

    if (!reportId || !doctorId) {
      return res.status(400).json({ success: false, message: "Missing Report ID or Doctor ID" });
    }

    await reportModel.findByIdAndUpdate(reportId, {
      verificationStatus: "Pending",
      assignedDoctorId: doctorId,
    });

    res.json({ success: true, message: "Sent to doctor for authorization." });

  } catch (error) {
    console.error("Request Verification Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Doctor Fetches Pending Reports (For Doctor Panel)
const getPendingReports = async (req, res) => {
  try {
    const { docId } = req.body;

    if (!docId) {
      return res.status(400).json({ success: false, message: "Doctor ID is required" });
    }

    const reports = await reportModel
      .find({
        assignedDoctorId: docId,
        verificationStatus: "Pending",
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, reports });

  } catch (error) {
    console.error("Fetch Reports Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Doctor Verifies & Sends Email
const verifyReport = async (req, res) => {
  try {
    const { reportId, doctorNotes } = req.body;

    if (!reportId || !doctorNotes) {
      return res.status(400).json({ success: false, message: "Details missing." });
    }

    const report = await reportModel.findById(reportId);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found." });
    }

    const user = await userModel.findById(report.userId);
    if (!user || !user.email) {
      return res.status(400).json({
        success: false,
        message: "Patient email not found. Cannot verify because notification is required.",
      });
    }

    // --- Email Logic ---
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 10000,
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Medical Report Verified - MediConnect`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; max-width: 600px; color: #374151;">
            <h2 style="color: #059669;">Report Verified</h2>
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>Your medical report has been reviewed by our expert. Please find the summary below:</p>
            <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <strong style="color: #166534; font-size: 16px;">🩺 Doctor's Advice:</strong>
                <p style="color: #14532d; line-height: 1.6; margin-top: 10px;">${doctorNotes}</p>
            </div>
            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
                MediConnect Automated Notification.
            </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Database Update (Only if Email Succeeds) 
    await reportModel.findByIdAndUpdate(
      reportId,
      {
        verificationStatus: "Verified",
        doctorNotes: doctorNotes,
        authorizedDate: new Date(),
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Email sent successfully and report marked as verified!",
    });

  } catch (error) {
    console.error("Verification/Email Error:", error);
    res.status(500).json({
      success: false,
      message: `Action failed: ${error.message || "Internal Server Error"}. Report NOT verified.`,
    });
  }
};

export { requestVerification, getPendingReports, verifyReport };