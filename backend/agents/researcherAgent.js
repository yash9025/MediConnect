import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import dotenv from "dotenv";

dotenv.config();

const embeddings = new HuggingFaceTransformersEmbeddings({
    model: "Xenova/all-mpnet-base-v2",
});

const llm = new ChatGoogleGenerativeAI({
  model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
  temperature: 0.1,
  maxOutputTokens: 2048,
  apiKey: process.env.GEMINI_API_KEY,
});

async function queryVectorDB(anomaly) {
  if (!process.env.PINECONE_API_KEY) throw new Error("Missing PINECONE_API_KEY");
  
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const pineconeIndex = pinecone.Index("mediconnect");
  
  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: pineconeIndex,
  });
  
  const queryStr = `Treatment and protocols for ${anomaly.status} ${anomaly.biomarker}`;
  const results = await vectorStore.similaritySearch(queryStr, 3);
  
  if (results.length === 0) {
      return `No specific guidelines found for ${anomaly.biomarker}.`;
  }
  
  return results.map((doc, idx) => `[Source ${idx+1}: ${doc.metadata.ministry} - ${doc.metadata.source_file}]\n${doc.pageContent}`).join("\n\n");
}

export async function runResearcher(state) {
  console.log("==> Researcher Agent: Querying RAG Knowledge Base...");
  
  if (state.anomalies.length === 0) {
    return { researchData: "No anomalies detected. No specific guidelines required." };
  }

  // 1. Gather context from Vector DB for all anomalies
  const ragContexts = await Promise.all(state.anomalies.map(async (anomaly) => {
    const context = await queryVectorDB(anomaly);
    return `--- Context for ${anomaly.biomarker} ---\n${context}`;
  }));

  const systemPrompt = `You are a strict Medical Clinical Researcher. Using ONLY the provided RAG context, summarize the clinical protocol for the patient's anomalies. Do NOT hallucinate external information.
At the end of your response, always cite the guidelines and the Ministry (ICMR or MoHFW) used as specified in the context sources.`;
  
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
