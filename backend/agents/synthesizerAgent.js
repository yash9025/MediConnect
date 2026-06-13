import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import dotenv from "dotenv";

dotenv.config();

// Enforcing output structure to match V1 precisely for unified UI rendering
const synthesizerSchema = z.object({
  isOutputAccurate: z.boolean().describe("True if reports align. False if there are severe contradictions."),
  analysis: z.object({
    urgency: z.enum(["HIGH", "MEDIUM", "LOW"]).describe("Urgency of the patient's condition."),
    condition_suspected: z.string().describe("The primary suspected condition based on specialist consensus."),
    reasoning: z.string().describe("Dense clinical synthesis of anomalies and specialist protocols."),
    recommended_specialist: z.string().describe("The primary specialist domain to refer the patient to."),
    lifestyle_advice: z.array(z.string()).describe("Empathetic, layman-friendly action plan and dietary advice."),
    warning_signs: z.array(z.string()).describe("Warning signs that require immediate emergency care.")
  })
});

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0,
  maxOutputTokens: 2048,
  apiKey: process.env.GEMINI_API_KEY,
}).withStructuredOutput(synthesizerSchema);

export async function runSynthesizer(state) {
  console.log(`==> Synthesizer Agent: Reviewing outputs (Loop Count: ${state.loopCount})...`);
  
  const systemPrompt = `You are the Supervisor Agent (The Synthesizer) for a multi-agent medical diagnostic pipeline.
Your job is to review the Extracted Anomalies and the individual reports from parallel Specialist Agents.
1. Check for contradictory information between specialists (e.g., Cardiology says eat X, Endocrinology says avoid X).
2. Resolve conflicts logically, prioritizing the most critical condition.
3. If the data is safe and resolved, set isOutputAccurate to true and generate the final report.
4. If the data has irreconcilable contradictions, set isOutputAccurate to false.

FINAL REPORT FORMAT:
You must return the structured 'analysis' object exactly matching the schema.
The 'reasoning' should be technical for doctors.
The 'lifestyle_advice' should be simple and actionable for the patient.`;

  const formattedReports = state.specialistReports.map(r => `[${r.domain} Specialist]: ${r.findings}`).join('\n\n');

  const payload = `
    Extracted Anomalies: ${JSON.stringify(state.anomalies)}
    Specialist Reports: 
    ${formattedReports}
  `;

  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(payload)
    ]);
    
    console.log(`==> Synthesizer Agent: Review complete. Accuracy Flag: ${response.isOutputAccurate}`);
    
    return { 
      isOutputAccurate: response.isOutputAccurate,
      finalSummary: response.analysis,
      loopCount: state.loopCount + 1 
    };
  } catch (error) {
    console.error("Synthesizer Agent failed:", error);
    return { 
      isOutputAccurate: true,
      finalSummary: {
        urgency: "MEDIUM",
        condition_suspected: "Analysis Error",
        reasoning: "Error synthesizing final report.",
        recommended_specialist: "General Medicine",
        lifestyle_advice: ["Please consult a doctor directly."],
        warning_signs: []
      },
      loopCount: state.loopCount + 1
    };
  }
}
