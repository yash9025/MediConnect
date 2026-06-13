import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import dotenv from "dotenv";

dotenv.config();

// Zod schema for structured output to guarantee deterministic shape
const extractorSchema = z.object({
  isValidBloodReport: z.boolean().describe("True ONLY if the document is a legible medical blood test report. False for receipts, random images, etc."),
  rejectionReason: z.string().optional().describe("If the document is invalid, explain why briefly."),
  anomalies: z.array(z.object({
    biomarker: z.string(),
    value: z.string().describe("The extracted value of the biomarker"),
    status: z.enum(["High", "Low", "Normal"]).describe("Whether the value is High, Low, or Normal based on reference ranges provided in the report."),
  })).describe("List of biomarkers extracted. Only focus on ones that are present in the report.")
});

// Initialize Gemini with structured output
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0,
  maxOutputTokens: 2048,
  apiKey: process.env.GEMINI_API_KEY,
}).withStructuredOutput(extractorSchema);

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

  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Document Text:\n${state.rawPdfText}`)
    ]);

    console.log("==> Extractor Agent: Finished extraction.");
    // Return the fields to update the GraphState
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
