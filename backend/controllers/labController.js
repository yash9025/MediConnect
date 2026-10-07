import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { getEmbeddings } from "../config/embeddings.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import reportModel from "../models/reportModel.js";
import doctorModel from "../models/doctorModel.js";
import { findMatchingDoctors } from "../utils/doctorServices.js";
import { getAttendingDoctor } from "../services/continuityService.js";
import { rankDoctorsForPatient } from "../services/doctorRankingService.js";
import { connection as redisClient } from "../config/redis.js";
import * as dotenv from "dotenv";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { traceable } from "langsmith/traceable"; 
import crypto from "crypto";
import { tieredSimilaritySearchWithScore } from "../utils/ragRetriever.js";

import { MODEL_ROTATION } from "../config/modelRotation.js";

dotenv.config();

const CONFIG = {
  PINECONE_INDEX: "mediconnect",
  RAG_K: 5,
  RAG_THRESHOLD: 0.55
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to retry Gemini API calls on 503 / 429 errors rotating through models
const generateWithRetry = async (promptOrConfig) => {
  const isOverload = (err) => {
    const msg = String(err?.message || "");
    return err?.status === 503 || err?.status === 429 || msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded") || msg.includes("Service Unavailable");
  };

  for (const modelName of MODEL_ROTATION) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(promptOrConfig);
        if (modelName !== MODEL_ROTATION[0] || attempt > 0) {
          console.log(`[labController] Succeeded with ${modelName} on attempt ${attempt + 1}`);
        }
        return result;
      } catch (err) {
        const s = err?.status;
        if (s === 503 || s === 429 || isOverload(err)) {
          console.warn(`[labController] ${modelName} overloaded (${s}), retrying attempt ${attempt + 1}/3...`);
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          continue; // Retry same model
        }
        if (s === 404) {
          console.warn(`[labController] ${modelName} not found (404), skipping to next model.`);
          break; // Skip to next model
        }
        console.error(`[labController] FATAL ERROR on ${modelName} (${s}):`, err?.message);
        throw err; // Real error (bad key, etc)
      }
    }
  }
  throw new Error("All models unavailable");
};

const embeddings = getEmbeddings("RETRIEVAL_QUERY");

let vectorStoreInstance = null;

// Singleton pattern to prevent reconnecting to Pinecone on every request
const getVectorStore = async () => {
  if (!vectorStoreInstance) {
    console.log("[INFO] Connecting to Pinecone...");
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const pineconeIndex = pinecone.Index(CONFIG.PINECONE_INDEX);
    vectorStoreInstance = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex });
  }
  return vectorStoreInstance;
};

// Uploads PDF to Cloudinary and uses Gemini to extract structured JSON
const processPdf = traceable(async (filePath) => {
  console.log(`[INFO] Processing PDF: ${filePath}`);
  
  const cloudResponse = await cloudinary.uploader.upload(filePath, {
    resource_type: "raw",
    folder: "medical_reports",
    access_mode: "public",
    use_filename: true,
  });

  const pdfBuffer = await fs.promises.readFile(filePath);
  
  const extractionSchema = {
    description: "Lab Report Extraction",
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
            status: { type: SchemaType.STRING, enum: ["NORMAL", "LOW", "HIGH", "CRITICAL"] },
          },
          required: ["test_name", "value", "status"],
        },
      },
    },
    required: ["test_results"],
  };

  const data = await pdfParse(pdfBuffer);
  const extractedText = data.text;

  const result = await generateWithRetry({
    contents: [{
      role: "user",
      parts: [
        { text: `Raw PDF Text:\n${extractedText}\n\nExtract all lab results. Classify status based on reference ranges.` },
      ],
    }],
    generationConfig: { responseMimeType: "application/json", responseSchema: extractionSchema },
  });

  const parsed = JSON.parse(result.response.text());
  
  return {
    url: cloudResponse.secure_url.endsWith('.pdf') ? cloudResponse.secure_url : `${cloudResponse.secure_url}.pdf`,
    patientName: parsed.patient_name || "Unknown",
    allResults: parsed.test_results || [],
    _debug_tokens: result.response.usageMetadata
  };
}, { name: "Gemini_PDF_Extraction" });

