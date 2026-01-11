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
            return res.status(400).json({ success: false, message: "Details missing." });
        }

        // 1. Fetch Report and User details first (DO NOT update yet)
        const report = await reportModel.findById(reportId);
        if (!report) {
            return res.status(404).json({ success: false, message: "Report not found." });
        }

        const user = await userModel.findById(report.userId);
        if (!user || !user.email) {
            // If there's no email, we cannot fulfill the "mail must be successful" rule
            return res.status(400).json({ 
                success: false, 
                message: "Patient email not found. Cannot verify because notification is required." 
            });
        }

        // 2. Attempt Email Logic FIRST
        // We do this before updating the database.
        const transporter = nodemailer.createTransport({
            service: 'gmail', 
            auth: { 
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS 
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: `Medical Report Verified - MediConnect`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #2563eb;">Report Verified</h2>
                    <p>Hello <strong>${user.name}</strong>, your report has been reviewed by our expert.</p>
                    <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin: 10px 0;">
                        <strong>Doctor's Advice:</strong>
                        <p>${doctorNotes}</p>
                    </div>
                </div>
            `
        };

        // This line will throw an error if the email fails (e.g., auth error, network error)
        await transporter.sendMail(mailOptions);

        // 3. ONLY if the code reaches here (Email Success), update the Database
        const updatedReport = await reportModel.findByIdAndUpdate(reportId, {
            verificationStatus: "Verified",
            doctorNotes: doctorNotes, 
            authorizedDate: new Date()
        }, { new: true });

        res.json({ 
            success: true, 
            message: "Email sent successfully and report marked as verified!" 
        });

    } catch (error) {
        console.error("Verification/Email Error:", error);
        
        // If an error occurs (like email failure), the DB update never happens.
        // We return a 500 error so the Frontend knows to keep the report in the 'Pending' list.
        res.status(500).json({ 
            success: false, 
            message: `Action failed: ${error.message || "Internal Server Error"}. The report has NOT been verified.` 
        });
    }
};