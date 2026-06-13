import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import dotenv from "dotenv";

dotenv.config();

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.7, // Higher for varied, empathetic language
  maxOutputTokens: 2048,
  apiKey: process.env.GEMINI_API_KEY,
});

export async function runLifestyleCoach(state) {
  console.log("==> Lifestyle Agent: Generating holistic advice...");
  
  if (state.anomalies.length === 0) {
    return { lifestyleData: "Maintain current healthy lifestyle, balanced diet, and regular exercise." };
  }

  const systemPrompt = `You are an empathetic, layman-friendly holistic health and lifestyle coach. 
Based on the patient's blood report anomalies, provide actionable, simple, and encouraging dietary and lifestyle recommendations. 
Avoid complex medical jargon. Always add a short disclaimer at the bottom to consult a licensed medical professional.`;
  
  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Patient Anomalies: ${JSON.stringify(state.anomalies)}`)
    ]);
    
    console.log("==> Lifestyle Agent: Finished generating advice.");
    return { lifestyleData: response.content };
  } catch (error) {
    console.error("Lifestyle Agent failed:", error);
    return { lifestyleData: "Error generating lifestyle advice." };
  }
}
