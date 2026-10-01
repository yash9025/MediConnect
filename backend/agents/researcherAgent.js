import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { getEmbeddings } from "../config/embeddings.js";
import { tieredSimilaritySearchWithScore } from "../utils/ragRetriever.js";
import dotenv from "dotenv";

dotenv.config();

// Managed cloud embedding for queries (768-dim, low-latency, 0MB RAM)
const queryEmbeddings = getEmbeddings("RETRIEVAL_QUERY");

let cachedVectorStore = null;

async function getVectorStore() {
  if (cachedVectorStore) return cachedVectorStore;
  if (!process.env.PINECONE_API_KEY) {
    throw new Error("[FATAL] Missing PINECONE_API_KEY");
  }

  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const pineconeIndex = pinecone.Index("mediconnect");

  cachedVectorStore = await PineconeStore.fromExistingIndex(queryEmbeddings, {
    pineconeIndex: pineconeIndex,
  });

  return cachedVectorStore;
}

const llm = new ChatGoogleGenerativeAI({
  model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  temperature: 0.1,
  maxOutputTokens: 2048,
  apiKey: process.env.GEMINI_API_KEY,
});

async function queryVectorDB(anomaly, country = "india") {
  const vectorStore = await getVectorStore();
  
  const queryStr = `Treatment and protocols for ${anomaly.status} ${anomaly.biomarker}`;
  const scoredResults = await tieredSimilaritySearchWithScore(vectorStore, queryStr, { 
    country, 
    k: 3,
    minThreshold: 0.55,
    fallbackThreshold: 0.50
  });
  
  if (scoredResults.length === 0) {
      return `[WARNING: NO_GUIDELINE_FOUND] No official clinical guidelines passed the confidence threshold for ${anomaly.status} ${anomaly.biomarker}. Advise physical physician examination.`;
  }
  
  return scoredResults.map(([doc, score], idx) => {
    const meta = doc.metadata || {};
    const confidencePct = (score * 100).toFixed(1);
    const sourceHeader = `[Source ${idx+1}: ${(meta.country || country).toUpperCase()} (${meta.authority || 'WHO'}) | Confidence: ${confidencePct}% | Section: ${(meta.section_type || 'General').toUpperCase()}]`;
    return `${sourceHeader}\n${doc.pageContent}`;
  }).join("\n\n");
}

export async function runResearcher(state) {
  const country = state.country || "india";
  console.log(`==> Researcher Agent: Querying Scored RAG Knowledge Base for [${country.toUpperCase()}]...`);
  
  if (state.anomalies.length === 0) {
    return { researchData: "No anomalies detected. No specific guidelines required." };
  }

  // 1. Gather context from Vector DB for all anomalies with scored tiered country search
  const ragContexts = await Promise.all(state.anomalies.map(async (anomaly) => {
    const context = await queryVectorDB(anomaly, country);
    return `--- Context for ${anomaly.biomarker} ---\n${context}`;
  }));

  const systemPrompt = `You are a certified Clinical Research Specialist adhering strictly to evidence-based medicine.
Analyze the provided RAG guideline sources and summarize clinical protocols for the patient's detected anomalies adhering strictly to ${country.toUpperCase()} clinical standards and WHO protocols.

STRICT CLINICAL SAFETY RULES:
1. ONLY utilize facts, dosages, and contraindications directly present in the provided RAG Context.
2. If the context for any anomaly contains [WARNING: NO_GUIDELINE_FOUND], you MUST explicitly state: "No validated clinical guideline was retrieved with sufficient confidence for this anomaly; clinical management deferred to attending physician."
3. Under NO circumstances should you fabricate drug dosages, titrations, or clinical claims not present in the sources.
4. Conclude your response with an explicit "Evidence Sources" section listing each guideline, authority, and confidence percentage.`;
  
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
