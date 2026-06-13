import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", temperature: 0 });

// --- Golden Dataset (Mocked for Evals) ---
const goldenDataset = [
  {
    id: "case_001",
    input_anomalies: [{ test_name: "LDL Cholesterol", value: 190, status: "HIGH" }],
    input_symptoms: "Mild chest pain after walking",
    expected_specialist: "Cardiologist",
    // These would typically come from running the pipeline
    retrieved_contexts: [
      "MoHFW Guideline: For LDL > 160 with symptomatic chest pain, refer immediately to Cardiology. Initiate statin therapy."
    ],
    generated_diagnosis: {
      condition_suspected: "Hyperlipidemia with potential angina",
      urgency: "HIGH",
      recommended_specialist: "Cardiologist",
      reasoning: "Patient has high LDL and exertional chest pain, matching MoHFW guidelines for Cardiology referral.",
      lifestyle_advice: ["Reduce saturated fats", "Avoid strenuous exercise until cleared"],
      warning_signs: ["Severe chest pain", "Shortness of breath at rest"]
    }
  },
  {
    id: "case_002",
    input_anomalies: [{ test_name: "Hemoglobin", value: 9.2, status: "LOW" }],
    input_symptoms: "Fatigue and dizziness",
    expected_specialist: "Hematologist",
    retrieved_contexts: [
      "MoHFW Guideline: Hemoglobin < 10 g/dL in adults with fatigue indicates moderate to severe anemia. Recommend dietary iron and Hematology consult if unresponsive."
    ],
    generated_diagnosis: {
      condition_suspected: "Moderate Anemia",
      urgency: "MEDIUM",
      recommended_specialist: "Hematologist",
      reasoning: "Hemoglobin is significantly low causing symptomatic fatigue, aligning with anemia protocols.",
      lifestyle_advice: ["Eat iron-rich foods like spinach and red meat"],
      warning_signs: ["Fainting", "Severe weakness"]
    }
  }
];

// --- Evaluators (LLM-as-a-Judge) ---

async function evaluateFaithfulness(context, diagnosis) {
  const prompt = `
    You are an expert evaluator. Evaluate if the given 'Diagnosis' is strictly faithful to the provided 'Context'. 
    If the diagnosis includes medical claims NOT supported by the context, it is a hallucination (Score: 0).
    If it is fully supported, score it 1.
    
    Context: ${JSON.stringify(context)}
    Diagnosis: ${JSON.stringify(diagnosis)}
    
    Return ONLY a JSON object: {"score": 1 or 0, "reason": "brief explanation"}
  `;
  const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
  return JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, ''));
}

async function evaluateContextPrecision(anomalies, symptoms, context) {
  const prompt = `
    Evaluate if the retrieved 'Context' is highly relevant to the patient's 'Anomalies' and 'Symptoms'.
    Score 1 if relevant, 0 if irrelevant noise.
    
    Anomalies: ${JSON.stringify(anomalies)}
    Symptoms: ${symptoms}
    Context: ${JSON.stringify(context)}
    
    Return ONLY a JSON object: {"score": 1 or 0, "reason": "brief explanation"}
  `;
  const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
  return JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, ''));
}

async function runEvals() {
  console.log("🚀 Starting RAG Evaluation Suite...");
  let totalFaithfulness = 0;
  let totalPrecision = 0;

  for (const testCase of goldenDataset) {
    console.log(`\nEvaluating Case: ${testCase.id}`);
    
    const faithfulness = await evaluateFaithfulness(testCase.retrieved_contexts, testCase.generated_diagnosis);
    const precision = await evaluateContextPrecision(testCase.input_anomalies, testCase.input_symptoms, testCase.retrieved_contexts);
    
    totalFaithfulness += faithfulness.score;
    totalPrecision += precision.score;

    console.log(`- Faithfulness: ${faithfulness.score} (${faithfulness.reason})`);
    console.log(`- Context Precision: ${precision.score} (${precision.reason})`);
  }

  console.log("\n📊 Final Evaluation Report");
  console.log(`Faithfulness Score: ${(totalFaithfulness / goldenDataset.length) * 100}%`);
  console.log(`Context Precision Score: ${(totalPrecision / goldenDataset.length) * 100}%`);
  
  if ((totalFaithfulness / goldenDataset.length) < 0.9) {
    console.warn("⚠️ Warning: Faithfulness is below 90%. System is prone to hallucination.");
  } else {
    console.log("✅ System meets production thresholds for safety and relevance.");
  }
}

runEvals().catch(console.error);
