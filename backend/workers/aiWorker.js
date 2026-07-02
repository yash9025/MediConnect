import { Worker } from "bullmq";
import { connection } from "../config/redis.js";
import { redisPublisher } from "../config/pubsub.js";
import { sanitizeMedicalReport, rehydrateMedicalReport } from "../utils/piiSanitizer.js";
import { medicalGraph } from "../agents/medicalGraph.js";

/**
 * Mocks a WebSocket Emission.
 * In production, you'd use a Redis Publisher to send this to the Express App's Socket.io instance.
 * Example: redisPubSub.publish(`job_updates_${jobId}`, JSON.stringify({ stage, message }));
 */
const emitProgress = async (jobId, stage, message) => {
  console.log(`[WS EMIT -> Client ${jobId}] [${stage}] ${message}`);
  // Publish to a Redis channel specific to this job
  await redisPublisher.publish(`job_updates_${jobId}`, JSON.stringify({ stage, message }));
};

// Initialize the asynchronous worker on the queue
export const aiWorker = new Worker("ai-analysis-queue", async (job) => {
  const { rawPdfText } = job.data;
  const jobId = job.id;

  try {
    // ---------------------------------------------------------
    // PHASE 1: PRE-PROCESSING (SECURITY LAYER)
    // ---------------------------------------------------------
    await emitProgress(jobId, "PII_SANITIZATION", "Masking sensitive patient data locally...");
    const { cleanText, piiMap } = await sanitizeMedicalReport(rawPdfText);

    // ---------------------------------------------------------
    // PHASE 2 & 3: LANGGRAPH MULTI-AGENT EXECUTION
    // ---------------------------------------------------------
    await emitProgress(jobId, "AGENT_GRAPH_STARTED", "Initializing Multi-Agent Diagnostics...");

    // Using .stream() to get real-time state updates as nodes finish
    const stream = await medicalGraph.stream({ rawPdfText: cleanText });

    let finalState = null;
    
    for await (const update of stream) {
      // 'update' contains the output of the node that just completed execution
      for (const [nodeName, stateOutput] of Object.entries(update)) {
        if (nodeName === "extractor") {
          await emitProgress(jobId, "AGENT_EXTRACTOR", "Extractor Agent finished pulling biomarkers.");
          if (!stateOutput.isValidBloodReport) {
             throw new Error(`Invalid Report: ${stateOutput.rejectionReason}`);
          }
        }
        if (nodeName === "researcher") {
          await emitProgress(jobId, "AGENT_RESEARCHER", "Researcher Agent successfully queried MoHFW guidelines.");
        }
        if (nodeName === "lifestyle") {
          await emitProgress(jobId, "AGENT_LIFESTYLE", "Lifestyle Coach finalized dietary recommendations.");
        }
        if (nodeName === "synthesizer") {
          await emitProgress(jobId, "AGENT_SYNTHESIZER", `Supervisor Agent review complete. Accuracy: ${stateOutput.isOutputAccurate}`);
        }
        finalState = stateOutput;
      }
    }

    if (!finalState || !finalState.finalSummary) {
      throw new Error("Pipeline completed but no final summary was generated.");
    }

    // ---------------------------------------------------------
    // PHASE 1: POST-PROCESSING (REHYDRATION)
    // ---------------------------------------------------------
    await emitProgress(jobId, "PII_REHYDRATION", "Restoring secure patient data locally...");
    const finalReport = rehydrateMedicalReport(finalState.finalSummary, piiMap);

    await emitProgress(jobId, "COMPLETED", "Analysis fully completed.");

    // Return data for BullMQ to mark job as completed and store the result
    return { finalReport };

  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    await emitProgress(jobId, "ERROR", error.message);
    throw error; // Let BullMQ handle retries
  }
}, { 
  connection,
  metrics: { maxDataPoints: 0 },
  skipStalledCheck: true,
  drainDelay: 300000 
});

// Worker event listeners for logging
aiWorker.on('completed', (job, returnvalue) => {
  console.log(`\n✅ Job ${job.id} officially marked as completed by BullMQ.`);
});

aiWorker.on('failed', (job, err) => {
  console.error(`\n❌ Job ${job.id} failed with reason: ${err.message}`);
});

// Prevent BullMQ worker connection errors from crashing the app when Redis is offline
aiWorker.on('error', (err) => {
  if (err.code !== 'ECONNREFUSED') console.warn('BullMQ Worker Error:', err.message);
});

// Catch errors on internally duplicated Redis clients
aiWorker.client.then(client => client.on('error', (err) => {}));
aiWorker.bclient.then(bclient => bclient.on('error', (err) => {}));
