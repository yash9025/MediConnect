import { Queue } from "bullmq";
import { connection } from "../config/redis.js";

/**
 * BullMQ Queue for Asynchronous Medical Document Ingestion
 */
export const ragQueue = new Queue("rag-ingestion-queue", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

ragQueue.on("error", (err) => {
  if (err.code !== "ECONNREFUSED") {
    console.warn("BullMQ RAG Queue Error:", err.message);
  }
});

/**
 * Enqueue a new document ingestion task
 * @param {Object} payload
 * @param {string} [payload.country] - Target country or 'all'
 * @param {string} [payload.filePath] - Specific PDF file path (optional)
 * @returns {Promise<import('bullmq').Job>}
 */
export async function enqueueRagIngestion({ country = "all", filePath = null } = {}) {
  const jobId = `rag_${country}_${Date.now()}`;
  return await ragQueue.add(
    "ingest-medical-documents",
    { country, filePath },
    { jobId }
  );
}
