import dotenv from "dotenv";
dotenv.config();

import { medicalGraph } from "../agents/medicalGraph.js";

async function runTests() {
  console.log("\n=======================================================");
  console.log("   PHASE 3 TEST: Full Parallel Multi-Agent Graph       ");
  console.log("=======================================================\n");
  
  const validReportText = `
    Patient: John Doe (IGNORE THIS PII)
    Age: 45
    Date: 2023-10-25
    Hemoglobin: 11.2 g/dL (Reference: 13.5 - 17.5) - LOW
    Cholesterol, Total: 240 mg/dL (Reference: < 200) - HIGH
    Glucose, Fasting: 90 mg/dL (Reference: 70 - 100) - NORMAL
  `;
  
  const result = await medicalGraph.invoke({ rawPdfText: validReportText });
  console.log("\n--- Graph Final State (Complete Pipeline) ---");
  console.log("Is Output Accurate (Synthesizer Check):", result.isOutputAccurate);
  console.log("Final Loop Count:", result.loopCount);
  console.log("\n--- FINAL REPORT ---");
  console.log(result.finalSummary);
}

if (!process.env.GEMINI_API_KEY) {
  console.error("CRITICAL ERROR: GEMINI_API_KEY is not set in your .env file.");
  process.exit(1);
}

runTests().catch(console.error);
