import { Worker } from "bullmq";
import { connection } from "../config/redis.js";
import { buildMedicalIndex } from "../scripts/ingestData.js";

/**
 * BullMQ Background Worker for Processing Medical Knowledge Ingestion
 * 
 * Production Characteristics:
 * 1. Single concurrency (concurrency: 1) prevents overloading Google's free-tier rate limits.
 * 2. Asynchronous job progress reporting (0% -> 100%).
 * 3. Graceful error handling with automated retries.
 */
export const ragWorker = new Worker(
  "rag-ingestion-queue",
  async (job) => {
    const { country } = job.data;
    const targetCountry = country === "all" ? null : country;

    console.log(`[RAG Worker] Starting background ingestion job #${job.id} for target: [${(targetCountry || "ALL").toUpperCase()}]`);
    await job.updateProgress(5);

    try {
      const result = await buildMedicalIndex(targetCountry, async (progressInfo) => {
        // Map batch progress to 10% - 95%
        const scaledPercent = Math.min(95, Math.max(10, Math.round(progressInfo.percent * 0.9)));
        await job.updateProgress({
          percentage: scaledPercent,
          batch: progressInfo.batch,
          totalBatches: progressInfo.totalBatches,
          chunksProcessed: progressInfo.chunksProcessed,
          totalChunks: progressInfo.totalChunks,
        });
      });

      await job.updateProgress(100);
      console.log(`[RAG Worker] Successfully finished job #${job.id}. Processed ${result?.count || 0} chunks.`);

      return {
        success: true,
        country: targetCountry || "all",
        chunksCount: result?.count || 0,
        completedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error(`[RAG Worker] Job #${job.id} failed:`, err.message);
      throw err;
    }
  },
  {
    connection,
    concurrency: 1, // Rate-limit safety: 1 ingestion stream at a time
  }
);

ragWorker.on("completed", (job) => {
  console.log(`[RAG Worker Event] Job #${job.id} marked COMPLETED.`);
});

ragWorker.on("failed", (job, err) => {
  console.error(`[RAG Worker Event] Job #${job?.id} FAILED:`, err.message);
});
