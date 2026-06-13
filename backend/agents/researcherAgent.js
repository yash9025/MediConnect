import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import dotenv from "dotenv";

dotenv.config();

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.1,
  maxOutputTokens: 2048,
  apiKey: process.env.GEMINI_API_KEY,
});

// Mocking the Vector DB connection for Phase 3
async function mockQueryVectorDB(anomaly) {
  // In production, this would be: await pineconeIndex.query({ vector, topK: 3 })
  return `MoHFW Guideline (2024): For ${anomaly.status} ${anomaly.biomarker}, standard care involves immediate consultation if values deviate by > 20% from baseline. Recommend dietary changes and continuous monitoring.`;
}

export async function runResearcher(state) {
  console.log("==> Researcher Agent: Querying RAG Knowledge Base...");
  
  if (state.anomalies.length === 0) {
    return { researchData: "No anomalies detected. No specific MoHFW guidelines required." };
  }

  // 1. Gather context from Vector DB for all anomalies
  const ragContexts = await Promise.all(state.anomalies.map(async (anomaly) => {
    return await mockQueryVectorDB(anomaly);
  }));

  const systemPrompt = `You are a strict Medical Clinical Researcher. Using ONLY the provided context from the Ministry of Health and Family Welfare (MoHFW) guidelines, summarize the clinical protocol for the patient's anomalies. Do NOT hallucinate external information.
At the end of your response, always cite the guidelines used.`;
  
  const userMessage = `
    Anomalies Detected: ${JSON.stringify(state.anomalies)}
    RAG Context: ${ragContexts.join("\n")}
  `;

  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userMessage)
    ]);
    
    console.log("==> Researcher Agent: Finished compiling research.");
    return { researchData: response.content };
  } catch (error) {
    console.error("Researcher Agent failed:", error);
    return { researchData: "Error retrieving clinical research." };
  }
}
