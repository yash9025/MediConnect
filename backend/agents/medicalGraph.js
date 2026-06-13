import { StateGraph, END, START, MemorySaver } from "@langchain/langgraph";
import { GraphState } from "./graphState.js";
import { runExtractor } from "./extractorAgent.js";
import { runTriage } from "./triageAgent.js";
import { createSpecialistAgent } from "./specialistAgents.js";
import { runSynthesizer } from "./synthesizerAgent.js";

const DOMAINS = [
  "Cardiology", "Endocrinology", "Nephrology", 
  "Gastroenterology", "Dermatology", "Pulmonology", 
  "Hematology", "Infectious Disease", "General Medicine"
];

// Routing function based on the state after Extraction
function routeAfterExtraction(state) {
  if (!state.isValidBloodReport) {
    console.log("==> Routing: Invalid report detected, terminating workflow early to save resources.");
    return END; 
  }
  return "triage";
}

// Dynamic fan-out to specialists
function routeToSpecialists(state) {
  const specialists = state.requiredSpecialists || [];
  
  // Filter out any hallucinated domain names
  const validSpecialists = specialists.filter(s => DOMAINS.includes(s));
  
  if (validSpecialists.length === 0) {
    console.log("==> Routing: No valid specialists found, falling back to General Medicine.");
    return ["General Medicine"]; 
  }
  
  console.log(`==> Routing: Fanning out to parallel nodes: ${validSpecialists.join(', ')}`);
  return validSpecialists;
}

// Hallucination / Retry Routing
function routeValidation(state) {
  console.log("==> Routing: Checking Synthesizer output quality...");
  if (state.isOutputAccurate) {
    console.log("==> Routing: Output is accurate. Finishing workflow.");
    return END;
  }
  
  if (state.loopCount >= 3) {
    console.error("==> Routing: Graph hit maximum retry safety limit (3). Terminating loop.");
    return END; 
  }
  
  console.warn("==> Routing: Contradiction detected! Re-running Synthesis.");
  return "synthesizer"; 
}

// Initialize a checkpointer for Durable Execution
const checkpointer = new MemorySaver();

// Build the graph
const graphBuilder = new StateGraph(GraphState)
  .addNode("extractor", runExtractor)
  .addNode("triage", runTriage)
  .addNode("synthesizer", runSynthesizer);

// Add specialist nodes dynamically
DOMAINS.forEach(domain => {
  graphBuilder.addNode(domain, createSpecialistAgent(domain));
});

// Build edges
graphBuilder
  .addEdge(START, "extractor")
  .addConditionalEdges("extractor", routeAfterExtraction)
  
  // Fan-out from Triage to parallel Specialist Agents
  .addConditionalEdges("triage", routeToSpecialists);

// Fan-in: Map all specialist nodes to the synthesizer
DOMAINS.forEach(domain => {
  graphBuilder.addEdge(domain, "synthesizer");
});

graphBuilder.addConditionalEdges("synthesizer", routeValidation);

export const medicalGraph = graphBuilder.compile({
  checkpointer: checkpointer,
});
