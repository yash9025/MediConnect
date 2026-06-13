import dotenv from "dotenv";
dotenv.config();

import { medicalGraph } from "../agents/medicalGraph.js";

async function runTests() {
  console.log("\n=======================================================");
  console.log("   END-TO-END TEST: Durable Execution & HITL           ");
  console.log("=======================================================\n");
  
  const validReportText = `
    Patient: John Doe 
    Hemoglobin: 11.2 g/dL (Reference: 13.5 - 17.5) - LOW
  `;
  
  // 1. Thread ID is required for Checkpointers (so the DB knows WHICH graph this is)
  const threadConfig = { configurable: { thread_id: "patient_12345" } };

  console.log("🚀 [System] Starting Graph Execution (Job ID: patient_12345)");
  
  // This will run Extractor, Researcher, Lifestyle, and then FREEZE at Synthesizer
  const stateStream = await medicalGraph.stream({ rawPdfText: validReportText }, threadConfig);

  for await (const chunk of stateStream) {
     const node = Object.keys(chunk)[0];
     console.log(`✅ [Graph Node Finished] ${node}`);
  }

  // 2. The graph is now paused (Human-In-The-Loop)
  console.log("\n🛑 [HITL PAUSE] The graph has automatically frozen execution before the Synthesizer.");
  console.log("🛑 [HITL PAUSE] A doctor must review the Extractor Anomalies in the dashboard.");
  
  // Simulate waiting for a doctor
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log("\n👨‍⚕️ [Doctor] Doctor clicked 'Approve'. Resuming Graph...\n");

  // 3. Resume the exact same graph using the thread ID (State is pulled from the DB/Checkpointer)
  // We pass `null` because we aren't changing the state, just resuming.
  const resumeStream = await medicalGraph.stream(null, threadConfig);

  let finalResult = null;
  for await (const chunk of resumeStream) {
     const node = Object.keys(chunk)[0];
     console.log(`✅ [Graph Node Finished] ${node}`);
     finalResult = chunk[node];
  }

  console.log("\n--- FINAL COMPLETE REPORT ---");
  console.log(finalResult.finalSummary);
}

if (!process.env.GEMINI_API_KEY) {
  console.error("CRITICAL ERROR: GEMINI_API_KEY is not set.");
  process.exit(1);
}

runTests().catch(console.error);
