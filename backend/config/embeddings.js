import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config();

/**
 * Production Google GenAI Embeddings with Matryoshka Representation Learning
 * 
 * Guarantees exactly 768 dimensions to match Pinecone's index schema
 * while utilizing Google's state-of-the-art embedding foundation models.
 */
class GoogleMatryoshkaEmbeddings {
  constructor({ apiKey, model = "gemini-embedding-001", taskType = "RETRIEVAL_DOCUMENT", dimensions = 768 } = {}) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!this.apiKey) {
      throw new Error("[FATAL] Missing GEMINI_API_KEY for RAG embeddings.");
    }
    this.modelName = model;
    this.dimensions = dimensions;
    this.taskType = taskType === "RETRIEVAL_QUERY" ? TaskType.RETRIEVAL_QUERY : TaskType.RETRIEVAL_DOCUMENT;
    
    const genAI = new GoogleGenerativeAI(this.apiKey);
    this.genModel = genAI.getGenerativeModel({ model: this.modelName });
  }

  /**
   * Embeds a single query string with asymmetric RETRIEVAL_QUERY task weighting
   * @param {string} text
   * @returns {Promise<number[]>}
   */
  async embedQuery(text) {
    const cleanText = text.replace(/\n/g, " ").trim();
    const result = await this.genModel.embedContent({
      content: { parts: [{ text: cleanText }] },
      taskType: TaskType.RETRIEVAL_QUERY,
      outputDimensionality: this.dimensions,
    });
    return result.embedding.values;
  }

  /**
   * Embeds a batch of document strings with RETRIEVAL_DOCUMENT task weighting
   * @param {string[]} documents
   * @returns {Promise<number[][]>}
   */
  async embedDocuments(documents) {
    const vectors = [];
    // Process in batches of 10 to stay within free-tier payload limits
    const batchSize = 10;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchPromises = batch.map(doc => {
        const cleanDoc = doc.replace(/\n/g, " ").trim();
        return this.genModel.embedContent({
          content: { parts: [{ text: cleanDoc }] },
          taskType: this.taskType,
          outputDimensionality: this.dimensions,
        }).then(res => res.embedding.values);
      });

      const batchVectors = await Promise.all(batchPromises);
      vectors.push(...batchVectors);

      // Micro-pause if more batches exist to respect free-tier RPM
      if (i + batchSize < documents.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    return vectors;
  }
}

/**
 * Factory function returning a Matryoshka-tuned Google GenAI Embeddings instance.
 * @param {('RETRIEVAL_DOCUMENT'|'RETRIEVAL_QUERY')} taskType
 */
export function getEmbeddings(taskType = "RETRIEVAL_DOCUMENT") {
  return new GoogleMatryoshkaEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-embedding-001",
    taskType,
    dimensions: 768, // Exactly matches Pinecone index schema
  });
}
