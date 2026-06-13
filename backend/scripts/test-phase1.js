import { sanitizeMedicalReport, rehydrateMedicalReport } from "../utils/piiSanitizer.js";

async function runTests() {
  console.log("\n=======================================================");
  console.log("   PHASE 1 TEST: PII Symmetrical Masking Layer         ");
  console.log("=======================================================\n");

  const rawPdfText = `
    MediConnect Labs Ltd.
    Date: 2024-05-27
    Patient Name: Yash Agrawal
    Patient Phone: +91 9876543210
    Patient Aadhaar: 1234 5678 9012
    Patient Email: yash.demo@mediconnect.com

    CLINICAL FINDINGS:
    The patient Yash Agrawal exhibits elevated fasting glucose. 
    Please contact yash.demo@mediconnect.com or +91 9876543210 for follow up.
  `;

  console.log("1. Original Raw Text (Highly Sensitive):");
  console.log("---------------------------------------");
  console.log(rawPdfText);

  // Step 1: Sanitize
  const { cleanText, piiMap } = await sanitizeMedicalReport(rawPdfText);
  
  console.log("\n2. Sanitized Text (Safe for Gemini API):");
  console.log("---------------------------------------");
  console.log(cleanText);

  console.log("\n3. Generated PII Map (Stored Locally in Memory):");
  console.log("---------------------------------------");
  for (const [key, value] of piiMap.entries()) {
    console.log(`   ${key} -> ${value}`);
  }

  // Simulate LLM Processing the text and returning a summary
  const mockLlmOutput = `
    Patient [NAME_3] has an elevated fasting glucose.
    Contact information on file: [EMAIL_0], [PHONE_1].
    Patient Aadhaar ID [ID_2] verified.
  `;

  // Step 2: Rehydrate
  const finalOutput = rehydrateMedicalReport(mockLlmOutput, piiMap);

  console.log("\n4. Rehydrated Final Output (Sent to Frontend):");
  console.log("---------------------------------------");
  console.log(finalOutput);
}

runTests().catch(console.error);
