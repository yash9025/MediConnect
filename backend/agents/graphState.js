import { Annotation } from "@langchain/langgraph";

// Central State definition for the entire multi-agent pipeline
export const GraphState = Annotation.Root({
  // The sanitized input text containing the medical report data
  rawPdfText: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),

  // Extractor output fields
  isValidBloodReport: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => true,
  }),
  rejectionReason: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  anomalies: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),

  // Synthesizer guardrail tracker
  isOutputAccurate: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),
  loopCount: Annotation({
    reducer: (current, next) => next, // Overwrites with the latest number
    default: () => 0,
  }),
  
  // Future fields for other agents
  researchData: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  lifestyleData: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  // Multi-Agent routing fields
  requiredSpecialists: Annotation({
    reducer: (current, next) => next, 
    default: () => [],
  }),
  specialistReports: Annotation({
    reducer: (current, next) => [...current, ...next], // Accumulate reports from parallel branches
    default: () => [],
  }),
  finalSummary: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
});