// Uses LLM to generate a medical search query from raw lab results
const expandQueryWithLLM = async (abnormalResults, userSymptoms) => {
  const testSummary = abnormalResults.map(r => `${r.test_name}: ${r.value} (${r.status})`).join(', ');
  const prompt = `Generate a short medical search query (max 50 words) for these lab results: ${testSummary}. ${userSymptoms ? `Symptoms: ${userSymptoms}` : ''}. Return ONLY the query.`;

  try {
    const result = await generateWithRetry(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.warn("[WARN] Query expansion failed, using fallback.");
    return abnormalResults.map(r => `${r.test_name} ${r.status}`).join(' ');
  }
};

const retrieveMedicalContext = async (abnormalResults, userSymptoms, country = "india") => {
  if (!abnormalResults.length && !userSymptoms) return [];

  const expandedQuery = await expandQueryWithLLM(abnormalResults, userSymptoms);
  const selectedCountry = (country || "india").toLowerCase().trim();
  
  // Semantic Caching Strategy (V1) - Scoped by country
  const normalizedQuery = expandedQuery.toLowerCase().trim();
  const cacheKey = `rag_cache:${selectedCountry}:${crypto.createHash('sha256').update(normalizedQuery).digest('hex')}`;
  
  try {
    const cachedContext = await redisClient.get(cacheKey);
    if (cachedContext) {
      console.log(`[INFO] Cache HIT in Redis for RAG context [${selectedCountry}]`);
      return JSON.parse(cachedContext);
    }
  } catch (err) {
    console.warn("[WARN] Redis cache error, proceeding without cache:", err.message);
  }

  try {
    const vectorStore = await getVectorStore();
    
    console.log(`[INFO] Searching Pinecone vector store with tiered country retrieval [${selectedCountry}]...`);
    const finalResults = await tieredSimilaritySearchWithScore(vectorStore, expandedQuery, {
      country: selectedCountry,
      k: CONFIG.RAG_K,
      minThreshold: CONFIG.RAG_THRESHOLD
    });

    const formattedContexts = finalResults.map(([doc]) => ({
      content: doc.pageContent,
      source: path.basename(doc.metadata.source_file || "Guidelines").replace(".pdf", ""),
      category: doc.metadata.category || "General Medicine",
      country: doc.metadata.country || selectedCountry,
      authority: doc.metadata.authority || "Medical Authority"
    }));

    // Store in Redis with a 7-day TTL (604800 seconds)
    try {
      await redisClient.set(cacheKey, JSON.stringify(formattedContexts), 'EX', 604800);
    } catch (err) {
      console.warn("[WARN] Failed to set Redis cache:", err.message);
    }

    return formattedContexts;
  } catch (vectorErr) {
    console.warn("[WARN] Vector search failed, proceeding without RAG context:", vectorErr.message);
    return [];
  }
};

const generateDiagnosis = traceable(async (abnormalResults, symptoms, contexts, availableSpecialties, country = "india") => {
  const selectedCountry = (country || "india").toLowerCase().trim();
  console.log(`[INFO] Generating diagnosis adhering to [${selectedCountry.toUpperCase()}] standards...`);
  const specialistsList = availableSpecialties.join(", ");
  
  const prompt = `
    Role: Senior Medical Advisor.
    Guideline Standards: Adhering strictly to ${selectedCountry.toUpperCase()} clinical guidelines and WHO protocols.
    Constraint: You MUST recommend a specialist ONLY from this list: [${specialistsList}].
    
    Data:
    - Abnormal Labs: ${JSON.stringify(abnormalResults)}
    - Symptoms: ${symptoms || "None"}
    - Guidelines: ${contexts.map(c => `[${(c.country || selectedCountry).toUpperCase()} - ${c.authority || 'Guidelines'} - ${c.source}]: ${c.content}`).join("\n")}

    Output JSON:
    {
      "condition_suspected": "string",
      "urgency": "HIGH/MEDIUM/LOW",
      "recommended_specialist": "string (must match constraint)",
      "reasoning": "string",
      "lifestyle_advice": ["string"],
      "warning_signs": ["string"]
    }
  `;

  const result = await generateWithRetry({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

  const diagnosis = JSON.parse(result.response.text());

  // This extracts the token count from Google's hidden field and attaches it to your output
  diagnosis._debug_tokens = result.response.usageMetadata;

  // Hallucination check
  if (!availableSpecialties.includes(diagnosis.recommended_specialist)) {
    console.warn(`[WARN] Invalid specialist '${diagnosis.recommended_specialist}'. Using fallback.`);
    const fallback = availableSpecialties.find(s => s.toLowerCase().includes("general")) || availableSpecialties[0];
    diagnosis.recommended_specialist = fallback;
  }
  
  return diagnosis;
}, { name: "Gemini_Diagnosis_Gen" });

export const analyzeReport = async (req, res) => {
  const localPath = req.file?.path;
  const { user_context: userSymptoms, country = "india" } = req.body;
  const userId = req.userId;

  try {
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!localPath && !userSymptoms) throw new Error("Provide PDF or symptoms.");

    console.log(`[INFO] Starting analysis for user: ${userId} in region: [${country}]`);

    let extraction = { patientName: "Unknown", url: null, allResults: [] };
    if (localPath) extraction = await processPdf(localPath);

    const abnormalResults = extraction.allResults.filter(t => t.status !== "NORMAL");

    // Early exit if user is healthy and reported no symptoms
    if (abnormalResults.length === 0 && !userSymptoms) {
      if (localPath) fs.unlinkSync(localPath);
      return res.json({ success: true, status: "clean", all_results: extraction.allResults, country_used: country });
    }

    const [availableSpecialties, ragContexts] = await Promise.all([
      doctorModel.distinct('speciality', { available: true }),
      retrieveMedicalContext(abnormalResults, userSymptoms, country)
    ]);

    const diagnosis = await generateDiagnosis(
      abnormalResults, 
      userSymptoms, 
      ragContexts, 
      availableSpecialties.length ? availableSpecialties : ["General Physician"],
      country
    );
    
    const targetSpecialty = diagnosis.recommended_specialist;
    const urgency = diagnosis.urgency || "NORMAL";
    
    // 1. Fetch Candidate Doctors
    const candidateDoctors = await findMatchingDoctors(targetSpecialty);
    
    // 2. Resolve Continuity
    const attendingDoctor = await getAttendingDoctor(userId, targetSpecialty);
    
    // 3. Score & Gate
    let recommendationPayload = {};
    if (attendingDoctor && (urgency === "NORMAL" || urgency === "LOW")) {
      recommendationPayload = {
        continuity_applied: true,
        pinned_doctor: attendingDoctor,
        badge: "Your Care Continuity Specialist",
        reason: "Previously reviewed your clinical baseline and treatment history.",
        matched_doctors: rankDoctorsForPatient({
          doctors: candidateDoctors,
          attendingDoctorId: attendingDoctor._id,
          urgency,
          targetSpecialty
        })
      };
    } else if (attendingDoctor && (urgency === "CRITICAL" || urgency === "HIGH")) {
      const attendingWaitMinutes = attendingDoctor.estimatedWaitMinutes || 60; // Assuming 60 mins fallback
      if (attendingWaitMinutes <= 45) {
        recommendationPayload = {
          continuity_applied: true,
          pinned_doctor: attendingDoctor,
          badge: "Emergency Priority (Your Regular Doctor)",
          matched_doctors: rankDoctorsForPatient({
            doctors: candidateDoctors,
            attendingDoctorId: attendingDoctor._id,
            urgency,
            targetSpecialty
          })
        };
      } else {
        const ranked = rankDoctorsForPatient({
          doctors: candidateDoctors,
          attendingDoctorId: attendingDoctor._id,
          urgency,
          targetSpecialty
        });
        recommendationPayload = {
          continuity_applied: false,
          triage_override: true,
          override_reason: `High clinical acuity detected. Dr. ${attendingDoctor.name} is not immediately available; routed to the earliest on-duty specialist.`,
          previous_doctor_notified: attendingDoctor.name,
          matched_doctors: ranked
        };
      }
    } else {
      recommendationPayload = {
        continuity_applied: false,
        matched_doctors: rankDoctorsForPatient({
          doctors: candidateDoctors,
          urgency,
          targetSpecialty
        })
      };
    }

    const newReport = await reportModel.create({
      userId,
      patientName: extraction.patientName,
      pdfUrl: extraction.url,
      pdfContentType: "application/pdf",
      criticalData: abnormalResults,
      allResults: extraction.allResults,
      aiAnalysis: { ...diagnosis, ragSourcesUsed: ragContexts.map(c => c.source), countryUsed: country },
      matchedDoctorIds: recommendationPayload.matched_doctors.map(d => d._id),
    });

    res.json({
      success: true,
      report_id: newReport._id,
      analysis: diagnosis,
      ...recommendationPayload,
      rag_sources: ragContexts.map(c => ({ 
        source: c.source, 
        category: c.category, 
        country: c.country, 
        authority: c.authority 
      })),
      country_used: country,
    });

  } catch (error) {
    console.error("[ERROR] Analysis Failed:", error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // Ensure temp file is deleted even if analysis fails
    if (localPath && fs.existsSync(localPath)) {
      try { fs.unlinkSync(localPath); } catch (e) { console.error("[WARN] Cleanup failed:", e.message); }
    }
  }
};

/**
 * GET /api/lab/user-reports
 * Retrieves all analyzed reports for the authenticated user.
 */
export const getUserReports = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }
    const reports = await reportModel.find({ userId }).sort({ createdAt: -1 });
    return res.json({ success: true, reports });
  } catch (error) {
    console.error("[ERROR] getUserReports failed:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};