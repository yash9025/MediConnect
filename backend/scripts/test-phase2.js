import dotenv from "dotenv";
dotenv.config();

import { medicalGraph } from "../agents/medicalGraph.js";

async function runTests() {
  console.log("\n=======================================================");
  console.log("   PHASE 2 TEST 1: Valid Blood Report (Clean Path)     ");
  console.log("=======================================================\n");
  
  const validReportText = `
    Patient: John Doe (IGNORE THIS PII)
    Age: 45
    Date: 2023-10-25
    Hemoglobin: 11.2 g/dL (Reference: 13.5 - 17.5) - LOW
    Cholesterol, Total: 240 mg/dL (Reference: < 200) - HIGH
    Glucose, Fasting: 90 mg/dL (Reference: 70 - 100) - NORMAL
  `;
  
  const result1 = await medicalGraph.invoke({ rawPdfText: validReportText });
  console.log("\n--- Graph Final State (Valid) ---");
  console.log(JSON.stringify(result1, null, 2));


  console.log("\n=======================================================");
  console.log("   PHASE 2 TEST 2: Invalid Garbage Input (Edge Case)   ");
  console.log("=======================================================\n");
  
  const invalidText = `
    Walmart Supercenter #1234
    1x Milk $3.99
    2x Bread $5.00
    Total: $8.99
    Thank you for shopping!
  `;
  
  const result2 = await medicalGraph.invoke({ rawPdfText: invalidText });
  console.log("\n--- Graph Final State (Invalid) ---");
  console.log(JSON.stringify(result2, null, 2));
}

// Ensure the GEMINI_API_KEY is present
if (!process.env.GEMINI_API_KEY) {
  console.error("CRITICAL ERROR: GEMINI_API_KEY is not set in your .env file or environment variables.");
  process.exit(1);
}

runTests().catch(console.error);
