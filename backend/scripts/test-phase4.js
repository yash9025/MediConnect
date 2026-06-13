import { enqueueMedicalReport, aiJobQueue } from "../workers/aiQueue.js";
import "../workers/aiWorker.js"; // This imports and automatically boots up the worker instance

async function runTests() {
  console.log("\n=======================================================");
  console.log("   PHASE 4 TEST: BullMQ & WebSocket Stream Emulation   ");
  console.log("=======================================================\n");

  const dummyReport = `
    MediConnect Labs Ltd.
    Patient: Alice Wonderland
    Aadhaar: 1234 5678 9012
    Hemoglobin: 11.2 g/dL (Reference: 13.5 - 17.5) - LOW
  `;

  // 1. Simulate the Express.js Controller
  const jobId = `job_${Date.now()}`;
  console.log(`[Express Controller] Enqueuing Job ${jobId}...`);
  
  await enqueueMedicalReport(jobId, dummyReport);
  console.log(`[Express Controller] Job Enqueued successfully!`);
  console.log(`[Express Controller] Emitting { status: 'processing', jobId: '${jobId}' } to frontend...\n`);
  
  // 2. The aiWorker.js is running in the background and will pick this up automatically.
  // We keep the script alive long enough for it to finish.
  setTimeout(async () => {
    console.log("\n[Test Framework] Test timeout reached.");
    
    // Cleanup BullMQ connections so the script can exit cleanly
    await aiJobQueue.close();
    process.exit(0);
  }, 25000);
}

// Ensure the GEMINI_API_KEY is present
if (!process.env.GEMINI_API_KEY) {
  console.error("CRITICAL ERROR: GEMINI_API_KEY is not set in your .env file or environment variables.");
  process.exit(1);
}

runTests().catch(console.error);
