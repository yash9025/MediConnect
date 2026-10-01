import express from "express";
import { enqueueRagIngestion, ragQueue } from "../workers/ragQueue.js";

const ragRouter = express.Router();

/**
 * POST /api/rag/ingest
 * Trigger background ingestion of clinical guidelines
 * Body: { country: "india" | "usa" | "uk" | "brazil" | "global" | "all" }
 */
ragRouter.post("/ingest", async (req, res) => {
  try {
    const { country = "all" } = req.body;
    const job = await enqueueRagIngestion({ country });

    return res.status(202).json({
      success: true,
      message: `Ingestion job enqueued in background for [${country.toUpperCase()}].`,
      jobId: job.id,
      statusEndpoint: `/api/rag/status/${job.id}`,
    });
  } catch (error) {
    console.error("Failed to enqueue RAG job:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/rag/status/:jobId
 * Check real-time progress of an ingestion job
 */
ragRouter.get("/status/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await ragQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found." });
    }

    const state = await job.getState(); // 'active' | 'completed' | 'failed' | 'waiting'
    const progress = job.progress;
    const returnValues = job.returnvalue;
    const failedReason = job.failedReason;

    return res.status(200).json({
      success: true,
      jobId: job.id,
      state,
      progress,
      result: returnValues || null,
      error: failedReason || null,
    });
  } catch (error) {
    console.error("Failed to fetch RAG job status:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/rag/queue-stats
 * View health of the RAG ingestion queue
 */
ragRouter.get("/queue-stats", async (req, res) => {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      ragQueue.getWaitingCount(),
      ragQueue.getActiveCount(),
      ragQueue.getCompletedCount(),
      ragQueue.getFailedCount(),
    ]);

    return res.status(200).json({
      success: true,
      stats: { waiting, active, completed, failed },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default ragRouter;
