import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import dotenv from "dotenv";

dotenv.config();

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0,
  maxOutputTokens: 500,
  apiKey: process.env.GEMINI_API_KEY,
});

export async function runTriage(state) {
  console.log("==> Triage Agent: Analyzing anomalies for specialist routing...");
  
  if (!state.anomalies || state.anomalies.length === 0) {
    return { requiredSpecialists: ["General Medicine"] };
  }

  const systemPrompt = `You are a Medical Triage Router. Based on the patient's abnormal lab results, determine which specialist medical domains are required for consultation.
Available Domains: Cardiology, Endocrinology, Nephrology, Gastroenterology, Dermatology, Pulmonology, Hematology, Infectious Disease, General Medicine.

Rules:
1. Return ONLY a JSON array of string domain names.
2. Example output: ["Cardiology", "Hematology"]
3. If no specific specialist fits perfectly, return ["General Medicine"].
4. Do not return more than 3 specialties to keep the pipeline efficient.`;

  const userMessage = `Anomalies: ${JSON.stringify(state.anomalies)}`;

  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userMessage)
    ]);
    
    const content = response.content.trim().replace(/```json/g, '').replace(/```/g, '');
    const requiredSpecialists = JSON.parse(content);
    
    console.log(`==> Triage Agent: Routing to -> ${requiredSpecialists.join(', ')}`);
    return { requiredSpecialists };
  } catch (error) {
    console.error("Triage Agent failed:", error);
    return { requiredSpecialists: ["General Medicine"] };
  }
}
