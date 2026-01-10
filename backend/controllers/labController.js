import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import reportModel from "../models/reportModel.js";
import { findMatchingDoctors } from "../utils/doctorServices.js";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary"; 

// CONFIGURATION
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const analyzeReport = async (req, res) => {
  try {
    // 1. Get Data
    const userContext = req.body.user_context || "";
    const userId = req.body.userId;

    // 🔍 DEBUG
    console.log("Analyzing for User ID:", userId);

    // 2. SAFETY CHECK: User Validation
    if (!userId) {
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(401).json({ success: false, message: "User Not Authorized." });
    }

    // 3. INPUT VALIDATION
    if (!req.file && !userContext) {
      return res.status(400).json({
        success: false,
        message: "Please provide either a Lab Report PDF or describe your symptoms.",
      });
    }

    // Initialize variables
    let abnormalResults = [];
    let patientName = "Unknown";
    let pdfUrl = "N/A";
    let pdfContentType = "text/plain";
    let rawData = {};

    // 4. PROCESS PDF
    if (req.file) {
      const localPath = req.file.path; 

      try {
        // ✅ A. UPLOAD TO CLOUDINARY (FIXED VERSION)
        console.log("Uploading to Cloudinary...");
        
        const cloudResponse = await cloudinary.uploader.upload(localPath, {
          resource_type: "raw",       // 👈 STRICTLY 'raw'. Prevents image processing corruption.
          folder: "medical_reports",
          access_mode: "public",      // 👈 Forces file to be public
          use_filename: true          // 👈 Keeps the original filename (e.g., report.pdf)
        });

        pdfUrl = cloudResponse.secure_url; 
        // 🛠️ Safety fix: Ensure URL ends in .pdf for browsers
        if (!pdfUrl.endsWith('.pdf')) {
            pdfUrl = pdfUrl + '.pdf';
        }

        pdfContentType = "application/pdf";
        console.log("Cloudinary Upload Success:", pdfUrl);

        // ✅ B. PREPARE FOR GEMINI
        const pdfBuffer = fs.readFileSync(localPath);
        const base64Data = pdfBuffer.toString("base64");

        const filePart = {
          inlineData: {
            data: base64Data,
            mimeType: "application/pdf", // Force mimetype to avoid confusion
          },
        };

        // ✅ C. AI EXTRACTION
        const extractSchema = {
          description: "Medical Report Data",
          type: SchemaType.OBJECT,
          properties: {
            patient_name: { type: SchemaType.STRING },
            test_results: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  test_name: { type: SchemaType.STRING },
                  value: { type: SchemaType.NUMBER },
                  unit: { type: SchemaType.STRING },
                  status: {
                    type: SchemaType.STRING,
                    enum: ["NORMAL", "LOW", "HIGH", "CRITICAL"],
                  },
                },
                required: ["test_name", "value", "status"],
              },
            },
          },
          required: ["test_results"],
        };

        const extractResult = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                filePart,
                { text: "Extract all lab results. Strictly classify status based on reference ranges." },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: extractSchema,
          },
        });

        rawData = JSON.parse(extractResult.response.text());
        abnormalResults = (rawData.test_results || []).filter(
          (t) => t.status !== "NORMAL"
        );
        patientName = rawData.patient_name || "Unknown";

      } catch (fileError) {
        console.error("File Processing Error:", fileError);
        throw new Error("Failed to process or upload document.");
      } finally {
        // ✅ D. CLEANUP
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      }
    }

    // 5. AI DOCTOR LOGIC
    if (abnormalResults.length === 0 && !userContext) {
      return res.json({
        status: "clean",
        message: "No issues found in report and no symptoms provided.",
      });
    }

    const promptText = `
      ACT AS: Senior Chief Medical Officer & Triage Specialist.
      OBJECTIVE: Analyze patient data to recommend the singular most appropriate specialist.

      [ABNORMAL LAB RESULTS]: ${
        abnormalResults.length > 0
          ? JSON.stringify(abnormalResults)
          : "NONE / NORMAL"
      }
      [PATIENT SYMPTOMS]: "${userContext || "NONE"}"

      AVAILABLE SPECIALISTS:
      1. Endocrinologist 2. Cardiologist 3. Hematologist 4. Gastroenterologist 
      5. Neurologist 6. Gynecologist 7. Dermatologist 8. Pediatrician 9. General Physician 10. External Referral

      OUTPUT JSON keys: condition_suspected, urgency, recommended_specialist, reasoning.
    `;

    const doctorSchema = {
      description: "Diagnosis",
      type: SchemaType.OBJECT,
      properties: {
        condition_suspected: { type: SchemaType.STRING },
        urgency: { type: SchemaType.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
        recommended_specialist: { type: SchemaType.STRING },
        reasoning: { type: SchemaType.STRING },
      },
      required: [
        "condition_suspected",
        "urgency",
        "recommended_specialist",
        "reasoning",
      ],
    };

    const doctorResult = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: doctorSchema,
      },
    });
    const diagnosis = JSON.parse(doctorResult.response.text());

    // 6. DATABASE MATCHING & SAVING
    const matchedDoctors = await findMatchingDoctors(
      diagnosis.recommended_specialist
    );

    const newReport = new reportModel({
      userId: userId,
      patientName: patientName,
      pdfUrl: pdfUrl,
      pdfContentType: pdfContentType,
      criticalData: abnormalResults,
      aiAnalysis: diagnosis,
      matchedDoctorIds: matchedDoctors.map((doc) => doc._id),
    });

    await newReport.save();

    res.json({
      success: true,
      report_id: newReport._id,
      analysis: diagnosis,
      matched_doctors: matchedDoctors,
    });
  } catch (error) {
    console.error("System Error:", error);
    res.status(500).json({ success: false, error: "Processing failed: " + error.message });
  }
};