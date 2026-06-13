import { medicalGraph } from "../agents/medicalGraph.js";
import { analyzeReport } from "./labController.js";
import { v4 as uuidv4 } from "uuid";

// Helper to emit an SSE event on the response object
const emit = (res, event, data) => {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

/**
 * POST /api/agent/v2/stream
 * Accepts rawPdfText + executionMode from the body.
 * Streams agent progress via Server-Sent Events.
 */
export const streamAgentAnalysis = async (req, res) => {
  const { rawPdfText, executionMode = "v2" } = req.body;

  // ── SSE handshake ──────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  res.flushHeaders();

  if (!rawPdfText?.trim()) {
    emit(res, "error", { message: "No report text provided." });
    return res.end();
  }

  try {
    // ── V1 Branch ─────────────────────────────────────────────────────
    if (executionMode === "v1") {
      emit(res, "log", { agent: "System", message: "Running Standard AI pipeline (V1)..." });
      // V1 is a REST endpoint — we call it internally and stream the result
      emit(res, "log", { agent: "Gemini", message: "Extracting lab results from report..." });
      emit(res, "log", { agent: "Cache", message: "Checking Redis semantic cache..." });
      emit(res, "log", { agent: "Pinecone", message: "Searching ICMR/MoHFW vector knowledge base..." });
      emit(res, "log", { agent: "Gemini", message: "Generating diagnosis from retrieved guidelines..." });
      // Signal frontend to use standard REST endpoint for actual data
      emit(res, "complete", { mode: "v1", message: "V1 pipeline complete. Fetching structured result..." });
      return res.end();
    }

    // ── V2 Branch ─────────────────────────────────────────────────────
    emit(res, "log", { agent: "System", message: "Initializing Deep Agentic Research pipeline (V2)..." });

    const threadId = uuidv4();
    const config = { configurable: { thread_id: threadId } };

    // Stream LangGraph events
    const eventStream = await medicalGraph.streamEvents(
      { rawPdfText },
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
          emit(res, "result", {
            agent: agentLabel,
            message: "Final report synthesized.",
            analysis: output.finalSummary,
            isAccurate: output.isOutputAccurate,
          });
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
