import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import dotenv from "dotenv";
import { MODEL_ROTATION } from "../config/modelRotation.js";

dotenv.config();

// Zod schema for structured output to guarantee deterministic shape
const extractorSchema = z.object({
  isValidBloodReport: z.boolean().describe("True ONLY if the document is a legible medical blood test report. False for receipts, random images, etc."),
  rejectionReason: z.string().optional().describe("If the document is invalid, explain why briefly."),
  anomalies: z.array(z.object({
    biomarker: z.string(),
    value: z.number().nullable().describe("The numeric value of the biomarker. Null if non-numeric."),
    unit: z.string().describe("The unit of measurement (e.g., mg/dL, cells/mcL)"),
    refRange: z.string().describe("The reference range provided in the report"),
    status: z.enum(["High", "Low", "Normal"]).describe("Whether the value is High, Low, or Normal based on reference ranges provided in the report."),
  })).describe("List of biomarkers extracted. Only focus on ones that are present in the report.")
});

const isOverload = (err) => {
  const msg = String(err?.message || "");
  return err?.status === 503 || err?.status === 429 || msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded");
};

async function invokeExtractor(messages) {
  for (let i = 0; i < MODEL_ROTATION.length; i++) {
    try {
      const llm = new ChatGoogleGenerativeAI({
        model: MODEL_ROTATION[i],
        temperature: 0,
        maxOutputTokens: 2048,
        apiKey: process.env.GEMINI_API_KEY,
        maxRetries: 0, // Disable internal backoff
      }).withStructuredOutput(extractorSchema);
      const result = await llm.invoke(messages);
      if (i > 0) console.log(`[Extractor] Succeeded with fallback: ${MODEL_ROTATION[i]}`);
      return result;
    } catch (err) {
      if (isOverload(err) && i < MODEL_ROTATION.length - 1) {
        console.warn(`[Extractor] ${MODEL_ROTATION[i]} overloaded, trying ${MODEL_ROTATION[i + 1]}...`);
        continue;
      }
      throw err;
    }
  }
}

export async function runExtractor(state) {
  console.log("==> Extractor Agent: Processing Input...");
  
  // Edge Case: Handling empty inputs from upstream failures
  if (!state.rawPdfText || state.rawPdfText.trim() === "") {
    console.warn("Extractor Agent received empty text.");
    return {
      isValidBloodReport: false,
      rejectionReason: "No text provided to extractor."
    };
  }

  const systemPrompt = `You are a strict clinical data extractor. Your job is to read raw OCR text from a document and extract blood biomarker data.
CRITICAL INSTRUCTION: You MUST act as an anonymized data extractor. Strip away and ignore all Personally Identifiable Information (PII) such as patient names, ages, phone numbers, genders, addresses, and hospital names. Extract ONLY the structured biomarker values.
If the document is clearly not a blood report (e.g. a grocery receipt, a random photo, blank text), set isValidBloodReport to false.`;

  let response;
  try {
    response = await invokeExtractor([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Document Text:\n${state.rawPdfText}`)
    ]);

    console.log("==> Extractor Agent: Finished extraction.");
    return {
      isValidBloodReport: response.isValidBloodReport,
      rejectionReason: response.rejectionReason || "",
      anomalies: response.anomalies || [],
    };
  } catch (error) {
    // Edge Case: LLM failure, timeout, or safety block
    console.error("Extractor Agent failed to process document:", error);
    return {
      isValidBloodReport: false,
      rejectionReason: "Internal error during data extraction."
    };
  }
}
