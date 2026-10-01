import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import dotenv from "dotenv";

import { tieredSimilaritySearch } from "../utils/ragRetriever.js";

dotenv.config();

const llm = new ChatGoogleGenerativeAI({
  model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  temperature: 0.1,
  maxOutputTokens: 1024,
  apiKey: process.env.GEMINI_API_KEY,
});

const embeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: process.env.HF_API_KEY,
  model: "sentence-transformers/all-mpnet-base-v2",
});

async function querySpecialistGuidelines(domain, anomalies, country = "india") {
  try {
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const pineconeIndex = pinecone.Index("mediconnect");
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex });
    
    // Construct search query
    const query = `Guidelines for ${anomalies.map(a => `${a.test_name} ${a.status}`).join(', ')}`;
    
    // Tiered query: prioritize country guidelines, fallback to WHO global
    const results = await tieredSimilaritySearch(vectorStore, query, {
      country,
      k: 3,
      domain
    });
    
    if (results.length === 0) return "No specific guidelines retrieved.";
    return results.map(r => `[${(r.metadata.country || country).toUpperCase()} - ${r.metadata.authority || 'Guidelines'} - ${r.metadata.source_file}]: ${r.pageContent}`).join('\n\n');
  } catch (error) {
    console.error(`[WARN] Failed to query Pinecone for ${domain}:`, error);
    return "No specific guidelines retrieved.";
  }
}

// Higher-order function to create a specialist agent function dynamically
export function createSpecialistAgent(domain) {
  return async function runSpecialist(state) {
    const country = state.country || "india";
    console.log(`[${domain} Agent] Searching vector database for clinical protocols in [${country.toUpperCase()}]...`);
    
    // 1. Fetch domain-specific guidelines from Vector DB
    const guidelines = await querySpecialistGuidelines(domain, state.anomalies, country);
    
    // 2. Generate specialized advice
    const systemPrompt = `You are a Senior ${domain} Specialist.
Using the provided medical guidelines (prioritizing ${country.toUpperCase()} clinical standards and WHO protocols), evaluate the patient's abnormal lab results and provide a specialized diagnosis and treatment plan.
Do NOT hallucinate information outside the provided guidelines. Keep your response concise and structured.`;

    const userMessage = `
      Abnormal Labs: ${JSON.stringify(state.anomalies)}
      Retrieved Guidelines: ${guidelines}
    `;

    try {
      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userMessage)
      ]);
      
      const report = { domain, findings: response.content };
      return { specialistReports: [report] }; // Return array to match reducer
    } catch (error) {
      console.error(`[${domain} Agent] failed:`, error);
      return { specialistReports: [{ domain, findings: "Error generating report." }] };
    }
  };
}
