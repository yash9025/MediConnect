import { medicalGraph } from "../agents/medicalGraph.js";
import { analyzeReport } from "./labController.js";
import { v4 as uuidv4 } from "uuid";
import { GoogleGenerativeAI } from "@google/generative-ai";
import reportModel from "../models/reportModel.js";
import fs from "fs";
import * as dotenv from "dotenv";
import { calculateDeltas } from "../utils/deltaEngine.js";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

import { MODEL_ROTATION } from "../config/modelRotation.js";
import { findMatchingDoctors } from "../utils/doctorServices.js";
import { rankDoctorsForPatient } from "../services/doctorRankingService.js";
import { getAttendingDoctor } from "../services/continuityService.js";
import doctorModel from "../models/doctorModel.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to retry Gemini API calls on 503 / 429 errors rotating through models
const generateWithRetry = async (promptOrConfig) => {
  const isOverload = (err) => {
    const msg = String(err?.message || "");
    return err?.status === 503 || err?.status === 429 || msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded") || msg.includes("Service Unavailable");
  };

  for (const modelName of MODEL_ROTATION) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(promptOrConfig);
        if (modelName !== MODEL_ROTATION[0] || attempt > 0) {
          console.log(`[agentController] Succeeded with ${modelName} on attempt ${attempt + 1}`);
        }
        return result;
      } catch (err) {
        const s = err?.status;
        if (s === 503 || s === 429 || isOverload(err)) {
          console.warn(`[agentController] ${modelName} overloaded (${s}), retrying attempt ${attempt + 1}/3...`);
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          continue; // Retry same model
        }
        if (s === 404) {
          console.warn(`[agentController] ${modelName} not found (404), skipping to next model.`);
          break; // Skip to next model
        }
        console.error(`[agentController] FATAL ERROR on ${modelName} (${s}):`, err?.message);
        throw err; // Real error (bad key, etc)
      }
    }
  }
  throw new Error("All models unavailable");
};

