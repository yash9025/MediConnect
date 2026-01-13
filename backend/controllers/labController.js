import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import reportModel from "../models/reportModel.js";
import { findMatchingDoctors } from "../utils/doctorServices.js";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

// CONFIGURATION
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const analyzeReport = async (req, res) => {
    const localPath = req.file ? req.file.path : null;

    try {
        // 1. Data Extraction
        const userContext = req.body.user_context || "";
        const userId = req.body.userId;

        console.log("Processing analysis for User ID:", userId);

        // 2. Authorization Check
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: "User Not Authorized." 
            });
        }

        // 3. Input Validation
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

        // 4. Process File (PDF)
        if (req.file) {
            // A. Cloudinary Upload
            const cloudResponse = await cloudinary.uploader.upload(localPath, {
                resource_type: "raw", 
                folder: "medical_reports",
                access_mode: "public",
                use_filename: true,
            });

            pdfUrl = cloudResponse.secure_url;
            if (!pdfUrl.endsWith('.pdf')) {
                pdfUrl = pdfUrl + '.pdf';
            }
            pdfContentType = "application/pdf";

            // B. Gemini Preparation
            const pdfBuffer = fs.readFileSync(localPath);
            const base64Data = pdfBuffer.toString("base64");

            const filePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: "application/pdf",
                },
            };

            // C. AI Extraction Logic
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
                contents: [{
                    role: "user",
                    parts: [
                        filePart,
                        { text: "Extract all lab results. Strictly classify status based on reference ranges." },
                    ],
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: extractSchema,
                },
            });

            const rawData = JSON.parse(extractResult.response.text());
            abnormalResults = (rawData.test_results || []).filter(t => t.status !== "NORMAL");
            patientName = rawData.patient_name || "Unknown";
        }

        // 5. Clean Report Handling
        if (abnormalResults.length === 0 && !userContext) {
            return res.json({
                status: "clean",
                message: "No issues found in report and no symptoms provided.",
            });
        }

        // 6. AI Diagnosis and Specialist Recommendation
        const promptText = `
            ACT AS: Senior Chief Medical Officer & Triage Specialist.
            OBJECTIVE: Analyze patient data to recommend the singular most appropriate specialist.
            [ABNORMAL LAB RESULTS]: ${abnormalResults.length > 0 ? JSON.stringify(abnormalResults) : "NONE"}
            [PATIENT SYMPTOMS]: "${userContext || "NONE"}"
            AVAILABLE SPECIALISTS: Endocrinologist, Cardiologist, Hematologist, Gastroenterologist, Neurologist, Gynecologist, Dermatologist, Pediatrician, General Physician.
            OUTPUT JSON: { condition_suspected, urgency, recommended_specialist, reasoning }
        `;

        const doctorSchema = {
            type: SchemaType.OBJECT,
            properties: {
                condition_suspected: { type: SchemaType.STRING },
                urgency: { type: SchemaType.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
                recommended_specialist: { type: SchemaType.STRING },
                reasoning: { type: SchemaType.STRING },
            },
            required: ["condition_suspected", "urgency", "recommended_specialist", "reasoning"],
        };

        const doctorResult = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: doctorSchema,
            },
        });

        const diagnosis = JSON.parse(doctorResult.response.text());

        // 7. Database Matching & Persistence
        const matchedDoctors = await findMatchingDoctors(diagnosis.recommended_specialist);

        const newReport = new reportModel({
            userId,
            patientName,
            pdfUrl,
            pdfContentType,
            criticalData: abnormalResults,
            aiAnalysis: diagnosis,
            matchedDoctorIds: matchedDoctors.map(doc => doc._id),
        });

        await newReport.save();

        // 8. Final Response
        return res.json({
            success: true,
            report_id: newReport._id,
            analysis: diagnosis,
            matched_doctors: matchedDoctors,
        });

    } catch (error) {
        console.error("System Error during report analysis:", error);
        return res.status(500).json({ 
            success: false, 
            error: "Processing failed: " + error.message 
        });
    } finally {
        // Local cleanup of uploaded file
        if (localPath && fs.existsSync(localPath)) {
            try {
                fs.unlinkSync(localPath);
            } catch (cleanupError) {
                console.error("Cleanup Error:", cleanupError);
            }
        }
    }
};