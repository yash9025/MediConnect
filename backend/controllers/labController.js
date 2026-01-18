import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import reportModel from "../models/reportModel.js";
import doctorModel from "../models/doctorModel.js";
import { findMatchingDoctors } from "../utils/doctorServices.js";
import * as dotenv from "dotenv";

dotenv.config();

const CONFIG = {
  PINECONE_INDEX: "mediconnect",
  EMBEDDING_MODEL: "sentence-transformers/all-mpnet-base-v2",
  RAG_K: 8,
  RAG_THRESHOLD: 0.35
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const embeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: process.env.HF_API_KEY,
  model: CONFIG.EMBEDDING_MODEL,
});

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
const processPdf = async (filePath) => {
  console.log(`[INFO] Processing PDF: ${filePath}`);
  
  const cloudResponse = await cloudinary.uploader.upload(filePath, {
    resource_type: "raw",
    folder: "medical_reports",
    access_mode: "public",
    use_filename: true,
  });

  const pdfBuffer = await fs.promises.readFile(filePath);
  
  // Enforce structured output from Gemini
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

  const result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [
        { inlineData: { data: pdfBuffer.toString("base64"), mimeType: "application/pdf" } },
        { text: "Extract all lab results. Classify status based on reference ranges." },
      ],
    }],
    generationConfig: { responseMimeType: "application/json", responseSchema: extractionSchema },
  });

  const parsed = JSON.parse(result.response.text());
  
  return {
    url: cloudResponse.secure_url.endsWith('.pdf') ? cloudResponse.secure_url : `${cloudResponse.secure_url}.pdf`,
    patientName: parsed.patient_name || "Unknown",
    allResults: parsed.test_results || []
  };
};

// Uses LLM to generate a medical search query from raw lab results
const expandQueryWithLLM = async (abnormalResults, userSymptoms) => {
  const testSummary = abnormalResults.map(r => `${r.test_name}: ${r.value} (${r.status})`).join(', ');
  const prompt = `Generate a short medical search query (max 50 words) for these lab results: ${testSummary}. ${userSymptoms ? `Symptoms: ${userSymptoms}` : ''}. Return ONLY the query.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.warn("[WARN] Query expansion failed, using fallback.");
    return abnormalResults.map(r => `${r.test_name} ${r.status}`).join(' ');
  }
};

const retrieveMedicalContext = async (abnormalResults, userSymptoms) => {
  if (!abnormalResults.length && !userSymptoms) return [];

  const expandedQuery = await expandQueryWithLLM(abnormalResults, userSymptoms);
  const vectorStore = await getVectorStore();
  
  console.log("[INFO] Searching vector store...");
  const results = await vectorStore.similaritySearchWithScore(expandedQuery, CONFIG.RAG_K);
  
  // Filter out low relevance matches to reduce noise
  const filtered = results.filter(([_, score]) => score >= CONFIG.RAG_THRESHOLD);
  const finalResults = filtered.length > 0 ? filtered.slice(0, 5) : results.slice(0, 3);

  return finalResults.map(([doc]) => ({
    content: doc.pageContent,
    source: path.basename(doc.metadata.source_file || "Guidelines").replace(".pdf", ""),
    category: doc.metadata.category || "General Medicine"
  }));
};

const generateDiagnosis = async (abnormalResults, symptoms, contexts, availableSpecialties) => {
  console.log("[INFO] Generating diagnosis...");
  const specialistsList = availableSpecialties.join(", ");
  
  const prompt = `
    Role: Senior Medical Advisor.
    Constraint: You MUST recommend a specialist ONLY from this list: [${specialistsList}].
    
    Data:
    - Abnormal Labs: ${JSON.stringify(abnormalResults)}
    - Symptoms: ${symptoms || "None"}
    - Guidelines: ${contexts.map(c => `[${c.source}]: ${c.content}`).join("\n")}

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

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

  const diagnosis = JSON.parse(result.response.text());

  // Hallucination check: Force fallback if LLM recommends a specialist not in DB
  if (!availableSpecialties.includes(diagnosis.recommended_specialist)) {
    console.warn(`[WARN] Invalid specialist '${diagnosis.recommended_specialist}'. Using fallback.`);
    const fallback = availableSpecialties.find(s => s.toLowerCase().includes("general")) || availableSpecialties[0];
    diagnosis.recommended_specialist = fallback;
  }
  
  return diagnosis;
};

export const analyzeReport = async (req, res) => {
  const localPath = req.file?.path;
  const { user_context: userSymptoms } = req.body;
  const userId = req.userId;

  try {
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!localPath && !userSymptoms) throw new Error("Provide PDF or symptoms.");

    console.log(`[INFO] Starting analysis for user: ${userId}`);

    let extraction = { patientName: "Unknown", url: null, allResults: [] };
    if (localPath) extraction = await processPdf(localPath);

    const abnormalResults = extraction.allResults.filter(t => t.status !== "NORMAL");

    // Early exit if user is healthy and reported no symptoms
    if (abnormalResults.length === 0 && !userSymptoms) {
      if (localPath) fs.unlinkSync(localPath);
      return res.json({ success: true, status: "clean", all_results: extraction.allResults });
    }

    const [availableSpecialties, ragContexts] = await Promise.all([
      doctorModel.distinct('speciality', { available: true }),
      retrieveMedicalContext(abnormalResults, userSymptoms)
    ]);

    const diagnosis = await generateDiagnosis(
      abnormalResults, 
      userSymptoms, 
      ragContexts, 
      availableSpecialties.length ? availableSpecialties : ["General Physician"]
    );
    
    const matchedDoctors = await findMatchingDoctors(diagnosis.recommended_specialist);

    const newReport = await reportModel.create({
      userId,
      patientName: extraction.patientName,
      pdfUrl: extraction.url,
      pdfContentType: "application/pdf",
      criticalData: abnormalResults,
      allResults: extraction.allResults,
      aiAnalysis: { ...diagnosis, ragSourcesUsed: ragContexts.map(c => c.source) },
      matchedDoctorIds: matchedDoctors.map(d => d._id),
    });

    res.json({
      success: true,
      report_id: newReport._id,
      analysis: diagnosis,
      matched_doctors: matchedDoctors,
      rag_sources: ragContexts.map(c => ({ source: c.source, category: c.category })),
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