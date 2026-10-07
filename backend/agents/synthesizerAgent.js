import { z } from "zod";
import { createResilientLLM, MODEL_ROTATION } from "../config/modelRotation.js";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import dotenv from "dotenv";
import { calculateDeltas } from "../utils/deltaEngine.js";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

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

// Creates a new structured LLM trying each model in rotation on 503/429
async function invokeSynthesizer(messages) {
  const isOverload = (err) => {
    const msg = String(err?.message || "");
    return err?.status === 503 || err?.status === 429 || msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded");
  };
  for (let i = 0; i < MODEL_ROTATION.length; i++) {
    try {
      const llm = new ChatGoogleGenerativeAI({
        model: MODEL_ROTATION[i],
        temperature: 0,
        maxOutputTokens: 2048,
        apiKey: process.env.GEMINI_API_KEY,
        maxRetries: 0, // Disable internal backoff
      }).withStructuredOutput(synthesizerSchema);
      const result = await llm.invoke(messages);
      if (i > 0) console.log(`[Synthesizer] Succeeded with fallback: ${MODEL_ROTATION[i]}`);
      return result;
    } catch (err) {
      if (isOverload(err) && i < MODEL_ROTATION.length - 1) {
        console.warn(`[Synthesizer] ${MODEL_ROTATION[i]} overloaded, trying ${MODEL_ROTATION[i + 1]}...`);
        continue;
      }
      throw err;
    }
  }
}

export async function runSynthesizer(state) {
  console.log(`==> Synthesizer Agent: Reviewing outputs (Loop Count: ${state.loopCount})...`);
  
  let deltaContext = "No historical data available.";
  let doctorNotesContext = "No previous doctor notes.";

  if (state.historicalContext && state.historicalContext.previousBiomarkers) {
    const deltas = calculateDeltas(state.anomalies, state.historicalContext.previousBiomarkers);
    deltaContext = JSON.stringify(deltas, null, 2);
    doctorNotesContext = state.historicalContext.previousDoctorNotes || doctorNotesContext;
  }

  const systemPrompt = `You are the Supervisor Agent (The Synthesizer) for a multi-agent medical diagnostic pipeline.
Your job is to review the Extracted Anomalies, Historical Deltas, and individual reports from parallel Specialist Agents.
1. Check for contradictory information between specialists (e.g., Cardiology says eat X, Endocrinology says avoid X).
2. Resolve conflicts logically, prioritizing the most critical condition.
3. LONGITUDINAL TRACKING RULE: If a biomarker has a clinicalTrajectory of 'Improving_But_Abnormal' or 'Worsening' in the Historical Deltas, you MUST highlight this explicitly in the 'reasoning' section. Acknowledge positive trends even if the absolute value is still abnormal.
4. Incorporate the 'Previous Doctor Notes' into your synthesis to maintain continuity of care.
5. If the data is safe and resolved, set isOutputAccurate to true and generate the final report.
6. If the data has irreconcilable contradictions, set isOutputAccurate to false.

FINAL REPORT FORMAT:
You must return the structured 'analysis' object exactly matching the schema.
The 'reasoning' should be technical for doctors.
The 'lifestyle_advice' should be simple and actionable for the patient.`;

  const formattedReports = state.specialistReports.map(r => `[${r.domain} Specialist]: ${r.findings}`).join('\n\n');

  const payload = `
    Current Extracted Anomalies: ${JSON.stringify(state.anomalies)}
    Historical Deltas (Trajectories): ${deltaContext}
    Previous Doctor Notes: ${doctorNotesContext}
    
    Specialist Reports: 
    ${formattedReports}
  `;

  try {
    const response = await invokeSynthesizer([
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