// Helper to emit an SSE event on the response object
const emit = (res, event, data) => {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

/**
 * POST /api/agent/v2/stream
 * Accepts rawPdfText OR PDF file upload + executionMode from body/multipart.
 * Streams agent progress via Server-Sent Events.
 */
export const streamAgentAnalysis = async (req, res) => {
  let { rawPdfText, executionMode = "v2", country = "india", previousReportId } = req.body;
  const selectedCountry = (country || "india").toLowerCase().trim();

  // ── SSE handshake ──────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  res.flushHeaders();

  // Handle direct PDF file upload if present via Multer
  if (req.file) {
    emit(res, "log", { agent: "Extractor Agent", message: `Uploaded PDF detected: ${req.file.originalname}. Extracting report data...` });
    try {
      const pdfBuffer = await fs.promises.readFile(req.file.path);
      const data = await pdfParse(pdfBuffer);
      rawPdfText = data.text;
      emit(res, "log", { agent: "Extractor Agent", message: "PDF document extracted successfully! Feeding into Multi-Agent Graph..." });
    } catch (pdfErr) {
      console.error("[SSE] PDF extraction error:", pdfErr);
      emit(res, "error", { agent: "Extractor Agent", message: `PDF extraction failed: ${pdfErr.message}` });
      return res.end();
    } finally {
      // Clean up temp file safely
      fs.promises.unlink(req.file.path).catch(() => {});
    }
  }

  if (!rawPdfText?.trim()) {
    emit(res, "error", { message: "No report text or PDF file provided." });
    return res.end();
  }


  try {
    // ── V1 Branch ─────────────────────────────────────────────────────
    if (executionMode === "v1") {
      emit(res, "log", { agent: "System", message: `Running Standard AI pipeline (V1) for [${selectedCountry.toUpperCase()}]...` });
      // V1 is a REST endpoint — we call it internally and stream the result
      emit(res, "log", { agent: "Gemini", message: "Extracting lab results from report..." });
      emit(res, "log", { agent: "Cache", message: `Checking Redis semantic cache [${selectedCountry}]...` });
      emit(res, "log", { agent: "Pinecone", message: `Searching ${selectedCountry.toUpperCase()} vector knowledge base...` });
      emit(res, "log", { agent: "Gemini", message: "Generating diagnosis from retrieved guidelines..." });
      // Signal frontend to use standard REST endpoint for actual data
      emit(res, "complete", { mode: "v1", country: selectedCountry, message: "V1 pipeline complete. Fetching structured result..." });
      return res.end();
    }

    // ── V2 Branch ─────────────────────────────────────────────────────
    emit(res, "log", { agent: "System", message: `Initializing Deep Agentic Research pipeline (V2) for region [${selectedCountry.toUpperCase()}]...` });

    const threadId = uuidv4();
    const config = { configurable: { thread_id: threadId } };

    // Fetch historical context if previousReportId exists
    let historicalContext = null;
    if (previousReportId) {
      emit(res, "log", { agent: "System", message: `Fetching historical baseline from report ${previousReportId}...` });
      try {
        const previousReport = await reportModel.findById(previousReportId);
        if (previousReport && previousReport.biomarkers && previousReport.biomarkers.length > 0) {
          historicalContext = { 
            previousBiomarkers: previousReport.biomarkers,
            previousDoctorNotes: previousReport.doctorNotes || "No previous notes recorded."
          };
        }
      } catch (err) {
        console.warn("[WARN] Failed to fetch previous report:", err.message);
      }
    }

    // Stream LangGraph events
    const eventStream = await medicalGraph.streamEvents(
      { rawPdfText, country: selectedCountry, historicalContext },
      { ...config, version: "v2" }
    );

    for await (const event of eventStream) {
      const eventType = event.event;
      // LangGraph JS attaches the graph node name to metadata
      const nodeName = event.metadata?.langgraph_node;

      // Only forward meaningful node lifecycle events (ignore internal LangChain tool/llm chains)
      if (!nodeName) continue;

      if (eventType === "on_chain_start" && nodeName !== "__start__" && nodeName !== "__end__") {
        const agentLabel = formatNodeName(nodeName);
        emit(res, "log", { agent: agentLabel, message: getStartMessage(nodeName) });
      }

      if (eventType === "on_chain_end" && nodeName !== "__start__" && nodeName !== "__end__") {
        // Output from a node is available in the data chunk
        // Note: For LangGraph nodes, the output is an object with the node's returned state
        const output = event.data?.output;
        if (!output) continue;

        const agentLabel = formatNodeName(nodeName);

        if (nodeName === "triage" && output?.requiredSpecialists) {
          const specialists = output.requiredSpecialists.join(", ");
          emit(res, "log", {
            agent: "Router",
            message: `Spawning parallel agents: ${specialists}`,
            specialists: output.requiredSpecialists,
          });
        }

        if (nodeName === "synthesizer" && output?.finalSummary) {
          
          let deltasForFrontend = null;
          if (historicalContext && historicalContext.previousBiomarkers && event.data?.input?.anomalies) {
             deltasForFrontend = calculateDeltas(event.data.input.anomalies, historicalContext.previousBiomarkers);
          }

          const targetSpecialty = output.finalSummary.recommended_specialist;
          const urgency = output.finalSummary.urgency || "NORMAL";
          
          const candidateDoctors = await findMatchingDoctors(targetSpecialty);
          const attendingDoctor = req.userId ? await getAttendingDoctor(req.userId, targetSpecialty) : null;
          
          let recommendationPayload = {};
          if (attendingDoctor && (urgency === "NORMAL" || urgency === "LOW")) {
            recommendationPayload = {
              continuity_applied: true,
              pinned_doctor: attendingDoctor,
              badge: "Your Care Continuity Specialist",
              matched_doctors: rankDoctorsForPatient({ doctors: candidateDoctors, attendingDoctorId: attendingDoctor._id, urgency, targetSpecialty })
            };
          } else if (attendingDoctor && (urgency === "CRITICAL" || urgency === "HIGH")) {
            const attendingWaitMinutes = attendingDoctor.estimatedWaitMinutes || 60;
            if (attendingWaitMinutes <= 45) {
              recommendationPayload = {
                continuity_applied: true,
                pinned_doctor: attendingDoctor,
                badge: "Emergency Priority",
                matched_doctors: rankDoctorsForPatient({ doctors: candidateDoctors, attendingDoctorId: attendingDoctor._id, urgency, targetSpecialty })
              };
            } else {
              recommendationPayload = {
                continuity_applied: false,
                triage_override: true,
                override_reason: `Dr. ${attendingDoctor.name} is not immediately available.`,
                matched_doctors: rankDoctorsForPatient({ doctors: candidateDoctors, attendingDoctorId: attendingDoctor._id, urgency, targetSpecialty })
              };
            }
          } else {
            recommendationPayload = {
              continuity_applied: false,
              matched_doctors: rankDoctorsForPatient({ doctors: candidateDoctors, urgency, targetSpecialty })
            };
          }

          emit(res, "result", {
            agent: agentLabel,
            message: "Final report synthesized.",
            analysis: output.finalSummary,
            isAccurate: output.isOutputAccurate,
            country: selectedCountry,
            ...recommendationPayload
          });

          if (req.userId) {
            reportModel.create({
              userId: req.userId,
              patientName: "Patient",
              biomarkers: event.data?.input?.anomalies || [], // Save biomarkers to DB
              aiAnalysis: { 
                 ...output.finalSummary, 
                 countryUsed: selectedCountry,
                 historicalDeltas: deltasForFrontend,
                 previousDoctorNotes: historicalContext?.previousDoctorNotes || null
              },
              matchedDoctorIds: recommendationPayload.matched_doctors.map(d => d._id),
            }).catch(err => console.error("[WARN] Failed to persist V2 report to history:", err.message));
          }
        }

        emit(res, "log", { agent: agentLabel, message: getEndMessage(nodeName) });
      }

      if (eventType === "on_chain_error" && nodeName && nodeName !== "__start__") {
        emit(res, "error", { agent: formatNodeName(nodeName), message: `Agent failed: ${event.data?.error?.message || "Unknown error"}` });
      }
    }

    emit(res, "done", { message: "Analysis pipeline complete." });
  } catch (error) {
    console.error("[SSE] Agent stream failed:", error);
    emit(res, "error", { agent: "System", message: `Pipeline error: ${error.message}` });
  } finally {
    res.end();
  }
};

function formatNodeName(name) {
  const map = {
    extractor: "Extractor Agent",
    triage: "Triage Agent",
    synthesizer: "Synthesizer Agent",
    Cardiology: "Cardiology Specialist",
    Endocrinology: "Endocrinology Specialist",
    Nephrology: "Nephrology Specialist",
    Gastroenterology: "Gastroenterology Specialist",
    Hematology: "Hematology Specialist",
    Pulmonology: "Pulmonology Specialist",
    Dermatology: "Dermatology Specialist",
    "Infectious Disease": "Infectious Disease Specialist",
    "General Medicine": "General Medicine Specialist",
  };
  return map[name] || name;
}

function getStartMessage(name) {
  const map = {
    extractor: "Reading report and extracting anomalous biomarkers...",
    triage: "Analyzing anomalies to determine required specialist domains...",
    synthesizer: "Resolving specialist findings and drafting final report...",
  };
  if (map[name]) return map[name];
  return `Searching ICMR vector database for "${name}" clinical protocols...`;
}

function getEndMessage(name) {
  const map = {
    extractor: "Extraction complete.",
    triage: "Triage complete. Routing to specialists.",
    synthesizer: "Synthesis complete.",
  };
  return map[name] || "Research complete.";
}
